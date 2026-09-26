/**
 * EVERY WORD THE SCHOOL TEMPLATE SAYS IN ITS OWN VOICE, IN BOTH LANGUAGES.
 *
 * The template reads one object. Nothing in `src/pages/demo/DemoSchool.tsx`
 * writes a user-visible sentence inline, for the same reason ../vocabulary.ts
 * exists: a heading fixed in one language and forgotten in the other is
 * exactly the defect a director spots and cannot name.
 *
 * ── WHAT IS IN HERE AND WHAT IS NOT ───────────────────────────────────────
 * IN: section headings, eyebrow labels, field labels, buttons, navigation,
 * the empty states, and the two or three sentences of ours that explain what
 * the live site would do. All of it is copy WE wrote and can stand behind in
 * both languages.
 *
 * NOT IN, AND NEVER: one word the institute typed. Their tagline, their about
 * paragraph, their principal's message, their notices, their course names,
 * their dates and every figure on the page come straight off the record in the
 * language they were written in. Switching to Hindi does not machine-translate
 * a principal's message, because a message the head did not write, printed over
 * the head's name in a language they did not choose, is the same class of
 * mistake as inventing their phone number.
 *
 * ── THE ENGLISH BRANCH DRAWS ON THE SHARED TABLES ─────────────────────────
 * It takes the section labels and the blanks from ../school.ts and
 * ../placeholders.ts rather than restating them, so those files stay the one
 * source for English and this file cannot drift from them. The blank copy in
 * placeholders.ts is good and is kept: the defect in the old build was never
 * the words, it was the dashed box and the underline around them.
 *
 * ── HOW THE HINDI IS WRITTEN ──────────────────────────────────────────────
 * Devanagari for the Hindi matrix, Latin script for the words a Delhi parent
 * says in English even mid-sentence: admission, class, fees, form, website,
 * online, email, WhatsApp, Principal, campus, result. "प्रवेश प्रक्रिया" is
 * correct Hindi and is wrong here. Short declarative sentences, second person
 * in the blanks, because the blanks are addressed to the director and they are
 * the list of what the director sends back.
 *
 * ── THE TWO-PART HEADINGS ─────────────────────────────────────────────────
 * Where a heading carries the serif italic accent, it is stored as three
 * parts (before, accent, after) so the template can wrap exactly one phrase
 * and never guess at a word boundary in either script. The accent is used
 * exactly twice on the page: once in the hero, on the phrase the school
 * marked in its own tagline, and once here, in the visit band's heading.
 */

import type { DemoLang } from "../language";
import type { DemoVocabulary } from "../vocabulary";
import { lower } from "../vocabulary";
import { DEMO_BLANK, demoBlanks } from "../placeholders";
import { SECTION_LABEL, SECTION_NAV_LABEL } from "../school";
import type { DemoSchoolSectionId } from "../schoolThemes";

/** A heading with one accented phrase. Any part may be empty. */
export interface AccentedTitle {
  before: string;
  accent: string;
  after: string;
}

/** The blanks, keyed exactly as ../placeholders.ts keys them, plus three. */
export interface SchoolBlanks {
  tagline: string;
  about: string;
  established: string;
  principalName: string;
  principalMessage: string;
  admissionsDates: string;
  admissionsSteps: string;
  admissionsDocuments: string;
  courses: string;
  faculty: string;
  facilities: string;
  gallery: string;
  notices: string;
  results: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  map: string;
  /** Market-shaped, from `demoBlanks`. */
  board: string;
  admissions: string;
  /** The one sentence the contact section prints when it has nothing at all. */
  contactAll: string;
}

export interface SchoolCopy {
  lang: DemoLang;

  /* ── Chrome ───────────────────────────────────────────────────────────── */
  skipToMain: string;
  navLabel: string;
  openMenu: string;
  closeMenu: string;
  /** The small-caps tag on every section that prints a figure, on the example records. */
  exampleTag: string;
  /** The one sentence in the footer that repeats it. */
  exampleFooterNote: string;

  /* ── Section eyebrows and navigation ──────────────────────────────────── */
  sectionLabel: Record<DemoSchoolSectionId, string>;
  sectionNavLabel: Record<DemoSchoolSectionId, string>;

  /* ── The admissions strip and the hero ────────────────────────────────── */
  admissionsLineFallback: string;
  stripLink: string;
  /** The one button, worded for whichever route the record actually gave us. */
  heroAction: Record<"wa" | "mail" | "apply" | "visit", string>;
  labelWhatsapp: string;
  labelEmail: string;
  labelCall: string;

