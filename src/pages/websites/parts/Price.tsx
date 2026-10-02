import { X } from "lucide-react";
import { keepNumberCompounds, unbreakable } from "@/lib/typography";
import { ArrowLink, SectionHead } from "../../pricing/ui";
import { PRICE_FOOTNOTE, priceRowsBoth, priceRowsMonthly } from "../shared";
import type { WebsitePage } from "../types";

/**
 * WHAT IT COSTS, from src/lib/pricing.ts through ./shared.ts (the rows the
 * prerendered no-script copy prints too). The smallest first payment comes
 * first; every monthly figure has its setup fee and its 12-month term in the
 * same row; the GST line and the domain note sit under the rows, at a size
 * that can be read.
 */
export function Price({ kind }: { kind: WebsitePage["price"] }) {
  const rows = kind === "monthly" ? priceRowsMonthly() : priceRowsBoth();
  return (
    <section id="price" className="section-tight pt-4" aria-labelledby="websites-price">
      <div className="container-page">
        <SectionHead
          id="websites-price"
          title={kind === "monthly" ? "What it costs, in full" : "What it costs"}
          intro={
            kind === "monthly"
              ? "Everything you pay, before you pay any of it."
              : "Two ways to pay: a monthly plan with hosting and changes included, or a website you buy outright and own."
          }
        />
        <dl className="mt-8 divide-y divide-border/70 border-y border-border/70">
          {rows.map((r) => (
            // dt and both dd sit directly in the row (valid <dl> grouping); the
            // grid puts the note in a second column on a wide screen.
            <div key={r.label} className="grid gap-x-10 gap-y-1 py-5 md:grid-cols-[0.95fr_1.05fr]">
              <dt className="text-sm text-muted-foreground md:col-start-1">{r.label}</dt>
              <dd className="font-display text-xl font-semibold tabular-nums text-foreground md:col-start-1 md:row-start-2 md:text-2xl">
                {keepNumberCompounds(unbreakable(r.value))}
              </dd>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:self-center">
                {keepNumberCompounds(r.note)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 max-w-3xl text-sm text-muted-foreground text-pretty">{PRICE_FOOTNOTE}</p>
        <div className="mt-3 flex flex-wrap gap-x-8">
          <ArrowLink to="/pricing">Every plan and package, line by line</ArrowLink>
          {kind === "monthly" && <ArrowLink to="/pricing?plan=starter-monthly#start">Start a plan</ArrowLink>}
        </div>
      </div>
    </section>
  );
}

/** The monthly plan's terms in plain words, and what the monthly fee does not cover. */
export function Terms({ terms }: { terms: NonNullable<WebsitePage["terms"]> }) {
  return (
    <section className="section-tight pt-4" aria-labelledby="websites-terms">
      <div className="container-page">
        <SectionHead id="websites-terms" title={terms.heading} intro={terms.intro} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-14">
          <dl className="divide-y divide-border/70 border-y border-border/70">
            {terms.items.map((t) => (
              <div key={t.title} className="grid gap-1.5 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <dt className="font-display text-base font-semibold">{t.title}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">{t.body}</dd>
              </div>
            ))}
          </dl>
          <div className="h-fit rounded-3xl border border-border bg-card/60 p-6 sm:p-7">
            <h3 className="font-display text-lg font-semibold">Not in the monthly fee</h3>
            <ul className="mt-4 space-y-3">
              {terms.notIncluded.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
