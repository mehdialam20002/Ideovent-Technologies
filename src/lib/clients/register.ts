/**
 * THE REGISTER, THE RENEWALS AND THE DASHBOARD NUMBERS (client-process-spec 5.6, 10.2, 11.5).
 *
 * Clients > Money is the register README-BILLING section 3 asks for: every money document (quotation,
 * proforma, invoice, receipt, credit note), drafts and cancelled ones included, with its number, kind,
 * date, client, project, amount, due date, what was paid against it, its balance, its status, the
 * payment references and the refunds recorded against credit notes. The totals follow 5.1: outstanding
 * (a proforma stops counting once the project's launch invoice bills it), of which overdue, and what was
 * received this India month (amounts credited, never TDS, never a voided payment).
 *
 * The CSV for the CA has the same columns, amounts as plain numbers, INR only (PIPELINE-SCHEMA rule 4).
 * A text cell that would run as a formula in a spreadsheet gets a ' in front (as the leads export does).
 *
 * The Renewals tab and the dashboard tiles read the same rows, so the numbers agree everywhere.
 * Pure: no I/O, no React.
 */
import { billedBy, counts, docBalance, isPaid, outstandingOf, overdueDocs, paidAgainst, receivedIn, CARE_PLANS } from "./money";
import { addDays, daysBetween, fmtDate, isMoneyKind, monthOf } from "./numbering";
import type { CrmClient, CrmClientEvent, CrmDocument, CrmPayment, CrmProject, RenewalKey, StageId } from "./types";
import { STAGE_IDS } from "./types";

/* ── A document's status, in the register's words ───────────────────────── */

/** Draft, Issued, Part paid, Paid, Overdue N days, Billed on IDV/..., Cancelled: <reason> (5.6). */
export function docStatusText(d: CrmDocument, docs: CrmDocument[], payments: CrmPayment[], today: string): string {
  if (d.status === "draft") return "Draft";
  if (d.status === "cancelled") return `Cancelled: ${d.cancelReason || ""}`.trim();
  if (!["proforma", "invoice"].includes(d.kind)) return "Issued";
  const billed = billedBy(d, docs);
  if (billed && !isPaid(d, docs, payments)) return `Billed on ${billed.number}`;
  if (isPaid(d, docs, payments)) return "Paid";
  const part = docBalance(d, docs, payments) < (d.amount || 0);
  if (d.dueOn && d.dueOn < today) return `${part ? "Part paid, " : ""}Overdue ${daysBetween(d.dueOn, today)} days`;
  return part ? "Part paid" : "Issued";
}

/* ── Refunds (6.9): recorded on the timeline against the credit note ───── */

export interface Refund {
  creditNoteId: string;
  amount: number;
  on: string;
  reference: string;
}

/** The refund lines of the timeline (type "payment", data.refundOf = the credit note's id). */
export function refundsFrom(events: Pick<CrmClientEvent, "type" | "data">[]): Refund[] {
  const out: Refund[] = [];
  for (const e of events) {
    const d = (e.data || {}) as Record<string, unknown>;
    if (e.type !== "payment" || typeof d.refundOf !== "string") continue;
    out.push({ creditNoteId: d.refundOf, amount: Number(d.amount) || 0, on: String(d.on || ""), reference: String(d.reference || "") });
  }
  return out;
}

/* ── The register (5.6) ─────────────────────────────────────────────────── */

const KIND_LABEL: Record<string, string> = { quotation: "Quotation", proforma: "Proforma", invoice: "Invoice", receipt: "Receipt", credit_note: "Credit note" };

export interface RegisterRow {
  id: string;
  clientId: string;
  projectId: string | null;
  /** The number, or "Draft" (a draft has none: it is given at Issue). */
  number: string;
  kind: string;
  /** India date: issued on, or the day the draft was made. */
  date: string;
  client: string;
  project: string;
  amount: number | null;
  dueOn: string;
  /** Proforma and invoice: recorded payments against it (amount + TDS). Blank for the others. */
  paid: number | null;
  /** Proforma and invoice: what is left on it (never below 0; an excess shows in the status line). */
  balance: number | null;
  status: string;
  /** The payment references (UTR, cheque number) against it; a receipt: its payment's. */
  references: string;
  /** Credit notes: the refunds recorded against it. */
  refunds: string;
  /** Days past its due date with a balance that still counts (0 when none). */
  overdueDays: number;
}

