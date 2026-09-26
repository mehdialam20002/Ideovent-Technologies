/**
 * TEMPLATE s4: RESIDENTIAL SCHOOL.
 *
 * Segment: a boarding school in the Kumaon hills, Class IV to XII, ICSE and
 * ISC, boys and girls, no day scholars. The school's age, its houses and the
 * way it looks after a child far from home are the argument.
 * Registry: Classic family, `pinewood` theme, hero A: the masthead with a
 * ruled facts line and a 21:9 band (pine, brass, parchment). See ../index.ts.
 *
 * MULTI-PAGE CONTENT (26 September 2026). s4 is the 15-page boarding site:
 * Home, About (with houses), Admissions (entry classes with age windows, the
 * assessment centres and dates), Academics, Boarding, Student life, Faculty,
 * Facilities, Results with university destinations, Gallery, News with the
 * term calendar, Parents (portal, fees, term travel), Policies, Contact with
 * how to reach. Disclosure is in the set but drops itself: this is an ICSE
 * school, and the CBSE Appendix IX does not apply. Every text field has its Hindi
 * twin in the object's own `hi` block (26 September 2026).
 *
 * WHO READS IT, AND WHAT THEY ASK FIRST. A parent who lives in another city,
 * often a day's journey away, sending a nine- to thirteen-year-old. Boarding
 * guides and the published hostel rules of Indian boarding schools agree on
 * the questions: HOW WILL I HEAR from my child (the call-home rule: most
 * schools allow one call a week, on a fixed day), who LOOKS AFTER them at
 * night (the house, the housemaster, the matron, dormitory size), what
 * happens when they are ILL (the infirmary, and whether the school calls
 * you), what is the DAY (rising bell to lights out), what are WEEKENDS and
 * VISITING days (outings on a fixed weekend, signed out and back in), what
 * is the FOOD, and what does it cost ALL IN, since boarding fees are where
 * the surprise charges hide. So:
 *   - the head's welcome sits first (the theme puts it there) and answers
 *     "how will I know my child is all right" in three concrete promises;
 *   - `about` names the houses, the house staff and the dormitory size;
 *   - each age band's `timings` is the boarding day, rising bell to lights
 *     out, because for a boarder that IS the timetable;
 *   - the admissions note says what the fee covers and what is billed at
 *     cost, with receipts;
 *   - the visit band carries the visiting weekend and the escorted journeys
 *     home, because a parent in Delhi plans around both;
 *   - the year runs March to November with a long winter at home, as it does
 *     at hill schools.
 *
 * THE INSTITUTE DOES NOT EXIST. Buransh is the Himalayan rhododendron; a
 * search on 26 September 2026 found no school called Buransh Hill School.
 * Almora is a real town; the four house names are real peaks visible from
 * the Kumaon ridges, which is how hill schools name houses, and name no
 * person. The phone, email, street, PIN and affiliation line are the
 * reserved fiction patterns in ../shape.ts.
 */

import { SCHOOL_PAGE_SETS } from "../../site/pageSets";
import { defineTemplateContent } from "../shape";

