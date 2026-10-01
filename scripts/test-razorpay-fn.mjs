/**
 * Test the Razorpay functions (api/razorpay/*.js) with Razorpay's API and
 * Supabase mocked, and REAL crypto: every signature below is a genuine
 * HMAC-SHA256, made the way Razorpay makes it.
 *
 *   node scripts/test-razorpay-fn.mjs
 *
 * What it proves:
 *   - with no env vars, every endpoint answers "off" (503, fallback) and nothing
 *     calls Razorpay: the site's WhatsApp fallback is what a visitor gets;
 *   - a subscription is created with the plan id from env, 12 charges and the
 *     Rs 2,999 setup fee as an add-on, and the business name in its notes;
 *     the browser cannot set a price, and a plan made with the wrong amount in
 *     the Razorpay Dashboard switches online payment off instead of charging it;
 *   - verify accepts the real checkout signature and rejects a forged one, a
 *     swapped one, and a genuine one for a different plan or amount;
 *   - "Connect" (api/razorpay/connect.js) is admin only, and stores only a
 *     one-way fingerprint of the webhook secret: the secret itself never goes
 *     to Supabase, to the browser or into an answer;
 *   - the webhook checks the RAW body with the webhook secret, records a real
 *     event once, answers a replay (same id, or same body under a new id) as a
 *     duplicate, rejects a forged or edited body, and answers 500 when the
 *     database refuses (not connected, or connected to an older secret), so
 *     Razorpay retries;
 *   - the prices the site shows (src/lib/pricing.ts) are the prices the server
 *     charges (api/_lib/razorpay.js);
 *   - no secret name appears in src/, and the migration gives nobody a write
 *     and keeps no secret.
 *
 * The SQL itself (0010, and SETUP_ALL.sql) is not run here: this file mocks
 * Supabase. It was run on a real Postgres 18.3 (PGlite, in memory, outside
 * the repository) on 1 Oct 2026, roles and grants included.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   RAZORPAY_NEGATIVE=1 node scripts/test-razorpay-fn.mjs
 *
 * makes the fake Razorpay sign with a different secret from the one the server
 * holds. Every "accepts the real signature" check must then FAIL and the run
 * must exit 1. If it passes, the checks are not reaching the signature code.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const NEGATIVE = Boolean(process.env.RAZORPAY_NEGATIVE);

/* Fictional values only. None of these is a real key, plan or secret. */
const KEY_ID = "rzp_test_E2EFAKEKEY0001";
const KEY_SECRET = "test_key_secret_not_real_0001";
const WEBHOOK_SECRET = "whsec_test_not_real_0123456789abcdef";
const PLAN_STARTER = "plan_TESTSTARTER0001";
const PLAN_GROWTH = "plan_TESTGROWTH00001";
const SUPABASE_URL = "https://example-project.supabase.co";
const ANON = "anon-key-for-tests";
const ORIGIN = "https://www.ideovent.in";

/** What "Razorpay" signs with. In the negative run it is not the server's secret. */
const SIGN_KEY_SECRET = NEGATIVE ? "a-different-secret" : KEY_SECRET;
const SIGN_WEBHOOK_SECRET = NEGATIVE ? "a-different-webhook-secret" : WEBHOOK_SECRET;
const hmac = (msg, secret) => createHmac("sha256", secret).update(msg).digest("hex");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

const fails = [];
function check(label, ok, detail) {
  console.log(`${ok ? "ok   " : "FAIL "} ${label}${!ok && detail !== undefined ? `\n        ${JSON.stringify(detail).slice(0, 400)}` : ""}`);
  if (!ok) fails.push(label);
}

/* ───────────────────────── The fake Razorpay and the fake database ───────────────────────── */

const calls = [];
const fake = {
  plans: {
    [PLAN_STARTER]: { id: PLAN_STARTER, period: "monthly", interval: 1, item: { amount: 89900, currency: "INR" } },
    [PLAN_GROWTH]: { id: PLAN_GROWTH, period: "monthly", interval: 1, item: { amount: 199900, currency: "INR" } },
  },
  subscriptions: {},
  payments: {},
  down: false,
  /** public.payment_settings.ingest_sha256: what "Connect" stored (null = never pressed). */
  dbIngest: null,
  dbRows: [],
};

/* Supabase sessions: one admin, one signed-in stranger. Anything else is an expired token. */
const ADMIN_TOKEN = "session-admin-not-real";
const STRANGER_TOKEN = "session-stranger-not-real";
const USERS = { [ADMIN_TOKEN]: { id: "u-admin", email: "admin@example.test", admin: true }, [STRANGER_TOKEN]: { id: "u-other", email: "other@example.test", admin: false } };

/** The derivation, written out here from its spec, so the test does not just call the code it checks. */
const INGEST_LABEL = "ideovent:payment-events:ingest:v1";
const tokenFor = (secret) => hmac(INGEST_LABEL, secret);
const fingerprintFor = (secret) => sha256(tokenFor(secret));

function reply(status, body) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** record_payment_event, as migration 0010 writes it: SHA-256 of the token must be the stored fingerprint; once per event and per body. */
function fakeRecord(args) {
  if (!fake.dbIngest) return reply(401, { code: "28000", message: "payments: the webhook is not connected yet (press Connect in /admin/payments)" });
  if (!args.p_token || sha256(String(args.p_token)) !== fake.dbIngest) {
    return reply(401, { code: "28000", message: "payments: the webhook token does not match (a new webhook secret? press Connect in /admin/payments again)" });
  }
  const bodyHash = sha256(Buffer.from(args.p_body, "utf8"));
  const eventId = (args.p_event_id || "").trim() || "sha256:" + bodyHash;
  if (fake.dbRows.some((r) => r.event_id === eventId || r.body_sha256 === bodyHash)) return reply(200, JSON.stringify("duplicate"));
  fake.dbRows.push({ event_id: eventId, body_sha256: bodyHash, mode: args.p_mode, payload: JSON.parse(args.p_body) });
  return reply(200, JSON.stringify("recorded"));
}

