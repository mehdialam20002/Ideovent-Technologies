/**
 * WHAT THE POSTER READER RETURNS, AND WHICH TEMPLATE IT LEADS TO.
 *
 * `PosterExtract` is the shared contract between /api/poster (which asks a
 * model to read a school or coaching poster) and the admin (which reviews the
 * answer and overlays it on a template, see
 * src/lib/demo/templates/fromPoster.ts). Every field but `kind` is optional,
 * because a poster is a poster: it carries a name, a phone and three batches,
 * never a whole website. A field the poster does not show stays EMPTY here.
 * Values are verbatim from the poster, Devanagari kept as written; nothing is
 * translated, rounded or improved on the way through.
 *
 * `chooseTemplate` is DETERMINISTIC and runs in the browser. The model also
 * suggests a template, but a model's pick can drift between two runs on the
 * same poster, and Mehdi should be able to predict which design a poster
 * lands on. So the suggestion is used only when no rule below matches.
 *
 * Pure and dependency-free (bar the id list), so scripts/test-from-poster.mjs
 * bundles it straight from source.
 */

import { TEMPLATE_IDS, type TemplateId } from "@/lib/demo/templates/ids";

export type PosterKind = "school" | "coaching";

export interface PosterCourse {
  name?: string;
  level?: string;
  duration?: string;
  fee?: string;
  feeNote?: string;
  timings?: string;
  batchStart?: string;
  subjects?: string[];
}

export interface PosterFaculty {
  name?: string;
  subject?: string;
  qualification?: string;
  experience?: string;
}

export interface PosterResult {
  student?: string;
  score?: string;
  rank?: string;
  exam?: string;
  year?: string;
}

export interface PosterAdmissions {
  open?: boolean;
  dates?: string;
  note?: string;
}

export interface PosterContact {
  phones?: string[];
  whatsapp?: string;
  email?: string;
  address?: string;
  website?: string;
}

export interface PosterExtract {
  kind: PosterKind;
  instituteName?: string;
  instituteNameHi?: string;
  tagline?: string;
  city?: string;
  state?: string;
  locality?: string;
  board?: string;
  classes?: string;
  established?: string;
  exams?: string[];
  focusAreas?: string[];
  courses?: PosterCourse[];
  faculty?: PosterFaculty[];
  results?: PosterResult[];
  facilities?: string[];
  admissions?: PosterAdmissions;
  contact?: PosterContact;
  offers?: string[];
  posterLanguage?: "hi" | "en" | "mixed";
  notes?: string;
}

/** Who read the poster, for the review screen and the demo's private notes. */
export interface PosterAttempt {
  provider: string;
  status: "ok" | "limit" | "error" | "skipped";
  error?: string;
}

/** True when a string holds any Devanagari letter. */
export const hasDevanagari = (s: string | undefined): boolean => /[ऀ-ॿ]/.test(s || "");

/** An empty extract of a kind: the starting point of "fill it in by hand". */
export function emptyExtract(kind: PosterKind): PosterExtract {
  return { kind };
}

/* ── Cleaning what came back ─────────────────────────────────────────────── */

const str = (v: unknown): string | undefined => {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  /* Models write "N/A", "null" or "-" for a field they could not see. Those
     are not facts from the poster, so they become empty. */
  return t && !/^(n\/?a|null|none|unknown|not (given|mentioned|available)|-+)$/i.test(t) ? t : undefined;
};
const strs = (v: unknown): string[] | undefined => {
  const list = (Array.isArray(v) ? v : typeof v === "string" ? [v] : []).map(str).filter(Boolean) as string[];
  return list.length ? [...new Set(list)] : undefined;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const rows = <T>(v: unknown, map: (o: Record<string, unknown>) => T): T[] | undefined => {
  const list = (Array.isArray(v) ? v : []).map((x) => map(obj(x))).filter((x) => Object.values(x as object).some((y) => y !== undefined));
  return list.length ? list : undefined;
};
const prune = <T extends object>(o: T): T => {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k];
  return o;
};

/**
 * Whatever the server returned, as a well-formed extract: strings trimmed,
 * placeholders ("N/A") dropped, empty rows removed, unknown keys ignored.
 * `fallbackKind` is used when the model did not say.
 */
