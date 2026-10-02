/**
 * The link preview card for a demo site or a pitch page.
 *
 * THE PROBLEM THIS SOLVES
 *
 * Mehdi sends a school director the link to their own demo and writes "dekhiye,
 * aapke liye ye website banayi hai". WhatsApp, Facebook, LinkedIn, Telegram and
 * Slack all render a preview card before the director taps anything, and none of
 * them runs JavaScript. This is a Vite SPA: react-helmet-async sets the right
 * tags at runtime, but a scraper only ever sees the fallback tags baked into
 * index.html, which belong to Ideovent. Measured on the live site, 25 September
 * 2026, with JavaScript disabled, on all three of /site/example-school-demo,
 * /site/example-coaching-demo and /example-public-school:
 *
 *   card title: Ideovent Technologies. Web & Software Studio in Saket, New Delhi
 *   card text : Websites, web apps, custom SaaS and mobile apps, built in Saket...
 *
 * So the first thing the director sees is a web agency advertising itself. The
 * "I built this for you" framing is gone before the page has loaded.
 *
 * WHY THE SLUG IS ENOUGH, AND NO DATABASE IS NEEDED
 *
 * The slug is generated from the institute's own name, so /site/st-xaviers-high-
 * school carries "St Xaviers High School" in the URL. That means this works for a
 * record Mehdi typed into the admin five minutes ago and never committed, which
 * is the case that matters and the one a build-time prerender could never cover.
 * Punctuation does not survive slugification, so the apostrophe in "Xavier's" is
 * lost. Their name spelled slightly plainly is still their name; Ideovent's name
 * is not.
 *
 * WHY THE CARD STILL SAYS IT IS A DEMONSTRATION
 *
 * The description is not a sales line. A demo carries the marker on the page
 * itself, and a card that read "St Xaviers High School: admissions and courses"
 * would present a demonstration as their live site to everyone the link is ever
 * forwarded to. The card says what the page says.
 *
 * WHY ONLY SCRAPERS REACH THIS
 *
 * vercel.json routes here only on a scraper user agent. A person gets the
 * ordinary SPA, untouched, and Helmet sets the real per-record tags once React
 * mounts. If this function ever fails, a scraper gets a plain card and a person
 * notices nothing.
 */
export const config = { runtime: "edge" };

/** The SPA fallback the build writes (scripts/prerender-heads.mjs, SHELL_FILE). */
const SHELL_PATH = "/spa-shell.html";

const SMALL_WORDS =new Set(["of", "and", "the", "for", "in", "at", "on", "de", "la"]);

