import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { type Store, mergeWithSeed, clone } from "./store";
import { supabase } from "./client";

const SINGLETONS: SingletonKey[] = ["settings", "contact", "navigation", "home", "internship", "legal"];
const TABLE = "content";

/**
 * Supabase store: all content lives in a single `content` table
 * (collection text, doc_id text, data jsonb, unique(collection, doc_id)).
 * Live and global — edits are visible to every visitor instantly.
 * Falls back to seed for any collection/singleton that has no rows yet.
 */
export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private cache: ContentData = mergeWithSeed(null);

  async load(): Promise<ContentData> {
    try {
      const { data, error } = await supabase().from(TABLE).select("collection, doc_id, data");
      if (error) throw error;
      const partial: Partial<ContentData> = {};
      const grouped: Record<string, BaseDoc[]> = {};
      for (const row of data || []) {
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
    const stamped = { ...doc, updatedAt: new Date().toISOString() };
    const { error } = await supabase()
      .from(TABLE)
      .upsert({ collection: col, doc_id: doc.id, data: stamped }, { onConflict: "collection,doc_id" });
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
        return d ? { collection: col, doc_id: id, data: { ...d, order: i } } : null;
      })
      .filter(Boolean) as any[];
    if (rows.length) {
      const { error } = await supabase().from(TABLE).upsert(rows, { onConflict: "collection,doc_id" });
      if (error) throw error;
    }
    return this.load();
  }

  async saveSingleton<K extends SingletonKey>(key: K, value: ContentData[K]): Promise<ContentData> {
    const { error } = await supabase()
      .from(TABLE)
      .upsert({ collection: key, doc_id: "_", data: value }, { onConflict: "collection,doc_id" });
    if (error) throw error;
    return this.load();
  }

  async reset(): Promise<ContentData> {
    return this.load();
  }

  exportJson(): string {
    return JSON.stringify(this.cache, null, 2);
  }

  async importJson(json: string): Promise<ContentData> {
    const parsed = JSON.parse(json) as ContentData;
    const rows: any[] = [];
    for (const key of SINGLETONS) if ((parsed as any)[key]) rows.push({ collection: key, doc_id: "_", data: (parsed as any)[key] });
    for (const [col, val] of Object.entries(parsed)) {
      if (SINGLETONS.includes(col as SingletonKey)) continue;
      if (Array.isArray(val)) for (const d of val) rows.push({ collection: col, doc_id: (d as BaseDoc).id, data: d });
    }
    const { error } = await supabase().from(TABLE).upsert(rows, { onConflict: "collection,doc_id" });
    if (error) throw error;
    return this.load();
  }
}
