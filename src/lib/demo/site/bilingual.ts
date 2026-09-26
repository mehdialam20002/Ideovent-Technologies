/**
 * READING TEXT IN THE READER'S LANGUAGE. The fix for "English karne pe v
 * Hindi me text rehta hai kuch jagah".
 *
 * ── WHY THE OLD PAGES LEAKED ───────────────────────────────────────────────
 * The toggle translated OUR structural copy only, and printed the institute's
 * fields verbatim. The templates had typed Hindi and Hinglish straight into
 * those fields (a Devanagari tagline, Hindi notices), so an English reader
 * still got Hindi in the hero and the notice board.
 *
 * ── THE TWO RULES EVERY PAGE FOLLOWS ──────────────────────────────────────
 * 1. STRUCTURAL COPY (headings, buttons, labels, empty states) is a
 *    `Bilingual` = { en, hi }, both REQUIRED by the type, and is read with
 *    `tr(copy, lang)`. A string literal in JSX that a reader sees is a bug:
 *    it cannot follow the toggle. Page copy lives in src/lib/demo/site/copy.ts
 *    (shared) or a `const COPY = {...} satisfies Record<string, Bilingual>` at
 *    the top of the page file.
 *
 * 2. INSTITUTE CONTENT is a plain field (English) plus the object's own `hi`
 *    block under the same key (see DemoHi in src/lib/cms/types.ts), read with
 *    `bi(obj, "key", lang)`. Hindi mode prefers `hi.key` and falls back to
 *    the English; English mode prefers the English and falls back to the
 *    Hindi only when there is no English at all. So Hindi can reach the
 *    English page only when nobody wrote English, and
 *    scripts/check-demo-lang.mjs stops a template from doing that.
 *
 * Nothing here machine-translates. A missing Hindi version shows the English,
 * which is what the institute actually said.
 */

import type { DemoLang } from "../language";

/** Structural copy in both languages. Both keys are required on purpose. */
export interface Bilingual {
  en: string;
  hi: string;
}

/** Our copy in the reader's language. */
export function tr(copy: Bilingual, lang: DemoLang): string {
  return lang === "hi" ? copy.hi || copy.en : copy.en || copy.hi;
}

