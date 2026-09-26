/**
 * SMALL KIT PRIMITIVES: bilingual text, the monogram, a photo with its
 * designed no-photo state, the empty state, action buttons, the accordion
 * and the breadcrumb. Every one reads the family from useSite(), so a page
 * never branches on the family for these.
 */

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { biLang, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { EMPTY_COPY } from "@/lib/demo/site/copy";
import { SiteLink } from "./motion";

/**
 * An institute field in the reader's language. When the text had to fall
 * back to the other language, it is wrapped in that language's `lang`, so the
 * English page's DOM carries no Devanagari outside [lang="hi"].
 */
export function Bi<T extends object>({ of, k, as: Tag = "span", className, accent }: {
  of: T | null | undefined;
  k: keyof T & string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div" | "strong";
  className?: string;
  /** Set ONE *phrase* in the serif italic accent (a school tagline does this). */
  accent?: boolean;
}) {
  const { lang } = useSite();
  const { text, lang: fellBackTo } = biLang(of, k, lang);
  if (!text) return null;
  return (
    <Tag className={className} lang={fellBackTo || undefined}>
      {accent ? withAccent(text) : text}
    </Tag>
  );
}

/** "a *b* c" -> a <em>b</em> c, in the device serif italic. */
function withAccent(text: string) {
  return text.split(/\*([^*]+)\*/).map((part, i) =>
    i % 2 ? <em key={i} className="font-normal italic text-[hsl(var(--ds-hero-accent))]" style={{ fontFamily: "var(--ds-serif)" }}>{part}</em> : part,
  );
}

/** Our copy in the reader's language. */
export function T({ c }: { c: Bilingual }) {
  const { lang } = useSite();
  return <>{tr(c, lang)}</>;
}

/** Up to two initials of the institute's name. */
export function initials(name: string): string {
  const words = (name || "").replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join("") || (name || "?").slice(0, 1)).toUpperCase();
}

/** The family's no-photo mark: engraved crest, tinted tile, or round badge. */
export function Monogram({ className, size = "lg", name }: { className?: string; size?: "sm" | "lg"; /** A person's name, when the monogram stands in for their photo. */ name?: string }) {
  const { site, family } = useSite();
  const big = size === "lg";
  const shape =
    family === "classic"
      ? "border-2 border-double border-[hsl(var(--ds-rule))] rounded-none"
      : family === "warm"
        ? "rounded-full bg-[hsl(var(--ds-surface-2))]"
        : "rounded-[var(--ds-radius)] bg-[hsl(var(--ds-surface-2))] border border-[hsl(var(--ds-line))]";
  return (
    <div aria-hidden="true" className={`flex items-center justify-center text-[hsl(var(--ds-brand-ink))] ${shape} ${big ? "h-28 w-28 text-4xl" : "h-12 w-12 text-lg"} ${className || ""}`}>
      <span className="ds-display">{initials(name?.trim() || site.instituteName)}</span>
    </div>
  );
}

/**
 * A photograph, lazy and sized, or the family's designed no-photo panel.
 * `priority` is for the hero only: eager and fetchpriority high.
 */
export function Photo({ src, alt, ratio = "4 / 3", priority, className }: {
  src?: string;
  alt: string;
  ratio?: string;
  priority?: boolean;
  className?: string;
}) {
  const { kind, lang } = useSite();
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-[hsl(var(--ds-surface-2))] p-6 text-center text-sm text-[hsl(var(--ds-ink-soft))] ${className || ""}`} style={{ aspectRatio: ratio }}>
        <Monogram size="sm" />
        <span>{tr(kind === "school" ? EMPTY_COPY.noPhoto : EMPTY_COPY.noPhotoCoaching, lang)}</span>
      </div>
    );
  }
  return (
    <div className={`ds-card-img overflow-hidden ${className || ""}`} style={{ aspectRatio: ratio }}>
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchpriority: "high" } : {})}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/** A section-sized designed empty state: says what will be here, links onward. */
export function EmptyNote({ title, body, children }: { title: Bilingual; body?: Bilingual; children?: ReactNode }) {
  const { lang } = useSite();
  return (
    <div className="ds-card p-6 sm:p-8">
      <p className="ds-display text-lg text-[hsl(var(--ds-ink))]">{tr(title, lang)}</p>
      {body && <p className="mt-2 max-w-prose text-[hsl(var(--ds-ink-soft))]">{tr(body, lang)}</p>}
      {children && <div className="mt-4 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

/** A primary or secondary action. Internal addresses use SiteLink. */
export function Action({ href, children, tone = "cta", external }: {
  href: string;
  children: ReactNode;
  tone?: "cta" | "brand" | "ghost";
  external?: boolean;
}) {
  const cls = `ds-btn ds-btn-${tone}`;
  if (external || /^(https?:|tel:|mailto:)/.test(href)) {
    return <a className={cls} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
  }
  return <SiteLink to={href} className={cls}>{children}</SiteLink>;
}

/** One question and answer. Closed by default. */
export function Accordion({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="ds-acc border-b border-[hsl(var(--ds-line))]" data-open={open ? "" : undefined}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold text-[hsl(var(--ds-ink))]">
        <span>{title}</span>
        <ChevronDown className="ds-acc-chev h-5 w-5 shrink-0" aria-hidden="true" />
      </button>
      <div id={id} className="ds-acc-body" role="region">
        <div><div className="pb-4 text-[hsl(var(--ds-ink-soft))]">{children}</div></div>
      </div>
    </div>
  );
}

/** Home > Courses > JEE two year. Each crumb is a page the record shows. */
export function Breadcrumb({ items }: { items: { label: string; href?: string | null }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[hsl(var(--ds-ink-soft))]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.href ? <SiteLink to={it.href} className="underline-offset-4 hover:underline">{it.label}</SiteLink> : <span aria-current="page">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
