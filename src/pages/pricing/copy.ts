import {
  BUYOUT_PRICE,
  CARE,
  GST_LINE,
  HOURLY_RATE,
  ONE_TIME,
  PLANS,
  SETUP_FEE,
  TERM_MONTHS,
  bandRange,
  firstYearTotal,
  inr,
  monthlyLine,
  seoIndiaLine,
  termLine,
  yearlyFirstYear,
  yearlySaving,
} from "@/lib/pricing";

/**
 * THE WORDS /pricing NEEDS AND NO OTHER PAGE DOES. Every figure in them comes
 * from src/lib/pricing.ts.
 *
 * DECISIONS STILL WITH MEHDI (1 Oct 2026). These sentences are written so they
 * are true today without the decision. When he decides, replace the sentence
 * with the term itself, in the same pass as the terms and refund policy:
 *   [[BUYOUT_PRICE]]       set BUYOUT_PRICE in src/lib/pricing.ts
 *   [[CANCELLATION]]       what stopping before month 12 costs, if anything
 *   [[AFTER_12_MONTHS]]    the page says the plan does not renew on its own
 *   [[CHANGE_DEFINITION]]  the definition below is the working one
 *   [[YEARLY_SETUP]]       PLANS.starter.yearly.setupApplies (true: setup is paid on yearly too)
 *   [[GO_LIVE_TIME]]       how soon a monthly-plan site goes live after setup
 */

const s = PLANS.starter;
const g = PLANS.growth;

export const buyoutSentence =
  BUYOUT_PRICE != null
    ? `The buy-out price is ${inr(BUYOUT_PRICE)}.`
    : "The buy-out price is written into your plan before you pay the setup fee, so you know it on day one.";

export const CHANGE_DEFINITION = `One small edit you send us on WhatsApp: a new photo, a price or timing update, a new offer or notice, a corrected line of text. Starter includes ${s.changesPerMonth} a month and Growth ${g.changesPerMonth}. A new page, a new section, a new feature or a redesign is not a change: we quote it first, and nothing is done until you agree.`;

export const OWNERSHIP = `Your domain (your web address) is registered in your name, on your own account, and stays yours whatever happens to the plan. The text, photos and logo you give us stay yours too. The website itself, its design and code, is licensed to you while the plan runs: we host it, keep it running and make your changes.`;

export const BUYOUT = `You can buy the website out at any time and move it wherever you like. ${buyoutSentence}`;

export const CANCELLING = `Tell us on WhatsApp. If you pay by AutoPay, you can also cancel it from your UPI app or your bank, which RBI rules let you do at any time. The plan is for ${TERM_MONTHS} months, so ${TERM_MONTHS} monthly payments are what you sign up for; what stopping early costs, if anything, is written into your plan before you pay the setup fee. When a plan ends the website comes down, unless you buy it out. Your domain, text and photos stay yours.`;

export const AFTER_TERM = `The plan does not renew on its own. To carry on after month ${TERM_MONTHS}, or to buy the website out, you tell us, and the price for the next period is written down before you pay anything.`;

export const NOT_IN_MONTHLY = [
  "Your domain: registered in your name and paid by you to the registrar, usually once a year",
  "Writing your text or taking photographs: you send them, we place them",
  "New pages, new features or a redesign: quoted first",
  "Paid extras such as SMS or WhatsApp message credits",
];

/** The plain-words block under the plan cards. */
export const PLAN_TERMS: { term: string; detail: string }[] = [
  { term: "What counts as a change", detail: CHANGE_DEFINITION },
  { term: "Who owns what", detail: OWNERSHIP },
  { term: "Owning it outright", detail: BUYOUT },
  { term: "Stopping the plan", detail: CANCELLING },
  { term: `After ${TERM_MONTHS} months`, detail: AFTER_TERM },
];

/**
 * Payment, stated for both states. Online payment waits for the Razorpay
 * account and its keys, which live only in Vercel's server settings (api/),
 * never in this bundle. Until then the pay step is WhatsApp: UPI or a bank
 * transfer, and a written plan before any money moves.
 */
