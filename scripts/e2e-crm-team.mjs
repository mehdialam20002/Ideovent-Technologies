/**
 * The CRM TEAM end to end, in LOCAL mode: Mehdi (owner) against his team
 * (crm-team-spec 13.3), in a real browser against the dev server.
 *
 *   node scripts/e2e-crm-team.mjs [baseUrl]          default http://localhost:5199
 *   SHOT_DIR=<folder> node scripts/e2e-crm-team.mjs   also saves the 360, 390 and 1440 px
 *                                                     screenshots (light and dark) of My day,
 *                                                     Team (People, Access) and a member's lead page
 *   E2E_NEGATIVE=1 node scripts/e2e-crm-team.mjs ...  serves src/lib/outreach/access.ts with
 *       canSeeLead() answering true for everyone (rewritten in flight; no file is touched).
 *       Scenarios 4 and 9 must then FAIL and the run must exit 1 (exit 3: the rewrite matched
 *       nothing, or 4 and 9 did not fail, so nothing was proved).
 *
 * WHO (fictional, *.team-e2e.example): Mehdi Alam (owner); Asha (member, New cap 10, Can add
 * leads, company phone, number checked); Bilal (member, See all, number NOT checked); Ayesha
 * (admin). Local mode's "Act as" (localStorage ideovent_crm_local_actor) switches between them,
 * and LocalOutreachStore applies the database's rules (src/lib/outreach/access.ts) to each.
 *
 * THE SEED: 15 fictional leads: Asha's A1 (New, a draft demo), A2 (Replied, no e-mail) and A3
 * (Do not contact); Bilal's B1 (Contacted) and B2 (New); nine Unassigned New (U1 to U9); and
 * Mehdi's M1 at Proposal. Plus their history lines, two demos and the settings.
 *
 * THE SCENARIOS, each a group of checks:
 *    1. Owner, Team: the people with roles and switches; Add person; Reset password.
 *    2. Owner, Assign: 4 Unassigned to Asha; the toast, her queue, the history line, the pool.
 *    3. Owner, Share out: 3 between Asha and Bilal (Balanced); the preview equals the result;
 *       the Proposal lead stays with Mehdi.
 *    4. Asha, gates: her first password; the rail; Mehdi's screens; only her leads; no Export
 *       or Delete; contacts masked in the list, in full on her lead page.
 *    5. Asha composes: four stages; her name in the WhatsApp and the e-mail signature; she turns
 *       her demo link on and sends; quiet hours at 21:30 India time (the page clock); a forged
 *       "proposal" history line refused with the database's message.
 *    6. Asha's lead page: fill-only contacts; add-only notes; Lost asks why; Call, Proposal and
 *       Won disabled; Do not contact blocks every send; no Call done before a reply.
 *    7. Asha, duplicates: a New lead with Bilal's phone is refused, naming Bilal.
 *    8. Asha, after a yes: Hand to Mehdi; Tell Mehdi on WhatsApp; My hand-overs; Mehdi's
 *       Waiting on you and bell; Accepted tells Asha.
 *    9. Bilal (See all): the read-only list and card, no contacts; WhatsApp waits for his number.
 *   10. Ayesha (admin): sees all, assigns, no Delete or Export, no Proposal or Won, Team read only.
 *   11. Owner switches Asha off (no one picked): her screen says so; New leads to the pool,
 *       her Replied lead to Mehdi.
 *   12. Owner, numbers: Team > Performance equals counts computed here from the stored data;
 *       the Access tab counts Asha's lead views.
 *  Then the layout: no sideways scroll at 360, 390 and 1440 px, light and dark, and the page
 *  itself never scrolls behind the CRM shell (its <main> is the only scroller).
 *
 * NUMBERS ARE COMPUTED, NOT COPIED. The spec's example ("7/10 new" after assigning 4) assumed
 * three New leads for Asha; its own seed gives her one Do not contact, so every count here is
 * computed from what is stored at that moment.
 *
 * Nothing leaves the machine: wa.me, WhatsApp Web and Gmail are answered here, Supabase and
 * EmailJS are blocked, and a mailto: click is never handed to a mail app. Needs a
 * dev server WITHOUT Supabase (local mode), ideally with the watcher off.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] || "http://localhost:5199").replace(/\/+$/, "");
const NEGATIVE = Boolean(process.env.E2E_NEGATIVE);
const SHOT_DIR = process.env.SHOT_DIR || "";
const OUTREACH_KEY = "ideovent_outreach_v1";
const CMS_KEY = "ideovent_cms_v1";
const ACTOR_KEY = "ideovent_crm_local_actor";
const SESSION_KEY = "ideovent_admin_session";
const THEME_KEY = "ideovent-theme-v2";
const COLS_KEY = "ideovent_crm_leads_cols";
const MEHDI_WA = "917761921786";

/* Tuesday 6 Oct 2026, 14:30 India time: inside every sending window. 21:30 is quiet hours. */
const T0 = Date.parse("2026-10-06T09:00:00.000Z");
const NIGHT = Date.parse("2026-10-06T16:00:00.000Z");
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString();
const ago = (ms) => iso(T0 - ms);
const IST = 5.5 * 3600e3;
/** Midnight India time of the day T0 is in, as epoch ms. */
const TODAY_START = Math.floor((T0 + IST) / DAY) * DAY - IST;

/* ── Checks, grouped by scenario ───────────────────────────────────────── */
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
    console.log("FAIL  " + msg + d.slice(0, 400));
  }
};
/** Runs one scenario; an exception fails it (and only it), and the run goes on. */
async function scene(id, title, body) {
  scenario = String(id);
  console.log(`\n── ${id}. ${title}`);
  try {
    await body();
  } catch (e) {
    check(false, `scenario ${id} stopped: ${String((e && e.message) || e).split("\n")[0]}`);
  }
}

/* ── The seed ──────────────────────────────────────────────────────────── */
const OWNER = {
  id: "m_owner", userId: "local:m_owner", email: "owner@local.test", displayName: "Mehdi Alam", role: "owner",
  viewAll: true, canAddLeads: true, waDailyLimit: null, newLeadCap: 1000, mayColdCall: true, targets: {},
  senderName: "Mehdi Alam", senderPhone: `+${MEHDI_WA}`, senderCheckedAt: ago(30 * DAY), active: true,
  mustChangePassword: false, joinedAt: ago(30 * DAY), createdAt: ago(30 * DAY),
};
const person = (id, displayName, extra = {}) => ({
  id, userId: `local:${id}`, email: `${id.slice(2)}@team-e2e.example`, displayName, role: "member",
  viewAll: false, canAddLeads: false, waDailyLimit: 25, newLeadCap: 10, mayColdCall: false, targets: {},
  senderName: displayName, active: true, mustChangePassword: false, joinedAt: ago(20 * DAY),
  lastSeenAt: ago(3600e3), createdAt: ago(21 * DAY), ...extra,
});
const ASHA = person("m_asha", "Asha Example", { canAddLeads: true, senderPhone: "+919876500001", senderCheckedAt: ago(5 * DAY) });
const BILAL = person("m_bilal", "Bilal Example", { viewAll: true, senderPhone: "+919876500002" });
const AYESHA = person("m_ayesha", "Ayesha Example", { role: "admin", viewAll: true, canAddLeads: true, waDailyLimit: null, newLeadCap: 40 });
const TEAM = {
  members: [OWNER, ASHA, BILAL, AYESHA],
  notifications: [], requests: [], audit: [], bookings: [], rules: [], reviews: [], usage: {}, seq: 100,
};

