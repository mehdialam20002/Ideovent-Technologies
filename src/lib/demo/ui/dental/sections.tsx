/**
 * DENTAL SECTION PIECES: the wrapper every home and inner section uses, the
 * inner page head, the trust row, the FAQ list, the booking band and the
 * disclaimer line. STUB LEVEL: working, plain; the kit builder owns the look.
 */

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import type { DemoPoint } from "@/lib/cms/types";
import { bi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { Accordion, Breadcrumb } from "@/pages/site/kit/Text";
import { Reveal } from "@/pages/site/kit/motion";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { ActionButtons } from "./actions";

export const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

/** tone: plain (bg), tint (surface2), brand (dark band, onBrand text). */
export function DSection({ id, eyebrow, title, lead, tone = "plain", children, className = "" }: {
  id?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  tone?: "plain" | "tint" | "brand";
  children: ReactNode;
  className?: string;
}) {
  const { motion } = useSite();
  const ground = tone === "tint" ? "bg-[hsl(var(--ds-surface-2))]" : tone === "brand" ? "bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]" : "";
  const body = motion === "none" ? children : <Reveal>{children}</Reveal>;
  return (
    <section id={id} data-tone={tone} className={`py-14 sm:py-20 ${ground} ${className}`}>
      <div className={wrap}>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{eyebrow}</p>}
        {title && <h2 className="mt-2 max-w-[22ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)] leading-[1.15] [font-family:var(--ds-display)]">{title}</h2>}
        {lead && <p className="mt-3 max-w-[58ch] text-lg opacity-90">{lead}</p>}
        <div className={title || lead ? "mt-8" : ""}>{body}</div>
      </div>
    </section>
  );
}

/** The top of an inner page: crumbs, eyebrow, title, lead, optional actions. */
export function DPageHead({ eyebrow, title, lead, crumbs, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: { label: string; href?: string | null }[];
  children?: ReactNode;
}) {
  return (
    <header className="bg-[hsl(var(--ds-surface-2))] py-10 sm:py-14">
      <div className={wrap}>
        {crumbs && <Breadcrumb items={crumbs} />}
        {eyebrow && <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{eyebrow}</p>}
        <h1 className="mt-2 max-w-[22ch] text-[clamp(2rem,1.4rem+2.6vw,3.4rem)] leading-[1.08] [font-family:var(--ds-display)]">{title}</h1>
        {lead && <p className="mt-3 max-w-[58ch] text-lg text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}

/** Rating with count, then `site.stats`. SampleNote "stats" under it. Sample figures never count up. */
export function TrustRow({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  const { site, lang } = useSite();
  const r = site.rating;
  const stats = withText(site.stats, "label").slice(0, 3);
  if (!r?.value && !stats.length) return null;
  return (
    <div className={className}>
      <dl className="grid grid-cols-3 gap-4 sm:flex sm:gap-8">
        {r?.value && (
          <div>
            <dt className="sr-only">{bi(r, "source", lang) || "Rating"}</dt>
            <dd className="flex items-center gap-1 text-2xl font-semibold"><Star className="h-5 w-5 fill-[hsl(var(--ds-rule))] text-[hsl(var(--ds-rule))]" aria-hidden="true" />{r.value}</dd>
            <dd className="text-[13px] opacity-80">{[r.count, bi(r, "source", lang)].filter(Boolean).join(" ")}</dd>
          </div>
        )}
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col-reverse">
            <dt className="text-[13px] opacity-80">{bi(s, "label", lang)}</dt>
            <dd className="text-2xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <SampleNote block="stats" onDark={onDark} className="mt-3" />
    </div>
  );
}

/** Questions as an accordion, optionally one group. */
export function FaqList({ items, group }: { items: DemoPoint[] | undefined; group?: string }) {
  const { lang } = useSite();
  const list = withText(items, "title").filter((q) => !group || q.group === group);
  if (!list.length) return null;
  return <div>{list.map((q, i) => <Accordion key={i} title={bi(q, "title", lang)}>{bi(q, "body", lang)}</Accordion>)}</div>;
}

/** Heading for the closing band when a page passes none. Without it the band
 *  was a tall coloured strip holding three buttons and nothing to say why. */
const BAND_TITLE: Bilingual = { en: "Ready to book a visit?", hi: "विज़िट बुक करनी है?" };

/** A closing band drawn as an inset brand card on the page ground, so it
 *  never runs into the brand-coloured footer below it (the home band's shape). */
export function BandCard({ title, lead, children }: { title?: ReactNode; lead?: ReactNode; children: ReactNode }) {
  const { motion } = useSite();
  const body = motion === "none" ? children : <Reveal>{children}</Reveal>;
  return (
    <section className="py-12 sm:py-16">
      <div className={wrap}>
        <div data-tone="brand" className="dn-book-band relative overflow-hidden rounded-[calc(var(--ds-radius)*1.6)] bg-[hsl(var(--ds-brand))] px-5 py-10 text-[hsl(var(--ds-on-brand))] sm:px-10 sm:py-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.06]" />
          <div className="relative">
            {title && <h2 className="max-w-[24ch] text-[clamp(1.6rem,1.25rem+1.6vw,2.5rem)] leading-[1.15] [font-family:var(--ds-display)]">{title}</h2>}
            {lead && <p className="mt-3 max-w-[58ch] text-lg opacity-90">{lead}</p>}
            <div className={title || lead ? "mt-7" : ""}>{body}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The closing band on every page: a line and the three actions. */
export function BookingBand({ title }: { title?: ReactNode }) {
  const { lang } = useSite();
  return (
    <BandCard title={title ?? tr(BAND_TITLE, lang)}>
      <ActionButtons />
    </BandCard>
  );
}

/** One of the exact disclaimer strings (copy.ts DISCLAIMER). */
export function Disclaimer({ c, className = "" }: { c: Bilingual; className?: string }) {
  const { lang } = useSite();
  return <p className={`text-sm text-[hsl(var(--ds-ink-soft))] ${className}`}>{tr(c, lang)}</p>;
}
