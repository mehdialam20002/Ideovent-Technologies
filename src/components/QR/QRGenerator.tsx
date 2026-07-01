import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, ExternalLink } from "lucide-react";
import { verifyUrl } from "@/lib/verify";

interface QRGeneratorProps {
  id: string;
  label?: string;
  size?: number;
  showUrl?: boolean;
}

/** Renders a QR code that points at the environment-correct /verify/:id URL, with PNG download. */
export default function QRGenerator({ id, label, size = 148, showUrl = true }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = verifyUrl(id);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${id}_qr.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="rounded-xl bg-white p-2.5">
        <QRCodeCanvas value={url} size={size} ref={canvasRef} marginSize={2} level="M" />
      </div>
      {showUrl && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ExternalLink className="h-3 w-3" /> {id}
        </a>
      )}
      <button onClick={handleDownload} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
        <Download className="h-3.5 w-3.5" /> Download QR
      </button>
    </div>
  );
}
