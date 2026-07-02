import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, CalendarDays, PenLine, Share2 } from "lucide-react";

import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { CtaButton } from "@/components/ui/cta-button";
import { Aurora } from "@/components/ui/aurora";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useCollection } from "@/lib/cms/context";
import { sanitize } from "@/lib/sanitize";
import type { BlogPost } from "@/lib/cms/types";

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/** Single article view for /blog/:slug. */
export default function BlogDetail() {
  const { slug } = useParams();
  const posts = useCollection("posts");

  const post = useMemo<BlogPost | undefined>(
    () => posts.find((p) => p.slug === slug) ?? posts.find((p) => p.id === slug),
    [posts, slug]
  );

  const related = useMemo(() => {
    if (!post) return [] as BlogPost[];
    const others = posts.filter((p) => p.id !== post.id && p.status !== "draft");
    const shared = others.filter((p) => p.tags?.some((t) => post.tags?.includes(t)));
    const pool = shared.length ? shared : others;
    return pool.slice(0, 3);
  }, [posts, post]);

  if (!post) {
    return (
      <Layout>
        <Seo title="Post not found" description="This article could not be found." path="/blog" />
        <section className="section">
          <div className="container-page">
            <div className="card-surface mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-border bg-card/60 px-8 py-16 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <PenLine className="h-5 w-5" />
              </span>
              <h1 className="font-display text-2xl font-semibold">We couldn&apos;t find that article.</h1>
              <p className="text-sm text-muted-foreground">
                The post may have been moved or unpublished. Head back to the blog to keep reading.
              </p>
              <CtaButton cta={{ label: "Back to blog", href: "/blog", variant: "primary" }} className="mt-2" />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/blog/${post.slug}`;

  return (
    <Layout>
      <Seo
        title={post.title}
        description={post.excerpt}
        image={post.coverImage}
        path={`/blog/${post.slug}`}
        type="article"
      />

      {/* Header */}
      <section className="section relative overflow-hidden pb-0">
        <Aurora />
        <div className="container-page relative">
          <Reveal>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to blog
            </Link>
          </Reveal>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-6 text-center">
            {post.tags?.length ? (
              <Reveal>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {post.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Reveal>
            ) : null}

            <Reveal delay={0.05}>
              <h1 className="text-display font-display font-semibold text-balance">{post.title}</h1>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <PenLine className="h-3.5 w-3.5" /> {post.author}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.publishDate)}
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Cover image */}
      {post.coverImage && (
        <section className="section pt-10">
          <div className="container-page">
            <Reveal>
              <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card/60">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Article body */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div
              className={[
                "prose prose-lg mx-auto max-w-3xl leading-relaxed text-foreground/90",
                "[&>p]:my-5 [&>p]:text-foreground/85",
                "[&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:font-display [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-foreground md:[&>h2]:text-3xl",
                "[&>h3]:mt-10 [&>h3]:mb-3 [&>h3]:font-display [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-foreground",
                "[&>h4]:mt-8 [&>h4]:mb-2 [&>h4]:font-display [&>h4]:text-lg [&>h4]:font-semibold [&>h4]:text-foreground",
                "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary/80",
                "[&_strong]:text-foreground [&_strong]:font-semibold",
                "[&>ul]:my-5 [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:my-2 [&>ul>li]:marker:text-primary",
                "[&>ol]:my-5 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:my-2 [&>ol>li]:marker:text-muted-foreground",
                "[&>blockquote]:my-6 [&>blockquote]:rounded-r-2xl [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:bg-card/60 [&>blockquote]:py-2 [&>blockquote]:pl-5 [&>blockquote]:pr-4 [&>blockquote]:italic [&>blockquote]:text-foreground/80",
                "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-foreground",
                "[&>pre]:my-6 [&>pre]:overflow-x-auto [&>pre]:rounded-2xl [&>pre]:border [&>pre]:border-border [&>pre]:bg-muted [&>pre]:p-5 [&>pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0",
                "[&_img]:my-8 [&_img]:rounded-2xl [&_img]:border [&_img]:border-border",
                "[&>hr]:my-10 [&>hr]:border-border",
              ].join(" ")}
              dangerouslySetInnerHTML={{ __html: sanitize(post.body) }}
            />
          </Reveal>
        </div>
      </section>

      {/* Share / CTA footer */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div className="card-surface relative mx-auto flex max-w-3xl flex-col items-center gap-5 overflow-hidden rounded-3xl border border-border bg-card/60 px-8 py-12 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Share2 className="h-5 w-5" />
              </span>
              <h2 className="font-display text-2xl font-semibold text-balance">
                Enjoyed this <span className="accent-italic text-gradient">read</span>?
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Share it with your team, or start a conversation with us about building something great.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <CtaButton cta={{ label: "Start a project", href: "/contact", variant: "primary" }} />
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Share2 className="h-4 w-4" /> Share
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Read more */}
      {related.length > 0 && (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="Keep reading"
              title={<>More from the <span className="accent-italic text-gradient">journal</span></>}
              subtitle="Hand-picked articles you might also enjoy."
            />

            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {related.map((p) => (
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
                      <div className="mt-auto flex items-center justify-between gap-4 pt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" /> {formatDate(p.publishDate)}
                        </span>
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>
      )}
    </Layout>
  );
}
