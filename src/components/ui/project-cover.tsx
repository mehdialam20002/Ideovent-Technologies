import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCollection } from "@/lib/cms/context";

/**
 * Monogram for a project title: "HRMS Lite" → "HL", "Lead CRM" → "LC".
 * Anything after an em/en dash is a descriptor, not part of the name.
 */
export function monogram(title: string) {
  const name = title.split(/[.,]\s/)[0];
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]);
  return letters.join("").toUpperCase() || "·";
}

/** "HighQ Classes. Coaching Institute Website" → "HighQ Classes". */
function shortTitle(title: string) {
  return title.split(/[.,]\s/)[0].trim() || title;
}

/** "https://gym-map-customer-web.vercel.app/" → "gym-map-customer-web.vercel.app". */
export function hostOf(url?: string) {
  return url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
}

/**
 * Covers that have a narrow `-card` derivative next to them in public/work/.
 *
 * The screenshots were full-page captures, atelier-co.png alone was 3,863 KB at
 * 1019x8654, painted into a ~322x201 card, so under 1% of its pixels (64.7k of
 * 8.82M) were ever on screen. The five covers /work actually draws were 5.84 MB of
 * PNG between them, and public/work/ also carried the 2.09 MB WTF Go capture, which
 * no card referenced and which we have no permission to publish, 7.93 MB in the
 * folder in total. They are now the 16:10 band the card actually shows, in two WebP
 * sizes: `<name>.webp` at 1024x640 for the case-study hero and `<name>-card.webp` at
 * 800x500 for grid cards, so the browser can pick by slot, 259 KB for all ten files.
 * Both are written by scripts/optimise-work-images.py, which also writes a third
 * file per project, `<name>-full.webp`: the WHOLE page at 720px wide, used only by
 * the "See the whole page" viewer on the case study and never requested until a
 * reader opens it. See src/components/ui/full-page-capture.tsx. (Figures re-measured
 * 24 Sep 2026 against 06-portfolio/assets/screenshots/.)
 *
 * Listed explicitly rather than guessed from the filename, because `coverImage` is a
 * CMS field: an editor can point it at an upload that has no `-card` sibling, and a
 * guessed srcset entry would be a 404. The Onyx covers live in a subfolder and have
 * no derivative, which is why the regex below also refuses a nested path.
 */
const CARD_VARIANTS = new Set([
  "atelier-co", "aura-orbit", "gym-map", "tamkuhi-bazaar", "wedart-films",
]);

/** Full-size cover width/height, matching the files the image pipeline writes. */
const COVER_W = 1024;
const COVER_H = 640;

/**
 * What each slot is actually painted at, so the browser picks the right file
 * from the two in the srcset instead of guessing 100vw and always taking the
 * larger one. Measured in the browser at 1440 / 768 / 375.
 */
const SIZES: Record<"card" | "showcase" | "hero", string> = {
  card: "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw",
  showcase: "(min-width: 1024px) 46vw, (min-width: 640px) 45vw, 92vw",
  hero: "(min-width: 1440px) 1328px, 100vw",
};

/**
 * The fetch-priority hint, spelled in lowercase.
 *
 * React 18 does not know the camelCase `fetchPriority` prop and logs "React does
 * not recognize the fetchPriority prop on a DOM element" for every case-study
 * hero: a console error on a site that otherwise has none. The lowercase
 * spelling is passed straight through as the attribute the browser wants.
 * Revert to `fetchPriority` if this ever moves to React 19.
 */
const PRIORITY_HINT = { fetchpriority: "high" } as Record<string, string>;

/** The no-image panel's ink (.brand-navy-surface) at 90% and 70%, as colour. */
const INK_90: CSSProperties = { color: "hsl(var(--brand-navy-ink) / 0.9)" };
const INK_70: CSSProperties = { color: "hsl(var(--brand-navy-ink) / 0.7)" };

function buildSrcSet(src: string): string | undefined {
  const match = src.match(/^(.*\/work\/)([^/]+)\.webp$/);
  if (!match) return undefined;
  const [, dir, base] = match;
  if (!CARD_VARIANTS.has(base)) return undefined;
  return `${dir}${base}-card.webp 800w, ${src} ${COVER_W}w`;
}

