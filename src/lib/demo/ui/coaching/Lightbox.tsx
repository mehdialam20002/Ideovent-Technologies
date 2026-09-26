/**
 * PHOTO STRIP WITH LIGHTBOX, for the About centre strip and the Gallery page.
 * Only photos with a src are shown (stock ones with their srcset and the
 * manifest alt, through DemoPhoto); the caller renders the designed
 * no-photo state when there are none. The lightbox opens with a fade and a
 * 0.96 to 1 scale over 220ms (motion "full" only), has arrow keys, swipe,
 * Esc, and keeps focus inside while open.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DemoPhoto as DemoPhotoRecord } from "@/lib/cms/types";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { getStockPhoto, stockAlt } from "@/lib/demo/images";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { C_COPY } from "./copy";
import "./coaching.css";

export function PhotoGrid({ photos, cols = 3 }: { photos: DemoPhotoRecord[]; cols?: 2 | 3 | 4 }) {
  const { lang } = useSite();
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const grid = cols === 4 ? "lg:grid-cols-4" : cols === 2 ? "" : "lg:grid-cols-3";
  return (
    <>
      <ul className={`grid grid-cols-2 gap-3 sm:gap-4 ${grid}`}>
        {photos.map((p, i) => (
          <li key={i} data-f="">
            <button type="button" className="ds-card ds-card-img block w-full overflow-hidden" data-interactive=""
              onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }}>
              <DemoPhoto src={p.src} alt={bi(p, "alt", lang)} ratio="4 / 3"
                sizes={cols === 4 ? "(min-width: 1024px) 270px, 50vw" : cols === 2 ? "(min-width: 1152px) 560px, 50vw" : "(min-width: 1024px) 370px, 50vw"} />
            </button>
            {bi(p, "caption", lang) && <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(p, "caption", lang)}</p>}
          </li>
        ))}
      </ul>
      {open !== null && (
        <Lightbox photos={photos} index={open} onIndex={setOpen}
          onClose={() => { setOpen(null); opener.current?.focus(); }} />
      )}
    </>
  );
}

function Lightbox({ photos, index, onIndex, onClose }: {
  photos: DemoPhotoRecord[]; index: number; onIndex: (i: number) => void; onClose: () => void;
}) {
  const { lang, motion } = useSite();
  const box = useRef<HTMLDivElement | null>(null);
  const touch = useRef<number | null>(null);
  const p = photos[index];
  const go = (d: number) => onIndex((index + d + photos.length) % photos.length);

  useEffect(() => {
    const el = box.current;
    el?.querySelector<HTMLButtonElement>("[data-close]")?.focus();
    if (motion === "full" && el && typeof el.animate === "function") {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "cubic-bezier(0.22,1,0.36,1)" });
      el.querySelector("figure")?.animate([{ transform: "scale(0.96)" }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(0.22,1,0.36,1)" });
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "Tab") {
      const f = Array.from(box.current?.querySelectorAll<HTMLElement>("button") || []);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  return (
    <div ref={box} className="dsc-lb" role="dialog" aria-modal="true" aria-label={trf(C_COPY.photoOf, lang, { i: String(index + 1), n: String(photos.length) })}
      onKeyDown={onKey} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
      }}>
      <button type="button" data-close="" onClick={onClose} aria-label={tr(C_COPY.close, lang)} className="absolute right-3 top-3"><X className="h-7 w-7" aria-hidden="true" /></button>
      {photos.length > 1 && <button type="button" onClick={() => go(-1)} aria-label={tr(C_COPY.prev, lang)} className="absolute left-2 top-1/2 -translate-y-1/2"><ChevronLeft className="h-8 w-8" aria-hidden="true" /></button>}
      <figure>
        <LightboxImage src={p.src} alt={bi(p, "alt", lang)} lang={lang} />
        <figcaption>
          {bi(p, "caption", lang)}
          <span className="block text-sm opacity-80">{trf(C_COPY.photoOf, lang, { i: String(index + 1), n: String(photos.length) })}</span>
        </figcaption>
      </figure>
      {photos.length > 1 && <button type="button" onClick={() => go(1)} aria-label={tr(C_COPY.next, lang)} className="absolute right-2 top-1/2 -translate-y-1/2"><ChevronRight className="h-8 w-8" aria-hidden="true" /></button>}
    </div>
  );
}

/** The largest file of a stock photo (its manifest alt), or the file as given. */
function LightboxImage({ src, alt, lang }: { src: string; alt: string; lang: "en" | "hi" }) {
  const stock = getStockPhoto(src);
  if (!stock) return <img src={src} alt={alt} />;
  const big = stock.sizes[0];
  return <img src={big.src} alt={stockAlt(stock, lang)} width={big.w} height={big.h} decoding="async" />;
}
