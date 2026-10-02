/**
 * Tests the demo-open e-mail alert (maybeAlertDemoOpen in
 * src/lib/demo/opens.ts, sendDemoOpenedAlert in src/lib/leads.ts).
 *
 *   node scripts/test-demo-open-alert.mjs
 *
 * WHAT MUST BE TRUE
 *   1. a SENT demo opened by a stranger sends exactly one e-mail through
 *      EmailJS (service_q5dptxe / template_v6zkm1n) with need "Demo opened"
 *      and website = the institute, so the subject reads
 *      "Demo opened: <institute>", and the message names the page and link;
 *   2. the same demo again the same day, in the same browser: no second e-mail;
 *      the next day: one more;
 *   3. an admin session in this browser (local flag or a Supabase token): none;
 *   4. the setting off: none. A draft: none;
 *   5. storage blocked: none (the once-a-day promise cannot be kept);
 *   6. EmailJS failing: recordDemoOpen still resolves, and the day is not
 *      used up;
 *   7. recordDemoOpen (the route's call) sends through the same path.
 *
 * TEAM DEVICES (CRM team spec, package H, 1 Oct 2026). Team previews never
 * count as a prospect's open:
 *   8. a prospect's open (no marker) writes one row, as the visitor (anon key
 *      as Bearer, doc_id = data.id), which is what lets 0011's
 *      crm_demo_open_guard stamp it with the server's time; a team device
 *      (local admin session, a Supabase login on the demo's origin, the
 *      device marker) writes nothing;
 *   9. ?team=1: read as a team preview (and nothing else is), the marker is
 *      stored on this origin and a later plain open records nothing; the
 *      address bar loses only the marker; blocked storage never throws;
 *  10. the links the CRM opens: teamPreviewUrl adds team=1 once, keeping the
 *      query and the hash; teamDemoUrl is /site/<slug>?team=1 on the main site
 *      and the main site's absolute address on crm.ideovent.in;
 *  11. local mode: a prospect's open goes into this browser's store with the
 *      browser's time (no server there); Mehdi's own open saves nothing.
 * The route's own wiring (src/pages/DemoSiteRoute.tsx calls isTeamPreview,
 * markTeamDevice and withoutTeamPreview) needs a browser: the e2e team suite.
 *
 * Bundled with esbuild from the real TypeScript, twice: Supabase on and off.
 * Mocked: @emailjs/browser (records calls), @/lib/cms/config (fake URL),
 * @/lib/cms/store (records saves), fetch, and the browser globals window,
 * sessionStorage and localStorage.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   ALERT_NEGATIVE=1 node scripts/test-demo-open-alert.mjs
 *
 * replaces the guarded alert with one that always sends. Checks 2 to 5 must
 * then FAIL, and the script must exit non-zero.
 *
 *   TEAM_NEGATIVE=1 node scripts/test-demo-open-alert.mjs
 *
 * serves src/lib/demo/opens.ts without the team-device skip in recordDemoOpen
 * (rewritten in flight; no file is touched). The five "records nothing" and
 * "saves nothing" checks must then FAIL, and the script must exit non-zero.
 */
import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.ALERT_NEGATIVE);
const TEAM_NEGATIVE = Boolean(process.env.TEAM_NEGATIVE);

/* ── Browser globals, before the bundle loads ────────────────────────────── */

function memoryStorage() {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
  };
}
const throwingStorage = new Proxy({}, { get() { throw new Error("SecurityError"); } });

globalThis.window = { location: { origin: "https://ideovent.vercel.app", pathname: "/site/sunrise-public/admissions" } };
globalThis.sessionStorage = memoryStorage();
globalThis.localStorage = memoryStorage();
const fetchCalls = [];
globalThis.fetch = async (url, init) => (fetchCalls.push({ url, init }), { ok: true, status: 201 });

const sends = [];
let emailFails = false;
globalThis.__emailjsSend = async (service, template, params, key) => {
  if (emailFails) throw Object.assign(new Error("412"), { status: 412 });
  sends.push({ service, template, params, key });
  return { status: 200, text: "OK" };
};

/* ── Bundle the real modules ─────────────────────────────────────────────── */

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch {
      /* next */
    }
  }
  return base;
}

