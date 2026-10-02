import { ONE_TIME, PLANS, bandRange, monthlyLine, seoIndiaLine, termLine } from "../../../lib/pricing";
import { FRAMES, SAMPLES_NOTE, STEPS_BOTH } from "../shared";
import type { WebsitePage } from "../types";

const s = PLANS.starter;
const g = PLANS.growth;

/**
 * /websites/dental-clinic. Searched as "dental clinic website", "dental
 * website design Delhi", "dentist website", "clinic ki website". What it
 * describes is what our seven dental templates actually hold (src/pages/site/
 * dental/: treatments, doctors, fees, booking, emergency, contact). No client
 * is named: Ideovent has built no dental site for a client yet.
 */
export const dental: WebsitePage = {
  id: "dental-clinic",
  path: "/websites/dental-clinic",
  crumbs: [
    { name: "Websites", path: "/websites" },
    { name: "Dental clinic website", path: "/websites/dental-clinic" },
  ],
  intro: [
    "Before a new patient books, they look your clinic up on their phone. They want to know whether you do the treatment they need, roughly what it costs, when you are open and how to get there. If all they find is a map listing and a phone number, they have to call to ask, and some of them try another clinic instead.",
    "We build dental clinic websites from our own clinic templates: your treatments with starting fees, your doctors, your timings and directions, and a WhatsApp button on every page, so an appointment request reaches your phone. You see the site before it goes live, and every line on it is a plain fact.",
  ],
  whatsapp: "Hello Ideovent, I would like a website for my dental clinic. Please send me the options and a sample.",
  service: {
    name: "Dental clinic website design",
    serviceType: "Website design",
    audience: "Dental clinics",
    description:
      "Websites for dental clinics in Delhi and across India, built from Ideovent's own clinic templates: treatments with starting fees, doctors, timings and directions, appointment requests on WhatsApp, and a Hindi version on the Growth plan.",
  },
  includes: {
    heading: "What a clinic website from us includes",
    intro: `Pages from our dental clinic templates. ${s.name} covers up to 5 pages; ${g.name} adds a page for each treatment and the booking form; a website bought outright is scoped with you.`,
    items: [
      { title: "Treatments, each with a starting fee", body: "Root canals, implants, braces and aligners, cleaning, whatever you offer, each with a starting fee, or \"cost after consultation and X-ray\" where the case decides it." },
      { title: "Your doctors", body: "Each dentist's name, qualifications and the languages they speak, and the days a visiting specialist sees patients." },
      { title: "Timings, map and directions", body: "The week's hours with today marked, the address with a landmark, the nearest metro, parking, and a map." },
      { title: "Appointment requests on WhatsApp", body: "The patient picks a reason, a day and a time from your clinic hours, and WhatsApp opens with the request typed out to your number. Nothing is stored on the website itself." },
      { title: "A page for tooth pain", body: "What to do right now, when to go to a hospital instead, and how to reach you after hours." },
      { title: "Fees, payment and insurance", body: "How you charge, the consultation fee, EMI if you offer it, the payment methods you take and the insurance you accept." },
      { title: "Hindi as well as English", body: `On ${g.name}, a Hindi version of the site, with a switch at the top of every page.` },
    ],
  },
  samples: {
    heading: "Sample clinic sites from our templates",
    intro: SAMPLES_NOTE,
    frames: [FRAMES.dentalFamily, FRAMES.dentalOrtho],
  },
  price: "both",
  rules: {
    heading: "What the Dental Council allows on a clinic website",
    paragraphs: [
      "Is a website allowed for a dental clinic? The Revised Dentists (Code of Ethics) Regulations, 2014 answer it directly: a website about a dentist or a dental clinic where all information is factual is not unethical, and it can carry the treatments you offer and their fees (clause 8.2.9). The same regulations treat a claim of superiority over other dentists as unethical.",
      "So our clinic sites stick to facts: what you treat, what it costs or how the cost is decided, who the doctors are and when you are open. No \"best dentist\" lines and no invented reviews.",
    ],
    sources: [
      {
        label: "Dental Council of India: Revised Dentists (Code of Ethics) Regulations, 2014 (PDF)",
        href: "https://dciindia.gov.in/Rule_Regulation/Gazette_Notification_reg_DCI_Revised_Dentists_Code_of_Ethics_Regulations_2014_27.06.2014.pdf",
      },
    ],
  },
  steps: { heading: "How it works", items: STEPS_BOTH },
  faqs: {
    heading: "Questions about a clinic website",
    items: [
      {
        id: "wd-cost",
        question: "How much does a dental clinic website cost?",
        answer: `There are two ways to pay. On a monthly plan, ${s.name} is ${monthlyLine(s)}, ${termLine(s)}, with hosting and changes included, and ${g.name} is ${monthlyLine(g)}, ${termLine(g)}, adding a page for each treatment, a booking form and a Hindi version. Bought outright, a clinic website is ${bandRange(ONE_TIME.website)}, fixed in writing after one call. Your domain is extra either way, hosting is extra on a website bought outright, and GST is not applicable.`,
      },
      {
        id: "wd-contents",
        question: "What should a dental clinic website have?",
        answer: "The answers a new patient looks for before calling: the treatments you offer with a starting fee or an honest \"cost after consultation\", your doctors and their qualifications, your timings, the address with a map and directions, and a quick way to ask for an appointment. A page for tooth pain after hours, and answers about payment, EMI and insurance, help as well.",
      },
      {
        id: "wd-listing",
        question: "Do I need a website if my clinic is already listed on Google and on directory apps?",
        // Truth check, 2 Oct 2026: directory apps DO list doctors, fees and
        // bookings, so the answer no longer says a listing "cannot hold" them.
        answer: "Keep those listings: they help people find you. A website is the one place that is entirely yours: every treatment explained with its fee, your doctors, what to do in an emergency and a way to ask for an appointment, under your own name and domain, with no other clinic listed beside yours.",
      },
      {
        id: "wd-booking",
        question: "Can patients book an appointment on the website?",
        answer: `They can send a request. The patient picks a reason, a day and a time from your clinic hours, and WhatsApp opens with the request typed out to your number, so you confirm the slot yourself. The booking form comes with ${g.name}, and can be part of a website bought outright; ${s.name} has a WhatsApp button on every page.`,
      },
      {
        id: "wd-maps",
        question: "Will my clinic show up on Google Maps?",
        answer: `The map results come from your Google Business Profile more than from your website. Google says local results are mainly based on relevance, distance and popularity, and that there is no way to pay for a better local ranking. A clear website helps your profile, and our Local SEO add-on, ${seoIndiaLine().toLowerCase()}, sets up or cleans up the profile and adds local pages. Nobody can honestly promise you the top spot, and we do not.`,
      },
      {
        id: "wd-time",
        question: "How long does a clinic website take to build?",
        answer: "A website bought outright takes 3 to 5 weeks, counted from the advance and your text and photos. On a monthly plan, the go-live date is agreed with you in writing when you start.",
      },
      {
        id: "wd-owner",
        question: "Who owns the website and the domain?",
        answer: "Your domain is registered in your name and stays yours whatever happens. Bought outright, the code becomes yours on the final payment and the logins are handed to you. On a monthly plan the website is licensed to you while the plan runs, and you can buy it out at any time; the buy-out price is written into your plan before you pay the setup fee.",
      },
      // In the words many clinic owners type it (Hinglish searches: "clinic ki website", "kitna kharcha").
      {
        id: "wd-kharcha",
        question: "Clinic ki website banwane mein kitna kharcha aata hai?",
        answer: `Do tareeke hain. Monthly plan par ${monthlyLine(s)}, ${termLine(s)}, jismein hosting aur har mahine ke changes shaamil hain. Ek baar mein kharidni ho to clinic website ${bandRange(ONE_TIME.website)} ki hai, aur price ek call ke baad likhit mein fix hota hai. Domain ka kharcha alag hai, aur ek baar mein kharidi website par hosting ka bhi. GST nahi lagta.`,
      },
    ],
  },
  related: {
    heading: "Keep reading",
    links: [
      { label: "What a dental clinic website must have", href: "/blog/dental-clinic-website-checklist", note: "Our guide, page by page" },
      { label: "Website on a monthly plan", href: "/websites/899-per-month", note: "Every figure, from the setup to the first-year total" },
      { label: "Local SEO for your clinic", href: "/services/seo", note: "Google Business Profile, local pages and a reviews plan" },
      { label: "School website", href: "/websites/school" },
      { label: "Coaching institute website", href: "/websites/coaching-institute" },
      { label: "Websites for every kind of business", href: "/websites" },
      { label: "All prices", href: "/pricing" },
    ],
  },
  closing: {
    heading: "Want to see a sample for your clinic?",
    body: "Send us your clinic's name on WhatsApp. We send back sample sites from our dental templates and what your site would cost, in writing. If the website you have already works, we will tell you that instead.",
  },
};
