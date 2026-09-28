/**
 * FEES PIECES: the grouped "Starting from*" table (a row links to its
 * treatment page when the record shows one), the payment grid (EMI with its
 * exact line, modes, insurance, consultation) and the care plans (d7).
 * Complex work never shows a number: "Cost after consultation and X-ray".
 * Spec: DENTAL-COMPLIANCE.md s3 prices, s4 fee note.
 */

import { ArrowUpRight, CreditCard, Landmark, ShieldCheck, Stethoscope } from "lucide-react";
import type { DentalFeeRow } from "@/lib/cms/types";
import { bi, biList, tr, withText } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { SiteLink } from "@/pages/site/kit/motion";
import { DENTAL_COPY, DISCLAIMER, dentalOf, money } from "@/lib/demo/ui/dental";
import { PB } from "./copy";

/** Rows grouped by `group`, first-seen order; ungrouped last under "Other treatments". */
export function feeGroups(rows: DentalFeeRow[]) {
  const out: { group: string; rows: DentalFeeRow[] }[] = [];
  for (const r of rows) {
    const g = (r.group || "").trim();
    let slot = out.find((x) => x.group === g);
    if (!slot) out.push((slot = { group: g, rows: [] }));
    slot.rows.push(r);
  }
  return out.sort((a, b) => Number(!a.group) - Number(!b.group));
}

export function GroupedFees({ rows }: { rows?: DentalFeeRow[] }) {
  const { site, lang, href } = useSite();
  const list = withText(rows || dentalOf(site).fees, "treatment");
  if (!list.length) return null;
  const groups = feeGroups(list);
  return (
    <div className="grid gap-10">
      {groups.map((g) => (
        <section key={g.group || "other"} aria-labelledby={`fee-${g.group || "other"}`}>
          <h3 id={`fee-${g.group || "other"}`} className="border-b border-[hsl(var(--ds-ink))] pb-2 text-sm font-semibold uppercase tracking-[0.12em]">
            {g.group ? bi(g.rows[0], "group", lang) : tr(PB.otherGroup, lang)}
          </h3>
          <ul className="divide-y divide-[hsl(var(--ds-line))]">
            {g.rows.map((r, i) => {
              const to = r.slug ? href("treatment", r.slug) : null;
              const priced = r.from && !r.consult;
              const name = bi(r, "treatment", lang);
              return (
                <li key={i} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-6">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {to ? <SiteLink to={to} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">{name}<ArrowUpRight className="h-3.5 w-3.5 text-[hsl(var(--ds-ink-soft))]" aria-hidden="true" /></SiteLink> : name}
                    </p>
                    {bi(r, "note", lang) && <p className="mt-0.5 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(r, "note", lang)}</p>}
                  </div>
                  <p className={`text-left sm:text-right ${priced ? "" : "text-sm text-[hsl(var(--ds-ink-soft))]"}`}>
                    {priced ? (
                      <>
                        <span className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--ds-ink-soft))]">{tr(DENTAL_COPY.startingFrom, lang)} </span>
                        <span className="text-lg font-semibold tabular-nums">{money(bi(r, "from", lang) || r.from, site.currency)}</span>
                        {bi(r, "unit", lang) && <span className="text-sm text-[hsl(var(--ds-ink-soft))]"> {bi(r, "unit", lang)}</span>}
                      </>
                    ) : tr(DISCLAIMER.consult, lang)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** EMI, ways to pay, insurance, consultation: up to four cards. */
export function PaymentGrid() {
  const { site, lang } = useSite();
  const p = dentalOf(site).payment;
  const modes = biList(p, "modes", lang);
  const partners = biList(p, "partners", lang);
  const card = "dn-card flex flex-col p-6";
  const head = (icon: JSX.Element, t: string) => (
    <p className="flex items-center gap-2.5 font-semibold">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]">{icon}</span>{t}
    </p>
  );
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className={card}>
        {head(<Landmark className="h-[18px] w-[18px]" aria-hidden="true" />, tr(PB.emiTitle, lang))}
        <p className="mt-3 text-[15px]">{bi(p, "emi", lang) || tr(DISCLAIMER.emi, lang)}</p>
        {bi(p, "emiExample", lang) && (
          <p className="mt-3 rounded-[calc(var(--ds-radius)*0.6)] bg-[hsl(var(--ds-surface-2))] p-3 text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{tr(PB.illustration, lang)}</span>
            {bi(p, "emiExample", lang)}
          </p>
        )}
        {partners.length > 0 && <p className="mt-3 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB.partners, lang)}: {partners.join(", ")}</p>}
      </div>
      {modes.length > 0 && (
        <div className={card}>
          {head(<CreditCard className="h-[18px] w-[18px]" aria-hidden="true" />, tr(PB.modesTitle, lang))}
          <ul className="mt-3 flex flex-wrap gap-2">
            {modes.map((m) => <li key={m} className="rounded-full border border-[hsl(var(--ds-line))] px-3 py-1.5 text-sm">{m}</li>)}
          </ul>
        </div>
      )}
      {bi(p, "insurance", lang) && (
        <div className={card}>
          {head(<ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />, tr(PB.insuranceTitle, lang))}
          <p className="mt-3 text-[15px]">{bi(p, "insurance", lang)}</p>
        </div>
      )}
      {bi(p, "consultFee", lang) && (
        <div className={card}>
          {head(<Stethoscope className="h-[18px] w-[18px]" aria-hidden="true" />, tr(PB.consultTitle, lang))}
          <p className="mt-3 text-[15px]">{bi(p, "consultFee", lang)}</p>
        </div>
      )}
    </div>
  );
}

/** Care plans: name, price and period, what it includes, its note. */
export function Plans() {
  const { site, lang } = useSite();
  const plans = withText(dentalOf(site).plans, "name");
  if (!plans.length) return null;
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((p, i) => (
        <article key={i} className="dn-card flex flex-col p-6 sm:p-7">
          <h3 className="text-lg font-semibold">{bi(p, "name", lang)}</h3>
          {p.price && (
            <p className="mt-3"><span className="text-3xl font-semibold tabular-nums [font-family:var(--ds-display)]">{money(bi(p, "price", lang) || p.price, site.currency)}</span>
              {bi(p, "period", lang) && <span className="text-sm text-[hsl(var(--ds-ink-soft))]"> {bi(p, "period", lang)}</span>}</p>
          )}
          <ul className="mt-4 grid gap-2 text-sm">
            {biList(p, "includes", lang).map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" />{x}</li>)}
          </ul>
          {bi(p, "note", lang) && <p className="mt-auto pt-4 text-xs text-[hsl(var(--ds-ink-soft))]">{bi(p, "note", lang)}</p>}
        </article>
      ))}
    </div>
  );
}
