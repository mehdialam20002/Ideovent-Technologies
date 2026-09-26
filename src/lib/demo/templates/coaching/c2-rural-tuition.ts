/**
 * TEMPLATE c2: RURAL TUITION CENTRE, CLASS 6 TO 12, ALL SUBJECTS.
 *
 * Segment: the tuition centre above a shop on the main road of a tehsil town,
 * where children from the town and from villages up to ten kilometres out
 * come after school, most of them by cycle. UP Board in Hindi medium is the
 * bulk of it and a CBSE English-medium batch sits beside it. Class 6 to 8
 * take every subject in one batch; Class 9 to 12 are split by board, medium
 * and stream. Fees are MONTHLY and small, and a parent compares them to the
 * rupee.
 *
 * WHAT THIS PARENT ASKS FIRST, in the order the page answers it:
 *   which board and which medium (the hero line and the batch names), how
 *   much a month in total (one "from" line, the full list in the questions),
 *   what time it ends and whether that is before dark (the timings, and the
 *   winter note under the week), is there a van from the village, is there a
 *   separate batch for girls, will anybody check the homework, and when
 *   admission closes for this session.
 * The notices come first on this theme because a parent here opens the site
 * to find out whether Sunday's revision class is on, not to be persuaded.
 *
 * HINDI FIRST, AND BOTH LANGUAGES COMPLETE (26 September 2026). The site
 * opens in Hindi (`defaultLang: "hi"`), the way the board outside the centre
 * is painted. Every plain field is ENGLISH and its Hindi sits in the same
 * object's `hi` block, so the English toggle shows no Devanagari at all. This
 * is the fix for Mehdi's "English karne pe v Hindi me text rehta hai": the
 * old file put Devanagari straight into the tagline and the notices.
 *
 * KEPT LIGHT: no course pages, no blog. Seven page types plus a gallery,
 * text and cached webfonts, which is what a basic Android phone on patchy 4G
 * needs. One classes-and-fees page carries every batch. Photos (26 September
 * 2026): the hero band, two section photos and the gallery, all stock, all
 * lazy but the hero, each served at the phone's width from its srcset.
 *
 * Registry: Classic family, `register` theme (multi-page). The old `bulletin`
 * single page is frozen for demos already sent.
 *
 * THE INSTITUTE DOES NOT EXIST. A search on 26 September 2026 found no
 * coaching institute called Nav Prabhat Coaching Centre (the nearest names
 * were unrelated "Prabhat" classes in Mumbai and Chapra). Musafirkhana is a
 * real tehsil town in Amethi district and nothing on this page is about any
 * real place in it. No student is named. Contact details are the reserved
 * fiction patterns.
 *
 * WHAT A DUPLICATE KEEPS, and why the kept lines are written the way they
 * are: the batch names, class ranges, subjects, timings and mode survive, so
 * they name no town and no person. Only the two FAQs marked `generic` survive,
 * and each would be true of any all-subject tuition centre.
 */

import { defineTemplateContent } from "../shape";
import { COACHING_PAGE_SETS } from "../../site/pageSets";

