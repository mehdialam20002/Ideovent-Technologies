/**
 * End to end test of the Lead Finder, in LOCAL mode, with /api/leads-search mocked.
 *
 *   node scripts/e2e-lead-finder.mjs [baseUrl]        default http://localhost:5402
 *   SHOT_DIR=<folder> node scripts/e2e-lead-finder.mjs  also saves 390 and 1440 px screenshots
 *
 * GOOGLE MAPS (a working key): pick "JEE/NEET coaching", type Patna, search; the page says
 * "Source: Google Maps"; the websites are checked on their own (None / Broken / Poor / OK badges
 * with the reason); filter to no website, to poor or broken, to rating 4+ and 20+ reviews; load
 * the next page; add one lead; see "Already a lead" on a place whose phone is already a lead;
 * add + create demo, which makes a DRAFT demo and links it to the lead; get a phone from Google;
 * save it only by clicking.
 *
 * OPENSTREETMAP (no Google key, 28 Sep 2026): pick "Dental clinic", type Indore, search; the page
 * says "Source: OpenStreetMap", credits "© OpenStreetMap contributors" linked to the ODbL page,
 * gives the honest line about fewer businesses and phones and says why Google was not used; no
 * rating filters; every website check carries kind "dental"; a dental lead keeps OSM's phone and
 * credits OpenStreetMap; Add + create demo on an orthodontic clinic makes a d5 demo; Load more
 * keeps the reason line.
 *
 * THE CRM HOST (30 Sep 2026): crm.localhost stands in for crm.ideovent.in. There the finder's
 * links to AI keys and to a demo's editor are absolute to the main site in a plain <a> (new tab),
 * and its links to leads carry no /crm. On the main site the same links stay relative, as today.
 *
 * Checks the storage rule too: a Google lead holds the place ID, name, city, website, observation,
 * pitch and the contacts from the institute's OWN site, and never Google's phone, address or
 * rating until "Save this number".
 *
 * Nothing reaches Google, OpenStreetMap, Supabase or the live site: the endpoint and the main
 * site's address are answered by the test. Needs a dev server WITHOUT Supabase (plain `npx vite`).
 * All names, phones and addresses below are fictional.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   E2E_NEGATIVE=1 node scripts/e2e-lead-finder.mjs http://localhost:5402
 *
 * serves AdminLeadFinder.tsx with its Leads link hard-wired to "/crm/leads" (the module is
 * rewritten in flight; no file is touched). On the CRM host the two link checks that catch a
 * hand-written /crm path must then FAIL and the run must exit 1.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:5402";
const CRM_HOST = BASE.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, "//crm.localhost");
const SHOT_DIR = process.env.SHOT_DIR || "";
const SESSION_KEY = "ideovent_admin_session";
const OUTREACH_KEY = "ideovent_outreach_v1";
const CMS_KEY = "ideovent_cms_v1";
const CITY = "Patna";
const OSM_CITY = "Indore";

const findings = [];
const fail = (m) => { findings.push(m); console.log("FAIL  " + m); };
const pass = (m) => console.log("ok    " + m);
const check = (cond, okMsg, failMsg) => (cond ? pass(okMsg) : fail(failMsg ? `${okMsg} (${failMsg})` : okMsg));

/* ── The mocked Google Maps results and website audit ─────────────────── */
const place = (id, name, extra = {}) => ({
  placeId: id, name, address: `${id} Boring Road, Patna, Bihar 800001, India`, phone: null, phoneIntl: null,
  website: null, rating: null, ratingCount: null, mapsUrl: `https://maps.google.com/?cid=${id}`,
  businessStatus: "OPERATIONAL", primaryType: "school", source: "google", ...extra,
});
const PAGE1 = [
  place("P_NONE", "Vidya JEE NEET Classes E2E", { rating: 4.6, ratingCount: 120, phone: "0612 222 0001", phoneIntl: "+91 612 222 0001" }),
  place("P_POOR", "Sunrise Coaching E2E", { rating: 4.2, ratingCount: 15, website: "http://sunrise-e2e.wixsite.com/home", phone: "098765 00009", phoneIntl: "+91 98765 00009" }),
  place("P_BROKEN", "Broken Tutorials E2E", { rating: 3.8, ratingCount: 40, website: "https://broken-e2e.example/" }),
  place("P_OK", "Good Academy E2E", { rating: 4.8, ratingCount: 300, website: "https://good-e2e.example/", phone: "099999 00001", phoneIntl: "+91 99999 00001" }),
  place("P_DUP", "Already There Classes E2E", { rating: 4.1, ratingCount: 22, phone: "098100 55555", phoneIntl: "+91 98100 55555" }),
];
const PAGE2 = [place("P_NOPHONE", "Page Two Institute E2E", { rating: 4.0, ratingCount: 9 })];

