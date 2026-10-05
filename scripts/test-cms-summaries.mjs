/**
 * THE CRM'S CONTENT READ (crm-fixes-1004 item 8, 4 Oct 2026).
 *
 *   node scripts/test-cms-summaries.mjs
 *
 * The live test found every CRM load reading the whole content table twice (380 rows, about 9 MB of JSON each,
 * 8.4 MB of it 172 whole demo sites). Bundles the real src/lib/cms/supabaseStore.ts, loader.ts and demoSummary.ts
 * and src/admin/outreach/demoActions.ts with esbuild, and drives the store with a fake Supabase client that keeps
 * the rows and answers PostgREST's JSON-path selects ("slug:data->>slug"):
 *
 *   1. on the CRM host (summaries on) a load reads every row but the demos whole, and the demos as summaries:
 *      the demos' `data` is never selected, a summary carries what the lists read and nothing heavy;
 *   2. on the admin (summaries off) a load is exactly as before: one read of every row, whole;
 *   3. a summary is never written: saveDoc refuses it before any request, reorder refuses demos;
 *   4. loadDemo reads ONE row by its doc_id; the snapshots then carry that whole record while the database says the
 *      same updatedAt, and the new summary once another tab saved it; a demo saved here stays whole;
 *   5. Mark sent (demoActions markDemoSent) on a summary reads the whole demo first and writes it whole, the
 *      template's contents kept; without a way to read it, it writes nothing;
 *   6. the loader: a refresh that comes while the page's own full read is on its way (started under 2 s ago) waits
 *      for it instead of starting a second one; later, or after it, a refresh reads again; loadDemo puts the whole
 *      record in the snapshot in its summary's place.
 *
 * NEGATIVE: CMS_SUMMARIES_NEGATIVE=1 puts back the read before 4 Oct 2026 (no summaries, no guard, no join). The
 * checks tagged 1, 3, 5 and 6 must then fail; the run exits 0 only when each of them did.
 */
import { build } from "esbuild";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.CMS_SUMMARIES_NEGATIVE);

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}
function patch(src, from, to, what) {
  if (!src.includes(from)) throw new Error(`negative mode: ${what} not found`);
  return src.replace(from, to);
}

