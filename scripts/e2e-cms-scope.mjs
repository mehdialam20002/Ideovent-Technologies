/**
 * The CMS in Supabase mode, end to end in a real browser, against a FAKE Supabase.
 *
 *   node scripts/e2e-cms-scope.mjs [baseUrl]
 *
 * With no baseUrl it builds the site with VITE_SUPABASE_URL=https://e2e-scope.supabase.co
 * and a made-up anon key into a temp folder, serves it on E2E_PORT (default 5199),
 * runs, and stops the server. With a baseUrl, that site must have been built with the
 * same two values. Every request to that host is answered inside the browser by a
 * small stand-in for PostgREST and Auth (below): no network, no live data, nothing
 * written anywhere real. The records in it are fictional, like every test record.
 *
 * What it proves (2 Oct 2026, the per-route read in src/lib/cms/scope.ts):
 *   1. a public page makes ONE content request, with no preflight and without the
 *      Supabase SDK chunk, and asks for no demo and no pitch page
 *   2. a link to another page reads only what that page adds
 *   3. a demo reads its own row (not every demo), renders, and records one open
 *   4. an unknown demo, a draft and an unknown /<slug> show the 404 page
 *   5. a pitch page reads its own row; the seeded example opens only while no
 *      pitch page is stored, as the full read decided
 *   6. the admin, signed in, still reads everything with its session, a save is
 *      written and read back, and the visitor's page then shows the saved text
 *   7. the CRM still reads everything
 *
 * Sections 3 to 5 run twice (supabase/migrations/0013, a demo or a pitch page by
 * its link only): once against a database where 0013 has run (the row comes from
 * public_row_by_slug, and the table lists no demo and no pitch page to a visitor;
 * the network log must then hold no request for a whole collection of either),
 * and once against one where it has not (the function is a 404, PGRST202, and the
 * page reads the row as it did before).
 *
 * E2E_PORT picks the preview's port; E2E_CACHE_DIR puts Vite's cache somewhere
 * other than node_modules/.vite (on a machine where node_modules is shared). A
 * request to any other Supabase host is refused and fails the run: nothing here
 * may ever reach a real project.
 *
 * PROVING IT CAN FAIL: build main as it was on 1 Oct 2026 (373ae22) with the same
 * two values and point this at it. Sections 1, 3 and 5 must fail. Built from the
 * branch before 0013 (493c473), the "0013 run" passes of sections 3 and 5 must fail.
 * The same without a second checkout: E2E_NEGATIVE=rpc builds this tree with the
 * reader as it was before 0013 (src/lib/cms/publicRead.ts sure from the start that
 * the functions are missing, so every demo and pitch row comes from the table). The
 * "0013 run" passes of sections 3 to 5, the network-log check and the check that the
 * function is asked first must then fail, and the run exits 1.
 */
import { chromium } from "playwright-core";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const FAKE_URL = "https://e2e-scope.supabase.co";
const FAKE_KEY = "e2e-scope-anon-key";
const PORT = Number(process.env.E2E_PORT || 5199);
const CACHE_DIR = process.env.E2E_CACHE_DIR || undefined;
const NEGATIVE = process.env.E2E_NEGATIVE || "";
if (NEGATIVE && NEGATIVE !== "rpc") throw new Error(`E2E_NEGATIVE=${NEGATIVE}: the only negative control is rpc`);

/* E2E_NEGATIVE=rpc: the reader before 0013, put in at build time (the files on disk are not touched). */
const READER_MEMORY = 'let functions: "unknown" | "present" | "missing" = "unknown";';
let readerReplaced = false;
const readerBefore0013 = {
  name: "e2e-negative-reader-before-0013",
  enforce: "pre",
  transform(code, id) {
    if (!/[\\/]src[\\/]lib[\\/]cms[\\/]publicRead\.ts$/.test(id.split("?")[0])) return null;
    if (!code.includes(READER_MEMORY)) throw new Error("negative control: the reader's memory line was not found in publicRead.ts");
    readerReplaced = true;
    return code.replace(READER_MEMORY, READER_MEMORY.replace('= "unknown"', '= "missing"'));
  },
};