export default defineTemplateContent("school", {
  /* ── KEPT: the page list for this segment ────────────────────────────── */
  sitePages: [...SCHOOL_PAGE_SETS["s4-residential"]],

  /* ── KEPT (rule "stock"): the template's stock photographs. Licensed
        stock from public/demo/img, alt text from its manifest, describing
        the scene only. A duplicate carries them and the admin checklist
        says "Photos are stock photos from the template" until Mehdi
        replaces the hero with the institute's own. ───────────────────── */
  heroImage: "/demo/img/school/hero-hill-campus-800.webp",
  sectionPhotos: {
    about: "/demo/img/school/campus-hill-walk-640.webp",
    campus: "/demo/img/school/campus-hill-walk-640.webp",
    academics: "/demo/img/school/library-reading-hall-640.webp",
    admissions: "/demo/img/school/yoga-group-640.webp",
    hostel: "/demo/img/school/hostel-courtyard-640.webp",
    dining: "/demo/img/school/dining-hall-640.webp",
    sports: "/demo/img/school/sports-cricket-coaching-640.webp",
    activities: "/demo/img/school/field-trip-museum-640.webp",
  },

  /* ── CLEARED: the session and the registration window. A hill school's
        year runs March to November, so the session is one calendar year. ── */
  sessionLabel: "2027",
  hi: {
    tagline: "पैंसठ साल से बोर्डिंग स्कूल, चार हाउस, और *हर रविवार* घर पर फ़ोन।",
    about: "Buransh Hill School 1961 में चीड़ और बुरांश के चालीस एकड़ के कैंपस पर शुरू हुआ, अल्मोड़ा से 7 किमी ऊपर, 1,900 मीटर की ऊँचाई पर। यह सिर्फ़ बोर्डिंग स्कूल है: कक्षा 4 से 12 तक 410 लड़के और लड़कियाँ, कोई डे स्कॉलर नहीं। बच्चे चार हाउस में रहते हैं, जिनके नाम असेंबली ग्राउंड से दिखने वाली चोटियों पर हैं: त्रिशूल, नंदा देवी, पंचाचूली और कामेट। हर हाउस में एक हाउसमास्टर या हाउसमिस्ट्रेस अपने परिवार के साथ रहते हैं, एक मेट्रन होती हैं, और एक डॉरमिटरी में ज़्यादा से ज़्यादा बारह बच्चे। कक्षा 6 तक के बच्चे अलग जूनियर हाउस में रहते हैं। स्कूल का साल मार्च से नवंबर तक चलता है, और सर्दियाँ बच्चे घर पर बिताते हैं।",
    principalTitle: "हेडमिस्ट्रेस",
    principalMessage: "हमारे ज़्यादातर पैरेंट्स एक दिन के सफ़र की दूरी पर रहते हैं, इसलिए मुझसे सबसे ज़्यादा यही पूछा जाता है कि आपको कैसे पता चलेगा कि बच्चा ठीक है। आपका बच्चा हर रविवार शाम घर पर फ़ोन करता है। हाउसमास्टर हर पंद्रह दिन में आपको चिट्ठी लिखते हैं। बच्चा बीमार हो, तो इन्फ़र्मरी उसी दिन आपको फ़ोन करती है। पहला टर्म सबसे मुश्किल होता है, बच्चों के लिए भी और पैरेंट्स के लिए भी। दूसरे टर्म तक ज़्यादातर बच्चे छुट्टियों के दिन गिनना छोड़ देते हैं।",
    resultsHeading: "2026 का बैच।",
    resultsNote: "इस हिस्से का हर आँकड़ा उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि रिज़ल्ट की सूची कैसी दिखेगी। आपके अपने रिज़ल्ट इसकी जगह लेंगे, लाइन दर लाइन, ठीक वैसे ही जैसे आप छापते हैं।",
    admissionsHeadline: "मार्च 2027 के एडमिशन: एंट्रेंस टेस्ट रविवार 15 नवंबर 2026 को",
    vision: "सत्रह साल की उम्र में यहाँ से निकलने वाले बच्चे दूसरों के साथ रहना जानें, पहाड़ पर अपना ख़याल रखना जानें, और किताब के साथ अकेले बैठना जानें।",
    mission: "छोटे हाउस, जिनमें बड़े लोग साथ रहते हैं। हर रविवार घर पर फ़ोन और हर पंद्रह दिन में हाउस से चिट्ठी। साल के हर हफ़्ते पहाड़ ही क्लासरूम।",
    hostel: "हर बच्चा चार हाउस में से एक में रहता है, या कक्षा 6 तक जूनियर हाउस में। एक डॉरमिटरी में ज़्यादा से ज़्यादा बारह बच्चे, उसी फ़्लोर पर मेट्रन, और हाउस स्टाफ़ वहीं रहता है।",
    established: "1961 में शुरू",
    city: "अल्मोड़ा",
    state: "उत्तराखंड",
    boardOrAffiliation: "ICSE और ISC, उदाहरण एफ़िलिएशन नं. 00000000",
    facilities: [
      "बोर्डिंग हाउस, जिनमें हाउस स्टाफ़ साथ रहता है",
      "डाइनिंग हॉल और किचन",
      "नर्सिंग स्टाफ़ के साथ इन्फ़र्मरी",
      "लाइब्रेरी और रीडिंग रूम",
      "फिज़िक्स, केमिस्ट्री और बायोलॉजी की साइंस लैब",
      "खेल के मैदान और इनडोर गेम्स हॉल",
    ],
  },
  admissionsOpenUntil: "2026-10-31",
  vision: "Boarders who leave at seventeen knowing how to live with other people, how to look after themselves on a mountain, and how to sit alone with a book.",
  mission: "Small houses with adults who live in them. A call home every Sunday and a letter from the house every fortnight. The mountain as a classroom, every week of the year.",
  hostel: "Every boarder lives in one of four houses, or the junior house up to Class VI. Dormitories hold twelve at most, with a matron on the same floor and the house staff living in.",

  /* ── CLEARED: the proof row, each figure with its basis line ─────────── */
  stats: [
    { value: "410", label: "Boarders, Class IV to XII", basis: "Roll on 1 March 2026. No day scholars", hi: { label: "बोर्डर, कक्षा 4 से 12", basis: "1 मार्च 2026 की सूची। कोई डे स्कॉलर नहीं" } },
    { value: "12", label: "Children in a dormitory, at most", basis: "Junior house dormitories hold eight", hi: { label: "एक डॉरमिटरी में ज़्यादा से ज़्यादा बच्चे", basis: "जूनियर हाउस की डॉरमिटरी में आठ" } },
    { value: "93.4%", label: "ISC average aggregate", basis: "ISC 2026, 58 candidates", hi: { label: "ISC का औसत कुल प्रतिशत", basis: "ISC 2026, 58 स्टूडेंट्स" } },
    { value: "65", label: "Years of boarders", basis: "Founded in 1961", hi: { label: "साल से बोर्डिंग स्कूल", basis: "1961 में शुरू" } },
  ],

  /* ── CLEARED: parents' words. Fiction on its face. ───────────────────── */
  reviews: [
    { quote: "The fortnightly letter from the housemaster is the best thing we get. Two paragraphs, and it always has one thing we did not know about our son.", relation: "Parents of a Class VIII boarder, Delhi", source: "Example review written by Ideovent", consent: true, hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "हाउसमास्टर की पंद्रह दिन वाली चिट्ठी हमें मिलने वाली सबसे अच्छी चीज़ है। दो पैराग्राफ़, और हर बार उसमें अपने बेटे के बारे में कोई एक बात होती है जो हमें पता नहीं थी।", relation: "कक्षा 8 के बोर्डर के पैरेंट्स, दिल्ली" } },
    { quote: "She had never been away from home for a night. The first Sunday call was mostly crying. By the sixth it was mostly about the cross-country team.", relation: "Mother of a Class V boarder, Lucknow", source: "Example review written by Ideovent", consent: true, hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "वह कभी एक रात भी घर से दूर नहीं रही थी। पहले रविवार का फ़ोन ज़्यादातर रोने में गया। छठे तक बात ज़्यादातर क्रॉस-कंट्री टीम की होने लगी।", relation: "कक्षा 5 की बोर्डर की माँ, लखनऊ" } },
    { quote: "Every extra on the term bill came with a receipt: the trek, the shoes, the dentist in Almora. We have never had a surprise.", relation: "Father of two boarders, Class IX and XII", source: "Example review written by Ideovent", consent: true, hi: { source: "Ideovent का लिखा उदाहरण रिव्यू", quote: "टर्म के बिल के हर एक्स्ट्रा ख़र्च के साथ रसीद आई: ट्रेक, जूते, अल्मोड़ा के डेंटिस्ट। हमें कभी कोई अचानक ख़र्च नहीं दिखा।", relation: "दो बोर्डर के पिता, कक्षा 9 और 12" } },
  ],

  /* ── CLEARED: Academics page ─────────────────────────────────────────── */
  academics: {
    hi: {
      intro: "हम CISCE का सिलेबस पढ़ाते हैं: कक्षा 10 में ICSE और कक्षा 12 में ISC, और जूनियर व मिडिल स्कूल इन्हीं की तैयारी के हिसाब से। एक क्लास में बीस से चौबीस बच्चे होते हैं, और हर हाउस में शाम की प्रेप एक टीचर की निगरानी में होती है, इसलिए होमवर्क में मदद हमेशा पास ही मिलती है।",
      assessment: "साल में दो टर्म, हर टर्म में एक मिड-टर्म टेस्ट और एक टर्म के आख़िर की परीक्षा। हर टर्म के आख़िर में रिपोर्ट घर जाती है, जिसके साथ हाउसमास्टर, क्लास टीचर और हेडमिस्ट्रेस का लिखा नोट होता है।",
    },
    intro: "We teach the CISCE curriculum: ICSE at Class X and ISC at Class XII, with the junior and middle school built to lead into them. Classes are twenty to twenty-four, and the evening prep in each house is supervised by a teacher, so homework help is never more than a corridor away.",
    stages: [
      { title: "Junior school (Class IV to VI)", body: "A class teacher for most subjects, reading every evening in the junior house, and nature study on the estate every week.", hi: { title: "जूनियर स्कूल (कक्षा 4 से 6)", body: "ज़्यादातर विषयों के लिए एक क्लास टीचर, जूनियर हाउस में हर शाम पढ़ना, और हर हफ़्ते कैंपस में प्रकृति का अध्ययन।" } },
      { title: "Middle school (Class VII and VIII)", body: "Separate sciences begin, with a second language (Hindi, Sanskrit or French) and computer applications.", hi: { title: "मिडिल स्कूल (कक्षा 7 और 8)", body: "फिज़िक्स, केमिस्ट्री और बायोलॉजी अलग-अलग शुरू होती हैं, साथ में दूसरी भाषा (हिंदी, संस्कृत या फ़्रेंच) और कंप्यूटर एप्लिकेशन।" } },
      { title: "ICSE (Class IX and X)", body: "The CISCE syllabus, with an elective in computer applications, economics or art, and a full practice examination at the end of each term.", hi: { title: "ICSE (कक्षा 9 और 10)", body: "CISCE का सिलेबस, कंप्यूटर एप्लिकेशन, इकोनॉमिक्स या आर्ट में से एक वैकल्पिक विषय, और हर टर्म के आख़िर में पूरी प्रैक्टिस परीक्षा।" } },
      { title: "ISC (Class XI and XII)", body: "Science, commerce and humanities, with English in every stream. University counselling begins in Class XI.", hi: { title: "ISC (कक्षा 11 और 12)", body: "साइंस, कॉमर्स और ह्यूमैनिटीज़, हर स्ट्रीम में इंग्लिश के साथ। यूनिवर्सिटी काउंसलिंग कक्षा 11 में शुरू होती है।" } },
    ],
    assessment: "Two terms, each with a mid-term test and an end-of-term examination. Reports go home at the end of each term with a written note from the housemaster, the class teacher and the Headmistress.",
    calendar: [
      { title: "Visiting weekend", date: "10 and 11 October 2026", hi: { title: "विज़िटिंग वीकेंड", date: "10 और 11 अक्टूबर 2026" } },
      { title: "Inter-house cross-country", date: "Saturday 3 October 2026", hi: { title: "इंटर-हाउस क्रॉस-कंट्री", date: "शनिवार 3 अक्टूबर 2026" } },
      { title: "End-of-term examinations", date: "2 to 12 November 2026", hi: { title: "टर्म के आख़िर की परीक्षाएँ", date: "2 से 12 नवंबर 2026" } },
      { title: "Founder's Day and prize-giving", date: "Saturday 14 November 2026", hi: { title: "फ़ाउंडर्स डे और पुरस्कार वितरण", date: "शनिवार 14 नवंबर 2026" } },
      { title: "Entrance assessment for 2027", date: "Sunday 15 November 2026", hi: { title: "2027 के लिए एंट्रेंस टेस्ट", date: "रविवार 15 नवंबर 2026" } },
      { title: "Winter break begins", date: "Saturday 28 November 2026", hi: { title: "सर्दी की छुट्टियाँ शुरू", date: "शनिवार 28 नवंबर 2026" } },
      { title: "Boarders report for 2027", date: "Sunday 28 February 2027, by 4:00 pm", hi: { title: "2027 के लिए बोर्डर्स की वापसी", date: "रविवार 28 फ़रवरी 2027, शाम 4 बजे तक" } },
      { title: "ICSE and ISC board examinations", date: "February and March 2027, as CISCE announces", body: "Class X and XII report back early, on 6 February.", hi: { title: "ICSE और ISC बोर्ड परीक्षाएँ", date: "फ़रवरी और मार्च 2027, CISCE की घोषणा के अनुसार", body: "कक्षा 10 और 12 के बच्चे जल्दी, 6 फ़रवरी को लौटते हैं।" } },
    ],
    downloads: [
      { label: "Prospectus 2027", group: "Admissions", hi: { label: "प्रॉस्पेक्टस 2027", group: "एडमिशन" } },
      { label: "Book list 2027", group: "Lists", hi: { label: "किताबों की सूची 2027", group: "सूची" } },
      { label: "ICSE specimen papers", group: "Model papers", hi: { label: "ICSE सैंपल पेपर", group: "मॉडल पेपर" } },
      { label: "ISC specimen papers", group: "Model papers", hi: { label: "ISC सैंपल पेपर", group: "मॉडल पेपर" } },
    ],
  },
  /* ── CLEARED ON DUPLICATE: identity ──────────────────────────────────── */
  instituteName: "Buransh Hill School",
  /* One phrase in *asterisks* is set in the serif italic accent. */
  tagline: "Sixty-five years of boarders, four houses, and a call home *every Sunday*.",
  city: "Almora",
  state: "Uttarakhand",

  /* ── KEPT: market, language and currency ─────────────────────────────── */
  country: "India",
  market: "india",
  currency: "INR",

  /* ── CLEARED: history and board ──────────────────────────────────────── */
  established: "Founded 1961",
  establishedYear: "1961",
  boardOrAffiliation: "ICSE and ISC, example affiliation no. 00000000",

  about:
    "Buransh Hill School was founded in 1961 on a forty-acre estate of pine and rhododendron, 7 km above Almora at 1,900 metres. It is a boarding school only: 410 boys and girls from Class IV to XII, and no day scholars. Boarders live in four houses named for the peaks seen from the assembly ground: Trishul, Nanda Devi, Panchachuli and Kamet. Each house has a housemaster or housemistress who lives in with their family, a matron, and dormitories of twelve at most. Children up to Class VI live in a separate junior house. The school year runs from March to November, and the winter is spent at home.",

  /* ── The head. Name and message CLEARED; the title is KEPT ───────────── */
  principalName: "Nirupama Sen",
  principalTitle: "Headmistress",
  principalMessage:
    "Most of our parents live a day's journey away, so the question I am asked most is how you will know your child is all right. Your child calls home every Sunday evening. The housemaster writes to you every fortnight. If your child is unwell, the infirmary calls you the same day. The first term is the hardest, for children and for parents. By the second, most children have stopped counting the days to the holidays.",

  /* ── STRUCTURE: age bands. Name, level, subjects and timings are KEPT;
        seats, fee and detail are CLEARED. For a boarder the timetable is the
        boarding day, so `timings` is rising bell to lights out. ─────────── */
  courses: [
    {
      name: "Junior school",
      hi: {
        name: "जूनियर स्कूल",
        seats: "एक क्लास में 20; जूनियर हाउस की अपनी मेट्रन",
        level: "कक्षा 4 से 6, उम्र 9 से 11 साल",
        subjects: "इंग्लिश, हिंदी, गणित, सामान्य विज्ञान, सामाजिक अध्ययन, आर्ट, संगीत और खेल",
        timings: "जागने की घंटी सुबह 6:30 बजे, लाइट्स ऑफ़ रात 8:30 बजे",
        feeNote: "सालाना: ट्यूशन, बोर्डिंग, खाना और कपड़ों की धुलाई",
        detail: "जूनियर बच्चे सीनियर्स से अलग रहते हैं, एक हाउसमिस्ट्रेस और एक मेट्रन के साथ, जो उसी फ़्लोर पर सोती हैं। घर के लिए चिट्ठियाँ रविवार सुबह, फ़ोन से पहले लिखी जाती हैं।",
      },
      level: "Class IV to VI, ages 9 to 11",
      subjects: "English, Hindi, mathematics, general science, social studies, art, music and games",
      timings: "Rising bell 6:30 am, lights out 8:30 pm",
      seats: "20 to a class; the junior house has its own matron",
      fee: "4,60,000",
      feeNote: "a year: tuition, boarding, meals and laundry",
      detail: "Juniors live apart from the seniors, with a housemistress and a matron who sleeps on the same floor. Letters home are written on Sunday mornings, before the call.",
    },
    {
      name: "Middle school",
      hi: {
        name: "मिडिल स्कूल",
        seats: "एक क्लास में 24",
        level: "कक्षा 7 से 8, उम्र 12 से 13 साल",
        subjects: "इंग्लिश, हिंदी, संस्कृत या फ़्रेंच, गणित, फिज़िक्स, केमिस्ट्री, बायोलॉजी, इतिहास, भूगोल और कंप्यूटर एप्लिकेशन",
        timings: "जागने की घंटी सुबह 6 बजे, लाइट्स ऑफ़ रात 9 बजे",
        feeNote: "सालाना, ऊपर की तरह",
        detail: "हर बोर्डर एक आउटडोर गतिविधि लेता है, ट्रेकिंग, रॉक क्लाइंबिंग या क्रॉस-कंट्री, और एक आर्ट या संगीत। दोनों ज़रूरी हैं।",
      },
      level: "Class VII to VIII, ages 12 to 13",
      subjects: "English, Hindi, Sanskrit or French, mathematics, physics, chemistry, biology, history, geography and computer applications",
      timings: "Rising bell 6:00 am, lights out 9:00 pm",
      seats: "24 to a class",
      fee: "4,85,000",
      feeNote: "a year, as above",
      detail: "Every boarder takes up one outdoor pursuit, trekking, rock climbing or cross-country, and one art or music. Neither is optional.",
    },
    {
      name: "ICSE",
      hi: {
        level: "कक्षा 9 से 10, उम्र 14 से 15 साल",
        seats: "एक क्लास में 24",
        subjects: "इंग्लिश, एक दूसरी भाषा, इतिहास, नागरिक शास्त्र और भूगोल, गणित, विज्ञान, और एक वैकल्पिक विषय: कंप्यूटर एप्लिकेशन, इकोनॉमिक्स या आर्ट",
        timings: "जागने की घंटी सुबह 6 बजे, प्रेप शाम 6:30 से 8 बजे, लाइट्स ऑफ़ रात 9:30 बजे",
        feeNote: "सालाना, बोर्ड फीस अलग",
        detail: "हर हाउस में शाम की प्रेप एक टीचर की निगरानी में होती है। कक्षा 10 हर टर्म के आख़िर में पूरी प्रैक्टिस परीक्षा देती है।",
      },
      level: "Class IX to X, ages 14 to 15",
      subjects: "English, a second language, history, civics and geography, mathematics, science, and an elective: computer applications, economics or art",
      timings: "Rising bell 6:00 am, prep 6:30 to 8:00 pm, lights out 9:30 pm",
      seats: "24 to a class",
      fee: "5,10,000",
      feeNote: "a year, board fee extra",
      detail: "Evening prep is supervised by a teacher in every house. Class X sits a full practice examination at the end of each term.",
    },
    {
      name: "ISC",
      hi: {
        level: "कक्षा 11 से 12, उम्र 16 से 17 साल",
        seats: "एक क्लास में 20",
        subjects: "साइंस (फिज़िक्स, केमिस्ट्री, और गणित या बायोलॉजी), कॉमर्स और ह्यूमैनिटीज़, हर स्ट्रीम में इंग्लिश के साथ",
        timings: "जागने की घंटी सुबह 6 बजे, प्रेप शाम 6:30 से 8:30 बजे, लाइट्स ऑफ़ रात 10 बजे",
        feeNote: "सालाना, बोर्ड फीस अलग",
        detail: "सीनियर अपने हाउस में प्रीफ़ेक्ट होते हैं। यूनिवर्सिटी काउंसलिंग कक्षा 11 में शुरू होती है, जिसमें हाउसमास्टर और पैरेंट्स एक ही टेबल पर बैठते हैं।",
      },
      level: "Class XI to XII, ages 16 to 17",
      subjects: "Science (physics, chemistry, and mathematics or biology), commerce and humanities, with English in every stream",
      timings: "Rising bell 6:00 am, prep 6:30 to 8:30 pm, lights out 10:00 pm",
      seats: "20 to a class",
      fee: "5,40,000",
      feeNote: "a year, board fee extra",
      detail: "Seniors are prefects in their houses. University counselling begins in Class XI, with the housemaster and the parents at the same table.",
    },
  ],

  /* ── CLEARED: results. Unit-carrying lines, no student named, ever. ──── */
  resultsHeading: "The class of 2026.",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a result list is set. Your own results replace it line for line, exactly as you publish them.",
  results: [
    { achievement: "93.4% average aggregate", exam: "ISC", year: "2026", note: "58 candidates", category: "ISC", hi: { achievement: "93.4% औसत कुल अंक", note: "58 स्टूडेंट्स" } },
    { achievement: "91.7% average aggregate", exam: "ICSE", year: "2026", note: "61 candidates", category: "ICSE", hi: { achievement: "91.7% औसत कुल अंक", note: "61 स्टूडेंट्स" } },
    { achievement: "52 of 58 began university this year", exam: "ISC", year: "2026", note: "7 of them abroad", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "58 में से 52 ने इस साल यूनिवर्सिटी में पढ़ाई शुरू की", note: "इनमें से 7 विदेश में" } },
    { achievement: "100% passed", exam: "ICSE and ISC", year: "2026", note: "For the fourteenth year running", category: "ISC", hi: { achievement: "100% पास", exam: "ICSE और ISC", note: "लगातार चौदहवें साल" } },
    /* Destinations: a count per university, never a named student. */
    { achievement: "9 students", destination: "University of Delhi colleges", country: "India", exam: "ISC", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "9 स्टूडेंट्स", destination: "दिल्ली यूनिवर्सिटी के कॉलेज", country: "भारत" } },
    { achievement: "6 students", destination: "Private universities in the NCR and Pune", country: "India", exam: "ISC", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "6 स्टूडेंट्स", destination: "NCR और पुणे की प्राइवेट यूनिवर्सिटी", country: "भारत" } },
    { achievement: "5 students", destination: "Engineering colleges through JEE Main", country: "India", exam: "ISC", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "5 स्टूडेंट्स", destination: "JEE Main से इंजीनियरिंग कॉलेज", country: "भारत" } },
    { achievement: "4 students", destination: "Universities in Canada", country: "Canada", exam: "ISC", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "4 स्टूडेंट्स", destination: "कनाडा की यूनिवर्सिटी", country: "कनाडा" } },
    { achievement: "3 students", destination: "Universities in the United Kingdom", country: "United Kingdom", exam: "ISC", year: "2026", category: "Destinations", hi: { category: "आगे की पढ़ाई", achievement: "3 स्टूडेंट्स", destination: "यूनाइटेड किंगडम की यूनिवर्सिटी", country: "यूनाइटेड किंगडम" } },
  ],

  /* ── CLEARED: the board table in the registered, passed, pass % columns ── */
  boardResults: [
    { year: "2026", className: "ICSE (X)", registered: "61", passed: "61", passPercent: "100%", hi: { className: "ICSE (कक्षा 10)" } },
    { year: "2026", className: "ISC (XII)", registered: "58", passed: "58", passPercent: "100%", hi: { className: "ISC (कक्षा 12)" } },
    { year: "2025", className: "ICSE (X)", registered: "59", passed: "59", passPercent: "100%", hi: { className: "ICSE (कक्षा 10)" } },
    { year: "2025", className: "ISC (XII)", registered: "55", passed: "55", passPercent: "100%", hi: { className: "ISC (कक्षा 12)" } },
    { year: "2024", className: "ICSE (X)", registered: "62", passed: "62", passPercent: "100%", hi: { className: "ICSE (कक्षा 10)" } },
    { year: "2024", className: "ISC (XII)", registered: "54", passed: "54", passPercent: "100%", hi: { className: "ISC (कक्षा 12)" } },
  ],

  /* ── KEPT WORD FOR WORD: facilities. What every boarding school has; the
        estate, the ridge course and the junior house are in `about` and
        `courses`, which are cleared. ───────────────────────────────────── */
  facilities: [
    "Boarding houses with resident house staff",
    "Dining hall and kitchen",
    "Infirmary with nursing staff",
    "Library and reading room",
    "Science laboratories for physics, chemistry and biology",
    "Playing fields and an indoor games hall",
  ],

  /* ── CLEARED: the Facilities page, grouped ───────────────────────────── */
  facilityDetails: [
    { title: "Five boarding houses", body: "Trishul, Nanda Devi, Panchachuli and Kamet for Class VII to XII, and the junior house for Class IV to VI. Dormitories of twelve, a common room, and a housemaster's flat in each.", group: "Boarding", hi: { title: "पाँच बोर्डिंग हाउस", body: "कक्षा 7 से 12 के लिए त्रिशूल, नंदा देवी, पंचाचूली और कामेट, और कक्षा 4 से 6 के लिए जूनियर हाउस। हर हाउस में बारह बच्चों की डॉरमिटरी, एक कॉमन रूम और हाउसमास्टर का फ़्लैट।", group: "हॉस्टल" } },
    { title: "Dining hall", body: "All 410 boarders eat together, by house, four times a day. The menu runs on a four-week cycle and is posted in every house.", group: "Boarding", hi: { title: "डाइनिंग हॉल", body: "सभी 410 बोर्डर दिन में चार बार, हाउस के हिसाब से, साथ खाते हैं। मेन्यू चार हफ़्ते के चक्र में चलता है और हर हाउस में लगा रहता है।", group: "हॉस्टल" } },
    { title: "Infirmary", body: "Eight beds, two nurses on shifts around the clock, and a doctor from Almora every morning. An ambulance is kept on the estate.", group: "Health", hi: { title: "इन्फ़र्मरी", body: "आठ बेड, चौबीसों घंटे शिफ़्ट में दो नर्स, और हर सुबह अल्मोड़ा से एक डॉक्टर। कैंपस पर एक एम्बुलेंस रहती है।", group: "सेहत" } },
    { title: "Library", body: "About 22,000 books in the 1961 building, open until prep every evening and all Sunday afternoon.", group: "Academic", hi: { title: "लाइब्रेरी", body: "1961 की इमारत में लगभग 22,000 किताबें, हर शाम प्रेप तक और पूरी रविवार दोपहर खुली।", group: "पढ़ाई" } },
    { title: "Science and computer laboratories", body: "Physics, chemistry, biology and two computer rooms, open for supervised practicals on Saturday mornings too.", group: "Academic", hi: { title: "साइंस और कंप्यूटर लैब", body: "फिज़िक्स, केमिस्ट्री, बायोलॉजी और दो कंप्यूटर रूम, शनिवार सुबह भी निगरानी में प्रैक्टिकल के लिए खुले।", group: "पढ़ाई" } },
    { title: "Playing fields and the ridge course", body: "Two fields, four tennis courts, a covered games hall, and an eight-kilometre cross-country course along the ridge.", group: "Sport", hi: { title: "खेल के मैदान और रिज कोर्स", body: "दो मैदान, चार टेनिस कोर्ट, एक ढका हुआ गेम्स हॉल, और रिज के साथ आठ किलोमीटर का क्रॉस-कंट्री कोर्स।", group: "खेल" } },
    { title: "Climbing wall and outdoor store", body: "A twelve-metre wall and the store for tents, ropes and boots used on the term treks.", group: "Sport", hi: { title: "क्लाइंबिंग वॉल और आउटडोर स्टोर", body: "बारह मीटर की दीवार, और टर्म के ट्रेक में काम आने वाले टेंट, रस्सियों और जूतों का स्टोर।", group: "खेल" } },
    { title: "Music school and chapel hall", body: "Six practice rooms, a band room, and the hall used for assemblies, plays and the Founder's Day concert.", group: "Arts", hi: { title: "म्यूज़िक स्कूल और चैपल हॉल", body: "छह प्रैक्टिस रूम, एक बैंड रूम, और वह हॉल जहाँ असेंबली, नाटक और फ़ाउंडर्स डे का कॉन्सर्ट होता है।", group: "कला" } },
  ],

  /* ── CLEARED: faculty. Fictional names; each photo is a stock portrait (a
        licensed model, never the teacher), kept on duplicate for a row that
        survives, and never the same person twice. In a
        boarding school the teachers are also the house staff. ──────────── */
  faculty: [
    { name: "Nirupama Sen", photo: "/demo/img/people/teacher-w05-240.webp", role: "Headmistress", group: "Leadership", subject: "English", qualification: "M.A. English, M.Ed.", experience: "At Buransh Hill since 2004, Headmistress since 2018", hi: { qualification: "M.A. इंग्लिश, M.Ed.", group: "प्रबंधन", role: "स्कूल की हेडमिस्ट्रेस", subject: "इंग्लिश", experience: "2004 से Buransh Hill में, 2018 से हेडमिस्ट्रेस" } },
    { name: "Deepika Bisht", photo: "/demo/img/people/teacher-w07-240.webp", role: "Housemistress, Nanda Devi House", group: "House staff", subject: "English", qualification: "M.A. English, B.Ed.", experience: "17 years, lives in the house with her family", style: "Reads the house a chapter aloud on Sunday nights, Class XII included.", hi: { qualification: "M.A. इंग्लिश, B.Ed.", group: "हॉस्टल स्टाफ", role: "हाउसमिस्ट्रेस, नंदा देवी हाउस", subject: "इंग्लिश", experience: "17 साल, अपने परिवार के साथ हाउस में ही रहती हैं", style: "रविवार रात पूरे हाउस को, कक्षा 12 समेत, एक अध्याय पढ़कर सुनाती हैं।" } },
    { name: "Sameer Qazi", photo: "/demo/img/people/teacher-m11-240.webp", role: "Housemaster, Kamet House", group: "House staff", subject: "History", qualification: "M.A. History, B.Ed.", experience: "9 years", hi: { qualification: "M.A. इतिहास, B.Ed.", group: "हॉस्टल स्टाफ", role: "हाउसमास्टर, कामेट हाउस", subject: "इतिहास", experience: "9 साल" } },
    { name: "Harish Bhatt", photo: "/demo/img/people/teacher-m08-240.webp", group: "Teachers", subject: "Mathematics", qualification: "M.Sc. Mathematics, B.Ed.", experience: "22 years, Class IX to XII", style: "Takes the Class XII prep himself on the nights before a test.", hi: { qualification: "M.Sc. गणित, B.Ed.", group: "टीचर्स", subject: "गणित", experience: "22 साल, कक्षा 9 से 12", style: "टेस्ट से पहले की रातों में कक्षा 12 की प्रेप ख़ुद लेते हैं।" } },
    { name: "Rebecca Thomas", photo: "/demo/img/people/teacher-w03-240.webp", group: "Teachers", subject: "Biology", qualification: "M.Sc. Botany, B.Ed.", experience: "11 years, and leads the Sunday nature walks", hi: { qualification: "M.Sc. बॉटनी, B.Ed.", group: "टीचर्स", subject: "बायोलॉजी", experience: "11 साल, और रविवार की नेचर वॉक इन्हीं के साथ" } },
    { name: "Mohan Singh Negi", photo: "/demo/img/people/teacher-m09-240.webp", role: "Head of outdoor pursuits", group: "Teachers", subject: "Physical education and outdoor pursuits", qualification: "M.P.Ed., basic mountaineering course", experience: "15 years, coaches cross-country", hi: { group: "टीचर्स", role: "आउटडोर गतिविधियों के प्रमुख", subject: "फ़िज़िकल एजुकेशन और आउटडोर गतिविधियाँ", experience: "15 साल, क्रॉस-कंट्री की कोचिंग", qualification: "M.P.Ed., बेसिक माउंटेनियरिंग कोर्स" } },
    { name: "Anjali Kandpal", photo: "/demo/img/people/teacher-w04-240.webp", role: "School counsellor", group: "Pastoral care", subject: "Counselling", qualification: "M.A. Psychology", experience: "Meets every new boarder in the first fortnight", hi: { qualification: "M.A. साइकोलॉजी", group: "बच्चों की देखभाल", role: "स्कूल काउंसलर", subject: "काउंसलिंग", experience: "हर नए बोर्डर से पहले पंद्रह दिन में मिलती हैं" } },
    { name: "Sister Mary Joseph", role: "Senior nurse", group: "Pastoral care", subject: "The infirmary", qualification: "B.Sc. Nursing", experience: "14 years, calls parents the same day a child is admitted", hi: { qualification: "B.Sc. नर्सिंग", group: "बच्चों की देखभाल", role: "सीनियर नर्स", subject: "इन्फ़र्मरी", experience: "14 साल, बच्चा भर्ती हो तो उसी दिन पैरेंट्स को फ़ोन करती हैं" } },
  ],

  /* ── CLEARED: gallery. Captions only; they are also the shot list. ───── */
  gallery: [
    { src: "", alt: "The main building, 1961, from the lower field.", hi: { alt: "मुख्य इमारत, 1961, निचले मैदान से।" } },
    { src: "", alt: "Trishul House at 9:00 pm, the last round before lights out.", hi: { alt: "रात 9 बजे त्रिशूल हाउस, लाइट्स ऑफ़ से पहले का आख़िरी चक्कर।" } },
    { src: "", alt: "Sunday calls home in the common room, 5:00 pm.", hi: { alt: "कॉमन रूम में रविवार को घर पर फ़ोन, शाम 5 बजे।" } },
    { src: "", alt: "Breakfast in the dining hall, 7:15 am.", hi: { alt: "डाइनिंग हॉल में नाश्ता, सुबह 7:15।" } },
    { src: "", alt: "The cross-country course along the ridge in October.", hi: { alt: "अक्टूबर में रिज के साथ-साथ क्रॉस-कंट्री कोर्स।" } },
    { src: "", alt: "Nanda Devi at sunrise, from the assembly ground.", hi: { alt: "असेंबली ग्राउंड से सूर्योदय के समय नंदा देवी।" } },
  ],

  /* ── STOCK photos for the Gallery chips: src and category kept on
        duplicate, alt and caption cleared. Captions describe the scene. ─── */
  photos: [
    { src: "/demo/img/school/hero-hill-campus-800.webp", alt: "A long low building with green roofs on a meadow below forested hills", caption: "Below the forested hills", category: "Campus", hi: { alt: "जंगल से ढकी पहाड़ियों के नीचे घास के मैदान पर हरी छतों वाली लंबी इमारत", caption: "जंगल वाली पहाड़ियों के नीचे", category: "कैंपस" } },
    { src: "/demo/img/school/campus-hill-walk-640.webp", alt: "Students with school bags walking on a hill path among pine trees", caption: "The walk back through the pines", category: "Outdoors", hi: { alt: "चीड़ के पेड़ों के बीच पहाड़ी रास्ते पर स्कूल बैग लिए चलते विद्यार्थी", caption: "चीड़ के पेड़ों के बीच से वापसी", category: "आउटडोर" } },
    { src: "/demo/img/school/hostel-courtyard-640.webp", alt: "A quiet courtyard with a big tree between two hostel buildings", caption: "A courtyard between the houses", category: "Boarding", hi: { alt: "दो हॉस्टल इमारतों के बीच बड़े पेड़ वाला शांत आँगन", caption: "हाउस के बीच का आँगन", category: "हॉस्टल" } },
    { src: "/demo/img/school/prep-study-night-640.webp", alt: "A student studying at a desk under a lamp at night", caption: "Evening prep", category: "Boarding", hi: { alt: "रात में लैंप की रोशनी में मेज़ पर पढ़ता विद्यार्थी", caption: "शाम की पढ़ाई", category: "हॉस्टल" } },
    { src: "/demo/img/school/dining-hall-640.webp", alt: "A sunlit dining hall with wooden tables and large windows", caption: "A sunlit dining hall", category: "Boarding", hi: { alt: "लकड़ी की मेज़ों और बड़ी खिड़कियों वाला धूप से भरा डाइनिंग हॉल", caption: "धूप से भरा डाइनिंग हॉल", category: "हॉस्टल" } },
    { src: "/demo/img/school/sports-cricket-coaching-640.webp", alt: "A coach guiding young cricketers during practice at the nets", caption: "Cricket at the nets", category: "Outdoors", hi: { alt: "नेट्स पर अभ्यास के दौरान युवा क्रिकेटरों को सिखाते कोच", caption: "नेट पर क्रिकेट", category: "आउटडोर" } },
    { src: "/demo/img/school/sports-day-race-640.webp", alt: "Young athletes at the start line of a race on a running track", caption: "Sports day", category: "Events", hi: { alt: "रनिंग ट्रैक पर दौड़ की शुरुआती रेखा पर खड़े युवा धावक", caption: "खेल दिवस", category: "कार्यक्रम" } },
    { src: "/demo/img/school/field-trip-museum-640.webp", alt: "A guide explaining an exhibit to a group of schoolboys in a museum", caption: "A museum visit", category: "Events", hi: { alt: "संग्रहालय में स्कूली लड़कों के समूह को एक प्रदर्शनी समझाते गाइड", caption: "म्यूज़ियम की सैर", category: "कार्यक्रम" } },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  admissionsHeadline: "Admissions for March 2027: the entrance assessment is on Sunday 15 November 2026",
  admissions: {
    hi: {
      dates: "विज़िटिंग वीकेंड, 10 और 11 अक्टूबर: पैरेंट्स दोनों दिन सुबह 10 से शाम 5 बजे तक बच्चों को बाहर ले जा सकते हैं\nएंट्रेंस टेस्ट, रविवार 15 नवंबर: स्कूल में, या मैदानी इलाक़ों के परिवारों के लिए दिल्ली सेंटर पर\nसर्दी की छुट्टियाँ शनिवार 28 नवंबर से: काठगोदाम से दिल्ली और लखनऊ तक स्टाफ़ के साथ सफ़र\nनया सत्र, सोमवार 1 मार्च 2027: बोर्डर एक दिन पहले शाम 4 बजे तक पहुँचें",
      note: "फीस में ट्यूशन, बोर्डिंग, सारा खाना, कपड़ों की धुलाई और इन्फ़र्मरी शामिल हैं। यूनिफ़ॉर्म, किताबें, पॉकेट मनी और सफ़र का ख़र्च हर टर्म असल लागत पर, रसीद के साथ लिया जाता है। कोई कैपिटेशन फीस नहीं, कोई डोनेशन नहीं।",
      whoCanApply: "कक्षा 4 से 7, कक्षा 9 और कक्षा 11, लड़के और लड़कियाँ, सिर्फ़ बोर्डर के रूप में। कक्षा 8, 10 और 12 में नई सीटें नहीं हैं।",
      assessment: "इंग्लिश और गणित के पेपर, और हेडमिस्ट्रेस से बातचीत, रविवार 15 नवंबर 2026 को, स्कूल में या दिल्ली सेंटर पर। कक्षा 11 के उम्मीदवार अपनी चुनी हुई स्ट्रीम का एक पेपर भी देते हैं।",
      feeNote: "फीस दो टर्म में दी जाती है, फ़रवरी और जुलाई में। यह साल में एक बार, अगले मार्च के लिए बदलती है, साल के बीच में कभी नहीं। असल लागत पर लिए गए हर ख़र्च के साथ रसीद मिलती है।",
      rteNote: "हर साल ज़रूरत के आधार पर बारह स्कॉलरशिप दी जाती हैं, बोर्डिंग समेत पूरी फीस तक। फ़ैसला एडमिशन का ऑफ़र मिलने के बाद परिवार की आमदनी पर होता है। फ़ॉर्म एडमिशन ऑफ़िस से माँगिए।",
      ageAsOn: "1 मार्च 2027",
      steps: [
        "एडमिशन ऑफ़िस को लिखिए या फ़ोन कीजिए, और प्रॉस्पेक्टस और फीस की पूरी सूची माँगिए।",
        "बच्चे के साथ आइए, एक बोर्डिंग हाउस देखिए और हाउसमास्टर या हाउसमिस्ट्रेस से मिलिए।",
        "आपका बच्चा इंग्लिश और गणित का एंट्रेंस टेस्ट देता है और स्कूल प्रमुख से मिलता है।",
        "ऑफ़र मिलने पर सीट पक्की कीजिए, मेडिकल फ़ॉर्म भरिए, और यूनिफ़ॉर्म और ट्रंक की सूची ले लीजिए।",
      ],
      documents: [
        "जन्म प्रमाण पत्र",
        "पिछले स्कूल का ट्रांसफ़र सर्टिफ़िकेट",
        "पिछले स्कूल साल और इस टर्म के रिपोर्ट कार्ड",
        "मेडिकल और टीकाकरण का रिकॉर्ड, फ़ैमिली डॉक्टर के साइन के साथ",
        "बच्चे का और माता-पिता दोनों का आधार",
        "बच्चे की फ़ोटो, और हर उस बड़े की फ़ोटो जिसे बच्चे को ले जाने की अनुमति है",
      ],
    },
    /* CLEARED. One row per line; the text before the first colon heads it.
       Kathgodam is the railhead for the hills, so the escorted journeys
       start there. */
    dates: [
      "Visiting weekend, 10 and 11 October: parents may take boarders out from 10:00 am to 5:00 pm on both days",
      "Entrance assessment, Sunday 15 November: at the school, or at the Delhi centre for families in the plains",
      "Winter break from Saturday 28 November: escorted journeys from Kathgodam to Delhi and Lucknow",
      "New session, Monday 1 March 2027: boarders report by 4:00 pm the day before",
    ].join("\n"),
    /* KEPT, so generic: how any boarding school admits a child. */
    steps: [
      "Write to or call the admissions office, and ask for the prospectus and the full fee schedule.",
      "Visit with your child, see a boarding house and meet the housemaster or housemistress.",
      "Your child sits an entrance assessment in English and mathematics and meets the head.",
      "On an offer, confirm the place, complete the medical form and collect the uniform and trunk list.",
    ],
    /* KEPT, so generic. */
    documents: [
      "Birth certificate",
      "Transfer certificate from the previous school",
      "Report cards from the last school year and the current term",
      "Medical and immunisation record, signed by your family doctor",
      "Aadhaar of the child and of both parents",
      "Photographs of the child and of each adult authorised to collect them",
    ],
    /* CLEARED. The all-in cost, which is the question a boarding parent
       is most often surprised by later. */
    note: "The fee covers tuition, boarding, all meals, laundry and the infirmary. Uniform, books, pocket money and travel are billed at cost each term, with receipts. There is no capitation fee and no donation.",
    whoCanApply: "Class IV to VII, Class IX and Class XI, boys and girls, as boarders only. There are no new places in Class VIII, X or XII.",
    assessment: "Papers in English and mathematics, and a conversation with the Headmistress, on Sunday 15 November 2026, at the school or at the Delhi centre. Class XI candidates also sit a paper in their chosen stream.",
    timeline: [
      { title: "Registration closes", date: "31 October 2026", body: "The form and the registration fee reach the admissions office.", hi: { title: "रजिस्ट्रेशन बंद", date: "31 अक्टूबर 2026", body: "फ़ॉर्म और रजिस्ट्रेशन फीस एडमिशन ऑफ़िस तक पहुँच जाए।" } },
      { title: "Visiting weekend, open to applicants", date: "10 and 11 October 2026", body: "See a house, meet the house staff, eat in the dining hall.", hi: { title: "विज़िटिंग वीकेंड, आवेदकों के लिए खुला", date: "10 और 11 अक्टूबर 2026", body: "हाउस देखिए, हाउस स्टाफ़ से मिलिए, डाइनिंग हॉल में खाना खाइए।" } },
      { title: "Entrance assessment", date: "Sunday 15 November 2026", body: "At the school or at the Delhi centre, 9:00 am to 1:00 pm.", hi: { title: "एंट्रेंस टेस्ट", date: "रविवार 15 नवंबर 2026", body: "स्कूल में या दिल्ली सेंटर पर, सुबह 9 से दोपहर 1 बजे तक।" } },
      { title: "Offers sent", date: "By 5 December 2026", body: "By email and by post.", hi: { title: "ऑफ़र भेजे जाएँगे", date: "5 दिसंबर 2026 तक", body: "ईमेल और डाक से।" } },
      { title: "Place confirmed", date: "By 10 January 2027", body: "The admission fee and the first term's fee, the medical form, and the trunk list.", hi: { title: "सीट पक्की", date: "10 जनवरी 2027 तक", body: "एडमिशन फीस और पहले टर्म की फीस, मेडिकल फ़ॉर्म, और ट्रंक की सूची।" } },
      { title: "New boarders report", date: "Sunday 28 February 2027, by 4:00 pm", body: "Parents stay for tea with the house staff.", hi: { title: "नए बोर्डर्स का आगमन", date: "रविवार 28 फ़रवरी 2027, शाम 4 बजे तक", body: "पैरेंट्स हाउस स्टाफ़ के साथ चाय के लिए रुकते हैं।" } },
    ],
    fees: [
      { label: "Registration", amount: "₹5,000", period: "one-time", note: "With the form. Not refunded", hi: { label: "रजिस्ट्रेशन", note: "फ़ॉर्म के साथ। वापस नहीं होती" } },
      { label: "Admission fee", amount: "₹1,50,000", period: "one-time", note: "Paid once, on confirming the place", hi: { label: "एडमिशन फीस", note: "एक बार, सीट पक्की करते समय" } },
      { label: "Security deposit", amount: "₹75,000", period: "one-time", note: "Refunded in full when the child leaves", hi: { label: "सिक्योरिटी डिपॉज़िट", note: "बच्चे के स्कूल छोड़ने पर पूरी वापस" } },
      { label: "Junior school, Class IV to VI", amount: "₹4,60,000", period: "annual", note: "Tuition, boarding, meals, laundry. In two terms", hi: { label: "जूनियर स्कूल, कक्षा 4 से 6", note: "ट्यूशन, बोर्डिंग, खाना, धुलाई। दो टर्म में" } },
      { label: "Middle school, Class VII and VIII", amount: "₹4,85,000", period: "annual", note: "In two terms", hi: { label: "मिडिल स्कूल, कक्षा 7 और 8", note: "दो टर्म में" } },
      { label: "ICSE, Class IX and X", amount: "₹5,10,000", period: "annual", note: "In two terms", hi: { label: "ICSE, कक्षा 9 और 10", note: "दो टर्म में" } },
      { label: "ISC, Class XI and XII", amount: "₹5,40,000", period: "annual", note: "In two terms", hi: { label: "ISC, कक्षा 11 और 12", note: "दो टर्म में" } },
      { label: "Uniform, bedding and trunk", amount: "About ₹48,000", period: "also", note: "First year; about ₹15,000 a year after", hi: { label: "यूनिफ़ॉर्म, बिस्तर और ट्रंक", amount: "लगभग ₹48,000", note: "पहला साल; उसके बाद लगभग ₹15,000 सालाना" } },
      { label: "Books, treks and outings", amount: "About ₹22,000", period: "also", note: "A year, billed at cost with receipts", hi: { label: "किताबें, ट्रेक और आउटिंग", amount: "लगभग ₹22,000", note: "सालाना, असल लागत पर, रसीद के साथ" } },
      { label: "Escorted journey, Kathgodam to Delhi", amount: "₹3,800", period: "also", note: "Each way, only if you use it", hi: { label: "स्टाफ़ के साथ सफ़र, काठगोदाम से दिल्ली", note: "एक तरफ़ का, सिर्फ़ इस्तेमाल करने पर" } },
      { label: "Pocket money", amount: "Up to ₹1,500", period: "also", note: "A month, held by the house, set by you", hi: { label: "पॉकेट मनी", amount: "₹1,500 तक", note: "महीने की, हाउस के पास रहती है, रक़म आप तय करते हैं" } },
      { label: "ICSE and ISC board fees", amount: "As CISCE sets them", period: "also", note: "Class X and XII only", hi: { label: "ICSE और ISC बोर्ड फीस", amount: "CISCE जितनी तय करे", note: "सिर्फ़ कक्षा 10 और 12" } },
    ],
    feeNote: "Fees are paid in two terms, in February and July. They are revised once a year, for the next March, and never in the middle of a year. Everything billed at cost comes with the receipt.",
    ageAsOn: "1 March 2027",
    ageRules: [
      { className: "Class IV", minAge: "8", maxAge: "10", hi: { className: "कक्षा 4" } },
      { className: "Class V", minAge: "9", maxAge: "11", hi: { className: "कक्षा 5" } },
      { className: "Class VI", minAge: "10", maxAge: "12", hi: { className: "कक्षा 6" } },
      { className: "Class VII", minAge: "11", maxAge: "13", hi: { className: "कक्षा 7" } },
      { className: "Class IX", minAge: "13", maxAge: "15", hi: { className: "कक्षा 9" } },
      { className: "Class XI", minAge: "15", maxAge: "17", hi: { className: "कक्षा 11" } },
    ],
    rteNote: "Twelve need-based bursaries are awarded each year, up to the full fee including boarding, decided on family income after an offer is made. Ask the admissions office for the form.",
  },

  /* ── CLEARED: questions. The two marked generic survive a duplicate. ─── */
  faq: [
    { title: "Can we visit before applying?", body: "Yes. Write to the admissions office for a visit, and ask to see a boarding house and meet the house staff.", group: "Admissions", generic: true, hi: { title: "क्या आवेदन से पहले स्कूल देख सकते हैं?", body: "हाँ। विज़िट के लिए एडमिशन ऑफ़िस को लिखिए, और बोर्डिंग हाउस देखने और हाउस स्टाफ़ से मिलने के लिए कहिए।", group: "एडमिशन" } },
    { title: "How often can my child call home?", body: "Every Sunday between 4:00 and 7:00 pm from the house phones, and the housemaster writes to you every fortnight. Mobile phones are kept by the house.", group: "Boarding", hi: { title: "बच्चा घर पर कितनी बार फ़ोन कर सकता है?", body: "हर रविवार शाम 4 से 7 बजे के बीच हाउस के फ़ोन से, और हाउसमास्टर हर पंद्रह दिन में आपको चिट्ठी लिखते हैं। मोबाइल फ़ोन हाउस के पास रखे जाते हैं।", group: "हॉस्टल" } },
    { title: "What happens if my child is ill?", body: "The infirmary admits them, the nurse calls you the same day, and the doctor from Almora sees them the next morning or sooner.", group: "Boarding", hi: { title: "बच्चा बीमार हो तो क्या होता है?", body: "इन्फ़र्मरी उसे भर्ती करती है, नर्स उसी दिन आपको फ़ोन करती हैं, और अल्मोड़ा के डॉक्टर अगली सुबह या उससे पहले देखते हैं।", group: "हॉस्टल" } },
    { title: "Is the fee refunded if we withdraw?", body: "Give a full term's notice in writing, or pay a term's fee in lieu. The security deposit is refunded within thirty days of leaving.", group: "Fees", hi: { title: "स्कूल छोड़ने पर फीस वापस होती है?", body: "एक पूरे टर्म का लिखित नोटिस दीजिए, या नोटिस की जगह एक टर्म की फीस। सिक्योरिटी डिपॉज़िट स्कूल छोड़ने के तीस दिन के अंदर वापस होता है।", group: "फीस" } },
  ],

  /* ── CLEARED: the Boarding page ──────────────────────────────────────── */
  boarding: {
    hi: {
      intro: "यहाँ हर बच्चा बोर्डर है, इसलिए बोर्डिंग कोई एक्स्ट्रा नहीं: यही स्कूल है। हर हाउस में बड़े लोग साथ रहते हैं, डॉरमिटरी के फ़्लोर पर मेट्रन रहती हैं, और नियम है कि कोई बच्चा उस दिन किसी से बात किए बिना सोने नहीं जाता।",
    },
    intro: "Every child here is a boarder, so boarding is not an extra: it is the school. Each house has adults who live in it, a matron on the dormitory floor, and a rule that no child goes to bed without someone having spoken to them that day.",
    houses: [
      { title: "Junior house", body: "Class IV to VI, boys and girls on separate floors, dormitories of eight, a housemistress and two matrons.", hi: { title: "जूनियर हाउस", body: "कक्षा 4 से 6, लड़के और लड़कियाँ अलग फ़्लोर पर, आठ बच्चों की डॉरमिटरी, एक हाउसमिस्ट्रेस और दो मेट्रन।" } },
      { title: "Trishul House", body: "Boys, Class VII to XII. Housemaster and his family live in. Colour: red.", hi: { title: "त्रिशूल हाउस", body: "लड़के, कक्षा 7 से 12। हाउसमास्टर अपने परिवार के साथ यहीं रहते हैं। रंग: लाल।" } },
      { title: "Nanda Devi House", body: "Girls, Class VII to XII. Housemistress and her family live in. Colour: blue.", hi: { title: "नंदा देवी हाउस", body: "लड़कियाँ, कक्षा 7 से 12। हाउसमिस्ट्रेस अपने परिवार के साथ यहीं रहती हैं। रंग: नीला।" } },
      { title: "Panchachuli House", body: "Girls, Class VII to XII. Colour: green.", hi: { title: "पंचाचूली हाउस", body: "लड़कियाँ, कक्षा 7 से 12। रंग: हरा।" } },
      { title: "Kamet House", body: "Boys, Class VII to XII. Colour: yellow.", hi: { title: "कामेट हाउस", body: "लड़के, कक्षा 7 से 12। रंग: पीला।" } },
    ],
    routine: [
      { label: "Rising bell", time: "6:00 am", days: "Monday to Saturday", hi: { label: "जागने की घंटी", days: "सोमवार से शनिवार", time: "सुबह 6 बजे" } },
      { label: "Physical training or run", time: "6:20 to 6:50 am", hi: { label: "पीटी या दौड़", time: "सुबह 6:20 से 6:50 बजे" } },
      { label: "Breakfast", time: "7:15 am", hi: { label: "नाश्ता", time: "सुबह 7:15 बजे" } },
      { label: "Assembly and classes", time: "8:00 am to 2:00 pm", subject: "Lunch at 12:40 pm", hi: { label: "असेंबली और क्लास", time: "सुबह 8 से दोपहर 2 बजे", subject: "दोपहर का खाना 12:40 बजे" } },
      { label: "Rest", time: "2:30 to 3:30 pm", hi: { label: "आराम", time: "दोपहर 2:30 से 3:30 बजे" } },
      { label: "Games and activities", time: "4:00 to 5:45 pm", hi: { label: "खेल और गतिविधियाँ", time: "शाम 4 से 5:45 बजे" } },
      { label: "Supper", time: "6:00 pm", hi: { label: "रात का खाना", time: "शाम 6 बजे" } },
      { label: "Prep, supervised in each house", time: "6:30 to 8:30 pm", hi: { label: "प्रेप, हर हाउस में निगरानी में", time: "शाम 6:30 से 8:30 बजे" } },
      { label: "Lights out", time: "8:30 pm juniors, 9:30 pm to 10:00 pm seniors", hi: { label: "लाइट्स ऑफ़", time: "जूनियर रात 8:30 बजे, सीनियर रात 9:30 से 10 बजे" } },
      { label: "Sunday", time: "Late breakfast at 8:30 am", days: "Sunday", subject: "Letters, nature walk, calls home from 4:00 pm", hi: { label: "रविवार", days: "रविवार", time: "देर से नाश्ता, सुबह 8:30 बजे", subject: "चिट्ठियाँ, नेचर वॉक, और शाम 4 बजे से घर पर फ़ोन" } },
    ],
    topics: [
      { title: "Food", body: "Four meals a day in the dining hall, vegetarian and non-vegetarian tables, and a four-week menu. Allergies and religious diets are kept on a list the kitchen works from.", group: "Daily life", hi: { title: "खाना", body: "डाइनिंग हॉल में दिन में चार बार खाना, शाकाहारी और मांसाहारी टेबल अलग, और चार हफ़्ते का मेन्यू। एलर्जी और धार्मिक खान-पान की सूची किचन के पास रहती है और उसी के हिसाब से खाना बनता है।", group: "रोज़ की ज़िंदगी" } },
      { title: "Health centre", body: "Eight beds and two nurses around the clock. A doctor visits every morning, and the hospital in Almora is twenty minutes away. You are called the same day your child is admitted.", group: "Health", hi: { title: "हेल्थ सेंटर", body: "आठ बेड और चौबीसों घंटे दो नर्स। डॉक्टर हर सुबह आते हैं, और अल्मोड़ा का अस्पताल बीस मिनट दूर है। बच्चा भर्ती हो तो आपको उसी दिन फ़ोन किया जाता है।", group: "सेहत" } },
      { title: "Pastoral care", body: "The housemaster, the matron, a tutor for every twelve boarders, and the counsellor, who meets every new boarder in the first fortnight and anyone who asks after that.", group: "Care", hi: { title: "बच्चों की देखभाल", body: "हाउसमास्टर, मेट्रन, हर बारह बोर्डर पर एक ट्यूटर, और काउंसलर, जो हर नए बोर्डर से पहले पंद्रह दिन में मिलती हैं और उसके बाद जो भी चाहे उससे।", group: "देखभाल" } },
      { title: "Staying in touch", body: "A call home every Sunday, a letter from the house every fortnight, and the housemaster's number for anything urgent. Parents may write or send a parcel at any time.", group: "Care", hi: { title: "संपर्क में रहना", body: "हर रविवार घर पर फ़ोन, हर पंद्रह दिन में हाउस से चिट्ठी, और किसी भी ज़रूरी बात के लिए हाउसमास्टर का नंबर। पैरेंट्स कभी भी चिट्ठी या पार्सल भेज सकते हैं।", group: "देखभाल" } },
      { title: "Visits and exeats", body: "Two visiting weekends a year, in May and October. A boarder goes out only with an adult on the authorised list, signed out and back in at the house.", group: "Visits", hi: { title: "मिलने आना और बाहर जाना", body: "साल में दो विज़िटिंग वीकेंड, मई और अक्टूबर में। बोर्डर सिर्फ़ मंज़ूर सूची वाले किसी बड़े के साथ बाहर जाता है, हाउस में साइन करके जाता और लौटता है।", group: "मुलाक़ात" } },
      { title: "Pocket money", body: "Held by the house and set by you, up to ₹1,500 a month, spent at the tuck shop on Saturdays and accounted for each term.", group: "Daily life", hi: { title: "पॉकेट मनी", body: "हाउस के पास रहती है और रक़म आप तय करते हैं, महीने में ₹1,500 तक। शनिवार को टक शॉप पर ख़र्च होती है और हर टर्म उसका हिसाब मिलता है।", group: "रोज़ की ज़िंदगी" } },
      { title: "What to pack", body: "The trunk list comes with the offer: uniform, a warm jacket for November, walking boots, bedding, and nothing that plugs in.", group: "Before term", hi: { title: "साथ क्या भेजें", body: "ट्रंक की सूची ऑफ़र के साथ आती है: यूनिफ़ॉर्म, नवंबर के लिए गर्म जैकेट, वॉकिंग बूट, बिस्तर, और बिजली से चलने वाली कोई चीज़ नहीं।", group: "टर्म से पहले" } },
    ],
    termDates: [
      { title: "Term 1", date: "1 March to 3 July 2027", body: "Visiting weekend 15 and 16 May.", hi: { title: "टर्म 1", date: "1 मार्च से 3 जुलाई 2027", body: "विज़िटिंग वीकेंड 15 और 16 मई।" } },
      { title: "Summer break", date: "4 to 22 July 2027", body: "Boarders go home; escorted journeys run both ways.", hi: { title: "गर्मी की छुट्टियाँ", date: "4 से 22 जुलाई 2027", body: "बोर्डर घर जाते हैं; दोनों तरफ़ स्टाफ़ के साथ सफ़र की सुविधा।" } },
      { title: "Term 2", date: "23 July to 27 November 2027", body: "Visiting weekend 9 and 10 October. Founder's Day 13 November.", hi: { title: "टर्म 2", date: "23 जुलाई से 27 नवंबर 2027", body: "विज़िटिंग वीकेंड 9 और 10 अक्टूबर। फ़ाउंडर्स डे 13 नवंबर।" } },
      { title: "Winter break", date: "28 November 2027 to 27 February 2028", hi: { title: "सर्दी की छुट्टियाँ", date: "28 नवंबर 2027 से 27 फ़रवरी 2028" } },
    ],
    howToReach: [
      { title: "By rail", body: "Kathgodam is the nearest railhead, 90 km and about three hours by road. The overnight trains from Delhi and Lucknow arrive in the morning, and the school's escorted journeys start here.", hi: { title: "ट्रेन से", body: "सबसे पास का रेलवे स्टेशन काठगोदाम है, 90 किमी और सड़क से लगभग तीन घंटे। दिल्ली और लखनऊ से रात की ट्रेनें सुबह पहुँचती हैं, और स्कूल का स्टाफ़ के साथ सफ़र यहीं से शुरू होता है।" } },
      { title: "By road", body: "From Delhi, about 360 km through Haldwani and Bhowali, nine to ten hours. The last 7 km above Almora are a narrow hill road.", hi: { title: "सड़क से", body: "दिल्ली से हल्द्वानी और भोवाली होकर लगभग 360 किमी, नौ से दस घंटे। अल्मोड़ा के ऊपर के आख़िरी 7 किमी पतली पहाड़ी सड़क है।" } },
      { title: "By air", body: "Pantnagar is the nearest airport, about 125 km away. Dehradun and Delhi have more flights.", hi: { title: "हवाई जहाज़ से", body: "सबसे पास का एयरपोर्ट पंतनगर है, लगभग 125 किमी दूर। देहरादून और दिल्ली से ज़्यादा फ़्लाइट हैं।" } },
      { title: "Staying nearby", body: "The admissions office keeps a list of guest houses in Almora for visiting weekends. We do not book them.", hi: { title: "पास में ठहरना", body: "विज़िटिंग वीकेंड के लिए एडमिशन ऑफ़िस अल्मोड़ा के गेस्ट हाउस की सूची रखता है। बुकिंग हम नहीं करते।" } },
    ],
  },

  /* ── CLEARED: the Student life page (needs two or more) ──────────────── */
  studentLife: [
    { title: "Outdoor pursuits", body: "Every boarder takes trekking, rock climbing or cross-country. Each term ends with a house trek, from a one-night camp for juniors to five days on the Pindari route for Class XI.", hi: { title: "आउटडोर गतिविधियाँ", body: "हर बोर्डर ट्रेकिंग, रॉक क्लाइंबिंग या क्रॉस-कंट्री लेता है। हर टर्म का अंत हाउस ट्रेक से होता है, जूनियर के लिए एक रात के कैंप से लेकर कक्षा 11 के लिए पिंडारी रूट पर पाँच दिन तक।" } },
    { title: "House competitions", body: "Athletics, cross-country, debating, music and drama, and a house cup that is announced on Founder's Day.", hi: { title: "हाउस प्रतियोगिताएँ", body: "एथलेटिक्स, क्रॉस-कंट्री, डिबेट, संगीत और नाटक, और एक हाउस कप जिसकी घोषणा फ़ाउंडर्स डे पर होती है।" } },
    { title: "Sport", body: "Football and hockey in the monsoon term, basketball and tennis all year, and athletics before the summer break.", hi: { title: "खेल", body: "मानसून टर्म में फ़ुटबॉल और हॉकी, पूरे साल बास्केटबॉल और टेनिस, और गर्मी की छुट्टियों से पहले एथलेटिक्स।" } },
    { title: "Music and drama", body: "A school band, a choir, and one full play each year in the chapel hall.", hi: { title: "संगीत और नाटक", body: "एक स्कूल बैंड, एक कॉयर, और हर साल चैपल हॉल में एक पूरा नाटक।" } },
    { title: "Service", body: "Class IX to XII teach at the village primary school below the estate on Saturday mornings, and run its library.", hi: { title: "सेवा", body: "कक्षा 9 से 12 के बच्चे शनिवार सुबह कैंपस के नीचे गाँव के प्राइमरी स्कूल में पढ़ाते हैं, और उसकी लाइब्रेरी चलाते हैं।" } },
    { title: "Sundays", body: "Letters in the morning, a nature walk with the biology department, and calls home from four.", hi: { title: "रविवार", body: "सुबह चिट्ठियाँ, बायोलॉजी विभाग के साथ नेचर वॉक, और चार बजे से घर पर फ़ोन।" } },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Visiting weekend, 10 and 11 October",
      hi: {
        title: "विज़िटिंग वीकेंड, 10 और 11 अक्टूबर",
        date: "24 सितंबर 2026",
        body: "पैरेंट्स बच्चों को सुबह 10 से शाम 5 बजे तक बाहर ले जा सकते हैं। हाउस में आउटिंग रजिस्टर पर साइन कीजिए, और बच्चे को ख़ुद हाउसमास्टर को सौंपिए।",
      },
      date: "24 September 2026",
      body: "Parents may take their children out from 10:00 am to 5:00 pm. Sign the outing register at the house, and hand your child back to the housemaster in person.",
      pinned: true,
      kind: "event",
      posted: "2026-09-24",
      expires: "2026-10-11",
    },
    {
      title: "Inter-house cross-country, Saturday 3 October",
      hi: {
        title: "इंटर-हाउस क्रॉस-कंट्री, शनिवार 3 अक्टूबर",
        date: "18 सितंबर 2026",
        body: "जूनियर 3 किमी दौड़ते हैं, सीनियर 8 किमी का रिज कोर्स। पैरेंट्स सुबह 9:30 बजे से निचले मैदान पर फ़िनिश लाइन पर आ सकते हैं।",
      },
      date: "18 September 2026",
      body: "Juniors run 3 km, seniors the 8 km ridge course. Parents are welcome at the finish on the lower field from 9:30 am.",
      kind: "event",
      posted: "2026-09-18",
      expires: "2026-10-03",
    },
    {
      title: "Winter uniform from Thursday 15 October",
      hi: {
        title: "गुरुवार 15 अक्टूबर से सर्दी की यूनिफ़ॉर्म",
        date: "11 सितंबर 2026",
        body: "ब्लेज़र, स्वेटर, और ग्रे पैंट या स्कर्ट। जो सामान कम हो, वह विज़िटिंग वीकेंड के पार्सल के साथ भेज दीजिए।",
      },
      date: "11 September 2026",
      body: "Blazers, sweaters, and grey trousers or skirts. Please send any missing items with the visiting-weekend parcel.",
      kind: "notice",
      posted: "2026-09-11",
      expires: "2026-10-31",
    },
    {
      title: "Founder's Day, Saturday 14 November",
      hi: {
        title: "फ़ाउंडर्स डे, शनिवार 14 नवंबर",
        date: "4 सितंबर 2026",
        body: "असेंबली हॉल में सुबह 10:30 बजे पुरस्कार वितरण। कक्षा 12 के बोर्डर्स के पैरेंट्स आमंत्रित हैं, कार्ड डाक से आएगा।",
      },
      date: "4 September 2026",
      body: "Prize-giving at 10:30 am in the assembly hall. Parents of Class XII boarders are invited, and the card follows by post.",
      kind: "event",
      posted: "2026-09-04",
      expires: "2026-11-14",
    },
    {
      title: "Winter break escorts: book by 31 October",
      hi: {
        title: "सर्दी की छुट्टियों का सफ़र: 31 अक्टूबर तक बुक करें",
        date: "20 सितंबर 2026",
        body: "स्टाफ़ के साथ सफ़र शनिवार 28 नवंबर को स्कूल से काठगोदाम, फिर दिल्ली और लखनऊ के लिए निकलेगा। हाउस को बताइए कि बच्चा कौन-सा लेगा।",
      },
      date: "20 September 2026",
      body: "Escorted journeys leave the school on Saturday 28 November for Kathgodam, then Delhi and Lucknow. Tell the house which one your child will take.",
      kind: "notice",
      posted: "2026-09-20",
      expires: "2026-10-31",
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    hi: {
      hours: "एडमिशन ऑफ़िस सोमवार से शनिवार, सुबह 9 से शाम 4 बजे तक खुला। बोर्डर्स से रविवार शाम 4 से 7 बजे के बीच फ़ोन पर बात हो सकती है।",
      landmark: "अल्मोड़ा से 7 किमी ऊपर, Example Road पर, फ़ॉरेस्ट चेक पोस्ट के आगे",
      addressLines: ["Buransh Hill School", "Example Road, अल्मोड़ा से 7 किमी ऊपर", "ज़िला अल्मोड़ा, उत्तराखंड 263000"],
    },
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "admissions@example.com",
    addressLines: ["Buransh Hill School", "Example Road, 7 km above Almora", "District Almora, Uttarakhand 263000"],
    hours: "Admissions office open Monday to Saturday, 9:00 am to 4:00 pm. Boarders may be called on Sundays between 4:00 and 7:00 pm.",
    mapQuery: "Buransh Hill School, Almora",
    landmark: "7 km above Almora on the Example Road, past the forest check post",
    branches: [
      { name: "Delhi admissions office and assessment centre", addressLines: ["Buransh Hill School city office", "22 Example Road, Lajpat Nagar", "New Delhi 110000"], phone: "+91 00000 00000", hours: "Monday to Friday, 10:00 am to 5:00 pm, October to January", hi: { name: "दिल्ली एडमिशन ऑफ़िस और टेस्ट सेंटर", addressLines: ["Buransh Hill School सिटी ऑफ़िस", "22 Example Road, लाजपत नगर", "नई दिल्ली 110000"], hours: "सोमवार से शुक्रवार, सुबह 10 से शाम 5 बजे तक, अक्टूबर से जनवरी" } },
    ],
  },

  /* ── CLEARED: the Parents page. Links only, example.com in a template. ── */
  portalLinks: [
    { label: "Parent portal", url: "https://example.com/parents", audience: "Parents", note: "Term reports, the housemaster's letters, the infirmary log", hi: { label: "पैरेंट पोर्टल", audience: "पैरेंट्स", note: "टर्म रिपोर्ट, हाउसमास्टर की चिट्ठियाँ, इन्फ़र्मरी का रिकॉर्ड" } },
    { label: "Pay term fees", url: "https://example.com/fees", audience: "Parents", note: "With a receipt by email", hi: { label: "टर्म फीस भरें", audience: "पैरेंट्स", note: "रसीद ईमेल पर" } },
    { label: "Book an escorted journey", url: "https://example.com/travel", audience: "Parents", note: "Kathgodam to Delhi or Lucknow, each break", hi: { label: "स्टाफ़ के साथ सफ़र बुक करें", audience: "पैरेंट्स", note: "हर छुट्टी में काठगोदाम से दिल्ली या लखनऊ" } },
  ],
  downloads: [
    { label: "Trunk list 2027", group: "Before term", hi: { label: "ट्रंक की सूची 2027", group: "टर्म से पहले" } },
    { label: "Medical and consent form", group: "Forms", hi: { label: "मेडिकल और सहमति फ़ॉर्म", group: "फ़ॉर्म" } },
    { label: "Authorised adults form, for outings", group: "Forms", hi: { label: "आउटिंग के लिए मंज़ूर लोगों का फ़ॉर्म", group: "फ़ॉर्म" } },
    { label: "Term dates 2027", group: "Calendar", hi: { label: "टर्म की तारीख़ें 2027", group: "कैलेंडर" } },
  ],

  /* ── CLEARED: the Policies page ──────────────────────────────────────── */
  policies: [
    { title: "Safeguarding and child protection", body: "Every adult on the estate is police verified. No adult is alone with a boarder behind a closed door, and house staff never enter a dormitory alone at night. The designated safeguarding lead is the counsellor, who reports to the Headmistress the same day, and the POCSO committee meets within a week of any report.", hi: { title: "बच्चों की सुरक्षा और संरक्षण", body: "कैंपस पर हर बड़े व्यक्ति का पुलिस वेरिफ़िकेशन होता है। कोई भी बड़ा किसी बोर्डर के साथ बंद दरवाज़े के पीछे अकेला नहीं रहता, और हाउस स्टाफ़ रात में कभी अकेले डॉरमिटरी में नहीं जाता। सुरक्षा की ज़िम्मेदार काउंसलर हैं, जो उसी दिन हेडमिस्ट्रेस को रिपोर्ट करती हैं, और किसी भी शिकायत के एक हफ़्ते के अंदर POCSO कमेटी की बैठक होती है।" } },
    { title: "Anti-bullying", body: "Ragging and initiation of any kind lead to withdrawal. Seniors are prefects, not guardians, and have no power to punish. Every boarder knows two adults outside their house they can go to.", hi: { title: "बुलिंग के ख़िलाफ़ नियम", body: "किसी भी तरह की रैगिंग पर बच्चे को स्कूल से निकाला जाता है। सीनियर प्रीफ़ेक्ट हैं, अभिभावक नहीं, और उन्हें सज़ा देने का कोई अधिकार नहीं। हर बोर्डर अपने हाउस के बाहर के दो बड़ों को जानता है जिनके पास वह जा सकता है।" } },
    { title: "Health and medicines", body: "All medicines, including those sent from home, are held and given by the infirmary. Parents are called before any procedure beyond first aid, except in an emergency.", hi: { title: "सेहत और दवाइयाँ", body: "घर से भेजी गई दवाइयों समेत सारी दवाइयाँ इन्फ़र्मरी के पास रहती हैं और वहीं से दी जाती हैं। फ़र्स्ट एड से आगे के किसी भी इलाज से पहले पैरेंट्स को फ़ोन किया जाता है, इमरजेंसी को छोड़कर।" } },
    { title: "Phones and devices", body: "Phones and laptops are kept by the house and used for calls home and for coursework in the library. Class XI and XII may keep a laptop for prep.", hi: { title: "फ़ोन और डिवाइस", body: "फ़ोन और लैपटॉप हाउस के पास रहते हैं, और घर पर फ़ोन और लाइब्रेरी में पढ़ाई के काम के लिए इस्तेमाल होते हैं। कक्षा 11 और 12 प्रेप के लिए लैपटॉप अपने पास रख सकते हैं।" } },
    { title: "Fee refund and withdrawal", body: "A full term's notice in writing, or a term's fee in lieu. The security deposit is refunded within thirty days. Fees are never raised in the middle of a year.", hi: { title: "फीस वापसी और स्कूल छोड़ना", body: "एक पूरे टर्म का लिखित नोटिस, या नोटिस की जगह एक टर्म की फीस। सिक्योरिटी डिपॉज़िट तीस दिन के अंदर वापस होता है। साल के बीच में फीस कभी नहीं बढ़ाई जाती।" } },
  ],
});
