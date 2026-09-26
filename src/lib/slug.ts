/**
 * URL slugs, in one place.
 *
 * WHY THIS FILE EXISTS. Two features now mint a slug from an institute's own
 * name and serve a page at it: a PITCH page at `/<slug>` and a DEMO SITE at
 * `/demo/<slug>`. Both links are pasted into WhatsApp by hand, both are read by
 * a stranger who will notice a URL that looks wrong, and both must agree on
 * what "St. Xavier's High School" turns into. A second copy of this function is
 * how one of them starts producing `st-xavier-s-high-school` while the other
 * does not, and nobody finds out until two links for the same institute do not
 * match.
 *
 * `src/lib/pitch/record.ts` re-exports these under its own older names
 * (`pitchSlugify`, `isWellFormedPitchSlug`, `PITCH_SLUG_MAX`), so every existing
 * import keeps working and there is exactly one implementation underneath.
 *
 * Nothing here knows about routes. Which slugs are already taken by a real page
 * is a different question and it is answered by reading the real route table:
 * see `src/lib/pitch/reservedRoutes.ts`.
 */

/** A slug is lower-case words joined by single hyphens. Nothing else. */
const WELL_FORMED = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 70 characters. Long enough for "sri-chaitanya-techno-school-bengaluru-north"
 * and short enough that the whole link is still readable in a WhatsApp preview.
 */
export const SLUG_MAX = 70;

/**
 * Turn a name into a URL segment.
 *
 *   "St. Xavier's High School"        -> "st-xaviers-high-school"
 *   "Sri Chaitanya  Techno School  "  -> "sri-chaitanya-techno-school"
 *   "Kendrīya Vidyālaya, Saket"       -> "kendriya-vidyalaya-saket"
 *
 * Apostrophes are DELETED rather than turned into a separator, because
 * "xavier-s" reads as a typo and a prospect who notices the URL is a prospect
 * who has stopped reading the page. Everything else that is not a letter or a
 * digit becomes one hyphen.
 *
 * The combining-mark range is written as an escape (`̀-ͯ`) rather than
 * as the literal characters it matches: those are invisible in an editor, so a
 * well-meant re-indent or a copy through a lossy clipboard can silently empty
 * the class and leave every accented name mangled.
 */
export function slugify(input: string, max: number = SLUG_MAX): string {
  return (input || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining marks left behind by NFKD
    .replace(/['‘’`´]/g, "") // apostrophes, straight and curly
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, ""); // the slice can land mid-hyphen
}

export function isWellFormedSlug(slug: string): boolean {
  return WELL_FORMED.test(slug || "");
}
