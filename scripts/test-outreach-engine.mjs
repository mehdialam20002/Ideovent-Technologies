/**
 * Tests the Outreach templates and engine (src/lib/outreach/templates.ts, engine.ts)
 * against Mehdi's approved format and wording (04-sales-kit/APPROVED-MESSAGES-2026-10-01.md,
 * and the rules of APPROVED-MESSAGES-2026-09-30.md, which still hold).
 *
 *   node scripts/test-outreach-engine.mjs
 *
 * WHAT IT ASSERTS
 *   1. The registry: every stage x kind x channel x language the ladder needs
 *      (dental, school and coaching, or a neutral one), unique ids, no dash,
 *      price, emoji, hype word, "left empty" claim or typed session year anywhere.
 *   2. Every live template renders for every lead it can be offered to, in its
 *      language, with no unfilled {field} and no warning but the ones expected.
 *   3. First messages, the approved format of 1 Oct 2026: five parts with a
 *      blank line between parts (the greeting and who on their own lines, the
 *      problem, the impact, the solution with exactly three bullets, the ask and
 *      the easy no on their own lines), for every lead each can go to (every
 *      observation, every dental specialty, the demo with and without their
 *      number); no link, price or emoji; one question; short lines; "made"
 *      needs a demo, "offer" does not. E-mails: the same parts as paragraphs.
 *   4. The approved examples render word for word (dental, school and coaching,
 *      no website and their site; dental in English; the follow-up; the link
 *      after a yes; the summary; the e-mail).
 *   5. The merge fields: {greeting} {senderFirstName} {timeOfDay} {kindNoun}
 *      {impact} {offer} {need} in each language; problemType; dental
 *      specialties; the school session.
 *   6. {callSlots}: never a Sunday, always inside 10:00 to 21:00 and the kind's window.
 *   7. Cadence: 4 days, ONE WhatsApp follow-up (the others retired but still
 *      resolvable), e-mail follow-ups on day 4, 9 and 16 in the same thread.
 *   8. [Placeholders] block the send until filled.
 *   9. mailto and WhatsApp links decode exactly and carry every blank line
 *      (%0A%0A) and bullet; demo links never point at a preview.
 *  10. checkSend: every guard (do not contact, links, promised demo, observation,
 *      "no website" truth, quiet hours from 10:00, limits, duplicates, kinds).
 *  11. Dental: the full ladder, no claim words, no school words, no call or
 *      WhatsApp (nor a school's enquiry form) promised unless the demo has their
 *      number, dental chips.
 *  12. (section 13 below) Copy rules: neutral first messages and summaries go to
 *      other businesses only, the sample's contents as bullets, a children's
 *      clinic "the way a parent would", no payment split typed into the
 *      proposal e-mail, the approved "yahin chhod raha hoon", the opt-out only
 *      under cold e-mails.
 *  13. (section 14 below) Specialist clinics hear their own impact line and
 *      bullets, {addressAs} ("Dr. Mehta, aaj ki baat ka summary:"), an implant
 *      centre is never offered a cost range its demo does not show, an "other"
 *      business is offered what its demo's kind has, principals are called after
 *      school, the approved day-16 words.
 *  14. (section 15 below) The picture link of 1 Oct 2026: every live WhatsApp
 *      first message of a clinic, school or coaching institute that says the
 *      sample is made has exactly one link, its kind's picture page
 *      (https://www.ideovent.in/w/<kind>), in a part of its own just before the
 *      ask, which asks for their own sample's link; no other first message has
 *      a link (the "offer" twins, whose lead has no sample yet while the picture
 *      says one was built, the pitch-page message, other businesses, every
 *      e-mail); checkSend lets exactly that one link through and nothing else;
 *      the three static pages carry the card tags, noindex and the Haan button,
 *      their JPEGs are 600 px wide or more and 300 KB or less, and "w" is
 *      reserved from pitch slugs.
 *
 * NEGATIVE CONTROL
 *
 *   OUTREACH_ENGINE_NEGATIVE=1 node scripts/test-outreach-engine.mjs
 *
 * sabotages the real modules after loading them (a link in every first
 * WhatsApp, the easy no dropped from first e-mails, a WhatsApp button promised,
 * the opt-out dropped and put back under the replies after a yes, the mailto
 * subject dropped, every kind offered to a clinic, do-not-contact forgotten, the old cap of 10, a Sunday call slot,
 * placeholders ignored, the 2-day cadence back, the retired WhatsApp
 * follow-ups offered again, the greeting lost, the specialist clinics' specialty
 * lost, a coaching first WhatsApp flattened back into one paragraph, "ji" after
 * "Dr. Mehta" in the summary, a cost range promised by an implant centre's
 * message, principals called at 11 am, a clinic's message carrying the school's
 * picture link). The run must then FAIL on each; it exits 0 only when every
 * expected failure was seen.
 *
 * Bundled with esbuild exactly like scripts/test-from-template.mjs; nothing mocked.
 * Every lead here is fictional (example.org, "Example ..." names).
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
export { mainOriginFrom } from "@/lib/host";
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
  const noEasyNo = (s) => s.replace(real.APPROVED_ASK.en, "Shall I send you the link?").replace(real.APPROVED_ASK.hinglish, "Kya main aapko link bhej doon?");
  M.OUTREACH_TEMPLATES = real.OUTREACH_TEMPLATES.map((t) =>
    t.channel === "whatsapp" && t.stage === "first" ? { ...t, body: `${t.body}\n{demoLink}` }
    // ...a dental first e-mail promises the demo's WhatsApp button, which shows only once the clinic's number is on it...
    : t.kind === "dental" && t.channel === "email" && t.stage === "first" ? { ...t, body: `${t.body}\n\nPatients can also send you a WhatsApp in one tap.` }
    // ...the school and coaching first e-mails lose their easy no...
    : t.channel === "email" && t.stage === "first" ? { ...t, body: noEasyNo(t.body) }
    : t,
  );
  M.render = (t, lead, ctx) => {
    // ...the specialist clinics lose their specialty (segment and demo template), so their own impact and bullets...
    const r = real.render(t, { ...lead, tags: [] }, ctx?.demo ? { ...ctx, demo: { ...ctx.demo, templateId: undefined } } : ctx);
    // ...the opt-out line goes, and the greeting loses the name and title...
    let body = r.body.replace(real.EMAIL_OPT_OUT_EN, "").replace(real.EMAIL_OPT_OUT_HINGLISH, "").replace(/^(Namaste|Good \w+|Dear) [^,!]+/, "$1").trim();
    // ...a reply after a yes (the link, the summary, the proposal) gets the cold opt-out...
    if (t.channel === "email" && !real.carriesOptOut(t.stage)) body = `${body}\n\n${real.EMAIL_OPT_OUT_EN}`;
    // ...and a coaching institute's first WhatsApp goes back to one paragraph ("msz me line break nahi").
    if (t.channel === "whatsapp" && t.stage === "first" && t.kind === "coaching") body = body.replace(/\s*\n+\s*/g, " ");
    // ...and a clinic's first WhatsApp carries the school's picture link.
    if (t.kind === "dental") body = body.replace("https://www.ideovent.in/w/dental", "https://www.ideovent.in/w/school");
    return { ...r, body };
  };
  M.mailtoUrl = (input) => real.mailtoUrl({ ...input, subject: "" });
  // ...a dental lead is shown every kind's templates, and the retired WhatsApp follow-ups come back...
  M.templatesFor = (f = {}) => [
    ...real.templatesFor(f.kind === "dental" ? { ...f, kind: undefined } : f),
    ...real.RETIRED_TEMPLATES.filter((t) => (!f.channel || t.channel === f.channel) && (!f.stage || t.stage === f.stage)),
  ];
  M.observationsFor = () => real.OBSERVATIONS.slice();
  // ...do-not-contact is forgotten, the old cap of 10 is back, and [placeholders] no longer block.
  M.checkSend = (lead, t, ch, settings, count, ...rest) => {
    const r = real.checkSend(lead.status === "do_not_contact" ? { ...lead, status: "contacted" } : lead, t, ch,
      settings && !(settings.whatsappDailyLimit > 0) ? { ...settings, whatsappDailyLimit: 10 } : settings, count, ...rest);
    const blockers = r.blockers.filter((b) => !/^Fill in/.test(b));
    return { ...r, blockers, ok: blockers.length === 0 };
  };
  // ...a call is proposed on a Sunday...
  M.callSlots = (kind, now) => real.callSlots(kind, now).map((s, i) => {
    if (i) return s;
    const back = (s.day || 7) * 86_400_000;
    return { ...s, at: new Date(s.at.getTime() - back), day: 0 };
  });
  // ...and the WhatsApp follow-up is due after two days again.
  M.FOLLOW_UP_DAYS = { ...real.FOLLOW_UP_DAYS, first: 2 };
  M.followUpDate = (stage, from) => (stage === "first" ? new Date(new Date(from).getTime() + 2 * 86_400_000) : real.followUpDate(stage, from));
  // ...the summary says "Dr. Mehta ji,", an implant centre is promised a cost range, principals are called at 11 am.
  M.addressFor = (name, kind, language) => real.greetingFor(name, kind, language);
  M.offerFor = (input) => (input.specialty === "implant" && input.kind === "dental" ? "implant ka process, kharche ki range aur appointment booking" : real.offerFor(input));
  M.CALL_WINDOWS = { ...real.CALL_WINDOWS, school: { days: [2, 3, 4], times: [11 * 60, 12 * 60], window: [11 * 60, 13 * 60] } };
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
/** Every web address in a text, each once per place it appears. */
const URL_ALL = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:vercel\.app|com|in|org|net)\/\S*|wa\.me\/\S*/gi;
const linksIn = (s) => s.match(URL_ALL) || [];
/** The kinds with a picture page (preview.ts). */
const KIND3 = ["dental", "school", "coaching"];
const HYPE = /\b(best|free|guarantee\w*|urgent\w*|hurry|limited time|offer ends|today only|last chance|no\.?\s?1|number one|cheapest|lowest price)\b/i;
const EMPTY_CLAIM = /left (the space )?empty|deliberately empty|empty on purpose|khaali|खाली/i;
const EMOJI = /\p{Extended_Pictographic}/u;

const T = M.OUTREACH_TEMPLATES;
const KINDS = ["dental", "school", "coaching", "other"];
const NAMES = { dental: "Example Dental Clinic", school: "Example Public School", coaching: "Example Classes", other: "Example Yoga Studio" };
const CONTACT = { dental: "Dr. Mehta", school: "Principal Ma'am", coaching: "Verma Sir", other: "Mrs. Rao" };
const FIX_OBS = { dental: "no_timings", school: "no_fees_admission", coaching: "no_batch_fees", other: "not_mobile" };
/** A fictional lead of one kind, with a demo, a pitch page and a titled contact. */
const leadOf = (kind = "school", over = {}) => ({
  id: `lead_${kind}`,
  createdAt: "2026-09-27T05:00:00.000Z",
  updatedAt: "2026-09-27T05:00:00.000Z",
  instituteName: NAMES[kind] || NAMES.school,
  kind,
  contactName: CONTACT[kind],
  phone: "98765 43210",
  email: "office@example.org",
  city: "Saket, New Delhi",
  status: "new",
  source: "lead-finder",
  placeId: "ChIJ_example",
  demoSlug: `example-${kind}`,
  pitchSlug: `example-${kind}-note`,
  ...over,
});
/** The lead a template is written for: its pitch decides whether the lead has a website and an observation. */
const leadFor = (t, kind, over = {}) => {
  const k = kind || (t.kind === "any" ? "other" : t.kind);
  const fix = t.pitch === "fix_website";
  return leadOf(k, { ...(fix ? { website: "https://example.org", observation: FIX_OBS[k] } : {}), ...over });
};
// Tuesday 29 Sep 2026, 14:30 India time.
const NOW = new Date("2026-09-29T09:00:00.000Z");
const SETTINGS = { signature: "", quietStart: "20:00", quietEnd: "10:00", alertOnDemoOpen: true };
const textOf = (r) => `${r.subject ?? ""}\n${r.body}`;
/** An e-mail's own words: everything above "Regards,". */
const ownWords = (t, r) => (t.channel === "email" ? r.body.split("\n\nRegards,")[0] : r.body);
const LANGS = ["en", "hinglish"];

/* ── 1. The registry ─────────────────────────────────────────────────────── */

const has = (f) => T.some((t) => Object.entries(f).every(([k, v]) => t[k] === v));
const hasFor = (kind, f) => T.some((t) => (t.kind === kind || t.kind === "any") && Object.entries(f).every(([k, v]) => t[k] === v));
check(T.length >= 140, `the full approved set is registered (has ${T.length})`);
const allIds = [...T, ...M.RETIRED_TEMPLATES].map((t) => t.id);
check(new Set(allIds).size === allIds.length, "template ids are unique, retired ones included");

// Every stage x kind x channel x language: the kind's own template, or a neutral one.
for (const channel of ["whatsapp", "email"]) {
  for (const stage of M.stagesFor(channel)) {
    for (const kind of ["dental", "school", "coaching"]) {
      for (const language of LANGS) {
        check(hasFor(kind, { channel, stage, language }), `${channel} ${stage} ${language}: a ${kind} or neutral template`);
      }
    }
  }
}
// First messages: every kind (and neutral) x pitch x channel x language x made / offer.
for (const kind of ["dental", "school", "coaching", "any"]) {
  for (const pitch of ["new_website", "fix_website"]) {
    for (const channel of ["whatsapp", "email"]) {
      for (const language of LANGS) {
        for (const sample of ["made", "offer"]) {
          check(has({ kind, pitch, channel, language, sample, stage: "first" }), `first ${channel} ${pitch} ${kind} ${language} (${sample})`);
        }
      }
    }
  }
}
for (const id of ["wa_first_new_school_hi", "wa_first_new_school_hi_offer", "wa_after_reply_hi", "wa_after_reply_dental_hi"]) {
  check(M.getTemplate(id)?.language === "hi" && !M.getTemplate(id)?.retired, `${id}: the Hindi message is kept`);
}
for (const id of ["wa_first_pitch_any_hinglish", "wa_first_pitch_any_en", "em_first_pitch_any_en", "em_first_pitch_any_hinglish"]) {
  check(M.getTemplate(id)?.stage === "first" && M.promisedPage(M.getTemplate(id)) === "pitch", `${id}: the pitch-page first message promises the note`);
}
for (const t of T) {
  // What the template can say: its subject, its body and any specialist variant of the body.
  const said = [t.subject ?? "", t.body, ...Object.values(t.variants ?? {})].join("\n");
  const text = `${said}\n${t.label}\n${t.note ?? ""}`;
  check(!DASH.test(text), `${t.id}: no em or en dash`);
  check(!/₹|\bRs\.?\s?\d|\bINR\b/i.test(text), `${t.id}: no price`);
  check(!/ideovent\.in\b/i.test(text), `${t.id}: does not type ideovent.in (the picture link comes from {previewLink})`);
  check(!HYPE.test(said), `${t.id}: no hype word (${(said.match(HYPE) || [""])[0]})`);
  check(!EMPTY_CLAIM.test(said), `${t.id}: never says a space was left empty`);
  check(!EMOJI.test(said), `${t.id}: no emoji`);
  check(!/\b20\d\d-\d\d\b/.test(said), `${t.id}: no session year typed into the text`);
  check(!/nothing in (this|it) for (me|us)|mera koi kaam nahi|कोई काम नहीं/i.test(said), `${t.id}: never says there is nothing in it for us`);
  const shown = `${t.label}\n${t.note ?? ""}`;
  check(!/\.md\b|playbook/i.test(shown) && !/[A-Z]{3,}-[A-Z]{3,}/.test(shown), `${t.id}: label and note name no internal playbook file`);
  check(!URL_IN_TEXT.test(text), `${t.id}: types no web address into its text, label or note (a link comes from a merge field)`);
  check(t.channel !== "email" || Boolean(t.subject), `${t.id}: e-mail has a subject`);
  check(t.allowsLink || !/\{(demoLink|pitchLink)\}/.test(said), `${t.id}: allowsLink false has no link field`);
  check(!t.retired, `${t.id}: a live template is not retired`);
  for (const f of M.fieldsUsed(t)) check(M.MERGE_FIELDS.includes(f), `${t.id}: {${f}} is a known merge field`);
  check(!M.fieldsUsed(t).includes("timeOfDay") || t.language === "en", `${t.id}: only English says "Good {timeOfDay}"`);
  check(!M.fieldsUsed(t).includes("contactName"), `${t.id}: greets with {greeting}, not the old {contactName}`);
}
for (const o of M.OBSERVATIONS) {
  check(Boolean(o.id && o.label && o.en && o.hinglish), `observation ${o.id} has id, label, en and hinglish`);
  check(!DASH.test(o.en + o.hinglish + o.label) && !/\b20\d\d-\d\d\b/.test(o.en + o.hinglish), `observation ${o.id}: no dash, no typed session year`);
}
for (const f of ["greeting", "senderFirstName", "timeOfDay", "kindNoun", "offer", "callSlots", "previewLink"]) {
  check(M.MERGE_FIELDS.includes(f), `{${f}} is a documented merge field`);
}

