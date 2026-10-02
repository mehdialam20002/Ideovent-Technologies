import { ONE_TIME, PLANS, bandRange, monthlyLine, termLine } from "../../../lib/pricing";
import { FRAMES, SAMPLES_NOTE, STEPS_BOTH } from "../shared";
import type { WebsitePage } from "../types";

const s = PLANS.starter;
const g = PLANS.growth;

/**
 * /websites/coaching-institute. Searched as "coaching institute website",
 * "coaching website", "website for coaching classes", "coaching ki website".
 * It describes what our five coaching templates hold (src/pages/site/coaching/:
 * courses, batches, demo class, faculty, results with the CCPA fields, fees
 * and refunds). HighQ Classes is a real, paid client project (FACTS.md).
 */
export const coaching: WebsitePage = {
  id: "coaching-institute",
  path: "/websites/coaching-institute",
  crumbs: [
    { name: "Websites", path: "/websites" },
    { name: "Coaching institute website", path: "/websites/coaching-institute" },
  ],
  intro: [
    "A student comparing institutes checks three things on a phone: which course fits, when the next batch starts and what it costs. Parents look at the teachers and the results. If those answers sit in a PDF, or only on the banner outside your centre, they ask on WhatsApp, or they ask the institute down the road.",
    "We build coaching institute websites from our own coaching templates: courses with batch timings and fees, a free demo class request, your faculty, your results shown the honest way, and the fee and refund details the 2024 guidelines ask for. We built the website for HighQ Classes, a coaching institute, so this is work we have done before.",
  ],
  whatsapp: "Hello Ideovent, I would like a website for my coaching institute. Please send me the options and a sample.",
  service: {
    name: "Coaching institute website design",
    serviceType: "Website design",
    audience: "Coaching institutes",
    description:
      "Websites for coaching institutes in Delhi and across India, built from Ideovent's own coaching templates: courses with batch timings and fees, demo class requests on WhatsApp, faculty, results with the disclosures the 2024 guidelines ask for, and fees and refunds.",
  },
  includes: {
    heading: "What a coaching website from us includes",
    intro: `Pages from our coaching templates. ${s.name} covers up to 5 pages; ${g.name} adds a page for each course and an enquiry form; a website bought outright is scoped with you.`,
    items: [
      { title: "Courses, batches and fees", body: "Each course with its duration, mode, next batch and fee, a comparison table when you run several, and the batch timetable." },
      { title: "A free demo class request", body: "A short form for the student's name, class and course that opens WhatsApp with the request typed out to your number." },
      { title: "Faculty", body: "Each teacher's subject, qualification and the batches they take, with a photo only if they agree to one." },
      { title: "Results, shown honestly", body: "Your real results, with the course, its duration and whether it was paid beside each one, and a student's name only with consent." },
      { title: "Fees, refunds and disclosure", body: "Every course's fee, the instalments, the refund policy, your tutors' qualifications, and how many students you coached and how many got through." },
      { title: "Test series and exam dates", body: "Your test series and the dates of the exams your students are preparing for." },
      { title: "Hindi as well as English", body: `One of our coaching designs is made for a Hindi-medium centre, and ${g.name} includes a Hindi version of the site.` },
    ],
  },
  samples: {
    heading: "Sample coaching sites from our templates",
    intro: SAMPLES_NOTE,
    frames: [FRAMES.coachingScience, FRAMES.coachingHindi],
  },
  price: "both",
  rules: {
    heading: "What the 2024 guidelines ask a coaching website to show",
    paragraphs: [
      "The Ministry of Education's Guidelines for Registration and Regulation of Coaching Center, 2024, issued in January 2024 and sent to the states to adopt through their own laws, say a coaching centre should have a website with up-to-date details of its tutors' qualifications, courses, duration, hostel facilities if any, fees, exit and refund policy, how many students it coached and how many got admission to higher education. They also rule out misleading advertising about the quality of coaching or students' results.",
      "In November 2024 the Central Consumer Protection Authority added guidelines on coaching advertisements, warning against false or unverified claims, guarantees and success rates. Our coaching templates have a place for each of these details, and the results page prints the course, the duration and whether it was paid beside every result.",
    ],
    // Truth check, 2 Oct 2026: the education.gov.in page cited here rendered a
    // blank page (that site answers any address with the same empty shell), so
    // the sources are the PIB release and a monograph that quotes the website
    // clause word for word ("shall have a website with updated details of...").
    sources: [
      { label: "Press Information Bureau, 7 February 2024: the Ministry of Education's coaching guidelines, sent to the states", href: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003661" },
      { label: "Eduvisors: the 2024 coaching guidelines, with the website clause in full (PDF)", href: "https://eduvisors.com/wp-content/uploads/2024/01/Eduvisors-Monograph-on-Guidelines-for-Regulation-of-Coaching-Center.pdf" },
      { label: "All India Radio News, 14 November 2024: the CCPA guidelines for coaching institutes", href: "https://www.newsonair.gov.in/ccpa-mandates-coaching-institutes-to-disclose-student-and-course-information-to-prevent-misleading-claims" },
    ],
  },
  steps: { heading: "How it works", items: STEPS_BOTH },
  faqs: {
    heading: "Questions about a coaching institute website",
    items: [
      {
        id: "wc-cost",
        question: "How much does a coaching institute website cost?",
        answer: `On a monthly plan, ${s.name} is ${monthlyLine(s)}, ${termLine(s)}, and ${g.name} is ${monthlyLine(g)}, ${termLine(g)}, both with hosting and changes included. Bought outright, a coaching website is ${bandRange(ONE_TIME.website)}, fixed in writing after one call.`,
      },
      {
        id: "wc-portal",
        question: "Can students log in, pay fees online or see their attendance?",
        // Truth check, 2 Oct 2026: online payment and a login for each role start
        // on the portal's middle tier, so the band is printed, not its floor.
        answer: `That is a portal rather than a website: student records, online fee payment with receipts, attendance and logins for each role, ${bandRange(ONE_TIME.portal)} one time, depending on which of these it needs. EduFlow, our own software for schools and coaching institutes, is in development.`,
      },
      {
        id: "wc-results",
        question: "Can you show our toppers and results?",
        answer: "Yes, your real ones. Beside each result the page shows the course, its duration and whether it was paid, and a student's name or photo appears only with consent. We do not write \"100% selection\" or any guarantee of marks or a rank: the 2024 guidelines rule that out, and it would not be true for anyone.",
      },
      {
        id: "wc-enquiries",
        question: "Will enquiries come to WhatsApp?",
        answer: `Yes. Every page has a WhatsApp button, and the demo class form opens WhatsApp with the student's details typed out to your number. The form comes with ${g.name}, and can be part of a website bought outright.`,
      },
      {
        id: "wc-batches",
        question: "Who updates new batches and fees?",
        answer: `On a monthly plan, we do: send the new batch or fee on WhatsApp, up to ${s.changesPerMonth} changes a month on ${s.name} and ${g.changesPerMonth} on ${g.name}. On a website bought outright, the scope can include an admin screen where your office changes them itself.`,
      },
      {
        id: "wc-before",
        question: "Have you built a coaching website before?",
        answer: "Yes. We built the website for HighQ Classes, a coaching institute: course and batch information, faculty details and an enquiry form. Its case study is on our work page, with the stack behind it.",
      },
      // In the words many coaching owners type it (Hinglish: "coaching ki website", "kitne mein").
      {
        id: "wc-kharcha",
        question: "Coaching institute ki website kitne mein banti hai?",
        answer: `Monthly plan par ${monthlyLine(s)}, ${termLine(s)}. Ek baar mein kharidni ho to ${bandRange(ONE_TIME.website)}, jismein courses, batch timings, fees aur demo class ka form aate hain. Students ka login, online fees ya attendance chahiye to woh portal hai, ${bandRange(ONE_TIME.portal)}, kaam ke hisaab se.`,
      },
    ],
  },
  related: {
    heading: "Keep reading",
    links: [
      { label: "HighQ Classes, a coaching website we built", href: "/work/highq-classes", note: "The case study" },
      { label: "What a coaching website should show", href: "/blog/coaching-institute-website-guide", note: "Our guide, and what to leave out" },
      { label: "Website on a monthly plan", href: "/websites/899-per-month", note: "Every figure, from the setup to the first-year total" },
      { label: "EduFlow, our coaching and school software", href: "/eduflow", note: "In development" },
      { label: "School website", href: "/websites/school" },
      { label: "Dental clinic website", href: "/websites/dental-clinic" },
      { label: "Websites for every kind of business", href: "/websites" },
      { label: "All prices", href: "/pricing" },
    ],
  },
  closing: {
    heading: "Want to see a sample for your institute?",
    body: "Send us your institute's name on WhatsApp. We send back sample sites from our coaching templates and what your site would cost, in writing. If the website you have already works, we will tell you that instead.",
  },
};
