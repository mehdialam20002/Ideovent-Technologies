/**
 * Test the Lead Finder function, api/leads-search.js, with every network call mocked.
 *
 *   node scripts/test-leads-search-fn.mjs
 *   LEADS_NEGATIVE=1 node scripts/test-leads-search-fn.mjs     proves the new checks can fail (must exit 1)
 *
 * globalThis.fetch plays Supabase, Google Places, OpenStreetMap (Nominatim
 * and the three Overpass servers) and the websites being audited; DNS is
 * replaced too (siteAudit deps.lookup), and OSM's waits are recorded instead
 * of slept. Nothing leaves this machine. It runs the REAL handler, like
 * test-poster-fn.mjs does.
 *
 * FREE FIRST (4 Oct 2026). A search is OpenStreetMap unless the body says
 * google: true: no key is read for it, a working or a failing key alike. Google
 * answers only a search that asks for it, and says why when no key works.
 * OpenStreetMap: the city as a settlement (a boundary, an outline or a point),
 * the area searched (inside the boundary, the outline's box, or a circle; a
 * boundary is looked up only when a search keeps to it), what is not a place
 * (4 Oct 2026: "Delhi NCR" is Delhi with a note, "NCR" alone asks for a city,
 * a restaurant is never taken by its own name but a landmark is, a Devanagari
 * "साकेत, नई दिल्ली" and a short "Gorakhpur UP" are found), the tags and names
 * per preset (a dental college or AIIMS is not a clinic), one result per
 * business (the same name and website too), the counts, the servers in order
 * with their retries (each named once when all fail; an answer that stalls is
 * a time-out), and "Load more" from the cache.
 *
 * Checked on every response and log line: a Google key never appears. The
 * negative control at the end proves the checks can fail; LEADS_NEGATIVE=1
 * plants two mistakes (in the "Free first" section every search asks Google
 * too, as the finder did before 4 Oct 2026; and coaching keeps everything)
 * and the run must then fail, and exit 1.
 */
import { readFileSync } from "node:fs";

process.env.VITE_SUPABASE_URL = "https://sb.test";
process.env.VITE_SUPABASE_ANON_KEY = "anon-public-key";
delete process.env.VITE_PUBLIC_URL;
const NEGATIVE = !!process.env.LEADS_NEGATIVE;
/* LEADS_NEGATIVE's first planted mistake lives only in the "Free first" section, so the OpenStreetMap sections still run. */
let plantGoogle = NEGATIVE;

const KEY1 = "AIzaFAKEmapsKEYnumber1000000000000000001";
const KEY2 = "AIzaFAKEmapsKEYnumber2000000000000000002";
const GEMINI = "AIzaFAKEgeminiKEY000000000000000000009";
const ALL_KEYS = [KEY1, KEY2, GEMINI];
// The order of 4 Oct 2026: overpass-api.de, then overpass.private.coffee (once kumi.systems), then maps.mail.ru.
const OVERPASS_HOSTS = ["overpass-api.de", "overpass.private.coffee", "maps.mail.ru"];

// ── OpenStreetMap's replies, in OSM's own shape (fictional places, real ids for the boundaries) ──
const PATNA_HIT = { lat: "25.6093239", lon: "85.1235252", boundingbox: ["25.5389546", "25.6510479", "85.0118412", "85.2641902"],
  osm_type: "way", osm_id: 383774533, category: "place", type: "city", addresstype: "city", place_rank: 16, name: "Patna",
  display_name: "Patna, Patna Rural, Patna, Bihar, India" };
const GOPALGANJ_DISTRICT = { lat: "26.4609692", lon: "84.4398292", boundingbox: ["26.2033998", "26.6391981", "83.9065327", "84.9068657"],
  osm_type: "relation", osm_id: 1960158, category: "boundary", type: "administrative", addresstype: "state_district", place_rank: 10,
  name: "Gopalganj", display_name: "Gopalganj, Bihar, India" };
const GOPALGANJ_BLOCK = { lat: "26.5", lon: "84.45", boundingbox: ["26.4399897", "26.6351738", "84.3794202", "84.5447654"],
  osm_type: "relation", osm_id: 10253513, category: "boundary", type: "administrative", addresstype: "county", place_rank: 12,
  name: "Gopalganj", display_name: "Gopalganj, Bihar, 841428, India" };
const GORAKHPUR_DISTRICT = { lat: "26.66", lon: "83.37", boundingbox: ["26.2187521", "27.1170764", "83.0677616", "83.6710430"],
  osm_type: "relation", osm_id: 1959872, category: "boundary", type: "administrative", addresstype: "state_district", place_rank: 10,
  name: "Gorakhpur", display_name: "Gorakhpur, Uttar Pradesh, India" };
const GORAKHPUR_CITY = { lat: "26.7600217", lon: "83.3668129", boundingbox: ["26.6000217", "26.9200217", "83.2068129", "83.5268129"],
  osm_type: "node", osm_id: 575741452, category: "place", type: "city", addresstype: "city", place_rank: 16,
  name: "Gorakhpur", display_name: "Gorakhpur, Uttar Pradesh, 273001, India" };
const SAKET_DELHI = { lat: "28.5244", lon: "77.2125", boundingbox: ["28.5180696", "28.5309121", "77.2013944", "77.2236133"],
  osm_type: "relation", osm_id: 3662630, category: "boundary", type: "administrative", addresstype: "suburb", place_rank: 18,
  name: "Saket", display_name: "Saket, Delhi, South Delhi, Delhi, India" };
const SAKET_MP = { lat: "22.65", lon: "77.74", boundingbox: ["22.6353159", "22.6661472", "77.7348082", "77.7497047"],
  osm_type: "relation", osm_id: 16625497, category: "boundary", type: "administrative", addresstype: "city_district", place_rank: 18,
  name: "Saket", display_name: "Saket, Narmadapuram Tahsil, Narmadapuram, Madhya Pradesh, India" };
const DELHI_STATE = { lat: "28.6273928", lon: "77.1716954", boundingbox: ["28.4046285", "28.8834464", "76.8388351", "77.3453379"],
  osm_type: "relation", osm_id: 1942586, category: "boundary", type: "administrative", addresstype: "state", place_rank: 8,
  name: "Delhi", display_name: "Delhi, India" };
const DELHI_CITY = { ...DELHI_STATE, osm_id: 21180767, addresstype: "city", place_rank: 16, display_name: "Delhi, Old Delhi, Delhi, India" };
const BIHAR_STATE = { lat: "25.6440845", lon: "85.906508", boundingbox: ["24.2856153", "27.5214704", "83.3197845", "88.2971861"],
  osm_type: "relation", osm_id: 1960178, category: "boundary", type: "administrative", addresstype: "state", place_rank: 8,
  name: "Bihar", display_name: "Bihar, India" };
const GREEN_FIELD = { lat: "28.5235", lon: "77.2096", boundingbox: ["28.5229", "28.5241", "77.2088", "77.2106"],
  osm_type: "way", osm_id: 239638765, category: "amenity", type: "school", addresstype: "amenity", place_rank: 30,
  name: "Green Field School", display_name: "Green Field School, Saket, South, New Delhi, South Delhi, Delhi, 110017, India" };
/* The only "NCR" Nominatim knew near Delhi on 4 Oct 2026: a restaurant in Pitampura (real id). */
const NCR_RESTAURANT = { lat: "28.6882438", lon: "77.1212148", boundingbox: ["28.6881938", "28.6882938", "77.1211648", "77.1212648"],
  osm_type: "node", osm_id: 4474611689, category: "amenity", type: "restaurant", addresstype: "amenity", place_rank: 30,
  name: "NCR", display_name: "NCR, Guru Virjanand Marg, Pitampura, Keshavpuram, Delhi, Central North Delhi, Delhi, 110034, India" };
const NEW_DELHI_CITY = { lat: "28.6138954", lon: "77.2090057", boundingbox: ["28.5604008", "28.6451844", "77.1663519", "77.2436519"],
  osm_type: "relation", osm_id: 21180662, category: "boundary", type: "administrative", addresstype: "city", place_rank: 16,
  name: "New Delhi", display_name: "New Delhi, Delhi, India" };
const SUKET_RAJ = { lat: "24.6473824", lon: "76.0438211", boundingbox: ["24.6073824", "24.6873824", "76.0038211", "76.0838211"],
  osm_type: "node", osm_id: 2412043242, category: "place", type: "town", addresstype: "town", place_rank: 18,
  name: "Suket", display_name: "Suket, Ramganj Mandi Tehsil, Kota, Rajasthan, 326530, India" };
/* A road to search around ("Example Road, Patna"), and a dhaba elsewhere that only has the road's name. */
const EXAMPLE_ROAD = { lat: "25.5960", lon: "85.1590", boundingbox: ["25.5900", "25.6000", "85.1500", "85.1700"],
  osm_type: "way", osm_id: 900001, category: "highway", type: "secondary", addresstype: "road", place_rank: 26,
  name: "Example Road", display_name: "Example Road, Kankarbagh, Patna, Patna Rural, Patna, Bihar, 800020, India" };
