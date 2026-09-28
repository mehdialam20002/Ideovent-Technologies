/**
 * KidsPage: /kids. Built 28 Sep 2026 (treatments and care pages builder).
 * Spec: Mehdi's brief item 10 (child-friendly care, first visit, fluoride,
 * sealants, parent FAQs); DENTAL-IA.md d6 (first visit, age bands,
 * prevention, habits, special care, comfort, parent FAQ); DENTAL-DESIGN.md s6
 * (arch mask, sunshine numerals, three tinted cards); DENTAL-COMPLIANCE.md
 * (speak to the parent, no prizes, no camps, no guarantees).
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 * Every block renders only with its data (d2 and d5 carry a smaller kids block).
 */

import type { ReactNode } from "react";
import { ArrowRight, HeartHandshake, Sparkles } from "lucide-react";
import type { DemoPoint } from "@/lib/cms/types";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import {
  AgeBands, DISCLAIMER, DSection, DentalGlyph, DoctorCard, FaqList, FirstAidCard, dentalOf, wrap,
} from "@/lib/demo/ui/dental";
import { Reveal, SiteLink } from "@/pages/site/kit/motion";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { ClosingBand } from "./parts-a/treatments/ClosingBand";
import { KidsHero } from "./parts-b/care/KidsHero";
import { KIDS_COPY } from "./parts-b/care/copy";

const iconFor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("fluorid")) return "fluoride";
  if (t.includes("sealant")) return "sealant";
  if (t.includes("brush")) return "cleaning";
  if (t.includes("diet") || t.includes("sugar") || t.includes("food") || t.includes("snack")) return "heart";
  if (t.includes("check")) return "checkup";
  return "tooth";
};

