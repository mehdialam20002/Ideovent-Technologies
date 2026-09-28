/**
 * End to end test of the CRM at /crm, in LOCAL mode.
 *
 *   node scripts/e2e-crm.mjs [baseUrl]            default http://localhost:5199
 *   E2E_NEGATIVE=1 node scripts/e2e-crm.mjs ...   breaks the auto-lead hook (see below)
 *
 * What Mehdi asked for on 28 Sep 2026, checked in a real browser:
 *   1. the admin "CRM" link opens /crm in a NEW tab;
 *   2. the dashboard's numbers equal counts computed here from the seed;
 *   3. the leads table: sort, filter, search, saved views, bulk status, export;
 *   4. the pipeline: a drag changes the status and writes a status event;
 *   5. the lead page: compose per lead, every link built for THAT lead;
 *   6. the Demos tab lists a poster demo and a template duplicate with no lead,
 *      and Create lead / Link to lead work on them;
 *   7. a NEW duplicate (and a new poster demo) auto-creates a CRM lead, and a
 *      duplicate for an institute that is already a lead links instead;
 *   8. WhatsApp: no cap with the limit blank (even with the retired cap of 10
 *      in an old settings row), capped once a limit is set;
 *   9. Clean saved observations clears only the leads left ticked.
 *
 * The seed is 40 fictional leads (`ol_e2e_NN`), their demos, opens and
 * events, written to a fresh browser profile's localStorage. Nothing leaves
 * the machine: Gmail / WhatsApp URLs, Supabase, EmailJS and /api/poster are
 * answered here.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   E2E_NEGATIVE=1 node scripts/e2e-crm.mjs http://localhost:5331
 *
 * serves src/lib/outreach/demoLead.ts with addDemoToCrm() short-circuited to
 * `return null` (the module is rewritten in flight; no file is touched). The
 * auto-lead checks in section 7 must then FAIL and the run must exit 1.
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BASE = process.argv[2] || "http://localhost:5199";
const NEGATIVE = Boolean(process.env.E2E_NEGATIVE);
const SESSION_KEY = "ideovent_admin_session";
const OUTREACH_KEY = "ideovent_outreach_v1";
const CMS_KEY = "ideovent_cms_v1";
const DAY = 864e5;

const findings = [];
const fail = (m) => {
  findings.push(m);
  console.log("FAIL  " + m);
};
const pass = (m) => console.log("ok    " + m);
const check = (cond, okMsg, failMsg) => (cond ? pass(okMsg) : fail(failMsg ? `${okMsg}: ${failMsg}` : okMsg));

/* ── The seed ──────────────────────────────────────────────────────────── */

const STATUSES = ["new", "contacted", "replied", "demo_opened", "call", "proposal", "won", "lost", "do_not_contact"];
const CLOSED = new Set(["won", "lost", "do_not_contact"]);
const WORDS = [
  "Amberfield", "Bluestone", "Cedarwood", "Driftwood", "Elmhurst", "Foxglove", "Greenacre", "Hollybrook",
  "Ironbridge", "Juniper", "Kingsmead", "Lakeshore", "Meadowbank", "Northgate", "Oakridge", "Pinecrest",
  "Queensway", "Riverside", "Silverleaf", "Thornbury", "Upperton", "Valleyview", "Westbrook", "Yewtree",
  "Ashcombe", "Birchwood", "Clearwater", "Dunmore", "Eastwood", "Fairhaven", "Glenview", "Hawthorn",
  "Ivydale", "Jasmine", "Kestrel", "Larkspur", "Moorland", "Newhaven", "Orchard", "Primrose",
];
const CITIES = ["Patna", "Gaya", "Ranchi", "Dhanbad"];

const now = new Date();
const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
const iso = (t) => new Date(t).toISOString();
const pad = (n) => String(n).padStart(2, "0");

const leads = [];
const events = [];
const demos = [];
const opens = [];
const slots = [];

for (let i = 0; i < 40; i++) {
  const word = WORDS[i];
  const kind = i % 2 ? "coaching" : "school";
  const status = STATUSES[i % 9];
  const created = now.getTime() - i * DAY - 60_000;
  const lead = {
    id: `ol_e2e_${pad(i)}`,
    createdAt: iso(created),
    updatedAt: iso(created),
    instituteName: `${word} ${kind === "school" ? "Public School" : "Classes"} E2E`,
    kind,
    phone: `+9198100${40000 + i}`,
    email: `office${i}@${word.toLowerCase()}-e2e.example`,
    city: CITIES[i % 4],
    source: i % 4 === 0 ? "CSV import" : "GMAPS",
    status,
  };
  if (i % 5 === 0) lead.assignedTo = "Aman";
  else if (i % 5 !== 1) lead.assignedTo = "Mehdi";
  if (!CLOSED.has(status)) {
    const r = i % 3;
    lead.nextActionAt = iso(r === 0 ? sod - 2 * DAY + 10 * 3600e3 : r === 1 ? sod + 12 * 3600e3 : sod + 5 * DAY + 10 * 3600e3);
  }
  if (status !== "new") {
    const at = now.getTime() - ((i % 6) + 2) * DAY;
    lead.lastContactedAt = iso(at);
    events.push({ id: `oe_e2e_s${i}`, leadId: lead.id, at: iso(at), type: "sent", channel: i % 2 ? "whatsapp" : "email", templateId: i % 2 ? "wa_fu1_en" : undefined, detail: "seeded send" });
  }
  if (["replied", "call", "proposal", "won"].includes(status)) {
    events.push({ id: `oe_e2e_r${i}`, leadId: lead.id, at: iso(now.getTime() - DAY), type: "replied", detail: "seeded reply" });
  }
  const hasDemo = ["contacted", "replied", "demo_opened", "proposal"].includes(status) || i === 0 || i === 9;
  if (hasDemo) {
    const d = {
      id: `ds_e2e_${pad(i)}`,
      slug: `e2e-${word.toLowerCase()}`,
      instituteName: lead.instituteName,
      internalName: `e2e ${word}`,
      kind,
      market: "india",
      city: lead.city,
      status: "sent",
      templateId: kind === "school" ? "s2-rural-state-board" : "c2-rural-tuition",
      createdAt: iso(created),
      updatedAt: iso(created),
    };
    demos.push(d);
    slots.push({ id: d.id, sentTo: lead.instituteName, sentAt: lead.lastContactedAt || iso(created) });
    lead.demoId = d.id;
    lead.demoSlug = d.slug;
    const lc = lead.lastContactedAt ? Date.parse(lead.lastContactedAt) : 0;
    if (status === "demo_opened") {
      opens.push({ id: `op_e2e_${i}a`, demoId: d.id, at: iso(lc + 3600e3) }, { id: `op_e2e_${i}b`, demoId: d.id, at: iso(lc + 2 * 3600e3) });
      // The provider writes this once per open; seeding it keeps the seed's statuses and events as they are.
      events.push({ id: `oe_e2e_o${i}`, leadId: lead.id, at: iso(lc + 2 * 3600e3), type: "demo_opened", detail: `Demo opened (2 opens since last contact) [op_e2e_${i}b]` });
    }
    if (status === "replied") opens.push({ id: `op_e2e_${i}a`, demoId: d.id, at: iso(lc - 3600e3) });
  }
  leads.push(lead);
}

