/**
 * TEMPLATE s1: URBAN CBSE SENIOR SECONDARY. The reference school template.
 *
 * Segment: a metro day school, Nursery to Class XII, CBSE, with science,
 * commerce and humanities streams at senior secondary. Parents are English
 * first, compare three or four schools on a laptop, and filter on the board,
 * the streams and the results before anything else.
 * Registry: Modern family, `metro` theme, hero A (see ../index.ts).
 *
 * THIS FILE IS THE MODEL FOR s2 TO s5. Every field the school renderer reads
 * is filled, at the quantities in DEMO-SITE-BRIEF.md section 9.3, and the
 * comments say which fields survive a duplicate and therefore have to be
 * written generic. Read ../shape.ts first for the fiction rules.
 *
 * THE INSTITUTE DOES NOT EXIST. "Harsingar" is the night jasmine; a search on
 * 25 September 2026 found no well-known school by this name. The phone, the
 * email, the street and the PIN are the reserved fiction patterns, and the
 * affiliation line says it is an example on its face.
 */

import { SCHOOL_PAGE_SETS } from "../../site/pageSets";
import { defineTemplateContent } from "../shape";

/*
 * MULTI-PAGE CONTENT (26 September 2026). s1 is the 14-page metro CBSE site:
 * Home, About, Admissions, Academics, Faculty, Facilities, Results, Gallery,
 * News, Parents, Transport, Disclosure, Policies, Contact. Every field below
 * the original set is CLEARED on duplicate except `sitePages`. The site is
 * English-first; the Hindi toggle falls back to this English, marked lang="en".
 */
