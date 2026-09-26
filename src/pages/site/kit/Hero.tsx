/**
 * THE HOME HERO AND THE SUBPAGE HEAD, owned by the FAMILY and its variant.
 *
 * A page passes CONTENT (title, lead, actions, facts, a data object, a
 * photo); this file decides the SHAPE. Six first screens:
 *
 *   classic a  masthead: centred name, one ruled line of facts, a 21:9
 *              letterbox photo or an engraved-monogram panel
 *   classic b  title page: the name at a 20ch measure beside a tall portrait
 *              photo, facts as hairline rows
 *   modern a   split: headline and actions left, the data object as a solid
 *              card right, facts as a stat bar on the bottom edge
 *   modern b   full bleed: statement headline on the hero ground (or photo),
 *              the data object as a strip pinned to the bottom edge
 *   warm a     stacked: own colour full bleed, greeting, thumb-size actions,
 *              the data object as a card overlapping the next section by 48px
 *   warm b     arched window: photo in an arch-topped frame on the page
 *              ground, a round sticker
 *
 * No slider, no autoplay, no text over a moving image.
 */

import type { ReactNode } from "react";
import { useSite } from "@/lib/demo/site/context";
import { Breadcrumb, Monogram, Photo } from "./Text";

export interface HeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  /** Short facts: the ruled line (classic), the stat bar (modern a), chips (warm). */
  facts?: string[];
  /** The data object: admissions card, next batches, next exams, a notice. */
  aside?: ReactNode;
  photo?: { src?: string; alt: string };
  /** Warm b only: "Ages 1.5 to 6". */
  sticker?: string;
}

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

function Actions({ primary, secondary }: Pick<HeroProps, "primary" | "secondary">) {
  if (!primary && !secondary) return null;
  return <div className="mt-7 flex flex-wrap gap-3">{primary}{secondary}</div>;
}

