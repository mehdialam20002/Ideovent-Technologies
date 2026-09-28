/**
 * Test the Lead Finder function, api/leads-search.js, with every network call mocked.
 *
 *   node scripts/test-leads-search-fn.mjs
 *
 * globalThis.fetch plays Supabase, Google Places and the websites being
 * audited; DNS is replaced too (siteAudit deps.lookup). Nothing leaves this
 * machine. It runs the REAL handler, like test-poster-fn.mjs does.
 *
 * Checked on every response and log line: a Google key never appears. The
 * negative control at the end proves the checks can fail.
 */
process.env.VITE_SUPABASE_URL = "https://sb.test";
process.env.VITE_SUPABASE_ANON_KEY = "anon-public-key";

const KEY1 = "AIzaFAKEmapsKEYnumber1000000000000000001";
const KEY2 = "AIzaFAKEmapsKEYnumber2000000000000000002";
const GEMINI = "AIzaFAKEgeminiKEY000000000000000000009";
const ALL_KEYS = [KEY1, KEY2, GEMINI];

let state;
function reset(over = {}) {
  state = { keys: [], missingTable: false, google: {}, sites: {}, dns: {}, calls: [], patches: [], ...over };
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const html = (status, body, headers = {}) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });
let nextId = 0;
const keyRow = (apiKey, n, extra = {}) => ({ id: `id-${++nextId}`, provider: "google_maps", label: `Key ${n}`, api_key: apiKey,
  model: "places", provider_priority: 50, priority: n * 10, enabled: true, last_error: null, last_error_at: null, ...extra });
const geminiRow = () => ({ id: "id-gem", provider: "gemini", label: "Key 1", api_key: GEMINI, model: "", provider_priority: 1,
  priority: 10, enabled: true, last_error: null, last_error_at: null });

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || "GET").toUpperCase();
  const headers = Object.fromEntries(new Headers(init.headers || {}).entries());
  const body = typeof init.body === "string" ? init.body : "";
  state.calls.push({ url, method, headers, body });
  const u = new URL(url);

  if (u.host === "sb.test") {
    const token = (headers.authorization || "").replace(/^Bearer /, "");
    if (u.pathname === "/auth/v1/user") {
      if (token === "admin-token") return json(200, { id: "u1" });
      if (token === "user-token") return json(200, { id: "u2" });
      return json(401, { msg: "invalid JWT" });
    }
    if (u.pathname === "/rest/v1/rpc/is_admin") return json(200, token === "admin-token");
    if (u.pathname === "/rest/v1/ai_provider_keys" && method === "GET") {
      if (state.missingTable) return json(404, { code: "PGRST205", message: "Could not find the table 'public.ai_provider_keys'" });
      if (token !== "admin-token") return json(200, []);
      const cols = (u.searchParams.get("select") || "").split(",");
      return json(200, state.keys.filter((k) => k.enabled).reverse()
        .map((k) => Object.fromEntries(cols.filter((c) => c in k).map((c) => [c, k[c]]))));
    }
    if (u.pathname === "/rest/v1/ai_provider_keys" && method === "PATCH") {
      state.patches.push({ id: u.searchParams.get("id")?.replace(/^eq\./, ""), body: JSON.parse(body) });
      return new Response(null, { status: 204 });
    }
    return json(404, { message: "unmocked " + u.pathname });
  }
  if (u.host === "places.googleapis.com") {
    const key = headers["x-goog-api-key"];
    const kind = u.pathname === "/v1/places:searchText" ? "search" : "details";
    const fn = state.google[key];
    if (!fn) return json(400, { error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } });
    return fn(kind, body ? JSON.parse(body) : {}, u, headers);
  }
  const site = state.sites[u.origin + u.pathname] || state.sites[u.origin];
  if (site) return typeof site === "function" ? site(u, init) : site.clone();
  const err = new TypeError("fetch failed");
  err.cause = { code: "ECONNREFUSED" };
  throw err;
};

// DNS: every host resolves to a public address unless state.dns says otherwise.
const audit = await import("../api/_lib/siteAudit.js");
audit.deps.lookup = async (host) => {
  const v = state.dns[host];
  if (v === "NXDOMAIN") { const e = new Error("queryA ENOTFOUND " + host); e.code = "ENOTFOUND"; throw e; }
  return [{ address: v || "93.184.216.34", family: 4 }];
};

