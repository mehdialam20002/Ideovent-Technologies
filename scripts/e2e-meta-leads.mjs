/**
 * META LEAD ADS into the CRM, end to end, in LOCAL mode (meta-leads-spec 9.5), plus the
 * signed webhook itself into this browser's CRM.
 *
 *   node scripts/e2e-meta-leads.mjs [baseUrl]          default http://localhost:5199
 *   SHOT_DIR=<folder> node scripts/e2e-meta-leads.mjs   keeps the 390 and 1280 px screenshots
 *                                                      (light and dark) of Settings > Meta Lead Ads
 *   E2E_NEGATIVE=1 node scripts/e2e-meta-leads.mjs ...  serves src/lib/meta/localIntake.ts without
 *       its registry check and src/lib/outreach/localTeam.ts without its ol_meta_ id check
 *       (rewritten in flight; no file is touched): step 3 ("the same lead id again: already")
 *       must FAIL and the run must exit 1 (exit 3: a rewrite matched nothing, or step 3 passed).
 *   E2E_NEGATIVE=webhook node scripts/e2e-meta-leads.mjs ...  the fake Meta signs its
 *       notifications with another secret: step 10's "accepted" checks must FAIL (exit 1;
 *       exit 3 when step 10 passed anyway).
 *
 * THE STEPS (Mehdi, unless it says otherwise)
 *   0. With no Meta lead in the data, the Leads list has no Campaign control.
 *   1. Settings: the Meta Lead Ads card; /settings/meta shows the local note, the 14-step
 *      checklist, the webhook URL and the variable names, and holds no EAA, appsecret or sha256=.
 *   2. Simulate (Instagram, campaign "Test campaign"): created; Leads shows it once, with the
 *      Instagram chip, and the name cell's first span is the title alone.
 *   3. The same lead id again: already; still one row.
 *   4. Another lead id, the same phone, another name and e-mail: duplicate; no new row; the
 *      first lead's history gets a neutral line ("Someone sent the Instagram lead form with this
 *      lead's phone number ... Their answers went to Mehdi.") and none of the answers; they wait
 *      on Mehdi's Today under Waiting on you (Meta form again), and Done closes it.
 *   5. Filters: Source "Instagram Lead Ads (1)"; Campaign "Test campaign (1)" filters to it;
 *      ?campaign= survives a reload.
 *   6. Rules mode with a local rule to Asha: the next lead is Asha's; she sees it in My leads
 *      and gets the assigned bell; Bilal does not see it; Asha opening /settings/meta gets
 *      "This screen is Mehdi's".
 *   7. Mehdi's bell: a "New lead" entry linking to the lead.
 *   8. Import: a UTF-16LE tab-separated Meta forms export (made here, fictional; one row has
 *      the simulated lead's id): "Meta Lead Ads export", 2 new and 1 duplicate; Import keeps the
 *      campaign and form; the same file again adds 0. A Leads Center CSV gives "Meta Leads
 *      Center" leads. The CRM's own import template imports as before. An .xlsx gets the
 *      Excel message.
 *   9. 390 and 1280 px, light and dark: no sideways scroll on /settings/meta.
 *  10. The signed webhook: the REAL api/meta/webhook.js, run here in Node, against a fake Graph
 *      API (a local HTTP server) and a fake PostgREST whose meta_lead_ingest hands the mapped
 *      lead to this browser's local CRM store (the same call Simulate makes). A notification
 *      signed with the app secret: 200 and the lead appears in the CRM once, with Graph's
 *      campaign and form; the same POST again: still once; a forged signature: 401, nothing
 *      fetched, nothing stored. The handshake answers only the right verify token.
 *      (scripts/test-meta-intake.mjs proves the same webhook against the real 0012 SQL.)
 *
 * Fixtures are fictional (Test Lead ..., +91 90000 000xx, @example.org, ids 9000...) and every
 * secret here is a made-up test value. Nothing leaves the machine: Supabase and EmailJS are
 * blocked, /api/meta/* answers 500 (local mode must never call it), the fake Graph and the
 * fake database listen on 127.0.0.1 only.
 */
import { chromium } from "playwright-core";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] || "http://localhost:5199").replace(/\/+$/, "");
const NEG_WEBHOOK = process.env.E2E_NEGATIVE === "webhook";
const NEGATIVE = Boolean(process.env.E2E_NEGATIVE) && !NEG_WEBHOOK;
const SHOT_DIR = process.env.SHOT_DIR || "";
const OUTREACH_KEY = "ideovent_outreach_v1";
const META_KEY = "ideovent_meta_local_v1";
const ACTOR_KEY = "ideovent_crm_local_actor";
const SESSION_KEY = "ideovent_admin_session";
const THEME_KEY = "ideovent-theme-v2";
const WAIT = 45000;
const iso = (t) => new Date(t).toISOString();
const now = Date.now();

