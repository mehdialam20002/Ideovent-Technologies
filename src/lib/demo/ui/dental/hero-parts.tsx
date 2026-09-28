/**
 * THE HERO'S PIECES, composed per variant by ./hero.tsx: the fact pill, the
 * headline, the lead, the CTAs per family, the trust rows (luxury three with
 * hairlines, clinical four numerals, calm credential), the floating cards,
 * the reason card, the branch picker, the kids shapes and the scroll cue.
 * Every sample figure sits above a SampleNote "stats" and never counts up.
 */

import { useState, type CSSProperties, type ReactNode } from "react";
import { prefersReducedMotion } from "@/pages/site/kit/motion";
import { ArrowRight, ChevronRight, Clock, MapPin, MessageCircle, Star } from "lucide-react";
import type { DentalHero } from "@/lib/cms/types";
import { bi, tr, trf, withText } from "@/lib/demo/site/bilingual";
import { branchSlug, useSite } from "@/lib/demo/site/context";
import { Bi } from "@/pages/site/kit/Text";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { BookButton, CallLink } from "./actions";
import { useBooking } from "./booking";
import { DEFAULT_REASONS } from "./BookingFlow";
import { BOOKING_COPY, DENTAL_COPY } from "./copy";
import { HERO_COPY } from "./hero-copy";
import { DentalGlyph } from "./icons";
import { dentalContact, dentalOf, leadDoctor, whatsappHref } from "./logic";

export type HeroTone = "lux" | "clinical" | "calm" | "kids";

/** Stagger index for the entrance (CSS reads --i). */
export const at = (i: number) => ({ "--i": i }) as CSSProperties;

export function useHero(): DentalHero {
  return dentalOf(useSite().site).hero || {};
}

/** The fact pill (luxury, kids) or the eyebrow line (clinical, calm). Never an award. */
export function HeroPill({ tone }: { tone: HeroTone }) {
  const hero = useHero();
  const { lang } = useSite();
  if (!bi(hero, "pill", lang)) return null;
  if (tone === "lux") {
    return (
      <p className="dn-rise inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ds-rule))] bg-white/70 px-4 py-1.5 text-[13px] font-semibold text-[hsl(var(--ds-accent))] backdrop-blur-sm" style={at(0)}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--ds-rule))]" />
        <Bi of={hero} k="pill" />
      </p>
    );
  }
  if (tone === "kids") {
    return (
      <p className="dn-rise inline-flex items-center gap-2 rounded-full bg-[hsl(var(--ds-surface-2))] px-4 py-1.5 text-sm font-semibold text-[hsl(var(--ds-brand))]" style={at(0)}>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[hsl(var(--ds-rule))]" />
        <Bi of={hero} k="pill" />
      </p>
    );
  }
  if (tone === "calm") {
    return <Bi of={hero} k="pill" as="p" className="dn-rise text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--ds-hero-soft))]" />;
  }
  return (
    <p className="dn-rise flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ds-hero-accent))]" style={at(0)}>
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--ds-hero-accent))]" />
      <Bi of={hero} k="pill" />
    </p>
  );
}

/** The h1 (one *accent* phrase) and the clinic's full name for screen readers and search. */
export function HeroTitle({ className = "" }: { className?: string }) {
  const hero = useHero();
  const { site, lang } = useSite();
  const text = bi(hero, "headline", lang);
  return (
    <>
      {text
        ? <Bi of={hero} k="headline" as="h1" accent className={`dn-rise mt-5 leading-[1.05] [font-family:var(--ds-display)] ${className}`} />
        : <h1 className={`dn-rise mt-5 leading-[1.05] [font-family:var(--ds-display)] ${className}`}>{bi(site, "instituteName", lang) || site.instituteName}</h1>}
      {text && <p className="sr-only">{bi(site, "instituteName", lang) || site.instituteName}</p>}
    </>
  );
}

export function HeroLead({ className = "" }: { className?: string }) {
  const hero = useHero();
  const { site, lang } = useSite();
  if (!bi(hero, "lead", lang)) return <Bi of={site} k="tagline" as="p" className={`dn-rise ${className}`} />;
  return <Bi of={hero} k="lead" as="p" className={`dn-rise ${className}`} />;
}

