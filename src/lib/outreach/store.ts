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
 */
import { supabaseEnabled } from "@/lib/cms/config";
import { looksDental } from "@/lib/demo/templates/dentalPick";
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
  listLeads(): Promise<OutreachLead[]>;
  getLead(id: string): Promise<OutreachLead | null>;
  upsertLead(lead: LeadInput): Promise<OutreachLead>;
  /** Several leads in ONE write: all are saved, or none (CRM clean-ups). */
  upsertLeads(leads: LeadInput[]): Promise<OutreachLead[]>;
  /** Deletes the lead and its events. */
  deleteLead(id: string): Promise<void>;
  /** All events, newest first; only one lead's when leadId is given. */
  listEvents(leadId?: string): Promise<OutreachEvent[]>;
  addEvent(event: EventInput): Promise<OutreachEvent>;
  getSettings(): Promise<OutreachSettings>;
  saveSettings(settings: Partial<OutreachSettings>): Promise<OutreachSettings>;
  /** The first lead sharing the phone (or WhatsApp) or email, ignoring excludeId. */
  findDuplicate(q: { phone?: string; email?: string; excludeId?: string }): Promise<OutreachLead | null>;
  /** Rows from parseCsv (or any header-keyed objects). See mapCsvRow for columns. */
  importLeads(rows: Record<string, string>[], opts?: ImportOptions): Promise<ImportResult>;
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
}

interface LocalData {
  leads: OutreachLead[];
  events: OutreachEvent[];
  settings: OutreachSettings | null;
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

export class LocalOutreachStore implements OutreachStore {
  readonly mode = "local" as const;
  private storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = storage || defaultStorage();
  }

  private read(): LocalData {
    try {
      const raw = this.storage.getItem(OUTREACH_LOCAL_KEY);
      const p = raw ? (JSON.parse(raw) as Partial<LocalData>) : {};
      return {
        leads: Array.isArray(p.leads) ? p.leads : [],
        events: Array.isArray(p.events) ? p.events : [],
        settings: p.settings || null,
      };
    } catch {
      return { leads: [], events: [], settings: null };
    }
  }

  private write(d: LocalData): void {
    this.storage.setItem(OUTREACH_LOCAL_KEY, JSON.stringify(d));
  }

  async listLeads() {
    return this.read().leads.slice().sort(byUpdatedDesc);
  }

  async getLead(id: string) {
    return this.read().leads.find((l) => l.id === id) || null;
  }

  async upsertLead(input: LeadInput) {
    const d = this.read();
    const i = input.id ? d.leads.findIndex((l) => l.id === input.id) : -1;
    const lead = prepareLead(input, i >= 0 ? d.leads[i] : null);
    if (i >= 0) d.leads[i] = lead;
    else d.leads.push(lead);
    this.write(d);
    return lead;
  }

  async upsertLeads(inputs: LeadInput[]) {
    const d = this.read();
    const at = new Map(d.leads.map((l, i) => [l.id, i]));
    const saved = inputs.map((input) => {
      const i = input.id ? at.get(input.id) : undefined;
      const lead = prepareLead(input, i === undefined ? null : d.leads[i]);
      if (i === undefined) {
        at.set(lead.id, d.leads.length);
        d.leads.push(lead);
      } else d.leads[i] = lead;
      return lead;
    });
    if (saved.length) this.write(d);
    return saved;
  }

  async deleteLead(id: string) {
    const d = this.read();
    d.leads = d.leads.filter((l) => l.id !== id);
    d.events = d.events.filter((e) => e.leadId !== id);
    this.write(d);
  }

  async listEvents(leadId?: string) {
    const all = this.read().events;
    return (leadId ? all.filter((e) => e.leadId === leadId) : all).slice().sort(byAtDesc);
  }

  async addEvent(input: EventInput) {
    const d = this.read();
    const e = prepareEvent(input);
    d.events.push(e);
    this.write(d);
    return e;
  }

  async getSettings() {
    return mergeSettings(this.read().settings);
  }

  async saveSettings(s: Partial<OutreachSettings>) {
    const d = this.read();
    const next = mergeSettings({ ...(d.settings || {}), ...s });
    d.settings = next;
    this.write(d);
    return next;
  }

  async findDuplicate(q: { phone?: string; email?: string; excludeId?: string }) {
    return this.read().leads.find((l) => l.id !== q.excludeId && sameContact(l, q)) || null;
  }

