import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, HelpCircle, LifeBuoy, MessageCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection, useSingleton } from "@/lib/cms/context";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import type { Faq } from "@/lib/cms/types";
import { unbreakable } from "@/lib/typography";

/** Human-friendly copy for known categories; unknown ones fall back to a title-cased label. */
const CATEGORY_META: Record<string, { eyebrow: string; title: string; accent: string; subtitle: string }> = {
  services: {
    eyebrow: "Services",
    title: "Working ",
    accent: "with us",
    subtitle: "How our engagements are scoped, run and delivered from kickoff to launch.",
  },
  internship: {
    eyebrow: "Ideovent LaunchPad",
    title: "The internship ",
    accent: "programme",
    subtitle: "Everything applicants ask about eligibility, curriculum, certificates and what is not promised.",
  },
  eduflow: {
    eyebrow: "EduFlow",
    title: "Our school platform, ",
    accent: "in development",
    subtitle:
      "EduFlow is not finished, has no paying schools and has no public demo. These are the questions institutions ask first, answered as they actually stand today.",
  },
  general: {
    eyebrow: "General",
    title: "Good to ",
    accent: "know",
    subtitle: "The essentials about Ideovent Technologies, support and how we operate.",
  },
};

const titleCase = (value: string) =>
  value
.replace(/[-_]+/g, " ")
.replace(/\b\w/g, (c) => c.toUpperCase())
.trim();

export default function FAQ() {
  const faqs = useCollection("faqs");
  const contact = useSingleton("contact");

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Faq[]>();
    for (const faq of faqs) {
      const key = faq.category || "general";
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(faq);
    }
    // Keep the canonical order first, then any custom categories as they appear.
    const preferred = ["services", "eduflow", "internship", "general"];
    const sorted = [
...preferred.filter((c) => map.has(c)),
...order.filter((c) => !preferred.includes(c)),
    ];
    return sorted.map((category) => ({ category, items: map.get(category)! }));
  }, [faqs]);

  /* FAQPage markup, built from the same CMS answers the page renders. Google
     requires the marked-up Q&A to be visible on the page, so this must never be
     hand-written or extended beyond `faqs`. Skipped entirely when there are no
     FAQs, rather than emitting an empty FAQPage. */
  const faqSchema = useMemo(
    () =>
      faqs.length
        ? {
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }
: undefined,
    [faqs],
);

  return (
    <Layout>
      <Seo
        title="FAQ"
        description="Answers to what people actually ask Ideovent Technologies, what a project costs, how long it takes, what happens after launch, and how the LaunchPad internship and its verifiable certificate work."
        path="/faq"
        keywords={[
          "web development FAQ India",
          "how long does a website take India",
          "website cost questions New Delhi",
          "Ideovent internship questions",
        ]}
        breadcrumbs={[{ name: "FAQ", path: "/faq" }]}
        schema={faqSchema}
      />

      {/* 1. Hero */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow>FAQ</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-hero font-display font-semibold">
                Questions, <span className="accent-italic text-gradient">answered</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
                Everything you might want to know before we start working together, from how our
                projects run to the details of our internship programme. Still stuck? We’re one
                message away.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <CtaButton cta={{ label: "Talk to us", href: "/contact" }} />
                {contact.emailHref && (
                  <CtaButton
                    cta={{ label: "Email us", href: contact.emailHref, variant: "outline" }}
                  />
)}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. Grouped FAQ accordions */}
      {groups.length > 0 ? (
        groups.map((group, index) => {
          const meta = CATEGORY_META[group.category];
          return (
            <section
              key={group.category}
              className={index === 0 ? "pb-16 md:pb-20": "section"}
            >
              <div className="container-page grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <SectionHeading
                    align="left"
                    eyebrow={meta ? meta.eyebrow: "FAQ"}
                    title={
                      meta ? (
                        <>
                          {meta.title}
                          <span className="accent-italic text-gradient">{meta.accent}</span>
                        </>
): (
                        <>
                          {titleCase(group.category)}{" "}
                          <span className="accent-italic text-gradient">questions</span>
                        </>
)
                    }
                    subtitle={
                      meta ? meta.subtitle: `Common questions about ${titleCase(group.category)}.`
                    }
                  />
                  <Reveal delay={0.1}>
                    <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                      {group.items.length} question{group.items.length === 1 ? "": "s"}
                    </span>
                  </Reveal>
                </div>

                <Reveal>
                  <Accordion type="single" collapsible className="w-full card-surface px-6 py-2 md:px-8">
                    {group.items.map((faq) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className="border-border/60 last:border-b-0"
                      >
                        <AccordionTrigger className="font-display text-base font-medium">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-base text-muted-foreground text-pretty">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
))}
                  </Accordion>
                </Reveal>
              </div>
            </section>
);
        })
): (
        <section className="section">
          <div className="container-page">
            <div className="card-surface mx-auto max-w-xl p-12 text-center">
              <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-secondary">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-semibold">No FAQs just yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We’re still writing these up. In the meantime, reach out and we’ll answer anything you
                need directly.
              </p>
              <div className="mt-7">
                <CtaButton cta={{ label: "Ask a question", href: "/contact" }} />
              </div>
            </div>
          </div>
        </section>
)}

      {/* 3. Reassurance strip */}
      <section className="section pt-0">
        <div className="container-page">
          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {[
              {
                icon: MessageCircle,
                title: "Fast, human replies",
                description:
                  contact.responseTimePromise ||
                  "We usually reply within one business day: no bots, no run-around.",
              },
              {
                icon: LifeBuoy,
                title: "Support that sticks around",
                description:
                  "We stay engaged long after launch, so your questions never go unanswered.",
              },
              {
                icon: HelpCircle,
                title: "Clarity from day one",
                description:
                  "Clear scopes, honest timelines and transparent pricing before anything begins.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={fadeUp} className="card-surface p-7">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
);
            })}
          </motion.div>
        </div>
      </section>

      {/* 4. Closing CTA */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 px-6 py-16 text-center md:px-16 md:py-20">
              <Aurora className="opacity-70" />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-display font-display font-semibold">
                  Still have a <span className="accent-italic text-gradient">question?</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
                  If you didn’t find what you were looking for, tell us what’s on your mind and we’ll
                  get back to you personally.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <CtaButton cta={{ label: "Get in touch", href: "/contact" }} />
                  {contact.phoneHref && (
                    <CtaButton
                      cta={{ label: unbreakable(contact.phoneDisplay) || "Call us", href: contact.phoneHref, variant: "outline" }}
                    />
)}
                </div>

                <div className="mt-8 flex items-center justify-center">
                  <Link
                    to="/services"
                    className="group inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground active:text-foreground/70"
                  >
                    Explore our services
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
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
