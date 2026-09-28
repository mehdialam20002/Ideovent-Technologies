/**
 * WHY PATIENTS TRUST THE CLINIC: the journey (luxury hairline numerals, calm
 * teal band, clinical cards), sterilisation, technology by benefit, the
 * before-after placeholders and the reviews (luxury one-at-a-time quote,
 * others a Google summary card and three cards). Every sample block carries
 * its SampleNote. Photos come from the record: a photo whose category
 * matches, else a technology item's image.
 */

import { CasePlaceholder } from "../parts-b/support/cases";
import type { DemoPhoto as DemoPhotoT, DemoSite, DentalIcon } from "@/lib/cms/types";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { bi, tr, trf, withText } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { CaseGallery, DentalGlyph, dentalOf } from "@/lib/demo/ui/dental";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { H } from "./copy";
import { Accent, HSection, MoreLink } from "./ui";

/** A photo from site.photos whose English category matches. */
export function photoBy(site: DemoSite, re: RegExp): DemoPhotoT | undefined {
  return (site.photos || []).find((p) => p.src && re.test(`${p.category || ""} ${p.caption || ""}`));
}

/* ── Journey ───────────────────────────────────────────────────────────── */

export function JourneySection() {
  const { site, lang, family } = useSite();
  const steps = withText(dentalOf(site).journey, "title");
  if (steps.length < 2) return null;
  if (family === "luxury") {
    return (
      <HSection eyebrow={H.smileJourneyEyebrow} title={H.smileJourneyTitle} align="center">
        <ol className="relative mx-auto grid max-w-5xl gap-10 md:gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(steps.length, 5)}, minmax(0, 1fr))` }}>
          <span aria-hidden="true" className="dn-journey-line hidden md:block" style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }} />
          {steps.map((s, i) => (
            <li key={i} className="relative flex flex-col items-center text-center max-md:col-span-full max-md:flex-row max-md:items-start max-md:gap-5 max-md:text-left">
              <span className="relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--ds-rule))] bg-[hsl(var(--ds-bg))] text-2xl text-[hsl(var(--ds-hero-accent))] [font-family:var(--ds-display)]">{i + 1}</span>
              <div className="md:mt-6">
                <h3 className="dn-h3 !text-xl">{bi(s, "title", lang)}</h3>
                {bi(s, "body", lang) && <p className="mt-2 text-[15px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(s, "body", lang)}</p>}
              </div>
            </li>
          ))}
        </ol>
      </HSection>
    );
  }
  const band = family === "calm";
  return (
    <HSection eyebrow={H.journeyEyebrow} title={H.journeyTitle} tone={band ? "band" : "plain"}>
      <ol className={`grid gap-6 sm:grid-cols-2 ${steps.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {steps.map((s, i) => (
          <li key={i} className={band ? "border-t border-white/25 pt-6" : "dn-tile p-6"}>
            <span className={`text-4xl leading-none [font-family:var(--ds-display)] ${band ? "font-light text-[hsl(var(--ds-hero-accent))]" : "font-semibold text-[hsl(var(--ds-cta))]"}`}>{String(i + 1).padStart(2, "0")}</span>
            <h3 className="dn-h3 mt-4 !text-lg">{bi(s, "title", lang)}</h3>
            {bi(s, "body", lang) && <p className={`mt-2 text-[15px] leading-relaxed ${band ? "dn-soft" : "text-[hsl(var(--ds-ink-soft))]"}`}>{bi(s, "body", lang)}</p>}
          </li>
        ))}
      </ol>
    </HSection>
  );
}

/* ── Sterilisation ─────────────────────────────────────────────────────── */

const STEP_ICONS: DentalIcon[] = ["cleaning", "shield", "sterile", "checkup", "heart"];

export function SterilisationSection() {
  const { site, lang, family } = useSite();
  const steps = withText(dentalOf(site).sterilisation, "title");
  if (!steps.length) return null;
  const band = family === "clinical";
  const photo = photoBy(site, /steril/i);
  return (
    <HSection tone={band ? "band" : "tint"}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <p className="dn-eyebrow">{tr(H.sterileEyebrow, lang)}</p>
          <h2 className="dn-h2 mt-3"><Accent text={tr(H.sterileTitle, lang)} /></h2>
          <p className={`mt-4 max-w-[48ch] text-[1.0625rem] leading-relaxed ${band ? "dn-soft" : "text-[hsl(var(--ds-ink-soft))]"}`}>{tr(H.sterileLead, lang)}</p>
          {photo && <DemoPhoto src={photo.src} alt={bi(photo, "caption", lang)} ratio="3 / 2" sizes="(min-width: 1024px) 440px, 100vw" className="mt-8 hidden rounded-[var(--ds-radius)] sm:block" />}
        </div>
        <ol className="grid gap-5 sm:grid-cols-2 lg:col-span-7 lg:self-center">
          {steps.map((s, i) => (
            <li key={i} className={`rounded-[var(--ds-radius)] p-6 ${band ? "border border-white/15 bg-white/[0.06]" : "dn-tile"}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${band ? "bg-[#5EEAD4]/15 text-[#5EEAD4]" : "bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]"}`}>
                  <DentalGlyph name={STEP_ICONS[i % STEP_ICONS.length]} className="h-5 w-5" />
                </span>
                <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${band ? "dn-soft" : "text-[hsl(var(--ds-ink-soft))]"}`}>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="dn-h3 mt-4 !text-lg">{bi(s, "title", lang)}</h3>
              {bi(s, "body", lang) && <p className={`mt-2 text-[15px] leading-relaxed ${band ? "dn-soft" : "text-[hsl(var(--ds-ink-soft))]"}`}>{bi(s, "body", lang)}</p>}
            </li>
          ))}
        </ol>
      </div>
    </HSection>
  );
}