let step = "0";
let passes = 0;
const failed = [];
const check = (cond, msg, detail) => {
  if (cond) {
    passes++;
    console.log("ok    " + msg);
  } else {
    failed.push({ step, msg });
    const d = detail === undefined ? "" : `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
    console.log("FAIL  " + msg + d.slice(0, 400));
  }
};
async function run(id, title, body) {
  step = String(id);
  console.log(`\n── ${id}. ${title}`);
  try {
    await body();
  } catch (e) {
    check(false, `step ${id} stopped: ${String((e && e.message) || e).split("\n")[0]}`);
  }
}

/* ── The seed: Mehdi, Asha (member), Bilal (member), a rule "everything to Asha", one CSV lead ── */
const member = (id, displayName) => ({
  id, userId: `local:${id}`, email: `${id.slice(2)}@example.org`, displayName, role: "member", viewAll: false, canAddLeads: false,
  waDailyLimit: 25, newLeadCap: 40, mayColdCall: false, targets: {}, active: true, mustChangePassword: false, createdAt: iso(now - 864e5),
});
const OWNER = {
  id: "m_owner", userId: "local:m_owner", email: "owner@local.test", displayName: "Mehdi Alam", role: "owner", viewAll: true,
  canAddLeads: true, waDailyLimit: null, newLeadCap: 1000, mayColdCall: true, targets: {}, active: true, mustChangePassword: false,
  createdAt: iso(now - 30 * 864e5),
};
const SEED = {
  leads: [{ id: "ol_plain_1", instituteName: "Example Plain School", kind: "school", city: "Patna", phone: "+919000000101", source: "CSV import",
    status: "new", createdAt: iso(now - 2 * 864e5), updatedAt: iso(now - 2 * 864e5), createdById: "m_owner", assigneeId: null }],
  events: [],
  settings: null,
  team: {
    members: [OWNER, member("m_asha", "Asha Test"), member("m_bilal", "Bilal Test")],
    rules: [{ id: 900, name: "All to Asha", kind: null, city: null, memberIds: ["m_asha"], priority: 1, active: true, nextIndex: 0 }],
    notifications: [], requests: [], audit: [], bookings: [], reviews: [], usage: {}, seq: 1000,
  },
};

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
await context.route(/\.supabase\.co|api\.emailjs\.com/, (r) => r.abort());
const apiCalls = [];
await context.route("**/api/meta/**", (r) => {
  apiCalls.push(r.request().url());
  return r.fulfill({ status: 500, contentType: "application/json", body: "{}" });
});
await context.addInitScript((k) => {
  try {
    sessionStorage.setItem(k, "1");
  } catch {
    /* no storage */
  }
}, SESSION_KEY);

/* The negative control: a Meta lead id seen before is no longer recognised, in the registry or the store. */
const negApplied = { localIntake: false, localTeam: false };
if (NEGATIVE) {
  const breakModule = (re, key, from, to) =>
    context.route(re, async (route) => {
      try {
        const res = await route.fetch();
        const src = await res.text();
        const broken = src.replace(from, to);
        if (broken !== src) negApplied[key] = true;
        return route.fulfill({ response: res, body: broken });
      } catch {
        return route.continue();
      }
    });
  await breakModule(/\/src\/lib\/meta\/localIntake\.ts/, "localIntake", /const seen = reg\.leads\[leadgenId\];/, "const seen = undefined;");
  await breakModule(/\/src\/lib\/outreach\/localTeam\.ts/, "localTeam",
    /const made = this\.allLeads\(\)\.find\(\(l\)\s*=>\s*l\.id === id \|\| l\.metaLeadId === leadgenId\);/, "const made = undefined;");
}

const errors = [];
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.stack || e.message));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text()) && errors.push(m.text()));

const goto = (path) => page.goto(BASE + path, { waitUntil: "domcontentloaded" });
const settle = (ms = 500) => page.waitForTimeout(ms);
const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), OUTREACH_KEY);
const setActor = (id) => page.evaluate(([k, v]) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k)), [ACTOR_KEY, id]);
const textOf = (testId) => page.getByTestId(testId).first().innerText().then((t) => t.replace(/\s+/g, " ").trim(), () => "");
const table = () => page.locator('table[aria-label="Leads"]');
const rowsNamed = (name) => table().locator("tbody tr", { hasText: name });
async function leadsPage(query = "?view=all") {
  await goto("/crm/leads" + query);
  await table().locator("tbody tr").first().waitFor({ timeout: WAIT }).catch(() => {});
  await settle(400);
}
async function simulateAndWait(result) {
  await page.getByTestId("meta-simulate-run").click();
  await page.locator(`[data-testid="meta-simulate-result"][data-result="${result}"]`).waitFor({ timeout: 20000 }).catch(() => {});
  return page.getByTestId("meta-simulate-result").first().getAttribute("data-result").catch(() => null);
}
const metaPage = async () => {
  await goto("/crm/settings/meta");
  await page.getByTestId("meta-leads-page").waitFor({ timeout: WAIT }).catch(() => {});
  await settle(300);
};

/* Seeded from a same-origin page that is not the app. */
await goto("/robots-crm.txt");
await page.evaluate(([ok, seed, mk, ak]) => {
  localStorage.setItem(ok, JSON.stringify(seed));
  localStorage.removeItem(mk);
  localStorage.removeItem(ak);
  localStorage.removeItem("ideovent_crm_scope_v1");
}, [OUTREACH_KEY, SEED, META_KEY, ACTOR_KEY]);

const SIM = { business: "Example Test Classes", phone: "+919000000001", campaign: "Test campaign" };
let leadId = "";
let metaRow = "";

await run(0, "No Meta lead yet: no Campaign control", async () => {
  await leadsPage();
  check((await rowsNamed("Example Plain School").count()) === 1, "the Leads list shows the seeded CSV lead");
  check((await page.locator('select[aria-label="Campaign"]').count()) === 0, "with no Meta lead in the data, the Campaign control is absent");
});

await run(1, "Settings: the Meta Lead Ads card and page", async () => {
  await goto("/crm/settings");
  await page.getByTestId("meta-settings-card").waitFor({ timeout: WAIT });
  check(/Local mode/.test(await textOf("meta-card-state")), "the Settings card is there, and says local mode", await textOf("meta-settings-card"));
  await page.getByTestId("meta-card-open").click();
  await page.getByTestId("meta-leads-page").waitFor({ timeout: WAIT });
  check(new URL(page.url()).pathname === "/crm/settings/meta", "Open goes to /crm/settings/meta", page.url());
  check(await page.getByTestId("meta-local-note").isVisible().catch(() => false), "the page shows the local-mode note");
  const steps = await page.locator('[data-testid="meta-checklist"] li[data-step]').count();
  check(steps === 14, "the checklist has its 14 steps", steps);
  check((await textOf("meta-webhook-url")) === "https://www.ideovent.in/api/meta/webhook", "the webhook URL is https://www.ideovent.in/api/meta/webhook", await textOf("meta-webhook-url"));
  const main = await page.locator("#crm-main").evaluate((el) => el.innerHTML).catch(() => "");
  const names = ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "META_PAGE_ID", "META_ACCESS_TOKEN", "CRON_SECRET"];
  check(names.every((n) => main.includes(n)), "it names the variables Mehdi sets in Vercel", names.filter((n) => !main.includes(n)));
  check(!/EAA|appsecret|sha256=/i.test(main), "and holds no EAA, appsecret or sha256= anywhere on it", main.match(/.{30}(EAA|appsecret|sha256=).{30}/i)?.[0]);
  check((await page.getByTestId("meta-connect").count()) === 0 && (await page.getByTestId("meta-fetch-now").count()) === 0, "no Connect or Fetch button in local mode");
});

await run(2, "Simulate an Instagram lead: created, shown once", async () => {
  await metaPage();
  leadId = await page.getByTestId("meta-sim-id").inputValue();
  metaRow = `ol_meta_${leadId}`;
  check(/^\d+$/.test(leadId) && (await page.getByTestId("meta-sim-platform").inputValue()) === "ig", "Simulate starts with a fictional lead id, on Instagram", leadId);
  const r = await simulateAndWait("created");
  check(r === "created" && /Created, in the Unassigned pool/.test(await textOf("meta-simulate-result")), "Simulate: created, in the Unassigned pool", await textOf("meta-simulate-result"));
  await leadsPage();
  const row = rowsNamed(SIM.business);
  check((await row.count()) === 1, "Leads shows it once", await row.count());
  check((await row.locator('[data-testid="lead-source-badge"][data-platform="ig"]').count()) >= 1, "with the Instagram chip");
  const first = await row.locator("td span span").first().innerText().catch(() => "");
  check(first === SIM.business, "and the name cell's first span is the title alone", first);
  check((await rowsNamed("Example Plain School").locator('[data-testid="lead-source-badge"]').count()) === 0, "a CSV lead has no chip");
  const lead = (await stored()).leads.find((l) => l.id === metaRow);
  check(lead?.metaCampaignName === SIM.campaign && lead?.metaPlatform === "ig" && lead?.phone === SIM.phone && lead?.source === "Instagram Lead Ads",
    "stored with its campaign, platform, phone and source", lead && { c: lead.metaCampaignName, p: lead.metaPlatform, ph: lead.phone, s: lead.source });
});

await run(3, "The same lead id again: already, still one row", async () => {
  await metaPage();
  /* The id field starts fresh on a new visit: put the first lead's id back, as Meta's retry would. */
  await page.getByTestId("meta-sim-id").fill(leadId);
  const r = await simulateAndWait("already");
  check(r === "already", "Simulate the same lead id again: already", r);
  await leadsPage();
  check((await rowsNamed(SIM.business).count()) === 1, "and Leads still shows it once", await rowsNamed(SIM.business).count());
  const d = await stored();
  check(d.leads.filter((l) => l.metaLeadId === leadId || l.id === metaRow).length === 1, "one lead in the store for that Meta lead id");
});

/* Someone else sends the form with the first lead's number (review, 3 Oct): their own name and e-mail. */
const OTHER = { name: "Second Sender", email: "second.sender@example.org" };
const NEUTRAL = /^Someone sent the Instagram lead form with this lead's phone number \(form "Website enquiry", campaign "Test campaign"\)\. Their answers went to Mehdi\.$/;
await run(4, "Another lead id, the same phone: duplicate", async () => {
  await metaPage();
  await page.getByTestId("meta-sim-new-id").click();
  const second = await page.getByTestId("meta-sim-id").inputValue();
  check(second !== leadId, "New id makes another lead id", second);
  await page.getByTestId("meta-sim-fullName").fill(OTHER.name);
  await page.getByTestId("meta-sim-email").fill(OTHER.email);
  const r = await simulateAndWait("duplicate");
  check(r === "duplicate", "Simulate: duplicate", r);
  check(/the answers wait for you under Waiting on you on Today/.test(await textOf("meta-simulate-result")), "and it says where the answers went", await textOf("meta-simulate-result"));
  await leadsPage();
  check((await rowsNamed(SIM.business).count()) === 1, "no new row");
  const d = await stored();
  check(!d.leads.some((l) => l.id === `ol_meta_${second}`), "and no lead for the second id");
  const line = d.events.find((e) => e.leadId === metaRow && e.id === `oe_meta_${second}`);
  check(Boolean(line) && !line.actorId && NEUTRAL.test(line.detail || ""), "the first lead's history gains a neutral line (someone sent the form with this lead's phone number), written by nobody", line);
  check(!JSON.stringify(d.events.filter((e) => e.leadId === metaRow)).includes(OTHER.name) && !JSON.stringify(d.leads.find((l) => l.id === metaRow)).includes(OTHER.email),
    "...and nothing the second sender typed is on the lead or its history");
  const ask = (d.team?.requests || []).find((q) => q.kind === "meta_form" && q.leadId === metaRow);
  check(Boolean(ask) && !ask.askedBy && !ask.resolvedAt && ask.body.includes(OTHER.name) && ask.body.includes(OTHER.email) && ask.body.length <= 500,
    "their answers wait for Mehdi as a request, asked by nobody", ask);
  await goto(`/crm/leads/${metaRow}`);
  await page.getByTestId("lead-name").waitFor({ timeout: WAIT }).catch(() => {});
  const hist = page.getByTestId("history-details").first();
  if (!(await hist.evaluate((x) => x.open).catch(() => true))) await hist.locator("summary").first().click();
  await settle(300);
  const histText = await textOf("history-details");
  check(/Someone sent the Instagram lead form with this lead's phone number/.test(histText) && !histText.includes(OTHER.name),
    "and the lead page's History shows the neutral line, not the answers", histText.slice(0, 200));
  const facts = await textOf("meta-lead-facts");
  check(/From a Meta lead form/i.test(facts) && /Instagram/.test(facts) && facts.includes(SIM.campaign) && /Website enquiry/.test(facts) && /Consent tick Ticked/.test(facts),
    "the lead page shows where it came from: platform, form, campaign and the consent tick", facts.slice(0, 240));
  /* Mehdi's Today: the answers under Waiting on you, closed with Done. */
  await goto("/crm/today");
  await page.getByTestId("waiting-on-you").waitFor({ timeout: WAIT }).catch(() => {});
  const item = page.getByTestId("waiting-on-you").locator('li[data-kind="meta_form"]').filter({ hasText: SIM.business });
  const itemText = (await item.first().innerText().catch(() => "")).replace(/\s+/g, " ");
  check((await item.count()) === 1 && itemText.includes(OTHER.name) && itemText.includes(OTHER.email) && /Meta form again/.test(itemText)
    && /Not shown on the lead/.test(itemText) && !/from Someone/.test(itemText),
    "Mehdi's Today: Waiting on you shows the form's answers (Meta form again, from nobody, not shown on the lead)", itemText.slice(0, 300));
  await item.first().getByRole("button", { name: "Done" }).click();
  await page.getByTestId("waiting-on-you-done").or(page.getByText(/Meta form again on .*: Done\./)).first().waitFor({ timeout: WAIT }).catch(() => {});
  const closed = ((await stored()).team?.requests || []).find((q) => q.kind === "meta_form" && q.leadId === metaRow);
  check(closed?.outcome === "done" && Boolean(closed?.resolvedAt), "Done closes it", closed && { outcome: closed.outcome, resolvedAt: closed.resolvedAt });
});

await run(5, "Filters: Source and Campaign", async () => {
  await leadsPage();
  const sources = await page.locator('select[aria-label="Source"] option').allInnerTexts();
  check(sources.includes("Instagram Lead Ads (1)"), "Source lists Instagram Lead Ads (1)", sources);
  const camps = await page.locator('select[aria-label="Campaign"] option').allInnerTexts();
  check(camps.includes(`${SIM.campaign} (1)`), `Campaign lists ${SIM.campaign} (1)`, camps);
  await page.locator('select[aria-label="Campaign"]').selectOption(SIM.campaign);
  await settle(400);
  check(new URL(page.url()).searchParams.get("campaign") === SIM.campaign, "the Campaign filter goes into the address", page.url());
  const rows = await table().locator("tbody tr").allInnerTexts();
  check(rows.length === 1 && rows[0].includes(SIM.business), "and filters to the one lead", rows.length);
  await page.reload({ waitUntil: "domcontentloaded" });
  await table().locator("tbody tr").first().waitFor({ timeout: WAIT }).catch(() => {});
  await settle(400);
  const after = await table().locator("tbody tr").allInnerTexts();
  check(after.length === 1 && (await page.locator('select[aria-label="Campaign"]').inputValue()) === SIM.campaign, "?campaign= survives a reload", after.length);
});

const RULES = { business: "Example Rules Classes", phone: "+91 90000 00088", email: "eight@example.org" };
await run(6, "Rules mode: the next lead is Asha's; Bilal does not see it", async () => {
  await metaPage();
  await page.getByTestId("meta-assign-mode").waitFor({ timeout: WAIT });
  await page.locator('input[name="meta-assign-mode"][value="rules"]').check();
  await page.getByTestId("meta-settings-save").click();
  await page.getByText("Saved in this browser.").waitFor({ timeout: WAIT }).catch(() => {});
  check((await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").settings?.assignMode, META_KEY)) === "rules", "Mehdi sets new leads to go by the rules");
  await page.getByTestId("meta-sim-new-id").click();
  await page.getByTestId("meta-sim-phone").fill(RULES.phone);
  await page.getByTestId("meta-sim-email").fill(RULES.email);
  await page.getByTestId("meta-sim-business").fill(RULES.business);
  const r = await simulateAndWait("created");
  check(r === "created" && /assigned to Asha Test/.test(await textOf("meta-simulate-result")), "the next simulated lead: created, assigned to Asha (the rule)", await textOf("meta-simulate-result"));

  await setActor("m_asha");
  await leadsPage();
  check((await rowsNamed(RULES.business).count()) === 1, "acting as Asha: she sees it in My leads");
  check((await rowsNamed(SIM.business).count()) === 0, "and not the pool's Meta lead");
  await page.getByTestId("crm-bell").click();
  await page.getByTestId("crm-bell-list").waitFor({ timeout: 10000 }).catch(() => {});
  const bell = await page.locator('[data-testid="crm-bell-list"] li[data-kind="assigned"]').allInnerTexts();
  check(bell.some((t) => t.includes(RULES.business)), "her bell: the assigned notification", bell);
  await page.keyboard.press("Escape");
  await goto("/crm/settings/meta");
  await page.getByTestId("crm-role-gate").waitFor({ timeout: WAIT }).catch(() => {});
  check(/This screen is Mehdi's/.test(await textOf("crm-role-gate")) && (await page.getByTestId("meta-leads-page").count()) === 0,
    "Asha opening /settings/meta gets This screen is Mehdi's");

  await setActor("m_bilal");
  await goto("/crm/leads?view=all");
  await page.locator("#crm-main").waitFor({ timeout: WAIT }).catch(() => {});
  await settle(1500);
  const bilal = await page.locator("#crm-main").innerText().catch(() => "");
  check(bilal.length > 0 && !bilal.includes(RULES.business) && !bilal.includes(SIM.business), "acting as Bilal: he sees neither Meta lead", bilal.slice(0, 160));
  await setActor(null);
});

await run(7, "Mehdi's bell: New lead", async () => {
  await leadsPage();
  await page.getByTestId("crm-bell").click();
  await page.getByTestId("crm-bell-list").waitFor({ timeout: 10000 }).catch(() => {});
  const item = page.locator('[data-testid="crm-bell-list"] li[data-kind="lead_in"]').filter({ hasText: SIM.business }).first();
  const text = await item.innerText().catch(() => "");
  const href = await item.locator("a").first().getAttribute("href").catch(() => null);
  check(/New lead/.test(text) && text.includes(SIM.business), "a New lead entry for the Instagram lead", text);
  check(href === `/crm/leads/${metaRow}`, "linking to the lead", href);
  await page.keyboard.press("Escape");
});

const importPage = async () => {
  await goto("/crm/import");
  await page.locator("#csv-text").waitFor({ timeout: WAIT });
  await settle(300);
};
const FILE_INPUT = 'input[aria-label="CSV file to import"]';
const importedStatus = (n) => page.getByRole("status").filter({ hasText: new RegExp(`Imported ${n} lead`) }).first().waitFor({ timeout: WAIT }).catch(() => {});

await run(8, "Import: Meta's own downloads, the CRM template, an Excel file", async () => {
  /* A Meta forms download as Ads Manager gives it: UTF-16LE with a BOM, tab-separated, prefixed ids. */
  const header = ["id", "created_time", "campaign_id", "campaign_name", "form_id", "form_name", "is_organic", "platform",
    "full_name", "phone_number", "email", "company_name", "city"];
  const rows = [
    [`l:${leadId}`, "2026-10-01T10:15:00+0000", "c:900000000000301", "Test campaign", "f:900000000000401", "Website enquiry", "FALSE", "ig",
      "Test Lead", "p:+919000000001", "test@example.org", SIM.business, "Patna"],
    ["l:900000000000777", "2026-10-01T11:15:00+0000", "c:900000000000301", "Test campaign", "f:900000000000401", "Website enquiry", "FALSE", "fb",
      "Test Lead Two", "p:+919000000077", "seven@example.org", "Example Import Classes", "Gaya"],
    ["l:900000000000778", "2026-10-01T12:15:00+0000", "c:900000000000301", "Test campaign", "f:900000000000401", "Website enquiry", "FALSE", "ig",
      "Test Lead Three", "p:+919000000078", "three@example.org", "Example Import Academy", "Ranchi"],
  ];
  const tsv = [header, ...rows].map((r) => r.join("\t")).join("\r\n") + "\r\n";
  const buffer = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(tsv, "utf16le")]);
  await importPage();
  check(await page.getByTestId("import-from-meta").isVisible().catch(() => false), "the import screen explains Meta's downloads (From Meta?)");
  await page.setInputFiles(FILE_INPUT, { name: "meta-leads.csv", mimeType: "text/csv", buffer });
  await page.getByTestId("import-layout").waitFor({ timeout: WAIT }).catch(() => {});
  check(/^Meta Lead Ads export: 3 rows/.test(await textOf("import-layout")), "a UTF-16 tab file: import-layout says Meta Lead Ads export", await textOf("import-layout"));
  const summary = await textOf("import-summary");
  check(/3 rows: 2 new, 1 duplicate/.test(summary), "the preview: 2 new and 1 duplicate (the simulated lead's id)", summary);
  await page.getByRole("button", { name: /import 2 new leads/i }).click();
  await importedStatus(2);
  let d = await stored();
  const made = ["900000000000777", "900000000000778"].map((id) => d.leads.find((l) => l.id === `ol_meta_${id}`));
  check(made.every((l) => l && l.metaCampaignName === "Test campaign" && l.metaFormName === "Website enquiry" && !l.nextActionAt),
    "Import: the two new leads keep their campaign and form (and get no follow-up date)", made.map((l) => l && [l.id, l.metaCampaignName, l.metaFormName, l.nextActionAt]));
  check(made[0]?.source === "Facebook Lead Ads" && made[1]?.source === "Instagram Lead Ads", "and their source by platform", made.map((l) => l?.source));
  await importPage();
  await page.setInputFiles(FILE_INPUT, { name: "meta-leads.csv", mimeType: "text/csv", buffer });
  await page.getByTestId("import-summary").waitFor({ timeout: WAIT }).catch(() => {});
  check(/3 rows: 0 new, 3 duplicate/.test(await textOf("import-summary")), "the same file again: 0 new", await textOf("import-summary"));

  /* A Leads Center download (comma-separated, UTF-8): only name, e-mail, phone, stage, source and owner. */
  await importPage();
  await page.locator("#csv-text").fill("Created,Name,Email,Phone,Stage,Source,Owner\r\n2026-10-01 10:00,Test Lead Center,center@example.org,+91 90000 00051,Intake,Facebook,Mehdi\r\n");
  await page.getByTestId("import-layout").waitFor({ timeout: WAIT }).catch(() => {});
  check(/^Meta Leads Center export: 1 row/.test(await textOf("import-layout")), "a Leads Center file: import-layout says Meta Leads Center export", await textOf("import-layout"));
  await page.getByRole("button", { name: /import 1 new lead/i }).click();
  await importedStatus(1);
  d = await stored();
  const center = d.leads.find((l) => l.phone === "+919000000051");
  check(center?.source === "Meta Leads Center" && /Leads Center: stage Intake, source Facebook, owner Mehdi/.test(center?.notes || ""),
    'it becomes a "Meta Leads Center" lead, with Meta\'s stage, source and owner in its notes', center && { s: center.source, n: center.notes });

  /* The CRM's own import template (Download import template) imports exactly as before: no Meta layout. */
  await importPage();
  const template = await page.evaluate(async () => (await import("/src/lib/outreach/store.ts")).leadImportTemplateCsv());
  await page.locator("#csv-text").fill(template);
  await settle(600);
  check((await page.getByTestId("import-layout").count()) === 0, "the CRM's import template is not read as a Meta file");
  await page.getByRole("button", { name: /import 1 new lead/i }).click();
  await importedStatus(1);
  d = await stored();
  const ex = d.leads.find((l) => l.instituteName === "Example Public School");
  check(ex && ex.phone === "+919876543210" && ex.email === "office@example.org" && ex.kind === "school" && ex.city === "Saket, New Delhi"
    && ex.source === "Example" && ex.status === "new" && !Object.keys(ex).some((k) => k.startsWith("meta")),
  "and its example row maps as before: name, phone, e-mail, kind, city, source, status, no Meta keys", ex);

  await importPage();
  await page.setInputFiles(FILE_INPUT, { name: "leads.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]) });
  await page.getByTestId("import-excel").waitFor({ timeout: WAIT }).catch(() => {});
  check(/That is an Excel file/.test(await textOf("import-excel")), "an .xlsx gets the Excel message", await textOf("import-excel"));
});

await run(9, "Layout: /settings/meta at 390 and 1280 px, light and dark", async () => {
  if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });
  for (const theme of ["light", "dark"]) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(([k, t]) => localStorage.setItem(k, t), [THEME_KEY, theme]);
      await metaPage();
      await settle(800);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const shown = await page.getByTestId("meta-leads-page").isVisible().catch(() => false);
      check(shown && over <= 0, `/crm/settings/meta at ${width} px, ${theme}: renders, no sideways scroll`, { shown, over });
      if (SHOT_DIR) await page.screenshot({ path: join(SHOT_DIR, `meta-${width}-${theme}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate((k) => localStorage.setItem(k, "light"), THEME_KEY);
});

