/**
 * DUPLICATING A TEMPLATE INTO A REAL DEMO.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Never invent a real institute's facts. A template is fiction written to
 * show a segment well. A duplicate becomes a REAL institute's website the
 * moment Mehdi types their name into it, and anything left over from the
 * fiction is then a claim made on their page, under their name, to their own
 * parents. So the copy CLEARS every field that is a fact about a specific
 * institute and KEEPS only what is structure or generic copy. When a field
 * could be read either way it is cleared: a blank renders as the designed
 * empty state both templates already have, and an invented fact renders as a
 * fact.
 *
 * ── THE TABLE ─────────────────────────────────────────────────────────────
 *
 *   field                  rule       why
 *   ─────────────────────  ─────────  ──────────────────────────────────────
 *   id                     NEW        a fresh document id
 *   slug                   NEW        unique, via uniqueDemoSlug; provisional
 *                                     ("draft-<template>") until named, and
 *                                     the editor re-derives it from the name
 *   status                 NEW        "draft": the link does not open
 *   templateId             NEW        the template's id, so the admin can say
 *                                     which design this demo started as
 *   preparedOn             NEW        today
 *   isExample              NEW        false: it is no longer an example
 *   order                  NEW        the end of the list
 *   createdAt, updatedAt   CLEAR      stamped by the store on save
 *
 *   kind                   KEEP       structure: which renderer
 *   theme                  KEEP       design family and palette
 *   market                 KEEP       language settings (drives the Hindi
 *                                     toggle) and the section vocabulary
 *   currency               KEEP       follows the market
 *   country                KEEP       follows the market; the city and state,
 *                                     which ARE facts, are cleared
 *   focusAreas             KEEP       the segment: what is taught, not a claim
 *   principalTitle         KEEP       the role's name ("Principal"), generic
 *   facilities             KEEP       the list, word for word. Templates must
 *                                     write it generic; the test fails on a
 *                                     digit or a number word in it
 *
 *   courses                STRUCTURE  name, level (class range), subjects,
 *                                     duration, timings pattern and mode are
 *                                     kept; batchStarts, seats, fee, feeNote
 *                                     and detail are cleared. A start date, a
 *                                     batch size and a fee are the institute's
 *                                     numbers; `detail` is a claim about how
 *                                     they run the batch
 *   schedule               STRUCTURE  label, days, time and subject kept (the
 *                                     timings pattern); faculty and room
 *                                     cleared, because they name people and
 *                                     places
 *   admissions             STRUCTURE  steps and documents kept, generic by
 *                                     the same rule as facilities; dates and
 *                                     note cleared
 *   faq                    STRUCTURE  only entries the template marked
 *                                     `generic: true` are kept, without the
 *                                     flag; the fee question never is
 *
 *   instituteName          CLEAR      the name
 *   shortName              CLEAR      the name
 *   tagline                CLEAR      their own line, or a placeholder
 *   city, state            CLEAR      where they are
 *   contact                CLEAR      phone, WhatsApp, email, address lines,
 *                                     office hours, map link, map search
 *   officialWebsite        CLEAR      their site, or nothing
 *   logo, heroImage        CLEAR      their files, or nothing
 *   palette                CLEAR      superseded by theme
 *   principalName          CLEAR      a real person
 *   principalMessage       CLEAR      a real person's words
 *   established,
 *   establishedYear        CLEAR      their history
 *   boardOrAffiliation     CLEAR      carries the affiliation NUMBER, which is
 *                                     checkable in a public register; the
 *                                     board survives in the course subjects
 *   about                  CLEAR      their prose, full of their facts
 *   admissionsHeadline     CLEAR      a session and a date
 *   notices                CLEAR      dated, institute-specific
 *   results                CLEAR      results, toppers, ranks, selections
 *   resultsHeading,
 *   resultsNote            CLEAR      name a year, and the note is the
 *                                     template's own "example content" label
 *   faculty                CLEAR      named people
 *   method                 CLEAR      each block is a promise about how this
 *                                     institute teaches ("the same teacher for
 *                                     two years"), which is a fact about them
 *   trial                  CLEAR      a promise that a free class exists, and
 *                                     its terms
 *   scheduleNote           CLEAR      a claim about their week
 *   gallery                CLEAR      captions describe a place and its
 *                                     people; with no photograph behind them
 *                                     every caption is a claim about their
 *                                     campus, and no function can tell which
 *                                     ones name a place, so all are cleared
 *   expiresAt              CLEAR      belonged to no conversation yet
 *
 * ── THE MULTI-PAGE FIELDS (26 September 2026) ─────────────────────────────
 *
 *   sitePages              KEEP       which pages the design offers, by id:
 *                                     structure. A page whose data is empty
 *                                     still leaves the nav on its own
 *   defaultLang            KEEP       a language setting, like market
 *   hi                     STRUCTURE  the Hindi versions of top-level text;
 *                                     a Hindi key survives only when its
 *                                     English field is KEEP (principalTitle).
 *                                     The same rule runs inside every kept
 *                                     object: courses[].hi keeps only the
 *                                     Hindi of kept course fields, and so on
 *   sessionLabel,
 *   admissionsOpenUntil    CLEAR      a session and a date
 *   vision, mission,
 *   udiseCode,
 *   classSizePromise,
 *   hostel, founder        CLEAR      their words, their numbers, a person
 *   stats                  CLEAR      trust figures
 *   reviews, rating        CLEAR      testimonials and a rating are claims
 *                                     made by named people about THIS place
 *   photos                 CLEAR      the same reason as gallery
 *   portalLinks,
 *   downloads, policies    CLEAR      their URLs and their documents
 *   joining                CLEAR      a promise about their process; empty
 *                                     prints our own generic three steps
 *   academics,
 *   facilityDetails,
 *   boardResults,
 *   transport, boarding,
 *   studentLife, safety,
 *   dayPlan, disclosure    CLEAR      every one is a fact about a campus
 *   testSeries,
 *   scholarship, posts,
 *   govExams, olympiad,
 *   feesPolicy             CLEAR      dates, fees, cut-offs, their writing
 *
 *   courses[]  also KEEP slug and category (structure: the URL and the goal
 *              chip) and CLEAR eligibility, syllabus, material, testPlan,
 *              instalments, inclusions, refundNote, facultyNames and faq.
 *   schedule[] and admissions: every new key is CLEAR except `hi` (the rule
 *              above). The new admissions keys (timeline, fees, ageRules,
 *              rteNote, applyUrl, whoCanApply, assessment) are all CLEAR:
 *              the age checker's NEP defaults live in code, not the record.
 *   faq[]      a generic entry keeps its group and its Hindi title and body.
 *
 * Fields the brief also names that DemoSite does not have (testimonials,
 * toppers, social handles, student names outside `results`) have nowhere to
 * survive. A field added to DemoSite later cannot slip through either:
 * `DUPLICATE_POLICY` below is typed as a Record over every key of DemoSite,
 * so the build fails until the new field is classified.
 *
 * ── PURE ──────────────────────────────────────────────────────────────────
 * No store, no clock and no randomness unless the caller passes none: `now`
 * and `newId` are injectable, the inputs are never mutated, and nothing is
 * saved. The caller saves. scripts/test-from-template.mjs runs every template
 * through this and asserts every CLEAR field is empty and every KEEP field is
 * equal.
 */