/* ── 2. Every template, every lead it can be offered to ─────────────────── */

const EXPECTED_WARNING = /^Fill in \[|Attach the proposal PDF/;
let renders = 0;
for (const t of T) {
  for (const kind of t.kind === "any" ? KINDS : [t.kind]) {
    const variants = kind === "dental" ? [[], ["DENTAL_IMPLANT"], ["DENTAL_ORTHO"], ["DENTAL_KIDS"]] : [[]];
    for (const tags of variants) {
      const lead = leadFor(t, kind, { tags });
      for (const ctx of [{ now: NOW }, { now: NOW, demo: { phone: true, whatsapp: true } }]) {
        const r = M.render(t, lead, ctx);
        renders++;
        const all = textOf(r);
        const tag = `${t.id} [${kind}${tags.length ? ` ${tags[0]}` : ""}${ctx.demo ? " +number" : ""}]`;
        check(!/\{\w+\}/.test(all) && !/[{}]/.test(all), `${tag}: no unfilled {field}`);
        check(!DASH.test(all), `${tag}: rendered text has no dash`);
        const unexpected = r.warnings.filter((w) => !EXPECTED_WARNING.test(w));
        check(unexpected.length === 0, `${tag}: no warning for a complete lead (${unexpected.join(" | ")})`);
        const holes = M.unfilledPlaceholders(all);
        check(!holes.length || t.stage === "after_call" || t.stage === "proposal", `${tag}: no [placeholder] outside the summary and proposal (${holes.join(", ")})`);
        check(all.includes(lead.instituteName) || !/\{instituteName\}/.test(`${t.subject ?? ""}${t.body}`), `${tag}: institute name filled`);
        if (t.channel === "email") {
          // The opt-out goes under every cold e-mail (the first and its follow-ups), never under a reply after a yes.
          if (M.carriesOptOut(t.stage)) {
            check(r.body.trimEnd().endsWith(`\n\n${M.emailOptOutLine(t.language)}`), `${tag}: e-mail ends with the short REMOVE line`);
            check(r.body.split("REMOVE").length === 2, `${tag}: REMOVE appears exactly once`);
          } else {
            check(!/REMOVE/.test(r.body), `${tag}: a reply after a yes carries no REMOVE line`);
          }
          check(r.body.includes("\n\nRegards,\nMehdi Alam, Ideovent Technologies, Saket, New Delhi\n+91 77619 21786"), `${tag}: e-mail signed as approved`);
        }
        if (/\{demoLink\}/.test(t.body)) check(all.includes(`https://ideovent.vercel.app/site/${lead.demoSlug}\n`), `${tag}: the demo link sits on its own line`);
        if (/\{pitchLink\}/.test(t.body)) check(all.includes(`https://ideovent.vercel.app/${lead.pitchSlug}\n`), `${tag}: the pitch link sits on its own line`);
      }
    }
  }
}
check(renders > 800, `the render matrix ran (${renders} renders)`);
// The fallback greeting leaves nothing unfilled either, in every language.
for (const t of T) {
  const kind = t.kind === "any" ? "other" : t.kind;
  const r = M.render(t, leadFor(t, kind, { contactName: "" }), { now: NOW });
  check(!/\{\w+\}/.test(textOf(r)) && r.warnings.some((w) => /No contact name/.test(w)), `${t.id}: no contact name still renders, and says so`);
}

/* ── 3. First messages: the approved five parts, no link, short lines ───── */

/*
 * THE SHAPE (1 Oct 2026: "msz me line break nahi", "pehle problem btao fir solution ache se btao").
 * A WhatsApp first message is five parts with one blank line between parts. Part 1 is the greeting
 * and who is writing, each on its own line with a blank line between them, as the approved examples
 * set it out, so the text splits on "\n\n" into six blocks:
 *   greeting "Namaste Dr. Sharma ji," | who "Main Mehdi, ..." | the problem | the impact (one line) |
 *   the solution (a line ending ":" and exactly three "• " bullets) | the ask and the easy no (two lines).
 * A WhatsApp message that says the sample is made, to a clinic, school or coaching institute, has
 * one more block just before the ask (1 Oct 2026): the picture link, "Ek jhalak yahan dekhiye:
 * https://www.ideovent.in/w/<kind>", and its ask is "Kya main aapke <noun> ka sample link bhej doon?".
 * An e-mail has the same parts as paragraphs above "Regards,", with the greeting alone in part 1.
 */
const BULLET = "• ";
const PRICE = /₹|\bRs\b|\bINR\b|\b\d{1,3}(,\d{2})*,\d{3}\b|\d\s?\/-/;
/** The picture line as rendered for a kind, in a language. */
const pictureLine = (language, kind) => M.PREVIEW_LINE[language].replace("{previewLink}", `https://www.ideovent.in/w/${kind}`);
/** The ask a first message ends with, as rendered: the picture link's ask names their place ({kindNoun}). */
function askOf(t, noun) {
  if (M.carriesPreview(t)) return M.PREVIEW_ASK[t.language].replace("{kindNoun}", noun);
  return (t.sample === "offer" ? M.OFFER_ASK : M.APPROVED_ASK)[t.language];
}
function shapeOf(text, channel, picture = "") {
  const blocks = text.split("\n\n");
  const why = [];
  const want = (channel === "whatsapp" ? 6 : 5) + (picture ? 1 : 0);
  if (blocks.length !== want) why.push(`${blocks.length} blocks, not ${want}`);
  if (blocks.some((b) => !b.trim() || /^\s|\s$/.test(b))) why.push("an empty block or a stray space");
  const [greet, ...rest] = blocks;
  const who = channel === "whatsapp" ? rest.shift() : undefined;
  const [problem, impact, solution, ...tail] = rest;
  const look = picture ? tail.shift() : undefined;
  const [ask] = tail;
  if (picture && look !== picture) why.push(`picture line "${look}", not "${picture}"`);
  if (!/^(Namaste|Good (morning|afternoon|evening)|Dear|नमस्ते) [^\n]+,$/.test(greet ?? "")) why.push(`greeting "${greet}"`);
  if (channel === "whatsapp" && ![M.WHO.hinglish, M.WHO.en, M.WHO.hi].map((w) => w.replace("{senderFirstName}", "Mehdi")).includes(who)) why.push(`who "${who}"`);
  if (!problem || problem.includes("\n") || problem.includes(BULLET)) why.push("the problem is not one paragraph");
  if (!impact || impact.includes("\n") || impact.includes(BULLET)) why.push("the impact is not one line");
  const lines = (solution ?? "").split("\n");
  if (!/:$/.test(lines[0] ?? "") || (lines[0] ?? "").startsWith(BULLET)) why.push(`solution line "${lines[0]}"`);
  const items = lines.slice(1);
  if (items.length !== 3 || !items.every((l) => l.startsWith(BULLET) && l.length > 6 && !/[.:;,]$/.test(l))) why.push(`bullets ${JSON.stringify(items)}`);
  const askLines = (ask ?? "").split("\n");
  return { why, blocks, askLines, items, problem, impact };
}

const FIRST = T.filter((t) => t.stage === "first");
let shapes = 0;
for (const t of FIRST) {
  const kind = t.kind === "any" ? "other" : t.kind;
  const lead = leadFor(t, kind);
  const r = M.render(t, lead, { now: NOW });
  const words = ownWords(t, r);
  // The picture link (1 Oct 2026): a WhatsApp message that says the sample is made, to a clinic, school or coaching institute.
  const pic = M.carriesPreview(t);
  const picture = pic ? pictureLine(t.language, t.kind) : "";
  const tplText = `${t.subject ?? ""}${t.body}`;
  check(pic === (t.channel === "whatsapp" && t.sample === "made" && t.promises === "demo" && KIND3.includes(t.kind)),
    `${t.id}: carries the picture link exactly when it is a WhatsApp 'sample made' message to a clinic, school or coaching institute`);
  check(t.allowsLink === false && !M.containsLink(pic ? tplText.replace("{previewLink}", "") : tplText) && tplText.split("{previewLink}").length === (pic ? 2 : 1),
    `${t.id}: a first message carries no link${pic ? " but its one {previewLink}" : ""}`);
  check(pic ? JSON.stringify(linksIn(textOf(r))) === JSON.stringify([`https://www.ideovent.in/w/${t.kind}`]) : !URL_IN_TEXT.test(textOf(r)),
    pic ? `${t.id}: rendered with exactly one link, its kind's picture page (${linksIn(textOf(r)).join(", ")})` : `${t.id}: rendered with no URL`);
  const ask = askOf(t, M.kindNounFor(kind, t.language, kind === "dental" ? M.dentalSpecialty(lead) : "general"));
  check(words.endsWith(`\n\n${pic ? `${picture}\n\n` : ""}${ask}`) && ask.split("\n").at(-1) === M.EASY_NO[t.language] && ask.split("\n").length === 2,
    `${t.id}: ends with the approved ${pic ? "picture link, then the question" : t.sample === "offer" ? "offer" : "question"} and easy no, each on its own line`);
  if (pic) check(/sample link bhej doon\?|link to your [^\n]+'s sample\?|सैंपल लिंक भेज दूँ\?/.test(ask), `${t.id}: with the picture, the ask is for the link to their own sample`);
  check((words.match(/\?/g) || []).length === 1, `${t.id}: exactly one question`);
  check(t.sample === "offer" ? M.promisedPage(t) === null : M.promisedPage(t) !== null, `${t.id}: ${t.sample === "offer" ? "promises nothing" : "says what is made"}`);
  check(t.body.includes("{impact}") && (t.promises === "pitch" || t.body.includes("\n{offer}\n\n")), `${t.id}: says the impact, then the bullets under the solution line`);
  // Every lead it can go to: every observation its kind can pick, every dental specialty, the demo with and without their number.
  const obsIds = t.pitch === "fix_website" ? M.observationsFor(kind).map((o) => o.id).filter((id) => id !== "no_website") : [undefined];
  const specialties = kind === "dental" ? [[], ["DENTAL_IMPLANT"], ["DENTAL_ORTHO"], ["DENTAL_KIDS"]] : [[]];
  let longest = 0;
  let longestLine = 0;
  let words100 = 0;
  const bad = [];
  for (const observation of obsIds) {
    for (const tags of specialties) {
      for (const demo of [undefined, { phone: true, whatsapp: true }]) {
        const oneLead = leadFor(t, kind, { observation, tags });
        const one = M.render(t, oneLead, { now: NOW, demo });
        const own = ownWords(t, one);
        const s = shapeOf(own, t.channel, picture);
        shapes++;
        if (s.why.length) bad.push(`${observation ?? "no site"} ${tags[0] ?? ""}${demo ? " +number" : ""}: ${s.why.join("; ")}`);
        const want = askOf(t, M.kindNounFor(kind, t.language, kind === "dental" ? M.dentalSpecialty(oneLead) : "general"));
        if (s.askLines.join("\n") !== want) bad.push(`ask ${JSON.stringify(s.askLines)}`);
        const links = linksIn(textOf(one));
        if ((pic ? links.join(" ") !== `https://www.ideovent.in/w/${t.kind}` : links.length > 0) || PRICE.test(own) || EMOJI.test(own) || DASH.test(own)) {
          bad.push(`${observation}: a link (${links.join(", ")}), price, emoji or dash`);
        }
        if ((own.match(/\?/g) || []).length !== 1) bad.push("not exactly one question");
        longest = Math.max(longest, own.length);
        longestLine = Math.max(longestLine, ...own.split("\n").map((l) => l.length));
        words100 = Math.max(words100, own.split(/\s+/).filter(Boolean).length);
      }
    }
  }
  check(bad.length === 0, `${t.id}: five parts (greeting and who, problem, impact, the solution with three bullets, ${pic ? "the picture link, " : ""}the ask and the easy no), a blank line between parts, for every lead it can go to (${bad.slice(0, 3).join(" | ")})`);
  if (t.channel === "whatsapp") {
    check(r.body.startsWith(`${M.GREET[t.language].replace("{greeting}", M.greetingFor(lead.contactName, kind, t.language)).replace("{timeOfDay}", "afternoon")}\n\n${M.WHO[t.language].replace("{senderFirstName}", "Mehdi")}\n\n`),
      `${t.id}: opens with the approved greeting, then who, each on its own line (${r.body.slice(0, 80)})`);
    // Short lines; the whole message about as long as the approved examples, with every observation and specialty.
    // The picture line and the longer ask add about 90 characters to the messages that carry them.
    const cap = pic ? 740 : 650;
    check(longestLine <= 160, `${t.id}: every line is short (longest ${longestLine} characters)`);
    check(longest <= cap, `${t.id}: under ${cap} characters with every observation and specialty (max ${longest})`);
  } else {
    check(r.subject === `${lead.instituteName} website`, `${t.id}: subject "<name> website" (${r.subject})`);
    check(/^(Dear|Namaste) [^,\n]+,\n\n/.test(r.body), `${t.id}: greets by name and title on its own line`);
    check(!/Ideovent/.test(words), `${t.id}: the e-mail does not say who is writing above the signature (the From line and the signature do)`);
    check(words100 <= 110, `${t.id}: under 110 words before the signature with every observation (${words100})`);
  }
}
check(shapes >= 1200, `the shape of every first message was read for every lead it can go to (${shapes})`);
{
  // "Made" needs the demo; "offer" goes without one, and says so when a demo exists.
  const k = (t) => (t.kind === "any" ? "other" : t.kind);
  for (const t of FIRST.filter((x) => M.promisedPage(x) === "demo")) {
    const res = M.checkSend(leadFor(t, k(t), { demoSlug: undefined }), t, t.channel, SETTINGS, 0, NOW);
    check(!res.ok && res.blockers.some((b) => /no demo yet/.test(b)), `${t.id}: says the sample is made, so it blocks with no demo`);
  }
  for (const t of FIRST.filter((x) => x.sample === "offer")) {
    const res = M.checkSend(leadFor(t, k(t), { demoSlug: undefined }), t, t.channel, SETTINGS, 0, NOW);
    check(res.ok && res.warnings.length === 0, `${t.id}: offers to make a sample, so it goes with no demo (${[...res.blockers, ...res.warnings].join(" | ")})`);
    const withDemo = M.checkSend(leadFor(t, k(t)), t, t.channel, SETTINGS, 0, NOW);
    check(withDemo.ok && withDemo.warnings.some((w) => /already has a demo/.test(w)), `${t.id}: with a demo, it points to the "made" message`);
  }
  const t = M.getTemplate("em_first_new_school_en");
  const r = M.render(t, leadOf("school"), { now: NOW });
  const typed = M.checkSend(leadOf("school"), t, "email", SETTINGS, 0, NOW, { text: { subject: r.subject, body: `${r.body}\nhttps://ideovent.vercel.app/site/example-school` } });
  check(!typed.ok && typed.blockers.some((b) => /must not carry a link/.test(b)), "a link typed into a first e-mail blocks");
  const asRendered = M.checkSend(leadOf("school"), t, "email", SETTINGS, 0, NOW, { text: { subject: r.subject, body: r.body } });
  check(asRendered.ok, `the same e-mail as rendered goes (${asRendered.blockers.join(" | ")})`);
  const sig = { ...SETTINGS, signature: "Mehdi Alam\nwww.example.org" };
  const r2 = M.render(t, leadOf("school"), { now: NOW, signature: sig.signature });
  check(M.checkSend(leadOf("school"), t, "email", sig, 0, NOW, { text: { subject: r2.subject, body: r2.body } }).ok, "a web address in the signature does not count as a link in the message");
}

/* ── 4. The approved examples render word for word (1 Oct 2026) ──────────── */

{
  const say = (id, lead, ctx = {}) => M.render(M.getTemplate(id), lead, { now: NOW, ...ctx }).body;
  const clinic = (over = {}) => leadOf("dental", { instituteName: "Example Smile Care", ...over });
  const site = { website: "https://example.org" };
  const NUMBER = { demo: { phone: true, whatsapp: true } };
  // 1 Oct 2026: the picture link, a part of its own just before the ask, and the ask for their own sample's link.
  const ASK = (kind, noun) => `Ek jhalak yahan dekhiye: https://www.ideovent.in/w/${kind}\n\nKya main aapke ${noun} ka sample link bhej doon?\nPasand na aaye to koi baat nahi.`;
  const HELLO = (name) => `Namaste ${name},\n\nMain Mehdi, Ideovent Technologies (Saket, Delhi) se.\n\n`;
  const dentalNew = say("wa_first_new_dental_hinglish", clinic({ contactName: "Dr. Sharma" }), NUMBER);
  check(dentalNew === `${HELLO("Dr. Sharma ji")}Google par aapka clinic dekha. Clinic ki apni website nahi hai, sirf Google listing hai.\n\n` +
    "Aaj patient clinic chunne se pehle timings, treatments aur fees online dekhte hain. Ye na mile to wo aksar agle clinic ko call kar lete hain.\n\n" +
    "Isliye humne aapke clinic ke naam se ek sample website banayi hai:\n• Saare treatments aur timings ek jagah\n• Ek tap mein call ya WhatsApp\n• Online appointment booking\n\n" + ASK("dental", "clinic"),
  `approved sample: dental, no website (${dentalNew})`);
  // The problem is the lead's own checked observation: here the words Mehdi typed in the approved example.
  const poor = say("wa_first_fix_dental_hinglish", clinic({ contactName: "Dr. Gupta", ...site, observation: "Wo theek se khul nahi rahi, aur timings kahin nahi dikhi." }), NUMBER);
  check(poor === `${HELLO("Dr. Gupta ji")}Aapke clinic ki website phone par kholi. Wo theek se khul nahi rahi, aur timings kahin nahi dikhi.\n\n` +
    "Zyaadatar patient phone se hi dekhte hain. Site na khule to wo booking ki jagah doosra clinic dhoondh lete hain.\n\n" +
    "Isliye humne aapke clinic ka ek naya sample banaya hai:\n• Phone par jaldi khulne wali site\n• Timings aur treatments pehli screen par\n• Ek tap mein call, WhatsApp ya booking\n\n" + ASK("dental", "clinic"),
  `approved sample: dental, poor website (${poor})`);
  const schoolNew = say("wa_first_new_school_hinglish", leadOf("school", { contactName: "Principal Ma'am" }), { demo: { whatsapp: true } });
  check(schoolNew === `${HELLO("Principal Ma'am")}Google par aapka school dekha. School ki apni website nahi hai, sirf Google listing hai.\n\n` +
    "Parents admission se pehle fees, facilities aur admission ka process online dhoondhte hain. Ye na mile to wo aksar doosre school mein enquiry kar lete hain.\n\n" +
    "Isliye humne aapke school ke naam se ek sample website banayi hai:\n• Admission ka process aur zaroori dates\n• Fees aur facilities ki jaankari\n• Enquiry form, jo seedha aapke phone par aata hai\n\n" + ASK("school", "school"),
  `approved sample: school, no website (${schoolNew})`);
  // The old session is typed into the [blank] before sending, as the approved example's "2023-24".
  const old = say("wa_first_fix_school_hinglish", leadOf("school", { contactName: "Sharma Sir", ...site, observation: "old_session" }), { demo: { whatsapp: true } })
    .replace("[jo purana session dikha]", "2023-24");
  check(old === `${HELLO("Sharma Sir")}Aapke school ki website dekhi. Usme abhi bhi 2023-24 ke admission likhe hain, aur fees kahin nahi hai.\n\n` +
    "Parents admission se pehle yahi sab online dekhte hain. Purani jaankari dekhkar wo aksar call hi nahi karte.\n\n" +
    "Isliye humne aapke school ka ek naya sample banaya hai:\n• 2027-28 admission ki jaankari\n• Fees ka poora structure\n• Enquiry form, jo seedha aapke phone par aata hai\n\n" + ASK("school", "school"),
  `approved sample: school, old website (${old})`);
  const coachNew = say("wa_first_new_coaching_hinglish", leadOf("coaching", { contactName: "Verma" }), NUMBER);
  check(coachNew === `${HELLO("Verma ji")}Google par aapka institute dekha. Institute ki apni website nahi hai, sirf Google listing hai.\n\n` +
    "Students join karne se pehle batch, timing aur fees online compare karte hain. Ye na mile to wo aksar doosre institute mein enquiry kar lete hain.\n\n" +
    "Isliye humne aapke institute ke naam se ek sample website banayi hai:\n• Saare courses aur batch timings ek jagah\n• Fees ki saaf jaankari\n• Ek tap mein enquiry, call ya WhatsApp\n\n" + ASK("coaching", "institute"),
  `approved sample: coaching, no website (${coachNew})`);
  const coachPoor = say("wa_first_fix_coaching_hinglish", leadOf("coaching", { contactName: "Singh Sir", ...site, observation: "NEET batch ki timing aur fees kahin nahi mili." }), NUMBER);
  check(coachPoor === `${HELLO("Singh Sir")}Aapke institute ki website phone par kholi. NEET batch ki timing aur fees kahin nahi mili.\n\n` +
    "Ye jaanne ke liye student ko pehle call karna padta hai. Kai students call karne ki jagah agla institute dekh lete hain.\n\n" +
    "Isliye humne aapke institute ka ek naya sample banaya hai:\n• Saare batches aur timings ek jagah\n• Har course ki fees saaf likhi\n• Phone par jaldi khulne wali site, ek tap mein enquiry\n\n" + ASK("coaching", "institute"),
  `approved sample: coaching, poor website (${coachPoor})`);
  // English: the approved voice, impact, bullets and close. The problem line is what was checked: no website of its own.
  const en = say("wa_first_new_dental_en", clinic({ contactName: "Dr. Mehta" }), NUMBER);
  check(en === "Good afternoon Dr. Mehta,\n\nI am Mehdi from Ideovent Technologies, Saket, Delhi.\n\nI found your clinic on Google, but it has no website of its own, only the Google listing.\n\n" +
    "Most patients check timings and book from their phone. When they cannot, they often call the next clinic on the list.\n\n" +
    "So we made a sample website for your clinic:\n• All treatments and timings in one place\n• One tap to call or WhatsApp\n• Online appointment booking\n\n" +
    "A quick look: https://www.ideovent.in/w/dental\n\nShall I send you the link to your clinic's sample?\nIf it is not useful, no problem at all.",
  `approved sample: dental, English (${en})`);
  check(say("wa_fu1_dental_hinglish", clinic({ contactName: "Dr. Sharma" })) ===
    "Namaste Dr. Sharma ji,\n\nMehdi, Ideovent se. Kuch din pehle aapke clinic ke sample page ki baat ki thi.\n\nMain yahin chhod raha hoon. Kabhi dekhna ho to bas \"haan\" likh dijiye.",
  "approved sample: the one WhatsApp follow-up, day 4");
  const yes = say("wa_after_reply_dental_hinglish", clinic({ contactName: "" }));
  check(yes.startsWith("Shukriya Doctor!\n\nYe raha sample:\nhttps://ideovent.vercel.app/site/example-dental\n\nYe sirf demonstration hai, aapki live site nahi.\nJo jaankari aapki taraf se nahi mili, wo abhi sample hai.\n\n10 minute ki call ke liye ") &&
    / theek rahega ya [A-Z][a-z]+day \d+ baje\?$/.test(yes), `after they say yes: the link on its own line, the honest lines, two call times (${yes})`);
  check(say("wa_after_call_dental_hinglish", clinic({ contactName: "Dr. Mehta" })) ===
    "Dr. Mehta, aaj ki baat ka summary:\n• Package: [package and price]\n• Payment: 50% advance, 50% launch par\n• Mujhe chahiye: logo, doctors ki details, timing, clinic ki 5-6 photos\n• Pehla version: [date]\n\nKuch badalna ho to bata dijiye.\nShukriya Doctor.",
  "after the call: the approved summary as a list, the close on its own lines");
  const mail = M.render(M.getTemplate("em_first_fix_dental_en"), clinic({ instituteName: "Smile Care", ...site, observation: "no_timings" }), { now: NOW });
  check(mail.subject === "Smile Care website" && mail.body === "Dear Dr. Mehta,\n\nI opened your clinic's website on my phone, the way a new patient would. The clinic timings are not on it.\n\n" +
    "Most patients check this on their phone first. When they cannot find it, they often call the next clinic on the list.\n\n" +
    "So we made a new sample website for your clinic:\n• A site that opens fast on a phone\n• Timings and treatments on the first screen\n• One tap to book an appointment\n\n" +
    "Shall I send you the link?\nIf it is not useful, no problem at all.\n\nRegards,\nMehdi Alam, Ideovent Technologies, Saket, New Delhi\n+91 77619 21786\n\nIf you would rather not hear from me, reply REMOVE and I will not write again.",
  `the first e-mail: the same parts as paragraphs, the greeting on its own line (${mail.body})`);
  check(say("em_fu1_dental_en", clinic({ instituteName: "Smile Care" })).startsWith("Dr. Mehta, a quick note on the sample I made for Smile Care.\n\nShall I send you the link?\n\nRegards,"), "e-mail follow-up, day 4: the approved words, the question on its own line");
  check(say("em_fu3_dental_en", clinic({ instituteName: "Smile Care" })).startsWith("Dr. Mehta, I will close this here.\n\nIf you want to see it later, just reply yes.\n\nRegards,"), "e-mail follow-up, day 16: the approved words, on their own lines");
}

/* ── 5. Merge fields ─────────────────────────────────────────────────────── */

{
  for (const [name, kind, language, want] of [
    ["Dr. Mehta", "dental", "en", "Dr. Mehta"], ["Dr. Mehta", "dental", "hinglish", "Dr. Mehta ji"], ["Dr. Mehta", "dental", "hi", "Dr. Mehta जी"],
    ["Dr Sharma", "dental", "hinglish", "Dr Sharma ji"], ["Sharma Sir", "school", "hinglish", "Sharma Sir"], ["Sharma Sir", "school", "en", "Sharma Sir"],
    ["Principal Ma'am", "school", "hinglish", "Principal Ma'am"], ["Principal", "school", "hinglish", "Principal ji"], ["Verma", "coaching", "hinglish", "Verma ji"],
    ["Verma ji", "coaching", "hinglish", "Verma ji"], ["Verma", "coaching", "en", "Verma ji"], ["Verma ji", "coaching", "en", "Verma ji"], ["Principal", "school", "en", "Principal"],
    ["Principal Ma'am", "school", "en", "Principal Ma'am"], ["Mr. Rao", "other", "hinglish", "Mr. Rao"], ["Mr. Rao", "other", "en", "Mr. Rao"], ["Mrs. Rao", "other", "hi", "Mrs. Rao"],
    ["", "dental", "en", "Doctor"], ["", "dental", "hinglish", "Doctor"], ["", "dental", "hi", "डॉक्टर साहब"],
    ["", "school", "en", "Principal"], ["", "school", "hinglish", "Principal ji"], ["", "school", "hi", "प्रिंसिपल जी"],
    ["", "coaching", "en", "Sir"], ["", "coaching", "hinglish", "Sir"], ["", "other", "hi", "सर"],
  ]) {
    check(M.greetingFor(name, kind, language) === want, `{greeting} "${name}" (${kind}, ${language}) = "${want}" (got "${M.greetingFor(name, kind, language)}")`);
  }
  check(M.render(M.getTemplate("em_first_new_school_en"), leadOf("school", { contactName: "" }), { now: NOW }).body.startsWith("Dear Principal,"), "no name: a school e-mail opens 'Dear Principal,'");
  check(M.render(M.getTemplate("em_first_new_school_hinglish"), leadOf("school", { contactName: "" }), { now: NOW }).body.startsWith("Namaste Principal ji,"), "no name: a Hinglish school e-mail opens 'Namaste Principal ji,'");
  check(M.render(M.getTemplate("em_first_new_dental_hinglish"), leadOf("dental", { contactName: "" }), { now: NOW }).body.startsWith("Namaste Doctor,"), "no name: a Hinglish clinic e-mail opens 'Namaste Doctor,'");
  const bare = M.render(M.getTemplate("wa_first_new_coaching_en"), leadOf("coaching", { contactName: "Verma" }), { now: NOW });
  check(bare.body.startsWith("Good afternoon Verma ji,\n\n"), `a bare name in English gets "ji", never "Good afternoon Verma," (${bare.body.slice(0, 30)})`);
  check(bare.warnings.some((w) => /no title/.test(w) && /"Verma ji"/.test(w)), "a bare name in an English greeting is flagged, with the greeting it reads");
  check(M.render(M.getTemplate("em_fu1_any_en"), leadOf("coaching", { contactName: "Verma" }), { now: NOW }).body.startsWith("Verma ji, a quick note"), "a line that opens with a bare name says \"Verma ji,\" in English too");
  check(!M.render(M.getTemplate("wa_first_new_coaching_hinglish"), leadOf("coaching", { contactName: "Verma" }), { now: NOW }).warnings.length, "a bare name in Hinglish becomes 'Verma ji', no warning");
  check(M.render(M.getTemplate("wa_first_new_school_hinglish"), leadOf("school"), { now: NOW, senderName: "Asha Verma" }).body.includes("\n\nMain Asha, Ideovent"), "{senderFirstName} is the sender's first name");
  const at = (hh, mm) => new Date(Date.UTC(2026, 8, 29, hh, mm) - 330 * 60_000);
  check(M.timeOfDay(at(9, 30)) === "morning" && M.timeOfDay(at(14, 30)) === "afternoon" && M.timeOfDay(at(18, 0)) === "evening", "{timeOfDay} follows India time");
  check(M.render(M.getTemplate("wa_first_new_dental_en"), leadOf("dental"), { now: at(10, 30) }).body.startsWith("Good morning Dr. Mehta,"), "an English first message at 10:30 says Good morning");
  for (const [kind, specialty, language, want] of [
    ["dental", "general", "hinglish", "clinic"], ["dental", "implant", "en", "implant centre"], ["dental", "ortho", "hinglish", "orthodontic clinic"],
    ["dental", "kids", "en", "kids dental clinic"], ["school", "general", "en", "school"], ["coaching", "general", "hinglish", "institute"],
    ["other", "general", "en", "business"], ["dental", "general", "hi", "क्लिनिक"], ["school", "general", "hi", "स्कूल"],
  ]) check(M.kindNounFor(kind, language, specialty) === want, `{kindNoun} ${kind}/${specialty}/${language} = ${want}`);
  const offer = (kind, pitch, language, extra = {}) => M.offerFor({ kind, pitch, language, now: NOW, ...extra });
  const list = (...items) => items.map((x) => `• ${x}`).join("\n");
  const BOTH = { demo: { phone: true, whatsapp: true } };
  for (const [args, want] of [
    // Dental, no website: the approved three, one-tap call or WhatsApp only with the clinic's number on the demo.
    [["dental", "new_website", "hinglish", BOTH], list("Saare treatments aur timings ek jagah", "Ek tap mein call ya WhatsApp", "Online appointment booking")],
    [["dental", "new_website", "hinglish", { sample: "offer" }], list("Saare treatments aur timings ek jagah", "Ek tap mein call ya WhatsApp", "Online appointment booking")],
    [["dental", "new_website", "hinglish"], list("Saare treatments aur timings ek jagah", "Phone par jaldi khulne wali site", "Online appointment booking")],
    [["dental", "new_website", "en", { demo: { phone: true } }], list("All treatments and timings in one place", "One tap to call", "Online appointment booking")],
    // Dental, their site: the approved three, the last one by what the demo carries.
    [["dental", "fix_website", "hinglish", BOTH], list("Phone par jaldi khulne wali site", "Timings aur treatments pehli screen par", "Ek tap mein call, WhatsApp ya booking")],
    [["dental", "fix_website", "hinglish"], list("Phone par jaldi khulne wali site", "Timings aur treatments pehli screen par", "Ek tap mein appointment booking")],
    [["dental", "fix_website", "en", { demo: { whatsapp: true } }], list("A site that opens fast on a phone", "Timings and treatments on the first screen", "One tap to WhatsApp or book")],
    // Specialist clinics: their own information; an implant centre never a cost range (its demo prices no implant).
    [["dental", "new_website", "hinglish", { specialty: "implant" }], list("Implant ka process, step by step", "Kharche ki jaankari", "Online appointment booking")],
    [["dental", "fix_website", "en", { specialty: "implant" }], list("A site that opens fast on a phone", "The implant process and cost information", "Online appointment booking")],
    [["dental", "new_website", "hinglish", { specialty: "ortho" }], list("Braces ka process, step by step", "Har tarah ke braces ke kharche ki range", "Online appointment booking")],
    [["dental", "new_website", "hinglish", { specialty: "kids" }], list("Bachche ki pehli visit mein kya hota hai", "Timings aur treatments ek jagah", "Online appointment booking")],
    // Schools: the enquiry form only with the school's WhatsApp on the demo (it sends there; with none there is no form).
    [["school", "new_website", "hinglish", { demo: { whatsapp: true } }], list("Admission ka process aur zaroori dates", "Fees aur facilities ki jaankari", "Enquiry form, jo seedha aapke phone par aata hai")],
    [["school", "new_website", "hinglish"], list("Admission ka process aur zaroori dates", "Fees aur facilities ki jaankari", "Phone par jaldi khulne wali site")],
    [["school", "fix_website", "hinglish", { sample: "offer", problem: "old" }], list("2027-28 admission ki jaankari", "Fees ka poora structure", "Enquiry form, jo seedha aapke phone par aata hai")],
    [["school", "fix_website", "en", { demo: { sessionLabel: "2027" }, problem: "info" }], list("2027 admission details", "The full fee structure", "A site that opens fast on a phone")],
    [["school", "fix_website", "hinglish", { problem: "site" }], list("Phone par jaldi khulne wali site", "2027-28 admission ki jaankari", "Fees ka poora structure")],
    [["school", "new_website", "hi", { demo: { whatsapp: true } }], list("एडमिशन का प्रोसेस और ज़रूरी तारीख़ें", "फ़ीस और सुविधाओं की जानकारी", "एनक्वायरी फ़ॉर्म, जो सीधे आपके फ़ोन पर आता है")],
    // Coaching: the approved three.
    [["coaching", "new_website", "hinglish", BOTH], list("Saare courses aur batch timings ek jagah", "Fees ki saaf jaankari", "Ek tap mein enquiry, call ya WhatsApp")],
    [["coaching", "fix_website", "hinglish", { demo: { whatsapp: true } }], list("Saare batches aur timings ek jagah", "Har course ki fees saaf likhi", "Phone par jaldi khulne wali site, ek tap mein enquiry")],
    [["coaching", "fix_website", "hinglish"], list("Saare batches aur timings ek jagah", "Har course ki fees saaf likhi", "Phone par jaldi khulne wali site")],
    [["other", "new_website", "en"], list("Your services and timings in one place", "A site that opens fast on a phone", "A clear page about you")],
    // Their own site: the first bullet answers the problem checked. "Not secure": a secure site (every demo is on https).
    [["dental", "fix_website", "hinglish", { problem: "trust" }], list("Secure site, jis par \"Not secure\" nahi dikhta", "Timings aur treatments pehli screen par", "Ek tap mein appointment booking")],
    [["dental", "fix_website", "en", { specialty: "kids", problem: "trust" }], list("A secure site, with no \"Not secure\" warning", "What happens at a child's first visit", "Online appointment booking")],
    [["school", "fix_website", "hinglish", { problem: "trust", demo: { whatsapp: true } }], list("Secure site, jis par \"Not secure\" nahi dikhta", "2027-28 admission aur fees ki poori jaankari", "Enquiry form, jo seedha aapke phone par aata hai")],
    [["coaching", "fix_website", "en", { problem: "trust" }], list("A secure site, with no \"Not secure\" warning", "All batches and timings in one place", "Every course's fees, clearly written")],
    [["other", "fix_website", "en", { problem: "trust", ...BOTH }], list("A secure site, with no \"Not secure\" warning", "Your services and timings in one place", "One tap to call or WhatsApp")],
    // A site that fails on a phone: the fast site first, for coaching and any other business too.
    [["coaching", "fix_website", "hinglish", { problem: "site", demo: { whatsapp: true } }], list("Phone par jaldi khulne wali site, ek tap mein enquiry", "Saare batches aur timings ek jagah", "Har course ki fees saaf likhi")],
    [["other", "fix_website", "hinglish", { problem: "site" }], list("Phone par jaldi khulne wali site", "Aapki services aur timings ek jagah", "Aapke baare mein saaf jaankari")],
  ]) check(offer(...args) === want, `{offer} ${JSON.stringify(args)} = "${want}" (got "${offer(...args)}")`);
  // {impact}: by kind and pitch, and on their own site by the kind of problem checked.
  const impact = (kind, pitch, language, extra = {}) => M.impactFor({ kind, pitch, language, ...extra });
  for (const [args, want] of [
    [["dental", "new_website", "hinglish"], "Aaj patient clinic chunne se pehle timings, treatments aur fees online dekhte hain. Ye na mile to wo aksar agle clinic ko call kar lete hain."],
    [["dental", "new_website", "en"], "Most patients check timings and book from their phone. When they cannot, they often call the next clinic on the list."],
    [["dental", "fix_website", "hinglish", { problem: "site" }], "Zyaadatar patient phone se hi dekhte hain. Site na khule to wo booking ki jagah doosra clinic dhoondh lete hain."],
    [["dental", "new_website", "hinglish", { specialty: "kids" }], "Parents bachche ki pehli visit se pehle online dekhte hain ki kya hoga. Ye na mile to wo aksar agle clinic ko call kar lete hain."],
    [["dental", "fix_website", "hinglish", { specialty: "kids", problem: "site" }], "Zyaadatar parents phone se hi dekhte hain. Site na khule to wo booking ki jagah doosra clinic dhoondh lete hain."],
    [["dental", "fix_website", "hinglish", { problem: "implant" }], "Log implant se pehle yahi jaankari online dhoondhte hain. Ye na mile to wo aksar agle clinic ko call kar lete hain."],
    [["school", "new_website", "hinglish"], "Parents admission se pehle fees, facilities aur admission ka process online dhoondhte hain. Ye na mile to wo aksar doosre school mein enquiry kar lete hain."],
    [["school", "fix_website", "hinglish", { problem: "old" }], "Parents admission se pehle yahi sab online dekhte hain. Purani jaankari dekhkar wo aksar call hi nahi karte."],
    [["school", "fix_website", "hinglish", { problem: "site" }], "Zyaadatar parents phone se hi dekhte hain. Site na khule to wo aksar doosre school mein enquiry kar lete hain."],
    [["coaching", "new_website", "hinglish"], "Students join karne se pehle batch, timing aur fees online compare karte hain. Ye na mile to wo aksar doosre institute mein enquiry kar lete hain."],
    [["coaching", "fix_website", "hinglish", { problem: "info" }], "Ye jaanne ke liye student ko pehle call karna padta hai. Kai students call karne ki jagah agla institute dekh lete hain."],
    [["coaching", "fix_website", "hinglish", { problem: "implant" }], "Ye jaanne ke liye student ko pehle call karna padta hai. Kai students call karne ki jagah agla institute dekh lete hain."],
  ]) check(impact(...args) === want, `{impact} ${JSON.stringify(args)} = "${want}" (got "${impact(...args)}")`);
  // What a checked problem is about: a chosen observation's own type, a typed sentence by its words.
  for (const [said, want] of [
    ["not_mobile", "site"], ["slow", "site"], ["http_only", "trust"], ["form_broken", "form"], ["old_session", "old"], ["no_timings", "info"],
    ["no_implant_info", "implant"], ["no_braces_info", "braces"], ["no_first_visit_info", "first_visit"],
    ["Wo theek se khul nahi rahi, aur timings kahin nahi dikhi.", "site"], ["NEET batch ki timing aur fees kahin nahi mili.", "info"],
    ["Your website did not open properly when I tried it: the page timed out.", "site"], ["Clinic kab khula hai, ye kahin nahi likha.", "info"],
    ["Usme clinic ki timing kahin nahi dikhi, to patient ko phone karke poochna padta hai.", "info"], ["", "info"],
  ]) check(M.problemType(said) === want, `problemType(${JSON.stringify(said)}) = ${want} (got ${M.problemType(said)})`);
  const ist = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 6, 30));
  check(M.admissionSession(ist(2026, 9, 30)) === "2027-28" && M.admissionSession(ist(2027, 3, 1)) === "2027-28" && M.admissionSession(ist(2027, 8, 1)) === "2028-29", "the school session is computed from the date, never typed");
  check(M.render(M.getTemplate("wa_first_fix_school_en"), leadOf("school", { website: "https://example.org", observation: "not_mobile" }), { now: ist(2027, 9, 14) }).body.includes("• 2028-29 admission details"), "a year on, the school message moves to the next session");
  check(M.dentalSpecialty({ tags: ["DENTAL_KIDS"] }) === "kids" && M.dentalSpecialty({ tags: ["DENTAL_ORTHO"] }) === "ortho" && M.dentalSpecialty({ instituteName: "Example Dental Implant Centre" }) === "implant", "the specialty comes from the sheet's segment or the name");
  check(M.dentalSpecialty({ tags: ["DENTAL_KIDS"] }, { templateId: "d4-implant-centre" }) === "implant" && M.dentalSpecialty({ tags: ["DENTAL_KIDS"] }, { templateId: "d1-family-dentist" }) === "general", "the demo's own template wins over the segment");
  check(M.needFor("dental", "hinglish", "general") === "" && M.needFor("school", "en", "kids") === "" && /pehli visit/.test(M.needFor("dental", "hinglish", "kids")), "{need} only for a specialty clinic");
  const facts = M.demoFacts({ templateId: "d6-kids-dental", sessionLabel: " ", contact: { phone: "+91 98765 43210", whatsapp: "" } });
  check(facts.templateId === "d6-kids-dental" && facts.phone === true && facts.whatsapp === false && facts.sessionLabel === undefined && M.demoFacts(null) === undefined, "demoFacts reads a demo record");
}

