/**
 * End to end test of "Create from poster".
 *
 *   node scripts/e2e-poster-import.mjs [baseUrl]      default http://localhost:5199
 *
 * Runs against the dev server in LOCAL mode (no Supabase env), signed in the
 * way scripts/e2e-demo-lock.mjs is (the session flag in sessionStorage), and
 * with /api/poster ANSWERED BY page.route: Vite does not serve api/, and a
 * test must never spend a real key. Three scenarios:
 *
 *   A. SUCCESS WITH A FALLBACK. Gemini is "rate-limited", OpenAI reads it.
 *      Upload a generated PNG, check the reading line, the fallback line in
 *      the review, an empty field shown as empty, the AI's template choice;
 *      edit the tagline; Create; the editor opens on the new draft; the
 *      stored record has the poster's phone, the edited tagline, the real
 *      results switch on, and the private slot names the provider; the
 *      draft's own preview prints the poster's name and phone.
 *   B. ALL FAILED. Every provider fails: the dialog says so, offers manual
 *      filling, and "Fill manually instead" opens the Duplicate dialog
 *      prefilled with the name typed in step 1, which makes a draft.
 *   C. 390 PX. The review step does not scroll sideways on a phone.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   E2E_NEGATIVE=1 node scripts/e2e-poster-import.mjs
 *
 * makes the mocked reader return an extract with nothing in it but the kind.
 * Scenario A's assertions about the poster's name, phone and results must
 * then fail and the run must exit 1.
 */
import { chromium } from "playwright-core";
import { deflateSync } from "node:zlib";

const BASE = process.argv[2] || "http://localhost:5199";
const NEGATIVE = Boolean(process.env.E2E_NEGATIVE);
const CMS_KEY = "ideovent_cms_v1";
const SESSION_KEY = "ideovent_admin_session";

const findings = [];
const fail = (m) => {
  findings.push(m);
  console.log("FAIL  " + m);
};
const pass = (m) => console.log("ok    " + m);
const expect = (ok, m) => (ok ? pass(m) : fail(m));

/* ── A small real PNG, made here: a 60 x 90 poster-ish block of colour ──── */

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(w = 60, h = 90) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = y < 20 ? 200 : 250;
      raw[o + 1] = y < 20 ? 30 : 240;
      raw[o + 2] = y < 20 ? 40 : 220;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const PNG = { name: "poster.png", mimeType: "image/png", buffer: makePng() };

/* ── What the mocked reader answers ──────────────────────────────────────── */

const EXTRACT = NEGATIVE
  ? { kind: "coaching" }
  : {
      kind: "coaching",
      instituteName: "Lotus Point Classes",
      tagline: "Physics, chemistry and maths, taught by the same three teachers",
      city: "Ranchi",
      state: "Jharkhand",
      exams: ["JEE Main", "NEET"],
      classes: "Class 11, 12 and droppers",
      courses: [{ name: "Two year JEE batch", level: "Class 11", fee: "₹52,000", batchStart: "5 April" }],
      results: [{ rank: "AIR 1,204", exam: "JEE Main", year: "2026" }],
      contact: { phones: ["+91 94311 22334"], email: "hello@lotuspoint-test.in" },
      offers: ["Free demo class every Sunday"],
      posterLanguage: "en",
    };

let scenario = "success";
const calls = [];

async function mockReader(route) {
  const req = route.request();
  let body = {};
  try {
    body = JSON.parse(req.postData() || "{}");
  } catch {
    /* recorded as empty */
  }
  calls.push({ auth: req.headers()["authorization"] || "", body });
  await new Promise((r) => setTimeout(r, 700)); // long enough to see step 2
  if (scenario === "all_failed") {
    return route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        code: "all_failed",
        attempts: [
          { provider: "gemini", status: "error", error: "model not found" },
          { provider: "openai", status: "error", error: "invalid key" },
        ],
      }),
    });
  }
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      extracted: EXTRACT,
      suggestedTemplate: "c2-rural-tuition",
      attempts: [
        { provider: "gemini", status: "limit", error: "daily quota exhausted" },
        { provider: "openai", status: "ok" },
      ],
    }),
  });
}

