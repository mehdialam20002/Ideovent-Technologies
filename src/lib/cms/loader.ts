/**
 * THE CONTENT CACHE BEHIND <ContentProvider> (2 Oct 2026).
 *
 * One instance per page load (getLoader below). It holds what has been read so far
 * and starts reads for what an address still lacks (./scope.ts says what that is):
 *
 *   - FULL: the store's own load(). Local mode always; in Supabase mode the admin
 *     and the CRM (with the signed-in session), and the result of every save. Same
 *     data, same code path as before this file existed.
 *   - PARTIAL: a visitor's page in Supabase mode. Whole keys and single rows read by
 *     ./publicRead.ts, merged over the seed by the same mergeWithSeed rule: a key
 *     with stored rows replaces (or for certificates merges into) the seed, a key
 *     without rows shows the seed. A demo or a pitch page is only ever a single row,
 *     asked for by its slug (public_row_by_slug, supabase/migrations/0013); whether
 *     any exists at all is public_has_rows. Neither collection is read whole.
 *
 *   The FULL read runs only on /admin, /crm and the CRM host (./scope.ts). Signed
 *   out, those show the sign-in form, which shows no demo and no pitch page; since
 *   0013 such a read gets none (a visitor cannot list them), and the shells read
 *   everything again with the session once someone signs in (refresh below).
 *
 * CACHING. A key or a row is read once per page load and kept for every later route
 * (moving from / to /about reads only what /about adds). Two components asking for
 * the same thing share one request. Nothing is kept across page loads: an edit in
 * /admin still reaches the next visitor at once, and a closed demo stops at once.
 *
 * Plain class, no React: the provider subscribes with useSyncExternalStore, and
 * main.tsx can start the first read before React renders anything.
 */
import type { BaseDoc, ContentData } from "./types";
import { type Store, mergeWithSeed } from "./store";
import { seed } from "./seed";
import { fillDeferredBodies, loadDeferredBodies, type DeferredBodies } from "./deferredBodies";
import { ROW_COLLECTIONS, type ContentKey, type Needs, type RowCollection, type RowNeed } from "./scope";
import type { ContentRow, PublicReader } from "./publicRead";

const SINGLETONS = new Set<string>(["settings", "contact", "navigation", "home", "internship", "eduflow", "legal"]);

export interface ContentSnapshot {
  data: ContentData;
  /** Reads in flight (a refresh after sign-in and saves are not counted, as before). */
  pending: number;
  /** Everything has been read (or the full read failed and the seed stands). */
  all: boolean;
  keys: ReadonlySet<ContentKey>;
  rows: ReadonlySet<string>;
  bodiesReady: boolean;
}

export const rowId = (r: RowNeed) => `${r.collection}:${r.slug}`;

/** Whether the snapshot already holds what `needs` asks for. */
export function covers(s: ContentSnapshot, needs: Needs): boolean {
  if (s.all) return true;
  if (needs.all) return false;
  return needs.keys.every((k) => s.keys.has(k)) && (!needs.row || s.rows.has(rowId(needs.row)));
}

export class ContentLoader {
  private full: ContentData | null = null;
  private fullTried = false;
  private fullPromise: Promise<void> | null = null;
  private whole: Partial<Record<ContentKey, unknown>> = {};
  private docs: Record<RowCollection, Map<string, BaseDoc>> = { demoSites: new Map(), pitchPages: new Map() };
  private hasRows: Partial<Record<RowCollection, boolean>> = {};
  private loadedKeys = new Set<ContentKey>();
  private loadedRows = new Set<string>();
  private inflightKeys = new Set<ContentKey>();
  private inflightRows = new Set<string>();
  private pending = 0;
  private bodies: DeferredBodies | null = null;
  private bodiesReady = false;
  private bodiesRequested = false;
  private dirty = true;
  private listeners = new Set<() => void>();
  private snap: ContentSnapshot;