export default defineTemplateContent("coaching", {
  /* ── KEPT: which pages this segment has, and the opening language. ──── */
  sitePages: [...COACHING_PAGE_SETS["c2-rural-tuition"], "gallery"],

  /* ── KEPT: stock photographs (public/demo/img, see ../shape.ts). Licensed
        models and rooms standing in for the institute; the alt text comes
        from the manifest and describes the scene. A duplicate carries these
        paths, and the admin checklist says so until the hero is replaced. */
  heroImage: "/demo/img/coaching/c2-hero-village-tuition-800.webp",
  sectionPhotos: {
    about: "/demo/img/coaching/c2-small-group-class-640.webp",
    admissions: "/demo/img/coaching/c2-slate-practice-640.webp",
  },
  defaultLang: "hi",

  /* ── CLEARED: identity ───────────────────────────────────────────────── */
  instituteName: "Nav Prabhat Coaching Centre",
  /* English here; the Devanagari painted on the board is in `hi` below. */
  tagline: "Every subject from Class 6 to 12, in Hindi and English medium. Evening batches after school, and home before dark.",
  city: "Musafirkhana",
  state: "Uttar Pradesh",

  /* ── KEPT: market, language, currency, and what is taught ────────────── */
  country: "India",
  market: "india",
  currency: "INR",
  /* The hero reads "UP Board and CBSE coaching in Musafirkhana". Boards,
     never claims. The two words also mark the batch rows that carry them. */
  focusAreas: ["UP Board", "CBSE"],
  admissionsHeadline: "UP Board and CBSE coaching in Musafirkhana",

  /* ── CLEARED: history ────────────────────────────────────────────────── */
  established: "Since 2009",
  establishedYear: "2009",
  boardOrAffiliation: "A private tuition centre. We teach the UP Board and CBSE syllabus and are affiliated to neither board.",

  about:
    "Nav Prabhat Coaching Centre has taught Class 6 to 12 in Musafirkhana since 2009, from the first floor of a building on Example Road. About half our students come from villages up to ten kilometres out, most by cycle and some by our van. The UP Board batches are taught in Hindi and the CBSE batches in English. School homework is checked every day before the new lesson, there is a test every Saturday, and the marks go home written in the student's own notebook.",

  hi: {
    instituteName: "नव प्रभात कोचिंग सेंटर",
    city: "मुसाफ़िरखाना",
    state: "उत्तर प्रदेश",
    admissionsHeadline: "मुसाफ़िरखाना में UP Board, CBSE की कोचिंग",
    tagline: "कक्षा 6 से 12 तक सभी विषय, हिंदी और अंग्रेज़ी माध्यम। स्कूल के बाद शाम की बैच, अँधेरा होने से पहले छुट्टी।",
    about:
      "नव प्रभात कोचिंग सेंटर 2009 से मुसाफ़िरखाना में कक्षा 6 से 12 तक पढ़ा रहा है, Example Road की एक इमारत की पहली मंज़िल से। हमारे लगभग आधे विद्यार्थी दस किलोमीटर तक के गाँवों से आते हैं, ज़्यादातर साइकिल से और कुछ हमारी वैन से। UP Board की बैच हिंदी में और CBSE की बैच अंग्रेज़ी में पढ़ती है। नया पाठ शुरू करने से पहले रोज़ स्कूल का होमवर्क जाँचा जाता है, हर शनिवार टेस्ट होता है, और अंक बच्चे की अपनी कॉपी में लिखकर घर जाते हैं।",
    resultsHeading: "2026 का बोर्ड रिज़ल्ट",
    resultsNote:
      "इस हिस्से के सभी अंक और गिनती उदाहरण हैं, जिन्हें Ideovent ने यह दिखाने के लिए रखा है कि रिज़ल्ट कैसे लिखे जाते हैं। आपके अपने रिज़ल्ट यहाँ वैसे ही आएँगे जैसे आप बाहर के बोर्ड पर लिखते हैं, और परिवार की अनुमति के बिना किसी बच्चे का नाम या फ़ोटो नहीं लगेगा।",
    scheduleNote: "1 नवंबर से 15 फ़रवरी तक शाम की हर बैच आधा घंटा पहले चलती है। कक्षा 11 और 12 विज्ञान की बैच पूरे साल सुबह चलती है।",
    classSizePromise: "कक्षा 9 से 12 की बैच में पैंतीस से ज़्यादा बच्चे नहीं। इंग्लिश मीडियम बैच में बीस।",
    vision: "गाँव का हर बच्चा बोर्ड परीक्षा में उतना ही तैयार हो जितना शहर का।",
    mission: "रोज़ होमवर्क की जाँच, हर शनिवार टेस्ट, और अँधेरा होने से पहले घर।",
    established: "2009 से",
    boardOrAffiliation: "एक प्राइवेट ट्यूशन सेंटर। हम UP Board और CBSE का सिलेबस पढ़ाते हैं, पर किसी भी बोर्ड से संबद्ध नहीं हैं।",
  },

  /* ── CLEARED: the About page, kept short. ─────────────────────────────── */
  classSizePromise: "Never more than thirty-five in a Class 9 to 12 batch. Twenty in the English-medium batch.",
  vision: "A village child as ready for the board exam as a child in the city.",
  mission: "Homework checked every day, a test every Saturday, and home before dark.",
  founder: {
    name: "Ramakant Tripathi",
    role: "Founder and maths teacher",
    story:
      "I taught maths at the inter college for twelve years and saw bright children from the villages fail High School maths because nobody at home could check their homework. In 2009 I took the first floor above a shop on Example Road and started with eleven students in one room. Now we have three rooms and five teachers, and I still check the Class 10 maths homework myself.",
    hi: {
      role: "संस्थापक और गणित शिक्षक",
      story:
        "मैंने बारह साल इंटर कॉलेज में गणित पढ़ाया और देखा कि गाँव के होशियार बच्चे हाईस्कूल गणित में इसलिए फ़ेल होते थे क्योंकि घर पर कोई होमवर्क जाँचने वाला नहीं था। 2009 में Example Road पर एक दुकान के ऊपर पहली मंज़िल ली और एक कमरे में ग्यारह बच्चों से शुरू किया। आज तीन कमरे और पाँच शिक्षक हैं, और कक्षा 10 का गणित होमवर्क मैं आज भी ख़ुद जाँचता हूँ।",
    },
  },

  /* ── CLEARED: two figures, each with its basis. No counter on this site. ─ */
  stats: [
    { value: "41", label: "Class 10 students we taught in 2025-26", basis: "UP Board and CBSE together", hi: { label: "2025-26 में हमारे कक्षा 10 के विद्यार्थी", basis: "UP Board और CBSE मिलाकर" } },
    { value: "37", label: "Of them passed in first division", basis: "UP Board High School and CBSE Class 10, 2026", hi: { label: "इनमें से प्रथम श्रेणी में पास", basis: "UP Board हाईस्कूल और CBSE कक्षा 10, 2026" } },
  ],

  /* ── CLEARED: how joining works. ─────────────────────────────────────── */
  joining: [
    { title: "Come with your child", body: "Any day between 3:00 and 7:00 pm. No appointment, no form to buy.", hi: { title: "बच्चे के साथ आइए", body: "किसी भी दिन दोपहर 3:00 से शाम 7:00 के बीच। न अपॉइंटमेंट, न फ़ॉर्म ख़रीदना।" } },
    { title: "One free week", body: "Your child sits the batch for six classes. You may sit at the back on any day.", hi: { title: "एक हफ़्ता मुफ़्त", body: "बच्चा बैच की छह क्लास में बैठता है। आप किसी भी दिन पीछे बैठ सकते हैं।" } },
    { title: "Pay the first month", body: "Only if the batch suits. A receipt every time, cash or UPI.", hi: { title: "पहले महीने की फीस", body: "तभी जब बैच ठीक लगे। हर बार रसीद, नक़द या UPI।" } },
  ],

  reviews: [
    { quote: "My daughter cycles eight kilometres. In winter the batch ends early and she is home before the lamp is lit. That is why we chose this centre.", relation: "Parent, Class 10, UP Board", consent: true, hi: { quote: "मेरी बेटी आठ किलोमीटर साइकिल से आती है। सर्दी में बैच जल्दी छूटती है और दिया जलने से पहले घर आ जाती है। इसीलिए यह सेंटर चुना।", relation: "अभिभावक, कक्षा 10, UP Board" } },
    { quote: "Nobody at home can read English. Here they check his homework every day and write what is missing in the notebook.", relation: "Parent, Class 7", consent: true, hi: { quote: "घर में कोई अंग्रेज़ी नहीं पढ़ सकता। यहाँ रोज़ उसका होमवर्क जाँचते हैं और जो छूटा वह कॉपी में लिख देते हैं।", relation: "अभिभावक, कक्षा 7" } },
    { quote: "The Sunday papers in winter were the reason I was not afraid in the board hall.", relation: "Student, Class 12 science, 2026", consent: true, hi: { quote: "सर्दी के रविवार वाले पेपर ही वजह थे कि बोर्ड के हॉल में डर नहीं लगा।", relation: "विद्यार्थी, कक्षा 12 विज्ञान, 2026" } },
  ],

  feesPolicy: {
    paymentModes: ["Cash at the desk", "UPI"],
    refund: "Fees are monthly, so there is nothing to refund when a child leaves. A month paid and not started is returned in full.",
    receipts: "A receipt for every payment, cash or UPI.",
    noIncrease: "The monthly fee does not change during the session.",
    hi: {
      refund: "फीस महीने की है, इसलिए छोड़ने पर लौटाने को कुछ नहीं बचता। जो महीना भरा पर शुरू नहीं हुआ, उसकी पूरी फीस वापस।",
      receipts: "हर भुगतान की रसीद, नक़द हो या UPI।",
      noIncrease: "सत्र के बीच महीने की फीस नहीं बदलती।",
      paymentModes: ["डेस्क पर नक़द", "UPI"],
    },
  },

  /* ── STRUCTURE: the batches. Name, level, subjects, duration, timings and
        mode are KEPT; batchStarts, seats, fee, feeNote and detail are
        CLEARED. Fees are monthly, as every tuition centre in this segment
        charges them. The Sunday revision batch keeps its price out of `fee`
        so the "from" line stays the true lowest monthly batch. ────────── */
  courses: [
    {
      name: "Class 6 to 8, all subjects",
      level: "Class 6 to 8",
      subjects: "Hindi, English, maths, science, social science and Sanskrit",
      duration: "April to March, the school session",
      timings: "Mon to Sat, 4:00 to 5:30 pm",
      mode: "Classroom, Hindi and English medium",
      batchStarts: "Join in any month",
      seats: "30 per batch",
      fee: "400",
      feeNote: "a month",
      detail: "The first twenty minutes of every class go on the day's school homework, checked in front of the child. A student who is behind in reading sits with the Hindi teacher on Saturday.",
      category: "Class 6 to 8",
      hi: { category: "कक्षा 6 से 8", name: "कक्षा 6 से 8, सभी विषय", seats: "एक बैच में 30", level: "कक्षा 6 से 8", subjects: "हिंदी, अंग्रेज़ी, गणित, विज्ञान, सामाजिक विज्ञान और संस्कृत", duration: "अप्रैल से मार्च, स्कूल का सत्र", timings: "सोम से शनि, शाम 4:00 से 5:30", mode: "क्लासरूम, हिंदी और अंग्रेज़ी माध्यम", batchStarts: "किसी भी महीने", feeNote: "प्रति माह", detail: "हर क्लास के पहले बीस मिनट उस दिन के स्कूल होमवर्क पर, बच्चे के सामने जाँचकर। पढ़ने में पीछे रहने वाला बच्चा शनिवार को हिंदी शिक्षक के साथ बैठता है।" },
    },
    {
      name: "Class 9 and 10, UP Board, Hindi medium",
      level: "Class 9 to 10",
      subjects: "Hindi, English, maths, science, social science, Sanskrit or drawing",
      duration: "April to the board exam",
      timings: "Mon to Sat, 5:30 to 7:00 pm",
      mode: "Classroom, Hindi medium",
      batchStarts: "Join by 31 October",
      seats: "35 per batch",
      fee: "700",
      feeNote: "Monthly, every subject included",
      detail: "Class 10 solves the last five years of UP Board High School papers from December, one paper every Saturday under exam timing. A separate girls' batch runs from 3:30 to 5:00 pm.",
      category: "Class 9 and 10",
      hi: { category: "कक्षा 9 और 10", name: "कक्षा 9 और 10, UP Board, हिंदी माध्यम", seats: "एक बैच में 35", level: "कक्षा 9 से 10", subjects: "हिंदी, अंग्रेज़ी, गणित, विज्ञान, सामाजिक विज्ञान, संस्कृत या चित्रकला", duration: "अप्रैल से बोर्ड परीक्षा तक", timings: "सोम से शनि, शाम 5:30 से 7:00", mode: "क्लासरूम, हिंदी माध्यम", batchStarts: "31 अक्टूबर तक प्रवेश", feeNote: "प्रति माह, सभी विषय शामिल", detail: "कक्षा 10 दिसंबर से UP Board हाईस्कूल के पिछले पाँच साल के पेपर हल करती है, हर शनिवार एक पेपर, परीक्षा के समय में। लड़कियों की अलग बैच दोपहर 3:30 से 5:00 तक।" },
    },
    {
      name: "Class 9 and 10, CBSE, English medium",
      level: "Class 9 to 10",
      subjects: "English, Hindi, maths, science, social science",
      duration: "April to the board exam",
      timings: "Mon to Sat, 5:30 to 7:00 pm",
      mode: "Classroom, English medium",
      batchStarts: "Join by 31 October",
      seats: "20 per batch",
      fee: "900",
      feeNote: "Monthly, every subject included",
      detail: "NCERT first, chapter by chapter, with the CBSE sample paper worked in class every month from October.",
      category: "Class 9 and 10",
      hi: { category: "कक्षा 9 और 10", name: "कक्षा 9 और 10, CBSE, अंग्रेज़ी माध्यम", seats: "एक बैच में 20", level: "कक्षा 9 से 10", subjects: "अंग्रेज़ी, हिंदी, गणित, विज्ञान, सामाजिक विज्ञान", duration: "अप्रैल से बोर्ड परीक्षा तक", timings: "सोम से शनि, शाम 5:30 से 7:00", mode: "क्लासरूम, अंग्रेज़ी माध्यम", batchStarts: "31 अक्टूबर तक प्रवेश", feeNote: "प्रति माह, सभी विषय शामिल", detail: "पहले NCERT, अध्याय दर अध्याय, और अक्टूबर से हर महीने CBSE का सैंपल पेपर क्लास में हल होता है।" },
    },
    {
      name: "Class 11 and 12, science, UP Board and CBSE",
      level: "Class 11 to 12",
      subjects: "Physics, chemistry, and maths or biology, one subject a day",
      duration: "Two sessions, April to the board exam",
      timings: "Mon to Sat, 6:30 to 8:00 am",
      mode: "Classroom, Hindi and English medium",
      batchStarts: "Join by 31 October",
      seats: "25 per batch",
      fee: "1,200",
      feeNote: "Monthly, for all three science subjects",
      detail: "A morning batch, so the evening is free for school homework and for the farm in the harvest weeks. Practical file and viva preparation in January, before the school practicals.",
      category: "Class 11 and 12",
      hi: { category: "कक्षा 11 और 12", name: "कक्षा 11 और 12, विज्ञान, UP Board और CBSE", seats: "एक बैच में 25", level: "कक्षा 11 से 12", subjects: "भौतिकी, रसायन, और गणित या जीव विज्ञान, रोज़ एक विषय", duration: "दो सत्र, अप्रैल से बोर्ड परीक्षा तक", timings: "सोम से शनि, सुबह 6:30 से 8:00", mode: "क्लासरूम, हिंदी और अंग्रेज़ी माध्यम", batchStarts: "31 अक्टूबर तक प्रवेश", feeNote: "प्रति माह, तीनों विज्ञान विषय", detail: "सुबह की बैच, ताकि शाम स्कूल के होमवर्क और कटाई के दिनों में खेत के लिए ख़ाली रहे। जनवरी में प्रैक्टिकल फ़ाइल और वाइवा की तैयारी, स्कूल के प्रैक्टिकल से पहले।" },
    },
    {
      name: "Class 11 and 12, arts, Hindi medium",
      level: "Class 11 to 12",
      subjects: "Hindi, English, history, civics and geography",
      duration: "Two sessions, April to the board exam",
      timings: "Mon to Sat, 4:00 to 5:30 pm",
      mode: "Classroom, Hindi medium",
      batchStarts: "Join by 31 October",
      seats: "30 per batch",
      fee: "800",
      feeNote: "Monthly, every subject included",
      detail: "Answer writing is practised every week: the length, the headings and the map work the UP Board Intermediate examiner looks for.",
      category: "Class 11 and 12",
      hi: { category: "कक्षा 11 और 12", name: "कक्षा 11 और 12, कला, हिंदी माध्यम", seats: "एक बैच में 30", level: "कक्षा 11 से 12", subjects: "हिंदी, अंग्रेज़ी, इतिहास, नागरिक शास्त्र और भूगोल", duration: "दो सत्र, अप्रैल से बोर्ड परीक्षा तक", timings: "सोम से शनि, शाम 4:00 से 5:30", mode: "क्लासरूम, हिंदी माध्यम", batchStarts: "31 अक्टूबर तक प्रवेश", feeNote: "प्रति माह, सभी विषय शामिल", detail: "हर हफ़्ते उत्तर लिखने का अभ्यास: लंबाई, शीर्षक और नक़्शे का काम, जो UP Board इंटरमीडिएट का परीक्षक देखता है।" },
    },
    {
      name: "Sunday board revision, Class 10 and 12",
      level: "Class 10 and Class 12",
      subjects: "Past board papers, solved under exam timing",
      duration: "November to February",
      timings: "Sundays, 8:00 to 11:00 am",
      mode: "Classroom",
      batchStarts: "Starts Sunday 1 November 2026",
      seats: "40 seats",
      fee: "1,500",
      feeNote: "For all sixteen Sundays. Free for our own Class 10 and 12 students",
      detail: "Open to students of any tuition centre: ₹1,500 for all sixteen Sundays, free for our own Class 10 and 12 students. Each paper is checked and returned the following Sunday with the marks the board would have given.",
      category: "Revision",
      hi: { category: "रिवीज़न", name: "रविवार बोर्ड रिवीज़न, कक्षा 10 और 12", seats: "40 सीट", level: "कक्षा 10 और कक्षा 12", subjects: "पिछले बोर्ड पेपर, परीक्षा के समय में", duration: "नवंबर से फ़रवरी", timings: "रविवार, सुबह 8:00 से 11:00", batchStarts: "रविवार 1 नवंबर 2026 से", feeNote: "सभी सोलह रविवार के लिए। हमारे अपने कक्षा 10 और 12 के विद्यार्थियों के लिए मुफ़्त", detail: "किसी भी ट्यूशन सेंटर के विद्यार्थी आ सकते हैं: सभी सोलह रविवार के ₹1,500, हमारे अपने कक्षा 10 और 12 के विद्यार्थियों के लिए मुफ़्त। हर पेपर जाँचकर अगले रविवार लौटाया जाता है, उन अंकों के साथ जो बोर्ड देता।", mode: "क्लासरूम" },
    },
  ],

  /* ── CLEARED: results. UP Board calls Class 10 "High School" and Class 12
        "Intermediate", and a parent here uses those words. No student is
        named. ─────────────────────────────────────────────────────────── */
  resultsHeading: "The 2026 board results",
  resultsNote:
    "Every mark and count in this section is example content, placed by Ideovent to show how a result list is set out. Your own results go here exactly as you write them on your board outside, and no child's name or photograph goes up without the family's permission.",
  results: [
    { achievement: "92.6%", exam: "UP Board High School", year: "2026", note: "Class 10, Hindi medium", category: "UP Board", courseName: "Class 9 and 10, UP Board, Hindi medium", courseDuration: "Two years", paid: "paid", hi: { exam: "UP Board हाईस्कूल", courseDuration: "दो साल", achievement: "92.6%", note: "कक्षा 10, हिंदी माध्यम", courseName: "कक्षा 9 और 10, UP Board, हिंदी माध्यम" } },
    { achievement: "94.2%", exam: "CBSE Class 10", year: "2026", note: "Class 10, English medium", category: "CBSE", courseName: "Class 9 and 10, CBSE, English medium", courseDuration: "Two years", paid: "paid", hi: { exam: "CBSE कक्षा 10", courseDuration: "दो साल", achievement: "94.2%", note: "कक्षा 10, अंग्रेज़ी माध्यम", courseName: "कक्षा 9 और 10, CBSE, अंग्रेज़ी माध्यम" } },
    { achievement: "88.4%", exam: "UP Board Intermediate, science", year: "2026", note: "Class 12, morning batch", category: "UP Board", courseName: "Class 11 and 12, science", courseDuration: "Two years", paid: "paid", hi: { exam: "UP Board इंटरमीडिएट, विज्ञान", courseDuration: "दो साल", achievement: "88.4%", note: "कक्षा 12, सुबह की बैच", courseName: "कक्षा 11 और 12, विज्ञान" } },
    { achievement: "37 of 41 in first division", exam: "UP Board High School", year: "2026", note: "Every Class 10 student we taught", category: "UP Board", courseName: "Class 9 and 10, both batches", courseDuration: "One to two years", paid: "paid", hi: { exam: "UP Board हाईस्कूल", courseDuration: "एक से दो साल", achievement: "41 में से 37 प्रथम श्रेणी में", note: "हमारे पढ़ाए कक्षा 10 के सभी विद्यार्थी", courseName: "कक्षा 9 और 10, दोनों बैच" } },
    { achievement: "100 of 100 in maths", exam: "UP Board High School", year: "2026", note: "Class 10, girls' batch", category: "UP Board", courseName: "Girls' batch, Class 9 and 10", courseDuration: "Two years", paid: "free", hi: { exam: "UP Board हाईस्कूल", courseDuration: "दो साल", achievement: "गणित में 100 में से 100", note: "कक्षा 10, लड़कियों की बैच", courseName: "लड़कियों की बैच, कक्षा 9 और 10" } },
    { achievement: "90.8%", exam: "UP Board High School", year: "2025", note: "Class 10, Hindi medium", category: "UP Board", courseName: "Class 9 and 10, UP Board, Hindi medium", courseDuration: "Two years", paid: "paid", hi: { exam: "UP Board हाईस्कूल", courseDuration: "दो साल", achievement: "90.8%", note: "कक्षा 10, हिंदी माध्यम", courseName: "कक्षा 9 और 10, UP Board, हिंदी माध्यम" } },
    { achievement: "32 of 36 in first division", exam: "UP Board High School", year: "2025", note: "Every Class 10 student we taught", category: "UP Board", courseName: "Class 9 and 10, both batches", courseDuration: "One to two years", paid: "paid", hi: { exam: "UP Board हाईस्कूल", courseDuration: "एक से दो साल", achievement: "36 में से 32 प्रथम श्रेणी में", note: "हमारे पढ़ाए कक्षा 10 के सभी विद्यार्थी", courseName: "कक्षा 9 और 10, दोनों बैच" } },
    { achievement: "84.0%", exam: "UP Board Intermediate, arts", year: "2025", note: "Class 12, arts batch", category: "UP Board", courseName: "Class 11 and 12, arts", courseDuration: "Two years", paid: "paid", hi: { exam: "UP Board इंटरमीडिएट, कला", courseDuration: "दो साल", achievement: "84.0%", note: "कक्षा 12, कला बैच", courseName: "कक्षा 11 और 12, कला" } },
  ],

  /* ── CLEARED: faculty. Five teachers, one of them a woman who takes the
        girls' batch, which a parent here asks about by name. ─────────── */
  faculty: [
    { name: "Ramakant Tripathi", photo: "/demo/img/people/teacher-m06-240.webp", subject: "Maths", qualification: "M.Sc. Mathematics, B.Ed.", experience: "24 years. Started the centre and takes maths for Class 9 to 12.", role: "Founder", batches: "Class 9 to 12, Sunday revision", style: "Every sum on the board is done by a student first, then by him.", hi: { batches: "कक्षा 9 से 12, रविवार रिवीज़न", subject: "गणित", experience: "24 साल। सेंटर शुरू किया और कक्षा 9 से 12 का गणित लेते हैं।", role: "संस्थापक", style: "बोर्ड पर हर सवाल पहले एक विद्यार्थी हल करता है, फिर वे।", qualification: "M.Sc. गणित, B.Ed." } },
    { name: "Sunita Yadav", photo: "/demo/img/people/teacher-w10-240.webp", subject: "Science and the girls' batch", qualification: "M.Sc. Botany, B.Ed.", experience: "15 years. Takes biology for Class 11 and 12 and every subject in the girls' batch.", batches: "Girls' batch, Class 11 and 12 biology", style: "Diagrams first, then the answer in the words the board wants.", hi: { batches: "लड़कियों की बैच, कक्षा 11 और 12 जीव विज्ञान", subject: "विज्ञान और लड़कियों की बैच", experience: "15 साल। कक्षा 11 और 12 जीव विज्ञान, और लड़कियों की बैच के सभी विषय।", style: "पहले डायग्राम, फिर उत्तर उन शब्दों में जो बोर्ड चाहता है।", qualification: "M.Sc. वनस्पति विज्ञान, B.Ed." } },
    { name: "Arvind Kumar Maurya", photo: "/demo/img/people/teacher-m03-240.webp", subject: "Physics and chemistry", qualification: "M.Sc. Physics", experience: "11 years. Takes the morning science batch.", batches: "Class 11 and 12 science", style: "Numericals every day, in Hindi and English side by side.", hi: { batches: "कक्षा 11 और 12 विज्ञान", subject: "भौतिकी और रसायन", experience: "11 साल। सुबह की विज्ञान बैच।", style: "रोज़ न्यूमेरिकल, हिंदी और अंग्रेज़ी साथ-साथ।", qualification: "M.Sc. भौतिकी" } },
    { name: "Shabnam Bano", photo: "/demo/img/people/teacher-w01-240.webp", subject: "English", qualification: "M.A. English, B.Ed.", experience: "9 years. Takes English for every class, Hindi and English medium.", batches: "Every class", style: "Ten minutes of reading aloud in every class, grammar only from the child's own mistakes.", hi: { batches: "हर कक्षा", subject: "अंग्रेज़ी", experience: "9 साल। हर कक्षा की अंग्रेज़ी, हिंदी और अंग्रेज़ी माध्यम।", style: "हर क्लास में दस मिनट ज़ोर से पढ़ना, ग्रामर बच्चे की अपनी ग़लतियों से।", qualification: "M.A. अंग्रेज़ी, B.Ed." } },
    { name: "Dinesh Chandra Pandey", photo: "/demo/img/people/teacher-m13-240.webp", subject: "Hindi, Sanskrit and social science", qualification: "M.A. Hindi, B.Ed.", experience: "19 years. Takes Class 6 to 8 and the arts batch.", batches: "Class 6 to 8, Class 11 and 12 arts", style: "Answer writing practised every week, checked in red, returned the next day.", hi: { batches: "कक्षा 6 से 8, कक्षा 11 और 12 कला", subject: "हिंदी, संस्कृत और सामाजिक विज्ञान", experience: "19 साल। कक्षा 6 से 8 और कला बैच।", style: "हर हफ़्ते उत्तर लेखन, लाल पेन से जाँचकर अगले दिन वापस।", qualification: "M.A. हिंदी, B.Ed." } },
  ],

  /* ── CLEARED: why parents choose us. Written as a village parent's worry
        in plain words, each answered with a practice. ─────────────────── */
  method: [
    {
      title: "Every child home before dark",
      body: "From November to mid-February every evening batch starts and ends thirty minutes earlier, so no student cycles home in the dark. The girls' batch always ends by 5:00 pm.",
      hi: { title: "हर बच्चा अँधेरा होने से पहले घर", body: "नवंबर से फ़रवरी के बीच तक शाम की हर बैच आधा घंटा पहले शुरू और ख़त्म होती है, ताकि कोई बच्चा अँधेरे में साइकिल से घर न जाए। लड़कियों की बैच हमेशा शाम 5:00 तक छूट जाती है।" },
    },
    {
      title: "Homework checked every day, not only on test day",
      body: "Each class begins with the school homework, checked in front of the child. What was not done is written in the notebook, and you will see it when you open the bag.",
      hi: { title: "होमवर्क रोज़ जाँचा जाता है, सिर्फ़ टेस्ट के दिन नहीं", body: "हर क्लास स्कूल के होमवर्क से शुरू होती है, बच्चे के सामने जाँचकर। जो नहीं हुआ वह कॉपी में लिखा जाता है, और बस्ता खोलते ही आपको दिखेगा।" },
    },
    {
      title: "You will know the marks without coming to the centre",
      body: "A test every Saturday. The marks go home in the notebook, and once a month a teacher calls you on the number you gave at admission.",
      hi: { title: "सेंटर आए बिना अंक पता चलेंगे", body: "हर शनिवार टेस्ट। अंक कॉपी में घर जाते हैं, और महीने में एक बार शिक्षक आपको उसी नंबर पर फ़ोन करते हैं जो एडमिशन पर दिया था।" },
    },
  ],

  /* ── STRUCTURE: the week. Label, days, time and subject are KEPT;
        faculty and room are CLEARED. ─────────────────────────────────── */
  scheduleNote:
    "From 1 November to 15 February every evening batch runs thirty minutes earlier. The Class 11 and 12 science batch is in the morning all year.",
  schedule: [
    { label: "Class 11 and 12, science", days: "Monday to Saturday", time: "6:30 to 8:00 am", subject: "Physics, chemistry, maths or biology, one a day", faculty: "Arvind Kumar Maurya and Sunita Yadav", room: "Room 1", hi: { faculty: "Arvind Kumar Maurya और Sunita Yadav", room: "कमरा 1", label: "कक्षा 11 और 12, विज्ञान", days: "सोमवार से शनिवार", time: "सुबह 6:30 से 8:00", subject: "भौतिकी, रसायन, गणित या जीव विज्ञान, रोज़ एक" } },
    { label: "Girls' batch, Class 9 and 10", days: "Monday to Saturday", time: "3:30 to 5:00 pm", subject: "All subjects, by day", faculty: "Sunita Yadav", room: "Room 2", hi: { room: "कमरा 2", label: "लड़कियों की बैच, कक्षा 9 और 10", days: "सोमवार से शनिवार", time: "दोपहर 3:30 से 5:00", subject: "सभी विषय, दिन के हिसाब से" } },
    { label: "Class 6 to 8", days: "Monday to Saturday", time: "4:00 to 5:30 pm", subject: "Maths and science, then languages and social science on alternate days", faculty: "Dinesh Chandra Pandey", room: "Room 1", hi: { room: "कमरा 1", label: "कक्षा 6 से 8", days: "सोमवार से शनिवार", time: "शाम 4:00 से 5:30", subject: "गणित और विज्ञान, फिर एक दिन छोड़कर भाषाएँ और सामाजिक विज्ञान" } },
    { label: "Class 11 and 12, arts", days: "Monday to Saturday", time: "4:00 to 5:30 pm", subject: "Hindi, English, history, civics, geography", faculty: "Dinesh Chandra Pandey and Shabnam Bano", room: "Room 3", hi: { faculty: "Dinesh Chandra Pandey और Shabnam Bano", room: "कमरा 3", label: "कक्षा 11 और 12, कला", days: "सोमवार से शनिवार", time: "शाम 4:00 से 5:30", subject: "हिंदी, अंग्रेज़ी, इतिहास, नागरिक शास्त्र, भूगोल" } },
    { label: "Class 9 and 10, Hindi medium", days: "Mon, Wed, Fri", time: "5:30 to 7:00 pm", subject: "Maths and science", faculty: "Ramakant Tripathi", room: "Room 2", hi: { room: "कमरा 2", label: "कक्षा 9 और 10, हिंदी माध्यम", days: "सोम, बुध, शुक्र", time: "शाम 5:30 से 7:00", subject: "गणित और विज्ञान" } },
    { label: "Class 9 and 10, Hindi medium", days: "Tue, Thu, Sat", time: "5:30 to 7:00 pm", subject: "English, Hindi, social science", faculty: "Shabnam Bano", room: "Room 2", hi: { room: "कमरा 2", label: "कक्षा 9 और 10, हिंदी माध्यम", days: "मंगल, गुरु, शनि", time: "शाम 5:30 से 7:00", subject: "अंग्रेज़ी, हिंदी, सामाजिक विज्ञान" } },
    { label: "Class 9 and 10, English medium", days: "Monday to Saturday", time: "5:30 to 7:00 pm", subject: "All subjects, by day", faculty: "Ramakant Tripathi and Shabnam Bano", room: "Room 3", hi: { faculty: "Ramakant Tripathi और Shabnam Bano", room: "कमरा 3", label: "कक्षा 9 और 10, अंग्रेज़ी माध्यम", days: "सोमवार से शनिवार", time: "शाम 5:30 से 7:00", subject: "सभी विषय, दिन के हिसाब से" } },
    { label: "Saturday test, every batch", days: "Saturday", time: "Last 40 minutes of the batch", subject: "The week's chapters", faculty: "The subject teacher", room: "Own room", hi: { faculty: "विषय के शिक्षक", room: "अपना कमरा", label: "शनिवार टेस्ट, हर बैच", days: "शनिवार", time: "बैच के आख़िरी 40 मिनट", subject: "हफ़्ते के अध्याय" } },
    { label: "Board revision, Class 10 and 12", days: "Sunday, November to February", time: "8:00 to 11:00 am", subject: "Past board papers under exam timing", faculty: "Ramakant Tripathi", room: "Rooms 1 and 2", hi: { room: "कमरा 1 और 2", label: "बोर्ड रिवीज़न, कक्षा 10 और 12", days: "रविवार, नवंबर से फ़रवरी", time: "सुबह 8:00 से 11:00", subject: "पिछले बोर्ड पेपर, परीक्षा के समय में" } },
  ],

  /* ── CLEARED: the free week, which is how a centre like this converts. ── */
  trial: {
    heading: "The first week is free",
    body: "Send your child to the batch for one full week, Monday to Saturday, and pay nothing. Come and sit at the back on any day you like. If the batch does not suit, you owe us nothing and nobody will call you about it.",
    duration: "One week, six classes",
    bring: "A notebook, a pen, and the last school report card or mark sheet.",
    howToBook: "Come to the centre with your child any day between 3:00 and 7:00 pm, or call first. There is no admission fee and no form to buy.",
    hi: {
      heading: "पहला हफ़्ता मुफ़्त",
      body: "बच्चे को एक पूरा हफ़्ता, सोमवार से शनिवार, बैच में भेजिए और कुछ मत दीजिए। किसी भी दिन आकर पीछे बैठिए। बैच ठीक न लगे तो कुछ नहीं देना, और कोई फ़ोन करके पीछे नहीं पड़ेगा।",
      duration: "एक हफ़्ता, छह क्लास",
      bring: "एक कॉपी, पेन, और स्कूल का पिछला रिपोर्ट कार्ड या मार्कशीट।",
      howToBook: "किसी भी दिन दोपहर 3:00 से शाम 7:00 के बीच बच्चे के साथ सेंटर आइए, या पहले फ़ोन कर लीजिए। न एडमिशन फीस, न फ़ॉर्म ख़रीदना।",
    },
  },

  /* ── STRUCTURE: FAQ. Two are marked generic: true of any all-subject
        tuition centre and naming no fee, date, count, person or place. ── */
  faq: [
    {
      title: "What are the fees, and what do they cover?",
      body: "Class 6 to 8, all subjects: ₹400 a month. Class 9 and 10: ₹700 a month in the Hindi-medium batch and ₹900 in the English-medium batch. Class 11 and 12: ₹1,200 a month for science and ₹800 for arts. The Sunday revision class is ₹1,500 for the season and free for our own students. There is no admission fee. Fees are paid by the 10th of each month, and a receipt is given every time. These are example figures and yours replace them.",
      group: "Fees",
      hi: { title: "फीस कितनी है, और उसमें क्या शामिल है?", body: "कक्षा 6 से 8, सभी विषय: ₹400 प्रति माह। कक्षा 9 और 10: हिंदी माध्यम ₹700 और अंग्रेज़ी माध्यम ₹900 प्रति माह। कक्षा 11 और 12: विज्ञान ₹1,200 और कला ₹800 प्रति माह। रविवार रिवीज़न पूरे सीज़न के ₹1,500, हमारे विद्यार्थियों के लिए मुफ़्त। कोई एडमिशन फीस नहीं। फीस हर महीने की 10 तारीख़ तक, और हर बार रसीद। ये उदाहरण के आँकड़े हैं, आपके अपने इनकी जगह लेंगे।", group: "फीस" },
    },
    {
      title: "Which board and which medium do you teach?",
      body: "UP Board in Hindi medium for every class, and CBSE in English medium for Class 9 and 10. Class 6 to 8 and Class 11 and 12 science are taught in both, in the same room, with notes in the medium your child's school uses.",
      group: "Classes",
      hi: { title: "आप कौन सा बोर्ड और कौन सा माध्यम पढ़ाते हैं?", body: "हर कक्षा के लिए UP Board हिंदी माध्यम में, और कक्षा 9 और 10 के लिए CBSE अंग्रेज़ी माध्यम में। कक्षा 6 से 8 और कक्षा 11 और 12 विज्ञान दोनों में, एक ही कमरे में, नोट्स उस माध्यम में जो बच्चे का स्कूल पढ़ाता है।", group: "कक्षाएँ" },
    },
    {
      title: "Is there a van from the villages?",
      body: "Yes, one van on two routes, up to ten kilometres out, for the evening batches only. It is ₹300 a month on top of the fee. Ask at the centre for the stops; the driver has been with us for six years.",
      group: "Getting here",
      hi: { title: "क्या गाँवों से वैन है?", body: "हाँ, दो रास्तों पर एक वैन, दस किलोमीटर तक, सिर्फ़ शाम की बैच के लिए। फीस के ऊपर ₹300 प्रति माह। रुकने की जगहें सेंटर पर पूछिए; ड्राइवर छह साल से हमारे साथ है।", group: "आना-जाना" },
    },
    {
      title: "Is there a separate batch for girls?",
      body: "Yes, for Class 9 and 10, from 3:30 to 5:00 pm, taken by Sunita Yadav. Girls in the other batches sit on their own side of the room, and every batch has a female staff member at the centre until the last class ends.",
      group: "Getting here",
      hi: { title: "क्या लड़कियों की अलग बैच है?", body: "हाँ, कक्षा 9 और 10 के लिए, दोपहर 3:30 से 5:00, सुनीता यादव लेती हैं। बाक़ी बैच में लड़कियाँ कमरे में अपनी तरफ़ बैठती हैं, और आख़िरी क्लास ख़त्म होने तक सेंटर पर एक महिला स्टाफ़ रहती है।", group: "आना-जाना" },
    },
    {
      title: "Which subjects are taught in the Class 6 to 8 batch?",
      body: "Every subject the school teaches at that level: Hindi, English, maths, science and social science, and Sanskrit where the school teaches it. Your child does not have to choose.",
      group: "Classes",
      hi: { title: "कक्षा 6 से 8 की बैच में कौन से विषय पढ़ाए जाते हैं?", body: "वे सभी विषय जो स्कूल उस स्तर पर पढ़ाता है: हिंदी, अंग्रेज़ी, गणित, विज्ञान और सामाजिक विज्ञान, और जहाँ स्कूल पढ़ाता है वहाँ संस्कृत। बच्चे को चुनना नहीं पड़ता।", group: "कक्षाएँ" },
      generic: true,
    },
    {
      title: "What if my child misses classes at harvest time or for a wedding?",
      body: "Tell us in advance if you can. The notes for the missed days are given when the child comes back, and a Sunday catch-up hour is held in April and in October, when most absences happen.",
      group: "Classes",
      hi: { title: "कटाई या शादी के समय बच्चा क्लास छोड़ दे तो?", body: "हो सके तो पहले बता दीजिए। छूटे दिनों के नोट्स बच्चे के लौटने पर दिए जाते हैं, और अप्रैल और अक्टूबर में, जब सबसे ज़्यादा छुट्टियाँ होती हैं, रविवार को एक कैच-अप घंटा होता है।", group: "कक्षाएँ" },
    },
    {
      title: "What do we bring at admission?",
      body: "The latest school report card or mark sheet and a passport photograph. The rest is done at the desk while you wait.",
      group: "Admission",
      hi: { title: "एडमिशन के समय क्या लाना है?", body: "स्कूल का पिछला रिपोर्ट कार्ड या मार्कशीट और एक पासपोर्ट फ़ोटो। बाक़ी काम डेस्क पर आपके सामने हो जाता है।", group: "प्रवेश" },
      generic: true,
    },
    {
      title: "Can my child join in the middle of the session?",
      body: "Yes, until 31 October for Class 9 to 12, and in any month for Class 6 to 8. A student who joins late is given the notes for the chapters already finished and sits with the subject teacher on Saturday until the gap is closed.",
      group: "Admission",
      hi: { title: "क्या बच्चा सत्र के बीच में आ सकता है?", body: "हाँ, कक्षा 9 से 12 के लिए 31 अक्टूबर तक, और कक्षा 6 से 8 के लिए किसी भी महीने। देर से आने वाले बच्चे को पूरे हो चुके अध्यायों के नोट्स मिलते हैं, और कमी पूरी होने तक वह शनिवार को विषय शिक्षक के साथ बैठता है।", group: "प्रवेश" },
    },
  ],

  /* ── CLEARED: notices, newest first. In Hindi where a centre like this
        writes its notices in Hindi; the fee reminder in English because the
        receipt is in English. ─────────────────────────────────────────── */
  notices: [
    {
      title: "Sunday revision class from 1 November",
      date: "25 September 2026",
      body: "For Class 10 and 12. The last five years of board papers, under exam timing. Free for our own students. Students from outside, give your name at the centre; there are 40 seats.",
      pinned: true,
      kind: "event",
      posted: "2026-09-25",
      expires: "2026-11-01",
      hi: {
        title: "रविवार की रिवीज़न क्लास 1 नवंबर से",
        date: "25 सितंबर 2026",
        body: "कक्षा 10 और 12 के लिए। पिछले पाँच साल के बोर्ड पेपर, परीक्षा के समय के हिसाब से। हमारे अपने विद्यार्थियों के लिए मुफ़्त। बाहर के विद्यार्थी सेंटर पर नाम लिखवा दें, 40 सीट हैं।",
      },
    },
    {
      title: "Dussehra: centre closed on 19 and 20 October",
      date: "22 September 2026",
      body: "Every batch at its usual time from Wednesday 21 October.",
      kind: "notice",
      posted: "2026-09-22",
      expires: "2026-10-21",
      hi: { title: "दशहरा: 19 और 20 अक्टूबर को सेंटर बंद", date: "22 सितंबर 2026", body: "21 अक्टूबर, बुधवार से सभी बैच अपने समय पर।" },
    },
    {
      title: "October fees due by the 10th",
      date: "18 September 2026",
      body: "Fees can be paid at the desk from 3:00 to 7:00 pm. A receipt is given for every payment, cash or UPI.",
      kind: "notice",
      posted: "2026-09-18",
      expires: "2026-10-10",
      hi: { title: "अक्टूबर की फीस 10 तारीख़ तक", date: "18 सितंबर 2026", body: "फीस डेस्क पर दोपहर 3:00 से शाम 7:00 तक जमा करें। हर भुगतान की रसीद मिलती है, नक़द हो या UPI।" },
    },
    {
      title: "Class 9 and 10: half-yearly test from 5 October",
      date: "12 September 2026",
      body: "One test on the whole syllabus taught so far, before the school's half-yearly exam. Marks go home written in the notebook.",
      kind: "event",
      posted: "2026-09-12",
      expires: "2026-10-10",
      hi: { title: "कक्षा 9 और 10: अर्धवार्षिक टेस्ट 5 अक्टूबर से", date: "12 सितंबर 2026", body: "स्कूल के अर्धवार्षिक परीक्षा से पहले, अब तक पढ़ाए गए पूरे सिलेबस का एक टेस्ट। अंक कॉपी में लिखकर घर भेजे जाएँगे।" },
    },
  ],

  /* ── KEPT (stock): the Gallery page. alt is empty on purpose: a stock
        photo's alt comes from the manifest, in both languages, and no
        caption names a room of the institute. */
  photos: [
    { src: "/demo/img/coaching/c2-small-group-class-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c2-rural-classroom-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c4-attentive-class-640.webp", alt: "", category: "Classrooms", hi: { category: "क्लासरूम" } },
    { src: "/demo/img/coaching/c2-slate-practice-640.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
    { src: "/demo/img/coaching/c2-slates-hindi-640.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
    { src: "/demo/img/coaching/c4-notebook-writing-640.webp", alt: "", category: "Self study", hi: { category: "सेल्फ़ स्टडी" } },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "navprabhat@example.com",
    addressLines: ["Nav Prabhat Coaching Centre", "First floor, Example Road, near the tehsil", "Musafirkhana, Uttar Pradesh 227000"],
    hours: "Monday to Saturday, 6:30 to 8:00 am and 3:00 to 7:30 pm. Sunday, 8:00 to 11:00 am from November.",
    mapQuery: "Nav Prabhat Coaching Centre, Musafirkhana",
    landmark: "Above the cloth shop, opposite the tehsil gate",
    hi: {
      hours: "सोमवार से शनिवार, सुबह 6:30 से 8:00 और दोपहर 3:00 से शाम 7:30। नवंबर से रविवार, सुबह 8:00 से 11:00।",
      landmark: "कपड़े की दुकान के ऊपर, तहसील गेट के सामने",
      addressLines: ["नव प्रभात कोचिंग सेंटर", "पहली मंज़िल, Example Road, तहसील के पास", "मुसाफ़िरखाना, उत्तर प्रदेश 227000"],
    },
  },
});
