/**
 * FACULTY. /faculty
 *
 *   filter    subject chips with the filter transition, when 2+ subjects
 *   grid      one card per teacher: portrait (only with consent) or
 *             initials, subject, role, qualification, experience, how they
 *             teach, batches taken. A small faculty (4 or fewer, c3's case)
 *             gets the two-column profile layout with room for the detail.
 *   cta       sit in one of their classes: the free demo
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { FacultyCard } from "@/lib/demo/ui/coaching/cards";
import { Chips } from "@/lib/demo/ui/coaching/Chips";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { distinct, useFilter } from "@/lib/demo/ui/coaching/filter";
import { PageHead } from "../kit/Hero";
import { CardGrid, Section } from "../kit/Section";
import { Action } from "../kit/Text";

const COPY = {
  title: { en: "The teachers", hi: "हमारे टीचर्स" },
  lead: { en: "Who will teach your child, what they studied, and how long they have taught.", hi: "आपके बच्चे को कौन पढ़ाएगा, उन्होंने क्या पढ़ा है और कितने साल से पढ़ा रहे हैं।" },
  subject: { en: "Subject", hi: "विषय" },
  team: { en: "Faculty", hi: "Faculty" },
  sitIn: { en: "Sit in one of their classes first", hi: "पहले उनकी एक class में बैठकर देखें" },
} satisfies Record<string, Bilingual>;

export default function FacultyPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const faculty = withText(site.faculty, "name");
  const lead = (s: string | undefined) => (/lead|head|founder|director/i.test(s || "") ? 0 : 1);
  const ordered = [...faculty].sort((a, b) => lead(a.group || a.role) - lead(b.group || b.role));
  /* A filter only helps when subjects repeat and read as short labels. */
  const allSubjects = distinct(faculty.map((f) => bi(f, "subject", lang)));
  const subjects = allSubjects.length < faculty.length && allSubjects.every((x) => x.length <= 28) ? allSubjects : [];
  const f = useFilter<string>("all");
  const shown = f.value === "all" ? ordered : ordered.filter((x) => bi(x, "subject", lang) === f.value);
  const profiles = faculty.length <= 4;
  const demo = ctx.href("demo-class") || ctx.href("contact");

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      />
      <Section n={1} title={tr(COPY.team, lang)}>
        <Chips label={tr(COPY.subject, lang)} value={f.value} onChange={f.choose}
          options={[{ value: "all", label: tr(C_COPY.allSubjects, lang) }, ...subjects.map((s) => ({ value: s, label: s }))]} />
        <p className="sr-only" aria-live="polite">{trf(C_COPY.showing, lang, { n: String(shown.length) })}</p>
        <div ref={f.gridRef}>
          <CardGrid cols={profiles ? 2 : 3}>
            {shown.map((x) => <div key={x.name} data-f="" className="h-full"><FacultyCard f={x} detail /></div>)}
          </CardGrid>
        </div>
        {demo && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <p className="ds-display text-xl">{tr(COPY.sitIn, lang)}</p>
            <Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action>
          </div>
        )}
      </Section>
    </>
  );
}
