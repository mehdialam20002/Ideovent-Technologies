/**
 * The multi-page theme ids, and nothing else, so the public route can decide
 * "single page or multi-page" without loading the palette table. The table
 * itself is ./themes.ts.
 */

export const SITE_SCHOOL_THEME_IDS = ["metro", "atlas", "aangan", "crayon", "pinewood", "almanac"] as const;
export const SITE_COACHING_THEME_IDS = ["podium", "timetable", "register", "folio", "courtyard"] as const;

export type SiteSchoolThemeId = (typeof SITE_SCHOOL_THEME_IDS)[number];
export type SiteCoachingThemeId = (typeof SITE_COACHING_THEME_IDS)[number];
export type SiteThemeId = SiteSchoolThemeId | SiteCoachingThemeId;

const ALL: readonly string[] = [...SITE_SCHOOL_THEME_IDS, ...SITE_COACHING_THEME_IDS];

/** True when a record on this theme renders the multi-page site. */
export function isSiteThemeId(id: string | undefined): id is SiteThemeId {
  return !!id && ALL.includes(id);
}
