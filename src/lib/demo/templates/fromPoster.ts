/**
 * A DEMO FROM A POSTER: the template duplicate, with the poster's facts on top.
 *
 * Mehdi photographs an institute's poster (a hoarding, a pamphlet, a WhatsApp
 * forward), /api/poster reads it into a `PosterExtract`, he reviews every
 * field, and this function builds the draft:
 *
 *   1. `fromTemplate` first, with the poster's name, city and Hindi name, so
 *      the draft carries the WHOLE template under the new name exactly as a
 *      plain Duplicate does (contact cleared, sample labels, fingerprints);
 *   2. then the poster's facts OVERLAID, field by field (the table below).
 *
 * ── THE RULE: NEVER INVENT ────────────────────────────────────────────────
 * A field the poster does not show is not touched: the template's content
 * stays, with the sample labels it already carries. Nothing here writes a
 * fact that is not in the extract. The only words of ours are two labels
 * ("Admissions open", and its Hindi) that restate a flag the poster set.
 *
 * ── THE TABLE ─────────────────────────────────────────────────────────────
 *   poster field       lands in
 *   ─────────────────  ──────────────────────────────────────────────────────
 *   instituteName(Hi)  instituteName, hi.instituteName (through fromTemplate)
 *   city, state        city, state (and their Hindi twins); a new city also
 *                      renames the template's city in every string
 *   locality           the first address line when there is no address, and
 *                      the map search
 *   board              boardOrAffiliation
 *   established        established; establishedYear when it holds a year.
 *                      The template's history (`about`) stays, and so does
 *                      the story's sample line (storyPrint below)
 *   classes            admissions.whoCanApply
 *   tagline            tagline
 *   exams, focusAreas  focusAreas (at most three: the coaching hero line)
 *   courses            REPLACE the template's courses. Only the template's
 *                      `mode` (Classroom, Online) is kept, as generic
 *                      structure; its fee, dates, syllabus and detail are
 *                      fiction and go. The template's fee table in
 *                      admissions goes too: it would print fictional fees
 *                      beside the real ones
 *   faculty            REPLACE the template's teachers, with no photos (the
 *                      stock portraits are of models, not of these people)
 *   results            REPLACE the template's results, and switch on "Results
 *                      and reviews on this demo are the institute's real
 *                      ones", because they are the institute's own published
 *                      claims. That switch also unlabels the reviews and the
 *                      trust figures, so the template's fictional reviews,
 *                      rating, stats and board-result table are REMOVED: the
 *                      switch must never present fiction as the institute's
 *   facilities         facilities
 *   admissions         admissions.dates and .note; "open" sets the headline
 *   contact            phone (the first number), WhatsApp, email, address,
 *                      website. These ARE filled: they are the institute's
 *                      own published details, the one thing a plain Duplicate
 *                      must leave empty. Further numbers go in the provenance
 *   offers             one pinned notice at the top of the notices; never a
 *                      clinic's card's, even on a school template (they go
 *                      to the provenance's leftOut, as on a dental one)
 *   notes              the provenance only (Mehdi's eyes, never the page)
 *
 * ── HINDI ─────────────────────────────────────────────────────────────────
 * A value written in Devanagari goes in the plain field AND its Hindi twin:
 * the poster has no English for it, and both pages must show the institute's
 * own words rather than the template's. A value in Latin script goes in the
 * plain field and the Hindi twin is REMOVED, so the Hindi page falls back to
 * the poster's English instead of printing the template's Hindi fiction.
 *
 * ── PROVENANCE ────────────────────────────────────────────────────────────
 * Returned beside the draft, not written on it: `demoSites` is world-readable
 * (the director opens it without an account), and which AI read the poster
 * and the model's private notes are Mehdi's business. The dialog saves it on
 * the demo's private slot (`demoSiteSlots`, admin-only).
 *
 * ── A DENTAL CLINIC (28 Sep 2026) ─────────────────────────────────────────
 * A dental template takes a DentalPosterExtract (src/lib/ai/dentalPosterSchema.ts)
 * through `fromDentalPoster`, by the same rule: fromTemplate first, the
 * clinic's facts on top, everything else the template's LABELLED SAMPLE.
 *
 *   poster field       lands in
 *   ─────────────────  ──────────────────────────────────────────────────────
 *   name, city, state, established, contact     as for a school (above)
 *   tagline            tagline
 *   treatments         the template's matching treatment pages are kept and
 *                      featured, in the poster's order; a treatment with no
 *                      page is added by name only; the rest follow, not
 *                      featured. The hero's lead line lists the poster's
 *                      treatments (and the tagline too, when none is printed)
 *   doctors            REPLACE the template's doctors: name, degrees,
 *                      registration, specialisation, experience, days. No
 *                      photo (a stock portrait is somebody else), and the
 *                      template's credential line and branch rosters go
 *   timings            contact.hours and the hero pill; the template's
 *                      sessions, closed days, next-slot card and emergency
 *                      hours go, because they are fictional hours
 *   fees               REPLACE the fee table (a matching treatment page gets
 *                      its "from" price); every other template price goes,
 *                      with the family plans and the consultation fee line
 *   offers, notes      the private provenance only, NEVER the page
 *
 * THE DENTAL COUNCIL CODE: a tagline, treatment, fee or doctor line that
 * carries an inducement ("free", "20% off", a camp), a superlative ("best",
 * "painless") or an unrecognised specialist title is left out, and each is
 * named in `provenance.leftOut` for Mehdi. Offers are never printed. The
 * trust figures, reviews, rating, before-after cases and the history stay
 * the template's and keep their sample lines: a poster never makes them real.
 *
 * Pure, like fromTemplate: no store, no clock unless the context passes none.
 */

