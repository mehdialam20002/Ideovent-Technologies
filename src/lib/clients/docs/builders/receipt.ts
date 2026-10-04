/**
 * The receipt (03-legal-docs/billing/Receipt-Payment-Acknowledgement.md), issued for every credit,
 * including the advance. Its "Against" names the proforma when the payment was an advance (the template
 * names only an invoice, but its own heading says it is "issued for every credit, including the
 * advance"). "Position after this payment" is the document's own (5.4): its value, the payments received
 * earlier against that same document, this payment, its TDS, and the balance left on that document.
 * Blocks on the firm PAN and the signatory; never on the bank (a receipt asks for nothing).
 */
import { CARE_PLANS, receiptFigures } from "../../money";
import { fmtDate } from "../../numbering";
import type { DocCtx } from "../context";
import { tok, type DocModel } from "../model";
import { AUTHORISED, firmPan, GST_LINE, inrAmount, legalName, m, projectName, signatory, TOTAL_COLUMNS, words } from "./common";

const MODE: Record<string, string> = { upi: "UPI", neft: "NEFT", imps: "IMPS", rtgs: "RTGS", cheque: "Cheque (cleared)", other: "Other" };

export function buildReceipt(c: DocCtx): DocModel {
  const cl = c.client;
  const s = c.settings;
  const pay = c.payments.find((p) => p.id === c.doc?.paymentId) || null;
  const against = pay ? c.docs.find((d) => d.id === pay.againstDoc) || null : null;
  const f = pay && against ? receiptFigures(pay, against, c.docs, c.payments) : null;
  const againstText = against
    ? `${against.kind === "proforma" ? "Proforma" : "Invoice"} ${against.number || "[number]"} dated ${fmtDate(against.issuedOn)}`
    : "[the proforma or invoice it was paid against]";
  const got = pay?.amount || 0;
  // A care plan payment is client-level (no project): the receipt names the plan, as its invoice does.
  const subject = c.project ? projectName(c.project) : cl.carePlan ? `${CARE_PLANS[cl.carePlan.plan].name} care plan` : "[project name]";
  return {
    title: "Receipt, payment acknowledgement",
    subtitle: `${subject}, ${cl.orgName}`,
    fileName: "receipt",
    templateNote: true,
    blocks: [
      { type: "keyValue", rows: [
        ["Receipt no.", tok("number")],
        ["Receipt date", tok("issuedOn")],
        ["Received from", legalName(cl)],
        ["Amount received", inrAmount(got)],
        ["Amount in words", words(got)],
        ["Received on", pay ? fmtDate(pay.receivedOn) : "[date]"],
        ["Mode", pay ? MODE[pay.mode] || pay.mode : "[mode]"],
        ["Bank reference", pay?.reference || "[bank reference]"],
        ["Against", againstText],
        [c.project ? "Project" : "Care plan", subject],
      ] },
      { type: "heading", text: "Position after this payment" },
      { type: "table", columns: TOTAL_COLUMNS, rows: [
        ["Invoice / order value", m(f?.value || 0)],
        ...(f && f.credits ? [["Less: credit notes", `-${m(f.credits)}`]] : []),
        ["Received earlier", m(f?.earlier || 0)],
        ["Received now", m(got)],
        ["TDS deducted by client, if any", m(f?.tds || 0)],
        ["Balance outstanding", m(Math.max(0, f?.balance || 0))],
      ], boldLast: true },
      { type: "callout", lines: [GST_LINE] },
      { type: "paragraph", text: `PAN of the firm ${firmPan(s)}. GSTIN: not registered.` },
      { type: "heading", text: "Notes" },
      // E13 m: the template says "the account named above", but a receipt names no account ("a receipt asks for
      // nothing", README-BILLING section 1); and an advance's receipt is against a proforma, not an invoice.
      { type: "bullets", items: [
        "This receipt acknowledges money actually credited to the firm's bank account. A cheque handed over, or a transfer that has been initiated but not credited, is not a receipt and does not earn one.",
        "A receipt is issued for every credit, including the advance. It is the only document that proves, from this side, that a payment was received.",
        "If the client deducted tax at source, the receipt records the net amount received and the deduction separately, so the invoice, the receipt and Form 26AS reconcile.",
        "A receipt reduces the balance on the invoice or proforma it is issued against. It never replaces the invoice and it is never issued instead of one.",
      ] },
      { type: "paragraph", text: `${signatory(s)}, ${AUTHORISED}, signature: ____________________  Date: ______________` },
    ],
  };
}
