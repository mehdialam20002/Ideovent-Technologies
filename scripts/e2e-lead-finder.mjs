/**
 * End to end test of the admin Lead Finder, in LOCAL mode, with /api/leads-search mocked.
 *
 *   node scripts/e2e-lead-finder.mjs [baseUrl]        default http://localhost:5291
 *   SHOT_DIR=<folder> node scripts/e2e-lead-finder.mjs  also saves 390 and 1440 px screenshots
 *
 * What Mehdi does: pick "JEE/NEET coaching", type Patna, search; the websites
 * are checked on their own (None / Broken / Poor / OK badges with the reason);
 * filter to no website, to poor or broken, to rating 4+ and 20+ reviews; load
 * the next page; add one lead; see "Already in Outreach" on a place whose
 * phone is already a lead; add + create demo, which makes a DRAFT demo and
 * links it to the lead; get a phone from Google; save it only by clicking.
 *
 * Checks the storage rule too: the saved lead holds the place ID, name, city,
 * website, observation, pitch and the contacts from the institute's OWN site,
 * and never Google's phone, address or rating until "Save this number".
 *
 * Nothing reaches Google or Supabase: the endpoint is answered by the test.
 * Needs a dev server WITHOUT Supabase (plain `npx vite`), as e2e-outreach.mjs.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:5291";
const SHOT_DIR = process.env.SHOT_DIR || "";
const SESSION_KEY = "ideovent_admin_session";
const OUTREACH_KEY = "ideovent_outreach_v1";
const CMS_KEY = "ideovent_cms_v1";
const CITY = "Patna";

const findings = [];
const fail = (m) => { findings.push(m); console.log("FAIL  " + m); };
const pass = (m) => console.log("ok    " + m);
const check = (cond, okMsg, failMsg) => (cond ? pass(okMsg) : fail(failMsg || okMsg));

/* ── The mocked Google Maps and website audit ─────────────────────────── */
const place = (id, name, extra = {}) => ({
  placeId: id, name, address: `${id} Boring Road, Patna, Bihar 800001, India`, phone: null, phoneIntl: null,
  website: null, rating: null, ratingCount: null, mapsUrl: `https://maps.google.com/?cid=${id}`,
  businessStatus: "OPERATIONAL", primaryType: "school", ...extra,
});
const PAGE1 = [
  place("P_NONE", "Vidya JEE NEET Classes E2E", { rating: 4.6, ratingCount: 120, phone: "0612 222 0001", phoneIntl: "+91 612 222 0001" }),
  place("P_POOR", "Sunrise Coaching E2E", { rating: 4.2, ratingCount: 15, website: "http://sunrise-e2e.wixsite.com/home", phone: "098765 00009", phoneIntl: "+91 98765 00009" }),
  place("P_BROKEN", "Broken Tutorials E2E", { rating: 3.8, ratingCount: 40, website: "https://broken-e2e.example/" }),
  place("P_OK", "Good Academy E2E", { rating: 4.8, ratingCount: 300, website: "https://good-e2e.example/", phone: "099999 00001", phoneIntl: "+91 99999 00001" }),
  place("P_DUP", "Already There Classes E2E", { rating: 4.1, ratingCount: 22, phone: "098100 55555", phoneIntl: "+91 98100 55555" }),
];
const PAGE2 = [place("P_NOPHONE", "Page Two Institute E2E", { rating: 4.0, ratingCount: 9 })];
const AUDITS = {
  "": { verdict: "none", evidence: [{ code: "no_website", text: "No website listed on Google Maps" }], phones: [], emails: [] },
  "http://sunrise-e2e.wixsite.com/home": {
    verdict: "poor", url: "http://sunrise-e2e.wixsite.com/home", finalUrl: "http://sunrise-e2e.wixsite.com/home", status: 200, ms: 2100,
    evidence: [
      { code: "free_builder", text: "It is on a free builder address (wixsite.com), not the business's own domain" },
      { code: "no_viewport", text: "It is not built for phones: no mobile viewport, so it opens tiny and zoomed out" },
    ],
    phones: ["+919876500001"], emails: ["info@sunrise-e2e.example"],
  },
  "https://broken-e2e.example/": {
    verdict: "broken", url: "https://broken-e2e.example/", finalUrl: "https://broken-e2e.example/", status: 404, ms: 400,
    evidence: [{ code: "http_404", text: "The home page is missing (404 Not Found)" }], phones: [], emails: [],
  },
  "https://good-e2e.example/": {
    verdict: "ok", url: "https://good-e2e.example/", finalUrl: "https://good-e2e.example/", status: 200, ms: 900,
    evidence: [], phones: ["+919999900001"], emails: ["hello@good-e2e.example"],
  },
};
const calls = { search: 0, details: 0, audit: 0, auditUrls: 0 };

