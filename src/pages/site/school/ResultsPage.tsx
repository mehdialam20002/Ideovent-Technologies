/**
 * SCHOOL RESULTS, built on CBSE's own Appendix IX columns (registered,
 * passed, pass %), year by year. Sections, each only with data:
 *   figures      the chosen year's pass percentage per class, each with a
 *                basis line made of the typed numbers (no figure is computed)
 *   board        year tabs (sliding underline) + class switch, then the board
 *                table; the rows FLIP on change (motion "full")
 *   highlights   the record's result lines for that year (toppers, subject
 *                results); a student's name prints only with consent
 *   destinations university destinations by country (s4, s5)
 *   note         the results note, at body size
 */

import { useState } from "react";
import type { DemoBoardResult, DemoResult } from "@/lib/cms/types";
import { bi, hasBi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { isCbseSchool } from "@/lib/demo/site/disclosure";
import { FilterChips, SlideTabs, useFlipList } from "@/lib/demo/ui/school/filter";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Figure, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Results", hi: "परिणाम" },
  glance: { en: "{year} at a glance", hi: "{year} एक नज़र में" },
  years: { en: "Choose a year", hi: "साल चुनें" },
  classes: { en: "Choose a class", hi: "Class चुनें" },
  allClasses: { en: "All classes", hi: "सभी classes" },
  classLabel: { en: "Class {c}", hi: "Class {c}" },
  passLabel: { en: "Class {c} pass percentage", hi: "Class {c} pass प्रतिशत" },
  passLabelNamed: { en: "{c} pass percentage", hi: "{c} pass प्रतिशत" },
  basis: { en: "Board result {year}: {passed} of {registered} candidates passed", hi: "Board result {year}: {registered} में से {passed} pass" },
  board: { en: "Board examination results", hi: "Board परीक्षा परिणाम" },
  boardLead: { en: "Set out as the CBSE disclosure asks: candidates registered, passed and the pass percentage.", hi: "जैसे CBSE disclosure माँगता है: registered, pass और pass प्रतिशत।" },
  /* Only a CBSE school may say the table follows the CBSE disclosure; an ICSE,
     IB or state-board school gets the same columns without the claim. */
  boardLeadOther: { en: "Set out in full: candidates registered, candidates passed and the pass percentage, year by year.", hi: "पूरा हिसाब: हर साल कितने बच्चे बैठे, कितने pass हुए और pass प्रतिशत।" },
  colClass: { en: "Class", hi: "Class" },
  colYear: { en: "Year", hi: "साल" },
  colReg: { en: "Registered", hi: "Registered" },
  colPassed: { en: "Passed", hi: "Pass" },
  colPct: { en: "Pass %", hi: "Pass %" },
  colNote: { en: "Remarks", hi: "टिप्पणी" },
  highlights: { en: "Highlights", hi: "खास परिणाम" },
  destinations: { en: "Where students went next", hi: "आगे की पढ़ाई कहाँ" },
  note: { en: "About these results", hi: "इन परिणामों के बारे में" },
  admissions: { en: "Admissions", hi: "Admission" },
} satisfies Record<string, Bilingual>;

const yearsOf = (board: DemoBoardResult[], results: DemoResult[]) =>
  [...new Set([...board.map((b) => b.year), ...results.map((r) => r.year || "")].map((y) => (y || "").trim()).filter(Boolean))].sort().reverse();

/** "99.3" or "99.3%" -> "99.3%": the record may type the sign or not. */
const pct = (v?: string) => `${(v || "").trim().replace(/\s*%$/, "")}%`;

/** "X" or "12" reads as "Class X"; "IB Diploma" or "ICSE (X)" is already a name. */
const isClassNumber = (c: string) => /^(?:[IVXL]+|\d{1,2})$/.test(c.trim());

