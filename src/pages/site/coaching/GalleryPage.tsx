/**
 * GALLERY. /gallery  (shown only with 6+ real photos)
 *
 *   filter   category chips with the filter transition, when 2+ categories
 *   grid     real photos only, lazy and sized, captions under them, and the
 *            lightbox (arrow keys, swipe, Esc, focus kept inside)
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { Chips } from "@/lib/demo/ui/coaching/Chips";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { distinct, useFilter } from "@/lib/demo/ui/coaching/filter";
import { PhotoGrid } from "@/lib/demo/ui/coaching/Lightbox";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";

const COPY = {
  title: { en: "The centre in photographs", hi: "तस्वीरों में हमारा centre" },
  crumb: { en: "Gallery", hi: "गैलरी" },
  show: { en: "Show", hi: "दिखाएँ" },
  photos: { en: "Photographs", hi: "तस्वीरें" },
} satisfies Record<string, Bilingual>;

export default function GalleryPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const photos = (site.photos || []).filter((p) => (p.src || "").trim());
  const cats = distinct(photos.map((p) => bi(p, "category", lang)));
  const f = useFilter<string>("all");
  const shown = f.value === "all" ? photos : photos.filter((p) => bi(p, "category", lang) === f.value);

  return (
    <>
      <Helmet><title>{`${tr(COPY.crumb, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.crumb, lang) }]}
      />
      <Section n={1} title={tr(COPY.photos, lang)}>
        <Chips label={tr(COPY.show, lang)} value={f.value} onChange={f.choose}
          options={[{ value: "all", label: tr(C_COPY.all, lang) }, ...cats.map((c) => ({ value: c, label: c }))]} />
        <div ref={f.gridRef}>
          <PhotoGrid key={f.value} photos={shown} />
        </div>
      </Section>
    </>
  );
}