async function launch() {
  const cands = [
    process.env.CHROME_PATH,
    String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  for (const p of cands) {
    try { return await chromium.launch({ executablePath: p, headless: true }); } catch { /* next */ }
  }
  return await chromium.launch({ channel: "chrome", headless: true });
}

const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route(/\.supabase\.co|api\.emailjs\.com|googleapis\.com/, (route) => route.abort());
await context.route("**/api/leads-search", async (route) => {
  const body = JSON.parse(route.request().postData() || "{}");
  const json = (status, obj) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(obj) });
  if (body.action === "search") {
    calls.search++;
    if (body.city !== CITY || !body.type) return json(400, { ok: false, code: "bad_body", error: "Type a business type and a city" });
    return body.pageToken === "PAGE2"
      ? json(200, { ok: true, textQuery: `${body.type} in ${body.city}`, places: PAGE2, nextPageToken: null })
      : json(200, { ok: true, textQuery: `${body.type} in ${body.city}`, places: PAGE1, nextPageToken: "PAGE2" });
  }
  if (body.action === "details") {
    calls.details++;
    return json(200, { ok: true, place: { ...PAGE2[0], phone: "0612 333 0002", phoneIntl: "+91 612 333 0002" } });
  }
  if (body.action === "audit") {
    calls.audit++;
    calls.auditUrls += (body.urls || []).length;
    await new Promise((r) => setTimeout(r, 150));
    return json(200, { ok: true, audits: (body.urls || []).map((u) => AUDITS[u || ""] || AUDITS[""]) });
  }
  return json(400, { ok: false, error: "unknown action" });
});
/* No hot reload mid-run. */
await context.addInitScript(() => {
  const Real = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (/localhost|127\.0\.0\.1/.test(String(url))) return { addEventListener() {}, removeEventListener() {}, send() {}, close() {}, readyState: 0 };
    return new Real(url, protocols);
  };
});

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("dialog", (d) => d.accept());
const shot = async (name) => {
  if (!SHOT_DIR) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, name), fullPage: true });
  pass(`screenshot ${name}`);
};
const row = (id) => page.locator(`li[data-place-id="${id}"]`);
const leadsNow = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").leads || [], OUTREACH_KEY);

await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.evaluate(([session, key]) => {
  sessionStorage.setItem(session, "1");
  const now = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify({
    leads: [{ id: "ol_e2e_dup", createdAt: now, updatedAt: now, instituteName: "Old Name For Dup E2E", kind: "coaching",
      phone: "+919810055555", city: "Patna", status: "contacted" }],
    events: [], settings: null,
  }));
}, [SESSION_KEY, OUTREACH_KEY]);

await page.goto(BASE + "/admin/lead-finder", { waitUntil: "networkidle", timeout: 180000 });
await page.getByRole("heading", { name: "Lead finder", level: 1 }).waitFor({ timeout: 120000 });
pass("/admin/lead-finder renders behind the local admin session");
check((await page.locator('nav a[href$="/admin/lead-finder"]').count()) > 0, "the admin nav has a Lead finder item");
check((await page.getByText("Google's terms:").count()) === 1, "the one-line Google terms note is on the page");

/* ── 1. Search ─────────────────────────────────────────────────────────── */
await page.getByRole("button", { name: "Search", exact: true }).click();
check((await page.getByRole("alert").filter({ hasText: /Type a city/ }).count()) === 1, "searching without a city asks for one");
await page.getByRole("button", { name: "JEE/NEET coaching" }).click();
await page.getByLabel("City").fill(CITY);
await page.getByRole("button", { name: "Search", exact: true }).click();
await row("P_OK").waitFor({ timeout: 10000 });
check((await page.locator("li[data-place-id]").count()) === 5, "the first page shows 5 places");
check((await row("P_NONE").innerText()).includes("0612 222 0001"), "Google's phone is shown live");
check((await row("P_NONE").innerText()).includes("4.6"), "the rating is shown");

