/**
 * THE CLIENT FILE'S RULES, LOCALLY (client-process-spec 8.4).
 *
 * Migration 0014 enforces these in the database (private.crm_documents_guard,
 * crm_payments_guard, crm_projects_guard, crm_events_stamp and
 * public.crm_issue_document). Local mode (and the tests) apply the SAME rules
 * from here, with the same sentences and the same SQLSTATEs, so a refusal the
 * live CRM would give is the one local mode gives:
 *   - a document is inserted only as a draft, and a draft carries no number,
 *     serial, year, series or issue date;
 *   - a document belongs to the client of its project;
 *   - an issued document changes only to cancelled, with a reason, and never
 *     when money or a receipt or credit note points at it; a cancelled one
 *     never changes; only drafts are deleted;
 *   - a payment goes only against an issued proforma or invoice of the same
 *     client and project, never moves, is never deleted, is voided only with a
 *     reason and only when no issued receipt points at it;
 *   - a project with an issued or cancelled document or a payment is never
 *     deleted (its timeline lines stay on the client);
 *   - the advance is billed once: one issued proforma for the advance (or a
 *     split advance's part 1), one for part 2 and one for each change
 *     request's advance per project, part 2 only with a split advance; one
 *     refunded in full by credit notes no longer counts;
 *   - the timeline's time is the store's clock, never the caller's, and a
 *     line belongs to the client of its project;
 *   - one client per lead;
 *   - the numbering of crm_issue_document: the India date's financial year,
 *     the first serial Mehdi set (below 1 read as 1), then
 *     greatest(counter, the largest serial of issued and cancelled documents)
 *     + 1; a refused issue spends nothing.
 *
 * Pure functions over a state object; the store calls them inside one
 * operation and saves only when nothing threw.
 */
import { CrmAccessError } from "@/lib/outreach/access";
import { addDays, formatNumber, fyOf, indiaDate, seriesOf } from "./numbering";
import type {
  ClientSettings,
  CrmClient,
  CrmClientEvent,
  CrmDocument,
  CrmPayment,
  CrmProject,
  Series,
} from "./types";

export interface Counter {
  series: Series;
  fy: string;
  lastSerial: number;
}

export interface RulesState {
  clients: CrmClient[];
  projects: CrmProject[];
  documents: CrmDocument[];
  payments: CrmPayment[];
  events: CrmClientEvent[];
  settings: ClientSettings | null;
  counters: Counter[];
}

const refuse = (code: string, message: string): never => {
  throw new CrmAccessError(code, message);
};

/** The table checks of 0014 (sizes in bytes of the JSON text). */
export const SIZE = { client: 64000, project: 128000, document: 64000, settings: 32000, event: 4000, detail: 2000 } as const;
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v ?? {})).length;
export function checkSize(what: keyof typeof SIZE, v: unknown): void {
  if (what === "detail") {
    if (typeof v === "string" && v.length > SIZE.detail) refuse("23514", "A timeline line is at most 2,000 characters.");
    return;
  }
  if (bytes(v) > SIZE[what]) refuse("23514", `This ${what} is too large to save (more than ${Math.round(SIZE[what] / 1000)} KB).`);
}

const ID_RE = { cl: /^cl_[A-Za-z0-9_-]{6,40}$/, pr: /^pr_[A-Za-z0-9_-]{6,40}$/, dc: /^dc_[A-Za-z0-9_-]{6,40}$/, py: /^py_[A-Za-z0-9_-]{6,40}$/ };
export function checkId(prefix: keyof typeof ID_RE, id: string): void {
  if (!ID_RE[prefix].test(id)) refuse("23514", `Not a valid id: ${id}`);
}

/* ── Clients and projects ───────────────────────────────────────────────── */

