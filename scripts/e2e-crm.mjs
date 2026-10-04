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
 *   5. the lead page: compose per lead, every link built for THAT lead (the first
 *      e-mail carries only that lead's own sample link, or none: 2 Oct 2026);
 *   6. the Demos tab lists a poster demo and a template duplicate with no lead,
 *      and Create lead / Link to lead work on them;
 *   7. a NEW duplicate (and a new poster demo) auto-creates a CRM lead, and a
 *      duplicate for an institute that is already a lead links instead;
 *   8. WhatsApp: no cap with the limit blank (even with the retired cap of 10
 *      in an old settings row), capped once a limit is set;
 *   9. Clean saved observations clears only the leads left ticked;
 *  10. dental clinics (28 Sep 2026): the Kind filter, the breakdown, the
 *      pipeline card, a new dental lead with a d1..d7 demo and a dental
 *      e-mail that carries only its own sample link, and Create lead from a
 *      dental demo;
 *  11. the CRM on its own subdomain (30 Sep 2026), with crm.localhost standing
 *      in for crm.ideovent.in: screens at the root, no /crm in any link, and
 *      every link to the admin or a demo absolute to the main site. On the
 *      main site's /crm the same links stay relative (checked in 10);
 *  12. every stage in plain words (30 Sep 2026, the approved wording): seeded
 *      leads at New, Contacted, Replied, Call and Proposal each open on their
 *      own stage, Today names the stage, the after-call [blanks] keep Send off
 *      until filled, and the Call script card speaks as a patient, a parent or
 *      a student sees it. The first e-mail carries only that lead's own sample
 *      link, or none (checked in 5).
 *
 * E-mail opens in Zoho Mail in the browser or in the mail app (2 Oct 2026;
 * Open in Gmail was removed 28 Sep 2026): Open in mail app is a mailto: link,
 * and no Gmail link or wording may show, even with an old "Gmail account"
 * still in the saved settings.
 *
 * The seed is 40 fictional leads (`ol_e2e_NN`), their demos, opens and
 * events, written to a fresh browser profile's localStorage. Nothing leaves
 * the machine: WhatsApp URLs, Zoho Mail, Supabase, EmailJS, /api/poster and (section 11)
 * the main site's address are answered here, and a mailto: click is recorded
 * and never handed to a mail app.
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
  // Every tenth lead from the sixth on is a dental clinic (Foxglove, Pinecrest, Birchwood, Larkspur).
  const kind = i % 10 === 5 ? "dental" : i % 2 ? "coaching" : "school";
  const status = STATUSES[i % 9];
  const created = now.getTime() - i * DAY - 60_000;
  const lead = {
    id: `ol_e2e_${pad(i)}`,
    createdAt: iso(created),
    updatedAt: iso(created),
    instituteName: `${word} ${kind === "school" ? "Public School" : kind === "dental" ? "Dental Clinic" : "Classes"} E2E`,
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
      templateId: kind === "school" ? "s2-rural-state-board" : kind === "dental" ? "d1-family-dentist" : "c2-rural-tuition",
      createdAt: iso(created),
      updatedAt: iso(created),
    };
    demos.push(d);
    slots.push({ id: d.id, sentTo: lead.instituteName, sentAt: lead.lastContactedAt || iso(created) });
    lead.demoId = d.id;
    lead.demoSlug = d.slug;
    const lc = lead.lastContactedAt ? Date.parse(lead.lastContactedAt) : 0;
    /* Its link went in a first message With link, ten minutes before the seeded send (crm-fixes-1004 items 2, 3:
       a demo is Sent, and its opens are the lead's, only after a message carried its link). */
    if (lc) {
      events.push({ id: `oe_e2e_l${i}`, leadId: lead.id, at: iso(lc - 10 * 60_000), type: "sent", channel: i % 2 ? "whatsapp" : "email",
        templateId: i % 2 ? "wa_first_new_any_en_link" : "em_first_new_any_en_link", stage: "first", detail: "seeded first message with the link" });
    }
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

/* An OLD settings row: it carries the retired forced cap of 10, which must not apply any more, and
   the retired "Gmail account for Open in Gmail" (senderGmail), which must show nowhere and do nothing. */
const SETTINGS = { signature: "Mehdi Alam\nIdeovent Technologies", quietStart: "20:00", quietEnd: "09:00", alertOnDemoOpen: false, whatsappDailyCap: 10, senderGmail: "old-setting@gmail.example" };

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
  // Hot = the lead's own demo opened since the last contact (and after its link went: derive.ts leadOpens), at most
  // 7 days ago (HOT_DAYS in derive.ts). The seed's link went ten minutes before the last contact.
  hot: openLeads.filter((l) => l.lastContactedAt && events.some((e) => e.leadId === l.id && /_link$/.test(e.templateId || ""))
    && opens.some((o) => o.demoId === l.demoId && Date.parse(o.at) > Date.parse(l.lastContactedAt) && Date.parse(o.at) >= now.getTime() - 7 * DAY)).length,
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
for (const pattern of [
  "https://mail.google.com/**", "https://wa.me/**", "https://web.whatsapp.com/**", "https://api.whatsapp.com/**",
  "https://mail.zoho.in/**", "https://mail.zoho.com/**", "https://accounts.zoho.in/**", "https://accounts.zoho.com/**",
]) {
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
  /* A mailto: click is recorded and stopped in the capture phase; React's click handler still runs. */
  window.__mailto = [];
  window.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="mailto:"]') : null;
    if (!a) return;
    window.__mailto.push(a.getAttribute("href"));
    e.preventDefault();
  }, true);
  window.__copied = [];
  if (window.Clipboard) Clipboard.prototype.writeText = function (t) { window.__copied.push(String(t)); return Promise.resolve(); };
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
/* Pages the send links open: note the URL and close them. Our own tabs are kept. A send that puts a draft
   demo on the website first opens its tab blank and navigates it after the write (2 Oct 2026): wait for it. */
