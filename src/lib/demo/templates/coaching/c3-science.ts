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
  sitePages: [...COACHING_PAGE_SETS["c3-science"], "gallery"],

  /* ── KEPT: stock photographs (public/demo/img, see ../shape.ts). Licensed
        models and rooms standing in for the institute; the alt text comes
        from the manifest and describes the scene. A duplicate carries these
        paths, and the admin checklist says so until the hero is replaced. */
  heroImage: "/demo/img/coaching/c3-hero-chemistry-lab-800.webp",
  sectionPhotos: {
    about: "/demo/img/coaching/c3-microscope-640.webp",
    courses: "/demo/img/coaching/c3-test-tubes-640.webp",
    admissions: "/demo/img/coaching/c3-lab-practical-640.webp",
    study: "/demo/img/coaching/c1-self-study-640.webp",
  },

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
    tagline: "एक विषय लीजिए या चारों। हर विषय वही शिक्षक पढ़ाता है जो सिर्फ़ वही विषय पढ़ाता है, चौबीस की बैच में।",
    established: "2014 से",
    boardOrAffiliation: "विज्ञान और गणित का एक निजी कोचिंग सेंटर। CBSE या MP Board से संबद्ध नहीं; हम दोनों बोर्ड का सिलेबस पढ़ाते हैं।",
    focusAreas: ["भौतिकी", "रसायन", "गणित", "जीव विज्ञान"],
    city: "भोपाल",
    state: "मध्य प्रदेश",
    about: "मेनिस्कस साइंस क्लासेज़ भोपाल में कक्षा 9 से 12 को भौतिकी, रसायन, गणित और जीव विज्ञान पढ़ाती है, और कुछ नहीं। 2014 में एक केमिस्ट्री शिक्षिका की शाम की क्लास से शुरुआत हुई, आज पाँच शिक्षक हैं, हर एक का एक विषय। बैच में अधिकतम चौबीस। ज़्यादातर विद्यार्थी उस एक विषय के लिए आते हैं जो उनका प्रतिशत नीचे खींच रहा है।",
    resultsHeading: "2026 के बोर्ड पेपर ने क्या कहा",
    classSizePromise: "हर बैच में अधिकतम चौबीस। बैच भरने पर कुर्सियाँ नहीं बढ़तीं।",
    vision: "हर विद्यार्थी उस विषय में आत्मविश्वास से बैठे जो उसे डराता था।",
    mission: "एक शिक्षक, एक विषय, चौबीस की बैच, और पहले बोर्ड के अंक।",
    resultsNote: "इस हिस्से के अंक और संख्याएँ उदाहरण हैं, जिन्हें Ideovent ने यह दिखाने के लिए रखा है कि एक सब्जेक्ट सेंटर के रिज़ल्ट कैसे छपते हैं। आपके अपने रिज़ल्ट यहाँ ठीक वैसे आएँगे जैसे आप छापते हैं, विषय दर विषय, और किसी बच्चे का नाम या फ़ोटो उसकी लिखित सहमति के बिना नहीं छपता।",
    scheduleNote: "एक ही क्लास के दो विषय एक समय पर नहीं होते, इसलिए चारों में से कोई भी जोड़ बिना टकराव के चलता है। बोर्ड वाले साल में पहले वाले समय पर क्लास 12 को प्राथमिकता है।",
  },

  /* ── CLEARED: the About page. ─────────────────────────────────────────── */
  classSizePromise: "Twenty-four to a batch at most. When a batch is full we say so and do not add chairs.",
  vision: "Every student sitting down with confidence in the subject that used to frighten them.",
  mission: "One teacher, one subject, twenty-four to a batch, and the board mark first.",
  founder: {
    name: "Farah Siddiqui",
    role: "Founder and chemistry teacher",
    story: "I began in 2014 with eight Class 12 students in my living room, all of them afraid of organic chemistry. By March they were not. Parents started asking whether there was somebody like me for physics, and then for maths. So the rule of this place is simple: each subject is taught by somebody who teaches only that subject, and you pay only for the subject you need.",
    hi: { role: "संस्थापक और रसायन शिक्षिका", story: "2014 में मैंने अपने बैठक के कमरे में कक्षा 12 के आठ विद्यार्थियों से शुरू किया, सब ऑर्गेनिक केमिस्ट्री से डरते थे। मार्च तक डर चला गया। फिर अभिभावक पूछने लगे कि फिज़िक्स के लिए भी कोई है क्या, फिर गणित के लिए। इसलिए यहाँ का नियम सीधा है: हर विषय वही पढ़ाता है जो सिर्फ़ वही विषय पढ़ाता है, और आप सिर्फ़ उसी विषय की फीस देते हैं जिसकी ज़रूरत है।" },
  },
  stats: [
    { value: "24", label: "Students per batch, at most", basis: "Every batch, every subject", hi: { label: "एक बैच में अधिकतम विद्यार्थी", basis: "हर बैच, हर विषय" } },
    { value: "31", label: "Class 12 physics students scored 85 or more", basis: "CBSE and MP Board 2026, of 44 we taught", hi: { label: "कक्षा 12 फिज़िक्स में 85 या अधिक", basis: "CBSE और MP Board 2026, हमारे 44 में से" } },
    { value: "17", label: "Points the maths batch average rose", basis: "Class 11 annual to Class 12 board, same students, 2026", hi: { label: "गणित बैच का औसत इतने अंक बढ़ा", basis: "कक्षा 11 वार्षिक से कक्षा 12 बोर्ड, वही विद्यार्थी, 2026" } },
  ],
  joining: [
    { title: "Pick the subject", body: "The one that worries you. Call or WhatsApp with the subject and the class.", hi: { title: "विषय चुनिए", body: "वही जो चिंता दे रहा है। विषय और कक्षा के साथ कॉल या WhatsApp कीजिए।" } },
    { title: "Two free classes", body: "Your child sits two ordinary classes, then the teacher talks to you for five minutes.", hi: { title: "दो मुफ़्त क्लास", body: "बच्चा दो आम क्लास में बैठता है, फिर शिक्षक पाँच मिनट आपसे बात करते हैं।" } },
    { title: "Join that subject only", body: "Pay the first of two instalments for that subject. Add another subject any time.", hi: { title: "सिर्फ़ वही विषय", body: "उस विषय की दो में से पहली किस्त। दूसरा विषय कभी भी जोड़िए।" } },
  ],
  reviews: [
    { quote: "We only needed chemistry. Nobody tried to sell us the other three.", relation: "Parent, Class 12, CBSE", consent: true, category: "Chemistry", hi: { category: "रसायन", quote: "हमें सिर्फ़ केमिस्ट्री चाहिए थी। किसी ने बाक़ी तीन बेचने की कोशिश नहीं की।", relation: "अभिभावक, कक्षा 12, CBSE" } },
    { quote: "His maths went from 58 in the Class 11 annual to 84 in the board. Twenty problems a class, every class.", relation: "Parent, Class 12, MP Board", consent: true, category: "Maths", hi: { category: "गणित", quote: "गणित में कक्षा 11 वार्षिक के 58 से बोर्ड में 84। हर क्लास में बीस सवाल, हर क्लास।", relation: "अभिभावक, कक्षा 12, MP Board" } },
    { quote: "The practical fortnight in January saved me in the viva. They asked exactly what ma'am said they would.", relation: "Student, Class 12 biology, 2026", consent: true, category: "Biology", hi: { category: "जीव विज्ञान", quote: "जनवरी के प्रैक्टिकल पखवाड़े ने वाइवा में बचा लिया। वही पूछा जो मैम ने बताया था।", relation: "विद्यार्थी, कक्षा 12 जीव विज्ञान, 2026" } },
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
        { title: "Class 11", body: "Units and measurement, motion in a line and a plane, laws of motion, work and energy, rotation, gravitation, properties of matter, thermodynamics, kinetic theory, oscillations and waves.", hi: { title: "क्लास 11", body: "मात्रक और मापन, सरल रेखा और समतल में गति, गति के नियम, कार्य और ऊर्जा, घूर्णन, गुरुत्वाकर्षण, पदार्थ के गुण, ऊष्मागतिकी, गतिज सिद्धांत, दोलन और तरंगें।" } },
        { title: "Class 12", body: "Electric charges and fields, potential, current electricity, magnetism, EMI, AC, EM waves, ray and wave optics, dual nature, atoms and nuclei, semiconductors.", hi: { title: "क्लास 12", body: "विद्युत आवेश और क्षेत्र, विभव, विद्युत धारा, चुंबकत्व, EMI, AC, विद्युत चुंबकीय तरंगें, किरण और तरंग प्रकाशिकी, द्वैत प्रकृति, परमाणु और नाभिक, अर्धचालक।" } },
        { title: "Practical and viva", body: "The board's practical list, observation tables and viva questions, in the January fortnight.", hi: { title: "प्रैक्टिकल और वाइवा", body: "बोर्ड की प्रैक्टिकल सूची, ऑब्ज़र्वेशन टेबल और वाइवा के सवाल, जनवरी के पखवाड़े में।" } },
      ],
      material: ["Chapter notes with every NCERT derivation", "Numerical practice sheets", "Last five board papers, solved"],
      testPlan: "A 40-minute chapter test at the end of each chapter, and a board-pattern paper on alternate Sundays.",
      instalments: [
        { label: "First instalment", amount: "9,000", note: "At admission", hi: { label: "पहली किस्त", note: "एडमिशन के समय" } },
        { label: "Second instalment", amount: "9,000", note: "By 30 September", hi: { label: "दूसरी किस्त", note: "30 सितंबर तक" } },
      ],
      inclusions: ["Chapter notes", "Every chapter test and Sunday paper", "Practical and viva fortnight", "Doubt time after every class"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Anupam Khare"],
      faq: [
        { title: "Is JEE-level physics taught too?", body: "After each chapter is finished to board level, the last twenty minutes of the next class are JEE Main and NEET problems. Anyone may leave before them.", hi: { title: "क्या JEE लेवल की फिज़िक्स भी पढ़ाई जाती है?", body: "हर चैप्टर बोर्ड लेवल तक पूरा होने के बाद, अगली क्लास के आख़िरी बीस मिनट JEE Main और NEET के सवाल होते हैं। जो चाहे उससे पहले जा सकता है।" } },
      ],
      hi: { seats: "हर बैच में 24", material: ["हर NCERT डेरिवेशन के साथ चैप्टर नोट्स", "न्यूमेरिकल अभ्यास की शीट", "पिछले पाँच बोर्ड पेपर, हल सहित"], inclusions: ["चैप्टर नोट्स", "हर चैप्टर टेस्ट और रविवार का पेपर", "प्रैक्टिकल और वाइवा पखवाड़ा", "हर क्लास के बाद डाउट का समय"], category: "भौतिकी", name: "भौतिकी, कक्षा 11 और 12", detail: "हर अध्याय पहले NCERT और बोर्ड की मार्किंग स्कीम तक पूरा होता है। उसके बाद उसी क्लास में JEE Main और NEET स्तर के सवाल, जो चाहे उसके लिए।", feeNote: "सालाना, दो किस्तों में", level: "क्लास 11 से 12", subjects: "मैकेनिक्स से मॉडर्न फिज़िक्स तक, थ्योरी और न्यूमेरिकल", duration: "हर क्लास के लिए एक साल", timings: "हफ़्ते में 3 दिन, शाम 5 से 6:30 बजे", mode: "क्लासरूम", batchStarts: "क्लास 11: 5 अप्रैल 2027 से", eligibility: "फिज़िक्स के साथ क्लास 11 या 12 में, कोई भी बोर्ड। क्लास 11 में अप्रैल में एडमिशन; क्लास 12 में 15 अक्टूबर तक।", testPlan: "हर चैप्टर के अंत में 40 मिनट का चैप्टर टेस्ट, और हर दूसरे रविवार बोर्ड पैटर्न का पेपर।", refundNote: "दस दिन पहले बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
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
        { title: "Physical chemistry", body: "Mole concept, atomic structure, states of matter, thermodynamics, equilibrium, solutions, electrochemistry, kinetics.", hi: { title: "फिज़िकल केमिस्ट्री", body: "मोल कॉन्सेप्ट, परमाणु संरचना, पदार्थ की अवस्थाएँ, ऊष्मागतिकी, साम्य, विलयन, इलेक्ट्रोकेमिस्ट्री, रासायनिक बलगतिकी।" } },
        { title: "Inorganic chemistry", body: "Periodic table, bonding, s, p, d and f blocks, coordination compounds, taught from the NCERT tables.", hi: { title: "इनऑर्गेनिक केमिस्ट्री", body: "आवर्त सारणी, बंधन, s, p, d और f ब्लॉक, उपसहसंयोजक यौगिक, NCERT की टेबल से पढ़ाए जाते हैं।" } },
        { title: "Organic chemistry", body: "GOC, hydrocarbons, haloalkanes to amines, biomolecules, with named reactions tested every Saturday.", hi: { title: "ऑर्गेनिक केमिस्ट्री", body: "GOC, हाइड्रोकार्बन, हैलोऐल्केन से ऐमीन तक, जैव-अणु, और नेम्ड रिएक्शन का हर शनिवार टेस्ट।" } },
      ],
      material: ["Reaction charts for organic", "NCERT inorganic tables, annotated", "Last five board papers, solved"],
      testPlan: "A ten-minute reaction slip every Saturday, a chapter test after each chapter, and the Sunday paper.",
      instalments: [
        { label: "First instalment", amount: "9,000", note: "At admission", hi: { label: "पहली किस्त", note: "एडमिशन के समय" } },
        { label: "Second instalment", amount: "9,000", note: "By 30 September", hi: { label: "दूसरी किस्त", note: "30 सितंबर तक" } },
      ],
      inclusions: ["Reaction charts and notes", "Every test", "Practical and viva fortnight", "Doubt time after every class"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Farah Siddiqui"],
      faq: [
        { title: "My child hates organic chemistry. Is that normal?", body: "Very. It is usually because it was taught as a list to memorise. We teach the mechanism first, and most students stop hating it by the third month.", hi: { title: "बच्चे को ऑर्गेनिक केमिस्ट्री बिलकुल पसंद नहीं। क्या यह आम बात है?", body: "बहुत आम। अक्सर इसलिए कि इसे रटने वाली लिस्ट की तरह पढ़ाया गया। हम पहले मैकेनिज़्म पढ़ाते हैं, और ज़्यादातर बच्चों की नापसंदगी तीसरे महीने तक चली जाती है।" } },
      ],
      hi: { seats: "हर बैच में 24", material: ["ऑर्गेनिक के रिएक्शन चार्ट", "NCERT इनऑर्गेनिक टेबल, नोट्स सहित", "पिछले पाँच बोर्ड पेपर, हल सहित"], inclusions: ["रिएक्शन चार्ट और नोट्स", "हर टेस्ट", "प्रैक्टिकल और वाइवा पखवाड़ा", "हर क्लास के बाद डाउट का समय"], category: "रसायन", name: "रसायन, कक्षा 11 और 12", detail: "ऑर्गेनिक के नेम्ड रिएक्शन का हर शनिवार दस मिनट का टेस्ट। इनऑर्गेनिक NCERT की टेबल से पंक्ति दर पंक्ति, क्योंकि बोर्ड का पेपर वहीं से आता है।", feeNote: "सालाना, दो किस्तों में", level: "क्लास 11 से 12", subjects: "फिज़िकल, ऑर्गेनिक और इनऑर्गेनिक केमिस्ट्री", duration: "हर क्लास के लिए एक साल", timings: "हफ़्ते में 3 दिन, शाम 5 से 6:30 बजे", mode: "क्लासरूम", batchStarts: "क्लास 11: 6 अप्रैल 2027 से", eligibility: "केमिस्ट्री के साथ क्लास 11 या 12 में, कोई भी बोर्ड।", testPlan: "हर शनिवार दस मिनट की रिएक्शन पर्ची, हर चैप्टर के बाद चैप्टर टेस्ट, और रविवार का पेपर।", refundNote: "दस दिन पहले बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
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
        { title: "Algebra", body: "Sets and relations, complex numbers, sequences, permutations, binomial theorem, matrices and determinants.", hi: { title: "बीजगणित", body: "समुच्चय और संबंध, सम्मिश्र संख्याएँ, अनुक्रम, क्रमचय, द्विपद प्रमेय, आव्यूह और सारणिक।" } },
        { title: "Calculus", body: "Limits, continuity, derivatives and their uses, integrals, differential equations.", hi: { title: "कैलकुलस", body: "सीमा, सांतत्य, अवकलज और उनके उपयोग, समाकलन, अवकल समीकरण।" } },
        { title: "Geometry and vectors", body: "Straight lines, conics, vectors, three-dimensional geometry.", hi: { title: "ज्यामिति और सदिश", body: "सरल रेखाएँ, शांकव, सदिश, त्रिविमीय ज्यामिति।" } },
        { title: "Probability and statistics", body: "Probability, conditional probability, Bayes' theorem, statistics, linear programming.", hi: { title: "प्रायिकता और सांख्यिकी", body: "प्रायिकता, सप्रतिबंध प्रायिकता, बेज़ प्रमेय, सांख्यिकी, रैखिक प्रोग्रामन।" } },
      ],
      material: ["Twenty-problem sheets for every class", "Last five board papers", "Formula sheet per unit"],
      testPlan: "The twenty problems of each class are checked the next class. A chapter test after each chapter and the Sunday paper.",
      instalments: [
        { label: "First instalment", amount: "9,000", note: "At admission", hi: { label: "पहली किस्त", note: "एडमिशन के समय" } },
        { label: "Second instalment", amount: "9,000", note: "By 30 September", hi: { label: "दूसरी किस्त", note: "30 सितंबर तक" } },
      ],
      inclusions: ["Problem sheets", "Every test", "Doubt time after every class"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Vinod Chaturvedi"],
      hi: { seats: "हर बैच में 24", material: ["हर क्लास के लिए बीस सवालों की शीट", "पिछले पाँच बोर्ड पेपर", "हर यूनिट की फ़ॉर्मूला शीट"], inclusions: ["सवालों की शीट", "हर टेस्ट", "हर क्लास के बाद डाउट का समय"], category: "गणित", name: "गणित, कक्षा 11 और 12", detail: "हर क्लास में बीस सवाल, अगली क्लास में जाँचे जाते हैं। कक्षा 12 दिसंबर से पिछले पाँच बोर्ड पेपर हल करती है, हर हफ़्ते एक।", feeNote: "सालाना, दो किस्तों में", level: "क्लास 11 से 12", subjects: "बीजगणित, कैलकुलस, सदिश, निर्देशांक ज्यामिति, प्रायिकता", duration: "हर क्लास के लिए एक साल", timings: "हफ़्ते में 3 दिन, शाम 6:45 से रात 8:15 बजे", mode: "क्लासरूम", batchStarts: "क्लास 11: 5 अप्रैल 2027 से", eligibility: "मैथ्स के साथ क्लास 11 या 12 में, कोई भी बोर्ड।", testPlan: "हर क्लास के बीस सवाल अगली क्लास में जाँचे जाते हैं। हर चैप्टर के बाद चैप्टर टेस्ट और रविवार का पेपर।", refundNote: "दस दिन पहले बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
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
        { title: "Class 11", body: "Diversity of living organisms, structural organisation, cell, plant physiology, human physiology.", hi: { title: "क्लास 11", body: "जीव जगत की विविधता, संरचनात्मक संगठन, कोशिका, पादप कार्यिकी, मानव शरीर क्रिया।" } },
        { title: "Class 12", body: "Reproduction, genetics and evolution, biology and human welfare, biotechnology, ecology.", hi: { title: "क्लास 12", body: "जनन, आनुवंशिकी और विकास, जीव विज्ञान और मानव कल्याण, जैव प्रौद्योगिकी, पारिस्थितिकी।" } },
      ],
      material: ["NCERT line-by-line notes", "Diagram book, marked in class", "Last five board papers"],
      testPlan: "A diagram test every week and the Sunday paper.",
      instalments: [
        { label: "First instalment", amount: "8,000", note: "At admission", hi: { label: "पहली किस्त", note: "एडमिशन के समय" } },
        { label: "Second instalment", amount: "8,000", note: "By 30 September", hi: { label: "दूसरी किस्त", note: "30 सितंबर तक" } },
      ],
      inclusions: ["Notes and diagram book", "Every test", "Practical and viva fortnight"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Neha Bhargava"],
      hi: { seats: "हर बैच में 24", material: ["NCERT के पंक्ति दर पंक्ति नोट्स", "डायग्राम की कॉपी, क्लास में जाँची हुई", "पिछले पाँच बोर्ड पेपर"], inclusions: ["नोट्स और डायग्राम की कॉपी", "हर टेस्ट", "प्रैक्टिकल और वाइवा पखवाड़ा"], category: "जीव विज्ञान", name: "जीव विज्ञान, कक्षा 11 और 12", detail: "NCERT की हर पंक्ति क्लास में, क्योंकि बोर्ड और NEET दोनों वहीं से पूछते हैं। लेबल वाला डायग्राम क्लास में बनते और जाँचे जाते हैं, होमवर्क में नहीं।", feeNote: "सालाना, दो किस्तों में", level: "क्लास 11 से 12", subjects: "बॉटनी और ज़ूलॉजी", duration: "हर क्लास के लिए एक साल", timings: "हफ़्ते में 3 दिन, शाम 6:45 से रात 8:15 बजे", mode: "क्लासरूम", batchStarts: "क्लास 11: 6 अप्रैल 2027 से", eligibility: "बायोलॉजी के साथ क्लास 11 या 12 में, कोई भी बोर्ड।", testPlan: "हर हफ़्ते डायग्राम टेस्ट और रविवार का पेपर।", refundNote: "दस दिन पहले बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
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
        { title: "Science", body: "Physics, chemistry and biology chapters of the NCERT book, each taught by that subject's teacher.", hi: { title: "साइंस", body: "NCERT किताब के फिज़िक्स, केमिस्ट्री और बायोलॉजी के चैप्टर, हर एक उसी विषय के टीचर से।" } },
        { title: "Mathematics", body: "The full NCERT syllabus, with the CBSE sample paper worked every month from October in Class 10.", hi: { title: "मैथ्स", body: "NCERT का पूरा सिलेबस, और क्लास 10 में अक्टूबर से हर महीने CBSE सैंपल पेपर हल करवाया जाता है।" } },
      ],
      material: ["Chapter notes", "Sample papers from October"],
      testPlan: "A chapter test after each chapter and the Sunday paper.",
      inclusions: ["Chapter notes", "Every test"],
      refundNote: "Leave with ten days' notice and the unused months are refunded pro-rata within ten days.",
      facultyNames: ["Anupam Khare", "Neha Bhargava", "Rashmi Shrivastava"],
      hi: { seats: "हर बैच में 24", material: ["चैप्टर नोट्स", "अक्टूबर से सैंपल पेपर"], inclusions: ["चैप्टर नोट्स", "हर टेस्ट"], category: "कक्षा 9 और 10", name: "कक्षा 9 और 10, विज्ञान और गणित", detail: "विज्ञान अध्याय दर अध्याय उसी विषय के शिक्षक पढ़ाते हैं। विज्ञान, गणित या दोनों लीजिए।", feeNote: "प्रति विषय, सालाना", level: "क्लास 9 से 10", subjects: "साइंस और मैथ्स, अलग-अलग या साथ में", duration: "अप्रैल से बोर्ड परीक्षा तक", timings: "सोमवार से शनिवार, दोपहर 3:30 से शाम 4:45 बजे", mode: "क्लासरूम", batchStarts: "15 अक्टूबर तक एडमिशन", eligibility: "क्लास 9 या 10 में, CBSE या MP Board।", testPlan: "हर चैप्टर के बाद चैप्टर टेस्ट और रविवार का पेपर।", refundNote: "दस दिन पहले बताकर छोड़ें तो बचे हुए महीनों की फीस दस दिन के अंदर हिसाब से लौटा दी जाती है।" },
    },
  ],

  /* ── CLEARED: results, as subject marks, because a subject centre's
        proof is the mark in the subject. No student is named. ─────────── */
  resultsHeading: "What the 2026 board papers said",
  resultsNote:
    "The marks and counts in this section are example content, placed by Ideovent to show how a subject centre's results are set. Your own go here exactly as you publish them, subject by subject, and no student's name or photograph is printed without their written consent.",
  results: [
    { achievement: "98 of 100 in chemistry", exam: "CBSE Class 12", year: "2026", note: "Chemistry batch", category: "Chemistry", courseName: "Chemistry, Class 11 and 12", courseDuration: "Two years", paid: "paid", consent: true, quote: "The Saturday reaction slips were annoying for a year. In the board paper I did not have to remember a single reaction; I just knew them.", hi: { exam: "CBSE क्लास 12", courseDuration: "दो साल", category: "रसायन", achievement: "केमिस्ट्री में 100 में से 98", note: "केमिस्ट्री बैच", courseName: "केमिस्ट्री, क्लास 11 और 12", quote: "शनिवार की रिएक्शन पर्चियाँ साल भर परेशान करती रहीं। बोर्ड पेपर में मुझे एक भी रिएक्शन याद नहीं करना पड़ा; मुझे बस आते थे।" } },
    { achievement: "96 of 100 in physics", exam: "MP Board Class 12", year: "2026", note: "Physics batch", category: "Physics", courseName: "Physics, Class 11 and 12", courseDuration: "Two years", paid: "paid", hi: { exam: "MP Board क्लास 12", courseDuration: "दो साल", category: "भौतिकी", achievement: "फिज़िक्स में 100 में से 96", note: "फिज़िक्स बैच", courseName: "फिज़िक्स, क्लास 11 और 12" } },
    { achievement: "31 of 44 scored 85 or more in physics", exam: "CBSE and MP Board Class 12", year: "2026", note: "Every Class 12 physics student", category: "Physics", courseName: "Physics, Class 12", courseDuration: "One to two years", paid: "paid", hi: { exam: "CBSE और MP Board क्लास 12", courseDuration: "एक से दो साल", category: "भौतिकी", achievement: "44 में से 31 के फिज़िक्स में 85 या ज़्यादा", note: "क्लास 12 फिज़िक्स के सभी स्टूडेंट", courseName: "फिज़िक्स, क्लास 12" } },
    { achievement: "Class average 64 to 81 in maths", exam: "Class 11 annual to Class 12 board", year: "2026", note: "Maths batch, same students", category: "Maths", courseName: "Maths, Class 11 and 12", courseDuration: "Two years", paid: "paid", hi: { exam: "क्लास 11 वार्षिक से क्लास 12 बोर्ड", courseDuration: "दो साल", category: "गणित", achievement: "मैथ्स में क्लास का औसत 64 से 81", note: "मैथ्स बैच, वही स्टूडेंट", courseName: "मैथ्स, क्लास 11 और 12" } },
    { achievement: "95 of 100 in biology", exam: "CBSE Class 12", year: "2026", note: "Biology batch", category: "Biology", courseName: "Biology, Class 11 and 12", courseDuration: "Two years", paid: "scholarship", hi: { exam: "CBSE क्लास 12", courseDuration: "दो साल", category: "जीव विज्ञान", achievement: "बायोलॉजी में 100 में से 95", note: "बायोलॉजी बैच", courseName: "बायोलॉजी, क्लास 11 और 12" } },
    { achievement: "97.84 percentile", exam: "JEE Main, January session", year: "2026", note: "Physics, chemistry and maths batches", category: "JEE Main", courseName: "Physics, chemistry and maths, Class 11 and 12", courseDuration: "Two years", paid: "paid", hi: { exam: "JEE Main, जनवरी सत्र", courseDuration: "दो साल", category: "JEE Main", achievement: "97.84 पर्सेंटाइल", note: "फिज़िक्स, केमिस्ट्री और मैथ्स के बैच", courseName: "फिज़िक्स, केमिस्ट्री और मैथ्स, क्लास 11 और 12" } },
    { achievement: "97 of 100 in chemistry", exam: "MP Board Class 12", year: "2025", note: "Chemistry batch", category: "Chemistry", courseName: "Chemistry, Class 11 and 12", courseDuration: "Two years", paid: "paid", hi: { exam: "MP Board क्लास 12", courseDuration: "दो साल", category: "रसायन", achievement: "केमिस्ट्री में 100 में से 97", note: "केमिस्ट्री बैच", courseName: "केमिस्ट्री, क्लास 11 और 12" } },
    { achievement: "28 of 40 scored 85 or more in maths", exam: "CBSE and MP Board Class 12", year: "2025", note: "Every Class 12 maths student", category: "Maths", courseName: "Maths, Class 12", courseDuration: "One to two years", paid: "paid", hi: { exam: "CBSE और MP Board क्लास 12", courseDuration: "एक से दो साल", category: "गणित", achievement: "40 में से 28 के मैथ्स में 85 या ज़्यादा", note: "क्लास 12 मैथ्स के सभी स्टूडेंट", courseName: "मैथ्स, क्लास 12" } },
    { achievement: "99 of 100 in mathematics", exam: "CBSE Class 10", year: "2025", note: "Class 10 mathematics", category: "Class 10", courseName: "Class 9 and 10, mathematics", courseDuration: "Two years", paid: "paid", hi: { exam: "CBSE क्लास 10", courseDuration: "दो साल", category: "क्लास 10", achievement: "मैथ्स में 100 में से 99", note: "क्लास 10 मैथ्स", courseName: "क्लास 9 और 10, मैथ्स" } },
  ],

  /* ── CLEARED: faculty. Early on this theme, because in a subject centre
        the teacher is the reason a family chooses it. ─────────────────── */
  faculty: [
    { name: "Anupam Khare", photo: "/demo/img/people/teacher-m07-240.webp", subject: "Physics", qualification: "M.Sc. Physics", experience: "16 years. Takes every physics batch and the physics chapters of Class 9 and 10 science.", group: "Physics", batches: "Class 11 and 12 physics, Class 9 and 10 science", style: "Writes every derivation in full on the board once, then makes the class write it from memory the next week.", hi: { batches: "क्लास 11 और 12 फिज़िक्स, क्लास 9 और 10 साइंस", subject: "भौतिकी", experience: "16 साल। हर फिज़िक्स बैच और कक्षा 9 और 10 विज्ञान के फिज़िक्स अध्याय।", style: "हर डेरिवेशन एक बार बोर्ड पर पूरा, फिर अगले हफ़्ते क्लास उसे याद से लिखती है।", qualification: "M.Sc. फिज़िक्स", group: "फिज़िक्स" } },
    { name: "Farah Siddiqui", photo: "/demo/img/people/teacher-w02-240.webp", subject: "Chemistry", qualification: "M.Sc. Chemistry, B.Ed.", experience: "14 years. Started the centre in 2014 and takes every chemistry batch.", role: "Founder", group: "Chemistry", batches: "Class 11 and 12 chemistry", style: "Organic as mechanisms, never as lists. Ten-minute reaction slips every Saturday.", hi: { batches: "क्लास 11 और 12 केमिस्ट्री", subject: "रसायन", experience: "14 साल। 2014 में सेंटर शुरू किया और हर केमिस्ट्री बैच लेती हैं।", role: "संस्थापक", style: "ऑर्गेनिक मैकेनिज़्म से, कभी सूची से नहीं। हर शनिवार दस मिनट की रिएक्शन पर्ची।", qualification: "M.Sc. केमिस्ट्री, B.Ed.", group: "केमिस्ट्री" } },
    { name: "Vinod Chaturvedi", photo: "/demo/img/people/teacher-m08-240.webp", subject: "Maths, Class 11 and 12", qualification: "M.Sc. Mathematics", experience: "21 years, eleven of them teaching Class 12 board maths in a school.", group: "Maths", batches: "Class 11 and 12 maths", style: "Twenty problems a class, checked the next class, no exceptions.", hi: { batches: "क्लास 11 और 12 मैथ्स", subject: "गणित, कक्षा 11 और 12", experience: "21 साल, जिनमें ग्यारह साल स्कूल में कक्षा 12 बोर्ड गणित।", style: "हर क्लास में बीस सवाल, अगली क्लास में जाँच, कोई छूट नहीं।", qualification: "M.Sc. मैथ्स", group: "मैथ्स" } },
    { name: "Neha Bhargava", photo: "/demo/img/people/teacher-w04-240.webp", subject: "Biology", qualification: "M.Sc. Zoology, B.Ed.", experience: "9 years. Takes both biology batches and the biology chapters of Class 9 and 10 science.", group: "Biology", batches: "Class 11 and 12 biology, Class 9 and 10 science", style: "Every NCERT line read in class. Diagrams drawn and marked before the class ends.", hi: { batches: "क्लास 11 और 12 बायोलॉजी, क्लास 9 और 10 साइंस", subject: "जीव विज्ञान", experience: "9 साल। दोनों बायोलॉजी बैच और कक्षा 9 और 10 विज्ञान के बायोलॉजी अध्याय।", style: "NCERT की हर पंक्ति क्लास में। डायग्राम क्लास ख़त्म होने से पहले बनते और जाँचे जाते हैं।", qualification: "M.Sc. ज़ूलॉजी, B.Ed.", group: "बायोलॉजी" } },
    { name: "Rashmi Shrivastava", photo: "/demo/img/people/teacher-w12-240.webp", subject: "Mathematics, Class 9 and 10", qualification: "M.Sc. Mathematics, B.Ed.", experience: "12 years. Takes Class 9 and 10 mathematics only.", group: "Maths", batches: "Class 9 and 10 mathematics", style: "Starts each chapter from the mistake most students make in it.", hi: { batches: "क्लास 9 और 10 मैथ्स", subject: "गणित, कक्षा 9 और 10", experience: "12 साल। सिर्फ़ कक्षा 9 और 10 गणित।", style: "हर अध्याय उस ग़लती से शुरू करती हैं जो ज़्यादातर बच्चे उसमें करते हैं।", qualification: "M.Sc. मैथ्स, B.Ed.", group: "मैथ्स" } },
  ],

  /* ── CLEARED: why parents choose us. ─────────────────────────────────── */
  method: [
    {
      title: "Pay for the subject that needs help, and nothing else",
      body: "Most students come to us for one subject. Each subject is its own batch with its own fee, so a family is never charged for three subjects to fix one.",
      hi: {
        title: "जिस विषय में मदद चाहिए, सिर्फ़ उसकी फीस दीजिए",
        body: "ज़्यादातर बच्चे हमारे पास एक विषय के लिए आते हैं। हर विषय का अपना बैच और अपनी फीस है, इसलिए एक विषय सुधारने के लिए किसी परिवार से तीन विषयों की फीस नहीं ली जाती।",
      },
    },
    {
      title: "Board marks first, entrance concepts alongside",
      body: "Every chapter is finished to the NCERT line and the board's marking scheme before anything harder. JEE Main and NEET level problems come after, in the same class, for those who want them, and nobody is made to feel behind for skipping them.",
      hi: {
        title: "पहले बोर्ड के अंक, साथ में एंट्रेंस के कॉन्सेप्ट",
        body: "कुछ भी कठिन पढ़ाने से पहले हर चैप्टर NCERT की लाइन और बोर्ड की मार्किंग स्कीम तक पूरा होता है। JEE Main और NEET लेवल के सवाल उसके बाद, उसी क्लास में, जो चाहें उनके लिए आते हैं, और उन्हें छोड़ने वाले किसी बच्चे को पीछे होने का एहसास नहीं कराया जाता।",
      },
    },
    {
      title: "The practical and the viva are taught, not left to the school",
      body: "In January each Class 12 batch spends two weeks on the practical syllabus: the readings, the observation tables and the viva questions examiners actually ask. The experiments are done at school. We make sure your child understands them.",
      hi: {
        title: "प्रैक्टिकल और वाइवा भी पढ़ाए जाते हैं, स्कूल पर नहीं छोड़े जाते",
        body: "जनवरी में क्लास 12 का हर बैच दो हफ़्ते प्रैक्टिकल सिलेबस पर लगाता है: रीडिंग, ऑब्ज़र्वेशन टेबल और वाइवा के वे सवाल जो परीक्षक सच में पूछते हैं। प्रयोग स्कूल में होते हैं। हम यह पक्का करते हैं कि बच्चा उन्हें समझे।",
      },
    },
  ],

  /* ── STRUCTURE: the week. Label, days, time and subject are KEPT;
        faculty and room are CLEARED. Built so that no two subjects of one
        class share a slot, which is what "take any combination" rests on. */
  scheduleNote:
    "No two subjects of the same class share a slot, so any combination of the four runs without a clash. Class 12 has priority on the earlier slot in the board year.",
  schedule: [
    { label: "Class 9 and 10, science", days: "Mon, Wed, Fri", time: "3:30 to 4:45 pm", subject: "Science, by chapter", faculty: "Anupam Khare and Neha Bhargava", room: "Room 1", hi: { faculty: "Anupam Khare और Neha Bhargava", room: "कमरा 1", label: "कक्षा 9 और 10, विज्ञान", days: "सोम, बुध, शुक्र", time: "दोपहर 3:30 से 4:45", subject: "विज्ञान, चैप्टर के हिसाब से" } },
    { label: "Class 9 and 10, mathematics", days: "Tue, Thu, Sat", time: "3:30 to 4:45 pm", subject: "Mathematics", faculty: "Rashmi Shrivastava", room: "Room 1", hi: { room: "कमरा 1", label: "कक्षा 9 और 10, गणित", days: "मंगल, गुरु, शनि", time: "दोपहर 3:30 से 4:45", subject: "गणित" } },
    { label: "Class 12", days: "Tue, Thu, Sat", time: "5:00 to 6:30 pm", subject: "Physics", faculty: "Anupam Khare", room: "Room 1", hi: { room: "कमरा 1", label: "कक्षा 12", days: "मंगल, गुरु, शनि", time: "शाम 5 से 6:30", subject: "भौतिकी" } },
    { label: "Class 12", days: "Mon, Wed, Fri", time: "5:00 to 6:30 pm", subject: "Chemistry", faculty: "Farah Siddiqui", room: "Room 2", hi: { room: "कमरा 2", label: "कक्षा 12", days: "सोम, बुध, शुक्र", time: "शाम 5 से 6:30", subject: "रसायन" } },
    { label: "Class 12", days: "Mon, Wed, Fri", time: "6:45 to 8:15 pm", subject: "Maths", faculty: "Vinod Chaturvedi", room: "Room 1", hi: { room: "कमरा 1", label: "कक्षा 12", days: "सोम, बुध, शुक्र", time: "शाम 6:45 से रात 8:15", subject: "गणित" } },
    { label: "Class 12", days: "Tue, Thu, Sat", time: "6:45 to 8:15 pm", subject: "Biology", faculty: "Neha Bhargava", room: "Room 2", hi: { room: "कमरा 2", label: "कक्षा 12", days: "मंगल, गुरु, शनि", time: "शाम 6:45 से रात 8:15", subject: "जीव विज्ञान" } },
    { label: "Class 11", days: "Mon, Wed, Fri", time: "5:00 to 6:30 pm", subject: "Physics", faculty: "Anupam Khare", room: "Room 3", hi: { room: "कमरा 3", label: "कक्षा 11", days: "सोम, बुध, शुक्र", time: "शाम 5 से 6:30", subject: "भौतिकी" } },
    { label: "Class 11", days: "Tue, Thu, Sat", time: "5:00 to 6:30 pm", subject: "Chemistry", faculty: "Farah Siddiqui", room: "Room 2", hi: { room: "कमरा 2", label: "कक्षा 11", days: "मंगल, गुरु, शनि", time: "शाम 5 से 6:30", subject: "रसायन" } },
    { label: "Class 11", days: "Tue, Thu, Sat", time: "6:45 to 8:15 pm", subject: "Maths", faculty: "Vinod Chaturvedi", room: "Room 3", hi: { room: "कमरा 3", label: "कक्षा 11", days: "मंगल, गुरु, शनि", time: "शाम 6:45 से रात 8:15", subject: "गणित" } },
    { label: "Class 11", days: "Mon, Wed, Fri", time: "6:45 to 8:15 pm", subject: "Biology", faculty: "Neha Bhargava", room: "Room 2", hi: { room: "कमरा 2", label: "कक्षा 11", days: "सोम, बुध, शुक्र", time: "शाम 6:45 से रात 8:15", subject: "जीव विज्ञान" } },
    { label: "Test, every batch", days: "Alternate Sundays", time: "9:00 to 11:00 am", subject: "The fortnight's chapters, board pattern", faculty: "The subject teacher", room: "Rooms 1 to 3", hi: { faculty: "उस विषय के टीचर", room: "कमरा 1 से 3", label: "टेस्ट, हर बैच", days: "हर दूसरे रविवार", time: "सुबह 9 से 11 बजे", subject: "पिछले दो हफ़्ते के चैप्टर, बोर्ड पैटर्न पर" } },
  ],

  /* ── CLEARED: the trial, in the subject that worries the family. ──────── */
  trial: {
    heading: "Sit in on two classes of the subject that worries you",
    body: "Pick the subject. Your child attends two ordinary classes in the batch they would join, including the doubt time at the end. Afterwards the teacher spends five minutes with you on where your child stands in that subject, and says so plainly if they do not need us.",
    duration: "Two classes, 90 minutes each",
    bring: "The school textbook and the last test paper or report card for that subject.",
    howToBook: "Call or send a WhatsApp message with the subject and the class. We reply with the next two class days that have a free seat.",
    hi: {
      heading: "जिस विषय की चिंता है, उसकी दो क्लास में बैठिए",
      duration: "दो क्लास, 90 मिनट की",
      bring: "उस विषय की स्कूल की किताब और पिछला टेस्ट पेपर या रिपोर्ट कार्ड।",
      howToBook: "विषय और कक्षा के साथ कॉल या WhatsApp कीजिए। हम अगले दो दिन बताएँगे जिनमें सीट ख़ाली है।",
      body: "विषय चुनिए। बच्चा उस बैच की दो आम क्लास में बैठता है जिसमें वह आएगा, आख़िर के डाउट वाले समय समेत। उसके बाद टीचर पाँच मिनट आपके साथ बैठकर बताते हैं कि उस विषय में बच्चा कहाँ है, और अगर उसे हमारी ज़रूरत नहीं है तो साफ़ कह देते हैं।",
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
      hi: {
        title: "क्या बच्चा सिर्फ़ एक विषय ले सकता है?",
        body: "हाँ। हर विषय अपने अलग बैच में पढ़ाया जाता है, इसलिए बच्चा एक विषय या कोई भी जोड़ ले सकता है।",
        group: "विषय",
      },
    },
    {
      title: "What does a subject cost?",
      body: "Physics, chemistry and maths for Class 11 or 12 are ₹18,000 a year each, and biology ₹16,000, in two instalments. Class 9 and 10 science or mathematics is ₹12,000 a year each. Two subjects cost twice one; there is no admission or material fee. These are example figures and yours replace them.",
      group: "Fees",
      hi: {
        title: "एक विषय की फीस कितनी है?",
        body: "क्लास 11 या 12 के लिए फिज़िक्स, केमिस्ट्री और मैथ्स हर एक ₹18,000 सालाना, और बायोलॉजी ₹16,000, दो किस्तों में। क्लास 9 और 10 की साइंस या मैथ्स हर एक ₹12,000 सालाना। दो विषय की फीस एक की दोगुनी; कोई एडमिशन या मटीरियल फीस नहीं। ये उदाहरण के आँकड़े हैं, आपके अपने आँकड़े इनकी जगह आएँगे।",
        group: "फीस",
      },
    },
    {
      title: "Which boards do you teach?",
      body: "CBSE and MP Board, in the same batch. The syllabus is the same NCERT book for both, and where the papers differ the teacher sets the practice questions both ways.",
      group: "Subjects",
      hi: {
        title: "आप किन बोर्ड के लिए पढ़ाते हैं?",
        body: "CBSE और MP Board, एक ही बैच में। दोनों के लिए सिलेबस वही NCERT किताब है, और जहाँ पेपर अलग होते हैं वहाँ टीचर दोनों तरह के अभ्यास सवाल देते हैं।",
        group: "विषय",
      },
    },
    {
      title: "Will two subjects clash with each other?",
      body: "No. The week is built so that no two subjects of the same class share a slot. The latest class ends at 8:15 pm, and nothing starts before 3:30 pm, so school comes first.",
      group: "Timings",
      hi: {
        title: "क्या दो विषयों का समय टकराएगा?",
        body: "नहीं। हफ़्ता ऐसे बना है कि एक ही क्लास के दो विषय एक समय पर न हों। आख़िरी क्लास रात 8:15 बजे ख़त्म होती है, और कुछ भी दोपहर 3:30 बजे से पहले शुरू नहीं होता, ताकि स्कूल पहले आए।",
        group: "समय",
      },
    },
    {
      title: "Does this prepare my child for JEE or NEET?",
      body: "It builds the concepts both exams are written on, and each class ends with problems at that level for those who want them. It is not an entrance course: there are no all-India mock tests here. Many of our students take their entrance coaching elsewhere and come to us for the subject they find hardest.",
      group: "Subjects",
      hi: {
        title: "क्या इससे बच्चे की JEE या NEET की तैयारी होती है?",
        body: "इससे वे कॉन्सेप्ट बनते हैं जिन पर दोनों परीक्षाएँ टिकी हैं, और जो चाहें उनके लिए हर क्लास उस लेवल के सवालों से ख़त्म होती है। यह एंट्रेंस कोर्स नहीं है: यहाँ ऑल इंडिया मॉक टेस्ट नहीं होते। हमारे कई स्टूडेंट एंट्रेंस की कोचिंग कहीं और करते हैं और जो विषय सबसे कठिन लगता है उसके लिए हमारे पास आते हैं।",
        group: "विषय",
      },
    },
    {
      title: "Do you help with the practical file and the viva?",
      body: "Yes, in January for Class 12 and in February for Class 11: the readings, the observation tables and the viva questions. The experiments themselves are done at school.",
      group: "Subjects",
      hi: {
        title: "क्या आप प्रैक्टिकल फ़ाइल और वाइवा में मदद करते हैं?",
        body: "हाँ, क्लास 12 के लिए जनवरी में और क्लास 11 के लिए फ़रवरी में: रीडिंग, ऑब्ज़र्वेशन टेबल और वाइवा के सवाल। प्रयोग ख़ुद स्कूल में होते हैं।",
        group: "विषय",
      },
    },
    {
      title: "How big is a batch?",
      body: "Twenty-four at most. When a batch is full we say so, and we do not add chairs.",
      group: "Batches",
      hi: {
        title: "एक बैच कितना बड़ा होता है?",
        body: "ज़्यादा से ज़्यादा चौबीस। बैच भर जाए तो हम साफ़ बता देते हैं, और कुर्सियाँ नहीं बढ़ाते।",
        group: "बैच",
      },
    },
    {
      title: "What should my child bring to the first class?",
      body: "The school textbook for the subject, the NCERT book as well if the school uses another publisher, a notebook kept only for this subject, and a pen.",
      group: "Batches",
      generic: true,
      hi: {
        title: "पहली क्लास में बच्चा क्या लेकर आए?",
        body: "उस विषय की स्कूल की किताब, स्कूल किसी और प्रकाशक की किताब चलाता हो तो NCERT की किताब भी, सिर्फ़ इसी विषय के लिए एक कॉपी, और एक पेन।",
        group: "बैच",
      },
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
      hi: {
        title: "क्लास 12 केमिस्ट्री: इस सत्र में तीन सीटें बाक़ी",
        date: "24 सितंबर 2026",
        body: "क्लास 12 के बाक़ी तीन विषय भर चुके हैं। अप्रैल 2027 के लिए क्लास 11 के एडमिशन 1 दिसंबर से खुलेंगे।",
      },
    },
    {
      title: "Sunday 4 October: half-yearly syllabus test",
      date: "21 September 2026",
      body: "All subjects, board pattern, 9:00 to 11:00 am. Papers are returned with marks in the next class.",
      kind: "event",
      posted: "2026-09-21",
      expires: "2026-10-04",
      hi: {
        title: "रविवार 4 अक्टूबर: अर्धवार्षिक सिलेबस का टेस्ट",
        date: "21 सितंबर 2026",
        body: "सभी विषय, बोर्ड पैटर्न, सुबह 9 से 11 बजे। पेपर अंकों के साथ अगली क्लास में लौटाए जाएँगे।",
      },
    },
    {
      title: "Class 12 practical and viva fortnight from 11 January",
      date: "15 September 2026",
      body: "Regular classes pause for two weeks. Bring the school practical file to every session.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2027-01-25",
      hi: {
        title: "11 जनवरी से क्लास 12 का प्रैक्टिकल और वाइवा पखवाड़ा",
        date: "15 सितंबर 2026",
        body: "नियमित क्लास दो हफ़्ते बंद रहेंगी। हर सेशन में स्कूल की प्रैक्टिकल फ़ाइल लेकर आएँ।",
      },
    },
  ],

  /* ── CLEARED: chapter tests. Board pattern, never a rank predictor. ──── */
  testSeries: {
    intro: "Every chapter ends with a 40-minute test, and every second Sunday there is a two-hour paper on the fortnight's chapters in the board pattern. Papers come back marked in the next class, with the marks the board scheme would give.",
    types: [
      { title: "Chapter test", body: "40 minutes, at the end of each chapter, in class.", hi: { title: "चैप्टर टेस्ट", body: "40 मिनट, हर चैप्टर के अंत में, क्लास में ही।" } },
      { title: "Sunday paper", body: "Two hours, board pattern, the fortnight's chapters, all subjects on the same morning.", hi: { title: "रविवार का पेपर", body: "दो घंटे, बोर्ड पैटर्न, पखवाड़े भर के चैप्टर, सभी विषय एक ही सुबह।" } },
      { title: "Pre-board papers", body: "Three full board papers per subject in January and February, marked to the board scheme.", hi: { title: "प्री-बोर्ड पेपर", body: "जनवरी और फ़रवरी में हर विषय के तीन पूरे बोर्ड पेपर, बोर्ड की स्कीम से जाँचे हुए।" } },
    ],
    schedule: [
      { label: "Sunday paper", days: "Alternate Sundays", time: "9:00 to 11:00 am", subject: "The fortnight's chapters", hi: { label: "रविवार का पेपर", days: "हर दूसरे रविवार", time: "सुबह 9 से 11 बजे", subject: "पिछले दो हफ़्ते के चैप्टर" } },
      { label: "Half-yearly paper", days: "Sunday 4 October 2026", time: "9:00 to 11:00 am", subject: "Half-yearly syllabus", hi: { label: "छमाही पेपर", days: "रविवार, 4 अक्टूबर 2026", time: "सुबह 9 से 11 बजे", subject: "छमाही का सिलेबस" } },
      { label: "Pre-board papers", days: "January and February 2027", time: "9:00 am to 12:00 noon", subject: "Full board paper", hi: { label: "प्री-बोर्ड पेपर", days: "जनवरी और फ़रवरी 2027", time: "सुबह 9 से दोपहर 12 बजे", subject: "पूरा बोर्ड पेपर" } },
    ],
    pattern: "The current CBSE sample paper pattern for CBSE students and the MP Board blueprint for MP Board students, set side by side where they differ.",
    downloads: [
      { label: "CBSE Class 12 physics sample paper, solved", url: "https://example.com/physics-sample.pdf", group: "Sample papers", hi: { label: "CBSE क्लास 12 फिज़िक्स सैंपल पेपर, हल सहित", group: "सैंपल पेपर" } },
      { label: "Organic reactions chart", url: "https://example.com/organic-chart.pdf", group: "Notes", hi: { label: "ऑर्गेनिक रिएक्शन का चार्ट", group: "नोट्स" } },
    ],
    hi: {
      intro: "हर अध्याय के अंत में 40 मिनट का टेस्ट, और हर दूसरे रविवार पखवाड़े के अध्यायों पर दो घंटे का बोर्ड पैटर्न पेपर। पेपर अगली क्लास में बोर्ड की मार्किंग स्कीम से जाँचकर लौटते हैं।",
      pattern: "CBSE विद्यार्थियों के लिए CBSE सैंपल पेपर का पैटर्न और MP Board विद्यार्थियों के लिए MP Board का ब्लूप्रिंट, जहाँ अंतर है वहाँ साथ-साथ।",
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
      hi: {
        title: "एक विषय या चार? कैसे तय करें कि बच्चे को क्या चाहिए",
        date: "10 सितंबर 2026",
        excerpt: "क्लास 11 के अंक विषय दर विषय देखिए, कुल नहीं। कमी अक्सर एक ही जगह होती है।",
        body: "एक परिवार 71% औसत से परेशान होकर आता है और चारों विषय माँगता है। दस में से नौ बार मार्कशीट कुछ और कहती है: तीन विषय सत्तर के ऊपरी हिस्से में और एक पचास में।\n\nउस एक को सुधारिए। जो बच्चा हफ़्ते में चार शामें कोचिंग में बिताता है, उसके पास असल में कमज़ोर विषय का अभ्यास करने का समय नहीं बचता।\n\nदो विषय कमज़ोर हैं तो दोनों लीजिए, और फीस देने से पहले टाइमटेबल में टकराव देख लीजिए। हमारा ऐसा बना है कि कुछ नहीं टकराता, पर कई जगह ऐसा नहीं होता।",
      },
    },
    {
      slug: "derivations-board-marks",
      title: "Why derivations still decide the physics board mark",
      date: "22 August 2026",
      author: "Anupam Khare",
      excerpt: "Five-mark derivations are the most predictable marks in the paper, and the most often thrown away.",
      body: "Every year the physics paper carries derivations straight from the NCERT book. They are the most predictable marks in the paper, and students lose them by skipping a step the marking scheme gives a mark for.\n\nWrite each one in full, once a week, from memory. Label the diagram. State the assumption. The examiner is not looking for elegance, only for the steps.",
      hi: {
        title: "फिज़िक्स के बोर्ड अंक आज भी डेरिवेशन से क्यों तय होते हैं",
        date: "22 अगस्त 2026",
        excerpt: "पाँच अंक के डेरिवेशन पेपर के सबसे पक्के अंक हैं, और सबसे ज़्यादा गँवाए भी यही जाते हैं।",
        body: "हर साल फिज़िक्स के पेपर में सीधे NCERT किताब से डेरिवेशन आते हैं। ये पेपर के सबसे पक्के अंक हैं, और बच्चे वह एक स्टेप छोड़कर इन्हें गँवा देते हैं जिस पर मार्किंग स्कीम अंक देती है।\n\nहर डेरिवेशन हफ़्ते में एक बार, याद से, पूरा लिखिए। डायग्राम पर लेबल लगाइए। मान्यता लिखिए। परीक्षक सुंदरता नहीं, सिर्फ़ स्टेप देखता है।",
      },
    },
    {
      slug: "organic-without-memorising",
      title: "Organic chemistry without memorising a list",
      date: "5 August 2026",
      author: "Farah Siddiqui",
      excerpt: "There are about a dozen ideas under every reaction in the syllabus. Learn those and the reactions follow.",
      body: "Students memorise reactions as a list and forget them in the exam hall. Underneath the list there are about a dozen ideas: electron-rich attacks electron-poor, a stable intermediate forms faster, a good leaving group leaves.\n\nLearn those ideas first, then draw every reaction arrow by arrow. By the third month the list is no longer a list.",
      hi: {
        title: "बिना लिस्ट रटे ऑर्गेनिक केमिस्ट्री",
        date: "5 अगस्त 2026",
        excerpt: "सिलेबस के हर रिएक्शन के नीचे लगभग एक दर्जन बातें हैं। उन्हें सीख लीजिए, रिएक्शन अपने आप आ जाएँगे।",
        body: "बच्चे रिएक्शन को लिस्ट की तरह रटते हैं और परीक्षा हॉल में भूल जाते हैं। उस लिस्ट के नीचे लगभग एक दर्जन बातें हैं: इलेक्ट्रॉन से भरपूर हिस्सा इलेक्ट्रॉन की कमी वाले पर हमला करता है, स्थिर मध्यवर्ती जल्दी बनता है, अच्छा लीविंग ग्रुप निकल जाता है।\n\nपहले ये बातें सीखिए, फिर हर रिएक्शन एरो दर एरो बनाइए। तीसरे महीने तक वह लिस्ट, लिस्ट नहीं रहती।",
      },
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
      intro: "हर विषय की अपनी फीस है, उसके कोर्स पेज पर छपी। यहाँ फीस भरने और लौटाने का तरीक़ा है।",
      paymentModes: ["UPI", "बैंक ट्रांसफ़र", "फ़्रंट डेस्क पर कार्ड"],
      countsYear: "2025-26: क्लास 10 और 12 के वे विद्यार्थी जिन्होंने हमारे साथ लिए विषय में 75 या ज़्यादा अंक पाए",
      instalmentNote: "हर विषय दो किस्तों में, एडमिशन पर और 30 सितंबर तक। दूसरी किस्त को दो में बाँटना हो तो ऑफ़िस से कहिए।",
      refund: "किसी भी विषय को दस दिन पहले लिखकर बताकर छोड़िए। उस विषय की बची हुई महीनों की फीस दस दिन में लौटाई जाती है।",
      receipts: "हर भुगतान की छपी रसीद, और वही ईमेल पर।",
      noIncrease: "जिस सत्र में बच्चा आया, उसमें विषय की फीस नहीं बदलती।",
    },
  },

  /* ── KEPT (stock): the Gallery page. alt is empty on purpose: a stock
        photo's alt comes from the manifest, in both languages, and no
        caption names a room of the institute. */
  photos: [
    { src: "/demo/img/coaching/c3-hero-chemistry-lab-800.webp", alt: "", category: "Labs", hi: { category: "लैब" } },
    { src: "/demo/img/coaching/c3-microscope-640.webp", alt: "", category: "Labs", hi: { category: "लैब" } },
    { src: "/demo/img/coaching/c3-test-tubes-640.webp", alt: "", category: "Labs", hi: { category: "लैब" } },
    { src: "/demo/img/coaching/c3-lab-practical-640.webp", alt: "", category: "Labs", hi: { category: "लैब" } },
    { src: "/demo/img/coaching/c1-self-study-640.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
    { src: "/demo/img/coaching/c4-notebook-writing-640.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "office@example.com",
    addressLines: ["Meniscus Science Classes", "Second floor, Example Complex, Example Road", "Bhopal, Madhya Pradesh 462000"],
    hours: "Monday to Saturday, 3:00 to 8:30 pm. Sunday, 9:00 am to 12:00 noon on test days.",
    mapQuery: "Meniscus Science Classes, Bhopal",
    landmark: "Opposite the Example Road petrol pump, entrance from the side lane",
    hi: { addressLines: ["Meniscus Science Classes", "दूसरी मंज़िल, Example Complex, Example Road", "भोपाल, मध्य प्रदेश 462000"], hours: "सोमवार से शनिवार, दोपहर 3:00 से रात 8:30। रविवार, टेस्ट वाले दिन सुबह 9:00 से 12:00।", landmark: "Example Road पेट्रोल पंप के सामने, बगल की गली से प्रवेश" },
  },
});
