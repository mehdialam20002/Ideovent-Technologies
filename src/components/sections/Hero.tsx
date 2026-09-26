import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { useSingleton, useCollection } from "@/lib/cms/context";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

/**
 * Home hero.
 *
 * THE WHAT / WHO / COST CONTRACT IS SUPERSEDED (26 September 2026).
 *
 * PHASE5-SPEC.md § C.3 used to set the brief: answer "what do you do, for whom,
 * and what does it cost" above the fold on a 375px phone, with a three-range price
 * ledger between the headline and the buttons. Mehdi overruled that on 26 Sep 2026
 * ("ye pricing starting me hi kyu dikha rahe?"), and the reasoning holds: a number
 * read before the problem is a cost with nothing attached to it. It is his own rule
 * in PITCH-PAGE-PLAYBOOK 7.3 (price after value) and the order of Sell Like Crazy,
 * which the copy deck (_assets/HOMEPAGE-COPY-DECK.md) follows. So:
 *
 *   1. The h1 is about the BUYER's customers, not about what we build: "Your
 *      customers look you up / before they call. / Make sure they find you, /
 *      trust you and get in touch." (_assets/HOMEPAGE-COPY-DECK-V2.md A1.) It
 *      speaks to any growing business; schools and coaching are one of the
 *      trades named in the audience line, not the studio's identity.
 *   2. WHO, `home.audience`, immediately under it, in foreground text rather than
 *      muted, because it is an answer and not a caption.
 *   3. ONE FREE NEXT STEP, not a price: the primary button is "Get a free website
 *      check", a step the 97% who are not buying this week will take.
 *
 * The ledger markup did not die, it moved: components/sections/PriceSummary.tsx
 * renders the same `rule-gold` block from `home.priceTeaser`, at section 9 of the
 * home page, after the problems, the work, the offer and the process. That is
 * also still the home page's inbound link to /pricing. Do not put it back here.
 *
 * LAYOUT, one column: head (what + who), then tail (buttons, the reassurance
 * line, the one quiet line for software buyers). The headline keeps the whole
 * container from lg up (no max-width), which was the fix for a measured 240px
 * hole at 1440 when a price card sat beside it. Nothing sits beside it now.
 *
 * Nothing here is a claim that cannot be checked. There is no counter, no "trusted
 * by", no rating and no client logo, `stats`, `clients` and `testimonials` are
 * deliberately empty arrays (_assets/FACTS.md) and every consumer of them in this
 * file is guarded so an empty array renders nothing at all rather than an empty box.
 *
 * NO ENTRANCE ANIMATION ABOVE THE FOLD, AND THIS IS DELIBERATE.
 *
 * This hero used to open with a six-step cascade: the eyebrow at 0s, the headline
 * masked and rising line by line from 0.1s, the audience line at 0.45s, a price
 * card (since removed) at 0.5s, the buttons at 0.65s, the subheading at 0.75s, the social-proof row
 * at 0.85s, each over 0.6-0.8s. The last element therefore finished moving about
 * 1.5 seconds after the page was otherwise ready.
 *
 * Two things were wrong with it. The first is the brief's: entrance motion earns
 * its place when it clarifies hierarchy, and nothing on a first screen needs to be
 * told apart in time, because it is all visible at once. The second is measurable:
 * the h1 is the LCP element on this page and it was being rendered at opacity 0
 * with a translate, so the largest contentful paint could not land until React had
 * hydrated and framer had run a frame. [[HERO_LCP_MEASUREMENT]] The headline is now
 * simply painted.
 *
 * Entrance motion is kept BELOW the fold, where a section sliding in is the signal
 * that a new section has arrived: see the Reveal on the stats band at the foot of
 * this file, and the stagger containers in the sections under it.
 */
