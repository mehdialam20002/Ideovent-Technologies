import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, MessageCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton } from "@/lib/cms/context";
import { normalisePhone } from "@/lib/leads";
import { FieldError, TextField, primaryButtonClass, textLinkClass } from "@/components/lead/fields";
import { PlanSummary } from "@/components/payments/PlanSummary";
import { PAY_PLANS, inr, isPlanKey, planLine, todayAmount, type PayPlan, type PlanKey } from "@/lib/payments/plans";
import {
  fetchPayStatus, loadCheckoutJs, openCheckout, startPayment, verifyPayment, whatsappPayLink,
  type CustomerForm, type FieldErrors, type PayStatus, type RazorpayFailure, type RazorpayResponse, type Started,
} from "@/lib/payments/client";
import type { CheckoutOutcomeState } from "./CheckoutResult";

/**
 * /checkout/:plan  (starter, growth, starter-yearly)
 *
 * The step between "Start the plan" on /pricing and Razorpay: the plan in full
 * (today's amount, what follows, the 12-month total, how to stop it), then a
 * four-field form, then Razorpay Checkout on top of this page. Razorpay's
 * answer is checked on our server (api/razorpay/verify.js) before the success
 * page says "payment received".
 *
 *   plan -> form -> POST create-subscription | create-order -> checkout.js
 *        -> handler -> POST verify -> /checkout/:plan/success
 *        -> closed after a failed attempt -> /checkout/:plan/failed
 *
 * Until the server has Razorpay keys (api/razorpay/status), or when anything on
 * the way fails, the page offers "Pay by UPI or bank transfer on WhatsApp"
 * instead. Nothing on it breaks without the keys. noindex: a checkout is not a
 * page anyone should land on from a search.
 */

type Phase = "checking" | "on" | "off";

const EMPTY: CustomerForm = { name: "", business: "", phone: "", email: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: CustomerForm): FieldErrors {
  const e: FieldErrors = {};
  if (f.name.trim().length < 2) e.name = "Enter your name.";
  if (f.business.trim().length < 2) e.business = "Enter your business name.";
  const phone = normalisePhone(f.phone);
  if ("error" in phone) e.phone = phone.error;
  else if (phone.kind === "landline") e.phone = "Enter a mobile number, so we can reach you on WhatsApp.";
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) e.email = "Check the e-mail address, or leave it empty.";
  return e;
}

export default function Checkout() {
  const { plan: param } = useParams();
  if (!isPlanKey(param)) return <Navigate to="/pricing" replace />;
  return <CheckoutFor key={param} planKey={param} />;
}

