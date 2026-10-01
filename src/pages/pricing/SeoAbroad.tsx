import { ABROAD, GST_LINE, SEO, inr, usd, usdRange, usdWord } from "@/lib/pricing";
import { unbreakable } from "@/lib/typography";
import { ArrowLink, SectionHead, Ticks } from "./ui";

/**
 * The SEO add-on (India in rupees, abroad in US dollars) and the table for
 * clients outside India. No ranking promise, no "No. 1": Google's own sentence
 * is quoted instead. The SEO service page is linked by its current address.
 */
export default function SeoAbroad() {
  return (
    <>
      <section id="seo" className="section-tight" aria-labelledby="seo-heading">
        <div className="container-page">
          <SectionHead
            id="seo-heading"
            title="Local SEO add-on"
            intro="For a business that wants more of the people already searching nearby to find it, call it and visit it."
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-lg font-semibold">What the monthly fee covers</h3>
              <Ticks items={SEO.includes} className="mt-4" />
              <p className="mt-6 border-t border-border/60 pt-5 text-sm text-muted-foreground text-pretty">
                No ranking is guaranteed, by us or by anyone honest. Google says it plainly: “No one can guarantee a #1
                ranking on Google.” What we commit to is the work above, every month, and a report that shows what
                changed.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-3xl border border-border bg-card/60 p-6">
                <p className="text-sm text-muted-foreground">In India</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                  From {unbreakable(inr(SEO.indiaFrom))} <span className="text-lg font-medium">a month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">
                  Your fee is fixed in writing after a free check of your site and your Google profile, before you pay
                  anything. {GST_LINE}
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card/60 p-6">
                <p className="text-sm text-muted-foreground">Outside India</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                  From {usdWord(SEO.abroadFromUsd)} <span className="text-lg font-medium">a month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">
                  For small businesses in the US, UK, UAE and Australia. Quoted in US dollars.
                </p>
              </div>
              <ArrowLink to="/services/seo">How we work on SEO</ArrowLink>
            </div>
          </div>
        </div>
      </section>

      <section id="abroad" className="section-tight" aria-labelledby="abroad-heading">
        <div className="container-page">
          <SectionHead
            id="abroad-heading"
            title="Prices for clients outside India"
            intro="For clients in the US, UK, UAE and Australia. Same scope discipline, same written quote, in US dollars."
          />

          <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card/50">
            <div className="flex items-baseline justify-between gap-2 border-b border-border/60 px-6 py-3 text-sm text-muted-foreground md:px-8">
              <span>Offer</span>
              <span>Indicative range</span>
            </div>
            <ul className="divide-y divide-border/60">
              {[...ABROAD.map((r) => ({ offer: r.label, range: usdRange(r) })), { offer: "Local SEO, a month", range: `from ${usd(SEO.abroadFromUsd)}` }].map((r) => (
                <li key={r.offer} className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4 md:px-8">
                  <span className="font-display text-base font-semibold">{r.offer}</span>
                  <span className="font-display text-lg tabular-nums text-foreground">{unbreakable(r.range)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The milestone split differs by market: PACKAGES-INTERNATIONAL.html and
              the MSA use 40 / 30 / 30, against 50 / 30 / 20 in India. */}
          <p className="mt-6 max-w-3xl text-sm text-muted-foreground text-pretty">
            International projects are paid <strong className="font-medium text-foreground">40 / 30 / 30</strong>{" "}
            (kickoff, acceptance, delivery) rather than the 50 / 30 / 20 used in India, and the exact shares are set in
            your Statement of Work. Ideovent Technologies is not registered under GST and no export LUT has been filed,
            so invoices are non-GST and say so on their face. Tell us where you are on the first call and we will show
            you what your invoice will look like before you commit.
          </p>
        </div>
      </section>
    </>
  );
}
