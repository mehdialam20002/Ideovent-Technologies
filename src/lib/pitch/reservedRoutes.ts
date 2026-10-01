/**
 * Which URL segments a pitch slug may NOT take.
 *
 * WHY THIS IS PARSED AND NOT TYPED OUT
 * ------------------------------------
 * A pitch page is served from `/:slug`, the last route in the table. React
 * Router ranks a literal segment above a dynamic one, so a real page always
 * wins and a colliding slug does not break /pricing. What it does instead is
 * quieter and worse: Mehdi creates a pitch page for an institute, the admin
 * says it saved, he pastes the link into WhatsApp, and the director opens the
 * Ideovent pricing page. Nobody sees it happen. The slug simply never resolves.
 *
 * So the check has to be right on the day somebody adds a route, not on the day
 * somebody remembers this file exists. Both lists below are read out of the
 * real configuration rather than transcribed from it:
 *
 *   - `src/App.tsx`, imported as raw text, is the route table itself. A
 *     `<Route path="/x">` added tomorrow is reserved tomorrow.
 *   - `vercel.json`, same, is the host redirect table. These matter just as
 *     much and are easy to forget: /privacy-policy, /refund-policy and
 *     /cookie-policy are 301'd by Vercel and have no React route at all, so a
 *     pitch page on one of those slugs would be redirected away before the JS
 *     bundle ever ran.
 *
 * Only the static files under public/ are named by hand, and only the ones
 * without a file extension: `isWellFormedPitchSlug` already rejects a dot, so
 * robots.txt, sitemap.xml, favicon.ico and the .json/.png/.svg files in that
 * folder cannot be reached by a legal slug in the first place.
 *
 * NOT IMPORTED BY THE PAGE DESIGNS. Only the admin validates a slug, and the
 * admin is behind a lazy route, so the App.tsx source string this module holds
 * never reaches a chunk the public downloads. Keep it that way: `record.ts`
 * re-exports the check, and Rollup drops this module from any chunk that does
 * not call it.
 */

import { PITCH_SLUG_MAX, isWellFormedPitchSlug, pitchSlugify, type PitchPage } from "./record";

import appSource from "@/App.tsx?raw";
import vercelJson from "../../../vercel.json?raw";

/**
 * Top-level entries in public/ that have no file extension, plus the two
 * directories a host creates for itself. Vite copies public/ to the root of
 * dist/, so each of these is a real path on the deployed site that would be
 * served in front of the SPA fallback.
 *
 * UPDATE THIS if public/ gains a top-level FOLDER. A new file with an extension
 * needs nothing: a well-formed slug cannot contain a dot.
 */
const STATIC_PATHS = [
  "assets", // Vite's build output
  "api", // Vercel's serverless convention, reserved even though none exist yet
  "blog-covers",
  "certificates",
  "demo", // demo photos and the manifest (public/demo/)
  "home", // the home hero's screenshots (public/home/), since 1 Oct 2026
  "icons",
  "og",
  "w", // the first message's picture pages and their JPEGs (public/w/), since 1 Oct 2026
  "work", // also a real route; listed here because it is a folder too
];

/** First segment of a path: "/services/:slug" -> "services". */
function firstSegment(path: string): string | null {
  const seg = path.replace(/^\/+/, "").split("/")[0] || "";
  if (!seg || seg.startsWith(":") || seg.includes("*")) return null;
  return seg.toLowerCase();
}

function routeSegments(): string[] {
  const out: string[] = [];
  // Matches <Route path="/about" …>, including the nested admin children,
  // whose paths are relative ("login", "c/:collection") and therefore fold
  // into "admin", which the parent <Route path="/admin"> has already claimed.
  for (const m of appSource.matchAll(/<Route\s[^>]*?\bpath\s*=\s*"([^"]+)"/g)) {
    const seg = firstSegment(m[1]);
    if (seg) out.push(seg);
  }
  // Every <Navigate to="/work"> target, so an alias's destination is reserved
  // even in the unlikely case nothing routes to it directly.
  for (const m of appSource.matchAll(/<Navigate\s[^>]*?\bto\s*=\s*"([^"]+)"/g)) {
    const seg = firstSegment(m[1]);
    if (seg) out.push(seg);
  }
  return out;
}

