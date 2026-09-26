/**
 * TEMPLATE c4: FOUNDATION, CLASS 6 TO 10, WITH THE OLYMPIADS.
 *
 * Segment: the foundation centre in a large city, where children from CBSE,
 * ICSE and State Board schools come on weekday evenings and weekend mornings
 * for maths and science one step deeper than school, and on Sunday for the
 * olympiads if they want them. The reader is the parent of an eleven or
 * twelve year old, and they are not choosing an institution: they are
 * solving this term's problem, usually maths.
 *
 * WHAT THIS PARENT ASKS FIRST, in the order the page answers it:
 *   can my child try it without a test or a commitment (the free first class
 *   opens the page on this theme), how many children in a group, how much
 *   homework and how late (the method blocks and the timings), will this put
 *   my child on a screen, will the teacher tell me the truth about my child,
 *   what it costs a month, and which olympiads, and is NTSE still held.
 *
 * NTSE, HONESTLY. The line-up names "Olympiad / NTSE". NCERT put NTSE on
 * hold in 2022 and, on the 26 September 2026 search, has not announced its
 * return. A centre that knows its segment does not sell an exam that is not
 * being held, so NTSE is not in `focusAreas` or in a batch name; it is
 * answered in the FAQ, which says what the Olympiad group already covers and
 * what happens if NCERT brings it back. The olympiads named (IMO and NSO for
 * Class 6 to 8, IOQM and NSEJS for Class 9 and 10) are the real pathways.
 *
 * Registry: Warm family, `courtyard` theme (multi-page). The old `studio`
 * single page is frozen for demos already sent.
 *
 * THE MoE 2024 POINT, FLAGGED FOR MEHDI. The Ministry of Education's 2024
 * guidelines say coaching centres should not enrol students under sixteen or
 * before the secondary exam. National brands still run Class 6 to 10
 * foundation, so this segment is real, but the copy frames Tangram as an
 * after-school maths and science class plus olympiad practice, alongside
 * school and never in place of it, and never implies government approval.
 *
 * THE INSTITUTE DOES NOT EXIST. A search on 26 September 2026 found no
 * coaching institute called Tangram Foundation Classes, or any Indian
 * olympiad centre named Tangram (the only "Tangram" was a logistics training
 * centre abroad). No child is named. Contact details are the reserved
 * fiction patterns.
 *
 * WHAT A DUPLICATE KEEPS: the five groups' names, class ranges, subjects,
 * timings and mode, the week without teachers and rooms, and the two FAQs
 * marked generic. The distinctive practices (paper only, forty-minute
 * homework, the monthly call) are in `method`, `about` and `detail`, which
 * are cleared, so they never become a real centre's promise by accident.
 */

import { defineTemplateContent } from "../shape";
import { COACHING_PAGE_SETS } from "../../site/pageSets";

