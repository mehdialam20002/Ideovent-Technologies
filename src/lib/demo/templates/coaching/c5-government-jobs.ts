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
  sitePages: [...COACHING_PAGE_SETS["c5-government-jobs"]],

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
    tagline: "काम से पहले एक batch और काम के बाद एक, हर रविवार असली pattern में पूरा mock, और सुबह 6 से रात 10 बजे तक खुला study hall।",
    about: "कसौटी कॉम्पिटिशन क्लासेज़ 2012 से सासाराम में SSC, बैंक और railway परीक्षाओं की तैयारी करवा रही है। हमारे ज़्यादातर विद्यार्थी रोहतास और आसपास के ज़िलों के स्नातक हैं, और कई दिन में काम करते हैं। हर class हिंदी और अंग्रेज़ी दोनों में होती है।",
    resultsHeading: "पिछले बारह महीनों के चयन",
    scheduleNote: "Study hall हर दिन खुला है, रविवार भी, power backup के साथ। आख़िरी class रात 8:30 बजे ख़त्म होती है।",
    classSizePromise: "एक batch में साठ से ज़्यादा नहीं, banking में पचास, state exams में चालीस।",
    mission: "ईमानदार गिनती, असली pattern में हर हफ़्ते mock, और हिंदी माध्यम को पूरा सम्मान।",
  },

  /* ── CLEARED: the About page. ─────────────────────────────────────────── */
  classSizePromise: "Never more than sixty to a batch; fifty in banking and forty in state exams.",
  mission: "Honest counts, a mock every week in the real pattern, and Hindi medium treated as first class.",
  founder: {
    name: "Santosh Kumar Singh",
    role: "Founder and quant teacher",
    story: "I gave SSC three times from Sasaram and travelled to Patna for coaching each time, spending money my family did not have. In 2012 I started a maths class in one room above the market so that nobody here would need to. The rule I set then still holds: we print a selection only with the roll number, and we never promise one.",
    hi: { role: "संस्थापक और गणित शिक्षक", story: "मैंने सासाराम से तीन बार SSC दिया और हर बार coaching के लिए पटना गया, उस पैसे से जो परिवार के पास नहीं था। 2012 में बाज़ार के ऊपर एक कमरे में गणित की class शुरू की ताकि यहाँ किसी को जाना न पड़े। तब का नियम आज भी है: चयन सिर्फ़ roll number के साथ छापते हैं, और कभी वादा नहीं करते।" },
  },
  stats: [
    { value: "121", label: "Final selections, all exams", basis: "Results declared October 2024 to September 2025, each checked against the commission's list", hi: { label: "अंतिम चयन, सभी परीक्षाएँ", basis: "अक्टूबर 2024 से सितंबर 2025 तक घोषित परिणाम, हर एक आयोग की सूची से मिलाया" } },
    { value: "24", label: "Full mocks a season, on computers", basis: "Sunday series, October to March", hi: { label: "हर season में computer पर पूरे mock", basis: "रविवार series, अक्टूबर से मार्च" } },
    { value: "16", label: "Hours a day the study hall is open", basis: "6:00 am to 10:00 pm, every day", hi: { label: "Study hall रोज़ इतने घंटे खुला", basis: "सुबह 6:00 से रात 10:00, हर दिन" } },
  ],
  joining: [
    { title: "Attend three days free", body: "Sit in on the batch you want and take that week's Sunday mock.", hi: { title: "तीन दिन मुफ़्त", body: "जिस batch में आना है उसमें बैठिए और उस हफ़्ते का रविवार mock दीजिए।" } },
    { title: "Pick morning, evening or both", body: "Move between the two SSC batches in any week your shifts change.", hi: { title: "सुबह, शाम या दोनों", body: "जिस हफ़्ते shift बदले, दोनों SSC batch में आ-जा सकते हैं।" } },
    { title: "Pay the first instalment", body: "It holds your seat. The rest is in two parts, with a receipt each time.", hi: { title: "पहली किस्त", body: "इससे सीट पक्की होती है। बाक़ी दो हिस्सों में, हर बार रसीद।" } },
  ],
  reviews: [
    { quote: "I work at a petrol pump until 5. The evening batch and the Sunday mock were the only way I could prepare.", relation: "Student, SSC evening batch, CHSL 2025", consent: true, category: "SSC", hi: { quote: "मैं 5 बजे तक petrol pump पर काम करता हूँ। शाम की batch और रविवार का mock ही तैयारी का रास्ता था।", relation: "विद्यार्थी, SSC शाम की batch, CHSL 2025" } },
    { quote: "Every Sunday the sheet told me how far I was from last year's OBC cut-off. By February the gap was gone.", relation: "Student, SSC morning batch, CGL 2025", consent: true, category: "SSC", hi: { quote: "हर रविवार sheet बताती थी कि मैं पिछले साल के OBC cut-off से कितना दूर हूँ। फ़रवरी तक दूरी ख़त्म।", relation: "विद्यार्थी, SSC सुबह की batch, CGL 2025" } },
    { quote: "Everything was taught in Hindi and English both. Nobody made me feel Hindi medium was a weakness.", relation: "Student, Railway batch, Group D 2025", consent: true, category: "Railway", hi: { quote: "सब कुछ हिंदी और अंग्रेज़ी दोनों में पढ़ाया गया। किसी ने हिंदी माध्यम को कमज़ोरी नहीं समझा।", relation: "विद्यार्थी, Railway batch, Group D 2025" } },
  ],

  /* ── CLEARED: exam calendar, previous cut-offs and eligibility. EXAMPLE
        ENTRIES, each table with the source a real site copies from. ──── */
  govExams: {
    calendar: [
      { exam: "SSC GD Constable 2027", notification: "Example: October 2026", examDate: "Example: January to March 2027" },
      { exam: "RRB NTPC, graduate posts", notification: "Example: November 2026", examDate: "Example: March to April 2027" },
      { exam: "IBPS Clerk", notification: "Example: August 2027", examDate: "Example: prelims in October 2027" },
      { exam: "SSC CHSL 2027", notification: "Example: April 2027", examDate: "Example: July to September 2027" },
      { exam: "SSC CGL 2027", notification: "Example: May 2027", examDate: "Example: Tier 1 in June to July 2027" },
    ],
    calendarSource: "Example entries placed by Ideovent. A real site copies these from the SSC's tentative calendar at ssc.gov.in, the IBPS calendar at ibps.in and the RRB notices, and the dates move, so plan from the notification itself.",
    calendarUpdated: "26 September 2026",
    cutoffs: [
      { exam: "SSC CGL Tier 1", year: "2025", category: "UR", cutoff: "Example: 150.2" },
      { exam: "SSC CGL Tier 1", year: "2025", category: "OBC", cutoff: "Example: 146.8" },
      { exam: "SSC CGL Tier 1", year: "2025", category: "EWS", cutoff: "Example: 142.1" },
      { exam: "SSC CGL Tier 1", year: "2025", category: "SC", cutoff: "Example: 128.4" },
      { exam: "SSC CGL Tier 1", year: "2025", category: "ST", cutoff: "Example: 119.6" },
      { exam: "SSC CHSL Tier 1", year: "2025", category: "UR", cutoff: "Example: 162.5" },
      { exam: "SSC CHSL Tier 1", year: "2025", category: "OBC", cutoff: "Example: 159.0" },
      { exam: "IBPS Clerk prelims, Bihar", year: "2025", category: "UR", cutoff: "Example: 81.5" },
      { exam: "IBPS Clerk prelims, Bihar", year: "2025", category: "OBC", cutoff: "Example: 80.0" },
    ],
    cutoffSource: "Example figures placed by Ideovent. A real site copies each cut-off from the commission's own result notice (ssc.gov.in, ibps.in) and names the notice.",
    eligibility: [
      { exam: "SSC CGL", age: "18 to 32, varies by post", qualification: "A bachelor's degree" },
      { exam: "SSC CHSL", age: "18 to 27", qualification: "12th pass" },
      { exam: "SSC MTS", age: "18 to 25, or 18 to 27 for Havaldar", qualification: "10th pass" },
      { exam: "IBPS PO", age: "20 to 30", qualification: "A bachelor's degree" },
      { exam: "IBPS Clerk", age: "20 to 28", qualification: "A bachelor's degree" },
      { exam: "RRB Group D", age: "18 and above; upper limit as in the notification", qualification: "10th pass or ITI" },
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
        { title: "Quantitative aptitude", body: "Arithmetic, algebra, geometry, mensuration, trigonometry, data interpretation." },
        { title: "Reasoning", body: "Verbal and non-verbal reasoning, coding, series, puzzles, syllogism." },
        { title: "English", body: "Grammar, vocabulary, comprehension, cloze test, error spotting." },
        { title: "General awareness", body: "History, polity, geography, economy, science, and twelve months of current affairs." },
        { title: "Skill test", body: "Typing and computer practice in the computer room from the third month." },
      ],
      material: ["Printed notes, Hindi and English","Previous-year papers, solved","Monthly current affairs booklet"],
      testPlan: "A sectional test every Wednesday and a full mock on computers every Sunday.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat" },
        { label: "Second instalment", amount: "3,000", note: "After two months" },
        { label: "Third instalment", amount: "2,500", note: "After four months" },
      ],
      inclusions: ["Printed notes in Hindi and English","Every Sunday mock","Study hall seat","Typing practice"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Santosh Kumar Singh","Ravi Ranjan","Priyanka Kumari","Md. Shahid Anwar"],
      faq: [
        { title: "Can I switch to the evening batch?", body: "Yes, in any week your shifts change. Tell the desk the day before." },
      ],
      hi: { name: "SSC CGL और CHSL, सुबह की batch", detail: "छह महीने, Tier 1 और Tier 2 का पूरा syllabus। Skill test के लिए typing और computer अभ्यास तीसरे महीने से।", feeNote: "पूरे course के लिए", eligibility: "CGL के लिए स्नातक; CHSL के लिए 12वीं पास। आयु सीमा eligibility table और हर notification में।" },
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
        { title: "Quantitative aptitude", body: "Arithmetic, algebra, geometry, mensuration, trigonometry, data interpretation." },
        { title: "Reasoning", body: "Verbal and non-verbal reasoning, coding, series, puzzles, syllogism." },
        { title: "English", body: "Grammar, vocabulary, comprehension, cloze test, error spotting." },
        { title: "General awareness", body: "History, polity, geography, economy, science, and twelve months of current affairs." },
        { title: "Skill test", body: "Typing and computer practice in the computer room from the third month." },
      ],
      material: ["Printed notes, Hindi and English","Previous-year papers, solved","Monthly current affairs booklet"],
      testPlan: "A sectional test every Wednesday and a full mock on computers every Sunday.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat" },
        { label: "Second instalment", amount: "3,000", note: "After two months" },
        { label: "Third instalment", amount: "2,500", note: "After four months" },
      ],
      inclusions: ["Printed notes in Hindi and English","Every Sunday mock","Study hall seat","Typing practice"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Santosh Kumar Singh","Ravi Ranjan","Priyanka Kumari","Md. Shahid Anwar"],
      hi: { name: "SSC CGL और CHSL, शाम की batch", detail: "छह महीने, सुबह वाला ही syllabus और वही शिक्षक, दिन में काम करने वालों के लिए। शाम की छूटी class अगली सुबह बैठ सकते हैं।", feeNote: "पूरे course के लिए" },
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
        { title: "Quantitative aptitude", body: "Simplification, number series, data interpretation, arithmetic." },
        { title: "Reasoning", body: "Puzzles, seating arrangement, inequality, coding, syllogism." },
        { title: "English", body: "Reading comprehension, cloze, para-jumbles, error detection." },
        { title: "Banking and financial awareness", body: "RBI, monetary policy, banking terms, the last six months of banking news." },
        { title: "Interview", body: "Mock panels for PO candidates who clear the mains." },
      ],
      material: ["Printed notes","Previous-year prelims and mains papers","Banking awareness capsule, monthly"],
      testPlan: "A sectional test every Tuesday and a full prelims or mains mock on Sunday in rotation.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat" },
        { label: "Second instalment", amount: "4,000", note: "After two months" },
        { label: "Third instalment", amount: "3,000", note: "After four months" },
      ],
      inclusions: ["Printed notes","Every mock","Mock interview panel","Study hall seat"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Abhishek Pandey","Ravi Ranjan","Priyanka Kumari"],
      hi: { name: "Banking: IBPS और SBI, PO और Clerk", detail: "छह महीने, prelims और mains। Mains पास करने वाले PO उम्मीदवार असली interview से पहले centre पर mock panel के सामने बैठते हैं।", feeNote: "पूरे course के लिए" },
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
        { title: "Mathematics", body: "Number system, percentage, ratio, time and work, mensuration, simple algebra." },
        { title: "Reasoning", body: "Analogy, series, coding, puzzles, Venn diagrams." },
        { title: "General science", body: "Class 10 level physics, chemistry and biology, with the extra half-hour for Group D." },
        { title: "General awareness", body: "Current affairs, Indian railways, history, geography, polity." },
      ],
      material: ["Printed notes, Hindi and English","Previous-year RRB papers"],
      testPlan: "A full RRB-pattern mock every Sunday in rotation.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat" },
        { label: "Second instalment", amount: "3,500", note: "After two months" },
      ],
      inclusions: ["Printed notes","Every Sunday mock","Study hall seat"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Santosh Kumar Singh","Ravi Ranjan","Md. Shahid Anwar"],
      hi: { category: "रेलवे", name: "Railway NTPC और Group D", detail: "पाँच महीने। Group D के लिए हफ़्ते में तीन दिन general science का आधा घंटा अतिरिक्त।", feeNote: "पूरे course के लिए" },
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
        { title: "History and culture", body: "Ancient to modern, with the state's own history." },
        { title: "Geography", body: "India and the state: rivers, soils, agriculture, industry." },
        { title: "Polity and economy", body: "The Constitution, local government, the state economy and budget." },
        { title: "Current affairs", body: "The last twelve months, national and state." },
      ],
      material: ["Printed notes in Hindi","Previous-year papers, solved"],
      testPlan: "A general studies mock every second Sunday.",
      instalments: [
        { label: "At admission", amount: "4,000", note: "Holds the seat" },
        { label: "Second instalment", amount: "4,000", note: "After two months" },
      ],
      inclusions: ["Printed notes","Every mock","Study hall seat"],
      refundNote: "Leave with ten days' notice in writing and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Md. Shahid Anwar"],
      hi: { category: "राज्य की परीक्षाएँ", name: "State PSC और राज्य परीक्षाएँ, सामान्य अध्ययन", detail: "चार महीने, BPSC prelims और BSSC inter-level के लिए: बिहार का इतिहास, भूगोल और अर्थव्यवस्था, और पिछले बारह महीनों के current affairs।", feeNote: "पूरे course के लिए" },
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
        { title: "Rotation", body: "SSC CGL, CHSL, IBPS, RRB and state exam papers in turn, one a Sunday." },
      ],
      material: ["Answer key and solutions the same evening"],
      testPlan: "24 full mocks on computers, timed like the real exam, ranked, and set against the last three years' cut-offs for your category.",
      inclusions: ["24 full mocks","Rank and cut-off gap for your category","Solutions the same evening"],
      refundNote: "Leave before the sixth mock and the fee for the mocks not yet sat is refunded within ten days.",
      facultyNames: ["Ravi Ranjan"],
      hi: { category: "Mock test", name: "रविवार mock test series, सभी परीक्षाएँ", detail: "सभी 24 mock के ₹1,200, यहाँ के विद्यार्थियों के लिए मुफ़्त। Computer पर, असली परीक्षा जैसे समय में, rank के साथ, और आपकी श्रेणी के पिछले तीन साल के cut-off से तुलना।" },
    },
  ],

  /* ── CLEARED: results, first on this theme. Counts per exam and year.
        No candidate is named; the note says how a real list is checked,
        because this reader has seen inflated banners before. ─────────── */
  resultsHeading: "Selections in the last twelve months",
  resultsNote:
    "Every count and score here is example content, placed by Ideovent to show how a selection list is set out. A real list goes up with each selected candidate's roll number, which anybody can check against the commission's own result, and with no name or photograph unless the candidate agrees in writing.",
  results: [
    { achievement: "23 selected", count: "23", exam: "SSC CGL", year: "2025", note: "Morning and evening batches", category: "SSC", courseName: "SSC CGL and CHSL", courseDuration: "6 months", paid: "paid", status: "Final", hi: { achievement: "23 चयनित" } },
    { achievement: "31 selected", count: "31", exam: "SSC CHSL", year: "2025", note: "Morning and evening batches", category: "SSC", courseName: "SSC CGL and CHSL", courseDuration: "6 months", paid: "paid", status: "Final", hi: { achievement: "31 चयनित" } },
    { achievement: "17 selected", count: "17", exam: "IBPS Clerk", year: "2025", note: "Banking batch", category: "Banking", courseName: "Banking: IBPS and SBI", courseDuration: "6 months", paid: "paid", status: "Final", hi: { achievement: "17 चयनित" } },
    { achievement: "6 selected", count: "6", exam: "IBPS PO", year: "2025", note: "Banking batch", category: "Banking", courseName: "Banking: IBPS and SBI", courseDuration: "6 months", paid: "paid", status: "Final", hi: { achievement: "6 चयनित" } },
    { achievement: "44 selected", count: "44", exam: "RRB Group D", year: "2025", note: "Railway batch", category: "Railway", courseName: "Railway NTPC and Group D", courseDuration: "5 months", paid: "paid", status: "Final", hi: { achievement: "44 चयनित" } },
    { achievement: "9 cleared prelims", count: "9", exam: "BPSC prelims", year: "2026", note: "State exams batch", category: "State exams", courseName: "State PSC and state exams", courseDuration: "4 months", paid: "paid", status: "Provisional", hi: { achievement: "9 prelims पास" } },
    { achievement: "154.5 of 200", exam: "SSC CGL Tier 1", year: "2026", note: "Evening batch, while working full time", category: "SSC", courseName: "SSC CGL and CHSL, evening batch", courseDuration: "6 months", paid: "paid", hi: { achievement: "200 में से 154.5" } },
    { achievement: "19 selected", count: "19", exam: "SSC CGL", year: "2024", note: "Morning and evening batches", category: "SSC", courseName: "SSC CGL and CHSL", courseDuration: "6 months", paid: "paid", status: "Final", hi: { achievement: "19 चयनित" } },
    { achievement: "38 selected", count: "38", exam: "RRB NTPC", year: "2024", note: "Railway batch", category: "Railway", courseName: "Railway NTPC and Group D", courseDuration: "5 months", paid: "paid", status: "Final", hi: { achievement: "38 चयनित" } },
  ],

  /* ── CLEARED: faculty ────────────────────────────────────────────────── */
  faculty: [
    { name: "Santosh Kumar Singh", subject: "Quantitative aptitude", qualification: "M.Sc. Mathematics", experience: "18 years. Started the institute and takes maths in every SSC and railway batch.", role: "Founder", group: "Quant", batches: "SSC morning and evening, Railway", style: "Shortcuts only after the long method is understood, and every shortcut is proved once on the board.", hi: { subject: "गणित", experience: "18 साल। संस्थान शुरू किया और हर SSC और railway batch में गणित।", role: "संस्थापक", style: "Shortcut तभी जब लंबा तरीक़ा समझ आ जाए, और हर shortcut एक बार board पर सिद्ध।" } },
    { name: "Ravi Ranjan", subject: "Reasoning", qualification: "B.Sc., MCA", experience: "11 years. Takes reasoning and runs the Sunday mock on the computers.", group: "Reasoning", batches: "Every batch, Sunday mocks", style: "Puzzles solved against the clock, then solved again slowly to see the pattern.", hi: { subject: "तर्कशक्ति", experience: "11 साल। Reasoning और computer पर रविवार का mock।", style: "पहले घड़ी के साथ puzzle, फिर धीरे-धीरे pattern देखने के लिए दोबारा।" } },
    { name: "Priyanka Kumari", subject: "English", qualification: "M.A. English", experience: "9 years. Takes English for SSC and banking, explained in Hindi where it helps.", group: "English", batches: "SSC, Banking", style: "Grammar from the mistakes in last Sunday's mock, not from a textbook order.", hi: { subject: "अंग्रेज़ी", experience: "9 साल। SSC और banking की अंग्रेज़ी, जहाँ ज़रूरत हो हिंदी में समझाकर।", style: "Grammar पिछले रविवार के mock की ग़लतियों से, किताब के क्रम से नहीं।" } },
    { name: "Md. Shahid Anwar", subject: "General studies and current affairs", qualification: "M.A. History", experience: "15 years. Takes general awareness and the state PSC batch.", group: "General studies", batches: "Every batch, State exams", style: "Current affairs as a monthly booklet in Hindi, tested every Friday.", hi: { subject: "सामान्य अध्ययन और करेंट अफ़ेयर्स", experience: "15 साल। सामान्य जागरूकता और state PSC batch।", style: "करेंट अफ़ेयर्स हिंदी में मासिक booklet, हर शुक्रवार test।" } },
    { name: "Abhishek Pandey", subject: "Banking awareness and computer", qualification: "MBA, Finance", experience: "7 years. Worked four years in a bank branch before teaching.", group: "Banking", batches: "Banking, typing and computer", style: "Explains a banking term the way a branch manager uses it at the counter.", hi: { subject: "बैंकिंग जागरूकता और computer", experience: "7 साल। पढ़ाने से पहले चार साल bank branch में काम किया।", style: "Banking का हर शब्द वैसे समझाते हैं जैसे branch manager counter पर इस्तेमाल करता है।" } },
  ],

  /* ── CLEARED: why students choose us. An adult aspirant's three worries:
        time, knowing where they stand, and the medium. ─────────────────── */
  method: [
    {
      title: "A batch before work and a batch after it",
      body: "The SSC course runs twice a day, 7:00 to 9:30 am and 6:00 to 8:30 pm, with the same teachers and the same syllabus. A class missed in the evening can be sat in the next morning.",
    },
    {
      title: "Your rank every Sunday, against the real cut-off",
      body: "A full mock on computers every Sunday, in the exam's own pattern and timing. The result sheet shows your rank in the centre and how far your score is from the last three years' cut-offs for your category.",
    },
    {
      title: "Hindi medium is not second best",
      body: "Every class is taught in Hindi and English together, the notes come in both, and the mock paper switches to Hindi the way the real one does. Nobody is sent to a separate, slower batch.",
    },
  ],

  /* ── STRUCTURE: the week. Label, days, time and subject are KEPT;
        faculty and room are CLEARED. ─────────────────────────────────── */
  scheduleNote:
    "The study hall is open every day, Sunday included, with power backup. The last class ends at 8:30 pm.",
  schedule: [
    { label: "Study hall", days: "Every day", time: "6:00 am to 10:00 pm", subject: "Silent self-study, reserved seat", faculty: "Desk staff", room: "Second floor", hi: { days: "रोज़", time: "सुबह 6 से रात 10 बजे", subject: "शांति से self-study, अपनी तय सीट पर" } },
    { label: "SSC, morning", days: "Monday to Saturday", time: "7:00 to 9:30 am", subject: "Maths, reasoning, English, general awareness, by day", faculty: "Santosh Kumar Singh and team", room: "Hall 1", hi: { label: "SSC, सुबह", time: "सुबह 7 से 9:30", subject: "गणित, reasoning, English, general awareness, दिन के हिसाब से", days: "सोमवार से शनिवार" } },
    { label: "Banking", days: "Monday to Saturday", time: "10:00 am to 12:30 pm", subject: "Quant, reasoning, English, banking awareness", faculty: "Abhishek Pandey and team", room: "Hall 1", hi: { time: "सुबह 10 से दोपहर 12:30", days: "सोमवार से शनिवार" } },
    { label: "Typing and computer", days: "Tue, Thu, Sat", time: "10:00 am to 1:00 pm", subject: "Skill test practice", faculty: "Ravi Ranjan", room: "Computer room", hi: { label: "Typing और computer", time: "सुबह 10 से दोपहर 1 बजे", subject: "Skill test की practice", days: "मंगल, गुरु, शनि" } },
    { label: "Railway", days: "Monday to Saturday", time: "2:00 to 4:30 pm", subject: "Maths, reasoning, general science, general awareness", faculty: "Santosh Kumar Singh and team", room: "Hall 1", hi: { label: "रेलवे", time: "दोपहर 2 से शाम 4:30", subject: "गणित, reasoning, general science, general awareness", days: "सोमवार से शनिवार" } },
    { label: "State PSC and state exams", days: "Mon, Wed, Fri", time: "4:30 to 6:00 pm", subject: "General studies", faculty: "Md. Shahid Anwar", room: "Hall 2", hi: { label: "State PSC और राज्य की परीक्षाएँ", time: "शाम 4:30 से 6 बजे", subject: "सामान्य अध्ययन (GS)", days: "सोम, बुध, शुक्र" } },
    { label: "SSC, evening", days: "Monday to Saturday", time: "6:00 to 8:30 pm", subject: "Maths, reasoning, English, general awareness, by day", faculty: "Santosh Kumar Singh and team", room: "Hall 1", hi: { label: "SSC, शाम", time: "शाम 6 से रात 8:30", subject: "गणित, reasoning, English, general awareness, दिन के हिसाब से", days: "सोमवार से शनिवार" } },
    { label: "Sunday mock", days: "Sunday", time: "9:00 am to 12:00 noon", subject: "Full paper on computers, in rotation", faculty: "Ravi Ranjan", room: "Computer room", hi: { label: "रविवार का mock", days: "रविवार", subject: "Computer पर पूरा paper, बारी-बारी से", time: "सुबह 9 से दोपहर 12 बजे" } },
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
      duration: "तीन class के दिन और एक रविवार mock",
      bring: "एक कॉपी, pen, और mock के लिए photo पहचान पत्र।",
      howToBook: "सुबह 9:00 से शाम 7:00 के बीच front desk पर आइए, या जिस batch में आना है उसका नाम WhatsApp कीजिए।",
    },
  },

  /* ── STRUCTURE: FAQ. Three are generic: true of any institute in this
        segment and naming no fee, date, count, person or place. ──────── */
  faq: [
    {
      title: "What is the fee, and can I pay in parts?",
      body: "SSC, morning or evening: ₹9,500 for six months. Banking: ₹11,000 for six months. Railway: ₹7,500 for five months. State PSC and state exams: ₹8,000 for four months. Books and the Sunday mocks are included. Every course can be paid in two parts, the second after two months. The mock series alone is ₹1,200, and the study hall ₹700 a month, free for enrolled students. These are example figures and yours replace them.",
      group: "Fees",
    },
    {
      title: "When will the next SSC notification come?",
      body: "The commission publishes a tentative calendar on its own website, and the dates on it often move. Plan from the notification itself, not from a video or a forwarded message, and start the syllabus before it is out: the gap between a notification and the exam is rarely enough on its own.",
      group: "Exams",
      generic: true,
    },
    {
      title: "I work during the day. Can I still join?",
      body: "Yes. The SSC course runs from 7:00 to 9:30 am and again from 6:00 to 8:30 pm, and you can move between the two in any week your shifts change. About a third of each evening batch works full time.",
      group: "Batches",
    },
    {
      title: "Is the teaching in Hindi medium?",
      body: "Both. Every class is taught in Hindi and English together, and the notes and mock papers come in both. English as a subject is taught in English, explained in Hindi where it helps.",
      group: "Batches",
    },
    {
      title: "Is there a library or study hall?",
      body: "Yes, on the second floor: sixty reserved seats, open every day from 6:00 am to 10:00 pm, with power backup, drinking water and lockers. ₹700 a month, free for enrolled students.",
      group: "Study hall",
    },
    {
      title: "Do you guarantee a selection?",
      body: "No. A selection depends on the vacancies, the cut-off and your own marks on the day, and none of those is in an institute's hands. Be careful of any institute that promises it.",
      group: "Results",
      generic: true,
    },
    {
      title: "Can I take only the Sunday mocks?",
      body: "Yes. The mock series is open to students of any institute and to those preparing alone. Register at the desk or on WhatsApp with your name and category, so your score is compared with the right cut-off.",
      group: "Mocks",
    },
    {
      title: "What documents do I need at admission?",
      body: "A photo identity card, your latest mark sheet or degree certificate, and passport photographs.",
      group: "Admission",
      generic: true,
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
      hi: { title: "SSC शाम की batch: 11 सीटें बाक़ी", date: "25 सितंबर 2026", body: "सुबह की batch में 6। सीट सिर्फ़ पहली किस्त से पक्की होती है।" },
      pinned: true,
    },
    {
      title: "Sunday mock series: first paper on 4 October",
      date: "20 September 2026",
      body: "CGL Tier 1 pattern. Open to students of any institute. Register at the desk or on WhatsApp with your name and category.",
      kind: "event",
      posted: "2026-09-20",
      expires: "2026-10-04",
      hi: { title: "रविवार mock series: पहला paper 4 अक्टूबर को", date: "20 सितंबर 2026", body: "CGL Tier 1 pattern। किसी भी संस्थान के विद्यार्थी के लिए। Desk पर या WhatsApp पर नाम और श्रेणी के साथ register करें।" },
    },
    {
      title: "Diwali and Chhath: no classes from 7 to 16 November",
      date: "12 September 2026",
      body: "The study hall stays open throughout. Batches resume on Tuesday 17 November.",
      kind: "notice",
      posted: "2026-09-12",
      expires: "2026-11-17",
      hi: { title: "दीवाली और छठ: 7 से 16 नवंबर तक class नहीं", date: "12 सितंबर 2026", body: "Study hall पूरे समय खुला रहेगा। Batch मंगलवार 17 नवंबर से फिर शुरू।" },
    },
  ],

  /* ── CLEARED: the tests page. Daily, sectional, full mocks. ─────────── */
  testSeries: {
    intro: "Three kinds of test: a daily quiz at the start of class, a sectional test mid-week, and a full mock on computers every Sunday in the exam's own pattern. The Sunday result shows your rank and your gap to the last three years' cut-off for your category.",
    types: [
      { title: "Daily quiz", body: "Ten questions, ten minutes, at the start of every class. Marked in class." },
      { title: "Sectional test", body: "One section of the paper, timed, every Wednesday for SSC and every Tuesday for banking." },
      { title: "Sunday full mock", body: "On computers, exam timing, one exam a week in rotation, open to outsiders." },
    ],
    schedule: [
      { label: "Mock 1", days: "Sunday 4 October 2026", time: "9:00 am to 12:00 noon", subject: "SSC CGL Tier 1 pattern", hi: { days: "रविवार, 4 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "SSC CGL Tier 1 pattern पर" } },
      { label: "Mock 2", days: "Sunday 11 October 2026", time: "9:00 am to 12:00 noon", subject: "IBPS Clerk prelims pattern", hi: { days: "रविवार, 11 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "IBPS Clerk prelims pattern पर" } },
      { label: "Mock 3", days: "Sunday 18 October 2026", time: "9:00 am to 12:00 noon", subject: "RRB NTPC pattern", hi: { days: "रविवार, 18 अक्टूबर 2026", time: "सुबह 9 से दोपहर 12 बजे", subject: "RRB NTPC pattern पर" } },
      { label: "Mocks 4 to 24", days: "Every Sunday to March 2027", time: "9:00 am to 12:00 noon", subject: "In rotation", hi: { label: "Mock 4 से 24", days: "मार्च 2027 तक हर रविवार", time: "सुबह 9 से दोपहर 12 बजे", subject: "बारी-बारी से" } },
    ],
    pattern: "Each mock follows the pattern of the latest official notification for that exam: number of questions, sections, time and negative marking. When a notification changes the pattern, the next mock changes with it.",
    downloads: [
      { label: "Sunday mock schedule, October to March", url: "https://example.com/mock-schedule.pdf", group: "Schedule" },
      { label: "SSC CGL previous-year papers, Hindi and English", url: "https://example.com/cgl-pyq.pdf", group: "Previous papers" },
    ],
    platformUrl: "https://tests.example.com",
    hi: {
      intro: "तीन तरह के test: class की शुरुआत में रोज़ quiz, हफ़्ते के बीच sectional test, और हर रविवार computer पर परीक्षा के अपने pattern में पूरा mock। रविवार का परिणाम आपकी rank और आपकी श्रेणी के पिछले तीन साल के cut-off से दूरी बताता है।",
      pattern: "हर mock उस परीक्षा के नवीनतम आधिकारिक notification के pattern पर: प्रश्नों की संख्या, खंड, समय और negative marking। Pattern बदलते ही अगला mock भी बदलता है।",
    },
  },

  posts: [
    { slug: "reading-a-notification", title: "How to read an SSC notification in ten minutes", date: "15 September 2026", author: "Santosh Kumar Singh", excerpt: "Four things to check before anything else: age on the cut-off date, qualification by the closing date, the vacancy table for your category, and the fee.", body: "Most aspirants read a notification from the top and give up by page six. Read it in this order instead.\n\nFirst, the age limit and the date it is counted on. A birthday one day late costs a whole attempt.\n\nSecond, the qualification and the date by which you must hold it. Final-year students are allowed in some exams and not in others.\n\nThird, the vacancy table for your category and your state. That is your real competition, not the headline number.\n\nFourth, the fee and the last date, and pay two days early: the payment server always slows on the last day.", hi: { title: "SSC notification दस मिनट में कैसे पढ़ें", excerpt: "सबसे पहले चार बातें: cut-off तारीख़ पर आयु, अंतिम तारीख़ तक योग्यता, आपकी श्रेणी की vacancy table, और fee।" } },
    { slug: "working-and-preparing", title: "Working full time and preparing for SSC: a week that holds", date: "28 August 2026", author: "Ravi Ranjan", excerpt: "Two and a half hours a day, six days a week, and one Sunday mock. What to cut and what never to cut.", body: "A third of our evening batch works full time. The ones who clear the exam are not the ones who study the longest. They are the ones who never miss the Sunday mock.\n\nKeep the class, the mock and thirty minutes of current affairs a day. Cut everything else before you cut those.\n\nOn a day a shift runs late, do the daily quiz on the bus. Ten questions kept is better than a whole chapter planned and skipped.", hi: { title: "पूरे समय नौकरी और SSC की तैयारी: एक हफ़्ता जो टिकता है", excerpt: "रोज़ ढाई घंटे, हफ़्ते में छह दिन, और एक रविवार mock। क्या छोड़ें और क्या कभी न छोड़ें।" } },
    { slug: "selection-banners", title: "How to check a coaching institute's selection banner", date: "10 August 2026", author: "Md. Shahid Anwar", excerpt: "Ask for the roll numbers. A real selection can be checked against the commission's own list in two minutes.", body: "Every market in Bihar has a banner with a hundred faces on it. Some of those students studied there for a week. Some never did.\n\nAsk the institute for the roll numbers of its selections. Open the commission's final result and search for them. A real list survives this in two minutes.\n\nAsk which course each student took, for how long, and whether they paid. Since November 2024 the law requires an institute to say so when it advertises a result.", hi: { title: "किसी coaching के चयन banner को कैसे जाँचें", excerpt: "Roll number माँगिए। असली चयन आयोग की अपनी सूची से दो मिनट में मिल जाता है।" } },
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
      intro: "हर fee पूरे course की है, किताबें और mock शामिल, course page पर किस्तों के साथ छपी।",
      instalmentNote: "हर course दो या तीन किस्तों में दिया जा सकता है। पहली किस्त से सीट पक्की होती है।",
      refund: "दस दिन पहले लिखकर बताइए। बचे महीनों की fee दस दिन में लौटाई जाती है। Study hall की fee भी इसी तरह।",
      receipts: "हर भुगतान की छपी रसीद, और उसकी photo WhatsApp पर।",
      noIncrease: "जुड़ते समय जो fee छपी है, course ख़त्म होने तक वही रहेगी।",
    },
  },

  portalLinks: [
    { label: "Sunday mock results and ranks", url: "https://tests.example.com", audience: "Students", note: "Your score, rank and cut-off gap", hi: { label: "रविवार mock के परिणाम और rank", note: "आपके अंक, rank और cut-off से दूरी" } },
    { label: "Study hall seat booking", url: "https://hall.example.com", audience: "Students", note: "Reserve a seat for the month", hi: { label: "Study hall सीट बुकिंग", note: "महीने के लिए सीट आरक्षित कीजिए" } },
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
      { name: "Dehri study centre", addressLines: ["First floor, Example Road", "Dehri, Bihar 821000"], phone: "+91 00000 00000", mapQuery: "Kasauti Competition Classes, Dehri", hours: "Study hall and Sunday mocks only. Every day, 6:00 am to 9:00 pm." },
    ],
    hi: { hours: "Front desk: सोमवार से शनिवार, सुबह 6:30 से रात 8:30। Study hall: हर दिन, सुबह 6:00 से रात 10:00।", landmark: "Example Market, bank ATM के ऊपर, सीढ़ियाँ बाईं ओर" },
  },
});
