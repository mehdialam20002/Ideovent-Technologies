/**
 * BookPage: /book. The booking flow as a page (the same <BookingFlow> the
 * sheet shows), beside what happens next, the direct lines and the urgent
 * route. `?reason=`, `?treatment=`, `?doctor=`, `?branch=` pre-fill step 1,
 * so any link can land a patient on step 2.
 * Spec: DENTAL-DESIGN.md s7 booking; DENTAL-COMPLIANCE.md s5 (consent line,
 * nothing stored or sent). Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr } from "@/lib/demo/site/bilingual";
import { SiteLink } from "@/pages/site/kit/motion";
import { BookingFlow, CallLink, DISCLAIMER, DPageHead, dentalOf, wrap, type BookingPreset } from "@/lib/demo/ui/dental";
import { PB } from "./parts-b/support/copy";
import { crumbsFor, TalkCard, WeekHours } from "./parts-b/support/ui";

export default function BookPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const [q] = useSearchParams();
  const preset: BookingPreset = {
    reason: q.get("reason") || undefined,
    treatment: q.get("treatment") || undefined,
    doctor: q.get("doctor") || undefined,
    branch: q.get("branch") || undefined,
  };
  const d = dentalOf(site);
  const emergency = ctx.href("emergency");
  const steps = [[PB.next1t, PB.next1b], [PB.next2t, PB.next2b], [PB.next3t, PB.next3b]] as const;
  const hours = bi(site.contact, "hours", lang);

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={tr(PB.bookTitle, lang)} lead={tr(PB.bookLead, lang)}
        crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })} />
      <section className="pb-16 pt-8 sm:pb-24 sm:pt-12">
        <div className={`${wrap} grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14`}>
          <div className="dn-card min-w-0 p-5 sm:p-8 lg:p-10">
            <BookingFlow variant="page" preset={preset} key={q.toString()} />
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-[calc(var(--dn-header-h)+24px)]">
            <div className="px-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(PB.nextTitle, lang)}</p>
              <ol className="mt-4 grid gap-5">
                {steps.map(([t, b], i) => (
                  <li key={i} className="grid grid-cols-[2rem_1fr] gap-3">
                    <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--ds-line))] text-sm font-semibold tabular-nums text-[hsl(var(--ds-accent))]">{i + 1}</span>
                    <div>
                      <p className="font-semibold">{tr(t, lang)}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(b, lang)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <TalkCard />

            {(d.sessions?.length || hours) && (
              <div className="px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(PB.hours, lang)}</p>
                {d.sessions?.length ? <div className="mt-2"><WeekHours sessions={d.sessions} /></div> : <p className="mt-2 text-sm">{hours}</p>}
              </div>
            )}

            <div className="rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] border-l-4 border-l-[#B42318] bg-[hsl(var(--ds-surface))] p-5">
              <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-[#B42318]" aria-hidden="true" />{tr(PB.urgentTitle, lang)}</p>
              <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB.urgentBody, lang)}</p>
              <CallLink emergency className="mt-2 text-[hsl(var(--ds-ink))]" />
              <p className="mt-1 text-xs text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.sameDay, lang)}</p>
              {emergency && (
                <SiteLink to={emergency} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline underline-offset-4">
                  {tr(PB.urgentLink, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </SiteLink>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