export const PAY_ONLINE_HOW =
  "UPI AutoPay or a card, through Razorpay. You approve it once, each monthly payment is then taken automatically, and your bank tells you before every debit.";
export const PAY_ONLINE_SOON = `Online payment is coming soon: ${PAY_ONLINE_HOW}`;
export const PAY_NOW =
  "Until then, pay by UPI or bank transfer: message us on WhatsApp and we send the payment details with your plan in writing.";

/** How a service is delivered. Razorpay asks for this (a "shipping" policy) before it verifies a site. */
export const DELIVERY = [
  "Everything we sell is a service delivered online. Nothing is shipped to a postal address.",
  "A website is delivered by putting it live on your domain. Its address and any logins are sent to you in writing.",
  "One-time packages take the working weeks shown on each package, counted from the cleared advance and your content.",
  "Monthly plans: work starts once the setup fee is paid and your text and photos are with us. The go-live date is agreed with you in writing.",
  "Care plans and the SEO add-on run every month of the plan, with the reply times or the monthly report your plan states.",
];

/** First-year and three-year figures, used by the comparison and the FAQ. */
export const FIGURES = {
  starterYear: firstYearTotal(s),
  growthYear: firstYearTotal(g),
  starterYearly: yearlyFirstYear(s),
  saving: yearlySaving(s),
  starterThreeYears: s.setup + s.monthly * 36,
  careThreeYears: CARE[0].monthly * 36,
};

/** Monthly plan against buying outright, row by row. */
export const COMPARE: { label: string; monthly: string; oneTime: string }[] = [
  {
    label: "To start",
    monthly: `${inr(SETUP_FEE)} one-time setup`,
    oneTime: `50% of the fixed price: ${inr(ONE_TIME.landing.min / 2)} on a landing page priced at ${inr(ONE_TIME.landing.min)}`,
  },
  {
    label: "Then",
    monthly: `${inr(s.monthly)} a month on Starter, ${inr(g.monthly)} on Growth, for ${TERM_MONTHS} months`,
    // 1 Oct 2026 (Mehdi): 50/50. Was "30% at the design-and-build milestone, 20% before handover".
    oneTime: "The other 50% at launch, once you have checked the finished site",
  },
  {
    label: "First year in total",
    monthly: `${inr(FIGURES.starterYear)} on Starter, ${inr(FIGURES.growthYear)} on Growth`,
    oneTime: `From ${inr(ONE_TIME.landing.min)} for a landing page, ${bandRange(ONE_TIME.website)} for a website, plus your own hosting`,
  },
  { label: "Hosting and SSL", monthly: "Included", oneTime: "Bought in your own name, on your own card" },
  {
    label: "Changes after launch",
    monthly: `${s.changesPerMonth} a month on Starter, ${g.changesPerMonth} on Growth, made by us`,
    oneTime: `By you where the site has editable areas, or by us on a care plan from ${inr(CARE[0].monthly)} a month`,
  },
  {
    label: "Design",
    monthly: "One of our ready designs, with your logo, text and photos",
    oneTime: "Adapted from our layout system, or custom from the Professional tier up",
  },
  {
    label: "Who owns the website",
    monthly: "Licensed to you while the plan runs. You can buy it out at any time",
    oneTime: "You do: the custom code transfers to you on the final payment",
  },
  { label: "Your domain", monthly: "In your name", oneTime: "In your name" },
  {
    label: "Suits",
    monthly: "Starting without a big bill, and handing the upkeep to us",
    oneTime: "Owning the site outright, when you rarely need changes",
  },
];

export const THREE_YEARS = `Over three years, if the plan carries on at today's price, Starter comes to ${inr(FIGURES.starterThreeYears)} (${inr(s.setup)} + 36 × ${inr(s.monthly)}), with hosting and changes included, and the website is still licensed to you. A one-time landing page is ${bandRange(ONE_TIME.landing)} plus your own hosting, and it is yours; add the lowest care plan and three years of care alone comes to ${inr(FIGURES.careThreeYears)}. Neither is always cheaper. It depends on how much upkeep you want to hand over.`;

