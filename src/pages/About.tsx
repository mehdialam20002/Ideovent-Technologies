import { motion } from "framer-motion";
/* Sparkles, Zap, Handshake and ShieldCheck are no longer imported: they were
   the four icons on the deleted VALUES cards. See the note above RECORD. */
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Aurora } from "@/components/ui/aurora";
import { CtaButton } from "@/components/ui/cta-button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { getIcon } from "@/lib/icons";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { cn } from "@/lib/utils";

/*
  THE FOUR "VALUES" CARDS THAT USED TO BE HERE ARE DELETED, NOT RESTYLED.

  They were Craft, Speed, Partnership and Transparency: an icon, a one-word
  title and two lines each. "Every pixel, interaction and line of code is
  considered. We sweat the details so the work feels effortless." "A small,
  focused team means fewer hand-offs and faster shipping, momentum without the
  bloat." "We work alongside you, not just for you. Your goals become ours."
  "Honest timelines, clear pricing and no jargon."

  Three things were wrong with them, and the third is the one that matters.

  1. They are the exact unit _assets/DESIGN-DIRECTION.md names as the tell:
     "Three feature cards with lucide icons and matching two-line descriptions."
  2. "A small, focused team" is a team-size claim, which _assets/FACTS.md
     forbids outright ("Never state a team size as a number", and no seniority
     or headcount claims).
  3. Not one of the four could be checked, contradicted or held to. §5 of the
     brief is "put something real in every card... If there is nothing true to
     put in a card, delete the card: an empty half is better than filler, and
     filler is what a prospect recognises."

  What stands in their place is THE RECORD below: the firm's own facts, each
  one either verifiable from a public register or a thing a client will meet on
  their invoice. Anything unconfirmed is printed as unconfirmed rather than
  quietly dropped, which is the one thing a values card can never do.

  Every row is from _assets/FACTS.md. The GST line in particular is not a
  disclosure to bury: an Indian buyer needs it before they raise a purchase
  order, and it is already on the face of every invoice the firm sends.
*/
const RECORD: { term: string; detail: string }[] = [
  {
    term: "Business type",
    // HIDDEN 27 Sep 2026 (Mehdi): Animesh Raturi removed for now; restore by uncommenting.
    // Original: "... Three partners share it: Mehdi Alam, Abhishek Tiwari and Animesh Raturi.",
    detail:
      "A partnership firm, not a sole proprietorship and not a private limited company. Its two partners are Mehdi Alam and Abhishek Tiwari.",
  },
  {
    term: "Founded",
    // 1 Oct 2026 (Mehdi): founded 2019, "mai apne college se phle se ispe kaam
    // kr rha tha"; the partnership firm dates from 2024 (FACTS.md). Was: "2024,
    // and it has run alongside salaried work rather than instead of it. We are
    // not going to imply a longer history than that."
    detail:
      "2019, when Mehdi Alam started it, before college. It ran alongside his degree, became a partnership firm in 2024, and has run alongside salaried work rather than instead of it.",
  },
  {
    term: "Where",
    // 1 Oct 2026: one payment split everywhere. Was "... in US dollars, on the milestone split set out on the pricing page."
    detail:
      "Saket, New Delhi. Client work across Delhi NCR and the rest of India. The US, UK, UAE and Australia are markets we quote into, in US dollars, on the same terms as in India: 50% to start and 50% at launch.",
  },
  {
    term: "GST",
    detail:
      "Not registered. Invoices are non-GST and say so on their face, so the amount quoted is the amount payable. If your business needs a GST invoice, ask on the first call and you will get a straight answer.",
  },
  {
    term: "Who signs",
    detail:
      "An authorised partner, for the firm. Partners carry unlimited joint liability, which is the part of a partnership nobody advertises and every client is entitled to know.",
  },
  // REMOVED 1 Oct 2026: the "Photographs" row. Mehdi asked for the "No
  // photographs" line to go, and this row said the same thing. Initials
  // avatars stay. Was: { term: "Photographs", detail: "None, on purpose. Two of
  // the faces that used to be on this page were stock photographs of
  // strangers. Initials are honest; a stock photograph of somebody who has
  // never worked here is not." }
];

