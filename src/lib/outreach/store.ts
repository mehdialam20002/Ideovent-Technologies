/**
 * OutreachStore: leads, events and settings for the admin Outreach section.
 *
 * Two implementations behind one interface:
 *  - SupabaseOutreachStore when the site is wired to Supabase (production).
 *    Tables public.outreach_leads / outreach_events / outreach_settings from
 *    supabase/migrations/0007_outreach.sql, admin-only RLS. The SDK is loaded
 *    lazily so importing this module does not pull it into the main chunk.
 *  - LocalOutreachStore otherwise (local dev, tests): one JSON object in
 *    localStorage under `ideovent_outreach_v1`. Deliberately NOT the CMS
 *    snapshot key: leads must never ride along in a CMS Export or snapshot.
 *
 * Phone numbers are normalised to +91XXXXXXXXXX (Indian numbers) on save and
 * for duplicate matching; emails are lower-cased and trimmed.
 *
 * THE TEAM (0011_crm_team.sql, spec section 9). Several people now share the
 * CRM, so a save no longer sends the whole lead: patchLead merges a change on
 * the server (crm_patch_lead), createLead only inserts, appendNotes appends.
 * The whole-lead upsertLead stays for Mehdi's bulk flows (Lead Finder, demo
 * auto-lead, clean-ups, import). Who works a lead is a column, mirrored on
 * the lead as assigneeId and friends (types.ts). The Supabase store finds out
 * once per session whether 0011 is applied (crm_me); without it, it behaves
 * exactly as before ("legacy"). The local store emulates the team for the e2e
 * suites, acting as localStorage["ideovent_crm_local_actor"] (./localTeam.ts).
 */
import { supabaseEnabled } from "@/lib/cms/config";
import type { DemoSite, DemoSiteOpen } from "@/lib/cms/types";
import { looksDental } from "@/lib/demo/templates/dentalPick";
import { CrmAccessError, LEAD_VALUES, MIRROR_KEYS, crmErrorText } from "./access";
import { LocalCrm, normalizeTeam, type LocalCms, type LocalCmsAccess, type LocalData } from "./localTeam";
import {
  LOCAL_ACTOR_KEY,
  legacyMe,
  noAccessMe,
  type AccessAction,
  type AccessDay,
  type AskTopic,
  type AssignmentRule,
  type AssignmentRuleInput,
  type CrmAuditLine,
  type CrmBooking,
  type CrmMe,
  type CrmMember,
  type CrmNotification,
  type CrmRequest,
  type CrmReview,
  type CrmTeamName,
  type DbUsage,
  type DistributeMode,
  type DistributeRow,
  type DuplicateMatch,
  type HandoffInput,
  type LeadOverview,
  type MemberStats,
  type RequestOutcome,
  type SaveMemberInput,
} from "./team";
import type {
  EventInput,
  ImportOptions,
  ImportResult,
  LeadInput,
  LeadKind,
  LeadPitch,
  LeadStatus,
  OutreachEvent,
  OutreachLead,
  OutreachSettings,
} from "./types";

export const OUTREACH_LOCAL_KEY = "ideovent_outreach_v1";

/**
 * The e-mail signature Mehdi approved (30 Sep 2026): name, firm and place on
 * one line, the phone on the next; the engine puts "Regards," above it. Same
 * text as engine.ts DEFAULT_SIGNATURE.
 */
export const DEFAULT_SIGNATURE = [
  "Mehdi Alam, Ideovent Technologies, Saket, New Delhi",
  "+91 77619 21786",
].join("\n");

/** The four-line default before 30 Sep 2026: a settings row still carrying it reads as the new default. */
export const PREVIOUS_DEFAULT_SIGNATURE = [
  "Mehdi Alam",
  "Ideovent Technologies",
  "Saket, New Delhi",
  "+91 77619 21786",
].join("\n");

export const DEFAULT_OUTREACH_SETTINGS: OutreachSettings = {
  signature: DEFAULT_SIGNATURE,
  quietStart: "20:00",
  /* 10:00, when TRAI's window for commercial calls and messages opens (30 Sep 2026; it was 09:00). */
  quietEnd: "10:00",
  alertOnDemoOpen: true,
  alertEmail: "",
  autoAddDemos: true,
};

export interface OutreachStore {
  readonly mode: "local" | "supabase";
  /** The leads the caller may read in full, with the column mirrors filled in. Newest change first. */
  listLeads(): Promise<OutreachLead[]>;
  getLead(id: string): Promise<OutreachLead | null>;
  /** The whole-lead upsert: OWNER bulk flows only (Lead Finder, demo auto-lead). Everyone else: createLead / patchLead. */
  upsertLead(lead: LeadInput): Promise<OutreachLead>;
  /** Several leads in ONE write: all are saved, or none (owner clean-ups). */
  upsertLeads(leads: LeadInput[]): Promise<OutreachLead[]>;
  /** Deletes the lead and its events. Owner only: throws "Only Mehdi deletes leads" when nothing was deleted. */
  deleteLead(id: string): Promise<void>;
  /** All events the caller may read, newest first; only one lead's when leadId is given. With actorId. */
  listEvents(leadId?: string): Promise<OutreachEvent[]>;
  /** Returns the SERVER's row (its time and writer). A "sent" line should carry its template `stage`. */
  addEvent(event: EventInput): Promise<OutreachEvent>;
  getSettings(): Promise<OutreachSettings>;
  /** Owner only. */
  saveSettings(settings: Partial<OutreachSettings>): Promise<OutreachSettings>;
  /**
   * The lead sharing the phone (as phone or WhatsApp) or e-mail across the WHOLE
   * team, ignoring excludeId: whose it is and whether the caller may open it,
   * plus the lead itself as far as they may see it (see DuplicateMatch).
   */
  findDuplicate(q: { phone?: string; email?: string; excludeId?: string }): Promise<DuplicateMatch | null>;
  /** Rows from parseCsv (or any header-keyed objects). See mapCsvRow for columns. Owner only; ONE write. */
  importLeads(rows: Record<string, string>[], opts?: ImportOptions): Promise<ImportResult>;

  /* ── The team (0011) ─────────────────────────────────────────────────── */
  /** Who is signed in (crm_me). `legacy: true` when 0011 is not applied. */
  me(): Promise<CrmMe>;
  /** INSERT only, never an upsert. A member's lead is theirs and starts at New. */
  createLead(input: LeadInput): Promise<OutreachLead>;
  /** A server-side merge of only these keys; a key set to undefined (or null) is removed. */
  patchLead(id: string, patch: Partial<OutreachLead>): Promise<OutreachLead>;
  /** "Add to notes": one more line, appended on the server. */
  appendNotes(id: string, text: string): Promise<OutreachLead>;
  /** To a person, or (null) back to Unassigned. Owner and admins. Returns how many moved. */
  assignLeads(ids: string[], memberId: string | null): Promise<number>;
  distributeLeads(ids: string[], memberIds: string[], mode: DistributeMode, includeContacted?: boolean): Promise<DistributeRow[]>;
  applyRules(ids: string[], includeContacted?: boolean): Promise<DistributeRow[]>;
  /** "Hand to Mehdi". Returns the booking id when a slot was booked (phase 2), else null. */
  handoff(input: HandoffInput): Promise<number | null>;
  askOwner(leadId: string, topic: AskTopic, text: string): Promise<void>;
  /** Owner and admins: all; a member: their own. `open`: only those not resolved yet (oldest first). */
  listRequests(opts?: { open?: boolean }): Promise<CrmRequest[]>;
  resolveRequest(id: number, outcome: RequestOutcome, note?: string): Promise<void>;
  /** Turns the linked demo's public link on (draft to sent). Returns its slug. */
  publishLeadDemo(leadId: string, sentTo?: string): Promise<string>;
  /** Leads without contacts: every lead with See all (and for owner and admins); else the caller's hand-overs. */
  leadsOverview(): Promise<LeadOverview[]>;
  /** The demo records linked to the caller's leads, drafts included. */
  leadDemos(): Promise<DemoSite[]>;
  /** Opens of those demos (a member's Hot list). */
  demoOpens(sinceIso?: string): Promise<DemoSiteOpen[]>;
  activityStats(fromIso: string, toIso?: string): Promise<MemberStats[]>;
  teamNames(): Promise<CrmTeamName[]>;
  /** Owner and admins: everyone; anyone else: their own row. */
  listMembers(): Promise<CrmMember[]>;
  saveMember(input: SaveMemberInput): Promise<string>;
  linkLogins(): Promise<number>;
  deactivateMember(id: string, reassignTo: string | null): Promise<number>;
  reactivateMember(id: string): Promise<void>;
  deleteInvite(id: string): Promise<void>;
  /** Owner: the temporary password, shown once (local mode: simulated, there are no logins). */
  resetPassword(id: string): Promise<string>;
  passwordChanged(): Promise<void>;
  /** Owner: per person per India-time day. */
  accessSummary(fromIso: string, toIso?: string): Promise<AccessDay[]>;
  /** Owner: the raw audit lines behind the Access tab, newest first. */
  listAudit(fromIso?: string, toIso?: string, memberId?: string): Promise<CrmAuditLine[]>;
  /** Owner: the database's size (null when not known). */
  dbUsage(): Promise<DbUsage | null>;
  /** The caller's latest 50. */
  notifications(): Promise<CrmNotification[]>;
  markNotificationsRead(ids: number[]): Promise<void>;
  /** Fire and forget: never rejects. */
  logAccess(action: AccessAction, leadId?: string, detail?: Record<string, unknown>): Promise<void>;
  listReviews(): Promise<CrmReview[]>;
  addReview(eventId: string, verdict: "good" | "fix", comment?: string): Promise<void>;
  /* Phase 2. */
  busySlots(hostId?: string, days?: number): Promise<string[]>;
  setBooking(id: number, status: CrmBooking["status"], note?: string): Promise<void>;
  listRules(): Promise<AssignmentRule[]>;
  saveRule(rule: AssignmentRuleInput): Promise<void>;
  deleteRule(id: number): Promise<void>;
  /** Local mode only: act as this team member (null = Mehdi). */
  actAs?(memberId: string | null): void;
  /** Local mode only: who the store acts as (null = Mehdi). */
  actingAs?(): string | null;
}

/* ── Normalisation ───────────────────────────────────────────────────────── */