/** /pricing questions. Rendered as native <details>, so every answer is in the page for readers and for Google. */
export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "Do I have to pay every month for a website?",
    a: `No. You can buy a website outright, from ${inr(ONE_TIME.landing.min)} one time, or take a monthly plan: ${monthlyLine(s)}, ${termLine(s)}. Either way your domain is paid to the registrar, usually once a year.`,
  },
  {
    q: `What does ${inr(s.monthly)} a month get me?`,
    a: `Starter is ${monthlyLine(s)}, on a ${termLine(s)}. It includes a website on one of our ready designs (up to 5 pages), a WhatsApp button, hosting and SSL, ${s.changesPerMonth} content changes a month made by us, and support on WhatsApp. Your domain is not in the price. First year in total: ${inr(FIGURES.starterYear)}.`,
  },
  {
    q: "Why is there a setup fee?",
    a: `The ${inr(SETUP_FEE)} setup pays for building your site before the first month starts: your pages, your text and photos in place, the WhatsApp button, and your domain connected. It is paid once, not every month.`,
  },
  { q: "What counts as a content change?", a: CHANGE_DEFINITION },
  { q: "Who owns the domain and the website?", a: `${OWNERSHIP} ${BUYOUT}` },
  { q: "Can I cancel?", a: CANCELLING },
  { q: `What happens after ${TERM_MONTHS} months?`, a: AFTER_TERM },
  ...(s.yearly
    ? [
        {
          q: "Monthly or yearly: which costs less?",
          a: `On Starter, paying for the year upfront costs ${inr(s.yearly.price)} instead of 12 × ${inr(s.monthly)} = ${inr(s.monthly * 12)}: ${inr(FIGURES.saving)} less, about two months. ${
            s.yearly.setupApplies
              ? `The ${inr(SETUP_FEE)} setup is paid either way, so the first year is ${inr(FIGURES.starterYearly)} paid yearly or ${inr(FIGURES.starterYear)} paid monthly.`
              : "There is no setup fee on the yearly option."
          } The yearly option is offered on Starter.`,
        },
      ]
    : []),
  { q: "How do I pay?", a: `${PAY_ONLINE_SOON} You can cancel the AutoPay from your UPI app or bank at any time. ${PAY_NOW}` },
  { q: "Is GST extra?", a: `No. ${GST_LINE} The price you see is the full amount you pay.` },
  {
    q: "Can you guarantee a first-page ranking on Google?",
    a: `No, and be careful of anyone who does. Google says so itself: "No one can guarantee a #1 ranking on Google." The Local SEO add-on, ${seoIndiaLine().toLowerCase()}, is the work that helps people nearby find you: your Google Business Profile, local pages, on-page fixes, a reviews plan, and a monthly report that shows what changed.`,
  },
  {
    q: "Are the one-time prices final?",
    a: "They are starting prices for a scope. After one call you get a written scope, a list of what is not included and a fixed price, and that price does not move unless you approve a written change note.",
  },
  {
    q: "How do one-time payments work?",
    // 1 Oct 2026 (Mehdi): one split for India and abroad. Was "In India: 50% when you sign, 30% at the
    // design-and-build milestone and 20% before handover. ... Clients outside India pay 40 / 30 / 30, ..."
    a: "In two halves: 50% when you sign, and the other 50% at launch, once you have checked the finished site on a staging link. The same in India and for clients outside India. Invoices are due within 7 days.",
  },
];

/* ───────────── Moved unchanged from the old Pricing.tsx (one-time model) ───────────── */

/* Care plans, PACKAGES-INDIA.html. The three response targets match the
 * Maintenance & Support Agreement exactly: 48 working hours / 24 working hours /
 * same working day. Do not improve them here. Prices: src/lib/pricing.ts. */
