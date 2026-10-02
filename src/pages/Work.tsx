import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, FolderSearch } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCover, employerCredit } from "@/components/ui/project-cover";
import { EmployerWorkCard } from "@/components/ui/employer-work-card";
import { Reveal } from "@/components/motion/Reveal";
import { useCollection } from "@/lib/cms/context";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/cms/types";
import { PAGE_SEO } from "@/lib/seo/pages";

/**
 * /work
 *
 * Structured from 06-portfolio/PORTFOLIO-PAGE-COPY.md. Three things about the
 * shape of this page are deliberate and should not be "simplified":
 *
 *   1. CLIENT WORK, OUR OWN PRODUCTS and THE FOUNDER'S WORK ELSEWHERE are
 *      separate bands with different headings and different chrome. Quietly
 *      folding employer work into the client list is the single most common way
 *      an agency portfolio becomes a lie, so the WTF Go band never uses the word
 *      "client", never says "we delivered", and does not look like a client card
 *      at a glance.
 *   2. There is NO project count, NO client count, NO years-of-experience figure
 *      and NO team size anywhere on this page. The reader counts the cards, and
 *      that count is always honest and never needs writing down. The old site
 *      carried "50+ Projects delivered" and "98% Client satisfaction"; the habit
 *      does not come back in a new coat.
 *   3. The category filter that used to sit here is gone. It offered "web",
 *      "product" and "employer work" as equivalent pills, which is exactly the
 *      equivalence this page exists to break. The bands below say the same thing
 *      with the distinction that matters made visible instead of selectable.
 */

/**
 * The three bands.
 *
 * `serif` marks the ONE band heading allowed to use the Instrument Serif
 * italic. _assets/DESIGN-DIRECTION.md §1 puts the accent at one or two words
 * per page, and this page spends its two on the h1 ("Open something") and on
 * the client band, which is the heading the page exists for. Every other
 * heading here contrasts by WEIGHT instead, Sora 300 against Sora 800, which is
 * §3. Before this pass /work carried six serif accents, which is the same as
 * carrying none: an accent used six times is just the second body face.
 *
 * `pad` is the band's own vertical rhythm, and the three are deliberately
 * different. Equal padding on every band is the last item on §"Things that will
 * make it look generated again".
 */
const BANDS: {
  key: string;
  eyebrow: string;
  title: string;
  accent: string;
  serif?: boolean;
  pad: string;
  intro: string;
}[] = [
  /*
    MEHDI ALAM'S WORK ELSEWHERE COMES FIRST (2 Oct 2026, Mehdi: "project me
    wtfgos.com ko phle dikhao"). The band moved, its label did not soften: the
    eyebrow is "Experience" (the heading FACTS.md's attribution rule allows for
    employer work), the heading says it was built for someone else, and the card
    names the employer before the product and says it is not an Ideovent client
    project. The Work menu (src/components/layout/navPanels.ts, PROJECT_BANDS)
    lists the bands in the same order under the same names.
  */
  {
    key: "employer work",
    eyebrow: "Experience",
    title: "Built by Mehdi Alam, ",
    accent: "for someone else",
    pad: "pt-14 pb-10 md:pt-20 md:pb-14",
    intro:
      // 2 Oct 2026: was "Before and alongside Ideovent". Ideovent dates from 2019
      // and his employment from 2024 (FACTS.md), so it ran alongside, not after.
      "Alongside Ideovent, Mehdi Alam has also worked as a full-stack developer for other companies. That work belongs to those companies, not to us, and it is listed here with them named. It is not client work and we are not selling it.",
  },
  {
    key: "web",
    eyebrow: "Client projects",
    title: "Work we were ",
    accent: "paid to build",
    serif: true,
    pad: "pt-14 pb-16 md:pt-20 md:pb-24",
    intro:
      "Live work, linked. Each one has a case study behind it that says what was built, what was decided and what we can honestly claim, including the parts that are not finished.",
  },
  {
    key: "product",
    eyebrow: "Our own products",
    title: "Things we built for ",
    accent: "ourselves",
    pad: "pt-10 pb-12 md:pt-14 md:pb-16",
    intro:
      "Every agency says it builds software. These are the ones we built without a client paying us to, which is a different kind of evidence.",
  },
];