/* Saved observations: two name another lead, one is a research note, one is fine. */
const OBS = {
  ol_e2e_01: "Your site still shows the name Amberfield Public School E2E in the footer.",
  ol_e2e_02: "curl https://bluestone-e2e.example: HTTP 200, 4.1 MB",
  ol_e2e_03: "Your admissions page does not open on a phone.",
  ol_e2e_04: "Like Bluestone Classes E2E, your fee page is missing.",
};
for (const l of leads) if (OBS[l.id]) l.observation = OBS[l.id];

/* Twelve FIRST WhatsApp messages already sent today, on closed leads. */
const WA_TODAY = 12;
const closedIds = leads.filter((l) => CLOSED.has(l.status)).map((l) => l.id);
for (let k = 0; k < WA_TODAY; k++) {
  events.push({
    id: `oe_e2e_wa${k}`,
    leadId: closedIds[k % closedIds.length],
    at: iso(Math.max(sod + 60_000 + k, now.getTime() - 5 * 60_000 + k)),
    type: "sent",
    channel: "whatsapp",
    templateId: "wa_first_new_school_en",
    detail: "seeded first WhatsApp",
  });
}

/* Two demos made in the admin that no lead points at: one from a poster, one a template duplicate. */
const POSTER_DEMO = {
  id: "ds_e2e_poster", slug: "e2e-sunflower-poster", instituteName: "Sunflower Poster Academy E2E", internalName: "e2e poster",
  kind: "coaching", market: "india", city: "Gaya", status: "draft", templateId: "c2-rural-tuition",
  createdAt: iso(now.getTime() - 3600e3), updatedAt: iso(now.getTime() - 3600e3),
};
const DUP_DEMO = {
  id: "ds_e2e_dup", slug: "e2e-maple-grove", instituteName: "Maple Grove School E2E", internalName: "e2e dup",
  kind: "school", market: "india", city: "Patna", status: "draft", templateId: "s2-rural-state-board",
  createdAt: iso(now.getTime() - 2 * 3600e3), updatedAt: iso(now.getTime() - 2 * 3600e3),
};
demos.push(POSTER_DEMO, DUP_DEMO);
slots.push({ id: POSTER_DEMO.id, poster: { provider: "openai", model: "gpt-4.1-mini", readAt: iso(now.getTime() - 3600e3) }, internalNotes: "Read from a poster" });

/* An OLD settings row: it carries the retired forced cap of 10, which must not apply any more. */
const SETTINGS = { signature: "Mehdi Alam\nIdeovent Technologies", quietStart: "20:00", quietEnd: "09:00", alertOnDemoOpen: false, whatsappDailyCap: 10 };

/* ── What the dashboard must show, computed here from the seed ─────────── */
const byStatus = Object.fromEntries(STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length]));
const openLeads = leads.filter((l) => !CLOSED.has(l.status));
const EXPECT = {
  total: leads.length,
  open: openLeads.length,
  won: byStatus.won,
  byStatus,
  overdue: openLeads.filter((l) => Date.parse(l.nextActionAt) < sod).length,
  today: openLeads.filter((l) => Date.parse(l.nextActionAt) >= sod && Date.parse(l.nextActionAt) < sod + DAY).length,
  newLast7: leads.filter((l) => Date.parse(l.createdAt) >= sod + DAY - 7 * DAY).length,
  // Hot = opened since the last contact, and the open is at most 7 days old (HOT_DAYS in derive.ts).
  hot: openLeads.filter((l) => l.lastContactedAt && opens.some((o) => o.demoId === l.demoId && Date.parse(o.at) > Date.parse(l.lastContactedAt) && Date.parse(o.at) >= now.getTime() - 7 * DAY)).length,
  unlinked: 2,
  demos: demos.length,
};
console.log("seed: " + JSON.stringify({ ...EXPECT, byStatus: undefined }) + " byStatus " + JSON.stringify(byStatus));

/* ── A small real PNG for the poster upload (as e2e-poster-import.mjs) ─── */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(w = 60, h = 90) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w * 3 + 1) + 1 + x * 3] = y < 20 ? 200 : 250;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PNG = { name: "poster.png", mimeType: "image/png", buffer: makePng() };
const POSTER_EXTRACT = {
  kind: "coaching",
  instituteName: "Lotus Point Classes E2E",
  tagline: "Physics, chemistry and maths, taught by the same three teachers",
  city: "Bokaro",
  state: "Jharkhand",
  exams: ["JEE Main"],
  classes: "Class 11 and 12",
  courses: [{ name: "Two year JEE batch", level: "Class 11", fee: "52,000", batchStart: "5 April" }],
  results: [],
  contact: { phones: ["+91 94311 22334"], email: "hello@lotuspoint-e2e.example" },
  offers: [],
  posterLanguage: "en",
};

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
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });

const opened = [];
for (const pattern of ["https://mail.google.com/**", "https://wa.me/**", "https://web.whatsapp.com/**", "https://api.whatsapp.com/**"]) {
  await context.route(pattern, (route) => {
    opened.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>intercepted by e2e-crm</p>" });
  });
}
await context.route(/\.supabase\.co|api\.emailjs\.com/, (route) => route.abort());
await context.route("**/api/poster", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, provider: "openai", model: "gpt-4.1-mini", extracted: POSTER_EXTRACT, suggestedTemplate: "c2-rural-tuition", attempts: [{ provider: "openai", status: "ok" }] }),
  }),
);
/* The negative control: the auto-lead hook answers null, as if it had never been wired in. */
let hookBroken = false;
if (NEGATIVE) {
  await context.route(/\/src\/lib\/outreach\/demoLead\.ts/, async (route) => {
    const res = await route.fetch();
    const src = await res.text();
    const broken = src.replace("const store = opts.store || outreachStore;", "return null;");
    if (broken !== src) hookBroken = true;
    return route.fulfill({ response: res, body: broken });
  });
}
/* No hot reload mid-run: other work saving files must not reload the page under the test. */
await context.addInitScript(() => {
  const Real = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (/localhost|127\.0\.0\.1/.test(String(url))) return { addEventListener() {}, removeEventListener() {}, send() {}, close() {}, readyState: 0 };
    return new Real(url, protocols);
  };
});

