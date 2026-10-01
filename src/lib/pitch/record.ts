/**
 * Pitch pages: the one module both page designs import.
 *
 * The India page and the international page are written by different hands, so
 * everything they could disagree about lives here instead: the record shape,
 * how a slug is made, which slugs are already taken, how a record is looked up
 * from a URL, and which price a package is allowed to quote. If the two designs
 * ever print different money for the same package, it is because something
 * stopped going through this file.
 *
 * Import from "@/lib/pitch/record". Nothing here renders anything.
 */

import type {
  PitchPage,
  PitchMarket,
  PitchStatus,
  PitchInstituteType,
  PitchObservedProblem,
} from "@/lib/cms/types";
import { SLUG_MAX, isWellFormedSlug, slugify } from "@/lib/slug";

export type {
  PitchPage,
  PitchMarket,
  PitchStatus,
  PitchInstituteType,
  PitchObservedProblem,
};

/**
 * THE RESERVED-ROUTE CHECK IS NOT IN THIS FILE, AND THAT IS ON PURPOSE.
 *
 * `isReservedSlug`, `pitchSlugIssue` and `uniquePitchSlug` live in
 * ./reservedRoutes, because they hold the text of src/App.tsx and vercel.json:
 * the guard reads the real route table rather than a list somebody has to
 * remember to update. Re-exporting them from here was the first shape of this
 * module and it cost 7.8 KB of source text in the chunk a prospect downloads
 * on their phone, measured in dist/. Only the admin validates a slug, so only
 * the admin imports that module:
 *
 *   import { pitchSlugIssue } from "@/lib/pitch/reservedRoutes";
 *
 * Do not add it to ./index.ts either. The India design imports that barrel.
 */

/* ── The canonical price table ───────────────────────────────────────────── */

export interface PitchPackageOption {
  /** Stored on the record as `recommendedPackage`. Never change an id in place. */
  id: string;
  market: PitchMarket;
  /** Reads the same as the heading on /pricing, because it is the same offer. */
  label: string;
  /** Already formatted, low number first. This is the only string a page may print. */
  range: string;
  /** Plain language. Empty where no window has been agreed; never a promise. */
  timeline?: string;
  /** Where a reader goes to check the number for themselves. */
  href: string;
  /** One line: what this buys, for the admin's dropdown help text. */
  summary: string;
  /**
   * What is in the box, at the entry tier. Taken from the same tier tables
   * /pricing renders, so a pitch page and the price page list the same things.
   * Six to nine lines reads best on a phone.
   */
  includes: string[];
}

/**
 * Every package a pitch page may recommend, cheapest first.
 *
 * THE NUMBERS COME FROM ONE PLACE. `_assets/FACTS.md`, the section headed
 * "CORRECTIONS CONFIRMED BY MEHDI, 24 Sep 2026", item 2. They are the same
 * figures /pricing renders, and the two are cross-checked by eye whenever
 * either moves. A pitch page has no free-text price field on purpose: a page
 * generated in one click and sent to a stranger must not be able to carry a
 * figure the rest of the site has moved on from. A bespoke number belongs in
 * the written scope, which a human writes and reads.
 *
 * CHEAPEST FIRST IS NOT A LAYOUT CHOICE. FACTS.md states it as a presentation
 * rule: a reader who meets the top of the range first stops reading before
 * they reach the value. Keep this array in that order and render it in order.
 *
 * (FACTS.md calls the first India row "Landing page / single page". /pricing
 * publishes the same 8,000 to 20,000 band as "Business website", so that is
 * the label used here: one offer, one name, wherever a buyer meets it.)
 */