/* ── The mocked OpenStreetMap results (the server's shape for source "osm") ── */
const osmPlace = (n, name, extra = {}) => ({
  placeId: `osm:node/${n}`, name, address: `${n} Example Road, Indore, 452001`, phone: null, phoneIntl: null, website: null,
  rating: null, ratingCount: null, mapsUrl: `https://www.openstreetmap.org/node/${n}`, businessStatus: null,
  primaryType: "dentist", lat: 22.72, lon: 75.86, source: "osm", ...extra,
});
const OSM_PAGE1 = [
  osmPlace(9001, "Example Orthodontic Centre E2E", { primaryType: "dentist (orthodontics)", phone: "+91 98765 43215", phoneIntl: "+919876543215" }),
  osmPlace(9002, "Example Family Dental Clinic E2E", { phone: "0731 2345678", phoneIntl: "+917312345678", website: "https://family-dental-e2e.example/" }),
  /* Its site is drawn by scripts: the audit cannot read it, and says so ("Could not check"). */
  osmPlace(9003, "Example Kids Dental Care E2E", { website: "https://kids-dental-e2e.example/" }),
];
const OSM_PAGE2 = [osmPlace(9004, "Example Smile Studio E2E", { primaryType: "clinic" })];
const OSM_BROAD = osmPlace(9005, "Example Dental Clinic E2E");
const OSM_CREDIT = {
  attribution: "© OpenStreetMap contributors", attributionUrl: "https://www.openstreetmap.org/copyright", licence: "ODbL",
  note: "OpenStreetMap is free, but it lists fewer businesses and fewer phone numbers than Google Maps.",
};

const AUDITS = {
  "": { verdict: "none", evidence: [{ code: "no_website", text: "No website listed for it on the map" }], phones: [], emails: [] },
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
  "https://family-dental-e2e.example/": {
    verdict: "poor", url: "https://family-dental-e2e.example/", finalUrl: "https://family-dental-e2e.example/", status: 200, ms: 1200,
    evidence: [
      { code: "no_booking", text: "No online booking: no 'Book appointment' link or booking form on the home page" },
      { code: "no_whatsapp", text: "No WhatsApp button: patients cannot message the clinic in one tap" },
    ],
    phones: [], emails: ["hello@family-dental-e2e.example"],
  },
  "https://kids-dental-e2e.example/": {
    verdict: "unchecked", url: "https://kids-dental-e2e.example/", finalUrl: "https://kids-dental-e2e.example/", status: 200, ms: 800,
    evidence: [{ code: "scripted", text: "Could not check what the page shows: it is drawn by scripts, so open it and look" }],
    phones: [], emails: [],
  },
};
/* phase: which part of the test is running, so each audit request is judged by the search it belongs to. */
let phase = "google";
const calls = { search: 0, details: 0, audit: 0, auditUrls: 0, audits: [], searches: [] };

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
if (process.env.E2E_NEGATIVE) {
  // The mistake the CRM-host checks exist for: a "/crm/..." path written by hand.
  await context.route(/\/src\/pages\/admin\/AdminLeadFinder\.tsx/, async (route) => {
    // Fetched by Node, which (unlike Chrome) cannot resolve crm.localhost: ask localhost for the same module.
    const res = await route.fetch({ url: route.request().url().replace("//crm.localhost", "//localhost") });
    const code = (await res.text()).replace(/\bto: CRM\.leads\b/g, 'to: "/crm/leads"');
    await route.fulfill({ response: res, body: code });
  });
  console.log("NEGATIVE MODE: the finder's Leads link is served as a hand-written /crm/leads");
}
await context.route(/\.supabase\.co|api\.emailjs\.com|googleapis\.com|nominatim\.openstreetmap\.org|overpass/, (route) => route.abort());
/* The main site's address (the CRM host links there): answered here, never the live site. */
const opened = [];
await context.route(/^https:\/\/(ideovent\.vercel\.app|(www\.)?ideovent\.in)\//, (route) => {
  opened.push(route.request().url());
  return route.fulfill({ status: 200, contentType: "text/html", body: "<p>main site, intercepted by e2e-lead-finder</p>" });
});
await context.route("**/api/leads-search", async (route) => {
  const body = JSON.parse(route.request().postData() || "{}");
  const json = (status, obj) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(obj) });
  if (body.action === "search") {
    calls.search++;
    calls.searches.push({ phase, ...body });
    if (body.city === OSM_CITY && body.preset === "ortho") {
      // OpenStreetMap has no orthodontist by name here: the server shows every dental clinic and says so.
      return json(200, { ok: true, source: "osm", textQuery: `${body.type} in ${body.city}`, places: [OSM_BROAD], nextPageToken: null, total: 1,
        ...OSM_CREDIT, broadened: `OpenStreetMap has no orthodontists by name in ${OSM_CITY}, so these are all the dental clinics it lists there.`,
        fallback: { code: "quota", reason: "Every Google Maps key is out of quota for today." } });
    }
    if (body.city === OSM_CITY) {
      const more = body.pageToken === "osm.20";
      return json(200, { ok: true, source: "osm", textQuery: `${body.type} in ${body.city}`, places: more ? OSM_PAGE2 : OSM_PAGE1,
        nextPageToken: more ? null : "osm.20", total: OSM_PAGE1.length + OSM_PAGE2.length, ...OSM_CREDIT,
        ...(more ? {} : { fallback: { code: "no_keys", reason: "No Google Maps key is saved." } }) });
    }
    if (body.city !== CITY || !body.type) return json(400, { ok: false, code: "bad_body", error: "Type a business type and a city" });
    const google = { ok: true, source: "google", attribution: "Google Maps", textQuery: `${body.type} in ${body.city}` };
    return body.pageToken === "PAGE2"
      ? json(200, { ...google, places: PAGE2, nextPageToken: null })
      : json(200, { ...google, places: PAGE1, nextPageToken: "PAGE2" });
  }
  if (body.action === "details") {
    calls.details++;
    return json(200, { ok: true, place: { ...PAGE2[0], phone: "0612 333 0002", phoneIntl: "+91 612 333 0002" } });
  }
  if (body.action === "audit") {
    calls.audit++;
    calls.auditUrls += (body.urls || []).length;
    calls.audits.push({ phase, kind: body.kind ?? null, urls: body.urls || [] });
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
const watch = (p) => p.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
watch(page);
page.on("dialog", (d) => d.accept());
const shot = async (name) => {
  if (!SHOT_DIR) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, name), fullPage: true });
  pass(`screenshot ${name}`);
};
const row = (id, p = page) => p.locator(`li[data-place-id="${id}"]`);
const leadsNow = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").leads || [], OUTREACH_KEY);
const hrefOf = async (loc) => ((await loc.count()) ? loc.first().getAttribute("href") : null);
const now = new Date().toISOString();
const DUP_LEAD = { id: "ol_e2e_dup", createdAt: now, updatedAt: now, instituteName: "Old Name For Dup E2E", kind: "coaching",
  phone: "+919810055555", city: "Patna", status: "contacted" };

