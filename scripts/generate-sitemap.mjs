/**
 * Build public/sitemap.xml.
 *
 * The site is a client-rendered SPA: there is no directory of HTML files for a
 * crawler to walk, and public/_redirects rewrites every path to index.html. The
 * sitemap is therefore the only complete, machine-readable list of what exists.
 *
 * Nothing here is hand-maintained. The static routes are read out of
 * src/App.tsx and the data-driven ones out of src/lib/cms/seed.ts (bundled on
 * the fly by the esbuild that already ships inside Vite), so a page or a
 * project added by anyone lands in the sitemap without them remembering that
 * this file exists.
 *
 * DELIBERATELY EXCLUDED
 *   /admin/*, /crm/*    login wall; also noindex,nofollow at the page level
 *   the CRM host        crm.ideovent.in serves the same build, but App.tsx
 *                       renders only the CRM there (/, /login, /leads...). Those
 *                       routes sit between the crm-host-routes:start and
 *                       crm-host-routes:end markers in App.tsx and are skipped;
 *                       a host starting with crm. is refused outright. That
 *                       host is noindex by header and Disallow: / by its own
 *                       robots file (vercel.json, sync-noindex-header.mjs).
 *   /verify/:certId     one page per named intern: name, photograph and grade.
 *                       The URL travels on a printed QR code and a LinkedIn
 *                       credential link, so it has to be REACHABLE, not
 *                       indexable. CertificateVerify.tsx sets noindex on it for
 *                       the same reason.
 *   /:slug              a pitch page, written for one named institute and sent
 *                       to them. Every one is noindex,nofollow at the page
 *                       level for the same reason. It falls out of the list
 *                       automatically, because the loop below skips any
 *                       parameterised route. Do NOT add the pitchPages
 *                       collection to the data-driven section further down.
 *   <Navigate> routes   legacy aliases; vercel.json 301s them instead
 *   checkout, payment   payment steps (NOT_FOR_SEARCH below); the pages also
 *                       send noindex themselves
 *   /blogs/:id          legacy alias of /blog/:slug; duplicate content
 *   legal drafts        a policy still holding [[TOKEN]] blanks is noindex, so
 *                       it is left out until the blanks are filled
 *   /w/<kind>           the first message's picture pages (public/w/), static
 *                       files for WhatsApp's link card, noindex; this script
 *                       never walks public/, so they stay out by themselves
 *
 * <lastmod> ONLY WHERE THE PAGE CARRIES A REAL DATE (2 Oct 2026): a blog post's
 * publish date (or its updatedAt, when later) and a policy's "updated" date, the
 * dates those pages print. Google "uses the <lastmod> value if it's consistently
 * and verifiably ... accurate" (developers.google.com/search/docs/crawling-
 * indexing/sitemaps/build-sitemap), and Bing asks for "the true last
 * modification time of the page content, not the sitemap file itself"
 * (blogs.bing.com/webmaster, July 2025). Every other page has no recorded date,
 * so it gets none: stamping today's date on three dozen URLs that did not change
 * today is a signal a crawler learns to discount. A post with no date (the nine
 * imported ones, see seed.ts) gets none either.
 * NO <changefreq> or <priority>: Google and Bing both ignore them.
 *
 * Run:  npm run sitemap   (also runs as part of `npm run build`)
 */

import { build } from "esbuild";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, "..");
const SEED = path.join(SITE, "src", "lib", "cms", "seed.ts");
const APP = path.join(SITE, "src", "App.tsx");
const OUT = path.join(SITE, "public", "sitemap.xml");
const ROBOTS = path.join(SITE, "public", "robots.txt");

