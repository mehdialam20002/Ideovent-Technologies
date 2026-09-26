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