const lead = (id, instituteName, kind, who, status, extra = {}) => ({
  id, instituteName, kind, city: "Patna", source: "CSV import", status,
  createdAt: ago(12 * DAY), updatedAt: ago(2 * DAY), createdById: "m_owner", assigneeId: who,
  ...(who && who !== "m_owner" ? { assignedAt: ago(4 * DAY), assignedById: "m_owner" } : {}), ...extra,
});
const NAME = {
  A1: "A1 Example Public School TeamE2E", A2: "A2 Example Classes TeamE2E", A3: "A3 Example Dental Clinic TeamE2E",
  B1: "B1 Example School TeamE2E", B2: "B2 Example Classes TeamE2E", M1: "M1 Example Proposal TeamE2E",
};
for (let i = 1; i <= 9; i++) NAME[`U${i}`] = `U${i} Example Pool TeamE2E`;
const LEADS = [
  lead("t_a1", NAME.A1, "school", "m_asha", "new", { phone: "+919820060001", email: "a1@team-e2e.example", language: "hinglish", demoId: "ds_t_a1", demoSlug: "team-e2e-a1" }),
  lead("t_a2", NAME.A2, "coaching", "m_asha", "replied", { phone: "+919820060002", language: "en", notes: "First note from Mehdi", lastContactedAt: ago(3 * DAY), demoId: "ds_t_a2", demoSlug: "team-e2e-a2" }),
  lead("t_a3", NAME.A3, "dental", "m_asha", "do_not_contact", { phone: "+919820060003", email: "a3@team-e2e.example", closedAt: ago(DAY) }),
  lead("t_b1", NAME.B1, "school", "m_bilal", "contacted", { phone: "+919820060011", language: "en", lastContactedAt: ago(5 * DAY) }),
  lead("t_b2", NAME.B2, "coaching", "m_bilal", "new", { phone: "+919820060012", email: "b2@team-e2e.example" }),
  ...Array.from({ length: 9 }, (_, k) => {
    const i = k + 1;
    return lead(`t_u${i}`, NAME[`U${i}`], i % 3 === 0 ? "school" : "coaching", null, "new",
      { phone: `+9198200600${20 + i}`, city: i % 2 ? "Patna" : "Gaya", createdAt: ago((20 - i) * DAY) });
  }),
  lead("t_m1", NAME.M1, "school", "m_owner", "proposal", { phone: "+919820060031", email: "m1@team-e2e.example", lastContactedAt: ago(2 * DAY) }),
];
const ID = Object.fromEntries(LEADS.map((l) => [Object.keys(NAME).find((k) => NAME[k] === l.instituteName), l.id]));
const EVENTS = [
  { id: "oe_t_1", leadId: "t_a2", actorId: "m_asha", at: ago(3 * DAY), type: "sent", channel: "whatsapp", stage: "first", templateId: "wa_first_new_school_en", detail: "seeded first WhatsApp" },
  { id: "oe_t_2", leadId: "t_a2", actorId: "m_asha", at: ago(DAY), type: "replied", detail: "They replied." },
  { id: "oe_t_3", leadId: "t_b1", actorId: "m_bilal", at: ago(5 * DAY), type: "sent", channel: "whatsapp", stage: "first", templateId: "wa_first_new_school_en", detail: "seeded first WhatsApp" },
  { id: "oe_t_4", leadId: "t_m1", actorId: "m_owner", at: ago(2 * DAY), type: "status", detail: "Status: Call to Proposal" },
];
const SETTINGS = { signature: "Mehdi Alam\nIdeovent Technologies", quietStart: "20:00", quietEnd: "10:00", alertOnDemoOpen: false };
const demo = (id, slug, name, status) => ({
  id, slug, instituteName: name, internalName: id, kind: "school", market: "india", city: "Patna", status,
  templateId: "s2-rural-state-board", createdAt: ago(9 * DAY), updatedAt: ago(9 * DAY),
});
const CMS = {
  __format: 2, demoSiteSlots: [], demoSiteOpens: [],
  demoSites: [demo("ds_t_a1", "team-e2e-a1", NAME.A1, "draft"), demo("ds_t_a2", "team-e2e-a2", NAME.A2, "sent")],
};
const CLOSED = ["won", "lost", "do_not_contact"];
const isOpen = (l) => !CLOSED.includes(l.status || "new");
/** private.crm_member_reads: assigned to them, and open or closed less than 14 days ago. */
const memberReads = (id, l) => l.assigneeId === id && (isOpen(l) || (l.closedAt && Date.parse(l.closedAt) > T0 - 14 * DAY));

/* ── The browser ───────────────────────────────────────────────────────── */
async function launch() {
  const cands = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].filter(Boolean);
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
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
context.setDefaultNavigationTimeout(120000);
context.setDefaultTimeout(15000);
await context.route(/wa\.me|web\.whatsapp\.com|mail\.google\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<p>intercepted</p>" }));
await context.route(/\.supabase\.co|api\.emailjs\.com/, (r) => r.abort());
await context.addInitScript(([k]) => {
  try {
    sessionStorage.setItem(k, "1");
  } catch {
    /* no storage */
  }
  /* A mailto: click is never handed to a mail app. */
  window.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest('a[href^="mailto:"]')) e.preventDefault();
  }, true);
}, [SESSION_KEY]);

/* The negative control: every lead readable by everyone, as if the SELECT policy were "true". */
let negApplied = false;
if (NEGATIVE) {
  await context.route(/\/src\/lib\/outreach\/access\.ts/, async (route) => {
    try {
      const res = await route.fetch();
      const src = await res.text();
      // The served JS keeps `now = new Date()` in the parameters: match lazily up to ") {".
      const broken = src.replace(/(export function canSeeLead\([\s\S]*?\)\s*\{)/, "$1 return true;");
      if (broken !== src) negApplied = true;
      return route.fulfill({ response: res, body: broken });
    } catch {
      return route.continue();
    }
  });
}

const errors = [];
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text()) && errors.push(m.text()));
page.on("dialog", (d) => d.accept());
context.on("page", async (p) => {
  if (p !== page) await p.close().catch(() => {});
});
await page.clock.setFixedTime(T0);

