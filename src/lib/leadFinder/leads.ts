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
 */
import { chooseTemplate, type PosterExtract } from "@/lib/ai/posterSchema";
import type { TemplateId } from "@/lib/demo/templates/ids";
import { kindFrom, normalizePhone, normalizeEmail } from "@/lib/outreach/store";
import {
  LEAD_FINDER_SOURCE,
  type LeadInput, type LeadKind, type LeadPitch, type OutreachLead,
} from "@/lib/outreach/types";
import type { AuditVerdict, FinderPlace, SiteAudit } from "./client";

export interface TypePreset {
  id: string;
  label: string;
  /** What is sent to Google as the type: "<query> in <city>". */
  query: string;
  kind: LeadKind;
}

export const TYPE_PRESETS: TypePreset[] = [
  { id: "cbse", label: "CBSE school", query: "CBSE school", kind: "school" },
  { id: "play", label: "Play school", query: "play school", kind: "school" },
  { id: "school", label: "School", query: "school", kind: "school" },
  { id: "coaching", label: "Coaching", query: "coaching institute", kind: "coaching" },
  { id: "jee", label: "JEE/NEET coaching", query: "JEE NEET coaching", kind: "coaching" },
  { id: "ssc", label: "SSC/banking coaching", query: "SSC banking coaching", kind: "coaching" },
  { id: "tuition", label: "Tuition centre", query: "tuition centre", kind: "coaching" },
];

/** The kind of a result: the preset's, else guessed from the typed text and the name. */
export function kindForPlace(name: string, typeText: string, preset?: TypePreset): LeadKind {
  if (preset) return preset.kind;
  const guess = kindFrom(undefined, `${typeText} ${name}`);
  return guess;
}

/**
 * The demo template, by the SAME rules as the poster reader (chooseTemplate in
 * posterSchema.ts), fed with what the finder knows: the name and the type
 * searched. "JEE/NEET coaching" lands on c1, "SSC/banking" on c5, "play
 * school" on s3, a plain school on s1. Null for a business that is neither a
 * school nor a coaching centre: there is no template for it.
 */
export function templateForPlace(name: string, typeText: string, kind: LeadKind): TemplateId | null {
  if (kind === "other") return null;
  const x: PosterExtract = { kind, instituteName: name, notes: typeText };
  return chooseTemplate(x);
}

/** none/broken: they need a site. poor: theirs needs fixing. ok: no website pitch. */
export function pitchFor(verdict: AuditVerdict | undefined): LeadPitch | undefined {
  if (verdict === "none" || verdict === "broken") return "new_website";
  if (verdict === "poor") return "fix_website";
  return undefined;
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

/** The observation for a lead: an OBSERVATIONS id where one fits, else the audit's sentence. */
export function observationFor(audit: SiteAudit | undefined): string | undefined {
  if (!audit || audit.verdict === "ok") return undefined;
  if (audit.verdict === "none") return "no_website";
  for (const [re, id] of CODE_TO_OBSERVATION) {
    if (audit.evidence.some((e) => re.test(e.code))) return id;
  }
  const first = audit.evidence[0]?.text;
  if (audit.verdict === "broken") return first ? `Your website did not open properly when I tried it: ${lowerFirst(first)}.` : "Your website did not open when I tried it.";
  return first ? `${first}.` : undefined;
}

const lowerFirst = (s: string) => s.replace(/\.$/, "").replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());

/**
 * The website to keep: only the address the audit actually reached on the
 * institute's own server (finalUrl). Google's websiteUri is Places content and
 * is not copied; with no audit, or a site that never answered, nothing is kept.
 */
function websiteFor(_place: FinderPlace, audit?: SiteAudit): string | undefined {
  if (!audit || audit.verdict === "none") return undefined;
  return audit.finalUrl || undefined;
}

/**
 * The lead the finder writes. Nothing from Google but the place ID and the
 * name; the city is the one Mehdi searched. Phones and emails come ONLY from
 * the institute's own website (the audit).
 */
export function leadFromPlace(
  place: FinderPlace,
  opts: { city: string; kind: LeadKind; audit?: SiteAudit; typeLabel?: string },
): LeadInput {
  const { audit } = opts;
  const phones = (audit?.phones || []).map((p) => normalizePhone(p)).filter((p): p is string => !!p);
  const emails = (audit?.emails || []).map((e) => normalizeEmail(e)).filter((e): e is string => !!e);
  const extra = [
    phones.length > 1 ? `Other numbers on their website: ${phones.slice(1).join(", ")}` : "",
    emails.length > 1 ? `Other emails on their website: ${emails.slice(1).join(", ")}` : "",
    audit && audit.verdict !== "ok" && audit.evidence.length
      ? `Website check (${audit.verdict}): ${audit.evidence.map((e) => e.text).join("; ")}`
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
    observation: observationFor(audit),
    pitch: pitchFor(audit?.verdict),
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

/** What "Save this number" writes: Google's phone, by Mehdi's explicit choice. */
export function savedPhonePatch(lead: OutreachLead, place: FinderPlace): Partial<OutreachLead> | null {
  const phone = normalizePhone(place.phoneIntl || place.phone);
  if (!phone) return null;
  if (!lead.phone) return { phone };
  if (normalizePhone(lead.phone) === phone || normalizePhone(lead.whatsapp) === phone) return null;
  const line = `Phone saved from Google Maps: ${phone}`;
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

export function passes(place: FinderPlace, audit: SiteAudit | undefined, f: FinderFilters): boolean {
  if (f.noWebsite && (audit ? audit.verdict !== "none" : !!place.website)) return false;
  if (f.poorOrBroken && !(audit && (audit.verdict === "poor" || audit.verdict === "broken"))) return false;
  if (f.rating4 && !((place.rating ?? 0) >= 4)) return false;
  if (f.reviews20 && !((place.ratingCount ?? 0) >= 20)) return false;
  return true;
}
