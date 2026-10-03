# vercel.json, why it looks like this

JSON has no comments. An earlier version of this file carried `_comment` and
`_rewrites_comment` arrays to explain itself. Vercel validates `vercel.json`
against a strict schema and **rejects any property it does not recognise**, so
that file could never deploy:

    Error: Invalid vercel.json - should NOT have additional property `_comment`

The explanations live here instead.

## The rewrite

    { "source": "/(.*)", "destination": "/index.html" }

That is the whole SPA fallback, and it is deliberately this plain.

A previous version tried to exclude static paths with a negative lookahead:

    /((?!assets/|blog-covers/|sitemap\.xml|...).*)

Two things were wrong with it.

1. **It does not work.** Vercel's `source` is path-to-regexp, not raw regex. A
   bare `(?!...)` at the start of the path is not matched, so the rewrite never
   fired and **every route except `/` returned 404**. Measured on a real
   deployment: `/about`, `/work`, `/pricing`, `/verify/<id>` were all 404.

2. **It was unnecessary.** Vercel checks the filesystem *before* applying
   rewrites, so `/sitemap.xml`, `/robots.txt`, `/work/gym-map.webp` and every
   other real file in `public/` are served as themselves regardless. Those four
   were returning 200 with correct content types even while the routes were
   broken, which is the proof.

The exclusion list also contained a typo that made it wrong even on its own
terms: `(?: webp|png|...)` with a space, matching " webp" rather than "webp".

## cleanUrls

`"cleanUrls": true` strips `.html` extensions. Harmless for a single-page app,
kept because it also normalises any future static page.

## Headers

HSTS is set with `includeSubDomains`. Do not enable `preload` until the apex and
`www` both resolve over HTTPS and you are certain, since preload is hard to undo.

## cleanUrls is REMOVED, and must stay removed

`"cleanUrls": true` was breaking every route on a real deployment, and it did so
in a way that looks like the rewrite failing rather than the flag.

cleanUrls makes Vercel emit this route, ahead of everything else:

    { "src": "^/(?:(.+)/)?index(?:\.html)?/?$", "headers": { "Location": "/$1" }, "status": 308 }

That redirects `/index.html` to `/`. The SPA fallback's *destination* is
`/index.html`, so the fallback resolved onto a path cleanUrls immediately sent
somewhere else, and the request ended as `X-Vercel-Error: NOT_FOUND`.

The giveaway in the response headers was that `/about` came back 404 while
carrying `Cache-Control: public, max-age=0, must-revalidate`, which is the header
rule scoped to `/index.html`. The rewrite *was* matching; its destination was not
survivable.

cleanUrls exists to strip `.html` from static multi-page sites. This is a single
page app: there is one HTML file and no extension for a visitor to ever see.

## Per-route HTML files and the redirects added on 1 Oct 2026 (SEO build)

**Prerendered heads.** `npm run build` now ends with `node scripts/prerender-heads.mjs`,
which writes `dist/<route>/index.html` for every URL in the sitemap: the built
`index.html` with that page's title, description, canonical, Open Graph, Twitter and
JSON-LD tags (all `data-rh="true"`, adopted by react-helmet-async on load) and a
`<noscript>` copy of its h1 and text. Vercel serves a real file before it applies the
SPA rewrite, so `/services/seo` gets its own head in the first HTML, which is what
WhatsApp, LinkedIn, X, Bing and AI crawlers read. `dist/index.html` stays the shell
for every other address and carries **no canonical and no og:url** (see the comment at
the top of index.html). Do not turn `cleanUrls` on for this: see above.

Check it on the first preview deployment:

    curl -s https://<preview>/services/seo | grep -o '<title>[^<]*</title>\|rel="canonical" href="[^"]*"'

It must print the SEO page's title and `https://www.ideovent.in/services/seo`. If it
prints the homepage title and no canonical, Vercel did not map `/services/seo` to
`services/seo/index.html`; nothing breaks (the page is then exactly what it was before),
but tell the SEO owner.

**Redirects.**
- `ideovent.vercel.app/*` → `https://www.ideovent.in/*` (308, host-scoped, first in the
  list). The duplicate host served the whole site; its canonical already pointed at www.
  Preview deployments keep their own `*.vercel.app` names and are not affected. Checked
  before adding: www resolved to Vercel at 8.8.8.8, 1.1.1.1 and the local resolver.
- `/services/seo-digital-marketing` → `/services/seo` (the SEO service moved).
- `/blogs/1` … `/blogs/9` → `/blog/<slug>`: the old site's post addresses.

**Image caching.** `/work`, `/blog-covers`, `/og` and `/icons` answer
`Cache-Control: public, max-age=86400, stale-while-revalidate=604800` instead of
revalidating on every view. Give a changed image a new file name.

## The first message's picture pages, /w/ (1 Oct 2026)

