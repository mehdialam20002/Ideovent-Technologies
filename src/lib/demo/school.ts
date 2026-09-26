/**
 * The small decisions the school demo makes over and over.
 *
 * Nothing here renders. Everything here exists because the same question comes
 * up in six sections and the answer must not drift between them: what to print
 * when a field is empty, how to write a place, which contact route to offer
 * first, and how to turn a fee into money without inventing a currency.
 *
 * THE ONE RULE THIS FILE ENFORCES
 * -------------------------------
 * An empty field NEVER becomes a plausible value. It becomes a line addressed
 * to the school, in their own site's voice, that could not be mistaken for
 * content: "Your admission helpline goes here." A parent who reads it knows
 * it is unfinished. A director who reads it knows exactly what to send back.
 *
 * The alternative, which is what most demo builders do, is to fill the gaps
 * with something that looks right. A phone number that looks right belongs to
 * a real stranger, who then takes the calls. An affiliation number that looks
 * right is checkable in a public register, found false, and reasonably read as
 * fraud. This is not caution, it is the difference between a demo and a
 * liability.
 */

import type { DemoSite, DemoCourse, DemoNotice, DemoResult } from "@/lib/cms/types";
import type { DemoSchoolSectionId } from "./schoolThemes";

/* ── Place and naming ────────────────────────────────────────────────────── */

/**
 * "New Delhi" · "Gorakhpur, Uttar Pradesh" · "Sharjah, United Arab Emirates".
 *
 * A state the city already contains is dropped, so a record carrying both
 * "New Delhi" and "Delhi" does not print "New Delhi, Delhi" in the masthead of
 * somebody's own school website.
 */
export function schoolPlace(site: Pick<DemoSite, "city" | "state" | "country">): string {
  const city = (site.city || "").trim();
  const state = (site.state || "").trim();
  const country = (site.country || "").trim();
  const parts: string[] = [];
  if (city) parts.push(city);
  if (
    state &&
    !(city && (city.toLowerCase().includes(state.toLowerCase()) || state.toLowerCase().includes(city.toLowerCase())))
  ) {
    parts.push(state);
  }
  if (country && !parts.some((p) => p.toLowerCase() === country.toLowerCase())) parts.push(country);
  return parts.join(", ");
}

/** The name for the masthead, where the full legal name will not fit. */
export function schoolShortName(site: Pick<DemoSite, "instituteName" | "shortName">): string {
  return (site.shortName || "").trim() || (site.instituteName || "").trim();
}

/**
 * Initials for an avatar, at most two letters.
 *
 * Used for faculty and for the head, because the demo prints NO photograph of
 * a person unless a real file was supplied AND consent was recorded. An
 * initials disc is the honest stand-in and it is what the Ideovent site itself
 * uses for its own team, for the same reason.
 */
export function initials(name: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const first = words[0][0] || "";
  const last = words.length > 1 ? words[words.length - 1][0] || "" : "";
  return (first + last).toUpperCase();
}

/* ── Money ───────────────────────────────────────────────────────────────── */

const CURRENCY_SYMBOL: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  AED: "AED ",
  AUD: "A$",
};

/**
 * A fee, exactly as the institute publishes it, with a symbol in front.
 *
 * TWO THINGS IT REFUSES TO DO. It never parses the number, so "45,000" and
 * "45,000 to 62,000" both survive unharmed, including the Indian digit
 * grouping that `toLocaleString` would rewrite on an en-US browser. And
 * anything that does not start with a digit is printed verbatim, so "On
 * request", "Fees on enquiry" and "Waived for siblings" do not come out as
 * "₹On request".
 */
export function formatFee(fee: string | undefined, currency: string | undefined): string {
  const raw = (fee || "").trim();
  if (!raw) return "";
  if (!/^\d/.test(raw)) return raw;
  const symbol = CURRENCY_SYMBOL[(currency || "INR").toUpperCase()] ?? "";
  return `${symbol}${raw}`;
}

