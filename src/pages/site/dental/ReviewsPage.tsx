/**
 * ReviewsPage: /reviews. The rating panel (with the trust figures and their
 * SampleNote), filters by treatment and, on a chain, by clinic, the reviews
 * in a calm masonry with source and date on every card, the SampleNote
 * "reviews" line above them, how reviews appear, and the link to write one.
 * Only consented reviews show (the page's own gate counts the same).
 * Spec: DENTAL-IA.md s3 reviews; DENTAL-COMPLIANCE.md s3 reviews.
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { useState } from "react";
import { PenLine } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, hasBi, tr, withText } from "@/lib/demo/site/bilingual";
import { branchSlug, treatmentSlug } from "@/lib/demo/site/context";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { BookingBand, DISCLAIMER, DPageHead, dentalOf, wrap } from "@/lib/demo/ui/dental";
import { PB } from "./parts-b/support/copy";
import { RatingPanel, ReviewItem } from "./parts-b/support/reviews";
import { crumbsFor, FilterChips } from "./parts-b/support/ui";

export default function ReviewsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const d = dentalOf(site);
  const all = (site.reviews || []).filter((r) => r.consent && hasBi(r, "quote"));
  const treatments = withText(d.treatments, "name");
  const branches = withText(d.branches, "name");
  const [cat, setCat] = useState("");
  const [branch, setBranch] = useState("");

  const catLabel = (v: string) => {
    const t = treatments.find((x) => treatmentSlug(x) === v);
    return t ? bi(t, "name", lang) : bi(all.find((r) => r.category === v), "category", lang) || v;
  };
  const branchLabel = (v: string) => bi(branches.find((b) => branchSlug(b) === v), "name", lang) || v;
  const cats = [...new Set(all.map((r) => (r.category || "").trim()).filter(Boolean))];
  const brs = branches.length > 1 ? [...new Set(all.map((r) => (r.branch || "").trim()).filter(Boolean))] : [];
  const list = all.filter((r) => (!cat || r.category === cat) && (!branch || r.branch === branch));
  const url = site.rating?.url;

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={tr(PB.revTitle, lang)} lead={tr(PB.revLead, lang)}
        crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })} />

      <section className="py-12 sm:py-16">
        <div className={wrap}>
          <RatingPanel />

          <div className="mt-12 flex flex-col gap-4 sm:mt-16">
            <FilterChips label={tr(PB.filterBy, lang)} values={cats} value={cat} onChange={setCat} labelOf={catLabel} allLabel={tr(PB.all, lang)} />
            <FilterChips label={tr(PB.filterBranch, lang)} values={brs} value={branch} onChange={setBranch} labelOf={branchLabel} allLabel={tr(PB.all, lang)} />
            <SampleNote block="reviews" />
          </div>

          <div className="mt-6 columns-1 gap-5 md:columns-2 lg:columns-3" aria-live="polite">
            {list.map((r, i) => <ReviewItem key={`${cat}-${branch}-${i}`} review={r} tag={r.category && !cat ? catLabel(r.category) : undefined} />)}
          </div>
          {!list.length && <p className="mt-6 text-[hsl(var(--ds-ink-soft))]">{tr(PB.noMatch, lang)}</p>}

          <div className="mt-10 grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] p-6">
              <p className="font-semibold">{tr(PB.policyTitle, lang)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(PB.policyBody, lang)}</p>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.results, lang)}</p>
            </div>
            {url && (
              <div className="rounded-[var(--ds-radius)] bg-[hsl(var(--ds-surface-2))] p-6">
                <p className="font-semibold">{tr(PB.shareTitle, lang)}</p>
                <p className="mt-1.5 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB.shareBody, lang)}</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
                  <PenLine className="h-4 w-4" aria-hidden="true" />{tr(PB.shareCta, lang)}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <BookingBand />
    </>
  );
}
