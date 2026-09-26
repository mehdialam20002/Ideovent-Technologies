/**
 * BLOG INDEX. /blog
 *
 *   The newest post as a lead item, then the rest as a list of dated
 *   entries with their excerpt. Each links to /blog/<post>.
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { postSlug, type SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "../kit/Hero";
import { Reveal, SiteLink } from "../kit/motion";
import { Card, CardGrid, Section } from "../kit/Section";
import { Bi } from "../kit/Text";

const COPY = {
  title: { en: "Blog", hi: "ब्लॉग" },
  lead: { en: "Study plans, exam updates and advice from the teachers.", hi: "पढ़ाई के plan, exam की खबरें और टीचर्स की सलाह।" },
  latest: { en: "Latest", hi: "नया" },
  more: { en: "More articles", hi: "और लेख" },
  read: { en: "Read the article", hi: "लेख पढ़ें" },
} satisfies Record<string, Bilingual>;

export default function BlogPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const posts = withText(site.posts, "title").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const [first, ...rest] = posts;
  const link = (p: typeof first) => ctx.href("post", postSlug(p));

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      />
      {first && (
        <Section n={1} title={tr(COPY.latest, lang)}>
          <article className="max-w-3xl">
            <p className="ds-num text-sm text-[hsl(var(--ds-ink-soft))]">{[first.date, first.author].filter(Boolean).join("  ·  ")}</p>
            <h3 className="ds-display mt-2 text-2xl sm:text-3xl">
              {link(first) ? <SiteLink to={link(first)!} className="underline-offset-4 hover:underline">{bi(first, "title", lang)}</SiteLink> : bi(first, "title", lang)}
            </h3>
            <Bi of={first} k="excerpt" as="p" className="mt-3 text-lg text-[hsl(var(--ds-ink-soft))]" />
            {link(first) && <SiteLink to={link(first)!} className="ds-btn ds-btn-ghost mt-5">{tr(COPY.read, lang)}</SiteLink>}
          </article>
        </Section>
      )}
      {rest.length > 0 && (
        <Section n={2} title={tr(COPY.more, lang)}>
          <CardGrid cols={3}>
            {rest.map((p, i) => {
              const to = link(p);
              const card = (
                <Card interactive={!!to} as="article" className="h-full">
                  <p className="ds-num text-sm text-[hsl(var(--ds-ink-soft))]">{p.date}</p>
                  <Bi of={p} k="title" as="h3" className="ds-display mt-1 text-lg" />
                  <Bi of={p} k="excerpt" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
                </Card>
              );
              return <Reveal key={i} index={i} className="h-full">{to ? <SiteLink to={to} className="block h-full">{card}</SiteLink> : card}</Reveal>;
            })}
          </CardGrid>
        </Section>
      )}
    </>
  );
}