/** One client per lead (the unique index crm_clients_lead_idx). */
export function checkClientInsert(s: RulesState, c: CrmClient): void {
  checkId("cl", c.id);
  if (s.clients.some((x) => x.id === c.id)) refuse("23505", "This client already exists.");
  if (c.leadId && s.clients.some((x) => x.leadId === c.leadId)) refuse("23505", "This lead already has a client file: opening it.");
  checkSize("client", c);
}

export function checkProjectInsert(s: RulesState, p: CrmProject): void {
  checkId("pr", p.id);
  if (!s.clients.some((c) => c.id === p.clientId)) refuse("23503", "No such client.");
  if (s.projects.some((x) => x.id === p.id)) refuse("23505", "This project already exists.");
  checkSize("project", p);
}

/** private.crm_projects_guard: a project with an issued or cancelled document, or any payment, is closed, never deleted. */
export function checkProjectDelete(s: RulesState, projectId: string): void {
  if (s.documents.some((d) => d.projectId === projectId && d.status !== "draft") || s.payments.some((p) => p.projectId === projectId)) {
    refuse("42501", "This project has issued documents or payments: close it, never delete it.");
  }
}

/** Deleting a drafts-only project: its drafts go with it, its timeline lines stay on the client. */
export function deleteProject(s: RulesState, projectId: string): void {
  checkProjectDelete(s, projectId);
  s.documents = s.documents.filter((d) => d.projectId !== projectId);
  s.events = s.events.map((e) => (e.projectId === projectId ? { ...e, projectId: null } : e));
  s.projects = s.projects.filter((p) => p.id !== projectId);
}

/** A client is deleted only when nothing restricts it (its projects, documents and payments). Its timeline goes with it. */
export function deleteClient(s: RulesState, clientId: string): void {
  if (s.projects.some((p) => p.clientId === clientId) || s.documents.some((d) => d.clientId === clientId) || s.payments.some((p) => p.clientId === clientId)) {
    refuse("23503", "This client has projects, documents or payments: it cannot be deleted.");
  }
  s.events = s.events.filter((e) => e.clientId !== clientId);
  s.clients = s.clients.filter((c) => c.id !== clientId);
}

/* ── Documents (private.crm_documents_guard) ────────────────────────────── */

const ISSUE_FIELDS = ["number", "serial", "fy", "series", "issuedOn", "dueOn", "validUntil", "issuedAt", "cancelledAt", "cancelReason"] as const;
const carriesIssueFields = (d: CrmDocument) => ISSUE_FIELDS.some((k) => d[k] !== null && d[k] !== undefined);

function checkDocClient(s: RulesState, d: CrmDocument): void {
  if (d.projectId) {
    const p = s.projects.find((x) => x.id === d.projectId);
    if (!p || p.clientId !== d.clientId) refuse("23514", "A document belongs to the client of its project.");
  }
}

export function checkDocumentInsert(s: RulesState, d: CrmDocument): void {
  checkId("dc", d.id);
  if (!s.clients.some((c) => c.id === d.clientId)) refuse("23503", "No such client.");
  checkDocClient(s, d);
  if (s.documents.some((x) => x.id === d.id)) refuse("23505", "This document already exists.");
  if (d.status !== "draft") refuse("42501", "A document starts as a draft. Issue it with crm_issue_document.");
  if (carriesIssueFields(d)) refuse("42501", "A draft has no number or issue dates: crm_issue_document sets them.");
  if (d.amount !== null && (d.amount < 0 || d.amount > 100_000_000 || !Number.isInteger(d.amount))) refuse("23514", "An amount is whole rupees, 0 to 10 crore.");
  checkSize("document", d.data);
}

/**
 * THE FREEZE: an issued document changes only to cancelled, with a reason and
 * everything else equal (null-safe: a welcome pack has no number), and never
 * when a recorded payment, an issued receipt or an issued credit note points
 * at it. A cancelled one never changes. (README-BILLING section 3, rules 2 to 4.)
 */
