/**
 * GET  /api/razorpay/connect   is the webhook connected to the database?
 * POST /api/razorpay/connect   connect it: once, and again after a new webhook secret
 *
 * The "Connect" button in /admin/payments. Admin only: the page sends the
 * admin's own Supabase session (Authorization: Bearer), as /api/poster does,
 * and every database call here runs AS THAT ADMIN, so is_admin() in migration
 * 0010 decides. There is no service_role key (api/_lib/supabaseRest.js).
 *
 * WHAT "CONNECT" STORES
 * The SHA-256 of the webhook's ingest token, which is derived from
 * RAZORPAY_WEBHOOK_SECRET (ingestToken in api/_lib/razorpay.js). With it the
 * database can recognise our webhook, and it can sign nothing and reveal
 * nothing. The secret and the token never leave this function: not to the
 * browser, not to Supabase, not to a log. The answers carry yes/no and a time.
 *
 *   GET   { ok: true, webhookSecret, connected, current, connectedAt }
 *           webhookSecret  RAZORPAY_WEBHOOK_SECRET is set in Vercel
 *           connected      a fingerprint is stored
 *           current        it is this secret's (false after a new secret: connect again)
 *   POST  { ok: true, webhookSecret: true, connected: true, current: true, connectedAt }
 *
 *   401 no or expired session, 403 not an admin (or another site's page),
 *   409 { missing: true } when 0010 has not been run, 503 no webhook secret
 *   (POST) or no Supabase settings on the server, 502 Supabase unreachable.
 */
import { ingestHash, json, sameOrigin, webhookSecret } from "../_lib/razorpay.js";
import { getUser, isAdmin, paymentIngestStatus, setPaymentIngest, supabaseEnv } from "../_lib/supabaseRest.js";

const MISSING = "The payments table does not exist yet. Run supabase/migrations/0010_payments.sql in Supabase first.";

/** { env, token } for a signed-in admin, or { res } with the refusal to send. */
async function asAdmin(request) {
  const env = supabaseEnv();
  if (!env) return { res: json(503, { ok: false, error: "Supabase is not configured on the server." }) };
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token) return { res: json(401, { ok: false, error: "Sign in again." }) };
  let user;
  try {
    user = await getUser(env, token);
  } catch {
    return { res: json(502, { ok: false, error: "Could not reach Supabase to check the sign-in." }) };
  }
  if (!user) return { res: json(401, { ok: false, error: "Sign in again." }) };
  if (!(await isAdmin(env, token).catch(() => false))) return { res: json(403, { ok: false, error: "This account is not an admin." }) };
  return { env, token };
}

function failed(where, e) {
  if (e && e.missing) return json(409, { ok: false, missing: true, error: MISSING });
  console.error(`razorpay connect ${where}:`, e && e.message ? e.message : e);
  return json(502, { ok: false, error: "Supabase did not answer as expected. Try again in a minute." });
}

export async function GET(request) {
  const a = await asAdmin(request);
  if (a.res) return a.res;
  const secret = webhookSecret();
  try {
    const s = await paymentIngestStatus(a.env, a.token, secret ? ingestHash(secret) : null);
    return json(200, { ok: true, webhookSecret: Boolean(secret), ...s });
  } catch (e) {
    return failed("status", e);
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return json(403, { ok: false, error: "Connect from www.ideovent.in/admin/payments." });
  const a = await asAdmin(request);
  if (a.res) return a.res;
  const secret = webhookSecret();
  if (!secret) {
    return json(503, { ok: false, webhookSecret: false, error: "RAZORPAY_WEBHOOK_SECRET is not set in Vercel yet. Add it, redeploy, then connect." });
  }
  try {
    const connectedAt = await setPaymentIngest(a.env, a.token, ingestHash(secret));
    console.log("razorpay connect: webhook fingerprint stored");
    return json(200, { ok: true, webhookSecret: true, connected: true, current: true, connectedAt });
  } catch (e) {
    return failed("store", e);
  }
}
