/**
 * TEMPLATE s2: RURAL STATE-BOARD SCHOOL.
 *
 * Segment: a private UP Board school on the edge of a small town, Nursery to
 * Class X, with a Hindi-medium and an English-medium section in every class.
 * Registry: Warm family, `aangan` theme, hero A: stacked, notice-first,
 * Inter only, the lightest page. See ../index.ts.
 *
 * WHO READS IT, AND WHAT THEY ASK FIRST. A parent from one of the villages
 * around the town, on a basic Android phone on patchy data, often in Hindi.
 * The research on rural school choice (ASER-based studies, the Odisha and UP
 * school-choice papers) puts the same five things on top every time: the
 * MEDIUM, the DISTANCE and whether there is a van, the FEES, the board
 * RESULTS, and whether the school is actually running this week. So:
 *   - the tagline answers medium, fees and the van in one line;
 *   - every age band prints the fee for the whole year AND the monthly
 *     figure, because that is how the fee is paid and how it is compared;
 *   - the admissions note carries the van fee by distance and says there is
 *     no donation, which is the question a parent will not ask out loud;
 *   - the notices are the ones a village parent opens the site for: the
 *     exam date sheet, the Saturday parents' meeting, the winter timing, and
 *     the scholarship form the office fills in for them;
 *   - results are in UP Board's own vocabulary: High School (Class X), pass
 *     percentage, first divisions (60 per cent and above), distinctions (75
 *     and above in a subject).
 *
 * HINDI FIRST, AND BOTH LANGUAGES EVERYWHERE (26 September 2026). The site
 * opens in Hindi (`defaultLang: "hi"`), because that is what most parents
 * read. Every plain field is ENGLISH and its Hindi sits in the same object's
 * `hi` block under the same key, in the mixed register a small-town notice
 * board uses ("Date sheet बच्चों की diary में"). So the English toggle shows
 * English everywhere, which was Mehdi's bug, and the Hindi toggle shows the
 * Hindi the school would write. No Devanagari phrase carries the serif italic
 * accent (the device serif has no Devanagari glyphs); the tagline's accent
 * falls on a Latin-script phrase in both languages.
 *
 * NINE PAGES, THE LIGHTEST SITE: Home, About, Admissions, Academics, Faculty,
 * Results, Gallery, News, Contact. Transport is a block on Contact and the
 * facilities a block on About; there is no Parents, Disclosure or Policies
 * page, because this is not a CBSE school and it has no parent portal.
 * Admissions for 2027-28 open on 1 March 2027, so `admissionsOpenUntil` is
 * left empty and the "open until" chip stays hidden until the school sets it.
 *
 * AGE BANDS USE ROMAN CLASS NUMERALS ("Class I to V, ages 6 to 10"), as s1
 * does. The page reads the age range off the digits in the first and last
 * band, so an Arabic class number there would print "Ages 1 to 15".
 *
 * THE INSTITUTE DOES NOT EXIST. Kachnar (कचनार) is the orchid tree, common in
 * the Awadh countryside; a search on 26 September 2026 for "Kachnar Vidya
 * Niketan" and "Kachnar Public School" found no school by either name. Sandila
 * is a real town in Hardoi district; nothing here describes a real school in
 * it. No village is named. The phone, email, street, PIN and affiliation line
 * are the reserved fiction patterns in ../shape.ts.
 */

import { SCHOOL_PAGE_SETS } from "../../site/pageSets";
import { defineTemplateContent } from "../shape";

