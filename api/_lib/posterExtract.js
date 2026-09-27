/**
 * What a poster is read INTO, and the check that runs on whatever comes back.
 *
 * WHY THE MODEL'S JSON IS NEVER TRUSTED AS IT ARRIVES
 *
 * Four providers, four ways of honouring a JSON schema (strictly, loosely, or
 * not at all when the admin picks a model that ignores it). And the output goes
 * straight into a demo that a school director will read with their own name on
 * it. So everything below is applied to every reply, from every provider, in
 * the same way: unknown keys dropped, strings trimmed and capped, lists capped,
 * empty values removed. A field that is not on the poster must come out EMPTY,
 * so the template's own content stays and its "sample" labels still apply;
 * nothing here fills a gap.
 *
 * Keep the field list identical to PosterExtract in the shared contract (the
 * client's copy is in src/). If a field is added there, add it here, or it is
 * silently dropped, which is the safe failure.
 */

export const TEMPLATE_IDS = [
  "s1-urban-cbse",
  "s2-rural-state-board",
  "s3-play-school",
  "s4-residential",
  "s5-international",
  "c1-jee-neet-urban",
  "c2-rural-tuition",
  "c3-science",
  "c4-foundation",
  "c5-government-jobs",
];

// ── Limits ─────────────────────────────────────────────────────────────────
// Generous for a real poster, small enough that a runaway reply cannot bloat
// a demo record. A poster with 41 toppers shows the first 40.
const STR = 300;
const LONG = 1000;
const LIST = { exams: 20, focusAreas: 20, facilities: 30, offers: 15, courses: 20,
  faculty: 30, results: 40, phones: 6, subjects: 15 };

// ── The JSON schema sent to every provider ─────────────────────────────────
// Plain JSON Schema, no length keywords: each provider supports a different
// subset, and the caps are enforced below anyway. Every object is closed with
// additionalProperties:false because Anthropic and OpenAI require it for
// structured output. Nothing but `kind` is required: "omit what is not there"
// has to be expressible, or a model fills the slot with a guess.
const s = { type: "string" };
const sList = { type: "array", items: s };
const obj = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });

export const POSTER_SCHEMA = obj({
  kind: { type: "string", enum: ["school", "coaching"] },
  instituteName: s, instituteNameHi: s, tagline: s, city: s, state: s, locality: s,
  board: s, classes: s, established: s,
  exams: sList, focusAreas: sList,
  courses: { type: "array", items: obj({ name: s, level: s, duration: s, fee: s, feeNote: s,
    timings: s, batchStart: s, subjects: sList }) },
  faculty: { type: "array", items: obj({ name: s, subject: s, qualification: s, experience: s }) },
  results: { type: "array", items: obj({ student: s, score: s, rank: s, exam: s, year: s }) },
  facilities: sList,
  admissions: obj({ open: { type: "boolean" }, dates: s, note: s }),
  contact: obj({ phones: sList, whatsapp: s, email: s, address: s, website: s }),
  offers: sList,
  posterLanguage: { type: "string", enum: ["hi", "en", "mixed"] },
  notes: s,
  // Not part of PosterExtract: the model's guess at a template, split off in
  // normalise(). The client decides with its own rules; this is a hint.
  suggestedTemplate: { type: "string", enum: TEMPLATE_IDS },
}, ["kind"]);

