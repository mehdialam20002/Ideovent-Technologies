/**
 * RESULTS AND TOPPERS. /results
 *
 *   summary   the aggregate figures, each with its basis line (modern: the
 *             dark band). Counters only for a typed number with a basis.
 *   filters   year tabs and exam chips, each shown with 2+ options; the grid
 *             swaps with the filter transition
 *   grid      named or unnamed result cards with the CCPA 2024 fields
 *             (course, duration, paid status), a name only with consent; the
 *             c5 variant is selection counts per exam per year
 *   note      the institute's results note and our disclosure line, at body
 *             size, never smaller than the claims
 */

import { Helmet } from "react-helmet-async";
import { tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { Chips } from "@/lib/demo/ui/coaching/Chips";
import { CountCard, ResultCard } from "@/lib/demo/ui/coaching/cards";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { distinct, useFilter } from "@/lib/demo/ui/coaching/filter";
import { ResultsBand } from "@/lib/demo/ui/coaching/home";
import { PageHead } from "../kit/Hero";
import { CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Results and toppers", hi: "रिज़ल्ट और टॉपर्स" },
  lead: { en: "Filter by year and exam. Each result says which course the student took, for how long, and whether it was paid.", hi: "साल और exam से filter करें। हर रिज़ल्ट में लिखा है कि student ने कौन सा कोर्स, कितने समय तक लिया और फीस दी या नहीं।" },
  summary: { en: "At a glance", hi: "एक नज़र में" },
  byYear: { en: "Results by year", hi: "साल के हिसाब से रिज़ल्ट" },
  selections: { en: "Selections by exam and year", hi: "Exam और साल के हिसाब से selections" },
  year: { en: "Year", hi: "साल" },
  exam: { en: "Exam", hi: "Exam" },
  join: { en: "Want to be on this page next year?", hi: "अगले साल इस पेज पर आना है?" },
} satisfies Record<string, Bilingual>;

export default function ResultsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const stats = withText(site.stats, "label").filter((s) => (s.value || "").trim());
  const all = (site.results || []).filter((r) => (r.achievement || "").trim() || (r.count || "").trim());
  const counts = all.filter((r) => (r.count || "").trim());
  const people = all.filter((r) => !(r.count || "").trim());
  const years = distinct(all.map((r) => r.year)).sort().reverse();
  const exams = distinct(all.map((r) => r.exam));
  const fy = useFilter<string>("all");
  const fe = useFilter<string>("all");
  const pass = (r: { year?: string; exam?: string }) =>
    (fy.value === "all" || (r.year || "").trim() === fy.value) && (fe.value === "all" || (r.exam || "").trim() === fe.value);
  const demo = ctx.href("demo-class") || ctx.href("contact");
  let n = 0;

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      />

      {stats.length > 0 && <ResultsBand n={++n} title={tr(COPY.summary, lang)} stats={stats} />}

      <Section n={++n} title={tr(counts.length && !people.length ? COPY.selections : COPY.byYear, lang)}>
        <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:gap-6">
          <Chips label={tr(COPY.year, lang)} value={fy.value}
            onChange={(v) => { fy.choose(v); }}
            options={[{ value: "all", label: tr(C_COPY.allYears, lang) }, ...years.map((y) => ({ value: y, label: y }))]} />
          <Chips label={tr(COPY.exam, lang)} value={fe.value}
            onChange={(v) => { fe.choose(v); }}
            options={[{ value: "all", label: tr(C_COPY.allExams, lang) }, ...exams.map((e) => ({ value: e, label: e }))]} />
        </div>
        <p className="sr-only" aria-live="polite">{trf(C_COPY.showing, lang, { n: String(all.filter(pass).length) })}</p>
        <div ref={(el) => { fy.gridRef.current = el; fe.gridRef.current = el; }}>
          {counts.filter(pass).length > 0 && (
            <div className="mb-8">
              <CardGrid cols={4}>
                {counts.filter(pass).map((r, i) => <div key={i} data-f="" className="h-full"><CountCard r={r} /></div>)}
              </CardGrid>
            </div>
          )}
          {people.filter(pass).length > 0 && (
            <CardGrid cols={3}>
              {people.filter(pass).map((r, i) => <div key={i} data-f="" className="h-full"><ResultCard r={r} showQuote /></div>)}
            </CardGrid>
          )}
          {all.filter(pass).length === 0 && <p className="text-[hsl(var(--ds-ink-soft))]">{tr(C_COPY.nothingMatches, lang)}</p>}
        </div>
        <div className="mt-8 max-w-[68ch] space-y-2">
          <Bi of={site} k="resultsNote" as="p" />
          <p>{tr(C_COPY.resultsDisclosure, lang)}</p>
        </div>
        {demo && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <p className="ds-display text-xl">{tr(COPY.join, lang)}</p>
            <Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action>
          </div>
        )}
      </Section>
    </>
  );
}
