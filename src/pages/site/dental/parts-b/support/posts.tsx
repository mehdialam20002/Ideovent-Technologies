/**
 * GUIDE PIECES: reading time, the "Medically reviewed by" line (DCI 8.1.7),
 * a guide card (the linked treatment's stock photo when it has one, a drawn
 * tile otherwise) and the body renderer: paragraphs split on a blank line,
 * "## " starts a subheading, lines starting "- " make a list.
 */

import { ArrowRight } from "lucide-react";
import type { DemoPost } from "@/lib/cms/types";
import { bi, biDate, tr, trf } from "@/lib/demo/site/bilingual";
import { postSlug, useSite } from "@/lib/demo/site/context";
import { Photo } from "@/pages/site/kit/Text";
import { SiteLink } from "@/pages/site/kit/motion";
import { DENTAL_COPY, DentalGlyph, findTreatment } from "@/lib/demo/ui/dental";
import { PB2 } from "./copy2";

export function readMinutes(text: string): number {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** "Medically reviewed by Dr. X, MDS", whether or not the record wrote the prefix. */
export function reviewedLine(p: DemoPost, lang: "en" | "hi"): string {
  const v = bi(p, "reviewedBy", lang);
  if (!v) return "";
  return /reviewed|समीक्षा/i.test(v) ? v : `${tr(DENTAL_COPY.reviewedBy, lang)} ${v}`;
}

export function PostMeta({ p, className = "" }: { p: DemoPost; className?: string }) {
  const { lang } = useSite();
  const bits = [biDate(p, "date", lang), trf(PB2.minRead, lang, { n: String(readMinutes(bi(p, "body", lang) || bi(p, "excerpt", lang))) })].filter(Boolean);
  return <p className={`text-sm text-[hsl(var(--ds-ink-soft))] ${className}`}>{bits.join(" · ")}</p>;
}

export function PostCard({ p, big = false }: { p: DemoPost; big?: boolean }) {
  const { site, lang, href } = useSite();
  const to = href("post", postSlug(p));
  const t = findTreatment(site, p.treatment);
  const reviewed = reviewedLine(p, lang);
  return (
    <article className={`dn-card group relative flex h-full flex-col overflow-hidden ${big ? "md:grid md:grid-cols-[1.1fr_1fr]" : ""}`} data-interactive="">
      {t?.image ? (
        <Photo src={t.image} alt="" ratio={big ? "16 / 10" : "16 / 9"} sizes={big ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"} className={big ? "md:h-full" : ""} />
      ) : (
        <div className={`flex items-center justify-center bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))] ${big ? "aspect-[16/10] md:aspect-auto md:h-full" : "aspect-[16/9]"}`}>
          <DentalGlyph name={t?.icon || "tooth"} className="h-14 w-14 opacity-80" />
        </div>
      )}
      <div className={`flex flex-1 flex-col p-6 ${big ? "sm:p-8 lg:p-10" : ""}`}>
        {bi(p, "category", lang) && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-accent))]">{bi(p, "category", lang)}</p>}
        <h2 className={`mt-2 leading-snug [font-family:var(--ds-display)] ${big ? "text-[clamp(1.5rem,1.2rem+1.2vw,2.1rem)]" : "text-xl"}`}>
          {to ? <SiteLink to={to} className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4">{bi(p, "title", lang)}</SiteLink> : bi(p, "title", lang)}
        </h2>
        {bi(p, "excerpt", lang) && <p className={`mt-2 text-[hsl(var(--ds-ink-soft))] ${big ? "text-base" : "line-clamp-3 text-sm"}`}>{bi(p, "excerpt", lang)}</p>}
        <div className="mt-auto pt-5">
          {reviewed && <p className="text-sm font-medium">{reviewed}</p>}
          <PostMeta p={p} className="mt-0.5" />
          {big && to && <span aria-hidden="true" className="mt-4 inline-flex items-center gap-1 font-semibold">{tr(PB2.readGuide, lang)}<ArrowRight className="h-4 w-4" /></span>}
        </div>
      </div>
    </article>
  );
}

/** The body as paragraphs, "## " subheadings and "- " lists. */
export function PostBody({ text }: { text: string }) {
  const blocks = (text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="grid gap-5 text-[17px] leading-[1.75] text-[hsl(var(--ds-ink))]">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) return <h2 key={i} className="mt-4 text-[1.4rem] leading-snug [font-family:var(--ds-display)]">{b.slice(3)}</h2>;
        const lines = b.split("\n").map((l) => l.trim());
        if (lines.every((l) => /^[-*] /.test(l))) {
          return <ul key={i} className="grid gap-2 pl-1">{lines.map((l, j) => <li key={j} className="flex gap-3"><span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" />{l.slice(2)}</li>)}</ul>;
        }
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}
