import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { useCollection } from "@/lib/cms/context";
import { sanitize } from "@/lib/sanitize";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/cms/types";

export default function CaseStudy() {
  const { slug } = useParams();
  const projects = useCollection("projects");
  const project = projects.find((p) => p.slug === slug) as Project | undefined;

  if (!project) {
    return (
      <Layout>
        <Seo title="Project not found" path="/work" noindex />
        <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
          <Aurora />
          <div className="container-page relative text-center">
            <Eyebrow>Case study</Eyebrow>
            <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
              We couldn't find that <span className="accent-italic text-gradient">project.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              It may have been moved or renamed. Explore the rest of our work instead.
            </p>
            <Link
              to="/work"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-transform hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" /> Back to all work
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  // Other projects for the "more work" band (prefer siblings in the same category).
  const others = projects.filter((p) => p.slug !== project.slug);
  const sameCategory = others.filter((p) => p.category === project.category);
  const moreWork = (sameCategory.length >= 2 ? sameCategory : others).slice(0, 3);

  const hasResults = Array.isArray(project.results) && project.results.length > 0;
  const hasGallery = Array.isArray(project.gallery) && project.gallery.length > 0;

  return (
    <Layout>
      <Seo title={project.title} description={project.summary} path={`/work/${project.slug}`} image={project.coverImage} type="article" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 md:pt-32">
        <Aurora className="opacity-70" />
        <div className="container-page relative">
          {/* Breadcrumb */}
          <Reveal>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/work" className="link-underline hover:text-foreground">
                Work
              </Link>
              <span aria-hidden className="text-border">/</span>
              <span className="truncate text-foreground">{project.title}</span>
            </nav>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Reveal>
                <span className="inline-flex items-center rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                  {project.category}
                </span>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.05] md:text-6xl">
                  {project.title}
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">{project.summary}</p>
              </Reveal>
            </div>

            <div className="lg:col-span-4">
              <Reveal delay={0.15}>
                <div className="card-surface rounded-3xl border border-border bg-card/60 p-6">
                  {project.clientName && (
                    <>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Client</p>
                      <p className="mt-1.5 font-display text-xl font-semibold">{project.clientName}</p>
                    </>
                  )}
                  <div className="mt-5 flex flex-wrap gap-3">
                    {project.liveUrl && (
                      <CtaButton cta={{ label: "Visit live site", href: project.liveUrl, variant: "primary" }} />
                    )}
                    <CtaButton cta={{ label: "Start a project", href: "/contact", variant: project.liveUrl ? "outline" : "primary" }} />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Cover image */}
          <Reveal delay={0.1} className="mt-12">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40">
              <div className="relative aspect-[16/9]">
                <img
                  src={project.coverImage}
                  alt={project.title}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Meta: technologies + results band */}
      <section className="section pt-16 md:pt-20">
        <div className="container-page">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Technologies */}
            <div className="lg:col-span-4">
              <Reveal>
                <Eyebrow>Stack</Eyebrow>
                <h2 className="mt-4 font-display text-2xl font-semibold">Technologies</h2>
                {project.technologies?.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-border bg-muted px-3.5 py-1.5 text-sm text-muted-foreground"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-muted-foreground">Tailored to the brief.</p>
                )}
              </Reveal>
            </div>

            {/* Results band */}
            {hasResults && (
              <div className="lg:col-span-8">
                <Reveal>
                  <div className="card-surface rounded-3xl border border-border bg-card/60 p-8 md:p-10">
                    <Eyebrow>Outcomes</Eyebrow>
                    <motion.div
                      variants={staggerContainer(0.08)}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.2 }}
                      className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {project.results.map((r, i) => (
                        <motion.div key={`${r.label}-${i}`} variants={fadeUp}>
                          <p className="font-display text-4xl font-semibold text-gradient md:text-5xl">{r.metric}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{r.label}</p>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </Reveal>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Challenge & Solution */}
      {(project.challenge || project.solution) && (
        <section className="section pt-4">
          <div className="container-page">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              {project.challenge && (
                <Reveal>
                  <div className="card-surface h-full rounded-3xl border border-border bg-card/60 p-8 md:p-10">
                    <Eyebrow>The challenge</Eyebrow>
                    <h2 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
                      What we set out to <span className="accent-italic text-gradient">solve</span>
                    </h2>
                    <p className="mt-5 text-pretty text-muted-foreground">{project.challenge}</p>
                  </div>
                </Reveal>
              )}
              {project.solution && (
                <Reveal delay={0.05}>
                  <div className="card-surface h-full rounded-3xl border border-border bg-card/60 p-8 md:p-10">
                    <Eyebrow>Our approach</Eyebrow>
                    <h2 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
                      How we <span className="accent-italic text-gradient">delivered</span>
                    </h2>
                    <p className="mt-5 text-pretty text-muted-foreground">{project.solution}</p>
                  </div>
                </Reveal>
              )}
            </div>

            {/* Optional long-form body (CMS HTML) */}
            {project.body && (
              <Reveal className="mt-10">
                <article
                  className="prose prose-invert max-w-3xl text-muted-foreground prose-headings:font-display prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitize(project.body) }}
                />
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Gallery */}
      {hasGallery && (
        <section className="section pt-4">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="Gallery"
              title={<>A closer <span className="accent-italic text-gradient">look</span></>}
              subtitle="Selected screens and moments from the build."
            />
            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {project.gallery.map((img, i) => (
                <motion.div
                  key={`${img.src}-${i}`}
                  variants={fadeUp}
                  className={cn(
                    "group overflow-hidden rounded-3xl border border-border bg-card/40",
                    i % 3 === 0 && "sm:col-span-2"
                  )}
                >
                  <div className={cn("relative overflow-hidden", i % 3 === 0 ? "aspect-[16/9]" : "aspect-[4/3]")}>
                    <img
                      src={img.src}
                      alt={img.alt || `${project.title} — image ${i + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Live site CTA strip */}
      {project.liveUrl && (
        <section className="pt-4">
          <div className="container-page">
            <Reveal>
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex flex-col items-start justify-between gap-4 rounded-3xl border border-border bg-card/60 p-8 transition-colors hover:border-primary/50 sm:flex-row sm:items-center md:p-10"
              >
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">See it live</p>
                  <p className="mt-2 font-display text-xl font-semibold md:text-2xl">Explore {project.title} in the wild</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  Visit site <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            </Reveal>
          </div>
        </section>
      )}

      {/* More work */}
      {moreWork.length > 0 && (
        <section className="section">
          <div className="container-page">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <SectionHeading
                align="left"
                eyebrow="Keep exploring"
                title={<>More <span className="accent-italic text-gradient">work</span></>}
                subtitle="Other projects you might want to see."
              />
              <Link
                to="/work"
                className="link-underline shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                All projects →
              </Link>
            </div>

            <motion.div
              variants={staggerContainer(0.09)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3"
            >
              {moreWork.map((p) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <Link
                    to={`/work/${p.slug}`}
                    className="group block h-full overflow-hidden rounded-3xl border border-border bg-card/40"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full border border-border bg-background/70 px-3 py-1 text-xs capitalize backdrop-blur">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 p-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
                      </div>
                      <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <Reveal className="mt-12" delay={0.05}>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to="/work"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to all work
                </Link>
                <CtaButton cta={{ label: "Start a project", href: "/contact", variant: "primary" }} />
                <span className="hidden text-muted-foreground sm:inline">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </Layout>
  );
}