/** The admin's calls (set_payment_ingest, payment_ingest_status, is_admin) and /auth/v1/user, as the caller's token decides. */
function fakeSupabase(url, method, headers, body) {
  const token = /^Bearer (.+)$/.exec(headers.get("authorization") || "")?.[1];
  const user = USERS[token];
  if (url.endsWith("/auth/v1/user")) return user ? reply(200, { id: user.id, email: user.email }) : reply(401, { message: "invalid JWT" });
  if (url.endsWith("/rest/v1/rpc/is_admin")) return reply(200, JSON.stringify(Boolean(user && user.admin)));
  if (url.endsWith("/rest/v1/rpc/set_payment_ingest") || url.endsWith("/rest/v1/rpc/payment_ingest_status")) {
    if (!user) return reply(401, { code: "PGRST301", message: "JWT expired" });
    if (!user.admin) return reply(403, { code: "42501", message: "payments: only the admin can connect the webhook" });
    if (fake.missing) return reply(404, { code: "PGRST202", message: "Could not find the function" });
    if (url.endsWith("/set_payment_ingest")) {
      if (!/^[0-9a-f]{64}$/.test(String(body?.p_sha256))) return reply(400, { code: "P0001", message: "payments: expected a SHA-256 fingerprint in lower-case hex" });
      fake.dbIngest = body.p_sha256;
      return reply(200, JSON.stringify("2026-10-01T09:30:00+00:00"));
    }
    return reply(200, { connected: Boolean(fake.dbIngest), connectedAt: fake.dbIngest ? "2026-10-01T09:30:00+00:00" : null,
      matches: Boolean(fake.dbIngest) && fake.dbIngest === body?.p_sha256 });
  }
  return reply(404, { code: "PGRST202", message: "not found" });
}

let seq = 0;
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ url, method, headers, body });
  if (fake.down) throw new TypeError("fetch failed");

  if (url.startsWith(SUPABASE_URL)) {
    if (url.endsWith("/rest/v1/rpc/record_payment_event") && method === "POST") return fakeRecord(body);
    return fakeSupabase(url, method, headers, body);
  }

  const u = new URL(url);
  if (u.origin !== "https://api.razorpay.com") return reply(599, { error: "unexpected host " + u.origin });
  const expectedAuth = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  if (headers.get("authorization") !== expectedAuth) return reply(401, { error: { description: "Authentication failed" } });
  const path = u.pathname.replace(/^\/v1/, "");
  let m;
  if ((m = path.match(/^\/plans\/(.+)$/)) && method === "GET") {
    const p = fake.plans[decodeURIComponent(m[1])];
    return p ? reply(200, p) : reply(400, { error: { description: "The id provided does not exist" } });
  }
  if (path === "/subscriptions" && method === "POST") {
    const id = `sub_TEST${String(++seq).padStart(10, "0")}`;
    fake.subscriptions[id] = { id, plan_id: body.plan_id, status: "created" };
    return reply(200, { id, entity: "subscription", plan_id: body.plan_id, status: "created", short_url: `https://rzp.io/rzp/test${seq}` });
  }
  if ((m = path.match(/^\/subscriptions\/(.+)$/)) && method === "GET") {
    const s = fake.subscriptions[decodeURIComponent(m[1])];
    return s ? reply(200, s) : reply(400, { error: { description: "The id provided does not exist" } });
  }
  if (path === "/orders" && method === "POST") {
    const id = `order_TEST${String(++seq).padStart(10, "0")}`;
    return reply(200, { id, entity: "order", amount: body.amount, currency: body.currency, status: "created", receipt: body.receipt, notes: body.notes });
  }
  if ((m = path.match(/^\/payments\/(.+)$/)) && method === "GET") {
    const p = fake.payments[decodeURIComponent(m[1])];
    return p ? reply(200, p) : reply(400, { error: { description: "The id provided does not exist" } });
  }
  return reply(404, { error: { description: "The requested URL was not found on the server." } });
};

const razorpayCalls = () => calls.filter((c) => c.url.startsWith("https://api.razorpay.com"));
const rpcCalls = () => calls.filter((c) => c.url.endsWith("/rpc/record_payment_event"));
const adminRpcCalls = () => calls.filter((c) => /\/rpc\/(set_payment_ingest|payment_ingest_status)$/.test(c.url));

/* ───────────────────────── Requests ───────────────────────── */

function post(path, body, { origin = ORIGIN, headers = {} } = {}) {
  return new Request(ORIGIN + path, {
    method: "POST",
    headers: { "content-type": "application/json", host: "www.ideovent.in", "x-forwarded-host": "www.ideovent.in", ...(origin ? { origin } : {}), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
function get(path, headers = {}) {
  return new Request(ORIGIN + path, { method: "GET", headers: { host: "www.ideovent.in", ...headers } });
}
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const read = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });

const RZP_ENV = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_PLAN_STARTER_MONTHLY", "RAZORPAY_PLAN_GROWTH_MONTHLY"];
function envOff() {
  for (const k of [...RZP_ENV, "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"]) delete process.env[k];
}
function envOn() {
  Object.assign(process.env, {
    RAZORPAY_KEY_ID: KEY_ID,
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    RAZORPAY_PLAN_STARTER_MONTHLY: PLAN_STARTER,
    RAZORPAY_PLAN_GROWTH_MONTHLY: PLAN_GROWTH,
    VITE_SUPABASE_URL: SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: ANON,
  });
}

const CUSTOMER = { name: "Asha Verma", business: "Riverbend Dental Care", phone: "98765 43210", email: "asha@example.com" };

const status = await import("../api/razorpay/status.js");
const createSub = await import("../api/razorpay/create-subscription.js");
const createOrder = await import("../api/razorpay/create-order.js");
const verify = await import("../api/razorpay/verify.js");
const webhook = await import("../api/razorpay/webhook.js");
const connect = await import("../api/razorpay/connect.js");
const lib = await import("../api/_lib/razorpay.js");

/* ───────────────────────── 1. No env vars: everything is "off", nothing breaks ───────────────────────── */

console.log("\n1. Without the Razorpay env vars\n");
envOff();
{
  const s = await read(status.GET());
  check("status says enabled: false", s.status === 200 && s.body?.enabled === false && s.body?.webhook === false, s);
  const sub = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter", ...CUSTOMER })));
  check("create-subscription answers 503 with fallback", sub.status === 503 && sub.body?.fallback === true && sub.body?.enabled === false, sub);
  const ord = await read(await createOrder.POST(post("/api/razorpay/create-order", { plan: "starter-yearly", ...CUSTOMER })));
  check("create-order answers 503 with fallback", ord.status === 503 && ord.body?.fallback === true, ord);
  const ver = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter" })));
  check("verify answers 503", ver.status === 503, ver);
  const wh = await read(await webhook.POST(post("/api/razorpay/webhook", "{}", { origin: null })));
  check("webhook answers 503 (no secret, nothing can be verified)", wh.status === 503, wh);
  const cg = await read(await connect.GET(get("/api/razorpay/connect", bearer(ADMIN_TOKEN))));
  const cp = await read(await connect.POST(post("/api/razorpay/connect", "{}", { headers: bearer(ADMIN_TOKEN) })));
  check("connect answers 503 without Supabase settings on the server", cg.status === 503 && cp.status === 503, { cg, cp });
  check("nothing called Razorpay or Supabase", calls.length === 0, calls.map((c) => c.url));

  process.env.RAZORPAY_KEY_ID = KEY_ID; // a key id alone is not enough
  const half = await read(status.GET());
  check("a key id without its secret is still off", half.body?.enabled === false, half);
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET; // keys, but no plan ids
  const noPlans = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "growth", ...CUSTOMER })));
  check("keys without a plan id: that plan is off (503, fallback)", noPlans.status === 503 && noPlans.body?.fallback === true, noPlans);
  envOff();
}

