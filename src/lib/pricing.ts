/**
 * EVERY PRICE THE PUBLIC SITE PRINTS COMES FROM THIS FILE.
 *
 * /pricing, the home page price block (PriceSummary), the service pages
 * (ServiceDetail), the services FAQ in seed.ts and the budget choices in the
 * enquiry pop-up and the contact form (components/lead/core.ts) all read these
 * numbers. Change a price here and every one of them moves with it.
 *
 * Where the figures come from
 *   Monthly website plans, the Local SEO add-on and SEO for clients abroad:
 *   Mehdi's pricing of 1 Oct 2026. One-time packages, care plans and the USD
 *   table: _assets/FACTS.md, "CORRECTIONS CONFIRMED BY MEHDI, 24 Sep 2026",
 *   item 2 (middle tiers are rule R1 of 05-pricing/PRICING-STRATEGY.md). Tax:
 *   Ideovent is not registered under GST (FACTS.md, compliance table).
 *
 * Rules every consumer follows
 *   1. A monthly price never appears without its one-time setup fee and its
 *      12-month term beside it: use monthlyLine() and termLine(). That is the
 *      drip-pricing rule of the CCPA Guidelines for Prevention and Regulation
 *      of Dark Patterns, 2023. Never "₹899" alone in a title, a description,
 *      a WhatsApp message or an ad.
 *   2. The lowest number leads and the smallest package comes first (FACTS.md
 *      presentation rule).
 *   3. No ranking promise next to an SEO price, anywhere.
 *
 * Kept to plain data and small functions: the home page and the lead form are
 * in the entry chunk and import this file. Words that only /pricing needs live
 * in src/pages/pricing/.
 */

/* ───────────────────────────── Formatting ───────────────────────────── */

/** Indian digit grouping: 8999 -> "8,999", 150000 -> "1,50,000". */
function groupIn(n: number): string {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  return `${s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${s.slice(-3)}`;
}

/** "₹8,999" */
export const inr = (n: number) => `₹${groupIn(n)}`;
/** "$1,400", for the table that is headed as US dollars. */
export const usd = (n: number) => `$${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
/** "USD 149", for a sentence read by someone who may not assume the dollar is American. */
export const usdWord = (n: number) => `USD ${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

/** The line FACTS.md requires wherever a price is listed. */
export const GST_LINE = "GST not applicable. Supplier is not registered under GST.";

/* ─────────────────────── Monthly website plans ─────────────────────── */

export const SETUP_FEE = 2999;
export const TERM_MONTHS = 12;

export type PlanId = "starter" | "growth";

export interface MonthlyPlan {
  id: PlanId;
  name: string;
  monthly: number;
  setup: number;
  months: number;
  changesPerMonth: number;
  /** One sentence: who the plan suits. */
  suits: string;
  /** What is in it. Growth lists what it adds to Starter. */
  includes: string[];
  /**
   * Pay the year upfront instead of monthly (Starter only). `setupApplies` is
   * the reading of Mehdi's words that the page states: the yearly price
   * replaces the twelve monthly fees, not the setup fee. MEHDI TO CONFIRM
   * ([[YEARLY_SETUP]]); if he waives the setup for yearly, set it to false and
   * every page, the totals and the JSON-LD follow.
   */
  yearly?: { price: number; setupApplies: boolean };
}

export const PLANS: Record<PlanId, MonthlyPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    monthly: 899,
    setup: SETUP_FEE,
    months: TERM_MONTHS,
    changesPerMonth: 2,
    suits: "A proper website for a small business, without a big bill at the start.",
    includes: [
      "A website on one of our ready designs, up to 5 pages",
      "A WhatsApp button on every page",
      "Hosting and SSL (the padlock in the address bar)",
      "2 content changes a month, made by us",
      "Support on WhatsApp",
    ],
    yearly: { price: 8999, setupApplies: true },
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthly: 1999,
    setup: SETUP_FEE,
    months: TERM_MONTHS,
    changesPerMonth: 5,
    suits: "For a business with several services, treatments or courses, that takes bookings or enquiries.",
    includes: [
      "Everything in Starter",
      "A page for each treatment, course or service",
      "A booking or enquiry form",
      "A Hindi version of the site",
      "5 content changes a month instead of 2",
    ],
  },
};

/** Cheapest first. */
export const PLAN_ORDER: PlanId[] = ["starter", "growth"];

