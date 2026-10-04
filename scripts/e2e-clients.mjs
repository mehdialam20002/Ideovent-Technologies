/**
 * End to end test of the client file (client-process-spec 14.5), in LOCAL mode, one headless Chrome.
 *
 *   node scripts/e2e-clients.mjs [baseUrl]              default http://localhost:5199
 *   E2E_NEGATIVE=1 node scripts/e2e-clients.mjs ...     serves src/lib/clients/rules.ts with the issued-document
 *                                                        freeze removed: the edit-after-issue check must FAIL
 *   E2E_NEGATIVE=strip node scripts/e2e-clients.mjs ... serves src/crm/clients/JourneyStrip.tsx with the step
 *                                                        classes of before 4 Oct 2026 (nothing clipped or wrapped):
 *                                                        the journey strip check must FAIL (E2E_UNTIL=1 is enough)
 *   E2E_OUT=<folder>                                    where the register CSV is saved (default: the OS temp
 *                                                        folder; never the repository)
 *
 * One lead at Proposal ("Example School", fictional contacts) is carried through the whole journey with a
 * page clock moved forward as the journey goes (page.clock.setFixedTime): the file opened from the lead;
 * the quotation blocked by its Settings blanks, then IDV/Q/2026-27/001; the proposal e-mail's Zoho link
 * carrying the text, the send recorded and the lead's follow-up cleared; day 3 in Today; "They said yes"
 * (the lead Won, the dashboard's Won count up by one); the proforma IDV/PI/2026-27/001; the paperwork
 * e-mail blocked until "I attached" is ticked; A1 in Today on due + 1; the advance recorded (UTR and the
 * "credited" tick required) and receipt IDV/RC/2026-27/001; the welcome WhatsApp; the welcome pack with no
 * watermark; the four-documents e-mail; kickoff and its summary; the content gate moved past with a reason;
 * a design round and the approval; build; QA; the accuracy e-mail; acceptance; the launch invoice locked
 * until the acceptance is recorded, then IDV/2026-27/001 for the fee less the advance; the cutover, the
 * source code and the admin-access row locked until the launch payment is recorded (then receipt 002, and
 * nothing outstanding); the handover WhatsApp blocked until the domain is "Yes, from the start"; the
 * handover document; support day 7, 25 and 30 in Today on their days; the review message with the Google
 * review link; the closing letter; the project closed and the client dormant; the Money tab's totals equal
 * to sums computed here; the register CSV saved outside the repository; a member (Act as) refused the
 * Clients screen, with no client card on her lead and no client code fetched; 360, 390 and 1440 px, light
 * and dark, with no sideways scroll; and the Clients screen itself: a Won lead without a file and "Not a
 * client", Add client, the List's filters, Renewals and the dashboard's client tiles. Nothing leaves the
 * machine: WhatsApp and Zoho are answered here and every other outside address is refused.
 *
 * The gate review of 4 Oct 2026 added: the Udyam number typed in Settings (it is not in the CRM's code); a
 * second advance proforma that cannot be made once the advance is billed and paid (the list says so, the dialog
 * says why, Issue stays off, and part 2 is not offered without a split advance); the journey strip's labels
 * inside their own step at every width; and scene 16, a file opened from a Won lead that issues its advance
 * proforma with no quotation made after the yes ("Against proposal: accepted on <the day it was Won>").
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] || "http://localhost:5199").replace(/\/$/, "");
const NEGATIVE = process.env.E2E_NEGATIVE ? (process.env.E2E_NEGATIVE === "strip" ? "strip" : "freeze") : "";
const OUT = process.env.E2E_OUT || tmpdir();
const OUTREACH_KEY = "ideovent_outreach_v1";
const CLIENTS_KEY = "ideovent_clients_v1";
const ACTOR_KEY = "ideovent_crm_local_actor";
const SESSION_KEY = "ideovent_admin_session";
const THEME_KEY = "ideovent-theme-v2";
const REVIEW_LINK = "https://g.page/r/CbQfQiU_imtBEBM/review";

/* The clock: India time, written as UTC instants. */
const at = (isoIst) => Date.parse(`${isoIst}:00+05:30`);
const J0 = at("2026-10-05T10:30"); // Monday: the file opens, the proposal goes
const J1 = at("2026-10-08T10:30"); // Thursday: day 3, the yes, the paperwork
const J2 = at("2026-10-16T10:30"); // Friday: the proforma is a day past due; the advance; onboarding to build
const J3 = at("2026-11-02T10:30"); // Monday: testing, the launch payment, go-live, handover
const J4 = at("2026-11-09T10:30"); // go-live + 7
const J5 = at("2026-11-27T10:30"); // go-live + 25
const J6 = at("2026-12-02T10:30"); // go-live + 30
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString();