/**
 * "+91 98100 12345", "098100-12345", "9810012345", "+91-11-46571119",
 * "011-46508577" all become +91 followed by ten digits. A number that is not
 * recognisably Indian keeps its digits with a leading + (or undefined if it
 * has fewer than 7 digits).
 */
export function normalizePhone(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  // A cell can hold several numbers ("+91 98765 43210, 91234 56789"); the first one wins.
  const first = raw.split(/[,;/|]|\s+or\s+/i).map((x) => x.trim()).find((x) => /\d/.test(x)) || "";
  const hasPlus = first.startsWith("+");
  let d = first.replace(/\D/g, "");
  if (!d) return undefined;
  if (!hasPlus && d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("91")) return "+" + d;
  if (d.length === 11 && d.startsWith("0")) return "+91" + d.slice(1);
  if (d.length === 10 && !hasPlus) return "+91" + d;
  if (d.length < 7) return undefined;
  return "+" + d;
}

/** True for an Indian mobile (+91 then 6-9), the only kind WhatsApp reaches. */
export function isIndianMobile(phone?: string | null): boolean {
  const p = normalizePhone(phone);
  return Boolean(p && /^\+91[6-9]\d{9}$/.test(p));
}

export function normalizeEmail(raw?: string | null): string | undefined {
  const e = (raw || "").trim().toLowerCase().replace(/^mailto:/, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : undefined;
}

export function newOutreachId(prefix: "ol" | "oe" = "ol"): string {
  const rnd =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

const clean = (v?: string | null) => {
  const t = (v ?? "").trim();
  return t ? t : undefined;
};

/** Fills id/timestamps/status and normalises contact fields. Pure. */
export function prepareLead(input: LeadInput, existing?: OutreachLead | null, now = new Date()): OutreachLead {
  const iso = now.toISOString();
  const merged = { ...(existing || {}), ...input } as OutreachLead;
  return {
    ...merged,
    id: merged.id || newOutreachId("ol"),
    createdAt: existing?.createdAt || merged.createdAt || iso,
    updatedAt: iso,
    instituteName: (merged.instituteName || "").trim(),
    kind: merged.kind || "other",
    status: merged.status || "new",
    phone: normalizePhone(merged.phone),
    whatsapp: normalizePhone(merged.whatsapp),
    email: normalizeEmail(merged.email),
    contactName: clean(merged.contactName),
    city: clean(merged.city),
    website: clean(merged.website),
  };
}

/** The input without the column mirrors (assigneeId and friends): they are never written into a lead's data. */
export function stripMirrors<T extends object>(input: T): T {
  const out = { ...input } as Record<string, unknown>;
  for (const k of MIRROR_KEYS) delete out[k];
  return out as T;
}

/**
 * A patch normalised like prepareLead normalises a lead, but ONLY the keys it
 * carries: phone and WhatsApp to +91..., e-mail lower-cased, names and places
 * trimmed (empty means remove). The defaults prepareLead fills (kind, status,
 * timestamps) are never added: a patch changes what it names and nothing else.
 */
export function normalizePatch(patch: Partial<OutreachLead>): Partial<OutreachLead> {
  const out: Record<string, unknown> = { ...stripMirrors(patch || {}) };
  // Only text is normalised; anything else travels as it is, for the field guard to refuse.
  const has = (k: string) => Object.prototype.hasOwnProperty.call(out, k) && (out[k] == null || typeof out[k] === "string");
  for (const k of ["phone", "whatsapp"]) if (has(k)) out[k] = normalizePhone(out[k] as string);
  if (has("email")) out.email = normalizeEmail(out.email as string);
  for (const k of ["contactName", "city", "website"]) if (has(k)) out[k] = clean(out[k] as string);
  if (has("instituteName") && typeof out.instituteName === "string") out.instituteName = out.instituteName.trim();
  for (const [k, v] of Object.entries(out)) if (v === null) out[k] = undefined;
  return out as Partial<OutreachLead>;
}

/** True when a and b share a phone/WhatsApp number or an email. */
export function sameContact(lead: OutreachLead, q: { phone?: string; email?: string }): boolean {
  const phone = normalizePhone(q.phone);
  const email = normalizeEmail(q.email);
  if (phone && (normalizePhone(lead.phone) === phone || normalizePhone(lead.whatsapp) === phone)) return true;
  if (email && normalizeEmail(lead.email) === email) return true;
  return false;
}

/** Number of WhatsApp (or email) "sent" events on the same local calendar day as now. */
export function countSentToday(events: OutreachEvent[], channel: "whatsapp" | "email", now = new Date()): number {
  const day = now.toDateString();
  return events.filter(
    (e) => e.type === "sent" && e.channel === channel && new Date(e.at).toDateString() === day,
  ).length;
}

/* ── CSV import ──────────────────────────────────────────────────────────── */

/** RFC 4180 CSV (quoted fields, "" escapes, CRLF) into header-keyed rows. */
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^\uFEFF/, "");
  const table: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      table.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); table.push(row); }
  const rows = table.filter((r) => r.some((f) => f.trim() !== ""));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => { if (h) o[h] = (r[i] ?? "").trim(); });
    return o;
  });
}

/*
  Column aliases. The first names are LEAD-SHEET-TEMPLATE.csv's (also used by
  PROSPECTS-DELHI-NCR.csv and any LEADS-*.csv built from it); the rest let a
  plain hand-made sheet (name, phone, email, city, type) import too.
*/
const COLS = {
  instituteName: ["org_name", "institute_name", "institute", "school", "name", "organisation", "organization"],
  contactName: ["contact_name", "principal", "director", "contact"],
  phone: ["contact_phone", "phone", "mobile", "phone_number", "number"],
  whatsapp: ["whatsapp", "whatsapp_number"],
  whatsappOk: ["whatsapp_ok"],
  email: ["contact_email", "email", "email_address", "e_mail"],
  website: ["website_url", "website", "url", "site"],
  city: ["city_locality", "city", "locality", "area"],
  state: ["state"],
  source: ["source"],
  segment: ["segment", "kind", "type", "category"],
  websiteState: ["website_state"],
  pitch: ["pitch"],
  stage: ["stage", "status"],
  observation: ["buying_signal", "observation"],
  notes: ["notes", "note"],
  nextActionAt: ["next_action_date", "follow_up", "next_action_at"],
  lastContactedAt: ["last_touch_date", "last_contacted"],
  createdAt: ["date_added", "created"],
  demoUrl: ["demo_site_url", "demo_url", "demo"],
  pitchUrl: ["pitch_page_url", "pitch_url"],
  doNotContact: ["do_not_contact"],
  leadId: ["lead_id"],
  language: ["language"],
} as const;

function pick(row: Record<string, string>, names: readonly string[]): string | undefined {
  for (const n of names) {
    const v = row[n];
    if (v != null && v.trim() !== "") return v.trim();
  }
  return undefined;
}

/** A cell still holding the template's placeholder text, e.g. [[ORG_NAME]] or "A|B|C". */
function isPlaceholder(v?: string): boolean {
  if (!v) return true;
  return /\[\[.*\]\]/.test(v) || /^(YYYY-MM-DD|https?:\/\/|@handle|\+91 X+)$/i.test(v) || /^[A-Z_]+(\|[A-Z_]+)+$/.test(v);
}

const val = (v?: string) => (isPlaceholder(v) ? undefined : v);

/**
 * A segment that names a dental practice: DENTAL_SINGLE, DENTAL_MULTI,
 * DENTAL_COSMETIC, DENTAL_IMPLANT, DENTAL_ORTHO, DENTAL_KIDS, DENTAL_CHAIN (the
 * dental lead sheets, 28 Sep 2026), and the sales kit's CLINIC_DENTAL and
 * INTL_DENTAL. CLINIC_EYE is not dental.
 */
export function isDentalSegment(segment?: string): boolean {
  const s = (segment || "").trim().toUpperCase();
  return s.startsWith("DENTAL") || /(^|[_\s-])DENTAL([_\s-]|$)/.test(s);
}

/**
 * A type / kind / category cell that says dental: "dental", "dentist", "Dental
 * clinic" and close spellings, or a dental category as a Maps export writes it
 * ("Orthodontist", "Cosmetic dentist", "Oral surgeon"), read by looksDental.
 */
