/**
 * The coaching demo's three looks.
 *
 * ── WHAT A PRESET IS, AND WHAT IT IS NOT ──────────────────────────────────
 * It is NOT a second source of colour. Colour comes from one place and one
 * place only: the `.demo-scope` / `.demo-palette-*` ladder in src/index.css,
 * which builds the whole shadcn token set out of two hues, measured in both
 * themes by scripts/check-demo-palettes.mjs, which runs in `npm run build`.
 * A preset here NAMES one of those palettes and never states a colour.
 *
 * An earlier draft of this file carried its own hex values and pointed at a
 * contrast script that did not exist. Two theming systems for one page is how
 * a demo renders one way on the machine it was built on and another way on the
 * director's phone, and that is the exact failure this feature exists to
 * prevent. If a palette needs fixing, fix the ladder in index.css and every
 * preset moves with it.
 *
 * ── SO WHAT DOES A PRESET CHANGE? ─────────────────────────────────────────
 * Four things, and the palette is one of them:
 *
 *   PALETTE    which `.demo-palette-*` class dresses the page.
 *   HERO       how the first screen is composed. Not a variant of one hero:
 *              three different compositions.
 *   BATCHES    whether the courses section is a ruled ledger or a set of
 *              cards. This is the section that does the work on a coaching
 *              site, so it is the section most worth having two answers for.
 *   ORDER      which section comes after which. The order IS the argument, and
 *              a tutoring centre's argument is not a JEE institute's.
 *
 * Plus a type voice and a corner radius, which together are what stop two
 * presets reading as one layout recoloured.
 *
 * ── WHY THESE DO NOT LOOK LIKE THE SCHOOL PRESETS ─────────────────────────
 * The school template (src/lib/demo/schoolThemes.ts) is built on serif
 * headings, framed crests, double rules and institutional restraint, because a
 * school sells age and trust. A coaching institute sells this year's results
 * and next month's batch, so this file is built on the opposite instincts:
 * mono figures, ruled ledgers that read like a timetable, a live batch strip,
 * and headings that carry their emphasis in WEIGHT rather than in a serif.
 * A director who has been sent both should read them as two studios' work.
 * That is a thing to CHECK by opening them side by side, not to assume.
 *
 * ── NO NEW WEBFONT ────────────────────────────────────────────────────────
 * index.html already fetches Inter 400..700, Sora 300..800 and Instrument
 * Serif italic, and has a measured note about what each costs on the critical
 * path. A demo is opened on a phone on mobile data. The mono voice below is
 * the DEVICE monospace, which is already in memory on every phone this page
 * will be read on and costs nothing.
 *
 * Never change an `id` in place. It is stored on a record, and a demo that has
 * already been sent has to keep looking the way it looked when it was sent.
 */

