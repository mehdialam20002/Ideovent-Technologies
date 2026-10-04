/**
 * Tests the link in the first message and Zoho Mail (2 Oct 2026). Mehdi asked: "mail pe to first msz pe
 * hi link send krwa do", "ek option dedo open in zoho mail" and, for WhatsApp, "first msz pe link bhejne
 * wala and ek nhi bhejne wla dono templete bana do".
 *
 *   node scripts/test-outreach-send-links.mjs
 *
 * WHAT IT ASSERTS
 *   Registry (templates.ts LINK_TEMPLATES)
 *    1. 33 first-message twins with their sample's link (17 WhatsApp, 16 e-mail) and 16 follow-ups for
 *       after the link; ids unique across every list; no twin in OUTREACH_TEMPLATES or in anything
 *       templatesFor() returns; getTemplate() resolves each.
 *    2. Every live first message that says the sample is made has exactly one twin with the link, and
 *       nothing else has one (the offer twins, the pitch-page messages, every other stage); every "made"
 *       follow-up has its after-the-link twin, the offer follow-ups none.
 *    3. Each first twin keeps its base's channel, stage, pitch, kind, language, subject and rules, carries
 *       {demoLink} once and no other link field or typed address; label and note name no address.
 *    4. Each after-the-link twin keeps its base's stage, channel and subject, carries no link, and its note
 *       says what it is (day 4 and the last WhatsApp; the e-mails reply in the same thread).
 *   Rendering (every lead each twin can go to: every observation, every dental specialty, the demo with
 *   and without their number)
 *    5. A first twin is its base's parts up to the bullets, then "Ye raha sample:" and the link alone on its
 *       line, the two honest lines, one question and the easy no; exactly one URL, their demo link; no
 *       dash, emoji, price or hype word; no warning the base does not have.
 *    6. E-mail twins: the base's subject, the signature and the REMOVE line once, at most 140 words above
 *       "Regards,"; WhatsApp twins at most 820 characters. The measured maxima are printed.
 *    7. The approved examples render word for word (the dental Hinglish WhatsApp and the dental English
 *       e-mail, design section 3), and LINK_LINE is the approved after-yes line.
 *    8. The follow-ups for after the link carry no URL, never offer the link again, point back to it, keep
 *       the approved openers, and ask one question (day 4 and day 9 e-mails) or none.
 *   checkSend (engine.ts)
 *    9-14. A twin as rendered goes; a second copy of the link, the picture link, another demo's address or
 *       any other address blocks; the link deleted by hand blocks; no demo blocks; a twin with no
 *       {demoLink} blocks; the bases keep their rules; a web address in the signature warns.
 *   15. Addresses: a "?", a line break, a comma, "&cc=" or a space blocks the e-mail; "+" and "'" do not.
 *   mailLinks.ts
 *   16-22. The Zoho compose link: one parameter, ct; no "+"; Zoho's own mailto rules read back the exact
 *       address, subject and body (blank lines, bullets, rupees, Devanagari, an emoji, quotes, a URL with
 *       ? & = # + %); the same href Chrome's handler would build; "+" and "'" stay raw; an unsafe address
 *       gets no link; past 5,500 characters the body is dropped; a lone surrogate does not throw; only
 *       Zoho Mail's own hosts are taken from the setting.
 *   linkChoice.ts
 *   23-28. sendVariant, linkWentOn, linkWentCold, demoReach (every state, reasons word for word, canPublish),
 *       pointBackReason, sampleToppersReason, coldLinkReason, carriesDemoLink, foreignDemoSlugs, offersLink,
 *       demoNamedFor, linkHint, TEAM_LINK_REASON.
 *   29. The compose screen's wiring, read from the source (as test-outreach-compose.mjs does): the button
 *       order, the Zoho link built from the text on screen, public before it opens, the order of the
 *       reasons With link is off, the cold-link and other-demo rules, the lines both other branches rewrite
 *       left as they are, useDemoLink never publishing for the team, the switch's test ids and storage key,
 *       the cold-link rule in useOutreach; no em or en dash in the new files.
 *   Review fixes (3 Oct 2026)
 *   30. {offer} is true of the demo that goes: a coaching demo with a course that shows no fee (c1's,
 *       made the way step 1 makes it) is offered clear fee details, and the smile studio (d3) its timings
 *       and treatments in one place; every other template keeps the approved words.
 *   31. A site that would not open at all is their site: the site_down observation, the Lead Finder's
 *       old "did not open" sentences read as it (never a parked, blank or "coming soon" page), the
 *       no-website message blocked for such a lead, the Lead Finder filing such a site under their site;
 *       "khuli hi nahi" reads as a site that does not open.
 *   32. The links cannot break: a lone surrogate never throws in mailtoUrl or the WhatsApp links; a
 *       subject past MAX_SUBJECT blocks the e-mail; a short link typed by hand (bit.ly, wa.me) counts as a
 *       link, and degree names such as B.Ed/M.Ed do not.
 *   33. useDemoLink reads the demo again before it publishes, and writes that record, not this screen's copy.
 *   Integration with the CRM team (3 Oct 2026)
 *   34. Anyone but Mehdi: teamDemoFix / teamTurnOnReason (a Free slot, an expired demo, an example, a
 *       provisional link, the toppers or another name is never turned on by them), teamReach (every state in
 *       their words, never Mehdi's own steps), the team's line under the switch.
 *   35. Their screens, read from the source: the checked row shows the version that goes in their words,
 *       another demo's link stops their send unless it is an example, the offer follow-up after Mehdi's link,
 *       the mail app first on their phone, TeamDemoStep and the Demo card hold the turn-on guards.
 *
 * NEGATIVE CONTROL
 *
 *   OUTREACH_SEND_LINKS_NEGATIVE=1 node scripts/test-outreach-send-links.mjs
 *
 * sabotages copies of the real modules after loading them: the first twins carry the picture line too, the
 * follow-ups for after the link ask "Shall I send you the link?", the Zoho link is built URLSearchParams
 * style with any address let through, sendVariant ignores With link, demoReach takes a closed demo for
 * a live one and lets anyone's send publish, {offer} reads nothing off the demo but its number, and a site
 * that would not open counts as no website. The run must then FAIL on each; it exits 0 only when every
 * expected failure was seen (the same pattern as test-outreach-engine.mjs).
 *
 * Bundled with esbuild like test-outreach-engine.mjs, with Vite's "?raw" imports read as text the way
 * test-from-template.mjs reads them (linkChoice.ts reaches fromTemplate.ts, which reaches the reserved
 * routes); nothing mocked. Every lead here is fictional (example.org, "Example ..." names).
 */

import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.OUTREACH_SEND_LINKS_NEGATIVE);

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

const aliasAndRaw = {
  name: "alias-and-raw",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      const [p, q] = args.path.split("?");
      const base = join(SRC, p.slice(2));
      return q === "raw" ? { path: base, namespace: "raw" } : { path: resolveTs(base) };
    });
    b.onResolve({ filter: /\?raw$/ }, (args) => ({ path: resolve(args.resolveDir, args.path.replace(/\?raw$/, "")), namespace: "raw" }));
    b.onLoad({ filter: /.*/, namespace: "raw" }, (args) => ({ contents: `export default ${JSON.stringify(readFileSync(args.path, "utf8"))};`, loader: "js" }));
  },
};

