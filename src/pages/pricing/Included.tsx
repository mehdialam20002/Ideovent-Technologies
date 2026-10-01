import { X } from "lucide-react";
import { ALWAYS_INCLUDED, NEVER_INCLUDED, PAYMENT_STAGES, RULES } from "./copy";
import { SectionHead, Ticks } from "./ui";

/**
 * The one-time model's fine print: what every project includes, what no
 * package includes, the two payment stages and the rules. The stages are
 * 50 / 50 since 1 Oct 2026 (Mehdi), in India and abroad; they were 50 / 30 / 20
 * here and 40 / 30 / 30 for projects invoiced in US dollars.
 * The 60/40 split is kept from the old page: the "always" list is longer, so an
 * even split left a hole under the shorter card.
 */
export default function Included() {
  return (
    <section className="section-tight" aria-labelledby="included-heading">
      <div className="container-page">
        <SectionHead
          id="included-heading"
          title="On a one-time project: what is always in, what never is, and how you pay"
        />

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8">
            <h3 className="font-display text-lg font-semibold">In every project, at every price</h3>
            <Ticks items={ALWAYS_INCLUDED} className="mt-5" />
            <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground text-pretty">
              The reusable components we build on stay ours and come to you as a perpetual, free licence inside your
              site. That is what lets us start from something that already works.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8">
            <h3 className="font-display text-lg font-semibold">Never in a package price</h3>
            <ul className="mt-5 space-y-2.5">
              {NEVER_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground text-pretty">
              Nothing on this list is refused. It is quoted separately, so that it is visible rather than buried.
            </p>
          </div>
        </div>

        <h3 className="mt-12 font-display text-xl font-semibold">Half to start, half at launch</h3>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground text-pretty">
          The same in India and abroad, whether your invoice is in rupees or in US dollars.
        </p>
        <ol className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {PAYMENT_STAGES.map((s) => (
            <li key={s.when} className="rounded-3xl border border-border bg-card/60 p-6">
              <p className="font-display text-4xl font-semibold text-foreground">{s.pct}</p>
              <p className="mt-3 font-display text-base font-semibold">{s.when}</p>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{s.note}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-3xl border border-border bg-card/50 p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold">The rules that do not change, whichever tier you pick</h3>
          <dl className="mt-5 divide-y divide-border/60">
            {RULES.map((r) => (
              <div key={r.term} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <dt className="font-display text-sm font-semibold">{r.term}</dt>
                <dd className="text-sm text-muted-foreground text-pretty">{r.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
