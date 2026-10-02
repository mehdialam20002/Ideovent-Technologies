/**
 * Tests the template system: the registry, and above all `fromTemplate`,
 * which makes a demo from a template.
 *
 *   node scripts/test-from-template.mjs
 *
 * THE RULE UNDER TEST (26 September 2026, Mehdi's brief). A duplicate carries
 * THE WHOLE TEMPLATE, already filled, under the institute's name. The table
 * is at the top of src/lib/demo/templates/fromTemplate.ts; this file asserts
 * it for every template (five school, five coaching, seven dental) and several names (one with an apostrophe, one
 * with a Hindi name, one with a new city):
 *
 *   1. CONTENT: every kept field has the template's exact shape, every
 *      non-string leaf is equal, and every string equals the template's
 *      string with the name (and city, when one is typed) replaced, English
 *      and Hindi. The expected string is computed HERE, by a second
 *      implementation, not by calling fromTemplate's renamer;
 *   2. CONTACT is cleared: phone, WhatsApp, email, address, map, branches,
 *      their website, the disclosure's address/email/phone rows, and none of
 *      the template's phone numbers or emails survives anywhere;
 *   3. IDENTITY is new: id, slug from the name (unique), draft, templateId;
 *   4. NO FORM OF THE TEMPLATE'S NAME appears anywhere in the serialised
 *      copy; the Hindi name, when typed, is what the Hindi twins say;
 *   5. PHOTOS are carried; the copy shares no object with the template and
 *      the template is not mutated;
 *   6. SAMPLE marks: results and reviews carry the sample line until edited
 *      or marked real. The founding story and year (30 Sep 2026) carry their
 *      own line on the About page until edited, whatever the switch says; a
 *      record made before that block (no story print) shows no story line
 *      and its checklist is exactly what it was;
 *   7. THE HINDI SLOTS: a line naming the template, planted in each Hindi
 *      slot, is renamed like every other Hindi string;
 *   8. THE SHORT NAME (1 Oct 2026) is empty in both languages, so the English
 *      page never reads the Hindi one through bi()'s fallback (the English
 *      Contact title printed the Devanagari name), and each page names the
 *      clinic in its own language;
 *   9. THE HERO'S DOCTOR LINE (1 Oct 2026, dental): the kids and calm heroes
 *      name the template's sample doctor, so the line ends in "(sample)"
 *      while the doctors block is the template's, never twice, and never
 *      on a line that names somebody else.
 *
 * HOW IT RUNS WITHOUT A TEST RUNNER. esbuild (the WebAssembly build is what
 * node_modules/esbuild is on this machine) bundles the real TypeScript modules
 * into one file, with the `@/` alias and Vite's `?raw` imports handled by a
 * small plugin, and the result is imported. Nothing is mocked: this is the
 * same fromTemplate the admin calls.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   FROM_TEMPLATE_NEGATIVE=1 node scripts/test-from-template.mjs
 *
 * skips fromTemplate's Hindi replacement (every `hi` block of the copy is
 * the template's own), so the Hindi twins keep the template's name. Every one of the
 * ten templates must then FAIL. If that run passes, the assertions are not
 * reaching the Hindi copy and a green run means nothing.
 *
 *   FROM_TEMPLATE_NEGATIVE=short node scripts/test-from-template.mjs
 *
 * keeps the template's Hindi short name on the copy, renamed, as
 * fromTemplate did until 1 Oct 2026. Exactly the templates that carry one
 * (the seven dental ones) must then fail the short-name checks (8).
 *
 *   FROM_TEMPLATE_NEGATIVE=hero node scripts/test-from-template.mjs
 *
 * reads the hero's doctor line with no mark at all, as the page did until
 * 1 Oct 2026. d6 (kids) and d7 (calm) must then fail checks (9).
 */
import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
/* "short" and "hero" are the two narrow controls above; any other value skips the Hindi replacement. */
const NEGATIVE_MODE = process.env.FROM_TEMPLATE_NEGATIVE || "";
const NEGATIVE = Boolean(NEGATIVE_MODE);
const KEEP_HI_SHORT = NEGATIVE_MODE === "short";
const NO_HERO_MARK = NEGATIVE_MODE === "hero";
const SKIP_HINDI = NEGATIVE && !KEEP_HI_SHORT && !NO_HERO_MARK;

/* ── Bundle the real modules ─────────────────────────────────────────────── */

const entry = `
export * from "@/lib/demo/templates/fromTemplate";
export { TEMPLATES, TEMPLATE_IDS, loadTemplate, templatePreviewSite, DESIGN_FAMILIES, DESIGN_FAMILY_IDS, KIND_FAMILY_IDS, TEMPLATE_SEGMENTS, isTemplateSlug } from "@/lib/demo/templates";
export { visiblePages, matchPage, pagesOfKind } from "@/lib/demo/site/pages";
export { DENTAL_PAGE_SETS } from "@/lib/demo/site/pageSets";
export { demoSlugIssue } from "@/lib/demo/reservedRoutes";
export { resolveDemoSite, isWellFormedDemoSlug } from "@/lib/demo/record";
export { samplePrints, showSampleLine, isCarried, SAMPLE_BLOCKS, SAMPLE_BLOCK_LABEL, SAMPLE_COPY } from "@/lib/demo/site/sample";
export { STOCK_PHOTOS, getStockPhoto, isStockPhoto, stockPhoto, facultyPhotoSrc, stockPhotoUse, DEMO_PHOTO_SLOTS } from "@/lib/demo/images";
export { demoFormFields, NOT_ON_A_CLINIC } from "@/admin/demoSiteFormFields";
export { collectionSchemas, pitchPackageOptionsFor } from "@/admin/schemas";
export { pitchPackage, PITCH_PACKAGES } from "@/lib/pitch/record";
export { EMPTY_COPY, SHELL_COPY } from "@/lib/demo/site/copy";
export { bi } from "@/lib/demo/site/bilingual";
export { heroCredential, heroDoctorMark, leadDoctorCredit, SAMPLE_MARK } from "@/lib/demo/ui/dental/logic";
`;

const aliasAndRaw = {
  name: "alias-and-raw",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      const [p, q] = args.path.split("?");
      const base = join(SRC, p.slice(2));
      return q === "raw"
        ? { path: base, namespace: "raw" }
        : { path: resolveTs(base) };
    });
    b.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: resolve(args.resolveDir, args.path.replace(/\?raw$/, "")),
      namespace: "raw",
    }));
    b.onLoad({ filter: /.*/, namespace: "raw" }, (args) => ({
      contents: `export default ${JSON.stringify(readFileSync(args.path, "utf8"))};`,
      loader: "js",
    }));
  },
};

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch {
      /* next */
    }
  }
  return base;
}

