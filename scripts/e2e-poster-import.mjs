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
 * A DENTAL CLINIC (28 Sep 2026), every name and number fictional:
 *
 *   D. A CLINIC'S CARD, "Let AI choose". The reader answers kind "dental":
 *      the review is the clinic form (Clinic name, treatments, timings,
 *      doctors), lists what the Dental Council code keeps off, offers the
 *      seven dental templates, and resolves "Let AI choose" by
 *      dentalTemplateFor (name and treatments), not by the reader's own
 *      pick. Mehdi picks another; Create makes a dental draft with the
 *      card's doctor, phone and hours and none of its offers, a private note
 *      naming what was left out, and a DENTAL lead in the CRM linked to it.
 *      The editor says "Clinic name", shows the dental pages, and the kind
 *      filter finds it.
 *   E. MANUAL ENTRY FOR A CLINIC. A dental template picked in step 1 sends
 *      kind "dental"; every provider fails; "Type the poster's details into
 *      the form" opens the clinic form; a made-up title is flagged and kept
 *      off; the draft and its dental lead are made.
 *   F. FILL MANUALLY, DENTAL. The Duplicate dialog asks for the clinic's name
 *      and the copy becomes a dental lead.
 *   G. THE TEMPLATES TAB'S DUPLICATE on a dental template, for a clinic the
 *      CRM already holds as an unsorted lead: the copy asks for the clinic's
 *      name, and that lead is linked and made dental, never added twice.
 *
 *   node scripts/e2e-poster-import.mjs http://localhost:5403
 *
 * PROVING THE TEST CAN FAIL
 *
 *   E2E_NEGATIVE=1 node scripts/e2e-poster-import.mjs
 *
 * makes the mocked reader return an extract with nothing in it but the kind.
 * Scenario A's and D's assertions about the poster's name, phone, results
 * and doctors must then fail and the run must exit 1.
 */
import { chromium } from "playwright-core";
import { deflateSync } from "node:zlib";
import { isDeepStrictEqual } from "node:util";

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

/* A clinic's visiting card. It carries a "painless" tagline and a free
   check-up offer, which must stay off the demo. */
const DENTAL_NAME = "Example Family Dental Clinic";
const DENTAL_EXTRACT = NEGATIVE
  ? { kind: "dental" }
  : {
      kind: "dental",
      instituteName: DENTAL_NAME,
      tagline: "Painless treatment for the whole family",
      city: "Ranchi",
      state: "Jharkhand",
      locality: "Lalpur",
      doctors: [{ name: "Dr. Example Name", degrees: "BDS, MDS (Orthodontics)", registration: "Reg. No. A-00000", specialisation: "Orthodontist", days: "Mon to Sat" }],
      treatments: ["Root canal treatment", "Braces and aligners", "Teeth cleaning"],
      timings: "Mon to Sat 10 am to 8 pm",
      fees: [{ treatment: "Consultation", fee: "₹300" }],
      contact: { phones: ["+91 98765 43210"], whatsapp: "98765 43210" },
      offers: ["Free dental check-up every Sunday"],
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
  if (scenario === "dental") {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        provider: "gemini",
        model: "gemini-2.5-flash",
        extracted: DENTAL_EXTRACT,
        /* The reader's own pick. For a clinic the browser must not follow it. */
        suggestedTemplate: "d3-smile-studio",
        attempts: [{ provider: "gemini", status: "ok" }],
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

/* The CRM's local store (src/lib/outreach/store.ts, OUTREACH_LOCAL_KEY). */
const readLeads = (page) =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("ideovent_outreach_v1") || "{}").leads || [];
    } catch {
      return [];
    }
  });

/** The saved demo by name, its private slot, and the CRM lead linked to it. */
async function madeWithLead(page, name) {
  const store = await readStore(page);
  const made = (store.demoSites || []).find((d) => d.instituteName === name);
  const slot = made ? (store.demoSiteSlots || []).find((s) => s.id === made.id) : undefined;
  const lead = made ? (await readLeads(page)).find((l) => l.demoId === made.id) : undefined;
  return { made, slot, lead };
}

/** The label text of the control with this id. */
const labelOf = (page, id) =>
  page.evaluate((i) => document.querySelector(`label[for="${i}"]`)?.textContent?.trim() || "", id);

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

