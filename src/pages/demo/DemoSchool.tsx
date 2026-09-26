import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { DemoMarker, DemoRibbon } from "@/pages/site/DemoMarker";
import { DemoLanguageToggle } from "@/pages/site/DemoLanguageToggle";
import type { DemoSite } from "@/lib/cms/types";
import { demoVocabulary, type DemoVocabulary } from "@/lib/demo/vocabulary";
import { DEMO_HINDI_CSS, useDemoLangControl } from "@/lib/demo/language";
import { schoolCopy, type AccentedTitle, type SchoolCopy } from "@/lib/demo/copy/school";
import {
  NAV_PRIORITY, accentParts, ageBounds, boardLead, formatFee, heroAction, initials, mailHref,
  mayShowPhoto, metricParts, orderedNotices, renderedSections, schoolPlace, splitLead, stageSpan,
  telHref, text, visitRows, waHref,
} from "@/lib/demo/school";
import {
  demoThemeStyle, schoolPad, schoolRuleSection, schoolSectionOrder, schoolSteps, schoolTheme,
  type DemoSchoolSectionId, type DemoSchoolTheme, type SchoolStep,
} from "@/lib/demo/schoolThemes";
import { unbreakable } from "@/lib/typography";
import { cn } from "@/lib/utils";

/**
 * THE SCHOOL DEMO SITE.
 *
 * Not a page about a school: a whole website for one school, with their name
 * in the masthead, sent by Mehdi with "dekhiye, aapke liye ye website banayi
 * hai. Agar pasand aaye to aage baat karte hain."
 *
 * THE ONE TEST. A director opens the link on their phone and thinks "this is
 * a real website for my school", not "this is a template with my name in it"
 * and not "this is a form I have to fill in". Everything below follows from
 * that sentence and from _assets/DEMO-SITE-BRIEF.md, which measured the
 * sites a parent actually trusts and wrote down what they do.
 *
 * ── WHAT THIS FILE OWNS, AND WHAT IT MUST NOT ─────────────────────────────
 * It owns the composition: the hero, the section order, the rhythm, the type
 * and every empty state. It does NOT decide what resolves: that belongs to
 * `src/pages/DemoSiteRoute.tsx`. It renders the demo ribbon and the marker
 * from ./site/DemoMarker, because a real school's name on the internet with
 * nothing saying who built the page, or that the school has never seen it, is
 * the one failure this feature cannot have.
 *
 * ── THE SEVEN RULES THAT SHAPE THE CODE ──────────────────────────────────
 *
 * 1. NOTHING IS INVENTED. No fallback phone number, no sample result, no stock
 *    face, no made-up date, no affiliation. Every empty field prints a blank
 *    written in the second person to the director, and a blank occupies the
 *    space its SENTENCE needs, never the space its content would need. A
 *    fabricated figure on a page carrying a real school's name is something a
 *    parent could act on and the school could be held to.
 *
 * 2. THE HERO'S SECOND COLUMN HOLDS TRUE CONTENT OR IT DOES NOT EXIST. The
 *    old build put a 450px dashed photo frame there. `Hero` has three
 *    branches and none of them is an empty half: the school's own photograph
 *    bleeding off the right edge, a panel of four real facts, or the column
 *    collapses and the name runs single at a 22ch measure with the crest set
 *    large and low behind it.
 *
 * 3. BOTH STATES ARE DESIGNED. The example record is full and a real record
 *    usually is not. A section with nothing in it DOES NOT RENDER; its
 *    invitation moves into one closing block instead of leaving a hole. The
 *    sections that always render are the hero, the visit band and contact,
 *    and those collapse to a single sentence rather than to a frame. See
 *    `planBlanks`, which is the whole mechanism in one function.
 *
 * 4. A FACE NEEDS CONSENT. `mayShowPhoto` gates every photograph of a person
 *    on `photoConsent`. A teacher's face on a website they have not agreed to
 *    is the most damaging thing this page could carry and the one thing a
 *    reviewer would not notice missing.
 *
 * 5. TWO DISPLAY SIZES, TWO BACKGROUND CHANGES, ONE HAIRLINE, TWO SERIF
 *    ACCENTS. `H1` and `H2` below are the only display sizes on the page and
 *    every large figure uses one of them rather than introducing a third. The
 *    hero and the visit band are the only two grounds that differ from the
 *    page. The single 1px section rule sits where persuasion ends and
 *    reference begins, exactly as 21st.dev does it.
 *
 * 6. RHYTHM COMES FROM SECTIONS HAVING DIFFERENT JOBS. Nine section shapes,
 *    none repeated, on a four-step spacing scale where no two neighbours share
 *    a step (`schoolSteps`). No alternating bands: alternating `tone="alt"`
 *    every other section is precisely what produced "four sections in a row
 *    with identical shape".
 *
 * 7. MOTION IS ENTRANCE ONLY, ONCE, AND NEVER DELAYS THE FIRST SENTENCE. The
 *    school's name renders immediately with no animation on it at all. Four
 *    groups arrive after it, 380ms each, decelerating, 12px on Y and opacity,
 *    staggered 60ms and capped at 180ms. One scroll reveal below the fold, on
 *    the results. `prefers-reduced-motion` disables every entrance.
 *
 * ── THE LOOK IS THE THEME'S, NOT THIS FILE'S ──────────────────────────────
 * `src/lib/demo/schoolThemes.ts` holds five compositions, each with its own
 * measured palette, type pairing, hero and section order. This file reads them
 * through `--ds-*` custom properties and states no colour of its own.
 */

/* ────────────────────────────────────────────────────────────────────────────
   The two display sizes, and nothing else

   21st.dev runs its entire homepage on an h1 at 64px and every h2 at 44px, all
   at one weight, and gets its contrast from COLOUR and FAMILY instead. There
   is no 32px heading on that page and there is none on this one.
   ──────────────────────────────────────────────────────────────────────── */

const DISPLAY: CSSProperties = {
  fontFamily: "var(--ds-display)",
  fontWeight: "var(--ds-display-weight)" as unknown as number,
  letterSpacing: "var(--ds-display-tracking)",
  textTransform: "var(--ds-display-transform)" as CSSProperties["textTransform"],
};

/** The hero, the established year, and nothing else. */
const H1: CSSProperties = { ...DISPLAY, fontSize: "clamp(2.75rem, 6.2vw, 5.25rem)", lineHeight: 0.96 };

/** Every section head, every large figure, the step numbers, the phone in the band. */
const H2: CSSProperties = { ...DISPLAY, fontSize: "clamp(1.75rem, 2.9vw, 2.75rem)", lineHeight: 1.1 };

/** A name, a person, a stage: the display family at 600 without the theme's case. */
const NAME: CSSProperties = { fontFamily: "var(--ds-display)", fontWeight: 600, letterSpacing: "-0.012em" };

const INK = "text-[hsl(var(--ds-ink))]";
const SOFT = "text-[hsl(var(--ds-ink-soft))]";
const LINE = "border-[hsl(var(--ds-line))]";
/**
 * The two-tone continuation of a heading: same element, same size, reduced
 * ink. It is the MEASURED soft ink rather than the ink at 60% alpha, because
 * an alpha blend is a pair the contrast script cannot see, and at 0.62 the
 * heritage theme lands at 4.21:1. The soft ink is 6.77:1 or better everywhere.
 */
const TAIL = SOFT;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ds-accent))] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ds-bg))]";
const FOCUS_HERO =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ds-hero-accent))] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ds-hero-bg))]";
const FOCUS_BAND =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ds-on-brand))] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--ds-brand))]";

/** Every anchor target clears the sticky header. */
const ANCHOR = "scroll-mt-[4.5rem] sm:scroll-mt-20";

/**
 * The page's own stylesheet, scoped to `.demo-school` and shipped inline so
 * that none of it reaches the global stylesheet: a visitor to /pricing never
 * downloads a school's keyframes.
 *
 * THE SERIF ACCENT is stepped up 8% (21st.dev: 69.12px inside a 64px line) so
 * its x-height matches the sans around it, and it drops the theme's case so a
 * heavy uppercase theme still gets an italic word rather than an italic shout.
 *
 * THE ENTRANCE is 21st's measured curve, cubic-bezier(0.2, 0.6, 0.2, 1), run
 * once, 12px on Y plus opacity. THE REVEAL is the one scroll-triggered entrance
 * on the page and it is on the numbers; where scroll timelines are not
 * supported it is simply off, so nothing plays at a random moment.
 */
const SCHOOL_CSS = `
.demo-school .ds-accent{font-family:var(--ds-serif);font-style:italic;font-weight:400;font-size:1.08em;letter-spacing:-0.01em;text-transform:none}
@keyframes ds-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.demo-school .ds-in{animation:ds-in 380ms cubic-bezier(0.2,0.6,0.2,1) both 1}
.demo-school .ds-reveal{animation:ds-in 520ms cubic-bezier(0.2,0.6,0.2,1) both 1;animation-timeline:view();animation-range:entry 10% cover 30%}
@supports not (animation-timeline:view()){.demo-school .ds-reveal{animation:none}}
.demo-school a,.demo-school button{transition:color 150ms,background-color 150ms,border-color 150ms,opacity 150ms,text-decoration-color 150ms}
@media (prefers-reduced-motion:reduce){
  .demo-school .ds-in,.demo-school .ds-reveal{animation:none;opacity:1;transform:none}
  .demo-school a,.demo-school button{transition:none}
}
`;

