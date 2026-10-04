/**
 * The invoice (03-legal-docs/billing/Invoice-NonGST.md): the launch invoice (the full fee and approved
 * change requests, less every advance received and anything invoiced earlier, 5.1), an invoice for work
 * to date (SA cl. 4.5), or a care plan invoice, which follows the AMC agreement (6.4, E13 d): its term 5
 * is the AMC's own interest rate (cl. 11.6), its term 6 the AMC's suspension (cl. 11.2, 11.3), and the
 * intellectual property term is left out. The TDS lines name no section of the Income-tax Act (E5).
 * Blocks on the firm PAN, the bank details, the signatory (the declaration), the billing address and
 * state, [[DISPUTE_WINDOW_DAYS]] (and [[LATE_INTEREST_PERCENT]] on a care plan invoice).
 */
import { advanceLessLabel, buildLaunchInvoice, CARE_PLANS, creditsAgainst, lineAmount } from "../../money";
import { fmtDate } from "../../numbering";
import type { DocCtx } from "../context";
import { tok, type DocModel } from "../model";
import {
  AUTHORISED, bankRows, billTo, firmPan, gstCallout, legalName, LINE_COLUMNS, lineColumns, lineRows, m, policyDays, projectName, signatory, taxRows, TOTAL_COLUMNS, udyamNo, words,
} from "./common";

export interface InvoiceFigures {
  lines: { description: string; qty?: number; unit?: string; rate?: number; amount: number }[];
  totals: string[][];
  totalDue: number;
}

/** The lines and totals of this invoice, and the amount due (the column the money math reads). */
export function invoiceFigures(c: DocCtx): InvoiceFigures {
  const doc = c.doc;
  const milestone = doc?.milestone || "LAUNCH_50";
  const data = doc?.data || {};
  if (milestone === "AMC") {
    const plan = c.client.carePlan;
    const fee = plan?.fee || 0;
    const name = plan ? CARE_PLANS[plan.plan].name : "[plan]";
    const period = data.period ? `${fmtDate(data.period.from)} to ${fmtDate(data.period.to)}` : "[period]";
    const lines = [{ description: `${name} care plan, ${plan?.billing === "annual" ? "a year" : "a month"}: ${period}`, qty: 1, unit: "period", rate: fee, amount: fee }];
    return { lines, totals: [["Subtotal", m(fee)], ["Total due", m(fee)]], totalDue: fee };
  }
  if (data.workToDate) {
    const lines = (data.lines || []).map((l) => ({ description: l.description, qty: 1, unit: "work", rate: l.amount, amount: l.amount }));
    const sub = lines.reduce((s, l) => s + l.amount, 0);
    const less = c.docs.filter((x) => x.kind === "proforma" && x.status !== "draft").flatMap((pi) =>
      c.payments.filter((p) => p.status === "recorded" && p.againstDoc === pi.id).map((p) => ({ label: advanceLessLabel(pi, p.receivedOn, fmtDate), amount: p.amount + p.tds })));
    const due = Math.max(0, sub - less.reduce((s, x) => s + x.amount, 0));
    return { lines, totals: [["Subtotal", m(sub)], ...less.map((x) => [x.label, `-${m(x.amount)}`]), ["Total due", m(due)]], totalDue: due };
  }
  if (!c.project) return { lines: [], totals: [["Total due", m(0)]], totalDue: 0 };
  const inv = buildLaunchInvoice(c.project, c.docs, c.payments, fmtDate, doc?.id);
  const totals: string[][] = [["Subtotal", m(inv.subtotal)]];
  if (inv.discount) totals.push([`Less: discount ${inv.discount.reason}`, `-${m(inv.discount.amount)}`]);
  for (const l of inv.less) totals.push([l.label, `-${m(l.amount)}`]);
  totals.push(["Total due", m(inv.totalDue)]);
  return { lines: inv.lines, totals, totalDue: inv.totalDue };
}