export default defineTemplateContent("school", {
  /* ── KEPT: the page list for this segment ────────────────────────────── */
  sitePages: [...SCHOOL_PAGE_SETS["s1-urban-cbse"]],

  /* ── CLEARED: the session the admissions chip is recruiting for. The chip
        reads "Admissions 2027-28 open until 15 Dec 2026" and hides itself
        the day after. ──────────────────────────────────────────────────── */
  sessionLabel: "2027-28",
  admissionsOpenUntil: "2026-12-15",

  /* ── CLEARED ON DUPLICATE: the institute's identity ──────────────────── */
  instituteName: "Harsingar Senior Secondary School",
  /* One phrase in *asterisks* is set in the serif italic accent. */
  tagline: "Thirty to a class, three streams at Class XI, and results we publish *in full*.",
  city: "Gurugram",
  state: "Haryana",

  /* ── KEPT: market, language and currency ─────────────────────────────── */
  country: "India",
  market: "india",
  currency: "INR",

  /* ── CLEARED: history and board ──────────────────────────────────────── */
  established: "Founded 2004",
  establishedYear: "2004",
  boardOrAffiliation: "CBSE senior secondary, example affiliation no. 00000000",

  about:
    "Harsingar opened in 2004 with 140 children and a single building on a two-acre plot. It now teaches 1,260 pupils from Nursery to Class XII in one shift, on a five-acre campus in south Gurugram. Classes are capped at thirty and sections at four per grade, so a teacher knows every child in the year by the end of the first term. At Class XI a pupil chooses science, commerce or humanities, and every stream shares the same four periods of English, physical education, a language and a workshop. We publish our board results each July, subject by subject, including the subjects where we fell short.",

  /* ── CLEARED: About page ─────────────────────────────────────────────── */
  vision: "A school where a child is known by name in every corridor, and leaves at seventeen able to read closely, argue fairly and make things with their hands.",
  mission: "Small sections, one shift, teachers who stay. Board results published in full every July. A workshop subject and a sport for every child from Class VI, graded or not.",

  /* ── CLEARED: the proof row. Each figure carries its basis line, and a
        figure without one never animates. ───────────────────────────────── */
  stats: [
    { value: "1,260", label: "Pupils, Nursery to Class XII", basis: "Enrolment on 1 August 2026, one shift" },
    { value: "93.6%", label: "Class XII average aggregate", basis: "CBSE 2026, 142 candidates, all streams" },
    { value: "30", label: "Children in a section, at most", basis: "28 at Class XI and XII" },
    { value: "17", label: "Years a teacher stays here, on average", basis: "Teaching staff on 1 August 2026" },
  ],

  /* ── CLEARED: parents' words. Fiction on its face: a relation and a
        source line that says Ideovent wrote it, never a name. ──────────── */
  reviews: [
    {
      quote: "We moved from Pune in Class VI. By the second week the class teacher had called us twice, once about a slip in maths and once just to say he had found his table at lunch.",
      relation: "Parent of a Class VIII pupil",
      source: "Example review written by Ideovent",
      consent: true,
    },
    {
      quote: "The stream counselling was the first school meeting where my daughter did most of the talking. She took humanities against her board marks, and nobody tried to talk her out of it.",
      relation: "Parent of a Class XII pupil, humanities",
      source: "Example review written by Ideovent",
      consent: true,
    },
    {
      quote: "The fee schedule we were given in January was the fee schedule we paid. No new heads in July.",
      relation: "Parent of two, Class III and Class VII",
      source: "Example review written by Ideovent",
      consent: true,
    },
  ],

  /* ── The head. Name and message CLEARED; the title is KEPT ───────────── */
  principalName: "Meenal Chawla",
  principalTitle: "Principal",
  principalMessage:
    "I joined Harsingar as a mathematics teacher in 2009 and became Principal in 2019. Parents usually ask me about marks, and I answer, but I would rather they asked what an ordinary Wednesday looks like for their child. Come on a Wednesday. Sit in a Class VII science period and a Class XII accountancy period. If what you see does not match this website, tell me.",

  /* ── STRUCTURE: age bands. Name, level, subjects and timings are KEPT;
        seats and detail are CLEARED, so put the claims in `detail`. ─────── */
  courses: [
    {
      name: "Pre-primary",
      level: "Nursery to UKG, ages 3 to 5",
      subjects: "Language, early number, music, movement, outdoor play",
      timings: "8:30 am to 12:30 pm",
      seats: "24 children, a teacher and an assistant",
      detail: "No written homework until Class I. The last forty minutes of the day are outdoors unless it is raining.",
    },
    {
      name: "Primary",
      level: "Class I to V, ages 6 to 10",
      subjects: "English, Hindi, mathematics, environmental studies, art, games",
      timings: "8:00 am to 2:00 pm",
      seats: "30 per section",
      detail: "Reading is assessed one child at a time, twice a year, and the notes go home with the report card rather than being reduced to a grade.",
    },
    {
      name: "Middle school",
      level: "Class VI to VIII, ages 11 to 13",
      subjects: "English, Hindi, Sanskrit or French, mathematics, science, social science, computing",
      timings: "8:00 am to 2:30 pm",
      seats: "30 per section",
      detail: "Every child takes one workshop subject, carpentry, textiles or electronics, and one sport. Neither is graded and neither is optional.",
    },
    {
      name: "Secondary",
      level: "Class IX to X, ages 14 to 15",
      subjects: "CBSE core subjects, with Sanskrit or French as the third language",
      timings: "8:00 am to 2:30 pm",
      seats: "30 per section",
      detail: "Two full practice cycles in Class X, marked by the teacher who taught the chapter and returned within a week.",
    },
    {
      name: "Senior secondary",
      level: "Class XI to XII, ages 16 to 17",
      subjects: "Science (medical and non-medical), commerce and humanities. Economics, psychology and computer science are open to all three streams",
      timings: "8:00 am to 2:40 pm",
      seats: "28 per section",
      detail: "The stream is decided at a counselling meeting with the child and both parents after the Class X pre-boards, not from the mark sheet alone.",
    },
  ],

  /* ── CLEARED: Academics page ─────────────────────────────────────────── */
  academics: {
    intro: "We follow the CBSE curriculum and the NCERT books from Class I, with the National Curriculum Framework's stages in mind: play-based to Class II, activity-based to Class V, subjects from Class VI. What we add is time: two library periods a week to Class VIII, a workshop subject in middle school, and practicals that are done rather than copied.",
    stages: [
      { title: "Foundational (Nursery to Class II)", body: "Stories, number games, songs and outdoor play. Reading readiness is assessed one child at a time. No written homework before Class I." },
      { title: "Preparatory (Class III to V)", body: "English, Hindi, mathematics and environmental studies, taught through projects that end in something a parent can see at the term exhibition." },
      { title: "Middle (Class VI to VIII)", body: "Science, social science and a third language arrive as subjects. Every child takes one workshop subject and one sport." },
      { title: "Secondary (Class IX and X)", body: "The CBSE board syllabus, two practice cycles in Class X, and a teacher who returns each paper within a week." },
      { title: "Senior secondary (Class XI and XII)", body: "Science (medical and non-medical), commerce and humanities. Economics, psychology and computer science are open to all three streams. Practicals in our own laboratories, not a demonstration." },
    ],
    assessment: "Class I to VIII: two periodic tests and a half-yearly and annual examination, with a holistic progress card that describes reading, number and conduct in sentences, not only grades. Class IX to XII: the CBSE scheme, with internal assessment (periodic tests, notebooks, subject enrichment and practicals) marked by the subject teacher and moderated by the head of department.",
    calendar: [
      { title: "Half-yearly examinations, Class VI to XII", date: "6 to 17 October 2026" },
      { title: "Dussehra break", date: "19 to 21 October 2026" },
      { title: "Diwali break", date: "6 to 11 November 2026" },
      { title: "Parent-teacher meeting, all classes", date: "Saturday 21 November 2026" },
      { title: "Winter break", date: "25 December 2026 to 3 January 2027" },
      { title: "Class X and XII pre-board examinations", date: "4 to 20 January 2027" },
      { title: "CBSE board examinations begin", date: "Mid February 2027, as CBSE announces" },
      { title: "Session 2027-28 begins", date: "1 April 2027" },
    ],
    downloads: [
      { label: "Book list 2026-27, Class I to XII", group: "Lists" },
      { label: "Uniform list and suppliers", group: "Lists" },
      { label: "Holiday list 2026-27", group: "Calendar" },
      { label: "Class X sample papers, all subjects", group: "Model papers" },
      { label: "Class XII sample papers, all streams", group: "Model papers" },
      { label: "Transfer certificate request form", group: "Forms" },
    ],
  },

  /* ── CLEARED: results. Unit-carrying lines, no student named, ever. ──── */
  resultsHeading: "The 2026 board results",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a result list is set. Your own results replace it line for line, exactly as you publish them.",
  results: [
    { achievement: "93.6% average aggregate", exam: "CBSE Class XII", year: "2026", note: "142 candidates, all three streams", category: "Class XII" },
    { achievement: "91.2% average aggregate", exam: "CBSE Class X", year: "2026", note: "156 candidates", category: "Class X" },
    { achievement: "47 of 142 scored 95 or above in at least one subject", exam: "CBSE Class XII", year: "2026", category: "Class XII" },
    { achievement: "11 subjects offered at Class XII, none with fewer than eight pupils", exam: "Class XII", year: "2026", category: "Class XII" },
    { achievement: "90.8% average aggregate", exam: "CBSE Class XII", year: "2025", note: "136 candidates", category: "Class XII" },
    { achievement: "89.9% average aggregate", exam: "CBSE Class X", year: "2025", note: "151 candidates", category: "Class X" },
  ],

  /* ── CLEARED: the board table, in CBSE Appendix IX columns. Three years,
        both classes. It feeds the Results page and the Disclosure. ─────── */
  boardResults: [
    { year: "2026", className: "X", registered: "156", passed: "156", passPercent: "100%" },
    { year: "2026", className: "XII", registered: "142", passed: "141", passPercent: "99.3%", note: "One compartment in mathematics, cleared in July" },
    { year: "2025", className: "X", registered: "151", passed: "151", passPercent: "100%" },
    { year: "2025", className: "XII", registered: "136", passed: "136", passPercent: "100%" },
    { year: "2024", className: "X", registered: "148", passed: "147", passPercent: "99.3%" },
    { year: "2024", className: "XII", registered: "131", passed: "130", passPercent: "99.2%" },
  ],

  /* ── KEPT WORD FOR WORD: facilities. Only what nearly every school in the
        segment has, described generically: no counts, no hours, no names.
        The workshop and the garden live in `about` and `courses`, which are
        cleared, because not every CBSE school has them. ────────────────── */
  facilities: [
    "Science laboratories for physics, chemistry and biology",
    "Library and reading room",
    "Computer laboratory",
    "Activity rooms for music, art and dance",
    "Playground and indoor games hall",
    "Infirmary with a nurse on duty through the school day",
  ],

  /* ── CLEARED: the Facilities page, grouped. Specific, so cleared. ──────── */
  facilityDetails: [
    { title: "Three science laboratories", body: "Physics, chemistry and biology, each with 32 work stations, so a Class XI practical is done in pairs, not watched from the back.", group: "Science" },
    { title: "Workshop block", body: "Carpentry, textiles and electronics rooms for the Class VI to VIII workshop subject, with a technician in each.", group: "Science" },
    { title: "Library", body: "About 14,000 books, a reading room of 60 seats, and the Class I to VIII library periods. Open to parents on Saturday mornings.", group: "Library" },
    { title: "Computer laboratory", body: "Forty machines on a fibre line. Screens are off in the library and in the primary block.", group: "Library" },
    { title: "Field and games hall", body: "A 200-metre track, two basketball courts, a football field and an indoor hall for badminton and table tennis.", group: "Sports" },
    { title: "Music, art and dance rooms", body: "Three rooms off the main hall, and an auditorium of 600 seats for the annual day and the house assemblies.", group: "Arts" },
    { title: "Infirmary", body: "Two beds and a nurse through the school day. A doctor visits every Tuesday and Friday, and the annual health check is done here.", group: "Health" },
    { title: "Counselling room", body: "A quiet room next to the library for the counsellor and the special educator. Parents book time through the office.", group: "Health" },
  ],

  /* ── CLEARED: faculty. Fictional names, initials avatars only. The group
        feeds the Disclosure staff counts (PGT, TGT, PRT). ────────────────── */
  faculty: [
    { name: "Meenal Chawla", role: "Principal", group: "Leadership", subject: "Mathematics", qualification: "M.Sc. Mathematics, B.Ed.", experience: "17 years here, Principal since 2019", hi: { group: "प्रबंधन" } },
    { name: "Ritika Sehgal", role: "Head of Science", group: "PGT", subject: "Physics", qualification: "M.Sc. Physics, B.Ed.", experience: "16 years, Class XI and XII", style: "Every derivation starts from something the class has seen in the laboratory." },
    { name: "Arvind Kulkarni", group: "PGT", subject: "Mathematics", qualification: "M.Sc. Mathematics", experience: "21 years, here since 2006", style: "Ten minutes of mental arithmetic to open every period, Class XII included." },
    { name: "Nazia Farooqui", group: "PGT", subject: "English", qualification: "M.A. English, M.Phil.", experience: "12 years, Class VI to XII", style: "Reads every essay twice: once for the argument, once for the sentences." },
    { name: "Gurpreet Bains", group: "PGT", subject: "Accountancy and business studies", qualification: "M.Com., B.Ed.", experience: "14 years, commerce stream" },
    { name: "Sreeja Nair", group: "TGT", subject: "Science", qualification: "M.Sc. Zoology, B.Ed.", experience: "9 years, and runs the school garden" },
    { name: "Sudhir Tiwari", group: "TGT", subject: "Hindi and Sanskrit", qualification: "M.A. Hindi, B.Ed.", experience: "11 years, Class VI to X" },
    { name: "Kunal Bhardwaj", group: "PRT", subject: "Class III class teacher", qualification: "B.El.Ed.", experience: "7 years, here since 2019" },
    { name: "Anjali Rawat", group: "PRT", subject: "Pre-primary, UKG", qualification: "Diploma in Early Childhood Education", experience: "6 years" },
    { name: "Deepa Menon", group: "Special educator", subject: "Learning support", qualification: "M.Ed. Special Education, RCI registered", experience: "10 years", hi: { group: "स्पेशल एजुकेटर" } },
    { name: "Farhan Qureshi", group: "Counsellor", subject: "Counselling and wellness", qualification: "M.A. Psychology", experience: "8 years, runs the Class X and XII stream and career sessions", hi: { group: "काउंसलर" } },
  ],

  /* ── CLEARED: gallery. Captions only, never a file. The section is set
        from these typographically, and they double as the shot list. ────── */
  gallery: [
    { src: "", alt: "The main block from the field, ten minutes before assembly." },
    { src: "", alt: "Class VIII electronics workshop, Thursday afternoon." },
    { src: "", alt: "The library at 3:00 pm, when it is busiest." },
    { src: "", alt: "Inter-house basketball final." },
    { src: "", alt: "Chemistry laboratory, a Class XI practical." },
    { src: "", alt: "The gate at 7:50 on a Monday." },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  /* ── CLEARED: categorised captions for the Gallery page's chips. No file
        ever; the captions are the shot list for the real photographs. ───── */
  photos: [
    { src: "", alt: "The main block from the field before assembly", caption: "The main block, 7:55 am", category: "Campus" },
    { src: "", alt: "Pupils at work benches in the electronics workshop", caption: "Class VIII electronics workshop", category: "Classrooms" },
    { src: "", alt: "Pupils reading at long tables in the library", caption: "The library at 3:00 pm", category: "Campus" },
    { src: "", alt: "Two teams on the basketball court, spectators on the steps", caption: "Inter-house basketball final", category: "Sports" },
    { src: "", alt: "Class XI pupils titrating at a chemistry bench", caption: "A Class XI chemistry practical", category: "Laboratories" },
    { src: "", alt: "Children on the auditorium stage in costume", caption: "Annual day, the Class V play", category: "Events" },
    { src: "", alt: "Runners at the start line on the track", caption: "Sports day, the 400 metres", category: "Sports" },
    { src: "", alt: "Parents and pupils around project tables in the hall", caption: "The primary term exhibition", category: "Events" },
  ],

  admissionsHeadline: "Registration for 2027-28 is open until 15 December 2026",
  admissions: {
    /* CLEARED */
    dates: "Registration for 2027-28 is open from 1 October to 15 December 2026. The Nursery list is published on 12 January 2027; other classes hear within two weeks of the interaction.",
    /* KEPT, so generic: the process any CBSE day school runs. */
    steps: [
      "Send an enquiry by phone, WhatsApp or email, and ask for the prospectus and the current fee schedule.",
      "Visit on a weekday morning and see an ordinary school day.",
      "Submit the admission form with the documents listed here.",
      "Meet the section head with your child. Older children may sit a short assessment in English and mathematics.",
    ],
    /* KEPT, so generic. */
    documents: [
      "Birth certificate, original and a copy",
      "Transfer certificate from the previous school, for a child changing schools",
      "The most recent report cards",
      "Aadhaar of the child and of a parent",
      "Passport photographs of the child",
    ],
    /* CLEARED */
    note: "Siblings of current pupils apply in the same round. We do not charge a capitation fee and we do not accept donations. If anybody asks you for one in this school's name, call the Principal's office.",
    /* CLEARED: everything below is this school's own. */
    whoCanApply: "Nursery to Class IX, and Class XI in all three streams. Class X and Class XII take no new pupils except on a transfer from another CBSE school.",
    timeline: [
      { title: "Registration opens", date: "1 October 2026", body: "Online, or at the office on weekdays from 9:00 am to 1:00 pm." },
      { title: "Campus visits for parents", date: "Saturdays in October and November", body: "A forty-minute walk with a teacher, 9:30 am and 11:00 am. Book on WhatsApp." },
      { title: "Registration closes", date: "15 December 2026" },
      { title: "Nursery list published", date: "12 January 2027", body: "On this site and on the office noticeboard, by registration number only." },
      { title: "Class I to IX and XI interaction", date: "16 to 23 January 2027", body: "A conversation with the section head. Class VI and above also sit a forty-minute paper in English and mathematics." },
      { title: "Fee deposit and document check", date: "By 15 February 2027" },
    ],
    fees: [
      { label: "Registration", amount: "₹1,500", period: "one-time", note: "Paid with the form. Not refunded." },
      { label: "Admission fee", amount: "₹45,000", period: "one-time", note: "Paid once, at joining" },
      { label: "Caution money", amount: "₹10,000", period: "one-time", note: "Refunded in full when the child leaves" },
      { label: "Annual charges", amount: "₹34,000", period: "annual", note: "Laboratories, library, sports, the annual health check" },
      { label: "Tuition, Nursery to Class V", amount: "₹11,800", period: "monthly", note: "Billed quarterly" },
      { label: "Tuition, Class VI to X", amount: "₹13,200", period: "monthly", note: "Billed quarterly" },
      { label: "Tuition, Class XI and XII", amount: "₹14,600", period: "monthly", note: "Billed quarterly" },
      { label: "School bus", amount: "₹2,900 to ₹4,600", period: "also", note: "Monthly, by distance, only if you use it" },
      { label: "Books, notebooks and uniform", amount: "About ₹11,000", period: "also", note: "A year, bought from any shop on the list" },
      { label: "Science practical fee, Class XI and XII", amount: "₹6,000", period: "also", note: "A year, science stream only" },
    ],
    feeNote: "Tuition is billed each quarter, in April, July, October and January. Fees are revised once a year, in April, and never in the middle of a session. A second child pays ten percent less tuition. Every payment gets a receipt.",
    ageRules: [
      { className: "Nursery", minAge: "3", maxAge: "4" },
      { className: "LKG", minAge: "4", maxAge: "5" },
      { className: "UKG", minAge: "5", maxAge: "6" },
      { className: "Class I", minAge: "6", maxAge: "7" },
    ],
    ageAsOn: "31 March 2027",
    rteNote: "A quarter of the Nursery seats are for children from economically weaker sections and disadvantaged groups under the RTE Act. They are allotted through the Haryana government's online process, not by the school, and they carry no tuition fee.",
  },

  /* ── CLEARED: questions. Only the two marked generic survive a duplicate:
        their answers are true of any CBSE day school and name nothing. ──── */
  faq: [
    { title: "Is there a test for Nursery?", body: "No. There is no test and no interview of a child at the entry class. The school may meet the parents to explain how the school day works.", group: "Admissions", generic: true },
    { title: "Can we see the school before we apply?", body: "Yes. Ask the office for a visit on a working day, so you see ordinary classes rather than an event.", group: "Admissions", generic: true },
    { title: "Is the admission fee refunded if we withdraw?", body: "The registration fee is not. The admission fee is refunded in full if you withdraw before 31 March 2027, and the caution money is always refunded.", group: "Fees" },
    { title: "Is the school bus compulsory?", body: "No. About half our pupils come by bus; the rest are dropped by parents or walk. The bus fee is charged only to those who use it.", group: "Transport" },
    { title: "Can my child change stream in Class XI?", body: "Within the first four weeks of Class XI, after a meeting with the counsellor and the stream coordinator. After that, not in the same year.", group: "Academics" },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Class XI stream counselling, 21 and 22 October",
      date: "23 September 2026",
      body: "Twenty-minute slots for the child and both parents. The list is on the noticeboard outside the office and on the class WhatsApp groups.",
      pinned: true,
      kind: "notice",
      posted: "2026-09-23",
      expires: "2026-10-22",
    },
    {
      title: "Half-yearly examination timetable",
      date: "17 September 2026",
      body: "Class VI to XII. Papers begin on 6 October and finish on 17 October.",
      kind: "notice",
      posted: "2026-09-17",
      expires: "2026-10-17",
    },
    {
      title: "Dussehra and Diwali breaks",
      date: "10 September 2026",
      body: "School closes on 19 October and reopens on 22 October, then closes on 6 November and reopens on 12 November. The office stays open on weekdays.",
      kind: "notice",
      posted: "2026-09-10",
      expires: "2026-11-12",
    },
    {
      title: "Bus route 4 afternoon timing",
      date: "2 September 2026",
      body: "The afternoon pick-up moves to 2:50 pm from 7 September. Route 4 only.",
      kind: "notice",
      posted: "2026-09-02",
      expires: "2026-10-31",
    },
    {
      title: "Admissions open house for 2027-28",
      date: "Saturday 17 October 2026, 10:00 am",
      body: "The Principal speaks for twenty minutes, then section heads take small groups through the primary and senior blocks. No registration needed.",
      kind: "event",
      posted: "2026-09-20",
      expires: "2026-10-17",
    },
    {
      title: "Annual sports day",
      date: "Saturday 28 November 2026",
      body: "Heats in the morning, finals from 11:30 am. Parents are welcome on the east stand.",
      kind: "event",
      posted: "2026-09-18",
      expires: "2026-11-28",
    },
    {
      title: "Class XII science exhibition",
      date: "Friday 11 December 2026",
      body: "Projects from all three science sections, in the laboratories from 9:00 am to 1:00 pm.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2026-12-11",
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "office@example.com",
    addressLines: ["Harsingar Senior Secondary School", "12 Example Road, Sector 4", "Gurugram, Haryana 122000"],
    hours: "Office open Monday to Saturday, 8:00 am to 3:30 pm. Closed on the second Saturday.",
    mapQuery: "Harsingar Senior Secondary School, Gurugram",
    landmark: "Behind the Sector 4 community centre, the second gate after the park",
    transportDesk: "+91 00000 00000",
  },

  /* ── CLEARED: Parents page. Links to a real portal only; example.com in a
        template, so the button shows and goes nowhere that collects anything.
        No login form is ever built on a demo page. ──────────────────────── */
  portalLinks: [
    { label: "Parent portal", url: "https://example.com/parents", audience: "Parents", note: "Attendance, report cards and circulars" },
    { label: "Pay fees online", url: "https://example.com/fees", audience: "Parents", note: "Quarterly tuition, with an emailed receipt" },
    { label: "Staff login", url: "https://example.com/staff", audience: "Staff" },
  ],
  downloads: [
    { label: "Book list 2026-27", group: "Lists" },
    { label: "Holiday list 2026-27", group: "Calendar" },
    { label: "Transfer certificate request form", group: "Forms" },
    { label: "Bus route change request form", group: "Forms" },
  ],

  /* ── CLEARED: Policies page ──────────────────────────────────────────── */
  policies: [
    { title: "Child protection and safeguarding", body: "Every adult on campus, including bus staff and contractors, is police verified before the first day. A child is never alone with one adult behind a closed door. Concerns go to the designated safeguarding lead, the counsellor, within the day, and the POCSO committee meets within a week of any report." },
    { title: "Anti-bullying", body: "A complaint is logged the day it is made, both families are told within two working days, and the outcome is written down. Repeated bullying after a written warning can lead to withdrawal." },
    { title: "Fee refund and withdrawal", body: "One month's notice in writing, or one month's tuition in lieu. The caution money is refunded within thirty days of the transfer certificate being issued. No fee is charged for a transfer certificate." },
    { title: "Mobile phones", body: "Pupils may carry a phone on the bus. It is handed to the class teacher at the gate and returned at dismissal." },
    { title: "Children's data", body: "We collect what admission and the board require, keep it on school systems in India, and never share it for marketing. A parent can see or correct their child's record by writing to the office." },
  ],

  /* ── CLEARED: Transport page. Routes, stops and timings, never a driver's
        name or number: the transport desk is the contact. ───────────────── */
  transport: {
    intro: "Eleven buses on nine routes, each with a woman attendant. Route changes take effect on the first of the month.",
    routes: [
      { name: "Route 1, DLF Phase 1 to 3", stops: ["Sikanderpur", "DLF Phase 2 market", "Cyber Hub gate", "DLF Phase 3 park"], pickup: "6:55 am", drop: "2:55 pm" },
      { name: "Route 2, Sushant Lok and Sector 43", stops: ["Sushant Lok 1 C block", "Sector 43 market", "Sector 45 crossing"], pickup: "7:05 am", drop: "3:00 pm" },
      { name: "Route 3, Sohna Road", stops: ["Vatika Chowk", "Sector 49 main road", "Sector 47 Subhash Chowk"], pickup: "7:00 am", drop: "3:05 pm" },
      { name: "Route 4, Golf Course Extension", stops: ["Sector 62 crossing", "Sector 61", "Sector 56 Rapid Metro"], pickup: "6:50 am", drop: "2:50 pm" },
      { name: "Route 5, Palam Vihar", stops: ["Palam Vihar C block", "Sector 23", "Sector 22 market"], pickup: "6:45 am", drop: "3:10 pm" },
    ],
    safety: [
      "A woman attendant on every bus, every trip",
      "GPS tracking, with the live location on the parent app",
      "CCTV inside the bus and a speed governor set to 40 km/h",
      "A child is handed only to the parent or to an adult on the pick-up card",
      "Buses are yellow, with the school's name and the transport desk number on both sides",
    ],
    feeNote: "₹2,900 to ₹4,600 a month by distance, billed with the quarterly tuition. Changes of route on the first of the month only.",
  },

  /* ── CLEARED: Mandatory Public Disclosure (CBSE Appendix IX). Typed rows
        only; every document row is left empty on purpose, so the page shows
        the designed "To be uploaded" state rather than a fake PDF. The staff
        counts are derived from `faculty[].group`. ──────────────────────── */
  disclosure: {
    lastUpdated: "2026-09-01",
    rows: {
      "school-name": { value: "Harsingar Senior Secondary School" },
      "affiliation-no": { value: "00000000 (example)" },
      "school-code": { value: "00000 (example)" },
      address: { value: "12 Example Road, Sector 4, Gurugram, Haryana 122000" },
      principal: { value: "Meenal Chawla, M.Sc. Mathematics, B.Ed." },
      email: { value: "office@example.com" },
      phone: { value: "+91 00000 00000" },
      "principal-staff": { value: "1" },
      "teacher-section-ratio": { value: "1.5 to 1" },
      "special-educator": { value: "One full-time special educator, M.Ed. Special Education, RCI registered" },
      "counsellor": { value: "One full-time counsellor and wellness teacher, M.A. Psychology" },
      "campus-area": { value: "20,230 square metres" },
      classrooms: { value: "52 classrooms, each about 56 square metres" },
      labs: { value: "Physics, chemistry, biology and computer laboratories, each about 90 square metres" },
      internet: { value: "Yes, fibre" },
      "girls-toilets": { value: "24" },
      "boys-toilets": { value: "22" },
    },
  },
});
