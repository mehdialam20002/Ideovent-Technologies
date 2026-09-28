/**
 * ContactPage: /contact. Address with landmark, metro and bus, parking and
 * access; the week's hours with today marked and the Open now chip; the
 * tap-to-load map (the coaching Contact pattern); phone, WhatsApp, email and
 * the emergency number; branches on a chain. A fresh duplicate has no
 * address or numbers yet: those rows disappear and one line says so.
 * Spec: Mehdi's brief item 13; DENTAL-IA.md s4. Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { AlertTriangle, ArrowRight, Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, biList, tr, trf, withText } from "@/lib/demo/site/bilingual";
import { SiteLink } from "@/pages/site/kit/motion";
import {
  ActionButtons, BookingBand, BranchCard, CallLink, DentalGlyph, DISCLAIMER, DPageHead, DSection, dentalContact, dentalOf,
  OpenNowChip, WhatsAppButton, wrap,
} from "@/lib/demo/ui/dental";
import { PB } from "./parts-b/support/copy";
import { crumbsFor, IconRow, MapEmbed, WeekHours } from "./parts-b/support/ui";

export default function ContactPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const c = site.contact || {};
  const d = dentalOf(site);
  const r = d.reach;
  const k = dentalContact(site);
  const lines = biList(c, "addressLines", lang);
  const branches = withText(d.branches, "name");
  const query = (c.mapQuery || "").trim() || [site.instituteName, ...(c.addressLines || []), site.city].filter(Boolean).join(", ");
  const emergencyPage = ctx.href("emergency");
  const hours = bi(c, "hours", lang);
  const ic = "h-[18px] w-[18px]";

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={trf(PB.contactTitle, lang, { clinic: bi(site, "shortName", lang) || bi(site, "instituteName", lang) })}
        lead={tr(PB.contactLead, lang)} crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })}>
        <ActionButtons size="md" />
      </DPageHead>

      <section className="py-12 sm:py-16">
        <div className={`${wrap} grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12`}>
          <div className="grid min-w-0 content-start gap-6">
            <div className="dn-card grid gap-6 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(PB.getThere, lang)}</p>
              {lines.length ? (
                <IconRow icon={<MapPin className={ic} aria-hidden="true" />} label={tr(PB.address, lang)}>
                  <address className="not-italic"><strong className="block font-semibold">{bi(site, "instituteName", lang)}</strong>{lines.map((l) => <span key={l} className="block">{l}</span>)}</address>
                </IconRow>
              ) : (
                <p className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB.noAddress, lang)}</p>
              )}
              <IconRow icon={<Navigation className={ic} aria-hidden="true" />} label={tr(PB.landmark, lang)}>{bi(c, "landmark", lang)}</IconRow>
              <IconRow icon={<DentalGlyph name="metro" className={ic} />} label={tr(PB.transit, lang)}>{bi(r, "transit", lang)}</IconRow>
              <IconRow icon={<DentalGlyph name="parking" className={ic} />} label={tr(PB.parking, lang)}>{bi(r, "parking", lang)}</IconRow>
              <IconRow icon={<DentalGlyph name="accessible" className={ic} />} label={tr(PB.access, lang)}>{bi(r, "access", lang)}</IconRow>
            </div>

            {(d.sessions?.length || hours) && (
              <div className="dn-card p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]"><Clock className="h-4 w-4" aria-hidden="true" />{tr(PB.hours, lang)}</p>
                  <OpenNowChip />
                </div>
                {d.sessions?.length ? <div className="mt-3"><WeekHours sessions={d.sessions} /></div> : null}
                {hours && <p className={`${d.sessions?.length ? "mt-3 text-sm text-[hsl(var(--ds-ink-soft))]" : "mt-3"}`}>{hours}</p>}
              </div>
            )}
          </div>

          <div className="grid min-w-0 content-start gap-6 lg:sticky lg:top-[calc(var(--dn-header-h)+24px)]">
            <MapEmbed query={query} href={ctx.actions.map} />
            {(k.tel || k.whatsapp || k.email) && (
              <div className="dn-card grid gap-5 p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(PB.reachUs, lang)}</p>
                {k.tel && <IconRow icon={<Phone className={ic} aria-hidden="true" />} label={tr(PB.phone, lang)}><CallLink className="min-h-0 text-lg [&>svg]:hidden" /></IconRow>}
                {k.email && <IconRow icon={<Mail className={ic} aria-hidden="true" />} label={tr(PB.email, lang)}><a href={`mailto:${k.email}`} className="break-all underline underline-offset-4">{k.email}</a></IconRow>}
                <WhatsAppButton className="justify-self-start" />
              </div>
            )}
            {k.emergencyTel && (
              <div className="rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] border-l-4 border-l-[#B42318] bg-[hsl(var(--ds-surface))] p-6">
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-[#B42318]" aria-hidden="true" />{tr(PB.emTitle, lang)}</p>
                <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB.emBody, lang)}{bi(d.emergency, "hours", lang) ? ` ${bi(d.emergency, "hours", lang)}.` : ""}</p>
                <CallLink emergency className="mt-2 text-lg text-[hsl(var(--ds-ink))]" />
                <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.emergency, lang)}</p>
                {emergencyPage && (
                  <SiteLink to={emergencyPage} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline underline-offset-4">
                    {tr(PB.urgentLink, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </SiteLink>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {branches.length > 1 && (
        <DSection tone="tint" title={tr(PB.branches, lang)}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{branches.map((b) => <BranchCard key={b.slug || b.name} branch={b} />)}</div>
        </DSection>
      )}
      <BookingBand />
    </>
  );
}