await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.evaluate(([session, key, lead]) => {
  sessionStorage.setItem(session, "1");
  localStorage.setItem(key, JSON.stringify({ leads: [lead], events: [], settings: null }));
}, [SESSION_KEY, OUTREACH_KEY, DUP_LEAD]);

await page.goto(BASE + "/admin/lead-finder", { waitUntil: "networkidle", timeout: 180000 });
await page.getByRole("heading", { name: "Lead finder", level: 1 }).waitFor({ timeout: 120000 });
pass("/admin/lead-finder renders behind the local admin session");
check((await page.locator('nav a[href$="/admin/lead-finder"]').count()) > 0, "the admin nav has a Lead finder item");
check((await page.getByText("Google's terms:").count()) === 1, "the one-line Google terms note is on the page");
/* ── 0. Free to use: the empty state, and its link on the main site ───── */
const costs = page.getByRole("region", { name: "What it costs" });
const costText = (await costs.innerText().catch(() => "")).replace(/\s+/g, " ");
check(/7,000 free Text Searches and 7,000 free Place Details a month on India pricing \(checked 28 Sep 2026\)/.test(costText)
  && /set a daily quota of 200 for each/.test(costText) && /Google Maps Platform > Quotas, then Places API \(New\)/.test(costText)
  && /If Google shows only per-minute quotas there, they do not cap the month/.test(costText)
  && /A card is still needed to create the key/.test(costText) && /Without a key the finder works on OpenStreetMap for free/.test(costText)
  && /fewer businesses and fewer phone numbers than Google Maps/.test(costText),
  "the empty state: 7,000 free a month each on India pricing, a 200-a-day quota (a per-minute one does not cap the month), a card for the key, OpenStreetMap free", "empty state: " + costText);
const aiKeysHref = await hrefOf(costs.getByRole("link", { name: "AI keys" }));
check(aiKeysHref === "/admin/ai-keys", "on the main site the AI keys link stays relative, as today", "AI keys href: " + aiKeysHref);

/* ── 1. Search (Google Maps answers) ──────────────────────────────────── */
await page.getByRole("button", { name: "Search", exact: true }).click();
check((await page.getByRole("alert").filter({ hasText: /Type a city/ }).count()) === 1, "searching without a city asks for one");
check((await page.getByRole("button", { name: "Dental clinic" }).count()) === 1 && (await page.getByRole("button", { name: "Orthodontist or aligners" }).count()) === 1
  && (await page.getByRole("button", { name: "Dental implant centre" }).count()) === 1 && (await page.getByRole("button", { name: "Children's dentist" }).count()) === 1
  && (await page.getByRole("button", { name: "Cosmetic dentist" }).count()) === 1, "the five dental presets are offered");