const errors = [];
const watch = (p, name) => {
  p.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR_FAILED/.test(m.text()) && errors.push(`${name}: ${m.text()}`));
  p.on("dialog", (d) => d.accept());
};
const page = await context.newPage();
watch(page, "admin");
/* Pages the send links open: note the URL and close them. Our own tabs are kept. */
context.on("page", async (p) => {
  await p.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  const u = p.url();
  if (!/mail\.google\.com|wa\.me|whatsapp\.com/.test(u)) return;
  opened.push(u);
  await p.close().catch(() => {});
});

const readOutreach = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), OUTREACH_KEY);
const readCms = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), CMS_KEY);
const settle = (p = page, ms = 500) => p.waitForTimeout(ms);

await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
await page.evaluate(
  ([sk, ok, ck, outreach, cms]) => {
    sessionStorage.setItem(sk, "1");
    localStorage.setItem(ok, JSON.stringify(outreach));
    localStorage.setItem(ck, JSON.stringify(cms));
  },
  [SESSION_KEY, OUTREACH_KEY, CMS_KEY, { leads, events, settings: SETTINGS }, { __format: 2, demoSites: demos, demoSiteSlots: slots, demoSiteOpens: opens }],
);

/* ── 1. The admin CRM link opens /crm in a new tab ─────────────────────── */
await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
const crmLink = page.locator("a").filter({ hasText: /^CRM/ }).first();
await crmLink.waitFor({ timeout: 15000 }).catch(() => {});
check((await crmLink.count()) > 0, "the admin sidebar has a CRM item");
check((await crmLink.getAttribute("target")) === "_blank" && /noopener/.test((await crmLink.getAttribute("rel")) || ""), "the CRM item opens in a new tab (target=_blank, rel=noopener)");
check((await page.locator('a[href="/admin/outreach"]').count()) === 0, "no admin link still points at the old /admin/outreach");
const [crm] = await Promise.all([context.waitForEvent("page"), crmLink.click()]);
watch(crm, "crm");
await crm.waitForLoadState("domcontentloaded");
await crm.waitForURL(/\/(crm|admin\/login)/, { timeout: 10000 }).catch(() => {});
await crm.waitForLoadState("networkidle").catch(() => {});
await crm.getByText(/Admin access|Dashboard/).first().waitFor({ timeout: 15000 }).catch(() => {});
await settle(crm, 800);
check(!page.url().includes("/crm"), "the admin tab stays where it was", page.url());
if (new URL(crm.url()).pathname.startsWith("/admin/login")) {
  // Local mode keeps the session per tab, so a new tab signs in again and must come back to /crm.
  pass("the new tab asks for the local sign-in (local mode keeps the session per tab)");
  await crm.evaluate((sk) => sessionStorage.setItem(sk, "1"), SESSION_KEY);
  await crm.reload({ waitUntil: "domcontentloaded" });
  await crm.waitForURL(/\/crm/, { timeout: 10000 }).catch(() => {});
}
check(new URL(crm.url()).pathname === "/crm", "the new tab lands on /crm", crm.url());
await crm.getByTestId("crm-dashboard").waitFor({ timeout: 15000 }).catch(() => {});
check(await crm.getByTestId("crm-dashboard").isVisible().catch(() => false), "the CRM dashboard renders in the new tab",
  (await crm.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300));

/* ── 2. Dashboard numbers equal the seed's ─────────────────────────────── */
await settle(crm, 800);
const tile = (testid, label) =>
  crm.evaluate(([t, l]) => {
    const a = [...document.querySelectorAll(`[data-testid="${t}"] a`)].find((x) => x.children[0]?.textContent.trim() === l);
    return a ? a.children[1].children[0].textContent.trim() : null;
  }, [testid, label]);
const LABELS = { new: "New", contacted: "Contacted", replied: "Replied", demo_opened: "Demo opened", call: "Call", proposal: "Proposal", won: "Won", lost: "Lost", do_not_contact: "Do not contact" };
const statusBars = () =>
  crm.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[data-testid="by-status"] a')].map((a) => [a.children[0].textContent.trim(), Number(a.children[2].textContent.trim())])),
  );
check((await tile("kpi-counts", "Total leads")) === String(EXPECT.total), `Total leads tile = ${EXPECT.total}`, await tile("kpi-counts", "Total leads"));
check((await tile("kpi-rates", "Open leads")) === String(EXPECT.open), `Open leads tile = ${EXPECT.open}`, await tile("kpi-rates", "Open leads"));
check((await tile("kpi-counts", "Won")) === String(EXPECT.won), `Won tile = ${EXPECT.won}`, await tile("kpi-counts", "Won"));
check((await tile("kpi-counts", "New, last 7 days")) === String(EXPECT.newLast7), `New, last 7 days tile = ${EXPECT.newLast7}`, await tile("kpi-counts", "New, last 7 days"));
check((await tile("kpi-rates", "Due today and overdue")) === String(EXPECT.today + EXPECT.overdue), `Due today and overdue tile = ${EXPECT.today + EXPECT.overdue} (${EXPECT.overdue} overdue)`, await tile("kpi-rates", "Due today and overdue"));
const bars = await statusBars();
const barsOk = STATUSES.every((s) => bars[LABELS[s]] === byStatus[s]);
check(barsOk, "every Pipeline-by-status bar equals the seed's count", JSON.stringify(bars));
const hotN = await crm.evaluate(() => document.querySelector('[data-testid="hot-leads"] h2 span')?.textContent.trim());
check(hotN === String(EXPECT.hot), `Hot leads = ${EXPECT.hot}`, hotN);
const callout = (await crm.getByTestId("unlinked-callout").innerText().catch(() => "")).replace(/\s+/g, " ");
check(callout.includes(`${EXPECT.unlinked} demos have no lead`), `the dashboard says ${EXPECT.unlinked} demos have no lead`, callout);