/* ── 6. {callSlots}: two working days, inside the window, never Sunday ──── */

{
  const HOUR = 3_600_000;
  const bad = [];
  for (const kind of KINDS) {
    const w = M.CALL_WINDOWS[kind];
    for (let h = 0; h < 21 * 24; h++) {
      const now = new Date(NOW.getTime() + h * HOUR + 7 * 60_000);
      const slots = M.callSlots(kind, now);
      const why = [];
      if (slots.length !== 2) why.push(`${slots.length} slots`);
      for (const s of slots) {
        const p = M.istParts(s.at);
        if (p.day === 0 || s.day === 0) why.push("a Sunday");
        if (p.day !== s.day || p.minutes !== s.minutes) why.push("day or time out of step with the instant");
        if (s.minutes < M.CALL_WINDOW_START || s.minutes + 10 > M.CALL_WINDOW_END) why.push(`outside 10:00 to 21:00 (${s.minutes})`);
        if (s.minutes < w.window[0] || s.minutes >= w.window[1]) why.push(`outside the ${kind} window (${s.minutes})`);
        if (!w.days.includes(s.day)) why.push(`a day this kind is not called (${s.day})`);
        if (s.at <= now) why.push("not in the future");
      }
      if (slots.length === 2 && (slots[0].at >= slots[1].at || M.istParts(slots[0].at).day === M.istParts(slots[1].at).day)) why.push("not two different days in order");
      if (why.length) bad.push(`${kind} at ${now.toISOString()}: ${why.join(", ")}`);
    }
  }
  check(bad.length === 0, `{callSlots} never lands on a Sunday or outside 10:00 to 21:00 and the kind's window, over three weeks of hours (${bad.slice(0, 3).join("; ")})`);
  // Principals take calls after school (the playbook, section 6), on working days: never in the 11:00 to 13:00 message window.
  const sw = M.CALL_WINDOWS.school;
  check(sw.days.every((d) => d >= 1 && d <= 5) && sw.window[0] >= 14 * 60 && sw.window[1] <= 16 * 60 && sw.times.every((m) => m >= sw.window[0] && m < sw.window[1]),
    `schools are called after school, Monday to Friday (${JSON.stringify(sw)})`);
  const slotsAt = (kind, now, language) => M.formatCallSlots(M.callSlots(kind, now), language);
  check(slotsAt("dental", NOW, "en") === "Wednesday 3 pm or Thursday 2 pm", `dental, Tuesday afternoon: ${slotsAt("dental", NOW, "en")}`);
  check(slotsAt("dental", NOW, "hinglish") === "Wednesday 3 baje theek rahega ya Thursday 2 baje", `Hinglish: ${slotsAt("dental", NOW, "hinglish")}`);
  check(slotsAt("dental", NOW, "hi") === "बुधवार 3 बजे ठीक रहेगा या गुरुवार 2 बजे", `Hindi: ${slotsAt("dental", NOW, "hi")}`);
  check(slotsAt("school", NOW, "en") === "Wednesday 3 pm or Thursday 2:30 pm", `school: ${slotsAt("school", NOW, "en")}`);
  check(slotsAt("school", NOW, "hinglish") === "Wednesday 3 baje theek rahega ya Thursday 2:30 baje", `school, Hinglish: ${slotsAt("school", NOW, "hinglish")}`);
  const thursdayNoon = new Date("2026-10-01T06:30:00.000Z"); // Thursday 12:00 India time
  check(slotsAt("school", thursdayNoon, "en") === "Friday 3 pm or Monday 2:30 pm", `a school's yes on a Thursday is offered Friday and Monday, never the weekend (${slotsAt("school", thursdayNoon, "en")})`);
  const saturdayEvening = new Date("2026-10-03T13:30:00.000Z"); // Saturday 19:00 India time
  const sat = M.render(M.getTemplate("wa_after_reply_any_en"), leadOf("coaching"), { now: saturdayEvening }).body;
  check(sat.includes("Would Monday 3 pm or Tuesday 12 noon suit you") && !/Sunday/.test(sat), `after a Saturday yes, the call is proposed from Monday (${sat.split("\n").pop()})`);
  const lateNight = new Date("2026-09-29T20:00:00.000Z"); // Wednesday 01:30 India time, still Tuesday in UTC
  check(slotsAt("dental", lateNight, "en") === "Thursday 3 pm or Friday 2 pm", `days are counted in India time (${slotsAt("dental", lateNight, "en")})`);
  const own = M.render(M.getTemplate("wa_after_reply_dental_hinglish"), leadOf("dental"), { now: NOW, callSlots: "kal 4 baje theek rahega" }).body;
  check(own.endsWith("10 minute ki call ke liye kal 4 baje theek rahega?"), "the sender's own call times replace {callSlots}");
  for (const t of T.filter((x) => M.fieldsUsed(x).includes("callSlots"))) {
    check(t.stage === "after_reply", `${t.id}: {callSlots} only where they said yes`);
  }
}