export function normalizeExtract(raw: unknown, fallbackKind: PosterKind = "coaching"): PosterExtract {
  const r = obj(raw);
  const kind: PosterKind = r.kind === "school" || r.kind === "coaching" ? r.kind : fallbackKind;
  const adm = obj(r.admissions);
  const con = obj(r.contact);
  const lang = r.posterLanguage;
  const admissions = prune({
    open: typeof adm.open === "boolean" ? adm.open : undefined,
    dates: str(adm.dates),
    note: str(adm.note),
  });
  const contact = prune({
    phones: strs(con.phones),
    whatsapp: str(con.whatsapp),
    email: str(con.email),
    address: str(con.address),
    website: str(con.website),
  });
  return prune({
    kind,
    instituteName: str(r.instituteName),
    instituteNameHi: str(r.instituteNameHi),
    tagline: str(r.tagline),
    city: str(r.city),
    state: str(r.state),
    locality: str(r.locality),
    board: str(r.board),
    classes: str(r.classes),
    established: str(r.established),
    exams: strs(r.exams),
    focusAreas: strs(r.focusAreas),
    courses: rows(r.courses, (c) => prune({
      name: str(c.name), level: str(c.level), duration: str(c.duration), fee: str(c.fee),
      feeNote: str(c.feeNote), timings: str(c.timings), batchStart: str(c.batchStart), subjects: strs(c.subjects),
    })),
    faculty: rows(r.faculty, (f) => prune({
      name: str(f.name), subject: str(f.subject), qualification: str(f.qualification), experience: str(f.experience),
    })),
    results: rows(r.results, (x) => prune({
      student: str(x.student), score: str(x.score), rank: str(x.rank), exam: str(x.exam), year: str(x.year),
    })),
    facilities: strs(r.facilities),
    admissions: Object.keys(admissions).length ? admissions : undefined,
    contact: Object.keys(contact).length ? contact : undefined,
    offers: strs(r.offers),
    posterLanguage: lang === "hi" || lang === "en" || lang === "mixed" ? lang : undefined,
    notes: str(r.notes),
  });
}

/* ── Which template ──────────────────────────────────────────────────────── */

/** Everything on the poster that says what kind of institute it is, lower case. */
function haystack(x: PosterExtract): string {
  const parts: (string | undefined)[] = [
    x.instituteName, x.instituteNameHi, x.tagline, x.board, x.classes, x.locality, x.notes,
    ...(x.exams || []), ...(x.focusAreas || []), ...(x.facilities || []), ...(x.offers || []),
    x.admissions?.note,
  ];
  for (const c of x.courses || []) parts.push(c.name, c.level, ...(c.subjects || []));
  for (const r of x.results || []) parts.push(r.exam);
  return ` ${parts.filter(Boolean).join(" | ").toLowerCase()} `;
}

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };

/**
 * The class numbers a poster names ("Class 6 to 10", "VI-X", "11th", "कक्षा 9"),
 * so "Nursery to Class 12" is not mistaken for a play school and a
 * "Class 6 to 10" centre is recognised as foundation.
 */
export function classNumbers(text: string): number[] {
  const out: number[] = [];
  const t = text.toLowerCase();
  const re = /(?:class(?:es)?|std\.?|standard|grade|कक्षा)\s*([0-9]{1,2}|[ivx]{1,4})\b(?:\s*(?:to|-|se|से|&|and|,)\s*(?:class\s*)?([0-9]{1,2}|[ivx]{1,4})\b)?/g;
  for (const m of t.matchAll(re)) {
    for (const g of [m[1], m[2]]) {
      if (!g) continue;
      const n = /^\d+$/.test(g) ? Number(g) : ROMAN[g];
      if (n && n >= 1 && n <= 12) out.push(n);
    }
  }
  for (const m of t.matchAll(/\b([0-9]{1,2})(?:st|nd|rd|th)\b/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) out.push(n);
  }
  return out;
}

const has = (hay: string, re: RegExp) => re.test(hay);

