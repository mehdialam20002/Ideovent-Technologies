/**
 * What the Lead Finder costs, said the same way on the AI keys page and in the
 * finder's empty state. Nothing, by default: since 4 Oct 2026 every search is
 * OpenStreetMap, with no key at all, and Google Maps is an option Mehdi ticks
 * ("Also use Google") only when he has a key that works.
 *
 * GOOGLE, when ticked. Checked 28 September 2026 against Google's India price
 * list (developers.google.com/maps/billing-and-pricing/pricing-india): 7,000
 * free Text Search Enterprise and 7,000 free Place Details Enterprise calls a
 * month. A daily quota of 200 is at most 6,200 in a 31-day month, under the
 * free 7,000, so a key with those quotas cannot be charged for Places.
 *
 * WHAT IS NOT CONFIRMED (30 Sep 2026): that Google Cloud offers a PER-DAY
 * quota for Places API (New). Its pages (usage-and-billing, manage-costs,
 * reporting) name only per-minute limits for it, and Google's own capping
 * page says the per-day cap exists "depending on the API". A per-minute limit
 * does not cap a month, and a budget only warns. So the app says "cap it" as
 * a condition, not "it can never charge". GO-LIVE-IDEOVENT-IN.md section 8.2.6
 * has the click path and says what to do when there is no per-day row.
 */
export const FREE_USAGE = {
  checked: "28 Sep 2026",
  free: "The finder is free: every search uses OpenStreetMap, with no key, no card and no bill.",
  optional: "A Google Maps key is optional: tick \"Also use Google\" in the finder only when you have one that works (Places API (New) enabled in its Google Cloud project, and billing on).",
  google: "Google gives 7,000 free Text Searches and 7,000 free Place Details a month on India pricing (checked 28 Sep 2026).",
  cap: "To keep it at zero, set a daily quota of 200 for each in Google Cloud (Google Maps Platform > Quotas, then Places API (New)): 200 a day stays under 7,000 a month.",
  capCaveat: "If Google shows only per-minute quotas there, they do not cap the month: set a budget alert and look at the usage each week.",
  card: "A card is still needed to create the key.",
  osm: "Without a key the finder works on OpenStreetMap for free.",
} as const;

/** The Google sentences as one paragraph: what a key costs, for when Mehdi ticks "Also use Google". */
export const FREE_USAGE_TEXT = [FREE_USAGE.google, FREE_USAGE.cap, FREE_USAGE.capCaveat, FREE_USAGE.card].join(" ");