/** "st-xaviers-high-school" -> "St Xaviers High School" */
function titleFromSlug(slug) {
  const words = String(slug || "")
    .replace(/[^a-z0-9-]/gi, "")
    .split("-")
    .filter(Boolean);
  if (!words.length) return null;
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      // Keep an all-caps acronym in the slug readable: "dps" stays "Dps", which
      // is wrong, but "DPS" cannot be recovered from a lower-case slug and
      // guessing which three-letter words are acronyms would be worse.
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Escape for an HTML attribute. The slug is user controlled, so this is not optional. */
function attr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Undo attr(): a value read back out of the document, ready to be written again. */
function unattr(s) {
  return String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Replace a meta tag's content, or insert the tag if the document does not carry
 * it. Matches across newlines, because index.html writes its longer meta tags
 * over several lines and a single-line pattern would silently match nothing.
 */
function setMeta(html, kind, name, value) {
  const attrName = kind === "property" ? "property" : "name";
  const re = new RegExp(`(<meta[^>]*\\b${attrName}=["']${name}["'][^>]*\\bcontent=["'])([^"']*)(["'])`, "is");
  if (re.test(html)) return html.replace(re, `$1${attr(value)}$3`);
  const reReversed = new RegExp(`(<meta[^>]*\\bcontent=["'])([^"']*)(["'][^>]*\\b${attrName}=["']${name}["'])`, "is");
  if (reReversed.test(html)) return html.replace(reReversed, `$1${attr(value)}$3`);
  return html.replace(/<\/head>/i, `  <meta ${attrName}="${name}" content="${attr(value)}" />\n</head>`);
}

/** A meta tag's content as written in the document (still escaped), or null when it has none. */
function getMeta(html, kind, name) {
  const attrName = kind === "property" ? "property" : "name";
  const m =
    new RegExp(`<meta[^>]*\\b${attrName}=["']${name}["'][^>]*\\bcontent=["']([^"']*)["']`, "is").exec(html) ||
    new RegExp(`<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\b${attrName}=["']${name}["']`, "is").exec(html);
  return m ? m[1] : null;
}

/** Insert a meta tag the document lacks; one it already carries is left as it is. */
function ensureMeta(html, kind, name, value) {
  return getMeta(html, kind, name) === null ? setMeta(html, kind, name, value) : html;
}

/** The brand card, for a shell that carries no picture at all. */
const BRAND = "Ideovent Technologies";
const BRAND_CARD_ALT = "Ideovent Technologies, the iV monogram and wordmark on a navy card";

export default async function handler(request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "pitch" ? "pitch" : "site";

  /*
   * Sanitise ONCE, here, and use only the sanitised value below.
   *
   * titleFromSlug() strips everything outside [a-z0-9-] already, so the name was
   * never the risk. og:url was: it was built from the raw parameter and only the
   * attribute escaping downstream kept it inert. Escaping is the last line, not
   * the only one, and a slug that has survived one is easier to reason about than
   * one that is trusted in three places and escaped in two.
   */
  const slug = (url.searchParams.get("slug") || "").replace(/[^a-z0-9-]/gi, "").slice(0, 120);
  const name = titleFromSlug(slug);
  /* A multi-page demo is shared by subpage too (/site/<slug>/admissions,
     /site/<slug>/courses/<course>). Same card, same name; og:url keeps the
     subpage. Sanitised to lower-case words and slashes, like the slug. */
  const sub =
    kind === "site"
      ? (url.searchParams.get("path") || "").toLowerCase().replace(/[^a-z0-9/-]/g, "").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "").slice(0, 80)
      : "";
  const here = `/${kind === "pitch" ? "pitch/" : "site/"}${slug}${sub ? `/${sub}` : ""}`;

  let html;
  try {
    /* The SPA fallback, not /index.html: since 2 Oct 2026 index.html is the
       homepage and carries the homepage's canonical (scripts/prerender-heads.mjs,
       SHELL_FILE). /index.html is only the second try, for a build made before. */
    let res = await fetch(new URL(SHELL_PATH, url.origin), { headers: { "user-agent": "ideovent-share-fn" } });
    if (!res.ok) res = await fetch(new URL("/index.html", url.origin), { headers: { "user-agent": "ideovent-share-fn" } });
    if (!res.ok) throw new Error(String(res.status));
    // A demo's or a pitch's card is not the homepage: never pass a canonical on.
    html = (await res.text()).replace(/[ \t]*<link\b[^>]*\brel=["']canonical["'][^>]*>[ \t]*\r?\n?/gi, "");
  } catch {
    // Falling through to the SPA is the right failure: the card is wrong, which
    // is where we started, rather than the link being broken.
    return Response.redirect(new URL(here, url.origin), 302);
  }

  if (name) {
    const description =
      kind === "pitch"
        ? `A website proposal prepared for ${name} by Ideovent Technologies.`
        : `A demonstration website built by Ideovent Technologies for ${name}. It is not their live site.`;

    html = setMeta(html, "property", "og:title", name);
    html = setMeta(html, "property", "og:description", description);
    html = setMeta(html, "name", "twitter:title", name);
    html = setMeta(html, "name", "twitter:description", description);
    html = setMeta(html, "name", "description", description);
    html = setMeta(html, "property", "og:url", `${url.origin}${here}`);
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${attr(name)}</title>`);
  }

  /*
   * EVERY TAG A CARD NEEDS, WHATEVER THE SHELL CARRIES (3 Oct 2026). The shell
   * is a neutral page now (scripts/prerender-heads.mjs): the firm's name, robots
   * noindex, the brand card, and no description or og:url of its own. The lines
   * above write or insert the title, description and url; these insert, only
   * where the document has none, the rest of what WhatsApp, LinkedIn and X draw
   * a card from: the picture (the brand card, with its size) and the card type.
   * So the card never depends on the shell keeping a tag, and a tag the shell
   * does carry is left as it is.
   */
  if (getMeta(html, "property", "og:image") === null) {
    html = setMeta(html, "property", "og:image", `${url.origin}/og/ideovent-og.png`);
    html = setMeta(html, "property", "og:image:width", "1200");
    html = setMeta(html, "property", "og:image:height", "630");
    html = setMeta(html, "property", "og:image:alt", BRAND_CARD_ALT);
  }
  html = ensureMeta(html, "property", "og:site_name", BRAND);
  html = ensureMeta(html, "property", "og:type", "website");
  html = ensureMeta(html, "property", "og:title", BRAND);
  html = ensureMeta(html, "name", "twitter:card", "summary_large_image");
  html = ensureMeta(html, "name", "twitter:title", unattr(getMeta(html, "property", "og:title")));
  html = ensureMeta(html, "name", "twitter:image", unattr(getMeta(html, "property", "og:image")));

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Neither a demo nor a pitch belongs in an index, and a scraper that
      // doubles as a crawler must be told so here too: this response never
      // passes through the header rules in vercel.json.
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
