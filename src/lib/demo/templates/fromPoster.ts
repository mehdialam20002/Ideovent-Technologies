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
 *   established        established; establishedYear when it holds a year
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
 *   offers             one pinned notice at the top of the notices
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
 * Pure, like fromTemplate: no store, no clock unless the context passes none.
 */

import type { DemoCourse, DemoFaculty, DemoResult, DemoSite } from "@/lib/cms/types";
import { hasDevanagari, type PosterExtract } from "@/lib/ai/posterSchema";
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
export function posterName(x: PosterExtract, opts: FromPosterOptions = {}): { name: string; hiName: string } {
  const name = clean(opts.name) || clean(x.instituteName) || clean(x.instituteNameHi);
  const hiName =
    clean(opts.hiName) || clean(x.instituteNameHi) || (hasDevanagari(name) ? name : "");
  return { name, hiName: hiName === name && !hasDevanagari(name) ? "" : hiName };
}

/* ── The function ────────────────────────────────────────────────────────── */

export function fromPoster(
  template: LoadedTemplate,
  ctx: FromTemplateContext,
  x: PosterExtract,
  opts: FromPosterOptions = {},
): { site: DemoSite; provenance: PosterProvenance } {
  const { name, hiName } = posterName(x, opts);
  if (!name) throw new Error("An institute name is required. Type it in, as the poster spells it.");
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
  const now = ctx.now || new Date();

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

  /* ── Who ── */
  if (clean(x.board)) {
    setBi(s, "boardOrAffiliation", clean(x.board));
    fields.push("boardOrAffiliation");
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
  const phones = listOf(x.contact?.phones);
  const contact = { ...(site.contact || {}) };
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

  /* ── Offers: one pinned notice ── */
  const offers = listOf(x.offers);
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
  site.sample = {
    from: template.meta.id,
    prints,
    ...(resultsReal ? { real: true } : {}),
  };

  for (const k of Object.keys(s)) if (s[k] === undefined) delete s[k];

  const provenance: PosterProvenance = {
    source: "poster",
    provider: clean(opts.provider) || "manual",
    model: clean(opts.model),
    fields,
    at: now.toISOString(),
  };
  if (phones.length > 1) provenance.extraPhones = phones.slice(1);
  if (clean(x.notes)) provenance.notes = clean(x.notes);
  return { site, provenance };
}

/** The private note the slot carries, one line Mehdi reads in the editor. */
export function provenanceNote(p: PosterProvenance, providerName: string): string {
  const who = p.provider === "manual" ? "typed in by hand from a poster" : `read from a poster by ${providerName}${p.model ? ` (${p.model})` : ""}`;
  const extra = p.extraPhones?.length ? ` Other numbers on the poster: ${p.extraPhones.join(", ")}.` : "";
  return `Made ${p.at.slice(0, 10)}, ${who}. Filled from the poster: ${p.fields.join(", ")}.${extra}`;
}