/**
 * THE HOST HAS TO COME FROM THE SAME PLACE THE CANONICAL TAGS DO.
 *
 * seed.ts reads VITE_PUBLIC_URL, and falls back to https://www.ideovent.in.
 * That fallback is a domain which, as of September 2026, DOES NOT RESOLVE
 * (_assets/FACTS.md). Vite loads .env into import.meta.env for the app; node
 * does not, so running this script, or `npm run build`, on a laptop produced a
 * sitemap of 37 URLs on the dead domain while every canonical tag the same
 * build emitted said ideovent.vercel.app. A sitemap whose <loc> host disagrees
 * with the canonical host is not a small error: Google rejects the file whole.
 *
 * So .env is loaded here first, exactly as Vite would, and a missing value is
 * shouted about rather than quietly replaced with a dead address. On Vercel the
 * variable is already in process.env, and this is a no-op.
 */
async function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    let text;
    try {
      text = await readFile(path.join(SITE, name), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue; // comments and blanks
      const [, key, rawValue] = m;
      if (process.env[key] !== undefined) continue; // a real env var always wins
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
}
await loadDotEnv();

/**
 * Static routes that exist but must never be submitted: checkout and payment
 * steps. Any segment, so /pricing/checkout is caught as well as /checkout.
 */
const NOT_FOR_SEARCH = /(^|\/)(checkout|pay|payment|payments|thank-you|thanks|success|failed|cancelled|subscribe)(\/|$)/i;

/** Every <Route path="/…"> in App.tsx that a crawler should be handed. */
async function staticRoutes() {
  const src = await readFile(APP, "utf8");
  const routes = [];
  const legal = [];
  // The CRM host's own route table: those addresses exist only on crm.ideovent.in.
  let inCrmHostBlock = false;
  let sawCrmHostBlock = false;
  for (const line of src.split("\n")) {
    if (line.includes("crm-host-routes:start")) {
      inCrmHostBlock = sawCrmHostBlock = true;
      continue;
    }
    if (line.includes("crm-host-routes:end")) {
      inCrmHostBlock = false;
      continue;
    }
    if (inCrmHostBlock) continue;
    const m = line.match(/<Route\s+path="(\/[^"]*)"/);
    if (!m) continue;
    const route = m[1];
    if (route.includes(":") || route.includes("*")) continue; // parameterised
    if (route === "/admin" || route.startsWith("/admin/") || route === "/crm" || route.startsWith("/crm/")) continue;
    // Payment steps are not pages anyone should land on from a search (P1-7 of
    // the SEO audit, 1 Oct 2026): a checkout, a result or a thank-you screen.
    if (NOT_FOR_SEARCH.test(route)) continue;
    if (line.includes("<Navigate")) continue; // legacy alias, 301 in _redirects
    const kind = line.match(/<Legal\s+kind="([a-z]+)"/);
    if (kind) legal.push([kind[1], route]);
    else routes.push(route);
  }
  // A start marker with no end would silently drop every route after it.
  if (inCrmHostBlock) throw new Error("src/App.tsx: crm-host-routes:start has no crm-host-routes:end");
  if (/\bisCrmHost\s*\(/.test(src) && !sawCrmHostBlock) {
    throw new Error("src/App.tsx renders CRM-host routes but the crm-host-routes markers are gone; put them back around that route table");
  }
  return { routes, legal };
}

async function loadSeed() {
  const dir = await mkdtemp(path.join(tmpdir(), "ideovent-sitemap-"));
  const outfile = path.join(dir, "seed.mjs");
  await build({
    entryPoints: [SEED],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    // seed.ts prefixes public assets with Vite's BASE_URL. Irrelevant to routes,
    // but it has to resolve to something for the bundle to run under node.
    define: { "import.meta.env.BASE_URL": '"/"' },
  });
  const mod = await import(pathToFileURL(outfile).href);
  return { seed: mod.seed, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

const xml = (urls, host, lastmod = new Map()) => `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/generate-sitemap.mjs. Do not hand-edit. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${host}${u}</loc>${lastmod.has(u) ? `<lastmod>${lastmod.get(u)}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;

/**
 * A W3C date (YYYY-MM-DD) from a value a page prints: an ISO date
 * ("2026-10-02", "2026-10-02T10:00:00Z") or a policy's "26 September 2026".
 * Anything else, an empty value included, is no date at all: null.
 */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function w3cDate(value) {
  const s = String(value || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  return month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

const { seed, cleanup } = await loadSeed();
try {
  const host = seed.settings.defaultSeo.canonicalHost.replace(/\/$/, "");
  // The CRM's subdomain is a private app: no sitemap may ever point at it.
  if (/^https?:\/\/crm\./i.test(host)) {
    throw new Error(`the sitemap host is ${host}, the CRM's own subdomain. VITE_PUBLIC_URL must be the main site (VITE_CRM_URL is the CRM's).`);
  }
  const { routes, legal } = await staticRoutes();

  const services = seed.services.map((s) => `/services/${s.slug}`);
  const projects = seed.projects.map((p) => `/work/${p.slug}`);
  const posts = seed.posts
    .filter((p) => p.status === "published")
    .map((p) => `/blog/${p.slug}`);

  // A policy is a draft, and noindex, while it still has [[TOKEN]] blanks or
  // no effective date. Mirrors the isDraft test in src/pages/Legal.tsx.
  const published = legal
    .filter(([kind]) => {
      const doc = seed.legal?.[kind];
      return doc && !/\[\[[A-Z_0-9]+\]\]/.test(doc.body) && Boolean(doc.updatedAt);
    })
    .map(([, route]) => route);

  const seen = new Set();
  const urls = [...routes, ...services, ...projects, ...posts, ...published].filter(
    (u) => (seen.has(u) ? false : seen.add(u)),
  );

  // <lastmod> only from a date the page itself prints (see the header).
  const lastmod = new Map();
  for (const p of seed.posts.filter((x) => x.status === "published")) {
    const d = later(w3cDate(p.publishDate), w3cDate(p.updatedAt));
    if (d) lastmod.set(`/blog/${p.slug}`, d);
  }
  for (const [kind, route] of legal) {
    const d = w3cDate(seed.legal?.[kind]?.updatedAt);
    if (d && published.includes(route)) lastmod.set(route, d);
  }

  await writeFile(OUT, xml(urls, host, lastmod), "utf8");

  /*
    robots.txt carries the same host twice: the comment at the top and the
    Sitemap: line at the bottom. Hand-maintained, the two drifted from the
    canonical host and pointed a crawler at a domain that does not resolve. It
    is rewritten from `host` here so there is one place the address is decided.
  */
  try {
    const before = await readFile(ROBOTS, "utf8");
    const after = before
      .replace(/^(# Ideovent Technologies, ).*$/m, `$1${host}`)
      .replace(/^(Sitemap: ).*$/m, `$1${host}/sitemap.xml`);
    if (after !== before) {
      await writeFile(ROBOTS, after, "utf8");
      console.log(`robots.txt   Sitemap: line re-pointed at ${host}`);
    }
  } catch {
    console.warn("robots.txt  not found, its Sitemap: line was not checked");
  }

  if (!process.env.VITE_PUBLIC_URL) {
    console.warn(
      "\n  WARNING: VITE_PUBLIC_URL is not set, so the host above is seed.ts's\n" +
        "  fallback, https://www.ideovent.in, which does not resolve. Every <loc>\n" +
        "  in sitemap.xml and the Sitemap: line in robots.txt now point at a dead\n" +
        "  domain, and they disagree with the canonical tags this build emits.\n" +
        "  Set VITE_PUBLIC_URL (in .env locally, in the project settings on Vercel)\n" +
        "  and run this again.\n",
    );
  }

  const draftCount = legal.length - published.length;
  console.log(`sitemap.xml  ${urls.length} URLs  host ${host}`);
  console.log(
    `  ${routes.length} static · ${services.length} services · ${projects.length} projects · ` +
      `${posts.length} posts · ${published.length} legal` +
      (draftCount ? ` (${draftCount} legal page(s) still draft, left out)` : ""),
  );
  console.log(`  <lastmod> on ${lastmod.size} URL(s): only pages that print a real date`);
} finally {
  await cleanup();
}