const plugin = {
  name: "alias",
  setup(b) {
    // The Supabase client is the test's fake (globalThis.__fakeSupabase), never the SDK.
    b.onResolve({ filter: /^(\.\/client|@\/lib\/cms\/client)$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export function supabase() { return globalThis.__fakeSupabase(); }", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (!NEGATIVE) return;
    b.onLoad({ filter: /cms[\\/]supabaseStore\.ts$/ }, (args) => {
      let src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
      src = patch(src, "    if (this.summaries) {\n      try {\n        this.cache = await this.loadWithSummaries();", "    if (false) {\n      try {\n        this.cache = await this.loadWithSummaries();", "load()'s summary branch");
      src = patch(src, "    if (isDemoSummary(doc)) throw new Error(", "    if (false) throw new Error(", "saveDoc's summary guard");
      return { contents: src, loader: "ts" };
    });
    b.onLoad({ filter: /cms[\\/]loader\.ts$/ }, (args) => {
      const src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
      return { contents: patch(src, "      if (this.fullInFlight && Date.now() - this.fullStartedAt <= JOIN_FULL_READ_MS) {", "      if (false) {", "refresh()'s join"), loader: "ts" };
    });
    b.onLoad({ filter: /outreach[\\/]demoActions\.ts$/ }, (args) => {
      const src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
      return {
        contents: patch(src, "  const demo = isDemoSummary(given) ? (loadDemo ? await loadDemo(given.id) : null) : given;\n  if (!demo || isDemoSummary(demo)) throw new Error(",
          "  const demo = given;\n  if (!demo) throw new Error(", "markDemoSent's whole-record read"),
        loader: "ts",
      };
    });
  },
};

const out = join(tmpdir(), `ideovent-test-cms-summaries-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: [
      `export { SupabaseStore } from "@/lib/cms/supabaseStore";`,
      `export { ContentLoader, JOIN_FULL_READ_MS } from "@/lib/cms/loader";`,
      `export * from "@/lib/cms/demoSummary";`,
      `export { markDemoSent } from "@/admin/outreach/demoActions";`,
      `export { needsFor } from "@/lib/cms/scope";`,
    ].join("\n"),
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [plugin],
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/* ── Plumbing ────────────────────────────────────────────────────────────── */

let passes = 0;
const failures = [];
function check(ok, message, got, tag) {
  if (ok) passes++;
  else {
    failures.push({ message, tag });
    console.log(`FAIL  ${message}${got !== undefined ? `\n        got: ${String(typeof got === "string" ? got : JSON.stringify(got)).slice(0, 500)}` : ""}`);
  }
}
async function throws(fn) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

/* ── A fake Supabase: the rows, and PostgREST's select with JSON paths ───── */

const db = { rows: [] };
const calls = [];
const pick = (row, cols) => {
  const out = {};
  for (const raw of cols.split(",").map((c) => c.trim()).filter(Boolean)) {
    const m = /^(?:([\w]+):)?(\w+)(?:(->>|->)(\w+))?$/.exec(raw);
    if (!m) throw new Error(`fake PostgREST: cannot read the column ${raw}`);
    const [, alias, col, arrow, key] = m;
    let v = row[col];
    if (arrow) {
      v = v && typeof v === "object" ? v[key] : undefined;
      if (v === undefined) v = null;
      else if (arrow === "->>" && v !== null && typeof v !== "string") v = JSON.stringify(v);
    }
    out[alias || (key ?? col)] = v;
  }
  return out;
};
class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.cols = "*";
  }
  select(cols) {
    this.cols = cols;
    return this;
  }
  eq(c, v) {
    this.filters.push((r) => r[c] === v);
    this.eqs = [...(this.eqs || []), [c, v]];
    return this;
  }
  neq(c, v) {
    this.filters.push((r) => r[c] !== v);
    this.neqs = [...(this.neqs || []), [c, v]];
    return this;
  }
  order() {
    return this;
  }
  match(o) {
    this.filters.push((r) => Object.entries(o).every(([k, v]) => r[k] === v));
    return this;
  }
  rows() {
    return db.rows.filter((r) => this.filters.every((f) => f(r)));
  }
  log(kind) {
    calls.push({ kind, cols: this.cols, eq: this.eqs || [], neq: this.neqs || [] });
  }
  range(a, b) {
    this.log("select");
    return Promise.resolve({ data: this.rows().slice(a, b + 1).map((r) => pick(r, this.cols)), error: null });
  }
  maybeSingle() {
    this.log("single");
    const r = this.rows()[0];
    return Promise.resolve({ data: r ? pick(r, this.cols) : null, error: null });
  }
  upsert(row) {
    const list = Array.isArray(row) ? row : [row];
    for (const x of list) {
      calls.push({ kind: "upsert", collection: x.collection, doc_id: x.doc_id, data: x.data });
      const i = db.rows.findIndex((r) => r.collection === x.collection && r.doc_id === x.doc_id);
      if (i >= 0) db.rows[i] = { ...x };
      else db.rows.push({ ...x });
    }
    return Promise.resolve({ error: null });
  }
  delete() {
    return this;
  }
}
globalThis.__fakeSupabase = () => ({ from: (t) => new Query(t) });

const heavy = () => ({ results: Array.from({ length: 30 }, (_, i) => ({ name: `Topper ${i}`, score: "99%" })), gallery: [{ src: "/demo/img/a.jpg" }], about: "x".repeat(2000) });
const demo = (id, o = {}) => ({
  id, slug: `example-${id}`, status: "sent", kind: "coaching", instituteName: `Example ${id}`, city: "Patna", templateId: "c2-rural-tuition",
  contact: { phone: "+919000000001" }, preparedOn: "2026-09-28", updatedAt: "2026-10-01T10:00:00.000Z", ...heavy(), ...o,
});
/** The demoSites row of a demo (a slot has the same doc_id). */
const demoRow = (id) => db.rows.find((r) => r.collection === "demoSites" && r.doc_id === id);
function seedDb() {
  db.rows = [
    { collection: "settings", doc_id: "_", data: { siteName: "Ideovent" } },
    { collection: "demoSiteOpens", doc_id: "dso_1", data: { id: "dso_1", demoId: "d1", at: "2026-10-02T10:00:00.000Z" } },
    { collection: "demoSiteSlots", doc_id: "d1", data: { id: "d1", sentTo: "" } },
    { collection: "demoSites", doc_id: "d1", data: demo("d1") },
    { collection: "demoSites", doc_id: "d2", data: demo("d2", { status: "draft", isExample: false }) },
  ];
  calls.length = 0;
}

/* ── 1. The CRM host: summaries ──────────────────────────────────────────── */

seedDb();
const crm = new M.SupabaseStore();
crm.useDemoSummaries();
let snap = await crm.load();
const selects = calls.filter((c) => c.kind === "select");
const demoRead = selects.find((c) => c.eq.some(([c1, v]) => c1 === "collection" && v === "demoSites"));
const restRead = selects.find((c) => c.neq.some(([c1, v]) => c1 === "collection" && v === "demoSites"));
check(Boolean(demoRead) && demoRead.cols === M.DEMO_SUMMARY_SELECT && !/(^|,)\s*data\s*(,|$)/.test(demoRead.cols), "1: the demos are read as summary columns only (never their data)", selects, "1");
check(Boolean(restRead) && /collection, doc_id, data/.test(restRead.cols), "1: every other row is read whole, in its own request", selects, "1");
const s1 = snap.demoSites.find((d) => d.id === "d1");
check(M.isDemoSummary(s1) && s1.slug === "example-d1" && s1.status === "sent" && s1.instituteName === "Example d1" && s1.contact?.phone === "+919000000001" && s1.preparedOn === "2026-09-28",
  "1: a summary carries what the lists, the link checks and Create lead read", s1, "1");
check(s1 && !("results" in s1) && !("gallery" in s1) && !("about" in s1), "1: a summary carries nothing heavy (results, gallery, about)", s1 && Object.keys(s1), "1");
check(snap.demoSiteOpens.length === 1 && snap.settings.siteName === "Ideovent", "1: the opens and the settings arrive whole");
check(JSON.stringify(s1).length * 10 < JSON.stringify(demo("d1")).length, "1: a summary is a small part of the record", [JSON.stringify(s1).length, JSON.stringify(demo("d1")).length], "1");
check(M.DEMO_SUMMARY_FIELDS.every((f) => M.DEMO_SUMMARY_SELECT.includes(`${f}:data`)) && M.DEMO_SUMMARY_SELECT.startsWith("doc_id,"), "1: the select names every summary field");

/* ── 2. The admin: exactly as before ─────────────────────────────────────── */

seedDb();
const admin = new M.SupabaseStore();
const asAdmin = await admin.load();
const adminSelects = calls.filter((c) => c.kind === "select");
check(adminSelects.length === 1 && /collection, doc_id, data/.test(adminSelects[0].cols) && !adminSelects[0].eq.length && !adminSelects[0].neq.length,
  "2: the admin reads every row whole in one read, as before", adminSelects);
check(!M.isDemoSummary(asAdmin.demoSites[0]) && Array.isArray(asAdmin.demoSites.find((d) => d.id === "d1")?.results), "2: the admin's demos are whole");

/* ── 3. A summary is never written ───────────────────────────────────────── */

seedDb();
await crm.load();
calls.length = 0;
check(await throws(() => crm.saveDoc("demoSites", { ...s1, status: "closed" })), "3: saveDoc refuses a summary", undefined, "3");
check(!calls.some((c) => c.kind === "upsert"), "3: and makes no request", calls, "3");
check(Array.isArray(demoRow("d1").data.results), "3: the whole demo in the database is untouched", undefined, "3");
check(await throws(() => crm.reorder("demoSites", ["d2", "d1"])), "3: demos are never reordered from summaries", undefined, "3");

/* ── 4. loadDemo: one row, whole, kept while it is current ───────────────── */

seedDb();
await crm.load();
calls.length = 0;
const whole = await crm.loadDemo("d1");
const single = calls.find((c) => c.kind === "single");
check(single && single.cols === "data" && single.eq.some(([c, v]) => c === "collection" && v === "demoSites") && single.eq.some(([c, v]) => c === "doc_id" && v === "d1"),
  "4: loadDemo reads one row by its doc_id", calls);
check(whole && !M.isDemoSummary(whole) && whole.results?.length === 30, "4: and answers the whole record", whole && Object.keys(whole));
snap = await crm.load();
check(!M.isDemoSummary(snap.demoSites.find((d) => d.id === "d1")) && M.isDemoSummary(snap.demoSites.find((d) => d.id === "d2")),
  "4: the next snapshots carry that whole record (the others stay summaries)", snap.demoSites.map((d) => [d.id, M.isDemoSummary(d)]));
demoRow("d1").data = demo("d1", { tagline: "Saved in another tab", updatedAt: "2026-10-04T09:00:00.000Z" });
snap = await crm.load();
const after = snap.demoSites.find((d) => d.id === "d1");
check(M.isDemoSummary(after) && after.updatedAt === "2026-10-04T09:00:00.000Z", "4: once another tab saved it, the snapshot has its new summary, not the old whole copy", after);
await crm.saveDoc("demoSites", { ...(await crm.loadDemo("d1")), status: "closed" });
snap = await crm.load();
check(!M.isDemoSummary(snap.demoSites.find((d) => d.id === "d1")) && snap.demoSites.find((d) => d.id === "d1").status === "closed", "4: a demo saved here stays whole in the snapshots");

/* ── 5. Mark sent writes a whole demo ────────────────────────────────────── */

seedDb();
snap = await crm.load();
calls.length = 0;
const summary = snap.demoSites.find((d) => d.id === "d2");
const saves = [];
const saveDoc = async (col, doc) => {
  saves.push({ col, doc });
  await crm.saveDoc(col, doc);
};
await M.markDemoSent(saveDoc, summary, snap.demoSiteSlots, "Example Contact, Example d2", new Date("2026-10-04T08:00:00.000Z"), (id) => crm.loadDemo(id));
const written = saves.find((s) => s.col === "demoSites")?.doc;
check(written && !M.isDemoSummary(written) && written.status === "sent" && written.results?.length === 30 && written.about?.length === 2000,
  "5: Mark sent on a summary reads the whole demo first and writes it whole, its contents kept", written && Object.keys(written), "5");
check(demoRow("d2").data.results?.length === 30, "5: the database still has the whole demo", undefined, "5");
saves.length = 0;
const before = JSON.stringify(db.rows);
check(await throws(() => M.markDemoSent(saveDoc, summary, [], "x")), "5: without a way to read the whole demo, Mark sent refuses a summary", undefined, "5");
check(!saves.length && JSON.stringify(db.rows) === before, "5: and writes nothing", saves, "5");

/* ── 6. The loader: one full read at a time ──────────────────────────────── */

{
  let loads = 0;
  const waiting = [];
  /* Answers every read on its way. */
  const release = () => {
    while (waiting.length) waiting.shift()();
  };
  const fakeStore = {
    mode: "supabase",
    load: () => {
      loads++;
      return new Promise((r) => waiting.push(() => r({ demoSites: [M.toDemoSummary({ doc_id: "d9", id: "d9", slug: "example-d9", status: "sent" })], settings: {} })));
    },
    loadDemo: async (id) => ({ id, slug: "example-d9", status: "sent", results: [1, 2, 3] }),
  };
  const loader = new M.ContentLoader(fakeStore, null);
  const all = M.needsFor("/admin");
  const first = loader.ensure(all);
  const second = loader.refresh(all);
  check(loads === 1, "6: a refresh while the page's own full read is on its way (started under 2 s ago) waits for it: one read, not two", loads, "6");
  release();
  await Promise.all([first, second]);
  check(loader.getSnapshot().data.demoSites.length === 1, "6: and both see its answer");
  const third = loader.refresh(all);
  check(loads === 2, "6: once it is done, a refresh reads again", loads);
  release();
  await third;
  const realNow = Date.now;
  try {
    const fourth = loader.refresh(all);
    const t0 = realNow();
    Date.now = () => t0 + M.JOIN_FULL_READ_MS + 500;
    const fifth = loader.refresh(all);
    check(loads === 4, "6: a refresh that comes after the join window starts its own read (an older read may be from before a sign-in)", loads);
    release();
    await Promise.all([fourth, fifth]).catch(() => undefined);
  } finally {
    Date.now = realNow;
  }
  const whole9 = await loader.loadDemo("d9");
  const in9 = loader.getSnapshot().data.demoSites.find((d) => d.id === "d9");
  check(whole9?.results?.length === 3 && !M.isDemoSummary(in9) && in9?.results?.length === 3, "6: loadDemo puts the whole record in the snapshot in its summary's place", in9);
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log(`test-cms-summaries: ${passes} passed, ${failures.length} failed${NEGATIVE ? " (negative mode: the read before 4 Oct 2026)" : ""}`);
if (NEGATIVE) {
  const EXPECT = ["1", "3", "5", "6"];
  const missed = EXPECT.filter((t) => !failures.some((f) => f.tag === t));
  if (missed.length) {
    console.log(`NEGATIVE MODE FAILED: nothing failed in section ${missed.join(", ")}.`);
    process.exit(1);
  }
  console.log("Negative mode failed as it must: the summaries, the guard, the whole-record read and the join are what these checks measure.");
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
