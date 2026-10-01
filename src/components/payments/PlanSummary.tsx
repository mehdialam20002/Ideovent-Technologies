import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { BUYOUT_PRICE, GST_LINE, inr, termTotal, todayAmount, type PayPlan } from "@/lib/payments/plans";

/**
 * What the customer is agreeing to pay, in full, before the pay button.
 *
 * The monthly price never stands alone: the setup fee and the 12-month term
 * are on the line under it, and today's amount, what follows and the 12-month
 * total are spelled out (CCPA Guidelines for Prevention and Regulation of Dark
 * Patterns, 2023: no price element revealed only at checkout). How to stop the
 * payments is stated here too, not only in the Terms.
 */
export function PlanSummary({ plan }: { plan: PayPlan }) {
  const monthly = plan.kind === "subscription";
  const today = todayAmount(plan);
  const rows: [string, string][] = monthly
    ? [
        ["Today", inr(today)],
        ["Then", `${inr(plan.monthly)} a month, ${plan.cycles - 1} more months`],
        ["12-month total", inr(termTotal(plan))],
      ]
    : [
        ["Today", inr(today)],
        ["After that", "Nothing renews automatically"],
      ];

  return (
    <section aria-labelledby="plan-summary-title" className="rounded-[12px] border border-border bg-card p-5 sm:p-6">
      <h2 id="plan-summary-title" className="text-[17px] font-semibold leading-6 text-foreground">
        {monthly ? `${plan.name} website plan` : "Starter website plan, paid for a year"}
      </h2>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-foreground">
        <span className="font-display text-[34px] font-semibold leading-none tracking-tight">
          {inr(monthly ? plan.monthly : plan.yearly)}
        </span>
        <span className="text-[15px]">{monthly ? "a month" : "for 12 months"}</span>
      </p>
      <p className="mt-2 text-[15px] font-medium leading-6 text-foreground">
        {plan.setup ? `+ ${inr(plan.setup)} one-time setup` : "Setup included"}
        {" · "}
        {monthly ? `${plan.cycles}-month plan` : "paid once"}
      </p>

      <dl className="mt-5 divide-y divide-border rounded-[8px] border border-border text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
        {monthly
          ? `Today's ${inr(today)} is the ${inr(plan.setup)} setup fee and the first month's ${inr(plan.monthly)}.`
          : plan.setup
            ? `${inr(plan.yearly)} for the 12 months and the ${inr(plan.setup)} one-time setup, in one payment.`
            : `${inr(plan.yearly)} for the 12 months, in one payment.`}
      </p>

      <h3 className="mt-6 text-[15px] font-semibold text-foreground">Included</h3>
      <ul className="mt-2 space-y-2">
        {plan.includes.map((item) => (
          <li key={item} className="flex gap-2.5 text-[15px] leading-6 text-foreground/90">
            <Check className="mt-1 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-[15px] font-semibold text-foreground">Good to know</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-foreground/85 marker:text-muted-foreground">
        <li>
          Your domain (your web address) is registered in your name and stays yours. It is not in this price: you pay the
          registrar for it, usually once a year.
        </li>
        <li>
          The website is licensed to you while the plan runs; when the plan ends it comes down, unless you buy it out.{" "}
          {BUYOUT_PRICE != null
            ? `The buy-out price is ${inr(BUYOUT_PRICE)}.`
            : "The buy-out price is in the plan we send you in writing before you pay."}
        </li>
        {monthly ? (
          <li>
            Razorpay collects {inr(plan.monthly)} each month automatically, by the UPI AutoPay, card or bank mandate
            you choose at checkout. Your bank or UPI app tells you before every debit, and you can stop the mandate
            from your UPI app or bank at any time.
          </li>
        ) : (
          <li>One payment for the 12 months. Nothing is charged automatically after that.</li>
        )}
        {monthly && (
          <li>
            To stop, tell us on WhatsApp, or cancel the mandate in your UPI app or bank. What stopping before month{" "}
            {plan.cycles} costs, if anything, is in your written plan; the rest is in our{" "}
            <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">Terms</Link>.
          </li>
        )}
        <li>{GST_LINE}</li>
      </ul>
    </section>
  );
}

export default PlanSummary;
