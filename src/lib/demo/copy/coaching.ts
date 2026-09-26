/**
 * EVERY WORD THE COACHING TEMPLATE SAYS IN ITS OWN VOICE, IN BOTH LANGUAGES.
 *
 * The twin of ./school.ts, and the same three rules apply.
 *
 *   1. ONLY STRUCTURAL COPY. Headings, labels, buttons, navigation, the empty
 *      states, and the handful of sentences of ours that explain what the live
 *      site would do.
 *
 *   2. NOT ONE WORD THE INSTITUTE TYPED. Course names, batch timings, results,
 *      faculty names, notices, the about paragraph and every figure are printed
 *      exactly as they arrived. Switching to Hindi never rewrites a claim an
 *      institute made about itself, for the same reason nothing here invents a
 *      phone number.
 *
 *   3. THE ENGLISH BRANCH IS THE EXISTING COPY. It draws its headings from
 *      ../international.ts and its blanks from ../coaching/copy.ts rather than
 *      restating them, so those files remain the one source for English.
 *
 * ── ONE THING THE HINDI BRANCH DELIBERATELY DROPS ─────────────────────────
 * `accent` is the serif italic the page allows itself exactly twice. In Hindi
 * it is empty, and the template renders the word plain. Devanagari has no
 * italic: a browser asked for one synthesises an oblique by shearing the
 * glyphs, which breaks the head-line every Devanagari letter hangs from and
 * reads as a rendering fault rather than as emphasis. The page keeps its two
 * accents in English and gives them up in Hindi, which is the correct trade.
 */

import type { DemoSite } from "@/lib/cms/types";
import type { DemoVocabulary } from "../vocabulary";
import { lower } from "../vocabulary";
import type { DemoLang } from "../language";
import { demoSectionHeading, type DemoSectionId } from "../international";
import { coachingPlaceholders, type CoachingPlaceholders } from "../coaching/copy";
import type { CoachingSectionId } from "../coachingThemes";

export interface CoachingCopy {
  lang: DemoLang;

  /* ── Chrome ───────────────────────────────────────────────────────────── */
  skipTo: (heading: string) => string;
  navLabel: string;
  footerNavLabel: string;
  openMenu: string;
  closeMenu: string;

  /** What each section is called in its heading and in the footer. */
  heading: Record<CoachingSectionId, string>;
  /**
   * What each section is called in the STICKY NAV, which has one line and
   * five slots. "Results and selections" set twice over in a 64px header is
   * what made the old header 93px tall; Brighton College's whole nav is four
   * single words. One word each, two at most.
   */
  navShort: Record<CoachingSectionId | "questions" | "where", string>;

  /* ── Hero ─────────────────────────────────────────────────────────────── */
  seeCourses: string;
  trialCta: string;
  /** Prefilled into WhatsApp, so it is written the way a parent would type it. */
  trialMessage: (institute: string) => string;
  contactMessage: (institute: string) => string;
  courseMessage: (institute: string, course: string) => string;
  taglineTail: { before: string; accent: string; after: string };
  /** `next` labels the earliest start date on any batch: the most-asked question. */
  heroFact: { focus: string; groups: string; since: string; where: string; next: string };
  heroBlank: { groups: string; since: string; where: string };

  /* ── Courses ──────────────────────────────────────────────────────────── */
  /** The batches section's H2. Short, a chooser (MyTutor: "Pick a subject to get started"). */
  coursesHeadline: string;
  coursesLead: string;
  courseFact: { duration: string; timings: string; starts: string; fee: string };
  courseBlank: { duration: string; level: string };
  enquireCta: string;
  reservedCourseName: string;
  toBeAdded: string;

  /* ── Results ──────────────────────────────────────────────────────────── */
  resultColumns: { label: string; hint: string }[];
  nameWithheld: string;

  /* ── Faculty ──────────────────────────────────────────────────────────── */
  facultyLead: string;
  facultyColumns: string[];
  facultyBlank: { name: string; subject: string; qualification: string };