export default function About() {
  const stats = useCollection("stats");
  const team = useCollection("team").filter((t) => t.visible);
  const milestones = useCollection("milestones");

  return (
    <Layout>
      {/* Title and description: src/lib/seo/pages.ts (PAGE_SEO["/about"]). */}
      <Seo
        /* HIDDEN 27 Sep 2026 (Mehdi): Animesh Raturi removed for now; restore by uncommenting.
           Original: "... founded in 2024, whose partners are Mehdi Alam, Abhishek Tiwari and Animesh Raturi, working from ..."
           (This description moved to src/lib/seo/pages.ts on 1 Oct 2026, two partners.) */
        path="/about"
        breadcrumbs={[{ name: "About", path: "/about" }]}
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        {/*
          NOT CENTRED, AND NOT A STUDIO ADJECTIVE.

          The h1 was "A small studio with big craft" over a centred paragraph
          calling Ideovent "a design-led digital studio" building "for people
          who care about the details". Every noun in that is a claim a reader
          cannot check, and "a small studio" is a headcount claim of the kind
          _assets/FACTS.md rules out.

          What replaces it is the answer to the question somebody actually
          opens an About page with, which is "who am I dealing with": the legal
          form of the firm, the year, the city, and the three people who own
          it. All four are in _assets/FACTS.md and the first is on a public
          register. It is left-aligned on the .container-page gutter, like the
          h1 on /work, rather than centred: a centred hero over a centred
          section over a centred grid is the shape the brief describes as "the
          tell".
        */}
        <div className="container-page relative">
          <Reveal>
            <Eyebrow>About us</Eyebrow>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-hero font-display font-semibold">
              A partnership firm in{" "}
              <span className="accent-italic text-gradient">Saket</span>, New Delhi
            </h1>
          </Reveal>

          <div className="mt-8 grid gap-x-14 gap-y-5 lg:grid-cols-2">
            <Reveal delay={0.1}>
              <p className="text-lg text-foreground/85 text-pretty">
                {/* HIDDEN 27 Sep 2026 (Mehdi): Animesh Raturi removed for now; restore by uncommenting.
                    Original: "Founded in 2024. Owned by three partners, who are named below with what each of them actually does." */}
                {/* 28 Sep 2026 (Mehdi): no founder titles on anybody. Was "The
                    founders are named below with what each of them actually does." */}
                {/* 1 Oct 2026 (Mehdi): founded 2019. Was "Founded in 2024." */}
                Founded in 2019, and a partnership firm since 2024. The people are named
                below with what each of them actually does.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-base text-muted-foreground text-pretty">
                There is no account manager here, no sales team and no reseller arrangement. The
                person who scopes and quotes your project is the person who writes the code, and
                if that stops being true we will say so on this page before you find out any
                other way.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/*
        ── The record ──────────────────────────────────────────────────────
        THE PAGE'S ONE DELIBERATE BREAK IN THE GRID
        (_assets/DESIGN-DIRECTION.md §4, a two-column split at roughly 40/60).

        Everything else on /about is a centred heading over an even grid: four
        team cards, a centre-line timeline, a centred call to action. This is
        the one block that is not, and it is the one carrying the facts, which
        is the right place to spend the asymmetry.

        The left column is a short standing statement. The right column is the
        record itself, as a <dl> of hairline rows rather than as cards: six
        boxes of five-word titles would be the unit this section exists to
        replace. A row that cannot be filled truthfully is printed as
        unconfirmed rather than dropped, see the GST row.
      */}
      <section className="relative overflow-hidden pb-16 pt-16 md:pb-20 md:pt-24">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <Eyebrow>On paper</Eyebrow>
              {/* Weight contrast, not a serif accent: /about spends its two on
                  the h1 and on the team heading. */}
              <h2 className="mt-5 text-display font-display font-thin-display">
                What we are, <span className="font-loud-display">on paper</span>
              </h2>
              {/* 1 Oct 2026: a plain line about what the record holds. It used
                  to describe the four cards that were deleted from here ("Four
                  cards reading Craft, Speed, Partnership and Transparency used
                  to sit here. ..."), which told a visitor about the page's
                  history instead of about us. */}
              <p className="mt-5 text-sm text-muted-foreground text-pretty">
                The facts a client checks before signing: what kind of firm this is, since
                when, where, how tax works on your invoice, and who signs.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <dl className="divide-y divide-border border-t border-border">
              {RECORD.map((row) => (
                <div key={row.term} className="grid gap-1.5 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <dt className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {row.term}
                  </dt>
                  <dd className="text-sm leading-relaxed text-foreground/85 text-pretty">
                    {row.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────── */}
      {stats.length > 0 && (
        <section className="section pt-0">
          <div className="container-page">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 bg-spotlight p-8 md:p-12">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.id} className="text-center">
                      <div className="font-display text-4xl font-semibold text-foreground md:text-5xl">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                    </div>
))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
)}

      {/* ── Team ─────────────────────────────────────────── */}
      {team.length > 0 && (
        // `.section-loud`. The people are what an About page is for, and this
        // was the third of four sections carrying identical padding.
        <section className="section-loud relative overflow-hidden">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="The people"
              /* The second and last serif accent on /about. The first is the
                 h1. Everything between them contrasts by weight.

                 NOT "Four names": _assets/FACTS.md forbids stating a team size
                 as a number, and a heading that counts the cards under it is
                 exactly that, with the added problem that it goes wrong the
                 moment somebody hides a member in /admin. The reader can count
                 the cards, and that count is always right. */
              title={
                <>
                  The names, and{" "}
                  <span className="accent-italic text-gradient">what each does</span>
                </>
              }
              /* 1 Oct 2026 (Mehdi): a straight line instead of "No photographs,
                 by choice: initials instead. Two of the faces that used to be on
                 this page were stock photographs of people who have never
                 worked here." The initials avatars stay. */
              subtitle="The people who build your project. You talk to them directly."
              className="max-w-3xl"
            />

            {/* Four members, four columns at lg. A three-column grid left the
                fourth card stranded alone on its own row. */}
            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {team.map((member) => (
                <motion.article
                  key={member.id}
                  variants={fadeUp}
                  className="group card-surface flex h-full flex-col p-6"
                >
                  {/* Initials on brand navy, never a photograph.
                      Two of the three photos that used to sit here were Unsplash
                      stock images of strangers. Rather than leave one real face
                      among placeholders (which reads as a bug) nobody is
                      pictured. `member.photo` is deliberately not rendered.

                      The card used to open with a 4:3 panel sized for a
                      photograph, which left the disc floating in ~318px of empty
                      surface and read as a failed image load. The disc now sits
                      in the flow of the card, at the head of the text it belongs
                      to, so there is nothing missing to notice. */}
                  <InitialsAvatar
                    name={member.name}
                    className="group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                  />

                  <h3 className="mt-5 font-display text-lg font-semibold">{member.name}</h3>
                  <p className="mt-0.5 text-sm font-medium text-primary">{member.role}</p>
                  {member.bio && (
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {member.bio}
                    </p>
)}
                  {member.socials?.length > 0 && (
                    <div className="mt-5 flex items-center gap-3">
                      {member.socials.map((social) => {
                        const Icon = getIcon(social.icon);
                        return (
                          <a
                            key={social.url}
                            href={social.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={`${member.name} on ${social.platform}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            <Icon className="h-4 w-4" />
                          </a>
);
                      })}
                    </div>
)}
                </motion.article>
))}
            </motion.div>
          </div>
        </section>
)}

      {/* ── Milestones timeline ──────────────────────────── */}
      {milestones.length > 0 && (
        // `.section-tight`. A short timeline does not need the same room as the
        // team above it, and two neighbours with identical padding is the thing
        // _assets/DESIGN-DIRECTION.md lists last.
        <section className="section-tight relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="Since 2019"
              /* Weight contrast. Both serif accents on this page are spent.
                 Deliberately not "three entries": `milestones` is a CMS
                 collection and a count written into a heading is a fact that
                 goes stale the first time somebody adds a row in /admin. */
              title={
                <>
                  What has actually{" "}
                  <span className="font-loud-display">happened so far</span>
                </>
              }
              /* 1 Oct 2026: the journey starts in 2019 (Mehdi). Was "A short
                 list, because the firm is young. We would rather print what
                 can be dated than pad it out." Every entry still has a date
                 on record (see `milestones` in seed.ts). */
              subtitle="Every step with its date, from the start in 2019 to the site you are reading."
              className="max-w-3xl"
            />

            {/* NOT `mx-auto`. The heading above this block starts on the
                .container-page gutter like every other heading on the site,
                and a centred 896px timeline under a left-aligned heading
                started 144px further in than the words introducing it. The
                timeline keeps its own internal symmetry (it is a centre-line
                timeline and has to), it just no longer floats free of the
                column it belongs to. */}
            <div className="relative mt-12 max-w-4xl">
              {/* Center line (desktop) / left line (mobile) */}
              <div
                aria-hidden
                className="absolute top-0 bottom-0 left-4 w-px bg-border md:left-1/2 md:-translate-x-1/2"
              />

              <div className="space-y-10 md:space-y-16">
                {milestones.map((milestone, i) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <Reveal key={milestone.id} amount={0.3}>
                      <div className="relative pl-12 md:grid md:grid-cols-2 md:items-center md:gap-12 md:pl-0">
                        {/* Node dot */}
                        <span
                          aria-hidden
                          className="absolute left-4 top-2 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-primary ring-4 ring-background md:left-1/2 md:top-1/2 md:-translate-y-1/2"
                        />

                        <div
                          className={cn(
                            "md:col-start-1",
                            isLeft
                              ? "md:pr-12 md:text-right"
: "md:col-start-2 md:pl-12 md:text-left"
)}
                        >
                          <div className="card-surface p-6">
                            <span className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                              {milestone.year}
                            </span>
                            <h3 className="mt-2 font-display text-xl font-semibold">
                              {milestone.title}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
);
                })}
              </div>
            </div>
          </div>
        </section>
)}

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          {/* A BAND, NOT A SECOND BOX. The footer's CTA is a bordered,
              spotlight-lit, centred panel with a display heading and it renders
              directly under this one on every route. */}
          <Reveal>
            <div className="rule-gold grid gap-6 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
              <div>
                {/* Weight contrast, not a third serif accent. And not "Let's
                    build something great together", which is the register
                    _assets/DESIGN-DIRECTION.md rules out by name. */}
                <h2 className="text-display font-display font-thin-display">
                  Ask us something{" "}
                  <span className="font-loud-display">specific</span>
                </h2>
                <p className="mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
                  What it would cost, how long it would take, who would do it, or whether we have
                  built the thing you need before. You get an answer to each of those in writing
                  before you commit to anything.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:justify-end md:pb-2">
                <CtaButton cta={{ label: "Start a conversation", href: "/contact" }} />
                <CtaButton cta={{ label: "See our work", href: "/work", variant: "outline" }} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
);
}