/* ── 7. Cadence: four days, ONE WhatsApp follow-up, e-mail on day 4, 9, 16 ── */

{
  const days = (stage, from = NOW) => Math.round((M.followUpDate(stage, from) - from) / 86_400_000);
  check(M.FOLLOW_UP_DAYS.first === 4 && days("first") === 4, "the follow-up is due four days after the first message");
  check(M.WHATSAPP_FOLLOW_UPS === 1, "WhatsApp gets one follow-up");
  check(JSON.stringify(M.EMAIL_FOLLOW_UP_DAYS) === "[4,9,16]", "e-mail follow-ups on day 4, 9 and 16");
  const f = M.FOLLOW_UP_DAYS;
  check(f.first === 4 && f.first + f.follow_up_1 === 9 && f.first + f.follow_up_1 + f.follow_up_2 === 16, "the ladder's days add up to 4, 9 and 16");
  check(f.proposal === 3 && f.follow_up_3 >= 30, "the proposal is chased on day 3; after the closing e-mail nothing is due for weeks");
  const wednesday = new Date("2026-09-30T06:00:00.000Z");
  check(M.istParts(M.followUpDate("first", wednesday)).day === 1 && days("first", wednesday) === 5, "a follow-up due on Sunday moves to Monday");
  check(M.followUpDate("first", wednesday.toISOString()).getTime() === M.followUpDate("first", wednesday).getTime(), "followUpDate accepts an ISO string");

  const followUpStages = (ch) => M.stagesFor(ch).filter((s) => s.startsWith("follow_up"));
  check(JSON.stringify(followUpStages("whatsapp")) === '["follow_up_1"]', "WhatsApp has exactly one follow-up stage");
  check(JSON.stringify(followUpStages("email")) === '["follow_up_1","follow_up_2","follow_up_3"]', "e-mail has three");
  check(T.every((t) => t.channel !== "whatsapp" || !["follow_up_2", "follow_up_3"].includes(t.stage)), "no live WhatsApp template past the one follow-up");
  const everyOffer = [undefined, "dental", "school", "coaching", "other"].flatMap((kind) => M.templatesFor({ kind, channel: "whatsapp" }));
  check(everyOffer.every((t) => !t.retired) && M.templatesFor({ channel: "whatsapp", stage: "follow_up_2" }).length === 0 && M.templatesFor({ channel: "whatsapp", stage: "follow_up_3" }).length === 0, "the retired WhatsApp follow-ups are never offered");
  for (const id of ["wa_fu2_hinglish", "wa_fu2_en", "wa_fu3_hinglish", "wa_fu3_en", "wa_fu2_dental_hinglish", "wa_fu2_dental_en", "wa_fu3_dental_hinglish", "wa_fu3_dental_en"]) {
    const t = M.getTemplate(id);
    check(Boolean(t?.retired) && !T.includes(t), `${id}: retired, still resolvable for the history`);
    if (t) check(!/\{\w+\}/.test(M.render(t, leadOf("school", { observation: "not_mobile" }), { now: NOW }).body), `${id}: an old history entry still renders`);
    if (t) check(M.checkSend(leadOf("school", { observation: "not_mobile" }), t, "whatsapp", SETTINGS, 0, NOW).blockers.some((b) => /retired/.test(b)), `${id}: cannot be sent again`);
  }
  for (const t of T.filter((x) => x.channel === "whatsapp" && x.stage === "follow_up_1")) {
    const r = M.render(t, leadOf(t.kind === "any" ? "school" : t.kind), { now: NOW });
    const approved = t.language === "hinglish"
      ? /^Namaste [^\n]+,\n\nMehdi, Ideovent se\. Kuch din pehle [^\n]*\n\nMain yahin chhod raha hoon\. Kabhi (dekhna|chahiye) ho to bas "haan" likh dijiye\.$/
      : /^Good afternoon [^\n]+,\n\nMehdi from Ideovent here\. A few days ago [^\n]*\n\nI will leave it here\. If you (want to see it|would like one) later, just reply "yes"\.$/;
    check(approved.test(r.body), `${t.id}: the approved follow-up, and the last WhatsApp (${r.body})`);
    check(!t.allowsLink && !URL_IN_TEXT.test(r.body), `${t.id}: no link`);
    check(/Four days after the first message/.test(t.note) && /last WhatsApp/.test(t.note), `${t.id}: the note says day 4 and that it is the last`);
  }
  for (const t of T.filter((x) => x.channel === "email" && x.stage.startsWith("follow_up"))) {
    check(t.note.includes(M.SAME_THREAD_NOTE) && /^Re: /.test(t.subject), `${t.id}: sent as a reply in the same thread`);
    check(!t.allowsLink && !M.containsLink(t.body), `${t.id}: no link in a follow-up to someone who has not said yes`);
    check(!M.fieldsUsed(t).includes("observation"), `${t.id}: never repeats the first observation`);
  }
  const fu2 = M.render(M.getTemplate("em_fu2_any_en"), leadOf("school", { observation: "not_mobile" }), { now: NOW }).body;
  check(/Google/.test(fu2) && !fu2.includes(M.getObservation("not_mobile").en), "day 9 brings a new point (their Google listing), not the first observation");
  for (const [status, ch, sends, want] of [
    [undefined, "whatsapp", 0, "first"], ["new", "whatsapp", 1, "follow_up_1"], ["contacted", "whatsapp", 2, null],
    ["contacted", "email", 1, "follow_up_1"], ["contacted", "email", 2, "follow_up_2"], ["contacted", "email", 3, "follow_up_3"], ["contacted", "email", 4, null],
    ["replied", "whatsapp", 3, "after_reply"], ["demo_opened", "email", 1, "after_reply"], ["call", "email", 2, "after_call"], ["proposal", "whatsapp", 2, "proposal"],
    ["won", "email", 0, null], ["do_not_contact", "whatsapp", 0, null],
  ]) check(M.suggestedStage(status, ch, sends) === want, `suggestedStage(${status}, ${ch}, ${sends}) = ${want}`);
  check(M.stageLabel("follow_up_1", "whatsapp") === "Follow-up (day 4, the last WhatsApp)" && M.stageLabel("follow_up_3", "email") === "Closing (day 16)" && M.STAGE_LABELS.after_reply === "After they say yes", "stage names in plain words");
  const soon = { ...leadOf("dental"), status: "contacted", lastContactedAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString() };
  check(M.checkSend(soon, M.getTemplate("wa_fu1_dental_hinglish"), "whatsapp", SETTINGS, 0, NOW).warnings.some((w) => /three clear days/.test(w)), "a WhatsApp follow-up two days after the first message warns");
  const due = { ...soon, lastContactedAt: new Date(NOW.getTime() - 4 * 86_400_000).toISOString() };
  check(!M.checkSend(due, M.getTemplate("wa_fu1_dental_hinglish"), "whatsapp", SETTINGS, 0, NOW).warnings.some((w) => /three clear days|24 hours/.test(w)), "on day 4 it goes without a timing warning");
}