export function isDentalType(value?: string): boolean {
  const v = (value || "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!v) return false;
  return /^(dental( (clinic|clinics|care|centre|center|hospital|practice|surgery))?|dentists?|dental surgeon)$/.test(v) || looksDental(v);
}

/**
 * The lead kind of a row. In order (the dental CSV contract, 28 Sep 2026):
 *  1. a DENTAL segment, or a type / kind / category cell saying dental: dental;
 *  2. a SCHOOL or COACHING segment: that kind;
 *  3. a dental name ("Example Dental Clinic", "Example Smile Dental Care"): dental,
 *     checked BEFORE the school and coaching name rules, so "Example Dental
 *     Academy" is a clinic, not a coaching centre;
 *  4. the school and coaching name rules; else other.
 * `types` are the row's other kind-ish cells (kind, type, category), which the
 * segment column may have hidden.
 */
export function kindFrom(segment?: string, name?: string, types: Array<string | undefined> = []): LeadKind {
  const s = (segment || "").toUpperCase();
  if (isDentalSegment(segment) || [segment, ...types].some(isDentalType)) return "dental";
  if (s.startsWith("SCHOOL") || s === "SCHOOL") return "school";
  if (s.startsWith("COACHING") || s === "COACHING") return "coaching";
  if (looksDental(name)) return "dental";
  const n = (name || "").toLowerCase();
  if (/\b(school|vidyalaya|vidya mandir|academy school|convent|public school)\b/.test(n)) return "school";
  if (/\b(coaching|classes|tutorials?|institute|academy|ias|jee|neet)\b/.test(n)) return "coaching";
  return "other";
}

const STAGE_TO_STATUS: Record<string, LeadStatus> = {
  NEW: "new",
  ATTEMPTED: "contacted",
  CONTACTED: "contacted",
  PITCH_PAGE_SENT: "contacted",
  DEMO_SITE_SENT: "contacted",
  DEMO_SENT: "contacted",
  NURTURE: "contacted",
  ENGAGED: "replied",
  DISCOVERY_BOOKED: "call",
  DISCOVERY_DONE: "call",
  PROPOSAL_SENT: "proposal",
  NEGOTIATION: "proposal",
  WON: "won",
  LOST: "lost",
  DISQUALIFIED: "lost",
};

export function statusFrom(stage?: string, doNotContact?: string): LeadStatus {
  if (/^(yes|y|true|1)$/i.test((doNotContact || "").trim())) return "do_not_contact";
  const s = (stage || "").trim();
  if ((["new", "contacted", "replied", "demo_opened", "call", "proposal", "won", "lost", "do_not_contact"] as string[]).includes(s)) {
    return s as LeadStatus;
  }
  return STAGE_TO_STATUS[s.toUpperCase().replace(/[\s-]+/g, "_")] || "new";
}

/**
 * What to offer a row (ICP-AND-TARGETING.md 5.1, the dental 30 / 70 split): a
 * `pitch` cell (fix_website / new_website, or fix / new) wins; else the lead
 * sheet's `website_state`. NONE, SOCIAL_ONLY and DIRECTORY_ONLY have no site of
 * their own (a Practo or Facebook link is not one): a new website. BROKEN,
 * NOT_MOBILE, NO_ENQUIRY_FORM and DATED have one that fails a visitor on a
 * phone: fix it. GOOD, blank or anything else: no pitch.
 */
export function pitchFrom(pitch?: string, websiteState?: string): LeadPitch | undefined {
  const p = (pitch || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (p === "fix_website" || p === "fix") return "fix_website";
  if (p === "new_website" || p === "new") return "new_website";
  const s = (websiteState || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["NONE", "SOCIAL_ONLY", "DIRECTORY_ONLY"].includes(s)) return "new_website";
  if (["BROKEN", "NOT_MOBILE", "NO_ENQUIRY_FORM", "DATED"].includes(s)) return "fix_website";
  return undefined;
}

/** The last path segment of .../site/<slug> or .../<slug>. */
function slugFromUrl(url?: string, prefix?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (prefix && parts[0] === prefix) return parts[1];
    return prefix ? undefined : parts[parts.length - 1];
  } catch {
    return undefined;
  }
}

function dateIso(v?: string): string | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) return undefined;
  const d = new Date(v.length === 10 ? v + "T09:00:00+05:30" : v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * One CSV row to a lead input, or a reason it cannot be one. Pure, no ids.
 * The template's own example row (all placeholders) is skipped.
 */
/** "Other phone: ..." when a cell listed more than one number, so none is lost. */
function otherPhones(raw?: string): string | undefined {
  const rest = (raw || "").split(/[,;/|]|\s+or\s+/i).map((x) => x.trim()).filter((x) => /\d/.test(x)).slice(1);
  return rest.length ? `Other phone: ${rest.join(", ")}` : undefined;
}

export function mapCsvRow(row: Record<string, string>): { lead: LeadInput } | { skip: string } {
  const g = (k: keyof typeof COLS) => val(pick(row, COLS[k]));
  const instituteName = g("instituteName");
  if (!instituteName) return { skip: "no institute name (or the template's placeholder row)" };
  const phone = normalizePhone(g("phone"));
  const email = normalizeEmail(g("email"));
  const waCol = normalizePhone(g("whatsapp"));
  const waOk = /^(yes|y|true|1)$/i.test(pick(row, COLS.whatsappOk) || "");
  if (!phone && !email && !waCol) return { skip: `${instituteName}: no phone or email` };
  const segment = g("segment");
  const language = (g("language") || "").toLowerCase();
  const tags = [segment, pick(row, COLS.leadId)].filter((t): t is string => Boolean(t));
  const lead: LeadInput = {
    instituteName,
    kind: kindFrom(segment, instituteName, [row.kind, row.type, row.category].map(val)),
    contactName: g("contactName"),
    phone,
    whatsapp: waCol || (waOk ? phone : undefined),
    email,
    website: g("website"),
    pitch: pitchFrom(g("pitch"), g("websiteState")),
    city: g("city"),
    state: g("state"),
    source: g("source") || "CSV import",
    status: statusFrom(g("stage"), pick(row, COLS.doNotContact)),
    observation: g("observation"),
    notes: [g("notes"), otherPhones(g("phone"))].filter(Boolean).join("\n") || undefined,
    nextActionAt: dateIso(g("nextActionAt")),
    lastContactedAt: dateIso(g("lastContactedAt")),
    createdAt: dateIso(g("createdAt")),
    demoSlug: slugFromUrl(g("demoUrl"), "site"),
    pitchSlug: slugFromUrl(g("pitchUrl")),
    tags: tags.length ? tags : undefined,
    language: language === "en" || language === "hinglish" || language === "hi" ? language : undefined,
  };
  for (const k of Object.keys(lead) as (keyof LeadInput)[]) if (lead[k] === undefined) delete lead[k];
  return { lead };
}

/* ── Import template ───────────────────────────────────────────────────── */

/** Column order of the downloadable template: LEAD-SHEET-TEMPLATE order, then the extras. */
const TEMPLATE_ORDER: (keyof typeof COLS)[] = [
  "leadId", "createdAt", "source", "segment", "instituteName", "city", "state", "contactName",
  "phone", "whatsapp", "whatsappOk", "email", "website", "websiteState", "observation", "stage", "lastContactedAt",
  "nextActionAt", "pitchUrl", "demoUrl", "doNotContact", "language", "notes",
];

/** Header of the template: the first (LEAD-SHEET-TEMPLATE) name of every column mapCsvRow reads. */
export const LEAD_TEMPLATE_COLUMNS: string[] = TEMPLATE_ORDER.map((k) => COLS[k][0]);

/** The one example row. Clearly fictional: example.org and a made-up name. */
const TEMPLATE_EXAMPLE: Partial<Record<keyof typeof COLS, string>> = {
  source: "Example",
  segment: "SCHOOL_CBSE",
  instituteName: "Example Public School",
  city: "Saket, New Delhi",
  state: "Delhi",
  contactName: "Principal (example)",
  phone: "+91 98765 43210",
  whatsappOk: "YES",
  email: "office@example.org",
  website: "https://example.org",
  websiteState: "NO_ENQUIRY_FORM",
  observation: "Example: the enquiry form on their site does not send",
  stage: "NEW",
  doNotContact: "NO",
  language: "en",
  notes:
    "Example row. Replace it with your own leads, one per line. segment: SCHOOL_CBSE and other SCHOOL_ values, COACHING_ values, " +
    "or for a dental clinic DENTAL_SINGLE, DENTAL_MULTI, DENTAL_COSMETIC, DENTAL_IMPLANT, DENTAL_ORTHO, DENTAL_KIDS or DENTAL_CHAIN. " +
    "A plain sheet can use a type column instead: school, coaching or dental. " +
    "website_state: NONE, SOCIAL_ONLY or DIRECTORY_ONLY to offer a new website; BROKEN, NOT_MOBILE, NO_ENQUIRY_FORM or DATED to offer to fix theirs.",
};

/**
 * The CSV the Import tab offers as "Download import template": every column
 * the importer understands and ONE fictional example row. CSV has no comment
 * syntax, so the guidance lives in the file name, the Import tab's hint and
 * the example row's notes, which list every segment the importer reads as a
 * kind, dental included (e.g. DENTAL_SINGLE for "Example Dental Clinic").
 */
export function leadImportTemplateCsv(): string {
  const q = (v: string) => (/[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
  const row = TEMPLATE_ORDER.map((k) => q(TEMPLATE_EXAMPLE[k] || ""));
  return LEAD_TEMPLATE_COLUMNS.join(",") + "\r\n" + row.join(",") + "\r\n";
}

/** Existing lead with its EMPTY fields filled from the incoming one (never overwrites). */
export function fillEmpty(existing: OutreachLead, incoming: LeadInput): LeadInput {
  const out: Record<string, unknown> = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    const cur = out[k];
    if ((cur === undefined || cur === "" || (Array.isArray(cur) && !cur.length)) && v !== undefined) out[k] = v;
  }
  return out as LeadInput;
}

/**
 * Shared import algorithm, PURE: nothing is saved here. It returns the result
 * to show and every lead to write, fully prepared (ids, timestamps,
 * normalised contacts), so each store can save the whole file in ONE write.
 *
 * WHY ONE WRITE (27 Sep 2026). The import used to save row by row. Leaving the
 * page mid-import stopped it at 23 of 30 and left a partial import behind.
 * Now either every row is saved or, if the single write fails, none is.
 *
 * Duplicates are matched against existing leads AND earlier rows of the same file.
 */
export function planImport(
  rows: Record<string, string>[],
  existing: OutreachLead[],
  opts: ImportOptions = {},
  now = new Date(),
): { result: ImportResult; toSave: OutreachLead[] } {
  const result: ImportResult = { added: [], duplicates: [], skipped: [] };
  const known = [...existing];
  const toSave = new Map<string, OutreachLead>();
  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2; // 1-based, after the header line
    const mapped = mapCsvRow(rows[i]);
    if ("skip" in mapped) { result.skipped.push({ row: rowNo, reason: mapped.skip }); continue; }
    const l = mapped.lead;
    const dup = known.find(
      (k) => sameContact(k, { phone: l.phone, email: l.email }) || (l.whatsapp && sameContact(k, { phone: l.whatsapp })),
    );
    if (dup) {
      result.duplicates.push({ row: rowNo, instituteName: l.instituteName, existingId: dup.id });
      if (opts.onDuplicate === "merge") {
        const saved = prepareLead({ ...fillEmpty(dup, l), id: dup.id }, dup, now);
        known[known.indexOf(dup)] = saved;
        toSave.set(saved.id, saved);
        const j = result.added.findIndex((a) => a.id === saved.id);
        if (j >= 0) result.added[j] = saved;
      }
      continue;
    }
    const saved = prepareLead(l, null, now);
    known.push(saved);
    toSave.set(saved.id, saved);
    result.added.push(saved);
  }
  return { result, toSave: [...toSave.values()] };
}

const byUpdatedDesc = (a: OutreachLead, b: OutreachLead) => (b.updatedAt || "").localeCompare(a.updatedAt || "");
const byAtDesc = (a: OutreachEvent, b: OutreachEvent) => (b.at || "").localeCompare(a.at || "");

function prepareEvent(e: EventInput, now = new Date()): OutreachEvent {
  return { ...e, id: e.id || newOutreachId("oe"), at: e.at || now.toISOString() } as OutreachEvent;
}

function mergeSettings(s?: Partial<OutreachSettings> | null): OutreachSettings {
  const m = { ...DEFAULT_OUTREACH_SETTINGS, ...(s || {}) };
  if (!m.signature || m.signature.trim() === PREVIOUS_DEFAULT_SIGNATURE) m.signature = DEFAULT_SIGNATURE;
  /* Every row saved before 30 Sep 2026 carries the old default end of quiet
     hours, 09:00, which nobody chose: it reads as the new default, 10:00.
     Any other time Mehdi sets is kept. */
  if (/^0?9:00$/.test((m.quietEnd || "").trim())) m.quietEnd = DEFAULT_OUTREACH_SETTINGS.quietEnd;
  /* Blank, 0, or anything that is not a positive number: no limit. The retired
     whatsappDailyCap (a forced 10 on every old row) is never read. */
  const lim = Number(m.whatsappDailyLimit);
  if (Number.isFinite(lim) && lim > 0) m.whatsappDailyLimit = Math.floor(lim);
  else delete m.whatsappDailyLimit;
  if (typeof m.autoAddDemos !== "boolean") m.autoAddDemos = true;
  return m;
}

/* ── Local implementation ────────────────────────────────────────────────── */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** The CMS's local snapshot (src/lib/cms/localStore.ts), where local mode keeps the demo records. */
const CMS_LOCAL_KEY = "ideovent_cms_v1";

/**
 * Local mode's demo records, read from (and, for "turn the link on", written
 * to) the CMS snapshot in the same storage. Only demoSites and demoSiteSlots
 * are ever rewritten; every other key of the snapshot stays as it was, and
 * the CMS store re-reads a snapshot another writer changed (its sync()).
 */
export function cmsSnapshotAccess(storage: StorageLike): LocalCmsAccess {
  const parse = (): Record<string, unknown> => {
    try {
      const raw = storage.getItem(CMS_LOCAL_KEY);
      const p = raw ? JSON.parse(raw) : {};
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  };
  const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    read(): LocalCms {
      const p = parse();
      return { demoSites: list(p.demoSites), demoSiteSlots: list(p.demoSiteSlots), demoSiteOpens: list(p.demoSiteOpens) };
    },
    write(next) {
      const p = parse();
      p.demoSites = next.demoSites;
      p.demoSiteSlots = next.demoSiteSlots;
      storage.setItem(CMS_LOCAL_KEY, JSON.stringify(p));
    },
  };
}

export interface LocalStoreOptions {
  /** Where the demo records live (default: the CMS snapshot in the same storage). */
  cms?: LocalCmsAccess;
  /** The clock (tests). */
  now?: () => Date;
}

function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function defaultStorage(): StorageLike {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem(OUTREACH_LOCAL_KEY);
      return localStorage;
    }
  } catch {
    /* private window or blocked storage: fall through to memory */
  }
  return memoryStorage();
}