`public/w/dental/index.html`, `public/w/school/index.html` and `public/w/coaching/index.html`,
with `public/w/dental.jpg`, `school.jpg` and `coaching.jpg` beside them, are plain static files.
A first WhatsApp to a clinic, school or coaching institute carries the link to its kind's page
(`src/lib/outreach/preview.ts`), and WhatsApp draws the page's `og:image` as the message's
picture card. They need nothing from this file to be served: Vercel serves a real file before it
applies a rewrite, so `/w/dental` gets `w/dental/index.html` exactly as `/services/seo` gets its
prerendered file, and none of the rewrites can reach them anyway (the scraper rewrites match
`/site/...`, `/pitch/...` or one bare segment).

What is here for them: `"w"` is in the reserved segments of the bare-slug rules, so no pitch
slug can take `/w`, and `/w/(.*)` sends `X-Robots-Tag: noindex, nofollow` (the pages also carry
a robots meta tag). Both are written and checked by `scripts/sync-noindex-header.mjs`, like the
CRM host's rules. robots.txt does not disallow `/w/`: a crawler has to fetch a page to read its
noindex, and the link scrapers must reach it.

The pages' `og:image` is the absolute `https://www.ideovent.in/w/<kind>.jpg`, with its real width
and height; a WhatsApp card wants a JPEG of at most 300 KB, so a new picture keeps to that, and the
page's `og:image:width` and `og:image:height` change with it. `scripts/test-outreach-engine.mjs`
checks the tags, the size and the reservation. Check a deploy with:

    curl -s https://www.ideovent.in/w/dental | grep -o '<meta property="og:image" content="[^"]*"'

## The SPA fallback is /spa-shell.html, and / has its own canonical (2 Oct 2026)

Until 2 Oct 2026 `dist/index.html` was two things at once: the homepage, and the file the
catch-all rewrite served for every address without a file of its own. It could not carry a
canonical (a pitch page, a demo or a mistyped URL would have claimed to be the homepage), so
the homepage was the one public page with no canonical in its HTML. Google's JavaScript SEO
guide: "The best way to set the canonical URL is to use HTML".

Now `scripts/prerender-heads.mjs` writes two files:

- `dist/index.html`: the homepage, with its canonical (`https://www.ideovent.in/`), og:url,
  title, description, JSON-LD and no-script text. Vercel serves it for `/` as a real file.
- `dist/spa-shell.html`: the fallback, with the homepage's title and description but **no
  canonical and no og:url**. The catch-all rewrite `/((?!assets/).*)` now points at
  `/spa-shell.html`; `<Seo>` sets the canonical at runtime on the pages it serves.
  (Since 3 Oct 2026 the shell is a neutral, noindex page and the catch-all leaves file
  names alone: see the last section.)

The build fails if `/` does not carry exactly one canonical or if the shell carries one. Things
that name the shell and change with it: `api/share.js` (`SHELL_PATH`, the preview cards for
demos and pitches; it also strips any canonical it is handed), `scripts/sync-noindex-header.mjs`,
`scripts/e2e-crm-host.mjs`, `public/_redirects` (Netlify) and the manual GitHub Pages workflow.
On crm.ideovent.in, `/` also gets `dist/index.html`; that host is noindex on every path, so the
homepage canonical there changes nothing. Check a deploy with:

    curl -s https://www.ideovent.in/ | grep -o 'rel="canonical" href="[^"]*"'
    curl -s https://www.ideovent.in/any-missing-page | grep -c 'rel="canonical"'

The first must print `https://www.ideovent.in/`, the second `0`.

## IndexNow (2 Oct 2026)

`public/<key>.txt` is the IndexNow key file: its name and its content are the key, and Vercel
serves it as a real file, so no rule here touches it (a name with a dot never matches the
bare-slug rules). Bing, Yandex, Seznam, Naver and Yep read it to check that a submission is
ours. `node scripts/indexnow.mjs` submits the sitemap's changed URLs BY HAND after a deploy;
it never runs during a build. Usage is at the top of that script.

## 3 Oct 2026: a neutral shell, the alias's root, trailing slashes, missing files

From the live crawl of 2 Oct 2026. Each rule was compiled with Vercel's own
`@vercel/routing-utils` (6.6.0) and run against the built `dist/` before the release.

**The shell is neutral and noindex.** `dist/spa-shell.html` kept the homepage's title,
description, robots `index, follow`, JSON-LD and no-script text, so every address
without a file of its own (an unknown `/blog/...`, `/Websites/Dental-Clinic`, the draft
policies, a post published in /admin) answered 200 with an
indexable copy of the homepage to any crawler that reads only the HTML. The shell's head
is now the firm's name, `robots: noindex` and the brand card; `api/share.js` writes or
inserts every tag a demo's or a pitch's card needs. No public page can be served it:
`scripts/prerender-heads.mjs` fails the build when a sitemap URL has no file of its own
with its own canonical. Check a deploy with:

    curl -s https://www.ideovent.in/no-such-section/no-such-page | grep -o '<title>[^<]*</title>\|name="robots" content="[^"]*"'

It must print `<title>Ideovent Technologies</title>` and `content="noindex"`.

