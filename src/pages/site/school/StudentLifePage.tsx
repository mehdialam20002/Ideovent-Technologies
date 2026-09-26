/**
 * STUDENT LIFE (s4 residential, s5 international). The record's studentLife
 * points grouped by `group` (Clubs, Sport, Service, Trips...), then real
 * photographs tagged with a matching category, when there are any.
 */

import { bi, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { groupPoints, PointCards } from "@/lib/demo/ui/school/points";
import { schoolPhotos } from "@/lib/demo/ui/school/shared";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Section } from "../kit/Section";
import { Action, Photo } from "../kit/Text";

const COPY = {
  title: { en: "Student life", hi: "छात्र जीवन" },
  lead: { en: "What happens after the last period, and at weekends.", hi: "आखिरी period के बाद और छुट्टी के दिन क्या होता है।" },
  group: { en: "Activities", hi: "गतिविधियाँ" },
  photos: { en: "In pictures", hi: "तस्वीरों में" },
  gallery: { en: "Open the gallery", hi: "Gallery खोलें" },
  next: { en: "Come and see", hi: "आकर देखें" },
} satisfies Record<string, Bilingual>;

export default function StudentLifePage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const groups = groupPoints(site.studentLife, lang, tr(COPY.group, lang));
  const photos = schoolPhotos(site).filter((p) => p.src && /sport|club|life|event|trip|activit|house/i.test(p.obj.category || "")).slice(0, 6);
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {groups.map((g) => (
        <Section key={g.name} n={++n} title={g.name}><PointCards items={g.items} /></Section>
      ))}

      {photos.length >= 2 && (
        <Section n={++n} title={tr(COPY.photos, lang)}>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {photos.map((p, i) => <Reveal as="li" key={p.key} index={i}><Photo src={p.src} alt={bi(p.obj, "alt", lang)} className="rounded-[var(--ds-radius)]" /></Reveal>)}
          </ul>
          {ctx.href("gallery") && <div className="mt-6"><Action href={ctx.href("gallery")!} tone="ghost">{tr(COPY.gallery, lang)}</Action></div>}
        </Section>
      )}

      <Section n={++n} title={tr(COPY.next, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          {ctx.href("boarding") && <Action href={ctx.href("boarding")!} tone="ghost">{tr(ctx.pages.find((p) => p.id === "boarding")!.label, lang)}</Action>}
          <Action href={ctx.href("contact") || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}
