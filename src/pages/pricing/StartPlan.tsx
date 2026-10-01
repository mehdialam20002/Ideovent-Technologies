import { Link } from "react-router-dom";
import { MessageCircle, Phone } from "lucide-react";
import { GST_LINE } from "@/lib/pricing";
import { keepNumberCompounds, unbreakable } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { PAY_BUTTONS_ON } from "@/lib/payments/client";
import { CHECKOUT_KEY, CHOICES, choiceInfo, type Choice } from "./choice";
import { PAY_NOW, PAY_ONLINE_HOW } from "./copy";
import { SectionHead } from "./ui";
import { btnOutline, btnPrimary, whatsappHref } from "./styles";

/**
 * START A PLAN. Every "Start with ₹.../month" button on the page lands here with
 * its plan picked. The right-hand card lists everything the buyer pays, the
 * first-year total included, before any payment step: that is the plain answer
 * to drip pricing.
 *
 * PAYMENT SAYS "COMING SOON" UNTIL RAZORPAY IS LIVE. Online payment needs the
 * Razorpay account activated and its keys in Vercel's settings: the secrets
 * where only api/ can read them, the public key id as VITE_RAZORPAY_KEY_ID.
 * This page never holds a secret. Until a live key id is set, the step is
 * WhatsApp: UPI or a bank transfer, with the plan in writing first. With one,
 * "Continue to payment" goes to /checkout/:plan (the payments job's page) and
 * WhatsApp stays as the second way to pay.
 */
const linkCls = "underline underline-offset-2 transition-colors hover:text-foreground";

export default function StartPlan({
  choice,
  onChoose,
  whatsappNumber,
  phoneHref,
  phoneDisplay,
}: {
  choice: Choice;
  onChoose: (c: Choice) => void;
  whatsappNumber?: string;
  phoneHref?: string;
  phoneDisplay?: string;
}) {
  const info = choiceInfo(choice);
  const wa = whatsappHref(whatsappNumber, info.message);
  /* PAY_BUTTONS_ON is the payments module's build-time switch: true only when a
     LIVE Razorpay key id is set, so visitors never meet a test checkout. The
     checkout page (/checkout/:plan) asks the server again and falls back to
     WhatsApp itself if the keys are missing. */
  const payOnline = PAY_BUTTONS_ON;

  return (
    <section id="start" tabIndex={-1} className="section-tight focus:outline-none" aria-labelledby="start-heading">
      <div className="container-page">
        <SectionHead
          id="start-heading"
          title="Start a plan"
          intro="Pick the plan. Everything you will pay is listed beside it, before you pay anything."
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Which plan?</legend>
            <div className="mt-3 space-y-3">
              {CHOICES.map((c) => {
                const ci = choiceInfo(c);
                const checked = c === choice;
                return (
                  <label
                    key={c}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors duration-200",
                      checked ? "border-primary bg-primary/5" : "border-border bg-card/60 hover:border-primary/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="plan-choice"
                      value={c}
                      checked={checked}
                      onChange={() => onChoose(c)}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>
                      <span className="block font-display text-base font-semibold">{ci.title}</span>
                      <span className="mt-0.5 block text-sm text-foreground">{unbreakable(ci.priceLine)}</span>
                      <span className="block text-xs text-muted-foreground">{keepNumberCompounds(ci.term)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div aria-live="polite">
              <h3 className="font-display text-lg font-semibold">What you pay: {info.title}</h3>
              <dl className="mt-3 divide-y divide-border/70">
                {info.rows.map((r, i) => (
                  <div
                    key={r.label}
                    className={cn("flex items-baseline justify-between gap-4 py-3", i === info.rows.length - 1 && "font-semibold")}
                  >
                    <dt className="text-sm">{r.label}</dt>
                    <dd className="font-display text-lg tabular-nums">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{GST_LINE}</p>

            {payOnline ? (
              <p className="mt-6 text-sm text-muted-foreground text-pretty" data-testid="pay-online">
                Pay online with UPI AutoPay or a card, through Razorpay. The next page shows today's amount and the
                12-month total again before anything is charged. Or pay by UPI or bank transfer on WhatsApp.
              </p>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-4" data-testid="pay-coming-soon">
                <p className="text-sm font-semibold">Pay online: coming soon</p>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">{PAY_ONLINE_HOW}</p>
                <p className="mt-2 text-sm text-foreground text-pretty">{PAY_NOW}</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {payOnline && (
                <Link className={btnPrimary} to={`/checkout/${CHECKOUT_KEY[choice]}`}>
                  Continue to payment
                </Link>
              )}
              {wa && (
                <a className={payOnline ? btnOutline : btnPrimary} href={wa} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  {payOnline ? "Pay on WhatsApp instead" : "Start on WhatsApp"}
                </a>
              )}
              {phoneHref && (
                <a className={btnOutline} href={phoneHref}>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {unbreakable(phoneDisplay || "Call us")}
                </a>
              )}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              You get your plan in writing before you pay. See{" "}
              <Link to="#plan-terms" className={linkCls}>the plan in plain words</Link>, the{" "}
              <Link to="/terms" className={linkCls}>terms</Link>, the{" "}
              <Link to="/refund" className={linkCls}>refund and cancellation policy</Link> and the{" "}
              <Link to="/privacy" className={linkCls}>privacy policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
