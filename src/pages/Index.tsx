import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import Hero from "@/components/sections/Hero";
import ParentProblems from "@/components/sections/ParentProblems";
import WhatWeSetUp from "@/components/sections/WhatWeSetUp";
import FreeCheck from "@/components/sections/FreeCheck";
import PriceSummary from "@/components/sections/PriceSummary";
import WorkShowcase from "@/components/sections/WorkShowcase";
import ProductLines from "@/components/sections/ProductLines";
import ProcessSection from "@/components/sections/ProcessSection";
import Testimonials from "@/components/sections/Testimonials";
import FaqSection from "@/components/sections/FaqSection";
import ContactForm from "@/components/sections/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { Marquee } from "@/components/ui/marquee";

/*
  The strip: what a parent looks for on a school website.

  It used to be sixteen framework names (React, Next.js, Supabase and so on).
  That list was about us, and a principal is not choosing between frameworks.
  Mehdi, 26 Sep 2026: the page must be about their business, not our product.
  So the strip now carries the buyer’s words, from the 25 Sep measurement of
  twenty Delhi school and coaching sites (04-sales-kit/PROSPECTS-DELHI-NCR.md).
  The tech stack now lives on /services. Copy: _assets/HOMEPAGE-COPY-DECK.md
  section 2.
*/
const PARENT_LOOKS_FOR = [
  "Fee structure", "Admission form", "Bus routes", "Batch timings", "Results",
  "Faculty", "Campus photos", "Location on Google Maps", "Notices and circulars",
  "Demo-class booking",
];

/**
 * The home page.
 *
 * ORDER (26 Sep 2026, _assets/HOMEPAGE-COPY-DECK.md section 14). Mehdi: the
 * page must be about the buyer's business, not about our product, and the price
 * does not belong in the first screen. The order follows Sell Like Crazy (read
 * as what he meant by "Sell Like a Crow"): diagnose before you prescribe, give
 * value before the pitch, price after value.
 *
 *      1. Hero            who it is for, what they want, one free next step
 *      2. Strip           what a parent looks for (was framework names)
 *      3. ParentProblems  what a parent runs into, and what the fix does
 *      4. WhatWeSetUp     schools / coaching / businesses (was ServicesGrid)
 *      5. WorkShowcase    proof anyone can open
 *      6. Proof band      you do not have to take our word for it
 *      7. FreeCheck       the offer: the free website check, and the terms
 *      8. Process         what you get in writing
 *      9. PriceSummary    what it costs (moved out of the hero)
 *     10. ProductLines    EduFlow, in development
 *     11. Testimonials    renders null (see below)
 *     12. FAQ             objections, cost last
 *     13. Contact         send us your website address
 *
 * RHYTHM. _assets/DESIGN-DIRECTION.md: "Equal spacing between every section
 * means no section is more important than any other, which is exactly how a
 * generated page feels." So the vertical padding steps deliberately and no two
 * neighbours share a value:
 *
 *     hero            its own top padding, tight bottom
 *     strip           a 24px band, a rule rather than a section
 *     parent problems pt-12 pb-2 → lg pt-20           a box, the next opens on a rule
 *     what we set up  pt-16 pb-4 → lg pt-24 pb-8      opens on a gold rule; short
 *                                                     bottom, the work brings its own top
 *     work            pt-20 pb-12 → lg pt-32 pb-16    opens on a gold rule
 *     proof band      pt-0 pb-16                      belongs to the work above it
 *     free check      pt-2 pb-12 → lg pb-24           a box
 *     process         .section-tight  py-12 → lg py-20
 *     what it costs   pt-4 pb-16 → lg pt-8 pb-24      opens on the gold ledger rule
 *     product lines   pt-8 pb-20 → lg pb-32           opens on a gold rule
 *     faq             .section        py-20 → lg py-32
 *     contact         .section-loud   py-24 → lg py-44   the page's destination
 *
 * Several of these open on a `border-t-2 border-secondary/70` rule instead of on
 * padding alone (what we set up, work, product lines), which is what lets the
 * paddings come down without two sections running into each other. The work
 * section's bottom used to be lg:pb-40; at that value its 160px met the proof
 * band's pt-0 and left a measured 190px of empty navy between a link and the
 * box that explains how to check it.
 *
 * The last pair used to be `.section` twice over, which is the one item
 * _assets/DESIGN-DIRECTION.md lists last: "Equal padding above and below every
 * single section." No two neighbours share a value now.
 *
 * WHY THERE IS NO SOCIAL-PROOF SECTION. `testimonials`, `stats` and `clients`
 * are deliberately empty arrays in seed.ts: the four testimonials that used to
 * be here were invented and illustrated with stock photographs of strangers, and
 * the three homepage counters could not be evidenced. <Testimonials /> returns
 * null while the array is empty, and it stays mounted precisely so that it turns
 * itself back on the day a real, permissioned quote exists.
 *
 * The page is not designed around the hole that leaves, and there is no slot
 * shaped like one waiting to be filled. The proof band below does the job
 * testimonials were faking, and does it better, because a visitor can check it:
 * every project in the work section is a live URL they can open in another tab.
 * That is a verifiable claim rather than an unverifiable one, which is the whole
 * of the difference.
 */