context.on("page", async (p) => {
  await p.waitForURL((u) => u.href !== "about:blank", { timeout: 5000 }).catch(() => {});
  await p.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  const u = p.url();
  if (!/mail\.google\.com|zoho\.|wa\.me|whatsapp\.com/.test(u)) return;
  opened.push(u);
  await p.close().catch(() => {});
});

const readOutreach = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), OUTREACH_KEY);
const readCms = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), CMS_KEY);
const settle = (p = page, ms = 500) => p.waitForTimeout(ms);
/* How long a screen may take to show after a navigation. Generous on purpose: a dev server that is
   transforming modules for other work can take well over 10 s. A screen that never shows still fails. */
const PAGE_WAIT = 30_000;

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

/* crm-fixes-1004 item 11: the activity chart's y-axis labels sit inside the chart (they read "0" when cut). */
{
  const ax = await crm.evaluate(() => {
    const box = document.querySelector('[data-testid="activity-chart"] .recharts-wrapper')?.getBoundingClientRect();
    const ticks = [...document.querySelectorAll('[data-testid="activity-chart"] .recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => {
      const r = t.getBoundingClientRect();
      return { text: t.textContent, left: r.left, right: r.right };
    });
    return { left: box ? box.left : null, ticks };
  });
  check(ax.left !== null && ax.ticks.length > 1 && ax.ticks.every((t) => t.left >= ax.left - 0.5),
    "the chart's y-axis labels sit inside the chart, none cut at its left edge (item 11)", JSON.stringify(ax));
}
/* crm-fixes-1004 item 12: at 1366 px the 7-day table fits its card; its Change column shows. */
{
  await crm.setViewportSize({ width: 1366, height: 900 });
  await settle(crm, 600);
  const wt = await crm.evaluate(() => {
    const card = document.querySelector('[data-testid="week-table"]');
    const table = card?.querySelector("table");
    const change = [...(card?.querySelectorAll("th") || [])].find((th) => th.textContent.trim() === "Change");
    const c = card?.getBoundingClientRect();
    const h = change?.getBoundingClientRect();
    return c && table && h ? { card: Math.round(c.width), table: Math.round(table.scrollWidth), changeRight: Math.round(h.right), cardRight: Math.round(c.right) } : null;
  });
  check(Boolean(wt) && wt.table <= wt.card + 1 && wt.changeRight <= wt.cardRight + 1, "at 1366 px the 7-day table fits its card and its Change column shows (item 12)", JSON.stringify(wt));
  await crm.setViewportSize({ width: 1440, height: 1000 });
  await settle(crm, 300);
}
/* crm-fixes-1004 item 13: a new screen starts at its top. */
{
  await crm.evaluate(() => document.querySelector("#crm-main")?.scrollTo(0, 900));
  await settle(crm, 200);
  const before = await crm.evaluate(() => document.querySelector("#crm-main")?.scrollTop || 0);
  await crm.locator('aside[aria-label="CRM"] nav a', { hasText: "Leads" }).first().click();
  await crm.locator('table[aria-label="Leads"]').first().waitFor({ timeout: PAGE_WAIT }).catch(() => {});
  await settle(crm, 300);
  const after = await crm.evaluate(() => document.querySelector("#crm-main")?.scrollTop || 0);
  check(before > 100 && after === 0, "scrolled down on the Dashboard, a click on Leads opens Leads at its top (item 13)", JSON.stringify({ before, after }));
}
/* crm-fixes-1004 item 17: Mehdi's Me under the rail, and his Me page speaks to him. */
{
  const me = crm.locator('aside[aria-label="CRM"] div[role="navigation"] a', { hasText: "Me" }).first();
  check((await me.getAttribute("href").catch(() => null)) === "/crm/me", "the owner's rail has Me under its list (item 17)", await me.getAttribute("href").catch(() => "none"));
  await me.click().catch(() => {});
  await crm.getByTestId("crm-me-page").waitFor({ timeout: PAGE_WAIT }).catch(() => {});
  const text = (await crm.getByTestId("crm-me-page").innerText().catch(() => "")).replace(/\s+/g, " ");
  check(/Your own number/.test(text) && /\+91 77619 21786/.test(text) && !/Ask him/.test(text) && !/Mehdi adds it/.test(text) && !/Send a test to Mehdi/.test(text)
    && (await crm.getByRole("button", { name: /sign out/i }).count()) > 0,
    "the owner's Me page: his own number and signature, Sign out, and no wording about asking himself (item 17)", text.slice(0, 400));
  await crm.goto(BASE + "/crm", { waitUntil: "domcontentloaded" });
  await crm.getByTestId("crm-dashboard").waitFor({ timeout: PAGE_WAIT }).catch(() => {});
}

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
await crm.locator(rowsSel).first().waitFor({ timeout: PAGE_WAIT });
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
/* Since the team (crm-team-spec 10.4 and 13.4) "Assigned" lists the people and Unassigned; the seed's
   free-text labels ("Aman", "Mehdi") are filtered by "Old label". */
const assignedTop = await crm.$$eval('select[aria-label="Assigned"] > option', (os) => os.map((o) => o.textContent.trim()));
check(assignedTop.includes("Mehdi Alam") && assignedTop.includes("Unassigned") && !assignedTop.includes("Aman"),
  "the Assigned filter lists the people and Unassigned, not the old free-text labels", JSON.stringify(assignedTop));
const oldOpts = await crm.$$eval('select[aria-label="Old label"] option', (os) => os.map((o) => o.value));
check(oldOpts.includes("Aman") && oldOpts.includes("Mehdi"), "the Old label filter lists the seed's old labels, Aman and Mehdi", JSON.stringify(oldOpts));
await crm.locator('select[aria-label="City"]').selectOption("Patna");
await crm.locator('select[aria-label="Old label"]').selectOption("Aman");
await settle(crm, 400);
const patnaAman = leads.filter((l) => l.city === "Patna" && l.assignedTo === "Aman").map((l) => l.instituteName).sort();
check(patnaAman.length > 0 && /old=Aman/.test(crm.url()) && JSON.stringify((await names()).sort()) === JSON.stringify(patnaAman),
  `City plus Old label filters combine (${patnaAman.length} Patna leads labelled Aman)`, JSON.stringify(await names()));
