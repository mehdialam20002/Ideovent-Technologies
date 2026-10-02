/**
 * End to end test of the enquiry pop-up and the lead pipeline.
 *
 *   node scripts/e2e-lead-popup.mjs [baseUrl]        default http://localhost:5199
 *   node scripts/e2e-lead-popup.mjs --no-negative    skip the negative control
 *
 * WHAT IT PROVES, in a real browser, with Playwright's fake clock standing in
 * for the minute of reading (page.clock.runFor), so a 60 second rule is tested
 * in a few seconds without the test going soft on it:
 *
 *   1. Nothing before 60s of engaged time; the card appears at 60s on /, and
 *      its code is not even downloaded before then. It does not take focus.
 *   2. Time with the tab hidden does not count.
 *   3. Engaged time adds up across pages within one visit.
 *   4. Dismissed means never again: close, reload, wait 120s, go to another
 *      page, wait 120s. Also: focus goes back where it was, and Escape works.
 *   5. Never on /contact, /site/x, /pitch/x, a bare pitch slug, /admin,
 *      /verify, a legal page, /internship or a "not found" detail page.
 *   6. Success, with api.emailjs.com mocked 200: the thank-you names who
 *      replies and how fast, the e-mail carries the new fields, and the card
 *      never comes back. The optional second step sends too.
 *   7. Failure, with api.emailjs.com mocked 412 (what it really returns today,
 *      "Gmail_API: Invalid grant"): the error is plain, the fields keep what
 *      was typed, and the WhatsApp link comes first, prefilled.
 *   8. The contact form: error summary, success suppresses the pop-up,
 *      failure keeps the fields and offers WhatsApp.
 *   9. Spam guards: a filled honeypot and a sub-3-second send reach nobody and
 *      never show a thank-you.
 *  10. Reduced motion: the card appears without movement.
 *  11. On a phone the sheet never passes 75% of the viewport height (60%
 *      until 26 Sep 2026, which hid Send on a 640px-tall phone).
 *  12. On a 390x640 and a 360x640 phone, Send and the phone field are on
 *      screen and uncovered without any scrolling.
 *
 * NOTHING REAL IS SENT. Every page aborts *.supabase.co, and api.emailjs.com
 * is either mocked (tests 6 to 9) or aborted (everything else).
 *
 * THE NEGATIVE CONTROL. A test that cannot fail proves nothing. After the main
 * run, this script starts a second dev server with
 * VITE_LEAD_POPUP_FORGET_DISMISSAL=1, which makes src/lib/leads.ts neither
 * write nor read the dismissal, and runs test 4 against it. Test 4 MUST fail
 * there. If it passes, the assertion is not reaching the behaviour and a
 * green run above means nothing, so the script exits 1.
 *
 * Hidden tabs: headless Chromium has no second window to switch to, so the
 * test overrides document.visibilityState and fires `visibilitychange`, which
 * are exactly the two things the timer reads.
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:\/\//.test(a)) || "http://localhost:5199").replace(/\/$/, "");
const RUN_NEGATIVE = !args.includes("--no-negative");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MEMORY_KEY = "ideovent.leadPopup.v1";
const ENGAGED_KEY = "ideovent.leadPopup.engagedMs.v1";
const CARD = "aside[aria-label='Quick enquiry']";
const EMAILJS = "https://api.emailjs.com/**";
const SUPABASE = /^https:\/\/[^/]+\.supabase\.co\//;

let failures = 0;
const log = [];
function check(ok, msg, detail = "") {
  const line = `${ok ? "ok  " : "FAIL"}  ${msg}${detail ? `  (${detail})` : ""}`;
  log.push(line);
  console.log(line);
  if (!ok) failures++;
  return ok;
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
  return await chromium.launch({ channel: "chrome", headless: true });
}

const browser = await launch();

/** A fresh visitor: new context (empty storage), fake clock, optional EmailJS mock. */
async function visitor({ base = BASE, width = 1280, height = 900, reducedMotion, emailStatus } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await ctx.newPage();
  const emails = [];
  const popupRequests = [];
  page.on("request", (r) => {
    // The card, not its timer: LeadPopupMount is in the entry chunk by design.
    if (/LeadPopup(?!Mount)/.test(r.url())) popupRequests.push(r.url());
  });
  // NOTHING REAL IS EVER SENT. Supabase is refused outright on every page,
  // and EmailJS is either answered by the mock below or refused, so a run can
  // never put a test enquiry in Mehdi's inbox or in the leads table, whatever
  // env the dev server was started with.
  await page.route(SUPABASE, (route) => route.abort());
  if (!emailStatus) await page.route(EMAILJS, (route) => route.abort());
  if (emailStatus) {
    await page.route(EMAILJS, async (route) => {
      let body = {};
      try {
        body = JSON.parse(route.request().postData() || "{}");
      } catch {
        /* not JSON */
      }
      emails.push(body);
      await route.fulfill({
        status: emailStatus,
        contentType: "text/plain",
        body: emailStatus === 200 ? "OK" : "Gmail_API: Invalid grant. Please reconnect your Gmail account",
      });
    });
  }
  await page.clock.install();
  /*
    The clock runs in real time while a page loads (timers, rAF and Helmet's
    head updates all need it), then is PAUSED, so nothing after the load
    counts unless the test says so. Engaged time that accrued during the load
    is read back from sessionStorage and the thresholds are measured from it.
  */
  const settleAndPause = async () => {
    await page.waitForSelector("#root > *", { state: "attached", timeout: 90000 });
    await page.waitForTimeout(900);
    const t = await page.evaluate(() => Date.now());
    // A margin, because the clock keeps running during this round trip and
    // pauseAt refuses a time that has already passed.
    await page.clock.pauseAt(t + 1500);
  };
  const go = async (path) => {
    await page.clock.resume();
    await page.goto(base + path, { waitUntil: "load", timeout: 90000 });
    await settleAndPause();
  };
  const reload = async () => {
    await page.clock.resume();
    await page.reload({ waitUntil: "load", timeout: 90000 });
    await settleAndPause();
  };
  const cardVisible = async () => (await page.locator(CARD).count()) > 0 && (await page.locator(CARD).isVisible());
  /** For checks that EXPECT the card: React reveals a Suspense boundary on a
      setTimeout, and the paused clock holds it, so step the clock a little
      while polling. Never used where the card must stay away. */
  const cardAppears = async () => {
    for (let i = 0; i < 15; i++) {
      if (await cardVisible()) return true;
      await page.clock.runFor(100);
      await page.waitForTimeout(150);
    }
    return cardVisible();
  };
  /** Same idea for any lazily rendered element. */
  const appears = async (selector) => {
    for (let i = 0; i < 30; i++) {
      if (await page.locator(selector).count()) return true;
      await page.clock.runFor(100);
      await page.waitForTimeout(150);
    }
    return (await page.locator(selector).count()) > 0;
  };
  const engaged = async () => Math.round(Number(await page.evaluate((k) => sessionStorage.getItem(k), ENGAGED_KEY)) / 1000);
  const memory = async () => page.evaluate((k) => localStorage.getItem(k), MEMORY_KEY);
  const engagedMs = async () => Number(await page.evaluate((k) => sessionStorage.getItem(k), ENGAGED_KEY)) || 0;
  /** Exactly `ms` of fake time. The last second is spent in two small steps
      with real waits between them, so a lazy import that started during the
      jump can arrive and its effects can run on the fake clock. */
  const advance = async (ms) => {
    let left = Math.max(0, ms - 1000);
    while (left > 0) {
      const step = Math.min(10000, left);
      await page.clock.runFor(step);
      await page.waitForTimeout(40);
      left -= step;
    }
    for (const step of [500, 500]) {
      await page.waitForTimeout(350);
      await page.clock.runFor(Math.min(step, ms));
    }
    await page.waitForTimeout(350);
  };
  /** Advance until the engaged total is `sec` seconds (never backwards). */
  const advanceToEngaged = async (sec) => advance(Math.max(1000, sec * 1000 - (await engagedMs())));
  const setVisibility = async (state) =>
    page.evaluate((s) => {
      if (!window.__visOverride) {
        window.__visOverride = { state: "visible" };
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => window.__visOverride.state });
        Object.defineProperty(document, "hidden", { configurable: true, get: () => window.__visOverride.state === "hidden" });
      }
      window.__visOverride.state = s;
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);
  return { ctx, page, emails, popupRequests, go, reload, cardVisible, cardAppears, appears, engaged, engagedMs, memory, advance, advanceToEngaged, setVisibility };
}

