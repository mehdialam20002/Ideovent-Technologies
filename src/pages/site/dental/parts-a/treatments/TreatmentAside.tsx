/**
 * The treatment page's sticky side card on a desktop (PAGES-A, 28 Sep 2026):
 * "On this page" anchors and an "At a glance" summary with the Book button.
 * Hidden under 1024px, where the mobile action bar carries the actions.
 */

import { ArrowUpRight } from "lucide-react";
import type { DentalTreatment } from "@/lib/cms/types";
import { bi, tr } from "@/lib/demo/site/bilingual";
import { treatmentSlug, useSite } from "@/lib/demo/site/context";
import { SiteLink } from "@/pages/site/kit/motion";
import { BookButton, DENTAL_COPY, DISCLAIMER, OpenNowChip, money } from "@/lib/demo/ui/dental";
import { TX_COPY } from "./copy";

export function TreatmentAside({ t, anchors }: { t: DentalTreatment; anchors: { id: string; label: string }[] }) {
  const { site, lang, href } = useSite();
  const fees = href("fees");
  const rows = [
    { k: tr(TX_COPY.duration, lang), v: bi(t, "duration", lang) },
    { k: tr(TX_COPY.visits, lang), v: bi(t, "visits", lang) },
    {
      k: tr(TX_COPY.cost, lang),
      v: t.fromPrice
        ? `${tr(DENTAL_COPY.startingFrom, lang)} ${money(t.fromPrice, site.currency)}${bi(t, "priceNote", lang) ? ` ${bi(t, "priceNote", lang)}` : ""}`
        : tr(DISCLAIMER.consult, lang),
    },
  ].filter((r) => r.v);
  return (
    <div className="sticky top-[calc(var(--dn-header-h,72px)+24px)] grid gap-6">
      {anchors.length > 2 && (
        <nav aria-label={tr(TX_COPY.onThisPage, lang)}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-ink-soft))]">{tr(TX_COPY.onThisPage, lang)}</p>
          <ul className="mt-3 border-l border-[hsl(var(--ds-line))]">
            {anchors.map((a) => (
              <li key={a.id}>
                <a href={`#${a.id}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-[hsl(var(--ds-ink-soft))] transition-colors hover:border-[hsl(var(--ds-accent))] hover:text-[hsl(var(--ds-ink))]">{a.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="dn-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(TX_COPY.summaryTitle, lang)}</p>
        <p className="mt-2 text-xl leading-snug [font-family:var(--ds-display)]">{bi(t, "name", lang)}</p>
        <dl className="mt-4 divide-y divide-[hsl(var(--ds-line))] text-sm">
          {rows.map((r) => (
            <div key={r.k} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
              <dt className="text-[hsl(var(--ds-ink-soft))]">{r.k}</dt>
              <dd className="font-medium">{r.v}</dd>
            </div>
          ))}
        </dl>
        <BookButton className="mt-5 w-full" preset={{ treatment: treatmentSlug(t), reason: t.reason }}>{tr(TX_COPY.bookThis, lang)}</BookButton>
        <div className="mt-3 text-center"><OpenNowChip className="text-[hsl(var(--ds-ink-soft))]" /></div>
        {fees && (
          <SiteLink to={fees} className="mt-3 flex items-center justify-center gap-1 text-sm font-semibold text-[hsl(var(--ds-accent))] underline-offset-4 hover:underline">
            {tr(TX_COPY.seeFees, lang)}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </SiteLink>
        )}
      </div>
    </div>
  );
}
