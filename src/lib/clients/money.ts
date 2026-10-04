/**
 * MONEY IN THE CLIENT FILE (client-process-spec 5).
 *
 *   Fee            the scope lines less an approved discount, whole rupees.
 *   Advance        Math.round(fee / 2); the balance at launch is fee - advance (an odd fee
 *                  puts the extra rupee in the advance; the two always add up to the fee).
 *   Split advance  part 1 = Math.round(advance / 2) unless the agreed figure is typed; part 2 = the rest.
 *   Contract value the fee plus approved change requests.
 *   amount         quotation: the total; proforma: payable now; invoice: total due; receipt:
 *                  credited (net of TDS); credit note: the credit.
 *   Balance        amount - issued credit notes against it - recorded payments against it (amount + TDS).
 *   Outstanding    balances of issued invoices and proformas, except a proforma once the project's
 *                  launch invoice is issued (the invoice bills it: "Billed on IDV/...").
 *   Received       amounts credited (never TDS, never a voided payment) in a period.
 *
 * Interest (1.5% a month, SA cl. 5.6) is stated, never added. Pure functions; no I/O.
 */
import { CARE, ONE_TIME } from "@/lib/pricing";
import type { CarePlanId, CrmDocument, CrmPayment, CrmProject, ProjectKind } from "./types";

/* ── Formats ─────────────────────────────────────────────────────────────── */

/** Indian grouping, whole rupees, no symbol: 18000 -> "18,000", 123456 -> "1,23,456" (messages, 7.2). */
export function inrGroup(n: number): string {
  const neg = n < 0;
  const s = String(Math.round(Math.abs(n)));
  const out = s.length <= 3 ? s : `${s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${s.slice(-3)}`;
  return neg ? `-${out}` : out;
}