/*
  THE CROP, PER IMAGE, MEASURED (26 Sep 2026, row by row with PIL on the 1024px
  file; the 800px `-card` file is the same picture scaled, so one number serves
  both).

  Every cover is the top of a full-page capture, and two of them open on the
  site's own promo strip ABOVE its navbar: a thin line of small print that, in a
  260px frame, reads as a rendering fault. The frame should open on the nav and
  the hero, which is what a person sees when they type the address.

    gym-map      strip rows 0-19 ("Verified gyms · Transparent pricing ..."),
                 a 1px rule at row 20, page ground from row 21.      20px
    atelier-co   strip rows 0-32 ("RESELLERS MOST WELCOME / ..."),
                 cream nav ground from row 33.                        33px
    wedart-films, tamkuhi-bazaar, aura-orbit: open on their nav.       0
    onyx/cover   a desktop window, 789x735, drawn on black with its own
                 1px frame at x=12 / x=776 / y=12. Inset 13px on the
                 top and both sides so our chrome frames the APP, not a
                 screenshot of a window with a black margin round it.

  The values are in `cqw` (a share of the frame's own width, .bf-view is a size
  container) because the strip is a fixed share of the image's width, and that is
  the only unit that is right at 260px on a phone and at 1184px on a case study.
  `top` is solved for an image scaled to fill a box up to 16:10 plus the crop:
      c = (s / 1024 × 100) / (1 − s / 640)
  so the strip stays hidden whether object-fit scales by width or by height.
  `side` is (13 / 789) of the rendered width, which is itself widened by 2·side.
*/
type Crop = { top: number; side?: number };
const CROPS: Record<string, Crop> = {
  "gym-map": { top: 2.02 },
  "atelier-co": { top: 3.4 },
  "onyx/cover": { top: 1.71, side: 1.71 },
};

function cropFor(src: string): Crop | undefined {
  const match = src.match(/\/work\/(.+?)(?:-card)?\.webp$/);
  return match ? CROPS[match[1]] : undefined;
}

/** Inline geometry for a cropped picture inside `.bf-view`. */
function cropStyle(crop?: Crop): CSSProperties | undefined {
  if (!crop) return undefined;
  const side = crop.side ?? 0;
  return {
    top: `-${crop.top}cqw`,
    height: `calc(100% + ${crop.top}cqw)`,
    left: side ? `-${side}cqw` : 0,
    width: side ? `calc(100% + ${side * 2}cqw)` : "100%",
  };
}

/**
 * A slim browser window around a screenshot: an address bar that prints the
 * project's REAL host, and nothing else.
 *
 * WHY. Every cover on the site is the top of a full-page capture, so the first
 * thing inside it is the project's own navbar. Loose on the page, directly
 * under Ideovent's sticky nav, that read as two navbars stacked, a website
 * nested inside a website, which is the screenshot Mehdi sent. Inside a window
 * it reads as "their website", which is true.
 *
 * WHAT IT IS NOT. No device mock-up, no phone frame, no reflection, and no
 * window dots: three dots top-left are the stock "browser mock-up" of every
 * template landing page, and a row of them down /work read as exactly that
 * (removed by the verifier, 26 Sep 2026). The address is the part that is
 * true and useful. The bar is the card ground, and the frame is radius 8px
 * with a 1px inset ring (motion.css `.bf`) that brightens on hover. If there
 * is no address, the bar is empty: an
 * invented URL would be the one untrue thing in the picture. Onyx is a desktop
 * app, so it gets the window and no address.
 *
 * LAYOUT. It fills its parent (`h-full w-full`) and the picture takes whatever
 * height is left under the chrome, which is how ProjectCover drops it into the
 * aspect-ratio boxes every card and case study already draws. Pass
 * `viewClassName="aspect-[8/5] flex-none"` instead to give the picture its own
 * ratio and let the frame grow by the chrome (WorkShowcase does).
 *
 * The chrome is aria-hidden: it is a picture of a browser, the image's alt text
 * carries the content, and every call site that shows an address also prints
 * it as a real, focusable link.
 *
 * site:system: src/pages/CaseStudy.tsx's cover is meant to use this. It already
 * does, through <ProjectCover>, which frames every screenshot by default; the
 * rounded-3xl bordered box CaseStudy wraps round it can simply go.
 */
export function BrowserFrame({
  url,
  children,
  className,
  viewClassName,
}: {
  /** The live address. Only its host is printed. Empty prints no address. */
  url?: string;
  children: ReactNode;
  className?: string;
  viewClassName?: string;
}) {
  const address = hostOf(url);
  return (
    <div className={cn("bf relative flex h-full w-full flex-col overflow-hidden rounded-[8px] bg-card", className)}>
      <div className="bf-bar" aria-hidden="true">
        <span />
        <span className="bf-addr">{address ? <span>{address}</span> : null}</span>
        <span />
      </div>
      <div className={cn("bf-view relative min-h-0 flex-1 overflow-hidden", viewClassName)}>{children}</div>
    </div>
  );
}

