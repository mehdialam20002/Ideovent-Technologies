import { PAGE_MM, PRINT_DPI } from "./artwork";

/**
 * Getting the certificate out of the browser as a file someone can print.
 *
 * PNG, 300 DPI, 3508 × 2480
 * --------------------------
 * 300 DPI is the commercial print standard; below about 200 the gold hairlines
 * and the letterspaced small caps start to break up, and the QR modules stop
 * being square. The canvas is drawn at that resolution by `drawCertificate`
 * rather than being scaled up afterwards, so every edge is geometry, not
 * interpolation.
 *
 * A pHYs chunk is spliced into the PNG so the file declares 300 DPI. Without it
 * Word, Photoshop and every print shop's software assume 72 and place an A4
 * certificate on the page at roughly four times its intended size: the file is
 * sharp and the print is still wrong.
 *
 * PDF. One A4 landscape page, exact
 * ----------------------------------
 * jsPDF, with the page declared in millimetres as A4 landscape and the image
 * placed edge to edge. The PDF page is therefore exactly 297 × 210 mm and prints
 * at 100% with no "fit to page" scaling, which is the thing that otherwise
 * shrinks a certificate by 4% and leaves a white margin down one side.
 *
 * jsPDF is loaded with a dynamic import so it is fetched when somebody clicks
 * Download, not by every visitor who opens the site.
 */

export interface ExportResult {
  filename: string;
  bytes: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

/** `Ankit_Kumar_INT2025A73_Ideovent_Certificate`: no extension. */
export function certificateFilename(internName: string, certificateId: string): string {
  const name = (internName || "certificate")
.normalize("NFKD")
.replace(/[^\w-]+/g, "_")
.replace(/^_+|_+$/g, "");
  const id = (certificateId || "").replace(/[^\w-]+/g, "");
  return [name, id, "Ideovent_Certificate"].filter(Boolean).join("_");
}

/* ── PNG DPI metadata ─────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1): c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Splice a pHYs chunk declaring `dpi` into a PNG produced by `canvas.toBlob`.
 *
 * Canvas PNGs carry no resolution at all, which every consumer reads as 72 DPI.
 * The chunk is 9 bytes of payload, pixels per metre on each axis, plus a unit
 * flag, inserted immediately after IHDR, which is where the specification
 * requires it (before the first IDAT).
 */
function withPngDpi(png: ArrayBuffer, dpi: number): Blob {
  const src = new Uint8Array(png);
  const perMetre = Math.round(dpi / 0.0254);

  // 8-byte signature, then IHDR: 4 length + 4 type + 13 data + 4 CRC = 25 bytes.
  const insertAt = 8 + 25;
  if (src.length < insertAt || src[12] !== 0x49 /* I */ || src[13] !== 0x48 /* H */) {
    // Not the layout we expected, return the PNG untouched rather than corrupt it.
    return new Blob([src], { type: "image/png" });
  }

  const chunk = new Uint8Array(21); // 4 len + 4 type + 9 data + 4 crc
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, perMetre);
  view.setUint32(12, perMetre);
  chunk[16] = 1; // unit = metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(src.subarray(insertAt), insertAt + chunk.length);
  return new Blob([out], { type: "image/png" });
}

/* ── Saving ───────────────────────────────────────────────────────── */

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick: revoking synchronously races the download in
  // Firefox and the file arrives empty.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob): reject(new Error("Canvas could not be encoded as PNG."))), "image/png");
  });
}

/** Download the canvas as a 300 DPI PNG that declares its own resolution. */
export async function downloadCertificatePng(
  canvas: HTMLCanvasElement,
  baseName: string,
  dpi = PRINT_DPI
): Promise<ExportResult> {
  const raw = await canvasToPngBlob(canvas);
  const tagged = withPngDpi(await raw.arrayBuffer(), dpi);
  const filename = `${baseName}.png`;
  saveBlob(tagged, filename);
  return { filename, bytes: tagged.size, widthPx: canvas.width, heightPx: canvas.height, dpi };
}

/** Download the canvas as a single-page A4 landscape PDF, sized in millimetres. */
export async function downloadCertificatePdf(
  canvas: HTMLCanvasElement,
  baseName: string,
  meta: { title: string; subject?: string } = { title: "Ideovent certificate" },
  dpi = PRINT_DPI
): Promise<ExportResult> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });

  doc.setProperties({
    title: meta.title,
    subject: meta.subject ?? "Ideovent LaunchPad certificate of completion",
    author: "Ideovent Technologies",
    creator: "Ideovent Technologies",
  });

  // PNG rather than JPEG: the artwork is flat colour and hairlines, which JPEG
  // rings around badly, and the QR must stay hard-edged.
  doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, PAGE_MM.w, PAGE_MM.h, undefined, "FAST");

  const filename = `${baseName}.pdf`;
  const blob = doc.output("blob") as Blob;
  saveBlob(blob, filename);
  return { filename, bytes: blob.size, widthPx: canvas.width, heightPx: canvas.height, dpi };
}