const EXAMPLE_DHABA = { lat: "24.7900", lon: "85.0000", boundingbox: ["24.7899", "24.7901", "84.9999", "85.0001"],
  osm_type: "node", osm_id: 900002, category: "amenity", type: "restaurant", addresstype: "amenity", place_rank: 30,
  name: "Example Road Dhaba", display_name: "Example Road Dhaba, Station Road, Gaya, Bihar, 823001, India" };
/* A landmark that OpenStreetMap knows by its long name only. */
const AIIMS_PATNA = { lat: "25.5560", lon: "85.0730", boundingbox: ["25.5500", "25.5620", "85.0650", "85.0810"],
  osm_type: "way", osm_id: 900003, category: "amenity", type: "hospital", addresstype: "amenity", place_rank: 30,
  name: "All India Institute of Medical Sciences", display_name: "All India Institute of Medical Sciences, Phulwari Sharif, Patna, Bihar, 801507, India" };
/* What Nominatim answers with featureType=settlement, by q; without it (any place), POI. Anything else: Patna. */
const SETTLEMENTS = { Gopalganj: [GOPALGANJ_DISTRICT, GOPALGANJ_BLOCK], Gorakhpur: [GORAKHPUR_DISTRICT, GORAKHPUR_CITY],
  "Gorakhpur, Uttar Pradesh": [GORAKHPUR_DISTRICT, GORAKHPUR_CITY],
  "Saket, New Delhi": [], "Saket New Delhi": [], Saket: [SAKET_MP, SAKET_DELHI], Delhi: [DELHI_STATE, DELHI_CITY], Bihar: [BIHAR_STATE], Nowhereville: [],
  "Delhi NCR": [], "साकेत, नई दिल्ली": [], "नई दिल्ली": [NEW_DELHI_CITY], "साकेत": [SUKET_RAJ, SAKET_DELHI],
  "Example Road, Patna": [], "Example Road": [], "Example Road Dhaba": [], "AIIMS Patna": [] };
const POI = { "Saket New Delhi": [GREEN_FIELD], "Delhi NCR": [NCR_RESTAURANT], "Example Road, Patna": [EXAMPLE_DHABA, EXAMPLE_ROAD],
  "Example Road Dhaba": [EXAMPLE_DHABA], "AIIMS Patna": [AIIMS_PATNA] };
/* What Nominatim's lookup answers for a boundary's polygon (a square around the town, [lon, lat]). */
const POLYGONS = { R1960158: { type: "Polygon", coordinates: [[[84.2, 26.3], [84.7, 26.3], [84.7, 26.6], [84.2, 26.6], [84.2, 26.3]]] } };

const OSM_NODE = (id, tags, extra = {}) => ({ type: "node", id, lat: 25.61 + id / 1e6, lon: 85.13, tags, ...extra });
/* A node at a given distance north of another point: 0.001 degree of latitude is about 111 m. */
const AT = (id, tags, lat, lon = 85.13) => ({ type: "node", id, lat, lon, tags });
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
/** An Overpass answer. */
const answer = (elements) => () => json(200, { version: 0.6, elements });

let state;
let sleeps = [];
function reset(over = {}) {
  state = { keys: [], missingTable: false, google: {}, sites: {}, dns: {}, calls: [], patches: [],
    nominatim: (u) => {
      if (u.pathname === "/lookup") {
        if (state.nominatimLookup) return state.nominatimLookup(u);
        const id = u.searchParams.get("osm_ids");
        return json(200, POLYGONS[id] ? [{ osm_type: "relation", osm_id: Number(id.slice(1)), geojson: POLYGONS[id] }] : []);
      }
      const q = u.searchParams.get("q");
      if (u.searchParams.get("featureType") !== "settlement") return json(200, POI[q] || []);
      return json(200, Object.hasOwn(SETTLEMENTS, q) ? SETTLEMENTS[q] : [PATNA_HIT]);
    },
    overpass: answer(OSM_COACHING), ...over };
  sleeps = [];
  osm?.resetOsmCaches();
}
const osmCalls = (host) => state.calls.filter((c) => new URL(c.url).host === host);
const overpassCalls = () => state.calls.filter((c) => OVERPASS_HOSTS.includes(new URL(c.url).host));
const keyReads = () => state.calls.filter((c) => c.url.includes("/ai_provider_keys"));
const googleCalls = () => state.calls.filter((c) => c.url.includes("googleapis"));
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
if (NEGATIVE) {
  // Planted mistake 2: coaching keeps everything it downloads (hospitals, schools, gates).
  osm.SPECS.coaching.keep = () => true;
}

const { default: handler } = await import("../api/leads-search.js");

const seen = [];
const origError = console.error;
console.error = (...a) => { seen.push(a.join(" ")); };

async function call({ token = "admin-token", body = {}, method = "POST" } = {}) {
  // Planted mistake 1 (LEADS_NEGATIVE): every search asks Google too, as the finder did before 4 Oct 2026.
  const sent = plantGoogle && body && body.action === "search" && body.google === undefined ? { ...body, google: true } : body;
  const req = { method, headers: token ? { authorization: `Bearer ${token}` } : {}, body: sent };
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
const names = (r) => (r.json?.places || []).map((p) => p.name);

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
const G = { ...S, google: true };
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
check("google that is not true or false -> 400", (await call({ body: { ...S, google: "yes" } })).status, (s) => s === 400);
check("a radius that is not 5, 10 or 25 km -> 400", (await call({ body: { ...S, radiusKm: 7 } })).status, (s) => s === 400);
check("broken JSON -> 400", (await call({ body: "{not json" })).status, (s) => s === 400);

// ── Free first: no key is read, whatever is saved ───────────────────────────
log("Free first: OpenStreetMap, no key");
reset();
let r = await call({ body: S });
check("a search with no keys saved -> 200 from OpenStreetMap", [r.status, r.json.source], ([s, src]) => s === 200 && src === "osm");
check("... no fallback reason: the free search is the search, not a fallback", r.json.fallback, (f) => f === undefined);
check("... and the keys were never read, nor Google asked", [keyReads().length, googleCalls().length], ([k, g]) => k === 0 && g === 0);
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: searchOk() } });
r = await call({ body: S });
check("a WORKING Google key saved: the search is still OpenStreetMap, the key not read, Google not asked",
  [r.status, r.json.source, keyReads().length, googleCalls().length], ([s, src, k, g]) => s === 200 && src === "osm" && k === 0 && g === 0);
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: denied, [KEY2]: denied } });
r = await call({ body: S });
check("a FAILING key (403, Places API not enabled: Mehdi's 3 Oct 2026) never slows or clutters the free search",
  [r.status, r.json.source, keyReads().length, googleCalls().length, state.patches.length, r.json.places?.length, "fallback" in r.json || "attempts" in r.json || /has not been used|PERMISSION_DENIED|AI keys/.test(r.text)],
  ([s, src, k, g, p, n, said]) => s === 200 && src === "osm" && k === 0 && g === 0 && p === 0 && n === 2 && !said);
reset({ keys: [geminiRow(), keyRow(KEY1, 1)], google: { [KEY1]: searchOk() } });
r = await call({ body: S });
check("no key of any kind reaches Google, OpenStreetMap or a log on a free search",
  state.calls.filter((c) => !c.url.startsWith("https://sb.test")).map((c) => c.url + c.body + JSON.stringify(c.headers)).join() + seen.join(),
  (t) => !t.includes(GEMINI) && !t.includes(KEY1));
check("the free answer carries its area and its counts", [r.json.area?.kind, r.json.area?.label, r.json.counts, r.json.total],
  ([k, l, c, t]) => k === "box" && l === "in and around Patna (Bihar)" && c?.withPhone === 2 && c?.withWebsite === 2 && t === 2);

plantGoogle = false;

// ── Google, only when asked ─────────────────────────────────────────────────
log("Google only when asked (google: true)");
reset();
r = await call({ body: G });
check("google: true with no key saved -> 422 no_keys, in words that point at the free search", [r.status, r.json.code, r.json.error],
  ([s, c, e]) => s === 422 && c === "no_keys" && /No Google Maps key is saved/.test(e) && /free search needs no key/.test(e));
check("... and OpenStreetMap is not asked by the Google request (the free one is its own request)", overpassCalls().length + osmCalls("nominatim.openstreetmap.org").length, (n) => n === 0);
reset({ keys: [geminiRow()] });
r = await call({ body: G });
check("an AI key alone is not a Maps key -> 422, and Gemini's key is never sent to Google", [r.status, r.json.code, googleCalls().length],
  ([s, c, g]) => s === 422 && c === "no_keys" && g === 0);
