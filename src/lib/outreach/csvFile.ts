/**
 * A CSV file's bytes as text, whatever wrote it (meta-leads-spec 7.1).
 *
 * The CRM's own sheets are UTF-8. Meta's lead downloads (Ads Manager, Business
 * Suite, Leads Center) are often UTF-16 with tabs between the columns, and a
 * sheet saved by an older Excel is windows-1252. File.text() reads everything
 * as UTF-8, which turns a UTF-16 file into one column of noise, so the import
 * reads the bytes and decides here:
 *
 *   PK 03 04 (xlsx) or D0 CF 11 E0 (xls)    { excel: true }: not a CSV at all
 *   BOM FF FE / FE FF / EF BB BF            UTF-16LE / UTF-16BE / UTF-8
 *   no BOM, zero bytes in at least 30% of the odd (even) positions of the
 *   first 512 bytes                         UTF-16LE (UTF-16BE)
 *   otherwise                               UTF-8 when it is valid UTF-8, else windows-1252
 *
 * Pure: no DOM but TextDecoder (browsers and Node have it). The text comes
 * back without its byte-order mark. The delimiter is parseCsv's business.
 */

export type CsvEncoding = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252";

export type DecodedCsv = { excel?: false; text: string; encoding: CsvEncoding } | { excel: true };

/** The first bytes of an .xlsx (a zip) and of an old .xls (an OLE compound file). */
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0];

function startsWith(b: Uint8Array, sig: number[]): boolean {
  return b.length >= sig.length && sig.every((x, i) => b[i] === x);
}

function decode(b: Uint8Array, encoding: CsvEncoding, fatal = false): string {
  return new TextDecoder(encoding, { fatal }).decode(b);
}

/** Share of zero bytes at the odd (parity 1) or even (parity 0) positions of the first 512 bytes. */
function zeroShare(b: Uint8Array, parity: 0 | 1): number {
  const end = Math.min(b.length, 512);
  let seen = 0;
  let zeros = 0;
  for (let i = parity; i < end; i += 2) {
    seen++;
    if (b[i] === 0) zeros++;
  }
  return seen ? zeros / seen : 0;
}

export function decodeCsvBytes(input: ArrayBuffer | Uint8Array): DecodedCsv {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (startsWith(b, ZIP) || startsWith(b, OLE)) return { excel: true };
  if (startsWith(b, [0xff, 0xfe])) return { text: decode(b, "utf-16le"), encoding: "utf-16le" };
  if (startsWith(b, [0xfe, 0xff])) return { text: decode(b, "utf-16be"), encoding: "utf-16be" };
  if (startsWith(b, [0xef, 0xbb, 0xbf])) return { text: decode(b, "utf-8"), encoding: "utf-8" };
  if (b.length >= 4) {
    // ASCII in UTF-16LE is "a\0b\0": its zero bytes sit at the odd positions; UTF-16BE at the even ones.
    if (zeroShare(b, 1) >= 0.3 && zeroShare(b, 0) < 0.3) return { text: decode(b, "utf-16le"), encoding: "utf-16le" };
    if (zeroShare(b, 0) >= 0.3 && zeroShare(b, 1) < 0.3) return { text: decode(b, "utf-16be"), encoding: "utf-16be" };
  }
  try {
    return { text: decode(b, "utf-8", true), encoding: "utf-8" };
  } catch {
    /* not valid UTF-8: an older Excel's "CSV (Comma delimited)" is windows-1252 */
  }
  try {
    return { text: decode(b, "windows-1252"), encoding: "windows-1252" };
  } catch {
    /* a runtime without windows-1252 (very old): UTF-8 with replacement characters */
    return { text: decode(b, "utf-8"), encoding: "utf-8" };
  }
}
