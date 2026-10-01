import type { ReactNode } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { MessageCircle, RotateCcw } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton } from "@/lib/cms/context";
import { primaryButtonClass, textLinkClass } from "@/components/lead/fields";
import { PAY_PLANS, isPlanKey, planLine, type PayPlan } from "@/lib/payments/plans";
import { whatsappPayLink } from "@/lib/payments/client";

/**
 * /checkout/:plan/success and /checkout/:plan/failed
 *
 * What happens next, after Razorpay. The checkout page passes what it knows in
 * router state; a reload or a typed URL has none, and the page then says only
 * what is true without it (it never claims a payment it cannot see).
 */
export interface CheckoutOutcomeState {
  /** success: our server confirmed Razorpay's signature and the plan. */
  verified?: boolean;
  paymentId?: string;
  name?: string;
  business?: string;
  /** failed: Razorpay's own words for why. */
  reason?: string;
}

function chatText(whatsappNumber: string, text: string) {
  const digits = (whatsappNumber || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : "/contact";
}

export default function CheckoutResult() {
  const { plan: param, outcome } = useParams();
  const state = (useLocation().state || {}) as CheckoutOutcomeState;
  if (!isPlanKey(param)) return <Navigate to="/pricing" replace />;
  if (outcome !== "success" && outcome !== "failed") return <Navigate to={`/checkout/${param}`} replace />;
  const plan = PAY_PLANS[param];
  return outcome === "success" ? <Success plan={plan} state={state} /> : <Failed plan={plan} state={state} />;
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Layout>
      <Seo title={title} path="/checkout" noindex />
      <section className="pb-16 pt-32 md:pb-24 md:pt-40">
        {/* The width cap sits inside the container, so the column stays on the
            site gutter (a max-width on .container-page centred it instead). */}
        <div className="container-page">
          <div className="max-w-3xl">{children}</div>
        </div>
      </section>
    </Layout>
  );
}

function PaymentId({ id }: { id?: string }) {
  if (!id) return null;
  return (
    <p className="mt-5 rounded-[8px] border border-border bg-card px-4 py-3 text-[15px] leading-6 text-foreground">
      Payment id: <span className="break-all font-mono text-[14px]" data-payment-id="">{id}</span>
      <span className="block text-[13px] text-muted-foreground">Keep it. It is how Razorpay and we find this payment.</span>
    </p>
  );
}

function Success({ plan, state }: { plan: PayPlan; state: CheckoutOutcomeState }) {
  const contact = useSingleton("contact");
  const seen = Boolean(state.paymentId);
  const title = !seen ? "Thank you" : state.verified ? "Payment received" : "Payment received by Razorpay";
  const chat = chatText(
    contact.whatsappNumber,
    `Hello Ideovent, I have paid for the ${planLine(plan)}.${state.paymentId ? ` Payment id: ${state.paymentId}.` : ""}${state.business ? ` Business: ${state.business}.` : ""}`,
  );

  return (
    <Shell title={title}>
      <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]" data-outcome="success">
        {title}
      </h1>
      <p className="mt-3 text-[16px] leading-7 text-foreground/85">
        {!seen
          ? "If you have just paid, Razorpay sends you a confirmation by SMS or e-mail. Message us on WhatsApp with your payment id and we take it from there."
          : state.verified
            ? `Thank you${state.name ? `, ${state.name}` : ""}. Razorpay has confirmed your payment for the ${plan.name} website plan.`
            : "Razorpay reported this payment as successful, but our server could not confirm it just now. Nothing more is needed from you: we check it with Razorpay and message you."}
      </p>
      <PaymentId id={state.paymentId} />

      <h2 className="mt-8 text-[18px] font-semibold text-foreground">What happens next</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-foreground/90 marker:text-muted-foreground">
        <li>Razorpay sends you a receipt by SMS or e-mail.</li>
        <li>We message you on WhatsApp within two working days to collect your logo, photos and text, and to agree when the website goes live.</li>
        {plan.kind === "subscription" ? (
          <li>Your first month is paid. Before each monthly payment, your bank or UPI app tells you it is coming.</li>
        ) : (
          <li>Your 12 months are paid. Nothing is charged automatically after that.</li>
        )}
      </ol>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a href={chat} target="_blank" rel="noopener noreferrer" className={`${primaryButtonClass} w-full sm:w-auto`}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Message us on WhatsApp
        </a>
        <Link to="/" className={textLinkClass}>Back to the home page</Link>
      </div>
    </Shell>
  );
}

function Failed({ plan, state }: { plan: PayPlan; state: CheckoutOutcomeState }) {
  const contact = useSingleton("contact");
  return (
    <Shell title="Payment not completed">
      <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]" data-outcome="failed">
        Payment not completed
      </h1>
      <p className="mt-3 text-[16px] leading-7 text-foreground/85">
        Razorpay did not complete the payment for the {plan.kind === "order" ? "yearly Starter plan" : `${plan.name} website plan`}.
        {state.reason ? ` Razorpay said: "${state.reason}"` : ""}
      </p>
      {state.paymentId && (
        <p className="mt-3 text-[15px] leading-7 text-foreground/85">
          If your bank shows a debit for this attempt, send us the payment id below and we check it with Razorpay.
        </p>
      )}
      <PaymentId id={state.paymentId} />

      <h2 className="mt-8 text-[18px] font-semibold text-foreground">What you can do</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-foreground/90 marker:text-muted-foreground">
        <li>Try again, with another card or UPI app if the first one was refused.</li>
        <li>Or pay by UPI or bank transfer: message us on WhatsApp and we send you the details. The price is the same.</li>
      </ul>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link to={`/checkout/${plan.key}`} className={`${primaryButtonClass} w-full sm:w-auto`}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Link>
        <a href={whatsappPayLink(contact.whatsappNumber, planLine(plan), state.paymentId ? `Payment id of the failed attempt: ${state.paymentId}.` : "")}
          target="_blank" rel="noopener noreferrer" className={textLinkClass}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Pay by UPI or bank transfer on WhatsApp
        </a>
      </div>
    </Shell>
  );
}
