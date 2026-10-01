/**
 * The plans a customer can pay for ONLINE, as the checkout page shows them.
 *
 * Every figure comes from src/lib/pricing.ts, the one module every price on
 * the public site is printed from: change a price there and /pricing, the
 * home page and this checkout all move together. The SERVER charges from its
 * own copy (PLANS in api/_lib/razorpay.js, in paise), because a price the
 * browser sends can be edited in the browser; scripts/test-razorpay-fn.mjs
 * fails when the server's copy and src/lib/pricing.ts disagree.
 *
 * The one-time packages (from Rs 8,000) and SEO (from Rs 4,999 a month, or
 * USD 149 abroad) are not here: they are quoted per project and paid through
 * a Razorpay Payment Link that Mehdi sends, never from a button.
 *
 * DISPLAY RULES (CCPA Guidelines for Prevention and Regulation of Dark
 * Patterns, 2023): wherever a monthly price is shown, the setup fee and the
 * 12-month term sit right beside it, and the checkout states today's amount
 * and the 12-month total before the customer pays.
 */
import { BUYOUT_PRICE, GST_LINE, PLANS, inr as pricingInr } from "@/lib/pricing";

export type PlanKey = "starter" | "growth" | "starter-yearly";

export interface PayPlan {
  key: PlanKey;
  kind: "subscription" | "order";
  /** "Starter", "Growth". */
  name: string;
  /** The checkout page's h1. */
  title: string;
  /** Monthly fee in rupees; 0 for the yearly plan. */
  monthly: number;
  /** One-time setup fee in rupees, charged with the first payment (0 if waived). */
  setup: number;
  /** Yearly fee in rupees, for the plan paid upfront; 0 otherwise. */
  yearly: number;
  /** Charges in the plan: 12 for the monthly plans, 1 for the yearly one. */
  cycles: number;
  includes: string[];
}

export { GST_LINE, BUYOUT_PRICE };

const starter = PLANS.starter;
const growth = PLANS.growth;

export const PAY_PLANS: Record<PlanKey, PayPlan> = {
  starter: {
    key: "starter",
    kind: "subscription",
    name: starter.name,
    title: `Start the ${starter.name} website plan`,
    monthly: starter.monthly,
    setup: starter.setup,
    yearly: 0,
    cycles: starter.months,
    includes: starter.includes,
  },
  growth: {
    key: "growth",
    kind: "subscription",
    name: growth.name,
    title: `Start the ${growth.name} website plan`,
    monthly: growth.monthly,
    setup: growth.setup,
    yearly: 0,
    cycles: growth.months,
    includes: growth.includes,
  },
  /* The yearly option pays the twelve monthly fees upfront. Whether the
     one-time setup is added is pricing.ts's `yearly.setupApplies` (Mehdi to
     confirm, [[YEARLY_SETUP]]); the server's copy must follow it. */
  "starter-yearly": {
    key: "starter-yearly",
    kind: "order",
    name: `${starter.name}, paid yearly`,
    title: `Pay for a year of the ${starter.name} plan`,
    monthly: 0,
    setup: starter.yearly && starter.yearly.setupApplies ? starter.setup : 0,
    yearly: starter.yearly ? starter.yearly.price : 0,
    cycles: 1,
    includes: starter.includes,
  },
};

export const isPlanKey = (v: string | undefined): v is PlanKey =>
  !!v && Object.prototype.hasOwnProperty.call(PAY_PLANS, v) && (v !== "starter-yearly" || Boolean(starter.yearly));

/** What the customer pays today, in rupees. */
export const todayAmount = (p: PayPlan) => (p.kind === "subscription" ? p.setup + p.monthly : p.yearly + p.setup);

/** Everything the customer pays over the plan's 12 months, in rupees. */
export const termTotal = (p: PayPlan) => (p.kind === "subscription" ? p.setup + p.monthly * p.cycles : p.yearly + p.setup);

/** "₹3,898". The same formatter as every other price on the site. */
export const inr = pricingInr;

/**
 * The plan and its full price in one line, for a WhatsApp message:
 * "Starter website plan (₹899 a month + ₹2,999 one-time setup, 12-month plan)".
 */
export function planLine(p: PayPlan): string {
  return p.kind === "subscription"
    ? `${p.name} website plan (${inr(p.monthly)} a month + ${inr(p.setup)} one-time setup, ${p.cycles}-month plan)`
    : `${starter.name} website plan paid yearly (${inr(p.yearly)} for 12 months${p.setup ? ` + ${inr(p.setup)} one-time setup` : ""})`;
}
