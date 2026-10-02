import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Search } from "lucide-react";
import { GST_LINE, servicePrice } from "@/lib/pricing";
import { keepNumberCompounds, unbreakable } from "@/lib/typography";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { Aurora } from "@/components/ui/aurora";
import { CtaButton } from "@/components/ui/cta-button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCms, useCollection } from "@/lib/cms/context";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icons";
import { staggerContainer, fadeUp } from "@/lib/motion";
import ProcessSection from "@/components/sections/ProcessSection";
// Search: title, description, h1 and JSON-LD come from the same helpers the
// build uses for this page's prerendered head (scripts/prerender-heads.mjs).
import { SEO as SEO_PRICES } from "@/lib/pricing";
import { serviceSeo } from "@/lib/seo/pages";
import { faqPageNode, serviceNode, serviceOffers } from "@/lib/seo/schema";
import { FaqList } from "@/components/ui/faq-list";
import WebsitesStrip from "./websites/WebsitesStrip";

/*
  WORK_STEPS IS DELETED, NOT REWRITTEN.

  It was three cards reading "Discovery & scope: We map goals, constraints, and
  success metrics before a single pixel is drawn", "Design & build: Rapid,
  transparent iterations with you in the loop at every checkpoint" and "Launch &
  support: We ship to production and stay on to measure, refine, and grow".

  Three cards with a watermark numeral, a title and two lines each, saying
  nothing a reader can check or hold anyone to, under the heading "A calm,
  transparent process". That is the unit _assets/DESIGN-DIRECTION.md names as
  the tell, with the register it rules out sitting on top of it.

  It was also a SECOND process section: every one of these pages already
  renders <ProcessSection />'s four stages, and those carry the real
  commitments out of the signed agreement (two revision rounds per design
  stage, 50 / 30 / 20, thirty days of defect fixes, code on final payment).
  Two process sections on one page, one of them true and one of them adjectives,
  is worse than one.
*/