  /* ── The four facts ───────────────────────────────────────────────────── */
  factEstablished: string;
  factAffiliation: string;
  factAges: string;
  factWhere: string;
  /** "3 to 17", in the reader's language, under the "Ages" label. */
  ageRange: (from: number, to: number) => string;

  /* ── Welcome from the head ────────────────────────────────────────────── */
  welcomeTitle: (role: string) => string;

  /* ── About ────────────────────────────────────────────────────────────── */
  aboutTitle: (name: string) => string;

  /* ── Academics ────────────────────────────────────────────────────────── */
  academicsTitle: string;
  courseEmptyRow: string;
  /** Labels on a course row, in reading order. See `courseFacts`. */
  courseFact: {
    level: string;
    subjects: string;
    duration: string;
    timings: string;
    mode: string;
    starts: string;
    seats: string;
    fee: string;
  };

  /* ── Results ──────────────────────────────────────────────────────────── */
  resultsTitle: string;
  resultsSub: string;

  /* ── Life at the school, teachers, the campus ─────────────────────────── */
  facilitiesTitle: string;
  facultyTitle: string;
  facultySub: string;
  galleryTitle: string;
  /** Under the captioned list, when the record has captions and no files yet. */
  galleryCaptionsNote: string;

  /* ── Come and see us ──────────────────────────────────────────────────── */
  visitTitle: AccentedTitle;
  visitSub: string;
  visitDatesLabel: string;

  /* ── How to apply ─────────────────────────────────────────────────────── */
  admissionsTitle: string;
  admissionsSub: string;
  admissionsProcess: string;
  admissionsBring: string;
  admissionsDates: string;
  admissionsFormNote: string;

  /* ── Notices ──────────────────────────────────────────────────────────── */
  noticesTitle: string;
  noticesSub: string;
  noticePinned: string;

  /* ── Contact ──────────────────────────────────────────────────────────── */
  contactTitle: (name: string) => string;
  labelPhone: string;
  labelAddress: string;
  labelHours: string;
  mapLink: (name: string) => string;
  mapFrameTitle: (name: string) => string;

  /* ── What we still need from you ──────────────────────────────────────── */
  stillNeedLabel: string;
  stillNeedTitle: string;
  stillNeedLead: string;

  /* ── Footer ───────────────────────────────────────────────────────────── */
  footerSections: string;
  footerNavLabel: string;
  backToTop: string;

  blank: SchoolBlanks;
}

/**
 * The copy for one record, in one language.
 *
 * `v` must already be the vocabulary for `lang`: `demoVocabulary(site, lang)`.
 * Each branch below only ever sees the vocabulary that matches it, which is
 * what stops "About the केंद्र" from ever being assembled.
 */
export function schoolCopy(lang: DemoLang, v: DemoVocabulary): SchoolCopy {
  return lang === "hi" ? hindi() : english(v);
}

/* ──────────────────────────────────────────────────────────────────────────
 * English
 * ────────────────────────────────────────────────────────────────────────── */

