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
 *   7. the story (30 Sep 2026): the poster's founding year is written, the
 *      template's history beside it stays and keeps its sample line (the
 *      results switch does not remove it); only a draft with none of the
 *      template's history left gets no story line;
 * and chooseTemplate maps a set of sample posters to the right ids.
 *
 * AND FOR EVERY ONE OF THE SEVEN DENTAL TEMPLATES (28 Sep 2026), from a
 * fictional clinic's card: the card's doctors, treatments, hours, fees and
 * contact fill the template's DentalContent; no template doctor, hour or
 * price is left posing as the clinic's; offers, superlatives and made-up
 * specialist titles stay off the page and are named in the private note;
 * every field the note claims as read traces to the card; reviews, trust
 * figures and before-after cases keep their sample lines; a name-only card
 * is exactly the plain duplicate. dentalPosterTemplate picks by the one
 * shared rule (dentalTemplateFor), and the Dental Council check reads a
 * table of lines right.
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
export {
  normalizeDentalExtract, dentalPosterTemplate, dentalClaimIssue, specialisationIssue, toKind, posterLooksDental,
} from "@/lib/ai/dentalPosterSchema";
export { showSampleLine, isCarried } from "@/lib/demo/site/sample";
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

/**
 * The story's one exception (storyPrint in fromPoster.ts): a template with
 * no history text left, given the poster's own year, has nothing of the
 * template's in its story, so no line; without a year from the poster the
 * template's year stays, labelled.
 */
function storyCheck(t, kind, name) {
  const noHistory = structuredClone(t);
  delete noHistory.content.about;
  if (noHistory.content.hi) delete noHistory.content.hi.about;
  const withYear = overlay(noHistory, ctx(), { kind, instituteName: name, established: "Estd. 2009" }).site;
  const noYear = overlay(noHistory, ctx(), { kind, instituteName: name }).site;
  return !withYear.sample?.prints?.story && !M.showSampleLine(withYear, "story") && M.showSampleLine(noYear, "story");
}

let templatesFailed = 0;

/* The ten school and coaching templates. The seven dental ones have their own section below. */
const SC_IDS = M.TEMPLATE_IDS.filter((id) => !id.startsWith("d"));
const DENTAL_IDS = M.TEMPLATE_IDS.filter((id) => id.startsWith("d"));

