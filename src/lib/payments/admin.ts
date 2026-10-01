/**
 * /admin/payments: reading public.payment_events (migration 0010) as the
 * signed-in admin, and connecting the webhook to the database.
 *
 * Every call runs with the admin's own Supabase session, and RLS in 0010 is
 * the whole access check: only public.is_admin() can read a row, and nobody
 * can write one (rows arrive only from the signed Razorpay webhook).
 *
 * NO SECRET PASSES THROUGH THIS PAGE. "Connect" asks our server
 * (api/razorpay/connect.js) to store a one-way fingerprint of the webhook
 * secret in Supabase; the server computes it from its own environment. The
 * browser sends only the admin's session and gets back yes/no and a time.
 *
 * Imports the Supabase SDK, so only the lazy admin page imports this module.
 */
import { supabase } from "@/lib/cms/client";
import { supabaseEnabled } from "@/lib/cms/config";

export interface PaymentEventRow {
  event_id: string;
  event: string;
  mode: "test" | "live" | null;
  subscription_id: string | null;
  subscription_status: string | null;
  plan_id: string | null;
  paid_count: number | null;
  total_count: number | null;
  remaining_count: number | null;
  payment_id: string | null;
  payment_status: string | null;
  method: string | null;
  amount: number | null;
  currency: string | null;
  error_description: string | null;
  order_id: string | null;
  invoice_id: string | null;
  payment_link_id: string | null;
  plan_key: string | null;
  business: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  event_at: string | null;
  received_at: string;
}

const TABLE = "payment_events";
const COLS =
  "event_id,event,mode,subscription_id,subscription_status,plan_id,paid_count,total_count,remaining_count," +
  "payment_id,payment_status,method,amount,currency,error_description,order_id,invoice_id,payment_link_id," +
  "plan_key,business,customer_name,customer_phone,customer_email,event_at,received_at";

export type Loaded =
  | { kind: "local" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ok"; rows: PaymentEventRow[] };

/** PostgREST's "no such table / function": 0010 has not been run yet. */
const isMissing = (e: { code?: string; message?: string } | null) =>
  !!e && (/PGRST20[25]|42P01|42883/.test(e.code || "") || /could not find|does not exist/i.test(e.message || ""));

export async function loadPaymentEvents(limit = 500): Promise<Loaded> {
  if (!supabaseEnabled) return { kind: "local" };
  const { data, error } = await supabase().from(TABLE).select(COLS).order("received_at", { ascending: false }).limit(limit);
  if (error) return isMissing(error) ? { kind: "missing" } : { kind: "error", message: error.message };
  return { kind: "ok", rows: (data || []) as unknown as PaymentEventRow[] };
}

/* ─────────────────────────────── The webhook's link to the database ─────────────────────────────── */

export type Connection =
  /** Our server's answer. `current` is false once the webhook secret in Vercel changed after connecting. */
  | { kind: "ok"; webhookSecret: boolean; connected: boolean; current: boolean; connectedAt: string | null }
  /** 0010 has not been run. */
  | { kind: "missing" }
  /** No /api here (the Vite dev server), or the server refused: `message` says why. */
  | { kind: "error"; message: string };

/**
 * The admin's session token for our own /api. LOCAL MODE has no Supabase
 * session: in the dev server a stand-in is sent, so a test can answer the
 * call with a mocked route (the real function refuses it with 401, which is
 * the truth), as src/lib/ai/posterClient.ts does.
 */
async function sessionToken(): Promise<string | null> {
  if (!supabaseEnabled) return import.meta.env.DEV ? "local-dev" : null;
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

async function connectCall(method: "GET" | "POST"): Promise<Connection> {
  const token = await sessionToken();
  if (!token) return { kind: "error", message: "You are signed out. Sign in again." };
  try {
    const res = await fetch("/api/razorpay/connect", {
      method,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
    if (!(res.headers.get("content-type") || "").includes("application/json")) {
      return { kind: "error", message: "The payment functions are not running here (they run on Vercel, not in the local dev server)." };
    }
    const d = await res.json();
    if (d && d.missing) return { kind: "missing" };
    if (!res.ok || !d || d.ok !== true) return { kind: "error", message: String(d?.error || `HTTP ${res.status}`) };
    return {
      kind: "ok",
      webhookSecret: d.webhookSecret === true,
      connected: d.connected === true,
      current: d.current === true,
      connectedAt: typeof d.connectedAt === "string" ? d.connectedAt : null,
    };
  } catch {
    return { kind: "error", message: "Could not reach the server. Check the connection and refresh." };
  }
}

/** Is the webhook connected to the database, and to today's webhook secret? */
export const loadConnection = () => connectCall("GET");

/** "Connect": the server stores the fingerprint of its webhook secret. Safe to press again. */
export const connectWebhook = () => connectCall("POST");

/** Clears the rows Razorpay's TEST mode produced. Live rows are never touched. */
export async function deleteTestEvents(): Promise<number> {
  const { data, error } = await supabase().from(TABLE).delete().eq("mode", "test").select("event_id");
  if (error) throw new Error(error.message);
  return (data || []).length;
}
