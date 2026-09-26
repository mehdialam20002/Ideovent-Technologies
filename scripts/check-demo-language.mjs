/**
 * THE HINDI / ENGLISH TOGGLE, CHECKED IN A REAL BROWSER.
 *
 *   node scripts/check-demo-language.mjs [baseUrl] [--json out.json]
 *   default baseUrl http://localhost:5192 (a running `vite` dev server)
 *
 * Mehdi's bug: "English karne pe v Hindi me text rehta hai kuch jagah".
 * scripts/check-demo-lang.mjs reads template SOURCE; this one reads what a
 * parent actually SEES. For every template, it crawls every page the site
 * links to (nav, footer, sitemap, in-page links such as each course page),
 * once in English and once in Hindi, and reports:
 *
 *   EN mode  every visible text node, and every aria-label / alt / title /
 *            placeholder, the <title> and the meta description, that contains
 *            Devanagari. The only allowed Devanagari is the language toggle's
 *            own "हिन्दी" label, which sits inside [data-lang-toggle].
 *   HI mode  every text node that is exactly an English string for which a
 *            Hindi entry exists: structural copy (`{ en, hi }` pairs scanned
 *            from src/pages/site and src/lib/demo/site) and institute content
 *            (an object's plain field whose `hi` block has the same key,
 *            walked from the loaded template in the page itself).
 *   Both     <html lang> must match the mode (hi-IN / en-IN).
 *
 * It also checks the toggle: present in the header and keyboard reachable on
 * an India demo, the choice survives a reload, and it is ABSENT on a market
 * (international) demo.
 *
 * Exit 1 on any EN-mode Devanagari, any HI-mode English with a Hindi entry,
 * a wrong <html lang>, or a toggle failure.
 *
 * PROVING IT CAN FAIL: LANG_NEGATIVE=1 skips switching to English, so every
 * EN-mode page is read in Hindi and the run must exit 1.
 */
import { chromium } from "playwright-core";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:/.test(a)) || "http://localhost:5192").replace(/\/$/, "");
const jsonAt = args.indexOf("--json");
const JSON_OUT = jsonAt >= 0 ? args[jsonAt + 1] : null;
const ONLY = process.env.LANG_ONLY ? process.env.LANG_ONLY.split(",") : null;
const NEGATIVE = !!process.env.LANG_NEGATIVE;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LANG_KEY = "ideovent.demo.lang";
const SESSION_KEY = "ideovent_admin_session";
const CMS_KEY = "ideovent_cms_v1";
const DEVANAGARI = /[ऀ-ॿ]/;

const TEMPLATE_IDS = [
  "s1-urban-cbse", "s2-rural-state-board", "s3-play-school", "s4-residential", "s5-international",
  "c1-jee-neet-urban", "c2-rural-tuition", "c3-science", "c4-foundation", "c5-government-jobs",
];

// ── STRUCTURAL COPY PAIRS ───────────────────────────────────────────────────
// Every `en: "...", hi: "..."` literal in the demo site code. A text node in
// Hindi mode that equals one of these `en` values is structural copy that
// did not follow the toggle. Strings with {placeholders} become patterns.
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}
const STR = String.raw`"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\x60[^\x60]*\x60`;
const PAIR = new RegExp(String.raw`\ben:\s*(${STR})\s*,\s*hi:\s*(${STR})`, "g");
const unq = (s) => s.slice(1, -1).replace(/\\(["'\\])/g, "$1");

function structuralPairs() {
  const files = [
    ...walk(join(root, "src/pages/site")),
    ...walk(join(root, "src/lib/demo/site")),
    ...walk(join(root, "src/lib/demo/ui")),
    // Not language.ts: its only pair is the toggle naming itself (English / हिंदी).
  ];
  const pairs = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(PAIR)) {
      const en = unq(m[1]).trim();
      const hi = unq(m[2]).trim();
      if (!en || !hi || en === hi || !/[A-Za-z]{3}/.test(en)) continue;
      pairs.push({ en, hi, file: f.slice(root.length + 1).replace(/\\/g, "/") });
    }
  }
  return pairs;
}

// ── BROWSER ─────────────────────────────────────────────────────────────────
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

/**
 * Runs IN the page. Every visible text node and every reader-facing
 * attribute, with a short path so a report line can be found in the code.
 * Text inside the language toggle is skipped: its "हिंदी" is the control.
 */
function scanPage() {
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  const out = [];
  const where = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      const cls = (e.getAttribute("class") || "").split(/\s+/).find((c) => /^(ds-|dc-|site-)/.test(c));
      if (e.id) s += "#" + e.id;
      else if (cls) s += "." + cls;
      parts.unshift(s);
    }
    return parts.join(">");
  };
  const inToggle = (el) => !!el.closest("[data-lang-toggle]");
  const hidden = (el) => {
    // Reported either way (the menu dialog is display:none until opened);
    // the flag only tells the reader of the report where to look.
    const cs = getComputedStyle(el);
    return cs.display === "none" || cs.visibility === "hidden";
  };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const el = n.parentElement;
    if (!el || SKIP.has(el.tagName) || inToggle(el)) continue;
    const text = n.nodeValue.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const langEl = el.closest("[lang]");
    out.push({ kind: "text", text, where: where(el), lang: langEl ? langEl.getAttribute("lang") : null, hidden: hidden(el) });
  }
  for (const el of document.body.querySelectorAll("[aria-label],[alt],[title],[placeholder]")) {
    if (inToggle(el)) continue;
    for (const a of ["aria-label", "alt", "title", "placeholder"]) {
      const v = el.getAttribute(a);
      if (v && v.trim()) out.push({ kind: "@" + a, text: v.trim(), where: where(el), lang: null, hidden: false });
    }
  }
  out.push({ kind: "<title>", text: document.title, where: "head", lang: null, hidden: false });
  const md = document.querySelector('meta[name="description"]');
  if (md) out.push({ kind: "meta description", text: md.getAttribute("content") || "", where: "head", lang: null, hidden: false });
  const toggle = document.querySelector("[data-lang-toggle]");
  return {
    items: out,
    htmlLang: document.documentElement.getAttribute("lang"),
    toggle: !!toggle,
    toggleVisible: !!toggle && toggle.getBoundingClientRect().width > 0,
    links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
    path: location.pathname,
  };
}