/* ── 8. [Placeholders] block the send until they are filled ──────────────── */

{
  check(JSON.stringify(M.unfilledPlaceholders("a [b] c [d] [b] {x} [] [\n]")) === '["[b]","[d]"]', "unfilledPlaceholders finds each [blank] once, and nothing else");
  const summaries = T.filter((t) => t.stage === "after_call");
  check(summaries.length >= 16, `an after-call summary for every kind, channel and language (${summaries.length})`);
  for (const t of summaries) {
    check(t.body.includes("[package and price]") && t.body.includes("[date]") && /50%/.test(t.body), `${t.id}: the approved summary with [package and price], payment and [date]`);
    const lead = leadOf(t.kind === "any" ? "other" : t.kind, { status: "call" });
    const r = M.render(t, lead, { now: NOW });
    check(r.warnings.some((w) => w === "Fill in [package and price] and [date] before sending."), `${t.id}: the preview says what to fill in`);
    const bare = M.checkSend(lead, t, t.channel, SETTINGS, 0, NOW);
    check(!bare.ok && bare.blockers.some((b) => /Fill in \[package and price\] and \[date\]/.test(b)), `${t.id}: cannot be sent with its blanks`);
    const half = r.body.replace("[package and price]", "Website Professional");
    const halfCheck = M.checkSend(lead, t, t.channel, SETTINGS, 0, NOW, { text: { subject: r.subject, body: half } });
    check(!halfCheck.ok && halfCheck.blockers.some((b) => /\[date\]/.test(b) && !/package/.test(b)), `${t.id}: one blank left still blocks`);
    const filled = half.replace("[date]", "Monday 5 Oct");
    const ok = M.checkSend(lead, t, t.channel, SETTINGS, 0, NOW, { text: { subject: r.subject, body: filled } });
    check(ok.ok, `${t.id}: filled in, it goes (${ok.blockers.join(" | ")})`);
  }
  for (const t of T.filter((x) => x.stage === "proposal")) {
    check(/\[date\]/.test(t.body), `${t.id}: the proposal asks for a dated start`);
  }
  const school = leadOf("school", { website: "https://example.org", observation: "old_session" });
  const t = M.getTemplate("wa_first_fix_school_hinglish");
  const r = M.render(t, school, { now: NOW });
  check(!M.checkSend(school, t, "whatsapp", SETTINGS, 0, NOW).ok, "the old-session observation blocks until the session seen is typed in");
  check(M.checkSend(school, t, "whatsapp", SETTINGS, 0, NOW, { text: { body: r.body.replace("[jo purana session dikha]", "2023-24") } }).ok, "with the session typed in, it goes");
  const typed = M.checkSend(leadOf("dental"), M.getTemplate("wa_after_reply_dental_en"), "whatsapp", SETTINGS, 0, NOW, { text: { body: "Here it is [link]" } });
  check(!typed.ok && typed.blockers.some((b) => /\[link\]/.test(b)), "a [blank] typed by hand blocks as well");
}

/* ── 9. Links decode to exactly what was rendered ────────────────────────── */

{
  const t = M.getTemplate("em_first_new_school_en");
  const lead = leadOf("school");
  const r = M.render(t, lead, { now: NOW });
  check(!("gmailComposeUrl" in M), "the engine has no Gmail compose link builder (e-mail opens in the mail app only)");
  const m = M.mailtoUrl({ to: lead.email, subject: r.subject, body: r.body });
  check(m.startsWith(`mailto:${lead.email}?`), "mailto: recipient");
  const mq = new URLSearchParams(m.split("?")[1]);
  check(mq.get("subject") === r.subject && mq.get("body") === r.body, "mailto: subject and body decode exactly");
  check(mq.get("body").includes("\n") && r.body.includes("\n"), "mailto: body keeps its line breaks");
  // The approved look travels in the links: every line break is %0A, a blank line %0A%0A, a bullet %E2%80%A2.
  check(m.includes("%0A%0A") && m.includes("%0A%E2%80%A2%20") && !/\r/.test(r.body), "mailto: the blank lines and bullets travel as %0A%0A and %0A%E2%80%A2");
  for (const id of ["wa_first_new_dental_hinglish", "wa_first_fix_school_en", "wa_first_new_school_hi", "wa_after_call_coaching_hinglish"]) {
    const t1 = M.getTemplate(id);
    const one = M.render(t1, leadFor(t1, t1.kind === "any" ? "other" : t1.kind, { status: "call" }), { now: NOW, demo: { phone: true, whatsapp: true } });
    const href = M.whatsappUrl(lead.phone, one.body);
    const text = new URL(href).searchParams.get("text");
    check(text === one.body && href.includes("%0A%0A") && href.split("%0A%0A").length === one.body.split("\n\n").length && href.includes("%0A%E2%80%A2%20"),
      `${id}: the wa.me link carries every blank line (%0A%0A) and bullet, and decodes to the text on screen`);
    if (t1.stage === "first") {
      const pic = `https://www.ideovent.in/w/${t1.kind}`;
      check(href.includes(encodeURIComponent(pic)) && JSON.stringify(linksIn(text)) === JSON.stringify([pic]),
        `${id}: the wa.me link carries the picture link, and it decodes to that one link`);
    }
  }
  const odd = new URLSearchParams(M.mailtoUrl({ to: lead.email, subject: "a&b=c", body: "x+y #1 50%" }).split("?")[1]);
  check(odd.get("subject") === "a&b=c" && odd.get("body") === "x+y #1 50%", "mailto: & = + # % survive");

  const w = M.render(M.getTemplate("wa_after_reply_school_hinglish"), lead, { now: NOW });
  const wa = new URL(M.whatsappUrl(lead.phone, w.body));
  check(wa.origin === "https://wa.me" && wa.pathname === "/919876543210", "wa.me: +91 digits from '98765 43210'");
  check(wa.searchParams.get("text") === w.body, "wa.me: text decodes exactly");
  const web = new URL(M.whatsappWebUrl("+91 98765-43210", w.body));
  check(web.origin + web.pathname === "https://web.whatsapp.com/send", "web.whatsapp: host and path");
  check(web.searchParams.get("phone") === "919876543210" && web.searchParams.get("text") === w.body, "web.whatsapp: phone and text decode exactly");
  const hi = M.render(M.getTemplate("wa_first_new_school_hi"), lead, { now: NOW });
  check(new URL(M.whatsappUrl(lead.phone, hi.body)).searchParams.get("text") === hi.body, "wa.me: Devanagari text round-trips");
  for (const [input, want] of [
    ["98765 43210", "+919876543210"], ["098765-43210", "+919876543210"], ["+91 98765 43210", "+919876543210"],
    ["919876543210", "+919876543210"], ["0091 98765 43210", "+919876543210"], ["011 2345 6789", "+911123456789"],
    ["+1 415 555 0100", "+14155550100"], ["+44 20 7946 0958", "+442079460958"], ["+4412345678", "+4412345678"], ["12345", ""], ["", ""],
  ]) {
    check(M.normalisePhone(input) === want, `normalisePhone(${JSON.stringify(input)}) = ${want} (got ${M.normalisePhone(input)})`);
  }
  const links = M.sendLinks(lead, "email", r);
  check(Boolean(links.mailto) && !("gmail" in links) && !links.whatsapp, "sendLinks: e-mail gives the mail-app (mailto) link only, no Gmail");
  check(!Object.values(links).some((u) => /mail\.google\.com/.test(u)), "sendLinks: no link points at Gmail compose");
  const wl = M.sendLinks({ ...lead, whatsapp: "99999 11111" }, "whatsapp", w);
  check(wl.whatsapp?.includes("/919999911111?") && !wl.gmail, "sendLinks: WhatsApp prefers the WhatsApp number");
  check(Object.keys(M.sendLinks({ ...lead, email: "" }, "email", r)).length === 0, "sendLinks: no e-mail, no link");
}

/* ── 10. Demo links never point at a Vercel preview (30 Sep 2026) ────────── */

{
  const live = "https://ideovent.vercel.app";
  check(M.SITE_ORIGIN === live, `demo links start with the live address (${M.SITE_ORIGIN})`);
  check(M.mainOriginFrom("https://ideovent-git-release-2026-09-30-example.vercel.app") === live, "a preview build's own address never becomes the demo origin");
  check(M.mainOriginFrom("https://ideovent-a1b2c3d4-example-projects.vercel.app/") === live, "nor does a single deployment's address");
  check(M.mainOriginFrom("https://ideovent.vercel.app/") === live, "the live address is kept, without its trailing slash");
  check(M.mainOriginFrom("https://www.ideovent.in") === "https://www.ideovent.in", "the real domain is kept once VITE_PUBLIC_URL moves to it");
  check(M.mainOriginFrom("") === live && M.mainOriginFrom(undefined) === live, "no value gives the live address");
  check(M.mainOriginFrom("http://localhost:5420") === "http://localhost:5420", "a local address is kept (tests)");
}

/* ── 11. Safeguards ──────────────────────────────────────────────────────── */