/* ── Checks ─────────────────────────────────────────────────────────────── */
let scenario = "0";
let passes = 0;
const failed = [];
const check = (cond, msg, detail) => {
  if (cond) {
    passes++;
    console.log("ok    " + msg);
  } else {
    failed.push({ scenario, msg });
    const d = detail === undefined ? "" : `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
    console.log("FAIL  " + msg + d.slice(0, 500));
  }
};
/* The journey is one client: once a step of it stops, the later steps are reported as not run. E2E_UNTIL=<n> stops after scene n. */
let journeyStopped = "";
const UNTIL = Number(process.env.E2E_UNTIL) || 99;
async function scene(id, title, body, { journey = true } = {}) {
  scenario = String(id);
  if (id > UNTIL) return;
  console.log(`\n── ${id}. ${title}`);
  if (journey && journeyStopped) {
    check(false, `not run: the journey stopped in scenario ${journeyStopped}`);
    return;
  }
  try {
    await body();
  } catch (e) {
    check(false, `scenario ${id} stopped: ${String((e && e.message) || e).split("\n")[0]}`);
    if (journey) journeyStopped = String(id);
  }
}

/* ── The seed: one lead at Proposal, and a member with a lead of her own ── */
const OWNER = {
  id: "m_owner", userId: "local:m_owner", email: "owner@local.test", displayName: "Mehdi Alam", role: "owner",
  viewAll: true, canAddLeads: true, waDailyLimit: null, newLeadCap: 1000, mayColdCall: true, targets: {},
  senderName: "Mehdi Alam", senderPhone: "+917761921786", active: true, mustChangePassword: false,
  joinedAt: iso(J0 - 30 * DAY), createdAt: iso(J0 - 30 * DAY),
};
const ASHA = {
  id: "m_asha", userId: "local:m_asha", email: "asha@clients-e2e.example", displayName: "Asha Example", role: "member",
  viewAll: false, canAddLeads: false, waDailyLimit: 25, newLeadCap: 10, mayColdCall: false, targets: {},
  senderName: "Asha Example", active: true, mustChangePassword: false, joinedAt: iso(J0 - 20 * DAY), createdAt: iso(J0 - 21 * DAY),
};
const TEAM = { members: [OWNER, ASHA], notifications: [], requests: [], audit: [], bookings: [], rules: [], reviews: [], usage: {}, seq: 100 };
const LEAD_ID = "ol_cl_e2e_school";
const MEMBER_LEAD_ID = "ol_cl_e2e_coaching";
/* A deal marked Won on the pipeline before any client file: Clients lists it until it has one or is dismissed. */
const WON_LEAD_ID = "ol_cl_e2e_won";
/* Another Won deal, whose file scene 16 opens: stage 1 was done before the CRM, with no quotation in it. */
const WON2_LEAD_ID = "ol_cl_e2e_won2";
const LEADS = [
  {
    id: LEAD_ID, instituteName: "Example School", kind: "school", city: "Patna", source: "Referral", status: "proposal",
    contactName: "Ravi Example", phone: "+919800000101", whatsapp: "+919800000101", email: "office@example.org", language: "en",
    nextActionAt: iso(J0 + DAY), lastContactedAt: iso(J0 - 2 * DAY), createdAt: iso(J0 - 9 * DAY), updatedAt: iso(J0 - 2 * DAY),
    createdById: "m_owner", assigneeId: "m_owner",
  },
  {
    id: MEMBER_LEAD_ID, instituteName: "Example Coaching Centre", kind: "coaching", city: "Gaya", source: "CSV import", status: "proposal",
    contactName: "Sunita Example", phone: "+919800000202", email: "desk@example.net", language: "en",
    createdAt: iso(J0 - 12 * DAY), updatedAt: iso(J0 - 3 * DAY), createdById: "m_owner", assigneeId: "m_asha",
    assignedAt: iso(J0 - 10 * DAY), assignedById: "m_owner",
  },
  {
    id: WON_LEAD_ID, instituteName: "Example Dental Clinic", kind: "dental", city: "Patna", source: "Referral", status: "won",
    contactName: "Dr Example", phone: "+919800000303", email: "reception@example.com", language: "en",
    createdAt: iso(J0 - 20 * DAY), updatedAt: iso(J0 - 5 * DAY), createdById: "m_owner", assigneeId: "m_owner", closedAt: iso(J0 - 5 * DAY),
  },
  {
    id: WON2_LEAD_ID, instituteName: "Example Smile Clinic", kind: "dental", city: "Gaya", source: "Referral", status: "won",
    contactName: "Dr Sample", phone: "+919800000404", email: "desk@example-smile.example", language: "en",
    createdAt: iso(J0 - 15 * DAY), updatedAt: iso(J0 - 3 * DAY), createdById: "m_owner", assigneeId: "m_owner", closedAt: iso(J0 - 3 * DAY),
  },
];
const EVENTS = [
  { id: "oe_cl_0", leadId: WON_LEAD_ID, actorId: "m_owner", at: iso(J0 - 5 * DAY), type: "status", detail: "Status: Proposal to Won" },
  { id: "oe_cl_00", leadId: WON2_LEAD_ID, actorId: "m_owner", at: iso(J0 - 3 * DAY), type: "status", detail: "Status: Proposal to Won" },
  { id: "oe_cl_1", leadId: LEAD_ID, actorId: "m_owner", at: iso(J0 - 2 * DAY), type: "call", detail: "Discovery call: a five-page website before admissions." },
  { id: "oe_cl_2", leadId: LEAD_ID, actorId: "m_owner", at: iso(J0 - 2 * DAY + 60e3), type: "status", detail: "Status: Call to Proposal" },
];
const SETTINGS = { signature: "Mehdi Alam\nIdeovent Technologies", quietStart: "20:00", quietEnd: "08:00", alertOnDemoOpen: false };

/* ── The browser ────────────────────────────────────────────────────────── */
async function launch() {
  const cands = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].filter(Boolean);
  for (const p of cands) {
    try {
      return await chromium.launch({ executablePath: p, headless: true });
    } catch {
      /* the next one */
    }
  }
  return chromium.launch({ channel: "chrome", headless: true });
}
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
context.setDefaultNavigationTimeout(120000);
context.setDefaultTimeout(20000);

/* Nothing leaves the machine: WhatsApp and Zoho are answered here, every other outside address refused. */
const opened = [];
const refused = [];
await context.route((url) => !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname), (route) => {
  const u = route.request().url();
  if (/^https:\/\/(wa\.me|web\.whatsapp\.com|api\.whatsapp\.com|mail\.zoho\.(in|com))\//.test(u)) {
    opened.push(u);
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>intercepted by e2e-clients</p>" });
  }
  refused.push(u);
  return route.abort();
});
/* The negative controls: rules.ts served with the issued-document freeze removed, or the journey strip with its old classes. */
let negApplied = false;
if (NEGATIVE === "strip") {
  const OLD = [
    ["flex h-full min-h-14 w-[7.5rem] flex-col items-stretch gap-0.5 overflow-hidden border-r", "flex h-full min-h-14 w-[7.5rem] flex-col items-start gap-0.5 border-r"],
    ["flex min-w-0 items-start gap-1 font-semibold", "flex items-center gap-1 font-semibold"],
    ["line-clamp-2 min-w-0 break-words leading-tight", "truncate"],
    ["block min-w-0 truncate text-muted-foreground", "truncate text-muted-foreground"],
  ];
  await context.route(/\/src\/crm\/clients\/JourneyStrip\.tsx/, async (route) => {
    try {
      const res = await route.fetch();
      let src = await res.text();
      const before = src;
      for (const [now, old] of OLD) src = src.split(now).join(old);
      if (src !== before && OLD.every(([now]) => !src.includes(now))) negApplied = true;
      return route.fulfill({ response: res, body: src });
    } catch {
      return route.continue();
    }
  });
}
if (NEGATIVE === "freeze") {
  await context.route(/\/src\/lib\/clients\/rules\.ts/, async (route) => {
    try {
      const res = await route.fetch();
      const src = await res.text();
      const broken = src.replace(/refuse\("42501",\s*"An issued document does not change\. Cancel it with a reason and make a new one\."\)/, "next");
      if (broken !== src) negApplied = true;
      return route.fulfill({ response: res, body: broken });
    } catch {
      return route.continue();
    }
  });
}
await context.addInitScript(([k]) => {
  try {
    sessionStorage.setItem(k, "1");
  } catch {
    /* no storage */
  }
  window.__mailto = [];
  window.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="mailto:"]') : null;
    if (!a) return;
    window.__mailto.push(a.getAttribute("href"));
    e.preventDefault();
  }, true);
  window.__copied = [];
  if (window.Clipboard) Clipboard.prototype.writeText = function (t) { window.__copied.push(String(t)); return Promise.resolve(); };
}, [SESSION_KEY]);

const errors = [];
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("crash", () => errors.push("the journey's tab crashed"));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text()) && errors.push(m.text()));
page.on("dialog", (d) => d.accept());
/* A send opens WhatsApp or Zoho in a new tab (answered locally above): close those popups at once. */
context.on("page", async (p) => {
  if (p !== page && (await p.opener().catch(() => null))) await p.close().catch(() => {});
});

/* ── Helpers ────────────────────────────────────────────────────────────── */
const settle = (ms = 400) => page.waitForTimeout(ms);
async function until(fn, ms = 15000, step = 200) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      if (await fn()) return true;
    } catch {
      /* not yet */
    }
    if (Date.now() > end) return false;
    await page.waitForTimeout(step);
  }
}
const setClock = (t) => page.clock.setFixedTime(t);
const goto = async (path, ms = 500) => {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await settle(ms);
};
const visible = (loc) => loc.first().isVisible().catch(() => false);
const textOf = (loc) => loc.first().innerText().then((t) => t.replace(/\s+/g, " ").trim(), () => "");
const tid = (id) => page.getByTestId(id);
const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), CLIENTS_KEY);
const outreach = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), OUTREACH_KEY);
const setActor = (id) => page.evaluate(([k, v]) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k)), [ACTOR_KEY, id]);
const sideways = (p = page) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const rsText = (n) => `Rs ${new Intl.NumberFormat("en-IN").format(n)}`;
/** The journey strip's steps whose text runs past the step's own right edge, with by how many px (none is right). */
const stripOverflow = (p = page) => p.evaluate(() => [...document.querySelectorAll('[data-testid="journey-step"]')].map((b) => {
  const right = b.getBoundingClientRect().right;
  return [b.getAttribute("data-stage"), Math.max(0, ...[...b.querySelectorAll("span")].map((s) => Math.ceil(s.getBoundingClientRect().right - right)))];
}).filter(([, px]) => px > 0));
const indiaDay = (t) => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 10);

let PID = "";
let CID = "";
const project = async () => ((await store()).projects || []).find((p) => p.id === PID);
const docsOf = async (kind) => ((await store()).documents || []).filter((d) => d.projectId === PID && (!kind || d.kind === kind));

const item = (id) => page.locator(`[data-testid="checklist-item"][data-item="${id}"]`);
const itemState = (id) => item(id).first().getAttribute("data-state").catch(() => null);
async function openClient() {
  await goto(`/crm/clients/${PID}`, 300);
  await tid("client-page").first().waitFor({ timeout: 60000 });
  await settle(300);
}
async function inItem(id, testId) {
  const b = item(id).getByTestId(testId).first();
  await b.scrollIntoViewIfNeeded().catch(() => {});
  await b.click();
}
async function waitDone(id, ms = 15000) {
  return until(async () => (await itemState(id)) === "done", ms);
}
async function tickItem(id, fact) {
  if (fact !== undefined) {
    const f = item(id).getByTestId("item-fact").first();
    await f.fill(fact);
  }
  await inItem(id, "item-tick");
  return waitDone(id);
}
/** Ticks every open line of an item, one at a time, each with its date, waiting for each save before the next. */
async function tickLines(id) {
  const ticks = item(id).getByTestId("line-tick");
  for (let i = 0; i < 30; i++) {
    const before = await ticks.count();
    if (!before) break;
    await ticks.first().click();
    await until(async () => (await ticks.count()) < before, 8000, 150);
  }
  return waitDone(id);
}
async function choose(id, value) {
  await item(id).getByTestId("item-choice").first().selectOption(value);
  return waitDone(id);
}
async function fillForm(prefix, values) {
  for (const [k, v] of Object.entries(values)) {
    const el = page.locator(`#${prefix}-${k.replace(/\./g, "-")}`).first();
    const tag = await el.evaluate((n) => n.tagName.toLowerCase());
    const type = await el.getAttribute("type");
    if (tag === "select") await el.selectOption(String(v));
    else if (type === "checkbox") (v ? await el.check() : await el.uncheck());
    else await el.fill(String(v));
  }
  await tid(`${prefix}-save`).first().click();
  await settle(500);
}
/** Fills every [blank] of the open message with a plain value named by the blank. */
async function fillBlanks() {
  const inputs = page.locator('[data-testid="fill-blanks"] input[data-blank]');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    if ((await el.inputValue()).trim()) continue;
    const name = (await el.getAttribute("data-blank")) || "";
    const v = /time/i.test(name) ? "11:00" : /date|day|when/i.test(name) ? "Monday 19 Oct" : /amount|fee|price|rs\b/i.test(name) ? "9,000" : /number|no\b/i.test(name) ? "3" : "as agreed on the call";
    await el.fill(v);
  }
  return n;
}
/** In the open compose: fills the blanks, ticks "I attached" when asked, presses the send link. */
async function send({ attach = false, via = "auto" } = {}) {
  await tid("client-compose").first().waitFor({ timeout: 15000 });
  await settle(300);
  await fillBlanks();
  if (attach || (await visible(tid("compose-attached")))) {
    const box = tid("compose-attached").first();
    if (await visible(box)) await box.check();
  }
  const which = via !== "auto" ? via : (await page.locator('[data-testid="client-open-zoho"]').count()) ? "client-open-zoho" : "client-open-wa";
  const link = tid(which).first();
  if (!(await until(async () => (await link.evaluate((n) => n.tagName)) === "A", 6000))) {
    console.log(`      (the send stays blocked: ${await blockersText()})`);
    return false;
  }
  await link.click();
  return until(() => visible(tid("compose-recorded")), 10000);
}
const blockersText = () => textOf(page.locator('[data-testid="client-compose"] ul[aria-label="Blocked"]'));
/** The send link of the open compose is a disabled button (blocked), checked after the screen settles. */
async function composeBlocked() {
  await settle(500);
  const wa = page.locator('[data-testid="client-open-wa"], [data-testid="client-open-zoho"]').first();
  return (await wa.evaluate((n) => n.tagName)) !== "A";
}
/** The href of the open compose's send link, once it is a link. */
async function sendHref(testId) {
  const link = tid(testId).first();
  await until(async () => (await link.evaluate((n) => n.tagName)) === "A", 6000);
  return link.getAttribute("href");
}
async function moveNext() {
  const from = (await project())?.stage;
  await tid("move-next").first().click();
  return until(async () => (await project())?.stage !== from, 10000);
}
async function newDoc(label) {
  const sel = tid("new-doc-kind").first();
  await sel.scrollIntoViewIfNeeded().catch(() => {});
  await sel.selectOption({ label });
  await tid("new-doc-open").first().click();
  await tid("document-dialog").first().waitFor({ timeout: 10000 });
  await settle(300);
}
async function issueOpenDoc() {
  const b = tid("doc-issue").first();
  if (await b.isDisabled()) return null;
  await b.click();
  await until(async () => (await tid("document-dialog").first().getAttribute("data-status")) === "issued", 15000);
  return textOf(tid("doc-number"));
}
async function recordPayment({ ref, expectAmount }) {
  await tid("record-payment-open").first().click();
  await tid("record-payment").first().waitFor({ timeout: 10000 });
  const amount = await tid("pay-amount").first().inputValue();
  const blockedAtFirst = await tid("pay-save").first().isDisabled();
  await tid("pay-ref").first().fill(ref);
  const blockedWithoutTick = await tid("pay-save").first().isDisabled();
  await tid("pay-credited").first().check();
  const open = !(await tid("pay-save").first().isDisabled());
  await tid("pay-save").first().click();
  await tid("payment-recorded").first().waitFor({ timeout: 10000 });
  await tid("issue-receipt").first().click();
  await until(() => visible(tid("receipt-issued")), 10000);
  const receipt = await textOf(tid("receipt-issued"));
  return { amount, blockedAtFirst, blockedWithoutTick, open, receipt, ok: String(expectAmount) === amount };
}
async function todayTasks() {
  await goto("/crm/today", 300);
  await until(() => visible(tid("clients-today")), 20000);
  return page.locator('[data-testid="today-client-task"]').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
}
/** Sums by the rules of 5.1, computed here from the stored records (the Money tab must agree). */
function expectedTotals(s, today) {
  const docs = s.documents || [];
  const pays = (s.payments || []).filter((p) => p.status === "recorded");
  const credits = (d) => docs.filter((x) => x.kind === "credit_note" && x.status === "issued" && x.relatedDoc === d.id).reduce((n, x) => n + (x.amount || 0), 0);
  const paid = (d) => pays.filter((p) => p.againstDoc === d.id).reduce((n, p) => n + p.amount + p.tds, 0);
  const bal = (d) => (d.amount || 0) - credits(d) - paid(d);
  const launchFor = (pid) => docs.find((x) => x.kind === "invoice" && x.status === "issued" && x.projectId === pid && x.milestone === "LAUNCH_50");
  const counts = (d) => d.status === "issued" && ["invoice", "proforma"].includes(d.kind) && !(d.kind === "proforma" && launchFor(d.projectId));
  const outstanding = docs.filter(counts).reduce((n, d) => n + Math.max(0, bal(d)), 0);
  const overdue = docs.filter((d) => counts(d) && d.dueOn && d.dueOn < today && bal(d) > 0).reduce((n, d) => n + bal(d), 0);
  const received = pays.filter((p) => p.receivedOn.startsWith(today.slice(0, 7))).reduce((n, p) => n + p.amount, 0);
  return { outstanding, overdue, received };
}
async function moneyMatches(label, t) {
  await goto("/crm/clients?tab=money", 300);
  await tid("clients-money").first().waitFor({ timeout: 20000 });
  const exp = expectedTotals(await store(), indiaDay(t));
  const shown = { outstanding: await textOf(tid("money-outstanding")), overdue: await textOf(tid("money-overdue-total")), received: await textOf(tid("money-received-month")) };
  check(shown.outstanding === rsText(exp.outstanding) && shown.overdue === rsText(exp.overdue) && shown.received === rsText(exp.received),
    `${label}: the Money tab's totals equal the sums computed here (outstanding ${rsText(exp.outstanding)}, overdue ${rsText(exp.overdue)}, received this month ${rsText(exp.received)})`, shown);
  return exp;
}