const out = join(tmpdir(), `ideovent-test-from-template-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [aliasAndRaw],
  /* The page registry's lazy imports reach page components and their CSS. */
  loader: { ".css": "empty" },
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/* ── Assertion plumbing ──────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
function check(ok, message) {
  if (ok) passes++;
  else {
    failures.push(message);
    console.log("FAIL  " + message);
  }
}

/* Built from its code point so this file itself contains no em dash. */
const EM_DASH = new RegExp(String.fromCharCode(8212));

const json = (v) => JSON.stringify(v === undefined ? null : v);
const equal = (a, b) => json(a) === json(b);

function isEmpty(v) {
  if (v === undefined || v === null || v === "" || v === false) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.values(v).every(isEmpty);
  return false;
}

/* ── 1. The registry ─────────────────────────────────────────────────────── */

const { TEMPLATES, TEMPLATE_IDS, DESIGN_FAMILIES, KIND_FAMILY_IDS, TEMPLATE_SEGMENTS } = M;

/* Five school, five coaching, and (28 Sep 2026) seven dental. */
const PER_KIND = { school: 5, coaching: 5, dental: 7 };
const TOTAL = Object.values(PER_KIND).reduce((a, b) => a + b, 0);
check(TEMPLATES.length === TOTAL, `the registry lists ${TOTAL} templates (found ${TEMPLATES.length})`);
check(new Set(TEMPLATES.map((t) => t.id)).size === TEMPLATES.length, "every registry id is unique");
check(
  TEMPLATE_IDS.every((id) => TEMPLATES.some((t) => t.id === id)),
  "every id in ids.ts has a registry entry",
);
for (const kind of Object.keys(PER_KIND)) {
  const of = TEMPLATES.filter((t) => t.kind === kind);
  check(of.length === PER_KIND[kind], `${PER_KIND[kind]} ${kind} templates (found ${of.length})`);
  check(
    new Set(of.map((t) => t.theme)).size === of.length,
    `no two ${kind} templates share a theme`,
  );
  for (const f of KIND_FAMILY_IDS[kind]) {
    check(of.some((t) => t.designFamily === f), `the ${f} family has a ${kind} template`);
  }
  check(of.every((t) => KIND_FAMILY_IDS[kind].includes(t.designFamily)), `every ${kind} template is filed under a ${kind} family`);
}
for (const seg of TEMPLATE_SEGMENTS) {
  check(TEMPLATES.some((t) => t.segment === seg), `the ${seg} segment has a template`);
}
for (const t of TEMPLATES) {
  check(
    DESIGN_FAMILIES[t.designFamily].themes[t.kind].includes(t.theme),
    `${t.id}: theme ${t.theme} belongs to the ${t.designFamily} family for ${t.kind}`,
  );
  check(!EM_DASH.test(t.label + t.description), `${t.id}: no em dash in the label or description`);
}

/* ── 2. Every template through fromTemplate, under several names ─────────── */

const NOW = new Date("2026-09-25T10:00:00.000Z");

/* Two records already in the collection, so slug and id uniqueness are
   tested rather than assumed. */
const EXISTING = [
  { id: "ds_existing_1", slug: "riverbend-public-school", status: "draft", kind: "school", instituteName: "Somebody" },
  { id: "ds_fixed", slug: "some-institute", status: "sent", kind: "coaching", instituteName: "Somebody else" },
];

const NAMES = [
  { name: "Riverbend Public School", hiName: "रिवरबेंड पब्लिक स्कूल" },
  { name: "St. Mary's Convent School" },
  { name: "Apex Classes", city: "Patna" },
  /* d1's own city: the city stays, the neighbourhood still goes (30 Sep 2026). */
  { name: "Example Care Clinic", city: "Lucknow" },
];

/* The neighbourhood each single-clinic dental template names beside its
   city, in both scripts. Written here from the content files, not read from
   fromTemplate, so an area its table forgets still fails this test. With a
   city typed, none of them may survive (30 Sep 2026: a d4 demo for Indore
   read "Dental implant centre, Baner, Indore"). */
const AREAS = {
  "d1-family-dentist": ["Gomti Nagar", "गोमती नगर"],
  "d2-multispeciality": ["Kondapur", "कोंडापुर"],
  "d3-smile-studio": ["Bandra West", "बांद्रा वेस्ट"],
  "d4-implant-centre": ["Baner", "बाणेर"],
  "d5-ortho-aligners": ["Malviya Nagar", "मालवीय नगर"],
  "d6-kids-dental": ["Sector 35", "सेक्टर 35"],
};

/* An independent list of each template's distinctive name word, in both
   scripts. Written here, not read from fromTemplate, so a form the table in
   fromTemplate forgets still fails this test. */
const NAME_WORDS = {
  "s1-urban-cbse": ["Harsingar", "हरसिंगार"],
  "s2-rural-state-board": ["Kachnar", "कचनार"],
  "s3-play-school": ["Gilhari", "गिलहरी"],
  "s4-residential": ["Buransh", "बुरांश"],
  "s5-international": ["Semal", "सेमल"],
  "c1-jee-neet-urban": ["Parallax", "पैरेलैक्स", "पैरालैक्स"],
  "c2-rural-tuition": ["Nav Prabhat", "नव प्रभात"],
  "c3-science": ["Meniscus", "मेनिस्कस"],
  "c4-foundation": ["Tangram", "टैंग्राम"],
  "c5-government-jobs": ["Kasauti", "कसौटी"],
  "d1-family-dentist": ["Sheesham", "शीशम"],
  "d2-multispeciality": ["Palash", "पलाश"],
  "d3-smile-studio": ["Mogra", "मोगरा"],
  "d4-implant-centre": ["Deodar", "देवदार"],
  "d5-ortho-aligners": ["Bakul", "बकुल"],
  "d6-kids-dental": ["Tesu", "टेसू"],
  "d7-dental-chain": ["Mahua", "महुआ"],
};

/* The dental block as a duplicate must hold it: a second implementation of
   clearedDental in fromTemplate.ts, written here from DENTAL-ARCHITECTURE.md. */
const BRANCH_CLEARED = ["addressLines", "phone", "whatsapp", "mapQuery", "mapUrl", "landmark", "access", "parking", "transit"];
function expectedDental(d) {
  if (!d) return d;
  const w = structuredClone(d);
  for (const b of w.branches || []) {
    for (const k of BRANCH_CLEARED) delete b[k];
    if (b.hi) for (const k of ["addressLines", "landmark", "access", "parking", "transit"]) delete b.hi[k];
  }
  if (w.emergency) { delete w.emergency.phone; delete w.emergency.whatsapp; }
  delete w.reach;
  return w;
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-word regex over any script: no letter, mark or digit on either side. */
function wordRe(forms, flags = "gu") {
  const list = [...new Set(forms.map((f) => (f || "").trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!list.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${list.map(escRe).join("|")})(?![\\p{L}\\p{M}\\p{N}])`, flags);
}

