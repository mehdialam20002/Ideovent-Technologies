import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { DemoMarker, DemoRibbon } from "@/pages/site/DemoMarker";
import type {
  DemoCourse, DemoFaculty, DemoNotice, DemoPoint, DemoResult, DemoScheduleRow, DemoSite,
} from "@/lib/cms/types";
import { demoMarket } from "@/lib/demo/record";
import { demoVocabulary } from "@/lib/demo/vocabulary";
import { DEMO_HINDI_CSS, useDemoLangControl, type DemoLang } from "@/lib/demo/language";
import { DemoLanguageToggle } from "@/pages/site/DemoLanguageToggle";
import { coachingCopy, type CoachingCopy } from "@/lib/demo/copy/coaching";
import {
  coachingPad, coachingSteps, coachingTheme, coachingThemeStyle,
  type CoachingSectionId, type CoachingStep, type CoachingTheme,
} from "@/lib/demo/coachingThemes";
import {
  coachingFee, coachingFeeFrom, coachingNextStart, initials, instituteWhatsappHref, kept, mailHref, mapHref,
  mayShowPhoto, shortPlace, telHref, text,
} from "@/lib/demo/coaching/copy";
import { unbreakable } from "@/lib/typography";
import { cn } from "@/lib/utils";

/**
 * THE COACHING INSTITUTE DEMO.
 *
 * Not a proposal and not a pitch page. It is the institute's own website,
 * built, with their name on the masthead, and Mehdi sends the link saying
 * "dekhiye, aapke liye ye website banayi hai". A director who opens it should
 * see their institute, their batches and their city before they think anything
 * else. Everything below follows from that one sentence.
 *
 * ── WHAT A COACHING SITE SELLS, AND WHY THIS PAGE IS SHAPED LIKE THIS ─────
 * A school sells admission and trust: the head, the building, the process. A
 * coaching institute sells RESULTS and BATCHES. A parent lands here with four
 * questions and they arrive in this order:
 *
 *   what do you teach · when does the next batch start · what does it cost ·
 *   did it work for anybody
 *
 * So the hero answers the first two above the fold and the batches section is
 * the page rather than a sub-page. Every batch, its timing and its fee are in
 * the DOM as text, readable by a phone and by Google, and never in a PDF.
 *
 * ── THE FIVE RULES THAT SHAPE THE CODE ───────────────────────────────────
 *
 * 1. NOTHING IS INVENTED. No fallback phone number, no sample rank, no stock
 *    face, no made-up fee, no affiliation. Every empty field prints a
 *    placeholder written in the second person to the director. A fabricated
 *    result on a page carrying a real institute's name is something a parent
 *    could act on and the institute could be held to.
 *
 * 2. THE HERO'S SECOND COLUMN HOLDS TRUE CONTENT OR IT DOES NOT EXIST. The
 *    old build left 940px of nothing at 1440. `HeroSecond` has three branches
 *    and none of them is an empty half: the batch board, an "ask us" panel of
 *    three real rows, or the column collapses and the hero runs single at a
 *    24ch measure with the monogram set large and low.
 *
 * 3. BOTH STATES ARE DESIGNED. The example record is full and a real record
 *    usually is not. A section with nothing in it DOES NOT RENDER; its
 *    invitation moves into one closing block instead of leaving a hole. The
 *    four that always render are the hero, the batches, where-we-are and the
 *    enquiry, and those collapse to a single sentence rather than to a frame.
 *    See `planBlanks` below, which is the whole mechanism in one function.
 *
 * 4. A FACE NEEDS CONSENT. `mayShowPhoto` gates every photograph of a person,
 *    student and teacher alike, on `photoConsent`. A student's face on a
 *    website they have not agreed to is the most damaging thing this page
 *    could carry and it is the one thing a reviewer would not notice missing.
 *
 * 5. TWO DISPLAY SIZES, TWO BACKGROUND CHANGES, ONE HAIRLINE, TWO SERIF
 *    ACCENTS. `H1` and `H2` below are the only display sizes on the page and
 *    every large figure uses `H2` rather than introducing a third. The hero
 *    and the closing enquiry band are the only two grounds that differ from
 *    the page. The single 1px section rule sits where persuasion ends and
 *    reference begins, which is the FAQ, exactly as 21st.dev does it.
 *
 * ── WHERE THE COLOURS COME FROM ──────────────────────────────────────────
 * `src/lib/demo/coachingThemes.ts` holds five themes, each with a light and a
 * dark token table, measured in both by scripts/check-demo-contrast.mjs.
 * `coachingThemeStyle` hands both tables over as `--dcl-*` and `--dcd-*`, and
 * one rule pair in src/index.css maps whichever is current onto `--dc-*`. This
 * file reads `--dc-*` and states no colour of its own.
 */

/* ────────────────────────────────────────────────────────────────────────────
   The two display sizes, and nothing else

   21st.dev runs its entire homepage on an h1 at 64px and every h2 at 44px, all
   at one weight, and gets its contrast from COLOUR and FAMILY instead. There
   is no 32px heading on that page and there is none on this one. `--dc-scale`
   lets a theme run its voice smaller (the spaced-caps voice needs to) without
   introducing a third size.
   ──────────────────────────────────────────────────────────────────────── */

const DISPLAY: CSSProperties = {
  fontFamily: "var(--dc-display)",
  fontWeight: "var(--dc-display-weight)" as unknown as number,
  letterSpacing: "var(--dc-display-tracking)",
  lineHeight: "var(--dc-display-leading)",
  textTransform: "var(--dc-display-transform)" as CSSProperties["textTransform"],
};

/** The hero, and only the hero. */
const H1: CSSProperties = {
  ...DISPLAY,
  fontSize: "calc(clamp(2.5rem, 5.6vw, 4.5rem) * var(--dc-scale))",
};

/** Every section head, and every large figure on the page. */
const H2: CSSProperties = {
  ...DISPLAY,
  fontSize: "calc(clamp(1.75rem, 2.9vw, 2.75rem) * var(--dc-scale))",
};

const INK = "text-[hsl(var(--dc-ink))]";
const SOFT = "text-[hsl(var(--dc-ink-soft))]";
const LINE = "border-[hsl(var(--dc-line))]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--dc-accent))] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--dc-bg))]";
const FOCUS_HERO =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--dc-hero-accent))] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--dc-hero-bg))]";

/** Every anchor target clears the sticky header. */
const ANCHOR = "scroll-mt-[4.75rem] sm:scroll-mt-[5.25rem]";

/* ────────────────────────────────────────────────────────────────────────────
   Blanks: the one style, and the budget that stops them multiplying
   ──────────────────────────────────────────────────────────────────────── */

/**
 * A blank, which is a designed state and not a missing one.
 *
 * `.dc-blank` in src/index.css is a 2px accent rule with 12px of padding and
 * text at the soft ink: normal weight, normal style, no underline, no dashes,
 * no box. It reads as a margin note, which is exactly what it is. It occupies
 * the space its SENTENCE needs and never the space its content would need,
 * which is what kills the 450px empty photo frame the old build carried.
 */
function Blank({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("dc-blank max-w-[62ch] text-[0.95rem] leading-relaxed", className)}>{children}</p>;
}

/** A blank standing in for one short value, inline, at the value's own size. */
function BlankValue({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("dc-blank inline-block text-[0.95rem] leading-snug", className)}>{children}</span>;
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
 * render, so the answer does not depend on the order React happens to walk the
 * tree, and so the closing block can be built from a value rather than from a
 * side effect.
 */
function planBlanks(candidates: { key: string; text: string }[], dropped: string[], limit = 6): BlankPlan {
  const inPlace = new Set<string>();
  const deferred: string[] = [];
  for (const c of candidates) {
    if (inPlace.size < limit) inPlace.add(c.key);
    else deferred.push(c.text);
  }
  for (const d of dropped) if (!deferred.includes(d)) deferred.push(d);
  return { inPlace, deferred };
}

/* ────────────────────────────────────────────────────────────────────────────
   Small shared pieces
   ──────────────────────────────────────────────────────────────────────── */

/** A small-caps label. Always the theme's SECOND colour, never the first. */
function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-[0.66rem] font-semibold uppercase leading-none tracking-[0.14em] text-[hsl(var(--dc-accent))]",
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
 * content, the footer credit repeats it in a sentence, and this tag sits in
 * the head of every section that prints a number. Individual figures are NOT
 * tagged; tagging each one is what produced the dashed-box look the rebuild
 * exists to remove.
 */
function ExampleTag({ site, c }: { site: DemoSite; c: CoachingCopy }) {
  if (!site.isExample) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--dc-ink-soft))]">
      <span aria-hidden className="h-[2px] w-4 bg-[hsl(var(--dc-accent))]" />
      {c.exampleTag}
    </span>
  );
}

/** The institute's monogram, in their own colour. Never a broken image. */
function Monogram({
  site, theme, className, tone = "page",
}: {
  site: DemoSite; theme: CoachingTheme; className?: string; tone?: "page" | "hero";
}) {
  const logo = text(site.logo);
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        width={96}
        height={96}
        decoding="async"
        className={cn("shrink-0 object-contain", className)}
        style={{ borderRadius: "var(--dc-radius)" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-semibold leading-none",
        tone === "hero"
          ? "bg-[hsl(var(--dc-hero-accent))] text-[hsl(var(--dc-hero-bg))]"
          : "bg-[hsl(var(--dc-brand))] text-[hsl(var(--dc-on-brand))]",
        className,
      )}
      style={{ borderRadius: "var(--dc-radius)", fontFamily: "var(--dc-display)" }}
    >
      {initials(site.instituteName)}
    </span>
  );
}

/**
 * The section head: a rule, a small-caps label, the heading, and where a
 * section needs a subtitle, the SAME heading continuing at the same size at
 * reduced ink rather than a smaller second line. 21st.dev gets every subtitle
 * on its homepage that way and never introduces a third type size.
 */