/**
 * Which fact a row is, independent of what it is called.
 *
 * The KEY is what the template looks a label up by, because the label itself
 * changes with the reader's language and with the market: "Fee" is "Fees" in
 * India and "Tuition" in an American school, and none of those three is what a
 * Hindi reader is scanning for. Keeping the key separate is what lets one
 * table in ./copy/school.ts own every version of the word.
 */
export type CourseFactKey =
  | "level" | "subjects" | "duration" | "timings" | "mode" | "starts" | "seats" | "fee";

/** Everything worth printing under a course name, in reading order, gaps removed. */
export function courseFacts(
  course: DemoCourse,
  currency: string | undefined,
): { key: CourseFactKey; label: string; value: string }[] {
  const out: { key: CourseFactKey; label: string; value: string }[] = [];
  const push = (key: CourseFactKey, label: string, value: string | undefined) => {
    const v = (value || "").trim();
    if (v) out.push({ key, label, value: v });
  };
  push("level", "For", course.level);
  push("subjects", "Subjects", course.subjects);
  push("duration", "Length", course.duration);
  push("timings", "Timings", course.timings);
  push("mode", "Mode", course.mode);
  push("starts", "Starts", course.batchStarts);
  push("seats", "Class size", course.seats);
  const fee = formatFee(course.fee, currency);
  if (fee) {
    out.push({
      key: "fee",
      label: "Fee",
      value: course.feeNote ? `${fee} (${course.feeNote})` : fee,
    });
  }
  return out;
}

/* ── Contact ─────────────────────────────────────────────────────────────── */

/** A tel: href from a number written any way a school writes it. */
export function telHref(phone: string | undefined): string | null {
  const digits = (phone || "").replace(/[^\d+]/g, "");
  return digits.length >= 6 ? `tel:${digits}` : null;
}

