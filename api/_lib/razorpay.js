/**
 * Razorpay for www.ideovent.in: the server half, shared by api/razorpay/*.js.
 *
 * WHAT LIVES HERE
 * The price of every plan the site can charge (the browser names a plan, never
 * an amount), the Razorpay API call with Basic auth, the three signature checks,
 * and the form checks. No npm package: the whole integration is a few HTTPS
 * calls and node:crypto.
 *
 * SECRETS
 * RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are read in this file and
 * nowhere else, from the Vercel SERVER environment. They never get a VITE_ name
 * (Vite prints every VITE_ variable into the public bundle), never go into a
 * response and never go into a log line. Supabase never holds either of them:
 * it holds a one-way fingerprint that lets it recognise our webhook (see "The
 * database link" below). The key id (rzp_test_... or rzp_live_...) is public
 * by design: Razorpay Checkout needs it in the browser.
 *
 * WITHOUT THE ENV VARS nothing breaks: readConfig() returns null, every
 * endpoint answers 503 { enabled: false, fallback: true }, and the site shows
 * "Pay by UPI or bank transfer on WhatsApp" instead of a pay button.
 *
 * Setup for Mehdi: section 10 of 07-website/GO-LIVE-IDEOVENT-IN.md.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const API = "https://api.razorpay.com/v1";

/** Rupees to paise. Razorpay takes every amount in the smallest unit. */
const paise = (rupees) => Math.round(rupees * 100);

/**
 * THE PRICES, as Mehdi decided them on 1 Oct 2026. Changing a number here
 * changes what a customer is charged, so it changes in the same pass as the
 * pricing page. src/lib/pricing.ts prints the same numbers on the site (the
 * checkout reads it too), and scripts/test-razorpay-fn.mjs fails when the two
 * disagree.
 *
 * Monthly plans are Razorpay Subscriptions: a Plan created once in the
 * Razorpay Dashboard (its id goes in RAZORPAY_PLAN_*_MONTHLY), 12 charges, and
 * the one-time setup fee as an upfront add-on on the first charge. So day 1 is
 * setup + first month, then 11 more monthly charges.
 *
 * Starter yearly is one Razorpay Order. YEARLY INCLUDES SETUP: Rs 8,999 for
 * the 12 months plus the Rs 2,999 one-time setup, Rs 11,998 in all. "Two months
 * free" compares the yearly fee with 12 monthly fees (12 x 899 = 10,788); the
 * setup fee is the same either way. If Mehdi decides the yearly price already
 * covers setup, set `setup: 0` on starter-yearly here and `setupApplies: false`
 * in src/lib/pricing.ts.
 */
export const SETUP_FEE = paise(2999);

export const PLANS = {
  starter: {
    kind: "subscription",
    label: "Starter website plan",
    planEnv: "RAZORPAY_PLAN_STARTER_MONTHLY",
    monthly: paise(899),
    setup: SETUP_FEE,
    cycles: 12,
  },
  growth: {
    kind: "subscription",
    label: "Growth website plan",
    planEnv: "RAZORPAY_PLAN_GROWTH_MONTHLY",
    monthly: paise(1999),
    setup: SETUP_FEE,
    cycles: 12,
  },
  "starter-yearly": {
    kind: "order",
    label: "Starter website plan, 12 months paid upfront",
    yearly: paise(8999),
    setup: SETUP_FEE,
  },
};

/** What the customer pays on day 1, in paise. */
export function amountToday(key) {
  const p = PLANS[key];
  if (!p) return 0;
  return p.kind === "subscription" ? p.setup + p.monthly : p.yearly + p.setup;
}

/** "3,898" for 389800 paise. Indian digit grouping, whole rupees. */
export const rupees = (amountPaise) => new Intl.NumberFormat("en-IN").format(Math.round(amountPaise / 100));

/**
 * The line Razorpay Checkout shows under our name. The CCPA dark-pattern
 * guidelines (2023) forbid a price revealed only at checkout, so the split of
 * today's amount and what follows is spelled out here too, not only on /pricing.
 */
export function describe(key) {
  const p = PLANS[key];
  if (!p) return "";
  if (p.kind === "subscription") {
    const name = key === "growth" ? "Growth" : "Starter";
    return `${name} plan: Rs ${rupees(amountToday(key))} today (Rs ${rupees(p.setup)} setup + first month), then Rs ${rupees(p.monthly)} a month for ${p.cycles - 1} months`;
  }
  return p.setup
    ? `Starter plan, 12 months upfront: Rs ${rupees(p.yearly)} + Rs ${rupees(p.setup)} setup = Rs ${rupees(amountToday(key))}`
    : `Starter plan, 12 months upfront: Rs ${rupees(p.yearly)}`;
}

/* ─────────────────────────────── Configuration ─────────────────────────────── */

