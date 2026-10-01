import { Link } from "react-router-dom";
import { unbreakable } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { SERVICE_LINES } from "./oneTimeData";
import { SectionHead, Ticks } from "./ui";

/**
 * Buy it outright: the four one-time service lines, exactly as they were before
 * the monthly plans arrived (FACTS.md, 24 Sep 2026), cheapest first, three
 * tiers each, with what each tier leaves out printed on the same card.
 * The "Recommended" flag is plain text now, not a pill with a star.
 */
export default function OneTime() {
  return (
    <section id="one-time" className="section-tight" aria-labelledby="one-time-heading">
      <div className="container-page">
        <SectionHead
          id="one-time-heading"
          title="Buy your website or software outright"
          intro="One price, paid in two halves: 50% to start and 50% at launch. The custom code is yours on the final payment. Every figure is a starting price for a real scope, fixed in writing after one call."
        />

        {SERVICE_LINES.map((line) => (
          <div key={line.id} id={line.id} className="mt-12">
            <div className="flex flex-col gap-2 border-t border-border pt-6 md:flex-row md:items-end md:justify-between md:gap-8">
              <h3 className="font-display text-2xl font-semibold md:text-3xl">{line.title}</h3>
              <div className="md:text-right">
                {/* "Indicative range" is the wording PACKAGES-INDIA.html puts above
                    each line: the figure and its qualifier travel together. */}
                <p className="text-sm text-muted-foreground">Indicative range</p>
                <p className="font-display text-xl font-semibold tabular-nums text-foreground">{unbreakable(line.range)}</p>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground text-pretty">{line.intro}</p>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch">
              {line.tiers.map((tier) => (
                <article
                  key={tier.name}
                  className={cn(
                    "flex h-full flex-col rounded-3xl border p-6 sm:p-7",
                    tier.recommended ? "border-primary/60 bg-card" : "border-border bg-card/60",
                  )}
                >
                  {/* The label's line is kept (invisible) on the other cards from lg,
                      so the three names and prices in a row sit level. */}
                  <p
                    className={cn(
                      "mb-2 text-xs font-semibold text-primary",
                      !tier.recommended && "hidden lg:invisible lg:block",
                    )}
                  >
                    Recommended
                  </p>
                  <h4 className="font-display text-xl font-semibold">{tier.name}</h4>
                  <p className="mt-4 font-display text-4xl font-semibold tabular-nums text-foreground">
                    {unbreakable(tier.price)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{tier.meta}</p>
                  <Ticks items={tier.features} className="mt-6 flex-1 border-t border-border/60 pt-6" />
                  {tier.excludes && (
                    <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground text-pretty">
                      {tier.excludes}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}

        {/* EduFlow, kept from the old page in one paragraph: it is not for sale,
            and a school should hear that here rather than later. */}
        <p className="mt-12 max-w-3xl rounded-2xl border border-border bg-card/50 p-5 text-sm text-muted-foreground text-pretty">
          <span className="font-medium text-foreground">A note on EduFlow.</span> Our school management platform is in
          development. It is not available to buy, there is no demo, and we will not quote it. If you need a school or
          coaching system now, the portal line above is how we would build it.{" "}
          <Link to="/eduflow" className="underline underline-offset-2 hover:text-foreground">
            Where EduFlow actually is
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
