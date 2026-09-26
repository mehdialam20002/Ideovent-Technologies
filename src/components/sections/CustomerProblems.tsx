import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";

/**
 * WHAT GETS IN THE WAY. Rewritten 26 Sep 2026 (_assets/HOMEPAGE-COPY-DECK-V2.md A3).
 *
 * The page's first job after the hero is to give something useful before it
 * asks for anything (Sell Like Crazy's "value before the pitch"): six common
 * problems any growing business meets online and inside the office, and what
 * the fix does. It is the ungated half of the free website check.
 *
 * HONESTY. These are common problems, not a survey result. Do not quote the
 * twenty-site school audit here: it covered schools only. Each "Fix" says what
 * the site or system DOES, never what it will do to anyone's sales.
 *
 * MARKUP. The proof band's box (`rounded-3xl border border-border bg-card/50`)
 * and its three-column `dl`, six items so two rows of three. No serif accent:
 * weight contrast only, as in the proof band.
 */
const ITEMS = [
  {
    dt: "Slow on a phone",
    dd: "It takes ages to open on mobile data. Your customer goes back and taps the next result.",
    fix: "light pages that open fast on a phone.",
  },
  {
    dt: "Hard to see what you offer",
    dd: "Your services, prices or timings are buried in a PDF, a photo or a WhatsApp forward. On a phone, your customer has to download it and zoom in.",
    fix: "a plain page that lists what you offer and opens at once.",
  },
  {
    dt: "A form that goes nowhere",
    dd: "The form sends into an inbox nobody reads, or there is no form. At 10 pm, nobody picks up the phone.",
    fix: "a short form that reaches you the minute it is sent, and one tap to call or WhatsApp.",
  },
  {
    dt: "The business next door comes up",
    dd: "Someone searches your name, or your trade near your area. A different business appears on Google Maps.",
    fix: "your full name, address and map on every page, written the same way everywhere.",
  },
  {
    dt: "Enquiries everywhere",
    dd: "Enquiries come on WhatsApp, calls, Instagram and forms. Nobody knows who followed up.",
    fix: "every enquiry in one list, with a name against it.",
  },
  {
    dt: "Everything in Excel and registers",
    dd: "Your staff type the same details again every day, into sheets and registers.",
    fix: "one simple system your team actually uses.",
  },
];

export default function CustomerProblems() {
  return (
    // RHYTHM: follows the 24px strip, so it carries its own top; its bottom is
    // short because the next section opens on a gold rule.
    <section className="pt-12 pb-2 md:pt-16 lg:pt-20">
      <div className="container-page">
        <Reveal>
          <div className="rounded-3xl border border-border bg-card/50 p-6 sm:p-10">
            <Eyebrow>What gets in the way</Eyebrow>
            <h2 className="mt-5 max-w-2xl font-display text-xl font-light leading-snug sm:text-2xl">
              Your customer checks you on a phone first.{" "}
              <span className="font-extrabold">Here is what stops them, and what slows you down.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground text-pretty">
              Small things. Your customer notices every one, often before they call you. Your team feels the rest every day.
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
