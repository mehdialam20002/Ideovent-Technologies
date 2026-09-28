/**
 * End to end test of the outreach flow, now inside the CRM at /crm (28 Sep
 * 2026: Outreach moved there, /admin/outreach redirects), in LOCAL mode.
 *
 *   node scripts/e2e-outreach.mjs [baseUrl]      default http://localhost:5199
 *   SHOT_DIR=<folder> node scripts/e2e-outreach.mjs   also saves 390 and 1440 px screenshots
 *
 * The flow Mehdi actually does, in a real browser against the dev server:
 *   add a lead (and see the duplicate warning on a second one), create a demo
 *   from a template right on the lead page, mark it sent, compose an email and
 *   a WhatsApp, check the Gmail / wa.me links that would open, see status and
 *   history update, see Today list the follow-up and a hot lead after a demo
 *   open, import a 3-row CSV with one duplicate, and block everything once the
 *   lead is marked do not contact.
 *
 * Nothing leaves the machine: requests to mail.google.com, wa.me and
 * web.whatsapp.com are answered locally by the test, and the URL the button
 * would have opened is what gets checked. The run uses a fresh browser
 * profile, fictional institutes, and removes what it wrote on the way out.
 *
 * Needs a dev server WITHOUT Supabase (plain `npx vite`), because the outreach
 * store must be the localStorage one and the admin session the local one.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:5199";
const SHOT_DIR = process.env.SHOT_DIR || "";
const SESSION_KEY = "ideovent_admin_session";
const OUTREACH_KEY = "ideovent_outreach_v1";
const CMS_KEY = "ideovent_cms_v1";

const LEAD = {
  name: "Riverbend Public School E2E",
  phone: "98100 12345",
  phoneDigits: "919810012345",
  email: "office@riverbend-e2e.example",
  city: "Patna",
};

const findings = [];
const fail = (m) => {
  findings.push(m);
  console.log("FAIL  " + m);
};
const pass = (m) => console.log("ok    " + m);
const check = (cond, okMsg, failMsg) => (cond ? pass(okMsg) : fail(failMsg || okMsg));

/* Folded parts of the lead screen (<details>): open one by its summary text or test id. */
async function unfold(scope, what) {
  const d = /^[a-z-]+$/.test(what)
    ? scope.getByTestId(what)
    : scope.locator("details").filter({ has: page.locator("summary", { hasText: what }) });
  const el = d.first();
  if (!(await el.evaluate((x) => x.open))) await el.locator("summary").first().click();
}

async function launch() {
  const cands = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  for (const p of cands) {
    try {
      return await chromium.launch({ executablePath: p, headless: true });
    } catch {
      /* try the next one */
    }
  }
  return await chromium.launch({ channel: "chrome", headless: true });
}

const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

/* Never reach the real Gmail or WhatsApp. Record what would have opened. */
const opened = [];
for (const pattern of ["https://mail.google.com/**", "https://wa.me/**", "https://web.whatsapp.com/**", "https://api.whatsapp.com/**"]) {
  await context.route(pattern, (route) => {
    opened.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>intercepted by e2e-outreach</p>" });
  });
}
/* Local mode only: nothing may reach Supabase or EmailJS. */
await context.route(/\.supabase\.co|api\.emailjs\.com/, (route) => route.abort());
/* No hot reload during the run: another edit saved mid-run must not reload the page under the test. */
await context.addInitScript(() => {
  const Real = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (/localhost|127\.0\.0\.1/.test(String(url))) return { addEventListener() {}, removeEventListener() {}, send() {}, close() {}, readyState: 0 };
    return new Real(url, protocols);
  };
});
const page = await context.newPage();
context.on("page", async (p) => {
  if (p === page) return;
  // New tabs opened by the send links: note the URL, then close.
  try {
    await p.waitForLoadState("domcontentloaded", { timeout: 5000 });
  } catch {
    /* intercepted pages may not fire it */
  }
  if (p.url() && p.url() !== "about:blank") opened.push(p.url());
  await p.close().catch(() => {});
});

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("dialog", (d) => d.accept());

const shot = async (name) => {
  if (!SHOT_DIR) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, name), fullPage: true });
  pass(`screenshot ${name}`);
};

