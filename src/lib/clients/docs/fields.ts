/**
 * The typed facts a document can print, by the words that name them (client-process-spec 6.1 "Text"):
 * a character outside Windows-1252 refuses the PDF naming the field it came from, "The client's name
 * has letters this PDF cannot print. Write it in English letters on the client card."
 */
import type { DocCtx } from "./context";
import type { DocModel } from "./model";
import { modelUnprintable } from "./text";

/** Every typed fact a document can print, with the words that name it in the refusal (6.1 "Text"). */
export function printedFields(c: DocCtx): [string, string | undefined][] {
  const cl = c.client;
  const p = c.project;
  const s = c.settings;
  const out: [string, string | undefined][] = [
    ["The client's name", cl.orgName],
    ["The client's legal name", cl.legalName],
    ["The contact's name", cl.contactName],
    ["The billing address", cl.billingAddress],
    ["The state", cl.state],
    ["The city", cl.city],
    ["The client's GSTIN", cl.gstin],
    ["The client's PAN", cl.pan],
    ["The PO number", cl.poNumber],
    ["The client's signatory", cl.signatoryName],
    ["The signatory's designation", cl.signatoryDesignation],
  ];
  for (const r of Object.values(cl.renewals || {})) out.push(["A renewal on the client card", r?.provider], ["A renewal on the client card", r?.inWhoseName], ["A renewal on the client card", r?.whoPays], ["A renewal on the client card", r?.cost]);
  if (p) {
    out.push(
      ["The project's name", p.name], ["The SOW reference", p.sowRef], ["The proposal number", p.proposalNo], ["The package", p.packageLabel],
      ["The point of contact", p.pointOfContact], ["The escalation contact", p.escalationContact], ["The live URL", p.liveUrl], ["The staging URL", p.stagingUrl],
      ["The domain", p.domainName], ["The admin URL", p.adminUrl], ["The repository", p.repo],
    );
    for (const l of p.lines || []) out.push(["A scope line", l.description], ["A scope line", l.unit]);
    for (const x of p.deliverables || []) out.push(["A deliverable", x.text], ["A deliverable", x.remains], ["A deliverable", x.owner]);
    for (const x of p.issues || []) out.push(["An issue in the log", x.summary], ["An issue in the log", x.done], ["An issue in the log", x.owedBy]);
    for (const x of p.changeRequests || []) out.push(["A change request", x.description], ["A change request", x.reason], ["A change request", x.scopeImpact], ["A change request", x.requestedBy]);
    for (const x of p.access || []) out.push(["The access record", x.system], ["The access record", x.username]);
    if (p.training) out.push(["The training record", p.training.attendees], ["The training record", p.training.notes], ["The training record", p.training.recordingUrl]);
    for (const v of Object.values(p.handover || {})) out.push(["The handover details", v]);
  }
  const b = s.billing;
  out.push(
    ["The bank name in Settings", b.bankName], ["The account name in Settings", b.accountName], ["The account number in Settings", b.accountNo],
    ["The IFSC in Settings", b.ifsc], ["The branch in Settings", b.branch], ["The UPI ID in Settings", b.upiId], ["The firm PAN in Settings", b.firmPan],
    ["The Udyam number in Settings", b.udyam],
    ["The authorised signatory in Settings", b.signatory], ["The working hours in Settings", s.policy.workingHours],
    ["The reply target in Settings", s.policy.projectReplyTarget], ["A response time in Settings", s.policy.p1], ["A response time in Settings", s.policy.p2],
    ["A response time in Settings", s.policy.p3], ["The secret-sharing tool in Settings", s.policy.secretTool],
  );
  const dd = c.doc?.data;
  if (dd) {
    out.push(["The credit note's reason", dd.reason], ["The credit note's \"agreed with\"", dd.agreedWith], ["The document's note", dd.note]);
    for (const l of dd.lines || []) out.push(["A credited line", l.description]);
  }
  return out;
}

/** The field a model's unprintable character came from ("The client's name"), or null when all of it prints. */
export function unprintableField(c: DocCtx, model: DocModel): string | null {
  const bad = modelUnprintable(model);
  if (!bad.length) return null;
  for (const [label, value] of printedFields(c)) if (typeof value === "string" && [...value].some((ch) => bad.includes(ch))) return label;
  return "This document";
}
