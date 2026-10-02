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
 * 3. TWO REQUESTS, AT THE SAME TIME. The keys a page reads are one select; the one
 *    row it shows (a demo, a pitch page) is asked for by its slug at the same moment,
 *    so neither waits for the other.
 *
 * A DEMO OR A PITCH PAGE IS READ BY ITS LINK, NEVER AS A LIST (supabase/migrations/
 * 0013). Until then the table answered `anon` with every sent demo and every live
 * pitch page to whoever asked for the list, and the anon key is public: one request
 * downloaded the whole pipeline of prospects. Since 0013 the table gives `anon` no
 * row of either collection, and public_row_by_slug(collection, slug) gives exactly
 * one: the sent demo (the live pitch page) whose slug is in the link. Nothing here
 * ever asks for either collection whole.
 *
 * THE CODE SHIPS BEFORE THE SQL. Until Mehdi runs 0013 the function does not exist
 * and PostgREST answers 404 (PGRST202). That 404, and only that, sends the row to
 * the read this file made before (the table, by slug), and the page remembers it
 * for the rest of its life, so it is asked once. Any other failure is a failed read,
 * as before: the loader keeps the seed on screen and logs a warning. Until then the
 * browser's console also shows that one 404 per page, in red: a browser logs every
 * failed request and no script can hide it. It is expected, and it ends with 0013,
 * which adds the functions five seconds before it closes the list, so a page opened
 * while PostgREST loads them still finds its row the old way.
 *
 * The anon key is public by design (it is in the bundle); what it may read is set by
 * the row-level security in supabase/migrations/0005 and 0013, which this file
 * cannot widen.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { ROW_COLLECTIONS, isPlainSlug, type ContentKey, type RowCollection, type RowNeed } from "./scope";

export interface ContentRow {
  collection: string;
  doc_id: string;
  data: unknown;
}

/** What the loader needs from a reader. A fake one stands in for it in the tests. */
export interface PublicReader {
  /** Whole keys (paged past 1000 rows) and at most one row by its slug, the two at once. */
  read(keys: readonly ContentKey[], row: RowNeed | null): Promise<ContentRow[]>;
  /** Whether a visitor can open any row of the collection at all. */
  hasRows(collection: RowCollection): Promise<boolean>;
}

/* Rows per request. PostgREST caps a response at the project's "Max rows" (1000 by
   default) without saying so; see the same constant in ./supabaseStore.ts. */
const PAGE = 1000;

/** Read one row at a time, by link, and never whole (0013). */
const BY_LINK_ONLY = new Set<string>(ROW_COLLECTIONS);