interface ProjectCoverProps {
  /** Real screenshot of the real product. Empty means we don't have one. */
  src?: string;
  title: string;
  className?: string;
  /**
   * How wide this cover is painted, for the browser's srcset maths.
   * "card"     = a tile in a 3-column grid (~425px at 1440)
   * "showcase" = the wide 2-column tile the client band leads with (~656px)
   * "hero"     = the full case-study width (~1328px at 1440)
   */
  slot?: "card" | "showcase" | "hero";
  /** The hero cover is the LCP element on a case study, so it must not be lazy. */
  priority?: boolean;
  /**
   * Why there is no screenshot. Printed on the text-led panel, so an image-less
   * card reads as a decision rather than as a broken asset. Ignored when `src`
   * is set. Comes from `project.noImageReason`.
   */
  noImageReason?: string;
  /**
   * Attribution that must not be separable from the picture, currently only
   * WTF Go, which our founder built while employed at Witness The Fitness Pvt.
   * Ltd. Rendered inside the cover itself rather than under it, so cropping a
   * card down to its thumbnail cannot strip the credit off.
   */
  attribution?: string;
  /**
   * How the no-image panel lays itself out, independently of `slot`.
   *
   * `slot` answers "how wide is this painted", which is a question about
   * srcset. This answers "how tall is the box", which is a question about
   * typography, and the two stopped agreeing when /work grew a full-width
   * employer card: its cover panel is ~470px wide (a `showcase` request) and
   * ~300px tall (a `hero` layout). Left coupled, the monogram sat at card size
   * in the bottom corner of a panel with 200px of empty navy above it.
   *
   * Defaults to following `slot`, so every existing caller is unchanged.
   */
  panel?: "compact" | "tall";
  /**
   * The address printed in the window's bar. Leave it out and the cover finds
   * its own project in the CMS by `src` and uses that project's `liveUrl`, so
   * every existing call site gets the right host without being edited. Pass
   * "" to print no address.
   */
  liveUrl?: string;
  /**
   * Draw the browser window round the screenshot. On by default: every
   * screenshot on the site sits in one (see BrowserFrame). The no-image panel is
   * a designed surface, not a screenshot, and never gets one.
   */
  frame?: boolean;
}

/**
 * Project cover.
 *
 * Renders the real screenshot, inside a browser window, when one exists, and a
 * text-led panel in the brand navy when one does not. We never stand a stock
 * photograph in for a project we cannot show: HRMS Lite and Lead CRM are behind
 * a login and every screen in them is somebody's personal data, HighQ Classes
 * has no capture on file, the Ideovent site's own domain is not resolving, and
 * WTF Go's interface belongs to the founder's employer and is not ours to
 * publish.
 *
 * That is four of eleven projects, so the no-image state is not an edge case,
 * it is a layout the portfolio has to carry well. It prints the monogram, the
 * project's short name and the reason, on the logo navy with the mark's own
 * diagonals as a faint etch. A viewer should be able to tell it was designed.
 *
 * Screenshots are anchored to the top, less the measured promo strip on the
 * two covers that have one (CROPS above): these are captures of web pages, and
 * the top of a page is the part worth seeing.
 *
 * MOTION. On hover of the enclosing `.group`, the picture scales to 1.02 over
 * 400ms inside the window's clip and the window's ring brightens in 150ms
 * (motion.css). The window itself never moves, and nothing here runs under
 * reduced motion.
 */
