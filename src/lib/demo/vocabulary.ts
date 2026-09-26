/**
 * The words a demo site uses, per market.
 *
 * WHY THIS IS A TABLE AND NOT A SET OF `market === "india" ? …` TERNARIES
 * ----------------------------------------------------------------------
 * A demo site works because the director opens it and thinks "this is our
 * website" before they think anything else. Every word on it is therefore load
 * bearing, and the words that give a foreign page away are never the big ones.
 * Nobody reads "Admissions" and feels anything. An American parent reads
 * "enquiry", "batch", "timetable" and "programme" and knows, without being able
 * to say why, that this was written somewhere else.
 *
 * So the vocabulary is one table, read by both templates, and no page component
 * is allowed to write a word of it inline. Two consequences worth stating:
 *
 *   1. A WORD FIXED HERE IS FIXED EVERYWHERE. "Inquiry" in the hero and
 *      "enquiry" on the button, three screens apart, is exactly the sort of
 *      thing that survives a review and then reads as machine-assembled.
 *   2. THIS IS NOT A TRANSLATION LAYER AND MUST NOT BECOME ONE. The India page
 *      is not the source text. Where a section has to be REWRITTEN for a market
 *      rather than reworded, it is rewritten, in ./international.ts. This file
 *      only carries the words that genuinely are the same sentence in a
 *      different dialect.
 *
 * WHAT DRIVES IT. `market` picks India or abroad; `country` then picks the
 * dialect, because "international" is not one market. British, Emirati and
 * Australian schools share a vocabulary (enquire, term, Year 7, programme); the
 * United States does not share it with any of them. And `kind` picks the last
 * few: a school has teachers, a coaching institute has faculty in India and
 * tutors abroad.
 *
 * SOURCES. British and Australian school usage from the way schools in those
 * countries head their own admissions pages; American usage from the way US
 * private schools and tutoring centres head theirs. Nothing here is a guess
 * about a particular institute, and nothing here is a claim about one: these
 * are common nouns.
 */

import type { DemoSite, DemoKind, DemoMarket } from "@/lib/cms/types";
import type { DemoLang } from "./language";
import { demoMarket } from "./record";

/* ──────────────────────────────────────────────────────────────────────────
 * Which country's English
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The dialects this site can write in.
 *
 * `in` is the India market. `gb` covers the United Kingdom, Ireland, the UAE,
 * Australia, New Zealand and Singapore, which for the purpose of a school page
 * write the same English: enquire, term, Year 9, programme, centre. `us` covers
 * the United States and Canada, which do not.
 *
 * THE GROUPING IS ABOUT SPELLING, NOT ABOUT ANYTHING ELSE. Where the UAE or
 * Australia genuinely differ from Britain, they differ in the SECTIONS rather
 * than in the words, and that is handled in ./international.ts.
 */
export type DemoDialect = "in" | "gb" | "us";

/**
 * Country names that mean the United States or Canada.
 *
 * Matched on a normalised string, so "U.S.A.", "usa" and "United States of
 * America" all land. An unrecognised country on an international record falls
 * back to `gb`, which is the right default for three of the four markets named
 * in _assets/FACTS.md (UK, UAE, Australia) and wrong only for the fourth in a
 * way that is visible the moment somebody reads the page.
 */
const AMERICAN = new Set([
  "us", "usa", "u s a", "united states", "united states of america", "america",
  "canada", "ca",
]);