export function assertIssuedFrozen(s: RulesState, old: CrmDocument, next: CrmDocument): CrmDocument {
  if (old.status === "cancelled") refuse("42501", "A cancelled document does not change.");
  const same = (k: keyof CrmDocument) => JSON.stringify(old[k] ?? null) === JSON.stringify(next[k] ?? null);
  const unchanged = (["id", "kind", "number", "serial", "series", "fy", "amount", "data", "issuedOn", "dueOn", "validUntil", "clientId", "projectId",
    "paymentId", "relatedDoc", "milestone", "issuedAt", "createdAt"] as const).every(same);
  if (next.status === "cancelled" && unchanged && (next.cancelReason || "").trim().length > 0) {
    if (s.payments.some((p) => p.againstDoc === old.id && p.status === "recorded") || s.documents.some((x) => x.relatedDoc === old.id && x.status === "issued")) {
      refuse("42501", "Money was received against this document, or a receipt or credit note points at it: correct it with a credit note.");
    }
    return next;
  }
  return refuse("42501", "An issued document does not change. Cancel it with a reason and make a new one.");
}

/** An update of a document (a draft's edit, or the cancel of an issued one). Returns the row as stored. */
export function checkDocumentUpdate(s: RulesState, old: CrmDocument, next: CrmDocument, now: Date): CrmDocument {
  checkDocClient(s, next);
  if (old.status === "draft") {
    if (next.status !== "draft") refuse("42501", "Documents are issued only by crm_issue_document.");
    if (carriesIssueFields(next)) refuse("42501", "A draft has no number or issue dates: crm_issue_document sets them.");
    if (next.amount !== null && (next.amount < 0 || next.amount > 100_000_000 || !Number.isInteger(next.amount))) refuse("23514", "An amount is whole rupees, 0 to 10 crore.");
    checkSize("document", next.data);
    return { ...next, updatedAt: now.toISOString() };
  }
  const kept = assertIssuedFrozen(s, old, next);
  return { ...kept, cancelledAt: now.toISOString(), updatedAt: now.toISOString() };
}

export function checkDocumentDelete(old: CrmDocument): void {
  if (old.status !== "draft") refuse("42501", "An issued document is never deleted. Cancel it with a reason instead.");
}

/* ── Payments (private.crm_payments_guard) ──────────────────────────────── */

export function checkPaymentInsert(s: RulesState, p: CrmPayment): void {
  checkId("py", p.id);
  if (s.payments.some((x) => x.id === p.id)) refuse("23505", "This payment already exists.");
  if (p.status !== "recorded" || p.voidReason) refuse("42501", "A payment is recorded first; voiding it later needs a reason.");
  if (!Number.isInteger(p.amount) || !Number.isInteger(p.tds) || p.amount < 0 || p.tds < 0 || p.amount > 100_000_000 || p.tds > 100_000_000) {
    refuse("23514", "Amounts are whole rupees.");
  }
  if (p.amount + p.tds <= 0) refuse("23514", "A payment is more than nothing.");
  if ((p.reference || "").length > 80) refuse("23514", "The reference is at most 80 characters.");
  if ((p.note || "").length > 500) refuse("23514", "The note is at most 500 characters.");
  const d = s.documents.find((x) => x.id === p.againstDoc);
  if (!d || d.status !== "issued" || !["proforma", "invoice"].includes(d.kind)) refuse("23514", "A payment is recorded against an issued proforma or invoice.");
  if (d!.clientId !== p.clientId || (d!.projectId ?? null) !== (p.projectId ?? null)) refuse("23514", "A payment belongs to the client and project of its document.");
}

