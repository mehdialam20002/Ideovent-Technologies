/**
 * Keep the noindex header on the bare pitch slug in step with the route table.
 *
 *   node scripts/sync-noindex-header.mjs          rewrite vercel.json
 *   node scripts/sync-noindex-header.mjs --check  fail if it is stale
 *
 * WHY THIS EXISTS
 * ---------------
 * A pitch page has two addresses. /pitch/<slug> is the stable one, and the bare
 * /<slug> is the one that goes into a WhatsApp message, because
 * ideovent.in/their-own-name is the whole point of the page. Only the first of
 * those had X-Robots-Tag on it, so the address Mehdi actually sends was the one
 * address a crawler was free to index.
 *
 * That matters more than it sounds. A pitch page names an institute, quotes
 * them a price and sometimes lists what is wrong with their current site. Two
 * of those turning up in a Google search for the institute's own name is a lost
 * deal and an embarrassed principal. Helmet already writes a robots meta tag
 * into the page, and Google does run the JS and would eventually honour it, but
 * a meta tag is a promise the crawler has to execute a bundle to read. A header
 * arrives with the first byte, and every other crawler obeys it too.
 *
 * The rule cannot be a catch-all, because / and /about are also single
 * segments and must stay indexed. So it is the inverse: every segment that is
 * NOT something else on this site. That list is the route table, and a list
 * transcribed by hand goes stale the first week. This reads it out of
 * src/App.tsx, the same source src/lib/pitch/reservedRoutes.ts reads, and the
 * --check mode runs in `npm run build` so a route added tomorrow fails the
 * build today rather than quietly un-noindexing /pricing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const APP = resolve(ROOT, "src/App.tsx");
const VERCEL = resolve(ROOT, "vercel.json");

/**
 * How the generated rule is found again on a rewrite. It is the source prefix
 * rather than a marker header, because a marker header would be a real response
 * header shipped to every visitor who opens a pitch page, and this file should
 * not add noise to the wire to keep a note to itself.
 */
const RULE_PREFIX = "/:pitchSlug(";

/**
 * Top-level entries in public/ with no extension, plus the folders a host makes
 * for itself. Mirrors STATIC_PATHS in src/lib/pitch/reservedRoutes.ts. A file
 * WITH an extension needs nothing: the generated pattern excludes any segment
 * containing a dot, which is also why robots.txt and sitemap.xml keep their
 * ordinary headers.
 */
const STATIC_PATHS = ["assets", "api", "blog-covers", "certificates", "icons", "og", "work"];

function firstSegment(path) {
  const seg = String(path).replace(/^\/+/, "").split("/")[0] || "";
  if (!seg || seg.startsWith(":") || seg.includes("*") || seg.includes("(")) return null;
  return seg.toLowerCase();
}

function reservedSegments(cfg) {
  const app = readFileSync(APP, "utf8");
  const out = new Set(STATIC_PATHS);
  for (const m of app.matchAll(/<Route\s[^>]*?\bpath\s*=\s*"([^"]+)"/g)) {
    const seg = firstSegment(m[1]);
    if (seg) out.add(seg);
  }
  for (const m of app.matchAll(/<Navigate\s[^>]*?\bto\s*=\s*"([^"]+)"/g)) {
    const seg = firstSegment(m[1]);
    if (seg) out.add(seg);
  }
  // Host-level redirects have no React route at all. /privacy-policy is 301'd
  // by Vercel before the bundle runs, so it is a real address and must not be
  // swept into the pitch rule.
  for (const r of cfg.redirects || []) {
    for (const p of [r.source, r.destination]) {
      const seg = p && firstSegment(p);
      if (seg) out.add(seg);
    }
  }
  out.delete("");
  return [...out].sort();
}

/**
 * Every single-segment path that is not one of the names above and has no dot
 * in it. Anchored with \/?$ so a trailing slash on a real route does not slip
 * past the lookahead and land /about/ in the pitch rule.
 */
function buildSource(reserved) {
  return `/:pitchSlug((?!(?:${reserved.join("|")})\/?$)[^/.]+)`;
}

/**
 * The scrapers that draw a link preview card and do not run JavaScript.
 *
 * Kept here rather than typed into vercel.json twice, because the bare-slug
 * rewrite below and the two /site/ and /pitch/ rewrites have to agree: a pitch
 * opened at /their-name and the same pitch opened at /pitch/their-name must
 * produce the same card, and the bare address is the one that goes into
 * WhatsApp.
 */
const SCRAPERS =
  "(?i).*(whatsapp|facebookexternalhit|facebookcatalog|linkedinbot|twitterbot|slackbot|" +
  "telegrambot|discordbot|skypeuripreview|redditbot|pinterest|vkshare|embedly|" +
  "quora link preview|bitlybot|nuzzel|outbrain|applebot|google-inspectiontool).*";

const cfg = JSON.parse(readFileSync(VERCEL, "utf8"));
const source = buildSource(reservedSegments(cfg));

const rule = {
  source,
  headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
};

/**
 * The same pattern, as a rewrite, so a scraper asking for a bare pitch slug gets
 * the institute's card instead of Ideovent's marketing card. Generated from the
 * same route table as the header above for the same reason: two hand-maintained
 * copies of this list would disagree within a month.
 */
const shareRewrite = {
  source: source.replace(":pitchSlug(", ":slug("),
  has: [{ type: "header", key: "user-agent", value: SCRAPERS }],
  destination: "/api/share?kind=pitch&slug=:slug",
};

const headers = cfg.headers || [];
const at = headers.findIndex((h) => typeof h.source === "string" && h.source.startsWith(RULE_PREFIX));
const current = at >= 0 ? headers[at] : null;

const rewrites = cfg.rewrites || [];
const rwAt = rewrites.findIndex((r) => typeof r.source === "string" && r.source.startsWith("/:slug("));
const currentRw = rwAt >= 0 ? rewrites[rwAt] : null;

const inSync =
  current &&
  JSON.stringify(current) === JSON.stringify(rule) &&
  currentRw &&
  JSON.stringify(currentRw) === JSON.stringify(shareRewrite);

if (process.argv.includes("--check")) {
  if (inSync) {
    console.log("ok    bare-slug noindex header and share rewrite match the route table");
    process.exit(0);
  }
  console.error("FAIL  vercel.json's bare-slug rules are stale.");
  console.error("      A route was added or removed, so the pattern no longer");
  console.error("      matches what is actually served. Pitch pages sent by");
  console.error("      WhatsApp are indexable until it is regenerated.");
  console.error("");
  console.error("      expected: " + source);
  console.error("      found:    " + (current ? current.source : "(no rule at all)"));
  console.error("");
  console.error("      Fix with:  npm run sync:noindex");
  process.exit(1);
}

if (inSync) {
  console.log("ok    already in sync, nothing written");
  process.exit(0);
}

if (at >= 0) headers[at] = rule;
else headers.push(rule);
cfg.headers = headers;

// The share rewrite must sit BEFORE the SPA catch-all, or /(.*) swallows it.
if (rwAt >= 0) rewrites[rwAt] = shareRewrite;
else {
  const catchAll = rewrites.findIndex((r) => r.source === "/(.*)");
  rewrites.splice(catchAll < 0 ? rewrites.length : catchAll, 0, shareRewrite);
}
cfg.rewrites = rewrites;

writeFileSync(VERCEL, JSON.stringify(cfg, null, 2) + "\n", "utf8");
console.log((at >= 0 ? "updated" : "added  ") + " bare-slug noindex rule and share rewrite");
console.log("        " + source);