export const PITCH_PACKAGES: PitchPackageOption[] = [
  {
    id: "business-website",
    market: "india",
    label: "Business website",
    range: "₹8,000 to ₹20,000",
    timeline: "2 to 3 weeks from the advance and your content",
    href: "/pricing#business-website",
    summary: "One page or a small site. The cheapest way to stop losing enquiries.",
    includes: [
      "One page, written to turn a visitor into an enquiry",
      "Design adapted from our layout system",
      "Reads properly on a phone, a tablet and a desktop",
      "Enquiry form delivered to your e-mail",
      "On-page SEO basics, SSL and analytics installed",
      "Two revision rounds at the design stage",
      "Handover plus a recorded walkthrough",
    ],
  },
  {
    id: "school-website",
    market: "india",
    label: "School website",
    range: "₹20,000 to ₹45,000",
    timeline: "3 to 5 weeks from the advance and your content",
    href: "/pricing#school-website",
    summary: "Up to eight pages, built around admission season.",
    includes: [
      "Up to eight pages",
      "Admission enquiry form delivered to you",
      "Notices and circulars area you update yourselves",
      "Photo gallery",
      "Faculty or staff listing",
      "Mobile first, SSL and analytics",
      "Two revision rounds at the design stage",
    ],
  },
  {
    id: "portal",
    market: "india",
    label: "Coaching or school portal",
    range: "₹40,000 to ₹85,000",
    timeline: "6 to 10 weeks from the advance and your content",
    href: "/pricing#portal",
    summary: "A system that runs the office, not a website with a login on it.",
    includes: [
      "Student and batch records",
      "Fee records with printable receipts",
      "Daily attendance marking",
      "Enquiry capture",
      "One admin role",
      "Reports exportable to Excel",
    ],
  },
  {
    id: "custom-saas",
    market: "india",
    label: "Custom SaaS platform",
    range: "from ₹90,000",
    timeline: "10 weeks and up, priced in three stages",
    href: "/pricing#custom-saas",
    summary: "Priced after a paid discovery stage, because nobody can quote a platform before the scope exists.",
    includes: [
      "A written scope with an exclusions list",
      "Screen map and data model",
      "A delivery plan in phases",
      "The build priced per phase, agreed before each one starts",
      "A care plan or a development retainer decided at handover, never assumed",
    ],
  },
  {
    id: "care-plan-india",
    market: "india",
    label: "Care plan, after launch",
    range: "₹1,000 to ₹3,500 a month",
    // The three tiers are ₹1,000 / ₹2,000 / ₹3,500. Thirty days of support
    // after launch are free and come with every project, so a care plan is
    // always optional and the page must say so: a buyer who reads a monthly
    // fee as compulsory silently adds a year of it to the quote in their head.
    href: "/pricing",
    summary: "Optional. Monitoring, backups, updates and included content hours.",
    includes: [
      "Uptime monitoring, with an alert raised to us",
      "Off-site backup of files and database",
      "Security updates, tested before release",
      "SSL, domain and hosting expiry tracked",
      "Content-change hours included each month",
      "First reply within the response target for your tier",
    ],
  },
  {
    id: "intl-landing",
    market: "international",
    label: "Landing page",
    range: "$300 to $600",
    href: "/pricing",
    summary: "One page, built to convert a single audience.",
    includes: [
      "One page, built around a single audience",
      "Responsive on phone, tablet and desktop",
      "Enquiry form delivered to your inbox",
      "On-page SEO basics, SSL and analytics",
      "Two revision rounds at the design stage",
    ],
  },
  {
    id: "intl-website",
    market: "international",
    label: "Business website",
    range: "$600 to $1,400",
    href: "/pricing",
    summary: "A full site with the pages a buyer actually opens.",
    includes: [
      "The pages a buyer actually opens, not a sitemap",
      "Content areas you can edit yourselves",
      "Enquiry form and call tracking hooks",
      "On-page SEO basics, SSL and analytics",
      "Two revision rounds at every design stage",
    ],
  },
  {
    id: "intl-application",
    market: "international",
    label: "Web application",
    range: "from $2,200",
    href: "/pricing",
    summary: "Priced after discovery. Scope first, number second.",
    includes: [
      "A paid discovery stage first: scope, screen map, data model",
      "The build priced per phase, agreed before each one starts",
      "Staging link from the first week",
      "Source code transfers to you on final payment",
    ],
  },
  {
    id: "intl-care",
    market: "international",
    label: "Care plan",
    range: "$40 to $160 a month",
    href: "/pricing",
    summary: "Optional. The same monitoring, backups and update work.",
    includes: [
      "Uptime monitoring, with an alert raised to us",
      "Off-site backup of files and database",
      "Security updates, tested before release",
      "Content-change hours included each month",
    ],
  },
];