const goto = async (path, ms = 700) => {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(ms);
};
const settle = (ms = 500) => page.waitForTimeout(ms);
const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), OUTREACH_KEY);
const leadOf = async (key) => ((await stored()).leads || []).find((l) => l.id === (ID[key] || key));
const setActor = (id) => page.evaluate(([k, v]) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k)), [ACTOR_KEY, id]);
const visible = (testId) => page.getByTestId(testId).first().isVisible().catch(() => false);
const waitFor = (testId, timeout = 30000) => page.getByTestId(testId).first().waitFor({ timeout }).catch(() => {});
const textOf = (testId) => page.getByTestId(testId).first().innerText().then((t) => t.replace(/\s+/g, " ").trim(), () => "");
const railLabels = () =>
  page.locator('aside[aria-label="CRM"] nav a').evaluateAll((as) => as.map((a) => (a.querySelector("span.truncate")?.textContent || "").trim()));
const waitRail = (first) =>
  page.waitForFunction((f) => (document.querySelector('aside[aria-label="CRM"] nav a span.truncate')?.textContent || "").trim() === f, first, { timeout: 60000 })
    .catch(() => {});
const leadRows = () => page.locator('table[aria-label="Leads"] tbody tr');
/** The first line of each row's name cell (the title alone; a chip may follow it). */
const rowNames = () =>
  page.$$eval('table[aria-label="Leads"] tbody tr td:nth-child(2)', (tds) => tds.map((td) => td.querySelector("span span")?.textContent.trim() || ""));
const select = (name) => page.getByRole("checkbox", { name: `Select ${name}` }).click();
const bar = () => page.getByRole("toolbar", { name: "Bulk actions" });
const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** How far the page itself scrolls down behind the CRM shell, whose <main> must be the only scroller. */
const behind = () => page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
async function openLead(key) {
  await goto(`/crm/leads/${ID[key] || key}`, 400);
  await page.getByTestId("lead-name").or(page.getByTestId("lead-readonly")).or(page.getByTestId("handed-over"))
    .or(page.getByTestId("lead-not-yours")).first().waitFor({ timeout: 30000 }).catch(() => {});
  await settle(500);
}
/** Opens a closed <details> by its summary (no-op when open). */
async function unfold(testId) {
  const d = page.getByTestId(testId).first();
  if (!(await d.evaluate((x) => x.open).catch(() => true))) await d.locator("summary").first().click();
  await settle(200);
}
const composeTab = async (name) => {
  await page.getByTestId("compose").getByRole("tab", { name: new RegExp(`^${name}`, "i") }).click();
  await settle(400);
};
const waText = async () => {
  const href = await page.getByTestId("open-whatsapp").getAttribute("href").catch(() => null);
  return href ? decodeURIComponent(new URL(href).searchParams.get("text") || "") : "";
};
/** "5/10 new": a member's New leads against their cap, as the Team page shows it. */
const queueText = (d, id) => {
  const m = d.team.members.find((x) => x.id === id);
  return `${d.leads.filter((l) => l.assigneeId === id && (l.status || "new") === "new").length}/${m.newLeadCap} new`;
};
const poolCount = (d) => d.leads.filter((l) => !l.assigneeId && isOpen(l)).length;

/* Seeded from a same-origin page that is not the app, so no running CRM writes over it. */
await goto("/robots-crm.txt", 100);
await page.evaluate(([ok, ck, ak, outreach, cms]) => {
  localStorage.setItem(ok, JSON.stringify(outreach));
  localStorage.setItem(ck, JSON.stringify(cms));
  localStorage.removeItem(ak);
  localStorage.removeItem("ideovent_crm_scope_v1");
  localStorage.removeItem("ideovent_meta_local_v1");
}, [OUTREACH_KEY, CMS_KEY, ACTOR_KEY, { leads: LEADS, events: EVENTS, settings: SETTINGS, team: TEAM }, CMS]);

await scene(1, "Owner, Team: the people, Add person, Reset password", async () => {
  await goto("/crm/team");
  await waitFor("team-person-m_asha", 120000);
  const cards = await page.locator('[data-testid^="team-person-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  check(JSON.stringify(cards.sort()) === JSON.stringify(["m_asha", "m_ayesha", "m_bilal", "m_owner"].map((id) => `team-person-${id}`)),
    "Team lists Mehdi and the three people", cards);
  const card = (id) => textOf(`team-person-${id}`);
  check(/Member/.test(await card("m_asha")) && /Member/.test(await card("m_bilal")) && /Admin/.test(await card("m_ayesha")),
    "each with their role: Asha and Bilal Member, Ayesha Admin");
  check(/Can add leads/.test(await card("m_asha")) && /See all/.test(await card("m_bilal")) && !/See all/.test(await card("m_asha")),
    "and their switches: Asha Can add leads, Bilal See all");
  check(/Number checked/.test(await card("m_asha")) && /Mark number checked/.test(await card("m_bilal")), "Asha's number is checked; Bilal's offers Mark number checked");
  /* crm-fixes-1004 item 14 (4 Oct 2026): Mehdi's own card says when he was last seen; it showed a dash. */
  const ownerSeen = await textOf("team-seen-m_owner");
  check(/just now|min ago|h ago/.test(ownerSeen), "Mehdi's own card shows when he was last seen, not a dash", ownerSeen);
  let d = await stored();
  check((await textOf("team-queue-m_asha")) === queueText(d, "m_asha"), `Asha's queue reads ${queueText(d, "m_asha")}`, await textOf("team-queue-m_asha"));
  check((await textOf("team-pool-count")) === String(poolCount(d)), `the pool card counts the ${poolCount(d)} Unassigned leads`, await textOf("team-pool-count"));

  await page.getByTestId("team-add").click();
  await waitFor("member-dialog");
  await page.locator("#m-name").fill("Chetan Example");
  await page.locator("#m-email").fill("chetan@team-e2e.example");
  await page.getByTestId("preset-supervised").click();
  await page.locator("#m-phone").fill("98765 00009");
  await page.getByTestId("member-save").click();
  await waitFor("add-login-local");
  check(await visible("add-login-local"), "Add person saves Chetan, and local mode says his login is simulated");
  await page.getByTestId("member-dialog").getByRole("button", { name: "Done" }).click();
  await settle(600);
  d = await stored();
  const chetan = d.team.members.find((m) => m.email === "chetan@team-e2e.example");
  check(Boolean(chetan) && /Chetan Example/.test(await card(chetan?.id)) && /Waiting for first sign-in/.test(await card(chetan?.id)),
    "Chetan appears on Team, waiting for his first sign-in", chetan);

  await page.getByTestId("team-reset-m_asha").click();
  await waitFor("reset-dialog");
  await page.getByTestId("reset-confirm").click();
  await waitFor("reset-password-value");
  const pw = await textOf("reset-password-value");
  check(/^[A-Za-z0-9]{14}$/.test(pw), "Reset password shows a temporary password once (simulated locally)", pw);
  await page.getByTestId("reset-dialog").getByRole("button", { name: "Done" }).click();
  d = await stored();
  check(d.team.members.find((m) => m.id === "m_asha")?.mustChangePassword === true
    && d.team.audit.some((a) => a.action === "member.password_reset" && a.memberId === "m_asha"),
  "Asha must set her own password at her next sign-in, and the reset is on the audit trail");
});

