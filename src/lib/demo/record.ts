/**
 * Demo sites: the one module the templates and the admin both import.
 *
 * A demo site is the INSTITUTE'S OWN WEBSITE, already built, served at
 * /site/<slug>, with their name in the masthead. Mehdi sends the link and says
 * "dekhiye, aapke liye ye website banayi hai". It is not a proposal. The pitch
 * page at /<slug> is the proposal, it argues about their current site and
 * quotes a price, and the two are sent in different situations. See the block
 * comment above `DemoKind` in src/lib/cms/types.ts for the full distinction.
 *
 * The school template and the coaching template are written separately, so
 * everything they could disagree about lives here: the lookup, what counts as
 * reachable, how a slug is made, how a place reads. Nothing here renders.
 *
 * THE SLUG HELPERS ARE THE PITCH PAGES' OWN, RE-EXPORTED, NOT COPIED.
 * `demoSlugify` IS `pitchSlugify`. There is one way to turn an institute's
 * name into a URL segment on this site and there is going to go on being one:
 * a second implementation that drifts by one character produces two different
 * links for the same institute, which is the exact class of bug this whole
 * feature exists to stop. The reserved-route check is reused the same way, in
 * ./reservedRoutes.
 */

import type {
  DemoSite,
  DemoKind,
  DemoStatus,
  DemoMarket,
  DemoCurrency,
} from "@/lib/cms/types";

import {
  PITCH_SLUG_MAX,
  isWellFormedPitchSlug,
  pitchSlugify,
} from "@/lib/pitch/record";

export type { DemoSite, DemoKind, DemoStatus, DemoMarket, DemoCurrency };

/**
 * THE RESERVED-ROUTE CHECK IS NOT IN THIS FILE, AND THAT IS ON PURPOSE.
 *
 * `demoSlugIssue` and `uniqueDemoSlug` live in ./reservedRoutes, which reaches
 * through to the pitch guard and so holds the text of src/App.tsx and
 * vercel.json. Only the admin validates a slug, and the admin is behind a lazy
 * route, so that source string never reaches a chunk a prospect downloads.
 * Import it directly where it is needed:
 *
 *   import { demoSlugIssue } from "@/lib/demo/reservedRoutes";
 *
 * Do not add it to ./index.ts either: the templates import that barrel.
 */

/* ── Slugs ───────────────────────────────────────────────────────────────── */

/** The same limit the pitch pages use. One rule, one number. */
export const DEMO_SLUG_MAX = PITCH_SLUG_MAX;

/** Identical to `pitchSlugify`, re-exported so callers read as demo code. */
export const demoSlugify = pitchSlugify;

export const isWellFormedDemoSlug = isWellFormedPitchSlug;

/* ── Statuses ────────────────────────────────────────────────────────────── */

export const DEMO_STATUSES: DemoStatus[] = ["free", "draft", "sent", "closed"];

/** What each status is called in the admin. */
export const DEMO_STATUS_LABEL: Record<DemoStatus, string> = {
  free: "Free slot",
  draft: "Draft",
  sent: "Sent",
  closed: "Closed",
};

/** One line explaining what the status does, for the admin's own dropdown. */
export const DEMO_STATUS_HELP: Record<DemoStatus, string> = {
  free: "An empty slot. The link does not open.",
  draft: "Being built. The link does not open, so nothing half-written can be read.",
  sent: "It has gone out. This is the only status whose link opens.",
  closed: "The conversation is over. The link stops working.",
};

/**
 * Move a record written under the OLD status names onto the new ones.
 *
 * The first shape of this collection used "draft" | "live" | "archived",
 * copied from the pitch pages. A row already sitting in a Supabase table
 * cannot be renamed by editing a TypeScript union, and a record whose status
 * no longer matches any branch would fall through to "not reachable" and take
 * a demo offline without saying why. So the two retired names are mapped on
 * the way in, everywhere a status is read.
 *
 * `live` becomes `sent`, because in the new model those are the same state:
 * the link opens. `archived` becomes `closed`. Anything unrecognised becomes
 * "draft", which is the safe direction to fail in: a demo that will not open
 * is a question Mehdi asks, and a demo that opens when it should not is one
 * nobody asks.
 */
