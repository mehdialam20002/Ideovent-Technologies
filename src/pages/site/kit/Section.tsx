/**
 * SECTION RHYTHM AND CARD LANGUAGE, owned by the family.
 *
 *   classic  numbered chapters on a margin-note grid: a small-caps label rail
 *            at a quarter, content at three quarters, hairline rules, no
 *            boxes. Cards are ruled rows.
 *   modern   bands that alternate page and tint, overline plus left-aligned
 *            heading. Cards are 1px-bordered tiles that lift on hover.
 *   warm     rounded tinted "rooms" inset from the edge, centred heading,
 *            people first. Cards are chunky rounded tiles with soft shadow.
 *
 * A page writes <Section n={2} title=...> and <Card> and never branches on
 * the family for layout. Pass `n` in page order (1, 2, 3...): classic prints
 * it as the chapter number, and modern and warm use its parity to alternate
 * the ground.
 */

import { Children, type ReactNode } from "react";
import { useSite } from "@/lib/demo/site/context";
import { CountUp, Reveal } from "./motion";

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export function Section({ n, id, eyebrow, title, lead, children, tone }: {
  /** Order on the page, from 1. */
  n: number;
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  /** Force a tinted ground regardless of parity. */
  tone?: "tint" | "plain";
}) {
  const { family, motion } = useSite();
  const tinted = tone ? tone === "tint" : n % 2 === 0;
  const body = motion === "none" ? children : <Reveal>{children}</Reveal>;

  if (family === "classic") {
    return (
      <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={`${wrap} py-12 sm:py-16`}>
        <div className="grid gap-6 border-t border-[hsl(var(--ds-ink)/0.8)] pt-6 md:grid-cols-[1fr_3fr] md:gap-10">
          {/* min-w-0: a wide table or chip row scrolls inside its own box, never the page. */}
          <div className="min-w-0">
            <p className="ds-smallcaps ds-num text-sm text-[hsl(var(--ds-accent))]">{String(n).padStart(2, "0")}{eyebrow ? <> · {eyebrow}</> : null}</p>
            <h2 id={id ? `${id}-h` : undefined} className="ds-display mt-2 text-2xl leading-snug sm:text-3xl">{title}</h2>
          </div>
          <div className="min-w-0">
            {lead && <p className="mb-6 max-w-[68ch] text-lg text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
            {body}
          </div>
        </div>
      </section>
    );
  }

  if (family === "modern") {
    return (
      <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={tinted ? "bg-[hsl(var(--ds-surface-2))]" : ""}>
        <div className={`${wrap} py-14 sm:py-20`}>
          {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{eyebrow}</p>}
          <h2 id={id ? `${id}-h` : undefined} className="ds-display mt-2 max-w-3xl text-3xl sm:text-4xl">{title}</h2>
          {lead && <p className="mt-3 max-w-2xl text-lg text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
          <div className="mt-8">{body}</div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="px-4 py-4 sm:px-6">
      <div className={`mx-auto max-w-6xl rounded-[calc(var(--ds-radius)+8px)] px-5 py-12 sm:px-10 sm:py-16 ${tinted ? "bg-[hsl(var(--ds-surface-2))]" : ""}`}>
        <div className="mx-auto max-w-2xl text-center">
          {eyebrow && <p className="font-semibold text-[hsl(var(--ds-accent))]">{eyebrow}</p>}
          <h2 id={id ? `${id}-h` : undefined} className="ds-display mt-1 text-3xl sm:text-4xl">{title}</h2>
          {lead && <p className="mt-3 text-lg text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
        </div>
        <div className="mt-8">{body}</div>
      </div>
    </section>
  );
}

/** A grid of cards. Classic stacks ruled rows; the others tile. */
export function CardGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const { family } = useSite();
  if (family === "classic") {
    /* A set of exactly three (the Enquire / Visit / Apply triad) reads as one
       row on a wide screen; two columns left the third stranded below. */
    const three = cols === 3 && Children.toArray(children).filter(Boolean).length === 3;
    return <div className={`grid gap-0 sm:grid-cols-2 ${three ? "lg:grid-cols-3" : ""}`}>{children}</div>;
  }
  const c = cols === 4 ? "lg:grid-cols-4" : cols === 2 ? "" : "lg:grid-cols-3";
  return <div className={`grid gap-4 sm:grid-cols-2 ${c}`}>{children}</div>;
}

/** One card in the family's language. `interactive` turns on the hover. */
export function Card({ children, interactive, className, as: Tag = "div" }: {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const { family } = useSite();
  const pad = family === "classic" ? "py-5 pr-4" : family === "warm" ? "p-6" : "p-5";
  return (
    <Tag className={`ds-card ${pad} ${className || ""}`} data-interactive={interactive ? "" : undefined}>
      {children}
    </Tag>
  );
}

/**
 * A trust figure with its basis line, printed at body size under it. No
 * basis, no counter: the figure prints still.
 */
export function Figure({ value, label, basis }: { value: string; label: ReactNode; basis?: string }) {
  return (
    <div>
      <p className="ds-display ds-num text-4xl text-[hsl(var(--ds-brand-ink))]"><CountUp value={value} basis={basis} /></p>
      <p className="mt-1 font-semibold">{label}</p>
      {basis && <p className="mt-1 text-[hsl(var(--ds-ink-soft))]">{basis}</p>}
    </div>
  );
}

/** A two-column fact table (label, value) in the family's rule style. */
export function FactTable({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1 py-3 sm:grid-cols-[1fr_2fr] sm:gap-6">
          <dt className="text-[hsl(var(--ds-ink-soft))]">{r.label}</dt>
          <dd className="font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
