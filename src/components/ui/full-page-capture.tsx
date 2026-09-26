import { useId, useState } from "react";
import { ChevronDown, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "See the whole page": the full-page screenshot, on the case study only.
 *
 * WHY THIS EXISTS
 * The card and the case-study hero both show a 16:10 band off the TOP of the
 * capture: the header, the wordmark and the first fold, which is the part that
 * identifies a site at a glance. That is the right crop for a grid and the
 * wrong one for judging a build: the thing a prospect actually wants to know
 * is whether the whole page holds together, and on these projects the page is
 * between 2,666 and 11,730 pixels tall.
 *
 * So the full capture lives here, behind a toggle, inside a scrolling frame.
 *
 * WHY IT IS NOT JUST AN <img> ON THE PAGE
 * `public/work/*-full.webp` is 38-207 KB per project. That is cheap for a
 * reader who asked for it and indefensible for one who did not, so the <img>
 * is not in the DOM at all until the toggle is pressed: React renders nothing,
 * the browser requests nothing. The full-page captures therefore cost a /work
 * visitor, and a case-study visitor who does not open them, exactly zero bytes.
 * (The originals in 06-portfolio/assets/screenshots/ are 191 KB, 3,863 KB and
 * are never shipped. Do not point this at them.)
 *
 * WHY THE DIMENSIONS ARE LISTED HERE
 * Same reason as CARD_VARIANTS in project-cover.tsx: `coverImage` is a CMS
 * field an editor can repoint at any upload, and a guessed `-full.webp` sibling
 * would be a 404. These files are build artefacts of
 * scripts/optimise-work-images.py. That script prints this table at the end of
 * every run, so re-run it and paste. The width/height are on the element for
 * the same reason every other image on the site has them: without them a
 * 720×8248 image collapses to nothing and then shoves the page down when it
 * lands.
 */
const FULL_CAPTURES = new Map<string, { width: number; height: number }>([
  ["gym-map", { width: 720, height: 8248 }],
  ["wedart-films", { width: 720, height: 5261 }],
  ["atelier-co", { width: 720, height: 6115 }],
  ["tamkuhi-bazaar", { width: 720, height: 5181 }],
  ["aura-orbit", { width: 720, height: 1884 }],
]);

/** The date every capture in 06-portfolio/assets/screenshots/ was taken. */
export const CAPTURED_ON = "24 September 2026";

export interface FullCapture {
  src: string;
  width: number;
  height: number;
}

/**
 * The full-page file for a cover, or undefined when there isn't one.
 * Onyx's covers live in a subfolder and are app screenshots rather than page
 * captures, so the regex refuses a nested path, exactly as buildSrcSet does.
 */
export function fullCaptureFor(coverImage?: string): FullCapture | undefined {
  if (!coverImage) return undefined;
  const match = coverImage.match(/^(.*\/work\/)([^/]+)\.webp$/);
  if (!match) return undefined;
  const [, dir, base] = match;
  const dims = FULL_CAPTURES.get(base);
  if (!dims) return undefined;
  return { src: `${dir}${base}-full.webp`,...dims };
}

interface FullPageCaptureProps {
  capture: FullCapture;
  /** Project title, for the alt text and the frame's label. */
  title: string;
  /** The live address, printed in the frame's chrome. Optional. */
  liveUrl?: string;
  className?: string;
}

export function FullPageCapture({ capture, title, liveUrl, className }: FullPageCaptureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const host = liveUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // The height of the real page, in the units of the original capture rather
  // than the downscale, 720px wide here was 1,019-1,024px wide on screen.
  const originalHeight = Math.round((capture.height * 1024) / capture.width);

  return (
    <div className={cn("rounded-3xl border border-border bg-card/40", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 rounded-3xl px-6 py-5 text-left transition-colors hover:bg-card/70 md:px-8"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-display text-base font-semibold">
            <Maximize2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {open ? "Hide the whole page": "See the whole page"}
          </span>
          <span className="mt-1.5 block text-sm text-muted-foreground text-pretty">
            The image above is the top of the page. The real thing is about{" "}
            {originalHeight.toLocaleString("en-IN")} pixels tall, open this to scroll all of it.
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180"
)}
        />
      </button>

      {/* Not `hidden`: not rendered. An <img> in the tree, even display: none,
          is a request the reader did not ask for. */}
      {open && (
        <div id={panelId} className="px-4 pb-5 md:px-8 md:pb-8">
          <figure className="m-0">
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              {/* Chrome. It says what you are looking at, which a bare long
                  image does not. */}
              <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2">
                <span aria-hidden className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                </span>
                <span className="truncate text-xs text-muted-foreground">{host ?? title}</span>
                {/* Without this the frame reads as a still image and nobody
                    tries to move it. */}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground" aria-hidden>
                  scroll inside ↓
                </span>
              </div>

              {/* tabIndex makes the scroller reachable from the keyboard: a
                  focusable overflow region is the only way a keyboard user can
                  scroll one. */}
              <div
                role="region"
                aria-label={`Full-page capture of ${title}. Scroll to see the whole page.`}
                tabIndex={0}
                className="max-h-[60vh] overflow-y-auto overscroll-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[hsl(var(--ring))] md:max-h-[70vh]"
              >
                {/* Capped at the file's own 720px rather than stretched to the
                    frame. On a 1328px case-study column `w-full` was a 1.8×
                    upscale, and a soft screenshot undercuts the one thing this
                    viewer is for. Centred, it reads as a page in a window. */}
                <img
                  src={capture.src}
                  alt={`${title}, captured in full on ${CAPTURED_ON}`}
                  width={capture.width}
                  height={capture.height}
                  loading="lazy"
                  decoding="async"
                  className="mx-auto block h-auto w-full max-w-[45rem]"
                />
              </div>
            </div>
            <figcaption className="mt-3 text-xs text-muted-foreground text-pretty">
              One capture of the live page, top to bottom, taken on {CAPTURED_ON}. Nothing is
              stitched, mocked up or retouched
              {host ? <>, open {host} and compare.</>: "."}
            </figcaption>
          </figure>
        </div>
)}
    </div>
);
}
