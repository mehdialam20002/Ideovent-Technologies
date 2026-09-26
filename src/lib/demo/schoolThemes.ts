/**
 * The five looks a school demo can be sent in.
 *
 * WHY FIVE, AND WHY THEY ARE NOT FIVE ACCENT COLOURS
 * --------------------------------------------------
 * Mehdi sends ten of these in a week, into the same three districts. Two
 * directors compare links at a DEO meeting. If they see one layout with the
 * words swapped, every demo he has ever sent becomes a template blast
 * retroactively, and the credit line at the bottom stops being a portfolio and
 * starts being an accusation.
 *
 * A palette swap does not survive that test. Somebody looking for the trick
 * finds it in four seconds: same hero, same card grid, same order. So a theme
 * here changes four things at once, and each of them is visible from across a
 * room:
 *
 *   PALETTE       a full contrast-verified ladder, not a hue rotation.
 *   TYPE PAIRING  which family sets the headings and which sets the body.
 *                 Heritage sets headings in a serif; Quiet campus inverts it
 *                 and sets the BODY in a serif under a sans heading.
 *   HERO          three compositions, `deep`, `light` and `type-led`, which
 *                 put the name, the fact panel and the photograph in different
 *                 places. All three obey the same spec: left aligned at the
 *                 gutter, no outline box, no centred block, and a second column
 *                 that holds true content or does not exist.
 *   SECTION ORDER what a parent meets second, third and fourth.
 *
 * WHAT NO THEME MAY CHANGE. The spine. The facts row sits directly under the
 * hero, "come and see us" is the page's second and last background change,
 * "how to apply" follows it, the page's single hairline rule comes next, and
 * contact is the last word. See `schoolSectionOrder` below.
 *
 * NO NEW FONT IS DOWNLOADED FOR ANY OF THIS.
 * ------------------------------------------
 * The site already fetches Sora and Inter, and the demo uses the DEVICE serif
 * for its serif pairings: Georgia on Windows and macOS, Noto Serif through
 * `serif` on Android. That is a genuinely different voice at zero bytes on a
 * phone on patchy data, which is the connection this page is actually opened
 * on. Instrument Serif is NOT used here: it is the Ideovent site's own accent
 * face, and the one thing this page must not look like is the agency that
 * made it.
 *
 * ONE DISPLAY WEIGHT PER THEME, 500 OR 600.
 * ----------------------------------------
 * 21st.dev runs its whole homepage at weight 500 and gets its contrast from
 * COLOUR and FAMILY: a white clause continuing into a grey one, a serif
 * italic word inside a sans line. The earlier idea of a 300 against an 800 in
 * the same headline is withdrawn; a serif display face keeps its own 400,
 * which is that family's display weight.
 *
 * COLOUR LIVES IN CUSTOM PROPERTIES, NOT IN TAILWIND TOKENS.
 * ----------------------------------------------------------
 * Every value below is emitted as a `--ds-*` custom property on the demo's
 * root element (`demoThemeStyle`), and the template reads them through
 * `hsl(var(--ds-x))`. Nothing here touches `--primary`, `--background` or any
 * other token in src/index.css, so:
 *
 *   - a demo never inherits Ideovent navy, which would make the school's own
 *     website look like the agency's brochure;
 *   - the page renders identically whether the visitor's stored next-themes
 *     class is `light` or `dark`, because a school's website does not have a
 *     dark mode and a half-applied one is how a demo gets unreadable text;
 *   - none of this CSS is in the global stylesheet, so a visitor to /pricing
 *     never downloads it.
 *
 * EVERY PAIR BELOW IS MEASURED, NOT EYEBALLED.
 * `scripts/check-demo-contrast.mjs` parses the token blocks out of THIS FILE
 * and computes the WCAG ratio for every pair: each text token against every
 * ground it is painted on, the text on a brand fill, the three hero pairs. AA
 * (4.5:1) everywhere, with no large-text exemption taken, because one token
 * sets a 13px label and an 84px headline and a ratio that is only legal at
 * one of those sizes will be used at the other. It runs in the build. Run it
 * before changing a hex here.
 *
 * WHAT IT CANNOT SEE, so that a green run is not trusted further than it goes:
 * text painted over a PHOTOGRAPH. When a school sends a hero image it sits in
 * its own column and no text is ever set over it, which is why there is no
 * scrim to measure.
 */