const { default: handler } = await import("../api/leads-search.js");

const seen = [];
const origError = console.error;
console.error = (...a) => { seen.push(a.join(" ")); };

async function call({ token = "admin-token", body = {}, method = "POST" } = {}) {
  const req = { method, headers: token ? { authorization: `Bearer ${token}` } : {}, body };
  const out = { status: 0, headers: {}, text: "" };
  const res = {
    set statusCode(v) { out.status = v; }, get statusCode() { return out.status; },
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    end(t) { out.text = t || ""; },
  };
  await handler(req, res);
  seen.push(out.text);
  out.json = out.text ? JSON.parse(out.text) : null;
  return out;
}

const fails = [];
const check = (label, got, test) => {
  let pass = false;
  try { pass = !!test(got); } catch { pass = false; }
  origError(`${pass ? "ok   " : "FAIL "} ${label}${pass ? "" : `\n         ${JSON.stringify(got)?.slice(0, 500)}`}`);
  if (!pass) fails.push(label);
};
const leaks = (texts) => ALL_KEYS.filter((k) => texts.some((t) => String(t).includes(k)));
const log = (s) => origError(`\n${s}\n`);

// ── Google's replies, in Google's own shape ─────────────────────────────────
const G_PLACE = (i, extra = {}) => ({ id: `ChIJplace${String(i).padStart(6, "0")}xyz`, displayName: { text: `Vidya Classes ${i}`, languageCode: "en" },
  formattedAddress: `Boring Road, Patna, Bihar 80000${i}`, nationalPhoneNumber: "098765 4321" + i, internationalPhoneNumber: `+91 98765 4321${i}`,
  websiteUri: `https://vidya${i}.example.in/`, rating: 4.3, userRatingCount: 120 + i, googleMapsUri: `https://maps.google.com/?cid=${i}`,
  businessStatus: "OPERATIONAL", primaryType: "school", reviews: [{ text: "must not leak through" }], ...extra });
const searchOk = (places = [G_PLACE(1), G_PLACE(2, { websiteUri: undefined })], next = "NEXTtoken123") =>
  (kind, body) => (kind === "search" ? json(200, { places, ...(next ? { nextPageToken: next } : {}) })
    : json(200, G_PLACE(7)));
const quota = () => json(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for quota metric 'Text Search requests'." } });
const denied = () => json(403, { error: { code: 403, status: "PERMISSION_DENIED", message: "Places API (New) has not been used in project 123 before or it is disabled." } });

// ── Who may call it ─────────────────────────────────────────────────────────
log("Access");
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: searchOk() } });
const S = { action: "search", type: "coaching", city: "Patna" };
check("no token -> 401", (await call({ token: null, body: S })).status, (s) => s === 401);
check("an invalid token -> 401", (await call({ token: "forged", body: S })).status, (s) => s === 401);
check("a signed-in non-admin -> 403", (await call({ token: "user-token", body: S })).status, (s) => s === 403);
check("a non-admin cannot audit either -> 403", (await call({ token: "user-token", body: { action: "audit", url: "https://a.example.in" } })).status, (s) => s === 403);
check("Google was never called for any of them", state.calls.filter((c) => !c.url.startsWith("https://sb.test")).length, (n) => n === 0);
check("GET -> 405", (await call({ method: "GET" })).status, (s) => s === 405);

log("Body");
check("unknown action -> 400", (await call({ body: { action: "delete" } })).status, (s) => s === 400);
check("search without type/city/query -> 400", (await call({ body: { action: "search", city: "Patna" } })).status, (s) => s === 400);
check("details with a path in placeId -> 400", (await call({ body: { action: "details", placeId: "../../v1/x" } })).status, (s) => s === 400);
check("audit with 11 urls -> 400", (await call({ body: { action: "audit", urls: Array(11).fill("a.in") } })).status, (s) => s === 400);
check("a pageToken with spaces -> 400", (await call({ body: { ...S, pageToken: "a b" } })).status, (s) => s === 400);
check("broken JSON -> 400", (await call({ body: "{not json" })).status, (s) => s === 400);