function redirectSegments(): string[] {
  try {
    const cfg = JSON.parse(vercelJson) as {
      redirects?: { source?: string; destination?: string; has?: { type?: string }[] }[];
      rewrites?: { source?: string }[];
    };
    const out: string[] = [];
    for (const r of cfg.redirects || []) {
      // A rule for one other host (the CRM's robots.txt, the old
      // ideovent.vercel.app address sent to www) reserves nothing on the host
      // a pitch page lives on. Same rule as scripts/sync-noindex-header.mjs.
      if (Array.isArray(r.has) && r.has.some((h) => h && h.type === "host")) continue;
      for (const p of [r.source, r.destination]) {
        // "/(.*)" and friends are catch-alls, not reserved names, and a full
        // URL ("https://…") is another site, not a segment of this one.
        if (!p || p.includes("(") || /^[a-z][a-z0-9+.-]*:\/\//i.test(p)) continue;
        const seg = firstSegment(p);
        if (seg) out.push(seg);
      }
    }
    return out;
  } catch {
    // A malformed vercel.json is a deploy problem, not a reason to let a
    // colliding slug through. The route table alone still covers most of it.
    return [];
  }
}

let cached: Set<string> | null = null;

/**
 * Every first URL segment that already belongs to something else.
 * Lower case, no leading slash.
 */
export function reservedSlugs(): Set<string> {
  if (cached) return cached;
  cached = new Set([...routeSegments(), ...redirectSegments(), ...STATIC_PATHS]);
  // "" is what a bare "/" yields; it is not a slug anybody can type.
  cached.delete("");
  return cached;
}

/** True when this slug would be shadowed by a real route, redirect or file. */
export function isReservedSlug(slug: string): boolean {
  return reservedSlugs().has((slug || "").trim().toLowerCase());
}

/* ── Validating a slug against everything it could collide with ─────────── */

/**
 * Why this slug cannot be used, in a sentence an editor can act on. Null when
 * it is fine.
 *
 * Checked in the order a person hits the problems: shape, then length, then a
 * real route, then another pitch page.
 */
export function pitchSlugIssue(
  slug: string,
  opts: { pages?: PitchPage[]; currentId?: string } = {},
): string | null {
  const s = (slug || "").trim();
  if (!s) return "A link needs a slug. It is the part after the slash that you send to the institute or clinic.";
  if (!isWellFormedPitchSlug(s)) {
    return `"${s}" is not a usable link. Use lower-case letters, numbers and single hyphens only, with no spaces, dots or slashes.`;
  }
  if (s.length > PITCH_SLUG_MAX) return `Keep the slug to ${PITCH_SLUG_MAX} characters or fewer.`;
  if (isReservedSlug(s)) {
    return `/${s} is already a real page on this site, so the institute would land there instead of on their pitch. Pick another slug.`;
  }
  const clash = (opts.pages || []).find((p) => p.slug === s && p.id !== opts.currentId);
  if (clash) {
    return `/${s} is already used by the pitch page for ${clash.instituteName || "another institute"}. Slugs have to be unique.`;
  }
  return null;
}

/**
 * A slug for this institute that is not taken yet.
 * Appends -2, -3… rather than a random suffix, so the link still reads as the
 * institute's own name when it lands in somebody's WhatsApp.
 */
export function uniquePitchSlug(
  instituteName: string,
  opts: { pages?: PitchPage[]; currentId?: string } = {},
): string {
  const base = pitchSlugify(instituteName) || "pitch";
  let candidate = base;
  for (let n = 2; n < 200; n++) {
    if (!pitchSlugIssue(candidate, opts)) return candidate;
    candidate = `${base.slice(0, PITCH_SLUG_MAX - 4)}-${n}`;
  }
  return candidate;
}