reset({ keys: [keyRow(KEY1, 1, { enabled: false })] });
r = await call({ body: G });
check("a switched-off key -> 422 no_keys", [r.status, r.json.code], ([s, c]) => s === 422 && c === "no_keys");
reset({ missingTable: true });
r = await call({ body: G });
check("table missing -> 422, the reason pointing at 0006 and 0009", [r.status, r.json.error], ([s, e]) => s === 422 && /0006/.test(e) && /0009/.test(e));
reset();
r = await call({ body: { action: "details", placeId: "ChIJplace000007xyz" } });
check("details with no keys is still 422 no_keys (OSM has no details)", [r.status, r.json.code], ([s, c]) => s === 422 && c === "no_keys");

// ── Search on Google ────────────────────────────────────────────────────────
log("Search on Google");
reset({ keys: [geminiRow(), keyRow(KEY1, 1)], google: { [KEY1]: searchOk() } });
r = await call({ body: G });
check("200 with places", [r.status, r.json.places?.length], ([s, n]) => s === 200 && n === 2);
check("textQuery is 'coaching in Patna'", r.json.textQuery, (q) => q === "coaching in Patna");
check("a place is mapped to the finder's shape", r.json.places[0], (p) => p.placeId === "ChIJplace000001xyz" && p.name === "Vidya Classes 1"
  && p.phone === "098765 43211" && p.phoneIntl === "+91 98765 43211" && p.website === "https://vidya1.example.in/" && p.rating === 4.3
  && p.ratingCount === 121 && p.mapsUrl && p.businessStatus === "OPERATIONAL" && p.primaryType === "school" && p.address.includes("Patna"));
check("a place without a website has website null", r.json.places[1].website, (w) => w === null);
check("nothing unasked leaks through (reviews)", r.text, (t) => !t.includes("must not leak"));
check("nextPageToken is passed on", r.json.nextPageToken, (t) => t === "NEXTtoken123");
check("attribution says Google Maps, source google", [r.json.attribution, r.json.source, r.json.places[0].source], ([a, s, ps]) => a === "Google Maps" && s === "google" && ps === "google");
check("a Google search does not ask OpenStreetMap (the free list is the page's other request)", state.calls.filter((c) => /openstreetmap|overpass|mail\.ru/.test(c.url)).length, (n) => n === 0);
const gs = state.calls.find((c) => c.url.endsWith("places:searchText"));
check("POST to places:searchText with the key in a header, not the URL", [gs.method, gs.headers["x-goog-api-key"], gs.url],
  ([m, k, u]) => m === "POST" && k === KEY1 && !u.includes(KEY1));
check("field mask asks only for the needed fields", gs.headers["x-goog-fieldmask"].split(","), (f) => f.length === 12
  && f.includes("places.id") && f.includes("places.websiteUri") && f.includes("nextPageToken") && !f.some((x) => /reviews|photos|\*/.test(x)));
check("request body: textQuery, pageSize 20, region in", JSON.parse(gs.body), (b) => b.textQuery === "coaching in Patna" && b.pageSize === 20 && b.regionCode === "in");
r = await call({ body: { ...S, pageToken: "NEXTtoken123" } });
check("a Google 'Load more' token goes to Google (a token that is not osm.N), with the SAME query", JSON.parse(state.calls.filter((c) => c.url.endsWith("places:searchText")).at(-1).body),
  (b) => b.pageToken === "NEXTtoken123" && b.textQuery === "coaching in Patna");
r = await call({ body: { ...G, pageToken: "NEXTtoken123" } });
check("... and with google: true as well", [r.status, r.json.source], ([s, src]) => s === 200 && src === "google");
r = await call({ body: { action: "search", query: "NEET coaching", city: "Gaya", google: true } });
check("a free query gets the city added", r.json.textQuery, (q) => q === "NEET coaching in Gaya");
check("no key status was written when nothing failed", state.patches.length, (n) => n === 0);

// ── Several keys ────────────────────────────────────────────────────────────
log("Key fallback (Google searches)");
reset({ keys: [keyRow(KEY2, 2), keyRow(KEY1, 1)], google: { [KEY1]: quota, [KEY2]: searchOk() } });
r = await call({ body: G });
check("key 1 out of quota -> key 2 answers", [r.status, r.json.attempts.map((a) => `${a.label}:${a.status}`).join(",")],
  ([s, a]) => s === 200 && a === "Key 1:limit,Key 2:ok");
check("key 1 is parked by its own id with 'limit:'", state.patches, (p) => p.length === 1 && p[0].id === state.keys.find((k) => k.api_key === KEY1).id
  && /^limit:/.test(p[0].body.last_error) && p[0].body.last_error_at);
reset({ keys: [keyRow(KEY1, 1, { last_error: "limit: quota", last_error_at: new Date().toISOString() }), keyRow(KEY2, 2)],
  google: { [KEY1]: () => { throw new Error("a parked key must not be called"); }, [KEY2]: searchOk() } });
r = await call({ body: G });
check("a key parked today is skipped without a call", [r.status, r.json.attempts[0].status, state.calls.filter((c) => c.headers["x-goog-api-key"] === KEY1).length],
  ([s, a, n]) => s === 200 && a === "skipped" && n === 0);
reset({ keys: [keyRow(KEY1, 1, { last_error: "limit: quota", last_error_at: "2020-01-01T00:00:00Z" })], google: { [KEY1]: searchOk() } });
r = await call({ body: G });
check("a key parked on an earlier day is tried again, and cleared", [r.status, state.patches[0]?.body.last_error], ([s, e]) => s === 200 && e === null);
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: denied } });
r = await call({ body: G });
check("Mehdi's key (403 PERMISSION_DENIED, Places API (New) not enabled) -> 502 api_disabled, said plainly", [r.status, r.json.code, r.json.error],
  ([s, c, e]) => s === 502 && c === "api_disabled" && /Places API \(New\) is not enabled/.test(e));
check("the Places-not-enabled message still reaches the admin, and the key's error is recorded on it", [r.text, state.patches[0]?.body.last_error],
  ([t, e]) => /has not been used in project|disabled/.test(t) && /^error: .*disabled/.test(e));
check("... and OpenStreetMap was not asked by this request", overpassCalls().length, (n) => n === 0);
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: denied, [KEY2]: quota } });
r = await call({ body: G });
check("every key fails -> 502 with each key's error in attempts, no free list mixed in", [r.status, r.json.attempts?.length, r.json.places, r.json.source],
  ([s, n, p, src]) => s === 502 && n === 2 && p === undefined && src === undefined);
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: quota, [KEY2]: quota } });
r = await call({ body: G });
check("every key out of quota -> code quota", [r.status, r.json.code, r.json.error], ([s, c, why]) => s === 502 && c === "quota" && /out of quota/.test(why));
reset({ keys: [keyRow(KEY1, 1, { last_error: "limit: quota", last_error_at: new Date().toISOString() })], google: { [KEY1]: () => { throw new Error("parked"); } } });
r = await call({ body: G });
check("the only key parked for today -> quota straight away, no call", [r.status, r.json.code, googleCalls().length], ([s, c, g]) => s === 502 && c === "quota" && g === 0);
const billing = () => json(403, { error: { code: 403, status: "PERMISSION_DENIED", message: "This API method requires billing to be enabled. Please enable billing on project #123." } });
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: billing } });
r = await call({ body: G });
check("billing off -> code billing", [r.status, r.json.code], ([s, c]) => s === 502 && c === "billing");
reset({ keys: [keyRow(KEY1, 1)] });
r = await call({ body: G });
check("an invalid key -> all_failed, and the key's error is recorded on the key", [r.status, r.json.code, state.patches[0]?.body.last_error],
  ([s, c, e]) => s === 502 && c === "all_failed" && /^error: .*API key not valid/.test(e));
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: { [KEY1]: denied, [KEY2]: quota } });
r = await call({ body: { ...S, pageToken: "NEXTtoken123" } });
check("a Google 'Load more' when every key fails -> 502 all_failed (never a silent switch to OSM)", [r.status, r.json.code, overpassCalls().length],
  ([s, c, n]) => s === 502 && c === "all_failed" && n === 0);
r = await call({ body: { action: "details", placeId: "ChIJplace000007xyz" } });
check("details when every key fails -> 502 all_failed", [r.status, r.json.code], ([s, c]) => s === 502 && c === "all_failed");
reset({ keys: [keyRow(KEY1, 1), keyRow(KEY2, 2)], google: {
  [KEY1]: () => json(400, { error: { code: 400, status: "INVALID_ARGUMENT", message: "Invalid page_token." } }), [KEY2]: searchOk() } });
r = await call({ body: { ...S, pageToken: "stale" } });
check("a stale page token -> 400, not retried on key 2", [r.status, state.calls.filter((c) => c.headers["x-goog-api-key"] === KEY2).length],
  ([s, n]) => s === 400 && n === 0);
reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: () => json(429, { error: { message: `quota for key ${KEY1} exceeded` } }) } });
r = await call({ body: G });
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