export function Hero(p: HeroProps) {
  const { family, variant } = useSite();
  const key = `${family}-${variant}`;
  const photo = p.photo?.src ? p.photo : undefined;

  if (key === "classic-a") {
    return (
      <header className="border-b border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} pb-10 pt-12 text-center sm:pt-16`}>
          {!photo && <Monogram className="mx-auto mb-6" />}
          {p.eyebrow && <p className="ds-smallcaps text-sm text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
          <h1 className="ds-display mx-auto mt-3 max-w-[22ch] text-4xl leading-tight sm:text-6xl">{p.title}</h1>
          {p.lead && <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
          {!!p.facts?.length && (
            <p className="ds-smallcaps mx-auto mt-6 max-w-3xl border-y border-[hsl(var(--ds-rule))] py-2 text-sm">
              {p.facts.join("  ·  ")}
            </p>
          )}
          <div className="flex justify-center"><Actions primary={p.primary} secondary={p.secondary} /></div>
        </div>
        {photo && <Photo src={photo.src} alt={photo.alt} ratio="21 / 9" priority className="mx-auto max-w-6xl" />}
        {p.aside && <div className={`${wrap} pb-10 ${photo ? "pt-8" : ""}`}>{p.aside}</div>}
      </header>
    );
  }

  if (key === "classic-b") {
    return (
      <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-10 py-12 sm:py-16 md:grid-cols-[3fr_2fr] md:items-end`}>
          <div>
            {p.eyebrow && <p className="ds-smallcaps text-sm text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
            <h1 className="ds-display mt-3 max-w-[20ch] text-4xl leading-[1.05] sm:text-6xl">{p.title}</h1>
            {p.lead && <p className="mt-5 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            {!!p.facts?.length && (
              <dl className="mt-6 max-w-xl divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))] text-sm">
                {p.facts.map((f) => <div key={f} className="py-2">{f}</div>)}
              </dl>
            )}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
          <div>{photo ? <Photo src={photo.src} alt={photo.alt} ratio="3 / 4" priority /> : p.aside || <Monogram className="h-40 w-40 text-5xl" />}</div>
        </div>
        {photo && p.aside && <div className={`${wrap} pb-10`}>{p.aside}</div>}
      </header>
    );
  }

  if (key === "modern-a") {
    return (
      <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-8 py-12 sm:py-16 lg:grid-cols-[55fr_45fr] lg:items-center`}>
          <div>
            {p.eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
            <h1 className="ds-display mt-3 text-4xl leading-[1.05] sm:text-5xl">{p.title}</h1>
            {p.lead && <p className="mt-4 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
          {p.aside && <div className="rounded-[var(--ds-radius)] bg-[hsl(var(--ds-surface))] p-5 text-[hsl(var(--ds-ink))] shadow-xl sm:p-6">{p.aside}</div>}
        </div>
        {!!p.facts?.length && (
          <div className="border-t border-[hsl(var(--ds-hero-soft)/0.25)]">
            <ul className={`${wrap} grid grid-cols-2 gap-px py-4 text-sm sm:grid-cols-4`}>
              {p.facts.map((f) => {
                /* "1,260 pupils" -> the figure set large above its label. */
                const m = /^([\d₹$£][\d,.%+]*)\s+(.+)$/.exec(f);
                return (
                  <li key={f} className="ds-num py-1 text-[hsl(var(--ds-hero-soft))]">
                    {m ? <><span className="ds-display block text-2xl text-[hsl(var(--ds-hero-ink))] sm:text-3xl">{m[1]}</span>{m[2]}</> : f}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </header>
    );
  }

  if (key === "modern-b") {
    return (
      <header className="relative isolate overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        {photo && (
          <div className="absolute inset-0 -z-10">
            <Photo src={photo.src} alt={photo.alt} ratio="auto" priority className="h-full" />
            <div className="absolute inset-0 bg-[hsl(var(--ds-hero-bg)/0.72)]" />
          </div>
        )}
        <div className={`${wrap} py-16 sm:py-24`}>
          {p.eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
          <h1 className="ds-display mt-3 max-w-3xl text-4xl leading-[1.05] sm:text-6xl">{p.title}</h1>
          {p.lead && <p className="mt-5 max-w-2xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
          <Actions primary={p.primary} secondary={p.secondary} />
        </div>
        {p.aside && <div className="border-t border-[hsl(var(--ds-hero-soft)/0.3)] bg-[hsl(var(--ds-hero-bg)/0.9)]"><div className={`${wrap} py-4`}>{p.aside}</div></div>}
      </header>
    );
  }

  if (key === "warm-b") {
    return (
      <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-10 py-12 sm:py-16 md:grid-cols-2 md:items-center`}>
          <div>
            {p.eyebrow && <p className="font-semibold text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
            <h1 className="ds-display mt-3 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
            {p.lead && <p className="mt-4 max-w-lg text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
            <Actions primary={p.primary} secondary={p.secondary} />
          </div>
          {/* Without a photo the window is a smaller, squarer arch on a phone,
              so an empty frame never takes the reader's whole first screen. */}
          <div className={`relative mx-auto w-full ${photo ? "max-w-sm" : "max-w-[15rem] md:max-w-sm"}`}>
            <div className="overflow-hidden rounded-t-full border-4 border-[hsl(var(--ds-rule))]">
              {photo ? <Photo src={photo.src} alt={photo.alt} ratio="4 / 5" priority /> : <div className="flex aspect-square items-center justify-center bg-[hsl(var(--ds-surface-2))] md:aspect-[4/5]"><Monogram /></div>}
            </div>
            {p.sticker && <span className="absolute -bottom-4 -left-4 flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--ds-cta))] p-3 text-center text-sm font-bold leading-tight text-[hsl(var(--ds-on-cta))]">{p.sticker}</span>}
          </div>
        </div>
        {p.aside && <div className={`${wrap} pb-10`}>{p.aside}</div>}
      </header>
    );
  }

  /* warm-a, and the fallback for any family and variant not listed. */
  return (
    <header className="bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
      <div className={`${wrap} pb-16 pt-10 sm:pb-20 sm:pt-14`}>
        {p.eyebrow && <p className="font-semibold text-[hsl(var(--ds-hero-accent))]">{p.eyebrow}</p>}
        <h1 className="ds-display mt-2 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
        {p.lead && <p className="mt-4 max-w-xl text-lg text-[hsl(var(--ds-hero-soft))]">{p.lead}</p>}
        {!!p.facts?.length && <ul className="mt-5 flex flex-wrap gap-2 text-sm">{p.facts.map((f) => <li key={f} className="rounded-full bg-[hsl(var(--ds-hero-ink)/0.12)] px-3 py-1">{f}</li>)}</ul>}
        <Actions primary={p.primary} secondary={p.secondary} />
      </div>
      {p.aside && <div className={`${wrap} relative -mb-12 pb-0`}><div className="ds-card relative z-10 p-5 text-[hsl(var(--ds-ink))]">{p.aside}</div></div>}
    </header>
  );
}

/** The head of every subpage: the family's small version of its hero. */
export function PageHead({ eyebrow, title, lead, crumbs, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: { label: string; href?: string | null }[];
  children?: ReactNode;
}) {
  const { family } = useSite();
  if (family === "classic") {
    return (
      <header className={`${wrap} border-b border-[hsl(var(--ds-line))] pb-8 pt-10 text-center`}>
        {crumbs && <div className="flex justify-center"><Breadcrumb items={crumbs} /></div>}
        {eyebrow && <p className="ds-smallcaps mt-6 text-sm text-[hsl(var(--ds-accent))]">{eyebrow}</p>}
        <h1 className="ds-display mx-auto mt-2 max-w-[24ch] text-4xl sm:text-5xl">{title}</h1>
        {lead && <p className="mx-auto mt-3 max-w-2xl text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
        {children}
      </header>
    );
  }
  if (family === "modern") {
    return (
      <header className="bg-[hsl(var(--ds-surface-2))]">
        <div className={`${wrap} py-10 sm:py-12`}>
          {crumbs && <Breadcrumb items={crumbs} />}
          {eyebrow && <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{eyebrow}</p>}
          <h1 className="ds-display mt-2 max-w-3xl text-3xl sm:text-5xl">{title}</h1>
          {lead && <p className="mt-3 max-w-2xl text-lg text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
          {children}
        </div>
      </header>
    );
  }
  return (
    <header className="px-4 pt-4 sm:px-6">
      {/* The band is dark, so a "Sample figures" line placed in it takes the
          band's own ink instead of the page's soft ink (src/pages/site/kit/SampleNote.tsx). */}
      <div className="mx-auto max-w-6xl rounded-[calc(var(--ds-radius)+8px)] bg-[hsl(var(--ds-brand))] px-5 py-10 text-[hsl(var(--ds-on-brand))] sm:px-10 [&_[data-sample-note]]:!text-inherit [&_[data-sample-note]]:opacity-90">
        {crumbs && <div className="opacity-90 [&_*]:!text-inherit"><Breadcrumb items={crumbs} /></div>}
        {eyebrow && <p className="mt-5 font-semibold">{eyebrow}</p>}
        <h1 className="ds-display mt-2 text-3xl sm:text-5xl">{title}</h1>
        {lead && <p className="mt-3 max-w-2xl text-lg">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
