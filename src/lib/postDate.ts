/**
 * A blog post's date as the site prints it: "2 Oct 2026".
 *
 * Used by /blog, /blog/:slug and the no-script copy that scripts/prerender-heads.mjs
 * writes into each post's HTML, so the three always agree.
 *
 * A bare YYYY-MM-DD (what blogs.seed.json and the /admin "Publish date" field
 * hold) is the calendar day it names, in every time zone. `new Date("2026-10-02")`
 * is midnight UTC, so formatting it in the reader's own zone would print the day
 * before to anyone west of UTC, Googlebot included, while the post's BlogPosting
 * says datePublished 2026-10-02. Google asks for the visible date and the
 * structured one to match ("Make your dates and times consistent",
 * developers.google.com/search/docs/appearance/publication-dates). A value with
 * a time in it is shown in the reader's zone, as before. Anything that is not a
 * date is printed as it is.
 */
export function formatPostDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : {}),
  });
}