import type {
  DemoAdmissions,
  DemoCourse,
  DemoScheduleRow,
  DemoSite,
  PitchPage,
} from "@/lib/cms/types";
import { uniqueDemoSlug } from "../reservedRoutes";
import type { LoadedTemplate } from "./shape";

/* ── The policy, as data ─────────────────────────────────────────────────── */

export type DuplicateRule = "new" | "keep" | "structure" | "clear";

/** The table above, one entry per DemoSite field. Exhaustive by type. */
export const DUPLICATE_POLICY = {
  id: "new",
  slug: "new",
  status: "new",
  templateId: "new",
  preparedOn: "new",
  isExample: "new",
  order: "new",
  createdAt: "clear",
  updatedAt: "clear",

  kind: "keep",
  theme: "keep",
  market: "keep",
  currency: "keep",
  country: "keep",
  focusAreas: "keep",
  principalTitle: "keep",
  facilities: "keep",

  courses: "structure",
  schedule: "structure",
  admissions: "structure",
  faq: "structure",

  instituteName: "clear",
  shortName: "clear",
  tagline: "clear",
  city: "clear",
  state: "clear",
  contact: "clear",
  officialWebsite: "clear",
  logo: "clear",
  heroImage: "clear",
  palette: "clear",
  principalName: "clear",
  principalMessage: "clear",
  established: "clear",
  establishedYear: "clear",
  boardOrAffiliation: "clear",
  about: "clear",
  admissionsHeadline: "clear",
  notices: "clear",
  results: "clear",
  resultsHeading: "clear",
  resultsNote: "clear",
  faculty: "clear",
  method: "clear",
  trial: "clear",
  scheduleNote: "clear",
  gallery: "clear",
  expiresAt: "clear",

  /* Multi-page fields: see the second half of the table above. */
  sitePages: "keep",
  defaultLang: "keep",
  hi: "structure",
  sessionLabel: "clear",
  admissionsOpenUntil: "clear",
  vision: "clear",
  mission: "clear",
  udiseCode: "clear",
  classSizePromise: "clear",
  hostel: "clear",
  founder: "clear",
  stats: "clear",
  reviews: "clear",
  rating: "clear",
  photos: "clear",
  portalLinks: "clear",
  downloads: "clear",
  policies: "clear",
  joining: "clear",
  academics: "clear",
  facilityDetails: "clear",
  boardResults: "clear",
  transport: "clear",
  boarding: "clear",
  studentLife: "clear",
  safety: "clear",
  dayPlan: "clear",
  disclosure: "clear",
  testSeries: "clear",
  scholarship: "clear",
  posts: "clear",
  govExams: "clear",
  olympiad: "clear",
  feesPolicy: "clear",
} as const satisfies Record<keyof DemoSite, DuplicateRule>;

