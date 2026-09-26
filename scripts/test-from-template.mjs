/**
 * Tests the template system: the registry, and above all `fromTemplate`,
 * which makes a demo from a template.
 *
 *   node scripts/test-from-template.mjs
 *
 * THE RULE UNDER TEST (26 September 2026, Mehdi's brief). A duplicate carries
 * THE WHOLE TEMPLATE, already filled, under the institute's name. The table
 * is at the top of src/lib/demo/templates/fromTemplate.ts; this file asserts
 * it for all ten templates and several names (one with an apostrophe, one
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
 *      or marked real.
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
 */
import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.FROM_TEMPLATE_NEGATIVE);

/* ── Bundle the real modules ─────────────────────────────────────────────── */

const entry = `
export * from "@/lib/demo/templates/fromTemplate";
export { TEMPLATES, TEMPLATE_IDS, loadTemplate, templatePreviewSite, DESIGN_FAMILIES, DESIGN_FAMILY_IDS, TEMPLATE_SEGMENTS, isTemplateSlug } from "@/lib/demo/templates";
export { demoSlugIssue } from "@/lib/demo/reservedRoutes";
export { resolveDemoSite, isWellFormedDemoSlug } from "@/lib/demo/record";
export { samplePrints, showSampleLine, isCarried } from "@/lib/demo/site/sample";
export { STOCK_PHOTOS, getStockPhoto, isStockPhoto, stockPhoto, facultyPhotoSrc, stockPhotoUse, DEMO_PHOTO_SLOTS } from "@/lib/demo/images";
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

const { TEMPLATES, TEMPLATE_IDS, DESIGN_FAMILIES, DESIGN_FAMILY_IDS, TEMPLATE_SEGMENTS } = M;

check(TEMPLATES.length === 10, `the registry lists 10 templates (found ${TEMPLATES.length})`);
check(new Set(TEMPLATES.map((t) => t.id)).size === TEMPLATES.length, "every registry id is unique");
check(
  TEMPLATE_IDS.every((id) => TEMPLATES.some((t) => t.id === id)),
  "every id in ids.ts has a registry entry",
);
for (const kind of ["school", "coaching"]) {
  const of = TEMPLATES.filter((t) => t.kind === kind);
  check(of.length === 5, `five ${kind} templates (found ${of.length})`);
  check(
    new Set(of.map((t) => t.theme)).size === of.length,
    `no two ${kind} templates share a theme`,
  );
  for (const f of DESIGN_FAMILY_IDS) {
    check(of.some((t) => t.designFamily === f), `the ${f} family has a ${kind} template`);
  }
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
];

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
};

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
  const enRe = wordRe(en);
  const hiRe = wordRe(table.hi);
  return (s, inHi) => {
    const nn = inHi ? who.hiName || who.name : who.name;
    let o = s;
    if (pair) o = o.replace(pair, () => who.city);
    if (city) o = o.replace(city, () => who.city);
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
const NOT_CONTENT = new Set(["instituteName", "shortName", "city", "state", "contact", "officialWebsite", "disclosure"]);

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
const failedTemplates = new Set();

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
    const copy = NEGATIVE ? skipHindi(M.fromTemplate(t, ctx, who), source) : M.fromTemplate(t, ctx, who);
    const cj = json(copy);

    /* 1. CONTENT */
    const expect = expecter(t, who, table);
    const diffs = [];
    for (const k of Object.keys(source)) {
      if (NOT_CONTENT.has(k) || source[k] === undefined) continue;
      /* hi.instituteName is the typed Hindi name, not template copy: checked below. */
      const noName = (h) => (h ? (({ instituteName: _n, ...rest }) => rest)(h) : h);
      compare(k === "hi" ? noName(source[k]) : source[k], k === "hi" ? noName(copy[k]) : copy[k], k, k === "hi", expect, diffs);
    }
    if (c.disclosure) {
      const want = structuredClone(c.disclosure);
      for (const r of ["address", "email", "phone"]) if (want.rows) delete want.rows[r];
      compare(want, copy.disclosure, "disclosure", false, expect, diffs);
    }
    compare(c.contact?.hours || "", copy.contact?.hours || "", "contact.hours", false, expect, diffs);
    tcheck((copy.hi?.instituteName || "") === (who.hiName || "").trim(), "hi.instituteName holds the Hindi name typed, and only that");
    tcheck(diffs.length === 0, `content equals the template's with the name replaced${diffs.length ? "\n      " + diffs.join("\n      ") : ""}`);

    /* 2. CONTACT */
    const ct = copy.contact || {};
    tcheck(!ct.phone && !ct.whatsapp && !ct.email && !ct.mapUrl && !ct.mapQuery, "phone, WhatsApp, email and map are empty");
    tcheck(!(ct.addressLines || []).some(Boolean) && !ct.landmark, "the address is empty");
    tcheck(!(ct.branches || []).length && !ct.transportDesk, "branches and the transport desk are gone");
    tcheck(!copy.officialWebsite, "their website is empty");
    tcheck(!["address", "email", "phone"].some((r) => copy.disclosure?.rows?.[r]), "the disclosure's contact rows are gone");
    const leaks = [c.contact?.phone, c.contact?.email, c.contact?.whatsapp, ...(c.contact?.addressLines || []).slice(0, 1)]
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

    /* 5. PHOTOS, REFERENCES, NO MUTATION */
    tcheck(copy.heroImage === c.heroImage, "the hero photo is carried");
    tcheck(equal((copy.faculty || []).map((f) => f.photo || ""), (c.faculty || []).map((f) => f.photo || "")), "faculty portraits are carried");
    tcheck(equal((copy.gallery || []).map((g) => g.src), (c.gallery || []).map((g) => g.src)), "gallery photos are carried");
    tcheck(equal((copy.photos || []).map((g) => g.src), (c.photos || []).map((g) => g.src)), "library photos are carried");
    tcheck(equal(Object.keys(copy.sectionPhotos || {}), Object.keys(c.sectionPhotos || {})), "section photos are carried");
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
    const real = { ...copy, sample: { ...copy.sample, real: true } };
    tcheck(!M.showSampleLine(real, "results") && !M.showSampleLine(real, "reviews"), "marking them real removes both lines");
    tcheck(!M.showSampleLine(JSON.parse(cj), "results") === !M.showSampleLine(copy, "results"), "a store round trip does not read as an edit");

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
      if (meta.kind === "school") {
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
      const copy2 = NEGATIVE ? skipHindi(M.fromTemplate(t2, ctx, who), src2) : M.fromTemplate(t2, ctx, who);
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

if (NEGATIVE) {
  const missed = TEMPLATES.map((t) => t.id).filter((id) => !failedTemplates.has(id));
  console.log(`NEGATIVE: ${failedTemplates.size} of ${TEMPLATES.length} templates failed.`);
  if (missed.length) {
    console.log(`NEGATIVE run did not fail for: ${missed.join(", ")}. The assertions miss the Hindi copy there.`);
    process.exit(1);
  }
}

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

/* ── 3. Names a real demo can never take ─────────────────────────────────── */

for (const s of ["s1-urban-cbse", "c5-government-jobs", "template-c1-jee-neet-urban"]) {
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