/**
 * LOCAL MODE: everything in one JSON object under ideovent_outreach_v1. Since
 * 0011 it also holds the team (members, requests, the bell, the audit trail),
 * and every method runs as the acting person (localStorage
 * "ideovent_crm_local_actor"; missing = Mehdi) through the rules of
 * ./localTeam.ts, the same rules as the database. Mehdi with no team behaves
 * exactly as before. Every write is ONE storage write, made only when the
 * operation succeeded, so a refused change leaves nothing behind.
 */
export class LocalOutreachStore implements OutreachStore {
  readonly mode = "local" as const;
  private storage: StorageLike;
  private cms: LocalCmsAccess;
  private clock: () => Date;

  constructor(storage?: StorageLike, opts: LocalStoreOptions = {}) {
    this.storage = storage || defaultStorage();
    this.cms = opts.cms || cmsSnapshotAccess(this.storage);
    this.clock = opts.now || (() => new Date());
  }

  private read(): LocalData {
    try {
      const raw = this.storage.getItem(OUTREACH_LOCAL_KEY);
      const p = raw ? (JSON.parse(raw) as Partial<LocalData>) : {};
      return {
        leads: Array.isArray(p.leads) ? p.leads : [],
        events: Array.isArray(p.events) ? p.events : [],
        settings: p.settings || null,
        team: normalizeTeam(p.team),
      };
    } catch {
      return { leads: [], events: [], settings: null, team: normalizeTeam(null) };
    }
  }

  private write(d: LocalData): void {
    this.storage.setItem(OUTREACH_LOCAL_KEY, JSON.stringify(d));
  }

  /** Who this store acts as: a team member id, or null for Mehdi. */
  actingAs(): string | null {
    try {
      return (this.storage.getItem(LOCAL_ACTOR_KEY) || "").trim() || null;
    } catch {
      return null;
    }
  }

  /** Act as this team member from now on (null = Mehdi). The CRM's "Act as" menu, and the e2e suites. */
  actAs(memberId: string | null): void {
    if (memberId) this.storage.setItem(LOCAL_ACTOR_KEY, memberId);
    else if (this.storage.removeItem) this.storage.removeItem(LOCAL_ACTOR_KEY);
    else this.storage.setItem(LOCAL_ACTOR_KEY, "");
  }

  /**
   * One operation as the acting person over one read of the data. `write`:
   * true to save afterwards, false for a read, or a function of the result.
   * Nothing is saved when the operation throws.
   */
  private run<T>(fn: (t: LocalCrm) => T, write: boolean | ((result: T, t: LocalCrm) => boolean) = true): T {
    const d = this.read();
    const t = new LocalCrm(d, this.actingAs(), this.clock(), this.cms);
    const result = fn(t);
    if (typeof write === "function" ? write(result, t) : write) this.write(d);
    return result;
  }

  async listLeads() {
    return this.run((t) => t.listLeads(), false);
  }

  async getLead(id: string) {
    return this.run((t) => t.getLead(id), false);
  }

  /** One lead through the whole-lead upsert, merged over the stored one (the old save). */
  private upsertOne(t: LocalCrm, input: LeadInput): OutreachLead {
    const prev = input.id ? t.lead(input.id) : undefined;
    return t.upsert(prepareLead(stripMirrors(input), prev || null, t.now));
  }

  async upsertLead(input: LeadInput) {
    return this.run((t) => this.upsertOne(t, input));
  }

  async upsertLeads(inputs: LeadInput[]) {
    if (!inputs.length) return [];
    return this.run((t) => inputs.map((input) => this.upsertOne(t, input)));
  }

  async deleteLead(id: string) {
    this.run((t) => t.deleteLead(id));
  }

  async listEvents(leadId?: string) {
    return this.run((t) => t.listEvents(leadId), false);
  }

  async addEvent(input: EventInput) {
    return this.run((t) => t.addEvent(prepareEvent(input, t.now)));
  }

  async getSettings() {
    return this.run((t) => mergeSettings(t.me.role ? t.d.settings : null), false);
  }

  async saveSettings(s: Partial<OutreachSettings>) {
    return this.run((t) => {
      t.checkSettingsWrite();
      const next = mergeSettings({ ...(t.d.settings || {}), ...s });
      t.d.settings = next;
      return next;
    });
  }

  async findDuplicate(q: { phone?: string; email?: string; excludeId?: string }) {
    return this.run(
      (t) => t.findDuplicate({ phone: normalizePhone(q.phone), email: normalizeEmail(q.email), excludeId: q.excludeId }),
      (_hit, t) => Boolean(t.me.role) && t.me.role !== "owner",
    );
  }

  /** The whole file in ONE storage write: all rows are saved, or none. */
  async importLeads(rows: Record<string, string>[], opts?: ImportOptions) {
    const out = this.run(
      (t) => {
        const { result, toSave } = planImport(rows, t.listLeads(), opts, t.now);
        for (const l of toSave) t.upsert(l);
        return { result, saved: toSave.length };
      },
      (r) => r.saved > 0,
    );
    return out.result;
  }

  /* ── The team ──────────────────────────────────────────────────────────── */

  /** crm_me, locally. Acting as someone for the first time is their first sign-in (the login links). */
  async me(): Promise<CrmMe> {
    return this.run(
      (t) => ({ me: t.me, changed: t.signIn() }),
      (r) => r.changed,
    ).me;
  }

  async createLead(input: LeadInput) {
    return this.run((t) => t.createLead(prepareLead(stripMirrors(input), null, t.now)));
  }

  async patchLead(id: string, patch: Partial<OutreachLead>) {
    return this.run((t) => t.patchLead(id, normalizePatch(patch)));
  }

  async appendNotes(id: string, text: string) {
    return this.run((t) => t.appendNotes(id, text));
  }

  async assignLeads(ids: string[], memberId: string | null) {
    return this.run((t) => t.assignLeads(ids, memberId));
  }

  async distributeLeads(ids: string[], memberIds: string[], mode: DistributeMode, includeContacted = false) {
    return this.run((t) => t.distributeLeads(ids, memberIds, mode, includeContacted));
  }

  async applyRules(ids: string[], includeContacted = false) {
    return this.run((t) => t.applyRules(ids, includeContacted));
  }

  async handoff(input: HandoffInput) {
    return this.run((t) => t.handoff(input));
  }

  async askOwner(leadId: string, topic: AskTopic, text: string) {
    this.run((t) => t.askOwner(leadId, topic, text));
  }

  async listRequests(opts: { open?: boolean } = {}) {
    return this.run((t) => t.listRequests(opts), false);
  }

  async resolveRequest(id: number, outcome: RequestOutcome, note?: string) {
    this.run((t) => t.resolveRequest(id, outcome, note));
  }

  async publishLeadDemo(leadId: string, sentTo?: string) {
    return this.run((t) => t.publishLeadDemo(leadId, sentTo));
  }

  async leadsOverview() {
    return this.run((t) => t.leadsOverview(), false);
  }

  async leadDemos() {
    return this.run((t) => t.leadDemos(), false);
  }

  async demoOpens(sinceIso?: string) {
    return this.run((t) => t.demoOpens(sinceIso), false);
  }

  async activityStats(fromIso: string, toIso?: string) {
    return this.run((t) => t.activityStats(fromIso, toIso), false);
  }

  async teamNames() {
    return this.run((t) => t.teamNames(), false);
  }

  async listMembers() {
    return this.run((t) => t.listMembers(), false);
  }

