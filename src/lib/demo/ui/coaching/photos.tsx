/**
 * COACHING SECTION PHOTOS, one per slot (src/lib/demo/images/slots.ts).
 *
 *   SectionPhoto   the photo a record keeps for one slot, in the family's
 *                  frame: a hairline rule and square corners (classic), the
 *                  card radius (modern), a large soft radius (warm). Renders
 *                  nothing when the slot is empty, so a page never shows a
 *                  hole where a photo was.
 *   PhotoBand      the same, set full column width as a wide band, for a
 *                  page that opens on its subject (courses, test series).
 *   sectionPhoto   the slot's path, or "", for "lay out two columns or one".
 *
 * Every photo is lazy and decodes async (only the hero is priority). A stock
 * photo's alt comes from the manifest and describes the scene; it is never
 * captioned as the institute's building.
 */

import type { DemoSite } from "@/lib/cms/types";
import type { DemoPhotoSlot } from "@/lib/demo/images";
import { useSite } from "@/lib/demo/site/context";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import "./coaching.css";

export function sectionPhoto(site: DemoSite, slot: DemoPhotoSlot): string {
  return (site.sectionPhotos?.[slot] || "").trim();
}

/** Half the column on a desktop, the full width on a phone. */
const HALF = "(min-width: 1152px) 560px, (min-width: 768px) 48vw, calc(100vw - 32px)";
const FULL = "(min-width: 1152px) 1120px, calc(100vw - 32px)";

export function SectionPhoto({ slot, ratio = "4 / 3", sizes = HALF, className = "" }: {
  slot: DemoPhotoSlot;
  ratio?: string;
  sizes?: string;
  className?: string;
}) {
  const { site } = useSite();
  const src = sectionPhoto(site, slot);
  if (!src) return null;
  return <DemoPhoto src={src} ratio={ratio} sizes={sizes} className={`dsc-frame ${className}`} />;
}

/** A wide band: 21:9 on a desktop, 16:9 on a phone so the subject stays in frame. */
export function PhotoBand({ slot, className = "" }: { slot: DemoPhotoSlot; className?: string }) {
  const { site } = useSite();
  const src = sectionPhoto(site, slot);
  if (!src) return null;
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
      <DemoPhoto src={src} ratio="auto" sizes={FULL} className="dsc-frame dsc-band" />
    </div>
  );
}
