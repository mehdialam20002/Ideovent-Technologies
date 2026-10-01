import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  THE /pricing KIT, 1 OCT 2026.

  Mehdi, the same day: "AI generated lag rha hai, mujhe bilkul aisa nahi
  chahiye". The rebuilt page keeps the site's colours, type, gold rule and card
  surfaces, and leaves out what the hero brief (seo-pricing/hero-brief.md,
  section 1) lists as the template tells: no eyebrow pills, no gradient or
  italic-serif headline words, no blurred blobs or grid behind the h1, no pill
  buttons with a glow, no fade-up on every block. Headings say what the block
  is; buttons are 48px, 8px radius, flat.
*/

/** A section's heading: a gold rule, a plain h2, one sentence under it. */
export function SectionHead({
  id,
  title,
  intro,
  className,
}: {
  id?: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rule-gold pt-8", className)}>
      <h2 id={id} className="max-w-3xl font-display text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 max-w-2xl text-base text-muted-foreground text-pretty md:text-lg">{intro}</p>}
    </div>
  );
}

/** A tick list. */
export function Ticks({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((f) => (
        <li key={f} className="flex items-start gap-3 text-sm text-foreground/90">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-pretty">{f}</span>
        </li>
      ))}
    </ul>
  );
}

/** An in-site text link with an arrow. */
export function ArrowLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:text-foreground",
        className,
      )}
    >
      {children}
      <ArrowRight
        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        aria-hidden="true"
      />
    </Link>
  );
}
