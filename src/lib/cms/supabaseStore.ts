import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { type Store, mergeWithSeed, clone } from "./store";
import { supabase } from "./client";
import { isCrmHost } from "@/lib/host";

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
  WHAT A PUBLIC PAGE DOES NOT LOAD (1 Oct 2026, SEO audit P0-4).

  load() used to read the whole `content` table on every page view. Measured on
  the live site that day: 2.9 MB gzip, 9.3 MB of JSON, 134 rows, 132 of them
  demo sites, arriving about 6 s after the page on a phone and then parsed on
  the main thread, for every visitor and for Googlebot. No public page reads
  any of the collections below. The admin (/admin), the CRM (/crm and the CRM
  host) and a demo (/site/...) still load everything, and each of those is
  opened with a full page load (nothing on the public site links to them), so
  the scope is decided once, from the address, when the store first loads.
  Rows the database does not let `anon` read (submissions, applications,
  grades, opens) were never returned to a visitor anyway; excluding them only
  makes the request say so.
*/
const NOT_ON_PUBLIC_PAGES: CollectionKey[] = [
  "demoSites", "demoSiteSlots", "demoSiteOpens", "pitchPageNotes", "certificateGrades", "submissions", "applications",
];

function loadsEverything(): boolean {
  if (typeof window === "undefined") return true;
  if (isCrmHost()) return true;
  return /^\/(admin|crm|site)(\/|$)/.test(window.location.pathname);
}

/**
 * Supabase store: all content lives in a single `content` table
 * (collection text, doc_id text, data jsonb, unique(collection, doc_id)).
 * Live and global, edits are visible to every visitor instantly.
 * Falls back to seed for any collection/singleton that has no rows yet.
 */
export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private cache: ContentData = mergeWithSeed(null);

  async load(): Promise<ContentData> {
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
      const everything = loadsEverything();
      for (let from = 0; ; from += PAGE) {
        let query = supabase().from(TABLE).select("collection, doc_id, data");
        if (!everything) query = query.not("collection", "in", `(${NOT_ON_PUBLIC_PAGES.join(",")})`);
        const { data: page, error } = await query
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
    const stamped = {...doc, updatedAt: new Date().toISOString() };
    const { error } = await supabase()
.from(TABLE)
.upsert({ collection: col, doc_id: doc.id, data: stamped }, { onConflict: "collection, doc_id" });
    if (error) throw error;
    return this.load();
  }

  async removeDoc(col: CollectionKey, id: string): Promise<ContentData> {
    const { error } = await supabase().from(TABLE).delete().match({ collection: col, doc_id: id });
    if (error) throw error;
    return this.load();
  }

  async reorder(col: CollectionKey, orderedIds: string[]): Promise<ContentData> {
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