/* ── 10. The signed webhook, end to end into this browser's CRM ────────── */
/* Made-up test values, as in test-meta-intake.mjs; none is a real secret. */
const APP_ID = "9900000000000002";
const APP_SECRET = "e2e_app_secret_not_real_0002";
const VERIFY = "e2e_verify_token_not_real_02";
const PAGE_ID = "9000000000000002";
const ACCESS_TOKEN = "EAAE2ESYSTEMUSERTOKEN000000000000000002";
const PAGE_TOKEN = "EAAE2EPAGETOKEN000000000000000000000003";
const ANON = "anon-key-for-the-meta-e2e";
const FORM_ID = "9100000000000002";
const WEBHOOK_LEAD = "9000000000000901";
const FORGED_LEAD = "9000000000000902";
const WH = { business: "Example Webhook Academy", phone: "+91 90000 00091", email: "webhook@example.org", campaign: "Webhook campaign", form: "Webhook enquiry" };
const hmacHex = (msg, key) => createHmac("sha256", key).update(msg).digest("hex");
/** What the webhook shows the database (api/_lib/meta.js ingestToken), computed from the spec here. */
const INGEST_TOKEN = hmacHex("ideovent:meta-leads:ingest:v1", APP_SECRET);

/* The fake Graph API: Bearer tokens and appsecret_proof checked; the lead, its ad and its form. */
const G = { calls: [], violations: [] };
const graphLead = (id, business, phone, email) => ({
  id, created_time: new Date(Date.now() - 600000).toISOString().replace(/\.\d{3}Z$/, "+0000"), form_id: FORM_ID, platform: "fb", is_organic: false,
  field_data: [{ name: "full_name", values: ["Test Lead Webhook"] }, { name: "phone_number", values: [phone] }, { name: "email", values: [email] },
    { name: "company_name", values: [business] }, { name: "city", values: ["Patna"] }],
  custom_disclaimer_responses: [{ checkbox_key: "contact_ok", is_checked: "1" }],
  ad_id: "9200000000000002", ad_name: "Test ad", adset_id: "9300000000000002", adset_name: "Test ad set", campaign_id: "9400000000000002", campaign_name: WH.campaign,
});
const GRAPH_LEADS = new Map([
  [WEBHOOK_LEAD, graphLead(WEBHOOK_LEAD, WH.business, WH.phone, WH.email)],
  [FORGED_LEAD, graphLead(FORGED_LEAD, "Example Forged Academy", "+91 90000 00092", "forged@example.org")],
]);
const pick = (lead, fields) => Object.fromEntries(String(fields || "").split(",").filter((k) => lead[k] !== undefined).map((k) => [k, lead[k]]));
const graph = createServer((req, res) => {
  const send = (status, obj) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  const u = new URL(req.url, "http://127.0.0.1");
  const path = u.pathname.replace(/^\/v\d+\.\d+/, "");
  const q = Object.fromEntries(u.searchParams);
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || "")?.[1] || "";
  G.calls.push(path);
  if (u.searchParams.has("access_token") || req.url.includes(ACCESS_TOKEN) || req.url.includes(PAGE_TOKEN)) G.violations.push(`a token in the URL of ${path}`);
  if (q.appsecret_proof !== hmacHex(token, APP_SECRET)) {
    G.violations.push(`no valid appsecret_proof on ${path}`);
    return send(400, { error: { message: "fictional", type: "OAuthException", code: 100 } });
  }
  if (path === "/me") return send(200, { id: "8800000000000002", name: "ideovent-crm-server" });
  if (path === "/me/accounts") return send(200, { data: [{ id: PAGE_ID, name: "Ideovent", access_token: PAGE_TOKEN }] });
  if (token !== PAGE_TOKEN) {
    G.violations.push(`${path} without the Page token`);
    return send(400, { error: { message: "fictional", type: "OAuthException", code: 190 } });
  }
  const m = /^\/(\d+)$/.exec(path);
  if (m && m[1] === FORM_ID) return send(200, { id: FORM_ID, name: WH.form });
  const lead = m && GRAPH_LEADS.get(m[1]);
  return lead ? send(200, pick(lead, q.fields)) : send(400, { error: { message: "fictional", type: "GraphMethodException", code: 100, error_subcode: 33 } });
});