const rest = () => `${(SUPABASE_URL || "").replace(/\/$/, "")}/rest/v1`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getRows(params: URLSearchParams): Promise<ContentRow[]> {
  const key = SUPABASE_ANON_KEY || "";
  const simple = new URLSearchParams(params);
  simple.set("apikey", key);
  try {
    const res = await fetch(`${rest()}/content?${simple}`);
    if (res.ok) return (await res.json()) as ContentRow[];
  } catch {
    /* a dropped request on a phone, or a project that refuses the query form: retry below */
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let res: Response;
  try {
    res = await fetch(`${rest()}/content?${params}`, { headers });
  } catch {
    await wait(800);
    res = await fetch(`${rest()}/content?${params}`, { headers });
  }
  if (!res.ok) throw new Error(`content read failed: HTTP ${res.status}`);
  return (await res.json()) as ContentRow[];
}

/** Every page of a select, 1000 rows at a time. */
async function getAllRows(query: URLSearchParams): Promise<ContentRow[]> {
  const out: ContentRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const p = new URLSearchParams(query);
    p.set("offset", String(from));
    p.set("limit", String(PAGE));
    const page = await getRows(p);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

/** 0013's functions are not in the database yet: PostgREST answered 404 (PGRST202). */
export class FunctionMissing extends Error {
  constructor(fn: string) {
    super(`${fn} is not in the database yet (supabase/migrations/0013)`);
    this.name = "FunctionMissing";
  }
}

/**
 * GET /rest/v1/rpc/<fn>?<args>: a STABLE function, so PostgREST serves it to a GET,
 * and in the same two forms as a table read (the key in the query, then in headers).
 * The arguments go through URLSearchParams, so a slug is always one encoded value.
 *
 * A 404 is PostgREST saying the function does not exist: FunctionMissing. One 404 is
 * not that: when its text names `apikey`, PostgREST looked for a function that also
 * takes an argument called apikey, so the gateway passed the query key on instead of
 * taking it off. That is the query form refused, and the header form decides.
 */
async function callFunction(fn: "public_row_by_slug" | "public_has_rows", args: Record<string, string>): Promise<unknown> {
  const key = SUPABASE_ANON_KEY || "";
  const url = `${rest()}/rpc/${fn}`;
  const params = new URLSearchParams(args);
  const simple = new URLSearchParams(params);
  simple.set("apikey", key);
  try {
    const res = await fetch(`${url}?${simple}`);
    if (res.ok) return await res.json();
    if (res.status === 404 && !/\bapikey\b/.test(await res.text().catch(() => ""))) throw new FunctionMissing(fn);
  } catch (e) {
    if (e instanceof FunctionMissing) throw e;
    /* a dropped request on a phone, or the query form refused: the header form below */
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let res: Response;
  try {
    res = await fetch(`${url}?${params}`, { headers });
  } catch {
    await wait(800);
    res = await fetch(`${url}?${params}`, { headers });
  }
  if (res.ok) return res.json();
  if (res.status === 404) throw new FunctionMissing(fn);
  throw new Error(`${fn} failed: HTTP ${res.status}`);
}

/**
 * The slug as a PostgREST operator, for the read before 0013. ilike because
 * resolveDemoSite and resolvePitchPage compare lower-cased on both sides. A
 * well-formed slug ([a-z0-9-]) has nothing to escape; anything else has its LIKE
 * wildcards escaped and is quoted for the filter.
 */
export function slugOperator(slug: string): string {
  if (isPlainSlug(slug)) return `ilike.${slug}`;
  const like = slug.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `ilike."${like.replace(/["\\]/g, (c) => `\\${c}`)}"`;
}

/**
 * The read before 0013, kept as the fallback: whole keys, plus the row by its slug,
 * as one filter. Since 0013 the table gives a visitor no demo and no pitch page, so
 * this finds the row only while 0013 has not been run.
 */
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

/** A reader with its own memory of whether 0013 is there: one per page (and one per test). */
export function createPublicReader(): PublicReader {
  /* Unknown until the first answer; then kept for the page's life. */
  let functions: "unknown" | "present" | "missing" = "unknown";

  /** Ask 0013's function; on FunctionMissing, remember it and read the old way instead. */
  async function viaFunction<T>(
    fn: "public_row_by_slug" | "public_has_rows",
    args: Record<string, string>,
    take: (answer: unknown) => T,
    before0013: () => Promise<T>,
  ): Promise<T> {
    if (functions !== "missing") {
      try {
        const value = take(await callFunction(fn, args));
        functions = "present";
        return value;
      } catch (e) {
        if (!(e instanceof FunctionMissing)) throw e;
        functions = "missing";
      }
    }
    return before0013();
  }

  const readRow = (row: RowNeed) =>
    viaFunction(
      "public_row_by_slug",
      { p_collection: row.collection, p_slug: row.slug },
      (answer) => (Array.isArray(answer) ? (answer as ContentRow[]) : []),
      () => getAllRows(contentQuery([], row)),
    );

  return {
    async read(keys, row) {
      const whole = keys.filter((k) => !BY_LINK_ONLY.has(k));
      if (!whole.length && !row) return [];
      if (!row) return getAllRows(contentQuery(whole, null));
      // Known to be before 0013: the one request this page made before.
      if (functions === "missing") return getAllRows(contentQuery(whole, row));
      const [rows, one] = await Promise.all([whole.length ? getAllRows(contentQuery(whole, null)) : Promise.resolve([]), readRow(row)]);
      return [...rows, ...one];
    },
    hasRows(collection) {
      return viaFunction(
        "public_has_rows",
        { p_collection: collection },
        (answer) => answer === true,
        async () => (await getRows(new URLSearchParams({ select: "doc_id", collection: `eq.${collection}`, limit: "1" }))).length > 0,
      );
    },
  };
}

export const publicReader: PublicReader = createPublicReader();