type Policy = typeof DUPLICATE_POLICY;
type KeysWith<R extends DuplicateRule> = {
  [K in keyof Policy]: Policy[K] extends R ? K : never;
}[keyof Policy];

export type ClearedField = KeysWith<"clear">;
export type KeptField = KeysWith<"keep">;

/** Every field under a rule, for the test and for anybody reading the table. */
export function fieldsWithRule(rule: DuplicateRule): (keyof DemoSite)[] {
  return (Object.keys(DUPLICATE_POLICY) as (keyof DemoSite)[]).filter(
    (k) => DUPLICATE_POLICY[k] === rule,
  );
}

/**
 * What each cleared field becomes. The same empty values the admin's own
 * "New demo site" defaults use (src/admin/schemas.ts), so the form opens on
 * empty inputs rather than on undefined, and every renderer already has a
 * designed empty state for each of them. `Required<>` makes a missing entry a
 * compile error.
 */
const CLEARED: Required<Pick<DemoSite, ClearedField>> = {
  createdAt: undefined,
  updatedAt: undefined,
  instituteName: "",
  shortName: "",
  tagline: "",
  city: "",
  state: "",
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    addressLines: [],
    hours: "",
    mapUrl: "",
    mapQuery: "",
  },
  officialWebsite: "",
  logo: "",
  heroImage: "",
  palette: undefined,
  principalName: "",
  principalMessage: "",
  established: "",
  establishedYear: "",
  boardOrAffiliation: "",
  about: "",
  admissionsHeadline: "",
  notices: [],
  results: [],
  resultsHeading: "",
  resultsNote: "",
  faculty: [],
  method: [],
  trial: { heading: "", body: "", duration: "", bring: "", howToBook: "" },
  scheduleNote: "",
  gallery: [],
  expiresAt: "",
  /* Multi-page fields clear to nothing at all: the key is dropped, which is
     what a record typed by hand before these fields existed looks like. */
  sessionLabel: undefined,
  admissionsOpenUntil: undefined,
  vision: undefined,
  mission: undefined,
  udiseCode: undefined,
  classSizePromise: undefined,
  hostel: undefined,
  founder: undefined,
  stats: undefined,
  reviews: undefined,
  rating: undefined,
  photos: undefined,
  portalLinks: undefined,
  downloads: undefined,
  policies: undefined,
  joining: undefined,
  academics: undefined,
  facilityDetails: undefined,
  boardResults: undefined,
  transport: undefined,
  boarding: undefined,
  studentLife: undefined,
  safety: undefined,
  dayPlan: undefined,
  disclosure: undefined,
  testSeries: undefined,
  scholarship: undefined,
  posts: undefined,
  govExams: undefined,
  olympiad: undefined,
  feesPolicy: undefined,
};

/* ── The three STRUCTURE fields that are objects, field by field ─────────── */

