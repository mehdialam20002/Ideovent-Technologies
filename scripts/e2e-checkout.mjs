/**
 * The Razorpay checkout, end to end in a real browser, with Razorpay mocked.
 *
 *   node scripts/e2e-checkout.mjs
 *
 * It starts its own Vite dev server, one at a time (E2E_PORT, default 5463,
 * strictPort), with no file watcher and no HMR, so other people's saves in
 * src/ never reload a page mid-scenario, and with its own dependency cache, so
 * it never rewrites the cache another dev server on this project is using.
 *
 *   A. VITE_RAZORPAY_KEY_ID = a fake LIVE key id: /pricing shows the pay step.
 *      pricing -> Starter -> "Continue to payment" -> /checkout/starter -> form
 *      -> checkout.js (mocked) -> our verify -> the success page; Growth failing
 *      -> the failed page; the yearly order dismissed -> back on the form; the
 *      server saying "off" -> the WhatsApp fallback; checkout.js blocked -> the
 *      hosted Razorpay page; /admin/payments -> "Connect" sends the admin's
 *      session and no secret, and the card turns to "connected".
 *   B. No key id: /pricing says "coming soon" and offers WhatsApp, and the
 *      checkout, whose /api does not exist under Vite, falls back by itself.
 *
 * NOTHING LEAVES THE MACHINE. /api/razorpay/* and checkout.razorpay.com are
 * answered by page.route; a request to api.razorpay.com fails the run.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   E2E_NEGATIVE=1 node scripts/e2e-checkout.mjs
 *
 * makes the mocked verify endpoint refuse the payment. The page must then not
 * say "Payment received", the success checks fail, and the run exits 1. If it
 * passes, the checks are not reading the page.
 *
 * E2E_SHOTS=<folder> also saves the checkout and the result pages at 390 and
 * 1280 px.
 */
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const PORT = Number(process.env.E2E_PORT || 5463);
const BASE = `http://127.0.0.1:${PORT}`;
const NEGATIVE = Boolean(process.env.E2E_NEGATIVE);
const SHOTS = process.env.E2E_SHOTS || "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/* Fictional. Not a real Razorpay key. */
const FAKE_LIVE_KEY = "rzp_live_E2EFAKEKEY0001";
const SUB_ID = "sub_E2E00000000001";
const ORDER_ID = "order_E2E000000001";
const PAY_ID = "pay_E2E00000000001";

const fails = [];
const check = (ok, label, detail) => {
  console.log(`${ok ? "ok   " : "FAIL "} ${label}${!ok && detail !== undefined ? `\n        ${String(detail).slice(0, 300)}` : ""}`);
  if (!ok) fails.push(label);
};

async function startVite(withKey) {
  // process.env wins over .env files in Vite, so "" also overrides a key in a local .env.
  process.env.VITE_RAZORPAY_KEY_ID = withKey ? FAKE_LIVE_KEY : "";
  const server = await createServer({
    root: ROOT,
    configFile: join(ROOT, "vite.config.ts"),
    cacheDir: join(tmpdir(), "ideovent-e2e-checkout-vite"),
    logLevel: "error",
    clearScreen: false,
    // watch: null turns the file watcher off altogether (Vite 5.1+), not just its reloads.
    // It is set from a config hook because an inline server.watch: null is dropped: Vite
    // merges this inline config over vite.config.ts, and mergeConfig skips null values, so
    // the watcher stayed on (found 2 Oct 2026, Vite 5.4.10).
    plugins: [{ name: "e2e-watch-off", config(c) { c.server = { ...c.server, watch: null }; } }],
    server: { host: "127.0.0.1", port: PORT, strictPort: true, hmr: false },
  });
  await server.listen();
  return server;
}

async function launch() {
  const cands = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  for (const p of cands) {
    try {
      return await chromium.launch({ executablePath: p, headless: true });
    } catch {
      /* try the next one */
    }
  }
  return chromium.launch({ channel: "chrome", headless: true });
}

/**
 * Razorpay's checkout.js, faked. The scenario is read from window.__rzpScenario
 * at open(): "success" calls the handler, "fail" reports payment.failed and
 * then closes, "dismiss" just closes. Every option the page passed is kept on
 * window.__rzp for the assertions.
 */
