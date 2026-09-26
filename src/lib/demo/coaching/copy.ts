/**
 * The coaching template's own copy and its own small formatters.
 *
 * ── WHY THIS FILE IS SELF-CONTAINED ───────────────────────────────────────
 * The shared demo layer (`src/lib/demo/record.ts`, `international.ts`) is
 * owned by another hand and is still moving. The coaching page needs about
 * fifteen tiny, boring functions, "is this field empty", "put a rupee sign in
 * front of this", "make a tel: link out of what somebody typed", and taking
 * those from a moving module means the page breaks for reasons that have
 * nothing to do with the page. So they live here, they are ten lines each, and
 * the only shared module this file imports is `../vocabulary`, which is a pure
 * lookup table with no state and no I/O.
 *
 * If the shared layer settles, these are the right functions to delete in
 * favour of it. Until then a duplicated four-line `blank()` is cheaper than a
 * broken demo.
 *
 * ── THE ONE RULE THAT MATTERS ─────────────────────────────────────────────
 * NOTHING IN THIS FILE INVENTS A FACT ABOUT A REAL INSTITUTE.
 *
 * Every function that meets an empty field returns a PLACEHOLDER that reads as
 * a placeholder to the director looking at it, never a plausible-looking
 * value. There is no default phone number, no sample rank, no representative
 * fee, no stock principal, no "trusted by 2,000 students". A made-up helpline
 * belongs to a real stranger who then gets the calls; a made-up rank is a
 * claim a parent can act on and the institute can be held to.
 *
 * The placeholders are also the sales mechanism, which is why they are written
 * with care rather than as "TODO". A director who opens the page and sees a
 * neat, reserved slot with their own name above it and "Add your 2026 results
 * here" inside it replies to fill it in. That reply is the entire purpose of
 * sending the link.
 */

import type { DemoSite, DemoCourse, DemoCurrency, DemoContactDetails } from "@/lib/cms/types";
import { demoVocabulary, lower, type DemoVocabulary } from "../vocabulary";

/* ── Emptiness ───────────────────────────────────────────────────────────── */

/**
 * True when a value carries nothing a reader would see.
 *
 * A list of empty strings is empty. An object whose every property is blank is
 * empty. Both of those come straight out of the admin: an array field that has
 * been opened and not filled in leaves a row of empty strings behind, and a
 * page that renders a heading with nothing under it because of one is a page
 * that looks broken on the director's phone.
 */
export function blank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return value === false;
  if (Array.isArray(value)) return value.every(blank);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(blank);
  return false;
}

/** The entries of a list that actually carry something. */
export function kept<T>(list: T[] | undefined): T[] {
  return (list || []).filter((item) => !blank(item));
}

/** A trimmed string, or "", so a call site never prints "undefined". */
export function text(value: string | undefined): string {
  return (value || "").trim();
}

/* ── Consent ─────────────────────────────────────────────────────────────── */

/**
 * Whether a person's photograph may be rendered.
 *
 * `photoConsent` is not a display preference. It is the record of somebody
 * having been ASKED, and a student's face on a website they did not agree to
 * is the most damaging thing this page could carry. A missing tick is treated
 * as "no", never as "probably fine", and the admin help text says so on the
 * field.
 */
export function mayShowPhoto(p: { photo?: string; photoConsent?: boolean }): boolean {
  return Boolean(text(p.photo) && p.photoConsent);
}

/* ── Money ───────────────────────────────────────────────────────────────── */

const CURRENCY_SYMBOL: Record<DemoCurrency, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  AED: "AED ",
  AUD: "A$",
};

/**
 * A fee with its symbol, or null.
 *
 * THE SYMBOL IS NEVER STORED ON THE ROW, so a fee table cannot end up half in
 * rupees and half in dollars because two rows were typed on different days.
 *
 * A value that does not begin with a digit is printed VERBATIM. "On request",
 * "Included", "First month free" are all real answers an institute gives, and
 * "₹On request" is exactly the kind of detail that tells a director the page
 * was generated.
 *
 * Null rather than "" for an empty fee, so the call site has to decide what an
 * unpriced course looks like rather than printing a currency symbol with
 * nothing after it.
 */
export function coachingFee(amount: string | undefined, currency: DemoCurrency | undefined, market: string): string | null {
  const raw = text(amount);
  if (!raw) return null;
  if (!/^[0-9]/.test(raw)) return raw;
  const c = currency || (market === "international" ? "USD" : "INR");
  return `${CURRENCY_SYMBOL[c] || ""}${raw}`;
}

