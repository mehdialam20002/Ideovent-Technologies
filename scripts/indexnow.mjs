/**
 * IndexNow: tell Bing, and the engines that share its submissions (Yandex,
 * Seznam, Naver, Yep), which pages of www.ideovent.in are new or changed.
 *
 * RUN IT BY HAND, AFTER A DEPLOY IS LIVE. It is not part of `npm run build` and
 * must never be: a build is not a release (previews, failed deploys), and a
 * submission for a page that is not live yet wastes the crawl it asks for.
 *
 *   node scripts/indexnow.mjs                  sitemap URLs that are new or changed since the last run
 *   node scripts/indexnow.mjs --all            every URL in the live sitemap (first run, or a site-wide change)
 *   node scripts/indexnow.mjs /websites /pricing    only these paths (or full URLs on the site)
 *   ... --dry-run                              print what would be sent; send nothing, save nothing
 *   ... --site https://www.ideovent.in         the site (default); its sitemap and key file are read live
 *   ... --state <file>                         where the last run is remembered (default below)
 *   ... --endpoint <url>                       a test stand-in for the IndexNow endpoint (tests only)
 *
 * WHY "CHANGED" AND NOT THE WHOLE SITEMAP EVERY TIME. The protocol's own FAQ
 * (https://www.indexnow.org/faq): IndexNow "is not designed for submitting every
 * URL on your site at once", and "Avoid submitting the same URL many times a day
 * unless there are meaningful content changes." So by default the script reads
 * the LIVE sitemap, fetches each page and fingerprints what a crawler reads
 * without JavaScript: the title, the description and robots tags, the
 * canonical, the JSON-LD and the prerendered <noscript> text that
 * scripts/prerender-heads.mjs writes. Asset file names change on every build and
 * are left out, so a redeploy that changed no words submits nothing. The
 * fingerprints of the last accepted submission are kept on this computer, in
 * ~/.ideovent/indexnow-state.json, not in the repo. With no state file (the first
 * run, or another computer) every URL counts as new, which is right the first
 * time. A URL that was in the sitemap last time and is not now is sent too: the
 * protocol is for URLs "added, updated, or deleted".
 *
 * BEFORE IT SENDS ANYTHING it checks that the key file answers on the live site
 * with the key in it (https://www.ideovent.in/<key>.txt, from public/), and that
 * every URL is on that host; the endpoint answers 403 or 422 otherwise.
 *
 * THE KEY. public/<key>.txt, 32 hex characters, the file holding nothing but its
 * own name. It is public by design: the protocol proves ownership by the file
 * being on the site. To change it, put a new file in public/ and delete the old
 * one in the same commit; this script finds whichever one is there.
 *
 * Endpoint and answers, from https://www.indexnow.org/documentation: a JSON POST
 * to https://api.indexnow.org/indexnow (shared with every IndexNow engine), up
 * to 10,000 URLs per POST. 200 OK; 202 accepted, key validation pending; 400 bad
 * request; 403 key not valid; 422 URLs not on the host or key mismatch; 429 too
 * many requests. A 200 means "received", not "indexed": nothing here promises a
 * ranking or even a crawl.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";
const UA = "ideovent-indexnow/1.0 (+https://www.ideovent.in)";
const MEANING = {
  200: "OK, received",
  202: "accepted, key validation pending",
  400: "bad request (the request format is invalid)",
  403: "key not valid (key file missing, or the key is not in it)",
  422: "a URL is not on this host, or the key does not match the schema",
  429: "too many requests (the endpoint treats this as potential spam: wait before trying again)",
};

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const optionValues = new Set(["--site", "--state", "--endpoint"].map(option).filter(Boolean));
// --endpoint is for testing against a local stand-in; leave it out for real use.
const ENDPOINT = option("--endpoint") || DEFAULT_ENDPOINT;
const explicit = argv.filter((a) => !a.startsWith("--") && !optionValues.has(a));
const DRY = flag("--dry-run");
const ALL = flag("--all");
const site = new URL(option("--site") || "https://www.ideovent.in").origin;
const host = new URL(site).host;
const statePath = path.resolve(option("--state") || path.join(homedir(), ".ideovent", "indexnow-state.json"));

/**
 * Stop with a message. Thrown, not process.exit(): exiting while fetch() still
 * holds a keep-alive socket aborts Node on Windows (libuv "UV_HANDLE_CLOSING").
 * main() below catches it and sets the exit code instead.
 */
class Stop extends Error {}
function fail(msg) {
  throw new Stop(msg);
}

/** public/<key>.txt: the one .txt file whose whole content is its own name. */
async function findKey() {
  const dir = path.join(SITE_DIR, "public");
  const found = [];
  for (const name of await readdir(dir)) {
    const m = name.match(/^([A-Za-z0-9-]{8,128})\.txt$/);
    if (!m) continue;
    const body = (await readFile(path.join(dir, name), "utf8")).trim();
    if (body === m[1]) found.push(m[1]);
  }
  if (found.length !== 1) fail(`expected exactly one IndexNow key file in public/ (a <key>.txt holding only <key>), found ${found.length}`);
  return found[0];
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  return { status: res.status, url: res.url, text: res.ok ? await res.text() : "" };
}