// ── No keys ─────────────────────────────────────────────────────────────────
log("No keys");
reset();
let r = await call({ body: S });
check("no keys -> 422 no_keys", [r.status, r.json.code], ([s, c]) => s === 422 && c === "no_keys");
reset({ keys: [geminiRow()] });
r = await call({ body: S });
check("an AI key alone is not a Maps key -> 422, and Gemini's key is never sent to Google", [r.status, state.calls.some((c) => c.url.includes("googleapis"))],
  ([s, g]) => s === 422 && !g);
reset({ keys: [keyRow(KEY1, 1, { enabled: false })] });
check("a switched-off key -> 422", (await call({ body: S })).status, (s) => s === 422);
reset({ missingTable: true });
r = await call({ body: S });
check("table missing -> 422 pointing at 0006 and 0009", [r.status, r.json.error], ([s, e]) => s === 422 && /0006/.test(e) && /0009/.test(e));

// ── Search ──────────────────────────────────────────────────────────────────
log("Search");
reset({ keys: [geminiRow(), keyRow(KEY1, 1)], google: { [KEY1]: searchOk() } });
r = await call({ body: S });
check("200 with places", [r.status, r.json.places?.length], ([s, n]) => s === 200 && n === 2);
check("textQuery is 'coaching in Patna'", r.json.textQuery, (q) => q === "coaching in Patna");
check("a place is mapped to the finder's shape", r.json.places[0], (p) => p.placeId === "ChIJplace000001xyz" && p.name === "Vidya Classes 1"
  && p.phone === "098765 43211" && p.phoneIntl === "+91 98765 43211" && p.website === "https://vidya1.example.in/" && p.rating === 4.3
  && p.ratingCount === 121 && p.mapsUrl && p.businessStatus === "OPERATIONAL" && p.primaryType === "school" && p.address.includes("Patna"));
check("a place without a website has website null", r.json.places[1].website, (w) => w === null);
check("nothing unasked leaks through (reviews)", r.text, (t) => !t.includes("must not leak"));
check("nextPageToken is passed on", r.json.nextPageToken, (t) => t === "NEXTtoken123");
check("attribution says Google Maps", r.json.attribution, (a) => a === "Google Maps");
const gs = state.calls.find((c) => c.url.endsWith("places:searchText"));
check("POST to places:searchText with the key in a header, not the URL", [gs.method, gs.headers["x-goog-api-key"], gs.url],
  ([m, k, u]) => m === "POST" && k === KEY1 && !u.includes(KEY1));
check("field mask asks only for the needed fields", gs.headers["x-goog-fieldmask"].split(","), (f) => f.length === 12
  && f.includes("places.id") && f.includes("places.websiteUri") && f.includes("nextPageToken") && !f.some((x) => /reviews|photos|\*/.test(x)));
check("request body: textQuery, pageSize 20, region in", JSON.parse(gs.body), (b) => b.textQuery === "coaching in Patna" && b.pageSize === 20 && b.regionCode === "in");
r = await call({ body: { ...S, pageToken: "NEXTtoken123" } });
check("page 2 sends the pageToken and the SAME query", JSON.parse(state.calls.filter((c) => c.url.endsWith("places:searchText")).at(-1).body),
  (b) => b.pageToken === "NEXTtoken123" && b.textQuery === "coaching in Patna");
r = await call({ body: { action: "search", query: "NEET coaching", city: "Gaya" } });
check("a free query gets the city added", r.json.textQuery, (q) => q === "NEET coaching in Gaya");
check("no key status was written when nothing failed", state.patches.length, (n) => n === 0);

// ── Several keys ────────────────────────────────────────────────────────────
log("Key fallback");
reset({ keys: [keyRow(KEY2, 2), keyRow(KEY1, 1)], google: { [KEY1]: quota, [KEY2]: searchOk() } });
r = await call({ body: S });
check("key 1 out of quota -> key 2 answers", [r.status, r.json.attempts.map((a) => `${a.label}:${a.status}`).join(",")],
  ([s, a]) => s === 200 && a === "Key 1:limit,Key 2:ok");
check("key 1 is parked by its own id with 'limit:'", state.patches, (p) => p.length === 1 && p[0].id === state.keys.find((k) => k.api_key === KEY1).id
  && /^limit:/.test(p[0].body.last_error) && p[0].body.last_error_at);