/* ───────────────────────── 2. Starting a payment ───────────────────────── */

console.log("\n2. Creating subscriptions and orders\n");
envOn();
{
  const s = await read(status.GET());
  check("status: enabled, test mode, public key id, both plans, webhook set",
    s.body?.enabled === true && s.body?.mode === "test" && s.body?.keyId === KEY_ID && s.body?.plans?.starter === true
      && s.body?.plans?.growth === true && s.body?.plans?.["starter-yearly"] === true && s.body?.webhook === true, s);
  const leaked = JSON.stringify(s.body);
  check("status never carries a secret or a plan id",
    ![KEY_SECRET, WEBHOOK_SECRET, PLAN_STARTER, PLAN_GROWTH].some((v) => leaked.includes(v)), leaked);

  calls.length = 0;
  const res = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter", ...CUSTOMER, amount: 100 })));
  const req = razorpayCalls().find((c) => c.url.endsWith("/v1/subscriptions"))?.body;
  check("starter: 200 with the subscription id and the public key id",
    res.status === 200 && res.body?.subscriptionId?.startsWith("sub_") && res.body?.keyId === KEY_ID && res.body?.mode === "test", res);
  check("starter: the plan id comes from RAZORPAY_PLAN_STARTER_MONTHLY", req?.plan_id === PLAN_STARTER, req);
  check("starter: total_count 12, one at a time, Razorpay notifies the customer",
    req?.total_count === 12 && req?.quantity === 1 && req?.customer_notify === true, req);
  check("starter: the Rs 2,999 setup fee is an upfront add-on in INR",
    req?.addons?.length === 1 && req.addons[0].item.amount === 299900 && req.addons[0].item.currency === "INR", req?.addons);
  const now = Math.floor(Date.now() / 1000);
  check("starter: an abandoned checkout expires within 24 hours", req?.expire_by > now + 86000 && req?.expire_by <= now + 86400 + 5, req?.expire_by);
  check("starter: notes carry the plan, business name, name and normalised phone",
    req?.notes?.plan === "starter" && req?.notes?.business === "Riverbend Dental Care" && req?.notes?.name === "Asha Verma"
      && req?.notes?.phone === "+919876543210" && req?.notes?.email === "asha@example.com", req?.notes);
  check("starter: a price sent by the browser is ignored", !("amount" in (req || {})) && req?.addons?.[0]?.item?.amount === 299900, req);
  check("starter: today's amount is Rs 3,898 and the description says so",
    res.body?.amountToday === 389800 && /Rs 3,898 today/.test(res.body?.description) && /Rs 899 a month for 11 months/.test(res.body?.description), res.body);
  check("starter: the plan in Razorpay was checked before anything was created",
    razorpayCalls()[0]?.url.endsWith(`/v1/plans/${PLAN_STARTER}`), razorpayCalls().map((c) => c.url));
  check("the key secret travels only as Basic auth to api.razorpay.com",
    calls.every((c) => !JSON.stringify(c.body || {}).includes(KEY_SECRET)) && !JSON.stringify(res.body).includes(KEY_SECRET));

  const growth = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "growth", ...CUSTOMER })));
  const greq = razorpayCalls().filter((c) => c.url.endsWith("/v1/subscriptions")).pop()?.body;
  check("growth: plan id from RAZORPAY_PLAN_GROWTH_MONTHLY, Rs 4,998 today",
    growth.status === 200 && greq?.plan_id === PLAN_GROWTH && growth.body?.amountToday === 499800, { growth, greq });

  calls.length = 0;
  const wrongKind = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter-yearly", ...CUSTOMER })));
  const unknown = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "platinum", ...CUSTOMER })));
  const badPhone = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter", ...CUSTOMER, phone: "12345" })));
  const noName = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter", ...CUSTOMER, name: " " })));
  const cross = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter", ...CUSTOMER }, { origin: "https://evil.example" })));
  const notJson = await read(await createSub.POST(post("/api/razorpay/create-subscription", "plan=starter")));
  check("the yearly plan is refused by create-subscription (it is an order)", wrongKind.status === 400, wrongKind);
  check("an unknown plan is refused", unknown.status === 400, unknown);
  check("a bad phone is refused with a message for that field", badPhone.status === 400 && typeof badPhone.body?.fields?.phone === "string", badPhone);
  check("a missing name is refused", noName.status === 400 && typeof noName.body?.fields?.name === "string", noName);
  check("another website's page cannot start a payment (403)", cross.status === 403, cross);
  check("a body that is not JSON is refused", notJson.status === 400, notJson);
  check("none of those refusals called Razorpay", razorpayCalls().length === 0, razorpayCalls().map((c) => c.url));

  // A plan typed into the Dashboard as Rs 890 instead of Rs 899.
  fake.plans.plan_TESTTYPO0000001 = { id: "plan_TESTTYPO0000001", period: "monthly", interval: 1, item: { amount: 89000, currency: "INR" } };
  process.env.RAZORPAY_PLAN_STARTER_MONTHLY = "plan_TESTTYPO0000001";
  calls.length = 0;
  const errors = [];
  const origError = console.error;
  console.error = (...a) => errors.push(a.join(" "));
  const typo = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter", ...CUSTOMER })));
  console.error = origError;
  check("a plan with the wrong amount turns payment off for it (503, fallback) and creates nothing",
    typo.status === 503 && typo.body?.fallback === true && !razorpayCalls().some((c) => c.url.endsWith("/v1/subscriptions")), typo);
  check("... and the server log names the env var to fix", errors.some((e) => e.includes("RAZORPAY_PLAN_STARTER_MONTHLY")), errors);
  process.env.RAZORPAY_PLAN_STARTER_MONTHLY = PLAN_STARTER;

  fake.down = true;
  console.error = () => {};
  const down = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "growth", ...CUSTOMER })));
  const downOrder = await read(await createOrder.POST(post("/api/razorpay/create-order", { plan: "starter-yearly", ...CUSTOMER })));
  console.error = origError;
  fake.down = false;
  check("Razorpay unreachable: 502 with the fallback, in plain words",
    down.status === 502 && down.body?.fallback === true && /WhatsApp/.test(down.body?.error) && downOrder.status === 502, { down, downOrder });

  calls.length = 0;
  const ord = await read(await createOrder.POST(post("/api/razorpay/create-order", { plan: "starter-yearly", ...CUSTOMER, amount: 100 })));
  const oreq = razorpayCalls().find((c) => c.url.endsWith("/v1/orders"))?.body;
  check("yearly: one order of Rs 11,998 (Rs 8,999 + Rs 2,999 setup) in INR, whatever the browser sent",
    ord.status === 200 && oreq?.amount === 1199800 && oreq?.currency === "INR" && ord.body?.amount === 1199800 && ord.body?.orderId?.startsWith("order_"), { ord, oreq });
  check("yearly: receipt fits Razorpay's 40 characters, notes carry the business", oreq?.receipt?.length <= 40 && oreq?.notes?.business === "Riverbend Dental Care", oreq);
  const monthlyAsOrder = await read(await createOrder.POST(post("/api/razorpay/create-order", { plan: "starter", ...CUSTOMER })));
  check("create-order refuses a monthly plan", monthlyAsOrder.status === 400, monthlyAsOrder);

  // Live keys are "live" mode; a malformed key id is off.
  process.env.RAZORPAY_KEY_ID = "rzp_live_E2EFAKEKEY0001";
  check("a live key id reads as live mode", (await read(status.GET())).body?.mode === "live");
  process.env.RAZORPAY_KEY_ID = "not-a-key";
  check("a malformed key id reads as off", (await read(status.GET())).body?.enabled === false);
  process.env.RAZORPAY_KEY_ID = KEY_ID;
}