/**
 * The rule for one key of a kept object: keep it, clear it, or ("hi") keep
 * only the Hindi of the keys that are themselves kept. See keptHi.
 */
export type SubRule = "keep" | "clear" | "hi";

/** A batch keeps its shape and loses its numbers. Exhaustive by type. */
export const COURSE_POLICY = {
  name: "keep",
  level: "keep",
  subjects: "keep",
  duration: "keep",
  timings: "keep",
  mode: "keep",
  batchStarts: "clear",
  seats: "clear",
  fee: "clear",
  feeNote: "clear",
  detail: "clear",
  slug: "keep",
  category: "keep",
  eligibility: "clear",
  syllabus: "clear",
  material: "clear",
  testPlan: "clear",
  instalments: "clear",
  inclusions: "clear",
  refundNote: "clear",
  facultyNames: "clear",
  faq: "clear",
  hi: "hi",
} as const satisfies Record<keyof DemoCourse, SubRule>;

/** A timetable row keeps its pattern and loses its people and rooms. */
export const SCHEDULE_POLICY = {
  label: "keep",
  days: "keep",
  time: "keep",
  subject: "keep",
  faculty: "clear",
  room: "clear",
  hi: "hi",
} as const satisfies Record<keyof DemoScheduleRow, SubRule>;

/** Admissions keeps its steps and papers and loses its dates and terms. */
export const ADMISSIONS_POLICY = {
  steps: "keep",
  documents: "keep",
  dates: "clear",
  note: "clear",
  timeline: "clear",
  fees: "clear",
  feeNote: "clear",
  ageRules: "clear",
  ageAsOn: "clear",
  rteNote: "clear",
  applyUrl: "clear",
  whoCanApply: "clear",
  assessment: "clear",
  hi: "hi",
} as const satisfies Record<keyof DemoAdmissions, SubRule>;

/**
 * The Hindi block of a kept object, reduced to the Hindi of its KEPT fields.
 * A Hindi fee note must not survive when the English one is cleared. Returns
 * undefined when nothing is left, so the key is dropped.
 */
