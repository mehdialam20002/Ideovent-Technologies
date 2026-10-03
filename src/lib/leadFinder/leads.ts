/**
 * Lead Finder rules, pure and dependency-light so a script can test them.
 *
 * WHAT A LEAD KEEPS (Google Maps Platform terms). A place ID may be stored
 * indefinitely; Google's other Places content (phone, address, rating) may
 * not be copied into our database. So a lead added here keeps only:
 *   the place ID, the name and city (the minimum a CRM needs, and Mehdi's own
 *   act of adding), the website address the audit reached, the audit verdict as the
 *   observation, the pitch, and the phones and emails the institute publishes
 *   on its OWN website.
 * Google's phone is shown live and reaches a lead only when Mehdi clicks
 * "Save this number" (buildSavedPhone), which is his decision.
 *
 * OPENSTREETMAP results (28 Sep 2026) are ODbL data, which may be kept with
 * the attribution: a lead from OSM also keeps the phone OSM lists (after any
 * found on their own website) and a note crediting OpenStreetMap. Since
 * 4 Oct 2026 OpenStreetMap is the finder's default (free, no key); Google's
 * results join the list only when Mehdi ticks "Also use Google" (mergeSources).
 *
 * DENTAL (28 Sep 2026): the dental presets, a Google/OSM category that says
 * dentist, or dental words in the typed type or the name make a "dental" lead,
 * and its demo is picked by dentalTemplateFor (d1 to d7), the one helper the
 * CRM and the poster import use too.
 */
import { chooseTemplate, type PosterExtract } from "@/lib/ai/posterSchema";
import { dentalTemplateFor, looksDental } from "@/lib/demo/templates/dentalPick";
import type { TemplateId } from "@/lib/demo/templates/ids";
import { kindFrom, normalizePhone, normalizeEmail } from "@/lib/outreach/store";
import {
  LEAD_FINDER_SOURCE,
  type LeadInput, type LeadKind, type LeadPitch, type OutreachLead,
} from "@/lib/outreach/types";
import { OSM_ATTRIBUTION, isOsm, type AuditVerdict, type FinderPlace, type SiteAudit } from "./client";

export type PresetGroup = "Schools" | "Coaching" | "Dental";

export interface TypePreset {
  /** Also tells OpenStreetMap which tags to search (SPECS in api/_lib/osm.js has the same ids). */
  id: string;
  label: string;
  /** What is sent to Google as the type: "<query> in <city>". */
  query: string;
  kind: LeadKind;
  group: PresetGroup;
}

export const TYPE_PRESETS: TypePreset[] = [
  { id: "cbse", label: "CBSE school", query: "CBSE school", kind: "school", group: "Schools" },
  { id: "play", label: "Play school", query: "play school", kind: "school", group: "Schools" },
  { id: "school", label: "School", query: "school", kind: "school", group: "Schools" },
  { id: "coaching", label: "Coaching", query: "coaching institute", kind: "coaching", group: "Coaching" },
  { id: "jee", label: "JEE/NEET coaching", query: "JEE NEET coaching", kind: "coaching", group: "Coaching" },
  { id: "ssc", label: "SSC/banking coaching", query: "SSC banking coaching", kind: "coaching", group: "Coaching" },
  { id: "tuition", label: "Tuition centre", query: "tuition centre", kind: "coaching", group: "Coaching" },
  { id: "dental", label: "Dental clinic", query: "dental clinic", kind: "dental", group: "Dental" },
  { id: "ortho", label: "Orthodontist or aligners", query: "orthodontist", kind: "dental", group: "Dental" },
  { id: "implant", label: "Dental implant centre", query: "dental implant centre", kind: "dental", group: "Dental" },
  { id: "kids", label: "Children's dentist", query: "pediatric dentist", kind: "dental", group: "Dental" },
  { id: "cosmetic", label: "Cosmetic dentist", query: "cosmetic dentist", kind: "dental", group: "Dental" },
];

/**
 * Google's primary type or OSM's tag says it is a dental practice ("dentist",
 * "dental_clinic", "clinic (paediatric_dentistry)"). From a word start
 * (underscores count as a break), so a "student_housing" is not a dentist.
 */
export const dentalCategory = (category?: string | null) =>
  /(^|[^a-z])(dent(al|ist)|orthodont|endodont|periodont|prosthodont|pedodont|paedodont)/i.test(category || "");

/**
 * The kind of a result. The place's own category wins when it says dentist
 * (a dentist in a coaching search is still a dentist); then the preset's
 * kind; then dental words in the typed type or the name; then the CRM's
 * school/coaching rules.
 */