reset({ keys: [keyRow(KEY1, 1, { last_error: "limit: quota", last_error_at: new Date().toISOString() }), keyRow(KEY2, 2)],
  google: { [KEY1]: () => { throw new Error("a parked key must not be called"); }, [KEY2]: searchOk() } });
r = await call({ body: S });
check("a key parked today is skipped without a call", [r.status, r.json.attempts[0].status, state.calls.filter((c) => c.headers["x-goog-api-key"] === KEY1).length],
  ([s, a, n]) => s === 200 && a === "skipped" && n === 0);
reset({ keys: [keyRow(KEY1, 1, { last_error: "limit: quota", last_error_at: "2020-01-01T00:00:00Z" })], google: { [KEY1]: searchOk() } });
r = await call({ body: S });
check("a key parked on an earlier day is tried again, and cleared", [r.status, state.patches[0]?.body.last_error], ([s, e]) => s === 200 && e === null);
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: denied, [KEY2]: quota } });
r = await call({ body: S });
check("every key fails -> 502 all_failed with each error", [r.status, r.json.code, r.json.attempts.length], ([s, c, n]) => s === 502 && c === "all_failed" && n === 2);
check("the Places-not-enabled message reaches the admin", r.text, (t) => /has not been used in project|disabled/.test(t));
reset({ keys: [keyRow(KEY1, 1)] });
r = await call({ body: S });
check("an invalid key -> 502, its error recorded on the key", [r.status, state.patches[0]?.body.last_error], ([s, e]) => s === 502 && /^error: .*API key not valid/.test(e));
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: {
  [KEY1]: () => json(400, { error: { code: 400, status: "INVALID_ARGUMENT", message: "Invalid page_token." } }), [KEY2]: searchOk() } });
r = await call({ body: { ...S, pageToken: "stale" } });
check("a stale page token -> 400, not retried on key 2", [r.status, state.calls.filter((c) => c.headers["x-goog-api-key"] === KEY2).length],
  ([s, n]) => s === 400 && n === 0);
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: () => json(429, { error: { message: `quota for key ${KEY1} exceeded` } }) } });
r = await call({ body: S });
check("a Google error that echoes the key is redacted", [r.text, JSON.stringify(state.patches)], ([t, p]) => !t.includes(KEY1) && !p.includes(KEY1) && t.includes("[key]"));

// ── Details ─────────────────────────────────────────────────────────────────
log("Details");
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: searchOk() } });
r = await call({ body: { action: "details", placeId: "ChIJplace000007xyz" } });
check("details -> 200 with the live phone", [r.status, r.json.place?.phone, r.json.place?.website], ([s, p, w]) => s === 200 && p === "098765 43217" && w);
const gd = state.calls.find((c) => c.url.includes("/v1/places/ChIJ"));
check("GET /v1/places/{id} with a mask without the places. prefix", [gd.method, gd.headers["x-goog-fieldmask"]],
  ([m, f]) => m === "GET" && f.includes("nationalPhoneNumber") && !f.includes("places."));
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: () => json(404, { error: { code: 404, status: "NOT_FOUND", message: "Place not found." } }), [KEY2]: searchOk() } });
r = await call({ body: { action: "details", placeId: "ChIJgoneAway000000" } });
check("an unknown place -> 404 not_found, key 2 not tried", [r.status, r.json.code, state.calls.filter((c) => c.headers["x-goog-api-key"] === KEY2).length],
  ([s, c, n]) => s === 404 && c === "not_found" && n === 0);

