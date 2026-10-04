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
 * /services/seo gets dist/services/seo/index.html, / gets dist/index.html and
 * everything else gets the fallback below. React then renders into #root
 * exactly as before.
 *
 * TWO FILES FOR "/" AND FOR EVERYTHING ELSE (2 Oct 2026). dist/index.html is the
 * homepage, with its own canonical, og:url, title and description in the static
 * HTML, because Google's JavaScript SEO guide says "the best way to set the
 * canonical URL is to use HTML". The SPA fallback, served for every address
 * WITHOUT a file of its own (pitch pages, demos, the admin, a mistyped URL, a
 * post added in /admin after the build), is a separate file, dist/spa-shell.html
 * (SHELL_FILE below). vercel.json's catch-all rewrite points at /spa-shell.html,
 * and api/share.js reads it for the link-preview cards. Before this,
 * dist/index.html was both, so the homepage itself had no canonical in its HTML.
 * Developer comments (11 KB of the 18.7 KB file) are stripped from both.
 *
 * THE SHELL IS NEUTRAL AND NOINDEX (3 Oct 2026). It used to keep the homepage's
 * title, description, robots "index, follow", JSON-LD and no-script summary, so
 * every unknown, mixed-case or not-yet-built address answered 200 with an
 * indexable copy of the homepage to any crawler that reads only the HTML (live
 * crawl of 2 Oct 2026, F1). Now its head is the firm's name, robots "noindex"
 * and the brand card, nothing else (src/lib/seo/prerender.ts, shellHead), all
 * data-rh so a page's own <Seo> or Helmet tags still replace it at runtime. The
 * build checks the shell below and fails if any of the homepage's head comes back.
 *
 * NO PUBLIC PAGE MAY BE SERVED THE SHELL, SO THE BUILD FAILS IF ONE WOULD BE
 * (3 Oct 2026). A URL in the sitemap with no head in src/lib/seo/prerender.ts, or
 * whose file did not come out with its own canonical and robots "index, follow",
 * stops the build here with the list, instead of the old warning: deployed, that
 * page would get the noindex shell and drop out of the index.
 *
 * EXCEPT WHAT /admin PUBLISHES: A SECOND SHELL WITHOUT NOINDEX (3 Oct 2026). A post,
 * project or service saved in /admin lives only in the store, and this script
 * reads seed.ts, so it never gets a file of its own, not at the next build either.
 * Google does not render a page whose HTML says noindex, so the shell above would
 * keep it out of the index for good. dist/spa-shell-cms.html (CMS_SHELL_FILE) is
 * the same neutral head with no robots tag at all, and vercel.json serves it for
 * /blog/<slug>, /work/<slug> and /services/<slug> (a well-formed lower-case slug)
 * that have no file. The page's <Seo> then says index, or noindex when the slug
 * is unknown, once React runs.
 *
 * AND THE PAGE ITSELF, RENDERED (3 Oct 2026, perf). Each sitemap page's file now
 * also carries its React page in #root: src/entry-server.tsx is built for Node
 * (vite's own SSR build, so every alias, define and plugin is the browser's) and
 * rendered at the page's address from the seed, and src/main.tsx hydrates it. A
 * phone used to paint nothing until ~165 KB of JavaScript had downloaded and run;
 * now the text paints with the HTML and the stylesheet. The two shells keep an
 * empty #root (their pages are rendered in the browser, as before). A page whose
 * render fails keeps an empty #root too, with a WARN below: it then works exactly
 * as before, only slower.
 */
import { build } from "esbuild";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, "..");
// PRERENDER_DIST: a build made with `vite build --outDir <dir>` elsewhere.
const DIST = process.env.PRERENDER_DIST ? path.resolve(process.env.PRERENDER_DIST) : path.join(SITE, "dist");
const ENTRY = path.join(SITE, "src", "lib", "seo", "prerender.ts");
/**
 * The SPA fallback's file name. These name it too and must change with it:
 * the catch-all rewrite in vercel.json, public/_redirects, api/share.js (SHELL_PATH),
 * scripts/sync-noindex-header.mjs (SPA_FALLBACKS), scripts/e2e-crm-host.mjs and
 * the 404.html step of .github/workflows/deploy.yml. Not exported: importing
 * this file runs the prerender.
 */