export function kindForPlace(name: string, typeText: string, preset?: TypePreset, category?: string | null): LeadKind {
  if (dentalCategory(category)) return "dental";
  if (preset) return preset.kind;
  if (looksDental(typeText, name)) return "dental";
  return kindFrom(undefined, `${typeText} ${name}`);
}

/**
 * The demo template. Dental: dentalTemplateFor(name, category, type searched),
 * so "Orthodontist or aligners" lands on d5 and a "Kids Dental Care" on d6.
 * School and coaching: the SAME rules as the poster reader (chooseTemplate in
 * posterSchema.ts): "JEE/NEET coaching" lands on c1, "SSC/banking" on c5,
 * "play school" on s3, a plain school on s1. Null for any other business:
 * there is no template for it.
 */
export function templateForPlace(name: string, typeText: string, kind: LeadKind, category?: string | null): TemplateId | null {
  if (kind === "dental") return dentalTemplateFor(name, category, typeText);
  if (kind !== "school" && kind !== "coaching") return null;
  const x: PosterExtract = { kind, instituteName: name, notes: typeText };
  return chooseTemplate(x);
}

/** none/broken: they need a site. poor: theirs needs fixing. ok, or a page that could not be checked: no website pitch. */
export function pitchFor(verdict: AuditVerdict | undefined): LeadPitch | undefined {
  if (verdict === "none" || verdict === "broken") return "new_website";
  if (verdict === "poor") return "fix_website";
  return undefined;
}

/* What the check saw when a listed website would not open at all: an error page (http_404, http_500 ...),
   no answer in time, a domain that does not resolve, a bad certificate, a redirect that goes nowhere or to
   an address that is not public (api/_lib/siteAudit.js). Not parked, placeholder, empty or bad_url: those
   open (or are no web address at all), so they still count as no website of their own. */
const DOWN_CODE = /^(http_\d{3}|timeout|dns|tls|unreachable|blocked)$/;

/**
 * A "broken" site that would not open at all (3 Oct 2026). They HAVE a website, so the lead is about their
 * site, with the engine's site_down observation ("It would not load at all." / "Wo khul nahi rahi."): the
 * message that says "no website of its own, only the Google listing" would be false for them.
 */
export function siteDown(audit: SiteAudit | undefined): boolean {
  return audit?.verdict === "broken" && audit.evidence.some((e) => DOWN_CODE.test(e.code));
}

/** The lead's pitch from its audit: a site that would not open is their site; otherwise pitchFor. */
export function pitchForAudit(audit: SiteAudit | undefined): LeadPitch | undefined {
  return siteDown(audit) ? "fix_website" : pitchFor(audit?.verdict);
}

/*
  Audit evidence code -> an Outreach OBSERVATIONS id (src/lib/outreach/engine.ts),
  in the order tried: the first match is the observation said in the message.
  A code with no observation of its own falls back to the audit's own sentence.
*/
const CODE_TO_OBSERVATION: [RegExp, string][] = [
  [/^(no_website|not_a_site)$/, "no_website"],
  [/^no_viewport$/, "not_mobile"],
  [/^no_https$/, "http_only"],
  [/^slow$/, "slow"],
  [/^no_contact$/, "no_fees_admission"],
];

/*
  A dental clinic is not asked about fees and admissions. For a dental lead
  no_contact and the dental checks (siteAudit.js dentalFindings) become the
  Outreach engine's own dental observations (ids), so a Hinglish message says
  them in Hinglish, in one short problem line (30 Sep 2026; the first WhatsApp
  is the five-part format of 1 Oct 2026).
*/
const DENTAL_OBSERVATIONS: [string, string][] = [
  ["no_contact", "no_contact_details"],
  ["no_booking", "no_online_booking"],
  ["no_whatsapp", "no_whatsapp_button"],
  ["no_treatments", "no_treatment_pages"],
];

/**
 * The observation for a lead: an OBSERVATIONS id where one fits, else the audit's sentence.
 * None for a site that is fine, or one that could not be checked: nothing was found to say.
 */
export function observationFor(audit: SiteAudit | undefined, kind?: LeadKind): string | undefined {
  if (!audit || audit.verdict === "ok" || audit.verdict === "unchecked") return undefined;
  if (audit.verdict === "none") return "no_website";
  if (siteDown(audit)) return "site_down";
  for (const [re, id] of CODE_TO_OBSERVATION) {
    if (kind === "dental" && id === "no_fees_admission") continue;
    if (audit.evidence.some((e) => re.test(e.code))) return id;
  }
  // no_contact only means the page lacks contact WORDS: a number or e-mail the audit found on the page itself
  // disproves "does not show a phone number", so that sentence is never said to such a clinic (30 Sep 2026).
  const reachable = kind === "dental" && Boolean(audit.phones?.length || audit.emails?.length);
  if (kind === "dental" && audit.verdict === "poor") {
    for (const [code, id] of DENTAL_OBSERVATIONS) {
      if (code === "no_contact" && reachable) continue;
      if (audit.evidence.some((e) => e.code === code)) return id;
    }
  }
  const first = audit.evidence.find((e) => !(reachable && e.code === "no_contact"))?.text;
  if (audit.verdict === "broken") return first ? `Your website did not open properly when I tried it: ${lowerFirst(first)}.` : "Your website did not open when I tried it.";
  return first ? `${first}.` : undefined;
}