export function demoStatusFromLegacy(status: unknown): DemoStatus {
  switch (status) {
    case "free":
    case "draft":
    case "sent":
    case "closed":
      return status;
    case "live":
      return "sent";
    case "archived":
      return "closed";
    default:
      return "draft";
  }
}

/** The status of a record, with the legacy names already mapped. */
export function demoStatus(site: Pick<DemoSite, "status">): DemoStatus {
  return demoStatusFromLegacy(site.status);
}

/* ── Expiry ──────────────────────────────────────────────────────────────── */

/**
 * True once `expiresAt` is in the past.
 *
 * `now` is COPIED before the time is zeroed, for the same reason
 * `isPitchExpired` copies it: `setHours` mutates the Date it is called on, so
 * zeroing the argument in place would silently move a caller's own Date back
 * to midnight.
 *
 * The comparison is against the START of today, so a demo dated 25 September
 * is still open all day on the 25th. A reader who was told "it is up until the
 * 25th" and finds it gone on the morning of the 25th has been lied to by an
 * off-by-one.
 */
export function isDemoExpired(
  site: Pick<DemoSite, "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (!site.expiresAt) return false;
  const d = new Date(site.expiresAt);
  if (Number.isNaN(d.getTime())) return false;
  const startOfToday = new Date(now.getTime());
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday.getTime();
}

/* ── Looking a record up from a URL ──────────────────────────────────────── */

/**
 * What the public route should do with this address.
 *
 *   "missing"  no record, or one that is not `sent`. Render the ordinary 404.
 *   "expired"  a sent record whose `expiresAt` has passed. Render the short
 *              expired card, not the site.
 *   "ok"       render the institute's site.
 *
 * FREE, DRAFT AND CLOSED ALL RETURN "missing", AND THEY RETURN THE SAME THING
 * AS AN UNKNOWN SLUG. A demo still being written must not be readable by
 * somebody who guesses the institute's name, a closed one has to stop working,
 * and neither may announce that a page exists at this address, because "not
 * published yet" told to the wrong reader is itself information. Compare
 * `resolvePitchPage`, which makes the same choice for the same reason.
 *
 * EXPIRED IS DIFFERENT AND IS VISIBLE ON PURPOSE. It is a state a demo reaches
 * while the reader is still in the conversation: they were sent the link, they
 * open it a month later, and a 404 at that moment reads as "the firm has
 * vanished". A short, polite card with a way to reach Mehdi keeps a live
 * conversation alive. It says nothing a 404 does not already say, because the
 * reader was the one who was sent the link.
 */
export type DemoReachability = "ok" | "expired" | "missing";

export interface ResolvedDemo {
  site: DemoSite | null;
  reachability: DemoReachability;
}

/**
 * Find the demo a URL segment refers to, and say whether it may be shown.
 *
 * `includeUnpublished` exists for ONE caller: the admin preview at
 * /admin/preview/site/<slug>, which is behind the login. It also ignores
 * expiry, because previewing an expired demo to check it before extending the
 * date is a thing Mehdi will actually want to do. Never reach for it from a
 * public route.
 */
export function resolveDemoSite(
  slug: string | undefined,
  sites: DemoSite[] | undefined,
  opts: { includeUnpublished?: boolean; now?: Date } = {},
): ResolvedDemo {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return { site: null, reachability: "missing" };
  const found = (sites || []).find((d) => (d.slug || "").toLowerCase() === s);
  if (!found) return { site: null, reachability: "missing" };
  if (opts.includeUnpublished) return { site: found, reachability: "ok" };
  if (demoStatus(found) !== "sent") return { site: null, reachability: "missing" };
  if (isDemoExpired(found, opts.now)) return { site: found, reachability: "expired" };
  return { site: found, reachability: "ok" };
}

/* ── Links ───────────────────────────────────────────────────────────────── */

/**
 * Site-relative path, base-aware so it survives a subpath deploy.
 *
 * /site/ IS ITS OWN NAMESPACE AND THAT IS DELIBERATE. The pitch pages took the
 * bare /<slug> because the address itself is part of that pitch. A demo is the
 * institute's own site and lives one segment down, so the two can never
 * collide at the router and a link is unambiguous about which of the two
 * things Mehdi has just pasted. Adding this route to App.tsx also reserves
 * "site" against every future pitch slug automatically, because the pitch
 * guard parses the real route table rather than a hand-kept list.
 */