import type { CSSProperties } from "react";

/* ── The section vocabulary ──────────────────────────────────────────────── */

/**
 * The sections of a school site. `hero`, the facts row and the demo marker
 * are not in this list: the hero and the facts row are part of the spine and
 * the marker is mandatory, so none of the three is reorderable.
 */
export type DemoSchoolSectionId =
  | "about"
  | "admissions"
  | "academics"
  | "results"
  | "faculty"
  | "facilities"
  | "gallery"
  | "principal"
  | "notices"
  | "visit"
  | "contact";

/** Every section, in the brief's default order. A theme reorders the middle, never edits it. */
export const DEMO_SCHOOL_SECTIONS: DemoSchoolSectionId[] = [
  "principal",
  "about",
  "academics",
  "results",
  "facilities",
  "faculty",
  "gallery",
  "visit",
  "admissions",
  "notices",
  "contact",
];

/**
 * THE SPINE: THE SECTIONS NO THEME MAY MOVE, AND WHY EACH ONE IS PINNED.
 *
 * `theme.sections` lists the REORDERABLE middle of the page only. The tail is
 * fixed, in this order:
 *
 *   VISIT, as the page's second and last background change. The brief allows
 *   two grounds on the whole page, the hero and one deep band, and a theme
 *   that moved the deep band into the middle would put the page's one colour
 *   change where it separates nothing. Brighton College answers "how do I
 *   talk to a person" with dated, named, bookable open mornings, and that is
 *   what this band carries.
 *
 *   ADMISSIONS, "how to apply", directly after the band. The steps and the
 *   documents are reference for a parent who has already decided to visit.
 *
 *   The page's SINGLE HAIRLINE RULE, at the top of whatever comes next. It
 *   marks the shift from persuasion to reference (21st.dev has exactly one
 *   border-top on its entire homepage, on the FAQ).
 *
 *   NOTICES, unless a theme has pulled them up into the middle, and CONTACT,
 *   last, because a school site's last word is how to reach it.
 */
export const DEMO_SCHOOL_PINNED_SECTIONS: DemoSchoolSectionId[] = ["visit", "admissions", "notices", "contact"];

/**
 * How the hero is put together. All three obey the hero spec: left aligned at
 * the page gutter, no outline box, min-height 62svh, and a second column that
 * holds the school's photograph, else a panel of true facts, else nothing.
 *
 *   deep      the school's own deep colour full bleed; the fact panel is four
 *             hairline rows in the hero ink. The most institutional.
 *   light     the page ground; the fact panel is a solid block of the school's
 *             colour carrying type, Avenues style. Reads newer.
 *   type-led  the page ground and no second column at all. The name is set at
 *             the full hero size across a 22ch measure, the four facts run as
 *             one hairline row beneath it, and the crest sits behind at 7%
 *             opacity bleeding off the right edge. The photograph, when there
 *             is one, becomes the first band under the type.
 */
export type DemoHeroKind = "deep" | "light" | "type-led";

/** Which family sets headings, and which sets running text. */
export type DemoTypePairing =
  | "serif-display"   // serif headings over a sans body
  | "sans-light"      // Sora at 500 with tight tracking, sans body
  | "sans-heavy"      // Sora at 600, uppercase, sans body
  | "sans-over-serif" // Sora at 500 over a SERIF body
  | "sans-solid";     // Sora at 600 throughout

