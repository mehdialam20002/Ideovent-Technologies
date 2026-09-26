import type { CSSProperties } from "react";

/**
 * THE COACHING DEMO'S FIVE LOOKS.
 *
 * ── WHY THIS FILE REPLACED coaching/presets.ts ────────────────────────────
 * The old presets named one of the six `.demo-palette-*` classes in
 * src/index.css, which rebuilt the shadcn token ladder from two hues. That
 * ladder is correct and it is still there, but it has one property that made
 * five presets impossible: every preset shares the SAME lightnesses. Change
 * the hue and you have recoloured one design. Mehdi asked for five looks that
 * are five designs, and the honest test he set is that a director who has been
 * sent two of them cannot find the seam.
 *
 * So each theme below states its own colours outright, exactly the way
 * src/lib/demo/schoolThemes.ts does, and scripts/check-demo-contrast.mjs
 * measures every pair in both themes. That script already expected this file
 * by name before it existed.
 *
 * ── TWO TOKEN TABLES PER THEME, AND THAT IS ON PURPOSE ────────────────────
 * The school template pins itself to light with `color-scheme: only light`.
 * This one does not, because main.tsx sets `defaultTheme="dark"`, so the very
 * first thing a director sees when they open the link we send is the DARK
 * rendering. A template that only looks right in light is a template that
 * looks wrong to everybody who has never touched the toggle.
 *
 * `tokens` is the light table and `tokensDark` is the dark one. The dark one
 * is the base in the stylesheet, matching the convention in src/index.css
 * where `:root, .dark` is dark and `.light` is the override.
 *
 * ── HOW THEY REACH THE PAGE ───────────────────────────────────────────────
 * `coachingThemeStyle` returns BOTH tables as inline custom properties, named
 * `--dcl-*` (light) and `--dcd-*` (dark). One rule pair in src/index.css maps
 * whichever is current onto `--dc-*`, which is what the template reads. The
 * mapping has to live in the stylesheet rather than inline because an inline
 * property beats a stylesheet rule in the cascade, so an inline `--dc-bg`
 * could never be overridden by `.light`.
 *
 * ── WHY THEY DO NOT LOOK LIKE THE SCHOOL THEMES ───────────────────────────
 * The school template is built on ivory grounds, serif or institutional
 * headings, framed crests, double rules and a gallery, because a school sells
 * age, trust and an admission. A coaching institute sells THIS YEAR'S RESULTS
 * and NEXT MONTH'S BATCH, so this file is built on the opposite instincts:
 * ruled ledgers that read like a timetable on a noticeboard, tabular figures,
 * a batch board in the hero, mono and spaced-caps voices the school file does
 * not own, and a dark default the school file cannot reach. That is a thing to
 * CHECK by opening one of each side by side, not to assume.
 *
 * ── NO NEW WEBFONT ────────────────────────────────────────────────────────
 * index.html already fetches Inter, Sora 300..800 and Instrument Serif italic,
 * and has a measured note about what each costs on the critical path. A demo
 * is opened on a phone on mobile data. The `mono` voice below is the DEVICE
 * monospace, already in memory on every phone this page will be read on, and
 * it costs nothing.
 *
 * NEVER CHANGE AN `id` IN PLACE. It is stored on a record, and a demo that has
 * already been sent has to keep looking the way it looked when it was sent.
 * `ledger`, `signal` and `studio` are the three ids that already shipped and
 * they keep their meaning; `marks` and `bulletin` are the two new ones.
 */

/* ────────────────────────────────────────────────────────────────────────────
   What a theme is made of
   ──────────────────────────────────────────────────────────────────────── */

/**
 * The sections a coaching demo can reorder.
 *
 * The hero, the facts row, the thin band under the hero, the closing enquiry
 * and the footer are NOT in this list: they are not optional and they are not
 * movable. Everything here is.
 *
 * The ids are named after the RECORD FIELD they draw on rather than after the
 * heading they print, because the heading moves between markets ("Courses and
 * batches" in Gorakhpur, "Subjects we teach" in Austin) and the field does not.
 */
export type CoachingSectionId =
  | "courses"
  | "fees"
  | "results"
  | "faculty"
  | "schedule"
  | "method"
  | "trial"
  | "notices"
  | "about";

/** Every orderable section, for the completeness check in the admin. */
export const COACHING_SECTIONS: CoachingSectionId[] = [
  "courses", "fees", "results", "faculty", "schedule", "method", "trial", "notices", "about",
];

