/**
 * THE GALLERY LIGHTBOX. Imported only by the Gallery page.
 *
 * Opens from the tapped thumbnail: the photo zooms from the thumbnail's box to
 * its own over 320ms (FLIP), the backdrop fades. Arrow keys and a horizontal
 * swipe step through; the swipe snaps over 240ms. Esc, the close button or a
 * tap on the backdrop closes it, and focus returns to the thumbnail. Focus is
 * trapped inside while it is open. With motion other than "full", every step
 * is instant. No autoplay, no loop.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMotion } from "@/pages/site/kit/motion";

export interface LightboxItem {
  src: string;
  alt: string;
  caption?: string;
  lang?: string;
}

const EASE = "cubic-bezier(0.22,1,0.36,1)";

export function Lightbox({ items, index, origin, onIndex, onClose, labels }: {
  items: LightboxItem[];
  index: number;
  /** The thumbnail it opened from, for the zoom and for returning focus. */
  origin: HTMLElement | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  labels: { close: string; prev: string; next: string; of: string; dialog: string };
}) {
  const motion = useMotion();
  const box = useRef<HTMLDivElement | null>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);
  const opened = useRef(false);
  const [dx, setDx] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const item = items[index];
  const go = useCallback((d: number) => onIndex((index + d + items.length) % items.length), [index, items.length, onIndex]);

  /* The zoom from the thumbnail, once, when the image has a box. */
  useLayoutEffect(() => {
    if (opened.current) return;
    opened.current = true;
    closeBtn.current?.focus();
    if (motion !== "full" || !img.current || !origin) return;
    const from = origin.getBoundingClientRect();
    const to = img.current.getBoundingClientRect();
    if (!to.width || !to.height) return;
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    const tx = from.left + from.width / 2 - (to.left + to.width / 2);
    const ty = from.top + from.height / 2 - (to.top + to.height / 2);
    img.current.animate([{ transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})` }, { transform: "none" }], { duration: 320, easing: EASE });
    box.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE });
  }, [motion, origin]);

  /* Keys: Esc, arrows, and Tab kept inside the dialog. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab" && box.current) {
        const f = Array.from(box.current.querySelectorAll<HTMLElement>("button"));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      origin?.focus();
    };
  }, [go, onClose, origin]);

  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const mx = e.touches[0].clientX - touch.current.x;
    if (Math.abs(mx) > Math.abs(e.touches[0].clientY - touch.current.y)) setDx(mx);
  };
  const onTouchEnd = () => {
    const d = dx;
    touch.current = null;
    setDx(0);
    if (Math.abs(d) > 60 && items.length > 1) go(d < 0 ? 1 : -1);
  };

  if (!item) return null;
  const btn = "inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--ds-surface)/0.12)] text-[hsl(var(--ds-surface))] hover:bg-[hsl(var(--ds-surface)/0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--ds-surface))]";
  return createPortal(
    <div ref={box} role="dialog" aria-modal="true" aria-label={labels.dialog}
      className="fixed inset-0 z-[100] flex flex-col bg-[hsl(var(--ds-ink)/0.97)] text-[hsl(var(--ds-surface))]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex items-center justify-between gap-4 p-3 sm:p-4">
        <p className="ds-num px-2 text-sm text-[hsl(var(--ds-surface)/0.8)]">{index + 1} {labels.of} {items.length}</p>
        <button ref={closeBtn} type="button" className={btn} onClick={onClose} aria-label={labels.close}><X className="h-6 w-6" aria-hidden="true" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <img ref={img} key={item.src} src={item.src} alt={item.alt} decoding="async"
          className="max-h-full max-w-full select-none object-contain"
          style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx || motion !== "full" ? "none" : `transform 240ms ${EASE}` }} />
        {items.length > 1 && (
          <>
            <button type="button" className={`${btn} absolute left-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex`} onClick={() => go(-1)} aria-label={labels.prev}><ChevronLeft className="h-6 w-6" aria-hidden="true" /></button>
            <button type="button" className={`${btn} absolute right-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex`} onClick={() => go(1)} aria-label={labels.next}><ChevronRight className="h-6 w-6" aria-hidden="true" /></button>
          </>
        )}
      </div>
      <div className="min-h-[72px] p-4 text-center">
        {item.caption && <p className="mx-auto max-w-2xl text-base text-[hsl(var(--ds-surface)/0.92)]" lang={item.lang}>{item.caption}</p>}
        {items.length > 1 && (
          <div className="mt-3 flex justify-center gap-3 sm:hidden">
            <button type="button" className={btn} onClick={() => go(-1)} aria-label={labels.prev}><ChevronLeft className="h-6 w-6" aria-hidden="true" /></button>
            <button type="button" className={btn} onClick={() => go(1)} aria-label={labels.next}><ChevronRight className="h-6 w-6" aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </div>,
    /* Inside the site root, so the theme variables still apply. */
    document.querySelector(".ds-site") || document.body,
  );
}
