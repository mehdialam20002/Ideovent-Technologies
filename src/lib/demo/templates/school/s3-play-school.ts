/**
 * TEMPLATE s3: PLAY SCHOOL AND PRE-PRIMARY.
 *
 * Segment: an independent play school in a city, Playgroup to UKG, children
 * from two to six. Not a franchise: one house, one founder, four groups.
 * Registry: Warm family, `crayon` theme, hero B: an arched photo window with
 * a round age sticker. (Was `riverside`: teal and terracotta, rounded, the
 * name on a deep teal ground). See ../index.ts.
 *
 * WHO READS IT, AND WHAT THEY ASK FIRST. The parent of a two- or
 * three-year-old, often both parents working, reading on a phone at night.
 * The play-school checklists parents use (and the questions preschools list
 * for a visit) come back to the same six: is it SAFE (a locked gate, CCTV,
 * who may collect my child), how many children to a TEACHER, how does
 * SETTLING IN work and will my child cry, what does my child EAT, what is the
 * DAY like, and is there DAYCARE after it. There is no board and no result.
 * So:
 *   - the tagline carries the ratio, the kitchen and the settling-in;
 *   - `about` answers safety as procedure (locked gate, sign-in, a pick-up
 *     card with a photograph, cameras everywhere except the washrooms), not
 *     as an adjective;
 *   - the founder's message answers "will my child cry" in so many words;
 *   - each age band prints its ratio and its hours, and its `detail` says
 *     what actually happens that year (settling in, no letters yet, reading
 *     aloud by March);
 *   - the notices are a fever rule, a lunch menu, a festival day and the
 *     parent meetings, which is what a play school's WhatsApp group carries;
 *   - `results` carries the four figures a play-school parent asks for
 *     (the ratio, Class I admissions, the cameras, the settling in), not a
 *     board result, which a play school does not have.
 *
 * THE "BOARD" LINE. A play school has no board, and leaving the line blank
 * would put "add your board" in the closing list of a filled template. NCF
 * Foundational Stage (NCERT's 2022 framework for ages three to eight) is what
 * a play school in 2026 actually says it follows, so the line names it, with
 * the example registration pattern.
 *
 * THE INSTITUTE DOES NOT EXIST. Gilhari is the squirrel; a search on 26
 * September 2026 found no play school or preschool called Gilhari House.
 * Vijay Nagar is a real part of Indore; nothing here describes a real school
 * in it. The phone, email, street, PIN and registration line are the
 * reserved fiction patterns in ../shape.ts.
 */

import { SCHOOL_PAGE_SETS } from "../../site/pageSets";
import { defineTemplateContent } from "../shape";

/*
 * MULTI-PAGE CONTENT (26 September 2026). s3 is the 11-page play-school site:
 * Home, Programmes (the age groups, daycare and a day in the life), Admissions
 * (age checker and fees by programme), Safety and care, Our team, Facilities,
 * Gallery, News, Parents (app, lunch menu), Transport, Contact. No Results,
 * no Academics, no Disclosure: a play school has no board. The site is
 * English-first; the Hindi toggle falls back to this English, marked lang="en".
 * Forms for 2027-28 open on 2 November 2026, so `admissionsOpenUntil` is left
 * empty and the "open until" chip stays hidden until the school sets it.
 */