  /* ── The demo class ───────────────────────────────────────────────────── */
  trialFact: { duration: string; bring: string; book: string };
  trialBlank: { duration: string; bring: string };
  trialTail: { before: string; accent: string; after: string };

  /* ── Timetable ────────────────────────────────────────────────────────── */
  scheduleColumns: string[];
  scheduleCaption: (heading: string, institute: string) => string;
  emptyCell: string;

  /* ── About ────────────────────────────────────────────────────────────── */
  labelSince: string;
  labelAffiliation: string;

  /* ── Contact and the form ─────────────────────────────────────────────── */
  labelPhone: string;
  labelWhatsapp: string;
  labelEmail: string;
  labelHours: string;
  labelAddress: string;
  openInMaps: string;
  formTitle: string;
  formNote: (institute: string) => string;
  fieldName: string;
  fieldPhone: string;
  fieldCourse: string;
  fieldMessage: string;
  formSubmit: string;
  formWhatsapp: string;
  formSent: (institute: string) => string;

  /* ── The hero headline, which is a sentence and not a name ────────────── */
  /**
   * The hero says the true thing loud: the exams, then this word, then the
   * city. "JEE and NEET COACHING in Patna". `heroVerb` is the one word in the
   * headline that carries the serif italic accent, and it is OUR word rather
   * than the institute's, which is why it may be restyled at all.
   */
  heroVerb: string;
  heroIn: string;
  /** Joins a list of exams: "JEE, NEET and Foundation". */
  heroAnd: string;
  /** The board panel in the hero's second column, and its link out. */
  boardTitle: string;
  seeAllBatches: string;
  /** The second column when there are no batches: three true rows. */
  askUsTitle: string;

  /* ── The label that survives a screenshot ─────────────────────────────── */
  exampleTag: string;
  exampleFooterNote: string;

  /* ── The thin band under the hero ─────────────────────────────────────── */
  bandLine: string;
  bandCta: string;

  /* ── The batch row ────────────────────────────────────────────────────── */
  batchColumns: { batch: string; who: string; when: string; starts: string; fee: string };
  modeLabel: string;
  seatsLabel: string;

  /* ── Fees, as one heading and never a table ───────────────────────────── */
  /**
   * "Batches" + "from" + the figure, where the second word takes the serif
   * accent. `after` follows the figure and its period note, because Hindi
   * puts "from" AFTER the amount: "Batches ₹3,500 a month से शुरू". Empty in
   * English.
   */
  feesFrom: { before: string; accent: string; after: string };
  feesAsk: string;

  /* ── Results, four fields and no more ─────────────────────────────────── */
  resultFields: { exam: string; student: string; batch: string };

  /* ── The demo class, as three verbs ───────────────────────────────────── */
  trialSteps: string[];

  /* ── Questions ────────────────────────────────────────────────────────── */
  faqHeading: string;
  faqLead: string;

  /* ── The closing enquiry, framed as a question ────────────────────────── */
  enquireTitle: { first: string; second: string };
  enquireLead: string;
  callUs: string;

  /* ── Where we are ─────────────────────────────────────────────────────── */
  contactHeading: string;
  /** ONE sentence for a contact block that is entirely empty, never five. */
  contactBlank: string;

  /* ── Notices ──────────────────────────────────────────────────────────── */
  pinned: string;

  /* ── Footer ───────────────────────────────────────────────────────────── */
  footerSections: string;
  footerTimetable: string;
  backToTop: string;

  /** The reserved slots, keyed exactly as ../coaching/copy.ts keys them. */
  ph: CoachingPlaceholders;
}

/**
 * The copy for one record, in one language.
 *
 * `v` must already be the vocabulary for `lang`: `demoVocabulary(site, lang)`.
 */
export function coachingCopy(site: DemoSite, lang: DemoLang, v: DemoVocabulary): CoachingCopy {
  return lang === "hi" ? hindi() : english(site, v);
}

/* ──────────────────────────────────────────────────────────────────────────
 * English
 * ────────────────────────────────────────────────────────────────────────── */