/*
 * The fake PostgREST: 0012's token functions as the webhook calls them (anon key, no session,
 * the ingest token checked). meta_lead_receive keeps the registry of lead ids (meta_leads) the
 * way 0012 does: an id already created or a duplicate is "known" and not fetched again.
 * meta_lead_ingest is played by THIS BROWSER's local CRM: the mapped lead goes to the store's
 * simulateMetaLead (LocalCrm.ingestMeta, 0012's steps 5 to 12 in local mode), as Simulate does.
 */
const DB = { known: new Map(), calls: [] };
const pgrest = createServer(async (req, res) => {
  const send = (status, obj) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(obj ?? null));
  };
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const fn = (/^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(req.url || "") || [])[1] || req.url;
  DB.calls.push(fn);
  let args = {};
  try {
    args = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
  } catch {
    return send(400, { code: "PGRST102", message: "not JSON" });
  }
  if (req.headers.apikey !== ANON) return send(401, { message: "Invalid API key" });
  if (req.headers.authorization) return send(401, { code: "PGRST301", message: "the token functions run as anon, without a session" });
  if (args.p_token !== INGEST_TOKEN) return send(403, { code: "28000", message: "meta: the intake is not connected, or the token does not match" });
  if (fn === "meta_log_verified") return send(200, null);
  if (fn === "meta_lead_receive") {
    const out = { fetch: [], known: 0, otherPage: 0, overCap: 0, pageMismatch: args.p_page_id !== PAGE_ID, new: 0 };
    if (out.pageMismatch) return send(200, out);
    for (const it of Array.isArray(args.p_items) ? args.p_items : []) {
      if (it.page_id && it.page_id !== PAGE_ID) {
        out.otherPage++;
        continue;
      }
      const st = DB.known.get(it.leadgen_id);
      if (st === "created" || st === "duplicate") {
        out.known++;
        continue;
      }
      if (!st) out.new++;
      DB.known.set(it.leadgen_id, st || "pending");
      out.fetch.push(it.leadgen_id);
    }
    return send(200, out);
  }
  if (fn === "meta_lead_ingest") {
    const r = await page.evaluate(async ([id, lead]) => {
      const m = await import("/src/lib/outreach/store.ts");
      try {
        return await m.getOutreachStore().simulateMetaLead(id, lead, { assignMode: "pool" });
      } catch (e) {
        return { error: String((e && e.message) || e) };
      }
    }, [args.p_leadgen_id, args.p_lead]);
    if (r.error) return send(400, { code: "P0001", message: r.error });
    if (r.result === "created" || r.result === "duplicate") DB.known.set(args.p_leadgen_id, r.result);
    return send(200, { result: r.result, leadId: r.leadId || null, assignedTo: r.assignedTo || null });
  }
  if (fn === "meta_lead_failed") {
    DB.known.set(args.p_leadgen_id, "failed");
    return send(200, { status: "failed" });
  }
  return send(404, { code: "PGRST202", message: `Could not find the function public.${fn}` });
});

