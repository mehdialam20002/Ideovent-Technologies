import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { getStore, mergeWithSeed, sortByOrder } from "./store";

interface CmsActions {
  saveDoc: (col: CollectionKey, doc: BaseDoc & Record<string, any>) => Promise<void>;
  removeDoc: (col: CollectionKey, id: string) => Promise<void>;
  reorder: (col: CollectionKey, orderedIds: string[]) => Promise<void>;
  saveSingleton: <K extends SingletonKey>(key: K, value: ContentData[K]) => Promise<void>;
  reset: () => Promise<void>;
  exportJson: () => string;
  importJson: (json: string) => Promise<void>;
  refresh: () => Promise<void>;
}

interface CmsContextValue {
  data: ContentData;
  loading: boolean;
  mode: "local" | "supabase";
  actions: CmsActions;
}

const CmsContext = createContext<CmsContextValue | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const store = getStore();
  const [data, setData] = useState<ContentData>(() => mergeWithSeed(null));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const fresh = await store.load();
    setData(fresh);
  }, [store]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const fresh = await store.load();
      if (alive) {
        setData(fresh);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store]);

  const actions = useMemo<CmsActions>(
    () => ({
      saveDoc: async (col, doc) => setData(await store.saveDoc(col, doc)),
      removeDoc: async (col, id) => setData(await store.removeDoc(col, id)),
      reorder: async (col, ids) => setData(await store.reorder(col, ids)),
      saveSingleton: async (key, value) => setData(await store.saveSingleton(key, value)),
      reset: async () => setData(await store.reset()),
      exportJson: () => store.exportJson(),
      importJson: async (json) => setData(await store.importJson(json)),
      refresh,
    }),
    [store, refresh]
  );

  const value = useMemo(() => ({ data, loading, mode: store.mode, actions }), [data, loading, store.mode, actions]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error("useCms must be used within <ContentProvider>");
  return ctx;
}

/** Full content snapshot. */
export function useContent(): ContentData {
  return useCms().data;
}

/** A single collection, sorted by `order`. */
export function useCollection<K extends CollectionKey>(key: K): ContentData[K] {
  const { data } = useCms();
  return useMemo(() => sortByOrder(data[key] as BaseDoc[]) as ContentData[K], [data, key]);
}

/** A singleton object. */
export function useSingleton<K extends SingletonKey>(key: K): ContentData[K] {
  return useCms().data[key];
}
