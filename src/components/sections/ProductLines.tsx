import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, School } from "lucide-react";
import { useSingleton } from "@/lib/cms/context";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";

/**
 * The two business lines that are not client services: EduFlow and LaunchPad.
 *
 * Both are real (see _assets/FACTS.md. EduFlow is the flagship product, LaunchPad
 * is the internship programme that already issued two verifiable certificates), and
 * both were hard to find: EduFlow had one nav label and LaunchPad had one footer
 * link. A section in the scroll path of every home-page visitor is found far more
 * often than a nav item is clicked, and unlike a nav label it has room to state
 * EduFlow's status.
 *
 * Copy is read from the `eduflow` and `internship` singletons rather than retyped,
 * so the home page cannot end up describing either one differently from its own
 * page. In particular `eduflow.honestyLine`, "currently in development, no school
 * is running it yet, there is no public demo", travels with the card. There is no
 * "book a demo", no user count and no launch date on this section, because none of
 * those exist.
 */
export default function ProductLines() {
  const eduflow = useSingleton("eduflow");
  const internship = useSingleton("internship");

  /* HOMEPAGE-COPY-DECK.md section 10 (26 Sep 2026): the LaunchPad card leaves
     the home page. An owner reading about their business has no use for an
     internship card; it keeps its own page (/internship) and its footer link.
     Mehdi decides (deck decision 6): set this to true to bring it back, and the
     heading and side line below switch back to the two-card wording. */
  const SHOW_LAUNCHPAD = false;

  const allCards = [
    {
      key: "eduflow",
      icon: School,
      status: "In development",
      name: "EduFlow",
      title: eduflow.title,
      body: eduflow.subtitle,
      honesty: eduflow.honestyLine,
      href: "/eduflow",
      cta: "What EduFlow is, and is not",
    },
    {
      key: "launchpad",
      icon: GraduationCap,
      // `batchLabel` is blank between batches on purpose, "Next batch enrolling
      // now" is evergreen urgency that is false most of the year
      // (LAUNCHPAD-MARKETING.md §1 row 5). The fallback states the length of the
      // programme, which is true whether or not a batch is open, rather than
      // inventing a scarcity or an intake status.
      status: internship.batchLabel || "12-week programme",
      name: "Ideovent LaunchPad",
      title: internship.title,
      body: internship.subtitle,
      honesty: "Two interns have been certified. Both certificates verify on this site. You can check either one before you apply.",
      href: "/internship",
      cta: "See the programme",
    },
  ];
  const cards = SHOW_LAUNCHPAD ? allCards : allCards.filter((c) => c.key !== "launchpad");

  return (
    /* (Since 26 Sep 2026 the section above this is PriceSummary, not the
       services index; the reasoning below still holds for its bottom padding.)
       pt-8, not `.section`'s pt-20/28/32. The services index above this one
       closes with two link pills and then 96px of its own bottom padding; a
       further 128px on top of that measured 224px of empty navy between a link
       and the next eyebrow, which is exactly the "no section is more important
       than any other" flatness _assets/DESIGN-DIRECTION.md §5 warns about. The
       gold rule under the heading below now marks the boundary instead, the
       same way it does over the work section and the services index, so the
       three section openings on this page are one system. */
    <section className="relative pb-20 pt-8 md:pb-28 md:pt-10 lg:pb-32">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-5 border-t-2 border-secondary/70 pt-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>Also from Ideovent</Eyebrow>
              {/* Weight contrast, not the serif accent. The home page spends
                  both of its two on the hero and on the work section. */}
              {SHOW_LAUNCHPAD ? (
                <h2 className="mt-5 text-display font-display font-thin-display">
                  Two things we run <span className="font-loud-display">ourselves</span>
                </h2>
              ) : (
                <h2 className="mt-5 text-display font-display font-thin-display">
                  For schools and coaching:{" "}
                  <span className="font-loud-display">EduFlow</span>
                </h2>
              )}
            </div>
            <p className="max-w-md text-sm text-muted-foreground text-pretty md:pb-2">
              {SHOW_LAUNCHPAD
                ? "One is software for schools, still in development. One is an internship we teach. Both are described exactly as they stand today."
                : "Fees, attendance and parent updates in one place, for schools and coaching institutes. It is still in development. The card below says exactly where it stands."}
            </p>
          </div>
        </Reveal>

        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className={cn("mt-12 grid grid-cols-1 gap-5", cards.length > 1 ? "md:grid-cols-2" : "md:max-w-3xl")}
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.key} variants={fadeUp}>
                <Link
                  to={card.href}
                  className="group flex h-full flex-col rounded-3xl border border-border bg-card/60 p-6 transition-colors duration-200
                             hover:border-primary/40 hover:bg-card active:bg-card/80 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary
                                     transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">{card.name}</h3>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.status}</p>
                    </div>
                  </div>

                  <p className="mt-5 font-display text-xl font-semibold leading-snug text-foreground text-pretty">
                    {card.title}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground text-pretty">{card.body}</p>

                  {/* The status line is inside the card, not a footnote under the
                      grid. If the card ever gets reused or reordered, the honesty
                      goes with it. */}
                  <p className="mt-4 rounded-2xl border border-border/70 bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
                    {card.honesty}
                  </p>

                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    {card.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                  </span>
                </Link>
              </motion.div>
);
          })}
        </motion.div>
      </div>
    </section>
);
}