/** The generator's money format (invoice-generator.py money): Indian grouping, two decimals: "18,000.00". */
export function moneyFmt(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  let whole = Math.floor(abs);
  let frac = Math.round((abs - whole) * 100);
  if (frac === 100) {
    whole += 1;
    frac = 0;
  }
  const out = `${inrGroup(whole)}.${String(frac).padStart(2, "0")}`;
  return neg ? `-${out}` : out;
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
  "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const underHundred = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
function underThousand(n: number): string {
  if (n < 100) return underHundred(n);
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${underHundred(rest)}` : ""}`;
}

/** invoice-generator.py words_indian, ported: 0 "zero", 123456 "one lakh twenty-three thousand four hundred and fifty-six". */
export function wordsIndian(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "zero";
  const parts: string[] = [];
  for (const [div, name] of [[10_000_000, "crore"], [100_000, "lakh"], [1000, "thousand"]] as const) {
    if (n >= div) {
      parts.push(`${div === 10_000_000 ? wordsIndian(Math.floor(n / div)) : underThousand(Math.floor(n / div))} ${name}`);
      n %= div;
    }
  }
  if (n) parts.push(underThousand(n));
  return parts.join(" ");
}

/** "Rupees eighteen thousand only" (amount_in_words, INR, whole rupees). */
export const amountInWords = (n: number) => `Rupees ${wordsIndian(n)} only`;

/* ── The fee ─────────────────────────────────────────────────────────────── */

export const lineAmount = (l: { qty: number; rate: number }) => Math.round((Number(l.qty) || 0) * (Number(l.rate) || 0));
export const subtotalOf = (p: Pick<CrmProject, "lines">) => (p.lines || []).reduce((s, l) => s + lineAmount(l), 0);

/** The agreed fee: the scope lines less an approved discount; without lines, the fee typed on the project. */
export function feeOf(p: Pick<CrmProject, "lines" | "discount" | "fee">): number | null {
  if (p.lines && p.lines.length) return Math.max(0, subtotalOf(p) - (p.discount?.amount || 0));
  return typeof p.fee === "number" ? p.fee : null;
}

export const advanceOf = (fee: number) => Math.round(fee / 2);
export const balanceAtLaunchOf = (fee: number) => fee - advanceOf(fee);

/** A split advance's two parts (4.2). */
export function splitParts(p: Pick<CrmProject, "lines" | "discount" | "fee" | "splitAdvance">): { part1: number; part2: number } | null {
  const fee = feeOf(p);
  if (!p.splitAdvance || fee === null) return null;
  const adv = advanceOf(fee);
  const part1 = Number.isFinite(p.splitAdvance.part1) && p.splitAdvance.part1 > 0 && p.splitAdvance.part1 < adv ? Math.round(p.splitAdvance.part1) : Math.round(adv / 2);
  return { part1, part2: adv - part1 };
}

export const approvedCrs = (p: Pick<CrmProject, "changeRequests">) => (p.changeRequests || []).filter((c) => c.status === "approved");
/** The fee plus approved change requests. */
export function contractValueOf(p: CrmProject): number | null {
  const fee = feeOf(p);
  if (fee === null) return null;
  return fee + approvedCrs(p).reduce((s, c) => s + (c.cost || 0), 0);
}

/* ── Documents and payments ─────────────────────────────────────────────── */

const live = (d: CrmDocument) => d.status === "issued";
const recorded = (p: CrmPayment) => p.status === "recorded";

/** Issued credit notes against a document. */
export const creditsAgainst = (doc: CrmDocument, docs: CrmDocument[]) =>
  docs.filter((x) => x.kind === "credit_note" && live(x) && x.relatedDoc === doc.id).reduce((s, x) => s + (x.amount || 0), 0);

/** Recorded payments against a document (amount + TDS). */
export const paidAgainst = (doc: CrmDocument, payments: CrmPayment[]) =>
  payments.filter((p) => recorded(p) && p.againstDoc === doc.id).reduce((s, p) => s + p.amount + p.tds, 0);

/** amount - credit notes - payments (amount + TDS). */
export const docBalance = (doc: CrmDocument, docs: CrmDocument[], payments: CrmPayment[]) =>
  (doc.amount || 0) - creditsAgainst(doc, docs) - paidAgainst(doc, payments);

/** A document is paid when its payments (amount + TDS) and credit notes reach its amount. */
export const isPaid = (doc: CrmDocument, docs: CrmDocument[], payments: CrmPayment[]) => live(doc) && docBalance(doc, docs, payments) <= 0;

/** The project's issued launch invoice, if any. */
export const findLaunchInvoice = (projectId: string | null, docs: CrmDocument[]) =>
  docs.find((d) => d.kind === "invoice" && live(d) && d.projectId === projectId && d.milestone === "LAUNCH_50") || null;

/** True when a proforma is billed by the launch invoice (it stops counting as outstanding). */
export function billedBy(doc: CrmDocument, docs: CrmDocument[]): CrmDocument | null {
  if (doc.kind !== "proforma" || !doc.projectId) return null;
  return findLaunchInvoice(doc.projectId, docs);
}

/** Does this document's balance count as outstanding (5.1)? */
export function counts(doc: CrmDocument, docs: CrmDocument[]): boolean {
  if (!live(doc) || !["invoice", "proforma"].includes(doc.kind)) return false;
  return !billedBy(doc, docs);
}

export function outstandingOf(docs: CrmDocument[], payments: CrmPayment[]): number {
  return docs.filter((d) => counts(d, docs)).reduce((s, d) => s + Math.max(0, docBalance(d, docs, payments)), 0);
}

/** Overdue: past its due date with a balance that still counts. `today` an India date. */
export function overdueDocs(docs: CrmDocument[], payments: CrmPayment[], today: string): CrmDocument[] {
  return docs.filter((d) => counts(d, docs) && d.dueOn && d.dueOn < today && docBalance(d, docs, payments) > 0);
}

/** Amounts credited (never TDS, never voided) on dates starting with `prefix` ("2026-10" for a month). */
export const receivedIn = (payments: CrmPayment[], prefix: string) =>
  payments.filter((p) => recorded(p) && p.receivedOn.startsWith(prefix)).reduce((s, p) => s + p.amount, 0);
export const receivedTotal = (payments: CrmPayment[]) => payments.filter(recorded).reduce((s, p) => s + p.amount, 0);

/** Where a new payment for this project goes: the launch invoice once issued, else the open proforma (5.1, Record payment). */
export function payableDocs(projectId: string | null, docs: CrmDocument[], payments: CrmPayment[]): CrmDocument[] {
  return docs.filter((d) => d.projectId === projectId && live(d) && ["proforma", "invoice"].includes(d.kind) && counts(d, docs) && docBalance(d, docs, payments) > 0);
}

/** The receipt's figures for one payment (Receipt template, "Position after this payment"; 5.4). */
export function receiptFigures(payment: CrmPayment, against: CrmDocument, docs: CrmDocument[], payments: CrmPayment[]) {
  const others = payments.filter((p) => recorded(p) && p.againstDoc === against.id && p.id !== payment.id && (p.createdAt || "") < (payment.createdAt || "~"));
  const earlier = others.reduce((s, p) => s + p.amount + p.tds, 0);
  const value = against.amount || 0;
  const credits = creditsAgainst(against, docs);
  return { value, earlier, now: payment.amount, tds: payment.tds, credits, balance: value - credits - earlier - payment.amount - payment.tds };
}

/** An over-payment: the amount + TDS above the document's open balance. 0 when none. */
export const excessOf = (amount: number, tds: number, doc: CrmDocument, docs: CrmDocument[], payments: CrmPayment[]) =>
  Math.max(0, amount + tds - Math.max(0, docBalance(doc, docs, payments)));

/* ── The launch invoice (5.1) ───────────────────────────────────────────── */

export interface InvoiceLine {
  description: string;
  qty?: number;
  unit?: string;
  rate?: number;
  amount: number;
}

export interface LaunchInvoice {
  lines: InvoiceLine[];
  subtotal: number;
  discount: { amount: number; reason: string } | null;
  less: { label: string; amount: number }[];
  totalDue: number;
}

/**
 * A "Less:" line for an advance received: "Less: advance received 7 Oct 2026", and for a change request's own
 * advance "Less: advance received 22 Oct 2026 (CR-01)", so the two advances never read as the same line (E13 n).
 */
export function advanceLessLabel(pi: Pick<CrmDocument, "milestone" | "data"> | undefined, receivedOn: string, fmt: (iso: string) => string): string {
  const cr = pi?.milestone === "CHANGE_REQUEST" ? (pi.data?.crNo || "change request") : "";
  return `Less: advance received ${fmt(receivedOn)}${cr ? ` (${cr})` : ""}`;
}

/**
 * The scope lines and each approved CR, a discount line when one was approved, one "Less: advance
 * received <date>" per credited payment against the project's proformas (amount + TDS; a change request's
 * advance names its CR), one "Less: invoiced earlier <number>" per earlier issued invoice of the project (its
 * amount less its credit notes), then the total due. Without the second kind a project invoiced to date and
 * resumed would be billed twice.
 */
export function buildLaunchInvoice(p: CrmProject, docs: CrmDocument[], payments: CrmPayment[], fmt: (iso: string) => string, exclude?: string): LaunchInvoice {
  const lines: InvoiceLine[] = (p.lines || []).map((l) => ({ description: l.description, qty: l.qty, unit: l.unit, rate: l.rate, amount: lineAmount(l) }));
  for (const c of approvedCrs(p)) lines.push({ description: `${c.no}: ${c.description}`, qty: 1, unit: "change", rate: c.cost, amount: c.cost });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const discount = p.discount ? { amount: p.discount.amount, reason: p.discount.reason === "case_study" ? "(named case study)" : "(second project in the same agreement)" } : null;
  const less: { label: string; amount: number }[] = [];
  const proformas = docs.filter((d) => d.projectId === p.id && d.kind === "proforma" && d.status !== "draft");
  for (const pay of payments.filter((x) => recorded(x) && proformas.some((d) => d.id === x.againstDoc)).sort((a, b) => a.receivedOn.localeCompare(b.receivedOn))) {
    less.push({ label: advanceLessLabel(proformas.find((d) => d.id === pay.againstDoc), pay.receivedOn, fmt), amount: pay.amount + pay.tds });
  }
  for (const inv of docs.filter((d) => d.projectId === p.id && d.kind === "invoice" && live(d) && d.id !== exclude).sort((a, b) => (a.issuedOn || "").localeCompare(b.issuedOn || ""))) {
    less.push({ label: `Less: invoiced earlier ${inv.number}`, amount: (inv.amount || 0) - creditsAgainst(inv, docs) });
  }
  const totalDue = subtotal - (discount?.amount || 0) - less.reduce((s, x) => s + x.amount, 0);
  return { lines, subtotal, discount, less, totalDue: Math.max(0, totalDue) };
}

/* ── Packages, care plans and discounts (4.1, NEGOTIATION-RULES) ────────── */

export const TIER_NAMES = ["Essential", "Professional", "Premium"] as const;
/** The weeks of 05-pricing/PACKAGES-INDIA.html, per tier (software: from 10). */
export const TIER_WEEKS: Record<"landing" | "website" | "portal" | "software", string[]> = {
  landing: ["2", "2-3", "3"],
  website: ["3", "4", "5"],
  portal: ["6", "8", "10"],
  software: ["from 10"],
};
/** The band floors: the walk-away numbers (NEGOTIATION-RULES section 5 and 8.7). */
export const BAND_FLOOR: Record<"landing" | "website" | "portal" | "software", number> = {
  landing: ONE_TIME.landing.min, website: ONE_TIME.website.min, portal: ONE_TIME.portal.min, software: ONE_TIME.software.min,
};

export interface PackageChip {
  kind: "landing" | "website" | "portal" | "software";
  tier: number;
  label: string;
  fee: number;
  weeks: string;
  /** The Rs 18,000 middle website tier is Mehdi's to confirm (D1). */
  toConfirm?: boolean;
}

export function packageChips(kind?: ProjectKind): PackageChip[] {
  const kinds = (kind && kind !== "other" ? [kind] : ["landing", "website", "portal", "software"]) as PackageChip["kind"][];
  const out: PackageChip[] = [];
  for (const k of kinds) {
    ONE_TIME[k].tiers.forEach((fee, i) => {
      const tierName = ONE_TIME[k].tiers.length === 1 ? "" : ` ${TIER_NAMES[i]}`;
      out.push({ kind: k, tier: i, label: `${ONE_TIME[k].label}${tierName}`, fee, weeks: TIER_WEEKS[k][i] || TIER_WEEKS[k][0], toConfirm: k === "website" && i === 1 });
    });
  }
  return out;
}

/** The band floor for a project kind (other: none). */
export const floorOf = (kind: ProjectKind) => (kind === "other" ? null : BAND_FLOOR[kind]);

export const CARE_PLANS: Record<CarePlanId, { name: string; monthly: number; yearly: number }> = {
  essential: { name: CARE[0].name, monthly: CARE[0].monthly, yearly: CARE[0].yearly },
  growth: { name: CARE[1].name, monthly: CARE[1].monthly, yearly: CARE[1].yearly },
  priority: { name: CARE[2].name, monthly: CARE[2].monthly, yearly: CARE[2].yearly },
};

/**
 * Discount rules (4.1): a reason that is one of the trades Mehdi's rules allow (a named case study, a
 * second project in the same agreement), one concession, at most floor(5% of the subtotal), never on an
 * Essential tier (the package chip, or a subtotal at or below the band's floor) and never on a care
 * plan, and always the other partner's written yes (date and channel). The 100% advance trade is not
 * offered in this pass. Returns the reasons it is refused; empty when it is allowed.
 */
export function discountProblems(p: Pick<CrmProject, "lines" | "kind" | "packageLabel" | "fee"> & { splitAdvance?: CrmProject["splitAdvance"] }, d: CrmProject["discount"] | undefined, opts: { carePlan?: boolean } = {}): string[] {
  if (!d) return [];
  const out: string[] = [];
  if (p.splitAdvance) out.push("One concession, never two: this project already has the split advance (NEGOTIATION-RULES section 2).");
  const sub = p.lines && p.lines.length ? subtotalOf(p) : p.fee || 0;
  if (!["case_study", "second_project"].includes(d.reason)) out.push("A discount is only for a named case study or a second project signed in the same agreement (NEGOTIATION-RULES section 2).");
  if (!Number.isInteger(d.amount) || d.amount <= 0) out.push("The discount is a whole number of rupees above 0.");
  if (d.amount > Math.floor((sub * 5) / 100)) out.push(`At most 5% of the subtotal: Rs ${inrGroup(Math.floor((sub * 5) / 100))}. Beyond 5% the answer is scope, not price.`);
  const floor = floorOf(p.kind);
  if (/\bEssential\b/i.test(p.packageLabel || "") || (floor !== null && sub <= floor)) out.push("No discount on an Essential tier: it is already the smallest honest version.");
  if (opts.carePlan) out.push("Never discount a care plan: move down a tier instead.");
  if (!(d.partnerApprovedAt || "").trim() || !(d.channel || "").trim()) out.push("Record the other partner's written yes (date and channel): SOP-01 stage 7 needs it for any discount.");
  return out;
}

/** The walk-away warning (NEGOTIATION-RULES section 5) for a fee below the band's floor. */
export function walkAwayWarning(kind: ProjectKind, fee: number | null): string | null {
  const floor = floorOf(kind);
  if (floor === null || fee === null || fee >= floor) return null;
  return `Below the walk-away line for this kind of work (Rs ${inrGroup(floor)}): "A budget below the floor is not a price objection, it is a scope answer." Offer the smaller thing rather than the cheaper version of the bigger thing.`;
}