/**
 * Runs IN the page, through the dev server's module graph: the template's
 * own content, walked for every object whose `hi` block holds a Hindi twin
 * of a plain English field. Returns [{ en, hi, key }].
 */
async function contentPairs(id) {
  const reg = await import("/src/lib/demo/templates/index.ts");
  const t = await reg.loadTemplate(id);
  const site = reg.templatePreviewSite(t);
  const pairs = [];
  const notHindi = [];
  const seen = new Set();
  const visit = (o) => {
    if (!o || typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o)) return o.forEach(visit);
    const hi = o.hi && typeof o.hi === "object" ? o.hi : null;
    if (hi) {
      for (const [k, v] of Object.entries(hi)) {
        const en = o[k];
        // A Hindi slot that holds a long English sentence is a Hindi-mode leak.
        // (an exact copy of the English is a proper name kept on purpose)
        if (typeof v === "string" && v.trim() !== String(en || "").trim() && v.trim().length >= 25 && !/[ऀ-ॿ]/.test(v)) notHindi.push({ key: k, text: v.trim() });
        if (typeof v === "string" && typeof en === "string" && v.trim() && en.trim() && v.trim() !== en.trim())
          pairs.push({ en: en.trim().replace(/\s+/g, " "), hi: v.trim(), key: k });
      }
    }
    for (const [k, v] of Object.entries(o)) if (k !== "hi") visit(v);
  };
  visit(site);
  return { pairs, notHindi, market: site.market || null, defaultLang: site.defaultLang || null };
}