/**
 * How the first screen composes.
 *
 * All five put TRUE CONTENT in the second column or drop the column entirely.
 * An empty half is the defect this type exists to make unrepresentable: there
 * is no `hero: "none"`.
 */
export type CoachingHero =
  /** 52/48. Headline left, the batch board right. The default and the one the
   *  brief specifies: what you teach, when the next batch starts, how to book. */
  | "board"
  /** Headline across the full measure, then the batch board as a strip that
   *  bleeds off both gutters under it. This is the page's one broken grid. */
  | "strip"
  /** One column at a 24ch measure with the monogram set large and low, and the
   *  batch board directly beneath rather than beside. Reads as a small centre. */
  | "column"
  /** 56/44. Headline left; right is the next start date set as a large numeral
   *  over the board. For an institute whose argument is the calendar. */
  | "figure";

/** How the batches section is laid out. It is the section that converts. */
export type CoachingBatches =
  /** Hairline-separated rows with aligned columns from `lg` up and a stacked
   *  definition list below. Dense and scannable, like a noticeboard. */
  | "ledger"
  /** One tile per batch, and the tiles differ from each other in ground and in
   *  polarity rather than repeating one card five times. */
  | "tiles"
  /** A fixed grid that reads as a departure board: exam, class, days, time,
   *  starts, fee, with every figure tabular and every column aligned. */
  | "board";

/**
 * The heading voice. This is the axis that stops five themes reading as one
 * layout recoloured, so the five are deliberately far apart.
 *
 *   heavy     Sora 800, tight. A results institute shouting its own name.
 *   hairline  Sora 300, very tight, large. Modern test-prep.
 *   book      Sora 500 with the serif accent doing more work. A tutoring centre.
 *   mono      The device monospace at 700. Nothing else on this site uses it
 *             for display, and it reads as a scoreboard.
 *   caps      Inter 600 uppercase with open tracking at a smaller display size,
 *             Avenues style, with the mass carried by the labels.
 */
export type CoachingVoice = "heavy" | "hairline" | "book" | "mono" | "caps";

/** How a section is separated from the one above it. */
export type CoachingRule =
  /** Nothing but space. */
  | "none"
  /** A short accent tab above the section label. */
  | "tab"
  /** A hairline the width of the label only. */
  | "hair"
  /** A solid accent block, 3px, the width of the label. */
  | "block";

/** Section rhythm. Drives which of the two four-step ladders is walked. */
export type CoachingDensity = "dense" | "airy";

export interface CoachingTokens {
  /** The page ground. */
  bg: string;
  /** A card or a raised block on the ground. */
  surface: string;
  /**
   * A second surface, one step off the ground: the batch board's panel, a
   * table's header row, the fee strip. Body text sits on it, so it is held to
   * the same ratios as the ground. The ONE deep band late on the page is not
   * this; it reuses `heroBg` / `heroInk` / `heroSoft`, which is how the page
   * keeps to two background changes in total.
   */
  surface2: string;
  /** Body text. AA on bg, surface and surface2. */
  ink: string;
  /** Secondary text. AA on all three, so it is never decorative grey. */
  inkSoft: string;
  /** The institute's colour as a FILL. Text on it is `onBrand`. */
  brand: string;
  /** Text on a brand fill. */
  onBrand: string;
  /** The institute's colour as TEXT on the page. */
  brandInk: string;
  /** The second colour: small caps, rules, the serif accent, one chip. AA as text. */
  accent: string;
  /** Hairlines. Nothing is read off it, so it is not held to a text ratio. */
  line: string;
  /** The hero's own ground and its two text colours. */
  heroBg: string;
  heroInk: string;
  heroSoft: string;
  /**
   * The serif accent ON the hero's deep ground.
   *
   * It is a separate token and not `accent` because `accent` is measured
   * against the three light grounds and, in the light table, is a DARK colour.
   * Painted on a deep hero it would be unreadable, which is exactly the kind
   * of half-broken detail a director notices and cannot name. Measured
   * against `heroBg` by scripts/check-demo-contrast.mjs like everything else.
   */
  heroAccent: string;
}

export interface CoachingTheme {
  id: CoachingThemeId;
  /** What Mehdi sees in the dropdown. Plain words. */
  label: string;
  /** One line, so he can choose without opening five tabs. */
  blurb: string;
  hero: CoachingHero;
  batches: CoachingBatches;
  voice: CoachingVoice;
  rule: CoachingRule;
  density: CoachingDensity;
  /** Corner radius for tiles and buttons, as a CSS length. */
  radius: string;
  sections: CoachingSectionId[];
  /** The light table. Measured by scripts/check-demo-contrast.mjs. */
  tokens: CoachingTokens;
  /** The dark table, which is what a first-time visitor actually sees. */
  tokensDark: CoachingTokens;
}