await page.getByRole("button", { name: "JEE/NEET coaching" }).click();
await page.getByLabel("City").fill(CITY);
await page.getByRole("button", { name: "Search", exact: true }).click();
await row("P_OK").waitFor({ timeout: 10000 });
check((await page.locator("li[data-place-id]").count()) === 5, "the first page shows 5 places");
check((await page.locator('[data-source="google"]').innerText().catch(() => "")).includes("Source: Google Maps"), "the page says which source answered: Google Maps");
check((await page.locator('[data-source="osm"]').count()) === 0, "no OpenStreetMap credit on a Google list");
check((await row("P_NONE").innerText()).includes("0612 222 0001"), "Google's phone is shown live");
check((await row("P_NONE").innerText()).includes("4.6"), "the rating is shown");
check(calls.searches.at(-1)?.preset === "jee", "the preset id goes with the search (OpenStreetMap needs it)", JSON.stringify(calls.searches.at(-1)));

/* ── 2. Audit badges fill in on their own ──────────────────────────────── */
await page.waitForFunction(() => document.querySelectorAll("li[data-place-id] [data-verdict]").length >= 5, null, { timeout: 10000 });
const verdict = async (id, p = page) => row(id, p).locator("[data-verdict]").getAttribute("data-verdict");
check(await verdict("P_NONE") === "none", "no website -> None");
check(await verdict("P_POOR") === "poor", "wix site without viewport -> Poor");
check(await verdict("P_BROKEN") === "broken", "404 -> Broken");
check(await verdict("P_OK") === "ok", "good site -> OK");
check(calls.audit >= 2, `audits ran in batches (${calls.audit} calls for ${calls.auditUrls} sites)`);
check(calls.audits.filter((a) => a.phase === "google").every((a) => a.kind === null), "a coaching search runs no dental checks");
const poorSummary = row("P_POOR").locator("summary");
check(/no mobile viewport/.test((await poorSummary.getAttribute("title")) || ""), "the evidence shows on hover (title)");
await poorSummary.click();
check((await row("P_POOR").innerText()).includes("free builder address"), "the evidence unfolds on click");
await shot("lead-finder-1440.png");

/* ── 3. Duplicate badge, linked to the lead in the CRM (relative on the main site) ── */
check((await row("P_DUP").getByText("Already a lead").count()) === 1, "a place whose phone is already a lead shows Already a lead");
check((await row("P_NONE").getByText("Already a lead").count()) === 0, "a new place has no duplicate badge");
const dupHref = await hrefOf(row("P_DUP").getByRole("link", { name: /Already a lead/ }));
check(dupHref === "/crm/leads/ol_e2e_dup", "Already a lead opens that lead in the CRM (/crm/leads/<id> on the main site)", "href: " + dupHref);
const results = (p = page) => p.getByRole("region", { name: "Results" });
check(await hrefOf(results().getByRole("link", { name: "Leads", exact: true })) === "/crm/leads", "the footer's Leads link is the CRM's (/crm/leads), not a hand-written /admin/outreach");

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
/* ── 6. Add to leads: what a Google lead keeps ─────────────────────── */
await row("P_POOR").getByRole("button", { name: "Add to leads" }).click();
await row("P_POOR").getByText("Already a lead").waitFor({ timeout: 5000 });
pass("Add to leads turns the row into Already a lead");
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
  // Judged by fields and values: a bare "4.2" in the JSON also matches a timestamp such as ...T10:41:14.234Z.
  check(!raw.includes("Boring Road") && !/"(rating|ratingCount|address)"/.test(raw) && !Object.values(poor).some((v) => v === 4.2 || v === 15),
    "Google's address and rating are NOT stored", raw);
  check(!/OpenStreetMap/.test(raw), "a Google lead carries no OpenStreetMap credit");
}

/* ── 7. Save this number: only on click ───────────────────────────────── */
await row("P_POOR").getByRole("button", { name: "Save this number" }).click();
await page.waitForTimeout(400);
leads = await leadsNow();
const poor2 = leads.find((l) => l.placeId === "P_POOR");
check(!!poor2 && /\+919876500009/.test(poor2.notes || ""), "Save this number copies Google's phone into the lead (as a note, the own-site phone stays first)", "notes: " + poor2?.notes);
check((await row("P_POOR").getByRole("button", { name: "Save this number" }).count()) === 0, "Save this number goes away once saved");

