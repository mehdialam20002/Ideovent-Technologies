/**
 * WHAT THE CLINIC DOES: quick actions (booking step 1 as chips), the
 * treatments grid (specialty tabs when there are several), the luxury
 * signature cards and the specialty tiles. Prices read "Starting from*" with
 * the fee disclaimer beside them, or "Cost after consultation and X-ray".
 */

import { useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { DentalTreatment } from "@/lib/cms/types";
import { bi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { treatmentSlug, useSite } from "@/lib/demo/site/context";
import {
  DEFAULT_REASONS, DENTAL_COPY, DISCLAIMER, Disclaimer, DentalGlyph, dentalOf, money, treatmentGroups, useBooking,
} from "@/lib/demo/ui/dental";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { SiteLink } from "@/pages/site/kit/motion";
import { H } from "./copy";
import { HSection } from "./ui";

/** "Starting from* Rs 3,500 per tooth", or the consultation line. */
export function usePriceLine() {
  const { site, lang } = useSite();
  return (t: DentalTreatment) =>
    t.fromPrice
      ? `${tr(DENTAL_COPY.startingFrom, lang)} ${money(t.fromPrice, site.currency)}${bi(t, "priceNote", lang) ? ` ${bi(t, "priceNote", lang)}` : ""}`
      : tr(DISCLAIMER.consult, lang);
}

/** Six chips, 3 x 2 on a phone, 6 up on a desktop. Each opens booking with the reason set. */
export function QuickActions({ title = H.quickTitle, tone = "plain" }: { title?: Bilingual; tone?: "plain" | "tint" | "surface" }) {
  const { site, lang } = useSite();
  const { open } = useBooking();
  const all = dentalOf(site).booking?.reasons?.length ? dentalOf(site).booking!.reasons! : DEFAULT_REASONS;
  const list = [...all].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent)).slice(0, 6);
  return (
    <HSection eyebrow={H.quickEyebrow} title={title} lead={H.quickLead} tone={tone} tight>
      <ul className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3 lg:grid-cols-6">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => open({ reason: r.id, treatment: r.treatment })}
              className="dn-tile dn-lift flex h-full min-h-[112px] w-full flex-col items-center justify-center gap-3 px-3 py-5 text-center text-sm font-semibold leading-snug">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${r.urgent ? "bg-[var(--dn-emergency)] text-white" : "bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]"}`}>
                <DentalGlyph name={r.urgent ? "emergency" : r.icon} className="h-5 w-5" />
              </span>
              {bi(r, "label", lang)}
            </button>
          </li>
        ))}
      </ul>
    </HSection>
  );
}

function TreatmentTile({ t }: { t: DentalTreatment }) {
  const { lang, href } = useSite();
  const price = usePriceLine();
  const to = href("treatment", treatmentSlug(t));
  return (
    <article className="dn-tile dn-lift group relative flex h-full flex-col p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-[calc(var(--ds-radius)*0.8)] bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]">
        <DentalGlyph name={t.icon} className="h-6 w-6" />
      </span>
      <h3 className="dn-h3 mt-5">{to ? <SiteLink to={to} className="after:absolute after:inset-0 after:rounded-[var(--ds-radius)]">{bi(t, "name", lang)}</SiteLink> : bi(t, "name", lang)}</h3>
      <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(t, "summary", lang)}</p>
      <div aria-hidden="true" className="h-6 shrink-0" />
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[hsl(var(--ds-line))] pt-4">
        <span className="text-sm font-semibold">{price(t)}</span>
        {to && <ArrowRight className="h-4 w-4 shrink-0 text-[hsl(var(--ds-accent))] transition-transform group-hover:translate-x-1" aria-hidden="true" />}
      </div>
    </article>
  );
}

/** 3-up treatment cards, featured first; tabs by category when there are three or more. */
export function TreatmentsSection({ max = 6, tone = "tint" }: { max?: number; tone?: "plain" | "tint" }) {
  const { site, lang } = useSite();
  const groups = treatmentGroups(site).filter((g) => g.category);
  const all = withText(dentalOf(site).treatments, "name");
  const [cat, setCat] = useState("");
  if (!all.length) return null;
  const tabs = groups.length >= 3;
  const pool = cat ? all.filter((t) => (t.category || "").trim() === cat) : [...all].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const list = pool.slice(0, max);
  return (
    <HSection eyebrow={H.treatEyebrow} title={H.treatTitle} lead={H.treatLead} tone={tone} more={{ to: "treatments", label: DENTAL_COPY.allTreatments }}>
      {tabs && (
        <div className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={tr(H.treatEyebrow, lang)}>
          <div className="flex w-max gap-2">
            {[{ category: "", items: all }, ...groups].map((g) => {
              const on = cat === g.category;
              const label = g.category ? bi(g.items[0], "category", lang) : tr(H.allCategories, lang);
              return (
                <button key={g.category || "all"} type="button" aria-pressed={on} onClick={() => setCat(g.category)}
                  className={`min-h-11 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${on ? "border-[hsl(var(--ds-ink))] bg-[hsl(var(--ds-ink))] text-[hsl(var(--ds-bg))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] hover:border-[hsl(var(--ds-ink)/0.4)]"}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((t) => <TreatmentTile key={treatmentSlug(t)} t={t} />)}</div>
      {list.some((t) => t.fromPrice) && <Disclaimer c={DISCLAIMER.fees} className="mt-6 max-w-[80ch]" />}
    </HSection>
  );
}

