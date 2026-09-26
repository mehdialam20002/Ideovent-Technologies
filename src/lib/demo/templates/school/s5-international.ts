/**
 * TEMPLATE s5: INTERNATIONAL SCHOOL, IB AND CAMBRIDGE.
 *
 * Segment: an urban international day school in Bengaluru, age three to
 * eighteen, English first, market "india". It runs the combination most
 * Indian international schools actually run, rather than one pure
 * continuum: the IB Primary Years Programme to Grade 5, Cambridge Lower
 * Secondary in Grades 6 to 8, Cambridge IGCSE in Grades 9 and 10, and the IB
 * Diploma Programme in Grades 11 and 12. Programme names are written the way
 * the IB and Cambridge write them.
 * Registry: Modern family, `atlas` theme, hero B: full bleed with the
 * programme continuum strip on the bottom edge (ink-teal, sea glass, coral).
 * It was Classic `quiet-campus` before the multi-page rebuild. See ../index.ts.
 *
 * MULTI-PAGE CONTENT (26 September 2026). s5 is the 15-page international
 * site: Home, About, Admissions (Enquire, Visit, Apply, Assessment, Offer;
 * the age checker; published fees), Learning (the continuum), Faculty and
 * leadership, Campus, Student life, Results and destinations, Gallery, News,
 * Parents, Transport, Policies, Contact. Disclosure is in the set but drops
 * itself, because the school is not CBSE affiliated. Every text field has its Hindi twin in the object's own `hi` block.
 *
 * WHO READS IT, AND WHAT THEY ASK FIRST. A metro parent, often both parents
 * in technology or finance, some of them back from a posting abroad,
 * comparing three or four international schools on a laptop. The IB's own
 * India FAQ, the Bengaluru school guides and the parent write-ups on what
 * the brochures leave out come back to the same six questions:
 *   - WILL THE DIPLOMA CLOSE DOORS IN INDIA? The AIU equivalence, and whether
 *     JEE, NEET and CUET are open. The honest answer is "yes, if the subjects
 *     are chosen well", so the head says exactly that, the Diploma band's
 *     `detail` names the Higher Level subjects, and a dated information
 *     evening is on the visit band.
 *   - WHAT DOES IT COST ALL IN? Exam fees billed on top, textbooks, trips and
 *     a deposit are where the surprises are. Each band prints the year's fee
 *     and says what is billed at cost; the admissions note lists the rest
 *     and says there is no capitation or development charge.
 *   - WILL MY CHILD NEED A TUTOR? The commonest complaint about IB schools
 *     in India. The head answers it in one sentence.
 *   - CLASS SIZE AND RATIO, the languages, and WHERE THE GRADUATES GO. In
 *     `about` and in the results, which count Indian universities first,
 *     because that is where most of an Indian class actually goes.
 *
 * THE FAQ. The single-page renderer did not read one; the multi-page
 * Admissions page reads the questions grouped "Admissions", so there is one
 * now. The head's welcome and the band details still carry the big answers.
 *
 * THE "BOARD" LINE is kept to a short lead ("IB World School and Cambridge
 * centre") before the first comma, because the eyebrow prints that lead and
 * gives up on anything over 42 characters.
 *
 * THE INSTITUTE DOES NOT EXIST. Semal is the red silk-cotton tree, which
 * flowers along Bengaluru's roads in February. A search on 26 September 2026
 * for "Semal International School", "Semal School" and "Semal World School"
 * found no school by any of them (only a village government school in a
 * place called Semal, in Rajasthan). Sarjapur Road and Koramangala are real
 * parts of Bengaluru; nothing here describes a real school in either. The
 * phone, email, street, PIN and authorisation line are the reserved fiction
 * patterns in ../shape.ts. The email stays on example.com, which is reserved
 * and delivers to nobody, as the other nine templates do.
 */

import { SCHOOL_PAGE_SETS } from "../../site/pageSets";
import { defineTemplateContent } from "../shape";

