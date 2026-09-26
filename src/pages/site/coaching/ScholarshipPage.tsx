/**
 * SCHOLARSHIP TEST. /scholarship  (the TALLENTEX / MTSE landing pattern)
 *
 *   head       the test's name, date and mode, one Register action
 *   facts      date, mode, eligibility, result date, as a fact table
 *   centres    the test centres
 *   syllabus   the syllabus line
 *   rewards    what a score earns (fee waiver bands)
 *   faq        questions about the test
 * Register links to the institute's own registration; without one it goes
 * to the demo page or Contact.
 */

import { Helmet } from "react-helmet-async";
import { bi, biList, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Card, CardGrid, FactTable, Section } from "../kit/Section";
import { Accordion, Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Scholarship test", hi: "स्कॉलरशिप टेस्ट" },
  lead: { en: "Sit the test, and the score decides the fee waiver. Registration is free.", hi: "टेस्ट दें, स्कोर से फीस में छूट तय होगी। रजिस्ट्रेशन फ्री है।" },
  register: { en: "Register for the test", hi: "टेस्ट के लिए रजिस्टर करें" },
  ask: { en: "Ask about registration", hi: "रजिस्ट्रेशन के बारे में पूछें" },
  details: { en: "Test details", hi: "टेस्ट की जानकारी" },
  date: { en: "Test date", hi: "टेस्ट की तारीख" },
  mode: { en: "Mode", hi: "तरीका" },
  eligibility: { en: "Who can sit", hi: "कौन दे सकता है" },
  result: { en: "Result", hi: "रिज़ल्ट" },
  centres: { en: "Test centres", hi: "टेस्ट सेंटर" },
  syllabus: { en: "Syllabus", hi: "सिलेबस" },
  rewards: { en: "What the score earns", hi: "स्कोर से क्या मिलेगा" },
  faq: { en: "Questions about the test", hi: "टेस्ट के बारे में सवाल" },
} satisfies Record<string, Bilingual>;

export default function ScholarshipPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const s = site.scholarship;
  const reg = (s?.registerUrl || "").trim();
  const fallback = ctx.href("demo-class") || ctx.href("contact");
  const centres = biList(s, "centres", lang);
  const rewards = withText(s?.rewards, "title");
  const faq = withText(s?.faq, "title");
  const rows = (["date", "mode", "eligibility", "resultDate"] as const)
    .filter((k) => bi(s, k, lang))
    .map((k) => ({ label: tr(k === "date" ? COPY.date : k === "mode" ? COPY.mode : k === "eligibility" ? COPY.eligibility : COPY.result, lang), value: <Bi of={s} k={k} /> }));
  const title = bi(s, "name", lang) || tr(COPY.title, lang);
  let n = 0;

  return (
    <>
      <Helmet><title>{`${title} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        eyebrow={bi(s, "date", lang) || undefined}
        title={title}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {reg ? <Action href={reg}>{tr(COPY.register, lang)}</Action> : fallback ? <Action href={fallback}>{tr(COPY.ask, lang)}</Action> : null}
        </div>
      </PageHead>

      {rows.length > 0 && (
        <Section n={++n} title={tr(COPY.details, lang)}>
          <FactTable rows={rows} />
        </Section>
      )}

      {rewards.length > 0 && (
        <Section n={++n} title={tr(COPY.rewards, lang)}>
          <CardGrid cols={rewards.length >= 4 ? 4 : 3}>
            {rewards.map((r, i) => (
              <Reveal key={i} index={i} className="h-full">
                <Card className="h-full">
                  <Bi of={r} k="title" as="p" className="ds-display ds-num text-2xl" />
                  <Bi of={r} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      {(centres.length > 0 || bi(s, "syllabus", lang)) && (
        <Section n={++n} title={tr(centres.length ? COPY.centres : COPY.syllabus, lang)}>
          {centres.length > 0 && <ul className="flex flex-wrap gap-2">{centres.map((c) => <li key={c} className="rounded-full border border-[hsl(var(--ds-line))] px-4 py-2">{c}</li>)}</ul>}
          {centres.length > 0 && bi(s, "syllabus", lang) && <p className="mt-8 font-semibold">{tr(COPY.syllabus, lang)}</p>}
          <Bi of={s} k="syllabus" as="p" className="mt-2 max-w-[68ch] whitespace-pre-line" />
        </Section>
      )}

      {faq.length > 0 && (
        <Section n={++n} title={tr(COPY.faq, lang)}>
          <div className="max-w-3xl">
            {faq.map((f, i) => <Accordion key={i} title={<Bi of={f} k="title" />}><Bi of={f} k="body" as="p" /></Accordion>)}
          </div>
        </Section>
      )}
    </>
  );
}