{
  const now = NOW;
  const waFirst = M.getTemplate("wa_first_new_school_hinglish");
  const waReply = M.getTemplate("wa_after_reply_school_hinglish");
  const emFirst = M.getTemplate("em_first_new_school_en");
  const lead = leadOf("school");
  const blockedBy = (res, re) => !res.ok && res.blockers.some((b) => re.test(b));
  const warnedBy = (res, re) => res.warnings.some((w) => re.test(w));

  const clean = M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, now);
  check(clean.ok && clean.blockers.length === 0 && clean.warnings.length === 0, `a clean first WhatsApp at 14:30 on a Tuesday passes silently (${[...clean.blockers, ...clean.warnings].join(" | ")})`);
  check(M.checkSend(lead, emFirst, "email", SETTINGS, 0, now).ok, "a clean first e-mail passes");
  const oldGmail = M.checkSend(lead, emFirst, "email", { ...SETTINGS, senderGmail: "old-setting@gmail.example" }, 0, now);
  check(oldGmail.ok && !oldGmail.warnings.some((w) => /free mailbox|spam filter/i.test(w)), "the retired Gmail setting drives nothing");

  check(blockedBy(M.checkSend({ ...lead, status: "do_not_contact" }, waFirst, "whatsapp", SETTINGS, 0, now), /not to be contacted/i), "do_not_contact blocks WhatsApp");
  check(blockedBy(M.checkSend({ ...lead, status: "do_not_contact" }, emFirst, "email", SETTINGS, 0, now), /not to be contacted/i), "do_not_contact blocks e-mail");

  check(blockedBy(M.checkSend(lead, { ...waFirst, id: "bad", body: `${waFirst.body}\n{demoLink}` }, "whatsapp", SETTINGS, 0, now), /must not carry a link/i), "first WhatsApp with {demoLink} blocks");
  check(blockedBy(M.checkSend(lead, { ...waFirst, id: "bad2", body: `${waFirst.body}\nhttps://ideovent.vercel.app/site/x` }, "whatsapp", SETTINGS, 0, now), /must not carry a link/i), "first WhatsApp with a typed URL blocks");
  check(blockedBy(M.checkSend(lead, { ...waFirst, id: "bad3", allowsLink: true }, "whatsapp", SETTINGS, 0, now), /must not carry a link/i), "first WhatsApp marked allowsLink blocks");
  check(blockedBy(M.checkSend(lead, { ...emFirst, id: "bad4", body: `${emFirst.body}\n{demoLink}`, allowsLink: true }, "email", SETTINGS, 0, now), /must not carry a link/i), "a first e-mail with the demo link blocks too");
  check(blockedBy(M.checkSend(lead, { ...M.getTemplate("wa_fu1_hinglish"), body: "see {pitchLink}" }, "whatsapp", SETTINGS, 0, now), /no-link/i), "allowsLink false with a link field blocks at any stage");

  // The picture link (1 Oct 2026): the one link a first WhatsApp may carry, once, its own kind's page; nothing else.
  const shown = M.render(waFirst, lead, { now }).body;
  const onScreen = (body, t = waFirst, l = lead, ch = "whatsapp", subject) => M.checkSend(l, t, ch, SETTINGS, 0, now, { text: { subject, body } });
  check(shown.includes("\n\nEk jhalak yahan dekhiye: https://www.ideovent.in/w/school\n\n") && onScreen(shown).ok, "the first WhatsApp as rendered, with its picture link, goes");
  check(blockedBy(onScreen(`${shown}\nhttps://www.ideovent.in/w/school`), /must not carry a link/i), "the picture link twice blocks");
  check(blockedBy(onScreen(shown.replace("/w/school", "/w/dental")), /must not carry a link/i), "another kind's picture link blocks");
  check(blockedBy(onScreen(shown.replace("/w/school", "/w/schools")), /must not carry a link/i) && blockedBy(onScreen(shown.replace("/w/school", "/w/school/x")), /must not carry a link/i),
    "an address longer than the picture link is another link, and blocks");
  check(blockedBy(onScreen(`${shown}\nhttps://ideovent.vercel.app/site/example-school`), /must not carry a link/i), "the sample's own link next to the picture link blocks");
  check(blockedBy(onScreen(shown.replace("https://www.ideovent.in/w/school", "www.example.org")), /must not carry a link/i), "the picture line pointing anywhere else blocks");
  check(onScreen(shown.replace(/\n\nEk jhalak yahan dekhiye: \S+/, "")).ok, "the picture line taken out by hand: the message still goes (the link may go, it need not)");
  const offerT = M.getTemplate("wa_first_new_school_hinglish_offer");
  const noDemoLead = { ...lead, demoSlug: undefined };
  const offerShown = M.render(offerT, noDemoLead, { now }).body;
  check(!M.carriesPreview(offerT) && !linksIn(offerShown).length && onScreen(offerShown, offerT, noDemoLead).ok, "the twin that offers to make a sample has no picture link, and goes");
  check(blockedBy(onScreen(`${offerShown}\n\nEk jhalak yahan dekhiye: https://www.ideovent.in/w/school`, offerT, noDemoLead), /must not carry a link/i),
    "the picture link typed into the twin that offers a sample blocks: the picture says the sample is already built");
  const mailShown = M.render(emFirst, lead, { now });
  check(blockedBy(onScreen(`${mailShown.body}\nhttps://www.ideovent.in/w/school`, emFirst, lead, "email", mailShown.subject), /must not carry a link/i), "the picture link typed into a first e-mail blocks: e-mails carry no link");
  check(blockedBy(M.checkSend(lead, { ...M.getTemplate("wa_fu1_hinglish"), body: "see {previewLink}" }, "whatsapp", SETTINGS, 0, now), /no-link/i) &&
    M.render({ ...M.getTemplate("wa_fu1_hinglish"), body: "see {previewLink}" }, lead, { now }).warnings.some((w) => /Only a first message may carry the picture link/.test(w)),
  "{previewLink} anywhere but a first message blocks, and render says so");
  const doubled = { ...waFirst, id: "synthetic_two_pictures", body: `${waFirst.body}\n\n{previewLink}` };
  check(blockedBy(M.checkSend(lead, doubled, "whatsapp", SETTINGS, 0, now), /must not carry a link/i), "a template with the picture link twice blocks");
  const otherLead = leadOf("other");
  const otherPic = { ...M.getTemplate("wa_first_new_any_hinglish"), id: "synthetic_other_picture", body: M.getTemplate("wa_first_new_any_hinglish").body.replace("\n\nKya main", "\n\nEk jhalak yahan dekhiye: {previewLink}\n\nKya main") };
  const otherR = M.render(otherPic, otherLead, { now });
  check(!/Ek jhalak|\{previewLink\}/.test(otherR.body) && !linksIn(otherR.body).length && !/\n{3,}/.test(otherR.body) && otherR.warnings.some((w) => /No picture for this kind of lead/.test(w)),
    "a kind with no picture (any other business) gets no picture line at all, and the preview says why");

  const noDemo = { ...lead, demoId: undefined, demoSlug: undefined };
  check(blockedBy(M.checkSend(noDemo, waFirst, "whatsapp", SETTINGS, 0, now), /no demo yet/i), "a first message saying the sample is made blocks with no demo");
  check(blockedBy(M.checkSend(noDemo, M.getTemplate("wa_fu1_en"), "whatsapp", SETTINGS, 0, now), /no demo yet/i), "the WhatsApp follow-up about the sample blocks with no demo");
  check(M.checkSend(noDemo, M.getTemplate("wa_fu1_en_offer"), "whatsapp", SETTINGS, 0, now).ok, "its twin that offered a sample goes");
  check(blockedBy(M.checkSend(noDemo, M.getTemplate("em_fu1_any_en"), "email", SETTINGS, 0, now), /no demo yet/i), "the e-mail follow-up about the sample blocks with no demo");
  check(blockedBy(M.checkSend({ ...lead, pitchSlug: undefined, website: "https://example.org", observation: "not_mobile" }, M.getTemplate("wa_first_pitch_any_hinglish"), "whatsapp", SETTINGS, 0, now), /no pitch page yet/i), "the pitch-page first message blocks without a pitch page");
  check(blockedBy(M.checkSend({ ...lead, website: "https://example.org", observation: "" }, M.getTemplate("wa_first_fix_school_en"), "whatsapp", SETTINGS, 0, now), /observation/i), "a 'their site' message with no observation blocks");
  check(blockedBy(M.checkSend({ ...lead, website: "https://example.org" }, waFirst, "whatsapp", SETTINGS, 0, now), /no website of their own/i), "'no website' is never said to a lead that has one");
  check(M.checkSend({ ...lead, website: "https://www.practo.com/example", pitch: "new_website" }, waFirst, "whatsapp", SETTINGS, 0, now).ok, "a directory page is not their own website: the 'no website' message goes");
  check(warnedBy(M.checkSend({ ...lead, pitch: "new_website", observation: "not_mobile" }, M.getTemplate("wa_first_fix_school_en"), "whatsapp", SETTINGS, 0, now), /none of its own/i), "a 'their site' message to a lead marked 'no website' warns");
  const obsNoWebsite = M.render(M.getTemplate("wa_first_fix_school_en"), { ...lead, website: "https://example.org", observation: "no_website" }, { now });
  check(obsNoWebsite.warnings.some((w) => /no website/.test(w)), "the no-website observation in a 'their site' message is flagged");

  check(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 10, now).ok && M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 500, now).ok, "no limit set: the 11th and the 501st first WhatsApp go");
  check(!warnedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 500, now), /limit/i), "no limit set: no volume warning either");
  check(M.checkSend(lead, waFirst, "whatsapp", { ...SETTINGS, whatsappDailyLimit: 0 }, 50, now).ok, "a limit of 0 (blank) means no limit");
  check(M.checkSend(lead, waFirst, "whatsapp", { ...SETTINGS, whatsappDailyCap: 10 }, 10, now).ok, "the retired whatsappDailyCap of 10 limits nothing");
  check(M.dailyWhatsappLimit({}) === null && M.dailyWhatsappLimit({ whatsappDailyLimit: 0 }) === null && M.dailyWhatsappLimit({ whatsappDailyCap: 10 }) === null, "dailyWhatsappLimit: blank and 0 are no limit");
  const LIM = { ...SETTINGS, whatsappDailyLimit: 3 };
  check(blockedBy(M.checkSend(lead, waFirst, "whatsapp", LIM, 3, now), /3 of 3/), "a limit set in settings blocks the next first WhatsApp");
  check(M.checkSend(lead, waFirst, "whatsapp", LIM, 2, now).ok, "under the set limit the first WhatsApp goes");
  const capReply = M.checkSend({ ...lead, status: "replied" }, waReply, "whatsapp", LIM, 3, now);
  check(capReply.ok && warnedBy(capReply, /limit/i), "a set limit only warns for a reply to someone who answered");

  const istAt = (h, m) => new Date(Date.UTC(2026, 8, 29, h, m) - 330 * 60_000);
  const quiet = (h, m, settings = SETTINGS) => warnedBy(M.checkSend(lead, waFirst, "whatsapp", settings, 0, istAt(h, m)), /quiet hours/i);
  check(quiet(9, 30) && quiet(21, 30) && quiet(8, 0), "before 10:00 and after 20:00 India time warns (quiet hours)");
  check(!quiet(10, 0) && !quiet(19, 59), "10:00 to 20:00 is not quiet");
  check(quiet(9, 30, {}) && !quiet(10, 0, {}), "with no settings saved, quiet hours still end at 10:00");
  check(M.inQuietHours(istAt(9, 30)) && !M.inQuietHours(istAt(10, 0)), "inQuietHours defaults to 20:00 to 10:00");
  check(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, istAt(9, 30)).warnings.some((w) => /10:00/.test(w)), "the quiet-hours warning names 10:00");
  check(warnedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, new Date("2026-10-04T06:00:00.000Z")), /Sunday/), "Sunday warns");

  const dup = M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, now, { duplicateOf: { id: "other", instituteName: "Example Public School (Branch)" } });
  check(dup.ok && warnedBy(dup, /another lead/i), "duplicate contact warns");
  check(!warnedBy(M.checkSend(lead, waFirst, "whatsapp", SETTINGS, 0, now, { duplicateOf: { id: lead.id, instituteName: "self" } }), /another lead/i), "a lead is not its own duplicate");
  check(blockedBy(M.checkSend({ ...lead, email: "" }, emFirst, "email", SETTINGS, 0, now), /e-mail address/i), "e-mail with no address blocks");
  check(blockedBy(M.checkSend({ ...lead, phone: "", whatsapp: "" }, waFirst, "whatsapp", SETTINGS, 0, now), /phone/i), "WhatsApp with no number blocks");
  check(blockedBy(M.checkSend(lead, emFirst, "whatsapp", SETTINGS, 0, now), /e-mail template|email template/i), "channel mismatch blocks");
  check(blockedBy(M.checkSend({ ...lead, demoSlug: "" }, waReply, "whatsapp", SETTINGS, 0, now), /demo/i), "the link message with no demo blocks");
  const recent = { ...lead, status: "contacted", lastContactedAt: new Date(now.getTime() - 3 * 3600_000).toISOString() };
  check(warnedBy(M.checkSend(recent, M.getTemplate("wa_fu1_hinglish"), "whatsapp", SETTINGS, 0, now), /24 hours/), "a second message within a day warns");
  check(warnedBy(M.checkSend(recent, waFirst, "whatsapp", SETTINGS, 0, now), /contacted before/), "a first message to a contacted lead warns");
  check(warnedBy(M.checkSend(leadOf("coaching"), waFirst, "whatsapp", SETTINGS, 0, now), /written for a school/), "a school template to a coaching lead warns");
  const schoolWorded = { ...M.getTemplate("wa_after_reply_any_en"), id: "synthetic", notForKinds: ["dental"] };
  check(warnedBy(M.checkSend(leadOf("dental"), schoolWorded, "whatsapp", SETTINGS, 0, now), /Pick the dental clinic version/) && M.templateNotFor(schoolWorded, "dental"), "notForKinds still warns and filters");
  check(M.render(waFirst, { ...lead, source: "JUSTDIAL" }, { now }).warnings.some((w) => /Google/.test(w)), "'Google par dekha' to a lead found elsewhere is flagged");
  check(M.render(waFirst, { ...lead, placeId: undefined, notes: "From OpenStreetMap (ODbL)" }, { now }).warnings.some((w) => /Google/.test(w)), "an OpenStreetMap lead is flagged too");
  check(!M.render(waFirst, { ...lead, source: "GMAPS" }, { now }).warnings.length, "a Google Maps lead is not");
}

/* ── 12. Dental clinics ──────────────────────────────────────────────────── */

{
  const D = T.filter((t) => t.kind === "dental");
  check(D.length >= 45, `a full dental set (${D.length})`);
  for (const channel of ["whatsapp", "email"]) {
    for (const stage of M.stagesFor(channel)) {
      for (const language of LANGS) check(has({ kind: "dental", channel, stage, language }), `dental: its own ${channel} ${stage} in ${language}`);
    }
  }
  check(has({ kind: "dental", channel: "whatsapp", stage: "after_reply", language: "hi" }), "dental: the link message in Hindi too");

  // The dentists' code and the honesty rules: no claim, no promise of patients, rank or outcome.
  const BANNED = /\b(best|no\.?\s?1|number one|leading|world[- ]class|award[- ]winning|most advanced|guarantee\w*|painless|pain[- ]free|risk[- ]free|miracle|cheapest|lowest|free|money[- ]back|lifetime|permanent|rank\w*|results?|instant)\b|100\s?%|%\s?off|\btop\s?\d/i;
  const PROMISE = /more patients|new patients (every|a|per) (day|week|month)|\d+\s*(patients|bookings|appointments|leads)|first page of google|page one/i;
  const OTHER_KIND = /\b(class(es)?|courses?|admissions?|parents?|students?|batch(es)?|faculty|principal|schools?|coaching|tuition)\b|रिज़ल्ट|एडमिशन/i;
  for (const t of D) {
    const text = `${t.subject ?? ""}\n${t.body}`;
    check(!BANNED.test(text), `${t.id}: no banned claim word (${(text.match(BANNED) || [""])[0]})`);
    check(!PROMISE.test(text), `${t.id}: promises no patient numbers or rankings`);
    check(!OTHER_KIND.test(text), `${t.id}: no school or coaching words (${(text.match(OTHER_KIND) || [""])[0]})`);
    check(!/(one tap|ek tap)[^.\n]*WhatsApp|WhatsApp[^.\n]*(one tap|ek tap)|WhatsApp button/i.test(t.body), `${t.id}: the template itself never promises the demo's WhatsApp button`);
    check(!/\blabel|\bmark|neeche sample likha|नीचे सैंपल/i.test(t.body), `${t.id}: claims nothing about what the page labels`);
  }
  // Rendered: a call or WhatsApp button is named only when the clinic's number is on the demo.
  const lead = leadOf("dental", { website: "https://example.org", observation: "no_timings" });
  const TAP = /(one tap|ek tap mein)[^\n]*(call|WhatsApp)/i;
  for (const t of D.filter((x) => x.stage === "first" && x.sample === "made")) {
    const l = t.pitch === "fix_website" ? lead : leadOf("dental");
    const without = M.render(t, l, { now: NOW }).body;
    const withNumber = M.render(t, l, { now: NOW, demo: { phone: true, whatsapp: true } }).body;
    check(!TAP.test(without), `${t.id}: with no number on the demo, no call or WhatsApp button is promised`);
    const want = t.pitch === "fix_website" ? /One tap to call, WhatsApp or book|Ek tap mein call, WhatsApp ya booking/ : /One tap to call or WhatsApp|Ek tap mein call ya WhatsApp/;
    check(want.test(withNumber), `${t.id}: with the clinic's number on the demo, the approved "call ya WhatsApp" bullet`);
  }
  for (const [kind, id, words] of [["school", "wa_first_new_school_hinglish", /Enquiry form/], ["coaching", "wa_first_new_coaching_hinglish", /Ek tap mein enquiry/]]) {
    const t = M.getTemplate(id);
    check(!words.test(M.render(t, leadOf(kind), { now: NOW }).body) && words.test(M.render(t, leadOf(kind), { now: NOW, demo: { phone: true, whatsapp: true } }).body),
      `${id}: the enquiry form or one-tap enquiry is named only with their number on the demo (a template duplicate clears it)`);
  }
  const forDental = M.templatesFor({ kind: "dental" });
  check(forDental.length > 0 && forDental.every((t) => t.kind === "dental" || t.kind === "any"), "a dental lead never gets a school or coaching template");
  check(forDental.every((t) => !OTHER_KIND.test(textOf(M.render(t, leadFor(t, "dental"), { now: NOW })))), "nothing rendered for a dental lead mentions classes, admissions or results");
  for (const channel of ["whatsapp", "email"]) {
    for (const stage of M.stagesFor(channel)) {
      const top = M.templatesFor({ kind: "dental", channel, stage })[0];
      check(top?.kind === "dental", `a dental lead's first choice for ${channel} ${stage} is a dental template (${top?.id})`);
    }
  }
  for (const kind of ["school", "coaching", "other"]) check(M.templatesFor({ kind }).every((t) => t.kind !== "dental"), `a ${kind} lead is never offered a dental template`);

  // Observation chips.
  const ids = (k) => M.observationsFor(k).map((o) => o.id);
  const DENTAL_CHIPS = ["no_online_booking", "no_whatsapp_button", "no_treatment_pages", "no_doctor_details", "no_timings", "no_implant_info", "no_braces_info", "no_first_visit_info"];
  check(DENTAL_CHIPS.every((id) => ids("dental").includes(id)), "dental chips: booking, WhatsApp, treatments, doctors, timings, implant, braces, first visit");
  check(["no_website", "not_mobile", "http_only", "slow"].every((id) => ids("dental").includes(id)), "dental chips keep the generic ones that apply");
  check(!["no_fees_admission", "old_session", "no_batch_fees"].some((id) => ids("dental").includes(id)), "a clinic is not offered fees, admission or batches");
  check(["school", "coaching", "other"].every((k) => !DENTAL_CHIPS.some((id) => ids(k).includes(id))), "a school lead is never offered a dental chip (nor coaching, nor other)");
  check(ids("school").includes("old_session") && !ids("coaching").includes("old_session") && ids("coaching").includes("no_batch_fees"), "the old-session chip is for schools, batch fees for coaching");
  check(ids(undefined).length === M.OBSERVATIONS.length, "no kind lists every chip");
  for (const o of M.OBSERVATIONS.filter((x) => x.kinds?.includes("dental"))) {
    check(!BANNED.test(o.en + o.hinglish), `observation ${o.id}: no banned word`);
    check(M.render(M.getTemplate("wa_first_fix_dental_hinglish"), { ...lead, observation: o.id }, { now: NOW }).body.includes(o.hinglish), `observation ${o.id} renders in Hinglish`);
  }
  const oldWording = "Your site does not show the clinic timings, so a patient has to phone to ask when you are open.";
  check(M.observationText(oldWording, "hinglish") === M.getObservation("no_timings").hinglish, "a sentence saved in the old wording is still recognised and said in the message's language");

  const warnedBy = (res, re) => res.warnings.some((w) => re.test(w));
  const saturday = new Date("2026-10-03T06:00:00.000Z");
  check(!warnedBy(M.checkSend(leadOf("dental"), M.getTemplate("em_first_new_dental_en"), "email", SETTINGS, 0, saturday), /Saturday/), "clinics work Saturdays: no Saturday e-mail warning for a dental lead");
  check(warnedBy(M.checkSend(leadOf("school"), M.getTemplate("em_first_new_school_en"), "email", SETTINGS, 0, saturday), /Saturday/), "the Saturday warning still holds for a school");
  check(warnedBy(M.checkSend(leadOf("dental"), M.getTemplate("wa_first_new_school_en"), "whatsapp", SETTINGS, 0, NOW), /written for a school, and this lead is a dental clinic/), "a school template to a dental lead warns in plain words");
  check(warnedBy(M.checkSend(leadOf("school"), M.getTemplate("wa_first_new_dental_en"), "whatsapp", SETTINGS, 0, NOW), /written for a dental clinic, and this lead is a school/), "a dental template to a school lead warns");
  const prop = M.render(M.getTemplate("em_proposal_dental_en"), leadOf("dental"), { now: NOW });
  check(prop.warnings.some((w) => /mail app/.test(w)) && !prop.warnings.some((w) => /Gmail/.test(w)), "the proposal reminder says 'mail app', not Gmail");
  check(!M.render(M.getTemplate("em_proposal_chase_dental_en"), leadOf("dental"), { now: NOW }).warnings.some((w) => /Attach/.test(w)), "the proposal follow-up asks for no attachment");
}