export default function Hero() {
  const home = useSingleton("home");
  const stats = useCollection("stats");

  // Guarded, not assumed. mergeWithSeed shallow-merges each singleton, so a CMS
  // snapshot saved before this field existed still picks the seed value up,
  // but a hand-edited JSON import could drop it, and the landing page must not
  // throw because one optional block is missing.
  const others = home.otherBuyers;

  return (
    // Padding unchanged from the 25 Sep look. The phone fold was measured
    // against pt-24; with the ledger gone the buttons sit higher than before.
    <section className="relative overflow-hidden pt-24 pb-14 sm:pt-32 md:pb-24">
      <Aurora />
      <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

      <div className="container-page relative">
        {/* NOTHING HERE IS COLUMNED AT THE TOP LEVEL ANY MORE, AND THAT IS THE
            POINT. Every arrangement that put the price in a right-hand column
            left one column short of the other by between 230 and 240 measured
            pixels at 1440, because a fact sheet is 330px tall and a pair of
            buttons is 100px and no amount of alignment reconciles those two
            numbers. The price has since left the hero altogether (26 Sep 2026,
            see the file header), so there is no second column to run out.

            NO `mx-auto max-w-6xl` ON THIS BLOCK. It used to carry one, and at
            1440 that centred a 1152px block inside the 1328px container and
            started the h1 at 139px while every left-aligned heading on this same
            page, and the h1 on /work, /eduflow and /internship, started at 51px
            on the .container-page gutter. The hero headline was the only thing
            on the site indented 88px further in than everything under it. */}
        <div className="flex flex-col gap-y-8 md:gap-y-10">
          {/* ── 1. WHAT, and WHO for ──────────────────────────────────────── */}
          {/* No max-width from lg up, so the h1 is set against the whole 1184px
              container. See the measured note in the file header. The audience
              paragraph below carries its own max-w-xl, so the only thing that
              takes the extra width is the headline, which is the one element on
              the page that wants it. */}
          <div className="max-w-2xl lg:max-w-none">
            <Eyebrow>{home.badge}</Eyebrow>

            <h1 className="mt-4 text-hero font-display font-semibold">
              {home.headingLines.map((line, i) => (
                <span key={i} className="block pb-1">
                  {line.highlighted ? <span className="accent-italic text-gradient">{line.text}</span>: line.text}{" "}
                </span>
))}
            </h1>

            {/* The "for whom" answer. Foreground rather than muted: on a phone this
                is the second of the three things the page exists to say, and muted
                text at this size reads as a disclaimer. */}
            {home.audience && (
              <p className="mt-4 max-w-xl text-base text-foreground/90 text-pretty sm:text-lg">
                {home.audience}
              </p>
)}
          </div>

          {/* ── 2. One free next step ─────────────────────────────────────── */}
          {/* The price ledger that sat here moved to PriceSummary.tsx (see the
              file header). Nothing replaces it: the buttons follow the audience
              line directly. */}
          <div className="max-w-2xl">
            {/* One column below 420px: the button labels are longer than the old
                "Start a project" / "See our work" and overran their pill padding
                side by side at 375 (verifier, 26 Sep). */}
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
              {home.ctas.map((cta) => (
                <CtaButton key={cta.label} cta={cta} className="w-full sm:w-auto" />
))}
            </div>

            {/* For the owner with no site at all, who would otherwise read
                "website check" as not for them. "How you show up", never a
                ranking promise. */}
            <p className="mt-4 max-w-xl text-sm text-foreground/85 text-pretty">
              No website yet? We check how you show up on Google and Maps instead.
            </p>

            <p className="mt-2 max-w-xl text-sm text-muted-foreground text-pretty">
              {home.subheading}
            </p>

            {/* One quiet line for the software buyer: an app, a portal or
                software for the team, first call free. Same classes as the
                reassurance line above it, so it reads as a footnote. */}
            {others?.text && (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground text-pretty">
                {others.text}{" "}
                {others.link?.href && (
                  <Link
                    to={others.link.href}
                    className="group inline-flex items-center gap-1 font-medium text-primary transition-colors duration-200 hover:text-foreground"
                  >
                    {others.link.label}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                  </Link>
                )}
              </p>
            )}

            {/* Social proof (including the star row) only renders when there are
                real, permissioned client faces or logos to show. It is empty today
                (the previous avatars were stock photographs of strangers), so the
                whole block, stars and all, stays off the page. */}
            {home.socialProof.avatars.length > 0 && (
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="flex -space-x-3">
                  {home.socialProof.avatars.map((a, i) => (
                    <img key={i} src={a.src} alt={a.alt || ""} className="h-9 w-9 rounded-full border-2 border-background object-cover" loading="lazy" />
))}
                </div>
                <div className="text-left text-sm">
                  <div className="flex items-center gap-1 text-primary">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
))}
                  </div>
                  <p className="text-muted-foreground">
                    {home.socialProof.line1} <span className="text-foreground">{home.socialProof.line2}</span>
                  </p>
                </div>
              </div>
)}
          </div>
        </div>

        {/* Counters render only when there are some. An empty band would otherwise
            leave a hollow bordered box across the hero. */}
        {stats.length > 0 && (
          <Reveal className="mx-auto mt-16 grid max-w-4xl grid-cols-2 divide-x divide-border overflow-hidden rounded-3xl border border-border bg-card/40 backdrop-blur md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.id} className={cn("flex flex-col items-center gap-1 px-4 py-6 text-center", i >= 2 && "border-t border-border md:border-t-0")}>
                <span className="font-display text-3xl font-semibold md:text-4xl">
                  {s.value}
                  {s.suffix}
                </span>
                <span className="text-xs text-muted-foreground md:text-sm">{s.label}</span>
              </div>
))}
          </Reveal>
)}
      </div>
    </section>
);
}
