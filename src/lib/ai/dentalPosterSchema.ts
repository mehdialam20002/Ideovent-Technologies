/**
 * WHAT A DENTAL CLINIC'S POSTER IS READ INTO (28 Sep 2026).
 *
 * The clinic twin of `PosterExtract` (./posterSchema.ts). A clinic's poster,
 * banner, signboard or visiting card carries a name, a doctor or two with
 * their degrees, a list of treatments, the opening hours, a phone and an
 * address; sometimes a few fees. /api/poster reads it into this shape with
 * kind "dental" (api/_lib/posterExtract.js holds the server's copy), Mehdi
 * reviews every field, and fromPoster (src/lib/demo/templates/fromPoster.ts)
 * overlays it on a dental template.
 *
 * Every field but `kind` is optional and verbatim, as for schools: a field
 * the poster does not show stays EMPTY, so the template's labelled sample
 * content stays in its place.
 *
 * THE DENTAL COUNCIL CODE. A poster outside a clinic often says "FREE
 * check-up", "20% off on implants" or "painless RCT". The DCI Code of Ethics
 * (8.1.3 inducements, 8.2 boasting, 8.3.3 specialist titles; see
 * E:/myagency/_assets/DENTAL-COMPLIANCE.md) bars those on the clinic's own
 * site, and the demo IS their site. So `offers` are read (Mehdi should see
 * them) but never printed, and any tagline, treatment, fee or doctor line
 * that carries an inducement or a superlative is left out and named in the
 * demo's private notes. `dentalClaimIssue` is the one test, used by the
 * review form (live warnings) and by fromPoster (the actual leaving out).
 *
 * Pure and dependency-light, so scripts/test-from-poster.mjs bundles it.
 */

import type { TemplateId } from "@/lib/demo/templates/ids";
import { dentalTemplateFor, looksDental } from "@/lib/demo/templates/dentalPick";
import type { PosterContact, PosterExtract, PosterFaculty, PosterKind } from "./posterSchema";

export interface PosterDoctor {
  /** "Dr. Priya Mehta", as printed. */
  name?: string;
  /** Degrees exactly as printed: "BDS, MDS (Orthodontics)". */
  degrees?: string;
  /** The council registration, only if printed: "Reg. No. A-12345". */
  registration?: string;
  /** As printed: "Orthodontist", "Dental surgeon". */
  specialisation?: string;
  experience?: string;
  /** When this doctor sits, if printed: "Mon, Wed, Fri 5 to 8 pm". */
  days?: string;
}

export interface PosterFee {
  treatment?: string;
  /** As printed: "₹2,500 onwards". */
  fee?: string;
  /** "per tooth", "per arch". */
  unit?: string;
}

export interface DentalPosterExtract {
  kind: "dental";
  /** The clinic's name. Named like the school field so the rest of the flow is shared. */
  instituteName?: string;
  instituteNameHi?: string;
  tagline?: string;
  city?: string;
  state?: string;
  /** The area: "Gomti Nagar". */
  locality?: string;
  established?: string;
  doctors?: PosterDoctor[];
  treatments?: string[];
  /** Opening days and hours as printed, one string. */
  timings?: string;
  fees?: PosterFee[];
  contact?: PosterContact;
  /** Offers, discounts, camps. READ, NEVER PRINTED (DCI 8.1.3). */
  offers?: string[];
  posterLanguage?: "hi" | "en" | "mixed";
  notes?: string;
}

export type AnyPosterKind = PosterKind | "dental";
export type AnyPosterExtract = PosterExtract | DentalPosterExtract;

/**
 * What the review form edits: every field of both shapes, so switching the
 * kind in the form never loses what was typed.
 */
export type PosterDraft = Omit<PosterExtract, "kind"> & Omit<DentalPosterExtract, "kind"> & { kind: AnyPosterKind };

export const isDentalExtract = (x: { kind?: string } | null | undefined): x is DentalPosterExtract => x?.kind === "dental";

/* ── Cleaning what came back (the same rules as normalizeExtract) ────────── */

