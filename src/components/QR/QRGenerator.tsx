import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, ExternalLink } from "lucide-react";
import { canonicalVerifyLabel, canonicalVerifyUrl, verifyUrl } from "@/lib/verify";

interface QRGeneratorProps {
  id: string;
  label?: string;
  /** On-screen size in CSS px. The downloaded PNG is always rendered at `exportPx`. */
  size?: number;
  /** Pixel side of the downloaded PNG. 1024 at 25 mm print width is over 1000 DPI. */
  exportPx?: number;
  showUrl?: boolean;
}

/**
 * A standalone QR for a certificate ID.
 *
 * Two things here are deliberate and were not before.
 *
 * 1. It encodes `canonicalVerifyUrl`, not the running origin. A QR generated from
 *    a localhost admin session used to encode `http://localhost:5180/verify/<id>`
 *    and go to the printer that way: a dead link on a piece of paper that cannot
 *    be recalled. See src/lib/verify.ts.
 *
 * 2. Error correction is level H (30%), not M (15%). This code is printed, folded,
 *    stapled and photographed in bad light. H costs a slightly denser grid and
 *    buys back a code that still reads through a crease.
 *
 * The human-readable ID sits under the code for the case the camera never works
 * at all, which is the whole reason the ID alphabet excludes I, O, 0 and 1.
 */
export default function QRGenerator({ id, label, size = 168, exportPx = 1024, showUrl = true }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportRef = useRef<HTMLCanvasElement>(null);
  const printed = canonicalVerifyUrl(id);

  const handleDownload = () => {
    // Download the hidden high-resolution canvas, not the small visible one.
    const canvas = exportRef.current ?? canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${id}_qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="rounded-xl bg-white p-3">
        <QRCodeCanvas value={printed} size={size} ref={canvasRef} marginSize={4} level="H" fgColor="#081738" bgColor="#FFFFFF" />
      </div>
      <p className="font-mono text-sm font-semibold tracking-wide text-foreground">{id}</p>
      {showUrl && (
        <a
          href={verifyUrl(id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 break-all text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" /> {canonicalVerifyLabel(id)}
        </a>
)}
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download QR
      </button>
      {/* Off-screen, print-resolution copy. Rendering the visible one at 1024px and
          scaling it down with CSS would blur the modules on screen; scaling a 168px
          canvas UP for the download would blur them on paper. Two canvases, each at
          its own native size, blurs neither. */}
      <div aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <QRCodeCanvas value={printed} size={exportPx} ref={exportRef} marginSize={4} level="H" fgColor="#081738" bgColor="#FFFFFF" />
      </div>
    </div>
);
}
