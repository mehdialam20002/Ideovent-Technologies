/**
 * WHO MAY SEE AND CHANGE WHAT IN THE CRM: the rules of
 * supabase/migrations/0011_crm_team.sql as pure functions (spec 9.6).
 *
 * The DATABASE enforces these rules (RLS, the field and history guards, the
 * team functions). This file says the same thing for the two places that have
 * no database: the screens (what to show, what to disable) and the LOCAL store
 * (src/lib/outreach/localTeam.ts), which emulates the team so the e2e suites
 * can test a member's screens against an owner's. Nothing here proves the
 * database rules; scripts/test-crm-rls.mjs does that on a real Postgres.
 *
 * KEEP THE TWO SIDES TOGETHER. scripts/test-crm-access.mjs parses 0011 and
 * fails when a key list, a daily limit, the 14-day window or the money pattern
 * here differs from the SQL. Error messages are the SQL's own, so a refusal
 * reads the same in local mode and on the live site.
 *
 * Pure: no React, no storage, no network.
 */
import type { PlainStage } from "@/admin/outreach/stages";
import { getTemplate, type TemplateStage } from "./templates";
import type {
  LeadKind,
  LeadLanguage,
  LeadPitch,
  LeadStatus,
  OutreachChannel,
  OutreachEvent,
  OutreachEventType,
  OutreachLead,
} from "./types";
import {
  noAccessMe,
  type AccessDay,
  type AskTopic,
  type AssignmentRule,
  type CallOutcome,
  type CrmAuditLine,
  type CrmMe,
  type CrmMember,
  type CrmRequest,
  type CrmRole,
  type CrmTeamName,
  type DistributeMode,
  type LeadOverview,
  type MemberStats,
} from "./team";
import { META_LEAD_ID_PREFIX, META_SOURCES } from "../meta/fields";

/* ── The SQL's constants (test-crm-access.mjs checks each against 0011) ──── */

/** Days a member still reads a lead after it closes. private.crm_closed_days(). */
export const CLOSED_READ_DAYS = 14;

/** Keys of a lead a member may change on their own lead. private.crm_member_free_keys(). */
export const MEMBER_FREE_KEYS: readonly string[] = ["status", "nextActionAt", "lastContactedAt", "language", "tags", "lostReason", "updatedAt"];

/** Keys a member may fill in when empty, never change once filled. private.crm_member_fill_keys(). */
export const MEMBER_FILL_KEYS: readonly string[] = ["contactName", "phone", "whatsapp", "email", "website", "city", "state", "observation"];

/** Keys a member may only add to (the new text starts with the old). private.crm_member_append_keys(). */
export const MEMBER_APPEND_KEYS: readonly string[] = ["notes"];

/** Mirrors of the columns the app adds when it reads a lead; never stored in its data. private.crm_column_keys(). */
export const COLUMN_KEYS: readonly string[] = ["assigneeId", "assigneeName", "assignedAt", "assignedById", "createdById", "qualifiedById"];

/**
 * Everything the store adds on read and strips before every write: the column
 * mirrors plus closedAt (closed_at is a column too; the database stamps it).
 */
export const MIRROR_KEYS: readonly string[] = [...COLUMN_KEYS, "closedAt"];

/** What one person (anyone but Mehdi) may write in one India-time day. private.crm_daily_limit(). */
export const DAILY_LIMITS = Object.freeze({ event: 300, lead_add: 50, lead_change: 400, log: 1500, lookup: 300 });
export type BudgetKind = keyof typeof DAILY_LIMITS;

/** Template stages only Mehdi sends: they carry the price and the payment terms (SOP-10). The history guard. */
export const MONEY_STAGES: readonly TemplateStage[] = ["after_call", "proposal"];

/** The history guard's template-id test for the same: a proposal or summary even with the stage left out. */
export const MONEY_TEMPLATE_RE = /^(wa|em)_(after_call|proposal)(_|$)/;

/** A "status" line nobody but Mehdi writes (metrics.ts isWinEvent counts wins from it). SQL: '\mto\s+(won|proposal)\s*$' ~*. */
export const WIN_STATUS_LINE_RE = /\bto\s+(won|proposal)\s*$/i;

/** History lines anyone but Mehdi may write; "assign" and "handoff" are the database's own. */
export const MEMBER_EVENT_TYPES: readonly OutreachEventType[] = ["sent", "replied", "status", "note", "call", "demo_opened"];

export const CLOSED_LEAD_STATUSES: readonly LeadStatus[] = ["won", "lost", "do_not_contact"];
/** Statuses a lead is held at only by Mehdi or an admin (crm_check_assignee: "stay with Mehdi"). */
export const MEHDI_STATUSES: readonly LeadStatus[] = ["call", "proposal"];

/** A lead is a card, not a store (anyone but Mehdi). */
export const LEAD_MAX_BYTES = 32000;
/** Any history line. */
export const EVENT_MAX_BYTES = 20000;
/** A history line by anyone but Mehdi. */
export const MEMBER_EVENT_MAX_BYTES = 4000;
/** "Add to notes" takes at most this many characters at a time (crm_append_notes). */
export const NOTES_APPEND_MAX = 2000;
/** Nobody holds more open leads than this (a guard against a slip, not a workload rule). */
export const OPEN_LEAD_CEILING = 1000;
/** A "demo opened" line keeps the prospect's open time when it is at most this old. */
export const DEMO_OPEN_MAX_AGE_DAYS = 30;

/**
 * The values a lead's coded fields may take when anyone but Mehdi writes them.
 * private.crm_lead_values(). Typed against types.ts, so a value added there
 * and not here fails the typecheck (see the checks below).
 */
export const LEAD_VALUES = Object.freeze({
  status: ["new", "contacted", "replied", "demo_opened", "call", "proposal", "won", "lost", "do_not_contact"] as const satisfies readonly LeadStatus[],
  kind: ["school", "coaching", "dental", "other"] as const satisfies readonly LeadKind[],
  pitch: ["new_website", "fix_website"] as const satisfies readonly LeadPitch[],
  language: ["en", "hinglish", "hi"] as const satisfies readonly LeadLanguage[],
});

/** The same for a history line. private.crm_event_values(). */
export const EVENT_VALUES = Object.freeze({
  channel: ["email", "whatsapp", "call"] as const satisfies readonly OutreachChannel[],
  stage: ["first", "after_reply", "follow_up_1", "follow_up_2", "follow_up_3", "after_call", "proposal"] as const satisfies readonly TemplateStage[],
  outcome: ["connected_interested", "connected_callback", "connected_not_interested", "no_answer", "busy", "switched_off", "wrong_number"] as const satisfies readonly CallOutcome[],
  topic: ["demo", "correction", "question"] as const satisfies readonly AskTopic[],
});

/* Every member of each union is listed: a type that grows without its list here fails the typecheck. */
type Missing<U, L extends readonly unknown[]> = Exclude<U, L[number]>;
type AllListed<T extends never> = T;
/** Compile time only: each list above names every member of its type. */
export type ValueListsComplete = [
  AllListed<Missing<LeadStatus, typeof LEAD_VALUES.status>>,
  AllListed<Missing<LeadKind, typeof LEAD_VALUES.kind>>,
  AllListed<Missing<LeadPitch, typeof LEAD_VALUES.pitch>>,
  AllListed<Missing<LeadLanguage, typeof LEAD_VALUES.language>>,
  AllListed<Missing<OutreachChannel, typeof EVENT_VALUES.channel>>,
  AllListed<Missing<TemplateStage, typeof EVENT_VALUES.stage>>,
  AllListed<Missing<CallOutcome, typeof EVENT_VALUES.outcome>>,
  AllListed<Missing<AskTopic, typeof EVENT_VALUES.topic>>,
];