  /** `reader` is null in local mode: everything then comes from store.load(). */
  constructor(
    private readonly store: Store,
    private readonly reader: PublicReader | null,
  ) {
    this.snap = this.build();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ContentSnapshot => this.snap;

  /** Start whatever `needs` still lacks. Safe to call on every render; resolves when those reads end. */
  ensure(needs: Needs): Promise<void> {
    if (this.full) return Promise.resolve();
    if (needs.all || !this.reader) return this.loadFull();
    if (this.fullPromise) return this.fullPromise;
    const keys = needs.keys.filter((k) => !this.loadedKeys.has(k) && !this.inflightKeys.has(k));
    const row = needs.row && !this.loadedRows.has(rowId(needs.row)) && !this.inflightRows.has(rowId(needs.row)) ? needs.row : null;
    if (!keys.length && !row) return Promise.resolve();
    return this.loadSome(keys, row);
  }

  /** The read every save returns, and the admin's and the CRM's whole snapshot. */
  replaceFull(data: ContentData): void {
    this.full = data;
    this.fullTried = true;
    this.dirty = true;
    this.emit();
  }

  /**
   * Read again. On the admin and the CRM (and in local mode) that is the store's own
   * load(), which is how the shells pick up the signed-in session after login. On a
   * visitor's page it re-reads what this page load has read so far.
   */
  async refresh(needs: Needs): Promise<void> {
    if (needs.all || this.full || !this.reader) {
      this.replaceFull(await this.store.load());
      return;
    }
    const keys = [...new Set([...this.loadedKeys, ...needs.keys])];
    const rows = [...this.loadedRows];
    this.loadedKeys.clear();
    this.loadedRows.clear();
    const jobs: Promise<void>[] = [this.loadSome(keys.filter((k) => !this.inflightKeys.has(k)), null)];
    for (const id of rows) {
      const [collection, slug] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
      jobs.push(this.loadSome([], { collection: collection as RowCollection, slug }));
    }
    await Promise.all(jobs);
  }

  /** The blog and legal bodies, from their own chunk, once (see ./deferredBodies.ts). */
  requestBodies(): void {
    if (this.bodiesRequested) return;
    this.bodiesRequested = true;
    loadDeferredBodies().then(
      (bodies) => {
        this.bodies = bodies;
        this.bodiesReady = true;
        this.dirty = true;
        this.emit();
      },
      (e) => {
        console.warn("Ideovent CMS: could not load deferred content bodies.", e);
        // Ready anyway: the page must fall through to its own empty state, not spin.
        this.bodiesReady = true;
        this.emit();
      },
    );
  }

  private loadFull(): Promise<void> {
    if (this.fullPromise) return this.fullPromise;
    this.pending++;
    this.emit();
    /*
      The load MUST end whatever store.load() does. The Supabase store swallows its
      own query errors, but the deferred wrapper in ./store fetches the SDK chunk
      first, and a failed chunk request rejects before load() runs. Pages gate their
      "not found" state on `loading`, so a rejection left unhandled would hold them on
      a blank placeholder for ever. On failure the seed stays on screen, the same
      answer the Supabase store gives when its own query fails.
    */
    this.fullPromise = this.store.load().then(
      (data) => {
        this.full = data;
        this.dirty = true;
      },
      (e) => console.warn("Ideovent CMS: content load failed, showing the seed.", e),
    ).finally(() => {
      this.fullTried = true;
      this.pending--;
      this.emit();
    });
    return this.fullPromise;
  }

  private async loadSome(keys: ContentKey[], row: RowNeed | null): Promise<void> {
    if (!this.reader || (!keys.length && !row)) return;
    for (const k of keys) this.inflightKeys.add(k);
    if (row) this.inflightRows.add(rowId(row));
    this.pending++;
    this.emit();
    try {
      this.absorb(keys, row, await this.reader.read(keys, row));
      // A row that is not there falls back to the seed only if the collection has no
      // stored rows at all, as a full read would decide (the two example pitch pages).
      const col = row?.collection;
      if (col && !this.matching(row).length && this.hasRows[col] === undefined && (seed[col] as unknown[]).length) {
        this.hasRows[col] = await this.reader.hasRows(col);
        this.dirty = true;
      }
    } catch (e) {
      console.warn("Ideovent CMS: content read failed, showing the seed.", e);
    } finally {
      for (const k of keys) {
        this.inflightKeys.delete(k);
        this.loadedKeys.add(k);
      }
      if (row) {
        this.inflightRows.delete(rowId(row));
        this.loadedRows.add(rowId(row));
      }
      this.pending--;
      this.emit();
    }
  }

  /** Stored documents of the row's collection whose slug is the row's slug. */
  private matching(row: RowNeed): BaseDoc[] {
    return [...this.docs[row.collection].values()].filter(
      (d) => String((d as { slug?: string }).slug || "").trim().toLowerCase() === row.slug,
    );
  }

  private absorb(keys: ContentKey[], row: RowNeed | null, rows: ContentRow[]): void {
    const byKey = new Map<string, unknown[]>();
    if (row) for (const d of this.matching(row)) this.docs[row.collection].delete(d.id);
    for (const r of rows) {
      if (row && r.collection === row.collection) {
        const doc = r.data as BaseDoc | null;
        if (!doc || typeof doc !== "object") continue;
        this.docs[row.collection].set(doc.id || r.doc_id, doc);
        this.hasRows[row.collection] = true;
        continue;
      }
      const list = byKey.get(r.collection) || [];
      list.push(r.data);
      byKey.set(r.collection, list);
    }
    for (const k of keys) {
      const list = byKey.get(k);
      // No stored rows: the seed shows, exactly as a full read would leave it.
      if (!list || !list.length) delete this.whole[k];
      else this.whole[k] = SINGLETONS.has(k) ? list[list.length - 1] : list;
    }
    this.dirty = true;
  }

  private build(): ContentSnapshot {
    let data = this.snap?.data;
    if (this.dirty || !data) {
      if (this.full) data = this.full;
      else {
        const partial: Record<string, unknown> = { ...this.whole };
        for (const col of ROW_COLLECTIONS) {
          const list = [...this.docs[col].values()];
          // Stored rows replace the seed's list (an empty list too, once anon is known to see some).
          if (list.length || this.hasRows[col]) partial[col] = list;
        }
        data = mergeWithSeed(partial as Partial<ContentData>);
      }
      if (this.bodies) data = fillDeferredBodies(data, this.bodies);
      this.dirty = false;
    }
    return {
      data,
      pending: this.pending,
      all: Boolean(this.full) || this.fullTried,
      keys: new Set(this.loadedKeys),
      rows: new Set(this.loadedRows),
      bodiesReady: this.bodiesReady,
    };
  }

  private emit(): void {
    this.snap = this.build();
    for (const listener of [...this.listeners]) listener();
  }
}

let instance: ContentLoader | null = null;

/** The page's one loader. Created on first use with the page's store and reader. */
export function getLoader(make: () => ContentLoader): ContentLoader {
  if (!instance) instance = make();
  return instance;
}