/* ── 13. Copy fixes of 1 Oct 2026 (the rendered set read against the approved samples) ── */

{
  // The neutral first messages and summaries are for "any other business" only: each kind has its own.
  const neutral = T.filter((t) => t.kind === "any" && ((t.stage === "first" && t.promises !== "pitch") || t.stage === "after_call"));
  check(neutral.length === 20 && neutral.every((t) => JSON.stringify(t.notForKinds) === '["dental","school","coaching"]'), `the 16 neutral first messages and 4 neutral summaries are marked for other businesses only (${neutral.length})`);
  for (const kind of ["dental", "school", "coaching"]) {
    check(M.templatesFor({ kind }).every((t) => !neutral.includes(t)), `a ${kind} lead is never offered the neutral first message or summary`);
  }
  check(neutral.every((t) => M.templatesFor({ kind: "other", stage: t.stage, channel: t.channel }).includes(t)), "an other-business lead still gets them");
  check(M.checkSend(leadOf("school"), M.getTemplate("wa_first_new_any_hinglish"), "whatsapp", SETTINGS, 0, NOW).warnings.some((w) => /not worded for a school\. Pick the school version/.test(w)), "picked anyway, the neutral message warns in plain words");
  // The offer is a list now (1 Oct 2026): no "jisme ... hai / hain" sentence is left to get the agreement wrong.
  for (const kind of ["school", "coaching"]) {
    for (const t of M.templatesFor({ kind, stage: "first", language: "hinglish" })) {
      const body = M.render(t, leadFor(t, kind), { now: NOW }).body;
      check(!/\bjisme\b/.test(body) && /:\n• [^\n]+\n• [^\n]+\n• [^\n]+\n\n/.test(body), `${t.id} (${kind}): the sample's contents are three bullets under the solution line (${body.slice(-160)})`);
    }
  }
  // "The way a new patient would": a children's clinic is looked up by a parent.
  const kidsLead = (over = {}) => leadOf("dental", { tags: ["DENTAL_KIDS"], ...over });
  check(M.render(M.getTemplate("em_first_new_dental_en"), kidsLead(), { now: NOW }).body.includes("on Google, the way a parent would,"), "kids clinic, no website: the way a parent would");
  check(M.render(M.getTemplate("em_first_fix_dental_hinglish"), kidsLead({ website: "https://example.org", observation: "no_first_visit_info" }), { now: NOW }).body.includes("jaise ek parent kholta hai."), "kids clinic, their site (Hinglish): jaise ek parent");
  check(M.render(M.getTemplate("em_first_fix_dental_en"), leadOf("dental", { website: "https://example.org", observation: "no_timings" }), { now: NOW }).body.includes("on my phone, the way a new patient would."), "a general clinic keeps the approved 'the way a new patient would'");
  check(M.visitorFor("school", "en") === "a parent" && M.visitorFor("coaching", "hinglish") === "ek student" && M.visitorFor("dental", "en", "implant") === "a new patient", "{visitor} per kind");
  // The proposal e-mail names the payment terms and leaves the split to the PDF.
  for (const t of T.filter((x) => x.stage === "proposal" && x.channel === "email" && !/chase/.test(x.id))) {
    check(!/\d+\s?%/.test(t.body) && /payment/i.test(t.body), `${t.id}: names the payment terms, types no split that could contradict the PDF`);
  }
  check(!T.some((t) => /Jaisa baat/.test(t.body)), "Hinglish: 'Jaisi baat hui thi' (baat is feminine)");
  // Day 16 in Hinglish says it the approved way: "Main yahin chhod raha hoon, kabhi ... ho to bas "haan" likh dijiye."
  for (const t of T.filter((x) => x.stage === "follow_up_3" && x.language === "hinglish")) {
    check(/main yahin chhod raha hoon\.\n\nKabhi [^\n]*ho to bas "haan" likh dijiye\.$/.test(t.body) && !/band kar raha/.test(t.body), `${t.id}: closes with the approved "yahin chhod raha hoon", on its own lines`);
  }
  // The two opt-out lines are EMAIL-RULES section 8, word for word; only cold e-mails carry them.
  check(M.EMAIL_OPT_OUT_EN === "If you would rather not hear from me, reply REMOVE and I will not write again." &&
    M.EMAIL_OPT_OUT_HINGLISH === "Agar aap mujhse aage mail nahi chahte, to bas REMOVE likh kar reply kar dijiye, main dobara nahi likhunga.", "the opt-out lines are EMAIL-RULES section 8, word for word");
  check(["first", "follow_up_1", "follow_up_2", "follow_up_3"].every((s) => M.carriesOptOut(s)) && ["after_reply", "after_call", "proposal"].every((s) => !M.carriesOptOut(s)), "the opt-out is for cold e-mails only");
  // The day-9 e-mail talks about their Google listing: a lead found elsewhere is flagged, as the first message is.
  const fromDirectory = leadOf("school", { source: "JUSTDIAL", placeId: undefined });
  check(M.render(M.getTemplate("em_fu2_any_en"), fromDirectory, { now: NOW }).warnings.some((w) => /Google listing/.test(w)), "the day-9 e-mail to a lead not found on Google asks to check the listing");
  check(!M.render(M.getTemplate("em_fu2_any_en"), leadOf("school"), { now: NOW }).warnings.length, "a Google lead gets no such warning");
  // School, their site, English: "an enquiry form", as in the no-website message.
  // School, their site, English: a site that fails on a phone hears the fast site first; the enquiry form only with their WhatsApp on the demo.
  const schoolSite = (demo) => M.render(M.getTemplate("em_first_fix_school_en"), leadOf("school", { website: "https://example.org", observation: "not_mobile" }), { now: NOW, demo }).body;
  check(schoolSite().includes("So we made a new sample website for your school:\n• A site that opens fast on a phone\n• 2027-28 admission details\n• The full fee structure\n\n") &&
    schoolSite({ whatsapp: true }).includes("• A site that opens fast on a phone\n• 2027-28 admission and fee details\n• An enquiry form that comes straight to your phone\n\n"), "school, their site (English): the bullets answer a site that does not open, and name the form only when it exists");
}

/* ── 14. Specialist clinics, {addressAs}, honest offers (1 Oct 2026) ───────── */

{
  // A specialist clinic (implant, braces, kids: its demo's template, else its segment or name) hears its
  // own words: {kindNoun} names the specialty, {impact} says why its patients look online first (the
  // approved implant and kids lines of 30 Sep), and the bullets list its own information.
  // With the picture link (1 Oct 2026), the ask names their place: "aapke kids dental clinic ka sample link".
  const ASK_HI = "Ek jhalak yahan dekhiye: https://www.ideovent.in/w/dental\n\nKya main aapke kids dental clinic ka sample link bhej doon?\nPasand na aaye to koi baat nahi.";
  const clinic = (over = {}) => leadOf("dental", { contactName: "Dr. Kapoor", ...over });
  const wNew = M.getTemplate("wa_first_new_dental_hinglish");
  const wFix = M.getTemplate("wa_first_fix_dental_hinglish");
  const kids = M.render(wNew, clinic({ contactName: "Dr. Arora", tags: ["DENTAL_KIDS"] }), { now: NOW }).body;
  check(kids === "Namaste Dr. Arora ji,\n\nMain Mehdi, Ideovent Technologies (Saket, Delhi) se.\n\nGoogle par aapka kids dental clinic dekha. Clinic ki apni website nahi hai, sirf Google listing hai.\n\n" +
    "Parents bachche ki pehli visit se pehle online dekhte hain ki kya hoga. Ye na mile to wo aksar agle clinic ko call kar lete hain.\n\n" +
    `Isliye humne aapke clinic ke naam se ek sample website banayi hai:\n• Bachche ki pehli visit mein kya hota hai\n• Timings aur treatments ek jagah\n• Online appointment booking\n\n${ASK_HI}`,
  `specialist clinic: the kids clinic hears its own impact line and bullets (${kids})`);
  const ortho = M.render(wNew, clinic({ contactName: "Dr. Bhatia", tags: ["DENTAL_ORTHO"] }), { now: NOW }).body;
  check(ortho.includes("Google par aapka orthodontic clinic dekha.") && ortho.includes("\n\nLog braces se pehle process aur kharche ki jaankari online dhoondhte hain. Ye na mile to wo aksar agle clinic ko call kar lete hain.\n\n") &&
    ortho.includes(":\n• Braces ka process, step by step\n• Har tarah ke braces ke kharche ki range\n• Online appointment booking\n\n"), `specialist clinic: a braces clinic, no website (${ortho})`);
  const implantFix = M.render(wFix, clinic({ website: "https://example.org", observation: "no_implant_info", tags: ["DENTAL_IMPLANT"] }), { now: NOW }).body;
  check(implantFix.includes("Aapke implant centre ki website phone par kholi. Usme implant ka process aur kharche ki jaankari nahi mili.\n\nLog implant se pehle yahi jaankari online dhoondhte hain.") &&
    implantFix.includes(":\n• Phone par jaldi khulne wali site\n• Implant ka process aur kharche ki jaankari\n• Online appointment booking\n\n"), `specialist clinic: an implant centre's own site (${implantFix})`);
  check(M.render(wNew, clinic({ tags: ["DENTAL_KIDS"] }), { now: NOW, demo: { templateId: "d4-implant-centre" } }).body.includes("aapka implant centre dekha") &&
    M.render(wNew, clinic({ tags: ["DENTAL_KIDS"] }), { now: NOW, demo: { templateId: "d1-family-dentist" } }).body.includes("aapka clinic dekha"), "the demo's own template decides the specialty");
  const kidsEn = M.render(M.getTemplate("wa_first_new_dental_en"), clinic({ contactName: "Dr. Arora", tags: ["DENTAL_KIDS"] }), { now: NOW }).body;
  check(kidsEn.includes("I found your kids dental clinic on Google, but it has no website of its own, only the Google listing.\n\nParents look online to see what will happen at a child's first visit. When they cannot find it, they often call the next clinic on the list.\n\n") &&
    kidsEn.includes("• What happens at a child's first visit\n• Timings and treatments in one place\n• Online appointment booking"), `a kids clinic in English says it the same way (${kidsEn})`);
  const offerTwin = M.render(M.getTemplate("wa_first_fix_dental_hinglish_offer"), clinic({ website: "https://example.org", observation: "no_implant_info", tags: ["DENTAL_IMPLANT"], demoSlug: undefined }), { now: NOW }).body;
  check(offerTwin.endsWith(`Isliye main aapke clinic ka ek naya sample banana chahta hoon:\n• Phone par jaldi khulne wali site\n• Implant ka process aur kharche ki jaankari\n• Online appointment booking\n\nKya main ye sample bana doon?\n${M.EASY_NO.hinglish}`),
    `with no demo yet, the implant centre is offered one in the same words (${offerTwin})`);
  // Nothing a specialist clinic hears claims, ranks or borrows another kind's words.
  const CLAIM = /\b(best|no\.?\s?1|number one|leading|guarantee\w*|painless|free|results?|instant)\b|100\s?%/i;
  for (const tags of [["DENTAL_IMPLANT"], ["DENTAL_ORTHO"], ["DENTAL_KIDS"]]) {
    for (const t of FIRST.filter((x) => x.kind === "dental")) {
      const body = M.render(t, leadFor(t, "dental", { tags }), { now: NOW }).body;
      check(!CLAIM.test(body) && !/\b(class(es)?|admissions?|students?|principal|schools?|coaching|tuition)\b/i.test(body), `${t.id} (${tags[0]}): no claim word, no other kind's word`);
    }
  }
  // Every specialist line keeps the approved 30 Sep words of why patients look online first.
  for (const [k, tag] of [["implant", "DENTAL_IMPLANT"], ["ortho", "DENTAL_ORTHO"], ["kids", "DENTAL_KIDS"]]) {
    for (const language of ["en", "hinglish"]) {
      const t = M.getTemplate(`wa_first_new_dental_${language}`);
      check(M.render(t, clinic({ tags: [tag] }), { now: NOW }).body.includes(`\n\n${M.SPECIALIST_NEED[language][k]}. `), `${k} clinic (${language}): the approved specialist line is its impact`);
    }
  }
}

{
  // An implant centre is never offered a cost range: its demo (d4) prices no implant. The braces demo (d5) does.
  for (const pitch of ["new_website", "fix_website"]) {
    for (const language of ["en", "hinglish", "hi"]) {
      for (const sample of ["made", "offer"]) {
        const o = M.offerFor({ kind: "dental", specialty: "implant", pitch, language, sample, now: NOW });
        check(!/range|रेंज/i.test(o) && /jaankari|information|जानकारी/.test(o), `an implant centre is never offered a cost range its demo does not show (${language}, ${pitch}, ${sample}: ${o})`);
      }
    }
  }
  check(/kharche ki range/.test(M.offerFor({ kind: "dental", specialty: "ortho", pitch: "new_website", language: "hinglish", now: NOW })), "a braces clinic keeps 'kharche ki range': its demo prices each kind of braces");
  const implantLead = (t) => leadFor(t, "dental", { tags: ["DENTAL_IMPLANT"], ...(t.pitch === "fix_website" ? { observation: "no_implant_info" } : {}) });
  const saysRange = T.filter((t) => (t.kind === "dental" || t.kind === "any") && !M.templateNotFor(t, "dental"))
    .filter((t) => /\brange\b|रेंज/i.test(M.render(t, implantLead(t), { now: NOW, demo: { templateId: "d4-implant-centre" } }).body));
  check(saysRange.length === 0, `no message to an implant centre with the d4 demo says "range" (${saysRange.map((t) => t.id).join(", ")})`);
}

