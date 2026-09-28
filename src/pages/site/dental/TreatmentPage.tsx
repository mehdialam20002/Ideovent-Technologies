/**
 * TreatmentPage: /treatments/<slug>. PAGES-A builder, 28 Sep 2026.
 * Spec: Mehdi's brief item 4 (hero, what it is, symptoms, who needs it,
 * steps, duration, recovery, before and after, FAQs, book consultation),
 * DENTAL-IA.md s6, DENTAL-DESIGN.md (family tokens), DENTAL-COMPLIANCE.md
 * (results line, fee note, placeholder case). Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 *
 * Layout: split hero; then an article column (8/12) with a sticky "at a
 * glance" card beside it on a desktop; related treatments on the tint; the
 * closing band books THIS treatment. Every block renders only with its data.
 */

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Clock3, HeartHandshake, Hourglass, CalendarCheck } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { treatmentSlug } from "@/lib/demo/site/context";
import { bi, biList, tr, trf, withText } from "@/lib/demo/site/bilingual";
import {
  ComparisonTable, DENTAL_COPY, DISCLAIMER, DSection, Disclaimer, FaqList,
  dentalOf, findTreatment,
} from "@/lib/demo/ui/dental";
import { Reveal } from "@/pages/site/kit/motion";
import { TX_COPY } from "./parts-a/treatments/copy";
import { TreatmentHero } from "./parts-a/treatments/TreatmentHero";
import { TreatmentAside } from "./parts-a/treatments/TreatmentAside";
import { ClosingBand } from "./parts-a/treatments/ClosingBand";
import { RelatedTreatments, TreatmentCases, TreatmentTeam } from "./parts-a/treatments/extras";
import { CheckList, ColHead, FactTiles, Timeline } from "./parts-a/treatments/ui";

const COMPARE_REASONS = new Set(["braces", "aligners", "implants"]);

export default function TreatmentPage({ site, ctx }: SitePageProps) {
  const t = findTreatment(site, ctx.param);
  const back = ctx.href("treatments") || ctx.basePath;
  if (!t) return <Navigate to={back} replace />;
  const { lang } = ctx;
  const d = dentalOf(site);
  const what = bi(t, "what", lang);
  const comfort = bi(t, "comfort", lang);
  const symptoms = biList(t, "symptoms", lang);
  const who = biList(t, "whoNeedsIt", lang);
  const steps = withText(t.steps, "title").length ? t.steps : d.journey;
  const hasSteps = withText(steps, "title").length > 0;
  const facts = [
    { label: tr(TX_COPY.duration, lang), value: bi(t, "duration", lang), icon: <Hourglass className="h-4 w-4" aria-hidden="true" /> },
    { label: tr(TX_COPY.visits, lang), value: bi(t, "visits", lang), icon: <CalendarCheck className="h-4 w-4" aria-hidden="true" /> },
    { label: tr(TX_COPY.recovery, lang), value: bi(t, "recovery", lang), icon: <Clock3 className="h-4 w-4" aria-hidden="true" /> },
  ];
  const hasTime = facts.some((f) => f.value);
  const faqs = withText(t.faqs, "title");
  const compare = t.reason && COMPARE_REASONS.has(t.reason) && d.comparison?.rows?.length ? d.comparison : undefined;
  const name = bi(t, "name", lang);

  const anchors = [
    what && { id: "what", label: tr(TX_COPY.what, lang) },
    symptoms.length && { id: "signs", label: tr(TX_COPY.signs, lang) },
    who.length && { id: "who", label: tr(TX_COPY.who, lang) },
    hasSteps && { id: "steps", label: tr(TX_COPY.steps, lang) },
    (hasTime || comfort) && { id: "time", label: tr(TX_COPY.timeTitle, lang) },
    { id: "cases", label: tr(TX_COPY.cases, lang) },
    faqs.length && { id: "faqs", label: tr(TX_COPY.faqs, lang) },
  ].filter(Boolean) as { id: string; label: string }[];

  const block = (i: number, node: ReactNode) => (ctx.motion === "none" ? node : <Reveal index={i}>{node}</Reveal>);

  return (
    <>
      <TreatmentHero t={t} />

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-16">
        <article className="min-w-0 space-y-16 sm:space-y-20 lg:col-span-8">
          {what && block(0, (
            <section>
              <ColHead id="what" eyebrow={name} title={tr(TX_COPY.what, lang)} />
              <p className="mt-5 max-w-[65ch] text-lg leading-[1.7]">{what}</p>
            </section>
          ))}
          {symptoms.length > 0 && block(1, <section><ColHead id="signs" title={tr(TX_COPY.signs, lang)} /><CheckList items={symptoms} /></section>)}
          {who.length > 0 && block(2, <section><ColHead id="who" title={tr(TX_COPY.who, lang)} /><CheckList items={who} /></section>)}
          {hasSteps && block(3, (
            <section>
              <ColHead id="steps" title={tr(TX_COPY.steps, lang)} />
              <Timeline steps={steps} />
              <Disclaimer c={DISCLAIMER.results} className="mt-6" />
            </section>
          ))}
          {(hasTime || comfort) && block(4, (
            <section>
              <ColHead id="time" title={tr(TX_COPY.timeTitle, lang)} />
              <FactTiles items={facts} className="mt-6" />
              {comfort && (
                <div className="mt-4 flex gap-4 rounded-[var(--ds-radius)] bg-[hsl(var(--ds-surface-2))] p-5 sm:p-6">
                  <HeartHandshake className="mt-0.5 h-6 w-6 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">{tr(TX_COPY.comfort, lang)}</p>
                    <p className="mt-1 leading-relaxed text-[hsl(var(--ds-ink-soft))]">{comfort}</p>
                  </div>
                </div>
              )}
            </section>
          ))}
          {compare && block(5, <section><ColHead title={bi(compare, "title", lang) || tr(TX_COPY.compare, lang)} /><div className="mt-6"><ComparisonTable data={compare} /></div></section>)}
          {block(6, <TreatmentCases t={t} id="cases" />)}
          {faqs.length > 0 && block(7, <section><ColHead id="faqs" title={tr(TX_COPY.faqs, lang)} /><div className="mt-4"><FaqList items={faqs} /></div><Disclaimer c={DISCLAIMER.info} className="mt-4" /></section>)}
          {block(8, <TreatmentTeam t={t} id="team" />)}
        </article>
        <aside className="hidden lg:col-span-4 lg:block">
          <TreatmentAside t={t} anchors={anchors} />
        </aside>
      </div>

      <DSection tone="tint"><RelatedTreatments t={t} /></DSection>

      <ClosingBand title={trf(TX_COPY.bandTitle, lang, { treatment: name })} lead={tr(TX_COPY.bandLead, lang)}
        preset={{ treatment: treatmentSlug(t), reason: t.reason }} book={tr(TX_COPY.bookThis, lang)}
        waText={trf(DENTAL_COPY.waTreatment, lang, { treatment: name, clinic: site.instituteName })} />
    </>
  );
}
