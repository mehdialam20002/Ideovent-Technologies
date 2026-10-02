// Relative imports only: src/lib/seo/prerender.ts bundles this with esbuild.
import {
  GST_LINE,
  ONE_TIME,
  PLANS,
  bandRange,
  firstYearTotal,
  inr,
  monthlyLine,
  termLine,
  yearlyFirstYear,
  yearlySaving,
} from "../../lib/pricing";
import type { SampleFrame, TextItem } from "./types";

/**
 * What the /websites pages share: the price rows, the four steps and the
 * sample frames. Every figure is read from src/lib/pricing.ts.
 */

const s = PLANS.starter;
const g = PLANS.growth;

export interface PriceRow {
  label: string;
  value: string;
  note: string;
}

const sentences = (items: string[]) => `${items.join(". ")}.`;

/** Both ways to buy, the smallest first payment first (FACTS.md presentation rule). */
export function priceRowsBoth(): PriceRow[] {
  return [
    { label: `${s.name} plan, paid monthly`, value: monthlyLine(s), note: `${termLine(s)}. ${sentences(s.includes)}` },
    { label: `${g.name} plan, paid monthly`, value: monthlyLine(g), note: `${termLine(g)}. ${sentences(g.includes)}` },
    // Truth check, 2 Oct 2026: hosting is not in a one-time price (/pricing,
    // NEVER_INCLUDED), so the two outright rows say so beside the figure.
    {
      label: "Landing page, bought outright",
      value: `From ${inr(ONE_TIME.landing.min)}, one time`,
      note: "A single page built around what you offer, with an enquiry form that reaches your e-mail. Hosting is extra, bought in your own name.",
    },
    {
      label: "Website, bought outright",
      value: `${bandRange(ONE_TIME.website)}, one time`,
      note: "A fixed price in writing after one call, with a list of what is not included. You pay 50% to start and 50% at launch, and the code is yours on the final payment. Hosting is extra, bought in your own name.",
    },
  ];
}

/** The monthly plans in full: what is paid today, every month, and in the first year. */
export function priceRowsMonthly(): PriceRow[] {
  const rows: PriceRow[] = [
    {
      label: `${s.name}`,
      value: monthlyLine(s),
      note: `${termLine(s)}. Paid on the first day: ${inr(s.setup + s.monthly)} (the setup and the first month). First year in total: ${inr(firstYearTotal(s))}.`,
    },
  ];
  const yearly = yearlyFirstYear(s);
  if (s.yearly && yearly != null) {
    rows.push({
      label: `${s.name}, the year paid upfront`,
      value: `${inr(s.yearly.price)} for the year${s.yearly.setupApplies ? ` + ${inr(s.setup)} one-time setup` : ""}`,
      note: `First year in total: ${inr(yearly)}. That is ${inr(yearlySaving(s))} less than 12 monthly payments, about two months.`,
    });
  }
  rows.push({
    label: `${g.name}`,
    value: monthlyLine(g),
    note: `${termLine(g)}. Paid on the first day: ${inr(g.setup + g.monthly)}. First year in total: ${inr(firstYearTotal(g))}.`,
  });
  return rows;
}

export const PRICE_FOOTNOTE = `${GST_LINE} The price shown is the full amount you pay us, with no tax added. Your domain is extra: registered in your name and paid by you to the registrar, usually once a year.`;

/** How a project runs, for a page that offers both ways to buy. */
export const STEPS_BOTH: TextItem[] = [
  {
    title: "Tell us what you need",
    body: "Message us on WhatsApp or call. Tell us what you do and whether you have a website now. If you do, we check it on a phone first and tell you what we found, free.",
  },
  {
    title: "Get it in writing",
    body: "On a monthly plan: the plan in writing, with the buy-out price and what stopping early costs, before you pay the setup fee. For a website bought outright: a written scope, a list of what is not included and a fixed price.",
  },
  {
    title: "We build it, you check it",
    body: "You send your text, photos, prices and timings. We build the site and you see it before anyone else does. A one-time website includes two rounds of changes at the design stage.",
  },
  {
    title: "It goes live on your domain",
    body: "Your domain is registered in your name. On a monthly plan we host the site and make your changes every month. Bought outright, you approve the finished site on its preview link and pay the second 50%, then it goes live, the code and logins are handed to you, and any defect in our work is fixed free for the first 30 days.",
  },
];

/** How a monthly plan starts. */
export const STEPS_MONTHLY: TextItem[] = [
  {
    title: "Choose Starter or Growth",
    body: "Message us on WhatsApp, or pick a plan on the pricing page. If you want to see our designs first, ask and we send you sample sites from our templates.",
  },
  {
    title: "Get the plan in writing",
    body: "What is included, the buy-out price and what stopping early costs are written down before you pay anything.",
  },
  {
    title: "Pay the setup and the first month",
    body: `${inr(s.setup + s.monthly)} on ${s.name}, ${inr(g.setup + g.monthly)} on ${g.name}. After that, the monthly fee for the rest of the ${s.months} months.`,
  },
  {
    title: "Send your details, and it goes live",
    body: `Your logo, text, photos, prices and timings. We put the site up on your domain, in your name, and from then on you send changes on WhatsApp: ${s.changesPerMonth} a month on ${s.name}, ${g.changesPerMonth} on ${g.name}.`,
  },
];

/* Screenshots of OUR OWN templates at 390 px, 2x, the top 540 CSS px (public/
   home/): the dental and coaching four were captured on 1 Oct 2026 for the
   home hero (src/lib/cms/seed.ts, home.hero.frames); the two school ones on 2
   Oct 2026 the same way, from the admin template preview with the admin bar
   and the demo ribbon removed. Templates s3 and s4 because their first 540 px
   hold no photograph of a person (s1, s2 and s5 open on children or adults).
   Never a prospect's demo. Paths are relative to the site's base URL. */
export const FRAMES: Record<"dentalFamily" | "dentalOrtho" | "coachingScience" | "coachingHindi" | "schoolPlay" | "schoolResidential", SampleFrame> = {
  schoolPlay: { src: "home/sample-s3-play-school.webp", width: 780, height: 1080, label: "Play school", alt: "Sample website for a play school, the top of its home page on a phone" },
  schoolResidential: { src: "home/sample-s4-residential-school.webp", width: 780, height: 1080, label: "Residential school", alt: "Sample website for a residential school, the top of its home page on a phone" },
  dentalFamily: { src: "home/sample-d1-family-dental.webp", width: 780, height: 1080, label: "Family dental clinic", alt: "Sample website for a family dental clinic, the top of its home page on a phone" },
  dentalOrtho: { src: "home/sample-d5-ortho-clinic.webp", width: 780, height: 1080, label: "Orthodontic clinic", alt: "Sample website for an orthodontic clinic, the top of its home page on a phone" },
  coachingScience: { src: "home/sample-c3-science-coaching.webp", width: 780, height: 1080, label: "Science coaching", alt: "Sample website for a science coaching institute, the top of its home page on a phone" },
  coachingHindi: { src: "home/sample-c2-hindi-tuition.webp", width: 780, height: 1080, label: "Tuition centre, in Hindi", alt: "Sample website in Hindi for a tuition centre, the top of its home page on a phone" },
};

export const SAMPLES_NOTE = "Sample sites from our own templates, as they open on a phone. The names and numbers in them are made up.";