/** The second implementation: what one string of the template should become. */
function expecter(t, who, table) {
  const c = t.content;
  const en = [c.instituteName, c.shortName, ...table.en];
  const oldCity = (c.city || "").trim();
  const moving = Boolean(who.city) && who.city.toLowerCase() !== oldCity.toLowerCase();
  const pair = moving && oldCity && c.state ? wordRe([`${oldCity}, ${c.state}`]) : null;
  const city = moving ? wordRe([oldCity, ...table.cityHi]) : null;
  /* With a city typed: "<area>, " before the template's city goes, and any
     other mention of the area becomes the city (the template's own spelling,
     Devanagari in Hindi, when the city stays). */
  const areas = who.city ? AREAS[t.meta.id] || [] : [];
  const cityWords = wordRe([oldCity, ...table.cityHi]);
  const areaPrefix = areas.length && cityWords ? new RegExp(`${wordRe(areas).source}, (?=${cityWords.source})`, "gu") : null;
  const area = areas.length ? wordRe(areas) : null;
  const here = (inHi) => (moving ? who.city : (inHi && table.cityHi[0]) || oldCity);
  const enRe = wordRe(en);
  const hiRe = wordRe(table.hi);
  return (s, inHi) => {
    const nn = inHi ? who.hiName || who.name : who.name;
    let o = s;
    if (areaPrefix) o = o.replace(areaPrefix, "");
    if (pair) o = o.replace(pair, () => who.city);
    if (city) o = o.replace(city, () => who.city);
    if (area) o = o.replace(area, () => here(inHi));
    if (enRe) o = o.replace(enRe, () => nn);
    if (hiRe) o = o.replace(hiRe, () => nn);
    return o;
  };
}

/** Walks template and copy together; every difference is a message. */
function compare(tv, cv, path, inHi, expect, diffs) {
  if (diffs.length > 5) return;
  if (typeof tv === "string") {
    const want = expect(tv, inHi);
    if (cv !== want) diffs.push(`${path}: expected ${JSON.stringify(want).slice(0, 90)}, got ${JSON.stringify(cv).slice(0, 90)}`);
    return;
  }
  if (Array.isArray(tv)) {
    if (!Array.isArray(cv) || cv.length !== tv.length) { diffs.push(`${path}: array length ${tv.length} vs ${Array.isArray(cv) ? cv.length : typeof cv}`); return; }
    tv.forEach((x, i) => compare(x, cv[i], `${path}[${i}]`, inHi, expect, diffs));
    return;
  }
  if (tv && typeof tv === "object") {
    if (!cv || typeof cv !== "object") { diffs.push(`${path}: object missing`); return; }
    const tk = Object.keys(tv).filter((k) => tv[k] !== undefined).sort();
    const ck = Object.keys(cv).filter((k) => cv[k] !== undefined).sort();
    if (json(tk) !== json(ck)) { diffs.push(`${path}: keys ${json(tk).slice(0, 80)} vs ${json(ck).slice(0, 80)}`); return; }
    for (const k of tk) compare(tv[k], cv[k], `${path}.${k}`, inHi || k === "hi", expect, diffs);
    return;
  }
  if (tv !== cv) diffs.push(`${path}: ${json(tv)} vs ${json(cv)}`);
}

function objectsIn(v, set = new Set()) {
  if (v && typeof v === "object") {
    set.add(v);
    for (const x of Object.values(v)) objectsIn(x, set);
  }
  return set;
}

/* Fields that are not compared leaf by leaf, because the policy changes them. */
const NOT_CONTENT = new Set(["instituteName", "shortName", "city", "state", "contact", "officialWebsite", "disclosure", "dental"]);

/* The expected copy is computed from this snapshot, taken before any sabotage. */
const TABLE = structuredClone(M.TEMPLATE_NAMES);
/**
 * The sabotage for the NEGATIVE run: fromTemplate with its Hindi replacement
 * skipped. Every `hi` block of the copy is put back to the template's own,
 * untouched, which is what a renamer that ignored the Hindi twins produces.
 */
function skipHindi(copy, template) {
  const walk = (cv, tv) => {
    if (!cv || typeof cv !== "object" || !tv || typeof tv !== "object") return;
    for (const k of Object.keys(cv)) {
      if (k === "hi" && tv[k] !== undefined) cv[k] = structuredClone(tv[k]);
      else walk(cv[k], tv[k]);
    }
  };
  walk(copy, template);
  return copy;
}
/**
 * The sabotage for FROM_TEMPLATE_NEGATIVE=short: the copy keeps the
 * template's Hindi short name, renamed, which is what fromTemplate did
 * before 1 Oct 2026.
 */
function keepHiShort(copy, template, expect) {
  const hs = template.hi?.shortName;
  if (hs) copy.hi = { ...(copy.hi || {}), shortName: expect(hs, true) };
  return copy;
}
const sabotage = (copy, template, expect) =>
  KEEP_HI_SHORT ? keepHiShort(copy, template, expect) : SKIP_HINDI ? skipHindi(copy, template) : copy;
const failedTemplates = new Set();
/* The templates that carry a Hindi short name, and those that failed check 8. */
const withHiShort = new Set();
const failedShort = new Set();

