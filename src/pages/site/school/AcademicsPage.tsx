/**
 * SCHOOL ACADEMICS. Sections, each only with data:
 *   stages      the stages of schooling (academics.stages; `group` is the
 *               age band), drawn as a continuum
 *   classes     the classes and streams (courses): level, subjects, timings
 *   assessment  how children are assessed
 *   calendar    the academic calendar as a dated timeline
 *   downloads   syllabus, model papers, book lists (academics.downloads, plus
 *               the record's downloads), only entries with a real link
 */

import { FileDown } from "lucide-react";
import { bi, hasBi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { Timeline } from "@/lib/demo/ui/school/Timeline";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Academics", hi: "पढ़ाई" },
  stages: { en: "Stages of schooling", hi: "पढ़ाई के चरण" },
  classes: { en: "Classes and subjects", hi: "Classes और विषय" },
  timings: { en: "Timings", hi: "समय" },
  assessment: { en: "How children are assessed", hi: "मूल्यांकन कैसे होता है" },
  calendar: { en: "Academic calendar", hi: "Academic calendar" },
  downloads: { en: "Downloads", hi: "Downloads" },
  results: { en: "See the results", hi: "परिणाम देखें" },
  admissions: { en: "Admissions", hi: "Admission" },
} satisfies Record<string, Bilingual>;

export default function AcademicsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const ac = site.academics || {};
  const stages = withText(ac.stages, "title");
  const classes = withText(site.courses, "name");
  const calendar = withText(ac.calendar, "title");
  const seen = new Set<string>();
  const downloads = [...(ac.downloads || []), ...(site.downloads || [])].filter((d) => {
    const u = (d.url || "").trim();
    if (!u || !hasBi(d, "label") || seen.has(u)) return false;
    seen.add(u);
    return true;
  });
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={<Bi of={ac} k="intro" />}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {stages.length > 0 && (
        <Section n={++n} title={tr(COPY.stages, lang)}>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
            {stages.map((s, i) => (
              <Reveal as="li" key={i} index={i} className="relative">
                <Card className="h-full">
                  <p className="ds-num text-sm font-semibold text-[hsl(var(--ds-accent))]">{String(i + 1).padStart(2, "0")}{hasBi(s, "group") ? " · " : ""}<Bi of={s} k="group" /></p>
                  <Bi of={s} k="title" as="p" className="ds-display mt-2 text-xl" />
                  <Bi of={s} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
                </Card>
                {i < stages.length - 1 && <span aria-hidden="true" className="absolute -right-3 top-1/2 hidden h-[2px] w-2 bg-[hsl(var(--ds-accent))] lg:block" />}
              </Reveal>
            ))}
          </ol>
        </Section>
      )}

      {classes.length > 0 && (
        <Section n={++n} title={tr(COPY.classes, lang)}>
          <div className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
            {classes.map((c, i) => (
              <Reveal key={i} index={i} className="grid gap-2 py-5 md:grid-cols-[1fr_2fr_1fr] md:gap-6">
                <div>
                  <Bi of={c} k="name" as="p" className="ds-display text-xl" />
                  <Bi of={c} k="level" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" />
                </div>
                <div>
                  <Bi of={c} k="subjects" as="p" />
                  <Bi of={c} k="detail" as="p" className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]" />
                </div>
                {hasBi(c, "timings") && <p className="ds-num text-sm"><span className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.timings, lang)}: </span>{bi(c, "timings", lang)}</p>}
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {hasBi(ac, "assessment") && (
        <Section n={++n} title={tr(COPY.assessment, lang)}>
          <Bi of={ac} k="assessment" as="p" className="max-w-prose whitespace-pre-line text-lg leading-relaxed" />
        </Section>
      )}

      {calendar.length > 0 && (
        <Section n={++n} title={tr(COPY.calendar, lang)}>
          <Timeline steps={calendar.map((d, i) => ({ key: String(i), date: <Bi of={d} k="date" />, title: <Bi of={d} k="title" />, body: hasBi(d, "body") ? <Bi of={d} k="body" /> : undefined }))} />
        </Section>
      )}

      {downloads.length > 0 && (
        <Section n={++n} title={tr(COPY.downloads, lang)}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {downloads.map((d, i) => (
              <Reveal as="li" key={d.url} index={i}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="ds-card flex min-h-[56px] items-center gap-3 p-4 font-semibold underline-offset-4 hover:underline">
                  <FileDown className="h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
                  <span><Bi of={d} k="label" />{hasBi(d, "group") && <span className="block text-sm font-normal text-[hsl(var(--ds-ink-soft))]"><Bi of={d} k="group" /></span>}</span>
                </a>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.admissions, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          {ctx.href("results") && <Action href={ctx.href("results")!} tone="ghost">{tr(COPY.results, lang)}</Action>}
        </div>
      </Section>
    </>
  );
}
