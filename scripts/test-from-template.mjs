/**
 * Tests the template system: the registry, and above all `fromTemplate`,
 * which decides what a duplicate keeps.
 *
 *   node scripts/test-from-template.mjs
 *
 * THE RULE UNDER TEST. A template is fiction. A duplicate becomes a real
 * institute's website the moment Mehdi types their name, so every field that
 * is a fact about an institute must be EMPTY on the copy and every field that
 * is structure must be EQUAL to the template. The table is at the top of
 * src/lib/demo/templates/fromTemplate.ts; this file asserts it, for all ten
 * templates, three ways:
 *
 *   1. every field the policy calls CLEAR is empty, and every KEEP field is
 *      deep-equal to the template;
 *   2. the minimum CLEAR list from Mehdi's brief of 25 September 2026 is
 *      hard-coded HERE, independently of the policy, so the policy table
 *      cannot quietly move a field from clear to keep;
 *   3. no fact string from the template (its name, its people, its phone,
 *      its address, its email) appears ANYWHERE in the copy's JSON.
 *
 * Plus: the kept free text (facilities, admission steps and documents,
 * generic FAQs) carries no digit, number word or rupee sign, because it is
 * copied word for word onto a real institute's page; the copy is unique and a
 * draft; the template is not mutated; a template id is refused as a demo link.
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
 * swaps fromTemplate for the naive duplicate (copy everything, change the id
 * and the slug), which is what the old Duplicate button on the demo list does.
 * Every template with content must then FAIL. If that run passes, the
 * assertions are not reaching anything and a green run means nothing.
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

/* The words and marks that make a kept line a claim. A class range is
   structure ("Class 11 to 12", "Class XII"), so it is stripped first. */
