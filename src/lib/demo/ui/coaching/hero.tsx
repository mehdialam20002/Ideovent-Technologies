/**
 * THE COACHING HOME HERO WITH ITS PHOTO. The kit hero (src/pages/site/kit/
 * Hero.tsx) owns the shapes; this file gives three of them the photo in the
 * way the family would set it, and hands everything else to the kit:
 *
 *   modern a  (c1)  split: text left, the photo right in the card radius,
 *                   the next-batches card overlapping the photo's foot
 *   modern b  (c5)  full bleed: the photo under a scrim of the hero ground
 *                   (0.84 on a phone, 0.9 to 0.86 under the text on a desktop;
 *                   cream on it measures 5.4:1 or more over a white pixel), and
 *                   the eyebrow in the hero ink, so every line passes AA
 *   warm a    (c4)  the brand colour full bleed, the photo in a big rounded
 *                   frame with a marigold tile behind it
 *   classic a/b     the kit's letterbox band and framed portrait: text is
 *                   never set on the photo there.
 *
 * The photo is the LCP: priority (eager, fetchpriority high), full srcset,
 * width and height, the focal point as object-position. No text on a photo
 * without the scrim; no slider.
 */

import type { ReactNode } from "react";
import { useSite } from "@/lib/demo/site/context";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { Hero, type HeroProps } from "@/pages/site/kit/Hero";
import "./coaching.css";

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

function Actions({ primary, secondary }: { primary?: ReactNode; secondary?: ReactNode }) {
  if (!primary && !secondary) return null;
  return <div className="mt-7 flex flex-wrap gap-3">{primary}{secondary}</div>;
}

/** "1,260 students" -> the figure large above its label (as the kit's stat bar). */
function StatBar({ facts }: { facts?: string[] }) {
  if (!facts?.length) return null;
  return (
    <div className="border-t border-[hsl(var(--ds-hero-soft)/0.25)]">
      <ul className={`${wrap} grid grid-cols-2 gap-px py-4 text-sm sm:grid-cols-4`}>
        {facts.map((f) => {
          const m = /^([\d₹$£][\d,.%+]*)\s+(.+)$/.exec(f);
          return (
            <li key={f} className="ds-num py-1 text-[hsl(var(--ds-hero-soft))]">
              {m ? <><span className="ds-display block text-2xl text-[hsl(var(--ds-hero-ink))] sm:text-3xl">{m[1]}</span>{m[2]}</> : f}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CoachingHero(p: HeroProps) {
  const { family, variant } = useSite();
  const key = `${family}-${variant}`;
  const src = p.photo?.src?.trim();
  if (!src || !["modern-a", "modern-b", "warm-a"].includes(key)) return <Hero {...p} />;

  if (key === "modern-a") {
    return (
      <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-12`}>
          <div>
            {p.eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
            <h1 className="ds-display mt-3 text-4xl leading-[1.05] sm:text-5xl">{p.title}</h1>
            {p.lead && <p className="mt-4 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
          <div>
            <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="16 / 10"
              sizes="(min-width: 1152px) 540px, (min-width: 1024px) 46vw, calc(100vw - 32px)"
              className="rounded-[var(--ds-radius)] shadow-2xl" />
            {p.aside && (
              <div className="relative z-10 mx-3 -mt-10 rounded-[var(--ds-radius)] bg-[hsl(var(--ds-surface))] p-5 text-[hsl(var(--ds-ink))] shadow-xl sm:mx-6 sm:p-6">
                {p.aside}
              </div>
            )}
          </div>
        </div>
        <StatBar facts={p.facts} />
      </header>
    );
  }

  if (key === "modern-b") {
    return (
      <header className="relative isolate overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className="absolute inset-0 -z-10">
          <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="auto" sizes="100vw" />
          <span aria-hidden="true" className="dsc-hero-scrim absolute inset-0" />
        </div>
        <div className={`${wrap} py-16 sm:py-24 lg:py-28`}>
          {/* On the photo the eyebrow is set in the hero ink with a saffron rule:
              the accent colour at 14px would fall under AA over a bright pixel. */}
          {p.eyebrow && <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider"><span aria-hidden="true" className="h-0.5 w-8 bg-[hsl(var(--ds-hero-accent))]" />{p.eyebrow}</p>}
          <h1 className="ds-display mt-3 max-w-2xl text-4xl leading-[1.05] sm:text-6xl">{p.title}</h1>
          {p.lead && <p className="mt-5 max-w-xl text-lg">{p.lead}</p>}
          <Actions primary={p.primary} secondary={p.secondary} />
        </div>
        {p.aside && <div className="border-t border-[hsl(var(--ds-hero-soft)/0.3)] bg-[hsl(var(--ds-hero-bg)/0.96)]"><div className={`${wrap} py-4`}>{p.aside}</div></div>}
      </header>
    );
  }

  /* warm a */
  return (
    <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
      <div className={`${wrap} grid gap-10 pb-16 pt-10 sm:pb-20 sm:pt-14 md:grid-cols-[7fr_5fr] md:items-center`}>
        <div>
          {p.eyebrow && <p className="font-semibold text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
          <h1 className="ds-display mt-2 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
          {p.lead && <p className="mt-4 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
          {!!p.facts?.length && <ul className="mt-5 flex flex-wrap gap-2 text-sm">{p.facts.map((f) => <li key={f} className="rounded-full bg-[hsl(var(--ds-hero-ink)/0.12)] px-3 py-1">{f}</li>)}</ul>}
          <Actions primary={p.primary} secondary={p.secondary} />
        </div>
        <div className="dsc-hero-frame mx-auto w-full max-w-md md:mr-0">
          <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="4 / 3"
            sizes="(min-width: 1152px) 448px, (min-width: 768px) 40vw, calc(100vw - 40px)" />
        </div>
      </div>
      {p.aside && <div className={`${wrap} relative -mb-12 pb-0`}><div className="ds-card relative z-10 p-5 text-[hsl(var(--ds-ink))]">{p.aside}</div></div>}
    </header>
  );
}
