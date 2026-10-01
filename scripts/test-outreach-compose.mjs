/**
 * Unit checks for src/admin/outreach/compose.ts, the pure choices behind the
 * lead screen, read against the approved message set (30 Sep 2026):
 *   - looksLikeNote catches third-person research notes and lets real sentences through;
 *   - rankTemplates suggests, for every stage a channel has, a message of the
 *     lead's own kind (a clinic never sees a school or coaching message) in the
 *     lead's language (Hinglish before English for a Hindi lead);
 *   - a lead with a demo gets the message that says the sample is made; one
 *     without gets its twin that offers to make one, never a message that says
 *     a sample exists when it does not;
 *   - a lead with a website of its own is never suggested "no website" (the
 *     "their site" message comes first, waiting for an observation), and a
 *     clinic whose only "website" is a Practo page is offered a new site;
 *   - the retired WhatsApp follow-ups are never ranked; the after-call summary
 *     is ranked but cannot go until its [blanks] are filled;
 *   - the preview shows the approved look of 1 Oct 2026 (a textarea over a
 *     white-space: pre-wrap layer) and the send links carry its blank lines
 *     and bullets (%0A%0A, %0A%E2%80%A2);
 *   - the picture (1 Oct 2026): a first WhatsApp that says the sample is made
 *     carries its kind's picture link before the ask, and the compose shows
 *     the picture under it with Copy image, Share and Download, each with a
 *     hint; the offer twin and the e-mails carry none.
 * Bundled with esbuild like test-outreach-engine.mjs; nothing mocked. Fictional leads only.
 *
 *   node scripts/test-outreach-compose.mjs
 *
 * NEGATIVE CONTROL: OUTREACH_COMPOSE_NEGATIVE=1 ranks as if every lead had a
 * demo and spoke English. The "no demo yet" and language checks must then
 * FAIL; the run exits 0 only when they do.
 */
