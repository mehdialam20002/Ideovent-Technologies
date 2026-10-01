/**
 * Turning the webhook's event rows into the two lists Mehdi reads in
 * /admin/payments: one line per subscription, one line per payment.
 *
 * Razorpay sends each event at least once and not always in order, so the
 * newest state is taken by Razorpay's own event time (event_at), not by when
 * the row arrived, and a subscription's paid count is the highest one seen.
 * Pure functions, no SDK: scripts/test-razorpay-fn.mjs tests them directly.
 */
import type { PaymentEventRow } from "./admin";

const when = (r: PaymentEventRow) => r.event_at || r.received_at || "";

/* Razorpay stamps events in whole seconds, and one sign-up sends
   subscription.authenticated, .activated and .charged within the same second.
   On a tie, the later step of a subscription's life counts as newer (so a
   running plan reads "active", not "authenticated"), then the later arrival. */
const STEP: Record<string, number> = {
  "subscription.authenticated": 1,
  "subscription.activated": 2,
  "subscription.charged": 3,
  "subscription.updated": 3,
  "subscription.pending": 4,
  "subscription.halted": 5,
  "subscription.paused": 5,
  "subscription.resumed": 6,
  "subscription.cancelled": 7,
  "subscription.completed": 7,
};
const newestFirst = (a: PaymentEventRow, b: PaymentEventRow) =>
  when(b).localeCompare(when(a))
  || (STEP[b.event] || 0) - (STEP[a.event] || 0)
  || (b.received_at || "").localeCompare(a.received_at || "");

type Pick = "plan_key" | "business" | "customer_name" | "customer_phone" | "customer_email" | "total_count";

/** The first non-empty value of a field, newest event first. */
function firstOf(sorted: PaymentEventRow[], k: Pick) {
  for (const r of sorted) {
    const v = r[k];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

export interface SubscriptionView {
  id: string;
  status: string | null;
  plan: string | null;
  business: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  paid: number | null;
  total: number | null;
  lastEvent: string;
  lastAt: string;
  mode: "test" | "live" | null;
}

export function subscriptionsOf(rows: PaymentEventRow[]): SubscriptionView[] {
  const by = new Map<string, PaymentEventRow[]>();
  for (const r of rows) if (r.subscription_id) by.set(r.subscription_id, [...(by.get(r.subscription_id) || []), r]);
  return [...by.entries()]
    .map(([id, list]) => {
      const sorted = [...list].sort(newestFirst);
      const latest = sorted.find((r) => r.subscription_status) || sorted[0];
      const paid = Math.max(-1, ...list.map((r) => (typeof r.paid_count === "number" ? r.paid_count : -1)));
      return {
        id,
        status: latest.subscription_status,
        plan: firstOf(sorted, "plan_key") as string | null,
        business: firstOf(sorted, "business") as string | null,
        name: firstOf(sorted, "customer_name") as string | null,
        phone: firstOf(sorted, "customer_phone") as string | null,
        email: firstOf(sorted, "customer_email") as string | null,
        paid: paid >= 0 ? paid : null,
        total: firstOf(sorted, "total_count") as number | null,
        lastEvent: sorted[0].event,
        lastAt: when(sorted[0]),
        mode: sorted[0].mode,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export interface PaymentView {
  id: string;
  status: string | null;
  amount: number | null;
  currency: string | null;
  method: string | null;
  at: string;
  plan: string | null;
  business: string | null;
  name: string | null;
  phone: string | null;
  subscriptionId: string | null;
  orderId: string | null;
  linkId: string | null;
  error: string | null;
  mode: "test" | "live" | null;
}

export function paymentsOf(rows: PaymentEventRow[]): PaymentView[] {
  const by = new Map<string, PaymentEventRow[]>();
  for (const r of rows) if (r.payment_id) by.set(r.payment_id, [...(by.get(r.payment_id) || []), r]);
  return [...by.entries()]
    .map(([id, list]) => {
      const sorted = [...list].sort(newestFirst);
      const latest = sorted.find((r) => r.payment_status) || sorted[0];
      const pick = <K extends keyof PaymentEventRow>(k: K) => sorted.find((r) => r[k] !== null && r[k] !== "")?.[k] ?? null;
      return {
        id,
        status: latest.payment_status,
        amount: pick("amount") as number | null,
        currency: pick("currency") as string | null,
        method: pick("method") as string | null,
        at: when(sorted[0]),
        plan: pick("plan_key") as string | null,
        business: pick("business") as string | null,
        name: pick("customer_name") as string | null,
        phone: pick("customer_phone") as string | null,
        subscriptionId: pick("subscription_id") as string | null,
        orderId: pick("order_id") as string | null,
        linkId: pick("payment_link_id") as string | null,
        error: latest.payment_status === "failed" ? (pick("error_description") as string | null) : null,
        mode: sorted[0].mode,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** "₹3,898" from paise; "USD 149.00" from cents. */
export function money(amount: number | null, currency: string | null): string {
  if (typeof amount !== "number") return "";
  if (!currency || currency === "INR") return `₹${new Intl.NumberFormat("en-IN").format(amount / 100)}`;
  return `${currency} ${(amount / 100).toFixed(2)}`;
}
