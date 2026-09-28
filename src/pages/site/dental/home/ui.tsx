/**
 * HOME PRIMITIVES: the section wrapper (eyebrow, accented title, lead, a
 * "see all" link on the right), the accent renderer and the arrow link.
 * Used by the home sections and by About, Doctors and Technology.
 */

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { tr, type Bilingual } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import type { SitePageId } from "@/lib/demo/site/pageSets";
import { Reveal, SiteLink } from "@/pages/site/kit/motion";
import { Breadcrumb } from "@/pages/site/kit/Text";
import "./home.css";

export const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";

/** "a *b* c" with b in the family's accent face. */
export function Accent({ text }: { text: string }) {
  return <>{text.split(/\*([^*]+)\*/).map((p, i) => (i % 2 ? <em key={i} className="dn-accent">{p}</em> : p))}</>;
}

/** Our copy in the reader's language, with its *accent*. */
export function useT() {
  const { lang } = useSite();
  return (c: Bilingual) => tr(c, lang);
}

/** A text link with an arrow to one of the record's pages; nothing when the page is not shown. */
export function MoreLink({ to, param, label, className = "" }: { to: SitePageId; param?: string; label: Bilingual; className?: string }) {
  const { href, lang } = useSite();
  const url = href(to, param);
  if (!url) return null;
  return (
    <SiteLink to={url} className={`group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[hsl(var(--ds-accent))] ${className}`}>
      <span className="underline decoration-[hsl(var(--ds-rule))] decoration-1 underline-offset-[6px] group-hover:decoration-2">{tr(label, lang)}</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </SiteLink>
  );
}

/**
 * The head of an inner page: crumbs, eyebrow, accented h1, lead, actions,
 * and an optional photo on the right (stacked under on phones).
 */
export function PageHead({ crumbs, eyebrow, title, lead, photo, children }: {
  crumbs: { label: string; href?: string | null }[];
  eyebrow?: string;
  title: string;
  lead?: string;
  photo?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="dn-tint relative overflow-hidden">
      <div className={`${wrap} grid items-center gap-10 py-10 sm:py-16 ${photo ? "lg:grid-cols-12" : ""}`}>
        <div className={photo ? "lg:col-span-7" : ""}>
          <Breadcrumb items={crumbs} />
          {eyebrow && <p className="dn-eyebrow mt-6">{eyebrow}</p>}
          <h1 className="dn-h2 mt-3 !text-[clamp(2.1rem,1.4rem+2.8vw,3.6rem)] !leading-[1.08]"><Accent text={title} /></h1>
          {lead && <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-[hsl(var(--ds-ink-soft))]">{lead}</p>}
          {children && <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>}
        </div>
        {photo && <div className="lg:col-span-5">{photo}</div>}
      </div>
    </header>
  );
}

/**
 * One home section. tone: plain (page ground), tint (surface2), band (brand,
 * light text), surface (white). Titles are h2 with one accent phrase.
 */
export function HSection({ id, eyebrow, title, lead, more, tone = "plain", align = "left", children, className = "", tight = false }: {
  id?: string;
  eyebrow?: Bilingual | string;
  title?: Bilingual | string;
  lead?: Bilingual | string;
  /** The "see all" link, top right on desktop. */
  more?: { to: SitePageId; label: Bilingual; param?: string };
  tone?: "plain" | "tint" | "band" | "surface";
  align?: "left" | "center";
  children?: ReactNode;
  className?: string;
  tight?: boolean;
}) {
  const { lang, motion } = useSite();
  const text = (v?: Bilingual | string) => (v == null ? "" : typeof v === "string" ? v : tr(v, lang));
  const ground = tone === "tint" ? "dn-tint" : tone === "band" ? "dn-band" : tone === "surface" ? "bg-[hsl(var(--ds-surface))]" : "";
  const center = align === "center";
  const head = (eyebrow || title || lead) && (
    <div className={`flex flex-col gap-6 ${center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"}`}>
      <div className={center ? "flex flex-col items-center" : ""}>
        {eyebrow && <p className="dn-eyebrow">{text(eyebrow)}</p>}
        {title && <h2 className={`dn-h2 mt-3 max-w-[24ch]`}><Accent text={text(title)} /></h2>}
        {lead && <p className={`mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed ${tone === "band" ? "dn-soft" : "text-[hsl(var(--ds-ink-soft))]"}`}>{text(lead)}</p>}
      </div>
      {more && !center && <MoreLink to={more.to} param={more.param} label={more.label} className={`shrink-0 ${tone === "band" ? "!text-current" : ""}`} />}
    </div>
  );
  const body = (
    <>
      {head}
      {children && <div className={head ? "mt-10 sm:mt-12" : ""}>{children}</div>}
      {more && center && <div className="mt-8 flex justify-center"><MoreLink to={more.to} param={more.param} label={more.label} /></div>}
    </>
  );
  return (
    <section id={id} className={`${tight ? "py-12 sm:py-16" : "py-16 sm:py-24"} ${ground} ${className}`}>
      <div className={wrap}>{motion === "none" ? body : <Reveal>{body}</Reveal>}</div>
    </section>
  );
}
