/**
 * A browser that once saved something must still see every later deploy.
 *
 *   node scripts/e2e-cms-snapshot.mjs [baseUrl]      default http://localhost:5199
 *
 * The local store used to write a FULL copy of the content on the first save,
 * and the stored copy wins over the seed. A visitor who sent one enquiry, or a
 * director who opened their demo once, then saw that day's site for ever. See
 * the header of src/lib/cms/localStore.ts. This plants a pre-fix snapshot with
 * stale homepage copy and checks the page shows the current seed, the snapshot
 * is cut down to the browser's own records, and a visitor who saves nothing
 * writes nothing. Run against the old store it fails four checks.
 */
import { chromium } from "playwright-core";

const exe = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const BASE = (process.argv.slice(2).find((a) => /^https?:\/\//.test(a)) || "http://localhost:5199").replace(/\/$/, "");
const browser = await chromium.launch({ executablePath: exe });
const fails = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.route(/emailjs|supabase\.co/, (r) => r.abort());
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
const realH1 = (await page.locator("h1").first().innerText()).trim();
// A legacy FULL snapshot: stale home copy and a stale service list, plus Mehdi's own demo record.
await page.evaluate(() => {
  localStorage.setItem("ideovent_cms_v1", JSON.stringify({
    home: { headingLines: ["STALE HERO"], subheading: "STALE SUB" },
    services: [{ id: "stale", title: "STALE SERVICE", order: 0 }],
    demoSites: [{ id: "mine-1", slug: "my-demo", instituteName: "My Demo", status: "draft" }],
    submissions: [{ id: "sub-1", name: "x" }],
  }));
});
await page.reload({ waitUntil: "networkidle" });
const h1 = (await page.locator("h1").first().innerText()).trim();
ok(h1 === realH1 && !/STALE/.test(h1), `homepage h1 is the current seed after a legacy snapshot (${h1.slice(0, 60)})`);
const body = await page.locator("body").innerText();
ok(!/STALE/.test(body), "no stale text anywhere on the homepage");
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ideovent_cms_v1") || "null"));
ok(stored && stored.__format === 2, "snapshot rewritten with the format marker");
ok(stored && !("home" in stored) && !("services" in stored), `marketing keys dropped (${Object.keys(stored || {}).join(",")})`);
ok(stored && stored.demoSites?.[0]?.id === "mine-1" && stored.submissions?.[0]?.id === "sub-1", "own demo record and own submission kept");
// A current-format snapshot survives a reload unchanged.
await page.reload({ waitUntil: "networkidle" });
const again = await page.evaluate(() => localStorage.getItem("ideovent_cms_v1"));
ok(again === JSON.stringify(stored), "a current-format snapshot is stable across reloads");
// A new visitor who sends nothing writes nothing.
const fresh = await (await browser.newContext()).newPage();
await fresh.route(/emailjs|supabase\.co/, (r) => r.abort());
await fresh.goto(BASE + "/about", { waitUntil: "networkidle" });
ok((await fresh.evaluate(() => localStorage.getItem("ideovent_cms_v1"))) === null, "a visitor who saves nothing gets no snapshot");
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S)` : "\nall snapshot checks pass");
process.exit(fails.length ? 1 : 0);
