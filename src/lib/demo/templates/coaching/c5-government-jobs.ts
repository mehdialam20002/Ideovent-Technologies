/**
 * TEMPLATE c5: GOVERNMENT JOB EXAMS: SSC, BANKING, RAILWAY, STATE PSC.
 *
 * Segment: the competition institute in a tier-3 town, one flight up above a
 * market, full of graduates between eighteen and thirty. Many of them work,
 * teach or farm during the day, study Hindi medium, and have already given
 * one or two attempts. They are not parents. They are adults spending their
 * own money, they have been lied to by selection banners before, and they
 * read a coaching site the way they read a notification: dates first.
 *
 * WHAT THIS ASPIRANT ASKS FIRST, in the order the page answers it:
 *   did anybody here actually get selected (results open the page on this
 *   theme, as counts per exam, never a named candidate, with the note saying
 *   how a real list is checked), when does the next batch start (the hero
 *   numeral and the board), is there a batch before or after work, is the
 *   teaching in Hindi, is there a mock every week in the real pattern and
 *   against last year's cut-off, is there a quiet place to study, what the
 *   whole course costs, and when the next notification comes (answered
 *   honestly: from the commission, not from us).
 *
 * Registry: Modern family, `timetable` theme (multi-page), with the next
 * three exams as the hero's data object. The old `marks` single page is
 * frozen for demos already sent. Filed under Rural in the registry because
 * the brief's rural segment is rural or small town.
 *
 * EXAM CALENDAR AND CUT-OFFS ARE LABELLED EXAMPLES. The commission's dates
 * move, and secondary sites disagree about them, so the rows here are marked
 * as example entries and each table names the source a real site copies
 * from (ssc.gov.in, ibps.in, the RRB sites) with a last-updated date.
 *
 * THE INSTITUTE DOES NOT EXIST. A search on 26 September 2026 found no
 * coaching institute called Kasauti Competition Classes. The first name
 * tried, Nishchay, belongs to a real civil services academy and was dropped.
 * Sasaram is a real town in Rohtas district; nothing here is about any real
 * place or person in it. No candidate is named. Contact details are the
 * reserved fiction patterns.
 *
 * WHAT A DUPLICATE KEEPS: the six batch names, eligibility lines, subjects,
 * timings and mode, the week without teachers and rooms, and the three FAQs
 * marked generic. Bihar's own exams (BPSC, BSSC) are named only in `detail`,
 * which is cleared, so a duplicate for an institute in another state keeps a
 * batch called "State PSC and state exams" and nothing Bihar-specific.
 * Its name avoids the letters "SSC" on purpose: the board chips a batch
 * with any focus area its name contains, and "state SSC" read as SSC.
 */

import { defineTemplateContent } from "../shape";
import { COACHING_PAGE_SETS } from "../../site/pageSets";

