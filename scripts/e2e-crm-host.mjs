/**
 * The CRM on its own subdomain (crm.ideovent.in), end to end, in LOCAL mode.
 *
 *   node scripts/e2e-crm-host.mjs [port]                       default 5405
 *   E2E_CRM_URL=http://crm.localhost:5405 node scripts/e2e-crm-host.mjs 5405
 *       for a dev server started WITH VITE_CRM_URL=http://crm.localhost:5405,
 *       i.e. the day after go-live. Without it the server must have no
 *       VITE_CRM_URL, i.e. today.
 *   E2E_NEGATIVE=1 node scripts/e2e-crm-host.mjs 5405
 *       serves src/crm/nav.ts with the CRM base forced back to "/crm" (the
 *       module is rewritten in flight; no file is touched). The CRM-host link
 *       checks must then FAIL and the run must exit 1. Dev server only.
 *
 * It also runs against `vite preview` of a build (the real bundle): MAIN_ORIGIN
 * then comes from E2E_MAIN_ORIGIN or VITE_PUBLIC_URL in .env, and the build must
 * have been made with VITE_CRM_URL equal to E2E_CRM_URL (or with neither).
 *
 * Chrome sends every *.localhost name to 127.0.0.1, so one dev server is
 *   http://crm.localhost:<port>  the CRM host (crm.ideovent.in)
 *   http://www.localhost:<port>  a main-site host that is not localhost
 *                                (ideovent.vercel.app today, www.ideovent.in later)
 *   http://localhost:<port>      development, where /crm always stays
 *
 * CHECKED
 *   CRM host: "/" is the dashboard; signed out, a page goes to /login and comes
 *   back to that page after the real sign-in form (local passcode); a lead
 *   page deep link works; every CRM link (rail, phone tabs, More, header)
 *   stays on the CRM host with no /crm; /about and other main-site pages go to
 *   "/"; /crm/<x> and /admin/outreach?lead= open the same CRM screen here;
 *   /admin/* and /site/* go to MAIN_ORIGIN; Back to admin is MAIN_ORIGIN/admin.
 *   localhost: /crm, its links, its sign-in (/admin/login), Back to admin and
 *   the admin's CRM item are exactly as before.
 *   www.localhost: today /crm stays there; with E2E_CRM_URL, /crm/<x>,
 *   /admin/outreach?lead= and the admin's CRM item go to that origin, and
 *   localhost still keeps /crm.
 *   Config: vercel.json keeps every rule it had at HEAD and adds the CRM host
 *   rules; the only other host-limited rule is the ideovent.vercel.app 308 to
 *   www.ideovent.in (1 Oct 2026); robots-crm.txt is Disallow: /; sitemap.xml
 *   lists no CRM-host URL.
 *
 * MAIN_ORIGIN (VITE_PUBLIC_URL) is read from the running app, and every request
 * to it is answered here, so nothing reaches the live site. The leads are
 * fictional (Example ... E2E); Supabase and EmailJS are blocked.
 */
import { chromium } from "playwright-core";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || 5405);
const CRM = `http://crm.localhost:${PORT}`;
const LOCAL = `http://localhost:${PORT}`;
const WWW = `http://www.localhost:${PORT}`;
const GOLIVE = (process.env.E2E_CRM_URL || "").replace(/\/+$/, "");
const NEGATIVE = Boolean(process.env.E2E_NEGATIVE);
const SESSION_KEY = "ideovent_admin_session";
const OUTREACH_KEY = "ideovent_outreach_v1";
const CRM_HOST_NAME = "crm.ideovent.in";

const findings = [];
const warnings = [];
const fail = (m) => {
  findings.push(m);
  console.log("FAIL  " + m);
};
const pass = (m) => console.log("ok    " + m);
const warn = (m) => {
  warnings.push(m);
  console.log("WARN  " + m);
};
const check = (cond, okMsg, detail) => (cond ? pass(okMsg) : fail(detail !== undefined ? `${okMsg}: ${detail}` : okMsg));
const section = (t) => console.log(`\n── ${t}`);

/* The local passcode as Vite reads it: the process env, then the .env files, most specific first. */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  for (const name of [".env.development.local", ".env.development", ".env.local", ".env"]) {
    const file = resolve(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, "");
    }
  }
  return "";
}
const PASSCODE = process.env.E2E_PASSCODE || envValue("VITE_ADMIN_PASSCODE");

