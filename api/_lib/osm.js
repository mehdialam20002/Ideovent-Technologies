/**
 * OpenStreetMap, the Lead Finder's FREE source (added 28 September 2026).
 * No key, no card, no bill. Used when no Google Maps key is saved, or when
 * every Google key fails (out of quota, billing off, a bad key).
 *
 * TWO PUBLIC SERVICES, used politely:
 *   Nominatim  GET https://nominatim.openstreetmap.org/search?format=jsonv2&q=<city>
 *              turns the city into a box on the map. Usage policy: at most 1
 *              request a second, a User-Agent that names the app, and cache
 *              the answers (https://operations.osmfoundation.org/policies/nominatim/).
 *              So: one call at a time, 1 s apart, remembered in memory.
 *   Overpass   POST data=<query> to the first endpoint that answers, in the
 *              order of OVERPASS_ENDPOINTS, each with a timeout and one retry.
 *              Answers are remembered for 10 minutes so "Load more" is free.
 *
 * THE DATA is © OpenStreetMap contributors, under the Open Database Licence
 * (ODbL 1.0). Every OSM answer carries that attribution and the page shows it.
 * Unlike Google's Places content, ODbL lets us keep what we use (with the
 * attribution), so a phone from OSM may go on a lead.
 *
 * HONEST LIMITS (measured 28 Sep 2026): India has 6,271 dentists on OSM
 * (amenity=dentist or healthcare=dentist), 492 of them with a phone; Patna has
 * 83 schools, 4 with a phone. The finder's own search on 30 Sep 2026: "dentist"
 * in Indore, 250 clinics, 225 with a phone (226 of them carry a 2019 field
 * survey source tag, "2C_Indore Field Visit 2019"); "school" in Patna, 72
 * named schools in its box, 4 with a phone. Google Maps lists far more
 * businesses and far more phone numbers. The page says so beside every OSM
 * result list.
 *
 * Nothing here throws anything but OsmError, and nothing here is ever given a
 * key: there is none.
 */

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
/** Tried in this order; each gets one retry (see overpass()). */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/**
 * The site the User-Agent names, so OpenStreetMap's operators can see who is
 * calling. It is the address that answers today: VITE_PUBLIC_URL (the same
 * variable src/lib/host.ts reads), else https://ideovent.vercel.app. Not
 * ideovent.in, which does not resolve yet (30 Sep 2026). Only a bare
 * http(s)://host is accepted, so nothing odd can reach a header.
 */