// ── The one prompt every provider gets ─────────────────────────────────────
export function buildPrompt(kind) {
  const told = kind === "school" || kind === "coaching"
    ? `The admin says this institute is a ${kind}.`
    : "Decide from the poster whether this is a school or a coaching/tuition institute.";
  return [
    "You are reading an advertising poster for an Indian school or coaching institute.",
    told,
    "Return ONE JSON object matching the schema. Rules:",
    "- Copy values VERBATIM from the poster. Keep Hindi/Devanagari exactly as written; do not translate or transliterate.",
    "- NEVER guess, infer or invent. If something is not printed on the poster, leave the field out entirely.",
    "- Do not invent phone numbers, fees, results, names, dates or addresses. Partial is fine; wrong is not.",
    "- instituteNameHi only if the name is printed in Devanagari; instituteName is the name as printed in Latin script (or the Devanagari if that is all there is).",
    "- results: only students/ranks/scores printed on the poster. courses: only batches/courses printed.",
    "- admissions.open is true only if the poster says admissions/registration are open.",
    "- posterLanguage: hi, en or mixed.",
    "- suggestedTemplate: pick the closest of: c1-jee-neet-urban (JEE/NEET coaching), c5-government-jobs (SSC, bank, railway, UPSC, police),",
    "  c4-foundation (class 6-10, Olympiad, foundation), c3-science (science-only tuition), c2-rural-tuition (small village tuition),",
    "  s3-play-school (play school, pre-primary), s4-residential (boarding, hostel), s5-international (IB, Cambridge),",
    "  s2-rural-state-board (state board, village, Hindi medium), s1-urban-cbse (CBSE/ICSE city school).",
    "- notes: anything important on the poster that fits no other field, verbatim and short.",
    "Output only the JSON object, no prose, no code fences.",
  ].join("\n");
}

// ── Parsing a reply ─────────────────────────────────────────────────────────
/** Pull a JSON object out of model text: plain, fenced, or with chatter around it. */
export function parseModelJson(text) {
  if (typeof text !== "string" || !text.trim()) throw new Error("Model returned no text");
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ }
    }
  }
  throw new Error("Model reply was not valid JSON");
}

// ── Normalising ─────────────────────────────────────────────────────────────
// Control characters out, runs of whitespace collapsed, capped. Returns
// undefined for anything that is not a non-empty string, so the key is dropped.
function str(v, max = STR) {
  if (typeof v === "number" && Number.isFinite(v)) v = String(v);
  if (typeof v !== "string") return undefined;
  const t = v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max).trim() : t;
}
function strList(v, max, each = STR) {
  if (!Array.isArray(v)) return undefined;
  const out = [];
  for (const x of v) {
    const t = str(x, each);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out.length ? out : undefined;
}
/** Keep only `fields` (string fields unless listed in `lists`), drop empties. */
function pick(v, fields, lists = {}) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out = {};
  for (const f of fields) {
    const val = lists[f] ? strList(v[f], lists[f]) : str(v[f]);
    if (val !== undefined) out[f] = val;
  }
  return Object.keys(out).length ? out : undefined;
}
function objList(v, max, fields, lists) {
  if (!Array.isArray(v)) return undefined;
  const out = [];
  for (const x of v) {
    const o = pick(x, fields, lists);
    if (o) out.push(o);
    if (out.length >= max) break;
  }
  return out.length ? out : undefined;
}

/**
 * Model JSON -> { extracted: PosterExtract, modelTemplate }.
 * `kind` from the admin wins over the model's reading: he is looking at the
 * poster and chose it on purpose.
 */
