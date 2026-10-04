/**
 * The credit note (03-legal-docs/billing/Credit-Note.md sections 1 to 4): reduces one issued invoice of
 * the same client; code F refunds an advance, so it is issued against the advance proforma and prints
 * "Against proforma" (E13 e). The refund happens after the note is issued and an issued note never
 * changes, so the "Refund reference" row is left out and the refund is recorded on the timeline (E13 f).
 * Any refund, write-off or invoice discount needs both partners in writing (SOP-09 note 5): the database
 * refuses the issue without data.partnersApproval. Blocks on the firm PAN and, when settled by refund,
 * [[REFUND_DAYS]].
 */
import { creditsAgainst, paidAgainst } from "../../money";
import { fmtDate } from "../../numbering";
import type { DocCtx } from "../context";
import { tok, type DocModel } from "../model";
import { firmPan, GST_LINE, inrAmount, legalName, lineColumns, lineRows, m, policyDays, TOTAL_COLUMNS, words } from "./common";

export const REASON_CODES: Record<string, { reason: string; meaning: string }> = {
  A: { reason: "Scope reduced after the invoice was raised", meaning: "A deliverable was dropped by agreement." },
  B: { reason: "Billing error", meaning: "Wrong rate, wrong quantity or an arithmetic mistake." },
  C: { reason: "Duplicate invoice", meaning: "The same work was invoiced twice." },
  D: { reason: "Discount agreed after invoicing", meaning: "A goodwill or settlement discount allowed later." },
  E: { reason: "Deliverable cancelled", meaning: "Work invoiced but not delivered, by agreement." },
  F: { reason: "Refund of an advance", meaning: "The project did not start and the advance is being returned." },
  G: { reason: "Other", meaning: "Write the reason in full in the box below." },
};

export function buildCreditNote(c: DocCtx): DocModel {
  const cl = c.client;
  const s = c.settings;
  const doc = c.doc;
  const data = doc?.data || {};
  const rel = c.docs.find((d) => d.id === doc?.relatedDoc) || null;
  const credit = doc?.amount || 0;
  const original = rel?.amount || 0;
  const earlierCredits = rel ? creditsAgainst(rel, c.docs.filter((d) => d.id !== doc?.id)) : 0;
  const received = rel ? paidAgainst(rel, c.payments) : 0;
  const revised = Math.max(0, original - earlierCredits - credit - received);
  const codeF = data.reasonCode === "F";
  const lines = (data.lines || []).map((l) => ({ description: l.description, qty: 1, unit: "credit", rate: l.amount, amount: l.amount }));
  return {
    title: "Credit Note",
    subtitle: `${rel?.number || "[document number]"}, ${cl.orgName}`,
    fileName: "credit-note",
    templateNote: true,
    blocks: [
      { type: "keyValue", rows: [
        ["Credit note no.", tok("number")],
        ["Date", tok("issuedOn")],
        [codeF ? "Against proforma" : "Against invoice", rel ? `${rel.number} dated ${fmtDate(rel.issuedOn)}` : "[the invoice it reduces]"],
        ["Issued to", legalName(cl)],
        ["Credit amount", inrAmount(credit)],
      ] },
      { type: "heading", text: "1. Why this credit note is being issued" },
      { type: "table", columns: [{ label: "Code", width: 16 }, { label: "Reason", width: 70 }, { label: "Meaning", width: 88 }],
        rows: Object.entries(REASON_CODES).map(([k, v]) => [k, v.reason, v.meaning]) },
      { type: "keyValue", rows: [
        ["Reason code", data.reasonCode || "[reason code]"],
        ["Reason in full", data.reason?.trim() || "[the reason in full]"],
        ["Agreed with", `${data.agreedWith?.trim() || cl.signatoryName || "[who agreed it]"} on ${data.agreedOn ? fmtDate(data.agreedOn) : "[date agreed]"}`],
      ] },
      { type: "heading", text: "2. What is being credited" },
      // What is credited is not a service delivered (a billing error, an advance returned): "Description" (E13 h).
      { type: "table", columns: lineColumns("Description"), rows: lineRows(lines.length ? lines : [{ description: data.reason || "[what is credited]", qty: 1, unit: "credit", rate: credit, amount: credit }]) },
      { type: "table", columns: TOTAL_COLUMNS, rows: [
        [codeF ? "Original proforma value" : "Original invoice value", m(original)],
        ...(earlierCredits ? [["Credit notes issued earlier", `-${m(earlierCredits)}`]] : []),
        ["Credit allowed by this note", `-${m(credit)}`],
        ["Payments already received", m(received)],
        ["Revised amount payable", m(revised)],
      ], boldLast: true },
      { type: "paragraph", text: `Credit in words: ${words(credit)}.` },
      { type: "heading", text: "3. How the credit is settled" },
      { type: "keyValue", rows: [
        ["Method", data.settlement === "refunded" ? "Refunded" : data.settlement === "adjusted" ? "Adjusted against the amount payable" : "[adjusted or refunded]"],
        ...(data.settlement === "refunded" ? [["Refund window", `${policyDays(s.policy.refundDays, "refund days")} days, to the account the original payment came from`] as [string, string]] : []),
      ] },
      { type: "callout", lines: [GST_LINE] },
      { type: "paragraph", text: `PAN of the firm ${firmPan(s)}. GSTIN: not registered.` },
      { type: "heading", text: "4. Record-keeping notes" },
      { type: "bullets", items: [
        "A credit note reduces an invoice that has already been issued. It never deletes it. The original invoice number stays in the register exactly as it was.",
        "One credit note refers to one invoice. If two invoices need correcting, issue two credit notes.",
        `The credit note number comes from its own series, IDV/CN/${tok("fy")}/..., and is consecutive like every other series.`,
        "File the credit note immediately after the original invoice, so a reader sees the invoice and its correction together.",
        "If the credit is settled by refund rather than adjustment, record the outgoing transfer reference against this credit note once the money leaves the account.",
        "Once registered under GST, a credit note also has to be reported in the GST return for the relevant period and carries extra mandatory fields. Use the GST-ready set from that day.",
      ] },
    ],
  };
}