export function buildInvoice(c: DocCtx): DocModel {
  const cl = c.client;
  const p = c.project;
  const s = c.settings;
  const amc = c.doc?.milestone === "AMC";
  const f = invoiceFigures(c);
  const pan = firmPan(s);
  // E13 g: "to the account below" in the template, while the bank details are section 3, above the terms. E13 k: term
  // 6 says what SA cl. 5.7 says ("more than 7 days overdue", "may, on written notice"), as the welcome pack does,
  // where the template said the work pauses by itself a day early.
  const terms = [
    "Payment is due within 7 days of the invoice date, or on the due date printed above, whichever is earlier.",
    "Payment is by NEFT, IMPS, RTGS or UPI to the account in section 3. Cash is not accepted. A cheque is accepted only by prior agreement and the invoice counts as paid on clearance, not on handover.",
    "The invoice number must appear in the transfer remarks. A payment that cannot be matched to an invoice cannot be credited to the account.",
    "Bank charges at the remitting end are borne by the client. The amount credited must equal the invoice total.",
    ...(amc
      ? [
        `Late payment carries interest at ${policyDays(s.policy.lateInterestPercent, "late interest percent")}% per month or part month, from the due date until payment (Maintenance and Support Agreement, Clause 11.6).`,
        "Where this invoice remains unpaid 15 days after its due date, the services may be suspended on 3 working days' written notice. During a suspension no data is deleted, no backup is removed, the site is not taken offline and no domain transfer is blocked (Maintenance and Support Agreement, Clauses 11.2 and 11.3).",
      ]
      : [
        "Late payment carries interest at 1.5% per month, or part of a month, on the outstanding amount, running from the due date until the money is received.",
        "If an invoice is more than 7 days overdue, work on the project may be paused, on written notice, until the account is cleared. Work already delivered and live stays live and nothing is taken down. Delivery dates then move by at least the number of days work was paused.",
        "Intellectual property in the deliverables passes to the client on receipt of the full contract value, as set out in the service agreement.",
      ]),
    `A dispute about any part of this invoice must be raised in writing within ${policyDays(s.policy.disputeWindowDays, "dispute window days")} days of the invoice date, with the reason. The undisputed balance stays payable on the due date.`,
    `The supplier is a micro enterprise under the Micro, Small and Medium Enterprises Development Act, 2006 (Udyam registration ${udyamNo(s)}). Section 15 of that Act requires this invoice to be paid by the agreed date and in no case later than 45 days from the day the services are accepted or deemed accepted, and Section 16 makes a late payment carry compound interest, with monthly rests, at three times the bank rate notified by the Reserve Bank of India.`,
  ];
  const subject = amc ? (cl.carePlan ? `${CARE_PLANS[cl.carePlan.plan].name} care plan` : "[plan]") : projectName(p);
  return {
    title: "Invoice",
    subtitle: `${subject}, ${cl.orgName}`,
    fileName: "invoice",
    templateNote: true,
    blocks: [
      { type: "keyValue", rows: [
        ["Invoice no.", tok("number")],
        ["Invoice date", tok("issuedOn")],
        ["Due date", tok("dueOn")],
        ["Bill to", billTo(cl)],
        [amc ? "Care plan" : "Project", subject],
        ["Amount due (INR)", m(f.totalDue)],
      ] },
      { type: "heading", text: "1. Description of services" },
      // A care plan invoice is issued before its period (AMC cl. 8.2): its services are to come, not delivered (E13 h, l).
      { type: "table", columns: amc ? lineColumns("Description of services") : LINE_COLUMNS, rows: lineRows(f.lines) },
      { type: "table", columns: TOTAL_COLUMNS, rows: f.totals, boldLast: true },
      { type: "paragraph", text: `Total in words: ${words(f.totalDue)}.` },
      { type: "heading", text: "2. Tax status and PAN" },
      gstCallout(),
      { type: "keyValue", rows: [...taxRows(s, true), ["Place of supply", cl.state || "[state]"]] },
      { type: "bullets", items: [
        `If the client has to deduct tax at source, deduct it against the firm's PAN ${pan}, pay the invoice net of TDS, and send the TDS certificate for that quarter. Deduction against a partner's personal PAN is wrong and the credit is then lost to the firm.`,
        `Indian clients commonly deduct TDS on fees for professional or technical services. Which provision and rate apply to a particular engagement is the client's determination: confirm it with your own chartered accountant. Whatever is deducted must appear against the firm's PAN ${pan} in the firm's Form 26AS and the AIS, otherwise the credit is lost.`,
      ] },
      { type: "heading", text: "3. How to pay" },
      { type: "keyValue", rows: bankRows(s, "Quote the invoice number in the transfer remarks") },
      { type: "heading", text: "4. Terms" },
      { type: "bullets", numbered: true, items: terms },
      { type: "heading", text: "5. Declaration" },
      { type: "paragraph", text: amc
        ? `Certified that the particulars given above are true and correct, and that the services described are to be provided to ${legalName(cl)} for the period shown.`
        : `Certified that the particulars given above are true and correct, and that the services described have been delivered to ${legalName(cl)}.` },
      { type: "paragraph", text: `${signatory(s)}, ${AUTHORISED}, signature: ____________________  Date: ______________` },
    ],
  };
}

/** The value of an invoice less its credit notes (the "invoiced earlier" line of a later invoice). */
export const netOf = (c: DocCtx, docId: string) => {
  const d = c.docs.find((x) => x.id === docId);
  return d ? (d.amount || 0) - creditsAgainst(d, c.docs) : 0;
};
export const lineTotal = lineAmount;
