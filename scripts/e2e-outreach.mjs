/**
 * End to end test of the outreach flow, now inside the CRM at /crm (28 Sep
 * 2026: Outreach moved there, /admin/outreach redirects), in LOCAL mode.
 *
 *   node scripts/e2e-outreach.mjs [baseUrl]      default http://localhost:5199
 *   SHOT_DIR=<folder> node scripts/e2e-outreach.mjs   also saves 390 and 1440 px screenshots
 *   E2E_NEGATIVE=1 node scripts/e2e-outreach.mjs ...   breaks five modules in flight; the stage, blank,
 *                                                      call-script, public-before-Zoho and With link
 *                                                      checks must fail (exit 1)
 *
 * The flow Mehdi actually does, in a real browser against the dev server:
 *   add a lead (and see the duplicate warning on a second one), create a demo
 *   from a template right on the lead page, mark it sent, compose an email and
 *   a WhatsApp, check the mailto: / wa.me links that would open, see status and
 *   history update, see Today list the follow-up and a hot lead after a demo
 *   open, import a 3-row CSV with one duplicate, and block everything once the
 *   lead is marked do not contact. Then (28 Sep 2026) a DENTAL lead: made in the
 *   new-lead form, given a d1..d7 demo from the lead page, composed with a
 *   dental template, filtered in the Leads table, counted in the breakdown.
 *   Then (30 Sep 2026, the approved wording for every stage) section 14: each
 *   lead page starts on its own stage, named in plain words (First message,
 *   After they say yes, Follow-up, After the call, Proposal, Closing); WhatsApp
 *   stops after its one follow-up; a message with a [blank] is highlighted and
 *   cannot be sent until the blank is filled; the Call script card walks the
 *   approved seven steps in the words of the lead's kind, and its Call done
 *   moves the message to After the call.
 *   Then (1 Oct 2026) the picture: a first WhatsApp that says the sample is
 *   made carries one link, its kind's picture page (/w/school, /w/dental), and
 *   the compose shows the picture under it with Copy image (a PNG on the
 *   clipboard), Share (the picture and the text) and Download, each with a
 *   one-line hint; a clinic with no demo yet and any other business get no
 *   picture and no link.
 *   Then (2 Oct 2026) the link in the first message: the first e-mail of a lead
 *   whose demo is made starts With link and carries exactly one link, its own
 *   sample's, and goes through Open in Zoho Mail; a lead whose demo record is
 *   missing has With link off with the reason; a draft demo is put on the
 *   website BEFORE Zoho's compose page loads ("public on send"), and the
 *   follow-up after it points back to the link; on WhatsApp the switch starts
 *   Without link, With link swaps the picture for their sample's link, and the
 *   next lead starts on the version sent last; an open after a cold link leaves
 *   the lead Contacted; Settings takes only a Zoho Mail address.
 *
 * E-mail opens in Zoho Mail in the browser or in the mail app (2 Oct 2026;
 * Open in Gmail was removed 28 Sep 2026): no Gmail link or Gmail wording may
 * appear anywhere on the lead page or in Settings; the e-mail buttons are Open
 * in Zoho Mail (Zoho's compose page, mail.zoho.in/zm/comp.do), Open in mail
 * app (a mailto: link) and Copy e-mail text.
 *
 * Nothing leaves the machine: requests to mail.google.com, Zoho Mail, wa.me and
 * web.whatsapp.com are answered locally by the test, a mailto: click is
 * recorded and never handed to a mail app, the clipboard is recorded in the
 * page, and the URL the button would have opened is what gets checked. The run uses a fresh browser
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
/* A failure prints the claim and then what was found, so a detail never stands alone (as in e2e-crm.mjs). */
const check = (cond, okMsg, failMsg) => (cond ? pass(okMsg) : fail(failMsg && failMsg !== okMsg ? `${okMsg}: ${failMsg}` : okMsg));

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

/* Never reach a real mail service or WhatsApp. Record what would have opened. */
const opened = [];
for (const pattern of ["https://mail.google.com/**", "https://wa.me/**", "https://web.whatsapp.com/**", "https://api.whatsapp.com/**", "https://accounts.zoho.in/**", "https://accounts.zoho.com/**"]) {
  await context.route(pattern, (route) => {
    opened.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>intercepted by e2e-outreach</p>" });
  });
}
/* Zoho Mail's compose page (2 Oct 2026): recorded with the CMS status, AT THE MOMENT OF THE REQUEST, of the
   demo under test (zohoSlug), so "public before Zoho opens" is read from what the page had written by then. */
const zohoSeen = [];
let zohoSlug = "";
for (const pattern of ["https://mail.zoho.in/**", "https://mail.zoho.com/**"]) {
  await context.route(pattern, async (route) => {
    const url = route.request().url();
    opened.push(url);
    const status = zohoSlug
      ? await page.evaluate(([ck, slug]) => (JSON.parse(localStorage.getItem(ck) || "{}").demoSites || []).find((d) => d.slug === slug)?.status || "", [CMS_KEY, zohoSlug]).catch(() => "?")
      : "";
    zohoSeen.push({ url, status });
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>intercepted by e2e-outreach (Zoho Mail)</p>" });
  });
}
/* The Zoho link's ct parameter, decoded: the mailto: it carries. */
const zohoCt = (href) => {
  try {
    return new URL(href).searchParams.get("ct") || "";
  } catch {
    return "";
  }
};
/* That mailto: read the way Zoho's own parser reads it: the address before "?" as it is, each value decoded once. */
const zohoParts = (mailto) => {
  const rest = mailto.replace(/^mailto:/i, "");
  const q = rest.indexOf("?");
  const got = { to: q < 0 ? rest : rest.slice(0, q), subject: "", body: "" };
  for (const pair of (q < 0 ? "" : rest.slice(q + 1)).split("&").filter(Boolean)) {
    const i = pair.indexOf("=");
    got[(i < 0 ? pair : pair.slice(0, i)).toLowerCase()] = decodeURIComponent(i < 0 ? "" : pair.slice(i + 1));
  }
  return got;
};
/* Local mode only: nothing may reach Supabase or EmailJS. */
await context.route(/\.supabase\.co|api\.emailjs\.com/, (route) => route.abort());
/* PROVING THE STAGE, BLANK, CALL SCRIPT AND LINK CHECKS CAN FAIL (30 Sep and 2 Oct 2026):
     E2E_NEGATIVE=1 node scripts/e2e-outreach.mjs http://localhost:5451
   serves five modules broken in flight (no file is touched): a lead that said yes is no longer put
   on After they say yes, no [blank] is ever found in a message, the dental call script speaks to a
   customer instead of a patient, a send never writes the draft demo as sent (the write call becomes a
   comma expression, so the demo stays a draft), and With link never swaps the twin in. The checks on
   each must then fail, and the run exits 1. */