export function checkPaymentUpdate(s: RulesState, old: CrmPayment, next: CrmPayment): CrmPayment {
  if (old.status === "voided") refuse("42501", "A voided payment does not change.");
  const fixed = (["id", "clientId", "projectId", "againstDoc", "receivedOn", "amount", "tds", "mode", "reference", "createdAt"] as const)
    .every((k) => (old[k] ?? null) === (next[k] ?? null));
  if (!fixed) refuse("42501", "A recorded payment does not change. Void it with a reason and record it again.");
  if (next.status === "voided") {
    if (!(next.voidReason || "").trim()) refuse("42501", "Voiding a payment needs a reason.");
    if (s.documents.some((d) => d.paymentId === old.id && d.status === "issued")) refuse("42501", "Cancel the receipt for this payment first.");
    return next;
  }
  if ((next.voidReason ?? null) !== (old.voidReason ?? null)) refuse("42501", "A recorded payment does not change. Void it with a reason and record it again.");
  return next;
}

export function checkPaymentDelete(): never {
  return refuse("42501", "A payment is never deleted. Void it with a reason.");
}

/* ── The timeline (private.crm_events_stamp) ────────────────────────────── */

/** The store's clock stamps every line: nothing is back-dated. */
export function stampEvent(e: Omit<CrmClientEvent, "at">, now: Date): CrmClientEvent {
  checkSize("event", e.data);
  checkSize("detail", e.detail || "");
  return { ...e, at: now.toISOString() };
}

/** private.crm_events_stamp: a timeline line is about an existing client, and belongs to the client of its project. */
export function checkEventInsert(s: Pick<RulesState, "clients" | "projects">, e: { clientId: string; projectId?: string | null }): void {
  if (!s.clients.some((c) => c.id === e.clientId)) refuse("23503", "No such client.");
  if (e.projectId) {
    const p = s.projects.find((x) => x.id === e.projectId);
    if (!p || p.clientId !== e.clientId) refuse("23514", "A timeline line belongs to the client of its project.");
  }
}

/* ── Issue (public.crm_issue_document) ──────────────────────────────────── */

/**
 * Which money an advance proforma bills, as the SQL reads it: "1" or "2" for the advance (coalesce(data ->> 'part',
 * '1') = '2'), "CR:<number>" for a change request's advance.
 */
const billedKey = (d: Pick<CrmDocument, "milestone" | "data">): string =>
  d.milestone === "CHANGE_REQUEST" ? `CR:${d.data?.crNo ?? ""}` : String(d.data?.part ?? "1") === "2" ? "2" : "1";

/** What the issued credit notes against a document come to. */
const creditedOn = (s: Pick<RulesState, "documents">, id: string): number =>
  s.documents.filter((x) => x.kind === "credit_note" && x.status === "issued" && x.relatedDoc === id).reduce((n, x) => n + (x.amount || 0), 0);

/** The first serial Mehdi set for a series in a year (numbers he issued before the CRM); below 1 reads as 1. */
export function firstSerialOf(settings: ClientSettings | null, series: Series, fy: string): number {
  const v = Number(settings?.firstSerial?.[series]?.[fy]);
  return Number.isFinite(v) ? Math.max(Math.floor(v), 1) : 1;
}

/**
 * Freezes a draft: for a money kind, its number in the series (the India
 * date's financial year, consecutive, no gaps), the issue date, the due date
 * (proforma, invoice: + 7, SA cl. 5.5) and the validity (quotation, proforma:
 * + 15); for the others, no number. Checks what a receipt and a credit note
 * point at before a number is spent. Mutates `s` only when nothing is refused.
 */
