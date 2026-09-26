/**
 * THE MULTI-PAGE THEMES (26 September 2026).
 *
 * A record whose `theme` is one of these ids renders the multi-page site
 * (src/pages/site/SiteShell.tsx). A record on any OLDER id (heritage,
 * modern-campus, bright, quiet-campus, riverside, ledger, signal, studio,
 * marks, bulletin) keeps rendering its single page exactly as it was sent:
 * those looks are frozen because demos already sent use them.
 *
 * ── WHAT A THEME OWNS HERE, AND WHAT IT DOES NOT ───────────────────────────
 * The theme owns the PALETTE and three small switches (type face, corner
 * radius, motion budget). The COMPOSITION (hero shape, section rhythm, card
 * language, top-bar behaviour, the no-photo state) belongs to the FAMILY, and
 * inside a family to the hero VARIANT a or b, so two templates of one family
 * still open on different first screens. See src/pages/site/kit/.
 *
 *   school    metro (Modern a, s1)   atlas (Modern b, s5)
 *             aangan (Warm a, s2)    crayon (Warm b, s3)
 *             pinewood (Classic a, s4)  almanac (Classic b, spare)
 *   coaching  podium (Modern a, c1)  timetable (Modern b, c5)
 *             register (Classic a, c2)  folio (Classic b, c3)
 *             courtyard (Warm a, c4)
 *
 * ── THE TOKENS ─────────────────────────────────────────────────────────────
 * Emitted as `--ds-*` custom properties (the same names the single-page school
 * template uses, so DemoLanguageToggle tone="ds" works on both). Every text
 * pair is measured by scripts/check-demo-contrast.mjs, which parses THIS file:
 * keep each table as `tokens: {` with one `key: "h s% l%"` per line, closed by
 * `    },` at four spaces. `rule` is decorative (never text). `cta` is the one
 * action colour (Apply, Book demo) and `onCta` its label.
 *
 * Fonts: the budget is Inter, Sora and the device serif. Nothing new loads.
 */

import type { CSSProperties } from "react";
import type { DemoKind } from "@/lib/cms/types";
import type { DesignFamily } from "../templates/families";

import { isSiteThemeId, type SiteThemeId } from "./ids";
export { isSiteThemeId };
export type { SiteSchoolThemeId, SiteCoachingThemeId, SiteThemeId } from "./ids";

/** a or b: the two first-screen shapes each family has. */
export type HeroVariant = "a" | "b";

/** serif: device serif display over Inter. sora: Sora display over Inter. sans: Inter only. */
export type SiteFace = "serif" | "sora" | "sans";

/**
 * full: reveals, counters, FLIP filters, page transitions.
 * light: reveals only (rural pages on slow phones): no FLIP, no counters, no
 * View Transitions. Reduced motion overrides both to nothing.
 */
export type SiteMotion = "full" | "light";

export interface SiteTokens {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  inkSoft: string;
  brand: string;
  onBrand: string;
  brandInk: string;
  accent: string;
  line: string;
  rule: string;
  heroBg: string;
  heroInk: string;
  heroSoft: string;
  heroAccent: string;
  cta: string;
  onCta: string;
}

export interface SiteTheme {
  id: SiteThemeId;
  kind: DemoKind;
  family: DesignFamily;
  variant: HeroVariant;
  /** Colour words for the template card and the admin's Look dropdown. */
  paletteName: string;
  face: SiteFace;
  /** Card corner radius, CSS length. */
  radius: string;
  motion: SiteMotion;
  tokens: SiteTokens;
}

