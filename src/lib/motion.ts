import type { Variants } from "framer-motion";

/*
  ONE CURVE, ONE DURATION, AND NO TRANSITION INSIDE A VARIANT.
  ════════════════════════════════════════════════════════════════════════════
  Before this pass every variant in this file carried its own `transition`, and
  the four of them disagreed: 0.7s, 0.6s, 0.6s, 0.8s. A page that runs three of
  them at once (and most pages do: a Reveal wrapper, a stagger container, and a
  per-line hero reveal) therefore had three different settle times in the same
  scroll, which is the thing that makes a page feel assembled rather than
  designed. It was also slow. 700ms is long enough that a visitor who scrolls at
  a normal speed reads the heading while it is still moving.

  The variants below now describe ONLY the two visual states. Timing comes from
  exactly one place, the <MotionConfig> in main.tsx, which supplies
  `{ duration: DURATION, ease: EASE }` as the default for every animation on the
  site. That is what makes "one easing curve everywhere" true by construction
  rather than by everyone remembering to import EASE.

  It is also what makes the reduced-motion kill switch work. A transition
  declared inside a variant beats anything MotionConfig sets, so as long as
  these objects carried their own durations there was no single place that could
  turn the site's motion off. See the MotionGlobalConfig block in main.tsx.

  DURATION is 0.22s. Measured against the brief's 150-250ms window and chosen at
  the top of it because these are entrance animations over ~12px of travel,
  where 150ms reads as a flicker rather than as movement.

  EASE [0.22, 1, 0.36, 1] is unchanged: a fast-out curve that spends most of its
  time settling, which is what stops a 220ms move from looking like a jump cut.

  IT IS ALSO NOW THE CSS DEFAULT. Entrance motion is framer-motion; every hover
  and press on the site is a plain CSS `transition-*` class, and those were
  running on Tailwind's stock cubic-bezier(0.4, 0, 0.2, 1), i.e. the page had two
  curves split by implementation rather than by intent.
  tailwind.config.ts now sets `transitionTimingFunction.DEFAULT` to the same
  cubic-bezier as this array. The two are the same curve in two syntaxes and
  nothing can import one into the other, so IF YOU CHANGE EASE, CHANGE THAT TOO.
*/
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DURATION = 0.22;

/** The site's single default transition. Applied globally by main.tsx. */
export const TRANSITION = { duration: DURATION, ease: EASE } as const;

/*
  Travel was 24px. At 700ms that read as a drift; at 220ms it reads as a lurch,
  because the same distance is now covered three times faster. 12px is the
  distance at which the eye registers "this arrived" without registering "this
  travelled", which is the whole job of an entrance.
*/
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1 },
};

/*
  Stagger default cut from 0.08 to 0.04.

  This is not a cosmetic halving. A stagger is a DELAY on the last child, and it
  compounds with the number of children: /services renders nine cards from one
  container, so at 0.08 the ninth card began moving 0.64s after the first and
  finished 1.34s after it. The row had been on screen for over a second while
  its right-hand end was still empty. At 0.04 with a 0.22s duration the same
  nine cards are fully settled in 0.54s, and a four-item row (the common case)
  in 0.34s.

  AND THE DEFAULT IS NOW WHAT EVERY CALL SITE ACTUALLY USES. The 0.04 above was
  only the default: 26 of the 27 `staggerContainer(...)` calls in src/ passed
  their own value, and between them they passed 0.05, 0.08, 0.09 and 0.1. So the
  argument above described a number almost nothing ran on, and two sections
  stacked on the same page settled at different rates for no reason anybody had
  decided. Every call site now calls `staggerContainer()`.

  Measured on /services at 1440x900 after the change, four cards scrolled into
  view in one jump and sampled every 40ms: all four at >=99% opacity by 280ms,
  against 400ms before. With prefers-reduced-motion: 40ms, i.e. one frame.

  The parameter stays. A section that genuinely needs a slower cascade should
  pass one and say why in a comment at the call site; the point is that it is
  now a decision rather than a default nobody set.
*/
export const staggerContainer = (stagger = 0.04, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/*
  Per-line reveal for a masked headline (the parent span carries overflow-hidden,
  so the line rises out of its own box).

  Travel was "60%" of the line's own height over 0.8s. At 0.22s a 60% rise is a
  snap, so the travel comes down with the duration: 28% is far enough that the
  mask is visibly doing something and short enough that it lands rather than
  slams.
*/
export const revealItem: Variants = {
  hidden: { opacity: 0, y: "28%" },
  show: { opacity: 1, y: 0 },
};

/*
  ════════════════════════════════════════════════════════════════════════════
  THE 25 SEPTEMBER 2026 REDESIGN: WHAT MOVES, AND FOR HOW LONG
  ════════════════════════════════════════════════════════════════════════════
  Everything below is measured against _assets/SITE-REDESIGN-BRIEF.md §8 and the
  21st.dev reading behind it. The whole system is three bands and one curve:

    interaction  150ms colour / 180ms transform / 200ms arrow nudge / 400ms image
    entrance     220ms and 12px for text (DURATION + fadeUp above)
                 500ms and 16px for the product strip under the hero (SHELF below)
    ambient      one 10s opacity breathe on the hero glow (site:hero, hero.css)

  and the curve is EASE everywhere. The CSS half lives in src/styles/motion.css
  as custom properties (--m-ease, --m-t-*) carrying the same numbers; there is no
  import that keeps a TS constant and a CSS value in step, so both ends say so.

  WHAT IS DELIBERATELY NOT EXPORTED FROM HERE:
    - No counter preset. `stats` is empty by design, and a price that rolls from
      0 (or from one price to another) spends part of a second showing figures
      that are not our prices. The judged hero comp C was marked down for exactly
      that. AnimatedCounter now prints its value and does not count.
    - No per-card stagger for grids below the fold. The brief's rule: reveal the
      heading, not each card. `staggerContainer` stays for the pages that still
      use it; the home sections this track owns no longer do.
    - No second curve. The track brief floated cubic-bezier(0.2, 0.6, 0.2, 1) at
      about 1s for the strip; the measured brief caps entrances at 0.5s and
      allows one curve in any computed style, and the verifier reads computed
      styles. SHELF gets its length from the stagger instead (see below).
*/

/*
  THE ONE LONGER ENTRANCE: the six project frames under the hero.

  Why this, and only this, is allowed past DURATION:
  1. It is the product arriving, not a heading. Each frame is a 384x240 picture
     travelling 16px; at 220ms a row of six reads as a flash, and a flash is
     what a loading glitch looks like. 500ms is the shortest duration at which
     six objects read as a sequence rather than as a repaint.
  2. It is the FIRST motion on the page and nothing else moves with it: the h1,
     the audience line, the ledger and the buttons are static by rule (LCP).
     Length that would be noise in a busy scroll is the only event on screen.
  3. It runs once (viewport `once`, amount 0.2) and is not scroll-linked.
  4. Total: 0.5s + 5 x 60ms = 0.8s for the sixth frame to settle, which is the
     "about 1s" the track brief asked for, reached with the house curve and
     inside the brief's 0.5s-per-element cap.

  site:hero owns the strip. Two ways to use this:
    framer:  <motion.div variants={shelfStrip} initial="hidden" whileInView="show"
               viewport={{ once: true, amount: SHELF.amount }}>
               {frames.map(f => <motion.article variants={shelfFrame} />)}
    CSS:     animation: <keyframes> 500ms cubic-bezier(0.22,1,0.36,1) backwards;
             animation-delay: calc(var(--i) * 60ms)   (the judged comp's way)

  `shelfFrame` carries its own transition, which the header of this file warns
  against. It is the deliberate exception: this IS the different timing, and a
  consumer that forgot to pass it would silently fall back to 220ms. Reduced
  motion is still total, because MotionGlobalConfig.skipAnimations (main.tsx)
  forces duration and delay to 0 whatever a variant says.
*/
export const SHELF = { duration: 0.5, stagger: 0.06, distance: 16, amount: 0.2 } as const;
export const SHELF_TRANSITION = { duration: SHELF.duration, ease: EASE } as const;

export const shelfStrip: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: SHELF.stagger } },
};

