/**
 * Small pieces the Treatments index and the treatment page share (PAGES-A,
 * 28 Sep 2026): the accent phrase, a section heading for the article
 * column, a check list, a vertical step timeline and fact tiles. Colours are
 * theme tokens only, so every family (clinical, luxury, calm, kids) keeps its
 * own look and the pairs measured in DENTAL-DESIGN.md.
 */

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { DemoPoint } from "@/lib/cms/types";
import { bi, withText } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";

/** "a *b* c": the starred phrase in Instrument Serif italic, in the hero accent. */
export function Accent({ text, tone = "hero" }: { text: string; tone?: "hero" | "accent" }) {
  return (
    <>
      {text.split(/\*([^*]+)\*/).map((part, i) =>
        i % 2 ? (
          <em key={i} className={`font-normal italic ${tone === "hero" ? "text-[hsl(var(--ds-hero-accent))]" : "text-[hsl(var(--ds-accent))]"}`}
            style={{ fontFamily: '"Instrument Serif", var(--ds-serif)', fontSize: "1.04em" }}>{part}</em>
        ) : part,
      )}
    </>
  );
}

export const eyebrowCls = "text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]";
export const h2Cls = "text-[clamp(1.6rem,1.25rem+1.4vw,2.25rem)] leading-[1.15] tracking-[-0.01em] [font-family:var(--ds-display)]";

/** A heading inside the article column; `id` is the on-page anchor. */
export function ColHead({ id, eyebrow, title, lead }: { id?: string; eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode }) {
  return (
    <header id={id} className="scroll-mt-28">
      {eyebrow && <p className={eyebrowCls}>{eyebrow}</p>}
      <h2 className={`${eyebrow ? "mt-2" : ""} ${h2Cls}`}>{title}</h2>
      {lead && <p className="mt-3 max-w-[60ch] text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
    </header>
  );
}

/** Ticked items in a soft card grid. */
export function CheckList({ items, cols = 2 }: { items: string[]; cols?: 1 | 2 }) {
  if (!items.length) return null;
  return (
    <ul className={`mt-6 grid gap-3 ${cols === 2 ? "sm:grid-cols-2" : ""}`}>
      {items.map((s, i) => (
        <li key={i} className="flex items-start gap-3 rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] p-4">
          <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="leading-relaxed">{s}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps down a hairline; reads well in a narrow column and on a phone. */
export function Timeline({ steps }: { steps: DemoPoint[] | undefined }) {
  const { lang } = useSite();
  const list = withText(steps, "title");
  if (!list.length) return null;
  return (
    <ol className="relative mt-8">
      {list.map((s, i) => (
        <li key={i} className="relative grid grid-cols-[2.5rem_1fr] gap-4 pb-8 last:pb-0">
          {i < list.length - 1 && <span aria-hidden="true" className="absolute left-[1.25rem] top-11 bottom-1 w-px bg-[hsl(var(--ds-line))]" />}
          <span aria-hidden="true" className="relative grid h-10 w-10 place-items-center rounded-full border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-sm font-semibold text-[hsl(var(--ds-accent))] [font-family:var(--ds-display)]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="pt-1.5">
            <h3 className="text-lg font-semibold leading-snug">{bi(s, "title", lang)}</h3>
            {bi(s, "body", lang) && <p className="mt-1.5 max-w-[60ch] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(s, "body", lang)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Label over value, in bordered tiles. Items with no value are dropped. */
export function FactTiles({ items, className = "" }: { items: { label: string; value: string; icon?: ReactNode }[]; className?: string }) {
  const list = items.filter((f) => f.value);
  if (!list.length) return null;
  return (
    <dl className={`grid gap-3 sm:grid-cols-2 ${list.length >= 3 ? "lg:grid-cols-3" : ""} ${className}`}>
      {list.map((f, i) => (
        <div key={i} className="rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] p-5">
          <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{f.icon}{f.label}</dt>
          <dd className="mt-2 leading-relaxed">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