let BASE = (process.argv.slice(2).find((a) => /^https?:\/\//.test(a)) || "").replace(/\/$/, "");
if (BASE && NEGATIVE) throw new Error("E2E_NEGATIVE builds the site itself: give no baseUrl with it");
let stopServer = async () => {};
if (!BASE) {
  process.env.VITE_SUPABASE_URL = FAKE_URL;
  process.env.VITE_SUPABASE_ANON_KEY = FAKE_KEY;
  const { build, preview } = await import("vite");
  const outDir = mkdtempSync(join(tmpdir(), "ideovent-e2e-cms-scope-"));
  console.log(`building with the fake Supabase into ${outDir}${NEGATIVE ? " (negative control: the reader before 0013)" : ""}`);
  await build({ root: ROOT, cacheDir: CACHE_DIR, logLevel: "warn", plugins: NEGATIVE ? [readerBefore0013] : [], build: { outDir, emptyOutDir: true } });
  if (NEGATIVE && !readerReplaced) throw new Error("negative control: the build never passed src/lib/cms/publicRead.ts through the replacement");
  const server = await preview({ root: ROOT, cacheDir: CACHE_DIR, logLevel: "warn", build: { outDir }, preview: { port: PORT, strictPort: true, host: "127.0.0.1" } });
  BASE = `http://127.0.0.1:${PORT}`;
  stopServer = async () => {
    await new Promise((r) => server.httpServer.close(r));
    rmSync(outDir, { recursive: true, force: true });
  };
}

const fails = [];
const ok = (cond, msg) => {
  console.log((cond ? "ok    " : "FAIL  ") + msg);
  if (!cond) fails.push(msg);
};

/* ── The fake database: fictional records only ───────────────────────────── */
const DEMO = {
  id: "e2e-scope-demo", slug: "riverbend-public-school", instituteName: "Riverbend Public School",
  internalName: "e2e scope subject", kind: "school", market: "india", city: "New Delhi", status: "sent",
};
const DRAFT = { ...DEMO, id: "e2e-scope-draft", slug: "riverbend-draft", status: "draft" };
const FAQ_A = { id: "e2e-faq-a", question: "E2E question one?", answer: "First fictional answer.", category: "general", order: 0 };
const FAQ_B = { id: "e2e-faq-b", question: "E2E question two?", answer: "Second fictional answer.", category: "general", order: 1 };
function freshTable() {
  return [
    { collection: "home", doc_id: "_", data: { badge: "E2E stored badge" } },
    { collection: "faqs", doc_id: FAQ_A.id, data: FAQ_A },
    { collection: "faqs", doc_id: FAQ_B.id, data: FAQ_B },
    { collection: "demoSites", doc_id: DEMO.id, data: DEMO },
    { collection: "demoSites", doc_id: DRAFT.id, data: DRAFT },
    { collection: "demoSiteSlots", doc_id: DEMO.id, data: { id: DEMO.id, sentTo: "Mrs Example" } },
  ];
}
let TABLE = freshTable();

/* ── A stand-in for PostgREST and Auth, answered inside the browser ──────── */
const ADMIN_EMAIL = "e2e-admin@example.com";
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 3600;
const ADMIN_JWT = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "e2e-admin", email: ADMIN_EMAIL, role: "authenticated", aud: "authenticated", exp: EXP })}.e2e`;
const USER = { id: "e2e-admin", aud: "authenticated", role: "authenticated", email: ADMIN_EMAIL, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-10-02T00:00:00Z" };
const SESSION = { access_token: ADMIN_JWT, token_type: "bearer", expires_in: 3600, expires_at: EXP, refresh_token: "e2e-refresh", user: USER };
/* /admin is owner-only (ProtectedRoute's OwnerOnly asks crm_me). The admin's session is Mehdi's, so crm_me answers as SETUP_ALL.sql does for the owner. */
const OWNER_ME = { memberId: "e2e-owner", role: "owner", email: ADMIN_EMAIL, displayName: "E2e-admin", viewAll: true, canAddLeads: true, mayColdCall: true, waDailyLimit: null, newLeadCap: 1000, targets: {}, senderChecked: true, mustChangePassword: false };
const PRIVATE = ["submissions", "applications", "certificateGrades", "pitchPageNotes", "demoSiteSlots", "demoSiteOpens"];
const CORS = {
  "access-control-allow-origin": "*", "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "Content-Range",
};
let LOG = [];
/** Requests to a Supabase host that is not the fake one: refused, and none may happen. */
const STRAY = [];
/** Every visitor's page opened while 0013 is in, with its requests (the "no list" check). */
const VISITS_0013 = [];
/** Whether supabase/migrations/0013 has run on the fake database. Sections 3 to 5 run both ways. */
let RPC = true;
const BY_LINK = ["demoSites", "pitchPages"];

function visible(row, admin) {
  if (admin) return true;
  if (PRIVATE.includes(row.collection)) return false;
  // 0013: a visitor lists no demo and no pitch page at all. Before it, 0005's status rule.
  if (RPC && BY_LINK.includes(row.collection)) return false;
  if (row.collection === "pitchPages" && row.data?.status !== "live") return false;
  if (row.collection === "demoSites" && row.data?.status !== "sent") return false;
  return true;
}
/** 0013's two functions, as the SQL writes them: one sent demo or live pitch page by slug, or whether any exists. */
function callFunction(fn, q) {
  const col = q.get("p_collection");
  const open = (r) => (r.collection === "demoSites" && r.data?.status === "sent") || (r.collection === "pitchPages" && r.data?.status === "live");
  const mine = (r) => BY_LINK.includes(col) && r.collection === col && open(r);
  if (fn === "public_has_rows") return TABLE.some(mine);
  const slug = (q.get("p_slug") || "").trim().toLowerCase();
  if (!slug || slug.length > 120) return [];
  return TABLE.filter((r) => mine(r) && String(r.data?.slug || "").trim().toLowerCase() === slug)
    .slice(0, 1)
    .map(({ collection, doc_id, data }) => ({ collection, doc_id, data }));
}
/** Split a PostgREST term list on the commas at depth 0 (outside parentheses and quotes). */
function splitTop(s) {
  const out = [];
  let depth = 0, cur = "", quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted && c === "\\") { cur += c + s[++i]; continue; }
    if (c === '"') quoted = !quoted;
    if (!quoted && c === "(") depth++;
    if (!quoted && c === ")") depth--;
    if (!quoted && depth === 0 && c === ",") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}
const unquote = (v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\(.)/g, "$1") : v);
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function likeToRegex(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") re += reEscape(pattern[++i] || "");
    else if (c === "%" || c === "*") re += ".*";
    else if (c === "_") re += ".";
    else re += reEscape(c);
  }
  return new RegExp(`^${re}$`, "i");
}
function termMatch(term, row) {
  if (term.startsWith("and(")) return splitTop(term.slice(4, -1)).every((t) => termMatch(t, row));
  if (term.startsWith("or(")) return splitTop(term.slice(3, -1)).some((t) => termMatch(t, row));
  const m = /^(collection|doc_id|data->>slug)\.(not\.)?(in|eq|ilike)\.(.*)$/s.exec(term);
  if (!m) throw new Error(`fake PostgREST cannot parse: ${term}`);
  const actual = m[1] === "data->>slug" ? String(row.data?.slug ?? "") : String(row[m[1]] ?? "");
  let hit;
  if (m[3] === "in") hit = m[4].replace(/^\(|\)$/g, "").split(",").map(unquote).includes(actual);
  else if (m[3] === "eq") hit = actual === unquote(m[4]);
  else hit = likeToRegex(unquote(m[4])).test(actual);
  return m[2] ? !hit : hit;
}
function selectRows(q, admin) {
  const terms = [];
  for (const [k, v] of q) {
    if (k === "or") terms.push(`or${v}`);
    else if (["collection", "doc_id"].includes(k)) terms.push(`${k}.${v}`);
  }
  let rows = TABLE.filter((r) => visible(r, admin) && terms.every((t) => termMatch(t, r)));
  rows.sort((a, b) => a.collection.localeCompare(b.collection) || a.doc_id.localeCompare(b.doc_id));
  const offset = Number(q.get("offset") || 0);
  const limit = q.has("limit") ? Number(q.get("limit")) : rows.length;
  rows = rows.slice(offset, offset + limit);
  const cols = (q.get("select") || "*").split(",").map((s) => s.trim());
  return rows.map((r) => (cols.includes("*") ? r : Object.fromEntries(cols.map((c) => [c, r[c]]))));
}

async function fakeSupabase(route) {
  const req = route.request();
  const url = new URL(req.url());
  const h = req.headers();
  const json = (status, body) => route.fulfill({ status, headers: { ...CORS, "content-type": "application/json" }, body: body === undefined ? "" : JSON.stringify(body) });
  const entry = { method: req.method(), path: url.pathname, q: url.searchParams, headers: h, at: Date.now() };
  LOG.push(entry);
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  if (url.pathname.startsWith("/auth/v1/")) {
    if (url.pathname.endsWith("/token")) return json(200, SESSION);
    if (url.pathname.endsWith("/user")) return json(200, USER);
    return json(200, {});
  }
  if (!url.pathname.startsWith("/rest/v1/")) return json(200, []);
  const key = url.searchParams.get("apikey") || h.apikey;
  if (key !== FAKE_KEY) return json(401, { message: "Invalid API key" });
  const auth = h.authorization || "";
  const admin = auth === `Bearer ${ADMIN_JWT}`;
  entry.admin = admin;
  if (url.pathname === "/rest/v1/rpc/crm_me") return json(200, admin ? OWNER_ME : { role: null, reason: "signed_out" });
  if (url.pathname === "/rest/v1/rpc/public_row_by_slug" || url.pathname === "/rest/v1/rpc/public_has_rows") {
    const fn = url.pathname.slice("/rest/v1/rpc/".length);
    if (!RPC) {
      const args = [...url.searchParams.keys()].filter((k) => k !== "apikey").sort().join(", ");
      return json(404, { code: "PGRST202", details: null, hint: null, message: `Could not find the function public.${fn}(${args}) in the schema cache` });
    }
    if (req.method() !== "GET" && req.method() !== "POST") return json(405, {});
    return json(200, callFunction(fn, url.searchParams));
  }
  if (url.pathname !== "/rest/v1/content") return req.method() === "GET" ? json(200, []) : json(201, []);
  if (req.method() === "GET") {
    try {
      return json(200, selectRows(url.searchParams, admin));
    } catch (e) {
      entry.error = String(e);
      return json(400, { message: String(e) });
    }
  }
  if (req.method() === "POST") {
    const body = JSON.parse(req.postData() || "[]");
    const rows = Array.isArray(body) ? body : [body];
    const upsert = /merge-duplicates/.test(h.prefer || "");
    for (const row of rows) {
      if (!admin && !["submissions", "applications", "demoSiteOpens"].includes(row.collection)) return json(403, { message: "rls" });
      if (!admin && upsert) return json(403, { message: "rls (anon cannot update)" });
      const i = TABLE.findIndex((r) => r.collection === row.collection && r.doc_id === row.doc_id);
      if (i >= 0 && !upsert) return json(409, { message: "duplicate" });
      if (i >= 0) TABLE[i] = row;
      else TABLE.push(row);
    }
    entry.wrote = rows.map((r) => `${r.collection}:${r.doc_id}`);
    return json(201, []);
  }
  if (req.method() === "DELETE") {
    if (!admin) return json(403, { message: "rls" });
    TABLE = TABLE.filter((r) => !(termMatch(`collection.${url.searchParams.get("collection")}`, r) && termMatch(`doc_id.${url.searchParams.get("doc_id")}`, r)));
    return json(204);
  }
  return json(405, {});
}

/* ── The browser ─────────────────────────────────────────────────────────── */
const browser = await chromium.launch({ executablePath: String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`, headless: true });

