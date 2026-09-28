/**
 * EmergencyPage: /emergency. Built 28 Sep 2026 (treatments and care pages builder).
 * Spec: Mehdi's brief item 11 ("Tooth Pain? Same-Day Emergency
 * Appointments", Call Now, WhatsApp Emergency); DENTAL-COMPLIANCE.md s4 (the
 * 112 line and "Same-day slots depend on availability", exact strings from
 * the kit). Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 *
 * The emergency band (the one place, with the top bar, that uses the kit's
 * emergency red, white text 6.57:1) with the emergency line written out;
 * then "when to go to a hospital instead", right under the first screen;
 * urgent vs can-wait; numbered first aid; how to reach; a closing band for
 * non-urgent visits. A duplicate with no number still offers the booking
 * sheet at the "pain" reason.
 */

import { AlertTriangle, Check, Clock, Siren } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, biList, tr, withText } from "@/lib/demo/site/bilingual";
import {
  BookButton, CallLink, DENTAL_COPY, DISCLAIMER, DSection, OpenNowChip, ReachBlock, WhatsAppButton,
  dentalOf, wrap,
} from "@/lib/demo/ui/dental";
import { ClosingBand } from "./parts-a/treatments/ClosingBand";
import { ER_COPY } from "./parts-b/care/copy";

export default function EmergencyPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const e = dentalOf(site).emergency;
  const urgent = biList(e, "urgent", lang);
  const canWait = biList(e, "canWait", lang);
  const aid = withText(e?.firstAid, "title");
  const hours = bi(e, "hours", lang);

  return (
    <>
      <section className="dn-emergency relative overflow-hidden" data-dn-er-hero="">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/[0.06]" />
        <div className={`${wrap} relative py-12 sm:py-16 lg:py-20`}>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
            <Siren className="h-4 w-4" aria-hidden="true" />{tr(ER_COPY.eyebrow, lang)}
          </p>
          <h1 className="mt-3 max-w-[20ch] text-[clamp(2.2rem,1.5rem+3vw,3.75rem)] leading-[1.05] tracking-[-0.02em] [font-family:var(--ds-display)]">
            {bi(e, "headline", lang) || tr(ER_COPY.title, lang)}
          </h1>
          <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-white/90">{bi(e, "intro", lang) || tr(ER_COPY.lead, lang)}</p>
          <p className="mt-2 text-sm font-medium text-white/90">{tr(DISCLAIMER.sameDay, lang)}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <CallLink emergency className="min-h-[52px] justify-center rounded-[var(--dn-btn-radius,10px)] bg-white px-6 text-lg text-[#B42318] hover:bg-white/90" />
            <WhatsAppButton size="lg" text={tr(DENTAL_COPY.waEmergency, lang)} className="ring-1 ring-white/70">{tr(DENTAL_COPY.emergencyWhatsapp, lang)}</WhatsAppButton>
            <BookButton size="lg" tone="ghost" preset={{ reason: "pain" }} className="!border-white/70 !text-white">{tr(ER_COPY.book, lang)}</BookButton>
          </div>
          {(hours || dentalOf(site).sessions?.length) && (
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
              {hours && <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden="true" />{hours}</span>}
              <OpenNowChip />
            </div>
          )}
        </div>
      </section>

      <div className={`${wrap} -mt-px pt-10 sm:pt-14`}>
        <div role="note" className="flex gap-4 rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] border-l-4 border-l-[var(--dn-emergency)] bg-[hsl(var(--ds-surface))] p-5 shadow-[var(--dn-shadow-1)] sm:p-6">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-[var(--dn-emergency)]" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">{tr(ER_COPY.hospital, lang)}</h2>
            <p className="mt-1 max-w-[75ch] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.emergency, lang)}</p>
          </div>
        </div>
      </div>

      {(urgent.length > 0 || canWait.length > 0) && (
        <DSection>
          <div className="grid gap-6 md:grid-cols-2">
            {urgent.length > 0 && (
              <div className="dn-card p-6 sm:p-8">
                <h2 className="text-xl font-semibold">{tr(ER_COPY.urgent, lang)}</h2>
                <ul className="mt-5 grid gap-3">
                  {urgent.map((u, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" />
                      <span className="leading-relaxed">{u}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canWait.length > 0 && (
              <div className="rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] p-6 sm:p-8">
                <h2 className="text-xl font-semibold">{tr(ER_COPY.canWait, lang)}</h2>
                <ul className="mt-5 grid gap-3">
                  {canWait.map((u, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
                      <span className="leading-relaxed text-[hsl(var(--ds-ink-soft))]">{u}</span>
                    </li>
                  ))}
                </ul>
                <BookButton tone="ghost" className="mt-6">{tr(ER_COPY.bookRegular, lang)}</BookButton>
              </div>
            )}
          </div>
        </DSection>
      )}

      {aid.length > 0 && (
        <DSection tone="tint" title={tr(ER_COPY.firstAid, lang)}>
          <ol className={`grid gap-5 sm:grid-cols-2 ${aid.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {aid.map((s, i) => (
              <li key={i} className="dn-card flex flex-col p-6">
                <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--ds-surface-2))] font-semibold text-[hsl(var(--ds-accent))] [font-family:var(--ds-display)]">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold leading-snug">{bi(s, "title", lang)}</h3>
                {bi(s, "body", lang) && <p className="mt-2 leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(s, "body", lang)}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.info, lang)}</p>
        </DSection>
      )}

      <DSection title={tr(ER_COPY.reach, lang)}>
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="dn-card p-6 sm:p-8"><ReachBlock /></div>
          <div className="flex flex-col gap-3">
            <CallLink emergency className="text-lg" />
            <WhatsAppButton variant="outline" text={tr(DENTAL_COPY.waEmergency, lang)} className="self-start">{tr(DENTAL_COPY.emergencyWhatsapp, lang)}</WhatsAppButton>
          </div>
        </div>
      </DSection>

      <ClosingBand title={tr(ER_COPY.band, lang)} />
    </>
  );
}
