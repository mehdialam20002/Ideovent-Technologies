/**
 * THE DEMO'S OWN SITEMAP: every page this record shows, generated from the
 * same visiblePages() list as the nav and footer, with each course and post
 * page listed under its parent. So it can never list a hollow page either.
 */

import { bi, tr } from "@/lib/demo/site/bilingual";
import { courseSlug, postSlug, type SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "./kit/Hero";
import { SiteLink } from "./kit/motion";

export default function SitemapPage({ site, ctx }: SitePageProps) {
  const { lang, pages } = ctx;
  const items: { key: string; to: string; label: string; depth: number }[] = [];
  for (const p of pages) {
    if (p.id === "course") {
      for (const c of site.courses || []) {
        const to = ctx.href("course", courseSlug(c));
        if (to) items.push({ key: `c-${to}`, to, label: bi(c, "name", lang), depth: 1 });
      }
      continue;
    }
    if (p.id === "post") {
      for (const post of site.posts || []) {
        const to = ctx.href("post", postSlug(post));
        if (to) items.push({ key: `p-${to}`, to, label: bi(post, "title", lang), depth: 1 });
      }
      continue;
    }
    const to = ctx.href(p.id);
    if (to) items.push({ key: p.id, to, label: tr(p.label, lang), depth: 0 });
  }
  return (
    <>
      <PageHead title={tr(SHELL_COPY.sitemapTitle, lang)} />
      <ul className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {items.map((it) => (
          <li key={it.key} className={`border-b border-[hsl(var(--ds-line))] py-3 ${it.depth ? "pl-6 text-[hsl(var(--ds-ink-soft))]" : "font-semibold"}`}>
            <SiteLink to={it.to} className="underline-offset-4 hover:underline">{it.label}</SiteLink>
          </li>
        ))}
      </ul>
    </>
  );
}
