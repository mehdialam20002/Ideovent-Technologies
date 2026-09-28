/**
 * The Kids page's first screen (28 Sep 2026). Split: parent-first copy and
 * the booking actions on the left; on the right a parent-and-child photo in
 * the arch mask (radius 999px 999px R R, DENTAL-DESIGN.md s6) on a soft blob
 * with three small drawn shapes (sun, star, smiling tooth). The shapes are
 * still: no loop, nothing for reduced motion to stop. The photo is the only
 * priority image; no child in a chair close-up.
 */

import { bi, tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { BOOKING_COPY, BookButton, WhatsAppButton, dentalOf, wrap } from "@/lib/demo/ui/dental";
import { Accent } from "../../parts-a/treatments/ui";
import { KIDS_COPY } from "./copy";

const PHOTO = "dental/kids-colourful-room";

export function KidsHero() {
  const { site, lang, family } = useSite();
  const k = dentalOf(site).kids;
  const dark = family === "calm";
  return (
    <section className="relative overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
      <div className={`${wrap} grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-14 lg:py-20`}>
        <div className="min-w-0 lg:col-span-6">
          <p className={`inline-flex rounded-full border px-3 py-1 text-[13px] font-semibold ${dark ? "border-white/30 text-[hsl(var(--ds-hero-soft))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-[hsl(var(--ds-accent))]"}`}>
            {tr(KIDS_COPY.eyebrow, lang)}
          </p>
          <h1 className="mt-4 max-w-[16ch] text-[clamp(2.3rem,1.5rem+3.4vw,4rem)] leading-[1.05] tracking-[-0.02em] [font-family:var(--ds-display)]">
            <Accent text={tr(KIDS_COPY.title, lang)} />
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-[hsl(var(--ds-hero-soft))]">{bi(k, "intro", lang) || tr(KIDS_COPY.lead, lang)}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <BookButton size="lg" tone={dark ? "hero" : "cta"} preset={{ reason: "kids" }}>{tr(KIDS_COPY.book, lang)}</BookButton>
            <WhatsAppButton size="lg" variant="outline" className={dark ? "!border-[hsl(var(--ds-hero-ink)/0.5)] !text-[hsl(var(--ds-hero-ink))]" : ""} />
          </div>
          <p className="mt-4 text-sm text-[hsl(var(--ds-hero-soft))]">{tr(BOOKING_COPY.child, lang)}</p>
        </div>
        <div className="relative mx-auto w-full max-w-[26rem] lg:col-span-6 lg:max-w-[30rem]">
          <span aria-hidden="true" className="absolute inset-x-[-6%] bottom-[-4%] top-[8%] rounded-[45%_55%_50%_50%/55%_45%_55%_45%] bg-[hsl(var(--ds-surface-2))]" />
          <DemoPhoto src={PHOTO} priority ratio="4 / 5" sizes="(min-width: 1024px) 480px, (min-width: 640px) 416px, calc(100vw - 32px)"
            className="relative rounded-[999px_999px_var(--ds-radius)_var(--ds-radius)] shadow-[var(--dn-shadow-2)]" />
          <Shapes />
        </div>
      </div>
    </section>
  );
}

/** Sun, star and a smiling tooth, drawn in the theme's rule, accent and brand. */
function Shapes() {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute -left-2 top-6 h-12 w-12 text-[hsl(var(--ds-rule))] sm:-left-6">
        <circle cx="24" cy="24" r="9" fill="currentColor" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1={24 + Math.cos(a) * 14} y1={24 + Math.sin(a) * 14} x2={24 + Math.cos(a) * 20} y2={24 + Math.sin(a) * 20} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />;
        })}
      </svg>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute -right-1 top-[38%] h-9 w-9 text-[hsl(var(--ds-accent))] sm:-right-5">
        <path d="M12 2.5l2.7 6 6.5.6-4.9 4.3 1.5 6.4L12 16.5l-5.8 3.3 1.5-6.4-4.9-4.3 6.5-.6z" fill="currentColor" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute -bottom-3 left-[10%] h-14 w-14 text-[hsl(var(--ds-brand))]">
        <path d="M15 8c-5 0-8.5 3.8-8.5 9 0 4.2 1.5 7 2.8 9.7 1.3 2.8 1.7 6.1 2.3 9.7.6 4.2 1.9 7.4 4 7.4 2.5 0 3.2-3.4 4-7.2.6-3 1.7-5.5 4.4-5.5s3.8 2.5 4.4 5.5c.8 3.8 1.5 7.2 4 7.2 2.1 0 3.4-3.2 4-7.4.6-3.6 1-6.9 2.3-9.7 1.3-2.7 2.8-5.5 2.8-9.7 0-5.2-3.5-9-8.5-9-3.4 0-5.5 1.9-9 1.9S18.4 8 15 8z" fill="hsl(var(--ds-surface))" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="18" cy="20" r="1.8" fill="currentColor" /><circle cx="30" cy="20" r="1.8" fill="currentColor" />
        <path d="M18.5 26c3 3 8 3 11 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </>
  );
}