/** Our copy with {placeholders} filled: tr(COPY.since, lang, { year: "2009" }). */
export function trf(copy: Bilingual, lang: DemoLang, vars: Record<string, string>): string {
  return tr(copy, lang).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * LABEL WORDS. A group, category or audience is usually one of a few words
 * ("Fees", "Forms", "Parents"), typed in English by whoever filled the
 * record, often with no Hindi twin. Left alone, a Hindi page shows a row of
 * English filter chips beside Hindi cards. So for these three keys only, a
 * Hindi reader with no `hi` value gets the word from this list, and anything
 * not in it stays as typed. Words a Delhi or UP parent says in English
 * (Fees, Form, Batch, Admission, Test, Result) are deliberately absent.
 * Keys are lower-case.
 */
const LABEL_KEYS = new Set(["group", "category", "audience"]);
export const LABEL_WORDS: Record<string, string> = {
  parents: "अभिभावक", families: "परिवार", students: "छात्र", teachers: "शिक्षक",
  leadership: "प्रबंधन", alumni: "पुराने छात्र",
  lists: "सूची", policies: "नियम", learning: "पढ़ाई", academics: "पढ़ाई",
  subjects: "विषय", timings: "समय", exams: "परीक्षाएँ", "getting here": "यहाँ कैसे पहुँचें",
  "about us": "हमारे बारे में", "first class": "पहली क्लास", "previous papers": "पिछले साल के पेपर",
  "model papers": "मॉडल पेपर", "sample papers": "सैंपल पेपर", boarding: "हॉस्टल",
  menu: "खाने का मेन्यू", "before term": "टर्म से पहले", general: "सामान्य",
  care: "देखभाल", olympiad: "ओलंपियाड", olympiads: "ओलंपियाड",
  sports: "खेल", safety: "सुरक्षा", health: "सेहत", events: "कार्यक्रम", campus: "कैंपस",
  classrooms: "क्लासरूम", celebrations: "त्योहार और उत्सव", "annual day": "वार्षिक उत्सव",
};
function labelWord(key: string, en: string): string {
  return LABEL_KEYS.has(key) ? LABEL_WORDS[en.toLowerCase()] || "" : "";
}

/**
 * One text field of an institute object in the reader's language.
 *
 *   bi(site, "tagline", lang)       the top-level record (reads site.hi.tagline)
 *   bi(course, "name", lang)        any item carrying its own `hi`
 */
export function bi<T extends object>(obj: T | null | undefined, key: keyof T & string, lang: DemoLang): string {
  if (!obj) return "";
  const en = clean((obj as Record<string, unknown>)[key]);
  const hiBlock = (obj as { hi?: Record<string, unknown> }).hi;
  const hi = clean(hiBlock?.[key]) || (lang === "hi" && en ? labelWord(key, en) : "");
  return lang === "hi" ? hi || en : en || hi;
}

/** True when the field has text in either language. Use it in page predicates. */
export function hasBi<T extends object>(obj: T | null | undefined, key: keyof T & string): boolean {
  return !!bi(obj, key, "en");
}

const HI_MONTHS: Record<string, string> = {
  january: "जनवरी", february: "फ़रवरी", march: "मार्च", april: "अप्रैल", may: "मई", june: "जून",
  july: "जुलाई", august: "अगस्त", september: "सितंबर", october: "अक्टूबर", november: "नवंबर", december: "दिसंबर",
};

/**
 * A free-text date such as "29 August 2026" (a blog post's date, the exam
 * calendar's "updated" line) in the reader's language. Only a plain
 * "day Month year" or "Month year" is rewritten, month name only; anything
 * else stays as typed.
 */
export function dateIn(s: string | undefined, lang: DemoLang): string {
  const v = clean(s);
  if (lang !== "hi" || !/^(\d{1,2} )?[A-Za-z]+ \d{4}$/.test(v)) return v;
  return v.replace(/[A-Za-z]+/, (m) => HI_MONTHS[m.toLowerCase()] || m);
}

/** True when a string contains Devanagari. The leak detector's test. */
export function hasDevanagari(s: string | undefined): boolean {
  return /[ऀ-ॿ]/.test(s || "");
}

/** Non-empty trimmed strings only. */
export function texts(list: (string | undefined)[] | undefined): string[] {
  return (list || []).map(clean).filter(Boolean);
}

/** Items whose `key` has text in either language. */
export function withText<T extends object>(list: T[] | undefined, key: keyof T & string): T[] {
  return (list || []).filter((x) => hasBi(x, key));
}

/**
 * `bi` plus the language the text is actually in, for the `lang` attribute
 * on a fallback: { text, lang }. `lang` is null when the text is in the
 * reader's language (no attribute needed).
 */
export function biLang<T extends object>(
  obj: T | null | undefined,
  key: keyof T & string,
  lang: DemoLang,
): { text: string; lang: DemoLang | null } {
  if (!obj) return { text: "", lang: null };
  const en = clean((obj as Record<string, unknown>)[key]);
  const hi = clean((obj as { hi?: Record<string, unknown> }).hi?.[key]) || (lang === "hi" && en ? labelWord(key, en) : "");
  if (lang === "hi") return hi ? { text: hi, lang: null } : { text: en, lang: en ? "en" : null };
  return en ? { text: en, lang: null } : { text: hi, lang: hi ? "hi" : null };
}

/**
 * The reader's-language label for one distinct value of `key` across a list,
 * for filter chips and group headings built with `distinct()`. The filter
 * still compares the plain (English) value; only the label follows the
 * toggle. Falls back to the value itself when no item carries it.
 */
export function biLabel<T extends object>(list: T[] | undefined, key: keyof T & string, value: string, lang: DemoLang): string {
  const item = (list || []).find((x) => clean((x as Record<string, unknown>)[key]) === value);
  return item ? bi(item, key, lang) || value : value;
}


/**
 * A LIST field in the reader's language: facilities, admission documents,
 * payment modes, a route's stops. The Hindi lives at `obj.hi[key]` as a list
 * in the same order as the English, so each line falls back on its own: a
 * Hindi list one line short still prints the last line in English rather
 * than dropping it. English mode reads the English, and the Hindi only when
 * there is no English list at all. Empty lines are dropped after pairing.
 *
 *   biList(site, "facilities", lang)          reads site.hi.facilities
 *   biList(site.admissions, "documents", lang)
 */
export function biList<T extends object>(obj: T | null | undefined, key: keyof T & string, lang: DemoLang): string[] {
  if (!obj) return [];
  const raw = (obj as Record<string, unknown>)[key];
  const en = Array.isArray(raw) ? raw.map(clean) : [];
  const hiRaw = (obj as { hi?: Record<string, unknown> }).hi?.[key];
  const hi = Array.isArray(hiRaw) ? hiRaw.map(clean) : [];
  if (!en.some(Boolean)) return hi.filter(Boolean);
  if (lang !== "hi") return en.filter(Boolean);
  return en.map((e, i) => (e ? hi[i] || e : "")).filter(Boolean);
}

/**
 * Pairs of English and reader's-language lines of a list, for a filter that
 * compares the English value but shows the translated label, or a search
 * that should match either language.
 */
export function biPairs<T extends object>(obj: T | null | undefined, key: keyof T & string, lang: DemoLang): { en: string; text: string }[] {
  if (!obj) return [];
  const raw = (obj as Record<string, unknown>)[key];
  const en = Array.isArray(raw) ? raw.map(clean) : [];
  const hiRaw = (obj as { hi?: Record<string, unknown> }).hi?.[key];
  const hi = Array.isArray(hiRaw) ? hiRaw.map(clean) : [];
  return en
    .map((e, i) => ({ en: e, text: lang === "hi" ? hi[i] || e : e || hi[i] || "" }))
    .filter((p) => p.en || p.text);
}

/**
 * A free-text date field in the reader's language: the Hindi twin when the
 * reader chose Hindi and one was written, else `dateIn` of the English (which
 * swaps the month name for a plain "29 August 2026").
 */
export function biDate<T extends object>(obj: T | null | undefined, key: keyof T & string, lang: DemoLang): string {
  if (!obj) return "";
  const hi = clean((obj as { hi?: Record<string, unknown> }).hi?.[key]);
  if (lang === "hi" && hi) return hi;
  return dateIn(clean((obj as Record<string, unknown>)[key]), lang) || hi;
}