for (const meta of TEMPLATES) {
  const t = await M.loadTemplate(meta.id);
  check(t && t.meta.id === meta.id, `${meta.id}: loads through the registry`);
  if (!t) continue;
  const c = t.content;
  const before = json(c);
  check(!EM_DASH.test(before), `${meta.id}: no em dash anywhere in the template's content`);
  const source = { ...c, kind: meta.kind, theme: meta.theme };
  const table = TABLE[meta.id];
  const templateObjects = objectsIn(c);

  for (const who of NAMES) {
    const tag = `${meta.id} as "${who.name}"`;
    const tcheck = (ok, msg) => { if (!ok) failedTemplates.add(meta.id); check(ok, `${tag}: ${msg}`); };
    const ctx = { sites: EXISTING, pitchPages: [], now: NOW, newId: () => "ds_fixed" };
    const expect = expecter(t, who, table);
    const copy = sabotage(M.fromTemplate(t, ctx, who), source, expect);
    const cj = json(copy);

    /* 1. CONTENT */
    const moving = Boolean(who.city) && who.city.toLowerCase() !== (c.city || "").trim().toLowerCase();
    const diffs = [];
    for (const k of Object.keys(source)) {
      if (NOT_CONTENT.has(k) || source[k] === undefined) continue;
      /* hi.instituteName is the typed Hindi name, not template copy: checked below.
         hi.state leaves with the English state when the city moves: checked below.
         hi.shortName leaves with the English short name (1 Oct 2026): check 8. */
      const noName = (h) => (h ? (({ instituteName: _n, ...rest }) => rest)(h) : h);
      const noState = (h) => (h && moving ? (({ state: _s, ...rest }) => rest)(h) : h);
      const noShort = (h) => (h ? (({ shortName: _h, ...rest }) => rest)(h) : h);
      compare(k === "hi" ? noShort(noState(noName(source[k]))) : source[k], k === "hi" ? noName(copy[k]) : copy[k], k, k === "hi", expect, diffs);
    }
    if (moving) tcheck(copy.hi?.state === undefined, "the template's Hindi state goes with its English one");
    if (c.disclosure) {
      const want = structuredClone(c.disclosure);
      for (const r of ["address", "email", "phone"]) if (want.rows) delete want.rows[r];
      compare(want, copy.disclosure, "disclosure", false, expect, diffs);
    }
    compare(c.contact?.hours || "", copy.contact?.hours || "", "contact.hours", false, expect, diffs);
    if (c.dental) compare(expectedDental(c.dental), copy.dental, "dental", false, expect, diffs);
    tcheck((copy.hi?.instituteName || "") === (who.hiName || "").trim(), "hi.instituteName holds the Hindi name typed, and only that");

    /* 8. THE SHORT NAME (1 Oct 2026). Pages read it with bi(), which falls
       back to the Hindi value when the English is empty: a kept hi.shortName
       put the Devanagari name in the English Contact page's title. The
       names below are read exactly as that title reads them. */
    if (c.hi?.shortName) withHiShort.add(meta.id);
    const enShown = M.bi(copy, "shortName", "en") || M.bi(copy, "instituteName", "en");
    const hiShown = M.bi(copy, "shortName", "hi") || M.bi(copy, "instituteName", "hi");
    const shortChecks = [
      [copy.shortName === "" && copy.hi?.shortName === undefined, `the short name is empty and its Hindi twin is gone (hi.shortName ${JSON.stringify(copy.hi?.shortName)})`],
      [enShown === who.name && !/[ऀ-ॿ]/.test(enShown), `the English page names the clinic in English (${enShown})`],
      [hiShown === (who.hiName || who.name), `the Hindi page names it by the Hindi name typed, else the English one (${hiShown})`],
    ];
    for (const [ok, msg] of shortChecks) {
      if (!ok) failedShort.add(meta.id);
      tcheck(ok, msg);
    }
    tcheck(diffs.length === 0, `content equals the template's with the name replaced${diffs.length ? "\n      " + diffs.join("\n      ") : ""}`);

    /* 2. CONTACT */
    const ct = copy.contact || {};
    tcheck(!ct.phone && !ct.whatsapp && !ct.email && !ct.mapUrl && !ct.mapQuery, "phone, WhatsApp, email and map are empty");
    tcheck(!(ct.addressLines || []).some(Boolean) && !ct.landmark, "the address is empty");
    tcheck(!(ct.branches || []).length && !ct.transportDesk, "branches and the transport desk are gone");
    tcheck(!copy.officialWebsite, "their website is empty");
    tcheck(!["address", "email", "phone"].some((r) => copy.disclosure?.rows?.[r]), "the disclosure's contact rows are gone");
    if (meta.kind === "dental") {
      const d = copy.dental || {};
      tcheck(!d.emergency?.phone && !d.emergency?.whatsapp, "the emergency line is empty");
      tcheck(!d.reach, "how-to-reach is gone");
      tcheck((d.branches || []).every((b) => BRANCH_CLEARED.every((k) => b[k] === undefined)), "every branch's address, phone, map and access are gone");
      tcheck((d.branches || []).length === (c.dental?.branches || []).length, "branch names are kept");
    }
    const dentalLeaks = [c.dental?.emergency?.phone, c.dental?.emergency?.whatsapp, ...(c.dental?.branches || []).flatMap((b) => [b.phone, b.whatsapp, (b.addressLines || [])[0]])];
    const leaks = [c.contact?.phone, c.contact?.email, c.contact?.whatsapp, ...(c.contact?.addressLines || []).slice(0, 1), ...dentalLeaks]
      .map((s) => (s || "").trim()).filter((s) => s.length >= 6);
    const leaked = leaks.filter((s) => cj.includes(JSON.stringify(s).slice(1, -1)));
    tcheck(leaked.length === 0, `no template contact detail survives anywhere (${leaked.join(", ")})`);

    /* 3. IDENTITY */
    tcheck(copy.instituteName === who.name, "instituteName is the typed name");
    tcheck(copy.status === "draft" && copy.isExample === false, "a draft, not an example");
    tcheck(copy.templateId === meta.id, "templateId kept as provenance");
    tcheck(copy.id && copy.id !== "ds_fixed" && !EXISTING.some((s) => s.id === copy.id), `a new unique id (${copy.id})`);
    tcheck(M.isWellFormedDemoSlug(copy.slug) && !EXISTING.some((s) => s.slug === copy.slug), `a well-formed unique slug (${copy.slug})`);
    tcheck(M.demoSlugIssue(copy.slug, { sites: EXISTING, pitchPages: [], currentId: copy.id }) === null, "the admin accepts the slug");
    tcheck(copy.slug.startsWith(who.name.toLowerCase().split(/[^a-z]+/)[0]), `the slug comes from the name (${copy.slug})`);
    tcheck(copy.preparedOn === "2026-09-25", "preparedOn is today");
    if (who.city) tcheck(copy.city === who.city && copy.state === (who.city === c.city ? c.state : ""), "the typed city replaces the template's");
    else tcheck(copy.city === c.city && copy.state === c.state, "the template's city and state are kept");

    /* 4. NO TEMPLATE NAME */
    const nameRe = wordRe([c.instituteName, c.shortName, ...table.en, ...table.hi, ...NAME_WORDS[meta.id]], "gu"); /* case-sensitive: s5 has "the semal tree", a tree, not the name */
    /* s5's Hindi alt names the semal tree ("सेमल का पेड़"), a tree, not the name. */
    const found = [...new Set((cj.replace(/सेमल (?=क[ाे] पेड़)/gu, "").match(nameRe) || []))];
    tcheck(found.length === 0, `no form of the template's name anywhere (found ${found.join(", ")})`);
    tcheck(cj.includes(JSON.stringify(who.name).slice(1, -1)), "the new name is in the copy");
    if (who.hiName && table.hi.length && json(c.hi || {}).length > 2) {
      tcheck(json(copy.hi).includes(who.hiName) || cj.includes(who.hiName), "the Hindi name is used in the Hindi copy");
    }
    if (who.city && c.city && who.city !== c.city) {
      const cityRe = wordRe([c.city, ...table.cityHi], "gu");
      const left = [...new Set(cj.match(cityRe) || [])];
      tcheck(left.length === 0, `the template's city is replaced everywhere (found ${left.join(", ")})`);
    }
    if (who.city && AREAS[meta.id]) {
      const left = [...new Set(cj.match(wordRe(AREAS[meta.id], "gu")) || [])];
      tcheck(left.length === 0, `the template's neighbourhood is gone once a city is typed (found ${left.join(", ")})`);
      const twice = wordRe([`${who.city}, ${who.city}`, `${who.city} ${who.city}`, ...table.cityHi.map((h) => `${h}, ${h}`)], "gu");
      tcheck(!twice.test(cj), `the city is never written twice in a row (${who.city})`);
    }

    /* 5. PHOTOS, REFERENCES, NO MUTATION */
    tcheck(copy.heroImage === c.heroImage, "the hero photo is carried");
    tcheck(equal((copy.faculty || []).map((f) => f.photo || ""), (c.faculty || []).map((f) => f.photo || "")), "faculty portraits are carried");
    tcheck(equal((copy.gallery || []).map((g) => g.src), (c.gallery || []).map((g) => g.src)), "gallery photos are carried");
    tcheck(equal((copy.photos || []).map((g) => g.src), (c.photos || []).map((g) => g.src)), "library photos are carried");
    tcheck(equal(Object.keys(copy.sectionPhotos || {}), Object.keys(c.sectionPhotos || {})), "section photos are carried");
    tcheck(equal((copy.dental?.doctors || []).map((d) => d.photo || ""), (c.dental?.doctors || []).map((d) => d.photo || "")), "doctor portraits are carried");
    /* The admin's stock notice (30 Sep 2026) counts a clinic's doctors with the faculty: both are portraits. */
    const stockPortraits = [...(copy.faculty || []), ...(copy.dental?.doctors || [])].filter((p) => M.isStockPhoto(p.photo)).length;
    tcheck(M.stockPhotoUse(copy).faculty === stockPortraits, `the stock notice counts every stock portrait (${stockPortraits})`);
    tcheck((c.dental?.cases || []).every((x) => !x.before && !x.after && !x.consent), "no template case carries a photo or a consent flag");
    const shared = [...objectsIn(copy)].filter((o) => templateObjects.has(o));
    tcheck(shared.length === 0, `shares no object with the template module (${shared.length} shared)`);
    tcheck(json(c) === before, "the template is not mutated");

    /* 6. SAMPLE MARKS */
    const hasResults = (c.results || []).length + (c.stats || []).length + (c.boardResults || []).length > 0;
    const hasReviews = (c.reviews || []).length > 0;
    tcheck(copy.sample?.from === meta.id, "the copy records where its sample content came from");
    if (hasResults) {
      tcheck(M.showSampleLine(copy, "results"), "results carry the sample line");
      const edited = structuredClone(copy);
      if ((edited.results || []).length) edited.results[0].achievement += " (edited)";
      else if ((edited.stats || []).length) edited.stats[0].value = "1";
      else edited.boardResults[0].passed = "1";
      tcheck(!M.showSampleLine(edited, "results"), "editing the results removes the line");
    }
    if (hasReviews) tcheck(M.showSampleLine(copy, "reviews"), "reviews carry the sample line");
    /* Dental: the trust row, the cases and the doctors each carry their own line. */
    if ((c.stats || []).length) tcheck(M.showSampleLine(copy, "stats"), "the trust row carries the sample line");
    if ((c.dental?.cases || []).length) {
      tcheck(M.showSampleLine(copy, "cases"), "before-after cases carry the sample line");
      const e2 = structuredClone(copy);
      e2.dental.cases[0].title += " (edited)";
      tcheck(!M.showSampleLine(e2, "cases"), "editing the cases removes their line");
    }
    if ((c.dental?.doctors || []).length) tcheck(M.showSampleLine(copy, "doctors"), "doctors carry the sample line");
    const real = { ...copy, sample: { ...copy.sample, real: true } };
    tcheck(!M.showSampleLine(real, "results") && !M.showSampleLine(real, "reviews"), "marking them real removes both lines");
    tcheck(!M.showSampleLine(JSON.parse(cj), "results") === !M.showSampleLine(copy, "results"), "a store round trip does not read as an edit");

    /* 6b. THE STORY (30 Sep 2026): the founding story and year the About page
       prints, every kind, with a line of its own that only an edit removes. */
    const storyOf = (s) => [s.about, s.established, s.establishedYear, s.hi?.about, s.hi?.established, s.hi?.establishedYear];
    if (storyOf(c).some((v) => (v || "").trim())) {
      tcheck(Boolean(copy.sample?.prints?.story), "the founding story is fingerprinted at duplication");
      tcheck(M.showSampleLine(copy, "story") && M.isCarried(copy, "story"), "the founding story carries the sample line and is on the checklist");
      tcheck(M.showSampleLine(real, "story"), "ticking 'the institute's real ones' leaves the history's line");
      tcheck(M.showSampleLine(JSON.parse(cj), "story"), "a store round trip does not read as an edit of the story");
      /* The form saves an untouched input as "": still untouched. */
      const form = JSON.parse(cj);
      for (const k of ["about", "established", "establishedYear"]) form[k] = form[k] ?? "";
      form.hi = { ...(form.hi || {}), about: form.hi?.about ?? "", established: form.hi?.established ?? "" };
      tcheck(M.showSampleLine(form, "story"), "an input the form saves as \"\" does not read as an edit of the story");
      const edits = [
        ["the about text", (s) => { s.about = `${s.about || ""} Edited.`; }],
        ["the founding year", (s) => { s.establishedYear = "1999"; s.established = "Since 1999"; }],
        ["the Hindi about text", (s) => { s.hi = { ...(s.hi || {}), about: `${s.hi?.about || ""} बदला गया।` }; }],
      ];
      for (const [what, edit] of edits) {
        const e = structuredClone(copy);
        edit(e);
        tcheck(!M.showSampleLine(e, "story") && !M.isCarried(e, "story"), `editing ${what} removes the history's line and its checklist entry`);
      }
      /* A demo made before the story block: its prints are the other blocks'
         alone. No story line, and its checklist and other lines are what they
         were, so nothing on it reads as edited. */
      const old = structuredClone(copy);
      delete old.sample.prints.story;
      tcheck(!M.showSampleLine(old, "story") && !M.isCarried(old, "story"), "a demo made before the story block shows no history line");
      const carriedNow = M.SAMPLE_BLOCKS.filter((b) => M.isCarried(copy, b));
      const carriedOld = M.SAMPLE_BLOCKS.filter((b) => M.isCarried(old, b));
      tcheck(equal(carriedOld, carriedNow.filter((b) => b !== "story")), `the older demo's checklist is unchanged (${carriedOld.join(", ")})`);
      tcheck(["results", "reviews", "stats", "cases", "doctors"].every((b) => M.showSampleLine(old, b) === M.showSampleLine(copy, b)), "the older demo's other lines are unchanged");
      const oldReal = { ...old, sample: { ...old.sample, real: true } };
      tcheck(!M.showSampleLine(oldReal, "story"), "the switch on an older demo does not bring a history line either");
    } else {
      tcheck(!copy.sample?.prints?.story && !M.showSampleLine(copy, "story"), "a template without a story carries no story line");
    }

    /* 7. THE HINDI SLOTS (26 Sep 2026) are renamed like any other Hindi string.
       A line naming the template (in Hindi) is planted in each slot of a
       clone, so the check holds whatever the template file has filled so far:
       school hi.facilities; coaching result.hi.courseDuration and
       feesPolicy.hi.paymentModes. */
    if (table.hi.length && who.hiName) {
      const hiOld = table.hi[0];
      const t2 = structuredClone(t);
      const k2 = t2.content;
      const planted = [];
      if (meta.kind === "dental") {
        /* dental.treatments[0].hi.name, a nested Hindi twin inside the dental block. */
        k2.dental = k2.dental || {};
        if (!k2.dental.treatments?.length) k2.dental.treatments = [{ slug: "check-up", name: "Check-up", summary: "A full check-up." }];
        const tr0 = k2.dental.treatments[0];
        tr0.hi = { ...(tr0.hi || {}), name: `${hiOld} में जाँच` };
        planted.push(["dental.treatments[0].hi.name", (x) => x.dental?.treatments?.[0]?.hi?.name, tr0.hi.name]);
      } else if (meta.kind === "school") {
        const en = k2.facilities?.length ? k2.facilities : (k2.facilities = ["Library"]);
        const hi = [...(k2.hi?.facilities || [])];
        while (hi.length < en.length) hi.push("");
        hi[0] = `${hiOld} की लाइब्रेरी`;
        k2.hi = { ...(k2.hi || {}), facilities: hi };
        planted.push(["hi.facilities[0]", (x) => x.hi?.facilities?.[0], hi[0]]);
      } else {
        if (!k2.results?.length) k2.results = [{ achievement: "Selection" }];
        const r = k2.results[0];
        r.courseDuration = r.courseDuration || "Two years";
        r.hi = { ...(r.hi || {}), courseDuration: `${hiOld} में दो साल` };
        planted.push(["results[0].hi.courseDuration", (x) => x.results?.[0]?.hi?.courseDuration, r.hi.courseDuration]);
        k2.feesPolicy = { ...(k2.feesPolicy || {}), paymentModes: k2.feesPolicy?.paymentModes?.length ? k2.feesPolicy.paymentModes : ["UPI"] };
        const pm = [...(k2.feesPolicy.hi?.paymentModes || [])];
        pm[0] = `${hiOld} के ऑफ़िस में UPI`;
        k2.feesPolicy.hi = { ...(k2.feesPolicy.hi || {}), paymentModes: pm };
        planted.push(["feesPolicy.hi.paymentModes[0]", (x) => x.feesPolicy?.hi?.paymentModes?.[0], pm[0]]);
      }
      const src2 = { ...k2, kind: meta.kind, theme: meta.theme };
      const copy2 = sabotage(M.fromTemplate(t2, ctx, who), src2, expect);
      for (const [path, get, value] of planted) {
        const want = expect(value, true);
        tcheck(want !== value && get(copy2) === want, `the Hindi slot ${path} is renamed (want ${JSON.stringify(want)}, got ${JSON.stringify(get(copy2))})`);
      }
    }
  }
}