{
  // {addressAs}: a line that opens with their name alone, as the approved summary: "Dr. Mehta, aaj ki baat ka summary:".
  for (const [name, kind, language, want] of [
    ["Dr. Mehta", "dental", "hinglish", "Dr. Mehta"], ["Dr Sharma", "dental", "hinglish", "Dr Sharma"], ["Verma", "coaching", "hinglish", "Verma ji"],
    ["Verma ji", "coaching", "hinglish", "Verma ji"], ["Sharma Sir", "school", "hinglish", "Sharma Sir"], ["Principal", "school", "hinglish", "Principal ji"],
    ["Principal Ma'am", "school", "hinglish", "Principal Ma'am"], ["Mrs. Rao", "other", "hinglish", "Mrs. Rao"], ["Dr. Mehta", "dental", "hi", "Dr. Mehta"],
    ["Verma", "coaching", "hi", "Verma जी"], ["Verma", "coaching", "en", "Verma ji"], ["", "dental", "hinglish", "Doctor"], ["", "school", "hinglish", "Principal ji"], ["", "coaching", "en", "Sir"],
    // English keeps a title as stored, a bare title included; only a bare name gets "ji".
    ["Dr. Mehta", "dental", "en", "Dr. Mehta"], ["Principal", "school", "en", "Principal"], ["Sharma Sir", "school", "en", "Sharma Sir"], ["Mrs. Rao", "other", "en", "Mrs. Rao"],
  ]) check(M.addressFor(name, kind, language) === want, `{addressAs} "${name}" (${kind}, ${language}) = "${want}" (got "${M.addressFor(name, kind, language)}")`);
  const opensWithName = T.filter((t) => /^\{(greeting|addressAs)\},/.test(t.body));
  check(opensWithName.length >= 30 && opensWithName.every((t) => t.body.startsWith("{addressAs},")),
    `a message that opens with their name alone says {addressAs} (${opensWithName.filter((t) => !t.body.startsWith("{addressAs},")).map((t) => t.id).join(", ")})`);
  const say = (id, lead) => M.render(M.getTemplate(id), lead, { now: NOW }).body;
  check(say("em_fu1_dental_hinglish", leadOf("dental")).startsWith("Dr. Mehta, aapke clinic ke liye jo sample banaya hai"), "a Hinglish e-mail follow-up opens 'Dr. Mehta,' as the summary does");
  // A clinic named after its doctor never reads "Dr. Mehta, Mehta Dental Care ...".
  const named = leadOf("dental", { instituteName: "Mehta Dental Care" });
  const echoes = T.filter((t) => t.kind === "dental" || (t.kind === "any" && !M.templateNotFor(t, "dental")))
    .filter((t) => /^Dr\. Mehta,? (ji,? )?Mehta\b/.test(M.render(t, leadFor(t, "dental", { instituteName: named.instituteName }), { now: NOW }).body.replace(/^(Namaste|Dear|Good \w+) /, "")));
  check(echoes.length === 0, `no message opens "Dr. Mehta, Mehta Dental Care" (${echoes.map((t) => t.id).join(", ")})`);
  check(say("em_after_call_dental_hinglish", leadOf("dental")).startsWith("Namaste Dr. Mehta ji,\n\n"), "after 'Namaste' the name keeps its ji, as the approved greetings do");
  check(say("wa_proposal_chase_hinglish", leadOf("coaching", { contactName: "Verma" })).startsWith("Verma ji, proposal ke baare mein"), "a bare name opening a line gets ji");
  check(say("wa_after_call_school_hinglish", leadOf("school", { contactName: "" })).startsWith("Principal ji, aaj ki baat ka summary:"), "no name: a school summary opens 'Principal ji,'");
  const noName = M.render(M.getTemplate("wa_after_call_dental_en"), leadOf("dental", { contactName: "" }), { now: NOW });
  check(noName.body.startsWith("Doctor, a summary of our call today:") && noName.warnings.some((w) => /No contact name: the greeting says "Doctor"/.test(w)), "no name: the English summary opens 'Doctor,' and says so");
  check(T.filter((t) => t.stage === "after_call").every((t) => /payment line/.test(t.note)), "the summary's note says to match the payment line to the call and the proposal");
  // Day 16: the approved words.
  check(say("em_fu3_dental_hinglish", leadOf("dental")).startsWith("Dr. Mehta, main yahin chhod raha hoon.\n\nKabhi dekhna ho to bas \"haan\" likh dijiye.\n\nRegards,"), "day 16 in Hinglish: the approved lines, word for word");
  check(say("em_fu3_any_en_offer", leadOf("school", { demoSlug: undefined })).startsWith("Principal Ma'am, I will close this here.\n\nIf you would like a sample website later, just reply yes.\n\nRegards,"), "day 16 with no demo: it offers the sample website and claims none");
}

{
  // An "other" business: its demo is made from a school, coaching or clinic template, and {offer} lists what that demo has.
  const yoga = (over = {}) => leadOf("other", over);
  const said = (id, lead, demo) => M.render(M.getTemplate(id), lead, { now: NOW, demo }).body;
  check(said("wa_first_new_any_hinglish", yoga(), { kind: "school", whatsapp: true }).includes(":\n• Admission ka process aur zaroori dates\n• Fees aur facilities ki jaankari\n• Enquiry form, jo seedha aapke phone par aata hai\n\n"), "an other business with a school demo is offered what a school demo has");
  check(said("wa_first_new_any_hinglish", yoga(), { kind: "coaching" }).includes(":\n• Saare courses aur batch timings ek jagah\n• Fees ki saaf jaankari\n• Phone par jaldi khulne wali site\n\n"), "with a coaching demo, what a coaching demo has");
  check(said("wa_first_new_any_hinglish", yoga(), { kind: "dental", templateId: "d6-kids-dental" }).includes(":\n• Bachche ki pehli visit mein kya hota hai\n• Timings aur treatments ek jagah\n• Online appointment booking\n\n"), "with a kids clinic demo, the first visit");
  check(said("wa_first_fix_any_hinglish", yoga({ website: "https://example.org", observation: "not_mobile" }), { kind: "school" }).includes("Isliye humne aapke business ka ek naya sample banaya hai:\n• Admission ka process aur zaroori dates\n"), "their site: the demo kind's list under the solution line");
  check(said("em_first_new_any_en", yoga(), { kind: "dental", templateId: "d1-family-dentist" }).includes(":\n• All treatments and timings in one place\n• A site that opens fast on a phone\n• Online appointment booking\n\n"), "English, a clinic demo with no number: treatments, a fast site, booking");
  check(said("wa_first_new_any_hinglish", yoga(), undefined).includes(":\n• Aapki services aur timings ek jagah\n• Phone par jaldi khulne wali site\n• Aapke baare mein saaf jaankari\n\n"), "with no demo at hand, the neutral list");
  check(said("wa_first_new_any_hinglish", yoga(), undefined).includes("\n\nLog pehle online dekhte hain ki aap kya karte hain aur kab khule hain. Ye na mile to wo aksar kisi aur ko call kar lete hain.\n\n"), "an other business hears its own impact line, whatever its demo was made from");
  check(M.demoFacts({ kind: "school" }).kind === "school" && !("kind" in M.demoFacts({ kind: "gym" })), "demoFacts reads the demo's kind, and only a known one");
  check(M.getTemplate("wa_first_new_any_hinglish").note.includes("check the demo shows it") && !M.getTemplate("wa_first_new_any_hinglish_offer").note.includes("check the demo shows it"), "the neutral 'made' message tells Mehdi to check the demo shows what it names");
}

/* ── 15. The picture link (1 Oct 2026) ───────────────────────────────────── */

{
  check(KIND3.every((k) => M.previewLinkFor(k) === `https://www.ideovent.in/w/${k}`) && ["other", "any", "", undefined].every((k) => M.previewLinkFor(k) === ""),
    "{previewLink} is the kind's picture page on www.ideovent.in, and nothing for any other kind");
  // Every live WhatsApp first message of a clinic, school or coaching institute that says the sample is made.
  const withPic = FIRST.filter((t) => t.channel === "whatsapp" && KIND3.includes(t.kind) && t.sample === "made");
  check(withPic.length === 13 && withPic.every((t) => M.carriesPreview(t)),
    `all 13 WhatsApp 'sample made' first messages of a clinic, school or coaching institute carry the picture link (${withPic.filter((t) => !M.carriesPreview(t)).map((t) => t.id).join(", ")})`);
  check(KIND3.every((k) => ["new_website", "fix_website"].every((p) => ["hinglish", "en"].every((l) => withPic.some((t) => t.kind === k && t.pitch === p && t.language === l)))),
    "both pitches and both languages of each kind carry it (and the Hindi school message)");
  const bad = [];
  const noLink = [];
  let picRenders = 0;
  for (const t of FIRST) {
    // A neutral pitch-page message goes to every kind; the other neutral ones only to other businesses.
    const kinds = t.kind !== "any" ? [t.kind] : M.templateNotFor(t, "dental") ? ["other"] : KINDS;
    for (const k of kinds) {
      const obsIds = t.pitch === "fix_website" ? M.observationsFor(k).map((o) => o.id).filter((id) => id !== "no_website") : [undefined];
      for (const observation of obsIds) {
        for (const tags of k === "dental" ? [[], ["DENTAL_IMPLANT"], ["DENTAL_ORTHO"], ["DENTAL_KIDS"]] : [[]]) {
          for (const demo of [undefined, { phone: true, whatsapp: true }]) {
            const lead = leadFor(t, k, { observation, tags });
            const r = M.render(t, lead, { now: NOW, demo });
            const links = linksIn(textOf(r));
            const tag = `${t.id} [${k} ${observation ?? "no site"}${tags.length ? ` ${tags[0]}` : ""}${demo ? " +number" : ""}]`;
            if (!withPic.includes(t)) {
              if (links.length) noLink.push(`${tag}: ${links.join(", ")}`);
              continue;
            }
            picRenders++;
            const want = `https://www.ideovent.in/w/${t.kind}`;
            const blocks = r.body.split("\n\n");
            const at = blocks.findIndex((b) => b.includes(want));
            const placed = at === blocks.length - 2 && blocks[at] === pictureLine(t.language, t.kind) && /\?\n/.test(blocks[at + 1] ?? "");
            const sent = M.checkSend({ ...lead, phone: "98765 43210" }, t, "whatsapp", SETTINGS, 0, NOW, { text: { body: r.body } });
            const linkBlock = sent.blockers.filter((b) => /link/i.test(b));
            if (links.length !== 1 || links[0] !== want || !placed || linkBlock.length) {
              bad.push(`${tag}: ${links.join(", ") || "no link"}${placed ? "" : ", not a part of its own just before the ask"}${linkBlock.length ? `, blocked: ${linkBlock.join(" ")}` : ""}`);
            }
          }
        }
      }
    }
  }
  check(picRenders > 250 && bad.length === 0,
    `every live WhatsApp first message of a dental, school or coaching kind that says the sample is made has exactly one link, its kind's picture page, in its own part just before the ask, and checkSend lets it go (${picRenders} renders; ${bad.slice(0, 3).join(" | ")})`);
  check(noLink.length === 0, `no other first message has a link: the offer twins, the pitch-page message, other businesses, every e-mail (${noLink.slice(0, 3).join(" | ")})`);
  // The approved e-mails do not change: they keep "Kya main aapko link bhej doon?" / "Shall I send you the link?".
  check(FIRST.filter((t) => t.channel === "email" && t.sample === "made").every((t) => t.body.endsWith(`\n\n${M.APPROVED_ASK[t.language]}`)), "every first e-mail keeps its approved ask and carries no picture");
}

/* The three static pages WhatsApp reads, and their pictures (public/w/). */
{
  /** Width and height from a JPEG's start-of-frame marker; baseline is marker C0. */
  const jpegSize = (buf) => {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), baseline: marker === 0xc0 };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  };
  for (const k of KIND3) {
    const html = readFileSync(join(ROOT, "public", "w", k, "index.html"), "utf8");
    const jpg = readFileSync(join(ROOT, "public", "w", `${k}.jpg`));
    const head = html.split("</head>")[0];
    const meta = (key) => (head.match(new RegExp(`<meta (?:property|name)="${key.replace(/[.:]/g, "\\$&")}" content="([^"]*)"`)) || [])[1];
    const size = jpegSize(jpg) || {};
    check(jpg[0] === 0xff && jpg[1] === 0xd8 && size.baseline && size.width >= 600 && size.width === 1200 && jpg.length <= 300_000,
      `/w/${k}.jpg: a baseline JPEG, 1200 px wide (600 or more) and at most 300 KB (${size.width}x${size.height}, ${jpg.length} bytes)`);
    check(meta("og:image") === `https://www.ideovent.in/w/${k}.jpg` && meta("og:image:secure_url") === meta("og:image") && meta("og:image:type") === "image/jpeg" &&
      Number(meta("og:image:width")) === size.width && Number(meta("og:image:height")) === size.height,
      `/w/${k}: og:image is the absolute https address of its JPEG, with its real width, height and type (${meta("og:image")} ${meta("og:image:width")}x${meta("og:image:height")})`);
    check(Boolean(meta("og:title")) && Boolean(meta("og:description")) && meta("og:url") === M.previewLinkFor(k) && meta("og:type") === "website" && Boolean(meta("og:image:alt")),
      `/w/${k}: og:title, og:description, og:url (${meta("og:url")}), og:type and og:image:alt in the static head`);
    check(/^<!doctype html>/i.test(html) && head.length < 4000 && head.indexOf("og:image") < head.indexOf("<style"), `/w/${k}: a small static head with the card tags before the styles`);
    check(meta("robots") === "noindex, nofollow", `/w/${k}: noindex`);
    check(!/<script|<iframe|<link[^>]+stylesheet|@import|google-analytics|gtag|fbq|clarity/i.test(html), `/w/${k}: inline CSS only, no script, no tracker`);
    check(!DASH.test(html) && !EMOJI.test(html), `/w/${k}: no em or en dash, no emoji`);
    check(html.includes(`<img src="/w/${k}.jpg" width="${size.width}" height="${size.height}"`), `/w/${k}: shows its picture full width, with its size given`);
    const btn = html.match(/<a class="cta" href="https:\/\/wa\.me\/917761921786\?text=([^"]+)"[^>]*>([^<]+)<\/a>/);
    check(Boolean(btn) && btn[2].trim() === "Haan, sample dikhaiye" && /^Haan/.test(decodeURIComponent(btn[1])), `/w/${k}: the "Haan, sample dikhaiye" button opens WhatsApp to +91 77619 21786 with a reply typed (${btn && decodeURIComponent(btn[1])})`);
    check(html.includes('href="https://www.ideovent.in"'), `/w/${k}: links to https://www.ideovent.in`);
    check(/@media[^{]*max-width/.test(html) || /width:\s*100%/.test(html), `/w/${k}: sized for a 360 px phone`);
  }
  const sitemap = readFileSync(join(ROOT, "public", "sitemap.xml"), "utf8");
  check(!/\/w\//.test(sitemap), "the picture pages are not in the sitemap");
  const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  check(vercel.headers.some((h) => h.source === "/w/(.*)" && h.headers.some((x) => x.key === "X-Robots-Tag" && /noindex/.test(x.value))), "vercel.json sends noindex on /w/");
  const reservedIn = (src) => (src.match(/\(\?:([^)]*)\)/) || [, ""])[1].split("|");
  const pitchRule = vercel.headers.find((h) => String(h.source).startsWith("/:pitchSlug("));
  const shareRule = vercel.rewrites.find((r) => String(r.source).startsWith("/:slug("));
  check(reservedIn(pitchRule?.source || "").includes("w") && reservedIn(shareRule?.source || "").includes("w"), "no pitch slug can take /w: vercel.json's bare-slug rules leave it out");
  check(/STATIC_PATHS = \[[^\]]*"w"/.test(readFileSync(join(SRC, "lib", "pitch", "reservedRoutes.ts"), "utf8")), "reservedRoutes.ts reserves w");
  check(!vercel.rewrites.some((r) => /^\/w\b/.test(r.source)), "no rewrite is aimed at /w: Vercel serves the static files");
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */

if (NEGATIVE) {
  const expected = [
    /allowsLink false has no link field/, /rendered with no URL/, /short REMOVE line/, /mailto: subject and body decode/,
    /do_not_contact blocks/, /no limit set: the 11th/, /dental lead never gets a school or coaching template/,
    /school lead is never offered a dental chip/, /never promises the demo's WhatsApp button/,
    /ends with the approved question and easy no/, /never lands on a Sunday/, /cannot be sent with its blanks/,
    /due four days after/, /retired WhatsApp follow-ups are never offered/, /approved sample: dental, no website/,
    /carries no REMOVE line/, /dental lead is never offered the neutral first message or summary/,
    /specialist clinic: the kids clinic/, /\{addressAs\} "Dr\. Mehta"/, /implant centre is never offered a cost range/, /schools are called after school/,
    /wa_first_new_coaching_hinglish: five parts/, /approved sample: coaching, no website/,
    /has exactly one link, its kind's picture page, in its own part just before the ask/,
  ];
  const missed = expected.filter((re) => !failures.some((f) => re.test(f)));
  console.log(`\nNEGATIVE CONTROL: ${failures.length} failures seen.`);
  if (missed.length) {
    console.log(`NEGATIVE CONTROL FAILED: these sabotages went undetected: ${missed.map(String).join(", ")}`);
    process.exit(1);
  }
  console.log("NEGATIVE CONTROL OK: every sabotage was caught.");
  process.exit(0);
}

console.log(`\n${passes} passed, ${failures.length} failed (${T.length} live templates, ${M.RETIRED_TEMPLATES.length} retired, ${M.OBSERVATIONS.length} observations).`);
process.exit(failures.length ? 1 : 0);