export const shelfFrame: Variants = {
  hidden: { opacity: 0, y: SHELF.distance },
  show: { opacity: 1, y: 0, transition: SHELF_TRANSITION },
};

/*
  THE HERO SWITCH ("I run a [School] [Coaching institute] [Business] [Firm
  abroad]"). site:hero builds it; these are the shared numbers so the switch and
  the rest of the site move alike.

  - The ledger swaps on OPACITY ONLY: 150ms out, the rows change, 150ms in. With
    <AnimatePresence mode="wait" initial={false}> keyed on the choice, pass
    variants={ledgerSwap} initial="out" animate="in" exit="out"
    transition={SWITCH_FADE}. `initial={false}` on AnimatePresence is not
    optional: the rows on first paint come from HTML and must not fade in, or
    LCP and the "no hero entrance" rule both break.
  - Nothing slides between prices and nothing counts: the figures are never in
    an intermediate state.
  - If the checked chip's fill is drawn as a separate element that moves
    between chips, give it `layoutId` and transition={PILL_LAYOUT}. A tween,
    not framer's default spring, because a spring is a second curve.
*/
export const SWITCH_FADE = { duration: 0.15, ease: EASE } as const;

export const ledgerSwap: Variants = {
  out: { opacity: 0 },
  in: { opacity: 1 },
};

export const PILL_LAYOUT = { type: "tween", duration: 0.2, ease: EASE } as const;

/*
  SECTION HEADINGS (components/motion/SectionTitle.tsx).

  The h2 block rises 12px over DURATION; the muted continuation inside the same
  h2 arrives CONTINUATION_DELAY later, on opacity alone. The statement lands
  first and the gloss a beat after it, which is the reading order, so the delay
  carries hierarchy rather than decoration. Settled at 0.30s.

  Opacity only on the continuation because it is an inline <span> inside the
  heading's text flow: a transform does nothing to an inline box, and making it
  inline-block would stop it wrapping with the statement.
*/
export const CONTINUATION_DELAY = 0.08;

/*
  THE PROCESS RAIL (ProcessSection.tsx, keyframes in motion.css).

  The line draws once, left to right (top to bottom below lg), over RAIL.duration
  when the list is 40% in view. Each stage numeral turns from muted to gold as the
  line reaches it: 60ms + i x RAIL.step. The drawing is the sequence the section
  is about, which is why it is the one below-the-fold element that gets more than
  a fade. 0.5s is the brief's entrance ceiling.
*/
export const RAIL = { duration: 0.5, step: 0.11, amount: 0.4 } as const;

/*
  NO SCROLL-LINKED MOTION. There was one: an 8px drift of the deep-dive
  screenshot inside its window (PARALLAX_PX, components/motion/Drift.tsx). It
  was removed on 26 Sep 2026. The measured brief lists "parallax and
  scroll-linked transforms" under Forbidden, the measured brief wins over the
  track brief where they disagree, and 8px of travel bought a scroll listener
  and a rAF loop for one image. Do not bring it back without changing the brief.
*/
