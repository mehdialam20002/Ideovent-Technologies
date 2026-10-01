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

console.log("");
if (fails.length) {
  console.log(`${fails.length} FAILURE(S): ${fails.join("; ")}`);
  process.exit(1);
}
console.log("the preview card is the institute's, on every case checked.");
