/**
 * THE TWO PUBLIC ADDRESSES, AND WHICH ONE THIS PAGE IS ON (30 Sep 2026).
 *
 * MAIN_ORIGIN: the marketing site and every demo (/site/<slug>). It is
 * VITE_PUBLIC_URL, the same value certificates use, so the day ideovent.in
 * opens, one Vercel variable moves demo links, QR codes and canonical URLs
 * together. Until then it is https://ideovent.vercel.app (read from the live
 * build on 30 Sep 2026), so nothing a prospect was sent changes; a Vercel
 * preview's own address never becomes it (mainOriginFrom).
 *
 * CRM_ORIGIN: the CRM's own subdomain (https://crm.ideovent.in), from
 * VITE_CRM_URL. Empty until that subdomain is live; while it is empty the CRM
 * keeps working at /crm on the main site exactly as before.
 *
 * Node-safe: scripts bundle modules that import this, and import.meta.env is
 * undefined there (the same pattern as CANONICAL_HOST in src/lib/cms/seed.ts).
 */
function readEnv(key: string): string {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const nodeEnv = typeof process !== "undefined" ? process.env : undefined;
  return (viteEnv?.[key] || nodeEnv?.[key] || "").trim();
}

const noTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/** The live address until ideovent.in opens (the production value of VITE_PUBLIC_URL on 30 Sep 2026). */
export const LIVE_VERCEL_ORIGIN = "https://ideovent.vercel.app";

/**
 * MAIN_ORIGIN from a VITE_PUBLIC_URL value. A Vercel PREVIEW build is given
 * its own https://<deployment>.vercel.app there (vite.config.ts, so its
 * canonical tags point at itself), and previews sit behind Vercel's login:
 * a demo link to one would not open for a prospect. So any *.vercel.app
 * address other than the live one reads as the live one, and a message
 * composed on a preview carries the same demo link production writes
 * (30 Sep 2026). A custom domain (www.ideovent.in) is kept as it is.
 */
export function mainOriginFrom(raw: string | undefined): string {
  const value = noTrailingSlash((raw || "").trim());
  if (!value) return LIVE_VERCEL_ORIGIN;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.endsWith(".vercel.app") && host !== new URL(LIVE_VERCEL_ORIGIN).hostname) return LIVE_VERCEL_ORIGIN;
  } catch {
    /* Not a URL: kept as typed, as before. */
  }
  return value;
}

export const MAIN_ORIGIN: string = mainOriginFrom(readEnv("VITE_PUBLIC_URL"));

export const CRM_ORIGIN: string = noTrailingSlash(readEnv("VITE_CRM_URL"));

/** True on crm.<anything>: crm.ideovent.in in production, crm.localhost in development and tests. */
export function isCrmHost(hostname?: string): boolean {
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return /^crm\./i.test(host);
}

/**
 * A link from the CRM to the admin (/admin/...) or to a public demo (/site/...).
 * On the CRM's own subdomain those pages live on the main site, so the link
 * must be absolute (use a plain <a href>, not a router <Link>). Everywhere else
 * it stays a relative path, exactly as before.
 */
export function mainSiteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return isCrmHost() ? `${MAIN_ORIGIN}${p}` : p;
}

/** True when mainSiteUrl() returns another origin, i.e. a router <Link> cannot follow it. */
export function mainSiteIsCrossOrigin(): boolean {
  return isCrmHost();
}

/* ── The other direction: from the main site to the CRM's own host ───────── */

function currentHost(hostname?: string): string {
  return (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
}

/** localhost, 127.0.0.1 or ::1: development and tests, where the CRM always stays at /crm. */
export function isLocalHost(hostname?: string): boolean {
  const host = currentHost(hostname).replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/** The hostname in CRM_ORIGIN ("crm.ideovent.in"), or "" when it is empty or not a URL. */
function crmOriginHost(): string {
  if (!CRM_ORIGIN) return "";
  try {
    return new URL(CRM_ORIGIN).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * True when this page is on the MAIN site and the CRM now lives on CRM_ORIGIN,
 * so /crm, /admin/outreach and the admin's CRM link hand over to it. All of:
 *   - VITE_CRM_URL is set, to a crm.* address: a mistyped value can never
 *     take the CRM away from /crm, it only leaves it where it is;
 *   - this page is not the CRM host itself;
 *   - this page is not localhost/127.0.0.1, so development keeps /crm here
 *     even with the variable set;
 *   - CRM_ORIGIN is not this very host (no redirect loop, whatever the values).
 * False today, because VITE_CRM_URL is empty: nothing moves until go-live.
 */
export function crmMovedOut(hostname?: string): boolean {
  const target = crmOriginHost();
  if (!target || !isCrmHost(target)) return false;
  const host = currentHost(hostname);
  if (!host || isCrmHost(host) || isLocalHost(host)) return false;
  return target !== host;
}

/**
 * The same CRM screen on CRM_ORIGIN, from its address on the main site:
 * "/crm/leads/ol_1?view=all" becomes "https://crm.ideovent.in/leads/ol_1?view=all",
 * "/crm" becomes "https://crm.ideovent.in/". Query and hash are kept. A path
 * without the /crm prefix ("/leads/ol_1") is taken as a CRM path already.
 */
export function crmOriginUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const rest = p.replace(/^\/crm(?=[/?#]|$)/, "");
  return `${CRM_ORIGIN}${rest.startsWith("/") ? rest : `/${rest}`}`;
}