/* ── 2. Audit badges fill in on their own ──────────────────────────────── */
await page.waitForFunction(() => document.querySelectorAll("li[data-place-id] [data-verdict]").length >= 5, null, { timeout: 10000 });
const verdict = async (id) => row(id).locator("[data-verdict]").getAttribute("data-verdict");
check(await verdict("P_NONE") === "none", "no website -> None");
check(await verdict("P_POOR") === "poor", "wix site without viewport -> Poor");
check(await verdict("P_BROKEN") === "broken", "404 -> Broken");
check(await verdict("P_OK") === "ok", "good site -> OK");
check(calls.audit >= 2, `audits ran in batches (${calls.audit} calls for ${calls.auditUrls} sites)`);
const poorSummary = row("P_POOR").locator("summary");
check(/no mobile viewport/.test((await poorSummary.getAttribute("title")) || ""), "the evidence shows on hover (title)");
await poorSummary.click();
check((await row("P_POOR").innerText()).includes("free builder address"), "the evidence unfolds on click");
await shot("lead-finder-1440.png");

/* ── 3. Duplicate badge ───────────────────────────────────────────────── */
check((await row("P_DUP").getByText("Already in Outreach").count()) === 1, "a place whose phone is already a lead shows Already in Outreach");
check((await row("P_NONE").getByText("Already in Outreach").count()) === 0, "a new place has no duplicate badge");

/* ── 4. Filters ───────────────────────────────────────────────────────── */
const visible = () => page.locator("li[data-place-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-place-id")));
await page.getByRole("button", { name: "Only no website" }).click();
check(JSON.stringify(await visible()) === JSON.stringify(["P_NONE", "P_DUP"]), "Only no website", "only no website shows " + (await visible()));
await page.getByRole("button", { name: "Only no website" }).click();
await page.getByRole("button", { name: "Only poor or broken" }).click();
check(JSON.stringify(await visible()) === JSON.stringify(["P_POOR", "P_BROKEN"]), "Only poor or broken", "poor/broken shows " + (await visible()));
await page.getByRole("button", { name: "Only poor or broken" }).click();
await page.getByRole("button", { name: "Rating 4+" }).click();
await page.getByRole("button", { name: "20+ reviews" }).click();
check(JSON.stringify(await visible()) === JSON.stringify(["P_NONE", "P_OK", "P_DUP"]), "Rating 4+ with 20+ reviews", "rating/reviews shows " + (await visible()));
await page.getByRole("button", { name: "Rating 4+" }).click();
await page.getByRole("button", { name: "20+ reviews" }).click();
check((await page.locator("li[data-place-id]").count()) === 5, "filters off shows all again");

/* ── 5. Load more, and Get phone from Google ──────────────────────────── */
await page.getByRole("button", { name: "Load more" }).click();
await row("P_NOPHONE").waitFor({ timeout: 10000 });
check((await page.locator("li[data-place-id]").count()) === 6, "Load more appends the next page");
check((await page.getByRole("button", { name: "Load more" }).count()) === 0, "no Load more on the last page");
await row("P_NOPHONE").getByRole("button", { name: "Get phone from Google" }).click();
await row("P_NOPHONE").getByText("0612 333 0002").waitFor({ timeout: 5000 });
check(calls.details === 1, "Get phone from Google fetches Place Details live");

/* ── 6. Add to Outreach: what the lead keeps ──────────────────────────── */
await row("P_POOR").getByRole("button", { name: "Add to Outreach" }).click();
await row("P_POOR").getByText("Already in Outreach").waitFor({ timeout: 5000 });
pass("Add to Outreach turns the row into Already in Outreach");
let leads = await leadsNow();
const poor = leads.find((l) => l.placeId === "P_POOR");
check(!!poor, "the lead is saved with its place ID");
if (poor) {
  check(poor.instituteName === "Sunrise Coaching E2E" && poor.city === CITY, "name and city are kept");
  check(poor.source === "lead-finder", "source is lead-finder");
  check(poor.pitch === "fix_website", "a poor site pitches fix_website");
  check(poor.observation === "not_mobile", "no viewport maps to the not_mobile observation", "observation: " + poor.observation);
  check(poor.phone === "+919876500001", "the phone is the one on their OWN website", "phone: " + poor.phone);
  check(poor.email === "info@sunrise-e2e.example", "the email is the one on their own website");
  check(poor.kind === "coaching", "kind comes from the preset");
  const raw = JSON.stringify(poor);
  check(!raw.includes("98765 00009") && !raw.includes("+919876500009"), "Google's phone is NOT stored");
  check(!raw.includes("Boring Road") && !raw.includes("4.2"), "Google's address and rating are NOT stored");
}

