/**
 * TEMPLATE s1: URBAN CBSE SENIOR SECONDARY. The reference school template.
 *
 * Segment: a metro day school, Nursery to Class XII, CBSE, with science,
 * commerce and humanities streams at senior secondary. Parents are English
 * first, compare three or four schools on a laptop, and filter on the board,
 * the streams and the results before anything else.
 * Registry: Modern family, `metro` theme, hero A (see ../index.ts).
 *
 * THIS FILE IS THE MODEL FOR s2 TO s5. Every field the school renderer reads
 * is filled, at the quantities in DEMO-SITE-BRIEF.md section 9.3, and the
 * comments say which fields survive a duplicate and therefore have to be
 * written generic. Read ../shape.ts first for the fiction rules.
 *
 * THE INSTITUTE DOES NOT EXIST. "Harsingar" is the night jasmine; a search on
 * 25 September 2026 found no well-known school by this name. The phone, the
 * email, the street and the PIN are the reserved fiction patterns, and the
 * affiliation line says it is an example on its face.
 */

import { SCHOOL_PAGE_SETS } from "../../site/pageSets";
import { defineTemplateContent } from "../shape";

/*
 * MULTI-PAGE CONTENT (26 September 2026). s1 is the 14-page metro CBSE site:
 * Home, About, Admissions, Academics, Faculty, Facilities, Results, Gallery,
 * News, Parents, Transport, Disclosure, Policies, Contact. Every field below
 * the original set is CLEARED on duplicate except `sitePages`. The site is
 * English-first; every text field also carries its Hindi in its own `hi` block.
 */
