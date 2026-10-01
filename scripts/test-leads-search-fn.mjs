/**
 * Test the Lead Finder function, api/leads-search.js, with every network call mocked.
 *
 *   node scripts/test-leads-search-fn.mjs
 *
 * globalThis.fetch plays Supabase, Google Places, OpenStreetMap (Nominatim
 * and the three Overpass servers) and the websites being audited; DNS is
 * replaced too (siteAudit deps.lookup), and OSM's waits are recorded instead
 * of slept. Nothing leaves this machine. It runs the REAL handler, like
 * test-poster-fn.mjs does.
 *
 * Checked on every response and log line: a Google key never appears. The
 * negative control at the end proves the checks can fail.
 */
import { readFileSync } from "node:fs";

process.env.VITE_SUPABASE_URL = "https://sb.test";
process.env.VITE_SUPABASE_ANON_KEY = "anon-public-key";

const KEY1 = "AIzaFAKEmapsKEYnumber1000000000000000001";
const KEY2 = "AIzaFAKEmapsKEYnumber2000000000000000002";
const GEMINI = "AIzaFAKEgeminiKEY000000000000000000009";
const ALL_KEYS = [KEY1, KEY2, GEMINI];
// The order the task fixed (28 Sep 2026): overpass-api.de, then maps.mail.ru, then overpass.kumi.systems.
const OVERPASS_HOSTS = ["overpass-api.de", "maps.mail.ru", "overpass.kumi.systems"];

// ── OpenStreetMap's replies, in OSM's own shape (fictional places) ───────────
const PATNA_HIT = { lat: "25.6093239", lon: "85.1235252", boundingbox: ["25.5389546", "25.6510479", "85.0118412", "85.2641902"],
  osm_type: "way", osm_id: 383774533, category: "place", type: "city", display_name: "Patna, Bihar, India" };
const OSM_NODE = (id, tags, extra = {}) => ({ type: "node", id, lat: 25.61 + id / 1e6, lon: 85.13, tags, ...extra });
const OSM_COACHING = [
  OSM_NODE(101, { amenity: "prep_school", name: "Example Physics Classes", "contact:phone": "+91 98765 43210; 0612 2345678",
    "addr:housenumber": "12", "addr:street": "Boring Road", "addr:city": "Patna", "addr:postcode": "800001", "contact:website": "example-physics.example.in" }),
  { type: "way", id: 202, center: { lat: 25.6, lon: 85.1 }, tags: { office: "educational_institution", name: "Example JEE Academy", phone: "09876543211", website: "https://example-jee.example.in/" } },
  OSM_NODE(303, { amenity: "hospital", name: "Example Hospital and Research Institute" }),
  OSM_NODE(304, { amenity: "clinic", healthcare: "clinic", name: "Example Care Institute" }),
  OSM_NODE(305, { amenity: "college", name: "Example Institute of Technology" }),
  OSM_NODE(306, { name: "Example Institute of Medical Sciences", healthcare: "hospital" }),
  OSM_NODE(307, { amenity: "prep_school" }),
];
const OSM_DENTAL = [
  OSM_NODE(401, { amenity: "dentist", healthcare: "dentist", name: "डॉ उदाहरण डेंटल", "name:en": "Dr Example Dental", phone: "9876543212" }),
  OSM_NODE(402, { amenity: "dentist", name: "Example Orthodontic and Aligner Centre", "healthcare:speciality": "orthodontics" }),
  OSM_NODE(403, { amenity: "clinic", name: "Example Smile Dental Clinic", mobile: "+91-98765-43213" }),
];

