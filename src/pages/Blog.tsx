import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, PenLine } from "lucide-react";

import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Aurora } from "@/components/ui/aurora";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useCollection } from "@/lib/cms/context";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/lib/cms/types";

const ALL = "All";

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/** Insights & articles index. */
export default function Blog() {
  const posts = useCollection("posts").filter((p) => p.status !== "draft");

  const tags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t) => t && set.add(t)));
    return [ALL, ...Array.from(set)];
  }, [posts]);

  const [activeTag, setActiveTag] = useState(ALL);

  const featured: BlogPost | undefined = useMemo(
    () => posts.find((p) => p.featured) ?? posts[0],
    [posts]
  );

  const rest = useMemo(() => posts.filter((p) => p.id !== featured?.id), [posts, featured]);

  const filtered = useMemo(
    () => (activeTag === ALL ? rest : rest.filter((p) => p.tags?.includes(activeTag))),
    [rest, activeTag]
  );

  return (
    <Layout>
      <Seo
        title="Blog"
        description="Ideas, guides, and insights from the Ideovent Technologies team on web, design, and building modern digital products."
        path="/blog"
      />

      {/* Hero */}
      <section className="section relative overflow-hidden">
        <Aurora />
        <div className="container-page relative">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <Reveal>
              <Eyebrow>Insights &amp; Blog</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-display font-display font-semibold">
                Ideas worth <span className="accent-italic text-gradient">building</span> on
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-base text-muted-foreground text-pretty md:text-lg">
                Practical guides, opinionated takes, and behind-the-scenes notes on design,
                engineering, and growing digital products.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="section pt-0">
          <div className="container-page">
            <div className="card-surface mx-auto flex max-w-xl flex-col items-center gap-3 rounded-3xl border border-border bg-card/60 px-8 py-16 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <PenLine className="h-5 w-5" />
              </span>
              <h2 className="font-display text-xl font-semibold">No posts yet.</h2>
              <p className="text-sm text-muted-foreground">
                We're busy writing. Check back soon for fresh insights.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Featured post */}
          {featured && (
            <section className="section pt-0">
              <div className="container-page">
                <Reveal>
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="group grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card/60 transition-transform duration-500 hover:-translate-y-1 lg:grid-cols-2"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto">
                      <img
                        src={featured.coverImage}
                        alt={featured.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(featured.publishDate)}
                          </span>
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
                subtitle="Browse everything we've published, or filter by topic."
              />

              {tags.length > 2 && (
                <Reveal delay={0.05}>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveTag(t)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                          activeTag === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Reveal>
              )}

              {filtered.length === 0 ? (
                <p className="mt-12 text-muted-foreground">No posts in this topic yet.</p>
              ) : (
                <motion.div
                  key={activeTag}
                  variants={staggerContainer(0.08)}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.15 }}
                  className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {filtered.map((p) => (
                    <motion.article key={p.id} variants={fadeUp}>
                      <Link
                        to={`/blog/${p.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/60 transition-transform duration-500 hover:-translate-y-1"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img
                            src={p.coverImage}
                            alt={p.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" /> {formatDate(p.publishDate)}
                            </span>
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
