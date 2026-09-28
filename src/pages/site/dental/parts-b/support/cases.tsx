/**
 * BEFORE AND AFTER PIECES. A template case has NO photo (the type forbids
 * it): it is a drawn, labelled illustration, a 4:3 split with a tooth row
 * whose "before" follows the case's kind (a gap for implants, crowding for
 * braces, a warm shade for whitening, a chipped edge for veneers, one
 * darkened tooth when the case says so) and whose
 * "after" is even. A real clinic's case (before, after, consent: true) shows
 * its two photos with the consent line. DENTAL-COMPLIANCE.md s3 and s4.
 */

import { ArrowRight, ChevronsLeftRight } from "lucide-react";
import type { DentalCase } from "@/lib/cms/types";
import { bi, tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { SiteLink } from "@/pages/site/kit/motion";
import { DENTAL_COPY, DISCLAIMER } from "@/lib/demo/ui/dental";
import { PB2 } from "./copy2";

type Kind = "gap" | "crowd" | "space" | "shade" | "chip" | "dark";

export function caseKind(c: DentalCase): Kind {
  const s = `${c.category} ${c.treatment || ""} ${c.problem || ""} ${c.title}`.toLowerCase();
  if (/implant|missing|bridge|denture/.test(s)) return "gap";
  if (/darken|discolou?r|dark front|grey tooth|gray tooth|dead tooth/.test(s)) return "dark";
  if (/gaps?\b|spacing|spaced/.test(s)) return "space";
  if (/whiten|bleach|stain|shade/.test(s)) return "shade";
  if (/veneer|bond|chip|smile design|makeover/.test(s)) return "chip";
  return "crowd";
}

/** One arch of six front teeth. `lower` mirrors it under the upper arch. */
function Arch({ kind, even, lower }: { kind: Kind; even: boolean; lower?: boolean }) {
  const teeth = [0, 1, 2, 3, 4, 5];
  const w = lower ? 20 : 24;
  const before = !even;
  const gap = kind === "space" && before && !lower ? 8 : 3;
  const total = teeth.length * w + (teeth.length - 1) * gap;
  const x0 = (200 - total) / 2;
  const warm = kind === "shade" && before;
  const crowd = kind === "crowd" && before;
  const top = lower ? 150 : 22;
  return (
    <g transform={lower ? `translate(0 ${top}) scale(1 -1)` : `translate(0 ${top})`}>
      <path d="M6 10 Q100 -16 194 10" stroke="currentColor" strokeWidth="1.25" opacity=".45" />
      {teeth.map((i) => {
        const x = x0 + i * (w + gap);
        if (kind === "gap" && before && !lower && i === 2) {
          return <path key={i} d={`M${x + 4} 40 h${w - 8}`} stroke="currentColor" strokeDasharray="2 3" strokeWidth="1.25" opacity=".6" />;
        }
        const h = (i === 0 || i === 5 ? 40 : i === 1 || i === 4 ? 48 : 54) - (lower ? 8 : 0);
        const rot = crowd ? [0, -9, 8, -7, 10, 0][i] : 0;
        const dy = crowd ? [0, 3, -2, 4, -1, 0][i] : 0;
        const chip = kind === "chip" && before && !lower && (i === 2 || i === 3);
        const dark = kind === "dark" && before && !lower && i === 2;
        const y = 8 + dy;
        const d = chip
          ? `M${x} ${y} h${w} v${h - 8} l-6 -9 l-5 8 l-4 -5 q-${w - 15} 8 -${w - 15} -4 z`
          : `M${x} ${y} h${w} v${h - 10} q0 10 -${w / 2} 10 q-${w / 2} 0 -${w / 2} -10 z`;
        const fill = dark ? "#8E8A80" : warm ? "#E8D6A3" : "hsl(var(--ds-surface))";
        return (
          <path key={i} d={d} transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined}
            fill={fill} fillOpacity={warm ? 0.9 : 1} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        );
      })}
    </g>
  );
}