let state;
let sleeps = [];
function reset(over = {}) {
  state = { keys: [], missingTable: false, google: {}, sites: {}, dns: {}, calls: [], patches: [],
    nominatim: (u) => json(200, u.searchParams.get("q") === "Nowhereville" ? [] : [PATNA_HIT]),
    overpass: () => json(200, { version: 0.6, elements: OSM_COACHING }), ...over };
  sleeps = [];
  osm?.resetOsmCaches();
}
const osmCalls = (host) => state.calls.filter((c) => new URL(c.url).host === host);
const overpassCalls = () => state.calls.filter((c) => OVERPASS_HOSTS.includes(new URL(c.url).host));
const queryOf = (c) => decodeURIComponent(c.body.replace(/^data=/, ""));
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
  if (u.host === "nominatim.openstreetmap.org") return state.nominatim(u, headers);
  if (OVERPASS_HOSTS.includes(u.host)) {
    return state.overpass(u.host, decodeURIComponent(body.replace(/^data=/, "")), headers, init);
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

// OSM: waits are recorded, never slept; the caches start empty for every case.
var osm = await import("../api/_lib/osm.js");
osm.deps.sleep = async (ms) => { sleeps.push(ms); };

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
check("neither Google nor OpenStreetMap was called for any of them", state.calls.filter((c) => !c.url.startsWith("https://sb.test")).length, (n) => n === 0);
check("GET -> 405", (await call({ method: "GET" })).status, (s) => s === 405);

log("Body");
check("unknown action -> 400", (await call({ body: { action: "delete" } })).status, (s) => s === 400);
check("search without type/city/query -> 400", (await call({ body: { action: "search", city: "Patna" } })).status, (s) => s === 400);
check("details with a path in placeId -> 400", (await call({ body: { action: "details", placeId: "../../v1/x" } })).status, (s) => s === 400);
check("audit with 11 urls -> 400", (await call({ body: { action: "audit", urls: Array(11).fill("a.in") } })).status, (s) => s === 400);
check("a pageToken with spaces -> 400", (await call({ body: { ...S, pageToken: "a b" } })).status, (s) => s === 400);
check("broken JSON -> 400", (await call({ body: "{not json" })).status, (s) => s === 400);

// ── No keys: the search goes to OpenStreetMap ───────────────────────────────
log("No keys -> OpenStreetMap");
reset();
let r = await call({ body: S });
check("no keys -> 200 from OpenStreetMap, fallback no_keys", [r.status, r.json.source, r.json.fallback?.code, r.json.fallback?.reason],
  ([s, src, c, why]) => s === 200 && src === "osm" && c === "no_keys" && /No Google Maps key is saved/.test(why));
check("no Google call was made", state.calls.some((c) => c.url.includes("googleapis")), (g) => g === false);
reset({ keys: [geminiRow()] });
r = await call({ body: S });
check("an AI key alone is not a Maps key -> OSM, and Gemini's key is never sent to Google", [r.status, r.json.source, state.calls.some((c) => c.url.includes("googleapis"))],
  ([s, src, g]) => s === 200 && src === "osm" && !g);
check("... nor to OpenStreetMap", state.calls.filter((c) => !c.url.startsWith("https://sb.test")).map((c) => c.url + c.body + JSON.stringify(c.headers)).join(),
  (t) => !t.includes(GEMINI));
reset({ keys: [keyRow(KEY1, 1, { enabled: false })] });
r = await call({ body: S });
check("a switched-off key -> OSM", [r.status, r.json.source], ([s, src]) => s === 200 && src === "osm");
reset({ missingTable: true });
r = await call({ body: S });
check("table missing -> OSM, the reason pointing at 0006 and 0009", [r.status, r.json.source, r.json.fallback?.reason],
  ([s, src, e]) => s === 200 && src === "osm" && /0006/.test(e) && /0009/.test(e));
reset();
r = await call({ body: { action: "details", placeId: "ChIJplace000007xyz" } });
check("details with no keys is still 422 no_keys (OSM has no details)", [r.status, r.json.code], ([s, c]) => s === 422 && c === "no_keys");

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
check("attribution says Google Maps, source google", [r.json.attribution, r.json.source, r.json.places[0].source], ([a, s, ps]) => a === "Google Maps" && s === "google" && ps === "google");
check("a working Google key: OpenStreetMap is not asked", state.calls.filter((c) => /openstreetmap|overpass|mail\.ru/.test(c.url)).length, (n) => n === 0);
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
check("every key fails -> OSM answers, with each key's error in fallback.attempts", [r.status, r.json.source, r.json.fallback?.attempts?.length],
  ([s, src, n]) => s === 200 && src === "osm" && n === 2);
check("the Places-not-enabled message still reaches the admin", r.text, (t) => /has not been used in project|disabled/.test(t));
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: quota, [KEY2]: quota } });
r = await call({ body: S });
check("every key out of quota -> OSM, fallback code quota", [r.status, r.json.source, r.json.fallback?.code, r.json.fallback?.reason],
  ([s, src, c, why]) => s === 200 && src === "osm" && c === "quota" && /out of quota/.test(why));