/* Local mode writes through the CMS store: the mock records each save. */
const saveDocs = [];
globalThis.__saveDoc = async (c, d) => (saveDocs.push({ c, d }), {});

/* The team-device skip in recordDemoOpen, which TEAM_NEGATIVE takes out. */
const TEAM_SKIP = /\n[ \t]*if \(viewerIsAdmin\(\)\) return;[ \t]*\r?\n/;
let teamSkipCut = 0;

const mocks = (supabase) => ({
  name: "mocks",
  setup(b) {
    b.onResolve({ filter: /^@emailjs\/browser$/ }, () => ({ path: "emailjs", namespace: "mock" }));
    b.onResolve({ filter: /^@\/lib\/cms\/config$/ }, () => ({ path: "config", namespace: "mock" }));
    b.onResolve({ filter: /^@\/lib\/cms\/store$/ }, () => ({ path: "store", namespace: "mock" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
      loader: "js",
      contents:
        args.path === "emailjs"
          ? "export default { send: (...a) => globalThis.__emailjsSend(...a) };"
          : args.path === "store"
            ? "export function getStore() { return { saveDoc: (c, d) => globalThis.__saveDoc(c, d) }; }"
            : `export const SUPABASE_URL = "https://fake.supabase.co"; export const SUPABASE_ANON_KEY = "anon"; export const supabaseEnabled = ${supabase};`,
    }));
    if (TEAM_NEGATIVE) {
      b.onLoad({ filter: /[\\/]lib[\\/]demo[\\/]opens\.ts$/ }, (args) => {
        const src = readFileSync(args.path, "utf8");
        const cut = src.replace(TEAM_SKIP, "\n");
        if (cut !== src) teamSkipCut++;
        return { contents: cut, loader: "ts", resolveDir: dirname(args.path) };
      });
    }
  },
});

const entry = `
export { recordDemoOpen, maybeAlertDemoOpen, ALERT_PREFIX, viewerIsAdmin, isTeamPreview, withoutTeamPreview,
  teamPreviewUrl, teamDemoUrl, markTeamDevice } from "@/lib/demo/opens";
export { sendDemoOpenedAlert, demoOpenedParams } from "@/lib/leads";
`;
async function load(supabase) {
  const out = join(tmpdir(), `ideovent-test-demo-open-alert-${process.pid}-${supabase ? "supabase" : "local"}.mjs`);
  const bundled = await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
    plugins: [mocks(supabase)],
    define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
  });
  writeFileSync(out, bundled.outputFiles[0].text);
  try {
    return await import(pathToFileURL(out).href);
  } finally {
    rmSync(out, { force: true });
  }
}
/** M: Supabase on (production). L: local mode (no database). */
const M = await load(true);
const L = await load(false);
if (TEAM_NEGATIVE && teamSkipCut !== 2) {
  console.log(`TEAM_NEGATIVE could not take the skip out of opens.ts (cut ${teamSkipCut} of 2): update TEAM_SKIP in this script.`);
  process.exit(2);
}

/* ── Plumbing ────────────────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
function check(ok, message) {
  if (ok) passes++;
  else {
    failures.push(message);
    console.log(`FAIL  ${message}`);
  }
}
const until = async (fn, ms = 1500) => {
  const end = Date.now() + ms;
  while (Date.now() < end && !fn()) await new Promise((r) => setTimeout(r, 10));
};
const settle = () => new Promise((r) => setTimeout(r, 60));

/** In the negative run: an alert with no guards at all. */
const alert = NEGATIVE
  ? async (ctx, now) => ((await M.sendDemoOpenedAlert({
      instituteName: ctx.site.instituteName, slug: ctx.site.slug, demoId: ctx.site.id,
      page: "/site/" + ctx.site.slug, link: "x", at: now.toISOString(),
    })) ? "sent" : "failed")
  : (ctx, now) => M.maybeAlertDemoOpen(ctx, now);