/** The market a record renders in. Blank means India, which is the primary market. */
export function pitchMarket(page: Pick<PitchPage, "market">): PitchMarket {
  return page.market === "international" ? "international" : "india";
}

/** The packages offered in one market, cheapest first. */
export function packagesForMarket(market: PitchMarket): PitchPackageOption[] {
  return PITCH_PACKAGES.filter((p) => p.market === market);
}

/**
 * THE SAME PACKAGES, IN A DENTAL CLINIC'S WORDS (30 Sep 2026).
 *
 * Two India rows are named for schools, "School website" and "Coaching or
 * school portal". That reads right on a school's page and wrong on a
 * dentist's, where "built around admission season" would prove the page was a
 * blast. On a record whose `instituteType` is "dental" the label, the summary
 * and the list change. The id, the range, the timeline and the link do not,
 * so a clinic is quoted exactly the figure /pricing shows. The portal row
 * takes /pricing's own heading, "Portal or web app".
 */
const DENTAL_WORDS: Record<string, Pick<PitchPackageOption, "label" | "summary" | "includes">> = {
  "school-website": {
    label: "Clinic website",
    summary: "Up to eight pages, built around appointment requests.",
    includes: [
      "Up to eight pages",
      "Appointment request form delivered to you",
      "Notices and timings area you update yourselves",
      "Photo gallery",
      "Doctor and staff listing",
      "Mobile first, SSL and analytics",
      "Two revision rounds at the design stage",
    ],
  },
  portal: {
    label: "Portal or web app",
    summary: "A system that runs the front desk, not a website with a login on it.",
    includes: [
      "Patient records",
      "Payment records with printable receipts",
      "Daily staff attendance marking",
      "Enquiry and appointment request capture",
      "One admin role",
      "Reports exportable to Excel",
    ],
  },
};

/**
 * The recommended package, or null.
 *
 * Null is a normal state and both designs must handle it: Mehdi often has a
 * name and a city and nothing else, and a page that asserts a price before
 * anyone has looked at the scope is a page that gets argued with.
 *
 * A record whose package belongs to the other market also returns null rather
 * than quoting rupees to a prospect in Manchester. A dental clinic's record
 * gets the package in its own words (DENTAL_WORDS above), at the same price.
 */
export function pitchPackage(
  page: Pick<PitchPage, "recommendedPackage" | "market"> & Partial<Pick<PitchPage, "instituteType">>,
): PitchPackageOption | null {
  if (!page.recommendedPackage) return null;
  const found = PITCH_PACKAGES.find((p) => p.id === page.recommendedPackage);
  if (!found || found.market !== pitchMarket(page)) return null;
  const words = page.instituteType === "dental" ? DENTAL_WORDS[found.id] : undefined;
  return words ? { ...found, ...words } : found;
}

/* ── Slugs ────────────────────────────────────────────────────────────── */

/**
 * THE IMPLEMENTATION MOVED TO `@/lib/slug`, THE NAMES DID NOT.
 *
 * A demo site (`/demo/<slug>`, see src/lib/demo/record.ts) mints a slug from
 * the same institute name this does, and two copies of the transform is how one
 * of them starts producing `st-xavier-s-high-school` while the other does not.
 * So the rules live in one module and this file re-exports them under the names
 * every existing caller already imports. Nothing about the behaviour changed:
 * same regexes, same 70-character cap, same trailing-hyphen repair after the
 * slice.
 *
 * `pitchSlugify` stays a wrapper rather than a bare re-export because
 * `slugify` takes an optional max and a bare alias would let a caller pass one,
 * which is not a decision a pitch slug is allowed to make: the cap has to match
 * what `pitchSlugIssue` validates against.
 */