/* ── The table (generated from measured hex values; see the header) ─────── */
export const SITE_THEMES: Record<SiteThemeId, SiteTheme> = {
  metro: {
    id: "metro",
    kind: "school",
    family: "modern",
    variant: "a",
    paletteName: "Navy, blue and marigold",
    face: "sora",
    radius: "12px",
    motion: "full",
    tokens: {
      bg: "216 38.5% 97.5%",          /* #F6F8FB */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "214 50% 94.5%",    /* #EAF0F8 */
      ink: "216 50% 11.8%",         /* #0F1B2D */
      inkSoft: "215 19.3% 34.5%",     /* #475569 */
      brand: "223 71.2% 49%",       /* #2457D6 */
      onBrand: "0 0% 100%",     /* #FFFFFF */
      brandInk: "223 72.1% 40.8%",    /* #1D47B3 */
      accent: "39 100% 27.1%",      /* #8A5A00 */
      line: "216 32.3% 81.8%",  /* hairline, darkened to 1.4:1 */
      rule: "39 89.4% 51.8%",        /* #F2A516 */
      heroBg: "216 59.5% 15.5%",      /* #10233F */
      heroInk: "220 42.9% 97.3%",     /* #F5F7FB */
      heroSoft: "216 26.8% 78%",    /* #B8C4D6 */
      heroAccent: "39 89.4% 51.8%",  /* #F2A516 */
      cta: "39 89.4% 51.8%",         /* #F2A516 */
      onCta: "216 59.5% 15.5%",       /* #10233F */
    },
  },
  atlas: {
    id: "atlas",
    kind: "school",
    family: "modern",
    variant: "b",
    paletteName: "Ink teal, sea glass and coral",
    face: "sora",
    radius: "12px",
    motion: "full",
    tokens: {
      bg: "160 17.6% 96.7%",          /* #F5F8F7 */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "160 28.6% 91.8%",    /* #E4F0EC */
      ink: "190 62.7% 11.6%",         /* #0B2A30 */
      inkSoft: "178 16.4% 32.4%",     /* #45605F */
      brand: "189 65.4% 15.9%",       /* #0E3B43 */
      onBrand: "165 44.4% 96.5%",     /* #F2FAF8 */
      brandInk: "189 65.4% 15.9%",    /* #0E3B43 */
      accent: "10 56.3% 42.2%",      /* #A8442F */
      line: "159 21.5% 78.5%",  /* hairline, darkened to 1.4:1 */
      rule: "164 34.9% 74.7%",        /* #A8D5C9 */
      heroBg: "189 65.4% 15.9%",      /* #0E3B43 */
      heroInk: "165 44.4% 96.5%",     /* #F2FAF8 */
      heroSoft: "164 34.9% 74.7%",    /* #A8D5C9 */
      heroAccent: "10 83.6% 76.1%",  /* #F5A08F */
      cta: "10 73.4% 60.2%",         /* #E4674F */
      onCta: "11 47.8% 9%",       /* #22100C */
    },
  },
  aangan: {
    id: "aangan",
    kind: "school",
    family: "warm",
    variant: "a",
    paletteName: "Brick red, haldi and cream",
    face: "sans",
    radius: "16px",
    motion: "light",
    tokens: {
      bg: "37 100% 96.9%",          /* #FFF9EF */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "39 81% 91.8%",    /* #FBEFD9 */
      ink: "20 40% 11.8%",         /* #2A1A12 */
      inkSoft: "21 29.3% 32.2%",     /* #6A4B3A */
      brand: "10 64.4% 39.6%",       /* #A63A24 */
      onBrand: "37 100% 96.9%",     /* #FFF9EF */
      brandInk: "10 67.1% 33.3%",    /* #8E2F1C */
      accent: "40 100% 23.9%",      /* #7A5200 */
      line: "38 52.3% 76.7%",  /* hairline, darkened to 1.4:1 */
      rule: "41 79.1% 56.9%",        /* #E8B23A */
      heroBg: "10 64.4% 39.6%",      /* #A63A24 */
      heroInk: "37 100% 96.9%",     /* #FFF9EF */
      heroSoft: "25 74.2% 87.8%",    /* #F7DCC9 */
      heroAccent: "44 91.9% 80.6%",  /* #FBE2A0 */
      cta: "41 79.1% 56.9%",         /* #E8B23A */
      onCta: "20 40% 11.8%",       /* #2A1A12 */
    },
  },
  crayon: {
    id: "crayon",
    kind: "school",
    family: "warm",
    variant: "b",
    paletteName: "Sky, tangerine and leaf on cream",
    face: "sans",
    radius: "24px",
    motion: "full",
    tokens: {
      bg: "40 100% 97.6%",          /* #FFFBF3 */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "203 75% 95.3%",    /* #EAF5FC */
      ink: "212 30.2% 16.9%",         /* #1E2A38 */
      inkSoft: "210 16.1% 36.5%",     /* #4E5D6C */
      brand: "205 70.6% 38.6%",       /* #1D6FA8 */
      onBrand: "0 0% 100%",     /* #FFFFFF */
      brandInk: "204 72.3% 32.5%",    /* #17608F */
      accent: "122 39.9% 30%",      /* #2E6B30 */
      line: "213 24.4% 85.2%",  /* hairline, darkened to 1.4:1 */
      rule: "202 70.1% 69.8%",        /* #7CC0E8 */
      heroBg: "40 100% 97.6%",      /* #FFFBF3 */
      heroInk: "212 30.2% 16.9%",     /* #1E2A38 */
      heroSoft: "210 16.1% 36.5%",    /* #4E5D6C */
      heroAccent: "19 88.5% 37.5%",  /* #B4400B */
      cta: "30 88.6% 55.3%",         /* #F28C28 */
      onCta: "27 75% 9.4%",       /* #2A1606 */
    },
  },
  pinewood: {
    id: "pinewood",
    kind: "school",
    family: "classic",
    variant: "a",
    paletteName: "Pine, brass and parchment",
    face: "serif",
    radius: "3px",
    motion: "full",
    tokens: {
      bg: "43 53.8% 92.4%",          /* #F6F0E1 */
      surface: "44 65.2% 95.5%",     /* #FBF7EC */
      surface2: "43 47.7% 87.3%",    /* #EEE5CF */
      ink: "147 16.9% 12.7%",         /* #1B2620 */
      inkSoft: "130 7.1% 32.9%",     /* #4E5A50 */
      brand: "153 30.3% 17.5%",       /* #1F3A2E */
      onBrand: "43 53.8% 92.4%",     /* #F6F0E1 */
      brandInk: "153 30.3% 17.5%",    /* #1F3A2E */
      accent: "41 57% 31%",      /* #7C5F22 */
      line: "43 37.2% 70.3%",  /* hairline, darkened to 1.4:1 */
      rule: "40 47.9% 46.7%",        /* #B08A3E */
      heroBg: "43 53.8% 92.4%",      /* #F6F0E1 */
      heroInk: "147 16.9% 12.7%",     /* #1B2620 */
      heroSoft: "130 7.1% 32.9%",    /* #4E5A50 */
      heroAccent: "41 57% 31%",  /* #7C5F22 */
      cta: "153 30.3% 17.5%",         /* #1F3A2E */
      onCta: "43 53.8% 92.4%",       /* #F6F0E1 */
    },
  },
  almanac: {
    id: "almanac",
    kind: "school",
    family: "classic",
    variant: "b",
    paletteName: "Oxblood on bone",
    face: "serif",
    radius: "2px",
    motion: "full",
    tokens: {
      bg: "40 38.5% 92.4%",          /* #F3EEE4 */
      surface: "42 50% 96.1%",     /* #FAF7F0 */
      surface2: "39 34.3% 86.9%",    /* #E9E1D2 */
      ink: "16 19.3% 11.2%",         /* #221A17 */
      inkSoft: "20 13.2% 31.2%",     /* #5A4C45 */
      brand: "357 56.7% 23.5%",       /* #5E1A1D */
      onBrand: "40 38.5% 92.4%",     /* #F3EEE4 */
      brandInk: "357 56.7% 23.5%",    /* #5E1A1D */
      accent: "29 60.5% 29.8%",      /* #7A4A1E */
      line: "38 29.1% 72.4%",  /* hairline, darkened to 1.4:1 */
      rule: "357 56.7% 23.5%",        /* #5E1A1D */
      heroBg: "40 38.5% 92.4%",      /* #F3EEE4 */
      heroInk: "16 19.3% 11.2%",     /* #221A17 */
      heroSoft: "20 13.2% 31.2%",    /* #5A4C45 */
      heroAccent: "357 56.7% 23.5%",  /* #5E1A1D */
      cta: "357 56.7% 23.5%",         /* #5E1A1D */
      onCta: "40 38.5% 92.4%",       /* #F3EEE4 */
    },
  },
  podium: {
    id: "podium",
    kind: "coaching",
    family: "modern",
    variant: "a",
    paletteName: "Navy, royal blue and teal",
    face: "sora",
    radius: "12px",
    motion: "full",
    tokens: {
      bg: "48 23.8% 95.9%",          /* #F7F6F2 */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "52 17.4% 91%",    /* #ECEBE4 */
      ink: "220 60.5% 14.9%",         /* #0F1E3D */
      inkSoft: "220 16.9% 34.9%",     /* #4A5468 */
      brand: "228 69.5% 46.3%",       /* #2446C8 */
      onBrand: "0 0% 100%",     /* #FFFFFF */
      brandInk: "228 69.5% 46.3%",    /* #2446C8 */
      accent: "172 82.8% 25.1%",      /* #0B7566 */
      line: "49 12.9% 77.3%",  /* hairline, darkened to 1.4:1 */
      rule: "42 74.3% 57.3%",        /* #E3B341 */
      heroBg: "220 60.5% 14.9%",      /* #0F1E3D */
      heroInk: "48 23.8% 95.9%",     /* #F7F6F2 */
      heroSoft: "221 26.1% 78.2%",    /* #B9C2D6 */
      heroAccent: "42 74.3% 57.3%",  /* #E3B341 */
      cta: "171 83.5% 26.1%",         /* #0B7A6A */
      onCta: "0 0% 100%",       /* #FFFFFF */
    },
  },
  timetable: {
    id: "timetable",
    kind: "coaching",
    family: "modern",
    variant: "b",
    paletteName: "Deep green and saffron",
    face: "sora",
    radius: "12px",
    motion: "full",
    tokens: {
      bg: "50 30% 96.1%",          /* #F8F7F2 */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "96 13.5% 92.7%",    /* #ECEFEA */
      ink: "155 23.1% 10.2%",         /* #14201B */
      inkSoft: "160 9.1% 32.4%",     /* #4B5A55 */
      brand: "164 75% 17.3%",       /* #0B4D3B */
      onBrand: "50 30% 96.1%",     /* #F8F7F2 */
      brandInk: "164 75% 17.3%",    /* #0B4D3B */
      accent: "29 79.1% 33.7%",      /* #9A5412 */
      line: "120 7.7% 78.7%",  /* hairline, darkened to 1.4:1 */
      rule: "30 69.6% 51%",        /* #D9822B */
      heroBg: "164 75% 17.3%",      /* #0B4D3B */
      heroInk: "50 30% 96.1%",     /* #F8F7F2 */
      heroSoft: "156 22.3% 76.3%",    /* #B5D0C5 */
      heroAccent: "31 83.2% 64.9%",  /* #F0A95B */
      cta: "30 69.6% 51%",         /* #D9822B */
      onCta: "33 64.7% 6.7%",       /* #1C1206 */
    },
  },
  register: {
    id: "register",
    kind: "coaching",
    family: "classic",
    variant: "a",
    paletteName: "Maroon on paper, marigold rule",
    face: "serif",
    radius: "2px",
    motion: "light",
    tokens: {
      bg: "42 55.6% 96.5%",          /* #FBF8F1 */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "41 47.8% 91%",    /* #F3ECDD */
      ink: "354 16.7% 11.8%",         /* #23191A */
      inkSoft: "6 11.7% 32%",     /* #5B4A48 */
      brand: "355 56.2% 26.9%",       /* #6B1E24 */
      onBrand: "42 55.6% 96.5%",     /* #FBF8F1 */
      brandInk: "355 56.2% 26.9%",    /* #6B1E24 */
      accent: "39 100% 27.1%",      /* #8A5A00 */
      line: "40 36.7% 74.8%",  /* hairline, darkened to 1.4:1 */
      rule: "41 79.4% 49.6%",        /* #E3A21A */
      heroBg: "42 55.6% 96.5%",      /* #FBF8F1 */
      heroInk: "354 16.7% 11.8%",     /* #23191A */
      heroSoft: "6 11.7% 32%",    /* #5B4A48 */
      heroAccent: "355 56.2% 26.9%",  /* #6B1E24 */
      cta: "355 56.2% 26.9%",         /* #6B1E24 */
      onCta: "42 55.6% 96.5%",       /* #FBF8F1 */
    },
  },
  folio: {
    id: "folio",
    kind: "coaching",
    family: "classic",
    variant: "b",
    paletteName: "Ink blue, bone and copper",
    face: "serif",
    radius: "3px",
    motion: "full",
    tokens: {
      bg: "42 31.3% 93.7%",          /* #F4F1EA */
      surface: "48 38.5% 97.5%",     /* #FBFAF6 */
      surface2: "42 27.9% 88%",    /* #E9E4D8 */
      ink: "222 39.4% 12.9%",         /* #141C2E */
      inkSoft: "223 14.5% 33.9%",     /* #4A5163 */
      brand: "221 46.5% 19.8%",       /* #1B2A4A */
      onBrand: "42 31.3% 93.7%",     /* #F4F1EA */
      brandInk: "221 46.5% 19.8%",    /* #1B2A4A */
      accent: "25 57.7% 34.3%",      /* #8A4F25 */
      line: "42 22.8% 74.2%",  /* hairline, darkened to 1.4:1 */
      rule: "25 54% 39.2%",        /* #9A5B2E */
      heroBg: "42 31.3% 93.7%",      /* #F4F1EA */
      heroInk: "222 39.4% 12.9%",     /* #141C2E */
      heroSoft: "223 14.5% 33.9%",    /* #4A5163 */
      heroAccent: "25 57.7% 34.3%",  /* #8A4F25 */
      cta: "221 46.5% 19.8%",         /* #1B2A4A */
      onCta: "42 31.3% 93.7%",       /* #F4F1EA */
    },
  },
  courtyard: {
    id: "courtyard",
    kind: "coaching",
    family: "warm",
    variant: "a",
    paletteName: "Teal, marigold and cream",
    face: "sans",
    radius: "20px",
    motion: "full",
    tokens: {
      bg: "38 100% 96.3%",          /* #FFF8EC */
      surface: "0 0% 100%",     /* #FFFFFF */
      surface2: "40 62.5% 90.6%",    /* #F6ECD8 */
      ink: "288 29.3% 19.4%",         /* #3A2340 */
      inkSoft: "287 14.3% 38.4%",     /* #6A5470 */
      brand: "177 76% 24.5%",       /* #0F6E6A */
      onBrand: "38 100% 96.3%",     /* #FFF8EC */
      brandInk: "178 76.5% 20%",    /* #0C5A57 */
      accent: "39 100% 27.1%",      /* #8A5A00 */
      line: "39 47.5% 78.3%",  /* hairline, darkened to 1.4:1 */
      rule: "41 79.4% 49.6%",        /* #E3A21A */
      heroBg: "177 76% 24.5%",      /* #0F6E6A */
      heroInk: "38 100% 96.3%",     /* #FFF8EC */
      heroSoft: "170 35.2% 86.1%",    /* #CFE8E4 */
      heroAccent: "43 93.5% 82%",  /* #FCE3A6 */
      cta: "41 79.4% 49.6%",         /* #E3A21A */
      onCta: "288 29.3% 19.4%",       /* #3A2340 */
    },
  },
};