export interface DemoSchoolTheme {
  id: DemoSchoolThemeId;
  /** What Mehdi sees in the dropdown. Plain words, no jargon. */
  label: string;
  /** One line, so he can pick without opening five tabs. */
  blurb: string;
  hero: DemoHeroKind;
  pairing: DemoTypePairing;
  /**
   * The REORDERABLE middle of the page, in this theme's order. It never
   * contains `visit`, `admissions` or `contact`, and it contains `notices`
   * only when the theme wants them high: see `schoolSectionOrder`.
   */
  sections: DemoSchoolSectionId[];
  /**
   * Corner radius for buttons and tiles, as a CSS length. A school that reads
   * as old does not have 16px corners, and one that reads as new does not have
   * square ones. Photographs never exceed 8px whatever this says.
   */
  radius: string;
  /**
   * How a section head is punctuated. `bar` is a short accent bar over the
   * label, `hair` a hairline under it, `none` the label alone. It is NOT a rule
   * between sections: the page has exactly one of those.
   */
  rule: "bar" | "hair" | "none";
  /** hsl() triples, no `hsl()` wrapper, so alpha can be applied at use. */
  tokens: DemoThemeTokens;
}

export interface DemoThemeTokens {
  /** The page ground. */
  bg: string;
  /** A raised block on the ground. */
  surface: string;
  /** One step off the ground, for the unequal tiles. */
  surface2: string;
  /** Body text. AA on bg, surface and surface2. */
  ink: string;
  /** Secondary text. AA on all three, so it is never decorative grey. */
  inkSoft: string;
  /** The school's colour, as a FILL. Text on it is `onBrand`. */
  brand: string;
  /** Text on a brand fill. */
  onBrand: string;
  /** The school's colour as TEXT on the page. Darker than `brand` where it has to be. */
  brandInk: string;
  /** A second colour, for the small caps, the blank rule and the serif word. AA as text. */
  accent: string;
  /** Hairlines. Not held to a text ratio: nothing is read off it. */
  line: string;
  /** The hero's own ground and its three text colours. */
  heroBg: string;
  heroInk: string;
  heroSoft: string;
  /** The eyebrow and the serif word on the hero ground. Measured against heroBg. */
  heroAccent: string;
}

export type DemoSchoolThemeId =
  | "heritage"
  | "modern-campus"
  | "bright"
  | "quiet-campus"
  | "riverside";

/* ── Font stacks ─────────────────────────────────────────────────────────── */

/*
  Three stacks, all of them already paid for.

  SANS is Inter, which index.html already fetches, with the same full system
  fallback the site uses so the first paint is not Times.

  DISPLAY is Sora, also already fetched.

  SERIF is the DEVICE serif and nothing is downloaded for it. Georgia ships on
  Windows and macOS, "Iowan Old Style" on iOS, and `serif` resolves to Noto
  Serif on Android. All three are text faces with real italics and proper old
  style proportions. This is the one place where not having a webfont budget
  produces a better answer than having one: the face is already in memory, so
  the heritage theme has no font swap at all on a slow connection.
*/
const SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const DISPLAY =
  'Sora, "Sora Fallback", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF =
  'ui-serif, Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", Times, serif';

/** The family that sets headings under each pairing. */
export function displayFamily(pairing: DemoTypePairing): string {
  return pairing === "serif-display" ? SERIF : DISPLAY;
}

/** The family that sets running text under each pairing. */
export function bodyFamily(pairing: DemoTypePairing): string {
  return pairing === "sans-over-serif" ? SERIF : SANS;
}

/**
 * THE ACCENT FACE, AND IT IS THE SAME ONE IN ALL FIVE THEMES.
 *
 * 21st.dev's hero sets "The *living* library of interfaces" with the one word
 * in Averia Serif Libre italic at 69.12px inside a 64px General Sans line: a
 * serif at the same nominal size as a geometric sans reads smaller, so it is
 * stepped up 8 per cent to match optically. That single device is the
 * strongest "a person set this" signal available and it costs one family.
 *
 * Here it is the DEVICE serif, which is already in memory, so the accent adds
 * nothing to a page opened on patchy data. In Heritage the surrounding text is
 * ALREADY a serif, so the accent has no family contrast there and reads
 * instead through the italic, the accent colour and the 8 per cent size step.
 * That is how a serif book has always set emphasis, and it is still only used
 * twice on the page.
 */
export function accentFamily(): string {
  return SERIF;
}

/**
 * Heading weight, tracking and case, per pairing.
 *
 * One weight each, 500 or 600 (400 for the serif, which is that family's
 * display weight). Contrast between two themes' headings comes from family,
 * case and tracking, not from a weight jump.
 */
