/**
 * SCHOOL GALLERY. Real photographs only (the page exists at four or more).
 * Category chips filter the grid with a FLIP (removed tiles fade and shrink
 * to 0.96, the rest glide); a tap opens the lightbox, which zooms from the
 * thumbnail (ui/school/Lightbox.tsx). Captions print under every photo.
 *
 * Family: Classic is a contact sheet with numbered plate captions; Modern an
 * even grid of bordered tiles; Warm rounded tiles with the caption inside.
 */

import { useState } from "react";
import { bi, tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { FilterChips, useFlipList } from "@/lib/demo/ui/school/filter";
import { Lightbox } from "@/lib/demo/ui/school/Lightbox";
import { photoCategory, schoolPhotos } from "@/lib/demo/ui/school/shared";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";
import { Action, Bi, Photo } from "../kit/Text";

const COPY = {
  title: { en: "Gallery", hi: "गैलरी" },
  lead: { en: "Ordinary days and a few special ones.", hi: "आम दिन, और कुछ खास दिन।" },
  all: { en: "All", hi: "सभी" },
  filter: { en: "Show photographs by category", hi: "Category के हिसाब से तस्वीरें" },
  photos: { en: "Photographs", hi: "तस्वीरें" },
  count: { en: "{n} photographs", hi: "{n} तस्वीरें" },
  open: { en: "Open photograph: {alt}", hi: "तस्वीर खोलें: {alt}" },
  plate: { en: "Plate {n}", hi: "चित्र {n}" },
  close: { en: "Close", hi: "बंद करें" },
  prev: { en: "Previous photograph", hi: "पिछली तस्वीर" },
  next: { en: "Next photograph", hi: "अगली तस्वीर" },
  of: { en: "of", hi: "में से" },
  dialog: { en: "Photograph viewer", hi: "तस्वीर देखें" },
  visit: { en: "See the school in person", hi: "School खुद आकर देखें" },
} satisfies Record<string, Bilingual>;

export default function GalleryPage({ site, ctx }: SitePageProps) {
  const { lang, family } = ctx;
  const photos = schoolPhotos(site).filter((p) => p.src);
  const cats = [...new Set(photos.map((p) => photoCategory(p, lang)).filter(Boolean))];
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<{ i: number; el: HTMLElement } | null>(null);
  const flip = useFlipList<HTMLUListElement>();
  const shown = photos.filter((p) => cat === "all" || photoCategory(p, lang) === cat);
  const choose = (c: string) => {
    if (c === cat) return;
    flip.run(() => setCat(c), (k) => photos.some((p) => p.key === k && (c === "all" || photoCategory(p, lang) === c)));
  };
  const items = shown.map((p) => ({ src: p.src, alt: bi(p.obj, "alt", lang), caption: bi(p.obj, "caption", lang) || bi(p.obj, "alt", lang) }));
  const grid = family === "classic" ? "grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3" : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3";
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      <Section n={++n} title={tr(COPY.photos, lang)} lead={trf(COPY.count, lang, { n: String(photos.length) })}>
        {cats.length > 1 && (
          <div className="mb-6">
            <FilterChips label={tr(COPY.filter, lang)} value={cat} onChange={choose}
              options={[{ id: "all", label: tr(COPY.all, lang), count: photos.length }, ...cats.map((c) => ({ id: c, label: c, count: photos.filter((p) => photoCategory(p, lang) === c).length }))]} />
          </div>
        )}
        <ul ref={flip.ref} className={grid}>
          {shown.map((p, i) => (
            <li key={p.key} data-k={p.key}>
              <figure className={family === "warm" ? "ds-card overflow-hidden p-0" : ""}>
                <button type="button" className={`ds-card group block w-full overflow-hidden p-0 text-left ${family === "classic" ? "border-0" : ""}`} data-interactive=""
                  aria-label={trf(COPY.open, lang, { alt: bi(p.obj, "alt", lang) })}
                  onClick={(e) => setOpen({ i, el: e.currentTarget })}>
                  <Photo src={p.src} alt={bi(p.obj, "alt", lang)} ratio={family === "classic" ? "3 / 2" : "4 / 3"} />
                </button>
                <figcaption className={family === "warm" ? "p-4 text-sm" : "mt-2 text-sm text-[hsl(var(--ds-ink-soft))]"}>
                  {family === "classic" && <span className="ds-smallcaps ds-num mr-2 text-[hsl(var(--ds-accent))]">{trf(COPY.plate, lang, { n: String(i + 1) })}.</span>}
                  <Bi of={p.obj} k={bi(p.obj, "caption", lang) ? "caption" : "alt"} />
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={++n} title={tr(COPY.visit, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          <Action href={ctx.href("contact") || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>

      {open && (
        <Lightbox items={items} index={open.i} origin={open.el} onIndex={(i) => setOpen({ i, el: open.el })} onClose={() => setOpen(null)}
          labels={{ close: tr(COPY.close, lang), prev: tr(COPY.prev, lang), next: tr(COPY.next, lang), of: tr(COPY.of, lang), dialog: tr(COPY.dialog, lang) }} />
      )}
    </>
  );
}
