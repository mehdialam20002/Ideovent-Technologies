/**
 * THE THREE DESIGN FAMILIES: Classic, Modern and Warm.
 *
 * Mehdi asked for the ten templates in "3 type ke", so that the ten do not
 * read as one layout in ten colours. This file names the three and says which
 * of the existing looks belongs to each.
 *
 * ── THIS IS A GROUPING OVER THE EXISTING THEMES, NOT A SECOND THEME SYSTEM ──
 * Both renderers already have the concept: `DemoSite.theme`. A school theme
 * (src/lib/demo/schoolThemes.ts) and a coaching theme
 * (src/lib/demo/coachingThemes.ts) each move the palette, the type voice, the
 * hero composition, the corner radius and the section order together, and both
 * files were written specifically so that two of them cannot be mistaken for
 * one layout recoloured. A family that restyled the page on its own would be a
 * second source of truth for the same five things, and the first time the two
 * disagreed a demo would render one way in the preview and another way for the
 * director. So a family changes nothing on the page. It is the name for a set
 * of themes that share a structure, and a template picks exactly one theme
 * inside its family. That theme IS the template's palette.
 *
 * The types below make the pairing a compile error rather than a convention:
 * a template filed as Warm that names a Modern theme does not typecheck.
 *
 * ── WHAT EACH FAMILY IS, STRUCTURALLY ─────────────────────────────────────
 * Checked against every theme it contains. The corner radius, voice and hero
 * values quoted are the ones in the two theme files.
 *
 *   CLASSIC   the prospectus. A book voice: serif headings (heritage), serif
 *             running text (quiet-campus) or spaced capitals (bulletin).
 *             Corners 2 to 6px. The hero's mass is the NAME, with facts set as
 *             hairline rows or a single ruled line and never as a solid panel
 *             beside it. Dense rhythm, hairline or block rules.
 *
 *   MODERN    the dashboard. One geometric sans at one weight with tight
 *             negative tracking (Sora light, heavy or hairline) or the device
 *             monospace. The hero is split, and the second column or a strip
 *             under the headline carries a DATA OBJECT: a solid fact block
 *             (modern-campus), the batch board (ledger), a board that bleeds
 *             off both gutters (signal), the next start date as a numeral
 *             (marks). Every one of them opens on what is taught or what was
 *             scored.
 *
 *   WARM      the neighbourhood. Solid or book-weight sans, with the serif
 *             accent doing more of the work. Corners 6 to 20px. The hero is
 *             the institute's own colour full bleed (bright, riverside) or one
 *             airy column (studio), with no board beside the name. The order
 *             opens on people and on this week: notices, the head, the
 *             facilities, the free first class.
 *
 * ── WHY EACH THEME IS WHERE IT IS ─────────────────────────────────────────
 * bulletin is Classic, not Warm, although it opens on notices the way bright
 * does: its voice is spaced capitals (the Avenues device, which is
 * typographic, not friendly), its corners are 6px and its rules are blocks.
 * It is also what puts one Classic look on the coaching side, so all three
 * families exist for both kinds.
 *
 * quiet-campus is Classic, not Modern, although its headings are Sora: the
 * running text is a serif, the corners are 2px, and the hero is type-led with
 * no panel at all.
 *
 * THE MULTI-PAGE IDS (26 September 2026). metro, atlas, aangan, crayon,
 * pinewood and almanac (school) and podium, timetable, register, folio and
 * courtyard (coaching) render the multi-page site, where the FAMILY owns the
 * composition through src/pages/site/kit/ and the theme owns only the
 * palette (src/lib/demo/site/themes.ts). The ten templates point at these.
 * The older ids above keep their single page, unchanged, for demos already
 * sent.
 *
 * Never move a theme between families without re-reading the structural line
 * for both families above. A template's family is shown to Mehdi on its card,
 * and a card that says Classic over a page that looks Modern is a small lie.
 */

import type { DemoKind } from "@/lib/cms/types";
import type { DemoSchoolThemeId } from "../schoolThemes";
import type { CoachingThemeId } from "../coachingThemes";
import type { SiteCoachingThemeId, SiteDentalThemeId, SiteSchoolThemeId } from "../site/themes";

/**
 * DENTAL FAMILIES (28 September 2026). A clinic is not a prospectus or a
 * dashboard, so dental has three families of its own, from
 * E:/myagency/_assets/DENTAL-DESIGN.md:
 *
 *   LUXURY    the reference's first example: a bright room under a cream
 *             veil, serif display with gold accent words, pill buttons,
 *             20px corners. The cosmetic studio (d3).
 *   CLINICAL  split hero, Sora display, navy and teal, 14px corners, a data
 *             card beside the headline (next free slot, rating). Family
 *             (d1), multi-speciality (d2), ortho (d5, reason card), and its
 *             playful variant c, Kids (d6, sprout: 28px, coral and sky).
 *   CALM      deep teal full bleed under a veil, Sora light, hairlines not
 *             shadows, 6px corners, larger body type. Implants (d4) and
 *             chains (d7, with the branch picker).
 *
 * School and coaching never use these three, and dental never uses the
 * first three: `KIND_FAMILY_IDS` says which families each kind offers.
 */
export type DesignFamily = "classic" | "modern" | "warm" | "luxury" | "clinical" | "calm";