export interface RegisterSource {
  clients: CrmClient[];
  projects: CrmProject[];
  documents: CrmDocument[];
  payments: CrmPayment[];
}

const kindLabel = (d: CrmDocument) => {
  const base = KIND_LABEL[d.kind] || d.kind;
  if (d.kind === "proforma" && d.milestone === "CHANGE_REQUEST") return `${base} (change request${d.data?.crNo ? ` ${d.data.crNo}` : ""})`;
  if (d.kind === "proforma" && d.data?.part === 2) return `${base} (advance, part 2)`;
  if (d.kind === "proforma" && d.data?.part === 1) return `${base} (advance, part 1)`;
  if (d.kind === "proforma") return `${base} (advance)`;
  if (d.kind === "invoice" && d.milestone === "AMC") return `${base} (care plan)`;
  if (d.kind === "invoice" && d.data?.workToDate) return `${base} (work to date)`;
  if (d.kind === "invoice" && d.milestone === "LAUNCH_50") return `${base} (launch)`;
  return base;
};

export function registerRows(src: RegisterSource, today: string, refunds: Refund[] = []): RegisterRow[] {
  const { documents: docs, payments } = src;
  const rows: RegisterRow[] = [];
  for (const d of docs.filter((x) => isMoneyKind(x.kind))) {
    const client = src.clients.find((c) => c.id === d.clientId);
    const project = d.projectId ? src.projects.find((p) => p.id === d.projectId) : null;
    const billable = ["proforma", "invoice"].includes(d.kind) && d.status === "issued";
    const against = payments.filter((p) => p.status === "recorded" && p.againstDoc === d.id);
    const pay = d.kind === "receipt" ? payments.find((p) => p.id === d.paymentId) : null;
    const refs = (d.kind === "receipt" ? (pay ? [pay] : []) : against).map((p) => p.reference || "").filter(Boolean);
    const overdue = billable && counts(d, docs) && d.dueOn && d.dueOn < today && docBalance(d, docs, payments) > 0 ? daysBetween(d.dueOn, today) : 0;
    rows.push({
      id: d.id,
      clientId: d.clientId,
      projectId: d.projectId,
      number: d.number || (d.status === "draft" ? "Draft" : ""),
      kind: kindLabel(d),
      date: d.issuedOn || (d.createdAt ? d.createdAt.slice(0, 10) : ""),
      client: client?.orgName || "",
      project: project ? project.name : d.milestone === "AMC" ? "Care plan" : "",
      amount: d.amount,
      dueOn: d.dueOn || "",
      paid: billable ? paidAgainst(d, payments) : null,
      balance: billable ? Math.max(0, docBalance(d, docs, payments)) : null,
      status: docStatusText(d, docs, payments, today),
      references: refs.join("; "),
      refunds: d.kind === "credit_note"
        ? refunds.filter((r) => r.creditNoteId === d.id).map((r) => `Rs ${r.amount} on ${fmtDate(r.on)}${r.reference ? `, ${r.reference}` : ""}`).join("; ")
        : "",
      overdueDays: overdue,
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
}

export interface RegisterTotals {
  /** Balances of issued invoices and proformas that still count (5.1). */
  outstanding: number;
  /** Of which past their due date. */
  overdue: number;
  overdueCount: number;
  /** Amounts credited this India month (never TDS, never voided). */
  receivedThisMonth: number;
}

export function registerTotals(src: Pick<RegisterSource, "documents" | "payments">, today: string): RegisterTotals {
  const late = overdueDocs(src.documents, src.payments, today);
  return {
    outstanding: outstandingOf(src.documents, src.payments),
    overdue: late.reduce((s, d) => s + Math.max(0, docBalance(d, src.documents, src.payments)), 0),
    overdueCount: late.length,
    receivedThisMonth: receivedIn(src.payments, monthOf(today)),
  };
}

/* ── The CSV for the CA ─────────────────────────────────────────────────── */

/** A text cell: one that would run as a formula in a spreadsheet gets a ' in front (as the leads export). */
export function csvCell(v: string | number | null | undefined): string {
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  const s = v === undefined || v === null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const REGISTER_COLUMNS: [string, (r: RegisterRow) => string | number | null][] = [
  ["Number", (r) => r.number],
  ["Kind", (r) => r.kind],
  ["Date", (r) => r.date],
  ["Client", (r) => r.client],
  ["Project", (r) => r.project],
  ["Amount (INR)", (r) => r.amount],
  ["Due date", (r) => r.dueOn],
  ["Paid (INR)", (r) => r.paid],
  ["Balance (INR)", (r) => r.balance],
  ["Status", (r) => r.status],
  ["References", (r) => r.references],
  ["Refunds", (r) => r.refunds],
];

export function registerCsv(rows: RegisterRow[]): string {
  const head = REGISTER_COLUMNS.map(([h]) => h).join(",");
  const body = rows.map((r) => REGISTER_COLUMNS.map(([, get]) => csvCell(get(r))).join(","));
  return [head, ...body].join("\r\n");
}

/* ── Renewals (10.2) ────────────────────────────────────────────────────── */

export interface RenewalItem {
  clientId: string;
  client: string;
  what: "care_plan" | RenewalKey;
  label: string;
  /** India date it renews. */
  date: string;
  /** Care plan: its fee (per its billing). */
  fee?: number;
  provider?: string;
}

const RENEWAL_LABEL: Record<RenewalKey, string> = { domain: "Domain", hosting: "Hosting", ssl: "SSL", email: "Business e-mail" };

/** Every renewal date on the clients' records: care plans (not ended), then domain, hosting, SSL and e-mail, by date. */
export function renewalItems(clients: CrmClient[]): RenewalItem[] {
  const out: RenewalItem[] = [];
  for (const c of clients) {
    const plan = c.carePlan;
    if (plan && plan.status !== "ended" && plan.renewalOn) {
      out.push({ clientId: c.id, client: c.orgName, what: "care_plan", label: `Care plan: ${CARE_PLANS[plan.plan]?.name || plan.plan}, ${plan.billing === "annual" ? "yearly" : "monthly"}`, date: plan.renewalOn, fee: plan.fee });
    }
    for (const key of ["domain", "hosting", "ssl", "email"] as RenewalKey[]) {
      const r = c.renewals?.[key];
      if (r?.renewsOn) out.push({ clientId: c.id, client: c.orgName, what: key, label: RENEWAL_LABEL[key], date: r.renewsOn, provider: r.provider });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.client.localeCompare(b.client));
}

/* ── The dashboard tiles (11.5) ─────────────────────────────────────────── */

export interface ClientTileNumbers {
  /** Open projects not on hold. */
  active: number;
  /** How many of them in each stage that has any, in stage order. */
  byStage: { stage: StageId; count: number }[];
  outstanding: number;
  overdue: number;
  overdueCount: number;
  receivedThisMonth: number;
  /** Renewal dates from today to today + 60 days. */
  renewals60: number;
  nearestRenewal: RenewalItem | null;
}

export function clientTileNumbers(src: RegisterSource, today: string): ClientTileNumbers {
  const open = src.projects.filter((p) => !p.outcome && !p.hold);
  const byStage = STAGE_IDS.map((stage) => ({ stage, count: open.filter((p) => p.stage === stage).length })).filter((x) => x.count > 0);
  const totals = registerTotals(src, today);
  const until = addDays(today, 60);
  const soon = renewalItems(src.clients).filter((r) => r.date >= today && r.date <= until);
  return {
    active: open.length,
    byStage,
    outstanding: totals.outstanding,
    overdue: totals.overdue,
    overdueCount: totals.overdueCount,
    receivedThisMonth: totals.receivedThisMonth,
    renewals60: soon.length,
    nearestRenewal: soon[0] || null,
  };
}
