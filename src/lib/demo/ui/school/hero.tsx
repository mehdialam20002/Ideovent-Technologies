/**
 * THE SCHOOL HOME HERO WITH A PHOTOGRAPH, per family and variant.
 *
 * The kit's <Hero> (src/pages/site/kit/Hero.tsx) owns the no-photo first
 * screens and stays the fallback. When the record has a hero photo, the
 * school renders it here, in the family's own composition:
 *
 *   modern a  split: headline and actions on the navy ground, the photo in
 *             the right column with the admissions card lapping its foot;
 *             stat bar on the bottom edge (s1)
 *   modern b  bleeds to the right edge on a desktop (full width 1024 to
 *             1279px, the right 60% from 1280px), text on the left over a
 *             strong left-to-right wash of the hero colour; on a phone it is
 *             a band above the text, so no text sits on the photo (s5)
 *   warm a    the brick ground, text first, the photo in a rounded window
 *             with a haldi border; the notice card overlaps the next section (s2)
 *   warm b    the arched window holds the photo, with the round sticker (s3)
 *   classic a masthead: centred name, ruled facts line, the photo as a wide
 *             framed plate under it (3:2 on a phone, 21:9 on a desktop) (s4)
 *
 * Text never sits on a busy part of a photo without a wash: modern b's wash
 * is at least 0.88 of the hero colour wherever text can reach, which keeps
 * hero-soft text above 4.5:1 even over a white patch. Every other variant
 * sets the text beside the photo, on the hero ground.
 *
 * The photo is the LCP: priority (eager, fetchpriority high), and `sizes`
 * says what the layout really gives it, so a phone downloads 800 or 1280w.
 */

import { useSite } from "@/lib/demo/site/context";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { Hero, type HeroProps } from "@/pages/site/kit/Hero";

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

