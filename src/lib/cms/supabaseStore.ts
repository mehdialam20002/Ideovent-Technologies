import type { ContentData, CollectionKey, SingletonKey, BaseDoc, DemoSite } from "./types";
import { type Store, mergeWithSeed, clone } from "./store";
import { supabase } from "./client";
import { DEMO_SUMMARY_SELECT, isDemoSummary, toDemoSummary } from "./demoSummary";

const SINGLETONS: SingletonKey[] = ["settings", "contact", "navigation", "home", "internship", "eduflow", "legal"];
const TABLE = "content";

/*
  Collections the one-time Import leaves behind.

  Import exists to carry CONTENT (pages, projects, pitch pages, certificates)
  from the LocalStore browser into the live database. These three are not
  content: they are form submissions, internship applications and demo-open
  tracking, and in a LocalStore browser they are Mehdi's own test clicks. Copied
  across they would sit in the live inbox and the open counts as if a real
  visitor had written them, with nothing to tell them apart. The live site fills
  them itself from the first real visitor on.
*/
const SKIP_ON_IMPORT: CollectionKey[] = ["demoSiteOpens", "submissions", "applications"];

/*
  Rows per request in load(). PostgREST caps every response at the project's
  "Max rows" (Supabase API settings, 1000 by default) and says nothing when it
  truncates, so load() pages until a short page. Keep this at or below that
  setting: a larger value would make the first page look short and stop early.
*/
const PAGE = 1000;

/*
  load() READS EVERYTHING, AND ONLY THE ADMIN AND THE CRM CALL IT (2 Oct 2026).

  A visitor's page no longer comes through here. What each address reads is in
  ./scope.ts, and ./publicRead.ts fetches just that without this SDK: a demo at
  /site/<slug> reads its own row instead of the 2.85 MB table (measured live on
  2 Oct 2026), a public page reads the keys it renders. This store is the admin's
  and the CRM's read (every row the signed-in session may see) and the answer to
  every save, so it keeps reading the whole table, paged.

  The 1 Oct 2026 version decided a public scope here from the address; that rule
  now lives in ./scope.ts, the one place that says what an address reads.
*/

/**
 * Supabase store: all content lives in a single `content` table
 * (collection text, doc_id text, data jsonb, unique(collection, doc_id)).
 * Live and global, edits are visible to every visitor instantly.
 * Falls back to seed for any collection/singleton that has no rows yet.
 */