function english(v: DemoVocabulary): SchoolCopy {
  const shared = demoBlanks(v.market);
  return {
    lang: "en",

    skipToMain: "Skip to main content",
    navLabel: "Sections of this site",
    openMenu: "Open the menu",
    closeMenu: "Close the menu",
    exampleTag: "Example figures",
    exampleFooterNote:
      "Every name, number and date on this page is example content placed by Ideovent Technologies to show how the site is set. Nothing here was published by a real school.",

    sectionLabel: SECTION_LABEL,
    sectionNavLabel: SECTION_NAV_LABEL,

    admissionsLineFallback: `${v.admissionsWord}: ask us about the current ${lower(v.termWord)}`,
    stripLink: "How to apply",
    heroAction: {
      wa: "Ask about admission on WhatsApp",
      mail: "Email the admissions office",
      apply: "How to apply",
      visit: "Come and see the school",
    },
    labelWhatsapp: "WhatsApp",
    labelEmail: "Email",
    labelCall: "Call",

    factEstablished: "Established",
    factAffiliation: "Board",
    factAges: "Ages",
    factWhere: "Where",
    ageRange: (from, to) => `${from} to ${to}`,

    /* Every word lowered, not only the first: "Head of School" is the title
       the admin itself suggests, and `lower` alone printed "head of School".
       A word in capitals throughout ("IB", "CEO") is an acronym and stays. */
    welcomeTitle: (role) =>
      `Welcome from the ${role.replace(/\p{L}+/gu, (w) => (/^\p{Lu}{2,}$/u.test(w) ? w : lower(w)))}`,

    aboutTitle: (name) => `About ${name}`,

    academicsTitle: "What we teach.",
    courseEmptyRow: `Add the subjects, the timings and the ${lower(v.feeWord)} for this one.`,
    courseFact: {
      level: "For",
      subjects: "Subjects",
      duration: "Length",
      timings: "Timings",
      mode: "Mode",
      starts: "Starts",
      seats: "Class size",
      fee: "Fee",
    },

    resultsTitle: "What our students achieved.",
    resultsSub: "Printed exactly as they are published, with nothing rounded up and nothing added.",

    facilitiesTitle: "Life at the school.",
    facultyTitle: "Who teaches here.",
    facultySub: `A parent choosing between two schools is choosing between two sets of ${lower(v.teacherWord)}s.`,
    galleryTitle: "The school itself.",
    galleryCaptionsNote:
      "The captions are set. The photographs go in the day the school sends them, compressed so the page still opens in about two seconds, and no other school's photograph stands here in the meantime.",

    visitTitle: { before: "Come and ", accent: "see", after: " the school." },
    visitSub:
      "A website can only do so much. Most parents decide in the ten minutes they spend on the campus, so this is the section that matters.",
    visitDatesLabel: "Open mornings and key dates",

    admissionsTitle: `How to ${v.applyVerb}.`,
    admissionsSub:
      "The whole answer on one screen, so a parent reading this at nine at night knows exactly what to do next.",
    admissionsProcess: "The process",
    admissionsBring: "What to bring",
    admissionsDates: "Key dates",
    admissionsFormNote:
      `On the live site every ${lower(v.enquiryNoun)} reaches the office on WhatsApp and by email the second it is ` +
      `sent, with the name, the ${lower(v.gradeWord)} and the number already in the message. ` +
      `Whoever replies first usually gets the admission.`,

    noticesTitle: "Notices and circulars.",
    noticesSub:
      "You post these yourselves. A holiday, an exam date, a parents' meeting. You type it and it is live, with no developer and no bill for a two line change.",
    noticePinned: "Pinned",

    contactTitle: (name) => `Reach ${name}.`,
    labelPhone: "Phone",
    labelAddress: "Address",
    labelHours: "Office hours",
    mapLink: (name) => `Find ${name} on the map`,
    mapFrameTitle: (name) => `Map showing ${name}`,

    stillNeedLabel: "Next step",
    stillNeedTitle: "What we still need from you.",
    stillNeedLead:
      "Everything above is set and working. These are the details only the school can supply; send them in any form and they go in as written.",

    footerSections: "On this page",
    footerNavLabel: "Sections of this site, repeated",
    backToTop: "Back to top",

    blank: {
      ...DEMO_BLANK,
      board: shared.board,
      admissions: shared.admissions,
      contactAll:
        "Your phone number, email, address and office hours go here, exactly as you print them. Send them and this section is complete.",
    },
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hindi, as a parent reads it
 * ────────────────────────────────────────────────────────────────────────── */

function hindi(): SchoolCopy {
  return {
    lang: "hi",

    skipToMain: "सीधे content पर जाइए",
    navLabel: "इस site के sections",
    openMenu: "Menu खोलिए",
    closeMenu: "Menu बंद कीजिए",
    exampleTag: "उदाहरण के आँकड़े",
    exampleFooterNote:
      "इस page का हर नाम, आँकड़ा और तारीख़ उदाहरण है, जिसे Ideovent Technologies ने यह दिखाने के लिए रखा है कि site कैसी दिखेगी। यहाँ कुछ भी किसी असली school ने publish नहीं किया है।",

    /* The eyebrow over a section and the word in the nav are the same word in
       Hindi, which is not true in English ("About us" and "About"), so both
       tables carry the short form: a Devanagari label runs longer than its
       English counterpart and the nav strip on a 375px phone has no room for
       the long one. */
    sectionLabel: {
      about: "हमारे बारे में",
      admissions: "Admission",
      academics: "पढ़ाई",
      /* "परिणाम" is the dictionary's word. Every parent in the country says
         "result", in English, including in an otherwise Hindi sentence, and
         says it in the singular on the day and the plural on the wall. */
      results: "Results",
      /* Not "शिक्षक". A Delhi parent says "teacher" out loud in the middle of
         a Hindi sentence ("teachers acche hain", "teacher ne bulaya hai"),
         and reads शिक्षक only on a government notice. Same reasoning as
         "result" three lines up. */
      faculty: "Teachers",
      facilities: "सुविधाएँ",
      gallery: "तस्वीरें",
      principal: "Principal",
      notices: "सूचनाएँ",
      /* The section is an invitation, so it is an imperative rather than a
         noun. Brighton College's own nav item is the verb "Visit". */
      visit: "आकर देखिए",
      contact: "संपर्क",
    },
    sectionNavLabel: {
      about: "हमारे बारे में",
      admissions: "Admission",
      academics: "पढ़ाई",
      results: "Results",
      faculty: "Teachers",
      facilities: "सुविधाएँ",
      gallery: "तस्वीरें",
      principal: "Principal",
      notices: "सूचनाएँ",
      /* Short, because this one sits in a five-item strip at 375px, and
         "school visit" is what a parent says out loud anyway. */
      visit: "Visit",
      contact: "संपर्क",
    },

    admissionsLineFallback: "Admission: इस session के बारे में हमसे पूछिए",
    stripLink: "Admission कैसे लें",
    heroAction: {
      wa: "WhatsApp पर admission के बारे में पूछिए",
      mail: "Admission office को email कीजिए",
      apply: "Admission कैसे लें",
      visit: "आकर school देखिए",
    },
    labelWhatsapp: "WhatsApp",
    labelEmail: "Email",
    labelCall: "Call कीजिए",

    /* The word on the signboard. Every school gate in the country reads
       "स्थापना 1998" or "Estd. 1998", so this is the label a parent already
       knows how to read against the value beside it. */
    factEstablished: "स्थापना",
    /* A parent looks for the word "board", in English, even when everything
       around it is Hindi. "संबद्धता" is the dictionary's answer and nobody's. */
    factAffiliation: "Board",
    factAges: "उम्र",
    factWhere: "कहाँ",
    ageRange: (from, to) => `${from} से ${to} साल`,

    /* "की ओर से स्वागत" is "welcome from" run through a dictionary. Every
       Indian school site titles this block "Principal's Message", and a
       parent reads "Principal का संदेश" without a pause. */
    welcomeTitle: (role) => `${role} का संदेश`,

    aboutTitle: (name) => `${name} के बारे में`,

    academicsTitle: "हम क्या पढ़ाते हैं।",
    courseEmptyRow: "इसके subjects, timing और fees जोड़ दीजिए।",
    courseFact: {
      level: "किसके लिए",
      subjects: "Subjects",
      /* "अवधि" is a word a parent reads on a fixed-deposit slip. */
      duration: "Duration",
      timings: "Timing",
      mode: "Mode",
      starts: "कब से",
      seats: "Class size",
      fee: "Fees",
    },

    resultsTitle: "हमारे students ने क्या हासिल किया।",
    resultsSub: "ठीक वैसे ही जैसे छपते हैं। न कोई आँकड़ा बढ़ाया गया है, न कोई जोड़ा गया।",

    facilitiesTitle: "School में रोज़ का दिन।",
    facultyTitle: "यहाँ कौन पढ़ाता है।",
    facultySub: "School चुनते वक़्त parents असल में teachers चुन रहे होते हैं।",
    /* Not "School, अपनी तस्वीरों में", which is the English sentence with
       Hindi words in it. "झलक" is what a parent says about a set of photos. */
    galleryTitle: "School की एक झलक।",
    galleryCaptionsNote:
      "Captions तैयार हैं। जिस दिन school तस्वीरें भेजेगा, वे यहाँ लग जाएँगी, ठीक से compress करके ताकि page क़रीब दो second में खुले। तब तक यहाँ किसी और school की तस्वीर नहीं लगेगी।",

    /* No serif italic on a Devanagari word. The accent face has no Devanagari
       glyphs, so the browser shears the fallback font's letters into a fake
       oblique, which breaks the head-line every letter hangs from and reads as
       a rendering fault. The heading is set plain in Hindi; the page keeps its
       two accents in English and gives them up here, which is the right trade. */
    visitTitle: { before: "आइए, एक बार school देख लीजिए।", accent: "", after: "" },
    visitSub:
      "Website एक हद तक ही बता सकती है। ज़्यादातर parents campus पर बिताए दस मिनट में ही तय कर लेते हैं, इसलिए यह हिस्सा सबसे ज़रूरी है।",
    /* "Open morning" is a British school's phrase and means nothing to a
       Delhi parent; "school visit" is what they say. */
    visitDatesLabel: "School visit के दिन और ज़रूरी तारीख़ें",

    admissionsTitle: "Admission कैसे लें।",
    admissionsSub:
      "पूरी जानकारी एक ही screen पर, ताकि रात नौ बजे पढ़ रहे माता-पिता को भी साफ़ पता चले कि अगला क़दम क्या है।",
    admissionsProcess: "क्या करना है",
    admissionsBring: "क्या साथ लाना है",
    admissionsDates: "ज़रूरी तारीख़ें",
    admissionsFormNote:
      "Live website पर हर enquiry भेजते ही WhatsApp और email से आपके office तक पहुँच जाएगी, नाम, class और number पहले से " +
      "message में लिखे हुए। जो पहले जवाब देता है, admission अक्सर उसी को मिलता है।",

    noticesTitle: "सूचनाएँ और circulars।",
    noticesSub:
      "ये आप ख़ुद डालते हैं। छुट्टी, exam की तारीख़, parents' meeting। आप type कीजिए और वह live हो जाती है, न developer चाहिए, न दो लाइन बदलने का बिल।",
    noticePinned: "ज़रूरी",

    contactTitle: (name) => `${name} से संपर्क।`,
    labelPhone: "फ़ोन",
    labelAddress: "पता",
    labelHours: "Office का समय",
    mapLink: (name) => `${name} को map पर देखिए`,
    mapFrameTitle: (name) => `${name} का map`,

    stillNeedLabel: "अगला क़दम",
    stillNeedTitle: "हमें आपसे अभी क्या-क्या चाहिए।",
    stillNeedLead:
      "ऊपर सब कुछ तैयार है और चल रहा है। ये वो बातें हैं जो सिर्फ़ school ही बता सकता है; जैसे चाहें भेज दीजिए, जैसा लिखा होगा वैसा ही लगेगा।",

    footerSections: "इस page पर",
    footerNavLabel: "इस site के sections, दोबारा",
    backToTop: "ऊपर जाइए",

    blank: {
      tagline: "आपकी एक लाइन यहाँ आएगी",
      about:
        "School के बारे में दो-चार लाइनें यहाँ आएँगी, आपके अपने शब्दों में। यह अक्सर वही paragraph होता है जो आपके prospectus में पहले से लिखा है।",
      established: "जिस साल school शुरू हुआ, वह जोड़िए",

      principalName: "अपने Principal का नाम जोड़िए",
      principalMessage:
        "आपके Principal का संदेश यहाँ आएगा। जैसा आप लिखकर देंगे, हम बिल्कुल वैसा ही लगाएँगे, उन्हीं के नाम के साथ।",

      admissionsDates: "अपनी admission की तारीख़ें जोड़िए",
      admissionsSteps: "Admission के steps यहाँ आएँगे: माता-पिता पहले क्या करें, और उसके बाद क्या होता है।",
      admissionsDocuments: "Admission के वक़्त आप जो documents माँगते हैं, वे यहाँ आएँगे।",

      courses: "आपकी classes और streams यहाँ आएँगी, उन्हीं timings और fees के साथ जो आप बताते हैं।",
      faculty: "आपके teachers यहाँ आएँगे, हर एक के subject के साथ।",
      facilities: "आपकी सुविधाएँ यहाँ आएँगी। सिर्फ़ वही, जो सचमुच हैं।",
      gallery: "आपके अपने campus की तस्वीरें यहाँ आएँगी। files भेज दीजिए, हम लगा देंगे।",
      notices: "आपकी सूचनाएँ और circulars यहाँ आएँगे। यह हिस्सा आप ख़ुद update करेंगे।",
      results: "आपके results यहाँ आएँगे, ठीक वैसे ही जैसे आप ख़ुद छापते हैं।",

      phone: "आपका admission helpline number यहाँ आएगा",
      email: "आपका enquiry email यहाँ आएगा",
      address: "आपका पता यहाँ आएगा",
      hours: "Office के समय जोड़िए",
      map: "अपनी map listing जोड़िए",

      board: "अपना board और affiliation number जोड़िए",
      /* Not "सजा देंगे": without the nukta a reader can take it as सज़ा,
         punishment, which is the wrong word to meet on your own website. */
      admissions: "अपनी admission process बता दीजिए, हम इसे साफ़-साफ़ steps में लगा देंगे",
      contactAll:
        "आपका phone number, email, पता और office का समय यहाँ आएँगे, ठीक वैसे ही जैसे आप छापते हैं। भेज दीजिए और यह हिस्सा पूरा हो जाएगा।",
    },
  };
}
