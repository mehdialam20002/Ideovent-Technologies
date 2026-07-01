import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Check, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { Aurora } from "@/components/ui/aurora";
import { CtaButton } from "@/components/ui/cta-button";
import { useCollection } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { staggerContainer, fadeUp } from "@/lib/motion";

/** How-we-work mini steps shown as "what you get" on a service page. */
const WORK_STEPS = [
  { title: "Discovery & scope", description: "We map goals, constraints, and success metrics before a single pixel is drawn." },
  { title: "Design & build", description: "Rapid, transparent iterations with you in the loop at every checkpoint." },
  { title: "Launch & support", description: "We ship to production and stay on to measure, refine, and grow." },
];

export default function ServiceDetail() {
  const { slug } = useParams();
  const services = useCollection("services");
  const service = services.find((s) => s.slug === slug);

  if (!service) {
    return (
      <Layout>
        <Seo title="Service not found" description="The service you are looking for could not be found." path="/services" />
        <section className="section">
          <div className="container-page">
            <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card/60 p-10 text-center card-surface">
              <Eyebrow>Not found</Eyebrow>
              <h1 className="mt-4 font-display text-3xl font-semibold">
                We couldn&apos;t find that <span className="accent-italic text-gradient">service</span>
              </h1>
              <p className="mt-3 text-muted-foreground">
                The service you&apos;re looking for may have moved or no longer exists. Explore everything we offer instead.
              </p>
              <div className="mt-8 flex justify-center">
                <CtaButton cta={{ label: "Back to all services", href: "/services" }} />
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const Icon = getIcon(service.icon);
  const related = services.filter((s) => s.id !== service.id).slice(0, 3);

  return (
    <Layout>
      <Seo title={service.title} description={service.shortDescription} path={`/services/${service.slug}`} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <Aurora />
        <div className="container-page relative section">
          <Reveal>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              All services
            </Link>
          </Reveal>

          <div className="mt-8 flex flex-col items-start gap-6">
            <Reveal>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]">
                <Icon className="h-7 w-7" />
              </div>
            </Reveal>

            {service.category && (
              <Reveal delay={0.05}>
                <Eyebrow>{service.category}</Eyebrow>
              </Reveal>
            )}

            <Reveal delay={0.1}>
              <h1 className="text-display max-w-3xl font-display font-semibold">
                {service.title}
              </h1>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
                {service.longDescription || service.shortDescription}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-2 flex flex-wrap gap-3">
                <CtaButton cta={{ label: "Start your project", href: "/contact" }} />
                <CtaButton cta={{ label: "See our work", href: "/portfolio", variant: "outline" }} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      {service.deliverables?.length > 0 && (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="Deliverables"
              title={<>Everything <span className="accent-italic text-gradient">included</span></>}
              subtitle="A clear, tangible scope so you always know exactly what you're getting."
            />

            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {service.deliverables.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex items-start gap-3 rounded-3xl border border-border bg-card/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* What you get / how we work */}
      <section className="section bg-muted/30">
        <div className="container-page">
          <SectionHeading
            eyebrow="How we work"
            title={<>A calm, <span className="accent-italic text-gradient">transparent</span> process</>}
            subtitle="No black boxes. From kickoff to launch you stay informed and in control."
          />

          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid gap-4 md:grid-cols-3"
          >
            {WORK_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card/60 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card"
              >
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                <span className="font-display text-5xl font-semibold text-primary/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Related services */}
      {related.length > 0 && (
        <section className="section">
          <div className="container-page">
            <SectionHeading
              eyebrow="Keep exploring"
              title={<>Related <span className="accent-italic text-gradient">services</span></>}
              subtitle="Great projects rarely need just one thing. Here's what pairs well."
            />

            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {related.map((s) => {
                const RelatedIcon = getIcon(s.icon);
                return (
                  <motion.div key={s.id} variants={fadeUp}>
                    <Link
                      to={`/services/${s.slug}`}
                      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card"
                    >
                      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <RelatedIcon className="h-5 w-5" />
                      </div>
                      <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                      <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.shortDescription}</p>
                      <div className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">
                        Explore
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-10 text-center card-surface md:p-16">
              <Aurora className="opacity-60" />
              <div className="relative mx-auto max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Let&apos;s build something great
                </span>
                <h2 className="mt-6 font-display text-3xl font-semibold md:text-4xl">
                  Ready to get started with{" "}
                  <span className="accent-italic text-gradient">{service.title}</span>?
                </h2>
                <p className="mt-4 text-muted-foreground text-pretty">
                  Tell us about your goals and we&apos;ll come back with a clear plan, timeline, and honest advice — no pressure.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <CtaButton cta={{ label: "Book a free consultation", href: "/contact" }} />
                  <CtaButton cta={{ label: "Browse all services", href: "/services", variant: "outline" }} />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}