// ── OpenStreetMap: the city, and the area searched ──────────────────────────
log("OpenStreetMap: the city as a settlement");
reset();
r = await call({ body: S });
const geo = osmCalls("nominatim.openstreetmap.org");
check("one Nominatim call: format=jsonv2, India only, settlements only (no shop, no metro station), q=Patna, our contact address",
  geo.map((c) => new URL(c.url)), (u) => u.length === 1
  && u[0].origin + u[0].pathname === "https://nominatim.openstreetmap.org/search" && u[0].searchParams.get("format") === "jsonv2"
  && u[0].searchParams.get("countrycodes") === "in" && u[0].searchParams.get("featureType") === "settlement"
  && u[0].searchParams.get("q") === "Patna" && u[0].searchParams.get("email") === "contact@ideovent.in");
check("Nominatim gets a User-Agent naming Ideovent, the live site and contact@ideovent.in", geo[0]?.headers["user-agent"],
  (ua) => /^IdeoventLeadFinder\/2\.0 \(\+https:\/\/www\.ideovent\.in; contact@ideovent\.in\)$/.test(ua));
check("the User-Agent follows VITE_PUBLIC_URL, and only a bare site address", [osm.siteUrl({ VITE_PUBLIC_URL: "https://crm.ideovent.in/" }),
  osm.siteUrl({ VITE_PUBLIC_URL: "https://x.in\r\nX-Evil: 1" }), osm.siteUrl({})],
  ([a, b, c]) => a === "https://crm.ideovent.in" && b === "https://www.ideovent.in" && c === "https://www.ideovent.in");
const op = overpassCalls();
check("Overpass: POST data=... to overpass-api.de first, form-encoded", [op.length, op[0]?.url, op[0]?.method, op[0]?.headers["content-type"], op[0]?.body.slice(0, 5)],
  ([n, u, m, t, b]) => n === 1 && u === "https://overpass-api.de/api/interpreter" && m === "POST" && /x-www-form-urlencoded/.test(t) && b === "data=");
const q1 = queryOf(op[0]);
check("Patna is a city drawn as an outline: in and around it (its box), a modest declared time and memory, tags and centres only", q1,
  (q) => q.startsWith("[out:json][timeout:30][maxsize:268435456][bbox:25.53895,85.01184,25.65105,85.26419];(") && /out tags center qt 1500;$/.test(q));
check("each Overpass call names the app and the contact in its User-Agent", op[0]?.headers["user-agent"], (ua) => /^IdeoventLeadFinder\/2\.0 .*contact@ideovent\.in/.test(ua));
check("the coaching query itself excludes healthcare and hospital-like amenities", q1, (q) => q.includes('amenity"="prep_school"') && q.includes('[!"healthcare"]')
  && /hospital\|clinic/.test(q) && q.includes('nwr["amenity"="training"]'));

log("OpenStreetMap: the area searched");
reset({ overpass: answer([AT(801, { amenity: "prep_school", name: "Example Gopalganj Classes" }, 26.46, 84.44),
  AT(803, { amenity: "prep_school", name: "Example Siwan Classes" }, 26.25, 84.0)]) });
r = await call({ body: { ...S, city: "Gopalganj" } });
let oq = queryOf(overpassCalls()[0]);
const look = osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url)).find((u) => u.pathname === "/lookup");
check("a district (Gopalganj): its polygon looked up once, simplified, with our contact", look && [look.searchParams.get("osm_ids"), look.searchParams.get("polygon_geojson"),
  look.searchParams.get("polygon_threshold"), look.searchParams.get("email")], (l) => l && l.join() === "R1960158,1,0.003,contact@ideovent.in");
check("... Overpass is asked for the district's box (fast), never for an Overpass area (16 s on 3 Oct 2026)", oq,
  (q) => q.includes("[bbox:26.20340,83.90653,26.63920,84.90687];(") && !q.includes("area(") && !q.includes("around:"));
check("... and only what lies inside the district's polygon is kept: not the classes 25 km away in the next district", [names(r).join(), r.json.total, r.json.area],
  ([n, t, a]) => n === "Example Gopalganj Classes" && t === 1 && a?.kind === "boundary" && a?.label === "inside the Gopalganj district boundary (Bihar)");
reset({ nominatimLookup: () => json(503, { error: "busy" }), overpass: answer([AT(801, { amenity: "prep_school", name: "Example Gopalganj Classes" }, 26.46, 84.44),
  AT(803, { amenity: "prep_school", name: "Example Siwan Classes" }, 26.25, 84.0)]) });
r = await call({ body: { ...S, city: "Gopalganj" } });
check("no polygon (Nominatim's lookup failed twice): the district's box, and the page is told so", [r.status, names(r).sort().join(), r.json.area?.kind, r.json.area?.label],
  ([s, n, k, l]) => s === 200 && n === "Example Gopalganj Classes,Example Siwan Classes" && k === "box" && l === "in a box around Gopalganj (Bihar)");
{
  const lookups = () => osmCalls("nominatim.openstreetmap.org").filter((c) => new URL(c.url).pathname === "/lookup").length;
  reset({ overpass: answer([AT(801, { amenity: "prep_school", name: "Example Gopalganj Classes" }, 26.46, 84.44),
    AT(803, { amenity: "prep_school", name: "Example Siwan Classes" }, 26.25, 84.0)]) });
  r = await call({ body: { ...S, city: "Gopalganj", radiusKm: 25 } });
  check("a district at Area '25 km around it': a circle, so its boundary is never looked up (one Nominatim call in all)",
    [osmCalls("nominatim.openstreetmap.org").length, lookups(), r.json.area?.kind, r.json.area?.label, names(r).join()],
    ([n, l, k, lab, nm]) => n === 1 && l === 0 && k === "radius" && lab === "within 25 km of Gopalganj (Bihar)" && nm === "Example Gopalganj Classes");
  r = await call({ body: { ...S, city: "Gopalganj" } });
  check("... the same district on its own area next: the boundary is looked up then, once, and kept to", [lookups(), r.json.area?.kind, names(r).join()],
    ([l, k, n]) => l === 1 && k === "boundary" && n === "Example Gopalganj Classes");
  await call({ body: { ...S, city: "Gopalganj", type: "school", preset: "school" } });
  await call({ body: { ...S, city: "Gopalganj", radiusKm: 10 } });
  check("... and never again for that district", [lookups(), osmCalls("nominatim.openstreetmap.org").length], ([l, n]) => l === 1 && n === 2);
}
reset({ overpass: answer([AT(804, { amenity: "prep_school", name: "Example Near Classes" }, 26.80, 83.37),
  AT(805, { amenity: "prep_school", name: "Example Corner Classes" }, 26.86, 83.47)]) });
r = await call({ body: { ...S, city: "Gorakhpur" } });
oq = queryOf(overpassCalls()[0]);
check("a district first and its city second (Gorakhpur): the city, a point, so 12 km around it: its box asked for, the circle kept",
  [oq, names(r).join(), r.json.area], ([q, n, a]) => q.includes("[bbox:26.65211,83.24595,26.86793,83.48767];(") && n === "Example Near Classes"
    && a?.kind === "radius" && a?.radiusKm === 12 && a?.label === "within 12 km of Gorakhpur (Uttar Pradesh)");
reset();
r = await call({ body: { ...S, city: "Saket, New Delhi" } });
const sk = osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url).searchParams);
check("'Saket, New Delhi' (no settlement by that whole name): then 'Saket', the one whose address says Delhi, a ward: 5 km around it",
  [sk.map((p) => `${p.get("q")}|${p.get("featureType")}|${p.get("limit")}`).join(" ; "), queryOf(overpassCalls()[0]), r.json.area?.label],
  ([n, q, l]) => n === "Saket, New Delhi|settlement|5 ; Saket|settlement|10" && q.includes("[bbox:28.47944,77.16132,28.56936,77.26368];") && l === "within 5 km of Saket (Delhi)");
reset();
r = await call({ body: { ...S, city: "Saket New Delhi" } });
const sk2 = osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url).searchParams);
check("no settlement and no comma: something in that place to stand in for it (a school whose ADDRESS is Saket, New Delhi), 5 km around it, named in the label",
  [sk2.map((p) => `${p.get("featureType") || "any"}|${p.get("limit")}`).join(" ; "), queryOf(overpassCalls()[0]), r.json.area?.label],
  ([n, q, l]) => n === "settlement|5 ; any|5" && q.includes("[bbox:28.47854,77.15842,28.56846,77.26078];")
    && l === "within 5 km of Saket New Delhi, around Green Field School (Delhi)");
r = await call({ body: { ...S, city: "Saket New Delhi", radiusKm: 10 } });
check("... and Area '10 km around it' keeps saying around what", r.json.area?.label, (l) => l === "within 10 km of Saket New Delhi, around Green Field School (Delhi)");

log("OpenStreetMap: what is not a place (4 Oct 2026)");
reset();
r = await call({ body: { ...S, city: "Delhi NCR" } });
const ncrQs = osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url).searchParams.get("q"));
check("'Delhi NCR' (how Mehdi names his market): NCR is taken out and Delhi is searched, never the restaurant called NCR",
  [ncrQs.join(" ; "), queryOf(overpassCalls()[0] || { body: "" }), r.json.area?.label],
  ([qs, q, l]) => qs === "Delhi" && q.includes("[bbox:28.40463,76.83884,28.88345,77.34534];") && l === "in and around Delhi");