/* ───────────────────────── 3. Verifying Checkout's answer ───────────────────────── */

console.log("\n3. Verifying the checkout signature\n");
{
  const sub = await read(await createSub.POST(post("/api/razorpay/create-subscription", { plan: "starter", ...CUSTOMER })));
  const subscriptionId = sub.body.subscriptionId;
  const paymentId = "pay_TESTPAYMENT0001";
  fake.subscriptions[subscriptionId].status = "active";

  const real = hmac(`${paymentId}|${subscriptionId}`, SIGN_KEY_SECRET);
  const ok = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter", subscriptionId, razorpay_payment_id: paymentId, razorpay_signature: real })));
  check("subscription: the real signature (payment_id|subscription_id, key secret) is accepted", ok.status === 200 && ok.body?.ok === true && ok.body?.paymentId === paymentId, ok);

  const forged = hmac(`${paymentId}|${subscriptionId}`, "guessed-secret");
  const bad = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter", subscriptionId, razorpay_payment_id: paymentId, razorpay_signature: forged })));
  check("subscription: a forged signature is rejected", bad.status === 400 && bad.body?.ok === false, bad);

  const swapped = hmac(`${subscriptionId}|${paymentId}`, SIGN_KEY_SECRET);
  const sw = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter", subscriptionId, razorpay_payment_id: paymentId, razorpay_signature: swapped })));
  check("subscription: the ids in the order-payment order are rejected", sw.status === 400, sw);

  const other = await read(await verify.POST(post("/api/razorpay/verify", { plan: "growth", subscriptionId, razorpay_payment_id: paymentId, razorpay_signature: real })));
  check("subscription: a genuine Starter payment presented as Growth is rejected", other.status === 400 && other.body?.ok === false, other);

  fake.subscriptions[subscriptionId].status = "cancelled";
  const cancelled = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter", subscriptionId, razorpay_payment_id: paymentId, razorpay_signature: real })));
  check("subscription: a cancelled subscription is not confirmed", cancelled.status === 400, cancelled);

  const junk = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter", subscriptionId, razorpay_payment_id: paymentId, razorpay_signature: "zz" })));
  check("subscription: a malformed signature is refused before any lookup", junk.status === 400, junk);

  const ord = await read(await createOrder.POST(post("/api/razorpay/create-order", { plan: "starter-yearly", ...CUSTOMER })));
  const orderId = ord.body.orderId;
  const pay2 = "pay_TESTPAYMENT0002";
  fake.payments[pay2] = { id: pay2, order_id: orderId, amount: 1199800, currency: "INR", status: "captured" };
  const realOrder = hmac(`${orderId}|${pay2}`, SIGN_KEY_SECRET);
  const good = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter-yearly", orderId, razorpay_payment_id: pay2, razorpay_signature: realOrder })));
  check("order: the real signature (order_id|payment_id, key secret) is accepted", good.status === 200 && good.body?.ok === true, good);
  const forgedOrder = await read(await verify.POST(post("/api/razorpay/verify", {
    plan: "starter-yearly", orderId, razorpay_payment_id: pay2, razorpay_signature: hmac(`${orderId}|${pay2}`, "guessed-secret"),
  })));
  check("order: a forged signature is rejected", forgedOrder.status === 400, forgedOrder);
  fake.payments[pay2].amount = 100;
  const cheap = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter-yearly", orderId, razorpay_payment_id: pay2, razorpay_signature: realOrder })));
  check("order: a genuine payment of the wrong amount is not confirmed", cheap.status === 400, cheap);
  fake.payments[pay2] = { id: pay2, order_id: "order_SOMEONEELSE01", amount: 1199800, currency: "INR", status: "captured" };
  const elsewhere = await read(await verify.POST(post("/api/razorpay/verify", { plan: "starter-yearly", orderId, razorpay_payment_id: pay2, razorpay_signature: realOrder })));
  check("order: a payment that belongs to another order is not confirmed", elsewhere.status === 400, elsewhere);
}

/* ───────────────────────── 4. Connecting the webhook to the database ───────────────────────── */

