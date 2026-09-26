import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowUpRight, Check, Clock, Lock, Mail, MapPin, MessageCircle, Phone,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { usePrintReadyImages } from "@/hooks/use-print-ready-images";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { cn } from "@/lib/utils";
import type { PitchPage, PitchInstituteType } from "@/lib/cms/types";
import {
  PITCH_PACKAGES, isPitchExpired, pitchAddressee, pitchDate, pitchPackage,
} from "@/lib/pitch/record";
import {
  CODE_OWNERSHIP, GST_POSITION, IDEOVENT_CITY, IDEOVENT_EMAIL, IDEOVENT_PHONE_DISPLAY,
  IDEOVENT_PHONE_HREF, PAYMENT_SPLIT, REVISION_ROUNDS, SUPPORT_WINDOW,
  pitchEmailHref, pitchWhatsappHref,
} from "@/lib/pitch/helpers";
import { defaultProofOrder, proofEntries, proofKindLabel, type ProofEntry } from "@/lib/pitch/proof";
import { unbreakable } from "@/lib/typography";

/**
 * The INDIA pitch page.
 *
 * Renders a `pitchPages` record whose market is "india". The record shape, the
 * price table and the lookup all live in `@/lib/pitch/record`; the
 * international design reads the same record and makes a different argument.
 *
 * WHO OPENS THIS. A school principal or a coaching director, on a mid-range
 * Android phone, from a WhatsApp message, usually on patchy data, usually
 * between two other things. It has about four seconds to be worth reading.
 *
 * ── WHAT THE 25 SEP 2026 REDESIGN CHANGED, AND WHY ────────────────────────
 * _assets/DESIGN-DIRECTION.md, "The pitch pages specifically": the design job
 * here is not the marketing site's. Four things followed from it.
 *
 * 1. THE INSTITUTE'S NAME IS THE HERO, not a coloured span inside our own
 *    sentence. It used to read "A website built for" at 54px and then the
 *    name at the same 54px, so the first and largest thing on the page was
 *    four words of Ideovent boilerplate. Now "A website for" is a 13px kicker
 *    and the name is the display element, set in Instrument Serif italic.
 *    A page that works because it was visibly made for one reader cannot
 *    open with a line that would be identical on every copy.
 *
 * 2. ONE SERIF ACCENT ON THE WHOLE PAGE. `.accent-italic` is the restored
 *    Instrument Serif italic and it appeared EIGHT times here: "right now",
 *    "actually sells", "in another tab", "Koi chhupi hui baat nahi", "not an
 *    account manager", "Baaki hum dekh lenge". Eight accents is not an
 *    accent, it is a second body face. It is now used exactly once, on the
 *    institute's name, and every other heading carries its emphasis in
 *    WEIGHT instead: Sora 300 against Sora 800 in the same line. The weight
 *    range is what index.html's `wght@300..800` was widened for.
 *
 * 3. A SPECIFIC OBSERVATION ABOUT THEIR SITE IS ABOVE THE FOLD. It used to
 *    be two screens down, behind a centred section heading. A principal
 *    deciding in four seconds never reached it, so the page's one piece of
 *    evidence that a person looked at THEM arrived after the decision. The
 *    first observed problem is now in the hero, with the tool it was measured
 *    with, and section 2 carries the REST of them rather than repeating it.
 *
 * 4. NO TWO SECTIONS SHARE A PADDING. Every section was `py-12 sm:py-16
 *    lg:py-20`, which tells a reader that nothing on the page matters more
 *    than anything else. The ladder is now deliberate and is commented at
 *    each section. It is tighter than the marketing site's `.section` scale
 *    throughout, because this is a document somebody reads in one sitting
 *    and not a page they browse.
 *
 *    AND NO SECTION IS SYMMETRIC. `py-*` is gone: every section sets `pt`
 *    one step below its `pb`. _assets/DESIGN-DIRECTION.md lists "equal
 *    padding above and below every single section" among the things that
 *    make a page read as generated, and the first ladder was varied between
 *    sections but symmetric within every one of them, so the page was still
 *    a stack of slabs. Each section opens on a `border-t`: with pt < pb that
 *    rule sits nearer the heading it introduces than the content it just
 *    left, which is what makes it read as a section opening rather than a
 *    divider between two equal blocks. The closing section inverts it
 *    (pt-16 pb-12) because nothing follows it, so its space belongs above.
 *    Do not "tidy" any of these back to `py-*`.
 *
 * Deliberately NOT changed: the data model, the slug rules, the reserved
 * route check, and the noindex behaviour. Those are load-bearing and were
 * verified elsewhere.
 *
 * ── THE RULES THAT SURVIVED THE REDESIGN ───────────────────────────────────
 *   - Built at 375px first and widened from there, not the reverse.
 *   - The price is ON the page. An Indian buyer who cannot find a number
 *     assumes it is a number they cannot afford and closes the tab. Leading
 *     with the low end is the presentation rule in _assets/FACTS.md.
 *   - The call to action is WhatsApp, prefilled, repeated, and pinned to the
 *     bottom of the screen on a phone. A form is a worse call to action here:
 *     it asks a busy person to type on a phone keyboard and then trust that
 *     somebody reads it.
 *   - No new dependency, and no animation of any kind on the hero. Images
 *     carry their own width and height so nothing reflows while the page is
 *     still arriving.
 *
 * EVERY FIELD ON THE RECORD IS OPTIONAL EXCEPT THE NAME, and this page is
 * written for the case where Mehdi has a name and a city and nothing else.
 * Missing director, missing problems, missing package, missing website: each
 * one has its own path through the page, and none of them fills the hole with
 * something invented. A wrong name or a guessed fault above the fold proves
 * the page was a blast, which is the one thing it exists to disprove.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Gold, in both themes.

   #C8A951 measures 2.27:1 on the light ground, so the light theme takes its
   gold from --secondary (gold-700 #8C6F22, 4.55:1) wherever gold has to be
   seen rather than merely sensed. Writing it once here stops the two halves
   drifting apart across thirty call sites, and stops anybody "simplifying" it
   back to one value and quietly failing the light theme.
   ──────────────────────────────────────────────────────────────────────── */
