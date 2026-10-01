import { ArrowRight } from "lucide-react";
import type { Cta, HomeHeroFrame } from "@/lib/cms/types";
import { HeroLink } from "./HeroLink";

/**
 * The picture under the home hero: screenshots of OUR OWN TEMPLATES, as they
 * open on a phone, each with a plain label, and one caption that says they are
 * samples with made-up names. Never a prospect's demo, never a stock photo of a
 * person, never a sample rating in view (see `home.hero.frames` in seed.ts).
 *
 * Below 1024px the row is a sideways strip that bleeds to the screen edges (the
 * negative margins match .container-page's padding at each step), so a phone
 * shows one and a half frames and the rest are a swipe away. From 1024px up it
 * is a plain four-column grid inside the gutter. It scrolls, so it takes focus
 * (tabIndex 0 with a name): a keyboard user can scroll it with the arrow keys.
 *
 * No motion. Every <img> carries its real width and height, so its box is held
 * before the file arrives and nothing below it moves. The first two load at
 * once (they are in or near the first screen on a phone); the rest are lazy.
 * Frames are 13rem wide on a tablet (768 to 1023px) so no single screenshot
 * outgrows the h1 there: the h1 has to stay the largest thing in the first
 * screen, the LCP element, measured at 390, 768, 1024, 1280 and 1440px.
 */
export function SampleFrames({ frames, caption, link }: { frames: HomeHeroFrame[]; caption?: string; link?: Cta }) {
  return (
    <figure className="mt-12 md:mt-14 lg:mt-16">
      <div
        role="region"
        aria-label="Sample sites from our own templates"
        tabIndex={0}
        className={
          "-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain px-4 pb-3 " +
          "sm:-mx-6 sm:scroll-px-6 sm:px-6 md:-mx-8 md:scroll-px-8 md:px-8 " +
          "lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0 " +
          "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        }
      >
        <ul className="flex gap-4 lg:grid lg:grid-cols-4 lg:gap-6">
          {frames.map((f, i) => (
            <li key={`${f.src}-${i}`} className="w-[15.5rem] shrink-0 snap-start md:w-[13rem] lg:w-auto">
              <div className="overflow-hidden rounded-2xl border border-foreground/15 bg-card">
                <img
                  src={f.src}
                  width={f.width || 780}
                  height={f.height || 1080}
                  alt={f.alt || ""}
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                  className="block h-auto w-full"
                />
              </div>
              {f.label && <p className="mt-3 text-sm font-medium text-foreground/85">{f.label}</p>}
            </li>
          ))}
        </ul>
      </div>

      {(caption || link?.label) && (
        <figcaption className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty lg:max-w-none">
          {caption}
          {link?.label && link.href && (
            <>
              {" "}
              <HeroLink
                cta={link}
                className="group inline-flex items-center gap-1 whitespace-nowrap font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors duration-200 hover:decoration-primary"
              >
                {link.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
              </HeroLink>
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}