/* Every count tile opens a list with exactly its number of rows (Mehdi clicks a 9, he sees 9). */
const tileLinks = await crm.evaluate(() =>
  [...document.querySelectorAll('[data-testid="kpi-counts"] a')].map((a) => ({ label: a.children[0].textContent.trim(), n: a.children[1].children[0].textContent.trim(), href: a.getAttribute("href") })),
);
const tileMismatch = [];
for (const t of tileLinks) {
  await crm.goto(BASE + t.href, { waitUntil: "domcontentloaded" });
  await crm.locator('table[aria-label="Leads"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  await settle(crm, 300);
  const n = await crm.locator('table[aria-label="Leads"] tbody tr').count();
  const empty = await crm.getByText("No leads match").isVisible().catch(() => false);
  const got = empty ? 0 : n;
  if (String(got) !== t.n) tileMismatch.push(`${t.label}: tile ${t.n}, list ${got} (${t.href})`);
}
check(tileLinks.length === 8 && !tileMismatch.length, "each count tile's number equals the rows its link lists", tileMismatch.join("; ") || String(tileLinks.length));
await crm.goto(BASE + "/crm", { waitUntil: "domcontentloaded" });
await crm.getByTestId("crm-dashboard").waitFor({ timeout: 15000 }).catch(() => {});

/* ── 3. Leads table ────────────────────────────────────────────────────── */
const rowsSel = 'table[aria-label="Leads"] tbody tr';
const names = () => crm.$$eval(`${rowsSel} td:nth-child(2)`, (tds) => tds.map((td) => td.querySelector("span span")?.textContent.trim() || ""));
const rowCount = () => crm.locator(rowsSel).count();
const viewCounts = () =>
  crm.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[role="tablist"][aria-label="Saved views"] [role="tab"]')].map((b) => [b.childNodes[0].textContent.trim(), Number(b.querySelector("span")?.textContent)])),
  );
await crm.goto(BASE + "/crm/leads", { waitUntil: "domcontentloaded" });
await crm.locator(rowsSel).first().waitFor({ timeout: 15000 });
await settle(crm);
const vc = await viewCounts();
const EXPECT_VIEWS = {
  "All open": EXPECT.open,
  All: EXPECT.total,
  New: byStatus.new,
  Won: byStatus.won,
  "Lost and DNC": byStatus.lost + byStatus.do_not_contact,
  "Follow-up due": EXPECT.today + EXPECT.overdue,
  Hot: EXPECT.hot,
};
const badViews = Object.entries(EXPECT_VIEWS).filter(([k, v]) => vc[k] !== v);
check(!badViews.length, "saved-view counts equal the seed (All open, All, New, Won, Lost and DNC, Follow-up due, Hot)", JSON.stringify({ got: vc, want: EXPECT_VIEWS }));
check((await rowCount()) === EXPECT.open, `the default view lists the ${EXPECT.open} open leads`, String(await rowCount()));
await crm.getByRole("tab", { name: /^Won/ }).click();
await settle(crm, 300);
const wonSelects = await crm.$$eval(`${rowsSel} select`, (s) => s.map((x) => x.value));
check(/view=won/.test(crm.url()) && wonSelects.length === byStatus.won && wonSelects.every((v) => v === "won"), "the Won view shows only the won leads and is in the URL", `${crm.url()} ${JSON.stringify(wonSelects)}`);

await crm.getByRole("tab", { name: /^All\s*\d+$/ }).click();
await settle(crm, 300);
check((await rowCount()) === EXPECT.total, `the All view lists all ${EXPECT.total} leads`, String(await rowCount()));
await crm.locator("thead button", { hasText: "Institute" }).click();
await settle(crm, 300);
const asc = await names();
const sortedAsc = leads.map((l) => l.instituteName).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
check(JSON.stringify(asc) === JSON.stringify(sortedAsc), "sorting by Institute puts the names A to Z", asc.slice(0, 3).join(", "));
await crm.locator("thead button", { hasText: "Institute" }).click();
await settle(crm, 300);
check(JSON.stringify(await names()) === JSON.stringify([...sortedAsc].reverse()), "a second click sorts Z to A", (await names()).slice(0, 3).join(", "));

await crm.locator('select[aria-label="City"]').selectOption("Gaya");
await settle(crm, 400);
const gaya = leads.filter((l) => l.city === "Gaya").map((l) => l.instituteName).sort();
check(/city=Gaya/.test(crm.url()) && JSON.stringify((await names()).sort()) === JSON.stringify(gaya), `the City filter shows exactly the ${gaya.length} Gaya leads`, `${await rowCount()} rows`);
await crm.locator('select[aria-label="City"]').selectOption("Patna");
await crm.locator('select[aria-label="Assigned"]').selectOption("Aman");
await settle(crm, 400);
const patnaAman = leads.filter((l) => l.city === "Patna" && l.assignedTo === "Aman").map((l) => l.instituteName).sort();
check(patnaAman.length > 0 && JSON.stringify((await names()).sort()) === JSON.stringify(patnaAman), `City plus Assigned filters combine (${patnaAman.length} Patna leads assigned to Aman)`, JSON.stringify(await names()));
await crm.locator('select[aria-label="Assigned"]').selectOption("");
await crm.locator('select[aria-label="City"]').selectOption("");
await settle(crm, 300);

const search = crm.locator('input[type="search"][placeholder^="Name"]');
await search.fill("juniper");
await settle(crm, 600);
check(JSON.stringify(await names()) === JSON.stringify(["Juniper Classes E2E"]), "search by name finds the one lead", JSON.stringify(await names()));
await search.fill("40017");
await settle(crm, 600);
check(JSON.stringify(await names()) === JSON.stringify([leads[17].instituteName]), "search by phone digits finds the one lead", JSON.stringify(await names()));
await search.fill("");
await settle(crm, 600);

const [dlAll] = await Promise.all([crm.waitForEvent("download"), crm.locator('button[title="Export this view as CSV"]').click()]);
const csvAll = readFileSync(await dlAll.path(), "utf8").replace(/^﻿/, "");
const csvLines = csvAll.split(/\r\n/).filter(Boolean);
check(csvLines[0].startsWith("Institute,") && csvLines.length === EXPECT.total + 1, `Export writes a CSV of the view (${EXPECT.total} rows plus the header)`, `${csvLines.length} lines, head ${csvLines[0].slice(0, 40)}`);
check(leads.every((l) => csvAll.includes(l.instituteName)), "the export carries every lead's name");