check("... and the page is told so, in one line naming the cities to search on their own", r.json.placeNote,
  (n) => n === "NCR is several cities, so this searched Delhi only. Search Noida, Gurugram, Ghaziabad or Faridabad on their own too.");
reset();
r = await call({ body: { ...S, city: "Gurgaon (NCR)" } });
check("'Gurgaon (NCR)': Gurgaon, and the note leaves Gurugram out of the others", [osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url).searchParams.get("q")).join(), r.json.placeNote],
  ([qs, n]) => qs === "Gurgaon" && /searched Gurgaon only\. Search Delhi, Noida, Ghaziabad or Faridabad on their own too\.$/.test(n));
reset();
r = await call({ body: { ...S, city: "NCR" } });
check("'NCR' alone -> 422 osm_city asking for one of its cities, nothing asked of Nominatim or Overpass",
  [r.status, r.json.code, r.json.error, state.calls.filter((c) => /openstreetmap|overpass|mail\.ru/.test(c.url)).length],
  ([s, c, e, n]) => s === 422 && c === "osm_city" && /NCR is several cities/.test(e) && /Delhi, Noida, Gurugram, Ghaziabad or Faridabad/.test(e) && n === 0);
r = await call({ body: S });
check("... and no note on an ordinary city", "placeNote" in r.json, (has) => has === false);
check("the last resort never takes a shop, a school or a restaurant by its own name (the 'NCR' restaurant for 'Delhi NCR')",
  [osm.pickStandIn([NCR_RESTAURANT], "Delhi NCR"), osm.pickStandIn([GREEN_FIELD], "Saket New Delhi")?.name, osm.pickStandIn([NCR_RESTAURANT], "Pitampura Delhi")?.name],
  ([ncr, school, pitampura]) => ncr === null && school === "Green Field School" && pitampura === "NCR");
reset();
r = await call({ body: { ...S, city: "Example Road Dhaba" } });
check("a dhaba known only by the name typed, somewhere else -> 422 osm_city, nothing searched around it", [r.status, r.json.code, overpassCalls().length],
  ([s, c, n]) => s === 422 && c === "osm_city" && n === 0);
reset();
r = await call({ body: { ...S, city: "Example Road, Patna" } });
check("a road in the place typed ('Example Road, Patna'), after the dhaba of that name in Gaya: 5 km around the road, named by its own name",
  [r.status, r.json.area?.label, queryOf(overpassCalls()[0] || { body: "" })],
  ([s, l, q]) => s === 200 && l === "within 5 km of Example Road (Bihar)" && q.includes("[bbox:25.55104,85.10914,25.64096,85.20886];"));
reset();
r = await call({ body: { ...S, city: "AIIMS Patna" } });
check("a landmark mapped under its long name ('AIIMS Patna' is 'All India Institute of Medical Sciences'): 5 km around it, and the label says around what",
  [r.status, r.json.area?.label, osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url).searchParams.get("featureType") || "any").join()],
  ([s, l, n]) => s === 200 && l === "within 5 km of AIIMS Patna, around All India Institute of Medical Sciences (Bihar)" && n === "settlement,any");
check("the last resort, judged: a landmark with every word typed but one, yes; with two missing, or a restaurant by its own name, no",
  [osm.pickStandIn([AIIMS_PATNA], "AIIMS Patna")?.name, osm.pickStandIn([AIIMS_PATNA], "AIIMS Gaya"), osm.pickStandIn([{ ...NCR_RESTAURANT, name: "AIIMS Dhaba" }], "AIIMS Delhi")],
  ([a, b, c]) => a === "All India Institute of Medical Sciences" && b === null && c === null);
check("the region's name comes out however it is written, and only NCR's",
  [...["Delhi-NCR", "Delhi and NCR", "Saket, Delhi NCR", "noida (ncr)", "Gurugram N.C.R."].map((t) => osm.splitRegion(t)?.city), osm.splitRegion("Patna"), osm.splitRegion("Encroachment Road")],
  (v) => v.join("|") === "Delhi|Delhi|Saket, Delhi|noida|Gurugram||" && v[5] === null && v[6] === null);
check("'N.C.R.' or 'एनसीआर' alone is NCR alone: asked for one of its cities",
  ["N.C.R.", "एनसीआर"].map((t) => { try { osm.splitRegion(t); return "no throw"; } catch (e) { return e.code; } }), (c) => c.join() === "osm_city,osm_city");
check("in Devanagari too: 'दिल्ली एनसीआर' and 'दिल्ली NCR' search दिल्ली, and the note names the other four cities",
  ["दिल्ली एनसीआर", "दिल्ली NCR"].map((t) => { try { const x = osm.splitRegion(t); return `${x?.city}|${x?.note}`; } catch (e) { return `threw ${e.code}`; } }),
  (v) => v.every((s) => s === "दिल्ली|NCR is several cities, so this searched दिल्ली only. Search Noida, Gurugram, Ghaziabad or Faridabad on their own too."));
reset();
r = await call({ body: { ...S, city: "साकेत, नई दिल्ली" } });
const hi = osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url).searchParams);
check("'साकेत, नई दिल्ली' (Devanagari, with a comma): नई दिल्ली is read through Nominatim as New Delhi, Delhi; then the साकेत in Delhi, not the Suket in Rajasthan",
  [hi.map((p) => `${p.get("q")}|${p.get("limit")}`).join(" ; "), r.status, r.json.area?.label],
  ([n, s, l]) => n === "साकेत, नई दिल्ली|5 ; नई दिल्ली|1 ; साकेत|10" && s === 200 && l === "within 5 km of Saket (Delhi)");
reset();
r = await call({ body: { ...S, city: "Gorakhpur UP" } });
check("'Gorakhpur UP': the state written short is spelt out for Nominatim, and the city is found at once",
  [osmCalls("nominatim.openstreetmap.org").map((c) => new URL(c.url).searchParams.get("q")).join(" ; "), r.json.area?.label],
  ([qs, l]) => qs === "Gorakhpur, Uttar Pradesh" && l === "within 12 km of Gorakhpur (Uttar Pradesh)");
check("states written short: UP, M.P., J&K; a city alone, or a short word alone, is left as it is",
  [osm.expandStateShort("Deoria UP"), osm.expandStateShort("Indore, M.P."), osm.expandStateShort("Srinagar J&K"), osm.expandStateShort("Kanpur"), osm.expandStateShort("UP")],
  (v) => v.join("|") === "Deoria, Uttar Pradesh|Indore, Madhya Pradesh|Srinagar, Jammu and Kashmir|Kanpur|UP");
reset();
r = await call({ body: { ...S, city: "Delhi" } });
check("'Delhi': the city, not the state of the same name: in and around it (its box), no state repeated", [queryOf(overpassCalls()[0]), r.json.area?.label, osmCalls("nominatim.openstreetmap.org").length],
  ([q, l, n]) => q.includes("[bbox:28.40463,76.83884,28.88345,77.34534];") && l === "in and around Delhi" && n === 1);
reset();
r = await call({ body: { ...S, city: "Bihar" } });
check("a whole state -> 422 osm_city, asking for a city in it, Overpass not asked", [r.status, r.json.code, r.json.error, overpassCalls().length],
  ([s, c, e, n]) => s === 422 && c === "osm_city" && /whole state/.test(e) && n === 0);
reset();
r = await call({ body: { ...S, radiusKm: 10 } });
check("Area '10 km around it': a circle around the city's point instead of its outline", [queryOf(overpassCalls()[0]), r.json.area],
  ([q, a]) => q.includes("[bbox:25.51939,85.02381,25.69925,85.22325];") && a?.radiusKm === 10 && a?.label === "within 10 km of Patna (Bihar)");
r = await call({ body: { ...S, radiusKm: 10, type: "school", preset: "school" } });
check("... the city is looked up once for both (cached)", osmCalls("nominatim.openstreetmap.org").length, (n) => n === 1);

log("OpenStreetMap: tags -> results");
reset();
r = await call({ body: S });
check("answer: source osm, © OpenStreetMap contributors, ODbL, the honest note", [r.status, r.json.source, r.json.attribution, r.json.licence, r.json.attributionUrl, r.json.note],
  ([s, src, a, l, u, n]) => s === 200 && src === "osm" && a === "© OpenStreetMap contributors" && l === "ODbL" && u === "https://www.openstreetmap.org/copyright"
    && /fewer businesses and fewer phone numbers than Google Maps/.test(n));
check("coaching keeps the classes and the academy", names(r), (n) => n.includes("Example Physics Classes") && n.includes("Example JEE Academy"));
check("coaching drops the hospital, the clinic, the college and the medical institute", names(r), (n) => !n.some((x) => /Hospital|Care Institute|Technology|Medical/.test(x)));
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

