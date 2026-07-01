import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Handshake, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection, useSingleton } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import ProcessSection from "@/components/sections/ProcessSection";
import FaqSection from "@/components/sections/FaqSection";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

const WHY_POINTS = [
  {
    icon: Sparkles,
    title: "Senior craft, no filler",
    description: "Every project is led by experienced designers and engineers — no hand-offs to juniors halfway through.",
  },
  {
    icon: Rocket,
    title: "Built to ship fast",
    description: "A momentum-driven process with weekly demos means you see real progress, not status reports.",
  },
  {
    icon: ShieldCheck,
    title: "Production-grade quality",
    description: "Accessible, performant and maintainable code — the kind you can scale on without a rewrite.",
  },
  {
    icon: Handshake,
    title: "A true partner",
    description: "We think about your business outcomes, not just deliverables, long after launch day.",
  },
];

export default function ServicesPage() {
  const services = useCollection("services");
  const contact = useSingleton("contact");

  return (
    <Layout>
      <Seo
        title="Services"
        description="From strategy to launch, Ideovent Technologies delivers web, design, marketing and mobile services that turn ideas into digital reality."
        path="/services"
      />

      {/* 1. Hero */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow>Services</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-hero font-display font-semibold">
                Services that turn ideas into{" "}
                <span className="accent-italic text-gradient">digital reality</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
                From first pixel to production, we cover the full stack of building a modern brand
                online — strategy, design, engineering and growth, all under one roof.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <CtaButton cta={{ label: "Start a project", href: "/contact" }} />
                <CtaButton cta={{ label: "See our work", href: "/portfolio", variant: "outline" }} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. Full services grid */}
      <section id="services" className="section relative">
        <div className="container-page">
          <SectionHeading
            eyebrow="What we do"
            title={
              <>
                Everything you need to <span className="accent-italic text-gradient">build & grow</span>
              </>
            }
            subtitle="Explore the full range of what we offer. Each engagement is scoped to your goals and comes with clear deliverables."
          />

          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {services.map((s) => {
              const Icon = getIcon(s.icon);
              return (
                <motion.div key={s.id} variants={fadeUp}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/60 p-7 transition-all duration-300 hover:border-primary/40 hover:bg-card hover-lift"
                  >
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="mb-5 flex items-center justify-between">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      {s.category && (
                        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                          {s.category}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {s.longDescription || s.shortDescription}
                    </p>

                    {s.deliverables?.length > 0 && (
                      <ul className="mt-5 space-y-2 border-t border-border/60 pt-5">
                        {s.deliverables.slice(0, 4).map((d) => (
                          <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-6 flex items-center gap-1 text-sm font-medium text-primary">
                      Explore service
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 3. Process */}
      <ProcessSection />

      {/* 4. Why work with us */}
      <section className="section relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page">
          <SectionHeading
            eyebrow="Why Ideovent"
            title={
              <>
                Teams choose us for <span className="accent-italic text-gradient">the long run</span>
              </>
            }
            subtitle="We combine the polish of a studio with the reliability of a partner you can build a roadmap around."
          />

          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {WHY_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <motion.div
                  key={point.title}
                  variants={fadeUp}
                  className="card-surface p-7 hover-lift"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{point.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{point.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 5. FAQ */}
      <FaqSection category="services" />

      {/* 6. Closing CTA */}
      <section className="section">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 px-6 py-16 text-center md:px-16 md:py-20">
              <Aurora className="opacity-70" />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-display font-display font-semibold">
                  Have a project in{" "}
                  <span className="accent-italic text-gradient">mind?</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
                  Tell us where you want to go and we'll map the fastest, most confident route to get
                  there. {contact.responseTimePromise ? contact.responseTimePromise : "We usually reply within one business day."}
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <CtaButton cta={{ label: "Start a project", href: "/contact" }} />
                  {contact.emailHref && (
                    <CtaButton
                      cta={{ label: "Email us", href: contact.emailHref, variant: "outline" }}
                    />
                  )}
                </div>

                <div className="mt-8 flex items-center justify-center">
                  <Link
                    to="/portfolio"
                    className={cn(
                      "group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    )}
                  >
                    Explore recent work
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}