/* Bulk: three Ranchi leads to Proposal. */
const BULK = [leads[2], leads[6], leads[10]];
await crm.locator('select[aria-label="City"]').selectOption("Ranchi");
await settle(crm, 400);
for (const l of BULK) await crm.getByRole("checkbox", { name: `Select ${l.instituteName}` }).click();
const bar = crm.getByRole("toolbar", { name: "Bulk actions" });
check(/3 selected/.test(await bar.innerText().catch(() => "")), "selecting three rows shows the bulk bar with 3 selected");
const [dlSel] = await Promise.all([crm.waitForEvent("download"), bar.getByRole("button", { name: /Export CSV/ }).click()]);
const csvSel = readFileSync(await dlSel.path(), "utf8").replace(/^﻿/, "").split(/\r\n/).filter(Boolean);
check(csvSel.length === 4 && BULK.every((l) => csvSel.some((x) => x.startsWith(l.instituteName))), "bulk Export CSV writes only the 3 selected leads", `${csvSel.length} lines`);
await bar.getByRole("button", { name: /Set status/ }).click();
await crm.getByRole("menuitem", { name: /Proposal/ }).click();
await crm.getByText("Status set to Proposal.").waitFor({ timeout: 5000 }).catch(() => {});
await settle(crm, 500);
let store = await readOutreach(crm);
const bulkOk = BULK.every((l) => store.leads.find((x) => x.id === l.id)?.status === "proposal");
const bulkEvents = BULK.map((l) => store.events.find((e) => e.leadId === l.id && e.type === "status" && /to Proposal$/.test(e.detail || "")));
check(bulkOk, "bulk Set status saves Proposal on all three leads", JSON.stringify(BULK.map((l) => store.leads.find((x) => x.id === l.id)?.status)));
check(bulkEvents.every(Boolean), "each of the three gets a 'Status: X to Proposal' history event", JSON.stringify(bulkEvents.map((e) => e?.detail)));
check(store.leads.filter((l) => l.status === "proposal").length === byStatus.proposal + 3, "no other lead changed status");
await crm.locator('select[aria-label="City"]').selectOption("");

/* The dashboard follows the change. */
await crm.goto(BASE + "/crm", { waitUntil: "domcontentloaded" });
await crm.getByTestId("by-status").waitFor({ timeout: 10000 });
await settle(crm);
const bars2 = await statusBars();
check(bars2.Proposal === byStatus.proposal + 3 && bars2.Won === byStatus.won - 1, "the dashboard's status bars follow the bulk change", JSON.stringify(bars2));

/* ── 4. Pipeline: drag New to Contacted ───────────────────────────────── */
const DRAG = leads[18];
await crm.goto(BASE + "/crm/pipeline", { waitUntil: "domcontentloaded" });
const card = crm.locator(`[data-card="${DRAG.id}"]`);
await card.waitFor({ timeout: 10000 });
check((await crm.locator('section[aria-label="New"]').locator(`[data-card="${DRAG.id}"]`).count()) === 1, `${DRAG.instituteName} starts in the New column`);
await card.dragTo(crm.locator('section[aria-label="Contacted"]'));
await settle(crm, 800);
store = await readOutreach(crm);
check(store.leads.find((l) => l.id === DRAG.id)?.status === "contacted", "dragging the card to Contacted saves the status", store.leads.find((l) => l.id === DRAG.id)?.status);
check(store.events.some((e) => e.leadId === DRAG.id && e.type === "status" && e.detail === "Status: New to Contacted"), "the drag writes a 'Status: New to Contacted' event");
check((await crm.locator('section[aria-label="Contacted"]').locator(`[data-card="${DRAG.id}"]`).count()) === 1, "the card now sits in the Contacted column");

/* ── 5. Lead page: compose per lead, every link is that lead's own ─────── */
const blockersOf = (scope) => scope.locator('[aria-label="Blocked"]').innerText().catch(() => "");
async function emailLink(lead) {
  const compose = crm.getByTestId("compose");
  await compose.getByRole("tab", { name: /^email/i }).click();
  await compose.locator("#obs-pick").selectOption("no_website");
  await settle(crm, 300);
  const g = compose.getByTestId("open-gmail");
  if ((await g.evaluate((el) => el.tagName)) !== "A") return { blocked: await blockersOf(compose) };
  return { href: (await g.getAttribute("href")) || "" };
}
async function whatsappLink() {
  const compose = crm.getByTestId("compose");
  await compose.getByRole("tab", { name: /^whatsapp/i }).click();
  await settle(crm, 300);
  const w = compose.getByTestId("open-whatsapp");
  const text = (await compose.innerText()).replace(/\s+/g, " ");
  if ((await w.evaluate((el) => el.tagName)) !== "A") return { blocked: await blockersOf(compose), text };
  return { href: (await w.getAttribute("href")) || "", text };
}
const othersIn = (text, lead) => leads.filter((l) => l.id !== lead.id && text.includes(l.instituteName)).map((l) => l.instituteName);
function checkEmail(lead, r, tag) {
  if (!r.href) return fail(`${tag}: Open in Gmail is blocked for ${lead.instituteName}: ${r.blocked}`);
  const u = new URL(r.href);
  const body = `${u.searchParams.get("su") || ""}\n${u.searchParams.get("body") || ""}`;
  check(u.searchParams.get("to") === lead.email, `${tag}: the Gmail link is addressed to ${lead.email}`, u.searchParams.get("to"));
  check(!othersIn(body, lead).length, `${tag}: the email names no other lead`, othersIn(body, lead).join(", "));
  check(!/EDITMARK/.test(body) || body.includes(`EDITMARK-${lead.id}`), `${tag}: no text edited on another lead leaks into this email`);
  return body;
}

const A = leads[0];
const B = leads[9];
await crm.goto(BASE + `/crm/leads/${A.id}`, { waitUntil: "domcontentloaded" });
await crm.getByTestId("compose").waitFor({ timeout: 15000 });
check((await crm.getByTestId("lead-name").innerText()) === A.instituteName, `/crm/leads/${A.id} opens ${A.instituteName}`);
const eA = await emailLink(A);
checkEmail(A, eA, "lead A");
await crm.locator("#msg-body").fill(((await crm.locator("#msg-body").inputValue()) || "") + `\nEDITMARK-${A.id}`);
await settle(crm, 300);
const eA2 = await emailLink(A);
check(eA2.href && new URL(eA2.href).searchParams.get("body").includes(`EDITMARK-${A.id}`), "lead A: an edit to the text goes into lead A's Gmail link");
const wA = await whatsappLink();
if (wA.href) check(wA.href.startsWith(`https://wa.me/${A.phone.slice(1)}?text=`), `lead A: Open in WhatsApp is a wa.me link to ${A.phone}`, wA.href.slice(0, 60));
else fail(`lead A: Open in WhatsApp is blocked: ${wA.blocked}`);

