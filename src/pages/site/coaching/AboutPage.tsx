/**
 * ABOUT. /about
 *
 *   founder   the founder's story, typed name and role; a portrait only with
 *             consent, otherwise the family's monogram
 *   about     the institute's own paragraph
 *   values    vision and mission, and the class-size promise as a concrete
 *             number rather than a superlative
 *   centre    a strip of real photos with the lightbox; the Gallery page is
 *             linked only when the record has one
 *   hostel    hostel and PG guidance (Kota, c1)
 *   teachers  the faculty, only when this record has no Faculty page (c2
 *             merges them here)
 *   public    the MoE 2024 disclosure: students coached and succeeded, and a
 *             link to fees and refunds
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { FacultyCard, Portrait } from "@/lib/demo/ui/coaching/cards";
import { PhotoGrid } from "@/lib/demo/ui/coaching/Lightbox";
import { PageHead } from "../kit/Hero";
import { SiteLink } from "../kit/motion";
import { CardGrid, FactTable, Section } from "../kit/Section";
import { Bi, Monogram } from "../kit/Text";

const COPY = {
  title: { en: "About {name}", hi: "{name} के बारे में" },
  since: { en: "Teaching in {city} since {year}", hi: "{year} से {city} में पढ़ा रहे हैं" },
  story: { en: "How it started", hi: "शुरुआत कैसे हुई" },
  who: { en: "Who we are", hi: "हम कौन हैं" },
  values: { en: "What we hold to", hi: "हमारे उसूल" },
  vision: { en: "Vision", hi: "हमारा लक्ष्य" },
  mission: { en: "Mission", hi: "हमारा मिशन" },
  classSize: { en: "Class size", hi: "Class का साइज़" },
  centre: { en: "The centre", hi: "हमारा centre" },
  gallery: { en: "See every photograph", hi: "सभी फ़ोटो देखें" },
  hostel: { en: "Hostel and PG", hi: "Hostel और PG" },
  teachers: { en: "The teachers", hi: "टीचर्स" },
  public: { en: "Public information", hi: "सार्वजनिक जानकारी" },
  coached: { en: "Students coached ({year})", hi: "पढ़ाए गए students ({year})" },
  succeeded: { en: "Students who succeeded ({year})", hi: "सफल students ({year})" },
  feesLink: { en: "Fees, refunds and disclosure", hi: "फीस, रिफंड और जानकारी" },
} satisfies Record<string, Bilingual>;

export default function AboutPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const founder = site.founder;
  const photos = (site.photos || []).filter((p) => (p.src || "").trim());
  const faculty = withText(site.faculty, "name");
  const fp = site.feesPolicy;
  const year = (site.establishedYear || site.established || "").trim();
  const countsYear = fp?.countsYear || "";
  const feesHref = ctx.href("fees-and-refunds");
  let n = 0;

  return (
    <>
      <Helmet><title>{`${trf(COPY.title, lang, { name: site.instituteName })}`}</title></Helmet>
      <PageHead
        title={trf(COPY.title, lang, { name: site.instituteName })}
        lead={year && site.city ? trf(COPY.since, lang, { city: site.city, year }) : <Bi of={site} k="tagline" />}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(ctx.page.label, lang) }]}
      />

      {bi(founder, "story", lang) && (
        <Section n={++n} title={tr(COPY.story, lang)}>
          <div className="grid gap-8 md:grid-cols-[1fr_2fr] md:items-start">
            <div className="max-w-[16rem]">
              {founder?.photo && founder.photoConsent
                ? <Portrait name={founder.name || site.instituteName} src={founder.photo} consent ratio="4 / 5" />
                : <Monogram name={founder?.name} />}
              {founder?.name && <p className="ds-display mt-4 text-lg">{founder.name}</p>}
              <Bi of={founder} k="role" as="p" className="text-[hsl(var(--ds-ink-soft))]" />
            </div>
            <Bi of={founder} k="story" as="p" className="max-w-[68ch] whitespace-pre-line text-lg leading-relaxed" />
          </div>
        </Section>
      )}

      {bi(site, "about", lang) && (
        <Section n={++n} title={tr(COPY.who, lang)}>
          <Bi of={site} k="about" as="p" className="max-w-[68ch] whitespace-pre-line text-lg leading-relaxed" />
        </Section>
      )}

      {(bi(site, "vision", lang) || bi(site, "mission", lang) || bi(site, "classSizePromise", lang)) && (
        <Section n={++n} title={tr(COPY.values, lang)}>
          <FactTable rows={[
            ...(bi(site, "vision", lang) ? [{ label: tr(COPY.vision, lang), value: <Bi of={site} k="vision" /> }] : []),
            ...(bi(site, "mission", lang) ? [{ label: tr(COPY.mission, lang), value: <Bi of={site} k="mission" /> }] : []),
            ...(bi(site, "classSizePromise", lang) ? [{ label: tr(COPY.classSize, lang), value: <Bi of={site} k="classSizePromise" /> }] : []),
          ]} />
        </Section>
      )}

      {photos.length > 0 && (
        <Section n={++n} title={tr(COPY.centre, lang)}>
          <PhotoGrid photos={photos.slice(0, 6)} />
          {ctx.href("gallery") && <SiteLink to={ctx.href("gallery")!} className="mt-6 inline-block font-semibold underline">{tr(COPY.gallery, lang)}</SiteLink>}
        </Section>
      )}

      {bi(site, "hostel", lang) && (
        <Section n={++n} title={tr(COPY.hostel, lang)}>
          <Bi of={site} k="hostel" as="p" className="max-w-[68ch] whitespace-pre-line" />
        </Section>
      )}

      {!ctx.href("faculty") && faculty.length > 0 && (
        <Section n={++n} title={tr(COPY.teachers, lang)}>
          <CardGrid cols={faculty.length <= 2 ? 2 : 3}>
            {faculty.map((f) => <FacultyCard key={f.name} f={f} detail />)}
          </CardGrid>
        </Section>
      )}

      {(fp?.studentsCoached || fp?.studentsSucceeded || feesHref) && (
        <Section n={++n} title={tr(COPY.public, lang)}>
          {(fp?.studentsCoached || fp?.studentsSucceeded) && (
            <FactTable rows={[
              ...(fp?.studentsCoached ? [{ label: trf(COPY.coached, lang, { year: countsYear }).replace(" ()", ""), value: <span className="ds-num">{fp.studentsCoached}</span> }] : []),
              ...(fp?.studentsSucceeded ? [{ label: trf(COPY.succeeded, lang, { year: countsYear }).replace(" ()", ""), value: <span className="ds-num">{fp.studentsSucceeded}</span> }] : []),
            ]} />
          )}
          {feesHref && <SiteLink to={feesHref} className="mt-4 inline-block font-semibold underline">{tr(COPY.feesLink, lang)}</SiteLink>}
        </Section>
      )}
    </>
  );
}
