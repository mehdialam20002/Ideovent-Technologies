/**
 * DENTAL BLOCKS, part two: emergency, first aid, how to reach, the
 * before-after placeholder tile and gallery, age bands. STUB LEVEL.
 */

import { useState } from "react";
import type { DemoPoint, DentalCase } from "@/lib/cms/types";
import { bi, biList, tr, withText } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { CallLink, OpenNowChip, WhatsAppButton } from "./actions";
import { DENTAL_COPY, DISCLAIMER } from "./copy";
import { dentalOf } from "./logic";
import { Disclaimer } from "./sections";

/** White card, 4px emergency-red left border, headline, Call + WhatsApp, the 112 line. */
export function EmergencyCard() {
  const { site, lang } = useSite();
  const e = dentalOf(site).emergency;
  return (
    <div className="dn-card border-l-4 border-[var(--dn-emergency)] p-6">
      <p className="text-xl font-semibold">{bi(e, "headline", lang) || tr(DENTAL_COPY.emergency, lang)}</p>
      <Disclaimer c={DISCLAIMER.sameDay} className="mt-1" />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CallLink emergency />
        <WhatsAppButton text={tr(DENTAL_COPY.waEmergency, lang)}>{tr(DENTAL_COPY.emergencyWhatsapp, lang)}</WhatsAppButton>
      </div>
      <Disclaimer c={DISCLAIMER.emergency} className="mt-4" />
    </div>
  );
}

/** Numbered first aid (knocked-out tooth, broken tooth, bleeding). */
export function FirstAidCard({ steps, title }: { steps?: DemoPoint[]; title?: string }) {
  const { site, lang } = useSite();
  const list = withText(steps || dentalOf(site).emergency?.firstAid, "title");
  if (!list.length) return null;
  return (
    <div className="dn-card border-l-4 border-[var(--dn-emergency)] p-6">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        {list.map((s, i) => <li key={i}><strong>{bi(s, "title", lang)}</strong> {bi(s, "body", lang)}</li>)}
      </ol>
    </div>
  );
}

/** Address, landmark, transit, parking, hours, Open now chip, map link. */
export function ReachBlock() {
  const { site, lang, actions } = useSite();
  const c = site.contact || {};
  const r = dentalOf(site).reach;
  const address = biList(c, "addressLines", lang);
  return (
    <div className="grid gap-2">
      <OpenNowChip />
      {address.length > 0 && <p>{address.join(", ")}</p>}
      {bi(c, "landmark", lang) && <p>{bi(c, "landmark", lang)}</p>}
      {bi(r, "transit", lang) && <p>{bi(r, "transit", lang)}</p>}
      {bi(r, "parking", lang) && <p>{bi(r, "parking", lang)}</p>}
      {bi(r, "access", lang) && <p>{bi(r, "access", lang)}</p>}
      {bi(c, "hours", lang) && <p>{bi(c, "hours", lang)}</p>}
      <a href={actions.map} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{tr(DENTAL_COPY.directions, lang)}</a>
    </div>
  );
}

/**
 * THE BEFORE-AFTER TILE. A template case has no photos: a 4:3 split card,
 * Before / After halves as flat tints with a line drawing of a tooth row,
 * and the placeholder caption. A real consented case shows its photos with
 * the consent line.
 */
export function CaseTile({ c }: { c: DentalCase }) {
  const { lang } = useSite();
  const real = Boolean(c.consent && c.before && c.after);
  return (
    <figure className="dn-card overflow-hidden">
      <div className="grid aspect-[4/3] grid-cols-2">
        {real ? (
          <>
            <img src={c.before} alt="" className="h-full w-full object-cover" />
            <img src={c.after} alt="" className="h-full w-full object-cover" />
          </>
        ) : (
          <>
            <ToothRow label={tr(DENTAL_COPY.before, lang)} tint="bg-[hsl(var(--ds-surface-2))]" />
            <ToothRow label={tr(DENTAL_COPY.after, lang)} tint="bg-[hsl(var(--ds-surface))]" />
          </>
        )}
      </div>
      <figcaption className="p-4 text-sm">
        <strong className="block">{bi(c, "title", lang)}</strong>
        <span className="text-[hsl(var(--ds-ink-soft))]">{[bi(c, "category", lang), bi(c, "duration", lang)].filter(Boolean).join(" · ")}</span>
        <span className="mt-2 block text-xs">{tr(real ? DISCLAIMER.caseReal : DISCLAIMER.casePlaceholder, lang)}</span>
      </figcaption>
    </figure>
  );
}

function ToothRow({ label, tint }: { label: string; tint: string }) {
  return (
    <div className={`relative flex items-center justify-center ${tint}`}>
      <span className="absolute left-3 top-3 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <svg viewBox="0 0 120 40" className="w-3/4 text-[hsl(var(--ds-ink-soft))]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${6 + i * 22} 10 q10 -6 20 0 v14 q-5 10 -10 0 q-5 10 -10 0 Z`} />)}
      </svg>
    </div>
  );
}

/** Filter chips by category, the tiles, SampleNote "cases", the results line. */
/** `Tile` lets a page pass a richer tile (the before-after page's kind-aware
 *  drawing) without the kit importing from pages. */
export function CaseGallery({ cases, limit, Tile = CaseTile }: { cases?: DentalCase[]; limit?: number; Tile?: (p: { c: DentalCase }) => JSX.Element | null }) {
  const { site, lang } = useSite();
  const all = withText(cases || dentalOf(site).cases, "title");
  const cats = [...new Set(all.map((c) => c.category).filter(Boolean))];
  const [cat, setCat] = useState("");
  const list = all.filter((c) => !cat || c.category === cat).slice(0, limit);
  if (!all.length) return null;
  return (
    <div>
      {cats.length > 1 && (
        <div role="group" className="mb-6 flex flex-wrap gap-2">
          {["", ...cats].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
              className={`min-h-11 rounded-full border px-4 text-sm ${cat === c ? "bg-[hsl(var(--ds-ink))] text-[hsl(var(--ds-bg))]" : "border-[hsl(var(--ds-line))]"}`}>
              {c ? bi(all.find((x) => x.category === c), "category", lang) : tr(DENTAL_COPY.seeAll, lang)}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((c, i) => <Tile key={i} c={c} />)}</div>
      <SampleNote block="cases" className="mt-4" />
      <Disclaimer c={DISCLAIMER.results} className="mt-2" />
    </div>
  );
}

/** Kids age bands as three tinted cards. */
export function AgeBands({ bands }: { bands?: DemoPoint[] }) {
  const { site, lang } = useSite();
  const list = withText(bands || dentalOf(site).kids?.ageBands, "title");
  if (!list.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {list.map((b, i) => (
        <article key={i} className="dn-card p-6">
          <h3 className="text-lg font-semibold">{bi(b, "title", lang)}</h3>
          <p className="mt-2 text-sm">{bi(b, "body", lang)}</p>
        </article>
      ))}
    </div>
  );
}