let refused = false;
try { M.fromTemplate(await M.loadTemplate("s1-urban-cbse"), { sites: [], pitchPages: [] }, { name: "  " }); } catch { refused = true; }
check(refused, "fromTemplate refuses an empty name");

/* The story's line (30 Sep 2026): both languages, no em dash, and a name on the checklist. */
check(Boolean(M.SAMPLE_COPY.story?.en && M.SAMPLE_COPY.story?.hi) && !EM_DASH.test(M.SAMPLE_COPY.story.en + M.SAMPLE_COPY.story.hi),
  `the story's line has English and Hindi and no em dash (${M.SAMPLE_COPY.story?.en})`);
check(M.SAMPLE_BLOCKS.includes("story") && Boolean(M.SAMPLE_BLOCK_LABEL.story), `the checklist names the story (${M.SAMPLE_BLOCK_LABEL.story})`);

/* ── 2c. The stock photo library matches the manifest and the disk ──────── */
/* src/lib/demo/images/data.generated.ts is a trimmed copy of
   public/demo/img/manifest.json. If they drift, rerun
   node src/lib/demo/images/sync-manifest.mjs */
{
  const manifest = JSON.parse(readFileSync(join(ROOT, "public", "demo", "img", "manifest.json"), "utf8"));
  const byId = new Map(M.STOCK_PHOTOS.map((p) => [p.id, p]));
  check(M.STOCK_PHOTOS.length === manifest.photos.length, `photos: the library lists every manifest photo (${M.STOCK_PHOTOS.length} of ${manifest.photos.length})`);
  for (const m of manifest.photos) {
    const p = byId.get(m.id);
    check(Boolean(p), `photos: ${m.id} is in the library (rerun sync-manifest.mjs)`);
    if (!p) continue;
    const want = [...m.sizes].sort((a, b) => b.w - a.w).map((s) => [s.w, s.h, s.src]);
    check(equal(p.sizes.map((s) => [s.w, s.h, s.src]), want), `photos: ${m.id} sizes match the manifest`);
    check(p.alt === m.alt && p.altHi === m.altHi, `photos: ${m.id} alt and altHi match the manifest`);
    check(p.focal.x === (m.focal?.x ?? 0.5) && p.focal.y === (m.focal?.y ?? 0.5), `photos: ${m.id} focal point matches`);
    check(Boolean(p.alt && p.altHi) && !EM_DASH.test(p.alt + p.altHi), `photos: ${m.id} has alt in both languages and no em dash`);
    for (const s of p.sizes) {
      let ok = true;
      try { readFileSync(join(ROOT, "public", s.src)); } catch { ok = false; }
      check(ok, `photos: ${s.src} exists on disk`);
    }
    check(M.getStockPhoto(p.src) === p && M.getStockPhoto(p.id) === p && p.sizes.every((s) => M.getStockPhoto(s.src) === p), `photos: ${m.id} resolves by id and by every size path`);
  }
  check(M.getStockPhoto("https://www.ideovent.in" + M.STOCK_PHOTOS[0].sizes[0].src + "?v=2") === M.STOCK_PHOTOS[0], "photos: an absolute URL with a query still resolves");
  check(!M.isStockPhoto("/uploads/x.jpg") && !M.isStockPhoto("") && !M.isStockPhoto(undefined), "photos: other paths are not stock");
  check(M.STOCK_PHOTOS.filter((p) => p.role === "portrait").length >= 10, "photos: at least ten teacher portraits");
}