import type {
  DemoContactDetails, DemoCourse, DemoFaculty, DemoResult, DemoSampleMarks, DemoSite, DentalContent, DentalDoctor, DentalFeeRow, DentalTreatment,
} from "@/lib/cms/types";
import { hasDevanagari, type PosterContact, type PosterExtract } from "@/lib/ai/posterSchema";
import {
  CLAIM_REASON, dentalClaimIssue, isDentalExtract, specialisationIssue, toKind,
  type AnyPosterExtract, type ClaimIssue, type DentalPosterExtract, type PosterDraft,
} from "@/lib/ai/dentalPosterSchema";
import { samplePrints } from "../site/sample";
import { fromTemplate, type FromTemplateContext } from "./fromTemplate";
import type { LoadedTemplate } from "./shape";

export interface PosterProvenance {
  source: "poster";
  provider: string;
  model: string;
  /** Dotted paths of the demo fields the poster filled, in the order written. */
  fields: string[];
  /** ISO timestamp of the build. */
  at: string;
  /** Phone numbers after the first: the page shows one number. */
  extraPhones?: string[];
  /** The model's own remarks on the poster. Never shown on the page. */
  notes?: string;
  /** Dental: what the Dental Council code kept off the page, each with its reason. */
  leftOut?: string[];
}

export interface FromPosterOptions {
  /** Overrides the poster's name (the dialog's name field). */
  name?: string;
  /** Overrides the poster's Hindi name. */
  hiName?: string;
  /** Who read it, for the provenance. "manual" when Mehdi typed it all. */
  provider?: string;
  model?: string;
}

type Obj = Record<string, unknown>;
type WithHi = { hi?: Obj } & Obj;

const clean = (s: string | undefined) => (s || "").trim();
const listOf = (l: string[] | undefined) => (l || []).map(clean).filter(Boolean);

/**
 * Write one text field and its Hindi twin by the rule in the header.
 * `obj` is the object holding the field (the site, admissions, a course).
 */
function setBi(obj: WithHi, key: string, value: string): void {
  obj[key] = value;
  if (hasDevanagari(value)) {
    obj.hi = { ...(obj.hi || {}), [key]: value };
  } else if (obj.hi) {
    delete obj.hi[key];
    if (!Object.keys(obj.hi).length) delete obj.hi;
  }
}

/** The same for a list: a list with every line in Devanagari is Hindi too. */
function setBiList(obj: WithHi, key: string, value: string[]): void {
  obj[key] = value;
  if (value.length && value.every(hasDevanagari)) {
    obj.hi = { ...(obj.hi || {}), [key]: value };
  } else if (obj.hi) {
    delete obj.hi[key];
    if (!Object.keys(obj.hi).length) delete obj.hi;
  }
}

/** Drop a field and its Hindi twin: used where the template's fiction must go. */
function dropBi(obj: WithHi, key: string): void {
  delete obj[key];
  if (obj.hi) {
    delete obj.hi[key];
    if (!Object.keys(obj.hi).length) delete obj.hi;
  }
}