/* ── Technology by benefit ─────────────────────────────────────────────── */

export function TechSection({ max = 6 }: { max?: number }) {
  const { site, lang, family } = useSite();
  const items = withText(dentalOf(site).technology, "title").slice(0, max);
  if (items.length < 2) return null;
  const img = items.find((t) => t.image)?.image || photoBy(site, /diagnos|technolog|x-ray|scan/i)?.src;
  if (family === "luxury") {
    return (
      <HSection eyebrow={H.techEyebrow} title={H.techTitle} more={{ to: "technology", label: H.techAll }}>
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <li key={i} className="border-t border-[hsl(var(--ds-rule))] pt-6">
              <DentalGlyph name={t.icon} className="h-7 w-7 text-[hsl(var(--ds-accent))]" />
              <h3 className="dn-h3 mt-4 !text-xl">{bi(t, "title", lang)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(t, "benefit", lang)}</p>
            </li>
          ))}
        </ul>
      </HSection>
    );
  }
  const dark = family === "calm";
  const list = items.slice(0, 4);
  return (
    <HSection tone={dark ? "band" : "plain"}>
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        {img && (
          <div className="lg:col-span-6">
            <DemoPhoto src={img} ratio="3 / 2" sizes="(min-width: 1024px) 560px, 100vw" decorative className="rounded-[var(--ds-radius)]" />
          </div>
        )}
        <div className={img ? "lg:col-span-6" : "lg:col-span-12"}>
          <p className="dn-eyebrow">{tr(H.techEyebrow, lang)}</p>
          <h2 className="dn-h2 mt-3"><Accent text={tr(H.techTitle, lang)} /></h2>
          <ul className="mt-8 space-y-6">
            {list.map((t, i) => (
              <li key={i} className="flex gap-4">
                <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-full " + (dark ? "bg-white/10 text-[hsl(var(--ds-hero-accent))]" : "bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]")}>
                  <DentalGlyph name={t.icon} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{bi(t, "title", lang)}</h3>
                  <p className={"mt-1 text-[15px] leading-relaxed " + (dark ? "dn-soft" : "text-[hsl(var(--ds-ink-soft))]")}>{bi(t, "benefit", lang)}</p>
                </div>
              </li>
            ))}
          </ul>
          <MoreLink to="technology" label={H.techAll} className={"mt-6 " + (dark ? "!text-[hsl(var(--ds-hero-accent))]" : "")} />
        </div>
      </div>
    </HSection>
  );
}

/* ── Before and after (illustrative placeholders on a template) ────────── */

export function CasesSection({ tone = "plain" }: { tone?: "plain" | "tint" }) {
  const { site } = useSite();
  if (!withText(dentalOf(site).cases, "title").length) return null;
  return (
    <HSection eyebrow={H.casesEyebrow} title={H.casesTitle} tone={tone} more={{ to: "before-after", label: H.casesAll }}>
      <CaseGallery limit={3} Tile={CasePlaceholder} />
    </HSection>
  );
}

/* ── Reviews ───────────────────────────────────────────────────────────── */

export function useReviews() {
  const { site } = useSite();
  return (site.reviews || []).filter((r) => r.consent && r.quote);
}

/** Five stars filled to `n` (a fraction fills part of a star: 4.7 fills 94%). */
export function Stars({ n, className = "h-4 w-4" }: { n: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, ((Number.isFinite(n) ? n : 5) / 5) * 100));
  const row = (fill: boolean) => (
    <span className="flex w-max gap-0.5">
      {Array.from({ length: 5 }, (_, i) => <Star key={i} className={className + " shrink-0 " + (fill ? "fill-[hsl(var(--ds-rule))] text-[hsl(var(--ds-rule))]" : "text-[hsl(var(--ds-line))]")} aria-hidden="true" />)}
    </span>
  );
  return (
    <span className="relative inline-block" role="img" aria-label={n + " / 5"}>
      {row(false)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: pct + "%" }}>{row(true)}</span>
    </span>
  );
}

