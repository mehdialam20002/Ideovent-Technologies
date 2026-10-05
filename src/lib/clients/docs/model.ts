/**
 * A DOCUMENT AS DATA (client-process-spec 6.1).
 *
 * Every builder is a pure function build<Kind>(ctx) -> DocModel. A model is a
 * title and a list of blocks; it never touches jsPDF, so the Node tests read
 * the model directly and render.ts draws it. What only the issue sets (the
 * number, the dates) is written as a token, {{number}}, {{issuedOn}},
 * {{dueOn}}, {{validUntil}}, {{fy}}: an issued document keeps its model as a
 * snapshot (data.model) and the PDF is drawn from it with the tokens resolved
 * from the frozen row, so the same PDF can be made again. A draft resolves them
 * to "Number on issue" and "set on issue".
 */

export type Align = "left" | "right" | "center";

export type Block =
  | { type: "heading"; text: string; level?: 1 | 2 }
  | { type: "paragraph"; text: string; size?: number; italic?: boolean; muted?: boolean; bold?: boolean }
  | { type: "keyValue"; rows: [string, string][]; widths?: [number, number] }
  | { type: "table"; columns: { label: string; width: number; align?: Align }[]; rows: string[][]; boldLast?: boolean; boldRows?: number[] }
  | { type: "bullets"; items: string[]; size?: number; numbered?: boolean }
  | { type: "callout"; lines: string[]; title?: string }
  | { type: "signatures"; left: string[]; right: string[] }
  | { type: "spacer"; mm?: number }
  | { type: "pageBreak" };

export interface DocModel {
  title: string;
  /** Under the title: "Proforma no. {{number}}", a project line. */
  subtitle?: string;
  blocks: Block[];
  /** The file name without the extension. */
  fileName: string;
  /** A money document prints the template note as a grey footnote while Settings says so. */
  templateNote?: boolean;
  /** The issue-time tokens this model uses. */
  tokens?: string[];
  /** Facts that block the issue without being printed (the proforma's state, 6.2): [labels]. */
  requires?: string[];
}

export const TOKENS = ["number", "issuedOn", "dueOn", "validUntil", "fy"] as const;
export type Token = (typeof TOKENS)[number];
export const tok = (t: Token) => `{{${t}}}`;