function Head({
  id, theme, label, children, tail, tag, className,
}: {
  id?: string;
  theme: CoachingTheme;
  label?: string;
  children: ReactNode;
  /** The second clause, same element, same size, 58% ink. */
  tail?: ReactNode;
  tag?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-[24ch] sm:max-w-[30ch]", className)}>
      {(label || tag) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {label ? (
            <span className="inline-flex items-center gap-2.5">
              {theme.rule === "block" && (
                <span aria-hidden className="h-[3px] w-6 bg-[hsl(var(--dc-accent))]" />
              )}
              {theme.rule === "tab" && (
                <span aria-hidden className="h-[2px] w-4 bg-[hsl(var(--dc-accent))]" />
              )}
              <Label className={cn(theme.rule === "hair" && "border-b border-[hsl(var(--dc-line))] pb-2")}>
                {label}
              </Label>
            </span>
          ) : (
            <span />
          )}
          {tag}
        </div>
      )}
      <h2 id={id} className={cn("text-balance", INK)} style={H2}>
        {children}
        {/* The MEASURED soft ink, not the ink at 58% alpha. An alpha blend is a
            pair scripts/check-demo-contrast.mjs cannot see, and in every light
            table it landed between 4.04:1 and 4.39:1 on the page ground, under
            AA. The soft ink is 6.7:1 or better everywhere. Same fix the school
            template made for its two-tone heading. */}
        {tail && <span className={SOFT}> {tail}</span>}
      </h2>
    </div>
  );
}

