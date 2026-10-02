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
 *   4. the loader: a demo never triggers the full read, a later route reads only
 *      what it adds, a missing pitch row falls back to the seed only when anon
 *      sees no pitch rows at all, a failed read ends `loading`, a save replaces
 *      everything
 *
 * PROVING IT CAN FAIL:  CMS_SCOPE_NEGATIVE=1 node scripts/test-cms-scope.mjs
 * puts back the old rule (a demo reads the whole table). Section 4 must then fail.
 */
import { build } from "esbuild";
import { existsSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.CMS_SCOPE_NEGATIVE);

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
    if (NEGATIVE) {
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

console.log(`\n${passes} passed, ${failures.length} failed`);
if (NEGATIVE) {
  console.log(failures.length ? "negative control: failures above are expected (the old whole-table demo read is back)" : "NEGATIVE CONTROL DID NOT FAIL: the checks do not reach the code");
  process.exit(failures.length ? 0 : 1);
}
process.exit(failures.length ? 1 : 0);
