import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, PenLine, SearchX } from "lucide-react";

import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Aurora } from "@/components/ui/aurora";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState } from "@/components/ui/empty-state";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useCollection } from "@/lib/cms/context";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/lib/cms/types";
import { PAGE_SEO } from "@/lib/seo/pages";
import { formatPostDate as formatDate } from "@/lib/postDate";

const ALL = "All";

/** Insights & articles index. */
export default function Blog() {
  const posts = useCollection("posts").filter((p) => p.status !== "draft");

  const tags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t) => t && set.add(t)));
    return [ALL,...Array.from(set)];
  }, [posts]);

  const [activeTag, setActiveTag] = useState(ALL);

  const featured: BlogPost | undefined = useMemo(
    () => posts.find((p) => p.featured) ?? posts[0],
    [posts]
);

  const rest = useMemo(() => posts.filter((p) => p.id !== featured?.id), [posts, featured]);

  const filtered = useMemo(
    () => (activeTag === ALL ? rest: rest.filter((p) => p.tags?.includes(activeTag))),
    [rest, activeTag]
);

  return (
    <Layout>
      {/* Title and description: src/lib/seo/pages.ts (PAGE_SEO["/blog"]). */}
      <Seo
        path="/blog"
        breadcrumbs={[{ name: "Blog", path: "/blog" }]}
        schema={{
          "@type": "Blog",
          name: "Ideovent Technologies Blog",
          inLanguage: "en-IN",
        }}
      />

      {/* Hero */}
      <section className="section relative overflow-hidden">
        <Aurora />
        <div className="container-page relative">
          {/* The h1 in search words where the eyebrow pill was; the display line
              is a paragraph, so the page has one h1. No entrance motion above the
              fold (SEO audit, 1 Oct 2026). */}
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h1 className="mt-8 max-w-2xl font-display text-base font-semibold text-primary text-balance md:mt-0 md:text-lg">
              {PAGE_SEO["/blog"].h1}
            </h1>
            <p className="text-display font-display font-semibold">
              Ideas worth <span className="accent-italic text-gradient">building</span> on
            </p>
            <p className="text-base text-muted-foreground text-pretty md:text-lg">
              Plain guides for business owners: what a website costs in India, paying monthly or
              once, and what a clinic, school or coaching institute website needs to show.
            </p>
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        /* Nothing here promises a post that nobody has committed to writing:
           "check back soon" is a claim about the future, and this page has no
           way to keep it. It says what is true and offers the two pages that
           carry the same information in a form that does exist. */
        <EmptyState
          className="pt-0"
          eyebrow="Notes"
          icon={<PenLine className="h-5 w-5" aria-hidden="true" />}
          title={<>Nothing is <span className="accent-italic">published yet.</span></>}
          body="When we write something worth reading it lands here. In the meantime the work and the price list say more about how we build than an article would."
          action={{ label: "Selected work", href: "/work" }}
          links={[{ label: "Prices", to: "/pricing" }, { label: "Talk to us", to: "/contact" }]}
        />
): (
        <>
          {/* Featured post */}
          {featured && (
            <section className="section pt-0">
              <div className="container-page">
                <Reveal>
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="group grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card/60 transition-transform duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0 lg:grid-cols-2"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto">
                      {/* Decorative: the post title is the visible text of this same link,
                          so a repeated alt makes a screen reader announce the card twice. */}
                      <img
                        src={featured.coverImage}
                        alt=""
                        width={800}
                        height={500}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent lg:bg-gradient-to-r" />
                      <span className="absolute left-4 top-4 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
                        Featured
                      </span>
                    </div>
                    <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
                      <div className="flex flex-wrap gap-1.5">
                        {featured.tags?.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                            {t}
                          </span>
))}
                      </div>
                      <h2 className="font-display text-2xl font-semibold text-balance md:text-3xl">
                        {featured.title}
                      </h2>
                      <p className="line-clamp-3 text-muted-foreground">{featured.excerpt}</p>
                      <div className="mt-2 flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <PenLine className="h-3.5 w-3.5" /> {featured.author}
                          </span>
                          {featured.publishDate ? (
                            <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                              <time dateTime={featured.publishDate}>{formatDate(featured.publishDate)}</time>
                            </span>
                          ) : <span aria-hidden="true" />}
                        </div>
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              </div>
            </section>
)}

          {/* Grid + tag filter */}
          <section className="section pt-0">
            <div className="container-page">
              <SectionHeading
                align="left"
                eyebrow="All articles"
                title={<>From the <span className="accent-italic text-gradient">journal</span></>}
                subtitle="Browse everything we’ve published, or filter by topic."
              />

              {tags.length > 2 && (
                <Reveal delay={0.05}>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveTag(t)}
                        aria-pressed={activeTag === t}
                        /* Three states, not one. The selected pill had no hover
                           at all and the unselected ones changed only their
                           label colour, so on a phone (no hover) a tap on a
                           filter was unacknowledged until the grid below it
                           re-rendered. `active:` is the press. */
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200",
                          activeTag === t
                            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
: "border-border bg-card/40 text-muted-foreground hover:border-primary/50 hover:text-foreground active:bg-muted"
)}
                      >
                        {t}
                      </button>
))}
                  </div>
                </Reveal>
)}

              {filtered.length === 0 ? (
                /* THE FILTERED-TO-NOTHING STATE. It was one grey sentence in the
                   flow of the page, which reads as a rendering failure rather
                   than as an answer, and it left the visitor holding a filter
                   with no way back other than finding the "All" pill again. It
                   now names the topic they chose and carries the reset. */
                <div className="mt-10 rounded-3xl border border-dashed border-border px-8 py-14 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
                    <SearchX className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-5 font-display text-lg font-medium">
                    Nothing under {activeTag} yet.
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
                    Every other topic still has something in it.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTag(ALL)}
                    className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium
                               transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
                  >
                    Show every article
                  </button>
                </div>
): (
                <motion.div
                  key={activeTag}
                  variants={staggerContainer()}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.15 }}
                  className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {filtered.map((p) => (
                    <motion.article key={p.id} variants={fadeUp}>
                      <Link
                        to={`/blog/${p.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/60 transition-transform duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img
                            src={p.coverImage}
                            alt=""
                            width={800}
                            height={500}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-6">
                          <div className="flex flex-wrap gap-1.5">
                            {p.tags?.slice(0, 2).map((t) => (
                              <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                                {t}
                              </span>
))}
                          </div>
                          <h3 className="font-display text-lg font-semibold leading-snug text-balance transition-colors group-hover:text-primary">
                            {p.title}
                          </h3>
                          <p className="line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
                          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <PenLine className="h-3.5 w-3.5" /> {p.author}
                            </span>
                            {p.publishDate ? (
                              <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                                <time dateTime={p.publishDate}>{formatDate(p.publishDate)}</time>
                              </span>
                            ) : <span aria-hidden="true" />}
                          </div>
                        </div>
                      </Link>
                    </motion.article>
))}
                </motion.div>
)}
            </div>
          </section>
        </>
)}
    </Layout>
);
}
