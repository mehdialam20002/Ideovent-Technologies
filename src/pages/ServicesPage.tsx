import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection, useSingleton } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { Reveal } from "@/components/motion/Reveal";
import ProcessSection from "@/components/sections/ProcessSection";
import FaqSection from "@/components/sections/FaqSection";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { liveEmail, whatsappInstead } from "@/lib/mailbox";
import { PAGE_SEO } from "@/lib/seo/pages";
import { serviceListNodes } from "@/lib/seo/schema";

/*
  WHAT YOU ACTUALLY GET.

  These four used to be adjectives: "Senior craft, no filler. Every project is led
  by experienced designers and engineers", "Built to ship fast", "Production-grade
  quality", "A true partner". The first is a seniority claim, which _assets/FACTS.md
  forbids outright (never state a team size as a number, never make an unverified
  claim) and which SITE-AUDIT.md §4.1 flagged in its other form, "Dedicated senior
  team" on /pricing. The rest were unfalsifiable.

  Every line below is a commitment that exists in writing somewhere a client can hold
  Ideovent to: the service-commitment table in FACTS.md (2 revision rounds per design
  stage, 30 days of post-launch support, source code transfers on final payment) and
  the scope and payment terms on /pricing. Do not put an adjective back in here that
  is not backed by one of those.

  THE `icon` FIELD IS GONE, AND SO ARE THE FOUR CARDS THESE USED TO SIT IN.
  Handshake, ShieldCheck, Sparkles and Rocket beside four headings that already
  said what they meant were decoration standing in for content, and four equal
  bordered cards with an icon, a title and two lines is the unit
  _assets/DESIGN-DIRECTION.md names twice. They are a hairline <dl> now, which
  is what a list of contract terms looks like.
*/
const WHY_POINTS = [
  {
    title: "You talk to the person who builds it",
    description: "The person who scopes and quotes your project is the person who writes the code. There is no account manager in between, and no hand-off after you sign.",
  },
  {
    title: "A fixed price and a written scope",
    // 1 Oct 2026 (Mehdi): 50/50. Was "Payment runs 50% to begin, 30% at the design-and-build milestone, 20% before handover."
    description: "You get the number and the exclusions list before anything starts. Payment is 50% to begin and 50% at launch.",
  },
  {
    title: "Two revision rounds, per design stage",
    description: "Written into every engagement, not offered as a favour, plus 30 days of free support after launch while you are living with the thing for the first time.",
  },
  {
    title: "The code is yours",
    description: "Source code ownership transfers to you on final payment. You are not renting your own website back from us, and you are not locked to us for the next change.",
  },
];

