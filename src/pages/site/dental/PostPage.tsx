/**
 * PostPage: /blog/<slug>. One guide: category, title, excerpt, the
 * "Medically reviewed by" line, author, date and reading time; the body at a
 * 68ch measure; the "not a diagnosis" line; beside it the treatment the
 * guide is about with a booking button pre-filled for it; more guides.
 * A bad slug goes back to the list.
 * Spec: DENTAL-COMPLIANCE.md s3 blog (8.1.7), s4 info line.
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import { Navigate } from "react-router-dom";
import { Info, ShieldCheck } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { postSlug, treatmentSlug } from "@/lib/demo/site/context";
import { BookButton, BookingBand, DENTAL_COPY, DISCLAIMER, DPageHead, findTreatment, TreatmentCard, wrap } from "@/lib/demo/ui/dental";
import { PB2 } from "./parts-b/support/copy2";
import { PostBody, PostCard, PostMeta, reviewedLine } from "./parts-b/support/posts";
import { crumbsFor, H2, TalkCard } from "./parts-b/support/ui";

export default function PostPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const posts = withText(site.posts, "title");
  const p = posts.find((x) => postSlug(x) === ctx.param);
  if (!p) return <Navigate to={ctx.href("blog") || ctx.basePath} replace />;
  const t = findTreatment(site, p.treatment);
  const blog = ctx.href("blog");
  const reviewed = reviewedLine(p, lang);
  const author = bi(p, "author", lang);
  const more = posts.filter((x) => x !== p).sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category)).slice(0, 3);
  const blogLabel = ctx.pages.find((x) => x.id === "blog");

  return (
    <>
      <DPageHead eyebrow={bi(p, "category", lang) || (blogLabel ? tr(blogLabel.label, lang) : "")} title={bi(p, "title", lang)} lead={bi(p, "excerpt", lang)}
        crumbs={crumbsFor(ctx, ...(blog && blogLabel ? [{ label: tr(blogLabel.label, lang), href: blog }] : []), { label: bi(p, "title", lang) })}>
        <div className="grid gap-1 text-sm">
          {reviewed && <p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-[hsl(var(--ds-accent))]" aria-hidden="true" />{reviewed}</p>}
          {author && <p className="text-[hsl(var(--ds-ink-soft))]">{tr(PB2.writtenBy, lang)} {author}</p>}
          <PostMeta p={p} />
        </div>
      </DPageHead>

      <section className="py-12 sm:py-16">
        <div className={`${wrap} grid items-start gap-12 lg:grid-cols-[minmax(0,68ch)_320px] lg:justify-between`}>
          <article className="min-w-0">
            <PostBody text={bi(p, "body", lang)} />
            <p className="mt-10 flex gap-2.5 rounded-[calc(var(--ds-radius)*0.7)] bg-[hsl(var(--ds-surface-2))] p-4 text-sm leading-relaxed">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
              <span>{tr(DISCLAIMER.info, lang)}</span>
            </p>
          </article>

          <aside className="grid gap-6 lg:sticky lg:top-[calc(var(--dn-header-h)+24px)]">
            {t && (
              <div className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{tr(PB2.relatedTitle, lang)}</p>
                <TreatmentCard treatment={t} />
                {t.fromPrice && <p className="text-xs leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(DISCLAIMER.fees, lang)}</p>}
                <p className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(PB2.askDentist, lang)}</p>
                <BookButton preset={{ treatment: treatmentSlug(t), reason: t.reason }} className="w-full">{tr(DENTAL_COPY.bookConsult, lang)}</BookButton>
              </div>
            )}
            <TalkCard />
          </aside>
        </div>
      </section>

      {more.length > 0 && (
        <section className="bg-[hsl(var(--ds-surface-2))] py-14 sm:py-20">
          <div className={wrap}>
            <H2>{tr(PB2.moreGuides, lang)}</H2>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {more.map((x) => <li key={x.slug || x.title}><PostCard p={x} /></li>)}
            </ul>
          </div>
        </section>
      )}

      <BookingBand />
    </>
  );
}
