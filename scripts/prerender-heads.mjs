/**
 * Give every public page its own HTML file, after `vite build` (1 Oct 2026).
 *
 *   node scripts/prerender-heads.mjs          (runs at the end of `npm run build`)
 *
 * THE PROBLEM (SEO audit, P0-3). Vercel answered every URL with the same
 * dist/index.html: the homepage's title, description, canonical and card, and
 * an empty <div id="root">. Google renders the JavaScript later, but WhatsApp,
 * LinkedIn and X read only that first HTML, so every link previewed as the
 * homepage; Bing renders JavaScript unevenly and most AI crawlers not at all.
 *
 * WHAT THIS DOES. For every URL in the sitemap it writes dist/<route>/index.html:
 * the built index.html with that route's title, description, canonical, Open
 * Graph and Twitter tags and JSON-LD (all data-rh="true", so react-helmet-async
 * adopts them on load instead of adding a second set), plus a <noscript> holding
 * the page's h1 and text. The values come from src/lib/seo/prerender.ts, which
 * calls the same helpers the pages call. Vercel serves a real file before it
 * applies the SPA rewrite in vercel.json (VERCEL-CONFIG-NOTES.md), so
 * /services/seo gets dist/services/seo/index.html and everything else still
 * gets dist/index.html. React then renders into #root exactly as before.
 *
 * dist/index.html itself is also served for every address WITHOUT a file of its
 * own (pitch pages, demos, the admin, a post added in /admin after the build),
 * so it keeps the homepage's title and description but NO canonical and no
 * og:url; <Seo> sets those at runtime, the pattern Google documents for SPAs.
 * Its developer comments (11 KB of the 18.7 KB file) are stripped on the way.
 *
 * NOT DONE HERE: rendering the React page itself to HTML (SSR/SSG with
 * hydrateRoot). That is the next step for speed and is several days of work;
 * see the SEO audit, P0-3 step 3.
 */
import { build } from "esbuild";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, "..");
// PRERENDER_DIST: a build made with `vite build --outDir <dir>` elsewhere.
const DIST = process.env.PRERENDER_DIST ? path.resolve(process.env.PRERENDER_DIST) : path.join(SITE, "dist");
const ENTRY = path.join(SITE, "src", "lib", "seo", "prerender.ts");

/** .env the way generate-sitemap.mjs reads it: a real env var always wins. */
async function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    let text;
    try { text = await readFile(path.join(SITE, name), "utf8"); } catch { continue; }
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function loadModule() {
  const dir = await mkdtemp(path.join(tmpdir(), "ideovent-prerender-"));
  const outfile = path.join(dir, "prerender.mjs");
  await build({
    entryPoints: [ENTRY], outfile, bundle: true, format: "esm", platform: "node", logLevel: "silent",
    tsconfig: path.join(SITE, "tsconfig.app.json"),
    define: { "import.meta.env.BASE_URL": '"/"' },
  });
  const mod = await import(pathToFileURL(outfile).href);
  return { mod, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

const attr = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The head tags <Seo> emits, in the same shape, marked for Helmet to adopt. */
function headTags(h) {
  const m = (k, name, content) => `<meta data-rh="true" ${k}="${name}" content="${attr(content)}" />`;
  const tags = [
    m("name", "description", h.description),
    m("name", "robots", "index, follow, max-image-preview:large"),
    h.canonical ? `<link data-rh="true" rel="canonical" href="${attr(h.canonical)}" />` : "",
    m("property", "og:site_name", "Ideovent Technologies"),
    m("property", "og:locale", "en_IN"),
    m("property", "og:title", h.title),
    m("property", "og:description", h.description),
    m("property", "og:type", h.type),
    h.canonical ? m("property", "og:url", h.canonical) : "",
    m("property", "og:image", h.image),
    h.imageIsCard ? m("property", "og:image:width", "1200") : "",
    h.imageIsCard ? m("property", "og:image:height", "630") : "",
    m("property", "og:image:alt", h.imageAlt),
    h.publishedTime ? m("property", "article:published_time", h.publishedTime) : "",
    m("name", "twitter:card", "summary_large_image"),
    m("name", "twitter:title", h.title),
    m("name", "twitter:description", h.description),
    m("name", "twitter:image", h.image),
    m("name", "twitter:site", "@Ideovent_"),
    m("name", "twitter:creator", "@Ideovent_"),
    // "<" escaped so no string in the data can close the script element.
    `<script data-rh="true" type="application/ld+json">${h.jsonLd.replace(/</g, "\\u003c")}</script>`,
  ];
  return tags.filter(Boolean).map((t) => `    ${t}`).join("\n");
}

/** The built shell with one route's head and no-script summary in it. */
function applyHead(shell, h) {
  let html = shell
    // Idempotent: a second run over its own output replaces, never duplicates.
    .replace(/[ \t]*<noscript data-prerendered="true">[\s\S]*?<\/noscript>[ \t]*\r?\n?/g, "")
    .replace(/[ \t]*<(meta|link)\b[^>]*\bdata-rh="true"[^>]*>[ \t]*\r?\n?/gi, "")
    .replace(/[ \t]*<script\b[^>]*\bdata-rh="true"[^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi, "")
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${text(h.title)}</title>\n${headTags(h)}`);
  if (h.noscript) html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>\n    ${h.noscript}`);
  return html;
}

/** Paths from the sitemap this build just generated (public/ is copied into dist/). */
async function sitemapPaths() {
  const xml = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname.replace(/\/+$/, "") || "/");
}

await loadDotEnv();
const { mod, cleanup } = await loadModule();
try {
  const built = await readFile(path.join(DIST, "index.html"), "utf8");
  // Developer notes are for the repo, not for every visitor's first download.
  const shell = built.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\r?\n?/g, "").replace(/(\r?\n){3,}/g, "\n\n");

  const paths = await sitemapPaths();
  const problems = [];
  const seenTitle = new Map();
  const seenDesc = new Map();
  let written = 0;
  for (const route of paths) {
    const head = mod.headFor(route);
    if (!head) {
      problems.push(`no head for ${route} (in the sitemap, unknown to src/lib/seo/prerender.ts): left to the SPA shell`);
      continue;
    }
    if (head.title.length > 60) problems.push(`title over 60 (${head.title.length}) on ${route}: ${head.title}`);
    if (head.description.length > 155) problems.push(`description over 155 (${head.description.length}) on ${route}`);
    if (!head.description) problems.push(`empty description on ${route}`);
    if (seenTitle.has(head.title)) problems.push(`same title on ${route} and ${seenTitle.get(head.title)}`);
    if (seenDesc.has(head.description)) problems.push(`same description on ${route} and ${seenDesc.get(head.description)}`);
    seenTitle.set(head.title, route);
    seenDesc.set(head.description, route);
    if (route === "/") continue; // dist/index.html, written below as the shell
    const dir = path.join(DIST, ...route.split("/").filter(Boolean));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), applyHead(shell, head), "utf8");
    written++;
  }

  const home = mod.shellHead();
  await writeFile(path.join(DIST, "index.html"), applyHead(shell, home), "utf8");

  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  console.log(`prerender    ${written} route files + dist/index.html (shell, no canonical)  host ${mod.host}`);
  console.log(`  shell ${kb(Buffer.byteLength(built))} -> ${kb(Buffer.byteLength(applyHead(shell, home)))} (developer comments stripped)`);
  for (const p of problems) console.warn(`  WARN ${p}`);
} finally {
  await cleanup();
}
