/**
 * Text rules for the documents (client-process-spec 6.1 "Text", "Blanks").
 *
 * Only Windows-1252 characters are drawn (jsPDF's standard fonts). "₹" becomes
 * "Rs "; curly quotes and the middle dot are kept; anything else outside
 * Windows-1252 refuses the PDF, naming the field it came from. Builders write
 * an unknown required value as [label], the same pattern as messages
 * (PLACEHOLDER_RE): a model with a blank cannot be issued. Signature lines
 * (______) are not blanks: they are for ink.
 */
import { PLACEHOLDER_RE } from "@/lib/outreach/engine";
import { fmtDate } from "../numbering";
import type { CrmDocument } from "../types";
import type { Block, DocModel, Token } from "./model";

/** The Windows-1252 characters above 0x7E that are not Latin-1 (0x80 to 0x9F). */
const CP1252_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

export function isCp1252(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  if (c === 0x0a || c === 0x09) return true;
  if (c >= 0x20 && c <= 0x7e) return true;
  if (c >= 0xa0 && c <= 0xff) return true;
  return CP1252_EXTRA.includes(ch);
}

/** "₹" -> "Rs " (the standard fonts have no rupee sign). */
export const printable = (s: string) => s.replace(/₹\s?/g, "Rs ");

/** The characters of a text that a PDF cannot print. */
export function unprintable(s: string): string[] {
  return [...new Set([...printable(s)].filter((ch) => !isCp1252(ch)))];
}

export class UnprintableError extends Error {
  field: string;
  constructor(field: string) {
    super(`${field} has letters this PDF cannot print. Write it in English letters on the client card.`);
    this.name = "UnprintableError";
    this.field = field;
  }
}

/** Refuses the PDF when a field carries a character outside Windows-1252, naming the field. */
export function assertPrintable(fields: [label: string, value: unknown][]): void {
  for (const [label, value] of fields) {
    if (typeof value === "string" && unprintable(value).length) throw new UnprintableError(label);
  }
}

/** Every text of a model, in order (the tests and the checks read it). */
export function modelTexts(m: DocModel): string[] {
  const out: string[] = [m.title];
  if (m.subtitle) out.push(m.subtitle);
  for (const b of m.blocks) out.push(...blockTexts(b));
  return out;
}

export function blockTexts(b: Block): string[] {
  switch (b.type) {
    case "heading":
    case "paragraph":
      return [b.text];
    case "keyValue":
      return b.rows.flatMap((r) => r);
    case "table":
      return [...b.columns.map((c) => c.label), ...b.rows.flat()];
    case "bullets":
      return b.items;
    case "callout":
      return [...(b.title ? [b.title] : []), ...b.lines];
    case "signatures":
      return [...b.left, ...b.right];
    default:
      return [];
  }
}

export const modelText = (m: DocModel) => modelTexts(m).join("\n");

/** The [blanks] of a model, each once: a model with one cannot be issued. */
export function modelBlanks(m: DocModel): string[] {
  return [...new Set([...(modelText(m).match(new RegExp(PLACEHOLDER_RE.source, "g")) || []), ...(m.requires || [])])];
}

/** Characters a model carries that a PDF cannot print. */
export const modelUnprintable = (m: DocModel) => unprintable(modelText(m));

/** Resolves the issue-time tokens from the row: an issued document's own values, a draft's "Number on issue". */
export function resolveTokens(text: string, doc: Pick<CrmDocument, "status" | "number" | "issuedOn" | "dueOn" | "validUntil" | "fy"> | null, currentFy: string): string {
  const issued = doc && doc.status !== "draft";
  const values: Record<Token, string> = {
    number: issued ? doc!.number || "" : "Number on issue",
    issuedOn: issued ? fmtDate(doc!.issuedOn) : "Date on issue",
    dueOn: issued ? fmtDate(doc!.dueOn) : "set on issue (7 days)",
    // The quotation and the proforma print "Valid until {{validUntil}} (15 days)": the draft's own words must not say
    // "(15 days)" a second time ("set on issue (15 days) (15 days)").
    validUntil: issued ? fmtDate(doc!.validUntil) : "set on issue",
    fy: issued && doc!.fy ? doc!.fy : currentFy,
  };
  return text.replace(/\{\{(number|issuedOn|dueOn|validUntil|fy)\}\}/g, (_w, k: Token) => values[k]);
}

export function resolveModel(m: DocModel, doc: Parameters<typeof resolveTokens>[1], currentFy: string): DocModel {
  const r = (s: string) => resolveTokens(s, doc, currentFy);
  const blocks: Block[] = m.blocks.map((b): Block => {
    switch (b.type) {
      case "heading": return { ...b, text: r(b.text) };
      case "paragraph": return { ...b, text: r(b.text) };
      case "keyValue": return { ...b, rows: b.rows.map(([k, v]) => [r(k), r(v)] as [string, string]) };
      case "table": return { ...b, columns: b.columns.map((c) => ({ ...c, label: r(c.label) })), rows: b.rows.map((row) => row.map(r)) };
      case "bullets": return { ...b, items: b.items.map(r) };
      case "callout": return { ...b, title: b.title ? r(b.title) : b.title, lines: b.lines.map(r) };
      case "signatures": return { ...b, left: b.left.map(r), right: b.right.map(r) };
      default: return b;
    }
  });
  return { ...m, title: r(m.title), subtitle: m.subtitle ? r(m.subtitle) : m.subtitle, fileName: r(m.fileName), blocks };
}