/** One section shell. The step is decided by `coachingSteps`, never by hand. */
function Sec({
  id, step, children, className, labelledBy,
}: {
  id: string;
  step: CoachingStep;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn(coachingPad(step), ANCHOR, className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

type ActionTone = "brand" | "quiet" | "hero" | "heroQuiet";

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
      ? "bg-[hsl(var(--dc-brand))] text-[hsl(var(--dc-on-brand))] hover:opacity-90"
      : tone === "hero"
        ? "bg-[hsl(var(--dc-hero-ink))] text-[hsl(var(--dc-hero-bg))] hover:opacity-90"
        : tone === "heroQuiet"
          /* 0.6, not 0.45: the outline is the only thing that makes this a
             button, so it is held to 3:1 against the hero (WCAG 1.4.11). At
             0.45 it measured 2.55 to 2.91 in all ten tables; at 0.6 the
             lowest is 3.38 (studio, light). */
          ? "border border-[hsl(var(--dc-hero-soft)/0.6)] text-[hsl(var(--dc-hero-ink))] hover:border-[hsl(var(--dc-hero-ink))]"
          : "border border-[hsl(var(--dc-line))] text-[hsl(var(--dc-ink))] hover:border-[hsl(var(--dc-brand))]";
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "inline-flex min-h-[2.875rem] items-center justify-center gap-2 px-5 py-2.5 text-[0.95rem] font-semibold",
        "transition-[opacity,border-color,background-color] duration-150 motion-reduce:transition-none",
        tone === "hero" || tone === "heroQuiet" ? FOCUS_HERO : FOCUS,
        look,
        className,
      )}
      style={{ borderRadius: "var(--dc-radius)", fontFamily: "var(--dc-body)" }}
    >
      {children}
    </a>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Where the two hero actions point

   The order is the institute's, not ours: WhatsApp first where the institute
   published a WhatsApp number, because in Indian coaching that is the number
   that gets answered; then the phone; then email; and only then an anchor to a
   section that always renders. There is no dead button in any branch.
   ──────────────────────────────────────────────────────────────────────── */

function enquiryHref(site: DemoSite, message: string): { href: string; external: boolean } {
  const wa = instituteWhatsappHref(site.contact?.whatsapp, message);
  if (wa) return { href: wa, external: true };
  const tel = telHref(site.contact?.phone);
  if (tel) return { href: tel, external: false };
  const mail = mailHref(site.contact?.email);
  if (mail) return { href: mail, external: false };
  return { href: "#enquire", external: false };
}

/* ────────────────────────────────────────────────────────────────────────────
   The Ideovent marker strip: ONE bar, and only one, and it is the SHARED one

   The old build stacked two full-width bars, roughly 134px at 390px, so the
   institute's own site began below the fold on a phone. The second bar is
   folded into one clause of the sentence and is gone. This template used to
   carry its own copy of the bar; it now renders `DemoRibbon` from
   @/pages/site/DemoMarker, the same component the school template renders,
   because two copies of the mandatory marker drift apart (they already had:
   the school's wrapped to four lines on a phone while this one measured 43px)
   and the two demos a director opens on the same afternoon must carry the
   same bar. The strip's measurements and its reasoning live with it there.
   ──────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────────────
   The header

   The institute's FULL NAME, never truncated and never ellipsised: a parent
   checking they are on the right institute's site reads the header first, and
   the old build printed "Example" where the name belonged. At 390px it wraps
   to two lines and the monogram shrinks. Five nav items at most, the phone in
   the header as a pill (Mathnasium), and one filled action.
   ──────────────────────────────────────────────────────────────────────── */

function Header({
  site, theme, c, nav, cta, lang, setLang, offered,
}: {
  site: DemoSite;
  theme: CoachingTheme;
  c: CoachingCopy;
  nav: { id: string; label: string }[];
  cta: { label: string; href: string; external: boolean };
  lang: DemoLang;
  setLang: (l: DemoLang) => void;
  offered: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const place = shortPlace(site);
  const phone = text(site.contact?.phone);
  const tel = telHref(site.contact?.phone);

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
    <header className={cn("sticky top-0 z-40 border-b bg-[hsl(var(--dc-bg)/0.94)] backdrop-blur", LINE)}>
      <div className="container-page flex items-center gap-3 py-2">
        <a href="#top" className={cn("flex min-w-0 items-center gap-2.5 rounded-sm", FOCUS)}>
          <Monogram site={site} theme={theme} className="h-8 w-8 text-[0.72rem] sm:h-10 sm:w-10 sm:text-[0.85rem]" />
          <span className="min-w-0">
            {/* NO `truncate`. A name we cut is a name spelled wrong on the
                institute's own website, so it wraps instead. On a phone the
                language control and the menu button share the row, so the
                name gets what is left and wraps at 14px; the city under it
                waits for 640px, because the hero says it in the next line
                anyway. */}
            <span
              className={cn("block max-w-[20ch] text-[0.88rem] font-semibold leading-[1.15] sm:text-[1.02rem] lg:max-w-[30ch]", INK)}
              style={{ fontFamily: "var(--dc-display)", letterSpacing: "-0.012em" }}
            >
              {site.instituteName}
            </span>
            {place && <span className={cn("mt-0.5 hidden text-[0.7rem] leading-tight sm:block", SOFT)}>{place}</span>}
          </span>
        </a>

        <nav aria-label={c.navLabel} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-4 text-[0.85rem] xl:gap-5">
            {nav.map((n) => (
              <li key={n.id}>
                <a
                  href={`#${n.id}`}
                  className={cn(
                    "inline-flex min-h-[1.75rem] items-center whitespace-nowrap transition-colors duration-150 hover:text-[hsl(var(--dc-ink))] motion-reduce:transition-none",
                    SOFT, FOCUS,
                  )}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-5">
          {/* ── ENGLISH / हिंदी ──────────────────────────────────────────
              The shared control, the same one the school template renders,
              and visible at EVERY width: on a 375px phone it sits beside the
              menu button rather than inside it, because the reader who needs
              it is the one least likely to go looking. `offered` is false
              outside the India market and nothing renders. */}
          {offered && <DemoLanguageToggle lang={lang} onChange={setLang} tone="dc" />}

          {/* The phone lives in the header, as a pill, not only in the footer. */}
          {tel && (
            <a
              href={tel}
              className={cn(
                "hidden min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3.5 text-[0.82rem] font-semibold tabular-nums",
                "transition-colors duration-150 hover:border-[hsl(var(--dc-brand))] motion-reduce:transition-none",
                /* From 1280px up. Between 768 and 1279 the pill, the language
                   control, the action and the nav do not share a row with the
                   name without wrapping it into three lines; the action there
                   already dials or opens WhatsApp. */
                LINE, INK, FOCUS, "xl:inline-flex",
              )}
            >
              <Phone className="h-3.5 w-3.5 text-[hsl(var(--dc-accent))]" aria-hidden />
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
            style={{ borderRadius: "var(--dc-radius)" }}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div id={panelId} className={cn("border-t bg-[hsl(var(--dc-bg))] lg:hidden", LINE)}>
          <nav aria-label={c.navLabel} className="container-page py-2">
            <ul>
              {nav.map((n) => (
                <li key={n.id}>
                  <a
                    href={`#${n.id}`}
                    onClick={() => setOpen(false)}
                    className={cn("flex min-h-[2.9rem] items-center justify-between border-b text-[0.95rem]", LINE, INK, FOCUS)}
                  >
                    {n.label}
                    <ArrowRight className="h-4 w-4 text-[hsl(var(--dc-accent))]" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3 pb-1">
              <Action href={cta.href} external={cta.external} className="flex-1 sm:hidden">
                {cta.label}
              </Action>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The hero

   min-height 62svh, max 78svh, never 100vh. Left aligned at the page gutter:
   nothing in the first two screens is centred. The headline is the TRUE THING
   LOUD, a real sentence carrying the exams and the city, so the exams are the
   largest type on the screen. The old build set "We prepare for JEE and NEET"
   at 16px next to a placeholder, which was backwards.
   ──────────────────────────────────────────────────────────────────────── */

interface BoardRow {
  name: string;
  chip: string;
  who: string;
  when: string;
  starts: string;
}

/** The four batches a parent came for, drawn from the institute's own list. */
function boardRows(site: DemoSite, courses: DemoCourse[], c: CoachingCopy): BoardRow[] {
  const exams = kept(site.focusAreas);
  return courses.slice(0, 4).map((course) => {
    const name = text(course.name);
    /* The chip is the institute's OWN exam word, matched against the
       institute's OWN batch name. Nothing is classified, guessed or inferred:
       if their exam list does not appear in the batch name there is no chip. */
    const chip = exams.find((e) => e && name.toLowerCase().includes(e.toLowerCase())) || "";
    return {
      name,
      chip,
      who: text(course.level),
      when: text(course.timings),
      starts: text(course.batchStarts),
    };
  });
}

/**
 * THE HERO'S SECOND COLUMN, AND IT IS NEVER EMPTY.
 *
 * Crimson fills the same half with a cut-out portrait bleeding off two edges.
 * We have no photographs and will not buy stock ones, so we fill it with the
 * information the reader actually came for. Strict priority:
 *
 *   1. the batch board, up to four real batches and a link to the rest;
 *   2. no batches: an "ask us" panel of three true rows, phone, WhatsApp,
 *      visiting hours;
 *   3. neither: `null`, and the caller collapses the hero to one column with
 *      the monogram set large and low. Never an empty half, never a frame.
 */
function HeroSecond({
  site, c, rows, compact, variant = "panel", bleed,
}: {
  site: DemoSite;
  c: CoachingCopy;
  rows: BoardRow[];
  compact?: boolean;
  /**
   * `panel`: one bordered column of rows, for the half beside the headline.
   * `row`: one card per batch in a horizontal line, for the heroes that put
   * the board UNDER the headline. A vertical panel under a headline was what
   * pushed three of the five themes past the fold and got clipped.
   */
  variant?: "panel" | "row";
  /** `row` only: run past the right gutter to the viewport edge. */
  bleed?: boolean;
}) {
  const phone = text(site.contact?.phone);
  const wa = text(site.contact?.whatsapp);
  const hours = text(site.contact?.hours);

  if (rows.length > 0 && variant === "row") {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--dc-hero-accent))]">
            {c.boardTitle}
          </span>
          <a
            href="#courses"
            className={cn("inline-flex items-center gap-1 text-[0.76rem] font-medium text-[hsl(var(--dc-hero-soft))] hover:text-[hsl(var(--dc-hero-ink))]", FOCUS_HERO)}
          >
            {c.seeAllBatches}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </a>
        </div>
        {/* The row scrolls inside its own box on a phone. The hero is
            overflow-hidden, so the bleed never reaches the page as a scrollbar. */}
        <ul
          className={cn(
            "flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]",
            bleed && "-mr-[max(1rem,calc((100vw-100%)/2))] pr-4",
          )}
        >
          {rows.map((r, i) => (
            <li
              key={`${r.name}-${i}`}
              className={cn(
                "w-[16.5rem] shrink-0 border border-[hsl(var(--dc-hero-soft)/0.3)] bg-[hsl(var(--dc-hero-ink)/0.05)] px-4 py-4 sm:w-[18.5rem] sm:px-5",
                /* Inside the container the four cards share the width from
                   1024px up, so the last one is never cut at the gutter. The
                   bleeding strip keeps fixed cards: running past the gutter
                   is its whole point. */
                !bleed && "lg:w-auto lg:min-w-0 lg:flex-1",
              )}
              style={{ borderRadius: "var(--dc-radius)" }}
            >
              {r.chip && (
                <span className="block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[hsl(var(--dc-hero-accent))]">
                  {r.chip}
                </span>
              )}
              <span className="mt-1.5 block text-[0.95rem] font-semibold leading-snug text-[hsl(var(--dc-hero-ink))]">
                {r.name}
              </span>
              <span className="mt-3 block text-[0.79rem] leading-snug tabular-nums text-[hsl(var(--dc-hero-soft))]">
                {[r.who, r.when].filter(Boolean).join(" · ")}
              </span>
              {r.starts && (
                <span className="mt-1 block text-[0.82rem] font-medium leading-snug tabular-nums text-[hsl(var(--dc-hero-ink))]">
                  {r.starts}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (rows.length > 0) {
    return (
      <div
        className="border border-[hsl(var(--dc-hero-soft)/0.3)] bg-[hsl(var(--dc-hero-ink)/0.05)]"
        style={{ borderRadius: "var(--dc-radius)" }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[hsl(var(--dc-hero-soft)/0.25)] px-4 py-3 sm:px-5">
          <span className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--dc-hero-accent))]">
            {c.boardTitle}
          </span>
          <a
            href="#courses"
            className={cn("inline-flex items-center gap-1 text-[0.76rem] font-medium text-[hsl(var(--dc-hero-soft))] hover:text-[hsl(var(--dc-hero-ink))]", FOCUS_HERO)}
          >
            {c.seeAllBatches}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </a>
        </div>
        <ul>
          {rows.map((r, i) => (
            <li
              key={`${r.name}-${i}`}
              className={cn(
                "px-4 py-3 sm:px-5 sm:py-[0.85rem]",
                i > 0 && "border-t border-[hsl(var(--dc-hero-soft)/0.2)]",
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                {r.chip && (
                  <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[hsl(var(--dc-hero-accent))]">
                    {r.chip}
                  </span>
                )}
                <span className="min-w-0 text-[0.92rem] font-semibold leading-snug text-[hsl(var(--dc-hero-ink))]">
                  {r.name}
                </span>
              </div>
              <p className="mt-1 text-[0.79rem] leading-snug tabular-nums text-[hsl(var(--dc-hero-soft))]">
                {[r.who, r.when, r.starts].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const askRows = [
    { label: c.labelPhone, value: phone, href: telHref(phone) },
    { label: c.labelWhatsapp, value: wa ? `+${wa.replace(/^\+/, "")}` : "", href: instituteWhatsappHref(wa, c.contactMessage(site.instituteName)) },
    { label: c.labelHours, value: hours, href: null as string | null },
  ].filter((r) => r.value);

  if (askRows.length === 0) return null;

  return (
    <div
      className="border border-[hsl(var(--dc-hero-soft)/0.3)] bg-[hsl(var(--dc-hero-ink)/0.05)]"
      style={{ borderRadius: "var(--dc-radius)" }}
    >
      <div className="border-b border-[hsl(var(--dc-hero-soft)/0.25)] px-4 py-3 sm:px-5">
        <span className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--dc-hero-accent))]">
          {c.askUsTitle}
        </span>
      </div>
      <dl className={cn(compact && "sm:flex sm:flex-wrap")}>
        {askRows.map((r, i) => (
          <div key={r.label} className={cn("px-4 py-3 sm:px-5", i > 0 && "border-t border-[hsl(var(--dc-hero-soft)/0.2)]")}>
            <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--dc-hero-soft))]">
              {r.label}
            </dt>
            <dd className="mt-1 text-[0.95rem] font-medium tabular-nums text-[hsl(var(--dc-hero-ink))]">
              {r.href ? (
                <a href={r.href} className={cn("underline decoration-[hsl(var(--dc-hero-soft)/0.5)] underline-offset-4 hover:decoration-[hsl(var(--dc-hero-ink))]", FOCUS_HERO)}>
                  {unbreakable(r.value)}
                </a>
              ) : (
                r.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Hero({
  site, theme, c, courses, showTaglineBlank, seeBatchesHref, book,
}: {
  site: DemoSite;
  theme: CoachingTheme;
  c: CoachingCopy;
  courses: DemoCourse[];
  showTaglineBlank: boolean;
  seeBatchesHref: string;
  book: { label: string; href: string; external: boolean };
}) {
  const exams = kept(site.focusAreas);
  const place = text(site.city) || shortPlace(site);
  const tagline = text(site.tagline);
  const rows = boardRows(site, courses, c);
  const second = <HeroSecond site={site} c={c} rows={rows} />;
  const hasSecond = second !== null && (rows.length > 0 || Boolean(text(site.contact?.phone) || text(site.contact?.whatsapp) || text(site.contact?.hours)));
  const phone = text(site.contact?.phone);
  const tel = telHref(site.contact?.phone);
  const wa = instituteWhatsappHref(site.contact?.whatsapp, c.contactMessage(site.instituteName));

  /* THE HEADLINE IS A SENTENCE, NOT A NAME.
     "JEE, NEET and Foundation coaching in Patna". The exams come from the
     institute's own `focusAreas` and the city from their own record, so the
     loudest words on the page are true ones. The hinge word is OURS, which is
     the only reason it may take the serif italic accent: the accent is never
     put on a word the institute typed. With no exams on file the headline
     falls back to the institute's own name, and the page's one hero accent
     moves down to the tagline line instead, so there is exactly one either
     way. */
  const examLine =
    exams.length > 1
      ? `${exams.slice(0, -1).join(", ")}${c.heroAnd}${exams[exams.length - 1]}`
      : exams[0] || "";

  const headline = examLine ? (
    <h1 id="hero-heading" className="text-balance text-[hsl(var(--dc-hero-ink))]" style={H1}>
      {examLine}{" "}
      <span className="accent-italic" style={{ color: "hsl(var(--dc-hero-accent))" }}>
        {c.heroVerb}
      </span>
      {place && <span className="text-[hsl(var(--dc-hero-soft))]">{c.heroIn}{place}</span>}
    </h1>
  ) : (
    <h1 id="hero-heading" className="text-balance text-[hsl(var(--dc-hero-ink))]" style={H1}>
      {site.instituteName}
    </h1>
  );

  const eyebrow = (
    <p className="text-[0.72rem] font-semibold uppercase leading-none tracking-[0.12em] text-[hsl(var(--dc-hero-accent))]">
      {examLine ? site.instituteName : place || site.instituteName}
    </p>
  );

  const promise = tagline ? (
    <p className="mt-6 max-w-[42ch] text-[1.06rem] leading-[1.55] text-[hsl(var(--dc-hero-soft))] sm:text-[1.2rem]">
      {tagline}
    </p>
  ) : showTaglineBlank ? (
    <p className="dc-blank mt-6 max-w-[42ch] text-[1.02rem] leading-[1.55] sm:text-[1.1rem]" style={{ color: "hsl(var(--dc-hero-soft))", borderLeftColor: "hsl(var(--dc-hero-accent) / 0.6)" }}>
      {c.ph.tagline}{" "}
      {c.taglineTail.before}
      {c.taglineTail.accent && !examLine ? (
        <span className="accent-italic" style={{ color: "hsl(var(--dc-hero-accent))" }}>
          {c.taglineTail.accent}
        </span>
      ) : (
        c.taglineTail.accent
      )}
      {c.taglineTail.after}
    </p>
  ) : null;

  const actions = (
    <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
      <Action href={seeBatchesHref} tone="hero">
        {c.seeCourses}
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </Action>
      <Action href={book.href} external={book.external} tone="heroQuiet">
        {book.label}
      </Action>
    </div>
  );

  const contactLinks = (tel || wa) && (
    <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.9rem] tabular-nums text-[hsl(var(--dc-hero-soft))]">
      {tel && (
        <a href={tel} className={cn("underline decoration-[hsl(var(--dc-hero-soft)/0.4)] underline-offset-4 hover:text-[hsl(var(--dc-hero-ink))]", FOCUS_HERO)}>
          {unbreakable(phone)}
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={cn("underline decoration-[hsl(var(--dc-hero-soft)/0.4)] underline-offset-4 hover:text-[hsl(var(--dc-hero-ink))]", FOCUS_HERO)}>
          {c.labelWhatsapp}
        </a>
      )}
    </p>
  );

  const left = (
    <div>
      {/* THE EYEBROW AND THE HEADLINE ARE NOT ANIMATED. Together they are the
          first sentence of the page, the institute's name over the exams and
          the city, and nothing may delay it: a director who was sent this link
          is checking one thing first, that it is their institute. The school
          template makes the same choice with its name. The positioning line
          and the actions arrive after it, 60ms apart, and the second column
          runs with the fourth child at 120ms so no delay exceeds the cap. */}
      <div>{eyebrow}</div>
      <div className="mt-4">{headline}</div>
      <div className="dc-in">{promise}</div>
      <div className="dc-in" style={{ animationDelay: "60ms" }}>
        {actions}
        {contactLinks}
      </div>
    </div>
  );

  /* min-height 62svh and NO max-height. The first build capped the hero at
     78svh with overflow hidden, and the cap did the one thing a hero must
     never do: at 375px it cut the headline in half, and in the three themes
     that stack the board under the headline it cut 600px of content off at
     1440. The 78svh figure in the brief is a target the CONTENT is sized to
     (padding, one line of positioning, the card row), not a clip. */
  const shell =
    "relative overflow-hidden bg-[hsl(var(--dc-hero-bg))] text-[hsl(var(--dc-hero-ink))] " +
    "min-h-[62svh] flex items-center py-14 sm:py-16 lg:py-[4.5rem]";

  /* The watermark: the monogram set very large at 7% opacity, bleeding off the
     right edge as ambient mass. It is the no-photography playbook's first
     move and it is the ONLY thing that fills a collapsed second column. */
  const watermark = (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-10 bottom-[-12%] select-none text-[18rem] leading-none opacity-[0.07] sm:-right-16 sm:text-[26rem]"
      style={{ fontFamily: "var(--dc-display)", fontWeight: 800, color: "hsl(var(--dc-hero-ink))" }}
    >
      {initials(site.instituteName)}
    </span>
  );

  /* ── strip: the page's one broken grid ──────────────────────────────────
     The headline runs the full measure and the board bleeds off the right
     gutter under it, cut at the viewport edge. The section is overflow-hidden,
     so the bleed is clipped and never reaches the reader as a page scrollbar.
     Nothing else on the page breaks the container. */
  /* THE SINGLE-COLUMN MEASURES ARE IN REM, NOT CH. `max-w-[24ch]` on a div
     whose own font-size is 16px is 210px, and a 72px headline inside it broke
     one word per line: "JEE, / NEET / and / Foundation / coaching / in /
     Patna", seven lines, which is what the screenshots of signal, studio and
     bulletin showed. 36rem lets the headline run two or three words a line
     and the two buttons sit side by side; the positioning line keeps its own
     42ch measure at its own size. */
  if (theme.hero === "strip" && hasSecond) {
    return (
      <section id="top" aria-labelledby="hero-heading" className={cn(shell, "block")}>
        <div className="container-page w-full">
          <div className="max-w-[44rem]">{left}</div>
        </div>
        <div className="container-page mt-10 w-full sm:mt-12">
          <div className="dc-in" style={{ animationDelay: "120ms" }}>
            <HeroSecond site={site} c={c} rows={rows} variant="row" bleed />
          </div>
        </div>
      </section>
    );
  }

  /* ── column: one measure, the card row beneath, the monogram large and low ── */
  if (theme.hero === "column") {
    /* WITH A CARD ROW, THE MONOGRAM MOVES UP. Set low, it sat directly behind
       the row, and the cards' 5% fill let a 7% letter show through the fourth
       card at 390 and at 1440, which read as a rendering fault rather than as
       ambient mass. So when the row is there the monogram fills the empty
       upper right instead, and only from 1280px, where it clears the 36rem
       measure; below that the row alone carries the lower half. */
    const mark = hasSecond ? (
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 top-[3%] hidden select-none text-[26rem] leading-none opacity-[0.07] xl:block"
        style={{ fontFamily: "var(--dc-display)", fontWeight: 800, color: "hsl(var(--dc-hero-ink))" }}
      >
        {initials(site.instituteName)}
      </span>
    ) : watermark;
    return (
      <section id="top" aria-labelledby="hero-heading" className={cn(shell, "block")}>
        {mark}
        <div className="container-page relative w-full">
          <div className="max-w-[36rem]">{left}</div>
          {hasSecond && (
            <div className="dc-in mt-10 sm:mt-12" style={{ animationDelay: "120ms" }}>
              <HeroSecond site={site} c={c} rows={rows} variant="row" />
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ── figure: the next start date as a numeral over the board ──────────── */
  if (theme.hero === "figure" && hasSecond) {
    /* Labelled with the BATCH it belongs to, not with "Starts": institutes
       write "Starts 6 April 2027" themselves, and "STARTS / Starts 6 April"
       read as a stammer. */
    const nextRow = rows.find((r) => r.starts);
    return (
      <section id="top" aria-labelledby="hero-heading" className={shell}>
        <div className="container-page grid w-full items-center gap-10 lg:grid-cols-[56fr_44fr] lg:gap-14">
          {left}
          <div className="dc-in" style={{ animationDelay: "120ms" }}>
            {nextRow && (
              <p className="mb-5">
                <span className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--dc-hero-accent))]">
                  {nextRow.name}
                </span>
                <span className="mt-2 block text-balance tabular-nums text-[hsl(var(--dc-hero-ink))]" style={H2}>
                  {nextRow.starts}
                </span>
              </p>
            )}
            {second}
          </div>
        </div>
      </section>
    );
  }

  /* ── board: 52/48, the default, and the shape the brief specifies ─────── */
  if (hasSecond) {
    return (
      <section id="top" aria-labelledby="hero-heading" className={shell}>
        <div className="container-page grid w-full items-center gap-10 lg:grid-cols-[52fr_48fr] lg:gap-14">
          {left}
          <div className="dc-in" style={{ animationDelay: "120ms" }}>{second}</div>
        </div>
      </section>
    );
  }

  /* ── The collapse. One column, the monogram as ambient mass, and no second
       column at all. Never an empty half. ─────────────────────────────────── */
  return (
    <section id="top" aria-labelledby="hero-heading" className={shell}>
      {watermark}
      <div className="container-page relative w-full">
        <div className="max-w-[36rem]">{left}</div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The facts row

   Four precise facts on a hairline, immediately under the hero: Doon's four
   stat cards, Exeter's "Go Figure". The type scale is the fix for the named
   defect "the one true value set smaller than the placeholder beside it": the
   VALUE is 1.15rem and the label is 0.66rem, so the true thing is the loud
   thing. It renders only when at least two of the four carry a value, because
   a four-column grid holding one fact and three blanks is a grid with holes.
   ──────────────────────────────────────────────────────────────────────── */

interface Fact { key: string; label: string; value: string; blank: string }

function FactsRow({ facts, site, c }: { facts: Fact[]; site: DemoSite; c: CoachingCopy }) {
  return (
    <Sec id="facts" step="tight">
      <div className="dc-reveal">
        <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.key} className={cn("border-t pt-4", LINE)}>
              <dt><Label>{f.label}</Label></dt>
              <dd className={cn("mt-2.5 text-[1.05rem] font-medium leading-[1.35] tabular-nums sm:text-[1.15rem]", INK)}>
                {f.value ? f.value : <BlankValue>{f.blank}</BlankValue>}
              </dd>
            </div>
          ))}
        </dl>
        {site.isExample && (
          <p className="mt-7"><ExampleTag site={site} c={c} /></p>
        )}
      </div>
    </Sec>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The thin band under the hero

   Crimson runs one line and one button on a contrasting ground directly below
   the hero. It breaks the section rhythm cheaply, it is the only `band` step
   on the page, and it stops the reader falling from a deep hero straight into
   a long table.
   ──────────────────────────────────────────────────────────────────────── */

function Band({ c, cta }: { c: CoachingCopy; cta: { label: string; href: string; external: boolean } }) {
  return (
    <section className={cn(coachingPad("band"), "bg-[hsl(var(--dc-surface-2))]")}>
      <div className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <p className={cn("text-[0.98rem] font-medium sm:text-[1.05rem]", INK)}>{c.bandLine}</p>
        <a
          href={cta.href}
          {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={cn(
            "inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-[hsl(var(--dc-brand-ink))]",
            "underline decoration-[hsl(var(--dc-brand-ink)/0.35)] underline-offset-[5px] hover:decoration-[hsl(var(--dc-brand-ink))]",
            FOCUS,
          )}
        >
          {c.bandCta}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Batches: the section that converts, in three layouts

   Rows, never cards, in two of the three. A real table set well is the
   best-looking object on a coaching site and it is the thing nobody else does
   properly. Every figure is tabular, every fee carries "from" rather than
   standing alone, and every row is text in the DOM.
   ──────────────────────────────────────────────────────────────────────── */

interface BatchFields {
  name: string; chip: string; who: string; mode: string; when: string;
  starts: string; seats: string; fee: string; feeNote: string; detail: string;
  subjects: string; duration: string;
}

function batchFields(site: DemoSite, course: DemoCourse, exams: string[]): BatchFields {
  const name = text(course.name);
  const fee = coachingFee(course.fee, site.currency, demoMarket(site));
  return {
    name,
    chip: exams.find((e) => e && name.toLowerCase().includes(e.toLowerCase())) || "",
    who: text(course.level),
    mode: text(course.mode),
    when: [text(course.timings)].filter(Boolean).join(""),
    starts: text(course.batchStarts),
    seats: text(course.seats),
    fee: fee || "",
    feeNote: text(course.feeNote),
    detail: text(course.detail),
    subjects: text(course.subjects),
    duration: text(course.duration),
  };
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center px-2 py-[3px] text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[hsl(var(--dc-accent))] ring-1 ring-[hsl(var(--dc-accent)/0.35)]"
      style={{ borderRadius: "var(--dc-radius)" }}
    >
      {children}
    </span>
  );
}

function BatchLedger({ items, c }: { items: BatchFields[]; c: CoachingCopy }) {
  return (
    <ul className="mt-10">
      {items.map((b, i) => (
        <li key={`${b.name}-${i}`} className={cn("border-t py-6 sm:py-7", LINE)}>
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                {b.chip && <Chip>{b.chip}</Chip>}
                {b.mode && <span className={cn("text-[0.74rem] uppercase tracking-[0.08em]", SOFT)}>{b.mode}</span>}
              </div>
              <h3 className={cn("mt-2 text-[1.2rem] font-semibold leading-[1.22]", INK)} style={{ fontFamily: "var(--dc-display)", letterSpacing: "-0.015em" }}>
                {b.name}
              </h3>
              {b.subjects && <p className={cn("mt-1.5 text-[0.85rem] leading-snug", SOFT)}>{b.subjects}</p>}
            </div>

            <dl className="grid gap-3">
              {b.who && <Cell label={c.batchColumns.who} value={b.who} />}
              {b.duration && <Cell label={c.courseFact.duration} value={b.duration} mono />}
            </dl>

            <dl className="grid gap-3">
              {b.when && <Cell label={c.batchColumns.when} value={b.when} mono />}
              {b.seats && <Cell label={c.seatsLabel} value={b.seats} mono />}
            </dl>

            <dl className="grid gap-3 lg:text-right">
              {b.starts && <Cell label={c.batchColumns.starts} value={b.starts} mono align="right" />}
              {b.fee && <Cell label={c.batchColumns.fee} value={unbreakable(b.fee)} note={b.feeNote} mono align="right" strong />}
            </dl>
          </div>
          {b.detail && <p className={cn("mt-4 max-w-[70ch] text-[0.88rem] leading-relaxed", SOFT)}>{b.detail}</p>}
        </li>
      ))}
    </ul>
  );
}

function Cell({
  label, value, note, mono, align, strong,
}: {
  label: string; value: string; note?: string; mono?: boolean; align?: "right"; strong?: boolean;
}) {
  return (
    <div className={cn(align === "right" && "lg:text-right")}>
      <dt><Label>{label}</Label></dt>
      <dd className={cn("mt-1.5 leading-snug", mono && "tabular-nums", strong ? cn("text-[1.05rem] font-semibold", INK) : cn("text-[0.9rem]", INK))}>
        {value}
        {note && <span className={cn("mt-0.5 block text-[0.74rem] font-normal", SOFT)}>{note}</span>}
      </dd>
    </div>
  );
}

/**
 * Tiles, and they differ from each other rather than repeating one card.
 *
 * 21st.dev's row of three runs three ground colours and mixed polarity. Here
 * the first tile spans two columns and sits on the institute's own colour with
 * light text on it; the rest sit on the surface with dark text. That is one
 * grid that is not four identical squares, and every tile carries a fee, a
 * date and a timing rather than an icon and two lines.
 *
 * TEXT ON THE LEAD TILE IS THE SOLID `on-brand`, never `on-brand` at an alpha.
 * `on-brand` on `brand` is the pair scripts/check-demo-contrast.mjs measures;
 * at 0.75 alpha the same pair rendered at 3.98:1 on the Signal dark table
 * (dark navy at three quarters over a light violet), under AA, and an alpha
 * blend is invisible to the script. The hierarchy inside the tile comes from
 * size and case instead.
 */
function BatchTiles({ items, c }: { items: BatchFields[]; c: CoachingCopy }) {
  return (
    <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((b, i) => {
        const lead = i === 0;
        return (
          <li
            key={`${b.name}-${i}`}
            className={cn(
              "flex flex-col p-6 sm:p-7",
              lead
                ? "bg-[hsl(var(--dc-brand))] text-[hsl(var(--dc-on-brand))] sm:col-span-2"
                : cn("border bg-[hsl(var(--dc-surface))]", LINE, INK),
            )}
            style={{ borderRadius: "var(--dc-radius)" }}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              {b.chip && (
                lead ? (
                  <span className="inline-flex items-center px-2 py-[3px] text-[0.62rem] font-bold uppercase tracking-[0.12em] ring-1 ring-[hsl(var(--dc-on-brand)/0.5)]" style={{ borderRadius: "var(--dc-radius)" }}>
                    {b.chip}
                  </span>
                ) : (
                  <Chip>{b.chip}</Chip>
                )
              )}
              {b.mode && (
                <span className={cn("text-[0.74rem] uppercase tracking-[0.08em]", lead ? "text-[hsl(var(--dc-on-brand))]" : SOFT)}>
                  {b.mode}
                </span>
              )}
            </div>
            <h3
              className={cn("mt-3 text-[1.25rem] font-semibold leading-[1.2]", lead && "sm:text-[1.6rem]")}
              style={{ fontFamily: "var(--dc-display)", letterSpacing: "-0.018em" }}
            >
              {b.name}
            </h3>
            {b.subjects && (
              <p className={cn("mt-2 text-[0.88rem] leading-snug", lead ? "text-[hsl(var(--dc-on-brand))]" : SOFT)}>
                {b.subjects}
              </p>
            )}
            <dl className={cn("mt-5 grid gap-2.5 border-t pt-5 text-[0.85rem] tabular-nums", lead ? "border-[hsl(var(--dc-on-brand)/0.3)]" : LINE)}>
              {[
                b.who && [c.batchColumns.who, b.who],
                b.when && [c.batchColumns.when, b.when],
                b.starts && [c.batchColumns.starts, b.starts],
                b.seats && [c.seatsLabel, b.seats],
              ]
                .filter(Boolean)
                .map((pair) => {
                  const [k, val] = pair as [string, string];
                  return (
                    <div key={k} className="flex items-baseline justify-between gap-4">
                      <dt className={cn("shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.1em]", lead ? "text-[hsl(var(--dc-on-brand))]" : "text-[hsl(var(--dc-accent))]")}>{k}</dt>
                      <dd className="text-right leading-snug">{val}</dd>
                    </div>
                  );
                })}
            </dl>
            {b.fee && (
              <p className={cn("mt-5 text-[1.05rem] font-semibold tabular-nums", lead ? "" : INK)}>
                {unbreakable(b.fee)}
                {b.feeNote && (
                  <span className={cn("ml-1.5 text-[0.78rem] font-normal", lead ? "text-[hsl(var(--dc-on-brand))]" : SOFT)}>
                    {b.feeNote}
                  </span>
                )}
              </p>
            )}
            {b.detail && (
              <p className={cn("mt-4 text-[0.85rem] leading-relaxed", lead ? "text-[hsl(var(--dc-on-brand))]" : SOFT)}>
                {b.detail}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** A departure board: aligned columns, every figure tabular, mono throughout. */
function BatchBoardGrid({ items, c }: { items: BatchFields[]; c: CoachingCopy }) {
  const cols = [c.batchColumns.batch, c.batchColumns.who, c.batchColumns.when, c.batchColumns.starts, c.batchColumns.fee];
  return (
    <div className="mt-10">
      <div className={cn("hidden border-b pb-3 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6", LINE)}>
        {cols.map((col, i) => (
          <span key={col} className={cn("text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--dc-accent))]", i === 4 && "text-right")}>
            {col}
          </span>
        ))}
      </div>
      <ul>
        {items.map((b, i) => (
          <li key={`${b.name}-${i}`} className={cn("border-b py-5", LINE)}>
            <div className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-baseline">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  {b.chip && <Chip>{b.chip}</Chip>}
                  <h3 className={cn("text-[1.05rem] font-semibold leading-snug", INK)} style={{ fontFamily: "var(--dc-display)" }}>
                    {b.name}
                  </h3>
                </div>
                {b.mode && <p className={cn("mt-1 text-[0.74rem] uppercase tracking-[0.08em]", SOFT)}>{b.mode}</p>}
              </div>
              <BoardCell label={c.batchColumns.who} value={b.who} />
              <BoardCell label={c.batchColumns.when} value={b.when} />
              <BoardCell label={c.batchColumns.starts} value={b.starts} />
              <BoardCell label={c.batchColumns.fee} value={b.fee ? unbreakable(b.fee) : ""} note={b.feeNote} right strong />
            </div>
            {b.detail && <p className={cn("mt-3 max-w-[70ch] text-[0.85rem] leading-relaxed", SOFT)}>{b.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BoardCell({ label, value, note, right, strong }: { label: string; value: string; note?: string; right?: boolean; strong?: boolean }) {
  if (!value) return <span className={cn("hidden lg:block", right && "text-right")} aria-hidden>·</span>;
  return (
    <div className={cn(right && "lg:text-right")}>
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--dc-accent))] lg:hidden">{label} </span>
      <span className={cn("tabular-nums", strong ? cn("text-[0.98rem] font-semibold", INK) : cn("text-[0.88rem]", INK))}>{value}</span>
      {note && <span className={cn("block text-[0.72rem]", SOFT)}>{note}</span>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Results

   Allen's "Meet our stars" carries exactly four fields per card: the
   achievement, the exam and year, the course mode, and the student. Four, and
   never a fifth. The figure is set at H2, the page's second and last display
   size, rather than at a third size of its own.
   ──────────────────────────────────────────────────────────────────────── */

function ResultCard({ r, c }: { r: DemoResult; c: CoachingCopy }) {
  const achievement = text(r.achievement);
  const exam = [text(r.exam), text(r.year)].filter(Boolean).join(" ");
  const batch = text(r.note);
  const student = text(r.studentName) || c.nameWithheld;
  const photo = mayShowPhoto(r) ? text(r.photo) : "";
  return (
    <li className={cn("border-t pt-6", LINE)}>
      {photo && (
        <img
          src={photo}
          alt=""
          width={160}
          height={200}
          loading="lazy"
          decoding="async"
          className="mb-4 h-24 w-20 object-cover"
          style={{ borderRadius: "var(--dc-radius)" }}
        />
      )}
      <p className={cn("text-balance tabular-nums", INK)} style={H2}>{achievement}</p>
      <dl className="mt-4 grid gap-1.5 text-[0.85rem]">
        {exam && (
          <div className="flex gap-2">
            <dt className={cn("shrink-0 w-[9.5ch] text-[0.68rem] font-semibold uppercase leading-[1.7] tracking-[0.1em] text-[hsl(var(--dc-accent))]")}>{c.resultFields.exam}</dt>
            <dd className={cn("tabular-nums", INK)}>{exam}</dd>
          </div>
        )}
        {batch && (
          <div className="flex gap-2">
            <dt className={cn("shrink-0 w-[9.5ch] text-[0.68rem] font-semibold uppercase leading-[1.7] tracking-[0.1em] text-[hsl(var(--dc-accent))]")}>{c.resultFields.batch}</dt>
            <dd className={INK}>{batch}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className={cn("shrink-0 w-[9.5ch] text-[0.68rem] font-semibold uppercase leading-[1.7] tracking-[0.1em] text-[hsl(var(--dc-accent))]")}>{c.resultFields.student}</dt>
          <dd className={text(r.studentName) ? INK : SOFT}>{student}</dd>
        </div>
      </dl>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The week, as a designed object

   With no photographs this table IS the section's visual anchor. A real
   timetable set properly beats any stock photograph of somebody else's
   classroom, and it is true content rather than decoration. It is a real
   <table> so a screen reader announces the row and the column, and it scrolls
   inside its own box rather than pushing the page sideways.
   ──────────────────────────────────────────────────────────────────────── */

function Week({ rows, c, note }: { rows: DemoScheduleRow[]; c: CoachingCopy; note: string }) {
  return (
    <>
      <div className={cn("mt-10 overflow-x-auto border", LINE)} style={{ borderRadius: "var(--dc-radius)" }}>
        <table className="w-full min-w-[42rem] border-collapse text-left text-[0.88rem]">
          <caption className="sr-only">{c.scheduleCaption(c.heading.schedule, "")}</caption>
          <thead>
            <tr className="bg-[hsl(var(--dc-surface-2))]">
              {c.scheduleColumns.map((col, i) => (
                <th
                  key={col}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--dc-accent))]",
                    i === 0 && "pl-5",
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${text(r.label)}-${i}`} className={cn("border-t", LINE)}>
                <th scope="row" className={cn("px-4 py-3.5 pl-5 text-left align-top text-[0.9rem] font-semibold leading-snug", INK)}>
                  {text(r.label) || c.emptyCell}
                </th>
                <td className={cn("px-4 py-3.5 align-top tabular-nums", INK)}>{text(r.days) || c.emptyCell}</td>
                <td className={cn("whitespace-nowrap px-4 py-3.5 align-top tabular-nums", INK)}>{text(r.time) || c.emptyCell}</td>
                <td className={cn("px-4 py-3.5 align-top", SOFT)}>{text(r.subject) || c.emptyCell}</td>
                <td className={cn("px-4 py-3.5 align-top", SOFT)}>{text(r.faculty) || c.emptyCell}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className={cn("mt-4 max-w-[70ch] text-[0.85rem] leading-relaxed", SOFT)}>{note}</p>}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The page
   ──────────────────────────────────────────────────────────────────────── */

export default function DemoCoaching({ site }: { site: DemoSite }) {
  const theme = coachingTheme(site.theme);
  const { lang, setLang, offered } = useDemoLangControl(site);
  const v = useMemo(() => demoVocabulary({ ...site, kind: "coaching" }, lang), [site, lang]);
  const c = useMemo(() => coachingCopy(site, lang, v), [site, lang, v]);
  const ph = c.ph;
  const market = demoMarket(site);
  const intl = market === "international";

  const courses = kept(site.courses) as DemoCourse[];
  const results = kept(site.results) as DemoResult[];
  const faculty = kept(site.faculty) as DemoFaculty[];
  const method = kept(site.method) as DemoPoint[];
  const faq = kept(site.faq) as DemoPoint[];
  const schedule = kept(site.schedule) as DemoScheduleRow[];
  const noticesAll = kept(site.notices) as DemoNotice[];
  const notices = [...noticesAll].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  const exams = kept(site.focusAreas);

  const feeFrom = coachingFeeFrom(courses, site.currency, market);
  const established = text(site.established) || (text(site.establishedYear) ? `${c.labelSince} ${text(site.establishedYear)}` : "");
  const place = shortPlace(site);
  const about = text(site.about);
  const affiliation = text(site.boardOrAffiliation);
  const trial = site.trial;
  const hasTrial = Boolean(
    text(trial?.heading) || text(trial?.body) || text(trial?.duration) || text(trial?.bring) || text(trial?.howToBook),
  );
  const contact = site.contact;
  const hasContact = Boolean(
    text(contact?.phone) || text(contact?.whatsapp) || text(contact?.email) ||
    kept(contact?.addressLines).length || text(contact?.hours) || text(contact?.mapUrl) || text(contact?.mapQuery),
  );

  const book = { label: c.trialCta, ...enquiryHref(site, c.trialMessage(site.instituteName)) };
  const ask = { label: c.enquireCta, ...enquiryHref(site, c.contactMessage(site.instituteName)) };

  /* ── What renders, decided once ───────────────────────────────────────── */
  const renders: Record<CoachingSectionId, boolean> = {
    /* Courses always renders. It is this page's admissions section: the thing
       a parent came for, and the one section that collapses to a sentence
       rather than disappearing. */
    courses: true,
    fees: courses.length > 0 && feeFrom !== null,
    results: results.length > 0,
    faculty: faculty.length > 0,
    schedule: schedule.length > 0,
    method: method.length > 0,
    trial: hasTrial,
    notices: notices.length > 0,
    about: Boolean(about || established || affiliation),
  };

  const ordered = theme.sections.filter((id) => renders[id]);
  const steps = coachingSteps(ordered, theme.density, "band");

  /* ── The facts row ────────────────────────────────────────────────────── */
  const facts: Fact[] = [
    { key: "focus", label: c.heroFact.focus, value: exams.join(" · "), blank: ph.focus },
    /* The next start, as the institute wrote it. It is the single most-asked
       question on a coaching site and it used to be the first two batch names
       joined with a dot, which repeated the board sitting directly above. */
    { key: "next", label: c.heroFact.next, value: coachingNextStart(courses), blank: ph.nextBatch },
    { key: "since", label: c.heroFact.since, value: established, blank: ph.established },
    { key: "where", label: c.heroFact.where, value: place, blank: c.heroBlank.where },
  ];
  const factsFilled = facts.filter((f) => f.value).length;
  const showFacts = factsFilled >= 2;

  /* ── The blanks, planned before anything renders ──────────────────────── */
  const candidates: { key: string; text: string }[] = [];
  if (!text(site.tagline)) candidates.push({ key: "hero.tagline", text: ph.tagline });
  if (showFacts) for (const f of facts) if (!f.value) candidates.push({ key: `facts.${f.key}`, text: f.blank });
  if (courses.length === 0) candidates.push({ key: "courses", text: ph.coursesBody });
  if (!hasContact) candidates.push({ key: "contact", text: c.contactBlank });

  const dropped: string[] = [];
  if (courses.length > 0 && !renders.fees) dropped.push(ph.feesBody);
  if (!renders.results) dropped.push(ph.resultsBody);
  if (!renders.faculty) dropped.push(ph.facultyBody);
  if (!renders.schedule) dropped.push(ph.scheduleBody);
  if (!renders.method) dropped.push(ph.methodBody);
  if (!renders.trial) dropped.push(ph.trialBody);
  if (!renders.notices) dropped.push(ph.noticesBody);
  if (!renders.about) dropped.push(ph.aboutBody);
  if (faq.length === 0) dropped.push(ph.faqBody);

  const plan = planBlanks(candidates, dropped);

  /* ── The nav, which lists only what actually rendered ─────────────────── */
  const navAll = [
    ...ordered.map((id) => ({ id, label: c.heading[id], short: c.navShort[id] })),
    ...(faq.length ? [{ id: "questions", label: c.faqHeading, short: c.navShort.questions }] : []),
    { id: "where", label: c.contactHeading, short: c.navShort.where },
  ];
  /* Five slots on one line: the first four sections that rendered, then
     contact, each under its one-word name. The footer lists everything under
     the full headings. */
  const nav = [...navAll.slice(0, 4), navAll[navAll.length - 1]]
    .filter((n, i, arr) => arr.findIndex((m) => m.id === n.id) === i)
    .map((n) => ({ id: n.id, label: n.short }));

  /* ── The steps for the three fixed tail sections, no two adjacent alike ─ */
  const lastStep: CoachingStep = steps.length ? steps[steps.length - 1] : "band";
  const whereStep: CoachingStep = lastStep === "tight" ? "normal" : "tight";
  const faqStep: CoachingStep = whereStep === "normal" ? "tight" : "normal";
  const stillStep: CoachingStep = (faq.length ? faqStep : whereStep) === "tight" ? "normal" : "tight";

  /* The page's ONE 1px section rule, at the point where persuasion ends and
     reference begins. 21st.dev has precisely one border-top on its entire
     homepage and it is on the FAQ. When there is no FAQ it moves down to
     where-we-are, so the page always has exactly one and never two. */
  const ruleOnFaq = faq.length > 0;

  const batches = courses.map((course) => batchFields(site, course, exams));

  const sectionBody = (id: CoachingSectionId, step: CoachingStep) => {
    switch (id) {
      case "courses":
        return (
          <Sec key={id} id="courses" step={courses.length ? step : "tight"} labelledBy="h-courses">
            <Head
              id="h-courses"
              theme={theme}
              label={c.heading.courses}
              tail={courses.length ? c.coursesLead : undefined}
              tag={<ExampleTag site={site} c={c} />}
              className="max-w-[30ch] sm:max-w-[36ch]"
            >
              {c.coursesHeadline}
            </Head>
            {courses.length === 0 ? (
              plan.inPlace.has("courses") ? <Blank className="mt-8">{ph.coursesBody}</Blank> : null
            ) : theme.batches === "tiles" ? (
              <BatchTiles items={batches} c={c} />
            ) : theme.batches === "board" ? (
              <BatchBoardGrid items={batches} c={c} />
            ) : (
              <BatchLedger items={batches} c={c} />
            )}
          </Sec>
        );

      /* ── The fee, answered once, as a heading and never as a table ──────
           MyTutor sets "Handpicked tutors from GBP26/hour" at h2 size above
           the tutor cards and carries no pricing table on the homepage at all.
           This is that line. The word "from" takes the page's second and last
           serif accent, because it is our word and it is the word that makes
           the sentence honest. */
      case "fees": {
        if (!feeFrom) return null;
        return (
          <Sec key={id} id="fees" step={step} labelledBy="h-fees">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <Label>{c.heading.fees}</Label>
                  <ExampleTag site={site} c={c} />
                </div>
                <h2 id="h-fees" className={cn("text-balance", INK)} style={H2}>
                  {c.feesFrom.before}
                  <span className="accent-italic">{c.feesFrom.accent}</span>{" "}
                  <span className="tabular-nums">{unbreakable(feeFrom.figure)}</span>
                  {feeFrom.period && <span className={SOFT}> {feeFrom.period}</span>}
                  {c.feesFrom.after}
                </h2>
              </div>
              <ul className={cn("grid gap-2.5 border-t pt-5 text-[0.92rem] leading-relaxed lg:border-t-0 lg:pt-0", LINE, SOFT)}>
                {feeFrom.notes.map((n) => (
                  <li key={n} className="flex gap-2.5">
                    <span aria-hidden className="mt-[0.62em] h-[2px] w-3 shrink-0 bg-[hsl(var(--dc-accent))]" />
                    {n}
                  </li>
                ))}
                <li className="flex gap-2.5">
                  <span aria-hidden className="mt-[0.62em] h-[2px] w-3 shrink-0 bg-[hsl(var(--dc-accent))]" />
                  {faq.length ? (
                    <span>
                      {c.feesAsk}{" "}
                      <a href="#questions" className={cn("underline decoration-[hsl(var(--dc-ink-soft)/0.4)] underline-offset-4 hover:text-[hsl(var(--dc-ink))]", FOCUS)}>
                        {c.faqHeading}
                      </a>
                    </span>
                  ) : (
                    c.feesAsk
                  )}
                </li>
              </ul>
            </div>
          </Sec>
        );
      }

      case "results":
        return (
          <Sec key={id} id="results" step={step} labelledBy="h-results">
            <Head
              id="h-results"
              theme={theme}
              label={c.heading.results}
              tag={<ExampleTag site={site} c={c} />}
              className="max-w-[26ch] sm:max-w-[32ch]"
            >
              {text(site.resultsHeading) || c.heading.results}
            </Head>
            <ul className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r, i) => (
                <ResultCard key={`${text(r.achievement)}-${i}`} r={r} c={c} />
              ))}
            </ul>
            <p className={cn("mt-9 max-w-[76ch] text-[0.82rem] leading-relaxed", SOFT)}>
              {text(site.resultsNote) || ph.resultsNote}
            </p>
          </Sec>
        );

      case "faculty":
        return (
          <Sec key={id} id="faculty" step={step} labelledBy="h-faculty">
            <Head id="h-faculty" theme={theme} label={c.heading.faculty} className="max-w-[28ch] sm:max-w-[34ch]">
              {c.facultyLead}
            </Head>
            <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {faculty.map((p, i) => {
                const photo = mayShowPhoto(p) ? text(p.photo) : "";
                return (
                  <li key={`${text(p.name)}-${i}`} className={cn("flex gap-4 border-t pt-6", LINE)}>
                    {photo ? (
                      <img src={photo} alt="" width={128} height={128} loading="lazy" decoding="async" className="h-12 w-12 shrink-0 object-cover" style={{ borderRadius: "var(--dc-radius)" }} />
                    ) : (
                      <span
                        aria-hidden
                        className="grid h-12 w-12 shrink-0 place-items-center bg-[hsl(var(--dc-surface-2))] text-[0.82rem] font-semibold text-[hsl(var(--dc-brand-ink))]"
                        style={{ borderRadius: "var(--dc-radius)", fontFamily: "var(--dc-display)" }}
                      >
                        {initials(text(p.name))}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className={cn("text-[1.02rem] font-semibold leading-snug", INK)} style={{ fontFamily: "var(--dc-display)" }}>
                        {text(p.name)}
                      </p>
                      {text(p.subject) && <p className="mt-0.5 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--dc-accent))]">{text(p.subject)}</p>}
                      {text(p.experience) && <p className={cn("mt-2 text-[0.88rem] leading-relaxed tabular-nums", SOFT)}>{text(p.experience)}</p>}
                      {text(p.qualification) && <p className={cn("mt-1 text-[0.85rem] leading-relaxed", SOFT)}>{text(p.qualification)}</p>}
                      {text(p.note) && <p className={cn("mt-1 text-[0.85rem] leading-relaxed", SOFT)}>{text(p.note)}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Sec>
        );

      case "schedule":
        return (
          <Sec key={id} id="schedule" step={step} labelledBy="h-schedule">
            <Head id="h-schedule" theme={theme} label={c.heading.schedule} className="max-w-[28ch] sm:max-w-[34ch]">
              {c.footerTimetable}
            </Head>
            <Week rows={schedule} c={c} note={text(site.scheduleNote)} />
          </Sec>
        );

      /* ── Why parents choose us.
           Mathnasium frames the same three blocks as parent anxieties rather
           than as features: "End the Homework Stress", not "Personalised
           Learning". The record's own titles carry that; the layout's job is
           to keep them as prose rather than turning them into icon cards. It
           is also the page's one asymmetric split. ──────────────────────── */
      case "method":
        return (
          <section key={id} id="method" aria-labelledby="h-method" className={cn(coachingPad(step), ANCHOR)}>
            <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,34fr)_minmax(0,66fr)] lg:gap-20">
              <Head id="h-method" theme={theme} label={c.heading.method} className="lg:sticky lg:top-28 lg:self-start">
                {c.heading.method}
              </Head>
              <ul className="grid gap-9">
                {method.map((m, i) => (
                  <li key={`${text(m.title)}-${i}`} className={cn(i > 0 && "border-t pt-9", i > 0 && LINE)}>
                    <h3 className={cn("max-w-[30ch] text-[1.22rem] font-semibold leading-[1.3]", INK)} style={{ fontFamily: "var(--dc-display)", letterSpacing: "-0.015em" }}>
                      {text(m.title)}
                    </h3>
                    {text(m.body) && <p className={cn("mt-3 max-w-[64ch] text-[0.97rem] leading-relaxed", SOFT)}>{text(m.body)}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );

      /* ── The demo class, as three verbs.
           Mathnasium's "how it works" is three steps and each one is a verb:
           Schedule a Free Assessment, Get a Customized Learning Plan, Start
           Sessions. Ours are the three things a parent actually does. ────── */
      case "trial":
        return (
          <Sec key={id} id="trial" step={step} labelledBy="h-trial">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
              <div>
                <Head id="h-trial" theme={theme} label={c.heading.trial}>
                  {text(trial?.heading) || c.heading.trial}
                </Head>
                {text(trial?.body) && <p className={cn("mt-5 max-w-[56ch] text-[0.97rem] leading-relaxed", SOFT)}>{text(trial?.body)}</p>}
                <dl className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {text(trial?.duration) && <Cell label={c.trialFact.duration} value={text(trial?.duration)} mono />}
                  {text(trial?.bring) && <Cell label={c.trialFact.bring} value={text(trial?.bring)} />}
                </dl>
                <div className="mt-8">
                  <Action href={book.href} external={book.external}>{book.label}</Action>
                </div>
              </div>
              <ol className="grid content-start gap-0">
                {c.trialSteps.map((s, i) => (
                  <li key={s} className={cn("flex gap-5 border-t py-5", LINE)}>
                    <span className="mt-[0.15rem] shrink-0 text-[0.78rem] font-bold tabular-nums text-[hsl(var(--dc-accent))]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={cn("text-[0.98rem] leading-snug", INK)}>{s}</span>
                  </li>
                ))}
                {text(trial?.howToBook) && (
                  <li className={cn("border-t py-5 text-[0.9rem] leading-relaxed", LINE, SOFT)}>{text(trial?.howToBook)}</li>
                )}
              </ol>
            </div>
          </Sec>
        );

      case "notices":
        return (
          <Sec key={id} id="notices" step={step} labelledBy="h-notices">
            <Head id="h-notices" theme={theme} label={c.heading.notices} className="max-w-[26ch]">
              {c.heading.notices}
            </Head>
            <ul className="mt-8 max-w-[70ch]">
              {notices.map((n, i) => (
                <li key={`${text(n.title)}-${i}`} className={cn("border-t py-5", LINE)}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {text(n.date) && <span className={cn("shrink-0 text-[0.78rem] tabular-nums", SOFT)}>{text(n.date)}</span>}
                    {n.pinned && <Label>{c.pinned}</Label>}
                  </div>
                  <p className={cn("mt-1.5 text-[1rem] font-semibold leading-snug", INK)}>{text(n.title)}</p>
                  {text(n.body) && <p className={cn("mt-1.5 text-[0.9rem] leading-relaxed", SOFT)}>{text(n.body)}</p>}
                </li>
              ))}
            </ul>
          </Sec>
        );

      case "about":
        return (
          <Sec key={id} id="about" step={step} labelledBy="h-about">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,60fr)_minmax(0,40fr)] lg:gap-16">
              <div>
                <Head id="h-about" theme={theme} label={c.heading.about} className="max-w-[24ch]">
                  {c.heading.about}
                </Head>
                {about && <p className={cn("mt-6 max-w-[62ch] text-[1.02rem] leading-[1.65]", SOFT)}>{about}</p>}
              </div>
              <dl className="grid content-start gap-0 self-end">
                {established && (
                  <div className={cn("border-t py-4", LINE)}>
                    <dt><Label>{c.labelSince}</Label></dt>
                    <dd className={cn("mt-1.5 text-[0.95rem] tabular-nums", INK)}>{established}</dd>
                  </div>
                )}
                {affiliation && (
                  <div className={cn("border-t py-4", LINE)}>
                    <dt><Label>{c.labelAffiliation}</Label></dt>
                    <dd className={cn("mt-1.5 text-[0.95rem] leading-snug", INK)}>{affiliation}</dd>
                  </div>
                )}
                {place && (
                  <div className={cn("border-t py-4", LINE)}>
                    <dt><Label>{c.heroFact.where}</Label></dt>
                    <dd className={cn("mt-1.5 text-[0.95rem]", INK)}>{place}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Sec>
        );

      default:
        return null;
    }
  };

  const addressLines = kept(contact?.addressLines) as string[];
  const map = mapHref(contact, `${site.instituteName}${place ? `, ${place}` : ""}`);
  const tel = telHref(contact?.phone);
  const mail = mailHref(contact?.email);
  const waHref = instituteWhatsappHref(contact?.whatsapp, c.contactMessage(site.instituteName));

  return (
    <>
      <Helmet>
        {/* The institute's own name, alone. That this is a demonstration is
            carried by the marker strip, the credit block and the /site/
            address, which are three places a reader cannot miss. */}
        <title>{site.instituteName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div
        className="demo-coaching min-h-screen"
        style={coachingThemeStyle(theme)}
      >
        {/* Devanagari typesetting for the Hindi reading; inert in English. See
            DEMO_HINDI_CSS in @/lib/demo/language. */}
        <style>{DEMO_HINDI_CSS}</style>
        <DemoRibbon site={site} />

        <a
          href="#courses"
          className={cn(
            "sr-only z-[60] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:border focus:px-5 focus:py-3 focus:text-sm focus:font-medium",
            "focus:bg-[hsl(var(--dc-bg))] focus:border-[hsl(var(--dc-brand))]", INK,
          )}
        >
          {c.skipTo(c.heading.courses)}
        </a>

        <Header
          site={site}
          theme={theme}
          c={c}
          nav={nav}
          cta={book}
          lang={lang}
          setLang={setLang}
          offered={offered}
        />

        <main>
          <Hero
            site={site}
            theme={theme}
            c={c}
            courses={courses}
            showTaglineBlank={plan.inPlace.has("hero.tagline")}
            seeBatchesHref="#courses"
            book={book}
          />

          {showFacts && <FactsRow facts={facts} site={site} c={c} />}

          <Band c={c} cta={book} />

          {ordered.map((id, i) => sectionBody(id, steps[i]))}

          {/* ── Where we are ─────────────────────────────────────────────── */}
          <section
            id="where"
            aria-labelledby="h-where"
            className={cn(coachingPad(whereStep), ANCHOR, !ruleOnFaq && cn("border-t", LINE))}
          >
            <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
              <div>
                <Head id="h-where" theme={theme} label={c.contactHeading} className="max-w-[24ch]">
                  {c.contactHeading}
                </Head>
                {!hasContact && plan.inPlace.has("contact") && <Blank className="mt-7">{c.contactBlank}</Blank>}
                {hasContact && (
                  <dl className="mt-7 grid gap-0">
                    {text(contact?.phone) && (
                      <ContactRow label={c.labelPhone}>
                        <a href={tel || "#where"} className={cn("tabular-nums underline decoration-[hsl(var(--dc-ink-soft)/0.35)] underline-offset-4 hover:decoration-[hsl(var(--dc-ink))]", INK, FOCUS)}>
                          {unbreakable(text(contact?.phone))}
                        </a>
                      </ContactRow>
                    )}
                    {waHref && (
                      <ContactRow label={c.labelWhatsapp}>
                        <a href={waHref} target="_blank" rel="noopener noreferrer" className={cn("underline decoration-[hsl(var(--dc-ink-soft)/0.35)] underline-offset-4 hover:decoration-[hsl(var(--dc-ink))]", INK, FOCUS)}>
                          {unbreakable(`+${text(contact?.whatsapp).replace(/^\+/, "")}`)}
                        </a>
                      </ContactRow>
                    )}
                    {mail && (
                      <ContactRow label={c.labelEmail}>
                        <a href={mail} className={cn("break-all underline decoration-[hsl(var(--dc-ink-soft)/0.35)] underline-offset-4 hover:decoration-[hsl(var(--dc-ink))]", INK, FOCUS)}>
                          {text(contact?.email)}
                        </a>
                      </ContactRow>
                    )}
                    {text(contact?.hours) && (
                      <ContactRow label={c.labelHours}>
                        <span className={cn("tabular-nums", INK)}>{text(contact?.hours)}</span>
                      </ContactRow>
                    )}
                  </dl>
                )}
              </div>

              <div className="lg:pt-2">
                {addressLines.length > 0 && (
                  <address className={cn("not-italic text-[1.02rem] leading-[1.7]", INK)}>
                    {addressLines.map((l) => (
                      <span key={l} className="block">{l}</span>
                    ))}
                  </address>
                )}
                {map && (
                  <a
                    href={map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("mt-5 inline-flex items-center gap-1.5 text-[0.92rem] font-semibold text-[hsl(var(--dc-brand-ink))] underline decoration-[hsl(var(--dc-brand-ink)/0.35)] underline-offset-4 hover:decoration-[hsl(var(--dc-brand-ink))]", FOCUS)}
                  >
                    {c.openInMaps}
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ── Questions. The one 1px rule on the page sits here. ───────── */}
          {faq.length > 0 && (
            <section
              id="questions"
              aria-labelledby="h-questions"
              className={cn(coachingPad(faqStep), ANCHOR, ruleOnFaq && cn("border-t", LINE))}
            >
              <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,32fr)_minmax(0,68fr)] lg:gap-20">
                <Head id="h-questions" theme={theme} label={c.faqHeading} tail={c.faqLead} className="lg:sticky lg:top-28 lg:self-start">
                  {ph.faqTitle}
                </Head>
                <div>
                  {faq.map((q, i) => (
                    <details key={`${text(q.title)}-${i}`} className={cn("group border-t", LINE)}>
                      <summary
                        className={cn(
                          "flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[1.02rem] font-medium leading-snug",
                          INK, FOCUS,
                        )}
                      >
                        {text(q.title)}
                        <span aria-hidden className="relative mt-[0.45rem] h-[2px] w-3.5 shrink-0 bg-[hsl(var(--dc-accent))]">
                          <span className="absolute inset-0 h-[2px] w-3.5 rotate-90 bg-[hsl(var(--dc-accent))] transition-transform duration-150 group-open:rotate-0 motion-reduce:transition-none" />
                        </span>
                      </summary>
                      {text(q.body) && (
                        <p className={cn("max-w-[68ch] pb-6 pr-8 text-[0.95rem] leading-relaxed", SOFT)}>{text(q.body)}</p>
                      )}
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── What we still need from you ──────────────────────────────── */}
          {plan.deferred.length > 0 && (
            <Sec id="still-needed" step={stillStep} labelledBy="h-still">
              <div className="max-w-[68ch]">
                <Head id="h-still" theme={theme} label={ph.remainderTitle}>
                  {ph.remainderTitle}
                </Head>
                <p className={cn("mt-5 text-[0.97rem] leading-relaxed", SOFT)}>{ph.remainderBody}</p>
                <ul className="mt-6 grid gap-3">
                  {plan.deferred.map((d) => (
                    <li key={d} className={cn("dc-blank text-[0.92rem] leading-relaxed")}>{d}</li>
                  ))}
                </ul>
              </div>
            </Sec>
          )}

          {/* ── Enquire: framed as a question, phone first.
                 The page's SECOND and last background change. ───────────── */}
          <section id="enquire" className={cn(coachingPad("loud"), ANCHOR, "bg-[hsl(var(--dc-hero-bg))] text-[hsl(var(--dc-hero-ink))]")} aria-labelledby="h-enquire">
            <div className="container-page">
              <h2 id="h-enquire" className="max-w-[18ch] text-balance text-[hsl(var(--dc-hero-ink))]" style={H2}>
                {c.enquireTitle.first}{" "}
                <span className="text-[hsl(var(--dc-hero-soft))]">{c.enquireTitle.second}</span>
              </h2>
              <p className="mt-5 max-w-[54ch] text-[1.02rem] leading-relaxed text-[hsl(var(--dc-hero-soft))]">
                {c.enquireLead}
              </p>

              {tel || waHref || mail ? (
                <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
                  {tel && (
                    <a href={tel} className={cn("inline-flex items-baseline gap-3 tabular-nums text-[hsl(var(--dc-hero-ink))]", FOCUS_HERO)} style={H2}>
                      <span className="text-[0.66rem] font-semibold uppercase not-italic tracking-[0.14em] text-[hsl(var(--dc-hero-accent))]" style={{ fontFamily: "var(--dc-body)", letterSpacing: "0.14em" }}>
                        {c.callUs}
                      </span>
                      <span className="underline decoration-[hsl(var(--dc-hero-soft)/0.35)] underline-offset-[6px] hover:decoration-[hsl(var(--dc-hero-ink))]">
                        {unbreakable(text(contact?.phone))}
                      </span>
                    </a>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Action href={book.href} external={book.external} tone="hero">{book.label}</Action>
                    {waHref && (
                      <Action href={waHref} external tone="heroQuiet">{c.labelWhatsapp}</Action>
                    )}
                    {!waHref && mail && (
                      <Action href={mail} tone="heroQuiet">{c.labelEmail}</Action>
                    )}
                  </div>
                </div>
              ) : (
                plan.inPlace.has("contact") ? null : (
                  <p className="dc-blank mt-9 max-w-[56ch] text-[0.97rem] leading-relaxed" style={{ color: "hsl(var(--dc-hero-soft))", borderLeftColor: "hsl(var(--dc-hero-accent) / 0.6)" }}>
                    {ph.phone}
                  </p>
                )
              )}

              {site.isExample && (
                <p className="mt-10 max-w-[70ch] text-[0.8rem] leading-relaxed text-[hsl(var(--dc-hero-soft)/0.85)]">
                  {c.exampleFooterNote}
                </p>
              )}
            </div>
          </section>

          {/* ── The institute's own footer ───────────────────────────────── */}
          {/* No rule above the footer: the deep enquiry band directly above
              it is the separation, and the FAQ carries the page's one hairline. */}
          <footer className="py-10 sm:py-12">
            <div className="container-page flex flex-wrap items-start justify-between gap-x-10 gap-y-8">
              <div className="flex items-start gap-3">
                <Monogram site={site} theme={theme} className="h-10 w-10 text-[0.82rem]" />
                <div>
                  <p className={cn("max-w-[24ch] text-[1rem] font-semibold leading-snug", INK)} style={{ fontFamily: "var(--dc-display)" }}>
                    {site.instituteName}
                  </p>
                  {place && <p className={cn("mt-1 text-[0.82rem]", SOFT)}>{place}</p>}
                  {established && <p className={cn("mt-0.5 text-[0.82rem] tabular-nums", SOFT)}>{established}</p>}
                </div>
              </div>

              <nav aria-label={c.footerNavLabel} className="min-w-[12rem]">
                <p className="mb-3"><Label>{c.footerSections}</Label></p>
                <ul className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[0.88rem] sm:grid-cols-1">
                  {navAll.map((n) => (
                    <li key={n.id}>
                      <a href={`#${n.id}`} className={cn("transition-colors duration-150 hover:text-[hsl(var(--dc-ink))] motion-reduce:transition-none", SOFT, FOCUS)}>
                        {n.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <a href="#top" className={cn("text-[0.85rem] underline decoration-[hsl(var(--dc-ink-soft)/0.35)] underline-offset-4 hover:text-[hsl(var(--dc-ink))]", SOFT, FOCUS)}>
                {c.backToTop}
              </a>
            </div>
          </footer>
        </main>
      </div>

      {/* Ideovent's own credit block, deliberately OUTSIDE the institute's
          theme scope: it is the one place on the page where we are the
          speaker, and the visual break is the point. */}
      <DemoMarker site={site} />
    </>
  );
}

function ContactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t py-3.5", LINE)}>
      <dt className="w-[8ch] shrink-0"><Label>{label}</Label></dt>
      <dd className="min-w-0 text-[1rem] leading-snug">{children}</dd>
    </div>
  );
}