export function ProjectCover({
  src,
  title,
  className,
  slot = "card",
  priority = false,
  noImageReason,
  attribution,
  panel,
  liveUrl,
  frame = true,
}: ProjectCoverProps) {
  // The cover's own project, for its address. A cheap memoised read of the
  // CMS; only consulted when the caller did not say.
  const projects = useCollection("projects");
  const address = liveUrl ?? (src ? projects.find((p) => p.coverImage === src)?.liveUrl : undefined);

  // "tall" = monogram at the top, text at the foot, room used. "compact" =
  // everything bottom-anchored under the card chrome. See the `panel` prop.
  const tall = (panel ?? (slot === "hero" ? "tall" : "compact")) === "tall";

  if (src) {
    const crop = cropFor(src);
    const img = (
      <img
        src={src}
        srcSet={buildSrcSet(src)}
        sizes={SIZES[slot]}
        alt={title}
        width={COVER_W}
        height={COVER_H}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? PRIORITY_HINT : {})}
        style={cropStyle(crop)}
        className={cn(
          "m-zoom absolute inset-x-0 top-0 h-full w-full max-w-none object-cover object-top",
          className
        )}
      />
    );

    // The credit travels with the image. Solid ground, radius 6, no blur: the
    // redesign has no glass anywhere (_assets/SITE-REDESIGN-BRIEF.md).
    const credit = attribution ? (
      <span className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center rounded-[6px] bg-black/80 px-2.5 py-1 text-xs font-medium leading-tight text-white">
        {attribution}
      </span>
    ) : null;

    if (!frame) {
      return (
        <div className="bf-view absolute inset-0 overflow-hidden">
          {img}
          {credit}
        </div>
      );
    }
    return (
      <BrowserFrame url={address} className="absolute inset-0">
        {img}
        {credit}
      </BrowserFrame>
    );
  }

  return (
    <div
      className={cn(
        "brand-navy-surface brand-navy-etch relative flex h-full w-full flex-col overflow-hidden",
        // A card grid prints an arrow button at right-4 top-4 over this
        // cover (and, where the project has a live address, that address at
        // left-4 top-4), so in "compact" everything here is bottom-anchored
        // and the top ~3rem is left clear for that chrome. A "tall" panel,
        // the case-study hero, and the full-width employer card, has no
        // such overlay and can use the whole height.
        tall ? "justify-between gap-6 p-5 sm:p-6 md:p-10" : "justify-end p-4 pt-14 sm:p-5 sm:pt-14"
      )}
      role="img"
      aria-label={noImageReason ? `${title}. ${noImageReason}` : title}
    >
      {/* Softened with a colour alpha, not `opacity`: the brief's reduced-
          motion check reads "every element in <main> has opacity 1", and a
          designed 0.9 is indistinguishable from a stuck entrance state. */}
      <span
        aria-hidden
        className={cn(
          "block font-display font-medium leading-none tracking-[0.04em]",
          tall ? "text-4xl sm:text-6xl md:text-7xl" : "mb-2 text-2xl"
        )}
        style={INK_90}
      >
        {monogram(title)}
      </span>
      <span aria-hidden className="relative">
        <span
          className={cn(
            "block font-display font-medium leading-snug",
            tall ? "text-lg sm:text-xl md:text-2xl" : "text-sm sm:text-base"
          )}
        >
          {shortTitle(title)}
        </span>
        {/* The employer credit sits inside the cover, not under it. */}
        {attribution && (
          <span
            className={cn(
              "mt-1.5 block font-medium leading-snug",
              tall ? "text-sm" : "text-[0.6875rem]"
            )}
            style={INK_90}
          >
            {attribution}
          </span>
        )}
        {/* Clamped on a card, in full on the case-study hero. Card covers
            are as short as 201px in the narrow bands, and text spilling out
            of the top of the panel is exactly the broken look this whole
            treatment exists to avoid. The full sentence is on the case
            study and in this element's aria-label either way. */}
        {noImageReason && (
          <span
            style={INK_70}
            className={cn(
              "mt-1.5 block leading-snug",
              tall
                ? "max-w-[60ch] text-[0.8125rem] sm:text-sm"
                : cn(
                    "max-w-[38ch] text-[0.6875rem]",
                    // An employer credit takes a line of its own above this,
                    // and the employer-work band is the narrowest card on
                    // /work (322x201), so that case gets one line fewer.
                    attribution ? "line-clamp-2" : "line-clamp-3"
                  )
            )}
          >
            {noImageReason}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * "Built at Witness The Fitness Pvt. Ltd." for anything in the `employer work`
 * category, and nothing at all for everything else.
 *
 * FACTS.md is explicit that the founder's work for an employer must never be
 * presented as an Ideovent client project, and the attribution has to survive
 * the card being seen on its own, in a share preview, or in somebody's
 * screenshot. Deriving it from the category rather than typing it into each
 * grid means there is no way to render one of these cards and forget it.
 *
 * `clientName` reads "Witness The Fitness Pvt. Ltd., founder's employment";
 * everything after the dash is a note to us, so only the employer is printed.
 */
export function employerCredit(project: { category?: string; clientName?: string }) {
  if ((project.category ?? "").toLowerCase() !== "employer work") return undefined;
  const employer = (project.clientName ?? "").split(/,\s/)[0].trim();
  return employer ? `Built at ${employer}` : undefined;
}