// ── CRAWL ───────────────────────────────────────────────────────────────────
const norm = (s) => s.replace(/\s+/g, " ").trim();
const clean = (href, base) => {
  if (!href || !href.startsWith(base)) return null;
  return href.split(/[?#]/)[0].replace(/\/$/, "") || base;
};

/** Every page the site links to, starting from its home. */
async function crawl(page, base, limit = 80) {
  const todo = [base];
  const seen = new Set(todo);
  const pages = [];
  while (todo.length && pages.length < limit) {
    const url = todo.shift();
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const got = await page.evaluate(scanPage);
    pages.push({ url, ...got });
    for (const h of got.links) {
      const c = clean(h, base);
      if (c && !seen.has(c)) {
        seen.add(c);
        todo.push(c);
      }
    }
  }
  return pages;
}

/** A path + index for placeholder copy such as "Batch starts {date}". */
function toMatcher(en) {
  if (!/\{\w+\}/.test(en)) return null;
  // Too little literal text matches anything ("About {name}" vs "About ₹11,000").
  if (en.replace(/\{\w+\}/g, "").replace(/\W/g, "").length < 10) return null;
  const parts = en.split(/\{\w+\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp("^" + parts.join(".+?") + "$");
}

function enLeaks(pages) {
  const leaks = [];
  for (const p of pages) {
    for (const it of p.items) if (DEVANAGARI.test(it.text)) leaks.push({ url: p.url, ...it });
    if (p.htmlLang !== "en-IN") leaks.push({ url: p.url, kind: "html lang", text: String(p.htmlLang), where: "html" });
  }
  return leaks;
}

function hiLeaks(pages, pairs) {
  const exact = new Map();
  const patterns = [];
  for (const pr of pairs) {
    const m = toMatcher(pr.en);
    if (m) patterns.push({ m, pr });
    else if (!exact.has(pr.en)) exact.set(pr.en, pr);
  }
  const leaks = [];
  for (const p of pages) {
    for (const it of p.items) {
      if (it.kind === "<title>" || it.lang === "en") continue; // a deliberate lang="en" fallback is honest
      const t = norm(it.text);
      const hit = exact.get(t) || patterns.find((x) => x.m.test(t))?.pr;
      if (hit) leaks.push({ url: p.url, ...it, hi: hit.hi, from: hit.file || "content:" + hit.key });
    }
    if (p.htmlLang !== "hi-IN") leaks.push({ url: p.url, kind: "html lang", text: String(p.htmlLang), where: "html" });
  }
  return leaks;
}

// ── TOGGLE ──────────────────────────────────────────────────────────────────
// Two fictional sent records with only a name and a city: an India one (the
// toggle must be there) and an international one (it must not).
const RECORDS = [
  { id: "lang-e2e-in-school", instituteName: "Riverbend Public School", slug: "lang-e2e-riverbend", kind: "school", market: "india", city: "Lucknow", status: "sent", theme: "metro" },
  { id: "lang-e2e-in-coaching", instituteName: "Northstar Classes", slug: "lang-e2e-northstar", kind: "coaching", market: "india", city: "Kota", status: "sent", theme: "podium" },
  { id: "lang-e2e-intl", instituteName: "Harbour Lane School", slug: "lang-e2e-harbour", kind: "school", market: "international", country: "United Kingdom", city: "Leeds", status: "sent", theme: "metro" },
];

async function seed(page, lang) {
  await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([cms, session, recs, key, lang]) => {
      const raw = localStorage.getItem(cms);
      const data = raw ? JSON.parse(raw) : {};
      const ids = new Set(recs.map((r) => r.id));
      data.demoSites = [...(data.demoSites || []).filter((d) => !ids.has(d.id)), ...recs];
      localStorage.setItem(cms, JSON.stringify(data));
      sessionStorage.setItem(session, "1");
      if (lang) localStorage.setItem(key, lang);
      else localStorage.removeItem(key);
    },
    [CMS_KEY, SESSION_KEY, RECORDS, LANG_KEY, lang],
  );
}

async function toggleChecks(browser, problems) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await seed(page, null);
  for (const slug of ["lang-e2e-riverbend", "lang-e2e-northstar"]) {
    await page.goto(`${BASE}/site/${slug}`, { waitUntil: "networkidle" });
    const t = page.locator(".ds-header [data-lang-toggle]").first();
    if (!(await t.count()) || !(await t.isVisible())) {
      problems.push(`toggle: not visible in the header at phone width on /site/${slug}`);
      continue;
    }
    // Keyboard: Tab from the top until focus reaches the Hindi button.
    let reached = false;
    await page.locator("body").focus();
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => !!document.activeElement?.closest("[data-lang-toggle]"));
    }
    if (!reached) problems.push(`toggle: not reachable by Tab within 40 presses on /site/${slug}`);
    await t.locator('button[lang="hi"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.documentElement.lang);
    if (after !== "hi-IN") problems.push(`toggle: Enter on Hindi left <html lang="${after}"> on /site/${slug}`);
    await page.reload({ waitUntil: "networkidle" });
    const kept = await page.evaluate(() => document.documentElement.lang);
    if (kept !== "hi-IN") problems.push(`toggle: choice did not survive a reload on /site/${slug} (lang ${kept})`);
    await page.locator('.ds-header [data-lang-toggle] button[lang="en"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(150);
    const back = await page.evaluate(() => document.documentElement.lang);
    if (back !== "en-IN") problems.push(`toggle: English click left <html lang="${back}"> on /site/${slug}`);
  }
  await page.goto(`${BASE}/site/lang-e2e-harbour`, { waitUntil: "networkidle" });
  if (await page.locator("[data-lang-toggle]").count()) problems.push("toggle: present on an international (market) demo");
  const intlLang = await page.evaluate(() => document.documentElement.lang);
  if (/^hi/.test(intlLang)) problems.push(`toggle: international demo has <html lang="${intlLang}">`);
  const intlBody = await page.evaluate(() => document.body.innerText);
  if (DEVANAGARI.test(intlBody)) problems.push("toggle: Devanagari on an international demo");
  // Storage that throws must not break the page.
  const strict = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const sp = await strict.newPage();
  await seed(sp, "hi");
  // Only the language key throws: the CMS store itself lives in localStorage
  // on the dev server, and the record has to be found for the page to exist.
  await sp.addInitScript((key) => {
    const g = Storage.prototype.getItem;
    const s = Storage.prototype.setItem;
    Storage.prototype.getItem = function (k) { if (k === key) throw new Error("blocked"); return g.call(this, k); };
    Storage.prototype.setItem = function (k, v) { if (k === key) throw new Error("blocked"); return s.call(this, k, v); };
  }, LANG_KEY);
  const perr = [];
  sp.on("pageerror", (e) => perr.push(String(e)));
  await sp.goto(`${BASE}/site/lang-e2e-riverbend`, { waitUntil: "networkidle" }).catch((e) => perr.push(String(e)));
  const ok = await sp.locator("[data-lang-toggle]").count();
  if (!ok) problems.push("toggle: page without working storage lost the toggle (or did not render)");
  else {
    await sp.locator('.ds-header [data-lang-toggle] button[lang="hi"]').first().click({ timeout: 5000 }).catch((e) => perr.push(String(e).split(String.fromCharCode(10))[0]));
    const l = await sp.evaluate(() => document.documentElement.lang);
    if (l !== "hi-IN") problems.push(`toggle: with blocked storage, Hindi click gave lang ${l}`);
  }
  if (perr.length) problems.push("toggle: page errors with blocked storage: " + perr.slice(0, 2).join(" | "));
  if (errors.length) problems.push("toggle: page errors: " + errors.slice(0, 2).join(" | "));
  await strict.close();
  await ctx.close();
}

// ── MAIN ────────────────────────────────────────────────────────────────────
const browser = await launch();
const structural = structuralPairs();
const report = { base: BASE, date: new Date().toISOString(), templates: {}, records: {}, toggle: [] };
let failures = 0;

async function readSite(base, lang, pairs) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await seed(page, NEGATIVE && lang === "en" ? "hi" : lang);
  const pages = await crawl(page, base);
  await ctx.close();
  const leaks = lang === "en" ? enLeaks(pages) : hiLeaks(pages, pairs);
  leaks.crawled = pages.map((p) => p.url);
  return leaks;
}

const brief = (l) => `    ${l.url.split("/").slice(-2).join("/")}  [${l.kind}${l.hidden ? ", hidden" : ""}] ${JSON.stringify(l.text.slice(0, 90))}  @ ${l.where}${l.hi ? `  -> hi ${JSON.stringify(l.hi.slice(0, 50))} (${l.from})` : ""}`;

for (const id of TEMPLATE_IDS) {
  if (ONLY && !ONLY.includes(id)) continue;
  const base = `/admin/preview/template/${id}`;
  const probe = await browser.newPage();
  await seed(probe, "en");
  await probe.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const content = await probe.evaluate(contentPairs, id);
  await probe.close();
  const pairs = [...structural, ...content.pairs];
  const en = await readSite(base, "en", pairs);
  const hi = await readSite(base, "hi", pairs);
  for (const x of content.notHindi) hi.push({ url: "template source", kind: "hi." + x.key + " holds no Hindi", text: x.text, where: id });
  const pageCount = new Set([...en, ...hi].map((l) => l.url)).size;
  report.templates[id] = { en, hi };
  failures += en.length + hi.length;
  console.log(`${en.length || hi.length ? "FAIL" : "ok  "}  ${id}: EN ${en.length} Devanagari, HI ${hi.length} English-with-Hindi (${en.crawled.length} pages crawled, ${pageCount} with a finding)`);
  for (const l of en) console.log(brief(l));
  for (const l of hi) console.log(brief(l));
}

for (const r of RECORDS.filter((r) => r.market === "india")) {
  if (ONLY && !ONLY.includes(r.slug)) continue;
  const en = await readSite(`/site/${r.slug}`, "en", structural);
  const hi = await readSite(`/site/${r.slug}`, "hi", structural);
  report.records[r.slug] = { en, hi };
  failures += en.length + hi.length;
  console.log(`${en.length || hi.length ? "FAIL" : "ok  "}  record ${r.slug} (name and city only): EN ${en.length}, HI ${hi.length}`);
  for (const l of [...en, ...hi]) console.log(brief(l));
}

if (!ONLY) {
  await toggleChecks(browser, report.toggle);
  failures += report.toggle.length;
  console.log(`${report.toggle.length ? "FAIL" : "ok  "}  toggle: ${report.toggle.length} problem(s)`);
  for (const p of report.toggle) console.log("    " + p);
}

await browser.close();
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
console.log(`\ncheck-demo-language: ${failures} finding(s) across ${Object.keys(report.templates).length} templates.`);
process.exit(failures ? 1 : 0);
