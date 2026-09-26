import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";

/**
 * WHAT A PARENT RUNS INTO. New on 26 Sep 2026 (_assets/HOMEPAGE-COPY-DECK.md
 * section 3).
 *
 * The page's first job after the hero is to give something useful before it
 * asks for anything (Sell Like Crazy's "value before the pitch"): six problems a
 * parent actually meets on school and coaching sites, and what the fix does.
 * It is the ungated half of the free website check.
 *
 * HONESTY. These are patterns seen across the twenty rows in
 * 04-sales-kit/PROSPECTS-DELHI-NCR.md, measured on 25 Sep 2026. No institute is
 * named, and no counts ("7 of 20") are given. "In Delhi", not "South Delhi":
 * one row is in Dwarka. Each "Fix" says what the site DOES, never what it will
 * do to anyone's admissions.
 *
 * MARKUP. The proof band's box (`rounded-3xl border border-border bg-card/50`)
 * and its three-column `dl`, six items so two rows of three. No serif accent:
 * weight contrast only, as in the proof band.
 */
const ITEMS = [
  {
    dt: "No enquiry form",
    dd: "The parent has to call. At 10 pm, nobody picks up.",
    fix: "a short form that reaches you the minute it is sent.",
  },
  {
    dt: "A bare link on WhatsApp",
    dd: "A parent shares your site in the class group. It shows up as a plain web address. No name, no logo, no photo.",
    fix: "a proper preview with your name and a campus photo.",
  },
  {
    dt: "Fees in a PDF",
    dd: "Fees or batch timings are only in a PDF. On a phone, the parent has to download it and zoom in to read it.",
    fix: "a plain page that opens at once.",
  },
  {
    dt: "A web address that does not open",
    dd: "The site has stopped working, or now opens someone else's site.",
    fix: "the domain registered in your own name, so it stays yours.",
  },
  {
    dt: "Two phone numbers",
    dd: "Two different numbers for the same school. One has no STD code.",
    fix: "one number. One tap to call, one tap to WhatsApp.",
  },
  {
    dt: "Another school comes up",
    dd: "A parent searches your name and a different school appears.",
    fix: "your full name, address and map on every page, written the same way everywhere.",
  },
];

export default function ParentProblems() {
  return (
    // RHYTHM: follows the 24px strip, so it carries its own top; its bottom is
    // short because the next section opens on a gold rule.
    <section className="pt-12 pb-2 md:pt-16 lg:pt-20">
      <div className="container-page">
        <Reveal>
          <div className="rounded-3xl border border-border bg-card/50 p-6 sm:p-10">
            <Eyebrow>What we found</Eyebrow>
            <h2 className="mt-5 max-w-2xl font-display text-xl font-light leading-snug sm:text-2xl">
              We looked up twenty schools and coaching institutes in Delhi.{" "}
              <span className="font-extrabold">Here is what a parent runs into.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground text-pretty">
              Small things. But a parent notices every one of them, often before they ever call you.
            </p>

            <dl className="mt-7 grid gap-x-8 gap-y-7 sm:grid-cols-3">
              {ITEMS.map((it) => (
                <div key={it.dt}>
                  <dt className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
                    {it.dt}
                  </dt>
                  <dd className="mt-2 text-sm text-muted-foreground text-pretty">{it.dd}</dd>
                  <dd className="mt-2 text-sm text-foreground/80 text-pretty">
                    <span className="font-semibold">Fix:</span> {it.fix}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <p className="text-sm text-muted-foreground text-pretty">
                Want to know which of these your site has? We will check it for free.
              </p>
              <Link
                to="/#contact"
                className="group inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border border-border px-4 text-sm
                           font-medium transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70 sm:self-auto"
              >
                Check my website
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