/* ── Seeded from a same-origin page that is not the app ─────────────────── */
await setClock(J0);
await goto("/robots-crm.txt", 100);
await page.evaluate(([ok, ck, ak, data]) => {
  localStorage.setItem(ok, JSON.stringify(data));
  localStorage.removeItem(ck);
  localStorage.removeItem(ak);
  localStorage.removeItem("ideovent_crm_scope_v1");
}, [OUTREACH_KEY, CLIENTS_KEY, ACTOR_KEY, { leads: LEADS, events: EVENTS, settings: SETTINGS, team: TEAM }]);

/* ── 1. Stage 1: open the file, the quotation, the proposal ─────────────── */
await scene(1, "Open the client file from the lead; the quotation; the proposal e-mail", async () => {
  await goto(`/crm/leads/${LEAD_ID}`, 300);
  await tid("lead-client-card").first().waitFor({ timeout: 90000 });
  check(await visible(tid("lead-open-client-file")), "the lead at Proposal offers Open client file (Mehdi only)");
  await tid("lead-open-client-file").first().click();
  await tid("open-client-file").first().waitFor();
  check(!(await visible(tid("open-submit"))), "Open client file waits for the two questions (one-time or monthly; in India)");
  await tid("open-engagement-one_time").first().check();
  await tid("open-india-yes").first().check();
  await tid("open-fee").first().fill("18000");
  await tid("open-weeks").first().fill("4");
  await tid("open-scope").first().fill("Five-page school website as set out in the SOW");
  check((await tid("open-call").first().inputValue()) === indiaDay(J0 - 2 * DAY), "the discovery call date comes from the lead's last call line", await tid("open-call").first().inputValue());
  await tid("open-submit").first().click();
  await page.waitForURL(/\/crm\/clients\/pr_/, { timeout: 15000 });
  PID = new URL(page.url()).pathname.split("/").pop();
  await tid("client-page").first().waitFor({ timeout: 30000 });
  const s = await store();
  const cl = (s.clients || [])[0];
  CID = cl?.id || "";
  check((await textOf(tid("stage-pill"))).startsWith("1. Proposal"), "the file opens at stage 1, Proposal and quotation", await textOf(tid("stage-pill")));
  const over = await stripOverflow();
  check(over.length === 0, "at 1440 px every journey step's label stays inside its own step", over);
  check(cl?.leadId === LEAD_ID && cl.contactName === "Ravi Example" && cl.inIndia === true && cl.language === "en", "the client copies the lead's name, contacts and language, and \"in India\"", cl);

  await inItem("p_brief", "item-fields");
  await tid("brief-form").first().waitFor();
  await fillForm("brief-form", { "brief.goals": "Admissions enquiries from parents", "brief.pages": "Home, About, Academics, Admissions, Contact", "brief.decisionMaker": "The principal" });
  check(await waitDone("p_brief"), "the brief ticks itself when goals, pages and the decision-maker are in");
  check((await itemState("p_scope")) === "done", "the scope ticks itself: fee, a scope line and the weeks came with the file");
  await inItem("p_legal", "item-fields");
  await tid("client-form").first().waitFor();
  await fillForm("client-form", { legalName: "Example School Trust", signatoryName: "Ravi Example", signatoryDesignation: "Secretary" });
  check(await waitDone("p_legal"), "legal name and signatory recorded");

  await inItem("p_quote", "item-document");
  await tid("document-dialog").first().waitFor();
  const problems = await textOf(tid("doc-problems"));
  check(/\[firm PAN\]/.test(problems) && /\[Udyam number\]/.test(problems) && /\[authorised signatory\]/.test(problems) && /\[asset deadline days\]/.test(problems) && (await tid("doc-issue").first().isDisabled()),
    "the quotation draft cannot be issued while Settings' firm PAN, Udyam number, signatory and asset deadline are blanks", problems);
  check(await visible(tid("doc-settings-link")), "and the dialog points to Settings > Client process");

  await goto("/crm/settings/clients", 300);
  await tid("client-settings").first().waitFor({ timeout: 60000 });
  check(/FACTS keeps this blank until the deed names who may sign/.test(await textOf(tid("cs-signatory-note"))), "Settings says why the signatory is blank and what it blocks");
  await page.locator("#cs-signatory").fill("Example Partner");
  await page.locator("#cs-firmPan").fill("AAAFE0000E");
  await page.locator("#cs-udyam").fill("UDYAM-XX-00-0000001");
  await page.locator("#cs-bankName").fill("Example Bank");
  await page.locator("#cs-accountName").fill("Ideovent Technologies");
  await page.locator("#cs-accountNo").fill("000011112222");
  await page.locator("#cs-ifsc").fill("EXMP0000001");
  await page.locator("#cs-branch").fill("Saket");
  await page.locator("#cs-upiId").fill("ideovent@example");
  await tid("cs-billing-save").first().click();
  await until(() => visible(page.locator('[data-testid="cs-billing"] [role="status"]')));
  for (const [k, v] of [["assetDeadlineDays", "7"], ["receiptDays", "1"], ["refundDays", "7"], ["disputeWindowDays", "7"], ["removalDays", "30"]]) await page.locator(`#cp-${k}`).fill(v);
  await tid("cs-policy-save").first().click();
  await until(() => visible(page.locator('[data-testid="cs-policy"] [role="status"]')));
  const st = (await store()).settings || {};
  check(st.billing?.signatory === "Example Partner" && st.billing?.firmPan === "AAAFE0000E" && st.billing?.udyam === "UDYAM-XX-00-0000001" && st.policy?.assetDeadlineDays === 7 && st.policy?.receiptDays === 1,
    "Settings > Client process saves the firm's details (the Udyam number with them) and the policy numbers", { billing: st.billing, policy: st.policy });
  const waiting = await page.locator('[data-testid="wording-item"][data-approved="0"]').count();
  check(waiting > 10, `Settings lists the new and edited wording to approve (${waiting} waiting)`);

  await openClient();
  await inItem("p_quote", "item-document");
  await tid("document-dialog").first().waitFor();
  const qno = await issueOpenDoc();
  check(qno === "IDV/Q/2026-27/001", "the quotation is issued as IDV/Q/2026-27/001", qno);
  const q = (await docsOf("quotation"))[0];
  check(q?.amount === 18000 && q?.validUntil === "2026-10-20", "issued for Rs 18,000, valid until 20 Oct 2026 (issue + 15)", q && { amount: q.amount, validUntil: q.validUntil });

  /* The freeze: an issued document never changes (E2E_NEGATIVE serves rules.ts without it). */
  const edit = await page.evaluate(async ([id, cid, pid]) => {
    const m = await import("/src/lib/clients/store.ts");
    try {
      await m.getClientStore().saveDraft({ id, clientId: cid, projectId: pid, kind: "quotation", amount: 1, data: {} });
      return "changed";
    } catch (e) {
      return `refused: ${e && e.message}`;
    }
  }, [q?.id, CID, PID]);
  const q2 = (await docsOf("quotation"))[0];
  check(/^refused/.test(edit) && q2?.amount === 18000 && q2?.number === "IDV/Q/2026-27/001", "an issued quotation cannot be edited afterwards (the freeze)", { edit, amount: q2?.amount, number: q2?.number });

  await inItem("p_sent", "item-message");
  await tid("client-compose").first().waitFor();
  check((await tid("client-compose").first().getAttribute("data-template")) === "cp_proposal_send_em_en", "the proposal e-mail opens in the client's language (English)");
  await fillBlanks();
  check(await composeBlocked(), "it waits until the quotation is ticked as attached");
  await tid("compose-attached").first().check();
  const href = await sendHref("client-open-zoho");
  const ct = href ? decodeURIComponent(new URL(href).searchParams.get("ct") || "") : "";
  check(/^mailto:office@example\.org\?/.test(ct) && /Example School/.test(ct) && /subject=/.test(ct), "the Zoho link carries the address, the subject and the text", ct.slice(0, 160));
  await tid("client-open-zoho").first().click();
  check(await until(() => visible(tid("compose-recorded"))), "pressing it records the send on the client's timeline");
  check(await waitDone("p_sent"), "and ticks Proposal sent");
  const lead = ((await outreach()).leads || []).find((l) => l.id === LEAD_ID);
  check(lead?.status === "proposal" && !lead?.nextActionAt, "the lead stays at Proposal and its own follow-up date is cleared (one reminder, not two)", lead && { status: lead.status, next: lead.nextActionAt });
  const leadSent = ((await outreach()).events || []).filter((e) => e.leadId === LEAD_ID && e.type === "sent").length;
  check(leadSent === 0, "no client message became a lead \"sent\" line (decision 5)");
  check(opened.some((u) => /mail\.zoho\.in/.test(u)), "Zoho was answered locally");
});