export default function ResultsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const board = (site.boardResults || []).filter((b) => (b.year || "").trim() && (b.className || "").trim());
  const results = withText(site.results, "achievement");
  const destinations = results.filter((r) => (r.destination || "").trim());
  const lines = results.filter((r) => !(r.destination || "").trim());
  const years = yearsOf(board, lines);
  const [year, setYear] = useState(years[0] || "");
  const [cls, setCls] = useState("all");
  const flip = useFlipList<HTMLTableSectionElement>();

  const classes = [...new Set(board.map((b) => b.className.trim()))];
  const rowKey = (b: DemoBoardResult) => `${b.year}-${b.className}`;
  const rowsFor = (y: string, c: string) => board.filter((b) => (!y || b.year === y) && (c === "all" || b.className.trim() === c));
  const rows = rowsFor(year, cls);
  const yearLines = lines.filter((r) => !year || !(r.year || "").trim() || r.year === year);
  const lineKey = (r: DemoResult, i: number) => `${r.year}-${i}-${r.achievement.slice(0, 20)}`;
  const figures = board.filter((b) => b.year === year && (b.passPercent || "").trim());

  const pickYear = (y: string) => {
    if (y === year) return;
    const keep = new Set(rowsFor(y, cls).map(rowKey));
    flip.run(() => setYear(y), (k) => keep.has(k));
  };
  const pickClass = (c: string) => {
    if (c === cls) return;
    const keep = new Set(rowsFor(year, c).map(rowKey));
    flip.run(() => setCls(c), (k) => keep.has(k));
  };
  let n = 0;

  const byCountry = new Map<string, DemoResult[]>();
  for (const d of destinations) {
    const c = (d.country || "").trim() || "-";
    byCountry.set(c, [...(byCountry.get(c) || []), d]);
  }

  return (
    <>
      <PageHead title={bi(site, "resultsHeading", lang) || tr(COPY.title, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}>
        {years.length > 1 && <div className="mt-6 text-left"><SlideTabs label={tr(COPY.years, lang)} options={years.map((y) => ({ id: y, label: y }))} value={year} onChange={pickYear} /></div>}
      </PageHead>

      {figures.length > 0 && (
        <Section n={++n} title={year ? trf(COPY.glance, lang, { year }) : tr(COPY.title, lang)}>
          <div key={year} className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {figures.map((b, i) => (
              <Reveal key={rowKey(b)} index={i}>
                <Figure value={`${pct(b.passPercent)}`} label={trf(isClassNumber(b.className) ? COPY.passLabel : COPY.passLabelNamed, lang, { c: b.className })}
                  basis={b.registered && b.passed ? trf(COPY.basis, lang, { year: b.year, passed: b.passed, registered: b.registered }) : undefined} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {board.length > 0 && (
        <Section n={++n} title={tr(COPY.board, lang)} lead={tr(isCbseSchool(site) ? COPY.boardLead : COPY.boardLeadOther, lang)}>
          {classes.length > 1 && (
            <div className="mb-5">
              <FilterChips label={tr(COPY.classes, lang)} value={cls} onChange={pickClass}
                options={[{ id: "all", label: tr(COPY.allClasses, lang) }, ...classes.map((c) => ({ id: c, label: isClassNumber(c) ? trf(COPY.classLabel, lang, { c }) : c }))]} />
            </div>
          )}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[hsl(var(--ds-ink)/0.7)] text-sm text-[hsl(var(--ds-ink-soft))]">
                  {[COPY.colClass, COPY.colYear, COPY.colReg, COPY.colPassed, COPY.colPct, COPY.colNote].map((c, i) => (
                    <th key={i} scope="col" className={`py-3 pr-4 font-semibold ${i >= 2 && i <= 4 ? "text-right" : ""}`}>{tr(c, lang)}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={flip.ref}>
                {rows.map((b) => (
                  <tr key={rowKey(b)} data-k={rowKey(b)} className="border-b border-[hsl(var(--ds-line))]">
                    <th scope="row" className="py-3 pr-4 font-semibold">{b.className}</th>
                    <td className="ds-num py-3 pr-4">{b.year}</td>
                    <td className="ds-num py-3 pr-4 text-right">{b.registered || "-"}</td>
                    <td className="ds-num py-3 pr-4 text-right">{b.passed || "-"}</td>
                    <td className="ds-num py-3 pr-4 text-right font-semibold text-[hsl(var(--ds-brand-ink))]">{b.passPercent ? `${pct(b.passPercent)}` : "-"}</td>
                    <td className="py-3 pr-4 text-sm text-[hsl(var(--ds-ink-soft))]">{b.note || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {yearLines.length > 0 && (
        <Section n={++n} title={tr(COPY.highlights, lang) + (year ? `, ${year}` : "")}>
          <ul key={year} className="grid gap-4 sm:grid-cols-2">
            {yearLines.map((r, i) => (
              <Reveal as="li" key={lineKey(r, i)} index={i} className="ds-card p-5">
                {r.consent && r.studentName && <p className="font-semibold">{r.studentName}</p>}
                <Bi of={r} k="achievement" as="p" className="ds-display text-xl leading-snug text-[hsl(var(--ds-brand-ink))]" />
                <p className="ds-num mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{[r.exam, r.year].filter(Boolean).join(", ")}</p>
                <Bi of={r} k="note" as="p" className="mt-1 text-[hsl(var(--ds-ink-soft))]" />
                {r.consent && hasBi(r, "quote") && <blockquote className="mt-3 border-l-2 border-[hsl(var(--ds-accent))] pl-3 italic"><Bi of={r} k="quote" /></blockquote>}
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {destinations.length > 0 && (
        <Section n={++n} title={tr(COPY.destinations, lang)}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...byCountry.entries()].map(([country, list], i) => (
              <Reveal key={country} index={i} className="ds-card p-5">
                {country !== "-" && <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{country}</p>}
                <ul className="mt-2 space-y-2">
                  {list.map((d, j) => <li key={j}><span className="font-semibold">{d.destination}</span><Bi of={d} k="achievement" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" /></li>)}
                </ul>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {hasBi(site, "resultsNote") && (
        <Section n={++n} title={tr(COPY.note, lang)}>
          <Bi of={site} k="resultsNote" as="p" className="max-w-prose text-base" />
        </Section>
      )}

      <Section n={++n} title={tr(COPY.admissions, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          {ctx.href("academics") && <Action href={ctx.href("academics")!} tone="ghost">{tr(ctx.pages.find((p) => p.id === "academics")!.label, lang)}</Action>}
        </div>
      </Section>
    </>
  );
}