const lowerFirst = (s: string) => s.replace(/\.$/, "").replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());

/**
 * The website to keep: the address the audit actually reached on the
 * institute's own server (finalUrl). Google's websiteUri is Places content and
 * is not copied. OpenStreetMap's website tag is ODbL data and may be kept when
 * no audit reached the site. Otherwise nothing is kept.
 */
function websiteFor(place: FinderPlace, audit?: SiteAudit): string | undefined {
  if (audit?.verdict === "none") return undefined;
  if (audit?.finalUrl) return audit.finalUrl;
  return isOsm(place) && place.website ? place.website : undefined;
}

/**
 * The lead the finder writes. From Google: nothing but the place ID and the
 * name; the city is the one Mehdi searched. Phones and emails come from the
 * institute's own website (the audit). From OpenStreetMap: the same, plus the
 * phone OSM lists when their website shows none, and a note that credits
 * OpenStreetMap (ODbL) with the link to the map entry.
 */
export function leadFromPlace(
  place: FinderPlace,
  opts: { city: string; kind: LeadKind; audit?: SiteAudit; typeLabel?: string },
): LeadInput {
  const { audit } = opts;
  const own = (audit?.phones || []).map((p) => normalizePhone(p)).filter((p): p is string => !!p);
  const osmPhone = isOsm(place) ? normalizePhone(place.phoneIntl || place.phone) : undefined;
  const phones = osmPhone && !own.includes(osmPhone) ? [...own, osmPhone] : own;
  const emails = (audit?.emails || []).map((e) => normalizeEmail(e)).filter((e): e is string => !!e);
  const extra = [
    phones.length > 1 ? `Other numbers: ${phones.slice(1).join(", ")}` : "",
    emails.length > 1 ? `Other emails on their website: ${emails.slice(1).join(", ")}` : "",
    audit && audit.verdict !== "ok" && audit.evidence.length
      ? `Website check (${audit.verdict}): ${audit.evidence.map((e) => e.text).join("; ")}`
      : "",
    isOsm(place)
      ? `From OpenStreetMap (${OSM_ATTRIBUTION}, ODbL): ${place.mapsUrl || place.placeId}`
        + `${osmPhone ? `. Phone listed there: ${osmPhone}` : ""}${place.address ? `. Address listed there: ${place.address}` : ""}`
      : "",
  ].filter(Boolean);
  const lead: LeadInput = {
    instituteName: place.name.trim(),
    kind: opts.kind,
    city: opts.city.trim() || undefined,
    placeId: place.placeId,
    source: LEAD_FINDER_SOURCE,
    status: "new",
    website: websiteFor(place, audit),
    observation: observationFor(audit, opts.kind),
    pitch: pitchForAudit(audit),
    phone: phones[0],
    email: emails[0],
    tags: opts.typeLabel ? [opts.typeLabel] : undefined,
    notes: extra.length ? extra.join("\n") : undefined,
  };
  for (const k of Object.keys(lead) as (keyof LeadInput)[]) if (lead[k] === undefined) delete lead[k];
  return lead;
}

const squash = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9\p{Script=Devanagari}]+/gu, " ").trim();

/**
 * The lead this place already is, if any: same place ID; else a shared phone
 * (Google's, compared live and not stored, or one from their own site) or
 * email; else the same name in the same city.
 */
export function findExisting(
  leads: OutreachLead[],
  place: FinderPlace,
  city: string,
  audit?: SiteAudit,
): OutreachLead | undefined {
  const byPlace = leads.find((l) => l.placeId && l.placeId === place.placeId);
  if (byPlace) return byPlace;
  const phones = new Set(
    [place.phoneIntl, place.phone, ...(audit?.phones || [])].map((p) => normalizePhone(p)).filter(Boolean) as string[],
  );
  const emails = new Set((audit?.emails || []).map((e) => normalizeEmail(e)).filter(Boolean) as string[]);
  const byContact = leads.find((l) =>
    [l.phone, l.whatsapp].some((p) => { const n = normalizePhone(p); return !!n && phones.has(n); })
    || (!!l.email && emails.has(normalizeEmail(l.email) || "")));
  if (byContact) return byContact;
  const name = squash(place.name);
  const c = squash(city);
  if (!name) return undefined;
  return leads.find((l) => squash(l.instituteName) === name && (!c || !l.city || squash(l.city) === c));
}

