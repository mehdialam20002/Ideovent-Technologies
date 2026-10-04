/**
 * Drawing a document (client-process-spec 6.1 "Render").
 *
 * renderPdf(model, opts) imports jsPDF only when called (as the certificate
 * does), A4 portrait in millimetres, margins 18 mm, Helvetica 10 pt body (9 pt
 * in tables, 8 pt footnotes), headings bold navy #0A1633, rules and callout
 * borders gold #8C6F22, body slate #334155. Page 1 carries the logo (in the
 * browser), the firm, the address strip, the title and the number; every page
 * the address strip and "Page X of Y". Pages break by measuring each block; a
 * table row is never split. A draft prints "DRAFT, NOT FOR SENDING" diagonally
 * on every page and highlights each [blank] in amber; a cancelled document
 * "CANCELLED: <reason>". No doc.html(): text only (html2canvas and canvg are
 * stubbed in vite.config.ts). The same model and options give the same bytes:
 * a fixed creation date (the issue date at 10:00 India time), a file id from
 * the document id, compress off.
 */
import { PLACEHOLDER_RE } from "@/lib/outreach/engine";
import type { Block, DocModel } from "./model";
import { printable } from "./text";
import { ADDRESS_STRIP, FIRM, TEMPLATE_NOTE } from "./builders/common";

type RGB = [number, number, number];
const NAVY: RGB = [10, 22, 51];
const GOLD: RGB = [140, 111, 34];
const SLATE: RGB = [51, 65, 85];
const MUTED: RGB = [100, 116, 139];
const FILL: RGB = [238, 241, 248];
const CALLOUT: RGB = [251, 247, 236];
const AMBER: RGB = [253, 230, 138];
const WATERMARK: RGB = [205, 210, 219];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const WIDTH = PAGE_W - 2 * MARGIN;
const BOTTOM = PAGE_H - MARGIN - 8;
const PT = 0.3528;

export interface RenderOpts {
  /** The jsPDF constructor (Node tests pass it; the browser imports it). */
  jsPDF?: unknown;
  /** A PNG data URL of the logo (browser only). */
  logo?: string | null;
  /** "DRAFT, NOT FOR SENDING" on a draft, "CANCELLED: <reason>" on a cancelled one. */
  watermark?: string | null;
  /** Prints the template note as a grey footnote (money documents, while Settings says so). */
  templateNote?: boolean;
  /** The document id: the file id (32 hex characters). */
  docId?: string;
  /** India date of issue (the creation date is that day at 10:00 India time). */
  issuedOn?: string | null;
  /** Shown beside the title on page 1. */
  number?: string | null;
  highlightBlanks?: boolean;
  output?: "bytes" | "blob" | "string";
}

/** The document id as 32 hex characters (setFileId). */
export function fileIdOf(id: string): string {
  let hex = "";
  for (const ch of id) hex += ch.charCodeAt(0).toString(16).padStart(2, "0");
  return (hex + "0".repeat(32)).slice(0, 32).toUpperCase();
}

const BLANK = new RegExp(PLACEHOLDER_RE.source);