await scene(2, "Owner, Assign: 4 Unassigned leads to Asha", async () => {
  await goto("/crm/leads?view=unassigned");
  await leadRows().first().waitFor({ timeout: 60000 }).catch(() => {});
  await settle();
  const pool0 = poolCount(await stored());
  check((await leadRows().count()) === pool0, `the Unassigned view lists the ${pool0} pool leads`, await leadRows().count());
  const unTab = page.getByRole("tab", { name: /^Unassigned/ });
  check(new RegExp(`Unassigned\\s*${pool0}\\b`).test(await unTab.innerText().catch(() => "")), `its tab counts ${pool0}`, await unTab.innerText().catch(() => ""));
  const four = ["U1", "U2", "U3", "U4"];
  for (const k of four) await select(NAME[k]);
  await bar().getByTestId("bulk-assign").click();
  await page.getByTestId("assign-to-m_asha").click();
  await page.getByText("4 leads assigned to Asha Example.").waitFor({ timeout: 10000 }).catch(() => {});
  check(/4 leads assigned to Asha Example\./.test(await textOf("leads-message")), "the toast: 4 leads assigned to Asha Example", await textOf("leads-message"));
  const d = await stored();
  check(four.every((k) => d.leads.find((l) => l.id === ID[k])?.assigneeId === "m_asha"), "the four are Asha's in the store");
  const line = "Assigned to Asha Example (was Unassigned) by Mehdi Alam";
  check(four.every((k) => d.events.some((e) => e.leadId === ID[k] && e.type === "assign" && e.detail === line)), `each has the history line "${line}"`);
  await settle(300);
  check(new RegExp(`Unassigned\\s*${pool0 - 4}\\b`).test(await unTab.innerText().catch(() => "")), `the Unassigned count drops by 4, to ${pool0 - 4}`,
    await unTab.innerText().catch(() => ""));
  await goto("/crm/team");
  await waitFor("team-queue-m_asha", 60000);
  check((await textOf("team-queue-m_asha")) === queueText(d, "m_asha"), `Team shows Asha's queue ${queueText(d, "m_asha")}`, await textOf("team-queue-m_asha"));
  check((await textOf("team-pool-count")) === String(pool0 - 4), `and the pool card ${pool0 - 4}`, await textOf("team-pool-count"));
  await openLead("U1");
  await unfold("history-details");
  check((await textOf("history-details")).includes(line), "the lead's History shows the line too", (await textOf("history-details")).slice(0, 240));
});

/** A phone number in full (+91 98200 60001), or an e-mail in full: the masked forms are "+91 98200 •••01" and "a•••@...". */
const FULL_CONTACT = /98200 \d{5}|[a-z0-9]@team-e2e\.example/i;
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

await scene(3, "Owner, Share out: 3 between Asha and Bilal (Balanced)", async () => {
  await goto("/crm/leads?view=all");
  await leadRows().first().waitFor({ timeout: 60000 }).catch(() => {});
  await settle();
  const three = ["U5", "U6", "U7"];
  for (const k of [...three, "M1"]) await select(NAME[k]);
  await bar().getByTestId("bulk-share-out").click();
  await waitFor("distribute-dialog");
  await settle(300);
  const dlg = page.getByTestId("distribute-dialog");
  /* Asha and Bilal only: Chetan (added in scenario 1) starts ticked too. */
  const labels = await dlg.locator('input[type="checkbox"][aria-label^="Share with "]').evaluateAll((els) => els.map((e) => [e.getAttribute("aria-label"), e.checked]));
  for (const [label, on] of labels) {
    const want = /Share with (Asha|Bilal) Example$/.test(label);
    if (want !== on) await dlg.getByRole("checkbox", { name: label }).click();
  }
  check(await dlg.locator('input[name="dist-mode"]').first().isChecked(), "Balanced is the default way");
  let d = await stored();
  /* Balanced: each lead to whoever has the fewest New leads waiting (ties: the order picked). */
  const queue = { "Asha Example": 0, "Bilal Example": 0 };
  for (const [n, id] of [["Asha Example", "m_asha"], ["Bilal Example", "m_bilal"]]) queue[n] = d.leads.filter((l) => l.assigneeId === id && l.status === "new").length;
  const expect = {};
  for (let i = 0; i < three.length; i++) {
    const n = queue["Asha Example"] <= queue["Bilal Example"] ? "Asha Example" : "Bilal Example";
    queue[n]++;
    expect[n] = (expect[n] || 0) + 1;
  }
  const preview = await textOf("distribute-preview");
  const split = Object.fromEntries(preview.split(/,\s*/).map((p) => /^(.*\S)\s+(\d+)$/.exec(p)).filter(Boolean).map((m) => [m[1], Number(m[2])]));
  check(JSON.stringify(sortObj(split)) === JSON.stringify(sortObj(expect)), `the preview gives the 3 to whoever has the fewest New leads waiting (${JSON.stringify(expect)})`, preview);
  check((await textOf("distribute-mehdis")) === "1 at Call or Proposal stays with Mehdi", "with the Proposal lead selected: 1 at Call or Proposal stays with Mehdi",
    await textOf("distribute-mehdis"));
  await page.getByTestId("distribute-run").click();
  await waitFor("distribute-result");
  const result = await textOf("distribute-result");
  check(result === `Shared out 3: ${preview}.`, "the result equals the preview", { result, preview });
  await dlg.getByRole("button", { name: "Done" }).click().catch(() => {});
  d = await stored();
  const got = {};
  for (const k of three) {
    const who = d.leads.find((l) => l.id === ID[k])?.assigneeId;
    const n = d.team.members.find((m) => m.id === who)?.displayName || String(who);
    got[n] = (got[n] || 0) + 1;
  }
  check(JSON.stringify(sortObj(got)) === JSON.stringify(sortObj(split)), "and the store holds exactly that split", { got, split });
  check(d.leads.find((l) => l.id === ID.M1)?.assigneeId === "m_owner", "the Proposal lead was not moved: still Mehdi's");
  await bar().getByRole("button", { name: "Clear selection" }).click().catch(() => {});
});

