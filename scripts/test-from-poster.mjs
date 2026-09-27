/**
 * Tests the poster overlay (src/lib/demo/templates/fromPoster.ts) and the
 * template choice (chooseTemplate in src/lib/ai/posterSchema.ts).
 *
 *   node scripts/test-from-poster.mjs
 *
 * WHAT MUST BE TRUE, for every one of the ten templates:
 *   1. the template's fictional name, phones, emails and example.com never
 *      survive anywhere in the draft;
 *   2. contact comes FROM THE POSTER: phone, WhatsApp (as wa.me digits),
 *      email, address, website;
 *   3. poster results replace the template's and switch on "Results and
 *      reviews on this demo are the institute's real ones", and the
 *      template's fictional reviews, rating and trust figures are gone;
 *      without poster results the template's stay, with the sample line;
 *   4. poster courses and teachers replace the template's; no template fee
 *      survives next to them, and no stock portrait sits beside a real name;
 *   5. a field the poster lacks keeps the template's content: an extract
 *      with a name only gives EXACTLY what a plain Duplicate gives;
 *   6. Hindi: a Devanagari value fills the Hindi twin, a Latin one removes
 *      the template's Hindi twin;
 * and chooseTemplate maps a set of sample posters to the right ids.
 *
 * Bundled with esbuild from the real TypeScript, as test-from-template.mjs
 * does. Nothing is mocked.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   FROM_POSTER_NEGATIVE=1 node scripts/test-from-poster.mjs
 *
 * swaps the overlay for a plain template duplicate (the poster is ignored)
 * and the template choice for "always the model's hint". Every one of the
 * ten templates and the choice table must then FAIL.
 */
import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.FROM_POSTER_NEGATIVE);

/* ── Bundle the real modules ─────────────────────────────────────────────── */

const entry = `
export * from "@/lib/demo/templates/fromPoster";
export { fromTemplate, TEMPLATE_NAMES, templateNameForms } from "@/lib/demo/templates/fromTemplate";
export { TEMPLATE_IDS, loadTemplate } from "@/lib/demo/templates";
export { chooseTemplate, normalizeExtract, classNumbers } from "@/lib/ai/posterSchema";
export { showSampleLine } from "@/lib/demo/site/sample";
`;

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