  async saveMember(input: SaveMemberInput) {
    return this.run((t) => t.saveMember(input));
  }

  async linkLogins() {
    return this.run((t) => t.linkLogins(), false);
  }

  async deactivateMember(id: string, reassignTo: string | null) {
    return this.run((t) => t.deactivateMember(id, reassignTo));
  }

  async reactivateMember(id: string) {
    this.run((t) => t.reactivateMember(id));
  }

  async deleteInvite(id: string) {
    this.run((t) => t.deleteInvite(id));
  }

  async resetPassword(id: string) {
    return this.run((t) => t.resetPassword(id));
  }

  async passwordChanged() {
    this.run((t) => t.passwordChanged());
  }

  async accessSummary(fromIso: string, toIso?: string) {
    return this.run((t) => t.accessSummary(fromIso, toIso), false);
  }

  async listAudit(fromIso?: string, toIso?: string, memberId?: string) {
    return this.run((t) => t.listAudit(fromIso, toIso, memberId), false);
  }

  /** The owner: how much this browser holds (the CRM's data, and with the CMS snapshot). */
  async dbUsage(): Promise<DbUsage | null> {
    const owner = this.run((t) => t.me.role === "owner", false);
    if (!owner) return null;
    const size = (k: string) => {
      try {
        return new TextEncoder().encode(this.storage.getItem(k) || "").length;
      } catch {
        return 0;
      }
    };
    const crmBytes = size(OUTREACH_LOCAL_KEY);
    return { databaseBytes: crmBytes + size(CMS_LOCAL_KEY), crmBytes };
  }

  async notifications() {
    return this.run((t) => t.notifications(), false);
  }

  async markNotificationsRead(ids: number[]) {
    this.run((t) => t.markNotificationsRead(ids));
  }

  async logAccess(action: AccessAction, leadId?: string, detail?: Record<string, unknown>) {
    try {
      this.run((t) => t.logAccess(action, leadId, detail || {}));
    } catch {
      /* fire and forget: a refused log line (no access, budget) never breaks a screen */
    }
  }

  async listReviews() {
    return this.run((t) => t.listReviews(), false);
  }

  async addReview(eventId: string, verdict: "good" | "fix", comment?: string) {
    this.run((t) => t.addReview(eventId, verdict, comment));
  }

  async busySlots(hostId?: string, days?: number) {
    return this.run((t) => t.busySlots(hostId, days), false);
  }

  async setBooking(id: number, status: CrmBooking["status"], note?: string) {
    this.run((t) => t.setBooking(id, status, note));
  }

  async listRules() {
    return this.run((t) => t.listRules(), false);
  }

  async saveRule(rule: AssignmentRuleInput) {
    this.run((t) => t.saveRule(rule));
  }

  async deleteRule(id: number) {
    this.run((t) => t.deleteRule(id));
  }
}

/* ── Supabase implementation ─────────────────────────────────────────────── */

const T_LEADS = "outreach_leads";
const T_EVENTS = "outreach_events";
const T_SETTINGS = "outreach_settings";
const SETTINGS_ID = "default";
/* PostgREST caps a response at the project's max rows (1000) silently, so page. */
const PAGE = 1000;
/** A lead with the columns 0011 added (who works it, who added it, when it closed). */
const LEAD_COLS = "id, data, assigned_to, assigned_at, assigned_by, created_by, qualified_by, closed_at";
/** A history line with its writer (stamped by the server). */
const EVENT_COLS = "id, data, actor_id, created_at";

async function sb() {
  const { supabase } = await import("@/lib/cms/client");
  return supabase();
}

type SbError = { code?: string; message?: string; details?: string; hint?: string } | null | undefined;

function fail(what: string, error: SbError): never {
  throw new Error(`Outreach: could not ${what}. ${error?.message || ""}`.trim());
}

/** SQLSTATEs the database raises on purpose (the guards, RLS, the team functions). */
const CRM_CODES = new Set(["42501", "P0002", "23505", "22023", "23514", "22001", "54000"]);

/** A refusal by the database becomes a CrmAccessError with the sentence a person reads; anything else, as before. */
function crmFail(what: string, error: SbError): never {
  if (error && (CRM_CODES.has(error.code || "") || /^crm: /.test(error.message || ""))) {
    throw new CrmAccessError(error.code || "42501", crmErrorText(error));
  }
  fail(what, error);
}

/** PostgREST cannot find the function: 0011 is not applied ("legacy"). */
function missingFunction(error: SbError, status?: number): boolean {
  return error?.code === "PGRST202" || status === 404 || /could not find the function/i.test(error?.message || "");
}

/** A select naming a 0011 column the table does not have yet. */
function missingColumn(error: SbError): boolean {
  return error?.code === "42703" || /column .* does not exist/i.test(error?.message || "");
}

const NEEDS_0011 = "This needs the team update of the database (0011). Ask Mehdi.";
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);

interface LeadRow {
  id: string;
  data: Partial<OutreachLead> | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  assigned_by?: string | null;
  created_by?: string | null;
  qualified_by?: string | null;
  closed_at?: string | null;
}

const LEAD_STATUS_SET = new Set<string>(LEAD_VALUES.status);
const LEAD_KIND_SET = new Set<string>(LEAD_VALUES.kind);

/**
 * A lead's stored data made safe for every screen, which reads each field as
 * text and tags as a list of texts. A value of another type (an old row, or
 * any writer other than the app) is dropped instead of breaking a page for
 * everyone; the name falls back to "", an unknown stage to New and an unknown
 * kind to Other. Since 0011 the database refuses such values from anyone but
 * Mehdi; this covers what was written before, and whatever comes next.
 */
export function cleanLeadData(raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (k === "tags") {
        if (Array.isArray(v)) out.tags = v.filter((t) => typeof t === "string");
      } else if (typeof v === "string") out[k] = v;
    }
  }
  if (typeof out.instituteName !== "string") out.instituteName = "";
  if (!LEAD_STATUS_SET.has(out.status as string)) out.status = "new";
  if (!LEAD_KIND_SET.has(out.kind as string)) out.kind = "other";
  return out;
}

/** A history line's stored data made safe the same way: text only; a line with no type is a note. */
export function cleanEventData(raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
  }
  if (!out.type) out.type = "note";
  return out;
}

/** A row of outreach_leads to a lead, its columns as the mirrors (assigneeId...). */
function leadFromRow(r: LeadRow): OutreachLead {
  const lead = { ...stripMirrors(cleanLeadData(r.data) as unknown as OutreachLead), id: r.id };
  if (r && "assigned_to" in r) {
    lead.assigneeId = r.assigned_to ?? null;
    if (r.assigned_at) lead.assignedAt = iso(r.assigned_at);
    if (r.assigned_by) lead.assignedById = r.assigned_by;
    if (r.created_by) lead.createdById = r.created_by;
    if (r.qualified_by) lead.qualifiedById = r.qualified_by;
    if (r.closed_at) lead.closedAt = iso(r.closed_at);
  }
  return lead;
}

interface EventRow {
  id: string;
  data: Partial<OutreachEvent> | null;
  actor_id?: string | null;
  created_at?: string | null;
}

function eventFromRow(r: EventRow): OutreachEvent {
  const e = { ...cleanEventData(r.data), id: r.id } as unknown as OutreachEvent;
  if (!e.at && r.created_at) e.at = iso(r.created_at) as string;
  if (r.actor_id) e.actorId = r.actor_id;
  else delete e.actorId;
  return e;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : String(v));
const num = (v: unknown) => Number(v) || 0;

/** crm_me's answer to a CrmMe. */
function meFromJson(j: Row | null | undefined): CrmMe {
  if (!j || !j.role) {
    const reason = (j?.reason as CrmMe["reason"]) || "not_a_member";
    return noAccessMe(reason, str(j?.displayName) || "");
  }
  return {
    legacy: false,
    memberId: str(j.memberId) || null,
    role: j.role as CrmMe["role"],
    email: str(j.email),
    displayName: str(j.displayName) || "",
    viewAll: Boolean(j.viewAll),
    canAddLeads: Boolean(j.canAddLeads),
    mayColdCall: Boolean(j.mayColdCall),
    waDailyLimit: j.waDailyLimit === null || j.waDailyLimit === undefined ? null : Number(j.waDailyLimit),
    newLeadCap: num(j.newLeadCap),
    targets: (j.targets as CrmMe["targets"]) || {},
    senderName: str(j.senderName),
    senderPhone: str(j.senderPhone),
    senderChecked: Boolean(j.senderChecked),
    signature: str(j.signature),
    hostWhatsapp: str(j.hostWhatsapp),
    mustChangePassword: Boolean(j.mustChangePassword),
  };
}

function memberFromRow(r: Row): CrmMember {
  return {
    id: String(r.id),
    userId: str(r.user_id) || null,
    email: str(r.email),
    displayName: str(r.display_name) || "",
    role: r.role as CrmMember["role"],
    viewAll: Boolean(r.view_all),
    canAddLeads: Boolean(r.can_add_leads),
    mayColdCall: Boolean(r.may_cold_call),
    waDailyLimit: r.wa_daily_limit === null || r.wa_daily_limit === undefined ? null : Number(r.wa_daily_limit),
    newLeadCap: num(r.new_lead_cap),
    targets: (r.targets as CrmMember["targets"]) || {},
    senderName: str(r.sender_name),
    senderPhone: str(r.sender_phone),
    senderCheckedAt: iso(r.sender_checked_at),
    signature: str(r.signature),
    active: Boolean(r.active),
    mustChangePassword: Boolean(r.must_change_password),
    joinedAt: iso(r.joined_at),
    lastSeenAt: iso(r.last_seen_at),
    deactivatedAt: iso(r.deactivated_at),
    createdAt: iso(r.created_at) || "",
  };
}

function requestFromRow(r: Row): CrmRequest {
  return {
    id: num(r.id),
    leadId: String(r.lead_id),
    kind: r.kind as CrmRequest["kind"],
    askedBy: str(r.asked_by),
    hostId: str(r.host_id),
    body: str(r.body),
    createdAt: iso(r.created_at) || "",
    resolvedAt: iso(r.resolved_at),
    resolvedBy: str(r.resolved_by),
    outcome: str(r.outcome) as CrmRequest["outcome"],
    outcomeNote: str(r.outcome_note),
  };
}