/**
 * Choose a need, type the website (or the business name) and a number, wait out
 * the 3 second guard, send. Since 26 Sep the first step asks for the website and
 * the number; the name moved to the optional second step.
 */
async function fillQuick(v, { site = "riverbend.example.in", phone = "98765 43210" } = {}) {
  await v.page.locator("label[for='lp-need-clinic']").click();
  await v.page.fill("#lp-website", site);
  await v.page.fill("#lp-phone", phone);
  await v.advance(4000);
}

/* ───────────────────── Test 4, reused by the negative control ───────────────────── */
/**
 * Returns what happened rather than asserting, because the negative control
 * needs to tell "the card came back" (the control working) apart from "the
 * run broke before it got that far" (which proves nothing either way).
 */
async function neverAgainAfterDismiss(base) {
  const v = await visitor({ base });
  const r = { shown: false, closed: false, afterReload: null, afterNav: null };
  try {
    await v.go("/");
    await v.advance(62000);
    r.shown = await v.cardAppears();
    if (!r.shown) return r;
    await v.page.locator(`${CARD} button[aria-label='Close']`).click();
    await v.page.waitForTimeout(300);
    r.closed = !(await v.cardVisible());
    await v.reload();
    await v.advance(120000);
    r.afterReload = await v.cardVisible();
    await v.go("/work");
    await v.advance(120000);
    r.afterNav = await v.cardVisible();
    return r;
  } finally {
    await v.ctx.close();
  }
}