/* ── 8. Add + create demo ─────────────────────────────────────────────── */
const tplPicker = (r) => r.getByRole("combobox", { name: /^Demo template for / });
const noneTpl = await tplPicker(row("P_NONE")).inputValue().catch(() => "");
check(noneTpl === "c1-jee-neet-urban", "JEE/NEET coaching picks template c1 by default", "template: " + noneTpl);
const coachingOptions = await tplPicker(row("P_NONE")).locator("option").evaluateAll((os) => os.map((o) => o.value));
check(coachingOptions.length === 5 && coachingOptions.every((v) => /^c\d-/.test(v)), "the template can be changed, to any of the five coaching templates", JSON.stringify(coachingOptions));
await row("P_NONE").getByRole("button", { name: "Add + create demo" }).click();
await row("P_NONE").getByRole("link", { name: "Open demo" }).waitFor({ timeout: 15000 });
leads = await leadsNow();
const none = leads.find((l) => l.placeId === "P_NONE");
check(!!none?.demoId && !!none?.demoSlug, "the lead is linked to the new demo");
check(none?.pitch === "new_website" && none?.observation === "no_website", "no website pitches new_website with the no_website observation");
check(!none?.phone, "Google's phone is not stored on the demo lead");
const demoLink = row("P_NONE").getByRole("link", { name: "Open demo" });
check(await hrefOf(demoLink) === `/admin/c/demoSites?edit=${encodeURIComponent(none?.demoId || "")}` && !(await demoLink.getAttribute("target")),
  "on the main site Open demo stays a relative link in the same tab, as today", "href: " + (await hrefOf(demoLink)));
const demoOf = (p, id) => p.evaluate(([k, x]) => (JSON.parse(localStorage.getItem(k) || "{}").demoSites || []).find((d) => d.id === x) || null, [CMS_KEY, id]);
const demo = await demoOf(page, none?.demoId);
check(!!demo, "a demo record exists in demoSites");
if (demo) {
  check(demo.templateId === "c1-jee-neet-urban", "the demo came from c1-jee-neet-urban", "templateId: " + demo.templateId);
  check((demo.status || "draft") === "draft", "the demo is a draft", "status: " + demo.status);
  check(JSON.stringify(demo).includes("Vidya JEE NEET Classes E2E"), "the demo carries the institute's name");
}

/* ── 9. Bulk add ──────────────────────────────────────────────────────── */
await row("P_BROKEN").getByRole("checkbox").check();
await row("P_OK").getByRole("checkbox").check();
await page.getByRole("button", { name: /Add 2 to leads/ }).click();
await page.getByText("2 leads added.").waitFor({ timeout: 5000 });
leads = await leadsNow();
const broken = leads.find((l) => l.placeId === "P_BROKEN");
check(!!broken && !!leads.find((l) => l.placeId === "P_OK"), "bulk add saves both selected");
// 3 Oct 2026: a listed site that would not open (here a 404) is still their site, so the lead is about their
// site with the site_down observation, never "no website of its own" (leads.ts siteDown).
check(broken?.pitch === "fix_website" && broken?.observation === "site_down", "a site that would not open pitches their site, with the site_down observation", `pitch: ${broken?.pitch}, obs: ${broken?.observation}`);
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
const googleDemoId = none?.demoId;

/* ── 11. OpenStreetMap (no Google key): a dental search in Indore ─────── */
phase = "osm";
await page.getByRole("button", { name: "Dental clinic" }).click();
await page.getByLabel("City").fill(OSM_CITY);
await page.getByRole("button", { name: "Search", exact: true }).click();
const osmRow = (n, p = page) => row(`osm:node/${n}`, p);
await osmRow(9001).waitFor({ timeout: 10000 });
const credit = page.locator('[data-source="osm"]');
const creditText = (await credit.innerText().catch(() => "")).replace(/\s+/g, " ");
check(creditText.includes("Source: OpenStreetMap"), "the page says which source answered: OpenStreetMap", "credit box: " + creditText);
const attr = credit.getByRole("link", { name: "© OpenStreetMap contributors" });
check((await attr.count()) === 1 && (await attr.getAttribute("href")) === "https://www.openstreetmap.org/copyright" && creditText.includes("(ODbL)"),
  "the list credits © OpenStreetMap contributors, linked to their copyright page, ODbL");
check(creditText.includes("OpenStreetMap is free, but it lists fewer businesses and fewer phone numbers than Google Maps."), "the one honest line about fewer businesses and phones");
check(creditText.includes("No Google Maps key is saved. So this list is from OpenStreetMap, free."), "and why Google was not used");
check((await page.locator('[data-source="google"]').count()) === 0, "no Google Maps label on an OpenStreetMap list");
check(calls.searches.at(-1)?.preset === "dental" && calls.searches.at(-1)?.type === "dental clinic", "the Dental clinic preset searches 'dental clinic' with preset dental",
  JSON.stringify(calls.searches.at(-1)));
check((await page.locator("li[data-place-id]").count()) === 3 && /3 of 4 found for Dental clinic in Indore/.test(await results().innerText()),
  "3 clinics on the first page, of 4 in all");
check((await page.getByRole("button", { name: "Rating 4+" }).count()) === 0 && (await page.getByRole("button", { name: "20+ reviews" }).count()) === 0
  && (await page.getByRole("button", { name: "Only no website" }).count()) === 1, "OpenStreetMap has no ratings, so the rating filters are hidden");