console.log("\n4. Connect: the database learns the webhook's fingerprint, never its secret\n");
{
  fake.dbIngest = null;
  calls.length = 0;
  const noSession = await read(await connect.POST(post("/api/razorpay/connect", "{}")));
  const expired = await read(await connect.POST(post("/api/razorpay/connect", "{}", { headers: bearer("an-expired-session") })));
  const stranger = await read(await connect.POST(post("/api/razorpay/connect", "{}", { headers: bearer(STRANGER_TOKEN) })));
  const crossSite = await read(await connect.POST(post("/api/razorpay/connect", "{}", { origin: "https://evil.example", headers: bearer(ADMIN_TOKEN) })));
  check("no session: 401; an expired one: 401", noSession.status === 401 && expired.status === 401, { noSession, expired });
  check("a signed-in stranger: 403", stranger.status === 403, stranger);
  check("the admin's session from another website's page: 403", crossSite.status === 403, crossSite);
  check("none of those stored anything", fake.dbIngest === null && adminRpcCalls().length === 0, adminRpcCalls().map((c) => c.url));

  const before = await read(await connect.GET(get("/api/razorpay/connect", bearer(ADMIN_TOKEN))));
  check("status before: the secret is set in Vercel, nothing connected yet",
    before.status === 200 && before.body?.webhookSecret === true && before.body?.connected === false && before.body?.current === false, before);

  calls.length = 0;
  const done = await read(await connect.POST(post("/api/razorpay/connect", "{}", { headers: bearer(ADMIN_TOKEN) })));
  const stored = adminRpcCalls().find((c) => c.url.endsWith("/set_payment_ingest"));
  check("the admin connects: 200, connected and current, with the time", done.status === 200 && done.body?.connected === true
    && done.body?.current === true && typeof done.body?.connectedAt === "string", done);
  check("what is stored is SHA-256 of HMAC(webhook secret, the label): the spec, computed independently",
    fake.dbIngest === fingerprintFor(WEBHOOK_SECRET) && lib.ingestHash(WEBHOOK_SECRET) === fake.dbIngest, fake.dbIngest);
  check("the call ran as the admin (their Bearer token), with the public anon key",
    stored?.headers.get("authorization") === `Bearer ${ADMIN_TOKEN}` && stored?.headers.get("apikey") === ANON, stored && Object.fromEntries(stored.headers));
  const everything = JSON.stringify(calls.map((c) => c.body)) + JSON.stringify(done.body) + JSON.stringify(before.body);
  check("the webhook secret and the token go nowhere: not to Supabase, not into an answer",
    !everything.includes(WEBHOOK_SECRET) && !everything.includes(tokenFor(WEBHOOK_SECRET)) && !everything.includes(KEY_SECRET));
  check("... and the answer does not even carry the fingerprint", !JSON.stringify(done.body).includes(fake.dbIngest));
  const after = await read(await connect.GET(get("/api/razorpay/connect", bearer(ADMIN_TOKEN))));
  check("status after: connected and current", after.body?.connected === true && after.body?.current === true, after);

  const strangerLooks = await read(await connect.GET(get("/api/razorpay/connect", bearer(STRANGER_TOKEN))));
  check("a stranger cannot read the status either (403)", strangerLooks.status === 403, strangerLooks);

  fake.missing = true;
  const noTable = await read(await connect.POST(post("/api/razorpay/connect", "{}", { headers: bearer(ADMIN_TOKEN) })));
  fake.missing = false;
  check("before 0010 is run: 409 and it says which file to run", noTable.status === 409 && noTable.body?.missing === true && /0010_payments\.sql/.test(noTable.body?.error), noTable);

  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  const noSecret = await read(await connect.POST(post("/api/razorpay/connect", "{}", { headers: bearer(ADMIN_TOKEN) })));
  const noSecretStatus = await read(await connect.GET(get("/api/razorpay/connect", bearer(ADMIN_TOKEN))));
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  check("no webhook secret in Vercel: connect says so (503) and the status says 'not set', 'not current'",
    noSecret.status === 503 && /RAZORPAY_WEBHOOK_SECRET/.test(noSecret.body?.error) && noSecretStatus.body?.webhookSecret === false
      && noSecretStatus.body?.current === false, { noSecret, noSecretStatus });
}

/* ───────────────────────── 5. The webhook ───────────────────────── */

console.log("\n5. The webhook\n");

/** A Razorpay subscription.charged event, trimmed from Razorpay's own sample, with a non-ASCII name in it. */
function chargedEvent(n = 1) {
  return JSON.stringify({
    entity: "event",
    account_id: "acc_TEST000000001",
    event: "subscription.charged",
    contains: ["subscription", "payment"],
    payload: {
      subscription: { entity: { id: "sub_TEST0000000009", plan_id: PLAN_STARTER, status: "active", paid_count: n, total_count: 12, remaining_count: 12 - n,
        notes: { plan: "starter", business: "Clínica Dental Añil", name: "Asha Verma", phone: "+919876543210" } } },
      payment: { entity: { id: `pay_TESTCHARGE000${n}`, entity: "payment", amount: 389800, currency: "INR", status: "captured", method: "upi" } },
    },
    created_at: 1790900000 + n,
  });
}
const signed = (raw, secret = SIGN_WEBHOOK_SECRET) => hmac(Buffer.from(raw, "utf8"), secret);
const hook = (raw, sig, eventId = "evt_TEST0000000001") =>
  webhook.POST(post("/api/razorpay/webhook", raw, {
    origin: null,
    headers: { ...(sig ? { "x-razorpay-signature": sig } : {}), ...(eventId ? { "x-razorpay-event-id": eventId } : {}) },
  }));

