import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import type { PreviewPage } from "@/lib/outreach/preview";
import { btnSecondary } from "./ui";
import { cn } from "@/lib/utils";

/**
 * THE PICTURE UNDER A FIRST WHATSAPP (1 Oct 2026, src/lib/outreach/preview.ts).
 *
 * Mehdi wants his picture (the clinic, school or institute today next to a
 * professional website, "We built a sample website for your clinic. Want to
 * see it?") to reach the chat with the first message. A wa.me link carries
 * text only. The message's picture link already makes WhatsApp draw it as a
 * card; this card hands over the picture itself, three ways:
 *   Copy image  a PNG on the clipboard (the clipboard takes PNG, not JPEG): in
 *               WhatsApp Web, Ctrl+V in the chat attaches it;
 *   Share       the phone's share sheet with the picture and the message text,
 *               so WhatsApp gets both in one go. It sends the message, so it is
 *               off while the send is blocked, and it records the send unless
 *               Open in WhatsApp already did;
 *   Download    the JPEG, to attach with the paperclip.
 * The picture is fetched once when the card shows, so Share runs straight
 * from the tap: a phone opens the share sheet only right after a tap.
 */
export interface CreativeCardProps {
  page: PreviewPage;
  /** The message on screen, sent with the picture by Share. */
  text: string;
  /** True while the send is blocked: Share sends the message, so it waits too. */
  shareBlocked: boolean;
  /** Called after a share went through. */
  onShared?: () => void;
}

type Note = "" | "copied" | "copy-failed" | "shared" | "share-failed";

const NOTES: Record<Exclude<Note, "">, string> = {
  copied: "Picture copied. Click in the WhatsApp Web chat and press Ctrl+V to attach it.",
  "copy-failed": "This browser would not copy the picture. Use Download, then attach it in WhatsApp.",
  shared: "Shared.",
  "share-failed": "Sharing did not work in this browser. Use Copy image or Download.",
};

export function CreativeCard({ page, text, shareBlocked, onShared }: CreativeCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState<Note>("");

  useEffect(() => {
    let alive = true;
    setFile(null);
    fetch(page.image)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((blob) => {
        if (alive) setFile(new File([blob], page.fileName, { type: "image/jpeg" }));
      })
      .catch(() => {
        /* Share stays off; Copy image fetches the picture again on the tap. */
      });
    return () => {
      alive = false;
    };
  }, [page.image, page.fileName]);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(""), 6000);
    return () => window.clearTimeout(t);
  }, [note]);

  const canShare = Boolean(file && typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));

  const copy = async () => {
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("no image clipboard");
      // Made inside the tap as a promise, which Safari needs; older Chrome takes only a finished Blob.
      const png = pngOf(file ?? page.image);
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      } catch {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": await png })]);
      }
      setNote("copied");
    } catch {
      setNote("copy-failed");
    }
  };

  const share = async () => {
    if (!file || shareBlocked) return;
    try {
      await navigator.share({ files: [file], text });
      setNote("shared");
      onShared?.();
    } catch (e) {
      if ((e as { name?: string } | null)?.name !== "AbortError") setNote("share-failed");
    }
  };

  const hint = "mt-1 text-xs text-muted-foreground";
  return (
    <section aria-labelledby="creative-h" className="rounded-xl border border-border/70 bg-muted/30 p-3" data-testid="creative" data-kind={page.kind}>
      <h4 id="creative-h" className="text-sm font-medium">The picture for this message</h4>
      <p className={hint} data-testid="creative-intro">
        The link in the message makes WhatsApp show this picture as a card: wait for the card to appear above the text before you press Send. To send the picture itself as well, copy, share or download it.
      </p>
      <a href={page.image} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-sm overflow-hidden rounded-lg border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img src={page.image} width={page.width} height={page.height} alt={page.alt} className="block h-auto w-full" data-testid="creative-image" />
      </a>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        <li>
          <button type="button" onClick={() => void copy()} className={cn(btnSecondary, "w-full")} data-testid="creative-copy">
            {note === "copied" ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {note === "copied" ? "Copied" : "Copy image"}
          </button>
          <p className={hint} data-testid="creative-copy-hint">Then press Ctrl+V in the WhatsApp Web chat to attach it.</p>
        </li>
        <li>
          <button type="button" onClick={() => void share()} disabled={!canShare || shareBlocked} className={cn(btnSecondary, "w-full")} data-testid="creative-share">
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share
          </button>
          <p className={hint} data-testid="creative-share-hint">
            {canShare || !file
              ? "On a phone: the picture with this message, to their WhatsApp chat."
              : "On a phone it sends the picture with this message; this browser cannot share a picture."}
          </p>
        </li>
        <li>
          <a href={page.image} download={page.fileName} className={cn(btnSecondary, "w-full")} data-testid="creative-download">
            <Download className="h-4 w-4" aria-hidden="true" /> Download
          </a>
          <p className={hint} data-testid="creative-download-hint">Saves it, to attach with the paperclip in WhatsApp.</p>
        </li>
      </ul>
      <p role="status" className={cn(hint, "mt-2", note === "copy-failed" || note === "share-failed" ? "text-destructive" : "")} data-testid="creative-status">
        {note ? NOTES[note] : ""}
      </p>
    </section>
  );
}

/** The picture as a PNG, the one image type the clipboard takes. */
async function pngOf(source: Blob | string): Promise<Blob> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no PNG"))), "image/png"));
}