const str = (v: unknown): string | undefined => {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  return t && !/^(n\/?a|null|none|unknown|not (given|mentioned|available)|-+)$/i.test(t) ? t : undefined;
};
/** Timings and addresses keep their line breaks. */
const text = (v: unknown): string | undefined => {
  if (typeof v !== "string") return str(v);
  const t = v.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
  return str(t) === undefined ? undefined : t;
};
const strs = (v: unknown): string[] | undefined => {
  const list = (Array.isArray(v) ? v : typeof v === "string" ? [v] : []).map(str).filter(Boolean) as string[];
  return list.length ? [...new Set(list)] : undefined;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const prune = <T extends object>(o: T): T => {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k];
  return o;
};
const rows = <T extends object>(v: unknown, map: (o: Record<string, unknown>) => T): T[] | undefined => {
  const list = (Array.isArray(v) ? v : []).map((x) => prune(map(obj(x)))).filter((x) => Object.keys(x).length);
  return list.length ? list : undefined;
};

/**
 * Whatever the server returned (or the review form holds), as a well-formed
 * clinic extract: strings trimmed, placeholders dropped, empty rows removed,
 * school fields and unknown keys ignored.
 */
export function normalizeDentalExtract(raw: unknown): DentalPosterExtract {
  const r = obj(raw);
  const con = obj(r.contact);
  const lang = r.posterLanguage;
  const contact = prune({
    phones: strs(con.phones),
    whatsapp: str(con.whatsapp),
    email: str(con.email),
    address: text(con.address),
    website: str(con.website),
  });
  return prune({
    kind: "dental" as const,
    instituteName: str(r.instituteName),
    instituteNameHi: str(r.instituteNameHi),
    tagline: str(r.tagline),
    city: str(r.city),
    state: str(r.state),
    locality: str(r.locality),
    established: str(r.established),
    doctors: rows(r.doctors, (d) => ({
      name: str(d.name), degrees: str(d.degrees), registration: str(d.registration),
      specialisation: str(d.specialisation), experience: str(d.experience), days: str(d.days),
    })),
    treatments: strs(r.treatments),
    timings: text(r.timings),
    fees: rows(r.fees, (f) => ({ treatment: str(f.treatment), fee: str(f.fee), unit: str(f.unit) })),
    contact: Object.keys(contact).length ? contact : undefined,
    offers: strs(r.offers),
    posterLanguage: lang === "hi" || lang === "en" || lang === "mixed" ? lang : undefined,
    notes: str(r.notes),
  });
}

/* ── Which template, and which kind ──────────────────────────────────────── */

/**
 * The dental template for a clinic's poster: the ONE shared rule,
 * dentalTemplateFor(clinic name, treatments), so the CRM, the Lead Finder
 * and the poster import pick alike for the same clinic. The model's own
 * suggestion is not consulted: it can drift between two readings of one
 * card, and the same clinic must land on the same design on every screen.
 * Mehdi can always pick another in the review.
 */
export function dentalPosterTemplate(x: Pick<DentalPosterExtract, "instituteName" | "treatments">): TemplateId {
  return dentalTemplateFor(x.instituteName, (x.treatments || []).join(", "));
}

/** True when a poster read as a school or coaching institute names a dental practice. */
export function posterLooksDental(x: { instituteName?: string; instituteNameHi?: string; tagline?: string }): boolean {
  return looksDental(x.instituteName, x.tagline);
}

/**
 * The draft as another kind, for the review form's Kind switch and for a
 * template of the other family. Nothing is invented: the shared fields
 * carry over, a clinic's doctors become teachers (name, degrees as the
 * qualification, specialisation as the subject) and back, and a field the
 * new kind has no place for stays on the draft, unused.
 */
export function toKind(x: PosterDraft, kind: AnyPosterKind): PosterDraft {
  if (x.kind === kind) return x;
  const out: PosterDraft = { ...x, kind };
  if (kind === "dental" && !x.doctors?.length && x.faculty?.length) {
    out.doctors = x.faculty.map((f) => prune({ name: f.name, degrees: f.qualification, specialisation: f.subject, experience: f.experience }));
  }
  if (kind !== "dental" && !x.faculty?.length && x.doctors?.length) {
    out.faculty = x.doctors.map((d): PosterFaculty => prune({ name: d.name, qualification: d.degrees, subject: d.specialisation, experience: d.experience }));
  }
  return out;
}

/* ── The Dental Council code ─────────────────────────────────────────────── */

/**
 * Why a line is left off the demo:
 *   inducement  an offer, discount, "free", a camp, a gift, referral money (DCI 8.1.3, 8.1.4, 8.6.1)
 *   claim       a superlative, a promise or a boast of cases (DCI 8.2, 8.2.7, 8.2.8; CCPA 2022)
 *   title       a specialist title the Council does not recognise (DCI 8.3.3)
 */
export type ClaimIssue = "inducement" | "claim" | "title";