await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
await page.evaluate(([session, key]) => {
  sessionStorage.setItem(session, "1");
  localStorage.removeItem(key);
}, [SESSION_KEY, OUTREACH_KEY]);

await page.goto(BASE + "/admin/outreach", { waitUntil: "networkidle" });
await page.waitForURL(/\/crm$/, { timeout: 15000 }).catch(() => {});
await page.getByRole("heading", { name: "Dashboard", level: 1 }).waitFor({ timeout: 15000 });
pass("/admin/outreach redirects to the CRM, which renders behind the local admin session");
check((await page.locator('aside[aria-label="CRM"] a[href="/crm/today"]').count()) > 0, "the CRM rail has a Today item", "no Today item in the CRM rail");

const rail = (to) => page.locator(`aside[aria-label="CRM"] a[href="${to}"]`);
const leadIdByName = (name) =>
  page.evaluate(([k, n]) => (JSON.parse(localStorage.getItem(k) || "{}").leads || []).find((l) => l.instituteName === n)?.id, [OUTREACH_KEY, name]);
/* ── 1. Add a lead ─────────────────────────────────────────────────────── */
await page.getByRole("link", { name: /new lead/i }).first().click();
await page.getByLabel("Institute name", { exact: true }).fill(LEAD.name);
await page.getByLabel("City", { exact: true }).fill(LEAD.city);
await page.getByLabel("Phone", { exact: true }).fill(LEAD.phone);
await page.getByLabel("Email", { exact: true }).fill(LEAD.email);
await page.getByRole("button", { name: /save and compose/i }).click();
await page.getByTestId("lead-name").waitFor({ timeout: 10000 });
check((await page.getByTestId("lead-name").innerText()).includes(LEAD.name), "a new lead is saved and opens on its own page");