function notificationFromRow(r: Row): CrmNotification {
  return {
    id: num(r.id),
    kind: r.kind as CrmNotification["kind"],
    title: String(r.title || ""),
    leadId: str(r.lead_id),
    actorId: str(r.actor_id),
    createdAt: iso(r.created_at) || "",
    readAt: iso(r.read_at),
  };
}

function statsFromRow(r: Row): MemberStats {
  return {
    memberId: String(r.member_id),
    displayName: String(r.display_name || ""),
    role: r.role as MemberStats["role"],
    active: Boolean(r.active),
    firstWhatsapp: num(r.first_whatsapp),
    firstEmail: num(r.first_email),
    followUps: num(r.follow_ups),
    calls: num(r.calls),
    callsConnected: num(r.calls_connected),
    replies: num(r.replies),
    handoffs: num(r.handoffs),
    notes: num(r.notes),
    unansweredFirstWhatsapp: num(r.unanswered_first_whatsapp),
    openLeads: num(r.open_leads),
    newLeads: num(r.new_leads),
    overdue: num(r.overdue),
    untouched: num(r.untouched),
    wonCredited: num(r.won_credited),
    handoffsConfirmed: num(r.handoffs_confirmed),
    lastActiveAt: iso(r.last_active_at),
    lastSeenAt: iso(r.last_seen_at),
  };
}

function overviewFromRow(r: Row): LeadOverview {
  return {
    id: String(r.id),
    instituteName: String(r.institute_name || ""),
    kind: (r.kind as LeadOverview["kind"]) || "other",
    city: str(r.city),
    status: (r.status as LeadOverview["status"]) || "new",
    assigneeId: str(r.assigned_to) || null,
    assigneeName: str(r.assignee_name),
    qualifiedById: str(r.qualified_by) || null,
    createdAt: str(r.created_at),
    updatedAt: iso(r.updated_at),
    nextActionAt: str(r.next_action_at),
    lastContactedAt: str(r.last_contacted_at),
  };
}

function accessFromRow(r: Row): AccessDay {
  return {
    memberId: String(r.member_id),
    displayName: String(r.display_name || ""),
    day: String(r.day || "").slice(0, 10),
    leadViews: num(r.lead_views),
    distinctLeadsViewed: num(r.distinct_leads_viewed),
    leadsWorked: num(r.leads_worked),
    contactChanges: num(r.contact_changes),
    exports: num(r.exports),
    imports: num(r.imports),
    signIns: num(r.sign_ins),
    viewsOffHours: num(r.views_off_hours),
    flaggedClaims: num(r.flagged_claims),
    suspicious: Boolean(r.suspicious),
  };
}

function reviewFromRow(r: Row): CrmReview {
  return {
    id: num(r.id),
    eventId: String(r.event_id),
    leadId: String(r.lead_id),
    memberId: String(r.member_id),
    reviewerId: str(r.reviewer_id),
    verdict: r.verdict as CrmReview["verdict"],
    comment: str(r.comment),
    createdAt: iso(r.created_at) || "",
  };
}