/* ────────────────────────────────────────────────────────────────────────────
   Blanks: the one style, and the budget that stops them multiplying
   ──────────────────────────────────────────────────────────────────────── */

type Tone = "page" | "hero" | "band";

/**
 * A blank, which is a designed state and not a missing one.
 *
 * A 2px rule in the accent colour with 12px of padding and text at the soft
 * ink: normal weight, normal style, no underline, no dashes, no box. It reads
 * as a margin note, which is exactly what it is: a line addressed to the
 * director saying what they would send us. It occupies the space its SENTENCE
 * needs and never the space its content would need, which is what kills the
 * 450px empty photo frame the old build carried. One style, everywhere.
 */
function Blank({ children, className, tone = "page" }: { children: ReactNode; className?: string; tone?: Tone }) {
  return (
    <p
      className={cn(
        "max-w-[60ch] border-l-2 pl-3 text-[0.95rem] font-normal not-italic leading-relaxed",
        tone === "hero"
          ? "border-[hsl(var(--ds-hero-accent)/0.7)] text-[hsl(var(--ds-hero-soft))]"
          : tone === "band"
            ? "border-[hsl(var(--ds-on-brand)/0.55)] text-[hsl(var(--ds-on-brand))]"
            : "border-[hsl(var(--ds-accent)/0.6)] text-[hsl(var(--ds-ink-soft))]",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface BlankPlan {
  /** Keys whose blank renders where it stands. At most six. */
  inPlace: Set<string>;
  /** Everything else, as one honest list at the foot of the page. */
  deferred: string[];
}

/**
 * Which blanks the reader is allowed to see, and where.
 *
 * Two rules from the brief meet here. A section with nothing in it does not
 * render at all, so its invitation cannot leave a hole; and no more than six
 * blanks may be visible in place, because a page with twelve scattered blanks
 * reads as broken while a page with a few and one honest list reads as a next
 * step. Everything that does not fit, plus every invitation belonging to a
 * section that was dropped, ends up in `deferred` and is printed once under
 * "What we still need from you".
 *
 * It is computed BEFORE anything renders rather than counted during the
 * render, so the answer does not depend on the order React walks the tree.
 */
function planBlanks(candidates: { key: string; text: string }[], dropped: string[], limit = 6): BlankPlan {
  const inPlace = new Set<string>();
  const deferred: string[] = [];
  for (const cnd of candidates) {
    if (inPlace.size < limit) inPlace.add(cnd.key);
    else if (!deferred.includes(cnd.text)) deferred.push(cnd.text);
  }
  for (const d of dropped) if (d && !deferred.includes(d)) deferred.push(d);
  return { inPlace, deferred };
}

/* ────────────────────────────────────────────────────────────────────────────
   Small shared pieces
   ──────────────────────────────────────────────────────────────────────── */

/** A small-caps label. The theme's SECOND colour on the page, never the first. */
function Label({ children, tone = "page", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "text-[0.68rem] font-semibold uppercase leading-none tracking-[0.14em]",
        tone === "hero"
          ? "text-[hsl(var(--ds-hero-accent))]"
          : tone === "band"
            ? "text-[hsl(var(--ds-on-brand))]"
            : "text-[hsl(var(--ds-accent))]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The label that survives a screenshot.
 *
 * Three layers carry it: the marker strip says every figure below is example
 * content, the footer repeats it in a sentence, and this tag sits in the head
 * of every section that prints a number. Individual figures are NOT tagged;
 * tagging each one is what produced the dashed-box look the rebuild removes.
 */
function ExampleTag({ site, c, tone = "page" }: { site: DemoSite; c: SchoolCopy; tone?: Tone }) {
  if (!site.isExample) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]",
        tone === "hero" ? "text-[hsl(var(--ds-hero-soft))]" : tone === "band" ? "text-[hsl(var(--ds-on-brand))]" : SOFT,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-[2px] w-4",
          tone === "hero" ? "bg-[hsl(var(--ds-hero-accent))]" : tone === "band" ? "bg-[hsl(var(--ds-on-brand))]" : "bg-[hsl(var(--ds-accent))]",
        )}
      />
      {c.exampleTag}
    </span>
  );
}

/**
 * The school's crest, or their monogram in their own colour.
 *
 * On a deep hero the disc INVERTS: the hero ground is the brand colour, so a
 * brand-filled disc there is a disc that does not exist. heroInk is measured
 * against heroBg in every theme, so the inverted pair is always visible.
 */
function Crest({ site, tone = "page", className }: { site: DemoSite; tone?: Tone; className?: string }) {
  const logo = text(site.logo);
  if (logo) {
    return <img src={logo} alt="" width={128} height={128} decoding="async" className={cn("shrink-0 object-contain", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none",
        tone === "hero"
          ? "bg-[hsl(var(--ds-hero-ink))] text-[hsl(var(--ds-hero-bg))]"
          : tone === "band"
            ? "bg-[hsl(var(--ds-on-brand))] text-[hsl(var(--ds-brand))]"
            : "bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]",
        className,
      )}
      style={{ fontFamily: "var(--ds-display)", letterSpacing: "0.04em" }}
    >
      {initials(site.instituteName)}
    </span>
  );
}

/** A person: their photograph with consent, otherwise their initials. Never a silhouette. */
function Avatar({ person, className }: { person: { name: string; photo?: string; photoConsent?: boolean }; className?: string }) {
  if (mayShowPhoto(person)) {
    return (
      <img
        src={person.photo}
        alt=""
        width={192}
        height={192}
        loading="lazy"
        decoding="async"
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-[hsl(var(--ds-brand))] font-semibold leading-none text-[hsl(var(--ds-on-brand))]",
        className,
      )}
      style={{ fontFamily: "var(--ds-display)", letterSpacing: "0.04em" }}
    >
      {initials(person.name)}
    </span>
  );
}

/** One accented heading: the serif italic on exactly the phrase the copy marked. */
function Accented({ parts, tone = "page" }: { parts: AccentedTitle; tone?: Tone }) {
  return (
    <>
      {parts.before}
      {parts.accent && (
        <span
          className={cn(
            "ds-accent",
            tone === "hero" ? "text-[hsl(var(--ds-hero-accent))]" : tone === "band" ? "text-[hsl(var(--ds-on-brand))]" : "text-[hsl(var(--ds-accent))]",
          )}
        >
          {parts.accent}
        </span>
      )}
      {parts.after}
    </>
  );
}

/**
 * The section head: a small-caps label punctuated the theme's way, the
 * heading, and where a section needs a subtitle, the SAME heading continuing
 * at the same size at reduced ink rather than a smaller second line. 21st.dev
 * gets every subtitle on its homepage that way and never introduces a third
 * type size.
 */
function Head({
  id, theme, label, title, tail, tag, tone = "page", className,
}: {
  id?: string;
  theme: DemoSchoolTheme;
  label?: string;
  title: ReactNode;
  tail?: ReactNode;
  tag?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const band = tone === "band";
  return (
    <div className={cn("max-w-[32ch]", className)}>
      {(label || tag) && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {label ? (
            <span className="inline-flex items-center gap-2.5">
              {theme.rule === "bar" && (
                <span aria-hidden className={cn("h-[3px] w-6", band ? "bg-[hsl(var(--ds-on-brand))]" : "bg-[hsl(var(--ds-accent))]")} />
              )}
              <Label
                tone={tone}
                className={cn(theme.rule === "hair" && "border-b pb-2", theme.rule === "hair" && (band ? "border-[hsl(var(--ds-on-brand)/0.35)]" : LINE))}
              >
                {label}
              </Label>
            </span>
          ) : (
            <span />
          )}
          {tag}
        </div>
      )}
      <h2 id={id} className={cn("mt-4 text-balance", band ? "text-[hsl(var(--ds-on-brand))]" : INK)} style={H2}>
        {title}
        {tail && !band && <span className={TAIL}> {tail}</span>}
      </h2>
    </div>
  );
}

/** One section shell. The step is decided by `schoolSteps`, never by hand. */
function Sec({
  id, step, rule, labelledBy, className, children,
}: {
  id: string;
  step: SchoolStep;
  /** TRUE on exactly one section: the page's single hairline rule. */
  rule?: boolean;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn(schoolPad(step), ANCHOR, rule && cn("border-t", LINE), className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

type ActionTone = "brand" | "quiet" | "hero" | "band";

function Action({
  href, children, tone = "brand", external, className,
}: {
  href: string;
  children: ReactNode;
  tone?: ActionTone;
  external?: boolean;
  className?: string;
}) {
  const look =
    tone === "brand"
      ? cn("bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))] hover:opacity-90", FOCUS)
      : tone === "hero"
        ? cn("bg-[hsl(var(--ds-hero-ink))] text-[hsl(var(--ds-hero-bg))] hover:opacity-90", FOCUS_HERO)
        : tone === "band"
          ? cn("bg-[hsl(var(--ds-on-brand))] text-[hsl(var(--ds-brand))] hover:opacity-90", FOCUS_BAND)
          : cn("border border-[hsl(var(--ds-line))] text-[hsl(var(--ds-ink))] hover:border-[hsl(var(--ds-brand))]", FOCUS);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "inline-flex min-h-[2.875rem] items-center justify-center gap-2 px-5 py-2.5 text-[0.95rem] font-semibold",
        look,
        className,
      )}
      style={{ borderRadius: "var(--ds-radius)", fontFamily: "var(--ds-body)" }}
    >
      {children}
    </a>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The four facts

   Established, board, ages and where: the answer to "what kind of school, for
   what ages, and is it any good", which is what a parent reads second. They
   are printed ONCE on the first screen. With no photograph they fill the
   hero's second column as a panel; with a photograph they run as Doon's and
   Exeter's 4-up row directly under the hero; on the type-led hero they are
   the row under the name. Never twice.
   ──────────────────────────────────────────────────────────────────────── */

interface Fact { key: string; label: string; value: string }

function schoolFacts(site: DemoSite, c: SchoolCopy, place: string): Fact[] {
  const established = text(site.established) || text(site.establishedYear);
  const board = text(site.boardOrAffiliation);
  const ages = ageBounds(site.courses);
  const stages = stageSpan(site.courses);
  const ageLine = [ages ? c.ageRange(ages.from, ages.to) : "", stages].filter(Boolean).join(", ");
  return [
    { key: "established", label: c.factEstablished, value: established },
    { key: "board", label: c.factAffiliation, value: board },
    { key: "ages", label: c.factAges, value: ageLine },
    { key: "where", label: c.factWhere, value: place },
  ].filter((f) => f.value);
}

function FactPanel({
  facts, variant, site, c,
}: {
  facts: Fact[];
  /** `rows` on a deep hero, `block` on a light one, `row` as a 4-up under the name. */
  variant: "rows" | "block" | "row";
  site: DemoSite;
  c: SchoolCopy;
}) {
  if (variant === "row") {
    return (
      <div>
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.key} className={cn("border-t pt-4", LINE)}>
              <dt><Label>{f.label}</Label></dt>
              <dd className={cn("mt-2.5 text-[1.05rem] leading-snug tabular-nums", INK)}>{f.value}</dd>
            </div>
          ))}
        </dl>
        {site.isExample && <p className="mt-6"><ExampleTag site={site} c={c} /></p>}
      </div>
    );
  }

  const block = variant === "block";
  const rule = block ? "border-[hsl(var(--ds-on-brand)/0.25)]" : "border-[hsl(var(--ds-hero-ink)/0.22)]";
  const tone: Tone = block ? "band" : "hero";
  const body = (
    <>
      <dl className={cn("border-t", rule)}>
        {facts.map((f) => (
          <div key={f.key} className={cn("grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-5 border-b py-4", rule)}>
            <dt className="pt-1"><Label tone={tone}>{f.label}</Label></dt>
            <dd className={cn("text-[1.05rem] leading-snug tabular-nums", block ? "text-[hsl(var(--ds-on-brand))]" : "text-[hsl(var(--ds-hero-ink))]")}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      {site.isExample && <p className="mt-5"><ExampleTag site={site} c={c} tone={tone} /></p>}
    </>
  );
  if (!block) return <div>{body}</div>;
  /* THE SOLID BLOCK OF THE SCHOOL'S COLOUR CARRYING TYPE: the no-photography
     playbook's second move, Avenues style. It is content, not decoration. */
  return (
    <div className="bg-[hsl(var(--ds-brand))] px-7 py-7 sm:px-9 sm:py-9" style={{ borderRadius: "var(--ds-radius)" }}>
      {body}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The hero

   Left aligned at the gutter, no outline box, the school's own deep colour
   (or the page ground on the light and type-led themes) full bleed with no
   inner frame. Left column: crest, eyebrow, the FULL name, the tagline with
   the serif accent, one button plus the phone as a text link, one dated line.
   Right column, in strict priority: their photograph, else the fact panel,
   else the column collapses. Never an empty half, never a dashed frame.
   ──────────────────────────────────────────────────────────────────────── */

interface HeroProps {
  site: DemoSite;
  theme: DemoSchoolTheme;
  c: SchoolCopy;
  eyebrow: string;
  tagline: string;
  taglineBlank: boolean;
  action: { href: string; external: boolean; label: string; arrow: boolean };
  phone: string;
  tel: string | null;
  datesLine: string;
  facts: Fact[];
  second: "photo" | "facts" | "none";
}

function Hero({ site, theme, c, eyebrow, tagline, taglineBlank, action, phone, tel, datesLine, facts, second }: HeroProps) {
  const kind = theme.hero;
  const deep = kind === "deep";
  const ink = "text-[hsl(var(--ds-hero-ink))]";
  const soft = "text-[hsl(var(--ds-hero-soft))]";
  const accent = "text-[hsl(var(--ds-hero-accent))]";
  const photo = text(site.heroImage);
  const single = second === "none" || kind === "type-led";

  const left = (
    <div>
      <Crest site={site} tone={deep ? "hero" : "page"} className="h-11 w-11 text-[0.95rem]" />
      {eyebrow && (
        <p className={cn("mt-6 text-[0.7rem] font-semibold uppercase leading-none tracking-[0.14em]", accent)}>{eyebrow}</p>
      )}
      {/* THE NAME IS NOT ANIMATED. It is the first sentence and nothing may
          delay it: a parent who was sent this link is checking one thing
          first, that it is their school. */}
      <h1 id="hero-h" className={cn("text-balance", eyebrow ? "mt-4" : "mt-6", single && "max-w-[22ch]", ink)} style={H1}>
        {site.instituteName}
      </h1>
      {tagline ? (
        <p className={cn("ds-in mt-6 max-w-[38ch] text-[1.25rem] leading-[1.4] sm:text-[1.375rem]", soft)}>
          {accentParts(tagline).map((part, i) =>
            part.accent ? (
              <span key={i} className={cn("ds-accent", accent)}>{part.text}</span>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
      ) : taglineBlank ? (
        <Blank tone="hero" className="ds-in mt-6 text-[1.05rem]">{c.blank.tagline}</Blank>
      ) : null}
      <div className="ds-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: "60ms" }}>
        <Action href={action.href} external={action.external} tone={deep ? "hero" : "brand"}>
          {action.label}
          {action.arrow && <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />}
        </Action>
        {tel && (
          <a
            href={tel}
            className={cn(
              "inline-flex items-center gap-2 text-[0.95rem] font-medium tabular-nums underline underline-offset-4",
              "decoration-[hsl(var(--ds-hero-ink)/0.4)] hover:decoration-[hsl(var(--ds-hero-ink))]",
              ink, deep ? FOCUS_HERO : FOCUS,
            )}
          >
            <Phone className={cn("h-4 w-4 shrink-0", accent)} aria-hidden />
            {unbreakable(phone)}
          </a>
        )}
      </div>
      {datesLine && (
        <p className={cn("ds-in mt-6 max-w-[52ch] text-[0.875rem] leading-relaxed tabular-nums", soft)} style={{ animationDelay: "120ms" }}>
          {datesLine}
        </p>
      )}
    </div>
  );

  const shell = cn("relative overflow-hidden bg-[hsl(var(--ds-hero-bg))]", ink);

  /* The watermark: the crest set very large at 7% opacity, bleeding off the
     right edge as ambient mass. The no-photography playbook's first move, and
     the ONLY thing that fills a collapsed second column. */
  /* On the type-led hero the facts row sits low, so the crest goes high and
     right, into the half the single column leaves free; on a collapse it
     goes low and right, under nothing. */
  const watermark = (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute -right-8 select-none text-[16rem] leading-none opacity-[0.07] sm:-right-14 sm:text-[24rem] lg:text-[28rem]",
        kind === "type-led" ? "top-[-8%]" : "bottom-[-14%]",
      )}
      style={{ fontFamily: "var(--ds-display)", fontWeight: 700, color: deep ? "hsl(var(--ds-hero-ink))" : "hsl(var(--ds-brand))" }}
    >
      {initials(site.instituteName)}
    </span>
  );

  /* ── type-led: no second column. The name across 22ch, the four facts as
        one row beneath it, the crest behind, and the photograph (if any) as
        the first band under the type. ─────────────────────────────────── */
  if (kind === "type-led") {
    return (
      <section id="top" aria-labelledby="hero-h" className={shell}>
        {watermark}
        <div className="container-page relative flex flex-col justify-center pt-10 pb-12 sm:pt-14 sm:pb-14 lg:min-h-[62svh] lg:pt-14 lg:pb-14">
          {left}
          {facts.length >= 2 && (
            <div className="ds-in mt-12" style={{ animationDelay: "180ms" }}>
              <FactPanel facts={facts} variant="row" site={site} c={c} />
            </div>
          )}
        </div>
        {photo && (
          <div className="container-page pb-12 sm:pb-16">
            <img
              src={photo}
              alt={site.instituteName}
              width={1600}
              height={700}
              decoding="async"
              className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
              style={{ borderRadius: "min(var(--ds-radius), 8px)" }}
            />
          </div>
        )}
      </section>
    );
  }

  /* ── photograph: full bleed to the right edge and the bottom edge, no
        radius, no frame, no shadow (Mathnasium, Crimson). The section clips
        the bleed so it never reaches the reader as a page scrollbar. ──── */
  if (second === "photo") {
    return (
      <section id="top" aria-labelledby="hero-h" className={shell}>
        <div className="container-page lg:grid lg:min-h-[62svh] lg:grid-cols-[58fr_42fr] lg:gap-14">
          <div className="pt-10 pb-12 sm:pt-14 sm:pb-16 lg:flex lg:flex-col lg:justify-center lg:py-16">{left}</div>
          <div className="-mx-4 sm:-mx-6 md:-mx-8 lg:ml-0 lg:-mr-[max(2.5rem,calc((100vw_-_80rem)/2_+_2.5rem))] xl:-mr-[max(3rem,calc((100vw_-_80rem)/2_+_3rem))]">
            <img
              src={photo}
              alt={site.instituteName}
              width={1200}
              height={900}
              decoding="async"
              className="aspect-[4/3] h-full w-full object-cover lg:aspect-auto"
            />
          </div>
        </div>
      </section>
    );
  }

  /* ── facts: 58/42, the panel of four true facts in the second column ── */
  if (second === "facts") {
    return (
      <section id="top" aria-labelledby="hero-h" className={shell}>
        <div className="container-page flex items-center pt-10 pb-12 sm:pt-14 sm:pb-16 lg:min-h-[62svh] lg:py-16">
          <div className="w-full lg:grid lg:grid-cols-[58fr_42fr] lg:items-center lg:gap-16">
            {left}
            <div className="ds-in mt-12 lg:mt-0" style={{ animationDelay: "180ms" }}>
              <FactPanel facts={facts} variant={deep ? "rows" : "block"} site={site} c={c} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── The collapse. One column at a 22ch measure, the crest as ambient
       mass, and no second column at all. Never an empty half. ─────────── */
  return (
    <section id="top" aria-labelledby="hero-h" className={shell}>
      {watermark}
      <div className="container-page relative flex items-center pt-10 pb-12 sm:pt-14 sm:pb-16 lg:min-h-[62svh] lg:py-16">
        <div className="w-full">{left}</div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The sections
   ──────────────────────────────────────────────────────────────────────── */

interface Ctx {
  site: DemoSite;
  theme: DemoSchoolTheme;
  c: SchoolCopy;
  v: DemoVocabulary;
  place: string;
  plan: BlankPlan;
  steps: Record<string, SchoolStep>;
  ruleAt: DemoSchoolSectionId | null;
}

function shell(ctx: Ctx, id: DemoSchoolSectionId) {
  return { id, step: ctx.steps[id] || "normal", rule: ctx.ruleAt === id, labelledBy: `h-${id}` } as const;
}

/* ── (c) Welcome from the head: a portrait or the initials at 96px, the
      message, a signature. Not a card. Brighton College puts this in the hero
      itself; Doon buries it near the footer, and Brighton converts better. ── */
function PrincipalSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c, v, plan } = ctx;
  const role = text(site.principalTitle) || v.headWord;
  const name = text(site.principalName);
  const message = text(site.principalMessage);
  const paragraphs = message.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <Sec {...shell(ctx, "principal")}>
      <div className="grid gap-8 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-12">
        <div>{name ? <Avatar person={{ name, photo: undefined, photoConsent: false }} className="h-24 w-24 text-[1.5rem]" /> : null}</div>
        <div className="min-w-0">
          <Head id="h-principal" theme={theme} label={c.sectionLabel.principal} title={c.welcomeTitle(role)} />
          {/* NEVER GENERATED. A message the head did not write, printed over
              the head's name, is putting words in a real person's mouth on a
              page their own parents will read. */}
          {paragraphs.length ? (
            <blockquote className={cn("mt-7 max-w-[60ch] text-[1.125rem] leading-[1.6] sm:text-[1.25rem]", INK)}>
              {paragraphs.map((p, i) => <p key={i} className={i ? "mt-4" : undefined}>{p}</p>)}
            </blockquote>
          ) : plan.inPlace.has("principalMessage") ? (
            <Blank className="mt-7">{c.blank.principalMessage}</Blank>
          ) : null}
          <p className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span aria-hidden className="inline-block h-px w-8 self-center bg-[hsl(var(--ds-accent))]" />
            {name ? (
              <span className={cn("text-[1rem]", INK)} style={NAME}>{name}</span>
            ) : plan.inPlace.has("principalName") ? (
              <span className={cn("text-[0.95rem]", SOFT)}>{c.blank.principalName}</span>
            ) : null}
            <span className={cn("text-[0.9rem]", SOFT)}>{role}, {site.instituteName}</span>
          </p>
        </div>
      </div>
    </Sec>
  );
}

/* ── (d) About: asymmetric 60/40. The prospectus paragraph at 60%; at 40%
      the established year as a large numeral in the school's colour, the
      no-photography playbook's fourth move, with the board line under it. ── */
function AboutSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c, plan, place } = ctx;
  const about = text(site.about);
  const paragraphs = about.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const year = text(site.establishedYear) || text(site.established);
  const board = text(site.boardOrAffiliation);
  const aside = year || board;
  return (
    <Sec {...shell(ctx, "about")}>
      <Head id="h-about" theme={theme} label={c.sectionLabel.about} title={c.aboutTitle(site.instituteName)} />
      <div className={cn("mt-8", aside && "grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16")}>
        <div className="max-w-[64ch]">
          {paragraphs.length ? (
            paragraphs.map((p, i) => (
              <p key={i} className={cn("text-[1.05rem] leading-[1.65]", i && "mt-4", INK)}>{p}</p>
            ))
          ) : plan.inPlace.has("about") ? (
            <Blank>{c.blank.about}</Blank>
          ) : null}
        </div>
        {aside && (
          <div className="lg:pt-1">
            {year && (
              <p>
                <Label>{c.factEstablished}</Label>
                <span className="mt-3 block tabular-nums text-[hsl(var(--ds-brand-ink))]" style={H1}>{year}</span>
              </p>
            )}
            {board && <p className={cn("max-w-[36ch] text-[0.95rem] leading-relaxed", year ? "mt-6" : "", SOFT)}>{board}</p>}
            {place && <p className={cn("mt-2 text-[0.95rem] leading-relaxed", SOFT)}>{place}</p>}
          </div>
        )}
      </div>
    </Sec>
  );
}

/* ── (e) Academics: age-band ROWS, not cards. Stage name, age range, subjects,
      one line of detail (Brighton: Prep 3-11, College 11-16, Sixth Form 16-18). ── */
function AcademicsSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c } = ctx;
  const courses = (site.courses || []).filter((course) => text(course?.name));
  const ages = ageBounds(site.courses);
  const stages = stageSpan(site.courses);
  const tail = [stages, ages ? `${c.factAges.toLowerCase()} ${c.ageRange(ages.from, ages.to)}` : ""].filter(Boolean).join(", ");
  return (
    <Sec {...shell(ctx, "academics")}>
      <Head id="h-academics" theme={theme} label={c.sectionLabel.academics} title={c.academicsTitle} tail={tail ? `${tail}${c.lang === "hi" ? "।" : "."}` : undefined} className="max-w-[40ch]" />
      <ul className={cn("mt-10 border-t lg:mt-14", LINE)}>
        {courses.map((course, i) => {
          const fee = formatFee(course.fee, site.currency);
          const meta = [
            text(course.timings),
            text(course.seats),
            text(course.mode),
            text(course.duration),
            text(course.batchStarts),
            fee ? `${fee}${text(course.feeNote) ? ` ${course.feeNote}` : ""}` : "",
          ].filter(Boolean);
          const subjects = text(course.subjects);
          const detail = text(course.detail);
          return (
            <li key={i} className={cn("grid gap-x-10 gap-y-3 border-b py-7 lg:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1.15fr)] lg:py-8", LINE)}>
              <div>
                <h3 className={cn("text-[1.25rem] leading-tight", INK)} style={NAME}>{course.name}</h3>
                {text(course.level) && <p className={cn("mt-1.5 text-[0.9rem] tabular-nums", SOFT)}>{course.level}</p>}
              </div>
              <div className="min-w-0">
                {subjects ? (
                  <p className={cn("text-[1rem] leading-relaxed", INK)}>{subjects}</p>
                ) : !detail && !meta.length ? (
                  <p className={cn("text-[0.9rem]", SOFT)}>{c.courseEmptyRow}</p>
                ) : null}
                {meta.length > 0 && <p className={cn("mt-2 text-[0.88rem] leading-relaxed tabular-nums", SOFT)}>{meta.join(" · ")}</p>}
              </div>
              {detail && <p className={cn("min-w-0 text-[0.95rem] leading-relaxed", SOFT)}>{detail}</p>}
            </li>
          );
        })}
      </ul>
    </Sec>
  );
}

/* ── (f) Results: short unit-carrying lines. The figure at the section-head
      size, its unit at 13px under it, no card, no border, no icon (Brighton
      "Record Results": "98% A*-B at A-level"). The one scroll reveal. ─────── */
function ResultsSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c } = ctx;
  const results = (site.results || []).filter((r) => text(r?.achievement));
  const note = text(site.resultsNote);
  return (
    <Sec {...shell(ctx, "results")}>
      <div className="ds-reveal">
        <Head
          id="h-results"
          theme={theme}
          label={c.sectionLabel.results}
          title={text(site.resultsHeading) || c.resultsTitle}
          tag={<ExampleTag site={site} c={c} />}
        />
        <ul className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((result, i) => {
            const { figure, label } = metricParts(result);
            const line = [label, text(result.note)].filter(Boolean).join(". ");
            return (
              <li key={i} className="min-w-0">
                {figure ? (
                  <>
                    <p className={cn("tabular-nums", INK)} style={H2}>{figure}</p>
                    <p className={cn("mt-2.5 text-[0.82rem] leading-snug", SOFT)}>{line}</p>
                  </>
                ) : (
                  <p className={cn("text-[1.05rem] leading-snug", INK)} style={NAME}>{line}</p>
                )}
              </li>
            );
          })}
        </ul>
        <p className={cn("mt-9 max-w-[70ch] text-[0.85rem] leading-relaxed", SOFT)}>{note || c.resultsSub}</p>
      </div>
    </Sec>
  );
}