await run(10, "The signed webhook into this CRM: the real api/meta/webhook.js, a fake Graph, the local store", async () => {
  const listen = (srv) => new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv.address().port)));
  const graphPort = await listen(graph);
  const pgPort = await listen(pgrest);
  Object.assign(process.env, {
    META_APP_ID: APP_ID, META_APP_SECRET: APP_SECRET, META_VERIFY_TOKEN: VERIFY, META_PAGE_ID: PAGE_ID, META_ACCESS_TOKEN: ACCESS_TOKEN,
    META_GRAPH_BASE: `http://127.0.0.1:${graphPort}`, VITE_SUPABASE_URL: `http://127.0.0.1:${pgPort}`, VITE_SUPABASE_ANON_KEY: ANON,
  });
  for (const k of ["META_RELAY_SECRET", "CRON_SECRET", "META_GRAPH_VERSION", "SUPABASE_URL", "SUPABASE_ANON_KEY"]) delete process.env[k];
  const webhook = await import(new URL("../api/meta/webhook.js", import.meta.url).href);

  /* The webhook's own log lines are kept here, to check what it would write to Vercel's logs. */
  const logs = [];
  const quiet = async (fn) => {
    const saved = { log: console.log, error: console.error, warn: console.warn, info: console.info };
    for (const k of Object.keys(saved)) console[k] = (...a) => logs.push(a.map(String).join(" "));
    try {
      return await fn();
    } finally {
      Object.assign(console, saved);
    }
  };
  const HOOK = "https://www.ideovent.in/api/meta/webhook";
  const notification = (id) => JSON.stringify({ object: "page", entry: [{ id: PAGE_ID, time: Math.floor(Date.now() / 1000),
    changes: [{ field: "leadgen", value: { leadgen_id: id, page_id: PAGE_ID, form_id: FORM_ID, ad_id: "9200000000000002", created_time: Math.floor(Date.now() / 1000) } }] }] });
  /* The secret "Meta" signs with: the app secret, or (E2E_NEGATIVE=webhook) another one. */
  const META_SIGNS_WITH = NEG_WEBHOOK ? "another_app_secret_not_real_9" : APP_SECRET;
  const post = (text, secret = META_SIGNS_WITH) => quiet(() => webhook.POST(new Request(HOOK, { method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=" + hmacHex(Buffer.from(text, "utf8"), secret) }, body: text })));
  const answer = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });

  const hs = await quiet(() => webhook.GET(new Request(`${HOOK}?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=e2e_challenge_123`)));
  const hsText = await hs.text();
  const hsBad = await quiet(() => webhook.GET(new Request(`${HOOK}?hub.mode=subscribe&hub.verify_token=not_the_verify_token_0&hub.challenge=e2e_challenge_123`)));
  check(hs.status === 200 && hsText === "e2e_challenge_123" && hsBad.status === 403, "the handshake: the right verify token gets the challenge back, another one 403",
    { status: hs.status, text: hsText, wrong: hsBad.status });

  await leadsPage();
  const count0 = (await stored()).leads.length;
  const r1 = await answer(await post(notification(WEBHOOK_LEAD)));
  check(r1.status === 200 && r1.body?.created === 1, "a notification signed with the app secret: 200, created 1", r1);
  await leadsPage();
  const row = rowsNamed(WH.business);
  check((await row.count()) === 1, "the lead appears in the CRM's Leads list, once", await row.count());
  check((await row.first().locator('[data-testid="lead-source-badge"][data-platform="fb"]').count()) >= 1, "with the Facebook chip");
  const made = (await stored()).leads.find((l) => l.id === `ol_meta_${WEBHOOK_LEAD}`);
  check(made && made.metaCampaignName === WH.campaign && made.metaFormName === WH.form && made.phone === "+919000000091"
    && made.source === "Facebook Lead Ads" && !made.assigneeId, "read from the fake Graph: its campaign, form, phone and source, in the Unassigned pool",
  made && { c: made.metaCampaignName, f: made.metaFormName, p: made.phone, s: made.source, a: made.assigneeId });

  const graphCalls = G.calls.length;
  const r2 = await answer(await post(notification(WEBHOOK_LEAD)));
  await leadsPage();
  check(r2.status === 200 && (await rowsNamed(WH.business).count()) === 1 && (await stored()).leads.length === count0 + 1,
    "the same signed POST again (Meta's retry): 200, and still one lead", r2);
  check(G.calls.length === graphCalls, "and Graph was not asked again: the lead id is known");

  const g0 = G.calls.length;
  const db0 = DB.calls.length;
  const r3 = await answer(await post(notification(FORGED_LEAD), "a_forger_does_not_have_it_000"));
  await leadsPage();
  check(r3.status === 401 && G.calls.length === g0 && DB.calls.length === db0 && !(await stored()).leads.some((l) => l.id === `ol_meta_${FORGED_LEAD}`)
    && (await rowsNamed("Example Forged Academy").count()) === 0, "a forged signature: 401, nothing fetched from Graph, nothing stored, nothing shown",
  { status: r3.status, graph: G.calls.length - g0, db: DB.calls.length - db0 });
  check(G.violations.length === 0, "Graph saw a Bearer token and a valid appsecret_proof on every call, and no token in any URL", G.violations);
  const secrets = [APP_SECRET, ACCESS_TOKEN, PAGE_TOKEN, INGEST_TOKEN, VERIFY];
  check(logs.length > 0 && !logs.some((x) => secrets.some((s) => x.includes(s)) || /Test Lead|Example Webhook|webhook@example|9000000091|90000 00091/.test(x)),
    "the webhook's log lines carry ids and counts only: no secret, token, name, number or e-mail", logs.filter((x) => /Test|Example|EAA|@/.test(x)));
  graph.close();
  pgrest.close();
});

