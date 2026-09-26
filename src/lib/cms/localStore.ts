import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { type Store, mergeWithSeed, clone } from "./store";
import { seed } from "./seed";

const KEY = "ideovent_cms_v1";

/**
 * ONE-TIME CLEANUP, added 25 September 2026. DELETE THIS FUNCTION AND BOTH
 * CALLS (constructor and importJson) once Mehdi has opened /admin in local
 * mode once after this shipped (and in any case after 31 December 2026).
 *
 * WHY. These four demo records used to be in seed.ts: the two example demos
 * and the two empty-state probes. They were removed from the seed the day the
 * ten templates moved into code (src/lib/demo/templates). But a browser that
 * ever saved anything in local mode holds a FULL snapshot under KEY, and
 * `mergeWithSeed` lets a stored array replace the seeded one, so the snapshot
 * would go on showing all four in Demo sites for ever, whatever seed.ts says.
 * Mehdi asked for them gone, so they are removed from the snapshot here, by
 * id, together with their admin-only slot rows and their open-log rows.
 *
 * Only these four ids. A record Mehdi made himself, including a duplicate of
 * one of these, has a different id and is untouched. Returns true when it
 * removed something, so the caller writes the cleaned snapshot back once.
 */
const RETIRED_DEMO_IDS = new Set([
  "ds_example_school",
  "ds_example_coaching",
  "ds_tmp_empty_school",
  "ds_tmp_empty_coaching",
]);

function dropRetiredDemoRecords(stored: Record<string, unknown> | null): boolean {
  if (!stored || typeof stored !== "object") return false;
  let changed = false;
  const prune = (key: string, idOf: (doc: Record<string, unknown>) => unknown) => {
    const list = stored[key];
    if (!Array.isArray(list)) return;
    const kept = list.filter((doc) => !(doc && RETIRED_DEMO_IDS.has(String(idOf(doc)))));
    if (kept.length !== list.length) {
      stored[key] = kept;
      changed = true;
    }
  };
  prune("demoSites", (d) => d.id);
  prune("demoSiteSlots", (d) => d.id);
  prune("demoSiteOpens", (d) => d.demoId);
  return changed;
}

/**
 * THE SNAPSHOT HOLDS ONLY WHAT DIFFERS FROM THE SEED. Changed 26 September 2026.
 *
 * WHY. It used to hold a FULL copy of the content, written on the first save of
 * anything, and `mergeWithSeed` lets a stored array or field win over the seed.
 * The public site saves too: the popup and contact form keep a local copy of
 * the enquiry, the internship form keeps the application, and a demo site
 * records its open. So a visitor who once sent an enquiry, and a director who
 * once opened their demo, froze the whole site in their browser at that
 * moment. Every later deploy (new homepage copy, a corrected demo, a new
 * project) was invisible to them, and to Mehdi's own browser, which has saved
 * more than anyone's. Now only the keys that actually differ are written, and
 * a singleton only by the fields that differ, so the seed shows through
 * everywhere else.
 *
 * A snapshot written before this change has no FORMAT_KEY. It is cut down
 * once, on read, to the records made in a browser (OPERATIONAL below) and the
 * rest is dropped: in local mode an edit to the marketing content never
 * reached a single visitor anyway, and keeping it would keep exactly the
 * stale copy this change exists to remove.
 */
const FORMAT_KEY = "__format";
const FORMAT = 2;

