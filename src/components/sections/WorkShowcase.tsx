/*
 * 26 SEP 2026, RESTORED WITH THREE CHANGES. This is the version that was live on
 * 25 Sep (Mehdi preferred it to the redesign), with the fix he asked for applied:
 * every screenshot now sits inside ProjectCover's BrowserFrame, which prints the
 * project's real address, so a project's own navbar reads as "their website"
 * instead of a second navbar stacked under ours. For that to hold, nothing may
 * cut the frame: the lead no longer bleeds off the right edge, the figure lost
 * its own border (the frame is the chrome), and the cards lost the address pill
 * and the dark gradient that sat over an unframed cover. The long notes below
 * about the bleed describe the old layout and are kept for the reasoning.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ProjectCover, employerCredit } from "@/components/ui/project-cover";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";
import type { Project } from "@/lib/cms/types";

/**
 * The home page's work section.
 *
 * This is the section that sells, so it gets the most design on the site, and it
 * carries the home page's ONE deliberate break in the grid
 * (_assets/DESIGN-DIRECTION.md §4: "Give one section an offset... Once per page,
 * not everywhere, or it becomes noise").
 *
 * THE BREAK: the lead project runs as a 40/60 split in which the text column
 * stays on the `.container-page` gutter and the screenshot runs off the RIGHT
 * EDGE OF THE VIEWPORT. Everything else on the home page is inside the gutter on
 * both sides, so this is the only place the page steps outside its own margin,
 * and it is the place where the thing being shown is a picture worth showing.
 *
 * HOW THE BLEED IS DONE, AND WHY IT CANNOT BREAK THE GUTTER LADDER.
 * `margin-right: calc(50% - 50vw)` on a DIRECT CHILD of `.container-page` moves
 * that child's right edge exactly to the viewport edge, whether or not the
 * container is at its 80rem cap:
 *
 *   uncapped   container = 100vw, content width W = 100vw - 2·pad
 *              50vw - W/2 = pad                    = the gap to the edge  ✓
 *   capped     container = 1280, W = 1280 - 2·pad
 *              50vw - W/2 = 50vw - 640 + pad       = the gap to the edge  ✓
 *
 * The `.container-page` element itself is untouched, so `scripts/measure-gutters.mjs`
 * still reads the same left and right gutter on this page as on every other
 * route: the bleed is a child escaping, not a container being widened.
 *
 * `overflow-hidden` on the <section> is load-bearing, not tidying. `100vw`
 * counts the vertical scrollbar and the viewport width does not, so on a desktop
 * with a classic scrollbar the figure overshoots by half the scrollbar width.
 * Clipped at the section, that is invisible and produces no page-level scroll.
 * measure-gutters treats an element under an overflow-hidden ancestor as
 * deliberately clipped decoration, which is exactly what this is. (`body` is
 * also `overflow-x-hidden`, but the script's clipping walk stops BEFORE body, so
 * the section has to carry it itself.)
 *
 * Below `lg` there is no bleed at all: the figure sits in the gutter like
 * everything else, because a 375px screen has no margin to spend.
 *
 * EVERY CARD CARRIES SOMETHING TRUE (§5). A project card here holds its real
 * screenshot, the address it actually answers at (as a link a visitor can open
 * in another tab without leaving this page), the sector, the stack, and the
 * "try this" line, which points at one checkable thing on the live site. There
 * is no icon-title-two-lines card in this file. Where a project has no
 * screenshot, ProjectCover prints the reason inside the cover panel rather than
 * standing a stock photograph in for it.
 *
 * NOTHING COUNTED, NOTHING CLAIMED. No project count, no client count, no
 * satisfaction figure. `testimonials`, `stats` and `clients` are empty arrays by
 * design (_assets/FACTS.md) and this section is built so that the page reads as
 * complete without them: the evidence on offer is an address the reader can
 * open, which is stronger than a quote they cannot check.
 */

