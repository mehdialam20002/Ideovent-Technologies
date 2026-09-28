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
 *   dental    haven (Clinical a, d1)  meridian (Clinical a, d2)
 *             ivory (Luxury a, d3)    anchor (Calm a, d4)
 *             mint (Clinical b, d5)   sprout (Clinical c = Kids, d6)
 *             harbour (Calm b, d7)
 *   Dental tables come from E:/myagency/_assets/DENTAL-DESIGN.md, contrast
 *   measured there and again by scripts/check-demo-contrast.mjs. Two dental
 *   rules the table cannot say: ivory's heroAccent (gold) is for display
 *   words 24px and up only (4.45:1); on anchor and harbour the sand
 *   heroAccent is the HERO's primary button fill with heroBg as its label,
 *   and `cta` (the brand teal) is the button everywhere else.
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
export type { SiteSchoolThemeId, SiteCoachingThemeId, SiteDentalThemeId, SiteThemeId } from "./ids";

/**
 * a or b: the two first-screen shapes each family has. c exists only on the
 * dental Clinical family: the Kids variant (sprout), same grammar as Clinical
 * with its own colour, shape and voice (DENTAL-DESIGN.md section 6).
 */
export type HeroVariant = "a" | "b" | "c";

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
  /* ── Dental (28 Sep 2026). Hex values and measured ratios: DENTAL-DESIGN.md. ── */
  haven: {
    id: "haven",
    kind: "dental",
    family: "clinical",
    variant: "a",
    paletteName: "Teal and cream",
    face: "sora",
    radius: "14px",
    motion: "full",
    tokens: {
      bg: "32 100% 97.5%",           /* #FFF9F2 */
      surface: "0 0% 100%",          /* #FFFFFF */
      surface2: "165 28.6% 94.5%",   /* #EDF5F3 */
      ink: "214 68.1% 13.5%",        /* #0B1F3A */
      inkSoft: "215 19.3% 34.5%",    /* #475569 */
      brand: "175 77.4% 26.1%",      /* #0F766E */
      onBrand: "0 0% 100%",          /* #FFFFFF */
      brandInk: "175 79% 20.6%",     /* #0B5E57 */
      accent: "175 79% 20.6%",       /* #0B5E57 */
      line: "32 57.7% 79.6%",        /* hairline, darkened to 1.4:1 */
      rule: "42 54% 53.9%",          /* #C9A24A */
      heroBg: "32 100% 97.5%",       /* #FFF9F2 */
      heroInk: "214 68.1% 13.5%",    /* #0B1F3A */
      heroSoft: "215 19.3% 34.5%",   /* #475569 */
      heroAccent: "175 77.4% 26.1%", /* #0F766E */
      cta: "175 77.4% 26.1%",        /* #0F766E */
      onCta: "0 0% 100%",            /* #FFFFFF */
    },
  },
  meridian: {
    id: "meridian",
    kind: "dental",
    family: "clinical",
    variant: "a",
    paletteName: "Navy, teal and royal blue",
    face: "sora",
    radius: "14px",
    motion: "full",
    tokens: {
      bg: "216 38.5% 97.5%",         /* #F6F8FB */
      surface: "0 0% 100%",          /* #FFFFFF */
      surface2: "208 44.8% 94.3%",   /* #EAF1F7 */
      ink: "214 68.1% 13.5%",        /* #0B1F3A */
      inkSoft: "215 19.3% 34.5%",    /* #475569 */
      brand: "214 68.1% 13.5%",      /* #0B1F3A */
      onBrand: "0 0% 100%",          /* #FFFFFF */
      brandInk: "214 68.1% 13.5%",   /* #0B1F3A */
      accent: "224 76.3% 48%",       /* #1D4ED8 */
      line: "218 23.5% 84.1%",       /* hairline, darkened to 1.4:1 */
      rule: "42 54% 53.9%",          /* #C9A24A */
      heroBg: "216 38.5% 97.5%",     /* #F6F8FB */
      heroInk: "214 68.1% 13.5%",    /* #0B1F3A */
      heroSoft: "215 19.3% 34.5%",   /* #475569 */
      heroAccent: "175 77.4% 26.1%", /* #0F766E */
      cta: "175 77.4% 26.1%",        /* #0F766E */
      onCta: "0 0% 100%",            /* #FFFFFF */
    },
  },
  ivory: {
    id: "ivory",
    kind: "dental",
    family: "luxury",
    variant: "a",
    paletteName: "Cream, espresso and antique gold",
    face: "serif",
    radius: "20px",
    motion: "full",
    tokens: {
      bg: "38 57.9% 96.3%",          /* #FBF7F0 */
      surface: "0 0% 100%",          /* #FFFFFF */
      surface2: "38 47.8% 91%",      /* #F3EBDD */
      ink: "33 21.6% 10%",           /* #1F1A14 */
      inkSoft: "35 14.6% 32.2%",     /* #5E5446 */
      brand: "28 28.4% 13.1%",       /* #2B2118 */
      onBrand: "38 57.9% 96.3%",     /* #FBF7F0 */
      brandInk: "28 28.4% 13.1%",    /* #2B2118 */
      accent: "38 62.4% 33.3%",      /* #8A6420 */
      line: "38 34.7% 80.2%",        /* hairline, darkened to 1.4:1 */
      rule: "41 59.4% 63.3%",        /* #D9B56A */
      heroBg: "38 57.9% 96.3%",      /* #FBF7F0 */
      heroInk: "33 21.6% 10%",       /* #1F1A14 */
      heroSoft: "35 14.6% 32.2%",    /* #5E5446 */
      heroAccent: "40 70.4% 33.1%",     /* #906919, 4.66 on bg (DENTAL-DESIGN had #946C1C, 4.45) */
      cta: "38 62.4% 33.3%",         /* #8A6420 */
      onCta: "0 0% 100%",            /* #FFFFFF */
    },
  },
  anchor: {
    id: "anchor",
    kind: "dental",
    family: "calm",
    variant: "a",
    paletteName: "Deep teal, sea glass and sand",
    face: "sora",
    radius: "6px",
    motion: "full",
    tokens: {
      bg: "160 15.8% 96.3%",         /* #F4F7F6 */
      surface: "0 0% 100%",          /* #FFFFFF */
      surface2: "169 24.4% 91.2%",   /* #E3EEEC */
      ink: "177 42.3% 10.2%",        /* #0F2524 */
      inkSoft: "175 15.7% 32.5%",    /* #46605E */
      brand: "179 61.6% 14.3%",      /* #0E3B3A */
      onBrand: "160 37.5% 96.9%",    /* #F4FAF8 */
      brandInk: "179 61.6% 14.3%",   /* #0E3B3A */
      accent: "34 66.3% 32.5%",      /* #8A5A1C */
      line: "158 11.3% 81%",         /* hairline, darkened to 1.4:1 */
      rule: "164 34.9% 74.7%",       /* #A8D5C9 */
      heroBg: "179 61.6% 14.3%",     /* #0E3B3A */
      heroInk: "160 37.5% 96.9%",    /* #F4FAF8 */
      heroSoft: "168 25.5% 80%",     /* #BFD9D4 */
      heroAccent: "40 68.1% 72.9%",  /* #E9C98B */
      cta: "179 61.6% 14.3%",        /* #0E3B3A */
      onCta: "160 37.5% 96.9%",      /* #F4FAF8 */
    },
  },
  mint: {
    id: "mint",
    kind: "dental",
    family: "clinical",
    variant: "b",
    paletteName: "Navy and mint",
    face: "sora",
    radius: "14px",
    motion: "full",
    tokens: {
      bg: "216 38.5% 97.5%",         /* #F6F8FB */
      surface: "0 0% 100%",          /* #FFFFFF */
      surface2: "171 46.7% 94.1%",   /* #E9F7F5 */
      ink: "214 68.1% 13.5%",        /* #0B1F3A */
      inkSoft: "215 19.3% 34.5%",    /* #475569 */
      brand: "214 68.1% 13.5%",      /* #0B1F3A */
      onBrand: "0 0% 100%",          /* #FFFFFF */
      brandInk: "214 68.1% 13.5%",   /* #0B1F3A */
      accent: "175 81.4% 23.1%",     /* #0B6B63 */
      line: "218 23.5% 84.1%",       /* hairline, darkened to 1.4:1 */
      rule: "171 76.9% 64.3%",       /* #5EEAD4 */
      heroBg: "216 38.5% 97.5%",     /* #F6F8FB */
      heroInk: "214 68.1% 13.5%",    /* #0B1F3A */
      heroSoft: "215 19.3% 34.5%",   /* #475569 */
      heroAccent: "175 77.4% 26.1%", /* #0F766E */
      cta: "175 77.4% 26.1%",        /* #0F766E */
      onCta: "0 0% 100%",            /* #FFFFFF */
    },
  },
  sprout: {
    id: "sprout",
    kind: "dental",
    family: "clinical",
    variant: "c",
    paletteName: "Sky, coral and sunshine",
    face: "sora",
    radius: "28px",
    motion: "full",
    tokens: {
      bg: "40 100% 97.6%",           /* #FFFBF3 */
      surface: "0 0% 100%",          /* #FFFFFF */
      surface2: "203 75% 95.3%",     /* #EAF5FC */
      ink: "212 30.2% 16.9%",        /* #1E2A38 */
      inkSoft: "210 16.1% 36.5%",    /* #4E5D6C */
      brand: "205 70.6% 38.6%",      /* #1D6FA8 */
      onBrand: "0 0% 100%",          /* #FFFFFF */
      brandInk: "204 72.3% 32.5%",   /* #17608F */
      accent: "122 39.9% 30%",       /* #2E6B30 */
      line: "40 60.7% 79%",          /* hairline, darkened to 1.4:1 */
      rule: "42 100% 64.5%",         /* #FFC94A */
      heroBg: "40 100% 97.6%",       /* #FFFBF3 */
      heroInk: "212 30.2% 16.9%",    /* #1E2A38 */
      heroSoft: "210 16.1% 36.5%",   /* #4E5D6C */
      heroAccent: "10 63.3% 42.7%",  /* #B23F28 */
      cta: "10 73.4% 60.2%",         /* #E4674F */
      onCta: "11 47.8% 9%",          /* #22100C */
    },
  },
  harbour: {
    id: "harbour",
    kind: "dental",
    family: "calm",
    variant: "b",
    paletteName: "Deep teal and sand",
    face: "sora",
    radius: "6px",
    motion: "light",
    tokens: {
      bg: "180 15.8% 96.3%",         /* #F4F7F7 */
      surface: "0 0% 100%",          /* #FFFFFF */
      surface2: "190 28.6% 91.8%",   /* #E4EEF0 */
      ink: "191 49.1% 10.8%",        /* #0E2429 */
      inkSoft: "190 17.2% 33.1%",    /* #465E63 */
      brand: "195 67% 17.8%",        /* #0F3D4C */
      onBrand: "180 37.5% 96.9%",    /* #F4FAFA */
      brandInk: "195 67% 17.8%",     /* #0F3D4C */
      accent: "34 66.3% 32.5%",      /* #8A5A1C */
      line: "180 11.3% 81%",         /* hairline, darkened to 1.4:1 */
      rule: "189 35.9% 74.9%",       /* #A8CFD6 */
      heroBg: "195 67% 17.8%",       /* #0F3D4C */
      heroInk: "180 37.5% 96.9%",    /* #F4FAFA */
      heroSoft: "191 28% 80.4%",     /* #BFD6DB */
      heroAccent: "40 68.1% 72.9%",  /* #E9C98B */
      cta: "195 67% 17.8%",          /* #0F3D4C */
      onCta: "180 37.5% 96.9%",      /* #F4FAFA */
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
  return SITE_THEMES[kind === "school" ? "metro" : kind === "dental" ? "meridian" : "podium"];
}

/**
 * The theme a DENTAL record wears. Never null: a dental record has no
 * single-page renderer, so an empty or foreign theme id gets meridian.
 */
export function dentalThemeFor(id: string | undefined): SiteTheme {
  return siteThemeFor("dental", id) || SITE_THEMES.meridian;
}

const SERIF =
  'ui-serif, Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", Times, serif';
/* Each webfont is followed by its metric-matched local fallback (src/index.css),
   so the first frame, set before Google's file lands, occupies the same lines
   as the webfont and the swap moves nothing. Without "Sora Fallback" here the
   c5 hero headline went from two lines to three at 390px when Sora arrived
   (CLS 0.19). */
const SANS = '"Inter", "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SORA = '"Sora", "Sora Fallback", "Inter", "Inter Fallback", ui-sans-serif, system-ui, sans-serif';

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