/* To lead B in place (the router moves, the screen stays), as Next lead and back/forward do. */
await crm.evaluate((id) => {
  history.pushState({}, "", `/crm/leads/${id}`);
  dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
}, B.id);
await crm.waitForFunction((n) => document.querySelector('[data-testid="lead-name"]')?.textContent === n, B.instituteName, { timeout: 8000 }).catch(() => {});
check((await crm.getByTestId("lead-name").innerText()) === B.instituteName, `moving in place to /crm/leads/${B.id} shows ${B.instituteName}`);
const eB = await emailLink(B);
const bodyB = checkEmail(B, eB, "lead B");
check(bodyB !== undefined && !bodyB.includes(`EDITMARK-${A.id}`), "lead B: lead A's edit is not in lead B's email");
const wB = await whatsappLink();
if (wB.href) {
  check(wB.href.startsWith(`https://wa.me/${B.phone.slice(1)}?text=`), `lead B: Open in WhatsApp goes to ${B.phone}`, wB.href.slice(0, 60));
  check(!othersIn(decodeURIComponent(wB.href.split("?text=")[1] || ""), B).length, "lead B: the WhatsApp text names no other lead");
} else fail(`lead B: Open in WhatsApp is blocked: ${wB.blocked}`);
await crm.getByTestId("compose").getByTestId("open-whatsapp").click().catch(() => {});
await settle(crm, 1200);
check(opened.some((u) => u.startsWith(`https://wa.me/${B.phone.slice(1)}`)), "clicking Open in WhatsApp opens lead B's wa.me URL (intercepted)");
store = await readOutreach(crm);
check(store.events.some((e) => e.leadId === B.id && e.type === "sent" && e.channel === "whatsapp"), "the WhatsApp send is recorded on lead B, not lead A");
check(!store.events.some((e) => e.leadId === A.id && e.type === "sent"), "nothing was recorded as sent to lead A");

/* ── 6. Demos: the poster demo and the duplicate, with no lead ─────────── */
const demoRows = () =>
  crm.$$eval('[data-testid="demo-table"] tbody tr', (trs) =>
    trs.map((tr) => ({ name: tr.children[0].querySelector("span")?.textContent.trim(), source: tr.children[2].querySelector("span")?.textContent.trim(), lead: tr.children[4].textContent.trim() })),
  );
await crm.goto(BASE + "/crm/demos", { waitUntil: "domcontentloaded" });
await crm.getByTestId("demo-table").waitFor({ timeout: 10000 });
await settle(crm);
let dr = await demoRows();
const posterRow = dr.find((r) => r.name === POSTER_DEMO.instituteName);
const dupRow = dr.find((r) => r.name === DUP_DEMO.instituteName);
check(dr.length === EXPECT.unlinked && (await crm.getByRole("tab", { name: /^No lead/ }).getAttribute("aria-selected")) === "true",`Demos opens on "No lead" with the ${EXPECT.unlinked} unlinked demos`, JSON.stringify(dr));
check(posterRow?.source === "Poster" && /No lead/.test(posterRow?.lead || ""), "the poster-made demo is listed as Poster, No lead", JSON.stringify(posterRow));
check(dupRow?.source === "Template" && /No lead/.test(dupRow?.lead || ""), "the template duplicate is listed as Template, No lead", JSON.stringify(dupRow));
await crm.getByRole("tab", { name: /^All/ }).click();
await settle(crm, 300);
dr = await demoRows();
check(dr.length === EXPECT.demos, `the All view lists all ${EXPECT.demos} demos`, String(dr.length));
const linkedOk = demos.filter((d) => d.id !== POSTER_DEMO.id && d.id !== DUP_DEMO.id).every((d) => dr.find((r) => r.name === d.instituteName)?.lead.includes(d.instituteName));
check(linkedOk, "every seeded demo shows the lead it belongs to");

/* Create lead for the poster demo. */
await crm.getByRole("tab", { name: /^No lead/ }).click();
await settle(crm, 300);
await crm.locator('[data-testid="demo-table"] tbody tr', { hasText: POSTER_DEMO.instituteName }).getByTestId("demo-create-lead-btn").click();
const cdlg = crm.getByTestId("demo-create-lead");
await cdlg.waitFor({ timeout: 5000 });
check((await crm.locator("#dl-name").inputValue()) === POSTER_DEMO.instituteName && (await crm.locator("#dl-city").inputValue()) === "Gaya", "Create lead is prefilled from the demo (name, city)");
await crm.locator("#dl-phone").fill("98100 55555");
await cdlg.getByRole("button", { name: "Create lead" }).click();
await crm.waitForURL(/\/crm\/leads\/ol_/, { timeout: 8000 }).catch(() => {});
store = await readOutreach(crm);
const posterLead = store.leads.find((l) => l.demoId === POSTER_DEMO.id);
check(posterLead && posterLead.instituteName === POSTER_DEMO.instituteName && posterLead.source === "demo-created" && posterLead.demoSlug === POSTER_DEMO.slug && posterLead.phone === "+919810055555",
  "Create lead saves a lead linked to the poster demo (source demo-created)", JSON.stringify(posterLead));
check(posterLead && crm.url().endsWith(`/crm/leads/${posterLead.id}`), "and opens the new lead's page", crm.url());

/* Link the duplicate to an existing lead with no demo. */
const LINK_TO = leads[34];
await crm.goto(BASE + "/crm/demos", { waitUntil: "domcontentloaded" });
const crmLoadedAt = Date.now();
await crm.getByTestId("demo-table").waitFor({ timeout: 10000 });
await crm.getByRole("button", { name: `More actions for ${DUP_DEMO.instituteName}` }).click();
await crm.getByRole("menuitem", { name: /Link to lead/ }).click();
await crm.getByTestId("demo-link-lead").waitFor({ timeout: 5000 });
await crm.locator("#dl-search").fill("Kestrel");
await settle(crm, 300);
await crm.getByTestId("demo-link-lead").getByRole("button", { name: new RegExp(LINK_TO.instituteName) }).click();
await crm.getByText(`/site/${DUP_DEMO.slug} is linked to ${LINK_TO.instituteName}.`).waitFor({ timeout: 5000 }).catch(() => {});
store = await readOutreach(crm);
const linked = store.leads.find((l) => l.id === LINK_TO.id);
check(linked?.demoId === DUP_DEMO.id && linked?.demoSlug === DUP_DEMO.slug, `Link to lead links the duplicate to ${LINK_TO.instituteName}`, JSON.stringify({ demoId: linked?.demoId }));
check(store.events.some((e) => e.leadId === LINK_TO.id && e.type === "note" && e.detail.includes(DUP_DEMO.slug)), "and writes a history note on that lead");
await settle(crm, 600);
const stuck = await crm.evaluate(() => ({ body: document.body.style.pointerEvents, dialogs: document.querySelectorAll('[role="dialog"]').length }));
check(stuck.body !== "none" && stuck.dialogs === 0, "the dialog closes and the page takes clicks again", JSON.stringify(stuck));
if (stuck.body === "none") await crm.evaluate(() => (document.body.style.pointerEvents = ""));
await crm.getByRole("tab", { name: /^All/ }).click();
await settle(crm, 300);
dr = await demoRows();
check(dr.every((r) => !/No lead/.test(r.lead)), "after both, no demo is left without a lead", JSON.stringify(dr.filter((r) => /No lead/.test(r.lead))));