export default function ServiceDetail() {
  const { slug } = useParams();
  const services = useCollection("services");
  const faqs = useCollection("faqs");
  const service = services.find((s) => s.slug === slug);
  const { loading } = useCms();

  // A service added in /admin lives only in the store's rows, so until load()
  // answers it would read as "not found". Hold a quiet placeholder instead.
  if (!service && loading) return <Layout><div className="min-h-[60vh]" aria-busy="true" /></Layout>;

  if (!service) {
    return (
      <Layout>
        {/* noindex: a mistyped or retired /services/* URL still renders this
            friendly page with HTTP 200, so without it every stale link becomes
            an indexable duplicate soft 404. */}
        <Seo title="Service not found" description="The service you are looking for could not be found." path="/services" noindex />
        <EmptyState
          headingAs="h1"
          eyebrow="Not found"
          icon={<Search className="h-5 w-5" aria-hidden="true" />}
          title={<>We could not find that <span className="accent-italic">service.</span></>}
          body="It may have been renamed, or it may no longer be something we take on. Everything we do build is on one page."
          action={{ label: "All services", href: "/services" }}
          links={[{ label: "Selected work", to: "/work" }, { label: "Prices", to: "/pricing" }]}
        />
      </Layout>
);
  }

  const Icon = getIcon(service.icon);
  const price = servicePrice(service.slug);
  const related = services.filter((s) => s.id !== service.id).slice(0, 3);
  /* The hero only splits in two when the right column has real content to hold. */
  const heroTwoCol = (service.deliverables?.length ?? 0) > 0;
  const seo = serviceSeo(service);
  /* This service's own questions, from the `faqs` collection. They are marked up
     here and nowhere else (FAQ.tsx skips categories a service page owns), so
     each question is marked up once across the site, as Google asks. */
  const ownFaqs = service.faqCategory ? faqs.filter((f) => f.category === service.faqCategory) : [];
  const faqNode = faqPageNode(ownFaqs);

  return (
    <Layout>
      <Seo
        title={seo.title}
        fullTitle
        description={seo.description}
        path={`/services/${service.slug}`}
        breadcrumbs={[
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ]}
        schema={[serviceNode(service, serviceOffers(service.slug, SEO_PRICES)), ...(faqNode ? [faqNode] : [])]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <Aurora />
        {/* Not `.section` top-and-bottom any more. The deliverables moved up
            into this hero, so `section`'s 128px bottom padding met the next
            section's 128px top padding and left ~300px of dead space where the
            Deliverables block used to sit.

            pt-28 AT THE BASE, NOT pt-20, AND THE REASON IS NOT SPACING.

            The header is fixed: py-4 around an h-20 bar, so at the top of the
            page its nav element occupies y = 16..96 across the full container
            width. pt-20 put the "All services" back link at y = 80..104, i.e.
            16px of it underneath a transparent-but-present bar. It looked
            perfectly fine, because the bar has no background until you scroll,
            and it was DEAD: elementFromPoint at the link's own centre returned
            the header's <nav>, not the link. On a phone, on every /services/*
            page, the one control that takes you back up a level could not be
            tapped.

            Found by hit-testing every in-page control against
            elementFromPoint at 375, 768 and 1440; this was the only one on the
            site that came back covered. 112px clears the bar's 96px with 16px
            to spare, and md/lg were already past it. */}
        <div className="container-page relative pt-28 pb-14 md:pb-20 lg:pt-32">
          <Link
            to="/services"
            className="inline-flex min-h-6 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All services
          </Link>

          {/*
            TWO-COLUMN WHEN THERE IS SOMETHING TRUE TO PUT ON THE RIGHT.

            This hero used to be a single left column: `flex flex-col
            items-start` with an h1 capped at max-w-3xl and a paragraph at
            max-w-2xl. Inside a 1328px container at 1440px that left the
            paragraph stopping at 672px, so the entire right half of the
            viewport was empty and the page read as unfinished.

            The right column is the service's OWN deliverables, out of the CMS.
            Nothing here is invented: if a service has no deliverables the grid
            collapses to one centred column (see `heroTwoCol`) rather than
            showing an empty box, and the support line below the list repeats
            the commitments recorded in _assets/FACTS.md, which are the same
            numbers the AMC contract carries.
          */}
          <div
            className={cn(
              "mt-8 grid gap-10",
              heroTwoCol
                ? "lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-14"
                : "mx-auto max-w-3xl text-center"
)}
          >
            {/* NO ENTRANCE MOTION IN THIS COLUMN (1 Oct 2026). The h1 and the
                paragraph under it were each inside a <Reveal delay>, i.e. at
                opacity 0 until JavaScript faded them in, which the audit measured
                as the page's largest paint arriving 0.35 to 1.3 s late on a phone.
                The first screen now paints as soon as it renders; the deliverables
                card on the right and everything below still reveal. */}
            <div className={cn("flex flex-col gap-6", heroTwoCol ? "items-start" : "items-center")}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-primary">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </div>

              {service.category && <Eyebrow>{service.category}</Eyebrow>}

              {/* The h1 is the page in search words ("Local SEO services in
                  Delhi..."), from the record's `h1`, else its title. */}
              <h1 className="text-display font-display font-semibold text-balance">{seo.h1}</h1>

              <p className={cn("text-lg text-muted-foreground text-pretty", !heroTwoCol && "mx-auto")}>
                {service.intro || service.longDescription || service.shortDescription}
              </p>

              {/* /pricing had no inbound link anywhere in src/ before this pass, and
                  a service page is where the cost question is asked. /work rather
                  than /portfolio: the latter is a client-side <Navigate> that
                  returns HTTP 200 for the old URL, so an internal link to it passes
                  no authority on. */}
              <div className={cn("mt-2 flex flex-wrap gap-3", !heroTwoCol && "justify-center")}>
                <CtaButton cta={{ label: "Start your project", href: "/contact" }} />
                <CtaButton cta={{ label: "See what it costs", href: "/pricing", variant: "outline" }} />
                <CtaButton cta={{ label: "See our work", href: "/work", variant: "ghost" }} />
              </div>
            </div>

            {heroTwoCol && (
              <Reveal delay={0.25}>
                <div className="card-surface rounded-3xl border border-border bg-card/60 p-7 md:p-8">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    What you get
                  </h2>
                  <ul className="mt-5 space-y-3.5">
                    {service.deliverables.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="text-sm text-foreground text-pretty">{item}</span>
                      </li>
))}
                  </ul>
                  {/* A monthly service (SEO, a care plan) says its own terms here:
                      revision rounds are a project term. "" prints nothing. */}
                  {(service.deliverablesNote ?? "Two revision rounds per design stage, and 30 days of support after launch.") && (
                    <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground text-pretty">
                      {service.deliverablesNote ?? "Two revision rounds per design stage, and 30 days of support after launch."}
                    </p>
                  )}
                </div>
              </Reveal>
)}
          </div>
        </div>
      </section>

      {/* WHAT IT COSTS, from src/lib/pricing.ts (1 Oct 2026), the module
          /pricing, the home page and the lead form read too. Only services
          FACTS.md prices get a block: website development (monthly plan and
          one-time) and SEO. The others print no figure rather than an
          invented one, and keep their links to /pricing. */}
      {price && (
        <section className="pb-12 md:pb-16" aria-labelledby="service-price-heading">
          <div className="container-page">
            <div className="rule-gold grid gap-6 pt-6 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
              <div>
                <h2 id="service-price-heading" className="font-display text-2xl font-semibold md:text-3xl">
                  {price.heading}
                </h2>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{GST_LINE}</p>
                <Link
                  to={price.href}
                  className="group mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:text-foreground"
                >
                  {price.linkLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                </Link>
              </div>
              <dl className="divide-y divide-border/70">
                {price.lines.map((l) => (
                  <div key={l.label} className="py-4 first:pt-0 last:pb-0">
                    <dt className="text-sm text-muted-foreground">{l.label}</dt>
                    <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground md:text-2xl">
                      {unbreakable(l.value)}
                    </dd>
                    {l.note && <dd className="mt-1 text-sm text-muted-foreground text-pretty">{keepNumberCompounds(l.note)}</dd>}
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      )}

      {/* The /websites pages (2 Oct 2026), under the price on the website page:
          the same service, written for a clinic, a school, a coaching
          institute, and the monthly plan on its own. */}
      {service.slug === "website-development" && (
        <section className="pb-12 md:pb-16">
          <div className="container-page">
            <WebsitesStrip />
          </div>
        </section>
      )}

      {/* THE SERVICE'S OWN SECTIONS (1 Oct 2026), from the record's `sections`:
          what the monthly work is, how it runs, what it cannot promise, with
          internal links that say where they go. One gold rule opens the run;
          the blocks under it are divided by hairlines. */}
      {(service.sections?.length ?? 0) > 0 && (
        <section className="pb-12 md:pb-16">
          <div className="container-page">
            <div className="rule-gold divide-y divide-border/70 pt-2">
              {service.sections!.map((sec, i) => (
                <div key={sec.heading} className="grid gap-4 py-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
                  <h2 id={`service-section-${i}`} className="font-display text-2xl font-semibold text-balance md:text-3xl">
                    {sec.heading}
                  </h2>
                  <div className="max-w-2xl">
                    {sec.body && <p className="text-muted-foreground text-pretty">{sec.body}</p>}
                    {(sec.items?.length ?? 0) > 0 && (
                      <ul className={cn("space-y-3", sec.body && "mt-5")}>
                        {sec.items!.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Check className="h-3 w-3" aria-hidden="true" />
                            </span>
                            <span className="text-foreground/90 text-pretty">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(sec.links?.length ?? 0) > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {sec.links!.map((l) => (
                          <Link
                            key={l.href + l.label}
                            to={l.href}
                            className="group inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
                          >
                            {l.label}
                            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* This service's questions, answered in the HTML (native <details>, see
          ui/faq-list.tsx) and marked up as this page's FAQPage above. */}
      {ownFaqs.length > 0 && (
        <section className="pb-12 md:pb-16" aria-labelledby="service-faq-heading">
          <div className="container-page grid gap-6 border-t border-border pt-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
            <div>
              <h2 id="service-faq-heading" className="font-display text-2xl font-semibold text-balance md:text-3xl">
                Questions about {service.title}
              </h2>
              <Link
                to="/faq"
                className="group mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:text-foreground"
              >
                Every question we get asked
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
              </Link>
            </div>
            <FaqList faqs={ownFaqs} />
          </div>
        </section>
      )}

      {/* The four real stages, out of the CMS, with the commitments the signed
          agreement carries. This replaces the three adjective cards that used
          to sit here under "A calm, transparent process"; see the note above
          where WORK_STEPS used to be. */}
      {/* NO `bg-muted/30` WRAPPER, AND THIS IS A MEASUREMENT, NOT A TASTE CALL.
          ProcessSection sets its stage numerals in --secondary, which is
          gold-700 #8C6F22 in the light theme: the one gold that clears AA on a
          light ground, at 4.55:1 on #F8FAFC. Tinting the section with
          `bg-muted/30` moved the ground just far enough to take the same
          numerals to 4.49:1, i.e. under the bar by six hundredths. The gold
          rule the rail is hung from already separates this band from the hero
          above it, so the tint was buying nothing and costing that. */}
      {/* Off for a monthly service (SEO, care plans): 50/30/20 and "code on the
          final payment" are project terms and would misdescribe it. */}
      {!service.hideProcess && <ProcessSection />}

      {/* Related services.
          `.section-tight`, not `.section`: a row of sideways links is the least
          important thing on the page and it used to carry the same 128px as the
          hero and the process band. */}
      {related.length > 0 && (
        <section className="section-tight">
          <div className="container-page">
            <Reveal>
              <div className="flex flex-col gap-5 border-t border-border pt-8 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <Eyebrow>Keep exploring</Eyebrow>
                  {/* Weight contrast. This page's two serif accents are the
                      service title in the closing call to action and, on a
                      404, the "service" in the not-found heading, which are
                      never on screen together. */}
                  <h2 className="mt-5 font-display text-2xl font-thin-display md:text-3xl">
                    The rest of{" "}
                    <span className="font-loud-display">what we build</span>
                  </h2>
                </div>
                <p className="max-w-sm text-sm text-muted-foreground text-pretty md:pb-2">
                  Each card below prints what is in that service, in the same words the written
                  scope uses.
                </p>
              </div>
            </Reveal>

            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {related.map((s) => (
                <motion.div key={s.id} variants={fadeUp}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/60 p-7 transition-all duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0 hover:border-primary/40 hover:bg-card"
                  >
                    {/*
                      NO ICON TILE. It was a 48px rounded box with a lucide
                      glyph over a title that already said the same word, on
                      three identical cards: _assets/DESIGN-DIRECTION.md's
                      "three feature cards with lucide icons and matching
                      two-line descriptions", exactly.

                      The space it used is spent on the service's first three
                      DELIVERABLES instead, straight out of the CMS. That is
                      §5: something true in every card. A visitor can now tell
                      the three apart without opening them.
                    */}
                    {s.category && (
                      <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {s.category}
                      </p>
                    )}
                    <h3 className={cn("font-display text-lg font-semibold", s.category && "mt-2")}>
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground text-pretty">{s.shortDescription}</p>

                    {s.deliverables?.length > 0 && (
                      <ul className="mt-4 flex flex-1 flex-wrap content-start items-start gap-1.5">
                        {s.deliverables.slice(0, 3).map((d) => (
                          <li
                            key={d}
                            className="rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-foreground/75"
                          >
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">
                      See the service
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
)}

      {/* CTA */}
      {/* The bottom is tighter than `.section-loud` would give it. The
          loudness of a closing section belongs to its TOP padding, which is
          what separates it from the section before; its bottom meets the
          footer, and the footer already opens with `.section` padding of its
          own plus a 40px margin. Stacked, that measured 176 + 40 + 128 =
          344px of empty ground between the last button on the page and the
          first word of the footer.

          IT IS WRAPPED IN BRACES BECAUSE IT IS IN JSX. A bare /* ... *\/ in a
          JSX children position is not a comment, it is TEXT: the first version
          of this note shipped as a visible paragraph of source code between
          the last section and the closing band, on three pages. It was caught
          by looking at a screenshot, which is the only way it could have
          been. */}
      <section className="pb-16 pt-0 md:pb-20 lg:pb-24">
        <div className="container-page">
          {/* A BAND, NOT A SECOND BOX. The footer renders a bordered,
              spotlight-lit, centred CTA panel with a display heading on every
              route, immediately below this one, and this was the same shape
              again. It is a gold rule and a left-aligned band now, which is
              also how the hero and the related-services block above it open. */}
          <Reveal>
            <div className="rule-gold grid gap-6 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
              <div>
                {/* The "Let's build something great" pill and its Sparkles icon
                    are gone: it is the register _assets/DESIGN-DIRECTION.md
                    rules out, over a glyph used as a section marker. The eyebrow
                    says what the block is instead. */}
                <Eyebrow>Next step</Eyebrow>
                <h2 className="mt-6 font-display text-3xl font-thin-display md:text-4xl">
                  A written scope for{" "}
                  <span className="accent-italic text-gradient">{service.title}</span>
                </h2>
                <p className="mt-4 max-w-xl text-muted-foreground text-pretty">
                  One call, then a scope with an exclusions list and a fixed price, before you pay
                  anything. If what you need is not this service, we will say which one it is, or
                  that it is not us.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:justify-end md:pb-2">
                <CtaButton cta={{ label: "Start a project", href: "/contact" }} />
                <CtaButton cta={{ label: "Prices, tier by tier", href: "/pricing", variant: "outline" }} />
                <CtaButton cta={{ label: "All services", href: "/services", variant: "ghost" }} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
);
}