export function demoSitePath(slug: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/site/${slug}`;
}

/** The admin-only preview address. Behind the login; renders drafts. */
export function demoPreviewPath(slug: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/admin/preview/site/${slug}`;
}

/**
 * The full https:// link to paste into WhatsApp.
 *
 * `host` is settings.defaultSeo.canonicalHost, the same value every canonical
 * tag on the site is built from. Falls back to the browser's own origin, which
 * is right when Mehdi is working on a preview deploy and wrong nowhere.
 */
export function demoSiteUrl(slug: string, host?: string): string {
  const origin = (host || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${origin}${demoSitePath(slug)}`;
}

/* ── Small presentational helpers, shared so the templates agree ─────────── */

/** "Patna" · "Gorakhpur, Uttar Pradesh" · "Dubai, United Arab Emirates". */
export function demoPlace(site: Pick<DemoSite, "city" | "state" | "country">): string {
  return [site.city, site.state, site.country]
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(", ");
}

/** The market a record renders in. Blank means India, the primary market. */
export function demoMarket(site: Pick<DemoSite, "market">): DemoMarket {
  return site.market === "international" ? "international" : "india";
}

/**
 * The name to put in a cramped nav. Their short form if they gave one, else
 * the full name, which is correct: a name truncated by us is a name spelled
 * wrong on their own website.
 */
export function demoShortName(site: Pick<DemoSite, "shortName" | "instituteName">): string {
  return (site.shortName || "").trim() || (site.instituteName || "").trim();
}

/**
 * The currency symbol for a fee. Symbol only: `DemoCourse.fee` holds the
 * amount alone, so one record can never print two currencies.
 */
const CURRENCY_SYMBOL: Record<DemoCurrency, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  AED: "AED ",
  AUD: "A$",
};

/**
 * A fee, ready to print, or null when there is none.
 *
 * Anything that does not start with a digit is returned VERBATIM: "On request"
 * and "Contact the office" are real answers an institute publishes and
 * "₹On request" is not a thing.
 */
export function demoFee(fee: string | undefined, currency: DemoCurrency | undefined): string | null {
  const raw = (fee || "").trim();
  if (!raw) return null;
  if (!/^\d/.test(raw)) return raw;
  return `${CURRENCY_SYMBOL[currency || "INR"] || ""}${raw}`;
}

/** A date the way the market writes it. Empty string for an empty field. */
export function demoDate(iso: string | undefined, market: DemoMarket = "india"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(market === "international" ? "en-GB" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Their own website ───────────────────────────────────────────────────── */

/**
 * The institute's REAL website, normalised, or null.
 *
 * The demo marker links to it so that anybody who lands on the demo by
 * accident, a forwarded link, a parent who found it in a WhatsApp group, can
 * reach the actual institute in one click instead of reading a page that is
 * not theirs and acting on it. That makes this function part of the honesty
 * mechanism rather than a formatting convenience, which is why it is strict.
 *
 * WHAT IT REFUSES, AND WHY EACH ONE MATTERS.
 *
 *   Anything that is not http or https. A `javascript:` URL typed into a CMS
 *   field and rendered into an href is the oldest stored-XSS there is, and
 *   this field is filled by hand in a hurry.
 *
 *   Anything the URL parser cannot make sense of. A half-typed domain becomes
 *   a dead link on the one control whose whole job is to be the way out.
 *
 * A bare "holycross.edu.in" with no scheme is ACCEPTED and https is assumed,
 * because that is how everybody writes a domain and refusing it would mean a
 * correct entry silently producing no link at all.
 */
export function demoOfficialUrl(raw: string | undefined): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * The host, the way a person reads a web address out loud:
 * "https://www.holycross.edu.in/admissions" becomes "holycross.edu.in".
 *
 * The scheme, the "www." and the path are dropped because none of them is
 * information to the reader, and the whole string is what goes in front of
 * somebody deciding whether this is the school they were looking for. Returns
 * the input unchanged if it cannot be parsed, which is better than returning
 * nothing: an unparseable string is at least still readable.
 */
export function demoHostOf(url: string | undefined): string {
  const s = (url || "").trim();
  if (!s) return "";
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`).hostname.replace(/^www\./, "");
  } catch {
    return s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
}