/* ── 7. A new duplicate or poster demo auto-creates its CRM lead ───────── */
const warnings = [];
const warn = (m) => {
  warnings.push(m);
  console.log("WARN  " + m);
};
const leadsBefore = (await readOutreach(page)).leads.length;
async function duplicateFromTemplates(name, city) {
  await page.goto(BASE + "/admin/templates", { waitUntil: "domcontentloaded" });
  const dup = page.getByRole("button", { name: /^Duplicate the .* template into a new draft demo$/ }).first();
  await dup.waitFor({ timeout: 15000 });
  await dup.click();
  await page.locator("#dup-name").fill(name);
  await page.locator("#dup-city").fill(city);
  await page.getByRole("button", { name: /make the draft/i }).click();
  await page.waitForURL(/\/admin\/c\/demoSites/, { timeout: 15000 }).catch(() => {});
  await settle(page, 800);
  return ((await readCms(page)).demoSites || []).find((d) => d.instituteName === name && !demos.some((s) => s.id === d.id) && !made.includes(d.id));
}
const made = [];
const NEW_NAME = "Wisteria Heights School E2E";
const newDemo = await duplicateFromTemplates(NEW_NAME, "Bokaro");
check(Boolean(newDemo), "Duplicate in the Templates tab makes a new draft demo");
if (newDemo) made.push(newDemo.id);
store = await readOutreach(page);
const autoLead = newDemo && store.leads.find((l) => l.demoId === newDemo.id);
check(Boolean(autoLead) && autoLead.instituteName === NEW_NAME && autoLead.source === "demo-created" && autoLead.status === "new" && autoLead.city === "Bokaro" && autoLead.demoSlug === newDemo.slug,
  "the new duplicate auto-creates a CRM lead (New, source demo-created, demo linked)", JSON.stringify(autoLead || null));
check(store.leads.length === leadsBefore + 1, "exactly one lead was added", `${leadsBefore} -> ${store.leads.length}`);
check(Boolean(autoLead) && store.events.some((e) => e.leadId === autoLead.id && /Lead created from demo/.test(e.detail || "")), "the auto-created lead's history says where it came from");

/* A duplicate for an institute that is already a lead links to it instead of adding a second one. */
const again = await duplicateFromTemplates(B.instituteName, B.city);
if (again) made.push(again.id);
store = await readOutreach(page);
const bNow = store.leads.find((l) => l.id === B.id);
check(Boolean(again) && bNow?.demoId === again.id && store.leads.length === leadsBefore + 1, `a duplicate named like an existing lead (${B.instituteName}) links to that lead, no second lead`,
  JSON.stringify({ demo: again?.id, leadDemo: bNow?.demoId, count: store.leads.length }));