/** A Hindi twin on a list item, only for the fields written in Devanagari. */
function itemHi<T extends Obj>(item: T, keys: (keyof T & string)[]): T {
  const hi: Obj = {};
  for (const k of keys) if (typeof item[k] === "string" && hasDevanagari(item[k] as string)) hi[k] = item[k];
  if (Object.keys(hi).length) (item as Obj).hi = hi;
  for (const k of Object.keys(item)) if (item[k] === undefined || item[k] === "") delete item[k];
  return item;
}

/**
 * A fee as the record wants it: the amount only, because the page prints the
 * currency symbol from `currency` and "₹ ₹45,000" is what a copied rupee sign
 * would give. Everything else is kept exactly as printed.
 */
export function posterFee(fee: string | undefined): string {
  return clean(fee).replace(/^(₹|rs\.?|inr|रु\.?|रुपये)\s*/i, "").trim();
}

/** WhatsApp as wa.me wants it: digits with the country code. A 10-digit Indian mobile gets 91. */
export function posterWhatsapp(v: string | undefined): string {
  const digits = clean(v).replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : "";
}

/** A website as a link: the scheme added when the poster printed "www.x.in". */
export function posterWebsite(v: string | undefined): string {
  const s = clean(v).replace(/\s+/g, "");
  if (!s || !/[a-z0-9-]+\.[a-z]{2,}/i.test(s)) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, "")}`;
}

/** The name the draft is made under: the override, else the poster's. */
export function posterName(
  x: Pick<PosterExtract, "instituteName" | "instituteNameHi">,
  opts: FromPosterOptions = {},
): { name: string; hiName: string } {
  const name = clean(opts.name) || clean(x.instituteName) || clean(x.instituteNameHi);
  const hiName =
    clean(opts.hiName) || clean(x.instituteNameHi) || (hasDevanagari(name) ? name : "");
  return { name, hiName: hiName === name && !hasDevanagari(name) ? "" : hiName };
}

/* ── The part every kind shares ──────────────────────────────────────────── */

type Named = Pick<PosterExtract, "instituteName" | "instituteNameHi" | "city" | "state" | "established">;

/** The template duplicate under the poster's name, then where it is and since when. */
function startFromPoster(template: LoadedTemplate, ctx: FromTemplateContext, x: Named, opts: FromPosterOptions, noun: string) {
  const { name, hiName } = posterName(x, opts);
  if (!name) throw new Error(`${noun} name is required. Type it in, as the poster spells it.`);
  const city = clean(x.city);
  /* Only a Latin-script city goes through the renamer: it writes the new
     city into English strings, and a Devanagari one would land there. */
  const site = fromTemplate(template, ctx, {
    name,
    city: city && !hasDevanagari(city) ? city : "",
    hiName,
  });
  const s = site as unknown as WithHi;
  const fields: string[] = ["instituteName"];
  if (hiName) fields.push("hi.instituteName");

  /* ── Where ── */
  if (city) {
    setBi(s, "city", city);
    fields.push("city");
    /* fromTemplate empties the state when the city moves, but not its Hindi. */
    if (city.toLowerCase() !== clean(template.content.city).toLowerCase() && !clean(x.state)) dropBi(s, "state");
  }
  if (clean(x.state)) {
    setBi(s, "state", clean(x.state));
    fields.push("state");
  }
  if (clean(x.established)) {
    setBi(s, "established", clean(x.established));
    fields.push("established");
    const year = clean(x.established).match(/\b(1[89]\d\d|20\d\d)\b/);
    if (year) {
      setBi(s, "establishedYear", year[1]);
      fields.push("establishedYear");
    } else dropBi(s, "establishedYear");
  }
  return { site, s, fields, name, city, now: ctx.now || new Date() };
}

/**
 * THE STORY'S PRINT on a poster draft (30 Sep 2026). A poster gives at most
 * the founding year ("Estd. 2009"), never the history, so the template's
 * `about` text is still on the draft, renamed. While it is, the story is
 * still the template's: the block keeps a print taken from the draft as it
 * now stands (the fees rule below), and the About page keeps its line under
 * the story until Mehdi edits it. Only a draft with none of the template's
 * history left (a template without an `about`, given the poster's own year)
 * has a story that is the institute's, and that one gets no print.
 */
function storyPrint(site: DemoSite, prints: DemoSampleMarks["prints"], posterYear: boolean): void {
  const history = [site.about, site.hi?.about].some((t) => clean(t));
  if (posterYear && !history) delete prints.story;
}

/* ── The function ────────────────────────────────────────────────────────── */

/**
 * The draft for `template` from a reviewed poster. A dental template goes
 * through fromDentalPoster; an extract of the other family is converted by
 * toKind first (the template decides the pages, as the review screen says).
 */
export function fromPoster(
  template: LoadedTemplate,
  ctx: FromTemplateContext,
  input: AnyPosterExtract | PosterDraft,
  opts: FromPosterOptions = {},
): { site: DemoSite; provenance: PosterProvenance } {
  if (template.meta.kind === "dental") {
    const d = isDentalExtract(input) ? input : (toKind(input as PosterDraft, "dental") as DentalPosterExtract);
    return fromDentalPoster(template, ctx, d, opts);
  }
  /* A clinic's card on a school or coaching template is still a clinic's
     card: its offers are never printed (DCI 8.1.3), whatever the design. */
  const clinicCard = isDentalExtract(input);
  const x = (clinicCard ? toKind(input as PosterDraft, template.meta.kind) : input) as PosterExtract;
  const { site, s, fields, name, city, now } = startFromPoster(template, ctx, x, opts, "An institute");

  /* ── Who ── */
  if (clean(x.board)) {
    setBi(s, "boardOrAffiliation", clean(x.board));
    fields.push("boardOrAffiliation");
  }
  if (clean(x.tagline)) {
    setBi(s, "tagline", clean(x.tagline));
    fields.push("tagline");
  }
  const focus = [...new Set([...listOf(x.exams), ...listOf(x.focusAreas)])].slice(0, 3);
  if (focus.length) {
    setBiList(s, "focusAreas", focus);
    fields.push("focusAreas");
  }
  if (listOf(x.facilities).length) {
    setBiList(s, "facilities", listOf(x.facilities));
    fields.push("facilities");
  }

  /* ── Admissions ── */
  const adm = { ...(site.admissions || {}) } as WithHi;
  let admTouched = false;
  if (clean(x.classes)) {
    setBi(adm, "whoCanApply", clean(x.classes));
    fields.push("admissions.whoCanApply");
    admTouched = true;
  }
  if (clean(x.admissions?.dates)) {
    setBi(adm, "dates", clean(x.admissions?.dates));
    fields.push("admissions.dates");
    admTouched = true;
  }
  if (clean(x.admissions?.note)) {
    setBi(adm, "note", clean(x.admissions?.note));
    fields.push("admissions.note");
    admTouched = true;
  }
  if (x.admissions?.open === true) {
    const dates = clean(x.admissions?.dates);
    site.admissionsHeadline = dates ? `Admissions open: ${dates}` : "Admissions open";
    site.hi = { ...(site.hi || {}), admissionsHeadline: dates ? `प्रवेश खुले हैं: ${dates}` : "प्रवेश खुले हैं" };
    /* The template's closing date would hide a real "open" chip on its own day. */
    delete site.admissionsOpenUntil;
    fields.push("admissionsHeadline");
  }

  /* ── Courses: replace, keeping only generic structure ── */
  const posterCourses = (x.courses || []).filter((c) => Object.values(c).some((v) => (Array.isArray(v) ? v.length : clean(v as string))));
  if (posterCourses.length) {
    const mode = site.courses?.find((c) => c.mode)?.mode;
    site.courses = posterCourses.map((c) => {
      const subjects = listOf(c.subjects).join(", ");
      const course: DemoCourse = {
        /* A course needs a title; the poster's level or subjects are the
           poster's own words for it, never a name we made up. */
        name: clean(c.name) || clean(c.level) || subjects,
        level: clean(c.level),
        subjects,
        duration: clean(c.duration),
        timings: clean(c.timings),
        batchStarts: clean(c.batchStart),
        fee: posterFee(c.fee),
        feeNote: clean(c.feeNote),
        mode,
      };
      return itemHi(course as unknown as Obj, ["name", "level", "subjects", "duration", "timings", "batchStarts", "feeNote"]) as unknown as DemoCourse;
    });
    fields.push("courses");
    if (adm.fees || adm.feeNote) {
      delete adm.fees;
      dropBi(adm, "feeNote");
      admTouched = true;
    }
  }
  if (admTouched || site.admissions) site.admissions = adm as DemoSite["admissions"];

  /* ── Faculty: replace. No photos: a stock portrait beside a real teacher's
        name would be read as that teacher. ── */
  const posterFaculty = (x.faculty || []).filter((f) => clean(f.name) || clean(f.subject));
  if (posterFaculty.length) {
    site.faculty = posterFaculty.map((f) =>
      itemHi({
        name: clean(f.name),
        subject: clean(f.subject),
        qualification: clean(f.qualification),
        experience: clean(f.experience),
      } as Obj, ["subject", "qualification", "experience"]) as unknown as DemoFaculty,
    );
    fields.push("faculty");
  }

  /* ── Results: replace, and mark the block as the institute's own ── */
  const posterResults = (x.results || []).filter((r) => clean(r.rank) || clean(r.score) || clean(r.exam));
  let resultsReal = false;
  if (posterResults.length) {
    site.results = posterResults.map((r) =>
      itemHi({
        achievement: [clean(r.rank), clean(r.score)].filter(Boolean).join(", ") || clean(r.exam),
        exam: clean(r.rank) || clean(r.score) ? clean(r.exam) : "",
        year: clean(r.year),
        /* Printed only once Mehdi ticks consent on the result: the poster is
           the institute's claim, not the family's permission. */
        studentName: clean(r.student),
      } as Obj, ["achievement", "exam", "year"]) as unknown as DemoResult,
    );
    for (const k of ["resultsHeading", "resultsNote"]) dropBi(s, k);
    /* The switch below also unlabels these. They are the template's fiction,
       so they go rather than be presented as the institute's. */
    delete site.stats;
    delete site.boardResults;
    delete site.reviews;
    delete site.rating;
    resultsReal = true;
    fields.push("results");
  }

  /* ── Contact: the institute's own published details ── */
  const phones = overlayContact(site, x, name, city, fields);

  /* ── Offers: one pinned notice (never a clinic's, see clinicCard) ── */
  const offers = clinicCard ? [] : listOf(x.offers);
  if (offers.length) {
    const notice = itemHi({
      title: offers[0],
      body: offers.slice(1).join(". "),
      pinned: true,
      kind: "notice",
    } as Obj, ["title", "body"]);
    site.notices = [notice as unknown as NonNullable<DemoSite["notices"]>[number], ...(site.notices || []).map((n) => ({ ...n, pinned: false }))];
    fields.push("notices");
  }

  /* ── The sample marks, again ──
     Re-printed from the draft as it now stands, so a block that is still
     partly the template's (fees beside a real batch list, the timetable)
     stays on the checklist until Mehdi edits it. Blocks the poster REPLACED
     are not carried, so they get no print. */
  const prints = samplePrints(site);
  if (posterFaculty.length) delete prints.faculty;
  if (posterResults.length) delete prints.results;
  /* The switch below never covers the story (sample.ts, STORY). */
  storyPrint(site, prints, Boolean(clean(x.established)));
  site.sample = {
    from: template.meta.id,
    prints,
    ...(resultsReal ? { real: true } : {}),
  };

  for (const k of Object.keys(s)) if (s[k] === undefined) delete s[k];
  const provenance = provenanceOf(opts, fields, now, phones, x.notes);
  if (clinicCard && listOf(x.offers).length) {
    provenance.leftOut = listOf(x.offers).map((o) => `Offer "${o}": ${CLAIM_REASON.inducement}`);
  }
  return { site, provenance };
}

function provenanceOf(opts: FromPosterOptions, fields: string[], now: Date, phones: string[], notes?: string): PosterProvenance {
  const provenance: PosterProvenance = {
    source: "poster",
    provider: clean(opts.provider) || "manual",
    model: clean(opts.model),
    fields,
    at: now.toISOString(),
  };
  if (phones.length > 1) provenance.extraPhones = phones.slice(1);
  if (clean(notes)) provenance.notes = clean(notes);
  return provenance;
}

/**
 * Contact from the poster: the institute's (or clinic's) own published
 * details. Returns every phone number, the first being the one written.
 */
function overlayContact(
  site: DemoSite,
  x: { contact?: PosterContact; locality?: string },
  name: string,
  city: string,
  fields: string[],
): string[] {
  const phones = listOf(x.contact?.phones);
  const contact: DemoContactDetails = { ...(site.contact || {}) };
  if (phones[0]) {
    contact.phone = phones[0];
    fields.push("contact.phone");
  }
  const wa = posterWhatsapp(x.contact?.whatsapp);
  if (wa) {
    contact.whatsapp = wa;
    fields.push("contact.whatsapp");
  }
  if (clean(x.contact?.email)) {
    contact.email = clean(x.contact?.email);
    fields.push("contact.email");
  }
  const address = clean(x.contact?.address) || clean(x.locality);
  if (address) {
    const lines = address.split(/\s*\n\s*/).filter(Boolean);
    contact.addressLines = lines;
    if (lines.every(hasDevanagari)) contact.hi = { ...(contact.hi || {}), addressLines: lines };
    else if (contact.hi) delete contact.hi.addressLines;
    fields.push("contact.addressLines");
  }
  if (address || city) {
    contact.mapQuery = [name, clean(x.locality), city].filter(Boolean).join(", ");
  }
  site.contact = contact;
  const website = posterWebsite(x.contact?.website);
  if (website) {
    site.officialWebsite = website;
    fields.push("officialWebsite");
  }
  return phones;
}

/** The private note the slot carries, one line Mehdi reads in the editor. */
export function provenanceNote(p: PosterProvenance, providerName: string): string {
  const who = p.provider === "manual" ? "typed in by hand from a poster" : `read from a poster by ${providerName}${p.model ? ` (${p.model})` : ""}`;
  const extra = p.extraPhones?.length ? ` Other numbers on the poster: ${p.extraPhones.join(", ")}.` : "";
  const left = p.leftOut?.length ? ` Left off the demo under the Dental Council code: ${p.leftOut.join("; ")}.` : "";
  return `Made ${p.at.slice(0, 10)}, ${who}. Filled from the poster: ${p.fields.join(", ")}.${extra}${left}`;
}

/* ── A DENTAL CLINIC (28 Sep 2026) ───────────────────────────────────────── */

/**
 * Treatment families, so a poster's "RCT" finds the template's "Root canal
 * treatment" page. Most specific first: a wisdom tooth is an extraction too.
 */
const DENTAL_FAMILIES: [string, RegExp][] = [
  ["wisdom", /wisdom|अक़्ल|अक्ल/i],
  ["root-canal", /root\s*canal|\brct\b|endodont|रूट\s*कैनाल/i],
  ["implant", /implant|इम्प्लांट|इंप्लांट/i],
  ["ortho", /brace|aligner|orthodont|invisalign|ब्रेस|अलाइनर/i],
  ["kids", /\bkids?\b|child|paedi|pedi|pedo|बच्च/i],
  ["whitening", /whiten|bleach/i],
  ["veneer", /veneer|laminate/i],
  ["smile", /smile\s*(design|makeover)|cosmetic|aesthetic/i],
  ["denture", /denture|डेंचर|बत्तीसी/i],
  ["crown", /crown|bridge|\bcaps?\b|क्राउन/i],
  ["filling", /filling|restoration|cavit|फ़िलिंग|फिलिंग/i],
  ["cleaning", /clean|scaling|polish|prophyla|सफ़ाई|सफाई/i],
  ["gum", /\bgums?\b|perio|pyorr|मसूड़/i],
  ["extraction", /extraction|removal|निकाल/i],
  ["xray", /x-?ray|\bopg\b|\brvg\b|cbct|एक्स-?रे/i],
  ["checkup", /check|consult|exam|चेक|परामर्श|जाँच|जांच/i],
];

const familiesOf = (text: string) => DENTAL_FAMILIES.filter(([, re]) => re.test(text)).map(([f]) => f);
const treatmentFamilies = (t: DentalTreatment) => familiesOf(`${t.name} ${(t.slug || "").replace(/-/g, " ")}`);

/** The template's page for a poster's treatment line: the same first family, else one it shares. */
function matchTreatment(line: string, pool: DentalTreatment[], used: Set<DentalTreatment> = new Set()): DentalTreatment | undefined {
  const want = familiesOf(line)[0];
  if (!want) return undefined;
  const open = pool.filter((t) => !used.has(t));
  return open.find((t) => treatmentFamilies(t)[0] === want) || open.find((t) => treatmentFamilies(t).includes(want));
}

/** A page address for a treatment the template has no page for. Devanagari gets a numbered one. */
function newTreatmentSlug(name: string, i: number, taken: Set<string>): string {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, " ").trim()
    .replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60) || `treatment-${i + 1}`;
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

/** "a, b and c": the only English glue fromDentalPoster writes around the poster's words. */
const joinEn = (l: string[]) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`);