/** A wa.me href. The record stores digits including the country code. */
export function waHref(whatsapp: string | undefined, text?: string): string | null {
  const digits = (whatsapp || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function mailHref(email: string | undefined, subject?: string): string | null {
  const e = (email || "").trim();
  if (!e.includes("@")) return null;
  return `mailto:${e}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

/**
 * The single enquiry action the visit band and the contact section both use.
 *
 * ONE action, not three. A parent in an admission queue on a phone does not
 * choose between a phone number, a WhatsApp link and an email address; they
 * bounce. Phone first because that is what an Indian parent actually does,
 * WhatsApp second, email last, and when the school has given us none of them
 * the button becomes an anchor to the visit band, which at least says what
 * happens next rather than being a dead control.
 */
export function enquiryAction(site: DemoSite): { label: string; href: string; kind: "tel" | "wa" | "mail" | "anchor" } {
  const c = site.contact || {};
  const tel = telHref(c.phone);
  if (tel) return { label: "Call the admissions office", href: tel, kind: "tel" };
  const wa = waHref(c.whatsapp, `Hello ${site.instituteName}. I would like to ask about admission.`);
  if (wa) return { label: "Ask about admission on WhatsApp", href: wa, kind: "wa" };
  const mail = mailHref(c.email, `Admission enquiry, ${site.instituteName}`);
  if (mail) return { label: "Email the admissions office", href: mail, kind: "mail" };
  /* #visit AND NOT #admissions. The "how to apply" section is dropped when
     it is empty, and on a record that has no contact details it always is, so
     the old fallback pointed the page's one call to action at an id that did
     not exist. "Come and see us" is one of the four sections that always
     render, so this anchor cannot go dead. */
  return { label: "How to apply", href: "#visit", kind: "anchor" };
}

/**
 * THE ONE BUTTON IN THE HERO AND THE HEADER, which is never the phone.
 *
 * The brief puts ONE filled button in the hero with the phone number beside
 * it as a text link (Mathnasium sets the number as a pill in the header next
 * to its one action). A button that dials the same number as the link beside
 * it is two controls for one intent, so the button takes the next route the
 * school actually published: WhatsApp, then email, then an anchor. The anchor
 * goes to "how to apply" when that section has content and to the visit band
 * otherwise, which always renders, so it can never go dead.
 */
export function heroAction(
  site: DemoSite,
  hasApplySection: boolean,
): { href: string; kind: "wa" | "mail" | "apply" | "visit"; external: boolean } {
  const c = site.contact || {};
  const wa = waHref(c.whatsapp, `Hello ${site.instituteName}. I would like to ask about admission.`);
  if (wa) return { href: wa, kind: "wa", external: true };
  const mail = mailHref(c.email, `Admission enquiry, ${site.instituteName}`);
  if (mail) return { href: mail, kind: "mail", external: false };
  return hasApplySection
    ? { href: "#admissions", kind: "apply", external: false }
    : { href: "#visit", kind: "visit", external: false };
}

/** A trimmed string, or "" for anything that is not one. */
export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Whether a person's photograph may be printed. A file AND recorded consent,
 * or nothing: a teacher's face on a website they have not agreed to is the
 * most damaging thing this page could carry, and the quietest to get wrong.
 */
export function mayShowPhoto(person: { photo?: string; photoConsent?: boolean } | undefined): boolean {
  return Boolean(person && text(person.photo) && person.photoConsent === true);
}

/** True when the school has given us at least one way to be reached. */
export function hasAnyContact(site: DemoSite): boolean {
  const c = site.contact || {};
  return Boolean(
    (c.phone || "").trim() ||
      (c.whatsapp || "").trim() ||
      (c.email || "").trim() ||
      (c.addressLines || []).some((l) => (l || "").trim()) ||
      (c.mapUrl || "").trim(),
  );
}

/* ── Notices ─────────────────────────────────────────────────────────────── */

/** Pinned first, otherwise the order the school put them in. Never re-sorted by date. */
export function orderedNotices(notices: DemoNotice[] | undefined): DemoNotice[] {
  const list = (notices || []).filter((n) => (n?.title || "").trim());
  return [...list.filter((n) => n.pinned), ...list.filter((n) => !n.pinned)];
}

/* ── Section labels ──────────────────────────────────────────────────────── */

/**
 * What each section is called in the nav and in its own heading.
 *
 * A school's own words, not a CMS field name. "Academics" and not "Courses",
 * because no Indian school has ever put "Courses" in its navigation bar.
 */
export const SECTION_LABEL: Record<DemoSchoolSectionId, string> = {
  about: "About us",
  admissions: "Admissions",
  academics: "Academics",
  results: "Results",
  faculty: "Faculty",
  facilities: "Facilities",
  gallery: "Gallery",
  principal: "Principal",
  notices: "Notices",
  visit: "Visit",
  contact: "Contact",
};

/** The short form, for the navigation strip on a 375px phone. */
export const SECTION_NAV_LABEL: Record<DemoSchoolSectionId, string> = {
  about: "About",
  admissions: "Apply",
  academics: "Academics",
  results: "Results",
  faculty: "Teachers",
  facilities: "Campus life",
  gallery: "The school",
  principal: "Principal",
  notices: "Notices",
  visit: "Visit",
  contact: "Contact",
};

/**
 * THE FIVE NAV ITEMS, IN THE ORDER A PARENT CONVERTS.
 *
 * Brighton College's entire top navigation is four items and every one of them
 * is a verb or an audience: Parents, Enquire, Apply, Visit. An Indian school
 * site runs eight to twelve and opens with Parent Login, which is right for a
 * school that has parents and wrong for a demo whose only reader is deciding
 * whether to have one.
 *
 * So the header takes at most five, drawn from this list in this order and
 * filtered to the ones that actually render. The rest of the sections are
 * still reachable: the phone disclosure lists every one of them.
 */
export const NAV_PRIORITY: DemoSchoolSectionId[] = [
  "admissions",
  "academics",
  "results",
  "visit",
  "contact",
  "about",
  "notices",
  "faculty",
  "facilities",
  "gallery",
  "principal",
];

/**
 * Does this section have anything real in it?
 *
 * The section renders EITHER WAY. This only decides whether the body is the
 * school's content or the designed placeholder, and it drives one other thing:
 * the nav strip on a phone puts the sections that have content first, so a
 * parent on a small screen does not have to scroll a row of empty labels to
 * find the one that answers their question.
 */
export function sectionHasContent(site: DemoSite, id: DemoSchoolSectionId): boolean {
  const filled = (s: string | undefined) => Boolean((s || "").trim());
  switch (id) {
    case "about":
      return filled(site.about) || filled(site.established) || filled(site.establishedYear) || filled(site.boardOrAffiliation);
    case "admissions": {
      const a = site.admissions || {};
      return (
        (a.steps || []).some(filled) ||
        (a.documents || []).some(filled) ||
        filled(a.dates) ||
        filled(a.note)
      );
    }
    case "academics":
      return (site.courses || []).some((c) => filled(c?.name));
    case "results":
      return (site.results || []).some((r) => filled(r?.achievement));
    case "visit":
      /* ALWAYS TRUE. "Come and see us" is one of the four sections that render
         whatever the record holds, because a page that cannot be visited and
         cannot be asked anything is not a school website. With nothing in the
         record it renders the single blank line at the reduced height. */
      return true;
    case "faculty":
      return (site.faculty || []).some((f) => filled(f?.name));
    case "facilities":
      return (site.facilities || []).some(filled);
    case "gallery":
      /* A CAPTION COUNTS, WITH OR WITHOUT A FILE. An entry carrying `alt` and
         no `src` is a named view of the campus we do not yet hold a photograph
         of, and six of those set as type are what this section is made of when
         there are no images at all. See the gallery block in the seed. */
      return (site.gallery || []).some((g) => filled(g?.src) || filled(g?.alt));
    case "principal":
      return filled(site.principalName) || filled(site.principalMessage);
    case "notices":
      return orderedNotices(site.notices).length > 0;
    case "contact":
      return hasAnyContact(site);
    default:
      return false;
  }
}

/**
 * THE FOUR SECTIONS THAT RENDER WHATEVER THE RECORD HOLDS.
 *
 * A section whose entire content is blank does not render and is dropped from
 * the nav; its invitation moves into the closing "what we still need from you"
 * list instead of leaving a hole. The exceptions are the hero (not in this
 * list, it is not a section id), the visit band, and contact, because a
 * school page that cannot be visited and cannot be asked anything is not a
 * school page. Those render the single blank sentence at the reduced height.
 */
export const ALWAYS_RENDERED: DemoSchoolSectionId[] = ["visit", "contact"];

/**
 * The sections that actually appear on the page, in the theme's order.
 *
 * This is the list the nav, the spacing ladder and the single hairline rule
 * are all computed from, so that none of them can disagree with what a reader
 * scrolls past. A nav is a promise, and a label that leads to nothing breaks
 * it; a spacing step decided against a section that did not render puts two
 * identical gaps next to each other.
 */
export function renderedSections(site: DemoSite, order: DemoSchoolSectionId[]): DemoSchoolSectionId[] {
  return order.filter((id) => ALWAYS_RENDERED.includes(id) || sectionHasContent(site, id));
}

/**
 * The sections, in this theme's order, with the ones that have content first
 * in the NAV only. Kept for the admin's section summary; the page itself uses
 * `renderedSections`.
 */
export function navSections(site: DemoSite, order: DemoSchoolSectionId[]): DemoSchoolSectionId[] {
  const withContent = order.filter((id) => sectionHasContent(site, id));
  const without = order.filter((id) => !sectionHasContent(site, id));
  return [...withContent, ...without];
}

/* ── Dates ───────────────────────────────────────────────────────────────── */

/**
 * "24 September 2026" from an ISO date, or "" from anything else.
 *
 * Used for `preparedOn` in the demo marker and nowhere else. Every date the
 * SCHOOL supplies is free text and is printed exactly as they wrote it: a
 * school that publishes "Forms open 5 Jan to 20 Feb" means that, and a demo
 * that silently rewrites it to "05/01" has changed their notice.
 */
export function demoDate(iso: string | undefined, market: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(market === "international" ? "en-GB" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── The four content conventions the rebuilt template reads ─────────────────

   None of these is a new FIELD. They are four ways of reading a field the
   record already has, chosen so that a school typing an ordinary sentence into
   the admin gets a designed result without being taught a syntax.

   Documented here rather than in the template because a convention that lives
   in one component is a convention the next component will get wrong.
   ──────────────────────────────────────────────────────────────────────── */

/**
 * "Library: 11,000 titles, open until 5:00 pm" becomes a heading and a line.
 *
 * Splits on the FIRST ": " or ". ", whichever comes first, so the three shapes
 * a person actually types all work:
 *
 *   "Library: 11,000 titles"        lead "Library",  rest "11,000 titles"
 *   "Library. 11,000 titles."       lead "Library",  rest "11,000 titles."
 *   "Library"                       lead "Library",  rest ""
 *
 * A one-word entry is therefore still a complete, correctly set tile, which is
 * the state a real record starts in. Nothing is invented and nothing is
 * reformatted: the rest is printed exactly as it was typed.
 */
export function splitLead(text: string): { lead: string; rest: string } {
  const s = (text || "").trim();
  if (!s) return { lead: "", rest: "" };
  const colon = s.indexOf(": ");
  const stop = s.indexOf(". ");
  const at = colon >= 0 && (stop < 0 || colon < stop) ? colon : stop;
  if (at < 0) return { lead: s.replace(/\.$/, ""), rest: "" };
  return { lead: s.slice(0, at).trim(), rest: s.slice(at + 2).trim() };
}

/**
 * One phrase of a line, marked for the serif italic accent.
 *
 * The convention is a pair of asterisks, and it is OPTIONAL in both
 * directions: a tagline with no asterisks returns one plain part, which is the
 * normal case and the case every real record starts in. Only the FIRST pair is
 * honoured, because the accent is allowed once per line; a second pair is left
 * as literal text rather than silently becoming a second accent.
 *
 * Why a convention at all: the accent has to fall on a phrase somebody chose.
 * Auto-accenting "the last two words" produces a page that italicises "in
 * Delhi" and looks like a rendering fault, and a new record field would be a
 * change to the data model, which this rebuild is not allowed to make.
 */
export function accentParts(text: string): { text: string; accent: boolean }[] {
  const s = text || "";
  const m = /\*([^*]+)\*/.exec(s);
  if (!m) return [{ text: s, accent: false }];
  const out: { text: string; accent: boolean }[] = [];
  if (m.index > 0) out.push({ text: s.slice(0, m.index), accent: false });
  out.push({ text: m[1], accent: true });
  const tail = s.slice(m.index + m[0].length);
  if (tail) out.push({ text: tail, accent: false });
  return out;
}

/**
 * "Ages 3 to 17", read off the first and last stage the school teaches.
 *
 * `DemoCourse.level` is free text and always will be, so this looks for digits
 * and gives up quietly rather than guessing: a school that writes "Class VI to
 * VIII" with no ages gets no age line, which is correct, instead of "Ages 6 to
 * 8" invented out of Roman numerals.
 */
export function ageSpan(courses: DemoCourse[] | undefined): string {
  const levels = (courses || []).map((c) => (c?.level || "").trim()).filter(Boolean);
  if (!levels.length) return "";
  const firstNums = levels[0].match(/\d+/g);
  const lastNums = levels[levels.length - 1].match(/\d+/g);
  if (!firstNums || !lastNums) return "";
  const from = Number(firstNums[0]);
  const to = Number(lastNums[lastNums.length - 1]);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return "";
  return `Ages ${from} to ${to}`;
}

/**
 * The first and last age the school teaches, as numbers, or null.
 *
 * The same reading as `ageSpan`, returned unformatted so the copy table can
 * put the word "Ages" in the reader's language rather than this file fixing
 * it in English.
 */
export function ageBounds(courses: DemoCourse[] | undefined): { from: number; to: number } | null {
  const levels = (courses || []).map((c) => (c?.level || "").trim()).filter(Boolean);
  if (!levels.length) return null;
  const firstNums = levels[0].match(/\d+/g);
  const lastNums = levels[levels.length - 1].match(/\d+/g);
  if (!firstNums || !lastNums) return null;
  const from = Number(firstNums[0]);
  const to = Number(lastNums[lastNums.length - 1]);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  return { from, to };
}

/**
 * The board alone, for an eyebrow: "CBSE senior secondary" out of "CBSE
 * senior secondary, example affiliation no. 00000000".
 *
 * The full line, with the affiliation number, is printed in the fact panel
 * where there is room for it. The eyebrow takes what comes before the first
 * comma, semicolon or full stop, and gives up if that is still longer than an
 * eyebrow can carry, in which case the eyebrow shows the place instead.
 */
export function boardLead(board: string | undefined): string {
  const s = (board || "").trim();
  if (!s) return "";
  const lead = s.split(/[,;.]/)[0].trim();
  return lead.length <= 42 ? lead : "";
}

/**
 * "Pre-primary to senior secondary", from the first and last stage name.
 *
 * The last name is lowered to run on inside the sentence, UNLESS it opens
 * with an acronym or a lone capital: "UKG", "ISC", "IB Diploma Programme"
 * and "A levels" are printed as typed, not as "uKG" and "iB Diploma".
 */
export function stageSpan(courses: DemoCourse[] | undefined): string {
  const names = (courses || []).map((c) => (c?.name || "").trim()).filter(Boolean);
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  const last = names[names.length - 1];
  const asTyped = /^\p{Lu}(\p{Lu}|[\s\d-])/u.test(last);
  return `${names[0]} to ${asTyped ? last : last.charAt(0).toLowerCase() + last.slice(1)}`;
}

/**
 * A published result split into the figure and the words around it.
 *
 * Brighton College's "Record Results" is three lines of the shape "98% A*-B at
 * A-level": one figure, its unit, nothing else. So the figure is set large and
 * everything else is set at 13px underneath, and the split is done on the
 * FIRST token that contains a digit.
 *
 * A line with no digit at all, of the shape "A grades the most common grade",
 * returns an empty figure and the whole line as the label, and the template
 * sets it as a line
 * rather than as a number. That is the honest fallback: a result is whatever
 * the institute publishes, and not every one of them is a number.
 */
export function metricParts(result: DemoResult): { figure: string; label: string } {
  const raw = (result.achievement || "").trim();
  const words = raw.split(/\s+/);
  const lead = words[0] || "";
  const hasFigure = /\d/.test(lead) && lead.length <= 12;
  const tail = [
    hasFigure ? words.slice(1).join(" ") : raw,
    [result.exam, result.year].map((s) => (s || "").trim()).filter(Boolean).join(" "),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(". ");
  return { figure: hasFigure ? lead : "", label: tail };
}

/**
 * The dated rows of the "come and see us" band.
 *
 * `admissions.dates` is free text and is printed exactly as it was typed. One
 * line per newline, and each line split by `splitLead`, so a school that
 * writes one sentence gets one row and a school that lists three open mornings
 * gets three. Never parsed into a Date: schools write "From Monday" and
 * "Immediate effect", and "Invalid Date" on a page carrying their name is
 * worse than no parser.
 */
export function visitRows(site: DemoSite): { lead: string; rest: string }[] {
  return ((site.admissions?.dates || "") as string)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(splitLead);
}