export const CARE_ROWS: { label: string; values: string[] }[] = [
  { label: "Uptime monitoring, with an alert raised to us", values: ["Yes", "Yes", "Yes"] },
  { label: "Off-site backup of files and database", values: ["Monthly", "Weekly", "Daily"] },
  { label: "Restore from the last verified backup on request", values: ["Yes", "Yes", "Yes"] },
  { label: "Security updates, tested before release", values: ["Yes", "Yes", "Yes"] },
  { label: "SSL, domain and hosting expiry tracking", values: ["Yes", "Yes", "Yes"] },
  { label: "Content-change hours included", values: ["1 hour", "3 hours", "6 hours"] },
  { label: "Unused hours carried into the next month", values: ["No", "No", "No"] },
  { label: "First reply, in working hours", values: ["48 working hours", "24 working hours", "Same working day"] },
  { label: "Monthly report: uptime, backups, updates, hours used", values: ["No", "Yes", "Yes"] },
  { label: "Quarterly SEO health check: a technical report, not a campaign", values: ["No", "Yes", "Yes"] },
  { label: "Staging environment for testing changes", values: ["No", "No", "Yes"] },
  { label: "Monthly 30-minute strategy call", values: ["No", "No", "Yes"] },
  { label: "Per month", values: CARE.map((c) => inr(c.monthly)) },
  { label: "Per year, paid in advance, pay for ten months, get twelve", values: CARE.map((c) => inr(c.yearly)) },
];

export const ALWAYS_INCLUDED = [
  "A written scope with an explicit exclusions list",
  "Two revision rounds at every design stage",
  "A staging link, so you see it before anyone else does",
  "Testing on real phones and browsers",
  "Deployment and a live training session",
  "Handover pack: credentials, documentation, recording",
  "30 days of free defect fixes after launch",
  "The custom source code becomes yours on final payment",
];

export const NEVER_INCLUDED = [
  "Domain and hosting, bought in your own name, on your own card",
  "Paid APIs, SMS or WhatsApp message credits",
  "Paid plugins, licences, stock photos and fonts",
  "Content writing, translation, proofreading, data entry",
  "Photography and videography",
  "SEO campaigns, paid advertising, social media management (the SEO add-on is priced on its own)",
  "Anything not on the agreed scope list",
];

/* 1 Oct 2026 (Mehdi): 50% advance and 50% at launch, for India and abroad.
   It replaced 50 / 30 / 20 here (on signing, at the design-and-build milestone,
   before handover) and 40 / 30 / 30 for US-dollar projects. Both rows read
   50%, so Included.tsx keys them on `when`. */
export const PAYMENT_STAGES = [
  { pct: "50%", when: "On signing", note: "Books your slot in the calendar. Work starts once it clears." },
  { pct: "50%", when: "At launch", note: "Due once you have checked the finished site on the staging link. It goes live on your domain, and the source code and admin credentials are handed over, once this clears." },
];

export const RULES: { term: string; detail: string }[] = [
  { term: "Invoice terms", detail: "Payable within 7 days of the invoice date." },
  { term: "Late payment", detail: "Interest at 1.5% per month on overdue amounts. Work pauses if an invoice is more than 7 days overdue." },
  { term: "Extra revision rounds", detail: `Beyond the two included at each design stage: ${inr(HOURLY_RATE)} per hour, rounded to the nearest 30 minutes, approved by you in writing first.` },
  { term: "Out-of-scope work", detail: "Quoted before it is started. Never done silently and invoiced afterwards." },
  { term: "Tax", detail: `${GST_LINE} The amount quoted is the full amount payable; we add no tax on top.` },
  { term: "Timelines", detail: "The weeks shown on each tier are working time. The clock starts when the advance has cleared and your content is with us, and pauses while we are waiting on something only you can give." },
  { term: "Footer credit", detail: "We place a small “Developed by Ideovent Technologies” credit in the footer. Ask us in writing and we remove it: no charge, no discussion." },
  { term: "Jurisdiction", detail: "Indian law, courts at New Delhi." },
];