/** Upper and lower front teeth. `even` draws the after state. */
function TeethRow({ kind, even }: { kind: Kind; even: boolean }) {
  return (
    <svg viewBox="0 0 200 172" className="h-auto w-[90%]" fill="none" aria-hidden="true">
      <Arch kind={kind} even={even} />
      <Arch kind={kind} even={even} lower />
    </svg>
  );
}

export function CasePlaceholder({ c }: { c: DentalCase }) {
  const { lang, href, page } = useSite();
  const real = Boolean(c.consent && c.before && c.after);
  const kind = caseKind(c);
  /* No "About this treatment" link on that treatment's own page. */
  const to = c.treatment && page.id !== "treatment" ? href("treatment", c.treatment) : null;
  const half = "relative flex items-center justify-center overflow-hidden text-[hsl(var(--ds-ink-soft))]";
  const tag = "absolute left-3 top-3 rounded-full bg-[hsl(var(--ds-surface))] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--ds-ink))] shadow-[var(--dn-shadow-1)]";
  return (
    <figure className="dn-card flex h-full flex-col overflow-hidden" data-case={real ? "real" : "illustration"}>
      <div className="relative grid aspect-[4/3] grid-cols-2">
        {real ? (
          <>
            <div className={half}><img src={c.before} alt={`${tr(DENTAL_COPY.before, lang)}: ${bi(c, "title", lang)}`} loading="lazy" decoding="async" width={400} height={600} className="h-full w-full object-cover" /><span className={tag}>{tr(DENTAL_COPY.before, lang)}</span></div>
            <div className={half}><img src={c.after} alt={`${tr(DENTAL_COPY.after, lang)}: ${bi(c, "title", lang)}`} loading="lazy" decoding="async" width={400} height={600} className="h-full w-full object-cover" /><span className={tag}>{tr(DENTAL_COPY.after, lang)}</span></div>
          </>
        ) : (
          <>
            <div className={`${half} bg-[hsl(var(--ds-surface-2))]`}><TeethRow kind={kind} even={false} /><span className={tag}>{tr(DENTAL_COPY.before, lang)}</span></div>
            <div className={`${half} bg-[hsl(var(--ds-bg))]`}><TeethRow kind={kind} even /><span className={tag}>{tr(DENTAL_COPY.after, lang)}</span></div>
            <span className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[hsl(var(--ds-ink))] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--ds-bg))]">{tr(PB2.illustration, lang)}</span>
          </>
        )}
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[hsl(var(--ds-line))]" />
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-[hsl(var(--ds-ink-soft))]">
          <ChevronsLeftRight className="h-4 w-4" />
        </span>
      </div>
      <figcaption className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-accent))]">{bi(c, "category", lang)}</p>
        <p className="mt-1.5 font-semibold leading-snug">{bi(c, "title", lang)}</p>
        <dl className="mt-2 grid gap-0.5 text-sm text-[hsl(var(--ds-ink-soft))]">
          {bi(c, "problem", lang) && <div className="flex gap-1.5"><dt>{tr(PB2.concern, lang)}:</dt><dd>{bi(c, "problem", lang)}</dd></div>}
          {bi(c, "duration", lang) && <div className="flex gap-1.5"><dt>{tr(PB2.duration, lang)}:</dt><dd>{bi(c, "duration", lang)}</dd></div>}
        </dl>
        <p className="mt-3 border-t border-[hsl(var(--ds-line))] pt-3 text-xs leading-relaxed text-[hsl(var(--ds-ink-soft))]">
          {real ? tr(DISCLAIMER.caseReal, lang) : <><strong className="font-semibold text-[hsl(var(--ds-ink))]">{tr(DISCLAIMER.caseTemplate, lang)}</strong> {tr(DISCLAIMER.casePlaceholder, lang)}</>}
        </p>
        {to && (
          <SiteLink to={to} className="mt-auto inline-flex min-h-11 items-center gap-1 pt-2 text-sm font-semibold underline-offset-4 hover:underline">
            {tr(PB2.viewTreatment, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </SiteLink>
        )}
      </figcaption>
    </figure>
  );
}
