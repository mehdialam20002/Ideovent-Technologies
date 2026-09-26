/**
 * ONE RESPONSIVE PHOTO, for every photo slot of a demo site.
 *
 * Given a stock path (public/demo/img/, see src/lib/demo/images) it renders
 * the full srcset from the manifest widths, the intrinsic width and height
 * (no layout shift), the focal point as object-position, and the manifest's
 * alt text in the reader's language. Any other path (a file Mehdi uploaded)
 * renders as a plain image with the alt the caller gave.
 *
 *   priority   the hero, and only the hero: fetchpriority="high", eager, no
 *              async decode. Everything else is lazy and decodes async.
 *   sizes      what the layout gives the image. Defaults by role: a hero is
 *              full width, a section photo is half the column on a desktop,
 *              a portrait is a small tile.
 *   ratio      the box. "auto" fills the parent (give the parent a height).
 *
 * Alt for a stock photo always comes from the manifest, never from the
 * caller: a caller passing the institute's name would claim the stock
 * classroom is their building.
 *
 * No slider, no autoplay. The photo never carries text; a family that puts
 * text over it adds its own overlay (see `scrim`).
 */

import { useContext, useState, type CSSProperties, type ReactNode } from "react";
import { getStockPhoto, srcSetOf, stockAlt, type StockPhoto } from "@/lib/demo/images";
import type { DemoLang } from "@/lib/demo/language";
import { SiteCtx } from "@/lib/demo/site/context";

export interface DemoPhotoProps {
  /** A stock path or id, an uploaded file's URL, or empty. */
  src?: string;
  /** Alt for a non-stock file. Ignored for a stock photo (the manifest's wins). */
  alt?: string;
  /** Hero only. */
  priority?: boolean;
  /** The `sizes` attribute. Defaults by the photo's role. */
  sizes?: string;
  /** CSS aspect-ratio of the box: "4 / 3", "21 / 9", or "auto" to fill the parent. */
  ratio?: string;
  /** Classes on the box. */
  className?: string;
  /** Classes on the <img>. */
  imgClassName?: string;
  /** Override the focal point: "50% 30%". */
  position?: string;
  /** Language outside the site shell (the admin). Inside, the shell's wins. */
  lang?: DemoLang;
  /**
   * A contrast layer over the photo for text set on it: "bottom" (a gradient
   * from the foot), "full" (an even wash), or none. The colour comes from
   * --ds-scrim (an HSL triple), falling back to near-black, so the family
   * decides it and the text over it passes AA in both themes.
   */
  scrim?: "bottom" | "full" | "left";
  /** What to show with no src, or when the file fails. Default: nothing. */
  fallback?: ReactNode;
  /** Decorative: empty alt (the photo repeats what the text beside it says). */
  decorative?: boolean;
}

const DEFAULT_SIZES: Record<StockPhoto["role"], string> = {
  hero: "100vw",
  section: "(min-width: 1024px) 560px, (min-width: 640px) 50vw, 100vw",
  portrait: "(min-width: 640px) 200px, 40vw",
};

const SCRIM: Record<NonNullable<DemoPhotoProps["scrim"]>, string> = {
  bottom: "linear-gradient(to top, hsl(var(--ds-scrim, 220 30% 6%) / 0.82) 0%, hsl(var(--ds-scrim, 220 30% 6%) / 0.55) 45%, hsl(var(--ds-scrim, 220 30% 6%) / 0.1) 100%)",
  full: "hsl(var(--ds-scrim, 220 30% 6%) / 0.6)",
  left: "linear-gradient(to right, hsl(var(--ds-scrim, 220 30% 6%) / 0.85) 0%, hsl(var(--ds-scrim, 220 30% 6%) / 0.6) 50%, hsl(var(--ds-scrim, 220 30% 6%) / 0.15) 100%)",
};

/** Everything an <img> needs for a stock photo. Exported for a family that draws its own frame. */
export function stockImgProps(p: StockPhoto, opts: { lang?: DemoLang; priority?: boolean; sizes?: string; decorative?: boolean }) {
  const mid = p.sizes[Math.min(1, p.sizes.length - 1)];
  return {
    src: mid.src,
    srcSet: srcSetOf(p),
    sizes: opts.sizes || DEFAULT_SIZES[p.role],
    width: p.width,
    height: p.height,
    alt: opts.decorative ? "" : stockAlt(p, opts.lang),
    ...(opts.priority
      ? { loading: "eager" as const, fetchpriority: "high" }
      : { loading: "lazy" as const, decoding: "async" as const }),
  };
}

export function DemoPhoto(props: DemoPhotoProps) {
  const ctx = useContext(SiteCtx);
  const lang: DemoLang | undefined = ctx?.lang ?? props.lang;
  const [failed, setFailed] = useState<string | null>(null);
  const { src, ratio = "4 / 3", className = "", imgClassName = "", priority } = props;

  if (!src || failed === src) return <>{props.fallback ?? null}</>;

  const stock = getStockPhoto(src);
  const boxStyle: CSSProperties = ratio === "auto" ? {} : { aspectRatio: ratio };
  const imgStyle: CSSProperties = { objectPosition: props.position || stock?.objectPosition || "50% 50%" };
  const img = stock
    ? stockImgProps(stock, { lang, priority, sizes: props.sizes, decorative: props.decorative })
    : {
        src,
        alt: props.decorative ? "" : props.alt || "",
        ...(props.sizes ? { sizes: props.sizes } : {}),
        ...(priority
          ? { loading: "eager" as const, fetchpriority: "high" }
          : { loading: "lazy" as const, decoding: "async" as const }),
      };

  return (
    <div
      className={`ds-photo relative overflow-hidden ${ratio === "auto" ? "h-full w-full" : ""} ${className}`}
      style={boxStyle}
    >
      <img
        {...img}
        onError={() => setFailed(src)}
        className={`h-full w-full object-cover ${imgClassName}`}
        style={imgStyle}
      />
      {props.scrim && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: SCRIM[props.scrim] }} />
      )}
    </div>
  );
}

/** True when a value names a photo the page can show: for "render the slot or not". */
export function hasPhoto(src: string | undefined | null): src is string {
  return typeof src === "string" && src.trim().length > 0;
}