export default defineTemplateContent("school", {
  /* ── KEPT: the page list for this segment ────────────────────────────── */
  sitePages: [...SCHOOL_PAGE_SETS["s3-play-school"]],

  /* ── CLEARED: the session being recruited for ────────────────────────── */
  sessionLabel: "2027-28",
  vision: "Children who arrive at big school curious, able to sit through a story, ask for help and wait their turn, and who remember their first school as a happy house.",
  mission: "Small groups, the same two adults every day, food from our own kitchen, a locked gate, and no worksheets before a child is ready to hold a pencil.",

  /* ── CLEARED: the proof row. The ratio is printed, not counted. ───────── */
  stats: [
    { value: "66", label: "Children, in four groups", basis: "Enrolment on 1 September 2026" },
    { value: "1:10", label: "Most children to one adult, in any group", basis: "Playgroup runs at 1:6" },
    { value: "14", label: "Cameras in rooms and play areas", basis: "None in the washrooms" },
    { value: "11", label: "Years in the same house", basis: "Open since June 2015" },
  ],
  /* ── CLEARED ON DUPLICATE: identity ──────────────────────────────────── */
  instituteName: "Gilhari House Play School",
  tagline: "Ten children to an adult at most, lunch from our own kitchen, and settling in *at your child's pace*.",
  city: "Indore",
  state: "Madhya Pradesh",

  /* ── KEPT: market, language and currency ─────────────────────────────── */
  country: "India",
  market: "india",
  currency: "INR",

  /* ── CLEARED: history and the framework line ─────────────────────────── */
  established: "Founded 2015",
  establishedYear: "2015",
  boardOrAffiliation: "NCF Foundational Stage, example registration no. 00000000",

  about:
    "Gilhari House is a play school for children aged two to six, in a converted bungalow in Vijay Nagar, Indore. It opened in 2015 with nine children and now has 66, in four groups, and no group has more than ten children to one adult. The gate stays locked through the day, every visitor signs in, and a child goes home only with an adult named on the pick-up card, with a photograph. Cameras cover every room except the washrooms. Lunch is cooked in our own kitchen each morning: no packaged food, no sweet drinks. A daycare room stays open until 6:30 pm for working parents.",

  /* ── The head. Name and message CLEARED; the title is KEPT ───────────── */
  principalName: "Aparna Joshi",
  principalTitle: "Founder",
  principalMessage:
    "I started Gilhari House on the ground floor of my own home, with nine children. On a first visit, parents ask me two things: will my child cry, and who will be with them. Some do, for a few days. And the same two teachers will be with them every day, and by the end of the first week they will know what makes your child laugh. Come at 10:30 on any weekday and watch circle time from the doorway.",

  /* ── STRUCTURE: age bands. Name, level, subjects and timings are KEPT;
        seats, fee and detail are CLEARED, so the ratio and the fee live in
        `seats` and `fee`, and what happens that year lives in `detail`. ─── */
  courses: [
    {
      name: "Playgroup",
      level: "Ages 2 to 3",
      subjects: "Play, songs and rhymes, sand and water, first words, the toilet routine",
      timings: "9:30 am to 12:00 noon",
      seats: "12 children, two teachers",
      fee: "3,800",
      feeNote: "a month",
      detail: "The first fortnight is for settling in. A parent stays for the first hour on day one, and the time apart grows a little each day.",
    },
    {
      name: "Nursery",
      level: "Ages 3 to 4",
      subjects: "Talking and listening, colours and shapes, early numbers, rhymes in Hindi and English, outdoor play",
      timings: "9:00 am to 12:30 pm",
      seats: "16 children, a teacher and an assistant",
      fee: "4,300",
      feeNote: "a month",
      detail: "Children learn to hold a crayon properly this year. Nobody is asked to write letters yet.",
    },
    {
      name: "LKG",
      level: "Ages 4 to 5",
      subjects: "Phonics, pre-writing, numbers, stories, art, music and movement",
      timings: "9:00 am to 1:00 pm",
      seats: "18 children, a teacher and an assistant",
      fee: "4,700",
      feeNote: "a month",
      detail: "Letters are learnt by their sound first. Written work is one page a day at most, done in school and never sent home.",
    },
    {
      name: "UKG",
      level: "Ages 5 to 6",
      subjects: "Reading simple words, writing, adding with objects, the Hindi varnamala, nature walks",
      timings: "9:00 am to 1:00 pm",
      seats: "20 children, a teacher and an assistant",
      fee: "4,900",
      feeNote: "a month",
      detail: "By March every child reads a short picture book aloud to their teacher. We help families with the Class I forms for the schools they choose.",
    },
    {
      name: "Daycare",
      level: "Ages 2 to 6, after the morning session",
      subjects: "Lunch, a nap, quiet play, outdoor time and a snack",
      timings: "Until 6:30 pm, Monday to Friday",
      seats: "20 children, two carers",
      fee: "2,500",
      feeNote: "a month, on top of the programme fee",
      detail: "Children stay in the same house with a carer they already know from the morning. Lights go down for the nap at 2:00 pm, and the snack at 4:30 is fruit and something from the kitchen.",
    },
  ],

  /* ── CLEARED: a day in the life, for the Programmes page ─────────────── */
  dayPlan: [
    { label: "Arrival and free play", time: "9:00 am", subject: "Children are signed in at the gate and choose a corner: blocks, books or the kitchen set." },
    { label: "Fruit", time: "10:15 am", subject: "Cut fruit at the low tables. Children pour their own water." },
    { label: "Circle time", time: "10:30 am", subject: "The day's song, the weather, a story, and one thing each child wants to say." },
    { label: "Outdoors", time: "11:00 am", subject: "Sand, slides and swings, or the veranda when it rains." },
    { label: "Activity", time: "11:40 am", subject: "Painting, clay, music and movement, or pre-writing for LKG and UKG." },
    { label: "Lunch", time: "12:15 pm", subject: "Cooked that morning in our kitchen. Teachers eat with the children." },
    { label: "Home time", time: "12:30 to 1:00 pm", subject: "One name called at a time, to an adult on the pick-up card." },
    { label: "Daycare: nap, snack and play", time: "2:00 to 6:30 pm", subject: "A nap until 3:30, a snack at 4:30, outdoor play when it cools down." },
  ],

  /* ── CLEARED: the Safety and care page (needs two or more) ───────────── */
  safety: [
    { title: "A locked gate, and a sign-in book", body: "The gate is locked from 9:15 am until home time. Every visitor, parents included, signs in and wears a visitor card." },
    { title: "Only the adults on the pick-up card", body: "Each child has a card with photographs of up to four adults. Anyone else needs a call from a parent and a photograph on WhatsApp, every time." },
    { title: "Cameras in every room, never in the washrooms", body: "Fourteen cameras, recorded for thirty days. A parent may ask to see a clip of their own child's room at the office. There is no public live feed." },
    { title: "Women staff for washroom help", body: "Only women staff help a child in the washroom, and the washroom door is never locked from inside." },
    { title: "Police-verified staff", body: "Every teacher, carer, cook, driver and helper is police verified before their first day, and again every two years." },
    { title: "Illness, allergies and first aid", body: "A child with a fever stays home for a full day after it breaks. Allergies are on a list in the kitchen and on the classroom door. Two staff in every group hold a paediatric first-aid certificate." },
    { title: "Fire drill each term", body: "The children practise leaving the house in a line to the front garden, once a term, so it feels like a game." },
  ],

  /* ── CLEARED: results. A play school has no board result, but it has the
        four figures its parents do ask for: the ratio, where UKG goes for
        Class I, the cameras and the settling in. Leaving the list empty did
        not drop the question: the page moved "your published results go
        here" into a closing "what we still need from you" block, which a
        filled template must never show. No student and no school named. ── */
  resultsHeading: "The figures parents ask us for.",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a play school can report what parents ask about. Your own figures replace it line for line, exactly as you publish them.",
  results: [
    { achievement: "8 of 10 Playgroup children settled within the first week", exam: "Playgroup settling in", year: "2026", note: "The other two by the third week" },
    { achievement: "19 of 20 UKG children in their first-choice school", exam: "Class I admissions", year: "2026" },
    { achievement: "2 parent meetings a term, with a written note on your child", note: "Speech, play, friendships and eating" },
    { achievement: "2 weeks of settling in, with a parent close by", note: "Longer if your child needs it" },
  ],

  /* ── KEPT WORD FOR WORD: facilities. What nearly every play school has.
        "Lead: line" becomes a tile heading and one line under it, so the
        line after the colon is written as generic as the heading. The
        daycare room and the kitchen are in `about`, which is cleared. ───── */
  facilities: [
    "Outdoor play area: sand, slides and swings",
    "Child-sized washrooms, cleaned through the day",
    "Reading corner: picture books in Hindi and English",
    "Activity room: music, movement, painting and clay",
    "CCTV in the classrooms and play areas",
    "First aid, and staff trained to give it",
  ],

  /* ── CLEARED: faculty. Fictional names, initials avatars only. ───────── */
  faculty: [
    { name: "Aparna Joshi", role: "Founder", group: "Leadership", qualification: "M.A. Child Development", experience: "Opened the school in 2015", style: "Is at the gate every morning at 9:00.", hi: { group: "प्रबंधन" } },
    { name: "Ruchi Malviya", role: "Class teacher", group: "Teachers", subject: "Playgroup", qualification: "Diploma in Early Childhood Care and Education", experience: "10 years, here since 2016", style: "Sits on the floor for most of the morning, at the children's height.", hi: { group: "टीचर्स" } },
    { name: "Sana Qureshi", role: "Class teacher", group: "Teachers", subject: "Nursery", qualification: "B.A., Nursery Teacher Training", experience: "6 years", style: "Every rhyme comes with actions, in Hindi and in English.", hi: { group: "टीचर्स" } },
    { name: "Deepa Raghuvanshi", role: "Class teacher", group: "Teachers", subject: "LKG", qualification: "B.Ed., Montessori certificate", experience: "11 years", hi: { group: "टीचर्स" } },
    { name: "Meghna Rathore", role: "Class teacher", group: "Teachers", subject: "UKG", qualification: "M.A. English, B.Ed.", experience: "7 years, and keeps the reading corner", hi: { group: "टीचर्स" } },
    { name: "Tarun Soni", group: "Specialists", subject: "Music and movement", qualification: "B.P.A. Music", experience: "Every group, twice a week", hi: { group: "विशेषज्ञ" } },
    { name: "Kamini Tiwari", role: "Daycare lead", group: "Care", subject: "Daycare", qualification: "Early childhood diploma, first-aid certified", experience: "Runs the afternoon room until 6:30 pm", hi: { group: "देखभाल" } },
    { name: "Shobha Bai", role: "Cook", group: "Care", subject: "The kitchen", experience: "Here since the first day in 2015", note: "Plans the monthly menu with the founder and the parents' committee.", hi: { group: "देखभाल" } },
  ],

  /* ── CLEARED: the Facilities page, grouped ───────────────────────────── */
  facilityDetails: [
    { title: "Front garden and sand pit", body: "Grass, a covered sand pit, two slides and four swings, all on soft ground and inside the locked gate.", group: "Outdoors" },
    { title: "Veranda for rainy days", body: "A covered play space along the house, so outdoor time happens in the monsoon too.", group: "Outdoors" },
    { title: "Four group rooms", body: "One per group, on the ground floor, each with low shelves, a reading mat and a window onto the garden.", group: "Indoors" },
    { title: "Activity room", body: "Music, movement, painting and clay. The floor is washable and so, mostly, are the children.", group: "Indoors" },
    { title: "Our own kitchen", body: "Lunch and snacks are cooked here every morning. No packaged food, no sweet drinks, and the week's menu is on the door.", group: "Care" },
    { title: "Nap room", body: "Low beds with a sheet for each child, washed every Friday, for the daycare children after lunch.", group: "Care" },
    { title: "Child-sized washrooms", body: "Low basins and toilets, cleaned through the day, with a woman helper always nearby.", group: "Care" },
  ],

  /* ── CLEARED: categorised captions for the Gallery chips ─────────────── */
  photos: [
    { src: "", alt: "Children sitting in a circle on a mat with their teacher", caption: "Circle time in Nursery", category: "Our day" },
    { src: "", alt: "Two children digging in a sand pit", caption: "The sand pit after the first rain", category: "Outdoors" },
    { src: "", alt: "Children eating at low tables", caption: "Lunch. Monday is moong dal khichdi", category: "Our day" },
    { src: "", alt: "A teacher handing a child to a parent at the gate", caption: "Pick-up, one name at a time", category: "Our day" },
    { src: "", alt: "Children painting with their hands on large sheets", caption: "LKG hand painting", category: "Art" },
    { src: "", alt: "A darkened room with children asleep on low beds", caption: "The daycare nap, 2:00 pm", category: "Daycare" },
    { src: "", alt: "Children in festive clothes dancing in a circle", caption: "Garba day", category: "Festivals" },
    { src: "", alt: "Children splashing in a shallow water tray", caption: "Water play in April", category: "Outdoors" },
  ],

  /* ── CLEARED: gallery. Captions only; they are also the shot list. ───── */
  gallery: [
    { src: "", alt: "Circle time in Nursery, 10:30 am." },
    { src: "", alt: "The sand pit after the first rain of June." },
    { src: "", alt: "Lunch at the low tables. Monday is moong dal khichdi." },
    { src: "", alt: "Pick-up at the gate, one name called at a time." },
    { src: "", alt: "LKG painting with their hands, and then washing them." },
    { src: "", alt: "The daycare room at 2:00 pm, lights down for the nap." },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  admissionsHeadline: "Admissions for 2027-28 open on Monday 2 November 2026",
  admissions: {
    /* CLEARED. One row per line; the text before the first colon heads it. */
    dates: [
      "Open mornings, Saturday 10 and 17 October: 10:00 am to 12:00 noon. Bring your child.",
      "Forms for 2027-28 from Monday 2 November: at the office, or on WhatsApp",
      "Settling-in week, 5 to 9 April 2027: shorter days, with a parent close by",
      "Playgroup, all year: a child may join in the month they turn two",
    ].join("\n"),
    /* KEPT, so generic: how any play school takes a child. */
    steps: [
      "Call or send a WhatsApp message to book a visit.",
      "Visit with your child on a weekday morning and see the room your child would join.",
      "Fill in the admission form, with your child's health, food and allergy details.",
      "Plan the settling-in days with the class teacher before the first day.",
    ],
    /* KEPT, so generic. The pick-up photographs are what a play school
       actually asks for, and they are how the gate rule works. */
    documents: [
      "Birth certificate",
      "Immunisation record",
      "Aadhaar of the child and of a parent",
      "Photographs of the child, and of every adult who will collect the child",
      "Emergency contact details and any medical or allergy notes",
    ],
    /* CLEARED */
    note: "Fees are paid each quarter and cover lunch, snacks and every material used in class. Daycare is ₹2,500 a month extra. There is no admission fee for a younger brother or sister.",
    whoCanApply: "Children aged two to six. Playgroup takes a child in the month they turn two, all year round; Nursery, LKG and UKG start in April.",
    timeline: [
      { title: "Open mornings", date: "Saturday 10 and 17 October 2026", body: "10:00 am to 12:00 noon. Bring your child." },
      { title: "Forms for 2027-28", date: "From Monday 2 November 2026", body: "At the office, or on WhatsApp." },
      { title: "A morning with the class teacher", date: "November to February", body: "Your child plays in the room for an hour while you talk to the teacher. It is not a test." },
      { title: "Settling-in week", date: "5 to 9 April 2027", body: "Shorter days, with a parent close by." },
    ],
    fees: [
      { label: "Registration", amount: "₹1,000", period: "one-time", note: "With the form" },
      { label: "Admission fee", amount: "₹8,000", period: "one-time", note: "None for a younger brother or sister" },
      { label: "Playgroup", amount: "₹3,800", period: "monthly", note: "Paid quarterly, lunch and materials included" },
      { label: "Nursery", amount: "₹4,300", period: "monthly", note: "Paid quarterly, lunch and materials included" },
      { label: "LKG", amount: "₹4,700", period: "monthly", note: "Paid quarterly, lunch and materials included" },
      { label: "UKG", amount: "₹4,900", period: "monthly", note: "Paid quarterly, lunch and materials included" },
      { label: "Daycare until 6:30 pm", amount: "₹2,500", period: "also", note: "Monthly, only if you use it" },
      { label: "School van", amount: "₹1,600 to ₹2,200", period: "also", note: "Monthly, by distance" },
      { label: "Uniform and bag", amount: "About ₹1,800", period: "also", note: "Once a year. No costume or event fees" },
    ],
    feeNote: "Fees are paid each quarter, in April, July, October and January, and are not raised during the year. Nothing else is charged through the year: no costume fee for the annual day, no picnic fee, no book fee.",
    ageAsOn: "31 March 2027",
    ageRules: [
      { className: "Playgroup", minAge: "2", maxAge: "3" },
      { className: "Nursery", minAge: "3", maxAge: "4" },
      { className: "LKG", minAge: "4", maxAge: "5" },
      { className: "UKG", minAge: "5", maxAge: "6" },
    ],
    rteNote: "Gilhari House is a pre-school only, so the RTE 25% seats do not apply here. They apply at the entry class of the school your child joins next, and we help families fill in those forms.",
  },

  /* ── CLEARED: questions. The two marked generic survive a duplicate. ─── */
  faq: [
    { title: "Will my child cry?", body: "Some children do, for the first few days. A parent stays close through the settling-in week, and the time apart grows a little each day.", group: "Admissions", generic: true },
    { title: "Can we visit before we apply?", body: "Yes. Book a visit and come with your child on a weekday morning, when the rooms are running as usual.", group: "Admissions", generic: true },
    { title: "What does my child need to bring?", body: "A change of clothes in a named bag, and a water bottle. Lunch, snacks, crayons and books are all ours.", group: "Daily life" },
    { title: "My child is not toilet trained yet. Can they join?", body: "Yes, in Playgroup and Nursery. Send nappies for the first months and we will work on it together with you.", group: "Admissions" },
    { title: "Is there a refund if we leave mid-year?", body: "The quarter's fee in progress is not refunded. Any quarter paid in advance is refunded in full with one month's notice.", group: "Fees" },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Garba day, Friday 16 October",
      date: "25 September 2026",
      body: "Children may come in traditional clothes, and nothing needs to be bought new. Parents are welcome for the last half hour, from 12:00 noon.",
      pinned: true,
      kind: "event",
      posted: "2026-09-25",
      expires: "2026-10-16",
    },
    {
      title: "Parent meetings, Saturday 3 October",
      date: "22 September 2026",
      body: "Fifteen minutes with your child's class teacher, between 9:30 am and 1:00 pm. Pick a time on the sheet at the gate or on the class WhatsApp group.",
      kind: "event",
      posted: "2026-09-22",
      expires: "2026-10-03",
    },
    {
      title: "A fever means a day at home",
      date: "15 September 2026",
      body: "A child with a temperature of 100°F or more is sent home, and comes back after a full day without fever. It keeps the room well through the season.",
      kind: "notice",
      posted: "2026-09-15",
      expires: "2027-03-31",
    },
    {
      title: "The October lunch menu",
      date: "11 September 2026",
      body: "Moong dal khichdi on Monday, vegetable poha on Tuesday, rajma and rice on Wednesday, paratha and curd on Thursday, idli on Friday. Fruit every morning at 10:30.",
      kind: "notice",
      posted: "2026-09-11",
      expires: "2026-10-31",
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "hello@example.com",
    addressLines: ["Gilhari House Play School", "14 Example Road, Scheme 54, Vijay Nagar", "Indore, Madhya Pradesh 452000"],
    hours: "Office open Monday to Saturday, 9:00 am to 4:00 pm. Daycare until 6:30 pm, Monday to Friday.",
    mapQuery: "Gilhari House Play School, Indore",
    landmark: "Two lanes behind the Scheme 54 vegetable market, the blue gate with the squirrel on it",
    transportDesk: "+91 00000 00000",
  },

  /* ── CLEARED: parents' words. Fiction on its face. ───────────────────── */
  reviews: [
    {
      quote: "She cried for four mornings. On the fifth she let go of my hand at the gate and did not look back. Ruchi ma'am sent us a photo at 10:30 every one of those days.",
      relation: "Mother of a Playgroup child",
      source: "Example review written by Ideovent",
      consent: true,
    },
    {
      quote: "What sold us was the kitchen. We could see the dal being cooked when we came to visit.",
      relation: "Father of a child in LKG",
      source: "Example review written by Ideovent",
      consent: true,
    },
    {
      quote: "Both of us work, and daycare in the same house meant our son never had to change places at 1:00 pm.",
      relation: "Parents of a child in Nursery and daycare",
      source: "Example review written by Ideovent",
      consent: true,
    },
  ],

  /* ── CLEARED: the Parents page. Links only; no login form is ever built
        on a demo page. example.com in a template. ──────────────────────── */
  portalLinks: [
    { label: "Parent app", url: "https://example.com/app", audience: "Parents", note: "The day's photos, attendance and notes from the teacher" },
    { label: "Pay fees online", url: "https://example.com/fees", audience: "Parents", note: "Quarterly fees, with an emailed receipt" },
  ],
  downloads: [
    { label: "This month's lunch menu", group: "Menu" },
    { label: "Holiday list 2026-27", group: "Calendar" },
    { label: "What to pack in the bag", group: "Lists" },
    { label: "Pick-up card form", group: "Forms" },
  ],

  /* ── CLEARED: the Transport page. Routes and timings, never a driver. ─── */
  transport: {
    intro: "Two vans on three short routes, with a woman attendant on board who hands each child to the class teacher at the gate.",
    routes: [
      { name: "Van A, Vijay Nagar and Scheme 78", stops: ["Scheme 78 park", "Vijay Nagar square", "Sayaji crossing"], pickup: "8:30 am", drop: "12:45 pm" },
      { name: "Van A, second trip, Nipania", stops: ["Nipania main road", "Bombay Hospital turn"], pickup: "8:45 am", drop: "1:05 pm" },
      { name: "Van B, Sukhliya and Scheme 114", stops: ["Sukhliya market", "Scheme 114 gate", "MR 10 crossing"], pickup: "8:35 am", drop: "12:50 pm" },
    ],
    safety: [
      "A woman attendant on every trip",
      "Child locks on the doors, and seat belts on every seat",
      "GPS tracking, with the location on the parent app",
      "A child is handed only to an adult on the pick-up card",
    ],
    feeNote: "₹1,600 to ₹2,200 a month by distance. Daycare children go home with their parents.",
  },
});