const osmLink = osmRow(9001).getByRole("link", { name: /OpenStreetMap/ });
check(await hrefOf(osmLink) === "https://www.openstreetmap.org/node/9001", "each row links to its OpenStreetMap entry");
check((await osmRow(9001).innerText()).includes("+91 98765 43215") && (await osmRow(9001).innerText()).includes("No ratings on OSM"), "OSM's phone is shown, and no rating");
check((await osmRow(9003).innerText()).includes("No phone on OpenStreetMap") && (await page.getByRole("button", { name: "Get phone from Google" }).count()) === 0,
  "no phone on OSM is said plainly, and Get phone from Google is not offered");
await page.waitForFunction(() => document.querySelectorAll('li[data-place-id^="osm:"] [data-verdict]').length >= 3, null, { timeout: 10000 });
const osmAudits = calls.audits.filter((a) => a.phase === "osm");
check(osmAudits.length > 0 && osmAudits.every((a) => a.kind === "dental"), `every website check of the dental search carries kind "dental" (${osmAudits.length} calls)`,
  JSON.stringify(osmAudits));
check(await verdict("osm:node/9002") === "poor" && /No online booking/.test((await osmRow(9002).locator("summary").getAttribute("title")) || ""), "a clinic site with no booking -> Poor, with the dental reason");
/* 30 Sep 2026: a site drawn by scripts is "Could not check", never "OK" (which says it opens fine with contact details). */
const kidsBadge = osmRow(9003).locator("summary");
check(await verdict("osm:node/9003") === "unchecked" && (await kidsBadge.innerText()).trim() === "Could not check"
  && /drawn by scripts/.test((await kidsBadge.getAttribute("title")) || ""), "a clinic site drawn by scripts -> Could not check, with the reason on hover",
  `${await verdict("osm:node/9003")} / ${(await kidsBadge.innerText().catch(() => "")).trim()}`);
check(/Websites: 1 none, 0 broken, 1 poor, 0 OK, 1 could not be checked/.test(await results().innerText()), "the websites summary counts the one that could not be checked",
  (await results().innerText()).split("\n")[0]);
const tplText = async (n) => (await tplPicker(osmRow(n)).inputValue().catch(() => "")).split("-")[0];
check(await tplText(9001) === "d5" && await tplText(9002) === "d1" && await tplText(9003) === "d6",
  "dental templates by dentalTemplateFor: orthodontic d5, family d1, kids d6", `${await tplText(9001)} ${await tplText(9002)} ${await tplText(9003)}`);
await shot("lead-finder-osm-1440.png");
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(300);
const osmOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(osmOverflow <= 0, "the OpenStreetMap list has no horizontal scroll at 390", `overflow ${osmOverflow}px at 390`);
await shot("lead-finder-osm-390.png");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(300);

/* ── 12. A dental lead from OpenStreetMap, and its demo ────────────────── */
await osmRow(9002).getByRole("button", { name: "Add to leads" }).click();
await osmRow(9002).getByText("Already a lead").waitFor({ timeout: 5000 });
leads = await leadsNow();
const fam = leads.find((l) => l.placeId === "osm:node/9002");
check(fam?.kind === "dental", "a lead added from a dental result is kind dental", "kind: " + fam?.kind);
check(fam?.phone === "+917312345678", "it keeps the phone OpenStreetMap lists (ODbL allows it)", "phone: " + fam?.phone);
check(fam?.email === "hello@family-dental-e2e.example" && fam?.website === "https://family-dental-e2e.example/", "and the email and website its own site shows");
check(/From OpenStreetMap \(© OpenStreetMap contributors, ODbL\): https:\/\/www\.openstreetmap\.org\/node\/9002/.test(fam?.notes || ""),
  "its notes credit OpenStreetMap with the link to the map entry", "notes: " + fam?.notes);
check(fam?.pitch === "fix_website" && fam?.observation === "no_online_booking",
  "a clinic site with no booking pitches fix_website with the engine's no-booking observation (said in the message's language)", "obs: " + fam?.observation);
await osmRow(9001).getByRole("button", { name: "Add + create demo" }).click();
await osmRow(9001).getByRole("link", { name: "Open demo" }).waitFor({ timeout: 15000 });
leads = await leadsNow();
const ortho = leads.find((l) => l.placeId === "osm:node/9001");
check(ortho?.kind === "dental" && !!ortho?.demoId && ortho?.phone === "+919876543215", "Add + create demo: a dental lead with OSM's phone, linked to its demo");
const orthoDemo = await demoOf(page, ortho?.demoId);
check(orthoDemo?.templateId === "d5-ortho-aligners" && (orthoDemo?.status || "draft") === "draft" && JSON.stringify(orthoDemo).includes("Example Orthodontic Centre E2E"),
  "the demo is a draft from d5-ortho-aligners, with the clinic's name", "templateId: " + orthoDemo?.templateId);