await scene(4, "Act as Asha (member): her first password, the gates, only her leads", async () => {
  await setActor("m_asha");
  await goto("/crm");
  await waitFor("crm-first-password", 60000);
  check(await visible("crm-first-password"), "after Mehdi's reset, she first sets her own password");
  const pw = page.locator('[data-testid="crm-password-form"] input[type="password"]');
  await pw.nth(0).fill("team-e2e-pass-0001");
  await pw.nth(1).fill("team-e2e-pass-0001");
  await page.getByTestId("crm-password-form").getByRole("button", { name: /save password/i }).click();
  await waitRail("My day");
  const labels = await railLabels();
  check(JSON.stringify(labels) === JSON.stringify(["My day", "Today", "My leads", "Pipeline", "Me"]), "her rail is exactly My day, Today, My leads, Pipeline, Me", labels);
  for (const [p, label] of [["/crm/finder", "Lead finder"], ["/crm/import", "Import"], ["/crm/settings", "Settings"], ["/crm/demos", "Demos"], ["/crm/team", "Team"]]) {
    await goto(p, 300);
    await waitFor("crm-role-gate", 30000);
    check(/This screen is Mehdi's/.test(await textOf("crm-role-gate")), `${label} (${p}) shows her "This screen is Mehdi's"`, (await textOf("crm-role-gate")).slice(0, 80));
  }
  /* The Phone / Email column is hidden by default: every column on, so the masking is really looked at. */
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 2, hidden: [] })), COLS_KEY);
  await goto("/crm/leads?view=all");
  await leadRows().first().waitFor({ timeout: 60000 }).catch(() => {});
  await settle();
  const d = await stored();
  const hers = d.leads.filter((l) => memberReads("m_asha", l)).map((l) => l.instituteName).sort();
  const names = (await rowNames()).sort();
  check(JSON.stringify(names) === JSON.stringify(hers), `My leads lists exactly her ${hers.length} leads (the seed's 3 and the 4 assigned)`, names);
  check((await page.locator('button[title="Export this view as CSV"]').count()) === 0, "no Export button");
  await select(NAME.A1);
  const barText = await bar().innerText().catch(() => "");
  check(barText.length > 0 && !/Delete|Export|Assign|Share out/.test(barText), "her bulk bar has no Delete, Export, Assign or Share out", barText);
  await bar().getByRole("button", { name: "Clear selection" }).click().catch(() => {});
  const table = await page.locator('table[aria-label="Leads"]').innerText().catch(() => "");
  const masked = (table.match(/\+91 98200 •••\d\d/g) || []).length;
  check(masked >= hers.length && !FULL_CONTACT.test(table), "the Phone / Email column shows her contacts masked (+91 98200 •••NN), none in full",
    { masked, full: table.match(FULL_CONTACT)?.[0] });
  await page.evaluate((k) => localStorage.removeItem(k), COLS_KEY);
  await openLead("A1");
  const head = await page.locator("header").filter({ has: page.getByTestId("lead-name") }).first().innerText().catch(() => "");
  check(/\+91 98200 60001/.test(head) && /a1@team-e2e\.example/.test(head), "and in full on her own lead page", head.slice(0, 200));
});

const isDisabledButton = (testId) =>
  page.getByTestId(testId).first().evaluate((el) => el.tagName === "BUTTON" && el.hasAttribute("disabled")).catch(() => false);
const callDoneCount = () => page.getByTestId("compose").locator("button", { hasText: /^\s*Call done\s*$/ }).count();

await scene(5, "Asha composes: her stages, her name, quiet hours, a forged proposal line", async () => {
  await openLead("A1");
  check((await textOf("lead-name")) === NAME.A1, "Asha opens her lead A1");
  const stages = await page.getByTestId("compose").locator("[data-stage]").evaluateAll((els) => els.map((e) => e.getAttribute("data-stage")));
  check(JSON.stringify(stages) === JSON.stringify(["first", "after_yes", "follow_up", "closing"]),
    "the stage strip is exactly First message, After they say yes, Follow-up and Closing (no After the call, no Proposal)", stages);
  await composeTab("whatsapp");
  const wa = await waText();
  check(/\bAsha\b/.test(wa) && !/Mehdi/.test(wa), "the opened wa.me text carries her name, never Mehdi's", wa.slice(0, 200));
  check(/Sends from WhatsApp Business, \+91 98765 00001/.test(await textOf("sends-from")), "above the button: the company number it sends from");
  await composeTab("email");
  const mailHref = (await page.getByTestId("open-mailto").getAttribute("href").catch(() => "")) || "";
  const mailBody = mailHref ? decodeURIComponent((mailHref.split("body=")[1] || "").split("&")[0]) : "";
  check(/Asha Example, Ideovent Technologies, Saket, New Delhi/.test(mailBody) && /98765 00001/.test(mailBody) && !/Mehdi/.test(mailBody),
    "the e-mail signature carries her name and company phone", mailBody.slice(-240));

  await page.clock.setFixedTime(NIGHT);
  await openLead("A1");
  await composeTab("whatsapp");
  const night = await page.getByTestId("compose").locator('[aria-label="Blocked"]').innerText().catch(() => "");
  check(/quiet hours/i.test(night), "at 21:30 India time Send is blocked with the quiet-hours line", night);
  check(await isDisabledButton("open-whatsapp"), "and the WhatsApp button is disabled");
  await page.clock.setFixedTime(T0);

  /* Back at 14:30: she turns her lead's demo link on (it was a draft), then sends the first WhatsApp. */
  await openLead("A1");
  await composeTab("whatsapp");
  await page.getByTestId("demo-turn-on").click();
  await settle(1200);
  const cmsNow = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), CMS_KEY);
  check(cmsNow.demoSites?.find((s) => s.id === "ds_t_a1")?.status === "sent", "Turn on the link makes her lead's draft demo live");
  await page.getByTestId("open-whatsapp").click();
  await settle(1200);
  const sent = (await stored()).events.find((e) => e.leadId === ID.A1 && e.type === "sent" && e.channel === "whatsapp" && e.actorId === "m_asha");
  check(Boolean(sent) && (await leadOf("A1"))?.status === "contacted", "Open in WhatsApp records her first WhatsApp, and A1 is Contacted", sent);

  /* Straight to the local store as Asha, past every screen: the same refusal as the database's. */
  const forged = await page.evaluate(async (leadId) => {
    const m = await import("/src/lib/outreach/store.ts");
    try {
      await m.getOutreachStore().addEvent({ leadId, type: "sent", channel: "whatsapp", stage: "proposal", templateId: "wa_proposal_school_en",
        detail: "forged proposal line (team e2e)" });
      return { ok: true };
    } catch (e) {
      return { ok: false, code: e && e.code, message: e && e.message };
    }
  }, ID.A1);
  check(!forged.ok && forged.code === "42501" && forged.message === "The after-call summary and the proposal are Mehdi's (they carry the price). Hand the lead to him.",
    "a forged history line with stage proposal, written as Asha, is refused with the SQL's message", forged);
  check(!(await stored()).events.some((e) => /forged proposal line/.test(e.detail || "")), "and nothing was written");
});