for (const id of SC_IDS) {
  const before = failures.length;
  const t = await M.loadTemplate(id);
  const kind = t.meta.kind;
  const n = SC_IDS.indexOf(id);
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

  /* 5b. The story: the poster's year is real, the history beside it is the template's, labelled. */
  check(Boolean(site.sample?.prints?.story) && M.showSampleLine(site, "story"), "the template's history keeps its sample line beside the poster's year");
  const storyEdited = structuredClone(site);
  storyEdited.about = `${storyEdited.about || ""} Edited.`;
  check(!M.showSampleLine(storyEdited, "story"), "editing the history removes its line");
  check(storyCheck(t, kind, "Year Only Classes"), "with none of the template's history left, the poster's own year carries no line; without the year the template's keeps it");

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

/* ── Dental clinics (28 Sep 2026) ────────────────────────────────────────── */

/* A clinic's visiting card, fictional throughout. It carries what the Dental
   Council code keeps off a clinic's site, to prove it stays off: two offers,
   a "painless" treatment, a "Free" fee and an unrecognised specialist title. */
const DENTAL = (n) => ({
  kind: "dental",
  instituteName: `Example Dental Clinic ${n}`,
  instituteNameHi: `उदाहरण डेंटल क्लिनिक ${n}`,
  tagline: "Family dentistry, explained before we start",
  city: "Patna",
  state: "Bihar",
  locality: "Boring Road",
  established: "Since 2011",
  doctors: [
    { name: "Dr. Asha Verma", degrees: "BDS, MDS (Orthodontics)", registration: "Reg. No. A-99999", specialisation: "Orthodontist", experience: "11 years", days: "Mon to Sat" },
    { name: "Dr. Kunal Rao", degrees: "BDS", specialisation: "Implantologist" },
  ],
  treatments: ["Root Canal Treatment", "Braces and Aligners", "Sports mouthguards", "Painless Extraction"],
  timings: "Mon to Sat 10 am to 2 pm, 5 to 9 pm. Sunday closed",
  fees: [
    { treatment: "Consultation", fee: "₹200" },
    { treatment: "RCT", fee: "₹2,500/- onwards", unit: "per tooth" },
    { treatment: "Scaling", fee: "Free" },
  ],
  contact: {
    phones: ["+91 98765 43210", "0612 000 1111"],
    whatsapp: "98765 43210",
    email: "hello@example-dental.test",
    address: "12 Boring Road\nPatna 800001",
    website: "www.example-dental.test",
  },
  offers: ["Free dental check-up camp every Sunday", "20% off on implants"],
  posterLanguage: "en",
  notes: "Visiting card, slightly blurred",
});
const FAMILY = { 0: /root\s*canal|rct|endodont/i, 1: /brace|aligner|orthodont/i };

let dentalFailed = 0;
for (const id of DENTAL_IDS) {
  const before = failures.length;
  const t = await M.loadTemplate(id);
  const n = DENTAL_IDS.indexOf(id);
  const x = DENTAL(n);
  const frozen = JSON.stringify(t.content);
  const { site, provenance } = overlay(t, ctx(), x, { provider: "gemini", model: "gemini-3.8-flash" });
  const plain = M.fromTemplate(t, ctx(), { name: x.instituteName, city: x.city, hiName: x.instituteNameHi });
  const d = site.dental || {};
  const td = plain.dental || {};
  const json = JSON.stringify(site);
  scope = id;

  /* 1. No template name or contact survives; the module is untouched. */
  for (const form of [...M.templateNameForms(t).en, ...M.templateNameForms(t).hi]) check(!json.includes(form), `the template's name "${form}" survives`);
  check(!/00000 00000|910000000000|hello@example\.com/.test(json), "a fictional template contact survives");
  check(JSON.stringify(t.content) === frozen, "the template module was mutated");

  /* 2. The clinic's own facts. */
  check(site.kind === "dental" && site.instituteName === x.instituteName && site.hi?.instituteName === x.instituteNameHi, "the name and Hindi name are the clinic's");
  check(site.city === "Patna" && site.state === "Bihar" && site.establishedYear === "2011", "city, state and year are the clinic's");
  check(site.tagline === x.tagline && !site.hi?.tagline, "the tagline is the clinic's, the template's Hindi one gone");
  check(site.contact?.phone === "+91 98765 43210" && site.contact?.whatsapp === "919876543210", "phone and WhatsApp are the clinic's");
  check(site.contact?.email === "hello@example-dental.test" && site.officialWebsite === "https://www.example-dental.test", "email and website are the clinic's");
  check(isDeepStrictEqual(site.contact?.addressLines, ["12 Boring Road", "Patna 800001"]), "the address is the clinic's");
  check(site.contact?.hours === x.timings && !site.contact?.hi?.hours, "the hours are the clinic's, the template's Hindi hours gone");

  /* 3. Doctors replace the template's, with no stock portrait and no invented title. */
  const docs = d.doctors || [];
  check(docs.length === 2 && docs.every((doc) => !doc.photo), "the two doctors replace the template's, with no photos");
  check(docs[0]?.name === "Dr. Asha Verma" && docs[0]?.qualification === "BDS, MDS (Orthodontics)" && docs[0]?.regNo === "Reg. No. A-99999"
    && docs[0]?.specialisation === "Orthodontist" && docs[0]?.days === "Mon to Sat", "the first doctor's degrees, registration and days are the card's");
  check(docs[1]?.qualification === "BDS" && !docs[1]?.specialisation, "'Implantologist' is not printed as a specialty");
  const templateDoctors = (td.doctors || []).map((doc) => doc.name);
  check(!docs.some((doc) => templateDoctors.includes(doc.name)), "no template doctor is presented as the clinic's");
  check(!d.hero?.credential && !d.hero?.hi?.credential, "the template's credential line is gone");
  check((d.branches || []).every((b) => !b.doctors), "no branch lists a template doctor");
  check(!site.sample?.prints?.doctors && !M.showSampleLine(site, "doctors"), "the clinic's doctors carry no sample line");

  /* 4. Treatments: the template's pages first and featured, a new one by name only. */
  const tx = d.treatments || [];
  const featured = tx.filter((tr) => tr.featured);
  check(featured.length === 3 && tx.slice(0, 3).every((tr) => tr.featured), "the card's three allowed treatments lead, featured");
  for (const i of [0, 1]) {
    const page = (td.treatments || []).find((tr) => FAMILY[i].test(`${tr.name} ${tr.slug}`));
    check(page ? tx[i]?.slug === page.slug : tx[i]?.name === x.treatments[i], `treatment ${i + 1} is the template's own page when it has one`);
  }
  check(tx[2]?.name === "Sports mouthguards" && !tx[2]?.summary && !tx[2]?.what, "a treatment with no page is added by name, with nothing written about it");
  check(tx.length === (td.treatments || []).length + tx.filter((tr) => !(td.treatments || []).some((p) => p.slug === tr.slug)).length, "no template treatment is lost");
  check(d.hero?.lead === "Root Canal Treatment, Braces and Aligners and Sports mouthguards, in Boring Road, Patna.", `the hero lead lists the card's treatments (${d.hero?.lead})`);

  /* 5. Hours: every fictional hour goes. */
  check(d.hero?.pill === x.timings && !d.hero?.nextSlot, "the hero pill is the clinic's hours, the fictional next slot gone");
  check(!d.sessions && !d.booking?.closedNote && !d.booking?.closedDays && !d.emergency?.hours, "the template's sessions, closed days and emergency hours are gone");

  /* 6. Fees replace; no template price beside a real one. */
  check(isDeepStrictEqual((d.fees || []).map((f) => [f.treatment, f.from, f.unit]), [["Consultation", "200", undefined], ["RCT", "2,500", "per tooth"]]),
    `the fee table is the card's two priced rows (${JSON.stringify(d.fees)})`);
  /* The consultation fee prices the check-up page, as the templates' own fee tables pair them. */
  check(tx.every((tr) => !tr.fromPrice || ["2,500", "200"].includes(tr.fromPrice)), `no template 'from' price survives (${tx.filter((tr) => tr.fromPrice).map((tr) => `${tr.slug}:${tr.fromPrice}`)})`);
  check(!d.plans && !d.payment?.consultFee, "the template's plans and consultation fee line are gone");

  /* 7. The Dental Council code: offers and claims stay off the page, and are named privately. */
  for (const bad of ["Free dental check-up", "20% off", "Painless Extraction", "Implantologist", "Visiting card, slightly blurred"]) {
    check(!json.includes(bad), `"${bad}" reached the public record`);
  }
  const left = (provenance.leftOut || []).join(" | ");
  check(["Free dental check-up", "20% off", "Painless Extraction", "Implantologist", "Scaling Free"].every((b) => left.includes(b)), `provenance names what was left out (${left})`);
  check(M.provenanceNote(provenance, "Gemini").includes("Dental Council"), "the private note says why");

  /* Nothing is claimed as read that the card did not carry: every field the
     private note lists as "filled from the poster" traces to a card field. */
  const READ_FROM = {
    instituteName: "instituteName", "hi.instituteName": "instituteNameHi", city: "city", state: "state",
    established: "established", establishedYear: "established", tagline: "tagline",
    "dental.treatments": "treatments", "dental.hero.lead": "treatments", "dental.doctors": "doctors",
    "contact.hours": "timings", "dental.hero.pill": "timings", "dental.fees": "fees",
    "contact.phone": "contact", "contact.whatsapp": "contact", "contact.email": "contact",
    "contact.addressLines": "contact", officialWebsite: "contact",
  };
  const untraced = provenance.fields.filter((f) => !READ_FROM[f] || x[READ_FROM[f]] === undefined);
  check(provenance.fields.length > 10 && !untraced.length, `every field claimed as read comes from the card (untraced: ${untraced.join(", ") || "none"})`);

  /* 8. Everything the card does not show stays the template's, labelled as sample. */
  check(!site.sample?.real, "a poster never marks a clinic's reviews or figures as real");
  if (plain.reviews?.length) check(isDeepStrictEqual(site.reviews, plain.reviews) && M.showSampleLine(site, "reviews"), "the template's reviews stay, with the sample line");
  if (plain.stats?.length) check(M.showSampleLine(site, "stats"), "the trust figures keep their sample line");
  if (td.cases?.length) check(isDeepStrictEqual(d.cases, td.cases) && M.showSampleLine(site, "cases"), "the before-after cases stay, labelled as illustrations");
  check(isDeepStrictEqual(d.technology, td.technology) && isDeepStrictEqual(site.about, plain.about), "technology and about stay the template's");
  /* The story: the card's year is real, the history beside it is the template's, labelled. */
  check(site.established === "Since 2011" && Boolean(site.sample?.prints?.story) && M.showSampleLine(site, "story"), "the template's history keeps its sample line beside the card's year");
  check(storyCheck(t, "dental", "Year Only Dental"), "with none of the template's history left, the card's own year carries no line; without the year the template's keeps it");

  /* 9. A name only: exactly the plain duplicate. Hindi values fill the Hindi twins. */
  const bareRun = overlay(t, ctx(), { kind: "dental", instituteName: "Bare Name Dental" });
  const bare = bareRun.site;
  check(isDeepStrictEqual(bare, M.fromTemplate(t, ctx(), { name: "Bare Name Dental" })), "a card with only a name gives exactly the plain duplicate");
  check(M.showSampleLine(bare, "story"), "a card with only a name keeps the history's line");
  check(isDeepStrictEqual(bareRun.provenance.fields, ["instituteName"]) && !bareRun.provenance.leftOut, "a card with only a name claims only the name as read");
  const hindi = overlay(t, ctx(), { kind: "dental", instituteName: "Hindi Dental", tagline: "पूरे परिवार के दाँतों की देखभाल", treatments: ["रूट कैनाल", "ब्रेसेज़"] }).site;
  check(hindi.hi?.tagline === "पूरे परिवार के दाँतों की देखभाल" && hindi.dental?.hero?.hi?.lead === "रूट कैनाल, ब्रेसेज़", "Devanagari values fill the Hindi twins");

  if (failures.length > before) dentalFailed++;
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

/* ── Dental: the template, the code, the contract ────────────────────────── */

scope = "dental template choice";
const chooseDental = NEGATIVE ? () => "d1-family-dentist" : M.dentalPosterTemplate;
const DENTAL_CHOICES = [
  [{ instituteName: "Example Family Dental Clinic", treatments: ["Check-up", "Fillings"] }, "d1-family-dentist"],
  [{ instituteName: "Example Multispeciality Dental Centre" }, "d2-multispeciality"],
  [{ instituteName: "Example Smile Studio", treatments: ["Veneers", "Teeth whitening"] }, "d3-smile-studio"],
  [{ instituteName: "Example Dental Care", treatments: ["Dental implants", "Full mouth rehabilitation"] }, "d4-implant-centre"],
  [{ instituteName: "Example Dental", treatments: ["Braces", "Clear aligners"] }, "d5-ortho-aligners"],
  [{ instituteName: "Example Kids Dental Clinic", treatments: ["Braces"] }, "d6-kids-dental"],
  [{ instituteName: "Example Dental Clinics, 6 branches" }, "d7-dental-chain"],
];
let dentalChoiceFails = 0;
for (const [x, want] of DENTAL_CHOICES) {
  const got = chooseDental(x);
  if (got !== want) dentalChoiceFails++;
  check(got === want, `${JSON.stringify(x)} chose ${got}, expected ${want}`);
}

scope = "Dental Council check";
const CLAIMS = [
  ["Free check-up", "inducement"], ["FREE Consultation", "inducement"], ["20% off on implants", "inducement"], ["Dental camp this Sunday", "inducement"],
  ["Refer a friend and earn Rs 500", "inducement"], ["मुफ़्त जाँच", "inducement"], ["No cost EMI", "inducement"],
  ["Best dental clinic in Patna", "claim"], ["Painless root canal", "claim"], ["5000+ happy patients", "claim"], ["100% sterilised", "claim"],
  ["Root canal treatment", null], ["Metal-free crowns", null], ["Tooth-coloured fillings", null], ["Braces for teenagers and adults", null],
  ["Mon to Sat, 10 am to 8 pm", null], ["सुबह 10 से शाम 8", null],
];
for (const [line, want] of CLAIMS) check(M.dentalClaimIssue(line) === want, `"${line}" read as ${M.dentalClaimIssue(line)}, expected ${want}`);
check(M.specialisationIssue("Implantologist") === "title" && M.specialisationIssue("Cosmetic dentist") === "title", "unrecognised titles are caught");
check(M.specialisationIssue("Orthodontist") === null && M.specialisationIssue("Paediatric dentist") === null, "recognised specialties pass");

scope = "dental contract";
const nd = M.normalizeDentalExtract({ kind: "coaching", instituteName: " Example  Dental ", city: "N/A", board: "CBSE",
  doctors: [{}, { name: "Dr. A", degrees: "BDS" }], treatments: ["RCT", "", "RCT"], timings: "Mon to Sat\n10 to 8", fees: [{ fee: "" }], junk: 1 });
check(nd.kind === "dental" && nd.instituteName === "Example Dental" && !("city" in nd) && !("board" in nd) && !("junk" in nd), "the clinic contract keeps only clinic fields");
check(nd.doctors?.length === 1 && isDeepStrictEqual(nd.treatments, ["RCT"]) && !nd.fees && nd.timings === "Mon to Sat\n10 to 8", "empty rows and repeats go, line breaks stay");
const asDental = M.toKind({ kind: "coaching", instituteName: "X", faculty: [{ name: "Dr. B", qualification: "BDS", subject: "Orthodontist" }] }, "dental");
check(asDental.kind === "dental" && asDental.doctors?.[0]?.degrees === "BDS" && asDental.doctors[0].specialisation === "Orthodontist", "switching to dental turns teachers into doctors");
check(M.posterLooksDental({ instituteName: "Example Dental Care" }) && !M.posterLooksDental({ instituteName: "Example Classes" }), "a dental name is recognised");
if (!NEGATIVE) {
  const d1 = await M.loadTemplate("d1-family-dentist");
  const viaSchool = M.fromPoster(d1, ctx(), { kind: "coaching", instituteName: "Example Dental", faculty: [{ name: "Dr. C", qualification: "BDS" }] }).site;
  check(viaSchool.dental?.doctors?.[0]?.name === "Dr. C", "a school-shaped extract on a dental template goes through the dental overlay");
  const s1 = await M.loadTemplate("s1-urban-cbse");
  const viaDentalRun = M.fromPoster(s1, ctx(), { kind: "dental", instituteName: "Example School", doctors: [{ name: "Ms D", degrees: "M.Sc." }],
    offers: ["Free dental check-up camp"] });
  const viaDental = viaDentalRun.site;
  check(viaDental.faculty?.[0]?.name === "Ms D" && !viaDental.dental, "a clinic extract on a school template becomes teachers, never a dental block");
  check(!JSON.stringify(viaDental).includes("Free dental check-up camp") && /Free dental check-up camp/.test((viaDentalRun.provenance.leftOut || []).join(" ")),
    "a clinic's offer is never printed, even on a school template, and the private note names it");
  const schoolOffer = M.fromPoster(s1, ctx(), { kind: "school", instituteName: "Example School", offers: ["Admission open for Nursery"] }).site;
  check(schoolOffer.notices?.[0]?.title === "Admission open for Nursery" && schoolOffer.notices[0].pinned, "a school's own offer still becomes its pinned notice");
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log("");
console.log(`${passes} checks passed, ${failures.length} failed; ${templatesFailed} of ${SC_IDS.length} school and coaching templates failed; ${dentalFailed} of ${DENTAL_IDS.length} dental templates failed; ${choiceFails} of ${CHOICES.length} choices wrong; ${dentalChoiceFails} of ${DENTAL_CHOICES.length} dental choices wrong.`);
if (NEGATIVE) {
  const ok = templatesFailed === SC_IDS.length && dentalFailed === DENTAL_IDS.length && choiceFails > 0 && dentalChoiceFails > 0;
  console.log(ok
    ? "NEGATIVE CONTROL OK: with the poster ignored, every template failed and the choice table failed."
    : "NEGATIVE CONTROL BROKEN: some template passed with the poster ignored, so the assertions are not reaching it.");
  process.exit(ok ? 0 : 1);
}
process.exit(failures.length ? 1 : 0);