/* Three fictional leads, written to each origin's own localStorage. */
const now = Date.now();
const iso = (t) => new Date(t).toISOString();
const LEADS = [
  ["ol_host_01", "Example Dental Clinic Host E2E", "dental", "Patna"],
  ["ol_host_02", "Example Public School Host E2E", "school", "Gaya"],
  ["ol_host_03", "Example Classes Host E2E", "coaching", "Ranchi"],
].map(([id, instituteName, kind, city], i) => ({
  id,
  instituteName,
  kind,
  city,
  phone: `+9198765432${10 + i}`,
  email: `office${i}@example-host-e2e.example`,
  source: "CSV import",
  status: "new",
  createdAt: iso(now - i * 864e5),
  updatedAt: iso(now - i * 864e5),
}));
const SEED = { leads: LEADS, events: [], settings: null };

/* Paths that exist only on the CRM host, never on the main site. */
const CRM_SCREENS = ["/", "/today", "/leads", "/pipeline", "/demos", "/finder", "/import", "/settings"];
const PHONE_TABS = ["/", "/today", "/leads", "/pipeline"];
/* ── Browser ───────────────────────────────────────────────────────────── */
async function launch() {
  const cands = [process.env.CHROME_PATH, String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`, "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].filter(Boolean);
  for (const p of cands) {
    try {
      return await chromium.launch({ executablePath: p, headless: true });
    } catch {
      /* next */
    }
  }
  return await chromium.launch({ channel: "chrome", headless: true });
}
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
/* A cold dev server transforms the whole module graph on the first load; with the
   WebAssembly toolchain (fix-rollup-appcontrol.mjs) that can take over 30 seconds. */
context.setDefaultNavigationTimeout(120000);
await context.route(/\.supabase\.co|api\.emailjs\.com/, (route) => route.abort());

/* The negative control: nav.ts with its CRM base forced back to "/crm" on every host. */
let navBroken = false;
if (NEGATIVE) {
  await context.route(/\/src\/crm\/nav\.ts/, async (route) => {
    try {
      /* Fetched from localhost: Node cannot resolve crm.localhost, and the module is the same for every host. */
      const res = await route.fetch({ url: route.request().url().replace(/\/\/[a-z0-9.-]+\.localhost:/i, "//localhost:") });
      const src = await res.text();
      const broken = src.replace(/isCrmHost\(\)\s*\?\s*""\s*:\s*"\/crm"/, '"/crm"');
      if (broken !== src) navBroken = true;
      return route.fulfill({ response: res, body: broken });
    } catch {
      return route.continue();
    }
  });
}

/* No hot reload mid-run: other work saving files must not reload a page under the test. */
await context.addInitScript(() => {
  const Real = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (/localhost|127\.0\.0\.1/.test(String(url))) return { addEventListener() {}, removeEventListener() {}, send() {}, close() {}, readyState: 0 };
    return new Real(url, protocols);
  };
});

const errors = [];
function watch(p, name) {
  p.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  p.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(`${name}: ${m.text()}`);
  });
  p.on("dialog", (d) => d.accept());
}
const page = await context.newPage();
watch(page, "tab1");

/* What the running app was built with: MAIN_ORIGIN and CRM_ORIGIN, from lib/host.ts itself.
   This first load also warms the dev server up. */
await page.goto(LOCAL + "/admin/login", { waitUntil: "domcontentloaded" });
await page.locator("#admin-passcode").waitFor({ timeout: 90000 }).catch(() => {});
let appHost = await page
  .evaluate(async () => {
    const m = await import("/src/lib/host.ts");
    return { main: m.MAIN_ORIGIN, crm: m.CRM_ORIGIN };
  })
  .catch(() => null);
/* A built app (vite preview) has no /src to import: take the values it was built with from the env. */
const BUILT = !appHost;
if (BUILT) appHost = { main: (process.env.E2E_MAIN_ORIGIN || envValue("VITE_PUBLIC_URL") || "https://ideovent.vercel.app").replace(/\/+$/, ""), crm: GOLIVE };
const MAIN_ORIGIN = appHost.main;
section(`app${BUILT ? " (built, values from the env)" : ""}: MAIN_ORIGIN=${MAIN_ORIGIN || "?"} CRM_ORIGIN=${appHost.crm || "(empty)"}${GOLIVE ? "  [go-live mode]" : "  [today]"}${NEGATIVE ? "  [NEGATIVE]" : ""}`);
check(/^https?:\/\/[^/]+$/.test(MAIN_ORIGIN), "the app's MAIN_ORIGIN is an origin", MAIN_ORIGIN);
if (!BUILT && GOLIVE) check(appHost.crm === GOLIVE, `the dev server was started with VITE_CRM_URL=${GOLIVE}`, appHost.crm || "(empty)");
else if (!BUILT) check(appHost.crm === "", "the dev server has no VITE_CRM_URL (today)", appHost.crm);

/* Every request to the main site is answered here and remembered: nothing reaches it. */
const toMain = [];
const mainIsLocal = /(^|\.)localhost$|^127\.0\.0\.1$/.test(MAIN_ORIGIN ? new URL(MAIN_ORIGIN).hostname : "");
if (MAIN_ORIGIN && !mainIsLocal) {
  const esc = MAIN_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(new RegExp(`^${esc}(/|$)`), (route) => {
    toMain.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>main site</title><p>main site, answered by e2e-crm-host</p>" });
  });
}

const settle = (p = page, ms = 400) => p.waitForTimeout(ms);
const url = (p = page) => new URL(p.url());
const waitPath = (p, pathname, timeout = 20000) => p.waitForURL((u) => u.pathname === pathname, { timeout: Math.max(timeout, 20000) }).catch(() => {});
const seed = (p) => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [OUTREACH_KEY, SEED]);

/* The real sign-in form, local mode. Returns false when no passcode is known. */
async function signInWithForm(p) {
  await p.locator("#admin-passcode").waitFor({ timeout: 30000 }).catch(() => {});
  if (!PASSCODE) {
    fail("no VITE_ADMIN_PASSCODE in the env or .env files, so the sign-in form cannot be used");
    await p.evaluate((k) => sessionStorage.setItem(k, "1"), SESSION_KEY);
    await p.reload({ waitUntil: "domcontentloaded" });
    return false;
  }
  await p.locator("#admin-passcode").fill(PASSCODE);
  await p.getByRole("button", { name: /sign in/i }).click();
  return true;
}

/* Every <a href> on the page: raw attribute, resolved URL, and the element it sits in. */
const anchors = (p = page) =>
  p.evaluate(() =>
    [...document.querySelectorAll("a[href]")].map((a) => ({
      href: a.getAttribute("href"),
      abs: a.href,
      text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      where: a.closest("aside") ? "rail" : a.closest('nav[aria-label="CRM tabs"]') ? "tabs" : a.closest("#crm-more") ? "more" : a.closest("header") ? "header" : "main",
    })),
  );
/* ── 1. The CRM host, signed out ───────────────────────────────────────── */
section(`1. ${CRM}, signed out`);
await page.goto(CRM + "/", { waitUntil: "domcontentloaded" });
await seed(page);
await waitPath(page, "/login");
check(url().origin === CRM && url().pathname === "/login", 'signed out, "/" on the CRM host goes to /login (not /admin/login)', page.url());
/* The first load of a lazy page on a fresh dev server can take seconds: wait for it, do not sleep. */
await page.locator("#admin-passcode").waitFor({ timeout: 30000 }).catch(() => {});
check(await page.locator("#admin-passcode").isVisible().catch(() => false), "the CRM host's /login is the same sign-in form (local passcode)");
const h1 = (await page.locator("h1").first().innerText().catch(() => "")).trim();
check(h1 === "CRM sign-in", 'its heading reads "CRM sign-in"', h1);

const DEEP = `/leads/${LEADS[0].id}?from=e2e`;
await page.goto(CRM + DEEP, { waitUntil: "domcontentloaded" });
await waitPath(page, "/login");
check(url().pathname === "/login", `signed out, the deep link ${DEEP} goes to /login`, page.url());
await signInWithForm(page);
await waitPath(page, `/leads/${LEADS[0].id}`);
check(url().origin === CRM && url().pathname + url().search === DEEP, "after the sign-in it comes back to that lead page, query kept", page.url());
await page.getByTestId("lead-name").waitFor({ timeout: 30000 }).catch(() => {});
const leadName = await page.getByTestId("lead-name").innerText().catch(() => "");
check(leadName === LEADS[0].instituteName, `the lead page deep link shows ${LEADS[0].instituteName}`, leadName);

/* ── 2. The CRM host, signed in ────────────────────────────────────────── */
section(`2. ${CRM}, signed in`);
await page.goto(CRM + "/login", { waitUntil: "domcontentloaded" });
await waitPath(page, "/");
check(url().pathname === "/", "signed in, /login goes on to the dashboard", page.url());
await page.goto(CRM + "/", { waitUntil: "domcontentloaded" });
await page.getByTestId("crm-dashboard").waitFor({ timeout: 30000 }).catch(() => {});
check(url().pathname === "/" && (await page.getByTestId("crm-dashboard").isVisible().catch(() => false)), 'the CRM host\'s "/" is the CRM dashboard', page.url());
check(!/^\/crm(\/|$)/.test(url().pathname), "the address has no /crm in it", page.url());

/* Every link in the shell and on the dashboard. */
async function crmHostLinks(where) {
  const list = await anchors();
  const crmPrefixed = list.filter((a) => /^\/crm(\/|$|\?)/.test(a.href) || (a.abs.startsWith(CRM) && /^\/crm(\/|$)/.test(new URL(a.abs).pathname)));
  check(!crmPrefixed.length, `${where}: no link on the CRM host carries /crm`, crmPrefixed.map((a) => `${a.where}:${a.href}`).join(", "));
  /* A relative /admin or /site link resolves to the CRM host, which only forwards it (App.tsx). */
  const notConverted = list.filter((a) => /^\/(admin|site)(\/|$|\?)/.test(a.href));
  if (notConverted.length) warn(`${where}: link(s) to the main site not built with mainSiteUrl(): ${notConverted.map((a) => `"${a.text}" ${a.href}`).join(", ")}`);
  return list;
}
const dash = await crmHostLinks("dashboard");
const rail = dash.filter((a) => a.where === "rail").map((a) => a.href);
const railNav = await page.locator('aside[aria-label="CRM"] nav a').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
check(JSON.stringify(railNav) === JSON.stringify(CRM_SCREENS), "the rail's eight links are the CRM screens at the root", JSON.stringify(railNav));
check(rail.every((h) => h.startsWith("/") && !h.startsWith("/crm")), "every rail link is a path on this host", JSON.stringify(rail));
const tabs = await page.locator('nav[aria-label="CRM tabs"] a').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
check(JSON.stringify(tabs) === JSON.stringify(PHONE_TABS), "the phone tab bar links are /, /today, /leads, /pipeline", JSON.stringify(tabs));
const newLead = await page.getByRole("link", { name: /new lead/i }).first().getAttribute("href").catch(() => null);
check(newLead === "/leads/new", "New lead is /leads/new", newLead);
/* Click through every rail link: each screen opens on the CRM host, without /crm, and renders. */
for (const label of ["Today", "Leads", "Pipeline", "Demos", "Lead finder", "Import", "Settings", "Dashboard"]) {
  const link = page.locator('aside[aria-label="CRM"] nav a', { hasText: label }).first();
  const href = await link.getAttribute("href").catch(() => null);
  await link.click().catch(() => {});
  if (href) await waitPath(page, href, 10000);
  /* Rendered = the main area has real text (a cold lazy chunk can take seconds on a fresh server). */
  await page
    .waitForFunction(() => (document.querySelector("#crm-main")?.textContent || "").trim().length > 20, null, { timeout: 30000 })
    .catch(() => {});
  await settle(page, 300);
  const u = url();
  const text = (await page.locator("#crm-main").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  const crashed = await page.getByText("This page needs a refresh").isVisible().catch(() => false);
  check(u.origin === CRM && href && u.pathname === href && !u.pathname.startsWith("/crm") && text.length > 20 && !crashed,
    `rail "${label}" opens ${href} on the CRM host and the screen renders`, `${page.url()} (${text.slice(0, 80)})`);
  if (label !== "Dashboard") await crmHostLinks(`${label} screen`);
}

/* A phone: the bottom tabs and the More menu. */
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(CRM + "/", { waitUntil: "domcontentloaded" });
await page.getByTestId("crm-dashboard").waitFor({ timeout: 30000 }).catch(() => {});
await page.getByRole("button", { name: "More" }).click().catch(() => {});
await page.locator("#crm-more").waitFor({ timeout: 5000 }).catch(() => {});
const more = await page.locator("#crm-more a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
check(JSON.stringify(more.slice(0, 4)) === JSON.stringify(["/demos", "/finder", "/import", "/settings"]), "the phone More menu links are the other four screens at the root", JSON.stringify(more));
check(more[4] === `${MAIN_ORIGIN}/admin`, `the phone More menu's Back to admin is ${MAIN_ORIGIN}/admin`, more[4]);
await page.locator("#crm-more a", { hasText: "Settings" }).click().catch(() => {});
await waitPath(page, "/settings", 10000);
check(url().origin === CRM && url().pathname === "/settings", "More > Settings opens /settings on the CRM host", page.url());
await page.locator('nav[aria-label="CRM tabs"] a', { hasText: "Leads" }).click().catch(() => {});
await waitPath(page, "/leads", 10000);
check(url().origin === CRM && url().pathname === "/leads", "the Leads tab opens /leads on the CRM host", page.url());
await page.setViewportSize({ width: 1280, height: 900 });

/* Back to admin: a plain link to the main site's admin. */
await page.goto(CRM + "/", { waitUntil: "domcontentloaded" });
const back = page.getByTestId("crm-back-to-admin").first();
await back.waitFor({ timeout: 30000 }).catch(() => {});
const backHref = await back.getAttribute("href").catch(() => null);
check(backHref === `${MAIN_ORIGIN}/admin`, `Back to admin points to MAIN_ORIGIN/admin (${MAIN_ORIGIN}/admin)`, backHref);
if (!mainIsLocal) {
  await back.click().catch(() => {});
  await page.waitForURL(`${MAIN_ORIGIN}/admin`, { timeout: 30000 }).catch(() => {});
  check(page.url() === `${MAIN_ORIGIN}/admin`, "clicking it leaves the CRM host for the main site's admin (answered here, not sent)", page.url());
}
/* ── 3. Other addresses on the CRM host ────────────────────────────────── */
section(`3. ${CRM}: other addresses`);
for (const p of ["/about", "/pricing", "/contact", "/blog", "/work/lead-crm", "/example-pitch-slug", "/verify/EXAMPLE01", "/login/extra"]) {
  await page.goto(CRM + p, { waitUntil: "domcontentloaded" });
  await waitPath(page, "/", 10000);
  check(url().origin === CRM && url().pathname === "/", `${p} on the CRM host goes to "/"`, page.url());
}
await page.getByTestId("crm-dashboard").waitFor({ timeout: 30000 }).catch(() => {});
check(await page.getByTestId("crm-dashboard").isVisible().catch(() => false), "and that is the dashboard, not a public page");

/* An address from the main site's /crm: the same screen here, without the prefix. */
await page.goto(CRM + `/crm/leads/${LEADS[1].id}?view=all`, { waitUntil: "domcontentloaded" });
await waitPath(page, `/leads/${LEADS[1].id}`, 10000);
check(url().pathname + url().search === `/leads/${LEADS[1].id}?view=all`, `/crm/leads/${LEADS[1].id}?view=all on the CRM host opens /leads/${LEADS[1].id}?view=all`, page.url());
await page.goto(CRM + "/crm", { waitUntil: "domcontentloaded" });
await waitPath(page, "/", 10000);
check(url().pathname === "/", '/crm on the CRM host opens "/"', page.url());

/* Old /admin/outreach links, ?lead= kept. */
await page.goto(CRM + `/admin/outreach?lead=${LEADS[2].id}`, { waitUntil: "domcontentloaded" });
await waitPath(page, `/leads/${LEADS[2].id}`, 10000);
await page.getByTestId("lead-name").waitFor({ timeout: 30000 }).catch(() => {});
check(url().origin === CRM && url().pathname === `/leads/${LEADS[2].id}` && (await page.getByTestId("lead-name").innerText().catch(() => "")) === LEADS[2].instituteName,
  `/admin/outreach?lead=${LEADS[2].id} on the CRM host opens that lead here`, page.url());

/* The admin and the demos live on the main site. */
if (!mainIsLocal) {
  for (const p of ["/admin", "/admin/templates", "/admin/c/demoSites?edit=ds_example", "/site/example-demo/courses", "/pitch/example-pitch"]) {
    await page.goto(CRM + p, { waitUntil: "domcontentloaded" }).catch(() => {});
    /* Other work on this machine can slow a page down: generous, since a pass returns at once. */
    await page.waitForURL(MAIN_ORIGIN + p, { timeout: 30000 }).catch(() => {});
    check(page.url() === MAIN_ORIGIN + p, `${p} on the CRM host goes to the main site, ${MAIN_ORIGIN}${p}`, page.url());
  }
}
/* ── 4. localhost: /crm exactly as before ──────────────────────────────── */
section(`4. ${LOCAL}: /crm as before${GOLIVE ? " (VITE_CRM_URL is set, localhost keeps /crm)" : ""}`);
const tab2 = await context.newPage();
watch(tab2, "tab2");
await tab2.goto(LOCAL + "/crm/leads", { waitUntil: "domcontentloaded" });
await seed(tab2);
await waitPath(tab2, "/admin/login");
check(url(tab2).pathname === "/admin/login", "signed out, /crm/leads on localhost goes to /admin/login, as before", tab2.url());
const h1Local = (await tab2.locator("h1").first().innerText().catch(() => "")).trim();
check(h1Local === "Admin access", 'the main site\'s sign-in still reads "Admin access"', h1Local);
await signInWithForm(tab2);
await waitPath(tab2, "/crm/leads");
check(url(tab2).origin === LOCAL && url(tab2).pathname === "/crm/leads", "after the sign-in it comes back to /crm/leads", tab2.url());
await tab2.goto(LOCAL + "/crm", { waitUntil: "domcontentloaded" });
await tab2.getByTestId("crm-dashboard").waitFor({ timeout: 30000 }).catch(() => {});
check(url(tab2).pathname === "/crm" && (await tab2.getByTestId("crm-dashboard").isVisible().catch(() => false)), "/crm on localhost is the CRM dashboard", tab2.url());
const localRail = await tab2.locator('aside[aria-label="CRM"] nav a').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
const expectLocal = CRM_SCREENS.map((p) => (p === "/" ? "/crm" : `/crm${p}`));
check(JSON.stringify(localRail) === JSON.stringify(expectLocal), "the rail links are /crm, /crm/today ... /crm/settings, as before", JSON.stringify(localRail));
await tab2.locator('aside[aria-label="CRM"] nav a', { hasText: "Pipeline" }).click().catch(() => {});
await waitPath(tab2, "/crm/pipeline", 10000);
check(url(tab2).origin === LOCAL && url(tab2).pathname === "/crm/pipeline", "rail Pipeline opens /crm/pipeline on localhost", tab2.url());
await tab2.goto(LOCAL + `/crm/leads/${LEADS[0].id}`, { waitUntil: "domcontentloaded" });
await tab2.getByTestId("lead-name").waitFor({ timeout: 30000 }).catch(() => {});
check((await tab2.getByTestId("lead-name").innerText().catch(() => "")) === LEADS[0].instituteName, `/crm/leads/${LEADS[0].id} on localhost opens the lead`);
const backLocal = tab2.getByTestId("crm-back-to-admin").first();
check((await backLocal.getAttribute("href").catch(() => null)) === "/admin", 'Back to admin on localhost is "/admin", as before', await backLocal.getAttribute("href").catch(() => null));
await backLocal.click().catch(() => {});
await waitPath(tab2, "/admin", 10000);
await tab2.getByText("Dashboard", { exact: true }).first().waitFor({ timeout: 30000 }).catch(() => {});
check(url(tab2).origin === LOCAL && url(tab2).pathname === "/admin", "and it opens the admin in the same tab", tab2.url());

/* The admin's CRM item and the old /admin/outreach links. */
async function adminCrmItem(p) {
  const a = p.locator("aside a").filter({ hasText: /^CRM/ }).first();
  await a.waitFor({ timeout: 30000 }).catch(() => {});
  return { href: await a.getAttribute("href").catch(() => null), target: await a.getAttribute("target").catch(() => null), rel: (await a.getAttribute("rel").catch(() => null)) || "" };
}
const itemLocal = await adminCrmItem(tab2);
check(itemLocal.href === "/crm" && itemLocal.target === "_blank" && /noopener/.test(itemLocal.rel), "the admin's CRM item on localhost is /crm in a new tab, as before", JSON.stringify(itemLocal));
await tab2.goto(LOCAL + `/admin/outreach?lead=${LEADS[1].id}`, { waitUntil: "domcontentloaded" });
await waitPath(tab2, `/crm/leads/${LEADS[1].id}`, 10000);
check(url(tab2).origin === LOCAL && url(tab2).pathname === `/crm/leads/${LEADS[1].id}`, `/admin/outreach?lead=${LEADS[1].id} on localhost opens /crm/leads/${LEADS[1].id}`, tab2.url());
/* ── 5. A main-site host that is not localhost (ideovent.vercel.app, www.ideovent.in) ── */
section(`5. ${WWW}: ${GOLIVE ? `after go-live, the CRM is on ${GOLIVE}` : "today, /crm stays on the main site"}`);
/* Tab 1 is signed in on the CRM host already; sign it in on this main-site host too. */
await page.goto(WWW + "/admin/login", { waitUntil: "domcontentloaded" });
await seed(page);
await page.evaluate((k) => sessionStorage.setItem(k, "1"), SESSION_KEY);
if (!GOLIVE) {
  await page.goto(WWW + `/crm/leads/${LEADS[0].id}?view=all`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("lead-name").waitFor({ timeout: 30000 }).catch(() => {});
  check(url().origin === WWW && url().pathname === `/crm/leads/${LEADS[0].id}` && (await page.getByTestId("lead-name").isVisible().catch(() => false)),
    "with VITE_CRM_URL empty, /crm/leads/<id> on a non-localhost main host stays there and opens the lead", page.url());
  await page.goto(WWW + "/admin", { waitUntil: "domcontentloaded" });
  const item = await adminCrmItem(page);
  check(item.href === "/crm" && item.target === "_blank", "and the admin's CRM item there is /crm in a new tab", JSON.stringify(item));
  check(!toMain.some((u) => /crm\./.test(u)), "nothing tried to reach a CRM subdomain");
} else {
  const hop = `/leads/${LEADS[0].id}?view=all#top`;
  await page.goto(WWW + `/crm${hop}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForURL((u) => u.origin === GOLIVE && u.pathname === `/leads/${LEADS[0].id}`, { timeout: 30000 }).catch(() => {});
  const u = url();
  check(u.origin === GOLIVE && u.pathname + u.search + u.hash === hop, `/crm${hop} on the main host opens the same screen on ${GOLIVE}`, page.url());
  await page.getByTestId("lead-name").waitFor({ timeout: 30000 }).catch(() => {});
  check((await page.getByTestId("lead-name").innerText().catch(() => "")) === LEADS[0].instituteName, "and that lead's page renders there");
  await page.goto(WWW + "/crm", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForURL((x) => x.origin === GOLIVE, { timeout: 30000 }).catch(() => {});
  check(url().origin === GOLIVE && url().pathname === "/", `/crm on the main host opens ${GOLIVE}/`, page.url());
  await page.goto(WWW + `/admin/outreach?lead=${LEADS[2].id}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  /* Behind the admin shell, the largest chunk: allow a cold first load. */
  await page.waitForURL((x) => x.origin === GOLIVE && x.pathname === `/leads/${LEADS[2].id}`, { timeout: 45000 }).catch(() => {});
  check(url().origin === GOLIVE && url().pathname === `/leads/${LEADS[2].id}`, `/admin/outreach?lead=${LEADS[2].id} on the main host opens that lead on ${GOLIVE}`, page.url());
  await page.goto(WWW + "/admin", { waitUntil: "domcontentloaded" });
  const item = await adminCrmItem(page);
  check(item.href === `${GOLIVE}/` && item.target === "_blank" && /noopener/.test(item.rel), `the admin's CRM item on the main host opens ${GOLIVE}/ in a new tab`, JSON.stringify(item));
  /* The CRM shell never ran on this origin in this mode, so only the admin shell can have set it. */
  const marked = await page.evaluate(() => localStorage.getItem("ideovent_admin_device")).catch(() => null);
  check(marked === "1", "the admin marks the main-site browser as Mehdi's (no demo-open alert for his own opens)", String(marked));
  /* localhost keeps /crm even now (tab 2 is signed in there). */
  await tab2.goto(LOCAL + "/crm", { waitUntil: "domcontentloaded" });
  await tab2.getByTestId("crm-dashboard").waitFor({ timeout: 30000 }).catch(() => {});
  check(url(tab2).origin === LOCAL && url(tab2).pathname === "/crm", "with VITE_CRM_URL set, /crm on localhost still stays on localhost", tab2.url());
}
/* ── 6. Config: vercel.json, robots, sitemap ───────────────────────────── */
section("6. vercel.json, robots-crm.txt, sitemap.xml");
const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf8"));
let head = null;
try {
  head = JSON.parse(execFileSync("git", ["show", "HEAD:vercel.json"], { cwd: ROOT, encoding: "utf8" }));
} catch {
  warn("could not read vercel.json at HEAD; the keep-every-rule check is skipped");
}
/* The generated bare-slug rules follow the route table (sync-noindex-header.mjs --check owns them). */
const generated = (r) => typeof r.source === "string" && /^\/:(pitchSlug|slug)\(/.test(r.source);
/* The SPA catch-all is checked on its own below: its destination moved from
   /index.html to /spa-shell.html on 2 Oct 2026 (scripts/prerender-heads.mjs), and
   on 3 Oct 2026 its source learned to leave file names alone, so a missing
   /og/x.png answers 404 instead of the shell (VERCEL-CONFIG-NOTES.md). */
const SPA_FALLBACKS = ["/spa-shell.html", "/index.html"];
const isSpaFallback = (r) => SPA_FALLBACKS.includes(r.destination) && typeof r.source === "string" && r.source.startsWith("/((?!assets/)");
if (head) {
  /* A rule is the same rule if its source and its conditions are (2 Oct 2026):
     a destination can move on purpose (the SPA fallback to /spa-shell.html, the
     old /blogs/N posts to the pages that replaced them), and comparing whole
     rules read every such change as a rule dropped until it was committed. A
     header rule may change a value but must not lose a header. */
  const ruleKey = (r) => JSON.stringify([r.source, r.has || null, r.missing || null]);
  for (const kind of ["redirects", "rewrites", "headers"]) {
    const now = new Map((vercel[kind] || []).map((r) => [ruleKey(r), r]));
    const kept = (head[kind] || []).filter((r) => !generated(r) && !(kind === "rewrites" && isSpaFallback(r)));
    const missing = kept.filter((r) => !now.has(ruleKey(r)));
    const lostHeader = kind !== "headers" ? [] : kept.filter((r) => now.has(ruleKey(r))
      && (r.headers || []).some((h) => !(now.get(ruleKey(r)).headers || []).some((x) => x.key === h.key)));
    check(!missing.length && !lostHeader.length, `vercel.json keeps all ${kept.length} ${kind} it had at HEAD`,
      [...missing.map((r) => `dropped ${r.source}`), ...lostHeader.map((r) => `lost a header on ${r.source}`)].join(", "));
  }
}
const onCrm = (r) => Array.isArray(r.has) && r.has.some((h) => h.type === "host" && h.value === CRM_HOST_NAME);
const crmHeader = (vercel.headers || []).find((h) => h.source === "/(.*)" && onCrm(h));
check(Boolean(crmHeader?.headers?.some((x) => x.key === "X-Robots-Tag" && x.value === "noindex, nofollow")), `vercel.json: X-Robots-Tag "noindex, nofollow" on every path of ${CRM_HOST_NAME}`, JSON.stringify(crmHeader));
const crmRobots = [...(vercel.redirects || []), ...(vercel.rewrites || [])].find((r) => r.source === "/robots.txt" && onCrm(r));
check(crmRobots?.destination === "/robots-crm.txt", `vercel.json: /robots.txt on ${CRM_HOST_NAME} answers with /robots-crm.txt`, JSON.stringify(crmRobots));
const spa = (vercel.rewrites || []).find(isSpaFallback);
check(Boolean(spa) && !spa.has && !spa.missing, "vercel.json: the SPA fallback (to the shell file) has no host condition, so the CRM host gets it too", JSON.stringify(spa));
/* 1 Oct 2026: the old production alias answers every path with a 308 to the same path on
   www.ideovent.in. It is the one host-limited rule allowed that is not the CRM host's. */
const OLD_ALIAS = "ideovent.vercel.app";
const onOldAlias = (r) => Array.isArray(r.has) && r.has.length === 1 && r.has[0].type === "host" && r.has[0].value === OLD_ALIAS
  && r.source === "/:path*" && r.destination === "https://www.ideovent.in/:path*" && r.permanent === true;
const aliasRules = (vercel.redirects || []).filter(onOldAlias);
check(aliasRules.length === 1 && onOldAlias((vercel.redirects || [])[0]), `vercel.json: ${OLD_ALIAS} sends every path to www.ideovent.in (308), first among the redirects`, JSON.stringify(aliasRules));
/* 3 Oct 2026: "/:path*" never matches the bare "/" (Vercel compiles it strict), so
   the root of the old alias has a rule of its own, beside the first. */
const onOldAliasRoot = (r) => Array.isArray(r.has) && r.has.length === 1 && r.has[0].type === "host" && r.has[0].value === OLD_ALIAS
  && r.source === "/" && r.destination === "https://www.ideovent.in/" && r.permanent === true;
const aliasRoot = (vercel.redirects || []).filter(onOldAliasRoot);
check(aliasRoot.length === 1, `vercel.json: ${OLD_ALIAS}/ itself goes to https://www.ideovent.in/ (308)`, JSON.stringify(aliasRoot));
const hostRules = ["redirects", "rewrites", "headers"].flatMap((k) => (vercel[k] || []).filter((r) => Array.isArray(r.has) && r.has.some((h) => h.type === "host")));
check(hostRules.every((r) => onCrm(r) || onOldAlias(r) || onOldAliasRoot(r)), `every host-limited rule in vercel.json is for ${CRM_HOST_NAME}, apart from the two ${OLD_ALIAS} redirects`, JSON.stringify(hostRules.filter((r) => !onCrm(r) && !onOldAlias(r) && !onOldAliasRoot(r))));

const robots = readFileSync(resolve(ROOT, "public/robots-crm.txt"), "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
check(robots.join("\n") === "User-agent: *\nDisallow: /", "public/robots-crm.txt is User-agent: * / Disallow: /", robots.join(" | "));
/* Through Chrome, which resolves crm.localhost (Node's own resolver may not). */
const served = await tab2
  .goto(CRM + "/robots-crm.txt", { waitUntil: "domcontentloaded" })
  .then(() => tab2.locator("body").innerText())
  .catch(() => "");
check(/^Disallow: \/\s*$/m.test(served), "the dev server serves /robots-crm.txt (Vite does not apply vercel.json, so /robots.txt itself is Vercel's job)", served.slice(0, 60));

const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]));
const crmOnly = CRM_SCREENS.filter((p) => p !== "/").concat("/login");
const badLocs = locs.filter((u) => /^crm\./i.test(u.hostname) || crmOnly.some((p) => u.pathname === p || u.pathname.startsWith(p + "/")) || /^\/(crm|admin)(\/|$)/.test(u.pathname));
check(locs.length > 0 && !badLocs.length, `sitemap.xml (${locs.length} URLs) lists no CRM-host, /crm or /admin address`, badLocs.map(String).join(", "));

/* ── Result ────────────────────────────────────────────────────────────── */
section("result");
check(!errors.length, "no page errors or console errors", errors.slice(0, 5).join(" | "));
await browser.close();

if (NEGATIVE) {
  if (!navBroken) {
    console.log("NEGATIVE CONTROL INVALID: nav.ts was not rewritten, so nothing was proved.");
    process.exit(3);
  }
  console.log(`negative control: the CRM base was forced to "/crm"; ${findings.length} check(s) failed (the CRM-host link checks must be among them).`);
}
if (warnings.length) console.log(`${warnings.length} warning(s):\n  ` + warnings.join("\n  "));
if (findings.length) {
  console.log(`${findings.length} FAILED:\n  ` + findings.join("\n  "));
  process.exit(1);
}
console.log(`e2e-crm-host: all checks passed (${GOLIVE ? "go-live" : "today"} mode)`);