await scene(6, "Asha's lead page: fill-only contacts, add-only notes, Lost asks why, Mehdi's stages, no cold calls", async () => {
  await openLead("A2");
  await page.getByRole("button", { name: /^edit$/i }).first().click();
  await settle(400);
  check((await page.locator("#lf-phone").getAttribute("readonly")) !== null && (await page.getByTestId("ask-wrong-phone").count()) === 1,
    "Edit: the filled phone is read-only, with Wrong? Ask Mehdi");
  await page.locator("#lf-email").fill("a2@team-e2e.example");
  await page.getByRole("button", { name: /^save$/i }).click();
  await settle(900);
  check((await leadOf("A2"))?.email === "a2@team-e2e.example", "filling the empty e-mail saves");

  await page.locator("details").filter({ has: page.locator("summary", { hasText: "Notes" }) }).locator("summary").first().click();
  await settle(300);
  check((await textOf("notes-read")) === "First note from Mehdi" && (await page.locator('textarea[aria-label="Notes about this lead"]').count()) === 0,
    "notes show read-only, with Add to notes");
  await page.getByTestId("notes-add").fill("Line from Asha: call after 4");
  await page.getByTestId("notes-add-submit").click();
  await settle(900);
  check((await leadOf("A2"))?.notes === "First note from Mehdi\nLine from Asha: call after 4", "adding a line keeps the old text", (await leadOf("A2"))?.notes);

  await unfold("status-details");
  const disabled = await page.getByRole("radiogroup", { name: "Lead status" }).locator("button[disabled]").allInnerTexts();
  check(["Call", "Proposal", "Won"].every((s) => disabled.includes(s)), "Call, Proposal and Won are disabled for her", disabled);
  const steps = await page.locator('[data-testid="call-script"] [data-step]').count();
  check((await callDoneCount()) === 1 && steps > 0, "a lead that replied: Call done is there, with her call script", { callDone: await callDoneCount(), steps });
  await openLead("A1");
  check((await callDoneCount()) === 0 && (await page.getByTestId("calls-engaged-only-menu").count()) === 1
    && (await page.locator('[data-testid="call-script"] [data-step]').count()) === 0,
  "no reply yet and no May cold-call: no Call done and no call script, the TRAI line instead");

  await openLead("U4");
  await unfold("status-details");
  await page.getByRole("radiogroup", { name: "Lead status" }).getByRole("radio", { name: "Lost" }).click();
  await settle(400);
  check(await visible("lost-reason"), "Lost asks her why first");
  await page.getByTestId("lost-reason").getByText("No budget", { exact: true }).click();
  await page.getByTestId("lost-reason").getByRole("button", { name: "Mark Lost" }).click();
  await settle(900);
  const u4 = await leadOf("U4");
  check(u4?.status === "lost" && u4?.lostReason === "No budget", "and U4 is Lost with her reason", { s: u4?.status, r: u4?.lostReason });
  await openLead("U1");
  await page.getByTestId("compose").locator("summary", { hasText: "More options" }).first().click();
  await settle(300);
  await page.getByTestId("compose").getByRole("button", { name: "They replied" }).click();
  await settle(900);
  const replied = (await stored()).events.find((e) => e.leadId === ID.U1 && e.type === "replied" && e.actorId === "m_asha");
  check((await leadOf("U1"))?.status === "replied" && Boolean(replied), "U1 answered: They replied marks it Replied, with a history line in her name", replied);

  await openLead("A3");
  check(await isDisabledButton("open-whatsapp"), "the Do-not-contact lead: the WhatsApp send is disabled");
  check(/asked not to be contacted/.test(await page.getByTestId("compose").innerText().catch(() => "")), "and the compose says why");
  await composeTab("email").catch(() => {});
  check(await isDisabledButton("open-mailto"), "the e-mail send is disabled too");
});

await scene(7, "Asha, duplicates: a New lead with Bilal's phone", async () => {
  await goto("/crm/leads/new");
  await page.getByLabel("Institute name", { exact: true }).fill("Z9 Example Copy School TeamE2E");
  await page.getByLabel("Phone", { exact: true }).fill("98200 60012");
  await settle(900);
  const dup = await textOf("lf-duplicate");
  check(/It is Bilal Example's/.test(dup) && !/98200/.test(dup), "the warning names whose lead it is (Bilal's), without the number", dup);
  await page.getByRole("button", { name: /save and compose/i }).click();
  await settle(900);
  const err = await textOf("new-lead-error");
  check(/already belongs to a lead in the CRM/.test(err), "saving it is refused with the database's words", err);
  check(!(await stored()).leads.some((l) => /^Z9 Example Copy School/.test(l.instituteName)), "and nothing was added");
});

await scene(8, "Asha, after a yes: Hand to Mehdi; Mehdi accepts", async () => {
  await openLead("A2");
  check(/They said yes: hand this lead to Mehdi now/.test(await page.getByTestId("compose").innerText().catch(() => "")),
    'on her Replied lead the after-yes stage says "hand this lead to Mehdi now"');
  await page.getByTestId("handoff-open").click();
  await settle(300);
  await page.getByTestId("handoff-note").fill("Principal said yes; wants the price and a call after 4.");
  await page.getByTestId("handoff-submit").click();
  await page.getByTestId("handed-over").or(page.getByTestId("handoff-done")).first().waitFor({ timeout: 15000 }).catch(() => {});
  await settle(600);
  const tell = (await page.getByTestId("tell-mehdi").first().getAttribute("href").catch(() => "")) || "";
  const tellText = tell ? decodeURIComponent(new URL(tell).searchParams.get("text") || "") : "";
  check(tell.startsWith(`https://wa.me/${MEHDI_WA}?`) && tellText.includes(NAME.A2) && /\/leads\/t_a2$/.test(tellText) && !/98200|@team-e2e/.test(tellText),
    `Tell Mehdi on WhatsApp opens wa.me/${MEHDI_WA} with the lead link and no contact details`, tellText);
  let d = await stored();
  const a2 = d.leads.find((l) => l.id === ID.A2);
  check(a2?.assigneeId === "m_owner" && a2?.qualifiedById === "m_asha", "A2 is Mehdi's now, credited to her", { a: a2?.assigneeId, q: a2?.qualifiedById });
  await goto("/crm/leads?view=all");
  await leadRows().first().waitFor({ timeout: 60000 }).catch(() => {});
  await settle();
  check(!(await rowNames()).includes(NAME.A2), "it leaves her list");
  await goto("/crm");
  await waitFor("my-handovers", 60000);
  check((await textOf("my-handovers")).includes(NAME.A2), "and appears under My hand-overs", (await textOf("my-handovers")).slice(0, 200));

  await setActor(null);
  await goto("/crm/today");
  await waitFor("waiting-on-you", 60000);
  const item = page.getByTestId("waiting-on-you").locator('li[data-kind="handoff"]').filter({ hasText: NAME.A2 });
  check((await item.count()) === 1 && /Asha Example/.test(await item.first().innerText().catch(() => "")), "Mehdi's Today: the hand-over waits under Waiting on you, from Asha");
  await page.getByTestId("crm-bell").click();
  await waitFor("crm-bell-list", 10000);
  const bell = await page.getByTestId("crm-bell-list").locator('li[data-kind="handoff"]').allInnerTexts();
  check(bell.some((t) => /Asha Example handed over/.test(t) && t.includes(NAME.A2)), 'the bell shows "Asha Example handed over ..."', bell);
  await page.keyboard.press("Escape");
  await settle(300);
  await item.first().getByRole("button", { name: "Accepted" }).click();
  await settle(900);
  d = await stored();
  const req = d.team.requests.find((r) => r.leadId === ID.A2 && r.kind === "handoff");
  check(req?.outcome === "accepted" && Boolean(req?.resolvedAt), "Accepted resolves the hand-over", req);
  check(d.team.notifications.some((n) => n.memberId === "m_asha" && n.kind === "resolved"), "and sends Asha a resolved notification");
});