const out = join(tmpdir(), `ideovent-test-outreach-send-links-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: `export * from "@/lib/outreach/templates";
export * from "@/lib/outreach/engine";
export * from "@/lib/outreach/mailLinks";
export * from "@/lib/outreach/linkChoice";
export { samplePrint } from "@/lib/demo/site/sample";
export { loadTemplate } from "@/lib/demo/templates";
export { fromTemplate } from "@/lib/demo/templates/fromTemplate";`,
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [aliasAndRaw],
});
writeFileSync(out, bundled.outputFiles[0].text);
const real = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/* ── Negative control: sabotage copies of the real modules ───────────────── */

const M = { ...real };
if (NEGATIVE) {
  // The first twins carry the picture line too, and the follow-ups for after the link offer the link again...
  const sab = real.LINK_TEMPLATES.map((t) =>
    t.link === "demo"
      ? { ...t, body: t.body.replace(real.LINK_LINE[t.language], `${real.PREVIEW_LINE[t.language]}\n\n${real.LINK_LINE[t.language]}`) }
      : t.afterLink ? { ...t, body: `${t.body}\n\nShall I send you the link?` } : t,
  );
  const byId = new Map(sab.map((t) => [t.id, t]));
  const twinOf = new Map(sab.map((t) => [t.twinOf, t]));
  M.LINK_TEMPLATES = sab;
  M.getTemplate = (id) => byId.get(id) ?? real.getTemplate(id);
  M.linkTwinOf = (t) => { const x = t ? twinOf.get(t.id) : undefined; return x?.link === "demo" ? x : undefined; };
  M.afterLinkTwinOf = (t) => { const x = t ? twinOf.get(t.id) : undefined; return x?.afterLink ? x : undefined; };
  // ...the Zoho link is built URLSearchParams style ("+" for a space) and any address goes in as it is...
  M.zohoComposeLink = ({ to, subject = "", body = "" }, setting) => ({
    href: `${real.zohoMailOrigin(setting) || real.ZOHO_MAIL_DEFAULT}/zm/comp.do?ct=${encodeURIComponent(`mailto:${String(to).trim()}?${new URLSearchParams({ subject, body })}`)}`,
    withBody: true,
  });
  M.safeMailAddress = (a) => String(a ?? "").trim();
  // ...With link is ignored...
  M.sendVariant = (picked, o) => real.sendVariant(picked, { ...o, withLink: false });
  // ...and a closed demo reads as live, and anyone's send may publish a draft.
  M.demoReach = (args) => {
    const r = real.demoReach({ ...args, canPublish: true });
    return r.state === "closed" ? { state: "live", ok: true, needsPublish: false, reason: "" } : r;
  };
  // Review, 3 Oct 2026: {offer} reads nothing off the demo but its number, and a dead site counts as no website.
  M.offerFor = (o) => real.offerFor({ ...o, demo: o.demo ? { phone: o.demo.phone, whatsapp: o.demo.whatsapp } : o.demo });
  M.effectivePitch = (l) => l.pitch ?? ((l.website ?? "").trim() ? "fix_website" : "new_website");
  // Integration, 3 Oct 2026: the team may turn on any demo, and reads Mehdi's own reasons.
  M.teamTurnOnReason = () => "";
  M.teamReach = (r) => r;
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
const EMOJI = /\p{Extended_Pictographic}/u;
const HYPE = /\b(best|free|guarantee\w*|urgent\w*|hurry|limited time|offer ends|today only|last chance|no\.?\s?1|number one|cheapest|lowest price)\b/i;
const PRICE = /₹|\bRs\b|\bINR\b|\b\d{1,3}(,\d{2})*,\d{3}\b|\d\s?\/-/;
const URL_ALL = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:vercel\.app|com|in|org|net)\/\S*|wa\.me\/\S*/gi;
const linksIn = (s) => s.match(URL_ALL) || [];
const URL_IN_TEXT = /https?:\/\/|www\.|\.vercel\.app|wa\.me/i;
const questions = (s) => (s.match(/\?/g) || []).length;

const NAMES = { dental: "Example Dental Clinic", school: "Example Public School", coaching: "Example Classes", other: "Example Yoga Studio" };
const CONTACT = { dental: "Dr. Mehta", school: "Principal Ma'am", coaching: "Verma Sir", other: "Mrs. Rao" };
const FIX_OBS = { dental: "no_timings", school: "no_fees_admission", coaching: "no_batch_fees", other: "not_mobile" };
/** A fictional lead of one kind, with a demo and a titled contact. */
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
  ...over,
});
/** The lead a template is written for: its pitch decides whether the lead has a website and an observation. */
const leadFor = (t, kind, over = {}) => {
  const k = kind || (t.kind === "any" ? "other" : t.kind);
  return leadOf(k, { ...(t.pitch === "fix_website" ? { website: "https://example.org", observation: FIX_OBS[k] } : {}), ...over });
};
// Tuesday 29 Sep 2026, 14:30 India time; quiet hours off, so a send is judged on its words only.
const NOW = new Date("2026-09-29T09:00:00.000Z");
const SETTINGS = { signature: "", quietStart: "00:00", quietEnd: "00:00", alertOnDemoOpen: false };
/** An e-mail's own words: everything above "Regards,". */
const ownWords = (t, r) => (t.channel === "email" ? r.body.split("\n\nRegards,")[0] : r.body);
/** The two lines approved on 1 Oct 2026 to travel with every demo link, word for word. */
const TRUTH = {
  hinglish: "Ye sirf demonstration hai, aapki live site nahi.\nJo jaankari aapki taraf se nahi mili, wo abhi sample hai.",
  en: "It is only a demonstration, not your live site.\nAnything we did not get from you is sample content for now.",
  hi: "ये सिर्फ़ डेमो है, आपकी लाइव साइट नहीं।\nजो जानकारी आपकी तरफ़ से नहीं मिली, वो अभी सैंपल है।",
};

const T = M.OUTREACH_TEMPLATES;
const L = M.LINK_TEMPLATES;
const FT = L.filter((t) => t.link === "demo");
const AT = L.filter((t) => t.afterLink);

/* ── 1. The registry ─────────────────────────────────────────────────────── */

check(FT.length === 33 && FT.filter((t) => t.channel === "whatsapp").length === 17 && FT.filter((t) => t.channel === "email").length === 16,
  `33 first-message twins with their sample's link, 17 WhatsApp and 16 e-mail (${FT.length})`);
check(AT.length === 16 && AT.filter((t) => t.channel === "whatsapp").length === 4 && AT.filter((t) => t.channel === "email").length === 12,
  `16 follow-ups for after the link, 4 WhatsApp and 12 e-mail (${AT.length})`);
check(L.length === 49 && L.every((t) => t.link === "demo" || t.afterLink), `LINK_TEMPLATES holds the 49 twins and nothing else (${L.length})`);
{
  const ids = [...T, ...M.RETIRED_TEMPLATES, ...L].map((t) => t.id);
  check(new Set(ids).size === ids.length, "ids are unique across the live, retired and twin lists");
  const live = new Set(T.map((t) => t.id));
  check(L.every((t) => !live.has(t.id)) && !T.some((t) => t.link || t.afterLink || t.twinOf), "no twin is in OUTREACH_TEMPLATES, and no listed template is a twin");
  const twins = new Set(L.map((t) => t.id));
  const leaked = new Set();
  for (const channel of [undefined, "email", "whatsapp"]) {
    for (const stage of [undefined, ...Object.keys(M.STAGE_LABELS)]) {
      for (const kind of [undefined, "dental", "school", "coaching", "other"]) {
        for (const language of [undefined, "en", "hinglish", "hi"]) {
          for (const t of M.templatesFor({ channel, stage, kind, language })) if (twins.has(t.id)) leaked.add(t.id);
        }
      }
    }
  }
  check(leaked.size === 0, `templatesFor() never offers a twin on its own (${[...leaked].slice(0, 3).join(", ")})`);
  check(L.every((t) => M.getTemplate(t.id) === t), "getTemplate() resolves every twin, so a history line naming one still reads");
  check(Boolean(M.getTemplate("wa_first_new_school_hi_link")) && M.getTemplate("wa_first_new_school_hi_link").language === "hi", "the Hindi school WhatsApp has its twin, in Hindi");
}

/* ── 2. Exactly the messages that say the sample is made have twins ──────── */

{
  const made = T.filter((t) => t.stage === "first" && t.sample === "made" && t.promises === "demo");
  check(made.length === 33, `33 live first messages say the sample is made (${made.length})`);
  for (const b of T) {
    const twin = M.linkTwinOf(b);
    const count = L.filter((x) => x.link === "demo" && x.twinOf === b.id).length;
    if (b.stage === "first" && b.sample === "made" && b.promises === "demo") {
      check(Boolean(twin) && twin.twinOf === b.id && count === 1, `${b.id}: has exactly one twin with their sample's link`);
    } else {
      check(!twin && count === 0, `${b.id}: has no twin with a link (offer twins, pitch-page messages and every other stage keep their own words)`);
    }
    const after = M.afterLinkTwinOf(b);
    if (/^follow_up_/.test(b.stage) && b.sample === "made") check(Boolean(after) && after.twinOf === b.id, `${b.id}: has its follow-up for after the link`);
    else check(!after, `${b.id}: has no follow-up for after the link`);
  }
  for (const t of L) check(!M.linkTwinOf(t) && !M.afterLinkTwinOf(t), `${t.id}: a twin has no twin of its own`);
}

/* ── 3. The first twins: their base's rules, their sample's link once ────── */

for (const t of FT) {
  const b = real.getTemplate(t.twinOf);
  const same = ["channel", "stage", "pitch", "kind", "language", "subject", "sample", "promises", "allowsLink"].every((k) => t[k] === b?.[k]) &&
    JSON.stringify(t.notForKinds ?? null) === JSON.stringify(b?.notForKinds ?? null);
  check(Boolean(b) && t.id === `${b.id}_link` && same && t.allowsLink === false && t.stage === "first" && t.sample === "made" && t.promises === "demo" && t.link === "demo" && !t.afterLink,
    `${t.id}: the twin of ${t.twinOf}, with its channel, stage, kind, pitch, language, subject and rules`);
  const said = `${t.subject ?? ""}\n${t.body}`;
  check(t.body.split("{demoLink}").length === 2 && !/\{previewLink\}/.test(said) && !/\{pitchLink\}/.test(said) && !URL_IN_TEXT.test(said) && !/ideovent\.in/i.test(said),
    `${t.id}: body has {demoLink} once and no {previewLink}, {pitchLink} or typed address`);
  check(!URL_IN_TEXT.test(`${t.label}\n${t.note}`) && !DASH.test(`${said}\n${t.label}\n${t.note}`) && !EMOJI.test(said) && !PRICE.test(t.body) && !HYPE.test(t.body),
    `${t.id}: label and note carry no address; no dash, emoji, price or hype word anywhere`);
  check(/with their sample's link/.test(t.label) && /Carries their sample's own link, once, and no other link/.test(t.note) &&
    (t.channel === "email" ? /Copy e-mail text/.test(t.note) : !/Copy e-mail text/.test(t.note)) && (t.kind !== "coaching" || /toppers/.test(t.note)),
  `${t.id}: its label and note say it carries their sample's link (the note fits its channel, and a coaching one names the toppers rule)`);
}

/* ── 4. The follow-ups for after the link ────────────────────────────────── */

for (const t of AT) {
  const b = real.getTemplate(t.twinOf);
  const same = ["channel", "stage", "pitch", "kind", "language", "subject", "sample", "promises", "allowsLink"].every((k) => t[k] === b?.[k]);
  check(Boolean(b) && t.id === `${b.id}_after_link` && same && t.afterLink === true && t.link === undefined && /^follow_up_/.test(t.stage) && t.sample === "made",
    `${t.id}: the follow-up for after the link of ${t.twinOf}, with its stage, channel, subject and rules`);
  check(!/\{(demoLink|pitchLink|previewLink)\}/.test(t.body) && !URL_IN_TEXT.test(`${t.body}\n${t.label}\n${t.note}`) && !DASH.test(`${t.body}\n${t.label}\n${t.note}`) && !EMOJI.test(t.body),
    `${t.id}: no link field or address, no dash or emoji`);
  if (t.channel === "whatsapp") {
    check(/Four days after the first message/.test(t.note) && /last WhatsApp/.test(t.note) && /after the link/.test(t.label), `${t.id}: its note says day 4 and that it is the last WhatsApp`);
  } else {
    check(t.note.startsWith(M.SAME_THREAD_NOTE) && /after the link/.test(t.label) && t.subject === "Re: {instituteName} website", `${t.id}: its note says to reply in the same thread, and it keeps the thread's subject`);
  }
}

/* ── 5, 6. Every first twin, every lead it can go to ─────────────────────── */

{
  let maxWords = 0;
  let maxWa = 0;
  let renders = 0;
  for (const t of FT) {
    const b = real.getTemplate(t.twinOf);
    const kind = t.kind === "any" ? "other" : t.kind;
    const obsIds = t.pitch === "fix_website" ? M.observationsFor(kind).map((o) => o.id).filter((id) => id !== "no_website") : [undefined];
    const specialties = kind === "dental" ? [[], ["DENTAL_IMPLANT"], ["DENTAL_ORTHO"], ["DENTAL_KIDS"]] : [[]];
    const bad = [];
    for (const observation of obsIds) {
      for (const tags of specialties) {
        for (const demo of [undefined, { phone: true, whatsapp: true }]) {
          const lead = leadFor(t, kind, { observation, tags });
          const r = M.render(t, lead, { now: NOW, demo });
          const rb = M.render(b, lead, { now: NOW, demo });
          renders++;
          const link = M.demoLinkFor(lead.demoSlug);
          const words = ownWords(t, r);
          const prefix = ownWords(b, rb).split("\n\n").slice(0, t.channel === "whatsapp" ? 5 : 4).join("\n\n");
          const want = [prefix, M.LINK_LINE[t.language].replace("{demoLink}", link), TRUTH[t.language], M.LINK_ASK[t.language]].join("\n\n");
          const tag = `${observation ?? "no site"}${tags[0] ? ` ${tags[0]}` : ""}${demo ? " +number" : ""}`;
          if (words !== want) bad.push(`${tag}: not the base's parts, then the link, the honest lines and the ask`);
          if (!r.body.includes(`\n${link}\n`)) bad.push(`${tag}: the link is not alone on its line`);
          const links = linksIn(`${r.subject ?? ""}\n${r.body}`);
          if (links.length !== 1 || links[0] !== link) bad.push(`${tag}: links ${links.join(", ")}`);
          if (questions(words) !== 1) bad.push(`${tag}: ${questions(words)} questions`);
          if (words.split("\n").at(-1) !== M.EASY_NO[t.language]) bad.push(`${tag}: does not end with the easy no`);
          if (DASH.test(words) || EMOJI.test(words) || PRICE.test(words) || HYPE.test(words)) bad.push(`${tag}: a dash, emoji, price or hype word`);
          const extra = r.warnings.filter((w) => !rb.warnings.includes(w));
          if (extra.length) bad.push(`${tag}: warnings ${extra.join(" | ")}`);
          if (t.channel === "email") {
            if (r.subject !== rb.subject) bad.push(`${tag}: subject "${r.subject}"`);
            if (r.body.split(M.DEFAULT_SIGNATURE).length !== 2 || r.body.split("REMOVE").length !== 2) bad.push(`${tag}: the signature or the REMOVE line not exactly once`);
            const n = words.split(/\s+/).filter(Boolean).length;
            maxWords = Math.max(maxWords, n);
            if (n > 140) bad.push(`${tag}: ${n} words above Regards`);
          } else {
            maxWa = Math.max(maxWa, r.body.length);
            if (r.body.length > 820) bad.push(`${tag}: ${r.body.length} characters`);
          }
        }
      }
    }
    check(bad.length === 0, `${t.id}: renders as its base's parts up to the bullets, then the link alone on its line, the two honest lines and one question with the easy no, for every lead it can go to (${bad.slice(0, 3).join(" | ")})`);
  }
  console.log(`      measured: e-mail twins up to ${maxWords} words above "Regards,", WhatsApp twins up to ${maxWa} characters (${renders} renders, test link ${M.demoLinkFor("example-dental").length} characters)`);
  check(renders >= 150 && maxWords > 0 && maxWords <= 140 && maxWa > 0 && maxWa <= 820,
    `lengths: e-mail twins at most 140 words above Regards (${maxWords}), WhatsApp twins at most 820 characters (${maxWa}), over ${renders} renders`);
}

/* ── 7. The approved examples, word for word (design section 3) ──────────── */

{
  const clinic = leadOf("dental", { instituteName: "Example Dental Clinic", contactName: "Dr. Mehta", demoSlug: "example-dental-care-saket-2abc" });
  const link = M.demoLinkFor(clinic.demoSlug);
  const wa = M.render(M.getTemplate("wa_first_new_dental_hinglish_link"), clinic, { now: NOW }).body;
  check(wa === "Namaste Dr. Mehta ji,\n\nMain Mehdi, Ideovent Technologies (Saket, Delhi) se.\n\n" +
    "Google par aapka clinic dekha. Clinic ki apni website nahi hai, sirf Google listing hai.\n\n" +
    "Aaj patient clinic chunne se pehle timings, treatments aur fees online dekhte hain. Ye na mile to wo aksar agle clinic ko call kar lete hain.\n\n" +
    "Isliye humne aapke clinic ke naam se ek sample website banayi hai:\n• Saare treatments aur timings ek jagah\n• Phone par jaldi khulne wali site\n• Online appointment booking\n\n" +
    `Ye raha sample:\n${link}\n\n` +
    "Ye sirf demonstration hai, aapki live site nahi.\nJo jaankari aapki taraf se nahi mili, wo abhi sample hai.\n\n" +
    "Pasand aaye to kya 10 minute baat kar sakte hain?\nPasand na aaye to koi baat nahi.",
  `approved example: the dental Hinglish WhatsApp with link, word for word (${wa})`);
  const em = M.render(M.getTemplate("em_first_new_dental_en_link"), clinic, { now: NOW });
  check(em.subject === "Example Dental Clinic website" && em.body === "Dear Dr. Mehta,\n\n" +
    "I looked for your clinic on Google, the way a new patient would, and found the listing but no website of its own.\n\n" +
    "Most patients check timings and book from their phone. When they cannot, they often call the next clinic on the list.\n\n" +
    "So we made a sample website for your clinic:\n• All treatments and timings in one place\n• A site that opens fast on a phone\n• Online appointment booking\n\n" +
    `Here is the sample:\n${link}\n\n` +
    "It is only a demonstration, not your live site.\nAnything we did not get from you is sample content for now.\n\n" +
    "If you like it, shall we talk for 10 minutes?\nIf it is not useful, no problem at all.\n\n" +
    "Regards,\nMehdi Alam, Ideovent Technologies, Saket, New Delhi\n+91 77619 21786\n\n" +
    "If you would rather not hear from me, reply REMOVE and I will not write again.",
  `approved example: the dental English e-mail with link, word for word (${em.subject} | ${em.body})`);
  for (const [lang, id] of [["hinglish", "wa_after_reply_dental_hinglish"], ["en", "wa_after_reply_dental_en"], ["hi", "wa_after_reply_dental_hi"]]) {
    check(real.getTemplate(id).body.includes(`\n\n${M.LINK_LINE[lang]}\n\n`), `LINK_LINE (${lang}) is the approved after-yes link line, word for word (${id})`);
  }
}

/* ── 8. The follow-ups for after the link ────────────────────────────────── */

for (const t of AT) {
  const b = real.getTemplate(t.twinOf);
  const kinds = t.kind === "any" ? ["school", "coaching", "other", "dental"] : [t.kind];
  const noUrl = [];
  const offers = [];
  const back = [];
  const asks = [];
  const opener = [];
  const mail = [];
  for (const kind of kinds) {
    const lead = leadOf(kind, { status: "contacted" });
    const r = M.render(t, lead, { now: NOW });
    const rb = M.render(b, lead, { now: NOW });
    const words = ownWords(t, r);
    const baseWords = ownWords(b, rb);
    if (linksIn(`${r.subject ?? ""}\n${r.body}`).length) noUrl.push(kind);
    if (/link bhej doon|send you the link|dekhna ho|want to see it/i.test(words)) offers.push(kind);
    const points = t.channel === "whatsapp" ? /message above|upar wale message/ : t.stage === "follow_up_3" ? /./ : /first e-mail|pehle mail/;
    if (!points.test(words)) back.push(kind);
    if (questions(words) !== (t.channel === "email" && t.stage !== "follow_up_3" ? 1 : 0)) asks.push(`${kind} ${questions(words)}`);
    const [first, second] = words.split("\n\n");
    const [bFirst, bSecond] = baseWords.split("\n\n");
    if (!first.startsWith(bFirst) || (t.stage === "follow_up_2" && second !== bSecond)) opener.push(kind);
    if (t.channel === "email" && (r.subject !== rb.subject || r.body.split("REMOVE").length !== 2 || r.body.split(M.DEFAULT_SIGNATURE).length !== 2)) mail.push(kind);
  }
  check(!noUrl.length, `${t.id}: renders with no URL (${noUrl.join(", ")})`);
  check(!offers.length, `${t.id}: never offers the link again (${offers.join(", ")})`);
  check(!back.length, `${t.id}: points back to the link they got (${back.join(", ")})`);
  check(!asks.length, `${t.id}: ${t.channel === "email" && t.stage !== "follow_up_3" ? "exactly one question" : "no question"} (${asks.join(", ")})`);
  check(!opener.length, `${t.id}: opens with the approved opener of ${b.id} word for word (${opener.join(", ")})`);
  if (t.channel === "email") check(!mail.length, `${t.id}: the thread's subject, the signature and the REMOVE line once (${mail.join(", ")})`);
}

/* ── 9 to 14. checkSend: one link, their sample's own ─────────────────────── */

const sendCheck = (lead, t, text) => M.checkSend(lead, t, t.channel, SETTINGS, 0, NOW, text === undefined ? {} : { text });
for (const t of FT) {
  const kind = t.kind === "any" ? "other" : t.kind;
  const lead = leadFor(t, kind);
  const r = M.render(t, lead, { now: NOW });
  const link = M.demoLinkFor(lead.demoSlug);
  const as = sendCheck(lead, t, { subject: r.subject, body: r.body });
  check(as.ok && as.blockers.length === 0, `${t.id}: as rendered, with the lead's demo, it goes (${as.blockers.join(" | ")})`);
  for (const [what, body] of [
    ["a second copy of the link", `${r.body}\n${link}`],
    ["the picture link", `${r.body}\nhttps://www.ideovent.in/w/${kind === "other" ? "school" : kind}`],
    ["another demo's address", `${r.body}\n${M.demoLinkFor(`${lead.demoSlug}-2`)}`],
    ["www.example.org", `${r.body}\nwww.example.org`],
  ]) {
    const c = sendCheck(lead, t, { subject: r.subject, body });
    check(!c.ok && c.blockers.some((x) => /only their sample's own link, once/.test(x)), `${t.id}: ${what} as well blocks the send ("only their sample's own link, once")`);
  }
  const lost = sendCheck(lead, t, { subject: r.subject, body: r.body.replace(link, "") });
  check(!lost.ok && lost.blockers.some((x) => /lost their sample's link/.test(x)), `${t.id}: with the link deleted by hand it blocks ("lost their sample's link")`);
  const noDemo = sendCheck(leadFor(t, kind, { demoSlug: undefined }), t);
  check(!noDemo.ok && noDemo.blockers.some((x) => /Pick or create a demo first/.test(x)), `${t.id}: for a lead with no demo it blocks ("Pick or create a demo first")`);
}
{
  const twin = real.getTemplate("em_first_new_dental_en_link");
  const synthetic = { ...twin, id: "em_first_synthetic_link", body: twin.body.replace("{demoLink}", "") };
  const c = M.checkSend(leadOf("dental"), synthetic, "email", SETTINGS, 0, NOW);
  check(!c.ok && c.blockers.some((x) => /only their sample's own link, once/.test(x)), "a first template marked link \"demo\" with no {demoLink} blocks");
  // The bases keep their rules.
  const em = real.getTemplate("em_first_new_school_en");
  const rs = M.render(em, leadOf("school"), { now: NOW });
  const typed = sendCheck(leadOf("school"), em, { subject: rs.subject, body: `${rs.body}\n${M.demoLinkFor("example-school")}` });
  check(!typed.ok && typed.blockers.some((x) => /must not carry a link/.test(x)), "the first e-mail Without link still blocks a link typed into it (\"must not carry a link\")");
  const wa = real.getTemplate("wa_first_new_dental_en");
  const rw = M.render(wa, leadOf("dental"), { now: NOW });
  const okWa = sendCheck(leadOf("dental"), wa, { body: rw.body });
  check(okWa.ok && JSON.stringify(linksIn(rw.body)) === JSON.stringify(["https://www.ideovent.in/w/dental"]), "a WhatsApp first message with the picture keeps its one picture link, and goes");
  const twice = sendCheck(leadOf("dental"), wa, { body: `${rw.body}\n${M.demoLinkFor("example-dental")}` });
  check(!twice.ok && twice.blockers.some((x) => /except its one picture link/.test(x)), "and their sample's link typed into it still blocks");
  // One link means one: a web address in the signature would make two.
  const sig = { ...SETTINGS, signature: "Mehdi Alam\nwww.example.org" };
  const r2 = M.render(twin, leadOf("dental"), { now: NOW, signature: sig.signature });
  const c2 = M.checkSend(leadOf("dental"), twin, "email", sig, 0, NOW, { text: { subject: r2.subject, body: r2.body } });
  check(c2.ok && c2.warnings.some((w) => /would carry two links/.test(w)), `a web address in the signature does not block the e-mail with the link, and warns that it would carry two links (${[...c2.blockers, ...c2.warnings].join(" | ")})`);
  const rb2 = M.render(real.getTemplate("em_first_new_dental_en"), leadOf("dental"), { now: NOW, signature: sig.signature });
  const c3 = M.checkSend(leadOf("dental"), real.getTemplate("em_first_new_dental_en"), "email", sig, 0, NOW, { text: { subject: rb2.subject, body: rb2.body } });
  check(c3.ok && !c3.warnings.some((w) => /two links/.test(w)), "the e-mail Without link gets no two-links warning");
}

/* ── 15. The e-mail address: nothing a mail link could read as a header ──── */

const UNSAFE = ["a@b.com?bcc=x@y.com", "a@b.com\nbcc: x@y.com", "a@b.com, c@d.com", "a@b.com&cc=x@y.com", "a b@c.com"];
{
  const twin = real.getTemplate("em_first_new_dental_en_link");
  for (const email of UNSAFE) {
    const c = M.checkSend(leadOf("dental", { email }), twin, "email", SETTINGS, 0, NOW);
    check(!c.ok && c.blockers.some((x) => /No valid e-mail address|cannot go into a mail link/.test(x)), `the address ${JSON.stringify(email)} blocks the e-mail`);
  }
  for (const email of ["o&brien@example.org", "dr.mehta@exämple.org", "a..b@example.org"]) {
    const c = M.checkSend(leadOf("dental", { email }), twin, "email", SETTINGS, 0, NOW);
    check(!c.ok && c.blockers.some((x) => /cannot go into a mail link as it is/.test(x)), `the address ${JSON.stringify(email)} looks like an address but cannot go into a mail link: it blocks with the reason`);
  }
  for (const email of ["dr.mehta+clinic@example.org", "o'brien@example.org", "Office@Example.ORG"]) {
    const c = M.checkSend(leadOf("dental", { email }), twin, "email", SETTINGS, 0, NOW);
    check(!c.blockers.some((x) => /No valid e-mail address|cannot go into a mail link/.test(x)), `the address ${email} goes (${c.blockers.join(" | ")})`);
  }
}

/* ── 16 to 22. Zoho Mail's compose link ──────────────────────────────────── */

/** @zohomail/mailto-parser's rules: the address before "?" only with a literal "@", never percent-decoded;
    lowercase keys; each value through decodeURIComponent. */
function zohoParse(mailto) {
  const rest = mailto.replace(/^mailto:/i, "");
  const q = rest.indexOf("?");
  const head = q < 0 ? rest : rest.slice(0, q);
  const got = { to: head.includes("@") ? head : "" };
  for (const pair of (q < 0 ? "" : rest.slice(q + 1)).split("&").filter(Boolean)) {
    const i = pair.indexOf("=");
    got[(i < 0 ? pair : pair.slice(0, i)).toLowerCase()] = decodeURIComponent(i < 0 ? "" : pair.slice(i + 1));
  }
  return got;
}
const ZBASE = "https://mail.zoho.in/zm/comp.do?ct=";
const ctOf = (z) => (z ? decodeURIComponent(z.href.slice(z.href.indexOf("?ct=") + 4)) : "");
{
  const SUBJ = "Smile Care website";
  const BODY = "Dear Dr. Mehta,\n\nLine one.\n\n• A bullet\n• Fees from ₹4,999\nनमस्ते 😀 \"quoted\" 'single'\nhttps://example.org/a?b=1&c=2#top+plus%20pct\n\nRegards,";
  const z = M.zohoComposeLink({ to: "dr.mehta@example.org", subject: SUBJ, body: BODY });
  check(Boolean(z) && z.href.startsWith(ZBASE) && z.withBody === true, `the Zoho link opens Zoho India's compose page, with the body (${z?.href.slice(0, 60)})`);
  const u = z ? new URL(z.href) : null;
  check(Boolean(u) && JSON.stringify([...u.searchParams.keys()]) === '["ct"]', "the Zoho link has exactly one parameter, ct");
  check(Boolean(z) && !z.href.includes("+"), "no \"+\" in the href: no value can read as a space");
  const ct = ctOf(z);
  check(ct.startsWith("mailto:dr.mehta@example.org?subject="), `ct, decoded once, is the mailto: of the address (${ct.slice(0, 60)})`);
  const parsed = zohoParse(ct);
  check(parsed.to === "dr.mehta@example.org" && parsed.subject === SUBJ && parsed.body === BODY, `Zoho's mailto rules read back the exact address, subject and body (${JSON.stringify(parsed).slice(0, 120)})`);
  check(Boolean(z) && z.href === ZBASE + encodeURIComponent(M.mailtoUrl({ to: "dr.mehta@example.org", subject: SUBJ, body: BODY })),
    "the same href Chrome's handler would build from the CRM's own mailto: link");
  for (const to of ["dr.mehta+clinic@example.org", "o'brien@example.org"]) {
    const zz = M.zohoComposeLink({ to, subject: "S", body: "B" });
    const mt = ctOf(zz);
    check(mt.startsWith(`mailto:${to}?`) && zohoParse(mt).to === to, `${to}: the address goes raw inside the mailto (not %2B or %27), as Zoho reads it (${mt.slice(0, 50)})`);
  }
  for (const to of UNSAFE) {
    check(M.zohoComposeLink({ to, subject: "S", body: "B" }) === null && M.safeMailAddress(to) === "", `the unsafe address ${JSON.stringify(to)} gets no Zoho link (null), and safeMailAddress gives ""`);
  }
  const lz = M.zohoComposeLink({ to: "dr.mehta@example.org", subject: "Long", body: "क".repeat(3000) });
  const lmt = ctOf(lz);
  check(Boolean(lz) && lz.withBody === false && lz.href.length <= M.ZOHO_LINK_SAFE_LENGTH && lmt === "mailto:dr.mehta@example.org?subject=Long" && !/body=/.test(lmt),
    `a 3,000-character Devanagari e-mail: the link carries the address and the subject only, at most 5,500 characters (${lz?.href.length})`);
  let lone = null;
  let threw = false;
  try {
    lone = M.zohoComposeLink({ to: "dr.mehta@example.org", subject: "S", body: "a\uD83Db" });
  } catch {
    threw = true;
  }
  check(!threw && zohoParse(ctOf(lone)).body === "a\uFFFDb", "a lone surrogate (half an emoji) does not throw, and reads back as U+FFFD");
  for (const [setting, want] of [
    ["", "https://mail.zoho.in"], [null, "https://mail.zoho.in"], ["mail.zoho.com", "https://mail.zoho.com"], ["https://mail.zoho.in/zm/", "https://mail.zoho.in"],
    ["http://mail.zoho.eu", "https://mail.zoho.eu"], ["MAIL.ZOHO.IN", "https://mail.zoho.in"], ["https://mail.zoho.com.au", "https://mail.zoho.com.au"],
    ["https://evil.example", ""], ["https://mail.zoho.in.evil.com", ""], ["https://user@mail.zoho.in", ""], ["javascript:alert(1)", ""], ["https://zoho.in", ""],
  ]) {
    check(M.zohoMailOrigin(setting) === want, `zohoMailOrigin(${JSON.stringify(setting)}) is ${JSON.stringify(want)} (got ${JSON.stringify(M.zohoMailOrigin(setting))})`);
  }
  check(Boolean(M.zohoComposeLink({ to: "dr.mehta@example.org", subject: "S", body: "B" }, "https://evil.example")?.href.startsWith(ZBASE)), "a setting that is not Zoho Mail still opens mail.zoho.in, never another host");
  check(Boolean(M.zohoComposeLink({ to: "dr.mehta@example.org", subject: "S", body: "B" }, "mail.zoho.com")?.href.startsWith("https://mail.zoho.com/zm/comp.do?ct=")), "a Zoho data centre typed in Settings is used");
}

/* ── 23. sendVariant: which version goes ─────────────────────────────────── */

{
  const id = (t) => t?.id;
  const fBase = real.getTemplate("em_first_new_dental_en");
  check(id(M.sendVariant(fBase, { withLink: true, linkWent: false })) === "em_first_new_dental_en_link", "sendVariant: a first made base With link gives its twin");
  check(id(M.sendVariant(fBase, { withLink: false, linkWent: true })) === "em_first_new_dental_en", "sendVariant: Without link gives the base (a first message never reads linkWent)");
  for (const tid of ["em_first_new_dental_en_offer", "wa_first_pitch_any_en", "wa_after_reply_dental_en", "em_proposal_dental_en"]) {
    const b = real.getTemplate(tid);
    check(id(M.sendVariant(b, { withLink: true, linkWent: true })) === tid && id(M.sendVariant(b, { withLink: false, linkWent: false })) === tid, `sendVariant: ${tid} is itself either way`);
  }
  check(id(M.sendVariant(real.getTemplate("em_fu1_dental_en"), { withLink: false, linkWent: true })) === "em_fu1_dental_en_after_link" &&
    id(M.sendVariant(real.getTemplate("em_fu1_dental_en"), { withLink: true, linkWent: false })) === "em_fu1_dental_en",
  "sendVariant: a made follow-up after a first message with the link is the follow-up for after the link, else itself");
  check(id(M.sendVariant(real.getTemplate("wa_fu1_dental_hinglish"), { withLink: false, linkWent: true })) === "wa_fu1_dental_hinglish_after_link", "sendVariant: the same on WhatsApp");
  check(id(M.sendVariant(real.getTemplate("em_fu1_dental_en_offer"), { withLink: true, linkWent: true })) === "em_fu1_dental_en_offer", "sendVariant: an offer follow-up is itself");
}

/* ── 24, 25. The lead's history: where the link went, and whether the last one went cold ── */

{
  const ev = (o = {}) => ({ leadId: "L1", type: "sent", channel: "email", templateId: "em_first_new_dental_en_link", at: "2026-10-01T05:00:00.000Z", ...o });
  check(M.linkWentOn("L1", "email", [ev()]) === true, "linkWentOn: a first e-mail with the link counts on e-mail");
  check(M.linkWentOn("L1", "whatsapp", [ev()]) === false, "linkWentOn: and not on WhatsApp");
  check(M.linkWentOn("L1", "whatsapp", [ev({ channel: "whatsapp", templateId: "wa_first_new_dental_hinglish_link" })]) === true, "linkWentOn: a WhatsApp twin counts on WhatsApp");
  check(!M.linkWentOn("L1", "email", [ev({ templateId: "em_first_new_dental_en" })]) && !M.linkWentOn("L1", "email", [ev({ templateId: "em_nope_link" })]) &&
    !M.linkWentOn("L1", "email", [ev({ type: "note" })]) && !M.linkWentOn("L1", "email", [ev({ leadId: "L2" })]) && !M.linkWentOn("L1", "email", []),
  "linkWentOn: a base id, an unknown id, a line that is not a send, another lead's send, nothing: no");
  check(M.linkWentCold("L1", [ev()]) === true, "linkWentCold: the last link went in a first message");
  check(M.linkWentCold("L1", [ev(), ev({ templateId: "em_after_reply_dental_en", at: "2026-10-03T05:00:00.000Z" })]) === false, "linkWentCold: a later link after a yes: not cold");
  check(M.linkWentCold("L1", [ev({ templateId: "em_after_reply_dental_en", at: "2026-09-20T05:00:00.000Z" }), ev()]) === true, "linkWentCold: a cold link after an older after-yes link: cold");
  check(M.linkWentCold("L1", [ev(), ev({ templateId: "em_fu1_dental_en_after_link", at: "2026-10-05T05:00:00.000Z" })]) === true, "linkWentCold: a follow-up after the link carries none, so the last link is still the cold one");
  check(M.linkWentCold("L1", []) === false && M.linkWentCold("L1", [ev({ templateId: "em_first_new_dental_en" })]) === false && M.linkWentCold("L2", [ev()]) === false, "linkWentCold: no link sent to this lead: no");
}

/* ── 26. demoReach: will the link open? ──────────────────────────────────── */

{
  const NOWD = new Date("2026-10-02T10:00:00.000Z");
  const dm = (o = {}) => ({ slug: "abc", status: "sent", ...o });
  const R = (o) => M.demoReach({ now: NOWD, lead: { demoSlug: "abc" }, ...o });
  const no = (state, reason) => ({ state, ok: false, needsPublish: false, reason });
  const LIVE = { state: "live", ok: true, needsPublish: false, reason: "" };
  const LOADING = no("loading", "Checking the demo...");
  const EXPIRED = no("expired", "This lead's demo expired on 2026-09-20. Change Expires on in Edit demo before you send its link.");
  const OWNER_DRAFT = { state: "draft", ok: true, needsPublish: true, reason: "" };
  // Since the merge with the CRM team (3 Oct 2026): their step 1 has Turn on the link, so the reason is the team's own words.
  const MEMBER_DRAFT = no("draft", "The demo's link is off, so it shows a 404. Tap Turn on the link in step 1 first.");
  check(M.MEMBER_DRAFT_REASON === MEMBER_DRAFT.reason, "demoReach: a team member's draft reason is the CRM team's own line (Tap Turn on the link in step 1 first)");
  const same = (a, b) => Boolean(a) && ["state", "ok", "needsPublish", "reason"].every((k) => a[k] === b[k]);
  for (const [name, got, want] of [
    ["none", R({ lead: { demoSlug: "" }, demo: dm() }), no("none", "No demo yet: make one in step 1, then the message can carry its link.")],
    ["loading, with a record", R({ demo: dm(), loading: true }), LOADING],
    ["loading, with no record", R({ demo: undefined, loading: true }), LOADING],
    ["missing", R({ demo: undefined }), no("missing", "No demo on the website has this lead's link (/site/abc), so it would open a 404. Pick its demo or create one in step 1 (if the demos did not load, reload the page).")],
    ["mismatch", R({ demo: dm({ slug: "abc-new" }) }), no("mismatch", "This lead's link is /site/abc, but its demo is now at /site/abc-new: pick the demo again in step 1.")],
    ["the same link in capitals", R({ demo: dm({ slug: "ABC" }) }), LIVE],
    ["free", R({ demo: dm({ status: "free" }) }), no("free", "This lead's demo is a Free slot, an empty page. Build it and mark it sent in step 1, or pick another demo, before its link can go.")],
    ["closed", R({ demo: dm({ status: "closed" }) }), no("closed", "This lead's demo is closed. Open it again in Admin > Demo sites before you send its link.")],
    ["expired, sent", R({ demo: dm({ expiresAt: "2026-09-20" }) }), EXPIRED],
    ["expired, draft", R({ demo: dm({ status: "draft", expiresAt: "2026-09-20" }) }), EXPIRED],
    ["live", R({ demo: dm({ expiresAt: "2026-12-31" }) }), LIVE],
    ["live, from the legacy status", R({ demo: dm({ status: "live" }) }), LIVE],
    ["draft, Mehdi's send", R({ demo: dm({ status: "draft" }), canPublish: true }), OWNER_DRAFT],
    ["an unknown status, read as a draft", R({ demo: dm({ status: "weird" }), canPublish: true }), OWNER_DRAFT],
    ["draft, anyone else's send", R({ demo: dm({ status: "draft" }), canPublish: false }), MEMBER_DRAFT],
  ]) {
    check(same(got, want), `demoReach ${name}: ${JSON.stringify(want)} (got ${JSON.stringify(got)})`);
  }
  const LEAD_IN = "This follow-up points them to the link in your first message, and that link would not open now. ";
  check(real.pointBackReason(real.demoReach({ now: NOWD, lead: { demoSlug: "abc" }, demo: dm() })) === "" &&
    real.pointBackReason(LOADING) === "" && real.pointBackReason(no("none", "x")) === "", "pointBackReason: nothing to say for a live link, while loading, or with no demo");
  for (const [name, reach] of [
    ["closed", real.demoReach({ now: NOWD, lead: { demoSlug: "abc" }, demo: dm({ status: "closed" }) })],
    ["expired", real.demoReach({ now: NOWD, lead: { demoSlug: "abc" }, demo: dm({ expiresAt: "2026-09-20" }) })],
    ["missing", real.demoReach({ now: NOWD, lead: { demoSlug: "abc" }, demo: undefined })],
    ["a member's draft", real.demoReach({ now: NOWD, lead: { demoSlug: "abc" }, demo: dm({ status: "draft" }), canPublish: false })],
  ]) {
    check(real.pointBackReason(reach) === LEAD_IN + reach.reason && reach.reason.length > 0, `pointBackReason ${name}: the lead-in sentence, then the reason`);
  }
  check(real.pointBackReason(real.demoReach({ now: NOWD, lead: { demoSlug: "abc" }, demo: dm({ status: "draft" }), canPublish: true })) ===
    `${LEAD_IN}This lead's demo is a draft again, so the link they got shows a 404. Mark it sent in step 1.`, "pointBackReason: Mehdi's own draft says it is a draft again");
}

/* ── 27. May the link go to someone who has not replied yet? ─────────────── */

{
  const TOPPERS = "This demo still shows the template's results and toppers. Take them off in Edit demo first: a real institute's name must never sit next to toppers it did not give us.";
  const coach = {
    id: "ds_example", kind: "coaching", slug: "example-classes", status: "draft", templateId: "c2-rural-tuition", instituteName: "Example Classes",
    results: [{ name: "A. Student", exam: "NEET", score: "650" }], stats: [{ label: "Selections", value: "120" }],
  };
  coach.sample = { prints: { results: M.samplePrint(coach, "results") } };
  check(M.sampleToppersReason(coach) === TOPPERS, "sampleToppersReason: a coaching demo still showing the template's results and toppers");
  check(M.sampleToppersReason({ ...coach, sample: { ...coach.sample, real: true } }) === "", "sampleToppersReason: not once its results are marked as the institute's real ones");
  check(M.sampleToppersReason({ ...coach, results: [{ name: "Their own topper", exam: "NEET", score: "640" }] }) === "", "sampleToppersReason: not once the results are edited");
  check(M.sampleToppersReason({ ...coach, kind: "school" }) === "" && M.sampleToppersReason(undefined) === "", "sampleToppersReason: never for a school, or with no demo");
  check(M.coldLinkReason({ ...coach, sample: undefined, isExample: true }) === "This lead's link is one of the site's example demos, not a sample made in their name: make their own in step 1.",
    "coldLinkReason: an example demo");
  const prov = { kind: "school", slug: "draft-s1-urban-cbse", templateId: "s1-urban-cbse", status: "draft", instituteName: "Example Public School" };
  check(M.coldLinkReason(prov) === "This demo is still on its provisional link (/site/draft-s1-urban-cbse), which WhatsApp's card shows instead of their name. Type their name in Edit demo, which moves a draft's link to their name, then pick the demo again in step 1.",
    "coldLinkReason: a draft on its provisional draft-<template> link, with what to do");
  check(M.coldLinkReason({ ...prov, slug: "draft-s1-urban-cbse-2", status: "sent" }) === "This demo is still on its provisional link (/site/draft-s1-urban-cbse-2), which WhatsApp's card shows instead of their name.",
    "coldLinkReason: a sent demo on a provisional link, never told to retype its name (its link stays)");
  check(M.coldLinkReason(coach) === TOPPERS && M.coldLinkReason({ kind: "school", slug: "example-public-school", status: "sent", templateId: "s1-urban-cbse" }) === "" && M.coldLinkReason(undefined) === "",
    "coldLinkReason: otherwise the toppers rule, and nothing for a demo made in their name");
}

/* ── 28. Their link in a text, by its path ───────────────────────────────── */

{
  const abc = { demoSlug: "abc" };
  // Wrapped or followed by a fragment, a quote or WhatsApp's bold/italic/strike marks, it is still their link (review, 3 Oct 2026).
  for (const s of ["https://www.ideovent.in/site/abc", "see www.ideovent.in/site/abc.", "ideovent.vercel.app/site/abc/admissions", "Link: https://www.ideovent.in/site/ABC\nthanks",
    "*https://www.ideovent.in/site/abc*", "_https://www.ideovent.in/site/abc_", "~https://www.ideovent.in/site/abc~", "https://www.ideovent.in/site/abc#contact",
    "\"https://www.ideovent.in/site/abc\"", "'https://www.ideovent.in/site/abc'", "<https://www.ideovent.in/site/abc>", "“https://www.ideovent.in/site/abc”"]) {
    check(M.carriesDemoLink(s, abc), `carriesDemoLink: ${JSON.stringify(s)} carries /site/abc`);
  }
  for (const s of ["https://www.ideovent.in/site/abc-2", "https://www.ideovent.in/site/abcd", "no link at all"]) {
    check(!M.carriesDemoLink(s, abc), `carriesDemoLink: ${JSON.stringify(s)} is not /site/abc`);
  }
  check(!M.carriesDemoLink("https://www.ideovent.in/site/abc", { demoSlug: "" }) && !M.carriesDemoLink("https://www.ideovent.in/site/abc", {}), "carriesDemoLink: a lead with no demo carries none");
  check(JSON.stringify(M.foreignDemoSlugs("a https://www.ideovent.in/site/abc b https://www.ideovent.in/site/abc-2 c /site/ABC-2 d /site/abc/x", abc)) === '["abc-2"]',
    "foreignDemoSlugs: another demo's link once, never the lead's own");
  check(M.offersLink(real.getTemplate("em_first_new_dental_en")) && M.offersLink(real.getTemplate("wa_first_new_dental_en")) && M.offersLink(real.getTemplate("wa_fu1_dental_en")) &&
    !M.offersLink(real.getTemplate("em_first_new_dental_en_link")) && !M.offersLink(real.getTemplate("em_fu1_dental_en_after_link")) &&
    !M.offersLink(real.getTemplate("wa_after_reply_dental_en")) && !M.offersLink(real.getTemplate("em_first_new_dental_en_offer")),
  "offersLink: the made first messages and follow-ups offer the link; the twins, the link after a yes and the offer twins do not");
  check(M.demoNamedFor({ instituteName: "Example Dental Clinic" }, { instituteName: "Example Dental Clinic, Saket" }) &&
    M.demoNamedFor({ instituteName: "EXAMPLE dental-clinic" }, { instituteName: "Example Dental Clinic" }) &&
    !M.demoNamedFor({ instituteName: "Another Smile Clinic" }, { instituteName: "Example Dental Clinic" }) && M.demoNamedFor({ instituteName: "" }, { instituteName: "X" }),
  "demoNamedFor: the demo carries the lead's name (letters and digits, one in the other), and another clinic's does not");
  check(M.linkHint("email", false) === "With link, they can open their sample from this first e-mail. E-mail always starts With link." &&
    /reported more often/.test(M.linkHint("whatsapp", true)) && /in place of the picture/.test(M.linkHint("whatsapp", true)) &&
    !/picture/.test(M.linkHint("whatsapp", false)) && /sent last in this browser/.test(M.linkHint("whatsapp", false)),
  "linkHint: e-mail starts With link; WhatsApp names the risk and that it starts on the version sent last in this browser");
  check(M.TEAM_LINK_REASON === "With link is for Mehdi's own messages until the team's wording for it is approved.", "TEAM_LINK_REASON, word for word");
}

/* ── 29. The compose screen's wiring, read from the source ───────────────── */

{
  const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/\r\n/g, "\n");
  const panel = read("admin/outreach/ComposePanel.tsx");
  const zi = panel.indexOf('"open-zoho"');
  const mi = panel.indexOf('"open-mailto"');
  const ci = panel.indexOf('data-testid="copy-email"');
  check(zi > 0 && zi < mi && mi < ci, "ComposePanel: Open in Zoho Mail comes first, then Open in mail app, then Copy e-mail text");
  check(panel.includes('zohoComposeLink({ to: lead.email || "", subject, body }, settings.zohoMailUrl)'), "ComposePanel: the Zoho link is built from the lead's address and the text on screen, at the Zoho address in Settings");
  const pto = (panel.match(/const publishThenOpen = async[\s\S]*?\n {2}\};\n/) || [""])[0];
  const at = (s) => pto.indexOf(s);
  check(Boolean(pto) && at('window.open("about:blank", "_blank")') > 0 && at("await demoLink.publish()") > at('window.open("about:blank", "_blank")') &&
    at("await demoLink.publish()") < at("tab.location.replace(href)") && at("await demoLink.publish()") < at("recordSend(how)"),
  "publishThenOpen: the blank tab opens inside the click, the demo goes on the website, and only then is the tab navigated and the send recorded");
  check(/const linkOff = !hasLinkTwin \? ""\s*: team \? TEAM_LINK_REASON\s*: !demoLink\.reach\.ok \? demoLink\.reach\.reason\s*: !demoLink\.owner \? TEAM_LINK_REASON\s*: coldWhy;/.test(panel),
    "linkOff: a team sender (me loaded, not Mehdi) reads the team line; else the reach reason, then the team line, then the cold-link reason");
  // The CRM team (3 Oct 2026): the version that goes passes the team's wording, like the list it was picked from.
  check(/const variant = picked \? sendVariant\(picked, \{ withLink: hasLinkTwin && linkChoice === "with", linkWent \}\) : undefined;/.test(panel) &&
    panel.includes("const template = variant && offer && variant !== picked ? offer(variant) ?? picked : variant;"),
  "the twin that goes passes the team's offer (memberVersion) for anyone but Mehdi, and falls back to the base, never to Mehdi's words");
  check(panel.includes("const linkWent = team ? linkWentOn(lead.id, channel, events.filter((e) => e.actorId === me.memberId)) : linkWentHere;") &&
    /else if \(template && offersLink\(template\) && linkWentHere && !linkWent\) \{/.test(panel),
  "anyone but Mehdi gets the follow-up for after the link only after their own first message with it (their own thread), and a link that went from Mehdi there is a warning");
  check(panel.includes('(template?.link === "demo" || needsPublish ? blockers : warnings).push(coldWhy)'), "the cold-link reason blocks the twin and any send that would publish the demo, and only warns on a demo already live");
  check(/if \(foreign\.length\) warnings\.push\(/.test(panel), "another demo's link is a warning, not a blocker");
  check(/if \(needsPublish\) \{\s*e\.preventDefault\(\);\s*void publishThenOpen\(href, how\);/.test(panel), "a send that carries a draft demo's link goes through publishThenOpen");
  // Review, 3 Oct 2026: no tab (pop-ups blocked) writes nothing; Copy e-mail text publishes only what reached the
  // clipboard and turns the buttons off at the first tap; a demo in another name is never published by a send.
  check(at("if (!mail && !tab) {") > at('window.open("about:blank", "_blank")') && at("if (!mail && !tab) {") < at("await demoLink.publish()") &&
    /if \(!mail && !tab\) \{\s*setPublishMsg\([^\n]*\);\s*return;\s*\}/.test(pto), "publishThenOpen: when no tab opens, nothing is put on the website");
  const cm = (panel.match(/const copyMail = async[\s\S]*?\n {2}\};\n/) || [""])[0];
  check(Boolean(cm) && cm.indexOf("setPublishing(true)") > 0 && cm.indexOf("setPublishing(true)") < cm.indexOf("await copyToClipboard(") && /if \(ok\) await demoLink\.publish\(\);/.test(cm),
    "copyMail: the buttons go off before the clipboard write, and only copied text puts the demo on the website");
  check(/if \(needsPublish\) blockers\.push\(`\$\{named\} /.test(panel) && /else warnings\.push\(named\);/.test(panel), "a demo in another name blocks a send that would publish it, and only warns on a demo already live");
  check(/return blocked \|\| !href \|\| publishing \?/.test(panel) && /disabled=\{blocked \|\| publishing\}/.test(panel), "every send button is off while blocked or while the demo is being put on the website");
  // Merged (3 Oct 2026) with sec-rows-2026-10-02 and crm-meta-2026-10-02: these lines were left alone for those merges;
  // now the templates import is still one line, and the panel's demo comes from sec-rows' hook, as useDemoLink's does.
  const lines = panel.split("\n");
  check(lines.filter((l) => l === 'import { LANGUAGE_LABELS, carriesPreview, fieldsUsed, stageLabel, type TemplateChannel } from "@/lib/outreach/templates";').length === 1,
    "ComposePanel's templates import line is as it was (merged with the other branches' import lines)");
  check(panel.split("  const sites = useLeadDemoSites();\n  const demo = leadDemo(lead, sites);").length === 2 && !panel.includes("data.demoSites"),
    "ComposePanel's own demo is read through useLeadDemoSites() (sec-rows, 0013), never the CMS list directly");
  const hook = read("admin/outreach/useDemoLink.ts");
  check(!/publishLeadDemo/.test(hook) && /return \{ demo, reach, owner, publish \};/.test(hook) && /canPublish: owner/.test(hook) && /if \(!owner \|\| !demo \|\| !reach\.ok \|\| !reach\.needsPublish\) return;/.test(hook),
    "useDemoLink: returns owner, publishes only on Mehdi's send, never calls publishLeadDemo");
  check(/const sites = useLeadDemoSites\(\);/.test(hook) && !/teamDemos/.test(hook) && !/data\.demoSites/.test(hook),
    "useDemoLink: its demo records are useLeadDemoSites()'s (the CMS's plus a team member's crm_lead_demos), the same as ComposePanel's");
  const sw = read("admin/outreach/LinkChoice.tsx");
  check(["link-choice", "link-choice-without", "link-choice-with", "link-choice-hint", "link-choice-reason"].every((tid) => sw.includes(`data-testid="${tid}"`)) && sw.includes('"ideovent_crm_wa_first_link"'),
    "LinkChoice: its test ids and the storage key of the remembered WhatsApp version");
  check(/if \(lead\.status !== "contacted" \|\| linkWentCold\(lead\.id, events\)\) return;/.test(read("admin/outreach/useOutreach.tsx")), "useOutreach: an open after a cold link does not move the lead to Demo opened");
  for (const f of ["lib/outreach/mailLinks.ts", "lib/outreach/linkChoice.ts", "admin/outreach/useDemoLink.ts", "admin/outreach/LinkChoice.tsx"]) {
    check(!DASH.test(read(f)), `${f}: no em or en dash`);
  }
}

/* ── 30. {offer} is true of the demo that goes (review, 3 Oct 2026) ──────── */

{
  const NOW30 = new Date("2026-10-05T06:30:00.000Z");
  const offer = (kind, language, demo) => M.offerFor({ kind, pitch: "fix_website", language, now: NOW30, demo });
  // The demo exactly as step 1 makes it from each template (fromTemplate), so the facts are the record's own.
  const made = async (id, name) => M.fromTemplate(await M.loadTemplate(id), { sites: [], pitchPages: [] }, { name });
  for (const id of ["c1-jee-neet-urban", "c2-rural-tuition", "c3-science", "c4-foundation", "c5-government-jobs"]) {
    const facts = M.demoFacts(await made(id, "Example Classes"));
    const hl = offer("coaching", "hinglish", facts);
    const en = offer("coaching", "en", facts);
    if (id.startsWith("c1-")) {
      check(facts?.unpricedCourse === true && hl.includes("• Fees ki saaf jaankari") && !hl.includes("Har course ki fees saaf likhi") && en.includes("• Clear fee details") && !/Every course's fees/.test(en),
        `${id}: a course shows no fee (the one-year Class 12 batch), so the offer says clear fee details, never every course's fees (${hl.replace(/\n/g, " / ")})`);
    } else {
      check(facts?.unpricedCourse === false && hl.includes("• Har course ki fees saaf likhi") && en.includes("• Every course's fees, clearly written"),
        `${id}: every course shows a fee, so the approved words stay (${hl.replace(/\n/g, " / ")})`);
    }
  }
  // The record wins over the template: c1 with the fee filled in, or another template with one taken out.
  check(offer("coaching", "hinglish", { templateId: "c1-jee-neet-urban", unpricedCourse: false }).includes("Har course ki fees saaf likhi") &&
    offer("coaching", "hinglish", { templateId: "c3-science", unpricedCourse: true }).includes("Fees ki saaf jaankari") &&
    offer("coaching", "hinglish", { templateId: "c1-jee-neet-urban" }).includes("Fees ki saaf jaankari") && offer("coaching", "hinglish", undefined).includes("Har course ki fees saaf likhi"),
  "the fee words follow the record's courses when it has them, else the template (c1 has a course with no fee), else the approved words");
  check(M.demoFacts({ courses: [{ fee: "45,000" }, { fee: "", detail: "₹9,500 for all 22 tests." }, { fee: "", detail: "Rs. 1,200 for all 24 mocks" }] })?.unpricedCourse === false &&
    M.demoFacts({ courses: [{ fee: "On request" }] })?.unpricedCourse === true && M.demoFacts({ courses: [] })?.unpricedCourse === undefined && !("unpricedCourse" in (M.demoFacts({ templateId: "c2-rural-tuition" }) || {})),
  "demoFacts: a fee is an amount in the fee or in the detail; 'On request' is not one; no courses, no answer");
  for (const id of ["d1-family-dentist", "d2-multispeciality", "d3-smile-studio", "d7-dental-chain"]) {
    const facts = M.demoFacts(await made(id, "Example Dental Clinic"));
    const hl = offer("dental", "hinglish", facts);
    const en = offer("dental", "en", facts);
    check(id.startsWith("d3-")
      ? hl.includes("• Timings aur treatments ek jagah") && en.includes("• Timings and treatments in one place") && !/pehli screen|first screen/.test(hl + en)
      : hl.includes("• Timings aur treatments pehli screen par") && en.includes("• Timings and treatments on the first screen"),
    `${id}: ${id.startsWith("d3-") ? "its first screen shows the treatments, not the timings, so they are in one place" : "its first screen shows the timings, so the approved words stay"} (${hl.replace(/\n/g, " / ")})`);
  }
  // In the message that goes: the c1 twin with the link says clear fee details.
  const c1 = M.demoFacts(await made("c1-jee-neet-urban", "Example Classes"));
  const twin = M.render(real.getTemplate("wa_first_fix_coaching_hinglish_link"), leadOf("coaching", { website: "https://example.org", observation: "no_batch_fees" }), { now: NOW30, demo: c1 });
  check(twin.body.includes("• Fees ki saaf jaankari\n") && !twin.body.includes("Har course ki fees saaf likhi"), "the c1 demo's first WhatsApp with its link offers clear fee details");
}

/* ── 31. A site that would not open at all is their site (review, 3 Oct 2026) ── */

{
  const NOW31 = new Date("2026-10-05T06:30:00.000Z");
  const so = M.getObservation("site_down");
  check(so?.type === "site" && so.en === "It would not load at all." && so.hinglish === "Wo khul nahi rahi." && !so.kinds &&
    M.observationsFor("school").includes(so) && M.observationsFor("dental").includes(so) && M.observationsFor("coaching").includes(so),
  "site_down: a site that would not open at all, offered for every kind");
  const LEAD_IN = /^Your website did not open (properly )?when I tried it:? ?/;
  const DOWN = [
    "Your website did not open when I tried it.",
    "Your website did not open properly when I tried it: the page is missing (404 Not Found).",
    "Your website did not open properly when I tried it: the site shows a server error (HTTP 503).",
    "Your website did not open properly when I tried it: the site refuses visitors (HTTP 403).",
    "Your website did not open properly when I tried it: the site did not answer within 10 seconds.",
    "Your website did not open properly when I tried it: the domain dead-e2e.example.org does not resolve: it may have expired.",
    "Your website did not open properly when I tried it: the domain dead-e2e.example.org does not resolve (ENOTFOUND): it may have expired.",
    "Your website did not open properly when I tried it: the site's security certificate is invalid, so browsers show a warning.",
    "Your website did not open properly when I tried it: the site could not be reached (ECONNREFUSED).",
    "Your website did not open properly when I tried it: the site redirects in a loop.",
    "Your website did not open properly when I tried it: the site redirects to an address that is not a public website.",
    "Your website did not open properly when I tried it: that address is not a public website.",
  ];
  for (const s of DOWN) {
    check(M.observationText(s, "hinglish") === "Wo khul nahi rahi." && M.observationText(s, "en") === "It would not load at all." && M.problemType(s) === "site",
      `the Lead Finder's "${s.replace(LEAD_IN, "") || "did not open"}" reads as site_down, in the message's language`);
  }
  const OPENS = [
    "Your website did not open properly when I tried it: the domain redirects to a domain-parking or domain-sale page.",
    "Your website did not open properly when I tried it: the domain is parked or up for sale.",
    "Your website did not open properly when I tried it: only an 'under construction' or 'coming soon' page is showing.",
    "Your website did not open properly when I tried it: the home page is blank.",
    "Your website did not open properly when I tried it: the website address is not a valid web address.",
  ];
  for (const s of OPENS) {
    check(M.observationText(s, "hinglish") === s, `a page that opens (parked, blank, coming soon), or no web address, is not site_down: "${s.replace(LEAD_IN, "")}"`);
  }
  // A lead the Lead Finder filed as "no website" before 3 Oct 2026, with its address and that sentence.
  const finder = leadOf("dental", { pitch: "new_website", website: "https://dead-e2e.example.org/", observation: DOWN[1] });
  check(M.effectivePitch(finder) === "fix_website" && M.effectivePitch({ ...finder, website: "" }) === "new_website" &&
    M.effectivePitch({ ...finder, observation: "no_website" }) === "new_website" && M.effectivePitch({ ...finder, observation: OPENS[1] }) === "new_website" &&
    M.effectivePitch({ pitch: "new_website", website: "https://dead-e2e.example.org/", observation: "site_down" }) === "fix_website" &&
    M.effectivePitch({ website: "https://example.org" }) === "fix_website" && M.effectivePitch({}) === "new_website",
  "effectivePitch: a lead with a website that would not open is about their site; without the address, or with any other observation, its own pitch stands");
  const noSite = M.checkSend(finder, real.getTemplate("wa_first_new_dental_hinglish"), "whatsapp", SETTINGS, 0, NOW31);
  check(noSite.blockers.some((b) => /no website of their own, and this lead has one/.test(b)), "the message that says they have no website of their own is blocked for such a lead");
  const theirs = M.checkSend(finder, real.getTemplate("wa_first_fix_dental_hinglish"), "whatsapp", SETTINGS, 0, NOW31);
  check(theirs.ok && !theirs.warnings.some((w) => /marked as having none/.test(w)), `the message about their site goes, with no "marked as having none" warning (${theirs.blockers.join(" | ")})`);
  check(M.checkSend(leadOf("dental", { pitch: "new_website" }), real.getTemplate("wa_first_fix_dental_hinglish"), "whatsapp", SETTINGS, 0, NOW31).warnings.some((w) => /marked as having none/.test(w)),
    "a lead marked as having no website, with no dead address, still gets that warning on a their-site message");
  const hl = M.render(real.getTemplate("wa_first_fix_dental_hinglish"), finder, { now: NOW31, observation: finder.observation }).body;
  check(hl.includes("Aapke clinic ki website phone par kholi. Wo khul nahi rahi.\n\nZyaadatar patient phone se hi dekhte hain. Site na khule to"),
    `such a lead's message says in Hinglish that the site would not open, then the impact of a site that does not open (${hl.slice(0, 260)})`);
  const en = M.render(real.getTemplate("em_first_fix_dental_en_link"), { ...finder, pitch: "fix_website", observation: "site_down" }, { now: NOW31 }).body;
  check(en.includes("I opened your clinic's website on my phone, the way a new patient would. It would not load at all.\n\n"), `and in English: It would not load at all. (${en.slice(0, 200)})`);
  check(["Wo khuli hi nahi, us address par koi site nahi hai.", "Site khulti hi nahi.", "Wo khul hi nahi rahi."].every((s) => M.problemType(s) === "site") &&
    M.problemType("NEET batch ki timing aur fees kahin nahi mili.") === "info",
  "problemType: 'khuli hi nahi' and 'khulti hi nahi' read as a site that does not open; a missing detail still reads as info");

  // The Lead Finder (leads.ts), bundled on its own: it reaches cms/config.ts, which reads Vite's import.meta.env.
  const leadsOut = join(tmpdir(), `ideovent-test-outreach-send-links-leads-${process.pid}.mjs`);
  const lb = await build({
    stdin: { contents: `export { siteDown, pitchForAudit, observationFor, leadFromPlace } from "@/lib/leadFinder/leads";`, resolveDir: ROOT, loader: "ts" },
    bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent", plugins: [aliasAndRaw], define: { "import.meta.env": "{}" },
  });
  writeFileSync(leadsOut, lb.outputFiles[0].text);
  const LF = await import(pathToFileURL(leadsOut).href);
  rmSync(leadsOut, { force: true });
  const audit = (verdict, code, text = "x", over = {}) => ({ verdict, url: "https://dead-e2e.example.org/", finalUrl: "https://dead-e2e.example.org/", status: null, ms: null,
    title: null, evidence: code ? [{ code, text }] : [], phones: [], emails: [], ...over });
  for (const code of ["http_404", "http_500", "http_403", "timeout", "dns", "tls", "unreachable", "blocked"]) {
    const a = audit("broken", code);
    check(LF.siteDown(a) && LF.pitchForAudit(a) === "fix_website" && LF.observationFor(a, "dental") === "site_down" && LF.observationFor(a, "school") === "site_down",
      `Lead Finder: a site that would not open (${code}) is their site, with site_down`);
  }
  for (const code of ["parked", "placeholder", "empty", "bad_url"]) {
    const a = audit("broken", code, "The domain is parked or up for sale");
    check(!LF.siteDown(a) && LF.pitchForAudit(a) === "new_website" && /^Your website did not open properly when I tried it: /.test(LF.observationFor(a, "school") || ""),
      `Lead Finder: a page that opens (${code}), or no web address, still counts as no website of their own`);
  }
  check(LF.pitchForAudit(audit("none", "no_website")) === "new_website" && LF.pitchForAudit(audit("poor", "slow")) === "fix_website" &&
    LF.pitchForAudit(audit("ok", "")) === undefined && LF.pitchForAudit(undefined) === undefined && !LF.siteDown(audit("poor", "http_404")),
  "Lead Finder: none, poor and ok keep their pitch; only a broken verdict can be a site that would not open");
  const place = { placeId: "ChIJ_dead_e2e", name: "Example Dead Site Dental Clinic", address: null, phone: null, phoneIntl: null, website: "https://dead-e2e.example.org/",
    rating: null, ratingCount: null, mapsUrl: null, businessStatus: null };
  const added = LF.leadFromPlace(place, { city: "Saket, New Delhi", kind: "dental", audit: audit("broken", "http_404", "The page is missing (404 Not Found)", { status: 404 }) });
  check(added.pitch === "fix_website" && added.observation === "site_down" && added.website === "https://dead-e2e.example.org/" && /Website check \(broken\): The page is missing/.test(added.notes || ""),
    `Lead Finder: the lead it adds for a 404 is about their site, keeps the address, and its notes keep the check's own words (${JSON.stringify({ pitch: added.pitch, observation: added.observation, website: added.website })})`);
}

/* ── 32. The links cannot break (review, 3 Oct 2026) ─────────────────────── */

{
  const NOW32 = new Date("2026-10-05T06:30:00.000Z");
  let threw = "";
  try {
    const m = M.mailtoUrl({ to: "office@example.org", subject: "Sub\uD83D", body: "a\uDC00b" });
    const w = M.whatsappUrl("+919876543210", "x\uD83Dy");
    const ww = M.whatsappWebUrl("+919876543210", "x\uDE00");
    check(m.includes("subject=Sub%EF%BF%BD") && m.includes("body=a%EF%BF%BDb") && w.endsWith("text=x%EF%BF%BDy") && ww.endsWith("text=x%EF%BF%BD"),
      "mailtoUrl and the WhatsApp links turn a lone surrogate (half an emoji) into U+FFFD");
  } catch (e) {
    threw = String(e);
  }
  check(!threw, `mailtoUrl and the WhatsApp links never throw on a lone surrogate (${threw || "none thrown"})`);
  const BODY = "Line one\n\n• ₹4,999 नमस्ते 😀 \"q\" https://x.example.org/?a=1&b=2#c+d%";
  check(M.mailtoUrl({ to: "a@example.org", subject: "S", body: BODY }) === `mailto:a@example.org?subject=S&body=${encodeURIComponent(BODY)}` &&
    M.whatsappUrl("+919876543210", BODY) === `https://wa.me/919876543210?text=${encodeURIComponent(BODY)}`,
  "well-formed text is encoded exactly as before");
  const em = real.getTemplate("em_first_new_dental_en");
  const lead = leadOf("dental");
  const r = M.render(em, lead, { now: NOW32 });
  const subjectBlock = (n) => M.checkSend(lead, em, "email", SETTINGS, 0, NOW32, { text: { subject: "S".repeat(n), body: r.body } }).blockers.find((b) => /^The subject is /.test(b)) || "";
  check(M.MAX_SUBJECT === 200 && subjectBlock(200) === "" && subjectBlock(201) === "The subject is 201 characters long. Keep it to one short line, at most 200 characters." &&
    subjectBlock(6000) === "The subject is 6000 characters long. Keep it to one short line, at most 200 characters.",
  "a subject past 200 characters blocks the e-mail (a 6,000-character one would make a 6,000-character Zoho link)");
  for (const s of ["see bit.ly/abc", "wa.me/919876543210", "goo.gl/maps/x", "maps.app.goo.gl/AbC", "t.co/x", "tinyurl.com/x", "youtu.be/x", "forms.gle/x", "cutt.ly/x"]) {
    check(M.containsLink(s), `containsLink: "${s}" is a link`);
  }
  for (const s of ["B.Ed/M.Ed teachers", "Ph.D/MDS", "Class 6/7/8", "Rs. 4,999/-", "t.co and bit.ly with no path", "is.gd"]) {
    check(!M.containsLink(s), `containsLink: "${s}" is not a link`);
  }
  const twin = real.getTemplate("wa_first_new_dental_hinglish_link");
  const tr = M.render(twin, leadOf("dental"), { now: NOW32 });
  check(M.checkSend(leadOf("dental"), twin, "whatsapp", SETTINGS, 0, NOW32, { text: { body: `${tr.body}\nbit.ly/abc` } }).blockers.some((b) => /only their sample's own link, once/.test(b)),
    "a short link typed into a first message with their sample's link blocks it");
  const base = real.getTemplate("wa_first_new_dental_hinglish");
  const br = M.render(base, leadOf("dental"), { now: NOW32 });
  check(M.checkSend(leadOf("dental"), base, "whatsapp", SETTINGS, 0, NOW32, { text: { body: `${br.body}\nwa.me/919876543210` } }).blockers.some((b) => /must not carry a link/.test(b)),
    "a wa.me link typed into a first message blocks it");
}

/* ── 33. The publish writes the demo as it is now (review, 3 Oct 2026) ───── */

{
  const hook = readFileSync(join(SRC, "admin/outreach/useDemoLink.ts"), "utf8").replace(/\r\n/g, "\n");
  const pub = (hook.match(/const publish = async[\s\S]*?\n {2}\};\n/) || [""])[0];
  const at = (s) => pub.indexOf(s);
  check(Boolean(pub) && at("await getStore().load()") > 0 && at("await getStore().load()") < at("await markDemoSent(") &&
    pub.includes("demoReach({ lead, demo: fresh, canPublish: true })") && at("coldLinkReason(fresh)") > 0 && at("demoNamedFor(fresh, lead)") > 0 &&
    /await markDemoSent\(actions\.saveDoc, fresh, freshSlots, /.test(pub) && !/markDemoSent\(actions\.saveDoc, demo,/.test(pub),
  "useDemoLink: the publish reads the demo again, checks it again, and writes that record, never this screen's older copy");
}

/* ── 34. Anyone but Mehdi: their words, and what they may turn on (integration, 3 Oct 2026) ── */

{
  const NOW34 = new Date("2026-10-02T10:00:00.000Z");
  const lead = { demoSlug: "abc", instituteName: "Example Public School" };
  const site = (o = {}) => ({ id: "d_abc", slug: "abc", status: "draft", kind: "school", templateId: "s1-urban-cbse", instituteName: "Example Public School", ...o });
  const why = (o) => M.teamTurnOnReason(o === null ? null : site(o), lead, NOW34);
  check(why({}) === "" && why({ status: "sent" }) === "" && why({ status: "closed" }) === "" && why(null) === "",
    "teamTurnOnReason: a draft made in their name may be turned on; a live or closed demo, or none, has nothing to turn on");
  check(why({ status: "free" }) === "This lead's demo is a Free slot, an empty page. Ask Mehdi to build it before its link goes on.", "teamTurnOnReason: a Free slot waits for Mehdi");
  check(why({ expiresAt: "2026-09-20" }) === "This lead's demo expired on 2026-09-20. Ask Mehdi to change its date before its link goes on.", "teamTurnOnReason: an expired draft waits for Mehdi");
  check(why({ isExample: true }) === "This lead's demo is one of the site's example demos, not a sample made in their name. Ask Mehdi to make theirs.",
    "teamTurnOnReason: an example demo waits for Mehdi");
  check(why({ slug: "draft-s1-urban-cbse" }) === "This demo is still on its provisional link (/site/draft-s1-urban-cbse), which WhatsApp's card shows instead of their name. Ask Mehdi to put their name on it.",
    "teamTurnOnReason: a provisional link waits for Mehdi");
  const coach = {
    id: "ds_example", kind: "coaching", slug: "abc", status: "draft", templateId: "c2-rural-tuition", instituteName: "Example Public School",
    results: [{ name: "A. Student", exam: "NEET", score: "650" }], stats: [{ label: "Selections", value: "120" }],
  };
  coach.sample = { prints: { results: M.samplePrint(coach, "results") } };
  const TOPPERS34 = "This demo still shows the template's results and toppers, and a real institute's name must never sit next to toppers it did not give us. Ask Mehdi to take them off.";
  check(M.teamTurnOnReason(coach, lead, NOW34) === TOPPERS34, "teamTurnOnReason: a coaching demo still showing the template's toppers waits for Mehdi");
  const OTHER = `This lead's demo is in the name of "Sunrise Convent", not Example Public School. Ask Mehdi to check it is theirs.`;
  check(why({ instituteName: "Sunrise Convent" }) === OTHER, "teamTurnOnReason: a demo in another name waits for Mehdi");
  check(M.teamColdLinkReason(coach) === TOPPERS34 && M.teamColdLinkReason({ ...coach, status: "sent" }) === TOPPERS34 &&
    M.teamColdLinkReason(site({ status: "sent", isExample: true })) === "This lead's demo is one of the site's example demos, not a sample made in their name. Ask Mehdi to make theirs." &&
    M.teamColdLinkReason(site()) === "" && M.teamColdLinkReason(undefined) === "",
  "teamColdLinkReason: the cold-link reasons in the team's words, on a live demo too (a warning there)");
  const fix = M.teamDemoFix(site({ status: "free" }), lead, NOW34);
  check(Boolean(fix) && `${fix.problem} ${fix.ask}` === real.teamTurnOnReason(site({ status: "free" }), lead, NOW34) && !/Ask Mehdi/.test(fix.problem) && /^Ask Mehdi/.test(fix.ask),
    "teamDemoFix: what is wrong and what to ask Mehdi, apart (Ask Mehdi's message starts from the first)");

  // teamReach: every state in the team's words, never one of Mehdi's own steps; state, ok and needsPublish as they were.
  const R = (o) => real.demoReach({ now: NOW34, lead, canPublish: false, ...o });
  const T = (reach, demo) => M.teamReach(reach, { lead, demo, now: NOW34 });
  const MEHDIS = /Edit demo|Admin > Demo sites|Mark sent|mark it sent|make one in step 1|create one in step 1|Pick its demo|pick the demo again|Build it/;
  const sent = site({ status: "sent", expiresAt: "2026-09-20" });
  for (const [name, reach, demo, want] of [
    ["none", real.demoReach({ now: NOW34, lead: { demoSlug: "" }, canPublish: false }), undefined, "No demo yet: ask Mehdi for one in step 1, then the message can carry its link."],
    ["missing", R({ demo: undefined }), undefined, "No demo on the website has this lead's link (/site/abc), so it would open a 404. Ask Mehdi to link its demo (if the demos did not load, reload the page)."],
    ["mismatch", R({ demo: site({ slug: "abc-new" }) }), site({ slug: "abc-new" }), "This lead's link is /site/abc, but its demo is now at /site/abc-new: ask Mehdi to link the demo again."],
    ["free", R({ demo: site({ status: "free" }) }), site({ status: "free" }), "This lead's demo is a Free slot, an empty page. Ask Mehdi to build it before its link goes on."],
    ["closed", R({ demo: site({ status: "closed" }) }), site({ status: "closed" }), "Mehdi closed this lead's demo: ask him before you send its link."],
    ["expired", R({ demo: sent }), sent, "This lead's demo expired on 2026-09-20. Ask Mehdi to change its date before you send its link."],
    ["a draft they may turn on", R({ demo: site() }), site(), "The demo's link is off, so it shows a 404. Tap Turn on the link in step 1 first."],
    ["a draft in another name", R({ demo: site({ instituteName: "Sunrise Convent" }) }), site({ instituteName: "Sunrise Convent" }), OTHER],
    ["a coaching draft with the toppers", R({ demo: coach }), coach, TOPPERS34],
  ]) {
    const got = T(reach, demo);
    check(got.reason === want && got.state === reach.state && got.ok === reach.ok && got.needsPublish === reach.needsPublish && !got.ok && !MEHDIS.test(got.reason),
      `teamReach ${name}: ${JSON.stringify(want)} (got ${JSON.stringify(got)})`);
  }
  const live = R({ demo: site({ status: "sent" }) });
  const loading = R({ demo: site(), loading: true });
  check(T(live, site({ status: "sent" })) === live && T(loading, site()) === loading, "teamReach: a live link and a check still loading are left as they are");
  const ownerDraft = real.demoReach({ now: NOW34, lead, demo: site(), canPublish: true });
  check(T(ownerDraft, site()) === ownerDraft, "teamReach: a draft Mehdi's own send may publish is left as it is");
  check(M.linkHint("email", false, true) === "Their own sample's link goes after a yes." && M.linkHint("whatsapp", true, true) === "Their own sample's link goes after a yes.",
    "linkHint for anyone but Mehdi: their own sample's link goes after a yes, never how the switch starts");
}

/* ── 35. The CRM team's screens, read from the source (integration, 3 Oct 2026) ── */

{
  const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/\r\n/g, "\n");
  const panel = read("admin/outreach/ComposePanel.tsx");
  check((panel.match(/<TemplateList items=\{(short|ranked|more)\} selected=\{template\} /g) || []).length === 2 && !/getTemplate\(selected\)/.test(panel) &&
    panel.includes("const base = selected?.twinOf ?? selected?.id;") && panel.includes("const twin = on && selected?.twinOf ? selected : undefined;"),
  "TemplateList: the checked row shows the version that goes as it goes (for the team, in their words), never read again by its id");
  check(panel.includes('linkHint(channel, Boolean(previewFor(template.kind !== "any" ? template.kind : lead.kind)), team)'), "the switch's hint is the team's line for anyone but Mehdi");
  check(panel.includes("const coldWhy = team ? teamColdLinkReason(demoLink.demo) : coldLinkReason(demoLink.demo);") &&
    panel.includes("if (carriesLink && coldWhy && !blockers.includes(coldWhy)) (template?.link"),
  "the cold-link reason is in the team's words for anyone but Mehdi, and said once when their draft's reach already blocks with it");
  check(/const notExample = team \? foreign\.find\(\(s\) => !sites\.some\(\(d\) => d\.isExample && /.test(panel) && /if \(notExample\) blockers\.push\(/.test(panel) &&
    /else if \(foreign\.length\) warnings\.push\(/.test(panel),
  "another demo's link stops a team member's send unless it is one of the site's example demos; Mehdi is warned, as before");
  check(/if \(template\?\.sample === "offer" && template\.stage !== "first" && linkWentHere\) \{/.test(panel),
    "a follow-up that offers to make a sample is said where the link went on this channel, from them or from Mehdi");
  check(panel.includes("const mailAppFirst = team && onPhone();") && panel.includes("{mailAppFirst ? mailAppButton(true) : zohoButton(true)}") &&
    panel.includes("{mailAppFirst ? zohoButton(false) : mailAppButton(false)}"),
  "on a phone a team member's e-mail opens in the mail app first (Set up this phone); Mehdi's order is unchanged");
  check(read("admin/outreach/useDemoLink.ts").includes("const reach = me.role && !owner ? teamReach(base, { lead, demo }) : base;"),
    "useDemoLink: anyone but Mehdi reads the reasons in their own words (teamReach); Mehdi, and anyone while `me` is pending, his");
  const picker = read("admin/outreach/DemoPicker.tsx");
  check(picker.includes("const fix = teamDemoFix(demo, lead);") && /\{demo && state !== "sent" && state !== "closed" && !fix && \(/.test(picker) && picker.includes('data-testid="demo-ask-fix"'),
    "TeamDemoStep: no Turn on the link for a demo only Mehdi can mend; why, and Ask Mehdi, instead");
  const card = read("crm/lead/LeadDemoCard.tsx");
  check(card.includes('const mehdisFirst = manages ? "" : teamTurnOnReason(demo, lead, now);') && /status !== "sent" && status !== "closed" && !mehdisFirst && \(/.test(card),
    "LeadDemoCard: the same on the lead's Demo card");
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log(`test-outreach-send-links: ${passes} passed, ${failures.length} failed${NEGATIVE ? " (NEGATIVE CONTROL: failures expected)" : ""}`);
if (NEGATIVE) {
  const expected = [
    /no \{previewLink\}, \{pitchLink\} or typed address/,
    /never offers the link again/,
    /read back the exact address, subject and body/,
    /gets no Zoho link/,
    /sendVariant: a first made base With link gives its twin/,
    /demoReach closed/,
    /demoReach draft, anyone else's send/,
    /c1-jee-neet-urban: a course shows no fee/,
    /d3-smile-studio: its first screen shows the treatments/,
    /effectivePitch: a lead with a website that would not open/,
    /teamTurnOnReason: a Free slot waits for Mehdi/,
    /teamReach free/,
  ];
  const missed = expected.filter((re) => !failures.some((f) => re.test(f)));
  if (missed.length) {
    console.log(`NEGATIVE CONTROL FAILED: these sabotages went undetected: ${missed.map(String).join(", ")}`);
    process.exit(1);
  }
  console.log("NEGATIVE CONTROL OK: every sabotage was caught.");
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
