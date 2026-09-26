/**
 * TEMPLATE c3: SCIENCE ONLY, CLASS 9 TO 12, SUBJECT BY SUBJECT.
 *
 * Segment: the subject-wise centre in a state capital or a large city.
 * Physics, chemistry, maths and biology, nothing else, each taught as its own
 * batch by the one teacher who teaches only that subject. Most students are
 * already at a school and often at a second coaching, and come here for the
 * ONE subject that is pulling their percentage down. The argument is the
 * teacher and the board mark in that subject, not an all-India rank.
 *
 * WHAT THIS PARENT OR STUDENT ASKS FIRST, in the order the page answers it:
 *   can I take just chemistry (the tiles, one per subject, and the first
 *   question), who teaches it (faculty is the second section on this theme),
 *   did the board marks in that subject go up (results as subject marks, not
 *   ranks), what one subject costs a year, will two subjects clash with each
 *   other or with school (the week, built so no combination clashes), and
 *   does this help with JEE or NEET without turning into a JEE institute.
 *
 * Registry: Classic family, `folio` theme (multi-page): ruled rows, numbered
 * chapters, faculty high, a two-column teacher profile. The old single page
 * `signal` look is frozen for demos already sent. Each subject has its own
 * course page with its own fee, syllabus and teacher.
 *
 * FOUR SUBJECTS IN `focusAreas`, one more than ../shape.ts suggests, because
 * the four subjects ARE this segment: the hero reads "Physics, Chemistry,
 * Maths and Biology coaching in Bhopal", and each subject's tile carries its
 * own chip. Checked at 390 and 1440; the headline takes four lines on a
 * phone and three at 1440.
 *
 * THE INSTITUTE DOES NOT EXIST. A search on 26 September 2026 found no
 * coaching institute called Meniscus Science Classes, or Meniscus Classes,
 * anywhere. No student is named. Contact details are the reserved fiction
 * patterns.
 *
 * WHAT A DUPLICATE KEEPS: the five tiles' names, class ranges, subjects,
 * timings and mode, the timetable's rows without teachers and rooms, and the
 * two FAQs marked generic, each true of any subject-wise science centre.
 */

import { defineTemplateContent } from "../shape";
import { COACHING_PAGE_SETS } from "../../site/pageSets";

