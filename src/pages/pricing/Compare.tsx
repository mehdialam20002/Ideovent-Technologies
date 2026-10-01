import { COMPARE, THREE_YEARS } from "./copy";
import { SectionHead } from "./ui";

/**
 * Monthly plan or buy it outright, row by row. A table from md up; below md
 * each row stacks, so a phone never gets a table it has to scroll sideways
 * (the same reason the care plans stack). Exactly one of the two is in the
 * accessibility tree at any width.
 */
export default function Compare() {
  return (
    <section id="compare" className="section-tight" aria-labelledby="compare-heading">
      <div className="container-page">
        <SectionHead
          id="compare-heading"
          title="Monthly plan or buy it outright?"
          intro="Both get you a website that works on a phone and sends enquiries to you. The difference is how you pay, and who owns it."
        />

        <div className="mt-8 hidden overflow-hidden rounded-3xl border border-border bg-card/50 md:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Monthly website plan compared with a website bought outright</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-[22%] px-6 py-4 text-left font-display font-semibold">
                  <span className="sr-only">Question</span>
                </th>
                <th scope="col" className="px-6 py-4 text-left font-display text-base font-semibold">Monthly plan</th>
                <th scope="col" className="px-6 py-4 text-left font-display text-base font-semibold">Bought outright</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label} className="border-b border-border/60 last:border-b-0 align-top">
                  <th scope="row" className="px-6 py-4 text-left font-medium text-foreground">{r.label}</th>
                  <td className="px-6 py-4 text-muted-foreground text-pretty">{r.monthly}</td>
                  <td className="px-6 py-4 text-muted-foreground text-pretty">{r.oneTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-8 divide-y divide-border/70 border-y border-border/70 md:hidden">
          {COMPARE.map((r) => (
            <div key={r.label} className="py-4">
              <dt className="font-display text-base font-semibold">{r.label}</dt>
              <dd className="mt-2 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <span className="text-foreground">Monthly plan</span>
                <span className="text-muted-foreground text-pretty">{r.monthly}</span>
                <span className="text-foreground">Bought outright</span>
                <span className="text-muted-foreground text-pretty">{r.oneTime}</span>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">{THREE_YEARS}</p>
      </div>
    </section>
  );
}
