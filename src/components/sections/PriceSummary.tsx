import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useSingleton } from "@/lib/cms/context";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { unbreakable } from "@/lib/typography";
import type { Cta } from "@/lib/cms/types";

/**
 * WHAT IT COSTS. The price ledger that used to sit in the hero, moved here.
 *
 * Mehdi, 26 Sep 2026: "ye pricing starting me hi kyu dikha rahe?" A number read
 * before the problem is a cost with nothing attached to it. So the ledger now
 * comes at section 9 of the home page (_assets/HOMEPAGE-COPY-DECK.md), after the
 * problems a parent runs into, the work, the free check and the process, and
 * before the FAQ and the form. It is a real section rather than a link because
 * Indian buyers ask "kitna lagega?" within the hour, published prices are proof
 * that competitors do not offer, and they filter out buyers below the floor.
 *
 * THE MARKUP IS THE HERO LEDGER'S, UNCHANGED: the gold 2px rule, the `dl` that
 * is label/number rows on a phone and three columns from `sm`, the note line.
 * Nothing about the look was redesigned; only its place on the page moved.
 *
 * Figures come from `home.priceTeaser` in seed.ts and are the FACTS.md CURRENT
 * table (CORRECTIONS section 2), lowest first. Change them there and on
 * /pricing together, never here.
 */
function LedgerLink({ link }: { link: Cta }) {
  return (
    <Link
      to={link.href}
      className="group inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-primary
                 transition-colors duration-200 hover:text-foreground"
    >
      {link.label}
      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
    </Link>
  );
}

export default function PriceSummary() {
  const price = useSingleton("home").priceTeaser;

  // A CMS snapshot could drop the block. No rows, no section.
  if (!price || !price.rows?.length) return null;

  return (
    // RHYTHM: its neighbours are Process (.section-tight, py-12 → lg py-20)
    // and ProductLines (pt-8 pb-20 → lg pb-32). This takes a short top, because
    // it answers the question the process just raised, and a bottom of its own.
    <section className="pt-4 pb-16 md:pt-6 md:pb-20 lg:pt-8 lg:pb-24">
      <div className="container-page">
        <Reveal>
          <Eyebrow>Published prices</Eyebrow>

          <div className="rule-gold mt-5 pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm">
                {price.heading}
              </h2>
              {price.link?.href && <LedgerLink link={price.link} />}
            </div>

            <dl
              className="mt-4 divide-y divide-border/70
                         sm:mt-6 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:divide-border/70"
            >
              {price.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0
                             sm:block sm:py-0 sm:pl-6 sm:first:pl-0"
                >
                  <dt className="text-sm text-muted-foreground text-pretty">{row.label}</dt>
                  <dd
                    className="shrink-0 font-display text-sm font-semibold tabular-nums text-foreground
                               sm:mt-2 sm:text-xl md:text-2xl lg:text-[1.75rem] lg:leading-tight"
                  >
                    {unbreakable(row.range)}
                  </dd>
                </div>
              ))}
            </dl>

            {price.more && (
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:mt-6">
                {price.more}
              </p>
            )}

            {price.note && (
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {price.note}
              </p>
            )}

            {price.link2?.href && (
              <div className="mt-4">
                <LedgerLink link={price.link2} />
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
