import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowUpRight, CalendarClock, Check, Clock, ExternalLink, Lock, Mail, MapPin,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { usePrintReadyImages } from "@/hooks/use-print-ready-images";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { cn } from "@/lib/utils";
import {
  IDEOVENT_CITY, IDEOVENT_EMAIL, IDEOVENT_PHONE_DISPLAY, IDEOVENT_PHONE_HREF,
  isPitchExpired, pitchPackage, pitchPlace, PITCH_PACKAGES, proofKindLabel,
  type PitchPage, type ProofEntry,
} from "@/lib/pitch";
import {
  BLANKS, COMMITMENTS, EVERY_PROJECT, FALLBACK_INCLUDES, FALLBACK_TIMELINE, HONEST_LIMITS,
  OFFSHORE_TERMS, PAYMENT_STAGES, computeOverlap, internationalEmailHref, internationalProof,
  readerDate, readerLocale, verticalCopy, westernAddressee,
} from "@/lib/pitch/international";
import { unbreakable } from "@/lib/typography";

/**
 * The INTERNATIONAL pitch page.
 *
 * Renders a `PitchPage` whose `market` is "international". The India page owns
 * the other one. Both read the same CMS record, so a record never has to be
 * rewritten to change market, and the admin only ever has one form.
 *
 * WHO OPENS THIS, AND WHAT THEY ARE DECIDING
 * A dentist in Austin, a solicitor in Manchester, an accountant in Dubai, a gym
 * owner in Sydney. On a desktop, from a cold email, at a moment when they were
 * doing something else. They are not deciding whether to buy a website. They
 * are deciding, in about fifteen seconds, whether an agency in India is a real
 * business. The default reader has already been burned by an offshore agency
 * once, and every sentence on this page is written to somebody who has.
 *
 * WHY THIS IS NOT A TRANSLATION OF THE INDIA PAGE
 * The India page opens on price, because an Indian buyer who cannot find a
 * number assumes it is a number they cannot afford. That reader's objection is
 * cost. This reader's objection is risk, and price is not an answer to risk. So
 * the running order is different: the terms come SECOND, directly under the
 * fold, before the work and long before the money. A reader who does not
 * believe we exist has no use for a price list.
 *
 * THE RULE THE TERMS SECTION IS BUILT ON
 * Reassurance is exactly what the last agency gave them. So there is none:
 * every row is a term from the agreement or a fact from _assets/FACTS.md, and
 * two of them are deliberately against us (work pauses on non-payment, and the
 * agreement is governed by Indian law with jurisdiction in New Delhi). Those
 * two are not an oversight and must not be edited out to make the page read
 * better. They are the reason the other four get believed.
 *
 * WHAT IT WILL NOT DO
 * It will not invent a problem the business may not have (an empty
 * `observedProblems` falls through to a stated gap), print a metric nobody
 * measured, show an Ideovent product as a client's, or name WTFGO without
 * naming Witness The Fitness Pvt. Ltd. in the same sentence. Every one of those
 * is something this reader can check in one tab, and being caught once costs
 * the entire page.
 *
 * ── WHAT THE 25 SEP 2026 CRAFT PASS CHANGED, AND WHY ──────────────────────
 * The India design had already been through this. This file had not, so the two
 * pitch pages looked like they came from two firms. _assets/DESIGN-DIRECTION.md,
 * "The pitch pages specifically", is the brief for both. Six things followed.
 *
 * 1. THE BUSINESS'S NAME IS THE HERO, not a coloured span inside our own
 *    sentence. It read "A website for" at 54px and then the name at the same
 *    54px in --primary, so the first and largest thing an owner in Austin met
 *    was four words of Ideovent boilerplate that would be identical on every
 *    copy of this page. "A website for" is now a 13px kicker and the name is
 *    the display element.
 *
 * 2. ONE SERIF ACCENT ON THE WHOLE PAGE. `.accent-italic` is the restored
 *    Instrument Serif italic and it appeared EIGHT times here: "another
 *    country", "specifically", "not for a brochure", "Open them in another
 *    tab", "and what moves it", "and you can stop after any of them", "not an
 *    account manager", "Even if it is no". One of them, "so we will not
 *    pretend to have", was most of a heading, which the utility's own note in
 *    index.css rules out. Eight accents is not an accent, it is a second body
 *    face. It is now used exactly once, on the business's name, and every
 *    other heading carries its emphasis in WEIGHT: Sora 300 against Sora 800
 *    in the same line, which is what index.html's `wght@300..800` is for.
 *
 * 3. A SPECIFIC OBSERVATION ABOUT THEIR SITE IS ABOVE THE FOLD. The hero used
 *    to hold a five-line paragraph about us, and the one piece of evidence
 *    that a person had looked at THEM was two screens further down. The first
 *    observation is now in the hero with the tool it was measured with, and
 *    section 3 carries the rest instead of repeating it. That paragraph about
 *    us has not been deleted, it has moved to section 2, which is the section
 *    it was actually introducing.
 *
 * 4. NO TWO SECTIONS SHARE A PADDING. Every one was `py-12 sm:py-16 lg:py-20`,
 *    which tells a reader that nothing on the page matters more than anything
 *    else. The ladder is now deliberate and commented at each section.
 *
 *    AND NO SECTION IS SYMMETRIC. `py-*` is gone: every section sets `pt` one
 *    step below its `pb`. _assets/DESIGN-DIRECTION.md lists "equal padding
 *    above and below every single section" among the things that make a page
 *    read as generated, and the first ladder was varied between sections but
 *    symmetric within every one of them, so the page was still a stack of
 *    slabs. Each section opens on a `border-t`: with pt < pb that rule sits
 *    nearer the heading it introduces than the content it just left. The
 *    closing section inverts it (pt-16 pb-12) because nothing follows it.
 *    Do not "tidy" any of these back to `py-*`.
 *
 * 5. NO EYEBROW PILLS AND NO ICON CHIPS. Eight `.eyebrow` pills floating over
 *    eight centred headings, and six terms in cards each with a lucide glyph
 *    in a gold disc, are the two shapes DESIGN-DIRECTION.md names outright.
 *    Section labels are now small caps with a gold hairline running out to the
 *    measure, and the terms are a ruled, numbered list. Neither the content
 *    nor the argument changed; the packaging did.
 *
 * 6. THE PROOF CARDS PRINT THEIR ADDRESS. A link whose text is an invitation
 *    proves nothing until it is clicked, and this page is screenshotted and
 *    forwarded at least as often as it is opened. The hostname in monospace
 *    survives being a picture in somebody's inbox.
 *
 * Deliberately NOT changed: the data model, the slug rules, the reserved route
 * check, and the noindex behaviour. Those are load-bearing and were verified
 * elsewhere.
 *
 * DESKTOP FIRST, PHONE CORRECT. The layout is composed for 1440 because that is
 * where it is read, and every section collapses to a single column with a
 * 16px gutter at 375, which is where it is forwarded. The gutter is
 * `.container-page` and nothing here adds its own horizontal padding.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Gold, in both themes.

   #C8A951 measures 2.27:1 on the light ground, so the light theme takes its
   gold from --secondary (gold-700 #8C6F22, 4.55:1) wherever gold has to be
   seen rather than merely sensed. Written once here, as on the India design,
   so the two halves cannot drift apart across thirty call sites and so nobody
   "simplifies" it back to one value and quietly fails the light theme.
   ──────────────────────────────────────────────────────────────────────── */
