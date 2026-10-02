/**
 * The Ideovent LaunchPad certificate: the artwork itself.
 *
 * ONE DRAWING ROUTINE, TWO OUTPUTS
 * --------------------------------
 * `drawCertificate` is the only description of what a certificate looks like.
 * The on-screen preview calls it at ~150 DPI and the PNG and PDF exports call it
 * at 300 DPI, so what an admin approves on screen is the same geometry that goes
 * to the printer: not a second implementation that can drift, and emphatically
 * not a screenshot of a div scaled up until it is soft.
 *
 * Every coordinate below is in MILLIMETRES on an A4 landscape page (297 × 210).
 * `pxPerMm` is the only thing that changes between outputs:
 *
 *      96 DPI  →  3.7795 px/mm   (1123 × 794, screen reference)
 *     150 DPI  →  5.9055 px/mm   (1754 × 1240: the preview)
 *     300 DPI  →  11.811 px/mm   (3508 × 2480, print, and what exports)
 *
 * WHY CANVAS AND NOT HTML
 * -----------------------
 * The certificate has to leave the browser as a file. Rasterising a DOM subtree
 * means html2canvas re-implementing CSS and getting it approximately right, and
 * `window.print()` means the operating system's print dialogue and the user's
 * margins. Canvas draws exactly what is asked at exactly the resolution asked
 * for, the QR is drawn from its own vector path rather than resampled from a
 * bitmap, and the same call produces the PDF.
 *
 * COLOUR
 * ------
 * Values are the literal brand hexes from `_assets/brand.css`, not the site's CSS
 * theme tokens. A certificate is a print artefact: it must not change because a
 * visitor has dark mode on, and it must match the 697 documents in the document
 * set that are already navy and gold.
 *
 * Gold is used for RULES AND FILLS, never for text on white, #C8A951 on white is
 * about 2.1:1 and fails WCAG AA comprehensively (PHASE5-SPEC §A). Where gold text
 * is wanted, `GOLD_TEXT` (#8C6F22, ~4.9:1 on white) is used instead.
 */

/* ───────────────────────── Page ───────────────────────── */

export const PAGE_MM = { w: 297, h: 210 } as const; // A4 landscape
export const MM_PER_INCH = 25.4;
export const pxPerMmForDpi = (dpi: number) => dpi / MM_PER_INCH;

export const PREVIEW_DPI = 150;
export const PRINT_DPI = 300;

/* ───────────────────────── Brand ───────────────────────── */

export const BRAND = {
  ink: "#040A18",
  navy900: "#081738", // the exact logo navy
  navy800: "#0D2050",
  navy700: "#123068", // primary
  navy600: "#1E4091",
  navy200: "#C3D2F2",
  navy100: "#E8EEFB",
  navy50: "#F4F7FD",
  gold500: "#C8A951", // ACCENT, rules and fills only
  gold600: "#A8862F",
  goldText: "#8C6F22", // the only gold that may carry text on white
  gold100: "#F5EBCE",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748B",
  slate300: "#CBD5E1",
  slate200: "#E2E8F0",
  white: "#FFFFFF",
} as const;

const DISPLAY = `"Sora", "Segoe UI", system-ui, -apple-system, sans-serif`;
const BODY = `"Inter", "Segoe UI", system-ui, -apple-system, sans-serif`;

/** The weights and families the artwork needs before it is drawn. */
const REQUIRED_FACES: { weight: number; family: string }[] = [
  { weight: 400, family: '"Inter"' },
  { weight: 500, family: '"Inter"' },
  { weight: 600, family: '"Inter"' },
  { weight: 400, family: '"Sora"' },
  { weight: 600, family: '"Sora"' },
  { weight: 700, family: '"Sora"' },
  { weight: 800, family: '"Sora"' },
];

/**
 * Make sure Sora and Inter are actually loaded before anything is drawn.
 *
 * Canvas text uses whatever the document has loaded AT THE MOMENT fillText runs.
 * There is no reflow and no swap: draw a millisecond early and the certificate is
 * rendered in the fallback stack and exported that way, permanently, with no
 * visible error. So the draw waits.
 *
 * Returns the faces that did NOT load, so the admin can say so rather than
 * shipping a certificate in Segoe UI.
 */