const aliasAndRaw = {
  name: "alias-and-raw",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      const [p, q] = args.path.split("?");
      const base = join(SRC, p.slice(2));
      return q === "raw" ? { path: base, namespace: "raw" } : { path: resolveTs(base) };
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

const out = join(tmpdir(), `ideovent-test-from-poster-${process.pid}.mjs`);
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

/* ── Plumbing ────────────────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
let scope = "";
function check(ok, message) {
  if (ok) passes++;
  else {
    failures.push(`${scope}: ${message}`);
    console.log(`FAIL  ${scope}: ${message}`);
  }
}

const NOW = new Date("2026-09-27T10:00:00.000Z");
const ctx = () => ({ sites: [], pitchPages: [], now: NOW, newId: () => "ds_test" });

/** The overlay under test, or in the negative run a duplicate that ignores the poster. */
const overlay = NEGATIVE
  ? (t, c, x, o = {}) => ({
      site: M.fromTemplate(t, c, { name: o.name || x.instituteName, city: x.city, hiName: x.instituteNameHi }),
      provenance: { source: "poster", provider: "x", model: "", fields: [], at: "" },
    })
  : M.fromPoster;
const choose = NEGATIVE ? (x, hint) => hint || "s1-urban-cbse" : M.chooseTemplate;

/* ── The sample posters ──────────────────────────────────────────────────── */

const FULL = (kind, n) => ({
  kind,
  instituteName: `Riverstone Test Institute ${n}`,
  instituteNameHi: `रिवरस्टोन टेस्ट संस्थान ${n}`,
  tagline: "Small batches, weekly tests.",
  city: "Patna",
  state: "Bihar",
  locality: "Boring Road",
  board: kind === "school" ? "CBSE affiliation no. 3310999" : "",
  classes: kind === "school" ? "Nursery to Class 12" : "Class 11 to 12",
  established: "Estd. 2009",
  exams: kind === "coaching" ? ["JEE", "NEET"] : [],
  courses: [
    { name: "Two year batch", level: "Class 11", duration: "24 months", fee: "₹48,500", feeNote: "in four instalments", timings: "4 to 7 pm", batchStart: "10 April", subjects: ["Physics", "Chemistry"] },
    { name: "Crash course", fee: "Rs. 9,000" },
  ],
  faculty: [{ name: "Anil Verma", subject: "Physics", qualification: "M.Sc.", experience: "12 years" }],
  results: n % 2 === 0 ? [{ student: "Riya K.", rank: "AIR 812", exam: "JEE Main", year: "2026" }, { score: "96.4%", exam: "Class 12", year: "2026" }] : [],
  facilities: ["AC classrooms", "Library"],
  admissions: { open: true, dates: "1 to 30 April", note: "Bring two photos" },
  contact: {
    phones: ["+91 91234 56780", "0612 222 3333"],
    whatsapp: "91234 56780",
    email: "office@riverstone-test.in",
    address: "12 Boring Road\nPatna 800001",
    website: "www.riverstone-test.in",
  },
  offers: ["20% scholarship on the entrance test", "Free demo class"],
  posterLanguage: "en",
  notes: "Poster slightly blurred at the bottom",
});

const fictionalContact = (c = {}) =>
  [c.phone, c.whatsapp, c.email, ...(c.addressLines || [])].filter((v) => v && v.length > 5);

let templatesFailed = 0;

for (const id of M.TEMPLATE_IDS) {
  const before = failures.length;
  const t = await M.loadTemplate(id);
  const kind = t.meta.kind;
  const n = M.TEMPLATE_IDS.indexOf(id);
  const x = FULL(kind, n);
  const frozen = JSON.stringify(t.content);
  const { site, provenance } = overlay(t, ctx(), x, { provider: "gemini", model: "gemini-2.5-flash" });
  const json = JSON.stringify(site);
  scope = id;

  /* 1. No fiction that routes a call, and no template name. */
  const forms = M.templateNameForms(t);
  for (const form of [...forms.en, ...forms.hi]) {
    check(!json.includes(form), `the template's name "${form}" survives in the draft`);
  }
  for (const v of fictionalContact(t.content.contact)) check(!json.includes(v), `the template's contact "${v}" survives`);
  check(!/00000 00000|910000000000/.test(json), "a fictional 00000 number survives");
  check(JSON.stringify(t.content) === frozen, "the template module was mutated");

  /* 2. Contact from the poster. */
  check(site.instituteName === x.instituteName, "the name is the poster's");
  check(site.hi?.instituteName === x.instituteNameHi, "the Hindi name is the poster's");
  check(site.contact?.phone === "+91 91234 56780", "the phone is the poster's first number");
  check(site.contact?.whatsapp === "919123456780", `WhatsApp is the poster's, as wa.me digits (got ${site.contact?.whatsapp})`);
  check(site.contact?.email === "office@riverstone-test.in", "the email is the poster's");
  check(isDeepStrictEqual(site.contact?.addressLines, ["12 Boring Road", "Patna 800001"]), "the address is the poster's, one line per line");
  check(site.officialWebsite === "https://www.riverstone-test.in", "the website is the poster's, with https");
  check(isDeepStrictEqual(provenance.extraPhones, ["0612 222 3333"]), "the second number is kept in the provenance");
  check(provenance.source === "poster" && provenance.provider === "gemini", "provenance names the poster and the provider");
  check(provenance.fields.includes("contact.phone") && provenance.fields.includes("courses"), "provenance lists the poster's fields");
  check(!json.includes("Poster slightly blurred"), "the model's notes stay off the public record");

  /* 3. Where and who. */
  check(site.city === "Patna" && site.state === "Bihar", "city and state are the poster's");
  check(!site.hi?.city || site.hi.city === "Patna", "no Hindi city from the template survives");
  check(!site.hi?.state, "no Hindi state from the template survives");
  check(site.established === "Estd. 2009" && site.establishedYear === "2009", "established and its year are the poster's");
  check(site.tagline === x.tagline && !site.hi?.tagline, "a Latin tagline replaces the English and removes the template's Hindi");
  check(isDeepStrictEqual(site.facilities, x.facilities) && !site.hi?.facilities, "facilities are the poster's");
  if (kind === "school") check(site.boardOrAffiliation === x.board && !site.hi?.boardOrAffiliation, "the board is the poster's");
  if (kind === "coaching") check(isDeepStrictEqual(site.focusAreas, ["JEE", "NEET"]), "focus areas are the poster's exams");
  check(site.admissions?.whoCanApply === x.classes, "classes land in who can apply");
  check(site.admissions?.dates === "1 to 30 April" && site.admissions?.note === "Bring two photos", "admission dates and note are the poster's");
  check(site.admissionsHeadline === "Admissions open: 1 to 30 April", "an open admission sets the headline");

  /* 4. Courses and teachers replace. */
  check(site.courses?.length === 2, "the poster's two courses replace the template's");
  check(site.courses?.[0]?.fee === "48,500" && site.courses?.[1]?.fee === "9,000", "fees are the poster's, without the rupee sign");
  check(site.courses?.[0]?.batchStarts === "10 April" && site.courses?.[0]?.subjects === "Physics, Chemistry", "course fields are the poster's");
  check((site.courses || []).every((c) => !c.detail && !c.syllabus && !c.instalments && !c.seats), "no fictional course detail survives");
  check(!site.admissions?.fees && !site.admissions?.feeNote, "the template's fee table is gone beside the real fees");
  check(site.faculty?.length === 1 && site.faculty[0].name === "Anil Verma" && !site.faculty[0].photo, "the poster's teacher replaces the template's, with no stock portrait");
  check(site.notices?.[0]?.title === x.offers[0] && site.notices[0].pinned === true, "the offer is the pinned notice");
  check((site.notices || []).filter((m) => m.pinned).length === 1, "only the offer is pinned");

  /* 5. Results. */
  const plainFull = M.fromTemplate(t, ctx(), { name: x.instituteName, city: x.city, hiName: x.instituteNameHi });
  if (x.results.length) {
    check(site.results?.length === 2 && site.results[0].achievement === "AIR 812" && site.results[1].achievement === "96.4%", "the poster's results replace the template's");
    check(site.sample?.real === true, "poster results switch on 'the institute's real ones'");
    check(!M.showSampleLine(site, "results"), "no sample line under the real results");
    check(!site.reviews && !site.rating && !site.stats && !site.boardResults, "the template's reviews, rating and figures are gone, not relabelled as real");
  } else {
    check(isDeepStrictEqual(site.results, plainFull.results), "without poster results the template's stay");
    check(!site.sample?.real, "without poster results the switch stays off");
    if (plainFull.results?.length) check(M.showSampleLine(site, "results"), "the template's results keep their sample line");
    if (plainFull.reviews?.length) check(isDeepStrictEqual(site.reviews, plainFull.reviews), "the template's reviews stay, labelled");
  }
  check(isDeepStrictEqual(site.about, plainFull.about), "a field the poster lacks (about) keeps the template's");

  /* 6. A name only: exactly a plain Duplicate. */
  const bare = overlay(t, ctx(), { kind, instituteName: "Bare Name Classes" }).site;
  const plain = M.fromTemplate(t, ctx(), { name: "Bare Name Classes" });
  check(isDeepStrictEqual(bare, plain), "a poster with only a name gives exactly the plain duplicate");

  /* 7. Hindi values fill the Hindi twin. */
  const hindi = overlay(t, ctx(), { kind, instituteName: "Hindi Test", tagline: "हर बच्चे पर ध्यान", facilities: ["पुस्तकालय"] }).site;
  check(hindi.tagline === "हर बच्चे पर ध्यान" && hindi.hi?.tagline === "हर बच्चे पर ध्यान", "a Devanagari tagline fills both the field and its Hindi twin");
  check(isDeepStrictEqual(hindi.hi?.facilities, ["पुस्तकालय"]), "Devanagari facilities fill the Hindi list");

  if (failures.length > before) templatesFailed++;
  else console.log(`ok    ${id}`);
}

/* ── Which template ──────────────────────────────────────────────────────── */

scope = "chooseTemplate";
const CHOICES = [
  [{ kind: "coaching", exams: ["JEE Main", "NEET"], classes: "Class 11, 12 and droppers" }, "c1-jee-neet-urban"],
  [{ kind: "coaching", courses: [{ name: "IIT-JEE two year programme" }] }, "c1-jee-neet-urban"],
  [{ kind: "coaching", exams: ["SSC CGL", "Bank PO", "Railway NTPC"] }, "c5-government-jobs"],
  [{ kind: "coaching", tagline: "UP Police constable batch", posterLanguage: "hi" }, "c5-government-jobs"],
  [{ kind: "coaching", focusAreas: ["Olympiad", "NTSE"], classes: "Class 6 to 10" }, "c4-foundation"],
  [{ kind: "coaching", courses: [{ name: "IIT foundation", level: "Class 8 to 10" }] }, "c4-foundation"],
  [{ kind: "coaching", classes: "Class VI to X", courses: [{ name: "Maths and science" }] }, "c4-foundation"],
  [{ kind: "coaching", courses: [{ name: "Physics and chemistry classes", subjects: ["Physics", "Chemistry", "Biology"] }] }, "c3-science"],
  [{ kind: "coaching", tagline: "All subjects tuition, Class 1 to 12", locality: "Gram Rampur" }, "c2-rural-tuition"],
  [{ kind: "coaching", instituteName: "शर्मा ट्यूशन सेंटर", posterLanguage: "hi" }, "c2-rural-tuition"],
  [{ kind: "school", classes: "Play group, Nursery, LKG, UKG" }, "s3-play-school"],
  [{ kind: "school", instituteName: "Little Steps Pre-School" }, "s3-play-school"],
  [{ kind: "school", board: "CBSE", facilities: ["Boarding for boys and girls"], classes: "Class 3 to 12" }, "s4-residential"],
  [{ kind: "school", board: "Cambridge IGCSE and IB Diploma" }, "s5-international"],
  [{ kind: "school", board: "UP Board", classes: "Class 1 to 12", tagline: "Hindi medium" }, "s2-rural-state-board"],
  [{ kind: "school", instituteName: "सरस्वती विद्या मंदिर", posterLanguage: "hi", classes: "कक्षा 1 से 8" }, "s2-rural-state-board"],
  [{ kind: "school", board: "CBSE", classes: "Nursery to Class 12", city: "Lucknow" }, "s1-urban-cbse"],
  [{ kind: "school", board: "ICSE", classes: "Nursery to Class 10" }, "s1-urban-cbse"],
];
let choiceFails = 0;
for (const [x, want] of CHOICES) {
  const got = choose(x, "s1-urban-cbse");
  if (got !== want) choiceFails++;
  check(got === want, `${JSON.stringify(x)} chose ${got}, expected ${want}`);
}
/* The hint is used only when no rule matches, and only for the right kind. */
check(choose({ kind: "coaching", instituteName: "Bright Classes" }, "c3-science") === "c3-science", "a matching-kind hint is used when no rule matches");
check(choose({ kind: "coaching", instituteName: "Bright Classes" }, "s5-international") === "c2-rural-tuition", "a hint of the other kind is ignored");
check(choose({ kind: "coaching", exams: ["NEET"] }, "c2-rural-tuition") === "c1-jee-neet-urban", "a rule beats the hint");

/* normalizeExtract drops the model's placeholders. */
const norm = M.normalizeExtract({ kind: "school", city: "N/A", tagline: "  Learn  well ", courses: [{}, { name: "KG" }], contact: { phones: ["", "98765 43210"] } });
check(norm.city === undefined && norm.tagline === "Learn well", "placeholders become empty and spaces are tidied");
check(norm.courses?.length === 1 && norm.contact?.phones?.length === 1, "empty rows and empty phones are dropped");

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log("");
console.log(`${passes} checks passed, ${failures.length} failed; ${templatesFailed} of ${M.TEMPLATE_IDS.length} templates failed; ${choiceFails} of ${CHOICES.length} choices wrong.`);
if (NEGATIVE) {
  const ok = templatesFailed === M.TEMPLATE_IDS.length && choiceFails > 0;
  console.log(ok
    ? "NEGATIVE CONTROL OK: with the poster ignored, every template failed and the choice table failed."
    : "NEGATIVE CONTROL BROKEN: some template passed with the poster ignored, so the assertions are not reaching it.");
  process.exit(ok ? 0 : 1);
}
process.exit(failures.length ? 1 : 0);