const GOLD_TEXT = "text-[hsl(var(--secondary))] dark:text-[hsl(var(--brand-gold))]";
const GOLD_BORDER = "border-[hsl(var(--secondary))] dark:border-[hsl(var(--brand-gold))]";
const GOLD_BG = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--brand-gold))]";

/* ────────────────────────────────────────────────────────────────────────────
   What they would get.
   Three sets, because the record's instituteType is optional and "school" is
   not a safe default for a coaching institute: a page that talks about annual
   day and sports meet to a JEE coaching director has stopped being about them.

   NO ICONS. These used to render as cards with a lucide glyph in a gold chip,
   a title and two lines, which _assets/DESIGN-DIRECTION.md names as "the
   universal AI-page unit". The content was never the problem; the packaging
   was. They are now a numbered, ruled list, which is what a proposal looks
   like and what a template does not.
   ──────────────────────────────────────────────────────────────────────── */

interface Benefit {
  title: string;
  body: string;
}

const ENQUIRY: Benefit = {
  title: "Enquiries that reach a phone, not an inbox",
  body:
    "Every enquiry lands on WhatsApp and in email the second it is submitted, with the name, class and number already in the message. Whoever replies first usually gets the admission.",
};

const SPEED: Benefit = {
  title: "Opens on a weak connection",
  body:
    "Built and checked on a mid-range Android phone on 4G in a bad spot, because that is where a parent actually is when they look you up.",
};

const NOTICES: Benefit = {
  title: "Notices you post yourself",
  body:
    "A new batch, a holiday, a result, an exam date. You type it and it is live. No developer, no waiting for us, and no bill for a two-line change.",
};

const FEES: Benefit = {
  title: "A fee page a parent trusts",
  body:
    "What it costs, what is included, and how it is paid, in plain language. A parent who cannot find the fee assumes the worst number they can imagine.",
};

const BENEFITS: Record<PitchInstituteType | "unknown", Benefit[]> = {
  coaching: [
    ENQUIRY,
    {
      title: "Courses and batches on a page, not in a PDF",
      body:
        "Timings, syllabus, duration and fee, readable on a phone without a download. Google can read a page. It cannot read a PDF that somebody has to pinch and zoom.",
    },
    {
      title: "Results and toppers, handled properly",
      body:
        "A results section your own staff update every year. A student’s photograph goes up only where you have their consent, and we will ask you for it rather than assume.",
    },
    FEES,
    NOTICES,
    SPEED,
  ],
  school: [
    ENQUIRY,
    {
      title: "An admission page that answers the whole question",
      body:
        "Process, dates, documents needed, and what to do next, in one screen. Most school sites give a parent a phone number and a hope.",
    },
    FEES,
    {
      title: "Galleries that stay fast",
      body:
        "Annual day, sports meet, results, trips. Photographs compressed properly, so a page carrying fifty of them still opens in about two seconds rather than thirty.",
    },
    NOTICES,
    SPEED,
  ],
  unknown: [
    ENQUIRY,
    {
      title: "What you teach, on a page a parent can read",
      body:
        "Classes, courses, timings and faculty, written for a phone screen and readable by Google, rather than locked inside a downloadable file.",
    },
    FEES,
    {
      title: "Photographs that do not slow the page down",
      body:
        "Events, results and the campus itself, compressed properly, so a gallery is something a parent scrolls rather than something they wait for.",
    },
    NOTICES,
    SPEED,
  ],
};

/**
 * The fallback when we have not audited their site, or when they do not have
 * one. It describes the SEASON, not the institute, so it cannot accidentally
 * accuse anybody of anything they have not done.
 */
const ADMISSION_SEASON: Benefit[] = [
  {
    title: "A year of enquiries arrives in about three weeks",
    body:
      "Admission traffic is not spread across the year. A site that is merely adequate in a quiet month is a queue in the one month that pays for the year.",
  },
  {
    title: "Almost everybody arrives on a phone, and not a new one",
    body:
      "The question is not whether the site looks good on the laptop in your office. It is whether it opens on a three-year-old Android on 4G outside your gate.",
  },
  {
    title: "A parent compares three institutes in one sitting",
    body:
      "They open three tabs. The one that answers fees, timings and process without a phone call is the one that gets the phone call.",
  },
  {
    title: "An enquiry that waits a day is usually lost",
    body:
      "Not because the parent changed their mind, but because somebody else answered first. Where the enquiry lands matters as much as whether it was captured at all.",
  },
];