export default defineTemplateContent("school", {
  /* ── KEPT: the page list for this segment ────────────────────────────── */
  sitePages: [...SCHOOL_PAGE_SETS["s5-international"]],

  /* ── KEPT (rule "stock"): the template's stock photographs. Licensed
        stock from public/demo/img, alt text from its manifest, describing
        the scene only. A duplicate carries them and the admin checklist
        says "Photos are stock photos from the template" until Mehdi
        replaces the hero with the institute's own. ───────────────────── */
  heroImage: "/demo/img/school/hero-international-library-800.webp",
  sectionPhotos: {
    about: "/demo/img/school/hero-residential-campus-800.webp",
    campus: "/demo/img/school/library-reading-hall-640.webp",
    academics: "/demo/img/school/lab-microscope-flask-640.webp",
    admissions: "/demo/img/school/activity-art-session-640.webp",
    labs: "/demo/img/school/lab-microscopes-640.webp",
    sports: "/demo/img/school/sports-basketball-640.webp",
    activities: "/demo/img/school/field-trip-museum-640.webp",
  },

  /* ── CLEARED: the year being recruited for and the priority deadline.
        The chip reads "Admissions 2027-28 open until 15 Jan 2027". ─────── */
  sessionLabel: "2027-28",
  hi: {
    tagline: "तीन से अठारह साल तक IB और Cambridge, और *एक क्लास में बीस बच्चे*।",
    about: "Semal International School 2009 में कोरमंगला के एक किराए के घर में 84 बच्चों के साथ शुरू हुआ। 2014 से यह सरजापुर रोड के पास बारह एकड़ के कैंपस पर है, और आज यहाँ 22 देशों के, तीन से अठारह साल के 712 स्टूडेंट्स पढ़ते हैं। एक क्लास में ज़्यादा से ज़्यादा बीस बच्चे, और हर आठ स्टूडेंट्स पर एक टीचर। बच्चे ग्रेड 5 तक IB Primary Years Programme पढ़ते हैं, ग्रेड 6 से 8 में Cambridge Lower Secondary, ग्रेड 9 और 10 में Cambridge IGCSE, और ग्रेड 11 और 12 में IB Diploma Programme। स्कूल की भाषा इंग्लिश है। हर बच्चा हिंदी या कन्नड़ भी सीखता है, और ग्रेड 6 से फ़्रेंच या स्पैनिश।",
    principalTitle: "स्कूल प्रमुख",
    principalMessage: "मैं उन्नीस साल से IB स्कूलों में पढ़ा रही हूँ, पुणे, सिंगापुर और यहाँ। पैरेंट्स मुझसे दो बातें पूछते हैं। क्या Diploma से भारत में रास्ते बंद हो जाएँगे? नहीं, अगर विषय सोच-समझकर चुने जाएँ, और इसीलिए काउंसलिंग ग्रेड 9 में शुरू होती है। क्या बच्चे को ट्यूशन की ज़रूरत पड़ेगी? नहीं पड़नी चाहिए, और अगर पड़े, तो हमने अपना काम ठीक से नहीं किया। किसी गुरुवार सुबह आइए और ग्रेड 4 की एक यूनिट ऑफ़ इन्क्वायरी में बैठकर देखिए।",
    resultsHeading: "2026 का बैच, और वे आगे कहाँ गए।",
    resultsNote: "इस हिस्से का हर आँकड़ा उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि रिज़ल्ट की सूची कैसी दिखेगी। आपके अपने रिज़ल्ट इसकी जगह लेंगे, लाइन दर लाइन, ठीक वैसे ही जैसे आप छापते हैं।",
    admissionsHeadline: "अगस्त 2027 के लिए आवेदन शुरू हैं। प्राथमिकता की आख़िरी तारीख़: शुक्रवार 15 जनवरी 2027",
    vision: "ऐसे युवा जो एक से ज़्यादा भाषा और एक से ज़्यादा विषय में सोच सकें, और अपना अगला क़दम, भारत में या विदेश में, पूरी समझ के साथ चुनें।",
    mission: "एक क्लास में बीस बच्चे और हर आठ स्टूडेंट्स पर एक टीचर। शुरुआती सालों में सवाल पूछकर सीखना, परीक्षा के सालों में पूरी मेहनत, और काउंसलिंग जो ग्रेड 12 में नहीं, ग्रेड 9 में शुरू होती है।",
    established: "2009 में शुरू",
    city: "बेंगलुरु",
    state: "कर्नाटक",
    boardOrAffiliation: "IB World School और Cambridge सेंटर, उदाहरण ऑथराइज़ेशन नं. 00000000",
    facilities: [
      "साइंस लैब: फिज़िक्स, केमिस्ट्री और बायोलॉजी",
      "लाइब्रेरी: छोटे बच्चों के लिए रीडिंग रूम और बड़ों के लिए रिसर्च की जगह",
      "स्टूडियो: आर्ट, डिज़ाइन, संगीत और ड्रामा",
      "खेल: खेल के मैदान और एक ढका हुआ कोर्ट",
      "डाइनिंग हॉल: हर स्कूल दिन दोपहर का खाना और नाश्ता",
      "हेल्थ सेंटर: स्कूल के पूरे समय ड्यूटी पर एक नर्स",
    ],
  },
  admissionsOpenUntil: "2027-01-15",
  vision: "Young people who can think in more than one language and more than one discipline, and who choose their next step, in India or abroad, with their eyes open.",
  mission: "Twenty to a class and one teacher for every eight students. Inquiry in the early years, rigour in the examination years, and counselling that starts in Grade 9, not Grade 12.",

  /* ── CLEARED: the proof row, each figure with its basis line ─────────── */
  stats: [
    { value: "712", label: "Students, ages 3 to 18", basis: "Roll on 18 August 2026", hi: { label: "स्टूडेंट्स, उम्र 3 से 18 साल", basis: "18 अगस्त 2026 की सूची" } },
    { value: "22", label: "Nationalities", basis: "By passport, August 2026", hi: { label: "देशों के बच्चे", basis: "पासपोर्ट के हिसाब से, अगस्त 2026" } },
    { value: "35.6", label: "IB Diploma average points", basis: "May 2026, 38 candidates, out of 45", hi: { label: "IB Diploma के औसत पॉइंट", basis: "मई 2026, 38 स्टूडेंट्स, 45 में से" } },
    { value: "20", label: "Students in a class, at most", basis: "16 in Early Years and the Diploma", hi: { label: "एक क्लास में ज़्यादा से ज़्यादा बच्चे", basis: "अर्ली ईयर्स और Diploma में 16" } },
  ],

  /* ── CLEARED: parents' words. Fiction on its face. ───────────────────── */
  reviews: [
    { quote: "We came back from Singapore in Grade 7 and were told to expect a hard year. It was a hard term, and then it was fine. The Checkpoint report in Grade 8 told us more than any report card had.", relation: "Parents of a Grade 9 student", source: "Example review written by Ideovent", consent: true, hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "हम ग्रेड 7 में सिंगापुर से लौटे, और कहा गया कि साल मुश्किल रहेगा। एक टर्म मुश्किल रहा, फिर सब ठीक हो गया। ग्रेड 8 की Checkpoint रिपोर्ट ने हमें किसी भी रिपोर्ट कार्ड से ज़्यादा बताया।", relation: "ग्रेड 9 के स्टूडेंट के पैरेंट्स" } },
    { quote: "Our daughter wanted engineering in India. The counsellor sat with us in Grade 9 and mapped the IGCSE options to the Diploma subjects JEE needs. Nobody had done that for us before.", relation: "Father of a Grade 11 student", source: "Example review written by Ideovent", consent: true, hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "हमारी बेटी भारत में इंजीनियरिंग करना चाहती थी। काउंसलर ने ग्रेड 9 में हमारे साथ बैठकर IGCSE के विकल्पों को उन Diploma विषयों से मिलाया जो JEE के लिए चाहिए। पहले किसी ने हमारे लिए ऐसा नहीं किया था।", relation: "ग्रेड 11 की स्टूडेंट के पिता" } },
    { quote: "The fee letter lists everything, including the exam fees two years out. We budgeted once.", relation: "Mother of two, Kindergarten and Grade 5", source: "Example review written by Ideovent", consent: true, hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "फीस की चिट्ठी में सब कुछ लिखा है, दो साल बाद की परीक्षा फीस तक। हमने बजट एक ही बार बनाया।", relation: "दो बच्चों की माँ, किंडरगार्टन और ग्रेड 5" } },
  ],

  /* ── CLEARED: the Learning page: the programme continuum ─────────────── */
  academics: {
    hi: {
      intro: "तीन से अठारह साल तक एक ही सिलसिला, दो फ़्रेमवर्क से बना। IB Primary Years Programme बच्चों को सवाल पूछना सिखाता है; Cambridge Lower Secondary और IGCSE उन्हें विषयों की जानकारी और परीक्षा की आदत देते हैं; IB Diploma दोनों का इस्तेमाल करवाता है। हर क़दम इस तरह चुना गया है कि अगला रास्ता खुला रहे, भारत में भी और विदेश में भी।",
      assessment: "Primary Years में अंकों की जगह पोर्टफ़ोलियो और स्टूडेंट-लेड कॉन्फ़्रेंस होती हैं। ग्रेड 6 से Cambridge और IB के मानकों पर आधारित मूल्यांकन, हर टर्म एक रिपोर्ट, और ग्रेड 8 में Checkpoint रिपोर्ट। IGCSE और Diploma के ग्रेड Cambridge और IB बाहर से देते हैं।",
    },
    intro: "One continuum from three to eighteen, built from two frameworks. The IB Primary Years Programme teaches children to ask questions; Cambridge Lower Secondary and IGCSE give them the subject knowledge and the examination habits; the IB Diploma asks them to use both. Every step is chosen so that the next one stays open, in India and abroad.",
    stages: [
      { title: "IB Primary Years Programme (Pre-K to Grade 5)", body: "Six units of inquiry a year across science, social studies and the arts, with English and mathematics taught every day. It ends with the Grade 5 Exhibition.", hi: { title: "IB Primary Years Programme (प्री-के से ग्रेड 5)", body: "साल में साइंस, सामाजिक अध्ययन और कला में फैली छह यूनिट ऑफ़ इन्क्वायरी, और इंग्लिश व गणित रोज़। इसका अंत ग्रेड 5 की Exhibition से होता है।" } },
      { title: "Cambridge Lower Secondary (Grade 6 to 8)", body: "English, mathematics, science and global perspectives, with a second language and French or Spanish. Grade 8 sits the Cambridge Checkpoint tests.", hi: { title: "Cambridge Lower Secondary (ग्रेड 6 से 8)", body: "इंग्लिश, गणित, साइंस और ग्लोबल पर्सपेक्टिव्स, एक दूसरी भाषा और फ़्रेंच या स्पैनिश के साथ। ग्रेड 8 Cambridge Checkpoint टेस्ट देता है।" } },
      { title: "Cambridge IGCSE (Grade 9 and 10)", body: "English, mathematics and a second language, with four options. Options are chosen with the university counsellor, because they decide which Diploma subjects are open.", hi: { title: "Cambridge IGCSE (ग्रेड 9 और 10)", body: "इंग्लिश, गणित और एक दूसरी भाषा, चार वैकल्पिक विषयों के साथ। विकल्प यूनिवर्सिटी काउंसलर के साथ चुने जाते हैं, क्योंकि इन्हीं से तय होता है कि Diploma के कौन-से विषय खुले रहेंगे।" } },
      { title: "IB Diploma Programme (Grade 11 and 12)", body: "Six subjects, three at Higher Level, with Theory of Knowledge, the Extended Essay and Creativity, Activity, Service. The AIU equivalence is filed for every student applying in India.", hi: { title: "IB Diploma Programme (ग्रेड 11 और 12)", body: "छह विषय, तीन Higher Level पर, साथ में Theory of Knowledge, Extended Essay और Creativity, Activity, Service। भारत में आवेदन करने वाले हर स्टूडेंट के लिए AIU इक्विवेलेंस फ़ाइल की जाती है।" } },
    ],
    assessment: "In the Primary Years, portfolios and student-led conferences replace marks. From Grade 6, criterion-based assessment against Cambridge and IB descriptors, with a report each term and a Checkpoint report in Grade 8. IGCSE and Diploma grades are awarded by Cambridge and the IB, externally.",
    calendar: [
      { title: "Student-led conferences, Kindergarten to Grade 8", date: "Friday 9 October 2026", hi: { title: "स्टूडेंट-लेड कॉन्फ़्रेंस, किंडरगार्टन से ग्रेड 8", date: "शुक्रवार 9 अक्टूबर 2026" } },
      { title: "Mid-term break", date: "19 to 23 October 2026", hi: { title: "मिड-टर्म छुट्टी", date: "19 से 23 अक्टूबर 2026" } },
      { title: "Diploma information evening", date: "Thursday 5 November 2026, 6:00 pm", hi: { title: "Diploma जानकारी सत्र", date: "गुरुवार 5 नवंबर 2026, शाम 6 बजे" } },
      { title: "IGCSE mock examinations", date: "26 October to 6 November 2026", hi: { title: "IGCSE मॉक परीक्षाएँ", date: "26 अक्टूबर से 6 नवंबर 2026" } },
      { title: "Winter break", date: "19 December 2026 to 4 January 2027", hi: { title: "सर्दी की छुट्टियाँ", date: "19 दिसंबर 2026 से 4 जनवरी 2027" } },
      { title: "Grade 5 Exhibition", date: "March 2027", hi: { title: "ग्रेड 5 की Exhibition", date: "मार्च 2027" } },
      { title: "IB and Cambridge examinations", date: "April and May 2027", hi: { title: "IB और Cambridge परीक्षाएँ", date: "अप्रैल और मई 2027" } },
      { title: "School year 2027-28 begins", date: "Monday 16 August 2027", hi: { title: "स्कूल का साल 2027-28 शुरू", date: "सोमवार 16 अगस्त 2027" } },
    ],
    downloads: [
      { label: "Curriculum guide, Pre-K to Grade 12", group: "Learning", hi: { label: "सिलेबस गाइड, प्री-के से ग्रेड 12", group: "पढ़ाई" } },
      { label: "IGCSE options booklet", group: "Learning", hi: { label: "IGCSE विषय विकल्प पुस्तिका", group: "पढ़ाई" } },
      { label: "Diploma subject choices and Indian university entry", group: "Learning", hi: { label: "Diploma के विषय और भारतीय यूनिवर्सिटी में एडमिशन", group: "पढ़ाई" } },
      { label: "Academic integrity policy", group: "Policies", hi: { label: "पढ़ाई में ईमानदारी की नीति", group: "नियम" } },
    ],
  },
  /* ── CLEARED ON DUPLICATE: identity ──────────────────────────────────── */
  instituteName: "Semal International School",
  /* One phrase in *asterisks* is set in the serif italic accent. */
  tagline: "IB and Cambridge from three to eighteen, and *twenty to a class*.",
  city: "Bengaluru",
  state: "Karnataka",

  /* ── KEPT: market, language and currency ─────────────────────────────── */
  country: "India",
  market: "india",
  currency: "INR",

  /* ── CLEARED: history and the authorisation line ─────────────────────── */
  established: "Founded 2009",
  establishedYear: "2009",
  boardOrAffiliation: "IB World School and Cambridge centre, example authorisation no. 00000000",

  about:
    "Semal International School opened in 2009 with 84 children in a rented house in Koramangala. Since 2014 it has been on a twelve-acre campus off Sarjapur Road, and it now teaches 712 students aged three to eighteen, from 22 nationalities. Classes are capped at twenty, with one teacher for every eight students. Children follow the IB Primary Years Programme to Grade 5, Cambridge Lower Secondary in Grades 6 to 8, Cambridge IGCSE in Grades 9 and 10, and the IB Diploma Programme in Grades 11 and 12. English is the language of the school. Every child also learns Hindi or Kannada, and from Grade 6, French or Spanish.",

  /* ── The head. Name and message CLEARED; the title is KEPT ───────────── */
  principalName: "Shalini Mathai",
  principalTitle: "Head of School",
  principalMessage:
    "I have taught in IB schools for nineteen years, in Pune, Singapore and here. Parents ask me two things. Will the Diploma close doors in India? Not if the subjects are chosen well, which is why counselling starts in Grade 9. Will my child need a tutor? They should not, and if one does, we have not done our job. Come on a Thursday morning and sit in on a Grade 4 unit of inquiry.",

  /* ── STRUCTURE: age bands. Name, level, subjects and timings are KEPT;
        seats, fee, feeNote and detail are CLEARED, so the ratio, the fee and
        what is billed on top live there.
        The FIRST band's level has no digit before the age, and the LAST
        band's level ends on the top age: the page reads "Ages 3 to 18" off
        exactly those two numbers. ─────────────────────────────────────── */
  courses: [
    {
      name: "Early Years",
      hi: {
        name: "अर्ली ईयर्स",
        seats: "16 बच्चे, एक टीचर और एक असिस्टेंट",
        level: "प्री-के और किंडरगार्टन, उम्र 3 से 5 साल",
        subjects: "भाषा, शुरुआती गिनती, खेल-खेल में सीखना, संगीत, हलचल और बाहर समय",
        timings: "सुबह 8:30 से दोपहर 1 बजे",
        feeNote: "सालाना, दोपहर का खाना और नाश्ता शामिल",
        detail: "IB Primary Years Programme का हिस्सा। पहले हफ़्ते माता-पिता में से एक क्लास में रुक सकते हैं, और ग्रेड 2 से पहले कोई लिखित होमवर्क नहीं।",
      },
      level: "Pre-K and Kindergarten, ages 3 to 5",
      subjects: "Language, early number, inquiry through play, music, movement and time outdoors",
      timings: "8:30 am to 1:00 pm",
      seats: "16 children, a teacher and an assistant",
      fee: "4,20,000",
      feeNote: "a year, lunch and snacks included",
      detail: "Part of the IB Primary Years Programme. A parent may stay in the room for the first week, and there is no written homework before Grade 2.",
    },
    {
      name: "Primary Years",
      hi: {
        name: "प्राइमरी ईयर्स",
        seats: "एक क्लास में 20",
        level: "ग्रेड 1 से 5, उम्र 6 से 10 साल",
        subjects: "इंग्लिश, गणित, साइंस और सामाजिक अध्ययन में यूनिट ऑफ़ इन्क्वायरी, हिंदी या कन्नड़, आर्ट, संगीत और फ़िज़िकल एजुकेशन",
        timings: "सुबह 8:15 से दोपहर 3:15 बजे",
        feeNote: "सालाना",
        detail: "IB Primary Years Programme। इसका अंत ग्रेड 5 की Exhibition से होता है: हर बच्चा अपनी पसंद का एक रिसर्च करता है और मार्च में पैरेंट्स के सामने पेश करता है।",
      },
      level: "Grade 1 to 5, ages 6 to 10",
      subjects: "English, mathematics, units of inquiry across science and social studies, Hindi or Kannada, art, music and physical education",
      timings: "8:15 am to 3:15 pm",
      seats: "20 to a class",
      fee: "6,40,000",
      feeNote: "a year",
      detail: "The IB Primary Years Programme. It ends with the Grade 5 Exhibition, a piece of research each child chooses and presents to parents in March.",
    },
    {
      name: "Lower Secondary",
      hi: {
        name: "लोअर सेकेंडरी",
        seats: "एक क्लास में 20",
        level: "ग्रेड 6 से 8, उम्र 11 से 13 साल",
        subjects: "इंग्लिश, गणित, साइंस, ग्लोबल पर्सपेक्टिव्स, इतिहास और भूगोल, एक दूसरी भाषा, फ़्रेंच या स्पैनिश, कंप्यूटिंग और कला",
        timings: "सुबह 8:15 से दोपहर 3:30 बजे",
        feeNote: "सालाना",
        detail: "Cambridge Lower Secondary। ग्रेड 8 Cambridge Checkpoint टेस्ट देता है, जिनकी जाँच Cambridge में होती है, ताकि IGCSE के विषय चुनने से पहले परिवार देख सके कि बच्चा कहाँ खड़ा है।",
      },
      level: "Grade 6 to 8, ages 11 to 13",
      subjects: "English, mathematics, science, global perspectives, history and geography, a second language, French or Spanish, computing and the arts",
      timings: "8:15 am to 3:30 pm",
      seats: "20 to a class",
      fee: "7,20,000",
      feeNote: "a year",
      detail: "Cambridge Lower Secondary. Grade 8 sits the Cambridge Checkpoint tests, marked in Cambridge, so a family can see where their child stands before choosing IGCSE subjects.",
    },
    {
      name: "IGCSE",
      hi: {
        level: "ग्रेड 9 से 10, उम्र 14 से 15 साल",
        seats: "एक क्लास में 20",
        subjects: "इंग्लिश, गणित और एक दूसरी भाषा, साथ में इनमें से चार विकल्प: साइंस, इकोनॉमिक्स, बिज़नेस, कंप्यूटर साइंस, इतिहास, भूगोल, और आर्ट एंड डिज़ाइन",
        timings: "सुबह 8:15 से दोपहर 3:30 बजे",
        feeNote: "सालाना, Cambridge परीक्षा फीस असल लागत पर अलग",
        detail: "विषय एक मीटिंग में चुने जाते हैं, जिसमें बच्चा, माता-पिता दोनों और यूनिवर्सिटी काउंसलर होते हैं, क्योंकि इन्हीं से तय होता है कि दो साल बाद Diploma के कौन-से विषय खुले रहेंगे।",
      },
      level: "Grade 9 to 10, ages 14 to 15",
      subjects: "English, mathematics and a second language, with four options from the sciences, economics, business, computer science, history, geography, and art and design",
      timings: "8:15 am to 3:30 pm",
      seats: "20 to a class",
      fee: "8,10,000",
      feeNote: "a year, Cambridge examination fees billed at cost",
      detail: "Options are chosen at a meeting with the child, both parents and the university counsellor, because they decide which Diploma subjects are open two years later.",
    },
    {
      name: "IB Diploma",
      hi: {
        level: "ग्रेड 11 से 12, उम्र 16 से 18 साल",
        seats: "एक क्लास में ज़्यादा से ज़्यादा 16",
        subjects: "छह विषय, तीन Higher Level पर, साथ में Theory of Knowledge, Extended Essay, और Creativity, Activity, Service",
        timings: "सुबह 8:15 से शाम 4 बजे",
        feeNote: "सालाना, IB परीक्षा फीस असल लागत पर अलग",
        detail: "JEE या NEET की तैयारी करने वाले स्टूडेंट्स Higher Level गणित, फिज़िक्स, और केमिस्ट्री या बायोलॉजी लेते हैं। भारत में आवेदन करने वाले हर स्टूडेंट के लिए काउंसलर AIU इक्विवेलेंस फ़ाइल करते हैं।",
      },
      level: "Grade 11 to 12, ages 16 to 18",
      subjects: "Six subjects, three at Higher Level, with Theory of Knowledge, the Extended Essay, and Creativity, Activity, Service",
      timings: "8:15 am to 4:00 pm",
      seats: "16 to a class at most",
      fee: "9,40,000",
      feeNote: "a year, IB examination fees billed at cost",
      detail: "Students aiming at JEE or NEET take Higher Level mathematics, physics, and chemistry or biology. The counsellor files the AIU equivalence for every student applying in India.",
    },
  ],

  /* ── CLEARED: results. Unit-carrying lines, no student named, ever.
        Universities in India are counted first, because that is where most
        of an Indian Diploma class goes. ─────────────────────────────────── */
  resultsHeading: "The class of 2026, and where they went.",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a result list is set. Your own results replace it line for line, exactly as you publish them.",
  results: [
    { achievement: "35.6 average points", exam: "IB Diploma", year: "2026", note: "38 candidates, out of a possible 45", category: "IB Diploma", hi: { achievement: "35.6 औसत पॉइंट", note: "38 स्टूडेंट्स, 45 में से" } },
    { achievement: "97% awarded the Diploma", exam: "IB Diploma", year: "2026", note: "37 of 38 candidates", category: "IB Diploma", hi: { achievement: "97% को Diploma मिला", note: "38 में से 37 स्टूडेंट्स" } },
    { achievement: "63% of grades at A* or A", exam: "Cambridge IGCSE", year: "2026", note: "44 candidates", category: "IGCSE", hi: { achievement: "63% ग्रेड A* या A", note: "44 स्टूडेंट्स" } },
    { achievement: "91% of grades at A* to C", exam: "Cambridge IGCSE", year: "2026", note: "44 candidates, 308 entries", category: "IGCSE", hi: { achievement: "91% ग्रेड A* से C", note: "44 स्टूडेंट्स, 308 विषय-परीक्षाएँ" } },
    { achievement: "34 of 38 at their first-choice university", exam: "University places", year: "2026", note: "19 in India, 8 in the UK, 4 in Canada, 3 in the Netherlands", category: "Destinations", hi: { category: "आगे की पढ़ाई", exam: "यूनिवर्सिटी में एडमिशन", achievement: "38 में से 34 अपनी पहली पसंद की यूनिवर्सिटी में", note: "19 भारत में, 8 UK में, 4 कनाडा में, 3 नीदरलैंड्स में" } },
    { achievement: "34.9 average points", exam: "IB Diploma", year: "2025", note: "35 candidates", category: "IB Diploma", hi: { achievement: "34.9 औसत पॉइंट", note: "35 स्टूडेंट्स" } },
    /* Acceptances by country: counts, never a named student. */
    { achievement: "19 students", destination: "Universities in India, including 3 through JEE and 2 through NEET", country: "India", exam: "University places", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "19 स्टूडेंट्स", exam: "यूनिवर्सिटी में एडमिशन", destination: "भारत की यूनिवर्सिटी, इनमें 3 JEE से और 2 NEET से", country: "भारत" } },
    { achievement: "8 students", destination: "Universities in the United Kingdom", country: "United Kingdom", exam: "University places", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "8 स्टूडेंट्स", exam: "यूनिवर्सिटी में एडमिशन", destination: "यूनाइटेड किंगडम की यूनिवर्सिटी", country: "यूनाइटेड किंगडम" } },
    { achievement: "4 students", destination: "Universities in Canada", country: "Canada", exam: "University places", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "4 स्टूडेंट्स", exam: "यूनिवर्सिटी में एडमिशन", destination: "कनाडा की यूनिवर्सिटी", country: "कनाडा" } },
    { achievement: "3 students", destination: "Universities in the Netherlands", country: "Netherlands", exam: "University places", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "3 स्टूडेंट्स", exam: "यूनिवर्सिटी में एडमिशन", destination: "नीदरलैंड्स की यूनिवर्सिटी", country: "नीदरलैंड्स" } },
    { achievement: "2 students", destination: "Universities in the United States", country: "United States", exam: "University places", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "2 स्टूडेंट्स", exam: "यूनिवर्सिटी में एडमिशन", destination: "अमेरिका की यूनिवर्सिटी", country: "अमेरिका" } },
  ],

  /* ── CLEARED: the results table in registered, passed, pass % columns ─── */
  boardResults: [
    { year: "2026", className: "IB Diploma", registered: "38", passed: "37", passPercent: "97.4%" },
    { year: "2026", className: "IGCSE", registered: "44", passed: "44", passPercent: "100%", note: "Five or more passes at A* to C", hi: { note: "A* से C तक पाँच या ज़्यादा विषयों में पास" } },
    { year: "2025", className: "IB Diploma", registered: "35", passed: "34", passPercent: "97.1%" },
    { year: "2025", className: "IGCSE", registered: "41", passed: "40", passPercent: "97.6%" },
    { year: "2024", className: "IB Diploma", registered: "31", passed: "31", passPercent: "100%" },
    { year: "2024", className: "IGCSE", registered: "39", passed: "39", passPercent: "100%" },
  ],

  /* ── KEPT WORD FOR WORD: facilities. What nearly every international day
        school has. "Lead: line" becomes a tile heading and one line under
        it, so both halves are written generic. The pool, the courtyard tree
        and the counselling office are not here: not every school has them,
        and a facility lands on a real school's page as a claim. ─────────── */
  facilities: [
    "Science laboratories: physics, chemistry and biology",
    "Library: a reading room for the younger years and a research space for the older",
    "Studios: art, design, music and drama",
    "Sports: playing fields and a covered court",
    "Dining hall: lunch and snacks served every school day",
    "Health centre: a nurse on duty through the school day",
  ],

  /* ── CLEARED: the Campus page, grouped ───────────────────────────────── */
  facilityDetails: [
    { title: "Early Years garden", body: "A walled garden with a mud kitchen, a sand pit and a covered deck, used every day the rain allows.", group: "Early Years", hi: { title: "अर्ली ईयर्स का बगीचा", body: "चारदीवारी वाला बगीचा, जिसमें मिट्टी की रसोई, रेत का गड्ढा और एक ढका हुआ डेक है, बारिश न हो तो रोज़ इस्तेमाल होता है।", group: "अर्ली ईयर्स" } },
    { title: "Science and design", body: "Six laboratories, a design and technology workshop with a laser cutter, and a greenhouse the Grade 6 class runs.", group: "Learning", hi: { title: "साइंस और डिज़ाइन", body: "छह लैब, लेज़र कटर वाली एक डिज़ाइन और टेक्नोलॉजी वर्कशॉप, और एक ग्रीनहाउस जिसे ग्रेड 6 चलाता है।", group: "पढ़ाई" } },
    { title: "Two libraries", body: "A picture-book library for the younger years and a research library with quiet rooms for the Extended Essay, open until 5:30 pm.", group: "Learning", hi: { title: "दो लाइब्रेरी", body: "छोटे बच्चों के लिए चित्र-किताबों की लाइब्रेरी, और Extended Essay के लिए शांत कमरों वाली रिसर्च लाइब्रेरी, शाम 5:30 बजे तक खुली।", group: "पढ़ाई" } },
    { title: "Studios and theatre", body: "Art, music and drama studios, practice rooms, and a 420-seat theatre used for assemblies and the spring musical.", group: "Arts", hi: { title: "स्टूडियो और थिएटर", body: "आर्ट, संगीत और ड्रामा के स्टूडियो, प्रैक्टिस रूम, और 420 सीटों का थिएटर, जहाँ असेंबली और स्प्रिंग म्यूज़िकल होते हैं।", group: "कला" } },
    { title: "Pool and fields", body: "A 25-metre pool, a full football field with a running track, and a covered multi-sport court for the monsoon.", group: "Sport", hi: { title: "स्विमिंग पूल और मैदान", body: "25 मीटर का पूल, रनिंग ट्रैक वाला फ़ुटबॉल का पूरा मैदान, और मानसून के लिए एक ढका हुआ मल्टी-स्पोर्ट कोर्ट।", group: "खेल" } },
    { title: "Dining hall", body: "Lunch and two snacks cooked on campus, with a vegetarian and a non-vegetarian line and an allergy register.", group: "Care", hi: { title: "डाइनिंग हॉल", body: "दोपहर का खाना और दो बार नाश्ता कैंपस पर बनता है, शाकाहारी और मांसाहारी की अलग लाइन, और एलर्जी का रजिस्टर।", group: "देखभाल" } },
    { title: "Health centre and counselling", body: "Two nurses, a visiting paediatrician, two counsellors and a learning-support team of five.", group: "Care", hi: { title: "हेल्थ सेंटर और काउंसलिंग", body: "दो नर्स, बाहर से आने वाले एक बच्चों के डॉक्टर, दो काउंसलर और पाँच लोगों की लर्निंग-सपोर्ट टीम।", group: "देखभाल" } },
  ],

  /* ── CLEARED: the Student life page (needs two or more) ──────────────── */
  studentLife: [
    { title: "Creativity, Activity, Service", body: "Every Diploma student runs a CAS project for eighteen months. This year's include a coding club at a government school nearby and a lake clean-up with the ward office.", hi: { title: "Creativity, Activity, Service", body: "हर Diploma स्टूडेंट अठारह महीने का एक CAS प्रोजेक्ट चलाता है। इस साल के प्रोजेक्ट में पास के एक सरकारी स्कूल में कोडिंग क्लब और वार्ड ऑफ़िस के साथ झील की सफ़ाई शामिल हैं।" } },
    { title: "Week without walls", body: "One residential trip a year from Grade 6, from a farm stay near Mysuru to a trek in Sikkim in Grade 10.", hi: { title: "वीक विदाउट वॉल्स", body: "ग्रेड 6 से हर साल एक ट्रिप, जिसमें रात बाहर रुकना होता है, मैसूर के पास फ़ार्म स्टे से लेकर ग्रेड 10 में सिक्किम के ट्रेक तक।" } },
    { title: "Sport", body: "Swimming, football, basketball, athletics and badminton, with inter-school fixtures against other international schools in the city.", hi: { title: "खेल", body: "स्विमिंग, फ़ुटबॉल, बास्केटबॉल, एथलेटिक्स और बैडमिंटन, शहर के दूसरे इंटरनेशनल स्कूलों के साथ मैच।" } },
    { title: "Model United Nations and debate", body: "A school conference each February and two away conferences a year.", hi: { title: "मॉडल यूनाइटेड नेशंस और डिबेट", body: "हर फ़रवरी स्कूल की अपनी कॉन्फ़्रेंस, और साल में दो बाहर की कॉन्फ़्रेंस।" } },
    { title: "Music and theatre", body: "An orchestra, two choirs, the spring musical, and a Grade 12 play written and directed by students.", hi: { title: "संगीत और थिएटर", body: "एक ऑर्केस्ट्रा, दो कॉयर, स्प्रिंग म्यूज़िकल, और ग्रेड 12 का एक नाटक जिसे स्टूडेंट्स ख़ुद लिखते और निर्देशित करते हैं।" } },
    { title: "Clubs after school", body: "Robotics, chess, the student newspaper, gardening and Kannada theatre, from 3:30 to 4:30 pm on Tuesdays and Thursdays.", hi: { title: "स्कूल के बाद क्लब", body: "रोबोटिक्स, शतरंज, स्टूडेंट अख़बार, बागवानी और कन्नड़ थिएटर, मंगलवार और गुरुवार को दोपहर 3:30 से 4:30 बजे।" } },
  ],

  /* ── CLEARED: faculty. Fictional names; each photo is a stock portrait (a
        licensed model, never the teacher), kept on duplicate for a row that
        survives, and never the same person twice. A name a stock face would
        contradict keeps its initials. ─────────────────────────────────── */
  faculty: [
    { name: "Shalini Mathai", photo: "/demo/img/people/teacher-w08-240.webp", role: "Head of School", group: "Leadership", qualification: "M.A. Education, IB leadership certificate", experience: "19 years in IB schools, in Pune, Singapore and here", hi: { group: "प्रबंधन", role: "स्कूल की प्रमुख", experience: "IB स्कूलों में 19 साल, पुणे, सिंगापुर और यहाँ", qualification: "M.A. एजुकेशन, IB लीडरशिप सर्टिफ़िकेट" } },
    { name: "Kavya Iyer", photo: "/demo/img/people/teacher-w12-240.webp", role: "Primary Years Programme coordinator", group: "Leadership", qualification: "M.Ed., IB certificate in teaching and learning", experience: "12 years", hi: { group: "प्रबंधन", role: "Primary Years Programme कोऑर्डिनेटर", experience: "12 साल", qualification: "M.Ed., IB टीचिंग एंड लर्निंग सर्टिफ़िकेट" } },
    { name: "Priyanka Deshmukh", photo: "/demo/img/people/teacher-w09-240.webp", role: "Diploma Programme coordinator", group: "Leadership", subject: "Mathematics, IB Diploma", qualification: "M.Sc. Mathematics, PGCE", experience: "13 years, and an IB examiner", style: "Starts every Higher Level class with a question from last year's paper.", hi: { qualification: "M.Sc. गणित, PGCE", group: "प्रबंधन", role: "Diploma Programme कोऑर्डिनेटर", subject: "गणित, IB Diploma", experience: "13 साल, और IB की परीक्षक", style: "Higher Level की हर क्लास पिछले साल के पेपर के एक सवाल से शुरू करती हैं।" } },
    { name: "Daniel Mensah", group: "Secondary", subject: "Physics, IGCSE and Diploma", qualification: "M.Sc. Physics, PGCE", experience: "11 years, in Accra, Leeds and here since 2021", style: "Half of every week is spent in the laboratory, not the classroom.", hi: { qualification: "M.Sc. फिज़िक्स, PGCE", group: "सेकेंडरी", subject: "फिज़िक्स, IGCSE और Diploma", experience: "11 साल, अक्रा, लीड्स में, और 2021 से यहाँ", style: "हर हफ़्ते का आधा समय क्लासरूम में नहीं, लैब में।" } },
    { name: "Ananya Raghunath", photo: "/demo/img/people/teacher-w10-240.webp", group: "Secondary", subject: "English, and Theory of Knowledge", qualification: "M.A. English Literature, B.Ed.", experience: "15 years, and coordinates the Extended Essay", hi: { qualification: "M.A. इंग्लिश साहित्य, B.Ed.", group: "सेकेंडरी", subject: "इंग्लिश, और Theory of Knowledge", experience: "15 साल, और Extended Essay की कोऑर्डिनेटर" } },
    { name: "Mireille Dufour", group: "Secondary", subject: "French and Spanish", qualification: "Master's in French as a foreign language", experience: "10 years, Grade 6 to 12", hi: { group: "सेकेंडरी", subject: "फ़्रेंच और स्पैनिश", experience: "10 साल, ग्रेड 6 से 12", qualification: "विदेशी भाषा के रूप में फ़्रेंच में मास्टर्स" } },
    { name: "Rohan D'Souza", photo: "/demo/img/people/teacher-m04-240.webp", group: "Primary", subject: "Primary Years, Grade 4", qualification: "B.El.Ed., IB certificate in teaching and learning", experience: "8 years, here since 2018", hi: { group: "प्राइमरी", subject: "Primary Years, ग्रेड 4", experience: "8 साल, 2018 से यहाँ", qualification: "B.El.Ed., IB टीचिंग एंड लर्निंग सर्टिफ़िकेट" } },
    { name: "Sunil Hegde", photo: "/demo/img/people/teacher-m07-240.webp", role: "University and careers counsellor", group: "Student support", subject: "Counselling", qualification: "M.A. Psychology, certificate in college counselling", experience: "Has guided every Diploma class since the first, in 2017", hi: { group: "स्टूडेंट सपोर्ट", role: "यूनिवर्सिटी और करियर काउंसलर", subject: "काउंसलिंग", experience: "2017 के पहले बैच से हर Diploma बैच को गाइड किया है", qualification: "M.A. साइकोलॉजी, कॉलेज काउंसलिंग सर्टिफ़िकेट" } },
  ],

  /* ── CLEARED: gallery. Captions only; they are also the shot list. ───── */
  gallery: [
    { src: "", alt: "The courtyard and the semal tree, in flower in February.", hi: { alt: "आँगन और सेमल का पेड़, फ़रवरी में फूलों से भरा।" } },
    { src: "", alt: "A Grade 4 unit of inquiry: mapping where the school's water comes from.", hi: { alt: "ग्रेड 4 की यूनिट ऑफ़ इन्क्वायरी: स्कूल का पानी कहाँ से आता है, इसका नक्शा।" } },
    { src: "", alt: "Diploma chemistry, an internal assessment in its third week.", hi: { alt: "Diploma केमिस्ट्री, इंटरनल असेसमेंट का तीसरा हफ़्ता।" } },
    { src: "", alt: "Kindergarten in the garden, before the afternoon rain.", hi: { alt: "दोपहर की बारिश से पहले बगीचे में किंडरगार्टन।" } },
    { src: "", alt: "The library at 3:45 pm, the week Extended Essay drafts are due.", hi: { alt: "दोपहर 3:45 बजे लाइब्रेरी, जिस हफ़्ते Extended Essay के ड्राफ़्ट जमा होते हैं।" } },
    { src: "", alt: "Student-led conferences: a Grade 2 child walks her parents through her work.", hi: { alt: "स्टूडेंट-लेड कॉन्फ़्रेंस: ग्रेड 2 की एक बच्ची अपने माता-पिता को अपना काम दिखाती है।" } },
  ],

  /* ── STOCK photos for the Gallery chips: src and category kept on
        duplicate, alt and caption cleared. Captions describe the scene. ─── */
  photos: [
    { src: "/demo/img/school/hero-international-library-800.webp", alt: "Two senior students reading between tall bookshelves in a library", caption: "Reading between the shelves", category: "Learning", hi: { alt: "लाइब्रेरी में ऊँची किताबों की अलमारियों के बीच पढ़ते दो सीनियर विद्यार्थी", caption: "अलमारियों के बीच पढ़ाई", category: "पढ़ाई" } },
    { src: "/demo/img/school/lab-microscope-flask-640.webp", alt: "A microscope and a flask of red liquid on a white lab table", caption: "A chemistry investigation", category: "Learning", hi: { alt: "सफ़ेद लैब टेबल पर माइक्रोस्कोप और लाल तरल से भरा फ़्लास्क", caption: "केमिस्ट्री का प्रयोग", category: "पढ़ाई" } },
    { src: "/demo/img/school/lab-microscopes-640.webp", alt: "A row of microscopes on a clean science lab bench", caption: "Microscopes on the bench", category: "Learning", hi: { alt: "साफ़ साइंस लैब की बेंच पर एक कतार में रखे माइक्रोस्कोप", caption: "बेंच पर माइक्रोस्कोप", category: "पढ़ाई" } },
    { src: "/demo/img/school/library-reading-hall-640.webp", alt: "A bright library with bookshelves and rows of reading tables", caption: "A quiet reading hall", category: "Campus", hi: { alt: "किताबों की अलमारियों और पढ़ने की मेज़ों वाली रोशन लाइब्रेरी", caption: "शांत रीडिंग हॉल", category: "कैंपस" } },
    { src: "/demo/img/school/activity-art-session-640.webp", alt: "Girls painting on paper while sitting on the floor in an art session", caption: "An art studio morning", category: "Arts", hi: { alt: "आर्ट सेशन में फ़र्श पर बैठकर काग़ज़ पर पेंटिंग करती लड़कियाँ", caption: "आर्ट स्टूडियो की सुबह", category: "कला" } },
    { src: "/demo/img/school/sports-basketball-640.webp", alt: "Teenage boys playing basketball on a colourful outdoor court", caption: "Basketball on the outdoor court", category: "Sport", hi: { alt: "रंगीन आउटडोर कोर्ट पर बास्केटबॉल खेलते किशोर लड़के", caption: "आउटडोर कोर्ट पर बास्केटबॉल", category: "खेल" } },
    { src: "/demo/img/school/sports-day-race-640.webp", alt: "Young athletes at the start line of a race on a running track", caption: "Athletics day", category: "Sport", hi: { alt: "रनिंग ट्रैक पर दौड़ की शुरुआती रेखा पर खड़े युवा धावक", caption: "एथलेटिक्स दिवस", category: "खेल" } },
    { src: "/demo/img/school/field-trip-museum-640.webp", alt: "A guide explaining an exhibit to a group of schoolboys in a museum", caption: "A museum visit", category: "Trips", hi: { alt: "संग्रहालय में स्कूली लड़कों के समूह को एक प्रदर्शनी समझाते गाइड", caption: "म्यूज़ियम की सैर", category: "ट्रिप" } },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  admissionsHeadline: "Applications for August 2027 are open. Priority deadline: Friday 15 January 2027",
  admissions: {
    hi: {
      dates: "ओपन मॉर्निंग, शनिवार 17 अक्टूबर: ग्रेड 11 के स्टूडेंट्स कैंपस दिखाते हैं, सुबह 9:30 से दोपहर 12 बजे\nDiploma जानकारी सत्र, गुरुवार 5 नवंबर: विषयों का चुनाव, JEE और NEET की पात्रता, और AIU इक्विवेलेंस, शाम 6 बजे\nप्राथमिकता की आख़िरी तारीख़, शुक्रवार 15 जनवरी 2027: अर्ली ईयर्स और ग्रेड 1 के लिए, जहाँ सीटें सबसे पहले भरती हैं\nनया स्कूल साल, सोमवार 16 अगस्त 2027: नए परिवार उससे पहले वाले शुक्रवार को आते हैं",
      note: "फीस तीन टर्म में ली जाती है और इसमें दोपहर का खाना, नाश्ता, किताबें, एक दिन की ट्रिप और लैपटॉप प्रोग्राम शामिल हैं। स्कूल बस हर रूट पर ₹72,000 सालाना है। IB और Cambridge की परीक्षा फीस परीक्षा वाले साल में असल लागत पर ली जाती है। ₹1,00,000 का वापसी योग्य डिपॉज़िट एक बार, एडमिशन के समय। कोई कैपिटेशन फीस नहीं, कोई डेवलपमेंट चार्ज नहीं।",
      whoCanApply: "प्री-के से ग्रेड 9 तक, और IB Diploma के लिए ग्रेड 11। ग्रेड 10 और ग्रेड 12 में सिर्फ़ वही स्टूडेंट लिए जाते हैं जो कहीं और यही प्रोग्राम पढ़ रहे हों।",
      assessment: "प्री-के से ग्रेड 2 तक के बच्चे एक सुबह क्लास में बिताते हैं, कोई टेस्ट नहीं। ग्रेड 3 से 9 इंग्लिश और गणित के छोटे ऑनलाइन टेस्ट भी देते हैं। Diploma के आवेदक कोऑर्डिनेटर से मिलते हैं और अपने अनुमानित ग्रेड साथ लाते हैं।",
      feeNote: "फीस तीन टर्म में ली जाती है, अगस्त, जनवरी और अप्रैल में। यह साल में एक बार, नए स्कूल साल के लिए बदलती है, साल के बीच में कभी नहीं। दूसरे बच्चे की ट्यूशन फीस पाँच प्रतिशत कम।",
      rteNote: "जहाँ कर्नाटक की RTE प्रक्रिया से बच्चों को स्कूल में सीट मिलती है, वहाँ एंट्री क्लास की वे सीटें सरकार की ऑनलाइन प्रक्रिया से भरी जाती हैं, स्कूल से नहीं, और उन पर कोई ट्यूशन फीस नहीं लगती।",
      ageAsOn: "1 जून 2027",
      steps: [
        "पूछताछ भेजिए, और प्रॉस्पेक्टस और फीस की पूरी सूची माँगिए।",
        "बच्चे के साथ आइए, किसी ओपन मॉर्निंग पर या हफ़्ते के किसी दिन के टूर पर।",
        "यहाँ लिखे डॉक्यूमेंट और मौजूदा स्कूल की रिपोर्ट के साथ ऑनलाइन आवेदन भेजिए।",
        "आपका बच्चा उस क्लास के साथ एक सुबह बिताता है जिसमें वह आएगा। बड़े बच्चे इंग्लिश और गणित का एक छोटा असेसमेंट भी देते हैं।",
      ],
      documents: [
        "जन्म प्रमाण पत्र",
        "बच्चे और माता-पिता दोनों के पासपोर्ट, विदेश से आए परिवारों के लिए वीज़ा या OCI कार्ड के साथ",
        "इस साल और पिछले साल की स्कूल रिपोर्ट",
        "पिछले स्कूल का ट्रांसफ़र सर्टिफ़िकेट या लीविंग लेटर",
        "टीकाकरण का रिकॉर्ड",
        "लर्निंग सपोर्ट या मेडिकल की कोई भी रिपोर्ट, ताकि क्लास टीचर आपके बच्चे के लिए तैयारी कर सकें",
      ],
    },
    /* CLEARED. One row per line; the text before the first colon heads it.
       The school year runs August to June, as it does at most international
       schools in the city. */
    dates: [
      "Open morning, Saturday 17 October: tours led by Grade 11 students, 9:30 am to 12:00 noon",
      "Diploma information evening, Thursday 5 November: subject choices, JEE and NEET eligibility, and the AIU equivalence, 6:00 pm",
      "Priority deadline, Friday 15 January 2027: for Early Years and Grade 1, where places fill first",
      "New school year, Monday 16 August 2027: families new to the school come in on the Friday before",
    ].join("\n"),
    /* KEPT, so generic: how any international day school admits a child. */
    steps: [
      "Send an enquiry, and ask for the prospectus and the full fee schedule.",
      "Visit with your child, on an open morning or on a weekday tour.",
      "Submit the application online, with the documents listed here and the reports from the current school.",
      "Your child spends a morning with the class they would join. Older children also sit a short assessment in English and mathematics.",
    ],
    /* KEPT, so generic. The passports and the learning-support reports are
       what an international school actually asks for. */
    documents: [
      "Birth certificate",
      "Passports of the child and of both parents, with the visa or OCI card for families from overseas",
      "School reports from the current and the previous year",
      "Transfer certificate or leaving letter from the previous school",
      "Immunisation record",
      "Any learning support or medical reports, so that the class teacher can plan for your child",
    ],
    /* CLEARED. The all-in cost: what the fee covers and what is billed on
       top, which is where international school fees surprise families. */
    note: "Fees are billed in three terms and cover lunch, snacks, textbooks, day trips and the laptop programme. The school bus is ₹72,000 a year on every route. IB and Cambridge examination fees are billed at cost in the examination year. A refundable deposit of ₹1,00,000 is paid once, on joining. There is no capitation fee and no development charge.",
    whoCanApply: "Pre-K to Grade 9, and Grade 11 for the IB Diploma. Grade 10 and Grade 12 take a student only when they are moving from the same programme elsewhere.",
    assessment: "Pre-K to Grade 2 spend a morning in class, with no test. Grade 3 to 9 also sit short online assessments in English and mathematics. Diploma applicants meet the coordinator and bring their predicted grades.",
    timeline: [
      { title: "Enquire", date: "Any time", body: "Send an enquiry and ask for the prospectus and the fee schedule.", hi: { title: "पूछताछ", date: "कभी भी", body: "पूछताछ भेजिए और प्रॉस्पेक्टस और फीस की सूची माँगिए।" } },
      { title: "Visit", date: "Open morning, Saturday 17 October 2026", body: "Or a weekday tour, Tuesday and Thursday at 9:30 am.", hi: { title: "विज़िट", date: "ओपन मॉर्निंग, शनिवार 17 अक्टूबर 2026", body: "या हफ़्ते के दिन टूर, मंगलवार और गुरुवार सुबह 9:30 बजे।" } },
      { title: "Apply", date: "Priority deadline, Friday 15 January 2027", body: "Online, with reports from the current and previous year.", hi: { title: "आवेदन", date: "प्राथमिकता की आख़िरी तारीख़, शुक्रवार 15 जनवरी 2027", body: "ऑनलाइन, इस साल और पिछले साल की रिपोर्ट के साथ।" } },
      { title: "Assessment", date: "Within three weeks of applying", body: "A morning in class; from Grade 3, English and mathematics online.", hi: { title: "असेसमेंट", date: "आवेदन के तीन हफ़्ते के अंदर", body: "एक सुबह क्लास में; ग्रेड 3 से इंग्लिश और गणित ऑनलाइन।" } },
      { title: "Offer", date: "Within two weeks of the assessment", body: "Confirm with the admission fee and the deposit within fourteen days.", hi: { title: "ऑफ़र", date: "असेसमेंट के दो हफ़्ते के अंदर", body: "चौदह दिन के अंदर एडमिशन फीस और डिपॉज़िट देकर सीट पक्की कीजिए।" } },
    ],
    fees: [
      { label: "Application fee", amount: "₹10,000", period: "one-time", note: "Not refunded", hi: { label: "आवेदन फीस", note: "वापस नहीं होती" } },
      { label: "Admission fee", amount: "₹2,50,000", period: "one-time", note: "Paid once, on accepting the offer", hi: { label: "एडमिशन फीस", note: "एक बार, ऑफ़र स्वीकार करते समय" } },
      { label: "Refundable deposit", amount: "₹1,00,000", period: "one-time", note: "Returned when the student leaves", hi: { label: "वापसी योग्य डिपॉज़िट", note: "स्टूडेंट के स्कूल छोड़ने पर वापस" } },
      { label: "Early Years, Pre-K and Kindergarten", amount: "₹4,20,000", period: "annual", note: "In three terms. Lunch and snacks included", hi: { label: "अर्ली ईयर्स, प्री-के और किंडरगार्टन", note: "तीन टर्म में। दोपहर का खाना और नाश्ता शामिल" } },
      { label: "Primary Years, Grade 1 to 5", amount: "₹6,40,000", period: "annual", note: "In three terms", hi: { label: "प्राइमरी ईयर्स, ग्रेड 1 से 5", note: "तीन टर्म में" } },
      { label: "Lower Secondary, Grade 6 to 8", amount: "₹7,20,000", period: "annual", note: "In three terms", hi: { label: "लोअर सेकेंडरी, ग्रेड 6 से 8", note: "तीन टर्म में" } },
      { label: "IGCSE, Grade 9 and 10", amount: "₹8,10,000", period: "annual", note: "In three terms", hi: { label: "IGCSE, ग्रेड 9 और 10", note: "तीन टर्म में" } },
      { label: "IB Diploma, Grade 11 and 12", amount: "₹9,40,000", period: "annual", note: "In three terms", hi: { label: "IB Diploma, ग्रेड 11 और 12", note: "तीन टर्म में" } },
      { label: "School bus", amount: "₹72,000", period: "also", note: "A year, any route, only if you use it", hi: { label: "स्कूल बस", note: "सालाना, कोई भी रूट, सिर्फ़ इस्तेमाल करने पर" } },
      { label: "Cambridge and IB examination fees", amount: "At cost", period: "also", note: "In Grade 8, 10 and 12 only", hi: { label: "Cambridge और IB परीक्षा फीस", amount: "असल लागत पर", note: "सिर्फ़ ग्रेड 8, 10 और 12 में" } },
      { label: "Week without walls", amount: "₹18,000 to ₹42,000", period: "also", note: "A year from Grade 6, by destination", hi: { label: "वीक विदाउट वॉल्स", amount: "₹18,000 से ₹42,000", note: "ग्रेड 6 से सालाना, जगह के हिसाब से" } },
      { label: "Uniform and sports kit", amount: "About ₹14,000", period: "also", note: "First year", hi: { label: "यूनिफ़ॉर्म और स्पोर्ट्स किट", amount: "लगभग ₹14,000", note: "पहला साल" } },
    ],
    feeNote: "Fees are billed in three terms, in August, January and April. They are revised once a year, for the new school year, and never mid-year. A second child pays five percent less tuition.",
    ageAsOn: "1 June 2027",
    ageRules: [
      { className: "Pre-K", minAge: "3", maxAge: "4", hi: { className: "प्री-के" } },
      { className: "Kindergarten 1", minAge: "4", maxAge: "5", hi: { className: "किंडरगार्टन 1" } },
      { className: "Kindergarten 2", minAge: "5", maxAge: "6", hi: { className: "किंडरगार्टन 2" } },
      { className: "Grade 1", minAge: "6", maxAge: "7", hi: { className: "ग्रेड 1" } },
    ],
    rteNote: "Where the Karnataka RTE process places children at the school, those seats at the entry class are filled through the government's online process, not by the school, and carry no tuition fee.",
  },

  /* ── CLEARED: questions. The two marked generic survive a duplicate. ─── */
  faq: [
    { title: "Can we visit before applying?", body: "Yes. Come to an open morning or book a weekday tour, and bring your child if you can.", group: "Admissions", generic: true, hi: { title: "क्या आवेदन से पहले स्कूल देख सकते हैं?", body: "हाँ। ओपन मॉर्निंग पर आइए या हफ़्ते के दिन टूर बुक कीजिए, और हो सके तो बच्चे को साथ लाइए।", group: "एडमिशन" } },
    { title: "Does my child need to speak fluent English to join?", body: "Not in the early years. From Grade 3, a child who needs English support gets it in small groups alongside the class, and the assessment tells us how much.", group: "Admissions", hi: { title: "क्या एडमिशन के लिए बच्चे को फ़र्राटेदार इंग्लिश आनी चाहिए?", body: "शुरुआती सालों में नहीं। ग्रेड 3 से, जिस बच्चे को इंग्लिश में मदद चाहिए, उसे क्लास के साथ-साथ छोटे ग्रुप में मदद मिलती है, और असेसमेंट से पता चलता है कि कितनी।", group: "एडमिशन" } },
    { title: "Will the IB Diploma let my child sit JEE, NEET or CUET?", body: "Yes, with the right subjects: Higher Level mathematics, physics, and chemistry or biology for JEE and NEET. The AIU equivalence is filed for every student applying in India.", group: "Admissions", hi: { title: "क्या IB Diploma के बाद बच्चा JEE, NEET या CUET दे सकता है?", body: "हाँ, सही विषयों के साथ: JEE और NEET के लिए Higher Level गणित, फिज़िक्स, और केमिस्ट्री या बायोलॉजी। भारत में आवेदन करने वाले हर स्टूडेंट के लिए AIU इक्विवेलेंस फ़ाइल की जाती है।", group: "एडमिशन" } },
    { title: "Is there a sibling discount?", body: "A second child pays five percent less tuition. There is no discount on the admission fee or the deposit.", group: "Fees", hi: { title: "क्या भाई-बहन पर छूट है?", body: "दूसरे बच्चे की ट्यूशन फीस पाँच प्रतिशत कम। एडमिशन फीस या डिपॉज़िट पर कोई छूट नहीं।", group: "फीस" } },
    { title: "Does the school offer scholarships?", body: "Four need-based places a year in the Diploma, up to the full fee, decided on family income after an offer.", group: "Fees", hi: { title: "क्या स्कूल स्कॉलरशिप देता है?", body: "Diploma में हर साल ज़रूरत के आधार पर चार सीटें, पूरी फीस तक, ऑफ़र के बाद परिवार की आमदनी पर तय।", group: "फीस" } },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Open morning, Saturday 17 October",
      hi: {
        title: "ओपन मॉर्निंग, शनिवार 17 अक्टूबर",
        date: "24 सितंबर 2026",
        body: "ग्रेड 11 के स्टूडेंट्स कैंपस दिखाते हैं, और स्कूल प्रमुख सुबह 11:30 बजे लाइब्रेरी में सवालों के जवाब देती हैं। रजिस्टर करने के लिए एडमिशन ऑफ़िस को फ़ोन कीजिए या WhatsApp मैसेज भेजिए।",
      },
      date: "24 September 2026",
      body: "Grade 11 students lead the tours, and the Head of School takes questions in the library at 11:30 am. Call the admissions office or send a WhatsApp message to register.",
      pinned: true,
      kind: "event",
      posted: "2026-09-24",
      expires: "2026-10-17",
    },
    {
      title: "Student-led conferences, Friday 9 October",
      hi: {
        title: "स्टूडेंट-लेड कॉन्फ़्रेंस, शुक्रवार 9 अक्टूबर",
        date: "18 सितंबर 2026",
        body: "किंडरगार्टन से ग्रेड 8 तक, बच्चे बीस-बीस मिनट के स्लॉट में अपने पैरेंट्स को अपना काम ख़ुद दिखाते हैं। उस दिन इन ग्रेड की क्लास नहीं होंगी, और बसें सिर्फ़ ग्रेड 9 से 12 के लिए चलेंगी।",
      },
      date: "18 September 2026",
      body: "From Kindergarten to Grade 8, children walk their parents through their own work in twenty-minute slots. There are no lessons that day for those grades, and the buses run for Grades 9 to 12 only.",
      kind: "event",
      posted: "2026-09-18",
      expires: "2026-10-09",
    },
    {
      title: "IGCSE mock examinations",
      hi: {
        title: "IGCSE मॉक परीक्षाएँ",
        date: "11 सितंबर 2026",
        body: "ग्रेड 10, सोमवार 26 अक्टूबर से शुक्रवार 6 नवंबर तक। टाइमटेबल स्टूडेंट पोर्टल पर है, और दोनों हफ़्ते लाइब्रेरी शाम 5:30 बजे तक खुली रहेगी।",
      },
      date: "11 September 2026",
      body: "Grade 10, from Monday 26 October to Friday 6 November. The timetable is on the student portal, and the library stays open until 5:30 pm through both weeks.",
      kind: "notice",
      posted: "2026-09-11",
      expires: "2026-11-06",
    },
    {
      title: "Mid-term break",
      hi: {
        title: "मिड-टर्म छुट्टी",
        date: "4 सितंबर 2026",
        body: "स्कूल सोमवार 19 अक्टूबर से शुक्रवार 23 अक्टूबर तक बंद रहेगा और सोमवार 26 अक्टूबर को खुलेगा। एडमिशन ऑफ़िस सुबह 9 से दोपहर 1 बजे तक खुला रहेगा।",
      },
      date: "4 September 2026",
      body: "School is closed from Monday 19 October to Friday 23 October and reopens on Monday 26 October. The admissions office stays open, 9:00 am to 1:00 pm.",
      kind: "notice",
      posted: "2026-09-04",
      expires: "2026-10-26",
    },
    {
      title: "Diploma information evening, Thursday 5 November",
      hi: {
        title: "Diploma जानकारी सत्र, गुरुवार 5 नवंबर",
        date: "15 सितंबर 2026",
        body: "विषयों का चुनाव, JEE और NEET की पात्रता, और AIU इक्विवेलेंस, ग्रेड 9 और 10 के परिवारों और आवेदकों के लिए। शाम 6 बजे थिएटर में।",
      },
      date: "15 September 2026",
      body: "Subject choices, JEE and NEET eligibility, and the AIU equivalence, for Grade 9 and 10 families and applicants. 6:00 pm in the theatre.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2026-11-05",
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    hi: {
      hours: "एडमिशन ऑफ़िस सोमवार से शुक्रवार, सुबह 8:30 से शाम 4:30 बजे तक खुला, और अक्टूबर में शनिवार सुबह भी।",
      landmark: "सरजापुर रोड के पास, दोम्मसंद्रा सर्कल से 2 किमी आगे, झील के सामने",
      addressLines: ["Semal International School", "Example Road, सरजापुर रोड के पास", "बेंगलुरु, कर्नाटक 560000"],
    },
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "admissions@example.com",
    addressLines: ["Semal International School", "Example Road, off Sarjapur Road", "Bengaluru, Karnataka 560000"],
    hours: "Admissions office open Monday to Friday, 8:30 am to 4:30 pm, and on Saturday mornings in October.",
    mapQuery: "Semal International School, Bengaluru",
    landmark: "Off Sarjapur Road, 2 km past the Dommasandra circle, opposite the lake",
    transportDesk: "+91 00000 00000",
  },

  /* ── CLEARED: the Parents page. Links only, example.com in a template. ── */
  portalLinks: [
    { label: "Family portal", url: "https://example.com/families", audience: "Parents", note: "Reports, timetables, the calendar and trip consent", hi: { label: "फ़ैमिली पोर्टल", audience: "पैरेंट्स", note: "रिपोर्ट, टाइमटेबल, कैलेंडर और ट्रिप की सहमति" } },
    { label: "Learning platform", url: "https://example.com/learning", audience: "Students", note: "Assignments and class pages", hi: { label: "लर्निंग प्लैटफ़ॉर्म", audience: "स्टूडेंट्स", note: "असाइनमेंट और क्लास के पेज" } },
    { label: "Pay fees", url: "https://example.com/fees", audience: "Parents", note: "Termly invoices, with receipts", hi: { label: "फीस भरें", audience: "पैरेंट्स", note: "हर टर्म का बिल, रसीद के साथ" } },
  ],
  downloads: [
    { label: "School calendar 2026-27", group: "Calendar", hi: { label: "स्कूल कैलेंडर 2026-27", group: "कैलेंडर" } },
    { label: "Uniform and kit list", group: "Lists", hi: { label: "यूनिफ़ॉर्म और किट की सूची", group: "सूची" } },
    { label: "Bus routes and timings", group: "Transport", hi: { label: "बस के रूट और समय", group: "ट्रांसपोर्ट" } },
    { label: "Medical and consent form", group: "Forms", hi: { label: "मेडिकल और सहमति फ़ॉर्म", group: "फ़ॉर्म" } },
  ],

  /* ── CLEARED: the Transport page. Routes and timings, never a driver. ─── */
  transport: {
    hi: {
      intro: "छह रूट पर चौदह AC बसें, हर बस में एक ट्रेंड अटेंडेंट। हर रूट की एक ही फीस।",
      feeNote: "किसी भी रूट पर ₹72,000 सालाना, टर्म की फीस के साथ। रूट टर्म की शुरुआत में बदला जा सकता है।",
      safety: [
        "हर बस में, हर ट्रिप पर एक ट्रेंड अटेंडेंट",
        "GPS से लाइव ट्रैकिंग, और फ़ैमिली पोर्टल पर बस पहुँचने की सूचना",
        "हर बस के अंदर CCTV, और हर सीट पर सीट बेल्ट",
        "ग्रेड 6 से छोटे बच्चे स्टॉप पर सिर्फ़ सूची वाले बड़े को सौंपे जाते हैं",
      ],
    },
    intro: "Fourteen air-conditioned buses on six routes, each with a trained attendant. One fee for every route.",
    routes: [
      { name: "Route 1, Koramangala", stops: ["Forum junction", "Koramangala 5th block", "St. John's signal"], pickup: "7:05 am", drop: "4:05 pm", hi: { name: "रूट 1, कोरमंगला", stops: ["फ़ोरम जंक्शन", "कोरमंगला 5वाँ ब्लॉक", "सेंट जॉन्स सिग्नल"], pickup: "सुबह 7:05", drop: "शाम 4:05" } },
      { name: "Route 2, HSR Layout", stops: ["HSR sector 1", "HSR sector 6", "Agara lake"], pickup: "7:15 am", drop: "3:55 pm", hi: { name: "रूट 2, HSR लेआउट", stops: ["HSR सेक्टर 1", "HSR सेक्टर 6", "अगरा झील"], pickup: "सुबह 7:15", drop: "दोपहर 3:55" } },
      { name: "Route 3, Bellandur and Kadubeesanahalli", stops: ["Bellandur gate", "Ecospace", "Kadubeesanahalli"], pickup: "7:20 am", drop: "3:50 pm", hi: { name: "रूट 3, बेलंदूर और कडुबीसनहल्ली", stops: ["बेलंदूर गेट", "इकोस्पेस", "कडुबीसनहल्ली"], pickup: "सुबह 7:20", drop: "दोपहर 3:50" } },
      { name: "Route 4, Whitefield", stops: ["ITPL main road", "Brookefield", "Varthur Kodi"], pickup: "6:50 am", drop: "4:20 pm", hi: { name: "रूट 4, व्हाइटफ़ील्ड", stops: ["ITPL मेन रोड", "ब्रुकफ़ील्ड", "वर्थुर कोडी"], pickup: "सुबह 6:50", drop: "शाम 4:20" } },
      { name: "Route 5, Electronic City", stops: ["Phase 1 toll", "Hosa Road", "Kudlu gate"], pickup: "6:55 am", drop: "4:15 pm", hi: { name: "रूट 5, इलेक्ट्रॉनिक सिटी", stops: ["फ़ेज़ 1 टोल", "होसा रोड", "कुडलू गेट"], pickup: "सुबह 6:55", drop: "शाम 4:15" } },
      { name: "Route 6, Sarjapur town", stops: ["Sarjapur circle", "Chikka Kannalli", "Kodathi"], pickup: "7:25 am", drop: "3:45 pm", hi: { name: "रूट 6, सरजापुर टाउन", stops: ["सरजापुर सर्कल", "चिक्का कन्नल्ली", "कोडती"], pickup: "सुबह 7:25", drop: "दोपहर 3:45" } },
    ],
    safety: [
      "A trained attendant on every bus, every trip",
      "GPS with live tracking and arrival alerts on the family portal",
      "CCTV inside every bus, and seat belts on every seat",
      "Students are handed over at the stop only to a listed adult below Grade 6",
    ],
    feeNote: "₹72,000 a year on any route, billed with the term fees. Route changes at the start of a term.",
  },

  /* ── CLEARED: the Policies page ──────────────────────────────────────── */
  policies: [
    { title: "Safeguarding and child protection", body: "Every adult is background checked before starting and trained every year. The designated safeguarding lead is the senior counsellor, and any concern is recorded and acted on the same day, including a report under POCSO where the law requires it.", hi: { title: "बच्चों की सुरक्षा और संरक्षण", body: "हर बड़े व्यक्ति की नौकरी शुरू करने से पहले बैकग्राउंड जाँच होती है और हर साल ट्रेनिंग। सुरक्षा के ज़िम्मेदार सीनियर काउंसलर हैं, और हर चिंता उसी दिन दर्ज करके उस पर कार्रवाई होती है, जहाँ क़ानून कहे वहाँ POCSO के तहत रिपोर्ट समेत।" } },
    { title: "Admissions and inclusion", body: "We admit students who can access our programmes with the support we can offer, and say plainly when we cannot. Learning-support needs shared at application are never a reason on their own to refuse a place.", hi: { title: "एडमिशन और समावेश", body: "हम उन स्टूडेंट्स को लेते हैं जो हमारी दी जा सकने वाली मदद के साथ हमारे प्रोग्राम पढ़ सकें, और जब नहीं ले सकते तो साफ़ कहते हैं। आवेदन में बताई गई लर्निंग-सपोर्ट की ज़रूरत अकेले कभी सीट न देने की वजह नहीं होती।" } },
    { title: "Academic integrity", body: "The IB and Cambridge rules on plagiarism, collusion and the use of AI tools, explained to every student in Grade 9 and again in Grade 11.", hi: { title: "पढ़ाई में ईमानदारी", body: "नकल, मिलीभगत और AI टूल्स के इस्तेमाल पर IB और Cambridge के नियम, जो हर स्टूडेंट को ग्रेड 9 में और फिर ग्रेड 11 में समझाए जाते हैं।" } },
    { title: "Fee refund and withdrawal", body: "One term's notice in writing, or one term's fee in lieu. The deposit is refunded within thirty days of leaving.", hi: { title: "फीस वापसी और स्कूल छोड़ना", body: "एक टर्म का लिखित नोटिस, या नोटिस की जगह एक टर्म की फीस। डिपॉज़िट स्कूल छोड़ने के तीस दिन के अंदर वापस होता है।" } },
    { title: "Student data and privacy", body: "We keep what admission and the examination boards need, on systems that meet India's data protection law, and never share it for marketing.", hi: { title: "स्टूडेंट का डेटा और प्राइवेसी", body: "हम उतना ही रखते हैं जितना एडमिशन और परीक्षा बोर्ड को चाहिए, ऐसे सिस्टम पर जो भारत के डेटा प्रोटेक्शन क़ानून को मानते हैं, और मार्केटिंग के लिए कभी किसी को नहीं देते।" } },
  ],
});