export default defineTemplateContent("coaching", {
  /* ── KEPT: which pages this segment has. ─────────────────────────────── */
  sitePages: [...COACHING_PAGE_SETS["c5-government-jobs"], "gallery"],

  /* ── KEPT: stock photographs (public/demo/img, see ../shape.ts). Licensed
        models and rooms standing in for the institute; the alt text comes
        from the manifest and describes the scene. A duplicate carries these
        paths, and the admin checklist says so until the hero is replaced. */
  heroImage: "/demo/img/coaching/c5-hero-library-reader-800.webp",
  sectionPhotos: {
    courses: "/demo/img/coaching/c1-lecture-hall-640.webp",
    admissions: "/demo/img/coaching/c5-reading-room-640.webp",
    study: "/demo/img/coaching/c1-self-study-640.webp",
  },

  /* ── CLEARED: identity ───────────────────────────────────────────────── */
  instituteName: "Kasauti Competition Classes",
  tagline: "A batch before work and a batch after it, a full mock every Sunday in the real exam pattern, and a study hall open from 6 am to 10 pm.",
  city: "Sasaram",
  state: "Bihar",

  /* ── KEPT: market, language, currency, and what is taught ────────────── */
  country: "India",
  market: "india",
  currency: "INR",
  /* "SSC, Banking and Railway coaching in Sasaram". The three words also
     chip the batches that carry them on the departure board. */
  focusAreas: ["SSC", "Banking", "Railway"],

  /* ── CLEARED: history ────────────────────────────────────────────────── */
  established: "Since 2012",
  establishedYear: "2012",
  boardOrAffiliation: "A private coaching institute. Not connected to the SSC, IBPS, the railway recruitment boards or any state commission, and we do not claim to be.",

  about:
    "Kasauti Competition Classes has prepared students in Sasaram for SSC, bank and railway exams since 2012. Most of our students are graduates from Rohtas and the districts around it, and many of them work or teach during the day, which is why the SSC course runs twice, before work and after it. Every class is taught in Hindi and English together. The study hall upstairs is open from 6 am to 10 pm with power backup, because a quiet, lit desk is what most of our students do not have at home.",

  hi: {
    tagline: "काम से पहले एक बैच और काम के बाद एक, हर रविवार असली पैटर्न में पूरा मॉक, और सुबह 6 से रात 10 बजे तक खुला स्टडी हॉल।",
    established: "2012 से",
    boardOrAffiliation: "एक निजी कोचिंग संस्थान। SSC, IBPS, रेलवे भर्ती बोर्ड या किसी राज्य आयोग से कोई संबंध नहीं, और हम ऐसा दावा भी नहीं करते।",
    focusAreas: ["SSC", "बैंकिंग", "रेलवे"],
    city: "सासाराम",
    state: "बिहार",
    about: "कसौटी कॉम्पिटिशन क्लासेज़ 2012 से सासाराम में SSC, बैंक और रेलवे परीक्षाओं की तैयारी करवा रही है। हमारे ज़्यादातर विद्यार्थी रोहतास और आसपास के ज़िलों के स्नातक हैं, और कई दिन में काम करते हैं। हर क्लास हिंदी और अंग्रेज़ी दोनों में होती है।",
    resultsHeading: "पिछले बारह महीनों के चयन",
    scheduleNote: "स्टडी हॉल हर दिन खुला है, रविवार भी, पावर बैकअप के साथ। आख़िरी क्लास रात 8:30 बजे ख़त्म होती है।",
    classSizePromise: "एक बैच में साठ से ज़्यादा नहीं, बैंकिंग में पचास, राज्य परीक्षाओं में चालीस।",
    mission: "ईमानदार गिनती, असली पैटर्न में हर हफ़्ते मॉक, और हिंदी माध्यम को पूरा सम्मान।",
    resultsNote: "यहाँ की हर संख्या और स्कोर उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि सिलेक्शन लिस्ट कैसे लगती है। असली लिस्ट हर चुने गए उम्मीदवार के रोल नंबर के साथ लगती है, जिसे कोई भी आयोग के अपने रिज़ल्ट से मिला सकता है, और नाम या फ़ोटो तभी जब उम्मीदवार लिखकर सहमति दे।",
  },

  /* ── CLEARED: the About page. ─────────────────────────────────────────── */
  classSizePromise: "Never more than sixty to a batch; fifty in banking and forty in state exams.",
  mission: "Honest counts, a mock every week in the real pattern, and Hindi medium treated as first class.",
  founder: {
    name: "Santosh Kumar Singh",
    role: "Founder and quant teacher",
    story: "I gave SSC three times from Sasaram and travelled to Patna for coaching each time, spending money my family did not have. In 2012 I started a maths class in one room above the market so that nobody here would need to. The rule I set then still holds: we print a selection only with the roll number, and we never promise one.",
    hi: { role: "संस्थापक और गणित शिक्षक", story: "मैंने सासाराम से तीन बार SSC दिया और हर बार कोचिंग के लिए पटना गया, उस पैसे से जो परिवार के पास नहीं था। 2012 में बाज़ार के ऊपर एक कमरे में गणित की क्लास शुरू की ताकि यहाँ किसी को जाना न पड़े। तब का नियम आज भी है: चयन सिर्फ़ रोल नंबर के साथ छापते हैं, और कभी वादा नहीं करते।" },
  },
  stats: [
    { value: "121", label: "Final selections, all exams", basis: "Results declared October 2024 to September 2025, each checked against the commission's list", hi: { label: "अंतिम चयन, सभी परीक्षाएँ", basis: "अक्टूबर 2024 से सितंबर 2025 तक घोषित रिज़ल्ट, हर एक आयोग की सूची से मिलाया" } },
    { value: "24", label: "Full mocks a season, on computers", basis: "Sunday series, October to March", hi: { label: "हर सीज़न में कंप्यूटर पर पूरे मॉक", basis: "रविवार सीरीज़, अक्टूबर से मार्च" } },
    { value: "16", label: "Hours a day the study hall is open", basis: "6:00 am to 10:00 pm, every day", hi: { label: "स्टडी हॉल रोज़ इतने घंटे खुला", basis: "सुबह 6:00 से रात 10:00, हर दिन" } },
  ],
  joining: [
    { title: "Attend three days free", body: "Sit in on the batch you want and take that week's Sunday mock.", hi: { title: "तीन दिन मुफ़्त", body: "जिस बैच में आना है उसमें बैठिए और उस हफ़्ते का रविवार मॉक दीजिए।" } },
    { title: "Pick morning, evening or both", body: "Move between the two SSC batches in any week your shifts change.", hi: { title: "सुबह, शाम या दोनों", body: "जिस हफ़्ते शिफ़्ट बदले, दोनों SSC बैच में आ-जा सकते हैं।" } },
    { title: "Pay the first instalment", body: "It holds your seat. The rest is in two parts, with a receipt each time.", hi: { title: "पहली किस्त", body: "इससे सीट पक्की होती है। बाक़ी दो हिस्सों में, हर बार रसीद।" } },
  ],
  reviews: [
    { quote: "I work at a petrol pump until 5. The evening batch and the Sunday mock were the only way I could prepare.", relation: "Student, SSC evening batch, CHSL 2025", consent: true, category: "SSC", hi: { category: "SSC", quote: "मैं 5 बजे तक पेट्रोल पंप पर काम करता हूँ। शाम की बैच और रविवार का मॉक ही तैयारी का रास्ता था।", relation: "विद्यार्थी, SSC शाम की बैच, CHSL 2025" } },
    { quote: "Every Sunday the sheet told me how far I was from last year's OBC cut-off. By February the gap was gone.", relation: "Student, SSC morning batch, CGL 2025", consent: true, category: "SSC", hi: { category: "SSC", quote: "हर रविवार शीट बताती थी कि मैं पिछले साल के OBC कट-ऑफ़ से कितना दूर हूँ। फ़रवरी तक दूरी ख़त्म।", relation: "विद्यार्थी, SSC सुबह की बैच, CGL 2025" } },
    { quote: "Everything was taught in Hindi and English both. Nobody made me feel Hindi medium was a weakness.", relation: "Student, Railway batch, Group D 2025", consent: true, category: "Railway", hi: { category: "रेलवे", quote: "सब कुछ हिंदी और अंग्रेज़ी दोनों में पढ़ाया गया। किसी ने हिंदी माध्यम को कमज़ोरी नहीं समझा।", relation: "विद्यार्थी, रेलवे बैच, Group D 2025" } },
  ],

  /* ── CLEARED: exam calendar, previous cut-offs and eligibility. EXAMPLE
        ENTRIES, each table with the source a real site copies from. ──── */
  govExams: {
    calendar: [
      { exam: "SSC GD Constable 2027", notification: "Example: October 2026", examDate: "Example: January to March 2027", hi: { notification: "उदाहरण: अक्टूबर 2026", examDate: "उदाहरण: जनवरी से मार्च 2027" } },
      { exam: "RRB NTPC, graduate posts", notification: "Example: November 2026", examDate: "Example: March to April 2027", hi: { exam: "RRB NTPC, ग्रेजुएट पद", notification: "उदाहरण: नवंबर 2026", examDate: "उदाहरण: मार्च से अप्रैल 2027" } },
      { exam: "IBPS Clerk", notification: "Example: August 2027", examDate: "Example: prelims in October 2027", hi: { notification: "उदाहरण: अगस्त 2027", examDate: "उदाहरण: अक्टूबर 2027 में प्रीलिम्स" } },
      { exam: "SSC CHSL 2027", notification: "Example: April 2027", examDate: "Example: July to September 2027", hi: { notification: "उदाहरण: अप्रैल 2027", examDate: "उदाहरण: जुलाई से सितंबर 2027" } },
      { exam: "SSC CGL 2027", notification: "Example: May 2027", examDate: "Example: Tier 1 in June to July 2027", hi: { notification: "उदाहरण: मई 2027", examDate: "उदाहरण: Tier 1 जून से जुलाई 2027 में" } },
    ],
    calendarSource: "Example entries placed by Ideovent. A real site copies these from the SSC's tentative calendar at ssc.gov.in, the IBPS calendar at ibps.in and the RRB notices, and the dates move, so plan from the notification itself.",
    calendarUpdated: "26 September 2026",
    cutoffs: [
      { exam: "SSC CGL Tier 1", year: "2025", category: "UR", cutoff: "Example: 150.2", hi: { cutoff: "उदाहरण: 150.2" } },
      { exam: "SSC CGL Tier 1", year: "2025", category: "OBC", cutoff: "Example: 146.8", hi: { cutoff: "उदाहरण: 146.8" } },
      { exam: "SSC CGL Tier 1", year: "2025", category: "EWS", cutoff: "Example: 142.1", hi: { cutoff: "उदाहरण: 142.1" } },
      { exam: "SSC CGL Tier 1", year: "2025", category: "SC", cutoff: "Example: 128.4", hi: { cutoff: "उदाहरण: 128.4" } },
      { exam: "SSC CGL Tier 1", year: "2025", category: "ST", cutoff: "Example: 119.6", hi: { cutoff: "उदाहरण: 119.6" } },
      { exam: "SSC CHSL Tier 1", year: "2025", category: "UR", cutoff: "Example: 162.5", hi: { cutoff: "उदाहरण: 162.5" } },
      { exam: "SSC CHSL Tier 1", year: "2025", category: "OBC", cutoff: "Example: 159.0", hi: { cutoff: "उदाहरण: 159.0" } },
      { exam: "IBPS Clerk prelims, Bihar", year: "2025", category: "UR", cutoff: "Example: 81.5", hi: { exam: "IBPS Clerk प्रीलिम्स, बिहार", cutoff: "उदाहरण: 81.5" } },
      { exam: "IBPS Clerk prelims, Bihar", year: "2025", category: "OBC", cutoff: "Example: 80.0", hi: { exam: "IBPS Clerk प्रीलिम्स, बिहार", cutoff: "उदाहरण: 80.0" } },
    ],
    cutoffSource: "Example figures placed by Ideovent. A real site copies each cut-off from the commission's own result notice (ssc.gov.in, ibps.in) and names the notice.",
    hi: { calendarSource: "Ideovent के रखे उदाहरण। असली साइट ये तारीख़ें ssc.gov.in पर SSC के संभावित कैलेंडर, ibps.in पर IBPS के कैलेंडर और RRB के नोटिस से लेती है, और तारीख़ें खिसकती हैं, इसलिए तैयारी नोटिफ़िकेशन देखकर कीजिए।", calendarUpdated: "26 सितंबर 2026", cutoffSource: "Ideovent के रखे उदाहरण के आँकड़े। असली साइट हर कट-ऑफ़ आयोग के अपने रिज़ल्ट नोटिस (ssc.gov.in, ibps.in) से लेती है और उस नोटिस का नाम लिखती है।" },
    eligibility: [
      { exam: "SSC CGL", age: "18 to 32, varies by post", qualification: "A bachelor's degree", hi: { age: "18 से 32, पद के हिसाब से अलग", qualification: "ग्रेजुएशन की डिग्री" } },
      { exam: "SSC CHSL", age: "18 to 27", qualification: "12th pass", hi: { age: "18 से 27", qualification: "12वीं पास" } },
      { exam: "SSC MTS", age: "18 to 25, or 18 to 27 for Havaldar", qualification: "10th pass", hi: { age: "18 से 25, हवलदार के लिए 18 से 27", qualification: "10वीं पास" } },
      { exam: "IBPS PO", age: "20 to 30", qualification: "A bachelor's degree", hi: { age: "20 से 30", qualification: "ग्रेजुएशन की डिग्री" } },
      { exam: "IBPS Clerk", age: "20 to 28", qualification: "A bachelor's degree", hi: { age: "20 से 28", qualification: "ग्रेजुएशन की डिग्री" } },
      { exam: "RRB Group D", age: "18 and above; upper limit as in the notification", qualification: "10th pass or ITI", hi: { age: "18 और उससे ऊपर; ऊपरी सीमा नोटिफ़िकेशन के अनुसार", qualification: "10वीं पास या ITI" } },
    ],
  },

  /* ── STRUCTURE: the departure board. Name, level (the eligibility line),
        subjects, duration, timings and mode are KEPT; batchStarts, seats,
        fee, feeNote and detail are CLEARED. Every fee is for the whole
        course, books and mocks included, because an aspirant compares the
        total, not a monthly figure. The board does not print `duration`, so
        each detail opens with the length. The mock series keeps its price
        out of `fee`. The first batch is also the soonest: the hero sets its
        start date as the numeral. ─────────────────────────────────────── */
  courses: [
    {
      name: "SSC CGL and CHSL, morning batch",
      level: "Graduates, or 12th pass for CHSL",
      subjects: "Maths, reasoning, English, general awareness",
      duration: "6 months",
      timings: "Mon to Sat, 7:00 to 9:30 am",
      mode: "Classroom, Hindi and English medium",
      batchStarts: "Starts 12 October 2026",
      seats: "60 per batch",
      fee: "9,500",
      feeNote: "for the whole course",
      detail: "Six months, the whole Tier 1 and Tier 2 syllabus. Typing and computer practice for the skill test starts in the third month, in the computer room.",
      slug: "ssc-morning",
      category: "SSC",
      eligibility: "A graduate for CGL; 12th pass for CHSL. Age limits are in the eligibility table and in each notification.",
      syllabus: [
        { title: "Quantitative aptitude", body: "Arithmetic, algebra, geometry, mensuration, trigonometry, data interpretation.", hi: { title: "क्वांटिटेटिव एप्टीट्यूड", body: "अंकगणित, बीजगणित, ज्यामिति, क्षेत्रमिति, त्रिकोणमिति, डेटा इंटरप्रिटेशन।" } },
        { title: "Reasoning", body: "Verbal and non-verbal reasoning, coding, series, puzzles, syllogism.", hi: { title: "रीज़निंग", body: "वर्बल और नॉन-वर्बल रीज़निंग, कोडिंग, सीरीज़, पज़ल, सिलॉजिज़्म।" } },
        { title: "English", body: "Grammar, vocabulary, comprehension, cloze test, error spotting.", hi: { title: "इंग्लिश", body: "ग्रामर, वोकैबुलरी, कॉम्प्रिहेंशन, क्लोज़ टेस्ट, एरर स्पॉटिंग।" } },
        { title: "General awareness", body: "History, polity, geography, economy, science, and twelve months of current affairs.", hi: { title: "जनरल अवेयरनेस", body: "इतिहास, राजव्यवस्था, भूगोल, अर्थव्यवस्था, विज्ञान, और बारह महीने का करेंट अफ़ेयर्स।" } },
        { title: "Skill test", body: "Typing and computer practice in the computer room from the third month.", hi: { title: "स्किल टेस्ट", body: "तीसरे महीने से कंप्यूटर रूम में टाइपिंग और कंप्यूटर का अभ्यास।" } },
      ],
      material: ["Printed notes, Hindi and English","Previous-year papers, solved","Monthly current affairs booklet"],
      testPlan: "A sectional test every Wednesday and a full mock on computers every Sunday.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat", hi: { label: "एडमिशन के समय", note: "सीट पक्की होती है" } },
        { label: "Second instalment", amount: "3,000", note: "After two months", hi: { label: "दूसरी किस्त", note: "दो महीने बाद" } },
        { label: "Third instalment", amount: "2,500", note: "After four months", hi: { label: "तीसरी किस्त", note: "चार महीने बाद" } },
      ],
      inclusions: ["Printed notes in Hindi and English","Every Sunday mock","Study hall seat","Typing practice"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Santosh Kumar Singh","Ravi Ranjan","Priyanka Kumari","Md. Shahid Anwar"],
      faq: [
        { title: "Can I switch to the evening batch?", body: "Yes, in any week your shifts change. Tell the desk the day before.", hi: { title: "क्या मैं शाम के बैच में जा सकता हूँ?", body: "हाँ, जिस भी हफ़्ते आपकी शिफ़्ट बदले। एक दिन पहले डेस्क पर बता दीजिए।" } },
      ],
      hi: { seats: "हर बैच में 60", material: ["छपे हुए नोट्स, हिंदी और इंग्लिश", "पिछले साल के पेपर, हल सहित", "हर महीने करेंट अफ़ेयर्स की बुकलेट"], inclusions: ["हिंदी और इंग्लिश में छपे नोट्स", "हर रविवार का मॉक", "स्टडी हॉल में सीट", "टाइपिंग की प्रैक्टिस"], name: "SSC CGL और CHSL, सुबह की बैच", detail: "छह महीने, Tier 1 और Tier 2 का पूरा सिलेबस। स्किल टेस्ट के लिए टाइपिंग और कंप्यूटर अभ्यास तीसरे महीने से।", feeNote: "पूरे कोर्स के लिए", eligibility: "CGL के लिए स्नातक; CHSL के लिए 12वीं पास। आयु सीमा योग्यता टेबल और हर नोटिफ़िकेशन में।", level: "ग्रेजुएट, या CHSL के लिए 12वीं पास", subjects: "मैथ्स, रीज़निंग, इंग्लिश, जनरल अवेयरनेस", duration: "6 महीने", timings: "सोमवार से शनिवार, सुबह 7 से 9:30 बजे", mode: "क्लासरूम, हिंदी और इंग्लिश मीडियम", batchStarts: "12 अक्टूबर 2026 से शुरू", category: "SSC", testPlan: "हर बुधवार सेक्शनल टेस्ट और हर रविवार कंप्यूटर पर पूरा मॉक।", refundNote: "दस दिन पहले लिखकर बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
    },
    {
      name: "SSC CGL and CHSL, evening batch",
      level: "Graduates, or 12th pass for CHSL",
      subjects: "Maths, reasoning, English, general awareness",
      duration: "6 months",
      timings: "Mon to Sat, 6:00 to 8:30 pm",
      mode: "Classroom, Hindi and English medium",
      batchStarts: "Starts 19 October 2026",
      seats: "60 per batch",
      fee: "9,500",
      feeNote: "for the whole course",
      detail: "Six months, the same syllabus and the same teachers as the morning batch, for those who work during the day. A class missed in the evening can be sat in the next morning.",
      slug: "ssc-evening",
      category: "SSC",
      eligibility: "A graduate for CGL; 12th pass for CHSL. Built for those who work during the day.",
      syllabus: [
        { title: "Quantitative aptitude", body: "Arithmetic, algebra, geometry, mensuration, trigonometry, data interpretation.", hi: { title: "क्वांटिटेटिव एप्टीट्यूड", body: "अंकगणित, बीजगणित, ज्यामिति, क्षेत्रमिति, त्रिकोणमिति, डेटा इंटरप्रिटेशन।" } },
        { title: "Reasoning", body: "Verbal and non-verbal reasoning, coding, series, puzzles, syllogism.", hi: { title: "रीज़निंग", body: "वर्बल और नॉन-वर्बल रीज़निंग, कोडिंग, सीरीज़, पज़ल, सिलॉजिज़्म।" } },
        { title: "English", body: "Grammar, vocabulary, comprehension, cloze test, error spotting.", hi: { title: "इंग्लिश", body: "ग्रामर, वोकैबुलरी, कॉम्प्रिहेंशन, क्लोज़ टेस्ट, एरर स्पॉटिंग।" } },
        { title: "General awareness", body: "History, polity, geography, economy, science, and twelve months of current affairs.", hi: { title: "जनरल अवेयरनेस", body: "इतिहास, राजव्यवस्था, भूगोल, अर्थव्यवस्था, विज्ञान, और बारह महीने का करेंट अफ़ेयर्स।" } },
        { title: "Skill test", body: "Typing and computer practice in the computer room from the third month.", hi: { title: "स्किल टेस्ट", body: "तीसरे महीने से कंप्यूटर रूम में टाइपिंग और कंप्यूटर का अभ्यास।" } },
      ],
      material: ["Printed notes, Hindi and English","Previous-year papers, solved","Monthly current affairs booklet"],
      testPlan: "A sectional test every Wednesday and a full mock on computers every Sunday.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat", hi: { label: "एडमिशन के समय", note: "सीट पक्की होती है" } },
        { label: "Second instalment", amount: "3,000", note: "After two months", hi: { label: "दूसरी किस्त", note: "दो महीने बाद" } },
        { label: "Third instalment", amount: "2,500", note: "After four months", hi: { label: "तीसरी किस्त", note: "चार महीने बाद" } },
      ],
      inclusions: ["Printed notes in Hindi and English","Every Sunday mock","Study hall seat","Typing practice"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Santosh Kumar Singh","Ravi Ranjan","Priyanka Kumari","Md. Shahid Anwar"],
      hi: { seats: "हर बैच में 60", material: ["छपे हुए नोट्स, हिंदी और इंग्लिश", "पिछले साल के पेपर, हल सहित", "हर महीने करेंट अफ़ेयर्स की बुकलेट"], inclusions: ["हिंदी और इंग्लिश में छपे नोट्स", "हर रविवार का मॉक", "स्टडी हॉल में सीट", "टाइपिंग की प्रैक्टिस"], name: "SSC CGL और CHSL, शाम की बैच", detail: "छह महीने, सुबह वाला ही सिलेबस और वही शिक्षक, दिन में काम करने वालों के लिए। शाम की छूटी क्लास अगली सुबह बैठ सकते हैं।", feeNote: "पूरे कोर्स के लिए", level: "ग्रेजुएट, या CHSL के लिए 12वीं पास", subjects: "मैथ्स, रीज़निंग, इंग्लिश, जनरल अवेयरनेस", duration: "6 महीने", timings: "सोमवार से शनिवार, शाम 6 से रात 8:30 बजे", mode: "क्लासरूम, हिंदी और इंग्लिश मीडियम", batchStarts: "19 अक्टूबर 2026 से शुरू", category: "SSC", eligibility: "CGL के लिए ग्रेजुएट; CHSL के लिए 12वीं पास। दिन में नौकरी करने वालों के लिए बना बैच।", testPlan: "हर बुधवार सेक्शनल टेस्ट और हर रविवार कंप्यूटर पर पूरा मॉक।", refundNote: "दस दिन पहले लिखकर बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
    },
    {
      name: "Banking: IBPS and SBI, PO and Clerk",
      level: "Graduates",
      subjects: "Quant, reasoning, English, banking and financial awareness",
      duration: "6 months",
      timings: "Mon to Sat, 10:00 am to 12:30 pm",
      mode: "Classroom, Hindi and English medium",
      batchStarts: "Starts 26 October 2026",
      seats: "50 per batch",
      fee: "11,000",
      feeNote: "for the whole course",
      detail: "Six months, prelims and mains. PO candidates who clear the mains sit a mock interview panel at the centre before the real one.",
      slug: "banking",
      category: "Banking",
      eligibility: "A graduate in any subject. Age limits are in the eligibility table.",
      syllabus: [
        { title: "Quantitative aptitude", body: "Simplification, number series, data interpretation, arithmetic.", hi: { title: "क्वांटिटेटिव एप्टीट्यूड", body: "सरलीकरण, नंबर सीरीज़, डेटा इंटरप्रिटेशन, अंकगणित।" } },
        { title: "Reasoning", body: "Puzzles, seating arrangement, inequality, coding, syllogism.", hi: { title: "रीज़निंग", body: "पज़ल, सीटिंग अरेंजमेंट, इनइक्वालिटी, कोडिंग, सिलॉजिज़्म।" } },
        { title: "English", body: "Reading comprehension, cloze, para-jumbles, error detection.", hi: { title: "इंग्लिश", body: "रीडिंग कॉम्प्रिहेंशन, क्लोज़, पैरा-जम्बल, एरर डिटेक्शन।" } },
        { title: "Banking and financial awareness", body: "RBI, monetary policy, banking terms, the last six months of banking news.", hi: { title: "बैंकिंग और फ़ाइनेंशियल अवेयरनेस", body: "RBI, मौद्रिक नीति, बैंकिंग के शब्द, पिछले छह महीने की बैंकिंग ख़बरें।" } },
        { title: "Interview", body: "Mock panels for PO candidates who clear the mains.", hi: { title: "इंटरव्यू", body: "मेन्स पास करने वाले PO उम्मीदवारों के लिए मॉक पैनल।" } },
      ],
      material: ["Printed notes","Previous-year prelims and mains papers","Banking awareness capsule, monthly"],
      testPlan: "A sectional test every Tuesday and a full prelims or mains mock on Sunday in rotation.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat", hi: { label: "एडमिशन के समय", note: "सीट पक्की होती है" } },
        { label: "Second instalment", amount: "4,000", note: "After two months", hi: { label: "दूसरी किस्त", note: "दो महीने बाद" } },
        { label: "Third instalment", amount: "3,000", note: "After four months", hi: { label: "तीसरी किस्त", note: "चार महीने बाद" } },
      ],
      inclusions: ["Printed notes","Every mock","Mock interview panel","Study hall seat"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Abhishek Pandey","Ravi Ranjan","Priyanka Kumari"],
      hi: { seats: "हर बैच में 50", material: ["छपे हुए नोट्स", "पिछले साल के प्रीलिम्स और मेन्स पेपर", "बैंकिंग अवेयरनेस कैप्सूल, हर महीने"], inclusions: ["छपे हुए नोट्स", "हर मॉक", "मॉक इंटरव्यू पैनल", "स्टडी हॉल में सीट"], name: "बैंकिंग: IBPS और SBI, PO और क्लर्क", detail: "छह महीने, प्रीलिम्स और मेन्स। मेन्स पास करने वाले PO उम्मीदवार असली इंटरव्यू से पहले सेंटर पर मॉक पैनल के सामने बैठते हैं।", feeNote: "पूरे कोर्स के लिए", level: "ग्रेजुएट", subjects: "क्वांट, रीज़निंग, इंग्लिश, बैंकिंग और फ़ाइनेंशियल अवेयरनेस", duration: "6 महीने", timings: "सोमवार से शनिवार, सुबह 10 से दोपहर 12:30 बजे", mode: "क्लासरूम, हिंदी और इंग्लिश मीडियम", batchStarts: "26 अक्टूबर 2026 से शुरू", category: "बैंकिंग", eligibility: "किसी भी विषय में ग्रेजुएट। उम्र की सीमा योग्यता वाली टेबल में है।", testPlan: "हर मंगलवार सेक्शनल टेस्ट, और रविवार को बारी-बारी से प्रीलिम्स या मेन्स का पूरा मॉक।", refundNote: "दस दिन पहले लिखकर बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
    },
    {
      name: "Railway NTPC and Group D",
      level: "10th pass and above",
      subjects: "Maths, reasoning, general science, general awareness",
      duration: "5 months",
      timings: "Mon to Sat, 2:00 to 4:30 pm",
      mode: "Classroom, Hindi and English medium",
      batchStarts: "Starts 23 November 2026",
      seats: "60 per batch",
      fee: "7,500",
      feeNote: "for the whole course",
      detail: "Five months. An extra half-hour of general science three days a week for Group D, which carries more of it than NTPC.",
      slug: "railway",
      category: "Railway",
      eligibility: "10th pass for Group D; 12th pass or graduate for NTPC, by post.",
      syllabus: [
        { title: "Mathematics", body: "Number system, percentage, ratio, time and work, mensuration, simple algebra.", hi: { title: "मैथ्स", body: "संख्या पद्धति, प्रतिशत, अनुपात, समय और काम, क्षेत्रमिति, सरल बीजगणित।" } },
        { title: "Reasoning", body: "Analogy, series, coding, puzzles, Venn diagrams.", hi: { title: "रीज़निंग", body: "एनालॉजी, सीरीज़, कोडिंग, पज़ल, वेन डायग्राम।" } },
        { title: "General science", body: "Class 10 level physics, chemistry and biology, with the extra half-hour for Group D.", hi: { title: "जनरल साइंस", body: "10वीं लेवल की फिज़िक्स, केमिस्ट्री और बायोलॉजी, Group D के लिए आधा घंटा ज़्यादा।" } },
        { title: "General awareness", body: "Current affairs, Indian railways, history, geography, polity.", hi: { title: "जनरल अवेयरनेस", body: "करेंट अफ़ेयर्स, भारतीय रेलवे, इतिहास, भूगोल, राजव्यवस्था।" } },
      ],
      material: ["Printed notes, Hindi and English","Previous-year RRB papers"],
      testPlan: "A full RRB-pattern mock every Sunday in rotation.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat", hi: { label: "एडमिशन के समय", note: "सीट पक्की होती है" } },
        { label: "Second instalment", amount: "3,500", note: "After two months", hi: { label: "दूसरी किस्त", note: "दो महीने बाद" } },
      ],
      inclusions: ["Printed notes","Every Sunday mock","Study hall seat"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Santosh Kumar Singh","Ravi Ranjan","Md. Shahid Anwar"],
      hi: { seats: "हर बैच में 60", material: ["छपे हुए नोट्स, हिंदी और इंग्लिश", "पिछले साल के RRB पेपर"], inclusions: ["छपे हुए नोट्स", "हर रविवार का मॉक", "स्टडी हॉल में सीट"], category: "रेलवे", name: "रेलवे NTPC और Group D", detail: "पाँच महीने। Group D के लिए हफ़्ते में तीन दिन जनरल साइंस का आधा घंटा अतिरिक्त।", feeNote: "पूरे कोर्स के लिए", level: "10वीं पास और उससे ऊपर", subjects: "मैथ्स, रीज़निंग, जनरल साइंस, जनरल अवेयरनेस", duration: "5 महीने", timings: "सोमवार से शनिवार, दोपहर 2 से 4:30 बजे", mode: "क्लासरूम, हिंदी और इंग्लिश मीडियम", batchStarts: "23 नवंबर 2026 से शुरू", eligibility: "Group D के लिए 10वीं पास; NTPC के लिए पोस्ट के हिसाब से 12वीं पास या ग्रेजुएट।", testPlan: "हर रविवार बारी-बारी से RRB पैटर्न का पूरा मॉक।", refundNote: "दस दिन पहले लिखकर बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
    },
    {
      name: "State PSC and state exams, general studies",
      level: "Graduates",
      subjects: "History, geography, polity, economy, current affairs",
      duration: "4 months",
      timings: "Mon, Wed, Fri, 4:30 to 6:00 pm",
      mode: "Classroom, Hindi and English medium",
      batchStarts: "Starts 7 December 2026",
      seats: "40 per batch",
      fee: "8,000",
      feeNote: "for the whole course",
      detail: "Four months, written for BPSC prelims and the BSSC inter-level exam: Bihar's history, geography and economy, and the last twelve months of current affairs.",
      slug: "state-exams",
      category: "State exams",
      eligibility: "A graduate. Age and domicile rules are in each commission's notification.",
      syllabus: [
        { title: "History and culture", body: "Ancient to modern, with the state's own history.", hi: { title: "इतिहास और संस्कृति", body: "प्राचीन से आधुनिक तक, राज्य के अपने इतिहास के साथ।" } },
        { title: "Geography", body: "India and the state: rivers, soils, agriculture, industry.", hi: { title: "भूगोल", body: "भारत और राज्य: नदियाँ, मिट्टी, खेती, उद्योग।" } },
        { title: "Polity and economy", body: "The Constitution, local government, the state economy and budget.", hi: { title: "राजव्यवस्था और अर्थव्यवस्था", body: "संविधान, स्थानीय शासन, राज्य की अर्थव्यवस्था और बजट।" } },
        { title: "Current affairs", body: "The last twelve months, national and state.", hi: { title: "करेंट अफ़ेयर्स", body: "पिछले बारह महीने, देश और राज्य।" } },
      ],
      material: ["Printed notes in Hindi","Previous-year papers, solved"],
      testPlan: "A general studies mock every second Sunday.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat", hi: { label: "एडमिशन के समय", note: "सीट पक्की होती है" } },
        { label: "Second instalment", amount: "4,000", note: "After two months", hi: { label: "दूसरी किस्त", note: "दो महीने बाद" } },
      ],
      inclusions: ["Printed notes","Every mock","Study hall seat"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Md. Shahid Anwar"],
      hi: { seats: "हर बैच में 40", material: ["हिंदी में छपे नोट्स", "पिछले साल के पेपर, हल सहित"], inclusions: ["छपे हुए नोट्स", "हर मॉक", "स्टडी हॉल में सीट"], category: "राज्य की परीक्षाएँ", name: "राज्य PSC और राज्य परीक्षाएँ, सामान्य अध्ययन", detail: "चार महीने, BPSC प्रीलिम्स और BSSC इंटर लेवल के लिए: बिहार का इतिहास, भूगोल और अर्थव्यवस्था, और पिछले बारह महीनों के करेंट अफ़ेयर्स।", feeNote: "पूरे कोर्स के लिए", level: "ग्रेजुएट", subjects: "इतिहास, भूगोल, राजव्यवस्था, अर्थव्यवस्था, करेंट अफ़ेयर्स", duration: "4 महीने", timings: "सोमवार, बुधवार, शुक्रवार, शाम 4:30 से 6 बजे", mode: "क्लासरूम, हिंदी और इंग्लिश मीडियम", batchStarts: "7 दिसंबर 2026 से शुरू", eligibility: "ग्रेजुएट। उम्र और निवास के नियम हर आयोग के नोटिफ़िकेशन में हैं।", testPlan: "हर दूसरे रविवार जनरल स्टडीज़ का मॉक।", refundNote: "दस दिन पहले लिखकर बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
    },
    {
      name: "Sunday mock test series, all exams",
      level: "Anyone preparing, enrolled here or not",
      subjects: "Full papers in the exam's own pattern, one exam a week in rotation",
      duration: "24 Sundays",
      timings: "Sundays, 9:00 am to 12:00 noon",
      mode: "At the centre",
      batchStarts: "First paper Sunday 4 October 2026",
      seats: "40 computers, two shifts",
      /* No `fee`: priced as a batch it would make the "from" line read
         ₹1,200. Its price is here and in the FAQ. */
      detail: "₹1,200 for all 24 mocks, free for enrolled students. On computers, timed like the real exam, ranked, and marked against the last three years' cut-offs for your category.",
      slug: "mock-series",
      category: "Mocks",
      eligibility: "Anyone preparing, from any institute or on their own.",
      syllabus: [
        { title: "Rotation", body: "SSC CGL, CHSL, IBPS, RRB and state exam papers in turn, one a Sunday.", hi: { title: "बारी-बारी से", body: "SSC CGL, CHSL, IBPS, RRB और राज्य की परीक्षाओं के पेपर बारी-बारी से, हर रविवार एक।" } },
      ],
      material: ["Answer key and solutions the same evening"],
      testPlan: "24 full mocks on computers, timed like the real exam, ranked, and set against the last three years' cut-offs for your category.",
      inclusions: ["24 full mocks","Rank and cut-off gap for your category","Solutions the same evening"],
      refundNote: "Leave before the sixth mock and the fee for the mocks not yet sat is refunded within ten days.",
      facultyNames: ["Ravi Ranjan"],
      hi: { seats: "40 कंप्यूटर, दो शिफ़्ट", material: ["उसी शाम आंसर की और हल"], inclusions: ["24 पूरे मॉक", "आपकी कैटेगरी के लिए रैंक और कट-ऑफ़ से दूरी", "उसी शाम हल"], category: "मॉक टेस्ट", name: "रविवार मॉक टेस्ट सीरीज़, सभी परीक्षाएँ", detail: "सभी 24 मॉक के ₹1,200, यहाँ के विद्यार्थियों के लिए मुफ़्त। कंप्यूटर पर, असली परीक्षा जैसे समय में, रैंक के साथ, और आपकी श्रेणी के पिछले तीन साल के कट-ऑफ़ से तुलना।", level: "तैयारी करने वाला कोई भी, यहाँ पढ़ता हो या नहीं", subjects: "परीक्षा के अपने पैटर्न में पूरे पेपर, हर हफ़्ते बारी-बारी से एक परीक्षा", duration: "24 रविवार", timings: "रविवार, सुबह 9 से दोपहर 12 बजे", mode: "सेंटर पर", batchStarts: "पहला पेपर रविवार 4 अक्टूबर 2026", eligibility: "तैयारी करने वाला कोई भी, किसी भी इंस्टीट्यूट से या अपने आप।", testPlan: "कंप्यूटर पर 24 पूरे मॉक, असली परीक्षा जितने समय के, रैंक के साथ, और आपकी कैटेगरी के पिछले तीन साल के कट-ऑफ़ से मिलाकर।", refundNote: "छठे मॉक से पहले छोड़ें तो बाक़ी मॉक की फीस दस दिन के अंदर लौटा दी जाती है।" },
    },
  ],

  /* ── CLEARED: results, first on this theme. Counts per exam and year.
        No candidate is named; the note says how a real list is checked,
        because this reader has seen inflated banners before. ─────────── */
  resultsHeading: "Selections in the last twelve months",
  resultsNote:
    "Every count and score here is example content, placed by Ideovent to show how a selection list is set out. A real list goes up with each selected candidate's roll number, which anybody can check against the commission's own result, and with no name or photograph unless the candidate agrees in writing.",
  results: [
    { achievement: "23 selected", count: "23", exam: "SSC CGL", year: "2025", note: "Morning and evening batches", category: "SSC", courseName: "SSC CGL and CHSL", courseDuration: "6 months", paid: "paid", status: "Final", hi: { courseDuration: "6 महीने", category: "SSC", status: "अंतिम", achievement: "23 चयनित", note: "सुबह और शाम के बैच", courseName: "SSC CGL और CHSL" } },
    { achievement: "31 selected", count: "31", exam: "SSC CHSL", year: "2025", note: "Morning and evening batches", category: "SSC", courseName: "SSC CGL and CHSL", courseDuration: "6 months", paid: "paid", status: "Final", hi: { courseDuration: "6 महीने", category: "SSC", status: "अंतिम", achievement: "31 चयनित", note: "सुबह और शाम के बैच", courseName: "SSC CGL और CHSL" } },
    { achievement: "17 selected", count: "17", exam: "IBPS Clerk", year: "2025", note: "Banking batch", category: "Banking", courseName: "Banking: IBPS and SBI", courseDuration: "6 months", paid: "paid", status: "Final", hi: { courseDuration: "6 महीने", category: "बैंकिंग", status: "अंतिम", achievement: "17 चयनित", note: "बैंकिंग बैच", courseName: "बैंकिंग: IBPS और SBI" } },
    { achievement: "6 selected", count: "6", exam: "IBPS PO", year: "2025", note: "Banking batch", category: "Banking", courseName: "Banking: IBPS and SBI", courseDuration: "6 months", paid: "paid", status: "Final", hi: { courseDuration: "6 महीने", category: "बैंकिंग", status: "अंतिम", achievement: "6 चयनित", note: "बैंकिंग बैच", courseName: "बैंकिंग: IBPS और SBI" } },
    { achievement: "44 selected", count: "44", exam: "RRB Group D", year: "2025", note: "Railway batch", category: "Railway", courseName: "Railway NTPC and Group D", courseDuration: "5 months", paid: "paid", status: "Final", hi: { courseDuration: "5 महीने", category: "रेलवे", status: "अंतिम", achievement: "44 चयनित", note: "रेलवे बैच", courseName: "रेलवे NTPC और Group D" } },
    { achievement: "9 cleared prelims", count: "9", exam: "BPSC prelims", year: "2026", note: "State exams batch", category: "State exams", courseName: "State PSC and state exams", courseDuration: "4 months", paid: "paid", status: "Provisional", hi: { exam: "BPSC प्रीलिम्स", courseDuration: "4 महीने", category: "राज्य की परीक्षाएँ", status: "प्रोविज़नल", achievement: "9 प्रीलिम्स पास", note: "राज्य परीक्षा बैच", courseName: "राज्य PSC और राज्य की परीक्षाएँ" } },
    { achievement: "154.5 of 200", exam: "SSC CGL Tier 1", year: "2026", note: "Evening batch, while working full time", category: "SSC", courseName: "SSC CGL and CHSL, evening batch", courseDuration: "6 months", paid: "paid", hi: { courseDuration: "6 महीने", category: "SSC", achievement: "200 में से 154.5", note: "शाम का बैच, पूरे समय की नौकरी के साथ", courseName: "SSC CGL और CHSL, शाम का बैच" } },
    { achievement: "19 selected", count: "19", exam: "SSC CGL", year: "2024", note: "Morning and evening batches", category: "SSC", courseName: "SSC CGL and CHSL", courseDuration: "6 months", paid: "paid", status: "Final", hi: { courseDuration: "6 महीने", category: "SSC", status: "अंतिम", achievement: "19 चयनित", note: "सुबह और शाम के बैच", courseName: "SSC CGL और CHSL" } },
    { achievement: "38 selected", count: "38", exam: "RRB NTPC", year: "2024", note: "Railway batch", category: "Railway", courseName: "Railway NTPC and Group D", courseDuration: "5 months", paid: "paid", status: "Final", hi: { courseDuration: "5 महीने", category: "रेलवे", status: "अंतिम", achievement: "38 चयनित", note: "रेलवे बैच", courseName: "रेलवे NTPC और Group D" } },
  ],

  /* ── CLEARED: faculty ────────────────────────────────────────────────── */
  faculty: [
    { name: "Santosh Kumar Singh", photo: "/demo/img/people/teacher-m05-240.webp", subject: "Quantitative aptitude", qualification: "M.Sc. Mathematics", experience: "18 years. Started the institute and takes maths in every SSC and railway batch.", role: "Founder", group: "Quant", batches: "SSC morning and evening, Railway", style: "Shortcuts only after the long method is understood, and every shortcut is proved once on the board.", hi: { batches: "SSC सुबह और शाम, रेलवे", subject: "गणित", experience: "18 साल। संस्थान शुरू किया और हर SSC और रेलवे बैच में गणित।", role: "संस्थापक", style: "शॉर्टकट तभी जब लंबा तरीक़ा समझ आ जाए, और हर शॉर्टकट एक बार बोर्ड पर सिद्ध।", qualification: "M.Sc. मैथ्स", group: "क्वांट" } },
    { name: "Ravi Ranjan", photo: "/demo/img/people/teacher-m07-240.webp", subject: "Reasoning", qualification: "B.Sc., MCA", experience: "11 years. Takes reasoning and runs the Sunday mock on the computers.", group: "Reasoning", batches: "Every batch, Sunday mocks", style: "Puzzles solved against the clock, then solved again slowly to see the pattern.", hi: { batches: "हर बैच, रविवार के मॉक", subject: "तर्कशक्ति", experience: "11 साल। रीज़निंग और कंप्यूटर पर रविवार का मॉक।", style: "पहले घड़ी के साथ पज़ल, फिर धीरे-धीरे पैटर्न देखने के लिए दोबारा।", qualification: "B.Sc., MCA", group: "रीज़निंग" } },
    { name: "Priyanka Kumari", photo: "/demo/img/people/teacher-w06-240.webp", subject: "English", qualification: "M.A. English", experience: "9 years. Takes English for SSC and banking, explained in Hindi where it helps.", group: "English", batches: "SSC, Banking", style: "Grammar from the mistakes in last Sunday's mock, not from a textbook order.", hi: { batches: "SSC, बैंकिंग", subject: "अंग्रेज़ी", experience: "9 साल। SSC और बैंकिंग की अंग्रेज़ी, जहाँ ज़रूरत हो हिंदी में समझाकर।", style: "ग्रामर पिछले रविवार के मॉक की ग़लतियों से, किताब के क्रम से नहीं।", qualification: "M.A. इंग्लिश", group: "इंग्लिश" } },
    { name: "Md. Shahid Anwar", photo: "/demo/img/people/teacher-m02-240.webp", subject: "General studies and current affairs", qualification: "M.A. History", experience: "15 years. Takes general awareness and the state PSC batch.", group: "General studies", batches: "Every batch, State exams", style: "Current affairs as a monthly booklet in Hindi, tested every Friday.", hi: { batches: "हर बैच, राज्य की परीक्षाएँ", subject: "सामान्य अध्ययन और करेंट अफ़ेयर्स", experience: "15 साल। सामान्य जागरूकता और राज्य PSC बैच।", style: "करेंट अफ़ेयर्स हिंदी में मासिक बुकलेट, हर शुक्रवार टेस्ट।", qualification: "M.A. इतिहास", group: "जनरल स्टडीज़" } },
    { name: "Abhishek Pandey", photo: "/demo/img/people/teacher-m03-240.webp", subject: "Banking awareness and computer", qualification: "MBA, Finance", experience: "7 years. Worked four years in a bank branch before teaching.", group: "Banking", batches: "Banking, typing and computer", style: "Explains a banking term the way a branch manager uses it at the counter.", hi: { batches: "बैंकिंग, टाइपिंग और कंप्यूटर", subject: "बैंकिंग जागरूकता और कंप्यूटर", experience: "7 साल। पढ़ाने से पहले चार साल बैंक ब्रांच में काम किया।", style: "बैंकिंग का हर शब्द वैसे समझाते हैं जैसे ब्रांच मैनेजर काउंटर पर इस्तेमाल करता है।", qualification: "MBA, फ़ाइनेंस", group: "बैंकिंग" } },
  ],

  /* ── CLEARED: why students choose us. An adult aspirant's three worries:
        time, knowing where they stand, and the medium. ─────────────────── */
  method: [
    {
      title: "A batch before work and a batch after it",
      body: "The SSC course runs twice a day, 7:00 to 9:30 am and 6:00 to 8:30 pm, with the same teachers and the same syllabus. A class missed in the evening can be sat in the next morning.",
      hi: {
        title: "नौकरी से पहले एक बैच, और नौकरी के बाद एक",
        body: "SSC कोर्स दिन में दो बार चलता है, सुबह 7 से 9:30 बजे और शाम 6 से रात 8:30 बजे, वही टीचर और वही सिलेबस। शाम की छूटी क्लास अगली सुबह ली जा सकती है।",
      },
    },
    {
      title: "Your rank every Sunday, against the real cut-off",
      body: "A full mock on computers every Sunday, in the exam's own pattern and timing. The result sheet shows your rank in the centre and how far your score is from the last three years' cut-offs for your category.",
      hi: {
        title: "हर रविवार आपकी रैंक, असली कट-ऑफ़ के सामने",
        body: "हर रविवार कंप्यूटर पर पूरा मॉक, परीक्षा के अपने पैटर्न और समय में। रिज़ल्ट शीट में सेंटर में आपकी रैंक दिखती है, और यह भी कि आपका स्कोर आपकी कैटेगरी के पिछले तीन साल के कट-ऑफ़ से कितना दूर है।",
      },
    },
    {
      title: "Hindi medium is not second best",
      body: "Every class is taught in Hindi and English together, the notes come in both, and the mock paper switches to Hindi the way the real one does. Nobody is sent to a separate, slower batch.",
      hi: {
        title: "हिंदी मीडियम दूसरे दर्जे का नहीं",
        body: "हर क्लास हिंदी और इंग्लिश में साथ-साथ पढ़ाई जाती है, नोट्स दोनों में मिलते हैं, और मॉक पेपर असली पेपर की तरह हिंदी में बदल जाता है। किसी को अलग, धीमे बैच में नहीं भेजा जाता।",
      },
    },
  ],

  /* ── STRUCTURE: the week. Label, days, time and subject are KEPT;
        faculty and room are CLEARED. ─────────────────────────────────── */
  scheduleNote:
    "The study hall is open every day, Sunday included, with power backup. The last class ends at 8:30 pm.",
  schedule: [
    { label: "Study hall", days: "Every day", time: "6:00 am to 10:00 pm", subject: "Silent self-study, reserved seat", faculty: "Desk staff", room: "Second floor", hi: { faculty: "डेस्क स्टाफ़", room: "दूसरी मंज़िल", days: "रोज़", time: "सुबह 6 से रात 10 बजे", subject: "शांति से सेल्फ़-स्टडी, अपनी तय सीट पर", label: "स्टडी हॉल" } },
    { label: "SSC, morning", days: "Monday to Saturday", time: "7:00 to 9:30 am", subject: "Maths, reasoning, English, general awareness, by day", faculty: "Santosh Kumar Singh and team", room: "Hall 1", hi: { faculty: "Santosh Kumar Singh और टीम", room: "हॉल 1", label: "SSC, सुबह", time: "सुबह 7 से 9:30", subject: "गणित, रीज़निंग, इंग्लिश, जनरल अवेयरनेस, दिन के हिसाब से", days: "सोमवार से शनिवार" } },
    { label: "Banking", days: "Monday to Saturday", time: "10:00 am to 12:30 pm", subject: "Quant, reasoning, English, banking awareness", faculty: "Abhishek Pandey and team", room: "Hall 1", hi: { faculty: "Abhishek Pandey और टीम", room: "हॉल 1", time: "सुबह 10 से दोपहर 12:30", days: "सोमवार से शनिवार", label: "बैंकिंग", subject: "क्वांट, रीज़निंग, इंग्लिश, बैंकिंग अवेयरनेस" } },
    { label: "Typing and computer", days: "Tue, Thu, Sat", time: "10:00 am to 1:00 pm", subject: "Skill test practice", faculty: "Ravi Ranjan", room: "Computer room", hi: { room: "कंप्यूटर रूम", label: "टाइपिंग और कंप्यूटर", time: "सुबह 10 से दोपहर 1 बजे", subject: "स्किल टेस्ट की प्रैक्टिस", days: "मंगल, गुरु, शनि" } },
    { label: "Railway", days: "Monday to Saturday", time: "2:00 to 4:30 pm", subject: "Maths, reasoning, general science, general awareness", faculty: "Santosh Kumar Singh and team", room: "Hall 1", hi: { faculty: "Santosh Kumar Singh और टीम", room: "हॉल 1", label: "रेलवे", time: "दोपहर 2 से शाम 4:30", subject: "गणित, रीज़निंग, जनरल साइंस, जनरल अवेयरनेस", days: "सोमवार से शनिवार" } },
    { label: "State PSC and state exams", days: "Mon, Wed, Fri", time: "4:30 to 6:00 pm", subject: "General studies", faculty: "Md. Shahid Anwar", room: "Hall 2", hi: { room: "हॉल 2", label: "राज्य PSC और राज्य की परीक्षाएँ", time: "शाम 4:30 से 6 बजे", subject: "सामान्य अध्ययन (GS)", days: "सोम, बुध, शुक्र" } },
    { label: "SSC, evening", days: "Monday to Saturday", time: "6:00 to 8:30 pm", subject: "Maths, reasoning, English, general awareness, by day", faculty: "Santosh Kumar Singh and team", room: "Hall 1", hi: { faculty: "Santosh Kumar Singh और टीम", room: "हॉल 1", label: "SSC, शाम", time: "शाम 6 से रात 8:30", subject: "गणित, रीज़निंग, इंग्लिश, जनरल अवेयरनेस, दिन के हिसाब से", days: "सोमवार से शनिवार" } },
    { label: "Sunday mock", days: "Sunday", time: "9:00 am to 12:00 noon", subject: "Full paper on computers, in rotation", faculty: "Ravi Ranjan", room: "Computer room", hi: { room: "कंप्यूटर रूम", label: "रविवार का मॉक", days: "रविवार", subject: "कंप्यूटर पर पूरा पेपर, बारी-बारी से", time: "सुबह 9 से दोपहर 12 बजे" } },
  ],

  /* ── CLEARED: the trial ──────────────────────────────────────────────── */
  trial: {
    heading: "Attend three days before you pay",
    body: "Sit in on three days of the batch you want, and take that week's Sunday mock if you like. If the teaching does not suit you, you pay nothing and nobody calls you afterwards.",
    duration: "Three class days and one Sunday mock",
    bring: "A notebook, a pen, and a photo identity card for the mock.",
    howToBook: "Walk in to the front desk between 9:00 am and 7:00 pm, or send a WhatsApp message with the batch you want.",
    hi: {
      heading: "पैसे देने से पहले तीन दिन आइए",
      duration: "तीन क्लास के दिन और एक रविवार मॉक",
      bring: "एक कॉपी, पेन, और मॉक के लिए फ़ोटो पहचान पत्र।",
      howToBook: "सुबह 9:00 से शाम 7:00 के बीच फ़्रंट डेस्क पर आइए, या जिस बैच में आना है उसका नाम WhatsApp कीजिए।",
      body: "जिस बैच में आना है उसकी तीन दिन की क्लास में बैठिए, और चाहें तो उस हफ़्ते का रविवार वाला मॉक भी दीजिए। पढ़ाई पसंद न आए तो कोई पैसा नहीं, और बाद में कोई फ़ोन नहीं करेगा।",
    },
  },

  /* ── STRUCTURE: FAQ. Three are generic: true of any institute in this
        segment and naming no fee, date, count, person or place. ──────── */
  faq: [
    {
      title: "What is the fee, and can I pay in parts?",
      body: "SSC, morning or evening: ₹9,500 for six months. Banking: ₹11,000 for six months. Railway: ₹7,500 for five months. State PSC and state exams: ₹8,000 for four months. Books and the Sunday mocks are included. Every course can be paid in two parts, the second after two months. The mock series alone is ₹1,200, and the study hall ₹700 a month, free for enrolled students. These are example figures and yours replace them.",
      group: "Fees",
      hi: {
        title: "फीस कितनी है, और क्या किस्तों में दे सकते हैं?",
        body: "SSC, सुबह या शाम: छह महीने के ₹9,500। बैंकिंग: छह महीने के ₹11,000। रेलवे: पाँच महीने के ₹7,500। राज्य PSC और राज्य की परीक्षाएँ: चार महीने के ₹8,000। किताबें और रविवार के मॉक शामिल हैं। हर कोर्स की फीस दो हिस्सों में दी जा सकती है, दूसरा दो महीने बाद। सिर्फ़ मॉक सीरीज़ ₹1,200 की है, और स्टडी हॉल ₹700 महीना, एडमिशन वाले स्टूडेंट के लिए मुफ़्त। ये उदाहरण के आँकड़े हैं, आपके अपने आँकड़े इनकी जगह आएँगे।",
        group: "फीस",
      },
    },
    {
      title: "When will the next SSC notification come?",
      body: "The commission publishes a tentative calendar on its own website, and the dates on it often move. Plan from the notification itself, not from a video or a forwarded message, and start the syllabus before it is out: the gap between a notification and the exam is rarely enough on its own.",
      group: "Exams",
      generic: true,
      hi: {
        title: "SSC का अगला नोटिफ़िकेशन कब आएगा?",
        body: "आयोग अपनी वेबसाइट पर एक संभावित कैलेंडर छापता है, और उसकी तारीख़ें अक्सर खिसकती हैं। तैयारी नोटिफ़िकेशन देखकर कीजिए, किसी वीडियो या फ़ॉरवर्ड मैसेज से नहीं, और उसके आने से पहले सिलेबस शुरू कर दीजिए: नोटिफ़िकेशन और परीक्षा के बीच का समय अकेले शायद ही काफ़ी होता है।",
        group: "परीक्षाएँ",
      },
    },
    {
      title: "I work during the day. Can I still join?",
      body: "Yes. The SSC course runs from 7:00 to 9:30 am and again from 6:00 to 8:30 pm, and you can move between the two in any week your shifts change. About a third of each evening batch works full time.",
      group: "Batches",
      hi: {
        title: "मैं दिन में नौकरी करता हूँ। क्या फिर भी जुड़ सकता हूँ?",
        body: "हाँ। SSC कोर्स सुबह 7 से 9:30 बजे और फिर शाम 6 से रात 8:30 बजे चलता है, और जिस हफ़्ते आपकी शिफ़्ट बदले, आप दोनों में आ-जा सकते हैं। शाम के हर बैच में लगभग एक तिहाई लोग पूरे समय की नौकरी करते हैं।",
        group: "बैच",
      },
    },
    {
      title: "Is the teaching in Hindi medium?",
      body: "Both. Every class is taught in Hindi and English together, and the notes and mock papers come in both. English as a subject is taught in English, explained in Hindi where it helps.",
      group: "Batches",
      hi: {
        title: "क्या पढ़ाई हिंदी मीडियम में होती है?",
        body: "दोनों में। हर क्लास हिंदी और इंग्लिश में साथ-साथ पढ़ाई जाती है, और नोट्स और मॉक पेपर दोनों में मिलते हैं। इंग्लिश विषय इंग्लिश में पढ़ाया जाता है, जहाँ ज़रूरत हो हिंदी में समझाकर।",
        group: "बैच",
      },
    },
    {
      title: "Is there a library or study hall?",
      body: "Yes, on the second floor: sixty reserved seats, open every day from 6:00 am to 10:00 pm, with power backup, drinking water and lockers. ₹700 a month, free for enrolled students.",
      group: "Study hall",
      hi: {
        title: "क्या लाइब्रेरी या स्टडी हॉल है?",
        body: "हाँ, दूसरी मंज़िल पर: साठ रिज़र्व सीटें, हर दिन सुबह 6 से रात 10 बजे तक खुला, पावर बैकअप, पीने का पानी और लॉकर के साथ। ₹700 महीना, एडमिशन वाले स्टूडेंट के लिए मुफ़्त।",
        group: "स्टडी हॉल",
      },
    },
    {
      title: "Do you guarantee a selection?",
      body: "No. A selection depends on the vacancies, the cut-off and your own marks on the day, and none of those is in an institute's hands. Be careful of any institute that promises it.",
      group: "Results",
      generic: true,
      hi: {
        title: "क्या आप सिलेक्शन की गारंटी देते हैं?",
        body: "नहीं। सिलेक्शन वैकेंसी, कट-ऑफ़ और उस दिन आपके अपने अंकों पर टिका है, और इनमें से कुछ भी किसी इंस्टीट्यूट के हाथ में नहीं। जो इंस्टीट्यूट इसका वादा करे, उससे सावधान रहिए।",
        group: "रिज़ल्ट",
      },
    },
    {
      title: "Can I take only the Sunday mocks?",
      body: "Yes. The mock series is open to students of any institute and to those preparing alone. Register at the desk or on WhatsApp with your name and category, so your score is compared with the right cut-off.",
      group: "Mocks",
      hi: {
        title: "क्या मैं सिर्फ़ रविवार के मॉक ले सकता हूँ?",
        body: "हाँ। मॉक सीरीज़ किसी भी इंस्टीट्यूट के स्टूडेंट और अकेले तैयारी करने वालों के लिए खुली है। डेस्क पर या WhatsApp पर अपना नाम और कैटेगरी देकर रजिस्टर कीजिए, ताकि आपका स्कोर सही कट-ऑफ़ से मिलाया जाए।",
        group: "मॉक",
      },
    },
    {
      title: "What documents do I need at admission?",
      body: "A photo identity card, your latest mark sheet or degree certificate, and passport photographs.",
      group: "Admission",
      generic: true,
      hi: {
        title: "एडमिशन के समय कौन से डॉक्यूमेंट चाहिए?",
        body: "एक फ़ोटो पहचान पत्र, आपकी ताज़ा मार्कशीट या डिग्री सर्टिफ़िकेट, और पासपोर्ट साइज़ फ़ोटो।",
        group: "एडमिशन",
      },
    },
  ],

  /* ── CLEARED: notices ────────────────────────────────────────────────── */
  notices: [
    {
      title: "SSC evening batch: 11 seats left",
      date: "25 September 2026",
      body: "The morning batch has 6. A seat is held only against the first instalment.",
      kind: "notice",
      posted: "2026-09-25",
      expires: "2026-10-19",
      hi: { title: "SSC शाम की बैच: 11 सीटें बाक़ी", date: "25 सितंबर 2026", body: "सुबह की बैच में 6। सीट सिर्फ़ पहली किस्त से पक्की होती है।" },
      pinned: true,
    },
    {
      title: "Sunday mock series: first paper on 4 October",
      date: "20 September 2026",
      body: "CGL Tier 1 pattern. Open to students of any institute. Register at the desk or on WhatsApp with your name and category.",
      kind: "event",
      posted: "2026-09-20",
      expires: "2026-10-04",
      hi: { title: "रविवार मॉक सीरीज़: पहला पेपर 4 अक्टूबर को", date: "20 सितंबर 2026", body: "CGL Tier 1 पैटर्न। किसी भी संस्थान के विद्यार्थी के लिए। डेस्क पर या WhatsApp पर नाम और श्रेणी के साथ रजिस्टर करें।" },
    },
    {
      title: "Diwali and Chhath: no classes from 7 to 16 November",
      date: "12 September 2026",
      body: "The study hall stays open throughout. Batches resume on Tuesday 17 November.",
      kind: "notice",
      posted: "2026-09-12",
      expires: "2026-11-17",
      hi: { title: "दीवाली और छठ: 7 से 16 नवंबर तक क्लास नहीं", date: "12 सितंबर 2026", body: "स्टडी हॉल पूरे समय खुला रहेगा। बैच मंगलवार 17 नवंबर से फिर शुरू।" },
    },
  ],

  /* ── CLEARED: the tests page. Daily, sectional, full mocks. ─────────── */
  testSeries: {
    intro: "Three kinds of test: a daily quiz at the start of class, a sectional test mid-week, and a full mock on computers every Sunday in the exam's own pattern. The Sunday result shows your rank and your gap to the last three years' cut-off for your category.",
    types: [
      { title: "Daily quiz", body: "Ten questions, ten minutes, at the start of every class. Marked in class.", hi: { title: "रोज़ का क्विज़", body: "दस सवाल, दस मिनट, हर क्लास की शुरुआत में। क्लास में ही जाँचा जाता है।" } },
      { title: "Sectional test", body: "One section of the paper, timed, every Wednesday for SSC and every Tuesday for banking.", hi: { title: "सेक्शनल टेस्ट", body: "पेपर का एक सेक्शन, समय बाँधकर, SSC के लिए हर बुधवार और बैंकिंग के लिए हर मंगलवार।" } },
      { title: "Sunday full mock", body: "On computers, exam timing, one exam a week in rotation, open to outsiders.", hi: { title: "रविवार का पूरा मॉक", body: "कंप्यूटर पर, परीक्षा के समय में, हर हफ़्ते बारी-बारी से एक परीक्षा, बाहर वालों के लिए भी खुला।" } },
    ],
    schedule: [
      { label: "Mock 1", days: "Sunday 4 October 2026", time: "9:00 am to 12:00 noon", subject: "SSC CGL Tier 1 pattern", hi: { days: "रविवार, 4 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "SSC CGL Tier 1 पैटर्न पर", label: "मॉक 1" } },
      { label: "Mock 2", days: "Sunday 11 October 2026", time: "9:00 am to 12:00 noon", subject: "IBPS Clerk prelims pattern", hi: { days: "रविवार, 11 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "IBPS Clerk प्रीलिम्स पैटर्न पर", label: "मॉक 2" } },
      { label: "Mock 3", days: "Sunday 18 October 2026", time: "9:00 am to 12:00 noon", subject: "RRB NTPC pattern", hi: { days: "रविवार, 18 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "RRB NTPC पैटर्न पर", label: "मॉक 3" } },
      { label: "Mocks 4 to 24", days: "Every Sunday to March 2027", time: "9:00 am to 12:00 noon", subject: "In rotation", hi: { label: "मॉक 4 से 24", days: "मार्च 2027 तक हर रविवार", time: "सुबह 9 से दोपहर 12 बजे", subject: "बारी-बारी से" } },
    ],
    pattern: "Each mock follows the pattern of the latest official notification for that exam: number of questions, sections, time and negative marking. When a notification changes the pattern, the next mock changes with it.",
    downloads: [
      { label: "Sunday mock schedule, October to March", url: "https://example.com/mock-schedule.pdf", group: "Schedule", hi: { label: "रविवार के मॉक का शेड्यूल, अक्टूबर से मार्च", group: "शेड्यूल" } },
      { label: "SSC CGL previous-year papers, Hindi and English", url: "https://example.com/cgl-pyq.pdf", group: "Previous papers", hi: { label: "SSC CGL के पिछले साल के पेपर, हिंदी और इंग्लिश", group: "पिछले साल के पेपर" } },
    ],
    platformUrl: "https://tests.example.com",
    hi: {
      intro: "तीन तरह के टेस्ट: क्लास की शुरुआत में रोज़ क्विज़, हफ़्ते के बीच सेक्शनल टेस्ट, और हर रविवार कंप्यूटर पर परीक्षा के अपने पैटर्न में पूरा मॉक। रविवार का रिज़ल्ट आपकी रैंक और आपकी श्रेणी के पिछले तीन साल के कट-ऑफ़ से दूरी बताता है।",
      pattern: "हर मॉक उस परीक्षा के नवीनतम आधिकारिक नोटिफ़िकेशन के पैटर्न पर: प्रश्नों की संख्या, खंड, समय और नेगेटिव मार्किंग। पैटर्न बदलते ही अगला मॉक भी बदलता है।",
    },
  },

  posts: [
    { slug: "reading-a-notification", title: "How to read an SSC notification in ten minutes", date: "15 September 2026", author: "Santosh Kumar Singh", excerpt: "Four things to check before anything else: age on the cut-off date, qualification by the closing date, the vacancy table for your category, and the fee.", body: "Most aspirants read a notification from the top and give up by page six. Read it in this order instead.\n\nFirst, the age limit and the date it is counted on. A birthday one day late costs a whole attempt.\n\nSecond, the qualification and the date by which you must hold it. Final-year students are allowed in some exams and not in others.\n\nThird, the vacancy table for your category and your state. That is your real competition, not the headline number.\n\nFourth, the fee and the last date, and pay two days early: the payment server always slows on the last day.", hi: { date: "15 सितंबर 2026", title: "SSC नोटिफ़िकेशन दस मिनट में कैसे पढ़ें", excerpt: "सबसे पहले चार बातें: कट-ऑफ़ तारीख़ पर आयु, अंतिम तारीख़ तक योग्यता, आपकी श्रेणी की वैकेंसी टेबल, और फीस।", body: "ज़्यादातर उम्मीदवार नोटिफ़िकेशन ऊपर से पढ़ते हैं और छठे पेज तक हार मान लेते हैं। इसकी जगह इसे इस क्रम में पढ़िए।\n\nपहले, उम्र की सीमा और वह तारीख़ जिस पर उम्र गिनी जाती है। एक दिन देर का जन्मदिन पूरा एक मौक़ा खा जाता है।\n\nदूसरे, योग्यता और वह तारीख़ जब तक आपके पास वह होनी चाहिए। कुछ परीक्षाओं में फ़ाइनल ईयर के स्टूडेंट बैठ सकते हैं, कुछ में नहीं।\n\nतीसरे, आपकी कैटेगरी और आपके राज्य की वैकेंसी टेबल। आपका असली मुक़ाबला वही है, बड़ी हेडलाइन वाली संख्या नहीं।\n\nचौथे, फीस और आख़िरी तारीख़, और दो दिन पहले भर दीजिए: आख़िरी दिन पेमेंट सर्वर हमेशा धीमा हो जाता है।" } },
    { slug: "working-and-preparing", title: "Working full time and preparing for SSC: a week that holds", date: "28 August 2026", author: "Ravi Ranjan", excerpt: "Two and a half hours a day, six days a week, and one Sunday mock. What to cut and what never to cut.", body: "A third of our evening batch works full time. The ones who clear the exam are not the ones who study the longest. They are the ones who never miss the Sunday mock.\n\nKeep the class, the mock and thirty minutes of current affairs a day. Cut everything else before you cut those.\n\nOn a day a shift runs late, do the daily quiz on the bus. Ten questions kept is better than a whole chapter planned and skipped.", hi: { date: "28 अगस्त 2026", title: "पूरे समय नौकरी और SSC की तैयारी: एक हफ़्ता जो टिकता है", excerpt: "रोज़ ढाई घंटे, हफ़्ते में छह दिन, और एक रविवार मॉक। क्या छोड़ें और क्या कभी न छोड़ें।", body: "हमारे शाम के बैच का एक तिहाई हिस्सा पूरे समय की नौकरी करता है। परीक्षा वे नहीं निकालते जो सबसे ज़्यादा देर पढ़ते हैं। वे निकालते हैं जो रविवार का मॉक कभी नहीं छोड़ते।\n\nक्लास, मॉक और रोज़ तीस मिनट करेंट अफ़ेयर्स बनाए रखिए। इन्हें काटने से पहले बाक़ी सब काटिए।\n\nजिस दिन शिफ़्ट देर तक चले, रोज़ का क्विज़ बस में कर लीजिए। योजना बनाकर छूटे पूरे चैप्टर से किए हुए दस सवाल बेहतर हैं।" } },
    { slug: "selection-banners", title: "How to check a coaching institute's selection banner", date: "10 August 2026", author: "Md. Shahid Anwar", excerpt: "Ask for the roll numbers. A real selection can be checked against the commission's own list in two minutes.", body: "Every market in Bihar has a banner with a hundred faces on it. Some of those students studied there for a week. Some never did.\n\nAsk the institute for the roll numbers of its selections. Open the commission's final result and search for them. A real list survives this in two minutes.\n\nAsk which course each student took, for how long, and whether they paid. Since November 2024 the law requires an institute to say so when it advertises a result.", hi: { date: "10 अगस्त 2026", title: "किसी कोचिंग के चयन बैनर को कैसे जाँचें", excerpt: "रोल नंबर माँगिए। असली चयन आयोग की अपनी सूची से दो मिनट में मिल जाता है।", body: "बिहार के हर बाज़ार में सौ चेहरों वाला एक बैनर लगा है। उनमें से कुछ स्टूडेंट वहाँ एक हफ़्ता पढ़े। कुछ कभी नहीं पढ़े।\n\nइंस्टीट्यूट से उसके सिलेक्शन के रोल नंबर माँगिए। आयोग का फ़ाइनल रिज़ल्ट खोलिए और उन्हें खोजिए। असली लिस्ट दो मिनट में इस जाँच में पास हो जाती है।\n\nपूछिए कि हर स्टूडेंट ने कौन सा कोर्स किया, कितने समय, और क्या फीस दी। नवंबर 2024 से क़ानून कहता है कि रिज़ल्ट का विज्ञापन करते समय इंस्टीट्यूट को यह बताना होगा।" } },
  ],

  feesPolicy: {
    intro: "Every fee is for the whole course, books and mocks included, printed on the course page with its instalments.",
    paymentModes: ["UPI", "Cash at the desk, with a printed receipt", "Bank transfer"],
    instalmentNote: "Every course can be paid in two or three instalments. The first holds the seat.",
    refund: "Leave with ten days' notice in writing. The unused months are refunded pro-rata within ten days. The study hall fee is refunded the same way.",
    receipts: "A printed receipt for every payment, and a photo of it on WhatsApp.",
    noIncrease: "The fee printed when you join is the fee until your course ends.",
    studentsCoached: "1,460",
    studentsSucceeded: "121",
    countsYear: "Results declared October 2024 to September 2025, final selections only",
    hi: {
      intro: "हर फीस पूरे कोर्स की है, किताबें और मॉक शामिल, कोर्स पेज पर किस्तों के साथ छपी।",
      paymentModes: ["UPI", "डेस्क पर नकद, छपी रसीद के साथ", "बैंक ट्रांसफ़र"],
      countsYear: "अक्टूबर 2024 से सितंबर 2025 तक घोषित रिज़ल्ट, सिर्फ़ अंतिम चयन",
      instalmentNote: "हर कोर्स दो या तीन किस्तों में दिया जा सकता है। पहली किस्त से सीट पक्की होती है।",
      refund: "दस दिन पहले लिखकर बताइए। बचे महीनों की फीस दस दिन में लौटाई जाती है। स्टडी हॉल की फीस भी इसी तरह।",
      receipts: "हर भुगतान की छपी रसीद, और उसकी फ़ोटो WhatsApp पर।",
      noIncrease: "जुड़ते समय जो फीस छपी है, कोर्स ख़त्म होने तक वही रहेगी।",
    },
  },

  portalLinks: [
    { label: "Sunday mock results and ranks", url: "https://tests.example.com", audience: "Students", note: "Your score, rank and cut-off gap", hi: { label: "रविवार मॉक के रिज़ल्ट और रैंक", note: "आपके अंक, रैंक और कट-ऑफ़ से दूरी", audience: "स्टूडेंट्स" } },
    { label: "Study hall seat booking", url: "https://hall.example.com", audience: "Students", note: "Reserve a seat for the month", hi: { label: "स्टडी हॉल सीट बुकिंग", note: "महीने के लिए सीट आरक्षित कीजिए", audience: "स्टूडेंट्स" } },
  ],

  /* ── KEPT (stock): the Gallery page. alt is empty on purpose: a stock
        photo's alt comes from the manifest, in both languages, and no
        caption names a room of the institute. */
  photos: [
    { src: "/demo/img/coaching/c1-lecture-hall-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c1-hero-study-batch-800.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
    { src: "/demo/img/coaching/c1-self-study-640.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
    { src: "/demo/img/coaching/c5-library-aisle-640.webp", alt: "", category: "Library", hi: { category: "लाइब्रेरी" } },
    { src: "/demo/img/coaching/c5-reading-room-640.webp", alt: "", category: "Library", hi: { category: "लाइब्रेरी" } },
    { src: "/demo/img/coaching/c5-library-floor-640.webp", alt: "", category: "Library", hi: { category: "लाइब्रेरी" } },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "desk@example.com",
    addressLines: ["Kasauti Competition Classes", "First and second floor, Example Market, Example Road", "Sasaram, Bihar 821000"],
    hours: "Front desk: Monday to Saturday, 6:30 am to 8:30 pm. Study hall: every day, 6:00 am to 10:00 pm.",
    mapQuery: "Kasauti Competition Classes, Sasaram",
    landmark: "Example Market, above the bank ATM, stairs on the left",
    branches: [
      { name: "Dehri study centre", addressLines: ["First floor, Example Road", "Dehri, Bihar 821000"], phone: "+91 00000 00000", mapQuery: "Kasauti Competition Classes, Dehri", hours: "Study hall and Sunday mocks only. Every day, 6:00 am to 9:00 pm.", hi: { name: "डेहरी स्टडी सेंटर", addressLines: ["पहली मंज़िल, Example Road", "डेहरी, बिहार 821000"], hours: "सिर्फ़ स्टडी हॉल और रविवार के मॉक। हर दिन, सुबह 6:00 से रात 9:00।" } },
    ],
    hi: { addressLines: ["Kasauti Competition Classes", "पहली और दूसरी मंज़िल, Example Market, Example Road", "सासाराम, बिहार 821000"], hours: "फ़्रंट डेस्क: सोमवार से शनिवार, सुबह 6:30 से रात 8:30। स्टडी हॉल: हर दिन, सुबह 6:00 से रात 10:00।", landmark: "Example Market, बैंक ATM के ऊपर, सीढ़ियाँ बाईं ओर" },
  },
});