/* "free" only as a word of its own: "metal-free crowns" is a product, "FREE check-up" an offer. */
const INDUCEMENT = new RegExp([
  String.raw`(?<![-\w])free\b`, String.raw`\bdiscount`, String.raw`\d+\s*%\s*(off|discount|cash\s*back)`,
  String.raw`\bflat\s+(rs\.?|₹|inr)?\s*\d`, String.raw`(rs\.?|₹)\s*\d[\d,]*\s*off\b`, String.raw`\bcash\s*back\b`,
  String.raw`\bgifts?\b`, String.raw`\brefer\b.{0,24}\b(earn|get|win|reward|bonus|cash)`, String.raw`\breferral\s*(bonus|reward|offer)`,
  String.raw`\bcombo\b`, String.raw`\bcoupons?\b`, String.raw`\bvouchers?\b`, String.raw`\bcamps?\b`,
  String.raw`\b(special|limited|festival|festive|diwali|holi|navratri|new\s+year|launch|introductory|opening|monsoon|summer|winter)\s+(offer|discount|price|scheme|package)s?\b`,
  String.raw`\boffer\s+(valid|price|till|ends|period)\b`, String.raw`\b(no|zero)[- ]cost\s+emi\b`, String.raw`\b0\s*%\s*(emi|interest)`,
  String.raw`\bhurry\b`, String.raw`\blimited\s+(period|time|seats|slots)\b`, String.raw`\bpay\s+only\s+if\b`, String.raw`\bmoney[- ]back\b`,
  "मुफ़्त", "मुफ्त", "फ्री", "निःशुल्क", "निशुल्क", "छूट", "ऑफ़र", "ऑफर", "डिस्काउंट", "कैंप", "शिविर",
].join("|"), "i");

const CLAIM = new RegExp([
  String.raw`\b(best|leading|top|cheapest|lowest|painless|miracle|instant|lifetime|guarantee[ds]?|celebrity|award[- ]?winning|awarded)\b`,
  String.raw`\bno\.?\s*1\b`, String.raw`\bnumber\s*one\b`, String.raw`#\s*1\b`, String.raw`\bfirst\s+in\b`, String.raw`100\s*%`,
  String.raw`\bmost\s+(advanced|trusted|experienced|modern|affordable)\b`, String.raw`\bworld[- ]class\b`,
  String.raw`\bpain[- ]?free\b`, String.raw`\b(zero|no)\s+pain\b`, String.raw`\brisk[- ]free\b`, String.raw`\bhollywood\s+smile\b`,
  String.raw`\bgold\s+medal`, String.raw`\bpermanent\s+(solution|cure|result|fix|smile)`,
  String.raw`\d[\d,]*\s*\+?\s*(happy|satisfied)\s+(patients|smiles|customers|families)`, String.raw`\bsmiles?\s+transformed\b`,
  String.raw`\d[\d,]*\s*\+\s*(patients|implants|smiles|cases|treatments)\b`,
  "सर्वश्रेष्ठ", "बेस्ट", String.raw`नंबर\s*1`, "गारंटी", String.raw`दर्द\s*रहित`, String.raw`बिना\s*दर्द`, String.raw`सबसे\s*(अच्छा|सस्ता|बढ़िया)`,
].join("|"), "i");

/* "Implantologist" and "Cosmetic dentist" are not Council specialties (DENTAL-COMPLIANCE.md section 3). */
const TITLE = /\b(implantologist|cosmetologist|cosmetic\s+dentist|aesthetic\s+dentist|smile\s+designer|laser\s+dentist)\b/i;

/** Why this line may not go on a clinic's site, or null when it may. */
export function dentalClaimIssue(line: string | undefined): ClaimIssue | null {
  const t = (line || "").trim();
  if (!t) return null;
  if (INDUCEMENT.test(t)) return "inducement";
  if (CLAIM.test(t)) return "claim";
  return null;
}

/** The same, for a doctor's specialisation, where an unrecognised title is left out too. */
export function specialisationIssue(line: string | undefined): ClaimIssue | null {
  return TITLE.test(line || "") ? "title" : dentalClaimIssue(line);
}

/** The reason, in the words the review form and the private note use. No em dashes. */
export const CLAIM_REASON: Record<ClaimIssue, string> = {
  inducement: "an offer or inducement, which the Dental Council code bars on a clinic's site",
  claim: "a superlative, a promise or a boast of cases, which the Dental Council code bars",
  title: "not a specialist title the Dental Council recognises; write the degree and the area of work instead",
};