/** Keys of a lead that hold a moment in time. private.crm_date_keys(). */
export const DATE_KEYS: readonly string[] = ["createdAt", "updatedAt", "nextActionAt", "lastContactedAt"];

/** The longest detail one access-log line takes, in bytes: Mehdi, anyone else. private.crm_log_detail_max(). */
export const LOG_DETAIL_MAX = Object.freeze({ owner: 2000, other: 300 });

/** Team > Access marks a day to look at past these: sign-ins, and lines written through the access log. */
export const ACCESS_FLAG_SIGN_INS = 20;
export const ACCESS_FLAG_LOGGED = 200;
/** The actions crm_log_access writes (the others in the audit trail are the database's own). */
export const LOGGED_ACTIONS: readonly string[] = ["lead.view", "contact.reveal", "export", "import", "sign_in"];

/* ── Errors ──────────────────────────────────────────────────────────────── */

/**
 * The SQLSTATEs the database raises on purpose:
 *   42501 not allowed   P0002 not yours / not found   23505 duplicate
 *   22023 bad request   23514 a rule (Lost needs a reason)   22001 too large
 *   54000 the daily write budget
 */
export type CrmErrorCode = "42501" | "P0002" | "23505" | "22023" | "23514" | "22001" | "54000";

export class CrmAccessError extends Error {
  code: CrmErrorCode | string;
  constructor(code: CrmErrorCode | string, message: string) {
    super(message);
    this.name = "CrmAccessError";
    this.code = code;
  }
}

const NOT_YOURS = "This lead is not yours any more (it may have been moved).";
const NOT_ALLOWED = "That is not allowed for your login. Ask Mehdi.";

/**
 * The sentence to show a person for any error: the database's own sentence
 * without its "crm: " prefix; a lead that is no longer the caller's, and a
 * refusal by row security, in plain words.
 */
