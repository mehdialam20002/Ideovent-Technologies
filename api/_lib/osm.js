/**
 * OpenStreetMap: the Lead Finder's FREE source (28 September 2026), and since
 * 4 October 2026 its DEFAULT one. Every search starts here, with no key at all;
 * Google Maps is asked only when Mehdi ticks "Also use Google" and a key is
 * saved (api/leads-search.js). No key, no card, no bill.
 *
 * THREE STEPS, on two public services used politely:
 *   1. Nominatim turns the city into a PLACE: GET .../search?featureType=settlement
 *      (cities, districts, towns, neighbourhoods; never a shop or a metro
 *      station, which a plain search returned first for "Saket"). Usage policy:
 *      at most 1 request a second, a User-Agent that names the app with a
 *      contact address, answers cached, no bulk
 *      (https://operations.osmfoundation.org/policies/nominatim/). So: one call
 *      at a time, 1 s apart, remembered in memory, at most 4 for a new city.
 *      A region is not a place: "Delhi NCR" searches Delhi and says so, and
 *      "NCR" alone asks for one of its cities (splitRegion).
 *   2. The AREA searched (areaFor): a city drawn as an outline, in and around
 *      it (its box); a district or a block, inside its own boundary (its
 *      polygon, from one more Nominatim lookup, simplified to about 5 KB, and
 *      asked for only when a search keeps to the boundary);
 *      else a circle around its point: 5 km for a neighbourhood like Saket,
 *      8 km for a town, 12 km for a city given as a point (Gorakhpur). Mehdi
 *      can also pick 5, 10 or 25 km around it.
 *   3. Overpass lists what is in the area's BOX: POST data=<query> to the first
 *      server that answers, in the order of OVERPASS_ENDPOINTS, each with a
 *      time-out and one retry, one query per search; the polygon or the circle
 *      then keeps what is inside. Answers are remembered for 10 minutes, so
 *      "Load more" asks nobody.
 *
 * WHAT IS LOOKED FOR (SPECS), measured on 3 Oct 2026 in South Delhi, Patna,
 * Gopalganj and Gorakhpur: the tags each kind is mapped with in India, plus
 * names ("... Classes", "... Vidyalaya") on a building or an office, and the
 * mistakes mappers make (a coaching centre tagged as a school goes to coaching,
 * a school tagged as an educational office goes to schools). Then one result
 * per business: a clinic drawn as a point AND a building, or twice a few
 * metres apart, is one result (dedupe).
 *
 * THE DATA is © OpenStreetMap contributors, under the Open Database Licence
 * (ODbL 1.0). Every OSM answer carries that attribution and the page shows it.
 * Unlike Google's Places content, ODbL lets us keep what we use (with the
 * attribution), so a phone from OSM may go on a lead.
 *
 * HONEST LIMITS: OpenStreetMap lists far fewer businesses and phones than
 * Google Maps, and small towns have very few (3 Oct 2026: the whole Gopalganj
 * district holds 1 dental hospital, 2 schools without a name and no coaching
 * centre). The answer says how many it found, how many have a phone and a
 * website, and where it looked, and the page says so beside every list.
 *
 * Nothing here throws anything but OsmError, and nothing here is ever given a
 * key: there is none.
 */

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
export const NOMINATIM_LOOKUP_URL = "https://nominatim.openstreetmap.org/lookup";
/** Named in the User-Agent and sent to Nominatim as email=, as its usage policy asks. */
export const CONTACT_EMAIL = "contact@ideovent.in";
/**
 * Tried in this order; each gets one retry (see overpass()). Measured 3 Oct
 * 2026: overpass-api.de answered every time; overpass.private.coffee (the
 * server once called overpass.kumi.systems, same address) and maps.mail.ru
 * often did not, so they get a short try and never the whole budget.
 */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

/**
 * The site the User-Agent names, so OpenStreetMap's operators can see who is
 * calling: VITE_PUBLIC_URL (the same variable src/lib/host.ts reads), else
 * https://www.ideovent.in, which answers since October 2026 (the old
 * ideovent.vercel.app redirects there). Only a bare http(s)://host is
 * accepted, so nothing odd can reach a header.
 */