export function normalise(raw, requestedKind) {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const e = {};
  const set = (k, v) => { if (v !== undefined) e[k] = v; };

  for (const f of ["instituteName", "instituteNameHi", "tagline", "city", "state", "locality",
    "board", "classes", "established"]) set(f, str(r[f]));
  set("exams", strList(r.exams, LIST.exams));
  set("focusAreas", strList(r.focusAreas, LIST.focusAreas));
  set("courses", objList(r.courses, LIST.courses,
    ["name", "level", "duration", "fee", "feeNote", "timings", "batchStart", "subjects"],
    { subjects: LIST.subjects }));
  set("faculty", objList(r.faculty, LIST.faculty, ["name", "subject", "qualification", "experience"]));
  set("results", objList(r.results, LIST.results, ["student", "score", "rank", "exam", "year"]));
  set("facilities", strList(r.facilities, LIST.facilities));

  if (r.admissions && typeof r.admissions === "object") {
    const a = pick(r.admissions, ["dates", "note"]) || {};
    if (typeof r.admissions.open === "boolean") a.open = r.admissions.open;
    if (Object.keys(a).length) e.admissions = a;
  }
  if (r.contact && typeof r.contact === "object") {
    const c = pick(r.contact, ["whatsapp", "email", "website"]) || {};
    const phones = strList(r.contact.phones, LIST.phones, 40);
    if (phones) c.phones = phones;
    const address = str(r.contact.address, 400);
    if (address) c.address = address;
    if (Object.keys(c).length) e.contact = c;
  }
  set("offers", strList(r.offers, LIST.offers));
  if (["hi", "en", "mixed"].includes(r.posterLanguage)) e.posterLanguage = r.posterLanguage;
  set("notes", str(r.notes, LONG));

  let kind = requestedKind === "school" || requestedKind === "coaching" ? requestedKind : undefined;
  if (!kind && (r.kind === "school" || r.kind === "coaching")) kind = r.kind;
  if (!kind) kind = e.exams || e.courses || e.results?.some((x) => x.rank) ? "coaching" : "school";

  const modelTemplate = TEMPLATE_IDS.includes(r.suggestedTemplate) ? r.suggestedTemplate : undefined;
  return { extracted: { kind, ...e }, modelTemplate };
}

// ── Template choice ─────────────────────────────────────────────────────────
// The same rules the client applies. The client decides; this is only what
// /api/poster reports as suggestedTemplate. Order: the admin's own pick, then
// the first rule that matches (most specific first), then the model's guess
// when it is for the right kind, then the city default.
function ruleTemplate(x) {
  const text = [x.instituteName, x.instituteNameHi, x.tagline, x.board, x.classes, x.notes,
    ...(x.exams || []), ...(x.focusAreas || []), ...(x.facilities || []), ...(x.offers || []),
    ...(x.courses || []).flatMap((c) => [c.name, c.level, ...(c.subjects || [])]),
    ...(x.results || []).map((r) => r.exam)].filter(Boolean).join(" | ").toLowerCase();
  const has = (re) => re.test(text);
  if (x.kind === "coaching") {
    if (has(/\b(jee|neet|iit|aiims)\b/)) return "c1-jee-neet-urban";
    if (has(/\b(ssc|cgl|chsl|bank|ibps|railway|rrb|ntpc|upsc|ias|police|constable|govt|government|sarkari)\b|सरकारी|पुलिस|रेलवे/)) return "c5-government-jobs";
    if (has(/\b(olympiad|foundation|ntse)\b|\bclass(es)?\s*(6|7|8|9|10)\b|\b(6|7|8|9|10)th\b|फाउंडेशन/)) return "c4-foundation";
    if (has(/\b(physics|chemistry|biology|science)\b/) && !has(/\b(maths?|english|hindi|commerce|arts|accounts)\b/)) return "c3-science";
    if (has(/\b(village|gram)\b|गाँव|गांव|ग्राम/)) return "c2-rural-tuition";
    return null;
  }
  if (has(/\b(play\s*school|playschool|pre[-\s]?primary|pre[-\s]?school|nursery|kindergarten|toddlers?|day\s*care)\b|प्ले/)) return "s3-play-school";
  if (has(/\b(boarding|residential|hostel)\b|छात्रावास|आवासीय/)) return "s4-residential";
  if (has(/\b(ib|igcse|cambridge|international)\b/)) return "s5-international";
  if (has(/\b(state board|up board|bihar board|mp board|rbse|bseb|hindi medium|village)\b|हिंदी माध्यम|हिन्दी माध्यम|ग्राम|गाँव|गांव/)) return "s2-rural-state-board";
  return null;
}

export function chooseTemplate(x, hint, modelTemplate) {
  if (TEMPLATE_IDS.includes(hint)) return hint;
  const byRule = ruleTemplate(x);
  if (byRule) return byRule;
  const prefix = x.kind === "coaching" ? "c" : "s";
  if (modelTemplate && modelTemplate.startsWith(prefix)) return modelTemplate;
  return x.kind === "coaching" ? "c1-jee-neet-urban" : "s1-urban-cbse";
}
