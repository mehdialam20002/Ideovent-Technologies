/**
 * BeforeAfterPage: /before-after. How cases are shown (consent, cropped to
 * teeth and lips, unretouched, treatment and time) above the gallery;
 * filters by treatment and, where cases carry one, by concern (d5); each
 * template case is the labelled illustration, never a photo; SampleNote
 * "cases" and the results line under the grid. Framed as education, not
 * proof (DCI 8.2). Spec: DENTAL-DESIGN.md s7 placeholder tile;
 * DENTAL-COMPLIANCE.md s3 before-after. Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { useState } from "react";
import { Camera, Clock, FileSignature, ScanFace } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { BookingBand, DISCLAIMER, DPageHead, dentalOf, wrap } from "@/lib/demo/ui/dental";
import { CasePlaceholder } from "./parts-b/support/cases";
import { PB2 } from "./parts-b/support/copy2";
import { crumbsFor, FilterChips } from "./parts-b/support/ui";

export default function BeforeAfterPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const all = withText(dentalOf(site).cases, "title");
  const [cat, setCat] = useState("");
  const [problem, setProblem] = useState("");
  const cats = [...new Set(all.map((c) => (c.category || "").trim()).filter(Boolean))];
  const problems = [...new Set(all.map((c) => (c.problem || "").trim()).filter(Boolean))];
  const list = all.filter((c) => (!cat || c.category === cat) && (!problem || c.problem === problem));
  const label = (key: "category" | "problem") => (v: string) => bi(all.find((c) => c[key] === v), key, lang) || v;
  const rules = [
    [<FileSignature key="a" className="h-5 w-5" aria-hidden="true" />, PB2.c1t, PB2.c1b],
    [<ScanFace key="b" className="h-5 w-5" aria-hidden="true" />, PB2.c2t, PB2.c2b],
    [<Camera key="c" className="h-5 w-5" aria-hidden="true" />, PB2.c3t, PB2.c3b],
    [<Clock key="d" className="h-5 w-5" aria-hidden="true" />, PB2.c4t, PB2.c4b],
  ] as const;

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={tr(PB2.baTitle, lang)} lead={tr(PB2.baLead, lang)}
        crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })} />

      <section className="py-12 sm:py-16">
        <div className={wrap}>
          <div className="rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(PB2.consentTitle, lang)}</p>
            <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {rules.map(([icon, t, b], i) => (
                <li key={i} className="flex gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]">{icon}</span>
                  <div><p className="font-semibold">{tr(t, lang)}</p><p className="mt-0.5 text-sm leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(b, lang)}</p></div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 grid gap-3">
            {cats.length > 1 && <p className="text-sm font-semibold">{tr(PB2.byTreatment, lang)}</p>}
            <FilterChips label={tr(PB2.byTreatment, lang)} values={cats} value={cat} onChange={(v) => { setCat(v); setProblem(""); }} labelOf={label("category")} allLabel={tr(PB2.all, lang)} />
            {problems.length > 1 && <p className="mt-2 text-sm font-semibold">{tr(PB2.byConcern, lang)}</p>}
            <FilterChips label={tr(PB2.byConcern, lang)} values={problems} value={problem} onChange={setProblem} labelOf={label("problem")} allLabel={tr(PB2.all, lang)} />
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {list.map((c, i) => <CasePlaceholder key={`${cat}-${problem}-${i}`} c={c} />)}
          </div>
          {!list.length && <p className="mt-6 text-[hsl(var(--ds-ink-soft))]">{tr(PB2.noCases, lang)}</p>}

          <div className="mt-8 grid gap-2">
            <SampleNote block="cases" />
            <p className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.results, lang)}</p>
          </div>
        </div>
      </section>

      <BookingBand title={tr(PB2.baBook, lang)} />
    </>
  );
}
