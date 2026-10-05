/**
 * Issuing a document (client-process-spec 5.2, 6.1): the model is built from the live data one last
 * time, checked (no [blank], every character printable, a client in India for money), saved on the
 * draft as data.model with its amount, and then crm_issue_document numbers and freezes it. From then on
 * the PDF is drawn from that snapshot with the issue tokens resolved from the frozen row, so the copy
 * the client received can be made again, byte for byte, whatever changes on the client card later.
 */
import type { ClientStore } from "../store";
import type { CrmDocument, CrmPayment, DraftInput } from "../types";
import { amountFor, BUILDERS, issueProblems } from "./builders";
import { docContext, type DocSource } from "./context";

export class IssueBlocked extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(problems.join(" "));
    this.name = "IssueBlocked";
    this.problems = problems;
  }
}

/** The context a document is built in: its project, or (a care plan invoice) its client. */
export function ctxForDoc(data: DocSource, doc: Pick<CrmDocument, "id" | "projectId" | "clientId">, now = new Date()) {
  return docContext(data, doc.projectId ? { projectId: doc.projectId } : { clientId: doc.clientId }, doc.id, now);
}

/** What stops this draft from being issued now ([] when nothing). */
export function problemsFor(data: DocSource, doc: CrmDocument, now = new Date()): string[] {
  const c = ctxForDoc(data, doc, now);
  return issueProblems(c, doc.kind, BUILDERS[doc.kind](c));
}

export async function issueWithSnapshot(store: ClientStore, data: DocSource, docId: string, now = new Date()): Promise<CrmDocument> {
  const doc = data.documents.find((d) => d.id === docId);
  if (!doc) throw new Error("No such document.");
  if (doc.status !== "draft") throw new Error("This document is already issued.");
  const c = ctxForDoc(data, doc, now);
  const model = BUILDERS[doc.kind](c);
  const problems = issueProblems(c, doc.kind, model);
  if (problems.length) throw new IssueBlocked(problems);
  const amount = amountFor(c, doc.kind);
  const input: DraftInput = {
    id: doc.id,
    clientId: doc.clientId,
    projectId: doc.projectId,
    kind: doc.kind,
    milestone: doc.milestone,
    amount: amount ?? doc.amount,
    paymentId: doc.paymentId,
    relatedDoc: doc.relatedDoc,
    data: { ...doc.data, model },
  };
  await store.saveDraft(input);
  return store.issueDocument(doc.id);
}

/** A receipt's draft for one recorded payment: the amount credited, against that payment's document. */
export const receiptDraft = (p: CrmPayment): DraftInput => ({
  clientId: p.clientId,
  projectId: p.projectId,
  kind: "receipt",
  milestone: null,
  amount: p.amount,
  paymentId: p.id,
  relatedDoc: p.againstDoc,
  data: {},
});
