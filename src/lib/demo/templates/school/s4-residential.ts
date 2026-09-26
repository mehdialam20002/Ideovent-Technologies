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
 * school, and the CBSE Appendix IX does not apply. English only; the Hindi
 * toggle falls back to this English, marked lang="en".
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

  /* ── CLEARED: the session and the registration window. A hill school's
        year runs March to November, so the session is one calendar year. ── */
  sessionLabel: "2027",
  admissionsOpenUntil: "2026-10-31",
  vision: "Boarders who leave at seventeen knowing how to live with other people, how to look after themselves on a mountain, and how to sit alone with a book.",
  mission: "Small houses with adults who live in them. A call home every Sunday and a letter from the house every fortnight. The mountain as a classroom, every week of the year.",
  hostel: "Every boarder lives in one of four houses, or the junior house up to Class VI. Dormitories hold twelve at most, with a matron on the same floor and the house staff living in.",

  /* ── CLEARED: the proof row, each figure with its basis line ─────────── */
  stats: [
    { value: "410", label: "Boarders, Class IV to XII", basis: "Roll on 1 March 2026. No day scholars" },
    { value: "12", label: "Children in a dormitory, at most", basis: "Junior house dormitories hold eight" },
    { value: "93.4%", label: "ISC average aggregate", basis: "ISC 2026, 58 candidates" },
    { value: "65", label: "Years of boarders", basis: "Founded in 1961" },
  ],

  /* ── CLEARED: parents' words. Fiction on its face. ───────────────────── */
  reviews: [
    { quote: "The fortnightly letter from the housemaster is the best thing we get. Two paragraphs, and it always has one thing we did not know about our son.", relation: "Parents of a Class VIII boarder, Delhi", source: "Example review written by Ideovent", consent: true },
    { quote: "She had never been away from home for a night. The first Sunday call was mostly crying. By the sixth it was mostly about the cross-country team.", relation: "Mother of a Class V boarder, Lucknow", source: "Example review written by Ideovent", consent: true },
    { quote: "Every extra on the term bill came with a receipt: the trek, the shoes, the dentist in Almora. We have never had a surprise.", relation: "Father of two boarders, Class IX and XII", source: "Example review written by Ideovent", consent: true },
  ],

  /* ── CLEARED: Academics page ─────────────────────────────────────────── */
  academics: {
    intro: "We teach the CISCE curriculum: ICSE at Class X and ISC at Class XII, with the junior and middle school built to lead into them. Classes are twenty to twenty-four, and the evening prep in each house is supervised by a teacher, so homework help is never more than a corridor away.",
    stages: [
      { title: "Junior school (Class IV to VI)", body: "A class teacher for most subjects, reading every evening in the junior house, and nature study on the estate every week." },
      { title: "Middle school (Class VII and VIII)", body: "Separate sciences begin, with a second language (Hindi, Sanskrit or French) and computer applications." },
      { title: "ICSE (Class IX and X)", body: "The CISCE syllabus, with an elective in computer applications, economics or art, and a full practice examination at the end of each term." },
      { title: "ISC (Class XI and XII)", body: "Science, commerce and humanities, with English in every stream. University counselling begins in Class XI." },
    ],
    assessment: "Two terms, each with a mid-term test and an end-of-term examination. Reports go home at the end of each term with a written note from the housemaster, the class teacher and the Headmistress.",
    calendar: [
      { title: "Visiting weekend", date: "10 and 11 October 2026" },
      { title: "Inter-house cross-country", date: "Saturday 3 October 2026" },
      { title: "End-of-term examinations", date: "2 to 12 November 2026" },
      { title: "Founder's Day and prize-giving", date: "Saturday 14 November 2026" },
      { title: "Entrance assessment for 2027", date: "Sunday 15 November 2026" },
      { title: "Winter break begins", date: "Saturday 28 November 2026" },
      { title: "Boarders report for 2027", date: "Sunday 28 February 2027, by 4:00 pm" },
      { title: "ICSE and ISC board examinations", date: "February and March 2027, as CISCE announces", body: "Class X and XII report back early, on 6 February." },
    ],
    downloads: [
      { label: "Prospectus 2027", group: "Admissions" },
      { label: "Book list 2027", group: "Lists" },
      { label: "ICSE specimen papers", group: "Model papers" },
      { label: "ISC specimen papers", group: "Model papers" },
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
    { achievement: "93.4% average aggregate", exam: "ISC", year: "2026", note: "58 candidates", category: "ISC" },
    { achievement: "91.7% average aggregate", exam: "ICSE", year: "2026", note: "61 candidates", category: "ICSE" },
    { achievement: "52 of 58 began university this year", exam: "ISC", year: "2026", note: "7 of them abroad", category: "Destinations" },
    { achievement: "100% passed", exam: "ICSE and ISC", year: "2026", note: "For the fourteenth year running", category: "ISC" },
    /* Destinations: a count per university, never a named student. */
    { achievement: "9 students", destination: "University of Delhi colleges", country: "India", exam: "ISC", year: "2026", category: "Destinations" },
    { achievement: "6 students", destination: "Private universities in the NCR and Pune", country: "India", exam: "ISC", year: "2026", category: "Destinations" },
    { achievement: "5 students", destination: "Engineering colleges through JEE Main", country: "India", exam: "ISC", year: "2026", category: "Destinations" },
    { achievement: "4 students", destination: "Universities in Canada", country: "Canada", exam: "ISC", year: "2026", category: "Destinations" },
    { achievement: "3 students", destination: "Universities in the United Kingdom", country: "United Kingdom", exam: "ISC", year: "2026", category: "Destinations" },
  ],

  /* ── CLEARED: the board table in the registered, passed, pass % columns ── */
  boardResults: [
    { year: "2026", className: "ICSE (X)", registered: "61", passed: "61", passPercent: "100%" },
    { year: "2026", className: "ISC (XII)", registered: "58", passed: "58", passPercent: "100%" },
    { year: "2025", className: "ICSE (X)", registered: "59", passed: "59", passPercent: "100%" },
    { year: "2025", className: "ISC (XII)", registered: "55", passed: "55", passPercent: "100%" },
    { year: "2024", className: "ICSE (X)", registered: "62", passed: "62", passPercent: "100%" },
    { year: "2024", className: "ISC (XII)", registered: "54", passed: "54", passPercent: "100%" },
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
    { title: "Five boarding houses", body: "Trishul, Nanda Devi, Panchachuli and Kamet for Class VII to XII, and the junior house for Class IV to VI. Dormitories of twelve, a common room, and a housemaster's flat in each.", group: "Boarding" },
    { title: "Dining hall", body: "All 410 boarders eat together, by house, four times a day. The menu runs on a four-week cycle and is posted in every house.", group: "Boarding" },
    { title: "Infirmary", body: "Eight beds, two nurses on shifts around the clock, and a doctor from Almora every morning. An ambulance is kept on the estate.", group: "Health" },
    { title: "Library", body: "About 22,000 books in the 1961 building, open until prep every evening and all Sunday afternoon.", group: "Academic" },
    { title: "Science and computer laboratories", body: "Physics, chemistry, biology and two computer rooms, open for supervised practicals on Saturday mornings too.", group: "Academic" },
    { title: "Playing fields and the ridge course", body: "Two fields, four tennis courts, a covered games hall, and an eight-kilometre cross-country course along the ridge.", group: "Sport" },
    { title: "Climbing wall and outdoor store", body: "A twelve-metre wall and the store for tents, ropes and boots used on the term treks.", group: "Sport" },
    { title: "Music school and chapel hall", body: "Six practice rooms, a band room, and the hall used for assemblies, plays and the Founder's Day concert.", group: "Arts" },
  ],

  /* ── CLEARED: faculty. Fictional names, initials avatars only. In a
        boarding school the teachers are also the house staff. ──────────── */
  faculty: [
    { name: "Nirupama Sen", role: "Headmistress", group: "Leadership", subject: "English", qualification: "M.A. English, M.Ed.", experience: "At Buransh Hill since 2004, Headmistress since 2018", hi: { group: "प्रबंधन" } },
    { name: "Deepika Bisht", role: "Housemistress, Nanda Devi House", group: "House staff", subject: "English", qualification: "M.A. English, B.Ed.", experience: "17 years, lives in the house with her family", style: "Reads the house a chapter aloud on Sunday nights, Class XII included.", hi: { group: "हॉस्टल स्टाफ" } },
    { name: "Sameer Qazi", role: "Housemaster, Kamet House", group: "House staff", subject: "History", qualification: "M.A. History, B.Ed.", experience: "9 years", hi: { group: "हॉस्टल स्टाफ" } },
    { name: "Harish Bhatt", group: "Teachers", subject: "Mathematics", qualification: "M.Sc. Mathematics, B.Ed.", experience: "22 years, Class IX to XII", style: "Takes the Class XII prep himself on the nights before a test.", hi: { group: "टीचर्स" } },
    { name: "Rebecca Thomas", group: "Teachers", subject: "Biology", qualification: "M.Sc. Botany, B.Ed.", experience: "11 years, and leads the Sunday nature walks", hi: { group: "टीचर्स" } },
    { name: "Mohan Singh Negi", role: "Head of outdoor pursuits", group: "Teachers", subject: "Physical education and outdoor pursuits", qualification: "M.P.Ed., basic mountaineering course", experience: "15 years, coaches cross-country", hi: { group: "टीचर्स" } },
    { name: "Anjali Kandpal", role: "School counsellor", group: "Pastoral care", subject: "Counselling", qualification: "M.A. Psychology", experience: "Meets every new boarder in the first fortnight", hi: { group: "बच्चों की देखभाल" } },
    { name: "Sister Mary Joseph", role: "Senior nurse", group: "Pastoral care", subject: "The infirmary", qualification: "B.Sc. Nursing", experience: "14 years, calls parents the same day a child is admitted", hi: { group: "बच्चों की देखभाल" } },
  ],

  /* ── CLEARED: gallery. Captions only; they are also the shot list. ───── */
  gallery: [
    { src: "", alt: "The main building, 1961, from the lower field." },
    { src: "", alt: "Trishul House at 9:00 pm, the last round before lights out." },
    { src: "", alt: "Sunday calls home in the common room, 5:00 pm." },
    { src: "", alt: "Breakfast in the dining hall, 7:15 am." },
    { src: "", alt: "The cross-country course along the ridge in October." },
    { src: "", alt: "Nanda Devi at sunrise, from the assembly ground." },
  ],
  photos: [
    { src: "", alt: "A stone building with a clock tower above a playing field", caption: "The main building, 1961", category: "Campus" },
    { src: "", alt: "A dormitory corridor lit at night, a housemaster at a door", caption: "Trishul House, the last round", category: "Boarding" },
    { src: "", alt: "Boarders on the common-room phones", caption: "Sunday calls home, 5:00 pm", category: "Boarding" },
    { src: "", alt: "Long tables in a dining hall at breakfast", caption: "Breakfast in the dining hall", category: "Boarding" },
    { src: "", alt: "Runners on a ridge path among pines", caption: "The cross-country course in October", category: "Outdoors" },
    { src: "", alt: "A snow peak at sunrise seen from a school ground", caption: "Nanda Devi from the assembly ground", category: "Campus" },
    { src: "", alt: "Boarders roped up on a climbing wall", caption: "The climbing wall", category: "Outdoors" },
    { src: "", alt: "A school band on a stage", caption: "The Founder's Day concert", category: "Events" },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  admissionsHeadline: "Admissions for March 2027: the entrance assessment is on Sunday 15 November 2026",
  admissions: {
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
      { title: "Registration closes", date: "31 October 2026", body: "The form and the registration fee reach the admissions office." },
      { title: "Visiting weekend, open to applicants", date: "10 and 11 October 2026", body: "See a house, meet the house staff, eat in the dining hall." },
      { title: "Entrance assessment", date: "Sunday 15 November 2026", body: "At the school or at the Delhi centre, 9:00 am to 1:00 pm." },
      { title: "Offers sent", date: "By 5 December 2026", body: "By email and by post." },
      { title: "Place confirmed", date: "By 10 January 2027", body: "The admission fee and the first term's fee, the medical form, and the trunk list." },
      { title: "New boarders report", date: "Sunday 28 February 2027, by 4:00 pm", body: "Parents stay for tea with the house staff." },
    ],
    fees: [
      { label: "Registration", amount: "₹5,000", period: "one-time", note: "With the form. Not refunded" },
      { label: "Admission fee", amount: "₹1,50,000", period: "one-time", note: "Paid once, on confirming the place" },
      { label: "Security deposit", amount: "₹75,000", period: "one-time", note: "Refunded in full when the child leaves" },
      { label: "Junior school, Class IV to VI", amount: "₹4,60,000", period: "annual", note: "Tuition, boarding, meals, laundry. In two terms" },
      { label: "Middle school, Class VII and VIII", amount: "₹4,85,000", period: "annual", note: "In two terms" },
      { label: "ICSE, Class IX and X", amount: "₹5,10,000", period: "annual", note: "In two terms" },
      { label: "ISC, Class XI and XII", amount: "₹5,40,000", period: "annual", note: "In two terms" },
      { label: "Uniform, bedding and trunk", amount: "About ₹48,000", period: "also", note: "First year; about ₹15,000 a year after" },
      { label: "Books, treks and outings", amount: "About ₹22,000", period: "also", note: "A year, billed at cost with receipts" },
      { label: "Escorted journey, Kathgodam to Delhi", amount: "₹3,800", period: "also", note: "Each way, only if you use it" },
      { label: "Pocket money", amount: "Up to ₹1,500", period: "also", note: "A month, held by the house, set by you" },
      { label: "ICSE and ISC board fees", amount: "As CISCE sets them", period: "also", note: "Class X and XII only" },
    ],
    feeNote: "Fees are paid in two terms, in February and July. They are revised once a year, for the next March, and never in the middle of a year. Everything billed at cost comes with the receipt.",
    ageAsOn: "1 March 2027",
    ageRules: [
      { className: "Class IV", minAge: "8", maxAge: "10" },
      { className: "Class V", minAge: "9", maxAge: "11" },
      { className: "Class VI", minAge: "10", maxAge: "12" },
      { className: "Class VII", minAge: "11", maxAge: "13" },
      { className: "Class IX", minAge: "13", maxAge: "15" },
      { className: "Class XI", minAge: "15", maxAge: "17" },
    ],
    rteNote: "Twelve need-based bursaries are awarded each year, up to the full fee including boarding, decided on family income after an offer is made. Ask the admissions office for the form.",
  },

  /* ── CLEARED: questions. The two marked generic survive a duplicate. ─── */
  faq: [
    { title: "Can we visit before applying?", body: "Yes. Write to the admissions office for a visit, and ask to see a boarding house and meet the house staff.", group: "Admissions", generic: true },
    { title: "How often can my child call home?", body: "Every Sunday between 4:00 and 7:00 pm from the house phones, and the housemaster writes to you every fortnight. Mobile phones are kept by the house.", group: "Boarding" },
    { title: "What happens if my child is ill?", body: "The infirmary admits them, the nurse calls you the same day, and the doctor from Almora sees them the next morning or sooner.", group: "Boarding" },
    { title: "Is the fee refunded if we withdraw?", body: "Give a full term's notice in writing, or pay a term's fee in lieu. The security deposit is refunded within thirty days of leaving.", group: "Fees" },
  ],

  /* ── CLEARED: the Boarding page ──────────────────────────────────────── */
  boarding: {
    intro: "Every child here is a boarder, so boarding is not an extra: it is the school. Each house has adults who live in it, a matron on the dormitory floor, and a rule that no child goes to bed without someone having spoken to them that day.",
    houses: [
      { title: "Junior house", body: "Class IV to VI, boys and girls on separate floors, dormitories of eight, a housemistress and two matrons." },
      { title: "Trishul House", body: "Boys, Class VII to XII. Housemaster and his family live in. Colour: red." },
      { title: "Nanda Devi House", body: "Girls, Class VII to XII. Housemistress and her family live in. Colour: blue." },
      { title: "Panchachuli House", body: "Girls, Class VII to XII. Colour: green." },
      { title: "Kamet House", body: "Boys, Class VII to XII. Colour: yellow." },
    ],
    routine: [
      { label: "Rising bell", time: "6:00 am", days: "Monday to Saturday", hi: { label: "जागने की घंटी", days: "सोमवार से शनिवार", time: "सुबह 6 बजे" } },
      { label: "Physical training or run", time: "6:20 to 6:50 am" },
      { label: "Breakfast", time: "7:15 am" },
      { label: "Assembly and classes", time: "8:00 am to 2:00 pm", subject: "Lunch at 12:40 pm" },
      { label: "Rest", time: "2:30 to 3:30 pm" },
      { label: "Games and activities", time: "4:00 to 5:45 pm" },
      { label: "Supper", time: "6:00 pm" },
      { label: "Prep, supervised in each house", time: "6:30 to 8:30 pm" },
      { label: "Lights out", time: "8:30 pm juniors, 9:30 pm to 10:00 pm seniors" },
      { label: "Sunday", time: "Late breakfast at 8:30 am", days: "Sunday", subject: "Letters, nature walk, calls home from 4:00 pm", hi: { label: "रविवार", days: "रविवार", time: "देर से नाश्ता, सुबह 8:30 बजे", subject: "चिट्ठियाँ, nature walk, और शाम 4 बजे से घर पर फ़ोन" } },
    ],
    topics: [
      { title: "Food", body: "Four meals a day in the dining hall, vegetarian and non-vegetarian tables, and a four-week menu. Allergies and religious diets are kept on a list the kitchen works from.", group: "Daily life" },
      { title: "Health centre", body: "Eight beds and two nurses around the clock. A doctor visits every morning, and the hospital in Almora is twenty minutes away. You are called the same day your child is admitted.", group: "Health" },
      { title: "Pastoral care", body: "The housemaster, the matron, a tutor for every twelve boarders, and the counsellor, who meets every new boarder in the first fortnight and anyone who asks after that.", group: "Care" },
      { title: "Staying in touch", body: "A call home every Sunday, a letter from the house every fortnight, and the housemaster's number for anything urgent. Parents may write or send a parcel at any time.", group: "Care" },
      { title: "Visits and exeats", body: "Two visiting weekends a year, in May and October. A boarder goes out only with an adult on the authorised list, signed out and back in at the house.", group: "Visits" },
      { title: "Pocket money", body: "Held by the house and set by you, up to ₹1,500 a month, spent at the tuck shop on Saturdays and accounted for each term.", group: "Daily life" },
      { title: "What to pack", body: "The trunk list comes with the offer: uniform, a warm jacket for November, walking boots, bedding, and nothing that plugs in.", group: "Before term" },
    ],
    termDates: [
      { title: "Term 1", date: "1 March to 3 July 2027", body: "Visiting weekend 15 and 16 May." },
      { title: "Summer break", date: "4 to 22 July 2027", body: "Boarders go home; escorted journeys run both ways." },
      { title: "Term 2", date: "23 July to 27 November 2027", body: "Visiting weekend 9 and 10 October. Founder's Day 13 November." },
      { title: "Winter break", date: "28 November 2027 to 27 February 2028" },
    ],
    howToReach: [
      { title: "By rail", body: "Kathgodam is the nearest railhead, 90 km and about three hours by road. The overnight trains from Delhi and Lucknow arrive in the morning, and the school's escorted journeys start here." },
      { title: "By road", body: "From Delhi, about 360 km through Haldwani and Bhowali, nine to ten hours. The last 7 km above Almora are a narrow hill road." },
      { title: "By air", body: "Pantnagar is the nearest airport, about 125 km away. Dehradun and Delhi have more flights." },
      { title: "Staying nearby", body: "The admissions office keeps a list of guest houses in Almora for visiting weekends. We do not book them." },
    ],
  },

  /* ── CLEARED: the Student life page (needs two or more) ──────────────── */
  studentLife: [
    { title: "Outdoor pursuits", body: "Every boarder takes trekking, rock climbing or cross-country. Each term ends with a house trek, from a one-night camp for juniors to five days on the Pindari route for Class XI." },
    { title: "House competitions", body: "Athletics, cross-country, debating, music and drama, and a house cup that is announced on Founder's Day." },
    { title: "Sport", body: "Football and hockey in the monsoon term, basketball and tennis all year, and athletics before the summer break." },
    { title: "Music and drama", body: "A school band, a choir, and one full play each year in the chapel hall." },
    { title: "Service", body: "Class IX to XII teach at the village primary school below the estate on Saturday mornings, and run its library." },
    { title: "Sundays", body: "Letters in the morning, a nature walk with the biology department, and calls home from four." },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Visiting weekend, 10 and 11 October",
      date: "24 September 2026",
      body: "Parents may take their children out from 10:00 am to 5:00 pm. Sign the outing register at the house, and hand your child back to the housemaster in person.",
      pinned: true,
      kind: "event",
      posted: "2026-09-24",
      expires: "2026-10-11",
    },
    {
      title: "Inter-house cross-country, Saturday 3 October",
      date: "18 September 2026",
      body: "Juniors run 3 km, seniors the 8 km ridge course. Parents are welcome at the finish on the lower field from 9:30 am.",
      kind: "event",
      posted: "2026-09-18",
      expires: "2026-10-03",
    },
    {
      title: "Winter uniform from Thursday 15 October",
      date: "11 September 2026",
      body: "Blazers, sweaters, and grey trousers or skirts. Please send any missing items with the visiting-weekend parcel.",
      kind: "notice",
      posted: "2026-09-11",
      expires: "2026-10-31",
    },
    {
      title: "Founder's Day, Saturday 14 November",
      date: "4 September 2026",
      body: "Prize-giving at 10:30 am in the assembly hall. Parents of Class XII boarders are invited, and the card follows by post.",
      kind: "event",
      posted: "2026-09-04",
      expires: "2026-11-14",
    },
    {
      title: "Winter break escorts: book by 31 October",
      date: "20 September 2026",
      body: "Escorted journeys leave the school on Saturday 28 November for Kathgodam, then Delhi and Lucknow. Tell the house which one your child will take.",
      kind: "notice",
      posted: "2026-09-20",
      expires: "2026-10-31",
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "admissions@example.com",
    addressLines: ["Buransh Hill School", "Example Road, 7 km above Almora", "District Almora, Uttarakhand 263000"],
    hours: "Admissions office open Monday to Saturday, 9:00 am to 4:00 pm. Boarders may be called on Sundays between 4:00 and 7:00 pm.",
    mapQuery: "Buransh Hill School, Almora",
    landmark: "7 km above Almora on the Example Road, past the forest check post",
    branches: [
      { name: "Delhi admissions office and assessment centre", addressLines: ["Buransh Hill School city office", "22 Example Road, Lajpat Nagar", "New Delhi 110000"], phone: "+91 00000 00000", hours: "Monday to Friday, 10:00 am to 5:00 pm, October to January" },
    ],
  },

  /* ── CLEARED: the Parents page. Links only, example.com in a template. ── */
  portalLinks: [
    { label: "Parent portal", url: "https://example.com/parents", audience: "Parents", note: "Term reports, the housemaster's letters, the infirmary log" },
    { label: "Pay term fees", url: "https://example.com/fees", audience: "Parents", note: "With a receipt by email" },
    { label: "Book an escorted journey", url: "https://example.com/travel", audience: "Parents", note: "Kathgodam to Delhi or Lucknow, each break" },
  ],
  downloads: [
    { label: "Trunk list 2027", group: "Before term" },
    { label: "Medical and consent form", group: "Forms" },
    { label: "Authorised adults form, for outings", group: "Forms" },
    { label: "Term dates 2027", group: "Calendar" },
  ],

  /* ── CLEARED: the Policies page ──────────────────────────────────────── */
  policies: [
    { title: "Safeguarding and child protection", body: "Every adult on the estate is police verified. No adult is alone with a boarder behind a closed door, and house staff never enter a dormitory alone at night. The designated safeguarding lead is the counsellor, who reports to the Headmistress the same day, and the POCSO committee meets within a week of any report." },
    { title: "Anti-bullying", body: "Ragging and initiation of any kind lead to withdrawal. Seniors are prefects, not guardians, and have no power to punish. Every boarder knows two adults outside their house they can go to." },
    { title: "Health and medicines", body: "All medicines, including those sent from home, are held and given by the infirmary. Parents are called before any procedure beyond first aid, except in an emergency." },
    { title: "Phones and devices", body: "Phones and laptops are kept by the house and used for calls home and for coursework in the library. Class XI and XII may keep a laptop for prep." },
    { title: "Fee refund and withdrawal", body: "A full term's notice in writing, or a term's fee in lieu. The security deposit is refunded within thirty days. Fees are never raised in the middle of a year." },
  ],
});