check((await page.getByRole("status").filter({ hasText: /OpenStreetMap entry/ }).count()) === 1, "the notice says to fill the contacts from their site or the OpenStreetMap entry");
/* The default is a guess, never a verdict: pick another dental template for the kids' clinic. */
const kidsOptions = await tplPicker(osmRow(9003)).locator("option").evaluateAll((os) => os.map((o) => o.value));
check(kidsOptions.length === 7 && kidsOptions.every((v) => /^d\d-/.test(v)), "a clinic's template can be changed, to any of the seven dental templates", JSON.stringify(kidsOptions));
await tplPicker(osmRow(9003)).selectOption("d4-implant-centre");
await osmRow(9003).getByRole("button", { name: "Add + create demo" }).click();
await osmRow(9003).getByRole("link", { name: "Open demo" }).waitFor({ timeout: 15000 });
leads = await leadsNow();
const kids = leads.find((l) => l.placeId === "osm:node/9003");
const kidsDemo = await demoOf(page, kids?.demoId);
check(kids?.kind === "dental" && kidsDemo?.templateId === "d4-implant-centre", "the demo uses the template picked, not the default", "templateId: " + kidsDemo?.templateId);
check(!kids?.phone && /From OpenStreetMap/.test(kids?.notes || ""), "a clinic with no phone on OSM gets none made up, and still credits OpenStreetMap", JSON.stringify({ phone: kids?.phone }));
check(!kids?.pitch && !kids?.observation && /Website check \(unchecked\)/.test(kids?.notes || ""),
  "a site that could not be checked gives no pitch and no observation, only a note that it was not checked", JSON.stringify({ pitch: kids?.pitch, observation: kids?.observation }));

/* ── 13. Load more stays on OpenStreetMap and keeps the reason line ───── */
await page.getByRole("button", { name: "Load more" }).click();
await osmRow(9004).waitFor({ timeout: 10000 });
check(calls.searches.at(-1)?.pageToken === "osm.20", "Load more sends the OSM token");
check((await credit.innerText()).includes("No Google Maps key is saved."), "the reason Google was not used is still shown after Load more");
check(await tplText(9004) === "d3", "a Smile Studio picks d3", "template: " + (await tplText(9004)));

/* ── 14. A speciality OpenStreetMap does not have: said plainly, template by the clinic's own words ── */
await page.getByRole("button", { name: "Orthodontist or aligners" }).click();
await page.getByRole("button", { name: "Search", exact: true }).click();
await osmRow(9005).waitFor({ timeout: 10000 });
check(/no orthodontists by name in Indore, so these are all the dental clinics it lists there/.test(await credit.innerText()), "the broadened list is said in one plain line");
check(/Every Google Maps key is out of quota for today\. So this list is from OpenStreetMap, free\./.test(await credit.innerText()), "an over-quota Google key is given as the reason");
check(await tplText(9005) === "d1", "a plain clinic in a broadened list is not forced onto the ortho template (d1, from its own words)", "template: " + (await tplText(9005)));
const orthoDemoId = ortho?.demoId;
const kidsDemoId = kids?.demoId;

/* ── 15. The same finder in the CRM on its own host (crm.localhost for crm.ideovent.in) ── */
phase = "crm";
const sub = await context.newPage();
watch(sub);
const CRM_DEMO_LEAD = { id: "ol_e2e_crm_demo", createdAt: now, updatedAt: now, instituteName: "Good Academy E2E", kind: "coaching",
  placeId: "P_OK", city: "Patna", status: "new", demoId: "demo_e2e_crm", demoSlug: "good-academy-e2e" };