export function displayStyle(pairing: DemoTypePairing): {
  weight: number;
  tracking: string;
  transform: "none" | "uppercase";
} {
  switch (pairing) {
    case "serif-display":
      return { weight: 400, tracking: "-0.015em", transform: "none" };
    case "sans-light":
      return { weight: 500, tracking: "-0.03em", transform: "none" };
    case "sans-heavy":
      return { weight: 600, tracking: "0.01em", transform: "uppercase" };
    case "sans-over-serif":
      return { weight: 500, tracking: "-0.035em", transform: "none" };
    case "sans-solid":
    default:
      return { weight: 600, tracking: "-0.025em", transform: "none" };
  }
}

/* ── The five themes ─────────────────────────────────────────────────────── */

/*
  A word on the section orders, because they are the part that is easiest to
  get wrong by being clever.

  The brief's order is principal, about, academics, results, facilities,
  faculty, gallery: the head's welcome high (Brighton College puts it in the
  hero itself), then the prospectus paragraph, then what is taught, then the
  proof, then the building and the people. Where a theme departs from that it
  is for a stated reason. Modern campus leads with academics because it is
  built for a school whose argument is its curriculum. Bright pulls notices to
  the top because it is built for a busy day school whose parents open the site
  to find out whether Saturday is a holiday, and a school that visibly posts
  its own circulars is a school that is running. Quiet campus leads with the
  prose because it is built for a school whose age is the argument.

  The nine shapes in the middle are all different from each other (portrait
  and quote, 60/40 prose, age-band rows, metric lines, unequal tiles, people
  row, captioned views, dated list), so any order satisfies "no shape repeats
  within three sections of itself". The spacing step is settled by
  `schoolSteps` after the order is known, so no two adjacent sections can
  share one whatever the theme chose.
*/
export const DEMO_SCHOOL_THEMES: Record<DemoSchoolThemeId, DemoSchoolTheme> = {
  heritage: {
    id: "heritage",
    label: "Heritage",
    blurb: "Bottle green and ivory, serif headings, the name on a deep ground with the facts beside it. For an older school whose age is the argument.",
    hero: "deep",
    pairing: "serif-display",
    radius: "4px",
    rule: "hair",
    sections: ["principal", "about", "academics", "results", "faculty", "facilities", "gallery"],
    tokens: {
      bg: "40 43% 96%",          /* #FBF8F1 ivory */
      surface: "0 0% 100%",
      surface2: "42 43% 91%",    /* #F3EDE0 */
      ink: "150 21% 14%",        /* #1C2B22, 13.96:1 on the ground */
      inkSoft: "152 12% 32%",    /* #4A5A50, 6.90:1 */
      brand: "155 60% 18%",      /* #12492F */
      onBrand: "42 50% 93%",     /* #F6F1E4, 9.22:1 on the fill */
      brandInk: "155 62% 15%",   /* #0E3D27, 11.54:1 on the ground */
      accent: "37 73% 31%",      /* #8A5A16 bronze, 5.57:1 */
      line: "40 27% 78%",        /* #DED5C2 */
      heroBg: "155 60% 18%",
      heroInk: "42 55% 94%",     /* #F8F3E6, 9.38:1 */
      heroSoft: "140 20% 84%",   /* #CFDDD2, 7.39:1 */
      heroAccent: "40 72% 74%",  /* #EDD08E pale gold, 6.70:1 on the hero */
    },
  },

  "modern-campus": {
    id: "modern-campus",
    label: "Modern campus",
    blurb: "Graphite and a strong blue, Sora headings, a light hero with the facts set in a solid blue block. Leads with academics.",
    hero: "light",
    pairing: "sans-light",
    radius: "10px",
    rule: "bar",
    sections: ["academics", "results", "principal", "about", "facilities", "faculty", "gallery"],
    tokens: {
      bg: "213 33% 97%",         /* #F5F7FA */
      surface: "0 0% 100%",
      surface2: "212 38% 95%",   /* #ECF1F7 */
      ink: "214 33% 9%",         /* #10161F, 16.92:1 */
      inkSoft: "217 17% 35%",    /* #495669, 6.94:1 */
      brand: "220 76% 44%",      /* #1A4FC4 */
      onBrand: "0 0% 100%",      /* 7.10:1 on the fill */
      brandInk: "220 77% 37%",   /* #1544A8, 8.07:1 */
      accent: "186 82% 25%",     /* #0B6A73, 5.89:1 */
      line: "214 27% 83%",       /* #D5DEEC */
      /* A LIGHT hero: the hero ground IS the page ground, so the three hero
         text tokens are the page's own and the block of blue carries the
         facts. */
      heroBg: "213 33% 97%",
      heroInk: "214 33% 9%",
      heroSoft: "217 17% 35%",
      heroAccent: "186 82% 25%",
    },
  },

  bright: {
    id: "bright",
    label: "Bright and busy",
    blurb: "Marigold and deep red, uppercase Sora headings, notices near the top. For a full day school with something on every week.",
    hero: "deep",
    pairing: "sans-heavy",
    radius: "6px",
    rule: "bar",
    sections: ["notices", "academics", "results", "facilities", "faculty", "gallery", "principal", "about"],
    tokens: {
      bg: "45 100% 98%",         /* #FFFDF7 */
      surface: "0 0% 100%",
      surface2: "41 100% 92%",   /* #FFF2D9 */
      ink: "30 60% 11%",         /* #2A1A0B, 16.50:1 */
      inkSoft: "32 35% 27%",     /* #5C452C, 8.81:1 */
      brand: "17 84% 38%",       /* #B4380F */
      onBrand: "32 100% 96%",    /* #FFF7EC, 5.63:1 on the fill */
      brandInk: "17 89% 33%",    /* #9C3009, 7.27:1 */
      accent: "157 68% 22%",     /* #12603F, 7.45:1 */
      line: "38 50% 81%",        /* #F0E2C8 */
      heroBg: "17 84% 38%",
      heroInk: "32 100% 96%",
      heroSoft: "26 79% 90%",    /* #FBE4D0, 4.79:1 */
      heroAccent: "45 100% 88%", /* #FFF0C2 marigold, 5.14:1 on the hero */
    },
  },

  "quiet-campus": {
    id: "quiet-campus",
    label: "Quiet campus",
    blurb: "Bone and ink, an enormous type-led opening with no photograph above the fold, running text set in a serif. Leads with the prose.",
    hero: "type-led",
    pairing: "sans-over-serif",
    radius: "2px",
    rule: "none",
    sections: ["about", "principal", "academics", "results", "faculty", "gallery", "facilities"],
    tokens: {
      bg: "45 12% 95%",          /* #F4F3EF */
      surface: "0 0% 100%",
      surface2: "45 13% 90%",    /* #E9E7E0 */
      ink: "60 6% 10%",          /* #1A1A17, 15.71:1 */
      inkSoft: "60 4% 32%",      /* #55554E, 6.77:1 */
      brand: "60 5% 13%",        /* #23231F */
      onBrand: "45 12% 95%",     /* 14.20:1 on the fill */
      brandInk: "60 5% 13%",
      accent: "35 59% 30%",      /* #7A551F, 6.01:1 */
      line: "45 11% 79%",        /* #D9D7CF */
      heroBg: "45 12% 95%",
      heroInk: "60 6% 10%",
      heroSoft: "60 4% 32%",
      heroAccent: "35 59% 30%",
    },
  },

  riverside: {
    id: "riverside",
    label: "Riverside",
    blurb: "Teal and terracotta, rounded, the name on a deep teal ground. Warm rather than formal, for a primary or a community school.",
    hero: "deep",
    pairing: "sans-solid",
    radius: "16px",
    rule: "hair",
    sections: ["principal", "facilities", "academics", "results", "gallery", "faculty", "about"],
    tokens: {
      bg: "170 38% 97%",         /* #F4FAF9 */
      surface: "0 0% 100%",
      surface2: "171 34% 91%",   /* #E1F0EE */
      ink: "173 43% 10%",        /* #0E2320, 15.54:1 */
      inkSoft: "173 20% 30%",    /* #3C5A56, 7.13:1 */
      brand: "175 79% 21%",      /* #0B5E57 */
      onBrand: "168 60% 96%",    /* #F2FBF9, 7.24:1 on the fill */
      brandInk: "175 79% 19%",   /* #0A554F, 8.20:1 */
      accent: "9 63% 41%",       /* #A93A26, 5.99:1 */
      line: "171 26% 80%",       /* #CFE4E1 */
      heroBg: "175 79% 21%",
      heroInk: "168 60% 96%",
      heroSoft: "172 29% 79%",   /* #B9DAD5, 5.10:1 */
      heroAccent: "20 85% 84%",  /* #F9CDB3 pale terracotta, 5.02:1 on the hero */
    },
  },
};