/** Five small stars in the rule colour, filled to the rating (4.7 fills 94%). */
export function Stars({ value = 5, className = "h-3.5 w-3.5" }: { value?: number | string; className?: string }) {
  const v = Number(String(value).replace(",", "."));
  const pct = Number.isFinite(v) ? Math.max(0, Math.min(100, (v / 5) * 100)) : 100;
  const row = (fill: boolean) => (
    <span className="flex w-max gap-0.5">
      {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`shrink-0 ${className} ${fill ? "fill-[hsl(var(--ds-rule))] text-[hsl(var(--ds-rule))]" : "text-[hsl(var(--ds-rule)/0.45)]"}`} />)}
    </span>
  );
  return (
    <span className="relative inline-block align-middle" aria-hidden="true">
      {row(false)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>{row(true)}</span>
    </span>
  );
}

/** "212 reviews on Google", or the source alone. */
export function useRatingLine(): { value?: string; line: string; source: string; url?: string } | null {
  const { site, lang } = useSite();
  const r = site.rating;
  if (!r?.value) return null;
  const source = bi(r, "source", lang);
  const line = r.count ? trf(HERO_COPY.reviewsOn, lang, { count: r.count }) : source || tr(HERO_COPY.ratingOn, lang);
  return { value: r.value, line, source: r.count ? source : "", url: r.url };
}

/** The source under a rating line: "Google reviews, checked Sep 2026". */
function Src({ s, className = "" }: { s?: string; className?: string }) {
  return s ? <span className={`block text-[11px] leading-snug opacity-80 ${className}`}>{s}</span> : null;
}

/** Luxury: three items split by gold hairlines, centred, SampleNote under. */
export function LuxTrust({ align = "center" }: { align?: "center" | "start" }) {
  const { site, lang } = useSite();
  const rating = useRatingLine();
  const stats = withText(site.stats, "label").slice(0, rating ? 2 : 3);
  if (!rating && !stats.length) return null;
  const cell = "flex flex-col items-center gap-1 px-3 sm:px-8 text-center";
  return (
    <div className={`dn-rise-cta mt-10 flex flex-col ${align === "center" ? "items-center" : "items-start"}`} style={at(5)}>
      <dl className="dn-trust-lux grid w-full max-w-xl grid-cols-3 sm:flex sm:w-auto">
        {rating && (
          <div className={cell}>
            <dt className="order-3 text-[13px] leading-snug text-[hsl(var(--ds-ink-soft))]">{rating.line}<Src s={rating.source} /></dt>
            <dd className="order-1"><Stars value={rating.value} /></dd>
            <dd className="order-2 text-[1.75rem] leading-none [font-family:var(--ds-display)] [font-variant-numeric:lining-nums]">{rating.value}</dd>
          </div>
        )}
        {stats.map((s, i) => (
          <div key={i} className={cell}>
            {rating && <dd aria-hidden="true" className="order-0 h-3.5" />}
            <dt className="order-2 text-[13px] leading-snug text-[hsl(var(--ds-ink-soft))]">{bi(s, "label", lang)}</dt>
            <dd className="order-1 text-[1.75rem] leading-none [font-family:var(--ds-display)] [font-variant-numeric:lining-nums]">{s.value}</dd>
          </div>
        ))}
      </dl>
      <SampleNote block="stats" className={`mt-5 ${align === "center" ? "justify-center" : ""}`} />
    </div>
  );
}

/** Clinical: up to four numerals (rating first) as Sora 600 over 13px labels. */
export function ClinicalStats({ onDark = false }: { onDark?: boolean }) {
  const { site, lang } = useSite();
  const rating = useRatingLine();
  const stats = withText(site.stats, "label").slice(0, rating ? 3 : 4);
  if (!rating && !stats.length) return null;
  const soft = onDark ? "text-[hsl(var(--ds-hero-soft))]" : "text-[hsl(var(--ds-ink-soft))]";
  return (
    <div className="dn-rise-cta mt-9" style={at(5)}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[hsl(var(--ds-line))] pt-6 sm:grid-cols-4">
        {rating && (
          <div className="flex flex-col">
            <dt className={`order-2 mt-1 text-[13px] leading-snug ${soft}`}>{rating.line}<Src s={rating.source} /></dt>
            <dd className="order-1 flex items-center gap-1.5 text-[28px] font-semibold leading-none tracking-[-0.02em] [font-family:var(--ds-display)]">
              <Star className="h-5 w-5 fill-[hsl(var(--ds-rule))] text-[hsl(var(--ds-rule))]" aria-hidden="true" />{rating.value}
            </dd>
          </div>
        )}
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col">
            <dt className={`order-2 mt-1 text-[13px] leading-snug ${soft}`}>{bi(s, "label", lang)}</dt>
            <dd className="order-1 text-[28px] font-semibold leading-none tracking-[-0.02em] [font-family:var(--ds-display)]">{s.value}</dd>
          </div>
        ))}
      </dl>
      <SampleNote block="stats" onDark={onDark} className="mt-4" />
    </div>
  );
}

