/**
 * FeesPage: /fees. "Starting from*" prices grouped by kind of care, with the
 * exact fee note beside them; complex work reads "Cost after consultation
 * and X-ray"; how the written estimate works (DCI 3.8, 5.7.1); EMI in the
 * exact words, ways to pay, insurance, the consultation fee; care plans
 * where the record has them; fee questions.
 * Spec: DENTAL-COMPLIANCE.md s3 prices + s4 fee note; plans on d7.
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { Info } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { BookingBand, DISCLAIMER, DPageHead, DSection, dentalOf, FaqList, wrap } from "@/lib/demo/ui/dental";
import { PB } from "./parts-b/support/copy";
import { GroupedFees, PaymentGrid, Plans } from "./parts-b/support/fees";
import { crumbsFor, H2, TalkCard } from "./parts-b/support/ui";

const FEE_GROUP = /fee|cost|pay|price|emi|insur|फीस|ख़र्च|खर्च|भुगतान/i;

export default function FeesPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const d = dentalOf(site);
  const how = [[PB.how1t, PB.how1b], [PB.how2t, PB.how2b], [PB.how3t, PB.how3b]] as const;
  const feeFaq = withText(site.faq, "title").filter((q) => FEE_GROUP.test(q.group || "") || FEE_GROUP.test(bi(q, "group", lang)));

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={tr(PB.feesTitle, lang)} lead={tr(PB.feesLead, lang)}
        crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })} />

      <section className="py-12 sm:py-16">
        <div className={`${wrap} grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14`}>
          <div className="min-w-0">
            <H2>{tr(PB.tableTitle, lang)}</H2>
            <p className="mt-4 flex gap-2.5 rounded-[calc(var(--ds-radius)*0.7)] bg-[hsl(var(--ds-surface-2))] p-4 text-sm leading-relaxed">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
              <span>{tr(DISCLAIMER.fees, lang)}</span>
            </p>
            <div className="mt-8"><GroupedFees /></div>
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-[calc(var(--dn-header-h)+24px)]">
            <div className="dn-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(PB.howTitle, lang)}</p>
              <ol className="mt-4 grid gap-4">
                {how.map(([t, b], i) => (
                  <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-3">
                    <span aria-hidden="true" className="text-xl leading-none tabular-nums text-[hsl(var(--ds-accent))] [font-family:var(--ds-display)]">{String(i + 1).padStart(2, "0")}</span>
                    <div><p className="font-semibold">{tr(t, lang)}</p><p className="mt-0.5 text-sm leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(b, lang)}</p></div>
                  </li>
                ))}
              </ol>
            </div>
            <TalkCard body={PB.askCost} />
          </aside>
        </div>
      </section>

      {/* Always shown: the EMI card prints the exact EMI line even on an empty record. */}
      <DSection tone="tint" eyebrow={tr(PB.emiTitle, lang)} title={tr(PB.payTitle, lang)}>
        <PaymentGrid />
      </DSection>

      {withText(d.plans, "name").length > 0 && (
        <DSection title={tr(PB.plansTitle, lang)} lead={tr(PB.plansLead, lang)}>
          <Plans />
        </DSection>
      )}

      {feeFaq.length > 0 && (
        <DSection title={tr(PB.feesFaq, lang)}>
          <div className="max-w-3xl"><FaqList items={feeFaq} /></div>
          <p className="mt-6 max-w-3xl text-sm text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.info, lang)}</p>
        </DSection>
      )}

      <BookingBand />
    </>
  );
}
