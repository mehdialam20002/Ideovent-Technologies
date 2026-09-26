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
 * Bundled with esbuild from the real TypeScript. Mocked: @emailjs/browser
 * (records calls), @/lib/cms/config (Supabase on, fake URL), fetch, and the
 * browser globals window, sessionStorage and localStorage.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   ALERT_NEGATIVE=1 node scripts/test-demo-open-alert.mjs
 *
 * replaces the guarded alert with one that always sends. Checks 2 to 5 must
 * then FAIL, and the script must exit non-zero.
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

const mocks = {
  name: "mocks",
  setup(b) {
    b.onResolve({ filter: /^@emailjs\/browser$/ }, () => ({ path: "emailjs", namespace: "mock" }));
    b.onResolve({ filter: /^@\/lib\/cms\/config$/ }, () => ({ path: "config", namespace: "mock" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
      loader: "js",
      contents:
        args.path === "emailjs"
          ? "export default { send: (...a) => globalThis.__emailjsSend(...a) };"
          : 'export const SUPABASE_URL = "https://fake.supabase.co"; export const SUPABASE_ANON_KEY = "anon"; export const supabaseEnabled = true;',
    }));
  },
};

const entry = `
export { recordDemoOpen, maybeAlertDemoOpen, ALERT_PREFIX } from "@/lib/demo/opens";
export { sendDemoOpenedAlert, demoOpenedParams } from "@/lib/leads";
`;
const out = join(tmpdir(), `ideovent-test-demo-open-alert-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [mocks],
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

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
const DAY1 = new Date("2026-09-27T10:00:00+05:30");
const DAY1_LATER = new Date("2026-09-27T18:00:00+05:30");
const DAY2 = new Date("2026-09-28T10:00:00+05:30");

function freshBrowser() {
  globalThis.sessionStorage = memoryStorage();
  globalThis.localStorage = memoryStorage();
  emailFails = false;
}

/* ── 1 and 7. A sent demo, opened by a stranger, through the route's call ── */

freshBrowser();
{
  const s = site("sunrise-public", { instituteName: "Sunrise Public School" });
  const before = sends.length;
  await M.recordDemoOpen(s.id, { site: s, enabled: undefined });
  await until(() => sends.length > before);
  await settle();
  check(sends.length - before === 1, `sent demo: exactly one e-mail (got ${sends.length - before})`);
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
  await M.recordDemoOpen(s.id, { site: s });
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

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`\n${passes} passed, ${failures.length} failed${NEGATIVE ? " (NEGATIVE run: failures expected)" : ""}`);
if (NEGATIVE) {
  if (failures.length >= 5) console.log("Negative control OK: the guards are what the test measures.");
  else console.log("Negative control DID NOT FAIL ENOUGH: the test is not measuring the guards.");
}
process.exit(failures.length ? 1 : 0);
