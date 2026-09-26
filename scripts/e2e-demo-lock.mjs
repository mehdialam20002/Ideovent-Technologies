/**
 * End to end test of the one thing the demo system exists to prevent.
 *
 *   node scripts/e2e-demo-lock.mjs [baseUrl]      default http://localhost:5199
 *
 * THE FAILURE, as Mehdi reported it: he pitches a demo to institute A, edits
 * the same record for institute B an hour later, and A opens the link that
 * night and reads B's name. Nobody tells him. A just never replies.
 *
 * src/lib/demo/slots.ts answers it with an edit lock, and a unit test of
 * editLockReason() would prove only that a function returns an object. What
 * has to be true is that a person who clicks Edit on a sent demo cannot reach
 * the form without passing a dialog, that the dialog names who holds the link,
 * and that the easy button on it is Duplicate rather than Edit. That is a
 * question about the rendered admin, so it is asked in a browser.
 *
 * The test seeds its own record through localStorage rather than clicking
 * through the create form, because the subject here is the lock and not the
 * form, and it uses a fictional institute for the same reason every other
 * example record does. It removes what it seeded on the way out.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   E2E_NEGATIVE=1 node scripts/e2e-demo-lock.mjs
 *
 * seeds the same record as a DRAFT instead. A draft is not locked, by design,
 * so every assertion below about the dialog must fail and the run must exit 1.
 * If that command passes, the assertions are not reaching the page and a green
 * run here means nothing. Run it whenever this file or slots.ts is touched.
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const BASE = process.argv[2] || "http://localhost:5199";
const here = dirname(fileURLToPath(import.meta.url));

const CMS_KEY = "ideovent_cms_v1";
const SESSION_KEY = "ideovent_admin_session";

/**
 * A sent demo for a fictional institute, with a recipient and a send date, so
 * the dialog has something real to name. `isExample` is deliberately absent:
 * editLockReason() exempts example records, so seeding one would test nothing
 * and would pass.
 */
const SENT = {
  id: "e2e-lock-subject",
  instituteName: "Riverbend Public School",
  internalName: "e2e lock subject",
  slug: "e2e-riverbend-public-school",
  kind: "school",
  market: "india",
  city: "New Delhi",
  status: process.env.E2E_NEGATIVE ? "draft" : "sent",
};

const SLOT = {
  id: "e2e-lock-subject",
  sentTo: "Mrs Kavita Menon",
  sentAt: "2026-09-18T09:30:00.000Z",
};

const findings = [];
const fail = (m) => {
  findings.push(m);
  console.log("FAIL  " + m);
};
const pass = (m) => console.log("ok    " + m);

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
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

// Seed the store and the session before any app code runs, so the first render
// already has the sent record in it.
await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
await page.evaluate(
  ([key, session, site, slot]) => {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    data.demoSites = [...(data.demoSites || []).filter((d) => d.id !== site.id), site];
    data.demoSiteSlots = [...(data.demoSiteSlots || []).filter((s) => s.id !== slot.id), slot];
    localStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(session, "1");
  },
  [CMS_KEY, SESSION_KEY, SENT, SLOT],
);