/* ── 2. Day 3, and the yes ──────────────────────────────────────────────── */
let wonBefore = -1;
await scene(2, "Day 3 in Today; \"They said yes\": the lead Won and the dashboard's Won count", async () => {
  await setClock(J1);
  const tasks = await todayTasks();
  check(tasks.some((t) => /Day 3: page 2/.test(t) && /Example School/.test(t)), "day 3 of the proposal shows in Today > Clients", tasks);
  await goto("/crm", 300);
  await tid("kpi-counts").first().waitFor({ timeout: 60000 });
  const wonTile = page.locator('[data-testid="kpi-counts"] a', { hasText: "Won" }).first();
  wonBefore = Number(((await textOf(wonTile)).match(/Won\s+(\d+)/) || [])[1]);
  await openClient();
  await tid("said-yes").first().click();
  check(await until(async () => (await project())?.stage === "agreement"), "They said yes moves the file to stage 2");
  check(await until(async () => ((await outreach()).leads || []).find((l) => l.id === LEAD_ID)?.status === "won"), "and the lead to Won");
  const status = ((await outreach()).events || []).filter((e) => e.leadId === LEAD_ID && e.type === "status").map((e) => e.detail);
  check(status.includes("Status: Proposal to Won"), "with the same status line the lead page writes", status);
  await goto("/crm", 300);
  await tid("kpi-counts").first().waitFor({ timeout: 60000 });
  const wonAfter = Number(((await textOf(page.locator('[data-testid="kpi-counts"] a', { hasText: "Won" }).first())).match(/Won\s+(\d+)/) || [])[1]);
  check(wonAfter === wonBefore + 1, `the dashboard's Won count goes up by one (${wonBefore} to ${wonAfter})`);
  check(await visible(tid("client-tiles")), "the dashboard shows the four client tiles under the existing ones");
});

/* ── 3. Stage 2: agreement, proforma, paperwork ─────────────────────────── */
await scene(3, "Stage 2: billing, SOW and agreement, the proforma, the paperwork e-mail", async () => {
  await openClient();
  await inItem("a_billing", "item-fields");
  await tid("billing-form").first().waitFor();
  await fillForm("billing-form", { billingAddress: "1 Example Road, Patna 800001", state: "Bihar" });
  check(await waitDone("a_billing"), "billing details recorded");
  await inItem("a_sow", "item-sow");
  await tid("sow-form").first().waitFor();
  await tid("sow-ref").first().fill("SOW-ES-01");
  await tid("sow-golive").first().fill("2026-11-20");
  await tid("sow-save").first().click();
  check(await waitDone("a_sow"), "SOW signed, with its reference and go-live target");
  check(await tickItem("a_sa", indiaDay(J1)), "Service Agreement signed, with its effective date");
  check(await tickItem("a_four"), "the four numbers match");
  check(await tickItem("a_partner", "8 Oct 2026, WhatsApp"), "the other partner's written yes recorded");
  check(await choose("a_nda", "not_needed"), "NDA: not needed");
  check(await choose("a_optout", "no"), "portfolio opt-out asked: no");
  await inItem("a_pi", "item-document");
  await tid("document-dialog").first().waitFor();
  const pino = await issueOpenDoc();
  check(pino === "IDV/PI/2026-27/001", "the proforma for the advance is IDV/PI/2026-27/001", pino);
  const pi = (await docsOf("proforma"))[0];
  check(pi?.amount === 9000 && pi?.dueOn === "2026-10-15", "for Rs 9,000 (50%), due 15 Oct 2026 (issue + 7)", pi && { amount: pi.amount, dueOn: pi.dueOn });
  await inItem("a_paperwork", "item-message");
  await tid("client-compose").first().waitFor();
  await fillBlanks();
  check(await composeBlocked(), "the paperwork e-mail is blocked until \"I attached\" is ticked");
  check(await send({ attach: true }), "then it opens in Zoho and the send is recorded");
  check(await waitDone("a_paperwork"), "Paperwork e-mail sent");
});