function ruleFromRow(r: Row): AssignmentRule {
  return {
    id: num(r.id),
    name: String(r.name || ""),
    kind: (r.kind as AssignmentRule["kind"]) || null,
    city: str(r.city) || null,
    memberIds: Array.isArray(r.member_ids) ? (r.member_ids as string[]) : [],
    priority: num(r.priority),
    active: Boolean(r.active),
    nextIndex: num(r.next_index),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function auditFromRow(r: Row): CrmAuditLine {
  return {
    id: num(r.id),
    at: iso(r.at) || "",
    actorId: str(r.actor_id) || null,
    action: String(r.action || ""),
    leadId: str(r.lead_id) || null,
    memberId: str(r.member_id) || null,
    detail: (r.detail as Record<string, unknown>) || {},
  };
}

function distributeFromRows(rows: Row[] | null): DistributeRow[] {
  return (rows || []).map((r) => ({ memberId: str(r.member_id) || null, assigned: num(r.assigned) }));
}

/** A setof row (PostgREST answers an array) or a single one. */
const firstRow = <T>(data: T | T[] | null): T | undefined => (Array.isArray(data) ? data[0] : data || undefined);

/**
 * PRODUCTION. Reads and writes through PostgREST as the signed-in person, so
 * row security and the guards of 0011 decide what they see and change. The
 * first crm_me() tells whether 0011 is applied; until it is ("legacy"), every
 * read selects `id, data` as before, saves are whole-lead upserts as before,
 * and the team functions answer empty (reads) or refuse (writes), so the code
 * can ship before or after the migration.
 */
export class SupabaseOutreachStore implements OutreachStore {
  readonly mode = "supabase" as const;
  /** Whether 0011 is NOT applied: null until crm_me (or a select) has said. */
  private legacy: boolean | null = null;
  private lastMe: CrmMe | null = null;

  /** Once per session: crm_me exists (0011) or not (legacy). */
  private async isLegacy(): Promise<boolean> {
    if (this.legacy === null) {
      try {
        await this.me();
      } catch {
        /* not known yet: the reads try the new columns and fall back */
      }
    }
    return this.legacy === true;
  }

  /** Every row of a table, paged (PostgREST caps a response at 1,000 rows). Throws the raw error. */
  private async pages<R>(table: string, cols: string, order: string, filter?: { col: string; val: string }): Promise<R[]> {
    const client = await sb();
    const out: R[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = client.from(table).select(cols).order(order, { ascending: false }).order("id");
      if (filter) q = q.eq(filter.col, filter.val);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = (data || []) as R[];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    return out;
  }

  /** Rows with the 0011 columns, or, when the table has none yet, as before (and legacy from then on). */
  private async rowsOf<R>(table: string, cols: string, order: string, filter?: { col: string; val: string }): Promise<R[]> {
    const legacy = await this.isLegacy();
    try {
      return await this.pages<R>(table, legacy ? "id, data" : cols, order, filter);
    } catch (e) {
      if (legacy || !missingColumn(e as SbError)) fail(`read ${table}`, e as SbError);
      this.legacy = true;
      try {
        return await this.pages<R>(table, "id, data", order, filter);
      } catch (e2) {
        fail(`read ${table}`, e2 as SbError);
      }
    }
  }

  async listLeads() {
    return (await this.rowsOf<LeadRow>(T_LEADS, LEAD_COLS, "updated_at")).map(leadFromRow).sort(byUpdatedDesc);
  }

  async getLead(id: string) {
    const legacy = await this.isLegacy();
    const { data, error } = await (await sb()).from(T_LEADS).select(legacy ? "id, data" : LEAD_COLS).eq("id", id).maybeSingle();
    if (error) fail("read the lead", error);
    return data ? leadFromRow(data as unknown as LeadRow) : null;
  }

  /** Owner bulk flows: the whole lead, merged over the stored one. */
  async upsertLead(input: LeadInput) {
    const prev = input.id ? await this.getLead(input.id) : null;
    const lead = prepareLead(stripMirrors(input), prev);
    const { error } = await (await sb())
      .from(T_LEADS)
      .upsert({ id: lead.id, data: stripMirrors(lead), updated_at: lead.updatedAt }, { onConflict: "id" });
    if (error) crmFail("save the lead", error);
    return lead;
  }

  async upsertLeads(inputs: LeadInput[]) {
    if (!inputs.length) return [];
    const before = new Map((await this.listLeads()).map((l) => [l.id, l]));
    const saved = inputs.map((input) => prepareLead(stripMirrors(input), input.id ? before.get(input.id) : null));
    const { error } = await (await sb())
      .from(T_LEADS)
      .upsert(saved.map((l) => ({ id: l.id, data: stripMirrors(l), updated_at: l.updatedAt })), { onConflict: "id" });
    if (error) crmFail(`save the ${saved.length} leads (nothing was saved)`, error);
    return saved;
  }

  /**
   * Since 0011 the history goes with the lead (a foreign key), and only Mehdi
   * deletes: anyone else deletes 0 rows, which is refused out loud. For Mehdi,
   * 0 rows means it was already gone.
   */
  async deleteLead(id: string) {
    const client = await sb();
    if (await this.isLegacy()) {
      const ev = await client.from(T_EVENTS).delete().eq("lead_id", id);
      if (ev.error) fail("delete the history of the lead", ev.error);
      const { error } = await client.from(T_LEADS).delete().eq("id", id);
      if (error) fail("delete the lead", error);
      return;
    }
    const { data, error } = await client.from(T_LEADS).delete().eq("id", id).select("id");
    if (error) crmFail("delete the lead", error);
    if (!data || !(data as unknown[]).length) {
      const me = this.lastMe || (await this.me());
      if (me.role !== "owner") throw new CrmAccessError("42501", "Only Mehdi deletes leads");
    }
  }

  async listEvents(leadId?: string) {
    const f = leadId ? { col: "lead_id", val: leadId } : undefined;
    return (await this.rowsOf<EventRow>(T_EVENTS, EVENT_COLS, "created_at", f)).map(eventFromRow).sort(byAtDesc);
  }

  /** The server stamps the writer and the time (0011): the row it answers is the truth. */
  async addEvent(input: EventInput) {
    const e = prepareEvent(input);
    const data = { ...e } as Partial<OutreachEvent>;
    delete data.actorId;
    if (await this.isLegacy()) {
      const { error } = await (await sb()).from(T_EVENTS).insert({ id: e.id, lead_id: e.leadId, data, created_at: e.at });
      if (error) fail("record the event", error);
      return e;
    }
    const res = await (await sb()).from(T_EVENTS).insert({ id: e.id, lead_id: e.leadId, data }).select(EVENT_COLS).single();
    if (res.error) crmFail("record the event", res.error);
    return res.data ? eventFromRow(res.data as unknown as EventRow) : e;
  }

  async getSettings() {
    const { data, error } = await (await sb()).from(T_SETTINGS).select("data").eq("id", SETTINGS_ID).maybeSingle();
    if (error) fail("read outreach settings", error);
    return mergeSettings((data?.data as Partial<OutreachSettings>) || null);
  }

  async saveSettings(s: Partial<OutreachSettings>) {
    const next = mergeSettings({ ...(await this.getSettings()), ...s });
    const { error } = await (await sb())
      .from(T_SETTINGS)
      .upsert({ id: SETTINGS_ID, data: next }, { onConflict: "id" });
    if (error) crmFail("save outreach settings", error);
    return next;
  }

  /**
   * crm_find_duplicate: the whole team, no contact detail; when the caller may
   * open the lead, it is read too. Before 0011, matched in the browser as before.
   */
  async findDuplicate(q: { phone?: string; email?: string; excludeId?: string }): Promise<DuplicateMatch | null> {
    if (await this.isLegacy()) {
      const hit = (await this.listLeads()).find((l) => l.id !== q.excludeId && sameContact(l, q));
      return hit ? { ...hit, leadId: hit.id, assigneeName: legacyMe().displayName, visible: true } : null;
    }
    const rows = await this.call<Row[]>("crm_find_duplicate", {
      p_phone: normalizePhone(q.phone) ?? null,
      p_email: normalizeEmail(q.email) ?? null,
      p_exclude: q.excludeId ?? null,
    }, "check for a duplicate");
    const r = firstRow(rows);
    if (!r) return null;
    const visible = Boolean(r.visible);
    const lead = visible ? await this.getLead(String(r.lead_id)) : null;
    const base: OutreachLead = lead || { id: String(r.lead_id), instituteName: String(r.institute_name || ""), kind: "other", status: "new", createdAt: "", updatedAt: "" };
    return { ...base, leadId: String(r.lead_id), instituteName: String(r.institute_name || ""), assigneeName: String(r.assignee_name || "Unassigned"), visible };
  }

  /**
   * The whole file in ONE upsert: PostgREST runs a single statement, so either
   * every row is saved or, on an error, none is. An import creates no history
   * events, so there is no second write.
   */
  async importLeads(rows: Record<string, string>[], opts?: ImportOptions) {
    const { result, toSave } = planImport(rows, await this.listLeads(), opts);
    if (!toSave.length) return result;
    const { error } = await (await sb())
      .from(T_LEADS)
      .upsert(toSave.map((l) => ({ id: l.id, data: stripMirrors(l), updated_at: l.updatedAt })), { onConflict: "id" });
    if (error) crmFail(`save the ${toSave.length} imported leads (nothing was saved)`, error);
    return result;
  }

  /* ── The team (0011) ───────────────────────────────────────────────────── */

  /** A team function. Without 0011 it refuses (a write) or answers `empty` (a read). */
  private async call<T>(fn: string, args: Record<string, unknown> | undefined, what: string, empty?: T): Promise<T> {
    if (empty !== undefined && (await this.isLegacy())) return empty;
    const { data, error, status } = await (await sb()).rpc(fn, args);
    if (error) {
      if (missingFunction(error, status)) {
        this.legacy = true;
        if (empty !== undefined) return empty;
        throw new CrmAccessError("42501", NEEDS_0011);
      }
      crmFail(what, error);
    }
    return data as T;
  }

  /** crm_me, re-read on every call (a switched-off person drops out at once). */
  async me(): Promise<CrmMe> {
    if (this.legacy === true) return legacyMe();
    const { data, error, status } = await (await sb()).rpc("crm_me");
    if (error) {
      if (missingFunction(error, status)) {
        this.legacy = true;
        this.lastMe = legacyMe();
        return this.lastMe;
      }
      if (error.code === "42501" || /permission denied/i.test(error.message || "")) {
        this.legacy = false;
        this.lastMe = noAccessMe("signed_out");
        return this.lastMe;
      }
      crmFail("read who is signed in", error);
    }
    this.legacy = false;
    this.lastMe = meFromJson(data as Row);
    return this.lastMe;
  }

  /** INSERT only: a member's lead is theirs and starts at New (the database sees to it). */
  async createLead(input: LeadInput) {
    const lead = prepareLead(stripMirrors(input));
    const legacy = await this.isLegacy();
    const row: Row = { id: lead.id, data: lead };
    if (legacy) row.updated_at = lead.updatedAt;
    const { data, error } = await (await sb()).from(T_LEADS).insert(row).select(legacy ? "id, data" : LEAD_COLS).single();
    if (error) crmFail("add the lead", error);
    return data ? leadFromRow(data as unknown as LeadRow) : lead;
  }

  /** Before 0011: today's whole-lead save of the merged lead (a key set to undefined is removed). */
  private async legacyPatch(id: string, patch: Partial<OutreachLead>): Promise<OutreachLead> {
    const prev = await this.getLead(id);
    if (!prev) throw new CrmAccessError("P0002", crmErrorText({ code: "P0002", message: "crm: this lead is not yours, or it was deleted" }));
    const lead = prepareLead({ ...patch, id, instituteName: patch.instituteName ?? prev.instituteName } as LeadInput, prev);
    const { error } = await (await sb())
      .from(T_LEADS)
      .upsert({ id: lead.id, data: stripMirrors(lead), updated_at: lead.updatedAt }, { onConflict: "id" });
    if (error) crmFail("save the change", error);
    return lead;
  }

  /** crm_patch_lead: only the changed keys travel; the server merges them into the lead as it is now. */
  async patchLead(id: string, patch: Partial<OutreachLead>) {
    const p = normalizePatch(patch);
    if (await this.isLegacy()) return this.legacyPatch(id, p);
    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined || v === null) unset.push(k);
      else set[k] = v;
    }
    const row = firstRow(await this.call<LeadRow[] | LeadRow>("crm_patch_lead", { p_id: id, p_set: set, p_unset: unset }, "save the change"));
    if (!row) throw new CrmAccessError("P0002", crmErrorText({ code: "P0002", message: "crm: this lead is not yours, or it was deleted" }));
    return leadFromRow(row);
  }

  /** crm_append_notes: one more line, appended on the server. */
  async appendNotes(id: string, text: string) {
    if (await this.isLegacy()) {
      const add = String(text ?? "").trim().slice(0, 2000);
      if (!add) throw new CrmAccessError("22023", crmErrorText({ code: "22023", message: "crm: write something to add" }));
      const prev = await this.getLead(id);
      return this.legacyPatch(id, { notes: prev?.notes?.trim() ? `${prev.notes}\n${add}` : add });
    }
    const row = firstRow(await this.call<LeadRow[] | LeadRow>("crm_append_notes", { p_id: id, p_text: text }, "add to the notes"));
    if (!row) throw new CrmAccessError("P0002", crmErrorText({ code: "P0002", message: "crm: this lead is not yours, or it was deleted" }));
    return leadFromRow(row);
  }

  async assignLeads(ids: string[], memberId: string | null) {
    return num(await this.call<number>("crm_assign_leads", { p_lead_ids: ids, p_member: memberId }, "assign the leads"));
  }

  async distributeLeads(ids: string[], memberIds: string[], mode: DistributeMode, includeContacted = false) {
    const rows = await this.call<Row[]>("crm_distribute", { p_lead_ids: ids, p_member_ids: memberIds, p_mode: mode, p_include_contacted: includeContacted }, "share out the leads");
    return distributeFromRows(rows);
  }

  async applyRules(ids: string[], includeContacted = false) {
    return distributeFromRows(await this.call<Row[]>("crm_apply_rules", { p_lead_ids: ids, p_include_contacted: includeContacted }, "apply the rules"));
  }

  async handoff(input: HandoffInput) {
    const id = await this.call<number | null>("crm_handoff", {
      p_lead_id: input.leadId,
      p_slot_at: input.slotAt ?? null,
      p_note: input.note ?? null,
      p_host: input.hostId ?? null,
      p_qualified: input.qualified !== false,
    }, "hand the lead over");
    return id === null || id === undefined ? null : Number(id);
  }

  async askOwner(leadId: string, topic: AskTopic, text: string) {
    await this.call<void>("crm_ask_owner", { p_lead_id: leadId, p_topic: topic, p_text: text }, "ask Mehdi");
  }

  /** Owner and admins: all; a member: their own (row security). Open ones oldest first. */
  async listRequests(opts: { open?: boolean } = {}) {
    if (await this.isLegacy()) return [];
    let q = (await sb()).from("crm_requests").select("*");
    if (opts.open) q = q.is("resolved_at", null);
    const { data, error } = await q.order("created_at", { ascending: Boolean(opts.open) }).order("id", { ascending: Boolean(opts.open) });
    if (error) crmFail("read the requests", error);
    return ((data || []) as Row[]).map(requestFromRow);
  }

  async resolveRequest(id: number, outcome: RequestOutcome, note?: string) {
    await this.call<void>("crm_resolve_request", { p_id: id, p_outcome: outcome, p_note: note ?? null }, "close the request");
  }

  async publishLeadDemo(leadId: string, sentTo?: string) {
    return String(await this.call<string>("crm_publish_lead_demo", { p_lead_id: leadId, p_sent_to: sentTo ?? null }, "turn the demo link on"));
  }

  async leadsOverview() {
    return ((await this.call<Row[]>("crm_leads_overview", undefined, "read the lead list", [])) || []).map(overviewFromRow);
  }

  async leadDemos() {
    const rows = (await this.call<Row[]>("crm_lead_demos", undefined, "read the demos", [])) || [];
    return rows.map((r) => ({ ...((r.data as object) || {}), id: String(r.demo_id) }) as DemoSite);
  }

  async demoOpens(sinceIso?: string) {
    const rows = (await this.call<Row[]>("crm_demo_opens", sinceIso ? { p_since: sinceIso } : undefined, "read the demo opens", [])) || [];
    return rows.map((r) => ({ id: String(r.open_id), demoId: String(r.demo_id), at: String(r.opened_at || "") }) as DemoSiteOpen);
  }

  async activityStats(fromIso: string, toIso?: string) {
    const args: Row = { p_from: fromIso };
    if (toIso) args.p_to = toIso;
    return ((await this.call<Row[]>("crm_activity_stats", args, "read the numbers", [])) || []).map(statsFromRow);
  }

  async teamNames() {
    const rows = (await this.call<Row[]>("crm_team", undefined, "read the team", [])) || [];
    return rows.map((r) => ({ id: String(r.id), displayName: String(r.display_name || ""), role: r.role as CrmTeamName["role"], active: Boolean(r.active) }));
  }

  async listMembers() {
    if (await this.isLegacy()) return [];
    const { data, error } = await (await sb()).from("crm_members").select("*").order("display_name");
    if (error) crmFail("read the team", error);
    return ((data || []) as Row[]).map(memberFromRow).sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner")
      || Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName));
  }

  /** crm_save_member: only the fields given travel; the rest keep their value. */
  async saveMember(input: SaveMemberInput) {
    const args: Row = {
      p_member_id: input.id, p_email: input.email, p_display_name: input.displayName, p_role: input.role,
      p_view_all: input.viewAll, p_can_add_leads: input.canAddLeads, p_wa_daily_limit: input.waDailyLimit,
      p_new_lead_cap: input.newLeadCap, p_targets: input.targets, p_sender_name: input.senderName,
      p_sender_phone: input.senderPhone, p_signature: input.signature, p_must_change_password: input.mustChangePassword,
      p_may_cold_call: input.mayColdCall, p_sender_checked: input.senderChecked,
    };
    for (const k of Object.keys(args)) if (args[k] === undefined) delete args[k];
    return String(await this.call<string>("crm_save_member", args, "save the person"));
  }

  async linkLogins() {
    return num(await this.call<number>("crm_link_logins", undefined, "check the logins"));
  }

  async deactivateMember(id: string, reassignTo: string | null) {
    return num(await this.call<number>("crm_deactivate_member", { p_member: id, p_reassign_to: reassignTo }, "switch the person off"));
  }

  async reactivateMember(id: string) {
    await this.call<void>("crm_reactivate_member", { p_member: id }, "switch the person on");
  }

  async deleteInvite(id: string) {
    await this.call<void>("crm_delete_invite", { p_member: id }, "remove the invitation");
  }

  async resetPassword(id: string) {
    return String(await this.call<string>("crm_reset_password", { p_member: id }, "reset the password"));
  }

  async passwordChanged() {
    if (await this.isLegacy()) return;
    await this.call<void>("crm_password_changed", undefined, "note the new password");
  }

  async accessSummary(fromIso: string, toIso?: string) {
    const args: Row = { p_from: fromIso };
    if (toIso) args.p_to = toIso;
    return ((await this.call<Row[]>("crm_access_summary", args, "read the access log", [])) || []).map(accessFromRow);
  }

  async listAudit(fromIso?: string, toIso?: string, memberId?: string) {
    if (await this.isLegacy()) return [];
    let q = (await sb()).from("crm_audit").select("*");
    if (fromIso) q = q.gte("at", fromIso);
    if (toIso) q = q.lt("at", toIso);
    if (memberId) q = q.eq("actor_id", memberId);
    const { data, error } = await q.order("at", { ascending: false }).limit(1000);
    if (error) crmFail("read the audit trail", error);
    return ((data || []) as Row[]).map(auditFromRow);
  }

  async dbUsage(): Promise<DbUsage | null> {
    const r = firstRow((await this.call<Row[]>("crm_db_usage", undefined, "read the database size", [])) || []);
    return r ? { databaseBytes: num(r.database_bytes), crmBytes: num(r.crm_bytes) } : null;
  }

  async notifications() {
    if (await this.isLegacy()) return [];
    const { data, error } = await (await sb()).from("crm_notifications").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) crmFail("read the notifications", error);
    return ((data || []) as Row[]).map(notificationFromRow);
  }

  async markNotificationsRead(ids: number[]) {
    if (!ids.length || (await this.isLegacy())) return;
    const { error } = await (await sb()).from("crm_notifications").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null);
    if (error) crmFail("mark the notifications read", error);
  }

  async logAccess(action: AccessAction, leadId?: string, detail?: Record<string, unknown>) {
    try {
      if (await this.isLegacy()) return;
      await this.call<void>("crm_log_access", { p_action: action, p_lead_id: leadId ?? null, p_detail: detail || {} }, "log the access");
    } catch {
      /* fire and forget: a refused log line never breaks a screen */
    }
  }

  async listReviews() {
    if (await this.isLegacy()) return [];
    const { data, error } = await (await sb()).from("crm_reviews").select("*").order("created_at", { ascending: false });
    if (error) crmFail("read the reviews", error);
    return ((data || []) as Row[]).map(reviewFromRow);
  }

  /** The database ties the review to the line's writer and lead (crm_reviews_guard); member_id is only a placeholder. */
  async addReview(eventId: string, verdict: "good" | "fix", comment?: string) {
    if (await this.isLegacy()) throw new CrmAccessError("42501", NEEDS_0011);
    const me = this.lastMe || (await this.me());
    const row: Row = { event_id: eventId, verdict, comment: comment ?? null };
    if (me.memberId) row.member_id = me.memberId;
    const { error } = await (await sb()).from("crm_reviews").insert(row);
    if (error) crmFail("save the review", error);
  }

  async busySlots(hostId?: string, days?: number) {
    const args: Row = {};
    if (hostId) args.p_host = hostId;
    if (days) args.p_days = days;
    const rows = (await this.call<Row[]>("crm_busy_slots", args, "read the busy times", [])) || [];
    return rows.map((r) => iso(r.slot_at) as string);
  }

  async setBooking(id: number, status: CrmBooking["status"], note?: string) {
    await this.call<void>("crm_set_booking", { p_id: id, p_status: status, p_note: note ?? null }, "change the booking");
  }

  async listRules() {
    if (await this.isLegacy()) return [];
    const { data, error } = await (await sb()).from("crm_assignment_rules").select("*").order("priority").order("id");
    if (error) crmFail("read the rules", error);
    return ((data || []) as Row[]).map(ruleFromRow);
  }

  async saveRule(rule: AssignmentRuleInput) {
    if (await this.isLegacy()) throw new CrmAccessError("42501", NEEDS_0011);
    const row: Row = { name: rule.name, kind: rule.kind ?? null, city: rule.city ?? null, member_ids: rule.memberIds };
    if (rule.priority !== undefined) row.priority = rule.priority;
    if (rule.active !== undefined) row.active = rule.active;
    const t = (await sb()).from("crm_assignment_rules");
    const { error } = rule.id ? await t.update(row).eq("id", rule.id) : await t.insert(row);
    if (error) crmFail("save the rule", error);
  }

  async deleteRule(id: number) {
    if (await this.isLegacy()) return;
    const { error } = await (await sb()).from("crm_assignment_rules").delete().eq("id", id);
    if (error) crmFail("delete the rule", error);
  }
}

