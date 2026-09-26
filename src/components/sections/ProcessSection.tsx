import { motion } from "framer-motion";
import { useCollection } from "@/lib/cms/context";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";

/**
 * How a project actually runs, as a rail rather than as four boxes.
 *
 * WHAT THIS REPLACED, AND WHY. It was four equal rounded cards in a four-column
 * grid, each holding a watermark numeral, a one-word title and two lines of
 * description. _assets/DESIGN-DIRECTION.md names that unit as "the universal
 * AI-page unit" and lists it again under the things that make a page look
 * generated: "Three feature cards with lucide icons and matching two-line
 * descriptions." Four of them with numerals instead of icons is the same tell.
 *
 * The four steps themselves are not decoration, so they are not deleted. They
 * are set on a single gold rule with the numerals sitting ON the rule: one
 * continuous line across the section says "these happen in order" in a way that
 * four separate boxes never did, and it removes four card rims, four
 * backgrounds and four hover states that were doing nothing.
 *
 * The rule is gold and the numerals are gold. Gold measures 2.27:1 on the light
 * ground, so it can carry neither: the RULE is decoration (WCAG sets no ratio
 * for it) and the NUMERAL is `aria-hidden`, duplicated by the <ol> and by each
 * step's heading, so nothing a reader needs is carried by a colour that cannot
 * be read. The title and the description are foreground and muted-foreground,
 * both measured clear of AA in both themes.
 *
 * NO SERIF ACCENT IN THIS HEADING. The serif italic runs at most twice per page
 * (_assets/DESIGN-DIRECTION.md §1) and this component is mounted on the home
 * page and on /services, where both are already spent elsewhere. The contrast
 * here is weight: Sora 300 against Sora 800, which §3 asks for.
 *
 * Every description is a commitment that exists in the signed agreement. See
 * the note above `process` in src/lib/cms/seed.ts.
 *
 * RHYTHM. `.section-tight`, not `.section`. This follows the services index on
 * the home page and the service grid on /services, and it belongs to the thing
 * above it: it is how the work in that list actually gets done.
 */
export default function ProcessSection() {
  const steps = useCollection("process");

  // An empty process list would leave a heading over 14rem of nothing.
  if (!steps.length) return null;

  return (
    <section className="section-tight relative">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>What you get in writing</Eyebrow>
              <h2 className="mt-5 text-display font-display font-thin-display">
                Four stages, and what{" "}
                <span className="font-loud-display">you get at each one</span>
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground text-pretty md:pb-2">
              Every line below is in the agreement you sign.
            </p>
          </div>
        </Reveal>

        {/*
          THE RAIL. `border-t-2` on the <ol> from md up is the line; each <li>
          lifts its numeral over that line with a negative top margin, so the
          numerals sit ON the rule rather than under it.

          Below md there is no room for columns, so the rule turns ninety
          degrees: `border-l-2` on the list and each step indented past it. Same
          idea, same markup, one breakpoint.
        */}
        <motion.ol
          variants={staggerContainer(0.09)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-12 border-l-2 border-secondary/70 md:mt-16 md:grid md:grid-cols-2 md:border-l-0 md:border-t-2 lg:grid-cols-4"
        >
          {steps.map((step) => (
            <motion.li
              key={step.id}
              variants={fadeUp}
              className="relative pb-9 pl-6 last:pb-0 md:px-6 md:pb-0 md:pt-8 md:first:pl-0 lg:last:pr-0"
            >
              {/* Decorative: the <ol> carries the ordering for assistive tech and
                  the title says what the step is, so a screen reader that also
                  read "01" would be reading a numeral with no stated meaning. It
                  is also the one thing in this section set in gold, which is
                  only safe because nothing depends on reading it. */}
              <span
                aria-hidden="true"
                className="block font-display text-sm font-loud-display tabular-nums tracking-[0.2em] text-secondary
                           md:-mt-[1.85rem] md:mb-6"
              >
                {step.number}
              </span>

              <h3 className="mt-2 font-display text-xl font-semibold md:mt-0">{step.title}</h3>
              <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
                {step.description}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