import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const resolveTs = (base) => {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch {
      /* next */
    }
  }
  return base;
};
const out = join(tmpdir(), `ideovent-test-outreach-compose-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: `export * from "@/admin/outreach/compose";
export { OBSERVATIONS, observationsFor, checkSend, render, whatsappUrl, mailtoUrl, previewFor } from "@/lib/outreach/engine";
export { STAGE_LABELS, stagesFor, getTemplate, carriesPreview } from "@/lib/outreach/templates";`,
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  jsx: "automatic",
  logLevel: "silent",
  plugins: [{ name: "alias", setup: (b) => b.onResolve({ filter: /^@\// }, (a) => ({ path: resolveTs(join(SRC, a.path.slice(2))) })) }],
});
writeFileSync(out, bundled.outputFiles[0].text);
const C = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

let pass = 0;
let fail = 0;
const failed = [];
const check = (ok, msg) => {
  if (ok) pass++;
  else {
    fail++;
    failed.push(msg);
    console.log("FAIL " + msg);
  }
};

/* looksLikeNote */
const notes = [
  "The footer reads 'Copyright Example Coaching Academy 2022'.",
  "Their homepage says 'Admissions open 2021-22'.",
  "Copyright 2019 on every page.",
  "curl 27 Sep 2026: HTTP 200, 46 KB",
];
const sentences = [
  "The admissions page of Example Public School does not open on a phone.",
  "Your footer still says Copyright 2022.",
  "not_mobile",
  "Aapki site ka footer abhi bhi 2022 dikhata hai.",
  "",
];
for (const n of notes) check(C.looksLikeNote(n) === true, `note not caught: ${n}`);
for (const s of sentences) check(C.looksLikeNote(s) === false, `sentence taken for a note: ${s}`);
check(C.startingObservation({ observation: notes[0] }) === "", "a footer note starts a message");

/* Fixtures: fictional leads (example.org). */
const settings = { signature: "Mehdi", quietStart: "00:00", quietEnd: "00:00", alertOnDemoOpen: false };
const school = (language, over = {}) => ({
  id: "t1", instituteName: "Example Vidya Mandir", kind: "school", status: "new", email: "office@example.org",
  contactName: "Principal Ma'am", website: "https://example.org", demoSlug: "example-vidya-mandir", language, createdAt: "", updatedAt: "", ...over,
});
const clinic = (over = {}) => ({
  id: "d1", instituteName: "Example Dental Clinic", kind: "dental", status: "new", email: "hello@example.org", contactName: "Dr. Mehta",
  phone: "+91 98765 43210", demoSlug: "example-dental-clinic", language: "en", createdAt: "", updatedAt: "", ...over,
});
const NEGATIVE = Boolean(process.env.OUTREACH_COMPOSE_NEGATIVE);
const rankTemplates = NEGATIVE
  ? (input) => C.rankTemplates({ ...input, lead: { ...input.lead, demoSlug: input.lead.demoSlug || "pretend-demo", language: "en" } })
  : C.rankTemplates;
const rank = (lead, channel, stage, observation = lead.observation || "") => rankTemplates({ lead, channel, stage, settings, waToday: 0, observation });

/* A Hindi lead's first e-mail is Hinglish (there is no Hindi e-mail); an English lead's is English. */
const hiMail = rank(school("hi"), "email", "first", "not_mobile")[0];
check(hiMail && hiMail.language === "hinglish", `hi lead's first e-mail is ${hiMail?.language}`);
const enMail = rank(school("en"), "email", "first", "not_mobile")[0];
check(enMail && enMail.language === "en", `en lead's first e-mail is ${enMail?.language}`);
const hiWa = rank(school("hi"), "whatsapp", "first", "")[0];
check(!hiWa || hiWa.language !== "en", `hi lead's first WhatsApp is ${hiWa?.language}`);

/* Dental clinics: every stage each channel has, the clinic's own message first. */
for (const channel of ["email", "whatsapp"]) {
  for (const stage of C.stagesFor(channel)) {
    const ranked = rank(clinic(), channel, stage, "no_online_booking");
    check(ranked.length > 0 && ranked.every((t) => t.kind === "dental" || t.kind === "any"), `dental ${channel} ${stage}: only dental or neutral templates (${ranked.map((t) => t.id).join(", ")})`);
    check(ranked.every((t) => !(t.notForKinds || []).includes("dental") && !t.retired), `dental ${channel} ${stage}: nothing school-worded or retired`);
    check(ranked[0]?.kind === "dental", `dental ${channel} ${stage}: the suggested template is a dental one (${ranked[0]?.id})`);
    check(ranked[0]?.language === "en", `dental ${channel} ${stage}: in the lead's language (${ranked[0]?.language})`);
  }
}
check(C.stagesFor("whatsapp").filter((s) => s.startsWith("follow_up")).length === 1, "WhatsApp has one follow-up stage");
for (const stage of ["follow_up_2", "follow_up_3"]) {
  check(rank(clinic(), "whatsapp", stage).length === 0 && rank(school("en"), "whatsapp", stage).length === 0, `WhatsApp ${stage}: nothing is ranked (retired)`);
}

/* With a demo: "the sample is made". Without one: the twin that offers to make it. */
const dNew = rank(clinic(), "email", "first", "")[0];
check(dNew?.id === "em_first_new_dental_en", `a clinic with no website and a demo gets the dental 'sample made' e-mail (${dNew?.id})`);
const dNoDemo = rank(clinic({ demoSlug: undefined }), "email", "first", "")[0];
check(dNoDemo?.id === "em_first_new_dental_en_offer", `a clinic with no demo yet is offered the e-mail that offers a sample (${dNoDemo?.id})`);
const waNoDemo = rank(clinic({ demoSlug: undefined, language: "hinglish" }), "whatsapp", "first", "")[0];
check(waNoDemo?.id === "wa_first_new_dental_hinglish_offer", `and the Hinglish WhatsApp that offers one (${waNoDemo?.id})`);
const fuNoDemo = rank(clinic({ demoSlug: undefined, status: "contacted" }), "email", "follow_up_1", "")[0];
check(fuNoDemo?.id === "em_fu1_dental_en_offer", `the day-4 e-mail with no demo asks to make one (${fuNoDemo?.id})`);
const waFuNoDemo = rank(school("en", { demoSlug: undefined, status: "contacted", phone: "+91 98765 43210" }), "whatsapp", "follow_up_1", "")[0];
check(waFuNoDemo?.sample === "offer", `the WhatsApp follow-up with no demo is the 'offer' one (${waFuNoDemo?.id})`);
for (const [lead, channel] of [[clinic({ demoSlug: undefined }), "whatsapp"], [school("en", { demoSlug: undefined, phone: "+91 98765 43210" }), "whatsapp"], [school("hinglish", { demoSlug: undefined }), "email"]]) {
  const top = rank(lead, channel, "first", "not_mobile")[0];
  const ok = C.checkSend({ ...lead, observation: "not_mobile" }, top, channel, settings, 0);
  check(top?.sample === "offer" && !ok.blockers.some((b) => /no demo yet/.test(b)), `${lead.kind} ${channel}: with no demo the suggestion never claims a sample (${top?.id})`);
}

/* "No website" is only ever suggested to a lead that has none. */
const dFix = rank(clinic({ website: "https://example.org" }), "email", "first", "no_online_booking")[0];
check(dFix?.id === "em_first_fix_dental_en", `a clinic with a website and an observation gets the dental 'their site' e-mail (${dFix?.id})`);
const dNoObs = rank(clinic({ website: "https://example.org" }), "whatsapp", "first", "")[0];
check(dNoObs?.pitch === "fix_website", `a clinic with a website and no observation yet is shown the 'their site' message, which waits for one (${dNoObs?.id})`);
const practo = { website: "https://www.practo.com/example/clinic/example-dental-clinic", pitch: "new_website" };
const dDir = rank(clinic(practo), "email", "first", "")[0];
check(dDir?.id === "em_first_new_dental_en", `a DIRECTORY_ONLY clinic (a Practo page, pitch new_website) is offered a new site (${dDir?.id})`);
const dDirWa = rank(clinic(practo), "whatsapp", "first", "")[0];
check(dDirWa?.id === "wa_first_new_dental_en", `and the 'no website' WhatsApp (${dDirWa?.id})`);
const dPitchFix = rank(clinic({ website: "https://example.org", pitch: "fix_website" }), "email", "first", "no_online_booking")[0];
check(dPitchFix?.id === "em_first_fix_dental_en", `pitch fix_website gets the 'their site' e-mail (${dPitchFix?.id})`);
const dHing = rank(clinic({ language: "hinglish" }), "whatsapp", "first", "")[0];
check(dHing?.id === "wa_first_new_dental_hinglish", `a Hinglish clinic's first WhatsApp is the dental Hinglish one (${dHing?.id})`);
for (const stage of C.stagesFor("email")) {
  check(rank(school("en"), "email", stage, "not_mobile").every((t) => t.kind !== "dental"), `a school lead is never offered a dental template (${stage})`);
}

/* The after-call summary is suggested, and waits for its [blanks]. */
const summary = rank(clinic({ status: "call" }), "whatsapp", "after_call")[0];
check(summary?.id === "wa_after_call_dental_en", `after a call, the clinic's summary is suggested (${summary?.id})`);
check(!C.checkSend(clinic({ status: "call" }), summary, "whatsapp", settings, 0).ok, "the summary cannot go with [package and price] and [date] unfilled");

/* The observation chips a dental lead picks from, and a picked chip is a sentence, not a research note. */
const chips = C.observationsFor("dental").map((o) => o.id);
check(["no_online_booking", "no_whatsapp_button", "no_treatment_pages", "no_doctor_details", "no_implant_info", "no_first_visit_info"].every((id) => chips.includes(id)) && !chips.includes("no_fees_admission"), `dental chips: ${chips.join(", ")}`);
check(C.observationsFor("school").every((o) => !(o.kinds || []).includes("dental")), "school chips carry no dental one");
for (const o of C.OBSERVATIONS) {
  check(!C.looksLikeNote(o.en) && !C.looksLikeNote(o.hinglish), `chip ${o.id} is a sentence, not a note`);
}
for (const o of C.OBSERVATIONS.filter((x) => (x.kinds || []).includes("dental"))) {
  check(C.startingObservation(clinic({ observation: o.id })) === o.id, `dental chip ${o.id} starts a message`);
}

/* The compose preview shows the approved look (1 Oct 2026: short lines, a blank line between parts,
   bullets). The message sits in a textarea, which keeps every line break, over a highlight layer that
   wraps the same way (white-space: pre-wrap); the send links are built from the text on screen, so
   the blank lines travel as %0A%0A and each bullet as %0A%E2%80%A2. */
{
  const box = readFileSync(join(SRC, "admin/outreach/MessageBox.tsx"), "utf8");
  const panel = readFileSync(join(SRC, "admin/outreach/ComposePanel.tsx"), "utf8");
  check(/const BOX_TEXT = "[^"]*\bwhitespace-pre-wrap\b/.test(box) && /<textarea[^>]*\bvalue=\{value\}/.test(box) && /className=\{cn\(BOX_TEXT, "relative block/.test(box),
    "the message preview is a textarea over a highlight layer that wraps with white-space: pre-wrap, so blank lines and bullets show");
  check(/whatsappUrl\(waNumber, body\)/.test(panel) && /mailtoUrl\(\{ to: lead\.email \|\| "", subject, body \}\)/.test(panel), "the WhatsApp and mail links are built from the text on screen");
  const t = C.getTemplate("wa_first_new_dental_en");
  const r = C.render(t, clinic(), { now: new Date("2026-09-29T09:00:00.000Z"), demo: { phone: true, whatsapp: true } });
  const href = C.whatsappUrl("+91 98765 43210", r.body);
  // Six blocks of the five parts (the greeting and who are two) and, since 1 Oct 2026, the picture link before the ask.
  check(r.body.split("\n\n").length === 7 && href.includes("%0A%0A") && new URL(href).searchParams.get("text") === r.body && C.mailtoUrl({ to: "a@example.org", body: r.body }).includes("%0A%E2%80%A2%20"),
    "a first WhatsApp's five parts and its picture link reach WhatsApp and the mail app with their blank lines and bullets");
  check(href.includes(encodeURIComponent("\n\nA quick look: https://www.ideovent.in/w/dental\n\n")) && r.body.split("\n\n").at(-2) === "A quick look: https://www.ideovent.in/w/dental",
    "the wa.me link carries the clinic's picture link, in its own part just before the ask");
}

/* The picture (1 Oct 2026): under a first WhatsApp with the picture link, the compose shows the picture of the
   kind the link is for, with Copy image (a PNG on the clipboard), Share (the picture and the text) and Download,
   each with a one-line hint; the twin that offers to make a sample shows why it has none; other kinds nothing. */
{
  const box = readFileSync(join(SRC, "admin/outreach/MessageBox.tsx"), "utf8");
  const panel = readFileSync(join(SRC, "admin/outreach/ComposePanel.tsx"), "utf8");
  const card = readFileSync(join(SRC, "admin/outreach/CreativeCard.tsx"), "utf8");
  check(/<CreativeCard page=\{picture\.page\} text=\{body\}/.test(box) && /data-testid="creative-none"/.test(box), "the message box shows the picture under the text, or the note on why there is none");
  check(/carriesPreview\(template\) \? previewFor\(pictureKind\)/.test(panel) && /firstWa = !isEmail && template\?\.stage === "first"/.test(panel) && /shareBlocked: blocked/.test(panel),
    "the compose panel shows it only under a first WhatsApp that carries the picture link, and Share waits while the send is blocked");
  check(/"image\/png"/.test(card) && /new ClipboardItem/.test(card) && /navigator\.share\(\{ files: \[file\], text \}\)/.test(card) && /download=\{page\.fileName\}/.test(card),
    "Copy image puts a PNG on the clipboard, Share sends the picture with the message text, Download saves the JPEG");
  for (const id of ["creative-copy-hint", "creative-share-hint", "creative-download-hint"]) check(card.includes(`data-testid="${id}"`), `each button has its one-line hint (${id})`);
  // Built from code points, so this file itself contains no em or en dash.
  check(!new RegExp(`[${String.fromCharCode(8211)}${String.fromCharCode(8212)}]`).test(card + box), "the picture card has no en or em dash");
  check(C.previewFor("dental")?.image === "/w/dental.jpg" && C.previewFor("school")?.image === "/w/school.jpg" && C.previewFor("coaching")?.image === "/w/coaching.jpg" && C.previewFor("other") === undefined,
    "each kind maps to its own picture, and a kind without one to none");
  const offer = C.getTemplate("wa_first_new_dental_en_offer");
  check(!C.carriesPreview(offer) && C.carriesPreview(C.getTemplate("wa_first_new_dental_en")) && !C.carriesPreview(C.getTemplate("em_first_new_dental_en")),
    "the picture goes with the WhatsApp that says the sample is made, not with its offer twin or an e-mail");
}

console.log(`test-outreach-compose: ${pass} passed, ${fail} failed${NEGATIVE ? " (NEGATIVE CONTROL: failures expected)" : ""}`);
if (NEGATIVE) {
  const expected = [/with no demo the suggestion never claims a sample/, /offered the e-mail that offers a sample/, /hi lead's first e-mail is/];
  const missed = expected.filter((re) => !failed.some((f) => re.test(f)));
  if (missed.length) {
    console.log("COMPOSE NEGATIVE CONTROL FAILED: undetected " + missed.join(", "));
    process.exit(1);
  }
  console.log("Compose negative control failed as it should.");
  process.exit(0);
}
process.exit(fail ? 1 : 0);