/** The dropdown order in the admin, and the order this file documents. */
export const DEMO_SCHOOL_THEME_IDS: DemoSchoolThemeId[] = [
  "heritage",
  "modern-campus",
  "bright",
  "quiet-campus",
  "riverside",
];

/**
 * The default, used when a record has no theme and when it has a bad one.
 *
 * Heritage, and not the newest-looking one. An unset theme means Mehdi made
 * the record quickly, which means he has a name and a city and nothing else,
 * and Heritage is the composition that carries an empty record best: its hero
 * needs no photograph and its opening argument is the school's own name set
 * large on the school's own colour.
 */
export const DEMO_SCHOOL_THEME_DEFAULT: DemoSchoolThemeId = "heritage";

/** The theme for a record. Never throws, never returns undefined. */
export function schoolTheme(id: string | undefined): DemoSchoolTheme {
  const found = id ? DEMO_SCHOOL_THEMES[id as DemoSchoolThemeId] : undefined;
  return found || DEMO_SCHOOL_THEMES[DEMO_SCHOOL_THEME_DEFAULT];
}

/* ── The order, and the spine ────────────────────────────────────────────── */

/**
 * Every section in the order this theme renders it: the theme's middle, then
 * the fixed tail. Anything the theme forgot is appended in the default order,
 * so a theme can never lose a section by omitting it, and anything the theme
 * listed that belongs to the tail is ignored where it was and placed where the
 * spine puts it.
 */