/* ── Lookups ─────────────────────────────────────────────────────────────── */

export const SITE_THEME_IDS = Object.keys(SITE_THEMES) as SiteThemeId[];


/**
 * The multi-page theme a record wears, or null when it must keep its single
 * page. A multi-page id of the OTHER kind falls back to that kind's first
 * theme rather than mixing a school palette into coaching copy.
 */
export function siteThemeFor(kind: DemoKind, id: string | undefined): SiteTheme | null {
  if (!isSiteThemeId(id)) return null;
  const t = SITE_THEMES[id];
  if (t.kind === kind) return t;
  return SITE_THEMES[kind === "school" ? "metro" : "podium"];
}

const SERIF =
  'ui-serif, Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", Times, serif';
const SANS = '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SORA = '"Sora", "Inter", ui-sans-serif, system-ui, sans-serif';

/** The CSS variables for one theme, set on the site root. */
export function siteThemeStyle(theme: SiteTheme): CSSProperties {
  const t = theme.tokens;
  const vars: Record<string, string> = {
    "--ds-bg": t.bg,
    "--ds-surface": t.surface,
    "--ds-surface-2": t.surface2,
    "--ds-ink": t.ink,
    "--ds-ink-soft": t.inkSoft,
    "--ds-brand": t.brand,
    "--ds-on-brand": t.onBrand,
    "--ds-brand-ink": t.brandInk,
    "--ds-accent": t.accent,
    "--ds-line": t.line,
    "--ds-rule": t.rule,
    "--ds-hero-bg": t.heroBg,
    "--ds-hero-ink": t.heroInk,
    "--ds-hero-soft": t.heroSoft,
    "--ds-hero-accent": t.heroAccent,
    "--ds-cta": t.cta,
    "--ds-on-cta": t.onCta,
    "--ds-display": theme.face === "serif" ? SERIF : theme.face === "sora" ? SORA : SANS,
    "--ds-body": SANS,
    "--ds-serif": SERIF,
    "--ds-radius": theme.radius,
  };
  return {
    ...(vars as CSSProperties),
    colorScheme: "only light",
    background: `hsl(${t.bg})`,
    color: `hsl(${t.ink})`,
    fontFamily: "var(--ds-body)",
  };
}
