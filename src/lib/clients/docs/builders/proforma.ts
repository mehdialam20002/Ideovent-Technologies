/**
 * The proforma (03-legal-docs/billing/Proforma-Invoice.md): the advance before work starts, a split
 * advance's part (E13 a), or a change request's advance. "This is a proforma invoice. It is not a tax
 * invoice and not a receipt." Its "Against quotation" row reads "Against proposal" when no quotation was
 * issued (E13 b), and "Against proposal: accepted on <the yes>" when no number was typed either (E13 o: a file
 * opened from a Won lead); under "Bill to" the client's GSTIN when one is recorded (E13 c). It gains a "Due date"
 * row (issue + 7: SA cl. 5.5, SOP-01 stage 8). Blocks on the firm PAN, the bank details, the billing
 * address and state, [[RECEIPT_DAYS]] and [[REFUND_DAYS]]; never on the signatory (it has no signature).
 */
import { advanceOf, feeOf, lineAmount, splitParts } from "../../money";
import { fmtDate } from "../../numbering";
import type { CrmProject } from "../../types";
import type { DocCtx } from "../context";
import { tok, type DocModel } from "../model";
import { bankRows, billTo, gstCallout, lineColumns, lineRows, m, policyDays, projectName, taxRows, TOTAL_COLUMNS, words } from "./common";

/** The amount payable now on a proforma: the advance, a split part, or a change request's advance. */
export function proformaAmount(c: DocCtx, data: { part?: 1 | 2; crNo?: string } = c.doc?.data || {}, milestone = c.doc?.milestone || "ADVANCE_50"): number | null {
  const p = c.project;
  if (!p) return null;
  if (milestone === "CHANGE_REQUEST") {
    const cr = p.changeRequests.find((x) => x.no === data.crNo);
    return cr ? cr.advanceDue : null;
  }
  const fee = feeOf(p);
  if (fee === null) return null;
  const split = splitParts(p);
  if (split && data.part === 2) return split.part2;
  if (split) return split.part1;
  return advanceOf(fee);
}

/**
 * The advance proforma's "Against" row: the project's issued quotation; else the number of the proposal or
 * quotation the client accepted, as typed on the file (a number in the IDV/Q/ series is a quotation issued before
 * the CRM); else, once the yes is recorded (a file opened from a Won lead has it from the start), the proposal
 * accepted on that date (E13 o). Only a file with none of these keeps the blank.
 */
