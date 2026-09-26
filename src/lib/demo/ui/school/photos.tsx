/**
 * SECTION PHOTOS FOR SCHOOL PAGES, in the family's own frame.
 *
 *   classic  a plate: a hairline rule around the photo with a small inset,
 *            square corners, like a photograph tipped into a prospectus
 *   modern   the card radius, no border, the photo edge to edge
 *   warm     a big rounded window with a thick border in the rule colour
 *
 * A slot shows only when the record fills it (DemoSite.sectionPhotos, see
 * src/lib/demo/images/slots.ts). Pages use one photo per section at most, and
 * not every section gets one: rhythm matters more than coverage.
 *
 * Everything below the hero is lazy and decodes async (DemoPhoto does that);
 * a stock photo brings its srcset, focal point and manifest alt.
 */

import type { ReactNode } from "react";
import type { DemoSite } from "@/lib/cms/types";
import { getStockPhoto, stockAlt, type DemoPhotoSlot } from "@/lib/demo/images";
import type { DemoLang } from "@/lib/demo/language";
import { bi } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { Photo } from "@/pages/site/kit/Text";
import type { SchoolPhoto } from "./shared";

/** The photo a section slot holds, or undefined. */
export function slotPhoto(site: DemoSite, slot: DemoPhotoSlot): string | undefined {
  const v = site.sectionPhotos?.[slot];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** The first filled slot of several: `firstSlot(site, "about", "campus")`. */
export function firstSlot(site: DemoSite, ...slots: DemoPhotoSlot[]): string | undefined {
  for (const s of slots) {
    const v = slotPhoto(site, s);
    if (v) return v;
  }
  return undefined;
}

/**
 * The alt of a gallery photo. A stock photo's comes from the manifest (a
 * duplicate clears the record's alt, and nothing may describe stock as the
 * institute); any other photo uses the record's alt.
 */
export function photoAlt(p: SchoolPhoto, lang: DemoLang): string {
  const stock = getStockPhoto(p.src);
  return stock ? stockAlt(stock, lang) : bi(p.obj, "alt", lang);
}

/** The caption, falling back to the alt, for a figcaption or the lightbox. */
export function photoCaption(p: SchoolPhoto, lang: DemoLang): string {
  return bi(p.obj, "caption", lang) || photoAlt(p, lang);
}

/** The largest file of a stock photo (the lightbox shows it full screen). */
export function largestSrc(src: string): string {
  return getStockPhoto(src)?.sizes[0].src || src;
}

const FRAME = {
  classic: "border border-[hsl(var(--ds-rule))] p-1.5 bg-[hsl(var(--ds-surface))]",
  modern: "",
  warm: "border-4 border-[hsl(var(--ds-rule))] rounded-[calc(var(--ds-radius)+12px)] overflow-hidden",
} as const;

const RADIUS = {
  classic: "rounded-none",
  modern: "rounded-[var(--ds-radius)]",
  warm: "",
} as const;

/** One photo in the family's frame. Renders nothing without a src. */
export function SlotPhoto({ src, ratio = "4 / 3", sizes, className = "" }: {
  src?: string;
  ratio?: string;
  sizes?: string;
  className?: string;
}) {
  const { family } = useSite();
  if (!src) return null;
  return (
    <div className={`${FRAME[family]} ${className}`}>
      <Photo src={src} alt="" ratio={ratio} sizes={sizes} className={RADIUS[family]} />
    </div>
  );
}

/**
 * Text beside a photo: text first on a phone, photo beside it from lg up.
 * `flip` puts the photo on the left, so two such sections on one page do not
 * lean the same way. Without a photo it is just the children.
 */
export function WithPhoto({ src, children, flip, ratio = "4 / 3" }: {
  src?: string;
  children: ReactNode;
  flip?: boolean;
  ratio?: string;
}) {
  if (!src) return <>{children}</>;
  return (
    <div className={`grid gap-8 lg:items-start lg:gap-12 ${flip ? "lg:grid-cols-[5fr_7fr]" : "lg:grid-cols-[7fr_5fr]"}`}>
      <div className={`min-w-0 ${flip ? "lg:order-2" : ""}`}>{children}</div>
      <SlotPhoto src={src} ratio={ratio} sizes="(min-width: 1024px) 460px, (min-width: 640px) 90vw, 100vw" className={flip ? "lg:order-1" : ""} />
    </div>
  );
}

/** A wide photo band above a section's content. */
export function PhotoBand({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <div className="mb-8">
      <SlotPhoto src={src} ratio="21 / 9" sizes="(min-width: 1200px) 1100px, 100vw" className="[&_.ds-photo]:max-sm:!aspect-[4/3]" />
    </div>
  );
}