export default function KidsPage({ site, ctx }: SitePageProps) {
  const { lang, motion } = ctx;
  const d = dentalOf(site);
  const k = d.kids;
  const first = withText(k?.firstVisit, "title");
  const prevention = withText(k?.prevention, "title");
  const habits = withText(k?.habits, "title");
  const comfort = withText(k?.comfort, "title");
  const faq = withText(k?.parentFaq, "title");
  const special = bi(k, "specialCare", lang);
  const peds = withText(d.doctors, "name").filter((x) => /paediatric|pediatric|pedodont/i.test(`${x.specialisation || ""} ${x.qualification || ""}`)).slice(0, 2);
  const knocked = withText(d.emergency?.firstAid, "title").filter((s) => /knock/i.test(s.title));
  const emergency = ctx.href("emergency");
  const rv = (i: number, node: ReactNode) => (motion === "none" ? <div key={i} className="h-full">{node}</div> : <Reveal key={i} index={i} className="h-full">{node}</Reveal>);

  const pointList = (items: DemoPoint[], icon: ReactNode) => (
    <ul className="mt-5 grid gap-4">
      {items.map((p, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))]">{icon}</span>
          <div>
            <p className="font-semibold">{bi(p, "title", lang)}</p>
            {bi(p, "body", lang) && <p className="mt-1 leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(p, "body", lang)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <KidsHero />

      {first.length > 0 && (
        <DSection title={tr(KIDS_COPY.firstVisit, lang)} lead={tr(KIDS_COPY.firstVisitLead, lang)}>
          <ol className={`grid gap-8 sm:grid-cols-2 ${first.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {first.map((s, i) => (
              <li key={i} className="relative">
                {i < first.length - 1 && <span aria-hidden="true" className="absolute left-14 right-0 top-6 hidden border-t-2 border-dashed border-[hsl(var(--ds-line))] lg:block" />}
                <span aria-hidden="true" className="relative grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--ds-rule))] text-lg font-bold text-[hsl(var(--ds-ink))]">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold leading-snug">{bi(s, "title", lang)}</h3>
                {bi(s, "body", lang) && <p className="mt-2 leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(s, "body", lang)}</p>}
              </li>
            ))}
          </ol>
        </DSection>
      )}

      {withText(k?.ageBands, "title").length > 0 && (
        <DSection tone="tint" title={tr(KIDS_COPY.ages, lang)}><AgeBands /></DSection>
      )}

      {prevention.length > 0 && (
        <DSection title={tr(KIDS_COPY.prevention, lang)} lead={tr(KIDS_COPY.preventionLead, lang)}>
          <div className={`grid gap-5 sm:grid-cols-2 ${prevention.length >= 3 ? "lg:grid-cols-3" : ""}`}>
            {prevention.map((p, i) => rv(i, (
              <article className="dn-card h-full p-6">
                <DentalGlyph name={iconFor(p.title)} className="h-8 w-8 text-[hsl(var(--ds-accent))]" />
                <h3 className="mt-4 text-lg font-semibold">{bi(p, "title", lang)}</h3>
                {bi(p, "body", lang) && <p className="mt-2 leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(p, "body", lang)}</p>}
              </article>
            )))}
          </div>
        </DSection>
      )}

      {(habits.length > 0 || comfort.length > 0) && (
        <DSection tone="tint">
          <div className="grid gap-12 lg:grid-cols-2">
            {comfort.length > 0 && (
              <div>
                <h2 className="text-[clamp(1.6rem,1.25rem+1.4vw,2.25rem)] leading-[1.15] [font-family:var(--ds-display)]">{tr(KIDS_COPY.comfort, lang)}</h2>
                {pointList(comfort, <HeartHandshake className="h-4 w-4" />)}
              </div>
            )}
            {habits.length > 0 && (
              <div>
                <h2 className="text-[clamp(1.6rem,1.25rem+1.4vw,2.25rem)] leading-[1.15] [font-family:var(--ds-display)]">{tr(KIDS_COPY.habits, lang)}</h2>
                {pointList(habits, <Sparkles className="h-4 w-4" />)}
              </div>
            )}
          </div>
        </DSection>
      )}

      {(special || peds.length > 0) && (
        <DSection>
          <div className={`grid gap-10 ${peds.length ? "lg:grid-cols-12" : ""}`}>
            {special && (
              <div className={peds.length ? "lg:col-span-7" : ""}>
                <DentalGlyph name="accessible" className="h-8 w-8 text-[hsl(var(--ds-accent))]" />
                <h2 className="mt-3 text-[clamp(1.6rem,1.25rem+1.4vw,2.25rem)] leading-[1.15] [font-family:var(--ds-display)]">{tr(KIDS_COPY.special, lang)}</h2>
                <p className="mt-4 max-w-[62ch] text-lg leading-[1.7]">{special}</p>
              </div>
            )}
            {peds.length > 0 && (
              <div className={special ? "lg:col-span-5" : ""}>
                <h2 className="text-xl font-semibold">{tr(KIDS_COPY.dentist, lang)}</h2>
                <div className={`mt-4 grid gap-5 ${peds.length > 1 ? "max-w-xl grid-cols-2" : "max-w-[18rem]"}`}>{peds.map((x) => <DoctorCard key={x.name} doctor={x} compact />)}</div>
                <SampleNote block="doctors" className="mt-4" />
              </div>
            )}
          </div>
        </DSection>
      )}

      {knocked.length > 0 && (
        <div className={`${wrap} pb-14 sm:pb-20 ${special || peds.length ? "" : "pt-14 sm:pt-20"}`}>
          <FirstAidCard steps={knocked} title={tr(KIDS_COPY.knocked, lang)} />
          {emergency && (
            <SiteLink to={emergency} className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-[hsl(var(--ds-accent))] underline-offset-4 hover:underline">
              {tr(KIDS_COPY.knockedLink, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </SiteLink>
          )}
        </div>
      )}

      {faq.length > 0 && (
        <DSection tone="tint" title={tr(KIDS_COPY.faq, lang)}>
          <div className="max-w-3xl"><FaqList items={faq} /></div>
          <p className="mt-6 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.info, lang)}</p>
        </DSection>
      )}

      <ClosingBand title={tr(KIDS_COPY.band, lang)} preset={{ reason: "kids" }} book={tr(KIDS_COPY.book, lang)} />
    </>
  );
}