export async function ensureCertificateFonts(): Promise<string[]> {
  if (typeof document === "undefined" || !("fonts" in document)) return [];
  const missing: string[] = [];
  await Promise.all(
    REQUIRED_FACES.map(async ({ weight, family }) => {
      const spec = `${weight} 32px ${family}`;
      try {
        const faces = await document.fonts.load(spec, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789·, ");
        if (!faces.length) missing.push(`${family.replace(/"/g, "")} ${weight}`);
      } catch {
        missing.push(`${family.replace(/"/g, "")} ${weight}`);
      }
    })
);
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
  return missing;
}

/* ───────────────────────── Data ───────────────────────── */

export interface CertificateArtData {
  certificateId: string;
  internName: string;
  designation: string;
  programme: string;
  duration: string;
  projectWork: string;
  issuedAt: string; // YYYY-MM-DD
  issuedBy: string;
  completion: "completed" | "completed-with-distinction";
  /** The absolute URL printed under the QR, e.g. www.ideovent.in/verify/INT2025A75 */
  verifyLabel: string;
  /**
   * The partner who signs, printed under the rule and above "Authorised Partner".
   * Optional: leave it empty and the block names only the role, which is the
   * correct form until the deed records who the authorised signatory is.
   *
   * This is a NAME, not a scanned signature. A scanned signature embedded in a
   * downloadable PDF can be lifted out of the file and pasted onto anything, so
   * the printed copy is still signed by hand over the rule.
   */
  signatoryName?: string;
  /**
   * The signatory's job title, printed on the role line before "Authorised
   * Partner". Empty on every certificate issued before 28 Sep 2026, because
   * none of those printed one. Set it through signatoryTitleFor(issuedAt),
   * never by hand, so an issued certificate always redraws as it was printed.
   */
  signatoryTitle?: string;
  /**
   * Draws the SPECIMEN overprint. Required for every certificate shown as an
   * example anywhere, and it is drawn ON TOP of the artwork rather than behind
   * it, so it cannot be cropped or covered. Only two real certificates exist.
   */
  specimen?: boolean;
}

/** The QR, taken as vector geometry rather than as a bitmap, see `CertificateTemplate`. */
export interface QrArt {
  /** Modules across, INCLUDING the quiet-zone margin. */
  numCells: number;
  /** The `d` of the foreground path, in a 0.numCells coordinate space. */
  path: string;
  /** Modules of quiet zone on each side. */
  margin: number;
}

export interface DrawReport {
  /** Side of the whole QR box in mm, quiet zone included. */
  qrBoxMm: number;
  /** Side of the black code area in mm, quiet zone excluded. This is the number that must clear 25mm. */
  qrCodeMm: number;
  /** One module in mm. Print practice wants this comfortably above 0.4mm. */
  qrModuleMm: number;
  /** Point size the recipient's name ended up at, after auto-fitting. */
  namePt: number;
}

/* ───────────────────────── Small helpers ───────────────────────── */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2025-04-30" → "30 April 2025". Locale-independent on purpose: a printed date must not move. */
export function formatIssueDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || "").trim());
  if (!m) return iso || "";
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return iso;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

interface TextOpts {
  x: number;
  y: number; // baseline, in mm
  /** em size in mm. 1mm ≈ 2.835pt. */
  size: number;
  weight?: number;
  family?: string;
  color?: string;
  align?: CanvasTextAlign;
  /** Extra space between characters, as a fraction of the em. */
  tracking?: number;
  maxWidth?: number;
  uppercase?: boolean;
}

export function mmToPt(mm: number): number {
  return (mm / MM_PER_INCH) * 72;
}

/**
 * Draw a line of text.
 *
 * Tracking is applied character by character rather than through
 * `ctx.letterSpacing`, which Chrome supports and Safari does not. A certificate
 * whose small caps are tracked on one machine and not on another is not a
 * template, so the spacing is computed here and is the same everywhere.
 */