/**
 * A fee as a dental fee row wants it: the amount alone, digits and commas
 * ("₹2,500/- onwards" is "2,500"), or "" when the poster printed words.
 */
export function dentalFeeAmount(fee: string | undefined): string {
  let t = clean(fee).replace(/^(starting\s+(from|at)|starts\s+(from|at)|from)\s*:?\s*/i, "");
  t = posterFee(t);
  for (let prev = ""; prev !== t; ) {
    prev = t;
    t = t.replace(/\s*(\/-|only|onwards?|\+|\*|approx\.?)\s*$/i, "").trim();
  }
  return /^\d[\d,]*$/.test(t) ? t : "";
}

const feeNumber = (a: string | undefined) => Number((a || "").replace(/,/g, "")) || Infinity;

/** The dental overlay. See "A DENTAL CLINIC" in the header for the table. */
export function fromDentalPoster(
  template: LoadedTemplate,
  ctx: FromTemplateContext,
  x: DentalPosterExtract,
  opts: FromPosterOptions = {},
): { site: DemoSite; provenance: PosterProvenance } {
  const { site, s, fields, name, city, now } = startFromPoster(template, ctx, x, opts, "A clinic");
  const d: DentalContent = site.dental || (site.dental = {});
  const leftOut: string[] = [];
  /** False, and noted for Mehdi, when the Dental Council code keeps a line off the page. */
  const allowed = (line: string, where: string, issue: ClaimIssue | null = dentalClaimIssue(line)) => {
    if (!issue) return true;
    leftOut.push(`${where} "${line}": ${CLAIM_REASON[issue]}`);
    return false;
  };

  /* ── Tagline ── */
  const tagline = clean(x.tagline);
  const taglineOk = Boolean(tagline) && allowed(tagline, "Tagline");
  if (taglineOk) {
    setBi(s, "tagline", tagline);
    fields.push("tagline");
  }

  /* ── Treatments: the template's pages for them first, featured ── */
  const treatments = listOf(x.treatments).filter((t) => allowed(t, "Treatment"));
  if (treatments.length) {
    const pool = d.treatments || [];
    const used = new Set<DentalTreatment>();
    const taken = new Set(pool.map((t) => t.slug));
    const listed = treatments.map((line, i): DentalTreatment => {
      const hit = matchTreatment(line, pool, used);
      if (hit) {
        used.add(hit);
        return { ...hit, featured: true };
      }
      /* No page in the template: the name alone. Nothing is written about it. */
      return { slug: newTreatmentSlug(line, i, taken), name: line, summary: "", featured: true, ...(hasDevanagari(line) ? { hi: { name: line } } : {}) };
    });
    const rest = pool.filter((t) => !used.has(t)).map(({ featured: _f, ...t }) => t as DentalTreatment);
    d.treatments = [...listed, ...rest];
    fields.push("dental.treatments");
    const where = [clean(x.locality), city].filter(Boolean).join(", ");
    const lead = treatments.every(hasDevanagari)
      ? [treatments.join(", "), where].filter(Boolean).join(", ")
      : `${joinEn(treatments)}${where ? `, in ${where}` : ""}.`;
    d.hero = { ...(d.hero || {}) };
    setBi(d.hero as WithHi, "lead", lead);
    fields.push("dental.hero.lead");
    /* The template's tagline lists the template's treatments: the poster's go there instead. */
    if (!taglineOk) {
      setBi(s, "tagline", lead);
      fields.push("tagline");
    }
  }

  /* ── Doctors: replace, with no photos (a stock portrait is somebody else) ── */
  const doctors: DentalDoctor[] = [];
  for (const doc of x.doctors || []) {
    const docName = clean(doc.name);
    if (!docName || !allowed(docName, "Doctor")) continue;
    const keep = (v: string | undefined, what: string, test: (t: string) => ClaimIssue | null = dentalClaimIssue) => {
      const t = clean(v);
      return t && allowed(t, `${docName}, ${what}`, test(t)) ? t : "";
    };
    const row = itemHi({
      name: docName,
      qualification: keep(doc.degrees, "degrees"),
      specialisation: keep(doc.specialisation, "specialisation", specialisationIssue),
      regNo: keep(doc.registration, "registration"),
      experience: keep(doc.experience, "experience"),
      days: keep(doc.days, "days"),
    } as Obj, ["name", "qualification", "specialisation", "regNo", "experience", "days"]) as unknown as DentalDoctor;
    /* Required by the type; empty prints nothing. */
    row.qualification = row.qualification || "";
    doctors.push(row);
  }
  if (doctors.length) {
    d.doctors = doctors;
    fields.push("dental.doctors");
    /* The credential line named the template's lead dentist; without it the
       page builds one from the first real doctor. Branch rosters held the
       template's doctor pages. */
    if (d.hero) {
      d.hero = { ...d.hero };
      dropBi(d.hero as WithHi, "credential");
    }
    if (d.branches) d.branches = d.branches.map(({ doctors: _d, ...b }) => b);
  }

  /* ── Timings: the clinic's own hours. Every fictional hour of the template goes. ── */
  const timings = clean(x.timings).split(/\s*\n\s*/).filter(Boolean).join(", ");
  if (timings) {
    const contact = { ...(site.contact || {}) } as WithHi;
    setBi(contact, "hours", timings);
    site.contact = contact as DemoContactDetails;
    fields.push("contact.hours");
    d.hero = { ...(d.hero || {}) };
    dropBi(d.hero as WithHi, "nextSlot");
    if (timings.length <= 80) {
      setBi(d.hero as WithHi, "pill", timings);
      fields.push("dental.hero.pill");
    } else dropBi(d.hero as WithHi, "pill");
    delete d.sessions;
    if (d.booking) {
      d.booking = { ...d.booking };
      delete d.booking.closedDays;
      dropBi(d.booking as WithHi, "closedNote");
    }
    if (d.emergency) {
      d.emergency = { ...d.emergency };
      dropBi(d.emergency as WithHi, "hours");
    }
  }

  /* ── Fees: replace the table; no template price stays beside a real one ── */
  const fees = (x.fees || [])
    .filter((f) => clean(f.treatment) && clean(f.fee))
    .filter((f) => allowed([clean(f.treatment), clean(f.fee), clean(f.unit)].filter(Boolean).join(" "), "Fee"));
  if (fees.length) {
    const priced = new Set<DentalTreatment>();
    d.fees = fees.map((f) => {
      const treatment = clean(f.treatment);
      const amount = dentalFeeAmount(f.fee);
      const page = matchTreatment(treatment, d.treatments || []);
      if (page && amount && (!priced.has(page) || feeNumber(amount) < feeNumber(page.fromPrice))) {
        page.fromPrice = amount;
        priced.add(page);
      }
      return itemHi({
        treatment,
        slug: page?.slug,
        from: amount,
        unit: clean(f.unit),
        /* Words the poster printed instead of an amount stay as its note. */
        note: amount ? "" : clean(f.fee),
      } as Obj, ["treatment", "unit", "note"]) as unknown as DentalFeeRow;
    });
    for (const t of d.treatments || []) if (!priced.has(t)) delete t.fromPrice;
    delete d.plans;
    if (d.payment) {
      d.payment = { ...d.payment };
      dropBi(d.payment as WithHi, "consultFee");
    }
    fields.push("dental.fees");
  }

  /* ── Contact: the clinic's own published details ── */
  const phones = overlayContact(site, x, name, city, fields);

  /* ── Offers: read, never printed (DCI 8.1.3) ── */
  for (const o of listOf(x.offers)) allowed(o, "Offer", "inducement");

  /* ── The sample marks, again. Doctors from the poster are real; the trust
        figures, reviews, rating, cases and the history stay the template's,
        labelled (the history even beside the card's own year). ── */
  const prints = samplePrints(site);
  if (doctors.length) delete prints.doctors;
  storyPrint(site, prints, Boolean(clean(x.established)));
  site.sample = { from: template.meta.id, prints };

  for (const k of Object.keys(s)) if (s[k] === undefined) delete s[k];
  const provenance = provenanceOf(opts, fields, now, phones, x.notes);
  if (leftOut.length) provenance.leftOut = leftOut;
  return { site, provenance };
}