const KEY_ID_RE = /^rzp_(test|live)_[A-Za-z0-9]{6,40}$/;
const PLAN_ID_RE = /^plan_[A-Za-z0-9]{6,40}$/;

/**
 * { keyId, keySecret, mode } when the keys are set, else null. Test keys are
 * allowed everywhere, production included, because Razorpay's test mode moves
 * no money and Mehdi tests on www.ideovent.in before going live. The browser
 * is told the mode and says "Test mode" plainly; the public pay buttons on
 * /pricing stay on WhatsApp until the build carries a LIVE key id
 * (src/lib/payments/client.ts).
 */
export function readConfig(env = process.env) {
  const keyId = String(env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(env.RAZORPAY_KEY_SECRET || "").trim();
  if (!KEY_ID_RE.test(keyId) || !keySecret) return null;
  return { keyId, keySecret, mode: keyId.startsWith("rzp_live_") ? "live" : "test" };
}

/** The Razorpay plan id for a monthly plan, from its env var, or "" when unset or malformed. */
export function planIdFor(key, env = process.env) {
  const p = PLANS[key];
  if (!p || p.kind !== "subscription") return "";
  const id = String(env[p.planEnv] || "").trim();
  return PLAN_ID_RE.test(id) ? id : "";
}

/** The webhook secret, or "" when unset. */
export const webhookSecret = (env = process.env) => String(env.RAZORPAY_WEBHOOK_SECRET || "").trim();

/* ─────────────────────────────── The Razorpay API ─────────────────────────────── */

/** An error whose message may be shown to the customer as it is. */
export const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, expose: true, ...extra });

/**
 * One call to the Razorpay API. GET without a body, POST with one. Throws on a
 * non-2xx answer with Razorpay's own description, which goes to the server log
 * only (it can name a plan id or a field, never a secret).
 */
export async function rzp(cfg, path, body, timeoutMs = 10000) {
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: "Basic " + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64"),
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const why = data && data.error && data.error.description ? data.error.description : `HTTP ${res.status}`;
    throw Object.assign(new Error(`Razorpay ${path.split("/")[1] || ""}: ${why}`), { status: res.status, razorpay: true });
  }
  return data;
}

/**
 * The plan behind RAZORPAY_PLAN_*_MONTHLY must be exactly the plan the site
 * shows: INR, monthly, every 1 month, the right amount. A plan made with a
 * typo (Rs 8,990 for Rs 899) would charge a customer a price we never showed
 * them, so a mismatch turns online payment off for that plan (503, WhatsApp
 * fallback) and names the problem in the server log. Checked once per warm
 * function instance for ten minutes.
 */
const planChecks = new Map();
export async function checkPlan(cfg, key, planId) {
  const hit = planChecks.get(planId);
  if (hit && hit > Date.now()) return;
  const p = PLANS[key];
  const plan = await rzp(cfg, `/plans/${encodeURIComponent(planId)}`);
  const item = plan && plan.item ? plan.item : {};
  const ok = item.amount === p.monthly && item.currency === "INR" && plan.period === "monthly" && Number(plan.interval) === 1;
  if (!ok) {
    console.error(`razorpay: ${p.planEnv} points at a plan of ${item.currency} ${Number(item.amount) / 100} every ${plan.interval} ${plan.period}; the site sells Rs ${p.monthly / 100} every 1 monthly. Online payment for "${key}" stays off until the plan id is fixed.`);
    throw fail(503, "Online payment is not available for this plan right now.", { fallback: true });
  }
  planChecks.set(planId, Date.now() + 10 * 60 * 1000);
}

/* ─────────────────────────────── Signatures ─────────────────────────────── */

/** Lower-case hex HMAC-SHA256. `message` may be a string (UTF-8) or a Buffer. */
export const hmacHex = (message, secret) => createHmac("sha256", secret).update(message).digest("hex");