log("OpenStreetMap: one result per business");
reset({ overpass: answer([
  AT(901, { amenity: "prep_school", name: "Example Sky Light Classes", phone: "9876500001" }, 25.6000),
  { type: "way", id: 902, center: { lat: 25.6003, lon: 85.13 }, tags: { building: "yes", amenity: "prep_school", name: "Example Skylight Classes", website: "https://skylight.example.in" } },
  AT(903, { office: "educational_institution", name: "Example Dominic's Coaching Centre" }, 25.6100),
  AT(904, { office: "educational_institution", name: "Example Dominics Coaching Centre" }, 25.6101),
  AT(905, { amenity: "prep_school", name: "Example Branch Classes" }, 25.6200),
  AT(906, { amenity: "prep_school", name: "Example Branch Classes" }, 25.6400),
  AT(907, { amenity: "prep_school", name: "Example Tuition Point", phone: "+91 98765 00002" }, 25.6500),
  AT(908, { office: "educational_institution", name: "Example Tuition Point Kankarbagh", phone: "098765 00002" }, 25.6550),
  AT(909, { amenity: "prep_school", name: "Example Smart Classes" }, 25.6600),
  AT(910, { amenity: "prep_school", name: "Example Smart Classes Annexe" }, 25.6608),
]) });
r = await call({ body: S });
const ids = r.json.places.map((p) => p.placeId);
check("a point and a building of one name 33 m apart, spelt 'Sky Light' and 'Skylight': one result, with the phone of one and the website of the other",
  r.json.places.filter((p) => /Sky ?light/i.test(p.name)), (l) => l.length === 1 && l[0].placeId === "osm:node/901" && l[0].phoneIntl === "+919876500001" && l[0].website === "https://skylight.example.in");
check("'Dominic's' and 'Dominics' 11 m apart: one result", r.json.places.filter((p) => /Dominic/.test(p.name)).length, (n) => n === 1);
check("the same name 2.2 km apart: two branches, two results", ids.filter((id) => id === "osm:node/905" || id === "osm:node/906").length, (n) => n === 2);
check("the same phone 555 m apart under two spellings: one result", r.json.places.filter((p) => /Tuition Point/.test(p.name)).length, (n) => n === 1);
check("one name inside the other 89 m apart ('... Classes' and '... Classes Annexe'): one result", r.json.places.filter((p) => /Smart Classes/.test(p.name)).length, (n) => n === 1);
check("total and counts are the deduplicated list's", [r.json.total, r.json.counts], ([t, c]) => t === 6 && c.withPhone === 2 && c.withWebsite === 1);
reset({ overpass: answer([
  // Patna, 4 Oct 2026: "Chartered Commerce" twice, 356 m apart, two phones, one website.
  AT(921, { office: "educational_institution", name: "Example Commerce Classes", phone: "+91 95700 00001", website: "https://www.example-commerce.example.org/" }, 25.6700),
  AT(922, { office: "educational_institution", name: "Example Commerce Classes", phone: "+91 97980 00002", website: "http://example-commerce.example.org" }, 25.6732),
  // The same name 356 m apart with two different Facebook pages: two businesses.
  AT(923, { amenity: "prep_school", name: "Example Bright Classes", website: "https://www.facebook.com/examplebright1" }, 25.6800),
  AT(924, { amenity: "prep_school", name: "Example Bright Classes", website: "https://facebook.com/examplebright2" }, 25.6832),
]) });
r = await call({ body: S });
check("the same name and the same website 356 m apart (two branches of one business, one website): one result",
  r.json.places.filter((p) => /Commerce/.test(p.name)).map((p) => p.placeId), (l) => l.length === 1 && l[0] === "osm:node/921");
check("... while the same name with two different Facebook pages stays two", r.json.places.filter((p) => /Bright/.test(p.name)).length, (n) => n === 2);
check("a website compared for duplicates: the address without www or https; a Facebook page by its path",
  [osm.siteKey("https://www.Example.org/"), osm.siteKey("example.org/about"), osm.siteKey("https://m.facebook.com/Page.One/"), osm.siteKey("not a url ::"), osm.siteKey(null)],
  (v) => v.join("|") === "example.org|example.org|m.facebook.com/page.one||");

log("OpenStreetMap: dental presets");
reset({ overpass: answer(OSM_DENTAL) });
r = await call({ body: { action: "search", type: "dental clinic", city: "Patna", preset: "dental" } });
const qd = queryOf(overpassCalls()[0]);
check("dental preset asks for amenity=dentist and healthcare=dentist, and dental names on clinics and on plain buildings", qd,
  (q) => q.includes('nwr["amenity"="dentist"]') && q.includes('nwr["healthcare"="dentist"]') && /clinic\|doctors\|hospital/.test(q) && /dental\|dentist/.test(q)
    && q.includes('[!"amenity"][!"healthcare"][~"^(building|shop|office|craft)$"~"."]'));
check("dental: all three clinics, the Devanagari name shown as its English name", names(r).sort(),
  (n) => n.length === 3 && n.includes("Dr Example Dental") && n.includes("Example Smile Dental Clinic"));
check("dental: mobile tag gives the phone, category says dentist", r.json.places.find((p) => p.name === "Example Smile Dental Clinic"),
  (p) => p.phoneIntl === "+919876543213" && p.primaryType === "clinic");
check("an orthodontics speciality shows in the category", r.json.places.find((p) => p.placeId === "osm:node/402")?.primaryType, (c) => c === "dentist (orthodontics)");
r = await call({ body: { action: "search", type: "orthodontist", city: "Patna", preset: "ortho" } });
check("ortho preset narrows to the orthodontist, same Overpass answer from the cache", [r.json.places.map((p) => p.placeId).join(), overpassCalls().length, r.json.broadened],
  ([pids, n, b]) => pids === "osm:node/402" && n === 1 && !b);