export default function ServicesPage() {
  const services = useCollection("services");
  const contact = useSingleton("contact");
  // Email only once contact@ideovent.in has a mailbox; WhatsApp until then.
  const email = liveEmail(contact);
  const whatsapp = whatsappInstead(contact.whatsappNumber, "Hi Ideovent, I would like to talk about a project.");

  return (
    <Layout>
      {/* Title and description: src/lib/seo/pages.ts (PAGE_SEO["/services"]).
          One Service entry per service, each with the @id its own page uses. */}
      <Seo
        path="/services"
        breadcrumbs={[{ name: "Services", path: "/services" }]}
        schema={serviceListNodes(services)}
      />

      {/* 1. Hero */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        {/*
          THE OLD H1 WAS "SERVICES THAT TURN IDEAS INTO DIGITAL REALITY".

          _assets/DESIGN-DIRECTION.md lists, among the things that make a page
          look generated, "'Elevate your digital presence' and anything in that
          register". "Turn ideas into digital reality" is in that register, and
          the paragraph under it ("From first pixel to production... a modern
          brand online... all under one roof") was four more of the same.

          It says what the page is instead, which is a list of six things with
          their deliverables printed on them, and it is left-aligned on the
          gutter rather than centred, so the h1 lands where every other h1 on
          the site lands.
        */}
        <div className="container-page relative">
          {/* THE H1 SAYS WHAT IS SOLD, IN SEARCH WORDS (1 Oct 2026). It sits
              where the eyebrow pill was; the display line under it keeps the
              page's voice and is a paragraph, so the page has one h1. No
              entrance motion on either: a fade-in here was the page's largest
              paint arriving late on a phone (SEO audit, 1 Oct 2026). */}
          <h1 className="max-w-3xl font-display text-base font-semibold text-primary text-balance md:text-lg">
            {PAGE_SEO["/services"].h1}
          </h1>
          {/* Deliberately not "Six things we build": `services` is a CMS
              collection, and a count written into a headline is wrong the first
              time somebody adds or hides one in /admin. */}
          <p className="mt-5 max-w-4xl text-hero font-display font-semibold">
            What we{" "}
            <span className="accent-italic text-gradient">actually</span> build
          </p>

          <div className="mt-8 grid gap-x-14 gap-y-5 lg:grid-cols-2">
            <p className="text-lg text-foreground/85 text-pretty">
              Each one lists what is in it before you ask.
            </p>
            <p className="text-base text-muted-foreground text-pretty">
              The list under every heading below is the deliverables list out of the written
              scope, not a summary of one. If something you need is not on a list, it is not
              quietly included, and we would rather you find that out here than three weeks in.
            </p>
          </div>

          <Reveal delay={0.2}>
            {/* "See what it costs" is here because /pricing had no inbound link
                anywhere in src/, and because it is the question a visitor on a
                services page asks second. /work rather than /portfolio: the
                latter is a client-side <Navigate> that returns HTTP 200 for the
                old URL, so linking to it internally passes no authority along. */}
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <CtaButton cta={{ label: "Start a project", href: "/contact" }} />
              <CtaButton cta={{ label: "See what it costs", href: "/pricing", variant: "outline" }} />
              <CtaButton cta={{ label: "See our work", href: "/work", variant: "ghost" }} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. Full services grid.
             `pt-6`, not `.section`'s pt-20/28/32: this grid is the thing the
             hero above it is introducing, not a new subject, and 128px between
             the hero's buttons and its own eyebrow read as a missing section.
             The rule carries the boundary instead, the same way it does on the
             home page. */}
      <section id="services" className="relative pb-20 pt-6 md:pb-24 md:pt-8">
        <div className="container-page">
          <Reveal>
            <div className="flex flex-col gap-5 border-t-2 border-secondary/70 pt-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <Eyebrow>What we do</Eyebrow>
                {/*
                  The heading that used to be here was "Everything you need to
                  build & grow" over "Explore the full range of what we offer".
                  Both are the register _assets/DESIGN-DIRECTION.md rules out,
                  and both said the same thing the h1 four inches above already
                  said. Weight contrast rather than a serif accent: this page
                  spends its two on the h1 and on the closing call to action.
                */}
                <h2 className="mt-5 text-display font-display font-thin-display">
                  Start with the one that{" "}
                  <span className="font-loud-display">sounds like your problem</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground text-pretty md:pb-2">
                A project is often one of these with a second one attached. We will tell you which
                on the first call, including when the answer is that you do not need us.
              </p>
            </div>
          </Reveal>

          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {services.map((s, i) => {
              const Icon = getIcon(s.icon);
              /*
                AN EVEN GRID, AND THAT IS A MEASUREMENT RATHER THAN A DEFAULT.

                This section got the page's asymmetry first and gave it back.
                Six services in three columns is two clean rows. Spanning the
                first card across two COLUMNS makes seven cells, which leaves a
                single tile beside two empty ones, measured at 1440 as a 770px
                hole at the foot of the section. Spanning it two columns AND two
                rows makes nine cells and fills the grid exactly, but the card
                is then about 800px tall holding roughly 350px of content, so
                the hole simply moves inside the card, which is worse: an empty
                grid cell is background, an empty half-card is a card that
                failed to load.

                _assets/DESIGN-DIRECTION.md §4 asks for ONE deliberate
                asymmetry per page, not for an asymmetry in the first place it
                could be put. On this page it is the agreement band further
                down, which is a 22rem-and-the-rest hairline list with real
                content on both sides of the split. Here the even grid is
                correct: six comparable things a buyer is choosing between want
                to be comparably sized.

                Every card still carries the service's real deliverables out of
                the CMS, which is §5.
              */
              const items = s.deliverables?.slice(0, 4);

              return (
                <motion.div key={s.id} variants={fadeUp}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/60 p-7
                               transition-all duration-200 hover:border-primary/40 hover:bg-card hover-lift
                               active:bg-card/80 active:border-primary/60 active:translate-y-0"
                  >

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
                    <p className="mt-2 text-sm text-muted-foreground text-pretty">
                      {s.longDescription || s.shortDescription}
                    </p>

                    {items?.length > 0 && (
                      /* flex-1 so the deliverables block takes the slack in a
                         card that is shorter than its row-mates, which keeps
                         the "See the service" line on the bottom edge of every
                         card in the row instead of floating at a different
                         height in each one. */
                      <ul className="mt-5 flex-1 space-y-2 border-t border-border/60 pt-5">
                        {items.map((d) => (
                          <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-pretty">{d}</span>
                          </li>
))}
                      </ul>
)}

                    <div className="mt-6 flex items-center gap-1 text-sm font-medium text-primary">
                      See the service
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
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

      {/* 4. What is in the agreement.
             `.section-loud`: this is the section that answers the question a
             services page is really asked, and it used to carry the same
             padding as the three sections around it. */}
      {/*
        THE PAGE'S ONE DELIBERATE BREAK IN THE GRID
        (_assets/DESIGN-DIRECTION.md §4, a two-column split at roughly 35/65).

        The services grid above this is even on purpose, see the long note in
        it: six comparable things a buyer is choosing between want to be
        comparably sized, and every arrangement that made one of them bigger
        left a measured hole either in the grid or inside the enlarged card. So
        the asymmetry is spent here instead, on the one block that has real
        content on BOTH sides of the split: a standing heading that does not
        scroll away, and four contract terms against it.

        Once, not everywhere. The FAQ below and the closing band are the even
        page again.
      */}
      <section className="section-loud relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page grid gap-10 border-t-2 border-secondary/70 pt-10 lg:grid-cols-[0.62fr_1.38fr] lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <Eyebrow>Before you sign</Eyebrow>
              {/*
                This was "Teams choose us for the long run" over "We combine
                the polish of a studio with the reliability of a partner you
                can build a roadmap around". The first is an unverifiable claim
                about other people's decisions and the second is the register
                _assets/DESIGN-DIRECTION.md rules out by name.

                The four points themselves were rewritten in an earlier pass
                and are all real commitments, so the heading now says what they
                are instead of selling them.
              */}
              <h2 className="mt-5 text-display font-display font-thin-display">
                Four things that are{" "}
                <span className="font-loud-display">in the agreement</span>
              </h2>
              <p className="mt-5 text-sm text-muted-foreground text-pretty">
                Not adjectives. Each one is a clause you can point at in the document, on the day
                it matters, whichever tier you have bought.
              </p>
            </div>
          </Reveal>

          {/*
            A HAIRLINE LIST, NOT FOUR ICON CARDS.

            The icons went with the boxes. An icon beside a heading that reads
            "The code is yours" is decoration standing in for content, and four
            equal bordered cards with an icon, a title and two lines is the
            unit the brief names twice. A contract extract should look like a
            contract extract: a rule, a term, the term's consequence.
          */}
          <motion.dl
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="border-t border-border"
          >
            {WHY_POINTS.map((point) => (
              <motion.div
                key={point.title}
                variants={fadeUp}
                className="grid gap-2 border-b border-border py-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10 md:py-7"
              >
                <dt className="font-display text-lg font-semibold leading-snug text-pretty">
                  {point.title}
                </dt>
                <dd className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
                  {point.description}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </section>

      {/* 5. FAQ */}
      <FaqSection category="services" />

      {/* 6. Closing CTA. `.section pt-0`: the FAQ above already closes with its
             own 128px, and two full sections of padding met in the middle. */}
      <section className="section pt-0">
        <div className="container-page">
          {/* A BAND, NOT A SECOND BOX. The footer renders a centred, bordered,
              spotlight-lit CTA panel with a display heading on every route,
              directly below this one. Two of the same shape stacked is the
              component twice over, so this one is a gold rule and a
              left-aligned band on the gutter, the way every other section on
              this page opens. */}
          <Reveal>
            <div className="rule-gold grid gap-6 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
              <div>
                {/* The page's second and last serif accent; the first is the h1.
                    "Tell us where you want to go and we'll map the fastest,
                    most confident route to get there" is gone with it: it
                    promised a route rather than a reply, and it is the exact
                    register the brief rules out. */}
                {/* NOT "Tell us what is not working": that is the heading on
                    the CTA band in the FOOTER, which renders on every route, so
                    this panel and the one directly beneath it would have
                    carried the same sentence twice in a row. Two boxes saying
                    the same thing read as a page that was assembled rather than
                    written. This says the next concrete thing instead. */}
                <h2 className="text-display font-display font-thin-display">
                  The quote arrives{" "}
                  <span className="accent-italic text-gradient">in writing</span>
                </h2>
                <p className="mt-5 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
                  One call, then a scope with an exclusions list and a fixed price, and the number
                  does not move after that unless you approve a written change note.{" "}
                  {contact.responseTimePromise ? contact.responseTimePromise: "We reply to new enquiries within two working days."}
                </p>
              </div>
              <div className="flex flex-col gap-4 md:items-end md:pb-2">
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <CtaButton cta={{ label: "Start a project", href: "/contact" }} />
                  {email ? (
                    <CtaButton cta={{ label: "Email us", href: email.href, variant: "outline" }} />
                  ) : whatsapp ? (
                    <CtaButton cta={{ label: "WhatsApp us", href: whatsapp, variant: "outline" }} />
                  ) : null}
                </div>

                <Link
                  to="/work"
                  className={cn(
                    "group inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground active:text-foreground/70"
)}
                >
                  See the work these services produced
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
);
}
