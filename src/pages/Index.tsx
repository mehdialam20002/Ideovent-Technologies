import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import Hero from "@/components/sections/Hero";
import CustomerProblems from "@/components/sections/CustomerProblems";
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

/*
  NO STRIP UNDER THE HERO (1 Oct 2026). A scrolling band of ten phrases
  ("Found on Google Maps · Opens fast on a phone · ...") sat here. The hero
  brief (scratchpad seo-pricing/hero-brief.md, item 8) lists it as the ticker
  slot every generated page has under its hero, and Mehdi's complaint was that
  the top of the page looks AI-made. The hero's sample frames now close the
  first section, and what we set up is said in WhatWeSetUp with its links.
  src/components/ui/marquee.tsx is left in place, unused.
*/

/*
  The proof band's links. Client sites from _assets/FACTS.md (VERIFIED CLIENT
  PROJECTS, HTTP 200 on 24 Sep 2026), same addresses as the seed records. The
  certificate check used to sit here; it lives on /verify and the internship
  pages, because on the home page it told a buyer about interns, not about
  client work.
*/
const LIVE_SITES = [
  { label: "GYM MAP", href: "https://gym-map-customer-web.vercel.app" },
  { label: "WedArt Films", href: "https://wedart.vercel.app" },
  { label: "Atelier Co.", href: "https://eccom2.vercel.app" },
  { label: "Tamkuhi Bazaar", href: "https://tamkuhibazaar-online.vercel.app" },
];

const PROOF_PILL =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-xs font-medium " +
  "transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70";

/**
 * The home page.
 *
 * ORDER (26 Sep 2026, _assets/HOMEPAGE-COPY-DECK.md section 14; copy from
 * _assets/HOMEPAGE-COPY-DECK-V2.md). Mehdi: the
 * page must be about the buyer's business, not about our product, and the price
 * does not belong in the first screen. The order follows Sell Like Crazy (read
 * as what he meant by "Sell Like a Crow"): diagnose before you prescribe, give
 * value before the pitch, price after value.
 *
 *      1. Hero            who it is for, what they want, one free next step
 *      2. (Strip)         removed 1 Oct 2026, see the note at the top of this file
 *      3. CustomerProblems what stops a customer, what slows a team, and the fix
 *      4. WhatWeSetUp     be found / take busywork off / build your product
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
 *     hero            its own top padding, tight bottom (ends on the sample frames)
 *     problems        pt-12 pb-2 → lg pt-20           a box, the next opens on a rule
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

      {/* Value before the pitch: what stops a customer and what slows a team,
          then what we set up about it, for any growing business. */}
      <CustomerProblems />
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
        2026, HRMS Lite and Lead CRM have case studies at /work, and
        the WTF Go build carries its "built by our founder at Witness The Fitness
        Pvt. Ltd." attribution wherever it appears. No number of clients, no
        satisfaction score, no years-of-experience claim: none of those are
        evidenced, so none of them is here.
      */}
      <section className="pb-16 md:pb-20">
        <div className="container-page">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card/50 p-6 sm:p-10">
              <h2 className="max-w-xl font-display text-xl font-semibold leading-snug sm:text-2xl">
                You do not have to take our word for any of it
              </h2>

              <dl className="mt-7 grid gap-x-8 gap-y-7 sm:grid-cols-3">
                <div>
                  <dt className="font-display text-base font-semibold text-foreground">
                    Open the live sites
                  </dt>
                  <dd className="mt-2 text-sm text-muted-foreground text-pretty">
                    These four client sites are live. Open one on your phone and use it the way
                    a customer would. Nothing here is a mock-up.
                  </dd>
                  <dd className="mt-3 flex flex-wrap gap-2">
                    {LIVE_SITES.map((site) => (
                      <a
                        key={site.href}
                        href={site.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={PROOF_PILL}
                      >
                        {site.label}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                      </a>
                    ))}
                  </dd>
                </div>

                <div>
                  <dt className="font-display text-base font-semibold text-foreground">
                    Read how the software works
                  </dt>
                  {/* No "open it and click around": signed out, both apps are a
                      login box (FACTS.md, screenshots table), so the checkable
                      thing is the case study, which lists what each does and
                      what we will not claim. */}
                  <dd className="mt-2 text-sm text-muted-foreground text-pretty">
                    HRMS Lite and Lead CRM are client software, deployed and behind a login.
                    Each case study says what the product does and what we cannot claim.
                  </dd>
                  <dd className="mt-3 flex flex-wrap gap-2">
                    <Link to="/work/hrms-lite" className={PROOF_PILL}>
                      HRMS Lite
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <Link to="/work/lead-crm" className={PROOF_PILL}>
                      Lead CRM
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </dd>
                </div>

                <div>
                  <dt className="font-display text-base font-semibold text-foreground">
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
