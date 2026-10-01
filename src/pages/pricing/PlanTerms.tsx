import { X } from "lucide-react";
import { NOT_IN_MONTHLY, PLAN_TERMS } from "./copy";
import { SectionHead } from "./ui";

/**
 * The monthly plan in plain words, next to the plans rather than in the terms:
 * what a change is, who owns what, the buy-out, how to stop, what happens after
 * month 12, and what the monthly fee does not cover. The CCPA dark-pattern
 * guidelines (2023) name a cancellation that is hard to find or hard to
 * understand as a "subscription trap"; this block is the answer to that.
 */
export default function PlanTerms() {
  return (
    <section id="plan-terms" className="section-tight pt-4" aria-labelledby="plan-terms-heading">
      <div className="container-page">
        <SectionHead
          id="plan-terms-heading"
          title="The monthly plan, in plain words"
          intro="The same terms go into the written plan you get before you pay anything."
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-14">
          <dl className="divide-y divide-border/70 border-y border-border/70">
            {PLAN_TERMS.map((t) => (
              <div key={t.term} className="grid gap-1.5 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <dt className="font-display text-base font-semibold">{t.term}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">{t.detail}</dd>
              </div>
            ))}
          </dl>

          <div className="h-fit rounded-3xl border border-border bg-card/60 p-6 sm:p-7">
            <h3 className="font-display text-lg font-semibold">Not in the monthly fee</h3>
            <ul className="mt-4 space-y-3">
              {NOT_IN_MONTHLY.map((item) => (
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
