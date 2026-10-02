/**
 * A VISITOR'S READ OF THE CMS, WITHOUT THE SUPABASE SDK (2 Oct 2026).
 *
 * What a public page reads is decided by ./scope.ts; this file only fetches it.
 * Three choices here, each measured on the live site that day:
 *
 * 1. NO SDK. @supabase/supabase-js is 214 KB of JavaScript (55 KB gzip) and every
 *    public page in Supabase mode downloaded and parsed it to make one GET. A read
 *    as `anon` is exactly that GET, so it is made with fetch(). The SDK still loads
 *    for the admin and the CRM, which need the signed-in session (./supabaseStore).
 *
 * 2. NO PREFLIGHT. The SDK sends the key in `apikey` and `Authorization` headers.
 *    Custom headers make the browser send an OPTIONS request first and wait for it:
 *    two round trips to a new origin before the content can start arriving. Supabase
 *    accepts the anon key as an `apikey` query parameter (supabase/supabase#28930),
 *    which keeps the GET a CORS "simple request" and one round trip. If a project
 *    ever refuses that form, the same read is retried with the headers.
 *
 * 3. ONE REQUEST PER ADDRESS. The keys a page reads and the one row it shows (a
 *    demo, a pitch page) go out together as one `or=(...)` filter.
 *
 * The anon key is public by design (it is in the bundle); what it may read is set by
 * the row-level security in supabase/migrations/0005, which this file cannot widen.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { isPlainSlug, type ContentKey, type RowCollection, type RowNeed } from "./scope";

export interface ContentRow {
  collection: string;
  doc_id: string;
  data: unknown;
}

/** What the loader needs from a reader. A fake one stands in for it in the tests. */
export interface PublicReader {
  /** Whole keys and at most one row by slug, in one request (paged past 1000 rows). */
  read(keys: readonly ContentKey[], row: RowNeed | null): Promise<ContentRow[]>;
  /** Whether `anon` can read any row of the collection at all. */
  hasRows(collection: RowCollection): Promise<boolean>;
}

/* Rows per request. PostgREST caps a response at the project's "Max rows" (1000 by
   default) without saying so; see the same constant in ./supabaseStore.ts. */
const PAGE = 1000;

const endpoint = () => `${(SUPABASE_URL || "").replace(/\/$/, "")}/rest/v1/content`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getRows(params: URLSearchParams): Promise<ContentRow[]> {
  const key = SUPABASE_ANON_KEY || "";
  const simple = new URLSearchParams(params);
  simple.set("apikey", key);
  try {
    const res = await fetch(`${endpoint()}?${simple}`);
    if (res.ok) return (await res.json()) as ContentRow[];
  } catch {
    /* a dropped request on a phone, or a project that refuses the query form: retry below */
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let res: Response;
  try {
    res = await fetch(`${endpoint()}?${params}`, { headers });
  } catch {
    await wait(800);
    res = await fetch(`${endpoint()}?${params}`, { headers });
  }
  if (!res.ok) throw new Error(`content read failed: HTTP ${res.status}`);
  return (await res.json()) as ContentRow[];
}

/**
 * The slug as a PostgREST operator. ilike because resolveDemoSite and resolvePitchPage
 * compare lower-cased on both sides. A well-formed slug ([a-z0-9-]) has nothing to
 * escape; anything else has its LIKE wildcards escaped and is quoted for the filter.
 */
export function slugOperator(slug: string): string {
  if (isPlainSlug(slug)) return `ilike.${slug}`;
  const like = slug.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `ilike."${like.replace(/["\\]/g, (c) => `\\${c}`)}"`;
}

/** The query for a page: whole keys, plus its row, as one filter. */
export function contentQuery(keys: readonly ContentKey[], row: RowNeed | null): URLSearchParams {
  const p = new URLSearchParams({ select: "collection,doc_id,data" });
  if (!row) p.set("collection", `in.(${keys.join(",")})`);
  else {
    const terms = [`and(collection.eq.${row.collection},data->>slug.${slugOperator(row.slug)})`];
    if (keys.length) terms.unshift(`collection.in.(${keys.join(",")})`);
    p.set("or", `(${terms.join(",")})`);
  }
  p.set("order", "collection.asc,doc_id.asc");
  return p;
}

export const publicReader: PublicReader = {
  async read(keys, row) {
    if (!keys.length && !row) return [];
    const out: ContentRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const p = contentQuery(keys, row);
      p.set("offset", String(from));
      p.set("limit", String(PAGE));
      const page = await getRows(p);
      out.push(...page);
      if (page.length < PAGE) return out;
    }
  },
  async hasRows(collection) {
    const rows = await getRows(new URLSearchParams({ select: "doc_id", collection: `eq.${collection}`, limit: "1" }));
    return rows.length > 0;
  },
};
