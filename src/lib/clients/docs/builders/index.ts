/**
 * The ten builders, by kind, and what a document needs before it can be issued.
 */
import { numberForFile, seriesOf } from "../../numbering";
import type { CrmDocument, DocKind } from "../../types";
import type { DocCtx } from "../context";
import type { DocModel } from "../model";
import { unprintableField } from "../fields";
import { UnprintableError, modelBlanks } from "../text";
import { buildCarePlan } from "./carePlan";
import { buildChangeRequest } from "./changeRequest";
import { buildClosing } from "./closing";
import { buildCreditNote } from "./creditNote";
import { buildHandover } from "./handover";
import { buildInvoice, invoiceFigures } from "./invoice";
import { buildProforma, proformaAmount } from "./proforma";
import { buildQuotation } from "./quotation";
import { buildReceipt } from "./receipt";
import { buildWelcome } from "./welcome";
import { shortName } from "./common";
import { feeOf } from "../../money";

export const BUILDERS: Record<DocKind, (c: DocCtx) => DocModel> = {
  quotation: buildQuotation,
  proforma: buildProforma,
  invoice: buildInvoice,
  receipt: buildReceipt,
  credit_note: buildCreditNote,
  welcome: buildWelcome,
  change_request: buildChangeRequest,
  handover: buildHandover,
  care_plan: buildCarePlan,
  closing: buildClosing,
};

export const DOC_TITLES: Record<DocKind, string> = {
  quotation: "Quotation", proforma: "Proforma", invoice: "Invoice", receipt: "Receipt", credit_note: "Credit note", welcome: "Welcome pack",
  change_request: "Change request form", handover: "Handover document", care_plan: "Care plan options", closing: "Closing letter",
};

/**
 * The model of a document: an issued one from its snapshot (data.model), never rebuilt, so the PDF a
 * client received can be made again exactly; a draft from the live data.
 */
export function modelFor(c: DocCtx, kind: DocKind): DocModel {
  const doc = c.doc;
  if (doc && doc.status !== "draft" && doc.data?.model) return doc.data.model;
  return BUILDERS[kind](c);
}

/** The amount (the column the money math reads, 5.1) a draft of this kind carries. */
export function amountFor(c: DocCtx, kind: DocKind): number | null {
  switch (kind) {
    case "quotation": return c.project ? feeOf(c.project) : null;
    case "proforma": return proformaAmount(c);
    case "invoice": return invoiceFigures(c).totalDue;
    case "receipt": { const pay = c.payments.find((p) => p.id === c.doc?.paymentId); return pay ? pay.amount : null; }
    case "credit_note": return c.doc?.amount ?? null;
    default: return null;
  }
}

/** What stops this document from being issued: its blanks, an unprintable character, a client outside India for money. */
export function issueProblems(c: DocCtx, kind: DocKind, model: DocModel): string[] {
  const out: string[] = [];
  if (seriesOf(kind) && c.client.inIndia === false) out.push("Clients outside India: the MSA and the export invoice in 03-legal-docs govern (not in the CRM yet).");
  const blanks = modelBlanks(model);
  if (blanks.length) out.push(`Fill in ${blanks.join(", ")} before issuing.`);
  const field = unprintableField(c, model);
  if (field) out.push(new UnprintableError(field).message);
  return out;
}

/** The PDF file name: a numbered document's number with "-" for "/", then the client's short name (the Invoice template's filing rule). */
export function fileNameFor(doc: Pick<CrmDocument, "kind" | "status" | "number" | "issuedOn" | "data"> | null, kind: DocKind, c: Pick<DocCtx, "client" | "today">): string {
  const short = shortName(c.client);
  const status = doc?.status || "draft";
  if (doc?.number && status !== "draft") return `${numberForFile(doc.number)}-${short}.pdf`;
  const day = doc?.issuedOn || c.today;
  const word: Record<DocKind, string> = {
    quotation: "Quotation", proforma: "Proforma", invoice: "Invoice", receipt: "Receipt", credit_note: "CreditNote", welcome: "Welcome",
    change_request: `CR-${(doc?.data?.crNo || "").replace(/^CR-/, "") || "xx"}`, handover: "Handover", care_plan: "CarePlan", closing: "Closing",
  };
  const prefix = status === "draft" ? "DRAFT-Ideovent" : "Ideovent";
  return `${prefix}-${word[kind]}-${short}-${day}.pdf`;
}
