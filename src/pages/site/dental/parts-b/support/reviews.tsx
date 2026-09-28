/**
 * REVIEWS PIECES: the rating panel (value, stars, count, source, the link to
 * the live listing, the trust figures and the SampleNote "stats" right under
 * them) and one review card (stars, quote, relation, source, date). Sample
 * figures never count up. CCPA endorsements: source and date always shown.
 */

import { ExternalLink, Quote, Star } from "lucide-react";
import type { DemoReview } from "@/lib/cms/types";
import { bi, biDate, tr, withText } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { PB } from "./copy";

/** Five stars filled to `value` (4.8 fills 96%). Decorative: the number is printed beside. */
export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (fill: boolean) => (
    <span className="flex w-max gap-0.5">
      {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`shrink-0 ${className} ${fill ? "fill-[hsl(var(--ds-rule))] text-[hsl(var(--ds-rule))]" : "text-[hsl(var(--ds-line))]"}`} aria-hidden="true" />)}
    </span>
  );
  return (
    <span className="relative inline-block" aria-hidden="true">
      {row(false)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>{row(true)}</span>
    </span>
  );
}

export function RatingPanel() {
  const { site, lang } = useSite();
  const r = site.rating;
  const stats = withText(site.stats, "label").slice(0, 4);
  const value = Number(String(r?.value || "").replace(",", "."));
  if (!r?.value && !stats.length) return null;
  return (
    <div className="dn-card grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-12">
      {r?.value && (
        <div className="md:border-r md:border-[hsl(var(--ds-line))] md:pr-12">
          <p className="flex items-baseline gap-2">
            <span className="text-6xl leading-none tabular-nums [font-family:var(--ds-display)]">{r.value}</span>
            <span className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB.outOf, lang)}</span>
          </p>
          {value > 0 && <div className="mt-3"><Stars value={value} className="h-5 w-5" /></div>}
          <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{[r.count && `${r.count} ${tr(PB.reviewsWord, lang)}`, bi(r, "source", lang)].filter(Boolean).join(", ")}</p>
          {r.url && (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
              {tr(PB.readAll, lang)}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
      <div className="min-w-0">
        {stats.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col-reverse">
                <dt className="mt-1 text-[13px] leading-snug text-[hsl(var(--ds-ink-soft))]">{bi(s, "label", lang)}</dt>
                <dd className="text-2xl font-semibold tabular-nums [font-family:var(--ds-display)]">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <SampleNote block="stats" className="mt-5" />
      </div>
    </div>
  );
}

export function ReviewItem({ review, tag }: { review: DemoReview; tag?: string }) {
  const { lang } = useSite();
  const n = Math.round(Number(review.rating) || 0);
  const meta = [bi(review, "source", lang), biDate(review, "date", lang)].filter(Boolean).join(", ");
  return (
    <figure className="dn-card relative mb-5 break-inside-avoid p-6 sm:p-7">
      <Quote className="absolute right-5 top-5 h-7 w-7 text-[hsl(var(--ds-surface-2))]" aria-hidden="true" strokeWidth={1.5} />
      {n > 0 && <p className="flex items-center gap-2"><Stars value={n} /><span className="sr-only">{n} / 5</span></p>}
      <blockquote className="mt-3 text-[15px] leading-relaxed text-[hsl(var(--ds-ink))]">{bi(review, "quote", lang)}</blockquote>
      <figcaption className="mt-5 border-t border-[hsl(var(--ds-line))] pt-4 text-sm">
        {bi(review, "relation", lang) && <span className="block font-semibold">{bi(review, "relation", lang)}</span>}
        {meta && <span className="block text-[hsl(var(--ds-ink-soft))]">{meta}</span>}
        {tag && <span className="mt-2 inline-block rounded-full bg-[hsl(var(--ds-surface-2))] px-2.5 py-1 text-xs font-medium">{tag}</span>}
      </figcaption>
    </figure>
  );
}