/* ── 4. A1, the advance, the receipt ────────────────────────────────────── */
await scene(4, "A1 on due + 1; the advance recorded (UTR and credited required); receipt IDV/RC/2026-27/001", async () => {
  await setClock(J2);
  const tasks = await todayTasks();
  const a1 = tasks.find((t) => /A1: the advance IDV\/PI\/2026-27\/001 is past due/.test(t)) || "";
  check(/Money · today/.test(a1), "A1 shows in Today, as money due today, the day after the proforma's due date", tasks);
  await openClient();
  const r = await recordPayment({ ref: "UTR000000000001", expectAmount: 9000 });
  check(r.ok, "Record payment offers the proforma's open balance, Rs 9,000", r.amount);
  check(r.blockedAtFirst && r.blockedWithoutTick && r.open, "it refuses without the UTR, and without the \"credited in the bank\" tick", r);
  check(/IDV\/RC\/2026-27\/001/.test(r.receipt), "the receipt is issued the same day: IDV/RC/2026-27/001", r.receipt);
  check(await waitDone("a_credit") && await waitDone("a_receipt"), "advance credited and receipt issued tick themselves");
  /* The advance is billed once (gate review of 4 Oct 2026: a paid advance could be billed again as "part 2" or a new proforma). */
  const opts = await tid("new-doc-kind").first().locator("option").evaluateAll((os) => os.map((o) => o.textContent));
  check(opts.includes("Proforma for the advance (cannot be made now)") && !opts.some((t) => /part 2 of a split advance/.test(t || "")),
    "Documents: the advance proforma says it cannot be made now, and part 2 is not offered (no split advance)", opts);
  await newDoc("Proforma for the advance (cannot be made now)");
  const why = await textOf(tid("doc-problems"));
  check(/The advance is already on IDV\/PI\/2026-27\/001 \(issued 8 Oct 2026\), and money was received against it: a second proforma would bill it twice\./.test(why)
    && (await tid("doc-issue").first().isDisabled()), "its dialog says why (IDV/PI/2026-27/001 is billed and paid) and Issue stays off", why);
  await page.locator('[data-testid="document-dialog"] button[aria-label="Close"]').first().click();
  await settle(300);
  check((await docsOf("proforma")).length === 1, "and no second proforma was made, not even a draft", (await docsOf("proforma")).map((d) => d.number || d.status));
  check(await moveNext(), "every gate of stage 2 is met: on to Welcome and onboarding");
});

/* ── 5. Stage 3: welcome ────────────────────────────────────────────────── */
await scene(5, "Stage 3: the welcome WhatsApp, the receipt e-mail, the welcome pack, the four documents", async () => {
  await openClient();
  await inItem("w_welcome", "item-message");
  await tid("client-compose").first().waitFor();
  await fillBlanks();
  check(await composeBlocked() && /E-mail the receipt first/.test(await blockersText()), "the welcome WhatsApp says the receipt was e-mailed, so it waits for the receipt e-mail", await blockersText());
  await inItem("w_receipt", "item-message");
  await tid("client-compose").first().waitFor();
  check(/Your payment of Rs\. 9,000, received on 16 Oct 2026 \(reference UTR000000000001\), is acknowledged in receipt IDV\/RC\/2026-27\/001/.test(await page.locator("#msg-body").inputValue()),
    "the receipt e-mail names the payment, its reference and the receipt", (await page.locator("#msg-body").inputValue()).slice(0, 220));
  check(/Nothing is outstanding on IDV\/PI\/2026-27\/001\./.test(await page.locator("#msg-body").inputValue()), "and the balance of the proforma it was paid against");
  check(await send({ attach: true }) && await waitDone("w_receipt"), "the receipt e-mail, with the receipt attached");
  await inItem("w_welcome", "item-message");
  await tid("client-compose").first().waitFor();
  check((await tid("client-compose").first().getAttribute("data-template")) === "cp_welcome_wa_en", "the welcome WhatsApp in English (the client's language)");
  await fillBlanks();
  const wa = await sendHref("client-open-wa");
  if (!wa) console.log(`      (blocked: ${await blockersText()})`);
  const text = wa ? decodeURIComponent(new URL(wa).searchParams.get("text") || "") : "";
  check(/^https:\/\/wa\.me\/919800000101\?/.test(wa || "") && /advance has been credited/.test(text), "its WhatsApp link goes to the client's number with the text in it", (wa || "").slice(0, 80));
  check(await send({ via: "client-open-wa" }) && await waitDone("w_welcome"), "sent and recorded");
  for (const id of ["w_folder", "w_repo", "w_vault"]) check(await tickItem(id), `${id} ticked`);
  await inItem("w_staging", "item-fields");
  await tid("staging-form").first().waitFor();
  await fillForm("staging-form", { stagingUrl: "https://staging.example.org" });
  check(await tickItem("w_staging"), "the staging URL set, then ticked (noindex, password-protected)");
  await inItem("w_pack", "item-document");
  await tid("document-dialog").first().waitFor();
  await issueOpenDoc();
  check(await waitDone("w_pack"), "the welcome pack made final");
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), tid("doc-download").first().click()]);
  const pdf = readFileSync(await dl.path()).toString("latin1");
  check(/^%PDF/.test(pdf) && /Welcome to Ideovent Technologies/.test(pdf) && !/DRAFT, NOT FOR SENDING/.test(pdf), "the welcome pack downloads as a PDF with no watermark", dl.suggestedFilename());
  check(/^Ideovent-Welcome-ExampleSchool-2026-10-16\.pdf$/.test(dl.suggestedFilename()), "named Ideovent-Welcome-ExampleSchool-<date>.pdf", dl.suggestedFilename());
  await inItem("w_docs", "item-message");
  check(await send({ attach: true }) && await waitDone("w_docs"), "the e-mail with the four documents");
  await inItem("w_kickoff", "item-fields");
  await tid("kickoff-form").first().waitFor();
  await fillForm("kickoff-form", { "dates.kickoff": "2026-10-16", kickoffTime: "15:00" });
  check(await waitDone("w_kickoff"), "kickoff date and time agreed");
  check(await moveNext(), "on to the kickoff call");
});

/* ── 6. Stages 4 to 7 ───────────────────────────────────────────────────── */
await scene(6, "Kickoff and its summary; the content gate moved past with a reason; a design round and the approval; build", async () => {
  await openClient();
  await inItem("k_call", "item-call");
  check(await waitDone("k_call"), "kickoff call held");
  check(await tickLines("k_A"), "Kickoff Checklist Section A: six lines tick themselves, three by hand with their dates");
  await inItem("k_D", "item-fields");
  await tid("people-form").first().waitFor();
  await fillForm("people-form", { pointOfContact: "Ravi Example", escalationContact: "The principal", commsChannel: "WhatsApp", weeklyUpdateDay: "5" });
  check(await waitDone("k_D"), "people and communication recorded");
  await inItem("k_E", "item-fields");
  await tid("dates-form").first().waitFor();
  await fillForm("dates-form", { "dates.devStart": "2026-10-26", "dates.contentCutoff": "2026-10-23" });
  check(await waitDone("k_E"), "the schedule recorded");
  await inItem("k_summary", "item-message");
  check(await send() && await waitDone("k_summary"), "\"What we agreed today\" sent");
  await inItem("k_confirmed", "item-approval");
  await page.getByTestId("approval-k_confirmed").getByTestId("approval-words").fill("Confirmed.");
  await page.getByTestId("approval-k_confirmed").getByTestId("approval-save").click();
  check(await waitDone("k_confirmed"), "they replied \"confirmed\"");
  check(await moveNext(), "on to content collection");

  await tid("move-anyway").first().click();
  await tid("anyway-reason-text").first().fill("The logo is being redrawn; design starts on real text meanwhile");
  await tid("anyway-reason-submit").first().click();
  check(await until(async () => (await project())?.stage === "design"), "the content gate is moved past only with a written reason");
  const p = await project();
  check(p?.gateOverrides?.some((o) => o.stage === "content" && /logo is being redrawn/.test(o.reason)), "the reason is kept on the project");
  check(/Overridden/.test(await textOf(page.locator('[data-testid="journey-step"][data-stage="content"]'))), "and the journey strip shows stage 5 red, Overridden");

  await inItem("d_wire", "item-message");
  check(await send({ attach: true }) && await waitDone("d_wire"), "wireframes sent");
  await inItem("d_wire_ok", "item-approval");
  await page.getByTestId("approval-d_wire_ok").getByTestId("approval-words").fill("The structure is fine.");
  await page.getByTestId("approval-d_wire_ok").getByTestId("approval-save").click();
  check(await waitDone("d_wire_ok"), "structure approved (no round used)");
  const fold = tid("fold-rounds").first();
  if (!(await fold.evaluate((d) => d.open))) await fold.locator("summary").click();
  await tid("round-link").first().fill("https://staging.example.org/designs/r1");
  await tid("round-prepare").first().click();
  await until(() => visible(tid("round-send")));
  await tid("round-send").first().click();
  check(await send(), "round 1's review e-mail sent");
  check(/Rounds used 1 of 2/.test(await textOf(tid("rounds-used"))), "the rounds panel counts Rounds used 1 of 2", await textOf(tid("rounds-used")));
  await inItem("d_ok", "item-approval");
  await page.getByTestId("approval-d_ok").getByTestId("approval-words").fill("Approved.");
  await page.getByTestId("approval-d_ok").getByTestId("approval-save").click();
  check(await waitDone("d_ok"), "the word \"approved\" in an e-mail");
  await inItem("d_close", "item-message");
  await tid("client-compose").first().waitFor();
  const body = await page.locator("#msg-body").inputValue();
  check(!/Both included revision rounds have been used/.test(body), "after one round the approval e-mail does not say both rounds were used (E14)");
  check(await send({ attach: true }) && await waitDone("d_close"), "\"Design approved, moving to build\" sent");
  check(await tickItem("d_files"), "approved files saved");
  check(await moveNext(), "on to the build");
  await inItem("b_start", "item-fields");
  await tid("dates-form").first().waitFor();
  await fillForm("dates-form", { "dates.buildStart": "2026-10-16" });
  check(await waitDone("b_start"), "build started");
  check(await tickItem("b_features") && await tickItem("b_phone"), "every feature works on staging, walked on a phone");
  check(await moveNext(), "on to testing and the client check");
});