const GOLD_TEXT = "text-[hsl(var(--secondary))] dark:text-[hsl(var(--brand-gold))]";
const GOLD_BORDER = "border-[hsl(var(--secondary))] dark:border-[hsl(var(--brand-gold))]";
const GOLD_BG = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--brand-gold))]";

/* ────────────────────────────────────────────────────────────────────────────
   The people.

   Names and roles are IDENTICAL to the India page and to /about, and come from
   the corrections section of _assets/FACTS.md (27 Sep 2026: Animesh Raturi
   hidden; 28 Sep 2026: no Founder / Co-Founder title on anybody, Mehdi Alam
   is Software Developer, Abhishek Tiwari is Product Manager, Saif Ali (new)
   is Senior App Developer). Saif and Abhilasha Kumari (Developer) are not
   partners. The one-line descriptions differ
   because the India page describes each person's job in terms of parents and
   admissions, which means nothing here.

   Initials, never photographs. And no headcount, stated or implied: there is no
   "and the rest of the team" line and there is no number anywhere.
   ──────────────────────────────────────────────────────────────────────── */

const TEAM = [
  {
    name: "Mehdi Alam",
    role: "Software Developer",
    line: "The person on your call and the person writing the code. He owns the scope, the estimate and the build, and he answers the email.",
  },
  {
    name: "Abhishek Tiwari",
    role: "Product Manager",
    line: "Holds the statement of work, the acceptance criteria and the written change note, so what was agreed in week one is what ships in week five.",
  },
  // HIDDEN 27 Sep 2026 (Mehdi): Animesh Raturi removed for now; restore by uncommenting.
  // {
  //   name: "Animesh Raturi",
  //   role: "Co-Founder & Marketing Lead",
  //   line: "Runs how a finished site gets found: your search presence, your listings, and the pages that answer what people actually type.",
  // },
  // Added 28 Sep 2026 (Mehdi). A team member, not a partner. His line is the
  // description Mehdi asked for on 1 Oct 2026, the same as on /about: what the
  // role does, and nothing about experience, skills or a start date, which
  // are still not on record.
  { name: "Saif Ali", role: "Senior App Developer", line: "Builds the apps in our client projects, from the first screen to the release." },
  {
    name: "Abhilasha Kumari",
    role: "Developer",
    line: "Builds the front end. The pages your customers touch, on the devices they touch them on.",
  },
];

/**
 * Small counts as words.
 *
 * The proof heading says how many addresses are below it, and it has to keep
 * telling the truth if a project is added, removed, or drops off because its
 * slug stopped resolving. A heading that says "Five" over four cards is a
 * careless page, and this page is asking to be trusted on detail.
 */
const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const countWord = (n: number) => COUNT_WORDS[n] || String(n);

/* ────────────────────────────────────────────────────────────────────────────
   Small pieces
   ──────────────────────────────────────────────────────────────────────── */

/**
 * The display size for the business's own name.
 *
 * NOT ONE CLAMP, for the same reason the India design does not use one. A
 * single `clamp(2.5rem, 7vw, 5.5rem)` is right for "Example Advisory" and
 * wrong for "Hartley, Pemberton & Associates Chartered Accountants", which at
 * 88px runs to five lines and pushes the owner's name, the observation and the
 * call to action off a phone screen entirely. The hero exists to fit in the
 * first few seconds, so the size answers to the name rather than the name
 * surviving the size.
 *
 * Three steps, measured at 375px with Instrument Serif italic, which averages
 * about 0.42em per character: up to 22 characters fits two lines at the top
 * size, up to 34 fits two at the middle one, and anything longer takes the
 * smallest, where even a 60-character name stays inside three lines.
 *
 * `leading` tightens as the size grows, because 0.95 on a 40px line clips
 * nothing and 1.05 on a 90px line looks like a gap.
 */
function nameScale(name: string): string {
  const n = (name || "").trim().length;
  if (n > 34) return "text-[clamp(1.75rem,5.2vw,3.1rem)] leading-[1.04]";
  if (n > 22) return "text-[clamp(2.1rem,6vw,4.1rem)] leading-[1.0]";
  return "text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.96]";
}

/**
 * A section label: small caps, a gold hairline running out to the measure.
 *
 * This replaces `.eyebrow`, which is a rounded pill, and there were eight of
 * them on this page. A pill is the marketing site's device; eight chips
 * floating above eight centred headings is the shape of a generated page. A
 * rule that runs to the edge of the measure is what a printed proposal does,
 * and it also does something a pill cannot: it draws the eye along the line
 * rather than parking it in a badge.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-4 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      <span className="shrink-0">{children}</span>
      <span aria-hidden className={cn("h-px flex-1 opacity-50", GOLD_BG)} />
    </p>
  );
}

/** The emphasised word inside a section heading. Weight, never the serif. */
function Loud({ children }: { children: React.ReactNode }) {
  return <span className="font-extrabold">{children}</span>;
}

/**
 * A section heading.
 *
 * Sora 300 at heading size, with the emphasis carried by a single 800 word
 * rather than by the serif. That 300-against-800 jump inside one line is
 * _assets/DESIGN-DIRECTION.md move 3, and it is what lets this page keep its
 * one serif accent for the business's name.
 *
 * `align` defaults to LEFT, and that is a change: every heading on this page
 * used to be centred, which is the single most reliable tell of a generated
 * layout. Two sections are centred now, the price and the close, and they are
 * centred because they are the two moments the page stops arguing and asks for
 * something.
 */
