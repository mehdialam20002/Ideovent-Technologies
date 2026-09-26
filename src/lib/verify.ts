/**
 * Verification URLs.
 *
 * There are two of these on purpose, and using the wrong one prints a certificate
 * that can never be fixed.
 *
 *   verifyUrl(id), for links inside the running app. Resolves against
 *                              wherever the app happens to be served, so it works
 *                              on localhost, on a preview deploy and on a sub-path
 *                              deploy.
 *
 *   canonicalVerifyUrl(id), for anything that gets PRINTED or handed to someone
 *                              else: the QR code, the line of text under it, the
 *                              credential URL an intern pastes into LinkedIn. It
 *                              is always absolute and always the public site.
 *
 * WHY THE SPLIT EXISTS
 * --------------------
 * The QR code used to be generated from the runtime origin. Generate one from an
 * admin session on http://localhost:5180 and the certificate goes to the printer
 * encoding `http://localhost:5180/verify/INT2025A75`: a URL that resolves to the
 * intern's own laptop, forever, on a piece of paper that is already in their hand.
 * The same thing happens on a `DEPLOY_BASE` sub-path deploy, which appends the
 * base path into the encoded URL.
 *
 * A printed QR cannot be re-issued quietly, so the printed URL does not get to
 * depend on which machine happened to render it.
 */

/**
 * The public site, as printed on certificates. Overridable at build time for a staging domain.
 *
 * MUST STAY IDENTICAL TO `settings.defaultSeo.canonicalHost` IN src/lib/cms/seed.ts.
 * That value is `https://www.ideovent.in`, and so is every <link rel="canonical">, every
 * og: url, the JSON-LD @id of the Organization and WebSite nodes, robots.txt and all 37
 * entries in sitemap.xml. This constant once read `https://ideovent.com`: the apex, a host the
 * site never claims anywhere else. Which is the one place that divergence is unrecoverable:
 * a QR code is printed on paper and handed to a former intern. If the DNS ends up pointing
 * only the www host at the deploy (the usual shape: a CNAME on www, nothing on the apex),
 * every certificate already in someone's hand resolves to nothing, and there is no way to
 * re-issue it quietly. Neither public/_redirects nor vercel.json canonicalises apex → www,
 * so nothing downstream was covering the gap either.
 */
export const CANONICAL_ORIGIN = (
  (import.meta.env.VITE_PUBLIC_URL as string | undefined) || "https://www.ideovent.in"
).replace(/\/$/, "");

/**
 * The permanent address of this business, independent of where it is deployed
 * today. NOT an env var, on purpose.
 *
 * WHY THIS HAD TO BE SEPARATED FROM CANONICAL_ORIGIN
 *
 * `isPreviewOrigin()` below compared `publicOrigin()` against `CANONICAL_ORIGIN`,
 * and both of those read VITE_PUBLIC_URL. So whenever the variable was set, they
 * were the same string, the comparison was true by construction, and the warning
 * could not fire. Measured on 25 September 2026 against the four real cases:
 *
 *   prod on Vercel, env set to the vercel URL   QR: vercel.app     banner: no
 *   LOCALHOST admin, env set to the vercel URL  QR: vercel.app     banner: no
 *   localhost admin, env unset                  QR: ideovent.com  banner: YES
 *   prod once the domain is live                QR: ideovent.com  banner: no
 *
 * (Measured while the business domain was ideovent.com. It moved to
 * ideovent.in the same evening; the logic, and the finding, are unchanged.)
 *
 * The only case that warned was the only case with nothing wrong. Meanwhile the
 * live `.env` sets VITE_PUBLIC_URL to `https://ideovent.vercel.app`, so every
 * certificate printed today encodes a vercel.app URL onto paper, permanently,
 * and nothing said so.
 *
 * That is survivable ONLY while the vercel.app address keeps resolving. It stops
 * resolving if the Vercel project is renamed, transferred or deleted, and at that
 * moment every certificate already in a former intern's hand is dead, with no way
 * to re-issue it. See `13-launchpad/CERTIFICATE-SYSTEM.md`.
 */
export const PERMANENT_ORIGIN = "https://www.ideovent.in";

/** Public base URL of the RUNNING app. Env override → runtime origin + base path. */
export function publicOrigin(): string {
  const env = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (env) return env.replace(/\/$/, "");
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (typeof window !== "undefined") return `${window.location.origin}${base}`;
  return CANONICAL_ORIGIN;
}

/** In-app link to a certificate's verification page. Follows wherever the app is served. */
export function verifyUrl(certificateId: string): string {
  return `${publicOrigin()}/verify/${certificateId}`;
}

/**
 * The URL that goes on the certificate. ALWAYS absolute, ALWAYS the public site,
 * whatever origin the admin session is running on.
 */
export function canonicalVerifyUrl(certificateId: string): string {
  return `${CANONICAL_ORIGIN}/verify/${certificateId}`;
}

/** The same URL without the scheme, for printing in text under the QR block. */
export function canonicalVerifyLabel(certificateId: string): string {
  return canonicalVerifyUrl(certificateId).replace(/^https?:\/\//, "");
}

/**
 * True when this admin session is not being served from the origin the QR will
 * encode.
 *
 * Compared against `window.location.origin` and NOT against `publicOrigin()`,
 * which returns the env value and made this tautologically false. A localhost
 * admin session is now correctly reported as a preview.
 */
export function isPreviewOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return !window.location.origin.startsWith(CANONICAL_ORIGIN);
}

/**
 * True when the QR about to be printed encodes something other than the
 * business's permanent address.
 *
 * THIS IS THE ONE THAT MATTERS, and it is a different question from the one
 * above. `isPreviewOrigin()` asks "where am I working right now", which is a
 * question about convenience. This asks "what is going on the paper", which is
 * a question about whether a certificate handed to somebody in 2026 still
 * resolves in 2030.
 *
 * Deliberately returns true on a deploy-host URL like `*.vercel.app` or
 * `*.netlify.app`, because those names belong to the host and not to Ideovent.
 */
export function printsNonPermanentUrl(): boolean {
  return CANONICAL_ORIGIN !== PERMANENT_ORIGIN;
}
