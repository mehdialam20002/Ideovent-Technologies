import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { keepNumberCompounds, unbreakable } from "@/lib/typography";
import {
  CARE,
  GST_LINE,
  ONE_TIME,
  PLANS,
  SEO,
  bandRange,
  inr,
  seoIndiaLine,
  termLine,
  usdWord,
} from "@/lib/pricing";

/**
 * WHAT IT COSTS, on the home page (section 9, after the problems, the work, the
 * free check and the process: Mehdi, 26 Sep 2026, "ye pricing starting me hi
 * kyu dikha rahe?"). Price stays out of the hero.
 *
 * 1 OCT 2026: THE FIGURES COME FROM src/lib/pricing.ts, NOT FROM THE CMS.
 * `home.priceTeaser` is still in seed.ts and in the admin form, but the live
 * Supabase `home` row overrides the seed key by key, so a change to the seed
 * never reached the live page (seo-audit P0-2). Reading the one pricing module
 * means this block, /pricing, the service pages and the lead form can never
 * print two different prices.
 *
 * The monthly plan leads (its number is the lowest) and it is never printed
 * without its one-time setup fee and its 12-month term in the same block
 * (CCPA dark-pattern guidelines, 2023: drip pricing).
 *
 * No eyebrow pill, no gradient, no motion: a rule, a heading and the numbers.
 */
function ArrowLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:text-foreground"
    >
      {children}
      <ArrowRight
        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        aria-hidden="true"
      />
    </Link>
  );
}

export default function PriceSummary() {
  const s = PLANS.starter;
  const cells = [
    {
      label: "Website on a monthly plan",
      price: `${inr(s.monthly)}/month`,
      beside: `+ ${inr(s.setup)} one-time setup`,
      note: `${termLine(s)}. Hosting, SSL and ${s.changesPerMonth} changes a month included.`,
    },
    {
      label: "Website, bought outright",
      price: `From ${inr(ONE_TIME.landing.min)}`,
      beside: "one time",
      note: `A website with more pages ${bandRange(ONE_TIME.website)}. The code is yours on the final payment.`,
    },
    {
      label: "Local SEO add-on",
      price: seoIndiaLine(),
      beside: "",
      note: `Outside India from ${usdWord(SEO.abroadFromUsd)} a month. No ranking is promised.`,
    },
  ];

  return (
    // RHYTHM: its neighbours are Process (.section-tight) and ProductLines
    // (pt-8 pb-20 to lg pb-32). A short top, because it answers the question the
    // process just raised, and a bottom of its own.
    <section className="pt-4 pb-16 md:pt-6 md:pb-20 lg:pt-8 lg:pb-24" aria-labelledby="price-summary-heading">
      <div className="container-page">
        <div className="rule-gold pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="price-summary-heading" className="font-display text-2xl font-semibold md:text-3xl">
              What a website costs
            </h2>
            <ArrowLink to="/pricing">Every plan and package, with what each includes</ArrowLink>
          </div>

          <dl className="mt-5 divide-y divide-border/70 sm:mt-7 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {cells.map((c) => (
              <div key={c.label} className="py-4 first:pt-0 sm:py-0 sm:pl-6 sm:first:pl-0 sm:pr-4">
                <dt className="text-sm text-muted-foreground">{c.label}</dt>
                <dd className="mt-1.5 text-foreground">
                  <span className="font-display text-2xl font-semibold tabular-nums lg:text-[1.75rem]">
                    {unbreakable(c.price)}
                  </span>
                  {/* The setup fee gets its own line directly under the monthly
                      figure, at a weight nobody reads past; "one time" stays inline. */}
                  {c.beside && (
                    <>
                      {" "}
                      <span
                        className={
                          c.beside.startsWith("+")
                            ? "mt-0.5 block text-base font-semibold tabular-nums"
                            : "ml-0.5 text-base font-semibold tabular-nums"
                        }
                      >
                        {unbreakable(c.beside)}
                      </span>
                    </>
                  )}
                </dd>
                <dd className="mt-1.5 max-w-xs text-sm text-muted-foreground text-pretty">{keepNumberCompounds(c.note)}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 max-w-3xl text-sm text-muted-foreground text-pretty">
            Portals and web apps {unbreakable(bandRange(ONE_TIME.portal))}. Custom software{" "}
            {unbreakable(bandRange(ONE_TIME.software).toLowerCase())}. Care plans after a one-time build{" "}
            {unbreakable(`${inr(CARE[0].monthly)} to ${inr(CARE[CARE.length - 1].monthly)}`)} a month, optional.
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {GST_LINE} One-time prices are starting prices, fixed in writing after one call.
          </p>

          <div className="mt-3">
            <ArrowLink to="/#contact">Not sure which fits? Get the free check</ArrowLink>
          </div>
        </div>
      </div>
    </section>
  );
}
