/**
 * The treatment page's lower blocks (PAGES-A, 28 Sep 2026): its before-after
 * (the clinic's cases for this treatment, else ONE labelled illustrative
 * placeholder tile, never a photo), the dentists who do it, and related
 * treatments from the same group.
 */

import { CasePlaceholder } from "../../parts-b/support/cases";
import { ArrowRight } from "lucide-react";
import type { DentalCase, DentalDoctor, DentalTreatment, DemoSite } from "@/lib/cms/types";
import { bi, tr, trf, withText } from "@/lib/demo/site/bilingual";
import { treatmentSlug, useSite } from "@/lib/demo/site/context";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { SiteLink } from "@/pages/site/kit/motion";
import { DISCLAIMER, Disclaimer, DoctorCard, TreatmentCard, dentalOf, leadDoctor } from "@/lib/demo/ui/dental";
import { TX_COPY } from "./copy";
import { ColHead } from "./ui";

/** The clinic's cases for this treatment, or one placeholder tile. */
export function TreatmentCases({ t, id }: { t: DentalTreatment; id: string }) {
  const { site, lang, href } = useSite();
  const slug = treatmentSlug(t);
  const own = withText(dentalOf(site).cases, "title").filter((c) => c.treatment === slug).slice(0, 2);
  const placeholder: DentalCase = {
    category: bi(t, "category", lang) || bi(t, "name", lang),
    title: trf(TX_COPY.placeholderTitle, lang, { treatment: bi(t, "name", lang) }),
    treatment: slug,
    duration: bi(t, "duration", lang),
  };
  const gallery = href("before-after");
  const list = own.length ? own : [placeholder];
  return (
    <section>
      <ColHead id={id} title={tr(TX_COPY.cases, lang)} lead={tr(TX_COPY.casesLead, lang)} />
      <div className={`mt-6 grid gap-5 ${list.length > 1 ? "sm:grid-cols-2" : "max-w-xl"}`}>
        {list.map((c, i) => <CasePlaceholder key={i} c={c} />)}
      </div>
      {own.length > 0 && <SampleNote block="cases" className="mt-4" />}
      <Disclaimer c={own.length ? DISCLAIMER.results : DISCLAIMER.caseTemplate} className="mt-3" />
      {gallery && (
        <SiteLink to={gallery} className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-[hsl(var(--ds-accent))] underline-offset-4 hover:underline">
          {tr(TX_COPY.casesAll, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SiteLink>
      )}
    </section>
  );
}

const GENERIC = new Set(["treatment", "dental", "teeth", "tooth", "and", "the", "for", "care", "with"]);

/** Doctors whose focus or specialisation names this treatment; else the lead. Up to two. */
export function doctorsFor(site: DemoSite, t: DentalTreatment): DentalDoctor[] {
  const all = withText(dentalOf(site).doctors, "name");
  const words = `${t.name} ${t.category || ""}`.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !GENERIC.has(w));
  const hit = all.filter((d) => {
    const hay = `${d.focus || ""} ${d.specialisation || ""}`.toLowerCase();
    return words.some((w) => hay.includes(w.replace(/s$/, "")));
  });
  const lead = leadDoctor(site);
  return (hit.length ? hit : lead ? [lead] : []).slice(0, 2);
}

export function TreatmentTeam({ t, id }: { t: DentalTreatment; id: string }) {
  const { site, lang } = useSite();
  const docs = doctorsFor(site, t);
  if (!docs.length) return null;
  return (
    <section>
      <ColHead id={id} title={tr(TX_COPY.team, lang)} />
      <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:gap-5">
        {docs.map((d) => <DoctorCard key={d.name} doctor={d} compact />)}
      </div>
      <SampleNote block="doctors" className="mt-4" />
    </section>
  );
}

/** Same group first, then the rest, up to three. */
export function RelatedTreatments({ t }: { t: DentalTreatment }) {
  const { site, lang, href } = useSite();
  const all = withText(dentalOf(site).treatments, "name").filter((x) => treatmentSlug(x) !== treatmentSlug(t));
  const same = all.filter((x) => x.category && x.category === t.category);
  const list = [...same, ...all.filter((x) => !same.includes(x))].slice(0, 3);
  const index = href("treatments");
  if (!list.length) return null;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(1.6rem,1.25rem+1.4vw,2.25rem)] leading-[1.15] [font-family:var(--ds-display)]">{tr(TX_COPY.related, lang)}</h2>
        {index && (
          <SiteLink to={index} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-[hsl(var(--ds-accent))] underline-offset-4 hover:underline">
            {tr(TX_COPY.allTreatments, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </SiteLink>
        )}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((x) => <TreatmentCard key={treatmentSlug(x)} treatment={x} />)}
      </div>
      {list.some((x) => x.fromPrice) && <Disclaimer c={DISCLAIMER.fees} className="mt-6 max-w-[80ch]" />}
    </div>
  );
}