/* ── 2d. Dental page registry ────────────────────────────────────────────── */
{
  const ids = new Set(M.pagesOfKind("dental").map((p) => p.id));
  for (const [tid, set] of Object.entries(M.DENTAL_PAGE_SETS)) {
    check(set.every((id) => ids.has(id)), `${tid}: every page in its set is a dental page`);
    const t = await M.loadTemplate(tid);
    const site = M.templatePreviewSite(t);
    const shown = M.visiblePages(site, "2026-09-28").map((p) => p.id);
    for (const must of ["home", "book", "contact"]) check(shown.includes(must), `${tid}: ${must} is always shown`);
    /* Mehdi sells from the preview: its About page labels the history as the duplicate's will. */
    check(M.showSampleLine(site, "story"), `${tid}: the preview's About page labels the template's history`);
  }
  check(M.matchPage("dental", "treatments/root-canal")?.def.id === "treatment" && M.matchPage("dental", "treatments/root-canal")?.param === "root-canal", "dental: treatments/<slug> routes to the treatment page");
  check(M.matchPage("dental", "doctors/aditi-rao")?.def.id === "doctor", "dental: doctors/<slug> routes to the doctor page");
  check(M.matchPage("dental", "clinics/dwarka")?.def.id === "clinic", "dental: clinics/<slug> routes to the branch page");
  check(M.matchPage("dental", "before-after")?.def.id === "before-after", "dental: before-after routes");
  check(M.matchPage("school", "treatments") === null, "a school record has no treatments page");
}

