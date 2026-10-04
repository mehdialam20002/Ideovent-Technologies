/**
 * The quotation (03-legal-docs/billing/Quotation-Template.md sections 1 to 7; the "Internal, remove before
 * sending" page left out). Edit E6 makes the four numbers match the agreement: "2 rounds of revision are
 * included at each design stage" and "within 7 calendar days". Blocks on (beyond Settings' firm PAN and
 * signatory): the legal name, the project name, one scope line with text, the weeks, [[ASSET_DEADLINE_DAYS]].
 */
import { advanceOf, feeOf, inrGroup, lineAmount, subtotalOf } from "../../money";
import { HOURLY_RATE } from "@/lib/pricing";
import type { DocCtx } from "../context";
import { tok, type DocModel } from "../model";
import {
  AUTHORISED, gstCallout, legalName, lineColumns, lineRows, m, policyDays, projectName, signatory, taxRows, TOTAL_COLUMNS, words,
} from "./common";

export function buildQuotation(c: DocCtx): DocModel {
  const p = c.project;
  const cl = c.client;
  const s = c.settings;
  const lines = (p?.lines || []).map((l) => ({ ...l, amount: lineAmount(l) }));
  const subtotal = p ? subtotalOf(p) : 0;
  const total = p ? feeOf(p) || 0 : 0;
  const adv = advanceOf(total);
  const rate = s.policy.hourlyRate || HOURLY_RATE;
  const weeks = p?.durationWeeks ? String(p.durationWeeks) : "[weeks]";
  const totals: string[][] = [["Subtotal", m(subtotal)]];
  if (p?.discount) totals.push([`Less: discount ${p.discount.reason === "case_study" ? "(named case study)" : "(second project in the same agreement)"}`, `-${m(p.discount.amount)}`]);
  totals.push(["Total", m(total)]);
  return {
    title: "Quotation",
    subtitle: `${projectName(p)}, ${cl.orgName}`,
    fileName: "quotation",
    templateNote: true,
    blocks: [
      { type: "keyValue", rows: [
        ["Quotation no.", tok("number")],
        ["Date", tok("issuedOn")],
        ["Valid until", `${tok("validUntil")} (15 days)`],
        ["Prepared for", `${legalName(cl)}, ${projectName(p)}`],
        ["Prepared by", `${signatory(s)}, ${AUTHORISED}`],
      ] },
      { type: "paragraph", text: "This quotation sets out what Ideovent Technologies will build, what it costs, and what it does not include. It is an offer, not an invoice: no money is due against it. Signing the acceptance block on the last page turns it into a confirmed order." },
      { type: "heading", text: "1. Scope and price" },
      { type: "table", columns: lineColumns("Description of services"), rows: lineRows(lines) },
      { type: "table", columns: TOTAL_COLUMNS, rows: totals, boldLast: true },
      { type: "paragraph", text: `Total in words: ${words(total)}.` },
      gstCallout(),
      { type: "keyValue", rows: taxRows(s, true) },
      { type: "heading", text: "2. What the price does not include" },
      { type: "bullets", items: [
        "Domain registration and renewal.",
        "Hosting, cloud, CDN and email hosting charges. Billed by the provider directly to the client, or recharged at cost.",
        "Paid third-party licences, themes, plugins, APIs, SMS and email credits, map and AI service usage.",
        "Payment gateway setup fees, transaction fees and settlement charges.",
        "App store and developer programme fees, and the accounts needed to publish.",
        "Content: copywriting, translation, product photography, video, stock images and illustration, unless a line item above says otherwise.",
        "Data entry and migration of legacy records beyond what a line item above states.",
        "Printing, hardware, devices and on-site installation.",
        "Maintenance, hosting management and support after the warranty period. Covered by a separate care plan.",
        "Travel and accommodation for on-site visits, at actuals and agreed in advance.",
        "Anything not written into the scope table above. A new requirement goes through a change request and is quoted separately.",
      ] },
      { type: "heading", text: "3. What this price assumes" },
      { type: "bullets", items: [
        "The client names one person who consolidates feedback and can approve on their side.",
        `Content, logins, brand assets and access to existing systems reach us within ${policyDays(s.policy.assetDeadlineDays, "asset deadline days")} days of the advance being received.`,
        "Feedback on a deliverable comes back within 7 calendar days. Idle time at the client's end moves the delivery date by the same number of days.",
        `2 rounds of revision are included at each design stage. Further rounds and out-of-scope work are charged at Rs ${inrGroup(rate)} per hour.`,
        "The price holds for the scope in the table above, quoted as one job. Splitting the scope or dropping items may change the rate.",
        "Prices are in Indian Rupees and hold until the validity date on page 1.",
      ] },
      { type: "heading", text: "4. Timeline" },
      { type: "bullets", items: [
        `The indicative duration is ${weeks} weeks of working time from the start date.`,
        "The clock starts on the later of two events: the advance is credited, and the content, logins and brand assets listed in the assumptions have been received.",
        "A week in which the project is waiting on the client is not a working week. The end date moves out by the same number of days.",
        "Milestone dates are written into the Statement of Work once this quotation is accepted.",
      ] },
      { type: "heading", text: "5. Payment schedule" },
      { type: "table", columns: [
        { label: "Stage", width: 64 }, { label: "Share", width: 16, align: "right" }, { label: "Amount (INR)", width: 30, align: "right" }, { label: "What it releases", width: 64 },
      ], rows: [
        ["1. Advance, on acceptance", "50%", m(adv), "Booked in the calendar. Work starts."],
        ["2. At launch, when the finished work is approved on staging", "50%", m(total - adv), "Due before go-live, source handover and transfer of IP."],
        ["Total", "100%", m(total), ""],
      ], boldLast: true },
      { type: "bullets", items: [
        "Each of the two payments above is invoiced when it falls due. Payment is due within 7 days of the date of that invoice.",
        "The advance is collected against a proforma invoice issued on acceptance. The launch payment is collected against a numbered invoice carrying its own bank details.",
        "Payment is by NEFT, IMPS, RTGS or UPI. Cash is not accepted. A cheque is accepted only by prior agreement and counts as paid on clearance, not on handover.",
        "The invoice number must appear in the transfer remarks. A payment that cannot be matched to an invoice cannot be credited to the account.",
        "Late payment carries interest at 1.5% per month on the outstanding amount, running from the due date until the money is received.",
      ] },
      { type: "heading", text: "6. Validity" },
      { type: "paragraph", text: `Valid for 15 days from ${tok("issuedOn")}, that is until ${tok("validUntil")}. After that date the price and the start slot are re-confirmed before work is booked.` },
      { type: "heading", text: "7. Acceptance" },
      { type: "bullets", numbered: true, items: [
        "Signing below accepts this quotation and converts it into a confirmed order for the scope, price and payment schedule printed above.",
        "On receipt of the signed copy, Ideovent Technologies issues a proforma invoice for the advance. Work begins when that advance is credited: not when the signature arrives.",
        "This quotation, the Statement of Work and the Service Agreement are read together. Where they differ, the Service Agreement governs.",
        "If the signed copy arrives after the validity date, the price is re-confirmed before anything starts.",
      ] },
      { type: "signatures",
        left: ["For Ideovent Technologies", "Signature: ____________________________", `${signatory(s)}, ${AUTHORISED}`, "Date: ______________"],
        right: [`For ${legalName(cl)}`, "Signature: ____________________________", `${cl.signatoryName || "______"}, ${cl.signatoryDesignation || "______"}`, "Date: ______________"] },
    ],
  };
}
