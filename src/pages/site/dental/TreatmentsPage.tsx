/**
 * TreatmentsPage: /treatments. PAGES-A builder, 28 Sep 2026.
 * Spec: DENTAL-IA.md s6 (grouped by specialty or problem, each with a "from"
 * price), DENTAL-DESIGN.md (family tokens, cards), DENTAL-COMPLIANCE.md
 * (the fee note under any "Starting from*"). Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 *
 * Head with a "Not sure what you need?" card that opens booking at the
 * not-sure reason; filter chips by group (no page reload, no sideways page
 * scroll: the chip row scrolls inside itself); the featured treatments as
 * large photo cards; then each group as an editorial row, its name and count
 * on the left and the cards on the right. The fee note closes the list.
 */

import { useState, type ReactNode } from "react";
import { ArrowRight, HelpCircle } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { treatmentSlug } from "@/lib/demo/site/context";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { BookButton, DISCLAIMER, Disclaimer, TreatmentCard, treatmentGroups, wrap } from "@/lib/demo/ui/dental";
import { Reveal, SiteLink } from "@/pages/site/kit/motion";
import { TX_COPY } from "./parts-a/treatments/copy";
import { ClosingBand } from "./parts-a/treatments/ClosingBand";
import { Accent } from "./parts-a/treatments/ui";

export default function TreatmentsPage({ site, ctx }: SitePageProps) {
  const { lang, family, motion } = ctx;
  const groups = treatmentGroups(site);
  const all = groups.flatMap((g) => g.items);
  const [cat, setCat] = useState<string | null>(null);
  const shown = cat === null ? groups : groups.filter((g) => g.category === cat);
  const featured = cat === null ? all.filter((t) => t.featured && t.image).slice(0, 3) : [];
  const named = groups.filter((g) => g.category);
  const anyPrice = all.some((t) => t.fromPrice);
  const fees = ctx.href("fees");
  const dark = family === "calm";
  const count = (n: number) => (n === 1 ? tr(TX_COPY.countOne, lang) : trf(TX_COPY.count, lang, { n: String(n) }));
  const rv = (key: string, i: number, node: ReactNode) => (motion === "none" ? <div key={key} className="h-full">{node}</div> : <Reveal key={key} index={i} className="h-full">{node}</Reveal>);
  const chip = (on: boolean) => `inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${on
    ? "border-transparent bg-[hsl(var(--ds-ink))] text-[hsl(var(--ds-bg))]"
    : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-[hsl(var(--ds-ink))] hover:border-[hsl(var(--ds-accent))]"}`;

  return (
    <>
      <header className="relative overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        {!dark && <span aria-hidden="true" className="pointer-events-none absolute -left-40 -top-48 h-[30rem] w-[30rem] rounded-full bg-[hsl(var(--ds-surface-2))] opacity-80 blur-3xl" />}
        <div className={`${wrap} relative grid gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:items-end lg:py-20`}>
          <div className="min-w-0 lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-hero-accent))]">{tr(TX_COPY.indexEyebrow, lang)}</p>
            <h1 className="mt-3 max-w-[18ch] text-[clamp(2.25rem,1.55rem+3vw,3.9rem)] leading-[1.05] tracking-[-0.02em] [font-family:var(--ds-display)]">
              <Accent text={tr(TX_COPY.indexTitle, lang)} />
            </h1>
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-[hsl(var(--ds-hero-soft))]">{tr(TX_COPY.indexLead, lang)}</p>
            <p className="mt-4 text-sm font-medium text-[hsl(var(--ds-hero-soft))]">{count(all.length)}</p>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <div className="dn-card p-6 text-[hsl(var(--ds-ink))] sm:p-7">
              <HelpCircle className="h-7 w-7 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-semibold">{tr(TX_COPY.notSureTitle, lang)}</h2>
              <p className="mt-2 leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(TX_COPY.notSureBody, lang)}</p>
              <BookButton className="mt-5 w-full sm:w-auto" preset={{ reason: "not-sure" }}>{tr(TX_COPY.notSureCta, lang)}</BookButton>
            </div>
          </div>
        </div>
      </header>

      {named.length > 1 && (
        <div className="border-b border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-bg))]">
          <div className={wrap}>
            <div role="group" aria-label={tr(TX_COPY.filterLabel, lang)} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <button type="button" aria-pressed={cat === null} onClick={() => setCat(null)} className={chip(cat === null)}>{tr(TX_COPY.all, lang)}</button>
              {named.map((g) => (
                <button key={g.category} type="button" aria-pressed={cat === g.category} onClick={() => setCat(g.category)} className={chip(cat === g.category)}>
                  {bi(g.items[0], "category", lang)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {featured.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className={wrap}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(TX_COPY.featured, lang)}</p>
            <div className={`mt-6 grid gap-6 sm:grid-cols-2 ${featured.length > 2 ? "lg:grid-cols-3" : ""}`}>
              {featured.map((t, i) => rv(treatmentSlug(t), i, <TreatmentCard treatment={t} size="lg" />))}
            </div>
          </div>
        </section>
      )}

      <div className={`${wrap} pb-6 ${featured.length ? "" : "pt-14 sm:pt-20"}`}>
        {shown.map((g, gi) => (
          rv(g.category || "all", 0,
            <section className={`grid gap-6 py-10 sm:py-12 lg:grid-cols-12 lg:gap-10 ${gi ? "border-t border-[hsl(var(--ds-line))]" : ""}`}>
              {g.category && (
                <div className="lg:col-span-4">
                  <div className="lg:sticky lg:top-[calc(var(--dn-header-h,72px)+24px)]">
                    <h2 className="text-[clamp(1.5rem,1.2rem+1.2vw,2.1rem)] leading-[1.15] [font-family:var(--ds-display)]">{bi(g.items[0], "category", lang)}</h2>
                    <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{count(g.items.length)}</p>
                  </div>
                </div>
              )}
              <div className={`grid gap-5 sm:grid-cols-2 ${g.category ? "lg:col-span-8" : "lg:col-span-12 lg:grid-cols-3"}`}>
                {g.items.map((t) => <TreatmentCard key={treatmentSlug(t)} treatment={t} />)}
              </div>
            </section>,
          )
        ))}
      </div>

      {(anyPrice || all.length > 0) && (
        <div className={`${wrap} pb-14 sm:pb-20`}>
          <div className="flex flex-col gap-3 rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="max-w-[70ch]">
              <p className="font-semibold">{tr(TX_COPY.pricesTitle, lang)}</p>
              <Disclaimer c={DISCLAIMER.fees} className="mt-1" />
            </div>
            {fees && (
              <SiteLink to={fees} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-semibold text-[hsl(var(--ds-accent))] underline-offset-4 hover:underline">
                {tr(TX_COPY.seeFees, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </SiteLink>
            )}
          </div>
        </div>
      )}

      <ClosingBand title={tr(TX_COPY.closingTitle, lang)} />
    </>
  );
}