/* ── 7. Stage 8: testing, acceptance, the launch invoice ────────────────── */
await scene(7, "QA, the accuracy e-mail, acceptance; the launch invoice locked until it, then IDV/2026-27/001", async () => {
  await setClock(J3);
  await openClient();
  check(await tickLines("q_qa"), "SOP-05 A to J, each with its date");
  await inItem("q_accuracy", "item-message");
  check(await send() && await waitDone("q_accuracy"), "the \"please check these facts\" e-mail (the review notice)");
  check(await visible(item("q_invoice").getByTestId("item-needs")) && !(await visible(item("q_invoice").getByTestId("item-document"))),
    "the launch invoice is locked: it needs the client's acceptance", await textOf(item("q_invoice")));
  await newDoc("Launch invoice");
  const probs = await textOf(tid("doc-problems"));
  check(/Needs the client's acceptance/.test(probs) && (await tid("doc-issue").first().isDisabled()), "a launch invoice made from Documents cannot be issued before the acceptance either", probs);
  await inItem("q_accepted", "item-approval");
  await page.getByTestId("approval-q_accepted").getByTestId("approval-words").fill("All correct, thank you.");
  await page.getByTestId("approval-q_accepted").getByTestId("approval-save").click();
  check(await waitDone("q_accepted"), "accepted in writing");
  await inItem("q_invoice", "item-document");
  await tid("document-dialog").first().waitFor();
  const inv = await issueOpenDoc();
  check(inv === "IDV/2026-27/001", "the launch invoice is IDV/2026-27/001", inv);
  const invDoc = (await docsOf("invoice"))[0];
  check(invDoc?.amount === 9000, "for the fee less the advance received: Rs 9,000", invDoc?.amount);
  await moneyMatches("with the launch invoice unpaid", J3);
  await openClient();
  check(await moveNext(), "on to the launch payment and go-live");
});

/* ── 8. Stage 9: the launch payment, then go-live ───────────────────────── */
await scene(8, "The cutover, the source code and the admin access wait for the launch payment; receipt 002; go-live", async () => {
  await openClient();
  check(await visible(item("l_cutover").getByTestId("item-needs")), "the cutover is locked until the launch payment is credited");
  await page.locator('[data-testid="journey-step"][data-stage="handover"]').first().click();
  await settle(400);
  check(await visible(item("h_source").getByTestId("item-needs")), "stage 10 shows the source code waiting for the launch payment too");
  await page.locator('[data-testid="journey-step"][data-stage="launch"]').first().click();
  await settle(300);
  const fold = tid("fold-access").first();
  if (!(await fold.evaluate((d) => d.open))) await fold.locator("summary").click();
  await tid("access-system").first().fill("Website admin panel");
  await tid("access-built").first().check();
  await tid("access-add").first().click();
  await settle(500);
  await tid("access-system").first().fill("Domain registrar");
  await tid("access-add").first().click();
  await settle(500);
  const locks = await page.locator('[data-testid="access-row"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-locked")));
  check(JSON.stringify(locks) === JSON.stringify(["1", "0"]), "the admin-panel row (built by Ideovent) is locked; the registrar row never waits for money", locks);
  await inItem("l_proposed", "item-message");
  await tid("client-compose").first().waitFor();
  await fillBlanks();
  check(await composeBlocked() && /go-live date and time/.test(await blockersText()), "the \"proposed go-live\" e-mail waits for the go-live date and time", await blockersText());
  await tid("dates-edit").first().click();
  await tid("dates-form").first().waitFor();
  await fillForm("dates-form", { "dates.goLiveTarget": "2026-11-02", goLiveTime: "10:00" });
  await inItem("l_proposed", "item-message");
  check(await send({ attach: true }), "with them set (a working-day morning) it goes, with the invoice attached");
  await inItem("l_proposed", "item-answer");
  await page.getByTestId("approval-l_proposed").getByTestId("approval-words").fill("Go ahead.");
  await page.getByTestId("approval-l_proposed").getByTestId("approval-save").click();
  check(await waitDone("l_proposed"), "and their \"go ahead\" recorded");
  const r = await recordPayment({ ref: "UTR000000000002", expectAmount: 9000 });
  check(r.ok && /IDV\/RC\/2026-27\/002/.test(r.receipt), "the launch payment recorded against the invoice; receipt IDV/RC/2026-27/002", r);
  check(await waitDone("l_paid") && await waitDone("l_receipt"), "launch payment credited and its receipt issued");
  await settle(300);
  const after = await page.locator('[data-testid="access-row"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-locked")));
  check(after[0] === "0" && !(await visible(item("l_cutover").getByTestId("item-needs"))), "now the admin-panel row and the cutover open", after);
  check(await tickItem("l_ttl"), "T-48h: TTL lowered");
  check(await tickLines("l_before"), "T-24h: every line with its date");
  check(await tickItem("l_cutover", "10:00"), "the cutover, with its time");
  check(await tickLines("l_verify"), "the first two hours on the live domain");
  await inItem("l_live", "item-message");
  check(await send({ via: "client-open-wa" }) && await waitDone("l_live"), "\"the site is live\" WhatsApp");
  check((await project())?.dates?.goLive === "2026-11-02", "go-live is recorded as 2 Nov 2026");
  await moneyMatches("after the launch payment", J3);
  await openClient();
  check(await moveNext(), "on to handover and training");
});

/* ── 9. Stage 10: handover ──────────────────────────────────────────────── */
await scene(9, "Handover: the access record, the source code, training, the handover document; the WhatsApp's truth", async () => {
  await openClient();
  const fa = tid("fold-access").first();
  if (!(await fa.evaluate((d) => d.open))) await fa.locator("summary").click();
  const rows = page.locator('[data-testid="access-row"]');
  for (let i = 0; i < 2; i++) {
    await rows.nth(i).getByTestId("access-method").selectOption(i === 0 ? "own_email_invite" : "not_applicable");
    await settle(400);
    await rows.nth(i).getByTestId("access-transferred").fill("2026-11-02");
    await settle(400);
  }
  check(await waitDone("h_access"), "the credentials transfer record is complete (no password anywhere)");
  check(await tickItem("h_rotate"), "rotated");
  check(await tickItem("h_source", "2026-11-02"), "source code transferred, after the final payment");
  await inItem("h_training", "item-fields");
  await tid("training-form").first().waitFor();
  await fillForm("training-form", { "training.at": "2026-11-02", "training.minutes": "50", "training.attendees": "Ravi Example" });
  check(await waitDone("h_training"), "training held");
  const fold = tid("fold-live").first();
  if (!(await fold.evaluate((d) => d.open))) await fold.locator("summary").click();
  await fillForm("live-form", { liveUrl: "https://www.example-school.example", domainName: "example-school.example", domainInClientName: "moved_to_them" });
  await tid("deliverable-text").first().fill("Five-page website: Home, About, Academics, Admissions, Contact");
  await page.locator('[data-testid="deliverables"] button', { hasText: /add/i }).first().click();
  await settle(500);
  await inItem("h_doc", "item-document");
  await tid("document-dialog").first().waitFor();
  const hd = await issueOpenDoc();
  check((await tid("document-dialog").first().getAttribute("data-status")) === "issued", "the handover document made final", hd);
  await inItem("h_doc", "item-message");
  check(await send({ attach: true }) && await waitDone("h_doc"), "and sent by e-mail");
  await inItem("h_wa", "item-message");
  await tid("client-compose").first().waitFor();
  await fillBlanks();
  check(await composeBlocked(), "the handover WhatsApp is blocked while the domain was moved to them during the project (it says \"from the start\")");
  await fillForm("live-form", { domainInClientName: "from_start" });
  await inItem("h_wa", "item-message");
  check(await send({ via: "client-open-wa" }) && await waitDone("h_wa"), "with \"Yes, from the start\" it opens and is recorded");
  check(await choose("h_care", "none"), "care plan decision: none (the exit path)");
  check(await moveNext(), "on to the thirty days of support");
});

/* ── 10. Stage 11: support, day 7, 25, 30 ───────────────────────────────── */
await scene(10, "Support: day 7, 25 and 30 in Today on their days; the review link; the closing letter", async () => {
  await setClock(J4);
  let tasks = await todayTasks();
  check(tasks.some((t) => /Day 7 nudge/.test(t)), "day 7 shows in Today on go-live + 7", tasks);
  await openClient();
  await inItem("s_day7", "item-message");
  await tid("client-compose").first().waitFor();
  await tid("compose-template").first().selectOption("cp_handover_unsigned_wa_hi");
  check(await send({ via: "client-open-wa" }) && await waitDone("s_day7"), "the day-7 reminder (the handover page is not back) ticks day 7");
  await inItem("s_review", "item-message");
  await tid("client-compose").first().waitFor();
  const body = await page.locator("#msg-body").inputValue();
  check(body.includes(REVIEW_LINK), "the review message carries the Google review link", body.slice(0, 200));

  await setClock(J5);
  tasks = await todayTasks();
  check(tasks.some((t) => /Day 25/.test(t)), "day 25 shows in Today on go-live + 25", tasks);
  await openClient();
  await inItem("s_day25", "item-message");
  check(await send({ via: "client-open-wa" }) && await waitDone("s_day25"), "the day-25 care plan message, once");

  await setClock(J6);
  tasks = await todayTasks();
  check(tasks.some((t) => /Day 30 closing note/.test(t)), "day 30 shows in Today on go-live + 30", tasks);
  await openClient();
  check(await tickItem("s_access", "2026-12-02"), "Ideovent's access removed, with the date");
  await newDoc("Closing letter");
  await issueOpenDoc();
  check((await docsOf("closing")).some((d) => d.status === "issued"), "the closing letter made final");
  await inItem("s_close", "item-message");
  await tid("client-compose").first().waitFor();
  check((await tid("client-compose").first().getAttribute("data-template")) === "cp_support_closing_em_en_exit", "the day-30 closing e-mail, the exit version");
  check(await send({ attach: true }) && await waitDone("s_close"), "sent with the closing letter");
  check(await moveNext(), "on to care plan or exit");
});

/* ── 11. Stage 12: exit ─────────────────────────────────────────────────── */
await scene(11, "The exit: closing letter, access, archive; the project closed and the client dormant", async () => {
  await openClient();
  check((await itemState("x_letter")) === "done" && (await itemState("x_access")) === "done", "the closing letter and the access removal tick themselves");
  check(await tickItem("x_archive"), "project folder archived");
  await tid("close-project").first().click();
  check(await until(async () => (await project())?.outcome === "closed"), "the project is closed");
  await until(async () => ((await store()).clients || []).find((c) => c.id === CID)?.status === "dormant");
  const cl = ((await store()).clients || []).find((c) => c.id === CID);
  check(cl?.status === "dormant" && cl?.exitedOn === "2026-12-02", "the client is dormant from the exit date (win-back in six months, records in three years)", cl && { status: cl.status, exitedOn: cl.exitedOn });
  await goto(`/crm/clients/${PID}`, 300);
  await tid("stage-pill").first().waitFor({ timeout: 30000 });
  check((await textOf(tid("stage-pill"))) === "Closed", "the client page says Closed");
  const lead = ((await outreach()).leads || []).find((l) => l.id === LEAD_ID);
  check(lead?.status === "won", "the lead stays Won");
});

/* ── 12. Money tab, register CSV ────────────────────────────────────────── */
await scene(12, "The Money tab's totals; the register CSV saved outside the repository", async () => {
  await moneyMatches("at the end", J6);
  const rows = await page.locator('[data-testid="register-row"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-number")));
  check(JSON.stringify([...rows].sort()) === JSON.stringify(["IDV/2026-27/001", "IDV/PI/2026-27/001", "IDV/Q/2026-27/001", "IDV/RC/2026-27/001", "IDV/RC/2026-27/002"].sort()),
    "the register lists the five money documents (and no welcome pack, handover document or closing letter)", rows);
  const statuses = await page.locator('[data-testid="register-row"]').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute("data-number"), e.getAttribute("data-status")])));
  check(statuses["IDV/PI/2026-27/001"] === "Paid" && statuses["IDV/2026-27/001"] === "Paid", "the proforma and the invoice read Paid", statuses);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), tid("register-export").first().click()]);
  const target = join(OUT, `e2e-clients-register-${process.pid}.csv`);
  await dl.saveAs(target);
  const csv = readFileSync(target, "utf8").replace(/^\ufeff/, "");
  const lines = csv.trim().split(/\r?\n/);
  check(lines[0] === "Number,Kind,Date,Client,Project,Amount (INR),Due date,Paid (INR),Balance (INR),Status,References,Refunds", "the CSV has the register's columns", lines[0]);
  check(lines.length === 6 && lines.some((l) => l.startsWith("IDV/2026-27/001,Invoice (launch),2026-11-02,Example School,Example School website,9000,2026-11-09,9000,0,Paid,UTR000000000002")),
    "one line per money document, amounts as plain numbers", lines);
  check(!/07-website/i.test(target), `saved outside the repository (${target})`);
});

