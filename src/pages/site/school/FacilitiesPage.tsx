/**
 * SCHOOL CAMPUS (facilities). Sections, each only with data:
 *   groups     facilityDetails grouped by `group` (Learning, Sport, Care...),
 *              one section per group; the first card of each group is wide
 *              (a bento row in Modern, a lead row in Classic, a big room in Warm)
 *   list       the short facilities list, when there are no details
 *   photos     the campus photo as a band over the first group; a group
 *              whose name matches a photo slot (labs, library, sports, dining,
 *              hostel, activities) gets that photo as one more tile; then up
 *              to six gallery photos not already on the page
 */

import { hasBi, tr, withText, bi, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { clean, schoolPhotos, Str } from "@/lib/demo/ui/school/shared";
import { photoAlt, PhotoBand, slotPhoto, SlotPhoto } from "@/lib/demo/ui/school/photos";
import type { DemoPhotoSlot } from "@/lib/demo/images";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Card, Section } from "../kit/Section";
import { Action, Bi, Photo } from "../kit/Text";

/* A facility group, by its English name, to the photo slot that suits it. */
const GROUP_SLOT: [RegExp, DemoPhotoSlot][] = [
  [/lab|science/i, "labs"],
  [/librar|read/i, "library"],
  [/sport|games|field|outdoor|play/i, "sports"],
  [/dining|meal|food|kitchen/i, "dining"],
  [/hostel|board|house|residen/i, "hostel"],
  [/art|music|activit|club/i, "activities"],
];

const COPY = {
  title: { en: "Campus and facilities", hi: "कैंपस और सुविधाएँ" },
  lead: { en: "What a child uses in an ordinary week.", hi: "एक आम हफ़्ते में बच्चा क्या-क्या इस्तेमाल करता है।" },
  facilities: { en: "Facilities", hi: "सुविधाएँ" },
  more: { en: "Also on campus", hi: "कैंपस में और" },
  photos: { en: "Around the campus", hi: "कैंपस की झलक" },
  gallery: { en: "Open the gallery", hi: "गैलरी खोलें" },
  visit: { en: "See it for yourself", hi: "खुद आकर देखें" },
} satisfies Record<string, Bilingual>;

export default function FacilitiesPage({ site, ctx }: SitePageProps) {
  const { lang, family } = ctx;
  const details = withText(site.facilityDetails, "title");
  const groupOf = (g: string) => g || tr(COPY.facilities, lang);
  const groups: { name: string; items: typeof details }[] = [];
  for (const d of details) {
    const name = groupOf(bi(d, "group", lang));
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(d);
    else groups.push({ name, items: [d] });
  }
  const list = clean(site.facilities);
  const detailTitles = new Set(details.map((d) => d.title.toLowerCase()));
  const extra = list.filter((f) => !detailTitles.has(f.toLowerCase()));
  const campus = slotPhoto(site, "campus");
  const used = new Set<string>(campus ? [campus] : []);
  const groupPhoto = groups.map((g) => {
    const name = g.items[0]?.group || "";
    const slot = GROUP_SLOT.find(([re]) => re.test(name))?.[1];
    const src = slot ? slotPhoto(site, slot) : undefined;
    if (!src || used.has(src)) return undefined;
    used.add(src);
    return src;
  });
  const photos = schoolPhotos(site).filter((p) => p.src && !used.has(p.src)).slice(0, 6);
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {groups.map((g, gi) => (
        <Section key={g.name} n={++n} title={g.name}>
          {gi === 0 && <PhotoBand src={campus} />}
          <ul className={`grid gap-4 sm:grid-cols-2 ${family === "classic" ? "gap-0" : "lg:grid-cols-3"}`}>
            {g.items.map((d, i) => (
              <Reveal as="li" key={i} index={i} className={i === 0 && g.items.length > 2 && family !== "classic" ? "sm:col-span-2" : ""}>
                <Card interactive className={`h-full ${i === 0 && g.items.length > 2 && family === "modern" ? "bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))] [&_p]:!text-inherit" : ""}`}>
                  <Bi of={d} k="title" as="p" className={`ds-display ${i === 0 && g.items.length > 2 ? "text-2xl" : "text-xl"}`} />
                  <Bi of={d} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
                </Card>
              </Reveal>
            ))}
            {groupPhoto[gi] && (
              <Reveal as="li" index={g.items.length}>
                <SlotPhoto src={groupPhoto[gi]} ratio="4 / 3" sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="h-full" />
              </Reveal>
            )}
          </ul>
        </Section>
      ))}

      {extra.length > 0 && (
        <Section n={++n} title={tr(groups.length ? COPY.more : COPY.facilities, lang)}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {extra.map((f, i) => (
              <Reveal as="li" key={f} index={i} className="ds-card flex items-start gap-3 p-4">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" /><Str text={f} />
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {photos.length >= 2 && (
        <Section n={++n} title={tr(COPY.photos, lang)}>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {photos.map((p, i) => (
              <Reveal as="li" key={p.key} index={i}>
                <figure>
                  <Photo src={p.src} alt={photoAlt(p, lang)} sizes="(min-width: 1024px) 360px, 50vw" className="rounded-[var(--ds-radius)]" />
                  {hasBi(p.obj, "caption") && <figcaption className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]"><Bi of={p.obj} k="caption" /></figcaption>}
                </figure>
              </Reveal>
            ))}
          </ul>
          {ctx.href("gallery") && <div className="mt-6"><Action href={ctx.href("gallery")!} tone="ghost">{tr(COPY.gallery, lang)}</Action></div>}
        </Section>
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
