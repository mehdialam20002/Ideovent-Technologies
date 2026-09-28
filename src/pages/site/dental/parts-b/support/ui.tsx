/**
 * SMALL PIECES the support pages share: crumbs, the week's hours from the
 * structured sessions, the tap-to-load map (the coaching Contact pattern: no
 * Google request until the reader asks), filter chips, the "prefer to talk"
 * card and an icon row. Colours are theme tokens; motion is the kit's.
 */

import { useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import type { DentalSession } from "@/lib/cms/types";
import { tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import { useSite, type SiteContext } from "@/lib/demo/site/context";
import { CallLink, clock12, OpenNowChip, WhatsAppButton } from "@/lib/demo/ui/dental";
import { PB } from "./copy";

/** Home / This page. Home is always shown. */
export function crumbsFor(ctx: SiteContext, ...rest: { label: string; href?: string | null }[]) {
  const home = ctx.pages.find((p) => p.id === "home");
  return [{ label: home ? tr(home.label, ctx.lang) : "Home", href: ctx.href("home") }, ...rest];
}

/** An eyebrow label in the family's accent. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))] ${className}`}>{children}</p>;
}

/** A section heading at the h2 scale. */
export function H2({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <h2 id={id} className={`text-[clamp(1.5rem,1.2rem+1.3vw,2.25rem)] leading-[1.15] tracking-[-0.01em] [font-family:var(--ds-display)] ${className}`}>{children}</h2>;
}

/** Mon to Sun with the sessions of each day; today marked. Nothing without sessions. */
export function WeekHours({ sessions }: { sessions?: DentalSession[] }) {
  const { lang } = useSite();
  const list = (sessions || []).filter((s) => s.days?.length && s.from && s.to);
  if (!list.length) return null;
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  const base = new Date(2026, 8, 27); /* a Sunday: day n is base + n */
  const name = (d: number) => new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "long" }).format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + d));
  return (
    <dl className="divide-y divide-[hsl(var(--ds-line))] text-sm">
      {order.map((d) => {
        const s = list.filter((x) => x.days.includes(d)).sort((a, b) => a.from.localeCompare(b.from));
        const here = d === today;
        return (
          <div key={d} className={`flex items-baseline justify-between gap-4 py-2.5 ${here ? "font-semibold text-[hsl(var(--ds-ink))]" : "text-[hsl(var(--ds-ink-soft))]"}`}>
            <dt className="flex items-center gap-2">{name(d)}{here && <span className="rounded-full bg-[hsl(var(--ds-surface-2))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--ds-ink))]">{tr(PB.today, lang)}</span>}</dt>
            <dd className="text-right tabular-nums">{s.length ? s.map((x, i) => <span key={i} className="block whitespace-nowrap">{trf(PB.range, lang, { a: clock12(x.from), b: clock12(x.to) })}</span>) : tr(PB.closed, lang)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** The map: a designed tile until tapped, then the Google embed. */
export function MapEmbed({ query, href }: { query: string; href: string }) {
  const { lang } = useSite();
  const [on, setOn] = useState(false);
  return (
    <div>
      {on ? (
        <iframe title={tr(PB.openMaps, lang)} src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
          className="aspect-[4/3] w-full rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface-2))]"
          loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <button type="button" onClick={() => setOn(true)}
          className="group relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface-2))] p-6 text-center">
          <svg aria-hidden="true" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full text-[hsl(var(--ds-line))]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M-10 210 C 80 190, 140 240, 230 200 S 360 150, 420 170" /><path d="M60 -10 L 110 320" /><path d="M250 -10 C 240 90, 290 170, 270 320" />
            <path d="M-10 90 L 420 60" strokeWidth="6" opacity=".55" /><path d="M160 -10 L 190 320" strokeWidth="6" opacity=".55" />
          </svg>
          <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--ds-cta))] text-[hsl(var(--ds-on-cta))] shadow-[var(--dn-shadow-2)] transition-transform group-hover:-translate-y-0.5"><MapPin className="h-6 w-6" aria-hidden="true" /></span>
          <span className="relative font-semibold text-[hsl(var(--ds-ink))]">{tr(PB.loadMap, lang)}</span>
          <span className="relative text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB.mapNote, lang)}</span>
        </button>
      )}
      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-[hsl(var(--ds-ink))] underline underline-offset-4">
        <MapPin className="h-4 w-4" aria-hidden="true" />{tr(PB.openMaps, lang)}
      </a>
    </div>
  );
}

/** Filter chips: "All" plus each value. Toggle buttons with aria-pressed. */
export function FilterChips({ label, values, value, onChange, labelOf, allLabel }: {
  label: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
  labelOf: (v: string) => string;
  allLabel: string;
}) {
  if (values.length < 2) return null;
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {["", ...values].map((v) => (
        <button key={v || "all"} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${value === v ? "border-[hsl(var(--ds-ink))] bg-[hsl(var(--ds-ink))] text-[hsl(var(--ds-bg))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-[hsl(var(--ds-ink))] hover:border-[hsl(var(--ds-ink-soft))]"}`}>
          {v ? labelOf(v) : allLabel}
        </button>
      ))}
    </div>
  );
}

/** "Prefer to talk?": open-now chip, Call with the number, WhatsApp. */
export function TalkCard({ title = PB.talkTitle, body = PB.talkBody, className = "" }: { title?: Bilingual; body?: Bilingual; className?: string }) {
  const { lang } = useSite();
  return (
    <div className={`dn-card p-5 sm:p-6 ${className}`}>
      <p className="text-lg font-semibold">{tr(title, lang)}</p>
      <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(body, lang)}</p>
      <OpenNowChip className="mt-3" />
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <WhatsAppButton />
        <CallLink className="text-[hsl(var(--ds-ink))]" />
      </div>
    </div>
  );
}

/** Icon, small label, value. Renders nothing without a value. */
export function IconRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{label}</p>
        <div className="mt-1 text-[15px] leading-relaxed text-[hsl(var(--ds-ink))]">{children}</div>
      </div>
    </div>
  );
}
