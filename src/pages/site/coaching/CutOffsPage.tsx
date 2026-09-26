/**
 * PREVIOUS CUT-OFFS. /cut-offs  (c5)
 *
 *   filter   exam chips and year chips, each with 2+ options. Tables swap
 *            without counters: cut-offs are reference numbers, not claims.
 *   table    one table per exam and year: category, cut-off
 *   source   the source line and the reminder that cut-offs change
 */

import { Helmet } from "react-helmet-async";
import { tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { Chips } from "@/lib/demo/ui/coaching/Chips";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { distinct, useFilter } from "@/lib/demo/ui/coaching/filter";
import { DataTable } from "@/lib/demo/ui/coaching/Table";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";

const COPY = {
  title: { en: "Previous cut-offs", hi: "पिछले कट-ऑफ" },
  lead: { en: "Final cut-offs by category from past years, to set a target score.", hi: "पिछले सालों के कैटेगरी के हिसाब से फ़ाइनल कट-ऑफ, टारगेट स्कोर तय करने के लिए।" },
  byExam: { en: "Cut-offs by exam", hi: "एग्ज़ाम के हिसाब से कट-ऑफ" },
  exam: { en: "Exam", hi: "एग्ज़ाम" },
  year: { en: "Year", hi: "साल" },
  category: { en: "Category", hi: "कैटेगरी" },
  cutoff: { en: "Cut-off", hi: "कट-ऑफ" },
  change: { en: "Cut-offs change every year with the number of vacancies and the paper's difficulty.", hi: "कट-ऑफ हर साल वैकेंसी और पेपर की कठिनाई के हिसाब से बदलता है।" },
} satisfies Record<string, Bilingual>;

export default function CutOffsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const g = site.govExams;
  const rows = (g?.cutoffs || []).filter((r) => r.exam.trim() && r.cutoff.trim());
  const exams = distinct(rows.map((r) => r.exam));
  const years = distinct(rows.map((r) => r.year)).sort().reverse();
  const fe = useFilter<string>(exams[0] || "all");
  const fy = useFilter<string>("all");
  const shown = rows.filter((r) => (fe.value === "all" || r.exam === fe.value) && (fy.value === "all" || (r.year || "") === fy.value));
  const groups = distinct(shown.map((r) => `${r.exam}|${r.year || ""}`));

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      />
      <Section n={1} title={tr(COPY.byExam, lang)}>
        <div className="flex flex-col gap-1 lg:flex-row lg:gap-6">
          <Chips label={tr(COPY.exam, lang)} value={fe.value} onChange={fe.choose}
            options={[...exams.map((e) => ({ value: e, label: e })), { value: "all", label: tr(C_COPY.allExams, lang) }]} />
          {years.length > 1 && <Chips label={tr(COPY.year, lang)} value={fy.value} onChange={fy.choose}
            options={[{ value: "all", label: tr(C_COPY.allYears, lang) }, ...years.map((y) => ({ value: y, label: y }))]} />}
        </div>
        <div ref={(el) => { fe.gridRef.current = el; fy.gridRef.current = el; }} className="grid gap-8 lg:grid-cols-2">
          {groups.map((key) => {
            const [exam, year] = key.split("|");
            const list = shown.filter((r) => r.exam === exam && (r.year || "") === year);
            return (
              <div key={key} data-f="">
                <p className="ds-display mb-2 text-lg">{[exam, year].filter(Boolean).join("  ·  ")}</p>
                <DataTable head={[tr(COPY.category, lang), tr(COPY.cutoff, lang)]} rows={list.map((r) => [r.category, r.cutoff])} />
              </div>
            );
          })}
        </div>
        <div className="mt-6 max-w-[68ch] space-y-1">
          {g?.cutoffSource && <p>{trf(C_COPY.source, lang, { source: g.cutoffSource })}</p>}
          <p className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.change, lang)}</p>
        </div>
      </Section>
    </>
  );
}
