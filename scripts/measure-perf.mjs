/**
 * Measure what a phone visitor actually experiences on a page.
 *
 *   node scripts/measure-perf.mjs [url] [--width 390]
 *
 * Reports LCP (which element, and when), CLS, how many elements are animating
 * the moment the page settles, how many carry a CSS transition, and whether the
 * h1 was painted from HTML or had to wait for JavaScript. Baseline on the live
 * home page, 25 September 2026 at 390px: LCP 3028ms on the h1, CLS 0.0003,
 * 5 elements animating, 119 with transitions. The redesign is held to that.
 *
 * WHY THE h1 CHECK EXISTS
 *
 * The h1 is the LCP element on the home page. If a redesign wraps it in an
 * entrance animation that starts at opacity 0, Chrome does not count the paint
 * until it becomes visible, so LCP slides to "after React mounted and framer
 * ran a frame". That is exactly the regression this file is meant to catch, and
 * it is why the hero headline must paint from static HTML and CSS with no
 * initial hidden state. Motion belongs on what sits around the headline.
 */
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:\/\//.test(a)) || "http://localhost:5199/";
const wIdx = args.indexOf("--width");
const width = wIdx >= 0 ? Number(args[wIdx + 1]) : 390;

async function launch() {
  const cands = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  for (const p of cands) {
    try { return await chromium.launch({ executablePath: p, headless: true }); } catch { /* next */ }
  }
  return await chromium.launch({ channel: "chrome", headless: true });
}

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width, height: Math.round(width * 2.16) } });
const page = await ctx.newPage();

await page.addInitScript(() => {
  window.__lcp = null;
  window.__cls = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      const el = e.element;
      window.__lcp = {
        ms: Math.round(e.startTime),
        element: el ? el.tagName.toLowerCase() + (el.className ? "." + String(el.className).trim().split(/\s+/)[0] : "") : "?",
      };
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
});

// Was the h1 visible before any script ran? Read it with JS off first.
const noJs = await browser.newContext({ viewport: { width, height: 844 }, javaScriptEnabled: false });
const p0 = await noJs.newPage();
let h1FromHtml = false;
try {
  await p0.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  h1FromHtml = await p0.evaluate(() => {
    const h = document.querySelector("h1");
    if (!h) return false;
    const cs = getComputedStyle(h);
    return cs.opacity !== "0" && cs.visibility !== "hidden" && h.getBoundingClientRect().height > 0;
  });
} catch { /* an SPA without prerendering has no h1 before JS; that is reported, not fatal */ }
await noJs.close();

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const m = await page.evaluate(() => {
  const all = [...document.querySelectorAll("*")];
  const h1 = document.querySelector("h1");
  const h1cs = h1 ? getComputedStyle(h1) : null;
  return {
    lcp: window.__lcp,
    cls: Number(window.__cls.toFixed(4)),
    domNodes: all.length,
    animatingNow: all.filter((e) => getComputedStyle(e).animationName !== "none").length,
    infiniteLoops: all.filter((e) => {
      const cs = getComputedStyle(e);
      return cs.animationName !== "none" && cs.animationIterationCount === "infinite";
    }).length,
    withTransitions: all.filter((e) => getComputedStyle(e).transitionDuration !== "0s").length,
    h1: h1 && {
      text: h1.innerText.replace(/\s+/g, " ").slice(0, 60),
      fontSize: h1cs.fontSize,
      weight: h1cs.fontWeight,
      family: h1cs.fontFamily.split(",")[0].replace(/"/g, ""),
      lineHeight: h1cs.lineHeight,
      letterSpacing: h1cs.letterSpacing,
      opacityAtSettle: h1cs.opacity,
    },
  };
});

await browser.close();

console.log(JSON.stringify({ url, width, h1PaintedFromHtml: h1FromHtml, ...m }, null, 2));

const problems = [];
if (m.lcp && m.lcp.ms > 2500) problems.push(`LCP ${m.lcp.ms}ms is over the 2500ms ceiling`);
if (m.cls > 0.05) problems.push(`CLS ${m.cls} is over 0.05`);
if (m.h1 && m.h1.opacityAtSettle !== "1") problems.push(`h1 settled at opacity ${m.h1.opacityAtSettle}, so it is being animated in`);
if (problems.length) {
  console.log("\n" + problems.map((p) => "FAIL  " + p).join("\n"));
  process.exit(1);
}
console.log("\nwithin budget.");