/* ── Links, made safe ────────────────────────────────────────────────────── */

/**
 * A tel: href from a printed number, or null.
 *
 * Everything that is not a digit or a leading plus is dropped, so
 * "+91 98765 43210" and "(0551) 220 1234" both dial. NULL for an empty field,
 * and every call site has to handle it: a demo with no number prints "Your
 * admission helpline goes here", never a dead button and never a
 * plausible-looking number.
 */
export function telHref(phone: string | undefined): string | null {
  const raw = text(phone);
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return digits.replace(/\D/g, "").length >= 5 ? `tel:${digits}` : null;
}

/** A mailto: href, or null for an empty or obviously incomplete address. */
export function mailHref(email: string | undefined): string | null {
  const raw = text(email);
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null;
  return `mailto:${raw}`;
}

/**
 * A wa.me href for the INSTITUTE's own WhatsApp number, or null.
 *
 * The message is prefilled from the student's side, because the point of
 * WhatsApp over a form is that a person on a phone does not have to type
 * anything to start.
 */
export function instituteWhatsappHref(digits: string | undefined, message?: string): string | null {
  const clean = text(digits).replace(/\D/g, "");
  if (clean.length < 8) return null;
  return message ? `https://wa.me/${clean}?text=${encodeURIComponent(message)}` : `https://wa.me/${clean}`;
}

/**
 * An absolute http(s) URL, or null.
 *
 * A bare "highqclasses.com" typed into the admin becomes https://, and
 * anything that is not http(s) is refused outright. A `javascript:` URL in a
 * world-readable CMS field is the one way this page could actually hurt
 * somebody who opens it.
 */