/** "₹899/month + ₹2,999 one-time setup". The only way a monthly price is printed. */
export const monthlyLine = (p: MonthlyPlan) => `${inr(p.monthly)}/month + ${inr(p.setup)} one-time setup`;
/** "12-month plan" */
export const termLine = (p: MonthlyPlan) => `${p.months}-month plan`;
/** Setup plus every monthly payment of the term: Starter ₹13,787, Growth ₹26,987. */
export const firstYearTotal = (p: MonthlyPlan) => p.setup + p.monthly * p.months;
/** What the yearly option costs in its first year, setup included when it applies. */
export const yearlyFirstYear = (p: MonthlyPlan) =>
  p.yearly ? p.yearly.price + (p.yearly.setupApplies ? p.setup : 0) : null;
/**
 * How much less the yearly price is than twelve monthly payments: ₹1,789 on
 * Starter. Printed as the exact figure, with "about two months" beside it,
 * because two months would be ₹1,798: "two months free" alone overstates the
 * saving by ₹9.
 */
export const yearlySaving = (p: MonthlyPlan) => (p.yearly ? p.monthly * p.months - p.yearly.price : 0);

/**
 * The buy-out price of a site on a monthly plan. NOT DECIDED ([[BUYOUT_PRICE]]).
 * While it is null the pages say the price is written into the plan before the
 * setup fee is paid, which is true without a number; set it and they print it.
 */
export const BUYOUT_PRICE: number | null = null;

/* ─────────────────────── One-time packages (FACTS.md) ─────────────────────── */

export interface Band {
  label: string;
  min: number;
  /** Absent on the open-ended line ("from ₹90,000"). */
  max?: number;
  /** Tier prices, cheapest first. */
  tiers: number[];
  /** Anchor on /pricing. The ids are old and linked from pitch pages: keep them. */
  anchor: string;
}

export const ONE_TIME: Record<"landing" | "website" | "portal" | "software", Band> = {
  landing: { label: "Landing page or single page", min: 8000, max: 20000, tiers: [8000, 12500, 20000], anchor: "business-website" },
  website: { label: "Website", min: 20000, max: 45000, tiers: [20000, 30000, 45000], anchor: "school-website" },
  portal: { label: "Portal or web app", min: 40000, max: 85000, tiers: [40000, 58500, 85000], anchor: "portal" },
  software: { label: "Custom software", min: 90000, tiers: [90000], anchor: "custom-saas" },
};

/** "₹8,000-₹20,000", or "From ₹90,000" on an open-ended band. */
export const bandRange = (b: Band) => (b.max ? `${inr(b.min)}-${inr(b.max)}` : `From ${inr(b.min)}`);

/** Care plans after a one-time build. Yearly = ten months for twelve (rule R2). */
export const CARE = [
  { name: "Essential", monthly: 1000, yearly: 10000 },
  { name: "Growth", monthly: 2000, yearly: 20000 },
  { name: "Priority", monthly: 3500, yearly: 35000 },
] as const;

/** Extra revision rounds and extra care-plan hours, approved in writing first (PACKAGES-INDIA.html). */
export const HOURLY_RATE = 1000;

/** Clients outside India, in US dollars (FACTS.md, International). */
export const ABROAD = [
  { label: "Landing page", min: 300, max: 600 },
  { label: "Business website", min: 600, max: 1400 },
  { label: "Web application", min: 2200 },
  { label: "Care plan, a month", min: 40, max: 160 },
] as const;

export const usdRange = (r: { min: number; max?: number }) => (r.max ? `${usd(r.min)}-${usd(r.max)}` : `from ${usd(r.min)}`);

/* ─────────────────────────── SEO add-on ─────────────────────────── */

export const SEO = {
  /** India, a month, "from": the fee for a business is fixed in writing after a free check. */
  indiaFrom: 4999,
  /** Clients outside India, a month, "from". */
  abroadFromUsd: 149,
  includes: [
    "Google Business Profile, set up or cleaned up",
    "Local pages on your website for the areas you serve",
    "On-page SEO: page titles, descriptions, headings and speed basics",
    "A reviews plan: asking real customers, never buying or writing reviews",
    "A monthly report in plain words",
  ],
};

export const seoIndiaLine = () => `From ${inr(SEO.indiaFrom)} a month`;
export const seoAbroadLine = () => `From ${usdWord(SEO.abroadFromUsd)} a month`;

/* ───────────────────── Price blocks for the service pages ───────────────────── */

export interface PriceLine {
  label: string;
  value: string;
  note?: string;
}