/* ── 13. A member: Act as ───────────────────────────────────────────────── */
await scene(13, "A member (Act as): Clients refused, no client card on her lead, no client code fetched", async () => {
  await setActor("m_asha");
  const member = await context.newPage();
  const fetched = [];
  member.on("request", (r) => {
    const u = r.url();
    if (/\/src\/(crm\/clients\/(?!context\.ts)|lib\/clients\/)/.test(u)) fetched.push(u);
  });
  member.on("pageerror", (e) => errors.push(`member: ${e.message}`));
  await member.clock.setFixedTime(J6);
  await member.goto(`${BASE}/crm/clients`, { waitUntil: "domcontentloaded" });
  await member.getByTestId("crm-role-gate").first().waitFor({ timeout: 60000 }).catch(() => {});
  check(/This screen is Mehdi's/.test(await member.getByTestId("crm-role-gate").first().innerText().catch(() => "")), "a member gets \"This screen is Mehdi's\" on /clients");
  await member.goto(`${BASE}/crm/leads/${MEMBER_LEAD_ID}`, { waitUntil: "domcontentloaded" });
  await member.getByTestId("lead-name").first().waitFor({ timeout: 60000 }).catch(() => {});
  await member.waitForTimeout(1500);
  check(await member.getByTestId("lead-name").first().isVisible().catch(() => false), "her own lead opens");
  check(!(await member.getByTestId("lead-client-card").first().isVisible().catch(() => false)), "with no client card on it");
  await member.goto(`${BASE}/crm/today`, { waitUntil: "domcontentloaded" });
  await member.waitForTimeout(1500);
  check(!(await member.getByTestId("clients-today").first().isVisible().catch(() => false)), "and no Clients section in her Today");
  check(fetched.length === 0, "her browser fetched none of the client code (the provider and screens are Mehdi's lazy chunks)", fetched.slice(0, 5));
  const rail = await member.locator('aside[aria-label="CRM"] nav a').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(!rail.includes("/crm/clients"), "and no Clients link in her rail", rail);
  await member.close();
  await setActor("");
}, { journey: false });

/* ── 14. Phones and desks, light and dark ───────────────────────────────── */
await scene(14, "360, 390 and 1440 px, light and dark: no sideways scroll", async () => {
  const screens = [
    ["/crm/clients", "crm-clients"], ["/crm/clients?tab=list", "clients-list"], ["/crm/clients?tab=money", "clients-money"],
    [`/crm/clients/${PID}`, "client-page"], ["/crm/settings/clients", "client-settings"],
  ];
  /* A fresh tab per theme: the journey's tab has been through some seventy screens. */
  for (const theme of ["light", "dark"]) {
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(`${theme}: ${e.message}`));
    p.on("crash", () => errors.push(`${theme}: the tab crashed`));
    await p.clock.setFixedTime(J6);
    await p.goto(`${BASE}/robots-crm.txt`, { waitUntil: "domcontentloaded" });
    await p.evaluate(([k, t]) => localStorage.setItem(k, t), [THEME_KEY, theme]);
    for (const w of [360, 390, 1440]) {
      await p.setViewportSize({ width: w, height: w > 1000 ? 1000 : 800 });
      for (const [path, ready] of screens) {
        await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
        await p.getByTestId(ready).first().waitFor({ timeout: 30000 }).catch(() => {});
        await p.waitForTimeout(300);
        const dark = await p.evaluate(() => document.documentElement.classList.contains("dark"));
        const over = await sideways(p);
        check(over <= 0 && dark === (theme === "dark"), `${path} at ${w} px, ${theme}: no sideways scroll`, { over, dark });
        if (ready === "client-page") {
          const strip = await stripOverflow(p);
          check(strip.length === 0, `${path} at ${w} px, ${theme}: every journey step's label stays inside its own step`, strip);
        }
      }
    }
    await p.evaluate((k) => localStorage.setItem(k, "light"), THEME_KEY);
    await p.close();
  }
}, { journey: false });