/** Luxury: one large serif quote at a time; arrows and dots; 7s advance with full motion, paused on hover and focus. */
function ReviewCarousel() {
  const { lang, motion } = useSite();
  const list = useReviews().slice(0, 6);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (motion !== "full" || paused || list.length < 2) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % list.length), 7000);
    return () => window.clearTimeout(t);
  }, [i, paused, motion, list.length]);
  const r = list[i];
  if (!r) return null;
  const go = (d: number) => setI((x) => (x + d + list.length) % list.length);
  return (
    <div className="mx-auto max-w-3xl text-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <figure key={i} className={motion === "none" ? "" : "dn-quote-in"}>
        <div className="flex justify-center"><Stars n={Math.round(Number(r.rating) || 5)} /></div>
        <blockquote className="mt-6 text-[clamp(1.375rem,1.1rem+1.2vw,2rem)] leading-snug [font-family:var(--ds-display)]">"{bi(r, "quote", lang)}"</blockquote>
        <figcaption className="mt-6 text-sm text-[hsl(var(--ds-ink-soft))]">{[bi(r, "relation", lang), bi(r, "source", lang), bi(r, "date", lang)].filter(Boolean).join(" · ")}</figcaption>
      </figure>
      {list.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button type="button" onClick={() => go(-1)} aria-label={tr(H.prev, lang)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--ds-rule))] hover:bg-[hsl(var(--ds-surface))]"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
          <div className="flex">
            {list.map((_, j) => (
              <button key={j} type="button" onClick={() => setI(j)} aria-label={trf(H.reviewN, lang, { n: String(j + 1) })} aria-current={j === i ? "true" : undefined}
                className="flex h-11 w-6 items-center justify-center"><span className={"block h-1.5 rounded-full transition-all " + (j === i ? "w-5 bg-[hsl(var(--ds-accent))]" : "w-1.5 bg-[hsl(var(--ds-rule))]")} /></button>
            ))}
          </div>
          <button type="button" onClick={() => go(1)} aria-label={tr(H.next, lang)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--ds-rule))] hover:bg-[hsl(var(--ds-surface))]"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}

export function ReviewsSection({ tone = "tint", parents = false }: { tone?: "plain" | "tint"; parents?: boolean }) {
  const { site, lang, family } = useSite();
  const list = useReviews();
  if (!list.length) return null;
  const r = site.rating;
  const title = parents ? H.parentReviewsTitle : H.reviewsTitle;
  if (family === "luxury") {
    return (
      <HSection eyebrow={H.reviewsEyebrow} title={title} tone={tone} align="center" more={{ to: "reviews", label: H.reviewsAll }}>
        <ReviewCarousel />
        <SampleNote block="reviews" className="mt-8 justify-center" />
      </HSection>
    );
  }
  return (
    <HSection eyebrow={H.reviewsEyebrow} title={title} tone={tone} more={{ to: "reviews", label: H.reviewsAll }}>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {r?.value && (
          <div className="dn-tile flex flex-col p-6">
            <p className="text-5xl font-semibold leading-none tracking-[-0.02em] [font-family:var(--ds-display)]">{r.value}</p>
            <div className="mt-3"><Stars n={Number(r.value)} /></div>
            {r.count && <p className="mt-3 text-sm font-semibold">{trf(H.fromReviews, lang, { count: r.count })}</p>}
            {bi(r, "source", lang) && <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(r, "source", lang)}</p>}
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-auto pt-6 text-sm font-semibold text-[hsl(var(--ds-accent))] underline underline-offset-4">{tr(H.openListing, lang)}</a>}
          </div>
        )}
        {list.slice(0, r?.value ? 3 : 4).map((x, i) => (
          <figure key={i} className="dn-tile flex flex-col p-6">
            <Stars n={Math.round(Number(x.rating) || 5)} className="h-3.5 w-3.5" />
            <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed">"{bi(x, "quote", lang)}"</blockquote>
            <figcaption className="mt-5 border-t border-[hsl(var(--ds-line))] pt-4 text-[13px] text-[hsl(var(--ds-ink-soft))]">
              <span className="block font-semibold text-[hsl(var(--ds-ink))]">{bi(x, "relation", lang)}</span>
              {[bi(x, "source", lang), bi(x, "date", lang)].filter(Boolean).join(" · ")}
            </figcaption>
          </figure>
        ))}
      </div>
      <SampleNote block="reviews" className="mt-6" />
    </HSection>
  );
}
