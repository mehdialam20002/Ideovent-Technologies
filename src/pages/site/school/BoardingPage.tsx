/**
 * BOARDING (s4), modelled on the Pastoral Care pages of the residential
 * schools in the research. Sections, each only with data:
 *   houses     the boarding houses
 *   routine    a boarder's day as a timetable (time, then what happens)
 *   topics     dorms, food, health, pastoral care, staying in touch, visits
 *              and exeats, what to pack, grouped by `group`
 *   terms      term dates as a timeline
 *   reach      how to reach the campus
 */

import { bi, hasBi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { groupPoints, PointCards } from "@/lib/demo/ui/school/points";
import { Timeline } from "@/lib/demo/ui/school/Timeline";
import { slotPhoto, PhotoBand, WithPhoto } from "@/lib/demo/ui/school/photos";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Boarding", hi: "हॉस्टल" },
  houses: { en: "The houses", hi: "हाउस" },
  routine: { en: "A boarder's day", hi: "हॉस्टल में रहने वाले बच्चे का दिन" },
  topics: { en: "Life in the house", hi: "हाउस का जीवन" },
  terms: { en: "Term dates", hi: "टर्म की तारीखें" },
  reach: { en: "How to reach the campus", hi: "कैंपस कैसे पहुँचें" },
  visit: { en: "Visit the boarding houses", hi: "हॉस्टल देखने आइए" },
} satisfies Record<string, Bilingual>;

export default function BoardingPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const b = site.boarding || {};
  const houses = withText(b.houses, "title");
  const routine = withText(b.routine, "label");
  const topics = groupPoints(b.topics, lang, tr(COPY.topics, lang));
  const terms = withText(b.termDates, "title");
  const reach = withText(b.howToReach, "title");
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={<Bi of={b} k="intro" />}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {houses.length > 0 && (
        <Section n={++n} title={tr(COPY.houses, lang)}><PhotoBand src={slotPhoto(site, "hostel")} /><PointCards items={houses} /></Section>
      )}

      {routine.length > 0 && (
        <Section n={++n} title={tr(COPY.routine, lang)}>
          <WithPhoto src={slotPhoto(site, "dining")} flip ratio="4 / 5">
          <ol className="max-w-3xl divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
            {routine.map((r, i) => (
              <Reveal as="li" key={i} index={i} className="grid grid-cols-[6.5rem_1fr] gap-4 py-3 sm:grid-cols-[9rem_1fr]">
                <span className="ds-num font-semibold text-[hsl(var(--ds-brand-ink))]">{bi(r, "time", lang)}</span>
                <span><Bi of={r} k="label" className="font-semibold" />{hasBi(r, "subject") && <Bi of={r} k="subject" as="span" className="block text-sm text-[hsl(var(--ds-ink-soft))]" />}{hasBi(r, "days") && <Bi of={r} k="days" as="span" className="block text-sm text-[hsl(var(--ds-ink-soft))]" />}</span>
              </Reveal>
            ))}
          </ol>
          </WithPhoto>
        </Section>
      )}

      {topics.map((g) => (
        <Section key={g.name} n={++n} title={g.name}><PointCards items={g.items} /></Section>
      ))}

      {terms.length > 0 && (
        <Section n={++n} title={tr(COPY.terms, lang)}>
          <div className="max-w-2xl">
            <Timeline steps={terms.map((d, i) => ({ key: String(i), date: <Bi of={d} k="date" />, title: <Bi of={d} k="title" />, body: hasBi(d, "body") ? <Bi of={d} k="body" /> : undefined }))} />
          </div>
        </Section>
      )}

      {reach.length > 0 && (
        <Section n={++n} title={tr(COPY.reach, lang)}><PointCards items={reach} /></Section>
      )}

      <Section n={++n} title={tr(COPY.visit, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          <Action href={ctx.href("contact") || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}