export function issueDocument(s: RulesState, id: string, now: Date): CrmDocument {
  const d = s.documents.find((x) => x.id === id);
  if (!d) return refuse("P0002", "No such document.");
  if (d.status !== "draft") refuse("42501", "This document is already issued.");
  const series = seriesOf(d.kind);
  if (series) {
    if (d.amount === null || d.amount === undefined) refuse("22023", "A money document needs its amount.");
    if ((d.amount as number) <= 0 && d.kind !== "invoice") refuse("22023", "A money document asks for or acknowledges more than nothing.");
  }
  if (d.kind === "receipt") {
    const p = s.payments.find((x) => x.id === d.paymentId);
    if (!p || p.status !== "recorded" || p.clientId !== d.clientId || p.amount !== d.amount || (d.relatedDoc ?? null) !== p.againstDoc) {
      refuse("23514", "A receipt is issued for one recorded payment, for the amount credited, against that payment's document.");
    }
    if (s.documents.some((x) => x.kind === "receipt" && x.status === "issued" && x.paymentId === d.paymentId)) {
      refuse("23505", "This payment already has a receipt.");
    }
  } else if (d.kind === "credit_note") {
    const rel = s.documents.find((x) => x.id === d.relatedDoc);
    if (!rel || rel.status !== "issued" || rel.clientId !== d.clientId || !(rel.kind === "invoice" || (rel.kind === "proforma" && d.data?.reasonCode === "F"))) {
      refuse("23514", "A credit note reduces one issued invoice of this client (or, refunding an advance, its proforma: code F).");
    }
    const credited = s.documents.filter((x) => x.kind === "credit_note" && x.status === "issued" && x.relatedDoc === rel!.id)
      .reduce((n, x) => n + (x.amount || 0), 0);
    if (credited + (d.amount || 0) > (rel!.amount || 0)) refuse("23514", `The credit notes against ${rel!.number} would come to more than it.`);
    const pa = d.data?.partnersApproval;
    if (!(pa?.at || "").trim() || !(pa?.channel || "").trim()) refuse("23514", "A credit note needs both partners' written yes recorded (date and channel).");
  } else if (d.kind === "proforma" && (d.milestone === "ADVANCE_50" || d.milestone === "CHANGE_REQUEST")) {
    // The advance is billed once: one issued proforma for the advance (or a split advance's part 1), one for part 2
    // and one for each change request's advance per project, and part 2 only with a split advance. A wrong one is
    // cancelled first; one refunded in full by credit notes (code F) no longer counts.
    const key = billedKey(d);
    if (key === "2" && !s.projects.find((p) => p.id === d.projectId)?.splitAdvance) {
      refuse("23514", "This project has no split advance: its advance is one proforma.");
    }
    if (s.documents.some((x) => x.id !== d.id && x.kind === "proforma" && x.milestone === d.milestone && x.status === "issued"
      && x.clientId === d.clientId && (x.projectId ?? null) === (d.projectId ?? null) && billedKey(x) === key && (x.amount || 0) > creditedOn(s, x.id))) {
      refuse("23505", d.milestone === "ADVANCE_50"
        ? "This advance is already billed on an issued proforma: cancel that one with a reason, then issue the new one."
        : "This change request's advance is already billed on an issued proforma: cancel that one with a reason, then issue the new one.");
    }
  }

  const today = indiaDate(now);
  const fy = fyOf(today);
  let serial: number | null = null;
  let number: string | null = null;
  if (series) {
    let c = s.counters.find((x) => x.series === series && x.fy === fy);
    const fresh = !c;
    if (!c) c = { series, fy, lastSerial: firstSerialOf(s.settings, series, fy) - 1 };
    const most = s.documents.filter((x) => x.series === series && x.fy === fy && x.status !== "draft").reduce((m, x) => Math.max(m, x.serial || 0), 0);
    serial = Math.max(c.lastSerial, most) + 1;
    number = formatNumber(series, fy, serial);
    if (fresh) s.counters.push({ ...c, lastSerial: serial });
    else c.lastSerial = serial;
  }
  const issued: CrmDocument = {
    ...d,
    status: "issued",
    series,
    fy: series ? fy : null,
    serial,
    number,
    issuedOn: today,
    dueOn: d.kind === "proforma" || d.kind === "invoice" ? addDays(today, 7) : null,
    validUntil: d.kind === "quotation" || d.kind === "proforma" ? addDays(today, 15) : null,
    issuedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  s.documents = s.documents.map((x) => (x.id === id ? issued : x));
  return issued;
}