/** What a crawler reads without JavaScript, minus the asset names that change every build. */
function fingerprint(html) {
  const all = (re) => (html.match(re) || []).join("\n");
  const parts = [
    all(/<title>[\s\S]*?<\/title>/gi),
    all(/<meta\b[^>]*\bname="(?:description|robots)"[^>]*>/gi),
    all(/<link\b[^>]*\brel="canonical"[^>]*>/gi),
    all(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi),
    all(/<noscript data-prerendered="true">[\s\S]*?<\/noscript>/gi),
  ];
  return createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 32);
}

/** Fingerprint many pages, four at a time. A page that does not answer 200 is reported and skipped. */
async function fingerprints(urls) {
  const out = new Map();
  let i = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try {
        const r = await fetchText(u);
        if (r.status === 200) out.set(u, fingerprint(r.text));
        else console.warn(`WARN  ${u} answered ${r.status}; left out`);
      } catch (e) {
        console.warn(`WARN  ${u} did not answer (${e.cause?.code || e.message}); left out`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return out;
}

async function main() {
  const key = await findKey();
  const keyLocation = `${site}/${key}.txt`;

  // 1. The key file must be live, or every engine answers 403. A missing file is
  //    NOT a 404 here: Vercel's SPA fallback answers it with an HTML page and 200.
  const keyFile = await fetchText(keyLocation).catch((e) => fail(`${keyLocation} did not answer: ${e.message}`));
  if (keyFile.status !== 200 || keyFile.text.trim() !== key) {
    const why = keyFile.status !== 200 ? `answered ${keyFile.status}` : /<html/i.test(keyFile.text) ? "answered with a web page, not the key (the SPA fallback: the file is not there)" : "answered without the key in it";
    fail(`${keyLocation} ${why}. Deploy the commit that adds public/${key}.txt first.`);
  }
  console.log(`ok    key file live: ${keyLocation}`);

  // 2. The live sitemap: the list of pages the site itself says are public.
  const sm = await fetchText(`${site}/sitemap.xml`).catch((e) => fail(`${site}/sitemap.xml did not answer: ${e.message}`));
  if (sm.status !== 200) fail(`${site}/sitemap.xml answered ${sm.status}`);
  const sitemap = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const offHost = sitemap.filter((u) => new URL(u).host !== host);
  if (offHost.length) fail(`the sitemap lists URLs on another host (${offHost[0]}); IndexNow would answer 422`);
  console.log(`ok    sitemap: ${sitemap.length} URLs on ${host}`);

  // 3. What to send.
  let state = { urls: {} };
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
    if (state.site !== site || state.key !== key) state = { urls: {} }; // another site or a new key: start over
  } catch {
    /* no state yet: every URL is new */
  }
  let urlList;
  let fresh = new Map();
  if (explicit.length) {
    urlList = [...new Set(explicit.map((a) => new URL(a, site).href))];
    const bad = urlList.filter((u) => new URL(u).host !== host);
    if (bad.length) fail(`not on ${host}: ${bad.join(", ")}`);
    for (const u of urlList) if (!sitemap.includes(u)) console.warn(`WARN  ${u} is not in the sitemap (sent anyway)`);
    fresh = await fingerprints(urlList.filter((u) => sitemap.includes(u)));
  } else {
    fresh = await fingerprints(sitemap);
    const gone = Object.keys(state.urls || {}).filter((u) => !sitemap.includes(u));
    const changed = [...fresh].filter(([u, fp]) => ALL || state.urls?.[u] !== fp).map(([u]) => u);
    urlList = [...changed, ...gone];
    const isNew = changed.filter((u) => !state.urls?.[u]).length;
    console.log(ALL ? `send  all ${changed.length} live sitemap URLs${gone.length ? ` + ${gone.length} removed since the last run` : ""}`
      : `send  ${isNew} new, ${changed.length - isNew} changed, ${gone.length} removed since the last run (${statePath})`);
  }
  if (!urlList.length) {
    console.log("ok    nothing new or changed since the last submission; nothing sent");
    return 0;
  }
  if (urlList.length > 10000) fail(`${urlList.length} URLs: the protocol takes at most 10,000 per POST`);
  for (const u of urlList) console.log(`      ${u}`);

  const body = { host, key, keyLocation, urlList };
  if (DRY) {
    console.log(`\ndry run: would POST ${urlList.length} URL(s) to ${ENDPOINT}; nothing sent, nothing saved`);
    return 0;
  }

  // 4. One POST to the shared endpoint.
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", "user-agent": UA },
    body: JSON.stringify(body),
  });
  const said = (await res.text().catch(() => "")).slice(0, 300);
  console.log(`${res.status === 200 || res.status === 202 ? "ok  " : "FAIL"}  ${ENDPOINT} answered ${res.status}: ${MEANING[res.status] || "unexpected"}${said ? `\n      ${said}` : ""}`);
  if (res.status !== 200 && res.status !== 202) return 1;

  // 5. Remember what was accepted, so the next run sends only what changes after it.
  const urls = { ...(state.urls || {}) };
  for (const u of urlList) if (!fresh.has(u)) delete urls[u]; // removed pages
  for (const [u, fp] of fresh) urls[u] = fp;
  if (!explicit.length) for (const u of Object.keys(urls)) if (!sitemap.includes(u)) delete urls[u];
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify({ site, key, submittedAt: new Date().toISOString(), urls }, null, 2), "utf8");
  console.log(`ok    remembered ${Object.keys(urls).length} fingerprints in ${statePath}`);
  return 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (e) => {
    console.error(e instanceof Stop ? `FAIL  ${e.message}` : e);
    process.exitCode = 1;
  },
);