const site = (id, extra = {}) => ({ id, slug: id, status: "sent", instituteName: `Sunrise Public School ${id}`, city: "Patna", ...extra });
// Built from TODAY's local date, not fixed dates: recordDemoOpen() alerts with
// the real clock, so a hard-coded day made the "same demo twice" check pass only
// on the day the test was written (it failed on 28 Sep 2026 for that reason).
const atLocal = (dayOffset, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const DAY1 = atLocal(0, 10);
const DAY1_LATER = atLocal(0, 18);
const DAY2 = atLocal(1, 10);

function freshBrowser() {
  globalThis.sessionStorage = memoryStorage();
  globalThis.localStorage = memoryStorage();
  emailFails = false;
}

/* ── 1 and 7. A sent demo, opened by a stranger, through the route's call ── */

freshBrowser();
{
  const s = site("sunrise-public", { instituteName: "Sunrise Public School" });
  /* 1 Oct 2026: Mehdi turned the e-mail off. Opening a sent demo records the
     open (the CRM shows it) and sends nothing. The alert function below is
     kept, and still checked, for an explicit decision to bring it back. */
  const opened = sends.length;
  await M.recordDemoOpen(s.id, { site: s, enabled: undefined });
  await settle();
  check(sends.length === opened, `opening a sent demo sends no e-mail (got ${sends.length - opened})`);
  const before = sends.length;
  await M.maybeAlertDemoOpen({ site: s, enabled: undefined });
  await until(() => sends.length > before);
  await settle();
  check(sends.length - before === 1, `the kept alert, called directly: exactly one e-mail (got ${sends.length - before})`);
  const p = sends[sends.length - 1]?.params || {};
  check(sends[sends.length - 1]?.service === "service_q5dptxe", "sent through service_q5dptxe");
  check(sends[sends.length - 1]?.template === "template_v6zkm1n", "sent with template_v6zkm1n");
  check(`${p.need}: ${p.website}` === "Demo opened: Sunrise Public School", `subject reads "Demo opened: Sunrise Public School" (got "${p.need}: ${p.website}")`);
  check(/\/site\/sunrise-public\/admissions/.test(p.message || ""), "message names the page opened");
  check((p.message || "").includes("https://ideovent.vercel.app/site/sunrise-public"), "message carries the demo link");
  check(/follow up now/i.test(p.message || ""), "message says to follow up now");
  check(!/—/.test(p.message || ""), "no em dash in the message");
  check(fetchCalls.some((c) => /\/rest\/v1\/content$/.test(c.url)), "the open row is still written");

  /* 2. Same browser, same day: nothing more. Next day: one more. */
  const again = await alert({ site: s }, DAY1_LATER);
  await M.maybeAlertDemoOpen({ site: s });
  await settle();
  check(again !== "sent" && sends.length - before === 1, `same demo twice in a day: still one e-mail (got ${sends.length - before})`);
}

freshBrowser();
{
  const s = site("day-two");
  const before = sends.length;
  await alert({ site: s }, DAY1);
  await alert({ site: s }, DAY1_LATER);
  check(sends.length - before === 1, `twice on day one: one e-mail (got ${sends.length - before})`);
  const r = await alert({ site: s }, DAY2);
  check(r === "sent" && sends.length - before === 2, "the next day: one more e-mail");
}

/* ── 3. An admin session in this browser ─────────────────────────────────── */

freshBrowser();
{
  sessionStorage.setItem("ideovent_admin_session", "1");
  const before = sends.length;
  const r = await alert({ site: site("admin-local") }, DAY1);
  check(r !== "sent" && sends.length === before, `local admin session: no e-mail (got ${r})`);
}
freshBrowser();
{
  localStorage.setItem("sb-abcdefgh-auth-token", '{"access_token":"x"}');
  const before = sends.length;
  const r = await alert({ site: site("admin-supabase") }, DAY1);
  check(r !== "sent" && sends.length === before, `Supabase admin session: no e-mail (got ${r})`);
}

/* ── 4. Setting off; a draft ─────────────────────────────────────────────── */

freshBrowser();
{
  const before = sends.length;
  const off = await alert({ site: site("disabled"), enabled: false }, DAY1);
  check(off !== "sent" && sends.length === before, `setting off: no e-mail (got ${off})`);
  const draft = await alert({ site: site("draft", { status: "draft" }) }, DAY1);
  check(draft !== "sent" && sends.length === before, `draft demo: no e-mail (got ${draft})`);
}

/* ── 5. Storage blocked ──────────────────────────────────────────────────── */

freshBrowser();
{
  globalThis.localStorage = throwingStorage;
  const before = sends.length;
  const r = await alert({ site: site("blocked") }, DAY1);
  check(r !== "sent" && sends.length === before, `storage blocked: no e-mail (got ${r})`);
}

/* ── 6. EmailJS failing never breaks the page, and does not use up the day ─ */

freshBrowser();
{
  emailFails = true;
  const s = site("emailjs-down");
  let threw = false;
  try {
    await M.recordDemoOpen(s.id, { site: s });
    await settle();
  } catch {
    threw = true;
  }
  check(!threw, "recordDemoOpen resolves while EmailJS fails");
  check(!NEGATIVE ? localStorage.getItem(M.ALERT_PREFIX + s.id) === null : true, "a failed send does not use up the day");
  emailFails = false;
  const before = sends.length;
  const r = await alert({ site: s }, DAY1);
  check(r === "sent" && sends.length === before + 1, "after a failure, the next open sends");
}

/* ── 8. A prospect's open is written; a team device's is not ────────────── */

/** The open rows sent to Supabase for one demo. */
const rowsFor = (demoId) =>
  fetchCalls.filter((c) => /\/rest\/v1\/content$/.test(c.url) && JSON.parse(c.init?.body || "{}").data?.demoId === demoId);

freshBrowser();
{
  const id = "ds-team-prospect";
  check(M.viewerIsAdmin() === false, "a fresh browser (a prospect's) is not a team device");
  await M.recordDemoOpen(id, { site: site(id) });
  const rows = rowsFor(id);
  check(rows.length === 1, `a prospect's open (no marker) writes one row (got ${rows.length})`);
  const body = JSON.parse(rows[0]?.init?.body || "{}");
  const head = rows[0]?.init?.headers || {};
  check(body.collection === "demoSiteOpens" && body.doc_id === body.data?.id && body.data?.demoId === id,
    `the row is a demoSiteOpens row whose doc_id is its data.id, which 0011 rebuilds it from (${JSON.stringify(body)})`);
  check(head.Authorization === "Bearer anon" && head.apikey === "anon",
    "it goes as a visitor (the anon key as Bearer), the requests 0011 stamps with the server's time");
  check(Math.abs(Date.parse(body.data?.at || "") - Date.now()) < 60000, "it still carries this phone's time, for a database without 0011");
  await M.recordDemoOpen(id, { site: site(id) });
  check(rowsFor(id).length === 1, "the same tab again: still one row");
}

const TEAM_DEVICES = [
  ["Mehdi's local-mode session", "ds-team-local-session", () => sessionStorage.setItem("ideovent_admin_session", "1")],
  ["a Supabase login on the demo's origin", "ds-team-supabase-login", () => localStorage.setItem("sb-abcdefgh-auth-token", '{"access_token":"x"}')],
  ["the team-device marker", "ds-team-marker", () => localStorage.setItem("ideovent_admin_device", "1")],
];
for (const [who, id, mark] of TEAM_DEVICES) {
  freshBrowser();
  mark();
  await M.recordDemoOpen(id, { site: site(id) });
  check(rowsFor(id).length === 0, `${who}: an open records nothing (got ${rowsFor(id).length} rows)`);
}

/* ── 9. ?team=1: what DemoSiteRoute does with it, without React ────────── */

freshBrowser();
{
  check(M.isTeamPreview("?team=1") && M.isTeamPreview("team=1") && M.isTeamPreview("?lang=hi&team=1"),
    "?team=1 reads as a team preview, alone or after other parameters");
  check(![undefined, "", "?lang=hi", "?team=0", "?teams=1", "?steam=1"].some((s) => M.isTeamPreview(s)),
    "nothing else does (no marker, team=0, teams=1, steam=1)");
  check(M.markTeamDevice() === true && localStorage.getItem("ideovent_admin_device") === "1", "markTeamDevice stores the marker on this origin");
  check(M.viewerIsAdmin() === true, "and this browser then reads as a team device");
  const id = "ds-team-after-preview";
  await M.recordDemoOpen(id, { site: site(id) });
  check(rowsFor(id).length === 0, `after a team preview, a later plain open from this browser records nothing (got ${rowsFor(id).length} rows)`);
  const cleaned = [M.withoutTeamPreview("?team=1"), M.withoutTeamPreview("?lang=hi&team=1"), M.withoutTeamPreview("?team=1&lang=hi&q=a%20b")];
  check(JSON.stringify(cleaned) === JSON.stringify(["", "?lang=hi", "?lang=hi&q=a%20b"]),
    `the address bar loses the marker and nothing else (${JSON.stringify(cleaned)})`);
}
freshBrowser();
{
  globalThis.localStorage = throwingStorage;
  let threw = false;
  let stored = null;
  try {
    stored = M.markTeamDevice();
  } catch {
    threw = true;
  }
  check(!threw && stored === false, "storage blocked: markTeamDevice says so and never throws (the route then keeps ?team=1 in the address)");
}

/* ── 10. The links the CRM opens ─────────────────────────────────────────── */

{
  const plain = M.teamPreviewUrl("/site/sunrise");
  check(plain === "/site/sunrise?team=1", `teamPreviewUrl adds ?team=1 (${plain})`);
  const full = M.teamPreviewUrl("https://ideovent.in/site/sunrise/fees?lang=hi#fees");
  check(full === "https://ideovent.in/site/sunrise/fees?lang=hi&team=1#fees", `and keeps the query and the hash (${full})`);
  check(M.teamPreviewUrl(plain) === plain && M.teamPreviewUrl(full) === full, "adding it twice changes nothing");
  check(M.teamPreviewUrl("/site/sunrise?team=0") === "/site/sunrise?team=1", "a team=0 becomes team=1, never two values");
  check(M.teamPreviewUrl("") === "", "an empty link stays empty");
  check(M.teamDemoUrl("sunrise") === "/site/sunrise?team=1", `on the main site the CRM's live link is /site/<slug>?team=1 (${M.teamDemoUrl("sunrise")})`);
  const loc = globalThis.window.location;
  globalThis.window.location = { ...loc, hostname: "crm.ideovent.in" };
  const fromCrm = M.teamDemoUrl("sunrise");
  globalThis.window.location = loc;
  check(/^https:\/\/[^/]+\/site\/sunrise\?team=1$/.test(fromCrm) && !/\/\/crm\./.test(fromCrm),
    `on crm.ideovent.in it is the main site's own address (${fromCrm})`);
  check(M.isTeamPreview(new URL(fromCrm).search), "and the public route reads that link as a team preview");
}

/* ── 11. Local mode: no server, so the browser's own time ───────────────── */

freshBrowser();
{
  const id = "ds-local-prospect";
  await L.recordDemoOpen(id, { site: site(id) });
  const saved = saveDocs.filter((s) => s.d?.demoId === id);
  check(saved.length === 1 && saved[0].c === "demoSiteOpens" && Math.abs(Date.parse(saved[0].d.at || "") - Date.now()) < 60000,
    `local mode: a prospect's open is saved to demoSiteOpens with the browser's time (${JSON.stringify(saved)})`);
  check(rowsFor(id).length === 0, "local mode: nothing goes to Supabase");
}
freshBrowser();
{
  sessionStorage.setItem("ideovent_admin_session", "1");
  const id = "ds-local-owner";
  await L.recordDemoOpen(id, { site: site(id) });
  check(!saveDocs.some((s) => s.d?.demoId === id), "local mode: Mehdi's own open (his session in this tab) saves nothing");
}

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`\n${passes} passed, ${failures.length} failed${NEGATIVE || TEAM_NEGATIVE ? " (NEGATIVE run: failures expected)" : ""}`);
if (NEGATIVE) {
  if (failures.length >= 5) console.log("Negative control OK: the guards are what the test measures.");
  else console.log("Negative control DID NOT FAIL ENOUGH: the test is not measuring the guards.");
}
if (TEAM_NEGATIVE) {
  const team = failures.filter((f) => /records nothing|saves nothing/.test(f)).length;
  if (team >= 5) console.log(`Negative control OK: without the skip, ${team} team-device checks fail; the skip is what they measure.`);
  else console.log(`Negative control DID NOT FAIL ENOUGH: only ${team} team-device checks failed without the skip.`);
}
process.exit(failures.length ? 1 : 0);
