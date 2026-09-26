import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import "./certificate-fonts.css";
import {
  drawCertificate,
  ensureCertificateFonts,
  pxPerMmForDpi,
  PAGE_MM,
  PREVIEW_DPI,
  PRINT_DPI,
  type CertificateArtData,
  type DrawReport,
  type QrArt,
} from "./artwork";

/**
 * The branded certificate: A4 landscape, drawn from the brand system.
 *
 * HOW THE PREVIEW AND THE EXPORT STAY IDENTICAL
 * ---------------------------------------------
 * This component owns one visible canvas, drawn by `drawCertificate` at 150 DPI
 * and displayed scaled to its container. `renderTo(dpi)` runs the SAME function
 * into an offscreen canvas at 300 DPI and hands it back for export. There is no
 * second implementation of the layout, so "what I approved" and "what got
 * printed" cannot differ.
 *
 * THE QR IS VECTOR, NOT A BITMAP
 * ------------------------------
 * `QRCodeSVG` is rendered hidden and its foreground path is read straight off the
 * DOM, then filled into the certificate canvas with `Path2D` scaled to the QR
 * box. Nothing is resampled, so the modules have hard edges at every DPI. The
 * alternative, drawing `QRCodeCanvas` at one size and `drawImage`-ing it to
 * another, resamples module edges, and a QR with soft edges is a QR that a
 * phone gives up on in bad light.
 *
 * `level="H"` is 30% error correction: the printed code still reads through a
 * crease, a staple hole or a coffee ring. `marginSize={4}` is the quiet zone the
 * QR specification requires; without it a scanner cannot find the code at all,
 * however large it is printed.
 */

export interface CertificateTemplateProps {
  data: CertificateArtData;
  /** Absolute URL to encode. Always the canonical public one, see src/lib/verify.ts. */
  verifyUrl: string;
  /** DPI of the on-screen canvas. The export always uses 300 regardless. */
  previewDpi?: number;
  className?: string;
  /** Fired after every successful draw, with the measured QR geometry. */
  onReport?: (report: DrawReport & { missingFonts: string[] }) => void;
}

export interface CertificateHandle {
  /** Draw at `dpi` into a fresh offscreen canvas and return it. Awaits fonts first. */
  renderTo: (dpi?: number) => Promise<HTMLCanvasElement>;
  /** The on-screen canvas, or null before first paint. */
  previewCanvas: () => HTMLCanvasElement | null;
}

export const CertificateTemplate = forwardRef<CertificateHandle, CertificateTemplateProps>(
  function CertificateTemplate({ data, verifyUrl, previewDpi = PREVIEW_DPI, className, onReport }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrHostRef = useRef<HTMLDivElement>(null);
    const [qr, setQr] = useState<QrArt | null>(null);
    const [fontsReady, setFontsReady] = useState(false);
    const [missingFonts, setMissingFonts] = useState<string[]>([]);

    /* Fonts first, always. Canvas has no swap: text drawn before Sora lands is
       Sora-less forever in the exported file. */
    useEffect(() => {
      let alive = true;
      ensureCertificateFonts().then((missing) => {
        if (!alive) return;
        setMissingFonts(missing);
        setFontsReady(true);
      });
      return () => {
        alive = false;
      };
    }, []);

    /* Read the QR back out of the hidden SVG as geometry. */
    useEffect(() => {
      const svg = qrHostRef.current?.querySelector("svg");
      if (!svg) return;
      const viewBox = svg.getAttribute("viewBox") || "";
      const numCells = Number(viewBox.split(/\s+/)[2]);
      // The first path is the background (`M0,0 h{n}v{n}H0z`); the second is the code.
      const paths = svg.querySelectorAll("path");
      const d = paths[1]?.getAttribute("d");
      if (!numCells || !d) return;
      setQr((prev) => (prev && prev.numCells === numCells && prev.path === d ? prev: { numCells, path: d, margin: 4 }));
    }, [verifyUrl]);

    const paint = useCallback(
      (canvas: HTMLCanvasElement, dpi: number): DrawReport | null => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        const s = pxPerMmForDpi(dpi);
        canvas.width = Math.round(PAGE_MM.w * s);
        canvas.height = Math.round(PAGE_MM.h * s);
        return drawCertificate(ctx, data, qr, s);
      },
      [data, qr]
);

    /* `onReport` lives in a ref, and the ref is updated during render rather than
       being a dependency of the paint effect.
     *
     * WHY, BECAUSE THIS WAS A REAL INFINITE LOOP
     * ------------------------------------------
     * The first version called `onReport` straight from the paint effect with a
     * freshly built object. The admin holds that object in state, so every report
     * re-rendered the parent; the parent rebuilt its `data` prop inline, which
     * gave `paint` a new identity, which re-ran the effect, which reported again.
     * React caught it as "Maximum update depth exceeded" and the admin drawer
     * spun until the tab was abandoned.
     *
     * Two things stop it. The parent now memoises the data it passes. And the
     * report is compared against the last one before being handed up, so a
     * repaint that produced identical geometry says nothing at all. */
    const onReportRef = useRef(onReport);
    onReportRef.current = onReport;
    const lastReport = useRef("");

    /* Paint the preview whenever anything it depends on changes. */
    useEffect(() => {
      if (!fontsReady || !canvasRef.current) return;
      const report = paint(canvasRef.current, previewDpi);
      if (!report) return;
      const next = {...report, missingFonts };
      const key = JSON.stringify(next);
      if (key === lastReport.current) return;
      lastReport.current = key;
      onReportRef.current?.(next);
    }, [fontsReady, paint, previewDpi, missingFonts]);

    useImperativeHandle(
      ref,
      () => ({
        previewCanvas: () => canvasRef.current,
        renderTo: async (dpi = PRINT_DPI) => {
          await ensureCertificateFonts();
          const canvas = document.createElement("canvas");
          paint(canvas, dpi);
          return canvas;
        },
      }),
      [paint]
);

    /* A text equivalent of the artwork. The canvas is a picture as far as a
       screen reader is concerned, so the same facts are available as text. */
    const alt = useMemo(
      () =>
        [
          `Ideovent LaunchPad certificate of completion`,
          data.internName && `awarded to ${data.internName}`,
          data.designation,
          data.duration,
          data.certificateId && `certificate ID ${data.certificateId}`,
          data.specimen && "SPECIMEN: not an issued certificate",
        ]
.filter(Boolean)
.join(". "),
      [data]
);

    return (
      <div className={className}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={alt}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            aspectRatio: `${PAGE_MM.w} / ${PAGE_MM.h}`,
            borderRadius: "0.5rem",
            background: "#FFFFFF",
            boxShadow: "0 10px 40px -18px rgba(8,23,56,0.55)",
          }}
        />
        {/* Hidden QR source. Rendered, not fetched: its path is read off the DOM. */}
        <div ref={qrHostRef} aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
          <QRCodeSVG value={verifyUrl} size={256} level="H" marginSize={4} bgColor="#FFFFFF" fgColor="#081738" />
        </div>
      </div>
);
  }
);

export default CertificateTemplate;