export function schoolSectionOrder(theme: DemoSchoolTheme): DemoSchoolSectionId[] {
  const tail: DemoSchoolSectionId[] = ["visit", "admissions", "notices", "contact"];
  const middle = theme.sections.filter((id) => !tail.includes(id) || id === "notices");
  const noticesEarly = middle.includes("notices");
  const seen = new Set<DemoSchoolSectionId>(middle);
  const rest = DEMO_SCHOOL_SECTIONS.filter((id) => !seen.has(id) && !tail.includes(id));
  return [...middle, ...rest, ...tail.filter((id) => !(id === "notices" && noticesEarly))];
}

/**
 * The section that carries the page's ONE hairline rule: the first one after
 * the deep band and the steps, where persuasion ends and reference begins.
 */
export function schoolRuleSection(order: DemoSchoolSectionId[]): DemoSchoolSectionId | null {
  /* After "how to apply" when it rendered, otherwise straight after the deep
     band. The list this is given is the RENDERED list, so a dropped section
     cannot leave the rule pointing at nothing. */
  const at = Math.max(order.indexOf("admissions"), order.indexOf("visit"));
  return at >= 0 && at + 1 < order.length ? order[at + 1] : null;
}

/* ── Vertical rhythm ─────────────────────────────────────────────────────── */

/**
 * The four steps, from the brief's table (mobile top/bottom, desktop
 * top/bottom): band 20/20 and 24/24, tight 48/56 and 64/72, normal 64/72 and
 * 96/112, loud 88/96 and 136/160. Rhythm comes from sections having different
 * jobs and therefore different heights; the steps only stop two neighbours
 * from ever having the same padding.
 */
export type SchoolStep = "band" | "tight" | "normal" | "loud";