/* ── D. A clinic's card, "Let AI choose" ─────────────────────────────────── */
{
  scenario = "dental";
  calls.length = 0;
  const { page, errors, context } = await newPage(browser, { width: 1280, height: 900 });
  await page.goto(BASE + "/admin/c/demoSites", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New demo from poster" }).first().click();
  expect((await labelOf(page, "poster-name")).startsWith("Institute or clinic name"), "step 1 asks for an institute or clinic name while the AI chooses");
  await uploadAndRead(page);
  await page.getByText("Check what was read").waitFor({ timeout: 10000 }).catch(() => {});
  expect(calls.length === 1 && calls[0].body.kind === "auto", `the reader was left to decide the kind (${calls[0]?.body?.kind})`);

  const nameBox = page.getByLabel("Clinic name (required)");
  expect((await nameBox.count()) === 1 && (await nameBox.inputValue().catch(() => "")) === DENTAL_NAME, "the review is the clinic form, with the card's name");
  expect(await page.getByRole("radio", { name: "Dental clinic" }).isChecked().catch(() => false), "the kind reads Dental clinic");
  expect(/Braces and aligners/.test(await page.locator("#px-treatments").inputValue().catch(() => "")), "the card's treatments are in the form");
  expect((await page.locator("#px-timings").inputValue().catch(() => "")) === "Mon to Sat 10 am to 8 pm", "the card's timings are in the form");
  expect((await page.locator("#px-d0-reg").inputValue().catch(() => "")) === "Reg. No. A-00000", "the doctor's printed registration is in the form");
  expect((await page.locator("#px-board").count()) === 0, "no school field on a clinic's form");
  const leftOut = (await page.getByTestId("dental-left-out").textContent().catch(() => "")) || "";
  expect(/Free dental check-up every Sunday/.test(leftOut) && /Painless treatment/.test(leftOut), `the offer and the claim are listed as kept off (${leftOut.slice(0, 160)})`);

  const dentalOptions = await page.evaluate(() =>
    [...document.querySelectorAll('#poster-review-template optgroup[label="Dental clinic"] option')].map((o) => o.value));
  expect(dentalOptions.length === 7 && dentalOptions.every((v) => v.startsWith("d")), `the review offers the seven dental templates (${dentalOptions.join(", ")})`);
  const createBtn = page.getByRole("button", { name: /^Create demo/ });
  const autoLabel = (await createBtn.textContent().catch(() => "")) || "";
  expect(/Orthodontic and aligner clinic/.test(autoLabel), `Let AI choose is dentalTemplateFor(name, treatments), not the reader's own pick (${autoLabel.trim()})`);
  await page.locator("#poster-review-template").selectOption("d1-family-dentist");
  const picked = (await createBtn.textContent().catch(() => "")) || "";
  expect(/Family dental clinic/.test(picked), `Mehdi can pick another dental template (${picked.trim()})`);
  expect(await page.getByTestId("poster-add-crm").isChecked().catch(() => false), "Also add to CRM starts ticked");
  await createBtn.click();
  await page.waitForTimeout(1500);

  const { made, slot, lead } = await madeWithLead(page, DENTAL_NAME);
  expect(Boolean(made), "the clinic's draft is saved in demoSites");
  if (made) {
    const json = JSON.stringify(made);
    expect(made.kind === "dental" && made.templateId === "d1-family-dentist" && made.status === "draft", `a dental draft of the template Mehdi picked (${made.kind}, ${made.templateId})`);
    const doc = made.dental?.doctors?.[0];
    expect(made.dental?.doctors?.length === 1 && doc?.name === "Dr. Example Name" && doc?.regNo === "Reg. No. A-00000" && !doc?.photo,
      "the card's doctor replaced the template's, with the registration and no stock photo");
    expect(made.contact?.phone === "+91 98765 43210" && made.contact?.whatsapp === "919876543210" && made.contact?.hours === "Mon to Sat 10 am to 8 pm",
      "phone, WhatsApp and hours are the card's");
    expect(!/Free dental check-up|Painless/i.test(json), "neither the offer nor the claim reached the public record");
    expect(made.sample?.from === "d1-family-dentist" && !made.sample?.real, "everything else stays the template's labelled sample");
    expect(!json.includes("gemini-2.5-flash"), "the reader stays off the public record");
    expect(slot?.poster?.provider === "gemini" && /Dental Council/.test(slot?.internalNotes || "") && /Free dental check-up/.test(slot?.internalNotes || ""),
      "the private slot names the reader and what was kept off");
    expect(lead?.kind === "dental" && lead?.demoSlug === made.slug && lead?.instituteName === DENTAL_NAME && lead?.source === "demo-created",
      `a DENTAL lead is in the CRM, linked to the demo (${JSON.stringify(lead ? { kind: lead.kind, source: lead.source } : null)})`);

    /* The editor, open on the new draft. */
    expect((await page.getByLabel("Clinic name", { exact: true }).inputValue().catch(() => "")) === DENTAL_NAME, "the editor opens on the draft and calls the name field Clinic name");
    expect(await page.getByText("Dental clinic pages (dental demos only)").isVisible().catch(() => false), "the editor shows the dental pages for a clinic");
    await page.getByRole("button", { name: "Close the editor" }).click();

    /* A school demo beside it (the local seed has none), made by hand: its
       form says Institute name and has no dental pages. */
    await page.getByRole("button", { name: "New demo site" }).click();
    const schoolName = page.getByLabel("Institute name", { exact: true });
    expect((await schoolName.count()) === 1 && (await page.getByLabel("Clinic name", { exact: true }).count()) === 0, "a school record's form still says Institute name");
    expect(!(await page.getByText("Dental clinic pages (dental demos only)").isVisible().catch(() => false)), "a school record's form has no dental pages");
    await schoolName.fill("Example Filter School");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForTimeout(800);

    const names = () => page.locator("p.truncate.font-medium").allTextContents();
    const everyRow = await names();
    const filter = page.getByLabel("Filter by kind");
    await filter.selectOption("dental");
    const onlyDental = await names();
    await filter.selectOption("school");
    const onlySchool = await names();
    await filter.selectOption("all");
    expect(isDeepStrictEqual(onlyDental, [DENTAL_NAME]) && isDeepStrictEqual(onlySchool, ["Example Filter School"]) && everyRow.length === 2,
      `the kind filter finds the clinic and only dental demos (all: ${everyRow.join(", ")}; dental: ${onlyDental.join(", ")}; school: ${onlySchool.join(", ")})`);
    const chips = await page.evaluate((n) => {
      const p = [...document.querySelectorAll("p.truncate.font-medium")].find((x) => x.textContent === n);
      return p ? [...p.parentElement.querySelectorAll("span")].map((s) => s.textContent.trim()) : [];
    }, DENTAL_NAME);
    expect(chips.includes("Dental clinic"), `the row is labelled Dental clinic (${chips.join(", ")})`);

    await page.goto(`${BASE}/admin/preview/site/${made.slug}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const text = (await page.locator("body").innerText().catch(() => "")) || "";
    expect(text.includes(DENTAL_NAME), "the clinic's preview prints its name");
    expect(/98765\s*43210/.test(text) || (await page.locator('a[href^="tel:"]').count()) > 0, "the clinic's preview carries the card's phone");
    expect(!/Free dental check-up|Painless/i.test(text), "the preview prints neither the offer nor the claim");
  }
  expect(!errors.length, `no page errors (${errors.join(" | ")})`);
  await context.close();
}

/* ── E. Manual entry for a clinic: every provider fails ──────────────────── */
{
  scenario = "all_failed";
  calls.length = 0;
  const { page, errors, context } = await newPage(browser, { width: 1280, height: 900 });
  await page.goto(BASE + "/admin/c/demoSites", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New demo from poster" }).first().click();
  await page.locator("#poster-template").selectOption("d4-implant-centre");
  expect((await labelOf(page, "poster-name")).startsWith("Clinic name"), "a dental template makes step 1 ask for the clinic's name");
  await page.locator("#poster-name").fill("Example Implant Centre");
  await uploadAndRead(page);
  await page.getByTestId("poster-error").waitFor({ timeout: 10000 }).catch(() => {});
  const sent = calls[0]?.body || {};
  expect(sent.kind === "dental" && sent.templateHint === "d4-implant-centre", `the reader was told it is a clinic (${sent.kind}, ${sent.templateHint})`);
  await page.getByRole("button", { name: /Type the poster.s details into the form/ }).click();
  const nameBox = page.getByLabel("Clinic name (required)");
  expect((await nameBox.inputValue().catch(() => "")) === "Example Implant Centre", "the clinic form opens, with the name typed in step 1");
  expect(await page.getByRole("radio", { name: "Dental clinic" }).isChecked().catch(() => false), "the form is a clinic's");
  await page.locator("#px-treatments").fill("Dental implants\nFull mouth rehabilitation");
  await page.getByRole("button", { name: "Add a doctor" }).click();
  await page.locator("#px-d0-name").fill("Dr. Example Surgeon");
  await page.locator("#px-d0-degrees").fill("BDS, MDS (Prosthodontics)");
  await page.locator("#px-d0-spec").fill("Implantologist");
  const specBox = (await page.locator("#px-d0-spec").locator("xpath=..").textContent().catch(() => "")) || "";
  expect(/not a specialist title/.test(specBox), "a made-up specialist title is flagged as it is typed");
  const createBtn = page.getByRole("button", { name: /^Create demo/ });
  expect(/Dental implant and full-mouth centre/.test((await createBtn.textContent().catch(() => "")) || ""), "the template picked in step 1 carries over");
  await createBtn.click();
  await page.waitForTimeout(1500);

  const { made, slot, lead } = await madeWithLead(page, "Example Implant Centre");
  expect(made?.kind === "dental" && made?.templateId === "d4-implant-centre", "the typed-in clinic becomes a dental draft of that template");
  const doc = made?.dental?.doctors?.[0];
  expect(made?.dental?.doctors?.length === 1 && doc?.name === "Dr. Example Surgeon" && doc?.qualification === "BDS, MDS (Prosthodontics)" && !doc?.specialisation,
    "the typed doctor replaces the template's, and the made-up title is kept off");
  const tx = made?.dental?.treatments || [];
  expect(tx.length > 2 && tx[0].featured && tx[1].featured && tx[1].name === "Full mouth rehabilitation", "the typed treatments lead the list, the template's pages follow");
  expect(/typed in by hand/.test(slot?.internalNotes || "") && /Implantologist/.test(slot?.internalNotes || ""), "the private note says it was typed in, and what was kept off");
  expect(lead?.kind === "dental" && lead?.demoId === made?.id, "the clinic is a dental lead in the CRM");
  expect(!errors.length, `no page errors (${errors.join(" | ")})`);
  await context.close();
}

/* ── F. Fill manually, dental: the Duplicate dialog asks for the clinic ──── */
{
  scenario = "all_failed";
  const { page, errors, context } = await newPage(browser, { width: 1280, height: 900 });
  await page.goto(BASE + "/admin/c/demoSites", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New demo from poster" }).first().click();
  await page.locator("#poster-template").selectOption("d6-kids-dental");
  await page.locator("#poster-name").fill("Example Kids Dental");
  await page.getByRole("button", { name: "Fill manually instead" }).click();
  await page.getByRole("button", { name: "Fill manually instead" }).click();
  const dupName = page.locator("#dup-name");
  await dupName.waitFor({ timeout: 5000 }).catch(() => {});
  const asked = await labelOf(page, "dup-name");
  expect(asked === "Clinic name", `the Duplicate dialog asks for the clinic's name (${asked})`);
  expect((await dupName.inputValue().catch(() => "")) === "Example Kids Dental", "prefilled with the name typed in step 1");
  expect(await page.getByText("Duplicate Children's dental clinic").isVisible().catch(() => false), "it duplicates the chosen dental template");
  await page.getByRole("button", { name: "Make the draft" }).click();
  await page.waitForTimeout(1500);
  const { made, lead } = await madeWithLead(page, "Example Kids Dental");
  expect(made?.kind === "dental" && made?.templateId === "d6-kids-dental", "the manual path makes a dental draft");
  expect(lead?.kind === "dental" && lead?.source === "demo-created", "and a dental lead in the CRM (the setting is on by default)");
  expect(!errors.length, `no page errors (${errors.join(" | ")})`);
  await context.close();
}

/* ── G. The Templates tab's Duplicate, on a dental template, for a clinic
      the CRM already has (imported, kind never set): linked, not added twice ── */
{
  const { page, errors, context } = await newPage(browser, { width: 1280, height: 900 });
  await page.goto(BASE + "/admin/templates?kind=dental", { waitUntil: "networkidle" });
  await page.evaluate(() =>
    localStorage.setItem("ideovent_outreach_v1", JSON.stringify({
      leads: [{ id: "ol_e2e_chain", instituteName: "Example Dental Chain", kind: "other", city: "Pune", status: "new",
        source: "csv", createdAt: "2026-09-29T10:00:00.000Z", updatedAt: "2026-09-29T10:00:00.000Z" }],
      events: [],
      settings: null,
    })));
  await page.getByRole("button", { name: "Duplicate the Multi-branch dental chain template into a new draft demo" }).click();
  await page.locator("#dup-name").waitFor({ timeout: 5000 }).catch(() => {});
  const asked = await labelOf(page, "dup-name");
  expect(asked === "Clinic name", `Duplicate on a dental template asks for the clinic's name (${asked})`);
  await page.locator("#dup-name").fill("Example Dental Chain");
  await page.locator("#dup-city").fill("Pune");
  await page.getByRole("button", { name: "Make the draft" }).click();
  await page.waitForURL(/\/admin\/c\/demoSites/, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const { made, lead } = await madeWithLead(page, "Example Dental Chain");
  expect(made?.kind === "dental" && made?.templateId === "d7-dental-chain" && made?.city === "Pune", "the copy is a dental draft in the city typed");
  const sameName = (await readLeads(page)).filter((l) => l.instituteName === "Example Dental Chain");
  expect(sameName.length === 1 && lead?.id === "ol_e2e_chain" && lead?.demoId === made?.id,
    `the clinic's existing lead is linked to the copy, not added twice (${sameName.map((l) => l.id).join(", ")})`);
  expect(lead?.kind === "dental", `the unsorted lead becomes a dental lead (${lead?.kind})`);
  expect((await page.getByLabel("Clinic name", { exact: true }).inputValue().catch(() => "")) === "Example Dental Chain", "the editor opens on it and says Clinic name");
  expect(!errors.length, `no page errors (${errors.join(" | ")})`);
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
