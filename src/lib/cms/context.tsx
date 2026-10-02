import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ContentData, CollectionKey, SingletonKey, BaseDoc } from "./types";
import { getStore, sortByOrder } from "./store";
import { ContentLoader, covers, getLoader, type ContentSnapshot } from "./loader";
import { publicReader } from "./publicRead";
import { ROW_COLLECTIONS, currentPath, needsFor, type ContentKey, type RowCollection } from "./scope";

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
  /** True while what THIS address reads (./scope.ts) is still on its way. */
  loading: boolean;
  mode: "local" | "supabase";
  actions: CmsActions;
  /** Ask for the deferred blog/legal bodies. Safe to call on every render. */
  requestBodies: () => void;
  /** True once those bodies have been merged in (or have failed to load). */
  bodiesReady: boolean;
}

interface Internal {
  base: Omit<CmsContextValue, "loading">;
  snap: ContentSnapshot;
  loader: ContentLoader;
}

const CmsContext = createContext<Internal | null>(null);

/** The page's loader: the store from ./store, and in Supabase mode the SDK-free reader. */
function pageLoader(): ContentLoader {
  return getLoader(() => {
    const store = getStore();
    return new ContentLoader(store, store.mode === "supabase" ? publicReader : null);
  });
}

/**
 * Start reading what the current address needs, before React renders anything.
 * Called once from main.tsx; the provider also asks on mount, so it is only a head
 * start. In Supabase mode on a visitor's page this is one GET with no SDK.
 */
export function primeContent(): void {
  void pageLoader().ensure(needsFor());
}

/*
  WHAT A PAGE LOADS, AND WHEN (2 Oct 2026).

  This provider used to read the whole content table on every page view: on the
  live site that day 2.85 MB over the wire for a demo, before the demo could show.
  Now each address reads only what ./scope.ts lists for it, the reads are cached
  for the rest of the page load in ./loader.ts, and the seed is on screen from the
  first frame exactly as before. The admin, the CRM and local mode still read
  everything through the store, and every save still returns the full snapshot.
*/
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const store = getStore();
  const loader = pageLoader();
  const snap = useSyncExternalStore(loader.subscribe, loader.getSnapshot, loader.getSnapshot);

  useEffect(() => {
    void loader.ensure(needsFor());
  }, [loader]);

  const actions = useMemo<CmsActions>(
    () => ({
      saveDoc: async (col, doc) => loader.replaceFull(await store.saveDoc(col, doc)),
      removeDoc: async (col, id) => loader.replaceFull(await store.removeDoc(col, id)),
      reorder: async (col, ids) => loader.replaceFull(await store.reorder(col, ids)),
      saveSingleton: async (key, value) => loader.replaceFull(await store.saveSingleton(key, value)),
      reset: async () => loader.replaceFull(await store.reset()),
      exportJson: () => store.exportJson(),
      importJson: async (json) => loader.replaceFull(await store.importJson(json)),
      refresh: () => loader.refresh(needsFor()),
    }),
    [store, loader]
  );

  /*
    Deferred long-form content. The seed carries blog and legal METADATA only; the
    ~92 KB of article and policy HTML sits behind a dynamic import (./deferredBodies)
    and nothing fetches it until a page that renders a body asks, which is what
    useDeferredBodies() below does on mount. fillDeferredBodies only writes into a
    body that is still empty, so an admin edit or a Supabase row always wins, and
    the loader re-applies the bodies after every read and every save.
  */
  const requestBodies = useCallback(() => loader.requestBodies(), [loader]);

  const base = useMemo(
    () => ({ data: snap.data, mode: store.mode, actions, requestBodies, bodiesReady: snap.bodiesReady }),
    [snap.data, snap.bodiesReady, store.mode, actions, requestBodies]
  );
  const value = useMemo<Internal>(() => ({ base, snap, loader }), [base, snap, loader]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

function useInternal(): Internal {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error("useCms must be used within <ContentProvider>");
  return ctx;
}

/**
 * Pull in the deferred blog and legal bodies.
 *
 * Call it from any page that renders `post.body` or `legal[kind].body`, and gate
 * the "not found" / empty state on the returned flag so a body that is merely
 * still in flight does not read as a missing document.
 */
export function useDeferredBodies(): boolean {
  const { requestBodies, bodiesReady } = useInternal().base;
  useEffect(() => requestBodies(), [requestBodies]);
  return bodiesReady;
}

/**
 * The content, the actions, and `loading` FOR THE CURRENT ADDRESS: true until what
 * ./scope.ts lists for it has been read. Read from the address at render time, so a
 * page reached by a link starts out `loading` when it needs something new, rather
 * than showing its "not found" state for one frame before the read begins.
 */
export function useCms(): CmsContextValue {
  const { base, snap, loader } = useInternal();
  const needs = needsFor();
  useEffect(() => {
    void loader.ensure(needs);
    // needs is the same object for the same address; its id is the stable key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, needs.id]);
  const loading = snap.pending > 0 || !covers(snap, needs);
  return useMemo(() => ({ ...base, loading }), [base, loading]);
}

/**
 * The safety net under ./scope.ts: a hook that reads a key asks for it, so a page
 * whose route row is missing that key still gets it (one request later). In
 * development the console says which route and key, so the table can be fixed.
 *
 * Never for a demo or a pitch page: those are read one at a time by the slug in
 * the address (0013), and a visitor's page never asks for either collection whole.
 */
function useAskFor(key: ContentKey): void {
  const { loader } = useInternal();
  const path = currentPath();
  useEffect(() => {
    const route = needsFor(path);
    if (route.all || route.row?.collection === key || route.keys.includes(key)) return;
    if (ROW_COLLECTIONS.includes(key as RowCollection)) return;
    if (import.meta.env.DEV) {
      console.info(`Ideovent CMS: ${path} also reads "${key}". Add it to that route in src/lib/cms/scope.ts so it arrives with the first request.`);
    }
    void loader.ensure({ all: false, keys: [key], row: null, id: `${key}|` });
  }, [loader, key, path]);
}

/** Full content snapshot. Asks for nothing: see the note in ./scope.ts. */
export function useContent(): ContentData {
  return useCms().data;
}

/** A single collection, sorted by `order`. */
export function useCollection<K extends CollectionKey>(key: K): ContentData[K] {
  const { data } = useCms();
  useAskFor(key);
  return useMemo(() => sortByOrder(data[key] as BaseDoc[]) as ContentData[K], [data, key]);
}

/** A singleton object. */
export function useSingleton<K extends SingletonKey>(key: K): ContentData[K] {
  const { data } = useCms();
  useAskFor(key);
  return data[key];
}