const NUMBER_WORDS =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakhs?|crores?|dozen)\b/i;
function claimIn(text) {
  const s = String(text || "").replace(
    /\bclass(es)?\s+([0-9]+|[ivx]+)(\s*(to|and|or|-)\s*([0-9]+|[ivx]+))?/gi,
    "",
  );
  if (/[0-9]/.test(s)) return "a digit";
  if (/₹|\bRs\.?\s/i.test(s)) return "a rupee amount";
  const w = s.match(NUMBER_WORDS);
  if (w) return `the number word "${w[0]}"`;
  return null;
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

/* ── 2. Every template through fromTemplate ──────────────────────────────── */

const NOW = new Date("2026-09-25T10:00:00.000Z");
const clearFields = M.fieldsWithRule("clear");
const keepFields = M.fieldsWithRule("keep");

/* The brief's minimum CLEAR list, written out here and NOT read from the
   policy, so that moving one of these to "keep" in fromTemplate.ts fails. */
const BRIEF_CLEAR = [
  "instituteName", "shortName", "city", "state", "contact", "officialWebsite",
  "principalName", "principalMessage", "established", "establishedYear",
  "boardOrAffiliation", "results", "resultsHeading", "resultsNote", "faculty",
  "gallery", "notices", "about", "tagline", "admissionsHeadline", "method",
  "trial", "scheduleNote", "logo", "heroImage", "expiresAt",
];
const BRIEF_KEEP = ["kind", "theme", "market", "currency", "facilities", "focusAreas"];

/* The multi-page fields of 26 September 2026 that are facts about an
   institute, written out here for the same reason as BRIEF_CLEAR. */
const MULTIPAGE_CLEAR = [
  "sessionLabel", "admissionsOpenUntil", "vision", "mission", "udiseCode",
  "classSizePromise", "hostel", "founder", "stats", "reviews", "rating",
  "photos", "portalLinks", "downloads", "policies", "joining", "academics",
  "facilityDetails", "boardResults", "transport", "boarding", "studentLife",
  "safety", "dayPlan", "disclosure", "testSeries", "scholarship", "posts",
  "govExams", "olympiad", "feesPolicy",
];
const MULTIPAGE_KEEP = ["sitePages", "defaultLang"];
const COURSE_CLEAR_NEW = [
  "eligibility", "syllabus", "material", "testPlan", "instalments",
  "inclusions", "refundNote", "facultyNames", "faq",
];
const ADMISSIONS_CLEAR_NEW = [
  "timeline", "fees", "feeNote", "ageRules", "ageAsOn", "rteNote",
  "applyUrl", "whoCanApply", "assessment",
];
for (const f of MULTIPAGE_CLEAR) {
  check(M.DUPLICATE_POLICY[f] === "clear", `policy: ${f} is CLEAR (multi-page)`);
}
for (const f of MULTIPAGE_KEEP) {
  check(M.DUPLICATE_POLICY[f] === "keep", `policy: ${f} is KEEP (multi-page)`);
}
check(M.DUPLICATE_POLICY.hi === "structure", "policy: the top-level Hindi block is STRUCTURE");
for (const f of COURSE_CLEAR_NEW) {
  check(M.COURSE_POLICY[f] === "clear", `policy: courses[].${f} is CLEAR`);
}
for (const f of ADMISSIONS_CLEAR_NEW) {
  check(M.ADMISSIONS_POLICY[f] === "clear", `policy: admissions.${f} is CLEAR`);
}

/* Every string of at least 12 characters anywhere under a value. */
function stringsIn(v, out = []) {
  if (typeof v === "string") {
    if (v.trim().length >= 12) out.push(v);
  } else if (Array.isArray(v)) v.forEach((x) => stringsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => stringsIn(x, out));
  return out;
}

/* The template's kept text, computed from the template side with the policy
   tables, independently of fromTemplate: a cleared string may appear on the
   copy only if the template ALSO wrote it in a kept place. */
function keptTextOf(c, source) {
  const parts = [];
  for (const f of M.fieldsWithRule("keep")) parts.push(source[f]);
  const keepKeys = (policy) => Object.keys(policy).filter((k) => policy[k] === "keep");
  /* A row's `hi` keeps the Hindi of its kept keys (the "hi" sub-rule), so
     that Hindi is kept text too. */
  for (const row of c.courses || []) parts.push(keepKeys(M.COURSE_POLICY).map((k) => [row[k], row.hi?.[k]]));
  for (const row of c.schedule || []) parts.push(keepKeys(M.SCHEDULE_POLICY).map((k) => [row[k], row.hi?.[k]]));
  parts.push(keepKeys(M.ADMISSIONS_POLICY).map((k) => c.admissions?.[k]));
  for (const f of (c.faq || []).filter((x) => x.generic === true)) parts.push([f.title, f.body, f.group, f.hi]);
  return json(parts);
}

for (const f of BRIEF_CLEAR) {
  check(M.DUPLICATE_POLICY[f] === "clear", `policy: ${f} is CLEAR, as the brief requires`);
}
for (const f of BRIEF_KEEP) {
  check(M.DUPLICATE_POLICY[f] === "keep", `policy: ${f} is KEEP, as the brief requires`);
}
for (const f of ["fee", "feeNote", "batchStarts", "seats"]) {
  check(M.COURSE_POLICY[f] === "clear", `policy: courses[].${f} is CLEAR`);
}
for (const f of ["name", "level", "subjects", "timings"]) {
  check(M.COURSE_POLICY[f] === "keep", `policy: courses[].${f} is KEEP`);
}
check(M.SCHEDULE_POLICY.faculty === "clear" && M.SCHEDULE_POLICY.room === "clear", "policy: a timetable row loses its teacher and room");
check(M.ADMISSIONS_POLICY.dates === "clear" && M.ADMISSIONS_POLICY.note === "clear", "policy: admissions lose their dates and note");

/* Two real records already in the collection, one of them sitting on the
   provisional slug the first duplicate would take, so uniqueness is tested
   rather than assumed. */
const EXISTING = [
  { id: "ds_existing_1", slug: "draft-s1-urban-cbse", status: "draft", kind: "school", instituteName: "Somebody" },
  { id: "ds_fixed", slug: "some-institute", status: "sent", kind: "coaching", instituteName: "Somebody else" },
];

function naiveDuplicate(t, ctx) {
  const site = M.templatePreviewSite(t);
  return { ...site, id: ctx.newId(), slug: "naive-copy", status: "draft", isExample: false };
}

for (const meta of TEMPLATES) {
  const t = await M.loadTemplate(meta.id);
  check(t && t.meta.id === meta.id, `${meta.id}: loads through the registry`);
  if (!t) continue;
  const c = t.content;
  const before = json(c);
  check(!EM_DASH.test(before), `${meta.id}: no em dash anywhere in the template's content`);
  check(!/ideovent.com/i.test(before), `${meta.id}: the content never names the old domain`);
  const source = { ...c, kind: meta.kind, theme: meta.theme };

  const ctx = { sites: EXISTING, pitchPages: [], now: NOW, newId: () => "ds_fixed" };
  const copy = NEGATIVE ? naiveDuplicate(t, ctx) : M.fromTemplate(t, ctx);
  const tag = meta.id;

  /* NEW */
  check(copy.status === "draft", `${tag}: the copy is a draft`);
  check(copy.isExample === false, `${tag}: the copy is not an example`);
  check(copy.templateId === meta.id, `${tag}: the copy records templateId ${meta.id}`);
  check(copy.id && copy.id !== "ds_fixed" && !EXISTING.some((s) => s.id === copy.id), `${tag}: the copy's id is new and unique (got ${copy.id})`);
  check(copy.preparedOn === "2026-09-25", `${tag}: preparedOn is today`);
  check(copy.order === EXISTING.length, `${tag}: the copy goes to the end of the list`);
  check(M.isWellFormedDemoSlug(copy.slug), `${tag}: the slug is well formed (${copy.slug})`);
  check(!EXISTING.some((s) => s.slug === copy.slug), `${tag}: the slug is unique (${copy.slug})`);
  check(!M.isTemplateSlug(copy.slug), `${tag}: the slug is not a template's name`);
  check(
    M.demoSlugIssue(copy.slug, { sites: EXISTING, pitchPages: [], currentId: copy.id }) === null,
    `${tag}: the admin accepts the slug`,
  );
  check(
    Object.entries(copy).every(([, v]) => v !== undefined),
    `${tag}: no key is carried as undefined`,
  );

  /* CLEAR, from the policy */
  for (const f of clearFields) {
    check(isEmpty(copy[f]), `${tag}: CLEAR field ${f} is empty on the copy`);
  }
  /* KEEP, from the policy */
  for (const f of keepFields) {
    check(equal(copy[f], source[f]), `${tag}: KEEP field ${f} equals the template`);
  }

  /* STRUCTURE */
  const courses = c.courses || [];
  check((copy.courses || []).length === courses.length, `${tag}: every batch or age band is kept`);
  courses.forEach((row, i) => {
    const got = (copy.courses || [])[i] || {};
    for (const [f, rule] of Object.entries(M.COURSE_POLICY)) {
      if (rule === "keep") check(equal(got[f] || "", row[f] || ""), `${tag}: courses[${i}].${f} kept`);
      else if (rule === "hi") check(equal(got.hi || null, M.keptHi(row.hi, M.COURSE_POLICY) || null), `${tag}: courses[${i}].hi keeps only the Hindi of kept fields`);
      else check(isEmpty(got[f]), `${tag}: courses[${i}].${f} cleared`);
    }
    for (const k of Object.keys(got.hi || {})) {
      check(M.COURSE_POLICY[k] === "keep", `${tag}: courses[${i}].hi.${k} survives only because ${k} is kept`);
    }
  });
  const sched = c.schedule || [];
  check((copy.schedule || []).length === sched.length, `${tag}: every timetable row is kept`);
  sched.forEach((row, i) => {
    const got = (copy.schedule || [])[i] || {};
    for (const [f, rule] of Object.entries(M.SCHEDULE_POLICY)) {
      if (rule === "keep") check(equal(got[f] || "", row[f] || ""), `${tag}: schedule[${i}].${f} kept`);
      else if (rule === "hi") check(equal(got.hi || null, M.keptHi(row.hi, M.SCHEDULE_POLICY) || null), `${tag}: schedule[${i}].hi keeps only the Hindi of kept fields`);
      else check(isEmpty(got[f]), `${tag}: schedule[${i}].${f} cleared`);
    }
  });
  const adm = copy.admissions || {};
  check(equal(adm.steps || [], c.admissions?.steps || []), `${tag}: admission steps kept`);
  check(equal(adm.documents || [], c.admissions?.documents || []), `${tag}: admission documents kept`);
  check(isEmpty(adm.dates) && isEmpty(adm.note), `${tag}: admission dates and note cleared`);
  for (const f of ADMISSIONS_CLEAR_NEW) {
    check(isEmpty(adm[f]), `${tag}: admissions.${f} cleared`);
  }
  check(isEmpty(adm.hi), `${tag}: admissions.hi is empty (every Hindi admissions field is a cleared one)`);

  /* Top-level Hindi: only the Hindi of KEEP fields survives. */
  for (const k of Object.keys(copy.hi || {})) {
    check(M.DUPLICATE_POLICY[k] === "keep", `${tag}: hi.${k} survives only because ${k} is KEEP`);
  }
  if (c.hi?.tagline) check(!copy.hi || !copy.hi.tagline, `${tag}: the Hindi tagline is cleared with the English one`);
  const genericFaq = (c.faq || []).filter((f) => f.generic === true).map((f) => M.genericFaqCopy(f));
  check(equal(copy.faq || [], genericFaq), `${tag}: only the generic FAQs are kept, without the flag`);

  /* Kept free text carries no claim. */
  const keptText = [
    ...(c.facilities || []).map((s) => ["facility", s]),
    ...(c.admissions?.steps || []).map((s) => ["admission step", s]),
    ...(c.admissions?.documents || []).map((s) => ["admission document", s]),
    ...genericFaq.flatMap((f) => [["generic FAQ", f.title], ["generic FAQ", f.body]]),
  ];
  for (const [what, text] of keptText) {
    const claim = claimIn(text);
    check(!claim, `${tag}: kept ${what} has ${claim}: "${String(text).slice(0, 70)}"`);
  }

  /* No fact string from the fiction survives anywhere in the copy. */
  const copyJson = json(copy);
  const facts = [
    c.instituteName, c.shortName, c.city, c.state, c.principalName, c.about,
    c.tagline, c.boardOrAffiliation, c.contact?.phone, c.contact?.email,
    c.contact?.whatsapp, c.contact?.mapQuery, ...(c.contact?.addressLines || []),
    ...(c.faculty || []).map((f) => f.name), ...(c.results || []).map((r) => r.achievement),
    ...(c.notices || []).map((n) => n.title), ...(c.gallery || []).map((g) => g.alt),
    ...courses.map((r) => r.fee).filter(Boolean).map((fee) => `"fee":"${fee}"`),
  ].filter((s) => typeof s === "string" && s.trim().length > 3);
  for (const fact of facts) {
    const needle = fact.startsWith('"fee"') ? fact : JSON.stringify(fact).slice(1, -1);
    check(!copyJson.includes(needle), `${tag}: the template's "${fact.slice(0, 48)}" does not survive into the copy`);
  }
  check(!/testimonial|social|instagram|facebook|twitter|youtube/i.test(Object.keys(copy).join(" ")), `${tag}: no testimonial or social field on the copy`);
  check(isEmpty(copy.reviews) && isEmpty(copy.rating) && isEmpty(copy.stats), `${tag}: reviews, rating and trust figures are empty on the copy`);

  /* Generic sweep over every CLEAR field, old and new: no string of 12+
     characters the template wrote under a cleared field reaches the copy,
     unless the template also wrote it somewhere kept. */
  const keptJsonText = keptTextOf(c, source);
  const clearedStrings = [
    ...clearFields.flatMap((f) => stringsIn(source[f])),
    ...stringsIn(c.hi ? Object.fromEntries(Object.entries(c.hi).filter(([k]) => M.DUPLICATE_POLICY[k] !== "keep")) : null),
  ];
  let leaks = 0;
  for (const s of new Set(clearedStrings)) {
    const needle = JSON.stringify(s).slice(1, -1);
    if (copyJson.includes(needle) && !keptJsonText.includes(needle)) {
      leaks++;
      check(false, `${tag}: cleared text "${s.slice(0, 48)}" leaked into the copy`);
    }
  }
  check(leaks === 0, `${tag}: none of ${new Set(clearedStrings).size} cleared strings leaked`);

  /* Pure: the template is untouched, and the copy shares no array with it. */
  check(json(c) === before, `${tag}: the template is not mutated`);
  if (copy.facilities && c.facilities) {
    copy.facilities.push("mutation probe");
    check(!c.facilities.includes("mutation probe"), `${tag}: the copy does not share arrays with the template`);
  }

  /* The preview record: never public. */
  const preview = M.templatePreviewSite(t);
  check(preview.status === "draft" && preview.isExample === true, `${tag}: the preview record is a draft example`);
  check(M.isTemplateSlug(preview.slug), `${tag}: the preview slug is a reserved template slug`);
  check(
    M.resolveDemoSite(preview.slug, [preview]).reachability === "missing",
    `${tag}: the public resolver refuses the preview record`,
  );
  check(!(preview.faq || []).some((f) => "generic" in f), `${tag}: the preview never shows the generic flag`);


}

/* ── 2b. A probe with every multi-page field filled ──────────────────────── */
/* The ten templates may not fill every new field yet, so one synthetic
   template fills ALL of them with marked strings, and none may survive. */
{
  const P = (s) => `PROBE ${s} fact text`;
  const pt = (s) => ({ title: P(s), body: P(s + " body"), group: "Fees", hi: { title: P(s + " hi"), body: P(s + " hi body") } });
  const probeContent = {
    instituteName: P("name"), city: "Patna", state: "Bihar", country: "India", market: "india", currency: "INR",
    hi: { tagline: P("hi tagline"), about: P("hi about"), principalTitle: "Pradhanacharya" },
    sitePages: ["home", "admissions", "contact"], defaultLang: "hi",
    sessionLabel: P("session"), admissionsOpenUntil: "2027-03-31", vision: P("vision"), mission: P("mission"),
    udiseCode: P("udise"), classSizePromise: P("class size"), hostel: P("hostel"),
    founder: { name: P("founder"), story: P("story") },
    stats: [{ value: "1,080", label: P("stat"), basis: P("basis") }],
    reviews: [{ quote: P("review"), name: P("reviewer"), consent: true }],
    rating: { value: "4.8", count: "212", url: "https://example.com/r" },
    photos: [{ src: "/x.jpg", alt: P("photo"), category: "Campus" }],
    portalLinks: [{ label: P("portal"), url: "https://example.com/p" }],
    downloads: [{ label: P("download"), url: "https://example.com/d.pdf" }],
    policies: [{ title: P("policy"), body: P("policy body") }],
    joining: [pt("joining")],
    academics: { intro: P("academics"), stages: [pt("stage")], calendar: [{ title: P("holiday"), date: "2 Oct" }] },
    facilityDetails: [pt("facility")], studentLife: [pt("club")], safety: [pt("safety")],
    boardResults: [{ year: "2026", className: "XII", registered: "212", passed: "209", passPercent: "98.6" }],
    transport: { intro: P("transport"), routes: [{ name: P("route"), stops: [P("stop")] }], safety: [P("gps")] },
    boarding: { intro: P("boarding"), houses: [pt("house")], topics: [pt("pastoral")] },
    dayPlan: [{ label: P("circle time"), time: "9:00" }],
    disclosure: { rows: { "affiliation-no": { value: P("affiliation") } }, annualReportUrl: "https://example.com/ar.pdf" },
    testSeries: { intro: P("tests"), types: [pt("mock")], platformUrl: "https://example.com/t" },
    scholarship: { name: P("scholarship"), date: "12 Oct", rewards: [pt("reward")] },
    posts: [{ title: P("post"), body: P("post body") }],
    govExams: { calendar: [{ exam: P("exam"), examDate: "Nov" }], cutoffs: [{ exam: P("cutoff exam"), category: "UR", cutoff: "142.5" }] },
    olympiad: { intro: P("olympiad"), medals: [P("medal")] },
    feesPolicy: { refund: P("refund"), studentsCoached: "4,210" },
    courses: [{
      name: "JEE two year", slug: "jee-two-year", category: "JEE", level: "Class 11 to 12",
      fee: "1,45,000", eligibility: P("eligibility"), syllabus: [pt("unit")], material: [P("module")],
      testPlan: P("test plan"), instalments: [{ label: P("instalment"), amount: "36,250" }],
      inclusions: [P("inclusion")], refundNote: P("refund note"), facultyNames: [P("teacher")], faq: [pt("course faq")],
      hi: { name: "JEE do saal", feeNote: P("hi fee note"), detail: P("hi detail") },
    }],
    schedule: [{ label: "Batch A", days: "Mon", faculty: P("sched teacher"), hi: { label: "Batch A hi", subject: "x", faculty: P("hi teacher") } }],
    admissions: {
      steps: ["Enquire"], documents: ["Birth certificate"],
      timeline: [{ title: P("timeline"), date: "1 Nov" }], fees: [{ label: P("fee row"), amount: "5,000", period: "one-time" }],
      feeNote: P("fee note"), ageRules: [{ className: "Nursery", minAge: "3" }], rteNote: P("rte"),
      applyUrl: "https://example.com/apply", whoCanApply: P("who"), assessment: P("assessment"),
      hi: { dates: P("hi dates"), whoCanApply: P("hi who") },
    },
    faq: [{ title: "Do you run a free demo class?", body: "Yes, ask us.", group: "Joining", generic: true, hi: { title: "Kya demo class free hai?", body: "Haan." } }],
  };
  const probe = { meta: TEMPLATES.find((t) => t.kind === "coaching"), content: probeContent };
  const ctx = { sites: EXISTING, pitchPages: [], now: NOW, newId: () => "ds_probe" };
  const pc = NEGATIVE ? naiveDuplicate(probe, ctx) : M.fromTemplate(probe, ctx);
  const pj = json(pc);
  check(!pj.includes("PROBE"), `probe: no probe fact survives (found ${(pj.match(/PROBE [a-z ]+/g) || []).slice(0, 4).join(", ")})`);
  for (const f of MULTIPAGE_CLEAR) check(isEmpty(pc[f]), `probe: ${f} is empty on the copy`);
  check(equal(pc.sitePages, probeContent.sitePages), "probe: sitePages kept");
  check(pc.defaultLang === "hi", "probe: defaultLang kept");
  check(equal(pc.hi, { principalTitle: "Pradhanacharya" }), "probe: top-level hi keeps only principalTitle");
  const pcCourse = (pc.courses || [])[0] || {};
  check(pcCourse.slug === "jee-two-year" && pcCourse.category === "JEE", "probe: course slug and category kept");
  check(equal(pcCourse.hi, { name: "JEE do saal" }), "probe: course hi keeps only the Hindi name");
  check(equal((pc.schedule || [])[0]?.hi, { label: "Batch A hi", subject: "x" }), "probe: schedule hi drops the teacher");
  check(equal(pc.faq, [{ title: "Do you run a free demo class?", body: "Yes, ask us.", group: "Joining", hi: { title: "Kya demo class free hai?", body: "Haan." } }]), "probe: a generic FAQ keeps its group and Hindi");
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