reset({ keys: [keyRow(KEY1, 1, { last_error: "limit: quota", last_error_at: new Date().toISOString() })], google: { [KEY1]: () => { throw new Error("parked"); } } });
r = await call({ body: S });
check("the only key parked for today -> OSM straight away, fallback quota", [r.status, r.json.source, r.json.fallback?.code], ([s, src, c]) => s === 200 && src === "osm" && c === "quota");
const billing = () => json(403, { error: { code: 403, status: "PERMISSION_DENIED", message: "This API method requires billing to be enabled. Please enable billing on project #123." } });
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: billing } });
r = await call({ body: S });
check("billing off -> OSM, fallback code billing", [r.status, r.json.source, r.json.fallback?.code], ([s, src, c]) => s === 200 && src === "osm" && c === "billing");
reset({ keys: [keyRow(KEY1, 1)] });
r = await call({ body: S });
check("an invalid key -> OSM answers, and the key's error is recorded on the key", [r.status, r.json.source, state.patches[0]?.body.last_error],
  ([s, src, e]) => s === 200 && src === "osm" && /^error: .*API key not valid/.test(e));
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: denied, [KEY2]: quota } });
r = await call({ body: { ...S, pageToken: "NEXTtoken123" } });
check("a Google 'Load more' when every key fails -> 502 all_failed (not a silent switch to OSM)", [r.status, r.json.code, overpassCalls().length],
  ([s, c, n]) => s === 502 && c === "all_failed" && n === 0);
r = await call({ body: { action: "details", placeId: "ChIJplace000007xyz" } });
check("details when every key fails -> 502 all_failed", [r.status, r.json.code], ([s, c]) => s === 502 && c === "all_failed");
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

// ── OpenStreetMap ───────────────────────────────────────────────────────────
log("OpenStreetMap: geocode and query");
reset();
r = await call({ body: S });
const geo = osmCalls("nominatim.openstreetmap.org");
check("one Nominatim call, format=jsonv2, India only, q=Patna", geo.map((c) => new URL(c.url)), (u) => u.length === 1
  && u[0].origin + u[0].pathname === "https://nominatim.openstreetmap.org/search" && u[0].searchParams.get("format") === "jsonv2"
  && u[0].searchParams.get("countrycodes") === "in" && u[0].searchParams.get("q") === "Patna");
check("Nominatim gets a descriptive User-Agent with the live site URL (not ideovent.in, which does not resolve yet)", geo[0].headers["user-agent"],
  (ua) => /^IdeoventLeadFinder\/1\.0 \(\+https:\/\/ideovent\.vercel\.app; admin lead finder\)$/.test(ua) && !/ideovent\.in/.test(ua));
check("the User-Agent follows VITE_PUBLIC_URL, and only a bare site address", [osm.siteUrl({ VITE_PUBLIC_URL: "https://www.ideovent.in/" }),
  osm.siteUrl({ VITE_PUBLIC_URL: "https://x.in\r\nX-Evil: 1" }), osm.siteUrl({})],
  ([a, b, c]) => a === "https://www.ideovent.in" && b === "https://ideovent.vercel.app" && c === "https://ideovent.vercel.app");
const op = overpassCalls();
check("Overpass: POST data=... to overpass-api.de first, form-encoded", [op.length, op[0]?.url, op[0]?.method, op[0]?.headers["content-type"], op[0]?.body.slice(0, 5)],
  ([n, u, m, t, b]) => n === 1 && u === "https://overpass-api.de/api/interpreter" && m === "POST" && /x-www-form-urlencoded/.test(t) && b === "data=");
const q1 = queryOf(op[0]);
check("the query is JSON, with a modest declared time and memory, inside Patna's box, tags and centres only", q1,
  (q) => q.startsWith("[out:json][timeout:15][maxsize:268435456][bbox:25.") && /out tags center qt \d+;$/.test(q));
check("each Overpass call names the app in its User-Agent", op[0]?.headers["user-agent"], (ua) => /^IdeoventLeadFinder\/1\.0 /.test(ua));
check("the coaching query itself excludes healthcare and hospital-like amenities", q1, (q) => q.includes('amenity"="prep_school"') && q.includes('[!"healthcare"]')
  && /hospital\|clinic/.test(q));