export function siteUrl(env = typeof process !== "undefined" ? process.env : {}) {
  const v = String(env?.VITE_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[a-z0-9.-]+(:\d{2,5})?$/i.test(v) ? v : "https://ideovent.vercel.app";
}
export const USER_AGENT = `IdeoventLeadFinder/1.0 (+${siteUrl()}; admin lead finder)`;
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
export const OSM_LICENCE = "ODbL";
export const OSM_NOTE = "OpenStreetMap is free, but it lists fewer businesses and fewer phone numbers than Google Maps.";

export const PAGE_SIZE = 20;
/** The most elements one Overpass answer may hold. A city's dentists fit (Indore: about 240). */
export const MAX_ELEMENTS = 400;
const NOMINATIM_GAP_MS = 1_000;
const NOMINATIM_TIMEOUT_MS = 8_000;
/* Measured 30 Sep 2026 from India: a city query answers in 1 to 14 s, and a
   busy server often sends 504 after about 9 s. So one try may take 12 s. */
const OVERPASS_TRY_MS = 12_000;
/* Declared to the server. Lower than its defaults (180 s, 512 MiB), which
   makes a busy server more willing to run the query; a Delhi-sized coaching
   search used well under 128 MiB (30 Sep 2026). */
const OVERPASS_SERVER_TIMEOUT_S = 15;
const OVERPASS_MAXSIZE = 256 * 1024 * 1024;
/** A failure slower than this (a late 504, a time-out) sends that server's retry to the back of the line. */
const SLOW_FAIL_MS = 4_000;
const RETRY_WAIT_MS = 800;
const RESULT_TTL_MS = 10 * 60_000;
const CACHE_MAX = 200;

/** An OSM result's id, as the finder carries it: osm:node/123. */
export const OSM_ID_RE = /^osm:(node|way|relation)\/\d{1,15}$/;
/** An OSM "Load more" token: the offset of the next page. */
export const OSM_TOKEN_RE = /^osm\.(\d{1,4})$/;

/** Swappable in tests, so no test ever touches the network or waits. */
export const deps = {
  fetch: (...a) => globalThis.fetch(...a),
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/** The only error this module throws. `code`: osm_city (unknown place), osm_busy, osm_type, osm_time. */
export class OsmError extends Error {
  constructor(message, { code = "osm_busy" } = {}) {
    super(message);
    this.code = code;
  }
}

/* ── What to look for ─────────────────────────────────────────────────────
   Each spec: Overpass selectors (the box is added once, globally), a `keep`
   test that is the real judge (Overpass only narrows the download), an
   optional `narrow` test for a speciality, and `broadenTo`: the spec whose
   results are shown, with a plain note, when the speciality finds nobody.
   The ids match TYPE_PRESETS in src/lib/leadFinder/leads.ts. */

// Mirrors looksDental() in src/lib/demo/templates/dentalPick.ts (this file is plain JS for Vercel).
const DENTAL_WORDS = /\b(dental|dentist\w*|dentistry|orthodont\w*|endodont\w*|periodont\w*|prosthodont\w*|pedodont\w*|implantolog\w*|oral (care|surgeon|surgery|health)|tooth|teeth|32\s*(pearls|teeth)|smile (dental|clinic|care))\b/i;
export const looksDentalText = (s) => DENTAL_WORDS.test(String(s || ""));

// Not a coaching centre, whatever its name says ("... Hospital and Research Institute").
const NOT_COACHING_AMENITY = /^(hospital|clinic|doctors|dentist|pharmacy|blood_bank|research_institute|college|university|school|kindergarten|childcare|place_of_worship|bank|atm|police|townhall|courthouse|social_facility)$/;
const NOT_COACHING_NAME = /\b(hospital|clinic|nursing|medicare|medical sciences|blood bank|diagnostic\w*|patholog\w*|research (institute|centre|center)|eye institute|heart institute|cricket|tennis|football|badminton|gymnastics?|swimming|karate|taekwondo|physical academy|judicial academy|police academy)\b/i;
export function isHealthcareOrCollege(t, name) {
  return !!t.healthcare || NOT_COACHING_AMENITY.test(t.amenity || "")
    || /^(hospital|school|university|college)$/.test(t.building || "") || NOT_COACHING_NAME.test(name || "");
}

// A dental speciality ("orthodontics", "paediatric_dentistry"), from a word start: "accident_and_emergency" is not one.
const DENTAL_SPECIALITY = /(^|[^a-z])(dent(al|ist)|orthodont|endodont|periodont|prosthodont|pedodont|paedodont|oral_surgery|maxillo)/i;
const specialities = (t) => String(t["healthcare:speciality"] || "").split(/[;,\s]+/).map((s) => s.trim()).filter(Boolean);
/*
  Dental by its tags: mapped as a dentist, or every speciality it lists is
  dental. Measured in Indore on 30 Sep 2026: of 48 places found only by a
  dental speciality, most were hospitals and polyclinics listing "dentist"
  among ten others. They are not dental clinics, so they are not kept.
*/
export const isDentalTags = (t) => t.amenity === "dentist" || t.healthcare === "dentist"
  || (specialities(t).length > 0 && specialities(t).every((s) => DENTAL_SPECIALITY.test(s)));

const COACHING_SELECTORS = [
  'nwr["amenity"="prep_school"]',
  'nwr["office"="educational_institution"]',
  'nwr["name"~"coaching|classes|tutorial|tuition|academy|institute",i][!"healthcare"]["amenity"!~"^(hospital|clinic|doctors|dentist|pharmacy|blood_bank|college|university|school)$"]',
];
const DENTAL_SELECTORS = [
  'nwr["amenity"="dentist"]',
  'nwr["healthcare"="dentist"]',
  'nwr["amenity"~"^(clinic|doctors|hospital)$"]["name"~"dental|dentist|teeth|tooth|orthodont",i]',
  'nwr["healthcare"]["name"~"dental|dentist|teeth|tooth|orthodont",i]',
  // A clinic tagged only by its dental speciality ("orthodontics", "paediatric_dentistry").
  'nwr["healthcare:speciality"~"dental|dentist|odont",i]',
];
const coachingKeep = (t, name) => !isHealthcareOrCollege(t, name);
const dentalKeep = (t, name) => isDentalTags(t) || looksDentalText(`${name} ${t["name:en"] || ""}`);

/** Words of a result a speciality is judged on: its names, speciality and description. */
const specialityText = (t, name) => [name, t["name:en"], t["healthcare:speciality"], t.description, t.speciality].filter(Boolean).join(" ");

export const SPECS = {
  school: { id: "school", label: "schools", selectors: ['nwr["amenity"="school"]'], keep: () => true },
  cbse: {
    id: "cbse", label: "schools", selectors: ['nwr["amenity"="school"]'], keep: () => true,
    // OSM has no tag for a school's board, so every school is listed, and the page says why.
    caveat: (city) => `OpenStreetMap does not record a school's board, so these are all the schools it lists in ${city}, CBSE or not.`,
  },
  play: {
    id: "play", label: "play schools",
    selectors: ['nwr["amenity"="kindergarten"]', 'nwr["amenity"="childcare"]',
      'nwr["amenity"="school"]["name"~"play|pre.?school|kids|montessori|kindergarten|nursery",i]'],
    keep: () => true,
  },
  coaching: { id: "coaching", label: "coaching centres", selectors: COACHING_SELECTORS, keep: coachingKeep },
  jee: {
    id: "jee", label: "JEE/NEET coaching", selectors: COACHING_SELECTORS, keep: coachingKeep, broadenTo: "coaching",
    narrow: /\b(jee|neet|iit\w*|medical|engineering|pre[- ]?medical|aakash|allen|fiitjee|resonance|vidyamandir|narayana|physics|chemistry|maths?|mathematics|science)\b/i,
  },
  ssc: {
    id: "ssc", label: "SSC and banking coaching", selectors: COACHING_SELECTORS, keep: coachingKeep, broadenTo: "coaching",
    narrow: /\b(ssc|bank\w*|ibps|po|railways?|rrb|upsc|ias|bpsc|civil services|competitive|competition|government jobs?|sarkari)\b/i,
  },
  tuition: {
    id: "tuition", label: "tuition centres", selectors: COACHING_SELECTORS, keep: coachingKeep, broadenTo: "coaching",
    narrow: /\b(tuition|tutors?|tutorials?|classes|home tutor)\b/i,
  },
  dental: { id: "dental", label: "dental clinics", selectors: DENTAL_SELECTORS, keep: dentalKeep },
  ortho: {
    id: "ortho", label: "orthodontists", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(orthodont\w*|aligners?|braces|invisalign)\b/i,
  },
  implant: {
    id: "implant", label: "dental implant centres", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(implants?|implantolog\w*|prosthodont\w*|dentures?|full[- ]mouth)\b/i,
  },
  kids: {
    id: "kids", label: "children's dentists", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(kids?|child(ren)?'?s?|paediatric\w*|pediatric\w*|pedodont\w*|paedodont\w*)\b/i,
  },
  cosmetic: {
    id: "cosmetic", label: "cosmetic dentists", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(cosmetic|aesthetic\w*|smile (design|studio|makeover|gallery)|veneers?|whitening)\b/i,
  },
};

/* Typed ("Other") business types that have an OSM tag. Anything else is searched by name. */
const TYPED = [
  [/\b(gym|fitness|workout)\b/, ['nwr["leisure"="fitness_centre"]', 'nwr["name"~"gym|fitness",i]["leisure"]']],
  [/\byoga\b/, ['nwr["sport"="yoga"]', 'nwr["name"~"yoga",i]']],
  [/\b(salon|parlou?r|beauty|spa)\b/, ['nwr["shop"~"^(beauty|hairdresser)$"]']],
  [/\bphysio/, ['nwr["healthcare"="physiotherapist"]', 'nwr["name"~"physio",i]']],
  [/\b(pharmacy|chemist|medical store)\b/, ['nwr["amenity"="pharmacy"]']],
  [/\bhospital\b/, ['nwr["amenity"="hospital"]']],
  [/\b(clinic|doctor|physician)\b/, ['nwr["amenity"~"^(clinic|doctors)$"]']],
  [/\b(restaurant|dhaba)\b/, ['nwr["amenity"="restaurant"]']],
  [/\b(cafe|coffee)\b/, ['nwr["amenity"="cafe"]']],
  [/\b(hotel|guest ?house|lodge)\b/, ['nwr["tourism"~"^(hotel|guest_house|motel)$"]']],
  [/\bmusic\b/, ['nwr["amenity"="music_school"]', 'nwr["name"~"music",i]']],
  [/\bdance\b/, ['nwr["amenity"="dancing_school"]', 'nwr["name"~"dance",i]']],
  [/\b(optician|optical|eye)\b/, ['nwr["shop"="optician"]', 'nwr["healthcare:speciality"~"ophthalmology"]']],
  [/\blibrary\b/, ['nwr["amenity"~"^(library|study)$"]']],
];

/**
 * The spec for a search: the preset's when Mehdi picked one, else guessed from
 * the typed words. Dental words win first, as in the CRM. Returns a spec or
 * throws OsmError(osm_type) for words that cannot be searched.
 */
export function specFor(presetId, typeText) {
  if (presetId && Object.hasOwn(SPECS, presetId)) return SPECS[presetId];
  const text = String(typeText || "").toLowerCase();
  if (looksDentalText(text)) {
    for (const id of ["kids", "ortho", "implant", "cosmetic"]) if (SPECS[id].narrow.test(text)) return SPECS[id];
    return SPECS.dental;
  }
  if (/\b(play ?school|pre.?school|kindergarten|montessori|creche|day ?care)\b/.test(text)) return SPECS.play;
  if (/\bschool\b/.test(text)) return SPECS.school;
  if (/\b(jee|neet)\b/.test(text)) return SPECS.jee;
  if (/\b(ssc|banking|ibps|upsc|bpsc)\b/.test(text)) return SPECS.ssc;
  if (/\b(tuition|tutor)/.test(text)) return SPECS.tuition;
  if (/\b(coaching|classes|tutorials?|institute|academy)\b/.test(text)) return SPECS.coaching;
  for (const [re, selectors] of TYPED) {
    if (re.test(text)) return { id: "typed", label: text, selectors, keep: () => true };
  }
  // Searched by name. Only letters, digits and spaces reach the query.
  const words = text.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (words.length < 3) throw new OsmError("Type the business type in English letters, e.g. gym or dental clinic.", { code: "osm_type" });
  return { id: "named", label: text, selectors: [`nwr["name"~"${words}",i]`], keep: () => true };
}

/* ── OSM tags -> the finder's result shape ────────────────────────────────── */

const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const firstOf = (t, keys) => {
  for (const k of keys) {
    const v = str(t[k]);
    if (v) return v;
  }
  return null;
};

/** The name to show: the local name, or its English one when the local name has no Latin letters. */
export function pickName(t) {
  const name = str(t.name);
  const en = str(t["name:en"]);
  if (name && !/[A-Za-z]/.test(name) && en) return en;
  return name || en || null;
}

/** A readable address from addr:* tags, or null. */
export function addressOf(t) {
  const street = [str(t["addr:housenumber"]), str(t["addr:street"])].filter(Boolean).join(" ");
  const parts = [str(t["addr:housename"]), street, str(t["addr:place"]) || str(t["addr:suburb"]) || str(t["addr:neighbourhood"]),
    str(t["addr:city"]) || str(t["addr:district"]), str(t["addr:postcode"]), str(t["addr:state"])];
  const seen = new Set();
  const out = parts.filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
  return out.length ? out.join(", ") : null;
}

/** The first number in an OSM phone tag ("+91 98765 43210; 0612 2345678"), as written. */
export function firstPhone(t) {
  const raw = firstOf(t, ["phone", "contact:phone", "mobile", "contact:mobile", "phone:mobile"]);
  if (!raw) return null;
  return raw.split(/[;,/]/).map((x) => x.trim()).find((x) => /\d{5}/.test(x.replace(/\D/g, ""))) || null;
}

/** +91XXXXXXXXXX for an Indian number, +<digits> for another written with +, else null. */
export function intlPhone(raw) {
  if (!raw) return null;
  const plus = raw.trim().startsWith("+");
  let d = raw.replace(/\D/g, "");
  if (!plus && d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  if (d.length === 11 && d.startsWith("0")) return `+91${d.slice(1)}`;
  if (d.length === 10 && !plus) return `+91${d}`;
  // "+91 2361514" (a landline without its city code) is not a number anyone can dial.
  return plus && !d.startsWith("91") && d.length >= 8 && d.length <= 15 ? `+${d}` : null;
}

/**
 * What kind of place the tags say it is, e.g. "dentist (orthodontics)" or
 * "prep_school". The page reads "dent..." here as a dental practice, so only a
 * place that is dental by its tags (isDentalTags) is called a dentist and
 * shows its specialities; a polyclinic listing a dentist among ten others is
 * just "clinic".
 */
export function categoryOf(t) {
  const main = str(t.amenity) || str(t.healthcare) || str(t.office) || str(t.shop) || str(t.leisure) || str(t.tourism) || null;
  if (!isDentalTags(t)) return main;
  const spec = str(t["healthcare:speciality"]);
  return spec && spec !== "dentist" ? `dentist (${spec.replace(/\s*;\s*/g, ", ")})` : "dentist";
}

/** One Overpass element as a finder result, or null when it has no name. */
export function mapElement(el) {
  if (!el || typeof el !== "object" || !["node", "way", "relation"].includes(el.type) || !Number.isFinite(el.id)) return null;
  const t = el.tags && typeof el.tags === "object" ? el.tags : {};
  const name = pickName(t);
  if (!name) return null;
  const lat = Number.isFinite(el.lat) ? el.lat : Number.isFinite(el.center?.lat) ? el.center.lat : null;
  const lon = Number.isFinite(el.lon) ? el.lon : Number.isFinite(el.center?.lon) ? el.center.lon : null;
  const phone = firstPhone(t);
  return {
    placeId: `osm:${el.type}/${el.id}`,
    name: name.slice(0, 200),
    address: addressOf(t),
    phone,
    phoneIntl: intlPhone(phone),
    website: firstOf(t, ["website", "contact:website", "url"]),
    rating: null,
    ratingCount: null,
    mapsUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    businessStatus: null,
    primaryType: categoryOf(t),
    lat,
    lon,
    source: "osm",
  };
}

const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();

/*
  Never a business, whatever its name: a road ("Gym Road"), a railway, a
  river, an area or a boundary. A search by name ("gym", "music") would
  otherwise list "Fitness Road" as a gym.
*/
const NOT_A_PLACE_KEYS = ["highway", "railway", "waterway", "boundary", "place", "route", "landuse", "natural", "public_transport"];
const BUSINESS_KEYS = ["amenity", "shop", "office", "healthcare", "leisure", "craft", "tourism", "club", "sport"];
export const isNotAPlace = (t) => NOT_A_PLACE_KEYS.some((k) => t[k]) && !BUSINESS_KEYS.some((k) => t[k]);

/**
 * Elements -> results for a spec: named, kept by the spec's own test, one per
 * business (a clinic drawn as a point AND a building is one result), those
 * with a phone first, then by name. `narrowed` is false when the speciality
 * found nobody and the broader list is returned instead.
 */
export function placesFor(elements, spec) {
  const byKey = new Map();
  for (const el of Array.isArray(elements) ? elements : []) {
    const p = mapElement(el);
    if (!p || isNotAPlace(el.tags || {}) || !spec.keep(el.tags || {}, p.name)) continue;
    const key = `${squash(p.name)}|${p.lat === null ? "" : p.lat.toFixed(3)}|${p.lon === null ? "" : p.lon.toFixed(3)}`;
    const had = byKey.get(key);
    if (!had) byKey.set(key, { p, tags: el.tags || {} });
    else {
      for (const k of ["phone", "phoneIntl", "website", "address", "primaryType"]) if (!had.p[k] && p[k]) had.p[k] = p[k];
      had.tags = { ...el.tags, ...had.tags };
    }
  }
  let list = [...byKey.values()];
  let narrowed = true;
  if (spec.narrow) {
    const hits = list.filter(({ p, tags }) => spec.narrow.test(specialityText(tags, p.name)));
    if (hits.length || !spec.broadenTo) list = hits;
    else narrowed = false;
  }
  const places = list.map(({ p }) => p)
    .sort((a, b) => Number(!a.phone) - Number(!b.phone) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  return { places, narrowed };
}

/* ── Nominatim: the city as a box ─────────────────────────────────────────── */

const geoCache = new Map();
let nominatimQueue = Promise.resolve();
let lastNominatimAt = 0;

/** Keep a cache Map under its limit, oldest first. */
const trim = (m) => { while (m.size > CACHE_MAX) m.delete(m.keys().next().value); };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** A search box around the place: its own box, but never under ~9 km or over ~44 km across. */
export function boxFor(hit) {
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const [s, n, w, e] = (Array.isArray(hit.boundingbox) ? hit.boundingbox : []).map(Number);
  const halfLat = clamp(Number.isFinite(n - s) ? (n - s) / 2 : 0, 0.04, 0.2);
  const halfLon = clamp(Number.isFinite(e - w) ? (e - w) / 2 : 0, 0.04, 0.2);
  const r = (x) => Math.round(x * 1e5) / 1e5;
  return [r(lat - halfLat), r(lon - halfLon), r(lat + halfLat), r(lon + halfLon)];
}

/** One Nominatim call, at least 1 s after the last one from this instance. */
function nominatimCall(url, deadline) {
  const run = async () => {
    const wait = lastNominatimAt + NOMINATIM_GAP_MS - deps.now();
    if (wait > 0) await deps.sleep(wait);
    lastNominatimAt = deps.now();
    const left = deadline - deps.now();
    if (left < 1_000) throw new OsmError("Out of time before OpenStreetMap could find the city. Try again.", { code: "osm_time" });
    return deps.fetch(url, { method: "GET", headers: { "user-agent": USER_AGENT, accept: "application/json", "accept-language": "en" },
      signal: AbortSignal.timeout(Math.min(NOMINATIM_TIMEOUT_MS, left)) });
  };
  const p = nominatimQueue.then(run, run);
  nominatimQueue = p.catch(() => undefined);
  return p;
}

/**
 * The city's search box, from Nominatim (India only), cached in memory.
 * Returns { box: [south, west, north, east], name }. Throws OsmError.
 */
export async function geocodeCity(city, { deadline = deps.now() + 15_000 } = {}) {
  const q = String(city || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!q) throw new OsmError("Type a city, e.g. Patna.", { code: "osm_city" });
  const key = q.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=in&addressdetails=0&q=${encodeURIComponent(q)}`;
  let res;
  for (let attempt = 0; attempt < 2 && !res; attempt++) {
    try {
      const r = await nominatimCall(url, deadline);
      if (r.status >= 500 && attempt === 0) continue;
      res = r;
    } catch (e) {
      if (e instanceof OsmError || attempt === 1) {
        throw e instanceof OsmError ? e : new OsmError("OpenStreetMap's place search did not answer. Try again in a minute.");
      }
    }
  }
  if (!res) throw new OsmError("OpenStreetMap's place search did not answer. Try again in a minute.");
  if (res.status === 429) throw new OsmError("OpenStreetMap's place search asked us to slow down. Wait a minute and search again.");
  if (!res.ok) throw new OsmError(`OpenStreetMap's place search failed (HTTP ${res.status}). Try again in a minute.`);
  const list = await res.json().catch(() => null);
  const hit = Array.isArray(list) ? list[0] : null;
  const box = hit ? boxFor(hit) : null;
  if (!box) throw new OsmError(`OpenStreetMap does not know a place called "${q}" in India. Check the spelling, or try a bigger city nearby.`, { code: "osm_city" });
  const value = { box, name: str(hit.display_name) || q };
  geoCache.set(key, value);
  trim(geoCache);
  return value;
}

/* ── Overpass: what is inside the box ─────────────────────────────────────── */

/** The Overpass QL for a spec and a box. Only our own selectors and numbers go in. */
export function buildQuery(spec, box) {
  const bb = box.map((n) => Number(n).toFixed(5)).join(",");
  const parts = spec.selectors.map((s) => `${s};`).join("");
  return `[out:json][timeout:${OVERPASS_SERVER_TIMEOUT_S}][maxsize:${OVERPASS_MAXSIZE}][bbox:${bb}];(${parts});out tags center qt ${MAX_ELEMENTS};`;
}

const resultCache = new Map();

/**
 * Run a query on the first Overpass endpoint that answers, in the order of
 * OVERPASS_ENDPOINTS. Each endpoint gets one retry. A quick "busy" (429, a
 * fast 5xx, a refused connection, a server-side time-out remark) is retried
 * at once after a short wait; a server that failed slowly (no answer in time,
 * or a 504 after many seconds) gets its retry after the other servers have
 * had their turn, so one overloaded server cannot eat the whole budget. A 400
 * means our query is wrong and stops at once. Answers are kept for 10
 * minutes. Returns { elements, endpoint, cached }. Throws OsmError.
 */
export async function overpass(query, { deadline = deps.now() + 25_000 } = {}) {
  const hit = resultCache.get(query);
  if (hit && deps.now() - hit.at < RESULT_TTL_MS) return { elements: hit.elements, endpoint: hit.endpoint, cached: true };
  const errors = [];
  const queue = OVERPASS_ENDPOINTS.map((endpoint) => ({ endpoint, attempt: 0 }));
  while (queue.length) {
    const { endpoint, attempt } = queue.shift();
    const left = deadline - deps.now();
    if (left < 1_500) {
      throw new OsmError(`OpenStreetMap's search servers were too slow this time (${errors.join("; ") || "out of time"}). Try again in a minute.`, { code: "osm_time" });
    }
    const t0 = deps.now();
    let why;
    let timedOut = false;
    try {
      const res = await deps.fetch(endpoint, {
        method: "POST",
        headers: { "user-agent": USER_AGENT, accept: "application/json", "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(Math.min(OVERPASS_TRY_MS, left - 500)),
      });
      if (res.status === 400) throw new OsmError("OpenStreetMap could not read the search. This is a bug in the finder: tell Claude.", { code: "osm_query" });
      if (res.ok) {
        const j = await res.json().catch(() => null);
        if (j && Array.isArray(j.elements) && !/runtime error|timed out|out of memory/i.test(String(j.remark || ""))) {
          resultCache.set(query, { at: deps.now(), elements: j.elements, endpoint });
          trim(resultCache);
          return { elements: j.elements, endpoint, cached: false };
        }
        why = j ? "the server ran out of time" : "the answer was not JSON";
      } else why = `HTTP ${res.status}`;
    } catch (e) {
      if (e instanceof OsmError) throw e;
      timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
      why = timedOut ? "no answer in time" : "could not connect";
    }
    errors.push(`${new URL(endpoint).host}: ${why}`);
    if (attempt > 0) continue;
    const retry = { endpoint, attempt: 1 };
    if (timedOut || deps.now() - t0 >= SLOW_FAIL_MS) queue.push(retry);
    else {
      if (deadline - deps.now() > RETRY_WAIT_MS + 1_500) await deps.sleep(RETRY_WAIT_MS);
      queue.unshift(retry);
    }
  }
  throw new OsmError(`OpenStreetMap's search servers are busy (${errors.join("; ")}). Try again in a minute.`, { code: "osm_busy" });
}

/**
 * The whole OSM search: city -> box -> Overpass -> results, one page of 20.
 *   { type, city, preset?, offset?, deadline? }
 * Returns { places, nextPageToken, total, spec, broadened, caveat, endpoint },
 * where `broadened` is a plain sentence when a speciality found nobody and the
 * broader list is shown, and `caveat` one when OSM cannot tell the preset's
 * kind apart at all (a school's board). Throws OsmError with a sentence Mehdi
 * can act on.
 */
export async function osmSearch({ type, city, preset, offset = 0, deadline = deps.now() + 25_000 }) {
  const spec = specFor(preset, type);
  const geo = await geocodeCity(city, { deadline });
  const { elements, endpoint } = await overpass(buildQuery(spec, geo.box), { deadline });
  const { places, narrowed } = placesFor(elements, spec);
  const start = Math.max(0, Math.min(Number(offset) || 0, places.length));
  const page = places.slice(start, start + PAGE_SIZE);
  const next = start + PAGE_SIZE < places.length ? `osm.${start + PAGE_SIZE}` : null;
  const broader = !narrowed && spec.broadenTo ? SPECS[spec.broadenTo] : null;
  const where = String(city).replace(/\s+/g, " ").trim();
  const broadened = broader
    ? `OpenStreetMap has no ${spec.label} by name in ${where}, so these are all the ${broader.label} it lists there.`
    : null;
  const caveat = spec.caveat ? spec.caveat(where) : null;
  return { places: page, nextPageToken: next, total: places.length, spec: spec.id, broadened, caveat, endpoint };
}

/** For tests: forget the caches and the Nominatim clock. */
export function resetOsmCaches() {
  geoCache.clear();
  resultCache.clear();
  lastNominatimAt = 0;
  nominatimQueue = Promise.resolve();
}
