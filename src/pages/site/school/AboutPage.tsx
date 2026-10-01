/**
 * SCHOOL ABOUT. Sections, each only with data:
 *   story      the school's own account (`about`), with SampleNote "story"
 *              under it while it is the template's (30 Sep 2026)
 *   purpose    vision and mission
 *   head       the head's message in full, with the typed name and title
 *              (never a signature image: a forgery risk)
 *   record     facts: founded, board and affiliation, UDISE+ code, city
 *   houses     the house system (s4), when the record lists houses
 *   campus     the facilities list, only when this record has no Campus page
 *              (s2 keeps facilities as a block here)
 */

import type { ReactNode } from "react";
import { bi, biList, hasBi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { Str } from "@/lib/demo/ui/school/shared";
import { firstSlot, SlotPhoto, WithPhoto } from "@/lib/demo/ui/school/photos";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { SampleNote } from "../kit/SampleNote";
import { Card, CardGrid, FactTable, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "About the school", hi: "स्कूल के बारे में" },
  story: { en: "Our story", hi: "हमारी कहानी" },
  purpose: { en: "What we work towards", hi: "हमारा लक्ष्य" },
  vision: { en: "Vision", hi: "हमारा लक्ष्य" },
  mission: { en: "Mission", hi: "हमारा मिशन" },
  head: { en: "A message from the {title}", hi: "{title} का संदेश" },
  headPlain: { en: "A message from the head", hi: "प्रिंसिपल का संदेश" },
  record: { en: "The school at a glance", hi: "स्कूल एक नज़र में" },
  founded: { en: "Founded", hi: "स्थापना" },
  board: { en: "Board and affiliation", hi: "बोर्ड और एफ़िलिएशन" },
  udise: { en: "UDISE+ code", hi: "UDISE+ कोड" },
  place: { en: "Location", hi: "स्थान" },
  head2: { en: "Head of school", hi: "प्रिंसिपल" },
  houses: { en: "The houses", hi: "हाउस" },
  campus: { en: "On campus", hi: "कैंपस में" },
  apply: { en: "Admissions", hi: "एडमिशन" },
  visit: { en: "Visit the school", hi: "स्कूल देखने आएँ" },
} satisfies Record<string, Bilingual>;

export default function AboutPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const headTitle = bi(site, "principalTitle", lang);
  const hasHead = hasBi(site, "principalMessage");
  const houses = withText(site.boarding?.houses, "title");
  const facilities = !ctx.href("facilities") ? biList(site, "facilities", lang) : [];
  /* The story sits beside the about photo, or the hero when there is none. */
  const storyPhoto = firstSlot(site, "about") || site.heroImage || undefined;
  const campusPhoto = firstSlot(site, "campus", "dining");
  const founded = bi(site, "established", lang) || bi(site, "establishedYear", lang);
  const board = bi(site, "boardOrAffiliation", lang);
  const udise = bi(site, "udiseCode", lang);
  const record = [
    founded && { label: tr(COPY.founded, lang), value: founded },
    board && { label: tr(COPY.board, lang), value: <Str text={board} /> },
    udise && { label: tr(COPY.udise, lang), value: <span className="ds-num">{udise}</span> },
    (site.principalName || "").trim() && { label: tr(COPY.head2, lang), value: [site.principalName, headTitle].filter(Boolean).join(", ") },
    (site.city || "").trim() && { label: tr(COPY.place, lang), value: [bi(site, "city", lang), bi(site, "state", lang)].filter(Boolean).join(", ") },
  ].filter(Boolean) as { label: string; value: ReactNode }[];
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={<Bi of={site} k="tagline" accent />}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {hasBi(site, "about") && (
        <Section n={++n} title={tr(COPY.story, lang)}>
          <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
            <div>
              <Bi of={site} k="about" as="p" className="max-w-prose whitespace-pre-line text-lg leading-relaxed" />
              {/* The template's history and founding year, until the school's own replace them. */}
              <SampleNote block="story" className="mt-6" />
            </div>
            <SlotPhoto src={storyPhoto} ratio="4 / 5" sizes="(min-width: 1024px) 440px, 100vw" />
          </div>
        </Section>
      )}

      {(hasBi(site, "vision") || hasBi(site, "mission")) && (
        <Section n={++n} title={tr(COPY.purpose, lang)}>
          <CardGrid cols={2}>
            {(["vision", "mission"] as const).filter((k) => hasBi(site, k)).map((k, i) => (
              <Reveal key={k} index={i}>
                <Card className="h-full">
                  <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{tr(COPY[k], lang)}</p>
                  <Bi of={site} k={k} as="p" className="ds-display mt-3 text-2xl leading-snug" />
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      {hasHead && (
        <Section n={++n} title={headTitle ? trf(COPY.head, lang, { title: headTitle }) : tr(COPY.headPlain, lang)}>
          <figure className="max-w-3xl">
            <blockquote className="border-l-4 border-[hsl(var(--ds-accent))] pl-5">
              <Bi of={site} k="principalMessage" as="p" className="whitespace-pre-line text-lg leading-relaxed sm:text-xl" />
            </blockquote>
            {site.principalName && (
              <figcaption className="mt-6 pl-5">
                <span className="ds-display block text-xl">{site.principalName}</span>
                {headTitle && <span className="text-[hsl(var(--ds-ink-soft))]">{headTitle}</span>}
              </figcaption>
            )}
          </figure>
        </Section>
      )}

      {record.length > 0 && (
        <Section n={++n} title={tr(COPY.record, lang)}>
          <FactTable rows={record} />
        </Section>
      )}

      {houses.length > 0 && (
        <Section n={++n} title={tr(COPY.houses, lang)}>
          <CardGrid cols={houses.length === 4 ? 4 : 3}>
            {houses.map((h, i) => (
              <Reveal key={i} index={i}><Card className="h-full"><Bi of={h} k="title" as="p" className="ds-display text-xl" /><Bi of={h} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" /></Card></Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      {facilities.length > 0 && (
        <Section n={++n} title={tr(COPY.campus, lang)}>
          <WithPhoto src={campusPhoto} flip ratio="3 / 2">
          <ul className={`grid gap-3 sm:grid-cols-2 ${campusPhoto ? "" : "lg:grid-cols-3"}`}>
            {facilities.map((f, i) => (
              <Reveal as="li" key={f} index={i} className="ds-card flex items-start gap-3 p-4">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" /><Str text={f} />
              </Reveal>
            ))}
          </ul>
          </WithPhoto>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.visit, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(COPY.apply, lang)}</Action>}
          <Action href={ctx.href("contact") || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}