export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private cache: ContentData = mergeWithSeed(null);
  /** The CRM's own host (./demoSummary.ts): demoSites read as summaries; whole records only by id. */
  private summaries = false;
  /** Whole demo records read (loadDemo) or written here this page load, by id: they stand in for their summary. */
  private fullDemos = new Map<string, DemoSite>();

  useDemoSummaries(): void {
    this.summaries = true;
  }

  /**
   * Every row of `collection` (or every row but it, `but`), paged by the unique (collection, doc_id) pair as load()
   * pages. `cols` is the select: whole rows, or a summary's columns.
   */
  private async rows(cols: string, filter: { eq?: string; neq?: string }): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = supabase().from(TABLE).select(cols);
      if (filter.eq) q = q.eq("collection", filter.eq);
      if (filter.neq) q = q.neq("collection", filter.neq);
      const { data: page, error } = await q.order("collection").order("doc_id").range(from, from + PAGE - 1);
      if (error) throw error;
      out.push(...((page || []) as unknown as Record<string, unknown>[]));
      if (!page || page.length < PAGE) break;
    }
    return out;
  }

  /**
   * The CRM's read (4 Oct 2026, crm-fixes-1004 item 8): every row but the demos, whole, and the demos as
   * summaries, with the whole records this page has read or written in their place while their summary still
   * says the same updatedAt (a demo saved since in another tab comes back as its new summary).
   */
  private async loadWithSummaries(): Promise<ContentData> {
    const [rows, demoRows] = await Promise.all([
      this.rows("collection, doc_id, data", { neq: "demoSites" }),
      this.rows(DEMO_SUMMARY_SELECT, { eq: "demoSites" }),
    ]);
    const partial: Partial<ContentData> = {};
    const grouped: Record<string, BaseDoc[]> = {};
    for (const row of rows) {
      const col = row.collection as string;
      if (SINGLETONS.includes(col as SingletonKey)) (partial as any)[col] = row.data;
      else (grouped[col] ||= []).push(row.data as BaseDoc);
    }
    for (const [col, list] of Object.entries(grouped)) (partial as any)[col] = list;
    const demos = demoRows.map((r) => {
      const s = toDemoSummary(r);
      const whole = this.fullDemos.get(s.id);
      if (whole && (whole.updatedAt || "") === (s.updatedAt || "")) return whole;
      if (whole) this.fullDemos.delete(s.id);
      return s;
    });
    if (demos.length) partial.demoSites = demos;
    return mergeWithSeed(partial);
  }

  /** One demo's whole record, read now by its id. On the CRM host the snapshots carry it from then on. */
  async loadDemo(id: string): Promise<DemoSite | null> {
    const { data, error } = await supabase().from(TABLE).select("data").eq("collection", "demoSites").eq("doc_id", id).maybeSingle();
    if (error || !data) return null;
    const doc = (data as { data: DemoSite }).data;
    if (!doc || typeof doc !== "object") return null;
    if (this.summaries) {
      this.fullDemos.set(id, doc);
      const list = (this.cache.demoSites as DemoSite[]) || [];
      this.cache = { ...this.cache, demoSites: list.some((d) => d.id === id) ? list.map((d) => (d.id === id ? doc : d)) : [...list, doc] };
    }
    return clone(doc);
  }

  async load(): Promise<ContentData> {
    if (this.summaries) {
      try {
        this.cache = await this.loadWithSummaries();
      } catch (e) {
        console.warn("Ideovent CMS: Supabase load failed, using seed.", e);
        this.cache = mergeWithSeed(null);
      }
      return clone(this.cache);
    }
    try {
      /*
        PAGED, NOT ONE SELECT. A bare select() came back with at most 1000 rows
        and no error. demoSiteOpens writes one row per demo open, so the table
        passes that quickly, and past it whichever rows the database happened
        to return last (pitch pages, certificates) silently vanished from the
        site. Ordering by the unique (collection, doc_id) pair makes the pages
        stable, so no row is skipped or read twice between requests.
      */
      const data: unknown[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await supabase()
          .from(TABLE)
          .select("collection, doc_id, data")
          .order("collection")
          .order("doc_id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        data.push(...(page || []));
        if (!page || page.length < PAGE) break;
      }
      const partial: Partial<ContentData> = {};
      const grouped: Record<string, BaseDoc[]> = {};
      for (const row of data) {
        const col = (row as any).collection as string;
        const value = (row as any).data;
        if (SINGLETONS.includes(col as SingletonKey)) {
          (partial as any)[col] = value;
        } else {
          (grouped[col] ||= []).push(value);
        }
      }
      for (const [col, list] of Object.entries(grouped)) (partial as any)[col] = list;
      this.cache = mergeWithSeed(partial);
    } catch (e) {
      console.warn("Ideovent CMS: Supabase load failed, using seed.", e);
      this.cache = mergeWithSeed(null);
    }
    return clone(this.cache);
  }

  async saveDoc(col: CollectionKey, doc: BaseDoc): Promise<ContentData> {
    // A summary is never written: it would replace the whole demo with a few fields (./demoSummary.ts).
    if (isDemoSummary(doc)) throw new Error("This demo was read as a summary. Read the whole demo (loadDemo) before saving it.");
    const stamped = {...doc, updatedAt: new Date().toISOString() };
    const { error } = await supabase()
.from(TABLE)
.upsert({ collection: col, doc_id: doc.id, data: stamped }, { onConflict: "collection, doc_id" });
    if (error) throw error;
    // The record just written is whole: on the CRM host it stands in for its summary from now on.
    if (col === "demoSites" && this.summaries) this.fullDemos.set(doc.id, stamped as DemoSite);
    return this.load();
  }

  async removeDoc(col: CollectionKey, id: string): Promise<ContentData> {
    const { error } = await supabase().from(TABLE).delete().match({ collection: col, doc_id: id });
    if (error) throw error;
    return this.load();
  }

  async reorder(col: CollectionKey, orderedIds: string[]): Promise<ContentData> {
    // Reordering writes each whole document: never from summaries (the CRM host; the admin reads whole demos).
    if (col === "demoSites" && this.summaries) throw new Error("Demos are reordered in the admin, which reads them whole.");
    const list = (this.cache[col] as BaseDoc[]) || [];
    const map = new Map(list.map((d) => [d.id, d]));
    const rows = orderedIds
.map((id, i) => {
        const d = map.get(id);
        return d ? { collection: col, doc_id: id, data: {...d, order: i } }: null;
      })
.filter(Boolean) as any[];
    if (rows.length) {
      const { error } = await supabase().from(TABLE).upsert(rows, { onConflict: "collection, doc_id" });
      if (error) throw error;
    }
    return this.load();
  }

  async saveSingleton<K extends SingletonKey>(key: K, value: ContentData[K]): Promise<ContentData> {
    const { error } = await supabase()
.from(TABLE)
.upsert({ collection: key, doc_id: "_", data: value }, { onConflict: "collection, doc_id" });
    if (error) throw error;
    return this.load();
  }

  async reset(): Promise<ContentData> {
    return this.load();
  }

  exportJson(): string {
    return JSON.stringify(this.cache, null, 2);
  }

  /**
   * Upserts ONLY the documents in the file; a singleton given as an object
   * replaces that section. Keys starting with "_" (the import template's
   * _readme and _example_demoSite) are skipped explicitly, as are other
   * non-array values and documents without an id. So the downloadable
   * template (src/lib/cms/importTemplate.ts), imported as it is, writes nothing.
   */
  async importJson(json: string): Promise<ContentData> {
    const parsed = JSON.parse(json) as ContentData;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("the file is not a content JSON object");
    const rows: any[] = [];
    for (const key of SINGLETONS) {
      const v = (parsed as any)[key];
      if (v && typeof v === "object" && !Array.isArray(v)) rows.push({ collection: key, doc_id: "_", data: v });
    }
    for (const [col, val] of Object.entries(parsed)) {
      if (col.startsWith("_")) continue;
      if (SINGLETONS.includes(col as SingletonKey)) continue;
      if (SKIP_ON_IMPORT.includes(col as CollectionKey)) continue;
      if (Array.isArray(val)) for (const d of val) if ((d as BaseDoc)?.id) rows.push({ collection: col, doc_id: (d as BaseDoc).id, data: d });
    }
    if (rows.length) {
      const { error } = await supabase().from(TABLE).upsert(rows, { onConflict: "collection, doc_id" });
      if (error) throw error;
    }
    return this.load();
  }
}