function SectionHead({
  label,
  title,
  sub,
  align = "left",
}: {
  label: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className={cn("mt-5", align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-3xl")}>
        <h2 className="font-display text-[1.55rem] font-light leading-[1.14] tracking-[-0.02em] sm:text-[1.95rem] lg:text-[2.35rem]">
          {title}
        </h2>
        {sub && (
          <p className={cn("mt-4 text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base", align === "left" && "max-w-2xl")}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The visible blank.
 *
 * _assets/FACTS.md rule 4: an unknown value is a token on the page, never a
 * guess. Rendering it loudly is the point. Whoever is about to paste this link
 * into an email sees the gap first, which is the only moment at which it can
 * still be fixed.
 *
 * It used to render in the hero as a dashed pill the size of a button, sitting
 * where the second call to action would be. That is the most common state of a
 * record, so the most common version of this page opened with a QA token where
 * a control should be. It is now a line of small text under the buttons: still
 * unmistakable to Mehdi, no longer a fake control in the reader's first four
 * seconds.
 */
function Blank({ token, children }: { token: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <code className="rounded-md border border-[hsl(var(--brand-gold)/0.5)] bg-[hsl(var(--brand-gold)/0.12)] px-2 py-0.5 font-mono text-[0.78rem] text-foreground">
        {token}
      </code>
      <span className="text-xs text-muted-foreground">{children}</span>
    </span>
  );
}

/**
 * The two ways to start, in the order this reader uses them.
 *
 * Email is primary and is the gold button. A US or UK owner reading a cold page
 * at 11pm does not phone India, and a calendar link they have not agreed to yet
 * is a commitment before a conversation. The mailto arrives with the subject
 * line already naming who it is from, so the reply is one keystroke from being
 * useful.
 *
 * The booking link is second when it exists, and the page never renders a
 * button that goes nowhere: a dead control is the single fastest way to confirm
 * this reader's existing suspicion. When it is unset, `showBlank` prints the
 * token instead, quietly, under the buttons. The close section passes false,
 * because the same blank twice on one page is noise rather than a warning.
 */
function CtaRow({
  page,
  className,
  showBlank = false,
}: {
  page: PitchPage;
  className?: string;
  showBlank?: boolean;
}) {
  const booking = (page.bookingUrl || "").trim();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={internationalEmailHref(page)}
          className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-[hsl(var(--brand-gold))]
                     px-6 py-3 font-display text-[0.95rem] font-semibold text-[hsl(var(--brand-navy))]
                     transition-[color,background-color,transform] duration-200 hover:brightness-95 active:brightness-90 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2
                     focus-visible:ring-offset-background"
        >
          <Mail className="h-5 w-5 shrink-0" aria-hidden />
          Email Mehdi directly
        </a>

        {booking && (
          <a
            href={booking}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full border border-border
                       bg-card/70 px-6 py-3 font-display text-[0.95rem] font-semibold text-foreground
                       transition-colors duration-200 hover:bg-accent motion-reduce:transition-none
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <CalendarClock className="h-5 w-5 shrink-0" aria-hidden />
            Book a 20 minute call
          </a>
        )}
      </div>

      {!booking && showBlank && (
        <p>
          <Blank token={BLANKS.booking}>Booking link not set on this record yet.</Blank>
        </p>
      )}
    </div>
  );
}

/** The address a proof link actually points at, without the scheme. */
function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/**
 * One piece of real work. Never shows a product of ours as a client's.
 *
 * THE ADDRESS IS PRINTED, not hidden behind "open it". A reader who has been
 * burned by an offshore agency is being asked to believe that these builds
 * exist; a link whose text is an invitation proves nothing until it is clicked,
 * and this page is screenshotted and forwarded at least as often as it is
 * opened. The hostname in monospace is the evidence, and it survives being a
 * picture in somebody's inbox.
 *
 * It is `print:hidden` for one reason: the print rule in index.css appends
 * `(href)` after every external link, so on paper the address is already there,
 * and leaving both in prints the same URL twice.
 */
function ProofCard({ entry, featured = false }: { entry: ProofEntry; featured?: boolean }) {
  return (
    <article className={cn("card-surface flex flex-col overflow-hidden", featured && "lg:col-span-2")}>
      {entry.image ? (
        <img
          src={entry.image.src}
          alt={entry.image.alt}
          width={entry.image.width}
          height={entry.image.height}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full border-b border-border object-cover object-top",
            /* The featured card is twice as wide at lg, so at 8:5 it would be
               twice as tall and drag the whole first row down with it. A
               letterbox crop keeps the row a sane height and shows more of the
               page above the fold of the screenshot, which is the part worth
               seeing. */
            featured ? "aspect-[8/5] lg:aspect-[16/7]" : "aspect-[8/5]",
          )}
        />
      ) : (
        <div className="brand-navy-surface brand-navy-etch relative flex aspect-[8/5] w-full items-center justify-center border-b border-border px-6 text-center">
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">{entry.name}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-base font-semibold tracking-tight sm:text-lg">{entry.name}</h3>
          {/* Names what the thing IS. "Not a client project" alone is true of
              both Aura Orbit and WTFGO and tells the reader nothing about the
              difference, and the difference is the whole reason the label is
              here: one is ours, one is a partner's employer work. The rule now
              lives in proofKindLabel so the India card cannot answer it
              differently. */}
          <span className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {proofKindLabel(entry)}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{entry.what}</p>
        <p className="text-sm leading-relaxed text-foreground/90">{entry.relevance}</p>

        <div className="mt-auto pt-2">
          {entry.linkState === "live" && entry.url ? (
            <>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm font-semibold
                           text-primary underline-offset-4 hover:underline focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                           focus-visible:ring-offset-background"
              >
                Open it now
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
              <p className="break-all font-mono text-[0.72rem] leading-relaxed text-muted-foreground print:hidden">
                {hostOf(entry.url)}
              </p>
            </>
          ) : (
            <p className="flex gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              {entry.linkState === "behind-login" ? (
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <span>{entry.linkNote}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The page
   ──────────────────────────────────────────────────────────────────────── */

export default function PitchInternational({ page }: { page: PitchPage }) {
  usePrintReadyImages();

  const place = pitchPlace(page);
  const addressed = westernAddressee(page);
  const pkg = pitchPackage(page);
  const vertical = verticalCopy(page);
  const proof = internationalProof();
  const { timezone, locale } = readerLocale(page);
  const overlap = timezone ? computeOverlap(timezone, locale) : null;
  const preparedOn = readerDate(page.preparedOn, locale);
  const validUntil = readerDate(page.validUntil, locale);
  const expired = isPitchExpired(page);
  const problems = page.observedProblems || [];
  const scope = page.proposedScope || [];
  const includes = (pkg?.includes?.length ? pkg.includes : FALLBACK_INCLUDES[pkg?.id || ""]) || [];
  const timeline = pkg?.timeline || FALLBACK_TIMELINE[pkg?.id || ""] || "";
  const site = (page.currentWebsite || "").trim();
  const siteLabel = site.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  // Read off the canonical table rather than typed into the paragraph below.
  // A price written by hand here is a price that survives the next time
  // FACTS.md moves, which is exactly what PITCH_PACKAGES exists to prevent.
  const carePlan = PITCH_PACKAGES.find((p) => p.id === "intl-care");

  /* THE HERO TAKES THE FIRST OBSERVATION AND SECTION 3 TAKES THE REST.
     Not a copy of it. An owner who meets the same sentence twice in two screens
     is reading a page that was assembled, and the second appearance is the one
     that tells them so. With exactly one observation the hero carries it and
     section 3 does not render at all, which is shorter and correct rather than
     padded out to look full. With none, the hero states the gap and section 3
     still does not render, because the gap has already been stated once and
     saying it twice is the thing this page is arguing it does not do. */
  const leadProblem = problems[0] ?? null;
  const restProblems = problems.slice(1);

  /* The featured proof card is the first entry that actually has a screenshot,
     not simply the first entry. With five entries and one of them spanning two
     columns the lg grid fills exactly two rows of three, with no empty cell. */
  const featuredSlug = proof.find((e) => e.image && e.linkState === "live")?.slug;

  return (
    /* pb-24 on a phone clears the sticky bar, which is fixed and would otherwise
       cover the last section. Removed from sm up, where the bar is not rendered. */
    <div className="pitch-doc relative flex min-h-screen flex-col bg-background pb-24 sm:pb-0">
      <Seo
        /* NOINDEX IS NOT OPTIONAL. This page names a real business and a real
           person and quotes them a price. It is sent to them; it is not
           published. Pitch.tsx sets the same flag again underneath, on purpose. */
        noindex
        title={`A website for ${page.instituteName}`}
        description={`A proposal prepared by Ideovent Technologies for ${page.instituteName}${place ? `, ${place}` : ""}.`}
        path={`/${page.slug}`}
      />

      <a
        href="#pitch-main"
        className="sr-only z-[100] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-full
                   focus:border focus:border-primary focus:bg-background focus:px-5 focus:py-3
                   focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* ── Sample warning. A demo record can never be mistaken for a researched
             one, and can never be sent to anybody by accident. ─────────────── */}
      {page.isExample && (
        <div className="border-b border-[hsl(var(--brand-gold)/0.45)] bg-[hsl(var(--brand-gold)/0.12)]">
          <div className="container-page flex gap-2.5 py-2.5">
            <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", GOLD_TEXT)} aria-hidden />
            <p className="text-xs leading-relaxed text-foreground sm:text-sm">
              <strong className="font-semibold">Example page.</strong> The business, the city, the owner and
              the observations below are placeholders for checking the layout. Do not send this to anybody.
            </p>
          </div>
        </div>
      )}

      {/* The expired notice used to be a second full-width banner here, above
          the brand bar. Two stacked banners is 120px of the first screen spent
          before the reader has met their own name, and the notice is about the
          PRICE, so it now sits directly under the price in the summary ledger
          where the number it qualifies actually is. */}

      {/* ── Slim brand bar. Same firm, none of the site navigation: this page
             has one job, and a header full of links is a set of exits. ─────── */}
      <header className="border-b border-border/60">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* The mark, not the stacked lockup: this header already sets
                "Ideovent Technologies" as text beside it, and the lockup file
                contains those same two words at four pixels tall. See the note
                in src/components/layout/Navbar.tsx. 20px is 1.6x the cap height
                of the 14px wordmark next to it. */}
            <img
              src={`${import.meta.env.BASE_URL}ideovent-mark.svg`}
              alt=""
              width={199}
              height={149}
              decoding="async"
              /* h-4, and 1px up: same optical correction as the footer lockup,
                 scaled to this 14px wordmark. See the note in Footer.tsx. */
              className="h-4 w-auto -translate-y-px object-contain dark:brightness-0 dark:invert"
            />
            <span className="font-display text-sm font-semibold tracking-tight">Ideovent Technologies</span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline">{IDEOVENT_CITY}, India</span>
        </div>
      </header>

      <main id="pitch-main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/*
          ── 1. THEIR NAME, AND ONE THING WE ACTUALLY FOUND ────────────────
          Everything above the fold serves one idea: that this was made for
          THEM. The name is the largest thing on the page and the only serif on
          it, the place and the owner sit with it, and the first observation is
          here rather than two screens down.

          NO ANIMATION, NO REVEAL, NO PRELOADER on this section. The only
          decoration is a static radial wash, and it is aria-hidden and dropped
          in print.
        */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[26rem]
                       bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--brand-gold)/0.13),transparent_70%)]"
          />
          {/* The hero's own padding. Short at the top, because the first line
              should be near the brand bar, and deeper at the bottom so the
              section below reads as a separate movement. */}
          <div className="container-page relative pb-12 pt-6 sm:pb-16 sm:pt-10 lg:pb-24 lg:pt-14">
            {/*
              THE GRID BREAK. One column on a phone, and 60/40 from lg, with
              the summary ledger in the narrow half. The phone order is
              unchanged: name, then the finding, then how to reach us.
            */}
            <div className="lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
              <div className="max-w-3xl">
                {/* The kicker is 13px and the name is up to 88px. That ratio is
                    the whole point: four words of our boilerplate must not be
                    the first thing a reader meets at the same size as their own
                    name. */}
                <h1>
                  <span className="block font-display text-[0.72rem] font-light uppercase tracking-[0.3em] text-muted-foreground sm:text-[0.78rem]">
                    A website for
                  </span>
                  {/*
                    THE ONE SERIF ON THE PAGE. `.accent-italic` is Instrument
                    Serif italic in --primary: navy #123068 at 12.18:1 on the
                    light ground, gold #C8A951 at 7.77:1 on the navy one, and
                    navy again in print because .pitch-doc remaps the token.
                    Do not add a second one anywhere below.
                  */}
                  <span className={cn("mt-2 block tracking-[-0.015em]", nameScale(page.instituteName))}>
                    <span className="accent-italic">{page.instituteName}</span>
                  </span>
                </h1>

                <div aria-hidden className={cn("mt-6 h-px w-16 opacity-70", GOLD_BG)} />

                {addressed && (
                  <p className="mt-6 font-display text-base font-medium text-foreground sm:text-lg">
                    For the attention of {addressed}
                  </p>
                )}

                {/* mt-3 hangs this off the owner's name. With no owner on the
                    record, and that is the common case, it would instead hang
                    12px off the gold rule and read as a line that fell short
                    rather than one that was placed. mt-6 there matches the gap
                    the owner's name would have taken. */}
                <p
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
                    addressed ? "mt-3" : "mt-6",
                  )}
                >
                  {place && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {place}
                    </span>
                  )}
                  {place && preparedOn && <span aria-hidden className="h-3 w-px bg-border" />}
                  {/* ", India" is deliberately NOT repeated here. The brand bar
                      above and the footer below both carry it, and at 375px the
                      extra seven characters pushed this line from two rows to
                      three, which costs the observation below it a row of the
                      first screen. */}
                  {preparedOn && <span>Prepared {preparedOn}, from {IDEOVENT_CITY}</span>}
                </p>

                {/*
                  ── THE FINDING, ABOVE THE FOLD ──────────────────────────
                  One observation, the first one, with the tool it was taken
                  with. Three states and none of them invents a fault: we
                  looked and found something, we have their address and have
                  not looked yet, and we have no address at all. A guessed
                  fault above the fold proves the page was a blast, which is
                  the one thing it exists to disprove, and this reader can open
                  their own site and disagree with it in four seconds.
                */}
                <figure className={cn("mt-7 border-l-2 pl-4 sm:mt-8 sm:pl-5", GOLD_BORDER)}>
                  {leadProblem ? (
                    <>
                      <figcaption className="text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {site ? "What we found on your site" : "What we found"}
                      </figcaption>
                      <p className="mt-2 font-display text-[1.15rem] font-light leading-[1.25] tracking-[-0.015em] text-foreground sm:text-[1.4rem]">
                        {leadProblem.title}
                      </p>
                      {leadProblem.detail && (
                        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                          {leadProblem.detail}
                        </p>
                      )}
                      {/* The tool and the date travel with the number. A figure
                          on its own is a sales claim.

                          NO ALPHA ON THIS COLOUR. It was text-muted-foreground/80,
                          which measured 4.36:1 on the light ground at 12px and
                          therefore failed AA. --muted-foreground at full strength
                          is 7.24:1 light and 8.34:1 dark. The step down from the
                          detail above is already carried by the size (text-xs
                          against text-sm); it does not need to be bought a second
                          time out of the contrast budget, least of all on the one
                          line that exists to be read and checked. */}
                      {leadProblem.measuredBy && (
                        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                          Checked with: {leadProblem.measuredBy}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <figcaption className="text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {site ? "Before we say anything about your site" : "What we do not have yet"}
                      </figcaption>
                      <p className="mt-2 font-display text-[1.15rem] font-light leading-[1.25] tracking-[-0.015em] text-foreground sm:text-[1.4rem]">
                        {site
                          ? "We have not audited your site yet, and we are not going to invent faults you may not have"
                          : "We have no current site on file for you, and we are not going to guess at one"}
                      </p>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {site ? (
                          <>
                            We have it at{" "}
                            <a
                              href={site}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-medium text-primary underline-offset-4 hover:underline"
                            >
                              {siteLabel}
                            </a>{" "}
                            and nothing measured against it. Ask on the call and we will run it while you
                            watch: load time on a mobile profile, what the page weighs, what a search engine
                            can read, and whether an enquiry actually reaches a person.
                          </>
                        ) : (
                          <>
                            If you have one, send the address and we will run it while you watch on the call:
                            load time on a mobile profile, what the page weighs, what a search engine can
                            read, and whether an enquiry actually reaches a person. If you have not got one,
                            that is a shorter conversation and a cheaper project.
                          </>
                        )}
                      </p>
                    </>
                  )}
                </figure>

                <CtaRow page={page} className="mt-7 sm:mt-8" showBlank />

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  No form, no sales sequence, and nobody will put a call in your calendar. If the answer is
                  no, say so and we will stop.
                </p>
              </div>

              {/*
                AT A GLANCE, AS ONE LEDGER RATHER THAN THREE FLOATING CARDS.
                It was three separate rounded cards, which on a phone read as
                three unrelated widgets stacked under the argument. One bordered
                object with hairline rows reads as the summary block on a
                quotation, which is what it is. Every row keeps a stated value
                when the record is empty, because "quoted after a call" is a
                process and an empty row is a fault.
              */}
              <aside className="mt-10 lg:mt-1">
                <dl className="card-surface divide-y divide-border overflow-hidden">
                  <div className="flex items-baseline justify-between gap-4 p-4 sm:p-5">
                    <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Indicative price
                    </dt>
                    <dd className="text-right font-display text-lg font-semibold tabular-nums leading-tight tracking-tight sm:text-xl">
                      {pkg ? unbreakable(pkg.range) : "Quoted after a call"}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 p-4 sm:p-5">
                    <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Timeline
                    </dt>
                    <dd className="text-right font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                      {timeline || "In the statement of work"}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 p-4 sm:p-5">
                    <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Who builds it
                    </dt>
                    <dd className="text-right font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                      Mehdi Alam
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {pkg
                    ? "In US dollars, indicative until a call, then fixed in writing in the statement of work."
                    : "Nothing is quoted before the scope is known, and no window is given before the scope exists."}
                </p>

                {validUntil && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {expired ? (
                      <>
                        This price was open until {validUntil} and has lapsed. The scope still stands. Email
                        us and we will re-quote it rather than hold you to an old number.
                      </>
                    ) : (
                      <>This price stands until {validUntil}.</>
                    )}
                  </p>
                )}
              </aside>
            </div>
          </div>
        </section>

        {/*
          ── 2. THE OFFSHORE QUESTION, ANSWERED AS TERMS ───────────────────
          SECOND ON THE PAGE, BEFORE THE WORK AND LONG BEFORE THE MONEY, and
          that ordering is the whole design. A reader who does not believe we
          exist has no use for a price list.

          THE GRID BREAK, AGAIN AND DELIBERATELY. The heading and the paragraph
          that used to sit in the hero hold the left third and travel with the
          reader; the terms run down the right two thirds. That paragraph is
          what this section is for, so this is where it belongs, and moving it
          out of the hero is what let the observation move in.

          NO ICON CHIPS. These were six cards, each with a lucide glyph in a
          gold disc, which is the shape DESIGN-DIRECTION.md calls "the universal
          AI-page unit". The content was never the problem. A numbered, ruled
          list is what a term sheet looks like and what a template does not.

          SPACING: the loudest section on the page. It is the argument.
        */}
        <section className="border-t border-border/60 bg-muted/25 pt-12 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
          <div className="container-page">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:items-start lg:gap-16">
              <div className="lg:sticky lg:top-10">
                <SectionLabel>Before anything else</SectionLabel>
                <h2 className="mt-5 font-display text-[1.55rem] font-light leading-[1.14] tracking-[-0.02em] sm:text-[1.95rem] lg:text-[2.35rem]">
                  You are about to send money to <Loud>another country</Loud>
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
                  We are a small software firm in New Delhi. You have never heard of us, and you have
                  probably been let down by an agency like ours before. So the terms are here, in full,
                  before the sales pitch: who you talk to, what you sign, how you pay, what happens if it
                  goes wrong, and the two parts we would rather you did not read.
                </p>
              </div>

              <ol className="mt-8 border-b border-border lg:mt-0">
                {OFFSHORE_TERMS.map((t, i) => (
                  <li key={t.q} className="flex gap-4 border-t border-border py-5 sm:gap-6 sm:py-6">
                    <span aria-hidden className={cn("shrink-0 pt-0.5 font-mono text-xs", GOLD_TEXT)}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-[1.02rem] font-semibold leading-snug tracking-tight sm:text-[1.1rem]">
                        {t.q}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.a}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* ── The time question, computed rather than claimed ───────────
                   Every agency says it works in your timezone. This does the
                   arithmetic from the record's own IANA zone and prints the
                   answer even when the answer is that our published hours and
                   this reader's working day do not meet at all. */}
            {overlap && (
              <div className="card-surface mt-8 overflow-hidden lg:mt-12">
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <div className="bg-card p-5 sm:p-6">
                    <span className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Right now
                    </span>
                    <p className="mt-3 font-display text-lg font-light leading-snug tracking-tight sm:text-xl">
                      {overlap.theirTimeNow} where you are, {overlap.ourTimeNow} in New Delhi
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {page.city || "You"} {page.city ? "is" : "are"} {overlap.theirZoneLabel}, which is{" "}
                      {overlap.diffLabel}. Our published hours, {overlap.ourHoursOurClock} IST, land at{" "}
                      {overlap.ourHoursTheirClock} on your clock.
                    </p>
                  </div>
                  <div className="bg-card p-5 sm:p-6">
                    <span className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      When we would actually talk
                    </span>
                    {overlap.publishedWindow ? (
                      <>
                        <p className="mt-3 font-display text-lg font-light leading-snug tracking-tight sm:text-xl">
                          {overlap.publishedWindow}, your time
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          That is a real overlap inside our published hours, not a promise to be awake.
                          If you need something later, {overlap.eveningWindow} your time is our evening
                          and we take calls in it by arrangement.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 font-display text-lg font-light leading-snug tracking-tight sm:text-xl">
                          {overlap.eveningWindow}, your time
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          Our published hours and your working day do not overlap at all, and we would
                          rather say that than pretend otherwise. Calls with you happen in your morning,
                          which is our evening, and they are booked rather than assumed. Written updates
                          land overnight, so you read them at the start of your day.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!overlap && (
              <div className="card-surface mt-8 flex gap-3 p-5 sm:p-6 lg:mt-12">
                <Clock className={cn("mt-0.5 h-4 w-4 shrink-0", GOLD_TEXT)} aria-hidden />
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold tracking-tight">
                    The working-overlap block is missing from this page
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    It computes when your working day and our published hours actually meet, and it
                    needs a timezone on the record to do it. Neither a timezone nor a country we
                    recognise has been set, so rather than guess, here is the gap.
                  </p>
                  <p className="mt-3">
                    <Blank token={BLANKS.timezone}>
                      Set the timezone on this record in the admin, then reload.
                    </Blank>
                  </p>
                </div>
              </div>
            )}

            {/* ── What we are not ─────────────────────────────────────────── */}
            <div className="mt-8 border-t border-border pt-8 lg:mt-12 lg:pt-10">
              <h3 className="font-display text-base font-semibold tracking-tight sm:text-lg">
                And the things an agency usually leaves out
              </h3>
              <ul className="mt-4 grid gap-3 lg:grid-cols-2 lg:gap-x-10">
                {HONEST_LIMITS.map((l) => (
                  <li key={l} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                    <span aria-hidden className={cn("mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full", GOLD_BG)} />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/*
          ── 3. THE REST OF WHAT WE FOUND ─────────────────────────────────
          Renders only when there is something here the hero has not already
          said. With one observation, or none, this section does not exist and
          the page is shorter, which is the correct outcome rather than a hole
          to fill.

          Every figure carries the tool and the date it was taken with. A number
          without its method is a sales claim, and this reader can open their
          own site and disagree with it in four seconds.

          SPACING: the tightest section on the page, because it belongs to the
          observation in the hero rather than standing on its own.
        */}
        {restProblems.length > 0 && (
          <section className="border-t border-border/60 pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-16">
            <div className="container-page">
              <SectionHead
                label="What we found"
                title={
                  <>
                    And <Loud>{restProblems.length === 1 ? "one more thing" : `${restProblems.length} more`}</Loud>{" "}
                    you can check yourself
                  </>
                }
                sub={
                  site ? (
                    <>
                      We opened{" "}
                      <a
                        href={site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 break-all font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {siteLabel}
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </a>{" "}
                      before writing this. None of it is a comment on your judgement, and if any of it is
                      wrong, tell us and we will take it off the page.
                    </>
                  ) : (
                    "Each of these is something you can check yourself in a minute. None of it is a comment on your judgement, and if any of it is wrong, tell us and we will take it off the page."
                  )
                }
              />
              <ul className="mt-8 grid gap-x-10 sm:mt-10 sm:grid-cols-2">
                {restProblems.map((p, i) => (
                  <li key={p.title} className="flex gap-4 border-t border-border py-5 sm:gap-6 sm:py-6">
                    <span aria-hidden className={cn("shrink-0 pt-0.5 font-mono text-xs", GOLD_TEXT)}>
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-[1.02rem] font-semibold leading-snug tracking-tight sm:text-[1.1rem]">
                        {p.title}
                      </h3>
                      {p.detail && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.detail}</p>
                      )}
                      {/* Full-strength --muted-foreground, not /80. See the hero's
                          copy of this line: the alpha measured 4.36:1 in light. */}
                      {p.measuredBy && (
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          Checked with: {p.measuredBy}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
                We would rather be corrected than be persuasive. Every one of these is fixable, and none of
                them needs you to start again from zero.
              </p>
            </div>
          </section>
        )}

        {/*
          ── 4. WHAT THEY WOULD GET, IN THEIR OWN TRADE'S WORDS ───────────
          Deliverables, checkable on handover day. Never a result: nobody can
          promise a booking, and a promise this reader cannot verify undoes the
          terms section above it.

          SPACING: the widest of the argument sections after the terms. This is
          the longest read on the page and it has to breathe.
        */}
        <section className="border-t border-border/60 bg-muted/25 pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24">
          <div className="container-page">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:items-start lg:gap-16">
              <div className="lg:sticky lg:top-10">
                <SectionLabel>What you would get</SectionLabel>
                <h2 className="mt-5 font-display text-[1.55rem] font-light leading-[1.14] tracking-[-0.02em] sm:text-[1.95rem] lg:text-[2.35rem]">
                  Built for {vertical.article} {vertical.noun}, <Loud>not for a brochure</Loud>
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
                  Every line is something that exists on the site the day it is handed over, and something
                  you can check on the day. It is what {vertical.article} {vertical.noun} needs in order to
                  earn {vertical.goal}. Whether it earns them is your market’s decision, not ours, and we
                  will not put a number on it.
                </p>
              </div>

              <ul className="mt-8 border-b border-border lg:mt-0">
                {vertical.lines.map((l, i) => (
                  <li key={l} className="flex gap-4 border-t border-border py-5 sm:gap-6 sm:py-6">
                    <span aria-hidden className={cn("shrink-0 pt-0.5 font-mono text-xs", GOLD_TEXT)}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="min-w-0 text-sm leading-relaxed">{l}</p>
                  </li>
                ))}
              </ul>
            </div>

            {scope.length > 0 && (
              <div className="mt-10 border-t border-border pt-8 lg:mt-14 lg:pt-10">
                <h3 className="font-display text-base font-semibold tracking-tight sm:text-lg">
                  And specifically for {page.instituteName}
                </h3>
                <ul className="mt-4 grid gap-3 lg:grid-cols-2 lg:gap-x-10">
                  {scope.map((s) => (
                    <li key={s} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", GOLD_TEXT)} aria-hidden />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/*
          ── 5. PROOF THEY CAN OPEN RIGHT NOW ────────────────────────────
          No testimonials, no logos, no counts. Addresses, printed on the card.
          WTFGO carries its employer in the same sentence as its name, which is
          the attribution rule in _assets/FACTS.md and is not negotiable.

          SPACING: between the two beside it, and it carries the page's one
          asymmetric grid.
        */}
        {proof.length > 0 && (
          <section className="border-t border-border/60 pt-12 pb-14 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20">
            <div className="container-page">
              <SectionHead
                label="Proof"
                title={
                  <>
                    {countWord(proof.length)} addresses you can <Loud>open in another tab</Loud>
                  </>
                }
                sub="No testimonials, no client logos, no project count, no satisfaction score. We have never measured any of those, so we do not print them. What we have is work that is live, and you can judge it without asking us anything."
              />

              <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {proof.map((entry) => (
                  <ProofCard key={entry.slug} entry={entry} featured={entry.slug === featuredSlug} />
                ))}
              </div>

              <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Each of those pages also says what it does not claim.{" "}
                <Link to="/work" className="font-medium text-primary underline-offset-4 hover:underline">
                  The rest of the work is here
                </Link>
                .
              </p>
            </div>
          </section>
        )}

        {/*
          ── 6. PRICE ────────────────────────────────────────────────────
          In USD, from the canonical table in _assets/FACTS.md by way of
          PITCH_PACKAGES, never a number typed onto this page. Lowest figure
          first, and indicative said plainly rather than in a footnote a reader
          is expected not to find.

          CENTRED, on purpose, and one of only two sections that are. The page
          stops arguing here and puts a number on the table.
        */}
        <section className="border-t border-border/60 bg-muted/25 pt-10 pb-12 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
          <div className="container-page">
            <SectionHead
              align="center"
              label="Price"
              title={
                <>
                  The number, <Loud>and what moves it</Loud>
                </>
              }
              sub="Indicative until a call, then fixed in writing in the statement of work. The only thing that changes it afterwards is something you ask for that was not in the list, and you hear the price for that before we build it, not on the invoice."
            />

            <div className="mx-auto mt-8 max-w-4xl sm:mt-10">
              <div className="card-surface overflow-hidden">
                <div className="grid gap-px bg-border lg:grid-cols-2">
                  <div className="bg-card p-6 sm:p-8">
                    <p className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Recommended for {page.instituteName}
                    </p>
                    <h3 className="mt-2 font-display text-lg font-light tracking-tight sm:text-xl">
                      {pkg ? pkg.label : "Scoped before it is priced"}
                    </h3>
                    {/* The number is the largest thing in this section, which is
                        the reverse of what a page that is nervous about its own
                        price does. */}
                    <p className="mt-4 font-display text-[2.1rem] font-semibold tabular-nums leading-[1.05] tracking-[-0.03em] text-[hsl(var(--primary))] sm:text-[2.75rem]">
                      {pkg ? unbreakable(pkg.range) : "After a call"}
                    </p>
                    {timeline && (
                      <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {timeline} from the deposit and your content
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Invoiced in US dollars. Ideovent Technologies is not registered under GST in India,
                      so no Indian tax is added and the invoice says so on its face. Any tax due in your
                      own country is yours to handle, and your accountant will know better than we do.
                    </p>
                    {/* Reads correctly with and without a recommended package.
                        "check this figure" over an empty price block is the kind
                        of sentence that tells a careful reader the page was
                        assembled rather than written. */}
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      <Link to="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
                        The full price list is public
                      </Link>
                      {pkg
                        ? ", so you can check this figure against what everybody else is quoted."
                        : ", and the band your project falls into is the band anybody else would be quoted from."}
                    </p>
                  </div>

                  <div className="bg-card p-6 sm:p-8">
                    <h4 className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      What is included
                    </h4>
                    {includes.length > 0 ? (
                      <ul className="mt-4 space-y-3">
                        {includes.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                            <Check className={cn("mt-0.5 h-4 w-4 shrink-0", GOLD_TEXT)} aria-hidden />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                        Listed in full in the statement of work, which you read and sign before anything
                        is built and before any money moves.
                      </p>
                    )}

                    <h4 className="mt-7 text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      And on every project
                    </h4>
                    <ul className="mt-4 space-y-3">
                      {EVERY_PROJECT.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", GOLD_TEXT)} aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* How the money is actually staged. Two payments since 1 Oct
                    2026 (Mehdi): 50% to start, 50% at launch, against the
                    finished build you have already seen. Keyed on `when`: both
                    rows read 50%. */}
                <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
                  {PAYMENT_STAGES.map((s) => (
                    <div key={s.when} className="bg-card p-5 sm:p-6">
                      {/* min-h holds two lines of label, so the two numbers
                          that are meant to be read across stay on one baseline
                          if a label is ever long enough to wrap. */}
                      <span className="block min-h-[2rem] text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {s.when}
                      </span>
                      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-[hsl(var(--primary))]">
                        {s.pct}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.what}</p>
                    </div>
                  ))}
                </div>

                <dl className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                  {COMMITMENTS.map((c) => (
                    <div key={c.label} className="bg-card p-5">
                      <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {c.label}
                      </dt>
                      <dd className="mt-2 text-sm leading-relaxed">{c.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                After the free 30 days of support, a care plan is optional{carePlan ? ` and runs at ${unbreakable(carePlan.range)}` : ""} depending on
                the tier. Nobody is enrolled by default, and the site is yours either way: the source code
                and the IP transfer to you on final payment.
              </p>
            </div>
          </div>
        </section>

        {/*
          ── 7. HOW TO ENGAGE ────────────────────────────────────────────
          THE PARAGRAPH THAT MAKES THIS LOOK LIKE A BUSINESS. Everything above
          it is an argument; this is the mechanism. It is one screen, it names
          the documents, and it prints the booking blank rather than a button
          that goes nowhere.

          SPACING: short. It is a procedure, not an argument.
        */}
        <section className="border-t border-border/60 pt-8 pb-10 sm:pt-12 sm:pb-14 lg:pt-16 lg:pb-20">
          <div className="container-page">
            <SectionHead
              label="How to start"
              title={
                <>
                  Three steps, and you can <Loud>stop after any of them</Loud>
                </>
              }
            />

            <ol className="mt-8 grid gap-x-10 border-b border-border sm:mt-10 lg:grid-cols-3">
              <li className="flex gap-4 border-t border-border py-5 sm:gap-6 sm:py-6">
                <span aria-hidden className={cn("shrink-0 pt-0.5 font-mono text-xs", GOLD_TEXT)}>
                  01
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[1.02rem] font-semibold leading-snug tracking-tight sm:text-[1.1rem]">
                    A 20 minute call
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    With Mehdi, not with a salesperson, because there is not one. Nothing is presented.
                    He asks what the site has to do and tells you whether we are the wrong people for it.
                  </p>
                  <div className="mt-3">
                    {page.bookingUrl ? (
                      <a
                        href={page.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[2.75rem] items-center gap-1.5 break-all text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Pick a time
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </a>
                    ) : (
                      <Blank token={BLANKS.booking}>
                        Fill this on the record in the admin before sending the link.
                      </Blank>
                    )}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 border-t border-border py-5 sm:gap-6 sm:py-6">
                <span aria-hidden className={cn("shrink-0 pt-0.5 font-mono text-xs", GOLD_TEXT)}>
                  02
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[1.02rem] font-semibold leading-snug tracking-tight sm:text-[1.1rem]">
                    A written scope and a fixed price
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    You get a statement of work naming the pages, the features, the dates and the price,
                    and a master services agreement setting the terms once. Read them, send them to your
                    own advisor, and say no if you want to. Nothing has been paid at this point.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 border-t border-border py-5 sm:gap-6 sm:py-6">
                <span aria-hidden className={cn("shrink-0 pt-0.5 font-mono text-xs", GOLD_TEXT)}>
                  03
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[1.02rem] font-semibold leading-snug tracking-tight sm:text-[1.1rem]">
                    The deposit, and then work you can watch
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    50% starts it and books the slot. From that day there is a staging link you can open
                    whenever you like. You are never waiting for a status report to find out what is
                    happening.
                  </p>
                </div>
              </li>
            </ol>

            {/* The one line a serious buyer is looking for. */}
            <div className="mt-8 max-w-3xl">
              <h3 className="font-display text-base font-semibold tracking-tight sm:text-lg">
                The contract position, in one line
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Master services agreement plus a statement of work per project, payments of 50% to start
                and 50% at launch, intellectual property and source code assigned to you on final payment, NDA on
                request, and a governing-law clause that defaults to Indian law and the courts in New
                Delhi while carrying your own jurisdiction as the alternative. Which of the two applies
                is chosen and written down before either of us signs.
              </p>
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                <a
                  href={internationalEmailHref(page)}
                  className="inline-flex min-h-[2.75rem] items-center gap-2 break-all text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden />
                  {IDEOVENT_EMAIL}
                </a>
                <a
                  href={IDEOVENT_PHONE_HREF}
                  className="inline-flex min-h-[2.75rem] items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {unbreakable(IDEOVENT_PHONE_DISPLAY)}
                </a>
                <span className="inline-flex min-h-[2.75rem] items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  {IDEOVENT_CITY}, India
                </span>
              </div>
            </div>
          </div>
        </section>

        {/*
          ── 8. THE PEOPLE ───────────────────────────────────────────────
          This looks decorative and is not. Somebody is deciding whether to wire
          money to strangers on another continent. Names, real roles, initials
          rather than photographs, and no headcount anywhere, stated or implied.

          SPACING: the shortest of the remaining sections.
        */}
        <section className="border-t border-border/60 bg-muted/25 pt-10 pb-12 sm:pt-12 sm:pb-14 lg:pt-14 lg:pb-16">
          <div className="container-page">
            <SectionHead
              label="Who you would be working with"
              title={
                <>
                  The people, <Loud>not an account manager</Loud>
                </>
              }
              /* 1 Oct 2026 (Mehdi): founded 2019; a partnership firm since 2024.
                 Was "... a partnership firm in Saket, New Delhi, founded in 2024. ..." */
              sub="Ideovent Technologies, founded in 2019, is a partnership firm in Saket, New Delhi. You deal with the partners directly, and the person who writes the code is the person who answers your email."
            />
            <ul className="mt-8 grid gap-x-10 border-b border-border sm:mt-10 sm:grid-cols-2">
              {TEAM.map((m) => (
                <li key={m.name} className="flex items-start gap-4 border-t border-border py-5 sm:py-6">
                  <InitialsAvatar name={m.name} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold tracking-tight">{m.name}</h3>
                    <p className="text-sm font-medium text-[hsl(var(--primary))]">{m.role}</p>
                    {m.line && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.line}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Mehdi’s work history and code are public:{" "}
              <a
                href="https://www.linkedin.com/in/mehdi-alam-9411751b7"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                LinkedIn
              </a>{" "}
              and{" "}
              <a
                href="https://github.com/mehdialam20002"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                GitHub
              </a>
              . Check them before the call rather than after it.
            </p>
          </div>
        </section>

        {/*
          ── 9. CLOSE ─────────────────────────────────────────────────────
          The deepest padding on the page, because this is where it stops.
        */}
        <section className="border-t border-border/60 pt-16 pb-12 sm:pt-24 sm:pb-16 lg:pt-32 lg:pb-24">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-[1.55rem] font-light leading-[1.14] tracking-[-0.02em] sm:text-[1.95rem] lg:text-[2.35rem]">
                One reply is enough. <Loud>Even if it is no</Loud>
              </h2>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">
                There is no sequence behind this page and nobody will call you. Reply and you get Mehdi.
                Say no and you get nothing further, which is the other half of the same promise.
              </p>
              <div className="mt-8 flex justify-center">
                <CtaRow page={page} className="w-full items-center sm:w-auto" />
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Ideovent Technologies, a partnership firm. {IDEOVENT_CITY}, India.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="container-page flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Prepared for {page.instituteName}
            {place ? `, ${place}` : ""}, by Ideovent Technologies.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
            <Link to="/work" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Our work
            </Link>
            <Link to="/pricing" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Full price list
            </Link>
            <Link to="/about" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              About us
            </Link>
            <Link to="/terms" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Terms
            </Link>
          </nav>
        </div>
      </footer>

      {/* ── Sticky call to action, phones only ──────────────────────────────
             This page is composed for a desktop, but it gets forwarded, and on
             a phone the last section is a long way from the first button.
             Hidden from sm up and hidden in print. */}
      <div className="pitch-sticky fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur sm:hidden">
        <div className="container-page flex items-center gap-2 py-3">
          <a
            href={internationalEmailHref(page)}
            className="inline-flex min-h-[2.9rem] flex-1 items-center justify-center gap-2 rounded-full
                       bg-[hsl(var(--brand-gold))] px-4 font-display text-sm font-semibold
                       text-[hsl(var(--brand-navy))]"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Email Mehdi
          </a>
          <a
            href="#pitch-main"
            className="inline-flex min-h-[2.9rem] items-center justify-center gap-2 rounded-full border
                       border-border bg-card px-5 font-display text-sm font-semibold text-foreground"
          >
            Top
          </a>
        </div>
      </div>
    </div>
  );
}