function drawText(ctx: CanvasRenderingContext2D, raw: string, o: TextOpts, s: number): number {
  const str = o.uppercase ? raw.toUpperCase(): raw;
  if (!str) return 0;
  ctx.save();
  ctx.fillStyle = o.color ?? BRAND.navy900;
  ctx.font = `${o.weight ?? 400} ${o.size * s}px ${o.family ?? BODY}`;
  ctx.textBaseline = "alphabetic";

  const tracking = (o.tracking ?? 0) * o.size * s;
  if (!tracking) {
    ctx.textAlign = o.align ?? "left";
    ctx.fillText(str, o.x * s, o.y * s, o.maxWidth ? o.maxWidth * s: undefined);
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w / s;
  }

  const chars = [...str];
  const width = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width + tracking, 0) - tracking;
  let cursor = o.x * s;
  if (o.align === "center") cursor -= width / 2;
  else if (o.align === "right") cursor -= width;
  ctx.textAlign = "left";
  for (const ch of chars) {
    ctx.fillText(ch, cursor, o.y * s);
    cursor += ctx.measureText(ch).width + tracking;
  }
  ctx.restore();
  return width / s;
}

/** Measure a string in mm at a given em size, without drawing it. */
function measureMm(ctx: CanvasRenderingContext2D, str: string, size: number, weight: number, family: string, s: number): number {
  ctx.save();
  ctx.font = `${weight} ${size * s}px ${family}`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w / s;
}

