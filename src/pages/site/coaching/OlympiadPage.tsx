/**
 * OLYMPIAD PREPARATION. /olympiad  (c4)
 *
 *   exams     the Olympiads prepared for, each with its note
 *   schedule  the practice schedule as a table
 *   medals    medals and ranks won, as plain lines (never AIR-style claims)
 * Framed as after-school preparation; nothing here implies approval by any
 * government body or by the Olympiad organisers.
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { DataTable } from "@/lib/demo/ui/coaching/Table";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Olympiad preparation", hi: "ओलंपियाड की तैयारी" },
  lead: { en: "After-school practice for the Olympiads, alongside the school syllabus.", hi: "School syllabus के साथ, school के बाद ओलंपियाड की practice।" },
  exams: { en: "Olympiads we prepare for", hi: "किन ओलंपियाड की तैयारी" },
  schedule: { en: "Practice schedule", hi: "Practice schedule" },
  batch: { en: "Batch", hi: "Batch" },
  days: { en: "Days", hi: "दिन" },
  time: { en: "Time", hi: "समय" },
  subject: { en: "Subject", hi: "विषय" },
  medals: { en: "Medals", hi: "Medals" },
  independent: { en: "The Olympiads are conducted by their own organisers. This is independent preparation and is not affiliated with them.", hi: "ओलंपियाड उनके अपने आयोजक करवाते हैं। यह स्वतंत्र तैयारी है, उनसे जुड़ी नहीं है।" },
} satisfies Record<string, Bilingual>;

export default function OlympiadPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const o = site.olympiad;
  const exams = withText(o?.exams, "title");
  const schedule = withText(o?.schedule, "label");
  const medals = (o?.medals || []).filter((m) => m.trim());
  const demo = ctx.href("demo-class") || ctx.href("contact");
  let n = 0;

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={bi(o, "intro", lang) ? <Bi of={o} k="intro" /> : tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      >
        {demo && <div className="mt-6"><Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action></div>}
      </PageHead>
      <Section n={++n} title={tr(COPY.exams, lang)}>
        <CardGrid cols={3}>
          {exams.map((e, i) => (
            <Reveal key={i} index={i} className="h-full">
              <Card className="h-full">
                <Bi of={e} k="title" as="h3" className="ds-display text-lg" />
                <Bi of={e} k="group" as="p" className="text-sm text-[hsl(var(--ds-accent))]" />
                <Bi of={e} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
              </Card>
            </Reveal>
          ))}
        </CardGrid>
        <p className="mt-6 max-w-[68ch] text-[hsl(var(--ds-ink-soft))]">{tr(COPY.independent, lang)}</p>
      </Section>
      {schedule.length > 0 && (
        <Section n={++n} title={tr(COPY.schedule, lang)}>
          <DataTable
            caption={tr(COPY.schedule, lang)}
            head={[tr(COPY.batch, lang), tr(COPY.days, lang), tr(COPY.time, lang), tr(COPY.subject, lang)]}
            rows={schedule.map((r) => [bi(r, "label", lang), bi(r, "days", lang), bi(r, "time", lang), bi(r, "subject", lang)])}
          />
        </Section>
      )}
      {medals.length > 0 && (
        <Section n={++n} title={tr(COPY.medals, lang)}>
          <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
            {medals.map((m) => <li key={m} className="py-3">{m}</li>)}
          </ul>
        </Section>
      )}
    </>
  );
}
