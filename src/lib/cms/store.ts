import type { ContentData, CollectionKey, SingletonKey, BaseDoc, DemoSite } from "./types";
import { seed } from "./seed";
import { supabaseEnabled } from "./config";
import { LocalStore } from "./localStore";

export const SINGLETON_KEYS: SingletonKey[] = ["settings", "contact", "navigation", "home", "internship", "eduflow", "legal"];
export const COLLECTION_KEYS: CollectionKey[] = [
  "socials", "services", "testimonials", "projects", "team", "milestones",
  "process", "faqs", "stats", "clients", "posts",
  "pitchPages", "pitchPageNotes",
  "demoSites", "demoSiteSlots", "demoSiteOpens",
  "certificates", "certificateGrades", "submissions", "applications",
];

export interface Store {
  readonly mode: "local" | "supabase";
  load(): Promise<ContentData>;
  saveDoc(col: CollectionKey, doc: BaseDoc): Promise<ContentData>;
  removeDoc(col: CollectionKey, id: string): Promise<ContentData>;
  reorder(col: CollectionKey, orderedIds: string[]): Promise<ContentData>;
  saveSingleton<K extends SingletonKey>(key: K, data: ContentData[K]): Promise<ContentData>;
  reset(): Promise<ContentData>;
  exportJson(): string;
  importJson(json: string): Promise<ContentData>;
  /**
   * The CRM's own host, Supabase (./demoSummary.ts): from now on every snapshot carries demoSites as summaries,
   * plus the whole records read with loadDemo or saved here. Not in local mode, never on the admin.
   */
  useDemoSummaries?(): void;
  /** One demo's whole record, read now (null when it is not there or cannot be read). */
  loadDemo?(id: string): Promise<DemoSite | null>;
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/**
 * Collections merged DOCUMENT BY DOCUMENT rather than replaced wholesale.
 *
 * THE BUG THIS FIXES. It would have un-verified two real people
 * -------------------------------------------------------------
 * Every other collection is replaced: if the store returns any rows for it, that
 * array wins. `saveDoc` upserts one document. Put those together on a fresh
 * Supabase project and the sequence is:
 *
 *   1. Ankit Kumar (INT2025A73) and Shreya (INT2025A74) verify, from the seed.
 *   2. Somebody issues certificate number three. One row is written.
 *   3. On the next page load the store returns one row, which REPLACES the
 *      seeded array of two.
 *   4. INT2025A73 and INT2025A74 now return "certificate not found", 
 *      indistinguishable from a forgery, to anyone scanning a certificate that
 *      is already printed and already on a CV.
 *
 * Nobody would see it happen. The fix is narrow on purpose: certificates are
 * merged by id, seeded ones are kept unless the store has its own version of
 * that exact document, and a stored version wins (so a revocation still takes
 * effect). It is safe precisely here because certificates are never deleted, 
 * the admin offers revoke and not delete, for this reason among others. So
 * "a seeded document cannot disappear" is the behaviour we want rather than a
 * document resurrecting itself after somebody removed it on purpose.
 *
 * Do NOT add ordinary content collections to this list. Deleting a seeded
 * project or FAQ from /admin must actually delete it.
 */
const MERGE_BY_ID: (keyof ContentData)[] = ["certificates"];

/** Merge a stored snapshot over the seed so new seed keys survive but user edits win. */
export function mergeWithSeed(stored: Partial<ContentData> | null | undefined): ContentData {
  const base = clone(seed);
  if (!stored) return base;
  const out = base as any;
  for (const [key, value] of Object.entries(stored)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (MERGE_BY_ID.includes(key as keyof ContentData)) {
        const byId = new Map<string, BaseDoc>();
        for (const doc of (out[key] as BaseDoc[]) || []) if (doc?.id) byId.set(doc.id, doc);
        for (const doc of value as BaseDoc[]) if (doc?.id) byId.set(doc.id, doc);
        out[key] = [...byId.values()];
      } else {
        out[key] = value;
      }
    } else if (typeof value === "object") out[key] = {...(out[key] || {}),...value };
    else out[key] = value;
  }
  return out;
}

export function nextId(prefix = "id"): string {
  // No Math.random dependency at module load; use time + counter.
  return `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;
}
let idCounter = 0;

export function sortByOrder<T extends BaseDoc>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Supabase-backed store, loaded on demand.
 *
 * `./supabaseStore` imports `./client`, which imports `@supabase/supabase-js`. That was a
 * static import chain reaching all the way up to `main.tsx`, so the whole Supabase SDK, 
 * auth-js, postgrest-js, storage-js, realtime-js, functions-js, roughly 800 KB of rendered
 * JS, sat in the main chunk and was downloaded and parsed by every visitor before the
 * homepage could paint, whether or not the site is wired to a Supabase project at all.
 *
 * The public site never touches it: it reads content from the seed via LocalStore. So the
 * real store is resolved through a dynamic import the first time a method is called, which
 * moves the SDK into its own chunk.
 *
 * Since 2 Oct 2026 a visitor's page does not call it at all, in Supabase mode either: the
 * provider reads what the address needs with a plain fetch (./publicRead.ts, chosen by
 * ./scope.ts), so the SDK chunk is downloaded only by the admin and the CRM.
 */
function createDeferredSupabaseStore(): Store {
  let real: Store | null = null;
  let pending: Promise<Store> | null = null;
  // Asked before the real store exists (the CRM asks at once): handed on when it does.
  let summaries = false;

  const resolve = (): Promise<Store> => {
    if (real) return Promise.resolve(real);
    if (!pending) {
      pending = import("./supabaseStore").then(
        (m) => {
          real = new m.SupabaseStore();
          if (summaries) real.useDemoSummaries?.();
          return real;
        },
        (e) => {
          // Forget the failed attempt. A rejected promise kept here would be
          // handed back to every later call, so one dropped chunk request on
          // first paint would make Save in /admin fail until a full reload.
          pending = null;
          throw e;
        }
      );
    }
    return pending;
  };

  return {
    mode: "supabase",
    load: async () => (await resolve()).load(),
    saveDoc: async (col, doc) => (await resolve()).saveDoc(col, doc),
    removeDoc: async (col, id) => (await resolve()).removeDoc(col, id),
    reorder: async (col, ids) => (await resolve()).reorder(col, ids),
    saveSingleton: async (key, data) => (await resolve()).saveSingleton(key, data),
    reset: async () => (await resolve()).reset(),
    // Synchronous by contract. ContentProvider always calls load() on mount, so by the time
    // anything in the admin can ask to export, the real store exists. The seed is the honest
    // answer if it somehow does not.
    exportJson: () => (real ? real.exportJson(): JSON.stringify(mergeWithSeed(null), null, 2)),
    importJson: async (json) => (await resolve()).importJson(json),
    useDemoSummaries: () => {
      summaries = true;
      real?.useDemoSummaries?.();
    },
    loadDemo: async (id) => {
      const s = await resolve();
      return s.loadDemo ? s.loadDemo(id) : null;
    },
  };
}

let _store: Store | null = null;
export function getStore(): Store {
  if (!_store) _store = supabaseEnabled ? createDeferredSupabaseStore(): new LocalStore();
  return _store;
}
