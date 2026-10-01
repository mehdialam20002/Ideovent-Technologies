import {
  PLANS,
  TERM_MONTHS,
  firstYearTotal,
  inr,
  monthlyLine,
  termLine,
  yearlyFirstYear,
  type PlanId,
} from "@/lib/pricing";

/** The three ways to start, cheapest monthly figure first. */
export type Choice = "starter-monthly" | "starter-yearly" | "growth-monthly";

/**
 * The plan key the Razorpay checkout (/checkout/:plan, src/lib/payments/plans.ts)
 * uses for each choice.
 */
export const CHECKOUT_KEY: Record<Choice, "starter" | "starter-yearly" | "growth"> = {
  "starter-monthly": "starter",
  "starter-yearly": "starter-yearly",
  "growth-monthly": "growth",
};

export const CHOICES: Choice[] = [
  "starter-monthly",
  ...(PLANS.starter.yearly ? (["starter-yearly"] as Choice[]) : []),
  "growth-monthly",
];

export interface ChoiceInfo {
  id: Choice;
  plan: PlanId;
  title: string;
  /** The price as one line, setup fee included. */
  priceLine: string;
  term: string;
  /** Everything the buyer pays, line by line, ending in the first-year total. */
  rows: { label: string; value: string }[];
  /** The WhatsApp message that starts it. Never a monthly figure without its setup fee. */
  message: string;
}

export function choiceInfo(c: Choice): ChoiceInfo {
  const planId: PlanId = c.startsWith("growth") ? "growth" : "starter";
  const p = PLANS[planId];
  const ask = "Please send the payment details and my plan in writing.";

  if (c === "starter-yearly" && p.yearly) {
    const setup = p.yearly.setupApplies ? p.setup : 0;
    const priceLine = setup
      ? `${inr(p.yearly.price)} for the year + ${inr(setup)} one-time setup`
      : `${inr(p.yearly.price)} for the year, no setup fee`;
    return {
      id: c,
      plan: planId,
      title: `${p.name}, paid yearly`,
      priceLine,
      term: `${TERM_MONTHS} months, paid upfront`,
      rows: [
        ...(setup ? [{ label: "One-time setup", value: inr(setup) }] : []),
        { label: `The year's fee, paid upfront`, value: inr(p.yearly.price) },
        { label: "First year in total", value: inr(yearlyFirstYear(p) ?? p.yearly.price) },
      ],
      message: `Hello Ideovent, I want to start the ${p.name} website plan, paid yearly: ${priceLine}. ${ask}`,
    };
  }

  return {
    id: c,
    plan: planId,
    title: `${p.name}, paid monthly`,
    priceLine: monthlyLine(p),
    term: termLine(p),
    rows: [
      { label: "One-time setup", value: inr(p.setup) },
      { label: `Monthly fee, ${p.months} payments`, value: inr(p.monthly) },
      { label: "First year in total", value: inr(firstYearTotal(p)) },
    ],
    message: `Hello Ideovent, I want to start the ${p.name} website plan: ${monthlyLine(p)}, ${termLine(p)}. ${ask}`,
  };
}
