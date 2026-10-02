/**
 * Test the link preview function against the real index.html.
 *
 *   node scripts/test-share-fn.mjs
 *
 * The thing being tested is a string rewrite over a document whose meta tags are
 * written across several lines, which is exactly the shape that has already
 * fooled a line based regex twice in this project: once when a dash script ate
 * 38 commas out of the JSON-LD block, and once when a prospect's four line
 * <title> was recorded as empty. So this runs the real handler over the real
 * file rather than over a fixture, and it asserts on what a scraper would
 * actually read: the parsed value of each tag.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const INDEX = resolve(here, "../index.html");

const realIndex = readFileSync(INDEX, "utf8");

// The built file substitutes %VITE_PUBLIC_URL%; the source has the token. Either
// way the meta tags have the same shape, which is what is under test.
globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => realIndex });

const { default: handler } = await import("../api/share.js");

function parseMeta(html, sel) {
  const [kind, name] = sel;
  const re = new RegExp(`<meta[^>]*\\b${kind}=["']${name}["'][^>]*\\bcontent=["']([^"']*)["']`, "is");
  const m = re.exec(html);
  return m ? m[1] : null;
}
const parseTitle = (html) => (/<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1]?.trim() ?? null;

const fails = [];
const check = (label, got, test) => {
  const ok = test(got);
  console.log(`${ok ? "ok   " : "FAIL "} ${label}\n         ${JSON.stringify(got)}`);
  if (!ok) fails.push(label);
};

async function run(path) {
  const res = await handler(new Request(`https://ideovent.vercel.app${path}`));
  return { html: await res.text(), headers: res.headers };
}

console.log("A school demo, as a scraper reads it\n");
{
  const { html, headers } = await run("/api/share?kind=site&slug=st-xaviers-high-school");
  check("og:title is the institute, not Ideovent", parseMeta(html, ["property", "og:title"]),
    (v) => v === "St Xaviers High School");
  check("og:description says it is a demonstration", parseMeta(html, ["property", "og:description"]),
    (v) => /demonstration/i.test(v) && /not their live site/i.test(v) && /St Xaviers High School/.test(v));
  check("twitter:title matches", parseMeta(html, ["name", "twitter:title"]),
    (v) => v === "St Xaviers High School");
  check("meta description replaced too", parseMeta(html, ["name", "description"]),
    (v) => /St Xaviers High School/.test(v) && !/Ideovent Technologies is a web/.test(v));
  check("<title> is the institute", parseTitle(html), (v) => v === "St Xaviers High School");
  check("og:url points at the demo", parseMeta(html, ["property", "og:url"]),
    (v) => v === "https://ideovent.vercel.app/site/st-xaviers-high-school");
  check("response is noindex", headers.get("x-robots-tag"), (v) => /noindex/.test(v || ""));
  check("no Ideovent marketing line survives anywhere in the card tags",
    [parseMeta(html, ["property", "og:title"]), parseMeta(html, ["property", "og:description"]),
     parseMeta(html, ["name", "twitter:title"]), parseMeta(html, ["name", "twitter:description"])].join(" | "),
    (v) => !/Ideovent Technologies\. Web/.test(v));
  check("og:image is left alone so the card still has a picture",
    parseMeta(html, ["property", "og:image"]), (v) => !!v);
  check("the app still boots: the module script tag survives",
    /<script[^>]*type="module"/i.test(html), (v) => v === true);
}

console.log("\nA pitch page\n");
{
  const { html } = await run("/api/share?kind=pitch&slug=example-public-school");
  check("og:title is the institute", parseMeta(html, ["property", "og:title"]),
    (v) => v === "Example Public School");
  check("description says proposal, not demonstration", parseMeta(html, ["property", "og:description"]),
    (v) => /proposal/i.test(v) && !/not their live site/i.test(v));
  check("og:url uses the /pitch/ path", parseMeta(html, ["property", "og:url"]),
    (v) => v === "https://ideovent.vercel.app/pitch/example-public-school");
}

console.log("\nSmall words and edge cases\n");
{
  const { html } = await run("/api/share?kind=site&slug=school-of-the-holy-cross");
  check("small words stay lower case after the first",
    parseMeta(html, ["property", "og:title"]), (v) => v === "School of the Holy Cross");
}
console.log("\nSubpages of a multi-page demo\n");
{
  const { html } = await run("/api/share?kind=site&slug=st-xaviers-high-school&path=courses/jee-two-year");
  check("a subpage gets the same named card",
    parseMeta(html, ["property", "og:title"]), (v) => v === "St Xaviers High School");
  check("og:url keeps the subpage",
    parseMeta(html, ["property", "og:url"]), (v) => /\/site\/st-xaviers-high-school\/courses\/jee-two-year$/.test(v || ""));
}
{
  const { html } = await run('/api/share?kind=site&slug=abc&path=x"><script>alert(1)</script>//../y');
  check("a hostile subpage path is reduced to words and slashes",
    parseMeta(html, ["property", "og:url"]), (v) => /\/site\/abc\/xscriptalert1\/script\/\.?\.?\/?y?/.test(v || "") && !/[<>"]/.test(v || ""));
}
{
  const { html } = await run("/api/share?kind=site&slug=");
  check("an empty slug leaves the Ideovent fallback alone rather than printing a blank name",
    parseMeta(html, ["property", "og:title"]), (v) => /Ideovent/.test(v || ""));
}
{
  /*
   * The slug reaches this function from a URL, so it is attacker controlled.
   *
   * The assertion is NOT "the string alert(1) does not appear anywhere". A
   * correctly escaped attribute can contain those characters and be completely
   * inert, and asserting on the raw text failed the first run on exactly that:
   * the payload was sitting escaped inside og:url, doing nothing. What matters
   * is that no new executable element appears and that no attribute carries a
   * raw quote or angle bracket, so compare the script count against the
   * untouched document and parse the values back out.
   */
  const scriptsBefore = (realIndex.match(/<script[\s>]/gi) || []).length;
  const { html } = await run('/api/share?kind=site&slug=abc"><script>alert(1)</script>');
  const scriptsAfter = (html.match(/<script[\s>]/gi) || []).length;

  check("a slug carrying markup cannot break out of the attribute",
    parseMeta(html, ["property", "og:title"]), (v) => v !== null && !/[<>"]/.test(v));
  check("no new <script> element appears", `${scriptsBefore} -> ${scriptsAfter}`,
    () => scriptsAfter === scriptsBefore);
  // Only the characters matter. The sanitised slug still contains the LETTERS
  // "script", which is harmless text and is also how a school called
  // Scriptorium Academy would legitimately slugify.
  check("og:url carries no markup either", parseMeta(html, ["property", "og:url"]),
    (v) => v !== null && !/[<>"'`]/.test(v));
}

console.log("\nThe file it reads (2 Oct 2026: the SPA shell, not the homepage)\n");
{
  /* Since 2 Oct 2026 the built index.html is the homepage, with its canonical,
     and the SPA fallback is /spa-shell.html (scripts/prerender-heads.mjs). The
     function must ask for the shell, and if it ever ends up with a document that
     carries a canonical anyway (a build from before, a mistake), drop it: a
     school's demo card must not name the homepage as its canonical page. */
  const asked = [];
  const homepage = realIndex.replace(/<title>/i, '<link data-rh="true" rel="canonical" href="https://www.ideovent.in/" />\n    <title>');
  globalThis.fetch = async (u) => {
    asked.push(new URL(String(u)).pathname);
    return { ok: true, status: 200, text: async () => homepage };
  };
  const { html } = await run("/api/share?kind=site&slug=st-xaviers-high-school");
  check("it asks for /spa-shell.html first", asked[0], (v) => v === "/spa-shell.html");
  check("no canonical survives into the card", (html.match(/rel=["']canonical["']/gi) || []).length, (v) => v === 0);
  check("og:url is still the demo's", parseMeta(html, ["property", "og:url"]),
    (v) => v === "https://ideovent.vercel.app/site/st-xaviers-high-school");

  asked.length = 0;
  globalThis.fetch = async (u) => {
    const p = new URL(String(u)).pathname;
    asked.push(p);
    return p === "/spa-shell.html" ? { ok: false, status: 404, text: async () => "" } : { ok: true, status: 200, text: async () => realIndex };
  };
  const old = await run("/api/share?kind=site&slug=st-xaviers-high-school");
  check("a build without the shell still gets a card, from /index.html", `${asked.join(" -> ")} | ${parseMeta(old.html, ["property", "og:title"])}`,
    (v) => v === "/spa-shell.html -> /index.html | St Xaviers High School");
}

/*
 * THE SHELL IS NEUTRAL SINCE 3 OCT 2026 (scripts/prerender-heads.mjs): the firm's
 * name, robots noindex and the brand card, and no description, og:url or
 * twitter:description of its own. The card must not depend on what the shell
 * carries, so it is checked twice: against a shell stripped of EVERY head tag
 * Helmet owns (the worst case), and against the real built shell when there is
 * one (SHARE_SHELL=<path to spa-shell.html>, or dist/spa-shell.html).
 */
const cardOf = (html) => ({
  title: parseTitle(html),
  ogTitle: parseMeta(html, ["property", "og:title"]),
  description: parseMeta(html, ["name", "description"]),
  ogDescription: parseMeta(html, ["property", "og:description"]),
  ogImage: parseMeta(html, ["property", "og:image"]),
  ogUrl: parseMeta(html, ["property", "og:url"]),
  twitterCard: parseMeta(html, ["name", "twitter:card"]),
  twitterTitle: parseMeta(html, ["name", "twitter:title"]),
  twitterDescription: parseMeta(html, ["name", "twitter:description"]),
  twitterImage: parseMeta(html, ["name", "twitter:image"]),
});
const once = (html, attrName, name) => (html.match(new RegExp(`<meta[^>]*\\b${attrName}=["']${name}["']`, "gi")) || []).length;

async function cardChecks(label, shellHtml) {
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => shellHtml });
  for (const [kind, slug, url, word] of [
    ["site", "st-xaviers-high-school", "https://ideovent.vercel.app/site/st-xaviers-high-school", /demonstration/i],
    ["pitch", "example-public-school", "https://ideovent.vercel.app/pitch/example-public-school", /proposal/i],
  ]) {
    const name = kind === "site" ? "St Xaviers High School" : "Example Public School";
    const { html } = await run(`/api/share?kind=${kind}&slug=${slug}`);
    const c = cardOf(html);
    check(`${label}, ${kind}: title, og:title and twitter:title are the institute`, [c.title, c.ogTitle, c.twitterTitle].join(" | "),
      () => c.title === name && c.ogTitle === name && c.twitterTitle === name);
    check(`${label}, ${kind}: a description, og:description and twitter:description that say what it is`,
      [c.description, c.ogDescription, c.twitterDescription].join(" | "),
      () => [c.description, c.ogDescription, c.twitterDescription].every((v) => v && v.includes(name) && word.test(v)));
    check(`${label}, ${kind}: a picture, absolute, the same on og:image and twitter:image`, `${c.ogImage} | ${c.twitterImage}`,
      () => /^https:\/\/[^"'<>]+\.(png|jpe?g|webp)$/i.test(c.ogImage || "") && c.twitterImage === c.ogImage);
    check(`${label}, ${kind}: og:url is the page's own address`, c.ogUrl, (v) => v === url);
    check(`${label}, ${kind}: twitter:card is summary_large_image`, c.twitterCard, (v) => v === "summary_large_image");
    const counts = [["property", "og:title"], ["property", "og:description"], ["property", "og:image"], ["property", "og:url"],
      ["name", "description"], ["name", "twitter:card"], ["name", "twitter:title"], ["name", "twitter:image"]]
      .map(([a, n]) => `${n}=${once(html, a, n)}`);
    check(`${label}, ${kind}: each of those tags appears exactly once`, counts.join(" "), () => counts.every((s) => s.endsWith("=1")));
    check(`${label}, ${kind}: no canonical, and the app still boots`, `${(html.match(/rel=["']canonical["']/gi) || []).length} canonical, module script ${/<script[^>]*type="module"/i.test(html)}`,
      () => !/rel=["']canonical["']/i.test(html) && /<script[^>]*type="module"/i.test(html));
  }
  const { html: empty } = await run("/api/share?kind=site&slug=");
  const e = cardOf(empty);
  check(`${label}, empty slug: still a card with the firm's name and a picture`, `${e.ogTitle} | ${e.ogImage}`,
    () => /Ideovent/.test(e.ogTitle || "") && Boolean(e.ogImage) && e.twitterImage === e.ogImage);
  return { html: (await run("/api/share?kind=site&slug=st-xaviers-high-school")).html };
}

console.log("\nThe neutral shell (3 Oct 2026): a shell with no head tags at all\n");
{
  // The same strip prerender-heads.mjs makes ([^>] spans the multi-line tags in index.html).
  const bare = realIndex
    .replace(/[ \t]*<(meta|link)\b[^>]*\bdata-rh="true"[^>]*>[ \t]*\r?\n?/gi, "")
    .replace(/[ \t]*<script\b[^>]*\bdata-rh="true"[^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi, "")
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>Ideovent Technologies</title>\n    <meta data-rh="true" name="robots" content="noindex" />');
  check("the fixture really carries no card tag and no description", cardOf(bare),
    (c) => Object.entries(c).every(([k, v]) => k === "title" || v === null));
  const { html } = await cardChecks("bare shell", bare);
  check("bare shell: the inserted brand card says its size", `${parseMeta(html, ["property", "og:image:width"])}x${parseMeta(html, ["property", "og:image:height"])}`,
    (v) => v === "1200x630");
}

{
  const builtShell = process.env.SHARE_SHELL || resolve(here, "../dist/spa-shell.html");
  let shellHtml = null;
  try { shellHtml = readFileSync(builtShell, "utf8"); } catch { /* no build here */ }
  if (shellHtml) {
    console.log(`\nThe real built shell: ${builtShell}\n`);
    check("the built shell is neutral: noindex, no description, no canonical, no og:url",
      `robots ${parseMeta(shellHtml, ["name", "robots"])} | description ${parseMeta(shellHtml, ["name", "description"])} | og:url ${parseMeta(shellHtml, ["property", "og:url"])}`,
      () => /noindex/.test(parseMeta(shellHtml, ["name", "robots"]) || "") && parseMeta(shellHtml, ["name", "description"]) === null
        && parseMeta(shellHtml, ["property", "og:url"]) === null && !/rel=["']canonical["']/i.test(shellHtml));
    await cardChecks("built shell", shellHtml);
  } else {
    console.log(`\nskip  the real built shell: none at ${builtShell} (set SHARE_SHELL=<path to spa-shell.html> after a build)`);
  }
}

console.log("");
if (fails.length) {
  console.log(`${fails.length} FAILURE(S): ${fails.join("; ")}`);
  process.exit(1);
}
console.log("the preview card is the institute's, on every case checked.");
