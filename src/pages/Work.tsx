import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, FolderSearch } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { Reveal } from "@/components/motion/Reveal";
import { useCollection } from "@/lib/cms/context";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ALL = "All";

export default function Work() {
  const projects = useCollection("projects");
  const [activeFilter, setActiveFilter] = useState(ALL);

  // Distinct categories derived dynamically from the actual project data (never hardcoded).
  const categories = useMemo(() => {
    const distinct = Array.from(
      new Set(projects.map((p) => p.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return [ALL, ...distinct];
  }, [projects]);

  const filtered = useMemo(
    () =>
      activeFilter === ALL
        ? projects
        : projects.filter((p) => p.category === activeFilter),
    [projects, activeFilter]
  );

  return (
    <Layout>
      <Seo
        title="Our Work"
        description="A portfolio of projects we've shipped — marketing sites, web apps, and real-time products built with craft and care."
        path="/work"
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow>Our work</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-display font-display font-semibold">
                Projects we're{" "}
                <span className="accent-italic text-gradient">proud of</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
                A curated selection of the work we've shipped — from marketing
                sites and brand systems to real-time products. Filter by
                category to explore what we do best.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Filter + grid */}
      <section className="section pt-0">
        <div className="container-page">
          {/* Category filter row */}
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {categories.map((cat) => {
                const active = activeFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveFilter(cat)}
                    aria-pressed={active}
                    className={cn(
                      "relative rounded-full border px-5 py-2 text-sm font-medium capitalize transition-colors",
                      active
                        ? "border-transparent text-primary-foreground"
                        : "border-border bg-card/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="work-filter-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_0_40px_-12px_hsl(var(--primary)/0.7)]"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    {cat}
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Grid */}
          {filtered.length > 0 ? (
            <motion.div
              layout
              variants={staggerContainer(0.08)}
              initial="hidden"
              animate="show"
              className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                  >
                    <Link
                      to={`/work/${p.slug}`}
                      className="group block h-full overflow-hidden rounded-3xl border border-border bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20"
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
                        <span className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/70 text-primary backdrop-blur transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="p-6">
                        <h3 className="font-display text-xl font-semibold">
                          {p.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {p.summary}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {p.technologies.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                          {p.technologies.length > 4 && (
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                              +{p.technologies.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* Empty state */
            <Reveal className="mt-12">
              <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-border bg-card/60 px-8 py-16 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted text-primary">
                  <FolderSearch className="h-6 w-6" />
                </span>
                <h3 className="mt-6 font-display text-xl font-semibold">
                  No projects here yet
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We don't have any work under{" "}
                  <span className="text-foreground capitalize">{activeFilter}</span>{" "}
                  just now. Try another category.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter(ALL)}
                  className="mt-6 rounded-full border border-border bg-card/50 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
                >
                  View all projects
                </button>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 px-8 py-14 text-center md:px-16 md:py-20">
              <Aurora />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-display font-display font-semibold">
                  Have a project in{" "}
                  <span className="accent-italic text-gradient">mind?</span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-pretty">
                  Tell us what you're building. We'll help you ship something
                  you'll be proud of too.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <CtaButton cta={{ label: "Start a project", href: "/contact" }} />
                  <CtaButton
                    cta={{ label: "Explore services", href: "/services", variant: "outline" }}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}