function Actions({ primary, secondary, center }: Pick<HeroProps, "primary" | "secondary"> & { center?: boolean }) {
  if (!primary && !secondary) return null;
  return <div className={`mt-7 flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>{primary}{secondary}</div>;
}

/** Modern a's stat bar: "1,260 pupils" set as a large figure over its label. */
function StatBar({ facts }: { facts: string[] }) {
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

/* Modern b: the wash that keeps text readable over the full-bleed photo. The
   text column ends before 60% of the width; the wash is 0.88 or more there. */
const MODERN_B_WASH =
  "linear-gradient(90deg, hsl(var(--ds-hero-bg) / 0.94) 0%, hsl(var(--ds-hero-bg) / 0.88) 62%, hsl(var(--ds-hero-bg) / 0.4) 100%)";
/* From 1280px the photo holds the right 60% of the header, so the people in it
   sit clear of the text, which stays on the solid hero ground. The text column
   reaches at most 58% of the viewport there (168 + 672 of 1440, 64 + 672 of
   1280), which is 30% into the photo: the wash is 0.9 or more up to that line
   and then falls away, so the scene on the right is seen at full strength. */
const MODERN_B_WASH_XL =
  "linear-gradient(90deg, hsl(var(--ds-hero-bg) / 1) 0%, hsl(var(--ds-hero-bg) / 0.9) 31%, hsl(var(--ds-hero-bg) / 0.35) 44%, hsl(var(--ds-hero-bg) / 0) 60%)";

export function SchoolHero(p: HeroProps & { photoSrc?: string }) {
  const { family, variant } = useSite();
  const key = `${family}-${variant}`;
  const src = p.photoSrc;
  const known = ["modern-a", "modern-b", "warm-a", "warm-b", "classic-a"];
  if (!src || !known.includes(key)) return <Hero {...p} />;

  const eyebrowCls = family === "classic"
    ? "ds-smallcaps text-sm text-[hsl(var(--ds-hero-accent))]"
    : family === "modern"
      ? "text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-hero-accent))]"
      : "font-semibold text-[hsl(var(--ds-hero-accent))]";
  const eyebrow = p.eyebrow ? <p className={eyebrowCls}>{p.eyebrow}</p> : null;

  if (key === "modern-a") {
    return (
      <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-12`}>
          <div>
            {eyebrow}
            <h1 className="ds-display mt-3 text-4xl leading-[1.05] sm:text-5xl">{p.title}</h1>
            {p.lead && <p className="mt-4 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
          <div className="min-w-0">
            <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="3 / 2" sizes="(min-width: 1152px) 540px, (min-width: 1024px) 46vw, 100vw"
              className="rounded-[var(--ds-radius)] shadow-2xl ring-1 ring-[hsl(var(--ds-hero-soft)/0.2)]" />
            {p.aside && (
              <div className="relative mx-3 -mt-12 rounded-[var(--ds-radius)] bg-[hsl(var(--ds-surface))] p-5 text-[hsl(var(--ds-ink))] shadow-xl sm:mx-8 sm:p-6">
                {p.aside}
              </div>
            )}
          </div>
        </div>
        {!!p.facts?.length && <StatBar facts={p.facts} />}
      </header>
    );
  }

  if (key === "modern-b") {
    return (
      <header className="relative isolate overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className="relative lg:absolute lg:inset-0 lg:-z-10 xl:left-[40%]">
          <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="16 / 9" sizes="(min-width: 1280px) 60vw, 100vw" className="lg:!aspect-auto lg:h-full" />
          {/* Phone: the band fades into the ground under it. Desktop: the wash. */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[hsl(var(--ds-hero-bg))] to-transparent lg:hidden" />
          <span aria-hidden="true" className="absolute inset-0 hidden lg:block xl:hidden" style={{ background: MODERN_B_WASH }} />
          <span aria-hidden="true" className="absolute inset-0 hidden xl:block" style={{ background: MODERN_B_WASH_XL }} />
        </div>
        <div className={`${wrap} pb-12 pt-6 sm:pb-16 lg:py-28`}>
          <div className="max-w-2xl">
            {eyebrow}
            <h1 className="ds-display mt-3 text-4xl leading-[1.05] sm:text-6xl">{p.title}</h1>
            {p.lead && <p className="mt-5 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
        </div>
        {p.aside && <div className="border-t border-[hsl(var(--ds-hero-soft)/0.3)] bg-[hsl(var(--ds-hero-bg)/0.95)]"><div className={`${wrap} py-4`}>{p.aside}</div></div>}
      </header>
    );
  }

  if (key === "warm-a") {
    return (
      <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-8 pb-16 pt-10 sm:pb-20 sm:pt-14 md:grid-cols-[7fr_5fr] md:items-center md:gap-10`}>
          <div>
            {eyebrow}
            <h1 className="ds-display mt-2 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
            {p.lead && <p className="mt-4 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            {!!p.facts?.length && <ul className="mt-5 flex flex-wrap gap-2 text-sm">{p.facts.map((f) => <li key={f} className="rounded-full bg-[hsl(var(--ds-hero-ink)/0.12)] px-3 py-1">{f}</li>)}</ul>}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
          <div className="overflow-hidden rounded-[calc(var(--ds-radius)+16px)] border-4 border-[hsl(var(--ds-rule))] shadow-lg">
            <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="4 / 3" sizes="(min-width: 1152px) 460px, (min-width: 768px) 40vw, 100vw" />
          </div>
        </div>
        {p.aside && <div className={`${wrap} relative -mb-12 pb-0`}><div className="ds-card relative z-10 p-5 text-[hsl(var(--ds-ink))]">{p.aside}</div></div>}
      </header>
    );
  }

  if (key === "warm-b") {
    return (
      <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-10 py-12 sm:py-16 md:grid-cols-2 md:items-center`}>
          <div>
            {eyebrow}
            <h1 className="ds-display mt-3 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
            {p.lead && <p className="mt-4 max-w-lg text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
          <div className="relative mx-auto w-full max-w-[20rem] md:max-w-sm">
            <div className="overflow-hidden rounded-t-full border-4 border-[hsl(var(--ds-rule))]">
              <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="4 / 5" sizes="(min-width: 768px) 384px, 320px" />
            </div>
            {p.sticker && <span className="absolute -bottom-4 -left-4 flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--ds-cta))] p-3 text-center text-sm font-bold leading-tight text-[hsl(var(--ds-on-cta))]">{p.sticker}</span>}
          </div>
        </div>
        {p.aside && <div className={`${wrap} pb-10`}>{p.aside}</div>}
      </header>
    );
  }

  /* classic-a */
  return (
    <header className="border-b border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
      <div className={`${wrap} pb-8 pt-10 text-center sm:pb-10 sm:pt-14`}>
        {eyebrow}
        <h1 className="ds-display mx-auto mt-3 max-w-[22ch] text-4xl leading-tight sm:text-6xl">{p.title}</h1>
        {p.lead && <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
        {!!p.facts?.length && (
          <p className="ds-smallcaps mx-auto mt-6 max-w-3xl border-y border-[hsl(var(--ds-rule))] py-2 text-sm">{p.facts.join("  ·  ")}</p>
        )}
        <Actions primary={p.primary} secondary={p.secondary} center />
      </div>
      <div className={`${wrap} pb-10`}>
        <div className="border border-[hsl(var(--ds-rule))] bg-[hsl(var(--ds-surface))] p-1.5 sm:p-2">
          <DemoPhoto src={src} alt={p.photo?.alt} priority ratio="21 / 9" sizes="(min-width: 1152px) 1100px, 100vw" className="max-sm:!aspect-[3/2]" />
        </div>
      </div>
      {p.aside && <div className={`${wrap} pb-10`}>{p.aside}</div>}
    </header>
  );
}