export function schoolPad(step: SchoolStep): string {
  switch (step) {
    case "band":
      return "py-5 lg:py-6";
    case "tight":
      return "pt-12 pb-14 lg:pt-16 lg:pb-[4.5rem]";
    case "loud":
      return "pt-[5.5rem] pb-24 lg:pt-[8.5rem] lg:pb-40";
    case "normal":
    default:
      return "pt-16 pb-[4.5rem] lg:pt-24 lg:pb-28";
  }
}

/** The step each section asks for. What it gets is settled by `schoolSteps`. */
export const SCHOOL_PREFERRED_STEP: Record<DemoSchoolSectionId, SchoolStep> = {
  principal: "normal",
  about: "normal",
  academics: "loud",
  results: "tight",
  facilities: "normal",
  faculty: "normal",
  gallery: "normal",
  visit: "loud",
  admissions: "normal",
  notices: "tight",
  contact: "normal",
};

/**
 * The step each RENDERED section gets, with the one mechanical rule from the
 * brief applied: no two adjacent sections use the same step. Where a section
 * would repeat its neighbour's step it drops one notch, loud to normal and
 * normal to tight, or climbs from tight to normal. Computed on the rendered
 * list, not the theme's list, because a section that did not render has no
 * neighbours.
 */
export function schoolSteps(
  rendered: DemoSchoolSectionId[],
  first: SchoolStep | null = null,
): Record<string, SchoolStep> {
  const out: Record<string, SchoolStep> = {};
  let prev: SchoolStep | null = first;
  for (const id of rendered) {
    let step = SCHOOL_PREFERRED_STEP[id];
    if (step === prev) step = step === "tight" ? "normal" : step === "loud" ? "normal" : "tight";
    out[id] = step;
    prev = step;
  }
  return out;
}

/* ── Emitting the theme ──────────────────────────────────────────────────── */

/**
 * The theme as inline custom properties for the demo's root element.
 *
 * Returned as a plain style object rather than written into src/index.css on
 * purpose. Three reasons, in order of how much they matter:
 *
 *   1. None of it reaches the global stylesheet, so a visitor who only ever
 *      opens /pricing does not download a school's palette.
 *   2. The values are scoped to one element, so `--primary` and the rest of
 *      the site's tokens are untouched and the demo cannot accidentally
 *      inherit Ideovent navy.
 *   3. `color-scheme: only light` is set here. Without it a phone in dark
 *      mode renders form controls, the date input and the scrollbar in its
 *      own dark chrome on top of a light page, which is exactly the kind of
 *      half-broken detail a director notices and cannot name.
 */
export function demoThemeStyle(theme: DemoSchoolTheme): CSSProperties {
  const t = theme.tokens;
  const d = displayStyle(theme.pairing);
  return {
    // Colour
    ["--ds-bg" as string]: t.bg,
    ["--ds-surface" as string]: t.surface,
    ["--ds-surface-2" as string]: t.surface2,
    ["--ds-ink" as string]: t.ink,
    ["--ds-ink-soft" as string]: t.inkSoft,
    ["--ds-brand" as string]: t.brand,
    ["--ds-on-brand" as string]: t.onBrand,
    ["--ds-brand-ink" as string]: t.brandInk,
    ["--ds-accent" as string]: t.accent,
    ["--ds-line" as string]: t.line,
    ["--ds-hero-bg" as string]: t.heroBg,
    ["--ds-hero-ink" as string]: t.heroInk,
    ["--ds-hero-soft" as string]: t.heroSoft,
    ["--ds-hero-accent" as string]: t.heroAccent,
    // Type
    ["--ds-display" as string]: displayFamily(theme.pairing),
    ["--ds-body" as string]: bodyFamily(theme.pairing),
    ["--ds-serif" as string]: accentFamily(),
    ["--ds-display-weight" as string]: String(d.weight),
    ["--ds-display-tracking" as string]: d.tracking,
    ["--ds-display-transform" as string]: d.transform,
    // Shape
    ["--ds-radius" as string]: theme.radius,
    // Chrome
    colorScheme: "only light",
    background: `hsl(${t.bg})`,
    color: `hsl(${t.ink})`,
  } as CSSProperties;
}