function CheckoutFor({ planKey }: { planKey: PlanKey }) {
  const plan: PayPlan = PAY_PLANS[planKey];
  const contact = useSingleton("contact");
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("checking");
  const [status, setStatus] = useState<PayStatus | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const failure = useRef<RazorpayFailure | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof CustomerForm, HTMLInputElement | null>>>({});

  useEffect(() => {
    const ctl = new AbortController();
    fetchPayStatus(ctl.signal).then((s) => {
      if (ctl.signal.aborted) return;
      setStatus(s);
      setPhase(s.enabled && s.plans[planKey] ? "on" : "off");
    });
    return () => ctl.abort();
  }, [planKey]);

  const today = todayAmount(plan);
  const fallbackHref = whatsappPayLink(contact.whatsappNumber, planLine(plan));
  const set = (k: keyof CustomerForm) => (ev: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: ev.target.value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  /** Where a payment attempt ends: a result page, with what it needs in router state. */
  const finish = (outcome: "success" | "failed", state: CheckoutOutcomeState) =>
    navigate(`/checkout/${planKey}/${outcome}`, { state });

  async function pay(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setNotice("");
    const found = validate(form);
    setErrors(found);
    setAgreeError(agreed ? "" : "Tick the box to agree to the plan and its terms.");
    const first = (["name", "business", "phone", "email"] as const).find((k) => found[k]);
    if (first) return fieldRefs.current[first]?.focus();
    if (!agreed) return;

    const phone = normalisePhone(form.phone);
    const customer: CustomerForm = {
      name: form.name.trim(),
      business: form.business.trim(),
      phone: phone.ok ? phone.e164 : form.phone.trim(),
      email: form.email.trim(),
    };

    setBusy(true);
    const started = await startPayment(planKey, plan.kind, customer);
    if (started.ok === false) {
      setBusy(false);
      if (started.fields) setErrors(started.fields);
      if (started.fallback) setPhase("off");
      setNotice(started.error);
      return;
    }

    try {
      await loadCheckoutJs();
    } catch {
      // checkout.js blocked or offline. A subscription has Razorpay's own hosted
      // page for the same payment; an order has no such page.
      if (started.shortUrl) {
        window.location.assign(started.shortUrl);
        return;
      }
      setBusy(false);
      setNotice("Razorpay's payment window did not load. Check the connection and try again, or pay by UPI or bank transfer on WhatsApp.");
      return;
    }

    failure.current = null;
    const done = async (r: RazorpayResponse) => {
      setNotice("Payment received. Confirming it with Razorpay...");
      const v = await verifyPayment(planKey, started, r);
      finish("success", {
        verified: v.ok === true,
        paymentId: v.ok === true ? v.paymentId : r.razorpay_payment_id,
        name: customer.name,
        business: customer.business,
      });
    };
    const options: Record<string, unknown> = {
      key: started.keyId,
      name: "Ideovent Technologies",
      description: started.description,
      image: `${window.location.origin}/icons/icon-192.png`,
      prefill: { name: customer.name, email: customer.email || undefined, contact: customer.phone },
      notes: { plan: planKey, business: customer.business },
      theme: { color: "#123068" },
      handler: (r: RazorpayResponse) => void done(r),
      modal: {
        confirm_close: true,
        ondismiss: () => {
          setBusy(false);
          const f = failure.current;
          if (f) {
            finish("failed", { reason: f.error?.description || "", paymentId: f.error?.metadata?.payment_id || "" });
            return;
          }
          setNotice("Payment not completed. You can try again, or pay by UPI or bank transfer on WhatsApp.");
        },
      },
      ...(started.subscriptionId
        ? { subscription_id: started.subscriptionId }
        : { order_id: started.orderId, amount: started.amount, currency: started.currency || "INR" }),
    };
    try {
      openCheckout(options, (r) => {
        failure.current = r;
      });
    } catch {
      setBusy(false);
      setNotice("Razorpay's payment window did not open. Try again, or pay by UPI or bank transfer on WhatsApp.");
    }
  }

  const testMode = phase === "on" && status?.mode === "test";
  /* "Your plan in writing before you pay" is the promise /pricing makes (src/pages/pricing/copy.ts):
     the buy-out price and what stopping early costs are written into each plan, and are not decided
     as one public number yet ([[BUYOUT_PRICE]], [[CANCELLATION]]). So the checkout asks for the
     written plan rather than taking a setup fee against terms the buyer has not seen. */
  const collects =
    plan.kind === "subscription"
      ? `, and to Razorpay collecting ${inr(plan.monthly)} a month for ${plan.cycles - 1} more months after today's ${inr(today)}`
      : "";
  const askForPlan = whatsappPayLink(contact.whatsappNumber, planLine(plan), "Please send my plan in writing first.");

  return (
    <Layout>
      <Seo
        title={plan.title}
        description={`${planLine(plan)}. Check the plan, add your details and pay securely with Razorpay.`}
        path={`/checkout/${planKey}`}
        noindex
      />
      <section className="pb-16 pt-32 md:pb-24 md:pt-40">
        {/* Left-aligned on the site gutter like every other page (measure-gutters:
            a max-width on .container-page itself centred this column and moved
            the gutter to 176px at 1280). The width cap sits on the grid below. */}
        <div className="container-page">
          <Link to="/pricing" className={textLinkClass}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to prices
          </Link>
          <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]">
            {plan.title}
          </h1>
          {/* The intro follows the payment state: with no keys it must not send
              the buyer to a Razorpay window the page is not showing. */}
          <p className="mt-3 max-w-2xl text-[16px] leading-7 text-foreground/85">
            {phase === "off"
              ? "Check the plan, then message us on WhatsApp to pay by UPI or bank transfer. We send the payment details and your plan in writing."
              : "Check the plan, add your details, then pay on Razorpay's secure window. We message you on WhatsApp within two working days to start on your website."}
          </p>
          {testMode && (
            <p role="note" className="mt-5 max-w-5xl rounded-[8px] border border-border bg-muted px-4 py-3 text-[14px] leading-6 text-foreground">
              <strong>Test mode.</strong> Razorpay's test keys are in use, so no real money moves. Pay with Razorpay's
              test card or the UPI id success@razorpay.
            </p>
          )}

          <div className="mt-8 grid max-w-5xl items-start gap-6 lg:grid-cols-2 lg:gap-8">
            <PlanSummary plan={plan} />

            {phase === "off" ? (
              <div role="status" aria-live="polite" className="rounded-[12px] border border-border bg-card p-5 sm:p-6" data-pay-fallback="">
                <h2 className="text-[17px] font-semibold leading-6 text-foreground">Online payment is coming soon</h2>
                <p className="mt-2 text-[15px] leading-7 text-foreground/85">
                  Pay by UPI or bank transfer instead. Message us on WhatsApp and we send you the payment details. The
                  price is the same.
                </p>
                {notice && <p className="mt-3 text-[14px] leading-6 text-muted-foreground">{notice}</p>}
                <a href={fallbackHref} target="_blank" rel="noopener noreferrer" className={`${primaryButtonClass} mt-5 w-full`}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Pay by UPI or bank transfer on WhatsApp
                </a>
                {contact.phoneDisplay && (
                  <p className="mt-3 text-[13px] leading-5 text-muted-foreground">WhatsApp {contact.phoneDisplay}</p>
                )}
              </div>
            ) : (
              <form noValidate onSubmit={pay} aria-labelledby="details-title" className="rounded-[12px] border border-border bg-card p-5 sm:p-6">
                <h2 id="details-title" className="text-[17px] font-semibold leading-6 text-foreground">Your details</h2>
                <p className="mt-1 text-[14px] leading-6 text-muted-foreground">
                  Razorpay sends your receipts to these. We use them to set up your website.
                </p>
                <div className="mt-5 grid gap-4">
                  <TextField id="co-name" label="Your name" autoComplete="name" value={form.name} onChange={set("name")}
                    error={errors.name} inputRef={(el) => (fieldRefs.current.name = el)} />
                  <TextField id="co-business" label="Business name" autoComplete="organization" value={form.business}
                    onChange={set("business")} error={errors.business} inputRef={(el) => (fieldRefs.current.business = el)} />
                  <TextField id="co-phone" label="Mobile number" type="tel" inputMode="tel" autoComplete="tel"
                    hint="We message you on WhatsApp on this number." value={form.phone} onChange={set("phone")}
                    error={errors.phone} inputRef={(el) => (fieldRefs.current.phone = el)} />
                  <TextField id="co-email" label="E-mail" optional type="email" autoComplete="email"
                    hint="For Razorpay's receipts." value={form.email} onChange={set("email")}
                    error={errors.email} inputRef={(el) => (fieldRefs.current.email = el)} />
                </div>

                <p className="mt-5 rounded-[8px] border border-border px-4 py-3 text-[14px] leading-6 text-foreground/85">
                  Your plan in writing comes first: it gives the buy-out price
                  {plan.kind === "subscription" ? " and what stopping early costs" : ""}. Not had it yet?{" "}
                  <a href={askForPlan} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">
                    Ask for it on WhatsApp
                  </a>
                  ; we send it before you pay anything.
                </p>

                <div className="mt-4">
                  <label htmlFor="co-agree" className="flex items-start gap-3 text-[14px] leading-6 text-foreground">
                    <input id="co-agree" type="checkbox" checked={agreed}
                      onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setAgreeError(""); }}
                      aria-invalid={agreeError ? true : undefined} aria-describedby={agreeError ? "co-agree-error" : undefined}
                      className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
                    <span>
                      I have my plan in writing from Ideovent and agree to it, to the{" "}
                      <Link to="/terms" className="underline underline-offset-4">Terms</Link> and to the{" "}
                      <Link to="/refund" className="underline underline-offset-4">Refund and cancellation policy</Link>
                      {collects}.
                    </span>
                  </label>
                  <FieldError id="co-agree-error">{agreeError}</FieldError>
                </div>

                {notice && (
                  <p role="status" className="mt-4 rounded-[8px] bg-muted px-4 py-3 text-[14px] leading-6 text-foreground">{notice}</p>
                )}

                <button type="submit" disabled={busy || phase !== "on"} className={`${primaryButtonClass} mt-5 w-full`}>
                  {phase === "checking" ? "Checking online payment..." : busy ? "Opening Razorpay..." : `Pay ${inr(today)} with Razorpay`}
                </button>
                <p className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-muted-foreground">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Razorpay handles your card, UPI or bank details. We never see them.
                </p>
                <a href={fallbackHref} target="_blank" rel="noopener noreferrer" className={`${textLinkClass} mt-1`}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Prefer UPI or bank transfer? Message us on WhatsApp
                </a>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
