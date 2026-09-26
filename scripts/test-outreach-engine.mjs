/**
 * Tests the Outreach templates and engine (src/lib/outreach/templates.ts, engine.ts).
 *
 *   node scripts/test-outreach-engine.mjs
 *
 * WHAT IT ASSERTS
 *   1. The registry: at least 24 templates, unique ids, every stage / channel
 *      the brief asks for, no em or en dash anywhere, no price, no "www.ideovent.in".
 *   2. Every template renders for a sample lead with no leftover {braces} and
 *      no warnings about missing data.
 *   3. Every first WhatsApp template is allowsLink false and its rendered text
 *      carries no URL; every one carries the opt-out ("nahi" / "no").
 *   4. Every rendered e-mail ends with the REMOVE opt-out line, exactly once.
 *   5. Gmail, mailto, wa.me and web.whatsapp links decode back to the exact
 *      recipient, subject and body (and authuser account).
 *   6. followUpDate follows the ladder and skips Sunday.
 *   7. checkSend blocks and warns in each case of the contract.
 *
 * NEGATIVE CONTROL
 *
 *   OUTREACH_ENGINE_NEGATIVE=1 node scripts/test-outreach-engine.mjs
 *
 * sabotages the real modules after loading them: a demo link is slipped into
 * every first WhatsApp template, render() stops appending the opt-out line,
 * the Gmail link drops the subject and checkSend forgets do_not_contact. The
 * run must then FAIL, which proves these checks can fail. It exits 0 only when
 * the expected failures were seen.
 *
 * Bundled with esbuild exactly like scripts/test-from-template.mjs; nothing mocked.
 */

import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.OUTREACH_ENGINE_NEGATIVE);

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch {
      /* next */
    }
  }
  return base;
}

const entry = `
export * from "@/lib/outreach/templates";
export * from "@/lib/outreach/engine";
`;

const alias = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
  },
};

