/**
 * POST /api/razorpay/create-order
 *
 * The one-time path: a single payment for a fixed price the site shows.
 * Today that is the Starter plan paid for 12 months upfront (Rs 8,999 + the
 * Rs 2,999 one-time setup; see PLANS in api/_lib/razorpay.js). Nothing renews.
 *
 *   in   { plan: "starter-yearly", name, business, phone, email? }
 *   out  { ok: true, plan, mode, keyId, orderId, amount, currency, description }
 *
 * The one-time PACKAGES (websites from Rs 8,000, portals, software) are quoted
 * per project and paid in stages, so they are not sold from a button: Mehdi
 * sends a Razorpay Payment Link for each invoice (GO-LIVE-IDEOVENT-IN.md 10.8),
 * and the webhook records it here all the same. The site never lets a visitor
 * type an amount.
 */
import {
  PLANS, amountToday, apiError, clip, describe, disabled, fail, json, notesFor,
  readConfig, readCustomer, readJson, rzp, sameOrigin,
} from "../_lib/razorpay.js";

export async function POST(request) {
  const cfg = readConfig();
  if (!cfg) return disabled();
  if (!sameOrigin(request)) return json(403, { ok: false, error: "Start the payment from www.ideovent.in." });

  const input = await readJson(request);
  if (!input) return json(400, { ok: false, error: "Send the form as JSON." });

  const key = clip(input.plan, 30);
  const plan = PLANS[key];
  if (!plan || plan.kind !== "order") return json(400, { ok: false, error: "Unknown plan." });

  const customer = readCustomer(input);
  if (customer.errors) return json(400, { ok: false, error: "Check the form.", fields: customer.errors });

  try {
    const amount = amountToday(key);
    const order = await rzp(cfg, "/orders", {
      amount,
      currency: "INR",
      // At most 40 characters. Unique enough to find in the Dashboard.
      receipt: `idv-${key}-${Date.now().toString(36)}`.slice(0, 40),
      notes: notesFor(key, customer.value),
    });
    if (!order || typeof order.id !== "string" || !order.id.startsWith("order_")) throw fail(502, "Razorpay did not return an order.");
    return json(200, {
      ok: true,
      plan: key,
      mode: cfg.mode,
      keyId: cfg.keyId,
      orderId: order.id,
      amount,
      currency: "INR",
      description: describe(key),
    });
  } catch (e) {
    return apiError("create-order", e);
  }
}