const NEGATIVE = Boolean(process.env.E2E_NEGATIVE);
const broken = new Set();
if (NEGATIVE) {
  const SABOTAGE = [
    ["stage", /\/src\/admin\/outreach\/stages\.ts/, /if \(lead\.status === "replied" \|\| lead\.status === "demo_opened"\) return \{\s*stage: stageFor\("after_yes"\)\s*\};/, ""],
    ["blanks", /\/src\/admin\/outreach\/placeholders\.ts/, /new RegExp\(PLACEHOLDER_RE\.source, "g"\)/, "/(?!)/g"],
    ["script", /\/src\/admin\/outreach\/callScript\.ts/, /viewer: "patient"/, 'viewer: "customer"'],
    ["publish", /\/src\/admin\/outreach\/useDemoLink\.ts/, /await markDemoSent\(/, "void ("],
    ["variant", /\/src\/lib\/outreach\/linkChoice\.ts/, /o\.withLink \? linkTwinOf\(picked\) : undefined/, "undefined"],
  ];
  for (const [tag, url, from, to] of SABOTAGE) {
    await context.route(url, async (route) => {
      const res = await route.fetch();
      const src = await res.text();
      const out = src.replace(from, to);
      if (out !== src) broken.add(tag);
      return route.fulfill({ response: res, body: out });
    });
  }
}
/* No hot reload during the run: another edit saved mid-run must not reload the page under the test. */
await context.addInitScript(() => {
  /* A mailto: click is recorded and stopped here (capture phase, before the browser would hand it to
     a mail app); React's own click handler still runs, so the send is still recorded. */
  window.__mailto = [];
  window.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="mailto:"]') : null;
    if (!a) return;
    window.__mailto.push(a.getAttribute("href"));
    e.preventDefault();
  }, true);
  /* The clipboard: record what the page copies. */
  window.__copied = [];
  if (window.Clipboard) Clipboard.prototype.writeText = function (t) { window.__copied.push(String(t)); return Promise.resolve(); };
  /* An image on the clipboard (Copy image under a first WhatsApp): each item's types and the size of each blob. */
  window.__copiedItems = [];
  if (window.Clipboard) Clipboard.prototype.write = async function (items) {
    for (const item of items) {
      const types = [...item.types];
      const sizes = [];
      for (const t of types) sizes.push((await item.getType(t)).size);
      window.__copiedItems.push({ types, sizes });
    }
  };
  /* The share sheet (Share under a first WhatsApp): record what would be shared; nothing leaves the page. */
  window.__shared = [];
  Object.defineProperty(navigator, "canShare", { configurable: true, value: (data) => Boolean(data && Array.isArray(data.files) && data.files.length) });
  Object.defineProperty(navigator, "share", { configurable: true, value: async (data) => {
    window.__shared.push({ text: data.text || "", files: (data.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })) });
  } });
  const Real = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (/localhost|127\.0\.0\.1/.test(String(url))) return { addEventListener() {}, removeEventListener() {}, send() {}, close() {}, readyState: 0 };
    return new Real(url, protocols);
  };
});
const page = await context.newPage();
context.on("page", async (p) => {
  if (p === page) return;
  // New tabs opened by the send links: note the URL, then close. A send that puts a draft demo on the
  // website first opens its tab blank and navigates it after the write (2 Oct 2026): wait for that, since
  // closing the tab while it is blank would cancel the send under test.
  await p.waitForURL((u) => u.href !== "about:blank", { timeout: 5000 }).catch(() => {});
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
/* Live by link, not sent: nothing has carried the link to the lead yet (crm-fixes-1004 item 2). */
await page.waitForFunction(() => /Live, not sent yet/.test(document.querySelector('[data-testid="linked-demo"]')?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
check(/Live, not sent yet/.test(await page.getByTestId("linked-demo").innerText()), "Mark sent puts the demo's link live, and it reads Live, not sent yet until a message carries it");

/* ── 3. Compose an email ───────────────────────────────────────────────── */
await compose.getByRole("tab", { name: /^email/i }).click();
await compose.getByLabel(/what you noticed/i).selectOption("no_website");
await page.waitForTimeout(300);
/* Every stage in plain words, in order; a new lead starts on First message, marked "now" (30 Sep 2026). */
const PLAIN = ["First message", "After they say yes", "Follow-up", "After the call", "Proposal", "Closing"];
const stageNames = (await compose.locator("[data-stage]").allInnerTexts()).map((t) => t.replace(/\s*now\s*$/i, "").trim());
check(JSON.stringify(stageNames) === JSON.stringify(PLAIN), "the Message step names every stage in plain words, in order", JSON.stringify(stageNames));
const pressedStage = () => compose.locator('[data-stage][aria-pressed="true"]').getAttribute("data-stage");
const nowStage = () => compose.locator('[data-stage][data-now="true"]').getAttribute("data-stage");
check((await pressedStage()) === "first" && (await nowStage()) === "first", "a new lead starts on First message, marked now", `${await pressedStage()} / ${await nowStage()}`);
check((await compose.getByTestId("template-list").first().locator('[aria-checked="true"]').getByTestId("suggested-tag").count()) === 1, "the message on screen is the one marked Suggested");
/* No Gmail link, button or "Open in Gmail" wording. Settings may NAME Gmail in its one help line
   (how to make Gmail in Chrome the mail app), so only the retired wording counts here. */
const noGmail = async (where) => {
  const links = await page.locator('a[href*="mail.google.com"]').count();
  const words = /open in gmail|gmail account|gmail compose/i.test(await page.locator("main").innerText().catch(() => ""));
  const btn = await page.getByTestId("open-gmail").count();
  check(!links && !words && !btn, `${where}: no Gmail link, button or wording`, `${where}: gmail links ${links}, wording ${words}, open-gmail ${btn}`);
};
/* The mailto: link as a URL: to, subject, body. */
const mailParts = (href) => {
  const u = new URL(href);
  return { to: decodeURIComponent(u.pathname), subject: u.searchParams.get("subject") || "", body: u.searchParams.get("body") || "" };
};
await noGmail("the lead page");
/* 2 Oct 2026 ("mail pe to first msz pe hi link send krwa do"): the first e-mail of a lead whose demo is made
   starts With link and carries exactly one link, the one step 1 shows. Its first button is Open in Zoho Mail
   ("ek option dedo open in zoho mail"); Open in mail app and Copy e-mail text stay beside it. */
const linkedUrl = ((await page.getByTestId("linked-demo").innerText()).match(/https?:\/\/\S+\/site\/[a-z0-9-]+/i) || [""])[0];
check((await compose.getByTestId("link-choice").count()) === 1 && (await compose.getByTestId("link-choice-with").getAttribute("aria-checked")) === "true",
  "the first e-mail shows the sample link switch, on With link", `${await compose.getByTestId("link-choice").count()} switch(es)`);
check(/E-mail always starts With link/.test(await compose.getByTestId("link-choice-hint").innerText().catch(() => "")), "and its hint says the e-mail always starts With link");
const mailOrder = await compose.locator('[data-testid="open-zoho"], [data-testid="open-mailto"], [data-testid="copy-email"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
check(JSON.stringify(mailOrder) === JSON.stringify(["open-zoho", "open-mailto", "copy-email"]), "the e-mail buttons are Open in Zoho Mail, Open in mail app and Copy e-mail text, in that order", JSON.stringify(mailOrder));
const zohoBtn = compose.getByTestId("open-zoho");
const mailBtn = compose.getByTestId("open-mailto");
const zohoHref = (await zohoBtn.getAttribute("href")) || "";
const mailHref = (await mailBtn.getAttribute("href")) || "";
if ((await zohoBtn.evaluate((el) => el.tagName)) !== "A" || (await mailBtn.evaluate((el) => el.tagName)) !== "A") {
  const blockers = await compose.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  fail("the e-mail buttons are disabled for a fresh lead with an email: " + blockers);
} else {
  const subjectOnScreen = await compose.locator("#msg-subject").inputValue();
  const bodyOnScreen = await compose.getByLabel("Message text").inputValue();
  check((await zohoBtn.innerText()).trim() === "Open in Zoho Mail", "the first e-mail button reads Open in Zoho Mail", "button text: " + (await zohoBtn.innerText()));
  check(zohoHref.startsWith("https://mail.zoho.in/zm/comp.do?ct="), "Open in Zoho Mail opens Zoho India's compose page", zohoHref.slice(0, 80));
  const zp = zohoParts(zohoCt(zohoHref));
  check(zohoCt(zohoHref).startsWith(`mailto:${LEAD.email}?`) && zp.to === LEAD.email && zp.subject === subjectOnScreen && zp.body === bodyOnScreen,
    "its ct is the mailto: of the lead's address, with the subject and the body on screen", zohoCt(zohoHref).slice(0, 120));
  check((await mailBtn.innerText()).trim() === "Open in mail app", "the mail app button still reads Open in mail app", "button text: " + (await mailBtn.innerText()));
  check(mailHref.startsWith("mailto:" + LEAD.email + "?"), "Open in mail app is a mailto: link to the lead", "bad mailto href: " + mailHref.slice(0, 80));
  const m = mailParts(mailHref);
  check(m.to === LEAD.email, "the mailto: link is addressed to the lead");
  check(m.subject.length > 3 && m.subject === subjectOnScreen, "the mailto: link carries the subject on screen", "subject: " + m.subject);
  check(m.body === bodyOnScreen, "the mailto: link carries the body on screen");
  check(/REMOVE/.test(m.body), "the email body carries the REMOVE opt-out line");
  check(/Mehdi Alam/.test(m.body), "the email body carries the signature");
  check(!/[–—]/.test(m.body + m.subject), "the email has no en or em dash");
  const mailUrls = `${m.subject}\n${m.body}`.match(/https?:\/\/\S+|www\.\S+/g) || [];
  check(Boolean(linkedUrl) && JSON.stringify(mailUrls) === JSON.stringify([linkedUrl]) && m.body.includes(`\n${linkedUrl}\n`),
    "With link carries the demo link: the first e-mail carries exactly one link, the sample's shown in step 1, on its own line", `${mailUrls.join(", ") || "no link"} | step 1: ${linkedUrl}`);
  const copyBtn = compose.getByTestId("copy-email");
  check((await copyBtn.count()) === 1 && /copy e-mail text/i.test(await copyBtn.innerText()), "a Copy e-mail text button sits beside them");
  await copyBtn.click();
  await page.waitForTimeout(200);
  const copied = await page.evaluate(() => window.__copied.at(-1) || "");
  check(copied === `Subject: ${m.subject}\n\n${m.body}`, "Copy e-mail text copies the subject and the body", "copied: " + copied.slice(0, 80));
  check((await page.getByTestId("long-mail-note").count()) === 0, "a short e-mail shows no long-link note");
  check(/also copies the text/.test(await compose.getByTestId("zoho-note").innerText().catch(() => "")), "a one-line note says Open in Zoho Mail also copies the text");
  /* The send goes through Zoho Mail. Open in mail app is checked as a link but not clicked: a second e-mail
     send would count twice on Today and move the lead's e-mail stage on. */
  const before = opened.length;
  await zohoBtn.click();
  await page.waitForTimeout(1500);
  const zohoOpened = opened.slice(before).find((x) => x.startsWith("https://mail.zoho.in/zm/comp.do"));
  check(Boolean(zohoOpened) && zohoCt(zohoOpened) === zohoCt(zohoHref), "clicking Open in Zoho Mail opens that compose page (intercepted), with the same e-mail", (zohoOpened || "nothing opened").slice(0, 80));
  check((await page.evaluate(() => window.__copied.at(-1) || "")) === bodyOnScreen, "and copies the body too, in case Zoho joins the lines");
  check(/text was copied too/i.test(await compose.getByTestId("zoho-note").innerText().catch(() => "")), "the note then says the text was copied too");
  check(!opened.some((x) => x.includes("mail.google.com")), "nothing opened Gmail");
}
await page.waitForTimeout(500);
await unfold(page, "status-details");
await unfold(page, "history-details");
const pipeText = await page.getByRole("radiogroup", { name: "Lead status" }).locator('[aria-checked="true"]').innerText();
check(/contacted/i.test(pipeText), "after the send the status is Contacted", "status after email send: " + pipeText);
const hist1 = await page.getByTestId("history").innerText();
check(/Email opened in Zoho Mail/i.test(hist1), "the history records the email send as opened in Zoho Mail", "history: " + hist1);
check(/Email opened in Zoho Mail \(First message\)/.test(hist1), "and names the stage it was sent at (First message)", "history: " + hist1);
check(/with their sample's link/.test(hist1), "and the version that went: the one with their sample's link", "history: " + hist1);
check((await page.locator("#lead-next").inputValue()) !== "", "a next follow-up date is set from the ladder");

/* ── 4. Compose a WhatsApp ─────────────────────────────────────────────── */
await compose.getByRole("tab", { name: /^whatsapp/i }).click();
await page.waitForTimeout(200);
check((await pressedStage()) === "first", "on WhatsApp, where nothing was sent yet, the lead is still at First message", String(await pressedStage()));
await compose.locator('[data-stage="first"]').click();
await page.waitForTimeout(300);
const wa = compose.getByTestId("open-whatsapp");
if ((await wa.evaluate((el) => el.tagName)) !== "A") {
  const blockers = await compose.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  fail("Open WhatsApp is disabled for the first message: " + blockers);
} else {
  const href = (await wa.getAttribute("href")) || "";
  check(href.startsWith(`https://wa.me/${LEAD.phoneDigits}?text=`), "Open WhatsApp is a wa.me link to the lead's number", "bad wa.me href: " + href);
  const text = decodeURIComponent(href.split("?text=")[1] || "");
  /* 1 Oct 2026: its one link is the school's picture page (WhatsApp draws it as a picture card); the sample's own link waits for a yes. */
  const waLinks = text.match(/https?:\/\/\S+|www\.\S+/g) || [];
  check(JSON.stringify(waLinks) === JSON.stringify(["https://www.ideovent.in/w/school"]) && !/\/site\//.test(text),
    "the first WhatsApp carries one link only, the school's picture page, and not the sample's link", "links: " + waLinks.join(", ") + " | " + text.slice(-200));
  check((await compose.getByTestId("creative").getAttribute("data-kind").catch(() => "")) === "school", "the school's picture shows under the message");
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
await compose.locator('[data-stage="after_yes"]').click();
await page.waitForTimeout(300);
check((await pressedStage()) === "after_yes" && /picked by you/.test(await compose.getByTestId("stage-now").innerText()), "picking After they say yes shows it, marked as picked by you", await compose.getByTestId("stage-now").innerText());

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
  /* 2 Oct 2026: the last link this lead got went in its first e-mail, so the open is not a yes. The lead stays
     Contacted; the history still says the demo was opened. */
  await page.goto(BASE + "/crm/leads/" + (await leadIdByName(LEAD.name)), { waitUntil: "domcontentloaded" });
  await page.getByTestId("lead-name").waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);
  await unfold(page, "status-details");
  await unfold(page, "history-details");
  const statusAfterOpen = await page.getByRole("radiogroup", { name: "Lead status" }).locator('[aria-checked="true"]').innerText().catch(() => "");
  const histAfterOpen = await page.getByTestId("history").innerText().catch(() => "");
  check(/contacted/i.test(statusAfterOpen) && /Demo opened/.test(histAfterOpen),
    "an open after a cold link leaves the lead Contacted (not Demo opened), and the history still has the Demo opened line", `status ${statusAfterOpen} | history ${histAfterOpen.slice(0, 200)}`);
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

/* ── 11. Settings: no Gmail field; an old saved Gmail account is harmless; no demo-open alert switch ── */
/* An OLD settings row still carries senderGmail (the retired "Gmail account for Open in Gmail") and the
   retired demo-open alert fields (1 Oct 2026: no e-mail is sent when a demo is opened, and the
   "Alert me when a lead opens their demo" switch and the alert e-mail box are gone from Settings). */
const OLD_ALERT_EMAIL = "old-alerts@riverbend-e2e.example";
await page.evaluate(([k, mail]) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.settings = { ...(d.settings || {}), senderGmail: "old-setting@gmail.example", alertOnDemoOpen: false, alertEmail: mail };
  localStorage.setItem(k, JSON.stringify(d));
}, [OUTREACH_KEY, OLD_ALERT_EMAIL]);
const cmsAlertsBefore = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").settings?.demoOpenAlerts, CMS_KEY);
await page.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
await page.locator("#set-sig").waitFor({ timeout: 10000 });
check((await page.locator("#set-gmail").count()) === 0, "Settings has no Gmail account field any more");
await noGmail("Settings");
const helpLine = (await page.getByTestId("mail-app-help").innerText().catch(() => "")).replace(/\s+/g, " ");
check(/default e-mail app/i.test(helpLine) && /Gmail or Zoho Mail/.test(helpLine) && /Chrome's default for e-mail links/.test(helpLine),
  "Settings says the mail app is the computer's default, and how to use Gmail or Zoho Mail in Chrome", helpLine || "no help line");
check(/Open in Zoho Mail/.test(helpLine) && /in this browser/.test(helpLine), "and that Open in Zoho Mail opens a new e-mail in Zoho Mail in this browser", helpLine || "no help line");
check(!/[–—]/.test(helpLine), "the help line has no en or em dash");
/* The Zoho Mail address (2 Oct 2026): Zoho India by default; only a Zoho Mail address is taken. */
const zohoField = page.getByTestId("set-zoho");
const saveBtn = page.getByRole("button", { name: /save settings/i });
check((await zohoField.inputValue().catch(() => "")) === "https://mail.zoho.in", "Settings shows the Zoho Mail address, https://mail.zoho.in by default", await zohoField.inputValue().catch(() => "no field"));
await zohoField.fill("https://evil.example");
await page.waitForTimeout(150);
check((await page.getByTestId("set-zoho-error").count()) === 1 && (await saveBtn.isDisabled()), "an address that is not Zoho Mail is refused, and Save stays off",
  `error shown ${await page.getByTestId("set-zoho-error").count()}, save disabled ${await saveBtn.isDisabled()}`);
check(!/[–—]/.test(await page.getByTestId("set-zoho-error").innerText().catch(() => "")), "that line has no en or em dash");
await zohoField.fill("mail.zoho.com");
await page.waitForTimeout(150);
check((await page.getByTestId("set-zoho-error").count()) === 0 && !(await saveBtn.isDisabled()), "another Zoho data centre, typed without https, is taken");
const alertControls = (await page.getByLabel(/alert me when a lead opens/i).count()) + (await page.getByText(/demo-open alerts/i).count());
check(alertControls === 0, "Settings has no demo-open alert switch or alert section any more", alertControls + " alert control(s) found");
const openNote = (await page.getByTestId("demo-open-note").innerText().catch(() => "")).replace(/\s+/g, " ");
check(/no e-mail is sent when a demo is opened/i.test(openNote) && /opens still show in the CRM/i.test(openNote),
  "Settings says no e-mail is sent when a demo is opened, and that opens still show in the CRM", openNote || "no demo-open note");
check(!/[–—]/.test(openNote), "the demo-open note has no en or em dash");
await page.getByRole("button", { name: /save settings/i }).click();
await page.getByRole("status").filter({ hasText: /saved/i }).waitFor({ timeout: 5000 }).catch(() => {});
check(await page.getByRole("status").filter({ hasText: /saved/i }).isVisible().catch(() => false), "Settings with an old Gmail account and old alert fields in them still save");
const keptSettings = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").settings || {}, OUTREACH_KEY);
check(keptSettings.alertOnDemoOpen === false && keptSettings.alertEmail === OLD_ALERT_EMAIL, "a save carries the old alert fields through untouched",
  JSON.stringify({ alertOnDemoOpen: keptSettings.alertOnDemoOpen, alertEmail: keptSettings.alertEmail }));
check(keptSettings.zohoMailUrl === "https://mail.zoho.com", "the Zoho address is saved as https://mail.zoho.com", JSON.stringify(keptSettings.zohoMailUrl));
const cmsAlertsAfter = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").settings?.demoOpenAlerts, CMS_KEY);
check(cmsAlertsAfter === cmsAlertsBefore, "saving Settings no longer writes the public settings.demoOpenAlerts flag", `before ${cmsAlertsBefore}, after ${cmsAlertsAfter}`);
await page.goto(BASE + "/crm/leads/" + (await leadIdByName(LEAD.name)), { waitUntil: "domcontentloaded" });
await page.getByTestId("lead-name").waitFor({ timeout: 10000 });
await unfold(page, "status-details");
await page.getByRole("radio", { name: "Contacted" }).click();
await page.getByTestId("compose").getByRole("tab", { name: /^email/i }).click();
await page.getByTestId("compose").locator('[data-stage="follow_up"]').click();
await page.waitForTimeout(300);
check((await page.getByTestId("compose").locator('[data-stage="follow_up"]').getAttribute("aria-pressed")) === "true", "the Follow-up stage opens with one tap");
check(/reply in the same thread/i.test(await page.getByTestId("thread-hint").innerText().catch(() => "")), "an e-mail follow-up says to send it as a reply in the same thread");
const fuHref = (await page.getByTestId("open-mailto").getAttribute("href").catch(() => "")) || "";
check(fuHref.startsWith("mailto:" + LEAD.email + "?") && !/authuser|mail\.google/.test(fuHref), "with an old Gmail account saved, the follow-up still opens as a plain mailto: to the lead", "href: " + fuHref.slice(0, 120) + " blockers: " + (await page.getByTestId("compose").locator('[aria-label="Blocked"]').innerText().catch(() => "none")));
const fuZoho = (await page.getByTestId("open-zoho").getAttribute("href").catch(() => "")) || "";
check(fuZoho.startsWith("https://mail.zoho.com/zm/comp.do?ct=") && zohoParts(zohoCt(fuZoho)).to === LEAD.email, "with mail.zoho.com saved, Open in Zoho Mail opens Zoho's compose page there", fuZoho.slice(0, 80));
check(/in Zoho Mail, press Reply there/.test(await page.getByTestId("thread-hint").innerText().catch(() => "")), "the thread hint says to reply in Zoho Mail");
const sendTo = await page.getByTestId("send-to").innerText();
const warnText = await page.getByTestId("compose").locator('[aria-label="Warnings"]').innerText().catch(() => "");
check(!/old-setting@gmail\.example/.test(sendTo) && !/free mailbox/i.test(warnText), "the old Gmail account shows nowhere (no from line, no free-mailbox warning)", `send-to: ${sendTo} | warnings: ${warnText}`);
await noGmail("the lead page with an old Gmail setting");
/* Back to Zoho India: a blank box saves the default. */
await page.goto(BASE + "/crm/settings", { waitUntil: "domcontentloaded" });
await page.getByTestId("set-zoho").waitFor({ timeout: 10000 });
await page.getByTestId("set-zoho").fill("");
await page.getByRole("button", { name: /save settings/i }).click();
await page.getByRole("status").filter({ hasText: /saved/i }).waitFor({ timeout: 5000 }).catch(() => {});
check((await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").settings?.zohoMailUrl, OUTREACH_KEY)) === "https://mail.zoho.in", "a blank Zoho address saves Zoho India, the default");

/* ── 12. Every lead's message is that lead's own (28 Sep 2026 bug) ──────
   Mehdi saw the name of the last of 30 imported leads in every
   lead's email. Six fictional leads, each with its own name, email, phone,
   demo and observation (a sentence naming the institute), are walked WITHOUT
   going back to the list in between (lead to lead in place, the way Next lead
   and the browser's back and forward move), after composing and editing on
   the first one. Each mailto: and WhatsApp link must decode to that lead's own
   name, address, number and observation, and never another lead's name or
   contact. These leads carry a demo link with no demo record behind it, so
   With link is off (the link would open a 404) and the first e-mail carries
   no link at all (2 Oct 2026). */
const WALK = ["Amberfield", "Bluestone", "Cedar Ridge", "Driftwood", "Elmhurst", "Foxglove"].map((n, i) => ({
  id: `ol_e2ewalk${i}`,
  instituteName: `${n} Public School E2E`,
  contactName: `Mrs. ${n}`,
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
const others = (lead) => WALK.filter((w) => w.id !== lead.id).flatMap((w) => [w.instituteName, w.contactName]);
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
  const g = c.getByTestId("open-mailto");
  const gHref = (await g.evaluate((el) => el.tagName)) === "A" ? (await g.getAttribute("href")) || "" : "";
  const gBlock = gHref ? "" : await c.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  const gu = gHref ? mailParts(gHref) : null;
  const su = gu?.subject || "";
  const gb = gu?.body || "";
  const mail = `${su}\n${gb}`;
  await c.getByRole("tab", { name: /^whatsapp/i }).click();
  await page.waitForTimeout(250);
  const w = c.getByTestId("open-whatsapp");
  const wHref = (await w.evaluate((el) => el.tagName)) === "A" ? (await w.getAttribute("href")) || "" : "";
  const wText = wHref ? decodeURIComponent(wHref.split("?text=")[1] || "") : "";
  const wBlock = wHref ? "" : await c.locator('[aria-label="Blocked"]').innerText().catch(() => "");
  if (i === 1) {
    /* 2 Oct 2026: a demo link with no demo record behind it would open a 404, so With link is off and says why. */
    const withBtn = c.getByTestId("link-choice-with");
    const reason = await c.getByTestId("link-choice-reason").innerText().catch(() => "");
    check((await withBtn.count()) === 1 && (await withBtn.isDisabled()) && /would open a 404/.test(reason) && reason.includes(`/site/${lead.demoSlug}`) &&
      (await c.getByTestId("link-choice-without").getAttribute("aria-checked")) === "true",
    "a lead whose demo link has no demo record: With link is off, Without link is on, and the reason says the link would open a 404", reason || "no reason shown");
  }
  const bad = [];
  if (!onScreen.includes(lead.instituteName)) bad.push(`screen shows "${onScreen}"`);
  if (!gu) bad.push("mail app blocked: " + gBlock.replace(/\n/g, " "));
  else {
    if (gu.to !== lead.email) bad.push(`mailto to=${gu.to}`);
    if (!su.includes(lead.instituteName)) bad.push(`subject "${su}"`);
    if (!gb.includes(lead.instituteName) && !su.includes(lead.instituteName)) bad.push("e-mail lacks own name");
    if (/https?:\/\/|\/site\//.test(gb)) bad.push("the first e-mail carries a link");
    if (!gb.includes(lead.observation)) bad.push("body lacks own observation");
    const foreign = others(lead).filter((n) => mail.includes(n));
    if (foreign.length) bad.push("email names " + foreign.join(", "));
    if (i > 0 && /EDITED-FOR-FIRST-LEAD/.test(mail)) bad.push("the first lead's manual edit leaked in");
    if (i === 0 && !/EDITED-FOR-FIRST-LEAD/.test(gb)) bad.push("the manual edit is not in the mailto: link");
  }
  if (!wHref) bad.push("WhatsApp blocked: " + wBlock.replace(/\n/g, " "));
  else {
    if (!wHref.startsWith(`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=`)) bad.push("wa.me number " + wHref.slice(0, 40));
    if (!wText.includes(lead.instituteName) && !wText.includes(lead.contactName)) bad.push("WhatsApp names neither its own institute nor its own contact");
    const foreign = others(lead).filter((n) => wText.includes(n));
    if (foreign.length) bad.push("WhatsApp names " + foreign.join(", "));
  }
  check(bad.length === 0, `lead ${i + 1} (${lead.instituteName}): mailto: and WhatsApp links are its own`, `lead ${i + 1} (${lead.instituteName}): ${bad.join("; ")}`);
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

/* ── 13. A dental clinic, end to end (28 Sep 2026) ──────────────────────
   Created in the new-lead form, given a d1..d7 demo on its page, composed
   with a dental template, then found by the Kind filter, the dashboard
   breakdown and the pipeline card. Screenshots at 1280 and 390 px. */
/* Fictional (the repo is public): "Kids" in the name is what points dentalTemplateFor at d6. */
const DENTAL = { name: "Example Kids Dental Clinic E2E", phone: "98765 43283", email: "hello@example-kids-dental-e2e.example", city: "Patna" };
/* The CRM scrolls inside <main>, so a full-page shot needs a viewport as tall as the content. */
async function tallShot(name, width) {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.waitForTimeout(300);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 1, `${name}: no sideways scroll at ${width} px`, `${name} overflows by ${over}px at ${width}`);
  if (!SHOT_DIR) return;
  const h = await page.evaluate(() => {
    const m = document.querySelector("main");
    return m ? Math.ceil(m.getBoundingClientRect().top + m.scrollHeight + 24) : document.documentElement.scrollHeight;
  });
  await page.setViewportSize({ width, height: Math.min(Math.max(h, 600), 7000) });
  await page.waitForTimeout(300);
  await shot(name);
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
}
await page.goto(BASE + "/crm/leads/new", { waitUntil: "domcontentloaded" });
// The new-lead page is its own chunk, and a dev server under load can take more than 10 s to serve it the
// first time (3 Oct 2026: one run timed out here with 0 failures before it): 30 s, as e2e-crm's PAGE_WAIT.
await page.locator("#lf-name").waitFor({ timeout: 30000 });
const kindLabels = (await page.getByTestId("lf-kind").locator("label").allInnerTexts()).map((t) => t.trim());
check(JSON.stringify(kindLabels) === JSON.stringify(["School", "Coaching", "Dental clinic", "Other"]), "the new-lead form offers School, Coaching, Dental clinic and Other", JSON.stringify(kindLabels));
await page.locator("#lf-name").fill(DENTAL.name);
await page.getByTestId("lf-kind-hint").waitFor({ timeout: 3000 }).catch(() => {});
check(await page.getByTestId("lf-kind-hint").isVisible().catch(() => false), "a dental name typed while the kind is still School offers Dental clinic");
await page.getByRole("button", { name: /set kind to dental clinic/i }).click();
check(await page.locator('input[name="lf-kind"][value="dental"]').isChecked(), "one tap sets the kind to Dental clinic");
check((await page.getByTestId("lf-kind-hint").count()) === 0, "and the hint goes away");
check((await page.getByLabel("Clinic name", { exact: true }).count()) === 1, "the name field reads Clinic name for a dental lead");
await page.getByLabel("City", { exact: true }).fill(DENTAL.city);
await page.getByLabel("Phone", { exact: true }).fill(DENTAL.phone);
await page.getByLabel("Email", { exact: true }).fill(DENTAL.email);
await tallShot("new-lead-dental-1280.png", 1280);
await tallShot("new-lead-dental-390.png", 390);
await page.setViewportSize({ width: 1280, height: 900 });
await page.getByRole("button", { name: /save and compose/i }).click();
await page.getByTestId("lead-name").waitFor({ timeout: 10000 });
const dentalId = await leadIdByName(DENTAL.name);
const readLead = (id) => page.evaluate(([k, lid]) => (JSON.parse(localStorage.getItem(k) || "{}").leads || []).find((l) => l.id === lid) || null, [OUTREACH_KEY, id]);
check((await readLead(dentalId))?.kind === "dental", "the dental lead is saved with kind dental", JSON.stringify((await readLead(dentalId))?.kind));
check(/Dental clinic/.test(await page.locator("main").innerText()), "the lead page names the kind Dental clinic");

/* Demo: only d1..d7, the kids' clinic starts on d6, and Create demo works as for a school. */
const dc = page.getByTestId("compose");
await dc.getByRole("tab", { name: /create demo/i }).click();
const dOpts = await dc.locator("#tpl-pick option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
check(dOpts.length === 7 && dOpts.every((v) => /^d[1-7]-/.test(v)), "a dental lead is offered exactly the seven dental templates, d1 to d7", JSON.stringify(dOpts));
const dPre = await dc.locator("#tpl-pick").inputValue();
check(dPre === "d6-kids-dental", "the kids' clinic starts on d6 (dentalTemplateFor on its name)", "preselected: " + dPre);
await dc.getByRole("button", { name: /create demo for/i }).click();
const ddlg = page.locator('[role="dialog"]');
await ddlg.waitFor({ timeout: 5000 });
check((await ddlg.locator("#dup-name").inputValue()) === DENTAL.name && (await ddlg.locator("#dup-city").inputValue()) === DENTAL.city, "the duplicate dialog is prefilled with the clinic's name and city");
await ddlg.getByRole("button", { name: /make the draft/i }).click();
await page.getByTestId("linked-demo").waitFor({ timeout: 15000 }).catch(() => {});
const dLinked = await page.getByTestId("linked-demo").innerText().catch(() => "");
check(/\/site\//.test(dLinked), "a demo made from d6 is linked to the dental lead", "linked: " + dLinked);
const dentalDemo = await page.evaluate(([ok, ck, id]) => {
  const l = (JSON.parse(localStorage.getItem(ok) || "{}").leads || []).find((x) => x.id === id);
  return (JSON.parse(localStorage.getItem(ck) || "{}").demoSites || []).find((d) => d.id === l?.demoId) || null;
}, [OUTREACH_KEY, CMS_KEY, dentalId]);
check(dentalDemo?.kind === "dental" && dentalDemo?.templateId === "d6-kids-dental", "the new demo is a dental demo made from d6", JSON.stringify({ kind: dentalDemo?.kind, templateId: dentalDemo?.templateId }));
await page.getByRole("button", { name: /mark sent to/i }).click().catch(() => {});
await page.waitForFunction(() => /Live, not sent yet/.test(document.querySelector('[data-testid="linked-demo"]')?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
check(/Live, not sent yet/.test(await page.getByTestId("linked-demo").innerText().catch(() => "")), "Mark sent puts the dental demo's link live (Live, not sent yet)");
/* Today, on the main site's /crm, the links out to the admin stay relative, exactly as before (only the
   CRM's own subdomain makes them absolute: e2e-crm.mjs checks that on crm.localhost). */
const openHref = (await dc.getByTestId("demo-open").getAttribute("href").catch(() => "")) || "";
check(openHref === `/site/${dentalDemo?.slug}?team=1` && (await dc.getByTestId("demo-open").getAttribute("target")) === "_blank",
  "on the main site the live demo's Open link is relative, a team preview (/site/<slug>?team=1: Mehdi's look never counts as an open), in a new tab", openHref);

/* Compose: a dental template, the mail app link, and the long-link copy. */
await dc.getByRole("tab", { name: /^email/i }).click();
await page.waitForTimeout(300);
const dTpl = (await dc.getByTestId("template-list").first().locator('[aria-checked="true"]').getAttribute("data-template-id").catch(() => "")) || "";
check(/dental/.test(dTpl), "the dental lead's first e-mail is a dental template", "selected template: " + (dTpl || "none"));
const dOffered = await dc.locator("[data-template-id]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-template-id")))]);
check(!dOffered.some((id) => /school|coaching/.test(id)), "no school or coaching template is offered to a dental lead", JSON.stringify(dOffered));
const dMailBtn = dc.getByTestId("open-mailto");
if ((await dMailBtn.evaluate((el) => el.tagName)) !== "A") {
  fail("Open in mail app is blocked for the dental lead: " + (await dc.locator('[aria-label="Blocked"]').innerText().catch(() => "")));
} else {
  const dm = mailParts((await dMailBtn.getAttribute("href")) || "");
  check(dm.to === DENTAL.email && dm.subject.length > 3 && dm.subject === (await dc.locator("#msg-subject").inputValue()), "the dental e-mail's mailto: carries the clinic's address and the subject on screen", JSON.stringify({ to: dm.to, subject: dm.subject }));
  check(dm.body.includes(DENTAL.name) || dm.subject.includes(DENTAL.name), "the dental e-mail names the clinic");
  check(!/\b(schools?|students?|admissions?|coaching)\b/i.test(dm.subject + " " + dm.body), "the dental e-mail says nothing about schools, students, admissions or coaching", (dm.subject + " | " + dm.body).slice(0, 200));
  check(!/[–—]/.test(dm.subject + dm.body), "the dental e-mail has no en or em dash");
  await tallShot("lead-dental-1280.png", 1280);
  await tallShot("lead-dental-390.png", 390);
  /* A mailto: link past about 1,900 characters: one short line, and the body is copied on open. */
  const longBody = dm.body + "\n\nP.S. " + "This line only makes the e2e e-mail long. ".repeat(50);
  await dc.getByLabel("Message text").fill(longBody);
  await page.waitForTimeout(250);
  const longHref = (await dMailBtn.getAttribute("href")) || "";
  const note = page.getByTestId("long-mail-note");
  check(longHref.length > 1900 && (await note.isVisible().catch(() => false)), "a mailto: link past 1,900 characters shows the one-line note", `href ${longHref.length} chars, note visible ${await note.isVisible().catch(() => false)}`);
  check(/full text/i.test(await note.innerText().catch(() => "")), "the note says opening it also copies the full text", await note.innerText().catch(() => "no note"));
  await dMailBtn.click();
  await page.waitForTimeout(600);
  const lastCopy = await page.evaluate(() => window.__copied.at(-1) || "");
  check(lastCopy === longBody, "opening the long e-mail also copies its full text (the body)", "copied: " + lastCopy.slice(0, 60));
  check(/full text was also copied/i.test(await note.innerText().catch(() => "")), "and the one short line then says the full text was also copied", await note.innerText().catch(() => "no note"));
  check(!/[–—]/.test(await note.innerText().catch(() => "")), "that line has no en or em dash");
  check((await page.evaluate(() => window.__mailto.at(-1) || "")) === longHref, "the click follows the long mailto: link");
}
await unfold(page, "history-details");
check(/Email opened in email app/.test(await page.getByTestId("history").innerText()), "the dental send is logged as Email opened in email app");
await noGmail("the dental lead page");

/* The first WhatsApp with the clinic's picture (1 Oct 2026): the picture link is the message's one link, and the
   picture itself shows under the text with Copy image, Share and Download, each with its one-line hint. */
await page.setViewportSize({ width: 1280, height: 900 });
await dc.getByRole("tab", { name: /^whatsapp/i }).click();
await page.waitForTimeout(300);
await dc.locator('[data-stage="first"]').click();
await page.waitForTimeout(400);
const pic = dc.getByTestId("creative");
check((await pic.count()) === 1 && (await pic.getAttribute("data-kind")) === "dental", "a dental lead's first WhatsApp shows the clinic's picture under the message", `${await pic.count()} picture card(s)`);
const picImg = dc.getByTestId("creative-image");
await picImg.evaluate((el) => (el.complete ? null : new Promise((r) => { el.onload = r; el.onerror = r; }))).catch(() => {});
const picInfo = await picImg.evaluate((el) => ({ src: el.getAttribute("src"), w: el.naturalWidth, h: el.naturalHeight, alt: el.alt })).catch(() => null);
check(picInfo?.src === "/w/dental.jpg" && picInfo.w === 1200 && picInfo.h === 1097 && /dental clinic/.test(picInfo.alt), "the picture is /w/dental.jpg, loaded at 1200 by 1097, with a description for a screen reader", JSON.stringify(picInfo));
for (const [id, name] of [["creative-copy", /copy image/i], ["creative-share", /share/i], ["creative-download", /download/i]]) {
  const hint = (await dc.getByTestId(`${id}-hint`).innerText().catch(() => "")).trim();
  check((await dc.getByTestId(id).count()) === 1 && name.test(await dc.getByTestId(id).innerText()) && hint.length > 15 && !/\n/.test(hint) && !/[–—]/.test(hint),
    `${id.replace("creative-", "")}: the button is there with its one-line hint`, hint || "no hint");
}
const dWa = dc.getByTestId("open-whatsapp");
if ((await dWa.evaluate((el) => el.tagName)) !== "A") {
  fail("Open in WhatsApp is blocked for the dental lead: " + (await dc.locator('[aria-label="Blocked"]').innerText().catch(() => "")));
} else {
  const dHref = (await dWa.getAttribute("href")) || "";
  const dText = new URL(dHref).searchParams.get("text") || "";
  const dLinks = dText.match(/https?:\/\/\S+|www\.\S+/g) || [];
  check(dHref.startsWith("https://wa.me/919876543283?text=") && dHref.includes(encodeURIComponent("https://www.ideovent.in/w/dental")) && JSON.stringify(dLinks) === JSON.stringify(["https://www.ideovent.in/w/dental"]),
    "the wa.me href carries the clinic's picture page, its one link", `${dHref.slice(0, 60)} | ${dLinks.join(", ")}`);
  check(/\n\n(A quick look|Ek jhalak yahan dekhiye): https:\/\/www\.ideovent\.in\/w\/dental\n\n[^\n]*sample[^\n]*\?\n[^\n]+$/.test(dText), "the picture link is a part of its own, just before the ask for their sample's link", dText.slice(-220));
}
await dc.getByTestId("creative-copy").click();
await page.waitForFunction(() => window.__copiedItems.length > 0, null, { timeout: 10000 }).catch(() => {});
const copiedPic = await page.evaluate(() => window.__copiedItems.at(-1) || null);
check(Boolean(copiedPic) && copiedPic.types.includes("image/png") && copiedPic.sizes[0] > 100000, "Copy image puts the picture on the clipboard as a PNG", JSON.stringify(copiedPic));
check(/Ctrl\+V/.test(await dc.getByTestId("creative-status").innerText().catch(() => "")), "and says to press Ctrl+V in the WhatsApp chat");
const dl = dc.getByTestId("creative-download");
check((await dl.getAttribute("href")) === "/w/dental.jpg" && /\.jpg$/.test((await dl.getAttribute("download")) || ""), "Download saves the clinic's JPEG", `${await dl.getAttribute("href")} ${await dl.getAttribute("download")}`);
await page.waitForFunction(() => document.querySelector('[data-testid="creative-share"]')?.disabled === false, null, { timeout: 10000 }).catch(() => {});
await dc.getByTestId("creative-share").click();
await page.waitForFunction(() => window.__shared.length > 0, null, { timeout: 5000 }).catch(() => {});
const shared = await page.evaluate(() => window.__shared.at(-1) || null);
const dOnScreen = await dc.getByLabel("Message text").inputValue();
check(Boolean(shared) && shared.files.length === 1 && shared.files[0].type === "image/jpeg" && shared.files[0].size > 100000 && shared.text === dOnScreen,
  "Share hands over the picture and the message on screen together", JSON.stringify(shared && { files: shared.files, text: shared.text.slice(0, 50) }));
await page.waitForTimeout(400);
check(/WhatsApp opened in the share sheet \(First message\)/.test(await page.getByTestId("history").innerText()), "a share is recorded as the first WhatsApp sent");
await tallShot("lead-dental-whatsapp-1280.png", 1280);
await tallShot("lead-dental-whatsapp-390.png", 390);

/* Leads table: the Kind filter; dashboard breakdown; pipeline card. */
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(BASE + "/crm/leads?view=all", { waitUntil: "domcontentloaded" });
await page.locator('table[aria-label="Leads"] tbody tr').first().waitFor({ timeout: 10000 });
check((await page.locator('select[aria-label="Kind"] option').allInnerTexts()).includes("Dental clinic"), "the Leads Kind filter lists Dental clinic");
await page.locator('select[aria-label="Kind"]').selectOption("dental");
await page.waitForTimeout(400);
const dRows = await page.locator('table[aria-label="Leads"] tbody tr').allInnerTexts();
check(dRows.length === 1 && dRows[0].includes(DENTAL.name) && /kind=dental/.test(page.url()), "Kind = Dental clinic lists only the dental lead, and the filter is in the URL", `${dRows.length} rows, ${page.url()}`);
await page.goto(BASE + "/crm", { waitUntil: "domcontentloaded" });
await page.getByTestId("breakdown").waitFor({ timeout: 10000 });
await page.getByTestId("breakdown").getByRole("tab", { name: "Kind" }).click();
await page.waitForTimeout(300);
check(/Dental clinic/.test(await page.getByTestId("breakdown").innerText()), "the dashboard breakdown by kind has a Dental clinic row");
await page.goto(BASE + "/crm/pipeline", { waitUntil: "domcontentloaded" });
await page.locator(`[data-card="${dentalId}"]`).waitFor({ timeout: 10000 }).catch(() => {});
check(/Dental clinic/.test(await page.locator(`[data-card="${dentalId}"]`).innerText().catch(() => "")), "the dental lead's pipeline card says Dental clinic");

/* Import: the dental CSV contract reaches the preview (a DENTAL_ segment, a "dentist" type, a dental name). */
await page.goto(BASE + "/crm/import", { waitUntil: "domcontentloaded" });
await page.locator("#csv-text").waitFor({ timeout: 10000 });
await page.locator("#csv-text").fill([
  "name,phone,city,segment,type",
  "Example Tooth Care E2E,9876543201,Patna,DENTAL_SINGLE,",
  "Example Family Care E2E,9876543202,Gaya,,dentist",
  "Example Dental Clinic E2E,9876543203,Ranchi,,",
  "Example Public School E2E,9876543204,Patna,SCHOOL_CBSE,",
].join("\n"));
await page.waitForTimeout(400);
const previewRows = await page.getByTestId("import-preview").locator("li").allInnerTexts().catch(() => []);
/* A preview row reads "Row 2 New <name> · <kind> · <city> · <phone>": the kind is the part after the name. */
const kindOf = (n) => ((previewRows.find((t) => t.includes(n)) || "").replace(/\s+/g, " ").split(" · ")[1] || "?").trim();
check(["Example Tooth Care E2E", "Example Family Care E2E", "Example Dental Clinic E2E"].every((n) => kindOf(n) === "Dental clinic") && kindOf("Example Public School E2E") === "School",
  "the import preview reads a DENTAL_ segment, a dentist type and a dental name as Dental clinic", JSON.stringify(previewRows.map((t) => t.replace(/\s+/g, " ").slice(0, 70))));
await page.locator("#csv-text").fill("");

/* ── 14. Every stage, blanks that block, the call script (30 Sep 2026) ──
   Mehdi approved the wording for every stage. Fictional leads at six points
   of the ladder: each lead page starts on its own stage, named in plain words.
   WhatsApp has one follow-up and then says to stop. The after-call summary's
   [blanks] are highlighted in the text, keep Send off, and go into the text
   from the boxes under it. The Call script card is worded for the lead's kind
   and walks the approved seven steps; its Call done moves the message on. */
await page.setViewportSize({ width: 1440, height: 1000 });
const STAGED = [
  { id: "ol_e2estage0", status: "new", kind: "dental", want: "first", contactName: "Dr. Kapoor" },
  { id: "ol_e2estage1", status: "replied", kind: "school", want: "after_yes" },
  { id: "ol_e2estage2", status: "contacted", kind: "coaching", want: "follow_up", sends: ["email"] },
  { id: "ol_e2estage3", status: "call", kind: "dental", want: "after_call" },
  { id: "ol_e2estage4", status: "proposal", kind: "school", want: "proposal" },
  { id: "ol_e2estage5", status: "contacted", kind: "school", want: "follow_up", sends: ["whatsapp", "whatsapp"] },
].map((s, i) => ({
  ...s,
  lead: {
    id: s.id, status: s.status, kind: s.kind, contactName: s.contactName, city: "Patna",
    instituteName: `Example Stage ${["Tooth", "Maple", "Apex", "Smile", "Cedar", "Birch"][i]} ${s.kind === "dental" ? "Dental Clinic" : s.kind === "school" ? "School" : "Classes"} E2E`,
    // The new dental lead has no demo at all, so its script and first message may only offer to make one.
    phone: `+9198100700${10 + i}`, email: `stage${i}@example-stage-e2e.example`, demoSlug: i === 0 ? undefined : `example-stage-${i}-e2e`,
    createdAt: new Date(Date.now() - 9 * 864e5).toISOString(), updatedAt: new Date().toISOString(),
    ...(s.status === "new" ? {} : { lastContactedAt: new Date(Date.now() - 5 * 864e5).toISOString() }),
  },
}));
await page.evaluate(([k, staged]) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.leads = [...(d.leads || []).filter((l) => !String(l.id).startsWith("ol_e2estage")), ...staged.map((s) => s.lead)];
  const sent = staged.flatMap((s) => (s.sends || []).map((ch, n) => ({
    id: `oe_${s.id}_${n}`, leadId: s.id, type: "sent", channel: ch, detail: "seeded send",
    at: new Date(Date.now() - (6 - n) * 864e5).toISOString(),
  })));
  d.events = [...(d.events || []).filter((e) => !String(e.leadId).startsWith("ol_e2estage")), ...sent];
  localStorage.setItem(k, JSON.stringify(d));
}, [OUTREACH_KEY, STAGED]);
const openStaged = async (s) => {
  await page.goto(BASE + "/crm/leads/" + s.id, { waitUntil: "domcontentloaded" });
  await page.getByTestId("lead-name").waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  return page.getByTestId("compose");
};
for (const s of STAGED) {
  const c = await openStaged(s);
  const on = await c.locator('[data-stage][aria-pressed="true"]').getAttribute("data-stage");
  const now = await c.locator('[data-stage][data-now="true"]').getAttribute("data-stage");
  const heading = await c.getByTestId("stage-now").innerText();
  check(on === s.want && now === s.want && /where this lead is now/.test(heading),
    `a ${s.status} ${s.kind} lead opens on ${PLAIN[["first", "after_yes", "follow_up", "after_call", "proposal", "closing"].indexOf(s.want)]}`,
    `pressed ${on}, now ${now}, heading "${heading}"`);
  check(!/[–—]/.test(await c.getByTestId("stage-hint").innerText()), `${s.id}: the stage's one-line hint has no dash`);
}
{
  /* The picture (1 Oct 2026). A clinic with no demo yet is offered the message that offers to make one: no
     picture, since the picture says the sample is already built, and a line that says so; no link at all.
     Any other business has no picture of its own: no picture and no line. */
  const c = await openStaged(STAGED[0]);
  await c.getByRole("tab", { name: /^whatsapp/i }).click();
  await page.waitForTimeout(300);
  const tpl = (await c.getByTestId("template-list").first().locator('[aria-checked="true"]').getAttribute("data-template-id").catch(() => "")) || "";
  const why = await c.getByTestId("creative-none").innerText().catch(() => "");
  check(/^wa_first_new_dental_\w+_offer$/.test(tpl) && (await c.getByTestId("creative").count()) === 0 && /already built/.test(why),
    "a clinic with no demo yet gets the message that offers one, with no picture and a line saying why", `${tpl}, ${await c.getByTestId("creative").count()} card(s), "${why}"`);
  const offerHref = (await c.getByTestId("open-whatsapp").getAttribute("href")) || "";
  check(offerHref.startsWith("https://wa.me/") && !/https?:\/\/|www\./.test(new URL(offerHref).searchParams.get("text") || ""), "and that WhatsApp carries no link at all", offerHref.slice(0, 80));
  const other = {
    id: "ol_e2estage_other", status: "new", kind: "other", contactName: "Mrs. Rao", city: "Patna", instituteName: "Example Stage Yoga Studio E2E",
    phone: "+919810070099", email: "other@example-stage-e2e.example", demoSlug: "example-stage-other-e2e",
    createdAt: new Date(Date.now() - 864e5).toISOString(), updatedAt: new Date().toISOString(),
  };
  await page.evaluate(([k, lead]) => {
    const d = JSON.parse(localStorage.getItem(k) || "{}");
    d.leads = [...(d.leads || []).filter((l) => l.id !== lead.id), lead];
    localStorage.setItem(k, JSON.stringify(d));
  }, [OUTREACH_KEY, other]);
  const o = await openStaged(other);
  await o.getByRole("tab", { name: /^whatsapp/i }).click();
  await page.waitForTimeout(300);
  const oHref = (await o.getByTestId("open-whatsapp").getAttribute("href").catch(() => "")) || "";
  check((await o.getByTestId("creative").count()) === 0 && (await o.getByTestId("creative-none").count()) === 0 && oHref.startsWith("https://wa.me/") && !/https?:\/\/|www\./.test(new URL(oHref).searchParams.get("text") || ""),
    "any other business: no picture, no picture line and no link in its first WhatsApp", `${await o.getByTestId("creative").count()} card(s), ${oHref.slice(0, 60)}`);
}
{
  /* WhatsApp: the first message and the one follow-up have gone, so the screen says to stop there. */
  const c = await openStaged(STAGED[5]);
  const done = await c.getByTestId("stage-done").innerText().catch(() => "");
  check(/nothing more on WhatsApp/i.test(done), "after the first WhatsApp and its one follow-up, the lead page says to send nothing more on WhatsApp", done || "no stop note");
  check((await c.getByTestId("open-whatsapp").evaluate((el) => el.tagName)) === "BUTTON" && /nothing more on WhatsApp/i.test(await c.locator('[aria-label="Blocked"]').innerText().catch(() => "")),
    "and a third unanswered WhatsApp cannot be sent", await c.locator('[aria-label="Blocked"]').innerText().catch(() => "not blocked"));
  await c.locator('[data-stage="closing"]').click();
  await page.waitForTimeout(250);
  const closingHint = await c.getByTestId("stage-hint").innerText();
  check((await c.getByTestId("open-whatsapp").evaluate((el) => el.tagName)) === "BUTTON" && /already the last/i.test(closingHint),
    "WhatsApp has no closing message: the stage says the one follow-up was the last, and Send stays off", closingHint);
}
{
  /* [Blanks]: the after-call summary is found on either channel, highlighted, blocking, then filled. */
  const c = await openStaged(STAGED[3]);
  const sendEl = () => c.locator('[data-testid="open-whatsapp"], [data-testid="open-mailto"]').first();
  let found = "";
  for (const tab of [/^whatsapp/i, /^email/i]) {
    await c.getByRole("tab", { name: tab }).click();
    await page.waitForTimeout(250);
    if ((await c.locator("details").filter({ has: page.locator("summary", { hasText: "More templates" }) }).count()) > 0) await unfold(c, "More templates");
    const ids = await c.locator("[data-template-id]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-template-id")))]);
    for (const id of ids) {
      await c.locator(`[data-template-id="${id}"]`).first().click();
      await page.waitForTimeout(150);
      if (await c.getByTestId("fill-blanks").count()) { found = id; break; }
    }
    if (found) break;
  }
  if (!found) fail("no After the call message has a [blank] to fill (the approved summary carries [package and price] and [date])");
  else {
    const names = await c.locator("[data-blank]").evaluateAll((els) => els.map((e) => e.getAttribute("data-blank")));
    const marks = await c.locator('[data-testid="message-marks"] mark[data-mark="blank"]').count();
    check(names.length >= 1 && marks >= names.length, `${found}: every [blank] is highlighted in the text (${names.map((n) => `[${n}]`).join(" ")})`, `${marks} marks for ${names.length} blanks`);
    check((await sendEl().evaluate((el) => el.tagName)) === "BUTTON" && /Fill in \[/.test(await c.locator('[aria-label="Blocked"]').innerText().catch(() => "")),
      "while a blank is empty, Send is off and the reason says which blank to fill");
    for (const [i, n] of names.entries()) await c.locator(`[data-blank="${n}"]`).fill(`E2E-FILL-${i}`);
    await page.waitForTimeout(250);
    const filled = await c.getByLabel("Message text").inputValue();
    check(names.every((_, i) => filled.includes(`E2E-FILL-${i}`)) && !/\[[^\]\n]+\]/.test(filled), "what is typed in the boxes goes into the text, and no blank is left", filled.slice(-160));
    check(!/Fill in \[/.test(await c.locator('[aria-label="Blocked"]').innerText().catch(() => "")), "once every blank is filled, the blank no longer blocks Send");
    check((await c.locator('[data-testid="message-marks"] mark[data-mark="filled"]').count()) >= names.length, "the filled values stay marked in the text");
    if ((await sendEl().evaluate((el) => el.tagName)) === "A") {
      const href = decodeURIComponent((await sendEl().getAttribute("href")) || "");
      check(names.every((_, i) => href.includes(`E2E-FILL-${i}`)) && !/\[[^\]\n]+\]/.test(href), "and the link that opens the message carries the filled text");
    } else pass("send stays off for another reason: " + (await c.locator('[aria-label="Blocked"]').innerText().catch(() => "")).replace(/\n/g, " "));
    await c.getByLabel("Message text").fill(filled + "\nE2E edit after filling.");
    await page.waitForTimeout(200);
    const edited = await c.getByLabel("Message text").inputValue();
    check(names.every((_, i) => edited.includes(`E2E-FILL-${i}`)) && (await c.getByTestId("fill-blanks").count()) === 0, "an edit after filling keeps the filled values in the text");
    await c.getByLabel("Message text").fill(edited + " [time]");
    await page.waitForTimeout(200);
    check((await c.locator('[data-blank="time"]').count()) === 1 && /Fill in \[time\]/.test(await c.locator('[aria-label="Blocked"]').innerText().catch(() => "")), "a blank typed by hand is caught the same way");
  }
}
{
  /* The call script: folded for a new lead, worded for a patient, seven steps, honest with no demo, Hinglish. */
  await openStaged(STAGED[0]);
  const cs = page.getByTestId("call-script");
  check(!(await cs.evaluate((d) => d.open)), "the Call script card is folded while no call is due");
  check(/patient/.test(await page.getByTestId("call-script-for").innerText()), "for a dental clinic it is worded as a patient sees it");
  await cs.locator("summary").click();
  const steps = await cs.locator("[data-step]").evaluateAll((els) => els.map((e) => e.getAttribute("data-step")));
  check(steps.join(",") === "problem,cost,fix,trust,price,next,summary", "the card walks the approved seven steps in order", steps.join(","));
  const qs = await cs.getByTestId("call-questions").locator("li").count();
  check(qs >= 4 && qs <= 5, `it gives 4 to 5 questions to ask (${qs})`);
  const text = await cs.innerText();
  check(/Rs 12,000/.test(text) && /Rs 18,000/.test(text) && /Rs 25,000/.test(text) && /50% advance, 50% at launch/.test(text), "the price step gives the /pricing options (the Website band since 1 Oct 2026) and the approved payment terms");
  check(!/[–—]/.test(text) && !/\bfree\b|guarantee/i.test(text), "the card has no dash and no hype word");
  check(/Dr\. Kapoor/.test(text) && /would like to make a short sample page/.test(text) && !/I made a sample website/.test(text), "it greets their own contact and, with no demo made, never says a sample exists");
  await cs.getByRole("button", { name: "Hinglish" }).click();
  check(/Namaste Dr\. Kapoor ji/.test(await cs.innerText()), "the Hinglish switch gives the spoken lines in Hinglish");
  await openStaged(STAGED[2]);
  check(/student/.test(await page.getByTestId("call-script-for").innerText()), "for a coaching institute it is worded as a student sees it");
  await openStaged(STAGED[1]);
  const cs1 = page.getByTestId("call-script");
  check(await cs1.evaluate((d) => d.open), "the card opens by itself when a call is next (the lead said yes)");
  check(/parent/.test(await page.getByTestId("call-script-for").innerText()), "for a school it is worded as a parent sees it");
  await tallShot("lead-callscript-1440.png", 1440);
  await tallShot("lead-callscript-390.png", 390);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await cs1.getByTestId("call-done").click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(([k, id]) => {
    const d = JSON.parse(localStorage.getItem(k) || "{}");
    return { status: (d.leads || []).find((l) => l.id === id)?.status, call: (d.events || []).some((e) => e.leadId === id && e.type === "call") };
  }, [OUTREACH_KEY, STAGED[1].id]);
  check(after.status === "call" && after.call, "Call done in the card logs the call and sets the status to Call", JSON.stringify(after));
  check((await page.getByTestId("compose").locator('[data-stage][aria-pressed="true"]').getAttribute("data-stage")) === "after_call", "and the message box moves to After the call");
}
await page.evaluate((k) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.leads = (d.leads || []).filter((l) => !String(l.id).startsWith("ol_e2estage"));
  d.events = (d.events || []).filter((e) => !String(e.leadId).startsWith("ol_e2estage"));
  localStorage.setItem(k, JSON.stringify(d));
}, OUTREACH_KEY);

/* ── 15. Public on send (2 Oct 2026) ──────────────────────────────────────
   A fresh school lead whose demo, made from a template, is NOT marked sent. Its first e-mail carries the
   demo's link, so Open in Zoho Mail first puts the demo on the website (the same writes as Mark sent) and
   only then lets Zoho's compose page load: the Zoho request must find the demo already sent. Then the
   e-mail follow-up after it points back to the link and never offers it again. */
const extraDemoIds = [];
await page.setViewportSize({ width: 1280, height: 900 });
const PUB = {
  id: "ol_e2epublish", instituteName: "Example Publish Public School E2E", kind: "school", status: "new", city: "Patna",
  contactName: "Mrs. Publish", email: "office@example-publish-e2e.example", phone: "+919810080011",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};
await page.evaluate(([k, lead]) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.leads = [...(d.leads || []).filter((l) => l.id !== lead.id), lead];
  localStorage.setItem(k, JSON.stringify(d));
}, [OUTREACH_KEY, PUB]);
await page.goto(BASE + "/crm/leads/" + PUB.id, { waitUntil: "domcontentloaded" });
await page.getByTestId("lead-name").waitFor({ timeout: 15000 });
{
  const pc = page.getByTestId("compose");
  await pc.getByRole("tab", { name: /create demo/i }).click();
  const pTpl = await pc.locator("#tpl-pick option").nth(1).getAttribute("value");
  await pc.locator("#tpl-pick").selectOption(pTpl);
  await pc.getByRole("button", { name: /create demo for/i }).click();
  const pdlg = page.locator('[role="dialog"]');
  await pdlg.waitFor({ timeout: 5000 });
  await pdlg.getByRole("button", { name: /make the draft/i }).click();
  await page.getByTestId("linked-demo").waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  const pubDemo = await page.evaluate(([ok, ck, id]) => {
    const l = (JSON.parse(localStorage.getItem(ok) || "{}").leads || []).find((x) => x.id === id);
    return (JSON.parse(localStorage.getItem(ck) || "{}").demoSites || []).find((d) => d.id === l?.demoId) || null;
  }, [OUTREACH_KEY, CMS_KEY, PUB.id]);
  if (pubDemo?.id) extraDemoIds.push(pubDemo.id);
  zohoSlug = pubDemo?.slug || "";
  check(pubDemo?.status === "draft" && /draft: link shows a 404 until marked sent/.test(await page.getByTestId("linked-demo").innerText().catch(() => "")),
    "public on send: the demo made from a template is a draft, and step 1 says its link shows a 404 until marked sent", JSON.stringify({ status: pubDemo?.status, slug: pubDemo?.slug }));
  await pc.getByRole("tab", { name: /^email/i }).click();
  await page.waitForTimeout(400);
  const pubNote = await pc.getByTestId("publish-note").innerText().catch(() => "");
  check(/still a draft/.test(pubNote) && /Open in Zoho Mail/.test(pubNote) && /same as Mark sent/.test(pubNote) && !/[–—]/.test(pubNote),
    "the first e-mail with the draft demo's link says the send puts the demo on the website first, the same as Mark sent", pubNote || "no note");
  await tallShot("lead-public-on-send-1280.png", 1280);
  await tallShot("lead-public-on-send-390.png", 390);
  await page.setViewportSize({ width: 1280, height: 900 });
  const pZoho = pc.getByTestId("open-zoho");
  if ((await pZoho.evaluate((el) => el.tagName)) !== "A") {
    fail("Open in Zoho Mail is blocked on the draft demo's first e-mail: " + (await pc.locator('[aria-label="Blocked"]').innerText().catch(() => "")));
  } else {
    const pBody = zohoParts(zohoCt((await pZoho.getAttribute("href")) || "")).body;
    check(Boolean(zohoSlug) && pBody.includes(`/site/${zohoSlug}\n`), "and that e-mail carries the draft demo's own link", pBody.slice(0, 160));
    // Closed in another tab after this page read it (3 Oct 2026): the send reads the demo again, so it puts nothing
    // on the website, opens nothing, records nothing and says why.
    const setPubStatus = (status) => page.evaluate(([ck, id, st]) => {
      const d = JSON.parse(localStorage.getItem(ck) || "{}");
      d.demoSites = (d.demoSites || []).map((s) => (s.id === id ? { ...s, status: st } : s));
      localStorage.setItem(ck, JSON.stringify(d));
    }, [CMS_KEY, pubDemo?.id, status]);
    await setPubStatus("closed");
    const zohoBeforeClosed = zohoSeen.length;
    await pZoho.click();
    await page.getByTestId("publish-error").waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    const closedMsg = await page.getByTestId("publish-error").innerText().catch(() => "");
    const closedNow = await page.evaluate(([ok, ck, lid, did]) => ({
      status: (JSON.parse(localStorage.getItem(ck) || "{}").demoSites || []).find((d) => d.id === did)?.status || "",
      written: (JSON.parse(localStorage.getItem(ok) || "{}").events || []).filter((e) => e.leadId === lid && (e.type === "sent" || /marked sent/.test(e.detail || ""))).length,
    }), [OUTREACH_KEY, CMS_KEY, PUB.id, pubDemo?.id]);
    check(/changed since this page loaded/.test(closedMsg) && /closed/i.test(closedMsg) && closedNow.status === "closed" && closedNow.written === 0 && zohoSeen.length === zohoBeforeClosed,
      "a demo closed in another tab after the page loaded: the send reads it again, puts nothing on the website, opens and records nothing, and says why",
      JSON.stringify({ closedMsg, ...closedNow, zoho: zohoSeen.length - zohoBeforeClosed }));
    // A draft again, as it was; the page reads the demos again (it sees an edit made elsewhere only on a new read).
    await setPubStatus("draft");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("lead-name").waitFor({ timeout: 15000 });
    await pc.getByRole("tab", { name: /^email/i }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="open-zoho"]')?.tagName === "A", null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    // Edit demo opens in another tab (3 Oct 2026): an edit saved there after this page read the demo must survive
    // the send, so the send writes the demo as it is now, not this page's older copy.
    await page.evaluate(([ck, id]) => {
      const d = JSON.parse(localStorage.getItem(ck) || "{}");
      d.demoSites = (d.demoSites || []).map((s) => (s.id === id ? { ...s, tagline: "Edited in another tab E2E" } : s));
      localStorage.setItem(ck, JSON.stringify(d));
    }, [CMS_KEY, pubDemo?.id]);
    const seenBefore = zohoSeen.length;
    await pZoho.click();
    await page.waitForFunction(() => /link is live/i.test(document.querySelector('[data-testid="linked-demo"]')?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const hit = zohoSeen.slice(seenBefore).find((z) => z.url.startsWith("https://mail.zoho.in/zm/comp.do"));
    check(Boolean(hit) && hit.status === "sent", "public before Zoho opens: Zoho's compose page was requested with the demo already sent", JSON.stringify(hit || "Zoho never opened"));
    check(/link is live/i.test(await page.getByTestId("linked-demo").innerText().catch(() => "")), "afterwards step 1 says Sent: link is live");
    const pubNow = await page.evaluate(([ck, id]) => (JSON.parse(localStorage.getItem(ck) || "{}").demoSites || []).find((d) => d.id === id) || null, [CMS_KEY, pubDemo?.id]);
    check(pubNow?.status === "sent" && pubNow?.tagline === "Edited in another tab E2E",
      "the send put the demo on the website as it was saved in another tab: that edit is kept", JSON.stringify({ status: pubNow?.status, tagline: pubNow?.tagline }));
    const after = await page.evaluate(([ok, ck, lid, did]) => ({
      slot: (JSON.parse(localStorage.getItem(ck) || "{}").demoSiteSlots || []).find((s) => s.id === did) || null,
      events: (JSON.parse(localStorage.getItem(ok) || "{}").events || []).filter((e) => e.leadId === lid),
    }), [OUTREACH_KEY, CMS_KEY, PUB.id, pubDemo?.id]);
    check(Boolean(after.slot) && /Example Publish Public School E2E/.test(after.slot.sentTo || "") && !Number.isNaN(Date.parse(after.slot.sentAt || "")),
      "the demo's private slot says who it went to and when, as Mark sent writes it", JSON.stringify(after.slot));
    const markNote = after.events.find((e) => e.type === "note" && e.detail === `Demo /site/${zohoSlug} marked sent`);
    const zSent = after.events.find((e) => e.type === "sent" && /^Email opened in Zoho Mail/.test(e.detail || ""));
    check(Boolean(markNote) && Boolean(zSent) && Date.parse(markNote.at) <= Date.parse(zSent.at),
      "the history has Demo /site/<slug> marked sent, then Email opened in Zoho Mail", JSON.stringify(after.events.map((e) => `${e.type}: ${e.detail}`)));
    check(/_link$/.test(zSent?.templateId || ""), "and the send recorded is the version with their sample's link", zSent?.templateId || "no send");
  }
  zohoSlug = "";
  /* Its follow-up points back to the link they got. */
  await pc.locator('[data-stage="follow_up"]').click();
  await page.waitForTimeout(400);
  const fuText = await pc.getByLabel("Message text").inputValue().catch(() => "");
  const fuRow = await pc.getByTestId("template-list").first().locator('[aria-checked="true"]').innerText().catch(() => "");
  check(/first e-mail|pehle mail/.test(fuText) && !/send you the link|link bhej doon/.test(fuText), "the e-mail follow-up after a first e-mail with the link points back to it, and does not offer it again", fuText.slice(0, 200));
  check(/after the link \([^)]+\)/.test(fuRow), "and the checked row names the follow-up for after the link", fuRow);
}
await page.evaluate(([k, id]) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.leads = (d.leads || []).filter((l) => l.id !== id);
  d.events = (d.events || []).filter((e) => e.leadId !== id);
  localStorage.setItem(k, JSON.stringify(d));
}, [OUTREACH_KEY, PUB.id]);

/* ── 16. The WhatsApp switch (2 Oct 2026, run last) ───────────────────────
   "whatsapp me v option dedo ki first msz pe link bhejne wala and ek nhi bhejne wla dono templete bana do":
   on a made lead the first WhatsApp starts Without link (today's message, with the picture link); With link
   swaps the picture for their own sample's link; the version sent is the next lead's starting point in this
   browser; and the follow-up after a WhatsApp with the link points back to it. */
const SW = [0, 1].map((i) => {
  const name = `Example Switch ${["Alder", "Birch"][i]} School E2E`;
  const at = new Date(Date.now() - 864e5).toISOString();
  return {
    lead: {
      id: `ol_e2eswitch${i}`, instituteName: name, kind: "school", status: "new", city: "Patna", contactName: `Mrs. ${["Alder", "Birch"][i]}`,
      phone: `+91981009001${i}`, email: `switch${i}@example-switch-e2e.example`, demoId: `ds_e2eswitch${i}`, demoSlug: `example-switch-${i}-e2e`, createdAt: at, updatedAt: at,
    },
    demo: { id: `ds_e2eswitch${i}`, slug: `example-switch-${i}-e2e`, instituteName: name, kind: "school", market: "india", city: "Patna", status: "sent", createdAt: at, updatedAt: at },
  };
});
extraDemoIds.push(...SW.map((s) => s.demo.id));
await page.evaluate(([ok, ck, sw]) => {
  const d = JSON.parse(localStorage.getItem(ok) || "{}");
  d.leads = [...(d.leads || []).filter((l) => !String(l.id).startsWith("ol_e2eswitch")), ...sw.map((s) => s.lead)];
  localStorage.setItem(ok, JSON.stringify(d));
  const c = JSON.parse(localStorage.getItem(ck) || "{}");
  c.demoSites = [...(c.demoSites || []).filter((x) => !String(x.id).startsWith("ds_e2eswitch")), ...sw.map((s) => s.demo)];
  localStorage.setItem(ck, JSON.stringify(c));
}, [OUTREACH_KEY, CMS_KEY, SW]);
const URLS = /https?:\/\/\S+|www\.\S+/g;
const openOnWhatsapp = async (lead) => {
  await page.goto(BASE + "/crm/leads/" + lead.id, { waitUntil: "domcontentloaded" });
  await page.getByTestId("lead-name").waitFor({ timeout: 15000 });
  const c = page.getByTestId("compose");
  await c.getByRole("tab", { name: /^whatsapp/i }).click();
  await page.waitForTimeout(400);
  return c;
};
{
  const c = await openOnWhatsapp(SW[0].lead);
  const swLink = ((await page.getByTestId("linked-demo").innerText()).match(/https?:\/\/\S+\/site\/[a-z0-9-]+/i) || [""])[0];
  check((await c.getByTestId("link-choice-without").getAttribute("aria-checked")) === "true" && !(await c.getByTestId("link-choice-with").isDisabled()) &&
    /reported more often/.test(await c.getByTestId("link-choice-hint").innerText().catch(() => "")),
  "a made lead's first WhatsApp starts on Without link, With link can be picked, and the hint says a link from an unknown number gets reported more often");
  const t0 = await c.getByLabel("Message text").inputValue();
  check(JSON.stringify(t0.match(URLS) || []) === JSON.stringify(["https://www.ideovent.in/w/school"]) && (await c.getByTestId("creative").count()) === 1,
    "Without link is today's message: its one link is the school's picture page, with the picture under it", (t0.match(URLS) || []).join(", "));
  await c.getByTestId("link-choice-with").click();
  await page.waitForTimeout(400);
  const t1 = await c.getByLabel("Message text").inputValue();
  check(Boolean(swLink) && JSON.stringify(t1.match(URLS) || []) === JSON.stringify([swLink]) && !/\/w\//.test(t1) && t1.includes(`\n${swLink}\n`),
    "With link carries the demo link: on WhatsApp the text's one link is their sample's, alone on its line, in place of the picture link", `${(t1.match(URLS) || []).join(", ") || "no link"} | step 1: ${swLink}`);
  check((await c.getByTestId("creative").count()) === 0 && /carries their sample's own link/.test(await c.getByTestId("creative-none").innerText().catch(() => "")),
    "the picture card is gone, and a line says this message carries their sample's own link instead");
  await tallShot("lead-link-switch-1280.png", 1280);
  await tallShot("lead-link-switch-390.png", 390);
  const tiny = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="link-choice"] button')].map((el) => el.getBoundingClientRect().height).filter((h) => h < 40));
  check(tiny.length === 0, "the switch's buttons are at least 40 px tall at 390", JSON.stringify(tiny));
  await page.setViewportSize({ width: 1280, height: 900 });
  const sWa = c.getByTestId("open-whatsapp");
  if ((await sWa.evaluate((el) => el.tagName)) !== "A") {
    fail("Open in WhatsApp is blocked on the With link message: " + (await c.locator('[aria-label="Blocked"]').innerText().catch(() => "")));
  } else {
    const href = (await sWa.getAttribute("href")) || "";
    const wt = new URL(href).searchParams.get("text") || "";
    check(wt === t1 && wt.includes(swLink), "the wa.me text is the With link message, their sample's link in it");
    const before = opened.length;
    await sWa.click();
    await page.waitForTimeout(1200);
    check(opened.slice(before).some((x) => x.startsWith("https://wa.me/") && (new URL(x).searchParams.get("text") || "").includes(swLink)), "clicking Open in WhatsApp opens wa.me with that text (intercepted)");
    const sent = await page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k) || "{}").events || []).find((e) => e.leadId === id && e.type === "sent") || null, [OUTREACH_KEY, SW[0].lead.id]);
    check(/with their sample's link/.test(sent?.detail || "") && /_link$/.test(sent?.templateId || ""), "the history names the version that went: the one with their sample's link", JSON.stringify(sent && { detail: sent.detail, templateId: sent.templateId }));
  }
  check((await page.evaluate(() => localStorage.getItem("ideovent_crm_wa_first_link"))) === "with", "the WhatsApp version sent last is remembered in this browser: With link");
}
{
  const c = await openOnWhatsapp(SW[1].lead);
  const t = await c.getByLabel("Message text").inputValue();
  check((await c.getByTestId("link-choice-with").getAttribute("aria-checked")) === "true" && t.includes(`/site/${SW[1].lead.demoSlug}\n`),
    "the next made lead starts on With link, with its own sample's link", (t.match(URLS) || []).join(", "));
}
{
  const c = await openOnWhatsapp(SW[0].lead);
  const t = await c.getByLabel("Message text").inputValue();
  check(/upar wale message|message above/.test(t) && !/dekhna ho|want to see it/.test(t) && !(t.match(URLS) || []).length,
    "the WhatsApp follow-up after a first WhatsApp with the link points back to it, with no link and no offer to send it", t.slice(0, 200));
}
await page.evaluate(([ok, ck]) => {
  localStorage.removeItem("ideovent_crm_wa_first_link");
  const d = JSON.parse(localStorage.getItem(ok) || "{}");
  d.leads = (d.leads || []).filter((l) => !String(l.id).startsWith("ol_e2eswitch"));
  d.events = (d.events || []).filter((e) => !String(e.leadId).startsWith("ol_e2eswitch"));
  localStorage.setItem(ok, JSON.stringify(d));
  const c = JSON.parse(localStorage.getItem(ck) || "{}");
  c.demoSites = (c.demoSites || []).filter((x) => !String(x.id).startsWith("ds_e2eswitch"));
  localStorage.setItem(ck, JSON.stringify(c));
}, [OUTREACH_KEY, CMS_KEY]);

