import { ONE_TIME, PLANS, bandRange, inr, monthlyLine, seoIndiaLine, termLine } from "../../../lib/pricing";
import { FRAMES, SAMPLES_NOTE, STEPS_BOTH } from "../shared";
import type { WebsitePage } from "../types";

const s = PLANS.starter;

/**
 * /websites, the hub. Searched as "website design Delhi", "website designing
 * company in Delhi", "small business website", "website banwana hai". It
 * speaks to every kind of business (memory: the site is a studio for any
 * business; schools and coaching are one industry among several), routes to
 * the three industry pages and the monthly plan, and does not compete with
 * the home page, which targets the studio as a whole.
 */
export const hub: WebsitePage = {
  id: "hub",
  path: "/websites",
  crumbs: [{ name: "Websites", path: "/websites" }],
  intro: [
    "Before people call or walk in, they check a business on their phone. They look for what you do, what it costs, when you are open and how to reach you. A website that answers those four things quickly, on a phone, is what we build, for clinics, schools, coaching institutes, shops, gyms and firms.",
    "We are a web and software studio in Saket, New Delhi. You talk directly to the partners, Mehdi Alam and Abhishek Tiwari, and you choose how to pay: a monthly plan, or the website bought outright.",
  ],
  whatsapp: "Hello Ideovent, I would like a website for my business. Please tell me the options.",
  service: {
    name: "Website design for small businesses",
    serviceType: "Website design",
    audience: "Small businesses",
    description:
      "Websites for small businesses in Delhi and across India: on a monthly plan with hosting and changes included, or bought outright with the code handed over. Ready templates for dental clinics, schools and coaching institutes.",
  },
  cards: {
    heading: "Websites by kind of business",
    intro: "Each page shows what the website holds for that kind of business, what it costs, and the rules your field sets for it.",
    items: [
      { title: "Dental clinics", body: "Treatments with starting fees, doctors, timings and appointment requests on WhatsApp.", href: "/websites/dental-clinic", cta: "Dental clinic websites" },
      { title: "Schools", body: "Admissions enquiries, notices, the fee structure, results and the CBSE disclosure page.", href: "/websites/school", cta: "School websites" },
      { title: "Coaching institutes", body: "Courses, batch timings, fees, faculty and a free demo class request.", href: "/websites/coaching-institute", cta: "Coaching institute websites" },
      { title: "Every other business", body: "Shops, salons, gyms, restaurants, law and CA firms: what you offer, your prices and timings, and a WhatsApp button.", href: "/services/website-development", cta: "Website development" },
    ],
  },
  includes: {
    heading: "What you can count on, whichever way you pay",
    items: [
      { title: "Built for the phone first", body: "Every page is designed for a phone first, then for a laptop." },
      { title: "Your domain, in your name", body: "Registered on your own account, so your web address stays yours whatever happens." },
      { title: "Prices in writing", body: "A written plan, or a written scope with a fixed price, before you pay anything." },
      { title: "You see it first", body: "You check the site before it goes live, and before anyone else sees it." },
      { title: "No GST on top", body: "We are not registered under GST, so no tax is added to the price we quote." },
      { title: "Help after launch", body: "On a monthly plan, support and changes on WhatsApp. Bought outright, 30 days of free fixes, then an optional care plan." },
    ],
  },
  samples: {
    heading: "Sample sites from our templates",
    intro: SAMPLES_NOTE,
    // One of each kind of business, and the Hindi one: the h1 here is not about schools.
    frames: [FRAMES.dentalFamily, FRAMES.schoolResidential, FRAMES.coachingHindi, FRAMES.dentalOrtho],
  },
  price: "both",
  steps: { heading: "How it works", items: STEPS_BOTH },
  faqs: {
    heading: "Questions about getting a website",
    items: [
      {
        id: "wh-cost",
        question: "How much does a website cost in Delhi?",
        answer: `It depends on how you pay and what the site has to do. With us: on a monthly plan, ${monthlyLine(s)}, ${termLine(s)}, with hosting and changes included; bought outright, a landing page from ${inr(ONE_TIME.landing.min)} and a website ${bandRange(ONE_TIME.website)}; a portal with logins and payments from ${inr(ONE_TIME.portal.min)}. Every price is fixed in writing before you pay.`,
      },
      {
        id: "wh-industries",
        question: "Do you only make websites for clinics, schools and coaching institutes?",
        answer: "No. Those are the businesses we have ready templates for, so they have pages of their own here. We build websites, web apps and software for any business: shops, salons, gyms, restaurants, law and CA firms, and startups with an app idea.",
      },
      {
        id: "wh-which-way",
        question: "Monthly plan or bought outright: which should I choose?",
        answer: "A monthly plan suits you if you want to start without a big bill and hand the hosting and the changes to us. Buying outright suits you if you want to own the code and rarely need changes. Your domain stays in your name either way.",
      },
      {
        id: "wh-where",
        question: "Do you only work with businesses in Delhi?",
        answer: "No. We are in Saket, New Delhi, and the work runs on WhatsApp and calls, so we build for businesses across India. Clients outside India are quoted in US dollars.",
      },
      {
        id: "wh-rank",
        question: "Will my website come first on Google?",
        answer: `Nobody can honestly promise that, and Google itself says there is no way to request or pay for a better local ranking. What helps is a clear, fast website with the right words on each page, a complete Google Business Profile and real reviews. Our Local SEO add-on, ${seoIndiaLine().toLowerCase()}, does that work and reports on it every month.`,
      },
      {
        id: "wh-time",
        question: "How long does a website take?",
        answer: "A landing page takes 2 to 3 weeks and a website 3 to 5 weeks, counted from the advance and your text and photos. On a monthly plan, the go-live date is agreed with you in writing when you start.",
      },
      // In the words many owners type it (Hinglish: "website banwana hai", "kitna kharcha").
      {
        id: "wh-kharcha",
        question: "Website banwane mein kitna kharcha lagta hai?",
        answer: `Monthly plan par ${monthlyLine(s)}, ${termLine(s)}, ya ek baar mein website ${bandRange(ONE_TIME.website)} aur landing page ${inr(ONE_TIME.landing.min)} se. Advance aur aapka content milne ke baad landing page 2 se 3 hafte mein aur website 3 se 5 hafte mein banti hai. Har price kaam shuru hone se pehle likhit mein fix hota hai.`,
      },
    ],
  },
  related: {
    heading: "Keep reading",
    links: [
      { label: "Website on a monthly plan", href: "/websites/899-per-month", note: "Every figure, from the setup to the first-year total" },
      { label: "All prices, tier by tier", href: "/pricing" },
      { label: "What a website costs in India", href: "/blog/website-cost-in-india", note: "Our price guide" },
      { label: "Local SEO", href: "/services/seo", note: "Google Business Profile, local pages and a monthly report" },
      { label: "Sites we built for clients", href: "/work" },
      { label: "Questions we get asked", href: "/faq" },
    ],
  },
  closing: {
    heading: "Not sure what you need?",
    body: "Send us your website address, or tell us about your business if you have none. We check it on a phone and tell you what we found, in plain words. If your current site is fine, we say so.",
  },
};