**What /admin publishes gets a shell without noindex.** A post, project or service saved
in /admin lives only in the store: the sitemap and `prerender-heads.mjs` read `seed.ts`, so
it never gets a file of its own, at the next build or any later one. Google does not render
a page whose HTML says noindex, so the noindex shell would have kept every such page out of
the index for good. The rewrite `/(blog|work|services)/([a-z0-9]+(?:-[a-z0-9]+)*)` (a
well-formed lower-case slug, the store's own rule in `src/lib/slug.ts`), placed just before
the catch-all, serves `dist/spa-shell-cms.html`: the same neutral head with no robots tag.
The page's `<Seo>` then says index, or noindex for an unknown slug ("Post not found",
"Project not found", "Service not found"), once React runs. A file of the build is served
before any rewrite, so the 24 prerendered pages under those three paths are untouched; a
mixed-case or dotted slug still gets the noindex shell. The price, accepted on purpose: an
unknown well-formed slug under those three paths answers raw HTML with no robots tag, a
thin page with the firm's name as its title and no description, canonical or JSON-LD (not
a copy of the homepage any more). Google renders it and gets noindex; only a crawler that
never runs JavaScript sees the thin page, and the site links to no such address. Telling
the two apart in the raw HTML would take a function that asks the store on every request.
Check after a deploy:

    curl -s https://www.ideovent.in/blog/no-such-post | grep -c 'name="robots"'

It must print `0` (the noindex shell would print `1`).

**`ideovent.vercel.app/` itself.** `"/:path*"` never matches the bare `/`: Vercel compiles
`source` with path-to-regexp in strict mode, where the `/` before `:path*` sits inside the
optional group (`^(?:/(...))?$`), so the root of the old alias answered 200 with the
homepage. It has its own rule, second among the redirects: `"/"` on that host, 308, to
`https://www.ideovent.in/`.

**Trailing slashes: one redirect, for every path but `/api/`.** The third redirect, right
after the two alias rules, is

    { "source": "/:path((?!api/).+)/", "destination": "/:path", "permanent": true }

A path that ends in `/` gets a 308 to the same path without it. Compiled, it is one route,
`^(?:/((?!api/).+))/$` to `/$1`: the route Vercel's `"trailingSlash": false` compiles to
(`^/(.*)/$` to `/$1`, vercel.com/docs/project-configuration/vercel-json#trailingslash),
except that it leaves `/api/` alone. It has no host condition, so it runs on every host,
ahead of the other redirects, the headers and the rewrites:

- `/` itself never matches (the pattern needs a character before the last slash).
- `/websites/` goes to `/websites` in one hop; a retired address's slash form in two
  (`/blogs/1/` to `/blogs/1` to `/services/seo`), where it used to answer 200 with the shell.
- The query string is kept, as on every Vercel redirect (the alias redirect keeps
  `?utm_source=...` live).
- `crm.ideovent.in/leads/` goes to `/leads`, the same screen. `/robots.txt` is unaffected.
- `/api/*` is left out on purpose. Production runs the function for `/api/x/` as for
  `/api/x`, and it still does: a webhook sender that does not follow redirects keeps
  working even if its URL was pasted with a slash. (`"trailingSlash": false`, tried first,
  would have answered those with a 308 before the function. Our own calls and the Razorpay
  webhook URL that /admin/payments shows, `/api/razorpay/webhook`, carry no slash anyway.)
- How files are served does not change: no `trailingSlash` or `cleanUrls` flag is set, so
  `/<route>` is answered by the prerendered `dist/<route>/index.html` exactly as in
  production today; only `/<route>/` now redirects to it, so a page has one address.
- The scraper rewrites (`/site/`, `/pitch/`, the bare slug) see the slashless path.
- On the old alias a slash form takes two hops (to the slashless path, then to www). The
  alias rules come first but cannot match a path that ends in `/`: a `/:path*` segment is
  never empty.

Check after a deploy: `curl -sI https://www.ideovent.in/websites/` is a 308 to `/websites`,
and `curl -s -o /dev/null -w '%{http_code}' https://www.ideovent.in/api/razorpay/webhook/`
prints `405` (the function's own answer to a GET), not `308`. To undo, delete the rule.

**The catch-all leaves file names alone.** Its source is now

    /((?!assets/)(?!.*\.(?:png|jpe?g|gif|webp|avif|svg|ico|txt|xml|json|webmanifest|js|mjs|css|map|woff2?|ttf|otf|pdf|mp4|webm|html?)$).*)

A path that ends in one of those file types is not rewritten, so a missing
`/og/x.png` or `/blog-covers/x.jpg` gets Vercel's own 404 instead of 200 with the shell,
and a broken image path shows up in a status check. Every real file is served before any
rewrite, so nothing in `public/` changes. A list of file types, not "any dot": a demo's
course slug or a post's slug is typed in /admin and may carry one (`b.tech`), and those
stay on the SPA. No `public/404.html`: Vercel's NOT_FOUND page already answers 404. The
new lookahead sits inside the group beside `(?!assets/)`, the form the live catch-all
already uses, and routing-utils compiles it unchanged.
