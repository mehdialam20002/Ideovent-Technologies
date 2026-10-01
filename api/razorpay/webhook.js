/**
 * POST /api/razorpay/webhook
 *
 * Razorpay tells us here about every subscription and payment event:
 * sign-ups, monthly charges, failed charges, cancellations (including a
 * customer stopping the mandate from their UPI app or bank), one-time orders
 * and paid Payment Links. Each verified event becomes one row in
 * public.payment_events (migration 0010), which /admin/payments lists.
 *
 * Set up in the Razorpay Dashboard (GO-LIVE-IDEOVENT-IN.md section 10):
 *   URL      https://www.ideovent.in/api/razorpay/webhook
 *   secret   the same value as RAZORPAY_WEBHOOK_SECRET in Vercel. It is kept
 *            in those two places only: never in Supabase, never in a browser.
 *
 * THE CHECKS, IN ORDER
 * 1. The signature. X-Razorpay-Signature is the HMAC-SHA256 of the RAW body
 *    with the webhook secret. The body is hashed as it arrived, byte for byte,
 *    before it is parsed: re-serialising JSON changes bytes and breaks it.
 *    A bad or missing signature is 400 and nothing is written.
 * 2. The database stores the event once, and only for a caller that shows
 *    the webhook's ingest token, derived from the secret (ingestToken in
 *    api/_lib/razorpay.js; the database holds only its SHA-256, stored by
 *    "Connect" in /admin/payments). Razorpay delivers at least once, so a
 *    repeat of the same event id, or of the same signed body under another
 *    id, is answered 200 and not stored twice.
 *
 * ANSWERS
 *   200  recorded, or a duplicate of one already recorded
 *   400  bad signature or not JSON: Razorpay never sends those, a forger does
 *   503  RAZORPAY_WEBHOOK_SECRET is not set: nothing can be verified
 *   500  verified but not stored (Supabase down, 0010 not run, "Connect" not
 *        pressed in /admin/payments, or pressed before the webhook secret
 *        changed): Razorpay retries for 24 hours, then disables the webhook
 *        and e-mails its alert address. Nothing is lost in the meantime:
 *        every event is also in the Razorpay Dashboard.
 *
 * Logs carry the event name and ids only: no names, phones, e-mails or bodies.
 */
import { createHash } from "node:crypto";
import { clip, ingestToken, json, readConfig, webhookSecret, webhookSignatureOk } from "../_lib/razorpay.js";
import { recordPaymentEvent, supabaseEnv } from "../_lib/supabaseRest.js";

/** Razorpay's payloads are a few KB. Anything near this is not from Razorpay. */
const MAX_BODY = 256 * 1024;

export async function POST(request) {
  const secret = webhookSecret();
  if (!secret) return json(503, { ok: false, error: "webhook not configured" });

  const bytes = Buffer.from(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BODY) return json(400, { ok: false, error: "bad body" });

  const signature = clip(request.headers.get("x-razorpay-signature"), 128);
  if (!signature || !webhookSignatureOk(bytes, signature, secret)) {
    return json(400, { ok: false, error: "bad signature" });
  }

  const raw = bytes.toString("utf8");
  let evt;
  try {
    evt = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "not JSON" });
  }
  const event = clip(evt && evt.event, 60) || "unknown";

  // Razorpay's own id for the event. The body hash stands in if a proxy ever drops the header.
  const eventId = clip(request.headers.get("x-razorpay-event-id"), 100) || "sha256:" + createHash("sha256").update(bytes).digest("hex");
  const cfg = readConfig();
  const mode = cfg ? cfg.mode : null;

  const env = supabaseEnv();
  if (!env) {
    console.error(`razorpay webhook: ${event} ${eventId} verified but NOT recorded: no Supabase URL or anon key on the server`);
    return json(500, { ok: false, error: "not recorded" });
  }
  try {
    const result = await recordPaymentEvent(env, { token: ingestToken(secret), eventId, body: raw, mode });
    console.log(`razorpay webhook: ${event} ${eventId} ${result}`);
    return json(200, { ok: true, result });
  } catch (e) {
    // The message names the cause ("not connected yet", "does not match": press
    // Connect in /admin/payments). It never carries the token or the body.
    console.error(`razorpay webhook: ${event} ${eventId} verified but NOT recorded:`, e && e.message ? e.message : e);
    return json(500, { ok: false, error: "not recorded" });
  }
}