log("OpenStreetMap: tags -> results");
check("answer: source osm, © OpenStreetMap contributors, ODbL, the honest note", [r.status, r.json.source, r.json.attribution, r.json.licence, r.json.attributionUrl, r.json.note],
  ([s, src, a, l, u, n]) => s === 200 && src === "osm" && a === "© OpenStreetMap contributors" && l === "ODbL" && u === "https://www.openstreetmap.org/copyright"
    && /fewer businesses and fewer phone numbers than Google Maps/.test(n));
const names = r.json.places.map((p) => p.name);
check("coaching keeps the classes and the academy", names, (n) => n.includes("Example Physics Classes") && n.includes("Example JEE Academy"));
check("coaching drops the hospital, the clinic, the college and the medical institute", names, (n) => !n.some((x) => /Hospital|Care Institute|Technology|Medical/.test(x)));
check("a nameless element is dropped", r.json.places.length, (n) => n === 2);
const phys = r.json.places.find((p) => p.name === "Example Physics Classes");
check("a node maps to the result shape: id, OSM link, address from addr:*, first phone of several, website, lat/lon", phys, (p) => p.placeId === "osm:node/101"
  && p.mapsUrl === "https://www.openstreetmap.org/node/101" && p.address === "12 Boring Road, Patna, 800001" && p.phone === "+91 98765 43210"
  && p.phoneIntl === "+919876543210" && p.website === "example-physics.example.in" && typeof p.lat === "number" && typeof p.lon === "number"
  && p.rating === null && p.source === "osm" && p.primaryType === "prep_school");
const jee = r.json.places.find((p) => p.name === "Example JEE Academy");
check("a way uses its centre, phone from phone, website from website", jee, (p) => p.placeId === "osm:way/202" && p.lat === 25.6 && p.lon === 85.1
  && p.phoneIntl === "+919876543211" && p.website === "https://example-jee.example.in/" && p.mapsUrl.endsWith("/way/202"));
check("results with a phone come first", r.json.places.every((p) => !!p.phone), (v) => v === true);

log("OpenStreetMap: dental presets");
reset({ overpass: () => json(200, { elements: OSM_DENTAL }) });
r = await call({ body: { action: "search", type: "dental clinic", city: "Patna", preset: "dental" } });
const qd = queryOf(overpassCalls()[0]);
check("dental preset asks for amenity=dentist and healthcare=dentist, and dental names on clinics", qd,
  (q) => q.includes('nwr["amenity"="dentist"]') && q.includes('nwr["healthcare"="dentist"]') && /clinic\|doctors\|hospital/.test(q) && /dental\|dentist/.test(q));
check("dental: all three clinics, the Devanagari name shown as its English name", r.json.places.map((p) => p.name).sort(),
  (n) => n.length === 3 && n.includes("Dr Example Dental") && n.includes("Example Smile Dental Clinic"));
check("dental: mobile tag gives the phone, category says dentist", r.json.places.find((p) => p.name === "Example Smile Dental Clinic"),
  (p) => p.phoneIntl === "+919876543213" && p.primaryType === "clinic");
check("an orthodontics speciality shows in the category", r.json.places.find((p) => p.placeId === "osm:node/402")?.primaryType, (c) => c === "dentist (orthodontics)");
r = await call({ body: { action: "search", type: "orthodontist", city: "Patna", preset: "ortho" } });
check("ortho preset narrows to the orthodontist, same Overpass answer from the cache", [r.json.places.map((p) => p.placeId).join(), overpassCalls().length, r.json.broadened],
  ([ids, n, b]) => ids === "osm:node/402" && n === 1 && !b);
