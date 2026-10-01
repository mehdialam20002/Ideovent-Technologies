/**
 * Razorpay in the browser: whether payment is on, the Checkout script, and
 * the three calls to our own server (api/razorpay/*).
 *
 * NO SECRET IS EVER HERE. The only Razorpay value the browser knows is the
 * key id (rzp_test_... / rzp_live_...), which is public by design. The key
 * secret and the webhook secret live in the Vercel server environment only.
 *
 * TWO SWITCHES, ON PURPOSE
 * - PAY_BUTTONS_ON, baked in at build time from VITE_RAZORPAY_KEY_ID, decides
 *   what /pricing shows. Only a LIVE key id turns the public pay buttons on;
 *   with no key, or a test key, the buttons read "Pay by UPI or bank transfer
 *   on WhatsApp". So while Mehdi tests with test keys, visitors never meet a
 *   test-mode checkout.
 * - fetchPayStatus() asks the server at run time. The checkout page trusts
 *   only this: it shows a pay button when the server has keys (test or live;
 *   test mode is labelled), and the WhatsApp fallback otherwise. Vite's dev
 *   server does not serve /api, so locally this reads "off", which is right.
 *
 * checkout.js loads only when somebody presses Pay, never with the page, so
 * the pricing page costs nothing extra to load.
 */
import type { PlanKey } from "./plans";

const KEY_ID = String(import.meta.env.VITE_RAZORPAY_KEY_ID || "").trim();

export const PAY_BUTTONS_ON = /^rzp_live_[A-Za-z0-9]{6,40}$/.test(KEY_ID);

export const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

export interface PayStatus {
  enabled: boolean;
  mode?: "test" | "live";
  keyId?: string;
  plans: Partial<Record<PlanKey, boolean>>;
  /** RAZORPAY_WEBHOOK_SECRET is set on the server (yes/no only). */
  webhook?: boolean;
}

export async function fetchPayStatus(signal?: AbortSignal): Promise<PayStatus> {
  try {
    const res = await fetch("/api/razorpay/status", { cache: "no-store", signal });
    const type = res.headers.get("content-type") || "";
    // The SPA fallback answers any unknown path with index.html: that is "off", not an error.
    if (!res.ok || !type.includes("application/json")) return { enabled: false, plans: {} };
    const s = await res.json();
    if (!s || typeof s !== "object") return { enabled: false, plans: {} };
    const webhook = s.webhook === true;
    return s.enabled === true
      ? { enabled: true, mode: s.mode === "live" ? "live" : "test", keyId: String(s.keyId || ""), plans: s.plans || {}, webhook }
      : { enabled: false, plans: {}, webhook };
  } catch {
    return { enabled: false, plans: {} };
  }
}

/* ─────────────────────────────── Checkout script ─────────────────────────────── */

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_signature: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
}

export interface RazorpayFailure {
  error?: { code?: string; description?: string; reason?: string; metadata?: { payment_id?: string } };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

/** Loads checkout.js once. Rejects (and can be retried) when it cannot load. */
export function loadCheckoutJs(timeoutMs = 15000): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CHECKOUT_JS;
      s.async = true;
      const timer = window.setTimeout(() => done(new Error("checkout.js timed out")), timeoutMs);
      function done(err?: Error) {
        window.clearTimeout(timer);
        if (!err && window.Razorpay) return resolve();
        loading = null;
        s.remove();
        reject(err || new Error("checkout.js loaded without Razorpay"));
      }
      s.onload = () => done();
      s.onerror = () => done(new Error("checkout.js did not load"));
      document.head.appendChild(s);
    });
  }
  return loading;
}

export function openCheckout(options: Record<string, unknown>, onFailed: (r: RazorpayFailure) => void) {
  const Ctor = window.Razorpay;
  if (!Ctor) throw new Error("Razorpay is not loaded");
  const rzp = new Ctor(options);
  rzp.on("payment.failed", onFailed);
  rzp.open();
}

/* ─────────────────────────────── Our server ─────────────────────────────── */

export interface CustomerForm {
  name: string;
  business: string;
  phone: string;
  email: string;
}

export type FieldErrors = Partial<Record<keyof CustomerForm, string>>;

/** What create-subscription / create-order answer. */
export interface Started {
  ok: true;
  plan: PlanKey;
  mode: "test" | "live";
  keyId: string;
  description: string;
  subscriptionId?: string;
  shortUrl?: string | null;
  orderId?: string;
  amount?: number;
  currency?: string;
}

export interface Refused {
  ok: false;
  error: string;
  /** Payment is off (503) or Razorpay failed: show the WhatsApp fallback. */
  fallback?: boolean;
  fields?: FieldErrors;
}

async function post<T>(path: string, body: unknown): Promise<T | Refused> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const type = res.headers.get("content-type") || "";
    if (!type.includes("application/json")) {
      return { ok: false, fallback: true, error: "Online payment is not available right now." };
    }
    const data = await res.json();
    if (res.ok && data && data.ok === true) return data as T;
    return {
      ok: false,
      fallback: Boolean(data?.fallback) || res.status >= 500,
      error: String(data?.error || "Something went wrong."),
      fields: data?.fields,
    };
  } catch {
    return { ok: false, fallback: true, error: "We could not reach our server. Check the connection and try again." };
  }
}

/** Creates the subscription (monthly plans) or the order (yearly) on our server. */
export function startPayment(plan: PlanKey, kind: "subscription" | "order", form: CustomerForm) {
  const path = kind === "subscription" ? "/api/razorpay/create-subscription" : "/api/razorpay/create-order";
  return post<Started>(path, { plan, ...form });
}

export interface Verified {
  ok: true;
  plan: PlanKey;
  paymentId: string;
  status: string;
}

/** Sends Checkout's success response, with OUR subscription or order id, to be checked on the server. */
export function verifyPayment(plan: PlanKey, started: Started, r: RazorpayResponse) {
  return post<Verified>("/api/razorpay/verify", {
    plan,
    subscriptionId: started.subscriptionId,
    orderId: started.orderId,
    razorpay_payment_id: r.razorpay_payment_id,
    razorpay_signature: r.razorpay_signature,
  });
}

/* ─────────────────────────────── The fallback ─────────────────────────────── */

/**
 * "Pay by UPI or bank transfer on WhatsApp": a chat with Ideovent, typed and
 * ready, naming the plan and its price the way the page showed it.
 * `whatsappNumber` is the contact singleton's (digits, with the country code).
 */
export function whatsappPayLink(whatsappNumber: string, planLine: string, extra?: string): string {
  const digits = (whatsappNumber || "").replace(/\D/g, "");
  if (!digits) return "/contact";
  const text = [`Hello Ideovent, I want the ${planLine}.`, "How do I pay by UPI or bank transfer?", extra || ""]
    .filter(Boolean)
    .join(" ");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
