/**
 * TEST SERIES. /test-series
 *
 *   types      the kinds of test (chapter, part, full mock, daily quiz)
 *   schedule   the dated schedule as a table
 *   pattern    the paper pattern and marking
 *   downloads  sample paper, OMR sheet, previous years' papers
 *   platform   a LINK to the institute's real test platform. No rank
 *              predictor or analytics is simulated here.
 */

import { Helmet } from "react-helmet-async";
import { Download, ExternalLink } from "lucide-react";
import { bi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { DataTable } from "@/lib/demo/ui/coaching/Table";
import { PageHead } from "../kit/Hero";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Test series", hi: "टेस्ट सीरीज़" },
  lead: { en: "Regular tests on the real exam pattern, with the schedule printed in advance.", hi: "असली exam pattern पर नियमित टेस्ट, schedule पहले से तय।" },
  types: { en: "Kinds of test", hi: "टेस्ट के प्रकार" },
  schedule: { en: "Schedule", hi: "Schedule" },
  test: { en: "Test", hi: "टेस्ट" },
  date: { en: "Date or day", hi: "तारीख या दिन" },
  time: { en: "Time", hi: "समय" },
  syllabus: { en: "Syllabus", hi: "Syllabus" },
  pattern: { en: "Pattern and marking", hi: "Pattern और marking" },
  downloads: { en: "Downloads", hi: "Downloads" },
  platform: { en: "Take the tests online", hi: "Online टेस्ट दें" },
  platformBody: { en: "Online tests and results are on the institute's own test platform.", hi: "Online टेस्ट और रिज़ल्ट संस्थान के अपने test platform पर हैं।" },
  open: { en: "Open the test platform", hi: "Test platform खोलें" },
} satisfies Record<string, Bilingual>;

export default function TestSeriesPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const ts = site.testSeries;
  const types = withText(ts?.types, "title");
  const schedule = withText(ts?.schedule, "label");
  const downloads = withText(ts?.downloads, "label").filter((d) => (d.url || "").trim());
  const platform = (ts?.platformUrl || "").trim();
  let n = 0;

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={bi(ts, "intro", lang) ? <Bi of={ts} k="intro" /> : tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      >
        {platform && <div className="mt-6"><Action href={platform}>{tr(COPY.open, lang)}</Action></div>}
      </PageHead>

      {types.length > 0 && (
        <Section n={++n} title={tr(COPY.types, lang)}>
          <CardGrid cols={types.length === 4 ? 4 : 3}>
            {types.map((t, i) => (
              <Card key={i} className="h-full">
                <Bi of={t} k="title" as="h3" className="ds-display text-lg" />
                <Bi of={t} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
              </Card>
            ))}
          </CardGrid>
        </Section>
      )}

      {schedule.length > 0 && (
        <Section n={++n} title={tr(COPY.schedule, lang)}>
          <DataTable
            caption={tr(COPY.schedule, lang)}
            head={[tr(COPY.test, lang), tr(COPY.date, lang), tr(COPY.time, lang), tr(COPY.syllabus, lang)]}
            rows={schedule.map((r) => [bi(r, "label", lang), bi(r, "days", lang), bi(r, "time", lang), bi(r, "subject", lang)])}
          />
        </Section>
      )}

      {bi(ts, "pattern", lang) && (
        <Section n={++n} title={tr(COPY.pattern, lang)}>
          <Bi of={ts} k="pattern" as="p" className="max-w-[68ch] whitespace-pre-line text-lg" />
        </Section>
      )}

      {downloads.length > 0 && (
        <Section n={++n} title={tr(COPY.downloads, lang)}>
          <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
            {downloads.map((d, i) => (
              <li key={i}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex min-h-[52px] items-center justify-between gap-4 py-3">
                  <span><Bi of={d} k="label" className="font-semibold" /> <Bi of={d} k="group" className="text-sm text-[hsl(var(--ds-ink-soft))]" /></span>
                  <span className="flex items-center gap-1 text-sm text-[hsl(var(--ds-accent))]"><Download className="h-4 w-4" aria-hidden="true" />{tr(C_COPY.download, lang)}</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {platform && (
        <Section n={++n} title={tr(COPY.platform, lang)} tone="tint">
          <p className="max-w-[68ch]">{tr(COPY.platformBody, lang)}</p>
          <a href={platform} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-brand mt-5">
            {tr(COPY.open, lang)} <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(C_COPY.opensSite, lang)}</p>
        </Section>
      )}
    </>
  );
}