export default defineTemplateContent("coaching", {
  /* ── KEPT: which pages this segment has. ─────────────────────────────── */
  sitePages: [...COACHING_PAGE_SETS["c4-foundation"], "gallery"],

  /* ── KEPT: stock photographs (public/demo/img, see ../shape.ts). Licensed
        models and rooms standing in for the institute; the alt text comes
        from the manifest and describes the scene. A duplicate carries these
        paths, and the admin checklist says so until the hero is replaced. */
  heroImage: "/demo/img/coaching/c4-hero-bright-class-800.webp",
  sectionPhotos: {
    about: "/demo/img/coaching/c4-attentive-class-640.webp",
    courses: "/demo/img/coaching/c4-two-boys-desk-640.webp",
    admissions: "/demo/img/coaching/c2-small-group-class-640.webp",
  },

  /* ── CLEARED: identity ───────────────────────────────────────────────── */
  instituteName: "Tangram Foundation Classes",
  tagline: "Maths and science for Class 6 to 10, in groups of fifteen or fewer, with homework that fits in forty minutes.",
  city: "Pune",
  state: "Maharashtra",

  /* ── KEPT: market, language, currency, and what is taught ────────────── */
  country: "India",
  market: "india",
  currency: "INR",
  /* "Foundation and Olympiad coaching in Pune". The two words also chip the
     groups that carry them. */
  focusAreas: ["Foundation", "Olympiad"],

  /* CLEARED. The home headline, so the hero does not call an after-school class "coaching" (MoE 2024). */
  admissionsHeadline: "After-school maths, science and Olympiad classes in Pune",

  /* ── CLEARED: history ────────────────────────────────────────────────── */
  established: "Since 2016",
  establishedYear: "2016",
  boardOrAffiliation: "A private after-school class for maths and science, alongside school and never in place of it. Not affiliated to any school board or olympiad body, and not approved or recognised by any government authority.",

  about:
    "Tangram Foundation Classes has taught maths and science to Class 6 to 10 in Pune since 2016. Children come from CBSE, ICSE and State Board schools, and each group follows the chapters their schools are on while going one step further than the textbook. Groups are fifteen at most, twelve for Class 6 and 7. Everything is on paper: there is no app to install and no video to watch at home. The Olympiad groups meet on Sundays, for children who want more, and nobody is pushed into them.",

  hi: {
    admissionsHeadline: "पुणे में स्कूल के बाद गणित, विज्ञान और ओलंपियाड की कक्षाएँ",
    tagline: "कक्षा 6 से 10 के लिए गणित और विज्ञान, पंद्रह या कम के ग्रुप में, और होमवर्क जो चालीस मिनट में पूरा हो।",
    resultsHeading: "पिछला साल, उन अंकों में जो अभिभावक पहचानते हैं",
    classSizePromise: "एक ग्रुप में पंद्रह से ज़्यादा नहीं। कक्षा 6 और 7 में बारह।",
    vision: "ऐसे बच्चे जिन्हें गणित से डर नहीं, जिज्ञासा हो।",
    mission: "स्कूल के साथ, स्कूल की जगह नहीं: छोटे ग्रुप, काग़ज़ पर काम, और हर महीने शिक्षक का फ़ोन।",
    about: "Tangram Foundation Classes 2016 से पुणे में क्लास 6 से 10 के बच्चों को मैथ्स और साइंस पढ़ा रहा है। बच्चे CBSE, ICSE और स्टेट बोर्ड के स्कूलों से आते हैं, और हर ग्रुप वही चैप्टर पढ़ता है जो उनके स्कूल में चल रहे हैं, पर किताब से एक कदम आगे जाकर। एक ग्रुप में ज़्यादा से ज़्यादा पंद्रह बच्चे, क्लास 6 और 7 में बारह। सब कुछ काग़ज़ पर होता है: न कोई ऐप इंस्टॉल करना, न घर पर कोई वीडियो देखना। ओलंपियाड ग्रुप रविवार को मिलते हैं, उन बच्चों के लिए जो और चाहते हैं, और किसी को उनमें ज़बरदस्ती नहीं डाला जाता।",
    resultsNote: "इस हिस्से का हर आँकड़ा उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि एक फ़ाउंडेशन सेंटर के रिज़ल्ट कैसे लिखे जाते हैं। आपके अपने रिज़ल्ट लाइन दर लाइन इनकी जगह लेंगे, और अभिभावक की लिखित सहमति के बिना किसी बच्चे का नाम या फ़ोटो नहीं छपता।",
    scheduleNote: "सबसे छोटे बच्चों के ग्रुप बुधवार और शनिवार को मिलते हैं, ताकि स्कूल के दिन के बाद लंबी शाम न हो। स्कूल की परीक्षा वाले दिन कोई ग्रुप नहीं मिलता; तारीख़ बताइए, क्लास खिसक जाएगी।",
  },

  /* ── CLEARED: the About page. ─────────────────────────────────────────── */
  classSizePromise: "Never more than fifteen to a group. Twelve in Class 6 and 7.",
  vision: "Children who are curious about maths rather than afraid of it.",
  mission: "Alongside school, never in place of it: small groups, work on paper, and a call from the teacher every month.",
  founder: {
    name: "Meera Kulkarni",
    role: "Founder and maths teacher",
    story: "I taught maths in a CBSE school for eight years and kept meeting Class 8 children who had decided they were bad at maths in Class 6. Usually nobody had noticed a single missing idea, fractions or negative numbers, and everything after it was built on sand. Tangram started in 2016 with one group of ten on Saturday mornings. We still keep the groups small enough that I know every child's missing idea by name.",
    hi: { role: "संस्थापक और गणित शिक्षिका", story: "मैंने आठ साल CBSE स्कूल में गणित पढ़ाया और बार-बार ऐसे कक्षा 8 के बच्चे मिले जिन्होंने कक्षा 6 में ही मान लिया था कि उन्हें गणित नहीं आता। अक्सर एक ही बात छूटी होती थी, भिन्न या ऋणात्मक संख्याएँ, और उसके बाद सब रेत पर बना था। Tangram 2016 में शनिवार सुबह दस बच्चों के एक ग्रुप से शुरू हुआ।" },
  },
  stats: [
    { value: "15", label: "Children per group, at most", basis: "Twelve in Class 6 and 7", hi: { label: "एक ग्रुप में अधिकतम बच्चे", basis: "कक्षा 6 और 7 में बारह" } },
    { value: "14", label: "Marks up in school maths, on average", basis: "Class 6 to 8 children who joined mid-year, half-yearly to annual, 2025-26", hi: { label: "स्कूल गणित में औसत बढ़त", basis: "बीच साल में आए कक्षा 6 से 8 के बच्चे, 2025-26" } },
    { value: "40", label: "Minutes of homework per class, at most", basis: "None in the week of a school exam", hi: { label: "हर क्लास का अधिकतम होमवर्क, मिनट", basis: "स्कूल परीक्षा के हफ़्ते में कोई नहीं" } },
  ],
  joining: [
    { title: "Book a free first class", body: "WhatsApp your child's class and school. We reply the same day with a slot.", hi: { title: "मुफ़्त पहली क्लास बुक कीजिए", body: "बच्चे की कक्षा और स्कूल WhatsApp कीजिए। उसी दिन स्लॉट बताएँगे।" } },
    { title: "Ten honest minutes", body: "After the class, the teacher tells you what came easily and where your child stopped.", hi: { title: "दस ईमानदार मिनट", body: "क्लास के बाद शिक्षक बताते हैं क्या आसान लगा और बच्चा कहाँ रुका।" } },
    { title: "Join for one term", body: "Pay by the term, not the year. Leave with ten days' notice and the rest comes back.", hi: { title: "एक टर्म के लिए जुड़िए", body: "साल की नहीं, टर्म की फीस। दस दिन पहले बताकर छोड़िए, बाक़ी वापस।" } },
  ],

  /* ── STRUCTURE: the groups, as five tiles. Name, level, subjects,
        duration, timings and mode are KEPT; batchStarts, seats, fee,
        feeNote and detail are CLEARED. The two Olympiad groups keep their
        price out of `fee`: they are mostly taken on top of a Foundation
        group, and priced as batches they would make the "from" line read
        lower than any Foundation group actually costs. ─────────────────── */
  courses: [
    {
      name: "Class 6 and 7 Foundation, maths and science",
      level: "Class 6 to 7",
      subjects: "Maths and science, with reasoning puzzles",
      duration: "June to March",
      timings: "Wed 5:00 to 6:30 pm, Sat 10:00 to 11:30 am",
      mode: "Classroom",
      batchStarts: "New group from 10 October 2026",
      seats: "12 per group",
      fee: "3,200",
      feeNote: "a month, paid by the term",
      detail: "Each class opens on the school chapter your child is doing this week, then goes one step deeper. Homework is set to take forty minutes, and you are asked to tell us when it takes longer.",
      slug: "class-6-7",
      category: "Class 6 and 7",
      eligibility: "In Class 6 or 7 at any board. No entrance test.",
      syllabus: [
        { title: "Maths", body: "Numbers and fractions done properly, ratio, the first algebra, geometry with a compass and ruler, data handling.", hi: { title: "मैथ्स", body: "संख्याएँ और भिन्न ठीक से, अनुपात, शुरुआती बीजगणित, परकार और पैमाने से ज्यामिति, आँकड़ों का प्रबंधन।" } },
        { title: "Science", body: "Materials, living things, motion and measurement, light, electricity, taught with things on the table.", hi: { title: "साइंस", body: "पदार्थ, सजीव, गति और मापन, प्रकाश, बिजली, मेज़ पर रखी चीज़ों से पढ़ाए जाते हैं।" } },
        { title: "Reasoning", body: "Puzzles, patterns and the mental maths that school skips, for half of each Saturday.", hi: { title: "रीज़निंग", body: "पहेलियाँ, पैटर्न और वह मेंटल मैथ्स जो स्कूल छोड़ देता है, हर शनिवार की आधी क्लास में।" } },
      ],
      material: ["Paper worksheets for every class","A puzzle book for the term"],
      testPlan: "A short written check at the end of each chapter. No ranks, and marks go to the parent only.",
      instalments: [
        { label: "Term 1", amount: "9,600", note: "June to August", hi: { label: "टर्म 1", note: "जून से अगस्त" } },
        { label: "Term 2", amount: "9,600", note: "September to November", hi: { label: "टर्म 2", note: "सितंबर से नवंबर" } },
        { label: "Term 3", amount: "9,600", note: "December to February", hi: { label: "टर्म 3", note: "दिसंबर से फ़रवरी" } },
      ],
      inclusions: ["All worksheets","Monthly call from the teacher","Free first class"],
      refundNote: "Fees are paid by the term. Leave with ten days' notice and the unused months of the term are refunded within ten days.",
      facultyNames: ["Meera Kulkarni","Ashwini Deshpande","Farida Shaikh"],
      faq: [
        { title: "My child is behind in school maths. Is this the right group?", body: "Often yes. The group follows the school chapters, and the first weeks close the gaps before going deeper. The teacher tells you honestly after the first class.", hi: { title: "बच्चा स्कूल के मैथ्स में पीछे है। क्या यह ग्रुप ठीक रहेगा?", body: "अक्सर हाँ। ग्रुप स्कूल के चैप्टर के साथ चलता है, और गहराई में जाने से पहले शुरू के हफ़्ते कमियाँ भरते हैं। पहली क्लास के बाद टीचर आपको सच बता देते हैं।" } },
      ],
      hi: { category: "कक्षा 6 और 7", name: "कक्षा 6 और 7 फ़ाउंडेशन, गणित और विज्ञान", detail: "हर क्लास उस हफ़्ते के स्कूल अध्याय से शुरू होकर एक क़दम आगे जाती है। होमवर्क चालीस मिनट का, और ज़्यादा लगे तो बताइए।", feeNote: "प्रति माह, टर्म के हिसाब से", level: "क्लास 6 से 7", subjects: "मैथ्स और साइंस, रीज़निंग पहेलियों के साथ", duration: "जून से मार्च", timings: "बुधवार शाम 5 से 6:30 बजे, शनिवार सुबह 10 से 11:30 बजे", mode: "क्लासरूम", batchStarts: "10 अक्टूबर 2026 से नया ग्रुप", eligibility: "किसी भी बोर्ड में क्लास 6 या 7। कोई एंट्रेंस टेस्ट नहीं।", testPlan: "हर चैप्टर के अंत में एक छोटी लिखित जाँच। कोई रैंक नहीं, और अंक सिर्फ़ अभिभावक को जाते हैं।", refundNote: "फीस टर्म के हिसाब से दी जाती है। दस दिन पहले बताकर छोड़ें तो टर्म के बचे महीनों की फीस दस दिन के अंदर लौटा दी जाती है।" },
    },
    {
      name: "Class 8 Foundation, maths and science",
      level: "Class 8",
      subjects: "Maths, physics, chemistry and biology",
      duration: "June to March",
      timings: "Tue and Fri, 5:00 to 6:30 pm",
      mode: "Classroom",
      batchStarts: "Join by 31 October",
      seats: "15 per group",
      fee: "3,600",
      feeNote: "a month, paid by the term",
      detail: "Class 8 is where algebra and chemistry stop being arithmetic. The group spends its first month closing the gaps left from Class 6 and 7 before moving on.",
      slug: "class-8",
      category: "Class 8",
      eligibility: "In Class 8 at any board.",
      syllabus: [
        { title: "Maths", body: "Algebraic expressions, linear equations, squares and cubes, mensuration, the first proofs.", hi: { title: "मैथ्स", body: "बीजीय व्यंजक, रैखिक समीकरण, वर्ग और घन, क्षेत्रमिति, पहली उपपत्तियाँ।" } },
        { title: "Physics", body: "Force, pressure, friction, sound, light, taught from experiments on the desk.", hi: { title: "फिज़िक्स", body: "बल, दाब, घर्षण, ध्वनि, प्रकाश, डेस्क पर किए प्रयोगों से पढ़ाए जाते हैं।" } },
        { title: "Chemistry", body: "Materials, combustion, chemical effects of current, the first equations.", hi: { title: "केमिस्ट्री", body: "पदार्थ, दहन, विद्युत धारा के रासायनिक प्रभाव, पहले समीकरण।" } },
        { title: "Biology", body: "Cells, micro-organisms, reproduction, adolescence.", hi: { title: "बायोलॉजी", body: "कोशिका, सूक्ष्मजीव, जनन, किशोरावस्था।" } },
      ],
      material: ["Paper worksheets","A gap-closing booklet for the first month"],
      testPlan: "A written check at the end of each chapter and a term paper before each school exam.",
      instalments: [
        { label: "Term 1", amount: "10,800", note: "June to August", hi: { label: "टर्म 1", note: "जून से अगस्त" } },
        { label: "Term 2", amount: "10,800", note: "September to November", hi: { label: "टर्म 2", note: "सितंबर से नवंबर" } },
        { label: "Term 3", amount: "10,800", note: "December to February", hi: { label: "टर्म 3", note: "दिसंबर से फ़रवरी" } },
      ],
      inclusions: ["All worksheets","Monthly call from the teacher"],
      refundNote: "Fees are paid by the term. Leave with ten days' notice and the unused months of the term are refunded within ten days.",
      facultyNames: ["Meera Kulkarni","Siddharth Joshi","Ashwini Deshpande"],
      hi: { category: "कक्षा 8", name: "कक्षा 8 फ़ाउंडेशन, गणित और विज्ञान", detail: "कक्षा 8 में बीजगणित और केमिस्ट्री अंकगणित नहीं रहते। पहला महीना कक्षा 6 और 7 की कमियाँ भरने में जाता है।", feeNote: "प्रति माह, टर्म के हिसाब से", level: "क्लास 8", subjects: "मैथ्स, फिज़िक्स, केमिस्ट्री और बायोलॉजी", duration: "जून से मार्च", timings: "मंगलवार और शुक्रवार, शाम 5 से 6:30 बजे", mode: "क्लासरूम", batchStarts: "31 अक्टूबर तक एडमिशन", eligibility: "किसी भी बोर्ड में क्लास 8।", testPlan: "हर चैप्टर के अंत में लिखित जाँच, और स्कूल की हर परीक्षा से पहले एक टर्म पेपर।", refundNote: "फीस टर्म के हिसाब से दी जाती है। दस दिन पहले बताकर छोड़ें तो टर्म के बचे महीनों की फीस दस दिन के अंदर लौटा दी जाती है।" },
    },
    {
      name: "Class 9 and 10 Foundation, maths and science",
      level: "Class 9 to 10",
      subjects: "Maths, physics, chemistry and biology, to the board syllabus",
      duration: "June to the board exam",
      timings: "Mon, Wed, Fri, 5:30 to 7:00 pm",
      mode: "Classroom",
      batchStarts: "Class 9 from 7 June 2027",
      seats: "15 per group",
      fee: "4,400",
      feeNote: "a month, paid by the term",
      detail: "CBSE, ICSE and State Board students sit together, and worked examples are set in each board's pattern where the papers differ. Class 10 moves on to past board papers from December.",
      slug: "class-9-10",
      category: "Class 9 and 10",
      eligibility: "In Class 9 or 10 at CBSE, ICSE or State Board.",
      syllabus: [
        { title: "Maths", body: "The board syllabus in full: number systems to statistics and probability, with each board's pattern where papers differ.", hi: { title: "मैथ्स", body: "बोर्ड का पूरा सिलेबस: संख्या पद्धति से सांख्यिकी और प्रायिकता तक, और जहाँ पेपर अलग हैं वहाँ हर बोर्ड का पैटर्न।" } },
        { title: "Science", body: "Physics, chemistry and biology to the board syllabus, with the practical questions each board asks.", hi: { title: "साइंस", body: "बोर्ड के सिलेबस तक फिज़िक्स, केमिस्ट्री और बायोलॉजी, हर बोर्ड के प्रैक्टिकल वाले सवालों के साथ।" } },
        { title: "Board papers", body: "From December of Class 10, one past paper a week under exam timing.", hi: { title: "बोर्ड पेपर", body: "क्लास 10 की दिसंबर से, परीक्षा के समय में हर हफ़्ते एक पुराना पेपर।" } },
      ],
      material: ["Chapter notes","Past board papers for CBSE, ICSE and State Board"],
      testPlan: "A chapter test after each chapter, a term paper before each school exam, and from December a past board paper every week.",
      instalments: [
        { label: "Term 1", amount: "13,200", note: "June to August", hi: { label: "टर्म 1", note: "जून से अगस्त" } },
        { label: "Term 2", amount: "13,200", note: "September to November", hi: { label: "टर्म 2", note: "सितंबर से नवंबर" } },
        { label: "Term 3", amount: "13,200", note: "December to February", hi: { label: "टर्म 3", note: "दिसंबर से फ़रवरी" } },
      ],
      inclusions: ["Chapter notes","Every test and past paper","Monthly call from the teacher"],
      refundNote: "Fees are paid by the term. Leave with ten days' notice and the unused months of the term are refunded within ten days.",
      facultyNames: ["Rohan Gokhale","Siddharth Joshi","Ashwini Deshpande"],
      faq: [
        { title: "Is this preparation for JEE or NEET?", body: "No. It is maths and science to the board, done well. The habits carry forward, but we do not sell Class 9 as entrance coaching.", hi: { title: "क्या यह JEE या NEET की तैयारी है?", body: "नहीं। यह बोर्ड तक मैथ्स और साइंस है, अच्छे से। आदतें आगे काम आती हैं, पर हम क्लास 9 को एंट्रेंस कोचिंग बताकर नहीं बेचते।" } },
      ],
      hi: { category: "कक्षा 9 और 10", name: "कक्षा 9 और 10 फ़ाउंडेशन, गणित और विज्ञान", detail: "CBSE, ICSE और स्टेट बोर्ड के विद्यार्थी साथ बैठते हैं। कक्षा 10 दिसंबर से पिछले बोर्ड पेपर करती है।", feeNote: "प्रति माह, टर्म के हिसाब से", level: "क्लास 9 से 10", subjects: "मैथ्स, फिज़िक्स, केमिस्ट्री और बायोलॉजी, बोर्ड के सिलेबस तक", duration: "जून से बोर्ड परीक्षा तक", timings: "सोमवार, बुधवार, शुक्रवार, शाम 5:30 से 7 बजे", mode: "क्लासरूम", batchStarts: "क्लास 9: 7 जून 2027 से", eligibility: "CBSE, ICSE या स्टेट बोर्ड में क्लास 9 या 10।", testPlan: "हर चैप्टर के बाद चैप्टर टेस्ट, स्कूल की हर परीक्षा से पहले टर्म पेपर, और दिसंबर से हर हफ़्ते एक पुराना बोर्ड पेपर।", refundNote: "फीस टर्म के हिसाब से दी जाती है। दस दिन पहले बताकर छोड़ें तो टर्म के बचे महीनों की फीस दस दिन के अंदर लौटा दी जाती है।" },
    },
    {
      name: "Olympiad group, Class 6 to 8",
      level: "Class 6 to 8",
      subjects: "Maths and science olympiads, logical reasoning",
      duration: "July to February",
      timings: "Sun, 10:00 am to 12:00 noon",
      mode: "Classroom",
      batchStarts: "Join any Sunday",
      seats: "15 per group",
      detail: "₹1,500 a month on top of a Foundation group, or ₹2,200 a month on its own. Practice papers in the IMO and NSO pattern. The olympiad forms themselves go through your child's school.",
      slug: "olympiad-6-8",
      category: "Olympiad",
      eligibility: "In Class 6 to 8. A Foundation group is not required.",
      syllabus: [
        { title: "Maths olympiad", body: "Number sense, patterns, geometry and logical reasoning in the IMO pattern.", hi: { title: "मैथ्स ओलंपियाड", body: "संख्या की समझ, पैटर्न, ज्यामिति और लॉजिकल रीज़निंग, IMO के पैटर्न में।" } },
        { title: "Science olympiad", body: "Concept questions beyond the school book, in the NSO pattern.", hi: { title: "साइंस ओलंपियाड", body: "स्कूल की किताब से आगे के कॉन्सेप्ट वाले सवाल, NSO के पैटर्न में।" } },
      ],
      material: ["Past papers in each olympiad's pattern","A reasoning workbook"],
      testPlan: "A timed practice paper every Sunday, marked the same day.",
      inclusions: ["Sunday practice papers","Marked papers returned the same day"],
      refundNote: "Fees are paid by the term. Leave with ten days' notice and the unused months of the term are refunded within ten days.",
      facultyNames: ["Rohan Gokhale"],
      hi: { category: "ओलंपियाड", name: "ओलंपियाड ग्रुप, कक्षा 6 से 8", detail: "फ़ाउंडेशन ग्रुप के साथ ₹1,500 प्रति माह, या अकेले ₹2,200। IMO और NSO पैटर्न के प्रैक्टिस पेपर। ओलंपियाड के फ़ॉर्म बच्चे के स्कूल से भरे जाते हैं।", level: "क्लास 6 से 8", subjects: "मैथ्स और साइंस ओलंपियाड, लॉजिकल रीज़निंग", duration: "जुलाई से फ़रवरी", timings: "रविवार, सुबह 10 से दोपहर 12 बजे", mode: "क्लासरूम", batchStarts: "किसी भी रविवार से जुड़ें", eligibility: "क्लास 6 से 8 में। फ़ाउंडेशन ग्रुप में होना ज़रूरी नहीं।", testPlan: "हर रविवार समय बाँधकर एक अभ्यास पेपर, उसी दिन जाँचा हुआ।", refundNote: "फीस टर्म के हिसाब से दी जाती है। दस दिन पहले बताकर छोड़ें तो टर्म के बचे महीनों की फीस दस दिन के अंदर लौटा दी जाती है।" },
    },
    {
      name: "Olympiad group, Class 9 and 10",
      level: "Class 9 to 10",
      subjects: "Olympiad maths and junior science",
      duration: "July to January",
      timings: "Sun, 1:00 to 3:00 pm",
      mode: "Classroom",
      batchStarts: "Join any Sunday",
      seats: "15 per group",
      detail: "For IOQM and NSEJS. ₹1,800 a month on top of a Foundation group. A past paper every other Sunday under exam timing, taken apart question by question the Sunday after.",
      slug: "olympiad-9-10",
      category: "Olympiad",
      eligibility: "In Class 9 or 10, comfortable with the school syllabus in maths and science.",
      syllabus: [
        { title: "IOQM", body: "Number theory, combinatorics, algebra and geometry, in the IOQM pattern.", hi: { title: "IOQM", body: "संख्या सिद्धांत, कॉम्बिनेटोरिक्स, बीजगणित और ज्यामिति, IOQM के पैटर्न में।" } },
        { title: "NSEJS", body: "Physics, chemistry, biology and maths at the NSEJS level.", hi: { title: "NSEJS", body: "NSEJS के लेवल पर फिज़िक्स, केमिस्ट्री, बायोलॉजी और मैथ्स।" } },
      ],
      material: ["IOQM and NSEJS past papers","Problem sets by topic"],
      testPlan: "A past paper every other Sunday under exam timing, discussed the Sunday after.",
      inclusions: ["Past papers","Discussion of every paper"],
      refundNote: "Fees are paid by the term. Leave with ten days' notice and the unused months of the term are refunded within ten days.",
      facultyNames: ["Rohan Gokhale","Siddharth Joshi"],
      hi: { category: "ओलंपियाड", name: "ओलंपियाड ग्रुप, कक्षा 9 और 10", detail: "IOQM और NSEJS के लिए। फ़ाउंडेशन ग्रुप के साथ ₹1,800 प्रति माह। हर दूसरे रविवार परीक्षा के समय में एक पिछला पेपर।", level: "क्लास 9 से 10", subjects: "ओलंपियाड मैथ्स और जूनियर साइंस", duration: "जुलाई से जनवरी", timings: "रविवार, दोपहर 1 से 3 बजे", mode: "क्लासरूम", batchStarts: "किसी भी रविवार से जुड़ें", eligibility: "क्लास 9 या 10 में, मैथ्स और साइंस के स्कूल सिलेबस में सहज।", testPlan: "हर दूसरे रविवार परीक्षा के समय में एक पुराना पेपर, अगले रविवार उस पर चर्चा।", refundNote: "फीस टर्म के हिसाब से दी जाती है। दस दिन पहले बताकर छोड़ें तो टर्म के बचे महीनों की फीस दस दिन के अंदर लौटा दी जाती है।" },
    },
  ],

  /* ── CLEARED: results. A foundation parent reads school marks and an
        olympiad rank, not an entrance rank. No child is named. ────────── */
  resultsHeading: "Last year, in marks a parent recognises",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a foundation centre's results are set out. Yours replace them line for line, and no child's name or photograph is printed without a parent's written consent.",
  results: [
    { achievement: "Zone rank 38", exam: "IMO, Class 7", year: "2025-26", note: "Olympiad group, Class 6 to 8", category: "Olympiad", courseName: "Olympiad group, Class 6 to 8", courseDuration: "Eight months", paid: "paid", hi: { achievement: "ज़ोन रैंक 38", note: "ओलंपियाड ग्रुप, क्लास 6 से 8", courseName: "ओलंपियाड ग्रुप, क्लास 6 से 8" } },
    { achievement: "Selected for INJSO", exam: "NSEJS, Class 10", year: "2025-26", note: "Olympiad group, Class 9 and 10", category: "Olympiad", courseName: "Olympiad group, Class 9 and 10", courseDuration: "Two years", paid: "paid", hi: { achievement: "INJSO के लिए चयन", note: "ओलंपियाड ग्रुप, क्लास 9 और 10", courseName: "ओलंपियाड ग्रुप, क्लास 9 और 10" } },
    { achievement: "Gold medal, school level", exam: "NSO, Class 6", year: "2025-26", note: "Olympiad group, Class 6 to 8", category: "Olympiad", courseName: "Olympiad group, Class 6 to 8", courseDuration: "Eight months", paid: "paid", hi: { achievement: "स्कूल लेवल पर गोल्ड मेडल", note: "ओलंपियाड ग्रुप, क्लास 6 से 8", courseName: "ओलंपियाड ग्रुप, क्लास 6 से 8" } },
    { achievement: "97 of 100 in maths", exam: "ICSE Class 10", year: "2026", note: "Class 9 and 10 group", category: "Board", courseName: "Class 9 and 10 Foundation", courseDuration: "Two years", paid: "paid", hi: { achievement: "मैथ्स में 100 में से 97", note: "क्लास 9 और 10 का ग्रुप", courseName: "क्लास 9 और 10 फ़ाउंडेशन" } },
    { achievement: "11 of 13 scored 90 or more in science", exam: "CBSE Class 10", year: "2026", note: "Class 9 and 10 group, CBSE students", category: "Board", courseName: "Class 9 and 10 Foundation", courseDuration: "One to two years", paid: "paid", hi: { achievement: "13 में से 11 के साइंस में 90 या ज़्यादा", note: "क्लास 9 और 10 का ग्रुप, CBSE के स्टूडेंट", courseName: "क्लास 9 और 10 फ़ाउंडेशन" } },
    { achievement: "Up 14 marks in maths, on average", exam: "School half-yearly to annual, Class 6 to 8", year: "2025-26", note: "Children who joined in the middle of the year", category: "School marks", courseName: "Class 6 to 8 Foundation", courseDuration: "Four to six months", paid: "paid", hi: { achievement: "मैथ्स में औसतन 14 अंक की बढ़त", note: "साल के बीच में जुड़े बच्चे", courseName: "क्लास 6 से 8 फ़ाउंडेशन" } },
    { achievement: "Zone rank 61", exam: "IMO, Class 8", year: "2024-25", note: "Olympiad group, Class 6 to 8", category: "Olympiad", courseName: "Olympiad group, Class 6 to 8", courseDuration: "Eight months", paid: "scholarship", hi: { achievement: "ज़ोन रैंक 61", note: "ओलंपियाड ग्रुप, क्लास 6 से 8", courseName: "ओलंपियाड ग्रुप, क्लास 6 से 8" } },
    { achievement: "96 of 100 in science", exam: "State Board Class 10", year: "2025", note: "Class 9 and 10 group", category: "Board", courseName: "Class 9 and 10 Foundation", courseDuration: "Two years", paid: "paid", hi: { achievement: "साइंस में 100 में से 96", note: "क्लास 9 और 10 का ग्रुप", courseName: "क्लास 9 और 10 फ़ाउंडेशन" } },
  ],

  /* ── CLEARED: faculty ────────────────────────────────────────────────── */
  faculty: [
    { name: "Meera Kulkarni", photo: "/demo/img/people/teacher-w11-240.webp", subject: "Maths, Class 6 to 8", qualification: "M.Sc. Mathematics, B.Ed.", experience: "14 years, eight of them in a CBSE school. Started Tangram in 2016.", role: "Founder", group: "Maths", batches: "Class 6 and 7, Class 8", style: "Lets a child get it wrong on paper first, then asks them to explain the wrong answer.", hi: { subject: "गणित, कक्षा 6 से 8", experience: "14 साल, जिनमें आठ साल CBSE स्कूल में। 2016 में Tangram शुरू किया।", role: "संस्थापक", style: "बच्चे को पहले काग़ज़ पर ग़लती करने देती हैं, फिर ग़लत उत्तर समझाने को कहती हैं।", qualification: "M.Sc. मैथ्स, B.Ed.", group: "मैथ्स" } },
    { name: "Siddharth Joshi", photo: "/demo/img/people/teacher-m11-240.webp", subject: "Physics and chemistry", qualification: "M.Sc. Physics", experience: "10 years. Takes science for Class 8 to 10.", group: "Science", batches: "Class 8, Class 9 and 10", style: "Every idea starts with something on the desk: a magnet, a lens, a battery.", hi: { subject: "भौतिकी और रसायन", experience: "10 साल। कक्षा 8 से 10 विज्ञान।", style: "हर बात मेज़ पर रखी किसी चीज़ से शुरू: चुंबक, लेंस, बैटरी।", qualification: "M.Sc. फिज़िक्स", group: "साइंस" } },
    { name: "Ashwini Deshpande", photo: "/demo/img/people/teacher-w06-240.webp", subject: "Biology, and Class 6 and 7 science", qualification: "M.Sc. Microbiology, B.Ed.", experience: "11 years. Takes every group's biology.", group: "Science", batches: "Every group's biology", style: "Drawing before memorising. A diagram labelled from memory is the only test.", hi: { subject: "जीव विज्ञान, और कक्षा 6 और 7 विज्ञान", experience: "11 साल। हर ग्रुप की बायोलॉजी।", style: "रटने से पहले चित्र। याद से लेबल वाला डायग्राम ही असली टेस्ट है।", qualification: "M.Sc. माइक्रोबायोलॉजी, B.Ed.", group: "साइंस" } },
    { name: "Rohan Gokhale", photo: "/demo/img/people/teacher-m01-240.webp", subject: "Maths, Class 9 and 10, and the olympiads", qualification: "M.Sc. Mathematics", experience: "8 years. Takes both Sunday Olympiad groups.", group: "Maths", batches: "Class 9 and 10, both Olympiad groups", style: "One hard problem, forty minutes, no hints for the first twenty.", hi: { subject: "गणित, कक्षा 9 और 10, और ओलंपियाड", experience: "8 साल। रविवार के दोनों ओलंपियाड ग्रुप।", style: "एक कठिन सवाल, चालीस मिनट, पहले बीस मिनट कोई हिंट नहीं।", qualification: "M.Sc. मैथ्स", group: "मैथ्स" } },
    { name: "Farida Shaikh", photo: "/demo/img/people/teacher-w01-240.webp", subject: "Reasoning", qualification: "B.Sc., B.Ed.", experience: "6 years. Takes the reasoning half of the Class 6 and 7 Saturday class.", group: "Reasoning", batches: "Class 6 and 7, Saturday", style: "Puzzles in pairs, and the pair has to agree before they answer.", hi: { subject: "तर्कशक्ति", experience: "6 साल। कक्षा 6 और 7 की शनिवार क्लास का रीज़निंग हिस्सा।", style: "जोड़ी में पहेलियाँ, और उत्तर से पहले जोड़ी को सहमत होना होता है।", qualification: "B.Sc., B.Ed.", group: "रीज़निंग" } },
  ],

  /* ── CLEARED: why parents choose us. Three worries a parent of a younger
        child actually has, each answered with a practice. ─────────────── */
  method: [
    {
      title: "Homework that ends in forty minutes",
      body: "We set work a Class 6 child can finish in forty minutes, and ask you to tell us when it takes longer. In the week of a school exam there is no tuition homework at all.",
      hi: {
        title: "चालीस मिनट में ख़त्म होने वाला होमवर्क",
        body: "हम उतना काम देते हैं जितना क्लास 6 का बच्चा चालीस मिनट में कर ले, और ज़्यादा समय लगे तो आपसे बताने को कहते हैं। स्कूल की परीक्षा वाले हफ़्ते में ट्यूशन का कोई होमवर्क नहीं होता।",
      },
    },
    {
      title: "Nothing on a screen",
      body: "Every worksheet is on paper and every test is written by hand. There is no app to install and no video lesson to watch at home, so tuition never becomes one more reason to be on the phone.",
      hi: {
        title: "स्क्रीन पर कुछ नहीं",
        body: "हर वर्कशीट काग़ज़ पर है और हर टेस्ट हाथ से लिखा जाता है। न कोई ऐप इंस्टॉल करना, न घर पर कोई वीडियो लेसन, ताकि ट्यूशन फ़ोन पर रहने का एक और बहाना न बने।",
      },
    },
    {
      title: "You hear from the teacher every month, not only when marks drop",
      body: "A ten-minute call from your child's teacher in the first week of each month: what was covered, what is shaky, and what, if anything, to do at home. If a child is unhappy in the group, you hear it from us first.",
      hi: {
        title: "टीचर की बात हर महीने, सिर्फ़ अंक गिरने पर नहीं",
        body: "हर महीने के पहले हफ़्ते में बच्चे के टीचर का दस मिनट का फ़ोन: क्या पढ़ाया गया, क्या कच्चा है, और घर पर क्या करना है, अगर कुछ हो। बच्चा ग्रुप में ख़ुश नहीं है तो यह आपको पहले हमसे पता चलेगा।",
      },
    },
  ],

  /* ── STRUCTURE: the week. Label, days, time and subject are KEPT;
        faculty and room are CLEARED. ─────────────────────────────────── */
  scheduleNote:
    "The youngest groups meet on Wednesday and Saturday, so a school day is never followed by a long evening. No group meets on the day of a school exam; tell us the date and the class moves.",
  schedule: [
    { label: "Class 6 and 7", days: "Wednesday", time: "5:00 to 6:30 pm", subject: "Maths", faculty: "Meera Kulkarni", room: "Room A", hi: { label: "कक्षा 6 और 7", days: "बुधवार", time: "शाम 5 से 6:30", subject: "गणित" } },
    { label: "Class 6 and 7", days: "Saturday", time: "10:00 to 11:30 am", subject: "Science and reasoning", faculty: "Ashwini Deshpande and Farida Shaikh", room: "Room A", hi: { label: "कक्षा 6 और 7", days: "शनिवार", time: "सुबह 10 से 11:30", subject: "विज्ञान और रीज़निंग" } },
    { label: "Class 8", days: "Tuesday", time: "5:00 to 6:30 pm", subject: "Maths", faculty: "Meera Kulkarni", room: "Room A", hi: { label: "कक्षा 8", days: "मंगलवार", time: "शाम 5 से 6:30", subject: "गणित" } },
    { label: "Class 8", days: "Friday", time: "5:00 to 6:30 pm", subject: "Physics, chemistry and biology, in turn", faculty: "Siddharth Joshi and Ashwini Deshpande", room: "Room A", hi: { label: "कक्षा 8", days: "शुक्रवार", subject: "भौतिकी, रसायन और जीव विज्ञान, बारी-बारी से", time: "शाम 5 से 6:30" } },
    { label: "Class 9 and 10", days: "Monday and Friday", time: "5:30 to 7:00 pm", subject: "Maths", faculty: "Rohan Gokhale", room: "Room B", hi: { label: "कक्षा 9 और 10", days: "सोमवार और शुक्रवार", time: "शाम 5:30 से 7 बजे", subject: "गणित" } },
    { label: "Class 9 and 10", days: "Wednesday", time: "5:30 to 7:00 pm", subject: "Physics, chemistry and biology, in turn", faculty: "Siddharth Joshi", room: "Room B", hi: { label: "कक्षा 9 और 10", days: "बुधवार", time: "शाम 5:30 से 7 बजे", subject: "भौतिकी, रसायन और जीव विज्ञान, बारी-बारी से" } },
    { label: "Olympiad, Class 6 to 8", days: "Sunday", time: "10:00 am to 12:00 noon", subject: "IMO and NSO pattern papers", faculty: "Rohan Gokhale", room: "Room A", hi: { label: "ओलंपियाड, कक्षा 6 से 8", days: "रविवार", time: "सुबह 10 से दोपहर 12 बजे", subject: "IMO और NSO पैटर्न के पेपर" } },
    { label: "Olympiad, Class 9 and 10", days: "Sunday", time: "1:00 to 3:00 pm", subject: "IOQM and NSEJS papers", faculty: "Rohan Gokhale", room: "Room A", hi: { label: "ओलंपियाड, कक्षा 9 और 10", days: "रविवार", time: "दोपहर 1 से 3 बजे", subject: "IOQM और NSEJS के पेपर" } },
  ],

  /* ── CLEARED: the free first class. First on this theme, because a parent
        here is deciding whether to try, not whether to enrol. ─────────── */
  trial: {
    heading: "A free first class, and ten honest minutes after it",
    body: "Your child joins an ordinary class in the group they would join. There is no test to get in. Afterwards the teacher spends ten minutes with you: what your child found easy, where they stopped, and whether this group is right. If we are not the answer, we say so, and tell you what might be.",
    duration: "One class of 90 minutes, then ten minutes with you",
    bring: "A pencil, an eraser and the school maths notebook. Nothing to revise the night before.",
    howToBook: "Call or send a WhatsApp message with your child's class and school. We reply the same day with a Wednesday or Saturday slot.",
    hi: {
      heading: "मुफ़्त पहली क्लास, और उसके बाद दस ईमानदार मिनट",
      duration: "90 मिनट की एक क्लास, फिर दस मिनट आपके साथ",
      bring: "पेंसिल, रबर और स्कूल की गणित की कॉपी। पिछली रात कुछ दोहराना नहीं है।",
      howToBook: "बच्चे की कक्षा और स्कूल के साथ कॉल या WhatsApp कीजिए। उसी दिन बुधवार या शनिवार का स्लॉट बताएँगे।",
      body: "बच्चा उसी ग्रुप की एक आम क्लास में बैठता है जिसमें वह आएगा। आने के लिए कोई टेस्ट नहीं। बाद में टीचर दस मिनट आपके साथ बैठते हैं: बच्चे को क्या आसान लगा, कहाँ रुका, और यह ग्रुप ठीक है या नहीं। अगर हम सही जगह नहीं हैं, तो हम साफ़ कहते हैं, और बताते हैं कि क्या ठीक रहेगा।",
    },
  },

  /* ── STRUCTURE: FAQ. Two are generic: true of any foundation centre and
        naming no fee, date, count, person or place. ──────────────────── */
  faq: [
    {
      title: "What does it cost?",
      body: "Class 6 and 7: ₹3,200 a month. Class 8: ₹3,600. Class 9 and 10: ₹4,400. The Sunday Olympiad group is ₹1,500 a month on top of a Foundation group (₹1,800 for Class 9 and 10), or ₹2,200 on its own. Fees are paid by the term, and there is no registration or material fee. These are example figures and yours replace them.",
      group: "Fees",
      hi: {
        title: "फीस कितनी है?",
        body: "क्लास 6 और 7: ₹3,200 महीना। क्लास 8: ₹3,600। क्लास 9 और 10: ₹4,400। रविवार का ओलंपियाड ग्रुप फ़ाउंडेशन ग्रुप के ऊपर ₹1,500 महीना है (क्लास 9 और 10 के लिए ₹1,800), या अकेले ₹2,200। फीस टर्म के हिसाब से दी जाती है, और कोई रजिस्ट्रेशन या मटीरियल फीस नहीं। ये उदाहरण के आँकड़े हैं, आपके अपने आँकड़े इनकी जगह आएँगे।",
        group: "फीस",
      },
    },
    {
      title: "How much homework will my child get?",
      body: "About forty minutes after each class, on paper. None in the week of a school exam. If it is regularly taking longer, tell us and we cut it, because a tired eleven-year-old learns nothing at ten at night.",
      group: "Classes",
      hi: {
        title: "बच्चे को कितना होमवर्क मिलेगा?",
        body: "हर क्लास के बाद लगभग चालीस मिनट का, काग़ज़ पर। स्कूल की परीक्षा वाले हफ़्ते में बिलकुल नहीं। अगर लगातार ज़्यादा समय लग रहा है तो बताइए, हम कम कर देंगे, क्योंकि रात दस बजे थका हुआ ग्यारह साल का बच्चा कुछ नहीं सीखता।",
        group: "क्लास",
      },
    },
    {
      title: "What is the difference between foundation classes and ordinary tuition?",
      body: "Ordinary tuition goes over the chapter your child did in school that day. A foundation class follows the same chapters but goes further into why each method works, so the harder problems of later classes and of the olympiads are not a shock when they arrive.",
      group: "Classes",
      generic: true,
      hi: {
        title: "फ़ाउंडेशन क्लास और आम ट्यूशन में क्या फ़र्क है?",
        body: "आम ट्यूशन वही चैप्टर दोहराती है जो बच्चे ने उस दिन स्कूल में पढ़ा। फ़ाउंडेशन क्लास उन्हीं चैप्टर के साथ चलती है, पर यह भी समझाती है कि हर तरीक़ा काम क्यों करता है, ताकि आगे की क्लास और ओलंपियाड के कठिन सवाल आने पर झटका न लगे।",
        group: "क्लास",
      },
    },
    {
      title: "Is Class 6 too early?",
      body: "Not for this. At Class 6 it is not exam coaching: the class follows the school's chapters, goes a step deeper, and ends on time. If a Class 6 child is unhappy after a month, we will tell you before you have to tell us.",
      group: "Classes",
      hi: {
        title: "क्या क्लास 6 बहुत जल्दी है?",
        body: "इसके लिए नहीं। क्लास 6 में यह परीक्षा की कोचिंग नहीं है: क्लास स्कूल के चैप्टर के साथ चलती है, एक कदम गहराई में जाती है, और समय पर ख़त्म होती है। अगर एक महीने बाद क्लास 6 का बच्चा ख़ुश नहीं है, तो आपके बताने से पहले हम बता देंगे।",
        group: "क्लास",
      },
    },
    {
      title: "Which olympiads do you prepare for?",
      body: "IMO and NSO from the Science Olympiad Foundation for Class 6 to 8, and IOQM and NSEJS for Class 9 and 10. Most olympiad registrations go through the school, so ask your child's school which ones it has signed up for.",
      group: "Olympiads",
      hi: {
        title: "आप किन ओलंपियाड की तैयारी करवाते हैं?",
        body: "क्लास 6 से 8 के लिए Science Olympiad Foundation के IMO और NSO, और क्लास 9 और 10 के लिए IOQM और NSEJS। ज़्यादातर ओलंपियाड का रजिस्ट्रेशन स्कूल से होता है, इसलिए बच्चे के स्कूल से पूछिए कि उसने किनके लिए नाम भेजे हैं।",
        group: "ओलंपियाड",
      },
    },
    {
      title: "Do you prepare for NTSE?",
      body: "NCERT put NTSE on hold in 2022 and has not announced its return. The mental ability and science questions it used to ask are already practised in the Olympiad groups, and if NCERT brings the exam back we will add its paper pattern to the Sunday tests that same month.",
      group: "Olympiads",
      hi: {
        title: "क्या आप NTSE की तैयारी करवाते हैं?",
        body: "NCERT ने 2022 में NTSE रोक दी थी और उसकी वापसी की घोषणा नहीं की है। उसमें आने वाले मानसिक योग्यता और साइंस के सवालों का अभ्यास ओलंपियाड ग्रुप में पहले से होता है, और अगर NCERT परीक्षा वापस लाता है तो हम उसी महीने उसका पैटर्न रविवार के टेस्ट में जोड़ देंगे।",
        group: "ओलंपियाड",
      },
    },
    {
      title: "Is this a coaching institute, and is it government approved?",
      body: "It is an after-school class in maths and science, with olympiad practice on Sundays, taken alongside school and never in place of it. It is not approved or recognised by any government authority, and we do not claim otherwise. Classes end by 7:00 pm on a school day and never meet during school hours.",
      group: "About us",
      hi: {
        title: "क्या यह कोचिंग इंस्टीट्यूट है, और क्या यह सरकार से मान्यता प्राप्त है?",
        body: "यह स्कूल के बाद की मैथ्स और साइंस की क्लास है, रविवार को ओलंपियाड के अभ्यास के साथ, जो स्कूल के साथ ली जाती है, उसकी जगह कभी नहीं। यह किसी सरकारी संस्था से मान्यता प्राप्त नहीं है, और हम ऐसा दावा नहीं करते। स्कूल वाले दिन क्लास शाम 7 बजे तक ख़त्म हो जाती है और स्कूल के समय में कभी नहीं होती।",
        group: "हमारे बारे में",
      },
    },
    {
      title: "Will my child need a phone, a tablet or an app?",
      body: "No. Worksheets, tests and notes are all on paper, and the monthly report comes as a phone call. The only message we send is the fee receipt on WhatsApp.",
      group: "Classes",
      hi: {
        title: "क्या बच्चे को फ़ोन, टैबलेट या ऐप चाहिए?",
        body: "नहीं। वर्कशीट, टेस्ट और नोट्स सब काग़ज़ पर हैं, और महीने की रिपोर्ट फ़ोन कॉल से आती है। हम जो एकमात्र मैसेज भेजते हैं, वह WhatsApp पर फीस की रसीद है।",
        group: "क्लास",
      },
    },
    {
      title: "What should my child bring to the first class?",
      body: "A pencil, an eraser, a ruler and the school maths notebook. Nothing needs to be prepared or revised beforehand.",
      group: "First class",
      generic: true,
      hi: {
        title: "पहली क्लास में बच्चा क्या लेकर आए?",
        body: "एक पेंसिल, रबर, स्केल और स्कूल की मैथ्स की कॉपी। पहले से कुछ तैयार या दोहराने की ज़रूरत नहीं।",
        group: "पहली क्लास",
      },
    },
  ],

  /* ── CLEARED: notices ────────────────────────────────────────────────── */
  notices: [
    {
      title: "New Class 6 and 7 group from Saturday 10 October",
      date: "23 September 2026",
      body: "Twelve places. The first class is free and there is no test to join.",
      kind: "notice",
      posted: "2026-09-23",
      expires: "2026-10-10",
      pinned: true,
      hi: {
        title: "शनिवार 10 अक्टूबर से क्लास 6 और 7 का नया ग्रुप",
        date: "23 सितंबर 2026",
        body: "बारह सीटें। पहली क्लास मुफ़्त है और जुड़ने के लिए कोई टेस्ट नहीं।",
      },
    },
    {
      title: "Term 2 fees due by 10 October",
      date: "18 September 2026",
      body: "Paid at the desk or by UPI. The receipt comes on WhatsApp the same day.",
      kind: "notice",
      posted: "2026-09-18",
      expires: "2026-10-10",
      hi: {
        title: "टर्म 2 की फीस 10 अक्टूबर तक",
        date: "18 सितंबर 2026",
        body: "डेस्क पर या UPI से। रसीद उसी दिन WhatsApp पर आती है।",
      },
    },
    {
      title: "Diwali: no classes from 7 to 11 November",
      date: "14 September 2026",
      body: "Groups meet as usual from Friday 13 November. The Sunday Olympiad groups skip one week only.",
      kind: "notice",
      posted: "2026-09-14",
      expires: "2026-11-13",
      hi: {
        title: "दिवाली: 7 से 11 नवंबर तक क्लास नहीं",
        date: "14 सितंबर 2026",
        body: "शुक्रवार 13 नवंबर से ग्रुप हमेशा की तरह मिलेंगे। रविवार के ओलंपियाड ग्रुप सिर्फ़ एक हफ़्ता छोड़ेंगे।",
      },
    },
  ],

  /* ── CLEARED: parent reviews. A relation, never a name, and no rating. ── */
  reviews: [
    { quote: "She used to cry over fractions. After one term she explains them to her younger brother at dinner.", relation: "Mother of a Class 6 student, CBSE", consent: true, category: "Foundation", hi: { quote: "वह भिन्न पर रोती थी। एक टर्म के बाद खाने पर छोटे भाई को समझाती है।", relation: "कक्षा 6 की विद्यार्थी की माँ, CBSE" } },
    { quote: "The monthly call is the reason we stayed. Ten minutes, and the teacher always knows exactly what is shaky.", relation: "Father of a Class 8 student, ICSE", consent: true, category: "Foundation", hi: { quote: "हर महीने का फ़ोन ही वजह है कि हम रुके। दस मिनट, और शिक्षक को हमेशा ठीक पता होता है क्या कमज़ोर है।", relation: "कक्षा 8 के विद्यार्थी के पिता, ICSE" } },
    { quote: "No app, no videos, no screen. He comes home tired from thinking, not from a phone.", relation: "Mother of a Class 7 student, State Board", consent: true, category: "Foundation", hi: { quote: "न ऐप, न वीडियो, न स्क्रीन। वह सोचने से थककर आता है, फ़ोन से नहीं।", relation: "कक्षा 7 के विद्यार्थी की माँ, स्टेट बोर्ड" } },
    { quote: "They told us after the first class that our son was not ready for the Olympiad group yet, and why. He joined it six months later.", relation: "Parent, Olympiad group, Class 7", consent: true, category: "Olympiad", hi: { quote: "पहली क्लास के बाद ही बता दिया कि बेटा अभी ओलंपियाड ग्रुप के लिए तैयार नहीं है, और क्यों। छह महीने बाद वह उसमें आया।", relation: "अभिभावक, ओलंपियाड ग्रुप, कक्षा 7" } },
  ],

  /* ── KEPT (stock): the Gallery page. alt is empty on purpose: a stock
        photo's alt comes from the manifest, in both languages, and no
        caption names a room of the institute. */
  photos: [
    { src: "/demo/img/coaching/c4-hero-bright-class-800.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c4-two-boys-desk-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c4-attentive-class-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c2-small-group-class-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c2-rural-classroom-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c4-notebook-writing-640.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
  ],

  /* ── CLEARED: the Olympiad page. Registrations go through the school. ── */
  olympiad: {
    intro: "Olympiad practice is a Sunday group on top of the weekday classes, never a replacement for them. We prepare children for the papers; the registrations themselves go through each child's school, and we tell you which olympiads your school offers.",
    exams: [
      { title: "IMO, International Mathematics Olympiad", body: "Science Olympiad Foundation. Class 6 to 8 in our group. Two levels; the second is by invitation from the first.", group: "Class 6 to 8", hi: { title: "IMO, International Mathematics Olympiad", body: "Science Olympiad Foundation। हमारे ग्रुप में क्लास 6 से 8। दो लेवल; दूसरे लेवल का बुलावा पहले से मिलता है।", group: "क्लास 6 से 8" } },
      { title: "NSO, National Science Olympiad", body: "Science Olympiad Foundation. Class 6 to 8 in our group. Concept questions beyond the school book.", group: "Class 6 to 8", hi: { title: "NSO, National Science Olympiad", body: "Science Olympiad Foundation। हमारे ग्रुप में क्लास 6 से 8। स्कूल की किताब से आगे के कॉन्सेप्ट वाले सवाल।", group: "क्लास 6 से 8" } },
      { title: "IOQM, Indian Olympiad Qualifier in Mathematics", body: "The first stage of the mathematics olympiad pathway. Class 9 and 10 in our group.", group: "Class 9 and 10", hi: { title: "IOQM, Indian Olympiad Qualifier in Mathematics", body: "मैथ्स ओलंपियाड के रास्ते का पहला चरण। हमारे ग्रुप में क्लास 9 और 10।", group: "क्लास 9 और 10" } },
      { title: "NSEJS, National Standard Examination in Junior Science", body: "The first stage of the junior science olympiad pathway. Class 9 and 10 in our group.", group: "Class 9 and 10", hi: { title: "NSEJS, National Standard Examination in Junior Science", body: "जूनियर साइंस ओलंपियाड के रास्ते का पहला चरण। हमारे ग्रुप में क्लास 9 और 10।", group: "क्लास 9 और 10" } },
    ],
    schedule: [
      { label: "Olympiad, Class 6 to 8", days: "Sunday", time: "10:00 am to 12:00 noon", subject: "IMO and NSO pattern papers", hi: { label: "ओलंपियाड, कक्षा 6 से 8", days: "रविवार", time: "सुबह 10 से दोपहर 12 बजे", subject: "IMO और NSO पैटर्न के पेपर" } },
      { label: "Olympiad, Class 9 and 10", days: "Sunday", time: "1:00 to 3:00 pm", subject: "IOQM and NSEJS papers", hi: { label: "ओलंपियाड, कक्षा 9 और 10", days: "रविवार", time: "दोपहर 1 से 3 बजे", subject: "IOQM और NSEJS के पेपर" } },
    ],
    medals: ["IMO 2025-26: zone rank 38, Class 7", "NSO 2025-26: school gold, Class 6", "NSEJS 2025-26: selected for INJSO, Class 10"],
    hi: { intro: "ओलंपियाड की तैयारी हफ़्ते की क्लास के ऊपर रविवार का ग्रुप है, उसकी जगह नहीं। हम बच्चों को पेपर के लिए तैयार करते हैं; रजिस्ट्रेशन बच्चे के स्कूल से होता है, और हम बताते हैं कि आपका स्कूल कौन से ओलंपियाड देता है।" },
  },

  /* ── CLEARED: links. example.com on purpose. No app: fees only. ───────── */
  portalLinks: [
    { label: "Pay the term fee online", url: "https://pay.example.com", audience: "Parents", note: "UPI or card. The receipt comes on WhatsApp.", hi: { label: "टर्म की फीस ऑनलाइन भरिए", note: "UPI या कार्ड। रसीद WhatsApp पर आती है।", audience: "अभिभावक" } },
    { label: "Term calendar and holidays", url: "https://example.com/term-calendar.pdf", audience: "Parents", note: "A one-page PDF", hi: { label: "टर्म कैलेंडर और छुट्टियाँ", note: "एक पन्ने की PDF", audience: "अभिभावक" } },
  ],

  /* ── CLEARED: fees, refunds and the MoE 2024 disclosure. ─────────────── */
  feesPolicy: {
    intro: "Fees are monthly figures paid by the term, three terms a year. Every group's fee is on its own page.",
    paymentModes: ["UPI", "Card at the desk", "Bank transfer"],
    instalmentNote: "Three terms a year. A family that needs to pay monthly can ask; we have never refused.",
    refund: "Leave with ten days' notice. The unused months of the term are refunded within ten days, to the account the fee came from.",
    receipts: "A receipt on WhatsApp the same day for every payment.",
    noIncrease: "The fee does not change during the academic year your child joined in.",
    studentsCoached: "146",
    studentsSucceeded: "118",
    countsYear: "2025-26: children whose school maths or science mark rose between the half-yearly and the annual",
    hi: {
      intro: "फीस महीने के हिसाब से है और टर्म में दी जाती है, साल में तीन टर्म। हर ग्रुप की फीस उसके अपने पेज पर।",
      instalmentNote: "साल में तीन टर्म। किसी परिवार को हर महीने देना हो तो कहिए; हमने कभी मना नहीं किया।",
      refund: "दस दिन पहले बताकर छोड़िए। टर्म के बचे महीनों की फीस दस दिन में उसी खाते में लौटती है जिससे आई थी।",
      receipts: "हर भुगतान की रसीद उसी दिन WhatsApp पर।",
      noIncrease: "जिस साल बच्चा आया, उस साल फीस नहीं बदलती।",
    },
  },

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "hello@example.com",
    addressLines: ["Tangram Foundation Classes", "Ground floor, Example House, Example Road", "Pune, Maharashtra 411000"],
    hours: "Monday to Friday, 4:30 to 7:30 pm. Saturday and Sunday, 9:30 am to 3:30 pm.",
    mapQuery: "Tangram Foundation Classes, Pune",
    landmark: "Next to the Example Road public library, ground floor",
    hi: { hours: "सोमवार से शुक्रवार, शाम 4:30 से 7:30। शनिवार और रविवार, सुबह 9:30 से दोपहर 3:30।", landmark: "Example Road सार्वजनिक पुस्तकालय के बगल में, भूतल" },
  },
});
