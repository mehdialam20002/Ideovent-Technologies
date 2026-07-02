import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Rocket, Sparkles, Layers, Star, Info } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton } from "@/lib/cms/context";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import FaqSection from "@/components/sections/FaqSection";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Tier {
  name: string;
  tagline: string;
  icon: typeof Rocket;
  priceFrom: string;
  priceNote: string;
  features: string[];
  cta: { label: string; href: string };
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Launch",
    tagline: "A sharp starter site to get your brand live.",
    icon: Rocket,
    priceFrom: "₹24,000",
    priceNote: "one-time",
    features: [
      "Up to 5 pages, mobile-first",
      "Custom design from your brand",
      "Contact form & lead capture",
      "Basic on-page SEO setup",
      "Fast, secure hosting handoff",
      "2 weeks of post-launch support",
    ],
    cta: { label: "Get started", href: "/contact" },
  },
  {
    name: "Growth",
    tagline: "A full marketing site engineered to convert.",
    icon: Sparkles,
    priceFrom: "₹65,000",
    priceNote: "one-time",
    popular: true,
    features: [
      "Everything in Launch, plus",
      "Up to 12 bespoke pages",
      "Advanced SEO & performance tuning",
      "CMS so you can edit content",
      "Blog / case-study system",
      "Analytics & conversion tracking",
      "30 days of priority support",
    ],
    cta: { label: "Get started", href: "/contact" },
  },
  {
    name: "Scale",
    tagline: "A custom web or mobile product, built to last.",
    icon: Layers,
    priceFrom: "₹1,50,000",
    priceNote: "project-based",
    features: [
      "Everything in Growth, plus",
      "Custom web app or mobile app",
      "User auth, dashboards & APIs",
      "Design system & component library",
      "Dedicated senior team",
      "Roadmap & ongoing partnership",
      "SLA-backed support & retainers",
    ],
    cta: { label: "Talk to us", href: "/contact" },
  },
];

const ASSURANCES = [
  {
    icon: Info,
    title: "Every project gets a custom quote",
    description:
      "These ranges are starting points. We scope each engagement to your goals and give you a fixed, transparent price before any work begins — no surprise invoices.",
  },
  {
    icon: Star,
    title: "No hidden fees, ever",
    description:
      "One clear proposal covers design, build and launch. You'll always know exactly what you're paying for and why.",
  },
];

export default function Pricing() {
  const contact = useSingleton("contact");

  return (
    <Layout>
      <Seo
        title="Pricing"
        description="Transparent, project-based pricing from Ideovent Technologies. Choose a Launch, Growth or Scale package — every project gets a clear, custom quote before we start."
        path="/pricing"
      />

      {/* 1. Hero */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow>Pricing</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-hero font-display font-semibold">
                Honest pricing for{" "}
                <span className="accent-italic text-gradient">real outcomes</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
                Simple packages, transparent starting prices and a fixed quote before we begin.
                Pick the tier that fits where you are — we'll tailor the rest to where you're going.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. Pricing tiers */}
      <section className="section pt-0">
        <div className="container-page">
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch"
          >
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={tier.name}
                  variants={fadeUp}
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-3xl border p-8 transition-all duration-300",
                    tier.popular
                      ? "border-primary/60 bg-card shadow-[0_0_60px_-15px_hsl(var(--primary)/0.45)] ring-1 ring-primary/40 lg:-my-4 lg:py-12"
                      : "border-border bg-card/60 hover-lift hover:border-primary/40 hover:bg-card"
                  )}
                >
                  {tier.popular && (
                    <>
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl"
                      />
                      <span className="absolute right-6 top-8 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        Most popular
                      </span>
                    </>
                  )}

                  <div className="relative">
                    <div
                      className={cn(
                        "inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border",
                        tier.popular
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-primary"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-6 font-display text-2xl font-semibold">{tier.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{tier.tagline}</p>

                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        from
                      </span>
                      <span className="font-display text-4xl font-semibold text-foreground">
                        {tier.priceFrom}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">{tier.priceNote}</span>
                    </div>

                    <ul className="mt-8 space-y-3 border-t border-border/60 pt-8">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-foreground/90">
                          <span
                            className={cn(
                              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              tier.popular ? "bg-primary/15 text-primary" : "bg-muted text-primary"
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      <CtaButton
                        cta={{
                          label: tier.cta.label,
                          href: tier.cta.href,
                          variant: tier.popular ? "primary" : "outline",
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <Reveal delay={0.1}>
            <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground text-pretty">
              Prices shown are starting points. Every project is unique, so we send a clear,
              itemised quote tailored to your scope before any work begins.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3. Assurances */}
      <section className="section relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page">
          <SectionHeading
            eyebrow="How we price"
            title={
              <>
                Clear scope, fixed quote,{" "}
                <span className="accent-italic text-gradient">no surprises</span>
              </>
            }
            subtitle="We believe pricing should build trust, not confusion. Here's how we keep it straightforward."
          />

          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2"
          >
            {ASSURANCES.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={fadeUp} className="card-surface p-7 hover-lift">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 4. FAQ */}
      <FaqSection category="services" />

      {/* 5. Closing CTA */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 bg-spotlight px-6 py-16 text-center md:px-12 md:py-20">
              <Aurora className="opacity-70" />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-display font-display font-semibold">
                  Not sure which tier{" "}
                  <span className="accent-italic text-gradient">fits?</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
                  Tell us about your project and we'll recommend the right package and send a
                  tailored quote.{" "}
                  {contact.responseTimePromise
                    ? contact.responseTimePromise
                    : "We usually reply within one business day."}
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <CtaButton cta={{ label: "Get a custom quote", href: "/contact" }} />
                  {contact.emailHref && (
                    <CtaButton
                      cta={{ label: "Email us", href: contact.emailHref, variant: "outline" }}
                    />
                  )}
                </div>

                <div className="mt-8 flex items-center justify-center">
                  <Link
                    to="/portfolio"
                    className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