/* ── Actions per family ─────────────────────────────────────────────────── */

function WaText({ className = "", children }: { className?: string; children?: ReactNode }) {
  const { site, lang } = useSite();
  const href = whatsappHref(dentalContact(site).whatsapp, trf(DENTAL_COPY.waHello, lang, { clinic: site.instituteName }));
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-2 font-semibold underline decoration-1 underline-offset-4 ${className}`}>
      <MessageCircle className="h-4 w-4" aria-hidden="true" />{children || tr(HERO_COPY.waPrefer, lang)}
    </a>
  );
}

/**
 * Luxury: Book a consultation (gold pill) + Call (outline pill), WhatsApp as a
 * quiet line under. Clinical: Book + WhatsApp outline + Call text. Calm: sand
 * pill + outline call pill + WhatsApp text. Kids: coral pill + sky outline.
 */
export function HeroCtas({ tone, center = false }: { tone: HeroTone; center?: boolean }) {
  const { site, lang } = useSite();
  const wa = whatsappHref(dentalContact(site).whatsapp, trf(DENTAL_COPY.waHello, lang, { clinic: site.instituteName }));
  const row = `flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center ${center ? "sm:justify-center" : ""}`;
  if (tone === "lux") {
    return (
      <div className={`dn-rise-cta mt-9 flex w-full flex-col ${center ? "items-center" : "items-start"}`} style={at(3)}>
        <div className={row}>
          <BookButton size="lg" className="px-7 shadow-[var(--dn-shadow-1)]">{tr(DENTAL_COPY.bookConsult, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" /></BookButton>
          <CallLink className="min-h-[52px] justify-center rounded-full border-[1.5px] border-[hsl(var(--ds-accent))] bg-white/60 px-7 text-[hsl(var(--ds-ink))] backdrop-blur-sm transition-colors hover:bg-white" />
        </div>
        <WaText className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))] hover:text-[hsl(var(--ds-ink))]" />
      </div>
    );
  }
  if (tone === "calm") {
    return (
      <div className={`dn-rise-cta mt-8 ${row}`} style={at(3)}>
        <BookButton size="lg" tone="hero" className="px-7">{tr(DENTAL_COPY.bookConsult, lang)}</BookButton>
        <CallLink className="min-h-[52px] justify-center rounded-full border border-[hsl(var(--ds-hero-ink)/0.6)] px-7 text-[hsl(var(--ds-hero-ink))] transition-colors hover:bg-white/10" />
        <WaText className="text-[hsl(var(--ds-hero-ink))] sm:ml-2">{tr(HERO_COPY.waText, lang)}</WaText>
      </div>
    );
  }
  if (tone === "kids") {
    return (
      <div className={`dn-rise-cta mt-8 ${row}`} style={at(3)}>
        <BookButton size="lg" className="px-7 shadow-[var(--dn-shadow-1)]">{tr(HERO_COPY.kidsBook, lang)}</BookButton>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-[1.5px] border-[hsl(var(--ds-brand))] bg-white px-7 font-semibold text-[hsl(var(--ds-brand))] transition-colors hover:bg-[hsl(var(--ds-surface-2))]">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />{tr(DENTAL_COPY.whatsappNow, lang)}
          </a>
        )}
      </div>
    );
  }
  return (
    <div className={`dn-rise-cta mt-8 ${row}`} style={at(3)}>
      <BookButton size="lg" className="px-6 shadow-[var(--dn-shadow-1)]" />
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--dn-btn-radius)] border-[1.5px] border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-6 font-semibold text-[hsl(var(--ds-ink))] transition-colors hover:border-[var(--dn-wa)]">
          <MessageCircle className="h-4 w-4 text-[var(--dn-wa)]" aria-hidden="true" />{tr(DENTAL_COPY.whatsappNow, lang)}
        </a>
      )}
      <CallLink className="justify-center px-2 text-[hsl(var(--ds-ink))] underline-offset-4 hover:underline" />
    </div>
  );
}

/** Calm: the lead surgeon's degree and registration, and the rating chip. */
export function CalmCredential() {
  const { site, lang } = useSite();
  const hero = useHero();
  const doc = leadDoctor(site);
  const rating = useRatingLine();
  const cred = bi(hero, "credential", lang)
    || (doc ? [bi(doc, "name", lang), bi(doc, "qualification", lang), bi(doc, "regNo", lang)].filter(Boolean).join(", ") : "");
  if (!cred && !rating) return null;
  return (
    <div className="dn-rise-cta mt-8 flex flex-col gap-3 border-t border-white/20 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6" style={at(5)}>
      {cred && <p className="text-sm text-[hsl(var(--ds-hero-soft))]">{cred}</p>}
      {rating && (
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-sm text-[hsl(var(--ds-hero-ink))]">
          <Star className="h-4 w-4 fill-[hsl(var(--ds-hero-accent))] text-[hsl(var(--ds-hero-accent))]" aria-hidden="true" />
          <strong className="font-semibold">{rating.value}</strong><span className="text-[hsl(var(--ds-hero-soft))]">{rating.line}{rating.source ? `, ${rating.source}` : ""}</span>
        </p>
      )}
      <SampleNote block="stats" onDark className="w-full" />
    </div>
  );
}

/** Kids: the pedodontist's line under the CTAs. */
export function KidsLead() {
  const { site, lang } = useSite();
  const doc = leadDoctor(site);
  const rating = useRatingLine();
  return (
    <div className="dn-rise-cta mt-8" style={at(5)}>
      {doc && (
        <p className="text-sm text-[hsl(var(--ds-ink-soft))]">
          <strong className="font-semibold text-[hsl(var(--ds-ink))]">{bi(doc, "name", lang)}</strong>
          {[bi(doc, "qualification", lang), bi(doc, "specialisation", lang)].filter(Boolean).map((x, i) => <span key={i}>, {x}</span>)}
        </p>
      )}
      {rating && <p className="mt-2 flex items-center gap-2 text-sm"><Stars value={rating.value} /><strong>{rating.value}</strong><span className="text-[hsl(var(--ds-ink-soft))]">{rating.line}{rating.source ? `, ${rating.source}` : ""}</span></p>}
      <SampleNote block="stats" className="mt-3" />
    </div>
  );
}

/* ── Floating cards, reason card, branch picker ─────────────────────────── */

/** Clinical split, top-left of the photo: the next slot (sample on a template). Opens booking. */
export function NextSlotCard({ className = "" }: { className?: string }) {
  const hero = useHero();
  const { lang } = useSite();
  const { open } = useBooking();
  if (!bi(hero, "nextSlot", lang)) return null;
  return (
    <button type="button" onClick={() => open()} className={`dn-float dn-fade-late flex items-center gap-3 px-4 py-3 text-left transition-transform hover:-translate-y-0.5 ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ds-cta)/0.1)] text-[hsl(var(--ds-cta))]"><Clock className="h-5 w-5" aria-hidden="true" /></span>
      <span className="leading-tight">
        <Bi of={hero} k="nextSlot" className="block text-sm font-semibold text-[hsl(var(--ds-ink))]" />
        <span className="mt-0.5 block text-xs text-[hsl(var(--ds-ink-soft))]">{tr(HERO_COPY.bookSlot, lang)}</span>
      </span>
    </button>
  );
}