/**
 * The people. Roles exactly as `_assets/FACTS.md` fixes them, after the
 * corrections of 24 Sep 2026: three partners, and Abhilasha Kumari is a
 * Developer and not a partner. No photographs, and no headcount anywhere.
 */
const TEAM = [
  {
    name: "Mehdi Alam",
    role: "Founder & SDE",
    /* No out-of-hours promise here. The response targets Ideovent has actually
       committed to are per care-plan tier (48 hours, 24 hours, same working
       day), and the rate card prices an out-of-hours call-out separately. A
       line about answering at eleven at night reads as a free 24/7 SLA and is
       a promise no document behind this page backs. */
    line: "Writes the code. The person you talk to about scope, timeline and price, and the person who fixes it when something breaks. Not a ticket queue.",
  },
  {
    name: "Abhishek Tiwari",
    role: "Co-Founder & Product Manager",
    line: "Holds the scope and the written change note, so what was agreed in the first meeting is what gets built.",
  },
  {
    name: "Animesh Raturi",
    role: "Co-Founder & Marketing Lead",
    line: "Runs how the site is found once it is live: your Google listing, your search results, your first page.",
  },
  {
    name: "Abhilasha Kumari",
    role: "Developer",
    line: "Builds the front end: the pages your parents and students actually touch.",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   Small pieces
   ──────────────────────────────────────────────────────────────────────── */

/**
 * The place, written the way somebody in India would write it.
 *
 * `pitchPlace` joins city, state and country, which is right for the
 * international design: "Manchester, United Kingdom" tells a reader something.
 * On this page it produced "New Delhi, Delhi, India", which wrapped the eyebrow
 * onto two lines at 375px to tell a reader in Delhi that Delhi is in India.
 *
 * So the country is dropped, and the state is dropped when the city already
 * carries it ("New Delhi, Delhi"). "Gorakhpur, Uttar Pradesh" keeps both,
 * because there is a Gorakhpur in more than one place and the state is doing
 * real work.
 */
function indiaPlace(page: Pick<PitchPage, "city" | "state">): string {
  const city = (page.city || "").trim();
  const state = (page.state || "").trim();
  if (!city) return state;
  if (!state) return city;
  const c = city.toLowerCase();
  const s = state.toLowerCase();
  return c.includes(s) || s.includes(c) ? city : `${city}, ${state}`;
}

/**
 * The display size for the institute's own name.
 *
 * NOT ONE CLAMP. A single `clamp(2.5rem, 7vw, 5.5rem)` is right for "HighQ
 * Classes" and wrong for "Kendriya Vidyalaya Sangathan Senior Secondary
 * School", which at 88px runs to five lines and pushes the director, the
 * observation and the call to action off a phone screen entirely. The whole
 * point of the hero is that it fits in the first four seconds, so the size
 * has to answer to the name rather than the name surviving the size.
 *
 * Three steps, measured at 375px with Instrument Serif italic (which averages
 * about 0.42em per character): up to 22 characters fits two lines at the top
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
 * A section label: small caps, a gold hairline running out to the gutter.
 *
 * This replaces `.eyebrow`, which is a rounded pill. A pill is the marketing
 * site's device and there are five of them on this page; five chips floating
 * above five centred headings is the shape of a generated page. A rule that
 * runs to the edge of the measure is what a printed proposal does, and it also
 * does something a pill cannot: it draws the eye along the line rather than
 * parking it in a badge.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-4 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      <span className="shrink-0">{children}</span>
      <span aria-hidden className={cn("h-px flex-1 opacity-50", GOLD_BG)} />
    </p>
  );
}

/**
 * A section heading.
 *
 * Sora 300 at heading size, with the emphasis carried by a single 800 word
 * rather than by the serif. That 300-against-800 jump inside one line is
 * _assets/DESIGN-DIRECTION.md move 3, and it is what lets this page keep its
 * one serif accent for the institute's name.
 *
 * `align` defaults to LEFT. Everything on this page used to be centred, which
 * is the single most reliable tell of a generated layout; two sections are
 * centred now (the price and the close) and they are centred because they are
 * the two moments the page stops arguing and asks for something.
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

/** The emphasised word inside a section heading. Weight, never the serif. */
function Loud({ children }: { children: React.ReactNode }) {
  return <span className="font-extrabold">{children}</span>;
}

/**
 * A numbered, ruled entry. Used by "what you get" and by the admission-season
 * fallback. No card, no icon, no chip: a hairline and a number.
 */
function PointRow({ item, index }: { item: Benefit; index: number }) {
  return (
    <li className="flex gap-4 border-t border-border py-5 sm:gap-6 sm:py-6">
      <span aria-hidden className={cn("shrink-0 pt-0.5 font-mono text-xs", GOLD_TEXT)}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-[1.02rem] font-semibold leading-snug tracking-tight sm:text-[1.1rem]">
          {item.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
      </div>
    </li>
  );
}

/**
 * The three ways to reach us, in the order they get used.
 *
 * WhatsApp is primary and is gold, because it is the one that gets pressed.
 * Call is second. Email is last and is plainly a link rather than a button,
 * because the person who needs it is the trustee this page was forwarded to,
 * and they want an address they can copy.
 *
 * THE TWO BUTTONS SIT SIDE BY SIDE ON A PHONE, and that is a change. Three
 * full-width stacked pills took 168px of the first screen, which is most of
 * the room the observation now occupies. Both are still over 48px tall, which
 * is the thumb target.
 *
 * THE LABEL IS "WhatsApp karein", NOT "WhatsApp par baat karein". Measured:
 * the longer phrase wrapped to two lines at 360, 375, 390 and 414, and to
 * THREE at 320, which made the gold pill 70px tall (92px at 320) beside a 49px
 * Call pill. Two buttons of visibly different heights on the primary call to
 * action is the kind of thing a reader does not name and does still notice.
 * `whitespace-nowrap` is what keeps it honest: if a future label no longer
 * fits, the flex-wrap on the row drops Call to its own line and both pills
 * stay one line tall, instead of the label quietly breaking in half.
 */
function CtaRow({ page, className }: { page: PitchPage; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-3", className)}>
      <div className="flex w-full flex-wrap items-center gap-3">
        <a
          href={pitchWhatsappHref(page)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[3rem] flex-1 items-center justify-center gap-2 whitespace-nowrap
                     rounded-full bg-[hsl(var(--brand-gold))] px-5 py-3 font-display text-[0.95rem]
                     font-semibold
                     text-[hsl(var(--brand-navy))] transition-[color,background-color,transform] duration-200 hover:brightness-95 active:brightness-90 active:scale-[0.99] motion-reduce:active:scale-100
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2
                     focus-visible:ring-offset-background sm:flex-none"
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
          WhatsApp karein
        </a>
        <a
          href={IDEOVENT_PHONE_HREF}
          className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full border
                     border-border bg-card/70 px-5 py-3 font-display text-[0.95rem] font-semibold
                     text-foreground transition-colors duration-200 hover:bg-accent
                     motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Phone className="h-5 w-5 shrink-0" aria-hidden />
          Call
        </a>
      </div>
      <a
        href={pitchEmailHref(page)}
        className="inline-flex min-h-[2.5rem] items-center gap-2 text-sm font-medium
                   text-muted-foreground underline-offset-4 transition-colors duration-200
                   hover:text-foreground hover:underline motion-reduce:transition-none
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                   focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Mail className="h-4 w-4 shrink-0" aria-hidden />
        {IDEOVENT_EMAIL}
      </a>
    </div>
  );
}

/** The address a proof link actually points at, without the scheme. */
function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/**
 * One piece of real work.
 *
 * THE ADDRESS IS PRINTED, not hidden behind "open it". A prospect is being
 * asked to believe that these builds exist; a link whose text is an invitation
 * proves nothing until it is clicked, and this page is screenshotted and
 * forwarded at least as often as it is clicked. The hostname in monospace is
 * the evidence, and it survives being a picture in somebody's WhatsApp.
 *
 * It is `print:hidden` for one reason: the print rule in index.css appends
 * `(href)` after every external link, so on paper the address is already
 * there, and leaving both in prints the same URL twice.
 *
 * The tag saying client or own product is not decoration. Showing one of our
 * own products as a client's is a fabricated client, and it is the single
 * easiest thing on this page for a prospect to catch.
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
        <div
          className="brand-navy-surface brand-navy-etch relative flex aspect-[8/5] w-full items-center
                     justify-center border-b border-border px-6 text-center"
        >
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">{entry.name}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-base font-semibold tracking-tight sm:text-lg">{entry.name}</h3>
          {/* From the data, via proofKindLabel, not from a branch written here.
              This card used to print the words "Our own product" for anything
              that was not a client, which is false for the founder's employer
              work and was one careless ordering change away from being on the
              page. */}
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
                className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm font-semibold text-primary
                           underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Khud dekh lijiye
                <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
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

/*
  `usePrintReadyImages` now lives in @/hooks/use-print-ready-images, because the
  international design needs exactly the same repair and two copies of a print
  fix is how one of them gets mended and the other quietly stops working. The
  reasoning is in that file.
*/

export default function PitchIndia({ page }: { page: PitchPage }) {
  usePrintReadyImages();

  const pkg = pitchPackage(page);
  const carePlan = PITCH_PACKAGES.find((p) => p.id === "care-plan-india");
  const addressed = pitchAddressee(page);
  const place = indiaPlace(page);
  const problems = page.observedProblems ?? [];
  const scope = page.proposedScope ?? [];
  const team = (page.teamNames ?? []).filter(Boolean);
  const benefits = BENEFITS[page.instituteType ?? "unknown"];
  const proof = proofEntries(defaultProofOrder(page.instituteType));
  const preparedOn = pitchDate(page.preparedOn, "india");
  const validUntil = pitchDate(page.validUntil, "india");
  const expired = isPitchExpired(page);

  /* THE HERO TAKES THE FIRST OBSERVATION AND SECTION 2 TAKES THE REST.
     Not a copy of it. A director who meets the same sentence twice in two
     screens is reading a page that was assembled, and the second appearance
     is the one that tells them so. When there is exactly one observation the
     hero carries it and section 2 does not render at all, which is shorter
     and correct rather than padded out to look full. */
  const leadProblem = problems[0] ?? null;
  const restProblems = problems.slice(1);

  /* The featured proof card is the first entry that actually has a
     screenshot, not simply the first entry. The curated order leads with
     HighQ Classes because it is the same sector, and its site is down, so it
     has no image: giving the wide slot to a navy placeholder panel would
     spend the biggest cell on the page on the one card with nothing to show.
     With five entries and one of them spanning two columns the lg grid fills
     exactly two rows of three, with no empty cell. */
  const featuredSlug = proof.find((e) => e.image && e.linkState === "live")?.slug;

  /* What to call them in running text. When `instituteType` is empty we do not
     guess, we say "institute", which is true of both. The article has to move
     with it: "a coaching institute", "a school", "an institute". */
  const noun =
    page.instituteType === "coaching" ? "coaching institute" : page.instituteType === "school" ? "school" : "institute";
  const aNoun = `${page.instituteType ? "a" : "an"} ${noun}`;

  return (
    /* pb-24 on mobile clears the sticky call to action, which is fixed and
       would otherwise sit on top of the last section. Dropped from sm up,
       where that bar is not rendered at all. */
    <div className="pitch-doc relative flex min-h-screen flex-col bg-background pb-24 sm:pb-0">
      <Seo
        /* NOINDEX IS NOT OPTIONAL HERE. This page names a real institute and a
           real person and quotes them a price. It is SENT to them; it is not
           published to the web. A pitch page that turns up in a competitor's
           search results, or in the institute's own, is a problem for them
           before it is a problem for us. */
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

      {/* ── The example record can never be mistaken for a researched one ─── */}
      {page.isExample && (
        <div className="border-b border-[hsl(var(--brand-gold)/0.45)] bg-[hsl(var(--brand-gold)/0.12)]">
          <div className="container-page flex gap-2.5 py-2.5">
            <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", GOLD_TEXT)} aria-hidden />
            <p className="text-xs leading-relaxed text-foreground sm:text-sm">
              <strong className="font-semibold">Example page.</strong> The institute, the city, the director and
              the observations below are placeholders that ship with the site so the layout can be checked. Do
              not send this to anybody.
            </p>
          </div>
        </div>
      )}

      {/* ── Slim brand bar. Same firm, none of the site navigation: this page
             has one job, and a header full of links is a row of exits. ────── */}
      <header className="border-b border-border/60">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          <span className="hidden text-xs text-muted-foreground sm:inline">{IDEOVENT_CITY}</span>
        </div>
      </header>

      <main id="pitch-main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/*
          ── 1. THEIR NAME, AND ONE THING WE ACTUALLY FOUND ────────────────
          Everything above the fold serves one idea: that this was made for
          THEM. The name is the largest thing on the page and the only serif
          on it, the place and the director sit with it, and the first
          observation is here rather than two screens down, because a
          principal deciding in four seconds never reaches screen three.

          NO ANIMATION, NO REVEAL, NO PRELOADER on this section. The only
          decoration is a static radial wash, and it is aria-hidden and
          dropped in print.
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
              the summary ledger in the narrow half. At 1440 the old single
              max-w-3xl column left the right half of the first screen empty,
              which on a page whose whole job is to look like it was made for
              this institute read as an unfinished template. The phone order
              is unchanged: name, then the finding, then how to reach us.
            */}
            <div className="lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
              <div className="max-w-3xl">
                {/* The kicker is 13px and the name is up to 88px. That ratio
                    is the whole point: four words of our boilerplate must not
                    be the first thing a reader meets at the same size as
                    their own name. */}
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

                {team.length > 0 && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    and the team at {page.instituteName}: {team.join(", ")}
                  </p>
                )}

                {/* mt-3 hangs this off the director's name. With no director
                    on the record, and that is the common case, it would instead
                    hang 12px off the gold rule and read as a line that fell
                    short rather than one that was placed. mt-6 there matches
                    the gap the director's name would have taken. */}
                <p
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
                    addressed || team.length > 0 ? "mt-3" : "mt-6",
                  )}
                >
                  {place && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {place}
                    </span>
                  )}
                  {place && preparedOn && <span aria-hidden className="h-3 w-px bg-border" />}
                  {preparedOn && <span>Prepared {preparedOn}, from {IDEOVENT_CITY}</span>}
                </p>

                {/*
                  ── THE FINDING, ABOVE THE FOLD ──────────────────────────
                  One observation, the first one, with the tool it was taken
                  with. Three states and none of them invents a fault:
                  we looked and found something, we have their address and
                  have not looked yet, and we could not find a site at all.
                  A guessed fault above the fold proves the page was a blast,
                  which is the one thing it exists to disprove.
                */}
                <figure className={cn("mt-7 border-l-2 pl-4 sm:mt-8 sm:pl-5", GOLD_BORDER)}>
                  {leadProblem ? (
                    <>
                      <figcaption className="text-[0.66rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {page.currentWebsite ? "What we found on your site" : "What we found"}
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
                          on its own is a sales claim, and the director can open
                          their own site and argue with it.

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
                        {page.currentWebsite ? "Before we say anything about your site" : "What we could not find"}
                      </figcaption>
                      <p className="mt-2 font-display text-[1.15rem] font-light leading-[1.25] tracking-[-0.015em] text-foreground sm:text-[1.4rem]">
                        {page.currentWebsite
                          ? "We have not audited your site yet, so we are not going to invent faults you may not have"
                          : `We could not find a website for ${page.instituteName}`}
                      </p>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {page.currentWebsite
                          ? "Send us five minutes on a call and we will open it while you watch: how long it takes on a phone on mobile data, what the page weighs, and whether an enquiry actually reaches a person."
                          : "If we are wrong, tell us and we will look at it properly. If we are right, that is a shorter conversation and a cheaper project."}
                      </p>
                    </>
                  )}
                </figure>

                <CtaRow page={page} className="mt-7 sm:mt-8" />

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Read this in two minutes, then tell us where we are wrong. There is no form to fill in and
                  nobody will put a sales call in your calendar.
                </p>
              </div>

              {/*
                AT A GLANCE, AS ONE LEDGER RATHER THAN THREE FLOATING CHIPS.
                It used to be three separate rounded cards, which on a phone
                read as three unrelated widgets. One bordered object with
                hairline rows reads as the summary block on a quotation, which
                is what it is. The price row is simply ABSENT when no package
                has been chosen, rather than showing a number nobody has
                agreed to.
              */}
              <aside className="mt-10 lg:mt-1">
                <dl className="card-surface divide-y divide-border overflow-hidden">
                  {pkg && (
                    <div className="flex items-baseline justify-between gap-4 p-4 sm:p-5">
                      <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Indicative price
                      </dt>
                      <dd className="text-right font-display text-lg font-semibold tabular-nums leading-tight tracking-tight sm:text-xl">
                        {unbreakable(pkg.range)}
                      </dd>
                    </div>
                  )}
                  {pkg?.timeline && (
                    <div className="flex items-baseline justify-between gap-4 p-4 sm:p-5">
                      <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Timeline
                      </dt>
                      <dd className="text-right font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                        {pkg.timeline.replace(" from the advance and your content", "")}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-4 p-4 sm:p-5">
                    <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      After launch
                    </dt>
                    <dd className="text-right font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                      30 days free
                    </dd>
                  </div>
                  {/*
                    THIS ROW IS UNCONDITIONAL, AND THAT IS WHY IT IS HERE.
                    With no package on the record, which is how most records
                    start, the price and timeline rows are both absent and this
                    ledger collapsed to a single fact in a rounded box, floating
                    in an otherwise empty right-hand column at 1440. One row is
                    not a ledger, it is a widget that failed to load.

                    It is also the true answer to the question a director is
                    actually asking at this point, and it is the same fact the
                    international design prints in the same place. No headcount,
                    no claim, one name.
                  */}
                  <div className="flex items-baseline justify-between gap-4 p-4 sm:p-5">
                    <dt className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Who builds it
                    </dt>
                    <dd className="text-right font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                      Mehdi Alam
                    </dd>
                  </div>
                </dl>

                {validUntil && (
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    {expired ? (
                      <>
                        This estimate was written to stand until {validUntil} and has lapsed. Message us and we
                        will refresh it. The offer has not been withdrawn, only the date on it.
                      </>
                    ) : (
                      <>This estimate stands until {validUntil}.</>
                    )}
                  </p>
                )}
              </aside>
            </div>
          </div>
        </section>

        {/*
          ── 2. THE REST OF WHAT WE FOUND ─────────────────────────────────
          Renders only when there is something here the hero has not already
          said. With one observation this section does not exist, and the page
          is shorter, which is the correct outcome rather than a hole to fill.
          Specific and checkable, or nothing at all: "nine seconds on 4G" is a
          fact they can repeat to their own staff, "your site is bad" is a
          verdict on their judgement and loses the deal in one line.

          SPACING: the tightest section on the page, because it belongs to the
          observation in the hero above it rather than standing on its own.
        */}
        {restProblems.length > 0 && (
          <section className="border-t border-border/60 pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-16">
            <div className="container-page">
              <SectionHead
                label="What we found"
                title={
                  <>
                    And <Loud>{restProblems.length === 1 ? "one more thing" : `${restProblems.length} more`}</Loud>{" "}
                    costing you enquiries
                  </>
                }
                sub={
                  page.currentWebsite
                    ? `We opened ${page.currentWebsite} the way a parent would: on a phone, on mobile data. None of this is a criticism of whoever built it.`
                    : `We looked at ${page.instituteName} the way a parent would: on a phone, on mobile data. None of this is a criticism of whoever built it.`
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
                Every one of these is fixable, and none of them needs you to start again from zero.
              </p>
            </div>
          </section>
        )}

        {/*
          ── 3. WHAT THEY WOULD GET ───────────────────────────────────────
          When we have no observations at all, this section carries the
          admission-season context first, because the page has not yet told
          the reader why any of this is urgent. It describes the SEASON and
          not the institute, so it cannot accuse anybody of anything.

          SPACING: the widest of the argument sections. This is the one that
          has to breathe, because it is the longest read on the page.
        */}
        <section className="border-t border-border/60 bg-muted/25 pt-12 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
          <div className="container-page">
            {/* The second grid break: the heading holds the left third and
                the list runs down the right two thirds, instead of a centred
                heading over a centred grid. */}
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:items-start lg:gap-16">
              <div className="lg:sticky lg:top-10">
                <SectionLabel>What you get</SectionLabel>
                <h2 className="mt-5 font-display text-[1.55rem] font-light leading-[1.14] tracking-[-0.02em] sm:text-[1.95rem] lg:text-[2.35rem]">
                  Built around what {aNoun} <Loud>actually sells</Loud>
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
                  Not a list of features. A list of the things a parent does on your site between finding you
                  and phoning you.
                </p>
              </div>

              <ul className="mt-8 border-b border-border lg:mt-0">
                {benefits.map((b, i) => (
                  <PointRow key={b.title} item={b} index={i} />
                ))}
              </ul>
            </div>

            {problems.length === 0 && (
              <div className="mt-14 lg:mt-20">
                <SectionHead
                  label="Why now"
                  title={
                    <>
                      What an admission season actually <Loud>asks of a website</Loud>
                    </>
                  }
                  sub="We have not measured your site, so this is about the season rather than about you. Correct us on the call."
                />
                <ul className="mt-8 grid gap-x-10 border-b border-border sm:mt-10 sm:grid-cols-2">
                  {ADMISSION_SEASON.map((item, i) => (
                    <PointRow key={item.title} item={item} index={i} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/*
          ── 4. PROOF ─────────────────────────────────────────────────────
          Real, live, openable, and the address printed on the card. No
          testimonials, no logo wall and no project count, because none of
          those can be evidenced. The link on the HighQ card is deliberately
          absent and the card says why.

          SPACING: between the two above it, and it carries the page's one
          asymmetric grid.
        */}
        {proof.length > 0 && (
          <section className="border-t border-border/60 pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24">
            <div className="container-page">
              <SectionHead
                label="Proof"
                title={
                  <>
                    Work you can <Loud>open in another tab</Loud>
                  </>
                }
                sub="No testimonials, no logos, no client count. The addresses are on the cards. Open them while you read this."
              />
              <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {proof.map((entry) => (
                  <ProofCard key={entry.slug} entry={entry} featured={entry.slug === featuredSlug} />
                ))}
              </div>
              <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                We do not print a project count, a satisfaction score or a wall of client logos, because we
                cannot evidence any of them.{" "}
                <Link to="/work" className="font-medium text-primary underline-offset-4 hover:underline">
                  The rest of our work is here
                </Link>
                .
              </p>
            </div>
          </section>
        )}

        {/*
          ── 5. PRICE ─────────────────────────────────────────────────────
          The figure comes from PITCH_PACKAGES, which comes from the pricing
          table in _assets/FACTS.md, which is the same table /pricing renders.
          The record stores a package id and never a number, so this page
          cannot quote a price the site has moved on from. When no package has
          been chosen the section says so and asks for a conversation, rather
          than inventing one.

          CENTRED, on purpose, and one of only two sections that are. The page
          stops arguing here and puts a number on the table.
        */}
        <section className="border-t border-border/60 bg-muted/25 pt-12 pb-14 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
          <div className="container-page">
            <SectionHead
              align="center"
              label="Price"
              title={
                <>
                  Yehi price hai. <Loud>Koi chhupi hui baat nahi</Loud>
                </>
              }
              sub="Indicative, and it moves with the scope. The only thing that changes it is something you ask for that is not in the list below, and you will hear about it before we build it, not after."
            />

            <div className="mx-auto mt-8 max-w-3xl sm:mt-10">
              <div className="card-surface overflow-hidden">
                {pkg ? (
                  <div className="border-b border-border p-6 sm:p-8">
                    <p className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Recommended for {page.instituteName}
                    </p>
                    <h3 className="mt-2 font-display text-lg font-light tracking-tight sm:text-xl">{pkg.label}</h3>
                    {/* The number is the largest thing in this section, which
                        is the reverse of what a page that is nervous about its
                        own price does. */}
                    <p className="mt-4 font-display text-[2.1rem] font-semibold tabular-nums leading-[1.05] tracking-[-0.03em] text-[hsl(var(--primary))] sm:text-[2.75rem]">
                      {unbreakable(pkg.range)}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pkg.summary}</p>
                    {pkg.timeline && (
                      <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {pkg.timeline}
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{GST_POSITION}</p>
                    <Link
                      to={pkg.href}
                      className="mt-4 inline-flex min-h-[2.75rem] items-center text-sm font-semibold text-primary
                                 underline-offset-4 hover:underline"
                    >
                      Check this against our full price list
                    </Link>
                  </div>
                ) : (
                  <div className="border-b border-border p-6 sm:p-8">
                    <h3 className="font-display text-xl font-light tracking-tight sm:text-2xl">
                      We have not put a number on this yet
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Quoting before anybody has looked at the scope is how a project ends in an argument. Our
                      full price list is public and nothing on it is hidden, so you can see the bands before you
                      speak to us.
                    </p>
                    <Link
                      to="/pricing"
                      className="mt-4 inline-flex min-h-[2.75rem] items-center text-sm font-semibold text-primary
                                 underline-offset-4 hover:underline"
                    >
                      See the full price list
                    </Link>
                  </div>
                )}

                {scope.length > 0 && (
                  <div className="p-6 sm:p-8">
                    <h4 className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      What we would build
                    </h4>
                    <ul className="mt-4 space-y-3">
                      {scope.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", GOLD_TEXT)} aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* The terms. Every one is contractual and is printed
                    identically here, on the proposal and in the agreement. */}
                <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
                  {[
                    { label: "Payment", value: PAYMENT_SPLIT },
                    { label: "Revisions", value: REVISION_ROUNDS },
                    { label: "Support", value: SUPPORT_WINDOW },
                  ].map((t) => (
                    <div key={t.label} className="bg-card p-5 sm:p-6">
                      <span className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {t.label}
                      </span>
                      <p className="mt-2 text-sm leading-relaxed">{t.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                {carePlan && (
                  <>
                    After the 30 days, a care plan is optional and runs at {unbreakable(carePlan.range)}, depending on the
                    tier. It is not compulsory.{" "}
                  </>
                )}
                {CODE_OWNERSHIP}
              </p>
            </div>
          </div>
        </section>

        {/*
          ── 6. WHO THEY WOULD WORK WITH ──────────────────────────────────
          This section looks decorative and is not. A director is deciding
          whether to hand money to people on the internet. Real names, real
          roles, initials rather than photographs, and no headcount claim:
          _assets/FACTS.md forbids stating one.

          SPACING: the shortest of the remaining sections.
        */}
        <section className="border-t border-border/60 pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20">
          <div className="container-page">
            <SectionHead
              label="Who you would work with"
              title={
                <>
                  The people, <Loud>not an account manager</Loud>
                </>
              }
              sub="Ideovent Technologies is a partnership firm in Saket, New Delhi. You would deal with the partners directly, and the person who writes the code is the person who answers the phone."
            />
            <ul className="mt-8 grid gap-x-10 border-b border-border sm:mt-10 sm:grid-cols-2">
              {TEAM.map((m) => (
                <li key={m.name} className="flex items-start gap-4 border-t border-border py-5 sm:py-6">
                  <InitialsAvatar name={m.name} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold tracking-tight">{m.name}</h3>
                    <p className="text-sm font-medium text-[hsl(var(--primary))]">{m.role}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.line}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/*
          ── 7. THE CALL TO ACTION, AGAIN ─────────────────────────────────
          The deepest padding on the page, because this is where it stops.
        */}
        <section className="border-t border-border/60 bg-muted/25 pt-16 pb-12 sm:pt-24 sm:pb-16 lg:pt-32 lg:pb-24">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-[1.55rem] font-light leading-[1.14] tracking-[-0.02em] sm:text-[1.95rem] lg:text-[2.35rem]">
                Ek message bhej dijiye. <Loud>Baaki hum dekh lenge</Loud>
              </h2>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">
                No form to fill in and no sales call booked into your calendar. Press WhatsApp and the message
                already says who you are. If the answer is no, tell us that and we will stop.
              </p>
              <div className="mt-8 flex justify-center">
                <CtaRow page={page} className="w-full items-center sm:w-auto" />
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Ideovent Technologies, a partnership firm. {IDEOVENT_CITY}.
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
          </nav>
        </div>
      </footer>

      {/* ── Sticky call to action, phones only ──────────────────────────────
             A director reads this while walking between two things. The thumb
             should never have to find its way back to the top of the page.
             Hidden from sm up, where the page is short enough to scroll, and
             hidden in print, where a bar fixed to the viewport would land on
             top of page one. */}
      <div className="pitch-sticky fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur sm:hidden">
        <div className="container-page flex items-center gap-2 py-3">
          <a
            href={pitchWhatsappHref(page)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[2.9rem] flex-1 items-center justify-center gap-2 rounded-full
                       bg-[hsl(var(--brand-gold))] px-4 font-display text-sm font-semibold
                       text-[hsl(var(--brand-navy))]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
          <a
            href={IDEOVENT_PHONE_HREF}
            aria-label={`Call Ideovent Technologies on ${IDEOVENT_PHONE_DISPLAY}`}
            className="inline-flex min-h-[2.9rem] items-center justify-center gap-2 rounded-full border
                       border-border bg-card px-5 font-display text-sm font-semibold text-foreground"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call
          </a>
        </div>
      </div>
    </div>
  );
}