export default defineTemplateContent("school", {
  /* ── KEPT: the page list and the opening language ────────────────────── */
  sitePages: [...SCHOOL_PAGE_SETS["s2-rural-state-board"]],
  defaultLang: "hi",

  /* ── The Hindi of every top-level text field. Only principalTitle's Hindi
        survives a duplicate (its English is kept); the rest is cleared. ─── */
  hi: {
    tagline: "हिंदी और English दोनों medium, पूरे साल की fees पहले से तय, और 22 गाँवों तक *school van*।",
    about: "कचनार विद्या निकेतन 1998 में दो किराए के कमरों में 46 बच्चों के साथ शुरू हुआ। आज यहाँ Nursery से कक्षा 10 तक 640 बच्चे पढ़ते हैं, सण्डीला से 3 km बाहर हमारी अपनी दो एकड़ ज़मीन पर। कक्षा 1 से हर कक्षा के दो section हैं: एक हिंदी medium और एक English medium। दोनों में UP Board का एक ही syllabus है और एक ही test होते हैं। चार school van 22 गाँवों से आती हैं, और कोई route 14 km से लंबा नहीं है। पूरे साल की fees कक्षा के हिसाब से इसी page पर लिखी है। कोई donation नहीं, कोई building fund नहीं।",
    principalTitle: "प्रधानाचार्य",
    principalMessage: "नमस्ते। मैं 2009 में यहाँ गणित पढ़ाने आई थी और 2018 से प्रधानाचार्य हूँ। हमारा पहला नियम है कि बच्चा रोज़ स्कूल आए। जिस दिन कोई बच्चा नहीं आता, उसकी class teacher उसी दिन घर पर फ़ोन करती हैं। Fees, van और किताबों का पूरा हिसाब इसी page पर लिखा है। किसी भी दिन सुबह आइए, कक्षा में बैठकर देखिए, और जो पूछना हो सीधे मुझसे पूछिए।",
    resultsHeading: "हाईस्कूल परीक्षा 2026 का result",
    resultsNote: "इस हिस्से का हर आँकड़ा उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि परिणाम कैसे दिखेगा। आपके अपने परिणाम इसकी जगह लेंगे, ठीक वैसे ही जैसे आप छापते हैं।",
    admissionsHeadline: "सत्र 2027-28 के admission सोमवार, 1 मार्च 2027 से शुरू",
    vision: "हर गाँव का बच्चा, चाहे हिंदी medium में पढ़े या English में, दसवीं के बाद अपने पैरों पर खड़ा होने लायक पढ़ाई लेकर निकले।",
    mission: "रोज़ की हाज़िरी, हर बच्चे की copy हर हफ़्ते जाँची हुई, fees साल की शुरुआत में तय और पूरी लिखी हुई, और हर गाँव तक van।",
    sessionLabel: "2027-28",
  },
  sessionLabel: "2027-28",
  vision: "Every child from the villages around us, in the Hindi or the English medium, leaves Class X able to stand on their own feet.",
  mission: "A child in school every day, every exercise book checked every week, the year's fees fixed and printed in April, and a van to every village we serve.",
  udiseCode: "09000000000 (example)",

  /* ── CLEARED ON DUPLICATE: identity ──────────────────────────────────── */
  instituteName: "Kachnar Vidya Niketan",
  /* Medium, fees and the van: the three things a village parent asks before
     anything else. The accent is on the Latin phrase, never on Devanagari. */
  tagline: "Hindi and English medium, the whole year's fees fixed in advance, and a *school van* to 22 villages.",
  city: "Sandila",
  state: "Uttar Pradesh",

  /* ── KEPT: market, language and currency ─────────────────────────────── */
  country: "India",
  market: "india",
  currency: "INR",

  /* ── CLEARED: history and board ──────────────────────────────────────── */
  /* "Estd." is what the signboard at the gate says. */
  established: "Estd. 1998",
  establishedYear: "1998",
  boardOrAffiliation: "UP Board, Hindi and English medium, example affiliation no. 00000000",

  about:
    "Kachnar Vidya Niketan opened in 1998 in two rented rooms, with 46 children. Today 640 children study here, from Nursery to Class X, on our own two-acre ground 3 km outside Sandila. From Class I, every class has two sections: one Hindi medium and one English medium. Both follow the same UP Board syllabus and sit the same tests. Four school vans come in from 22 villages, and no route is longer than 14 km. The fee for the whole year is printed on this page, class by class. There is no donation and no building fund.",

  /* ── The head. Name and message CLEARED; the title is KEPT ───────────── */
  principalName: "Neelam Awasthi",
  principalTitle: "Principal",
  principalMessage:
    "Namaste. I came here to teach mathematics in 2009 and have been Principal since 2018. Our first rule is that a child comes to school every day. On the day a child is absent, the class teacher phones home that same day. The full account of fees, the van and the books is written on this page. Come any morning, sit in a class and see for yourself, and ask me directly whatever you want to know.",

  /* ── STRUCTURE: age bands. Name, level, subjects and timings are KEPT;
        seats, fee, feeNote and detail are CLEARED. The timings are the
        summer and winter pattern every school in the state board keeps. ── */
  courses: [
    {
      name: "Pre-primary",
      level: "Nursery, LKG and UKG, ages 3 to 5",
      subjects: "Hindi and English letters, counting, rhymes, drawing and play",
      timings: "8:00 am to 12:00 noon",
      seats: "25 children, a teacher and a helper",
      fee: "5,400",
      feeNote: "for the year (₹450 a month)",
      detail: "A separate van trip at noon takes the small children home first, so nobody waits two hours at the gate.",
      hi: {
        name: "प्री-प्राइमरी",
        level: "Nursery, LKG और UKG, उम्र 3 से 5 साल",
        subjects: "हिंदी और English के अक्षर, गिनती, कविताएँ, drawing और खेल",
        timings: "सुबह 8:00 से दोपहर 12:00 बजे तक",
        feeNote: "पूरे साल के लिए (₹450 महीना)",
        detail: "दोपहर 12 बजे van का एक अलग चक्कर छोटे बच्चों को पहले घर छोड़ता है, ताकि कोई दो घंटे gate पर इंतज़ार न करे।",
      },
    },
    {
      name: "Primary",
      level: "Class I to V, ages 6 to 10",
      subjects: "Hindi, English, mathematics, environmental studies, drawing and games",
      timings: "8:00 am to 2:00 pm in summer, 9:00 am to 3:00 pm in winter",
      seats: "Two sections of 35: Hindi medium and English medium",
      fee: "6,600",
      feeNote: "for the year (₹550 a month)",
      detail: "Every child reads aloud to the teacher every day, in Hindi and in English, whichever medium they study in.",
      hi: {
        name: "प्राइमरी",
        level: "कक्षा 1 से 5, उम्र 6 से 10 साल",
        subjects: "हिंदी, English, गणित, पर्यावरण अध्ययन, drawing और खेल",
        timings: "गर्मी में सुबह 8:00 से 2:00 बजे, सर्दी में 9:00 से 3:00 बजे",
        feeNote: "पूरे साल के लिए (₹550 महीना)",
        detail: "हर बच्चा रोज़ teacher को ज़ोर से पढ़कर सुनाता है, हिंदी में भी और English में भी, medium चाहे कोई भी हो।",
      },
    },
    {
      name: "Junior",
      level: "Class VI to VIII, ages 11 to 13",
      subjects: "Hindi, English, mathematics, science, social science, Sanskrit and computer",
      timings: "8:00 am to 2:00 pm in summer, 9:00 am to 3:00 pm in winter",
      seats: "Two sections of 40: Hindi medium and English medium",
      fee: "7,800",
      feeNote: "for the year (₹650 a month)",
      detail: "Science is done with the kit in the laboratory from Class VI, not only read from the book.",
      hi: {
        name: "जूनियर",
        level: "कक्षा 6 से 8, उम्र 11 से 13 साल",
        subjects: "हिंदी, English, गणित, विज्ञान, सामाजिक विज्ञान, संस्कृत और computer",
        timings: "गर्मी में सुबह 8:00 से 2:00 बजे, सर्दी में 9:00 से 3:00 बजे",
        feeNote: "पूरे साल के लिए (₹650 महीना)",
        detail: "कक्षा 6 से विज्ञान lab में kit के साथ करके सीखा जाता है, सिर्फ़ किताब से पढ़ा नहीं जाता।",
      },
    },
    {
      /* "High school", lower case: the page runs the last band on inside a
         sentence ("Pre-primary to high school"). */
      name: "High school",
      level: "Class IX to X, ages 14 to 15",
      subjects: "Hindi, English, mathematics, science, social science, and a sixth subject: drawing, computer or Sanskrit",
      timings: "8:00 am to 2:00 pm in summer, 9:00 am to 3:00 pm in winter",
      seats: "Two sections of 40",
      fee: "9,600",
      feeNote: "for the year (₹800 a month). Board exam fee extra.",
      detail: "Extra classes for Class X from 3:00 to 4:00 pm in January and February, at no charge. The office fills in the board registration for every child.",
      hi: {
        name: "हाईस्कूल",
        level: "कक्षा 9 और 10, उम्र 14 से 15 साल",
        subjects: "हिंदी, English, गणित, विज्ञान, सामाजिक विज्ञान, और छठा विषय: drawing, computer या संस्कृत",
        timings: "गर्मी में सुबह 8:00 से 2:00 बजे, सर्दी में 9:00 से 3:00 बजे",
        feeNote: "पूरे साल के लिए (₹800 महीना)। Board exam की fees अलग।",
        detail: "जनवरी और फ़रवरी में कक्षा 10 की extra class दोपहर 3:00 से 4:00 बजे तक, बिना किसी fees के। Board registration का form office हर बच्चे के लिए भरता है।",
      },
    },
  ],

  /* ── CLEARED: results. UP Board's own terms; no student named, ever. ─── */
  resultsHeading: "High School examination 2026: the result",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a result list is set. Your own results replace it line for line, exactly as you publish them.",
  results: [
    { achievement: "98.4% passed", exam: "UP Board High School", year: "2026", note: "63 of 64 students", category: "High School", hi: { achievement: "98.4% पास", note: "64 में से 63 बच्चे" } },
    { achievement: "41 first divisions", exam: "UP Board High School", year: "2026", note: "60% marks or above", category: "High School", hi: { achievement: "41 प्रथम श्रेणी", note: "60% या उससे ज़्यादा अंक" } },
    { achievement: "12 distinctions in mathematics", exam: "UP Board High School", year: "2026", note: "75 marks or above", category: "High School", hi: { achievement: "गणित में 12 विशेष योग्यता", note: "75 या उससे ज़्यादा अंक" } },
    { achievement: "89.5% highest aggregate", exam: "UP Board High School", year: "2026", category: "High School", hi: { achievement: "सबसे ज़्यादा कुल अंक 89.5%" } },
    { achievement: "96.6% passed", exam: "UP Board High School", year: "2025", note: "57 of 59 students", category: "High School", hi: { achievement: "96.6% पास", note: "59 में से 57 बच्चे" } },
  ],

  /* ── CLEARED: the board table, three years, in the columns CBSE uses
        (registered, passed, pass percentage), which is also how a UP Board
        school reports to the district. ──────────────────────────────────── */
  boardResults: [
    { year: "2026", className: "High School (X)", registered: "64", passed: "63", passPercent: "98.4%" },
    { year: "2025", className: "High School (X)", registered: "59", passed: "57", passPercent: "96.6%" },
    { year: "2024", className: "High School (X)", registered: "55", passed: "53", passPercent: "96.4%" },
  ],

  /* ── CLEARED: the proof row, each figure with its basis line ─────────── */
  stats: [
    { value: "640", label: "Children, Nursery to Class X", basis: "Enrolment in July 2026", hi: { label: "बच्चे, Nursery से कक्षा 10 तक", basis: "जुलाई 2026 की नामांकन सूची" } },
    { value: "98.4%", label: "Passed the High School exam", basis: "UP Board 2026, 63 of 64", hi: { label: "हाईस्कूल परीक्षा में पास", basis: "UP Board 2026, 64 में से 63" } },
    { value: "22", label: "Villages the school vans reach", basis: "Four vans, no route over 14 km", hi: { label: "गाँव जहाँ तक school van जाती है", basis: "चार van, कोई route 14 km से लंबा नहीं" } },
  ],

  /* ── CLEARED: Academics page. The state syllabus, model papers and the
        downloads a parent actually asks the office for. ─────────────────── */
  academics: {
    intro: "We teach the UP Board syllabus and the prescribed books, the same in both mediums. From Class I every child learns to read and write in both Hindi and English, and sits the same monthly test as the other section.",
    stages: [
      { title: "Pre-primary (Nursery to UKG)", body: "Letters in both scripts, counting to a hundred, rhymes and play. No written exam.", hi: { title: "प्री-प्राइमरी (Nursery से UKG)", body: "दोनों लिपियों के अक्षर, सौ तक गिनती, कविताएँ और खेल। कोई लिखित परीक्षा नहीं।" } },
      { title: "Primary (Class I to V)", body: "Reading aloud every day, tables by heart by Class III, and one project each term on the village, the fields or the weather.", hi: { title: "प्राइमरी (कक्षा 1 से 5)", body: "रोज़ ज़ोर से पढ़ना, कक्षा 3 तक पहाड़े याद, और हर term में गाँव, खेत या मौसम पर एक project।" } },
      { title: "Junior (Class VI to VIII)", body: "Science in the laboratory, Sanskrit and computer as subjects, and a monthly test in every subject.", hi: { title: "जूनियर (कक्षा 6 से 8)", body: "विज्ञान lab में, संस्कृत और computer विषय के रूप में, और हर विषय का मासिक test।" } },
      { title: "High School (Class IX and X)", body: "The UP Board syllabus with two model-paper rounds before the board, practicals in our own laboratory, and free extra classes in January and February.", hi: { title: "हाईस्कूल (कक्षा 9 और 10)", body: "UP Board का syllabus, board से पहले model paper के दो दौर, अपनी lab में practical, और जनवरी-फ़रवरी में मुफ़्त extra class।" } },
    ],
    assessment: "A monthly test in every subject from Class III, a half-yearly exam in October and an annual exam in March. The report card goes home after each exam, and the class teacher explains it at the parents' meeting.",
    calendar: [
      { title: "Half-yearly examinations, Class III to X", date: "6 to 15 October 2026", hi: { title: "अर्धवार्षिक परीक्षा, कक्षा 3 से 10", date: "6 से 15 अक्टूबर 2026" } },
      { title: "Diwali holidays", date: "7 to 11 November 2026", hi: { title: "दीपावली की छुट्टियाँ", date: "7 से 11 नवंबर 2026" } },
      { title: "Winter holidays", date: "31 December 2026 to 14 January 2027", hi: { title: "सर्दी की छुट्टियाँ", date: "31 दिसंबर 2026 से 14 जनवरी 2027" } },
      { title: "UP Board High School exams", date: "February and March 2027, as the Board announces", hi: { title: "UP Board हाईस्कूल परीक्षा", date: "फ़रवरी और मार्च 2027, Board की घोषणा के अनुसार" } },
      { title: "Annual examinations, Nursery to Class IX", date: "March 2027", hi: { title: "वार्षिक परीक्षा, Nursery से कक्षा 9", date: "मार्च 2027" } },
      { title: "Session 2027-28 begins", date: "1 April 2027", hi: { title: "सत्र 2027-28 शुरू", date: "1 अप्रैल 2027" } },
    ],
    downloads: [
      { label: "UP Board model papers, High School", group: "Model papers", hi: { label: "UP Board model paper, हाईस्कूल", group: "Model paper" } },
      { label: "Syllabus 2026-27, Class I to X", group: "Syllabus", hi: { label: "Syllabus 2026-27, कक्षा 1 से 10", group: "Syllabus" } },
      { label: "Book list 2026-27", group: "Lists", hi: { label: "किताबों की सूची 2026-27", group: "सूची" } },
      { label: "Transfer certificate application", group: "Forms", hi: { label: "TC (स्थानांतरण प्रमाणपत्र) का आवेदन", group: "Form" } },
    ],
    hi: {
      intro: "हम UP Board का syllabus और निर्धारित किताबें पढ़ाते हैं, दोनों medium में एक जैसा। कक्षा 1 से हर बच्चा हिंदी और English दोनों पढ़ना-लिखना सीखता है, और दूसरे section वाला ही मासिक test देता है।",
      assessment: "कक्षा 3 से हर विषय का मासिक test, अक्टूबर में अर्धवार्षिक और मार्च में वार्षिक परीक्षा। हर परीक्षा के बाद report card घर जाता है, और अभिभावक बैठक में class teacher उसे समझाती हैं।",
    },
  },

  /* ── KEPT WORD FOR WORD: facilities. What nearly every school of this kind
        has, and what a village parent checks for: separate toilets and water
        come first. The vans are in `about`, because not every school runs
        them. ─────────────────────────────────────────────────────────────── */
  facilities: [
    "Separate toilets for girls and boys, and clean drinking water",
    "Science laboratory for the high school classes",
    "Computer room",
    "Library and reading corner",
    "Playground for games, drill and the morning assembly",
    "First aid at the school office",
  ],

  /* ── CLEARED: faculty. Fictional names, initials avatars only. ───────── */
  faculty: [
    { name: "Neelam Awasthi", role: "Principal", group: "Leadership", subject: "Mathematics", qualification: "M.Sc. Mathematics, B.Ed.", experience: "17 years here, Principal since 2018", hi: { group: "प्रबंधन", role: "प्रधानाचार्या", subject: "गणित", experience: "यहाँ 17 साल, 2018 से प्रधानाचार्या" } },
    { name: "Sunita Mishra", group: "High school", subject: "Hindi and Sanskrit", qualification: "M.A. Hindi, B.Ed.", experience: "19 years, here since 2007", hi: { group: "हाईस्कूल", subject: "हिंदी और संस्कृत", experience: "19 साल, 2007 से यहाँ" } },
    { name: "Arun Kumar Verma", group: "High school", subject: "Mathematics", qualification: "M.Sc. Mathematics, B.Ed.", experience: "14 years, Class VI to X", style: "Gives every child one sum to do on the board every week.", hi: { group: "हाईस्कूल", subject: "गणित", experience: "14 साल, कक्षा 6 से 10", style: "हर हफ़्ते हर बच्चे से board पर एक सवाल हल करवाते हैं।" } },
    { name: "Farheen Siddiqui", group: "High school", subject: "English", qualification: "M.A. English, B.Ed.", experience: "8 years, the English medium sections", hi: { group: "हाईस्कूल", subject: "English", experience: "8 साल, English medium के section" } },
    { name: "Rakesh Yadav", group: "High school", subject: "Science", qualification: "M.Sc. Chemistry, B.Ed.", experience: "11 years, and runs the laboratory", hi: { group: "हाईस्कूल", subject: "विज्ञान", experience: "11 साल, और lab की ज़िम्मेदारी इन्हीं की" } },
    { name: "Poonam Shukla", group: "Primary", subject: "Class II class teacher", qualification: "B.A., D.El.Ed., UPTET", experience: "6 years, here since 2020", hi: { group: "प्राइमरी", subject: "कक्षा 2 की class teacher", experience: "6 साल, 2020 से यहाँ" } },
    { name: "Mohd. Irfan", group: "Primary", subject: "Games and physical education", qualification: "B.P.Ed.", experience: "12 years, takes the morning drill", hi: { group: "प्राइमरी", subject: "खेल और शारीरिक शिक्षा", experience: "12 साल, सुबह की drill यही कराते हैं" } },
  ],

  /* ── CLEARED: gallery. Captions only; they are also the shot list. The
        legacy gallery has no Hindi slot, so its captions are English and the
        Hindi lives in `photos` below. ───────────────────────────────────── */
  gallery: [
    { src: "", alt: "Morning assembly on the front ground, 7:45 am." },
    { src: "", alt: "Van 3 at the canal bridge stop, 7:05 am." },
    { src: "", alt: "Class IX science practical: testing leaves for starch." },
    { src: "", alt: "The Republic Day procession, 26 January." },
    { src: "", alt: "The computer room, Class VII, on a Thursday." },
    { src: "", alt: "Result day in April: parents at the notice board." },
  ],
  photos: [
    { src: "", alt: "Children in rows at the morning assembly", caption: "Morning assembly, 7:45 am", category: "School", hi: { alt: "सुबह की प्रार्थना सभा में कतार में खड़े बच्चे", caption: "सुबह की प्रार्थना सभा, 7:45 बजे", category: "स्कूल" } },
    { src: "", alt: "A school van at a roadside stop by a canal bridge", caption: "Van 3 at the canal bridge", category: "Van", hi: { alt: "नहर के पुल के पास stop पर school van", caption: "नहर पुल पर van 3", category: "Van" } },
    { src: "", alt: "Class IX pupils testing a leaf with iodine", caption: "Class IX science practical", category: "Classrooms", hi: { alt: "कक्षा 9 के बच्चे पत्ती पर iodine test करते हुए", caption: "कक्षा 9 का विज्ञान practical", category: "कक्षा" } },
    { src: "", alt: "Children with flags walking in a procession", caption: "Republic Day procession", category: "Festivals", hi: { alt: "झंडे लेकर प्रभात फेरी में चलते बच्चे", caption: "गणतंत्र दिवस की प्रभात फेरी", category: "त्योहार" } },
    { src: "", alt: "Pupils at computers in a small room", caption: "The computer room, Class VII", category: "Classrooms", hi: { alt: "छोटे कमरे में computer पर बैठे बच्चे", caption: "Computer room, कक्षा 7", category: "कक्षा" } },
    { src: "", alt: "Parents reading the result list on the notice board", caption: "Result day in April", category: "School", hi: { alt: "Notice board पर परिणाम पढ़ते अभिभावक", caption: "अप्रैल में परिणाम का दिन", category: "स्कूल" } },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  admissionsHeadline: "Admissions for session 2027-28 open on Monday 1 March 2027",
  admissions: {
    /* CLEARED. One row per line in the "come and see us" band; the text
       before the first colon is the row's heading. The session starts on
       1 April, as it does across the state board. */
    dates: [
      "Forms from Monday 1 March 2027: at the school office, 9:00 am to 1:00 pm. The form costs ₹100.",
      "Open day, Sunday 14 March: see the classrooms, the vans and the teachers in one morning",
      "Placement test, Saturday 20 March: Class II to IX, 9:00 am, in Hindi, English and mathematics",
      "New session, Thursday 1 April 2027: the first day ends at 11:00 am",
    ].join("\n"),
    /* KEPT, so generic: the process any small-town school runs. The test is
       for placing the child, not for turning a child away (RTE Act, s. 13). */
    steps: [
      "Come to the school office with your child on any working day and collect the admission form.",
      "Fill in the form at home and bring it back with the documents listed here.",
      "A child joining Class II or above sits a short test in Hindi, English and mathematics, so the class teacher knows where to begin.",
      "Pay the admission fee at the office counter, and collect the receipt and the book list.",
    ],
    /* KEPT, so generic. */
    documents: [
      "Birth certificate",
      "Aadhaar card of the child and of a parent",
      "Transfer certificate from the previous school, for Class II and above",
      "Mark sheet or report card of the last class passed",
      "Passport-size photographs of the child",
      "Income and caste certificates, only for a scholarship application",
    ],
    /* CLEARED. The whole-year cost, which is what the parent is adding up. */
    note: "Admission fee ₹500, paid once. Van fee by distance: ₹300 a month up to 5 km, ₹450 up to 10 km, ₹550 beyond. Books and uniform can be bought from any shop; the list is given at admission. There is no donation and no building fund.",
    whoCanApply: "Nursery to Class IX, in the Hindi or the English medium. Class X takes a child only on a transfer from another UP Board school.",
    timeline: [
      { title: "Forms at the office", date: "From Monday 1 March 2027", body: "9:00 am to 1:00 pm. The form costs ₹100.", hi: { title: "Office से form", date: "सोमवार 1 मार्च 2027 से", body: "सुबह 9:00 से 1:00 बजे तक। Form ₹100 का।" } },
      { title: "Open day", date: "Sunday 14 March 2027", body: "Classrooms, vans and teachers, all in one morning.", hi: { title: "प्रवेश उत्सव", date: "रविवार 14 मार्च 2027", body: "Classrooms, vans और teachers, सब एक सुबह में देखिए।" } },
      { title: "Placement test, Class II to IX", date: "Saturday 20 March 2027", body: "9:00 am, in Hindi, English and mathematics.", hi: { title: "Placement test, कक्षा 2 से 9", date: "शनिवार 20 मार्च 2027", body: "सुबह 9:00 बजे, हिंदी, English और गणित।" } },
      { title: "New session begins", date: "Thursday 1 April 2027", body: "The first day ends at 11:00 am.", hi: { title: "नया सत्र शुरू", date: "गुरुवार 1 अप्रैल 2027", body: "पहले दिन छुट्टी 11:00 बजे।" } },
    ],
    fees: [
      { label: "Admission fee", amount: "₹500", period: "one-time", note: "Paid once, at joining", hi: { label: "प्रवेश शुल्क", note: "एक बार, दाख़िले के समय" } },
      { label: "Pre-primary", amount: "₹450", period: "monthly", note: "₹5,400 for the year", hi: { label: "प्री-प्राइमरी", note: "पूरे साल के ₹5,400" } },
      { label: "Class I to V", amount: "₹550", period: "monthly", note: "₹6,600 for the year", hi: { label: "कक्षा 1 से 5", note: "पूरे साल के ₹6,600" } },
      { label: "Class VI to VIII", amount: "₹650", period: "monthly", note: "₹7,800 for the year", hi: { label: "कक्षा 6 से 8", note: "पूरे साल के ₹7,800" } },
      { label: "Class IX and X", amount: "₹800", period: "monthly", note: "₹9,600 for the year", hi: { label: "कक्षा 9 और 10", note: "पूरे साल के ₹9,600" } },
      { label: "School van", amount: "₹300 to ₹550", period: "also", note: "Monthly, by distance, only if you use it", hi: { label: "School van", note: "महीने का, दूरी के हिसाब से, सिर्फ़ van लेने पर" } },
      { label: "UP Board exam fee, Class X", amount: "As the Board sets it", period: "also", note: "Paid once, with the board form", hi: { label: "UP Board परीक्षा शुल्क, कक्षा 10", note: "एक बार, board form के साथ" } },
    ],
    feeNote: "The fee can be paid monthly, or for the year in April. It is fixed in April and does not change during the year. Every payment gets a printed receipt at the counter.",
    ageAsOn: "31 March 2027",
    ageRules: [
      { className: "Nursery", minAge: "3", maxAge: "4" },
      { className: "Class I", minAge: "6", maxAge: "7" },
    ],
    rteNote: "A quarter of the Nursery and Class I seats are for children from weaker and disadvantaged families under the RTE Act. They are allotted by the UP government's online lottery, not by the school, and the school charges those children no fee.",
    hi: {
      dates: [
        "सोमवार 1 मार्च 2027 से form: school office पर, सुबह 9:00 से 1:00 बजे तक। Form ₹100 का।",
        "प्रवेश उत्सव, रविवार 14 मार्च: classrooms, vans और teachers, सब एक सुबह में देखिए",
        "Placement test, शनिवार 20 मार्च: कक्षा 2 से 9, सुबह 9:00 बजे, हिंदी, English और गणित",
        "नया सत्र, गुरुवार 1 अप्रैल 2027: पहले दिन छुट्टी 11:00 बजे",
      ].join("\n"),
      note: "प्रवेश शुल्क ₹500, एक बार। Van की fees दूरी के हिसाब से: 5 km तक ₹300 महीना, 10 km तक ₹450, उससे आगे ₹550। किताबें और uniform किसी भी दुकान से ले सकते हैं; सूची दाख़िले पर मिलती है। कोई donation नहीं, कोई building fund नहीं।",
      whoCanApply: "Nursery से कक्षा 9 तक, हिंदी या English medium में। कक्षा 10 में सिर्फ़ किसी दूसरे UP Board school से transfer होकर आने वाले बच्चे।",
      feeNote: "Fees हर महीने दे सकते हैं, या अप्रैल में पूरे साल की एक साथ। Fees अप्रैल में तय होती है और साल के बीच नहीं बदलती। हर भुगतान पर counter से छपी हुई रसीद मिलती है।",
      rteNote: "RTE Act के तहत Nursery और कक्षा 1 की एक चौथाई सीटें कमज़ोर और वंचित परिवारों के बच्चों के लिए हैं। ये सीटें UP सरकार की online lottery से मिलती हैं, school से नहीं, और इन बच्चों से school कोई fees नहीं लेता।",
    },
  },

  /* ── CLEARED: questions, both languages. The two marked generic survive a
        duplicate, Hindi included. ───────────────────────────────────────── */
  faq: [
    { title: "Is there a donation or building fund?", body: "No. The fees on this page are the whole fee. If anyone asks for a donation in the school's name, tell the Principal.", group: "Admissions", hi: { title: "क्या कोई donation या building fund है?", body: "नहीं। इस page पर लिखी fees ही पूरी fees है। अगर कोई school के नाम पर donation माँगे, तो प्रधानाचार्य को बताइए।", group: "प्रवेश" } },
    { title: "Can my child change from Hindi medium to English medium?", body: "Yes, at the start of a session, after a talk with both class teachers. Most children who change do so in Class I or Class VI.", group: "Admissions", hi: { title: "क्या बच्चा हिंदी medium से English medium में जा सकता है?", body: "हाँ, सत्र की शुरुआत में, दोनों class teachers से बात करने के बाद। ज़्यादातर बच्चे कक्षा 1 या कक्षा 6 में बदलते हैं।", group: "प्रवेश" } },
    { title: "Can we visit before taking admission?", body: "Yes. Come on any working day during school hours and ask at the office to see a class.", group: "Admissions", generic: true, hi: { title: "क्या दाख़िले से पहले school देख सकते हैं?", body: "हाँ। School के समय में किसी भी कार्य-दिवस पर आइए और office में कहिए कि आप कक्षा देखना चाहते हैं।", group: "प्रवेश" } },
    { title: "Does the van come to our village?", body: "The four vans reach 22 villages. Call the office with the name of your village and the nearest stop, and we will tell you the van and the time.", group: "Van", hi: { title: "क्या van हमारे गाँव तक आती है?", body: "चार van 22 गाँवों तक जाती हैं। अपने गाँव और नज़दीकी stop का नाम बताकर office में फ़ोन कीजिए, हम van और समय बता देंगे।", group: "Van" } },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. What the parent opens
        the site to find out this week. ──────────────────────────────────── */
  notices: [
    {
      title: "Half-yearly exams from Tuesday 6 October",
      date: "24 September 2026",
      body: "Class III to X. The date sheet is written in each child's diary. On exam days school closes at 12:30 pm and the vans run at that time.",
      pinned: true,
      kind: "notice",
      posted: "2026-09-24",
      expires: "2026-10-15",
      hi: {
        title: "अर्धवार्षिक परीक्षा मंगलवार 6 अक्टूबर से",
        date: "24 सितंबर 2026",
        body: "कक्षा 3 से 10 तक। Date sheet बच्चों की diary में लिख दी गई है। परीक्षा के दिनों में छुट्टी 12:30 बजे होगी और vans उसी समय चलेंगी।",
      },
    },
    {
      title: "Parents' meeting, Saturday 3 October",
      date: "21 September 2026",
      body: "Come between 10:00 am and 12:00 noon. The class teacher will show you your child's exercise books and attendance. There are no classes that day.",
      kind: "event",
      posted: "2026-09-21",
      expires: "2026-10-03",
      hi: {
        title: "अभिभावक बैठक, शनिवार 3 अक्टूबर",
        date: "21 सितंबर 2026",
        body: "सुबह 10:00 से 12:00 बजे के बीच आइए। Class teacher बच्चे की copies और attendance दिखाएँगी। उस दिन पढ़ाई नहीं होगी।",
      },
    },
    {
      title: "Winter timing from Thursday 1 October",
      date: "16 September 2026",
      body: "School runs from 9:00 am to 3:00 pm until 31 March. Every van reaches its stops one hour later than in summer.",
      kind: "notice",
      posted: "2026-09-16",
      expires: "2026-10-31",
      hi: {
        title: "गुरुवार 1 अक्टूबर से सर्दी का समय",
        date: "16 सितंबर 2026",
        body: "31 मार्च तक school सुबह 9:00 से 3:00 बजे तक चलेगा। हर van अपने stop पर गर्मी से एक घंटा देर से पहुँचेगी।",
      },
    },
    {
      title: "Scholarship forms for Class IX and X",
      date: "8 September 2026",
      body: "The online pre-matric scholarship forms are open. Bring the income certificate, the caste certificate and the child's bank passbook, and the office will fill in the form for you at no charge.",
      kind: "notice",
      posted: "2026-09-08",
      expires: "2026-10-31",
      hi: {
        title: "कक्षा 9 और 10 के लिए छात्रवृत्ति form",
        date: "8 सितंबर 2026",
        body: "Pre-matric छात्रवृत्ति के online form खुल गए हैं। आय प्रमाणपत्र, जाति प्रमाणपत्र और बच्चे की bank passbook लेकर आइए, office बिना किसी शुल्क के form भर देगा।",
      },
    },
    {
      title: "Diwali mela at school, Friday 6 November",
      date: "15 September 2026",
      body: "Stalls made by Class VI to X, a rangoli competition, and the prize list for the half-yearly exams. Families are welcome from 10:00 am.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2026-11-06",
      hi: {
        title: "School में दीपावली मेला, शुक्रवार 6 नवंबर",
        date: "15 सितंबर 2026",
        body: "कक्षा 6 से 10 के बच्चों के stall, रंगोली प्रतियोगिता, और अर्धवार्षिक परीक्षा की इनाम सूची। परिवार सुबह 10:00 बजे से आ सकते हैं।",
      },
    },
  ],

  /* ── CLEARED: parents' words, in both languages. Fiction on its face. ─── */
  reviews: [
    {
      quote: "My son was in the Hindi medium till Class V. He moved to the English medium in Class VI, and his class teacher gave him extra reading for a month until he caught up.",
      relation: "Father of a Class VII student",
      source: "Example review written by Ideovent",
      consent: true,
      hi: { quote: "मेरा बेटा कक्षा 5 तक हिंदी medium में था। कक्षा 6 में English medium में गया, और class teacher ने एक महीने तक उसे अलग से पढ़ाया जब तक वह बराबर नहीं आ गया।", relation: "कक्षा 7 के छात्र के पिता" },
    },
    {
      quote: "The van comes to our village at 7:05 every day. In three years it has not missed a single morning.",
      relation: "Mother of two children, Class II and Class VIII",
      source: "Example review written by Ideovent",
      consent: true,
      hi: { quote: "Van रोज़ 7:05 पर हमारे गाँव आती है। तीन साल में एक दिन भी नहीं छूटी।", relation: "दो बच्चों की माँ, कक्षा 2 और कक्षा 8" },
    },
  ],

  /* ── CLEARED: the van routes. s2 has no Transport page; Contact carries
        this as a block. No village is named and no driver is ever listed. ── */
  transport: {
    intro: "Four vans reach 22 villages. No route is longer than 14 km, and every van has a woman helper.",
    routes: [
      { name: "Van 1, Hardoi road", stops: ["Canal bridge", "Primary health centre", "Mandi gate"], pickup: "7:05 am", drop: "2:20 pm" },
      { name: "Van 2, Malihabad road", stops: ["Brick kiln turn", "Panchayat bhawan", "Temple crossing"], pickup: "7:00 am", drop: "2:25 pm" },
      { name: "Van 3, Balamau side", stops: ["Canal bridge south", "Railway crossing", "Sugar mill gate"], pickup: "6:55 am", drop: "2:30 pm" },
      { name: "Van 4, town and noon trip", stops: ["Bus stand", "Tehsil", "Sabzi mandi"], pickup: "7:15 am", drop: "12:15 pm and 2:15 pm" },
    ],
    safety: [
      "A woman helper on every van",
      "Every van is registered as a school vehicle, with its papers at the office",
      "A child is handed only to a family member the office knows",
    ],
    feeNote: "₹300 a month up to 5 km, ₹450 up to 10 km, ₹550 beyond. Winter timings are one hour later, from 1 October to 31 March.",
    hi: {
      intro: "चार van 22 गाँवों तक जाती हैं। कोई route 14 km से लंबा नहीं, और हर van में एक महिला सहायक।",
      feeNote: "5 km तक ₹300 महीना, 10 km तक ₹450, उससे आगे ₹550। 1 अक्टूबर से 31 मार्च तक सर्दी में समय एक घंटा देर से।",
    },
  },

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "office@example.com",
    addressLines: ["Kachnar Vidya Niketan", "Example Road, 3 km from Sandila", "District Hardoi, Uttar Pradesh 241000"],
    hours: "Office open Monday to Saturday, 8:00 am to 1:00 pm. Fees are taken at the counter until 12:30 pm.",
    mapQuery: "Kachnar Vidya Niketan, Sandila",
    landmark: "On the Hardoi road, past the petrol pump, opposite the brick kiln",
    transportDesk: "+91 00000 00000",
    hi: {
      hours: "Office सोमवार से शनिवार, सुबह 8:00 से 1:00 बजे तक। Fees counter पर 12:30 बजे तक जमा होती है।",
      landmark: "Hardoi road पर, petrol pump के आगे, ईंट भट्ठे के सामने",
    },
  },
});