/** Clinical split, bottom-right: the rating chip, linked to the live listing when there is one. */
export function RatingChip({ className = "" }: { className?: string }) {
  const rating = useRatingLine();
  if (!rating) return null;
  const body = (
    <>
      <span className="text-2xl font-semibold leading-none [font-family:var(--ds-display)]">{rating.value}</span>
      <span className="leading-tight"><Stars value={rating.value} className="h-3 w-3" /><span className="mt-0.5 block text-xs text-[hsl(var(--ds-ink-soft))]">{rating.line}{rating.source ? `, ${rating.source}` : ""}</span></span>
    </>
  );
  const cls = `dn-float dn-fade-late flex items-center gap-3 px-4 py-3 ${className}`;
  return rating.url
    ? <a href={rating.url} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
    : <div className={cls}>{body}</div>;
}

/** Clinical b: "What do you need?" with six reason rows, urgent first. Each row is booking step 1. */
export function ReasonCard({ className = "" }: { className?: string }) {
  const { site, lang } = useSite();
  const { open } = useBooking();
  const all = dentalOf(site).booking?.reasons?.length ? dentalOf(site).booking!.reasons! : DEFAULT_REASONS;
  const list = [...all].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent)).filter((r) => r.id !== "not-sure").slice(0, 6);
  return (
    <div className={`dn-float dn-rise-cta overflow-hidden rounded-[var(--ds-radius)] ${className}`} style={at(4)}>
      <p className="border-b border-[hsl(var(--ds-line))] px-5 py-4 text-base font-semibold [font-family:var(--ds-display)]">{tr(BOOKING_COPY.whatTitle, lang)}</p>
      <ul className="divide-y divide-[hsl(var(--ds-line))]">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => open({ reason: r.id, treatment: r.treatment })}
              className="group flex min-h-[52px] w-full items-center gap-3 px-5 py-3 text-left text-[15px] font-medium transition-colors hover:bg-[hsl(var(--ds-surface-2))]">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${r.urgent ? "bg-[var(--dn-emergency)] text-white" : "bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]"}`}>
                <DentalGlyph name={r.urgent ? "emergency" : r.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">{bi(r, "label", lang)}</span>
              <ChevronRight className="h-4 w-4 text-[hsl(var(--ds-ink-soft))] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => open({ reason: "not-sure" })}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 bg-[hsl(var(--ds-surface-2))] px-5 py-3 text-left text-sm font-semibold text-[hsl(var(--ds-accent))]">
        {tr(HERO_COPY.notSure, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Calm b (chains): one white pill, a clinic select and Find clinic. Booking step 1 with the branch set. */
export function BranchPicker() {
  const { site, lang } = useSite();
  const { open } = useBooking();
  const branches = withText(dentalOf(site).branches, "name");
  const [pick, setPick] = useState("");
  if (branches.length < 2) return null;
  return (
    <form className="dn-rise-cta mt-6 flex w-full max-w-xl flex-col gap-2 rounded-[28px] bg-white p-2 text-[hsl(var(--ds-ink))] shadow-[var(--dn-shadow-2)] sm:flex-row sm:items-center sm:rounded-full" style={at(4)}
      onSubmit={(e) => { e.preventDefault(); open(pick ? { branch: pick } : undefined); }}>
      <label className="flex min-h-[48px] flex-1 items-center gap-2 pl-4">
        <MapPin className="h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
        <span className="sr-only">{tr(HERO_COPY.clinicLabel, lang)}</span>
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-[44px] w-full min-w-0 flex-1 cursor-pointer bg-transparent pr-2 text-[15px] font-medium outline-none">
          <option value="">{tr(HERO_COPY.chooseClinic, lang)}</option>
          {branches.map((b) => <option key={branchSlug(b)} value={branchSlug(b)}>{[bi(b, "name", lang), bi(b, "city", lang)].filter(Boolean).join(", ")}</option>)}
        </select>
      </label>
      <button type="submit" className="dn-book inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 font-semibold" data-tone="cta">
        {tr(HERO_COPY.findClinic, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

/** Kids: a sun, a star and a smiling tooth, floating 6px for two slow cycles. Decorative. */
export function KidsShapes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg viewBox="0 0 64 64" className="dn-bob absolute -left-2 top-[8%] h-14 w-14 sm:h-16 sm:w-16" style={{ "--delay": "0s" } as CSSProperties}>
        <circle cx="32" cy="32" r="13" fill="hsl(var(--ds-rule))" />
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x="30.5" y="6" width="3" height="9" rx="1.5" fill="hsl(var(--ds-rule))" transform={`rotate(${i * 45} 32 32)`} />)}
      </svg>
      <svg viewBox="0 0 48 48" className="dn-bob absolute right-[2%] top-[4%] h-10 w-10 sm:h-12 sm:w-12" style={{ "--delay": "1.2s" } as CSSProperties}>
        <path d="M24 4l5.6 12.2 13.4 1.4-10 9 2.9 13.2L24 33.2l-11.9 6.6L15 26.6l-10-9 13.4-1.4z" fill="hsl(var(--ds-cta))" />
      </svg>
      <svg viewBox="0 0 64 64" className="dn-bob absolute -bottom-3 right-[12%] h-16 w-16 sm:h-20 sm:w-20" style={{ "--delay": "2.4s" } as CSSProperties}>
        <path d="M14 14c6-6 13-4 18-1 5-3 12-5 18 1 6 7 3 17 0 25-2 7-3 16-8 16-4 0-4-10-10-10s-6 10-10 10c-5 0-6-9-8-16-3-8-6-18 0-25z" fill="#fff" stroke="hsl(var(--ds-brand))" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="25" cy="27" r="2.5" fill="hsl(var(--ds-ink))" /><circle cx="39" cy="27" r="2.5" fill="hsl(var(--ds-ink))" />
        <path d="M25 34c3 4 11 4 14 0" fill="none" stroke="hsl(var(--ds-ink))" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** "Discover" and a drawing line (not a round arrow button, which reads as a third CTA). */
export function ScrollCue({ target, className = "" }: { target: string; className?: string }) {
  const { lang } = useSite();
  return (
    <a href={`#${target}`} className={`dn-fade-late flex flex-col items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--ds-ink-soft))] hover:text-[hsl(var(--ds-ink))] ${className}`}
      onClick={(e) => { const el = document.getElementById(target); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }); } }}>
      {tr(HERO_COPY.discover, lang)}
      <span className="dn-cue-line" aria-hidden="true" />
    </a>
  );
}