await page.goto(BASE + "/admin/c/demoSites", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const row = page.locator("text=Riverbend Public School").first();

if ((await row.count()) === 0) {
  fail("the seeded sent demo does not appear in /admin/c/demoSites, so nothing below was tested");
} else {
  pass("the sent demo appears in the admin list");

  // 1. Clicking Edit must not open the form.
  const edit = page.getByRole("button", { name: /edit the demo for Riverbend/i });
  if (await edit.count()) {
    await edit.first().click();
  } else {
    const anyEdit = page.getByRole("button", { name: /^edit$/i });
    if (await anyEdit.count()) await anyEdit.first().click();
    else fail("no Edit control was found for the sent demo");
  }
  await page.waitForTimeout(600);

  /*
   * Everything below is read out of the dialog, NOT out of the page.
   *
   * Reading page text was the first version of this and it quietly passed the
   * negative control: the recipient's name is printed on the list row too, so
   * "the lock names the recipient" was green on a draft that had no lock at
   * all. An assertion that cannot tell the dialog from the page behind it is
   * not testing the dialog.
   */
  const dialog = page.locator('[role="dialog"]');
  const dialogOpen = (await dialog.count()) > 0 && (await dialog.first().isVisible());

  if (!dialogOpen) {
    fail("clicking Edit on a SENT demo opened no dialog, so the form is reachable in one click and a live pitch can be overwritten without warning");
  } else {
    pass("clicking Edit on a sent demo opens a dialog instead of the form");
  }

  const lockText = dialogOpen ? (await dialog.first().innerText()).replace(/\s+/g, " ") : "";

  // The lock has to name who holds the link. A generic warning gets clicked through.
  if (/Mrs Kavita Menon/.test(lockText)) pass("the lock names the recipient");
  else fail("the lock does not name the recipient, so it reads as a generic warning and gets dismissed");

  if (/still (have|works)/i.test(lockText)) pass("the lock says the link still works");
  else fail("the lock does not say the link still works");

  /*
   * The form must not be sitting behind the dialog already filled in. The
   * institute name box is found by its label rather than by a name attribute,
   * because AdminField renders an id from the schema key and no name at all,
   * and a selector that matches nothing would report "the form did not open"
   * on a page where it plainly had.
   */
  const nameBox = page.getByLabel(/institute name/i).first();
  const formVisible = (await nameBox.count()) > 0 && (await nameBox.isVisible().catch(() => false));
  if (formVisible) fail("the edit form rendered underneath the lock, so the dialog is decoration rather than a gate");
  else pass("the edit form did not open behind the lock");

  // Duplicate has to be the easy path out of the lock, and it has to come FIRST:
  // the whole point is that duplicating is the habit and editing is deliberate.
  const dup = dialogOpen
    ? dialog.first().getByRole("button", { name: /duplicate instead/i })
    : page.getByRole("button", { name: /duplicate instead/i });

  if (dialogOpen) {
    const order = await dialog.first().evaluate((el) => {
      const labels = [...el.querySelectorAll("button")].map((b) => (b.textContent || "").trim().toLowerCase());
      return { dup: labels.findIndex((t) => t.includes("duplicate")), edit: labels.findIndex((t) => t.includes("anyway")) };
    });
    if (order.dup >= 0 && order.edit >= 0 && order.dup < order.edit) {
      pass("Duplicate sits before Edit it anyway, so the safe path is the easy one");
    } else {
      fail("Edit it anyway comes before Duplicate in the dialog, which makes overwriting the default gesture: " + JSON.stringify(order));
    }
  }

  if ((await dup.count()) === 0) {
    fail("Duplicate instead is NOT offered on the lock, so the only way forward is to overwrite a sent demo");
  } else {
    pass("Duplicate instead is offered on the lock");

    const before = await page.evaluate(
      (k) => (JSON.parse(localStorage.getItem(k) || "{}").demoSites || []).length,
      CMS_KEY,
    );

    await dup.first().click();
    await page.waitForTimeout(500);

    // The duplicate opens as an unsaved draft in the form, so it is saved the
    // way a person would save it.
    const save = page.getByRole("button", { name: /^(save|save demo|save changes)$/i });
    if (await save.count()) {
      await save.first().click();
      await page.waitForTimeout(800);
    } else {
      fail("the duplicate opened but there is no Save control, so it cannot be kept");
    }

    const after = await page.evaluate((k) => {
      const d = JSON.parse(localStorage.getItem(k) || "{}");
      const sites = d.demoSites || [];
      const orig = sites.find((s) => s.id === "e2e-lock-subject");
      return {
        count: sites.length,
        origStatus: orig && orig.status,
        origName: orig && orig.instituteName,
        origSlug: orig && orig.slug,
        copies: sites
          .filter((s) => s.id !== "e2e-lock-subject" && /riverbend/i.test(s.slug || ""))
          .map((s) => ({ id: s.id, slug: s.slug, status: s.status })),
      };
    }, CMS_KEY);

    if (after.count > before) pass(`duplicating added a record (${before} to ${after.count})`);
    else fail("duplicating did not add a record, so the alternative the lock recommends is a dead end");

    if (
      after.origStatus === "sent" &&
      after.origName === "Riverbend Public School" &&
      after.origSlug === "e2e-riverbend-public-school"
    ) {
      pass("the sent original is untouched: same name, same slug, still sent");
    } else {
      fail(
        "duplicating CHANGED the sent original, which is the exact failure the feature exists to prevent: " +
          JSON.stringify(after),
      );
    }

    const copy = after.copies[0];
    if (!copy) {
      fail("no copy was found, so the duplicate did not persist");
    } else {
      if (copy.slug !== after.origSlug) pass(`the copy has its own slug (${copy.slug})`);
      else fail("the copy reuses the original's slug, so sending the copy overwrites the original's page");

      if (copy.status !== "sent") pass(`the copy starts at ${copy.status}, not sent`);
      else fail("the copy starts as sent, so it is locked immediately and counts as delivered to nobody");
    }
  }
}

const real = consoleErrors.filter((e) => !/favicon|React DevTools|ERR_BLOCKED/i.test(e));
if (real.length) fail("console errors during the flow: " + real.slice(0, 3).join(" | "));
else pass("no console errors");

// Remove what this test seeded, so a later look at the admin is not confused by it.
await page.evaluate((k) => {
  const d = JSON.parse(localStorage.getItem(k) || "{}");
  d.demoSites = (d.demoSites || []).filter(
    (s) => s.id !== "e2e-lock-subject" && !/riverbend/i.test(s.slug || ""),
  );
  d.demoSiteSlots = (d.demoSiteSlots || []).filter((s) => s.id !== "e2e-lock-subject");
  localStorage.setItem(k, JSON.stringify(d));
}, CMS_KEY);

await browser.close();
console.log(findings.length ? `\n${findings.length} FAILURE(S)` : "\nedit lock and duplicate both behave");
process.exit(findings.length ? 1 : 0);