interface Pdf {
  internal: { pageSize: { getWidth(): number } };
  setFont(name: string, style: string): void;
  setFontSize(n: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setFillColor(r: number, g: number, b: number): void;
  setLineWidth(n: number): void;
  text(t: string | string[], x: number, y: number, o?: Record<string, unknown>): void;
  splitTextToSize(t: string, w: number): string[];
  getTextWidth(t: string): number;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  addPage(): void;
  setPage(n: number): void;
  getNumberOfPages(): number;
  addImage(data: string, fmt: string, x: number, y: number, w: number, h: number): void;
  setCreationDate(d: Date): void;
  setFileId(id: string): void;
  setDocumentProperties(p: Record<string, string>): void;
  output(type?: string): unknown;
}

export async function renderPdf(model: DocModel, opts: RenderOpts = {}): Promise<Uint8Array | Blob | string> {
  const Ctor = (opts.jsPDF || (await import("jspdf")).jsPDF) as new (o: Record<string, unknown>) => Pdf;
  const doc = new Ctor({ unit: "mm", format: "a4", orientation: "portrait", compress: false });
  const day = opts.issuedOn || new Date().toISOString().slice(0, 10);
  doc.setCreationDate(new Date(`${day}T10:00:00+05:30`));
  doc.setFileId(fileIdOf(opts.docId || model.fileName || "ideovent"));
  doc.setDocumentProperties({ title: printable(model.title), subject: printable(opts.number || ""), author: FIRM, creator: "Ideovent CRM" });

  let y = 0;
  const color = (c: RGB, kind: "text" | "draw" | "fill" = "text") =>
    kind === "text" ? doc.setTextColor(...c) : kind === "draw" ? doc.setDrawColor(...c) : doc.setFillColor(...c);
  const font = (style: "normal" | "bold" | "italic" | "bolditalic", size: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const lh = (size: number) => size * PT * 1.3;
  const newPage = () => {
    doc.addPage();
    y = MARGIN;
  };
  const room = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const T = (s: string) => printable(s);
  const highlight = (line: string, x: number, yy: number, size: number) => {
    if (!opts.highlightBlanks || !BLANK.test(line)) return;
    const w = Math.min(doc.getTextWidth(line), WIDTH);
    color(AMBER, "fill");
    doc.rect(x - 0.6, yy - size * PT * 0.95, w + 1.2, size * PT * 1.25, "F");
  };
  const lines = (text: string, x: number, width: number, size: number, style: "normal" | "bold" | "italic" = "normal", c: RGB = SLATE, align: "left" | "right" | "center" = "left") => {
    font(style, size);
    const out: string[] = [];
    for (const para of T(text).split("\n")) out.push(...(para ? doc.splitTextToSize(para, width) : [""]));
    return { out, draw: (yy: number) => {
      out.forEach((ln, i) => {
        const ly = yy + i * lh(size);
        const lx = align === "right" ? x + width : align === "center" ? x + width / 2 : x;
        highlight(ln, align === "right" ? lx - doc.getTextWidth(ln) : lx, ly, size);
        font(style, size);
        color(c);
        doc.text(ln, lx, ly, align === "left" ? undefined : { align });
      });
    } };
  };

  /* Page 1 header. */
  y = MARGIN;
  let hx = MARGIN;
  if (opts.logo) {
    try {
      doc.addImage(opts.logo, "PNG", MARGIN, y - 4, 11, 11);
      hx = MARGIN + 14;
    } catch {
      /* no logo, the name stands alone */
    }
  }
  font("bold", 14);
  color(NAVY);
  doc.text(FIRM, hx, y + 2);
  font("normal", 8);
  color(MUTED);
  doc.text(T(ADDRESS_STRIP), hx, y + 6.5);
  color(GOLD, "draw");
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10);
  y += 18;
  font("bold", 16);
  color(NAVY);
  const titleLines = doc.splitTextToSize(T(model.title), opts.number ? WIDTH - 55 : WIDTH);
  doc.text(titleLines, MARGIN, y);
  if (opts.number) {
    font("bold", 10);
    color(NAVY);
    doc.text(T(opts.number), PAGE_W - MARGIN, y, { align: "right" });
  }
  y += titleLines.length * lh(16);
  if (model.subtitle) {
    const s = lines(model.subtitle, MARGIN, WIDTH, 9, "normal", MUTED);
    s.draw(y);
    y += s.out.length * lh(9) + 2;
  }
  y += 3;

  const drawBlock = (b: Block) => {
    switch (b.type) {
      case "heading": {
        const size = b.level === 2 ? 10 : 11.5;
        const before = b.level === 2 ? 3 : 5;
        const l = lines(b.text, MARGIN, WIDTH, size, "bold", NAVY);
        room(before + l.out.length * lh(size) + 8);
        y += before;
        l.draw(y);
        y += l.out.length * lh(size) + 1.5;
        return;
      }
      case "paragraph": {
        const size = b.size || 10;
        const style = b.bold ? "bold" : b.italic ? "italic" : "normal";
        const l = lines(b.text, MARGIN, WIDTH, size, style, b.muted ? MUTED : SLATE);
        for (const ln of l.out) {
          room(lh(size));
          highlight(ln, MARGIN, y, size);
          font(style, size);
          color(b.muted ? MUTED : SLATE);
          doc.text(ln, MARGIN, y);
          y += lh(size);
        }
        y += 2;
        return;
      }
      case "keyValue": {
        const [kw, vw] = b.widths || [52, WIDTH - 52];
        for (const [k, v] of b.rows) {
          const kl = lines(k, MARGIN + 1.5, kw - 3, 9, "bold", NAVY);
          const vl = lines(v, MARGIN + kw + 1.5, vw - 3, 9);
          const h = Math.max(kl.out.length, vl.out.length) * lh(9) + 2.4;
          room(h);
          color(FILL, "fill");
          doc.rect(MARGIN, y - 3.4, kw, h, "F");
          kl.draw(y);
          vl.draw(y);
          color([220, 226, 236], "draw");
          doc.setLineWidth(0.15);
          doc.line(MARGIN, y - 3.4 + h, MARGIN + kw + vw, y - 3.4 + h);
          y += h;
        }
        y += 3;
        return;
      }
      case "table": {
        const total = b.columns.reduce((s, c) => s + c.width, 0) || 1;
        const widths = b.columns.map((c) => (c.width / total) * WIDTH);
        const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((s, w) => s + w, 0));
        const header = () => {
          if (b.columns.every((c) => !c.label)) return;
          const cells = b.columns.map((c, i) => lines(c.label, xs[i] + 1.5, widths[i] - 3, 8, "bold", NAVY, c.align || "left"));
          const h = Math.max(...cells.map((c) => c.out.length)) * lh(8) + 2.6;
          room(h + 6);
          color(FILL, "fill");
          doc.rect(MARGIN, y - 3.2, WIDTH, h, "F");
          cells.forEach((c) => c.draw(y));
          y += h;
        };
        header();
        b.rows.forEach((row, ri) => {
          const bold = (b.boldLast && ri === b.rows.length - 1) || (b.boldRows || []).includes(ri);
          const cells = row.map((cell, i) => lines(cell, xs[i] + 1.5, widths[i] - 3, 9, bold ? "bold" : "normal", bold ? NAVY : SLATE, b.columns[i]?.align || "left"));
          const h = Math.max(1, ...cells.map((c) => c.out.length)) * lh(9) + 2.6;
          if (y + h > BOTTOM) {
            newPage();
            header();
          }
          cells.forEach((c) => c.draw(y));
          color([220, 226, 236], "draw");
          doc.setLineWidth(0.15);
          doc.line(MARGIN, y - 3.2 + h, MARGIN + WIDTH, y - 3.2 + h);
          y += h;
        });
        y += 3;
        return;
      }
      case "bullets": {
        const size = b.size || 9.5;
        b.items.forEach((item, i) => {
          const mark = b.numbered ? `${i + 1}.` : "•";
          const l = lines(item, MARGIN + 6, WIDTH - 6, size);
          l.out.forEach((ln, j) => {
            room(lh(size));
            if (j === 0) {
              font("normal", size);
              color(GOLD);
              doc.text(mark, MARGIN + 1, y);
            }
            highlight(ln, MARGIN + 6, y, size);
            font("normal", size);
            color(SLATE);
            doc.text(ln, MARGIN + 6, y);
            y += lh(size);
          });
          y += 0.8;
        });
        y += 2;
        return;
      }
      case "callout": {
        const title = b.title ? lines(b.title, MARGIN + 4, WIDTH - 8, 9.5, "bold", NAVY) : null;
        const body = b.lines.map((t) => lines(t, MARGIN + 4, WIDTH - 8, 9.5));
        const h = (title ? title.out.length * lh(9.5) + 1 : 0) + body.reduce((s, x) => s + x.out.length * lh(9.5) + 1.2, 0) + 4;
        room(h + 2);
        color(CALLOUT, "fill");
        color(GOLD, "draw");
        doc.setLineWidth(0.4);
        doc.rect(MARGIN, y - 3.4, WIDTH, h, "FD");
        let yy = y + 0.6;
        if (title) {
          title.draw(yy);
          yy += title.out.length * lh(9.5) + 1;
        }
        for (const x of body) {
          x.draw(yy);
          yy += x.out.length * lh(9.5) + 1.2;
        }
        y += h + 2;
        return;
      }
      case "signatures": {
        const half = WIDTH / 2 - 4;
        const left = b.left.map((t, i) => lines(t, MARGIN, half, 9, i === 0 ? "bold" : "normal", i === 0 ? NAVY : SLATE));
        const right = b.right.map((t, i) => lines(t, MARGIN + WIDTH / 2 + 4, half, 9, i === 0 ? "bold" : "normal", i === 0 ? NAVY : SLATE));
        const hl = left.reduce((s, x) => s + x.out.length * lh(9) + 2.5, 0);
        const hr = right.reduce((s, x) => s + x.out.length * lh(9) + 2.5, 0);
        room(Math.max(hl, hr) + 4);
        y += 2;
        let yl = y;
        for (const x of left) {
          x.draw(yl);
          yl += x.out.length * lh(9) + 2.5;
        }
        let yr = y;
        for (const x of right) {
          x.draw(yr);
          yr += x.out.length * lh(9) + 2.5;
        }
        y = Math.max(yl, yr) + 2;
        return;
      }
      case "spacer":
        y += b.mm ?? 4;
        return;
      case "pageBreak":
        newPage();
        return;
    }
  };
  for (const b of model.blocks) drawBlock(b);

  /* Furniture on every page: the strip, Page X of Y, the template note, the watermark. */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    color(GOLD, "draw");
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 15, PAGE_W - MARGIN, PAGE_H - 15);
    font("normal", 8);
    color(MUTED);
    doc.text(T(ADDRESS_STRIP), MARGIN, PAGE_H - 11);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 11, { align: "right" });
    if (opts.templateNote) {
      font("italic", 6.5);
      color([148, 163, 184]);
      doc.text(T(TEMPLATE_NOTE), MARGIN, PAGE_H - 7);
    }
    if (opts.watermark) {
      font("bold", 34);
      color(WATERMARK);
      doc.text(T(opts.watermark).slice(0, 60), PAGE_W / 2, PAGE_H / 2 + 20, { align: "center", angle: 45 });
    }
  }
  if (opts.output === "string") return doc.output() as string;
  if (opts.output === "blob") return doc.output("blob") as Blob;
  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

/** The logo (/ideovent.png) drawn into a canvas, as a PNG data URL; null where there is no DOM. */
export async function loadLogo(): Promise<string | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = 128;
        cv.height = 128;
        cv.getContext("2d")?.drawImage(img, 0, 0, 128, 128);
        resolve(cv.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/ideovent.png";
  });
}