/* ── 15. The Clients screen: Won leads, Add client, the List, Renewals, the tiles ── */
await scene(15, "Clients: a Won lead without a file, Not a client; Add client; the List's filters; Renewals; the dashboard tiles", async () => {
  await setClock(J6);
  await goto("/crm/clients", 300);
  await tid("crm-clients").first().waitFor({ timeout: 60000 });
  const won = page.locator(`[data-testid="won-lead"][data-lead="${WON_LEAD_ID}"]`);
  check(await visible(won), "a Won lead with no client file is listed under \"Won leads without a client file\"");
  check(!(await visible(page.locator(`[data-testid="won-lead"][data-lead="${LEAD_ID}"]`))), "and not the lead that has its file");
  await won.getByTestId("won-dismiss").click();
  check(await until(async () => !(await visible(won))), "Not a client hides it");
  const notes = ((await outreach()).events || []).filter((e) => e.leadId === WON_LEAD_ID && e.type === "note").map((e) => e.detail);
  check(notes.some((n) => /^Not a client: no client file for this lead/.test(n || "")), "with one line on the lead's history", notes);

  await tid("clients-add").first().click();
  await tid("add-client").first().waitFor();
  await tid("add-client-name").first().fill("Example Bakery");
  await tid("add-client-india").first().check();
  await tid("add-client-save").first().click();
  await page.waitForURL(/\/crm\/clients\/cl_/, { timeout: 15000 });
  await tid("client-only-page").first().waitFor({ timeout: 30000 });
  check(/Example Bakery/.test(await textOf(tid("client-name"))), "Add client makes a client with no project and opens its page");
  await tid("client-renewals-edit").first().click();
  await tid("renewals-form").first().waitFor();
  await fillForm("renewals-form", { "renewals.domain.renewsOn": "2026-12-22", "renewals.domain.provider": "Example Registrar" });
  check(((await store()).clients || []).find((c) => c.orgName === "Example Bakery")?.renewals?.domain?.renewsOn === "2026-12-22", "its domain renewal date is saved on the client");

  await goto("/crm/clients?tab=list", 300);
  await tid("clients-list").first().waitFor({ timeout: 30000 });
  const listed = await page.locator('[data-testid="list-client"]').evaluateAll((els) => els.map((e) => e.textContent));
  check(listed.some((t) => /Example Bakery/.test(t)) && !listed.some((t) => /Example School/.test(t)), "the List shows the clients with something open (the bakery), not the closed school", listed.map((t) => t.slice(0, 40)));
  await tid("filter-closed").first().check();
  await settle(300);
  check(await visible(page.locator(`[data-testid="list-project"][data-project="${PID}"]`)), "\"Closed (last 90 days)\" shows the school's closed project");

  await goto("/crm/clients?tab=renewals", 300);
  await tid("clients-renewals").first().waitFor({ timeout: 30000 });
  const row = page.locator('[data-testid="renewal-row"][data-what="domain"]').first();
  const rowText = await textOf(row);
  check(/Example Bakery/.test(rowText) && /Renews 22 Dec 2026/.test(rowText) && /one courtesy reminder/.test(rowText), "Renewals lists the domain with its date and the step due (one courtesy reminder, no care plan)", rowText);
  check(await visible(row.getByTestId("renewal-open")), "with Open for that step's message");

  await goto("/crm", 300);
  await tid("client-tiles").first().waitFor({ timeout: 60000 });
  const tv = async (id) => textOf(tid(`${id}-value`));
  check((await tv("tile-clients-active")) === "0" && (await tv("tile-clients-due")) === "Rs 0" && (await tv("tile-clients-received")) === "Rs 0" && (await tv("tile-clients-renewals")) === "1",
    "the dashboard tiles: 0 active (the school is closed), Rs 0 due, Rs 0 received in December, 1 renewal in 60 days",
    { active: await tv("tile-clients-active"), due: await tv("tile-clients-due"), received: await tv("tile-clients-received"), renewals: await tv("tile-clients-renewals") });
}, { journey: false });

/* ── 16. A file opened from a Won lead: the advance proforma with no quotation after the yes ── */
await scene(16, "A file opened from a Won lead issues its advance proforma: Against proposal, accepted on the day it was Won", async () => {
  await setClock(J6);
  await goto(`/crm/leads/${WON2_LEAD_ID}`, 300);
  await tid("lead-client-card").first().waitFor({ timeout: 90000 });
  await tid("lead-open-client-file").first().click();
  await tid("open-client-file").first().waitFor();
  await tid("open-engagement-one_time").first().check();
  await tid("open-india-yes").first().check();
  check(await visible(tid("open-accepted")), "the dialog of a Won lead asks for the number of the proposal or quotation they accepted (optional)");
  check(/accepted on 2 Oct 2026/.test(await textOf(page.locator('[data-testid="open-client-file"]'))), "and says what the proforma prints without one: accepted on 2 Oct 2026, the day the lead was Won");
  await tid("open-fee").first().fill("12000");
  await tid("open-weeks").first().fill("3");
  await tid("open-scope").first().fill("Clinic website, five pages, as in the SOW");
  await tid("open-submit").first().click();
  await page.waitForURL(/\/crm\/clients\/pr_/, { timeout: 15000 });
  const pid2 = new URL(page.url()).pathname.split("/").pop();
  await tid("client-page").first().waitFor({ timeout: 30000 });
  const p2 = ((await store()).projects || []).find((x) => x.id === pid2);
  check(p2?.stage === "agreement" && p2?.openedAtWon === true && p2?.dates?.yes === "2026-10-02" && !p2?.proposalNo, "it opens at stage 2, the yes dated 2 Oct 2026, no proposal number typed", p2 && { stage: p2.stage, yes: p2.dates?.yes });
  await inItem("a_billing", "item-fields");
  await tid("billing-form").first().waitFor();
  await fillForm("billing-form", { legalName: "Example Smile Clinic LLP", billingAddress: "4 Example Market, Gaya 823001", state: "Bihar" });
  await inItem("a_pi", "item-document");
  await tid("document-dialog").first().waitFor();
  const preview = await textOf(tid("doc-preview"));
  check(/Against proposal\s*accepted on 2 Oct 2026/.test(preview) && !/\[quotation number\]/.test(preview), "the proforma's preview reads Against proposal, accepted on 2 Oct 2026, and has no [quotation number] blank", (preview.match(/Against[^]{0,60}/) || [])[0]);
  const no = await issueOpenDoc();
  check(no === "IDV/PI/2026-27/002", "it is issued as IDV/PI/2026-27/002 with no quotation made after the yes", no || await textOf(tid("doc-problems")));
  const quotes = ((await store()).documents || []).filter((d) => d.projectId === pid2 && d.kind === "quotation");
  check(quotes.length === 0, "and no quotation was needed for it", quotes.map((q) => q.number));
}, { journey: false });

/* ── Result ─────────────────────────────────────────────────────────────── */
scenario = "end";
check(!errors.length, "no page errors or console errors", errors.slice(0, 5));
const outside = refused.filter((u) => !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u));
check(outside.length === 0, "nothing tried to leave the machine: WhatsApp and Zoho were answered here, and the only other outside address was the site's own font stylesheet (refused too)", outside.slice(0, 5));
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 15000))]);

if (NEGATIVE === "freeze") {
  const freeze = failed.some((f) => /cannot be edited afterwards/.test(f.msg));
  if (!negApplied) {
    console.log("NEGATIVE MODE NOT APPLIED: rules.ts was not rewritten, so nothing was proved.");
    process.exit(3);
  }
  console.log(`NEGATIVE MODE (the freeze removed from rules.ts): the edit-after-issue check ${freeze ? "failed, as it must" : "PASSED: the test proves nothing"}.`);
  if (!freeze) process.exit(4);
}
if (NEGATIVE === "strip") {
  const strip = failed.some((f) => /journey step's label stays inside its own step/.test(f.msg));
  if (!negApplied) {
    console.log("NEGATIVE MODE NOT APPLIED: JourneyStrip.tsx was not rewritten, so nothing was proved.");
    process.exit(3);
  }
  console.log(`NEGATIVE MODE (the journey strip's old classes): the strip check ${strip ? "failed, as it must" : "PASSED: the test proves nothing"}.`);
  if (!strip) process.exit(4);
}
console.log(`\ne2e-clients: ${passes} passed, ${failed.length} failed`);
if (failed.length) {
  for (const f of failed) console.log(`  [${f.scenario}] ${f.msg}`);
  process.exit(1);
}