/** A fresh visitor (or, with admin, a browser holding the admin's session). */
async function open(path, { admin = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const scripts = [];
  const errors = [];
  page.on("request", (r) => { if (r.resourceType() === "script") scripts.push(r.url()); });
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  // The fake answers its own host; any other Supabase host is refused, and the run fails below.
  await page.route(/supabase\.(co|in)\b/, (route) => {
    const url = route.request().url();
    if (new URL(url).host === new URL(FAKE_URL).host) return fakeSupabase(route);
    STRAY.push(url);
    return route.abort();
  });
  await page.route(/emailjs|fonts\.g(oogleapis|static)\.com/, (r) => r.abort());
  if (admin) {
    await page.addInitScript(([k, s]) => localStorage.setItem(k, s), ["sb-e2e-scope-auth-token", JSON.stringify(SESSION)]);
  }
  LOG = [];
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  if (RPC && !admin) VISITS_0013.push({ path, log: LOG });
  return { ctx, page, scripts, errors };
}
const contentGets = () => LOG.filter((e) => e.method === "GET" && e.path === "/rest/v1/content");
const functionGets = (fn) => LOG.filter((e) => e.method === "GET" && e.path === `/rest/v1/rpc/${fn}`);
/** A request for a whole collection of demos or pitch pages, or for one of them from the table. */
const listsByLink = (e) => e.method === "GET" && e.path === "/rest/v1/content" && /demoSites|pitchPages/.test(asked(e));
const sdkLoaded = (scripts) => scripts.some((u) => /supabase/i.test(u.split("/").pop() || ""));
const asked = (e) => `${e.q.get("collection") || ""} ${e.q.get("or") || ""}`;
const realErrors = (errs) => errs.filter((e) => !/favicon|ERR_FAILED|ERR_BLOCKED|ERR_ABORTED|Failed to load resource|React DevTools/i.test(e));
const notFound = async (page) => {
  await page.waitForFunction(() => /not found/i.test(document.title), null, { timeout: 10000 }).catch(() => {});
  return /not found/i.test(await page.title());
};
/** Waits (up to 10 s) for the text to be on the page, so a slow lazy chunk is not read as a miss. */
const shows = async (page, text) => {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: "attached", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
};

/* 1. A visitor's page: one request, no preflight, no SDK, nothing private ── */
console.log("\n1. a visitor's page");
for (const path of ["/", "/about", "/pricing", "/services/seo", "/blog", "/websites", "/websites/dental-clinic"]) {
  const { ctx, scripts, errors } = await open(path);
  const gets = contentGets();
  const g = gets[0];
  ok(gets.length === 1, `${path}: one content request (${gets.length})`);
  ok(g && g.q.get("apikey") === FAKE_KEY && !g.headers.apikey && !g.headers.authorization, `${path}: the key is in the query and no custom header is sent, so there is no preflight`);
  ok(g && !/demoSites|pitchPages|submissions|applications/.test(asked(g)), `${path}: asks for no demo, no pitch page, nothing private`);
  ok(!sdkLoaded(scripts), `${path}: the Supabase SDK chunk is not downloaded`);
  ok(realErrors(errors).length === 0, `${path}: no console errors ${realErrors(errors).slice(0, 2).join(" | ")}`);
  await ctx.close();
}

/* 2. A link to another page reads only what that page adds ──────────────── */
console.log("\n2. moving between pages");
{
  const { ctx, page } = await open("/");
  const before = contentGets().length;
  const clicked = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href="/about"]')][0];
    if (a) a.click();
    return Boolean(a);
  });
  ok(clicked, "the homepage links to /about (the link is clicked, not typed)");
  if (clicked) {
    await page.waitForURL("**/about");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    const gets = contentGets();
    ok(before === 1 && gets.length === 2, `/ then a link to /about: two requests in all (${gets.length})`);
    ok(gets[1] && gets[1].q.get("collection") === "in.(milestones,stats,team)", `the second asks only for what /about adds (${gets[1] && asked(gets[1])})`);
  }
  await ctx.close();
}