/** The address, without the scheme, for printing on a card. */
function host(url?: string) {
  return url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** A supporting card: screenshot, address, one true line, the stack. */
function WorkCard({ project: p }: { project: Project }) {
  const address = host(p.liveUrl);

  return (
    <Link
      to={`/work/${p.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/50
                 transition-colors duration-200 hover:border-foreground/25 hover:bg-card/80 active:bg-card"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <ProjectCover
          src={p.coverImage}
          title={p.title}
          slot="card"
          noImageReason={p.noImageReason}
          attribution={employerCredit(p)}
          className="group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {p.sector && (
          <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">{p.sector}</p>
        )}
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{p.title}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground text-pretty">{p.summary}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          Read the case study
          <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export default function WorkShowcase() {
  const all = useCollection("projects");
  const featured = all.filter((p) => p.featured);

  // No featured projects means no section. A heading over an empty grid is the
  // same titled hole the emptied testimonials array would have left if its
  // consumer were not guarded.
  if (!featured.length) return null;

  // The lead is the first featured project that has a real screenshot: the whole
  // point of the wide asymmetric slot is that there is something worth looking
  // at in it. If none of them has one, the section falls back to the plain grid
  // rather than bleeding an empty navy panel off the edge of the page.
  const lead = featured.find((p) => Boolean(p.coverImage));
  const rest = (lead ? featured.filter((p) => p.id !== lead.id) : featured).slice(0, 3);
  const leadAddress = host(lead?.liveUrl);

  // SOFTWARE, 26 Sep 2026. The four featured cards are all consumer sites, and a
  // founder or a firm that wants busywork taken off its team needs to see
  // software too. HRMS Lite and Lead CRM are verified paid client projects
  // (_assets/FACTS.md). Picked by id, not by the `featured` flag, so the four
  // sites above keep their slots. They carry no live link on purpose: signed
  // out, both are a login box (see noLiveUrlReason in seed.ts), so the cards
  // go to the case studies, which say exactly what each one does.
  const software = ["hrms-lite", "lead-crm"]
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is Project => Boolean(p));

  return (
    <section
      id="work"
      /* overflow-hidden: see the note above, it is what makes the bleed safe.
         The padding is deliberately NOT the site's default `.section` rhythm.
         This is the loudest section on the page, and it takes that room at the
         TOP. The bottom is deliberately tight because the proof band that
         follows is a footnote to this section rather than a section of its own:
         at the lg:pb-40 this used to carry, 160px of the work section's own
         padding met the proof band's pt-0 and left a measured 190px of empty
         navy between a link and the box explaining how to check it. */
      className="relative overflow-hidden pt-20 pb-12 md:pt-28 md:pb-14 lg:pt-32 lg:pb-16"
    >
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-5 border-t-2 border-secondary/70 pt-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>What we have built</Eyebrow>
              {/* The serif italic accent, one of exactly two on this page. See
                  _assets/DESIGN-DIRECTION.md §1: one or two words, never a whole
                  line. The rest of the headline is Sora 300, so the accent is
                  the only thing in it with weight or colour. */}
              <h2 className="mt-5 text-display font-display font-light">
                Go and look at the <span className="accent-italic text-gradient">actual thing</span>.
              </h2>
            </div>
            {/* HOMEPAGE-COPY-DECK-V2.md A5. The HighQ line names the one
                coaching build without linking it: highqclasses.ideovent.com does
                not open yet. On the day it does, give the project a liveUrl and
                feature it after the four live sites (seed.ts `projects`). */}
            <div className="max-w-md md:pb-2">
              <p className="text-sm text-muted-foreground text-pretty">
                Each site card shows the real address. Open it in another tab and judge it
                for yourself. Below them is the software we built for teams.
              </p>
              <p className="mt-3 text-sm text-muted-foreground text-pretty">
                Run a school or coaching institute? We built the website and admin panel for
                HighQ Classes, and we can show you a sample site made for yours. HighQ's
                address is being moved, so for now we show it on a call.
              </p>
            </div>
          </div>
        </Reveal>

        {lead && (
          <Reveal className="mt-12 md:mt-16">
            {/* THE BREAK. Direct child of .container-page so `calc(50% - 50vw)`
                resolves against the container's own content box. See the file
                header for the arithmetic. */}
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-14">
              {/* Text stays in the gutter. */}
              <div className="lg:py-6">
                {lead.sector && (
                  <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {lead.sector}
                  </p>
                )}
                <h3 className="mt-3 font-display text-2xl font-semibold leading-tight md:text-3xl">
                  {lead.title}
                </h3>

                {/* A real, external, openable address. It is a sibling anchor
                    rather than nested inside a card-wide <Link>, because an
                    anchor inside an anchor is invalid and the browser picks one
                    of them for you. */}
                {leadAddress && lead.liveUrl && (
                  <a
                    href={lead.liveUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background/50
                               px-4 font-mono text-xs text-foreground transition-colors duration-200
                               hover:border-primary/60 hover:bg-muted active:bg-muted/70"
                  >
                    {leadAddress}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" aria-hidden="true" />
                  </a>
                )}

                <p className="mt-5 text-sm text-muted-foreground text-pretty sm:text-base">
                  {lead.summary}
                </p>

                {/* One checkable thing, straight out of the CMS. Never a claim:
                    a reader can open the address above and see it in about
                    fifteen seconds. */}
                {lead.tryThis && (
                  <p className="mt-5 border-l-2 border-secondary/70 pl-4 text-sm text-foreground/80 text-pretty">
                    <span className="font-medium text-foreground">Try this. </span>
                    {lead.tryThis}
                  </p>
                )}

                {lead.technologies?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {lead.technologies.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <Link
                  to={`/work/${lead.slug}`}
                  className="group mt-7 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm
                             font-medium text-primary-foreground transition-[color,background-color,transform] duration-200 hover:bg-primary/90 active:bg-primary/80 active:scale-[0.99] motion-reduce:active:scale-100"
                >
                  What we decided, and what we cannot claim
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {/* The figure. Rounded on the left only from lg up, because its
                  right edge is off the screen and a corner radius on an edge
                  nobody can see reads as a mistake at the join. */}
              <figure className="relative m-0">
                <div className="relative aspect-[16/10] lg:aspect-[16/11]">
                  <ProjectCover
                    src={lead.coverImage}
                    title={lead.title}
                    slot="showcase"
                    noImageReason={lead.noImageReason}
                    attribution={employerCredit(lead)}
                  />
                </div>
              </figure>
            </div>
          </Reveal>
        )}

        {rest.length > 0 && (
          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.08 }}
            className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3"
          >
            {rest.map((p) => (
              <motion.div key={p.id} variants={fadeUp} className="h-full">
                <WorkCard project={p} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {software.length > 0 && (
          <Reveal className="mt-12 lg:mt-16">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1 lg:pr-4 lg:pt-2">
                <Eyebrow>Software we have built</Eyebrow>
                <h3 className="mt-4 font-display text-xl font-semibold leading-snug md:text-2xl">
                  Tools a team uses every day
                </h3>
                <p className="mt-3 text-sm text-muted-foreground text-pretty">
                  An HR system and a lead CRM, built for clients. Both hold other people's
                  names and numbers and sit behind a login, so there is no public screenshot.
                  The case study says what each one does, and what we cannot claim.
                </p>
              </div>
              {software.map((p) => (
                <WorkCard key={p.id} project={p} />
              ))}
            </div>
          </Reveal>
        )}

        <Reveal className="mt-10">
          <Link
            to="/work"
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm
                       font-medium transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
          >
            Every project, including the ones with nothing to show
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