{
  fake.dbRows = [];
  calls.length = 0;
  const raw = chargedEvent(1);
  const first = await read(await hook(raw, signed(raw)));
  check("a real event is recorded (200, recorded)", first.status === 200 && first.body?.result === "recorded", first);
  const rpc = rpcCalls()[0];
  check("the database gets the body byte for byte, Razorpay's event id and the mode",
    rpc?.body?.p_body === raw && rpc?.body?.p_event_id === "evt_TEST0000000001" && rpc?.body?.p_mode === "test", rpc?.body);
  check("... and the ingest token derived from the webhook secret, never the secret or the signature",
    rpc?.body?.p_token === tokenFor(WEBHOOK_SECRET) && !("p_signature" in (rpc?.body || {}))
      && !JSON.stringify(rpc?.body || {}).includes(WEBHOOK_SECRET) && rpc?.body?.p_token !== WEBHOOK_SECRET, Object.keys(rpc?.body || {}));
  check("the database call uses the public anon key and no Authorization header (anon role, no service_role)",
    rpc?.headers.get("apikey") === ANON && !rpc?.headers.has("authorization"), rpc && Object.fromEntries(rpc.headers));
  check("a non-ASCII business name survives the round trip", fake.dbRows[0]?.payload?.payload?.subscription?.entity?.notes?.business === "Clínica Dental Añil", fake.dbRows[0]);

  const again = await read(await hook(raw, signed(raw)));
  check("the same event again (Razorpay retries) is a duplicate, still 200", again.status === 200 && again.body?.result === "duplicate", again);
  const replay = await read(await hook(raw, signed(raw), "evt_TEST_REPLAYED01"));
  check("the same signed body under a new event id is a duplicate too", replay.status === 200 && replay.body?.result === "duplicate", replay);
  check("... and only one row exists", fake.dbRows.length === 1, fake.dbRows.length);

  const second = chargedEvent(2);
  const next = await read(await hook(second, signed(second), "evt_TEST0000000002"));
  check("the next month's charge is recorded as a new row", next.body?.result === "recorded" && fake.dbRows.length === 2, next);

}
{
  calls.length = 0;
  const raw = chargedEvent(3);
  const forged = await read(await hook(raw, signed(raw, "guessed-webhook-secret"), "evt_FORGED00000001"));
  check("a forged signature is rejected (400)", forged.status === 400, forged);
  const withKeySecret = await read(await hook(raw, hmac(raw, KEY_SECRET), "evt_FORGED00000002"));
  check("a body signed with the KEY secret instead of the webhook secret is rejected", withKeySecret.status === 400, withKeySecret);
  const edited = raw.replace('"amount":389800', '"amount":100');
  const tampered = await read(await hook(edited, signed(raw), "evt_FORGED00000003"));
  check("an edited body with the original signature is rejected", edited !== raw && tampered.status === 400, tampered);
  const reserialised = JSON.stringify(JSON.parse(raw), null, 1);
  const pretty = await read(await hook(reserialised, signed(raw), "evt_FORGED00000004"));
  check("the signature is checked on the raw bytes, not on re-serialised JSON", pretty.status === 400, pretty);
  const unsigned = await read(await hook(raw, null, "evt_FORGED00000005"));
  check("an unsigned request is rejected", unsigned.status === 400, unsigned);
  check("none of those reached the database", rpcCalls().length === 0, rpcCalls().length);

  // Verified by the function, refused by the database: 500, so Razorpay retries for 24 hours.
  const quietErrors = console.error;
  const logged = [];
  console.error = (...a) => logged.push(a.join(" "));
  fake.dbIngest = fingerprintFor("an-older-webhook-secret");
  const stale = await read(await hook(raw, signed(raw), "evt_TEST0000000003"));
  fake.dbIngest = null;
  const notConnected = await read(await hook(raw, signed(raw), "evt_TEST0000000003"));
  fake.dbIngest = fingerprintFor(WEBHOOK_SECRET);
  delete process.env.VITE_SUPABASE_URL;
  const noDb = await read(await hook(raw, signed(raw), "evt_TEST0000000003"));
  process.env.VITE_SUPABASE_URL = SUPABASE_URL;
  fake.down = true;
  const dbDown = await read(await hook(raw, signed(raw), "evt_TEST0000000003"));
  fake.down = false;
  console.error = quietErrors;
  check("connected to an older webhook secret: 500, so Razorpay retries", stale.status === 500, stale);
  check("never connected (Connect not pressed): 500", notConnected.status === 500, notConnected);
  check("... and the server log says to press Connect, without the token or the body",
    logged.some((l) => /press Connect/.test(l)) && !logged.join(" ").includes(tokenFor(WEBHOOK_SECRET)) && !logged.join(" ").includes("Asha Verma"), logged);
  check("no Supabase settings on the server: 500", noDb.status === 500, noDb);
  check("Supabase unreachable: 500", dbDown.status === 500, dbDown);
  const retried = await read(await hook(raw, signed(raw), "evt_TEST0000000003"));
  check("Razorpay's retry after the fix is recorded", retried.status === 200 && retried.body?.result === "recorded", retried);

  // A new webhook secret in Vercel (and in Razorpay): refused until the admin connects again.
  const NEW_SECRET = "whsec_test_rotated_not_real_0002";
  process.env.RAZORPAY_WEBHOOK_SECRET = NEW_SECRET;
  const fresh = chargedEvent(4);
  const newSig = hmac(Buffer.from(fresh, "utf8"), NEGATIVE ? "a-different-webhook-secret" : NEW_SECRET);
  console.error = () => {};
  const beforeReconnect = await read(await hook(fresh, newSig, "evt_TEST0000000004"));
  console.error = quietErrors;
  const staleStatus = await read(await connect.GET(get("/api/razorpay/connect", bearer(ADMIN_TOKEN))));
  await connect.POST(post("/api/razorpay/connect", "{}", { headers: bearer(ADMIN_TOKEN) }));
  const afterReconnect = await read(await hook(fresh, newSig, "evt_TEST0000000004"));
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  fake.dbIngest = fingerprintFor(WEBHOOK_SECRET);
  check("after a new webhook secret: events wait (500) and the admin sees 'connected, not current'",
    beforeReconnect.status === 500 && staleStatus.body?.connected === true && staleStatus.body?.current === false, { beforeReconnect, staleStatus });
  check("... and after Connect again, Razorpay's retry is recorded", afterReconnect.status === 200 && afterReconnect.body?.result === "recorded", afterReconnect);

  const huge = "x".repeat(300 * 1024);
  const big = await read(await hook(huge, signed(huge), "evt_TEST_HUGE0001"));
  check("an oversized body is refused", big.status === 400, big);
}

/* ───────────────────────── 6. One price, two copies ───────────────────────── */