await scene(9, "Bilal (See all): every lead read only, no contacts; WhatsApp waits for his number", async () => {
  await setActor("m_bilal");
  await goto("/crm/leads?view=all");
  await waitFor("all-leads-read-only", 60000);
  await settle();
  const d = await stored();
  const his = d.leads.filter((l) => memberReads("m_bilal", l)).map((l) => l.instituteName).sort();
  const own = (await rowNames()).sort();
  check(JSON.stringify(own) === JSON.stringify(his), `his own list is exactly his ${his.length} leads`, own);
  const ro = await textOf("all-leads-read-only");
  const missing = d.leads.filter((l) => !memberReads("m_bilal", l) && !ro.includes(l.instituteName)).map((l) => l.instituteName);
  check(/All leads \(read only\)/.test(ro) && !missing.length, "the read-only section lists every other lead", missing);
  check(!FULL_CONTACT.test(ro) && !/•••/.test(ro), "without any contact detail, not even masked", ro.match(FULL_CONTACT)?.[0]);
  check(/Asha Example/.test(ro) && /Mehdi Alam/.test(ro), "naming who works each");
  check((await page.getByTestId("all-leads-read-only").locator('input[type="checkbox"]').count()) === 0, "with nothing to select");
  await openLead("A1");
  const card = await textOf("lead-readonly");
  check(/This lead is Asha Example's\. You can see it, not work it\./.test(card) && !FULL_CONTACT.test(card),
    "opening Asha's lead shows the read-only card, without contacts", card.slice(0, 160));
  check((await page.getByTestId("lead-name").count()) === 0 && (await page.getByTestId("compose").count()) === 0, "and not the lead page");
  await openLead("B1");
  await composeTab("whatsapp").catch(() => {});
  const blocked = await page.getByTestId("compose").locator('[aria-label="Blocked"]').innerText().catch(() => "");
  check(/Send Mehdi the test message first/.test(blocked), 'his own WhatsApp send is blocked: "Send Mehdi the test message first"', blocked);
});

await scene(10, "Ayesha (admin): sees all, assigns; no Delete, Export, Proposal or Won; Team read only", async () => {
  await setActor("m_ayesha");
  await goto("/crm/leads?view=all");
  await leadRows().first().waitFor({ timeout: 60000 }).catch(() => {});
  await settle();
  const names = await rowNames();
  check([NAME.A1, NAME.B1, NAME.U8, NAME.M1].every((n) => names.includes(n)), "she sees everyone's leads: Asha's, Bilal's, the pool's and Mehdi's", names.length);
  check((await page.locator('button[title="Export this view as CSV"]').count()) === 0, "no Export");
  await select(NAME.U8);
  const barText = await bar().innerText().catch(() => "");
  check(/Assign to/.test(barText) && /Share out/.test(barText) && !/Delete|Export/.test(barText), "her bulk bar: Assign to and Share out, no Delete or Export", barText);
  await bar().getByRole("button", { name: "Clear selection" }).click().catch(() => {});
  await openLead("U8");
  check((await textOf("lead-name")) === NAME.U8, "she opens a pool lead");
  await unfold("status-details");
  const disabled = await page.getByRole("radiogroup", { name: "Lead status" }).locator("button[disabled]").allInnerTexts();
  check(disabled.includes("Proposal") && disabled.includes("Won") && !disabled.includes("Call"), "Proposal and Won are disabled for her (Call is not)", disabled);
  const stages = await page.getByTestId("compose").locator("[data-stage]").evaluateAll((els) => els.map((e) => e.getAttribute("data-stage")));
  check(stages.length > 0 && !stages.includes("proposal") && !stages.includes("after_call"), "her compose has no After the call or Proposal stage", stages);
  check((await page.locator("button", { hasText: "Delete lead" }).count()) === 0, "no Delete lead");
  await goto("/crm/team");
  await waitFor("crm-team", 60000);
  await settle(500);
  check((await page.getByTestId("team-tab-performance").getAttribute("aria-selected").catch(() => "")) === "true", "her Team opens on Performance");
  check((await page.getByTestId("team-tab-access").count()) === 0, "no Access tab for her");
  await page.getByTestId("team-tab-people").click();
  await waitFor("team-person-m_asha");
  check((await page.getByTestId("team-add").count()) === 0 && (await page.locator('[data-testid^="team-reset-"]').count()) === 0
    && (await page.locator('[data-testid^="team-off-"]').count()) === 0, "People is read only: no Add person, Reset password or Switch off");
});

await scene(11, "Owner switches Asha off, with no one picked", async () => {
  await setActor(null);
  await goto("/crm/team");
  await waitFor("team-off-m_asha", 60000);
  const before = await stored();
  const held = before.leads.filter((l) => l.assigneeId === "m_asha" && isOpen(l));
  const toPool = held.filter((l) => (l.status || "new") === "new").map((l) => l.id).sort();
  const toMehdi = held.filter((l) => (l.status || "new") !== "new").map((l) => l.id).sort();
  check([ID.U2, ID.U3].every((id) => toPool.includes(id)) && toMehdi.includes(ID.U1),
    `she holds ${toPool.length} New leads (U2, U3 among them) and ${toMehdi.length} in conversation (her Replied U1 among them)`, { toPool, toMehdi });
  await page.getByTestId("team-off-m_asha").click();
  await waitFor("deactivate-dialog");
  await page.getByTestId("deactivate-confirm").click();
  await waitFor("offboarding-checklist");
  check(await visible("offboarding-checklist"), "Switch off confirms, then shows the offboarding checklist");
  const d = await stored();
  const where = (ids) => ids.map((id) => [id, d.leads.find((l) => l.id === id)?.assigneeId ?? null]);
  check(d.team.members.find((m) => m.id === "m_asha")?.active === false, "she is off");
  check(where(toPool).every(([, a]) => a === null), "her New leads are back in the Unassigned pool", where(toPool));
  check(where(toMehdi).every(([, a]) => a === "m_owner"), "her Replied lead is Mehdi's", where(toMehdi));
  await setActor("m_asha");
  await goto("/crm");
  await waitFor("crm-access-off", 60000);
  check(/Your access to the CRM is off/.test(await textOf("crm-access-off")), 'acting as Asha: "Your access to the CRM is off"', (await textOf("crm-access-off")).slice(0, 120));
  check((await page.locator("#crm-main").count()) === 0, "and nothing of the CRM loads behind it");
  await setActor(null);
  await goto("/crm/leads?view=unassigned");
  await leadRows().first().waitFor({ timeout: 60000 }).catch(() => {});
  await settle();
  const pool = await rowNames();
  const poolNames = toPool.map((id) => d.leads.find((l) => l.id === id)?.instituteName);
  check(poolNames.every((n) => pool.includes(n)), "Mehdi's Unassigned view lists them", pool);
});