r = await call({ body: { action: "search", type: "pediatric dentist", city: "Patna", preset: "kids" } });
check("kids preset with no children's dentist -> all dental clinics, said plainly", [r.json.places.length, r.json.broadened],
  ([n, b]) => n === 3 && /no children's dentists by name in Patna/.test(b) && /all the dental clinics/.test(b));
r = await call({ body: { action: "search", type: "Dental implant centre", city: "Patna" } });
check("typed 'Dental implant centre' (no preset) is read as the implant spec", [r.status, r.json.places.length, r.json.broadened],
  ([s, n, b]) => s === 200 && n === 3 && /implant/.test(b));
check("a preset id that is not a word -> 400", (await call({ body: { ...S, preset: "x y;" } })).status, (s) => s === 400);
reset({ overpass: answer([
  OSM_NODE(404, { amenity: "clinic", healthcare: "clinic", "healthcare:speciality": "paediatric_dentistry", name: "Example Little Smiles" }),
  OSM_NODE(405, { amenity: "hospital", healthcare: "hospital", "healthcare:speciality": "accident_and_emergency", name: "Example General Hospital" }),
  OSM_NODE(406, { amenity: "dentist", name: "Example Tooth Care" }),
  // Found by the speciality selector, but a polyclinic and a hospital that list a dentist among others: not dental clinics.
  OSM_NODE(407, { amenity: "clinic", healthcare: "clinic", "healthcare:speciality": "dentist;dermatology;gynaecology", name: "Example Care Polyclinic" }),
  OSM_NODE(408, { amenity: "hospital", "healthcare:speciality": "cardiologist, dentist, dermatologist", name: "Example City Hospital" }),
  // A dental lab and a dental supplier are not clinics; a clinic drawn only as a named building is.
  OSM_NODE(409, { craft: "dental_technician", name: "Example Dental Lab" }),
  OSM_NODE(410, { shop: "medical_supply", name: "Example Dental Suppliers" }),
  OSM_NODE(411, { building: "yes", name: "Example Family Dental Clinic" }),
]) });
r = await call({ body: { action: "search", type: "pediatric dentist", city: "Patna", preset: "kids" } });
check("a clinic tagged only with a dental speciality is asked for, kept, and found by the kids preset", [queryOf(overpassCalls()[0]), r.json.places.map((p) => p.placeId).join()],
  ([q, pids]) => q.includes('nwr["healthcare:speciality"~"dent|odont|oral_surgery|maxillo",i]') && pids === "osm:node/404");
check("... and its category says dentist, with the speciality", r.json.places[0]?.primaryType, (c) => c === "dentist (paediatric_dentistry)");
r = await call({ body: { action: "search", type: "dental clinic", city: "Patna", preset: "dental" } });
check("... while an A&E hospital, a polyclinic, a multi-speciality hospital, a dental lab and a supplier are not dental clinics; a named building is",
  r.json.places.map((p) => p.placeId).sort().join(), (pids) => pids === "osm:node/404,osm:node/406,osm:node/411");
check("a polyclinic's category is just 'clinic', so the page cannot take it for a dentist", osm.categoryOf({ amenity: "clinic", "healthcare:speciality": "dentist;dermatology" }),
  (c) => c === "clinic");
reset({ overpass: answer([
  // Delhi NCR, 4 Oct 2026: a teaching centre, a dental college, a regulator and government units were listed among the clinics.
  OSM_NODE(421, { building: "yes", name: "Example Centre For Dental Education & Research-AIIMS" }),
  OSM_NODE(422, { amenity: "hospital", healthcare: "hospital", name: "Example Institute of Dental Sciences" }),
  OSM_NODE(423, { amenity: "dentist", healthcare: "dentist", name: "Govt. Example Dental College and Hospital" }),
  OSM_NODE(424, { building: "yes", name: "Example Dental Council of India" }),
  OSM_NODE(425, { amenity: "dentist", healthcare: "dentist", "operator:type": "government", name: "Example Dental Unit" }),
  OSM_NODE(426, { amenity: "dentist", name: "Example Dental Hospital" }),
  OSM_NODE(427, { amenity: "dentist", healthcare: "dentist", office: "research", name: "Example Dental Clinic And Implantology Research Centre" }),
]) });
r = await call({ body: { action: "search", type: "dental clinic", city: "Patna", preset: "dental" } });
check("dental: a teaching centre (AIIMS), a dental college or institute of dental sciences, a regulator and a government unit are not clinics, whatever their tags; a private dental hospital is",
  names(r).sort().join("|"), (n) => n === "Example Dental Clinic And Implantology Research Centre|Example Dental Hospital");
{
  // Every Lead Finder preset id has an OSM spec of its own.
  const src = readFileSync(new URL("../src/lib/leadFinder/leads.ts", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("export const TYPE_PRESETS"), src.indexOf("];", src.indexOf("export const TYPE_PRESETS")));
  const presetIds = [...block.matchAll(/\{ id: "([a-z0-9_-]+)"/g)].map((m) => m[1]);
  check(`every preset in leads.ts (${presetIds.length}) has an OSM spec`, presetIds, (l) => l.length >= 12 && l.every((id) => osm.SPECS[id]?.id === id));
  check("the five dental presets are there", presetIds, (l) => ["dental", "ortho", "implant", "kids", "cosmetic"].every((id) => l.includes(id)));
  // The radii the page offers (Area) are the ones the server takes.
  const client = readFileSync(new URL("../src/lib/leadFinder/client.ts", import.meta.url), "utf8");
  const offered = /export const RADIUS_CHOICES_KM = \[([^\]]*)\] as const;/.exec(client)?.[1];
  check("the page offers the radii the server takes (5, 10 and 25 km)", [offered, osm.RADIUS_CHOICES_KM.join(", ")], ([c, s]) => c === s && s === "5, 10, 25");
}

log("OpenStreetMap: schools, CBSE, play schools");
const SCHOOLISH = [
  OSM_NODE(601, { amenity: "school", name: "Example Public School", "contact:mobile": "+91 98765 43214" }),
  OSM_NODE(602, { amenity: "school", name: "Example Girls High School" }),
  OSM_NODE(603, { amenity: "school", name: "Govt. Example Middle School" }),
  OSM_NODE(604, { building: "school", name: "Example Vidya Mandir" }),
  OSM_NODE(605, { office: "educational_institution", name: "Example Convent School" }),
  OSM_NODE(606, { amenity: "college", name: "Example Inter College" }),
  OSM_NODE(607, { amenity: "school", name: "Example Coaching Classes" }),
  OSM_NODE(608, { amenity: "school", name: "Example School Administrative Block" }),
  OSM_NODE(609, { amenity: "school", name: "Example Degree College" }),
  OSM_NODE(610, { office: "government", name: "Example School Examination Board" }),
  OSM_NODE(611, { amenity: "kindergarten", name: "Example Kidz Play School" }),
  OSM_NODE(612, { amenity: "childcare", name: "Anganwadi Kendra Example" }),
  OSM_NODE(613, { amenity: "school", name: "Example Kids International High School" }),
  OSM_NODE(614, { amenity: "school", name: "Example Driving School" }),
  OSM_NODE(615, { amenity: "school", name: "Rajkiya Example Madhya Vidyalaya" }),
];
reset({ overpass: answer(SCHOOLISH) });
r = await call({ body: { action: "search", type: "school", city: "Patna", preset: "school" } });
const sq = queryOf(overpassCalls()[0]);
check("the school query asks for amenity=school, named school buildings, school-named educational offices and inter colleges", sq,
  (q) => q.includes('nwr["amenity"="school"]') && q.includes('nwr["building"="school"][!"amenity"]["name"]')
    && q.includes('nwr["office"="educational_institution"]["name"~"school|vidyala') && q.includes('nwr["amenity"="college"]["name"~"inter college'));
check("schools: a building called Vidya Mandir, an office called Convent School and an Inter College are schools",
  names(r), (n) => ["Example Vidya Mandir", "Example Convent School", "Example Inter College"].every((x) => n.includes(x)));
check("... a coaching centre mapped as a school, a campus block, a degree college, an exam board, an anganwadi and a driving school are not",
  names(r), (n) => !n.some((x) => /Coaching Classes|Administrative Block|Degree College|Examination Board|Anganwadi|Driving/.test(x)));
check("government schools come last", names(r).slice(-2).sort().join("|"), (n) => n === "Govt. Example Middle School|Rajkiya Example Madhya Vidyalaya");
r = await call({ body: { action: "search", type: "CBSE school", city: "Patna", preset: "cbse" } });
check("CBSE preset: every school, the CBSE-looking names first, government last, and one plain line saying OSM has no board",
  [r.status, names(r)[0], names(r).at(-1), r.json.caveat, r.json.broadened],
  ([s, first, last, c, b]) => s === 200 && /Public School|Convent School/.test(first) && /Govt|Rajkiya/.test(last)
    && /does not record a school's board/.test(c) && /CBSE or not/.test(c) && b === undefined);
check("contact:mobile gives the phone too", r.json.places.find((p) => p.placeId === "osm:node/601")?.phoneIntl, (p) => p === "+919876543214");
r = await call({ body: { action: "search", type: "play school", city: "Patna", preset: "play" } });
check("play schools: a kindergarten yes; an anganwadi and a high school called '... Kids ...' no", names(r).join("|"),
  (n) => n.includes("Example Kidz Play School") && !/Anganwadi|International High School/.test(n));
r = await call({ body: { action: "search", type: "coaching institute", city: "Patna", preset: "coaching" } });
check("... and the coaching centre mapped as a school is in the coaching list, the schools are not", names(r).join("|"),
  (n) => n.includes("Example Coaching Classes") && !/Public School|Convent School|Vidya Mandir/.test(n));

log("OpenStreetMap: coaching by name, and what is not coaching");
reset({ overpass: answer([
  OSM_NODE(701, { name: "Example Sharma Coaching Classes" }),
  OSM_NODE(702, { building: "yes", name: "Example Success Academy" }),
  OSM_NODE(703, { barrier: "gate", name: "Example IIT Gate" }),
  OSM_NODE(704, { tourism: "guest_house", name: "Example IIT Guest House" }),
  OSM_NODE(705, { shop: "books", name: "Example Career Point Books" }),
  OSM_NODE(706, { amenity: "prep_school", name: "Example Girls Hostel" }),
  OSM_NODE(707, { amenity: "parking", name: "Example Institute Parking" }),
  OSM_NODE(708, { office: "educational_institution", name: "Example NDA Defence Academy" }),
  OSM_NODE(709, { amenity: "training", name: "Example Bank PO Institute" }),
  OSM_NODE(710, { amenity: "prep_school", name: "Example NEET Physics Classes" }),
  OSM_NODE(711, { name: "Example Academy" }),
  // Patna, 4 Oct 2026: a heart institute ("हृदयरोग संस्थान") mapped as an educational office, named only in Devanagari.
  OSM_NODE(712, { office: "educational_institution", name: "उदाहरण हृदयरोग संस्थान" }),
  OSM_NODE(713, { office: "educational_institution", name: "उदाहरण कोचिंग संस्थान" }),
]) });
r = await call({ body: S });
check("coaching: a bare name with a coaching word, a building called '... Academy', a defence academy, a training institute",
  names(r), (n) => ["Example Sharma Coaching Classes", "Example Success Academy", "Example NDA Defence Academy", "Example Bank PO Institute"].every((x) => n.includes(x)));
check("... not a gate, a guest house, a bookshop, a hostel, a car park, or a bare name with a weak word", names(r),
  (n) => !n.some((x) => /Gate|Guest House|Books|Hostel|Parking/.test(x)) && !n.includes("Example Academy"));
check("... nor a heart institute named in Devanagari; a coaching institute named in Devanagari stays", names(r),
  (n) => !n.includes("उदाहरण हृदयरोग संस्थान") && n.includes("उदाहरण कोचिंग संस्थान"));
r = await call({ body: { ...S, type: "SSC banking coaching", preset: "ssc" } });
check("SSC, banking and defence: the defence academy and the bank PO institute", names(r).sort().join("|"),
  (n) => n === "Example Bank PO Institute|Example NDA Defence Academy");
r = await call({ body: { ...S, type: "JEE NEET coaching", preset: "jee" } });
check("JEE/NEET: the NEET physics classes", names(r).join("|"), (n) => n === "Example NEET Physics Classes");
check("the coaching query asks for training centres too", queryOf(overpassCalls()[0]), (q) => q.includes('nwr["amenity"="training"]'));

log("OpenStreetMap: typed types");
reset({ overpass: answer([
  OSM_NODE(751, { leisure: "fitness_centre", name: "Example Fitness Studio" }),
  { type: "way", id: 752, center: { lat: 25.6, lon: 85.1 }, tags: { highway: "residential", name: "Gym Road" } },
  { type: "way", id: 753, center: { lat: 25.63, lon: 85.1 }, tags: { building: "yes", leisure: "fitness_centre", name: "Example Gym" } },
]) });
r = await call({ body: { action: "search", type: "gym", city: "Patna" } });
check("a typed 'gym' asks for fitness centres, and a road called Gym Road is not a gym", [r.status, names(r).sort().join("|"), queryOf(overpassCalls()[0])],
  ([s, n, q]) => s === 200 && n === "Example Fitness Studio|Example Gym" && q.includes('nwr["leisure"="fitness_centre"]'));
reset();
r = await call({ body: { action: "search", type: "!!", city: "Patna" } });
check("a type with no letters -> 400 osm_type in plain words, nothing asked", [r.status, r.json.code, r.json.error, overpassCalls().length],
  ([s, c, e, n]) => s === 400 && c === "osm_type" && /English letters/.test(e) && n === 0);

log("OpenStreetMap: servers, retries, cache, pages");
{
  const tried = [];
  reset({ overpass: (host, q) => { tried.push(host); return host === "overpass-api.de" ? new Response("<html>504 Gateway Timeout</html>", { status: 504 }) : answer(OSM_COACHING)(host, q); } });
  r = await call({ body: S });
  check("overpass-api.de busy at once, twice -> one retry, then overpass.private.coffee answers", [r.status, r.json.places?.length, tried.join(",")],
    ([s, n, t]) => s === 200 && n === 2 && t === "overpass-api.de,overpass-api.de,overpass.private.coffee");
  check("a short wait before the retry", sleeps.some((ms) => ms >= 500 && ms <= 1000), (v) => v === true);
}
{
  const tried = [];
  reset({ overpass: (host, q) => { tried.push(host); return host === "maps.mail.ru" ? answer(OSM_COACHING)(host, q) : json(429, { remark: "rate limited" }); } });
  r = await call({ body: S });
  check("429 (too many requests): the next server at once, the busy one is not hammered", [r.status, tried.join(",")],
    ([s, t]) => s === 200 && t === "overpass-api.de,overpass.private.coffee,maps.mail.ru");
}
{
  const tried = [];
  let n429 = 0;
  reset({ overpass: (host, q) => { tried.push(host); return host === "overpass-api.de" && ++n429 > 1 ? answer(OSM_COACHING)(host, q) : json(429, { remark: "rate limited" }); } });
  r = await call({ body: S });
  check("429 everywhere: overpass-api.de is asked again only after the others, and after waiting 5 s", [r.status, tried.join(","), Math.max(0, ...sleeps)],
    ([s, t, w]) => s === 200 && t === "overpass-api.de,overpass.private.coffee,maps.mail.ru,overpass-api.de" && w >= 4_000 && w <= 5_000);
}
{
  // A server that never answers in time: its retry waits until the others have had their turn.
  const tried = [];
  reset({ overpass: (host, q) => {
    tried.push(host);
    if (host === "overpass.private.coffee") return answer(OSM_COACHING)(host, q);
    throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  } });
  r = await call({ body: S });
  check("overpass-api.de times out -> overpass.private.coffee is asked next, before any retry", [r.status, tried.join(",")],
    ([s, t]) => s === 200 && t === "overpass-api.de,overpass.private.coffee");
}
{
  // A 504 that took 9 s (the usual sign of an overloaded server): same, the next server first.
  const tried = [];
  const realNow = osm.deps.now;
  let skew = 0;
  osm.deps.now = () => Date.now() + skew;
  reset({ overpass: (host, q) => {
    tried.push(host);
    if (host === "overpass-api.de") { skew += 9_000; return new Response("<html>504 Gateway Time-out</html>", { status: 504 }); }
    if (host === "overpass.private.coffee") { skew += 10_000; throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); }
    return answer(OSM_COACHING)(host, q);
  } });
  let got;
  try {
    got = await osm.overpass("[out:json];node(1);out;", { deadline: osm.deps.now() + 52_000 });
  } catch (e) { got = e; }
  osm.deps.now = realNow;
  check("a slow 504, then a time-out -> the third server is tried before either retry", [got?.endpoint, tried.join(",")],
    ([e, t]) => e === "https://maps.mail.ru/osm/tools/overpass/api/interpreter" && t === "overpass-api.de,overpass.private.coffee,maps.mail.ru");
}
{
  // An answer that starts, then stalls until the time-out fires (the stream fails with the time-out, as real fetch does).
  const tried = [];
  const stalled = () => new Response(new ReadableStream({ start(c) {
    c.enqueue(new TextEncoder().encode('{"version":0.6,"elements":['));
    c.error(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
  } }), { status: 200, headers: { "content-type": "application/json" } });
  reset({ overpass: (host) => { tried.push(host); return stalled(); } });
  r = await call({ body: S });
  check("an answer that stalls part-way is 'no answer in time' (not 'not JSON'), and its retry waits until the others had their turn",
    [r.status, r.json.code, r.json.error, tried.join(",")],
    ([s, c, e, t]) => s === 502 && c === "osm_busy" && OVERPASS_HOSTS.every((h) => e.includes(`${h}: no answer in time`)) && !/not JSON/.test(e)
      && t === "overpass-api.de,overpass.private.coffee,maps.mail.ru,overpass-api.de,overpass.private.coffee,maps.mail.ru");
}
{
  // The mirrors get a short try (10 s); overpass-api.de's first try may take 30 s.
  reset({ overpass: () => { throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); } });
  const realTimeout = AbortSignal.timeout;
  const asked = [];
  AbortSignal.timeout = (ms) => { asked.push(ms); return realTimeout.call(AbortSignal, ms); };
  try { await osm.overpass("[out:json];node(3);out;", { deadline: Date.now() + 52_000 }); } catch { /* every server hangs */ }
  AbortSignal.timeout = realTimeout;
  check("each try has a time-out: 30 s for overpass-api.de's first, 10 s for each mirror", asked.slice(0, 3), (a) => a[0] === 30_000 && a[1] === 10_000 && a[2] === 10_000);
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
  check("... and still no key was read for it", keyReads().length, (n) => n === 0);
  check("... said with what to do first, then each server once (it listed each twice, one per try, until 4 Oct 2026)",
    [r.json.error, overpassCalls().length],
    ([e, n]) => n === 6 && e.startsWith("OpenStreetMap's search servers are busy right now. Try again in a minute. (")
      && OVERPASS_HOSTS.every((h) => e.split(`${h}: could not connect`).length === 2));
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
  const many = Array.from({ length: 25 }, (_, i) => OSM_NODE(500 + i * 10, { amenity: "prep_school", name: `Example Tutorial ${String(i).padStart(2, "0")}`, ...(i % 2 ? { phone: "98765432" + String(10 + i) } : {}) }));
  reset({ keys: [keyRow(KEY1, 1)], google: { [KEY1]: searchOk() }, overpass: answer(many) });
  const p1 = await call({ body: S });
  const p2 = await call({ body: { ...S, pageToken: p1.json.nextPageToken } });
  check("page 1: 20 of 25, token osm.20", [p1.json.places.length, p1.json.total, p1.json.nextPageToken], ([n, t, k]) => n === 20 && t === 25 && k === "osm.20");
  check("page 2: the last 5, no token, from the cache (one Overpass call in all)", [p2.json.places.length, p2.json.nextPageToken, overpassCalls().length],
    ([n, k, c]) => n === 5 && k === null && c === 1);
  check("an OSM 'Load more' never reads the Google keys, even with google: true sent along", [keyReads().length, googleCalls().length,
    (await call({ body: { ...S, google: true, pageToken: "osm.20" } })).json.source], ([k, g, src]) => k === 0 && g === 0 && src === "osm");
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

if (NEGATIVE) {
  // LEADS_NEGATIVE=1 planted two mistakes: the free-first and the coaching checks must have failed, and the run exits 1.
  const freeFirst = fails.some((f) => /WORKING Google key|FAILING key|no key of any kind|never reads the Google keys/.test(f));
  const coaching = fails.some((f) => /coaching drops the hospital|not a gate, a guest house/.test(f));
  origError(`\nNEGATIVE MODE: ${fails.length} checks failed${freeFirst && coaching ? ", among them the free-first and the coaching checks, as they must" : ", BUT NOT the ones the planted mistakes should break"}`);
  process.exit(1);
}
origError(fails.length ? `\n${fails.length} FAILED` : "\nAll passed");
process.exit(fails.length ? 1 : 0);