export const PITCH_SLUG_MAX = SLUG_MAX;

export function pitchSlugify(input: string): string {
  return slugify(input, PITCH_SLUG_MAX);
}

export const isWellFormedPitchSlug = isWellFormedSlug;

/* ── Looking a record up from a URL ──────────────────────────────────────── */

/**
 * Find the pitch page a URL segment refers to.
 *
 * Returns null for an unknown slug AND for a draft or archived one, so the
 * route can render the site's ordinary 404 in both cases. That is deliberate:
 * a pitch that is still being written must not be readable by anyone who
 * guesses the institute's name, and an archived one must stop working when the
 * offer stops standing. Neither should announce that a page exists here.
 *
 * `includeUnpublished` exists for one caller that does not exist yet: a preview
 * inside /admin, where the reader is already signed in. Do not reach for it
 * from a public route.
 */
export function resolvePitchPage(
  slug: string | undefined,
  pages: PitchPage[] | undefined,
  opts: { includeUnpublished?: boolean } = {},
): PitchPage | null {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return null;
  const found = (pages || []).find((p) => (p.slug || "").toLowerCase() === s);
  if (!found) return null;
  if (!opts.includeUnpublished && found.status !== "live") return null;
  return found;
}

/* ── Links ───────────────────────────────────────────────────────────────── */

/** Site-relative path, base-aware so it survives a subpath deploy. */
export function pitchPagePath(slug: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/${slug}`;
}

/**
 * The full https:// link to paste into WhatsApp.
 *
 * `host` is settings.defaultSeo.canonicalHost, the same value every canonical
 * tag on the site is built from. Falls back to the browser's own origin, which
 * is right when Mehdi is working on a preview deploy and wrong nowhere.
 */
export function pitchPageUrl(slug: string, host?: string): string {
  const origin = (host || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${origin}${pitchPagePath(slug)}`;
}

/* ── Small presentational helpers, shared so the two designs agree ───────── */

/**
 * "Principal Sharma" is wrong and "Sharma sir" is wrong in writing. This is the
 * form that is safe to print above the fold, and null when we do not know the
 * name, which is often. A page that guesses proves it was a template blast.
 */
export function pitchAddressee(page: Pick<PitchPage, "directorName" | "directorTitle">): string | null {
  const name = (page.directorName || "").trim();
  if (!name) return null;
  const title = (page.directorTitle || "").trim();
  return title ? `${title} ${name}` : name;
}

/** "New Delhi" · "Gorakhpur, Uttar Pradesh" · "Manchester, United Kingdom". */
export function pitchPlace(page: Pick<PitchPage, "city" | "state" | "country">): string {
  return [page.city, page.state, page.country].map((p) => (p || "").trim()).filter(Boolean).join(", ");
}

/** A date the way the market writes it. Empty string for an empty field. */
export function pitchDate(iso: string | undefined, market: PitchMarket): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(market === "international" ? "en-GB" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * True once `validUntil` is in the past. The designs soften the offer rather
 * than hiding it.
 *
 * `now` is COPIED before the time is zeroed. `setHours` mutates the Date it is
 * called on, so zeroing the argument in place would silently move a caller's
 * own Date back to midnight. Today that caller does not exist, because the
 * default is a fresh Date; a test that passes a fixed clock into two calls is
 * exactly how it starts.
 */
export function isPitchExpired(page: Pick<PitchPage, "validUntil">, now: Date = new Date()): boolean {
  if (!page.validUntil) return false;
  const d = new Date(page.validUntil);
  if (Number.isNaN(d.getTime())) return false;
  const startOfToday = new Date(now.getTime());
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday.getTime();
}
