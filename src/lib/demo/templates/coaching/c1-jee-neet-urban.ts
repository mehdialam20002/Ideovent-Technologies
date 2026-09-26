/**
 * TEMPLATE c1: JEE AND NEET, URBAN. The reference coaching template.
 *
 * Segment: a Kota or Delhi style entrance institute. Class 11 and 12
 * classroom batches, a dropper batch, and a test series that outsiders can
 * join. The reader is a parent comparing three institutes by batch start
 * dates and last year's ranks, or a sixteen-year-old doing the same on a
 * phone. They want, in order: which exam, when the batch starts, who teaches
 * it, did it work, what it costs.
 * Registry: Modern family, `podium` theme (multi-page). The old single page
 * `ledger` look is frozen for demos already sent.
 *
 * MULTI-PAGE CONTENT (26 September 2026): every course carries its own page
 * (slug, syllabus, fee split, faculty, FAQ), results carry the CCPA 2024
 * fields (course, duration, paid), and the fee copy follows the Rajasthan
 * Coaching Centres Act 2025: at least four instalments, receipts, no increase
 * mid-course, pro-rata refund including hostel and mess. Portal and download
 * links point at example.com on purpose: they are fiction and go nowhere.
 *
 * THIS FILE IS THE MODEL FOR c2 TO c5. Every field the coaching renderer
 * reads is filled, at the quantities in DEMO-SITE-BRIEF.md section 9.4, and
 * the comments say which fields survive a duplicate. Read ../shape.ts first.
 *
 * THE INSTITUTE DOES NOT EXIST. A search on 25 September 2026 found no
 * well-known coaching institute called Parallax Academy in Kota or Delhi.
 * No student is named anywhere. Contact details are the reserved fiction
 * patterns.
 *
 * THE TAGLINE HAS NO *ASTERISKS*. The coaching template puts its one serif
 * accent on a word of OURS in the headline ("coaching"), never on a word the
 * institute typed, so it prints the tagline exactly as written.
 */

import { defineTemplateContent } from "../shape";
import { COACHING_PAGE_SETS } from "../../site/pageSets";

