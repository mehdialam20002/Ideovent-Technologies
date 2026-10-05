/**
 * From a document to its PDF (client-process-spec 6.1): the model (an issued
 * document's snapshot, a draft's live build), the issue tokens resolved from
 * the row, the field a character cannot be printed from, the watermark, the
 * template note, the number on page 1 and the file name. renderPdf draws it.
 */
import { seriesOf } from "../numbering";
import type { DocKind } from "../types";
import { fileNameFor, modelFor } from "./builders";
import type { DocCtx } from "./context";
import type { DocModel } from "./model";
import type { RenderOpts } from "./render";
import { unprintableField } from "./fields";
import { UnprintableError, resolveModel } from "./text";

export const DRAFT_MARK = "DRAFT, NOT FOR SENDING";

export interface PreparedPdf {
  /** The model with the issue tokens resolved (a draft: "Number on issue"). */
  model: DocModel;
  fileName: string;
  opts: RenderOpts;
}

/** Everything renderPdf needs for this document; throws UnprintableError naming the field. */
export function preparePdf(c: DocCtx, kind: DocKind): PreparedPdf {
  const raw = modelFor(c, kind);
  const field = unprintableField(c, raw);
  if (field) throw new UnprintableError(field);
  const doc = c.doc;
  const status = doc?.status || "draft";
  const model = resolveModel(raw, doc, c.currentFy);
  const number = seriesOf(kind)
    ? status === "draft" ? "Number on issue" : doc?.number || null
    : kind === "change_request" && doc?.data?.crNo ? doc.data.crNo : null;
  const watermark = status === "draft" ? DRAFT_MARK : status === "cancelled" ? `CANCELLED: ${doc?.cancelReason || ""}`.trim() : null;
  return {
    model,
    fileName: fileNameFor(doc, kind, c),
    opts: {
      watermark,
      number,
      templateNote: !!raw.templateNote && c.settings.printTemplateNote,
      docId: doc?.id || `${kind}-${c.project?.id || c.client.id}`,
      issuedOn: doc?.issuedOn || c.today,
      highlightBlanks: status === "draft",
    },
  };
}
