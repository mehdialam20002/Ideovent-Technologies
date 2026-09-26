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
 * itself, because the school is not CBSE affiliated. English only.
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

  /* ── CLEARED: the year being recruited for and the priority deadline.
        The chip reads "Admissions 2027-28 open until 15 Jan 2027". ─────── */
  sessionLabel: "2027-28",
  admissionsOpenUntil: "2027-01-15",
  vision: "Young people who can think in more than one language and more than one discipline, and who choose their next step, in India or abroad, with their eyes open.",
  mission: "Twenty to a class and one teacher for every eight students. Inquiry in the early years, rigour in the examination years, and counselling that starts in Grade 9, not Grade 12.",

  /* ── CLEARED: the proof row, each figure with its basis line ─────────── */
  stats: [
    { value: "712", label: "Students, ages 3 to 18", basis: "Roll on 18 August 2026" },
    { value: "22", label: "Nationalities", basis: "By passport, August 2026" },
    { value: "35.6", label: "IB Diploma average points", basis: "May 2026, 38 candidates, out of 45" },
    { value: "20", label: "Students in a class, at most", basis: "16 in Early Years and the Diploma" },
  ],

  /* ── CLEARED: parents' words. Fiction on its face. ───────────────────── */
  reviews: [
    { quote: "We came back from Singapore in Grade 7 and were told to expect a hard year. It was a hard term, and then it was fine. The Checkpoint report in Grade 8 told us more than any report card had.", relation: "Parents of a Grade 9 student", source: "Example review written by Ideovent", consent: true },
    { quote: "Our daughter wanted engineering in India. The counsellor sat with us in Grade 9 and mapped the IGCSE options to the Diploma subjects JEE needs. Nobody had done that for us before.", relation: "Father of a Grade 11 student", source: "Example review written by Ideovent", consent: true },
    { quote: "The fee letter lists everything, including the exam fees two years out. We budgeted once.", relation: "Mother of two, Kindergarten and Grade 5", source: "Example review written by Ideovent", consent: true },
  ],

  /* ── CLEARED: the Learning page: the programme continuum ─────────────── */
  academics: {
    intro: "One continuum from three to eighteen, built from two frameworks. The IB Primary Years Programme teaches children to ask questions; Cambridge Lower Secondary and IGCSE give them the subject knowledge and the examination habits; the IB Diploma asks them to use both. Every step is chosen so that the next one stays open, in India and abroad.",
    stages: [
      { title: "IB Primary Years Programme (Pre-K to Grade 5)", body: "Six units of inquiry a year across science, social studies and the arts, with English and mathematics taught every day. It ends with the Grade 5 Exhibition." },
      { title: "Cambridge Lower Secondary (Grade 6 to 8)", body: "English, mathematics, science and global perspectives, with a second language and French or Spanish. Grade 8 sits the Cambridge Checkpoint tests." },
      { title: "Cambridge IGCSE (Grade 9 and 10)", body: "English, mathematics and a second language, with four options. Options are chosen with the university counsellor, because they decide which Diploma subjects are open." },
      { title: "IB Diploma Programme (Grade 11 and 12)", body: "Six subjects, three at Higher Level, with Theory of Knowledge, the Extended Essay and Creativity, Activity, Service. The AIU equivalence is filed for every student applying in India." },
    ],
    assessment: "In the Primary Years, portfolios and student-led conferences replace marks. From Grade 6, criterion-based assessment against Cambridge and IB descriptors, with a report each term and a Checkpoint report in Grade 8. IGCSE and Diploma grades are awarded by Cambridge and the IB, externally.",
    calendar: [
      { title: "Student-led conferences, Kindergarten to Grade 8", date: "Friday 9 October 2026" },
      { title: "Mid-term break", date: "19 to 23 October 2026" },
      { title: "Diploma information evening", date: "Thursday 5 November 2026, 6:00 pm" },
      { title: "IGCSE mock examinations", date: "26 October to 6 November 2026" },
      { title: "Winter break", date: "19 December 2026 to 4 January 2027" },
      { title: "Grade 5 Exhibition", date: "March 2027" },
      { title: "IB and Cambridge examinations", date: "April and May 2027" },
      { title: "School year 2027-28 begins", date: "Monday 16 August 2027" },
    ],
    downloads: [
      { label: "Curriculum guide, Pre-K to Grade 12", group: "Learning" },
      { label: "IGCSE options booklet", group: "Learning" },
      { label: "Diploma subject choices and Indian university entry", group: "Learning" },
      { label: "Academic integrity policy", group: "Policies" },
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
    { achievement: "35.6 average points", exam: "IB Diploma", year: "2026", note: "38 candidates, out of a possible 45", category: "IB Diploma" },
    { achievement: "97% awarded the Diploma", exam: "IB Diploma", year: "2026", note: "37 of 38 candidates", category: "IB Diploma" },
    { achievement: "63% of grades at A* or A", exam: "Cambridge IGCSE", year: "2026", note: "44 candidates", category: "IGCSE" },
    { achievement: "91% of grades at A* to C", exam: "Cambridge IGCSE", year: "2026", note: "44 candidates, 308 entries", category: "IGCSE" },
    { achievement: "34 of 38 at their first-choice university", exam: "University places", year: "2026", note: "19 in India, 8 in the UK, 4 in Canada, 3 in the Netherlands", category: "Destinations" },
    { achievement: "34.9 average points", exam: "IB Diploma", year: "2025", note: "35 candidates", category: "IB Diploma" },
    /* Acceptances by country: counts, never a named student. */
    { achievement: "19 students", destination: "Universities in India, including 3 through JEE and 2 through NEET", country: "India", exam: "University places", year: "2026", category: "Destinations" },
    { achievement: "8 students", destination: "Universities in the United Kingdom", country: "United Kingdom", exam: "University places", year: "2026", category: "Destinations" },
    { achievement: "4 students", destination: "Universities in Canada", country: "Canada", exam: "University places", year: "2026", category: "Destinations" },
    { achievement: "3 students", destination: "Universities in the Netherlands", country: "Netherlands", exam: "University places", year: "2026", category: "Destinations" },
    { achievement: "2 students", destination: "Universities in the United States", country: "United States", exam: "University places", year: "2026", category: "Destinations" },
  ],

  /* ── CLEARED: the results table in registered, passed, pass % columns ─── */
  boardResults: [
    { year: "2026", className: "IB Diploma", registered: "38", passed: "37", passPercent: "97.4%" },
    { year: "2026", className: "IGCSE", registered: "44", passed: "44", passPercent: "100%", note: "Five or more passes at A* to C" },
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
    { title: "Early Years garden", body: "A walled garden with a mud kitchen, a sand pit and a covered deck, used every day the rain allows.", group: "Early Years" },
    { title: "Science and design", body: "Six laboratories, a design and technology workshop with a laser cutter, and a greenhouse the Grade 6 class runs.", group: "Learning" },
    { title: "Two libraries", body: "A picture-book library for the younger years and a research library with quiet rooms for the Extended Essay, open until 5:30 pm.", group: "Learning" },
    { title: "Studios and theatre", body: "Art, music and drama studios, practice rooms, and a 420-seat theatre used for assemblies and the spring musical.", group: "Arts" },
    { title: "Pool and fields", body: "A 25-metre pool, a full football field with a running track, and a covered multi-sport court for the monsoon.", group: "Sport" },
    { title: "Dining hall", body: "Lunch and two snacks cooked on campus, with a vegetarian and a non-vegetarian line and an allergy register.", group: "Care" },
    { title: "Health centre and counselling", body: "Two nurses, a visiting paediatrician, two counsellors and a learning-support team of five.", group: "Care" },
  ],

  /* ── CLEARED: the Student life page (needs two or more) ──────────────── */
  studentLife: [
    { title: "Creativity, Activity, Service", body: "Every Diploma student runs a CAS project for eighteen months. This year's include a coding club at a government school nearby and a lake clean-up with the ward office." },
    { title: "Week without walls", body: "One residential trip a year from Grade 6, from a farm stay near Mysuru to a trek in Sikkim in Grade 10." },
    { title: "Sport", body: "Swimming, football, basketball, athletics and badminton, with inter-school fixtures against other international schools in the city." },
    { title: "Model United Nations and debate", body: "A school conference each February and two away conferences a year." },
    { title: "Music and theatre", body: "An orchestra, two choirs, the spring musical, and a Grade 12 play written and directed by students." },
    { title: "Clubs after school", body: "Robotics, chess, the student newspaper, gardening and Kannada theatre, from 3:30 to 4:30 pm on Tuesdays and Thursdays." },
  ],

  /* ── CLEARED: faculty. Fictional names, initials avatars only. ───────── */
  faculty: [
    { name: "Shalini Mathai", role: "Head of School", group: "Leadership", qualification: "M.A. Education, IB leadership certificate", experience: "19 years in IB schools, in Pune, Singapore and here", hi: { group: "प्रबंधन" } },
    { name: "Kavya Iyer", role: "Primary Years Programme coordinator", group: "Leadership", qualification: "M.Ed., IB certificate in teaching and learning", experience: "12 years", hi: { group: "प्रबंधन" } },
    { name: "Priyanka Deshmukh", role: "Diploma Programme coordinator", group: "Leadership", subject: "Mathematics, IB Diploma", qualification: "M.Sc. Mathematics, PGCE", experience: "13 years, and an IB examiner", style: "Starts every Higher Level class with a question from last year's paper.", hi: { group: "प्रबंधन" } },
    { name: "Daniel Mensah", group: "Secondary", subject: "Physics, IGCSE and Diploma", qualification: "M.Sc. Physics, PGCE", experience: "11 years, in Accra, Leeds and here since 2021", style: "Half of every week is spent in the laboratory, not the classroom.", hi: { group: "सेकेंडरी" } },
    { name: "Ananya Raghunath", group: "Secondary", subject: "English, and Theory of Knowledge", qualification: "M.A. English Literature, B.Ed.", experience: "15 years, and coordinates the Extended Essay", hi: { group: "सेकेंडरी" } },
    { name: "Mireille Dufour", group: "Secondary", subject: "French and Spanish", qualification: "Master's in French as a foreign language", experience: "10 years, Grade 6 to 12", hi: { group: "सेकेंडरी" } },
    { name: "Rohan D'Souza", group: "Primary", subject: "Primary Years, Grade 4", qualification: "B.El.Ed., IB certificate in teaching and learning", experience: "8 years, here since 2018", hi: { group: "प्राइमरी" } },
    { name: "Sunil Hegde", role: "University and careers counsellor", group: "Student support", subject: "Counselling", qualification: "M.A. Psychology, certificate in college counselling", experience: "Has guided every Diploma class since the first, in 2017", hi: { group: "स्टूडेंट सपोर्ट" } },
  ],

  /* ── CLEARED: gallery. Captions only; they are also the shot list. ───── */
  gallery: [
    { src: "", alt: "The courtyard and the semal tree, in flower in February." },
    { src: "", alt: "A Grade 4 unit of inquiry: mapping where the school's water comes from." },
    { src: "", alt: "Diploma chemistry, an internal assessment in its third week." },
    { src: "", alt: "Kindergarten in the garden, before the afternoon rain." },
    { src: "", alt: "The library at 3:45 pm, the week Extended Essay drafts are due." },
    { src: "", alt: "Student-led conferences: a Grade 2 child walks her parents through her work." },
  ],
  photos: [
    { src: "", alt: "A courtyard with a large tree in red flower", caption: "The semal tree in February", category: "Campus" },
    { src: "", alt: "Grade 4 students with a map spread on the floor", caption: "A Grade 4 unit of inquiry", category: "Learning" },
    { src: "", alt: "Two students at a fume cupboard", caption: "Diploma chemistry, an internal assessment", category: "Learning" },
    { src: "", alt: "Young children in a garden with a mud kitchen", caption: "Kindergarten in the garden", category: "Early Years" },
    { src: "", alt: "Students working at library tables", caption: "Extended Essay week in the library", category: "Learning" },
    { src: "", alt: "Swimmers at the start of a race", caption: "The inter-school swimming gala", category: "Sport" },
    { src: "", alt: "Students on a stage in costume", caption: "The spring musical", category: "Arts" },
    { src: "", alt: "Students with backpacks on a mountain trail", caption: "Grade 10 week without walls, Sikkim", category: "Trips" },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  admissionsHeadline: "Applications for August 2027 are open. Priority deadline: Friday 15 January 2027",
  admissions: {
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
      { title: "Enquire", date: "Any time", body: "Send an enquiry and ask for the prospectus and the fee schedule." },
      { title: "Visit", date: "Open morning, Saturday 17 October 2026", body: "Or a weekday tour, Tuesday and Thursday at 9:30 am." },
      { title: "Apply", date: "Priority deadline, Friday 15 January 2027", body: "Online, with reports from the current and previous year." },
      { title: "Assessment", date: "Within three weeks of applying", body: "A morning in class; from Grade 3, English and mathematics online." },
      { title: "Offer", date: "Within two weeks of the assessment", body: "Confirm with the admission fee and the deposit within fourteen days." },
    ],
    fees: [
      { label: "Application fee", amount: "₹10,000", period: "one-time", note: "Not refunded" },
      { label: "Admission fee", amount: "₹2,50,000", period: "one-time", note: "Paid once, on accepting the offer" },
      { label: "Refundable deposit", amount: "₹1,00,000", period: "one-time", note: "Returned when the student leaves" },
      { label: "Early Years, Pre-K and Kindergarten", amount: "₹4,20,000", period: "annual", note: "In three terms. Lunch and snacks included" },
      { label: "Primary Years, Grade 1 to 5", amount: "₹6,40,000", period: "annual", note: "In three terms" },
      { label: "Lower Secondary, Grade 6 to 8", amount: "₹7,20,000", period: "annual", note: "In three terms" },
      { label: "IGCSE, Grade 9 and 10", amount: "₹8,10,000", period: "annual", note: "In three terms" },
      { label: "IB Diploma, Grade 11 and 12", amount: "₹9,40,000", period: "annual", note: "In three terms" },
      { label: "School bus", amount: "₹72,000", period: "also", note: "A year, any route, only if you use it" },
      { label: "Cambridge and IB examination fees", amount: "At cost", period: "also", note: "In Grade 8, 10 and 12 only" },
      { label: "Week without walls", amount: "₹18,000 to ₹42,000", period: "also", note: "A year from Grade 6, by destination" },
      { label: "Uniform and sports kit", amount: "About ₹14,000", period: "also", note: "First year" },
    ],
    feeNote: "Fees are billed in three terms, in August, January and April. They are revised once a year, for the new school year, and never mid-year. A second child pays five percent less tuition.",
    ageAsOn: "1 June 2027",
    ageRules: [
      { className: "Pre-K", minAge: "3", maxAge: "4" },
      { className: "Kindergarten 1", minAge: "4", maxAge: "5" },
      { className: "Kindergarten 2", minAge: "5", maxAge: "6" },
      { className: "Grade 1", minAge: "6", maxAge: "7" },
    ],
    rteNote: "Where the Karnataka RTE process places children at the school, those seats at the entry class are filled through the government's online process, not by the school, and carry no tuition fee.",
  },

  /* ── CLEARED: questions. The two marked generic survive a duplicate. ─── */
  faq: [
    { title: "Can we visit before applying?", body: "Yes. Come to an open morning or book a weekday tour, and bring your child if you can.", group: "Admissions", generic: true },
    { title: "Does my child need to speak fluent English to join?", body: "Not in the early years. From Grade 3, a child who needs English support gets it in small groups alongside the class, and the assessment tells us how much.", group: "Admissions" },
    { title: "Will the IB Diploma let my child sit JEE, NEET or CUET?", body: "Yes, with the right subjects: Higher Level mathematics, physics, and chemistry or biology for JEE and NEET. The AIU equivalence is filed for every student applying in India.", group: "Admissions" },
    { title: "Is there a sibling discount?", body: "A second child pays five percent less tuition. There is no discount on the admission fee or the deposit.", group: "Fees" },
    { title: "Does the school offer scholarships?", body: "Four need-based places a year in the Diploma, up to the full fee, decided on family income after an offer.", group: "Fees" },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Open morning, Saturday 17 October",
      date: "24 September 2026",
      body: "Grade 11 students lead the tours, and the Head of School takes questions in the library at 11:30 am. Call the admissions office or send a WhatsApp message to register.",
      pinned: true,
      kind: "event",
      posted: "2026-09-24",
      expires: "2026-10-17",
    },
    {
      title: "Student-led conferences, Friday 9 October",
      date: "18 September 2026",
      body: "From Kindergarten to Grade 8, children walk their parents through their own work in twenty-minute slots. There are no lessons that day for those grades, and the buses run for Grades 9 to 12 only.",
      kind: "event",
      posted: "2026-09-18",
      expires: "2026-10-09",
    },
    {
      title: "IGCSE mock examinations",
      date: "11 September 2026",
      body: "Grade 10, from Monday 26 October to Friday 6 November. The timetable is on the student portal, and the library stays open until 5:30 pm through both weeks.",
      kind: "notice",
      posted: "2026-09-11",
      expires: "2026-11-06",
    },
    {
      title: "Mid-term break",
      date: "4 September 2026",
      body: "School is closed from Monday 19 October to Friday 23 October and reopens on Monday 26 October. The admissions office stays open, 9:00 am to 1:00 pm.",
      kind: "notice",
      posted: "2026-09-04",
      expires: "2026-10-26",
    },
    {
      title: "Diploma information evening, Thursday 5 November",
      date: "15 September 2026",
      body: "Subject choices, JEE and NEET eligibility, and the AIU equivalence, for Grade 9 and 10 families and applicants. 6:00 pm in the theatre.",
      kind: "event",
      posted: "2026-09-15",
      expires: "2026-11-05",
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
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
    { label: "Family portal", url: "https://example.com/families", audience: "Parents", note: "Reports, timetables, the calendar and trip consent" },
    { label: "Learning platform", url: "https://example.com/learning", audience: "Students", note: "Assignments and class pages" },
    { label: "Pay fees", url: "https://example.com/fees", audience: "Parents", note: "Termly invoices, with receipts" },
  ],
  downloads: [
    { label: "School calendar 2026-27", group: "Calendar" },
    { label: "Uniform and kit list", group: "Lists" },
    { label: "Bus routes and timings", group: "Transport" },
    { label: "Medical and consent form", group: "Forms" },
  ],

  /* ── CLEARED: the Transport page. Routes and timings, never a driver. ─── */
  transport: {
    intro: "Fourteen air-conditioned buses on six routes, each with a trained attendant. One fee for every route.",
    routes: [
      { name: "Route 1, Koramangala", stops: ["Forum junction", "Koramangala 5th block", "St. John's signal"], pickup: "7:05 am", drop: "4:05 pm" },
      { name: "Route 2, HSR Layout", stops: ["HSR sector 1", "HSR sector 6", "Agara lake"], pickup: "7:15 am", drop: "3:55 pm" },
      { name: "Route 3, Bellandur and Kadubeesanahalli", stops: ["Bellandur gate", "Ecospace", "Kadubeesanahalli"], pickup: "7:20 am", drop: "3:50 pm" },
      { name: "Route 4, Whitefield", stops: ["ITPL main road", "Brookefield", "Varthur Kodi"], pickup: "6:50 am", drop: "4:20 pm" },
      { name: "Route 5, Electronic City", stops: ["Phase 1 toll", "Hosa Road", "Kudlu gate"], pickup: "6:55 am", drop: "4:15 pm" },
      { name: "Route 6, Sarjapur town", stops: ["Sarjapur circle", "Chikka Kannalli", "Kodathi"], pickup: "7:25 am", drop: "3:45 pm" },
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
    { title: "Safeguarding and child protection", body: "Every adult is background checked before starting and trained every year. The designated safeguarding lead is the senior counsellor, and any concern is recorded and acted on the same day, including a report under POCSO where the law requires it." },
    { title: "Admissions and inclusion", body: "We admit students who can access our programmes with the support we can offer, and say plainly when we cannot. Learning-support needs shared at application are never a reason on their own to refuse a place." },
    { title: "Academic integrity", body: "The IB and Cambridge rules on plagiarism, collusion and the use of AI tools, explained to every student in Grade 9 and again in Grade 11." },
    { title: "Fee refund and withdrawal", body: "One term's notice in writing, or one term's fee in lieu. The deposit is refunded within thirty days of leaving." },
    { title: "Student data and privacy", body: "We keep what admission and the examination boards need, on systems that meet India's data protection law, and never share it for marketing." },
  ],
});