function english(site: DemoSite, v: DemoVocabulary): CoachingCopy {
  const ph = coachingPlaceholders(site);
  const intl = v.market === "international";
  const head = (id: DemoSectionId) => demoSectionHeading(id, v, "coaching");

  return {
    lang: "en",

    skipTo: (heading) => `Skip to ${lower(heading)}`,
    navLabel: "Sections",
    footerNavLabel: "Footer",
    openMenu: "Open the menu",
    closeMenu: "Close the menu",

    heading: {
      courses: head("courses"),
      fees: head("fees"),
      results: head("results"),
      faculty: head("faculty"),
      /* NOT `head("method")`, which answers "How we teach" in India. Mathnasium
         frames the same three blocks as parent anxieties rather than as
         teaching features, and the heading has to agree with the blocks under
         it. The shared table is left alone because the school template reads
         the same ids. */
      method: intl ? "Why parents choose us" : "Why parents choose us",
      trial: head("trial"),
      schedule: intl ? head("schedule") : "What a week looks like",
      about: head("about"),
      notices: "Notices",
    },
    navShort: {
      courses: v.groupWordPlural,
      fees: v.feeWord,
      results: "Results",
      faculty: intl ? "Tutors" : v.teachersWord,
      schedule: v.timetableWord,
      method: "Why us",
      trial: intl ? "First session" : "Demo class",
      notices: "Notices",
      about: "About",
      questions: "Questions",
      where: "Contact",
    },

    seeCourses: intl ? "See subjects and times" : `See ${lower(v.groupWordPlural)}`,
    trialCta: intl ? "Book a first session" : "Book a demo class",
    trialMessage: (institute) =>
      intl
        ? `Hello ${institute}. I would like to book a first session.`
        : `Hello ${institute}. Mujhe demo class book karni hai.`,
    contactMessage: (institute) => `Hello ${institute}.`,
    courseMessage: (institute, course) =>
      `Hello ${institute}. I want to know about the ${course} ${lower(v.groupWord)}.`,
    taglineTail: {
      before: "One line, the one on your board, is ",
      accent: "enough",
      after: ".",
    },
    heroFact: {
      focus: intl ? "Subjects" : "We prepare for",
      groups: intl ? "Sessions" : lower(v.groupWordPlural),
      since: "Since",
      where: "Where",
      next: intl ? "Next start" : `Next ${lower(v.groupWord)}`,
    },
    heroBlank: {
      groups: `Your ${lower(v.groupWordPlural)} go here`,
      since: "Add the year you started",
      where: "Add your city",
    },

    coursesHeadline: intl ? "Pick a subject." : `Find your ${lower(v.groupWord)}.`,
    coursesLead: intl
      ? "Every subject, when it runs and what it costs, on this page. Nothing to download."
      : `Every ${lower(v.groupWord)}, its timings and its ${lower(v.feeWord)}, on this page. No PDF to download.`,
    courseFact: {
      duration: "Duration",
      timings: "Timings",
      starts: intl ? "Availability" : "Starts",
      fee: v.feeWord,
    },
    courseBlank: {
      duration: "To be added",
      level: `Who it is for, e.g. ${v.gradeWord} 11 to 12`,
    },
    enquireCta: v.enquireVerb,
    reservedCourseName: "Your course name",
    toBeAdded: "to be added",

    resultColumns: [
      { label: intl ? "The outcome" : "Rank or score", hint: "exactly as you publish it" },
      { label: "Student", hint: "only with their consent" },
      { label: "Exam and year", hint: "e.g. JEE Advanced 2025" },
    ],
    nameWithheld: "Name withheld",

    facultyLead: `Who actually takes the ${lower(v.groupWordPlural)}.`,
    facultyColumns: ["Name", "Subject", "Qualification"],
    facultyBlank: {
      name: "Name to be added",
      subject: "Subject to be added",
      qualification: "Qualification to be added",
    },

    trialFact: { duration: "How long", bring: "What to bring", book: "How to book" },
    trialBlank: { duration: "Add how long it runs", bring: "Add what to bring" },
    trialTail: {
      before: "This section is ",
      accent: "yours",
      after:
        " to fill. It is the one that converts, so it is worth a sentence you would actually say out loud.",
    },

    scheduleColumns: [v.groupWord, "Days", "Time", "Subject", v.teachersWord],
    scheduleCaption: (heading, institute) => `${heading} for ${institute}`,
    emptyCell: "–",

    labelSince: "Since",
    labelAffiliation: intl ? "Accreditation" : "Affiliation",

    labelPhone: "Phone",
    labelWhatsapp: "WhatsApp",
    labelEmail: "Email",
    labelHours: "Hours",
    labelAddress: "Address",
    openInMaps: "Open in Maps",
    formTitle: `${v.enquireVerb} about a ${lower(v.groupWord)}`,
    formNote: (institute) =>
      `This form is part of the demonstration and does not send anything yet. On the live site it reaches ${institute} on WhatsApp and by email within seconds of a parent pressing send.`,
    fieldName: "Student's name",
    fieldPhone: "Phone",
    fieldCourse: `Which ${lower(v.groupWord)}`,
    fieldMessage: "Anything else",
    formSubmit: `Send the ${lower(v.enquiryNoun)}`,
    formWhatsapp: "Or message on WhatsApp",
    formSent: (institute) =>
      `Nothing was sent, because this is a demonstration. On the live site this ${lower(v.enquiryNoun)} would already be on ${institute}'s phone.`,

    heroVerb: intl ? "tuition" : "coaching",
    heroIn: " in ",
    heroAnd: " and ",
    boardTitle: intl ? "Next sessions" : `The next ${lower(v.groupWordPlural)}`,
    seeAllBatches: intl ? "See every subject" : `See all ${lower(v.groupWordPlural)}`,
    askUsTitle: "Ask us",

    exampleTag: "Example figures",
    exampleFooterNote:
      "Every name, number, date and fee on this page is example content placed by Ideovent to show how the page is set. None of it belongs to a real institute.",

    bandLine: intl
      ? "Sit in on a real session before you pay for anything."
      : "Sit in on a real class before you pay anything.",
    bandCta: intl ? "Book a first session" : "Book a demo class",

    batchColumns: {
      batch: intl ? "Subject" : v.groupWord,
      who: intl ? "Who it is for" : "Class",
      when: "Days and time",
      starts: intl ? "Availability" : "Starts",
      fee: v.feeWord,
    },
    modeLabel: "Mode",
    seatsLabel: intl ? "Group size" : "Seats",

    feesFrom: { before: `${v.groupWordPlural} `, accent: "from", after: "" },
    feesAsk: `The full answer is in the questions below, and on the phone in a minute.`,

    resultFields: {
      exam: "Exam and year",
      student: "Student",
      batch: intl ? "Programme" : v.groupWord,
    },

    trialSteps: intl
      ? ["Call or message us", "We tell you which session has a free place", "Sit in on the whole session"]
      : ["Call or send a WhatsApp message", "We tell you which class has a free seat", "Sit in on the whole class"],

    faqHeading: "Questions",
    faqLead: intl
      ? "The ones parents ask on the phone, answered in the same words."
      : `The questions parents ask on the phone, including the ${lower(v.feeWord)} one.`,

    enquireTitle: {
      first: intl ? "Not sure which is right?" : "Not sure which batch?",
      second: "Ask us. It takes a minute.",
    },
    enquireLead: intl
      ? "Call, or send one message. We answer during centre hours and we do not put you on a list."
      : "Call, or send one WhatsApp message. We answer during office hours and nobody is put on a calling list.",
    callUs: "Call",

    contactHeading: intl ? "Where we are" : "Where we are",
    contactBlank: `Your phone number, WhatsApp, address and ${lower(v.centreWord)} hours go here. Send them once and they appear everywhere on the page that needs them.`,

    pinned: "Pinned",

    footerSections: "On this site",
    footerTimetable: `${v.timetableWord} on this page, not in a download`,
    backToTop: "Back to the top",

    ph,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hindi, as a parent reads it
 * ────────────────────────────────────────────────────────────────────────── */

function hindi(): CoachingCopy {
  return {
    lang: "hi",

    skipTo: (heading) => `सीधे ${heading} पर जाइए`,
    /* A screen reader announces these, in the Hindi voice the page asked for,
       so they are Hindi like the school template's, not the English pair. */
    navLabel: "इस वेबसाइट के सेक्शन",
    footerNavLabel: "नीचे के लिंक",
    openMenu: "मेन्यू खोलिए",
    closeMenu: "मेन्यू बंद कीजिए",

    heading: {
      courses: "कोर्स और बैच",
      fees: "Fees",
      results: "रिज़ल्ट और सिलेक्शन",
      faculty: "Faculty",
      method: "पैरेंट्स हमें क्यों चुनते हैं",
      trial: "Free demo class",
      /* Not "कैसा दिखता है", which is "what it looks like" run through a
         dictionary. A timetable is something a week DOES. */
      schedule: "एक हफ़्ता ऐसे चलता है",
      about: "हमारे बारे में",
      notices: "सूचनाएँ",
    },
    navShort: {
      courses: "Batches",
      fees: "Fees",
      results: "Results",
      faculty: "Faculty",
      schedule: "Timetable",
      /* The idiom is "हम ही क्यों" ("why us, of all people"); "हम क्यों" on
         its own reads as a sentence cut off. */
      method: "हम ही क्यों",
      trial: "Demo class",
      notices: "सूचनाएँ",
      about: "हमारे बारे में",
      questions: "सवाल",
      where: "संपर्क",
    },

    seeCourses: "बैच देखिए",
    trialCta: "डेमो क्लास बुक कीजिए",
    trialMessage: (institute) => `नमस्ते ${institute}। मुझे डेमो क्लास बुक करनी है।`,
    contactMessage: (institute) => `नमस्ते ${institute}।`,
    courseMessage: (institute, course) =>
      `नमस्ते ${institute}। मुझे ${course} बैच के बारे में जानना है।`,
    /* No serif italic in Devanagari. See the note at the top of this file. */
    taglineTail: {
      before: "एक लाइन, वही जो आपके बोर्ड पर लिखी है, काफ़ी है।",
      accent: "",
      after: "",
    },
    heroFact: {
      focus: "किसकी तैयारी",
      groups: "Batches",
      /* "स्थापना", as on the signboard, not "कब से": the page already says
         "कब से" for when a batch STARTS, and the template also prints this
         label in front of a bare year, where "कब से 2011" is not Hindi and
         "स्थापना 2011" is what the board over the door says. */
      since: "स्थापना",
      where: "कहाँ",
      next: "अगली बैच",
    },
    heroBlank: {
      groups: "आपकी बैच यहाँ आएँगी",
      since: "जिस साल शुरू किया, वह जोड़िए",
      where: "अपना शहर जोड़िए",
    },

    coursesHeadline: "अपनी बैच चुनिए।",
    coursesLead: "हर बैच, उसकी टाइमिंग और फीस, इसी पेज पर। कोई PDF डाउनलोड नहीं करनी।",
    /* "Duration" and "mode" stay English: "अवधि" is a word a parent reads on
       a fixed-deposit slip, and nobody says "online अवधि". */
    courseFact: { duration: "अवधि", timings: "टाइमिंग", starts: "कब से", fee: "फीस" },
    courseBlank: {
      duration: "जोड़ना बाक़ी",
      level: "किसके लिए है, जैसे क्लास 11 से 12",
    },
    enquireCta: "पूछिए",
    reservedCourseName: "आपके कोर्स का नाम",
    toBeAdded: "जोड़ना बाक़ी",

    resultColumns: [
      { label: "रैंक या स्कोर", hint: "ठीक वैसे ही जैसे आप छापते हैं" },
      { label: "छात्र", hint: "सिर्फ़ उनकी अनुमति से" },
      { label: "एग्ज़ाम और साल", hint: "जैसे JEE Advanced 2025" },
    ],
    nameWithheld: "नाम नहीं दिया गया",

    facultyLead: "बैच असल में कौन लेता है।",
    facultyColumns: ["नाम", "विषय", "योग्यता"],
    facultyBlank: {
      name: "नाम जोड़ना बाक़ी",
      subject: "विषय जोड़ना बाक़ी",
      qualification: "योग्यता जोड़ना बाक़ी",
    },

    trialFact: { duration: "कितनी देर", bring: "क्या लाना है", book: "कैसे बुक करें" },
    trialBlank: {
      duration: "कितनी देर चलती है, यह जोड़िए",
      bring: "क्या लाना है, यह जोड़िए",
    },
    trialTail: {
      before:
        "यह हिस्सा आपका है। सबसे ज़्यादा एडमिशन यहीं से आते हैं, इसलिए वही लाइन लिखिए जो आप सचमुच बोलते हैं।",
      accent: "",
      after: "",
    },

    scheduleColumns: ["बैच", "दिन", "समय", "विषय", "फैकल्टी"],
    scheduleCaption: (heading, institute) => `${institute} का ${heading}`,
    emptyCell: "–",

    labelSince: "स्थापना",
    labelAffiliation: "Affiliation",

    labelPhone: "फ़ोन",
    labelWhatsapp: "WhatsApp",
    labelEmail: "Email",
    labelHours: "समय",
    labelAddress: "पता",
    openInMaps: "मैप में खोलिए",
    formTitle: "बैच के बारे में पूछिए",
    formNote: (institute) =>
      `यह फ़ॉर्म अभी सिर्फ़ डेमो के लिए है और कुछ भेजता नहीं। लाइव वेबसाइट पर पैरेंट के सेंड दबाते ही यह कुछ ही सेकंड में WhatsApp और ईमेल से ${institute} तक पहुँच जाता है।`,
    fieldName: "छात्र का नाम",
    fieldPhone: "फ़ोन नंबर",
    fieldCourse: "कौन सी बैच",
    fieldMessage: "और कुछ कहना हो तो",
    formSubmit: "पूछताछ भेजिए",
    formWhatsapp: "या WhatsApp पर मैसेज कीजिए",
    formSent: (institute) =>
      `कुछ भेजा नहीं गया, क्योंकि यह सिर्फ़ डेमो है। लाइव वेबसाइट पर यह पूछताछ अब तक ${institute} के फ़ोन पर पहुँच चुकी होती।`,

    /* Devanagari has no italic, so `heroVerb` is set plain by the template
       here. The word is still ours and still the hinge of the headline; it
       simply does not take the serif. See the note at the top of this file. */
    heroVerb: "coaching",
    heroIn: ", ",
    heroAnd: " और ",
    boardTitle: "अगली बैच",
    seeAllBatches: "सारी बैच देखिए",
    askUsTitle: "हमसे पूछिए",

    exampleTag: "उदाहरण के आँकड़े",
    exampleFooterNote:
      "इस पेज का हर नाम, आँकड़ा, तारीख़ और फीस उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि पेज कैसा बनता है। इनमें से कुछ भी किसी असली संस्थान का नहीं है।",

    bandLine: "फीस देने से पहले एक असली क्लास में बैठकर देख लीजिए।",
    bandCta: "डेमो क्लास बुक कीजिए",

    batchColumns: {
      batch: "Batch",
      who: "किस क्लास के लिए",
      when: "दिन और समय",
      starts: "कब से",
      fee: "Fees",
    },
    modeLabel: "Mode",
    seatsLabel: "Seats",

    /* Hindi puts "from" after the amount, so the accent slot is empty and the
       sense moves to `after`: "Batches ₹3,500 a month से शुरू", which is how
       a parent says it out loud ("fees 3,500 a month se shuru hai"). The
       period note in the middle is the institute's own text and stays in
       whatever language they typed it. */
    feesFrom: { before: "बैच ", accent: "", after: " से शुरू" },
    feesAsk: "पूरा जवाब नीचे सवालों में है, और फ़ोन पर एक मिनट में।",

    resultFields: { exam: "एग्ज़ाम और साल", student: "छात्र", batch: "बैच" },

    trialSteps: [
      "कॉल कीजिए या WhatsApp पर मैसेज भेजिए",
      "हम बताएँगे कि इस हफ़्ते किस क्लास में सीट है",
      "पूरी क्लास में बैठिए",
    ],

    faqHeading: "सवाल",
    faqLead: "वही सवाल जो पैरेंट्स फ़ोन पर पूछते हैं, फीस वाला भी।",

    enquireTitle: { first: "कौन सी बैच सही रहेगी?", second: "पूछ लीजिए, एक मिनट लगेगा।" },
    enquireLead:
      "कॉल कीजिए, या एक WhatsApp मैसेज भेजिए। ऑफ़िस के समय में जवाब मिलता है और किसी को कॉलिंग लिस्ट में नहीं डाला जाता।",
    callUs: "Call",

    contactHeading: "हम कहाँ हैं",
    contactBlank:
      "आपका फ़ोन नंबर, WhatsApp, पता और ऑफ़िस के समय यहाँ आएँगे। एक बार भेज दीजिए, पेज पर जहाँ-जहाँ चाहिए वहाँ अपने आप लग जाएँगे।",

    /* The chip on a pinned notice. What a school writes on the one notice it
       wants read first is "ज़रूरी सूचना", so the chip says the first word. */
    pinned: "ज़रूरी",

    footerSections: "इस वेबसाइट पर",
    footerTimetable: "टाइम-टेबल इसी पेज पर, किसी डाउनलोड में नहीं",
    backToTop: "ऊपर जाइए",

    ph: {
      tagline: "अपनी एक लाइन यहाँ जोड़िए: आप क्या पढ़ाते हैं, और किसे पढ़ाते हैं।",
      focus: "आप जिन एग्ज़ाम की तैयारी कराते हैं, वे जोड़िए: JEE, NEET, CUET, बैंकिंग",

      coursesTitle: "आपकी बैच यहाँ आएँगी",
      coursesBody:
        "हर कोर्स के लिए एक लाइन: लेवल, अवधि, टाइमिंग, बैच की शुरुआत की तारीख़ और फीस। आप लिस्ट भेज दीजिए, हम इसे ऐसे सजाएँगे कि छात्र फ़ोन पर पढ़ ले और Google भी उसका एक-एक शब्द पढ़ सके। कोई PDF नहीं।",

      courseFee: "फीस पूछने पर",
      courseTimings: "टाइमिंग जोड़ना बाक़ी",
      courseStarts: "अगली बैच की तारीख़ जोड़ना बाक़ी",

      resultsTitle: `अपने ${new Date().getFullYear()} के रिज़ल्ट यहाँ जोड़िए`,
      resultsBody:
        "रैंक, स्कोर, सिलेक्शन और नाम, ठीक वैसे ही जैसे आप ख़ुद छापते हैं। हमने अपनी तरफ़ से एक भी आँकड़ा नहीं डाला: आपके नाम वाले पेज पर गढ़ा हुआ रैंक देखकर पैरेंट फ़ैसला कर लेते हैं, और जवाब आपको देना पड़ता है।",
      resultsNote:
        "छात्र की फ़ोटो तभी लगेगी जब आपके पास उनकी अनुमति हो। हम मान नहीं लेंगे, आपसे पूछेंगे।",

      facultyTitle: "आपकी फैकल्टी यहाँ आएगी",
      facultyBody:
        "हर फैकल्टी सदस्य का नाम, विषय और योग्यता। कोचिंग में पैरेंट सबसे ध्यान से यही हिस्सा पढ़ते हैं, इसलिए यह आपसे लेना सही है, अनजान लोगों की स्टॉक फ़ोटो से भरना नहीं।",

      methodTitle: "छात्र क्यों टिके रहते हैं, आपके अपने शब्दों में",
      methodBody:
        "तीन-चार बातें जो आप सचमुच अलग करते हैं: बैच का साइज़, टेस्ट साइकिल, डाउट सेशन, और कमज़ोर छात्र को जल्दी पकड़ने का तरीक़ा। ये आप ही लिखिए, क्योंकि अपनी पढ़ाई के बारे में दावा आप ही कर सकते हैं।",

      trialTitle: "Free demo class",
      trialBody:
        "डेमो क्लास में क्या होता है, कितनी देर चलती है और छात्र उसे कैसे बुक करे, यह जोड़िए। वेबसाइट पर कुछ भी पढ़कर, फीस भी, उतने एडमिशन नहीं होते जितने एक डेमो क्लास के बाद होते हैं।",
      trialHowTo: "बुक करने का तरीक़ा जोड़िए: कॉल, WhatsApp मैसेज, या सीधे आ जाना।",

      scheduleTitle: "आपका टाइम-टेबल यहाँ आएगा",
      scheduleBody:
        "कौन सी बैच किस दिन, किस समय और किस फैकल्टी के साथ चलती है। फ़ोन पर देख रहे छात्र को अपनी लाइन क़रीब तीन सेकंड में मिल जानी चाहिए।",

      noticesTitle: "सूचनाएँ, जो आप ख़ुद डालते हैं",
      noticesBody:
        "नई बैच, टेस्ट की तारीख़, छुट्टी, रिज़ल्ट। आप टाइप कीजिए और वह लाइव: न डेवलपर, न दो लाइन बदलने का बिल।",

      aboutTitle: "आपके बारे में, आपके अपने शब्दों में",
      aboutBody:
        "दो-तीन लाइनें: आपने कब शुरू किया, क्या करना चाहा, और शहर में किस बात के लिए जाने जाते हैं। आपकी तरफ़ से पैराग्राफ़ गढ़ने के बजाय हमने इसे ख़ाली छोड़ा है।",

      phone: "आपका एडमिशन हेल्पलाइन नंबर यहाँ आएगा",
      whatsapp: "आपका WhatsApp नंबर यहाँ आएगा",
      email: "आपका पूछताछ ईमेल यहाँ आएगा",
      address: "आपका पता यहाँ आएगा",
      hours: "आपके ऑफ़िस के समय यहाँ आएँगे",

      /* The 2026 rebuild's blanks. "शुल्क" is correct Hindi for a fee and is
         the wrong word here: a parent scanning a coaching site is looking for
         "fees", in English, and will not stop on anything else. */
      feesTitle: "आपकी फीस यहाँ आएगी",
      feesBody:
        "एक रकम, उसके साथ “से शुरू”, और एक लाइन कि उसमें क्या-क्या शामिल है। न कोई टेबल, न तीन प्राइस कार्ड: वह बात फ़ोन पर होती है, और पूरा जवाब नीचे सवालों में रहता है।",

      faqTitle: "जो सवाल रोज़ पूछे जाते हैं",
      faqBody:
        "आठ सवाल, उन्हीं शब्दों में जो पैरेंट फ़ोन पर बोलते हैं। जिनके जवाब आप रोज़ देते हैं, वही लिस्ट भेज दीजिए। फीस वाला सवाल भी उसी में रहेगा, क्योंकि पैरेंट उसे वहीं ढूँढते हैं।",

      boardTitle: "अगली बैच",
      boardBody:
        "जो चार बैच सबसे पहले शुरू हो रही हैं, वे यहाँ रहती हैं, तारीख़ और टाइमिंग के साथ। पैरेंट सबसे पहले यही देखते हैं, और ज़्यादातर वेबसाइटें इसे किसी PDF में रखती हैं।",

      nextBatch: "अगली बैच की तारीख़ जोड़ना बाक़ी",
      established: "जिस साल शुरू किया, वह जोड़िए",

      remainderTitle: "हमें आपसे बस इतना चाहिए",
      remainderBody:
        "इस पेज पर बाक़ी सब कुछ आपका ही है। ये कुछ चीज़ें अभी हमें नहीं मिलीं, इसलिए पूरे पेज में बिखेरने के बजाय एक ही जगह लिख दी हैं।",
    },
  };
}
