/**
 * POST /api/razorpay/verify
 *
 * Checkout calls its success handler in the browser, and anything in a browser
 * can be typed by hand. So before the page says "payment received", the server
 * checks Razorpay's signature with the KEY SECRET, then asks Razorpay itself
 * what was paid for.
 *
 *   subscription  in { plan, subscriptionId, razorpay_payment_id, razorpay_signature }
 *                 signed string: payment_id + "|" + subscription_id
 *                 then GET /subscriptions/:id: its plan_id must be the plan
 *                 the customer chose, and it must be created, authenticated
 *                 or active (it reads "created" for a moment after the first
 *                 charge, before Razorpay flips it to active)
 *   order         in { plan, orderId, razorpay_payment_id, razorpay_signature }
 *                 signed string: order_id + "|" + payment_id
 *                 then GET /payments/:id: same order, the full amount,
 *                 authorized or captured
 *
 *   out  { ok: true, plan, paymentId, status } or { ok: false, error }
 *
 * The subscription and order ids come from OUR create call (the page kept
 * them), not from Checkout's response, as Razorpay's docs require. This check
 * only decides what the customer's screen says. Nothing is switched on from
 * it: the signed webhook is the record (api/razorpay/webhook.js).
 */
import {
  PLANS, amountToday, apiError, clip, disabled, json, orderSignatureOk, planIdFor, readConfig,
  readJson, rzp, sameOrigin, subscriptionSignatureOk,
} from "../_lib/razorpay.js";

const ID_RE = /^[A-Za-z0-9_]{6,60}$/;
const SIG_RE = /^[a-f0-9]{64}$/i;
const LIVE_SUB = ["created", "authenticated", "active"];
const PAID = ["authorized", "captured"];

export async function POST(request) {
  const cfg = readConfig();
  if (!cfg) return disabled();
  if (!sameOrigin(request)) return json(403, { ok: false, error: "Verify from www.ideovent.in." });

  const input = await readJson(request);
  if (!input) return json(400, { ok: false, error: "Send the payment response as JSON." });

  const key = clip(input.plan, 30);
  const plan = PLANS[key];
  const paymentId = clip(input.razorpay_payment_id, 60);
  const signature = clip(input.razorpay_signature, 128);
  if (!plan || !ID_RE.test(paymentId) || !SIG_RE.test(signature)) {
    return json(400, { ok: false, error: "The payment response is incomplete." });
  }

  try {
    if (plan.kind === "subscription") {
      const subscriptionId = clip(input.subscriptionId, 60);
      if (!ID_RE.test(subscriptionId)) return json(400, { ok: false, error: "The payment response is incomplete." });
      if (!subscriptionSignatureOk(paymentId, subscriptionId, signature, cfg.keySecret)) {
        return json(400, { ok: false, error: "This payment could not be confirmed." });
      }
      const sub = await rzp(cfg, `/subscriptions/${encodeURIComponent(subscriptionId)}`);
      const ok = sub.plan_id === planIdFor(key) && LIVE_SUB.includes(sub.status);
      if (!ok) console.error(`razorpay verify: subscription ${subscriptionId} is ${sub.status} on ${sub.plan_id}, not the ${key} plan`);
      return json(ok ? 200 : 400, ok
        ? { ok: true, plan: key, paymentId, status: sub.status }
        : { ok: false, error: "This payment could not be confirmed." });
    }

    const orderId = clip(input.orderId, 60);
    if (!ID_RE.test(orderId)) return json(400, { ok: false, error: "The payment response is incomplete." });
    if (!orderSignatureOk(orderId, paymentId, signature, cfg.keySecret)) {
      return json(400, { ok: false, error: "This payment could not be confirmed." });
    }
    // The order reads "paid" only after capture; the payment itself says it sooner.
    const pay = await rzp(cfg, `/payments/${encodeURIComponent(paymentId)}`);
    const ok = pay.order_id === orderId && pay.amount === amountToday(key) && pay.currency === "INR" && PAID.includes(pay.status);
    if (!ok) console.error(`razorpay verify: payment ${paymentId} is ${pay.status}, ${pay.currency} ${pay.amount} on ${pay.order_id}, not ${key}`);
    return json(ok ? 200 : 400, ok
      ? { ok: true, plan: key, paymentId, status: pay.status }
      : { ok: false, error: "This payment could not be confirmed." });
  } catch (e) {
    return apiError("verify", e);
  }
}
