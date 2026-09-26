/**
 * PROGRAMMES BY AGE (the play school's Academics). Sections, each with data:
 *   bands     one card per programme (courses): age band, what the day
 *             holds, timings, the programme's own note
 *   day       a day in the life (dayPlan) as a timeline: time, then activity
 *   method    how children learn here (method points)
 */

import { bi, hasBi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { Timeline } from "@/lib/demo/ui/school/Timeline";
import { slotPhoto, PhotoBand } from "@/lib/demo/ui/school/photos";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Programmes", hi: "प्रोग्राम" },
  lead: { en: "A programme for each age, and what a day looks like.", hi: "हर उम्र के लिए एक कार्यक्रम, और एक दिन कैसा होता है।" },
  bands: { en: "By age", hi: "उम्र के हिसाब से" },
  timings: { en: "Timings", hi: "समय" },
  duration: { en: "Duration", hi: "अवधि" },
  day: { en: "A day in the life", hi: "एक दिन की दिनचर्या" },
  method: { en: "How children learn here", hi: "यहाँ बच्चे कैसे सीखते हैं" },
  check: { en: "Check your child's programme", hi: "अपने बच्चे का कार्यक्रम देखें" },
} satisfies Record<string, Bilingual>;

export default function ProgrammesPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const bands = withText(site.courses, "name");
  const day = withText(site.dayPlan, "label");
  const method = withText(site.method, "title");
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {bands.length > 0 && (
        <Section n={++n} title={tr(COPY.bands, lang)}>
          <PhotoBand src={slotPhoto(site, "academics")} />
          <CardGrid cols={bands.length >= 4 ? 4 : 3}>
            {bands.map((c, i) => (
              <Reveal key={i} index={i}>
                <Card interactive className="flex h-full flex-col">
                  <Bi of={c} k="level" as="p" className="inline-flex self-start rounded-full bg-[hsl(var(--ds-surface-2))] px-3 py-1 text-sm font-semibold text-[hsl(var(--ds-brand-ink))]" />
                  <Bi of={c} k="name" as="h3" className="ds-display mt-3 text-2xl" />
                  <Bi of={c} k="subjects" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
                  <Bi of={c} k="detail" as="p" className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]" />
                  <dl className="mt-auto grid gap-1 pt-4 text-sm">
                    {hasBi(c, "timings") && <div className="flex gap-2"><dt className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.timings, lang)}:</dt><dd className="ds-num font-semibold">{bi(c, "timings", lang)}</dd></div>}
                    {hasBi(c, "duration") && <div className="flex gap-2"><dt className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.duration, lang)}:</dt><dd className="font-semibold">{bi(c, "duration", lang)}</dd></div>}
                  </dl>
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      {day.length > 0 && (
        <Section n={++n} title={tr(COPY.day, lang)}>
          <div className="max-w-2xl">
            <Timeline steps={day.map((d, i) => ({
              key: String(i),
              date: [bi(d, "time", lang), bi(d, "days", lang)].filter(Boolean).join(", ") || undefined,
              title: <Bi of={d} k="label" />,
              body: hasBi(d, "subject") ? <Bi of={d} k="subject" /> : undefined,
            }))} />
          </div>
        </Section>
      )}

      {method.length > 0 && (
        <Section n={++n} title={tr(COPY.method, lang)}>
          <CardGrid cols={3}>
            {method.map((m, i) => (
              <Reveal key={i} index={i}><Card className="h-full"><Bi of={m} k="title" as="p" className="ds-display text-lg" /><Bi of={m} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" /></Card></Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.check, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          <Action href={ctx.href("contact") || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}