await sub.goto(CRM_HOST + "/login", { waitUntil: "domcontentloaded", timeout: 120000 });
await sub.evaluate(([session, key, list]) => {
  sessionStorage.setItem(session, "1");
  localStorage.setItem(key, JSON.stringify({ leads: list, events: [], settings: null }));
}, [SESSION_KEY, OUTREACH_KEY, [DUP_LEAD, CRM_DEMO_LEAD]]);
await sub.goto(CRM_HOST + "/finder", { waitUntil: "networkidle", timeout: 120000 });
const finderUp = await sub.locator('[data-testid="lead-finder"]').first().waitFor({ timeout: 60000 }).then(() => true, () => false);
check(finderUp && new URL(sub.url()).pathname === "/finder", "CRM host: the finder renders at /finder, no /crm", sub.url());
if (finderUp) {
  const keysLink = sub.getByRole("region", { name: "What it costs" }).getByRole("link", { name: "AI keys" });
  const keysHref = await hrefOf(keysLink);
  const mainOrigin = /^https?:\/\//.test(keysHref || "") ? new URL(keysHref).origin : "";
  check(!!mainOrigin && mainOrigin !== new URL(CRM_HOST).origin && keysHref === `${mainOrigin}/admin/ai-keys` && (await keysLink.getAttribute("target")) === "_blank",
    `CRM host: AI keys is an absolute link to the main site (${mainOrigin || "none"}), in a new tab`, "href: " + keysHref);
  /* Inside the finder only: the CRM's top bar has a search box of its own. */
  const finder = sub.locator('[data-testid="lead-finder"]');
  await finder.getByRole("button", { name: "JEE/NEET coaching" }).click();
  await finder.getByLabel("City", { exact: true }).fill(CITY);
  await finder.getByRole("button", { name: "Search", exact: true }).click();
  await row("P_OK", sub).waitFor({ timeout: 10000 });
  const subDup = await hrefOf(row("P_DUP", sub).getByRole("link", { name: /Already a lead/ }));
  check(subDup === "/leads/ol_e2e_dup", "CRM host: Already a lead opens /leads/<id>, no /crm", "href: " + subDup);
  const subLeads = await hrefOf(results(sub).getByRole("link", { name: "Leads", exact: true }));
  check(subLeads === "/leads", "CRM host: the footer's Leads link is /leads", "href: " + subLeads);
  const subDemo = row("P_OK", sub).getByRole("link", { name: "Open demo" });
  const subDemoHref = await hrefOf(subDemo);
  check(!!mainOrigin && subDemoHref === `${mainOrigin}/admin/c/demoSites?edit=demo_e2e_crm` && (await subDemo.getAttribute("target")) === "_blank",
    "CRM host: Open demo is an absolute link to the main site's admin, in a new tab", "href: " + subDemoHref);
  const bad = await sub.locator('[data-testid="lead-finder"] a').evaluateAll((as) => as.map((a) => a.getAttribute("href") || "").filter((h) => /^\/(crm|admin)(\/|$|\?)/.test(h)));
  check(bad.length === 0, "CRM host: no link in the finder starts with /crm or /admin", JSON.stringify(bad));
  const [tab] = await Promise.all([context.waitForEvent("page", { timeout: 8000 }).catch(() => null), subDemo.click()]);
  /* A new tab starts on about:blank for a moment; wait for the address it was sent to. */
  if (tab) await tab.waitForURL((u) => u.href === subDemoHref, { timeout: 8000 }).catch(() => {});
  check(!!tab && tab.url() === subDemoHref, "CRM host: Open demo loads the main site's admin in a new tab (a real page load, not the router)",
    `new tab: ${tab ? JSON.stringify(tab.url()) : "none"}; still on the CRM: ${new URL(sub.url()).pathname}`);
  await tab?.close().catch(() => {});
  check(opened.every((u) => /^https:\/\/(ideovent\.vercel\.app|(www\.)?ideovent\.in)\/admin\//.test(u)), "the only main-site addresses opened were admin pages (answered by the test)", JSON.stringify(opened));
}
await sub.evaluate((k) => localStorage.removeItem(k), OUTREACH_KEY).catch(() => {});
await sub.close();

/* ── 16. The Google Maps key card on AI keys (Local mode shows the notice) ─ */
await page.goto(BASE + "/admin/ai-keys", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "AI keys", level: 1 }).waitFor({ timeout: 10000 });
const keysFree = (await page.getByTestId("maps-free-usage").innerText().catch(() => "")).replace(/\s+/g, " ");
check(/7,000 free Text Searches and 7,000 free Place Details a month on India pricing/.test(keysFree) && /daily quota of 200 for each/.test(keysFree)
  && /only per-minute quotas there, they do not cap the month/.test(keysFree)
  && /card is still needed/.test(keysFree) && /OpenStreetMap for free/.test(keysFree), "AI keys says the same about free Google usage and OpenStreetMap", keysFree);

/* ── Cleanup ──────────────────────────────────────────────────────────── */
await page.evaluate(([ok, ck, ids]) => {
  localStorage.removeItem(ok);
  const data = JSON.parse(localStorage.getItem(ck) || "{}");
  data.demoSites = (data.demoSites || []).filter((x) => !ids.includes(x.id));
  data.demoSiteSlots = (data.demoSiteSlots || []).filter((x) => !ids.includes(x.id));
  localStorage.setItem(ck, JSON.stringify(data));
}, [OUTREACH_KEY, CMS_KEY, [googleDemoId, orthoDemoId, kidsDemoId].filter(Boolean)]);

const realErrors = consoleErrors.filter((e) => !/favicon|Failed to load resource|intercepted|ERR_FAILED/i.test(e));
check(realErrors.length === 0, "no console errors", "console errors: " + realErrors.slice(0, 5).join(" | "));
await browser.close();
console.log(findings.length ? "\n" + findings.length + " FAILED" : "\nALL PASSED");
process.exit(findings.length ? 1 : 0);
