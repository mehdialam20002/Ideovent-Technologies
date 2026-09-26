import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { getStore, mergeWithSeed, sortByOrder } from "./store";
import { fillDeferredBodies, loadDeferredBodies } from "./deferredBodies";

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
  /** Ask for the deferred blog/legal bodies. Safe to call on every render. */
  requestBodies: () => void;
  /** True once those bodies have been merged in (or have failed to load). */
  bodiesReady: boolean;
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
    /*
      `loading` MUST end, whatever load() does. SupabaseStore.load() swallows its
      own query errors, but the deferred wrapper in ./store has to fetch the
      Supabase chunk first, and a failed chunk request (a deploy that replaced
      the hashed file, a flaky network) rejects before load() ever runs. Pages
      gate their "not found" state on `loading`, so a rejection left here would
      hold them on a blank placeholder forever. On failure the seed already in
      `data` stays on screen, which is the same answer SupabaseStore gives when
      its own query fails.
    */
    (async () => {
      try {
        const fresh = await store.load();
        if (alive) setData(fresh);
      } catch (e) {
        console.warn("Ideovent CMS: content load failed, showing the seed.", e);
      } finally {
        if (alive) setLoading(false);
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

  /*
    Deferred long-form content.

    The seed carries blog and legal METADATA only; the ~92 KB of article and policy
    HTML sits behind a dynamic import so it is not in the entry chunk (see
    ./deferredBodies.ts). Nothing fetches it until a page that renders a body asks,
    which is what useDeferredBodies() below does on mount. The homepage, /work,
    /services, /pricing and the rest never touch it.

    fillDeferredBodies only writes into a body that is still empty, so an admin edit
    or a Supabase row always wins, and re-running this after a save is harmless.
  */
  const [bodiesReady, setBodiesReady] = useState(false);
  const bodiesRequested = useRef(false);

  const requestBodies = useCallback(() => {
    if (bodiesRequested.current) return;
    bodiesRequested.current = true;
    loadDeferredBodies().then(
      (bodies) => {
        setData((prev) => fillDeferredBodies(prev, bodies));
        setBodiesReady(true);
      },
      (e) => {
        console.warn("Ideovent CMS: could not load deferred content bodies.", e);
        // Ready anyway: the consuming page must stop showing a skeleton and fall
        // through to its own empty state rather than spinning forever.
        setBodiesReady(true);
      }
    );
  }, []);

  // A store reload (admin save, refresh) replaces `data` with a snapshot whose
  // seeded bodies are empty again. Re-apply once the fetch has already happened.
  useEffect(() => {
    if (!bodiesReady) return;
    loadDeferredBodies().then((bodies) => setData((prev) => fillDeferredBodies(prev, bodies)));
  }, [bodiesReady, loading]);

  const value = useMemo(
    () => ({ data, loading, mode: store.mode, actions, requestBodies, bodiesReady }),
    [data, loading, store.mode, actions, requestBodies, bodiesReady]
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

/**
 * Pull in the deferred blog and legal bodies.
 *
 * Call it from any page that renders `post.body` or `legal[kind].body`, and gate
 * the "not found" / empty state on the returned flag so a body that is merely
 * still in flight does not read as a missing document.
 */
export function useDeferredBodies(): boolean {
  const { requestBodies, bodiesReady } = useCms();
  useEffect(() => requestBodies(), [requestBodies]);
  return bodiesReady;
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
