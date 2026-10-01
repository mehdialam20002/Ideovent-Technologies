import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";

/**
 * What we build, as an index rather than a card grid.
 *
 * WHY THIS IS NOT SIX CARDS ANY MORE. It used to be: an icon tile, a title, one
 * line of description and the word "Explore", six times, in a three-column grid
 * of identical boxes. _assets/DESIGN-DIRECTION.md names that unit twice, once as
 * "the universal AI-page unit" and again under "things that will make it look
 * generated again": "Three feature cards with lucide icons and matching two-line
 * descriptions." Six of them is the same tell with more of it.
 *
 * §5 asks for something true in every card. A service's true content is its
 * DELIVERABLES, which are already in the CMS and were previously shown nowhere
 * on the home page: a visitor had to open six separate service pages to find out
 * what "Website Development" actually contains. They are printed on the row now,
 * so the section answers the question instead of advertising that it could.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *   - No price per service. The canonical price table in _assets/FACTS.md is
 *     organised by OFFER (landing page, website, portal or web app, SaaS, care
 *     plan), not by service, so there is no true figure to put on a "UI/UX
 *     Design" row and a plausible one would be invented. /pricing is linked
 *     instead, at the foot, where the mapping is done properly.
 *   - No icons. An icon beside a title that already says the same word is
 *     decoration standing in for content.
 *   - No count in the heading. The reader can count the rows, and that count is
 *     always honest and never needs maintaining.
 */
export default function ServicesGrid({
  homeOnly = false,
  showHeading = true,
}: { homeOnly?: boolean; showHeading?: boolean }) {
  const all = useCollection("services");
  const services = homeOnly ? all.filter((s) => s.showOnHome) : all;

  // An empty collection renders nothing at all rather than a heading above a
  // gap. Reachable from /admin by hiding every service from the homepage.
  if (!services.length) return null;

  return (
    <section id="services" className="relative py-16 md:py-20 lg:py-24">
      <div className="container-page">
        {showHeading && (
          <Reveal>
            <div className="flex flex-col gap-5 border-t-2 border-secondary/70 pt-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <Eyebrow>What we do</Eyebrow>
                {/* One weight, no accent (1 Oct 2026). The 300-to-800 jump and
                    the serif accent both read as generated next to the plain
                    hero; see `.font-thin-display` in src/index.css. */}
                <h2 className="mt-3 text-display font-display font-semibold">
                  What we build, and what is in it.
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground text-pretty md:pb-2">
                The list under each heading is the actual deliverables list, not a summary of one.
                It is what goes into the written scope you get before anything starts.
              </p>
            </div>
          </Reveal>
        )}

        <motion.ol
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.05 }}
          className="mt-10 border-t border-border"
        >
          {services.map((s, i) => (
            <motion.li key={s.id} variants={fadeUp} className="border-b border-border">
              <Link
                to={`/services/${s.slug}`}
                className="group grid gap-x-6 gap-y-3 px-1 py-7 transition-colors duration-200
                           hover:bg-muted/40 active:bg-muted/60
                           sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-baseline md:py-8"
              >
                {/* The index numeral. Decorative as a number, but it is the
                    thing that makes a list of six read as a set rather than as
                    six unrelated links, so it is aria-hidden and the <ol> in the
                    markup carries the ordering for assistive tech.

                    NO /70 ON THE COLOUR. Measured on the rendered page it came
                    out at 3.47:1 against the light ground, under the 4.5:1 AA
                    floor, and a numeral that faint reads as a rendering fault
                    rather than as a light touch. --muted-foreground on its own
                    is 7.13:1 light and 8.34:1 dark. The restraint here is the
                    300 weight and the 14px size, not an opacity. */}
                <span
                  aria-hidden="true"
                  className="hidden font-display text-sm font-light tabular-nums text-muted-foreground sm:block"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-xl font-semibold leading-snug md:text-2xl">
                      {s.title}
                    </h3>
                    {s.category && (
                      <span className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {s.category}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground text-pretty">
                    {s.shortDescription}
                  </p>

                  {s.deliverables?.length > 0 && (
                    <ul className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      {s.deliverables.map((d) => (
                        <li
                          key={d}
                          className="rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-foreground/75"
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-primary sm:justify-self-end">
                  See the service
                  <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" aria-hidden="true" />
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ol>

        {homeOnly && (
          <Reveal className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              to="/services"
              className="group inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-5 text-sm
                         font-medium transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
            >
              Every service in full
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
            </Link>
            {/*
              One of the home page's inbound links to /pricing. Before the audit
              pass the highest-intent page on the site had no inbound link
              anywhere in src/ at all.
            */}
            <Link
              to="/pricing"
              className="group inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-5 text-sm
                         font-medium text-primary transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
            >
              What each one costs, tier by tier
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}