async function launch() {
  const cands = [
    process.env.CHROME_PATH,
    String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  for (const p of cands) {
    try {
      return await chromium.launch({ executablePath: p, headless: true });
    } catch {
      /* next */
    }
  }
  return await chromium.launch({ channel: "chrome", headless: true });
}

async function newPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  /* Nothing leaves the machine: no mail service, no database. */
  await page.route(/api\.emailjs\.com|\.supabase\.co/, (r) => r.abort());
  await page.route("**/api/poster", mockReader);
  await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(([session]) => sessionStorage.setItem(session, "1"), [SESSION_KEY]);
  return { page, errors, context };
}

const readStore = (page) =>
  page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  }, CMS_KEY);

const inputValues = (page) =>
  page.evaluate(() => [...document.querySelectorAll("input, textarea")].map((i) => i.value));

async function uploadAndRead(page) {
  await page.locator('[data-testid="poster-file"]').setInputFiles(PNG);
  await page.getByAltText("The poster you chose").waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Read the poster" }).click();
}

const browser = await launch();

/* ── A. Success, with a fallback ─────────────────────────────────────────── */
{
  scenario = "success";
  const { page, errors, context } = await newPage(browser, { width: 1280, height: 900 });
  await page.goto(BASE + "/admin/templates", { waitUntil: "networkidle" });
  const opener = page.getByRole("button", { name: "Create from poster" });
  expect((await opener.count()) > 0, "the Templates tab has a Create from poster button");
  await opener.first().click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.getByText("Create a demo from a poster").isVisible(), "the poster dialog opens on step 1");
  await uploadAndRead(page);

  const reading = page.getByTestId("poster-reading");
  expect(await reading.isVisible().catch(() => false), "step 2 shows the reading line");
  expect(/Reading the poster/.test((await reading.textContent().catch(() => "")) || ""), "the reading line says it is reading");

  await page.getByText("Check what was read").waitFor({ timeout: 10000 });
  pass("the review step opens with the reader's answer");
  expect(calls.length === 1 && calls[0].auth.startsWith("Bearer "), "the call carries a bearer token");
  expect(calls[0].body.image?.mimeType === "image/jpeg" && calls[0].body.image.data.length > 100, "the image was sent as a downscaled JPEG");

  const summary = (await page.getByTestId("poster-read-summary").textContent()) || "";
  expect(/OpenAI/.test(summary) && /Gemini: limit or quota reached/.test(summary), `the review names the reader and the fallback (${summary.trim()})`);

  const values = await inputValues(page);
  expect(values.includes("Lotus Point Classes"), "the poster's name is in the review form");
  expect(values.includes("+91 94311 22334"), "the poster's phone is in the review form");
  const board = page.locator("#px-board");
  expect((await board.inputValue()) === "" && /border-dashed/.test((await board.getAttribute("class")) || ""), "a field not on the poster is visibly empty");
  const createLabel = (await page.getByRole("button", { name: /^Create demo/ }).textContent()) || "";
  expect(/JEE and NEET, urban/.test(createLabel), `Let AI choose resolves to the JEE template (${createLabel.trim()})`);

  await page.locator("#px-tagline").fill("Edited in the review: three teachers, one building");
  await page.getByRole("button", { name: /^Create demo/ }).click();
  await page.waitForURL(/\/admin\/c\/demoSites/, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);
  expect(page.url().includes("/admin/c/demoSites"), "Create lands in Demo sites");

  const after = await inputValues(page);
  expect(after.includes("Lotus Point Classes"), "the editor opens on the new draft");

  const store = await readStore(page);
  const made = (store.demoSites || []).find((d) => d.instituteName === "Lotus Point Classes");
  expect(Boolean(made), "the draft is saved in demoSites");
  if (made) {
    expect(made.status === "draft" && made.templateId === "c1-jee-neet-urban", "it is a draft from c1-jee-neet-urban");
    expect(made.contact?.phone === "+91 94311 22334" && made.contact?.email === "hello@lotuspoint-test.in", "contact comes from the poster");
    expect(made.tagline === "Edited in the review: three teachers, one building", "the review edit reached the draft");
    expect(made.sample?.real === true && made.results?.[0]?.achievement === "AIR 1,204", "poster results are in and marked real");
    expect(made.courses?.length === 1 && made.courses[0].fee === "52,000", "the poster's batch replaced the template's");
    const slot = (store.demoSiteSlots || []).find((s) => s.id === made.id);
    expect(slot?.poster?.provider === "openai" && /OpenAI/.test(slot?.internalNotes || ""), "the private slot records who read the poster");
    expect(!JSON.stringify(made).includes("gpt-4.1-mini"), "the provider stays off the public record");

    await page.goto(`${BASE}/admin/preview/site/${made.slug}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const text = (await page.locator("body").innerText()) || "";
    expect(text.includes("Lotus Point Classes"), "the draft's preview prints the poster's name");
    expect(/94311/.test(text) || (await page.locator('a[href^="tel:"]').count()) > 0, "the draft's preview carries the poster's phone");
  }
  expect(!errors.length, `no page errors (${errors.join(" | ")})`);
  await context.close();
}

/* ── B. Every provider fails: the manual path ────────────────────────────── */
{
  scenario = "all_failed";
  const { page, errors, context } = await newPage(browser, { width: 1280, height: 900 });
  await page.goto(BASE + "/admin/c/demoSites", { waitUntil: "networkidle" });
  const opener = page.getByRole("button", { name: "New demo from poster" });
  expect((await opener.count()) > 0, "the demo-sites list has a New demo from poster button");
  await opener.first().click();
  await page.locator("#poster-name").fill("Manual Path Academy");
  await page.locator("#poster-template").selectOption("s2-rural-state-board");
  await uploadAndRead(page);
  const err = page.getByTestId("poster-error");
  await err.waitFor({ timeout: 10000 }).catch(() => {});
  const msg = (await err.textContent().catch(() => "")) || "";
  expect(/No provider could read this poster/.test(msg), `all_failed is explained in plain words (${msg.trim()})`);
  expect(await page.getByText("Gemini: failed (model not found)").isVisible().catch(() => false), "each attempt is listed");
  await page.getByRole("button", { name: "Fill manually instead" }).click();
  const dupName = page.locator("#dup-name");
  await dupName.waitFor({ timeout: 5000 }).catch(() => {});
  expect((await dupName.inputValue().catch(() => "")) === "Manual Path Academy", "the Duplicate dialog opens prefilled with the known name");
  expect(await page.getByText("Duplicate Rural state-board school").isVisible().catch(() => false), "it duplicates the chosen template");
  await page.getByRole("button", { name: "Make the draft" }).click();
  await page.waitForTimeout(1200);
  const store = await readStore(page);
  const made = (store.demoSites || []).find((d) => d.instituteName === "Manual Path Academy");
  expect(made?.templateId === "s2-rural-state-board", "the manual path makes the draft from that template");
  expect((await page.locator("#dup-name").count()) === 0, "the Duplicate dialog closes after making the draft");
  expect(!errors.length, `no page errors (${errors.join(" | ")})`);
  await context.close();
}

/* ── C. The review at 390 px ─────────────────────────────────────────────── */
{
  scenario = "success";
  const { page, context } = await newPage(browser, { width: 390, height: 844 });
  await page.goto(BASE + "/admin/templates", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Create from poster" }).first().click();
  await uploadAndRead(page);
  await page.getByText("Check what was read").waitFor({ timeout: 10000 }).catch(() => {});
  const widths = await page.evaluate(() => {
    const overlay = document.querySelector('[role="dialog"]')?.parentElement;
    return {
      doc: document.documentElement.scrollWidth,
      overlay: overlay ? overlay.scrollWidth - overlay.clientWidth : -1,
      view: window.innerWidth,
    };
  });
  expect(widths.doc <= widths.view && widths.overlay === 0, `no sideways scroll at 390 px (${JSON.stringify(widths)})`);
  const create = page.getByRole("button", { name: /^Create demo/ });
  expect(await create.isVisible().catch(() => false), "the Create button is reachable at 390 px");
  await page.screenshot({ path: process.env.E2E_SHOT || "poster-review-390.png", fullPage: false }).catch(() => {});
  await context.close();
}

await browser.close();

console.log("");
if (NEGATIVE) {
  const ok = findings.length > 0;
  console.log(ok
    ? `NEGATIVE CONTROL OK: with an empty reading, ${findings.length} assertions failed.`
    : "NEGATIVE CONTROL BROKEN: an empty reading passed, so the assertions are not reaching the draft.");
  process.exit(ok ? 0 : 1);
}
console.log(findings.length ? `${findings.length} failed.` : "All passed.");
process.exit(findings.length ? 1 : 0);
