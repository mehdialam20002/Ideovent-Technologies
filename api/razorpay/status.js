/**
 * GET /api/razorpay/status
 *
 * Whether online payment is on, and for which plans. The checkout page asks
 * this before it shows a pay button, and the admin's Payments screen shows it
 * to Mehdi. It answers with booleans, the mode and the PUBLIC key id only:
 * never a secret, never a plan id.
 *
 *   { enabled: true, mode: "test" | "live", keyId: "rzp_...",
 *     plans: { starter: true, growth: true, "starter-yearly": true },
 *     webhook: true }
 *
 * With no keys: { enabled: false, plans: { ...all false }, webhook: false }.
 */
import { PLANS, json, planIdFor, readConfig, webhookSecret } from "../_lib/razorpay.js";

export function GET() {
  const cfg = readConfig();
  const plans = {};
  for (const [key, p] of Object.entries(PLANS)) {
    plans[key] = Boolean(cfg) && (p.kind === "order" || Boolean(planIdFor(key)));
  }
  const webhook = Boolean(webhookSecret());
  return json(200, cfg ? { enabled: true, mode: cfg.mode, keyId: cfg.keyId, plans, webhook } : { enabled: false, plans, webhook });
}
