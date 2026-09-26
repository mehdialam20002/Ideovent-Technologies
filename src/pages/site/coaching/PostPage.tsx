/**
 * ONE ARTICLE. /blog/<post>
 *
 *   The post in a 68ch reading column: date, author, title, body as
 *   paragraphs (blank lines split them). Then the other posts and one
 *   action. An unknown slug renders the designed not-published state.
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { postSlug, type SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "../kit/Hero";
import { PageStub } from "../kit/PageStub";
import { SiteLink } from "../kit/motion";
import { Section } from "../kit/Section";
import { Action } from "../kit/Text";

const COPY = {
  blog: { en: "Blog", hi: "ब्लॉग" },
  more: { en: "More articles", hi: "और लेख" },
  by: { en: "By {author}", hi: "{author}" },
} satisfies Record<string, Bilingual>;

export default function PostPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const posts = withText(site.posts, "title");
  const post = posts.find((p) => postSlug(p) === ctx.param);
  if (!post) return <PageStub site={site} ctx={ctx} />;
  const title = bi(post, "title", lang);
  const body = bi(post, "body", lang) || bi(post, "excerpt", lang);
  const bodyLang = lang === "hi" ? (post.hi?.body ? undefined : "en") : (post.body ? undefined : post.hi?.body ? "hi" : undefined);
  const others = posts.filter((p) => p !== post).slice(0, 3);
  const demo = ctx.href("demo-class") || ctx.href("contact");

  return (
    <>
      <Helmet><title>{`${title} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        eyebrow={[post.date, post.author && tr(COPY.by, lang).replace("{author}", post.author)].filter(Boolean).join("  ·  ") || undefined}
        title={title}
        crumbs={[
          { label: tr(SHELL_COPY.home, lang), href: ctx.href("home") },
          { label: tr(COPY.blog, lang), href: ctx.href("blog") },
          { label: title },
        ]}
      />
      <article className="mx-auto w-full max-w-[68ch] px-4 py-12 text-lg leading-relaxed sm:px-6" lang={bodyLang}>
        {body.split(/\n\s*\n/).map((para, i) => <p key={i} className="mb-5 whitespace-pre-line">{para}</p>)}
        {demo && <div className="mt-10"><Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action></div>}
      </article>
      {others.length > 0 && (
        <Section n={1} title={tr(COPY.more, lang)}>
          <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
            {others.map((p) => {
              const to = ctx.href("post", postSlug(p));
              return to ? (
                <li key={to}>
                  <SiteLink to={to} className="flex min-h-[52px] items-baseline justify-between gap-4 py-3">
                    <span className="font-semibold">{bi(p, "title", lang)}</span>
                    <span className="ds-num shrink-0 text-sm text-[hsl(var(--ds-ink-soft))]">{p.date}</span>
                  </SiteLink>
                </li>
              ) : null;
            })}
          </ul>
        </Section>
      )}
    </>
  );
}