export default defineTemplateContent("coaching", {
  /* ── KEPT: which pages this segment has. ─────────────────────────────── */
  sitePages: [...COACHING_PAGE_SETS["c3-science"]],

  /* ── CLEARED: identity ───────────────────────────────────────────────── */
  instituteName: "Meniscus Science Classes",
  tagline: "Take one subject or all four. Each is taught by the teacher who teaches only that subject, in batches of twenty-four.",
  city: "Bhopal",
  state: "Madhya Pradesh",

  /* ── KEPT: market, language, currency, and what is taught ────────────── */
  country: "India",
  market: "india",
  currency: "INR",
  focusAreas: ["Physics", "Chemistry", "Maths", "Biology"],

  /* ── CLEARED: history ────────────────────────────────────────────────── */
  established: "Since 2014",
  establishedYear: "2014",
  boardOrAffiliation: "A private coaching centre for science and maths. Not affiliated to CBSE or to MP Board; we teach both syllabuses.",

  about:
    "Meniscus Science Classes teaches physics, chemistry, maths and biology to Class 9 to 12 in Bhopal, and nothing else: no commerce, no English, no entrance-only batch. It began in 2014 as one chemistry teacher's evening class and now has five teachers, each teaching one subject. Batches are capped at twenty-four. Most students come for the subject that is pulling their percentage down; about a third take two or more, and the week is built so that no combination clashes.",

  hi: {
    tagline: "एक विषय लीजिए या चारों। हर विषय वही शिक्षक पढ़ाता है जो सिर्फ़ वही विषय पढ़ाता है, चौबीस की batch में।",
    about: "मेनिस्कस साइंस क्लासेज़ भोपाल में कक्षा 9 से 12 को भौतिकी, रसायन, गणित और जीव विज्ञान पढ़ाती है, और कुछ नहीं। 2014 में एक chemistry शिक्षिका की शाम की class से शुरुआत हुई, आज पाँच शिक्षक हैं, हर एक का एक विषय। Batch में अधिकतम चौबीस। ज़्यादातर विद्यार्थी उस एक विषय के लिए आते हैं जो उनका प्रतिशत नीचे खींच रहा है।",
    resultsHeading: "2026 के बोर्ड papers ने क्या कहा",
    classSizePromise: "हर batch में अधिकतम चौबीस। Batch भरने पर कुर्सियाँ नहीं बढ़तीं।",
    vision: "हर विद्यार्थी उस विषय में आत्मविश्वास से बैठे जो उसे डराता था।",
    mission: "एक शिक्षक, एक विषय, चौबीस की batch, और पहले बोर्ड के अंक।",
  },

  /* ── CLEARED: the About page. ─────────────────────────────────────────── */
  classSizePromise: "Twenty-four to a batch at most. When a batch is full we say so and do not add chairs.",
  vision: "Every student sitting down with confidence in the subject that used to frighten them.",
  mission: "One teacher, one subject, twenty-four to a batch, and the board mark first.",
  founder: {
    name: "Farah Siddiqui",
    role: "Founder and chemistry teacher",
    story: "I began in 2014 with eight Class 12 students in my living room, all of them afraid of organic chemistry. By March they were not. Parents started asking whether there was somebody like me for physics, and then for maths. So the rule of this place is simple: each subject is taught by somebody who teaches only that subject, and you pay only for the subject you need.",
    hi: { role: "संस्थापक और रसायन शिक्षिका", story: "2014 में मैंने अपने बैठक के कमरे में कक्षा 12 के आठ विद्यार्थियों से शुरू किया, सब organic chemistry से डरते थे। मार्च तक डर चला गया। फिर अभिभावक पूछने लगे कि physics के लिए भी कोई है क्या, फिर गणित के लिए। इसलिए यहाँ का नियम सीधा है: हर विषय वही पढ़ाता है जो सिर्फ़ वही विषय पढ़ाता है, और आप सिर्फ़ उसी विषय की fee देते हैं जिसकी ज़रूरत है।" },
  },
  stats: [
    { value: "24", label: "Students per batch, at most", basis: "Every batch, every subject", hi: { label: "एक batch में अधिकतम विद्यार्थी", basis: "हर batch, हर विषय" } },
    { value: "31", label: "Class 12 physics students scored 85 or more", basis: "CBSE and MP Board 2026, of 44 we taught", hi: { label: "कक्षा 12 physics में 85 या अधिक", basis: "CBSE और MP Board 2026, हमारे 44 में से" } },
    { value: "17", label: "Points the maths batch average rose", basis: "Class 11 annual to Class 12 board, same students, 2026", hi: { label: "गणित batch का औसत इतने अंक बढ़ा", basis: "कक्षा 11 वार्षिक से कक्षा 12 बोर्ड, वही विद्यार्थी, 2026" } },
  ],
  joining: [
    { title: "Pick the subject", body: "The one that worries you. Call or WhatsApp with the subject and the class.", hi: { title: "विषय चुनिए", body: "वही जो चिंता दे रहा है। विषय और कक्षा के साथ call या WhatsApp कीजिए।" } },
    { title: "Two free classes", body: "Your child sits two ordinary classes, then the teacher talks to you for five minutes.", hi: { title: "दो मुफ़्त class", body: "बच्चा दो आम class में बैठता है, फिर शिक्षक पाँच मिनट आपसे बात करते हैं।" } },
    { title: "Join that subject only", body: "Pay the first of two instalments for that subject. Add another subject any time.", hi: { title: "सिर्फ़ वही विषय", body: "उस विषय की दो में से पहली किस्त। दूसरा विषय कभी भी जोड़िए।" } },
  ],
  reviews: [
    { quote: "We only needed chemistry. Nobody tried to sell us the other three.", relation: "Parent, Class 12, CBSE", consent: true, category: "Chemistry", hi: { quote: "हमें सिर्फ़ chemistry चाहिए थी। किसी ने बाक़ी तीन बेचने की कोशिश नहीं की।", relation: "अभिभावक, कक्षा 12, CBSE" } },
    { quote: "His maths went from 58 in the Class 11 annual to 84 in the board. Twenty problems a class, every class.", relation: "Parent, Class 12, MP Board", consent: true, category: "Maths", hi: { quote: "गणित में कक्षा 11 वार्षिक के 58 से बोर्ड में 84। हर class में बीस सवाल, हर class।", relation: "अभिभावक, कक्षा 12, MP Board" } },
    { quote: "The practical fortnight in January saved me in the viva. They asked exactly what ma'am said they would.", relation: "Student, Class 12 biology, 2026", consent: true, category: "Biology", hi: { quote: "जनवरी के practical पखवाड़े ने viva में बचा लिया। वही पूछा जो ma'am ने बताया था।", relation: "विद्यार्थी, कक्षा 12 जीव विज्ञान, 2026" } },
  ],

  /* ── STRUCTURE: the batches, as five tiles. Name, level, subjects,
        duration, timings and mode are KEPT; batchStarts, seats, fee,
        feeNote and detail are CLEARED. Five, because the tile grid sets the
        first one across two columns: five fill a 3-column grid exactly and
        a 2-column one exactly, where six would leave a hole. The Class 9 and
        10 tile says "mathematics" on purpose, so it carries no subject chip:
        it is two subjects, and a "Maths" chip on it would be half true. ── */
  courses: [
    {
      name: "Physics, Class 11 and 12",
      level: "Class 11 to 12",
      subjects: "Mechanics to modern physics, theory and numericals",
      duration: "One year per class",
      timings: "3 days a week, 5:00 to 6:30 pm",
      mode: "Classroom",
      batchStarts: "Class 11 from 5 April 2027",
      seats: "24 per batch",
      fee: "18,000",
      feeNote: "Yearly, in two instalments",
      detail: "Every chapter is finished to the NCERT line and the board's marking scheme first. JEE Main and NEET level problems follow in the same class for anyone who wants them. Derivations are written out in full, once a week, under board timing.",
      slug: "physics",
      category: "Physics",
      eligibility: "In Class 11 or 12 with physics, any board. Class 11 joins in April; Class 12 until 15 October.",
      syllabus: [
        { title: "Class 11", body: "Units and measurement, motion in a line and a plane, laws of motion, work and energy, rotation, gravitation, properties of matter, thermodynamics, kinetic theory, oscillations and waves." },
        { title: "Class 12", body: "Electric charges and fields, potential, current electricity, magnetism, EMI, AC, EM waves, ray and wave optics, dual nature, atoms and nuclei, semiconductors." },
        { title: "Practical and viva", body: "The board's practical list, observation tables and viva questions, in the January fortnight." },
      ],
      material: ["Chapter notes with every NCERT derivation", "Numerical practice sheets", "Last five board papers, solved"],
      testPlan: "A 40-minute chapter test at the end of each chapter, and a board-pattern paper on alternate Sundays.",
      instalments: [
        { label: "First instalment", amount: "9,000", note: "At admission" },
        { label: "Second instalment", amount: "9,000", note: "By 30 September" },
      ],
      inclusions: ["Chapter notes", "Every chapter test and Sunday paper", "Practical and viva fortnight", "Doubt time after every class"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Anupam Khare"],
      faq: [
        { title: "Is JEE-level physics taught too?", body: "After each chapter is finished to board level, the last twenty minutes of the next class are JEE Main and NEET problems. Anyone may leave before them." },
      ],
      hi: { category: "भौतिकी", name: "भौतिकी, कक्षा 11 और 12", detail: "हर अध्याय पहले NCERT और बोर्ड की marking scheme तक पूरा होता है। उसके बाद उसी class में JEE Main और NEET स्तर के सवाल, जो चाहे उसके लिए।", feeNote: "सालाना, दो किस्तों में" },
    },
    {
      name: "Chemistry, Class 11 and 12",
      level: "Class 11 to 12",
      subjects: "Physical, organic and inorganic chemistry",
      duration: "One year per class",
      timings: "3 days a week, 5:00 to 6:30 pm",
      mode: "Classroom",
      batchStarts: "Class 11 from 6 April 2027",
      seats: "24 per batch",
      fee: "18,000",
      feeNote: "Yearly, in two instalments",
      detail: "Organic named reactions are tested every Saturday in ten-minute slips. Inorganic is taught from the NCERT tables line by line, because that is where the board paper comes from.",
      slug: "chemistry",
      category: "Chemistry",
      eligibility: "In Class 11 or 12 with chemistry, any board.",
      syllabus: [
        { title: "Physical chemistry", body: "Mole concept, atomic structure, states of matter, thermodynamics, equilibrium, solutions, electrochemistry, kinetics." },
        { title: "Inorganic chemistry", body: "Periodic table, bonding, s, p, d and f blocks, coordination compounds, taught from the NCERT tables." },
        { title: "Organic chemistry", body: "GOC, hydrocarbons, haloalkanes to amines, biomolecules, with named reactions tested every Saturday." },
      ],
      material: ["Reaction charts for organic", "NCERT inorganic tables, annotated", "Last five board papers, solved"],
      testPlan: "A ten-minute reaction slip every Saturday, a chapter test after each chapter, and the Sunday paper.",
      instalments: [
        { label: "First instalment", amount: "9,000", note: "At admission" },
        { label: "Second instalment", amount: "9,000", note: "By 30 September" },
      ],
      inclusions: ["Reaction charts and notes", "Every test", "Practical and viva fortnight", "Doubt time after every class"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Farah Siddiqui"],
      faq: [
        { title: "My child hates organic chemistry. Is that normal?", body: "Very. It is usually because it was taught as a list to memorise. We teach the mechanism first, and most students stop hating it by the third month." },
      ],
      hi: { category: "रसायन", name: "रसायन, कक्षा 11 और 12", detail: "Organic के named reactions का हर शनिवार दस मिनट का test। Inorganic NCERT की tables से पंक्ति दर पंक्ति, क्योंकि बोर्ड का paper वहीं से आता है।", feeNote: "सालाना, दो किस्तों में" },
    },
    {
      name: "Maths, Class 11 and 12",
      level: "Class 11 to 12",
      subjects: "Algebra, calculus, vectors, coordinate geometry, probability",
      duration: "One year per class",
      timings: "3 days a week, 6:45 to 8:15 pm",
      mode: "Classroom",
      batchStarts: "Class 11 from 5 April 2027",
      seats: "24 per batch",
      fee: "18,000",
      feeNote: "Yearly, in two instalments",
      detail: "Twenty problems set every class, checked the next class. Class 12 sits the last five board papers from December, one a week.",
      slug: "maths",
      category: "Maths",
      eligibility: "In Class 11 or 12 with mathematics, any board.",
      syllabus: [
        { title: "Algebra", body: "Sets and relations, complex numbers, sequences, permutations, binomial theorem, matrices and determinants." },
        { title: "Calculus", body: "Limits, continuity, derivatives and their uses, integrals, differential equations." },
        { title: "Geometry and vectors", body: "Straight lines, conics, vectors, three-dimensional geometry." },
        { title: "Probability and statistics", body: "Probability, conditional probability, Bayes' theorem, statistics, linear programming." },
      ],
      material: ["Twenty-problem sheets for every class", "Last five board papers", "Formula sheet per unit"],
      testPlan: "The twenty problems of each class are checked the next class. A chapter test after each chapter and the Sunday paper.",
      instalments: [
        { label: "First instalment", amount: "9,000", note: "At admission" },
        { label: "Second instalment", amount: "9,000", note: "By 30 September" },
      ],
      inclusions: ["Problem sheets", "Every test", "Doubt time after every class"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Vinod Chaturvedi"],
      hi: { category: "गणित", name: "गणित, कक्षा 11 और 12", detail: "हर class में बीस सवाल, अगली class में जाँचे जाते हैं। कक्षा 12 दिसंबर से पिछले पाँच बोर्ड paper हल करती है, हर हफ़्ते एक।", feeNote: "सालाना, दो किस्तों में" },
    },
    {
      name: "Biology, Class 11 and 12",
      level: "Class 11 to 12",
      subjects: "Botany and zoology",
      duration: "One year per class",
      timings: "3 days a week, 6:45 to 8:15 pm",
      mode: "Classroom",
      batchStarts: "Class 11 from 6 April 2027",
      seats: "24 per batch",
      fee: "16,000",
      feeNote: "Yearly, in two instalments",
      detail: "Every NCERT line is covered in class, which is what the board and NEET both examine. Labelled diagrams are drawn in class and marked, not set as homework.",
      slug: "biology",
      category: "Biology",
      eligibility: "In Class 11 or 12 with biology, any board.",
      syllabus: [
        { title: "Class 11", body: "Diversity of living organisms, structural organisation, cell, plant physiology, human physiology." },
        { title: "Class 12", body: "Reproduction, genetics and evolution, biology and human welfare, biotechnology, ecology." },
      ],
      material: ["NCERT line-by-line notes", "Diagram book, marked in class", "Last five board papers"],
      testPlan: "A diagram test every week and the Sunday paper.",
      instalments: [
        { label: "First instalment", amount: "8,000", note: "At admission" },
        { label: "Second instalment", amount: "8,000", note: "By 30 September" },
      ],
      inclusions: ["Notes and diagram book", "Every test", "Practical and viva fortnight"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Neha Bhargava"],
      hi: { category: "जीव विज्ञान", name: "जीव विज्ञान, कक्षा 11 और 12", detail: "NCERT की हर पंक्ति class में, क्योंकि बोर्ड और NEET दोनों वहीं से पूछते हैं। Labelled diagram class में बनते और जाँचे जाते हैं, homework में नहीं।", feeNote: "सालाना, दो किस्तों में" },
    },
    {
      name: "Class 9 and 10, science and mathematics",
      level: "Class 9 to 10",
      subjects: "Science and mathematics, taken separately or together",
      duration: "April to the board exam",
      timings: "Mon to Sat, 3:30 to 4:45 pm",
      mode: "Classroom",
      batchStarts: "Join by 15 October",
      seats: "24 per batch",
      fee: "12,000",
      feeNote: "a year, per subject",
      detail: "Science is taught chapter by chapter by the teacher of that subject, so the physics chapters come from the physics teacher. Take science, mathematics or both.",
      slug: "class-9-10",
      category: "Class 9 and 10",
      eligibility: "In Class 9 or 10, CBSE or MP Board.",
      syllabus: [
        { title: "Science", body: "Physics, chemistry and biology chapters of the NCERT book, each taught by that subject's teacher." },
        { title: "Mathematics", body: "The full NCERT syllabus, with the CBSE sample paper worked every month from October in Class 10." },
      ],
      material: ["Chapter notes", "Sample papers from October"],
      testPlan: "A chapter test after each chapter and the Sunday paper.",
      inclusions: ["Notes", "Every test"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Anupam Khare", "Neha Bhargava", "Rashmi Shrivastava"],
      hi: { category: "कक्षा 9 और 10", name: "कक्षा 9 और 10, विज्ञान और गणित", detail: "विज्ञान अध्याय दर अध्याय उसी विषय के शिक्षक पढ़ाते हैं। विज्ञान, गणित या दोनों लीजिए।", feeNote: "प्रति विषय, सालाना" },
    },
  ],

  /* ── CLEARED: results, as subject marks, because a subject centre's
        proof is the mark in the subject. No student is named. ─────────── */
  resultsHeading: "What the 2026 board papers said",
  resultsNote:
    "The marks and counts in this section are example content, placed by Ideovent to show how a subject centre's results are set. Your own go here exactly as you publish them, subject by subject, and no student's name or photograph is printed without their written consent.",
  results: [
    { achievement: "98 of 100 in chemistry", exam: "CBSE Class 12", year: "2026", note: "Chemistry batch", category: "Chemistry", courseName: "Chemistry, Class 11 and 12", courseDuration: "Two years", paid: "paid", consent: true, quote: "The Saturday reaction slips were annoying for a year. In the board paper I did not have to remember a single reaction; I just knew them." },
    { achievement: "96 of 100 in physics", exam: "MP Board Class 12", year: "2026", note: "Physics batch", category: "Physics", courseName: "Physics, Class 11 and 12", courseDuration: "Two years", paid: "paid" },
    { achievement: "31 of 44 scored 85 or more in physics", exam: "CBSE and MP Board Class 12", year: "2026", note: "Every Class 12 physics student", category: "Physics", courseName: "Physics, Class 12", courseDuration: "One to two years", paid: "paid" },
    { achievement: "Class average 64 to 81 in maths", exam: "Class 11 annual to Class 12 board", year: "2026", note: "Maths batch, same students", category: "Maths", courseName: "Maths, Class 11 and 12", courseDuration: "Two years", paid: "paid" },
    { achievement: "95 of 100 in biology", exam: "CBSE Class 12", year: "2026", note: "Biology batch", category: "Biology", courseName: "Biology, Class 11 and 12", courseDuration: "Two years", paid: "scholarship" },
    { achievement: "97.84 percentile", exam: "JEE Main, January session", year: "2026", note: "Physics, chemistry and maths batches", category: "JEE Main", courseName: "Physics, chemistry and maths, Class 11 and 12", courseDuration: "Two years", paid: "paid" },
    { achievement: "97 of 100 in chemistry", exam: "MP Board Class 12", year: "2025", note: "Chemistry batch", category: "Chemistry", courseName: "Chemistry, Class 11 and 12", courseDuration: "Two years", paid: "paid" },
    { achievement: "28 of 40 scored 85 or more in maths", exam: "CBSE and MP Board Class 12", year: "2025", note: "Every Class 12 maths student", category: "Maths", courseName: "Maths, Class 12", courseDuration: "One to two years", paid: "paid" },
    { achievement: "99 of 100 in mathematics", exam: "CBSE Class 10", year: "2025", note: "Class 10 mathematics", category: "Class 10", courseName: "Class 9 and 10, mathematics", courseDuration: "Two years", paid: "paid" },
  ],

  /* ── CLEARED: faculty. Early on this theme, because in a subject centre
        the teacher is the reason a family chooses it. ─────────────────── */
  faculty: [
    { name: "Anupam Khare", subject: "Physics", qualification: "M.Sc. Physics", experience: "16 years. Takes every physics batch and the physics chapters of Class 9 and 10 science.", group: "Physics", batches: "Class 11 and 12 physics, Class 9 and 10 science", style: "Writes every derivation in full on the board once, then makes the class write it from memory the next week.", hi: { subject: "भौतिकी", experience: "16 साल। हर physics batch और कक्षा 9 और 10 विज्ञान के physics अध्याय।", style: "हर derivation एक बार board पर पूरा, फिर अगले हफ़्ते class उसे याद से लिखती है।" } },
    { name: "Farah Siddiqui", subject: "Chemistry", qualification: "M.Sc. Chemistry, B.Ed.", experience: "14 years. Started the centre in 2014 and takes every chemistry batch.", role: "Founder", group: "Chemistry", batches: "Class 11 and 12 chemistry", style: "Organic as mechanisms, never as lists. Ten-minute reaction slips every Saturday.", hi: { subject: "रसायन", experience: "14 साल। 2014 में centre शुरू किया और हर chemistry batch लेती हैं।", role: "संस्थापक", style: "Organic mechanism से, कभी सूची से नहीं। हर शनिवार दस मिनट की reaction slip।" } },
    { name: "Vinod Chaturvedi", subject: "Maths, Class 11 and 12", qualification: "M.Sc. Mathematics", experience: "21 years, eleven of them teaching Class 12 board maths in a school.", group: "Maths", batches: "Class 11 and 12 maths", style: "Twenty problems a class, checked the next class, no exceptions.", hi: { subject: "गणित, कक्षा 11 और 12", experience: "21 साल, जिनमें ग्यारह साल स्कूल में कक्षा 12 बोर्ड गणित।", style: "हर class में बीस सवाल, अगली class में जाँच, कोई छूट नहीं।" } },
    { name: "Neha Bhargava", subject: "Biology", qualification: "M.Sc. Zoology, B.Ed.", experience: "9 years. Takes both biology batches and the biology chapters of Class 9 and 10 science.", group: "Biology", batches: "Class 11 and 12 biology, Class 9 and 10 science", style: "Every NCERT line read in class. Diagrams drawn and marked before the class ends.", hi: { subject: "जीव विज्ञान", experience: "9 साल। दोनों biology batch और कक्षा 9 और 10 विज्ञान के biology अध्याय।", style: "NCERT की हर पंक्ति class में। Diagram class ख़त्म होने से पहले बनते और जाँचे जाते हैं।" } },
    { name: "Rashmi Shrivastava", subject: "Mathematics, Class 9 and 10", qualification: "M.Sc. Mathematics, B.Ed.", experience: "12 years. Takes Class 9 and 10 mathematics only.", group: "Maths", batches: "Class 9 and 10 mathematics", style: "Starts each chapter from the mistake most students make in it.", hi: { subject: "गणित, कक्षा 9 और 10", experience: "12 साल। सिर्फ़ कक्षा 9 और 10 गणित।", style: "हर अध्याय उस ग़लती से शुरू करती हैं जो ज़्यादातर बच्चे उसमें करते हैं।" } },
  ],

  /* ── CLEARED: why parents choose us. ─────────────────────────────────── */
  method: [
    {
      title: "Pay for the subject that needs help, and nothing else",
      body: "Most students come to us for one subject. Each subject is its own batch with its own fee, so a family is never charged for three subjects to fix one.",
    },
    {
      title: "Board marks first, entrance concepts alongside",
      body: "Every chapter is finished to the NCERT line and the board's marking scheme before anything harder. JEE Main and NEET level problems come after, in the same class, for those who want them, and nobody is made to feel behind for skipping them.",
    },
    {
      title: "The practical and the viva are taught, not left to the school",
      body: "In January each Class 12 batch spends two weeks on the practical syllabus: the readings, the observation tables and the viva questions examiners actually ask. The experiments are done at school. We make sure your child understands them.",
    },
  ],

  /* ── STRUCTURE: the week. Label, days, time and subject are KEPT;
        faculty and room are CLEARED. Built so that no two subjects of one
        class share a slot, which is what "take any combination" rests on. */
  scheduleNote:
    "No two subjects of the same class share a slot, so any combination of the four runs without a clash. Class 12 has priority on the earlier slot in the board year.",
  schedule: [
    { label: "Class 9 and 10, science", days: "Mon, Wed, Fri", time: "3:30 to 4:45 pm", subject: "Science, by chapter", faculty: "Anupam Khare and Neha Bhargava", room: "Room 1", hi: { label: "कक्षा 9 और 10, विज्ञान", days: "सोम, बुध, शुक्र", time: "दोपहर 3:30 से 4:45", subject: "विज्ञान, chapter के हिसाब से" } },
    { label: "Class 9 and 10, mathematics", days: "Tue, Thu, Sat", time: "3:30 to 4:45 pm", subject: "Mathematics", faculty: "Rashmi Shrivastava", room: "Room 1", hi: { label: "कक्षा 9 और 10, गणित", days: "मंगल, गुरु, शनि", time: "दोपहर 3:30 से 4:45", subject: "गणित" } },
    { label: "Class 12", days: "Tue, Thu, Sat", time: "5:00 to 6:30 pm", subject: "Physics", faculty: "Anupam Khare", room: "Room 1", hi: { label: "कक्षा 12", days: "मंगल, गुरु, शनि", time: "शाम 5 से 6:30", subject: "भौतिकी" } },
    { label: "Class 12", days: "Mon, Wed, Fri", time: "5:00 to 6:30 pm", subject: "Chemistry", faculty: "Farah Siddiqui", room: "Room 2", hi: { label: "कक्षा 12", days: "सोम, बुध, शुक्र", time: "शाम 5 से 6:30", subject: "रसायन" } },
    { label: "Class 12", days: "Mon, Wed, Fri", time: "6:45 to 8:15 pm", subject: "Maths", faculty: "Vinod Chaturvedi", room: "Room 1", hi: { label: "कक्षा 12", days: "सोम, बुध, शुक्र", time: "शाम 6:45 से रात 8:15", subject: "गणित" } },
    { label: "Class 12", days: "Tue, Thu, Sat", time: "6:45 to 8:15 pm", subject: "Biology", faculty: "Neha Bhargava", room: "Room 2", hi: { label: "कक्षा 12", days: "मंगल, गुरु, शनि", time: "शाम 6:45 से रात 8:15", subject: "जीव विज्ञान" } },
    { label: "Class 11", days: "Mon, Wed, Fri", time: "5:00 to 6:30 pm", subject: "Physics", faculty: "Anupam Khare", room: "Room 3", hi: { label: "कक्षा 11", days: "सोम, बुध, शुक्र", time: "शाम 5 से 6:30", subject: "भौतिकी" } },
    { label: "Class 11", days: "Tue, Thu, Sat", time: "5:00 to 6:30 pm", subject: "Chemistry", faculty: "Farah Siddiqui", room: "Room 2", hi: { label: "कक्षा 11", days: "मंगल, गुरु, शनि", time: "शाम 5 से 6:30", subject: "रसायन" } },
    { label: "Class 11", days: "Tue, Thu, Sat", time: "6:45 to 8:15 pm", subject: "Maths", faculty: "Vinod Chaturvedi", room: "Room 3", hi: { label: "कक्षा 11", days: "मंगल, गुरु, शनि", time: "शाम 6:45 से रात 8:15", subject: "गणित" } },
    { label: "Class 11", days: "Mon, Wed, Fri", time: "6:45 to 8:15 pm", subject: "Biology", faculty: "Neha Bhargava", room: "Room 2", hi: { label: "कक्षा 11", days: "सोम, बुध, शुक्र", time: "शाम 6:45 से रात 8:15", subject: "जीव विज्ञान" } },
    { label: "Test, every batch", days: "Alternate Sundays", time: "9:00 to 11:00 am", subject: "The fortnight's chapters, board pattern", faculty: "The subject teacher", room: "Rooms 1 to 3", hi: { label: "Test, हर batch", days: "हर दूसरे रविवार", time: "सुबह 9 से 11 बजे", subject: "पिछले दो हफ़्ते के chapter, board pattern पर" } },
  ],

  /* ── CLEARED: the trial, in the subject that worries the family. ──────── */
  trial: {
    heading: "Sit in on two classes of the subject that worries you",
    body: "Pick the subject. Your child attends two ordinary classes in the batch they would join, including the doubt time at the end. Afterwards the teacher spends five minutes with you on where your child stands in that subject, and says so plainly if they do not need us.",
    duration: "Two classes, 90 minutes each",
    bring: "The school textbook and the last test paper or report card for that subject.",
    howToBook: "Call or send a WhatsApp message with the subject and the class. We reply with the next two class days that have a free seat.",
    hi: {
      heading: "जिस विषय की चिंता है, उसकी दो class में बैठिए",
      duration: "दो class, 90 मिनट की",
      bring: "उस विषय की स्कूल की किताब और पिछला test paper या report card।",
      howToBook: "विषय और कक्षा के साथ call या WhatsApp कीजिए। हम अगले दो दिन बताएँगे जिनमें सीट ख़ाली है।",
    },
  },

  /* ── STRUCTURE: FAQ. Two are generic: true of any subject-wise science
        centre, and naming no fee, date, count, person or place. ───────── */
  faq: [
    {
      title: "Can my child take just a single subject?",
      body: "Yes. Each subject is taught as its own batch, so a student can take a single subject or any combination of them.",
      group: "Subjects",
      generic: true,
    },
    {
      title: "What does a subject cost?",
      body: "Physics, chemistry and maths for Class 11 or 12 are ₹18,000 a year each, and biology ₹16,000, in two instalments. Class 9 and 10 science or mathematics is ₹12,000 a year each. Two subjects cost twice one; there is no admission or material fee. These are example figures and yours replace them.",
      group: "Fees",
    },
    {
      title: "Which boards do you teach?",
      body: "CBSE and MP Board, in the same batch. The syllabus is the same NCERT book for both, and where the papers differ the teacher sets the practice questions both ways.",
      group: "Subjects",
    },
    {
      title: "Will two subjects clash with each other?",
      body: "No. The week is built so that no two subjects of the same class share a slot. The latest class ends at 8:15 pm, and nothing starts before 3:30 pm, so school comes first.",
      group: "Timings",
    },
    {
      title: "Does this prepare my child for JEE or NEET?",
      body: "It builds the concepts both exams are written on, and each class ends with problems at that level for those who want them. It is not an entrance course: there are no all-India mock tests here. Many of our students take their entrance coaching elsewhere and come to us for the subject they find hardest.",
      group: "Subjects",
    },
    {
      title: "Do you help with the practical file and the viva?",
      body: "Yes, in January for Class 12 and in February for Class 11: the readings, the observation tables and the viva questions. The experiments themselves are done at school.",
      group: "Subjects",
    },
    {
      title: "How big is a batch?",
      body: "Twenty-four at most. When a batch is full we say so, and we do not add chairs.",
      group: "Batches",
    },
    {
      title: "What should my child bring to the first class?",
      body: "The school textbook for the subject, the NCERT book as well if the school uses another publisher, a notebook kept only for this subject, and a pen.",
      group: "Batches",
      generic: true,
    },
  ],

  /* ── CLEARED: notices ────────────────────────────────────────────────── */
  notices: [
    {
      title: "Class 12 chemistry: three seats left this session",
      date: "24 September 2026",
      body: "The other three Class 12 subjects are full. Class 11 admissions for April 2027 open on 1 December.",
      pinned: true,
      kind: "notice",
      posted: "2026-09-24",
      expires: "2026-12-01",
    },
    {
      title: "Sunday 4 October: half-yearly syllabus test",
      date: "21 September 2026",
      body: "All subjects, board pattern, 9:00 to 11:00 am. Papers are returned with marks in the next class.",
      kind: "event",
      posted: "2026-09-21",
      expires: "2026-10-04",
    },
    {
      title: "Class 12 practical and viva fortnight from 11 January",
      date: "15 September 2026",
      body: "Regular classes pause for two weeks. Bring the school practical file to every session.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2027-01-25",
    },
  ],

  /* ── CLEARED: chapter tests. Board pattern, never a rank predictor. ──── */
  testSeries: {
    intro: "Every chapter ends with a 40-minute test, and every second Sunday there is a two-hour paper on the fortnight's chapters in the board pattern. Papers come back marked in the next class, with the marks the board scheme would give.",
    types: [
      { title: "Chapter test", body: "40 minutes, at the end of each chapter, in class." },
      { title: "Sunday paper", body: "Two hours, board pattern, the fortnight's chapters, all subjects on the same morning." },
      { title: "Pre-board papers", body: "Three full board papers per subject in January and February, marked to the board scheme." },
    ],
    schedule: [
      { label: "Sunday paper", days: "Alternate Sundays", time: "9:00 to 11:00 am", subject: "The fortnight's chapters", hi: { label: "रविवार का paper", days: "हर दूसरे रविवार", time: "सुबह 9 से 11 बजे", subject: "पिछले दो हफ़्ते के chapter" } },
      { label: "Half-yearly paper", days: "Sunday 4 October 2026", time: "9:00 to 11:00 am", subject: "Half-yearly syllabus", hi: { label: "छमाही paper", days: "रविवार, 4 अक्टूबर 2026", time: "सुबह 9 से 11 बजे", subject: "छमाही का syllabus" } },
      { label: "Pre-board papers", days: "January and February 2027", time: "9:00 am to 12:00 noon", subject: "Full board paper", hi: { label: "Pre-board paper", days: "जनवरी और फ़रवरी 2027", time: "सुबह 9 से दोपहर 12 बजे", subject: "पूरा board paper" } },
    ],
    pattern: "The current CBSE sample paper pattern for CBSE students and the MP Board blueprint for MP Board students, set side by side where they differ.",
    downloads: [
      { label: "CBSE Class 12 physics sample paper, solved", url: "https://example.com/physics-sample.pdf", group: "Sample papers" },
      { label: "Organic reactions chart", url: "https://example.com/organic-chart.pdf", group: "Notes" },
    ],
    hi: {
      intro: "हर अध्याय के अंत में 40 मिनट का test, और हर दूसरे रविवार पखवाड़े के अध्यायों पर दो घंटे का बोर्ड pattern paper। Papers अगली class में बोर्ड की marking scheme से जाँचकर लौटते हैं।",
      pattern: "CBSE विद्यार्थियों के लिए CBSE sample paper का pattern और MP Board विद्यार्थियों के लिए MP Board का blueprint, जहाँ अंतर है वहाँ साथ-साथ।",
    },
  },

  /* ── CLEARED: blog, written by the subject teachers. ──────────────────── */
  posts: [
    {
      slug: "one-subject-or-four",
      title: "One subject or four? How to decide what your child needs",
      date: "10 September 2026",
      author: "Farah Siddiqui",
      excerpt: "Look at the Class 11 marks subject by subject, not the total. The gap is usually in one place.",
      body: "A family comes in worried about a 71% average and asks for all four subjects. Nine times out of ten, the marks sheet says something different: three subjects in the high seventies and one in the fifties.\n\nFix the one. A student who is spending four evenings a week at coaching has no time left to practise the subject that is actually weak.\n\nIf two subjects are weak, take both, and check the timetable for a clash before you pay. Ours is built so none clash, but many are not.",
    },
    {
      slug: "derivations-board-marks",
      title: "Why derivations still decide the physics board mark",
      date: "22 August 2026",
      author: "Anupam Khare",
      excerpt: "Five-mark derivations are the most predictable marks in the paper, and the most often thrown away.",
      body: "Every year the physics paper carries derivations straight from the NCERT book. They are the most predictable marks in the paper, and students lose them by skipping a step the marking scheme gives a mark for.\n\nWrite each one in full, once a week, from memory. Label the diagram. State the assumption. The examiner is not looking for elegance, only for the steps.",
    },
    {
      slug: "organic-without-memorising",
      title: "Organic chemistry without memorising a list",
      date: "5 August 2026",
      author: "Farah Siddiqui",
      excerpt: "There are about a dozen ideas under every reaction in the syllabus. Learn those and the reactions follow.",
      body: "Students memorise reactions as a list and forget them in the exam hall. Underneath the list there are about a dozen ideas: electron-rich attacks electron-poor, a stable intermediate forms faster, a good leaving group leaves.\n\nLearn those ideas first, then draw every reaction arrow by arrow. By the third month the list is no longer a list.",
    },
  ],

  /* ── CLEARED: fees, refunds and the MoE 2024 disclosure. ─────────────── */
  feesPolicy: {
    intro: "Each subject has its own fee, printed on its course page. This page sets out how fees are paid and returned.",
    paymentModes: ["UPI", "Bank transfer", "Card at the front desk"],
    instalmentNote: "Every subject can be paid in two instalments, at admission and by 30 September. Ask the office if you need the second split into two.",
    refund: "Leave any subject with ten days' notice in writing. The unused months of that subject's fee are refunded pro-rata within ten days.",
    receipts: "A printed receipt for every payment, and the same receipt by email.",
    noIncrease: "The fee for a subject does not change during the session your child joined in.",
    studentsCoached: "212",
    studentsSucceeded: "168",
    countsYear: "2025-26: Class 10 and 12 students who scored 75 or more in the subject they took with us",
    hi: {
      intro: "हर विषय की अपनी fee है, उसके course page पर छपी। यहाँ fee भरने और लौटाने का तरीक़ा है।",
      instalmentNote: "हर विषय दो किस्तों में, admission पर और 30 सितंबर तक। दूसरी किस्त को दो में बाँटना हो तो office से कहिए।",
      refund: "किसी भी विषय को दस दिन पहले लिखकर बताकर छोड़िए। उस विषय की बची हुई महीनों की fee दस दिन में लौटाई जाती है।",
      receipts: "हर भुगतान की छपी रसीद, और वही email पर।",
      noIncrease: "जिस सत्र में बच्चा आया, उसमें विषय की fee नहीं बदलती।",
    },
  },

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "office@example.com",
    addressLines: ["Meniscus Science Classes", "Second floor, Example Complex, Example Road", "Bhopal, Madhya Pradesh 462000"],
    hours: "Monday to Saturday, 3:00 to 8:30 pm. Sunday, 9:00 am to 12:00 noon on test days.",
    mapQuery: "Meniscus Science Classes, Bhopal",
    landmark: "Opposite the Example Road petrol pump, entrance from the side lane",
    hi: { hours: "सोमवार से शनिवार, दोपहर 3:00 से रात 8:30। रविवार, test वाले दिन सुबह 9:00 से 12:00।", landmark: "Example Road petrol pump के सामने, बगल की गली से प्रवेश" },
  },
});