export default defineTemplateContent("school", {
  /* ── KEPT: the page list for this segment ────────────────────────────── */
  sitePages: [...SCHOOL_PAGE_SETS["s1-urban-cbse"]],

  /* ── KEPT (rule "stock"): the template's stock photographs. Licensed
        stock from public/demo/img, alt text from its manifest, describing
        the scene only. A duplicate carries them and the admin checklist
        says "Photos are stock photos from the template" until Mehdi
        replaces the hero with the institute's own. ───────────────────── */
  heroImage: "/demo/img/school/hero-urban-senior-girls-class-800.webp",
  sectionPhotos: {
    about: "/demo/img/school/hero-international-library-800.webp",
    campus: "/demo/img/school/sports-basketball-640.webp",
    academics: "/demo/img/school/lab-microscopes-640.webp",
    admissions: "/demo/img/school/activity-art-session-640.webp",
    transport: "/demo/img/school/transport-school-van-640.webp",
    labs: "/demo/img/school/lab-microscope-flask-640.webp",
    library: "/demo/img/school/library-reading-hall-640.webp",
    sports: "/demo/img/school/sports-day-race-640.webp",
  },

  /* ── CLEARED: the session the admissions chip is recruiting for. The chip
        reads "Admissions 2027-28 open until 15 Dec 2026" and hides itself
        the day after. ──────────────────────────────────────────────────── */
  sessionLabel: "2027-28",
  admissionsOpenUntil: "2026-12-15",

  /* ── The Hindi of every top-level text field. Only principalTitle's Hindi
        survives a duplicate (its English is kept); the rest is cleared. ─── */
  hi: {
    tagline: "एक क्लास में 30 बच्चे, कक्षा 11 में तीन स्ट्रीम, और पूरा रिज़ल्ट *बिना छिपाए*।",
    about: "हरसिंगार 2004 में 140 बच्चों और दो एकड़ ज़मीन पर एक बिल्डिंग से शुरू हुआ। आज दक्षिण गुरुग्राम के पाँच एकड़ के कैंपस में नर्सरी से कक्षा 12 तक 1,260 बच्चे एक ही शिफ़्ट में पढ़ते हैं। एक क्लास में ज़्यादा से ज़्यादा 30 बच्चे और हर कक्षा के चार सेक्शन, ताकि पहले टर्म के अंत तक टीचर उस साल के हर बच्चे को जानें। कक्षा 11 में बच्चा साइंस, कॉमर्स या ह्यूमैनिटीज़ चुनता है, और हर स्ट्रीम में इंग्लिश, खेल, एक भाषा और एक वर्कशॉप के चार पीरियड एक जैसे हैं। हम हर जुलाई में बोर्ड रिज़ल्ट विषय के हिसाब से छापते हैं, उन विषयों के साथ भी जिनमें हम पीछे रहे।",
    vision: "ऐसा स्कूल जहाँ हर गलियारे में बच्चे को नाम से जाना जाए, और सत्रह साल की उम्र में वह ध्यान से पढ़ना, ईमानदारी से बहस करना और अपने हाथों से चीज़ें बनाना सीखकर निकले।",
    mission: "छोटे सेक्शन, एक शिफ़्ट, टीचर जो सालों टिकते हैं। हर जुलाई पूरा बोर्ड रिज़ल्ट। कक्षा 6 से हर बच्चे के लिए एक वर्कशॉप विषय और एक खेल, ग्रेड मिले या नहीं।",
    principalTitle: "प्रिंसिपल",
    principalMessage: "मैं 2009 में हरसिंगार में गणित टीचर बनकर आई और 2019 में प्रिंसिपल बनी। अभिभावक मुझसे ज़्यादातर नंबरों के बारे में पूछते हैं, और मैं जवाब देती हूँ, पर मैं चाहती हूँ कि वे पूछें कि उनके बच्चे का एक आम बुधवार कैसा होता है। किसी बुधवार आइए। कक्षा 7 का साइंस पीरियड और कक्षा 12 का अकाउंटेंसी पीरियड बैठकर देखिए। अगर जो दिखे वह इस वेबसाइट से मेल न खाए, तो मुझे बताइए।",
    resultsHeading: "2026 का बोर्ड रिज़ल्ट",
    resultsNote: "इस हिस्से का हर आँकड़ा उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि रिज़ल्ट की सूची कैसी दिखेगी। आपका अपना रिज़ल्ट इसकी जगह लाइन दर लाइन आएगा, ठीक वैसे ही जैसे आप छापते हैं।",
    admissionsHeadline: "2027-28 के लिए रजिस्ट्रेशन 15 दिसंबर 2026 तक खुला है",
    established: "स्थापना 2004",
    city: "गुरुग्राम",
    state: "हरियाणा",
    boardOrAffiliation: "CBSE सीनियर सेकेंडरी, उदाहरण मान्यता संख्या 00000000",
    facilities: [
      "फिज़िक्स, केमिस्ट्री और बायोलॉजी की साइंस लैब",
      "लाइब्रेरी और रीडिंग रूम",
      "कंप्यूटर लैब",
      "संगीत, आर्ट और डांस के लिए एक्टिविटी रूम",
      "खेल का मैदान और इनडोर गेम्स हॉल",
      "मेडिकल रूम, जिसमें स्कूल के पूरे समय नर्स रहती है",
    ],
    sessionLabel: "2027-28",
  },

  /* ── CLEARED ON DUPLICATE: the institute's identity ──────────────────── */
  instituteName: "Harsingar Senior Secondary School",
  /* One phrase in *asterisks* is set in the serif italic accent. */
  tagline: "Thirty to a class, three streams at Class XI, and results we publish *in full*.",
  city: "Gurugram",
  state: "Haryana",

  /* ── KEPT: market, language and currency ─────────────────────────────── */
  country: "India",
  market: "india",
  currency: "INR",

  /* ── CLEARED: history and board ──────────────────────────────────────── */
  established: "Founded 2004",
  establishedYear: "2004",
  boardOrAffiliation: "CBSE senior secondary, example affiliation no. 00000000",

  about:
    "Harsingar opened in 2004 with 140 children and a single building on a two-acre plot. It now teaches 1,260 pupils from Nursery to Class XII in one shift, on a five-acre campus in south Gurugram. Classes are capped at thirty and sections at four per grade, so a teacher knows every child in the year by the end of the first term. At Class XI a pupil chooses science, commerce or humanities, and every stream shares the same four periods of English, physical education, a language and a workshop. We publish our board results each July, subject by subject, including the subjects where we fell short.",

  /* ── CLEARED: About page ─────────────────────────────────────────────── */
  vision: "A school where a child is known by name in every corridor, and leaves at seventeen able to read closely, argue fairly and make things with their hands.",
  mission: "Small sections, one shift, teachers who stay. Board results published in full every July. A workshop subject and a sport for every child from Class VI, graded or not.",

  /* ── CLEARED: the proof row. Each figure carries its basis line, and a
        figure without one never animates. ───────────────────────────────── */
  stats: [
    { value: "1,260", label: "Pupils, Nursery to Class XII", basis: "Enrolment on 1 August 2026, one shift", hi: { label: "बच्चे, नर्सरी से कक्षा 12 तक", basis: "1 अगस्त 2026 का नामांकन, एक शिफ़्ट" } },
    { value: "93.6%", label: "Class XII average aggregate", basis: "CBSE 2026, 142 candidates, all streams", hi: { label: "कक्षा 12 का औसत कुल प्रतिशत", basis: "CBSE 2026, 142 बच्चे, तीनों स्ट्रीम" } },
    { value: "30", label: "Children in a section, at most", basis: "28 at Class XI and XII", hi: { label: "एक सेक्शन में ज़्यादा से ज़्यादा बच्चे", basis: "कक्षा 11 और 12 में 28" } },
    { value: "17", label: "Years a teacher stays here, on average", basis: "Teaching staff on 1 August 2026", hi: { label: "साल, जितना एक टीचर औसतन यहाँ टिकते हैं", basis: "1 अगस्त 2026 का टीचिंग स्टाफ़" } },
  ],

  /* ── CLEARED: parents' words. Fiction on its face: a relation and a
        source line that says Ideovent wrote it, never a name. ──────────── */
  reviews: [
    {
      quote: "We moved from Pune in Class VI. By the second week the class teacher had called us twice, once about a slip in maths and once just to say he had found his table at lunch.",
      relation: "Parent of a Class VIII pupil",
      source: "Example review written by Ideovent",
      consent: true,
      hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "हम कक्षा 6 में पुणे से आए थे। दूसरे हफ़्ते तक क्लास टीचर ने हमें दो बार फ़ोन किया, एक बार गणित की एक ग़लती के बारे में और एक बार बस यह बताने के लिए कि लंच में उसे अपनी टेबल मिल गई है।", relation: "कक्षा 8 के बच्चे के अभिभावक" },
    },
    {
      quote: "The stream counselling was the first school meeting where my daughter did most of the talking. She took humanities against her board marks, and nobody tried to talk her out of it.",
      relation: "Parent of a Class XII pupil, humanities",
      source: "Example review written by Ideovent",
      consent: true,
      hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "स्ट्रीम काउंसलिंग पहली स्कूल मीटिंग थी जिसमें ज़्यादातर मेरी बेटी बोली। उसने बोर्ड के नंबरों के उलट ह्यूमैनिटीज़ ली, और किसी ने उसे मना करने की कोशिश नहीं की।", relation: "कक्षा 12 की बच्ची के अभिभावक, ह्यूमैनिटीज़" },
    },
    {
      quote: "The fee schedule we were given in January was the fee schedule we paid. No new heads in July.",
      relation: "Parent of two, Class III and Class VII",
      source: "Example review written by Ideovent",
      consent: true,
      hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "जनवरी में जो फीस की सूची मिली थी, वही फीस हमने भरी। जुलाई में कोई नया मद नहीं जुड़ा।", relation: "दो बच्चों के अभिभावक, कक्षा 3 और कक्षा 7" },
    },
  ],

  /* ── The head. Name and message CLEARED; the title is KEPT ───────────── */
  principalName: "Meenal Chawla",
  principalTitle: "Principal",
  principalMessage:
    "I joined Harsingar as a mathematics teacher in 2009 and became Principal in 2019. Parents usually ask me about marks, and I answer, but I would rather they asked what an ordinary Wednesday looks like for their child. Come on a Wednesday. Sit in a Class VII science period and a Class XII accountancy period. If what you see does not match this website, tell me.",

  /* ── STRUCTURE: age bands. Name, level, subjects and timings are KEPT;
        seats and detail are CLEARED, so put the claims in `detail`. ─────── */
  courses: [
    {
      name: "Pre-primary",
      level: "Nursery to UKG, ages 3 to 5",
      subjects: "Language, early number, music, movement, outdoor play",
      timings: "8:30 am to 12:30 pm",
      seats: "24 children, a teacher and an assistant",
      detail: "No written homework until Class I. The last forty minutes of the day are outdoors unless it is raining.",
      hi: { name: "प्री-प्राइमरी", level: "नर्सरी से UKG, 3 से 5 साल", subjects: "भाषा, शुरुआती गिनती, संगीत, खेलकूद, बाहर का खेल", timings: "सुबह 8:30 से दोपहर 12:30 बजे तक", detail: "कक्षा 1 से पहले कोई लिखित होमवर्क नहीं। बारिश न हो तो दिन के आख़िरी चालीस मिनट बाहर।" },
    },
    {
      name: "Primary",
      level: "Class I to V, ages 6 to 10",
      subjects: "English, Hindi, mathematics, environmental studies, art, games",
      timings: "8:00 am to 2:00 pm",
      seats: "30 per section",
      detail: "Reading is assessed one child at a time, twice a year, and the notes go home with the report card rather than being reduced to a grade.",
      hi: { name: "प्राइमरी", level: "कक्षा 1 से 5, 6 से 10 साल", subjects: "इंग्लिश, हिंदी, गणित, पर्यावरण अध्ययन, आर्ट, खेल", timings: "सुबह 8:00 से दोपहर 2:00 बजे तक", detail: "साल में दो बार हर बच्चे की पढ़ने की जाँच अलग से होती है, और टीचर के नोट्स सिर्फ़ ग्रेड नहीं, रिपोर्ट कार्ड के साथ घर जाते हैं।" },
    },
    {
      name: "Middle school",
      level: "Class VI to VIII, ages 11 to 13",
      subjects: "English, Hindi, Sanskrit or French, mathematics, science, social science, computing",
      timings: "8:00 am to 2:30 pm",
      seats: "30 per section",
      detail: "Every child takes one workshop subject, carpentry, textiles or electronics, and one sport. Neither is graded and neither is optional.",
      hi: { name: "मिडिल स्कूल", level: "कक्षा 6 से 8, 11 से 13 साल", subjects: "इंग्लिश, हिंदी, संस्कृत या फ़्रेंच, गणित, साइंस, सोशल साइंस, कंप्यूटर", timings: "सुबह 8:00 से दोपहर 2:30 बजे तक", detail: "हर बच्चा एक वर्कशॉप विषय (बढ़ईगीरी, कपड़ा या इलेक्ट्रॉनिक्स) और एक खेल लेता है। दोनों में ग्रेड नहीं, और दोनों ज़रूरी हैं।" },
    },
    {
      name: "Secondary",
      level: "Class IX to X, ages 14 to 15",
      subjects: "CBSE core subjects, with Sanskrit or French as the third language",
      timings: "8:00 am to 2:30 pm",
      seats: "30 per section",
      detail: "Two full practice cycles in Class X, marked by the teacher who taught the chapter and returned within a week.",
      hi: { name: "सेकेंडरी", level: "कक्षा 9 और 10, 14 से 15 साल", subjects: "CBSE के मुख्य विषय, तीसरी भाषा संस्कृत या फ़्रेंच", timings: "सुबह 8:00 से दोपहर 2:30 बजे तक", detail: "कक्षा 10 में प्रैक्टिस टेस्ट के दो पूरे दौर। कॉपी वही टीचर जाँचते हैं जिन्होंने चैप्टर पढ़ाया, और एक हफ़्ते में लौटाते हैं।" },
    },
    {
      name: "Senior secondary",
      level: "Class XI to XII, ages 16 to 17",
      subjects: "Science (medical and non-medical), commerce and humanities. Economics, psychology and computer science are open to all three streams",
      timings: "8:00 am to 2:40 pm",
      seats: "28 per section",
      detail: "The stream is decided at a counselling meeting with the child and both parents after the Class X pre-boards, not from the mark sheet alone.",
      hi: { name: "सीनियर सेकेंडरी", level: "कक्षा 11 और 12, 16 से 17 साल", subjects: "साइंस (मेडिकल और नॉन-मेडिकल), कॉमर्स और ह्यूमैनिटीज़। इकोनॉमिक्स, साइकोलॉजी और कंप्यूटर साइंस तीनों स्ट्रीम के लिए खुले हैं", timings: "सुबह 8:00 से दोपहर 2:40 बजे तक", detail: "स्ट्रीम कक्षा 10 के प्री-बोर्ड के बाद बच्चे और माता-पिता दोनों के साथ काउंसलिंग मीटिंग में तय होती है, सिर्फ़ मार्कशीट से नहीं।" },
    },
  ],

  /* ── CLEARED: Academics page ─────────────────────────────────────────── */
  academics: {
    intro: "We follow the CBSE curriculum and the NCERT books from Class I, with the National Curriculum Framework's stages in mind: play-based to Class II, activity-based to Class V, subjects from Class VI. What we add is time: two library periods a week to Class VIII, a workshop subject in middle school, and practicals that are done rather than copied.",
    stages: [
      { title: "Foundational (Nursery to Class II)", body: "Stories, number games, songs and outdoor play. Reading readiness is assessed one child at a time. No written homework before Class I.", hi: { title: "फ़ाउंडेशनल (नर्सरी से कक्षा 2)", body: "कहानियाँ, गिनती के खेल, गाने और बाहर का खेल। पढ़ने की तैयारी हर बच्चे की अलग से जाँची जाती है। कक्षा 1 से पहले कोई लिखित होमवर्क नहीं।" } },
      { title: "Preparatory (Class III to V)", body: "English, Hindi, mathematics and environmental studies, taught through projects that end in something a parent can see at the term exhibition.", hi: { title: "प्रिपरेटरी (कक्षा 3 से 5)", body: "इंग्लिश, हिंदी, गणित और पर्यावरण अध्ययन, प्रोजेक्ट के ज़रिए, जिनका नतीजा टर्म प्रदर्शनी में अभिभावक खुद देख सकें।" } },
      { title: "Middle (Class VI to VIII)", body: "Science, social science and a third language arrive as subjects. Every child takes one workshop subject and one sport.", hi: { title: "मिडिल (कक्षा 6 से 8)", body: "साइंस, सोशल साइंस और तीसरी भाषा अलग विषय बनकर आते हैं। हर बच्चा एक वर्कशॉप विषय और एक खेल लेता है।" } },
      { title: "Secondary (Class IX and X)", body: "The CBSE board syllabus, two practice cycles in Class X, and a teacher who returns each paper within a week.", hi: { title: "सेकेंडरी (कक्षा 9 और 10)", body: "CBSE बोर्ड का सिलेबस, कक्षा 10 में प्रैक्टिस के दो दौर, और टीचर जो हर पेपर एक हफ़्ते में लौटाते हैं।" } },
      { title: "Senior secondary (Class XI and XII)", body: "Science (medical and non-medical), commerce and humanities. Economics, psychology and computer science are open to all three streams. Practicals in our own laboratories, not a demonstration.", hi: { title: "सीनियर सेकेंडरी (कक्षा 11 और 12)", body: "साइंस (मेडिकल और नॉन-मेडिकल), कॉमर्स और ह्यूमैनिटीज़। इकोनॉमिक्स, साइकोलॉजी और कंप्यूटर साइंस तीनों स्ट्रीम के लिए खुले हैं। प्रैक्टिकल हमारी अपनी लैब में, सिर्फ़ दिखाकर नहीं।" } },
    ],
    assessment: "Class I to VIII: two periodic tests and a half-yearly and annual examination, with a holistic progress card that describes reading, number and conduct in sentences, not only grades. Class IX to XII: the CBSE scheme, with internal assessment (periodic tests, notebooks, subject enrichment and practicals) marked by the subject teacher and moderated by the head of department.",
    calendar: [
      { title: "Half-yearly examinations, Class VI to XII", date: "6 to 17 October 2026", hi: { title: "अर्धवार्षिक परीक्षा, कक्षा 6 से 12", date: "6 से 17 अक्टूबर 2026" } },
      { title: "Dussehra break", date: "19 to 21 October 2026", hi: { title: "दशहरे की छुट्टी", date: "19 से 21 अक्टूबर 2026" } },
      { title: "Diwali break", date: "6 to 11 November 2026", hi: { title: "दिवाली की छुट्टी", date: "6 से 11 नवंबर 2026" } },
      { title: "Parent-teacher meeting, all classes", date: "Saturday 21 November 2026", hi: { title: "पैरेंट-टीचर मीटिंग, सभी कक्षाएँ", date: "शनिवार 21 नवंबर 2026" } },
      { title: "Winter break", date: "25 December 2026 to 3 January 2027", hi: { title: "सर्दी की छुट्टी", date: "25 दिसंबर 2026 से 3 जनवरी 2027" } },
      { title: "Class X and XII pre-board examinations", date: "4 to 20 January 2027", hi: { title: "कक्षा 10 और 12 की प्री-बोर्ड परीक्षा", date: "4 से 20 जनवरी 2027" } },
      { title: "CBSE board examinations begin", date: "Mid February 2027, as CBSE announces", hi: { title: "CBSE बोर्ड परीक्षा शुरू", date: "फ़रवरी 2027 के बीच में, CBSE की घोषणा के अनुसार" } },
      { title: "Session 2027-28 begins", date: "1 April 2027", hi: { title: "सत्र 2027-28 शुरू", date: "1 अप्रैल 2027" } },
    ],
    downloads: [
      { label: "Book list 2026-27, Class I to XII", group: "Lists", hi: { label: "किताबों की सूची 2026-27, कक्षा 1 से 12", group: "सूची" } },
      { label: "Uniform list and suppliers", group: "Lists", hi: { label: "यूनिफ़ॉर्म की सूची और दुकानें", group: "सूची" } },
      { label: "Holiday list 2026-27", group: "Calendar", hi: { label: "छुट्टियों की सूची 2026-27", group: "कैलेंडर" } },
      { label: "Class X sample papers, all subjects", group: "Model papers", hi: { label: "कक्षा 10 के सैंपल पेपर, सभी विषय", group: "मॉडल पेपर" } },
      { label: "Class XII sample papers, all streams", group: "Model papers", hi: { label: "कक्षा 12 के सैंपल पेपर, सभी स्ट्रीम", group: "मॉडल पेपर" } },
      { label: "Transfer certificate request form", group: "Forms", hi: { label: "ट्रांसफ़र सर्टिफ़िकेट (TC) के लिए फ़ॉर्म", group: "फ़ॉर्म" } },
    ],
    hi: {
      intro: "हम कक्षा 1 से CBSE का सिलेबस और NCERT की किताबें पढ़ाते हैं, राष्ट्रीय पाठ्यचर्या ढाँचे (NCF) के चरणों को ध्यान में रखकर: कक्षा 2 तक खेल से, कक्षा 5 तक गतिविधि से, और कक्षा 6 से विषय के हिसाब से। हम इसमें समय जोड़ते हैं: कक्षा 8 तक हफ़्ते में लाइब्रेरी के दो पीरियड, मिडिल स्कूल में एक वर्कशॉप विषय, और प्रैक्टिकल जो खुद किए जाते हैं, नकल से नहीं।",
      assessment: "कक्षा 1 से 8: दो पीरियॉडिक टेस्ट, अर्धवार्षिक और वार्षिक परीक्षा, और एक प्रोग्रेस कार्ड जो पढ़ने, गिनती और व्यवहार को सिर्फ़ ग्रेड में नहीं, वाक्यों में बताता है। कक्षा 9 से 12: CBSE की योजना, जिसमें इंटरनल असेसमेंट (पीरियॉडिक टेस्ट, कॉपी, विषय संवर्धन और प्रैक्टिकल) विषय के टीचर जाँचते हैं और विभाग के हेड दोबारा देखते हैं।",
    },
  },

  /* ── CLEARED: results. Unit-carrying lines, no student named, ever. ──── */
  resultsHeading: "The 2026 board results",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a result list is set. Your own results replace it line for line, exactly as you publish them.",
  results: [
    { achievement: "93.6% average aggregate", exam: "CBSE Class XII", year: "2026", note: "142 candidates, all three streams", category: "Class XII", hi: { exam: "CBSE कक्षा 12", category: "कक्षा 12", achievement: "93.6% औसत कुल प्रतिशत", note: "142 बच्चे, तीनों स्ट्रीम" } },
    { achievement: "91.2% average aggregate", exam: "CBSE Class X", year: "2026", note: "156 candidates", category: "Class X", hi: { exam: "CBSE कक्षा 10", category: "कक्षा 10", achievement: "91.2% औसत कुल प्रतिशत", note: "156 बच्चे" } },
    { achievement: "47 of 142 scored 95 or above in at least one subject", exam: "CBSE Class XII", year: "2026", category: "Class XII", hi: { exam: "CBSE कक्षा 12", category: "कक्षा 12", achievement: "142 में से 47 बच्चों के कम से कम एक विषय में 95 या ज़्यादा" } },
    { achievement: "11 subjects offered at Class XII, none with fewer than eight pupils", exam: "Class XII", year: "2026", category: "Class XII", hi: { exam: "कक्षा 12", category: "कक्षा 12", achievement: "कक्षा 12 में 11 विषय, किसी में भी आठ से कम बच्चे नहीं" } },
    { achievement: "90.8% average aggregate", exam: "CBSE Class XII", year: "2025", note: "136 candidates", category: "Class XII", hi: { exam: "CBSE कक्षा 12", category: "कक्षा 12", achievement: "90.8% औसत कुल प्रतिशत", note: "136 बच्चे" } },
    { achievement: "89.9% average aggregate", exam: "CBSE Class X", year: "2025", note: "151 candidates", category: "Class X", hi: { exam: "CBSE कक्षा 10", category: "कक्षा 10", achievement: "89.9% औसत कुल प्रतिशत", note: "151 बच्चे" } },
  ],

  /* ── CLEARED: the board table, in CBSE Appendix IX columns. Three years,
        both classes. It feeds the Results page and the Disclosure. ─────── */
  boardResults: [
    { year: "2026", className: "X", registered: "156", passed: "156", passPercent: "100%", hi: { className: "10" } },
    { year: "2026", className: "XII", registered: "142", passed: "141", passPercent: "99.3%", note: "One compartment in mathematics, cleared in July", hi: { className: "12", note: "गणित में एक कंपार्टमेंट, जुलाई में पास" } },
    { year: "2025", className: "X", registered: "151", passed: "151", passPercent: "100%", hi: { className: "10" } },
    { year: "2025", className: "XII", registered: "136", passed: "136", passPercent: "100%", hi: { className: "12" } },
    { year: "2024", className: "X", registered: "148", passed: "147", passPercent: "99.3%", hi: { className: "10" } },
    { year: "2024", className: "XII", registered: "131", passed: "130", passPercent: "99.2%", hi: { className: "12" } },
  ],

  /* ── KEPT WORD FOR WORD: facilities. Only what nearly every school in the
        segment has, described generically: no counts, no hours, no names.
        The workshop and the garden live in `about` and `courses`, which are
        cleared, because not every CBSE school has them. ────────────────── */
  facilities: [
    "Science laboratories for physics, chemistry and biology",
    "Library and reading room",
    "Computer laboratory",
    "Activity rooms for music, art and dance",
    "Playground and indoor games hall",
    "Infirmary with a nurse on duty through the school day",
  ],

  /* ── CLEARED: the Facilities page, grouped. Specific, so cleared. ──────── */
  facilityDetails: [
    { title: "Three science laboratories", body: "Physics, chemistry and biology, each with 32 work stations, so a Class XI practical is done in pairs, not watched from the back.", group: "Science", hi: { title: "साइंस की तीन लैब", body: "फिज़िक्स, केमिस्ट्री और बायोलॉजी, हर लैब में 32 वर्क स्टेशन, ताकि कक्षा 11 का प्रैक्टिकल जोड़ी में हो, पीछे खड़े होकर देखकर नहीं।", group: "साइंस" } },
    { title: "Workshop block", body: "Carpentry, textiles and electronics rooms for the Class VI to VIII workshop subject, with a technician in each.", group: "Science", hi: { title: "वर्कशॉप ब्लॉक", body: "कक्षा 6 से 8 के वर्कशॉप विषय के लिए बढ़ईगीरी, कपड़ा और इलेक्ट्रॉनिक्स के कमरे, हर कमरे में एक टेक्नीशियन।", group: "साइंस" } },
    { title: "Library", body: "About 14,000 books, a reading room of 60 seats, and the Class I to VIII library periods. Open to parents on Saturday mornings.", group: "Library", hi: { title: "लाइब्रेरी", body: "लगभग 14,000 किताबें, 60 सीटों का रीडिंग रूम, और कक्षा 1 से 8 के लाइब्रेरी पीरियड। शनिवार सुबह अभिभावकों के लिए भी खुली।", group: "लाइब्रेरी" } },
    { title: "Computer laboratory", body: "Forty machines on a fibre line. Screens are off in the library and in the primary block.", group: "Library", hi: { title: "कंप्यूटर लैब", body: "फ़ाइबर लाइन पर चालीस कंप्यूटर। लाइब्रेरी और प्राइमरी ब्लॉक में स्क्रीन बंद रहती हैं।", group: "लाइब्रेरी" } },
    { title: "Field and games hall", body: "A 200-metre track, two basketball courts, a football field and an indoor hall for badminton and table tennis.", group: "Sports", hi: { title: "मैदान और खेल हॉल", body: "200 मीटर का ट्रैक, दो बास्केटबॉल कोर्ट, एक फ़ुटबॉल मैदान, और बैडमिंटन व टेबल टेनिस के लिए इनडोर हॉल।", group: "खेल" } },
    { title: "Music, art and dance rooms", body: "Three rooms off the main hall, and an auditorium of 600 seats for the annual day and the house assemblies.", group: "Arts", hi: { title: "संगीत, आर्ट और डांस के कमरे", body: "मेन हॉल के पास तीन कमरे, और वार्षिक उत्सव व हाउस असेंबली के लिए 600 सीटों का ऑडिटोरियम।", group: "कला" } },
    { title: "Infirmary", body: "Two beds and a nurse through the school day. A doctor visits every Tuesday and Friday, and the annual health check is done here.", group: "Health", hi: { title: "मेडिकल रूम", body: "दो बेड और पूरे स्कूल समय एक नर्स। डॉक्टर हर मंगलवार और शुक्रवार आते हैं, और सालाना हेल्थ चेकअप यहीं होता है।", group: "सेहत" } },
    { title: "Counselling room", body: "A quiet room next to the library for the counsellor and the special educator. Parents book time through the office.", group: "Health", hi: { title: "काउंसलिंग रूम", body: "लाइब्रेरी के पास एक शांत कमरा, काउंसलर और स्पेशल एजुकेटर के लिए। अभिभावक ऑफ़िस से समय लेते हैं।", group: "सेहत" } },
  ],

  /* ── CLEARED: faculty. Fictional names; each photo is a stock portrait (a
        licensed model, never the teacher), kept on duplicate for a row that
        survives, and never the same person twice. The group
        feeds the Disclosure staff counts (PGT, TGT, PRT). ────────────────── */
  faculty: [
    { name: "Meenal Chawla", photo: "/demo/img/people/teacher-w08-240.webp", role: "Principal", group: "Leadership", subject: "Mathematics", qualification: "M.Sc. Mathematics, B.Ed.", experience: "17 years here, Principal since 2019", hi: { group: "प्रबंधन", role: "प्रिंसिपल", subject: "गणित", qualification: "M.Sc. गणित, B.Ed.", experience: "यहाँ 17 साल, 2019 से प्रिंसिपल" } },
    { name: "Ritika Sehgal", photo: "/demo/img/people/teacher-w02-240.webp", role: "Head of Science", group: "PGT", subject: "Physics", qualification: "M.Sc. Physics, B.Ed.", experience: "16 years, Class XI and XII", style: "Every derivation starts from something the class has seen in the laboratory.", hi: { role: "साइंस विभाग की हेड", subject: "फिज़िक्स", qualification: "M.Sc. फिज़िक्स, B.Ed.", experience: "16 साल, कक्षा 11 और 12", style: "हर डेरिवेशन उस चीज़ से शुरू होता है जो क्लास ने लैब में देखी है।" } },
    { name: "Arvind Kulkarni", photo: "/demo/img/people/teacher-m12-240.webp", group: "PGT", subject: "Mathematics", qualification: "M.Sc. Mathematics", experience: "21 years, here since 2006", style: "Ten minutes of mental arithmetic to open every period, Class XII included.", hi: { subject: "गणित", qualification: "M.Sc. गणित", experience: "21 साल, 2006 से यहाँ", style: "हर पीरियड दस मिनट के मौखिक गणित से शुरू होता है, कक्षा 12 में भी।" } },
    { name: "Nazia Farooqui", photo: "/demo/img/people/teacher-w09-240.webp", group: "PGT", subject: "English", qualification: "M.A. English, M.Phil.", experience: "12 years, Class VI to XII", style: "Reads every essay twice: once for the argument, once for the sentences.", hi: { subject: "इंग्लिश", qualification: "M.A. इंग्लिश, M.Phil.", experience: "12 साल, कक्षा 6 से 12", style: "हर निबंध दो बार पढ़ती हैं: एक बार तर्क के लिए, एक बार वाक्यों के लिए।" } },
    { name: "Gurpreet Bains", photo: "/demo/img/people/teacher-m14-240.webp", group: "PGT", subject: "Accountancy and business studies", qualification: "M.Com., B.Ed.", experience: "14 years, commerce stream", hi: { subject: "अकाउंटेंसी और बिज़नेस स्टडीज़", qualification: "M.Com., B.Ed.", experience: "14 साल, कॉमर्स स्ट्रीम" } },
    { name: "Sreeja Nair", photo: "/demo/img/people/teacher-w04-240.webp", group: "TGT", subject: "Science", qualification: "M.Sc. Zoology, B.Ed.", experience: "9 years, and runs the school garden", hi: { subject: "साइंस", qualification: "M.Sc. ज़ूलॉजी, B.Ed.", experience: "9 साल, और स्कूल का बगीचा भी यही संभालती हैं" } },
    { name: "Sudhir Tiwari", photo: "/demo/img/people/teacher-m05-240.webp", group: "TGT", subject: "Hindi and Sanskrit", qualification: "M.A. Hindi, B.Ed.", experience: "11 years, Class VI to X", hi: { subject: "हिंदी और संस्कृत", qualification: "M.A. हिंदी, B.Ed.", experience: "11 साल, कक्षा 6 से 10" } },
    { name: "Kunal Bhardwaj", photo: "/demo/img/people/teacher-m04-240.webp", group: "PRT", subject: "Class III class teacher", qualification: "B.El.Ed.", experience: "7 years, here since 2019", hi: { subject: "कक्षा 3 के क्लास टीचर", qualification: "B.El.Ed.", experience: "7 साल, 2019 से यहाँ" } },
    { name: "Anjali Rawat", photo: "/demo/img/people/teacher-w06-240.webp", group: "PRT", subject: "Pre-primary, UKG", qualification: "Diploma in Early Childhood Education", experience: "6 years", hi: { subject: "प्री-प्राइमरी, UKG", qualification: "अर्ली चाइल्डहुड एजुकेशन में डिप्लोमा", experience: "6 साल" } },
    { name: "Deepa Menon", photo: "/demo/img/people/teacher-w03-240.webp", group: "Special educator", subject: "Learning support", qualification: "M.Ed. Special Education, RCI registered", experience: "10 years", hi: { group: "स्पेशल एजुकेटर", subject: "पढ़ाई में सहायता", qualification: "M.Ed. स्पेशल एजुकेशन, RCI में रजिस्टर्ड", experience: "10 साल" } },
    { name: "Farhan Qureshi", photo: "/demo/img/people/teacher-m01-240.webp", group: "Counsellor", subject: "Counselling and wellness", qualification: "M.A. Psychology", experience: "8 years, runs the Class X and XII stream and career sessions", hi: { group: "काउंसलर", subject: "काउंसलिंग और वेलनेस", qualification: "M.A. साइकोलॉजी", experience: "8 साल, कक्षा 10 और 12 के स्ट्रीम और करियर सेशन लेते हैं" } },
  ],

  /* ── CLEARED: gallery. Captions only, never a file. The section is set
        from these typographically, and they double as the shot list. ────── */
  gallery: [
    { src: "", alt: "The main block from the field, ten minutes before assembly.", hi: { alt: "मैदान से मेन बिल्डिंग, असेंबली से दस मिनट पहले।" } },
    { src: "", alt: "Class VIII electronics workshop, Thursday afternoon.", hi: { alt: "कक्षा 8 की इलेक्ट्रॉनिक्स वर्कशॉप, गुरुवार दोपहर।" } },
    { src: "", alt: "The library at 3:00 pm, when it is busiest.", hi: { alt: "दोपहर 3 बजे की लाइब्रेरी, जब यहाँ सबसे ज़्यादा भीड़ होती है।" } },
    { src: "", alt: "Inter-house basketball final.", hi: { alt: "इंटर-हाउस बास्केटबॉल फ़ाइनल।" } },
    { src: "", alt: "Chemistry laboratory, a Class XI practical.", hi: { alt: "केमिस्ट्री लैब, कक्षा 11 का प्रैक्टिकल।" } },
    { src: "", alt: "The gate at 7:50 on a Monday.", hi: { alt: "सोमवार सुबह 7:50 बजे स्कूल का गेट।" } },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  /* ── STOCK photos (src and category kept on duplicate, alt and caption
        cleared). Captions describe the scene, never the institute. The old
        caption-only list is the `gallery` above. ─────────────────────────── */
  photos: [
    { src: "/demo/img/school/hero-urban-senior-girls-class-800.webp", alt: "Senior schoolgirls in white and red uniforms listening in a full classroom", caption: "A senior class in session", category: "Classrooms", hi: { alt: "सफ़ेद और लाल यूनिफ़ॉर्म में सीनियर छात्राएँ भरी कक्षा में ध्यान से सुन रही हैं", caption: "सीनियर क्लास में पढ़ाई", category: "क्लासरूम" } },
    { src: "/demo/img/school/lab-microscopes-640.webp", alt: "A row of microscopes on a clean science lab bench", caption: "Microscopes ready for a practical", category: "Laboratories", hi: { alt: "साफ़ साइंस लैब की बेंच पर एक कतार में रखे माइक्रोस्कोप", caption: "प्रैक्टिकल के लिए तैयार माइक्रोस्कोप", category: "लैब" } },
    { src: "/demo/img/school/lab-microscope-flask-640.webp", alt: "A microscope and a flask of red liquid on a white lab table", caption: "A chemistry practical set out", category: "Laboratories", hi: { alt: "सफ़ेद लैब टेबल पर माइक्रोस्कोप और लाल तरल से भरा फ़्लास्क", caption: "केमिस्ट्री प्रैक्टिकल की तैयारी", category: "लैब" } },
    { src: "/demo/img/school/library-reading-hall-640.webp", alt: "A bright library with bookshelves and rows of reading tables", caption: "Reading tables in the library", category: "Campus", hi: { alt: "किताबों की अलमारियों और पढ़ने की मेज़ों वाली रोशन लाइब्रेरी", caption: "लाइब्रेरी में पढ़ने की मेज़ें", category: "कैंपस" } },
    { src: "/demo/img/school/sports-basketball-640.webp", alt: "Teenage boys playing basketball on a colourful outdoor court", caption: "Basketball after school", category: "Sports", hi: { alt: "रंगीन आउटडोर कोर्ट पर बास्केटबॉल खेलते किशोर लड़के", caption: "स्कूल के बाद बास्केटबॉल", category: "खेल" } },
    { src: "/demo/img/school/sports-day-race-640.webp", alt: "Young athletes at the start line of a race on a running track", caption: "The start line on sports day", category: "Sports", hi: { alt: "रनिंग ट्रैक पर दौड़ की शुरुआती रेखा पर खड़े युवा धावक", caption: "खेल दिवस पर स्टार्ट लाइन", category: "खेल" } },
    { src: "/demo/img/school/activity-art-session-640.webp", alt: "Girls painting on paper while sitting on the floor in an art session", caption: "An art period on the floor", category: "Events", hi: { alt: "आर्ट सेशन में फ़र्श पर बैठकर काग़ज़ पर पेंटिंग करती लड़कियाँ", caption: "ज़मीन पर बैठकर आर्ट का पीरियड", category: "कार्यक्रम" } },
    { src: "/demo/img/school/yoga-group-640.webp", alt: "Children and teenagers doing yoga together outdoors on mats", caption: "Yoga in the morning", category: "Sports", hi: { alt: "बाहर चटाई पर एक साथ योग करते बच्चे और किशोर", caption: "सुबह का योग", category: "खेल" } },
  ],

  admissionsHeadline: "Registration for 2027-28 is open until 15 December 2026",
  admissions: {
    /* CLEARED */
    dates: "Registration for 2027-28 is open from 1 October to 15 December 2026. The Nursery list is published on 12 January 2027; other classes hear within two weeks of the interaction.",
    /* KEPT, so generic: the process any CBSE day school runs. */
    steps: [
      "Send an enquiry by phone, WhatsApp or email, and ask for the prospectus and the current fee schedule.",
      "Visit on a weekday morning and see an ordinary school day.",
      "Submit the admission form with the documents listed here.",
      "Meet the section head with your child. Older children may sit a short assessment in English and mathematics.",
    ],
    /* KEPT, so generic. */
    documents: [
      "Birth certificate, original and a copy",
      "Transfer certificate from the previous school, for a child changing schools",
      "The most recent report cards",
      "Aadhaar of the child and of a parent",
      "Passport photographs of the child",
    ],
    /* CLEARED */
    note: "Siblings of current pupils apply in the same round. We do not charge a capitation fee and we do not accept donations. If anybody asks you for one in this school's name, call the Principal's office.",
    /* CLEARED: everything below is this school's own. */
    whoCanApply: "Nursery to Class IX, and Class XI in all three streams. Class X and Class XII take no new pupils except on a transfer from another CBSE school.",
    timeline: [
      { title: "Registration opens", date: "1 October 2026", body: "Online, or at the office on weekdays from 9:00 am to 1:00 pm.", hi: { title: "रजिस्ट्रेशन शुरू", date: "1 अक्टूबर 2026", body: "ऑनलाइन, या कार्य-दिवसों में सुबह 9 से दोपहर 1 बजे तक ऑफ़िस में।" } },
      { title: "Campus visits for parents", date: "Saturdays in October and November", body: "A forty-minute walk with a teacher, 9:30 am and 11:00 am. Book on WhatsApp.", hi: { title: "अभिभावकों के लिए कैंपस विज़िट", date: "अक्टूबर और नवंबर के शनिवार", body: "एक टीचर के साथ चालीस मिनट का राउंड, सुबह 9:30 और 11 बजे। WhatsApp पर समय बुक करें।" } },
      { title: "Registration closes", date: "15 December 2026", hi: { title: "रजिस्ट्रेशन बंद", date: "15 दिसंबर 2026" } },
      { title: "Nursery list published", date: "12 January 2027", body: "On this site and on the office noticeboard, by registration number only.", hi: { title: "नर्सरी की सूची जारी", date: "12 जनवरी 2027", body: "इस वेबसाइट पर और ऑफ़िस के नोटिस बोर्ड पर, सिर्फ़ रजिस्ट्रेशन नंबर से।" } },
      { title: "Class I to IX and XI interaction", date: "16 to 23 January 2027", body: "A conversation with the section head. Class VI and above also sit a forty-minute paper in English and mathematics.", hi: { title: "कक्षा 1 से 9 और 11 की बातचीत", date: "16 से 23 जनवरी 2027", body: "सेक्शन हेड के साथ बातचीत। कक्षा 6 और उससे ऊपर के बच्चे इंग्लिश और गणित का चालीस मिनट का पेपर भी देते हैं।" } },
      { title: "Fee deposit and document check", date: "By 15 February 2027", hi: { title: "फीस जमा और डॉक्यूमेंट की जाँच", date: "15 फ़रवरी 2027 तक" } },
    ],
    fees: [
      { label: "Registration", amount: "₹1,500", period: "one-time", note: "Paid with the form. Not refunded.", hi: { label: "रजिस्ट्रेशन", note: "फ़ॉर्म के साथ। वापस नहीं होती।" } },
      { label: "Admission fee", amount: "₹45,000", period: "one-time", note: "Paid once, at joining", hi: { label: "एडमिशन फीस", note: "एक बार, दाख़िले के समय" } },
      { label: "Caution money", amount: "₹10,000", period: "one-time", note: "Refunded in full when the child leaves", hi: { label: "कॉशन मनी", note: "बच्चे के स्कूल छोड़ने पर पूरी वापस" } },
      { label: "Annual charges", amount: "₹34,000", period: "annual", note: "Laboratories, library, sports, the annual health check", hi: { label: "सालाना फीस", note: "लैब, लाइब्रेरी, खेल, सालाना हेल्थ चेकअप" } },
      { label: "Tuition, Nursery to Class V", amount: "₹11,800", period: "monthly", note: "Billed quarterly", hi: { label: "ट्यूशन फीस, नर्सरी से कक्षा 5", note: "हर तिमाही में बिल" } },
      { label: "Tuition, Class VI to X", amount: "₹13,200", period: "monthly", note: "Billed quarterly", hi: { label: "ट्यूशन फीस, कक्षा 6 से 10", note: "हर तिमाही में बिल" } },
      { label: "Tuition, Class XI and XII", amount: "₹14,600", period: "monthly", note: "Billed quarterly", hi: { label: "ट्यूशन फीस, कक्षा 11 और 12", note: "हर तिमाही में बिल" } },
      { label: "School bus", amount: "₹2,900 to ₹4,600", period: "also", note: "Monthly, by distance, only if you use it", hi: { label: "स्कूल बस", amount: "₹2,900 से ₹4,600", note: "हर महीने, दूरी के हिसाब से, सिर्फ़ बस लेने पर" } },
      { label: "Books, notebooks and uniform", amount: "About ₹11,000", period: "also", note: "A year, bought from any shop on the list", hi: { label: "किताबें, कॉपियाँ और यूनिफ़ॉर्म", amount: "लगभग ₹11,000", note: "साल भर का, सूची में दी गई किसी भी दुकान से" } },
      { label: "Science practical fee, Class XI and XII", amount: "₹6,000", period: "also", note: "A year, science stream only", hi: { label: "साइंस प्रैक्टिकल फीस, कक्षा 11 और 12", note: "साल भर की, सिर्फ़ साइंस स्ट्रीम" } },
    ],
    feeNote: "Tuition is billed each quarter, in April, July, October and January. Fees are revised once a year, in April, and never in the middle of a session. A second child pays ten percent less tuition. Every payment gets a receipt.",
    ageRules: [
      { className: "Nursery", minAge: "3", maxAge: "4", hi: { className: "नर्सरी" } },
      { className: "LKG", minAge: "4", maxAge: "5" },
      { className: "UKG", minAge: "5", maxAge: "6" },
      { className: "Class I", minAge: "6", maxAge: "7", hi: { className: "कक्षा 1" } },
    ],
    ageAsOn: "31 March 2027",
    rteNote: "A quarter of the Nursery seats are for children from economically weaker sections and disadvantaged groups under the RTE Act. They are allotted through the Haryana government's online process, not by the school, and they carry no tuition fee.",
    hi: {
      dates: "2027-28 के लिए रजिस्ट्रेशन 1 अक्टूबर से 15 दिसंबर 2026 तक खुला है। नर्सरी की सूची 12 जनवरी 2027 को जारी होगी; बाकी कक्षाओं को बातचीत के दो हफ़्ते के अंदर बता दिया जाता है।",
      note: "मौजूदा बच्चों के भाई-बहन उसी दौर में आवेदन करते हैं। हम कोई कैपिटेशन फीस नहीं लेते और कोई डोनेशन स्वीकार नहीं करते। अगर कोई इस स्कूल के नाम पर डोनेशन माँगे, तो प्रिंसिपल ऑफ़िस में फ़ोन कीजिए।",
      whoCanApply: "नर्सरी से कक्षा 9 तक, और कक्षा 11 में तीनों स्ट्रीम। कक्षा 10 और 12 में नए बच्चे सिर्फ़ किसी दूसरे CBSE स्कूल से ट्रांसफ़र होकर आते हैं।",
      feeNote: "ट्यूशन फीस हर तिमाही, अप्रैल, जुलाई, अक्टूबर और जनवरी में ली जाती है। फीस साल में एक बार अप्रैल में बदलती है, सत्र के बीच में कभी नहीं। दूसरे बच्चे की ट्यूशन फीस दस प्रतिशत कम। हर भुगतान की रसीद मिलती है।",
      rteNote: "RTE Act के तहत नर्सरी की एक चौथाई सीटें आर्थिक रूप से कमज़ोर और वंचित वर्ग के बच्चों के लिए हैं। ये सीटें हरियाणा सरकार की ऑनलाइन प्रक्रिया से मिलती हैं, स्कूल से नहीं, और इन पर कोई ट्यूशन फीस नहीं लगती।",
      steps: [
        "फ़ोन, WhatsApp या ईमेल से पूछताछ कीजिए, और प्रॉस्पेक्टस व इस साल की फीस की सूची माँगिए।",
        "किसी कार्य-दिवस की सुबह आइए और स्कूल का एक आम दिन देखिए।",
        "यहाँ लिखे डॉक्यूमेंट के साथ एडमिशन फ़ॉर्म जमा कीजिए।",
        "बच्चे के साथ सेक्शन हेड से मिलिए। बड़े बच्चे इंग्लिश और गणित का एक छोटा टेस्ट दे सकते हैं।",
      ],
      documents: [
        "जन्म प्रमाणपत्र, असली और एक कॉपी",
        "स्कूल बदलने वाले बच्चे के लिए पिछले स्कूल का ट्रांसफ़र सर्टिफ़िकेट (TC)",
        "सबसे हाल के रिपोर्ट कार्ड",
        "बच्चे और माता या पिता का आधार",
        "बच्चे की पासपोर्ट साइज़ फ़ोटो",
      ],
    },
  },

  /* ── CLEARED: questions. Only the two marked generic survive a duplicate:
        their answers are true of any CBSE day school and name nothing. ──── */
  faq: [
    { title: "Is there a test for Nursery?", body: "No. There is no test and no interview of a child at the entry class. The school may meet the parents to explain how the school day works.", group: "Admissions", generic: true, hi: { title: "क्या नर्सरी के लिए कोई टेस्ट होता है?", body: "नहीं। शुरुआती कक्षा में बच्चे का न कोई टेस्ट होता है, न इंटरव्यू। स्कूल का दिन कैसे चलता है, यह समझाने के लिए स्कूल अभिभावकों से मिल सकता है।", group: "एडमिशन" } },
    { title: "Can we see the school before we apply?", body: "Yes. Ask the office for a visit on a working day, so you see ordinary classes rather than an event.", group: "Admissions", generic: true, hi: { title: "क्या आवेदन से पहले स्कूल देख सकते हैं?", body: "हाँ। किसी कार्य-दिवस पर आने के लिए ऑफ़िस से समय लीजिए, ताकि आप कोई कार्यक्रम नहीं, आम क्लास देखें।", group: "एडमिशन" } },
    { title: "Is the admission fee refunded if we withdraw?", body: "The registration fee is not. The admission fee is refunded in full if you withdraw before 31 March 2027, and the caution money is always refunded.", group: "Fees", hi: { title: "नाम वापस लेने पर क्या एडमिशन फीस लौटती है?", body: "रजिस्ट्रेशन फीस नहीं लौटती। 31 मार्च 2027 से पहले नाम वापस लेने पर एडमिशन फीस पूरी लौटती है, और कॉशन मनी हमेशा लौटती है।", group: "फीस" } },
    { title: "Is the school bus compulsory?", body: "No. About half our pupils come by bus; the rest are dropped by parents or walk. The bus fee is charged only to those who use it.", group: "Transport", hi: { title: "क्या स्कूल बस ज़रूरी है?", body: "नहीं। हमारे लगभग आधे बच्चे बस से आते हैं; बाकी को अभिभावक छोड़ते हैं या वे पैदल आते हैं। बस की फीस सिर्फ़ उन्हीं से ली जाती है जो बस लेते हैं।", group: "ट्रांसपोर्ट" } },
    { title: "Can my child change stream in Class XI?", body: "Within the first four weeks of Class XI, after a meeting with the counsellor and the stream coordinator. After that, not in the same year.", group: "Academics", hi: { title: "क्या कक्षा 11 में स्ट्रीम बदल सकते हैं?", body: "कक्षा 11 के पहले चार हफ़्तों में, काउंसलर और स्ट्रीम कोऑर्डिनेटर से मीटिंग के बाद। उसके बाद उसी साल नहीं।", group: "पढ़ाई" } },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Class XI stream counselling, 21 and 22 October",
      date: "23 September 2026",
      body: "Twenty-minute slots for the child and both parents. The list is on the noticeboard outside the office and on the class WhatsApp groups.",
      pinned: true,
      kind: "notice",
      posted: "2026-09-23",
      expires: "2026-10-22",
      hi: { title: "कक्षा 11 की स्ट्रीम काउंसलिंग, 21 और 22 अक्टूबर", date: "23 सितंबर 2026", body: "बच्चे और माता-पिता दोनों के लिए बीस मिनट का समय। सूची ऑफ़िस के बाहर नोटिस बोर्ड पर और क्लास के WhatsApp ग्रुप पर है।" },
    },
    {
      title: "Half-yearly examination timetable",
      date: "17 September 2026",
      body: "Class VI to XII. Papers begin on 6 October and finish on 17 October.",
      kind: "notice",
      posted: "2026-09-17",
      expires: "2026-10-17",
      hi: { title: "अर्धवार्षिक परीक्षा की डेटशीट", date: "17 सितंबर 2026", body: "कक्षा 6 से 12। परीक्षा 6 अक्टूबर से शुरू होकर 17 अक्टूबर को खत्म होगी।" },
    },
    {
      title: "Dussehra and Diwali breaks",
      date: "10 September 2026",
      body: "School closes on 19 October and reopens on 22 October, then closes on 6 November and reopens on 12 November. The office stays open on weekdays.",
      kind: "notice",
      posted: "2026-09-10",
      expires: "2026-11-12",
      hi: { title: "दशहरा और दिवाली की छुट्टियाँ", date: "10 सितंबर 2026", body: "स्कूल 19 अक्टूबर को बंद होकर 22 अक्टूबर को खुलेगा, फिर 6 नवंबर को बंद होकर 12 नवंबर को खुलेगा। कार्य-दिवसों में ऑफ़िस खुला रहेगा।" },
    },
    {
      title: "Bus route 4 afternoon timing",
      date: "2 September 2026",
      body: "The afternoon pick-up moves to 2:50 pm from 7 September. Route 4 only.",
      kind: "notice",
      posted: "2026-09-02",
      expires: "2026-10-31",
      hi: { title: "बस रूट 4 का दोपहर का समय", date: "2 सितंबर 2026", body: "7 सितंबर से दोपहर में बस 2:50 बजे चलेगी। सिर्फ़ रूट 4।" },
    },
    {
      title: "Admissions open house for 2027-28",
      date: "Saturday 17 October 2026, 10:00 am",
      body: "The Principal speaks for twenty minutes, then section heads take small groups through the primary and senior blocks. No registration needed.",
      kind: "event",
      posted: "2026-09-20",
      expires: "2026-10-17",
      hi: { title: "2027-28 के एडमिशन के लिए ओपन हाउस", date: "शनिवार 17 अक्टूबर 2026, सुबह 10 बजे", body: "प्रिंसिपल बीस मिनट बात करेंगी, फिर सेक्शन हेड छोटे ग्रुप में प्राइमरी और सीनियर ब्लॉक दिखाएँगे। रजिस्ट्रेशन की ज़रूरत नहीं।" },
    },
    {
      title: "Annual sports day",
      date: "Saturday 28 November 2026",
      body: "Heats in the morning, finals from 11:30 am. Parents are welcome on the east stand.",
      kind: "event",
      posted: "2026-09-18",
      expires: "2026-11-28",
      hi: { title: "सालाना खेल दिवस", date: "शनिवार 28 नवंबर 2026", body: "सुबह हीट, 11:30 बजे से फ़ाइनल। अभिभावक पूर्वी स्टैंड पर आ सकते हैं।" },
    },
    {
      title: "Class XII science exhibition",
      date: "Friday 11 December 2026",
      body: "Projects from all three science sections, in the laboratories from 9:00 am to 1:00 pm.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2026-12-11",
      hi: { title: "कक्षा 12 की साइंस प्रदर्शनी", date: "शुक्रवार 11 दिसंबर 2026", body: "साइंस के तीनों सेक्शन के प्रोजेक्ट, लैब में सुबह 9 से दोपहर 1 बजे तक।" },
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "office@example.com",
    addressLines: ["Harsingar Senior Secondary School", "12 Example Road, Sector 4", "Gurugram, Haryana 122000"],
    hours: "Office open Monday to Saturday, 8:00 am to 3:30 pm. Closed on the second Saturday.",
    mapQuery: "Harsingar Senior Secondary School, Gurugram",
    landmark: "Behind the Sector 4 community centre, the second gate after the park",
    transportDesk: "+91 00000 00000",
    hi: { addressLines: ["Harsingar Senior Secondary School", "12 Example Road, सेक्टर 4", "गुरुग्राम, हरियाणा 122000"], hours: "ऑफ़िस सोमवार से शनिवार, सुबह 8 से दोपहर 3:30 बजे तक। दूसरे शनिवार को बंद।", landmark: "सेक्टर 4 कम्युनिटी सेंटर के पीछे, पार्क के बाद दूसरा गेट" },
  },

  /* ── CLEARED: Parents page. Links to a real portal only; example.com in a
        template, so the button shows and goes nowhere that collects anything.
        No login form is ever built on a demo page. ──────────────────────── */
  portalLinks: [
    { label: "Parent portal", url: "https://example.com/parents", audience: "Parents", note: "Attendance, report cards and circulars", hi: { label: "पैरेंट पोर्टल", audience: "अभिभावक", note: "हाज़िरी, रिपोर्ट कार्ड और सर्कुलर" } },
    { label: "Pay fees online", url: "https://example.com/fees", audience: "Parents", note: "Quarterly tuition, with an emailed receipt", hi: { label: "ऑनलाइन फीस भरें", audience: "अभिभावक", note: "तिमाही ट्यूशन फीस, ईमेल पर रसीद के साथ" } },
    { label: "Staff login", url: "https://example.com/staff", audience: "Staff", hi: { label: "स्टाफ़ लॉगिन", audience: "स्टाफ़" } },
  ],
  downloads: [
    { label: "Book list 2026-27", group: "Lists", hi: { label: "किताबों की सूची 2026-27", group: "सूची" } },
    { label: "Holiday list 2026-27", group: "Calendar", hi: { label: "छुट्टियों की सूची 2026-27", group: "कैलेंडर" } },
    { label: "Transfer certificate request form", group: "Forms", hi: { label: "ट्रांसफ़र सर्टिफ़िकेट (TC) के लिए फ़ॉर्म", group: "फ़ॉर्म" } },
    { label: "Bus route change request form", group: "Forms", hi: { label: "बस रूट बदलने का फ़ॉर्म", group: "फ़ॉर्म" } },
  ],

  /* ── CLEARED: Policies page ──────────────────────────────────────────── */
  policies: [
    { title: "Child protection and safeguarding", body: "Every adult on campus, including bus staff and contractors, is police verified before the first day. A child is never alone with one adult behind a closed door. Concerns go to the designated safeguarding lead, the counsellor, within the day, and the POCSO committee meets within a week of any report.", hi: { title: "बच्चों की सुरक्षा", body: "कैंपस में हर वयस्क, बस स्टाफ़ और ठेकेदार भी, पहले दिन से पहले पुलिस से वेरिफ़ाई होता है। कोई बच्चा कभी बंद दरवाज़े के पीछे किसी एक वयस्क के साथ अकेला नहीं रहता। कोई भी चिंता उसी दिन सेफ़गार्डिंग की ज़िम्मेदार, यानी काउंसलर, तक जाती है, और किसी भी शिकायत के एक हफ़्ते के अंदर POCSO कमेटी बैठती है।" } },
    { title: "Anti-bullying", body: "A complaint is logged the day it is made, both families are told within two working days, and the outcome is written down. Repeated bullying after a written warning can lead to withdrawal.", hi: { title: "बुलिंग के ख़िलाफ़ नियम", body: "शिकायत उसी दिन दर्ज होती है, दो कार्य-दिवसों में दोनों परिवारों को बताया जाता है, और फ़ैसला लिखित में होता है। लिखित चेतावनी के बाद भी बुलिंग होने पर बच्चे का नाम काटा जा सकता है।" } },
    { title: "Fee refund and withdrawal", body: "One month's notice in writing, or one month's tuition in lieu. The caution money is refunded within thirty days of the transfer certificate being issued. No fee is charged for a transfer certificate.", hi: { title: "फीस वापसी और नाम कटवाना", body: "एक महीने का लिखित नोटिस, या नोटिस की जगह एक महीने की ट्यूशन फीस। ट्रांसफ़र सर्टिफ़िकेट जारी होने के तीस दिन के अंदर कॉशन मनी लौटा दी जाती है। ट्रांसफ़र सर्टिफ़िकेट की कोई फीस नहीं।" } },
    { title: "Mobile phones", body: "Pupils may carry a phone on the bus. It is handed to the class teacher at the gate and returned at dismissal.", hi: { title: "मोबाइल फ़ोन", body: "बच्चे बस में फ़ोन रख सकते हैं। गेट पर फ़ोन क्लास टीचर को दिया जाता है और छुट्टी के समय लौटाया जाता है।" } },
    { title: "Children's data", body: "We collect what admission and the board require, keep it on school systems in India, and never share it for marketing. A parent can see or correct their child's record by writing to the office.", hi: { title: "बच्चों की जानकारी", body: "हम उतनी ही जानकारी लेते हैं जितनी एडमिशन और बोर्ड को चाहिए, उसे भारत में स्कूल के सिस्टम पर रखते हैं, और मार्केटिंग के लिए कभी साझा नहीं करते। अभिभावक ऑफ़िस को लिखकर अपने बच्चे का रिकॉर्ड देख या ठीक करवा सकते हैं।" } },
  ],

  /* ── CLEARED: Transport page. Routes, stops and timings, never a driver's
        name or number: the transport desk is the contact. ───────────────── */
  transport: {
    intro: "Eleven buses on nine routes, each with a woman attendant. Route changes take effect on the first of the month.",
    routes: [
      { name: "Route 1, DLF Phase 1 to 3", stops: ["Sikanderpur", "DLF Phase 2 market", "Cyber Hub gate", "DLF Phase 3 park"], pickup: "6:55 am", drop: "2:55 pm", hi: { name: "रूट 1, DLF फ़ेज़ 1 से 3", stops: ["सिकंदरपुर", "DLF फ़ेज़ 2 मार्केट", "साइबर हब गेट", "DLF फ़ेज़ 3 पार्क"], pickup: "सुबह 6:55", drop: "दोपहर 2:55" } },
      { name: "Route 2, Sushant Lok and Sector 43", stops: ["Sushant Lok 1 C block", "Sector 43 market", "Sector 45 crossing"], pickup: "7:05 am", drop: "3:00 pm", hi: { name: "रूट 2, सुशांत लोक और सेक्टर 43", stops: ["सुशांत लोक 1 C ब्लॉक", "सेक्टर 43 मार्केट", "सेक्टर 45 क्रॉसिंग"], pickup: "सुबह 7:05", drop: "दोपहर 3:00" } },
      { name: "Route 3, Sohna Road", stops: ["Vatika Chowk", "Sector 49 main road", "Sector 47 Subhash Chowk"], pickup: "7:00 am", drop: "3:05 pm", hi: { name: "रूट 3, सोहना रोड", stops: ["वाटिका चौक", "सेक्टर 49 मेन रोड", "सेक्टर 47 सुभाष चौक"], pickup: "सुबह 7:00", drop: "दोपहर 3:05" } },
      { name: "Route 4, Golf Course Extension", stops: ["Sector 62 crossing", "Sector 61", "Sector 56 Rapid Metro"], pickup: "6:50 am", drop: "2:50 pm", hi: { name: "रूट 4, गोल्फ़ कोर्स एक्सटेंशन", stops: ["सेक्टर 62 क्रॉसिंग", "सेक्टर 61", "सेक्टर 56 रैपिड मेट्रो"], pickup: "सुबह 6:50", drop: "दोपहर 2:50" } },
      { name: "Route 5, Palam Vihar", stops: ["Palam Vihar C block", "Sector 23", "Sector 22 market"], pickup: "6:45 am", drop: "3:10 pm", hi: { name: "रूट 5, पालम विहार", stops: ["पालम विहार C ब्लॉक", "सेक्टर 23", "सेक्टर 22 मार्केट"], pickup: "सुबह 6:45", drop: "दोपहर 3:10" } },
    ],
    safety: [
      "A woman attendant on every bus, every trip",
      "GPS tracking, with the live location on the parent app",
      "CCTV inside the bus and a speed governor set to 40 km/h",
      "A child is handed only to the parent or to an adult on the pick-up card",
      "Buses are yellow, with the school's name and the transport desk number on both sides",
    ],
    feeNote: "₹2,900 to ₹4,600 a month by distance, billed with the quarterly tuition. Changes of route on the first of the month only.",
    hi: {
      intro: "नौ रूट पर ग्यारह बसें, हर बस में एक महिला अटेंडेंट। रूट में बदलाव महीने की पहली तारीख से लागू होता है।",
      feeNote: "दूरी के हिसाब से ₹2,900 से ₹4,600 महीना, तिमाही ट्यूशन फीस के साथ बिल। रूट सिर्फ़ महीने की पहली तारीख को बदलता है।",
      safety: [
        "हर बस में, हर चक्कर में एक महिला अटेंडेंट",
        "GPS ट्रैकिंग, पैरेंट ऐप पर लाइव लोकेशन के साथ",
        "बस के अंदर CCTV, और 40 किलोमीटर प्रति घंटा पर सेट स्पीड गवर्नर",
        "बच्चा सिर्फ़ माता-पिता को या पिक-अप कार्ड पर लिखे वयस्क को सौंपा जाता है",
        "पीली बसें, दोनों तरफ़ स्कूल का नाम और ट्रांसपोर्ट डेस्क का नंबर",
      ],
    },
  },

  /* ── CLEARED: Mandatory Public Disclosure (CBSE Appendix IX). Typed rows
        only; every document row is left empty on purpose, so the page shows
        the designed "To be uploaded" state rather than a fake PDF. The staff
        counts are derived from `faculty[].group`. ──────────────────────── */
  disclosure: {
    lastUpdated: "2026-09-01",
    rows: {
      "school-name": { value: "Harsingar Senior Secondary School" },
      "affiliation-no": { value: "00000000 (example)", hi: { value: "00000000 (उदाहरण)" } },
      "school-code": { value: "00000 (example)", hi: { value: "00000 (उदाहरण)" } },
      address: { value: "12 Example Road, Sector 4, Gurugram, Haryana 122000", hi: { value: "12 Example Road, सेक्टर 4, गुरुग्राम, हरियाणा 122000" } },
      principal: { value: "Meenal Chawla, M.Sc. Mathematics, B.Ed.", hi: { value: "Meenal Chawla, M.Sc. गणित, B.Ed." } },
      email: { value: "office@example.com" },
      phone: { value: "+91 00000 00000" },
      "principal-staff": { value: "1" },
      "teacher-section-ratio": { value: "1.5 to 1", hi: { value: "हर सेक्शन पर 1.5 टीचर" } },
      "special-educator": { value: "One full-time special educator, M.Ed. Special Education, RCI registered", hi: { value: "एक फ़ुल-टाइम स्पेशल एजुकेटर, M.Ed. स्पेशल एजुकेशन, RCI में रजिस्टर्ड" } },
      "counsellor": { value: "One full-time counsellor and wellness teacher, M.A. Psychology", hi: { value: "एक फ़ुल-टाइम काउंसलर और वेलनेस टीचर, M.A. साइकोलॉजी" } },
      "campus-area": { value: "20,230 square metres", hi: { value: "20,230 वर्ग मीटर" } },
      classrooms: { value: "52 classrooms, each about 56 square metres", hi: { value: "52 क्लासरूम, हर एक लगभग 56 वर्ग मीटर" } },
      labs: { value: "Physics, chemistry, biology and computer laboratories, each about 90 square metres", hi: { value: "फिज़िक्स, केमिस्ट्री, बायोलॉजी और कंप्यूटर लैब, हर एक लगभग 90 वर्ग मीटर" } },
      internet: { value: "Yes, fibre", hi: { value: "हाँ, फ़ाइबर" } },
      "girls-toilets": { value: "24" },
      "boys-toilets": { value: "22" },
    },
  },
});