export default defineTemplateContent("coaching", {
  /* ── KEPT: which pages this segment has. ─────────────────────────────── */
  sitePages: [...COACHING_PAGE_SETS["c1-jee-neet-urban"]],

  /* ── CLEARED: identity ───────────────────────────────────────────────── */
  instituteName: "Parallax Academy",
  tagline: "Forty to a batch, a full-length test every second Sunday, and the same faculty from Class 11 to the exam.",
  city: "Kota",
  state: "Rajasthan",

  /* ── KEPT: market, language, currency, and what is taught ────────────── */
  country: "India",
  market: "india",
  currency: "INR",
  /* The hero headline is built from these and the city:
     "JEE and NEET coaching in Kota". Exam names, never claims. */
  focusAreas: ["JEE", "NEET"],

  /* ── CLEARED: history ────────────────────────────────────────────────── */
  established: "Since 2011",
  establishedYear: "2011",
  boardOrAffiliation: "A private coaching institute. Not affiliated to any board, and we do not claim to be.",

  about:
    "Parallax Academy has taught JEE and NEET aspirants in Kota since 2011, from one building on Example Road. We take forty students to a batch and we do not add chairs when a batch fills. Each batch keeps the same four teachers from the first class to the exam. There is a full-length test every second Sunday, discussed subject by subject in class the next day, and the marks reach parents by Wednesday. We do not run a hostel; we keep a list of verified ones and tell you which.",

  /* ── STRUCTURE: Hindi twins of the top-level text. Only the Hindi of KEPT
        fields survives a duplicate, so all of this is cleared with it. ── */
  hi: {
    tagline: "एक batch में चालीस विद्यार्थी, हर दूसरे रविवार पूरा test, और Class 11 से परीक्षा तक वही शिक्षक।",
    about:
      "Parallax Academy 2011 से कोटा में JEE और NEET की तैयारी करवा रही है, Example Road की एक ही इमारत से। एक batch में चालीस विद्यार्थी, और batch भरने पर कुर्सियाँ नहीं बढ़तीं। हर batch के चार शिक्षक पहली class से परीक्षा तक वही रहते हैं। हर दूसरे रविवार पूरा test होता है और बुधवार तक अंक अभिभावकों तक पहुँचते हैं। हमारा अपना hostel नहीं है; जाँचे हुए hostels की सूची हम देते हैं।",
    resultsHeading: "2026 के परिणाम",
    resultsNote:
      "इस हिस्से का हर आँकड़ा उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि परिणाम कैसे छपते हैं। आपके अपने परिणाम इनकी जगह लेंगे, और विद्यार्थी की लिखित सहमति के बिना हम न नाम छापेंगे न फ़ोटो।",
    scheduleNote: "2026-27 का सप्ताह। रविवार का test हर classroom batch के लिए ज़रूरी है और कभी आगे-पीछे नहीं होता।",
    vision: "कोटा में ऐसा institute जहाँ अभिभावक को हर पखवाड़े पता हो कि बच्चा कहाँ खड़ा है।",
    mission: "छोटे batch, वही शिक्षक पूरे course में, और हर test के अंक बुधवार तक घर पर।",
    classSizePromise: "एक batch में चालीस से ज़्यादा नहीं। Dropper batch में छत्तीस।",
    hostel: "हमारा अपना hostel नहीं है। हम जाँचे हुए hostels और PG की सूची देते हैं, और हर एक को हमारे counsellor ने ख़ुद देखा है।",
    sessionLabel: "सत्र 2027-28",
  },

  /* ── CLEARED: the About page. ─────────────────────────────────────────── */
  sessionLabel: "Session 2027-28",
  vision: "A Kota institute where a parent knows, every fortnight, exactly where their child stands.",
  mission: "Small batches, the same teachers for the whole course, and every test's marks at home by Wednesday.",
  classSizePromise: "Never more than forty to a batch. Thirty-six in the dropper batch.",
  hostel:
    "We do not run a hostel. We keep a list of verified hostels and PGs within a ten-minute walk, each visited by our counsellor, and we tell you which have a room. Mess and hostel fees are paid to the hostel, and our refund policy below covers only what you pay us.",
  founder: {
    name: "Rakesh Bhandari",
    role: "Founder and physics teacher",
    story:
      "I taught physics in a large Kota institute for nine years, in batches of a hundred and forty. The students who fell behind were the quiet ones, and nobody noticed until the test marks came. In 2011 I rented one floor on Example Road with two colleagues and set one rule: forty to a batch, and a parent hears from us every fortnight. We still teach from the same building, and I still take a physics class every day.",
    hi: {
      role: "संस्थापक और भौतिकी शिक्षक",
      story:
        "मैंने कोटा के एक बड़े institute में नौ साल physics पढ़ाई, एक सौ चालीस के batch में। जो बच्चे पीछे रह जाते थे वे अक्सर चुप रहने वाले होते थे, और test के अंक आने तक किसी को पता नहीं चलता था। 2011 में दो साथियों के साथ Example Road पर एक मंज़िल किराए पर ली और एक नियम बनाया: एक batch में चालीस, और हर पखवाड़े अभिभावक को हमारी ख़बर। आज भी उसी इमारत में पढ़ाते हैं, और मैं आज भी रोज़ एक physics class लेता हूँ।",
    },
  },

  /* ── CLEARED: trust figures. Every one carries its basis line. ─────────── */
  stats: [
    { value: "1,080", label: "Students in classroom batches", basis: "Session 2025-26, all batches, as on 1 August 2025", hi: { label: "Classroom batches में विद्यार्थी", basis: "सत्र 2025-26, सभी batch, 1 अगस्त 2025 तक" } },
    { value: "212", label: "Qualified for NEET UG counselling", basis: "NEET UG 2026, of 460 students from our batches who appeared", hi: { label: "NEET UG counselling के लिए qualify", basis: "NEET UG 2026, हमारे batches के 460 में से" } },
    { value: "148", label: "Qualified for JEE Advanced", basis: "JEE Main 2026, of 520 students from our batches who appeared", hi: { label: "JEE Advanced के लिए qualify", basis: "JEE Main 2026, हमारे batches के 520 में से" } },
    { value: "40", label: "Students per batch, at most", basis: "Class 11 and 12 batches. Dropper batches take 36.", hi: { label: "एक batch में अधिकतम विद्यार्थी", basis: "Class 11 और 12 के batch। Dropper batch में 36।" } },
  ],

  /* ── CLEARED: how joining works, three steps. ──────────────────────────── */
  joining: [
    { title: "Sit in on a class", body: "Book a free seat in an ordinary class of the batch your child would join. No test, no form.", hi: { title: "एक class में बैठिए", body: "जिस batch में बच्चा आएगा उसकी किसी भी आम class में मुफ़्त सीट बुक कीजिए। न test, न form।" } },
    { title: "Meet the counsellor", body: "Twenty minutes with the last report card. We tell you which batch fits, and if none does, we say so.", hi: { title: "Counsellor से मिलिए", body: "पिछले report card के साथ बीस मिनट। कौन सा batch ठीक है यह बताएँगे, और कोई ठीक नहीं तो वह भी।" } },
    { title: "Pay the first of four instalments", body: "You get a printed receipt and the fee schedule for the whole course. The fee does not change until the course ends.", hi: { title: "चार में से पहली किस्त", body: "छपी हुई रसीद और पूरे course का fee schedule मिलता है। Course ख़त्म होने तक fee नहीं बदलती।" } },
  ],

  /* ── STRUCTURE: the batch board. Name, level, subjects, duration,
        timings and mode are KEPT; batchStarts, seats, fee, feeNote and
        detail are CLEARED. Three batches carry every field of the batch row.
        The Class 12 batch leaves its fee empty on purpose, because a real
        record usually has one batch that is not priced yet, and the test
        series keeps its price out of `fee` (see the note on it). ───────── */
  courses: [
    {
      name: "JEE Main and Advanced, two year",
      level: "Class 11 to 12",
      subjects: "Physics, chemistry, mathematics",
      duration: "24 months",
      timings: "Mon to Sat, 2:00 to 6:00 pm",
      mode: "Classroom",
      batchStarts: "Starts 5 April 2027",
      seats: "40 per batch",
      fee: "1,24,000",
      feeNote: "per year, in four instalments",
      detail: "Timed around school: nothing before 2:00 pm on a weekday. The doubt desk opens at 1:00 pm and needs no appointment.",
      slug: "jee-two-year",
      category: "JEE",
      eligibility: "Passed Class 10 with mathematics and science, and joining Class 11 in April 2027 in any board.",
      syllabus: [
        { title: "Physics, Class 11", body: "Units and measurement, kinematics, laws of motion, work and energy, rotation, gravitation, properties of matter, thermodynamics, oscillations and waves." },
        { title: "Physics, Class 12", body: "Electrostatics, current electricity, magnetism, EMI and AC, optics, modern physics, semiconductors." },
        { title: "Chemistry", body: "Physical chemistry from mole concept to electrochemistry; inorganic by block, with the periodic trends first; organic from GOC through named reactions to biomolecules." },
        { title: "Mathematics", body: "Algebra, trigonometry, coordinate geometry, calculus in full, vectors and 3D, probability and statistics." },
        { title: "Board syllabus", body: "Timetabled separately from January of Class 12, with two board-pattern papers before the pre-boards." },
      ],
      material: ["Printed modules, one per chapter", "Daily practice sheets", "Previous-year JEE papers, solved in class", "Formula booklets for revision"],
      testPlan: "A chapter test every Thursday and a full-length JEE paper every second Sunday. Both are discussed in class the next day.",
      instalments: [
        { label: "Instalment 1", amount: "31,000", note: "At admission, April 2027" },
        { label: "Instalment 2", amount: "31,000", note: "By 30 June 2027" },
        { label: "Instalment 3", amount: "31,000", note: "By 30 September 2027" },
        { label: "Instalment 4", amount: "31,000", note: "By 15 December 2027" },
      ],
      inclusions: ["All printed material", "The fortnightly test series", "Doubt desk, every working day", "Fortnightly marks report to parents"],
      refundNote: "Leave with ten days' notice and the unused part of the fee is refunded pro-rata within ten days. The same rule applies in the second year.",
      facultyNames: ["Hemant Rathore", "Shalini Verma", "Imran Qureshi", "Devashish Jain"],
      faq: [
        { title: "My child's school runs until 2:00 pm. Will they be late?", body: "The first twenty minutes of every class are a recap of the last one, so a student who arrives by 2:20 pm misses nothing new." },
        { title: "Is the Class 12 board syllabus covered?", body: "Yes. From January of Class 12 there are separate board classes and two board-pattern papers before the school pre-boards." },
      ],
      hi: {
        name: "JEE Main और Advanced, दो साल",
        detail: "School के हिसाब से समय: weekday पर 2:00 बजे से पहले कुछ नहीं। Doubt desk 1:00 बजे खुलता है, appointment नहीं चाहिए।",
        feeNote: "प्रति वर्ष, चार किस्तों में",
        eligibility: "गणित और विज्ञान के साथ Class 10 पास, और अप्रैल 2027 में किसी भी board से Class 11 में।",
        refundNote: "दस दिन पहले बताकर छोड़ें तो बची हुई fee का हिस्सा दस दिन में लौटा दिया जाता है।",
      },
    },
    {
      name: "NEET, two year",
      level: "Class 11 to 12",
      subjects: "Physics, chemistry, botany, zoology",
      duration: "24 months",
      timings: "Mon to Sat, 2:00 to 6:00 pm",
      mode: "Classroom",
      batchStarts: "Starts 6 April 2027",
      seats: "40 per batch",
      fee: "1,18,000",
      feeNote: "per year, in four instalments",
      detail: "NCERT line by line in biology before any reference book. Diagram practice is on the timetable, not left to revision week.",
      slug: "neet-two-year",
      category: "NEET",
      eligibility: "Passed Class 10 with science, and joining Class 11 with biology in April 2027 in any board.",
      syllabus: [
        { title: "Botany", body: "Plant kingdom, morphology and anatomy, cell biology, plant physiology, reproduction in plants, genetics, ecology." },
        { title: "Zoology", body: "Animal kingdom, structural organisation, human physiology system by system, human reproduction, evolution, human health and disease, biotechnology." },
        { title: "Physics", body: "The full NEET syllabus, taught with the numericals NEET actually sets rather than the JEE depth." },
        { title: "Chemistry", body: "Physical, inorganic and organic, with NCERT reactions and exceptions drilled every week." },
      ],
      material: ["NCERT line-by-line notes for biology", "Printed modules for physics and chemistry", "Diagram practice book", "Previous-year NEET papers"],
      testPlan: "A 180-question NEET paper every second Sunday, plus a 45-question biology test every Thursday.",
      instalments: [
        { label: "Instalment 1", amount: "29,500", note: "At admission, April 2027" },
        { label: "Instalment 2", amount: "29,500", note: "By 30 June 2027" },
        { label: "Instalment 3", amount: "29,500", note: "By 30 September 2027" },
        { label: "Instalment 4", amount: "29,500", note: "By 15 December 2027" },
      ],
      inclusions: ["All printed material", "The fortnightly test series", "Weekly biology test", "Fortnightly marks report to parents"],
      refundNote: "Leave with ten days' notice and the unused part of the fee is refunded pro-rata within ten days.",
      facultyNames: ["Pooja Saxena", "Hemant Rathore", "Devashish Jain"],
      faq: [
        { title: "Is biology taught from NCERT or from reference books?", body: "NCERT first, line by line, in both years. Reference material comes in only after a chapter's NCERT test is cleared." },
        { title: "Can my child move from NEET to JEE after a few months?", body: "Yes, in the first three months, with no extra fee. The counsellor sits with you and the child before the change." },
      ],
      hi: {
        name: "NEET, दो साल",
        detail: "Biology में पहले NCERT, पंक्ति दर पंक्ति। Diagram का अभ्यास timetable में है, revision के हफ़्ते पर नहीं छोड़ा जाता।",
        feeNote: "प्रति वर्ष, चार किस्तों में",
        eligibility: "विज्ञान के साथ Class 10 पास, और अप्रैल 2027 में biology के साथ Class 11 में।",
        refundNote: "दस दिन पहले बताकर छोड़ें तो बची हुई fee का हिस्सा दस दिन में लौटा दिया जाता है।",
      },
    },
    {
      name: "Class 12, one year, JEE or NEET",
      level: "Class 12",
      subjects: "Physics, chemistry, and mathematics or biology",
      duration: "11 months",
      timings: "Mon to Sat, 3:00 to 6:30 pm",
      mode: "Classroom",
      batchStarts: "Starts 19 April 2027",
      seats: "40 per batch",
      detail: "Class 11 is revised in the first eight weeks, alongside the Class 12 syllabus. The fee for this batch is set in March.",
      slug: "class-12-one-year",
      category: "Class 12",
      eligibility: "In Class 12 from April 2027, with physics, chemistry and either mathematics or biology.",
      syllabus: [
        { title: "Weeks 1 to 8: Class 11 revision", body: "The chapters that carry the most weight in JEE and NEET, revised at speed with a test each Saturday." },
        { title: "Class 12 syllabus", body: "Physics, chemistry, and mathematics or biology, in the same order as the two year course." },
        { title: "Final ten weeks", body: "Full-length papers, one every four days, with the discussion the next morning." },
      ],
      material: ["Printed modules for Class 12", "Class 11 revision booklet", "Previous-year papers"],
      testPlan: "A weekly chapter test and a full-length paper every second Sunday, the same papers the two year batch sits.",
      inclusions: ["All printed material", "The fortnightly test series", "Doubt desk, every working day"],
      refundNote: "Leave with ten days' notice and the unused part of the fee is refunded pro-rata within ten days.",
      facultyNames: ["Hemant Rathore", "Shalini Verma", "Imran Qureshi", "Pooja Saxena"],
      faq: [
        { title: "Is one year enough?", body: "For a student who did Class 11 properly at school, often yes. At the counselling meeting we look at the Class 11 marks and tell you honestly." },
      ],
      hi: {
        category: "कक्षा 12",
        name: "Class 12, एक साल, JEE या NEET",
        detail: "पहले आठ हफ़्तों में Class 11 का revision, Class 12 के syllabus के साथ। इस batch की fee मार्च में तय होगी।",
      },
    },
    {
      name: "Dropper batch, JEE or NEET",
      level: "After Class 12",
      subjects: "Full syllabus, both years, from the beginning",
      duration: "11 months",
      timings: "Mon to Sat, 7:30 am to 12:30 pm",
      mode: "Classroom",
      batchStarts: "Starts 17 May 2027",
      seats: "36 per batch",
      fee: "1,36,000",
      feeNote: "for the year, in four instalments",
      detail: "Attendance below 85% is raised with the parent before the second instalment is taken, not after the exam.",
      slug: "dropper",
      category: "Dropper",
      eligibility: "Passed Class 12 with physics and chemistry, and mathematics for JEE or biology for NEET.",
      syllabus: [
        { title: "May to September", body: "The whole syllabus again from the first chapter, both years, at twice the classroom pace." },
        { title: "October to December", body: "Weak chapters, chosen from each student's own test record, in small groups." },
        { title: "January to the exam", body: "A full-length paper every third day in exam conditions, discussed the next morning." },
      ],
      material: ["Printed modules, both years", "Daily practice sheets", "Ten years of previous papers, solved"],
      testPlan: "A full-length paper every Sunday from October, and every third day from January.",
      instalments: [
        { label: "Instalment 1", amount: "34,000", note: "At admission, May 2027" },
        { label: "Instalment 2", amount: "34,000", note: "By 31 July 2027" },
        { label: "Instalment 3", amount: "34,000", note: "By 30 September 2027" },
        { label: "Instalment 4", amount: "34,000", note: "By 30 November 2027" },
      ],
      inclusions: ["All printed material", "Every test in the year", "Morning doubt desk", "Monthly meeting with parents"],
      refundNote: "Leave with ten days' notice and the unused part of the fee is refunded pro-rata within ten days.",
      facultyNames: ["Hemant Rathore", "Shalini Verma", "Imran Qureshi", "Pooja Saxena", "Devashish Jain"],
      faq: [
        { title: "Why are classes in the morning?", body: "A dropper has no school, and the exam is in the morning. Training the mind to peak at 9:00 am is part of the course." },
        { title: "What if the exam goes badly again?", body: "We sit with you after the result, with the test record, and tell you plainly whether another year makes sense." },
      ],
      hi: {
        name: "Dropper batch, JEE या NEET",
        detail: "85% से कम attendance पर दूसरी किस्त से पहले अभिभावक से बात होती है, परीक्षा के बाद नहीं।",
        feeNote: "पूरे साल के लिए, चार किस्तों में",
      },
    },
    {
      name: "All-India test series, JEE and NEET",
      level: "Class 12 and droppers",
      subjects: "Full-length papers in the exam pattern",
      duration: "22 tests, October to April",
      timings: "Alternate Sundays, 9:00 am to 12:00 noon",
      mode: "At the centre or online",
      batchStarts: "First test 11 October 2026",
      seats: "Open to students of any institute",
      /* No `fee` on purpose: the page prints ONE "from" figure, the lowest
         fee on the board, and a test series priced as a batch would make it
         read "Batches from 9,500". Its price is in the detail and the FAQ. */
      detail: "₹9,500 for all 22 tests. Ranked against every student who sat the paper that day, with a question-by-question analysis the next evening.",
      slug: "test-series",
      category: "Test series",
      eligibility: "Any student in Class 12 or preparing again, from any institute or none.",
      testPlan: "22 full-length papers in the current JEE Main or NEET pattern, on alternate Sundays from October to April.",
      inclusions: ["22 full-length papers", "Rank against everyone who sat that paper", "Question-by-question analysis", "One discussion class per paper"],
      refundNote: "Leave before the fifth paper and the fee for the papers not yet sat is refunded within ten days.",
      facultyNames: ["Devashish Jain"],
      hi: {
        category: "टेस्ट सीरीज़",
        name: "All-India test series, JEE और NEET",
        detail: "सभी 22 tests के लिए ₹9,500। उस दिन paper देने वाले हर विद्यार्थी के साथ rank, और अगली शाम हर प्रश्न का विश्लेषण।",
      },
    },
  ],

  /* ── CLEARED: results. No student is named, ever. The label sits on the
        section in `resultsNote`, not on each number. ─────────────────── */
  resultsHeading: "The 2026 results",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a result list is set. Yours replaces it line for line, exactly as you publish it, and we will not print a student's name or photograph without their written consent.",
  /* Every row names the course, its duration and whether it was paid, as
     the CCPA 2024 coaching guidelines require of a published result. */
  results: [
    { achievement: "AIR 612", exam: "JEE Advanced", year: "2026", note: "Dropper batch", category: "JEE", courseName: "Dropper batch, JEE", courseDuration: "11 months", paid: "paid", consent: true, quote: "The Sunday papers were harder than the real one. By April the exam hall felt like a Sunday.", hi: { achievement: "AIR 612", note: "Dropper batch", courseName: "Dropper batch, JEE", quote: "रविवार के papers असली paper से कठिन थे। अप्रैल तक exam hall भी रविवार जैसा लगने लगा।" } },
    { achievement: "AIR 2,347", exam: "JEE Advanced", year: "2026", note: "Two year classroom batch", category: "JEE", courseName: "JEE Main and Advanced, two year", courseDuration: "24 months", paid: "paid" },
    { achievement: "99.83 percentile", exam: "JEE Main, January session", year: "2026", note: "Two year classroom batch", category: "JEE", courseName: "JEE Main and Advanced, two year", courseDuration: "24 months", paid: "scholarship" },
    { achievement: "686 of 720", exam: "NEET UG", year: "2026", note: "Dropper batch", category: "NEET", courseName: "Dropper batch, NEET", courseDuration: "11 months", paid: "paid", consent: true, quote: "Ma'am made us draw every NCERT diagram twice. Three questions in the paper were those diagrams." },
    { achievement: "652 of 720", exam: "NEET UG", year: "2026", note: "Two year classroom batch", category: "NEET", courseName: "NEET, two year", courseDuration: "24 months", paid: "paid" },
    { achievement: "212 of 460 qualified for NEET UG counselling", exam: "NEET UG", year: "2026", note: "All batches, 2026 cohort", category: "NEET", courseName: "All NEET courses", courseDuration: "11 to 24 months", paid: "paid" },
    { achievement: "AIR 1,905", exam: "JEE Advanced", year: "2025", note: "Two year classroom batch", category: "JEE", courseName: "JEE Main and Advanced, two year", courseDuration: "24 months", paid: "paid" },
    { achievement: "99.61 percentile", exam: "JEE Main, April session", year: "2025", note: "Class 12 one year batch", category: "JEE", courseName: "Class 12, one year", courseDuration: "11 months", paid: "paid" },
    { achievement: "671 of 720", exam: "NEET UG", year: "2025", note: "Dropper batch", category: "NEET", courseName: "Dropper batch, NEET", courseDuration: "11 months", paid: "scholarship" },
    { achievement: "AIR 3,418", exam: "JEE Advanced", year: "2024", note: "Dropper batch", category: "JEE", courseName: "Dropper batch, JEE", courseDuration: "11 months", paid: "paid" },
    { achievement: "660 of 720", exam: "NEET UG", year: "2024", note: "Two year classroom batch", category: "NEET", courseName: "NEET, two year", courseDuration: "24 months", paid: "paid" },
  ],

  /* ── CLEARED: faculty. In coaching the teacher is the product, so every
        line says what the person takes, not only how long they have taught. */
  faculty: [
    { name: "Hemant Rathore", subject: "Physics", qualification: "M.Sc. Physics", experience: "17 years. Takes the two year JEE batch and the dropper batch.", role: "Head of Physics", group: "Physics", batches: "JEE two year, NEET two year, Dropper", style: "Starts every chapter with an experiment you can do on the desk, then the derivation, then the problems.", hi: { subject: "भौतिकी", experience: "17 साल। JEE दो साल और dropper batch लेते हैं।", role: "भौतिकी विभाग प्रमुख", style: "हर chapter मेज़ पर किए जा सकने वाले प्रयोग से, फिर derivation, फिर सवाल।" } },
    { name: "Shalini Verma", subject: "Organic chemistry", qualification: "M.Sc. Chemistry", experience: "13 years. Takes every batch from Class 11 up.", role: "Head of Chemistry", group: "Chemistry", batches: "All batches", style: "Mechanisms on the board, never memorised lists. Every reaction is drawn arrow by arrow.", hi: { subject: "Organic chemistry", experience: "13 साल। Class 11 से हर batch।", role: "रसायन विभाग प्रमुख", style: "Reactions रटाए नहीं जाते, हर mechanism board पर तीर दर तीर।" } },
    { name: "Imran Qureshi", subject: "Mathematics", qualification: "M.Sc. Mathematics", experience: "19 years. Takes the JEE batches and the Monday test discussion.", role: "Head of Mathematics", group: "Mathematics", batches: "JEE two year, Class 12, Dropper", style: "Solves the same problem three ways and asks the class which one they would use under a clock.", hi: { subject: "गणित", experience: "19 साल। JEE batches और सोमवार की test चर्चा।", role: "गणित विभाग प्रमुख", style: "एक सवाल तीन तरीक़ों से, फिर पूछते हैं कि घड़ी चलते हुए कौन सा चुनोगे।" } },
    { name: "Pooja Saxena", subject: "Botany and zoology", qualification: "M.Sc. Zoology", experience: "10 years. Takes both NEET batches.", group: "Biology", batches: "NEET two year, Class 12, Dropper", style: "NCERT line by line, with a diagram drawn in every class.", hi: { subject: "वनस्पति और जंतु विज्ञान", experience: "10 साल। दोनों NEET batch।", style: "NCERT पंक्ति दर पंक्ति, हर class में एक diagram।" } },
    { name: "Devashish Jain", subject: "Physical and inorganic chemistry", qualification: "M.Sc. Chemistry, B.Ed.", experience: "8 years. Writes the test series papers.", role: "Test series coordinator", group: "Chemistry", batches: "NEET two year, Dropper, Test series", style: "Numericals first, theory as the numericals need it.", hi: { subject: "Physical और inorganic chemistry", experience: "8 साल। Test series के papers यही बनाते हैं।", role: "Test series समन्वयक", style: "पहले numericals, theory उतनी जितनी numericals को चाहिए।" } },
  ],

  /* ── CLEARED: why parents choose us. Each block is a parent's worry,
        answered with a practice. A practice is a claim, so it is cleared. */
  method: [
    {
      title: "You will know where your child stands, every fortnight",
      body: "A full-length test every second Sunday, in exam conditions. It is discussed subject by subject in class on Monday, and the marks and the attendance reach you by Wednesday. Nobody has to ask.",
    },
    {
      title: "The same four teachers from the first class to the exam",
      body: "We do not rotate faculty mid-course and we do not split a batch when it fills. The names on this page are the people your child will have.",
    },
    {
      title: "School and boards are not sacrificed to the entrance",
      body: "Weekday classes start at 2:00 pm so school comes first, and the Class 12 board syllabus is timetabled separately rather than folded into the entrance syllabus.",
    },
  ],

  /* ── STRUCTURE: the week. Label, days, time and subject are KEPT;
        faculty and room are CLEARED. With no photographs this timetable is
        the page's visual anchor. ─────────────────────────────────────── */
  scheduleNote:
    "The 2026-27 week. The Sunday test is compulsory for every classroom batch and is the only class that is never rescheduled.",
  schedule: [
    { label: "JEE, Class 11", days: "Monday and Thursday", time: "2:00 to 6:00 pm", subject: "Physics", faculty: "Hemant Rathore", room: "Hall 1", hi: { label: "JEE, कक्षा 11", days: "सोमवार और गुरुवार", time: "दोपहर 2 से शाम 6 बजे", subject: "भौतिकी" } },
    { label: "JEE, Class 11", days: "Tuesday and Friday", time: "2:00 to 6:00 pm", subject: "Mathematics", faculty: "Imran Qureshi", room: "Hall 1", hi: { label: "JEE, कक्षा 11", days: "मंगलवार और शुक्रवार", time: "दोपहर 2 से शाम 6 बजे", subject: "गणित" } },
    { label: "JEE, Class 11", days: "Wednesday and Saturday", time: "2:00 to 6:00 pm", subject: "Chemistry", faculty: "Shalini Verma", room: "Hall 1", hi: { label: "JEE, कक्षा 11", days: "बुधवार और शनिवार", time: "दोपहर 2 से शाम 6 बजे", subject: "रसायन" } },
    { label: "NEET, Class 11", days: "Monday and Thursday", time: "2:00 to 6:00 pm", subject: "Botany and zoology", faculty: "Pooja Saxena", room: "Hall 2", hi: { label: "NEET, कक्षा 11", days: "सोमवार और गुरुवार", time: "दोपहर 2 से शाम 6 बजे", subject: "वनस्पति और जंतु विज्ञान" } },
    { label: "NEET, Class 11", days: "Tuesday and Friday", time: "2:00 to 6:00 pm", subject: "Physics", faculty: "Hemant Rathore", room: "Hall 2", hi: { label: "NEET, कक्षा 11", days: "मंगलवार और शुक्रवार", time: "दोपहर 2 से शाम 6 बजे", subject: "भौतिकी" } },
    { label: "NEET, Class 11", days: "Wednesday and Saturday", time: "2:00 to 6:00 pm", subject: "Chemistry", faculty: "Devashish Jain", room: "Hall 2", hi: { label: "NEET, कक्षा 11", days: "बुधवार और शनिवार", time: "दोपहर 2 से शाम 6 बजे", subject: "रसायन" } },
    { label: "Dropper batch", days: "Monday to Saturday", time: "7:30 am to 12:30 pm", subject: "Full syllabus, rotating", faculty: "All five teachers", room: "Hall 3", hi: { days: "सोमवार से शनिवार", time: "सुबह 7:30 से दोपहर 12:30", subject: "पूरा syllabus, बारी-बारी से" } },
    { label: "Test, all classroom batches", days: "Alternate Sundays", time: "9:00 am to 12:00 noon", subject: "Full paper, exam conditions", faculty: "Invigilated by the subject teacher", room: "Halls 1 to 3", hi: { label: "Test, सभी classroom batch", days: "हर दूसरे रविवार", time: "सुबह 9 से दोपहर 12 बजे", subject: "पूरा paper, exam जैसे माहौल में" } },
    { label: "Doubt desk", days: "Monday to Saturday", time: "1:00 to 2:00 pm", subject: "Any subject, no appointment", faculty: "One teacher on rota", room: "Room 4", hi: { time: "दोपहर 1 से 2 बजे", subject: "कोई भी subject, पहले से समय लेने की ज़रूरत नहीं", days: "सोमवार से शनिवार" } },
  ],

  /* ── CLEARED: the demo class, which is a promise with terms. ─────────── */
  trial: {
    heading: "Sit in on a real class before you pay anything",
    body: "We do not put on a special demo lesson, because a lesson staged for a visitor tells you nothing. Come to an ordinary class in the batch your child would join and stay for all four hours. The teacher is told you are there, and that is the only thing that changes.",
    duration: "One full class, four hours",
    bring: "A notebook, a pen, and the last school report card.",
    howToBook: "Call or send a WhatsApp message and we will tell you which class has a free seat this week. There is no form.",
    hi: {
      heading: "Fee देने से पहले एक असली class में बैठिए",
      body: "हम अलग से demo lesson नहीं करते, क्योंकि मेहमान के लिए सजाई class कुछ नहीं बताती। बच्चा जिस batch में आएगा उसकी किसी आम class में आइए और पूरे चार घंटे रुकिए। शिक्षक को बस इतना बताया जाता है कि आप आए हैं।",
      duration: "एक पूरी class, चार घंटे",
      bring: "एक notebook, pen, और school का पिछला report card।",
      howToBook: "Call या WhatsApp कीजिए, हम बताएँगे इस हफ़्ते किस class में सीट ख़ाली है। कोई form नहीं।",
    },
  },

  /* ── STRUCTURE: FAQ. Only `generic: true` entries survive a duplicate,
        and only those whose answer is true of any JEE and NEET institute and
        names no fee, date, count, person or place. The fee question is
        never generic. ──────────────────────────────────────────────── */
  faq: [
    {
      title: "What does a batch cost?",
      body: "The two year JEE batch is ₹1,24,000 a year and the two year NEET batch ₹1,18,000 a year, each in four instalments with a printed receipt for every one. The dropper batch is ₹1,36,000 for the year, also in four instalments, and the test series ₹9,500 for all 22 tests. There is no admission fee and no separate material fee, and the fee does not change once a course has started. These are example figures and your own replace them.",
      group: "Fees",
    },
    {
      title: "Which exams do the classroom courses prepare for?",
      body: "JEE Main and JEE Advanced for the mathematics group, NEET UG for the biology group, and the board papers for both.",
      group: "Courses",
      generic: true,
    },
    {
      title: "How many students are in a batch?",
      body: "Forty in the Class 11 and Class 12 batches and thirty-six in the dropper batch. When a batch fills we close it and open the next start date on the board above.",
    },
    {
      title: "Will the same teachers take my child for both years?",
      body: "Yes. We do not rotate faculty mid-course. The five people on this page are the people your child will have.",
    },
    {
      title: "Can my child take the test series without joining a batch?",
      body: "Yes. The test series is open to students of any institute, at the centre or online, and is ranked against everybody who sat that paper.",
    },
    {
      title: "What if my child misses a class?",
      body: "The notes are given the next class day and the doubt desk runs from 1:00 to 2:00 pm every working day. If more than three classes are missed in a month we call you rather than waiting for the test marks to tell you.",
    },
    {
      title: "What do we bring at admission?",
      body: "The latest mark sheet, a photo identity card for the student, and passport photographs. Bring the originals; the office keeps copies.",
      generic: true,
    },
    {
      title: "What happens if we withdraw part-way through the year?",
      body: "Tell the office in writing with ten days' notice. The unused part of the fee, counted by the month, is refunded to your bank account within ten days, and that includes anything paid to us for hostel or mess. An instalment not yet due is simply not taken.",
      group: "Fees",
    },
    {
      title: "Do you have a hostel?",
      body: "No. We keep a list of verified hostels and PGs within a ten-minute walk, each visited by our counsellor, and we tell you which have a room this month. You pay the hostel directly.",
      group: "Living in Kota",
    },
    {
      title: "Who does my child talk to if they are not coping?",
      body: "Our counsellor is at the centre every weekday afternoon and needs no appointment. A teacher who notices a student going quiet tells the counsellor the same day, and we call you.",
      group: "Living in Kota",
    },
    {
      title: "Do you give a rank predictor or a guaranteed seat?",
      body: "No. Nobody can honestly promise a rank. We give you the fortnightly test marks and the rank in each paper, and we tell you plainly what they mean.",
      group: "Results",
    },
  ],

  /* ── CLEARED: notices ────────────────────────────────────────────────── */
  notices: [
    {
      title: "April 2027 batches: seats left",
      date: "24 September 2026",
      body: "JEE two year, 9 seats. NEET two year, 14 seats. This line is updated every Monday.",
      pinned: true,
      kind: "notice",
      posted: "2026-09-24",
      expires: "2027-04-05",
      hi: { title: "अप्रैल 2027 batches: बची सीटें", date: "24 सितंबर 2026", body: "JEE दो साल, 9 सीटें। NEET दो साल, 14 सीटें। यह हर सोमवार अपडेट होता है।" },
    },
    {
      title: "Test series: first paper on 11 October",
      date: "18 September 2026",
      body: "Registration closes on 8 October. Students from other institutes register at the front desk or on WhatsApp.",
      kind: "event",
      posted: "2026-09-18",
      expires: "2026-10-11",
      hi: { title: "Test series: पहला paper 11 अक्टूबर को", date: "18 सितंबर 2026", body: "Registration 8 अक्टूबर को बंद। दूसरे institutes के विद्यार्थी front desk पर या WhatsApp पर register करें।" },
    },
    {
      title: "Scholarship test on Sunday 8 November",
      date: "15 September 2026",
      body: "For students in Class 10 and Class 12 joining in 2027. Free to sit. Details on the scholarship page.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2026-11-08",
      hi: { title: "Scholarship test रविवार 8 नवंबर को", date: "15 सितंबर 2026", body: "2027 में आने वाले Class 10 और Class 12 के विद्यार्थियों के लिए। कोई fee नहीं। पूरी जानकारी scholarship page पर।" },
    },
    {
      title: "Second instalment due on 30 September",
      date: "11 September 2026",
      body: "Cash is not accepted at the centre. The bank details are printed on the receipt for the first instalment.",
      kind: "notice",
      posted: "2026-09-11",
      expires: "2026-09-30",
      hi: { title: "दूसरी किस्त 30 सितंबर तक", date: "11 सितंबर 2026", body: "Centre पर नक़द नहीं लिया जाता। बैंक का विवरण पहली किस्त की रसीद पर छपा है।" },
    },
  ],

  /* ── CLEARED: reviews. A relation, never a name. No rating: a star figure
        needs a real profile to link to, and a template has none. ───────── */
  reviews: [
    { quote: "We moved from a batch of a hundred and sixty. Here the physics teacher knew my son's weak chapter by the third week, and told us before the test did.", relation: "Parent, JEE two year course, 2025-27", consent: true, category: "JEE", hi: { quote: "हम एक सौ साठ के batch से आए थे। यहाँ तीसरे हफ़्ते तक physics sir को बेटे का कमज़ोर chapter पता था, और test से पहले हमें बता दिया।", relation: "अभिभावक, JEE दो साल, 2025-27" } },
    { quote: "The marks message comes every Wednesday without fail. I live in Jaipur and it is the one thing that lets me sleep.", relation: "Parent, NEET two year course, 2024-26", consent: true, category: "NEET", hi: { quote: "अंकों का message हर बुधवार आता है, कभी नहीं चूकता। मैं जयपुर में रहती हूँ और इसी से नींद आती है।", relation: "अभिभावक, NEET दो साल, 2024-26" } },
    { quote: "In the dropper year they made me sit a paper every third day. I hated it in January and understood it in May.", relation: "Student, dropper batch, 2025-26", consent: true, category: "JEE", hi: { quote: "Dropper साल में हर तीसरे दिन paper देना पड़ता था। जनवरी में बुरा लगा, मई में समझ आया।", relation: "विद्यार्थी, dropper batch, 2025-26" } },
    { quote: "They told us plainly that one more year was not a good idea for our daughter, and why. Nobody else we met said that.", relation: "Parent, counselling meeting, 2025", consent: true, category: "NEET", hi: { quote: "उन्होंने साफ़ बताया कि बेटी के लिए एक और साल ठीक नहीं है, और क्यों। किसी और ने यह नहीं कहा।", relation: "अभिभावक, counselling meeting, 2025" } },
    { quote: "Organic chemistry finally made sense when ma'am stopped giving lists and drew the arrows.", relation: "Student, JEE two year course, 2024-26", consent: true, category: "JEE" },
  ],

  /* ── CLEARED: photographs are captions only in a template. ────────────── */
  photos: [
    { src: "", alt: "Hall 1 during a Monday physics class, forty desks", category: "Classrooms", caption: "Hall 1, Monday physics" },
    { src: "", alt: "The doubt desk at 1:30 pm, three students with one teacher", category: "Doubt desk", caption: "The doubt desk, before class" },
    { src: "", alt: "A Sunday test in exam conditions in Hall 2", category: "Tests", caption: "Sunday paper, Hall 2" },
    { src: "", alt: "The reading room with printed modules on the shelves", category: "Centre", caption: "The reading room" },
    { src: "", alt: "The counsellor's room, two chairs and a window", category: "Centre", caption: "The counsellor's room" },
    { src: "", alt: "Test results pinned on the notice board on a Wednesday", category: "Tests", caption: "Wednesday results board" },
  ],

  /* ── CLEARED: links. example.com on purpose: a template has no portal. ── */
  portalLinks: [
    { label: "Student test portal", url: "https://tests.example.com", audience: "Students", note: "Online papers and answer keys", hi: { label: "विद्यार्थी test portal", note: "Online papers और answer keys" } },
    { label: "Parent marks and attendance", url: "https://parents.example.com", audience: "Parents", note: "The fortnightly report, online", hi: { label: "अभिभावक: अंक और attendance", note: "हर पखवाड़े की report, online" } },
    { label: "Fee payment", url: "https://pay.example.com", audience: "Parents", note: "Receipt emailed the same day", hi: { label: "Fee भुगतान", note: "रसीद उसी दिन email पर" } },
  ],
  downloads: [
    { label: "JEE Main sample paper with answer key", url: "https://example.com/jee-sample.pdf", group: "Sample papers" },
    { label: "NEET UG sample paper with answer key", url: "https://example.com/neet-sample.pdf", group: "Sample papers" },
    { label: "OMR sheet for practice", url: "https://example.com/omr.pdf", group: "Forms" },
    { label: "Fee schedule 2027-28", url: "https://example.com/fees.pdf", group: "Fees" },
  ],

  /* ── CLEARED: the test series page. No rank predictor: it cannot be
        honest, so the page shows the schedule and links out. ─────────── */
  testSeries: {
    intro: "Twenty-two full-length papers from October to April, open to students of any institute. You sit them at the centre in exam conditions or online at the same hour, and you are ranked against everyone who sat that paper.",
    types: [
      { title: "Full-length papers", body: "JEE Main or NEET pattern, three hours, the whole syllabus from December." },
      { title: "Part syllabus papers", body: "October and November papers cover only what classroom batches have finished, announced two weeks ahead." },
      { title: "Discussion class", body: "The Monday after each paper, one subject teacher per paper, at the centre and streamed." },
    ],
    schedule: [
      { label: "Paper 1", days: "Sunday 11 October 2026", time: "9:00 am to 12:00 noon", subject: "Part syllabus", hi: { days: "रविवार, 11 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "syllabus का एक हिस्सा" } },
      { label: "Paper 2", days: "Sunday 25 October 2026", time: "9:00 am to 12:00 noon", subject: "Part syllabus", hi: { days: "रविवार, 25 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "syllabus का एक हिस्सा" } },
      { label: "Paper 3", days: "Sunday 8 November 2026", time: "2:00 to 5:00 pm", subject: "Part syllabus", hi: { days: "रविवार, 8 नवंबर 2026", time: "दोपहर 2 से शाम 5 बजे", subject: "syllabus का एक हिस्सा" } },
      { label: "Papers 10 to 22", days: "Alternate Sundays, December to April", time: "9:00 am to 12:00 noon", subject: "Full syllabus", hi: { label: "Paper 10 से 22", days: "दिसंबर से अप्रैल, हर दूसरे रविवार", time: "सुबह 9 से दोपहर 12 बजे", subject: "पूरा syllabus" } },
    ],
    pattern: "JEE Main: 75 questions, 300 marks, minus one for a wrong answer. NEET: 180 questions, 720 marks, minus one for a wrong answer. The pattern follows the latest official notice.",
    downloads: [
      { label: "Test series schedule, all 22 papers", url: "https://example.com/test-schedule.pdf", group: "Schedule" },
      { label: "Previous-year JEE Main papers", url: "https://example.com/jee-pyq.pdf", group: "Previous papers" },
    ],
    platformUrl: "https://tests.example.com",
    hi: {
      intro: "अक्टूबर से अप्रैल तक बाईस पूरे papers, किसी भी institute के विद्यार्थी के लिए। Centre पर exam जैसे माहौल में या उसी समय online, और उस paper को देने वाले हर विद्यार्थी के साथ rank।",
      pattern: "JEE Main: 75 प्रश्न, 300 अंक, ग़लत उत्तर पर एक अंक कटता है। NEET: 180 प्रश्न, 720 अंक, ग़लत उत्तर पर एक अंक कटता है।",
    },
  },

  /* ── CLEARED: the scholarship test. ───────────────────────────────────── */
  scholarship: {
    name: "Parallax Scholarship Test 2027",
    date: "Sunday 8 November 2026",
    mode: "At the centre, 10:00 am to 12:00 noon, or online at the same hour",
    centres: ["Kota, Example Road", "Online, from home"],
    eligibility: "Students in Class 10 joining a two year course, and students in Class 12 joining the dropper batch, in 2027.",
    syllabus: "Class 10: mathematics and science of Class 9 and 10, with a mental ability section. Class 12: physics, chemistry, and mathematics or biology of Class 11.",
    rewards: [
      { title: "Top 10 on the test", body: "90% off the tuition fee for the first year." },
      { title: "Next 40", body: "50% off the tuition fee for the first year." },
      { title: "Everyone who sits", body: "A subject-wise score report and a free counselling meeting." },
    ],
    registerUrl: "https://example.com/scholarship",
    resultDate: "Sunday 22 November 2026",
    faq: [
      { title: "Is there a fee to sit the test?", body: "No." },
      { title: "Does the scholarship continue into the second year?", body: "It continues if the student's attendance stays above 85% and the Class 11 test average is in the top half of the batch." },
      { title: "Is a scholarship student shown differently in results?", body: "Yes. Every result we publish says whether the student paid, had a scholarship or studied free, as the law requires." },
    ],
    hi: {
      name: "Parallax Scholarship Test 2027",
      date: "रविवार 8 नवंबर 2026",
      mode: "Centre पर, सुबह 10:00 से 12:00, या उसी समय online",
      eligibility: "2027 में दो साल के course के लिए Class 10 के विद्यार्थी, और dropper batch के लिए Class 12 के विद्यार्थी।",
      resultDate: "रविवार 22 नवंबर 2026",
    },
  },

  /* ── CLEARED: blog. Written by the teachers, for a parent or a student. ─ */
  posts: [
    {
      slug: "choosing-a-kota-hostel",
      title: "Choosing a hostel in Kota: seven questions to ask before you pay",
      date: "12 September 2026",
      author: "Rakesh Bhandari",
      excerpt: "The hostel decides more of a Kota year than the institute does. What we ask on every visit, and what a parent should see with their own eyes.",
      body: "Most parents choose the institute first and the hostel in an afternoon. It should be the other way round, or at least given the same care, because your child will spend more waking hours in that room than in our classrooms.\n\nAsk to see the room your child will actually get, not the show room on the ground floor. Check the window, the fan and the lock. Ask who holds the spare key.\n\nAsk what time the gate closes and who checks it. Ask what happens when a student does not come back. The right answer names a person and a phone call to you.\n\nEat one meal in the mess, unannounced if you can. Ask how the refund works for hostel and mess if your child leaves mid-year. In Rajasthan the law now says it must be pro-rata. Get it in writing.",
      hi: { title: "कोटा में hostel चुनना: पैसे देने से पहले सात सवाल", excerpt: "Kota का साल institute से ज़्यादा hostel तय करता है। हर visit पर हम क्या पूछते हैं, और अभिभावक को अपनी आँखों से क्या देखना चाहिए।" },
    },
    {
      slug: "reading-a-test-report",
      title: "How to read your child's fortnightly test report",
      date: "29 August 2026",
      author: "Imran Qureshi",
      excerpt: "The total is the least useful number on the page. Three lines to read first, and the one question to ask your child at dinner.",
      body: "The report has a total, a rank, and a table of attempted, correct and wrong answers by subject. Parents read the total. Read the wrong answers first.\n\nA student with many wrong answers is guessing, and the negative marking is costing them more than the chapters they do not know. That is a habit, and it can be fixed in a month.\n\nA student with few attempts is slow or afraid. That needs timed practice, not more theory.\n\nThen ask one question at dinner: which question did you get wrong that you knew how to do? The answer tells you more than the rank.",
    },
    {
      slug: "dropper-year-honest-answer",
      title: "Should my child take a dropper year? An honest answer",
      date: "20 June 2026",
      author: "Hemant Rathore",
      excerpt: "Sometimes yes. Often no. The test record usually knows before the family does.",
      body: "A dropper year works when the student lost marks to something fixable: a weak Class 11, an illness, a bad paper day. It rarely works when the student has already given two honest years and the test marks were flat throughout.\n\nLook at the last ten test scores, not the final exam. A rising line says another year may help. A flat line says the method has to change, not only the calendar.\n\nAnd ask the child, alone, whether they want it. A dropper year chosen by the parents is the hardest year we teach.",
    },
  ],

  /* ── CLEARED: fees, refunds and the MoE 2024 disclosure. The terms follow
        the Rajasthan Coaching Centres Act 2025 for a Kota institute. ──── */
  feesPolicy: {
    intro: "Every fee is printed on its course page, with its instalments. This page sets out how we take fees and how we return them.",
    paymentModes: ["UPI", "Bank transfer", "Card at the front desk", "Demand draft"],
    instalmentNote: "Every classroom course can be paid in four instalments or more. Paying the year at once gives no discount, so no family is pushed into it.",
    refund: "Leave at any time with ten days' notice in writing. The unused part of the fee, counted by the month, is refunded within ten days of the request, including anything paid to us for hostel or mess.",
    receipts: "A printed receipt for every payment, and the same receipt by email the same day. Cash is not accepted.",
    noIncrease: "The fee printed when your child joins is the fee until the course ends.",
    hostel: "We do not run a hostel. Fees for the hostels on our list are paid to the hostel, under its own refund terms, which we ask to see before we list it.",
    studentsCoached: "1,080",
    studentsSucceeded: "360",
    countsYear: "2025-26: students qualifying for JEE Advanced or NEET UG counselling",
    hi: {
      intro: "हर fee उसके course page पर छपी है, किस्तों के साथ। यहाँ बताया है कि fee कैसे लेते हैं और कैसे लौटाते हैं।",
      instalmentNote: "हर classroom course चार या ज़्यादा किस्तों में दिया जा सकता है। पूरा साल एक साथ देने पर कोई छूट नहीं, ताकि किसी परिवार पर दबाव न हो।",
      refund: "दस दिन पहले लिखकर बताइए और कभी भी छोड़िए। बची हुई fee, महीने के हिसाब से, दस दिन में लौटाई जाती है, hostel या mess के लिए हमें दिया पैसा भी।",
      receipts: "हर भुगतान की छपी रसीद, और वही रसीद उसी दिन email पर। नक़द नहीं लिया जाता।",
      noIncrease: "बच्चे के आने पर जो fee छपी है, course ख़त्म होने तक वही रहेगी।",
      hostel: "हमारा अपना hostel नहीं है। सूची वाले hostels की fee सीधे hostel को जाती है, उनकी अपनी refund शर्तों पर, जिन्हें हम सूची में डालने से पहले देखते हैं।",
    },
  },

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "admissions@example.com",
    addressLines: ["Parallax Academy", "Third floor, Example Tower, Example Road", "Kota, Rajasthan 324000"],
    hours: "Monday to Saturday, 9:00 am to 7:30 pm. Sunday, 8:00 am to 1:00 pm on test days.",
    mapQuery: "Parallax Academy, Kota",
    landmark: "Behind the Example Road bus stand, above the stationery shop",
    hi: {
      hours: "सोमवार से शनिवार, सुबह 9:00 से शाम 7:30। रविवार, test वाले दिन सुबह 8:00 से दोपहर 1:00।",
      landmark: "Example Road bus stand के पीछे, stationery की दुकान के ऊपर",
    },
  },
});