r = await call({ body: { action: "search", type: "pediatric dentist", city: "Patna", preset: "kids" } });
check("kids preset with no children's dentist -> all dental clinics, said plainly", [r.json.places.length, r.json.broadened],
  ([n, b]) => n === 3 && /no children's dentists by name in Patna/.test(b) && /all the dental clinics/.test(b));
r = await call({ body: { action: "search", type: "Dental implant centre", city: "Patna" } });
check("typed 'Dental implant centre' (no preset) is read as the implant spec", [r.status, r.json.places.length, r.json.broadened],
  ([s, n, b]) => s === 200 && n === 3 && /implant/.test(b));
check("a preset id that is not a word -> 400", (await call({ body: { ...S, preset: "x y;" } })).status, (s) => s === 400);
reset({ overpass: () => json(200, { elements: [
  OSM_NODE(404, { amenity: "clinic", healthcare: "clinic", "healthcare:speciality": "paediatric_dentistry", name: "Example Little Smiles" }),
  OSM_NODE(405, { amenity: "hospital", healthcare: "hospital", "healthcare:speciality": "accident_and_emergency", name: "Example General Hospital" }),
  OSM_NODE(406, { amenity: "dentist", name: "Example Tooth Care" }),
  // Found by the speciality selector, but a polyclinic and a hospital that list a dentist among others: not dental clinics.
  OSM_NODE(407, { amenity: "clinic", healthcare: "clinic", "healthcare:speciality": "dentist;dermatology;gynaecology", name: "Example Care Polyclinic" }),
  OSM_NODE(408, { amenity: "hospital", "healthcare:speciality": "cardiologist, dentist, dermatologist", name: "Example City Hospital" }),
] }) });
r = await call({ body: { action: "search", type: "pediatric dentist", city: "Patna", preset: "kids" } });
check("a clinic tagged only with a dental speciality is asked for, kept, and found by the kids preset", [queryOf(overpassCalls()[0]), r.json.places.map((p) => p.placeId).join()],
  ([q, ids]) => q.includes('nwr["healthcare:speciality"~"dental|dentist|odont",i]') && ids === "osm:node/404");
check("... and its category says dentist, with the speciality", r.json.places[0]?.primaryType, (c) => c === "dentist (paediatric_dentistry)");
r = await call({ body: { action: "search", type: "dental clinic", city: "Patna", preset: "dental" } });
check("... while an A&E hospital, a polyclinic and a multi-speciality hospital that list a dentist are not dental clinics", r.json.places.map((p) => p.placeId).sort().join(),
  (ids) => ids === "osm:node/404,osm:node/406");
check("a polyclinic's category is just 'clinic', so the page cannot take it for a dentist", osm.categoryOf({ amenity: "clinic", "healthcare:speciality": "dentist;dermatology" }),
  (c) => c === "clinic");
{
  // Every Lead Finder preset id has an OSM spec of its own.
  const src = readFileSync(new URL("../src/lib/leadFinder/leads.ts", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("export const TYPE_PRESETS"), src.indexOf("];", src.indexOf("export const TYPE_PRESETS")));
  const ids = [...block.matchAll(/\{ id: "([a-z0-9_-]+)"/g)].map((m) => m[1]);
  check(`every preset in leads.ts (${ids.length}) has an OSM spec`, ids, (l) => l.length >= 12 && l.every((id) => osm.SPECS[id]?.id === id));
  check("the five dental presets are there", ids, (l) => ["dental", "ortho", "implant", "kids", "cosmetic"].every((id) => l.includes(id)));
}

log("OpenStreetMap: schools, CBSE and typed types");
reset({ overpass: () => json(200, { elements: [
  OSM_NODE(601, { amenity: "school", name: "Example Public School", "contact:mobile": "+91 98765 43214" }),
  OSM_NODE(602, { amenity: "school", name: "Example Girls High School" }),
] }) });
r = await call({ body: { action: "search", type: "CBSE school", city: "Patna", preset: "cbse" } });
check("CBSE preset: amenity=school, every school, and one plain line saying OSM has no board", [r.status, r.json.places.length, r.json.caveat, r.json.broadened, queryOf(overpassCalls()[0])],
  ([s, n, c, b, q]) => s === 200 && n === 2 && /does not record a school's board/.test(c) && /CBSE or not/.test(c) && b === undefined && q.includes('nwr["amenity"="school"]'));
check("contact:mobile gives the phone too", r.json.places.find((p) => p.placeId === "osm:node/601")?.phoneIntl, (p) => p === "+919876543214");
reset({ overpass: () => json(200, { elements: [
  OSM_NODE(701, { leisure: "fitness_centre", name: "Example Fitness Studio" }),
  { type: "way", id: 702, center: { lat: 25.6, lon: 85.1 }, tags: { highway: "residential", name: "Gym Road" } },
  { type: "way", id: 703, center: { lat: 25.6, lon: 85.1 }, tags: { building: "yes", leisure: "fitness_centre", name: "Example Gym" } },
] }) });
r = await call({ body: { action: "search", type: "gym", city: "Patna" } });
check("a typed 'gym' asks for fitness centres, and a road called Gym Road is not a gym", [r.status, r.json.places.map((p) => p.name).sort().join("|"), queryOf(overpassCalls()[0])],
  ([s, n, q]) => s === 200 && n === "Example Fitness Studio|Example Gym" && q.includes('nwr["leisure"="fitness_centre"]'));
reset();
r = await call({ body: { action: "search", type: "!!", city: "Patna" } });
check("a type with no letters -> 400 osm_type in plain words, nothing asked", [r.status, r.json.code, r.json.error, overpassCalls().length],
  ([s, c, e, n]) => s === 400 && c === "osm_type" && /English letters/.test(e) && n === 0);

log("OpenStreetMap: servers, retries, cache, pages");
{
  const tried = [];
  reset({ overpass: (host) => { tried.push(host); return host === "overpass-api.de" ? new Response("<html>504 Gateway Timeout</html>", { status: 504 }) : json(200, { elements: OSM_COACHING }); } });
  r = await call({ body: S });
  check("overpass-api.de busy at once, twice -> one retry, then maps.mail.ru answers", [r.status, r.json.places?.length, tried.join(",")],
    ([s, n, t]) => s === 200 && n === 2 && t === "overpass-api.de,overpass-api.de,maps.mail.ru");
  check("a short wait before the retry", sleeps.some((ms) => ms >= 500 && ms <= 1000), (v) => v === true);
}
{
  const tried = [];
  reset({ overpass: (host) => { tried.push(host); return host === "overpass.kumi.systems" ? json(200, { elements: OSM_COACHING }) : json(429, { remark: "rate limited" }); } });
  r = await call({ body: S });
  check("429 on the first two servers -> the third, kumi, answers (2 tries each, in the fixed order)", [r.status, tried.join(",")],
    ([s, t]) => s === 200 && t === "overpass-api.de,overpass-api.de,maps.mail.ru,maps.mail.ru,overpass.kumi.systems");
}
{
  // A server that never answers in time: its retry waits until the others have had their turn.
  const tried = [];
  reset({ overpass: (host) => {
    tried.push(host);
    if (host === "maps.mail.ru") return json(200, { elements: OSM_COACHING });
    throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  } });
  r = await call({ body: S });
  check("overpass-api.de times out -> maps.mail.ru is asked next, before any retry", [r.status, tried.join(",")],
    ([s, t]) => s === 200 && t === "overpass-api.de,maps.mail.ru");
}
{
  // A 504 that took 9 s (the usual sign of an overloaded server): same, the next server first.
  const tried = [];
  const realNow = osm.deps.now;
  let skew = 0;
  osm.deps.now = () => Date.now() + skew;
  reset({ overpass: (host) => {
    tried.push(host);
    if (host === "overpass-api.de") { skew += 9_000; return new Response("<html>504 Gateway Time-out</html>", { status: 504 }); }
    if (host === "maps.mail.ru") { skew += 12_000; throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); }
    return json(200, { elements: OSM_COACHING });
  } });
  let got;
  try {
    got = await osm.overpass("[out:json];node(1);out;", { deadline: osm.deps.now() + 27_000 });
  } catch (e) { got = e; }
  osm.deps.now = realNow;
  check("a slow 504, then a time-out -> the third server is tried before either retry", [got?.endpoint, tried.join(",")],
    ([e, t]) => e === "https://overpass.kumi.systems/api/interpreter" && t === "overpass-api.de,maps.mail.ru,overpass.kumi.systems");
}
{
  // Out of time: a plain osm_time error, never a crash, and never past the deadline.
  const realNow = osm.deps.now;
  let skew = 0;
  osm.deps.now = () => Date.now() + skew;
  reset({ overpass: () => { skew += 12_000; throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); } });
  let got;
  try {
    got = await osm.overpass("[out:json];node(2);out;", { deadline: osm.deps.now() + 27_000 });
  } catch (e) { got = e; }
  osm.deps.now = realNow;
  check("every server hangs -> stops at the deadline with osm_time, in plain words", [got?.code, got?.message, overpassCalls().length],
    ([c, m, n]) => c === "osm_time" && /too slow this time/.test(m) && /Try again in a minute/.test(m) && n === 3);
}
{
  reset({ overpass: () => json(200, { elements: [], remark: "runtime error: Query timed out in \"query\" at line 1 after 21 seconds." }) });
  r = await call({ body: S });
  check("a server-side time-out remark is not taken for 'nothing found': all six tries, then a plain error", [r.status, r.json.code, overpassCalls().length, r.json.error],
    ([s, c, n, e]) => s === 502 && c === "osm_busy" && n === 6 && /busy/.test(e) && /Try again/.test(e));
}
{
  reset({ overpass: () => { const e = new TypeError("fetch failed"); e.cause = { code: "ECONNRESET" }; throw e; } });
  r = await call({ body: S });
  check("every Overpass server unreachable -> 502 osm_busy, fail soft, no crash", [r.status, r.json.code, r.json.ok], ([s, c, ok]) => s === 502 && c === "osm_busy" && ok === false);
  check("... and the Google reason is still given", r.json.fallback?.code, (c) => c === "no_keys");
}
reset();
r = await call({ body: { ...S, city: "Nowhereville" } });
check("a city OSM does not know -> 422 osm_city, in plain words, Overpass not asked", [r.status, r.json.code, r.json.error, overpassCalls().length],
  ([s, c, e, n]) => s === 422 && c === "osm_city" && /does not know a place called "Nowhereville"/.test(e) && n === 0);
reset();
await call({ body: S });
await call({ body: { ...S, type: "school" } });
check("the same city twice -> Nominatim asked once (cached)", osmCalls("nominatim.openstreetmap.org").length, (n) => n === 1);
await call({ body: { ...S, city: "Gaya" } });
check("a second city -> Nominatim waits about 1 s after the last call", [osmCalls("nominatim.openstreetmap.org").length, Math.max(0, ...sleeps)],
  ([n, w]) => n === 2 && w >= 900 && w <= 1000);
{
  const many = Array.from({ length: 25 }, (_, i) => OSM_NODE(500 + i, { amenity: "prep_school", name: `Example Tutorial ${String(i).padStart(2, "0")}`, ...(i % 2 ? { phone: "98765432" + String(10 + i) } : {}) }));
  reset({ overpass: () => json(200, { elements: many }) });
  const p1 = await call({ body: S });
  const googleBefore = state.calls.filter((c) => c.url.includes("googleapis") || c.url.includes("/ai_provider_keys")).length;
  const p2 = await call({ body: { ...S, pageToken: p1.json.nextPageToken } });
  check("page 1: 20 of 25, token osm.20", [p1.json.places.length, p1.json.total, p1.json.nextPageToken], ([n, t, k]) => n === 20 && t === 25 && k === "osm.20");
  check("page 2: the last 5, no token, from the cache (one Overpass call in all)", [p2.json.places.length, p2.json.nextPageToken, overpassCalls().length],
    ([n, k, c]) => n === 5 && k === null && c === 1);
  check("an OSM 'Load more' never reads the Google keys", state.calls.filter((c) => c.url.includes("googleapis") || c.url.includes("/ai_provider_keys")).length - googleBefore, (n) => n === 0);
  check("no result is on both pages", new Set([...p1.json.places, ...p2.json.places].map((p) => p.placeId)).size, (n) => n === 25);
}
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

log("Audit: dental checks");
const DENTAL_BARE = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Example Dental Clinic</title></head>
<body><h1>Example Dental Clinic</h1><p>Gentle care for the whole family. Call us on <a href="tel:+919876543210">+91 98765 43210</a>.</p>
<p>Address: 12 Example Road, Patna.</p><p>© ${YEAR} Example Dental Clinic</p></body></html>`;
const DENTAL_FULL = DENTAL_BARE.replace("</body>", `<a href="/treatments/root-canal">Root canal</a> <a href="https://wa.me/919876543210">WhatsApp us</a>
<a href="/contact#form" class="btn">Book an appointment</a></body>`);
const DENTAL_JS = `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><div id="root"></div><script src="/app.js"></script></body></html>`;
reset({ sites: { "https://bare.example.in": html(200, DENTAL_BARE), "https://full.example.in": html(200, DENTAL_FULL), "https://spa.example.in": html(200, DENTAL_JS) } });
r = await call({ body: { action: "audit", urls: ["https://bare.example.in", "https://full.example.in", "https://spa.example.in"], kind: "dental" } });
const [bare, full, spa] = r.json.audits || [];
check("a dental site with no booking, WhatsApp or treatment pages -> poor with the three dental codes", [bare?.verdict, bare?.evidence.map((e) => e.code).join()],
  ([v, c]) => v === "poor" && c === "no_booking,no_whatsapp,no_treatments");
check("the dental sentences are plain", bare?.evidence.map((e) => e.text).join(" | "), (t) => /No online booking/.test(t) && /No WhatsApp button/.test(t) && /No treatment pages/.test(t));
check("a dental site with a booking link, WhatsApp and a treatment page -> ok", [full?.verdict, full?.evidence.length], ([v, n]) => v === "ok" && n === 0);
check("a page drawn by scripts is not accused of missing them (cannot be verified)", spa?.evidence.map((e) => e.code), (c) => !c.some((x) => /no_booking|no_whatsapp|no_treatments/.test(x)));
/* 30 Sep 2026: a clinic is told "your home page does not show a phone number" (no_contact) only when that is true. */
check("a clinic page drawn by scripts is not told it shows no phone number either", spa?.evidence.map((e) => e.code), (c) => !c.includes("no_contact"));
/* 30 Sep 2026: and it is not called "ok" either (the badge would say it opens fine with contact details): "unchecked". */
check("a clinic page drawn by scripts -> unchecked (Could not check), with one plain reason", [spa?.verdict, spa?.evidence.map((e) => e.code).join(), spa?.evidence[0]?.text],
  ([v, c, t]) => v === "unchecked" && c === "scripted" && /drawn by scripts/.test(t || ""));
reset({ sites: { "https://spa-school.example.in": html(200, DENTAL_JS), "http://spa-plain.example.in": html(200, DENTAL_JS.replace(/<meta name="viewport"[^>]*>/, "")) } });
r = await call({ body: { action: "audit", urls: ["https://spa-school.example.in", "http://spa-plain.example.in"] } });
check("a school page drawn by scripts is not told it has no contact details: unchecked", [r.json.audits?.[0]?.verdict, r.json.audits?.[0]?.evidence.map((e) => e.code).join()],
  ([v, c]) => v === "unchecked" && c === "scripted");
check("a page drawn by scripts still gets the checks that do not read its text (no viewport, no HTTPS) -> poor, and nothing else",
  [r.json.audits?.[1]?.verdict, r.json.audits?.[1]?.evidence.map((e) => e.code).sort().join()], ([v, c]) => v === "poor" && c === "no_https,no_viewport");
const DENTAL_DIGITS = `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><h1>Example Dental Clinic</h1>
<p>Gentle care for the whole family. Ring 0612 2345678 or write to hello@digits-clinic.in.</p><a href="/treatments/root-canal">Root canal</a></body></html>`;
reset({ sites: { "https://digits.example.in": html(200, DENTAL_DIGITS) } });
r = await call({ body: { action: "audit", urls: ["https://digits.example.in"], kind: "dental" } });
check("a clinic page that shows its number in plain text (no contact words) is not given no_contact", r.json.audits?.[0]?.evidence.map((e) => e.code), (c) => Array.isArray(c) && !c.includes("no_contact") && c.includes("no_booking"));
r = await call({ body: { action: "audit", urls: ["https://digits.example.in"] } });
check("the same page for a school still gets no_contact, as before (no contact, fee or admission words)", r.json.audits?.[0]?.evidence.map((e) => e.code), (c) => Array.isArray(c) && c.includes("no_contact"));
reset({ sites: { "https://bare.example.in": html(200, DENTAL_BARE) } });
r = await call({ body: { action: "audit", urls: ["https://bare.example.in"] } });
check("the same site without kind: no dental checks, ok", [r.json.audits?.[0]?.verdict, r.json.audits?.[0]?.evidence.length], ([v, n]) => v === "ok" && n === 0);
check("an unknown audit kind -> 400", (await call({ body: { action: "audit", urls: ["https://bare.example.in"], kind: "hospital" } })).status, (s) => s === 400);
r = await call({ body: { action: "audit", urls: [""], kind: "dental" } });
check("no website -> none, in words that name no map", [r.json.audits?.[0]?.verdict, r.json.audits?.[0]?.evidence[0]?.text], ([v, t]) => v === "none" && !/Google/.test(t));
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
