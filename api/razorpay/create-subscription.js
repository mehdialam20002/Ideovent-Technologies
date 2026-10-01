/**
 * POST /api/razorpay/create-subscription
 *
 * Starts a monthly website plan (Starter or Growth) for the customer on the
 * checkout page, and hands back what Razorpay Checkout needs to take the
 * first payment.
 *
 *   in   { plan: "starter" | "growth", name, business, phone, email? }
 *   out  { ok: true, plan, mode, keyId, subscriptionId, shortUrl, amountToday, description }
 *
 * WHAT RAZORPAY IS ASKED FOR
 *   plan_id      from RAZORPAY_PLAN_STARTER_MONTHLY / RAZORPAY_PLAN_GROWTH_MONTHLY,
 *                checked against the price the site shows before anything is created
 *   total_count  12: twelve monthly charges, the first one today
 *   addons       the Rs 2,999 one-time setup fee, charged with the first month
 *   expire_by    24 hours: an abandoned checkout dies instead of lingering
 *   notify       Razorpay e-mails and texts the customer about every charge
 *   notes        plan, business name, name, phone, e-mail: they come back on
 *                every webhook, so /admin/payments can say whose payment it is
 *
 * The browser never sends an amount. The customer's details go to Razorpay
 * and nowhere else from here; they reach our database only through Razorpay's
 * signed webhook (api/razorpay/webhook.js).
 */
import {
  PLANS, amountToday, apiError, checkPlan, clip, describe, disabled, fail, json, notesFor,
  planIdFor, readConfig, readCustomer, readJson, rzp, sameOrigin,
} from "../_lib/razorpay.js";

export async function POST(request) {
  const cfg = readConfig();
  if (!cfg) return disabled();
  if (!sameOrigin(request)) return json(403, { ok: false, error: "Start the payment from www.ideovent.in." });

  const input = await readJson(request);
  if (!input) return json(400, { ok: false, error: "Send the form as JSON." });

  const key = clip(input.plan, 30);
  const plan = PLANS[key];
  if (!plan || plan.kind !== "subscription") return json(400, { ok: false, error: "Unknown plan." });

  const planId = planIdFor(key);
  if (!planId) return disabled("Online payment is not available for this plan yet.");

  const customer = readCustomer(input);
  if (customer.errors) return json(400, { ok: false, error: "Check the form.", fields: customer.errors });

  try {
    await checkPlan(cfg, key, planId);
    const sub = await rzp(cfg, "/subscriptions", {
      plan_id: planId,
      total_count: plan.cycles,
      quantity: 1,
      customer_notify: true,
      expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      addons: [{ item: { name: "One-time setup fee", amount: plan.setup, currency: "INR" } }],
      notes: notesFor(key, customer.value),
    });
    if (!sub || typeof sub.id !== "string" || !sub.id.startsWith("sub_")) throw fail(502, "Razorpay did not return a subscription.");
    return json(200, {
      ok: true,
      plan: key,
      mode: cfg.mode,
      keyId: cfg.keyId,
      subscriptionId: sub.id,
      shortUrl: typeof sub.short_url === "string" ? sub.short_url : null,
      amountToday: amountToday(key),
      description: describe(key),
    });
  } catch (e) {
    return apiError("create-subscription", e);
  }
}
