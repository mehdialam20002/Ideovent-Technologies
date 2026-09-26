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
 *   /admin/*            login wall; also noindex,nofollow at the page level
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
 *   <Navigate> routes   legacy aliases; public/_redirects 301s them instead
 *   /blogs/:id          legacy alias of /blog/:slug; duplicate content
 *   legal drafts        a policy still holding [[TOKEN]] blanks is noindex, so
 *                       it is left out until the blanks are filled
 *
 * NO <lastmod>, <changefreq> or <priority>: the CMS carries no real per-page
 * modification date, Google ignores the other two, and stamping today's date on
 * three dozen URLs that did not change today is a signal a crawler learns to
 * discount.
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

/** Every <Route path="/…"> in App.tsx that a crawler should be handed. */
async function staticRoutes() {
  const src = await readFile(APP, "utf8");
  const routes = [];
  const legal = [];
  for (const line of src.split("\n")) {
    const m = line.match(/<Route\s+path="(\/[^"]*)"/);
    if (!m) continue;
    const route = m[1];
    if (route.includes(":") || route.includes("*")) continue; // parameterised
    if (route === "/admin" || route.startsWith("/admin/")) continue;
    if (line.includes("<Navigate")) continue; // legacy alias, 301 in _redirects
    const kind = line.match(/<Legal\s+kind="([a-z]+)"/);
    if (kind) legal.push([kind[1], route]);
    else routes.push(route);
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

const xml = (urls, host) => `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/generate-sitemap.mjs. Do not hand-edit. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${host}${u}</loc></url>`).join("\n")}
</urlset>
`;

const { seed, cleanup } = await loadSeed();
try {
  const host = seed.settings.defaultSeo.canonicalHost.replace(/\/$/, "");
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

  await writeFile(OUT, xml(urls, host), "utf8");

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
} finally {
  await cleanup();
}