const FAKE_CHECKOUT_JS = `
window.Razorpay = function (opts) {
  var handlers = {};
  window.__rzp = { opts: opts, handlers: handlers };
  this.on = function (ev, cb) { handlers[ev] = cb; };
  this.open = function () {
    window.__rzpOpened = (window.__rzpOpened || 0) + 1;
    var mode = window.__rzpScenario || "success";
    setTimeout(function () {
      if (mode === "success") {
        opts.handler({ razorpay_payment_id: "${PAY_ID}", razorpay_subscription_id: opts.subscription_id,
          razorpay_order_id: opts.order_id, razorpay_signature: "${"ab".repeat(32)}" });
      } else if (mode === "fail") {
        handlers["payment.failed"]({ error: { code: "BAD_REQUEST_ERROR", description: "Your card was declined (e2e)",
          metadata: { payment_id: "pay_E2EFAILED000001" } } });
        opts.modal.ondismiss();
      } else {
        opts.modal.ondismiss();
      }
    }, 60);
  };
};`;

/**
 * Our own /api/razorpay/*, answered in the browser. `status` is what the
 * server would say; `create` overrides the create answer (for the 503 case).
 * Returns the log of what the page sent.
 */
async function mockPayments(page, { status = "on", create = null, blockCheckoutJs = false } = {}) {
  const log = { status: 0, create: [], verify: [], checkoutJs: 0, razorpayApi: 0 };
  const json = (route, code, body) => route.fulfill({ status: code, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/razorpay/status", (route) => {
    log.status++;
    return json(route, 200, status === "on"
      ? { enabled: true, mode: "live", keyId: FAKE_LIVE_KEY, plans: { starter: true, growth: true, "starter-yearly": true }, webhook: true }
      : { enabled: false, plans: { starter: false, growth: false, "starter-yearly": false }, webhook: false });
  });
  await page.route(/\/api\/razorpay\/create-(subscription|order)$/, (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    const kind = route.request().url().endsWith("create-order") ? "order" : "subscription";
    log.create.push({ kind, body });
    if (create) return json(route, create.status, create.body);
    const today = { starter: 389800, growth: 499800, "starter-yearly": 1199800 }[body.plan];
    return json(route, 200, kind === "subscription"
      ? { ok: true, plan: body.plan, mode: "live", keyId: FAKE_LIVE_KEY, subscriptionId: SUB_ID, shortUrl: "https://rzp.io/rzp/e2e-hosted",
          amountToday: today, description: `${body.plan === "growth" ? "Growth" : "Starter"} plan: Rs ${today === 389800 ? "3,898" : "4,998"} today` }
      : { ok: true, plan: body.plan, mode: "live", keyId: FAKE_LIVE_KEY, orderId: ORDER_ID, amount: today, currency: "INR",
          description: "Starter plan, 12 months upfront: Rs 8,999 + Rs 2,999 setup = Rs 11,998" });
  });
  await page.route("**/api/razorpay/verify", (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    log.verify.push(body);
    return NEGATIVE
      ? json(route, 400, { ok: false, error: "This payment could not be confirmed." })
      : json(route, 200, { ok: true, plan: body.plan, paymentId: body.razorpay_payment_id, status: "active" });
  });
  await page.route("https://checkout.razorpay.com/**", (route) => {
    log.checkoutJs++;
    if (blockCheckoutJs) return route.abort();
    return route.fulfill({ status: 200, contentType: "application/javascript", body: FAKE_CHECKOUT_JS });
  });
  await page.route("https://api.razorpay.com/**", (route) => {
    log.razorpayApi++;
    return route.abort();
  });
  await page.route("https://rzp.io/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Razorpay hosted page (e2e stub)</title><h1>hosted</h1>" }));
  // Nothing else leaves the machine either.
  await page.route(/emailjs|supabase\.co|googletagmanager|google-analytics/, (route) => route.abort());
  return log;
}

async function fill(page, { name = "Asha Verma", business = "Riverbend Dental Care", phone = "98765 43210", email = "asha@example.com", agree = true } = {}) {
  await page.fill("#co-name", name);
  await page.fill("#co-business", business);
  await page.fill("#co-phone", phone);
  await page.fill("#co-email", email);
  if (agree) await page.check("#co-agree");
}

const payButton = (page) => page.locator('form button[type="submit"]');
const h1 = async (page) => (await page.locator("h1").first().innerText().catch(() => "")).trim();