console.log("\n6. The prices the site shows are the prices the server charges\n");
let pricing = null;
let eventsTs = null;
try {
  // src/lib/pricing.ts is the one module every price on the site is printed
  // from (the checkout reads it through src/lib/payments/plans.ts). Node 22.6+
  // strips TypeScript types itself (on by default from Node 23.6).
  pricing = await import(pathToFileURL(join(ROOT, "src/lib/pricing.ts")).href);
  eventsTs = await import(pathToFileURL(join(ROOT, "src/lib/payments/events.ts")).href);
} catch (e) {
  check("src/lib/pricing.ts and src/lib/payments/events.ts load in Node (needs Node 22.6 or newer)", false, String(e && e.message));
}
if (pricing) {
  const S = lib.PLANS;
  const P = pricing.PLANS;
  const y = P.starter.yearly;
  // The site's figures, in paise, shaped like the server's.
  const site = {
    starter: { kind: "subscription", monthly: P.starter.monthly * 100, setup: P.starter.setup * 100, cycles: P.starter.months },
    growth: { kind: "subscription", monthly: P.growth.monthly * 100, setup: P.growth.setup * 100, cycles: P.growth.months },
    ...(y ? { "starter-yearly": { kind: "order", yearly: y.price * 100, setup: y.setupApplies ? P.starter.setup * 100 : 0 } } : {}),
  };
  check("the server sells exactly the online plans the site shows", JSON.stringify(Object.keys(S).sort()) === JSON.stringify(Object.keys(site).sort()),
    { server: Object.keys(S), site: Object.keys(site) });
  for (const key of Object.keys(S)) {
    const s = S[key];
    const c = site[key] || {};
    const same = s.kind === c.kind && (s.monthly || 0) === (c.monthly || 0) && s.setup === c.setup && (s.yearly || 0) === (c.yearly || 0)
      && (s.cycles || 0) === (c.cycles || 0);
    check(`${key}: the server charges what src/lib/pricing.ts prints (monthly, setup, yearly, term)`, same, { server: s, site: c });
  }
  check("the numbers Mehdi chose: Rs 899 + Rs 2,999 and Rs 1,999 + Rs 2,999 for 12 months, Rs 8,999 a year",
    P.starter.monthly === 899 && P.starter.setup === 2999 && P.growth.monthly === 1999 && P.growth.setup === 2999
      && P.starter.months === 12 && P.growth.months === 12 && y?.price === 8999, P);
  check("day 1: Starter Rs 3,898, Growth Rs 4,998, yearly Rs 11,998 (setup applies)",
    lib.amountToday("starter") === 389800 && lib.amountToday("growth") === 499800 && lib.amountToday("starter-yearly") === (y?.setupApplies ? 1199800 : 899900));
  check("12-month totals: Starter Rs 13,787, Growth Rs 26,987", pricing.firstYearTotal(P.starter) === 13787 && pricing.firstYearTotal(P.growth) === 26987);
  check("the GST line is FACTS.md's, word for word", pricing.GST_LINE === "GST not applicable. Supplier is not registered under GST.");
}

/* ───────────────────────── 7. The admin lists ───────────────────────── */

console.log("\n7. /admin/payments: events into subscriptions and payments\n");
if (eventsTs) {
  const row = (o) => ({
    event_id: o.id, event: o.event, mode: "test", subscription_id: null, subscription_status: null, plan_id: null, paid_count: null,
    total_count: null, remaining_count: null, payment_id: null, payment_status: null, method: null, amount: null, currency: null,
    error_description: null, order_id: null, invoice_id: null, payment_link_id: null, plan_key: null, business: null,
    customer_name: null, customer_phone: null, customer_email: null, event_at: null, received_at: "2026-10-01T10:00:00+00:00", ...o,
  });
  // Delivered out of order: the halted event arrives before the charge that preceded it.
  const rows = [
    row({ id: "e3", event: "subscription.charged", subscription_id: "sub_A", subscription_status: "active", paid_count: 2, total_count: 12,
      payment_id: "pay_2", payment_status: "captured", amount: 89900, currency: "INR", event_at: "2026-11-01T10:00:00+00:00", received_at: "2026-11-03T10:00:00+00:00" }),
    row({ id: "e4", event: "subscription.halted", subscription_id: "sub_A", subscription_status: "halted", paid_count: 2, total_count: 12,
      event_at: "2026-12-05T10:00:00+00:00", received_at: "2026-12-05T10:00:01+00:00" }),
    row({ id: "e1", event: "subscription.charged", subscription_id: "sub_A", subscription_status: "active", paid_count: 1, total_count: 12,
      payment_id: "pay_1", payment_status: "captured", amount: 389800, currency: "INR", plan_key: "starter", business: "Riverbend Dental Care",
      customer_name: "Asha Verma", event_at: "2026-10-01T10:00:00+00:00" }),
    row({ id: "e5", event: "payment.failed", payment_id: "pay_3", payment_status: "failed", amount: 1199800, currency: "INR",
      error_description: "Payment was declined by the bank", order_id: "order_X", event_at: "2026-10-02T10:00:00+00:00" }),
    row({ id: "e6", event: "payment_link.paid", payment_id: "pay_4", payment_status: "captured", amount: 14900, currency: "USD",
      payment_link_id: "plink_1", event_at: "2026-10-03T10:00:00+00:00" }),
  ];
  const subs = eventsTs.subscriptionsOf(rows);
  check("one line per subscription", subs.length === 1, subs);
  check("its state is the newest by Razorpay's event time (halted), not by arrival", subs[0]?.status === "halted", subs[0]);
  check("paid count is the highest seen; business and plan come from the checkout notes",
    subs[0]?.paid === 2 && subs[0]?.total === 12 && subs[0]?.business === "Riverbend Dental Care" && subs[0]?.plan === "starter", subs[0]);
  const pays = eventsTs.paymentsOf(rows);
  check("one line per payment, newest first", pays.map((p) => p.id).join(",") === "pay_2,pay_4,pay_3,pay_1", pays.map((p) => p.id));
  check("a failed payment carries Razorpay's reason", pays.find((p) => p.id === "pay_3")?.error === "Payment was declined by the bank");
  check("amounts read as rupees, and USD as USD", eventsTs.money(389800, "INR") === "₹3,898" && eventsTs.money(14900, "USD") === "USD 149.00",
    [eventsTs.money(389800, "INR"), eventsTs.money(14900, "USD")]);

  // A sign-up: three events stamped in the same second. The list comes newest-arrival first,
  // and the "authenticated" one happened to arrive last.
  const same = "2026-10-05T08:00:00+00:00";
  const signUp = [
    row({ id: "s3", event: "subscription.authenticated", subscription_id: "sub_B", subscription_status: "authenticated", event_at: same, received_at: "2026-10-05T08:00:03+00:00" }),
    row({ id: "s2", event: "subscription.activated", subscription_id: "sub_B", subscription_status: "active", event_at: same, received_at: "2026-10-05T08:00:02+00:00" }),
    row({ id: "s1", event: "subscription.charged", subscription_id: "sub_B", subscription_status: "active", paid_count: 1, total_count: 12,
      payment_id: "pay_B1", payment_status: "captured", amount: 499800, currency: "INR", event_at: same, received_at: "2026-10-05T08:00:01+00:00" }),
  ];
  const b = eventsTs.subscriptionsOf(signUp)[0];
  check("a same-second sign-up reads 'active' (the later step wins the tie), not 'authenticated'",
    b?.status === "active" && b?.lastEvent === "subscription.charged" && b?.paid === 1, b);
}

