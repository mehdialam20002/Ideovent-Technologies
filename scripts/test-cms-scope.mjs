/**
 * What each address reads from the CMS, and the cache that reads it.
 *
 *   node scripts/test-cms-scope.mjs
 *
 * Bundles the real src/lib/cms/scope.ts, publicRead.ts and loader.ts with esbuild
 * and drives them with a fake store and a fake reader (no network, no browser):
 *
 *   1. the route table: a demo reads its own row, a pitch page its own row, the
 *      admin and the CRM everything, a public page the chrome plus its own keys
 *   2. the query: one request per address, the slug compared case-insensitively,
 *      an odd slug escaped rather than pasted into the filter
 *   3. the reader: the anon key as a query parameter with no headers (no CORS
 *      preflight), and the header form when a project refuses that
 *   3b. a demo or a pitch page (0013): its row is asked of public_row_by_slug, at
 *      the same time as the keys; a 404 from the function (0013 not run yet), and
 *      only a 404, falls back to the read before 0013, remembered for the page;
 *      hasRows asks public_has_rows the same way; a slug is one encoded value; a
 *      demo or a pitch collection is never read whole
 *   4. the loader: a demo never triggers the full read, a later route reads only
 *      what it adds, a missing pitch row falls back to the seed only when anon
 *      sees no pitch rows at all, a failed read ends `loading`, a save replaces
 *      everything; 4b the same loader with the REAL reader, before and after 0013
 *   5. nothing else a visitor runs reads a demo or a pitch page (a scan of src/,
 *      api/ and the build scripts)
 *
 * PROVING IT CAN FAIL:  CMS_SCOPE_NEGATIVE=1 node scripts/test-cms-scope.mjs
 * puts back the old rule (a demo reads the whole table). Section 4 must then fail.
 * CMS_SCOPE_NEGATIVE=rpc puts back the reader as it was before 0013 (the row from
 * the table, never the function). Sections 3b and 4b must then fail.
 */
import { build } from "esbuild";
import { existsSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.CMS_SCOPE_NEGATIVE);
const NEGATIVE_RPC = process.env.CMS_SCOPE_NEGATIVE === "rpc";

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}