/* ── 2. Create a demo from a template, linked to the lead ─────────────── */
const compose = page.getByTestId("compose");
await compose.getByRole("tab", { name: /create demo/i }).click();
const tplSelect = compose.locator("#tpl-pick");
const firstTpl = await tplSelect.locator("option").nth(1).getAttribute("value");
await tplSelect.selectOption(firstTpl);
await compose.getByRole("button", { name: /create demo for/i }).click();
const dlg = page.locator('[role="dialog"]');
await dlg.waitFor({ timeout: 5000 });
check((await dlg.locator("#dup-name").inputValue()) === LEAD.name, "the duplicate dialog is prefilled with the lead's name");
check((await dlg.locator("#dup-city").inputValue()) === LEAD.city, "the duplicate dialog is prefilled with the lead's city");
await dlg.getByRole("button", { name: /make the draft/i }).click();
await page.getByTestId("linked-demo").waitFor({ timeout: 15000 });
const linkedText = await page.getByTestId("linked-demo").innerText();
check(/\/site\//.test(linkedText), `a demo made from template ${firstTpl} is linked to the lead`, "no demo got linked after Make the draft: " + linkedText);
check(page.url().includes("/crm/leads/"), "creating the demo stays on the CRM lead page");
check(/404 until marked sent/i.test(linkedText), "a draft demo says its public link is a 404 until sent");
await page.getByRole("button", { name: /mark sent to/i }).click();
await page.waitForFunction(() => /link is live/i.test(document.querySelector('[data-testid="linked-demo"]')?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
check(/link is live/i.test(await page.getByTestId("linked-demo").innerText()), "Mark sent makes the demo link live");

/* ── 3. Compose an email ───────────────────────────────────────────────── */
await compose.getByRole("tab", { name: /^email/i }).click();
await compose.getByLabel(/what you noticed/i).selectOption("no_website");
await page.waitForTimeout(300);
const gmail = compose.getByTestId("open-gmail");
const gmailTag = await gmail.evaluate((el) => el.tagName);
const gmailHref = (await gmail.getAttribute("href")) || "";
if (gmailTag !== "A") {
  const blockers = await compose.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  fail("Open in Gmail is disabled for a fresh lead with an email: " + blockers);
} else {
  const u = new URL(gmailHref);
  check(u.origin + u.pathname === "https://mail.google.com/mail/" && u.searchParams.get("view") === "cm", "Open in Gmail points at Gmail compose", "bad Gmail href: " + gmailHref);
  check(u.searchParams.get("to") === LEAD.email, "the Gmail link is addressed to the lead");
  check((u.searchParams.get("su") || "").length > 3, "the Gmail link carries a subject");
  const body = u.searchParams.get("body") || "";
  check(/REMOVE/.test(body), "the email body carries the REMOVE opt-out line");
  check(/Mehdi Alam/.test(body), "the email body carries the signature");
  check(!/[–—]/.test(body + (u.searchParams.get("su") || "")), "the email has no en or em dash");
  const mailto = (await compose.getByTestId("open-mailto").getAttribute("href")) || "";
  check(mailto.startsWith("mailto:" + LEAD.email), "Open email app is a mailto: link to the lead");
  await gmail.click();
  await page.waitForTimeout(1200);
  check(opened.some((x) => x.startsWith("https://mail.google.com/mail/")), "clicking Open in Gmail opens the Gmail compose URL (intercepted)");
}
await page.waitForTimeout(500);
await unfold(page, "status-details");
await unfold(page, "history-details");
const pipeText = await page.getByRole("radiogroup", { name: "Lead status" }).locator('[aria-checked="true"]').innerText();
check(/contacted/i.test(pipeText), "after the send the status is Contacted", "status after email send: " + pipeText);
const hist1 = await page.getByTestId("history").innerText();
check(/Email opened in Gmail/i.test(hist1), "the history records the email send", "history: " + hist1);
check((await page.locator("#lead-next").inputValue()) !== "", "a next follow-up date is set from the ladder");

/* ── 4. Compose a WhatsApp ─────────────────────────────────────────────── */
await compose.getByRole("tab", { name: /^whatsapp/i }).click();
await unfold(compose, "More templates");
await compose.getByLabel("Stage", { exact: true }).selectOption("first");
await page.waitForTimeout(300);
const wa = compose.getByTestId("open-whatsapp");
if ((await wa.evaluate((el) => el.tagName)) !== "A") {
  const blockers = await compose.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  fail("Open WhatsApp is disabled for the first message: " + blockers);
} else {
  const href = (await wa.getAttribute("href")) || "";
  check(href.startsWith(`https://wa.me/${LEAD.phoneDigits}?text=`), "Open WhatsApp is a wa.me link to the lead's number", "bad wa.me href: " + href);
  const text = decodeURIComponent(href.split("?text=")[1] || "");
  check(!/https?:\/\/|\/site\//.test(text), "the first WhatsApp message carries no link", "first WhatsApp carries a link: " + text);
  check(!/[–—]/.test(text), "the WhatsApp text has no en or em dash");
  const web = (await compose.getByTestId("open-whatsapp-web").getAttribute("href")) || "";
  check(web.startsWith(`https://web.whatsapp.com/send?phone=${LEAD.phoneDigits}&text=`), "WhatsApp Web link is built for the same number");
  await wa.click();
  await page.waitForTimeout(1200);
  check(opened.some((x) => x.startsWith("https://wa.me/") || x.includes("whatsapp.com")), "clicking Open WhatsApp opens the wa.me URL (intercepted)");
}
await page.waitForTimeout(400);
check(/WhatsApp opened in WhatsApp/i.test(await page.getByTestId("history").innerText()), "the history records the WhatsApp send");

/* A link typed into a first WhatsApp is blocked. */
await compose.getByLabel("Message text").fill("Namaste, dekhiye https://ideovent.vercel.app/site/x");
await page.waitForTimeout(200);
check((await compose.getByTestId("open-whatsapp").evaluate((el) => el.tagName)) === "BUTTON", "a link typed into a first WhatsApp message disables the button");
await compose.getByLabel("Stage", { exact: true }).selectOption("after_reply");
await page.waitForTimeout(300);

/* ── 5. Today lists the follow-up once it is due ──────────────────────── */
const d = new Date(Date.now() - 60 * 60 * 1000);
const p2 = (n) => String(n).padStart(2, "0");
await page.locator("#lead-next").fill(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`);
await page.waitForTimeout(400);
await rail("/crm/today").click();
await page.getByTestId("crm-today").waitFor({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const dueText = (await page.getByTestId("today-overdue").innerText().catch(() => "")) + (await page.getByTestId("today-due").innerText().catch(() => ""));
check(dueText.includes(LEAD.name), "Today lists the lead under Overdue or Due today");
const sentLine = await page.getByTestId("sent-today").innerText();
check(/Sent today: 1 WhatsApp, 1 email/.test(sentLine) && !/ of \d/.test(sentLine), "Today counts today's WhatsApp and email with no daily cap (limit removed 28 Sep 2026)", "sent line: " + sentLine);
const badge = await rail("/crm/today").innerText();
check(/\b1\b/.test(badge), "the Today badge in the CRM rail shows 1 follow-up due", "rail item text: " + badge);
await shot("outreach-today-1440.png");

/* ── 6. A demo open makes the lead hot ────────────────────────────────── */
const demoId = await page.evaluate((k) => {
  const s = JSON.parse(localStorage.getItem(k) || "{}");
  return (s.leads || []).find((l) => l.demoId)?.demoId || null;
}, OUTREACH_KEY);
if (!demoId) {
  fail(`could not read the lead's demoId from localStorage["${OUTREACH_KEY}"]`);
} else {
  await page.evaluate(([k, id]) => {
    const data = JSON.parse(localStorage.getItem(k) || "{}");
    data.demoSiteOpens = [...(data.demoSiteOpens || []), { id: "e2e_open_1", demoId: id, at: new Date().toISOString() }];
    localStorage.setItem(k, JSON.stringify(data));
  }, [CMS_KEY, demoId]);
  await page.goto(BASE + "/crm", { waitUntil: "networkidle" });
  await page.locator("#hot-h").waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  const hot = await page.locator('section[aria-labelledby="hot-h"]').innerText();
  check(hot.includes(LEAD.name), "a demo open after the last contact puts the lead under Hot", "hot section: " + hot);
}

/* ── 7. Duplicate warning on a second lead with the same number ───────── */
await page.getByRole("link", { name: /new lead/i }).first().click();
await page.getByLabel("Institute name", { exact: true }).fill("Some Other Name");
await page.getByLabel("Phone", { exact: true }).fill("+91-98100-12345");
await page.waitForTimeout(700);
const dupAlert = await page.locator('[role="alert"]').allInnerTexts();
check(dupAlert.some((t) => /already a lead/i.test(t) && t.includes(LEAD.name)), "typing a known phone number warns that the lead already exists", "alerts: " + JSON.stringify(dupAlert));
await page.getByRole("button", { name: /^cancel$/i }).click();

/* ── 8. Import a 3-row CSV: two new, one duplicate ────────────────────── */
await rail("/crm/import").click();
const csv = [
  "name,phone,email,city,type",
  "Lotus Valley Coaching E2E,9876501234,,Gaya,coaching",
  "Green Meadows School E2E,,principal@greenmeadows-e2e.example,Ranchi,school",
  "Riverbend Again E2E," + LEAD.phone + ",,Patna,school",
].join("\n");
await page.locator("#csv-text").fill(csv);
await page.waitForTimeout(300);
const summary = await page.getByTestId("import-summary").innerText();
check(/3 rows: 2 new, 1 duplicate, 0 skipped/.test(summary), "the import preview reports 2 new and 1 duplicate", "import summary: " + summary);
await page.getByRole("button", { name: /import 2 new leads/i }).click();
await page.getByRole("status").filter({ hasText: /imported/i }).waitFor({ timeout: 5000 }).catch(() => {});
const done = await page.getByRole("status").filter({ hasText: /imported/i }).innerText().catch(() => "");
check(/Imported 2 leads/.test(done) && /1 duplicate skipped/.test(done), "the import adds 2 leads and skips the duplicate", "import result: " + done);
await page.goto(BASE + "/crm/leads?view=all", { waitUntil: "domcontentloaded" });
await page.locator('table[aria-label="Leads"] tbody tr').first().waitFor({ timeout: 10000 });
const listText = await page.locator('table[aria-label="Leads"]').innerText();
check(
  listText.includes("Lotus Valley Coaching E2E") && listText.includes("Green Meadows School E2E") && !listText.includes("Riverbend Again E2E"),
  "the Leads list holds the imported rows and not the duplicate",
);

/* ── 9. Mobile: 390 px, no sideways scroll ────────────────────────────── */
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/crm/today", { waitUntil: "domcontentloaded" });
await page.getByTestId("crm-today").waitFor({ timeout: 10000 });
await page.waitForTimeout(400);
const overflowToday = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check(overflowToday <= 1, "Today fits 390 px without sideways scroll", "Today overflows by " + overflowToday + "px at 390");
await shot("outreach-today-390.png");
await page.goto(BASE + "/crm/leads/" + (await leadIdByName(LEAD.name)), { waitUntil: "domcontentloaded" });
await page.getByTestId("lead-name").waitFor({ timeout: 10000 });
await page.waitForTimeout(400);
const overflowLead = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check(overflowLead <= 1, "the lead page fits 390 px without sideways scroll", "lead page overflows by " + overflowLead + "px at 390");
const small = await page.evaluate(() =>
  [...document.querySelectorAll('[data-testid="compose"] button, [data-testid="compose"] a')]
    .filter((el) => el.offsetParent !== null)
    .map((el) => ({ t: (el.textContent || "").trim().slice(0, 30), h: el.getBoundingClientRect().height }))
    .filter((x) => x.h < 40),
);
check(small.length === 0, "every compose control is at least 40 px tall at 390", "small tap targets: " + JSON.stringify(small));
await shot("outreach-lead-390.png");

/* ── 10. Not interested blocks every send ─────────────────────────────── */
await unfold(page.getByTestId("compose"), "More options");
await page.getByRole("button", { name: /not interested/i }).click();
await page.waitForTimeout(500);
const tags = await page.getByTestId("compose").locator('[data-testid^="open-"]').evaluateAll((els) => els.map((e) => e.tagName));
check(tags.length > 0 && tags.every((t) => t === "BUTTON"), "after Not interested every send button is disabled", "send controls: " + JSON.stringify(tags));
check(/asked not to be contacted/i.test(await page.getByTestId("compose").innerText()), "the blocker says why in words");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(300);
await shot("outreach-lead-1440.png");

/* ── 11. Settings: Gmail account reaches the compose link; alert switch syncs ── */
await page.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
await page.locator("#set-gmail").fill("mehdi.e2e@gmail.com");
const alertBox = page.getByLabel(/alert me when a lead opens/i);
const alertWasOn = await alertBox.isChecked();
await alertBox.setChecked(false);
await page.getByRole("button", { name: /save settings/i }).click();
await page.getByRole("status").filter({ hasText: /saved/i }).waitFor({ timeout: 5000 }).catch(() => {});
const cmsAlerts = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").settings?.demoOpenAlerts, CMS_KEY);
check(cmsAlerts === false, "turning alerts off also writes the public settings.demoOpenAlerts switch", "settings.demoOpenAlerts = " + cmsAlerts);
await page.goto(BASE + "/crm/leads/" + (await leadIdByName(LEAD.name)), { waitUntil: "domcontentloaded" });
await page.getByTestId("lead-name").waitFor({ timeout: 10000 });
await unfold(page, "status-details");
await page.getByRole("radio", { name: "Contacted" }).click();
await page.getByTestId("compose").getByRole("tab", { name: /^email/i }).click();
await unfold(page.getByTestId("compose"), "More templates");
await page.getByTestId("compose").getByLabel("Stage", { exact: true }).selectOption("follow_up_1");
await page.waitForTimeout(300);
const acctHref = (await page.getByTestId("open-gmail").getAttribute("href").catch(() => "")) || "";
check(acctHref.includes("authuser=mehdi.e2e%40gmail.com"), "Open in Gmail uses the chosen Google account (authuser)", "gmail href: " + acctHref.slice(0, 120) + " blockers: " + (await page.getByTestId("compose").locator('[aria-label="Blocked"]').innerText().catch(() => "none")));
if (alertWasOn) {
  await page.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/alert me when a lead opens/i).setChecked(true);
  await page.getByRole("button", { name: /save settings/i }).click();
  await page.waitForTimeout(400);
}

/* ── 12. Every lead's message is that lead's own (28 Sep 2026 bug) ──────
   Mehdi saw "Verma Coaching Academy", the last of 30 imported leads, in every
   lead's email. Six fictional leads, each with its own name, email, phone,
   demo and observation (a sentence naming the institute), are walked WITHOUT
   going back to the list in between (lead to lead in place, the way Next lead
   and the browser's back and forward move), after composing and editing on
   the first one. Each Gmail and WhatsApp link must decode to that lead's own
   name, address, number and demo link, and never another lead's name. */
const WALK = ["Amberfield", "Bluestone", "Cedar Ridge", "Driftwood", "Elmhurst", "Foxglove"].map((n, i) => ({
  id: `ol_e2ewalk${i}`,
  instituteName: `${n} Public School E2E`,
  kind: "school",
  status: "new",
  city: "Patna",
  email: `office${i}@${n.toLowerCase().replace(/ /g, "")}-e2e.example`,
  phone: `+9198100300${10 + i}`,
  website: `https://${n.toLowerCase().replace(/ /g, "")}-e2e.example`,
  demoSlug: `${n.toLowerCase().replace(/ /g, "-")}-e2e`,
  observation: `The admissions page of ${n} Public School E2E does not open on a phone.`,
  createdAt: new Date(Date.now() - i * 60000).toISOString(),
  updatedAt: new Date(Date.now() - i * 60000).toISOString(),
}));
await page.evaluate(([k, walk]) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.leads = [...(d.leads || []).filter((l) => !String(l.id).startsWith("ol_e2ewalk")), ...walk];
  d.events = d.events || [];
  localStorage.setItem(k, JSON.stringify(d));
}, [OUTREACH_KEY, WALK]);
await page.goto(BASE + "/crm/leads/" + WALK[0].id, { waitUntil: "domcontentloaded" });
await page.getByTestId("lead-name").waitFor({ timeout: 10000 });
/* Lead to lead in place: what Next lead and back/forward do (the router moves, the screen stays). */
const goLead = (id) =>
  page.evaluate((lid) => {
    history.pushState({}, "", "/crm/leads/" + encodeURIComponent(lid));
    dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  }, id);
const others = (lead) => WALK.filter((w) => w.id !== lead.id).map((w) => w.instituteName);
let walked = 0;
for (let i = 0; i < WALK.length; i++) {
  const lead = WALK[i];
  if (i > 0) await goLead(lead.id);
  await page.waitForFunction((n) => document.querySelector('[data-testid="lead-name"]')?.textContent?.includes(n), lead.instituteName, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const onScreen = await page.getByTestId("lead-name").innerText();
  const c = page.getByTestId("compose");
  await c.getByRole("tab", { name: /^email/i }).click();
  await page.waitForTimeout(250);
  if (i === 0) {
    // Compose on the first lead: a manual edit that must stay with this lead only.
    await c.getByLabel("Message text").fill((await c.getByLabel("Message text").inputValue()) + "\nP.S. EDITED-FOR-FIRST-LEAD");
    await page.waitForTimeout(200);
  }
  const g = c.getByTestId("open-gmail");
  const gHref = (await g.evaluate((el) => el.tagName)) === "A" ? (await g.getAttribute("href")) || "" : "";
  const gBlock = gHref ? "" : await c.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  const gu = gHref ? new URL(gHref) : null;
  const su = gu?.searchParams.get("su") || "";
  const gb = gu?.searchParams.get("body") || "";
  const mail = `${su}\n${gb}`;
  await c.getByRole("tab", { name: /^whatsapp/i }).click();
  await page.waitForTimeout(250);
  const w = c.getByTestId("open-whatsapp");
  const wHref = (await w.evaluate((el) => el.tagName)) === "A" ? (await w.getAttribute("href")) || "" : "";
  const wText = wHref ? decodeURIComponent(wHref.split("?text=")[1] || "") : "";
  const wBlock = wHref ? "" : await c.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  const bad = [];
  if (!onScreen.includes(lead.instituteName)) bad.push(`screen shows "${onScreen}"`);
  if (!gu) bad.push("Gmail blocked: " + gBlock.replace(/\n/g, " "));
  else {
    if (gu.searchParams.get("to") !== lead.email) bad.push(`Gmail to=${gu.searchParams.get("to")}`);
    if (!su.includes(lead.instituteName)) bad.push(`subject "${su}"`);
    if (!gb.includes(lead.instituteName)) bad.push("body lacks own name");
    if (!gb.includes(`/site/${lead.demoSlug}`)) bad.push("body lacks own demo link");
    if (!gb.includes(lead.observation)) bad.push("body lacks own observation");
    const foreign = others(lead).filter((n) => mail.includes(n));
    if (foreign.length) bad.push("email names " + foreign.join(", "));
    if (i > 0 && /EDITED-FOR-FIRST-LEAD/.test(mail)) bad.push("the first lead's manual edit leaked in");
    if (i === 0 && !/EDITED-FOR-FIRST-LEAD/.test(gb)) bad.push("the manual edit is not in the Gmail link");
  }
  if (!wHref) bad.push("WhatsApp blocked: " + wBlock.replace(/\n/g, " "));
  else {
    if (!wHref.startsWith(`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=`)) bad.push("wa.me number " + wHref.slice(0, 40));
    if (!wText.includes(lead.instituteName)) bad.push("WhatsApp lacks own name");
    const foreign = others(lead).filter((n) => wText.includes(n));
    if (foreign.length) bad.push("WhatsApp names " + foreign.join(", "));
  }
  check(bad.length === 0, `lead ${i + 1} (${lead.instituteName}): Gmail and WhatsApp links are its own`, `lead ${i + 1} (${lead.instituteName}): ${bad.join("; ")}`);
  if (!bad.length) walked++;
}
check(walked === WALK.length, `all ${WALK.length} leads walked in place carry only their own text`, `${walked} of ${WALK.length} leads carried only their own text`);
/* Back to the first lead: its manual edit is still there (it used to be
   dropped without a word), and it is still its own. */
await goLead(WALK[0].id);
await page.waitForFunction((n) => document.querySelector('[data-testid="lead-name"]')?.textContent?.includes(n), WALK[0].instituteName, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
{
  const c = page.getByTestId("compose");
  await c.getByRole("tab", { name: /^email/i }).click();
  await page.waitForTimeout(250);
  const back = await c.getByLabel("Message text").inputValue();
  check(/EDITED-FOR-FIRST-LEAD/.test(back) && back.includes(WALK[0].instituteName), "returning to the first lead keeps its own manual edit", "the first lead's manual edit was lost on return");
}
const nextBtn = page.getByRole("button", { name: /^next lead/i });
if (await nextBtn.count()) {
  const before = await page.getByTestId("lead-name").innerText();
  await nextBtn.first().click();
  await page.waitForTimeout(400);
  check((await page.getByTestId("lead-name").innerText()) !== before, "Next lead moves to another lead in place");
}
await page.evaluate((k) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.leads = (d.leads || []).filter((l) => !String(l.id).startsWith("ol_e2ewalk"));
  d.events = (d.events || []).filter((e) => !String(e.leadId).startsWith("ol_e2ewalk"));
  localStorage.setItem(k, JSON.stringify(d));
}, OUTREACH_KEY);

/* ── Leak check: leads never enter the CMS snapshot ───────────────────── */
const inCms = await page.evaluate(([k, email]) => (localStorage.getItem(k) || "").includes(email), [CMS_KEY, LEAD.email]);
check(!inCms, "the lead's email is not in the CMS snapshot (so not in Export)");

/* ── Cleanup ──────────────────────────────────────────────────────────── */
await page.evaluate(([ok, ck, id]) => {
  localStorage.removeItem(ok);
  const data = JSON.parse(localStorage.getItem(ck) || "{}");
  if (id) {
    data.demoSites = (data.demoSites || []).filter((x) => x.id !== id);
    data.demoSiteSlots = (data.demoSiteSlots || []).filter((x) => x.id !== id);
  }
  data.demoSiteOpens = (data.demoSiteOpens || []).filter((x) => x.id !== "e2e_open_1");
  localStorage.setItem(ck, JSON.stringify(data));
}, [OUTREACH_KEY, CMS_KEY, demoId]);

const realErrors = consoleErrors.filter((e) => !/favicon|Failed to load resource|intercepted/i.test(e));
check(realErrors.length === 0, "no console errors", "console errors: " + realErrors.slice(0, 5).join(" | "));

await browser.close();
console.log(findings.length ? "\n" + findings.length + " FAILED" : "\nALL PASSED");
process.exit(findings.length ? 1 : 0);