/**
 * The list the finder shows when Google is on too: every OpenStreetMap result
 * first, then the Google results OpenStreetMap does not already have. One
 * business is the same name (as findExisting compares names) or the same
 * phone; Google's copy is then left out, so the row a lead is made from is
 * the free one, whose phone ODbL lets the lead keep.
 */
export function mergeSources(osm: FinderPlace[], google: FinderPlace[]): FinderPlace[] {
  const names = new Set(osm.map((p) => squash(p.name)).filter(Boolean));
  const phones = new Set(osm.map((p) => normalizePhone(p.phoneIntl || p.phone)).filter((p): p is string => !!p));
  const ids = new Set(osm.map((p) => p.placeId));
  const extra = google.filter((g) => {
    const phone = normalizePhone(g.phoneIntl || g.phone);
    return !ids.has(g.placeId) && !names.has(squash(g.name)) && !(phone && phones.has(phone));
  });
  return extra.length ? [...osm, ...extra] : osm;
}

/** What "Save this number" writes: Google's phone, by Mehdi's explicit choice. */
export function savedPhonePatch(lead: OutreachLead, place: FinderPlace): Partial<OutreachLead> | null {
  const phone = normalizePhone(place.phoneIntl || place.phone);
  if (!phone) return null;
  if (!lead.phone) return { phone };
  if (normalizePhone(lead.phone) === phone || normalizePhone(lead.whatsapp) === phone) return null;
  const line = `Phone saved from ${isOsm(place) ? "OpenStreetMap" : "Google Maps"}: ${phone}`;
  return { notes: lead.notes ? `${lead.notes}\n${line}` : line };
}

/** Filters over the results table. */
export interface FinderFilters {
  noWebsite: boolean;
  poorOrBroken: boolean;
  rating4: boolean;
  reviews20: boolean;
}

export const NO_FILTERS: FinderFilters = { noWebsite: false, poorOrBroken: false, rating4: false, reviews20: false };

/** OpenStreetMap has no ratings or reviews, so those two filters are off (and hidden) on an OSM list. */
export const withoutRatingFilters = (f: FinderFilters): FinderFilters => ({ ...f, rating4: false, reviews20: false });

/** Which website checks to run: "dental" adds online booking, WhatsApp and treatment pages. */
export type AuditKind = "dental" | null;

/** The website checks to run for a search: the dental ones for a dental preset or dental words. */
export function auditKindFor(typeText: string, preset?: TypePreset): AuditKind {
  return preset?.kind === "dental" || (!preset && looksDental(typeText)) ? "dental" : null;
}

/** The checks for one place: the search's, or the dental ones for a dentist found by any search. */
export function auditKindForPlace(place: Pick<FinderPlace, "name" | "primaryType">, typeText: string, preset?: TypePreset): AuditKind {
  if (auditKindFor(typeText, preset) === "dental") return "dental";
  return kindForPlace(place.name, typeText, preset, place.primaryType) === "dental" ? "dental" : null;
}

/** Places in batches of at most `size` that share one audit kind, in their first-seen order. */
export function auditBatches<T>(list: T[], kindOf: (x: T) => AuditKind, size: number): { kind: AuditKind; items: T[] }[] {
  const groups = new Map<AuditKind, T[]>();
  for (const x of list) {
    const k = kindOf(x);
    groups.set(k, [...(groups.get(k) || []), x]);
  }
  const out: { kind: AuditKind; items: T[] }[] = [];
  for (const [kind, items] of groups) {
    for (let i = 0; i < items.length; i += Math.max(1, size)) out.push({ kind, items: items.slice(i, i + Math.max(1, size)) });
  }
  return out;
}

/**
 * The words the demo template is picked from, besides the name and category:
 * the type searched, unless OpenStreetMap had none of that speciality and
 * showed every dental clinic (or coaching centre) instead. Then the searched
 * type says nothing about these places, and only their own words count.
 */
export const searchedTypeForTemplate = (typeText: string, broadened: string | null | undefined) => (broadened ? "" : typeText);

export function passes(place: FinderPlace, audit: SiteAudit | undefined, f: FinderFilters): boolean {
  if (f.noWebsite && (audit ? audit.verdict !== "none" : !!place.website)) return false;
  if (f.poorOrBroken && !(audit && (audit.verdict === "poor" || audit.verdict === "broken"))) return false;
  if (f.rating4 && !((place.rating ?? 0) >= 4)) return false;
  if (f.reviews20 && !((place.ratingCount ?? 0) >= 20)) return false;
  return true;
}