/* 3 to 5. A demo and a pitch page, each its own row: with 0013 run, then before it ── */
// The stored live pitch page of section 5: a copy of the seeded example under another (fictional) name.
const LAKESIDE = await (async () => {
  const { build: esbuild } = await import("esbuild");
  const { existsSync } = await import("node:fs");
  const SRC = join(ROOT, "src");
  const tsPath = (b) => [".ts", ".tsx", "/index.ts", ""].map((e) => b + e).find((p) => existsSync(p) && /\.[jt]sx?$|\.json$/.test(p)) || b;
  const out = await esbuild({
    stdin: { contents: `export { seed } from "@/lib/cms/seed";`, resolveDir: ROOT, loader: "ts" },
    bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
    plugins: [{ name: "alias", setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: tsPath(join(SRC, a.path.slice(2))) })); } }],
    define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
  });
  const { seed } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
  const example = seed.pitchPages.find((p) => p.slug === "example-public-school");
  return { ...example, id: "e2e-pp-lakeside", slug: "lakeside-academy", instituteName: "Lakeside Academy", status: "live" };
})();

for (const rpc of [true, false]) {
  RPC = rpc;
  TABLE = freshTable();
  const tag = rpc ? "0013 run: public_row_by_slug" : "before 0013: the function is a 404, the read as before";

  console.log(`\n3. a demo (${tag})`);
  {
    const { ctx, page, scripts, errors } = await open("/site/riverbend-public-school");
    const gets = contentGets();
    const fns = functionGets("public_row_by_slug");
    if (rpc) {
      ok(gets.length === 1 && gets[0].q.get("collection") === "in.(contact,settings,socials)", `the table is asked for the three <Seo> keys only (${gets.map(asked).join(" | ")})`);
      ok(fns.length === 1 && fns[0].q.get("p_collection") === "demoSites" && fns[0].q.get("p_slug") === "riverbend-public-school",
        `the demo's own row is asked of public_row_by_slug, by its slug (${fns.length})`);
      ok([...gets, ...fns].every((g) => g.q.get("apikey") === FAKE_KEY && !g.headers.apikey && !g.headers.authorization), "both carry the key in the query and no custom header (no preflight)");
    } else {
      ok(fns.length === 1 && gets.some((g) => /and\(collection\.eq\.demoSites,data->>slug\.ilike\.riverbend-public-school\)/.test(g.q.get("or") || "")),
        `the function answers 404, and the demo's own row is read as before 0013, by its slug (${gets.map(asked).join(" | ")})`);
    }
    ok(gets.every((g) => !/^(eq\.demoSites|in\.\(.*demoSites.*\))$/.test(g.q.get("collection") || "")), "it never asks for every demo");
    ok(await shows(page, "Riverbend Public School"), "the demo renders under the institute's name");
    const opens = LOG.filter((e) => e.method === "POST" && (e.wrote || []).some((w) => w.startsWith("demoSiteOpens:")));
    ok(opens.length === 1, `the open is recorded once (${opens.length})`);
    ok(!sdkLoaded(scripts), "the Supabase SDK chunk is not downloaded on a demo");
    ok(realErrors(errors).length === 0, `no console errors on the demo ${realErrors(errors).slice(0, 2).join(" | ")}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open("/site/RIVERBEND-PUBLIC-SCHOOL");
    ok(await shows(page, "Riverbend Public School"), "the slug matches case-insensitively, as resolveDemoSite does");
    await ctx.close();
  }

  console.log(`\n4. what must 404 (${tag})`);
  for (const path of ["/site/no-such-demo", "/site/riverbend-draft", "/no-such-page-e2e"]) {
    const { ctx, page } = await open(path);
    const opens = LOG.filter((e) => e.method === "POST");
    ok((await notFound(page)) && opens.length === 0, `${path}: the 404 page, and nothing recorded`);
    await ctx.close();
  }

  console.log(`\n5. pitch pages (${tag})`);
  {
    const { ctx, page } = await open("/pitch/example-public-school");
    const gets = contentGets();
    const ownRow = rpc
      ? functionGets("public_row_by_slug").some((g) => g.q.get("p_collection") === "pitchPages" && g.q.get("p_slug") === "example-public-school")
      : gets.some((g) => /pitchPages/.test(asked(g)) && /slug\.ilike\.example-public-school/.test(asked(g)));
    const probe = rpc ? functionGets("public_has_rows").find((g) => g.q.get("p_collection") === "pitchPages") : gets.find((g) => g.q.get("select") === "doc_id");
    ok(ownRow, "the pitch page asks for its own row");
    const seen = await shows(page, "Example Public School");
    ok(!!probe && seen, `no stored pitch pages: one probe (${rpc ? "public_has_rows" : "the table"}), and the seeded example opens (probe ${!!probe}, page ${seen ? "shows it" : `title "${await page.title()}"`})`);
    await ctx.close();
  }
  {
    TABLE.push({ collection: "pitchPages", doc_id: LAKESIDE.id, data: LAKESIDE });
    const a = await open("/pitch/example-public-school");
    ok(await notFound(a.page), "with a pitch page stored, the seeded example is gone (the full read's rule)");
    await a.ctx.close();
    const b = await open("/lakeside-academy");
    const probes = [...contentGets().filter((g) => g.q.get("select") === "doc_id"), ...functionGets("public_has_rows")];
    ok((await shows(b.page, "Lakeside Academy")) && !probes.length, "the bare /<slug> opens the stored pitch page from its own row, with no probe");
    await b.ctx.close();
    TABLE = freshTable();
  }
}
RPC = true;

console.log("\n3 to 5. the network log, with 0013 run");
{
  const lists = VISITS_0013.flatMap((v) => v.log.filter(listsByLink).map((e) => `${v.path}: ${asked(e)}`));
  ok(VISITS_0013.length >= 15 && !lists.length,
    `${VISITS_0013.length} visitor pages, and not one request lists a whole collection of demos or pitch pages, or reads one from the table (${lists.slice(0, 3).join(" | ")})`);
  const fnCalls = VISITS_0013.flatMap((v) => v.log.filter((e) => e.path.startsWith("/rest/v1/rpc/public_")));
  ok(fnCalls.length >= 6 && fnCalls.every((e) => e.method === "GET" && e.q.get("apikey") === FAKE_KEY && !e.headers.authorization),
    `each demo or pitch-page row came from 0013's functions, by a GET with the key in the query (${fnCalls.length} calls)`);
}

/* 6. The admin, signed in ───────────────────────────────────────────────── */
console.log("\n6. the admin");
{
  const { ctx, page, errors } = await open("/admin/c/faqs", { admin: true });
  const full = contentGets().filter((g) => g.admin);
  ok(full.length >= 1 && full.every((g) => !g.q.get("collection") && !g.q.get("or")), `the admin reads the whole table with its session (${full.length} reads)`);
  const edit = page.getByRole("button", { name: "Edit E2E question one?" });
  ok((await edit.count()) === 1, "the stored FAQ is listed in the admin");
  if (await edit.count()) {
    await edit.click();
    // By its id (AdminField: "<react id>-<field>"): getByLabel("Question") also matches the
    // row buttons whose aria-label holds the question, and the first of those is disabled.
    await page.locator('input[id$="-question"]').fill("E2E question one, edited?");
    await page.getByRole("button", { name: /^save$/i }).click();
    await page.waitForTimeout(800);
    const wrote = LOG.filter((e) => e.method === "POST" && e.admin && (e.wrote || []).includes(`faqs:${FAQ_A.id}`));
    ok(wrote.length === 1, "Save writes the FAQ through the SDK as the admin");
    ok(await shows(page, "E2E question one, edited?"), "the admin list shows the saved text (read back after the save)");
  }
  ok(realErrors(errors).length === 0, `no console errors in the admin ${realErrors(errors).slice(0, 2).join(" | ")}`);
  await ctx.close();
  const v = await open("/faq");
  ok(await shows(v.page, "E2E question one, edited?"), "a visitor's /faq shows the saved text");
  await v.ctx.close();
}

/* 7. The CRM ────────────────────────────────────────────────────────────── */
console.log("\n7. the CRM");
{
  const { ctx, page, errors } = await open("/crm", { admin: true });
  const full = contentGets().filter((g) => g.admin);
  ok(full.length >= 1 && full.every((g) => !g.q.get("collection") && !g.q.get("or")), `the CRM reads the whole table with its session (${full.length} reads)`);
  ok(!(await notFound(page)) && realErrors(errors).length === 0, `the CRM opens without errors ${realErrors(errors).slice(0, 2).join(" | ")}`);
  await ctx.close();
}

ok(!STRAY.length, `no request went to a Supabase host other than the fake one (${STRAY.slice(0, 2).join(" | ")})`);

await browser.close();
await stopServer();
console.log(fails.length ? `\n${fails.length} FAILURE(S)${NEGATIVE ? " (negative control: the reader before 0013; failures are expected)" : ""}` : "\nevery per-route read check passes");
if (NEGATIVE && !fails.length) console.log("NEGATIVE CONTROL DID NOT FAIL: the checks do not reach the reader");
process.exit(fails.length ? 1 : 0);