/* ── The store the app uses ──────────────────────────────────────────────── */

let _store: OutreachStore | null = null;

export function getOutreachStore(): OutreachStore {
  if (!_store) _store = supabaseEnabled ? new SupabaseOutreachStore() : new LocalOutreachStore();
  return _store;
}

/** Tests only: swap the store (e.g. a LocalOutreachStore over an in-memory storage). */
export function setOutreachStoreForTests(store: OutreachStore | null): void {
  _store = store;
}

/** Convenience: the same API, always delegating to getOutreachStore(). */
export const outreachStore: OutreachStore = {
  get mode() {
    return getOutreachStore().mode;
  },
  listLeads: () => getOutreachStore().listLeads(),
  getLead: (id) => getOutreachStore().getLead(id),
  upsertLead: (l) => getOutreachStore().upsertLead(l),
  upsertLeads: (l) => getOutreachStore().upsertLeads(l),
  deleteLead: (id) => getOutreachStore().deleteLead(id),
  listEvents: (id) => getOutreachStore().listEvents(id),
  addEvent: (e) => getOutreachStore().addEvent(e),
  getSettings: () => getOutreachStore().getSettings(),
  saveSettings: (s) => getOutreachStore().saveSettings(s),
  findDuplicate: (q) => getOutreachStore().findDuplicate(q),
  importLeads: (r, o) => getOutreachStore().importLeads(r, o),
  me: () => getOutreachStore().me(),
  createLead: (l) => getOutreachStore().createLead(l),
  patchLead: (id, p) => getOutreachStore().patchLead(id, p),
  appendNotes: (id, t) => getOutreachStore().appendNotes(id, t),
  assignLeads: (ids, m) => getOutreachStore().assignLeads(ids, m),
  distributeLeads: (ids, ms, mode, inc) => getOutreachStore().distributeLeads(ids, ms, mode, inc),
  applyRules: (ids, inc) => getOutreachStore().applyRules(ids, inc),
  handoff: (i) => getOutreachStore().handoff(i),
  askOwner: (id, topic, t) => getOutreachStore().askOwner(id, topic, t),
  listRequests: (o) => getOutreachStore().listRequests(o),
  resolveRequest: (id, o, n) => getOutreachStore().resolveRequest(id, o, n),
  publishLeadDemo: (id, to) => getOutreachStore().publishLeadDemo(id, to),
  leadsOverview: () => getOutreachStore().leadsOverview(),
  leadDemos: () => getOutreachStore().leadDemos(),
  demoOpens: (s) => getOutreachStore().demoOpens(s),
  activityStats: (f, t) => getOutreachStore().activityStats(f, t),
  teamNames: () => getOutreachStore().teamNames(),
  listMembers: () => getOutreachStore().listMembers(),
  saveMember: (i) => getOutreachStore().saveMember(i),
  linkLogins: () => getOutreachStore().linkLogins(),
  deactivateMember: (id, to) => getOutreachStore().deactivateMember(id, to),
  reactivateMember: (id) => getOutreachStore().reactivateMember(id),
  deleteInvite: (id) => getOutreachStore().deleteInvite(id),
  resetPassword: (id) => getOutreachStore().resetPassword(id),
  passwordChanged: () => getOutreachStore().passwordChanged(),
  accessSummary: (f, t) => getOutreachStore().accessSummary(f, t),
  listAudit: (f, t, m) => getOutreachStore().listAudit(f, t, m),
  dbUsage: () => getOutreachStore().dbUsage(),
  notifications: () => getOutreachStore().notifications(),
  markNotificationsRead: (ids) => getOutreachStore().markNotificationsRead(ids),
  logAccess: (a, id, d) => getOutreachStore().logAccess(a, id, d),
  listReviews: () => getOutreachStore().listReviews(),
  addReview: (id, v, c) => getOutreachStore().addReview(id, v, c),
  busySlots: (h, d) => getOutreachStore().busySlots(h, d),
  setBooking: (id, s, n) => getOutreachStore().setBooking(id, s, n),
  listRules: () => getOutreachStore().listRules(),
  saveRule: (r) => getOutreachStore().saveRule(r),
  deleteRule: (id) => getOutreachStore().deleteRule(id),
  actAs: (id) => getOutreachStore().actAs?.(id),
  actingAs: () => getOutreachStore().actingAs?.() ?? null,
};