/* A poster upload (the case Mehdi reported) auto-creates its lead too. */
await page.goto(BASE + "/admin/templates", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Create from poster" }).first().click();
await page.locator('[data-testid="poster-file"]').setInputFiles(PNG);
await page.getByRole("button", { name: "Read the poster" }).click();
await page.getByText("Check what was read").waitFor({ timeout: 15000 }).catch(() => {});
await page.getByRole("button", { name: /^Create demo/ }).click();
await page.waitForURL(/\/admin\/c\/demoSites/, { timeout: 15000 }).catch(() => {});
await settle(page, 800);
const posterDemo = ((await readCms(page)).demoSites || []).find((d) => d.instituteName === POSTER_EXTRACT.instituteName);
if (posterDemo) made.push(posterDemo.id);
store = await readOutreach(page);
const posterAuto = posterDemo && store.leads.find((l) => l.demoId === posterDemo.id);
check(Boolean(posterDemo), "Create from poster makes a demo");
check(Boolean(posterAuto) && posterAuto.instituteName === POSTER_EXTRACT.instituteName && posterAuto.phone === "+919431122334" && posterAuto.source === "demo-created",
  "the poster demo auto-creates a CRM lead with the poster's phone", JSON.stringify(posterAuto || null));

/* The CRM tab stayed open on Demos the whole time. Coming back to it re-reads
   the data (at most every 15 s): the new demos must show without a reload. */
await crm.bringToFront();
await crm.waitForTimeout(Math.max(0, 16_000 - (Date.now() - crmLoadedAt)));
await crm.evaluate(() => window.dispatchEvent(new Event("focus")));
await settle(crm, 2000);
dr = await demoRows();
check(dr.some((r) => r.name === NEW_NAME && r.lead.includes(NEW_NAME)) && dr.some((r) => r.name === POSTER_EXTRACT.instituteName),
  "returning to the open CRM tab shows the demos just made in the admin tab, with their leads, without a reload",
  JSON.stringify(dr.filter((r) => /Wisteria|Lotus/.test(r.name))));
/* A CMS write from that tab (Mark sent) must not wipe the demos the admin tab made meanwhile. */
await crm.locator('[data-testid="demo-table"] tbody tr', { hasText: POSTER_DEMO.instituteName }).getByRole("button", { name: /Mark sent/ }).click();
await settle(crm, 800);
const cmsNow = await readCms(crm);
const kept = made.filter((id) => (cmsNow.demoSites || []).some((d) => d.id === id));
check(kept.length === made.length, `Mark sent in the CRM tab keeps the ${made.length} demos made in the admin tab`, `${kept.length} of ${made.length} still stored`);
check((cmsNow.demoSites || []).find((d) => d.id === POSTER_DEMO.id)?.status === "sent", "and the poster demo is marked sent");

/* Back in the CRM tab, reloaded. */
await crm.bringToFront();
await crm.goto(BASE + "/crm/leads?view=all", { waitUntil: "domcontentloaded" });
await crm.locator(rowsSel).first().waitFor({ timeout: 10000 });
await settle(crm);
const allNames = await names();
check(allNames.includes(NEW_NAME) && allNames.includes(POSTER_EXTRACT.instituteName), "the CRM leads table lists both auto-created leads");
await crm.goto(BASE + "/crm/demos?view=all", { waitUntil: "domcontentloaded" });
await crm.getByTestId("demo-table").waitFor({ timeout: 10000 });
await settle(crm);
dr = await demoRows();
const nd = dr.find((r) => r.name === NEW_NAME);
const pd = dr.find((r) => r.name === POSTER_EXTRACT.instituteName);
check(nd?.lead.includes(NEW_NAME) && nd?.source === "Template", "CRM Demos lists the new duplicate with its lead", JSON.stringify(nd || null));
check(pd?.lead.includes(POSTER_EXTRACT.instituteName) && pd?.source === "Poster", "CRM Demos lists the new poster demo, as Poster, with its lead", JSON.stringify(pd || null));

/* ── 8. WhatsApp: no cap when the limit is blank, capped when one is set ── */
async function waState() {
  await crm.goto(BASE + `/crm/leads/${A.id}`, { waitUntil: "domcontentloaded" });
  await crm.getByTestId("compose").waitFor({ timeout: 10000 });
  await settle(crm, 400);
  const r = await whatsappLink();
  const blockers = r.href ? "" : r.blocked;
  const m = /(\d+) first WhatsApp messages? sent today|First WhatsApp messages today: (\d+) of (\d+)/.exec(r.text);
  return { ...r, blockers, sentToday: m ? Number(m[1] || m[2]) : NaN, limit: m && m[3] ? Number(m[3]) : null };
}
async function setLimit(v) {
  await crm.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
  await crm.locator("#set-cap").waitFor({ timeout: 10000 });
  await crm.locator("#set-cap").fill(v);
  await crm.getByRole("button", { name: /save settings/i }).click();
  await settle(crm, 600);
  return (await readOutreach(crm)).settings || {};
}
let wa = await waState();
check(wa.sentToday >= WA_TODAY && wa.limit === null, `with the limit blank the lead page counts ${wa.sentToday} first WhatsApp messages today, with no "of N"`, wa.text.match(/[^.]*WhatsApp messages?[^.]*\./)?.[0]);
check(!/Daily WhatsApp limit/.test(wa.blockers) && Boolean(wa.href), `past 10 sends (the retired cap in the old settings row) WhatsApp is still open`, wa.blockers);
const todayText = await (async () => {
  await crm.goto(BASE + "/crm/today", { waitUntil: "domcontentloaded" });
  await crm.getByTestId("sent-today").waitFor({ timeout: 10000 }).catch(() => {});
  return (await crm.getByTestId("crm-today").innerText().catch(() => "")).replace(/\s+/g, " ");
})();
check(/Sent today/.test(todayText) && !/of 10\b/.test(todayText), "Today shows what was sent today, with no cap of 10", todayText.match(/Sent today[^.]*/)?.[0]);

let saved = await setLimit("5");
check(saved.whatsappDailyLimit === 5, "Settings saves a daily limit of 5", JSON.stringify(saved.whatsappDailyLimit));
wa = await waState();
check(/Daily WhatsApp limit reached \(\d+ of 5/.test(wa.blockers) && !wa.href, "with a limit of 5 the first WhatsApp is blocked on the lead page", wa.blockers || "not blocked");
check(wa.limit === 5, "and the line under Send reads 'N of 5'", String(wa.limit));

saved = await setLimit("");
check(!saved.whatsappDailyLimit, "clearing the box saves no limit", JSON.stringify(saved.whatsappDailyLimit));
wa = await waState();
check(!/Daily WhatsApp limit/.test(wa.blockers) && Boolean(wa.href), "with the limit cleared WhatsApp is open again", wa.blockers);

/* ── 9. Clean saved observations clears only the chosen leads ─────────── */
await crm.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
const clean = crm.getByTestId("clean-observations");
await clean.waitFor({ timeout: 10000 });
await settle(crm);
const listed = await clean.locator("li").allInnerTexts();
const dirtyIds = ["ol_e2e_01", "ol_e2e_02", "ol_e2e_04"];
const nameOf = (id) => leads.find((l) => l.id === id).instituteName;
check(listed.length === 3 && dirtyIds.every((id) => listed.some((t) => t.includes(nameOf(id)))), "it lists the two observations naming another lead and the research note, not the good one", JSON.stringify(listed.map((t) => t.split("\n")[0])));
await clean.locator("li", { hasText: nameOf("ol_e2e_04") }).getByRole("checkbox").uncheck();
const before = await readOutreach(crm);
await clean.getByRole("button", { name: /Clear 2 observations/ }).click();
await clean.getByText("Cleared 2 saved observations.").waitFor({ timeout: 5000 }).catch(() => {});
const after = await readOutreach(crm);
const obs = (s, id) => s.leads.find((l) => l.id === id)?.observation;
check(!obs(after, "ol_e2e_01") && !obs(after, "ol_e2e_02"), "the two ticked observations are cleared");
check(obs(after, "ol_e2e_04") === OBS.ol_e2e_04, "the one left unticked keeps its observation");
check(obs(after, "ol_e2e_03") === OBS.ol_e2e_03, "a good observation is untouched");
const same = (id) => {
  const a = { ...before.leads.find((l) => l.id === id) };
  const b = { ...after.leads.find((l) => l.id === id) };
  delete a.observation; delete b.observation; delete a.updatedAt; delete b.updatedAt;
  return JSON.stringify(a) === JSON.stringify(b);
};
check(same("ol_e2e_01") && same("ol_e2e_02"), "clearing touches nothing else on those leads");
check(after.leads.length === before.leads.length && after.events.length === before.events.length, "no lead or event was added or removed");

/* ── Result ────────────────────────────────────────────────────────────── */
const dashes = await crm.evaluate(() => /[–—]/.test(document.body.innerText));
check(!dashes, "no en or em dash on the last CRM screen");
check(!errors.length, "no page errors or console errors", errors.slice(0, 5).join(" | "));
await browser.close();

console.log("");
if (NEGATIVE) {
  if (!hookBroken) {
    console.log("NEGATIVE CONTROL INVALID: demoLead.ts was not rewritten, so nothing was proved.");
    process.exit(3);
  }
  console.log(`negative control: the auto-lead hook was broken; ${findings.length} check(s) failed (they must include the auto-lead ones).`);
}
if (warnings.length) console.log(`${warnings.length} warning(s):\n  ` + warnings.join("\n  "));
if (findings.length) {
  console.log(`${findings.length} FAILED:\n  ` + findings.join("\n  "));
  process.exit(1);
}
console.log("e2e-crm: all checks passed");