const SHELL_FILE = "spa-shell.html";
/** The shell without noindex, for a page /admin publishes (header; vercel.json names it). */
const CMS_SHELL_FILE = "spa-shell-cms.html";

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

/**
 * src/entry-server.tsx built for Node by vite itself (the project's vite.config.ts,
 * in the browser build's mode), so the render sees the same aliases, env and plugins
 * as the browser bundle it is hydrated by. Everything is bundled (ssr.noExternal), so the
 * output can live in a temp folder; vite's cache goes there too, never into
 * node_modules (a worktree's node_modules may be a link to another checkout).
 */
async function loadServerApp() {
  const dir = await mkdtemp(path.join(tmpdir(), "ideovent-ssr-"));
  try {
    return await buildServerApp(dir);
  } catch (e) {
    // A failed server build must not leave its 12 MB temp folder behind.
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
}

async function buildServerApp(dir) {
  // Production React for the render, the build the browser runs.
  process.env.NODE_ENV = "production";
  const vite = await import("vite");
  await vite.build({
    root: SITE,
    configFile: path.join(SITE, "vite.config.ts"),
    // The mode the browser bundle was just built in (`npm run build:dev` builds in development).
    mode: process.env.npm_lifecycle_event === "build:dev" ? "development" : "production",
    logLevel: "warn",
    cacheDir: path.join(dir, "vite-cache"),
    ssr: { noExternal: true },
    build: {
      ssr: path.join(SITE, "src", "entry-server.tsx"),
      outDir: path.join(dir, "out"),
      emptyOutDir: true,
      minify: false,
      sourcemap: false,
      copyPublicDir: false,
      reportCompressedSize: false,
    },
  });
  // The bundle is ES module code in .js files. Say so next to it: otherwise Node decides
  // from whatever package.json sits above the temp folder ("type": "commonjs" there, or a
  // Node without ESM syntax detection, fails the import and every #root stays empty).
  await writeFile(path.join(dir, "out", "package.json"), '{ "type": "module" }\n');
  const mod = await import(pathToFileURL(path.join(dir, "out", "entry-server.js")).href);
  return { app: mod, cleanupApp: () => rm(dir, { recursive: true, force: true }) };
}

/**
 * One page's app HTML, complete: onAllReady waits for every lazy page chunk, and
 * a chunk size above any page keeps each Suspense boundary inline (React would
 * otherwise stream a big boundary as a fallback plus a script that swaps it in).
 */
function renderApp(app, route) {
  return new Promise((resolve, reject) => {
    let html = "";
    const errors = [];
    const sink = new Writable({
      write(chunk, _enc, done) {
        html += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
        done();
      },
    });
    // The lazy page this route showed, for data-page on #root (src/main.tsx preloads it).
    // And the address it was rendered for, for data-path (main.tsx hydrates only there).
    sink.on("finish", () => (errors.length ? reject(errors[0]) : resolve({ html, page: app.takeRenderedPage(), path: route })));
    const timer = setTimeout(() => {
      abort();
      reject(new Error("render did not finish in 30 s"));
    }, 30000);
    const { pipe, abort } = app.renderToPipeableStream(app.serverApp(route), {
      progressiveChunkSize: Number.MAX_SAFE_INTEGER,
      onAllReady() {
        clearTimeout(timer);
        pipe(sink);
      },
      onShellError(e) {
        clearTimeout(timer);
        reject(e);
      },
      onError(e) {
        errors.push(e);
      },
    });
  });
}

/*
  THE DEMO PAGES' CHUNKS, PRELOADED FROM THE SHELL (3 Oct 2026, perf).

  A demo (/site/<slug>) is served the SPA shell and drawn in the browser from its
  record, through a chain of lazy chunks: the route, the multi-page shell, the
  dental chrome and the page. Each was only asked for once the one before had
  arrived and run: measured on a throttled phone profile, the route asked for the
  shell at 3.4 s and the page at 4.3 s, after the entry script was in at 2.3 s.
  The shell now carries a tiny script that, on a /site/ address only, adds
  modulepreload links for the route, the shell and the dental chrome, so they
  download beside the entry script. The file names come from vite's manifest
  (build.manifest in vite.config.ts), which is then deleted so it is never
  deployed. Nothing is preloaded anywhere else.
*/
const DEMO_CHAIN = ["src/pages/DemoSiteRoute.tsx", "src/pages/site/SiteShell.tsx", "src/pages/site/dental/shell/DentalShell.tsx"];
/*
  Not the dental home page's 16 chunks (measured, phone profile: preloading those too
  made React draw the whole demo in one 1.7 s task once everything was in, so nothing
  showed until 6.0 s, against 4.8 s before; the chrome first and the page after paints
  sooner). SiteShell.tsx still starts the page's chunk together with the chrome.
*/
const DEMO_HOME = [];
async function demoPreloads() {
  const file = path.join(DIST, ".vite", "manifest.json");
  let man;
  try {
    man = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return { early: "", late: "", note: "no vite manifest: the shell carries no demo preloads" };
  }
  const closure = (keys, seen = new Set()) => {
    for (const k of keys) {
      if (seen.has(k) || !man[k]) continue;
      seen.add(k);
      closure(man[k].imports || [], seen);
    }
    return seen;
  };
  // What the entry already loads (its static imports) needs no second preload.
  const entryKey = Object.keys(man).find((k) => man[k].isEntry && /index\.html$/.test(k));
  const have = closure(entryKey ? [entryKey] : []);
  // A module that shares its chunk with others has no key of its own: the chunk is then
  // listed under its file ("_SiteShell-<hash>.js"), which vite names after the module.
  const keyOf = (src) => {
    if (man[src]) return src;
    const base = path.basename(src).replace(/\.[jt]sx?$/, "");
    return Object.keys(man).find((k) => new RegExp(`^assets/${base}-[\\w-]+\\.js$`).test(man[k].file || "")) || null;
  };
  const missing = [...DEMO_CHAIN, ...DEMO_HOME].filter((k) => !keyOf(k));
  const pick = (srcs, skip) => {
    const js = [], css = [];
    const keys = srcs.map(keyOf).filter(Boolean);
    for (const k of closure(keys)) {
      if (have.has(k) || skip.has(k)) continue;
      js.push("/" + man[k].file);
    }
    // CSS in the order vite's chunk loader would add it: a chunk's imports' CSS before
    // its own, chunk after chunk along the chain (the cascade depends on that order).
    const seen = new Set();
    const visit = (k) => {
      if (seen.has(k) || !man[k]) return;
      seen.add(k);
      for (const i of man[k].imports || []) visit(i);
      if (!have.has(k) && !skip.has(k)) for (const c of man[k].css || []) css.push("/" + c);
    };
    keys.forEach(visit);
    return { js, css, keys: closure(keys) };
  };
  if (missing.length) {
    await rm(path.join(DIST, ".vite"), { recursive: true, force: true });
    return { early: "", late: "", note: `demo preloads skipped, not in the manifest: ${missing.join(", ")}` };
  }
  const chain = pick(DEMO_CHAIN, new Set());
  const home = DEMO_HOME.length ? pick(DEMO_HOME, chain.keys) : { js: [], css: [], keys: new Set() };
  await rm(path.join(DIST, ".vite"), { recursive: true, force: true });
  const j = (a) => JSON.stringify([...new Set(a)]);
  /*
    TWO SCRIPTS. The first, near the top of <head>, adds the module chunks as
    modulepreload (crossorigin, as vite's own preloads; fetchpriority low, so the entry
    script and the stylesheet still arrive first). It sits before the stylesheets
    because a script after a stylesheet waits for it (measured: the preloads then left
    only at 1.9 s on the phone profile).
    The second, at the end of <head>, adds the demo's CSS chunks as real stylesheets,
    after the site's own and in the order vite's chunk loader would add them, so the
    cascade is exactly what it was (measured: added from the first script they landed
    before the site's stylesheet, and the demo's hero differed at 1280 px). vite's
    loader, finding a stylesheet already there, does not fetch it again and wait for
    it before the chunk may run (a preload as=style was fetched a second time).
    The demo's content read itself still leaves from the entry script (publicRead.ts),
    which the shell's preconnect (vite.config.ts) has warmed: these scripts, like the
    rest of the build, make and name no content request (scripts/test-cms-scope.mjs).
  */
  const onDemo = `var p=location.pathname;if(!/^\\/site\\/[^/]+/.test(p))return;var home=/^\\/site\\/[^/]+\\/?$/.test(p);`;
  const early =
    `  <script>(function(){${onDemo}` +
    `function a(h){var l=document.createElement("link");l.rel="modulepreload";l.href=h;l.fetchPriority="low";l.crossOrigin="";document.head.appendChild(l)}` +
    `${j(chain.js)}.forEach(a);if(home)${j(home.js)}.forEach(a)})()</script>`;
  const late =
    `  <script>(function(){${onDemo}` +
    `function a(h){if(document.querySelector('link[href="'+h+'"]'))return;var l=document.createElement("link");l.rel="stylesheet";l.href=h;document.head.appendChild(l)}` +
    `${j(chain.css)}.forEach(a);if(home)${j(home.css)}.forEach(a)})()</script>`;
  return { early, late, note: `demo preloads in the shell: ${chain.js.length} chunks (+${chain.css.length} css) on /site/*, +${home.js.length} (+${home.css.length} css) on a demo's home` };
}

/** A #root this script filled (data-page and the <!--ssr--> markers), for a second run to empty. */
const PRERENDERED_ROOT = /<div id="root"[^>]*><!--ssr-->[\s\S]*<!--\/ssr--><\/div>/;

/*
  With JavaScript off, framer-motion's start state (style="opacity:0;...", written
  by the render for content that rises into view) would hide that content for good.
  A <noscript> style in the head shows it; with JavaScript on it is never applied.
*/
const NOSCRIPT_MOTION =
  '<noscript data-prerendered-app="true"><style>#root [style*="opacity:0"]{opacity:1!important;transform:none!important}</style></noscript>';

/*
  THE CRM'S HOST IS SERVED THESE SAME FILES (4 Oct 2026). crm.ideovent.in is this
  deployment too, so its "/" is dist/index.html, the site's home page, and it renders
  the CRM instead: src/main.tsx clears #root there and renders with createRoot, as
  before. Until that script has run, this keeps the site's page off the CRM's screen
  (blank there before pages were prerendered, and blank still). Right after the
  viewport tag, ahead of the stylesheets, so it has run before anything can paint.
*/
const CRM_HOST_GUARD =
  '<script data-prerendered-app="true">/^crm\\./i.test(location.hostname)&&document.documentElement.setAttribute("data-no-ssr","")</script>' +
  '<style data-prerendered-app="true">[data-no-ssr] #root{display:none}</style>';

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
    // An /og/ card is always 1200x630; another picture only when its size is on record (a project's shareImage).
    h.imageIsCard ? m("property", "og:image:width", "1200") : h.imageWidth && h.imageHeight ? m("property", "og:image:width", String(h.imageWidth)) : "",
    h.imageIsCard ? m("property", "og:image:height", "630") : h.imageWidth && h.imageHeight ? m("property", "og:image:height", String(h.imageHeight)) : "",
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

/**
 * The built page with every head tag Helmet owns (data-rh) and the no-script
 * summary taken out. Idempotent: a second run over its own output replaces,
 * never duplicates.
 */
function stripHead(shell) {
  return shell
    .replace(/[ \t]*<(noscript|script|style) data-prerendered-app="true">[\s\S]*?<\/\1>[ \t]*\r?\n?/g, "")
    .replace(PRERENDERED_ROOT, '<div id="root"></div>')
    .replace(/[ \t]*<noscript data-prerendered="true">[\s\S]*?<\/noscript>[ \t]*\r?\n?/g, "")
    .replace(/[ \t]*<(meta|link)\b[^>]*\bdata-rh="true"[^>]*>[ \t]*\r?\n?/gi, "")
    .replace(/[ \t]*<script\b[^>]*\bdata-rh="true"[^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi, "");
}

/**
 * The built shell with one route's head, no-script summary and, when it rendered,
 * the page itself in #root (between <!--ssr--> markers, which hydration skips and
 * stripHead finds again).
 */
function applyHead(shell, h, appHtml) {
  let html = stripHead(shell).replace(/<title>[\s\S]*?<\/title>/i, `<title>${text(h.title)}</title>\n${headTags(h)}`);
  if (h.noscript) html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>\n    ${h.noscript}`);
  if (appHtml?.html) {
    // Functions, not strings: the page's text may hold "$" (a price), which a
    // replacement string would read as a pattern.
    const pageAttr = appHtml.page ? ` data-page="${attr(appHtml.page)}"` : "";
    // data-path: the address rendered, the only one src/main.tsx hydrates this HTML at.
    const pathAttr = ` data-path="${attr(appHtml.path)}"`;
    html = html
      .replace(/<div id="root"><\/div>/, () => `<div id="root"${pageAttr}${pathAttr}><!--ssr-->${appHtml.html}<!--/ssr--></div>`)
      .replace(/(<meta name="viewport"[^>]*>)/i, (m) => `${m}\n    ${CRM_HOST_GUARD}`)
      .replace(/<\/head>/i, () => `  ${NOSCRIPT_MOTION}\n  </head>`);
  }
  return html;
}

/**
 * The SPA fallback's head (3 Oct 2026): the firm's name, robots "noindex" and the
 * brand card. No description, canonical, og:url, JSON-LD or summary: those
 * belong to one page, and this file is served for every address that has no page
 * of its own. data-rh, so a pitch page's or a demo's own Helmet tags replace them.
 */
function shellTags(s) {
  const m = (k, name, content) => `<meta data-rh="true" ${k}="${name}" content="${attr(content)}" />`;
  return [
    // No robots tag at all on the CMS shell (s.robots empty): see the header.
    s.robots ? m("name", "robots", s.robots) : "",
    m("property", "og:site_name", s.siteName),
    m("property", "og:locale", "en_IN"),
    m("property", "og:type", "website"),
    m("property", "og:title", s.title),
    m("property", "og:image", s.image),
    m("property", "og:image:width", "1200"),
    m("property", "og:image:height", "630"),
    m("property", "og:image:alt", s.imageAlt),
    m("name", "twitter:card", "summary_large_image"),
    m("name", "twitter:site", s.twitterHandle),
    m("name", "twitter:title", s.title),
    m("name", "twitter:image", s.image),
  ].filter(Boolean).map((t) => `    ${t}`).join("\n");
}

function applyShellHead(shell, s) {
  return stripHead(shell).replace(/<title>[\s\S]*?<\/title>/i, `<title>${text(s.title)}</title>\n${shellTags(s)}`);
}

/** Paths from the sitemap this build just generated (public/ is copied into dist/). */
async function sitemapPaths() {
  const xml = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname.replace(/\/+$/, "") || "/");
}

await loadDotEnv();
const { mod, cleanup } = await loadModule();
// A server build that fails leaves every #root empty (each page rendered in the browser, as
// before) and says so below; it never stops the deploy on its own.
let serverBuildError = "";
const { app, cleanupApp } = await loadServerApp().catch((e) => {
  serverBuildError = String(e?.message || e).split("\n")[0];
  return { app: null, cleanupApp: async () => {} };
});
try {
  // A second run over its own output finds the rendered home page here: empty its #root first.
  const built = (await readFile(path.join(DIST, "index.html"), "utf8")).replace(PRERENDERED_ROOT, '<div id="root"></div>');
  // Developer notes are for the repo, not for every visitor's first download.
  const shell = built.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\r?\n?/g, "").replace(/(\r?\n){3,}/g, "\n\n");
  /** The page itself for #root ({ html, page }), or null (empty #root, as before) when its render fails. */
  const appFailures = [];
  let appBytes = 0;
  const appHtmlFor = async (route) => {
    if (!app) {
      appFailures.push(`${route}: the server build failed (${serverBuildError})`);
      return null;
    }
    try {
      const rendered = await renderApp(app, route);
      appBytes += Buffer.byteLength(rendered.html);
      return rendered;
    } catch (e) {
      appFailures.push(`${route}: ${String(e?.message || e).split("\n")[0]}`);
      return null;
    }
  };

  const paths = await sitemapPaths();
  const problems = [];
  // A promise that page code leaves unhandled while it renders would end this script
  // (Node's default) and the deploy with it: a WARN instead, as for a render that fails.
  // React has written the page by then; nothing here is left unawaited.
  process.on("unhandledRejection", (e) => problems.push(`a promise was left unhandled during the page renders: ${String(e?.message || e).split("\n")[0]}`));
  // Sitemap URLs that would be served the noindex shell. Fatal (see the header).
  const unserved = [];
  const seenTitle = new Map();
  const seenDesc = new Map();
  let written = 0;
  for (const route of paths) {
    const head = mod.headFor(route);
    if (!head) {
      unserved.push(`${route}: in the sitemap, but src/lib/seo/prerender.ts (headFor) has no head for it`);
      continue;
    }
    if (head.title.length > 60) problems.push(`title over 60 (${head.title.length}) on ${route}: ${head.title}`);
    if (head.description.length > 155) problems.push(`description over 155 (${head.description.length}) on ${route}`);
    if (!head.description) problems.push(`empty description on ${route}`);
    if (seenTitle.has(head.title)) problems.push(`same title on ${route} and ${seenTitle.get(head.title)}`);
    if (seenDesc.has(head.description)) problems.push(`same description on ${route} and ${seenDesc.get(head.description)}`);
    seenTitle.set(head.title, route);
    seenDesc.set(head.description, route);
    // "/" lands on dist/index.html itself: the homepage, canonical included.
    const dir = path.join(DIST, ...route.split("/").filter(Boolean));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), applyHead(shell, head, await appHtmlFor(route)), "utf8");
    written++;
  }
  // The homepage is always in the sitemap; if it ever is not, it still gets its head.
  if (!paths.includes("/")) {
    problems.push("/ is not in the sitemap: dist/index.html written from src/lib/seo/prerender.ts anyway");
    await writeFile(path.join(DIST, "index.html"), applyHead(shell, mod.headFor("/"), await appHtmlFor("/")), "utf8");
    written++;
  }

  // The SPA fallback: neutral and noindex (shellHead in src/lib/seo/prerender.ts),
  // with the demo pages' chunk preloads (demoPreloads below).
  const shellSpec = mod.shellHead();
  const demo = await demoPreloads();
  // The chunk preloads before the stylesheets, the demo's CSS after them (demoPreloads).
  const fallback = applyShellHead(shell, shellSpec)
    .replace(/(<meta name="viewport"[^>]*>)/i, (m) => (demo.early ? `${m}\n${demo.early}` : m))
    .replace(/<\/head>/i, (m) => (demo.late ? `${demo.late}\n  ${m}` : m));
  await writeFile(path.join(DIST, SHELL_FILE), fallback, "utf8");
  // The same head with no robots tag, for what /admin publishes (see the header).
  const cmsFallback = applyShellHead(shell, { ...shellSpec, robots: "" });
  await writeFile(path.join(DIST, CMS_SHELL_FILE), cmsFallback, "utf8");

  // Prove all of it, every build.
  const canonicals = (html) => [...html.matchAll(/<link\b[^>]*\brel="canonical"[^>]*>/gi)].map((m) => (m[0].match(/href="([^"]*)"/) || [])[1]);
  const robotsOf = (html) => [...html.matchAll(/<meta\b[^>]*\bname="robots"[^>]*>/gi)].map((m) => (m[0].match(/content="([^"]*)"/) || [])[1]);
  const homeHtml = await readFile(path.join(DIST, "index.html"), "utf8");
  const homeCanon = canonicals(homeHtml);
  if (homeCanon.length !== 1 || homeCanon[0] !== `${mod.host}/`) {
    throw new Error(`dist/index.html must carry exactly one canonical, ${mod.host}/; found ${JSON.stringify(homeCanon)}`);
  }

  // 1. Every sitemap URL has a file of its own, read back from disk, with its own
  //    canonical and robots "index". Anything else would be served the noindex shell.
  for (const route of paths) {
    if (!mod.headFor(route)) continue; // listed above
    const file = path.join(DIST, ...route.split("/").filter(Boolean), "index.html");
    let html;
    try {
      html = await readFile(file, "utf8");
    } catch {
      unserved.push(`${route}: no file at dist/${path.relative(DIST, file).replace(/\\/g, "/")}`);
      continue;
    }
    const canon = canonicals(html);
    const robots = robotsOf(html);
    if (canon.length !== 1 || canon[0] !== `${mod.host}${route}`) unserved.push(`${route}: canonical ${JSON.stringify(canon)}, not ${mod.host}${route}`);
    if (robots.length !== 1 || !/^index\b/.test(robots[0] || "")) unserved.push(`${route}: robots ${JSON.stringify(robots)}, not one "index, follow"`);
  }
  if (unserved.length) {
    throw new Error(
      `${unserved.length} sitemap URL(s) lack a file of their own with their own canonical and robots "index, follow"; ` +
        `without one Vercel serves dist/${SHELL_FILE}, which is noindex:\n  ${unserved.join("\n  ")}\n` +
        "  Give each a head in src/lib/seo/prerender.ts (headFor), or take it out of the sitemap.",
    );
  }

  // 2. Both shells are neutral: nothing of the homepage (or of any page) in them.
  //    The fallback carries one robots noindex; the CMS shell none at all.
  for (const [file, html, noindex] of [[SHELL_FILE, fallback, true], [CMS_SHELL_FILE, cmsFallback, false]]) {
    const carries = [];
    if (canonicals(html).length) carries.push("a canonical");
    if (/\bproperty="og:url"/.test(html)) carries.push("an og:url");
    if (/<meta\b[^>]*\bname="description"/i.test(html)) carries.push("a meta description");
    if (/\b(property="og:description"|name="twitter:description")/.test(html)) carries.push("a card description");
    if (/application\/ld\+json/i.test(html)) carries.push("JSON-LD");
    if (/<noscript data-prerendered/i.test(html)) carries.push("a no-script summary");
    const shellRobots = robotsOf(html);
    if (noindex ? shellRobots.length !== 1 || !/\bnoindex\b/.test(shellRobots[0] || "") : shellRobots.length !== 0) {
      carries.push(`robots ${JSON.stringify(shellRobots)}, not ${noindex ? "one noindex" : "none"}`);
    }
    const shellTitle = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    if (shellTitle !== text(shellSpec.title)) carries.push(`the title ${JSON.stringify(shellTitle)}`);
    if (!/<script\b[^>]*\btype="module"[^>]*\bsrc="[^"]+"/i.test(html) || !/<div id="root"><\/div>/.test(html)) {
      carries.push("no module script or no #root: the app would not boot");
    }
    if (carries.length) {
      throw new Error(`dist/${file} is served for addresses without a file of their own and must be neutral${noindex ? " and noindex" : ", with no robots tag"}; it has ${carries.join(", ")}`);
    }
  }

  // 3. Every file vercel.json rewrites to is in this build (a renamed shell would
  //    otherwise answer 404 for every page it serves).
  const vercel = JSON.parse(await readFile(path.join(SITE, "vercel.json"), "utf8"));
  const missingTargets = [];
  for (const r of vercel.rewrites || []) {
    const dest = typeof r.destination === "string" ? r.destination.split("?")[0] : "";
    if (!/^\/[^/]+\.html$/.test(dest)) continue;
    try { await readFile(path.join(DIST, dest.slice(1))); } catch { missingTargets.push(`${r.source} -> ${dest}`); }
  }
  if (missingTargets.length) throw new Error(`vercel.json rewrites to a file this build did not write:\n  ${missingTargets.join("\n  ")}`);

  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  console.log(`prerender    ${written} route files incl. dist/index.html (canonical ${homeCanon[0]})  host ${mod.host}`);
  console.log(`  all ${paths.length} sitemap URLs have a file of their own, with their own canonical and robots index`);
  console.log(`  dist/${SHELL_FILE}: the SPA fallback, neutral ("${shellSpec.title}", robots ${shellSpec.robots}, no canonical, description or JSON-LD), ${kb(Buffer.byteLength(built))} -> ${kb(Buffer.byteLength(fallback))}`);
  console.log(`  dist/${CMS_SHELL_FILE}: the same with no robots tag, for /blog, /work and /services pages /admin publishes, ${kb(Buffer.byteLength(cmsFallback))}`);
  console.log(`  the page itself in #root (hydrated by src/main.tsx): ${written - appFailures.length} of ${written} files, ${kb(appBytes)} of HTML in all`);
  // The deploy never stops for a page that could not be rendered (it is rendered in the
  // browser, as before). The gate does (SSR_REQUIRED=1, scripts/gate.mjs): otherwise a
  // broken server build would ship every page slower while every check stayed green.
  if (process.env.SSR_REQUIRED === "1" && appFailures.length) {
    console.error(`FAIL  SSR_REQUIRED: ${appFailures.length} of ${written} pages have no prerendered page:\n    ${appFailures.join("\n    ")}`);
    process.exitCode = 1;
  }
  console.log(`  ${demo.note}`);
  for (const f of appFailures) console.warn(`  WARN no prerendered page, empty #root (rendered in the browser as before): ${f}`);
  for (const p of problems) console.warn(`  WARN ${p}`);
} finally {
  await cleanup();
  await cleanupApp();
}
