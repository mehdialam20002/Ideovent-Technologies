import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { Reveal } from "@/components/motion/Reveal";
import { useSingleton } from "@/lib/cms/context";

/**
 * THE FREE WEBSITE CHECK, the offer. New on 26 Sep 2026
 * (_assets/HOMEPAGE-COPY-DECK.md section 7).
 *
 * The small first step for the 97% of owners who are not buying this week.
 * Copy: _assets/HOMEPAGE-COPY-DECK-V2.md A7.
 * It is the 10-minute phone checklist Mehdi already runs for pitch pages,
 * written up as two to four plain observations. If the site is fine we say so:
 * never invent a defect.
 *
 * The third column is the real contract, said plainly (the "Godfather offer"
 * without inventing a guarantee). Sources: 50/30/20, two revision rounds per
 * design stage, 30 days of free fixes and code on final payment are FACTS.md;
 * admin logins handed over rests on Pricing.tsx (the 20% row); "your domain
 * stays under your control" rests on FAQ f3. The turnaround is
 * `contact.responseTimePromise`, until Mehdi sets one for the check itself.
 *
 * NOT ON THE PAGE, WAITING FOR MEHDI (deck decision 2). If he says yes, add this
 * as one more line under the grid, same classes as the "It costs nothing" line:
 *   "For some businesses, after the check and a short call, we build your new home
 *    page before you pay the advance. We tell you on the call if we can do it
 *    for you."
 *
 * MARKUP. The proof band's box and its three-column `dl` again; the button is
 * the hero's primary CtaButton. No serif accent.
 */
const COLUMNS = [
  {
    dt: "What we do",
    items: [
      "We open it on a phone, on mobile data.",
      "We fill in your enquiry form with our own number, and see where it goes.",
      "We count the taps to your prices, timings and contact details.",
      "We share your link on WhatsApp and see what your customer sees.",
      "We search your name, and your trade near your area, on Google and Maps.",
    ],
  },
  {
    dt: "What you get",
    items: [
      "Two to four things we found, in plain words, on a private page made for you.",
      "What each one would take to fix.",
      "If your site is fine, we tell you that.",
      "No website yet? We search your name the way a customer would, and tell you what they find.",
    ],
  },
  {
    dt: "If you then want us to build it",
    items: [
      "A written scope, with what is not included.",
      "A fixed price before you pay anything.",
      "You pay 50%, then 30%, then 20%. The middle payment comes when you can see the work.",
      "Two rounds of changes at each design stage.",
      "30 days of free fixes after launch.",
      "On the final payment, the code and the admin logins are handed to you. Your domain stays under your control.",
      "A care plan is optional, and you can cancel it.",
    ],
  },
];

export default function FreeCheck() {
  const contact = useSingleton("contact");
  // "We reply to new enquiries within two working days." → "within two working days"
  const when =
    contact.responseTimePromise?.match(/within [^.]+/i)?.[0] ?? "within two working days";

  return (
    // RHYTHM: between the proof band (pb-16 → md pb-20) and Process
    // (.section-tight). A short top, because the proof band above already
    // carries its own bottom, and a longer bottom than either neighbour.
    <section className="pt-2 pb-12 md:pt-4 md:pb-16 lg:pb-24">
      <div className="container-page">
        <Reveal>
          <div className="rounded-3xl border border-border bg-card/50 p-6 sm:p-10">
            <Eyebrow>Free website check</Eyebrow>
            <h2 className="mt-3 max-w-xl font-display text-xl font-semibold leading-snug sm:text-2xl">
              We check your site the way your customer does. Free.
            </h2>

            <dl className="mt-7 grid gap-x-8 gap-y-7 sm:grid-cols-3">
              {COLUMNS.map((col) => (
                <div key={col.dt}>
                  <dt className="font-display text-base font-semibold text-foreground">
                    {col.dt}
                  </dt>
                  {col.items.map((item) => (
                    <dd key={item} className="mt-2 text-sm text-muted-foreground text-pretty">
                      {item}
                    </dd>
                  ))}
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <CtaButton
                cta={{ label: "Check my website", href: "/#contact", variant: "primary" }}
                className="w-full sm:w-auto"
              />
              <p className="max-w-xl text-sm text-muted-foreground text-pretty">
                It costs nothing. No call is needed unless you want one. We reply on WhatsApp, {when}.
              </p>
            </div>
            {/* The software buyer's first step (deck V2 A7). A free first call,
                not a free written scope: /pricing charges a discovery fee for
                custom SaaS (deck V2 decision G4). */}
            <p className="mt-5 max-w-2xl text-sm text-muted-foreground text-pretty">
              Have a process or an app idea instead? Tell us about it on a free first call. You get a
              plain answer in writing on what it would take.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