function ProjectCard({
  project: p,
  slot = "card",
}: {
  project: Project;
  /**
   * "showcase" is the wide two-up tile the client band leads with. It is only
   * ever given to a project that has a real screenshot, because the whole point
   * of the wider tile is that there is something worth looking at in it.
   */
  slot?: "card" | "showcase";
}) {
  const isEmployerWork = p.category.toLowerCase() === "employer work";
  // NOTHING SITS ON THE COVER. It used to carry the live address as a pill in
  // one corner and the arrow in the other, but ProjectCover already frames a
  // screenshot in a browser bar that prints the same address, so the card said
  // it twice, and the two badges sat on top of the screenshot's own navbar,
  // which is the part of a site a prospect recognises first. The arrow now
  // sits beside the title, where the card's words are.

  return (
    <Link
      to={`/work/${p.slug}`}
      className="group block h-full overflow-hidden rounded-3xl border border-border bg-card/60 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <ProjectCover
          src={p.coverImage}
          title={p.title}
          slot={slot}
          noImageReason={p.noImageReason}
          attribution={employerCredit(p)}
          className="group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* The scrim only goes over a real screenshot. The no-image panel is a
            designed surface and does not want a gradient washed across it. */}
        {p.coverImage && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
)}
      </div>

      <div className={cn("p-6", slot === "showcase" && "md:p-7")}>
        {p.sector && (
          <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
            {p.sector}
          </p>
)}
        <div className={cn("flex items-start justify-between gap-4", p.sector && "mt-2")}>
          <h3
            className={cn(
              "min-w-0 font-display font-semibold",
              slot === "showcase" ? "text-xl md:text-2xl": "text-xl"
)}
          >
            {p.title}
          </h3>
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transition-none"
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        {/* Employer work is our founder's professional work for another company,
            not an Ideovent client project. The attribution is printed unclamped
            so it can never be truncated away from the card it belongs to. */}
        {isEmployerWork && p.clientName && (
          <p className="mt-2 text-xs font-medium text-primary">{p.clientName}</p>
)}

        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>

        {/* One concrete thing to go and look at. Never a claim: a prospect can
            open the URL and check it in about fifteen seconds. */}
        {p.tryThis && (
          <p className="mt-3 line-clamp-3 text-sm text-foreground/75">
            <span className="font-medium text-primary">Try this: </span>
            {p.tryThis}
          </p>
)}

        {/* Why there is no picture is printed inside the cover itself, by
            ProjectCover, so it cannot be separated from the card it explains. */}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.technologies.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {t}
            </span>
))}
          {p.technologies.length > 4 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              +{p.technologies.length - 4}
            </span>
)}
        </div>
      </div>
    </Link>
);
}

/**
 * The lead client project: a 60/40 row, and the page's one break in the grid.
 *
 * The figure is the 60. That is the whole reason this row exists: at 1184px of
 * container a screenshot in this slot is about 700px wide against 380px in a
 * half-width tile, which is the difference between recognising a page and
 * seeing that one exists. The text column holds the same true things every
 * other card on this page holds, and no more: the sector, the title, the live
 * address as an anchor a visitor can open in another tab without leaving, the
 * summary, the one checkable thing, and the stack.
 *
 * The address is a sibling <a>, not nested inside a card-wide <Link>: an anchor
 * inside an anchor is invalid and the browser silently picks one of them.
 */