import type { DemoPalette, DemoSite } from "@/lib/cms/types";

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The sections a coaching demo can render, in the order they are declared per
 * preset below.
 *
 * The hero is not in this list: it is not optional and it is not movable.
 *
 * The ids are named after the RECORD FIELD they draw on rather than after the
 * heading they print, because the heading moves between markets ("Courses and
 * batches" in Gorakhpur, "Subjects we teach" in Austin) and the field does
 * not.
 */
export type CoachingSectionId =
  | "courses"
  | "results"
  | "faculty"
  | "method"
  | "trial"
  | "schedule"
  | "notices"
  | "about"
  | "contact";

/** How the first screen is composed. */
export type CoachingHero =
  /** The name set very large on the page ground, with a ruled fact strip
   *  beneath it. No image above the fold at all, so it is the fastest of the
   *  three on a bad connection and the one that reads best with an empty
   *  record, which is the state most demos are sent in. */
  | "ledger"
  /** Type on the left, image on the right at 58/42, stacked on a phone. Falls
   *  back to a fact panel when there is no image, rather than to white space. */
  | "split"
  /** Centred, with the focus areas as a row of chips above the name. Airy.
   *  Reads like a small tutoring centre rather than an institution. */
  | "stack";

/** How the courses and batches section is laid out. */
export type CoachingBatches =
  /** A ruled ledger: one row per course, figures in mono, aligned columns from
   *  `sm` up and a stacked definition list on a phone. Dense and scannable,
   *  the way a timetable on a noticeboard is. */
  | "ledger"
  /** One card per course. Reads better when there are three or four courses
   *  with long descriptions, and worse when there are twelve. */
  | "cards";

/**
 * The heading voice.
 *
 * Sora at 300 with open tracking and Sora at 800 set tight are further apart
 * on a page than two different families are, and neither costs a download.
 * `serif` is the restored Instrument Serif italic, used the way the rest of
 * the site uses it: one accent word, never a whole line.
 */
export type CoachingVoice = "thin" | "loud" | "quiet";

export interface CoachingPreset {
  id: CoachingPresetId;
  /** What Mehdi sees in the dropdown. Plain words. */
  label: string;
  /** One line, so he can choose without opening three tabs. */
  blurb: string;
  /** The `.demo-palette-*` preset this look is drawn with. Never a colour. */
  palette: DemoPalette;
  hero: CoachingHero;
  batches: CoachingBatches;
  voice: CoachingVoice;
  /** Corner radius for cards and buttons, as a CSS length. */
  radius: string;
  /** Section rhythm. `dense` is a noticeboard; `airy` is a small centre. */
  density: "dense" | "airy";
  sections: CoachingSectionId[];
}

export type CoachingPresetId = "ledger" | "signal" | "studio";

/*
  A word on the three section orders, because that is the part most easily got
  wrong by being clever.

  Courses is first in two of the three, because a student or a parent arriving
  on a coaching site is asking one question: do you teach the thing I need, and
  when does it start. Results is second in `ledger` and third in `signal`,
  because an institute whose argument is last year's ranks has to make it
  before anything else, and an institute whose argument is its teachers has to
  introduce them first.

  `studio` leads with the free first session, and that is the real difference
  between a test-prep institute and a tutoring centre. A parent looking for a
  tutor is solving a problem this week; they are not choosing an institution,
  and a results table is not what moves them. One free session is.
*/
export const COACHING_PRESETS: Record<CoachingPresetId, CoachingPreset> = {
  ledger: {
    id: "ledger",
    label: "Ledger",
    blurb:
      "Crimson on warm paper, batches set as a ruled timetable, figures in mono. For a results-led institute: JEE, NEET, banking, state PSC.",
    palette: "crimson",
    hero: "ledger",
    batches: "ledger",
    voice: "loud",
    radius: "4px",
    density: "dense",
    sections: ["courses", "results", "faculty", "schedule", "method", "trial", "notices", "about", "contact"],
  },

  signal: {
    id: "signal",
    label: "Signal",
    blurb:
      "Indigo and cyan, a split hero, batches as cards. For a modern test-prep or IELTS centre that sells its teachers.",
    palette: "indigo",
    hero: "split",
    batches: "cards",
    voice: "thin",
    radius: "14px",
    density: "dense",
    sections: ["courses", "faculty", "results", "method", "trial", "schedule", "notices", "about", "contact"],
  },

  studio: {
    id: "studio",
    label: "Studio",
    blurb:
      "Teal and amber, centred and airy, the free first session up front. For a tutoring, language or small-group centre.",
    palette: "teal",
    hero: "stack",
    batches: "cards",
    voice: "quiet",
    radius: "18px",
    density: "airy",
    sections: ["trial", "courses", "faculty", "method", "schedule", "results", "notices", "about", "contact"],
  },
};

export const COACHING_PRESET_IDS: CoachingPresetId[] = ["ledger", "signal", "studio"];

/**
 * The default.
 *
 * `ledger` rather than one of the prettier two, because it is the preset that
 * carries an EMPTY record best: it needs no image above the fold, its batch
 * section reads as a reserved timetable rather than as three empty cards, and
 * most demos go out with a name, a city and nothing else.
 */
export const COACHING_PRESET_DEFAULT: CoachingPresetId = "ledger";

/**
 * The preset for a record. Never throws, never returns undefined.
 *
 * An id belonging to the SCHOOL template falls through to the coaching default
 * rather than rendering nothing, which is what lets Mehdi flip a record from
 * school to coaching in the admin and still see a page.
 */
export function coachingPreset(id: string | undefined): CoachingPreset {
  const found = id ? COACHING_PRESETS[id as CoachingPresetId] : undefined;
  return found || COACHING_PRESETS[COACHING_PRESET_DEFAULT];
}

/**
 * The two classes that dress the page in the institute's colours.
 *
 * `demo-scope` rebuilds the shadcn token ladder for the subtree, so every
 * ordinary `bg-background` / `text-foreground` / `bg-primary` inside the
 * template comes out in their colours with no component knowing it happened.
 * Goes on the outermost element of the demo and nowhere else.
 *
 * The record's own `palette` WINS over the preset's. An institute whose
 * signboard is green should get a green site even if the look that suits them
 * ships in crimson, and Mehdi is the one looking at the signboard.
 */
export function coachingScopeClass(
  site: Pick<DemoSite, "palette" | "theme">,
  preset: CoachingPreset = coachingPreset(site.theme),
): string {
  const palette: DemoPalette = site.palette || preset.palette;
  return `demo-scope demo-palette-${palette}`;
}

/* ── The type voice, as real CSS ─────────────────────────────────────────── */

/**
 * Heading weight, tracking and leading per voice.
 *
 * Returned as values rather than as a class name because the three voices
 * differ in numbers a Tailwind scale does not carry (300 against 800, -0.045em
 * against -0.01em), and because a `style` object cannot be purged away by a
 * class scanner that never sees the string.
 */
export function coachingDisplayStyle(voice: CoachingVoice): {
  fontWeight: number;
  letterSpacing: string;
  lineHeight: string;
} {
  switch (voice) {
    case "loud":
      return { fontWeight: 800, letterSpacing: "-0.04em", lineHeight: "0.92" };
    case "quiet":
      return { fontWeight: 500, letterSpacing: "-0.02em", lineHeight: "1.04" };
    case "thin":
    default:
      return { fontWeight: 300, letterSpacing: "-0.045em", lineHeight: "0.95" };
  }
}

/**
 * The section padding ladder.
 *
 * NO SECTION IS SYMMETRIC, and no two consecutive sections on the page carry
 * the same step. _assets/DESIGN-DIRECTION.md names "equal padding above and
 * below every single section" as one of the things that make a page read as
 * generated, and a ladder that varies between sections while staying symmetric
 * inside each one is still a stack of slabs.
 *
 * `pt` is one step below `pb` throughout, so the rule a section opens on sits
 * nearer the heading it introduces than the content it has just left. That is
 * what makes it read as a section opening rather than as a divider between two
 * equal blocks.
 */
export function coachingSectionPad(density: CoachingPreset["density"], index: number): string {
  const dense = [
    "pt-10 pb-14 sm:pt-12 sm:pb-18 lg:pt-14 lg:pb-24",
    "pt-12 pb-16 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-28",
    "pt-8 pb-12 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20",
  ];
  const airy = [
    "pt-14 pb-20 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-32",
    "pt-16 pb-24 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-36",
    "pt-12 pb-16 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24",
  ];
  const ladder = density === "airy" ? airy : dense;
  return ladder[index % ladder.length];
}