/* ── 7. Save this number: only on click ───────────────────────────────── */
await row("P_POOR").getByRole("button", { name: "Save this number" }).click();
await page.waitForTimeout(400);
leads = await leadsNow();
const poor2 = leads.find((l) => l.placeId === "P_POOR");
check(!!poor2 && /\+919876500009/.test(poor2.notes || ""), "Save this number copies Google's phone into the lead (as a note, the own-site phone stays first)", "notes: " + poor2?.notes);
check((await row("P_POOR").getByRole("button", { name: "Save this number" }).count()) === 0, "Save this number goes away once saved");

/* ── 8. Add + create demo ─────────────────────────────────────────────── */
check((await row("P_NONE").innerText()).includes("c1, "), "JEE/NEET coaching picks template c1", "row: " + (await row("P_NONE").innerText()));
await row("P_NONE").getByRole("button", { name: "Add + create demo" }).click();
await row("P_NONE").getByRole("link", { name: "Open demo" }).waitFor({ timeout: 15000 });
leads = await leadsNow();
const none = leads.find((l) => l.placeId === "P_NONE");
check(!!none?.demoId && !!none?.demoSlug, "the lead is linked to the new demo");
check(none?.pitch === "new_website" && none?.observation === "no_website", "no website pitches new_website with the no_website observation");
check(!none?.phone, "Google's phone is not stored on the demo lead");
const demo = await page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k) || "{}").demoSites || []).find((d) => d.id === id) || null, [CMS_KEY, none?.demoId]);
check(!!demo, "a demo record exists in demoSites");
if (demo) {
  check(demo.templateId === "c1-jee-neet-urban", "the demo came from c1-jee-neet-urban", "templateId: " + demo.templateId);
  check((demo.status || "draft") === "draft", "the demo is a draft", "status: " + demo.status);
  check(JSON.stringify(demo).includes("Vidya JEE NEET Classes E2E"), "the demo carries the institute's name");
}

/* ── 9. Bulk add ──────────────────────────────────────────────────────── */
await row("P_BROKEN").getByRole("checkbox").check();
await row("P_OK").getByRole("checkbox").check();
await page.getByRole("button", { name: /Add 2 to Outreach/ }).click();
await page.getByText("2 leads added to Outreach.").waitFor({ timeout: 5000 });
leads = await leadsNow();
const broken = leads.find((l) => l.placeId === "P_BROKEN");
check(!!broken && !!leads.find((l) => l.placeId === "P_OK"), "bulk add saves both selected");
check(broken?.pitch === "new_website" && /did not open/.test(broken?.observation || ""), "a broken site pitches new_website with a plain observation", "obs: " + broken?.observation);
check(leads.length === 5, `no duplicate leads were made (${leads.length} in the store)`);

/* ── 10. Phone width: cards, no sideways scroll ───────────────────────── */
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(overflow <= 0, "no horizontal scroll at 390", `page is ${overflow}px wider than the screen at 390`);
const cardish = await row("P_OK").evaluate((el) => getComputedStyle(el).display);
check(cardish !== "grid", "rows are stacked cards on a phone", "display: " + cardish);
await shot("lead-finder-390.png");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(300);
const overflowWide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(overflowWide <= 0, "no horizontal scroll at 1440", `overflow ${overflowWide}px at 1440`);

/* ── 11. The Google Maps key card on AI keys (Local mode shows the notice) ─ */
await page.goto(BASE + "/admin/ai-keys", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "AI keys", level: 1 }).waitFor({ timeout: 10000 });
pass("AI keys still renders (Local mode notice; the Google Maps card needs the live admin)");

/* ── Cleanup ──────────────────────────────────────────────────────────── */
await page.evaluate(([ok, ck, id]) => {
  localStorage.removeItem(ok);
  const data = JSON.parse(localStorage.getItem(ck) || "{}");
  if (id) {
    data.demoSites = (data.demoSites || []).filter((x) => x.id !== id);
    data.demoSiteSlots = (data.demoSiteSlots || []).filter((x) => x.id !== id);
  }
  localStorage.setItem(ck, JSON.stringify(data));
}, [OUTREACH_KEY, CMS_KEY, none?.demoId]);

const realErrors = consoleErrors.filter((e) => !/favicon|Failed to load resource|intercepted|ERR_FAILED/i.test(e));
check(realErrors.length === 0, "no console errors", "console errors: " + realErrors.slice(0, 5).join(" | "));
await browser.close();
console.log(findings.length ? "\n" + findings.length + " FAILED" : "\nALL PASSED");
process.exit(findings.length ? 1 : 0);