export function externalUrl(url: string | undefined): string | null {
  const raw = text(url);
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** The address a link points at, without the scheme or a trailing slash. */
export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/**
 * A "find us on a map" link, or null.
 *
 * Prefers the institute's own map URL. Falls back to a SEARCH for a name and a
 * place, never to a coordinate: a guessed lat/long puts an institute on a
 * stranger's roof, while a search hands the reader the map's own answer and is
 * honest that we are not claiming to know the exact door.
 */
export function mapHref(contact: DemoContactDetails | undefined, fallbackQuery: string): string | null {
  const direct = externalUrl(contact?.mapUrl);
  if (direct) return direct;
  const query = text(contact?.mapQuery) || fallbackQuery;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/* ── Names and places ────────────────────────────────────────────────────── */

/** "Ravi Kumar Sharma" → "RS". Anything bracketed or after a comma is a qualifier. */
export function initials(name: string): string {
  const clean = (name || "").replace(/\(.*?\)/g, "").split(",")[0];
  const words = clean.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "·";
}

/**
 * The shortest place that still says where they are.
 *
 * "New Delhi, Delhi, India" is nobody's way of saying New Delhi. The state is
 * dropped when the city already carries it, and the country is dropped on an
 * India record because both ends of that conversation are in India. A country
 * doing real work, "Dubai, United Arab Emirates", is kept.
 */
export function shortPlace(site: Pick<DemoSite, "city" | "state" | "country" | "market">): string {
  const city = text(site.city);
  const state = text(site.state);
  const country = text(site.country);
  const parts: string[] = [];
  if (city) parts.push(city);
  if (state) {
    const c = city.toLowerCase();
    const s = state.toLowerCase();
    if (!city || !(c.includes(s) || s.includes(c))) parts.push(state);
  }
  const india = site.market !== "international" || country.toLowerCase() === "india";
  if (country && !india) parts.push(country);
  return parts.join(", ");
}

/** The institute's own short name for a masthead, or its full name. */
export function mastheadName(site: Pick<DemoSite, "shortName" | "instituteName">): string {
  return text(site.shortName) || text(site.instituteName);
}

/* ── The placeholders ────────────────────────────────────────────────────── */

/**
 * Every placeholder the coaching page can print, in one object.
 *
 * ONE PLACE, for the same reason the vocabulary is one table: a page that says
 * "Add your batches here" in one section and "Batch details go here" two
 * screens down reads as assembled, and that is the impression the whole
 * feature exists to avoid. They are written in the second person, addressed to
 * the director, because that is who is reading them.
 *
 * They are market-aware through the vocabulary, so an American tutoring centre
 * is told to add its sessions and its rates rather than its batches and its
 * fees.
 */
export interface CoachingPlaceholders {
  tagline: string;
  focus: string;
  coursesTitle: string;
  coursesBody: string;
  courseFee: string;
  courseTimings: string;
  courseStarts: string;
  resultsTitle: string;
  resultsBody: string;
  resultsNote: string;
  facultyTitle: string;
  facultyBody: string;
  methodTitle: string;
  methodBody: string;
  trialTitle: string;
  trialBody: string;
  trialHowTo: string;
  scheduleTitle: string;
  scheduleBody: string;
  noticesTitle: string;
  noticesBody: string;
  aboutTitle: string;
  aboutBody: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;

  /* Added with the 2026 rebuild. The page now has a fee line and a questions
     section of its own, and the hero's second column is a batch board rather
     than an empty half, so each of those needs a blank that reads as a margin
     note addressed to the director. */
  feesTitle: string;
  feesBody: string;
  faqTitle: string;
  faqBody: string;
  boardTitle: string;
  boardBody: string;
  /** The single line a collapsed section prints. One sentence, never a box. */
  nextBatch: string;
  established: string;
  /** The heading over the blanks that did not fit in place. */
  remainderTitle: string;
  remainderBody: string;
}

export function coachingPlaceholders(site: Pick<DemoSite, "market" | "country" | "kind">): CoachingPlaceholders {
  const v: DemoVocabulary = demoVocabulary({ ...site, kind: "coaching" });
  const intl = v.market === "international";
  const year = new Date().getFullYear();
  const group = lower(v.groupWord);
  const groups = lower(v.groupWordPlural);
  const fees = lower(v.feeWord);
  const teacher = v.teacherWord;

  return {
    tagline: `Add your one line here: what you teach, and who you teach it to.`,
    focus: intl
      ? "Add the subjects you teach"
      : "Add the exams you prepare students for, e.g. JEE, NEET, CUET, banking",

    coursesTitle: `Your ${groups} go here`,
    coursesBody: intl
      ? `One row per subject: who it is for, how long a session runs, when you have space, and what you charge. Send us the list and we will set it out so it reads on a phone without a download.`
      : `One row per course: the level, the duration, the timings, the ${group} start date and the fee. Send us your list and we will set it out so a student can read it on a phone, and so Google can read every word of it. No PDF.`,

    courseFee: `${v.feeWord} on request`,
    courseTimings: "Timings to be added",
    courseStarts: intl ? "Availability to be added" : `Next ${group} date to be added`,

    resultsTitle: intl ? "Add a few student outcomes here" : `Add your ${year} results here`,
    resultsBody: intl
      ? `A grade that moved, an entrance test passed, a child who stopped dreading tests. Whatever you already publish. We have written nothing here, because a result is a claim about your students and it is yours to make.`
      : `Ranks, scores, selections and names, exactly as you publish them yourself. We have not put a single figure here: an invented rank on a page carrying your name is something a parent could act on and you could be held to.`,
    resultsNote:
      "A student's photograph goes up only where you have their consent. We will ask you for it rather than assume it.",

    facultyTitle: `Your ${lower(v.teachersWord)} go here`,
    facultyBody: `Name, subject and qualification for each ${teacher}. In coaching this is the section a parent reads hardest, so it is worth getting from you rather than filling with stock photographs of strangers.`,

    methodTitle: "Why students stay, in your own words",
    methodBody: `Three or four things you actually do differently: the ${group} size, the test cycle, the doubt sessions, the way a weak student is caught early. Written by you, because a claim about your teaching is yours to make.`,

    trialTitle: intl ? "Your first session is free" : "Free demo class",
    trialBody: intl
      ? `Add what happens in a first session, how long it runs and how a parent books one. This is the section that converts, so it is worth a sentence you would actually say.`
      : `Add what a demo class covers, how long it runs and how a student books one. More students join after a demo class than after reading anything else on a website, including the fee.`,
    trialHowTo: "Add how to book: a call, a WhatsApp message, or walking in.",

    scheduleTitle: `Your ${lower(v.timetableWord.toLowerCase() === "schedule" ? "schedule" : v.timetableWord)} goes here`,
    scheduleBody: intl
      ? `The hours you actually have free, by day. A parent fitting you around a school day decides from this in one read instead of sending an ${v.enquiryNoun} to find out.`
      : `Which ${group} runs on which day, at what time, with which ${teacher}. A student on a phone should be able to find their own row in about three seconds.`,

    noticesTitle: "Notices you post yourselves",
    noticesBody: `A new ${group}, a test date, a holiday, a result. You type it and it is live: no developer, and no bill for a two-line change.`,

    aboutTitle: "About you, in your own words",
    aboutBody: `Two or three sentences: when you started, what you set out to do, and what you are known for locally. We have left it empty rather than writing a paragraph in your voice.`,

    phone: intl ? "Your enquiry number goes here" : "Your admission helpline goes here",
    whatsapp: "Your WhatsApp number goes here",
    email: `Your ${v.enquiryNoun} email goes here`,
    address: "Your address goes here",
    hours: "Your office hours go here",

    feesTitle: `Your ${fees} go here`,
    feesBody: intl
      ? `One figure with the word "from" in front of it, and one line on what it covers. No table and no tiers: a rate card on a home page starts an argument before anybody has read what you teach.`
      : `One ${fees} figure with "from" in front of it, and a line on what it covers. Never a table and never three price cards: that is a conversation for the phone, and the full answer goes in the questions below.`,

    faqTitle: "The questions you are asked every day",
    faqBody: `Eight of them, in the words a parent actually uses on the phone. Send us the list you already answer daily and the ${lower(v.feeWord)} question goes in it, which is where a parent looks for it.`,

    boardTitle: `The next ${groups}`,
    boardBody: `The four ${groups} starting soonest sit here, with the date and the timing. It is the first thing a parent looks for and the thing most sites keep in a PDF.`,

    nextBatch: intl ? "Next availability to be added" : `Next ${group} date to be added`,
    established: "Add the year you started",

    remainderTitle: "What we still need from you",
    remainderBody:
      "Everything else on this page is yours already. These are the few things we have not been given, listed once here instead of scattered down the page.",
  };
}

/* ── The fee, answered once, without a price list ────────────────────────── */

export interface CoachingFeeFrom {
  /** "₹3,500": the lowest fee anybody actually published, with its symbol. */
  figure: string;
  /** That batch's own note: "a month", "per year, in three instalments". */
  period: string;
  /** The other distinct fee notes on the record, at most two. */
  notes: string[];
}

/**
 * The single "from" figure for the whole institute, derived and never typed.
 *
 * MyTutor makes the price a SECTION HEADING, "Handpicked tutors from
 * GBP26/hour", and carries no pricing table on the home page at all.
 * Mathnasium answers cost inside the FAQ as one of sixteen questions. Both are
 * doing the same thing: one number, with the word "from" in front of it, and
 * the rest of the conversation on the phone. A fee table on a home page starts
 * an argument before anybody has read what you teach.
 *
 * SO THE FIGURE IS COMPUTED, NOT STORED. It is the lowest fee that appears on
 * any batch, printed with THAT batch's own period note, which is the only way
 * a "from" line can be true when one batch is priced by the month and another
 * by the year. Nothing is averaged, nothing is rounded, and a record whose
 * batches are all "On request" returns null rather than inventing a number.
 */
export function coachingFeeFrom(
  courses: DemoCourse[],
  currency: DemoCurrency | undefined,
  market: string,
): CoachingFeeFrom | null {
  let best: { value: number; raw: string; note: string } | null = null;
  const notes: string[] = [];
  for (const c of courses) {
    const note = text(c.feeNote);
    if (note && !notes.includes(note)) notes.push(note);
    const raw = text(c.fee);
    /* Anything that does not start with a digit is a real answer an institute
       publishes ("On request", "First month free") and is never turned into a
       number. It simply cannot be the "from" figure. */
    if (!/^[0-9]/.test(raw)) continue;
    const value = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(value) || value <= 0) continue;
    if (!best || value < best.value) best = { value, raw, note };
  }
  if (!best) return null;
  const figure = coachingFee(best.raw, currency, market);
  if (!figure) return null;
  return {
    figure,
    period: best.note,
    notes: notes.filter((n) => n !== best!.note).slice(0, 2),
  };
}

/* ── The earliest start date anybody published ───────────────────────────── */

/**
 * The next batch, as the institute wrote it.
 *
 * `batchStarts` is FREE TEXT and is never parsed into a Date, for the same
 * reason `DemoNotice.date` is not: institutes write "Starts 12 April", "New
 * batch every month", "After the boards" and "Admissions open", and a parser
 * that turns three of those into "Invalid Date" on a page carrying the
 * institute's name is worse than printing exactly what was typed. So this
 * returns the FIRST batch that carries a start line, in the order the
 * institute listed its own batches, and not a sorted minimum.
 */
export function coachingNextStart(courses: DemoCourse[]): string {
  for (const c of courses) {
    const s = text(c.batchStarts);
    if (s) return s;
  }
  return "";
}
