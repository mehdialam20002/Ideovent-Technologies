import { ChevronDown } from "lucide-react";
import { PRICING_FAQ } from "./copy";
import { ArrowLink, SectionHead } from "./ui";

/**
 * Questions about prices, as native <details>. Unlike the Radix accordion, a
 * closed <details> keeps its answer in the page, so readers who search the page
 * and Google both get every answer (seo-audit P1-1); it opens without JavaScript
 * and brings keyboard and screen-reader support with it. No FAQPage markup
 * here: /faq carries that, and one set of FAQ markup per question is the rule.
 */
export default function PricingFaq() {
  return (
    <section id="questions" className="section-tight" aria-labelledby="questions-heading">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <SectionHead
            id="questions-heading"
            title="Questions about the prices"
            intro="Cancelling, what happens after 12 months, who owns the domain, how you pay. The answers match the plan you sign."
          />
          <ArrowLink to="/faq" className="mt-4">
            Every question we get asked
          </ArrowLink>
        </div>

        <div className="divide-y divide-border/70 border-y border-border/70">
          {PRICING_FAQ.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-base font-medium [&::-webkit-details-marker]:hidden">
                <span className="text-pretty">{f.q}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
