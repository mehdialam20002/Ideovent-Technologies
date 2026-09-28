/**
 * BlogPage: /blog ("Guides"). The newest guide large, the rest in a grid,
 * topic chips when guides carry a category; each card names the dentist who
 * reviewed it (DCI 8.1.7) and its reading time; the "not a diagnosis" line.
 * Spec: Mehdi's brief item 12; DENTAL-COMPLIANCE.md s3 blog.
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { useState } from "react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { BookingBand, DISCLAIMER, DPageHead, wrap } from "@/lib/demo/ui/dental";
import { PB2 } from "./parts-b/support/copy2";
import { PostCard } from "./parts-b/support/posts";
import { crumbsFor, FilterChips } from "./parts-b/support/ui";

export default function BlogPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const posts = withText(site.posts, "title");
  const [cat, setCat] = useState("");
  const cats = [...new Set(posts.map((p) => (p.category || "").trim()).filter(Boolean))];
  const list = posts.filter((p) => !cat || p.category === cat);
  const [lead, ...rest] = list;
  const label = (v: string) => bi(posts.find((p) => p.category === v), "category", lang) || v;

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={tr(PB2.blogTitle, lang)} lead={tr(PB2.blogLead, lang)}
        crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })} />

      <section className="py-12 sm:py-16">
        <div className={wrap}>
          <FilterChips label={tr(PB2.byCategory, lang)} values={cats} value={cat} onChange={setCat} labelOf={label} allLabel={tr(PB2.all, lang)} />
          <div className={cats.length > 1 ? "mt-8" : ""} aria-live="polite">
            {lead && (
              <div>
                {!cat && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-ink-soft))]">{tr(PB2.latest, lang)}</p>}
                <PostCard p={lead} big />
              </div>
            )}
            {rest.length > 0 && (
              <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => <li key={p.slug || p.title}><PostCard p={p} /></li>)}
              </ul>
            )}
          </div>
          <p className="mt-10 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.info, lang)}</p>
        </div>
      </section>

      <BookingBand />
    </>
  );
}