export function advanceAgainst(quoteNo: string | null, p: Pick<CrmProject, "proposalNo" | "dates"> | null): [string, string] {
  if (quoteNo) return ["Against quotation", quoteNo];
  const typed = (p?.proposalNo || "").trim();
  if (typed) return [/^IDV\/Q\//i.test(typed) ? "Against quotation" : "Against proposal", typed];
  if (p?.dates?.yes) return ["Against proposal", `accepted on ${fmtDate(p.dates.yes)}`];
  return ["Against quotation", "[quotation number]"];
}

export function buildProforma(c: DocCtx): DocModel {
  const p = c.project;
  const cl = c.client;
  const s = c.settings;
  const data = c.doc?.data || {};
  const milestone = c.doc?.milestone || "ADVANCE_50";
  const quote = c.docs.filter((x) => x.kind === "quotation" && x.status === "issued").sort((a, b) => (b.issuedOn || "").localeCompare(a.issuedOn || ""))[0];
  const fee = p ? feeOf(p) || 0 : 0;
  const adv = advanceOf(fee);
  const payable = proformaAmount(c, data, milestone) || 0;
  const isCr = milestone === "CHANGE_REQUEST";
  const cr = isCr && p ? p.changeRequests.find((x) => x.no === data.crNo) : undefined;
  const against: [string, string] = isCr
    ? ["Against change request", cr ? `${cr.no} (Statement of Work ${p?.sowRef || "[SOW reference]"})` : "[change request]"]
    : advanceAgainst(quote?.number || null, p);
  // The banner names the document the advance was agreed in (E13 i): the quotation, the proposal, or the change request.
  const agreedIn = isCr ? "the change request" : against[0] === "Against proposal" ? "the proposal" : "the quotation";
  const lines = isCr && cr ? [{ description: `${cr.no}: ${cr.description}`, qty: 1, unit: "change", rate: cr.cost, amount: cr.cost }] : (p?.lines || []).map((l) => ({ ...l, amount: lineAmount(l) }));
  const totals: string[][] = isCr
    ? [["Change request total", m(cr?.cost || 0)], ["Advance requested now, on this change", m(payable)], ["Payable now", m(payable)]]
    : [
      ["Project total", m(fee)],
      [data.part === 2 ? "Advance requested now, part 2 of 2 of the 50% advance" : p?.splitAdvance ? "Advance requested now, part 1 of 2 of the 50% advance" : "Advance requested now (50%)", m(payable)],
      ["Balance (50%), billed at launch", m(fee - adv)],
      ["Payable now", m(payable)],
    ];
  // Sections 3 and 4 as the template has them describe the advance that starts the project. "The account below"
  // there points at the bank details, which are section 2, above (E13 g). Part 2 of a split advance and a change
  // request's advance come after the start, so the start-slot sentences are left out of them and the rule each
  // follows is said instead (E13 j: SA cl. 5.8; Change-Request-Form section 5; spec 4.2 and 4.7).
  const receiptLine = `A numbered receipt (IDV/RC/${tok("fy")}/...) is issued to you within ${policyDays(s.policy.receiptDays, "receipt days")} working days of the credit appearing.`;
  const refundDays = policyDays(s.policy.refundDays, "refund days");
  const afterPayment = isCr
    ? [
      "The advance is credited to the account in section 2.",
      receiptLine,
      "Work on the change begins once this advance is received and the change request form is signed by both parties.",
      "The change's cost is added to the final invoice for the project, and this advance is adjusted against it.",
    ]
    : data.part === 2
      ? ["The payment is credited to the account in section 2.", receiptLine, "The advance is adjusted against the final invoice for the project."]
      : [
        "The advance is credited to the account in section 2.",
        receiptLine,
        "The project start date is confirmed in writing and the slot is held in the calendar.",
        "Work begins. The advance is adjusted against the final invoice for the project.",
      ];
  const terms = isCr
    ? [
      "Work on the change begins on receipt of funds and the signed change request form. Not on a screenshot of a scheduled transfer, on funds credited to the account in section 2.",
      "This proforma is valid for 15 days from its date. After that it is reissued.",
      `The advance is non-refundable once work on the change has started, except as the Service Agreement provides. If the change is cancelled before any work on it is done, the advance is returned in full within ${refundDays} days.`,
      "Quote the proforma number in the transfer remarks so the payment can be matched.",
      "The advance is set off against the change's cost on the final invoice. It is a part payment, not an additional charge.",
    ]
    : data.part === 2
      ? [
        "This proforma is valid for 15 days from its date. After that it is reissued.",
        "The advance is non-refundable once work has started, except as the Service Agreement provides.",
        "Quote the proforma number in the transfer remarks so the payment can be matched.",
        "The advance is set off against the project total. It is a part payment, not an additional charge.",
      ]
      : [
        "Work begins on receipt of funds. Not on the signed quotation, not on a screenshot of a scheduled transfer, and not on a purchase order, on funds credited to the account in section 2.",
        "This proforma is valid for 15 days from its date. After that it is reissued, and the start slot it was holding is released.",
        `The advance is non-refundable once work has started, except as the Service Agreement provides. If the project is cancelled before any work is done, the advance is returned in full within ${refundDays} days.`,
        "Quote the proforma number in the transfer remarks so the payment can be matched.",
        "The advance is set off against the project total. It is a part payment, not an additional charge.",
      ];
  return {
    title: "Proforma Invoice",
    subtitle: `${projectName(p)}, ${cl.orgName}`,
    fileName: "proforma",
    templateNote: true,
    requires: cl.state ? [] : ["[state]"],
    blocks: [
      { type: "callout", title: "Not a tax invoice", lines: [`This is a proforma invoice. It is not a tax invoice and not a receipt. It is a request for the advance agreed in ${agreedIn}.`] },
      { type: "keyValue", rows: [
        ["Proforma no.", tok("number")],
        ["Date", tok("issuedOn")],
        ["Valid until", `${tok("validUntil")} (15 days)`],
        ["Due date", tok("dueOn")],
        against,
        ["Bill to", billTo(cl)],
        ["Project", projectName(p)],
      ] },
      { type: "heading", text: isCr ? "1. What this advance covers (the change request)" : "1. What this advance covers" },
      { type: "table", columns: lineColumns("Description of services"), rows: lineRows(lines) },
      { type: "table", columns: TOTAL_COLUMNS, rows: totals, boldLast: true },
      { type: "paragraph", text: `Total in words: ${words(payable)}.` },
      gstCallout(),
      { type: "keyValue", rows: taxRows(s, true) },
      { type: "heading", text: "2. How to pay" },
      { type: "keyValue", rows: bankRows(s, "Quote the proforma number in the transfer remarks") },
      { type: "heading", text: "3. What happens once the money is in" },
      { type: "bullets", numbered: true, items: afterPayment },
      { type: "heading", text: "4. Terms" },
      { type: "bullets", items: terms },
    ],
  };
}