export const DESIGN_FAMILY_IDS: DesignFamily[] = ["classic", "modern", "warm", "luxury", "clinical", "calm"];

/** The families a template of each kind may be filed under. */
export const KIND_FAMILY_IDS: Record<DemoKind, DesignFamily[]> = {
  school: ["classic", "modern", "warm"],
  coaching: ["classic", "modern", "warm"],
  dental: ["luxury", "clinical", "calm"],
};

interface FamilyDefinition {
  label: string;
  /** One line, for the Templates tab. */
  blurb: string;
  /** The themes that belong to this family, per kind. A template picks one. */
  themes: {
    school: readonly (DemoSchoolThemeId | SiteSchoolThemeId)[];
    coaching: readonly (CoachingThemeId | SiteCoachingThemeId)[];
    dental: readonly SiteDentalThemeId[];
  };
}

export const DESIGN_FAMILIES = {
  classic: {
    label: "Classic",
    blurb: "A book voice, small corners, the name as the mass of the hero. Reads like a prospectus.",
    themes: { school: ["heritage", "quiet-campus", "pinewood", "almanac"], coaching: ["bulletin", "register", "folio"], dental: [] },
  },
  modern: {
    label: "Modern",
    blurb: "One sharp sans, a split hero with a board or a fact block beside the headline. Opens on what is taught.",
    themes: { school: ["modern-campus", "metro", "atlas"], coaching: ["ledger", "signal", "marks", "podium", "timetable"], dental: [] },
  },
  warm: {
    label: "Warm",
    blurb: "Their own colour full bleed, rounder corners, and people before figures. Reads like a neighbourhood place.",
    themes: { school: ["bright", "riverside", "aangan", "crayon"], coaching: ["studio", "courtyard"], dental: [] },
  },
  luxury: {
    label: "Luxury",
    blurb: "A bright room under a cream veil, a serif headline with gold accent words, pill buttons. Reads like a studio.",
    themes: { school: [], coaching: [], dental: ["ivory"] },
  },
  clinical: {
    label: "Clinical",
    blurb: "Split hero with the next free slot beside the headline, navy and teal, clear cards. Reads like a well run clinic.",
    themes: { school: [], coaching: [], dental: ["haven", "meridian", "mint", "sprout"] },
  },
  calm: {
    label: "Calm",
    blurb: "Deep teal full bleed, quiet light type, hairlines and larger text. Reads like a place for serious treatment.",
    themes: { school: [], coaching: [], dental: ["anchor", "harbour"] },
  },
} as const satisfies Record<DesignFamily, FamilyDefinition>;

/**
 * The themes a template of this kind and family may name. This is the type
 * that turns "a Warm school template must be bright or riverside" into a
 * compile error.
 */
export type FamilyTheme<K extends DemoKind, F extends DesignFamily> =
  (typeof DESIGN_FAMILIES)[F]["themes"][K][number];

/**
 * What each theme's palette is called on a template card. Colour words only,
 * taken from the first clause of each theme's own blurb, so the card and the
 * admin's Look dropdown describe the same thing in the same words.
 */
export const THEME_PALETTE_NAME: Record<DemoSchoolThemeId | CoachingThemeId | SiteSchoolThemeId | SiteCoachingThemeId | SiteDentalThemeId, string> = {
  /* Dental. Same words as SITE_THEMES[id].paletteName. */
  haven: "Teal and cream",
  meridian: "Navy, teal and royal blue",
  ivory: "Cream, espresso and antique gold",
  anchor: "Deep teal, sea glass and sand",
  mint: "Navy and mint",
  sprout: "Sky, coral and sunshine",
  harbour: "Deep teal and sand",
  /* The multi-page themes. Same words as SITE_THEMES[id].paletteName. */
  metro: "Navy, blue and marigold",
  atlas: "Ink teal, sea glass and coral",
  aangan: "Brick red, haldi and cream",
  crayon: "Sky, tangerine and leaf on cream",
  pinewood: "Pine, brass and parchment",
  almanac: "Oxblood on bone",
  podium: "Navy, royal blue and teal",
  timetable: "Deep green and saffron",
  register: "Maroon on paper, marigold rule",
  folio: "Ink blue, bone and copper",
  courtyard: "Teal, marigold and cream",
  /* The single-page themes, frozen. */
  heritage: "Bottle green and ivory",
  "modern-campus": "Graphite and strong blue",
  bright: "Marigold and deep red",
  "quiet-campus": "Bone and ink",
  riverside: "Teal and terracotta",
  ledger: "Crimson on ink",
  signal: "Indigo and cyan",
  studio: "Teal and amber",
  marks: "Amber on graphite",
  bulletin: "Plum and brick",
};

/**
 * The family a theme belongs to, for a record of this kind. Null for an id the
 * kind does not own (a school id on a coaching record renders the coaching
 * default, so it has no family to report).
 */
export function familyOfTheme(kind: DemoKind, theme: string | undefined): DesignFamily | null {
  if (!theme) return null;
  for (const f of DESIGN_FAMILY_IDS) {
    const list = DESIGN_FAMILIES[f].themes[kind] as readonly string[];
    if (list.includes(theme)) return f;
  }
  return null;
}
