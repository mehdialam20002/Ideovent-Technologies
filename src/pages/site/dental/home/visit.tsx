/**
 * GETTING TO A VISIT: fees and EMI, the emergency card, how to reach, FAQ,
 * the closing booking band (step-1 chips), the international band, the
 * luxury studio photo band, and the chain's plans and corporate blocks.
 * Prices only as "Starting from*" with the fee note (the kit's FeeTable).
 */

import type { ReactNode } from "react";
import type { DemoPoint } from "@/lib/cms/types";
import { Accessibility, ArrowRight, Bus, Car, Clock, Landmark, MapPin, Navigation } from "lucide-react";
import { bi, biList, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import {
  BookButton, CallLink, DEFAULT_REASONS, DENTAL_COPY, DISCLAIMER, Disclaimer, DentalGlyph, EmergencyCard, FaqList, FeeTable,
  OpenNowChip, PaymentNote, WhatsAppButton, dentalOf, useBooking,
} from "@/lib/demo/ui/dental";
import { BranchPicker } from "@/lib/demo/ui/dental/hero-parts";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { SiteLink } from "@/pages/site/kit/motion";
import { H } from "./copy";
import { photoBy } from "./trust";
import { Accent, HSection, MoreLink, wrap } from "./ui";

export function FeesSection({ tone = "plain" }: { tone?: "plain" | "tint" }) {
  const { site, lang } = useSite();
  const d = dentalOf(site);
  if (!withText(d.fees, "treatment").length) return null;
  return (
    <HSection eyebrow={H.feesEyebrow} title={H.feesTitle} tone={tone} more={{ to: "fees", label: H.feesAll }}>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="dn-tile p-6 sm:p-8 lg:col-span-7"><FeeTable limit={6} /></div>
        <div className="rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface-2))] p-6 sm:p-8 lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--ds-surface))] px-3 py-1 text-xs font-semibold text-[hsl(var(--ds-accent))]">
            <DentalGlyph name="rupee" className="h-3.5 w-3.5" />EMI
          </span>
          <div className="mt-5 text-[15px] leading-relaxed [&_p+p]:mt-1"><PaymentNote /></div>
          {withText(d.plans, "name").length > 0 && <p className="mt-6 text-sm font-semibold">{tr(H.plansTitle, lang)}</p>}
          {withText(d.plans, "name").slice(0, 2).map((p, i) => (
            <p key={i} className="mt-2 flex justify-between gap-4 border-t border-[hsl(var(--ds-line))] pt-2 text-sm">
              <span>{bi(p, "name", lang)}</span><span className="font-semibold">{[bi(p, "price", lang), bi(p, "period", lang)].filter(Boolean).join(" ")}</span>
            </p>
          ))}
        </div>
      </div>
    </HSection>
  );
}

export function EmergencySection() {
  const { site } = useSite();
  const e = dentalOf(site).emergency;
  if (!e?.headline && !e?.firstAid?.length) return null;
  return (
    <section className="py-10 sm:py-14">
      <div className={wrap}>
        <EmergencyCard />
        <MoreLink to="emergency" label={H.emergencyMore} className="mt-3" />
      </div>
    </section>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <li className="flex gap-3"><span className="mt-0.5 shrink-0 text-[hsl(var(--ds-accent))]">{icon}</span><span>{children}</span></li>;
}

/** Map tile left (a link, no embed on the home page), the facts right. */
export function ReachSection({ tone = "plain" }: { tone?: "plain" | "tint" }) {
  const { site, lang, actions } = useSite();
  const c = site.contact || {};
  const r = dentalOf(site).reach;
  const address = biList(c, "addressLines", lang);
  const i = "h-4 w-4";
  return (
    <HSection eyebrow={H.reachEyebrow} title={H.reachTitle} tone={tone} more={{ to: "contact", label: H.reachContact }}>
      <div className="grid gap-6 lg:grid-cols-12">
        <a href={actions.map} target="_blank" rel="noopener noreferrer"
          className="group relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface-2))] p-6 lg:col-span-6">
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full text-[hsl(var(--ds-line))]" preserveAspectRatio="none" viewBox="0 0 400 240">
            <path d="M-10 170 C 90 140, 150 200, 240 150 S 380 90, 420 110" fill="none" stroke="currentColor" strokeWidth="14" />
            <path d="M120 -10 C 140 60, 110 140, 160 250" fill="none" stroke="currentColor" strokeWidth="8" />
            <path d="M300 -10 L 280 250" fill="none" stroke="currentColor" strokeWidth="5" />
            <path d="M-10 60 L 420 40" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
          <span className="absolute left-1/2 top-[42%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[hsl(var(--ds-cta))] text-[hsl(var(--ds-on-cta))] shadow-[var(--dn-shadow-2)] transition-transform group-hover:-translate-y-[60%]">
            <MapPin className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="relative inline-flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--ds-surface))] px-4 py-2 text-sm font-semibold shadow-[var(--dn-shadow-1)]">
            <Navigation className="h-4 w-4" aria-hidden="true" />{tr(H.mapOpen, lang)}
          </span>
        </a>
        <div className="dn-tile p-6 sm:p-8 lg:col-span-6">
          <OpenNowChip className="mb-4" />
          <p className="dn-h3 !text-lg">{bi(site, "instituteName", lang) || site.instituteName}</p>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed">
            {address.length > 0 && <Fact icon={<MapPin className={i} aria-hidden="true" />}>{address.join(", ")}</Fact>}
            {bi(c, "landmark", lang) && <Fact icon={<Landmark className={i} aria-hidden="true" />}>{bi(c, "landmark", lang)}</Fact>}
            {bi(r, "transit", lang) && <Fact icon={<Bus className={i} aria-hidden="true" />}>{bi(r, "transit", lang)}</Fact>}
            {bi(r, "parking", lang) && <Fact icon={<Car className={i} aria-hidden="true" />}>{bi(r, "parking", lang)}</Fact>}
            {bi(r, "access", lang) && <Fact icon={<Accessibility className={i} aria-hidden="true" />}>{bi(r, "access", lang)}</Fact>}
            {bi(c, "hours", lang) && <Fact icon={<Clock className={i} aria-hidden="true" />}><strong className="font-semibold">{tr(H.reachHours, lang)}: </strong>{bi(c, "hours", lang)}</Fact>}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[hsl(var(--ds-line))] pt-5">
            <BookButton />
            <CallLink className="px-2 text-sm" />
          </div>
        </div>
      </div>
    </HSection>
  );
}

export function FaqSection({ tone = "plain" }: { tone?: "plain" | "tint" }) {
  const { site } = useSite();
  const list = withText(site.faq, "title").slice(0, 5);
  if (!list.length) return null;
  return (
    <HSection tone={tone}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <FaqHead />
        </div>
        <div className="lg:col-span-8">
          <FaqList items={list} />
          <Disclaimer c={DISCLAIMER.info} className="mt-5" />
        </div>
      </div>
    </HSection>
  );
}

function FaqHead() {
  const { lang } = useSite();
  return (
    <>
      <p className="dn-eyebrow">{tr(H.faqEyebrow, lang)}</p>
      <h2 className="dn-h2 mt-3"><Accent text={tr(H.faqTitle, lang)} /></h2>
      <MoreLink to="faq" label={H.faqAll} className="mt-4" />
    </>
  );
}

/* ── The closing booking band ──────────────────────────────────────────── */

/** Luxury on surface2; clinical navy; calm teal (sand CTA); kids sky. Step-1 chips, then the three actions. */
export function BookingBandHome() {
  const { site, lang, family, variant } = useSite();
  const { open } = useBooking();
  const d = dentalOf(site);
  const light = family === "luxury";
  const chain = (d.branches || []).length >= 2;
  const reasons = (d.booking?.reasons?.length ? d.booking.reasons : DEFAULT_REASONS).filter((r) => r.id !== "not-sure").slice(0, 6);
  const title = family === "luxury" ? H.bandLux : family === "calm" ? H.bandCalm : variant === "c" ? H.bandKids : H.bandClinical;
  const chip = light
    ? "border-[hsl(var(--ds-rule))] bg-[hsl(var(--ds-surface))] hover:border-[hsl(var(--ds-accent))]"
    : "border-white/25 bg-white/[0.06] hover:bg-white/[0.14]";
  return (
    <section className="py-12 sm:py-20">
      <div className={wrap}>
      <div className={"relative mx-auto flex flex-col items-center overflow-hidden rounded-[calc(var(--ds-radius)*1.6)] px-5 py-14 text-center sm:px-10 sm:py-20 " + (light ? "dn-tint border border-[hsl(var(--ds-rule)/0.6)]" : "dn-band")}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.06]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/[0.05]" />
      <div className="relative flex max-w-3xl flex-col items-center">
        <h2 className="dn-h2"><Accent text={tr(title, lang)} /></h2>
        <p className={"mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed " + (light ? "text-[hsl(var(--ds-ink-soft))]" : "dn-soft")}>{tr(chain ? H.bandChain : H.bandLead, lang)}</p>
        {chain && family === "calm" ? (
          <div className="flex w-full justify-center text-left"><BranchPicker /></div>
        ) : (
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {reasons.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => open({ reason: r.id, treatment: r.treatment })}
                  className={"inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors " + chip}>
                  <DentalGlyph name={r.urgent ? "emergency" : r.icon} className="h-4 w-4" />{bi(r, "label", lang)}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <BookButton size="lg" tone={family === "calm" ? "hero" : "cta"} className="px-7">{family === "clinical" ? undefined : tr(DENTAL_COPY.bookConsult, lang)}</BookButton>
          <WhatsAppButton size="lg" variant={light ? "outline" : "solid"} />
          <CallLink className={"justify-center px-3 " + (light ? "" : "text-current")} />
        </div>
      </div>
      </div>
      </div>
    </section>
  );
}

/** Luxury and calm: patients from abroad, one CTA to the International page. */
export function InternationalBand() {
  const { site, lang, href } = useSite();
  const intl = dentalOf(site).international;
  const to = href("international");
  if (!to || !intl) return null;
  return (
    <HSection tone="band" tight>
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="dn-eyebrow">{tr(H.intlEyebrow, lang)}</p>
          <h2 className="dn-h2 mt-3"><Accent text={tr(H.intlTitle, lang)} /></h2>
          {bi(intl, "intro", lang) && <p className="dn-soft mt-4 leading-relaxed">{bi(intl, "intro", lang)}</p>}
        </div>
        <SiteLink to={to} className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-full border border-current px-7 font-semibold transition-colors hover:bg-white/10">
          {tr(H.intlCta, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SiteLink>
      </div>
    </HSection>
  );
}

/** Luxury: a full-bleed 21:9 room photo with a thin gold inset frame, no text on it. */
export function StudioBand() {
  const { site } = useSite();
  const p = site.sectionPhotos?.campus || photoBy(site, /studio|lounge|reception|interior|clinic|room/i)?.src;
  if (!p || p === site.heroImage) return null;
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6">
      <div className="dn-inset relative overflow-hidden rounded-[var(--ds-radius)]">
        <DemoPhoto src={p} ratio="auto" sizes="100vw" className="aspect-[4/3] sm:aspect-[21/9]" />
      </div>
    </div>
  );
}

/** Chains: family care plans, factual prices, no discount words. */
export function PlansSection() {
  const { site, lang } = useSite();
  const list = withText(dentalOf(site).plans, "name");
  if (!list.length) return null;
  return (
    <HSection eyebrow={H.feesEyebrow} title={H.plansTitle} tone="tint" more={{ to: "fees", label: H.feesAll }}>
      <div className="grid gap-5 md:grid-cols-3">
        {list.map((p, i) => (
          <article key={i} className="dn-tile flex flex-col p-6">
            <h3 className="dn-h3">{bi(p, "name", lang)}</h3>
            <p className="mt-3"><span className="text-3xl font-light [font-family:var(--ds-display)]">{bi(p, "price", lang)}</span> <span className="text-sm text-[hsl(var(--ds-ink-soft))]">{bi(p, "period", lang)}</span></p>
            <ul className="mt-5 flex-1 space-y-2 border-t border-[hsl(var(--ds-line))] pt-5 text-[15px]">
              {biList(p, "includes", lang).map((x, j) => <li key={j} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" />{x}</li>)}
            </ul>
            {bi(p, "note", lang) && <p className="mt-4 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(p, "note", lang)}</p>}
          </article>
        ))}
      </div>
    </HSection>
  );
}

const COLS: Record<number, string> = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 6: "sm:grid-cols-2 lg:grid-cols-3" };

/** Points on a hairline list: corporate (chains), audience (implants), the chain's one standard. */
export function PointsSection({ points, eyebrow, title, lead, tone = "plain", numbered = false }: {
  points: DemoPoint[] | undefined;
  eyebrow: Bilingual;
  title: Bilingual;
  lead?: Bilingual;
  tone?: "plain" | "tint" | "band";
  numbered?: boolean;
}) {
  const { lang } = useSite();
  const list = withText(points, "title");
  if (!list.length) return null;
  const band = tone === "band";
  return (
    <HSection eyebrow={eyebrow} title={title} lead={lead} tone={tone}>
      <ul className={"grid gap-5 " + (COLS[list.length] || "sm:grid-cols-2 lg:grid-cols-3")}>
        {list.map((p, i) => (
          <li key={i} className={band ? "border-t border-white/25 pt-5" : "dn-tile p-6"}>
            {numbered && <span className={"text-sm font-semibold " + (band ? "text-[hsl(var(--ds-hero-accent))]" : "text-[hsl(var(--ds-accent))]")}>{String(i + 1).padStart(2, "0")}</span>}
            <h3 className={"dn-h3 !text-lg " + (numbered ? "mt-2" : "")}>{bi(p, "title", lang)}</h3>
            {bi(p, "body", lang) && <p className={"mt-2 text-[15px] leading-relaxed " + (band ? "dn-soft" : "text-[hsl(var(--ds-ink-soft))]")}>{bi(p, "body", lang)}</p>}
          </li>
        ))}
      </ul>
    </HSection>
  );
}
