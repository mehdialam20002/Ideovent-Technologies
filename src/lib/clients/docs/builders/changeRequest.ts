/**
 * The change request form (03-legal-docs/contracts/Change-Request-Form.md page 1 exactly; page 2, the
 * internal note, is never printed). One change, one form, numbered CR-01, CR-02 per project. Blocks on the
 * description, reason, scope impact, days, cost, advance and lapse date, and the signatory.
 */
import { contractValueOf, inrGroup } from "../../money";
import { addWorkingDays, fmtDate } from "../../numbering";
import { HOURLY_RATE } from "@/lib/pricing";
import type { DocCtx } from "../context";
import type { DocModel } from "../model";
import { AUTHORISED, legalName, projectName, signatory } from "./common";

export function buildChangeRequest(c: DocCtx): DocModel {
  const p = c.project;
  const cl = c.client;
  const s = c.settings;
  const cr = p?.changeRequests.find((x) => x.no === c.doc?.data?.crNo) || null;
  const has = (v?: string) => (v || "").trim();
  const before = p ? (contractValueOf(p) || 0) - (cr && cr.status === "approved" ? cr.cost : 0) : 0;
  const target = p?.dates.goLiveTarget;
  const after = cr && target ? addWorkingDays(target, cr.days) : null;
  const rate = inrGroup(s.policy.hourlyRate || HOURLY_RATE);
  return {
    title: "Change Request Form",
    subtitle: `${cr?.no || "[CR number]"}, ${projectName(p)}`,
    fileName: "change-request",
    templateNote: true,
    blocks: [
      { type: "paragraph", text: `Raised under the Service Agreement and Statement of Work between Ideovent Technologies and ${legalName(cl)}. One change, one form.` },
      { type: "table", columns: [{ label: "CR number", width: 30 }, { label: "Date raised", width: 30 }, { label: "Project", width: 44 }, { label: "SOW reference", width: 34 }, { label: "Requested by", width: 36 }],
        rows: [[cr?.no || "[CR number]", cr ? fmtDate(cr.raisedAt) : "[date raised]", projectName(p), p?.sowRef || "[SOW reference]", has(cr?.requestedBy) || "[requested by]"]] },
      { type: "heading", text: "1. Description of the change" },
      { type: "paragraph", text: has(cr?.description) || "[description of the change]" },
      { type: "paragraph", text: "What will exist after the change that does not exist now.", italic: true, muted: true, size: 8.5 },
      { type: "heading", text: "2. Reason for the change" },
      { type: "paragraph", text: has(cr?.reason) || "[reason for the change]" },
      { type: "paragraph", text: "Why the client wants it. The reason keeps the talk on the goal, not on blame.", italic: true, muted: true, size: 8.5 },
      { type: "heading", text: "3. Impact on scope" },
      { type: "paragraph", text: has(cr?.scopeImpact) || "[impact on scope]" },
      { type: "paragraph", text: "Which pages, screens and features in the SOW are added, changed or removed.", italic: true, muted: true, size: 8.5 },
      { type: "heading", text: "4. Impact on timeline and cost" },
      { type: "table", columns: [{ label: "", width: 40 }, { label: "Before this change", width: 44 }, { label: "Change", width: 46 }, { label: "After this change", width: 44 }], rows: [
        ["Delivery date", target ? fmtDate(target) : "[delivery date]", cr ? `+ ${cr.days} working days` : "[working days]", after ? fmtDate(after) : "[revised delivery date]"],
        ["Project fee", `Rs. ${inrGroup(before)}`, cr ? `+ Rs. ${inrGroup(cr.cost)}` : "[cost]", cr ? `Rs. ${inrGroup(before + cr.cost)}` : "[revised total]"],
        ["Amount payable now", "-", "Advance on this change", cr ? `Rs. ${inrGroup(cr.advanceDue)}` : "[advance]"],
      ] },
      { type: "paragraph", text: `Priced at Rs. ${rate} per hour under Clause 6.3 of the Service Agreement, or at the fixed price written above. GST not applicable. Supplier is not registered under GST.`, italic: true, size: 8.5 },
      { type: "heading", text: "5. Work does not start until this is signed and paid" },
      { type: "callout", lines: [
        "Work on this change does not begin until this form is signed by both parties AND the advance shown above is received. Until then the project continues on the original scope, fee and delivery date.",
        `This quote, both the amount and the working days, is open for acceptance until ${cr?.lapsesOn ? fmtDate(cr.lapsesOn) : "[lapse date]"}. After that date it lapses and the change is re-quoted, because the cost of fitting work into a schedule depends on when it is fitted in. Approval on or before that date also fixes the revised delivery date shown above; approval later than it moves that date again, day for day.`,
        "Everything not described here stays exactly as it is in the Statement of Work and in the Service Agreement. This form changes one thing; it does not reopen the project, and it does not vary the legal terms of the Service Agreement.",
      ] },
      { type: "heading", text: "6. Approval" },
      { type: "paragraph", text: `Both parties agree the change, the revised fee and the revised delivery date above. Once signed, this form becomes part of Statement of Work ${p?.sowRef || "[SOW reference]"}.` },
      { type: "signatures",
        left: ["For Ideovent Technologies", "Signature: ____________________________", `${signatory(s)}, ${AUTHORISED}`, "Date: ______"],
        right: [`For ${legalName(cl)}`, "Signature: ____________________________", `${cl.signatoryName || "______"}, ${cl.signatoryDesignation || "______"}`, "Date: ______"] },
      { type: "paragraph", text: "Return the signed form to contact@ideovent.in or on +91 77619 21786.", italic: true, size: 8.5 },
    ],
  };
}