/* ── Result ────────────────────────────────────────────────────────────── */
step = "end";
check(apiCalls.length === 0, "local mode called no /api/meta function from the browser", apiCalls);
check(!errors.length, "no page errors or console errors", errors.slice(0, 5));
/* Each error in full (4 Oct 2026). The check's detail stops at 400 characters, which cut one run's
   "The above error occurred in the <ProtectedRoute> component" before its component stack and before
   the error itself, so nobody could read what had thrown. A page error is kept with its stack. */
for (const e of errors.slice(0, 10)) console.log(`      ${String(e).slice(0, 4000)}`);
await browser.close();
const failedIn = [...new Set(failed.map((f) => f.step))];
console.log(`\n${passes} passed, ${failed.length} failed${failed.length ? ` (steps ${failedIn.join(", ")})` : ""}`);
if (NEG_WEBHOOK) {
  const ten = failedIn.includes("10");
  console.log(`NEGATIVE MODE (Meta signs with another secret): step 10 ${ten ? "failed" : "PASSED"}.`);
  if (!ten) {
    console.log("NEGATIVE CONTROL INVALID");
    process.exit(3);
  }
  console.log("Negative mode failed as it must: a notification not signed with the app secret is refused.");
  process.exit(1);
}
if (NEGATIVE) {
  const applied = negApplied.localIntake && negApplied.localTeam;
  const three = failedIn.includes("3");
  if (!applied) console.log(`NEGATIVE MODE NOT APPLIED: localIntake.ts ${negApplied.localIntake ? "rewritten" : "NOT rewritten"}, localTeam.ts ${negApplied.localTeam ? "rewritten" : "NOT rewritten"}.`);
  else console.log(`NEGATIVE MODE (no registry check, no ol_meta_ check): step 3 ${three ? "failed" : "PASSED"}.`);
  if (!applied || !three) {
    console.log("NEGATIVE CONTROL INVALID");
    process.exit(3);
  }
  console.log("Negative mode failed as it must: a Meta lead id seen before is no longer recognised.");
  process.exit(1);
}
if (failed.length) {
  console.log("FAILED:\n  " + failed.map((f) => `[${f.step}] ${f.msg}`).join("\n  "));
  process.exit(1);
}
console.log("e2e-meta-leads: all checks passed");
process.exit(0);