/** Greedy word wrap, in mm. */
function wrap(
  ctx: CanvasRenderingContext2D,
  str: string,
  maxMm: number,
  size: number,
  weight: number,
  family: string,
  s: number
): string[] {
  const words = (str || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${line} ${words[i]}`;
    if (measureMm(ctx, candidate, size, weight, family, s) <= maxMm) line = candidate;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, s: number) {
  ctx.fillStyle = fill;
  ctx.fillRect(x * s, y * s, w * s, h * s);
}

function strokeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colour: string,
  lineMm: number,
  s: number
) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineMm * s;
  ctx.strokeRect(x * s, y * s, w * s, h * s);
}

/* ───────────────────────── The iV mark ───────────────────────── */

/**
 * The real mark, as vector paths lifted verbatim from
 * `01-brand/logo/ideovent-mark.svg`. Which LOGO-USAGE.md records was redrawn
 * from `01-brand/logo/source/ideovent-official.png`.
 *
 * Source viewBox is 0 0 200 200 with the artwork translated by (0.5, 25.285),
 * so the drawn artwork occupies 199 × 149.43 inside it. Reproduced here rather
 * than fetched, because a certificate that is being exported must not depend on
 * a network request completing.
 */
const MARK_PATHS: { d: string; fill: keyof typeof BRAND }[] = [
  { d: "M0 0 46 19.8 76.35 95.4 57.05 143.8Z M199 0 153 19.8 122.65 95.4 141.95 143.8Z", fill: "navy900" },
  { d: "M79.4 34.8 99.5 42.9 119.6 34.8 99.5 85.7Z", fill: "navy900" },
  {
    d: "M96.04 102.5H102.96Q103.96 102.5 103.96 103.5V148.43Q103.96 149.43 102.96 149.43H96.04Q95.04 149.43 95.04 148.43V103.5Q95.04 102.5 96.04 102.5Z",
    fill: "navy700",
  },
];
const MARK_W = 199;
const MARK_H = 149.43;

/** Draw the iV mark with its top-left at (x, y) and the given height in mm. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, heightMm: number, s: number) {
  const scale = (heightMm * s) / MARK_H;
  ctx.save();
  ctx.translate(x * s, y * s);
  ctx.scale(scale, scale);
  for (const p of MARK_PATHS) {
    ctx.fillStyle = BRAND[p.fill];
    ctx.fill(new Path2D(p.d), "nonzero");
  }
  ctx.restore();
}

/** Width in mm of the mark at a given height. */
export const markWidthFor = (heightMm: number) => (heightMm * MARK_W) / MARK_H;

/* ───────────────────────── The certificate ───────────────────────── */

export function drawCertificate(
  ctx: CanvasRenderingContext2D,
  data: CertificateArtData,
  qr: QrArt | null,
  pxPerMm: number
): DrawReport {
  const s = pxPerMm;
  const { w: W, h: H } = PAGE_MM;

  ctx.save();
  ctx.clearRect(0, 0, W * s, H * s);

  /* ── Paper ───────────────────────────────────────────── */
  rect(ctx, 0, 0, W, H, BRAND.white, s);

  /* A very pale navy wash at the top so the page is not flat white. Kept under
     4% so it survives a cheap inkjet without banding, and so the certificate
     still reads correctly if a printer drops it entirely. */
  const wash = ctx.createLinearGradient(0, 0, 0, 90 * s);
  wash.addColorStop(0, "rgba(18,48,104,0.045)");
  wash.addColorStop(1, "rgba(18,48,104,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W * s, 90 * s);

  /* ── Frame ───────────────────────────────────────────── */
  const OUT = 9; // outer navy band inset
  const IN = 13; // inner gold hairline inset
  strokeRect(ctx, OUT, OUT, W - OUT * 2, H - OUT * 2, BRAND.navy700, 1.1, s);
  strokeRect(ctx, IN, IN, W - IN * 2, H - IN * 2, BRAND.gold500, 0.35, s);

  /* Gold corner brackets on the inner frame. Short, so they read as a detail
     rather than a second border. */
  const brk = 11;
  ctx.strokeStyle = BRAND.gold500;
  ctx.lineWidth = 0.9 * s;
  ctx.lineCap = "butt";
  const corners: [number, number, number, number][] = [
    [IN, IN, 1, 1],
    [W - IN, IN, -1, 1],
    [IN, H - IN, 1, -1],
    [W - IN, H - IN, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo((cx + dx * brk) * s, cy * s);
    ctx.lineTo(cx * s, cy * s);
    ctx.lineTo(cx * s, (cy + dy * brk) * s);
    ctx.stroke();
  }

  const MID = W / 2;

  /* ── Lockup ──────────────────────────────────────────── */
  const markH = 15;
  drawMark(ctx, MID - markWidthFor(markH) / 2, 20, markH, s);

  drawText(ctx, "Ideovent Technologies", {
    x: MID, y: 42.5, size: 4.6, weight: 700, family: DISPLAY,
    color: BRAND.navy900, align: "center", tracking: 0.04,
  }, s);

  drawText(ctx, "Partnership firm · Saket, New Delhi, India", {
    x: MID, y: 47.6, size: 2.5, weight: 500, family: BODY,
    color: BRAND.slate500, align: "center", tracking: 0.12,
  }, s);

  /* Gold rule */
  rect(ctx, MID - 11, 52, 22, 0.8, BRAND.gold500, s);

  /* ── Title ───────────────────────────────────────────── */
  drawText(ctx, "Certificate of Completion", {
    x: MID, y: 62.5, size: 6.6, weight: 800, family: DISPLAY,
    color: BRAND.navy700, align: "center", tracking: 0.02,
  }, s);

  drawText(ctx, data.programme || "Ideovent LaunchPad", {
    x: MID, y: 68.8, size: 2.9, weight: 600, family: DISPLAY,
    color: BRAND.goldText, align: "center", tracking: 0.26, uppercase: true,
  }, s);

  /* ── Recipient ───────────────────────────────────────── */
  drawText(ctx, "This is to certify that", {
    x: MID, y: 82, size: 3.6, weight: 400, family: BODY,
    color: BRAND.slate600, align: "center",
  }, s);

  /* Auto-fit: a long name shrinks rather than running into the frame. */
  const nameMax = W - 2 * 32;
  let nameSize = 13;
  const name = data.internName || ", ";
  while (nameSize > 5 && measureMm(ctx, name, nameSize, 700, DISPLAY, s) > nameMax) nameSize -= 0.25;
  drawText(ctx, name, {
    x: MID, y: 96.5, size: nameSize, weight: 700, family: DISPLAY,
    color: BRAND.navy900, align: "center",
  }, s);

  /* Gold underline, sized to the name but never wider than the text block. */
  const nameW = Math.min(measureMm(ctx, name, nameSize, 700, DISPLAY, s) + 14, nameMax);
  rect(ctx, MID - nameW / 2, 100.5, nameW, 0.5, BRAND.gold500, s);

  drawText(ctx, data.designation || "", {
    x: MID, y: 107.5, size: 3.5, weight: 600, family: DISPLAY,
    color: BRAND.navy600, align: "center", tracking: 0.05,
  }, s);

  /* ── Body ────────────────────────────────────────────── */
  const completedPhrase =
    data.completion === "completed-with-distinction"
      ? "has completed, with distinction,"
: "has successfully completed";
  const body =
    `${completedPhrase} the ${data.programme || "Ideovent LaunchPad"} internship programme ` +
    `at ${data.issuedBy || "Ideovent Technologies"}${data.duration ? `, ${data.duration}`: ""}.`;

  const bodyLines = wrap(ctx, body, W - 2 * 40, 3.5, 400, BODY, s);
  bodyLines.slice(0, 3).forEach((line, i) => {
    drawText(ctx, line, {
      x: MID, y: 118 + i * 5.4, size: 3.5, weight: 400, family: BODY,
      color: BRAND.slate700, align: "center",
    }, s);
  });

  /* Project summary. Two lines maximum: a certificate is not a CV, and an
     overlong summary would collide with the signature block below it. */
  if (data.projectWork) {
    const projLines = wrap(ctx, data.projectWork, W - 2 * 52, 2.95, 400, BODY, s);
    const shown = projLines.slice(0, 2);
    if (projLines.length > 2) shown[1] = `${shown[1].replace(/[.,;]$/, "")}…`;
    drawText(ctx, "Project work", {
      x: MID, y: 134.5, size: 2.35, weight: 600, family: DISPLAY,
      color: BRAND.goldText, align: "center", tracking: 0.24, uppercase: true,
    }, s);
    shown.forEach((line, i) => {
      drawText(ctx, line, {
        x: MID, y: 140.2 + i * 4.4, size: 2.95, weight: 400, family: BODY,
        color: BRAND.slate600, align: "center",
      }, s);
    });
  }

  /* ── Footer band ─────────────────────────────────────── */
  const report: DrawReport = { qrBoxMm: 0, qrCodeMm: 0, qrModuleMm: 0, namePt: mmToPt(nameSize) };

  const BASE = 155; // top of the bottom block

  /* Hairline separating the statement from the verification block. */
  rect(ctx, 46, BASE - 3, W - 92, 0.2, BRAND.slate200, s);

  /* QR block, left ------------------------------------------------ */
  const QR_BOX = 32; // mm, quiet zone included
  const qrX = 24;
  const qrY = BASE + 1;
  if (qr) {
    const cell = QR_BOX / qr.numCells;
    report.qrBoxMm = QR_BOX;
    report.qrModuleMm = cell;
    report.qrCodeMm = (qr.numCells - qr.margin * 2) * cell;

    /* White ground under the code. The quiet zone is part of the QR spec, not
       decoration: a scanner needs it, and it is drawn explicitly so the page
       wash above can never creep underneath the modules. */
    rect(ctx, qrX, qrY, QR_BOX, QR_BOX, BRAND.white, s);
    ctx.save();
    ctx.translate(qrX * s, qrY * s);
    ctx.scale(cell * s, cell * s);
    ctx.fillStyle = BRAND.navy900;
    ctx.fill(new Path2D(qr.path), "nonzero");
    ctx.restore();
  } else {
    strokeRect(ctx, qrX, qrY, QR_BOX, QR_BOX, BRAND.slate300, 0.3, s);
  }

  const qrTextX = qrX + QR_BOX + 5;
  drawText(ctx, "Scan to verify", {
    x: qrTextX, y: qrY + 6.5, size: 2.4, weight: 600, family: DISPLAY,
    color: BRAND.goldText, tracking: 0.2, uppercase: true,
  }, s);
  drawText(ctx, data.certificateId || ", ", {
    x: qrTextX, y: qrY + 14, size: 5.2, weight: 700, family: DISPLAY,
    color: BRAND.navy900,
  }, s);
  drawText(ctx, data.verifyLabel, {
    x: qrTextX, y: qrY + 20, size: 2.7, weight: 500, family: BODY,
    color: BRAND.slate600,
  }, s);
  drawText(ctx, "Or type the ID above into the verification page.", {
    x: qrTextX, y: qrY + 25, size: 2.4, weight: 400, family: BODY,
    color: BRAND.slate500,
  }, s);

  /* Issue date, centre column -------------------------------------
     x=130, not 178. At 178 the "does not expire" line ran underneath the
     signature rule, which starts at 211: the two blocks were sharing the same
     28mm of paper and the rule crossed the text. */
  drawText(ctx, "Date of issue", {
    x: 130, y: BASE + 7.5, size: 2.35, weight: 600, family: DISPLAY,
    color: BRAND.goldText, tracking: 0.22, uppercase: true,
  }, s);
  drawText(ctx, formatIssueDate(data.issuedAt) || ", ", {
    x: 130, y: BASE + 14, size: 3.6, weight: 600, family: DISPLAY,
    color: BRAND.navy900,
  }, s);
  drawText(ctx, "This certificate does not expire.", {
    x: 130, y: BASE + 19.5, size: 2.4, weight: 400, family: BODY,
    color: BRAND.slate500,
  }, s);

  /* Signature, right ---------------------------------------------- */
  const sigRight = W - 24;
  const sigLeft = sigRight - 62;
  rect(ctx, sigLeft, BASE + 18, 62, 0.4, BRAND.navy700, s);
  /* FACTS.md, BUSINESS STRUCTURE: Ideovent Technologies is a PARTNERSHIP.
     A partnership's signature block reads "For <firm> / Authorised Partner", 
     never "Proprietor", and never an individual's name on its own. Who the
     authorised partner is comes from the partnership deed, which does not exist
     yet ([[PARTNERSHIP_DEED_DATE]], [[AUTHORISED_SIGNATORY]]), so the line names
     the role and the human signs above it by hand. */
  drawText(ctx, "For Ideovent Technologies", {
    x: sigRight, y: BASE + 23.5, size: 3.2, weight: 700, family: DISPLAY,
    color: BRAND.navy900, align: "right",
  }, s);
  /* The named signatory, when one is set. The role line moves down to make
     room, so a certificate with no name set looks exactly as it did before. */
  if (data.signatoryName) {
    drawText(ctx, data.signatoryName, {
      x: sigRight, y: BASE + 28, size: 2.8, weight: 600, family: BODY,
      color: BRAND.navy900, align: "right",
    }, s);
  }
  /* The title shares the role line rather than taking a line of its own: a
     fourth line under the rule reached down into the contact strip at 193.5mm.
     "Authorised Partner" stays on every certificate whatever the title, because
     that is the capacity the partner signs in (FACTS.md); the job title only
     says what he does at the firm. */
  drawText(ctx, data.signatoryName && data.signatoryTitle
    ? `${data.signatoryTitle} · Authorised Partner`
    : "Authorised Partner", {
    x: sigRight, y: BASE + (data.signatoryName ? 32.2 : 28.5), size: 2.5,
    weight: 500, family: BODY,
    color: BRAND.slate600, align: "right", tracking: 0.14, uppercase: true,
  }, s);

  /* Contact strip -------------------------------------------------- */
  /* www., not the apex. src/lib/verify.ts encodes the QR against
     https://www.ideovent.in because that is the host the site claims in every
     canonical tag, and FACTS.md lists the website as www.ideovent.in. Printing
     a different host beside the QR on the same sheet of paper is how a former
     intern ends up with two URLs and no way to tell which one works. */
  drawText(ctx, "contact@ideovent.in · +91 77619 21786 · www.ideovent.in · Saket, New Delhi, India", {
    x: MID, y: H - 16.5, size: 2.4, weight: 400, family: BODY,
    color: BRAND.slate500, align: "center", tracking: 0.04,
  }, s);

  /* ── SPECIMEN overprint ──────────────────────────────── */
  if (data.specimen) drawSpecimen(ctx, s);

  ctx.restore();
  return report;
}

/**
 * The SPECIMEN overprint.
 *
 * Drawn LAST, over everything, at a weight that cannot be mistaken for a
 * watermark someone forgot to remove. Exactly two real certificates exist
 * (Ankit Kumar INT2025A73 and Shreya INT2025A74); anything else displayed
 * anywhere (on /internship, in a deck, in this repo) carries this and a name
 * that is obviously fictional, so no one can ever count a sample as a third.
 */
function drawSpecimen(ctx: CanvasRenderingContext2D, s: number) {
  const { w: W, h: H } = PAGE_MM;
  ctx.save();

  /* Diagonal wordmark across the page. */
  ctx.translate((W / 2) * s, (H / 2) * s);
  ctx.rotate(-Math.atan2(H, W));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${36 * s}px ${DISPLAY}`;
  ctx.fillStyle = "rgba(18,48,104,0.13)";
  ctx.fillText("SPECIMEN", 0, 0);
  ctx.lineWidth = 0.7 * s;
  ctx.strokeStyle = "rgba(200,169,81,0.55)";
  ctx.strokeText("SPECIMEN", 0, 0);
  ctx.restore();

  /* And a banner in words, for anyone who reads the page rather than looking at
     it. It sits across the top inside the frame: the one band of empty paper on
     the certificate. So it hides nothing and cannot be cropped off without
     taking the border with it. */
  ctx.save();
  const IN = 13;
  const tagH = 6.2;
  ctx.fillStyle = BRAND.navy700;
  ctx.fillRect((IN + 0.2) * s, (IN + 0.2) * s, (W - 2 * IN - 0.4) * s, tagH * s);
  drawText(ctx, "Specimen · not an issued certificate", {
    x: W / 2, y: IN + 4.4, size: 2.6, weight: 600, family: DISPLAY,
    color: BRAND.white, align: "center", tracking: 0.12, uppercase: true,
  }, s);
  ctx.restore();
}

/**
 * Map a stored certificate record onto the shape the artwork draws.
 *
 * Lives here, not in the admin page, because BOTH surfaces need it: the admin
 * previews and exports from it, and the public verification page renders the
 * certificate from it whenever the record has no uploaded scan. Keeping one
 * mapper is the only way those two can never disagree about what a certificate
 * says.
 */
/**
 * The partner whose name is printed on certificates.
 * Confirmed by Mehdi, 25 Sep 2026: Abhishek Tiwari. His title was Co-Founder &
 * Product Manager, then Founder & Product Manager (27 Sep 2026), and from
 * 28 Sep 2026 it is Product Manager: Mehdi asked for every founder title to
 * come off the site. Certificates issued before 28 Sep 2026 printed his name
 * and "Authorised Partner" and no job title, and they keep exactly that. From
 * 28 Sep 2026 the role line reads "Product Manager · Authorised Partner". The
 * switch is keyed on issuedAt (SIGNATORY_TITLES below), so re-rendering an old
 * certificate on the verification page never changes what was printed on it.
 * When the partnership deed is signed, make sure [[AUTHORISED_SIGNATORY]] in it
 * names the same person: the deed and the certificate must not disagree.
 */
export const SIGNATORY_NAME = "Abhishek Tiwari";

/**
 * The signatory's job title by issue date, oldest first. A certificate takes
 * the last row whose `from` is on or before its issuedAt (YYYY-MM-DD, so a
 * string comparison is a date comparison). Before the first row: no title,
 * which is what every certificate issued before 28 Sep 2026 printed. To change
 * the title, ADD a row with the new date; editing a row rewrites certificates
 * that have already been issued.
 */
export const SIGNATORY_TITLES: { from: string; title: string }[] = [
  { from: "2026-09-28", title: "Product Manager" },
];

export function signatoryTitleFor(issuedAt: string): string {
  let title = "";
  for (const row of SIGNATORY_TITLES) if (issuedAt >= row.from) title = row.title;
  return title;
}

export function toArtData(
  c: {
    certificateId: string;
    internName: string;
    designation: string;
    programme?: string;
    duration: string;
    projectWork: string;
    issuedAt: string;
    issuedBy?: string;
    completion?: string;
  },
  specimen: boolean,
  verifyLabel: string,
): CertificateArtData {
  return {
    certificateId: c.certificateId,
    internName: c.internName,
    designation: c.designation,
    programme: c.programme || "Ideovent LaunchPad",
    duration: c.duration,
    projectWork: c.projectWork,
    issuedAt: c.issuedAt,
    issuedBy: c.issuedBy || "Ideovent Technologies",
    completion:
      c.completion === "completed-with-distinction" ? "completed-with-distinction" : "completed",
    verifyLabel,
    specimen,
    /* Who signs. A partnership deed would normally name this; until one exists
       Mehdi has set it directly. Change it in ONE place, here, and every
       certificate the admin previews, exports and publishes moves together. */
    signatoryName: SIGNATORY_NAME,
    signatoryTitle: signatoryTitleFor(c.issuedAt),
  };
}