export interface ServicePrice {
  heading: string;
  lines: PriceLine[];
  href: string;
  linkLabel: string;
}

/**
 * The price block a /services/:slug page shows, or null where FACTS.md has no
 * band for that service (UI/UX, e-commerce, mobile apps, brand identity): those
 * pages keep their link to /pricing and print no figure rather than a made-up
 * one. "seo", "custom-software-development" and "website-maintenance" are the
 * slugs the keyword plan proposes; they are mapped now so a record added under
 * them prints the right figures from its first day.
 */
export function servicePrice(slug: string): ServicePrice | null {
  const s = PLANS.starter;
  const g = PLANS.growth;
  switch (slug) {
    case "website-development":
      return {
        heading: "What a website costs",
        lines: [
          {
            label: "On a monthly plan",
            value: monthlyLine(s),
            note: `${termLine(s)}. Hosting, SSL and ${s.changesPerMonth} changes a month included. Growth: ${monthlyLine(g)}, ${termLine(g)}.`,
          },
          {
            label: "Bought outright",
            value: `From ${inr(ONE_TIME.landing.min)}, one time`,
            note: `Landing page ${bandRange(ONE_TIME.landing)}. Website ${bandRange(ONE_TIME.website)}. The code is yours on the final payment.`,
          },
        ],
        href: "/pricing#monthly",
        linkLabel: "Every plan and package, with what each includes",
      };
    case "seo":
    case "seo-digital-marketing":
      return {
        heading: "What local SEO costs",
        lines: [
          { label: "In India", value: seoIndiaLine(), note: "Your fee is fixed in writing after a free check, before you pay anything." },
          { label: "Outside India", value: seoAbroadLine(), note: "Quoted in US dollars. No ranking is promised, by us or by anyone honest." },
        ],
        href: "/pricing#seo",
        linkLabel: "What the SEO add-on includes",
      };
    case "custom-software-development":
      return {
        heading: "What software costs",
        lines: [
          { label: "Portal or web app", value: bandRange(ONE_TIME.portal), note: "One time. Fixed in writing after one call." },
          { label: "Custom software", value: bandRange(ONE_TIME.software), note: "Priced in stages, from a written scope." },
        ],
        href: `/pricing#${ONE_TIME.portal.anchor}`,
        linkLabel: "Every package, tier by tier",
      };
    case "website-maintenance":
      return {
        heading: "What care costs",
        lines: [
          {
            label: "Care plans",
            value: `${inr(CARE[0].monthly)}, ${inr(CARE[1].monthly)} or ${inr(CARE[2].monthly)} a month`,
            note: `Or a year paid upfront, ten months for twelve: from ${inr(CARE[0].yearly)}.`,
          },
        ],
        href: "/pricing#care-plans",
        linkLabel: "What each care plan includes",
      };
    default:
      return null;
  }
}

/* ─────────────────── Budget choices in the lead forms ─────────────────── */

/**
 * The "Budget" choices in the enquiry pop-up and the contact form, re-exported
 * by components/lead/core.ts as BUDGETS. The label is what the enquiry e-mail,
 * the stored lead and the WhatsApp message carry, so a monthly choice always
 * carries its setup fee. The ids are stored with every enquiry, and
 * scripts/e2e-lead-popup.mjs selects "20k-45k": keep the old ids.
 */
export const BUDGET_CHOICES = [
  { id: "monthly-starter", label: `${inr(PLANS.starter.monthly)}/month + ${inr(PLANS.starter.setup)} setup`, hint: `Starter website plan, ${TERM_MONTHS} months` },
  { id: "monthly-growth", label: `${inr(PLANS.growth.monthly)}/month + ${inr(PLANS.growth.setup)} setup`, hint: `Growth website plan, ${TERM_MONTHS} months` },
  { id: "8k-20k", label: bandRange(ONE_TIME.landing), hint: "landing page or single page, one time" },
  { id: "20k-45k", label: bandRange(ONE_TIME.website), hint: "website, one time" },
  { id: "40k-85k", label: bandRange(ONE_TIME.portal), hint: "portal or web app" },
  { id: "90k-plus", label: bandRange(ONE_TIME.software), hint: "custom software" },
  { id: "seo-monthly", label: seoIndiaLine(), hint: "local SEO" },
  { id: "usd", label: `Outside India, from ${usd(ABROAD[0].min)}`, hint: "priced in US dollars" },
  { id: "not-sure", label: "Not sure yet", hint: "" },
] as const;