/* ───────────────────────── 8. Where the secrets are not ───────────────────────── */

console.log("\n8. Secrets stay on the server; nobody can write a payment row\n");
{
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|mjs|jsx)$/.test(name)) files.push(p);
    }
  };
  walk(join(ROOT, "src"));
  // Naming the variable in a sentence for Mehdi is fine; READING a secret in browser code is not.
  const reads = /import\.meta\.env\.\w*(SECRET|WEBHOOK)|process\.env\.RAZORPAY|VITE_RAZORPAY_(KEY_SECRET|WEBHOOK|SECRET)/;
  const hits = files.filter((f) => reads.test(readFileSync(f, "utf8")));
  check("no file in src/ (the browser bundle) reads a secret: no VITE_ secret, no process.env.RAZORPAY_*", hits.length === 0, hits);
  const keyIdReads = files.filter((f) => /import\.meta\.env\.VITE_RAZORPAY/.test(readFileSync(f, "utf8"))).map((f) => f.slice(ROOT.length + 1).replace(/\\/g, "/"));
  check("the only Razorpay value the browser reads is the public key id, in one place",
    keyIdReads.length === 1 && keyIdReads[0] === "src/lib/payments/client.ts"
      && !/import\.meta\.env\.VITE_RAZORPAY_(?!KEY_ID\b)/.test(readFileSync(join(ROOT, "src/lib/payments/client.ts"), "utf8")), keyIdReads);

  const oldWays = files.filter((f) => /set_payment_webhook_secret|payment_webhook_status|generateSecret|saveWebhookSecret/.test(readFileSync(f, "utf8")));
  check("no page in src/ types, generates or sends a webhook secret", oldWays.length === 0
    && !/type=\{?["'`]?password|type=\{shown/.test(readFileSync(join(ROOT, "src/pages/admin/AdminPayments.tsx"), "utf8")), oldWays);

  const apiFiles = ["api/_lib/razorpay.js", "api/_lib/supabaseRest.js", "api/razorpay/status.js", "api/razorpay/create-subscription.js",
    "api/razorpay/create-order.js", "api/razorpay/verify.js", "api/razorpay/webhook.js", "api/razorpay/connect.js"].map((f) => [f, readFileSync(join(ROOT, f), "utf8")]);
  const logged = apiFiles.flatMap(([f, src]) => src.split("\n").filter((l) => /console\.(log|error|warn)/.test(l)
    && /keySecret|webhookSecret\(|ingestToken|ingestHash|\$\{secret|\$\{token|\$\{signature|\bbody\b\)|\braw\b/.test(l)).map((l) => `${f}: ${l.trim()}`));
  check("no log line in api/ prints a secret, a token, a fingerprint, a signature or a body", logged.length === 0, logged);

  const sql = readFileSync(join(ROOT, "supabase/migrations/0010_payments.sql"), "utf8");
  const code = sql.replace(/\r\n/g, "\n").replace(/--[^\n]*/g, ""); // the statements, without the comments
  const all = readFileSync(join(ROOT, "supabase/SETUP_ALL.sql"), "utf8").replace(/\r\n/g, "\n");
  check("0010 takes every default grant back from anon and authenticated",
    /revoke all on table public\.payment_events\s+from anon, authenticated;/.test(code) && /revoke all on table public\.payment_settings from anon, authenticated;/.test(code));
  check("0010 lets the admin read and delete, and nobody insert or update",
    /grant select, delete on table public\.payment_events to authenticated;/.test(code) && !/for (insert|update|all)/i.test(code) && !/grant[^;]*(insert|update)[^;]*payment_/i.test(code));
  check("0010's functions are SECURITY DEFINER with a pinned search_path",
    (code.match(/security definer\s*\n\s*set search_path = /g) || []).length === 3, (code.match(/security definer/g) || []).length);
  const tokenCheck = code.indexOf("sha256(convert_to(p_token, 'UTF8'))");
  check("0010's webhook function checks the token's SHA-256 against the stored fingerprint before it inserts",
    tokenCheck > 0 && tokenCheck < code.indexOf("insert into public.payment_events") && code.indexOf("v_expected") < tokenCheck);
  check("0010 keeps no secret: no secret column, no argument that takes one",
    !/webhook_secret|key_secret|p_secret|p_signature/i.test(code) && /ingest_sha256 text not null check \(ingest_sha256 ~ '\^\[0-9a-f\]\{64\}\$'\)/.test(code));
  check("0010 grants record_payment_event to anon only, and connect and status to authenticated only",
    /grant execute on function public\.record_payment_event\(text, text, text, text\) to anon;/.test(code)
      && /grant execute on function public\.set_payment_ingest\(text\) to authenticated;/.test(code)
      && /grant execute on function public\.payment_ingest_status\(text\) to authenticated;/.test(code)
      && (code.match(/revoke all on function [^;]+ from public, anon, authenticated;/g) || []).length === 3);
  const rest = readFileSync(join(ROOT, "api/_lib/supabaseRest.js"), "utf8");
  check("the arguments the server sends are the ones 0010 declares",
    /p_token: token, p_event_id: eventId, p_body: body, p_mode:/.test(rest) && /\{ p_sha256: sha256 \}/.test(rest) && /\{ p_sha256: sha256 \|\| null \}/.test(rest)
      && /record_payment_event\(\s*p_token\s+text,\s*p_event_id text,\s*p_body\s+text,\s*p_mode\s+text default null\s*\)/.test(code)
      && /set_payment_ingest\(p_sha256 text\)/.test(code) && /payment_ingest_status\(p_sha256 text default null\)/.test(code));
  check("SETUP_ALL.sql carries 0010 exactly as the migration file", all.includes(sql.replace(/\r\n/g, "\n").trim()));
}

console.log(`\n${fails.length ? `${fails.length} FAILED` : "all passed"}${NEGATIVE ? " (negative run: failures expected)" : ""}`);
process.exit(fails.length ? 1 : 0);