export type CoachingThemeId = "ledger" | "signal" | "studio" | "marks" | "bulletin";

/* ── Font stacks ─────────────────────────────────────────────────────────── */

/*
  Four stacks, all of them already paid for. SANS and DISPLAY are the two
  webfonts index.html already fetches. MONO is the device monospace and costs
  nothing, which is the only reason a fifth voice is affordable at all.
*/
const SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const DISPLAY =
  'Sora, "Sora Fallback", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

/** The family that sets display headings under each voice. */
export function coachingDisplayFamily(voice: CoachingVoice): string {
  return voice === "mono" ? MONO : voice === "caps" ? SANS : DISPLAY;
}

/**
 * Weight, tracking, leading and case per voice.
 *
 * These are the numbers that make two sans headings read as two typefaces.
 * Sora at 300 set at -0.04em and Sora at 800 set at -0.035em are further apart
 * on a page than two families are, and the mono voice is a third thing again.
 */
export function coachingDisplayStyle(voice: CoachingVoice): {
  weight: number;
  tracking: string;
  leading: string;
  transform: "none" | "uppercase";
  /** Multiplier on the two display sizes. `caps` runs smaller by design. */
  scale: number;
} {
  switch (voice) {
    case "heavy":
      return { weight: 800, tracking: "-0.035em", leading: "0.96", transform: "none", scale: 1 };
    case "hairline":
      return { weight: 300, tracking: "-0.042em", leading: "0.98", transform: "none", scale: 1.04 };
    case "book":
      return { weight: 500, tracking: "-0.022em", leading: "1.02", transform: "none", scale: 0.98 };
    case "mono":
      return { weight: 700, tracking: "-0.045em", leading: "0.98", transform: "none", scale: 0.94 };
    case "caps":
    default:
      return { weight: 600, tracking: "0.005em", leading: "1.04", transform: "uppercase", scale: 0.8 };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   The five themes
   ──────────────────────────────────────────────────────────────────────── */

/*
  A word on the five section orders, because that is the part most easily got
  wrong by being clever.

  `courses` is first in three of the five, because a student or a parent
  arriving on a coaching site is asking one question: do you teach the thing I
  need, and when does it start. `fees` sits immediately under it in four of the
  five because the next question is always the same and burying it costs a
  reply. `marks` opens on results, because an institute whose argument is last
  year's ranks has to make it before anything else. `studio` opens on the free
  first session, and that is the real difference between a test-prep institute
  and a tutoring centre: a parent looking for a tutor is solving a problem this
  week, is not choosing an institution, and is not moved by a results table.
  `bulletin` opens on notices, for the centre whose parents come back to the
  site weekly to find out whether Saturday's class is on.
*/
export const COACHING_THEMES: Record<CoachingThemeId, CoachingTheme> = {
  ledger: {
    id: "ledger",
    label: "Board",
    blurb:
      "Crimson on ink, heavy headings, batches set as a ruled ledger with the board in the hero. For a results-led institute: JEE, NEET, banking, state PSC.",
    hero: "board",
    batches: "ledger",
    voice: "heavy",
    rule: "hair",
    density: "dense",
    radius: "2px",
    sections: ["courses", "fees", "results", "faculty", "schedule", "method", "trial", "notices", "about"],
    tokens: {
      bg: "30 30% 97%",          /* #FAF7F3 warm paper */
      surface: "0 0% 100%",
      surface2: "30 28% 92%",
      ink: "350 20% 11%",
      inkSoft: "350 10% 30%",
      brand: "352 72% 32%",
      onBrand: "30 40% 97%",
      brandInk: "352 74% 29%",
      accent: "214 62% 30%",     /* slate blue, the second colour */
      line: "30 22% 79%",
      heroBg: "350 30% 9%",
      heroInk: "30 35% 96%",
      heroSoft: "350 10% 74%",
      heroAccent: "210 70% 75%",
    },
    tokensDark: {
      bg: "350 22% 7%",
      surface: "350 20% 12%",
      surface2: "350 18% 16%",
      ink: "30 25% 95%",
      inkSoft: "350 10% 73%",
      brand: "352 70% 62%",
      onBrand: "350 30% 8%",
      brandInk: "352 75% 71%",
      accent: "210 66% 71%",
      line: "350 14% 24%",
      heroBg: "350 26% 5%",
      heroInk: "30 30% 96%",
      heroSoft: "350 10% 72%",
      heroAccent: "210 66% 72%",
    },
  },

  signal: {
    id: "signal",
    label: "Signal",
    blurb:
      "Indigo and cyan, hairline headings at a very large size, batches as tiles that differ from each other, and a batch strip that bleeds off both gutters.",
    hero: "strip",
    batches: "tiles",
    voice: "hairline",
    rule: "none",
    density: "airy",
    radius: "16px",
    sections: ["courses", "faculty", "results", "fees", "method", "schedule", "trial", "notices", "about"],
    tokens: {
      bg: "220 40% 98%",
      surface: "0 0% 100%",
      surface2: "220 42% 94%",
      ink: "224 40% 10%",
      inkSoft: "222 18% 32%",
      brand: "244 62% 38%",
      onBrand: "220 60% 98%",
      brandInk: "244 66% 35%",
      accent: "192 86% 24%",
      line: "220 26% 82%",
      heroBg: "226 46% 10%",
      heroInk: "220 50% 97%",
      heroSoft: "220 26% 76%",
      heroAccent: "186 78% 63%",
    },
    tokensDark: {
      bg: "226 42% 8%",
      surface: "226 36% 13%",
      surface2: "226 32% 17%",
      ink: "220 40% 96%",
      inkSoft: "220 20% 75%",
      brand: "245 78% 72%",
      onBrand: "226 46% 9%",
      brandInk: "245 84% 76%",
      accent: "188 72% 62%",
      line: "226 24% 25%",
      heroBg: "226 48% 6%",
      heroInk: "220 44% 97%",
      heroSoft: "220 22% 74%",
      heroAccent: "188 72% 63%",
    },
  },

  studio: {
    id: "studio",
    label: "Studio",
    blurb:
      "Teal and amber, book weight with the serif accent doing more work, generous space, a single-column hero with the monogram set large and low.",
    hero: "column",
    batches: "tiles",
    voice: "book",
    rule: "tab",
    density: "airy",
    radius: "20px",
    sections: ["trial", "courses", "faculty", "method", "fees", "schedule", "results", "notices", "about"],
    tokens: {
      bg: "168 32% 97%",
      surface: "0 0% 100%",
      surface2: "170 34% 93%",
      ink: "182 38% 10%",
      inkSoft: "180 16% 30%",
      brand: "180 78% 21%",
      onBrand: "166 56% 97%",
      brandInk: "180 80% 19%",
      accent: "26 92% 27%",
      line: "172 22% 79%",
      /* THEIR COLOUR, FULL BLEED. Studio is the Warm coaching look, and the
         Warm family's one structural promise is the institute's own colour
         across the whole first screen. At 10% lightness this ground read as
         black beside ledger, signal and marks, so four of the five coaching
         heroes were the same dark slab in a different font. 16% is still deep
         enough for the amber accent (5.8:1) and reads unmistakably as teal. */
      heroBg: "180 70% 16%",
      heroInk: "166 46% 96%",
      heroSoft: "172 22% 76%",
      heroAccent: "34 90% 65%",
    },
    tokensDark: {
      bg: "182 34% 7%",
      surface: "180 28% 12%",
      surface2: "180 24% 16%",
      ink: "166 30% 95%",
      inkSoft: "174 14% 73%",
      brand: "176 62% 60%",
      onBrand: "180 40% 8%",
      brandInk: "176 68% 66%",
      accent: "34 88% 63%",
      line: "180 16% 24%",
      /* Teal in the dark table too, for the same reason: at 5% it was the page
         ground again, and the dark rendering is what a director sees first. */
      heroBg: "180 64% 14%",
      heroInk: "166 34% 96%",
      heroSoft: "172 16% 73%",
      heroAccent: "34 88% 64%",
    },
  },

  marks: {
    id: "marks",
    label: "Marks",
    blurb:
      "Amber on graphite, headings set in the device monospace, batches on a departure board, and the next start date as a large numeral in the hero.",
    hero: "figure",
    batches: "board",
    voice: "mono",
    rule: "hair",
    density: "dense",
    radius: "0px",
    sections: ["results", "courses", "fees", "schedule", "faculty", "method", "trial", "notices", "about"],
    tokens: {
      bg: "40 18% 96%",
      surface: "0 0% 100%",
      surface2: "40 20% 92%",
      ink: "220 18% 10%",
      inkSoft: "220 10% 31%",
      brand: "220 20% 16%",
      onBrand: "40 60% 96%",
      brandInk: "220 22% 15%",
      accent: "26 94% 28%",
      line: "40 14% 78%",
      heroBg: "220 18% 11%",
      heroInk: "40 44% 96%",
      heroSoft: "220 10% 75%",
      heroAccent: "38 94% 67%",
    },
    tokensDark: {
      bg: "220 16% 7%",
      surface: "220 14% 11%",
      surface2: "220 12% 15%",
      ink: "40 30% 95%",
      inkSoft: "220 8% 73%",
      brand: "36 90% 60%",
      onBrand: "220 26% 8%",
      brandInk: "38 94% 64%",
      accent: "38 92% 66%",
      line: "220 10% 23%",
      heroBg: "220 20% 5%",
      heroInk: "40 34% 96%",
      heroSoft: "220 8% 72%",
      heroAccent: "38 92% 66%",
    },
  },

  bulletin: {
    id: "bulletin",
    label: "Bulletin",
    blurb:
      "Plum and brick, spaced uppercase section labels carrying the page, deep inverted panels, notices first. For a busy neighbourhood centre.",
    hero: "column",
    batches: "ledger",
    voice: "caps",
    rule: "block",
    density: "dense",
    radius: "6px",
    sections: ["notices", "courses", "fees", "results", "schedule", "faculty", "method", "trial", "about"],
    tokens: {
      bg: "300 24% 97%",
      surface: "0 0% 100%",
      surface2: "300 28% 94%",
      ink: "294 30% 11%",
      inkSoft: "294 14% 31%",
      brand: "292 62% 29%",
      onBrand: "300 44% 97%",
      brandInk: "292 66% 27%",
      accent: "8 72% 33%",
      line: "300 18% 81%",
      heroBg: "292 44% 10%",
      heroInk: "300 40% 96%",
      heroSoft: "296 16% 75%",
      heroAccent: "12 82% 69%",
    },
    tokensDark: {
      bg: "294 26% 8%",
      surface: "294 22% 12%",
      surface2: "294 20% 16%",
      ink: "300 26% 95%",
      inkSoft: "296 12% 73%",
      brand: "292 62% 68%",
      onBrand: "294 40% 9%",
      brandInk: "292 68% 72%",
      accent: "12 82% 66%",
      line: "294 16% 24%",
      heroBg: "294 34% 6%",
      heroInk: "300 32% 96%",
      heroSoft: "296 14% 72%",
      heroAccent: "12 82% 67%",
    },
  },
};

/** The dropdown order in the admin, and the order this file documents. */
export const COACHING_THEME_IDS: CoachingThemeId[] = [
  "ledger",
  "signal",
  "studio",
  "marks",
  "bulletin",
];

/**
 * The default, used when a record has no theme and when it has a bad one.
 *
 * `ledger` rather than one of the newer two, because it is the theme that
 * carries an EMPTY record best: its hero needs no photograph, its batch
 * section reads as a reserved timetable rather than as five empty tiles, and
 * most demos go out with a name, a city and nothing else.
 */
export const COACHING_THEME_DEFAULT: CoachingThemeId = "ledger";

/**
 * The theme for a record. Never throws, never returns undefined.
 *
 * An id belonging to the SCHOOL template falls through to the coaching default
 * rather than rendering nothing, which is what lets Mehdi flip a record from
 * school to coaching in the admin and still see a page.
 */
export function coachingTheme(id: string | undefined): CoachingTheme {
  const found = id ? COACHING_THEMES[id as CoachingThemeId] : undefined;
  return found || COACHING_THEMES[COACHING_THEME_DEFAULT];
}

/**
 * Both token tables as inline custom properties, plus the type and shape
 * values the template reads.
 *
 * The light table goes out as `--dcl-*` and the dark one as `--dcd-*`. Neither
 * is what the template reads: `.demo-coaching` in src/index.css maps one of
 * them onto `--dc-*` depending on which theme class <html> is carrying. That
 * indirection exists because an inline custom property wins over a stylesheet
 * rule, so an inline `--dc-bg` could never be overridden by `.light`.
 */
export function coachingThemeStyle(theme: CoachingTheme): CSSProperties {
  const l = theme.tokens;
  const d = theme.tokensDark;
  const type = coachingDisplayStyle(theme.voice);
  const out: Record<string, string> = {
    "--dcl-bg": l.bg,
    "--dcl-surface": l.surface,
    "--dcl-surface-2": l.surface2,
    "--dcl-ink": l.ink,
    "--dcl-ink-soft": l.inkSoft,
    "--dcl-brand": l.brand,
    "--dcl-on-brand": l.onBrand,
    "--dcl-brand-ink": l.brandInk,
    "--dcl-accent": l.accent,
    "--dcl-line": l.line,
    "--dcl-hero-bg": l.heroBg,
    "--dcl-hero-ink": l.heroInk,
    "--dcl-hero-soft": l.heroSoft,
    "--dcl-hero-accent": l.heroAccent,

    "--dcd-bg": d.bg,
    "--dcd-surface": d.surface,
    "--dcd-surface-2": d.surface2,
    "--dcd-ink": d.ink,
    "--dcd-ink-soft": d.inkSoft,
    "--dcd-brand": d.brand,
    "--dcd-on-brand": d.onBrand,
    "--dcd-brand-ink": d.brandInk,
    "--dcd-accent": d.accent,
    "--dcd-line": d.line,
    "--dcd-hero-bg": d.heroBg,
    "--dcd-hero-ink": d.heroInk,
    "--dcd-hero-soft": d.heroSoft,
    "--dcd-hero-accent": d.heroAccent,

    "--dc-display": coachingDisplayFamily(theme.voice),
    "--dc-body": SANS,
    "--dc-mono": MONO,
    "--dc-display-weight": String(type.weight),
    "--dc-display-tracking": type.tracking,
    "--dc-display-leading": type.leading,
    "--dc-display-transform": type.transform,
    "--dc-scale": String(type.scale),
    "--dc-radius": theme.radius,
  };
  return out as CSSProperties;
}

/* ────────────────────────────────────────────────────────────────────────────
   Vertical space: a four-step scale with one hard rule
   ──────────────────────────────────────────────────────────────────────── */

/**
 * The four steps, as measured in the brief.
 *
 *   band    20 / 24     a one-line strip
 *   tight   48-56 / 64-72
 *   normal  64-72 / 96-112
 *   loud    88-96 / 136-160
 *
 * NO TWO ADJACENT SECTIONS MAY USE THE SAME STEP. That is the mechanical form
 * of "no two sections have identical spacing", and it is the thing that stops
 * four sections in a row reading as the same shape. `coachingStep` below
 * enforces it rather than trusting a hand-written list, because a list is
 * wrong the first time somebody reorders a theme.
 */
export type CoachingStep = "band" | "tight" | "normal" | "loud";

const PAD: Record<CoachingStep, string> = {
  band: "py-5 sm:py-6",
  tight: "pt-12 pb-14 sm:pt-16 sm:pb-[4.5rem]",
  normal: "pt-16 pb-[4.5rem] sm:pt-24 sm:pb-28",
  loud: "pt-[5.5rem] pb-24 sm:pt-[8.5rem] sm:pb-40",
};

export function coachingPad(step: CoachingStep): string {
  return PAD[step];
}

/**
 * The step a section gets, by id, with the no-repeat rule applied.
 *
 * Each section has a natural weight: the batches section is the reason the
 * page exists, so it is `loud`; a list of notices is reference material, so it
 * is `tight`. Where two neighbours would land on the same step, the second one
 * is nudged one step away, DOWN if it can be and up otherwise, so the rhythm
 * never flatlines. The result is that two themes produce two different
 * rhythms out of the same content, which is a difference a reader feels and
 * cannot name.
 */
const NATURAL: Record<CoachingSectionId, CoachingStep> = {
  courses: "loud",
  fees: "tight",
  results: "normal",
  faculty: "normal",
  schedule: "normal",
  method: "normal",
  trial: "normal",
  notices: "tight",
  about: "tight",
};

const ORDER: CoachingStep[] = ["band", "tight", "normal", "loud"];

export function coachingSteps(
  sections: CoachingSectionId[],
  density: CoachingDensity,
  /** The step of the section immediately above the first one in the list. */
  previous: CoachingStep = "band",
): CoachingStep[] {
  const out: CoachingStep[] = [];
  let prev = previous;
  for (const id of sections) {
    let step = NATURAL[id];
    /* An airy theme reads one step calmer everywhere except on the section
       that converts, which stays loud in every theme. */
    if (density === "airy" && step === "tight") step = "normal";
    if (step === prev) {
      const i = ORDER.indexOf(step);
      step = i > 1 ? ORDER[i - 1] : ORDER[i + 1];
    }
    out.push(step);
    prev = step;
  }
  return out;
}