export function keptHi(
  hi: Record<string, unknown> | undefined,
  policy: Record<string, string>,
): Record<string, string> | undefined {
  if (!hi || typeof hi !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(hi)) {
    if (policy[k] === "keep" && typeof v === "string" && v.trim()) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function pick<T extends object>(
  source: T | undefined,
  policy: Record<keyof T, SubRule>,
  empty: Partial<Record<keyof T, unknown>>,
): T {
  const out = {} as Record<keyof T, unknown>;
  for (const key of Object.keys(policy) as (keyof T)[]) {
    const rule = policy[key];
    const value =
      rule === "keep"
        ? copyValue(source?.[key])
        : rule === "hi"
          ? keptHi(source?.[key] as Record<string, unknown>, policy as Record<string, string>)
          : empty[key];
    /* A cleared multi-page key has no entry in `empty` and is dropped, which
       is what a record made before the field existed looks like. */
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

/* The original fields clear to "" or [], as before; the new ones are absent. */
const EMPTY_COURSE: Partial<Record<keyof DemoCourse, unknown>> = {
  name: "", level: "", subjects: "", duration: "", timings: "", mode: "",
  batchStarts: "", seats: "", fee: "", feeNote: "", detail: "",
};
const EMPTY_SCHEDULE: Partial<Record<keyof DemoScheduleRow, unknown>> = {
  label: "", days: "", time: "", subject: "", faculty: "", room: "",
};
const EMPTY_ADMISSIONS: Partial<Record<keyof DemoAdmissions, unknown>> = {
  steps: [], documents: [], dates: "", note: "",
};

/** A deep copy of plain data, so the copy never shares an array with the template. */
function copyValue<V>(v: V): V {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as V);
}

/* ── The provisional link ────────────────────────────────────────────────── */

/**
 * What a fresh duplicate's link is built from, before it has a name.
 *
 * The copy has no name yet, so its link cannot be the institute's. It gets
 * "draft-s1-urban-cbse" (or "-2", "-3" on a clash), which says what it is in
 * the list and cannot be mistaken for a real institute's address. The editor
 * treats this pattern as "not chosen by hand yet", so the link follows the
 * name the moment Mehdi types one, exactly as it does on a brand new demo.
 */
export function templateDraftSlugBase(templateId: string): string {
  return `draft-${templateId}`;
}

/** True while a duplicate still wears its provisional link. */
export function hasProvisionalTemplateSlug(site: Pick<DemoSite, "slug" | "templateId">): boolean {
  if (!site.templateId) return false;
  const base = templateDraftSlugBase(site.templateId);
  const s = (site.slug || "").toLowerCase();
  return s === base || new RegExp(`^${base}-\\d+$`).test(s);
}

/**
 * A generic FAQ as it lands on the copy: its title and body, its group, and
 * the Hindi of those three. Exported so the test computes the expected value
 * with the same rule instead of a second copy of it.
 */
export function genericFaqCopy(f: { title: string; body?: string; group?: string; hi?: Record<string, string> }) {
  const out: { title: string; body: string; group?: string; hi?: Record<string, string> } = {
    title: f.title,
    body: f.body || "",
  };
  if (f.group) out.group = f.group;
  const hi = keptHi(f.hi, { title: "keep", body: "keep", group: "keep" });
  if (hi) out.hi = hi;
  return out;
}

/* ── The function ────────────────────────────────────────────────────────── */

export interface FromTemplateContext {
  /** Every demo, so the new slug and id are unique. */
  sites: DemoSite[];
  /** Every pitch page, so the new slug does not collide with one. */
  pitchPages: PitchPage[];
  /** Injectable for the test. Defaults to the current time. */
  now?: Date;
  /** Injectable for the test. Defaults to a time-based "ds_…" id. */
  newId?: () => string;
}

function defaultId(now: Date): string {
  return `ds_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * A new, fully editable draft demo, made from a template by the table above.
 *
 * It is an ordinary `demoSites` document once saved: the edit lock, the slot,
 * Mark sent and every other rule apply to it exactly as to a demo typed in by
 * hand. Nothing links it back to the template except `templateId`, which is a
 * label; editing the template (in code) never changes a demo already made.
 */
export function fromTemplate(template: LoadedTemplate, ctx: FromTemplateContext): DemoSite {
  const { meta, content } = template;
  const now = ctx.now || new Date();
  const sites = ctx.sites || [];
  const pitchPages = ctx.pitchPages || [];

  /* The template seen as a record: the content file plus the two fields the
     registry owns. Only KEEP fields are read from it. */
  const source = { ...content, kind: meta.kind, theme: meta.theme } as Partial<DemoSite>;

  const copy = {} as DemoSite;
  const write = copy as unknown as Record<string, unknown>;

  for (const key of Object.keys(DUPLICATE_POLICY) as (keyof DemoSite)[]) {
    const rule = DUPLICATE_POLICY[key];
    if (rule === "keep") write[key] = copyValue(source[key]);
    else if (rule === "clear") write[key] = copyValue(CLEARED[key as ClearedField]);
  }

  /* STRUCTURE */
  copy.courses = (content.courses || []).map((c) => pick(c, COURSE_POLICY, EMPTY_COURSE));
  copy.schedule = (content.schedule || []).map((r) => pick(r, SCHEDULE_POLICY, EMPTY_SCHEDULE));
  copy.admissions = pick(content.admissions, ADMISSIONS_POLICY, EMPTY_ADMISSIONS);
  copy.faq = (content.faq || [])
    .filter((f) => f.generic === true)
    .map((f) => genericFaqCopy(f));

  /* STRUCTURE: the top-level Hindi block keeps only the Hindi of KEEP fields. */
  const hi = keptHi(content.hi as Record<string, unknown>, DUPLICATE_POLICY as Record<string, string>);
  if (hi) copy.hi = hi;
  else delete write.hi;

  /* NEW */
  const taken = new Set(sites.map((s) => s.id));
  let id = ctx.newId ? ctx.newId() : defaultId(now);
  for (let n = 2; taken.has(id); n++) id = `${id}_${n}`;
  copy.id = id;
  copy.status = "draft";
  copy.isExample = false;
  copy.templateId = meta.id;
  copy.preparedOn = now.toISOString().slice(0, 10);
  copy.order = sites.length;
  copy.slug = uniqueDemoSlug(templateDraftSlugBase(meta.id), { sites, pitchPages, currentId: id });

  /* Keys the store stamps on save are not carried as `undefined` properties,
     so the document written is exactly what a hand-made draft looks like. */
  for (const k of Object.keys(write)) if (write[k] === undefined) delete write[k];

  return copy;
}