export function crmErrorText(err: unknown): string {
  const e = (err && typeof err === "object" ? err : {}) as { code?: string; message?: string; details?: string };
  const raw = (typeof err === "string" ? err : e.message || (err == null ? "" : String(err))).trim();
  if (e.code === "P0002" && (/not yours, or it was deleted/.test(raw) || !raw)) return NOT_YOURS;
  if (/row-level security|permission denied/i.test(raw)) return NOT_ALLOWED;
  const text = raw.replace(/^crm:\s*/, "");
  if (!text) return "Something went wrong.";
  // A sentence of the database's own starts in lower case; one that starts with a
  // value (an institute's or a person's name, an e-mail, a number) keeps it as it is.
  const firstWord = text.split(/\s/)[0];
  const startsWithValue = /[@\d]/.test(firstWord) || / is already (in the|taken)| would (have|hold) | has no login linked/.test(text);
  return startsWithValue ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** A refusal with the database's message (its "crm: " prefix stripped, as the Supabase store does). */
export function refuse(code: CrmErrorCode, sqlMessage: string): never {
  throw new CrmAccessError(code, crmErrorText({ code, message: sqlMessage }));
}

/** Row security refused the write (the database's own message, for that table). */
export function rlsRefusal(table: string): never {
  throw new CrmAccessError("42501", crmErrorText({ code: "42501", message: `new row violates row-level security policy for table "${table}"` }));
}

/* ── Small pure helpers (the SQL's own, in TypeScript) ──────────────────── */

/** Empty like private.crm_blank: missing, null, "", whitespace, or []. */
export function blank(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return typeof v === "string" && v.trim() === "";
}

function canonical(v: unknown): string {
  if (v === undefined) return "\u0000undefined";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map((x) => (x === undefined ? "null" : canonical(x))).join(",") + "]";
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
}

/** jsonb equality, "is not distinct from": key order does not matter; missing differs from "" and from null. */
export function sameJson(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

/** Size of a value as stored (UTF-8 JSON). The database counts its own text form, a few bytes apart. */
export function jsonBytes(v: unknown): number {
  const s = JSON.stringify(v ?? {}) || "";
  try {
    return new TextEncoder().encode(s).length;
  } catch {
    return unescape(encodeURIComponent(s)).length;
  }
}

/** Open = nothing has finished it (private.crm_is_open). */
export function isOpenStatus(status: string | undefined | null): boolean {
  return !CLOSED_LEAD_STATUSES.includes((status || "new") as LeadStatus);
}

const IST_MS = 5.5 * 3600e3;
const DAY_MS = 864e5;

/** The India-time calendar day of a moment, YYYY-MM-DD (the daily budget's day, the Access tab's day). */
export function istDay(at: Date | string | number = new Date()): string {
  return new Date(new Date(at).getTime() + IST_MS).toISOString().slice(0, 10);
}

/** The India-time hour of a moment, 0-23. */
export function istHour(at: Date | string | number): number {
  return new Date(new Date(at).getTime() + IST_MS).getUTCHours();
}

/** Midnight India time at the start of the day `now` falls in. */
export function istStartOfDay(now = new Date()): Date {
  return new Date(Date.parse(istDay(now) + "T00:00:00.000Z") - IST_MS);
}

/** A lead's own data: every key but the column mirrors, without empty (undefined or null) values. */
export function leadData(lead: Partial<OutreachLead> | Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(lead || {})) {
    if (!MIRROR_KEYS.includes(k) && v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** A lead's column mirrors only. */
export function columnsOf(lead: Partial<OutreachLead> | null | undefined): Partial<OutreachLead> {
  const out: Record<string, unknown> = {};
  for (const k of MIRROR_KEYS) {
    const v = (lead as Record<string, unknown> | null | undefined)?.[k];
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<OutreachLead>;
}

/**
 * crm_patch_lead's merge, data = (data || set) - unset: a key set to undefined
 * or null is removed, any other value replaces the old one. Mirror keys in the
 * patch are ignored (who a lead belongs to is never changed by a patch).
 */
export function applyPatch(before: Partial<OutreachLead>, patch: Partial<OutreachLead> | Record<string, unknown>): Record<string, unknown> {
  const data = leadData(before);
  for (const [k, v] of Object.entries(patch || {})) {
    if (MIRROR_KEYS.includes(k)) continue;
    if (v === undefined || v === null) delete data[k];
    else data[k] = v;
  }
  return data;
}

/* ── Who sees which lead ─────────────────────────────────────────────────── */

function closedRecently(lead: Pick<OutreachLead, "closedAt">, now: Date): boolean {
  const t = lead.closedAt ? Date.parse(lead.closedAt) : NaN;
  return !Number.isNaN(t) && t > now.getTime() - CLOSED_READ_DAYS * DAY_MS;
}

/**
 * private.crm_member_reads: the lead is assigned to this member, and it is
 * open or closed less than 14 days ago. A closed lead with no closing date
 * fails closed, as null does in SQL.
 */
export function memberReads(memberId: string | null | undefined, lead: Partial<OutreachLead> | null | undefined, now = new Date()): boolean {
  if (!memberId || !lead || lead.assigneeId !== memberId) return false;
  return isOpenStatus(lead.status) || closedRecently(lead, now);
}

const isStaffRole = (role: CrmRole | null | undefined) => role === "owner" || role === "admin";

/** True for the owner and admins (the SQL's "staff"). */
export function isStaff(me: CrmMe | null | undefined): boolean {
  return Boolean(me && isStaffRole(me.role));
}

/** May the caller read this lead in full, contacts included? (The leads SELECT policy.) */
export function canSeeLead(me: CrmMe | null | undefined, lead: Partial<OutreachLead> | null | undefined, now = new Date()): boolean {
  if (!me || !me.role || !lead) return false;
  if (isStaffRole(me.role)) return true;
  return memberReads(me.memberId, lead, now);
}

/** May the caller change this lead at all? (The leads UPDATE policy; which fields is guardPatch's job.) */
export function canEditLead(me: CrmMe | null | undefined, lead: Partial<OutreachLead> | null | undefined, now = new Date()): boolean {
  return canSeeLead(me, lead, now);
}

/* ── What each person may do (the matrix in spec 4.1) ───────────────────── */

export type CrmAction =
  | "lead.delete" | "lead.export" | "lead.import" | "lead.assign" | "lead.add" | "lead.editIdentity"
  | "lead.overwriteContact" | "stage.proposalWon" | "stage.call" | "stage.money" | "dnc.lift" | "finder" | "demos.manage"
  | "demo.publish" | "settings" | "team.manage" | "team.view" | "team.performance" | "team.access" | "team.resetPassword"
  | "audit" | "review" | "rules.manage" | "requests.resolve" | "call.cold";

/** Mehdi only. */
const OWNER_ACTIONS: readonly CrmAction[] = [
  "lead.delete", "lead.export", "lead.import", "stage.proposalWon", "stage.money", "dnc.lift", "finder", "demos.manage",
  "settings", "team.manage", "team.access", "team.resetPassword", "audit", "rules.manage",
];
/** Mehdi and admins. */
const STAFF_ACTIONS: readonly CrmAction[] = [
  "lead.assign", "lead.editIdentity", "lead.overwriteContact", "stage.call", "team.view", "team.performance", "review",
  "requests.resolve",
];
/** Need 0011 (the team tables and functions): hidden in legacy mode. */
export const TEAM_ACTIONS: readonly CrmAction[] = [
  "lead.assign", "team.manage", "team.view", "team.performance", "team.access", "team.resetPassword", "audit", "review",
  "rules.manage", "requests.resolve",
];

/**
 * May this person do this? The matrix in spec 4.1. Settings here means
 * changing them (everyone in the team reads them). "demo.publish" and the
 * per-lead actions also need canEditLead on the lead itself.
 */
export function can(me: CrmMe | null | undefined, action: CrmAction): boolean {
  if (!me || !me.role) return false;
  if (me.legacy && TEAM_ACTIONS.includes(action)) return false;
  const role = me.role;
  if (OWNER_ACTIONS.includes(action)) return role === "owner";
  if (STAFF_ACTIONS.includes(action)) return isStaffRole(role);
  if (action === "lead.add") return isStaffRole(role) || Boolean(me.canAddLeads);
  if (action === "call.cold") return isStaffRole(role) || Boolean(me.mayColdCall);
  if (action === "demo.publish") return true;
  return false;
}

/**
 * The cold-call gate: the prospect replied, opened a demo, or is past that
 * stage (Replied, Demo opened, or a call or proposal with Mehdi). Without
 * "May cold-call" a member calls only these (TRAI, spec 11.4).
 *
 * An open after a cold link is not engagement (3 Oct 2026, with the link in
 * the first message, hotfix-send-links-1002 D9): when the last message that
 * carried their demo link was a first message sent cold (linkWentCold), the
 * open says only that a stranger tapped a link we sent unasked, not that they
 * want a call, so it does not open the gate. useOutreach leaves such a lead at
 * Contacted for the same reason; a reply still opens it at once.
 */
export function isEngaged(lead: Partial<OutreachLead> | null | undefined, events: OutreachEvent[] | null | undefined): boolean {
  if (!lead) return false;
  if (lead.status && ["replied", "demo_opened", "call", "proposal", "won"].includes(lead.status)) return true;
  const own = (events || []).filter((e) => e.leadId === lead.id);
  if (own.some((e) => e.type === "replied")) return true;
  return own.some((e) => e.type === "demo_opened") && !linkWentCold(lead.id || "", own);
}

/**
 * True when the LATEST message that carried this lead's demo link was a cold
 * first message (a twin with their sample's link, templates.ts link "demo"),
 * not the link after a yes. The one rule for "an open after a cold link"
 * (lib/outreach/linkChoice.ts re-exports it for the compose screen and
 * useOutreach); here because the cold-call gate needs it and access.ts must
 * stay free of linkChoice's demo-record imports.
 */
export function linkWentCold(leadId: string, events: Pick<OutreachEvent, "leadId" | "type" | "templateId" | "at">[]): boolean {
  const last = events
    .filter((e) => e.leadId === leadId && e.type === "sent" && Boolean(getTemplate(e.templateId)?.body.includes("{demoLink}")))
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  return getTemplate(last?.templateId)?.link === "demo";
}

/** The compose stages a member is offered: never After the call or Proposal (money is Mehdi's). */
export function memberStages(): PlainStage[] {
  return ["first", "after_yes", "follow_up", "closing"];
}

/** True when a sent line at this stage or template is Mehdi's alone (the history guard's money test). */
export function isMoneyLine(ev: { stage?: string | null; templateId?: string | null }): boolean {
  return (MONEY_STAGES as readonly string[]).includes(ev.stage || "") || MONEY_TEMPLATE_RE.test(ev.templateId || "");
}

/* ── Masking in lists (members): the lead page shows the number, and logs it ── */

/** "+919810012345" to "+91 98100 •••45". */
export function maskPhone(p?: string | null): string {
  const raw = (p || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (/^\+?91\d{10}$/.test(raw.replace(/[\s-]/g, "")) && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} •••${digits.slice(-2)}`;
  }
  if (digits.length <= 4) return "•".repeat(digits.length);
  const keep = Math.min(5, Math.max(1, digits.length - 5));
  return `${raw.startsWith("+") ? "+" : ""}${digits.slice(0, keep)} •••${digits.slice(-2)}`;
}

/** "office@school.example" to "of•••@school.example". */
export function maskEmail(e?: string | null): string {
  const raw = (e || "").trim();
  if (!raw) return "";
  const at = raw.lastIndexOf("@");
  if (at < 1) return raw.slice(0, 1) + "•••";
  const local = raw.slice(0, at);
  return `${local.slice(0, local.length > 2 ? 2 : 1)}•••${raw.slice(at)}`;
}

/* ── crm_me, from a team row ─────────────────────────────────────────────── */

/**
 * What crm_me() answers for this row (the local store's emulation of it).
 * `hostPhone` is Mehdi's own sender_phone, for "Tell Mehdi on WhatsApp".
 */
export function meFromMember(m: CrmMember | null | undefined, hostPhone?: string): CrmMe {
  if (!m) return noAccessMe("not_a_member");
  if (!m.active) return noAccessMe("deactivated", m.displayName);
  const owner = m.role === "owner";
  return {
    legacy: false,
    memberId: m.id,
    role: m.role,
    email: m.email,
    displayName: m.displayName,
    viewAll: owner || m.role === "admin" || Boolean(m.viewAll),
    canAddLeads: owner || m.role === "admin" || Boolean(m.canAddLeads),
    mayColdCall: owner || Boolean(m.mayColdCall),
    waDailyLimit: m.waDailyLimit ?? null,
    newLeadCap: m.newLeadCap,
    targets: m.targets || {},
    senderName: m.senderName,
    senderPhone: m.senderPhone,
    senderChecked: owner || Boolean(m.senderCheckedAt),
    signature: m.signature,
    hostWhatsapp: hostPhone || undefined,
    mustChangePassword: Boolean(m.mustChangePassword) && !owner,
  };
}

/* ── The shape anyone but Mehdi writes (both guards) ────────────────────── */

/** private.crm_phone_key: a number's last ten digits (at least 7 digits), however it is written. */
export function phoneKey(v: unknown): string | null {
  const s = typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
  const d = s.replace(/\D/g, "");
  return d.length >= 7 ? d.slice(-10) : null;
}

/** private.crm_email_key: an e-mail without case or outer spaces. */
export function emailKey(v: unknown): string | null {
  const e = (typeof v === "string" ? v : "").replace(/^ +| +$/g, "").toLowerCase();
  return e || null;
}

const DATE_MIN = Date.parse("2000-01-01T00:00:00.000Z");
const DATE_MAX = Date.parse("2100-01-01T00:00:00.000Z");

/**
 * The field guard's shape test for anyone but Mehdi: every value is text,
 * tags a list of texts, a coded field one of LEAD_VALUES, a date a real date
 * (stored as the app's own ISO text), and the institute keeps a name. One
 * number or object where text belongs would break the CRM's pages for
 * everyone. `old` is the stored data on a change (only keys that changed are
 * looked at), null on an insert. Returns the data with its dates rewritten.
 */
export function guardLeadShape(data: Record<string, unknown>, old: Record<string, unknown> | null): Record<string, unknown> {
  const out = { ...data };
  for (const [k, v] of Object.entries(data)) {
    if (old && sameJson(old[k], v)) continue;
    if (v === null || v === undefined) continue;
    if (k === "tags") {
      if (!Array.isArray(v) || v.some((t) => typeof t !== "string")) refuse("22023", 'crm: "tags" must be a list of words');
      continue;
    }
    if (typeof v !== "string") refuse("22023", `crm: "${k}" must be text`);
    const allowed = (LEAD_VALUES as Readonly<Record<string, readonly string[]>>)[k];
    if (allowed && !allowed.includes(v)) refuse("22023", `crm: "${k}" must be one of: ${allowed.join(", ")}`);
    if (DATE_KEYS.includes(k)) {
      const t = Date.parse(v);
      if (Number.isNaN(t) || t < DATE_MIN || t >= DATE_MAX) refuse("22023", `crm: "${k}" must be a date`);
      out[k] = new Date(t).toISOString();
    }
  }
  if (blank(out.instituteName) && (!old || !blank(old.instituteName))) refuse("23514", "crm: a lead needs the institute's name");
  return out;
}

/** The history guard's shape test for anyone but Mehdi: text only, coded fields from EVENT_VALUES. */
export function guardEventShape(ev: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(ev)) {
    if (v === null || v === undefined) continue;
    if (typeof v !== "string") refuse("22023", `crm: "${k}" on a history line must be text`);
    const allowed = (EVENT_VALUES as Readonly<Record<string, readonly string[]>>)[k];
    if (allowed && !allowed.includes(v)) refuse("22023", `crm: "${k}" on a history line must be one of: ${allowed.join(", ")}`);
  }
}

/** The refusals of a duplicate contact: neither the school nor whose it is (crm_find_duplicate says that, and counts). */
export const DUPLICATE_ON_ADD = "crm: this phone number or e-mail already belongs to a lead in the CRM. Ask Mehdi before adding it again.";
export const DUPLICATE_ON_FILL = "crm: this phone number or e-mail already belongs to another lead in the CRM. Ask Mehdi before using it here.";
/** A member without "Can add leads" (asked first, before anything that could say whether a number is in the CRM). */
export const NO_ADDING = "crm: adding leads is not switched on for you. Ask Mehdi.";
/** A member asking for one of Mehdi's call times (phase 2). */
export const NO_BOOKING_YET = "crm: booking a call time comes later. Hand the lead over without a time; Mehdi sets the call.";
/**
 * A member's new lead never passes for one from Meta's forms (the field
 * guard's member INSERT branch): an id starting "ol_meta_" (it would take a
 * future Meta lead's place) and a source from META_SOURCES are refused, both
 * without case, and every meta... key is dropped.
 */
export const META_ID_REFUSED = "crm: ids starting with ol_meta_ are kept for leads from Facebook and Instagram forms. Add your lead without one.";
export const META_SOURCE_REFUSED = "crm: that source is kept for leads from Facebook and Instagram forms. Pick another source.";
/**
 * The history guard's refusal of a WhatsApp message or a call to a lead from a
 * Meta form who left its WhatsApp-and-phone box unticked (metaConsent "no"),
 * for everyone, Mehdi included. crmErrorText turns it into engine.ts's
 * NO_META_CONSENT, the sentence the screens show where they stop it.
 */
export const META_CONSENT_REFUSED = "crm: they did not tick the box on the Facebook or Instagram form that allows WhatsApp and calls. E-mail them only.";

/** The id a Meta lead has (META_LEAD_ID_PREFIX), without case: left(lower(id), 8) in the guard. */
export function looksLikeMetaId(id: unknown): boolean {
  return typeof id === "string" && id.toLowerCase().startsWith(META_LEAD_ID_PREFIX);
}

/** A text on its letters only: no case, no spaces of any kind, no invisible characters, no punctuation. */
const lettersOnly = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const META_SOURCE_LETTERS = META_SOURCES.map(lettersOnly);

/**
 * A source from META_SOURCES, compared on its letters only (the guard's
 * regexp_replace(lower(translate(source, 'K', 'k')), '[^a-z]', '', 'g'); review,
 * 3 Oct): the dashboard and the Source filter read "Meta Lead Ads" with a no-break
 * space, a tab or a line break around it as "meta lead ads", so nothing like it
 * may pass. "Instagram", "Manual" and "Meta Lead Ads (old campaign)" are not Meta sources.
 */
export function isMetaSourceText(source: unknown): boolean {
  if (typeof source !== "string") return false;
  return META_SOURCE_LETTERS.includes(lettersOnly(source));
}

/** True for a key only Meta's intake writes (metaLeadId, metaConsent, ...): lower(key) like 'meta%' in the guard. */
export function isMetaKey(key: string): boolean {
  return key.toLowerCase().startsWith("meta");
}

/* ── The field guard (private.crm_leads_guard) ──────────────────────────── */

const NO_ACCESS = "crm: you do not have access to the CRM";

/**
 * The guard on an UPDATE that row security already let through: `before` is
 * the stored lead, `proposed` the whole new data. Returns the lead as it will
 * be stored (the server's id, updatedAt and closing date; a member's touch
 * dated now), or throws the database's refusal. Columns (who it belongs to)
 * are kept from `before`: only assignLeads, a hand-over or a share-out move them.
 * `all` (every lead in the team) lets a member's filled-in number or e-mail be
 * checked against the others, as the database does.
 */
export function guardLeadUpdate(me: CrmMe, before: OutreachLead, proposed: Record<string, unknown>, now = new Date(), all?: OutreachLead[]): OutreachLead {
  const role = me?.role;
  if (!role) refuse("42501", NO_ACCESS);
  if (role !== "owner" && jsonBytes(proposed) > LEAD_MAX_BYTES) {
    refuse("22001", "crm: that lead is too large (32 KB at most). Put long text in a note.");
  }
  const iso = now.toISOString();
  const old = leadData(before);
  let next: Record<string, unknown> = { ...leadData(proposed), id: before.id, updatedAt: iso };
  if (role !== "owner") next = guardLeadShape(next, old);
  const oldS = String(old.status || "new");
  const newS = String(next.status || "new");
  if (newS !== oldS && role !== "owner") {
    if (["proposal", "won"].includes(newS) || ["proposal", "won"].includes(oldS)) {
      refuse("42501", "crm: only Mehdi moves a lead to or from Proposal and Won");
    }
    if (oldS === "do_not_contact") refuse("42501", "crm: only Mehdi can take a lead off Do not contact");
    if (role === "member" && (newS === "call" || oldS === "call")) {
      refuse("42501", 'crm: only Mehdi moves a lead to Call. If they want a call, use "Hand to Mehdi".');
    }
  }
  if (role === "owner" || role === "admin") {
    // A demo linked to someone else's open lead is their next step, now.
    if (!sameJson(next.demoId, old.demoId) && !blank(next.demoId) && before.assigneeId
        && before.assigneeId !== me.memberId && isOpenStatus(newS)) {
      next.nextActionAt = iso;
    }
  } else {
    if (newS === "lost" && oldS !== "lost" && blank(next.lostReason)) refuse("23514", "crm: say why the lead is lost");
    for (const k of MEMBER_APPEND_KEYS) {
      if (sameJson(next[k], old[k]) || blank(old[k])) continue;
      if (typeof next[k] !== "string" || !(next[k] as string).startsWith(String(old[k]))) {
        refuse("42501", `crm: ${k} only grow: add to them, never replace them. Only Mehdi or an admin rewrites them.`);
      }
    }
    const keys = [...new Set([...Object.keys(old), ...Object.keys(next)])];
    for (const k of keys) {
      if (k === "id" || k === "updatedAt") continue;
      if (MEMBER_FREE_KEYS.includes(k) || MEMBER_APPEND_KEYS.includes(k)) continue;
      if (sameJson(old[k], next[k])) continue;
      if (MEMBER_FILL_KEYS.includes(k) && blank(old[k]) && !blank(next[k])) continue;
      refuse("42501", `crm: only Mehdi or an admin can change "${k}" on a lead. Add a note instead.`);
    }
    // A number or e-mail filled in must not be another lead's (one school, one lead).
    const filled = (k: string) => blank(old[k]) && !blank(next[k]);
    if (all && (filled("phone") || filled("whatsapp") || filled("email"))) {
      const q = {
        phone: blank(old.phone) ? next.phone : undefined,
        whatsapp: blank(old.whatsapp) ? next.whatsapp : undefined,
        email: blank(old.email) ? next.email : undefined,
        excludeId: before.id,
      };
      if (duplicateOf(all, q)) refuse("23505", DUPLICATE_ON_FILL);
    }
    // A touch is dated by the server: a member cannot backdate or erase one.
    if (!sameJson(next.lastContactedAt, old.lastContactedAt)) next.lastContactedAt = iso;
  }
  let closedAt = before.closedAt;
  if (isOpenStatus(newS)) closedAt = undefined;
  else if (isOpenStatus(oldS)) closedAt = iso;
  const out = { ...(next as unknown as OutreachLead), ...columnsOf(before) };
  if (closedAt) out.closedAt = closedAt;
  else delete out.closedAt;
  return out;
}

/**
 * A change to a lead, as crm_patch_lead applies it: the lead must be the
 * caller's to change (else P0002, as the database says when no row matched),
 * then the field guard. A key set to undefined (or null) in the patch is
 * removed. Returns the lead as it will be stored.
 */
export function guardPatch(me: CrmMe, before: OutreachLead, patch: Partial<OutreachLead>, now = new Date(), all?: OutreachLead[]): OutreachLead {
  if (!canEditLead(me, before, now)) refuse("P0002", "crm: this lead is not yours, or it was deleted");
  return guardLeadUpdate(me, before, applyPatch(before, patch), now, all);
}

/** A lead already holding a contact (private.crm_duplicate_of): the most recently changed one. */
export interface DuplicateOf {
  lead: OutreachLead;
  assigneeName: string;
}

/**
 * The lead already holding this phone, WhatsApp or e-mail, across the WHOLE
 * team, whoever may read it. Numbers are compared on their last ten digits
 * (phoneKey: "098100 00002" is +919810000002), e-mails without case or outer
 * spaces (emailKey), as private.crm_duplicate_of does. `nameOf` names the assignee.
 */
export function duplicateOf(
  leads: OutreachLead[],
  q: { phone?: unknown; whatsapp?: unknown; email?: unknown; excludeId?: string | null },
  nameOf: (id: string | null | undefined) => string | undefined = () => undefined,
): DuplicateOf | null {
  const ph = phoneKey(q.phone);
  const wa = phoneKey(q.whatsapp);
  const em = emailKey(q.email);
  if (!ph && !wa && !em) return null;
  const isAsked = (k: string | null) => Boolean(k && (k === ph || k === wa));
  const hit = leads
    .filter((l) => l.id !== q.excludeId)
    .filter((l) => isAsked(phoneKey(l.phone)) || isAsked(phoneKey(l.whatsapp)) || Boolean(em && emailKey(l.email) === em))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
  if (!hit) return null;
  return { lead: hit, assigneeName: (hit.assigneeId && nameOf(hit.assigneeId)) || (hit.assigneeId ? "someone in the team" : "Unassigned") };
}

/**
 * private.crm_check_assignee: raises unless `m` is an active team member who
 * can take `add` more leads. For a member: New leads within new_lead_cap, open
 * leads within 1,000, and none at Call or Proposal (those stay with Mehdi).
 * `held` is what they hold now.
 */
export function checkAssignee(
  m: CrmMember | null | undefined,
  held: { newLeads: number; openLeads: number },
  add: { newLeads?: number; openLeads?: number; mehdis?: number },
): void {
  if (!m || !m.active) refuse("22023", "crm: that person is not an active team member");
  if (m.role !== "member") return;
  if ((add.mehdis || 0) > 0) refuse("22023", `crm: ${add.mehdis} of these are at Call or Proposal. Those stay with Mehdi; untick them.`);
  if ((add.newLeads || 0) > 0 && held.newLeads + add.newLeads > m.newLeadCap) {
    refuse("22023", `crm: ${m.displayName} would have ${held.newLeads + add.newLeads} new leads waiting (nobody has written to them yet); the limit is ${m.newLeadCap}. Let them work some first, or raise it in Team.`);
  }
  if ((add.openLeads || 0) > 0 && held.openLeads + add.openLeads > OPEN_LEAD_CEILING) {
    refuse("22023", `crm: ${m.displayName} would hold ${held.openLeads + add.openLeads} open leads; nobody holds more than 1,000. Close their finished leads first.`);
  }
}

/**
 * The guard on an INSERT (a new lead), then the insert policy. `lead` is the
 * prepared lead, `all` every lead in the team (for the duplicate check),
 * `newCount` the New leads the caller holds now. A member's lead is theirs,
 * starts at New and carries no demo or pitch link; without "Can add leads"
 * it is refused before anything else, and it is refused when the contact is
 * already a lead anywhere (saying neither which nor whose) and at the New cap.
 * It never passes for a Meta lead: an ol_meta_ id or a Meta source is refused
 * and the meta... keys are dropped (Mehdi imports Meta's own files; the
 * intake adds the rest). Owner and admin add it Unassigned. `nameOf` is kept for callers; the
 * refusal no longer names anyone.
 */
export function guardNewLead(
  me: CrmMe,
  lead: OutreachLead,
  all: OutreachLead[],
  newCount: number,
  now = new Date(),
  nameOf: (id: string | null | undefined) => string | undefined = () => undefined,
): OutreachLead {
  void nameOf;
  const role = me?.role;
  if (!role) refuse("42501", NO_ACCESS);
  if (role === "member" && !me.canAddLeads) refuse("42501", NO_ADDING);
  const raw = leadData(lead);
  if (role !== "owner" && jsonBytes(raw) > LEAD_MAX_BYTES) {
    refuse("22001", "crm: that lead is too large (32 KB at most). Put long text in a note.");
  }
  const iso = now.toISOString();
  let data: Record<string, unknown> = { ...raw, id: lead.id, updatedAt: iso };
  if (role !== "owner") data = guardLeadShape(data, null);
  const cols: Partial<OutreachLead> = { createdById: me.memberId || undefined };
  if (role === "member") {
    // Never a lead that passes for one from Meta's forms: the id and the source are refused, the meta... keys go.
    if (looksLikeMetaId(lead.id)) refuse("42501", META_ID_REFUSED);
    if (isMetaSourceText(data.source)) refuse("42501", META_SOURCE_REFUSED);
    for (const k of Object.keys(data)) if (isMetaKey(k)) delete data[k];
    for (const k of ["demoId", "demoSlug", "pitchSlug", "assignedTo"]) delete data[k];
    data.createdAt = iso;
    data.status = "new";
    if (duplicateOf(all, { phone: data.phone, whatsapp: data.whatsapp, email: data.email, excludeId: lead.id })) {
      refuse("23505", DUPLICATE_ON_ADD);
    }
    if (newCount >= me.newLeadCap) {
      refuse("22023", `crm: you already have ${me.newLeadCap} new leads waiting, your limit. Send their first messages first, or ask Mehdi to raise it.`);
    }
    const open = heldBy(all, me.memberId as string).openLeads;
    if (open + 1 > OPEN_LEAD_CEILING) {
      refuse("22023", `crm: ${me.displayName} would hold ${open + 1} open leads; nobody holds more than 1,000. Close their finished leads first.`);
    }
    cols.assigneeId = me.memberId;
    cols.assignedAt = iso;
    cols.assignedById = me.memberId || undefined;
  } else {
    if (blank(data.createdAt)) data.createdAt = iso;
    cols.assigneeId = null;
  }
  if (!isOpenStatus(String(data.status || "new"))) cols.closedAt = iso;
  return { ...(data as unknown as OutreachLead), ...cols };
}

/* ── The history guard (private.crm_events_guard) ───────────────────────── */

/**
 * A history line as the database stores it: written by the caller (actorId),
 * dated now (a "demo opened" line keeps the prospect's open time when it is
 * at most 30 days old and not in the future). Refused: a line over 20 KB; a
 * "sent" line on a Do-not-contact lead; a WhatsApp message or a call to a lead
 * from a Meta form whose box was left unticked (META_CONSENT_REFUSED, e-mail
 * stays open), from anyone; and for anyone but Mehdi a line over
 * 4 KB, a type the database writes itself, a "... to Won/Proposal" status line,
 * an after-call summary or proposal, and a lead that is not theirs.
 */
export function stampEvent(me: CrmMe, ev: OutreachEvent, lead: OutreachLead | undefined | null, now = new Date()): OutreachEvent {
  if (jsonBytes(ev) > EVENT_MAX_BYTES) refuse("22001", "crm: that history line is too long");
  const role = me?.role;
  if (!role) refuse("42501", NO_ACCESS);
  const type = (ev.type || "note") as OutreachEventType;
  let at = now.toISOString();
  if (type === "demo_opened") {
    const t = Date.parse(ev.at || "");
    if (!Number.isNaN(t) && t <= now.getTime() && t >= now.getTime() - DEMO_OPEN_MAX_AGE_DAYS * DAY_MS) at = new Date(t).toISOString();
  }
  if (role !== "owner") {
    if (jsonBytes(ev) > MEMBER_EVENT_MAX_BYTES) refuse("22001", "crm: that history line is too long (4 KB at most)");
    if (!MEMBER_EVENT_TYPES.includes(type)) refuse("42501", `crm: the CRM writes "${type}" lines itself`);
    guardEventShape(ev as unknown as Record<string, unknown>);
    if (type === "status" && WIN_STATUS_LINE_RE.test(ev.detail || "")) refuse("42501", "crm: only Mehdi moves a lead to Proposal or Won");
    if (type === "sent" && isMoneyLine(ev)) {
      refuse("42501", "crm: the after-call summary and the proposal are Mehdi's (they carry the price). Hand the lead to him.");
    }
  }
  const out: OutreachEvent = { ...ev, id: ev.id, leadId: ev.leadId, type, at };
  if (me.memberId) out.actorId = me.memberId;
  else delete out.actorId;
  if (type === "sent" && lead?.status === "do_not_contact") {
    refuse("42501", "crm: this lead asked not to be contacted. Nothing may be sent.");
  }
  if ((type === "sent" || type === "call") && lead?.metaConsent === "no") {
    const line = ev as unknown as Record<string, unknown>;
    const channel = typeof line.channel === "string" ? line.channel : "";
    const templateId = typeof line.templateId === "string" ? line.templateId : "";
    if (type === "call" || channel === "whatsapp" || channel === "call" || templateId.startsWith("wa_")) refuse("42501", META_CONSENT_REFUSED);
  }
  // The insert policy: staff, or a lead the member reads (within the window).
  if (!isStaffRole(role) && !memberReads(me.memberId, lead, now)) rlsRefusal("outreach_events");
  return out;
}

/* ── Sharing out and rules (crm_distribute, crm_apply_rules) ────────────── */

/** One person in a share-out: New leads waiting (queue), open leads held, their New cap. */
export interface SharePerson {
  id: string;
  queue: number;
  open: number;
  cap: number;
  isMember: boolean;
}

/** createdAt (missing last), then id: the order the database walks the leads in. */
function byCreatedThenId(a: OutreachLead, b: OutreachLead): number {
  const ca = a.createdAt || "";
  const cb = b.createdAt || "";
  if (ca !== cb) {
    if (!ca) return 1;
    if (!cb) return -1;
    return ca < cb ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The people of a share-out as crm_distribute counts them: in the order
 * picked (a repeat counts once), active only; New leads waiting and open
 * leads held, NOT counting the leads being shared out. A member's cap is
 * their New-lead cap; Mehdi and admins have none. People not active are left
 * out (the database refuses the whole share-out then; see distributeLeads).
 */
export function sharePeople(leads: OutreachLead[], members: CrmMember[], memberIds: string[], leadIds: string[]): SharePerson[] {
  const except = new Set(leadIds);
  const seen = new Set<string>();
  const out: SharePerson[] = [];
  for (const id of memberIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const m = members.find((x) => x.id === id);
    if (!m || !m.active) continue;
    const held = heldBy(leads, id, except);
    const isMember = m.role === "member";
    out.push({ id, queue: held.newLeads, open: isMember ? held.openLeads : held.openLeads - 1000000, cap: isMember ? m.newLeadCap : 1000000, isMember });
  }
  return out;
}

/**
 * crm_distribute, as a plan. Only open leads nobody has written to (New) are
 * shared out, unless includeContacted; leads at Call or Proposal never are,
 * and closed leads stay where they are. "balanced" gives each lead to whoever
 * has the fewest New leads waiting plus what this share-out already gave them
 * (a tie goes to the one picked first); "round_robin" deals them in turn.
 * Nobody passes their New cap or 1,000 open leads.
 *
 * plan: lead id to person, or null for a lead left over because of caps.
 * skipped: already contacted (and not included), at Call or Proposal (Mehdi's),
 * closed. noDemo: leads in the plan with no demo linked (make demos first).
 */
export function planDistribution(
  leads: OutreachLead[],
  people: SharePerson[],
  mode: DistributeMode,
  includeContacted: boolean,
): { plan: Map<string, string | null>; skipped: { contacted: number; mehdis: number; closed: number }; noDemo: number } {
  const plan = new Map<string, string | null>();
  const skipped = { contacted: 0, mehdis: 0, closed: 0 };
  const queue = people.map((p) => p.queue);
  const open = people.map((p) => p.open);
  const load = people.map((p) => p.queue);
  const n = people.length;
  let nextRr = 0;
  let noDemo = 0;
  const walk: OutreachLead[] = [];
  for (const l of leads) {
    const s = l.status || "new";
    if (!isOpenStatus(s)) skipped.closed++;
    else if (MEHDI_STATUSES.includes(s)) skipped.mehdis++;
    else if (s !== "new" && !includeContacted) skipped.contacted++;
    else walk.push(l);
  }
  walk.sort(byCreatedThenId);
  for (const l of walk) {
    const isNew = (l.status || "new") === "new";
    const fits = (i: number) => (!isNew || queue[i] < people[i].cap) && open[i] < OPEN_LEAD_CEILING;
    let best = -1;
    if (mode === "balanced") {
      for (let i = 0; i < n; i++) if (fits(i) && (best < 0 || load[i] < load[best])) best = i;
    } else {
      for (let j = 0; j < n; j++) {
        const i = (nextRr + j) % n;
        if (fits(i)) {
          best = i;
          nextRr = (i + 1) % n;
          break;
        }
      }
    }
    if (best < 0) {
      plan.set(l.id, null);
      continue;
    }
    plan.set(l.id, people[best].id);
    if (isNew) queue[best]++;
    open[best]++;
    load[best]++;
    if (!l.demoId && !l.demoSlug) noDemo++;
  }
  return { plan, skipped, noDemo };
}

/** One person as the rules see them (crm_apply_rules re-counts after every lead it gives). */
export interface RulePerson extends SharePerson {
  active: boolean;
}

/**
 * crm_apply_rules, as a plan, with whose turn it is in each rule afterwards.
 * Only Unassigned open leads, New ones unless includeContacted, never Call or
 * Proposal. Rules by priority (then id); a rule fits on kind (or any) and
 * "city contains" (or any); inside a rule, the next person in turn who is
 * active and under their caps. A lead no rule fits stays Unassigned.
 */
export function planRulesDetailed(
  leads: OutreachLead[],
  rules: AssignmentRule[],
  people: RulePerson[],
  includeContacted: boolean,
): { plan: Map<string, string>; nextIndex: Map<number, number> } {
  const plan = new Map<string, string>();
  const nextIndex = new Map<number, number>(rules.map((r) => [r.id, r.nextIndex || 0]));
  const state = new Map(people.map((p) => [p.id, { ...p }]));
  const ordered = rules.filter((r) => r.active).sort((a, b) => a.priority - b.priority || a.id - b.id);
  const walk = leads
    .filter((l) => !l.assigneeId && isOpenStatus(l.status) && !MEHDI_STATUSES.includes(l.status || "new"))
    .filter((l) => (l.status || "new") === "new" || includeContacted)
    .sort(byCreatedThenId);
  for (const l of walk) {
    const isNew = (l.status || "new") === "new";
    const kind = l.kind || "other";
    const city = (l.city || "").toLowerCase();
    let pick: string | null = null;
    for (const r of ordered) {
      if (r.kind && r.kind !== kind) continue;
      if (r.city && !city.includes(r.city.trim().toLowerCase())) continue;
      const count = r.memberIds.length;
      const start = nextIndex.get(r.id) || 0;
      for (let i = 0; i < count; i++) {
        const cand = r.memberIds[(start + i) % count];
        const p = state.get(cand);
        if (!p || !p.active) continue;
        if (p.isMember && !((!isNew || p.queue < p.cap) && p.open < OPEN_LEAD_CEILING)) continue;
        pick = cand;
        nextIndex.set(r.id, (start + i + 1) % count);
        break;
      }
      if (pick) break;
    }
    if (!pick) continue;
    plan.set(l.id, pick);
    const p = state.get(pick);
    if (p) {
      if (isNew) p.queue++;
      p.open++;
    }
  }
  return { plan, nextIndex };
}

/** crm_apply_rules, as a plan: lead id to person. */
export function planRules(leads: OutreachLead[], rules: AssignmentRule[], people: RulePerson[], includeContacted: boolean): Map<string, string> {
  return planRulesDetailed(leads, rules, people, includeContacted).plan;
}

/** The people as the rules count them: every team row, with what they hold now. */
export function rulePeople(leads: OutreachLead[], members: CrmMember[]): RulePerson[] {
  return members.map((m) => {
    const held = heldBy(leads, m.id);
    const isMember = m.role === "member";
    return { id: m.id, queue: held.newLeads, open: held.openLeads, cap: isMember ? m.newLeadCap : 1000000, isMember, active: m.active };
  });
}

/* ── Numbers and lists the database computes (one answer for every screen) ── */

/** The stage of a sent line as crm_activity_stats reads it: its own, else "first" from a first-message template id. */
export function sentStage(ev: Pick<OutreachEvent, "stage" | "templateId">): string | undefined {
  return ev.stage || (/^(wa|em)_first_/.test(ev.templateId || "") ? "first" : undefined);
}

export interface StatsInput {
  me: CrmMe;
  members: CrmMember[];
  leads: OutreachLead[];
  events: OutreachEvent[];
  requests: CrmRequest[];
  from: Date;
  to: Date;
  now?: Date;
}

/**
 * crm_activity_stats: numbers per person between from and to, from the
 * server-dated history. The owner and admins get every person; a member gets
 * their own row; no access, nothing. Owner first, then active, then by name.
 */
export function computeActivityStats(input: StatsInput): MemberStats[] {
  const { me, members, leads, events, requests, from, to } = input;
  const now = input.now || new Date();
  if (!me || !me.role) return [];
  const team = isStaffRole(me.role) ? members : members.filter((m) => m.id === me.memberId);
  const ids = new Set(team.map((m) => m.id));
  const t0 = from.getTime();
  const t1 = to.getTime();
  const inPeriod = events.filter((e) => e.actorId && ids.has(e.actorId) && Date.parse(e.at) >= t0 && Date.parse(e.at) < t1);
  const repliedAt = new Map<string, number[]>();
  for (const e of events) if (e.type === "replied") repliedAt.set(e.leadId, [...(repliedAt.get(e.leadId) || []), Date.parse(e.at)]);
  const dayStart = istStartOfDay(now).getTime();
  const rows = team.map((m): MemberStats => {
    const mine = inPeriod.filter((e) => e.actorId === m.id);
    const firstWa = mine.filter((e) => e.type === "sent" && e.channel === "whatsapp" && sentStage(e) === "first");
    const held = leads.filter((l) => l.assigneeId === m.id);
    const open = held.filter((l) => isOpenStatus(l.status));
    const lastActive = mine.reduce((max, e) => (e.at > max ? e.at : max), "");
    return {
      memberId: m.id,
      displayName: m.displayName,
      role: m.role as CrmRole,
      active: m.active,
      firstWhatsapp: firstWa.length,
      firstEmail: mine.filter((e) => e.type === "sent" && e.channel === "email" && sentStage(e) === "first").length,
      followUps: mine.filter((e) => e.type === "sent" && sentStage(e) !== "first").length,
      calls: mine.filter((e) => e.type === "call").length,
      callsConnected: mine.filter((e) => e.type === "call" && (e.outcome || "").startsWith("connected")).length,
      replies: mine.filter((e) => e.type === "replied").length,
      handoffs: mine.filter((e) => e.type === "handoff").length,
      notes: mine.filter((e) => e.type === "note").length,
      unansweredFirstWhatsapp: firstWa.filter((e) => !(repliedAt.get(e.leadId) || []).some((t) => t > Date.parse(e.at))).length,
      openLeads: open.length,
      newLeads: held.filter((l) => (l.status || "new") === "new").length,
      overdue: open.filter((l) => l.nextActionAt && Date.parse(l.nextActionAt) < dayStart).length,
      untouched: open.filter((l) => {
        const at = l.assignedAt ? Date.parse(l.assignedAt) : NaN;
        if (Number.isNaN(at) || at >= now.getTime() - DAY_MS) return false;
        return !events.some((e) => e.leadId === l.id && e.actorId === m.id && Date.parse(e.at) >= at);
      }).length,
      wonCredited: leads.filter((l) => l.qualifiedById === m.id && l.status === "won").length,
      handoffsConfirmed: requests.filter((r) => r.kind === "handoff" && r.outcome === "accepted" && r.askedBy === m.id
        && r.resolvedAt && Date.parse(r.resolvedAt) >= t0 && Date.parse(r.resolvedAt) < t1).length,
      lastActiveAt: lastActive || undefined,
      lastSeenAt: m.lastSeenAt,
    };
  });
  return rows.sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner") || Number(b.active) - Number(a.active)
    || a.displayName.localeCompare(b.displayName));
}

/**
 * crm_leads_overview: leads WITHOUT contacts. Every lead for the owner, admins
 * and See all; for any member also the leads they handed over (qualified).
 * Newest change first.
 */
export function overviewRows(me: CrmMe, leads: OutreachLead[], nameOf: (id: string | null | undefined) => string | undefined = () => undefined): LeadOverview[] {
  if (!me || !me.role) return [];
  return leads
    .filter((l) => me.viewAll || (me.memberId && l.qualifiedById === me.memberId))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .map((l) => ({
      id: l.id,
      instituteName: l.instituteName,
      kind: l.kind,
      city: l.city,
      status: l.status,
      assigneeId: l.assigneeId ?? null,
      assigneeName: l.assigneeId ? nameOf(l.assigneeId) : undefined,
      qualifiedById: l.qualifiedById ?? null,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      nextActionAt: l.nextActionAt,
      lastContactedAt: l.lastContactedAt,
    }));
}

/**
 * crm_access_summary (the owner's Team > Access tab): per person per
 * India-time day, from the audit trail and the history. A day is flagged when
 * distinct leads opened exceed 3 times the leads worked (at least 15), any
 * view falls outside 09:00-21:00, a claim was flagged, there was an export,
 * or the log is being filled: more than 20 sign-ins, or more than 200 lines
 * written through the access log.
 */
export function accessSummaryRows(audit: CrmAuditLine[], events: OutreachEvent[], members: CrmMember[], from: Date, to: Date): AccessDay[] {
  const t0 = from.getTime();
  const t1 = to.getTime();
  const within = (at: string) => Date.parse(at) >= t0 && Date.parse(at) < t1;
  const worked = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.actorId || !within(e.at)) continue;
    const key = `${e.actorId}|${istDay(e.at)}`;
    worked.set(key, (worked.get(key) || new Set()).add(e.leadId));
  }
  const groups = new Map<string, CrmAuditLine[]>();
  for (const a of audit) {
    if (!a.actorId || !within(a.at)) continue;
    const key = `${a.actorId}|${istDay(a.at)}`;
    groups.set(key, [...(groups.get(key) || []), a]);
  }
  const out: AccessDay[] = [];
  for (const [key, lines] of groups) {
    const [memberId, day] = key.split("|");
    const m = members.find((x) => x.id === memberId);
    if (!m || m.role === "owner") continue;
    const views = lines.filter((a) => a.action === "lead.view" || a.action === "contact.reveal");
    const distinct = new Set(views.map((a) => a.leadId).filter(Boolean)).size;
    const leadsWorked = worked.get(key)?.size || 0;
    const exports = lines.filter((a) => a.action === "export").length;
    const offHours = views.filter((a) => istHour(a.at) < 9 || istHour(a.at) >= 21).length;
    const flagged = lines.filter((a) => (a.detail || {}).flag === "not_visible").length;
    const signIns = lines.filter((a) => a.action === "sign_in").length;
    const logged = lines.filter((a) => LOGGED_ACTIONS.includes(a.action)).length;
    out.push({
      memberId,
      displayName: m.displayName,
      day,
      leadViews: views.length,
      distinctLeadsViewed: distinct,
      leadsWorked,
      contactChanges: lines.filter((a) => a.action === "lead.update"
        && ["phone", "whatsapp", "email", "contactName"].some((k) => k in (a.detail || {}))).length,
      exports,
      imports: lines.filter((a) => a.action === "import").length,
      signIns,
      viewsOffHours: offHours,
      flaggedClaims: flagged,
      suspicious: distinct > Math.max(3 * leadsWorked, 15) || offHours > 0 || flagged > 0 || exports > 0
        || signIns > ACCESS_FLAG_SIGN_INS || logged > ACCESS_FLAG_LOGGED,
    });
  }
  return out.sort((a, b) => b.day.localeCompare(a.day) || a.displayName.localeCompare(b.displayName));
}

/**
 * crm_team: names for labels and history lines, never e-mails. The owner and
 * admins get everyone; a member gets Mehdi and the active admins, themselves,
 * and the people named on their own leads and history.
 */
export function teamNamesFor(me: CrmMe, members: CrmMember[], leads: OutreachLead[], events: OutreachEvent[]): CrmTeamName[] {
  if (!me || !me.role) return [];
  let rows = members;
  if (!isStaffRole(me.role)) {
    const mine = leads.filter((l) => l.assigneeId === me.memberId);
    const named = new Set<string>();
    for (const l of mine) for (const id of [l.createdById, l.assignedById, l.qualifiedById]) if (id) named.add(id);
    const mineIds = new Set(mine.map((l) => l.id));
    for (const e of events) if (e.actorId && mineIds.has(e.leadId)) named.add(e.actorId);
    rows = members.filter((m) => m.id === me.memberId || ((m.role === "owner" || m.role === "admin") && m.active) || named.has(m.id));
  }
  return rows
    .map((m) => ({ id: m.id, displayName: m.displayName, role: m.role as CrmRole, active: m.active }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName));
}

/** How many New and open leads a person holds (private.crm_new_count, crm_open_count). */
export function heldBy(leads: OutreachLead[], memberId: string, except?: ReadonlySet<string>): { newLeads: number; openLeads: number } {
  let newLeads = 0;
  let openLeads = 0;
  for (const l of leads) {
    if (l.assigneeId !== memberId || except?.has(l.id)) continue;
    if ((l.status || "new") === "new") newLeads++;
    if (isOpenStatus(l.status)) openLeads++;
  }
  return { newLeads, openLeads };
}