const alias = {
  name: "alias",
  setup(b) {
    // The SDK client is never reached here; a stub keeps it out of the bundle.
    b.onResolve({ filter: /^(\.\/client|@\/lib\/cms\/client)$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({
      contents: "export const supabaseEnabled = true; export function supabase() { throw new Error('SDK used in a unit test'); }",
      loader: "js",
    }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (NEGATIVE_RPC) {
      // The reader before 0013: it starts out sure the functions are missing, so every row
      // comes from the table by its slug and the functions are never asked.
      b.onLoad({ filter: /cms[\\/]publicRead\.ts$/ }, (args) => {
        const src = readFileSync(args.path, "utf8");
        const rule = 'let functions: "unknown" | "present" | "missing" = "unknown";';
        if (!src.includes(rule)) throw new Error("negative control: the reader's memory line was not found in publicRead.ts");
        return { contents: src.replace(rule, rule.replace('= "unknown"', '= "missing"')), loader: "ts" };
      });
    } else if (NEGATIVE) {
      b.onLoad({ filter: /cms[\\/]scope\.ts$/ }, (args) => {
        const src = readFileSync(args.path, "utf8");
        const rule = 'if (crmHost || /^\\/(admin|crm)(\\/|$)/.test(path)) return make(true, [], null);';
        if (!src.includes(rule)) throw new Error("negative control: the admin rule was not found in scope.ts");
        return { contents: src.replace(rule, rule.replace("(admin|crm)", "(admin|crm|site)")), loader: "ts" };
      });
    }
  },
};

const out = join(tmpdir(), `ideovent-test-cms-scope-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: `export * from "@/lib/cms/scope"; export * from "@/lib/cms/publicRead"; export * from "@/lib/cms/loader"; export { seed } from "@/lib/cms/seed"; export { loadDeferredBodies } from "@/lib/cms/deferredBodies";`,
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [alias],
  loader: { ".json": "json" },
  define: {
    "import.meta.env": JSON.stringify({
      BASE_URL: "/", DEV: false,
      VITE_SUPABASE_URL: "https://unit.supabase.co", VITE_SUPABASE_ANON_KEY: "unit-anon-key",
    }),
  },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

const failures = [];
let passes = 0;
function check(ok, message) {
  if (ok) passes++;
  else failures.push(message);
  console.log(`${ok ? "ok  " : "FAIL"}  ${message}`);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (xs) => [...xs].sort();

/* ── 1. The route table ─────────────────────────────────────────────────── */
console.log("\n1. what each address reads");
const SEO = ["contact", "settings", "socials"];
const CHROME = sorted([...SEO, "navigation", "services", "projects"]);
const N = (p, crm = false) => M.needsFor(p, crm);

const demo = N("/site/Riverbend-Public-School/admissions");
check(!demo.all && same(demo.keys, SEO), `a demo reads only the three keys <Seo> reads (${demo.keys})`);
check(demo.row && demo.row.collection === "demoSites" && demo.row.slug === "riverbend-public-school", "a demo reads its own row, slug lower-cased, subpage ignored");
const pitch = N("/pitch/Example-Public-School");
check(!pitch.all && pitch.row?.collection === "pitchPages" && pitch.row.slug === "example-public-school", "/pitch/<slug> reads its own pitch row");
const bare = N("/some-institute");
check(bare.row?.collection === "pitchPages" && same(bare.keys, CHROME), "a bare /<slug> reads its pitch row plus the chrome the 404 page needs");
check(N("/admin").all && N("/admin/c/demoSites").all && N("/crm/leads/x").all, "the admin and the CRM read everything");
check(N("/", true).all && N("/leads", true).all, "the CRM host reads everything at any address");
check(!N("/admin/login").all && same(N("/admin/login").keys, SEO) && !N("/login", true).all, "the sign-in forms read no table (the shells read it again as the admin)");
const home = N("/");
check(!home.all && !home.row && ["home", "process", "faqs", "testimonials"].every((k) => home.keys.includes(k)), `/ reads the chrome plus its own sections (${home.keys})`);
check(!home.keys.includes("demoSites") && !home.keys.includes("pitchPages") && !home.keys.includes("posts"), "/ reads no demo, no pitch page and no blog post");
check(same(N("/about").keys, sorted([...CHROME, "stats", "team", "milestones"])), "/about adds stats, team and milestones");
check(N("/blog/some-post").keys.includes("posts") && N("/blog").keys.includes("posts"), "/blog and /blog/<slug> read the posts");
check(same(N("/services/seo").keys, sorted([...CHROME, "faqs", "process"])), "/services/seo reads the chrome plus the FAQs and the process steps");
check(same(N("/pricing").keys, CHROME) && same(N("/checkout/starter/success").keys, CHROME), "/pricing and checkout read only the chrome");
check(N("/privacy").keys.includes("legal") && N("/verify/INT1").keys.includes("certificates"), "legal pages read legal, /verify reads certificates");
check(!N("/websites/dental-clinic").row && !N("/websites").row, "the landing pages are not mistaken for pitch slugs");
const odd = N("/a/b/c");
check(!odd.all && !odd.row && same(odd.keys, sorted(M.PUBLIC_KEYS)), "an unknown deep address reads every public key and nothing private");
check(!M.PUBLIC_KEYS.some((k) => ["demoSites", "pitchPages", "submissions", "applications", "certificateGrades", "pitchPageNotes", "demoSiteSlots", "demoSiteOpens"].includes(k)), "PUBLIC_KEYS holds no slug-addressed and no private collection");
check(N("/about") === N("/about") && N("/about/").id === N("/about").id, "same address, same object (and a trailing slash changes nothing)");

/* ── 2. The query ───────────────────────────────────────────────────────── */
console.log("\n2. one request per address");
const q1 = M.contentQuery(["home", "settings"], null);
check(q1.get("collection") === "in.(home,settings)" && !q1.has("or"), "whole keys only: collection=in.(...)");
const q2 = M.contentQuery(SEO, { collection: "demoSites", slug: "riverbend-public-school" });
check(q2.get("or") === "(collection.in.(contact,settings,socials),and(collection.eq.demoSites,data->>slug.ilike.riverbend-public-school))", `keys and the row in ONE filter: ${q2.get("or")}`);
check(q2.get("order") === "collection.asc,doc_id.asc" && q2.get("select") === "collection,doc_id,data", "stable order, the three columns");
check(M.slugOperator("abc-1") === "ilike.abc-1", "a well-formed slug goes in bare (nothing in it is a wildcard)");
// a_b%c"d -> LIKE escapes (a\_b\%c"d) -> quoted for PostgREST, \ and " escaped: "a\\_b\\%c\"d"
check(M.slugOperator('a_b%c"d') === String.raw`ilike."a\\_b\\%c\"d"`, `an odd slug is escaped and quoted: ${M.slugOperator('a_b%c"d')}`);
check(!M.isPlainSlug("a_b") && M.isPlainSlug("a-b-1"), "isPlainSlug follows the site's slug rule");

/* ── 3. The reader ──────────────────────────────────────────────────────── */
console.log("\n3. the anon read: no SDK, no preflight");
const realFetch = globalThis.fetch;
const seen = [];
let refuseQueryKey = false;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  seen.push({ url: u, headers: init.headers || null });
  if (refuseQueryKey && u.searchParams.has("apikey")) return new Response("{}", { status: 401 });
  return new Response(JSON.stringify([{ collection: "home", doc_id: "_", data: { badge: "x" } }]), { status: 200 });
};
const rows1 = await M.publicReader.read(["home"], null);
check(rows1.length === 1 && seen.length === 1, "one request for one page of rows");
check(seen[0].url.host === "unit.supabase.co" && seen[0].url.pathname === "/rest/v1/content", "it reads the content table of the configured project");
check(seen[0].url.searchParams.get("apikey") === "unit-anon-key" && seen[0].headers === null, "the anon key rides in the query and NO header is sent, so the browser sends no preflight");
check(seen[0].url.searchParams.get("offset") === "0" && seen[0].url.searchParams.get("limit") === "1000", "paged at 1000 rows, the PostgREST cap");
seen.length = 0;
refuseQueryKey = true;
const rows2 = await M.publicReader.read(["home"], null);
check(rows2.length === 1 && seen.length === 2 && seen[1].headers?.apikey === "unit-anon-key" && seen[1].headers?.Authorization === "Bearer unit-anon-key" && !seen[1].url.searchParams.has("apikey"), "a project that refuses the query form is read again with the headers");
refuseQueryKey = false;
seen.length = 0;
check((await M.publicReader.read([], null)).length === 0 && seen.length === 0, "nothing asked, nothing fetched");
globalThis.fetch = realFetch;

/* ── 3b. A demo or a pitch page: one row by its link (0013) ─────────────── */
console.log("\n3b. a demo or a pitch page: one row by its link, through public_row_by_slug (0013)");
/*
  A PostgREST for the reader, inside this process. With `functions` it is a database
  after 0013: the two functions answer, and the table gives anon no demo and no pitch
  page. Without, it is the database before 0013: the functions are a 404 (PGRST202)
  and the table gives anon every sent demo and live pitch page (0005). `leakKey` is a
  gateway that passes the query's apikey on to PostgREST as a function argument.
*/
const UNIT_TABLE = [
  { collection: "settings", doc_id: "_", data: { siteName: "Unit" } },
  { collection: "contact", doc_id: "_", data: { email: "unit@example.org" } },
  { collection: "socials", doc_id: "so1", data: { id: "so1" } },
  { collection: "home", doc_id: "_", data: { badge: "unit" } },
  { collection: "demoSites", doc_id: "d-sent", data: { id: "d-sent", slug: "riverbend-public-school", status: "sent" } },
  { collection: "demoSites", doc_id: "d-draft", data: { id: "d-draft", slug: "draft-academy", status: "draft" } },
  { collection: "pitchPages", doc_id: "p-live", data: { id: "p-live", slug: "lakeside-academy", status: "live" } },
];
const BY_LINK = ["demoSites", "pitchPages"];
function postgrest({ functions = true, table = UNIT_TABLE, refuseQueryKey = false, leakKey = false, fnStatus = 200 } = {}) {
  const f = { log: [], max: 0 };
  let inflight = 0;
  const open = (r) => (r.collection === "demoSites" ? r.data.status === "sent" : r.collection === "pitchPages" ? r.data.status === "live" : true);
  const anonSees = (r) => (functions ? !BY_LINK.includes(r.collection) : open(r));
  f.fetch = async (url, init = {}) => {
    const u = new URL(url);
    f.log.push({ path: u.pathname, q: u.searchParams, raw: String(url), headers: init.headers || null });
    inflight++;
    f.max = Math.max(f.max, inflight);
    await new Promise((r) => setTimeout(r, 15));
    inflight--;
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (refuseQueryKey && u.searchParams.has("apikey")) return reply(401, { message: "Invalid API key" });
    if (u.pathname.startsWith("/rest/v1/rpc/")) {
      const fn = u.pathname.slice("/rest/v1/rpc/".length);
      const args = [...u.searchParams.keys()].filter((k) => leakKey || k !== "apikey").sort();
      if (!functions || args.includes("apikey")) {
        return reply(404, { code: "PGRST202", details: null, hint: null, message: `Could not find the function public.${fn}(${args.join(", ")}) in the schema cache` });
      }
      if (fnStatus !== 200) return reply(fnStatus, { code: "XX000", message: "unit failure" });
      const col = u.searchParams.get("p_collection");
      const mine = (r) => BY_LINK.includes(col) && r.collection === col && open(r);
      if (fn === "public_has_rows") return reply(200, table.some(mine));
      const slug = (u.searchParams.get("p_slug") || "").trim().toLowerCase();
      return reply(200, table.filter((r) => mine(r) && String(r.data.slug || "").trim().toLowerCase() === slug).slice(0, 1));
    }
    if (u.pathname !== "/rest/v1/content") return reply(404, {});
    const visible = table.filter(anonSees);
    const col = u.searchParams.get("collection") || "";
    const or = u.searchParams.get("or") || "";
    let rows = visible;
    if (col.startsWith("in.(")) rows = visible.filter((r) => col.slice(4, -1).split(",").includes(r.collection));
    else if (col.startsWith("eq.")) rows = visible.filter((r) => r.collection === col.slice(3));
    else if (or) {
      const keys = (/collection\.in\.\(([^)]*)\)/.exec(or)?.[1] || "").split(",").filter(Boolean);
      const m = /and\(collection\.eq\.(\w+),data->>slug\.ilike\.(.+)\)\)$/.exec(or);
      rows = visible.filter((r) => keys.includes(r.collection) || (m && r.collection === m[1] && String(r.data.slug).toLowerCase() === m[2].toLowerCase()));
    }
    return reply(200, rows.slice(0, Number(u.searchParams.get("limit") || rows.length)));
  };
  return f;
}
async function withFetch(f, run) {
  const real = globalThis.fetch;
  globalThis.fetch = f.fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = real;
  }
}
const fnCalls = (f) => f.log.filter((e) => e.path.startsWith("/rest/v1/rpc/"));
const tableCalls = (f) => f.log.filter((e) => e.path === "/rest/v1/content");
const listsByLink = (e) => /demoSites|pitchPages/.test(`${e.q.get("collection") || ""} ${e.q.get("or") || ""}`);
const DEMO_ROW = { collection: "demoSites", slug: "riverbend-public-school" };
const PITCH_ROW = { collection: "pitchPages", slug: "lakeside-academy" };

{ // After 0013: the function answers.
  const f = postgrest();
  const R = M.createPublicReader();
  const rows = await withFetch(f, () => R.read(SEO, DEMO_ROW));
  const fn = fnCalls(f);
  const tab = tableCalls(f);
  check(f.log.length === 2 && fn.length === 1 && tab.length === 1, `a demo is two requests: the three <Seo> keys and its row (${f.log.length})`);
  check(fn[0]?.path === "/rest/v1/rpc/public_row_by_slug" && fn[0].q.get("p_collection") === "demoSites" && fn[0].q.get("p_slug") === "riverbend-public-school",
    "the row is asked of public_row_by_slug, by collection and slug");
  check(fn[0]?.q.get("apikey") === "unit-anon-key" && fn[0].headers === null && tab[0]?.headers === null, "both carry the key in the query and send no header (no preflight)");
  check(f.max === 2, `the two go out at the same time, not one after the other (most in flight at once: ${f.max})`);
  check(tab[0]?.q.get("collection") === "in.(contact,settings,socials)" && !tab.some(listsByLink), "the table is asked for the keys only, never for a demo or a pitch page");
  check(rows.length === 4 && rows.some((r) => r.collection === "demoSites" && r.doc_id === "d-sent"), "the answer is the demo's row plus the three keys");
  f.log.length = 0;
  const pitch = await withFetch(f, () => R.read([], PITCH_ROW));
  check(f.log.length === 1 && fnCalls(f)[0]?.q.get("p_collection") === "pitchPages" && pitch[0]?.doc_id === "p-live", "a pitch page with no key left to read is one request: the function");
  f.log.length = 0;
  const has = await withFetch(f, () => R.hasRows("pitchPages"));
  check(has === true && f.log.length === 1 && f.log[0].path === "/rest/v1/rpc/public_has_rows" && f.log[0].q.get("p_collection") === "pitchPages" && f.log[0].headers === null,
    "hasRows asks public_has_rows (true while a pitch page is live)");
  const none = postgrest({ table: UNIT_TABLE.filter((r) => r.collection !== "pitchPages") });
  check((await withFetch(none, () => M.createPublicReader().hasRows("pitchPages"))) === false && !tableCalls(none).length, "...and gets false when none is, without touching the table");
  const lost = postgrest();
  check((await withFetch(lost, () => M.createPublicReader().read([], { collection: "demoSites", slug: "draft-academy" }))).length === 0, "a draft demo's slug gets no row");
}
{ // Before 0013: the function is a 404.
  const f = postgrest({ functions: false });
  const R = M.createPublicReader();
  const rows = await withFetch(f, () => R.read(SEO, DEMO_ROW));
  const fallback = tableCalls(f).find((e) => e.q.get("or"));
  check(fnCalls(f).length === 1 && fallback?.q.get("or") === "(and(collection.eq.demoSites,data->>slug.ilike.riverbend-public-school))",
    "a 404 from the function (0013 not run): the row is read as before, from the table by its slug");
  check(rows.length === 4 && rows.some((r) => r.doc_id === "d-sent"), "...and the demo still arrives, with the three keys");
  f.log.length = 0;
  const again = await withFetch(f, () => R.read(SEO, PITCH_ROW));
  check(f.log.length === 1 && !fnCalls(f).length && f.log[0].q.get("or") === "(collection.in.(contact,settings,socials),and(collection.eq.pitchPages,data->>slug.ilike.lakeside-academy))"
    && again.some((r) => r.doc_id === "p-live"), "the page remembers: its next read asks no function and is the one request it made before 0013");
  f.log.length = 0;
  const has = await withFetch(f, () => R.hasRows("pitchPages"));
  check(has === true && f.log.length === 1 && f.log[0].q.get("collection") === "eq.pitchPages" && f.log[0].q.get("limit") === "1", "hasRows, remembered too: the one-row probe of the table it made before");
  const h = postgrest({ functions: false });
  const fresh = await withFetch(h, () => M.createPublicReader().hasRows("pitchPages"));
  check(fresh === true && fnCalls(h).length === 1 && tableCalls(h).length === 1, "hasRows on a page that has not asked yet: the function's 404, then the probe");
}
{ // Only a 404 falls back.
  for (const status of [400, 401, 403, 500, 503]) {
    const f = postgrest({ fnStatus: status });
    const R = M.createPublicReader();
    let error = null;
    await withFetch(f, () => R.read(SEO, DEMO_ROW).catch((e) => { error = e; }));
    const oldRead = tableCalls(f).some((e) => e.q.get("or"));
    f.log.length = 0;
    await withFetch(f, () => R.read([], DEMO_ROW).catch(() => null));
    const askedAgain = fnCalls(f).length > 0 && !tableCalls(f).length;
    check(error && !oldRead && askedAgain, `a ${status} from the function is a failed read (the loader keeps the seed and warns), never the old read, and not remembered as "before 0013"`);
  }
  const net = { log: [], fetch: async (url) => { net.log.push(String(url)); throw new TypeError("network down (test)"); } };
  let error = null;
  await withFetch(net, () => M.createPublicReader().read([], DEMO_ROW).catch((e) => { error = e; }));
  check(error && !net.log.some((u) => u.includes("/rest/v1/content")), "a dropped connection is a failed read too (after the header retry), not the old read");
}
{ // The key in headers when a project refuses the query form; a gateway that passes the key on.
  const f = postgrest({ refuseQueryKey: true });
  const rows = await withFetch(f, () => M.createPublicReader().read(SEO, DEMO_ROW));
  const fnHeaders = fnCalls(f).find((e) => e.headers);
  check(rows.length === 4 && fnHeaders && fnHeaders.headers.apikey === "unit-anon-key" && fnHeaders.headers.Authorization === "Bearer unit-anon-key" && !fnHeaders.q.has("apikey"),
    "a project that refuses the query key: the function is asked again with the headers, and answers");
  const g = postgrest({ leakKey: true });
  const R = M.createPublicReader();
  const got = await withFetch(g, () => R.read([], DEMO_ROW));
  check(got[0]?.doc_id === "d-sent" && fnCalls(g).length === 2 && !tableCalls(g).length, "a 404 that names `apikey` (the gateway passed the query key on) is the query form refused: the headers decide, no fallback");
  g.log.length = 0;
  await withFetch(g, () => R.read([], PITCH_ROW));
  check(fnCalls(g).length >= 1 && !tableCalls(g).length, "...and the page does not take it for 'before 0013'");
  const h = postgrest({ leakKey: true, functions: false });
  const old = await withFetch(h, () => M.createPublicReader().read([], DEMO_ROW));
  check(old[0]?.doc_id === "d-sent" && fnCalls(h).length === 2 && tableCalls(h).length === 1, "the same gateway before 0013: the header form's 404 decides, and the old read follows");
}
{ // A slug is one encoded value; demos and pitch pages are never read whole.
  const ODD = `a&b=c#d%e"f,(g) h+i/j?k=l;m`;
  const f = postgrest();
  await withFetch(f, () => M.createPublicReader().read([], { collection: "demoSites", slug: ODD }));
  const e = f.log[0];
  check(e && e.path === "/rest/v1/rpc/public_row_by_slug" && e.q.get("p_slug") === ODD && e.q.get("p_collection") === "demoSites"
    && same([...e.q.keys()].sort(), ["apikey", "p_collection", "p_slug"]) && !/[#"&]b=|#d| h/.test(e.raw.split("?")[1] || ""),
    `an odd slug travels as one percent-encoded value and adds nothing to the URL (${e?.raw.split("?")[1]})`);
  const g = postgrest();
  const R = M.createPublicReader();
  await withFetch(g, () => R.read(["home", "demoSites", "pitchPages"], null));
  check(g.log.length === 1 && g.log[0].q.get("collection") === "in.(home)", "asked for demoSites or pitchPages whole, the reader reads neither");
  g.log.length = 0;
  check((await withFetch(g, () => R.read(["demoSites", "pitchPages"], null))).length === 0 && !g.log.length, "...and with nothing else asked, makes no request at all");
}

/* ── 4. The loader ──────────────────────────────────────────────────────── */
console.log("\n4. the loader");
const DEMO = { id: "e2e-scope-demo", slug: "riverbend-public-school", instituteName: "Riverbend Public School", kind: "school", status: "sent" };
const TABLE = [
  { collection: "home", doc_id: "_", data: { badge: "STORED BADGE" } },
  { collection: "services", doc_id: "s1", data: { id: "s1", title: "Stored service", order: 0 } },
  { collection: "posts", doc_id: "p1", data: { id: "p1", title: "Stored post", order: 0 } },
  { collection: "demoSites", doc_id: DEMO.id, data: DEMO },
];

function fakes(table = TABLE, { failRead = false } = {}) {
  const calls = { load: 0, read: [], has: [] };
  const FULL = { ...M.seed, demoSites: [DEMO], __full: true };
  const store = {
    mode: "supabase",
    load: async () => { calls.load++; return FULL; },
    saveDoc: async () => FULL, removeDoc: async () => FULL, reorder: async () => FULL,
    saveSingleton: async () => FULL, reset: async () => FULL, importJson: async () => FULL, exportJson: () => "{}",
  };
  const reader = {
    async read(keys, row) {
      calls.read.push({ keys: [...keys], row });
      if (failRead) throw new Error("network down (test)");
      return table.filter((r) =>
        keys.includes(r.collection) ||
        (row && r.collection === row.collection && String(r.data.slug || "").toLowerCase() === row.slug));
    },
    async hasRows(col) { calls.has.push(col); return table.some((r) => r.collection === col); },
  };
  return { calls, store, reader, FULL };
}
const loaderWith = (f, local = false) => new M.ContentLoader(f.store, local ? null : f.reader);

{ // A visitor moving from / to /about to /blog.
  const f = fakes();
  const L = loaderWith(f);
  let events = 0;
  L.subscribe(() => events++);
  const p = L.ensure(N("/"));
  check(L.getSnapshot().pending === 1 && !M.covers(L.getSnapshot(), N("/")), "while / is being read the page is loading");
  await p;
  const s = L.getSnapshot();
  check(f.calls.read.length === 1 && same(f.calls.read[0].keys, N("/").keys) && f.calls.read[0].row === null, "/ is ONE read of exactly its keys");
  check(f.calls.load === 0, "a visitor's page never runs the full (SDK) read");
  check(s.pending === 0 && M.covers(s, N("/")) && events >= 2, "after the read / is covered and the provider was told");
  check(s.data.home.badge === "STORED BADGE" && s.data.home.hero !== undefined, "a stored singleton merges over the seed field by field");
  check(s.data.services.length === 1 && s.data.services[0].id === "s1", "a stored collection replaces the seed's list, as a full read would");
  check(s.data.faqs.length === M.seed.faqs.length && s.data.faqs.length > 0, "a key with no stored rows shows the seed");
  check(!M.covers(s, N("/about")), "/about is not covered yet: its page starts out loading, no 404 flash");
  await L.ensure(N("/about"));
  check(f.calls.read.length === 2 && same(f.calls.read[1].keys, ["milestones", "stats", "team"]), `/about reads only what it adds (${f.calls.read[1]?.keys})`);
  await L.ensure(N("/blog/stored-post"));
  check(f.calls.read.length === 3 && same(f.calls.read[2].keys, ["posts"]) && L.getSnapshot().data.posts[0].id === "p1", "/blog/<slug> reads only the posts");
  await L.ensure(N("/pricing"));
  await L.ensure(N("/"));
  check(f.calls.read.length === 3, "going back to pages already read costs nothing (cached for the page load)");
}
{ // Two components asking at once share one request.
  const f = fakes();
  const L = loaderWith(f);
  // /pricing reads only the chrome, which /about's request already carries.
  await Promise.all([L.ensure(N("/about")), L.ensure(N("/about")), L.ensure(N("/pricing"))]);
  check(f.calls.read.length === 1, `simultaneous asks for the same keys make one request (${f.calls.read.length})`);
  await L.ensure(N("/contact"));
  check(f.calls.read.length === 2 && same(f.calls.read[1].keys, ["faqs"]), `then /contact reads only the FAQs it adds (${f.calls.read[1]?.keys})`);
}
{ // A demo.
  const f = fakes();
  const L = loaderWith(f);
  await L.ensure(N("/site/Riverbend-Public-School/admissions"));
  const s = L.getSnapshot();
  check(f.calls.load === 0, "a demo NEVER triggers the full read of every demo");
  check(f.calls.read.length === 1 && f.calls.read[0].row?.slug === "riverbend-public-school" && same(f.calls.read[0].keys, SEO), "a demo is one read: its row and the three <Seo> keys");
  check(s.data.demoSites.length === 1 && s.data.demoSites[0].id === DEMO.id && M.covers(s, N("/site/riverbend-public-school")), "the demo is in the snapshot and the address is covered");
  check(f.calls.has.length === 0, "no existence probe for demos (the seed has none to fall back to)");
  const g = fakes();
  const G = loaderWith(g);
  await G.ensure(N("/site/no-such-demo"));
  check(G.getSnapshot().data.demoSites.length === 0 && M.covers(G.getSnapshot(), N("/site/no-such-demo")) && G.getSnapshot().pending === 0, "an unknown demo ends loading with no record (the page shows its 404)");
}
{ // Pitch pages: the two seeded examples show only while anon sees no pitch rows at all.
  const f = fakes();
  const L = loaderWith(f);
  await L.ensure(N("/pitch/example-public-school"));
  check(f.calls.has.length === 1 && L.getSnapshot().data.pitchPages.some((p) => p.slug === "example-public-school"), "no stored pitch pages: the seeded example still opens, after one probe");
  const real = { collection: "pitchPages", doc_id: "pp1", data: { id: "pp1", slug: "real-institute", status: "live" } };
  const g = fakes([...TABLE, real]);
  const G = loaderWith(g);
  await G.ensure(N("/pitch/example-public-school"));
  check(g.calls.has.length === 1 && G.getSnapshot().data.pitchPages.length === 0, "with stored pitch pages the examples are gone, as a full read would leave them");
  await G.ensure(N("/real-institute"));
  check(G.getSnapshot().data.pitchPages.some((p) => p.slug === "real-institute") && g.calls.has.length === 1, "the bare /<slug> finds a stored pitch page by its own row");
}
{ // The admin and the CRM: the store's full read, once.
  const f = fakes();
  const L = loaderWith(f);
  await Promise.all([L.ensure(N("/admin/c/demoSites")), L.ensure(N("/admin")), L.ensure(N("/crm"))]);
  check(f.calls.load === 1 && f.calls.read.length === 0, "the admin reads everything through the store, once, and nothing through the visitor's reader");
  check(L.getSnapshot().all && L.getSnapshot().data.__full === true, "the full snapshot is what the admin sees");
  await L.ensure(N("/site/riverbend-public-school"));
  check(f.calls.read.length === 0, "after a full read nothing is read again on any route");
  await L.refresh(N("/admin"));
  check(f.calls.load === 2, "refresh on the admin reads everything again (the session after sign-in)");
}
{ // Local mode: everything from the store, whatever the address.
  const f = fakes();
  const L = loaderWith(f, true);
  await L.ensure(N("/"));
  check(f.calls.load === 1 && f.calls.read.length === 0 && L.getSnapshot().all, "local mode reads the store (seed plus this browser), as before");
}
{ // A save replaces everything; a failed read still ends loading.
  const f = fakes();
  const L = loaderWith(f);
  await L.ensure(N("/"));
  L.replaceFull(f.FULL);
  check(L.getSnapshot().all && L.getSnapshot().data.__full === true, "a save hands back the full snapshot and it wins");
  const bad = fakes(TABLE, { failRead: true });
  const B = loaderWith(bad);
  const warn = console.warn;
  let warned = 0;
  console.warn = () => warned++;
  await B.ensure(N("/about"));
  console.warn = warn;
  const s = B.getSnapshot();
  check(warned === 1 && s.pending === 0 && M.covers(s, N("/about")), "a failed read warns once and ends loading (the seed stays)");
  check(s.data.team.length === M.seed.team.length, "after a failed read the page shows the seed");
  await B.ensure(N("/about"));
  check(bad.calls.read.length === 1, "a failed read is not retried in a loop on every render");
}
{ // The deferred bodies are filled in and survive a later read.
  const f = fakes();
  const L = loaderWith(f);
  L.requestBodies();
  for (let i = 0; i < 50 && !L.getSnapshot().bodiesReady; i++) await new Promise((r) => setTimeout(r, 10));
  // Compared with the bodies file itself, so a post list being edited elsewhere (ids
  // changing before scripts/split-content.mjs has rerun) cannot make this lie.
  const bodies = await M.loadDeferredBodies();
  const posts = L.getSnapshot().data.posts;
  const expected = posts.filter((p) => bodies.posts[p.id]).length;
  const filled = posts.filter((p) => bodies.posts[p.id] && p.body === bodies.posts[p.id]).length;
  check(L.getSnapshot().bodiesReady && filled === expected, `blog bodies arrive from their own chunk (${filled} of the ${expected} posts that have one)`);
  await L.ensure(N("/privacy"));
  const legal = L.getSnapshot().data.legal;
  check(Object.values(legal).some((d) => d && d.body), "policy bodies are still filled after a later read");
}

/* ── 4b. The loader with the REAL reader, before and after 0013 ─────────── */
console.log("\n4b. the loader with the real reader, before and after 0013");
for (const functions of [true, false]) {
  const when = functions ? "after 0013" : "before 0013";
  { // A demo.
    const f = postgrest({ functions });
    const base = fakes();
    const L = new M.ContentLoader(base.store, M.createPublicReader());
    await withFetch(f, () => L.ensure(N("/site/Riverbend-Public-School/admissions")));
    const s = L.getSnapshot();
    check(base.calls.load === 0 && s.pending === 0 && M.covers(s, N("/site/riverbend-public-school")) && s.data.demoSites.length === 1 && s.data.demoSites[0].id === "d-sent",
      `${when}: /site/<slug> ends loading with that one demo, and no full read`);
    check(!tableCalls(f).some((e) => /demoSites|pitchPages/.test(e.q.get("collection") || "")), `${when}: no request asks for a whole collection of demos or pitch pages`);
    if (functions) check(!tableCalls(f).some(listsByLink) && fnCalls(f).length === 1, "after 0013: the table is never asked about a demo or a pitch page, the function once");
  }
  { // An unknown demo, and a draft.
    const f = postgrest({ functions });
    const L = new M.ContentLoader(fakes().store, M.createPublicReader());
    await withFetch(f, async () => {
      await L.ensure(N("/site/no-such-demo"));
      await L.ensure(N("/site/draft-academy"));
    });
    const s = L.getSnapshot();
    check(s.data.demoSites.length === 0 && s.pending === 0 && M.covers(s, N("/site/draft-academy")) && !f.log.some((e) => /has_rows/.test(e.path) || e.q.get("select") === "doc_id"),
      `${when}: an unknown demo and a draft end loading with no record (the page shows its 404), with no existence probe`);
  }
  { // Pitch pages: the seed's examples show only while no pitch page is live.
    const f = postgrest({ functions });
    const L = new M.ContentLoader(fakes().store, M.createPublicReader());
    await withFetch(f, () => L.ensure(N("/lakeside-academy")));
    check(L.getSnapshot().data.pitchPages.some((p) => p.slug === "lakeside-academy"), `${when}: the bare /<slug> opens the live pitch page from its own row`);
    await withFetch(f, () => L.ensure(N("/pitch/example-public-school")));
    check(!L.getSnapshot().data.pitchPages.some((p) => p.slug === "example-public-school"), `${when}: with a pitch page live, the seed's example stays hidden`);
    const g = postgrest({ functions, table: UNIT_TABLE.filter((r) => r.collection !== "pitchPages") });
    const G = new M.ContentLoader(fakes().store, M.createPublicReader());
    await withFetch(g, () => G.ensure(N("/pitch/example-public-school")));
    check(G.getSnapshot().data.pitchPages.some((p) => p.slug === "example-public-school")
      && (functions ? fnCalls(g).some((e) => e.path.endsWith("/public_has_rows")) : tableCalls(g).some((e) => e.q.get("select") === "doc_id")),
      `${when}: with none live, the seed's example opens (${functions ? "public_has_rows" : "the one-row probe"} said there is none)`);
  }
}

/* ── 5. Nothing else a visitor runs reads a demo or a pitch page ────────── */
console.log("\n5. nothing else a visitor runs reads a demo or a pitch page");
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}
const rel = (p) => p.slice(ROOT.length + 1).replace(/\\/g, "/");
const CODE = [...walk(SRC), ...walk(join(ROOT, "api"))].map((p) => ({ path: rel(p), text: readFileSync(p, "utf8") }));
const textOf = (path) => readFileSync(join(ROOT, path), "utf8");
const handBuilt = CODE.filter((c) => c.path.startsWith("src/") && /\/rest\/v1\b/.test(c.text)).map((c) => c.path).sort();
check(same(handBuilt, ["src/lib/cms/publicRead.ts", "src/lib/demo/opens.ts", "src/lib/leads.ts"]),
  `in the site, three modules build a Supabase URL by hand: the reader and two inserts (${handBuilt})`);
for (const path of ["src/lib/demo/opens.ts", "src/lib/leads.ts"]) {
  const t = textOf(path);
  check(/method: "POST"/.test(t) && /Prefer: "return=minimal"/.test(t) && !/\.json\(|select=/.test(t), `${path} only inserts (POST, return=minimal) and never reads a row back`);
}
// A call names the function in a string; comments that mention it do not count.
const asksFunctions = CODE.filter((c) => /["'`/]public_(row_by_slug|has_rows)\b/.test(c.text)).map((c) => c.path);
check(same(asksFunctions, ["src/lib/cms/publicRead.ts"]), `0013's two functions are asked by the reader alone (${asksFunctions})`);
const sdkContent = CODE.filter((c) => /TABLE = "content"|\.from\(["']content["']\)/.test(c.text)).map((c) => c.path);
check(same(sdkContent, ["src/lib/cms/supabaseStore.ts"]), `the SDK reads the content table in one place, the admin's and the CRM's store, with their login (${sdkContent})`);
const apiTouching = CODE.filter((c) => c.path.startsWith("api/") && /rest\/v1\/content|demoSites|pitchPages/.test(c.text)).map((c) => c.path);
check(!apiTouching.length, `no server function reads the content table, a demo or a pitch page (${apiTouching})`);
for (const path of ["api/share.js", "scripts/prerender-heads.mjs", "scripts/generate-sitemap.mjs"]) {
  check(!/rest\/v1|SUPABASE_URL|VITE_SUPABASE|createClient|@supabase/.test(textOf(path)), `${path} makes no Supabase request (the link card is built from the slug; the prerender and the sitemap from the seed)`);
}
const popup = CODE.filter((c) => c.path.startsWith("src/components/lead/") && /demoSites|pitchPages/.test(c.text)).map((c) => c.path);
check(!popup.length, `the lead pop-up reads no demo and no pitch page (${popup})`);
const readers = CODE.filter((c) => /useCollection\(["'](demoSites|pitchPages)["']\)/.test(c.text)).map((c) => c.path).sort();
check(same(readers, ["src/pages/DemoSiteRoute.tsx", "src/pages/Pitch.tsx", "src/pages/admin/AdminDemoPreview.tsx"]), `three pages read those collections (${readers})`);
check(N("/site/x/admissions").row?.collection === "demoSites" && N("/pitch/x").row?.collection === "pitchPages" && N("/x").row?.collection === "pitchPages" && N("/admin/preview/site/x").all,
  "...each on an address that reads its one row by link (the demo, the pitch page, the bare /<slug>) or everything with the admin's login (the preview)");

console.log(`\n${passes} passed, ${failures.length} failed`);
if (NEGATIVE) {
  const what = NEGATIVE_RPC ? "the reader before 0013 is back" : "the old whole-table demo read is back";
  console.log(failures.length ? `negative control: failures above are expected (${what})` : "NEGATIVE CONTROL DID NOT FAIL: the checks do not reach the code");
  process.exit(failures.length ? 0 : 1);
}
process.exit(failures.length ? 1 : 0);
