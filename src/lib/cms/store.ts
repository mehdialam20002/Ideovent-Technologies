import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { seed } from "./seed";
import { supabaseEnabled } from "./client";
import { LocalStore } from "./localStore";
import { SupabaseStore } from "./supabaseStore";

export const SINGLETON_KEYS: SingletonKey[] = ["settings", "contact", "navigation", "home", "internship", "legal"];
export const COLLECTION_KEYS: CollectionKey[] = [
  "socials", "services", "testimonials", "projects", "team", "milestones",
  "process", "faqs", "stats", "clients", "posts", "certificates", "submissions", "applications",
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
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Merge a stored snapshot over the seed so new seed keys survive but user edits win. */
export function mergeWithSeed(stored: Partial<ContentData> | null | undefined): ContentData {
  const base = clone(seed);
  if (!stored) return base;
  const out = base as any;
  for (const [key, value] of Object.entries(stored)) {
    if (value == null) continue;
    if (Array.isArray(value)) out[key] = value;
    else if (typeof value === "object") out[key] = { ...(out[key] || {}), ...value };
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

let _store: Store | null = null;
export function getStore(): Store {
  if (!_store) _store = supabaseEnabled ? new SupabaseStore() : new LocalStore();
  return _store;
}