/** Luxury: four large cards 2 x 2, image 4:3 on top, serif title, starting price, text link. */
export function SignatureTreatments() {
  const { site, lang, href } = useSite();
  const price = usePriceLine();
  const all = withText(dentalOf(site).treatments, "name");
  const featured = all.filter((t) => t.featured);
  const list = (featured.length >= 2 ? featured : all).slice(0, 4);
  if (!list.length) return null;
  return (
    <HSection eyebrow={H.signatureEyebrow} title={H.signatureTitle} more={{ to: "treatments", label: DENTAL_COPY.allTreatments }}>
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {list.map((t) => {
          const to = href("treatment", treatmentSlug(t));
          return (
            <article key={treatmentSlug(t)} className="dn-tile dn-lift group relative flex flex-col overflow-hidden">
              {t.image
                ? <DemoPhoto src={t.image} ratio="4 / 3" sizes="(min-width: 768px) 540px, 100vw" decorative />
                : <div className="flex aspect-[4/3] items-center justify-center bg-[hsl(var(--ds-surface-2))]"><DentalGlyph name={t.icon} className="h-16 w-16 text-[hsl(var(--ds-rule))]" /></div>}
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <p className="dn-eyebrow">{bi(t, "category", lang)}</p>
                <h3 className="dn-h3 mt-2 !text-[1.75rem]">{to ? <SiteLink to={to} className="after:absolute after:inset-0">{bi(t, "name", lang)}</SiteLink> : bi(t, "name", lang)}</h3>
                <p className="mt-3 leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(t, "summary", lang)}</p>
                <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                  <span className="text-sm font-semibold">{price(t)}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--ds-accent))]">{tr(H.explore, lang)}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {list.some((t) => t.fromPrice) && <Disclaimer c={DISCLAIMER.fees} className="mt-6 max-w-[80ch]" />}
    </HSection>
  );
}

/** Specialty tiles (d2, d7): title, body, link to the treatments page. */
export function Specialties({ tone = "plain" }: { tone?: "plain" | "tint" }) {
  const { site, lang, href } = useSite();
  const list = withText(dentalOf(site).specialties, "title");
  if (!list.length) return null;
  const to = href("treatments");
  return (
    <HSection eyebrow={H.specialtiesEyebrow} title={H.specialtiesTitle} tone={tone} more={{ to: "treatments", label: DENTAL_COPY.allTreatments }}>
      <ul className="grid gap-px overflow-hidden rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-line))] sm:grid-cols-2 lg:grid-cols-4">
        {list.map((s, i) => (
          <li key={i} className="group relative bg-[hsl(var(--ds-surface))] p-6 transition-colors hover:bg-[hsl(var(--ds-surface-2))]">
            <span className="text-xs font-semibold text-[hsl(var(--ds-accent))]">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="dn-h3 mt-3 !text-lg">{to ? <SiteLink to={to} className="after:absolute after:inset-0">{bi(s, "title", lang)}</SiteLink> : bi(s, "title", lang)}</h3>
            {bi(s, "body", lang) && <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(s, "body", lang)}</p>}
          </li>
        ))}
        {/* Empty cells left by an uneven count showed the hairline colour as a
            solid grey block, which read as a missing tile. Fill them with the
            tile surface: one set for the 2-column rows, one for the 4-column. */}
        {Array.from({ length: (2 - (list.length % 2)) % 2 }, (_, i) => (
          <li key={`f2-${i}`} aria-hidden="true" className="hidden bg-[hsl(var(--ds-surface))] sm:block lg:hidden" />
        ))}
        {Array.from({ length: (4 - (list.length % 4)) % 4 }, (_, i) => (
          <li key={`f4-${i}`} aria-hidden="true" className="hidden bg-[hsl(var(--ds-surface))] lg:block" />
        ))}
      </ul>
    </HSection>
  );
}