/** Each test on its own: one that throws is a FAIL line, and the rest still run. */
async function t(fn) {
  try {
    await fn();
  } catch (e) {
    check(false, "a test threw: " + String(e?.message || e).split("\n")[0]);
  }
}

  /* 1. Not before 60s; at 60s on /; lazy; no focus theft; ARIA. */
  await t(async () => {
    const v = await visitor();
    await v.go("/");
    await v.page.evaluate(() => document.querySelector("header a[href='/pricing']")?.focus());
    const focusedBefore = await v.page.evaluate(() => document.activeElement?.getAttribute("href") || document.activeElement?.tagName);
    await v.advanceToEngaged(57);
    check(!(await v.cardVisible()), "no card at 57s of engaged time", `engaged ${await v.engaged()}s`);
    check(v.popupRequests.length === 0, "the card's code is not downloaded before the timer fires", `${v.popupRequests.length} requests`);
    await v.advance(4000);
    check(await v.cardAppears(), "the card appears at 60s on /", `engaged ${await v.engaged()}s`);
    check(v.popupRequests.length > 0, "the card's code is fetched lazily when the timer fires");
    const aria = await v.page.evaluate((sel) => {
      const d = document.querySelector(`${sel} [role=dialog]`);
      return { modal: d?.getAttribute("aria-modal"), labelled: Boolean(d && document.getElementById(d.getAttribute("aria-labelledby") || "")?.textContent) };
    }, CARD);
    check(aria.modal === "false" && aria.labelled, "role=dialog, aria-modal=false, labelled by its heading", JSON.stringify(aria));
    const focusedAfter = await v.page.evaluate(() => document.activeElement?.getAttribute("href") || document.activeElement?.tagName);
    check(focusedAfter === focusedBefore, "appearing does not steal focus", `${focusedBefore} -> ${focusedAfter}`);
    // The announcement is filled 300ms after the card mounts, on the (paused)
    // fake clock, so give it that time before reading it.
    await v.page.clock.runFor(500);
    await v.page.waitForTimeout(200);
    const live = await v.page.locator(`${CARD} [aria-live=polite]`).textContent();
    check(/opened/i.test(live || ""), "it announces itself through a polite live region", (live || "").slice(0, 60));

    // Focus return: go into the card from the nav link, close it from inside.
    await v.page.locator(`${CARD} button[aria-label='Close']`).focus();
    await v.page.keyboard.press("Enter");
    await v.page.waitForTimeout(200);
    const returned = await v.page.evaluate(() => document.activeElement?.getAttribute("href"));
    check(returned === "/pricing", "closing from inside returns focus to where it was", `activeElement href ${returned}`);
    check(JSON.parse((await v.memory()) || "{}").state === "dismissed", "the close is remembered in localStorage");
    await v.ctx.close();
  });

  /* 2. Hidden time does not count. */
  await t(async () => {
    const v = await visitor();
    await v.go("/");
    const before = await v.engaged();
    await v.setVisibility("hidden");
    await v.advance(120000);
    const after = await v.engaged();
    check(!(await v.cardVisible()) && after - before <= 1, "120s with the tab hidden: no card, and the count did not move", `engaged ${before}s -> ${after}s`);
    await v.setVisibility("visible");
    await v.advanceToEngaged(57);
    check(!(await v.cardVisible()), "then visible up to 57s engaged: still no card", `engaged ${await v.engaged()}s`);
    await v.advance(4000);
    check(await v.cardAppears(), "then past 60s visible in total: the card appears", `engaged ${await v.engaged()}s`);
    await v.ctx.close();
  });

  /* 3. Across pages within one visit. */
  await t(async () => {
    const v = await visitor();
    await v.go("/");
    await v.advance(35000);
    await v.go("/work");
    const carried = await v.engaged();
    check(carried >= 35, "the count is carried to the next page", `${carried}s on arrival at /work`);
    await v.advanceToEngaged(57);
    check(!(await v.cardVisible()), "on /work at 57s in total: no card yet", `engaged ${await v.engaged()}s`);
    await v.advance(4000);
    check(await v.cardAppears(), "the minute adds up across pages: the card appears on /work", `engaged ${await v.engaged()}s`);
    await v.ctx.close();
  });

  /* 4. Dismiss, reload, never again. Escape closes it too. */
  await t(async () => {
    const r = await neverAgainAfterDismiss(BASE);
    check(r.shown && r.closed, "the close button removes the card", JSON.stringify({ shown: r.shown, closed: r.closed }));
    check(r.shown && r.closed && r.afterReload === false && r.afterNav === false, "dismissed means never again: reload + 120s, then /work + 120s", `after reload ${r.afterReload}, on /work ${r.afterNav}`);
  });
  await t(async () => {
    const v = await visitor();
    await v.go("/");
    await v.advance(62000);
    await v.cardAppears();
    await v.page.locator("body").click({ position: { x: 5, y: 300 } });
    await v.page.keyboard.press("Escape");
    await v.page.waitForTimeout(300);
    check(!(await v.cardVisible()) && JSON.parse((await v.memory()) || "{}").state === "dismissed", "Escape closes the card and it is remembered");
    await v.ctx.close();
  });

  /* 5. Never on these routes. */
  for (const path of ["/contact", "/site/x", "/pitch/x", "/some-institute-name", "/admin", "/verify", "/privacy", "/terms", "/internship", "/work/not-a-real-project"]) {
    await t(async () => {
      const v = await visitor();
      await v.go(path);
      await v.advance(125000);
      check(!(await v.cardVisible()) && v.popupRequests.length === 0, `never on ${path}`, `card ${await v.cardVisible()}, code fetched ${v.popupRequests.length}`);
      await v.ctx.close();
    });
  }

  /* 6. Success. */
  await t(async () => {
    const v = await visitor({ emailStatus: 200 });
    await v.go("/");
    await v.advance(62000);
    await v.cardAppears();
    await fillQuick(v);
    await v.page.locator(`${CARD} button[type=submit]`).click();
    await v.page.waitForTimeout(1500);
    // unbreakable() renders the number with no-break characters; compare as plain spaces.
    const thanks = ((await v.page.locator(CARD).textContent()) || "").replace(/[\u00a0\u202f]/g, " ").replace(/\u2060/g, "");
    // Expected strings come from the source, not from memory:
    //   thank-you   LeadPopup.tsx: `Sent. Thank you${firstName ? ...}.` and the
    //               quick step no longer asks for a name, so no name follows.
    //   need        NEEDS in src/components/lead/core.ts: id "clinic", label "Clinic or salon".
    //   reply link  whatsappToLead() in src/lib/leads.ts: "a free website check".
    //   promise     contact.responseTimePromise in src/lib/cms/seed.ts.
    check(/Sent\. Thank you\./.test(thanks), "success shows the thank-you", thanks.slice(0, 80));
    check(/Mehdi Alam/.test(thanks) && /on WhatsApp/.test(thanks) && /two working days/.test(thanks) && /\+91 98765 43210/.test(thanks), "it says who replies, how, and how fast");
    const p = v.emails[0]?.template_params || {};
    check(
      v.emails.length === 1 && p.need === "Clinic or salon" && p.website === "riverbend.example.in" && p.phone === "+91 98765 43210" && p.source === "Pop-up" && p.page === "/",
      "the e-mail carries need, website, phone, source and page",
      JSON.stringify({ need: p.need, website: p.website, phone: p.phone, source: p.source, page: p.page }),
    );
    check(/Website to check: riverbend\.example\.in/.test(p.message || "") && /Runs: Clinic or salon/.test(p.message || ""), "the plain-text message carries the website and what they run", (p.message || "").replace(/\n/g, " | ").slice(0, 90));
    check(/wa\.me\/919876543210\?text=/.test(p.whatsapp_link || "") && /free website check/i.test(decodeURIComponent(p.whatsapp_link || "")), "the e-mail carries a one-tap WhatsApp reply about the website check");
    check(JSON.parse((await v.memory()) || "{}").state === "sent", "a delivered enquiry is remembered as sent");

    // The optional second step.
    await v.page.getByRole("button", { name: "Add a few details" }).click();
    await v.page.fill("#lp-organisation", "Riverbend Dental Clinic");
    await v.page.fill("#lp-city", "Patna");
    await v.page.locator("label[for='lp-timeline-1-3-months']").click();
    await v.page.selectOption("#lp-budget", "20k-45k");
    await v.page.getByRole("button", { name: "Send details" }).click();
    await v.page.waitForTimeout(1500);
    const p2 = v.emails[1]?.template_params || {};
    check(/Details added/.test((await v.page.locator(CARD).textContent()) || "") && p2.organisation === "Riverbend Dental Clinic" && p2.city === "Patna" && p2.timeline === "In 1 to 3 months" && /₹12,000-₹25,000/.test(p2.budget || "") && Boolean(p2.follow_up_of), "the optional second step sends and points at the first", JSON.stringify({ org: p2.organisation, city: p2.city, timeline: p2.timeline, budget: p2.budget, followUp: Boolean(p2.follow_up_of) }));

    await v.reload();
    await v.advance(125000);
    check(!(await v.cardVisible()), "after a successful send the card never comes back");
    await v.ctx.close();
  });

  /* 7. Failure: 412, as EmailJS answers today. */
  await t(async () => {
    const v = await visitor({ emailStatus: 412 });
    await v.go("/");
    await v.advance(62000);
    await v.cardAppears();
    await fillQuick(v);
    await v.page.locator(`${CARD} button[type=submit]`).click();
    await v.page.waitForTimeout(1500);
    const alert = v.page.locator(`${CARD} [role=alert]`);
    const alertText = (await alert.count()) ? (await alert.first().textContent()) || "" : "";
    check(/did not send/i.test(alertText), "a 412 shows a plain failure", alertText.slice(0, 70));
    check(!/Thank you/.test((await v.page.locator(CARD).textContent()) || ""), "and no thank-you anywhere in the card");
    const kept = { site: await v.page.inputValue("#lp-website"), phone: await v.page.inputValue("#lp-phone"), need: await v.page.isChecked("#lp-need-clinic") };
    check(kept.site === "riverbend.example.in" && kept.phone === "98765 43210" && kept.need, "the fields keep what was typed", JSON.stringify(kept));
    const order = await v.page.evaluate((sel) => {
      const links = [...document.querySelectorAll(`${sel} a, ${sel} button`)].filter((e) => e.offsetParent !== null);
      const firstAction = links.find((e) => e.getAttribute("aria-label") !== "Close");
      return { first: firstAction?.textContent?.trim(), href: firstAction?.getAttribute("href") || "" };
    }, CARD);
    check(/WhatsApp/.test(order.first || "") && /wa\.me\/917761921786\?text=/.test(order.href), "the WhatsApp link comes first", order.first);
    const msg = decodeURIComponent(order.href.split("text=")[1] || "");
    // whatsappToUs() in core.ts: "please check my website: <site>." then "We are <phrase>."
    check(/check my website: riverbend\.example\.in/i.test(msg) && /We are a clinic or salon\./.test(msg), "and it is prefilled with what they typed", msg.slice(0, 90));
    check((await v.memory()) === null, "a failed send does not retire the card");
    await v.ctx.close();
  });

  /* 8. The contact form. */
  await t(async () => {
    const v = await visitor({ emailStatus: 200 });
    await v.go("/contact");
    await v.page.locator("#contact button[type=submit]").click();
    await v.page.waitForTimeout(300);
    const summary = (await v.page.locator("#contact [role=alert]").first().textContent()) || "";
    const focused = await v.page.evaluate(() => document.activeElement?.id);
    check(/3 fields/.test(summary) && focused === "cf-website", "empty submit: error summary of 3 fields, focus on the first", `${summary.slice(0, 50)} / focus ${focused}`);
    await v.page.locator("label[for='cf-need-gym']").click();
    await v.page.fill("#cf-website", "riverbend.example.in");
    await v.page.fill("#cf-name", "Arjun Rao");
    await v.page.fill("#cf-phone", "+91 91234 56789");
    await v.page.fill("#cf-city", "Lucknow");
    await v.page.fill("#cf-email", "arjun@example.org");
    await v.advance(4000);
    await v.page.locator("#contact button[type=submit]").click();
    await v.page.waitForTimeout(1500);
    const done = (await v.page.locator("#contact").textContent()) || "";
    const p = v.emails[0]?.template_params || {};
    check(/Sent\. Thank you, Arjun\./.test(done) && p.source === "Contact form" && p.need === "Gym or fitness" && p.website === "riverbend.example.in" && p.city === "Lucknow", "contact form success: thank-you, and the e-mail has the fields", JSON.stringify({ need: p.need, website: p.website, city: p.city, source: p.source }));
    check(JSON.parse((await v.memory()) || "{}").state === "sent", "a contact-form enquiry retires the pop-up");
    await v.go("/");
    await v.advance(125000);
    check(!(await v.cardVisible()), "after a contact-form enquiry the pop-up never appears");
    await v.ctx.close();
  });
  await t(async () => {
    const v = await visitor({ emailStatus: 412 });
    await v.go("/contact?for=school");
    // prefillFromQuery in core.ts: for=school and for=coaching both map to "education".
    check(await v.page.isChecked("#cf-need-education"), "/contact?for=school preselects School or coaching");
    await v.page.fill("#cf-website", "riverbend.example.in");
    await v.page.fill("#cf-name", "Arjun Rao");
    await v.page.fill("#cf-phone", "91234 56789");
    await v.page.fill("#cf-message", "Our prices are only in a PDF.");
    await v.advance(4000);
    await v.page.locator("#contact button[type=submit]").click();
    await v.page.waitForTimeout(1500);
    const alert = (await v.page.locator("#contact [role=alert]").first().textContent()) || "";
    const wa = await v.page.locator("#contact [role=alert] a[href*='wa.me']").first().getAttribute("href");
    const kept = await v.page.inputValue("#cf-message");
    check(/did not send/.test(alert) && /wa\.me\/917761921786/.test(wa || "") && kept === "Our prices are only in a PDF.", "contact form 412: plain failure, WhatsApp offered, message kept");
    check(!/Thank you/.test((await v.page.locator("#contact").textContent()) || ""), "contact form 412: no thank-you");
    await v.ctx.close();
  });
  await t(async () => {
    const v = await visitor({ emailStatus: 200 });
    // prefillFromQuery in core.ts (28 Sep 2026): for=dental and for=clinic both map to "clinic".
    await v.go("/contact?for=dental");
    check(await v.page.isChecked("#cf-need-clinic"), "/contact?for=dental preselects Clinic or salon");
    await v.go("/contact?for=clinic");
    check(await v.page.isChecked("#cf-need-clinic"), "/contact?for=clinic preselects Clinic or salon");
    await v.ctx.close();
  });

  /* 9. Spam guards. */
  await t(async () => {
    const v = await visitor({ emailStatus: 200 });
    await v.go("/contact");
    await v.page.locator("label[for='cf-need-firm']").click();
    await v.page.fill("#cf-website", "riverbend.example.in");
    await v.page.fill("#cf-name", "Bot");
    await v.page.fill("#cf-phone", "98765 43210");
    await v.page.evaluate(() => {
      const el = document.getElementById("cf-leave-empty");
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      set.call(el, "http://spam.example");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await v.advance(4000);
    await v.page.locator("#contact button[type=submit]").click();
    await v.page.waitForTimeout(1000);
    check(v.emails.length === 0 && !/Thank you/.test((await v.page.locator("#contact").textContent()) || ""), "a filled honeypot sends nothing and shows no thank-you");
    await v.ctx.close();
  });
  await t(async () => {
    const v = await visitor({ emailStatus: 200 });
    // Load /, where the clock is then paused, and move to /contact inside
    // the app, so the form renders with a frozen clock: nothing can take 3s.
    await v.go("/");
    await v.page.evaluate(() => {
      history.pushState({}, "", "/contact");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    // At most 3s of fake time pass while the route and the form body render
    // (Suspense reveals on a timer), and the form's clock starts at its own
    // first render, so the send below is still well inside 3 seconds.
    check(await v.appears("#cf-name"), "the contact form renders after an in-app navigation");
    await v.page.locator("label[for='cf-need-firm']").click();
    await v.page.fill("#cf-website", "riverbend.example.in");
    await v.page.fill("#cf-name", "Quick Fingers");
    await v.page.fill("#cf-phone", "98765 43210");
    await v.page.locator("#contact button[type=submit]").click();
    await v.page.waitForTimeout(800);
    const text = (await v.page.locator("#contact").textContent()) || "";
    check(v.emails.length === 0 && /held back/.test(text) && !/Thank you/.test(text), "a send inside 3 seconds of the form rendering is held back");
    await v.ctx.close();
  });

  /* 10. Reduced motion. */
  await t(async () => {
    const v = await visitor({ reducedMotion: "reduce" });
    await v.go("/");
    await v.advance(62000);
    await v.cardAppears();
    const s = await v.page.evaluate((sel) => {
      const a = document.querySelector(sel);
      if (!a) return null;
      const cs = getComputedStyle(a);
      return { animation: cs.animationName, transform: cs.transform, opacity: cs.opacity };
    }, CARD);
    check(s && s.animation === "none" && s.transform === "none" && s.opacity === "1", "reduced motion: the card appears without movement", JSON.stringify(s));
    await v.ctx.close();
  });

  /* 11. Phone: the sheet stays within 75% of the viewport, even opened up. */
  await t(async () => {
    const v = await visitor({ width: 390, height: 844 });
    await v.go("/");
    await v.advance(62000);
    await v.cardAppears();
    const h1 = (await v.page.locator(`${CARD} [role=dialog]`).boundingBox())?.height || 0;
    await v.page.locator("label[for='lp-need-clinic']").click();
    await v.page.waitForTimeout(200);
    const h2 = (await v.page.locator(`${CARD} [role=dialog]`).boundingBox())?.height || 0;
    // 26 Sep 2026 (HOMEPAGE-COPY-DECK-V2.md B2): "What do you run?" went from
    // five short answers (two rows of chips) to seven business types (four
    // rows at 390px), which adds two 44px rows. Measured: 466px, 55% of 844.
    // The bound moved from 45% to 56% with it; the 75% cap after a tap stays.
    check(h1 > 0 && h1 <= 844 * 0.56 && h2 <= 844 * 0.75 + 1, "390x844: opens at under 56% of the screen, never over 75%", `${Math.round(h1)}px then ${Math.round(h2)}px`);
    const targets = await v.page.evaluate((sel) =>
      [...document.querySelectorAll(`${sel} button, ${sel} a, ${sel} input:not([type=radio]):not([tabindex='-1'])`)]
        .filter((e) => e.offsetParent !== null)
        .map((e) => Math.round(e.getBoundingClientRect().height))
        .filter((h) => h < 44),
    CARD);
    check(targets.length === 0, "every button, link and input in the card is at least 44px tall", targets.join(","));
    await v.ctx.close();
  });

  /* 12. Short phones: after tapping a need, Send and the phone field are on
     screen without scrolling, and nothing covers them. The sticky send row
     in LeadPopup.tsx exists for exactly this; at 60% of 640px both used to
     sit below the bottom of the sheet. */
  for (const [w, h] of [[390, 640], [360, 640]]) {
    await t(async () => {
      const v = await visitor({ width: w, height: h });
      await v.go("/");
      await v.advance(62000);
      await v.cardAppears();
      await v.page.locator("label[for='lp-need-clinic']").click();
      await v.page.waitForTimeout(300);
      const s = await v.page.evaluate((sel) => {
        const d = document.querySelector(`${sel} [role=dialog]`);
        const sheet = d.getBoundingClientRect();
        // On screen, inside the sheet, and the topmost thing at its top and
        // bottom edges (so not tucked under the sticky row).
        const clear = (el) => {
          if (!el) return false;
          const b = el.getBoundingClientRect();
          if (b.top < sheet.top || b.bottom > Math.min(sheet.bottom, innerHeight)) return false;
          return [b.top + 4, b.bottom - 4].every((y) => {
            const hit = document.elementFromPoint(b.left + 12, y);
            return hit === el || el.contains(hit);
          });
        };
        return {
          submit: clear(d.querySelector("button[type=submit]")),
          phone: clear(d.querySelector("#lp-phone")),
          ratio: Math.round((sheet.height / innerHeight) * 100),
        };
      }, CARD);
      check(s.submit && s.phone && s.ratio <= 75, `${w}x${h}: Send and the phone field are visible without scrolling`, JSON.stringify(s));
      await v.ctx.close();
    });
  }

/* ───────────────────────────── Negative control ───────────────────────────── */
if (RUN_NEGATIVE) {
  // LEAD_E2E_NEG_PORT: another run (or a concurrent agent) may already hold 5196.
  const port = Number(process.env.LEAD_E2E_NEG_PORT) || 5196;
  console.log(`\nNEGATIVE CONTROL: dev server on ${port} with VITE_LEAD_POPUP_FORGET_DISMISSAL=1`);
  const server = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort"], {
    cwd: root,
    env: { ...process.env, VITE_LEAD_POPUP_FORGET_DISMISSAL: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let ready = false;
  server.stdout.on("data", (d) => {
    if (/ready in|Local:/.test(String(d))) ready = true;
  });
  server.stderr.on("data", (d) => {
    if (!/browserslist|caniuse|update-browserslist|update-db/i.test(String(d))) process.stderr.write(String(d));
  });
  try {
    for (let i = 0; i < 120 && !ready; i++) await new Promise((r) => setTimeout(r, 500));
    if (!ready) {
      check(false, "negative control: the flagged dev server did not start");
    } else {
      // Warm-up visit: a fresh dev server optimises dependencies on its first
      // page and may reload that page once. Let that happen outside the test.
      const warm = await browser.newPage();
      await warm.route(EMAILJS, (route) => route.abort());
      await warm.route(SUPABASE, (route) => route.abort());
      await warm.goto(`http://localhost:${port}/`, { waitUntil: "load", timeout: 120000 }).catch(() => {});
      await warm.waitForTimeout(6000);
      await warm.close();

      const r = await neverAgainAfterDismiss(`http://localhost:${port}`);
      const reached = r.shown && r.closed;
      check(reached, "negative control: the card appeared and closed on the flagged server", JSON.stringify(r));
      check(
        reached && (r.afterReload === true || r.afterNav === true),
        "negative control: with the dismissal memory disabled the card comes back, so the never-again assertion above can fail",
        `after reload ${r.afterReload}, on /work ${r.afterNav}`,
      );
    }
  } finally {
    server.kill();
  }
}

await browser.close();
console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${log.filter((l) => l.startsWith("ok")).length} checks passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
