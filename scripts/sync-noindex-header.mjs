/**
 * Keep the noindex header on the bare pitch slug in step with the route table,
 * and keep the crm.ideovent.in rules (noindex everywhere, its own robots.txt)
 * in vercel.json; see CRM_HOST below.
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
const STATIC_PATHS = ["assets", "api", "blog-covers", "certificates", "demo", "home", "icons", "og", "work"];

function firstSegment(path) {
  const seg = String(path).replace(/^\/+/, "").split("/")[0] || "";
  if (!seg || seg.startsWith(":") || seg.includes("*") || seg.includes("(")) return null;
  // A segment with a dot (robots.txt) can never match the [^/.]+ below anyway.
  if (seg.includes(".")) return null;
  return seg.toLowerCase();
}

/** True for a rule limited to one host with "has": [{ "type": "host" }]. */
const hostScoped = (r) => Array.isArray(r.has) && r.has.some((h) => h && h.type === "host");

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
    // A redirect for one other host (the CRM's robots.txt) reserves nothing here.
    if (hostScoped(r)) continue;
    for (const p of [r.source, r.destination]) {
      const seg = p && !/^[a-z][a-z0-9+.-]*:\/\//i.test(p) && firstSegment(p);
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

/**
 * THE CRM'S OWN SUBDOMAIN (30 Sep 2026).
 *
 * crm.ideovent.in is served by this same project and build; App.tsx renders
 * only the CRM there (a sign-in wall). Nothing on that host is for a search
 * engine, so on that host, and only there:
 *
 *   - every path carries X-Robots-Tag: noindex, nofollow;
 *   - /robots.txt answers with public/robots-crm.txt (User-agent: * / Disallow: /).
 *
 * The robots rule is a REDIRECT, not a rewrite, on purpose. Vercel checks the
 * filesystem before it applies rewrites (that is why the SPA fallback below
 * does not swallow /assets), so a rewrite whose source is a real file,
 * public/robots.txt, never fires and the CRM host would get the main site's
 * robots file. Redirects run before the filesystem, and crawlers follow a
 * redirected robots.txt (Google follows up to five hops). The SPA fallback has
 * no host condition, so the CRM host gets index.html like the main site.
 *
 * These are written and checked here, like the bare-slug rules, so a hand edit
 * of vercel.json that drops them fails `npm run build` (the --check step).
 */
const CRM_HOST = "crm.ideovent.in";
const ON_CRM_HOST = [{ type: "host", value: CRM_HOST }];
const crmNoindex = {
  source: "/(.*)",
  has: ON_CRM_HOST,
  headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
};
const crmRobots = { source: "/robots.txt", has: ON_CRM_HOST, destination: "/robots-crm.txt", permanent: false };
const forCrmHost = (r) => Array.isArray(r.has) && r.has.some((h) => h && h.type === "host" && h.value === CRM_HOST);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const headers = cfg.headers || [];
const at = headers.findIndex((h) => typeof h.source === "string" && h.source.startsWith(RULE_PREFIX));
const current = at >= 0 ? headers[at] : null;

const rewrites = cfg.rewrites || [];
const rwAt = rewrites.findIndex((r) => typeof r.source === "string" && r.source.startsWith("/:slug("));
const currentRw = rwAt >= 0 ? rewrites[rwAt] : null;

const redirects = cfg.redirects || [];
const crmHeaderAt = headers.findIndex((h) => h.source === crmNoindex.source && forCrmHost(h));
const crmRobotsAt = redirects.findIndex((r) => r.source === crmRobots.source && forCrmHost(r));

const slugInSync = Boolean(current && same(current, rule) && currentRw && same(currentRw, shareRewrite));
const crmInSync =
  crmHeaderAt >= 0 && same(headers[crmHeaderAt], crmNoindex) && crmRobotsAt >= 0 && same(redirects[crmRobotsAt], crmRobots);
const inSync = slugInSync && crmInSync;

if (process.argv.includes("--check")) {
  if (inSync) {
    console.log("ok    bare-slug noindex header and share rewrite match the route table");
    console.log(`ok    ${CRM_HOST}: noindex on every path, /robots.txt goes to /robots-crm.txt`);
    process.exit(0);
  }
  if (slugInSync) console.log("ok    bare-slug noindex header and share rewrite match the route table");
  if (!crmInSync) {
    console.error(`FAIL  vercel.json's ${CRM_HOST} rules are missing or changed.`);
    console.error("      The CRM's subdomain must send X-Robots-Tag: noindex, nofollow");
    console.error("      on every path and answer /robots.txt with robots-crm.txt.");
    console.error("      header:   " + (crmHeaderAt >= 0 ? JSON.stringify(headers[crmHeaderAt]) : "(none)"));
    console.error("      redirect: " + (crmRobotsAt >= 0 ? JSON.stringify(redirects[crmRobotsAt]) : "(none)"));
    console.error("");
    console.error("      Fix with:  npm run sync:noindex");
    if (slugInSync) process.exit(1);
    console.error("");
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

if (!slugInSync) {
  if (at >= 0) headers[at] = rule;
  else headers.push(rule);

  // The share rewrite must sit BEFORE the SPA catch-all (the rewrite to
  // /index.html, "/((?!assets/).*)"), or the catch-all swallows it.
  if (rwAt >= 0) rewrites[rwAt] = shareRewrite;
  else {
    const catchAll = rewrites.findIndex((r) => r.destination === "/index.html");
    rewrites.splice(catchAll < 0 ? rewrites.length : catchAll, 0, shareRewrite);
  }
}

if (!crmInSync) {
  if (crmHeaderAt >= 0) headers[crmHeaderAt] = crmNoindex;
  else headers.push(crmNoindex);
  if (crmRobotsAt >= 0) redirects[crmRobotsAt] = crmRobots;
  else redirects.push(crmRobots);
}

cfg.headers = headers;
cfg.rewrites = rewrites;
cfg.redirects = redirects;

writeFileSync(VERCEL, JSON.stringify(cfg, null, 2) + "\n", "utf8");
if (!slugInSync) {
  console.log((at >= 0 ? "updated" : "added  ") + " bare-slug noindex rule and share rewrite");
  console.log("        " + source);
}
if (!crmInSync) {
  console.log((crmHeaderAt >= 0 || crmRobotsAt >= 0 ? "updated" : "added  ") + ` ${CRM_HOST} rules: noindex header, robots.txt redirect`);
}