/* ── Leak check: leads never enter the CMS snapshot ───────────────────── */
const inCms = await page.evaluate(([k, email]) => (localStorage.getItem(k) || "").includes(email), [CMS_KEY, LEAD.email]);
check(!inCms, "the lead's email is not in the CMS snapshot (so not in Export)");

/* ── Cleanup ──────────────────────────────────────────────────────────── */
await page.evaluate(([ok, ck, ids]) => {
  localStorage.removeItem(ok);
  const data = JSON.parse(localStorage.getItem(ck) || "{}");
  const drop = new Set(ids.filter(Boolean));
  data.demoSites = (data.demoSites || []).filter((x) => !drop.has(x.id));
  data.demoSiteSlots = (data.demoSiteSlots || []).filter((x) => !drop.has(x.id));
  data.demoSiteOpens = (data.demoSiteOpens || []).filter((x) => x.id !== "e2e_open_1");
  localStorage.setItem(ck, JSON.stringify(data));
}, [OUTREACH_KEY, CMS_KEY, [demoId, dentalDemo?.id, ...extraDemoIds]]);

const realErrors = consoleErrors.filter((e) => !/favicon|Failed to load resource|intercepted/i.test(e));
check(realErrors.length === 0, "no console errors", "console errors: " + realErrors.slice(0, 5).join(" | "));

await browser.close();
if (NEGATIVE) {
  const bit = {
    stage: findings.some((f) => /opens on After they say yes/.test(f)),
    blanks: findings.some((f) => /\[blank\]/.test(f)),
    script: findings.some((f) => /as a patient sees it/.test(f)),
    publish: findings.some((f) => /public before|already sent/.test(f)),
    variant: findings.some((f) => /With link/.test(f)),
  };
  console.log(`\nnegative control: broken in flight: ${[...broken].join(", ") || "nothing"}; ${findings.length} check(s) failed`);
  if (broken.size !== 5 || !bit.stage || !bit.blanks || !bit.script || !bit.publish || !bit.variant) {
    console.log(`NEGATIVE CONTROL INVALID: not every sabotage was applied and caught ${JSON.stringify({ applied: [...broken], caught: bit })}`);
    process.exit(3);
  }
  console.log("negative control holds: the stage, blank, call-script, public-before-Zoho and With link checks all failed, as they must");
  process.exit(1);
}
console.log(findings.length ? "\n" + findings.length + " FAILED" : "\nALL PASSED");
process.exit(findings.length ? 1 : 0);