await crm.locator('select[aria-label="Old label"]').selectOption("");
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
/* The Demo column is the whole link a prospect opens, the main site's /site/<slug> (30 Sep 2026), not a bare path. */
const csvCells = (line) => {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
};
const demoCol = csvCells(csvLines[0]).indexOf("Demo");
const withDemo = leads.find((l) => l.demoSlug);
const demoCell = demoCol < 0 || !withDemo ? "" : csvCells(csvLines.find((x) => x.startsWith(`${withDemo.instituteName},`)) || "")[demoCol] || "";
check(/^https:\/\/[^/]+\/site\//.test(demoCell) && demoCell.endsWith(`/site/${withDemo?.demoSlug}`) && !demoCell.includes("localhost"),
  `the export's Demo column is the whole demo link on the main site, not a /site/ path (${demoCell})`, demoCell);

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
await crm.getByTestId("by-status").waitFor({ timeout: PAGE_WAIT });
await settle(crm);
const bars2 = await statusBars();
check(bars2.Proposal === byStatus.proposal + 3 && bars2.Won === byStatus.won - 1, "the dashboard's status bars follow the bulk change", JSON.stringify(bars2));

/* ── 4. Pipeline: drag New to Contacted ───────────────────────────────── */
const DRAG = leads[18];
await crm.goto(BASE + "/crm/pipeline", { waitUntil: "domcontentloaded" });
const card = crm.locator(`[data-card="${DRAG.id}"]`);
await card.waitFor({ timeout: PAGE_WAIT });
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
  const g = compose.getByTestId("open-mailto");
  if ((await g.evaluate((el) => el.tagName)) !== "A") return { blocked: await blockersOf(compose) };
  return { href: (await g.getAttribute("href")) || "" };
}
/* A mailto: link as its parts. */
const mailParts = (href) => {
  const u = new URL(href);
  return { to: decodeURIComponent(u.pathname), subject: u.searchParams.get("subject") || "", body: u.searchParams.get("body") || "" };
};
/* No Gmail link, button or "Open in Gmail" wording anywhere in the CRM's main area. Settings may NAME
   Gmail in its one help line (Gmail in Chrome as the mail app), so only the retired wording counts. */