export default function Index() {
  return (
    <Layout>
      <Seo path="/" />
      <Hero />

      {/* Decorative strip (what a parent looks for). A band, not a section: it is a hairline rule with
          words in it, and it is what separates the hero from the work without
          spending a screen height on nothing.

          The duplicated half of the marquee is hidden from assistive tech so the
          list is not read out twice; the /70 opacity that used to sit on this
          text measured 4.48:1 against the old near-black background, just under
          the 4.5:1 AA floor, so it is full muted-foreground instead. Re-measured
          on the navy-and-gold palette: #A3B3D1 on #081738 is 8.34:1 in dark and
          #48566A on #F8FAFC is 7.13:1 in light. Do not put an opacity back on it. */}
      <div className="border-y border-border/60 py-6">
        <Marquee duration={40} label="What parents look for on a school website">
          {PARENT_LOOKS_FOR.map((t) => (
            <span key={t} className="mx-8 font-display text-lg font-medium text-muted-foreground">{t}</span>
          ))}
        </Marquee>
      </div>

      {/* Value before the pitch: what a parent runs into, then what the site
          does about it, for schools, coaching institutes and businesses. */}
      <ParentProblems />
      <WhatWeSetUp />

      {/* The proof anyone can check, and the page's one deliberate break in the
          grid. See the header of WorkShowcase.tsx. */}
      <WorkShowcase />

      {/*
        The proof band. It sits immediately under the work, with no top padding
        of its own, because it is a footnote to the work rather than a section in
        its own right: it tells you how to check what you have just been shown.

        Every sentence is checkable against _assets/FACTS.md: seven client
        projects are listed there with live URLs that returned HTTP 200 on 24 Sep
        2026, two LaunchPad certificates exist and both resolve at /verify, and
        the WTF Go build carries its "built by our founder at Witness The Fitness
        Pvt. Ltd." attribution wherever it appears. No number of clients, no
        satisfaction score, no years-of-experience claim: none of those are
        evidenced, so none of them is here.
      */}
      <section className="pb-16 md:pb-20">
        <div className="container-page">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card/50 p-6 sm:p-10">
              <h2 className="max-w-xl font-display text-xl font-light leading-snug sm:text-2xl">
                You do not have to take{" "}
                <span className="font-extrabold">our word</span> for any of it
              </h2>

              <dl className="mt-7 grid gap-x-8 gap-y-7 sm:grid-cols-3">
                <div>
                  <dt className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
                    Open the work
                  </dt>
                  <dd className="mt-2 text-sm text-muted-foreground text-pretty">
                    Every project above is a real site at a real address. Open it yourself.
                    Nothing here is a mock-up.
                  </dd>
                </div>

                <div>
                  <dt className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
                    Check a certificate
                  </dt>
                  <dd className="mt-2 text-sm text-muted-foreground text-pretty">
                    {/* No QR claim: the printed QR points at ideovent.com/verify,
                        which is unregistered (FACTS.md, 25 Sep night). The ID
                        works: /verify has an ID box. */}
                    We have issued two internship certificates. Each carries an ID. Enter it on
                    this site and the record opens.
                  </dd>
                  {/*
                    A block link rather than an ID inline in the sentence. An
                    inline <a> takes its box from the font's em square, not from
                    line-height, so it measured 85x17 and no amount of `leading-6`
                    changes that: the only ways to a 24px target are to make it
                    inline-block (which makes one line of the paragraph taller
                    than its neighbours) or to lift it out, which is also the
                    more tappable design.
                  */}
                  <dd className="mt-3">
                    <Link
                      to="/verify/INT2025A73"
                      className="group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4
                                 font-mono text-xs font-medium tracking-wider transition-colors duration-200
                                 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
                    >
                      Verify INT2025A73
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                    </Link>
                  </dd>
                </div>

                <div>
                  <dt className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
                    Get it in writing
                  </dt>
                  {/* Was "Read the price first" with a "See what it costs" link.
                      The price now has its own section further down (PriceSummary),
                      after the value, so this item says what is in writing. */}
                  <dd className="mt-2 text-sm text-muted-foreground text-pretty">
                    Before you pay anything, you get a written scope, a list of what is not
                    included, and a fixed price. The price does not change unless you sign a
                    change note.
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      <FreeCheck />
      <ProcessSection />
      <PriceSummary />
      <ProductLines />
      {/* Renders null while `testimonials` is empty, mounted so it comes back on
          the day there is a real, permissioned quote to put in it. */}
      <Testimonials />
      <FaqSection category="services" />
      <ContactForm sourcePage="home" />
    </Layout>
  );
}
