import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { type Store, mergeWithSeed, clone } from "./store";

const KEY = "ideovent_cms_v1";

/**
 * Local store: content = seed merged with a full snapshot persisted in localStorage.
 * Edits made in /admin are instant and persist in this browser. Use Export in the
 * admin to download the JSON and commit it (or wire Supabase for live global mode).
 */
export class LocalStore implements Store {
  readonly mode = "local" as const;
  private data: ContentData;

  constructor() {
    this.data = this.read();
  }

  private read(): ContentData {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
      return mergeWithSeed(raw ? JSON.parse(raw) : null);
    } catch {
      return mergeWithSeed(null);
    }
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
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
    this.data = mergeWithSeed(parsed);
    this.persist();
    return clone(this.data);
  }
}