/* ── (g) Life at the school: unequal tiles. The first spans two columns, the
      third and the last do too, and the grid packs dense. Never four identical
      squares, and every tile carries one checkable line. ────────────────── */
function FacilitiesSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c } = ctx;
  const items = (site.facilities || []).map((f) => text(f)).filter(Boolean);
  const n = items.length;
  return (
    <Sec {...shell(ctx, "facilities")}>
      <Head id="h-facilities" theme={theme} label={c.sectionLabel.facilities} title={c.facilitiesTitle} />
      <ul className={cn("mt-10 grid grid-flow-dense gap-3", n > 1 && "sm:grid-cols-2", n > 2 && "lg:grid-cols-3")}>
        {items.map((item, i) => {
          const { lead, rest } = splitLead(item);
          const wide = n > 2 && (i === 0 || i === 2 || (n >= 6 && i === n - 1));
          return (
            <li
              key={i}
              className={cn(
                "flex min-h-[8rem] flex-col justify-between bg-[hsl(var(--ds-surface-2))] p-6 sm:min-h-[10rem]",
                wide && "sm:col-span-2",
                i === 0 && "sm:min-h-[13rem]",
              )}
              style={{ borderRadius: "var(--ds-radius)" }}
            >
              <span className="text-[0.7rem] font-semibold tabular-nums tracking-[0.14em] text-[hsl(var(--ds-accent))]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="mt-6 sm:mt-8">
                <h3 className={cn("text-[1.15rem] leading-tight", INK)} style={NAME}>{lead}</h3>
                {rest && <p className={cn("mt-1.5 max-w-[46ch] text-[0.92rem] leading-relaxed", SOFT)}>{rest}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Sec>
  );
}

/* ── (h) Our teachers: initials avatar, name, subject, one credential line.
      Three across at desktop. ───────────────────────────────────────────── */
function FacultySection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c, v } = ctx;
  const faculty = (site.faculty || []).filter((f) => text(f?.name));
  return (
    <Sec {...shell(ctx, "faculty")}>
      <Head id="h-faculty" theme={theme} label={v.teachersWord} title={c.facultyTitle} />
      <p className={cn("mt-5 max-w-[56ch] text-[1rem] leading-relaxed", SOFT)}>{c.facultySub}</p>
      <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {faculty.map((person, i) => {
          /* No second full stop after a degree that already ends in one:
             "B.Ed." followed by ". " printed "B.Ed.. 15 years". */
          const line = [text(person.qualification), text(person.experience)]
            .filter(Boolean)
            .reduce((a, b) => (a ? `${a}${/[.!?]$/.test(a) ? "" : "."} ${b}` : b), "");
          return (
            <li key={i} className="flex gap-4">
              <Avatar person={person} className="h-14 w-14 text-[0.9rem]" />
              <div className="min-w-0">
                <h3 className={cn("text-[1.05rem] leading-snug", INK)} style={NAME}>{person.name}</h3>
                {text(person.subject) && <p className="mt-0.5 text-[0.9rem] text-[hsl(var(--ds-brand-ink))]">{person.subject}</p>}
                {line && <p className={cn("mt-1.5 text-[0.88rem] leading-snug tabular-nums", SOFT)}>{line}</p>}
                {text(person.note) && <p className={cn("mt-1 text-[0.88rem] leading-snug", SOFT)}>{person.note}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Sec>
  );
}

/* ── (i) The school itself: photographs at varied crops, or the typographic
      substitute. A caption without a file is a named view of the campus we
      do not yet hold, and six of those set as type ARE the section. ─────── */
const CROPS = ["aspect-[4/5]", "aspect-[16/9]", "aspect-square", "aspect-[16/9]", "aspect-square", "aspect-[4/5]"];

function GallerySection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c } = ctx;
  const entries = (site.gallery || []).filter((g) => text(g?.src) || text(g?.alt));
  const images = entries.filter((g) => text(g.src));
  return (
    <Sec {...shell(ctx, "gallery")}>
      <Head id="h-gallery" theme={theme} label={c.sectionLabel.gallery} title={c.galleryTitle} />
      {images.length ? (
        <ul className="mt-10 columns-2 gap-4 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid">
          {images.map((image, i) => (
            <li key={i}>
              <img
                src={image.src}
                alt={text(image.alt)}
                width={800}
                height={800}
                loading="lazy"
                decoding="async"
                className={cn("w-full object-cover", CROPS[i % CROPS.length])}
                style={{ borderRadius: "min(var(--ds-radius), 8px)" }}
              />
              {text(image.alt) && <p className={cn("mt-2 text-[0.82rem] leading-snug", SOFT)}>{image.alt}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ol className={cn("mt-10 grid border-t sm:grid-cols-2 sm:gap-x-12", LINE)}>
            {entries.map((entry, i) => (
              <li key={i} className={cn("flex gap-5 border-b py-5", LINE)}>
                <span className="pt-1.5 text-[0.72rem] font-semibold tabular-nums tracking-[0.14em] text-[hsl(var(--ds-accent))]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className={cn("text-[1.15rem] leading-snug", INK)} style={NAME}>{entry.alt}</p>
              </li>
            ))}
          </ol>
          <p className={cn("mt-6 max-w-[64ch] text-[0.85rem] leading-relaxed", SOFT)}>{c.galleryCaptionsNote}</p>
        </>
      )}
    </Sec>
  );
}

/* ── (j) Come and see us: the deep band, the page's SECOND and last background
      change, with dated rows (Brighton: "Join us at an Open Morning" and three
      named Saturdays). Always renders; with nothing in the record it carries
      the single blank sentence at the reduced height. ───────────────────── */
function VisitSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c, plan } = ctx;
  const rows = visitRows(site);
  const contact = site.contact || {};
  const phone = text(contact.phone);
  const tel = telHref(contact.phone);
  const wa = waHref(contact.whatsapp, `Hello ${site.instituteName}. I would like to visit the school.`);
  const mail = mailHref(contact.email, `Visiting ${site.instituteName}`);
  const hours = text(contact.hours);
  const anything = Boolean(tel || wa || mail);
  return (
    <section
      id="visit"
      aria-labelledby="h-visit"
      className={cn(schoolPad(ctx.steps.visit || "loud"), ANCHOR, "bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]")}
    >
      <div className="container-page lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
        <div>
          <Head id="h-visit" theme={theme} tone="band" label={c.sectionLabel.visit} title={<Accented parts={c.visitTitle} tone="band" />} className="max-w-[24ch]" />
          <p className="mt-5 max-w-[50ch] text-[1.02rem] leading-relaxed">{c.visitSub}</p>
          {anything && (
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
              {tel && (
                /* flex-wrap: in the uppercase heavy theme the label and an
                   unbreakable number at this size are wider than a 320px
                   phone, so the label goes above the number there rather
                   than pushing the page sideways. */
                <a href={tel} className={cn("inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums", FOCUS_BAND)} style={H2}>
                  <span className="text-[0.66rem] font-semibold uppercase not-italic tracking-[0.14em]" style={{ fontFamily: "var(--ds-body)", letterSpacing: "0.14em" }}>
                    {c.labelCall}
                  </span>
                  <span className="underline decoration-[hsl(var(--ds-on-brand)/0.35)] underline-offset-[6px] hover:decoration-[hsl(var(--ds-on-brand))]">
                    {unbreakable(phone)}
                  </span>
                </a>
              )}
              {wa ? (
                <Action href={wa} external tone="band">{c.labelWhatsapp}<ArrowUpRight className="h-4 w-4" aria-hidden /></Action>
              ) : mail ? (
                <Action href={mail} tone="band">{c.labelEmail}</Action>
              ) : null}
            </div>
          )}
          {hours && <p className="mt-6 max-w-[52ch] text-[0.9rem] leading-relaxed tabular-nums">{hours}</p>}
        </div>

        <div className="mt-12 lg:mt-1">
          <Label tone="band">{c.visitDatesLabel}</Label>
          {rows.length ? (
            <ul className="mt-4 border-t border-[hsl(var(--ds-on-brand)/0.28)]">
              {rows.map((row, i) => (
                <li key={i} className="grid gap-x-8 gap-y-1 border-b border-[hsl(var(--ds-on-brand)/0.28)] py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                  {/* Printed exactly as the school wrote it. Schools write
                      "From Monday" and "Immediate effect", and "Invalid Date"
                      on a page carrying their name is worse than no parser. */}
                  <p className="text-[1rem] leading-snug tabular-nums" style={NAME}>{row.lead}</p>
                  {row.rest && <p className="text-[0.92rem] leading-relaxed">{row.rest}</p>}
                </li>
              ))}
            </ul>
          ) : plan.inPlace.has("visitDates") ? (
            <Blank tone="band" className="mt-4">{c.blank.admissionsDates}</Blank>
          ) : null}
          {text(site.admissionsHeadline) && rows.length > 0 && (
            <p className="mt-5 text-[0.9rem] leading-relaxed tabular-nums">{site.admissionsHeadline}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── (k) How to apply: numbered steps, documents, dates. Reference for a parent
      who has already decided to visit, which is why it follows the band. ── */
function AdmissionsSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c, plan } = ctx;
  const a = site.admissions || {};
  const steps = (a.steps || []).map((s) => text(s)).filter(Boolean);
  const documents = (a.documents || []).map((d) => text(d)).filter(Boolean);
  const dates = text(a.dates);
  const note = text(a.note);
  return (
    <Sec {...shell(ctx, "admissions")}>
      <Head id="h-admissions" theme={theme} label={c.sectionLabel.admissions} title={c.admissionsTitle} />
      <p className={cn("mt-5 max-w-[56ch] text-[1rem] leading-relaxed", SOFT)}>{c.admissionsSub}</p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Label>{c.admissionsProcess}</Label>
          {steps.length ? (
            <ol className={cn("mt-4 border-t", LINE)}>
              {steps.map((step, i) => (
                <li key={i} className={cn("grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 border-b py-6 sm:grid-cols-[4rem_minmax(0,1fr)]", LINE)}>
                  <span aria-hidden className="tabular-nums leading-none text-[hsl(var(--ds-brand-ink))]" style={H2}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className={cn("pt-1 text-[1rem] leading-relaxed", INK)}>{step}</p>
                </li>
              ))}
            </ol>
          ) : plan.inPlace.has("admissionsSteps") ? (
            <Blank className="mt-4">{c.blank.admissionsSteps}</Blank>
          ) : null}
          {note && <p className={cn("mt-6 max-w-[64ch] text-[0.92rem] leading-relaxed", SOFT)}>{note}</p>}
        </div>

        <div className="space-y-9">
          {(documents.length > 0 || plan.inPlace.has("admissionsDocuments")) && (
            <div>
              <Label>{c.admissionsBring}</Label>
              {documents.length ? (
                <ul className={cn("mt-4 border-t", LINE)}>
                  {documents.map((doc, i) => (
                    <li key={i} className={cn("flex gap-3 border-b py-3 text-[0.95rem] leading-relaxed", LINE, INK)}>
                      <span aria-hidden className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Blank className="mt-4">{c.blank.admissionsDocuments}</Blank>
              )}
            </div>
          )}
          {dates && (
            <div>
              <Label>{c.admissionsDates}</Label>
              {/* One line per line the school typed, the same reading the visit
                  band gives this field. As a single paragraph, a school that
                  lists three dated events got them run together into one
                  sentence with no break between the last time and the next date. */}
              <div className={cn("mt-3 space-y-2 text-[1rem] leading-relaxed tabular-nums", INK)}>
                {dates.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
              </div>
            </div>
          )}
          <p className={cn("text-[0.85rem] leading-relaxed", SOFT)}>{c.admissionsFormNote}</p>
        </div>
      </div>
    </Sec>
  );
}

/* ── (l) Notices: dated rows, pinned first, the date as the school typed it. ── */
function NoticesSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c } = ctx;
  const notices = orderedNotices(site.notices);
  return (
    <Sec {...shell(ctx, "notices")}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
        <div>
          <Head id="h-notices" theme={theme} label={c.sectionLabel.notices} title={c.noticesTitle} />
          <p className={cn("mt-5 max-w-[40ch] text-[0.92rem] leading-relaxed", SOFT)}>{c.noticesSub}</p>
        </div>
        <ul className={cn("mt-10 border-t lg:mt-0", LINE)}>
          {notices.map((notice, i) => (
            <li key={i} className={cn("grid gap-x-8 gap-y-1 border-b py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)]", LINE)}>
              <p className={cn("pt-1 text-[0.8rem] uppercase tracking-[0.06em] tabular-nums", SOFT)}>{text(notice.date)}</p>
              <div className="min-w-0">
                <h3 className={cn("flex flex-wrap items-baseline gap-x-3 text-[1.05rem] leading-snug", INK)} style={NAME}>
                  {notice.title}
                  {notice.pinned && <Label className="text-[0.6rem]">{c.noticePinned}</Label>}
                </h3>
                {text(notice.body) && <p className={cn("mt-1.5 text-[0.95rem] leading-relaxed", SOFT)}>{notice.body}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Sec>
  );
}

/* ── (m) Contact: two columns, the details and the map. Always renders. Every
      field is optional and an empty one prints nothing here: the missing ones
      go to the closing list, and when ALL are missing the section carries one
      sentence. A phone number invented to fill this block belongs to a real
      stranger who then takes the admission calls. ─────────────────────── */
function ContactSection({ ctx }: { ctx: Ctx }) {
  const { site, theme, c, plan, place } = ctx;
  const d = site.contact || {};
  const phone = text(d.phone);
  const tel = telHref(d.phone);
  const email = text(d.email);
  const hours = text(d.hours);
  const address = (d.addressLines || []).map((l) => text(l)).filter(Boolean);
  const mapUrl = text(d.mapUrl);
  const mapQuery = text(d.mapQuery);
  const embed = mapUrl && /^https?:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(mapUrl);
  const mapLink = mapUrl && !embed ? mapUrl : mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : "";
  const any = Boolean(phone || email || hours || address.length || mapUrl || mapQuery);

  const row = cn("border-b py-4", LINE);
  const link = cn("underline decoration-[hsl(var(--ds-ink-soft)/0.35)] underline-offset-4 hover:decoration-[hsl(var(--ds-ink))]", INK, FOCUS);

  /* Their own listing, or a SEARCH for their own name and city. A guessed pin
     puts a school on a stranger's roof. No frame unless there is a real embed:
     a link occupies the space its sentence needs. */
  const map = embed ? (
    <iframe
      src={mapUrl}
      title={c.mapFrameTitle(site.instituteName)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="mt-3 aspect-[4/3] w-full"
      style={{ borderRadius: "min(var(--ds-radius), 8px)" }}
    />
  ) : mapLink ? (
    <a href={mapLink} target="_blank" rel="noopener noreferrer" className={cn("mt-3 inline-flex items-center gap-2 text-[0.95rem]", link)}>
      {c.mapLink(site.instituteName)}
      <ArrowUpRight className="h-4 w-4 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden />
    </a>
  ) : null;

  return (
    <Sec {...shell(ctx, "contact")}>
      <Head id="h-contact" theme={theme} label={c.sectionLabel.contact} title={c.contactTitle(site.instituteName)} />
      {!any ? (
        plan.inPlace.has("contact") ? <Blank className="mt-8">{c.blank.contactAll}</Blank> : null
      ) : (
        /* Two columns of rows: how to reach them on the left, where they are
           on the right, with the map under the address. Layout never depends
           on a blank: a missing column simply is not there. */
        <div className="mt-10 grid gap-x-16 gap-y-0 lg:grid-cols-2">
          {(phone || email) && (
            <dl className={cn("border-t", LINE)}>
              {phone && (
                <div className={row}>
                  <dt><Label>{c.labelPhone}</Label></dt>
                  <dd className="mt-2">
                    {tel ? (
                      <a href={tel} className={cn("text-[1.35rem] tabular-nums", link)} style={NAME}>{unbreakable(phone)}</a>
                    ) : (
                      <span className={cn("text-[1.35rem]", INK)} style={NAME}>{phone}</span>
                    )}
                  </dd>
                </div>
              )}
              {email && (
                <div className={row}>
                  <dt><Label>{c.labelEmail}</Label></dt>
                  <dd className="mt-2">
                    <a href={`mailto:${email}`} className={cn("break-all text-[1.05rem]", link)} style={NAME}>{email}</a>
                  </dd>
                </div>
              )}
              {hours && (
                <div className={row}>
                  <dt><Label>{c.labelHours}</Label></dt>
                  <dd className={cn("mt-2 max-w-[44ch] text-[1rem] leading-relaxed tabular-nums", INK)}>{hours}</dd>
                </div>
              )}
            </dl>
          )}
          {(address.length > 0 || map || (!phone && !email && hours)) && (
            <dl className={cn("border-t", LINE)}>
              {(address.length > 0 || map) && (
                <div className={row}>
                  <dt><Label>{c.labelAddress}</Label></dt>
                  <dd className={cn("mt-2 text-[1rem] leading-relaxed", INK)}>
                    {address.map((line, i) => <span key={i} className="block">{line}</span>)}
                    {!address.length && place && <span className="block">{place}</span>}
                    {map}
                  </dd>
                </div>
              )}
              {!phone && !email && hours && (
                <div className={row}>
                  <dt><Label>{c.labelHours}</Label></dt>
                  <dd className={cn("mt-2 text-[1rem] leading-relaxed tabular-nums", INK)}>{hours}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </Sec>
  );
}

const SECTIONS: Record<DemoSchoolSectionId, (props: { ctx: Ctx }) => JSX.Element> = {
  principal: PrincipalSection,
  about: AboutSection,
  academics: AcademicsSection,
  results: ResultsSection,
  facilities: FacilitiesSection,
  faculty: FacultySection,
  gallery: GallerySection,
  visit: VisitSection,
  admissions: AdmissionsSection,
  notices: NoticesSection,
  contact: ContactSection,
};

/* ────────────────────────────────────────────────────────────────────────────
   The header

   The institute's FULL NAME, never truncated and never ellipsised: a parent
   checking they are on the right school's site reads the header first, and
   the old build printed "Example" where the name belonged. At 390px it wraps
   to two lines and the crest shrinks. Five nav items at most, verb and
   audience led (Brighton: Parents, Enquire, Apply, Visit), the phone in the
   header as a pill (Mathnasium), and one filled action.
   ──────────────────────────────────────────────────────────────────────── */

function Header({
  site, c, place, nav, navAll, cta, phone, tel, lang, setLang, offered,
}: {
  site: DemoSite;
  c: SchoolCopy;
  place: string;
  nav: DemoSchoolSectionId[];
  navAll: DemoSchoolSectionId[];
  cta: { href: string; external: boolean; label: string };
  phone: string;
  tel: string | null;
  lang: "en" | "hi";
  setLang: (l: "en" | "hi") => void;
  offered: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and hands focus back to the control that opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-[hsl(var(--ds-bg)/0.96)] backdrop-blur", LINE)}>
      <div className="container-page flex items-center gap-3 py-2.5">
        <a href="#top" className={cn("flex min-w-0 items-center gap-2.5 rounded-sm", FOCUS)}>
          <Crest site={site} className="h-8 w-8 text-[0.72rem] sm:h-9 sm:w-9 sm:text-[0.8rem]" />
          <span className="min-w-0">
            {/* NO `truncate`. A name we cut is a name spelled wrong on the
                school's own website, so it wraps instead. */}
            <span className={cn("block max-w-[22ch] text-[0.94rem] leading-[1.2] sm:max-w-[28ch] sm:text-[1.02rem] lg:max-w-[36ch]", INK)} style={NAME}>
              {site.instituteName}
            </span>
            {place && <span className={cn("mt-0.5 block text-[0.72rem] leading-tight", SOFT)}>{place}</span>}
          </span>
        </a>

        <nav aria-label={c.navLabel} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-5 text-[0.88rem]">
            {nav.map((id) => (
              <li key={id}>
                <a href={`#${id}`} className={cn("inline-flex min-h-[1.75rem] items-center hover:text-[hsl(var(--ds-ink))]", SOFT, FOCUS)}>
                  {c.sectionNavLabel[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-5">
          {offered && <DemoLanguageToggle lang={lang} onChange={setLang} tone="ds" />}

          {/* The phone lives in the header, as a pill, not only in the footer.
              FROM 1280px UP. At 768 the pill, the language control, the action
              and the menu button shared one row and squeezed the school's name
              into three lines with the toggle painted over the third, which is
              the exact defect this header exists to avoid. Between 640 and
              1279 the action already opens WhatsApp or the admissions section
              and the number sits in the hero directly underneath. */}
          {tel && (
            <a
              href={tel}
              className={cn(
                "hidden min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3.5 text-[0.82rem] font-semibold tabular-nums",
                "hover:border-[hsl(var(--ds-brand))] xl:inline-flex",
                LINE, INK, FOCUS,
              )}
            >
              <Phone className="h-3.5 w-3.5 text-[hsl(var(--ds-accent))]" aria-hidden />
              {unbreakable(phone)}
            </a>
          )}

          <Action href={cta.href} external={cta.external} className="hidden sm:inline-flex">
            {cta.label}
          </Action>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? c.closeMenu : c.openMenu}
            className={cn("inline-flex h-10 w-10 items-center justify-center border lg:hidden", LINE, INK, FOCUS)}
            style={{ borderRadius: "var(--ds-radius)" }}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div id={panelId} className={cn("border-t bg-[hsl(var(--ds-bg))] lg:hidden", LINE)}>
          <nav aria-label={c.navLabel} className="container-page py-2">
            <ul className="grid grid-cols-2 gap-x-6">
              {navAll.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={() => setOpen(false)}
                    className={cn("block border-b py-3 text-[0.95rem]", "border-[hsl(var(--ds-line)/0.7)]", INK, FOCUS)}
                  >
                    {c.sectionNavLabel[id]}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 py-4 sm:hidden">
              <Action href={cta.href} external={cta.external}>{cta.label}</Action>
              {tel && (
                <a href={tel} className={cn("inline-flex items-center gap-2 text-[0.95rem] font-medium tabular-nums", INK, FOCUS)}>
                  <Phone className="h-4 w-4 text-[hsl(var(--ds-accent))]" aria-hidden />
                  {unbreakable(phone)}
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The page
   ──────────────────────────────────────────────────────────────────────── */

export default function DemoSchool({ site }: { site: DemoSite }) {
  const theme = schoolTheme(site.theme);

  /*
    ENGLISH OR HINDI, AND THIS IS THE ONE PLACE THE PAGE DECIDES.

    `useDemoLangControl` also owns the `lang` attribute on the html element,
    which is what makes a screen reader change voice, so exactly one component
    per page may call it. `offered` is false outside the India market and the
    control does not render there, because a language switch on a Manchester
    school's website is the single clearest sign the page came off a template.
  */
  const { lang, setLang, offered } = useDemoLangControl(site);
  const v = demoVocabulary(site, lang);
  const c = schoolCopy(lang, v);

  const place = schoolPlace(site);
  const contact = site.contact || {};
  const phone = text(contact.phone);
  const tel = telHref(contact.phone);

  /* ── What renders ─────────────────────────────────────────────────────── */
  const order = schoolSectionOrder(theme);
  const rendered = renderedSections(site, order);
  const has = (id: DemoSchoolSectionId) => rendered.includes(id);

  /* ── The first screen ─────────────────────────────────────────────────── */
  const tagline = text(site.tagline);
  const facts = schoolFacts(site, c, place);
  const photo = text(site.heroImage);
  const second: "photo" | "facts" | "none" = photo ? "photo" : facts.length >= 2 ? "facts" : "none";
  /* The four facts are printed ONCE on the first screen. The type-led hero
     carries them itself; the other two carry them in the second column when
     there is no photograph, and only with a photograph do they drop to Doon's
     4-up row under the hero. */
  const factsRow = theme.hero !== "type-led" && second === "photo" && facts.length >= 2;

  const board = boardLead(site.boardOrAffiliation);
  const ages = ageBounds(site.courses);
  const eyebrow =
    [board, ages ? `${c.factAges} ${c.ageRange(ages.from, ages.to)}` : ""].filter(Boolean).join(" · ") || place;

  /* The school's own line when they wrote one, printed in whatever language
     they wrote it in and never translated. Only OUR fallback follows the
     toggle, and it promises nothing: no session, no year, no deadline. */
  const admissionsLine = text(site.admissionsHeadline) || c.admissionsLineFallback;
  const datesLine = visitRows(site)[0]?.lead || "";

  const act = heroAction(site, has("admissions"));
  const action = { href: act.href, external: act.external, label: c.heroAction[act.kind], arrow: act.kind === "apply" || act.kind === "visit" };

  /* ── Blanks: what the reader sees in place, and what goes to the list ─── */
  const anyContact = Boolean(
    phone || text(contact.email) || text(contact.hours) ||
    (contact.addressLines || []).some((l) => text(l)) || text(contact.mapUrl) || text(contact.mapQuery),
  );
  const candidates: { key: string; text: string }[] = [];
  if (!tagline) candidates.push({ key: "tagline", text: c.blank.tagline });
  for (const id of rendered) {
    if (id === "principal") {
      if (!text(site.principalMessage)) candidates.push({ key: "principalMessage", text: c.blank.principalMessage });
      if (!text(site.principalName)) candidates.push({ key: "principalName", text: c.blank.principalName });
    }
    if (id === "about" && !text(site.about)) candidates.push({ key: "about", text: c.blank.about });
    if (id === "visit" && !visitRows(site).length) candidates.push({ key: "visitDates", text: c.blank.admissionsDates });
    if (id === "admissions") {
      const a = site.admissions || {};
      if (!(a.steps || []).some((s) => text(s))) candidates.push({ key: "admissionsSteps", text: c.blank.admissionsSteps });
      if (!(a.documents || []).some((s) => text(s))) candidates.push({ key: "admissionsDocuments", text: c.blank.admissionsDocuments });
    }
    if (id === "contact" && !anyContact) candidates.push({ key: "contact", text: c.blank.contactAll });
  }
  const dropped: string[] = [];
  const invitation: Partial<Record<DemoSchoolSectionId, string>> = {
    about: c.blank.about,
    principal: c.blank.principalMessage,
    academics: c.blank.courses,
    results: c.blank.results,
    facilities: c.blank.facilities,
    faculty: c.blank.faculty,
    gallery: c.blank.gallery,
    admissions: c.blank.admissionsSteps,
    notices: c.blank.notices,
  };
  for (const id of order) if (!has(id) && invitation[id]) dropped.push(invitation[id] as string);
  if (!text(site.established) && !text(site.establishedYear)) dropped.push(c.blank.established);
  if (!text(site.boardOrAffiliation)) dropped.push(c.blank.board);
  if (anyContact) {
    if (!phone) dropped.push(c.blank.phone);
    if (!text(contact.email)) dropped.push(c.blank.email);
    if (!(contact.addressLines || []).some((l) => text(l))) dropped.push(c.blank.address);
    if (!text(contact.hours)) dropped.push(c.blank.hours);
  }
  const plan = planBlanks(candidates, dropped);

  /* ── Rhythm and the one rule ──────────────────────────────────────────── */
  const steps = schoolSteps(rendered, factsRow ? "tight" : null);
  const ruleAt = schoolRuleSection(rendered);
  const stillStep: SchoolStep = steps.contact === "tight" ? "normal" : "tight";

  const nav = NAV_PRIORITY.filter((id) => has(id)).slice(0, 5);

  const ctx: Ctx = { site, theme, c, v, place, plan, steps, ruleAt };

  return (
    /*
      The theme's tokens are scoped to THIS element, so none of them reaches the
      global stylesheet and nothing on the rest of the site can inherit them.
      `demoThemeStyle` also pins `color-scheme: only light`: a school's website
      has no dark mode, and the page renders identically whatever next-themes
      class the visitor's browser has stored.
    */
    <div className="demo-school min-h-screen" style={{ ...demoThemeStyle(theme), fontFamily: "var(--ds-body)" }}>
      <style>{SCHOOL_CSS + DEMO_HINDI_CSS}</style>
      <Seo
        /* NOINDEX. The route sets it too, and that is the belt under this
           brace: the page carries a real school's name over content that is
           partly placeholder, so in a search result it would compete with the
           school's own site and mislead a parent who found it there. */
        noindex
        title={`${site.instituteName}${place ? `, ${place}` : ""}`}
        description={`A demonstration website built by Ideovent Technologies for ${site.instituteName}${place ? `, ${place}` : ""}. Not the institute's live site.`}
        path={`/site/${site.slug}`}
      />

      {/* ONE bar above the school's own masthead, and the credit block at the
          very foot of the page. Both live in @/pages/site/DemoMarker, shared
          with the coaching template, because a marker one template can forget
          is a marker that will be missing from the demo that matters. */}
      <DemoRibbon site={site} />

      <a
        href="#school-main"
        className="sr-only z-[100] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:border focus:border-[hsl(var(--ds-brand))] focus:bg-[hsl(var(--ds-surface))] focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-[hsl(var(--ds-ink))] focus:shadow-lg"
      >
        {c.skipToMain}
      </a>

      <Header
        site={site}
        c={c}
        place={place}
        nav={nav}
        navAll={rendered}
        /* The header's one filled action carries the SHORT vocabulary label
           ("Admission enquiry"); the hero spells the route out. The long
           label in the header pushed the name onto two lines at 1440. */
        cta={{ ...action, label: v.applyCta }}
        phone={phone}
        tel={tel}
        lang={lang}
        setLang={setLang}
        offered={offered}
      />

      <main id="school-main" tabIndex={-1} className="focus:outline-none">
        {/* ── The admissions status line: one dated line, full width, directly
               under the header (DAIS: "applications ... extended to 30
               September 2026"). The first thing a parent wants to know. ──── */}
        <div className="container-page flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-[0.88rem] sm:text-[0.9rem]">
          <p className="flex min-w-0 items-baseline gap-3">
            <span aria-hidden className="h-[2px] w-4 shrink-0 self-center bg-[hsl(var(--ds-accent))]" />
            <span className={cn("tabular-nums", INK)}>{admissionsLine}</span>
          </p>
          {/* The link waits for 640px. At 375 the dated sentence already wraps
              to two lines and the link took a third, so the strip ran to 90px
              on top of the ribbon and the header before the school's name; the
              hero button and the phone nav both reach "how to apply" anyway. */}
          {has("admissions") && (
            <a href="#admissions" className={cn("hidden shrink-0 items-center gap-1 font-medium text-[hsl(var(--ds-brand-ink))] underline-offset-4 hover:underline sm:inline-flex", FOCUS)}>
              {c.stripLink}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>

        <Hero
          site={site}
          theme={theme}
          c={c}
          eyebrow={eyebrow}
          tagline={tagline}
          taglineBlank={plan.inPlace.has("tagline")}
          action={action}
          phone={phone}
          tel={tel}
          datesLine={datesLine}
          facts={facts}
          second={second}
        />

        {/* ── The facts row, only when the hero carried a photograph instead
               of the panel: Doon's four stat cards, Exeter's "Go Figure". ─── */}
        {factsRow && (
          <Sec id="facts" step="tight">
            <FactPanel facts={facts} variant="row" site={site} c={c} />
          </Sec>
        )}

        {rendered.map((id) => {
          const Component = SECTIONS[id];
          return <Component key={id} ctx={ctx} />;
        })}

        {/* ── What we still need from you: every invitation that did not fit
               in place, as one plain list. A page with twelve scattered blanks
               reads as broken; a page with a few and one honest list reads as
               a next step. ───────────────────────────────────────────────── */}
        {plan.deferred.length > 0 && (
          <Sec id="still-need" step={stillStep} labelledBy="h-still-need">
            <Head id="h-still-need" theme={theme} label={c.stillNeedLabel} title={c.stillNeedTitle} />
            <p className={cn("mt-5 max-w-[60ch] text-[1rem] leading-relaxed", SOFT)}>{c.stillNeedLead}</p>
            <ul className="mt-8 grid max-w-5xl gap-x-10 gap-y-3 sm:grid-cols-2">
              {plan.deferred.map((line, i) => (
                <li key={i} className={cn("flex gap-3 text-[0.95rem] leading-relaxed", SOFT)}>
                  <span aria-hidden className="mt-[0.7rem] h-[2px] w-4 shrink-0 bg-[hsl(var(--ds-accent))]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Sec>
        )}

        {/* ── The school's own footer ──────────────────────────────────── */}
        <footer className="pb-12 pt-6 sm:pb-14">
          <div className="container-page grid gap-x-12 gap-y-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
            <div className="flex items-start gap-3">
              <Crest site={site} className="h-10 w-10 text-[0.82rem]" />
              <div>
                <p className={cn("max-w-[24ch] text-[1rem] leading-snug", INK)} style={NAME}>{site.instituteName}</p>
                {place && <p className={cn("mt-1 text-[0.85rem]", SOFT)}>{place}</p>}
                {(text(site.established) || text(site.establishedYear)) && (
                  <p className={cn("mt-0.5 text-[0.85rem] tabular-nums", SOFT)}>{text(site.established) || site.establishedYear}</p>
                )}
              </div>
            </div>

            <nav aria-label={c.footerNavLabel}>
              <Label>{c.footerSections}</Label>
              <ul className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[0.9rem]">
                {rendered.map((id) => (
                  <li key={id}>
                    <a href={`#${id}`} className={cn("hover:text-[hsl(var(--ds-ink))]", SOFT, FOCUS)}>{c.sectionNavLabel[id]}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="text-[0.9rem]">
              {tel && (
                <a href={tel} className={cn("block tabular-nums hover:text-[hsl(var(--ds-ink))]", INK, FOCUS)} style={NAME}>
                  {unbreakable(phone)}
                </a>
              )}
              {text(contact.email) && (
                <a href={`mailto:${contact.email}`} className={cn("mt-1 block break-all hover:text-[hsl(var(--ds-ink))]", SOFT, FOCUS)}>{contact.email}</a>
              )}
              <a href="#top" className={cn("mt-4 inline-block underline decoration-[hsl(var(--ds-ink-soft)/0.35)] underline-offset-4 hover:text-[hsl(var(--ds-ink))]", SOFT, FOCUS)}>
                {c.backToTop}
              </a>
            </div>
          </div>
          {site.isExample && (
            /* The container and the measure are two elements. `container-page`
               centres itself with an auto margin, so putting `max-w-[80ch]` on
               the SAME element shrank the container and slid its gutter to
               93px at 768 while every other section sat at 32px, which is the
               one thing scripts/measure-gutters.mjs exists to catch. */
            <div className="container-page">
              <p className={cn("mt-10 max-w-[80ch] text-[0.8rem] leading-relaxed", SOFT)}>{c.exampleFooterNote}</p>
            </div>
          )}
        </footer>
      </main>

      {/* Ideovent's own credit block, in Ideovent's navy. It is the one place
          on the page where we are the speaker, and the visual break is the
          point: everything above it belongs to the school and this does not. */}
      <DemoMarker site={site} />
    </div>
  );
}