await scene(12, "Owner, numbers: Team > Performance and the Access tab", async () => {
  await setActor(null);
  await goto("/crm/team");
  await waitFor("team-tab-performance", 60000);
  await page.getByTestId("team-tab-performance").click();
  await waitFor("team-performance", 60000);
  const table = 'table[aria-label="Numbers per person"]';
  await page.locator(`${table} tbody tr`).first().waitFor({ timeout: 30000 }).catch(() => {});
  await settle(600);
  const d = await stored();
  const today = (at) => {
    const t = Date.parse(at || "");
    return t >= TODAY_START && t <= T0;
  };
  /* crm_activity_stats for Today, counted here from what is stored. */
  const firstStage = (e) => e.stage === "first" || (!e.stage && /_first_/.test(e.templateId || ""));
  const want = (m) => {
    const mine = d.events.filter((e) => e.actorId === m.id && today(e.at));
    const held = d.leads.filter((l) => l.assigneeId === m.id);
    return {
      newLeads: held.filter((l) => (l.status || "new") === "new").length,
      openLeads: held.filter(isOpen).length,
      firstWhatsapp: mine.filter((e) => e.type === "sent" && e.channel === "whatsapp" && firstStage(e)).length,
      replies: mine.filter((e) => e.type === "replied").length,
      handoffs: mine.filter((e) => e.type === "handoff").length,
      handoffsConfirmed: d.team.requests.filter((r) => r.kind === "handoff" && r.outcome === "accepted" && r.askedBy === m.id && today(r.resolvedAt)).length,
    };
  };
  const shown = await page.$$eval(`${table} tbody tr`, (trs) => trs.map((tr) => ({
    id: tr.getAttribute("data-member-id"),
    cells: Object.fromEntries([...tr.querySelectorAll("td[data-col]")].map((td) => [td.getAttribute("data-col"), td.textContent.trim()])),
  })));
  for (const m of d.team.members) {
    const row = shown.find((r) => r.id === m.id);
    const w = want(m);
    const got = row ? Object.fromEntries(Object.keys(w).map((k) => [k, parseInt(row.cells[k], 10)])) : null;
    check(Boolean(row) && JSON.stringify(got) === JSON.stringify(w), `Performance, Today, ${m.displayName}: ${JSON.stringify(w)}`, got);
  }
  check(d.team.requests.some((r) => r.askedBy === "m_asha" && r.outcome === "accepted"), "(the numbers include Asha's accepted hand-over)");
  const unassigned = await page.getByTestId("card-unassigned").locator("[data-value]").innerText().catch(() => "");
  check(unassigned === String(poolCount(d)), `the Unassigned card says ${poolCount(d)}`, unassigned);

  await goto("/crm/team?tab=access");
  await waitFor("team-access", 60000);
  const rowSel = '[data-testid="team-access"] table tbody tr[data-testid="access-row"]';
  await page.locator(rowSel).first().waitFor({ timeout: 15000 }).catch(() => {});
  const views = d.team.audit.filter((a) => a.action === "lead.view" && a.actorId === "m_asha" && today(a.at)).length;
  const heads = await page.$$eval('[data-testid="team-access"] table thead th', (ths) => ths.map((t) => t.textContent.trim()));
  const ashaRow = page.locator(rowSel).filter({ hasText: "Asha Example" }).first();
  const cells = await ashaRow.locator("td").allInnerTexts().catch(() => []);
  const opened = Number(cells[heads.indexOf("Opened")]);
  check(views > 0 && opened === views, `the Access tab counts the ${views} lead pages Asha opened today`, { opened, views, heads });
  await ashaRow.click().catch(() => {});
  await waitFor("access-day-lines", 10000);
  const lines = await textOf("access-day-lines");
  check(/Opened/.test(lines) && lines.includes(NAME.A1), "her day opens to the lines: the leads she opened, by name", lines.slice(0, 200));
});

/* ── Layout (spec 13.4): My day, Team (People, Access) and a member's lead page ── */
await scene("L", "Layout: no sideways scroll at 360, 390 and 1440 px, light and dark", async () => {
  if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });
  const screens = [
    { who: "m_bilal", path: "/crm", name: "my-day", ready: "my-day" },
    { who: "m_bilal", path: `/crm/leads/${ID.B1}`, name: "member-lead", ready: "lead-name" },
    { who: null, path: "/crm/team", name: "team-people", ready: "team-people" },
    { who: null, path: "/crm/team?tab=access", name: "team-access", ready: "team-access" },
  ];
  for (const theme of ["light", "dark"]) {
    for (const width of [360, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const s of screens) {
        await setActor(s.who);
        await page.evaluate(([k, t]) => localStorage.setItem(k, t), [THEME_KEY, theme]);
        await goto(s.path, 300);
        await waitFor(s.ready, 60000);
        await settle(500);
        const over = await sideways();
        const down = await behind();
        const ready = await visible(s.ready);
        check(ready && over <= 0 && down <= 1, `${s.name} at ${width} px, ${theme}: renders, no sideways scroll, no page scroll behind the shell`,
          { ready, over, down });
        /* A full-page shot of a long screen can pass the 15 s default under load (seen 2 Oct, 16:30). */
        if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, `team-${s.name}-${width}-${theme}.png`), fullPage: true, timeout: 90000 });
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate((k) => localStorage.setItem(k, "light"), THEME_KEY);
  await setActor(null);
});

/* ── Result ────────────────────────────────────────────────────────────── */
scenario = "end";
check(!errors.length, "no page errors or console errors", errors.slice(0, 5));
await browser.close();
const failedIn = [...new Set(failed.map((f) => f.scenario))];
console.log(`\n${passes} passed, ${failed.length} failed${failed.length ? ` (scenarios ${failedIn.join(", ")})` : ""}`);
if (NEGATIVE) {
  const four = failedIn.includes("4");
  const nine = failedIn.includes("9");
  if (!negApplied) console.log("NEGATIVE MODE NOT APPLIED: access.ts was not rewritten, so nothing was proved.");
  else console.log(`NEGATIVE MODE (canSeeLead answers true): scenario 4 ${four ? "failed" : "PASSED"}, scenario 9 ${nine ? "failed" : "PASSED"}.`);
  if (!negApplied || !four || !nine) {
    console.log("NEGATIVE CONTROL INVALID");
    process.exit(3);
  }
  console.log("Negative mode failed as it must: a member reading every lead is caught.");
  process.exit(1);
}
if (failed.length) {
  console.log("FAILED:\n  " + failed.map((f) => `[${f.scenario}] ${f.msg}`).join("\n  "));
  process.exit(1);
}
console.log("e2e-crm-team: all checks passed");
process.exit(0);