async function shot(page, name) {
  if (!SHOTS) return;
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(SHOTS, `${name}-${w}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

const newPage = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
};

/* ───────────────────────── A. Pay step on ───────────────────────── */

async function scenarioA(browser) {
  console.log("\nA. A live key id in the build: the pay step is on\n");

  // 1. From /pricing to a confirmed Starter payment.
  {
    const { ctx, page, errors } = await newPage(browser);
    const log = await mockPayments(page);
    await page.goto(BASE + "/pricing", { waitUntil: "networkidle" });
    check(log.checkoutJs === 0, "the pricing page does not load checkout.js");

    const start = page.getByRole("button", { name: /Start with ₹899\/month/ }).first();
    check((await start.count()) === 1, "/pricing has a 'Start with ₹899/month' button on the Starter plan");
    if (await start.count()) await start.click();
    const cont = page.locator('a[href="/checkout/starter"]').first();
    await cont.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    check(await cont.isVisible().catch(() => false), "the start step offers a link to /checkout/starter");
    if (await cont.isVisible().catch(() => false)) await cont.click();
    else await page.goto(BASE + "/checkout/starter");
    await page.waitForURL("**/checkout/starter", { timeout: 10000 }).catch(() => {});
    check(page.url().endsWith("/checkout/starter"), "it opens /checkout/starter", page.url());

    await payButton(page).waitFor({ timeout: 15000 }).catch(() => {});
    check((await h1(page)) === "Start the Starter website plan", "the checkout names the plan in its h1", await h1(page));
    const summary = await page.locator("#plan-summary-title").locator("xpath=..").innerText().catch(() => "");
    check(/₹899\s*a month/.test(summary) && /\+ ₹2,999 one-time setup · 12-month plan/.test(summary),
      "the monthly price stands with its setup fee and its 12-month term", summary.slice(0, 200));
    check(/Today\s*₹3,898/.test(summary) && /12-month total\s*₹13,787/.test(summary) && /₹899 a month, 11 more months/.test(summary),
      "today's ₹3,898, then 11 x ₹899, and the ₹13,787 total are spelled out before paying", summary.slice(0, 400));
    check(/not in this price/.test(summary) && /GST not applicable\. Supplier is not registered under GST\./.test(summary),
      "the domain cost and the GST line are stated", summary.slice(-500));
    check(await payButton(page).isEnabled(), "the pay button is on once the server says payment is on");
    check((await payButton(page).innerText()).trim() === "Pay ₹3,898 with Razorpay", "the button says the exact amount", await payButton(page).innerText());
    check(log.checkoutJs === 0, "checkout.js is still not loaded before Pay is pressed");
    await shot(page, "checkout-starter");

    // An empty form: every field says what is missing, nothing is created.
    await payButton(page).click();
    await page.waitForTimeout(200);
    const alerts = await page.locator('[id$="-error"]').allInnerTexts();
    check(alerts.length >= 4 && log.create.length === 0, "an empty form shows four errors and starts nothing", alerts.join(" | "));

    await fill(page);
    await payButton(page).click();
    await page.waitForURL("**/checkout/starter/success", { timeout: 15000 }).catch(() => {});
    // The URL changes first; the result page is a lazy chunk and renders a moment later.
    await page.waitForSelector("h1[data-outcome]", { timeout: 15000 }).catch(() => {});
    const opts = await page.evaluate(() => window.__rzp && window.__rzp.opts).catch(() => null);
    check(log.create.length === 1 && log.create[0].kind === "subscription" && log.create[0].body.plan === "starter",
      "one create-subscription call for the Starter plan", JSON.stringify(log.create));
    check(log.create[0]?.body.phone === "+919876543210" && log.create[0]?.body.business === "Riverbend Dental Care" && !("amount" in (log.create[0]?.body || {})),
      "the form's details are sent, the phone normalised, and no amount", JSON.stringify(log.create[0]?.body));
    check(log.checkoutJs === 1, "checkout.js is loaded once, on Pay", log.checkoutJs);
    check(opts?.key === FAKE_LIVE_KEY && opts?.subscription_id === SUB_ID && opts?.amount === undefined && opts?.order_id === undefined,
      "Razorpay opens with the server's key id and subscription id, and no amount", JSON.stringify(opts));
    check(opts?.prefill?.contact === "+919876543210" && opts?.name === "Ideovent Technologies" && /Rs 3,898 today/.test(opts?.description || ""),
      "Checkout is prefilled and its description repeats today's amount", JSON.stringify(opts?.prefill) + " " + opts?.description);
    check(log.verify.length === 1 && log.verify[0].subscriptionId === SUB_ID && log.verify[0].razorpay_payment_id === PAY_ID
      && /^[a-f0-9]{64}$/.test(log.verify[0].razorpay_signature), "the handler's answer goes to our verify, with OUR subscription id", JSON.stringify(log.verify));
    check(page.url().endsWith("/checkout/starter/success"), "a confirmed payment lands on the success page", page.url());
    check((await h1(page)) === "Payment received", "the success page says 'Payment received'", await h1(page));
    const body = await page.locator("main").innerText();
    check(body.includes(PAY_ID) && /within two working days/.test(body) && /bank or UPI app tells you/.test(body),
      "it shows the payment id and what happens next", body.slice(0, 300));
    check(log.razorpayApi === 0, "the browser never called Razorpay's API itself");
    check(errors.length === 0, "no page errors", errors.join(" | "));
    await shot(page, "success-starter");
    await ctx.close();
  }

  // 2. Growth, the card refused, the customer closes Razorpay: the failed page.
  {
    const { ctx, page } = await newPage(browser);
    const log = await mockPayments(page);
    await page.addInitScript(() => { window.__rzpScenario = "fail"; });
    await page.goto(BASE + "/checkout/growth", { waitUntil: "networkidle" });
    check((await payButton(page).innerText().catch(() => "")).trim() === "Pay ₹4,998 with Razorpay", "Growth: the button says ₹4,998");
    await fill(page);
    await payButton(page).click();
    await page.waitForURL("**/checkout/growth/failed", { timeout: 15000 }).catch(() => {});
    await page.waitForSelector("h1[data-outcome]", { timeout: 15000 }).catch(() => {});
    check(page.url().endsWith("/checkout/growth/failed"), "a failed attempt, then closing Razorpay, lands on the failed page", page.url());
    const body = await page.locator("main").innerText().catch(() => "");
    check((await h1(page)) === "Payment not completed" && /Your card was declined \(e2e\)/.test(body) && body.includes("pay_E2EFAILED000001"),
      "it says why, in Razorpay's words, with the payment id", body.slice(0, 300));
    check((await page.locator('a[href="/checkout/growth"]').count()) > 0 && (await page.locator('a[href^="https://wa.me/917761921786"]').count()) > 0,
      "it offers Try again and the WhatsApp way to pay");
    check(log.verify.length === 0, "nothing was sent to verify for a failed payment");
    await shot(page, "failed-growth");
    await ctx.close();
  }

  // 3. The yearly plan is one order; closing Razorpay without paying keeps the form.
  {
    const { ctx, page } = await newPage(browser);
    const log = await mockPayments(page);
    await page.addInitScript(() => { window.__rzpScenario = "dismiss"; });
    await page.goto(BASE + "/checkout/starter-yearly", { waitUntil: "networkidle" });
    const summary = await page.locator("#plan-summary-title").locator("xpath=..").innerText().catch(() => "");
    check(/₹8,999\s*for 12 months/.test(summary) && /\+ ₹2,999 one-time setup · paid once/.test(summary) && /Nothing renews automatically/.test(summary),
      "yearly: ₹8,999 for 12 months + ₹2,999 setup, paid once, nothing renews", summary.slice(0, 300));
    await fill(page);
    await payButton(page).click();
    await page.waitForSelector("form [role=status]", { timeout: 15000 }).catch(() => {});
    const opts = await page.evaluate(() => window.__rzp && window.__rzp.opts).catch(() => null);
    check(log.create[0]?.kind === "order" && log.create[0]?.body.plan === "starter-yearly", "yearly: create-order is called", JSON.stringify(log.create));
    check(opts?.order_id === ORDER_ID && opts?.amount === 1199800 && opts?.currency === "INR" && !opts?.subscription_id,
      "yearly: Razorpay opens on our order for ₹11,998", JSON.stringify(opts));
    const notice = await page.locator("form [role=status]").innerText().catch(() => "");
    check(page.url().endsWith("/checkout/starter-yearly") && /Payment not completed/.test(notice) && (await payButton(page).isEnabled()),
      "closing Razorpay without paying keeps the customer on the form, with a way to try again", notice);
    await ctx.close();
  }

  // 4. The server says online payment is off: the WhatsApp fallback, and no pay button.
  {
    const { ctx, page } = await newPage(browser);
    const log = await mockPayments(page, { status: "off" });
    await page.goto(BASE + "/checkout/starter", { waitUntil: "networkidle" });
    await page.waitForSelector("[data-pay-fallback]", { timeout: 10000 }).catch(() => {});
    const box = await page.locator("[data-pay-fallback]").innerText().catch(() => "");
    const wa = await page.locator("[data-pay-fallback] a").first().getAttribute("href").catch(() => "");
    check(/Online payment is coming soon/.test(box) && /Pay by UPI or bank transfer on WhatsApp/.test(box) && (await payButton(page).count()) === 0,
      "server off: 'coming soon', the WhatsApp button, no pay button", box);
    check(/^https:\/\/wa\.me\/917761921786\?text=/.test(wa || "") && decodeURIComponent(wa || "").includes("Starter website plan (₹899 a month + ₹2,999 one-time setup, 12-month plan)"),
      "the WhatsApp message names the plan with its setup fee and term", decodeURIComponent(wa || ""));
    check(log.create.length === 0 && log.checkoutJs === 0, "nothing was started and checkout.js never loaded");
    await shot(page, "checkout-off");
    await ctx.close();
  }

  // 5. The server refuses at create time (plan not configured): the page falls back, it does not break.
  {
    const { ctx, page, errors } = await newPage(browser);
    const log = await mockPayments(page, { create: { status: 503, body: { ok: false, enabled: false, fallback: true, error: "Online payment is not available for this plan yet." } } });
    await page.goto(BASE + "/checkout/starter", { waitUntil: "networkidle" });
    await fill(page);
    await payButton(page).click();
    await page.waitForSelector("[data-pay-fallback]", { timeout: 10000 }).catch(() => {});
    const box = await page.locator("[data-pay-fallback]").innerText().catch(() => "");
    check(/not available for this plan yet/.test(box) && /Pay by UPI or bank transfer on WhatsApp/.test(box) && log.checkoutJs === 0,
      "a 503 from create turns the form into the WhatsApp fallback, with the reason", box);
    check(errors.length === 0, "no page errors", errors.join(" | "));
    await ctx.close();
  }

  // 6. checkout.js blocked (an ad blocker, a bad network): the subscription's hosted Razorpay page.
  {
    const { ctx, page } = await newPage(browser);
    await mockPayments(page, { blockCheckoutJs: true });
    await page.goto(BASE + "/checkout/starter", { waitUntil: "networkidle" });
    await fill(page);
    await payButton(page).click();
    await page.waitForURL("https://rzp.io/**", { timeout: 20000 }).catch(() => {});
    check(page.url().startsWith("https://rzp.io/rzp/e2e-hosted"), "checkout.js blocked: the customer goes to Razorpay's hosted page for the same subscription", page.url());
    await ctx.close();
  }

  // 7. The admin's Payments screen, in local mode (no Supabase in this dev server). The page
  //    sends a stand-in session there, so /api/razorpay/connect is answered by a mock.
  {
    const { ctx, page, errors } = await newPage(browser);
    await mockPayments(page);
    const connects = [];
    let connected = false;
    await page.route("**/api/razorpay/connect", (route) => {
      const req = route.request();
      connects.push({ method: req.method(), auth: req.headers()["authorization"] || "", body: req.postData() || "" });
      if (req.method() === "POST") connected = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, webhookSecret: true,
        connected, current: connected, connectedAt: connected ? "2026-10-01T09:30:00+00:00" : null }) });
    });
    await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.setItem("ideovent_admin_session", "1"));
    await page.goto(BASE + "/admin/payments", { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText().catch(() => "");
    check((await page.getByRole("heading", { name: "Payments", level: 1 }).count()) === 1 && /Razorpay keys on the server: yes, LIVE mode/.test(text) && /local mode/.test(text),
      "/admin/payments shows the payment status and says it is in local mode", text.slice(0, 400));
    check((await page.locator('a[href="/admin/payments"]').count()) > 0, "the admin menu links to it");
    check(/Webhook connected to the database: not connected yet/.test(text) && (await page.locator("section[aria-labelledby=\"pay-setup\"] input").count()) === 0,
      "it says the webhook is not connected yet, and has no field to type a secret into", text.slice(0, 600));
    const button = page.getByTestId("connect-webhook");
    check(await button.isEnabled().catch(() => false), "the Connect button is on");
    await button.click().catch(() => {});
    await page.waitForSelector("section[aria-labelledby=\"pay-setup\"] [role=status]", { timeout: 10000 }).catch(() => {});
    const after = await page.locator("section[aria-labelledby=\"pay-setup\"]").innerText().catch(() => "");
    const post = connects.find((c) => c.method === "POST");
    check(Boolean(post) && /^Bearer \S+/.test(post.auth) && (post.body === "" || post.body === "{}"),
      "Connect sends the admin's session and nothing else: no secret in the request", JSON.stringify(connects));
    check(/Webhook connected to the database: connected/.test(after) && /Connected\. Razorpay's events are now saved here\./.test(after)
      && /Connect again/.test(after), "after Connect the card says connected", after.slice(0, 700));
    await shot(page, "admin-payments");
    check(errors.length === 0, "no page errors", errors.join(" | "));
    await ctx.close();
  }
}

/* ───────────────────────── B. No key id: WhatsApp everywhere ───────────────────────── */

async function scenarioB(browser) {
  console.log("\nB. No Razorpay key id in the build\n");
  const { ctx, page, errors } = await newPage(browser);
  // Only checkout.js is mocked here: /api/razorpay/status is left to Vite, which has no /api.
  let checkoutJs = 0;
  await page.route("https://checkout.razorpay.com/**", (route) => { checkoutJs++; return route.abort(); });
  await page.route(/emailjs|supabase\.co/, (route) => route.abort());
  await page.goto(BASE + "/pricing", { waitUntil: "networkidle" });
  // Read it where a visitor reads it: scrolled to. The note sits in a section below the
  // first screen, and since 2 Oct 2026 those render as they come near the viewport
  // (content-visibility: auto, src/index.css). Chrome's innerText of a section it has not
  // rendered yet is "", which is not what anybody scrolling down sees; the section
  // renders on the next frame after it comes into view, so wait two frames first.
  const soonNote = page.locator('[data-testid="pay-coming-soon"]');
  await soonNote.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const soon = await soonNote.innerText().catch(() => "");
  check(/coming soon/i.test(soon), "/pricing says online payment is coming soon", soon);
  check((await page.locator('a[href^="/checkout/"]').count()) === 0, "/pricing links to no checkout");
  check((await page.locator('#start a[href^="https://wa.me/917761921786"]').count()) > 0, "/pricing's start step offers WhatsApp");

  await page.goto(BASE + "/checkout/growth", { waitUntil: "networkidle" });
  await page.waitForSelector("[data-pay-fallback]", { timeout: 10000 }).catch(() => {});
  const box = await page.locator("[data-pay-fallback]").innerText().catch(() => "");
  check(/Pay by UPI or bank transfer on WhatsApp/.test(box) && (await payButton(page).count()) === 0,
    "a checkout address opened anyway falls back to WhatsApp by itself (no /api here)", box);
  check(checkoutJs === 0, "checkout.js was never requested");
  check(errors.length === 0, "no page errors", errors.join(" | "));
  await ctx.close();
}

/* ───────────────────────── Run ───────────────────────── */

/** The first visit makes Vite optimise dependencies into its own cache: slow once, then quick. */
async function warmUp(browser) {
  const { ctx, page } = await newPage(browser);
  await page.route(/emailjs|supabase\.co|checkout\.razorpay\.com|api\.razorpay\.com/, (route) => route.abort());
  for (const path of ["/pricing", "/checkout/starter", "/checkout/starter/success", "/admin/login"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 240000 }).catch((e) => console.log(`(warm-up ${path}: ${e.message.split("\n")[0]})`));
  }
  await ctx.close();
}

const browser = await launch();
let vite = null;
try {
  vite = await startVite(true);
  await warmUp(browser);
  await scenarioA(browser);
  await vite.close();
  vite = null;

  vite = await startVite(false);
  await warmUp(browser);
  await scenarioB(browser);
} catch (e) {
  check(false, "the run finished without an exception", e && e.stack ? e.stack : e);
} finally {
  if (vite) await vite.close().catch(() => {});
  await browser.close().catch(() => {});
}

console.log(`\n${fails.length ? `${fails.length} FAILED` : "all checkout checks pass"}${NEGATIVE ? " (negative run: failures expected)" : ""}`);
process.exit(fails.length ? 1 : 0);