  /** The whole file in ONE storage write: all rows are saved, or none. */
  async importLeads(rows: Record<string, string>[], opts?: ImportOptions) {
    const d = this.read();
    const { result, toSave } = planImport(rows, d.leads, opts);
    if (!toSave.length) return result;
    const at = new Map(d.leads.map((l, i) => [l.id, i]));
    for (const l of toSave) {
      const i = at.get(l.id);
      if (i === undefined) d.leads.push(l);
      else d.leads[i] = l;
    }
    this.write(d);
    return result;
  }
}

/* ── Supabase implementation ─────────────────────────────────────────────── */

const T_LEADS = "outreach_leads";
const T_EVENTS = "outreach_events";
const T_SETTINGS = "outreach_settings";
const SETTINGS_ID = "default";
/* PostgREST caps a response at the project's max rows (1000) silently, so page. */
const PAGE = 1000;

async function sb() {
  const { supabase } = await import("@/lib/cms/client");
  return supabase();
}

function fail(what: string, error: { message?: string } | null): never {
  throw new Error(`Outreach: could not ${what}. ${error?.message || ""}`.trim());
}

export class SupabaseOutreachStore implements OutreachStore {
  readonly mode = "supabase" as const;

  private async allData<T>(table: string, order: string, filter?: { col: string; val: string }): Promise<T[]> {
    const client = await sb();
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = client.from(table).select("id, data").order(order, { ascending: false }).order("id");
      if (filter) q = q.eq(filter.col, filter.val);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) fail(`read ${table}`, error);
      const rows = (data || []) as { id: string; data: T }[];
      for (const r of rows) out.push({ ...(r.data as object), id: r.id } as T);
      if (rows.length < PAGE) break;
    }
    return out;
  }

  async listLeads() {
    return (await this.allData<OutreachLead>(T_LEADS, "updated_at")).sort(byUpdatedDesc);
  }

  async getLead(id: string) {
    const { data, error } = await (await sb()).from(T_LEADS).select("id, data").eq("id", id).maybeSingle();
    if (error) fail("read the lead", error);
    return data ? ({ ...(data.data as object), id: data.id } as OutreachLead) : null;
  }

  async upsertLead(input: LeadInput) {
    const prev = input.id ? await this.getLead(input.id) : null;
    const lead = prepareLead(input, prev);
    const { error } = await (await sb())
      .from(T_LEADS)
      .upsert({ id: lead.id, data: lead, updated_at: lead.updatedAt }, { onConflict: "id" });
    if (error) fail("save the lead", error);
    return lead;
  }

  async upsertLeads(inputs: LeadInput[]) {
    if (!inputs.length) return [];
    const before = new Map((await this.listLeads()).map((l) => [l.id, l]));
    const saved = inputs.map((input) => prepareLead(input, input.id ? before.get(input.id) : null));
    const { error } = await (await sb())
      .from(T_LEADS)
      .upsert(saved.map((l) => ({ id: l.id, data: l, updated_at: l.updatedAt })), { onConflict: "id" });
    if (error) fail(`save the ${saved.length} leads (nothing was saved)`, error);
    return saved;
  }

  async deleteLead(id: string) {
    const client = await sb();
    const ev = await client.from(T_EVENTS).delete().eq("lead_id", id);
    if (ev.error) fail("delete the history of the lead", ev.error);
    const { error } = await client.from(T_LEADS).delete().eq("id", id);
    if (error) fail("delete the lead", error);
  }

  async listEvents(leadId?: string) {
    const f = leadId ? { col: "lead_id", val: leadId } : undefined;
    return (await this.allData<OutreachEvent>(T_EVENTS, "created_at", f)).sort(byAtDesc);
  }

  async addEvent(input: EventInput) {
    const e = prepareEvent(input);
    const { error } = await (await sb())
      .from(T_EVENTS)
      .insert({ id: e.id, lead_id: e.leadId, data: e, created_at: e.at });
    if (error) fail("record the event", error);
    return e;
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
    if (error) fail("save outreach settings", error);
    return next;
  }

  async findDuplicate(q: { phone?: string; email?: string; excludeId?: string }) {
    /* A few hundred leads at most: matching in the browser keeps the same rules as local. */
    return (await this.listLeads()).find((l) => l.id !== q.excludeId && sameContact(l, q)) || null;
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
      .upsert(toSave.map((l) => ({ id: l.id, data: l, updated_at: l.updatedAt })), { onConflict: "id" });
    if (error) fail(`save the ${toSave.length} imported leads (nothing was saved)`, error);
    return result;
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
};