const RE = {
  jeeNeet: /\b(jee|neet|iit[- ]?jee|iit|aiims|medical entrance|engineering entrance|pmt)\b/,
  govt: /\b(ssc|cgl|chsl|mts|bank(ing)?|ibps|sbi|clerk|railways?|rrb|ntpc|group ?d|upsc|ias|pcs|uppsc|bpsc|mppsc|rpsc|police|constable|daroga|defen[cs]e|nda|cds|army|agniveer|patwari|lekhpal|tet|ctet|government jobs?|govt\.? jobs?|sarkari|competitive exams?)\b|सरकारी|पुलिस|रेलवे/,
  foundation: /\b(foundation|pre[- ]?foundation|olympiads?|nso|imo|ntse|nmms|ieo|nstse)\b/,
  seniorClass: /\b(droppers?|repeaters?|class(es)? ?(11|12|xi|xii)|11th|12th)\b/,
  science: /\b(science|physics|chemistry|biology|zoology|botany)\b/,
  nonScience: /\b(commerce|accounts?|accountancy|economics|arts|humanities|english speaking|computer|typing|spoken english|all subjects)\b/,
  tuition: /\b(tuition|tution|tuitions|all subjects|village|gaon|gram|tehsil)\b|गाँव|गांव|ट्यूशन|सभी विषय/,
  play: /\b(play ?(school|group|way)|pre[- ]?school|kindergarten|montessori|day ?care|creche|toddlers?)\b/,
  prePrimary: /\b(pre[- ]?primary|nursery|lkg|ukg|kg|jr\.? kg|sr\.? kg)\b/,
  boarding: /\b(boarding|residential|hostels?)\b|छात्रावास|आवासीय/,
  international: /\b(ib|international baccalaureate|cambridge|igcse|caie|a[- ]levels?|international school|pyp|myp)\b/,
  cbseIcse: /\b(cbse|icse|isc|cisce)\b/,
  stateBoard: /\b(state board|up board|upmsp|bihar board|bseb|mp board|mpbse|rbse|rajasthan board|hbse|pseb|gseb|maharashtra board|madhyamik|parishad|hindi medium|village|gram|rural)\b|हिंदी माध्यम|हिन्दी माध्यम|ग्राम|गाँव|गांव|परिषद/,
};

/**
 * THE MAPPING, in the order it is tried. The first rule that matches wins;
 * the model's `hint` is used only when none does, and only when it names a
 * template of the right kind.
 *
 *   coaching
 *     foundation or Olympiad, and nothing above Class 10   c4-foundation
 *     JEE or NEET                                          c1-jee-neet-urban
 *     SSC, bank, railway, UPSC, police, defence, TET       c5-government-jobs
 *     foundation or Olympiad (with senior classes too)     c4-foundation
 *     classes 6 to 10 only                                 c4-foundation
 *     science subjects only                                c3-science
 *     tuition, village, all subjects                       c2-rural-tuition
 *     otherwise: the hint, else                            c2-rural-tuition
 *   school
 *     play school, or pre-primary with nothing above Class 2   s3-play-school
 *     boarding, residential, hostel                        s4-residential
 *     IB, Cambridge, IGCSE, international                  s5-international
 *     state board, village, Hindi-medium; or a Hindi poster
 *       that names no CBSE or ICSE                         s2-rural-state-board
 *     otherwise: the hint, else                            s1-urban-cbse
 *
 * WHY FOUNDATION IS TRIED BEFORE JEE. An "IIT-JEE foundation for Class 8 to
 * 10" poster names JEE, but it sells a foundation course to a Class 8 family,
 * which is c4's page. It goes to c1 the moment it also names Class 11, 12 or
 * droppers.
 */
export function chooseTemplate(x: PosterExtract, hint?: string): TemplateId {
  const hay = haystack(x);
  const classes = classNumbers(hay);
  const top = classes.length ? Math.max(...classes) : 0;
  const hintOk = (prefix: "s" | "c"): TemplateId | null =>
    hint && (TEMPLATE_IDS as readonly string[]).includes(hint) && hint.startsWith(prefix) ? (hint as TemplateId) : null;

  if (x.kind === "coaching") {
    const senior = has(hay, RE.seniorClass) || top >= 11;
    if (has(hay, RE.foundation) && !senior) return "c4-foundation";
    if (has(hay, RE.jeeNeet)) return "c1-jee-neet-urban";
    if (has(hay, RE.govt)) return "c5-government-jobs";
    if (has(hay, RE.foundation)) return "c4-foundation";
    if (classes.length && Math.min(...classes) >= 6 && top <= 10) return "c4-foundation";
    if (has(hay, RE.science) && !has(hay, RE.nonScience) && !has(hay, RE.tuition)) return "c3-science";
    if (has(hay, RE.tuition)) return "c2-rural-tuition";
    return hintOk("c") || "c2-rural-tuition";
  }

  const prePrimaryOnly = has(hay, RE.prePrimary) && (top ? top <= 2 : !has(hay, RE.cbseIcse));
  if (has(hay, RE.play) || prePrimaryOnly) return "s3-play-school";
  if (has(hay, RE.boarding)) return "s4-residential";
  if (has(hay, RE.international)) return "s5-international";
  if (has(hay, RE.stateBoard) && !has(hay, RE.cbseIcse)) return "s2-rural-state-board";
  if (x.posterLanguage === "hi" && !has(hay, RE.cbseIcse)) return "s2-rural-state-board";
  return hintOk("s") || "s1-urban-cbse";
}
