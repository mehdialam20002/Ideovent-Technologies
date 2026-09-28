/**
 * FaqPage: /faq. A search box and topic chips over the questions, grouped
 * by `group` (ungrouped under "General"), each an accordion; the "general
 * information, not a diagnosis" line; a card to ask the clinic directly.
 * Spec: DENTAL-IA.md s6 faq; DENTAL-COMPLIANCE.md s4 blog and FAQ line.
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { useState } from "react";
import { Search } from "lucide-react";
import type { DemoPoint } from "@/lib/cms/types";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { BookingBand, DISCLAIMER, DPageHead, FaqList, wrap } from "@/lib/demo/ui/dental";
import { PB2 } from "./parts-b/support/copy2";
import { crumbsFor, FilterChips, H2, TalkCard } from "./parts-b/support/ui";

export default function FaqPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const all = withText(site.faq, "title");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const groups = [...new Set(all.map((x) => (x.group || "").trim()))].sort((a, b) => Number(!a) - Number(!b));
  const named = groups.filter(Boolean);
  const needle = q.trim().toLowerCase();
  const hit = (x: DemoPoint) => !needle || [x.title, x.body, x.hi?.title, x.hi?.body].some((s) => (s || "").toLowerCase().includes(needle));
  const shown = groups
    .filter((g) => !topic || g === topic)
    .map((g) => ({ g, items: all.filter((x) => (x.group || "").trim() === g && hit(x)) }))
    .filter((x) => x.items.length);
  const groupLabel = (g: string) => (g ? bi(all.find((x) => (x.group || "").trim() === g), "group", lang) || g : tr(PB2.general, lang));

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={tr(PB2.faqTitle, lang)} lead={tr(PB2.faqLead, lang)}
        crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })} />

      <section className="py-12 sm:py-16">
        <div className={`${wrap} grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14`}>
          <div className="min-w-0">
            <label className="relative block">
              <span className="sr-only">{tr(PB2.search, lang)}</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--ds-ink-soft))]" aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr(PB2.search, lang)}
                className="min-h-[52px] w-full rounded-[var(--dn-btn-radius,var(--ds-radius))] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] pl-12 pr-4 text-base outline-none placeholder:text-[hsl(var(--ds-ink-soft))] focus:border-[hsl(var(--ds-cta))] focus:shadow-[0_0_0_3px_hsl(var(--ds-cta)/0.18)]" />
            </label>
            {named.length > 1 && (
              <div className="mt-4">
                <FilterChips label={tr(PB2.topics, lang)} values={groups.filter(Boolean)} value={topic} onChange={setTopic} labelOf={groupLabel} allLabel={tr(PB2.all, lang)} />
              </div>
            )}

            <div className="mt-10 grid gap-12" aria-live="polite">
              {shown.map(({ g, items }) => (
                <section key={g || "general"} aria-labelledby={`faq-${g || "general"}`}>
                  {(named.length > 0) && <H2 id={`faq-${g || "general"}`} className="mb-2 !text-[clamp(1.35rem,1.1rem+0.9vw,1.75rem)]">{groupLabel(g)}</H2>}
                  <FaqList items={items} />
                </section>
              ))}
              {!shown.length && <p className="text-[hsl(var(--ds-ink-soft))]">{tr(PB2.noResults, lang)}</p>}
            </div>
            <p className="mt-10 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.info, lang)}</p>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--dn-header-h)+24px)]">
            <TalkCard title={PB2.askTitle} body={PB2.askBody} />
          </aside>
        </div>
      </section>

      <BookingBand />
    </>
  );
}