/** Records a browser makes itself: Mehdi's admin work, a visitor's own enquiry, a demo-open row. */
const OPERATIONAL = new Set<string>([
  "demoSites", "demoSiteSlots", "demoSiteOpens",
  "pitchPages", "pitchPageNotes",
  "certificates", "certificateGrades",
  "submissions", "applications",
]);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** What gets written: the keys that differ from the seed, singletons by field. */
function diffFromSeed(data: ContentData): Record<string, unknown> {
  const base = seed as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { [FORMAT_KEY]: FORMAT };
  for (const [key, value] of Object.entries(data)) {
    const was = base[key];
    if (same(value, was)) continue;
    if (isPlainObject(value) && isPlainObject(was)) {
      const fields: Record<string, unknown> = {};
      for (const [f, v] of Object.entries(value)) if (!same(v, was[f])) fields[f] = v;
      if (Object.keys(fields).length) out[key] = fields;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Cut a pre-format snapshot down to OPERATIONAL records. True when it changed anything. */
function dropLegacyContent(stored: Record<string, unknown> | null): boolean {
  if (!stored || typeof stored !== "object") return false;
  const current = stored[FORMAT_KEY] === FORMAT;
  delete stored[FORMAT_KEY];
  if (current) return false;
  for (const key of Object.keys(stored)) if (!OPERATIONAL.has(key)) delete stored[key];
  // Rewritten once even when nothing was dropped, so the snapshot carries the marker.
  return true;
}

/**
 * Local store: content = seed merged with the differences persisted in localStorage.
 * Edits made in /admin are instant and persist in this browser. Use Export in the
 * admin to download the JSON and commit it (or wire Supabase for live global mode).
 */
export class LocalStore implements Store {
  readonly mode = "local" as const;
  private data: ContentData;

  constructor() {
    const { data, cleaned } = this.read();
    this.data = data;
    // Written back once, so the retired records are gone from the snapshot
    // itself and this branch never fires again in this browser.
    if (cleaned) this.persist();
  }

  private read(): { data: ContentData; cleaned: boolean } {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      const legacy = dropLegacyContent(parsed);
      const cleaned = dropRetiredDemoRecords(parsed) || legacy;
      return { data: mergeWithSeed(parsed), cleaned };
    } catch {
      return { data: mergeWithSeed(null), cleaned: false };
    }
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(diffFromSeed(this.data)));
    } catch (e) {
      console.warn("Ideovent CMS: could not persist to localStorage", e);
    }
  }

  async load(): Promise<ContentData> {
    return clone(this.data);
  }

  async saveDoc(col: CollectionKey, doc: BaseDoc): Promise<ContentData> {
    const list = (this.data[col] as BaseDoc[]) || [];
    const idx = list.findIndex((d) => d.id === doc.id);
    const stamped = { ...doc, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = stamped;
    else {
      (stamped as any).createdAt = new Date().toISOString();
      (stamped as any).order = list.length;
      list.push(stamped);
    }
    (this.data[col] as BaseDoc[]) = [...list];
    this.persist();
    return clone(this.data);
  }

  async removeDoc(col: CollectionKey, id: string): Promise<ContentData> {
    (this.data[col] as BaseDoc[]) = ((this.data[col] as BaseDoc[]) || []).filter((d) => d.id !== id);
    this.persist();
    return clone(this.data);
  }

  async reorder(col: CollectionKey, orderedIds: string[]): Promise<ContentData> {
    const list = (this.data[col] as BaseDoc[]) || [];
    const map = new Map(list.map((d) => [d.id, d]));
    (this.data[col] as BaseDoc[]) = orderedIds
      .map((id, i) => {
        const d = map.get(id);
        return d ? { ...d, order: i } : null;
      })
      .filter(Boolean) as BaseDoc[];
    this.persist();
    return clone(this.data);
  }

  async saveSingleton<K extends SingletonKey>(key: K, value: ContentData[K]): Promise<ContentData> {
    this.data[key] = value;
    this.persist();
    return clone(this.data);
  }

  async reset(): Promise<ContentData> {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    this.data = mergeWithSeed(null);
    return clone(this.data);
  }

  exportJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  async importJson(json: string): Promise<ContentData> {
    const parsed = JSON.parse(json);
    // An export is the full content; a marker from a copied snapshot is not content.
    if (parsed && typeof parsed === "object") delete parsed[FORMAT_KEY];
    // An export taken before 25 September 2026 still carries the four retired
    // records; importing it must not bring them back.
    dropRetiredDemoRecords(parsed);
    this.data = mergeWithSeed(parsed);
    this.persist();
    return clone(this.data);
  }
}