/* ── 2d½. Photo slots (30 Sep 2026) ──────────────────────────────────────── */
/* A dental record offers exactly the two section slots its pages read (the
   About page, the clinic photo in the Visit block), and every slot's stock
   picker has photos under each category it names. */
{
  const dentalSlots = M.DEMO_PHOTO_SLOTS.filter((d) => d.kinds.includes("dental")).map((d) => d.slot);
  check(equal(dentalSlots, ["about", "campus"]), `photo slots: a dental record gets about and campus (${dentalSlots.join(", ")})`);
  const cats = new Set(M.STOCK_PHOTOS.map((p) => p.category));
  for (const d of M.DEMO_PHOTO_SLOTS) {
    const missing = d.categories.filter((cat) => !cats.has(cat));
    check(missing.length === 0, `photo slots: every category of "${d.slot}" has stock photos (missing ${missing.join(", ")})`);
  }
}

/* ── 2e. Dental contact clearing, on planted data ────────────────────────── */
/* Holds whatever the content files have filled so far: a branch, an
   emergency line and how-to-reach are planted in a clone of d7. */
{
  const t = structuredClone(await M.loadTemplate("d7-dental-chain"));
  t.content.dental = {
    ...(t.content.dental || {}),
    branches: [{ slug: "dwarka", name: "Dwarka Sector 12", phone: "+91 00000 00011", whatsapp: "910000000011", addressLines: ["Example Road, Mahua Dental"], mapQuery: "Mahua Dental Dwarka", landmark: "Near the metro", hours: "Mon to Sat", hi: { name: "द्वारका", addressLines: ["उदाहरण रोड"], landmark: "मेट्रो के पास", hours: "सोम से शनि" } }],
    emergency: { headline: "Tooth pain?", phone: "+91 00000 00022", whatsapp: "910000000022" },
    reach: { parking: "Basement parking", transit: "Dwarka metro, 5 minutes" },
    doctors: [{ name: "Dr. Example", qualification: "BDS", regNo: "Reg. no. A-00000 (sample)" }],
  };
  const copy = M.fromTemplate(t, { sites: [], pitchPages: [], now: NOW }, { name: "Apex Dental", hiName: "एपेक्स डेंटल" });
  const b = copy.dental.branches[0];
  check(!b.phone && !b.whatsapp && !b.addressLines && !b.mapQuery && !b.landmark, "dental fixture: a branch loses phone, WhatsApp, address, map and landmark");
  check(b.name === "Dwarka Sector 12" && b.hours === "Mon to Sat" && b.hi?.name === "द्वारका" && b.hi?.hours === "सोम से शनि" && !b.hi?.addressLines && !b.hi?.landmark, "dental fixture: branch name and hours are kept in both languages, the Hindi address goes");
  check(!copy.dental.emergency.phone && !copy.dental.emergency.whatsapp && copy.dental.emergency.headline === "Tooth pain?", "dental fixture: the emergency line is cleared, its headline kept");
  check(copy.dental.reach === undefined, "dental fixture: how-to-reach is cleared");
  check(!JSON.stringify(copy).includes("00000 00011") && !JSON.stringify(copy).includes("910000000022"), "dental fixture: no planted number survives");
  check(M.showSampleLine(copy, "doctors"), "dental fixture: the doctors carry the sample line");
  check(t.content.dental.branches[0].phone === "+91 00000 00011", "dental fixture: the template clone is not mutated");
}

/* ── 2f. The hero's doctor line (1 Oct 2026) ─────────────────────────────── */
/* The kids hero (d6) credits the lead doctor and the calm heroes (d4, d7)
   print a credential naming one. On a duplicate that doctor is the
   template's fiction, so the line ends in "(sample)" / "(नमूना)" while the
   doctors block is the template's, on the preview too (Mehdi sells from it).
   Never twice (d4's credential already says so), never once the doctors are
   edited or marked real, never on a line that names somebody else. */
const failedHero = new Set();
{
  const heroMark = NO_HERO_MARK ? () => "" : M.heroDoctorMark;
  const hcheck = (id, ok, msg) => { if (!ok) failedHero.add(id); check(ok, `hero ${id}: ${msg}`); };
  const lineOf = {
    kids: (s, l) => { const c = M.leadDoctorCredit(s, l); return c ? [c.name, ...c.rest].join(", ") : ""; },
    calm: (s, l) => M.heroCredential(s, l),
  };
  /* The line each hero prints, and whether the template's own words already mark it. */
  const HEROES = { "d6-kids-dental": ["kids", false], "d4-implant-centre": ["calm", true], "d7-dental-chain": ["calm", false] };
  for (const [id, [kind, marked]] of Object.entries(HEROES)) {
    const t = await M.loadTemplate(id);
    const copy = M.fromTemplate(t, { sites: [], pitchPages: [], now: NOW }, { name: "Example Care Clinic", hiName: "एग्ज़ाम्पल केयर क्लिनिक" });
    const preview = M.templatePreviewSite(t);
    for (const lang of ["en", "hi"]) {
      const line = lineOf[kind](copy, lang);
      const want = marked ? "" : M.SAMPLE_MARK[lang];
      hcheck(id, Boolean(line) && marked === /\((sample|नमूना)\)/.test(line), `the ${kind} hero's ${lang} line ${marked ? "already says" : "does not itself say"} it is a sample (${line})`);
      hcheck(id, heroMark(copy, line, lang) === want, `a duplicate's ${lang} line gets ${JSON.stringify(want)} (got ${JSON.stringify(heroMark(copy, line, lang))})`);
      hcheck(id, heroMark(preview, lineOf[kind](preview, lang), lang) === want, `the preview's ${lang} line gets ${JSON.stringify(want)}`);
      const edited = structuredClone(copy);
      edited.dental.doctors[0].focus = `${edited.dental.doctors[0].focus || ""} Edited.`;
      hcheck(id, heroMark(edited, lineOf[kind](edited, lang), lang) === "", `no mark once the doctors are edited (${lang})`);
      hcheck(id, heroMark({ ...copy, sample: { ...copy.sample, real: true } }, line, lang) === "", `no mark once the doctors are marked real (${lang})`);
      hcheck(id, heroMark(copy, "Dr. Someone Else, BDS", lang) === "", `no mark on a line naming somebody else (${lang})`);
      hcheck(id, heroMark({ ...copy, sample: undefined }, line, lang) === "", `no mark on a demo not made from a template (${lang})`);
    }
  }
}

/* ── 3. Names a real demo can never take ─────────────────────────────────── */

for (const s of ["s1-urban-cbse", "c5-government-jobs", "template-c1-jee-neet-urban", "d3-smile-studio", "template-d7-dental-chain"]) {
  check(M.isTemplateSlug(s), `"${s}" is recognised as a template name`);
  check(M.demoSlugIssue(s, {}) !== null, `the admin refuses "${s}" as a demo link`);
}
check(!M.isTemplateSlug("harsingar-senior-secondary-school"), "an ordinary institute slug is not a template name");
check(
  M.hasProvisionalTemplateSlug({ slug: "draft-s1-urban-cbse-2", templateId: "s1-urban-cbse" }),
  "a numbered provisional slug still counts as provisional",
);
check(
  !M.hasProvisionalTemplateSlug({ slug: "harsingar-school", templateId: "s1-urban-cbse" }),
  "a named slug is no longer provisional",
);