const out = join(tmpdir(), `ideovent-test-outreach-engine-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [alias],
});
writeFileSync(out, bundled.outputFiles[0].text);
const real = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/* ── Negative control: sabotage copies of the real functions ─────────────── */

const M = { ...real };
if (NEGATIVE) {
  M.OUTREACH_TEMPLATES = real.OUTREACH_TEMPLATES.map((t) =>
    t.channel === "whatsapp" && t.stage === "first" ? { ...t, body: `${t.body}\n{demoLink}` } : t,
  );
  M.render = (t, lead, ctx) => {
    const r = real.render(t, lead, ctx);
    return { ...r, body: r.body.replace(real.EMAIL_OPT_OUT_EN, "").replace(real.EMAIL_OPT_OUT_HINGLISH, "").trim() };
  };
  M.gmailComposeUrl = (input) => real.gmailComposeUrl({ ...input, subject: "" });
  M.checkSend = (lead, ...rest) =>
    real.checkSend(lead.status === "do_not_contact" ? { ...lead, status: "contacted" } : lead, ...rest);
}

/* ── Assertion plumbing ──────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
function check(ok, message) {
  if (ok) passes++;
  else {
    failures.push(message);
    console.log("FAIL  " + message);
  }
}

/* Built from code points so this file itself contains no em or en dash. */
const DASH = new RegExp(`[${String.fromCharCode(8212)}${String.fromCharCode(8211)}]`);
const URL_IN_TEXT = /https?:\/\/|www\.|\.vercel\.app|wa\.me/i;

const T = M.OUTREACH_TEMPLATES;
const sampleLead = (kind = "school") => ({
  id: "lead_sample",
  createdAt: "2026-09-27T05:00:00.000Z",
  updatedAt: "2026-09-27T05:00:00.000Z",
  instituteName: kind === "school" ? "Sunrise Public School" : "Vidya Coaching Centre",
  kind,
  contactName: "Sharma",
  phone: "98765 43210",
  email: "principal@sunrisepublic.in",
  city: "Faridabad",
  status: "new",
  demoSlug: "sunrise-public-school",
  pitchSlug: "sunrise-public-school-pitch",
  observation: "not_mobile",
});
const leadFor = (t) => sampleLead(t.kind === "coaching" ? "coaching" : "school");
// Tuesday 29 Sep 2026, 11:30 India time.
const TUESDAY_1130_IST = new Date("2026-09-29T06:00:00.000Z");
const SETTINGS = { signature: "", whatsappDailyCap: 10, quietStart: "20:00", quietEnd: "09:00", alertOnDemoOpen: true };

/* ── 1. The registry ─────────────────────────────────────────────────────── */

check(T.length >= 24, `at least 24 templates (has ${T.length})`);
check(new Set(T.map((t) => t.id)).size === T.length, "template ids are unique");
const has = (f) => T.some((t) => Object.entries(f).every(([k, v]) => t[k] === v));
for (const [channel, stage, pitch, kind] of [
  ["email", "first", "new_website", "school"],
  ["email", "first", "new_website", "coaching"],
  ["email", "first", "fix_website", "school"],
  ["email", "first", "fix_website", "coaching"],
  ["whatsapp", "first", "new_website", "school"],
  ["whatsapp", "first", "new_website", "coaching"],
  ["whatsapp", "first", "fix_website", "school"],
  ["whatsapp", "first", "fix_website", "coaching"],
]) {
  check(has({ channel, stage, pitch, kind }), `a ${channel} ${stage} template for ${pitch} / ${kind}`);
}
for (const stage of ["follow_up_1", "follow_up_2", "follow_up_3", "after_call", "proposal"]) {
  check(has({ channel: "email", stage }), `an e-mail ${stage} template`);
}
for (const stage of ["after_reply", "follow_up_1", "follow_up_2", "follow_up_3"]) {
  check(has({ channel: "whatsapp", stage }), `a WhatsApp ${stage} template`);
}
for (const language of ["en", "hinglish"]) {
  for (const kind of ["school", "coaching"]) {
    check(has({ channel: "whatsapp", stage: "first", language, kind }), `a first WhatsApp in ${language} for ${kind}`);
  }
}
check(
  T.filter((t) => t.channel === "whatsapp" && t.stage === "after_reply").every((t) => /\{(demoLink|pitchLink)\}/.test(t.body)),
  "every WhatsApp after_reply template carries {demoLink} or {pitchLink}",
);
for (const t of T) {
  const text = `${t.subject ?? ""}\n${t.body}\n${t.label}\n${t.note ?? ""}`;
  check(!DASH.test(text), `${t.id}: no em or en dash`);
  check(!/₹|\bRs\.?\s?\d|\bINR\b/i.test(text), `${t.id}: no price`);
  check(!/ideovent\.in\b/i.test(text), `${t.id}: does not print ideovent.in (not live yet)`);
  check(t.channel !== "email" || Boolean(t.subject), `${t.id}: e-mail has a subject`);
  check(t.allowsLink || !/\{(demoLink|pitchLink)\}/.test(`${t.subject ?? ""}${t.body}`), `${t.id}: allowsLink false has no link field`);
  for (const f of M.fieldsUsed(t)) check(M.MERGE_FIELDS.includes(f), `${t.id}: {${f}} is a known merge field`);
}
for (const o of M.OBSERVATIONS) {
  check(Boolean(o.id && o.label && o.en && o.hinglish), `observation ${o.id} has id, label, en and hinglish`);
  check(!DASH.test(o.en + o.hinglish + o.label), `observation ${o.id}: no dash`);
}
check(M.OBSERVATIONS.length >= 6, "at least six observations");

/* ── 2-4. Rendering ──────────────────────────────────────────────────────── */

for (const t of T) {
  const lead = leadFor(t);
  const r = M.render(t, lead, {});
  const all = `${r.subject ?? ""}\n${r.body}`;
  check(!/[{}]/.test(all), `${t.id}: no leftover braces after render`);
  check(r.body.includes(lead.instituteName) || !t.body.includes("{instituteName}"), `${t.id}: institute name filled`);
  const dataWarnings = r.warnings.filter((w) => !/Attach the proposal PDF/.test(w));
  check(dataWarnings.length === 0, `${t.id}: no warnings for a complete lead (${dataWarnings.join(" | ")})`);
  check(!DASH.test(all), `${t.id}: rendered text has no dash`);

  if (t.channel === "whatsapp" && t.stage === "first") {
    check(t.allowsLink === false, `${t.id}: first WhatsApp is allowsLink false`);
    check(!URL_IN_TEXT.test(all), `${t.id}: first WhatsApp renders with no URL`);
    check(/\*nahi\*|\*no\*|\*नहीं\*/.test(r.body), `${t.id}: first WhatsApp carries the opt-out line`);
  }
  if (t.channel === "whatsapp" && t.stage === "after_reply") {
    check(r.body.includes("https://ideovent.vercel.app/"), `${t.id}: after_reply carries the live link`);
  }
  if (t.channel === "email") {
    const optOut = M.emailOptOutLine(t.language);
    check(r.body.trimEnd().endsWith(optOut), `${t.id}: e-mail ends with the REMOVE opt-out line`);
    check(r.body.split("REMOVE").length === 2, `${t.id}: opt-out appears exactly once`);
    check(r.body.includes("+91 77619 21786"), `${t.id}: e-mail signed with the real phone`);
    check(r.body.includes("Mehdi Alam"), `${t.id}: e-mail signed as Mehdi Alam`);
  }
  if (t.body.includes("{demoLink}")) {
    check(r.body.includes("https://ideovent.vercel.app/site/sunrise-public-school"), `${t.id}: demo link is /site/<slug>`);
  }
  if (t.body.includes("{pitchLink}")) {
    check(r.body.includes("https://ideovent.vercel.app/sunrise-public-school-pitch"), `${t.id}: pitch link is /<slug>`);
  }
}

{
  const t = M.getTemplate("em_first_fix_school_en");
  const bare = { instituteName: "Nameless School", kind: "school", status: "new" };
  const r = M.render(t, bare, {});
  check(r.body.startsWith("Dear Principal,"), "missing contact name falls back to 'Dear Principal,' for a school e-mail");
  check(r.warnings.some((w) => /contact name/i.test(w)), "missing contact name is warned");
  check(r.warnings.some((w) => /demo link/i.test(w)), "missing demo is warned");
  check(r.warnings.some((w) => /observation/i.test(w)), "missing observation is warned");
  check(!/[{}]/.test(r.body), "a bare lead still leaves no braces");
  const custom = M.render(t, sampleLead(), { signature: "Mehdi\nIdeovent", observation: "Your gallery page is empty." });
  check(custom.body.includes("Mehdi\nIdeovent\n\nIf you'd rather"), "custom signature sits right above the opt-out");
  check(custom.body.includes("Your gallery page is empty."), "free-text observation is used as typed");
  const hing = M.render(M.getTemplate("wa_fu2_hinglish"), sampleLead(), {});
  check(hing.body.includes(M.getObservation("not_mobile").hinglish), "observation id renders in Hinglish for a Hinglish template");
  const en = M.render(M.getTemplate("wa_fu2_en"), sampleLead(), {});
  check(en.body.includes(M.getObservation("not_mobile").en), "observation id renders in English for an English template");
  const again = M.render({ ...t, body: `${t.body}\n\n${M.EMAIL_OPT_OUT_EN}` }, sampleLead(), {});
  check(again.body.split("REMOVE").length === 2, "an opt-out already in the text is not doubled");
}

/* ── 5. Links decode to exactly what was rendered ────────────────────────── */

{
  const t = M.getTemplate("em_first_new_school_en");
  const lead = sampleLead();
  const r = M.render(t, lead, {});
  const g = new URL(M.gmailComposeUrl({ to: lead.email, subject: r.subject, body: r.body, account: "mehdi.ideovent@gmail.com" }));
  check(g.origin + g.pathname === "https://mail.google.com/mail/", "gmail: host and path");
  check(g.searchParams.get("authuser") === "mehdi.ideovent@gmail.com", "gmail: authuser is the chosen account");
  check(g.searchParams.get("view") === "cm" && g.searchParams.get("fs") === "1", "gmail: view=cm&fs=1");
  check(g.searchParams.get("to") === lead.email, "gmail: to decodes exactly");
  check(g.searchParams.get("su") === r.subject, "gmail: subject decodes exactly");
  check(g.searchParams.get("body") === r.body, "gmail: body decodes exactly, line breaks included");
  const noAcc = M.gmailComposeUrl({ to: lead.email, subject: "a&b=c", body: "x+y" });
  check(!noAcc.includes("authuser"), "gmail: no account, no authuser");
  check(new URL(noAcc).searchParams.get("su") === "a&b=c" && new URL(noAcc).searchParams.get("body") === "x+y", "gmail: & = + survive");
  check(M.gmailComposeUrl({ to: "a@b.in", subject: "s", body: "b", account: "x@y.com" }).startsWith("https://mail.google.com/mail/?authuser=x%40y.com&view=cm&fs=1&to="), "gmail: parameter order per contract");

  const m = M.mailtoUrl({ to: lead.email, subject: r.subject, body: r.body });
  check(m.startsWith(`mailto:${lead.email}?`), "mailto: recipient");
  const mq = new URLSearchParams(m.split("?")[1]);
  check(mq.get("subject") === r.subject && mq.get("body") === r.body, "mailto: subject and body decode exactly");

  const w = M.render(M.getTemplate("wa_after_reply_school_hinglish"), lead, {});
  const wa = new URL(M.whatsappUrl(lead.phone, w.body));
  check(wa.origin === "https://wa.me" && wa.pathname === "/919876543210", "wa.me: +91 digits from '98765 43210'");
  check(wa.searchParams.get("text") === w.body, "wa.me: text decodes exactly");
  const web = new URL(M.whatsappWebUrl("+91 98765-43210", w.body));
  check(web.origin + web.pathname === "https://web.whatsapp.com/send", "web.whatsapp: host and path");
  check(web.searchParams.get("phone") === "919876543210" && web.searchParams.get("text") === w.body, "web.whatsapp: phone and text decode exactly");
  const hi = M.render(M.getTemplate("wa_first_new_school_hi"), lead, {});
  check(new URL(M.whatsappUrl(lead.phone, hi.body)).searchParams.get("text") === hi.body, "wa.me: Devanagari text round-trips");

  for (const [input, want] of [
    ["98765 43210", "+919876543210"],
    ["098765-43210", "+919876543210"],
    ["+91 98765 43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["0091 98765 43210", "+919876543210"],
    ["011 2345 6789", "+911123456789"],
    ["+1 415 555 0100", "+14155550100"],
    ["+44 20 7946 0958", "+442079460958"],
    ["+4412345678", "+4412345678"],
    ["12345", ""],
    ["", ""],
  ]) {
    check(M.normalisePhone(input) === want, `normalisePhone(${JSON.stringify(input)}) = ${want} (got ${M.normalisePhone(input)})`);
  }
  const links = M.sendLinks(lead, "email", r, { senderGmail: "mehdi.ideovent@gmail.com" });
  check(Boolean(links.gmail && links.mailto) && !links.whatsapp, "sendLinks: e-mail gives gmail and mailto");
  const wl = M.sendLinks({ ...lead, whatsapp: "99999 11111" }, "whatsapp", w);
  check(wl.whatsapp?.includes("/919999911111?") && !wl.gmail, "sendLinks: WhatsApp prefers the WhatsApp number");
  check(Object.keys(M.sendLinks({ ...lead, email: "" }, "email", r)).length === 0, "sendLinks: no e-mail, no link");
}

/* ── 6. Follow-up dates ──────────────────────────────────────────────────── */

{
  const days = (stage, from = TUESDAY_1130_IST) => Math.round((M.followUpDate(stage, from) - from) / 86_400_000);
  check(days("first") === 2, "first message: next touch on Day 2");
  check(days("follow_up_1") === 3, "follow-up 1 (Day 2): next is the Day 5 call");
  check(days("follow_up_2") === 11, "follow-up 2 (Day 10): next is Day 21");
  check(days("follow_up_3") === 24, "follow-up 3 (Day 21): next is Day 45");
  check(days("proposal") === 3, "proposal: chased on Day 3");
  // Friday 2 Oct 2026 11:30 IST + 2 days = Sunday, moves to Monday.
  const friday = new Date("2026-10-02T06:00:00.000Z");
  const due = M.followUpDate("first", friday);
  check(M.istParts(due).day === 1 && days("first", friday) === 3, "a follow-up due on Sunday moves to Monday");
  check(M.followUpDate("first", friday.toISOString()).getTime() === due.getTime(), "followUpDate accepts an ISO string");
}

/* ── 7. Safeguards ───────────────────────────────────────────────────────── */

{
  const now = TUESDAY_1130_IST;
  const waFirst = M.getTemplate("wa_first_new_school_hinglish");
  const waReply = M.getTemplate("wa_after_reply_school_hinglish");
  const emFirst = M.getTemplate("em_first_new_school_en");
  const lead = sampleLead();
  const blockedBy = (res, re) => !res.ok && res.blockers.some((b) => re.test(b));
  const warnedBy = (res, re) => res.warnings.some((w) => re.test(w));

  const clean = M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, now);
  check(clean.ok && clean.blockers.length === 0 && clean.warnings.length === 0, `a clean first WhatsApp at 11:30 Tuesday passes silently (${[...clean.blockers, ...clean.warnings].join(" | ")})`);
  check(M.checkSend(lead, emFirst, "email", SETTINGS, 0, now).ok, "a clean first e-mail passes");

  check(blockedBy(M.checkSend({ ...lead, status: "do_not_contact" }, waFirst, "whatsapp", SETTINGS, 0, now), /not to be contacted/i), "do_not_contact blocks WhatsApp");
  check(blockedBy(M.checkSend({ ...lead, status: "do_not_contact" }, emFirst, "email", SETTINGS, 0, now), /not to be contacted/i), "do_not_contact blocks e-mail");

  const linky = { ...waFirst, id: "bad", body: `${waFirst.body}\n{demoLink}` };
  check(blockedBy(M.checkSend(lead, linky, "whatsapp", SETTINGS, 0, now), /must not carry a link/i), "first WhatsApp with {demoLink} blocks");
  const rawUrl = { ...waFirst, id: "bad2", body: `${waFirst.body}\nhttps://ideovent.vercel.app/site/x` };
  check(blockedBy(M.checkSend(lead, rawUrl, "whatsapp", SETTINGS, 0, now), /must not carry a link/i), "first WhatsApp with a typed URL blocks");
  const allows = { ...waFirst, id: "bad3", allowsLink: true };
  check(blockedBy(M.checkSend(lead, allows, "whatsapp", SETTINGS, 0, now), /must not carry a link/i), "first WhatsApp marked allowsLink blocks");
  const fuLink = { ...M.getTemplate("wa_fu1_hinglish"), body: "see {pitchLink}" };
  check(blockedBy(M.checkSend(lead, fuLink, "whatsapp", SETTINGS, 0, now), /no-link/i), "allowsLink false with a link field blocks at any stage");

  const noDemo = { ...lead, demoId: undefined, demoSlug: undefined };
  check(blockedBy(M.checkSend(noDemo, waFirst, "whatsapp", SETTINGS, 0, now), /no demo yet/i), "a first WhatsApp saying the site is built blocks when the lead has no demo");
  check(blockedBy(M.checkSend(noDemo, M.getTemplate("wa_fu1_en"), "whatsapp", SETTINGS, 0, now), /no demo yet/i), "follow-up 1 (the site we made) blocks when the lead has no demo");
  check(blockedBy(M.checkSend({ ...lead, pitchSlug: undefined }, M.getTemplate("wa_first_pitch_any_hinglish"), "whatsapp", SETTINGS, 0, now), /no pitch page yet/i), "the pitch-page first WhatsApp blocks without a pitch page");
  check(!M.checkSend(noDemo, M.getTemplate("wa_fu2_en"), "whatsapp", SETTINGS, 0, now).blockers.some((b) => /no demo yet/i.test(b)), "follow-up 2 makes no demo claim, so no demo is needed");

  check(blockedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 10, now), /cap/i), "10 first messages today: the 11th first WhatsApp blocks");
  check(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 9, now).ok, "9 today: the 10th still goes");
  check(blockedBy(M.checkSend(lead, waFirst, "whatsapp", { ...SETTINGS, whatsappDailyCap: 3 }, 3, now), /3 of 3/), "the cap comes from settings");
  const capReply = M.checkSend({ ...lead, status: "replied" }, waReply, "whatsapp", SETTINGS, 10, now);
  check(capReply.ok && warnedBy(capReply, /cap/i), "cap reached only warns for a reply to someone who answered");

  const late = new Date("2026-09-29T16:00:00.000Z"); // 21:30 IST
  const lateRes = M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, late);
  check(lateRes.ok && warnedBy(lateRes, /quiet hours/i), "21:30 India time warns (quiet hours) but does not block");
  const early = new Date("2026-09-29T03:00:00.000Z"); // 08:30 IST
  check(warnedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, early), /quiet hours/i), "08:30 India time warns");
  const nine = new Date("2026-09-29T03:30:00.000Z"); // 09:00 IST
  check(!warnedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, nine), /quiet hours/i), "09:00 India time is not quiet");
  const sunday = new Date("2026-10-04T06:00:00.000Z");
  check(warnedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, sunday), /Sunday/), "Sunday warns");

  const dup = M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, now, { duplicateOf: { id: "other", instituteName: "Sunrise Public School (Branch)" } });
  check(dup.ok && warnedBy(dup, /another lead/i), "duplicate contact warns");
  check(!warnedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, now, { duplicateOf: { id: lead.id, instituteName: "self" } }), /another lead/i), "a lead is not its own duplicate");

  check(blockedBy(M.checkSend({ ...lead, email: "" }, emFirst, "email", SETTINGS, 0, now), /e-mail address/i), "e-mail with no address blocks");
  check(blockedBy(M.checkSend({ ...lead, phone: "", whatsapp: "" }, waFirst, "whatsapp", SETTINGS, 0, now), /phone/i), "WhatsApp with no number blocks");
  check(blockedBy(M.checkSend(lead, emFirst, "whatsapp", SETTINGS, 0, now), /e-mail template|email template/i), "channel mismatch blocks");
  check(blockedBy(M.checkSend({ ...lead, demoSlug: "" }, waReply, "whatsapp", SETTINGS, 0, now), /demo/i), "link message with no demo blocks");
  check(blockedBy(M.checkSend({ ...lead, observation: "" }, M.getTemplate("wa_fu2_hinglish"), "whatsapp", SETTINGS, 0, now), /observation/i), "observation message with no observation blocks");
  const recent = { ...lead, status: "contacted", lastContactedAt: new Date(now.getTime() - 3 * 3600_000).toISOString() };
  check(warnedBy(M.checkSend(recent, M.getTemplate("wa_fu1_hinglish"), "whatsapp", SETTINGS, 0, now), /24 hours/), "second message within a day warns");
  check(warnedBy(M.checkSend(recent, waFirst, "whatsapp", SETTINGS, 0, now), /contacted before/), "a first message to a contacted lead warns");
  check(warnedBy(M.checkSend(sampleLead("coaching"), waFirst, "whatsapp", SETTINGS, 0, now), /written for a school/), "school template to a coaching lead warns");
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */

if (NEGATIVE) {
  const expected = [/allowsLink false has no link field/, /first WhatsApp renders with no URL/, /REMOVE opt-out/, /gmail: subject decodes/, /do_not_contact blocks/];
  const missed = expected.filter((re) => !failures.some((f) => re.test(f)));
  console.log(`\nNEGATIVE CONTROL: ${failures.length} failures seen.`);
  if (missed.length) {
    console.log(`NEGATIVE CONTROL FAILED: these sabotages went undetected: ${missed.map(String).join(", ")}`);
    process.exit(1);
  }
  console.log("NEGATIVE CONTROL OK: every sabotage was caught.");
  process.exit(0);
}

console.log(`\n${passes} passed, ${failures.length} failed (${T.length} templates, ${M.OBSERVATIONS.length} observations).`);
process.exit(failures.length ? 1 : 0);
