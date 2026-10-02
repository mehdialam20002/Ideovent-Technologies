import { ONE_TIME, PLANS, bandRange, firstYearTotal, inr, monthlyLine, termLine, yearlySaving } from "../../../lib/pricing";
// The plan's terms are /pricing's own sentences, so the two pages cannot disagree.
import { NOT_IN_MONTHLY, PLAN_TERMS } from "../../pricing/copy";
import { STEPS_MONTHLY } from "../shared";
import type { WebsitePage } from "../types";

const s = PLANS.starter;
const g = PLANS.growth;

/**
 * /websites/899-per-month. Searched as "website 899 per month", "website on
 * monthly plan", "monthly website plan India", "website EMI". THE URL carries
 * the figure because that is what people type; THE PAGE never prints the
 * monthly fee without the setup fee and the 12-month term beside it (CCPA
 * dark-pattern guidelines, 2023, drip pricing; FACTS.md). Every figure here is
 * computed from src/lib/pricing.ts.
 */
export const monthly: WebsitePage = {
  id: "899-per-month",
  path: "/websites/899-per-month",
  crumbs: [
    { name: "Websites", path: "/websites" },
    { name: "Website on a monthly plan", path: "/websites/899-per-month" },
  ],
  intro: [
    `${s.name} is our smallest website plan, and its monthly fee is not the whole price, so here it is in full: ${inr(s.setup)} once to set the site up, then ${inr(s.monthly)} a month for ${s.months} months. That is ${inr(s.setup + s.monthly)} on the first day and ${inr(firstYearTotal(s))} over the first year. Your domain is extra, paid by you to the registrar.`,
    "For that, we build your business a website on one of our ready designs, host it, keep the padlock on it and make your changes every month. It suits a business that wants a proper website without a big bill at the start, and would rather hand the upkeep to someone else.",
  ],
  whatsapp: `Hello Ideovent, I am interested in the ${s.name} website plan (${monthlyLine(s)}, ${termLine(s)}). Please send me the details.`,
  service: {
    name: "Website on a monthly plan",
    serviceType: "Website design, hosting and upkeep on a monthly plan",
    description: `${s.name}: ${monthlyLine(s)}, ${termLine(s)}, a business website of up to 5 pages on one of Ideovent's ready designs, with hosting, SSL, a WhatsApp button and ${s.changesPerMonth} content changes a month. ${g.name}: ${monthlyLine(g)}, ${termLine(g)}.`,
  },
  includes: {
    heading: "What you get for it",
    intro: `${s.name} covers the basics. ${g.name} is for a business with several treatments, courses or services that takes bookings or enquiries.`,
    items: [
      { title: "A website on one of our ready designs", body: "Up to 5 pages, with your logo, text, photos, prices and timings in place." },
      { title: "A WhatsApp button on every page", body: "A customer can message you from wherever they are on the site." },
      { title: "Hosting and SSL", body: "We host the site and keep the padlock in the address bar." },
      { title: `${s.changesPerMonth} content changes a month`, body: "A new photo, a price or timing, a notice or a corrected line: send it on WhatsApp and we make the change." },
      { title: "Support on WhatsApp", body: "Questions about your site go straight to the people who built it." },
      { title: `${g.name} adds`, body: `A page for each treatment, course or service, a booking or enquiry form, a Hindi version of the site, and ${g.changesPerMonth} changes a month instead of ${s.changesPerMonth}.` },
    ],
  },
  cards: {
    heading: "Who it suits",
    intro: "Any business that needs a proper website and would rather not pay for it all at once.",
    items: [
      { title: "Dental clinics", body: "Treatments, fees, timings and appointment requests on WhatsApp.", href: "/websites/dental-clinic", cta: "Dental clinic websites" },
      { title: "Schools", body: "Admissions enquiries, notices, the fee structure and the CBSE disclosure page.", href: "/websites/school", cta: "School websites" },
      { title: "Coaching institutes", body: "Courses, batch timings, fees and a free demo class request.", href: "/websites/coaching-institute", cta: "Coaching institute websites" },
      { title: "Shops, salons, gyms and firms", body: "What you offer, your prices and timings, and a WhatsApp button on every page.", href: "/services/website-development", cta: "Website development" },
    ],
  },
  price: "monthly",
  terms: {
    heading: "The plan in plain words",
    intro: "The same terms go into the written plan you get before you pay anything.",
    items: PLAN_TERMS.map((t) => ({ title: t.term, body: t.detail })),
    notIncluded: NOT_IN_MONTHLY,
  },
  steps: { heading: "How to start", items: STEPS_MONTHLY },
  faqs: {
    heading: "Questions about the monthly plan",
    items: [
      {
        id: "wm-full-price",
        question: "Is the monthly fee the full price?",
        answer: `No, and we would rather say so up front. There is a ${inr(s.setup)} setup fee, paid once, and the plan runs for ${s.months} months, so the first day costs ${inr(s.setup + s.monthly)} and the first year ${inr(firstYearTotal(s))} on ${s.name}. Your domain is extra, paid by you to the registrar, usually once a year. GST is not applicable, so nothing is added on top.`,
      },
      {
        id: "wm-starter-growth",
        question: `What is the difference between ${s.name} and ${g.name}?`,
        answer: `${s.name} (${monthlyLine(s)}, ${termLine(s)}) is a website of up to 5 pages on one of our ready designs, with ${s.changesPerMonth} changes a month. ${g.name} (${monthlyLine(g)}, ${termLine(g)}) adds a page for each treatment, course or service, a booking or enquiry form and a Hindi version, with ${g.changesPerMonth} changes a month. Both include hosting, SSL and a WhatsApp button.`,
      },
      {
        id: "wm-vs-outright",
        question: "Is a monthly plan cheaper than buying a website outright?",
        answer: `Not over the long run. In the first year ${s.name} comes to ${inr(firstYearTotal(s))} with hosting and changes included, while a website bought outright is ${bandRange(ONE_TIME.website)} plus your own hosting. If the plan carries on at today's price, over several years it costs more, and in return the hosting, upkeep and changes are ours to do. If you rarely change your site, buying it outright usually costs less.`,
      },
      {
        id: "wm-what-to-send",
        question: "What do I need to give you?",
        answer: "Your logo, a few lines about your business, your photos, your prices or fees, your timings and your address. You send them and we place them: writing the text or taking photographs is not part of the plan.",
      },
      {
        id: "wm-see-design",
        question: "Can I see the design before I pay?",
        answer: "Yes. The plan is built on one of our ready designs. Ask on WhatsApp and we send you sample sites made from them before you pay anything.",
      },
      // In the words many owners type it (Hinglish: "monthly website plan", "kya milta hai").
      {
        id: "wm-kya-milta",
        question: "Monthly plan mein kya kya milta hai?",
        answer: `${s.name} plan ${monthlyLine(s)} hai, ${termLine(s)} par. Ismein hamare ready design par 5 pages tak ki website, har page par WhatsApp button, hosting aur SSL, aur har mahine ${s.changesPerMonth} changes milte hain. Domain aapke naam par hota hai, aur uska kharcha aap registrar ko alag se dete hain.`,
      },
      ...(s.yearly
        ? [
            {
              id: "wm-yearly",
              question: "Can I pay for the whole year at once?",
              answer: `On ${s.name}, yes: ${inr(s.yearly.price)} for the year, paid upfront${s.yearly.setupApplies ? `, plus the ${inr(s.setup)} setup` : ""}. That is ${inr(yearlySaving(s))} less than 12 monthly payments, about two months.`,
            },
          ]
        : []),
    ],
  },
  related: {
    heading: "Keep reading",
    links: [
      { label: "Monthly or one-time, side by side", href: "/pricing#compare", note: "Row by row, with the first-year totals" },
      { label: "Monthly plan or one-time payment?", href: "/blog/monthly-website-plan-vs-one-time-payment", note: "Our guide to choosing" },
      { label: "Start a plan", href: "/pricing?plan=starter-monthly#start", note: "Everything you pay, listed before any payment step" },
      { label: "Local SEO add-on", href: "/services/seo", note: "Google Business Profile, local pages and a monthly report" },
      { label: "Websites for every kind of business", href: "/websites" },
      { label: "Free website check", href: "/contact" },
    ],
  },
  closing: {
    heading: "Start with Starter, or ask first",
    body: "Message us on WhatsApp with what your business does. We reply with the plan that fits, in writing, before you pay anything.",
  },
};