/* ── 4. A clinic in the admin, and a clinic's empty page (30 Sep 2026) ───── */
{
  /* The demo form: a dental record shows a clinic's fields, in a clinic's words. */
  const fields = M.collectionSchemas.demoSites.fields.slice(1);
  const d1 = M.fromTemplate(await M.loadTemplate("d1-family-dentist"), { sites: [], pitchPages: [] }, { name: "Example Care Clinic", city: "Indore" });
  const shown = M.demoFormFields(fields, d1);
  const names = new Set(shown.map((f) => f.name));
  const leftOn = [...M.NOT_ON_A_CLINIC].filter((n) => names.has(n));
  check(leftOn.length === 0, `demo form: a clinic's form has no school or coaching fields (${leftOn.join(", ")})`);
  const notFields = [...M.NOT_ON_A_CLINIC].filter((n) => !fields.some((f) => f.name === n));
  check(notFields.length === 0, `demo form: every field it hides is a real field of the form (${notFields.join(", ")})`);
  for (const keep of ["about", "faq", "posts", "reviews", "stats", "rating", "photos", "vision", "mission", "contact", "dental"]) {
    check(names.has(keep), `demo form: a clinic keeps "${keep}", which its pages print`);
  }
  const labelOf = (list, name) => list.find((f) => f.name === name)?.label;
  check(labelOf(shown, "faq") === "Questions patients ask" && labelOf(shown, "about") === "About the clinic" && labelOf(shown, "posts") === "Blog posts",
    `demo form: a clinic's words (${labelOf(shown, "faq")}, ${labelOf(shown, "about")}, ${labelOf(shown, "posts")})`);
  const hiNames = (shown.find((f) => f.name === "hi")?.fields || []).map((g) => g.name);
  check(hiNames.includes("instituteName") && !hiNames.some((n) => ["principalMessage", "admissionsHeadline", "resultsHeading", "classSizePromise"].includes(n)),
    `demo form: the Hindi group keeps the clinic's name and drops the school and coaching lines (${hiNames.join(", ")})`);
  /* Data is never hidden: a record switched to dental keeps a field that carries something, now or when opened. */
  const switched = { ...d1, courses: [{ name: "Old coaching course" }] };
  check(M.demoFormFields(fields, switched).some((f) => f.name === "courses"), "demo form: a clinic that still carries courses keeps Courses on screen");
  check(M.demoFormFields(fields, { ...switched, courses: [] }, switched).some((f) => f.name === "courses"), "demo form: a field the saved record carried stays while its last row is deleted");
  /* A school's form is exactly the schema, less the dental block. */
  const school = M.fromTemplate(await M.loadTemplate("s1-urban-cbse"), { sites: [], pitchPages: [] }, { name: "Example Public School" });
  const schoolShown = M.demoFormFields(fields, school);
  check(equal(schoolShown.map((f) => `${f.name}:${f.label}`), fields.filter((f) => f.name !== "dental").map((f) => `${f.name}:${f.label}`)),
    "demo form: a school's form is unchanged");

  /* The pitch editor's package list reads, for a clinic, what the clinic's page prints. */
  const clinicOpts = M.pitchPackageOptionsFor("dental");
  const printed = (id) => M.pitchPackage({ recommendedPackage: id, market: M.PITCH_PACKAGES.find((p) => p.id === id).market, instituteType: "dental" });
  check(M.PITCH_PACKAGES.every((p) => clinicOpts.find((o) => o.value === p.id)?.label.includes(`${printed(p.id).label}, ${p.range}`)),
    "pitch packages: every clinic option reads the label and the range the clinic's page prints");
  // The Website band is ₹12,000 to ₹25,000 since 1 Oct 2026 (src/lib/pricing.ts).
  check(!clinicOpts.some((o) => /School website|Coaching or school portal/.test(o.label)) && clinicOpts.some((o) => o.label === "India: Clinic website, ₹12,000 to ₹25,000"),
    `pitch packages: a clinic is offered "Clinic website", never a school's package (${clinicOpts.map((o) => o.label).join(" | ")})`);
  check(M.pitchPackageOptionsFor().some((o) => o.label === "India: School website, ₹12,000 to ₹25,000"), "pitch packages: a school still reads School website");

  /* A dental page with nothing on it, and a missing photograph, never speak of courses, a centre or a campus. */
  const dentalWords = [M.EMPTY_COPY.bodyDental.en, M.EMPTY_COPY.noPhotoDental.en].join(" ");
  check(/clinic/i.test(dentalWords) && !/course|centre|campus|admission|school|institute/i.test(dentalWords), `empty states: the dental lines are a clinic's (${dentalWords})`);
  check(Boolean(M.EMPTY_COPY.bodyDental.hi && M.EMPTY_COPY.noPhotoDental.hi), "empty states: the dental lines have Hindi");
  const bookPage = M.pagesOfKind("dental").find((p) => p.id === "book");
  check(equal(M.SHELL_COPY.bookAppointment, bookPage?.label), "empty states: the stub's Book appointment button reads the dental book page's own label");
}

/* ── The negative runs: each must fail where, and only where, it should ──── */
if (NEGATIVE) {
  const ids = TEMPLATES.map((t) => t.id);
  let wrong = "";
  if (KEEP_HI_SHORT) {
    const missed = [...withHiShort].filter((id) => !failedShort.has(id));
    const extra = [...failedShort].filter((id) => !withHiShort.has(id));
    console.log(`NEGATIVE (short): ${failedShort.size} of the ${withHiShort.size} templates with a Hindi short name failed check 8.`);
    if (!withHiShort.size) wrong = "no template carries a Hindi short name, so check 8 was never exercised";
    else if (missed.length) wrong = `check 8 did not fail for: ${missed.join(", ")}`;
    else if (extra.length) wrong = `check 8 failed for templates without a Hindi short name: ${extra.join(", ")}`;
  } else if (NO_HERO_MARK) {
    const missed = ["d6-kids-dental", "d7-dental-chain"].filter((id) => !failedHero.has(id));
    console.log(`NEGATIVE (hero): check 9 failed for ${[...failedHero].join(", ") || "nothing"}.`);
    if (missed.length) wrong = `check 9 did not fail for: ${missed.join(", ")}`;
  } else {
    const missed = ids.filter((id) => !failedTemplates.has(id));
    console.log(`NEGATIVE: ${failedTemplates.size} of ${ids.length} templates failed.`);
    if (missed.length) wrong = `did not fail for: ${missed.join(", ")}. The assertions miss the Hindi copy there.`;
  }
  if (wrong) {
    console.log(`NEGATIVE run ${wrong}`);
    process.exit(1);
  }
}

console.log(
  `\n${passes} assertions passed, ${failures.length} failed${NEGATIVE ? " (NEGATIVE run: failures are expected)" : ""}`,
);
if (NEGATIVE) {
  if (failures.length === 0) {
    console.log("NEGATIVE run produced no failures: the assertions are not reaching the copy.");
    process.exit(1);
  }
  console.log("NEGATIVE run failed as it should.");
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