async function noGmail(where, p = crm) {
  const links = await p.locator('a[href*="mail.google.com"]').count();
  const words = /open in gmail|gmail account|gmail compose/i.test(await p.locator("main").innerText().catch(() => ""));
  const btn = await p.getByTestId("open-gmail").count();
  check(!links && !words && !btn, `${where}: no Gmail link, button or wording`, `gmail links ${links}, wording ${words}, open-gmail ${btn}`);
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
  if (!r.href) return fail(`${tag}: Open in mail app is blocked for ${lead.instituteName}: ${r.blocked}`);
  check(r.href.startsWith("mailto:"), `${tag}: the e-mail button is a mailto: link`, r.href.slice(0, 60));
  const u = mailParts(r.href);
  const body = `${u.subject}\n${u.body}`;
  check(u.to === lead.email, `${tag}: the mailto: link is addressed to ${lead.email}`, u.to);
  check(u.subject.length > 3, `${tag}: the mailto: link carries a subject`, u.subject);
  check(!othersIn(body, lead).length, `${tag}: the email names no other lead`, othersIn(body, lead).join(", "));
  check(!/EDITMARK/.test(body) || body.includes(`EDITMARK-${lead.id}`), `${tag}: no text edited on another lead leaks into this email`);
  // 2 Oct 2026: a lead whose demo is made gets its first e-mail With link: exactly one link, that lead's own
  // sample (/site/<its slug>), on its own line. A lead with no demo gets none.
  const urls = body.match(/https?:\/\/\S+|www\.\S+/g) || [];
  const paths = body.match(/\/site\/[a-z0-9-]+/gi) || [];
  check(lead.demoSlug ? urls.length === 1 && urls[0].endsWith(`/site/${lead.demoSlug}`) && paths.length === 1 && body.includes(`${urls[0]}\n`) : urls.length === 0 && paths.length === 0,
    `${tag}: the first e-mail carries ${lead.demoSlug ? `exactly one link, ${lead.instituteName}'s own sample` : "no link (no demo yet)"}`, urls.join(", ") || body.slice(0, 160));
  return body;
}

const A = leads[0];
const B = leads[9];
await crm.goto(BASE + `/crm/leads/${A.id}`, { waitUntil: "domcontentloaded" });
await crm.getByTestId("compose").waitFor({ timeout: PAGE_WAIT });
check((await crm.getByTestId("lead-name").innerText()) === A.instituteName, `/crm/leads/${A.id} opens ${A.instituteName}`);
{
  /* crm-fixes-1004 items 2 and 18. */
  const state = await crm.getByTestId("lead-demo-state").innerText().catch(() => "");
  check(state === "Live, not sent yet", `lead A: never written to, its live demo reads "Live, not sent yet", not Sent (item 2)`, state);
  const step1 = await crm.getByTestId("linked-demo").innerText().catch(() => "");
  check(/Live, not sent yet/.test(step1) && !/Sent/.test(step1.replace("not sent yet", "")), "lead A: step 1 says Live, not sent yet too", step1.replace(/\s+/g, " "));
  const hd = crm.getByTestId("history-details");
  if (!(await hd.evaluate((d) => d.open).catch(() => true))) await hd.locator("summary").click().catch(() => {});
  await settle(crm, 200);
  const count = Number((await crm.getByTestId("history-count").innerText().catch(() => "")).split(" ")[0]);
  const items = await crm.getByTestId("history").locator("li").count();
  check(count === items && items >= 1, "lead A: the History fold counts the lines it lists (item 18: it said 0 entries over a Lead added line)", JSON.stringify({ count, items }));
}
const eA = await emailLink(A);
checkEmail(A, eA, "lead A");
await crm.locator("#msg-body").fill(((await crm.locator("#msg-body").inputValue()) || "") + `\nEDITMARK-${A.id}`);
await settle(crm, 300);
const eA2 = await emailLink(A);
check(eA2.href && mailParts(eA2.href).body.includes(`EDITMARK-${A.id}`), "lead A: an edit to the text goes into lead A's mailto: link");
await noGmail("lead A's page (old Gmail account still saved)");
check(!/old-setting@gmail\.example/.test(await crm.getByTestId("send-to").innerText()) && !/free mailbox/i.test(await crm.getByTestId("compose").innerText()), "the old saved Gmail account adds no from line and no free-mailbox warning");
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
/* If the table never shows, say what the page shows instead (and the errors so far) rather than crash. */
await crm.getByTestId("demo-table").waitFor({ timeout: 15000 }).catch(async () => {
  const shown = (await crm.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
  fail(`the Demos table did not appear at ${crm.url()}: page shows "${shown}"; errors so far: ${errors.slice(0, 3).join(" | ") || "none"}`);
});
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
{
  /* crm-fixes-1004 item 2: a demo's Status is Sent only when its lead's history shows a message that carried the link. */
  const states = await crm.$$eval('[data-testid="demo-table"] tbody tr', (trs) => Object.fromEntries(trs.map((tr) => [tr.children[0].querySelector("span")?.textContent.trim(), tr.querySelector('[data-testid="demo-state"]')?.textContent.trim()])));
  const sentLead = leads.find((l) => l.demoId && l.lastContactedAt);
  check(states[A.instituteName] === "Live, not sent yet" && states[sentLead.instituteName] === "Sent" && states[POSTER_DEMO.instituteName] === "Draft",
    "Demos: Live, not sent yet for a live demo never sent; Sent once a message carried its link; Draft as before (item 2)",
    JSON.stringify({ A: states[A.instituteName], sent: states[sentLead.instituteName], poster: states[POSTER_DEMO.instituteName] }));
  const sub = (await crm.locator("h1").first().locator("xpath=..").innerText().catch(() => "")).replace(/\s+/g, " ");
  check(/\d+ sent to their lead, \d+ opened by them/.test(sub), "Demos says how many were sent to their lead and opened by them, as the Dashboard's rate does", sub.slice(0, 200));
}

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
await crm.getByTestId("demo-table").waitFor({ timeout: PAGE_WAIT });
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
  await dup.waitFor({ timeout: PAGE_WAIT });
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
   the data (at most every 2 minutes since 4 Oct 2026, useCrmData FOCUS_REFRESH_MS):
   the new demos must show without a reload. */
await crm.bringToFront();
await crm.waitForTimeout(Math.max(0, 121_000 - (Date.now() - crmLoadedAt)));
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
await crm.locator(rowsSel).first().waitFor({ timeout: PAGE_WAIT });
await settle(crm);
const allNames = await names();
check(allNames.includes(NEW_NAME) && allNames.includes(POSTER_EXTRACT.instituteName), "the CRM leads table lists both auto-created leads");
await crm.goto(BASE + "/crm/demos?view=all", { waitUntil: "domcontentloaded" });
await crm.getByTestId("demo-table").waitFor({ timeout: PAGE_WAIT });
await settle(crm);
dr = await demoRows();
const nd = dr.find((r) => r.name === NEW_NAME);
const pd = dr.find((r) => r.name === POSTER_EXTRACT.instituteName);
check(nd?.lead.includes(NEW_NAME) && nd?.source === "Template", "CRM Demos lists the new duplicate with its lead", JSON.stringify(nd || null));
check(pd?.lead.includes(POSTER_EXTRACT.instituteName) && pd?.source === "Poster", "CRM Demos lists the new poster demo, as Poster, with its lead", JSON.stringify(pd || null));

/* ── 8. WhatsApp: no cap when the limit is blank, capped when one is set ── */
async function waState() {
  await crm.goto(BASE + `/crm/leads/${A.id}`, { waitUntil: "domcontentloaded" });
  await crm.getByTestId("compose").waitFor({ timeout: PAGE_WAIT });
  await settle(crm, 400);
  const r = await whatsappLink();
  const blockers = r.href ? "" : r.blocked;
  const m = /(\d+) first WhatsApp messages? sent today|First WhatsApp messages today: (\d+) of (\d+)/.exec(r.text);
  return { ...r, blockers, sentToday: m ? Number(m[1] || m[2]) : NaN, limit: m && m[3] ? Number(m[3]) : null };
}
async function setLimit(v) {
  await crm.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
  await crm.locator("#set-cap").waitFor({ timeout: PAGE_WAIT });
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
await clean.waitFor({ timeout: PAGE_WAIT });
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

/* ── 10. Dental clinics (28 Sep 2026) ──────────────────────────────────── */
await crm.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
await crm.locator("#set-sig").waitFor({ timeout: PAGE_WAIT });
check((await crm.locator("#set-gmail").count()) === 0, "Settings has no Gmail account field, though the saved settings still carry one");
await noGmail("Settings");
check(/default e-mail app/i.test(await crm.getByTestId("mail-app-help").innerText().catch(() => "")), "Settings has the one help line about the default mail app");

const DENTAL_SEED = leads.filter((l) => l.kind === "dental");
const dentalNames = DENTAL_SEED.map((l) => l.instituteName).sort();
await crm.goto(BASE + "/crm/leads?view=all", { waitUntil: "domcontentloaded" });
await crm.locator(rowsSel).first().waitFor({ timeout: PAGE_WAIT });
await settle(crm);
const kindOptions = await crm.locator('select[aria-label="Kind"] option').allInnerTexts();
check(kindOptions.includes("Dental clinic"), "the leads table's Kind filter lists Dental clinic", JSON.stringify(kindOptions));
await crm.locator('select[aria-label="Kind"]').selectOption("dental");
await settle(crm, 400);
check(dentalNames.length === 4 && /kind=dental/.test(crm.url()) && JSON.stringify((await names()).sort()) === JSON.stringify(dentalNames),
  `Kind = Dental clinic lists exactly the ${dentalNames.length} dental leads`, JSON.stringify(await names()));
const leadHeaders = await crm.$$eval('table[aria-label="Leads"] thead th', (ths) => ths.map((th) => (th.textContent || "").trim()));
const kindCol = leadHeaders.indexOf("Kind");
const kindCells = kindCol < 0 ? [] : await crm.$$eval(rowsSel, (trs, i) => trs.map((tr) => (tr.children[i]?.textContent || "").trim()), kindCol);
check(kindCells.length === DENTAL_SEED.length && kindCells.every((t) => t === "Dental clinic"), "the table's Kind column reads Dental clinic for them", JSON.stringify({ kindCol, kindCells }));
await crm.setViewportSize({ width: 390, height: 844 });
await settle(crm, 400);
const dentalCards = await crm.locator('ul[aria-label="Leads"] > li').allInnerTexts();
check(dentalCards.length === DENTAL_SEED.length && dentalCards.every((t) => /Dental clinic/.test(t)), "on a phone the lead cards say Dental clinic", JSON.stringify(dentalCards.map((t) => t.replace(/\s+/g, " ").slice(0, 60))));
await crm.setViewportSize({ width: 1440, height: 1000 });
await settle(crm, 300);

await crm.goto(BASE + "/crm", { waitUntil: "domcontentloaded" });
await crm.getByTestId("breakdown").waitFor({ timeout: PAGE_WAIT });
await crm.getByTestId("breakdown").getByRole("tab", { name: "Kind" }).click();
await settle(crm, 300);
const bdRow = crm.getByTestId("breakdown").locator("tbody tr", { hasText: "Dental clinic" }).first();
const bdCells = await bdRow.locator("td").allInnerTexts().catch(() => []);
check(bdCells[0] === "Dental clinic" && bdCells[1] === String(DENTAL_SEED.length), `the dashboard breakdown by kind has Dental clinic with ${DENTAL_SEED.length} leads`, JSON.stringify(bdCells));
await bdRow.click().catch(() => {});
await crm.locator(rowsSel).first().waitFor({ timeout: 10000 }).catch(() => {});
await settle(crm, 400);
check(/kind=dental/.test(crm.url()) && (await rowCount()) === DENTAL_SEED.length, "clicking that row lists the dental leads", `${crm.url()} ${await rowCount()} rows`);

const pipeDental = leads[5];
await crm.goto(BASE + "/crm/pipeline", { waitUntil: "domcontentloaded" });
await crm.locator(`[data-card="${pipeDental.id}"]`).waitFor({ timeout: 10000 }).catch(() => {});
check(/Dental clinic/.test(await crm.locator(`[data-card="${pipeDental.id}"]`).innerText().catch(() => "")), `${pipeDental.instituteName}'s pipeline card says Dental clinic`);

/* A seeded dental lead with a dental demo (lead 5, Proposal, demo made from d1): facts, the
   existing list, the template list. Leads 15, 25 and 35 are Won, Lost and Do not contact, no demo. */
const seededDental = leads[5];
check(Boolean(seededDental.demoId) && seededDental.kind === "dental", `the seed's ${seededDental.instituteName} is a dental lead with a demo`, JSON.stringify({ kind: seededDental.kind, demo: seededDental.demoId }));
await crm.goto(BASE + `/crm/leads/${seededDental.id}`, { waitUntil: "domcontentloaded" });
await crm.getByTestId("compose").waitFor({ timeout: PAGE_WAIT });
await settle(crm);
check(/Kind\s*Dental clinic/.test(await crm.getByTestId("lead-facts").innerText().catch(() => "")), `${seededDental.instituteName}'s facts say Kind: Dental clinic`);
const sc = crm.getByTestId("compose");
const changeBtn = sc.getByRole("button", { name: "Change", exact: true });
if (await changeBtn.count()) await changeBtn.first().click();
else fail(`no Change button in the Demo step of ${seededDental.instituteName}: ` + (await sc.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 120));
await sc.getByRole("tab", { name: /use existing/i }).click({ timeout: 5000 }).catch(() => {});
const firstExisting = await sc.getByTestId("demo-existing-list").locator("li").first().innerText().catch(() => "");
check(/Dental clinic/.test(firstExisting), "Use existing lists the dental demos first for a dental lead", firstExisting.replace(/\s+/g, " "));
await sc.getByRole("tab", { name: /create demo/i }).click();
const seededOpts = await sc.locator("#tpl-pick option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
check(seededOpts.length === 7 && seededOpts.every((v) => /^d[1-7]-/.test(v)), "a dental lead is offered the seven dental templates, d1 to d7", JSON.stringify(seededOpts));
check((await sc.locator("#tpl-pick").inputValue()) === "d1-family-dentist", "a plain dental clinic starts on d1", await sc.locator("#tpl-pick").inputValue());
/* Links out of the CRM, on the main site's /crm today: relative, exactly as before. */
const relLinks = {
  open: await sc.getByTestId("demo-open").getAttribute("href").catch(() => null),
  edit: await sc.getByTestId("demo-edit").getAttribute("href").catch(() => null),
  card: await crm.getByTestId("lead-demo-open").getAttribute("href").catch(() => null),
};
check(relLinks.open === `/site/${seededDental.demoSlug}?team=1` && relLinks.card === relLinks.open && relLinks.edit === `/admin/c/demoSites?edit=${seededDental.demoId}`,
  "on the main site the lead page's links stay relative: its live demo opens as a team preview (/site/<slug>?team=1, never counted as an open), Edit demo in the admin", JSON.stringify(relLinks));

/* A NEW dental lead, a d4 demo made on its page, and a dental e-mail through the mail app. */
const NEW_DENTAL = { name: "Example Implant Dental Centre E2E", city: "Dhanbad", phone: "98765 43281", email: "care@example-implant-e2e.example" };
await crm.goto(BASE + "/crm/leads/new", { waitUntil: "domcontentloaded" });
await crm.locator("#lf-name").waitFor({ timeout: PAGE_WAIT });
await crm.getByTestId("lf-kind").locator("label", { hasText: "Dental clinic" }).click();
await crm.locator("#lf-name").fill(NEW_DENTAL.name);
await crm.getByLabel("City", { exact: true }).fill(NEW_DENTAL.city);
await crm.getByLabel("Phone", { exact: true }).fill(NEW_DENTAL.phone);
await crm.getByLabel("Email", { exact: true }).fill(NEW_DENTAL.email);
await crm.getByRole("button", { name: /save and compose/i }).click();
await crm.getByTestId("lead-name").waitFor({ timeout: PAGE_WAIT });
store = await readOutreach(crm);
const nd2 = store.leads.find((l) => l.instituteName === NEW_DENTAL.name);
check(nd2?.kind === "dental", "a dental lead made in the new-lead form is saved with kind dental", JSON.stringify(nd2?.kind));
const nc = crm.getByTestId("compose");
await nc.getByRole("tab", { name: /create demo/i }).click();
check((await nc.locator("#tpl-pick").inputValue()) === "d4-implant-centre", "an implant centre starts on d4", await nc.locator("#tpl-pick").inputValue());
await nc.getByRole("button", { name: /create demo for/i }).click();
await crm.locator("#dup-name").waitFor({ timeout: 5000 });
await crm.getByRole("button", { name: /make the draft/i }).click();
await crm.getByTestId("linked-demo").waitFor({ timeout: 15000 }).catch(() => {});
store = await readOutreach(crm);
const nd2Demo = ((await readCms(crm)).demoSites || []).find((d) => d.id === store.leads.find((l) => l.id === nd2?.id)?.demoId);
check(nd2Demo?.kind === "dental" && nd2Demo?.templateId === "d4-implant-centre" && nd2Demo?.instituteName === NEW_DENTAL.name, "Create demo on the dental lead makes and links a dental demo from d4", JSON.stringify({ kind: nd2Demo?.kind, templateId: nd2Demo?.templateId }));
await crm.getByRole("button", { name: /mark sent to/i }).click().catch(() => {});
await settle(crm, 500);
const nm = await emailLink(nd2 || {});
check(Boolean(nm.href), "Open in mail app is open for the new dental lead", nm.blocked);
if (nm.href) {
  const parts = mailParts(nm.href);
  check(parts.to === NEW_DENTAL.email && parts.subject === (await nc.locator("#msg-subject").inputValue()), "its mailto: carries the clinic's address and the subject on screen", JSON.stringify({ to: parts.to, subject: parts.subject }));
  // 2 Oct 2026: its demo is marked sent, so the first e-mail goes With link: one link, the clinic's own sample.
  const nmUrls = `${parts.subject}\n${parts.body}`.match(/https?:\/\/\S+|www\.\S+/g) || [];
  check(Boolean(nd2Demo?.slug) && nmUrls.length === 1 && nmUrls[0].endsWith(`/site/${nd2Demo.slug}`) && parts.body.includes(`${nmUrls[0]}\n`),
    "the new dental lead's first e-mail carries exactly one link, its own sample's, on its own line", nmUrls.join(", ") || "no link");
  const tplId = (await nc.getByTestId("template-list").first().locator('[aria-checked="true"]').getAttribute("data-template-id").catch(() => "")) || "";
  check(/dental/.test(tplId), "the e-mail is a dental template", tplId || "none selected");
  await nc.getByTestId("copy-email").click();
  await settle(crm, 200);
  check((await crm.evaluate(() => window.__copied.at(-1) || "")) === `Subject: ${parts.subject}\n\n${parts.body}`, "Copy e-mail text copies the subject and the body");
  await nc.getByTestId("open-mailto").click();
  await settle(crm, 800);
  check((await crm.evaluate(() => window.__mailto.at(-1) || "")) === nm.href, "clicking Open in mail app follows the mailto: link (recorded)");
  store = await readOutreach(crm);
  check(store.events.some((e) => e.leadId === nd2?.id && e.type === "sent" && e.channel === "email" && /^Email opened in email app/.test(e.detail || "")), "the send is logged on the dental lead as Email opened in email app");
}
await noGmail("the new dental lead's page");
check(!opened.some((u) => /mail\.google\.com/.test(u)), "nothing ever opened Gmail");

/* Create lead from a dental demo with no lead: the dialog starts on Dental clinic. */
const DENTAL_DEMO = {
  id: "ds_e2e_dental_nolead", slug: "e2e-smile-dental-nolead", instituteName: "Example Smile Dental Clinic E2E", internalName: "e2e dental", kind: "dental",
  market: "india", city: "Ranchi", status: "draft", templateId: "d3-smile-studio", createdAt: iso(Date.now()), updatedAt: iso(Date.now()),
};
await crm.evaluate(([k, d]) => {
  const c = JSON.parse(localStorage.getItem(k) || "{}");
  c.demoSites = [...(c.demoSites || []), d];
  localStorage.setItem(k, JSON.stringify(c));
}, [CMS_KEY, DENTAL_DEMO]);
await crm.goto(BASE + "/crm/demos", { waitUntil: "domcontentloaded" });
await crm.getByTestId("demo-table").waitFor({ timeout: PAGE_WAIT });
await settle(crm);
const ddRow = crm.locator('[data-testid="demo-table"] tbody tr', { hasText: DENTAL_DEMO.instituteName });
check(/Dental clinic/.test(await ddRow.innerText().catch(() => "")), "the Demos table labels a dental demo Dental clinic");
await ddRow.getByTestId("demo-create-lead-btn").click();
await crm.getByTestId("demo-create-lead").waitFor({ timeout: 5000 });
check((await crm.locator("#dl-kind").inputValue()) === "dental", "Create lead from a dental demo starts on kind Dental clinic", await crm.locator("#dl-kind").inputValue());
await crm.locator("#dl-phone").fill("98765 43282");
await crm.getByTestId("demo-create-lead").getByRole("button", { name: "Create lead" }).click();
await crm.waitForURL(/\/crm\/leads\/ol_/, { timeout: 8000 }).catch(() => {});
store = await readOutreach(crm);
check(store.leads.find((l) => l.demoId === DENTAL_DEMO.id)?.kind === "dental", "and the lead it saves is a dental lead", JSON.stringify(store.leads.find((l) => l.demoId === DENTAL_DEMO.id)?.kind));
await settle(crm);

/* ── 11. The CRM on its own subdomain (crm.localhost stands in for crm.ideovent.in) ──
   Chrome sends *.localhost to 127.0.0.1, so this is the same dev server seen as the CRM host.
   There the CRM is the whole app (its screens at the root), links between its screens carry no
   /crm, and every link to the admin or a demo leaves for the main site as an absolute address
   in a plain <a href>. The main site's address is answered here: nothing reaches the live site. */
const CRM_HOST = BASE.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, "//crm.localhost");
await context.route(/^https:\/\/(ideovent\.vercel\.app|(www\.)?ideovent\.in)\//, (route) => {
  opened.push(route.request().url());
  return route.fulfill({ status: 200, contentType: "text/html", body: "<p>main site, intercepted by e2e-crm</p>" });
});
const sub = await context.newPage();
watch(sub, "crm-host");
await sub.goto(CRM_HOST + "/login", { waitUntil: "domcontentloaded" });
await sub.evaluate(([sk, ok, ck, outreach, cms]) => {
  sessionStorage.setItem(sk, "1");
  localStorage.setItem(ok, JSON.stringify(outreach));
  localStorage.setItem(ck, JSON.stringify(cms));
}, [SESSION_KEY, OUTREACH_KEY, CMS_KEY, await readOutreach(crm), await readCms(crm)]);
const noCrmPrefix = async (where) => {
  const bad = await sub.$$eval('a[href^="/crm"]', (as) => as.map((a) => a.getAttribute("href")));
  check(!bad.length, `CRM host, ${where}: no link carries the /crm prefix`, JSON.stringify(bad.slice(0, 5)));
};
await sub.goto(CRM_HOST + `/leads/${seededDental.id}`, { waitUntil: "domcontentloaded" });
await sub.getByTestId("compose").waitFor({ timeout: 15000 }).catch(() => {});
await settle(sub);
check(new URL(sub.url()).host === new URL(CRM_HOST).host && (await sub.getByTestId("lead-name").innerText().catch(() => "")) === seededDental.instituteName,
  `CRM host: the lead page is at /leads/${seededDental.id}, no /crm prefix`, sub.url());
const subCompose = sub.getByTestId("compose");
await subCompose.getByRole("button", { name: "Change", exact: true }).first().click().catch(() => {});
const abs = {
  open: await subCompose.getByTestId("demo-open").getAttribute("href").catch(() => null),
  edit: await subCompose.getByTestId("demo-edit").getAttribute("href").catch(() => null),
  card: await sub.getByTestId("lead-demo-open").getAttribute("href").catch(() => null),
};
const mainOrigin = /^https?:\/\//.test(abs.open || "") ? new URL(abs.open).origin : "";
check(Boolean(mainOrigin) && mainOrigin !== new URL(CRM_HOST).origin && abs.open === `${mainOrigin}/site/${seededDental.demoSlug}?team=1`
  && abs.card === abs.open && abs.edit === `${mainOrigin}/admin/c/demoSites?edit=${seededDental.demoId}`,
  `CRM host: the lead page's links to the main site are absolute (${mainOrigin || "none"}): the live demo as a team preview, Edit demo in the admin`, JSON.stringify(abs));
const [editTab] = await Promise.all([context.waitForEvent("page", { timeout: 8000 }).catch(() => null), subCompose.getByTestId("demo-edit").click().catch(() => {})]);
/* A new tab starts at "" and commits its address a moment later: wait for it to leave the blank page. */
if (editTab) await editTab.waitForURL((u) => /^https?:/.test(u.href), { timeout: 8000 }).catch(() => {});
check(Boolean(editTab) && editTab.url() === abs.edit, "CRM host: Edit demo opens the main site's admin in a new tab (a real page load, not the router)", editTab ? JSON.stringify(editTab.url()) : "no new tab");
await editTab?.close().catch(() => {});
await noCrmPrefix("lead page");
await noGmail("CRM host lead page", sub);

await sub.goto(CRM_HOST + "/demos?view=all", { waitUntil: "domcontentloaded" });
await sub.getByTestId("demo-table").waitFor({ timeout: 10000 }).catch(() => {});
await settle(sub);
check((await sub.locator(`[data-testid="demo-table"] a[href="/leads/${seededDental.id}"]`).count()) === 1, "CRM host: the Demos table links a demo to its lead at /leads/<id>");
await sub.getByRole("button", { name: `More actions for ${seededDental.instituteName}` }).click().catch(() => {});
const menuHrefs = {
  open: await sub.getByRole("menuitem", { name: /Open demo/ }).getAttribute("href").catch(() => null),
  edit: await sub.getByRole("menuitem", { name: /Edit in admin/ }).getAttribute("href").catch(() => null),
};
check(menuHrefs.open === `${mainOrigin}/admin/preview/site/${seededDental.demoSlug}` && menuHrefs.edit === `${mainOrigin}/admin/c/demoSites?edit=${seededDental.demoId}`,
  "CRM host: the Demos menu's Open demo and Edit in admin go to the main site", JSON.stringify(menuHrefs));
await sub.keyboard.press("Escape").catch(() => {});
await noCrmPrefix("Demos");

await sub.goto(CRM_HOST + "/leads?view=all&kind=dental", { waitUntil: "domcontentloaded" });
await sub.locator(rowsSel).first().waitFor({ timeout: 10000 }).catch(() => {});
await settle(sub);
check((await sub.locator(rowsSel).count()) >= DENTAL_SEED.length, `CRM host: /leads?kind=dental lists the dental leads`, String(await sub.locator(rowsSel).count()));
await noCrmPrefix("Leads");
await sub.goto(CRM_HOST + `/crm/leads/${seededDental.id}`, { waitUntil: "domcontentloaded" });
await sub.waitForURL((u) => !u.pathname.startsWith("/crm"), { timeout: 8000 }).catch(() => {});
check(new URL(sub.url()).pathname === `/leads/${seededDental.id}`, "CRM host: an old /crm/leads/<id> address lands on /leads/<id>", sub.url());
await sub.close();

/* ── 12. Every stage in plain words, blanks, the call script (30 Sep 2026) ──
   Seeded leads the earlier sections left alone: 0 New school, 1 Contacted coaching (one
   WhatsApp sent), 11 Replied coaching, 4 Call school, 5 Proposal dental (with a demo). */
const STAGE_OF = [[leads[0], "first"], [leads[1], "follow_up"], [leads[11], "after_yes"], [leads[4], "after_call"], [leads[5], "proposal"]];
const openLeadPage = async (lead) => {
  await crm.goto(BASE + `/crm/leads/${lead.id}`, { waitUntil: "domcontentloaded" });
  await crm.getByTestId("compose").waitFor({ timeout: PAGE_WAIT });
  await settle(crm, 400);
  return crm.getByTestId("compose");
};
for (const [lead, want] of STAGE_OF) {
  const c = await openLeadPage(lead);
  const names = (await c.locator("[data-stage]").allInnerTexts()).map((t) => t.replace(/\s*now\s*$/i, "").trim());
  const on = await c.locator('[data-stage][aria-pressed="true"]').getAttribute("data-stage");
  const now = await c.locator('[data-stage][data-now="true"]').getAttribute("data-stage");
  check(names.join("|") === "First message|After they say yes|Follow-up|After the call|Proposal|Closing" && on === want && now === want,
    `${lead.instituteName} (${lead.status}) opens on its own stage, ${want}, with all six named`, JSON.stringify({ names, on, now }));
}
{
  /* Today names the stage: a Call lead due today reads "After the call". */
  await crm.goto(BASE + "/crm/today", { waitUntil: "domcontentloaded" });
  await crm.getByTestId("crm-today").waitFor({ timeout: PAGE_WAIT });
  await settle(crm);
  const row = await crm.locator(`[data-lead-id="${leads[4].id}"]`).innerText().catch(() => "");
  check(/After the call: send the summary/.test(row), "Today's row for a Call lead says After the call: send the summary", row.replace(/\s+/g, " "));
}
{
  /* [Blanks] in the after-call summary: highlighted, Send off, filled from the boxes. */
  const c = await openLeadPage(leads[4]);
  let found = "";
  for (const tab of [/^whatsapp/i, /^email/i]) {
    await c.getByRole("tab", { name: tab }).click();
    await settle(crm, 250);
    const more = c.locator("details").filter({ has: crm.locator("summary", { hasText: "More templates" }) });
    if ((await more.count()) && !(await more.first().evaluate((d) => d.open))) await more.first().locator("summary").click();
    const ids = await c.locator("[data-template-id]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-template-id")))]);
    for (const id of ids) {
      await c.locator(`[data-template-id="${id}"]`).first().click();
      await settle(crm, 150);
      if (await c.getByTestId("fill-blanks").count()) { found = id; break; }
    }
    if (found) break;
  }
  if (!found) fail("no After the call message has a [blank] to fill (the approved summary carries [package and price] and [date])");
  else {
    const blanks = await c.locator("[data-blank]").evaluateAll((els) => els.map((e) => e.getAttribute("data-blank")));
    const blocked = async () => (await blockersOf(c)).replace(/\s+/g, " ");
    check((await c.locator('[data-testid="message-marks"] mark[data-mark="blank"]').count()) >= blanks.length && /Fill in \[/.test(await blocked()),
      `${found}: its blanks (${blanks.map((b) => `[${b}]`).join(" ")}) are highlighted and keep Send off`, await blocked());
    for (const [i, b] of blanks.entries()) await c.locator(`[data-blank="${b}"]`).fill(`E2E-VALUE-${i}`);
    await settle(crm, 250);
    const text = await c.locator("#msg-body").inputValue();
    check(!/Fill in \[/.test(await blocked()) && blanks.every((_, i) => text.includes(`E2E-VALUE-${i}`)) && !/\[[^\]\n]+\]/.test(text),
      "filling every box puts the values in the text and the blank no longer blocks Send", await blocked());
  }
}
{
  /* The call script, worded for the lead's kind; a lead with a demo is told a sample was made. */
  for (const [lead, viewer] of [[leads[5], "patient"], [leads[4], "parent"], [leads[1], "student"]]) {
    await openLeadPage(lead);
    const who = await crm.getByTestId("call-script-for").innerText().catch(() => "");
    check(new RegExp(viewer).test(who), `${lead.instituteName}: the Call script is worded as a ${viewer} sees it`, who);
  }
  await openLeadPage(leads[5]);
  const cs = crm.getByTestId("call-script");
  if (!(await cs.evaluate((d) => d.open))) await cs.locator("summary").click();
  await cs.getByRole("button", { name: "English" }).click();
  const text = await cs.innerText();
  const steps = await cs.locator("[data-step]").evaluateAll((els) => els.map((e) => e.getAttribute("data-step")));
  check(steps.join(",") === "problem,cost,fix,trust,price,next,summary" && /I made a sample website for your clinic/.test(text),
    "the dental lead's script walks the seven steps, and with its demo made it may say a sample was made", steps.join(","));
  check(!/[–—]/.test(text), "the call script has no en or em dash");
  await openLeadPage(leads[11]);
  check(await crm.getByTestId("call-script").evaluate((d) => d.open), "for a lead that said yes, the Call script card is open: the call is next");
}

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
