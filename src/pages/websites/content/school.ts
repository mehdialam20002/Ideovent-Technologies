import { ONE_TIME, PLANS, bandRange, monthlyLine, termLine } from "../../../lib/pricing";
import { FRAMES, SAMPLES_NOTE, STEPS_BOTH } from "../shared";
import type { WebsitePage } from "../types";

const s = PLANS.starter;
const g = PLANS.growth;

/**
 * /websites/school. Searched as "school website", "website for school",
 * "school website design Delhi", "school ki website". It describes what our
 * five school templates hold (src/pages/site/school/: admissions, notices,
 * fees, results, the CBSE disclosure page). No school client is named:
 * Ideovent has built no school site for a client yet.
 */
export const school: WebsitePage = {
  id: "school",
  path: "/websites/school",
  crumbs: [
    { name: "Websites", path: "/websites" },
    { name: "School website", path: "/websites/school" },
  ],
  intro: [
    "Parents look a school up long before admission day. They want the admission dates, the fee structure, the documents to bring, this week's notices and a way to ask a question without queueing at the office. When all of that lives in WhatsApp forwards and a PDF, the office answers the same questions on the phone all season.",
    "We build school websites from our own school templates: admissions with an enquiry form, a notice board that takes old notices down by itself, the fee structure, results, a gallery and, for a CBSE school, the Mandatory Public Disclosure page in the board's format. Built for the phone first, because that is what parents use.",
  ],
  whatsapp: "Hello Ideovent, I would like a website for our school. Please send me the options and a sample.",
  service: {
    name: "School website design",
    serviceType: "Website design",
    audience: "Schools",
    description:
      "Websites for schools in Delhi and across India, built from Ideovent's own school templates: admissions with an enquiry form, notices, fee structure, results, gallery, and the CBSE Mandatory Public Disclosure page.",
  },
  includes: {
    heading: "What a school website from us includes",
    intro: `Pages from our school templates. ${s.name} covers up to 5 pages; ${g.name} adds a page for each programme and an enquiry form; a website bought outright is scoped with you.`,
    items: [
      { title: "Admissions, start to finish", body: "Who can apply, the age rules, the steps with their dates, the documents to bring and the fees, with a short enquiry form that opens WhatsApp or e-mail for the parent." },
      { title: "Notices and events", body: "Pinned notices first, then the newest. A notice comes down by itself the day after its end date, so the site never says admissions are open for last year." },
      { title: "Fee structure", body: "One-time, annual, term and monthly fees, and anything else payable, in one table." },
      { title: "Academics, staff and facilities", body: "Classes, streams and subjects, teachers with their qualifications, labs, library, sports and transport." },
      { title: "Results and gallery", body: "Your board results, and your own photographs of school life." },
      { title: "CBSE Mandatory Public Disclosure", body: "For a CBSE school, the disclosure page in the board's Appendix IX order, with Class X and XII results for three years. A row you have not sent yet says \"To be uploaded\" instead of disappearing." },
      { title: "For parents", body: "The academic calendar, forms and circulars to download, and links to the parent portal or app you already use." },
      { title: "Hindi as well as English", body: `On ${g.name}, a Hindi version of the site. One of our school designs is made for a Hindi and English medium school.` },
    ],
  },
  samples: {
    heading: "Sample school sites from our templates",
    intro: SAMPLES_NOTE,
    frames: [FRAMES.schoolResidential, FRAMES.schoolPlay],
  },
  price: "both",
  rules: {
    heading: "The CBSE disclosure page, built in",
    paragraphs: [
      // Truth check, 2 Oct 2026: CBSE's affiliation manual names both circulars
      // (03/2021 added Appendix IX; its FAQ points to 09/2021), as the school
      // post now does, and Careers360 gives the 15 February 2026 deadline.
      "If your school is affiliated to CBSE, the board asks you to publish your Mandatory Public Disclosure on the school's own website, in the Appendix IX format (CBSE Circulars 03/2021 of 5 March 2021 and 09/2021 of 21 May 2021), and its affiliation application asks for that link. In January 2026 CBSE told affiliated schools to have these details up by 15 February 2026, from the fee structure and the academic calendar to three years of board results.",
      "Our school template has the page ready: general information, documents, results, staff and infrastructure, in CBSE's order. The figures and documents come from your school office, and we place them.",
    ],
    sources: [
      { label: "CBSE affiliation manual, 2024: Mandatory Public Disclosure on the school website (PDF)", href: "https://saras.cbse.gov.in/saras/manuals/saras_affiliation_manual2024.pdf" },
      { label: "CBSE Circular 03/2021: the Appendix IX format (PDF)", href: "https://saras.cbse.gov.in/saras/Circulars/Circular3.pdf" },
      { label: "Careers360, January 2026: CBSE's reminder to schools", href: "https://news.careers360.com/cbse-schools-class-10-12-results-fees-student-teacher-details-online-by-february-15-2026-affiliation-rules-public-disclosures" },
    ],
  },
  steps: { heading: "How it works", items: STEPS_BOTH },
  faqs: {
    heading: "Questions about a school website",
    items: [
      {
        id: "ws-cost",
        question: "How much does a school website cost?",
        answer: `On a monthly plan, ${s.name} is ${monthlyLine(s)}, ${termLine(s)}, and ${g.name} is ${monthlyLine(g)}, ${termLine(g)}, both with hosting and changes included. Bought outright, a school website is ${bandRange(ONE_TIME.website)}, fixed in writing after one call. Parent logins, online fee payment or attendance are a portal: ${bandRange(ONE_TIME.portal)} one time, depending on what it has to do.`,
      },
      {
        id: "ws-pages",
        question: "What pages should a school website have?",
        answer: "Home, about the school with the principal's message, admissions, the fee structure, academics, staff, facilities and transport, notices, results, a gallery, and contact details with a map. A CBSE school also needs its Mandatory Public Disclosure page.",
      },
      {
        id: "ws-admission",
        question: "Can parents apply for admission online?",
        answer: `They can send an admission enquiry: a short form, one tap from any page, that opens WhatsApp or e-mail with their details typed out, so it reaches the office straight away. The form comes with ${g.name} or a website bought outright; on ${s.name}, parents use the WhatsApp button on every page. A full online application with document uploads and fee payment is portal work, priced on its own.`,
      },
      {
        id: "ws-updates",
        question: "Who updates the notices and the gallery?",
        answer: `On a monthly plan, we do: send the notice or the photos on WhatsApp, up to ${s.changesPerMonth} changes a month on ${s.name} and ${g.changesPerMonth} on ${g.name}. On a website bought outright, your office posts the notices itself, and on the larger packages the gallery as well.`,
      },
      {
        id: "ws-when",
        question: "When should we start, before the admission season?",
        answer: "Well before admissions open. A website bought outright takes 3 to 5 weeks, counted from the advance and your text and photos. On a monthly plan, the go-live date is agreed with you in writing when you start.",
      },
      {
        id: "ws-existing",
        question: "We already have a website. Should we replace it?",
        answer: "Not always. If it opens quickly on a phone, shows this year's admission details and notices, and enquiries reach someone, keep it. Send us the address: we check it on a phone and tell you what we found, free.",
      },
      // In the words many school owners type it (Hinglish: "school ki website", "kharcha").
      {
        id: "ws-kharcha",
        question: "School ki website banwane ka kharcha kitna hai?",
        answer: `Monthly plan par ${monthlyLine(s)}, ${termLine(s)}. Ek baar mein kharidni ho to school website ${bandRange(ONE_TIME.website)} ki hai, jismein admission enquiry form, notices, fee structure aur gallery aate hain. Price ek call ke baad likhit mein fix hota hai, aur GST nahi lagta.`,
      },
    ],
  },
  related: {
    heading: "Keep reading",
    links: [
      { label: "School website requirements", href: "/blog/school-website-requirements", note: "Our guide to the CBSE disclosure and admissions pages" },
      { label: "EduFlow, our school software", href: "/eduflow", note: "In development: admissions, fees and attendance in one place" },
      { label: "Website on a monthly plan", href: "/websites/899-per-month", note: "Every figure, from the setup to the first-year total" },
      { label: "Coaching institute website", href: "/websites/coaching-institute" },
      { label: "Dental clinic website", href: "/websites/dental-clinic" },
      { label: "Websites for every kind of business", href: "/websites" },
      { label: "All prices", href: "/pricing" },
    ],
  },
  closing: {
    heading: "Want to see a sample for your school?",
    body: "Send us your school's name on WhatsApp. We send back sample sites from our school templates and what your site would cost, in writing. If the website you have already works, we will tell you that instead.",
  },
};