export function siteUrl(env = typeof process !== "undefined" ? process.env : {}) {
  const v = String(env?.VITE_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[a-z0-9.-]+(:\d{2,5})?$/i.test(v) ? v : "https://www.ideovent.in";
}
export const USER_AGENT = `IdeoventLeadFinder/2.0 (+${siteUrl()}; ${CONTACT_EMAIL})`;
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
export const OSM_LICENCE = "ODbL";
export const OSM_NOTE = "OpenStreetMap is free, but it lists fewer businesses and fewer phone numbers than Google Maps.";

export const PAGE_SIZE = 20;
/** The most elements one Overpass answer may hold. A city's schools fit (South Delhi district, 3 Oct 2026: about 250). */
export const MAX_ELEMENTS = 1500;
/** The radii Mehdi may pick instead of the place's own area, in km. */
export const RADIUS_CHOICES_KM = [5, 10, 25];
const NOMINATIM_GAP_MS = 1_000;
const NOMINATIM_TIMEOUT_MS = 8_000;
/* Measured 30 Sep and 3 Oct 2026 from India: a city's box answers in 1 to 15 s
   on overpass-api.de (South Delhi's dense 10 km box: 9 to 15 s). The first
   try there may take 30 s; the other servers, which often hang, get 10 s. */
const OVERPASS_FIRST_TRY_MS = 30_000;
const OVERPASS_MIRROR_TRY_MS = 10_000;
/* Declared to the server: lower than its defaults (180 s, 512 MiB), which
   makes a busy server more willing to run the query. */
const OVERPASS_SERVER_TIMEOUT_S = 30;
const OVERPASS_MAXSIZE = 256 * 1024 * 1024;
/** A failure slower than this (a late 504, a time-out) sends that server's retry to the back of the line. */
const SLOW_FAIL_MS = 4_000;
const RETRY_WAIT_MS = 800;
/** "Too many requests" (429): that server's retry waits at least this long, after the others had their turn. */
const BUSY_WAIT_MS = 5_000;
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

/** The only error this module throws. `code`: osm_city (unknown place), osm_busy, osm_type, osm_time, osm_query. */
export class OsmError extends Error {
  constructor(message, { code = "osm_busy" } = {}) {
    super(message);
    this.code = code;
  }
}

/* ── What to look for ─────────────────────────────────────────────────────
   Each spec: Overpass selectors (the area's box is set once, for the whole
   query), a `keep` test that is the real judge (Overpass only narrows the
   download), an optional
   `narrow` test for a speciality, `broadenTo`: the spec whose results are
   shown, with a plain note, when the speciality finds nobody, and an optional
   `rank` (lower first): the likelier leads before the rest.
   The ids match TYPE_PRESETS in src/lib/leadFinder/leads.ts.

   Overpass regexes are plain alternations (its POSIX regexes have no \b);
   the JS tests below use word boundaries. */

/** Keys that make an element a business, a building or an office, not a gate, a road or a bare label. */
const PLACE_KEYS = ["amenity", "shop", "office", "building", "craft", "healthcare", "leisure", "tourism", "club"];
const hasPlaceKey = (t) => PLACE_KEYS.some((k) => t[k]);
/** Only a name and contact details: nothing says what it is, so only a strong name can. */
const isBare = (t) => Object.keys(t).every((k) => /^(name|alt_name|old_name|official_name|short_name|addr|contact|phone|mobile|website|url|email|opening_hours|source|note|description|operator|brand|wikidata|check_date|fixme|level)\b/.test(k));

// Mirrors looksDental() in src/lib/demo/templates/dentalPick.ts (this file is plain JS for Vercel).
const DENTAL_WORDS = /\b(dental|dentist\w*|dentistry|orthodont\w*|endodont\w*|periodont\w*|prosthodont\w*|pedodont\w*|implantolog\w*|oral (care|surgeon|surgery|health)|tooth|teeth|32\s*(pearls|teeth)|smile (dental|clinic|care))\b/i;
export const looksDentalText = (s) => DENTAL_WORDS.test(String(s || ""));
/* A dental laboratory, a supplier or a dental college is not a clinic that wants patients. */
const NOT_DENTAL_CLINIC_NAME = /\b(lab|labs|laborator\w*|suppl(y|ies|ier\w*)|store|depot|traders?|materials?|equipments?|college|university)\b/i;
/*
  A teaching hospital, a regulator or a government dental centre, whatever its
  tags say: it has no website to buy. Measured 4 Oct 2026 in Delhi NCR, all
  listed among the clinics until then: "Centre For Dental Education &
  Research-AIIMS" (a plain building), "Maulana Azad Institute of Dental
  Sciences" (a hospital), "Sharda School of Dental Science", "Dental Council of
  India". A private "... Dental Hospital" or "... Implantology Research Centre"
  is a clinic, and stays.
*/
const DENTAL_INSTITUTION = /\b(aiims|pgimer|esic|cghs|council|association|education|faculty|dental sciences?|dental college|college of dent\w*|school of dent\w*|institute of dent\w*|government|govt|municipal|army|military|naval|air force)\b/i;
export const isDentalInstitution = (t, name) => DENTAL_INSTITUTION.test(`${name || ""} ${t["name:en"] || ""}`) || t["operator:type"] === "government";

// Not a coaching centre, whatever its name says ("... Hospital and Research Institute").
const NOT_COACHING_AMENITY = /^(hospital|clinic|doctors|dentist|pharmacy|blood_bank|research_institute|college|university|school|kindergarten|childcare|place_of_worship|bank|atm|police|townhall|courthouse|social_facility)$/;
const NOT_COACHING_NAME = /\b(hospital|clinic|nursing|medicare|medical sciences|blood bank|diagnostic\w*|patholog\w*|research (institute|centre|center)|eye institute|heart institute|cricket|tennis|football|badminton|gymnastics?|swimming|karate|taekwondo|physical academy|judicial academy|police academy|dance|dancing|music|singing|beauty|make ?up|salon|parlou?r|fashion|tailoring|sewing|driving|flying|aviation|hotel management|paramedical|pharma\w*|gym|fitness|yoga|hostels?|paying guest|summer camp|ashram|gate|parking)\b/i;
/*
  The same in Devanagari, where \b does not work: a hospital, a clinic, a heart
  or a medical institute ("इन्दिरा गांधी हृदयरोग संस्थान", the Indira Gandhi
  heart institute, mapped as an educational office in Patna, 4 Oct 2026).
*/
const NOT_COACHING_NAME_HI = /(अस्पताल|चिकित्सा|हॉस्पिटल|हास्पिटल|क्लिनिक|हृदय|नर्सिंग|दवाखाना|औषधालय|स्वास्थ्य|छात्रावास)/;
const notCoachingName = (name) => NOT_COACHING_NAME.test(name || "") || NOT_COACHING_NAME_HI.test(name || "");
export function isHealthcareOrCollege(t, name) {
  return !!t.healthcare || NOT_COACHING_AMENITY.test(t.amenity || "")
    || /^(hospital|school|university|college)$/.test(t.building || "") || notCoachingName(name);
}

/** A school by its name, in English and Hinglish ("Saraswati Vidya Mandir", "Utkramit Madhya Vidyalaya", "... Inter College"). */
export const SCHOOL_NAME = /\b(schools?|vidyala(y|ya|yam)|vidhyala(y|ya)|vidyalay|vidyapee?th|vidyapith|vidya (mandir|niketan|bhawan|bhavan|peeth|pith|sadan|bharati|bharti|kunj|vihar|kendra|sthali|sagar)|shiksha (niketan|sadan|kendra|mandir|bharti|bharati)|shishu (mandir|niketan|vihar|vidya\w*)|bal (vidya\w*|niketan|mandir|bharti|bharati|vihar)|convent|madrass?a\w*|madarsa\w*|gurukul\w*|navodaya|inter college|intermediate college|secondary|sr\.? sec\.?|montessori|kindergarten|nursery)\b/i;
const SCHOOL_NAME_OP = "school|vidyala|vidhyala|vidyapee|vidyapith|vidya |shiksha|shishu|bal vidya|convent|madras|madarsa|gurukul|navodaya|inter college|secondary|montessori|kindergarten|nursery";
/*
  Has "school" in its name and is not one: a driving school, a dance class, a
  road, a shop, an anganwadi, an exam board, or one building of a campus
  ("Administrative Block", "Girls Hostel", "Play Ground"), whose school is
  listed on its own (measured in Patna, 3 Oct 2026).
*/
const NOT_A_SCHOOL_NAME = /\b(driving|dance|dancing|music|singing|swimming|cricket|football|karate|taekwondo|yoga|beauty|parlou?r|tailoring|sewing|flying|aviation|nursing|paramedical|pharmacy|hotel management|judicial|research|institute of|uniforms?|stationery|book ?(shop|store|depot)|bus (stop|stand)|gate|play ?ground|ground|blocks?|wing|hostels?|canteen|auditorium|administrative|adminstrative|administration|main building|quarters|board|examination|directorate|department|office|school of|tomb|ruins|monument|mosque|masjid|church|gurudwara|plants?|plant nursery|horticulture|garden cent(re|er)|anganwadi|aanganwadi|anganbadi|aganbari)\b|\bschool (road|bus|chowk|more|marg|lane|gali)\b/i;
/* A government school does not buy a website: listed, but after the others. */
const GOVT_SCHOOL = /\b(govt\.?|government|rajkiya|sarkari|prathmik|prathamik|primary school|middle school|madhya vidyalaya|utkramit|upgraded|nagar nigam|nagar palika|municipal|mcd|ndmc|zila parishad|zilla parishad|kendriya|navodaya|sarvodaya|pratibha vikas|nigam pratibha|gbsss|ggsss|gsss|skv|sbv|rpvv)\b/i;
/* What a CBSE or ICSE school is usually called. OpenStreetMap has no tag for the board, so this only orders the list. */
const CBSE_LIKE = /\b(cbse|icse|isc|public school|international|world school|global school|convent|dav|d\.\s?a\.\s?v\.?|dps|delhi public|army public|air force school|ryan|amity|st\.?|saint|carmel|loreto|xavier'?s?|don bosco|holy|mount|modern school|central school|senior secondary|sr\.? sec\.?|higher secondary|english medium|english school|academy)\b/i;
const INTER_COLLEGE = /\b(inter college|intermediate college|intermediate|higher secondary|senior secondary|\+2)\b/i;

/** A coaching centre by its name. */
const COACHING_WORDS = /\b(coaching|classes|tutorials?|tuitions?|tution|tutors?|academy|academies|institute|career|carrier|competition|competitive|study (centre|center|point|circle)|iit|jee|neet|ssc|bpsc|upsc|ias|banking|defence|defense)\b/i;
/** Words only a coaching centre uses: enough even on a bare name, or on a place mapped as a school. */
const COACHING_STRONG = /\b(coaching|classes|tutorials?|tuitions?|tution|career|carrier|competition|competitive|iit[- ]?jee|jee|neet|ssc|bpsc|upsc|banking)\b/i;
/** What a shop must be called to be a coaching centre ("Career Point Books" is a bookshop). */
const COACHING_CORE = /\b(coaching|classes|tutorials?|tuitions?|tution)\b/i;
const COACHING_NAME_OP = "coaching|classes|tutorial|tuition|tution|academy|institute|career|carrier|competition|competitive|study cent|iit|jee|neet|ssc|bpsc|upsc|banking|defence";
/* An institution, not a business: a government institute, a campus, an office. Not coaching unless a coaching word says so. */
const INSTITUTIONAL = /\b(office|campus|ncert|bhawan|bhavan|union|welfare|ministry|council|commission|directorate|department|secretariat|government|govt|(indian|national) institute of|iit (delhi|bombay|kanpur|madras|kharagpur|roorkee|guwahati|patna|bhu|hyderabad|indore|jodhpur|ropar|mandi|gandhinagar|bhubaneswar|tirupati|palakkad|jammu|dharwad|bhilai|goa))\b/i;
/* A college, a university, an ITI or a teacher-training college: not coaching. */
const COLLEGE_NAME = /\b(college|university|mahavidyalaya|vishwavidyalaya|polytechnic|i\.?t\.?i\.?|industrial training|b\.\s?ed|d\.\s?el\.\s?ed|institute of (technology|management|engineering|medical|pharmacy|hotel|nursing|paramedical|information technology|science)|school of (nursing|pharmacy))\b/i;

/** A play school or pre-school by its name. */
const PLAY_NAME = /\b(play ?schools?|play ?group|play ?way|playhouse|pre[- ]?schools?|pre[- ]?primary|montessori|kindergarten|kinder ?garden|nursery|kids|kidz|kiddies?|tots|toddlers?|day ?care|creche|crèche|kidzee|euro ?kids|bachpan|shemrock|intellitots|jumbo kids|little millennium|hello kids)\b/i;
const PLAY_NAME_OP = "play|pre.?school|pre.?primary|montessori|kinder|nursery|kids|kidz|tots|toddler|day ?care|creche|bachpan|shemrock";
/* An anganwadi is the government's child-care centre: not a play school that buys a website. */
const ANGANWADI = /(\b(anganwadi|aanganwadi|anganbadi|aanganbadi|aganbari|awc|a\.w\.c\.?|icds)\b|आंगनवाड़ी|आँगनवाड़ी)/i;

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

const DENTAL_SELECTORS = [
  'nwr["amenity"="dentist"]',
  'nwr["healthcare"="dentist"]',
  // A clinic tagged only by its dental speciality ("orthodontics", "paediatric_dentistry").
  'nwr["healthcare:speciality"~"dent|odont|oral_surgery|maxillo",i]',
  'nwr["amenity"~"^(clinic|doctors|hospital)$"]["name"~"dent|teeth|tooth|odont|smile",i]',
  'nwr["healthcare"]["name"~"dent|teeth|tooth|odont",i]',
  // A dental clinic mapped as a plain building, shop or office, with only its name to say so.
  'nwr["name"~"dental|dentist|teeth|tooth|orthodont",i][!"amenity"][!"healthcare"][~"^(building|shop|office|craft)$"~"."]',
];
const dentalKeep = (t, name) => {
  if (t.craft === "dental_technician" || /^(college|university|school|pharmacy)$/.test(t.amenity || "") || /^(medical_supply|chemist)$/.test(t.shop || "")) return false;
  if (isDentalInstitution(t, name)) return false;
  if (NOT_DENTAL_CLINIC_NAME.test(name) && !isDentalTags(t)) return false;
  return isDentalTags(t) || looksDentalText(`${name} ${t["name:en"] || ""}`);
};

const SCHOOL_SELECTORS = [
  'nwr["amenity"="school"]',
  // Mapped only as a school building, with its name (3 Oct 2026: a third more schools in Patna and South Delhi).
  'nwr["building"="school"][!"amenity"]["name"]',
  // A school mapped as an educational office (their names say which: coaching keeps the rest).
  `nwr["office"="educational_institution"]["name"~"${SCHOOL_NAME_OP}",i]`,
  // In Bihar and UP an "Inter College" teaches classes 9 to 12: a school.
  'nwr["amenity"="college"]["name"~"inter college|intermediate|secondary|school|vidyala",i]',
  `nwr["name"~"${SCHOOL_NAME_OP}",i][!"amenity"][~"^(building|office)$"~"."]`,
];
function schoolKeep(t, name) {
  if (NOT_A_SCHOOL_NAME.test(name)) return false;
  const school = SCHOOL_NAME.test(name);
  // A coaching centre mapped as a school belongs in coaching (coachingKeep takes it).
  if (COACHING_STRONG.test(name) && !school) return false;
  // "BN College" mapped as a school is a college; "Ram Babu High School" mapped as a college is a school.
  const college = COLLEGE_NAME.test(name) && !INTER_COLLEGE.test(name) && !school;
  if (t.amenity === "school") return !college;
  if (t.amenity === "college") return INTER_COLLEGE.test(name) || (school && !/\b(university|mahavidyalaya)\b/i.test(name));
  if (t.amenity || t.shop || t.leisure || t.landuse === "plant_nursery") return false;
  if (t.office && t.office !== "educational_institution") return false;
  if (t.building === "school" && !t.office) return !college;
  return school && !college && !!(t.building || t.office);
}
const schoolRank = (t, name) => (GOVT_SCHOOL.test(name) ? 1 : 0);
const cbseRank = (t, name) => (GOVT_SCHOOL.test(name) ? 2 : CBSE_LIKE.test(name) ? 0 : 1);

const PLAY_SELECTORS = [
  'nwr["amenity"="kindergarten"]',
  'nwr["amenity"="childcare"]',
  'nwr["building"="kindergarten"][!"amenity"]["name"]',
  `nwr["amenity"="school"]["name"~"${PLAY_NAME_OP}",i]`,
  `nwr["office"="educational_institution"]["name"~"${PLAY_NAME_OP}",i]`,
  'nwr["name"~"play ?school|playschool|pre.?school|montessori|kindergarten|nursery school|day ?care|creche|kidzee|euro ?kids|bachpan|shemrock",i][!"amenity"][~"^(building|office|shop)$"~"."]',
];
function playKeep(t, name) {
  if (ANGANWADI.test(name) || t.shop || t.leisure || t.landuse || t.tourism || NOT_A_SCHOOL_NAME.test(name)) return false;
  const early = /\b(play|pre[- ]?schools?|pre[- ]?primary|montessori|kindergarten|nursery|day ?care|creche|crèche)\b/i.test(name);
  if (/\b(high|secondary|senior|inter|college|academy)\b/i.test(name) && !early) return false;
  if (t.amenity === "kindergarten" || t.amenity === "childcare" || (t.building === "kindergarten" && !t.amenity)) return true;
  return PLAY_NAME.test(name);
}

const COACHING_SELECTORS = [
  'nwr["amenity"="prep_school"]',
  'nwr["amenity"="training"]',
  'nwr["amenity"~"^(tutoring|coaching|coaching_centre|education|study)$"]',
  'nwr["office"="educational_institution"]',
  `nwr["name"~"${COACHING_NAME_OP}",i][!"healthcare"]["amenity"!~"^(hospital|clinic|doctors|dentist|pharmacy|blood_bank|college|university|school|kindergarten|childcare|bank|atm|police|place_of_worship|townhall|courthouse)$"]`,
  // A coaching centre mapped as a school or college ("... Classes" with amenity=school).
  'nwr["amenity"~"^(school|college)$"]["name"~"coaching|classes|tutorial|tuition|tution|career|competition|iit|jee|neet|ssc|bpsc|upsc|banking",i]',
];
/* The amenities a coaching centre found by its name may carry: an IIT gate's parking or a hospital's canteen is not one. */
const COACHING_AMENITY = /^(prep_school|training|tutoring|coaching|coaching_centre|education|study|library|community_centre|social_centre)$/;
function coachingKeep(t, name) {
  if (notCoachingName(name)) return false;
  const strong = COACHING_STRONG.test(name);
  // A school or college by its name, wherever it is mapped, is not coaching ("Example Public School" as an office);
  // nor a play school ("Kangaroo Kids"), nor a self-study library with no coaching word.
  if ((SCHOOL_NAME.test(name) || COLLEGE_NAME.test(name) || PLAY_NAME.test(name) || INSTITUTIONAL.test(name) || /\blibrar(y|ies)\b/i.test(name)) && !strong) return false;
  if (/^(school|college)$/.test(t.amenity || "")) return strong && !t.healthcare;
  if (isHealthcareOrCollege(t, name)) return false;
  if (t.amenity === "prep_school" || t.amenity === "training" || /^(tutoring|coaching|coaching_centre|education|study)$/.test(t.amenity || "")
    || t.office === "educational_institution") return true;
  // Found by its name only: a business or building needs a coaching word, a bare name a strong one, and a gate never.
  if (!COACHING_WORDS.test(name)) return false;
  if (t.amenity && !COACHING_AMENITY.test(t.amenity)) return false;
  // A guest house, a sports ground or a government office named after an institute is not a coaching centre.
  if (t.tourism || t.leisure || t.sport || t.club || t.craft) return false;
  if (t.office && !/^(educational_institution|tutoring|education|company|yes)$/.test(t.office)) return false;
  if (hasPlaceKey(t)) return !t.shop || COACHING_CORE.test(name);
  return isBare(t) && strong;
}

/** Words of a result a speciality is judged on: its names, speciality and description. */
const specialityText = (t, name) => [name, t["name:en"], t["healthcare:speciality"], t.description, t.speciality].filter(Boolean).join(" ");

export const SPECS = {
  school: { id: "school", label: "schools", selectors: SCHOOL_SELECTORS, keep: schoolKeep, rank: schoolRank },
  cbse: {
    id: "cbse", label: "schools", selectors: SCHOOL_SELECTORS, keep: schoolKeep, rank: cbseRank,
    // OSM has no tag for a school's board, so every school is listed, in the likeliest order, and the page says why.
    caveat: (city) => `OpenStreetMap does not record a school's board, so these are all the schools it lists in ${city}, CBSE or not: `
      + "those whose names suggest CBSE or ICSE (public, international, convent, DAV, St. ...) first, government schools last.",
  },
  play: { id: "play", label: "play schools", selectors: PLAY_SELECTORS, keep: playKeep },
  coaching: { id: "coaching", label: "coaching centres", selectors: COACHING_SELECTORS, keep: coachingKeep },
  jee: {
    id: "jee", label: "JEE/NEET coaching", selectors: COACHING_SELECTORS, keep: coachingKeep, broadenTo: "coaching",
    narrow: /\b(jee|neet|iit\w*|aiims|medical|engineering|pre[- ]?medical|pre[- ]?engineering|aakash|akash|allen|fiitjee|resonance|vidyamandir|vmc|narayana|chaitanya|motion|bansal|career point|physics ?wallah|pw|super ?(30|100)|vibrant|physics|chemistry|maths?|mathematics|biology|science|olympiad|kvpy|ntse)\b/i,
  },
  ssc: {
    id: "ssc", label: "SSC, banking and defence coaching", selectors: COACHING_SELECTORS, keep: coachingKeep, broadenTo: "coaching",
    narrow: /\b(ssc|cgl|chsl|mts|bank\w*|ibps|sbi|po|clerk|railways?|rrb|ntpc|group d|upsc|ias|ips|pcs|bpsc|uppsc|mppsc|civil services?|competitive|competition|government jobs?|sarkari|defence|defense|nda|cds|afcat|army|navy|air ?force|agniveer|police|daroga|constable|sub[- ]inspector|ctet|stet|btet|tet|ugc[- ]net|career power|adda ?247|mahendra'?s?|paramount|kd campus|chanakya|drishti|vajiram)\b/i,
  },
  tuition: {
    id: "tuition", label: "tuition centres", selectors: COACHING_SELECTORS, keep: coachingKeep, broadenTo: "coaching",
    narrow: /\b(tuitions?|tution|tutors?|tutorials?|classes|home tutor\w*|coaching (centre|center)|study (centre|center|point|circle)|learning (centre|center)|education (centre|center|point))\b/i,
  },
  dental: { id: "dental", label: "dental clinics", selectors: DENTAL_SELECTORS, keep: dentalKeep },
  ortho: {
    id: "ortho", label: "orthodontists", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(orthodont\w*|aligners?|clear aligners?|braces|invisalign)\b/i,
  },
  implant: {
    id: "implant", label: "dental implant centres", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(implants?|implantolog\w*|prosthodont\w*|dentures?|full[- ]mouth|all[- ]on[- ](4|four|6|six))\b/i,
  },
  kids: {
    id: "kids", label: "children's dentists", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(kids?|kidz|child(ren)?'?s?|paediatric\w*|pediatric\w*|pedodont\w*|paedodont\w*|little smiles?|tiny teeth)\b/i,
  },
  cosmetic: {
    id: "cosmetic", label: "cosmetic dentists", selectors: DENTAL_SELECTORS, keep: dentalKeep, broadenTo: "dental",
    narrow: /\b(cosmetic|aesthetic\w*|smile (design|studio|makeover|gallery)|veneers?|laminates?|whitening|hollywood smile)\b/i,
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
  if (/\b(cbse|icse)\b/.test(text)) return SPECS.cbse;
  if (/\bschool\b/.test(text)) return SPECS.school;
  if (/\b(jee|neet)\b/.test(text)) return SPECS.jee;
  if (/\b(ssc|banking|ibps|upsc|bpsc|defence|defense|nda|railway)\b/.test(text)) return SPECS.ssc;
  if (/\b(tuition|tution|tutor)/.test(text)) return SPECS.tuition;
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
 * just "clinic". A school mapped only as a building says "school".
 */
export function categoryOf(t) {
  const main = str(t.amenity) || str(t.healthcare) || str(t.office) || str(t.shop) || str(t.leisure) || str(t.tourism)
    || (/^(school|kindergarten)$/.test(t.building || "") ? t.building : null);
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

/*
  Never a business, whatever its name: a road ("Gym Road"), a railway, a
  river, an area or a boundary. A search by name ("gym", "music") would
  otherwise list "Fitness Road" as a gym.
*/
const NOT_A_PLACE_KEYS = ["highway", "railway", "waterway", "boundary", "place", "route", "landuse", "natural", "public_transport", "barrier", "entrance"];
const BUSINESS_KEYS = ["amenity", "shop", "office", "healthcare", "leisure", "craft", "tourism", "club", "sport"];
export const isNotAPlace = (t) => NOT_A_PLACE_KEYS.some((k) => t[k]) && !BUSINESS_KEYS.some((k) => t[k]);

/* ── One result per business ──────────────────────────────────────────────── */

/** A name as compared for duplicates: "Dr. Sharma's Dental Clinic Pvt. Ltd." -> "dr sharma dental clinic". */
export function nameKey(name) {
  return String(name || "").toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .replace(/['’`]s\b/g, "").replace(/&/g, " and ")
    .replace(/[^a-z0-9\p{Script=Devanagari}]+/gu, " ")
    .replace(/\b(the|pvt|private|ltd|limited|llp|inc)\b/g, " ")
    .split(" ").filter(Boolean)
    // "Dominics Public School" is "Dominic's Public School": a final s on a longer word does not count.
    .map((w) => (w.length > 3 && /[a-z]s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w))
    .join(" ");
}

/** Metres between two results (both have a position). */
function metres(a, b) {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/*
  Sites that host many businesses: there the page's path, not the address, is the business.
*/
const SHARED_SITES = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|wa\.me|whatsapp\.com|justdial\.com|sulekha\.com|indiamart\.com|google\.com|goo\.gl|g\.page|linktr\.ee|bit\.ly)$/;
/** A website as compared for duplicates: "https://www.Example.org/" -> "example.org"; a Facebook page keeps its path. */
export function siteKey(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return SHARED_SITES.test(host) ? `${host}${u.pathname.toLowerCase().replace(/\/+$/, "")}` : host;
  } catch {
    return "";
  }
}

/*
  The same business twice: the same name within 300 m (a point on the gate
  and the building it names, or two mappers), the same name AND the same
  website anywhere in the area (one business, one website: Patna's coaching
  list held "Chartered Commerce" twice, 356 m apart, both charteredcommerce.org,
  4 Oct 2026), the same phone within 1 km ("Aakash Institute" and "aakash
  institute"), or one name inside the other within 150 m ("Smile Dental" and
  "Smile Dental Clinic").
*/
export const SAME_NAME_M = 300;
const SAME_PHONE_M = 1_000;
const NAME_INSIDE_M = 150;
function samePlace(a, b) {
  const hasPos = a.p.lat !== null && a.p.lon !== null && b.p.lat !== null && b.p.lon !== null;
  const d = hasPos ? metres(a.p, b.p) : Infinity;
  // Compared without spaces: "Sky Light Classes" and "Skylight Classes" are one name.
  const ka = a.key.replace(/ /g, "");
  const kb = b.key.replace(/ /g, "");
  if (ka && ka === kb && (d <= SAME_NAME_M || !hasPos || (a.site && a.site === b.site))) return true;
  if (a.p.phoneIntl && a.p.phoneIntl === b.p.phoneIntl && d <= SAME_PHONE_M) return true;
  return d <= NAME_INSIDE_M && Math.min(ka.length, kb.length) >= 8 && (ka.includes(kb) || kb.includes(ka));
}
const TYPE_ORDER = { node: 0, way: 1, relation: 2 };
const richness = (p) => (p.phone ? 4 : 0) + (p.website ? 2 : 0) + (p.address ? 1 : 0);
const idOrder = (p) => {
  const [, type, id] = /^osm:(\w+)\/(\d+)$/.exec(p.placeId) || [];
  return [TYPE_ORDER[type] ?? 3, Number(id) || 0];
};
/** Which of two duplicates is shown (and becomes the lead): the one with more contact details, then a point, then the oldest id. */
function better(a, b) {
  const r = richness(b.p) - richness(a.p);
  if (r) return r > 0 ? b : a;
  const [ta, ia] = idOrder(a.p);
  const [tb, ib] = idOrder(b.p);
  return tb < ta || (tb === ta && ib < ia) ? b : a;
}

/**
 * Elements -> results for a spec: named, inside the area (`inside`, when
 * given), kept by the spec's own test, one per business (see samePlace), the
 * likelier leads first (spec.rank), then those with a phone, then by name.
 * `narrowed` is false when the speciality found nobody and the broader list
 * is returned instead.
 */
export function placesFor(elements, spec, inside = null) {
  const groups = [];
  for (const el of Array.isArray(elements) ? elements : []) {
    const p = mapElement(el);
    const tags = el?.tags || {};
    if (!p || isNotAPlace(tags) || !spec.keep(tags, p.name) || (inside && !inside(p))) continue;
    const item = { p, tags, key: nameKey(p.name), site: siteKey(p.website) };
    const into = groups.find((g) => g.members.some((m) => samePlace(m, item)));
    if (into) into.members.push(item);
    else groups.push({ members: [item] });
  }
  let list = groups.map(({ members }) => {
    const best = members.reduce(better);
    const p = { ...best.p };
    for (const m of members) for (const k of ["phone", "phoneIntl", "website", "address", "primaryType"]) if (!p[k] && m.p[k]) p[k] = m.p[k];
    return { p, tags: Object.assign({}, ...members.map((m) => m.tags), best.tags) };
  });
  let narrowed = true;
  if (spec.narrow) {
    const hits = list.filter(({ p, tags }) => spec.narrow.test(specialityText(tags, p.name)));
    if (hits.length || !spec.broadenTo) list = hits;
    else narrowed = false;
  }
  const rank = spec.rank || (() => 0);
  const places = list.map(({ p, tags }) => ({ p, r: rank(tags, p.name) }))
    .sort((a, b) => a.r - b.r || Number(!a.p.phone) - Number(!b.p.phone) || a.p.name.localeCompare(b.p.name, "en", { sensitivity: "base" }))
    .map(({ p }) => p);
  return { places, narrowed };
}

/* ── Nominatim: the city as a place, then an area ─────────────────────────── */

const geoCache = new Map();
let nominatimQueue = Promise.resolve();
let lastNominatimAt = 0;

/** Keep a cache Map under its limit, oldest first. */
const trim = (m) => { while (m.size > CACHE_MAX) m.delete(m.keys().next().value); };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r5 = (x) => Math.round(x * 1e5) / 1e5;
const KM_PER_DEG = 111.2;

/** A box around the place: its own box, but never over about 55 km across. Returns [south, west, north, east] or null. */
export function boxFor(hit, maxHalfDeg = 0.25) {
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const [s, n, w, e] = (Array.isArray(hit.boundingbox) ? hit.boundingbox : []).map(Number);
  const ok = [s, n, w, e].every(Number.isFinite) && n > s && e > w;
  const south = ok ? Math.max(s, lat - maxHalfDeg) : lat - 0.04;
  const north = ok ? Math.min(n, lat + maxHalfDeg) : lat + 0.04;
  const west = ok ? Math.max(w, lon - maxHalfDeg) : lon - 0.04;
  const east = ok ? Math.min(e, lon + maxHalfDeg) : lon + 0.04;
  return [r5(south), r5(west), r5(north), r5(east)];
}

/** The square box around a circle, [south, west, north, east]. */
export function circleBox(center, radiusM) {
  const dLat = radiusM / 1000 / KM_PER_DEG;
  const dLon = radiusM / 1000 / (KM_PER_DEG * Math.max(0.2, Math.cos(center.lat * Math.PI / 180)));
  return [r5(center.lat - dLat), r5(center.lon - dLon), r5(center.lat + dLat), r5(center.lon + dLon)];
}

/** How far across a place's box is, in km (its diagonal). */
function spanKm(hit) {
  const [s, n, w, e] = (Array.isArray(hit.boundingbox) ? hit.boundingbox : []).map(Number);
  if (![s, n, w, e].every(Number.isFinite)) return 0;
  const dy = (n - s) * KM_PER_DEG;
  const dx = (e - w) * KM_PER_DEG * Math.cos(((n + s) / 2) * Math.PI / 180);
  return Math.hypot(dx, dy);
}

/* A boundary smaller than this across (a ward, like Saket's) is searched by radius instead: it would hold almost nothing. */
const MIN_BOUNDARY_KM = 5;
/* A boundary larger than this across is not searched whole: a state, or a district the size of one. */
const MAX_BOUNDARY_KM = 220;
const CITY_TYPES = /^(city|town|municipality)$/;
const DISTRICT_TYPES = /^(state_district|district|county|state|region)$/;

/** The radius around a place given as a point, in metres. */
export function radiusFor(hit) {
  const t = String(hit.addresstype || hit.type || "");
  if (t === "city") return 12_000;
  if (t === "town" || t === "municipality") return 8_000;
  return 5_000;
}

/** "district", "block": the kind of boundary, said plainly. */
function boundaryWord(t) {
  if (/^(state_district|district)$/.test(t)) return "district";
  if (t === "county") return "block";
  return t === "state" ? "state" : "area";
}

/** A circle around a point: the Overpass box around it, then only what is inside the circle. */
function circleArea(center, radiusM, name) {
  return { kind: "radius", center, radiusM, box: circleBox(center, radiusM), name, label: `within ${Math.round(radiusM / 1000)} km of ${name}` };
}

/**
 * The area to search for a Nominatim hit:
 *   box       a city or town drawn as an outline (Patna, Delhi, Noida): its box,
 *             so the suburbs that grew past the municipal line are in ("in and
 *             around Patna": measured 3 Oct 2026, the outline alone left out
 *             Jaipuria School in Bairiya, which has a phone);
 *   boundary  a district or a block (Gopalganj): its box is asked for, and only
 *             what lies inside its polygon is kept (geocodeCity fetches the
 *             polygon), so a district's list never spills into the next district
 *             or state (the two "Gopalganj" coaching centres of 3 Oct 2026 were
 *             25 km away, in Siwan);
 *   radius    a point, a tiny ward, or something too big: a circle around its point.
 * `polygonOf` names the OSM object whose polygon a boundary needs ("R1960158").
 */
export function areaFor(hit, name) {
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  const center = { lat: r5(lat), lon: r5(lon) };
  const at = String(hit.addresstype || hit.type || "");
  const span = spanKm(hit);
  const shaped = ["boundary", "place"].includes(String(hit.category || hit.class || "")) && /^(relation|way)$/.test(String(hit.osm_type || ""));
  if (span > MAX_BOUNDARY_KM) {
    // A whole state is not one search (geocodeCity asks for a city in it); anything else that big, its middle.
    const state = /^(state|country)$/.test(at) || (Number(hit.place_rank) > 0 && Number(hit.place_rank) <= 8);
    return { area: circleArea(center, 15_000, name), ...(state ? { tooBig: true } : {}) };
  }
  if (shaped && span >= MIN_BOUNDARY_KM) {
    const box = boxFor(hit, 2);
    if (box && DISTRICT_TYPES.test(at)) {
      return {
        area: { kind: "boundary", box, center, name, label: `inside the ${name} ${boundaryWord(at)} boundary` },
        polygonOf: `${hit.osm_type === "relation" ? "R" : "W"}${Math.trunc(Number(hit.osm_id))}`,
      };
    }
    if (box) return { area: { kind: "box", box, center, name, label: `in and around ${name}` } };
  }
  return { area: circleArea(center, radiusFor(hit), name) };
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

/** One Nominatim request (India only), with one retry on a server error. Returns the parsed list. Throws OsmError. */
async function nominatimGet(base, params, deadline) {
  const url = `${base}?${new URLSearchParams({ format: "jsonv2", email: CONTACT_EMAIL, ...params })}`;
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
  return Array.isArray(list) ? list : [];
}

/** A settlement (or any place) search. Returns the hits that have a position. */
async function nominatimSearch(q, extra, deadline) {
  const list = await nominatimGet(NOMINATIM_URL, { countrycodes: "in", addressdetails: "0", ...extra, q }, deadline);
  return list.filter((h) => h && Number.isFinite(Number(h.lat)) && Number.isFinite(Number(h.lon)));
}

/**
 * A boundary's polygon, simplified to about 300 m (a district comes back as
 * about 180 points, 5 KB), as GeoJSON, or null. Never throws: without it the
 * search keeps the boundary's box and says so.
 */
async function polygonFor(osmIds, deadline) {
  try {
    const [hit] = await nominatimGet(NOMINATIM_LOOKUP_URL, { osm_ids: osmIds, polygon_geojson: "1", polygon_threshold: "0.003" }, deadline);
    const g = hit?.geojson;
    return g && (g.type === "Polygon" || g.type === "MultiPolygon") && Array.isArray(g.coordinates) ? g : null;
  } catch {
    return null;
  }
}

/** Inside a GeoJSON Polygon or MultiPolygon ([lon, lat] points): even-odd over every ring, so a hole is a hole. */
export function inPolygon(geojson, lat, lon) {
  const polys = geojson?.type === "Polygon" ? [geojson.coordinates] : geojson?.type === "MultiPolygon" ? geojson.coordinates : null;
  if (!polys) return true;
  let inside = false;
  for (const poly of polys) {
    for (const ring of poly || []) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
  }
  return inside;
}

/** Is a result inside the area searched? Overpass answers for the area's box; this is the area itself. */
export function insideArea(area, p) {
  if (p.lat === null || p.lon === null) return true;
  if (area.kind === "radius") return metres(area.center, p) <= area.radiusM;
  if (area.kind === "boundary" && area.polygon) return inPolygon(area.polygon, p.lat, p.lon);
  return true;
}

const plain = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** The Latin words of a text at least `min` letters long: "Saket, New Delhi" -> ["saket", "delhi"] for 4. */
const wordsOf = (s, min) => plain(s).split(" ").filter((w) => w.length >= min);
/* Words too common in Indian place names to tell two places apart. */
const COMMON_WORDS = new Set(["new", "old", "the", "and", "city", "rural", "urban", "district", "tahsil", "tehsil", "block", "india"]);

/*
  A REGION is not one place. "Delhi NCR" is how Mehdi names his market, but
  OpenStreetMap has no settlement called that: on 4 Oct 2026 Nominatim's only
  "NCR" near Delhi was a restaurant in Pitampura, which the last fallback of
  geocodeCity took, and searched 5 km around. So the region's name is taken
  out and the city typed with it is searched, with a line saying so; "NCR"
  alone asks for one of its cities.
*/
const NCR_RE = /\b(?:ncr|n\.c\.r|national capital region)\b\.?|एनसीआर/gi;
/* NCR's cities, and how each may be written (Gurgaon is Gurugram; Devanagari too), to name the others in the note. */
const NCR_CITY_NAMES = [
  ["Delhi", /\bdelhi\b|दिल्ली/i],
  ["Noida", /\bnoida\b|नोएडा|नोयडा/i],
  ["Gurugram", /\b(?:gurugram|gurgaon)\b|गुरुग्राम|गुड़गांव|गुडगांव|गुड़गाँव/i],
  ["Ghaziabad", /\bghaziabad\b|गाजियाबाद|ग़ाज़ियाबाद|गाज़ियाबाद/i],
  ["Faridabad", /\bfaridabad\b|फरीदाबाद|फ़रीदाबाद/i],
];
export const NCR_CITIES = NCR_CITY_NAMES.map(([name]) => name);
const orList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}` : xs[0] || "");

/** "Delhi NCR" -> { city: "Delhi", note }; "NCR" alone throws OsmError(osm_city); anything else -> null. */
export function splitRegion(text) {
  const t = String(text || "");
  if (!t.match(NCR_RE)) return null;
  // What is left, part by part: "Delhi-NCR" -> "Delhi", "Gurgaon (NCR)" -> "Gurgaon", "Delhi and NCR" -> "Delhi", "Saket, Delhi NCR" -> "Saket, Delhi".
  const city = t.replace(NCR_RE, " ").replace(/[()[\]]/g, " ").split(",")
    .map((part) => part.replace(/\s+/g, " ").replace(/^[\s;:/&+.-]+|[\s;:/&+.-]+$/g, "").replace(/^(and|aur)\s+|\s+(and|aur)$/i, "").trim())
    .filter(Boolean).join(", ");
  // A letter, then a letter or a vowel sign: "दिल्ली" has no two letters in a row.
  if (!/\p{L}[\p{L}\p{M}]/u.test(city)) {
    throw new OsmError(`NCR is several cities, too big for one search. Type one of them: ${orList(NCR_CITIES)} (or a part of one, e.g. Saket, Delhi).`, { code: "osm_city" });
  }
  const others = NCR_CITY_NAMES.filter(([, re]) => !re.test(city)).map(([name]) => name);
  return { city, note: `NCR is several cities, so this searched ${city} only.${others.length ? ` Search ${orList(others)} on their own too.` : ""}` };
}

/*
  A state written short after a city ("Gorakhpur UP", "Indore, M.P."): the
  state's name, which Nominatim knows and its short form it does not.
*/
const STATE_SHORT = { up: "Uttar Pradesh", mp: "Madhya Pradesh", hp: "Himachal Pradesh", ap: "Andhra Pradesh", wb: "West Bengal",
  tn: "Tamil Nadu", jk: "Jammu and Kashmir", uk: "Uttarakhand", cg: "Chhattisgarh" };
export function expandStateShort(text) {
  const m = /^(.*?[\p{L}\d])[\s,]+(u\.?\s?p|m\.?\s?p|h\.?\s?p|a\.?\s?p|w\.?\s?b|t\.?\s?n|j\s?&?\s?k|u\.?\s?k|c\.?\s?g)\.?$/iu.exec(String(text || "").trim());
  const state = m && STATE_SHORT[m[2].toLowerCase().replace(/[^a-z]/g, "")];
  return state ? `${m[1]}, ${state}` : String(text || "");
}

/**
 * "Saket, New Delhi" when no settlement has that whole name: the settlements
 * called Saket whose address holds a word of "New Delhi", those with the most
 * such words first. A qualifier in another script ("साकेत, नई दिल्ली") is
 * first read by Nominatim itself, for the words of its English name ("नई
 * दिल्ली" is "New Delhi, Delhi, India"): it used to match nothing, as its
 * letters are not a-z. Returns a hit or null. Throws OsmError.
 */
async function withQualifier(head, restText, deadline) {
  let words = wordsOf(restText, 4);
  if (!words.length && /[^\u0000-\u007f]/.test(restText) && /\p{L}/u.test(restText)) {
    const [r] = await nominatimSearch(restText.trim(), { featureType: "settlement", limit: "1" }, deadline);
    words = r ? wordsOf(r.display_name, 3).filter((w) => !COMMON_WORDS.has(w)) : [];
  }
  if (!words.length) return null;
  const list = await nominatimSearch(head, { featureType: "settlement", limit: "10" }, deadline);
  const scored = list.map((h) => ({ h, n: new Set(words.filter((w) => wordsOf(h.display_name, 3).includes(w))).size }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return chooseHit(scored.map((x) => x.h));
}

/* Kinds of OpenStreetMap object that are a place in their own right: a locality, a road, a station, a park. */
const STAND_IN_CLASSES = /^(place|boundary|highway|railway|public_transport|aeroway|landuse|leisure|natural|waterway|historic)$/;
const classOf = (h) => String(h?.category || h?.class || "");
/* A landmark people name a part of town by: "IIT Delhi", "AIIMS Patna", a mall, a market. */
const isLandmark = (h) => (classOf(h) === "amenity" && /^(university|college|hospital|school|marketplace|bus_station)$/.test(String(h?.type || "")))
  || (classOf(h) === "shop" && h?.type === "mall");

/**
 * The last resort, when no settlement matches what was typed: something
 * else to search around. A locality, a road, a station or a park whose name
 * and address hold every word typed ("Boring Road, Patna"); a landmark (a
 * university, a hospital, a school, a mall) whose name and address hold every
 * word typed but one ("AIIMS Patna", mapped as "All India Institute of Medical
 * Sciences"); or a shop or an office whose ADDRESS holds every word typed
 * ("Pitampura Delhi"), never one matched by its own name only (the restaurant
 * called "NCR", which "Delhi NCR" found until 4 Oct 2026). Returns a hit or null.
 */
export function pickStandIn(list, typed) {
  const words = wordsOf(typed, 3);
  const missing = (text) => {
    const has = new Set(wordsOf(text, 1));
    return words.filter((w) => !has.has(w)).length;
  };
  return (Array.isArray(list) ? list : []).find((h) => {
    const display = String(h?.display_name || "");
    if (STAND_IN_CLASSES.test(classOf(h))) return missing(display) === 0;
    if (isLandmark(h)) return missing(display) <= (words.length > 1 ? 1 : 0);
    return words.length > 0 && missing(display.split(",").slice(1).join(" ")) === 0;
  }) || null;
}

/**
 * The state a place is in, from Nominatim's display name, to put beside it in
 * the page's line ("within 5 km of Saket (Delhi)"), so a Saket in Madhya
 * Pradesh is seen at once. "" when the place is the state itself.
 */
export function stateOf(displayName, name) {
  const parts = String(displayName || "").split(",").map((p) => p.trim()).filter((p) => p && !/^\d+$/.test(p) && p !== "India");
  const state = parts.length > 1 ? parts[parts.length - 1] : "";
  return state && plain(state) !== plain(name) ? state : "";
}

/**
 * The best of Nominatim's settlements for what Mehdi typed: its first answer,
 * except that a city or town of the same name beats its district or state
 * ("Gorakhpur" is the city, not the 3,300 km2 district; "Delhi" is the city,
 * not the state).
 */
export function chooseHit(list) {
  if (!list.length) return null;
  const first = list[0];
  if (DISTRICT_TYPES.test(String(first.addresstype || ""))) {
    const city = list.find((h) => CITY_TYPES.test(String(h.addresstype || "")) && plain(h.name) && plain(h.name) === plain(first.name));
    if (city) return city;
  }
  return first;
}

/**
 * The city as an area, from Nominatim, cached in memory. A region's name
 * comes out first ("Delhi NCR" is searched as Delhi, with a note: splitRegion)
 * and a state written short is spelt out ("Gorakhpur UP"). Then up to three
 * searches, each only when the one before found nothing:
 *   1. the whole text as a settlement ("Patna", "Gopalganj, Bihar");
 *   2. the part before the comma as a settlement, whose address holds a word
 *      of the rest ("Saket, New Delhi": the Saket in Delhi, not in Madhya
 *      Pradesh; "साकेत, नई दिल्ली" too: withQualifier);
 *   3. anything else of that name that can stand in for it (pickStandIn: a
 *      road, a station, a park, a landmark like a university, or a school in
 *      that place), and a 5 km circle around it, named in the label;
 * then, for a boundary, one lookup of its polygon, only when the search uses
 * it (`outline`: "25 km around it" does not). Returns { name, state, display,
 * area, center, note?, around? }. Throws OsmError.
 */
export async function geocodeCity(city, { deadline = deps.now() + 15_000, outline = true } = {}) {
  const typed = String(city || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!typed) throw new OsmError("Type a city, e.g. Patna.", { code: "osm_city" });
  const key = typed.toLowerCase();
  let value = geoCache.get(key);
  if (!value) {
    value = await findPlace(typed, deadline);
    geoCache.set(key, value);
    trim(geoCache);
  }
  if (outline) await withOutline(value, deadline);
  return value;
}

/*
  A district's or a block's own boundary, asked of Nominatim once per place
  and only when a search keeps to it: Area "5, 10 or 25 km around it" draws a
  circle and never needs it (4 Oct 2026: a 25 km search around Gopalganj used
  to cost this lookup too). Without it (Nominatim busy) the boundary's box is
  searched, and the label says so. Searches running at once share the lookup.
*/
async function withOutline(geo, deadline) {
  const area = geo.area;
  if (!geo.outlineOf || area.kind !== "boundary" || area.polygon) return;
  geo.outline ||= polygonFor(geo.outlineOf, deadline);
  const polygon = await geo.outline;
  if (area.kind !== "boundary" || area.polygon) return;
  if (polygon) area.polygon = polygon;
  else Object.assign(area, { kind: "box", label: `in a box around ${geo.name}${geo.state ? ` (${geo.state})` : ""}` });
}

/** What Nominatim says the typed text is (geocodeCity's searches, without the outline). Throws OsmError. */
async function findPlace(typed, deadline) {
  const region = splitRegion(typed);
  const q = expandStateShort(region ? region.city : typed);
  const head = q.split(",")[0].trim();
  let hit = chooseHit(await nominatimSearch(q, { featureType: "settlement", limit: "5" }, deadline));
  if (!hit && head && head !== q) hit = await withQualifier(head, q.slice(q.indexOf(",") + 1), deadline);
  let value;
  if (hit) {
    const name = str(hit.name) || head;
    const { tooBig, polygonOf, area } = areaFor(hit, name);
    if (tooBig) throw new OsmError(`${name} is a whole state. Type a city or a town in it, e.g. its capital.`, { code: "osm_city" });
    const state = stateOf(hit.display_name, name);
    if (state) area.label += ` (${state})`;
    value = { name, state, display: str(hit.display_name) || q, area, center: area.center, ...(polygonOf ? { outlineOf: polygonOf } : {}) };
  } else {
    const any = pickStandIn(await nominatimSearch(q, { limit: "5" }, deadline), q);
    if (!any) {
      throw new OsmError(`OpenStreetMap does not know a place called "${q}" in India. Check the spelling, or try a bigger city nearby.`, { code: "osm_city" });
    }
    // A road or a locality is named by its own name; a school standing in for "Saket New Delhi" by what was typed, around it.
    const own = str(any.name);
    const placeLike = STAND_IN_CLASSES.test(classOf(any));
    const name = placeLike && own ? own : head;
    const around = !placeLike && own && plain(own) !== plain(name) ? own : null;
    const center = { lat: r5(Number(any.lat)), lon: r5(Number(any.lon)) };
    const state = stateOf(any.display_name, name);
    const area = circleArea(center, 5_000, name);
    if (around) area.label += `, around ${around}`;
    if (state) area.label += ` (${state})`;
    value = { name, state, display: str(any.display_name) || q, center, area, ...(around ? { around } : {}) };
  }
  if (region) value.note = region.note;
  return value;
}

/** A circle of Mehdi's chosen size around the place's point. */
export function radiusArea(geo, km) {
  const area = circleArea(geo.center, Math.round(clamp(Number(km) || 5, 1, 30) * 1000), geo.name);
  if (geo.around) area.label += `, around ${geo.around}`;
  if (geo.state) area.label += ` (${geo.state})`;
  return area;
}

/* ── Overpass: what is inside the area ────────────────────────────────────── */

/**
 * The Overpass QL for a spec and an area: always the area's BOX (a global
 * bbox), which Overpass answers fast; the boundary or the circle is applied
 * to the answer (insideArea). Measured 3 Oct 2026: Gopalganj's coaching query
 * took 2 s as a box and 16 s as an Overpass area; a circle without a box ran
 * past 25 s. Only our own selectors and numbers go in.
 */
export function buildQuery(spec, area) {
  const bb = area.box.map((n) => Number(n).toFixed(5)).join(",");
  return `[out:json][timeout:${OVERPASS_SERVER_TIMEOUT_S}][maxsize:${OVERPASS_MAXSIZE}][bbox:${bb}];(${spec.selectors.map((s) => `${s};`).join("")});out tags center qt ${MAX_ELEMENTS};`;
}

const resultCache = new Map();

/**
 * Run a query on the first Overpass server that answers, in the order of
 * OVERPASS_ENDPOINTS. Each server gets one retry. overpass-api.de's first try
 * may take 30 s; the others get 10 s, so a server that hangs cannot eat the
 * budget. A quick "busy" (a fast 5xx, a refused connection, a server-side
 * time-out remark) is retried at once after a short wait; a server that failed
 * slowly (no answer in time, a 504 after many seconds) or said "too many
 * requests" (429) gets its retry after the other servers have had their turn,
 * and a 429 not sooner than 5 s later. A 400 means our query is wrong and
 * stops at once. Answers are kept for 10 minutes.
 * Returns { elements, endpoint, cached }. Throws OsmError.
 */
export async function overpass(query, { deadline = deps.now() + 45_000 } = {}) {
  const hit = resultCache.get(query);
  if (hit && deps.now() - hit.at < RESULT_TTL_MS) return { elements: hit.elements, endpoint: hit.endpoint, cached: true };
  /*
    What went wrong, by server: its last reason, each server once. The page
    shows the sentence Mehdi can act on first, then this detail (3 Oct 2026 it
    listed every server twice, one line per try).
  */
  const errors = new Map();
  const detail = () => [...errors].map(([host, reason]) => `${host}: ${reason}`).join("; ") || "out of time";
  const primary = OVERPASS_ENDPOINTS[0];
  const queue = OVERPASS_ENDPOINTS.map((endpoint) => ({ endpoint, attempt: 0, notBefore: 0 }));
  while (queue.length) {
    const item = queue.shift();
    const { endpoint, attempt } = item;
    let left = deadline - deps.now();
    const wait = item.notBefore - deps.now();
    if (wait > 0) {
      if (left - wait < 3_000) continue;
      await deps.sleep(wait);
      left = deadline - deps.now();
    }
    if (left < 1_500) {
      throw new OsmError(`OpenStreetMap's search servers were too slow this time. Try again in a minute. (${detail()})`, { code: "osm_time" });
    }
    const cap = endpoint === primary ? (attempt === 0 ? OVERPASS_FIRST_TRY_MS : left) : OVERPASS_MIRROR_TRY_MS;
    const t0 = deps.now();
    let why;
    let timedOut = false;
    let busy = false;
    try {
      const res = await deps.fetch(endpoint, {
        method: "POST",
        headers: { "user-agent": USER_AGENT, accept: "application/json", "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(Math.max(1_000, Math.min(cap, left - 500))),
      });
      if (res.status === 400) throw new OsmError("OpenStreetMap could not read the search. This is a bug in the finder: tell Claude.", { code: "osm_query" });
      if (res.ok) {
        let j = null;
        try {
          j = await res.json();
        } catch (e) {
          // An answer that began and then stalled until the time-out is no answer in time, not a wrong one (4 Oct 2026).
          if (e?.name === "TimeoutError" || e?.name === "AbortError") throw e;
        }
        if (j && Array.isArray(j.elements) && !/runtime error|timed out|out of memory/i.test(String(j.remark || ""))) {
          resultCache.set(query, { at: deps.now(), elements: j.elements, endpoint });
          trim(resultCache);
          return { elements: j.elements, endpoint, cached: false };
        }
        why = j ? "the server ran out of time" : "the answer was not JSON";
      } else {
        why = `HTTP ${res.status}`;
        busy = res.status === 429;
      }
    } catch (e) {
      if (e instanceof OsmError) throw e;
      timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
      why = timedOut ? "no answer in time" : "could not connect";
    }
    errors.set(new URL(endpoint).host, why);
    if (attempt > 0) continue;
    if (busy) queue.push({ endpoint, attempt: 1, notBefore: deps.now() + BUSY_WAIT_MS });
    else if (timedOut || deps.now() - t0 >= SLOW_FAIL_MS) queue.push({ endpoint, attempt: 1, notBefore: 0 });
    else queue.unshift({ endpoint, attempt: 1, notBefore: deps.now() + RETRY_WAIT_MS });
  }
  throw new OsmError(`OpenStreetMap's search servers are busy right now. Try again in a minute. (${detail()})`, { code: "osm_busy" });
}

/**
 * The whole OSM search: city -> area -> Overpass -> results, one page of 20.
 *   { type, city, preset?, radiusKm?, offset?, deadline? }
 * Returns { places, nextPageToken, total, counts: { withPhone, withWebsite },
 * area: { kind, label, radiusKm? }, capped, spec, broadened, caveat, placeNote, endpoint },
 * where `broadened` is a plain sentence when a speciality found nobody and the
 * broader list is shown, `caveat` one when OSM cannot tell the preset's kind
 * apart (a school's board), `placeNote` one when the place typed was read as
 * another ("Delhi NCR": Delhi only), and `capped` true when the area held more
 * than one answer may carry. Throws OsmError with a sentence Mehdi can act on.
 */
export async function osmSearch({ type, city, preset, radiusKm = null, offset = 0, deadline = deps.now() + 45_000 }) {
  const spec = specFor(preset, type);
  // A circle around the place needs no boundary outline, so none is asked for.
  const geo = await geocodeCity(city, { deadline, outline: !radiusKm });
  const area = radiusKm ? radiusArea(geo, radiusKm) : geo.area;
  const { elements, endpoint } = await overpass(buildQuery(spec, area), { deadline });
  const capped = elements.length >= MAX_ELEMENTS;
  const { places, narrowed } = placesFor(elements, spec, (p) => insideArea(area, p));
  const start = Math.max(0, Math.min(Number(offset) || 0, places.length));
  const page = places.slice(start, start + PAGE_SIZE);
  const next = start + PAGE_SIZE < places.length ? `osm.${start + PAGE_SIZE}` : null;
  const broader = !narrowed && spec.broadenTo ? SPECS[spec.broadenTo] : null;
  const where = String(city).replace(/\s+/g, " ").trim();
  const broadened = broader
    ? `OpenStreetMap has no ${spec.label} by name in ${where}, so these are all the ${broader.label} it lists there.`
    : null;
  const caveat = spec.caveat ? spec.caveat(where) : null;
  return {
    places: page, nextPageToken: next, total: places.length,
    counts: { withPhone: places.filter((p) => p.phone).length, withWebsite: places.filter((p) => p.website).length },
    area: { kind: area.kind, label: area.label, ...(area.kind === "radius" ? { radiusKm: Math.round(area.radiusM / 1000) } : {}) },
    capped, spec: spec.id, broadened, caveat, placeNote: geo.note || null, endpoint,
  };
}

/** For tests: forget the caches and the Nominatim clock. */
export function resetOsmCaches() {
  geoCache.clear();
  resultCache.clear();
  lastNominatimAt = 0;
  nominatimQueue = Promise.resolve();
}