function normalise(value: string | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Which English this record is written in. */
export function demoDialect(site: Pick<DemoSite, "market" | "country">): DemoDialect {
  if (demoMarket(site) === "india") return "in";
  return AMERICAN.has(normalise(site.country)) ? "us" : "gb";
}

/* ──────────────────────────────────────────────────────────────────────────
 * The table
 * ────────────────────────────────────────────────────────────────────────── */

export interface DemoVocabulary {
  market: DemoMarket;
  dialect: DemoDialect;
  /**
   * Which language these words are written in.
   *
   * Always "en" outside India: the Hindi row exists only for the India market,
   * because a language control on a Manchester school's site is the clearest
   * possible sign the page came off a template. See ./language.ts.
   */
  lang: DemoLang;

  /* ── Actions. These end up on buttons, so they are short. ─────────────── */

  /** The primary action on a school page. "Apply" abroad, "Admission enquiry" in India. */
  applyCta: string;
  /** The verb alone, for running text. "apply" / "take admission". */
  applyVerb: string;
  /** "Enquire" everywhere except the United States, which inquires. */
  enquireVerb: string;
  /** The noun. Appears in "your enquiry reaches us in seconds". */
  enquiryNoun: string;
  enquiryNounPlural: string;
  /** "Enrol" / "Enroll". One l is the British spelling and two is the American one. */
  enrolVerb: string;
  enrolmentNoun: string;

  /* ── Things. ──────────────────────────────────────────────────────────── */

  /** The section heading for how somebody joins. */
  admissionsWord: string;
  /**
   * What a group of students taught together is called.
   *
   * "Batch" is an Indian coaching word and nowhere else. A British tutoring
   * centre runs a class; an American one runs a session. Getting this wrong is
   * the single clearest tell on a coaching demo.
   */
  groupWord: string;
  groupWordPlural: string;
  /** "Class 10" in India, "Grade 10" in the US, "Year 10" in the UK, UAE and Australia. */
  gradeWord: string;
  gradeWordPlural: string;
  /** The heading over the people who teach. Faculty, our teachers, our tutors. */
  teachersWord: string;
  /** The singular, for running text: "every faculty member" / "every tutor". */
  teacherWord: string;
  /** "Timetable" / "Schedule". */
  timetableWord: string;
  /** What a division of the academic year is called. Session, term, semester. */
  termWord: string;
  termWordPlural: string;
  /** What money for teaching is called. Fees, tuition, rates. */
  feeWord: string;
  /** The person in charge, in their own country's word. */
  headWord: string;

  /* ── Spelling that gives the writer away. ─────────────────────────────── */

  programmeWord: string;
  centreWord: string;
  organisationWord: string;
  recognisedWord: string;
  enquiryFormWord: string;
}

/**
 * British and Commonwealth spellings, which is the base.
 *
 * India is a variant of this rather than of American English, so the India row
 * below overrides only what is actually Indian.
 */
const GB_BASE = {
  programmeWord: "programme",
  centreWord: "centre",
  organisationWord: "organisation",
  recognisedWord: "recognised",
  enquireVerb: "Enquire",
  enquiryNoun: "enquiry",
  enquiryNounPlural: "enquiries",
  enrolVerb: "Enrol",
  enrolmentNoun: "enrolment",
  enquiryFormWord: "enquiry form",
};

const US_BASE = {
  programmeWord: "program",
  centreWord: "center",
  organisationWord: "organization",
  recognisedWord: "recognized",
  enquireVerb: "Inquire",
  enquiryNoun: "inquiry",
  enquiryNounPlural: "inquiries",
  enrolVerb: "Enroll",
  enrolmentNoun: "enrollment",
  enquiryFormWord: "inquiry form",
};

/**
 * The vocabulary for one record.
 *
 * `kind` matters for four entries and only four: what the teaching staff are
 * called, what a group of students is called, what money is called, and what
 * the primary action is. A school and a coaching institute in the same country
 * otherwise use the same words, and pretending otherwise produces the kind of
 * artificial difference a reader notices.
 */
export function demoVocabulary(
  site: Pick<DemoSite, "market" | "country" | "kind">,
  /**
   * Hindi is only ever reachable on an India record, and the guard is here
   * rather than at the call sites so that no template can ask for a Hindi
   * heading on a British school and get one.
   */
  lang: DemoLang = "en",
): DemoVocabulary {
  const market = demoMarket(site);
  const dialect = demoDialect(site);
  const kind: DemoKind = site.kind === "school" ? "school" : "coaching";
  const school = kind === "school";

  if (dialect === "in" && lang === "hi") {
    /*
      THE HINDI ROW. Written the way a Delhi parent reads, which is not the way
      a dictionary translates.

      Devanagari carries the Hindi matrix; the English words stay in Latin
      script because they are the words the reader themselves uses out loud:
      admission, class, batch, fees, result, timetable, faculty, session,
      enquiry. "प्रवेश", "शुल्क" and "सत्र" are all correct Hindi and all three
      are wrong here, because a parent scanning a school website for the fee is
      looking for the word "fees".

      The place Devanagari IS the right answer is the verbs, which are
      genuinely Hindi in a parent's head: पूछिए, लीजिए, देखिए. The nouns for
      people and things at a school mostly stay English, including "teacher":
      a parent says "teachers acche hain" and reads शिक्षक only on a
      government notice.
    */
    return {
      market,
      dialect,
      lang,
      programmeWord: "programme",
      centreWord: "centre",
      organisationWord: "संस्था",
      recognisedWord: "मान्यता प्राप्त",
      enquireVerb: "पूछिए",
      enquiryNoun: "enquiry",
      enquiryNounPlural: "enquiries",
      enrolVerb: "Admission लीजिए",
      enrolmentNoun: "admission",
      enquiryFormWord: "enquiry form",
      applyCta: school ? "Admission के लिए पूछिए" : "Batch के बारे में पूछिए",
      applyVerb: "admission लेना",
      admissionsWord: "Admission",
      groupWord: school ? "Section" : "Batch",
      groupWordPlural: school ? "Sections" : "Batches",
      gradeWord: "Class",
      gradeWordPlural: "Classes",
      /* A school's parents say "teachers" and a coaching institute's parents
         say "faculty", both in English, both in the middle of an otherwise
         Hindi sentence, and about the same people. */
      teachersWord: school ? "Teachers" : "Faculty",
      teacherWord: school ? "teacher" : "faculty",
      timetableWord: "Timetable",
      termWord: "Session",
      termWordPlural: "Sessions",
      feeWord: "Fees",
      headWord: school ? "Principal" : "Director",
    };
  }

  if (dialect === "in") {
    return {
      market,
      dialect,
      lang: "en",
      ...GB_BASE,
      /* India writes British English and says "admission" in the singular far
         more often than "admissions", including on the signboard: "Admission
         open". The plural is kept for the section heading, which is a heading
         and not a sentence. */
      applyCta: school ? "Admission enquiry" : "Enquire about a batch",
      applyVerb: "take admission",
      admissionsWord: "Admissions",
      /* The word the whole Indian coaching market runs on. A school does not
         use it: a school has sections. */
      groupWord: school ? "Section" : "Batch",
      groupWordPlural: school ? "Sections" : "Batches",
      gradeWord: "Class",
      gradeWordPlural: "Classes",
      /* "Faculty" is standard in India for both, and a coaching institute in
         particular sells its faculty by name. */
      teachersWord: "Faculty",
      teacherWord: "faculty member",
      timetableWord: "Timetable",
      termWord: "Session",
      termWordPlural: "Sessions",
      feeWord: "Fees",
      headWord: school ? "Principal" : "Director",
    };
  }

  if (dialect === "us") {
    return {
      market,
      dialect,
      lang: "en",
      ...US_BASE,
      applyCta: school ? "Start an application" : "Book a first session",
      applyVerb: "apply",
      admissionsWord: "Admissions",
      /* An American tutoring centre sells sessions, not batches and not
         courses of study. A school has classes. */
      groupWord: school ? "Class" : "Session",
      groupWordPlural: school ? "Classes" : "Sessions",
      gradeWord: "Grade",
      gradeWordPlural: "Grades",
      teachersWord: school ? "Our teachers" : "Our tutors",
      teacherWord: school ? "teacher" : "tutor",
      timetableWord: "Schedule",
      termWord: "Semester",
      termWordPlural: "Semesters",
      /* A US private school charges tuition. A tutoring centre quotes rates,
         usually by the hour, and calling that "tuition" reads as a school. */
      feeWord: school ? "Tuition" : "Rates",
      headWord: school ? "Head of School" : "Director",
    };
  }

  /* gb: the United Kingdom, Ireland, the UAE, Australia, New Zealand,
     Singapore. One vocabulary, because on a school page these write the same
     English. Where they genuinely differ it is a section, not a word: see
     ./international.ts. */
  return {
    market,
    dialect,
    lang: "en",
    ...GB_BASE,
    applyCta: school ? "Apply for a place" : "Book a free assessment",
    applyVerb: "apply",
    admissionsWord: "Admissions",
    groupWord: school ? "Class" : "Class",
    groupWordPlural: school ? "Classes" : "Classes",
    gradeWord: "Year",
    gradeWordPlural: "Year groups",
    teachersWord: school ? "Our teachers" : "Our tutors",
    teacherWord: school ? "teacher" : "tutor",
    timetableWord: "Timetable",
    termWord: "Term",
    termWordPlural: "Terms",
    feeWord: school ? "Fees" : "Rates",
    headWord: school ? "Headteacher" : "Centre Manager",
  };
}

/**
 * Lower-case the first letter of a vocabulary entry for use mid-sentence.
 *
 * The table stores the form that appears on a button or in a heading, because
 * that is where most of these are read. `lower(v.enquireVerb)` is what running
 * text wants, and doing it here rather than with a CSS transform keeps the
 * string correct when it is copied, printed or read aloud by a screen reader.
 */
export function lower(word: string): string {
  return word ? word.charAt(0).toLowerCase() + word.slice(1) : word;
}