// ── The audit ───────────────────────────────────────────────────────────────
const YEAR = new Date().getUTCFullYear();
const GOOD = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vidya Classes &amp; Academy, Patna</title></head><body><h1>Vidya Classes</h1><p>JEE and NEET coaching. Admission open. Fees on request.</p>
<a href="tel:+919876543210">Call us</a> <a href="mailto:info@vidyaclasses.in">Email</a> <p>Landline 0612 2345678</p>
<a href="https://wa.me/919123456789">WhatsApp</a><img src="logo@2x.png"><p>© 2019 - ${YEAR} Vidya Classes</p></body></html>`;
const NO_VIEWPORT = GOOD.replace(/<meta name="viewport"[^>]*>/, "");
const OLD = GOOD.replace(`© 2019 - ${YEAR}`, "© 2017");
const PARKED = `<html><head><title>vidya-old.in</title><meta name="viewport" content="width=device-width"></head><body>
<h1>This domain has expired.</h1><p>If you are the owner, renew this domain now.</p></body></html>`;
const FORSALE = `<html><head><meta name="viewport" content="width=device-width"></head><body>vidya.co.in is for sale! Buy this domain today.</body></html>`;
const NO_CONTACT = `<html><head><meta name="viewport" content="width=device-width"></head><body><h1>Welcome</h1><p>We believe in quality learning for every child.</p></body></html>`;

async function audited(sites, url, dnsMap = {}) {
  reset({ sites, dns: dnsMap });
  const res = await call({ body: { action: "audit", url } });
  return res.json.audit;
}
log("Audit classifier");
let a = await audited({ "https://good.example.in": html(200, GOOD) }, "https://good.example.in/");
check("good https responsive site -> ok", [a.verdict, a.evidence.length, a.https], ([v, n, h]) => v === "ok" && n === 0 && h === true);
check("its own phones are found and normalised", a.phones, (p) => p.includes("+919876543210") && p.includes("+919123456789") && p.includes("+916122345678"));
check("its own email is found, an image name is not", a.emails, (e) => e.length === 1 && e[0] === "info@vidyaclasses.in");
check("the title is decoded", a.title, (t) => t === "Vidya Classes & Academy, Patna");
a = await audited({ "https://vidyaclasses.wixsite.com/home": html(200, GOOD) }, "https://vidyaclasses.wixsite.com/home");
check("wix subdomain -> poor, naming wixsite.com", [a.verdict, a.evidence.map((e) => e.code)], ([v, c]) => v === "poor" && c.includes("free_builder"));
a = await audited({ "https://noview.example.in": html(200, NO_VIEWPORT) }, "noview.example.in");
check("no viewport -> poor (a URL typed without https:// works)", [a.verdict, a.evidence.map((e) => e.code)], ([v, c]) => v === "poor" && c.includes("no_viewport"));
a = await audited({ "https://old.example.in": html(200, OLD) }, "https://old.example.in");
check("copyright 2017 -> poor, stale", [a.verdict, a.evidence.map((e) => e.code)], ([v, c]) => v === "poor" && c.join() === "stale");
a = await audited({ "http://plain.example.in": html(200, GOOD) }, "http://plain.example.in");
check("http only -> poor, no_https", [a.verdict, a.evidence.map((e) => e.code)], ([v, c]) => v === "poor" && c.join() === "no_https");
a = await audited({ "https://quiet.example.in": html(200, NO_CONTACT) }, "https://quiet.example.in");
check("no contact/fee/admission words -> poor", [a.verdict, a.evidence.map((e) => e.code)], ([v, c]) => v === "poor" && c.includes("no_contact"));
a = await audited({ "https://missing.example.in": html(404, "<h1>Not Found</h1>") }, "https://missing.example.in");
check("404 -> broken", [a.verdict, a.evidence[0]?.code], ([v, c]) => v === "broken" && c === "http_404");
a = await audited({ "https://down.example.in": html(503, "Service Unavailable") }, "https://down.example.in");
check("503 -> broken", a.verdict, (v) => v === "broken");
a = await audited({ "https://vidya-old.in": html(200, PARKED) }, "https://vidya-old.in");
check("expired-domain page -> broken", [a.verdict, a.evidence[0]?.text], ([v, t]) => v === "broken" && /expired/.test(t));
a = await audited({ "https://vidya.co.in": html(200, FORSALE) }, "https://vidya.co.in");
check("domain-for-sale page -> broken", a.verdict, (v) => v === "broken");
a = await audited({ "https://moved.example.in": new Response(null, { status: 301, headers: { location: "https://www.sedo.com/search/?domain=moved" } }),
  "https://www.sedo.com/search/": html(200, GOOD) }, "https://moved.example.in");
check("a redirect to a domain-parking host -> broken", [a.verdict, a.finalUrl], ([v, f]) => v === "broken" && /sedo\.com/.test(f));
a = await audited({}, "https://gone.example.in", { "gone.example.in": "NXDOMAIN" });
check("DNS does not resolve -> broken, 'may have expired'", [a.verdict, a.evidence[0]?.code, a.evidence[0]?.text], ([v, c, t]) => v === "broken" && c === "dns" && /expired/.test(t));
a = await audited({}, "https://refused.example.in");
check("connection refused -> broken", [a.verdict, a.evidence[0]?.code], ([v, c]) => v === "broken" && c === "unreachable");
a = await audited({}, "");
check("no website -> none", a.verdict, (v) => v === "none");
a = await audited({}, "https://www.facebook.com/vidyaclasses");
check("a Facebook page as the website -> none, not fetched", [a.verdict, state.calls.some((c) => c.url.includes("facebook"))], ([v, f]) => v === "none" && !f);
a = await audited({}, "http://localhost:3000/");
check("localhost -> broken/blocked, never fetched", [a.verdict, state.calls.some((c) => c.url.includes("localhost"))], ([v, f]) => v === "broken" && !f);
a = await audited({}, "http://169.254.169.254/latest/meta-data/");
check("the cloud metadata address -> blocked, never fetched", [a.evidence[0]?.code, state.calls.some((c) => c.url.includes("169.254"))], ([c, f]) => c === "blocked" && !f);
a = await audited({ "https://evil.example.in": new Response(null, { status: 302, headers: { location: "http://10.0.0.5/admin" } }) }, "https://evil.example.in");
check("a redirect to a private address is blocked", [a.verdict, state.calls.some((c) => c.url.includes("10.0.0.5"))], ([v, f]) => v === "broken" && !f);
a = await audited({}, "https://rebind.example.in", { "rebind.example.in": "192.168.1.1" });
check("a name that resolves to a private address is blocked", [a.evidence[0]?.code, state.calls.some((c) => c.url.includes("rebind"))], ([c, f]) => c === "blocked" && !f);
a = await audited({}, "https://mapped.example.in", { "mapped.example.in": "::ffff:7f00:1" });
check("a name that resolves to IPv4-mapped IPv6 loopback (hex form) is blocked", [a.evidence[0]?.code, state.calls.some((c) => c.url.includes("mapped"))], ([c, f]) => c === "blocked" && !f);
a = await audited({}, "https://nat64.example.in", { "nat64.example.in": "64:ff9b::a9fe:a9fe" });
check("a name that resolves to NAT64 of the metadata address is blocked", [a.evidence[0]?.code, state.calls.some((c) => c.url.includes("nat64"))], ([c, f]) => c === "blocked" && !f);
reset({ sites: { "https://good.example.in": html(200, GOOD), "https://vidyaclasses.wixsite.com": html(200, GOOD) } });
r = await call({ body: { action: "audit", urls: ["https://good.example.in", "vidyaclasses.wixsite.com", null] } });
check("audit of several urls in one call, in order", r.json.audits?.map((x) => x.verdict).join(), (v) => v === "ok,poor,none");
// Never answers, but honours the abort signal the way real fetch does.
reset({ sites: { "https://slow.example.in": (u, init) => new Promise((_, reject) => {
  init.signal.addEventListener("abort", () => reject(init.signal.reason));
}) } });
{
  const t0 = Date.now();
  // AbortSignal.timeout does not hold the event loop open; a live server does.
  const alive = setTimeout(() => {}, 5000);
  const got = await audit.auditSite("https://slow.example.in", { totalMs: 300 });
  clearTimeout(alive);
  check("a site that never answers -> broken after the timeout", [got.verdict, got.evidence[0]?.code, Date.now() - t0], ([v, c, ms]) => v === "broken" && c === "timeout" && ms < 3000);
}

// ── Keys never leave ────────────────────────────────────────────────────────
log("Leaks");
check("no Google or AI key in any response or log line", leaks(seen), (l) => l.length === 0);

// ── Negative control: the checks above can fail ─────────────────────────────
log("Negative control");
{
  const planted = [...seen, `oops ${KEY1}`];
  const caught = leaks(planted).length === 1;
  const wrong = audit.classify({ finalUrl: new URL("https://x.wixsite.com"), status: 200, html: GOOD, ms: 100 }, new URL("https://x.wixsite.com"));
  const badVerdictCaught = wrong.verdict !== "ok";
  origError(`${caught && badVerdictCaught ? "ok   " : "FAIL "} a planted key is caught, and a wix site is not called ok`);
  if (!(caught && badVerdictCaught)) fails.push("negative control");
}

origError(fails.length ? `\n${fails.length} FAILED` : "\nAll passed");
process.exit(fails.length ? 1 : 0);