/** Constant-time comparison of two hex strings. False for empty or unequal lengths. */
export function sameHex(a, b) {
  const x = Buffer.from(String(a || ""), "utf8");
  const y = Buffer.from(String(b || ""), "utf8");
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

/*
  The strings Razorpay signs, as in its own Node SDK (razorpay-node,
  lib/utils/razorpay-utils.js). The order of the two ids is DIFFERENT for a
  subscription and an order: that is Razorpay's format, not a typo.
*/
export const subscriptionSignatureOk = (paymentId, subscriptionId, signature, keySecret) =>
  sameHex(hmacHex(`${paymentId}|${subscriptionId}`, keySecret), signature);

export const orderSignatureOk = (orderId, paymentId, signature, keySecret) =>
  sameHex(hmacHex(`${orderId}|${paymentId}`, keySecret), signature);

/** Webhooks: the RAW body, byte for byte, with the WEBHOOK secret (not the key secret). */
export const webhookSignatureOk = (rawBody, signature, secret) => sameHex(hmacHex(rawBody, secret), signature);

/* ─────────────────────────────── The database link ─────────────────────────────── */

/*
  HOW THE WEBHOOK PROVES ITSELF TO THE DATABASE, WITH NO SECRET IN THE DATABASE

  The webhook writes with the public anon key (this project has no
  service_role key: api/_lib/supabaseRest.js says why), so the database needs
  proof that a call comes from this function and not from anyone who has the
  anon key. The proof is an INGEST TOKEN derived here from the webhook secret:

    token = HMAC-SHA256(key = RAZORPAY_WEBHOOK_SECRET, message = INGEST_LABEL), hex

  The database keeps only SHA-256(token), in public.payment_settings
  (migration 0010). It gets there when the admin presses "Connect" in
  /admin/payments (api/razorpay/connect.js). A hash cannot be turned back into
  the token, and the token cannot be turned back into the secret, so the
  webhook secret lives in Vercel and nowhere else. Razorpay never signs this
  label (its bodies are JSON and start with "{"), so no webhook signature can
  ever be a token. A new webhook secret makes a new token: press Connect again.
*/
const INGEST_LABEL = "ideovent:payment-events:ingest:v1";

/** The token the webhook shows the database. Never logged, never sent anywhere else. */
export const ingestToken = (secret) => hmacHex(INGEST_LABEL, secret);

/** What the database stores: SHA-256 of the token, lower-case hex. */
export const ingestHash = (secret) => createHash("sha256").update(ingestToken(secret), "utf8").digest("hex");

/* ─────────────────────────────── Requests and answers ─────────────────────────────── */

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** The answer every endpoint gives while online payment is off: the page shows the WhatsApp fallback. */
export const disabled = (error = "Online payment is not switched on yet.") =>
  json(503, { ok: false, enabled: false, fallback: true, error });

/** Trimmed, control characters removed, cut to `max`. */
export const clip = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** A small JSON body, or null. Nothing a checkout form sends comes near 8 KB. */
export async function readJson(request, max = 8192) {
  const text = await request.text().catch(() => "");
  if (!text || text.length > max) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Only our own pages may start a payment. A browser always sends Origin on a
 * POST; another website's script therefore cannot create subscriptions in our
 * name. (A request with no Origin is not a browser, and gains nothing a
 * browser could not do on our own page.)
 */
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  return [request.headers.get("x-forwarded-host"), request.headers.get("host")].some((h) => h && h === host);
}

/** "+919876543210" from the ways people type a number, or "" when it is not one. */
export function normalisePhone(input) {
  let s = String(input || "").replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^[6-9]\d{9}$/.test(s)) return "+91" + s;
  if (/^0[6-9]\d{9}$/.test(s)) return "+91" + s.slice(1);
  if (/^91[6-9]\d{9}$/.test(s)) return "+" + s;
  if (/^\+91[6-9]\d{9}$/.test(s)) return s;
  if (/^\+(?!91)[1-9]\d{7,14}$/.test(s)) return s;
  return "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The short form: name, business name, phone, and an optional e-mail.
 * Returns { value } or { errors } keyed by field, in words a customer reads.
 */
export function readCustomer(input) {
  const name = clip(input.name, 80);
  const business = clip(input.business, 100);
  const phone = normalisePhone(input.phone);
  const email = clip(input.email, 120).toLowerCase();
  const errors = {};
  if (name.length < 2) errors.name = "Enter your name.";
  if (business.length < 2) errors.business = "Enter your business name.";
  if (!phone) errors.phone = "Enter a mobile number: 10 digits, or + and the country code.";
  if (email && !EMAIL_RE.test(email)) errors.email = "Check the e-mail address, or leave it empty.";
  return Object.keys(errors).length ? { errors } : { value: { name, business, phone, email } };
}

/** Razorpay `notes`: at most 15 pairs of 256 characters. They come back on every webhook. */
export const notesFor = (key, c) => ({
  plan: key,
  business: c.business,
  name: c.name,
  phone: c.phone,
  ...(c.email ? { email: c.email } : {}),
  source: "ideovent.in checkout",
});

/** Log the failure (ids and Razorpay's own words only) and answer without internals. */
export function apiError(where, e) {
  console.error(`razorpay ${where}:`, e && e.status ? e.status : "", e && e.message ? e.message : e);
  if (e && e.expose) return json(e.status || 400, { ok: false, error: e.message, ...(e.fallback ? { fallback: true } : {}) });
  return json(502, {
    ok: false,
    fallback: true,
    error: "Razorpay did not answer just now. Try again in a minute, or pay by UPI or bank transfer on WhatsApp.",
  });
}