function LeadProjectRow({ project: p }: { project: Project }) {
  const address = p.liveUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
      <Link
        to={`/work/${p.slug}`}
        aria-label={`${p.title}, read the case study`}
        className="group relative block overflow-hidden rounded-3xl border border-border
                   transition-colors duration-200 hover:border-foreground/25"
      >
        <div className="relative aspect-[16/10]">
          <ProjectCover
            src={p.coverImage}
            title={p.title}
            slot="showcase"
            noImageReason={p.noImageReason}
            attribution={employerCredit(p)}
            className="group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
      </Link>

      <div>
        {p.sector && (
          <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">{p.sector}</p>
        )}
        <h3 className="mt-3 font-display text-2xl font-semibold leading-tight md:text-3xl">{p.title}</h3>

        {address && p.liveUrl && (
          <a
            href={p.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/50
                       px-4 font-mono text-xs text-foreground transition-colors duration-200
                       hover:border-primary/60 hover:bg-muted active:bg-muted/70"
          >
            {address}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </a>
        )}

        <p className="mt-5 text-sm text-muted-foreground text-pretty sm:text-base">{p.summary}</p>

        {p.tryThis && (
          <p className="mt-5 border-l-2 border-secondary/70 pl-4 text-sm text-foreground/80 text-pretty">
            <span className="font-medium text-foreground">Try this. </span>
            {p.tryThis}
          </p>
        )}

        {p.technologies?.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {p.technologies.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}

        <Link
          to={`/work/${p.slug}`}
          className="group mt-7 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm
                     font-medium text-primary-foreground transition-[color,background-color,transform] duration-200 hover:bg-primary/90 active:bg-primary/80 active:scale-[0.99] motion-reduce:active:scale-100"
        >
          Read the case study
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/* The employer-work card lives in src/components/ui/employer-work-card.tsx since
   2 Oct 2026: the home page's work section shows it too, first, with the same
   label. It is still the practical fix for a band that holds one item: a single
   tile in a three-column grid leaves two thirds of the row empty, which reads as a
   section that failed to load; a horizontal card fills the width it is given and
   gets the attribution more room, not less. */

export default function Work() {
  const projects = useCollection("projects");

  const bands = useMemo(() => {
    /**
     * A band splits into a lead row of projects with a real screenshot and a
     * second row of text-led ones only when it is big enough for the split to
     * buy anything. Seven client projects in a three-column grid leave two dead
     * cells in the last row; four wide tiles plus a row of three do not, and
     * the wide tile is where the new screenshots actually earn their place.
     */
    const withLayout = (key: string, items: Project[]) => {
      const imaged = items.filter((p) => Boolean(p.coverImage));
      const textLed = items.filter((p) => !p.coverImage);
      const split = items.length >= 5 && imaged.length > 0 && textLed.length > 0;
      const base = split
        ? { key, items, showcase: imaged, textLed, split: true }
: { key, items, showcase: items, textLed: [] as Project[], split: false };

      /**
       * The lead is the first project in the CLIENT band that has a real
       * screenshot, and it is the only one on the page that gets the 60/40
       * row. The rest of that band, and every other band, keeps the even grid.
       *
       * Guarded on `coverImage` for the same reason the home page's bleed is:
       * the whole argument for a wider slot is that there is something worth
       * looking at in it, and a wide empty navy panel is worse than a small
       * one. Guarded on `key` because one asymmetry per page means one, and
       * giving each of the three bands a lead row would be three.
       */
      const lead = key === "web" ? base.showcase.find((p) => Boolean(p.coverImage)) : undefined;
      return lead
        ? { ...base, lead, showcase: base.showcase.filter((p) => p.id !== lead.id) }
: { ...base, lead: undefined as Project | undefined };
    };

    const known = new Set(BANDS.map((b) => b.key));
    const grouped = BANDS.map((band) => ({
...band,
...withLayout(band.key, projects.filter((p) => p.category.toLowerCase() === band.key)),
    })).filter((b) => b.items.length > 0);

    // Anything with a category we have not given a band keeps a home rather
    // than silently disappearing from the portfolio.
    const orphans = projects.filter((p) => !known.has(p.category.toLowerCase()));
    if (orphans.length) {
      grouped.push({
        eyebrow: "More",
        title: "Other ",
        accent: "work",
        pad: "pt-8 pb-10 md:pt-10 md:pb-14",
        intro: "",
...withLayout("other", orphans),
      });
    }
    return grouped;
  }, [projects]);

  return (
    <Layout>
      {/* Title, description and card: src/lib/seo/pages.ts (PAGE_SEO["/work"]).
          The work pages get their own generated card: a share of /work
          otherwise previewed with the homepage's sentence, and one project's
          screenshot standing for all of them would misrepresent the page.
          Built by scripts/build_brand_assets.py. */}
      <Seo path="/work" image="/og/ideovent-og-work.png" breadcrumbs={[{ name: "Work", path: "/work" }]} />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-12 md:pt-44 md:pb-16">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        {/*
          FULL-WIDTH HERO, not a 40% column.

          This was `max-w-3xl` around the whole block with both paragraphs at
          max-w-2xl inside it, so at 1440px the text stopped at 672px of a
          1328px container and the right half of the screen was empty.

          There is nothing true to put in a right-hand column here (no metric,
          no logo wall, and the projects themselves are the page below), so the
          text spans instead: the headline runs wide, and the two supporting
          paragraphs sit side by side as two readable measures rather than one
          narrow one. Nothing was added or invented, the same words are used.
        */}
        <div className="container-page relative">
          {/* The h1 in search words where the eyebrow pill was; the display line
              is a paragraph, so the page has one h1. No entrance motion above
              the fold: this hero's fade-in was the page's largest paint arriving
              late on a phone (SEO audit, 1 Oct 2026). */}
          <h1 className="max-w-3xl font-display text-base font-semibold text-primary text-balance md:text-lg">
            {PAGE_SEO["/work"].h1}
          </h1>
          <p className="mt-5 max-w-5xl text-hero font-display font-semibold">
            Open <span className="accent-italic text-gradient">something</span>
          </p>

          <div className="mt-8 grid gap-x-14 gap-y-5 lg:grid-cols-2">
            <p className="text-lg text-foreground/85 text-pretty">
              That is a better test than a logo grid.
            </p>
            <p className="text-base text-muted-foreground text-pretty">
              Almost everything below is live at an address you can put in your browser right now.
              Where a project is an internal tool that sits behind a login, we say so and describe
              it in words instead of showing you a screenshot of somebody else’s staff.
            </p>
          </div>

          <Reveal delay={0.2}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#client-projects"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-[color,background-color,transform] duration-200 hover:bg-primary/90 active:bg-primary/80 active:scale-[0.99] motion-reduce:active:scale-100"
              >
                See the client work
                <ArrowRight className="h-4 w-4" />
              </a>
              <CtaButton
                cta={{ label: "Talk about your project", href: "/contact", variant: "outline" }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The honest block. It is the section that makes the rest of the
             page believable, so it sits immediately under the hero. ────── */}
      <section className="pb-4">
        <div className="container-page">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card/50 p-8 md:p-10">
              <h2 className="font-display text-lg font-semibold">About the names on this page</h2>
              <div className="mt-4 max-w-3xl space-y-4 text-sm text-muted-foreground text-pretty">
                <p>
                  Each project below is named by the product we built and linked to the address it
                  runs at. Where the business that commissioned it is not named, that is because we
                  have not yet asked that client, in writing, for permission to use their name. And
                  we do not publish a client’s name or logo without it.
                </p>
                <p>
                  That is a slower way to build a portfolio. It is also the only version of this
                  page that would survive you ringing one of these clients to check.
                </p>
                <p>
                  If you would like to speak to someone we have worked for, ask us. We will ask
                  them. They may say no, and that is entirely their right.
                </p>
                {/* NO SIGNATURE LINE. This note was signed "Mehdi Alam, Founder,
                    Ideovent Technologies" until 28 Sep 2026, when Mehdi asked
                    for the founder's message to stay and carry nobody's name.
                    It speaks as "we" throughout, so it stands as the firm's. */}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The bands ───────────────────────────────────────────────────── */}
      {bands.length > 0 ? (
        bands.map((band) => (
          <section
            key={band.key}
            id={band.key === "web" ? "client-projects": band.key.replace(/\s+/g, "-")}
            // Not `.section` (py-20/28/32). The band already separates itself
            // with a rule, an eyebrow and a heading, so 128px of padding under
            // the last row on top of that left a hole big enough to read as a
            // section that had failed to load.
            //
            // And not the same padding three times over either: `band.pad`
            // gives the client band the most room, so the page says which of
            // the three it exists for with its spacing rather than only with
            // its wording. (The employer band is first since 2 Oct 2026, at
            // Mehdi's request, with a tight bottom so the client band follows
            // close behind it.)
            className={cn("scroll-mt-28", band.pad)}
          >
            <div className="container-page">
              <Reveal>
                <div
                  className={cn(
                    "border-t pt-10",
                    band.key === "employer work" ? "border-dashed border-border": "border-border"
)}
                >
                  <Eyebrow>{band.eyebrow}</Eyebrow>
                  {/* One band gets the serif; the rest contrast by weight. See
                      the note above BANDS. */}
                  <h2 className="mt-4 font-display text-3xl font-thin-display md:text-4xl">
                    {band.title}
                    {band.serif ? (
                      <span className="accent-italic text-gradient">{band.accent}</span>
): (
                      <span className="font-loud-display">{band.accent}</span>
)}
                  </h2>
                  {band.intro && (
                    <p className="mt-4 max-w-2xl text-muted-foreground text-pretty">{band.intro}</p>
)}
                </div>
              </Reveal>

              {/* A band of five or more splits in two: the projects we can
                  actually show lead, two-up and large, because a real
                  screenshot of a real product is the whole argument this page
                  makes; the ones with no picture follow in their own row with
                  the reason written above them. That ordering is not a ranking
 , it is the difference between a tile that rewards being made
                  bigger and one that does not. Under five items there is
                  nothing to split, so the plain grid stands.

                  There is deliberately no filter UI. Eleven projects across
                  three bands do not need one, and the pills it used to show
                  ("web", "product", "employer work") offered exactly the
                  equivalence between client work and the founder's employment
                  that this page exists to break. */}
              {/* THE PAGE'S ONE DELIBERATE BREAK IN THE GRID.
                  _assets/DESIGN-DIRECTION.md §4 asks for exactly one asymmetry
                  per page, and names a 60/40 split as one of the three ways to
                  do it. It is spent here, on the first client project, because
                  this is the band the page exists for and a screenshot at 60%
                  of 1184px is nearly twice the area of the same screenshot in a
                  half-width tile. Everything below it is the even grid again:
                  §4 also says once, not everywhere, "or it becomes noise". */}
              {band.lead && (
                <Reveal className="mt-10">
                  <LeadProjectRow project={band.lead} />
                </Reveal>
)}

              {band.showcase.length > 0 && (
                <motion.div
                  variants={staggerContainer()}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.05 }}
                  className={cn(
                    band.lead ? "mt-6 md:mt-8": "mt-10",
                    "grid grid-cols-1 gap-6",
                    band.key === "employer work"
                      ? "grid-cols-1"
: /* THREE COLUMNS ONCE A LEAD HAS BEEN TAKEN OUT.
                          The two-up tile was right when the band's imaged
                          projects were all in this grid and there were four of
                          them. Pulling one out for the 60/40 lead row leaves
                          three, and three in a two-column grid is two tiles
                          and a 570px empty cell beside the third, measured at
                          1440. The lead row is where the extra size now goes,
                          so the remainder goes back to three-up. */
                      band.split && !band.lead
                        ? "sm:grid-cols-2"
: "sm:grid-cols-2 lg:grid-cols-3"
)}
                >
                  {band.showcase.map((p) =>
                    band.key === "employer work" ? (
                      <motion.div key={p.id} variants={fadeUp}>
                        <EmployerWorkCard project={p} />
                      </motion.div>
): (
                      <motion.div key={p.id} variants={fadeUp}>
                        <ProjectCard project={p} slot={band.split ? "showcase": "card"} />
                      </motion.div>
)
)}
                </motion.div>
)}

              {band.split && band.textLed.length > 0 && (
                <>
                  <Reveal>
                    <p className="mt-12 max-w-2xl border-l-2 border-primary/50 pl-5 text-sm text-muted-foreground text-pretty">
                      These ones are described rather than shown, and each card says why. A tool
                      behind a login is full of somebody else’s name, pay or phone number, and a
                      site we cannot currently reach is not something to point you at. They are
                      the same paid work as the projects above.
                    </p>
                  </Reveal>
                  <motion.div
                    variants={staggerContainer()}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.05 }}
                    className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {band.textLed.map((p) => (
                      <motion.div key={p.id} variants={fadeUp}>
                        <ProjectCard project={p} />
                      </motion.div>
))}
                  </motion.div>
                </>
)}

              {/* EduFlow belongs to "things we built for ourselves", so it sits
                  inside that band rather than in a block of its own further
                  down the page, where it read as a fourth, unexplained
                  category. It has no card because it has nothing to show: it is
                  in development, there is no demo, and no school is using it.
                  FACTS.md is explicit about all three. */}
              {band.key === "product" && (
                <Reveal className="mt-6">
                  <div className="rounded-[2rem] border border-primary/40 bg-primary/5 p-8 md:p-12">
                    <Eyebrow>EduFlow</Eyebrow>
                    {/* Weight contrast, not the serif: /work spends its two
                        accents on the h1 and the client band heading. The
                        status still carries the emphasis, which is what
                        _assets/FACTS.md asks for, it is just carried by Sora
                        800 rather than by the accent face. */}
                    <h3 className="mt-4 font-display text-2xl font-thin-display md:text-3xl">
                      Our school and coaching management platform,{" "}
                      <span className="font-loud-display">currently in development</span>
                    </h3>
                    <div className="mt-5 max-w-3xl space-y-4 text-muted-foreground text-pretty">
                      <p>
                        Fees, attendance, enquiries, notices and parent communication in one place,
                        built around how Indian schools and coaching institutes already run rather
                        than around how software usually works.
                      </p>
                      <p className="text-foreground/85">
                        It is not finished. No school is using it yet, and there is no public demo.
                        When there is one, it will be linked here.
                      </p>
                      <p>
                        If you would like to be told when it is ready (or to help shape it) write
                        to us. We would rather build it with a few schools than announce it to a
                        hundred.
                      </p>
                    </div>
                    <div className="mt-8">
                      <CtaButton cta={{ label: "Read the EduFlow page", href: "/eduflow" }} />
                    </div>
                  </div>
                </Reveal>
)}
            </div>
          </section>
))
): (
        <EmptyState
          eyebrow="Selected work"
          icon={<FolderSearch className="h-5 w-5" aria-hidden="true" />}
          title={<>Nothing is <span className="accent-italic">published here yet.</span></>}
          body="No count, no placeholder cards. When a client agrees that we may show their project, it appears on this page with its live address."
          action={{ label: "Tell us what you are building", href: "/contact" }}
          links={[{ label: "What we build", to: "/services" }, { label: "Prices", to: "/pricing" }]}
        />
)}

      {/* EduFlow now sits inside the "our own products" band above, where it
          belongs, see the comment there. */}

      {/*
        THERE IS NO TESTIMONIAL SLOT HERE, AND THAT IS THE POINT.

        This page used to close the project bands with a dashed box reading
        "Client quotes will appear here as clients approve them". It was honest,
        and it was still the wrong thing on the page: a dashed outline in the
        shape of missing content tells a prospect that something is missing.
        _assets/DESIGN-DIRECTION.md is explicit that the page has to read as
        complete without testimonials rather than reserve a space for them.

        The sentence it carried is not lost. The honesty block under the hero
        already says that client names are absent because permission has not
        been asked for in writing, and says it as a reason rather than as a
        gap. `testimonials` stays an empty array (_assets/FACTS.md) and the
        <Testimonials /> component on the home page stays mounted and guarded,
        so a real, permissioned quote still has somewhere to appear the day one
        exists.
      */}

      {/*
        ── Closing CTA ──────────────────────────────────────────────────────
        A BAND, NOT A SECOND BOX.

        This was a centred, bordered, Aurora-lit panel with a display heading
        and two buttons in the middle of it. The FOOTER renders a centred,
        bordered, spotlight-lit panel with a display heading and a button on
        every single route, immediately below this one. Two of them stacked is
        the same component twice, and a reader scrolling into the bottom of the
        page met the identical shape twice in a row.

        So this one changes shape rather than changing words again: a gold rule
        and a left-aligned band on the .container-page gutter, the same opening
        every other section on this page uses. The footer keeps the box. The
        page keeps its own two actions, one of which (/pricing) the footer
        does not offer.
      */}
      {/* The bottom is tighter than `.section-loud` would give it. The
          loudness of a closing section belongs to its TOP padding, which is
          what separates it from the section before; its bottom meets the
          footer, and the footer already opens with `.section` padding of its
          own plus a 40px margin. Stacked, that measured 176 + 40 + 128 =
          344px of empty ground between the last button on the page and the
          first word of the footer.

          IT IS WRAPPED IN BRACES BECAUSE IT IS IN JSX. A bare /* ... *\/ in a
          JSX children position is not a comment, it is TEXT: the first version
          of this note shipped as a visible paragraph of source code between
          the last section and the closing band, on three pages. It was caught
          by looking at a screenshot, which is the only way it could have
          been. */}
      <section className="pt-24 pb-16 md:pt-36 md:pb-20 lg:pt-44 lg:pb-24">
        <div className="container-page">
          <Reveal>
            <div className="rule-gold grid gap-6 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
              <div>
                {/* Weight contrast, not a third serif accent: this page's two
                    are the h1 and the client band heading. */}
                <h2 className="text-display font-display font-thin-display">
                  Fifteen minutes, at your office or{" "}
                  <span className="font-loud-display">on a call</span>
                </h2>
                {/* The sentence that used to be here, "we will tell you what
                    we would change, what it would cost and how long it would
                    take, in writing", is the FOOTER CTA's sentence verbatim.
                    This says the thing specific to THIS page instead. */}
                <p className="mt-4 max-w-xl text-muted-foreground text-pretty">
                  Open one of the addresses above first, then bring us the thing on your own site
                  that does the opposite. Fifteen minutes is usually enough to say whether it is a
                  rebuild or a fix.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:justify-end md:pb-2">
                <CtaButton cta={{ label: "Start a project", href: "/contact" }} />
                <CtaButton
                  cta={{ label: "See what it costs", href: "/pricing", variant: "outline" }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
);
}
