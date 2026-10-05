/**
 * THE TEAM'S WORDING (spec 10.7 and 13.2): every sentence an intern sends is
 * true when they send it, and Mehdi's own messages never change.
 *
 *   node scripts/test-crm-wording.mjs
 *   CRM_WORDING_UPDATE=1 node scripts/test-crm-wording.mjs   rewrites the owner snapshot
 *       (only after Mehdi has changed his own wording on purpose)
 *   CRM_WORDING_NEGATIVE=1 node scripts/test-crm-wording.mjs  must exit 1 (see the end)
 *
 * WHAT IT ASSERTS
 *   1. With every memberWording key ON: every template a member is offered (the
 *      four member stages, both channels, every kind, language and lead shape,
 *      with a demo and without), rendered as "Asha Verma" and as "Bilal Khan"
 *      with the member's own identity, and every call-script line a member is
 *      offered, has none of: Mehdi's own work in the first person ("I made",
 *      "I have written", "what I saw", "maine ... likha"), a masculine
 *      first-person form in Hinglish or Hindi ("chhod raha hoon", "chahta
 *      hoon", "dikha dunga", "likhunga", Hindi "chahta hoon"), {callSlots}, a
 *      price, Mehdi's name or number, or an after-call or proposal template.
 *      The same for the versions the compose swaps in for the link in the
 *      first message (templates.ts LINK_TEMPLATES, 3 Oct 2026), each of which
 *      needs no wording key its base does not.
 *   2. With every key OFF: no template or script line a key covers is offered
 *      (and each key, switched on alone, brings back only its own).
 *   3. The member's identity: {senderFirstName} is theirs, the e-mail signature
 *      carries their name and company phone, the REMOVE line speaks as "hum".
 *   4. The stages: a member sees First message, After they say yes, Follow-up
 *      and Closing only; suggestFor never sends a member to After the call or
 *      Proposal; Call done never sets stage Call for a member; the member's
 *      call script stops after the fix and hands over before the price.
 *   5. Mehdi's own text, every template rendered for every kind it goes to and
 *      the call script in both languages, is byte-identical to the snapshot in
 *      scripts/crm-wording-owner.snapshot.json (taken before the team wording).
 *
 * Bundled with esbuild like test-outreach-engine.mjs; nothing mocked. Every
 * lead and person here is fictional (example.org, "Example ..." names).
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const SNAPSHOT = join(ROOT, "scripts", "crm-wording-owner.snapshot.json");
const UPDATE = Boolean(process.env.CRM_WORDING_UPDATE);
const NEGATIVE = Boolean(process.env.CRM_WORDING_NEGATIVE);

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
const entry = UPDATE
  ? `export * from "@/lib/outreach/templates";
export { render, DEFAULT_SIGNATURE } from "@/lib/outreach/engine";
export { callScriptFor } from "@/admin/outreach/callScript";`
  : `export * from "@/lib/outreach/templates";
export { render, checkSend, carriesOptOut, DEFAULT_SIGNATURE, EMAIL_OPT_OUT_EN, EMAIL_OPT_OUT_HINGLISH, EMAIL_OPT_OUT_HINGLISH_TEAM } from "@/lib/outreach/engine";
export { callScriptFor, CALL_LINES, MEHDI_SENDER } from "@/admin/outreach/callScript";
export { suggestFor, offered, engineStagesOf, PLAIN_STAGES, plainStageOf, stagesWithMessages, stageHint } from "@/admin/outreach/stages";
export { rankTemplates, callDoneChanges, repliedChanges, nextStep } from "@/admin/outreach/compose";
export { memberStages, MONEY_STAGES, isMoneyLine, can } from "@/lib/outreach/access";
export * from "@/admin/outreach/teamCompose";
export { MEMBER_WORDING_GROUPS } from "@/admin/outreach/memberWording";
export { MEMBER_WORDING_KEYS } from "@/lib/outreach/team";`;
const out = join(tmpdir(), `ideovent-test-crm-wording-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  jsx: "automatic",
  logLevel: "silent",
  plugins: [{ name: "alias", setup: (b) => b.onResolve({ filter: /^@\// }, (a) => ({ path: resolveTs(join(SRC, a.path.slice(2))) })) }],
});
writeFileSync(out, bundled.outputFiles[0].text);
const real = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/*
 * NEGATIVE MODE: the team gets Mehdi's own templates and script lines as they
 * are (no "we" versions, nothing held back), and Mehdi's REMOVE line loses a
 * word. The member checks and the owner snapshot must then fail.
 */
const M = { ...real };
if (NEGATIVE) {
  M.teamOffer = (me, settings) => (real.teamOffer(me, settings) ? (t) => (["after_call", "proposal"].includes(t.stage) ? null : t) : undefined);
  M.callScriptFor = (lead, opts) => real.callScriptFor(lead, { ...opts, team: undefined });
  M.memberVersion = (t) => (["after_call", "proposal"].includes(t.stage) ? null : t);
  M.render = (t, lead, ctx) => {
    const r = real.render(t, lead, ctx);
    return ctx?.team ? { ...r, body: r.body.replace(real.EMAIL_OPT_OUT_HINGLISH_TEAM, real.EMAIL_OPT_OUT_HINGLISH) } : { ...r, body: r.body.replace("Regards,", "Regards") };
  };
}

let pass = 0;
let fail = 0;
const failed = [];
const check = (ok, msg) => {
  if (ok) pass++;
  else {
    fail++;
    failed.push(msg);
    if (failed.length <= 60) console.log("FAIL " + msg);
  }
};
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

/* ── Fixtures (fictional) ────────────────────────────────────────────────── */

// Tuesday 29 Sep 2026, 14:30 India time: inside every kind's window, outside quiet hours.
const NOW = new Date("2026-09-29T09:00:00.000Z");
const KINDS = ["dental", "school", "coaching", "other"];
const NAMES = { dental: "Example Dental Clinic", school: "Example Public School", coaching: "Example Classes", other: "Example Yoga Studio" };
const CONTACT = { dental: "Dr. Mehta", school: "Principal Ma'am", coaching: "Verma Sir", other: "Mrs. Rao" };
const FIX_OBS = { dental: "no_timings", school: "no_fees_admission", coaching: "no_batch_fees", other: "not_mobile" };
const leadOf = (kind, over = {}) => ({
  id: `lead_${kind}`,
  createdAt: "2026-09-27T05:00:00.000Z",
  updatedAt: "2026-09-27T05:00:00.000Z",
  instituteName: NAMES[kind],
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
/** The lead a template is written for: "their site" templates get a website and a checked observation. */
const leadFor = (t, kind, over = {}) =>
  leadOf(kind, { ...(t.pitch === "fix_website" ? { website: "https://example.org", observation: FIX_OBS[kind] } : {}), ...over });
/** The kinds a template is offered to (its own, or every kind a neutral one is not barred from). */
const kindsOf = (t) => KINDS.filter((k) => (t.kind === "any" ? !(t.notForKinds || []).includes(k) : t.kind === k));
const textOf = (r) => `${r.subject ?? ""}\n${r.body}`;

/* ── 5. Mehdi's own text: byte-identical to the snapshot ─────────────────── */

/** Every owner render this suite pins: each template for each kind it goes to, raw and rendered, and the call script. */
function ownerTexts() {
  const texts = {};
  for (const t of [...M.OUTREACH_TEMPLATES, ...M.RETIRED_TEMPLATES]) {
    texts[`raw|${t.id}`] = `${t.subject ?? ""}\n${t.body}`;
    for (const kind of kindsOf(t)) {
      const lead = leadFor(t, kind);
      texts[`render|${t.id}|${kind}`] = textOf(M.render(t, lead, { signature: "", observation: lead.observation, now: NOW }));
      const bare = leadFor(t, kind, { contactName: "", demoSlug: undefined });
      texts[`bare|${t.id}|${kind}`] = textOf(M.render(t, bare, { signature: "Mehdi Alam\nIdeovent Technologies", observation: bare.observation, now: NOW }));
    }
  }
  for (const kind of KINDS) {
    for (const language of ["en", "hinglish"]) {
      for (const hasDemo of [true, false]) {
        for (const obs of [FIX_OBS[kind], ""]) {
          const s = M.callScriptFor(leadOf(kind, { observation: obs }), { hasDemo, language, now: NOW });
          texts[`call|${kind}|${language}|${hasDemo ? "demo" : "none"}|${obs ? "obs" : "plain"}`] = JSON.stringify(s);
        }
      }
    }
  }
  return texts;
}

const owner = ownerTexts();
const hashes = Object.fromEntries(Object.entries(owner).map(([k, v]) => [k, sha(v)]));
/* CRM_WORDING_DUMP=<file>: the owner's full texts, to diff by eye when a hash differs. Never into the repo. */
if (process.env.CRM_WORDING_DUMP) writeFileSync(process.env.CRM_WORDING_DUMP, JSON.stringify(owner, null, 1));
if (UPDATE) {
  if (NEGATIVE) {
    console.log("test-crm-wording: CRM_WORDING_UPDATE and CRM_WORDING_NEGATIVE together would pin a sabotaged text. Nothing written.");
    process.exit(2);
  }
  writeFileSync(SNAPSHOT, JSON.stringify({ note: "Mehdi's own message and call-script text, hashed (scripts/test-crm-wording.mjs). Rewrite only with CRM_WORDING_UPDATE=1 after he changes his own wording on purpose.", count: Object.keys(hashes).length, hashes }, null, 1) + "\n");
  console.log(`test-crm-wording: owner snapshot written, ${Object.keys(hashes).length} texts.`);
  process.exit(0);
}
{
  const snap = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
  check(Boolean(snap?.hashes), "owner: the snapshot of Mehdi's own text exists (scripts/crm-wording-owner.snapshot.json)");
  const pinned = snap?.hashes || {};
  const changed = Object.keys(pinned).filter((k) => hashes[k] !== pinned[k]);
  const unpinned = Object.keys(hashes).filter((k) => !(k in pinned));
  check(!changed.length, `owner: Mehdi's own text is byte-identical to the snapshot (${changed.length} of ${Object.keys(pinned).length} differ${changed.length ? ": " + changed.slice(0, 6).join(", ") : ""})`);
  check(!unpinned.length, `owner: no text of Mehdi's outside the snapshot (${unpinned.slice(0, 6).join(", ")})`);
  // The default sender is Mehdi: passing him explicitly gives the same script.
  const lead = leadOf("dental", { observation: FIX_OBS.dental });
  for (const language of ["en", "hinglish"]) {
    check(JSON.stringify(M.callScriptFor(lead, { hasDemo: true, language, now: NOW, sender: M.MEHDI_SENDER })) === JSON.stringify(M.callScriptFor(lead, { hasDemo: true, language, now: NOW })),
      `owner: the call script with Mehdi as the sender is his script as before (${language})`);
  }
}

/* ── 1. A member, every key approved: nothing untrue, nothing of Mehdi's ─── */

/** Spec 10.7's pattern, plus "likhunga" and its kind, and the same verbs in Hindi script. */
const UNTRUE = /\bI (have )?(made|written|wrote)\b|\bwhat I saw\b|\bmaine\b[^.]*\blikh|\b(raha|chahta|sakta|dikhata|karta|deta|leta|likhta|bhejta|sochta|rehta|dekhta) (hoon|hun)\b|\b(dunga|karunga|likhunga|bhejunga|dikhaunga|bataunga|lunga|loonga|doonga|milunga|aaunga|jaunga|rahunga)\b/i;
const UNTRUE_HI = /(रहा|चाहता|सकता|दिखाता|करता|देता|लेता|लिखता|भेजता|सोचता|रहता|देखता) हूँ|ूँगा|ूंगा/;
const untrue = (s) => (s.match(UNTRUE) || s.match(UNTRUE_HI) || [])[0];
const PRICE = /\bRs\.?\s?\d|₹\s?\d|\b\d{2},\d{3}\b|\[package and price\]|50% (in )?advance/i;
const MEHDIS = /Mehdi|77619|7761921786/;
const memberMe = (name, phone, over = {}) => ({
  legacy: false, memberId: `m_${name.split(" ")[0].toLowerCase()}`, role: "member", displayName: name, viewAll: false, canAddLeads: true,
  mayColdCall: false, waDailyLimit: 25, newLeadCap: 40, targets: {}, senderName: name, senderPhone: phone, senderChecked: true,
  mustChangePassword: false, ...over,
});
const ASHA = memberMe("Asha Verma", "+919810000001");
const BILAL = memberMe("Bilal Khan", "+919810000002");
const OWNER = { ...memberMe("Mehdi Alam", "+917761921786"), memberId: "m_owner", role: "owner", viewAll: true, mayColdCall: true, waDailyLimit: null };
const ADMIN = memberMe("Ayesha Rao", "+919810000003", { role: "admin", viewAll: true });
const ALL_ON = { memberWording: Object.fromEntries(M.MEMBER_WORDING_KEYS.map((k) => [k, true])) };
const MEMBER_ENGINE_STAGES = M.memberStages().flatMap((p) => M.engineStagesOf(p));
/** Every lead shape a template can meet: with a demo or none, their site or none, each language, a pitch page. */
const shapes = (kind) => ["en", "hinglish", "hi"].flatMap((language) => [
  leadOf(kind, { language }),
  leadOf(kind, { language, demoSlug: undefined }),
  leadOf(kind, { language, website: "https://example.org", observation: FIX_OBS[kind] }),
  leadOf(kind, { language, website: "https://example.org", observation: FIX_OBS[kind], demoSlug: undefined, contactName: "" }),
]);
let rendered = 0;
for (const me of [ASHA, BILAL]) {
  const offer = M.teamOffer(me, ALL_ON);
  const ctx = M.teamRenderContext(me);
  const first = me.senderName.split(" ")[0];
  for (const channel of ["whatsapp", "email"]) {
    for (const stage of MEMBER_ENGINE_STAGES) {
      for (const kind of KINDS) {
        for (const t of M.offered(channel, stage, kind, offer)) {
          check(!M.MONEY_STAGES.includes(t.stage) && !/^(wa|em)_(after_call|proposal)/.test(t.id), `member: never a money template (${t.id})`);
          check(!/\{callSlots\}/.test(`${t.subject ?? ""}${t.body}`), `member: no call times of Mehdi's in ${t.id}`);
          for (const lead of shapes(kind)) {
            const text = textOf(M.render(t, lead, { ...ctx, observation: lead.observation, now: NOW }));
            rendered++;
            const bad = untrue(text);
            check(!bad, `member (${first}): ${t.id} for a ${kind} lead says "${bad}" (untrue from them)`);
            check(!MEHDIS.test(text), `member (${first}): ${t.id} names Mehdi or his number`);
            check(!PRICE.test(text), `member (${first}): ${t.id} quotes a price or payment`);
            if (/\{senderFirstName\}/.test(t.body)) check(text.includes(first), `member (${first}): ${t.id} says who is writing in their own name`);
            if (t.channel === "email") {
              check(text.includes(`${me.senderName}, Ideovent Technologies, Saket, New Delhi`), `member (${first}): ${t.id} is signed with their own name`);
              check(text.includes(me.senderPhone.slice(-5)), `member (${first}): ${t.id} signature carries their company phone`);
              if (M.carriesOptOut(t.stage) && t.language !== "en") {
                check(text.includes(M.EMAIL_OPT_OUT_HINGLISH_TEAM) && !text.includes(M.EMAIL_OPT_OUT_HINGLISH), `member (${first}): ${t.id} ends with the team's REMOVE line`);
              }
            }
          }
        }
      }
      const any = KINDS.some((k) => M.offered(channel, stage, k, offer).length > 0);
      if (!(channel === "whatsapp" && /follow_up_[23]/.test(stage))) check(any, `member: with every key approved there is a ${channel} message at ${stage}`);
    }
  }
}
check(rendered > 500, `member: a wide set was rendered (${rendered})`);

/* ── 2. Nothing approved: what a key covers is not offered; one key brings back only its own ── */

const LIVE = M.OUTREACH_TEMPLATES.filter((t) => !M.MONEY_STAGES.includes(t.stage));
for (const t of LIVE) {
  const keys = M.memberWordingKeysOf(t);
  const off = M.memberVersion(t, {});
  check(keys.length ? off === null : off === t, `nothing approved: ${t.id} is ${keys.length ? `hidden (it needs ${keys.join(", ")})` : "offered as it is"}`);
  for (const k of M.MEMBER_WORDING_KEYS) {
    const one = M.memberVersion(t, { [k]: true });
    const fits = keys.every((x) => x === k);
    check(fits ? one !== null : one === null, `only "${k}" approved: ${t.id} ${fits ? "is offered" : "stays hidden"}`);
  }
}
for (const t of M.OUTREACH_TEMPLATES.filter((x) => M.MONEY_STAGES.includes(x.stage))) {
  check(M.memberVersion(t, ALL_ON.memberWording) === null, `the after-call summary and the proposal are never a member's, approved or not (${t.id})`);
}
{
  // With nothing approved, what a member is offered is already true from them.
  const offer = M.teamOffer(ASHA, {});
  const ctx = M.teamRenderContext(ASHA);
  for (const channel of ["whatsapp", "email"]) {
    for (const stage of MEMBER_ENGINE_STAGES) {
      for (const kind of KINDS) {
        for (const t of M.offered(channel, stage, kind, offer)) {
          for (const lead of shapes(kind).slice(0, 4)) {
            const bad = untrue(textOf(M.render(t, lead, { ...ctx, observation: lead.observation, now: NOW })));
            check(!bad, `nothing approved: ${t.id} is offered and says "${bad}"`);
          }
        }
      }
    }
  }
  // The after-a-phone-yes message (no call times) is a member's even before any approval.
  check(M.offered("whatsapp", "after_reply", "dental", offer).some((t) => /_phone_/.test(t.id)), "nothing approved: a member still has the after-a-phone-yes WhatsApp");
  check(!M.offered("whatsapp", "after_reply", "dental", offer).some((t) => /\{callSlots\}/.test(t.body)), "nothing approved: no after-yes message with call times");
}

/* ── 2b. The versions the compose swaps in, for the link in the first message (3 Oct 2026) ── */

/* ComposePanel sends a twin in its base's place (a first message with their sample's link, or a follow-up for after
   the link: templates.ts LINK_TEMPLATES, linkChoice.ts sendVariant) and runs it through the same team offer as the base
   (teamOffer, memberVersion). A twin needs no wording key its base does not, so a base a member is offered always has
   its twin offered, never Mehdi's own words; and with every key approved, what a twin says is true from them. */
{
  const twins = M.LINK_TEMPLATES || [];
  check(twins.length > 0 && twins.every((t) => Boolean(t.twinOf)), `twins: the link templates are here, each naming its base (${twins.length})`);
  for (const t of twins) {
    const base = M.getTemplate(t.twinOf);
    const tk = M.memberWordingKeysOf(t);
    const bk = base ? M.memberWordingKeysOf(base) : [];
    check(Boolean(base) && tk.every((k) => bk.includes(k)), `twin ${t.id}: needs no wording key its base ${t.twinOf} does not (${tk.join(", ") || "none"} of ${bk.join(", ") || "none"})`);
    check((M.memberVersion(t, {}) === null) === tk.length > 0, `twin ${t.id}: with nothing approved it is ${tk.length ? "hidden" : "offered as it is"}`);
  }
  let twinRendered = 0;
  for (const me of [ASHA, BILAL]) {
    const offer = M.teamOffer(me, ALL_ON);
    const ctx = M.teamRenderContext(me);
    const first = me.senderName.split(" ")[0];
    for (const t of twins) {
      const v = offer(t);
      check(Boolean(v) && v.id === t.id, `member (${first}): every key approved, twin ${t.id} is offered, with its own id`);
      if (!v) continue;
      for (const kind of kindsOf(t)) {
        for (const lead of shapes(kind).filter((l) => l.demoSlug)) {
          const text = textOf(M.render(v, lead, { ...ctx, observation: lead.observation, now: NOW }));
          twinRendered++;
          const bad = untrue(text);
          check(!bad, `member (${first}): twin ${t.id} for a ${kind} lead says "${bad}" (untrue from them)`);
          check(!MEHDIS.test(text), `member (${first}): twin ${t.id} names Mehdi or his number`);
          check(!PRICE.test(text), `member (${first}): twin ${t.id} quotes a price or payment`);
        }
      }
    }
  }
  check(twinRendered > 300, `twins: a wide set was rendered as a member (${twinRendered})`);
}

/* ── 3. The call script: their own name, the "we" lines, and a hand-over before the price ── */

for (const me of [ASHA, BILAL]) {
  const first = me.senderName.split(" ")[0];
  for (const kind of KINDS) {
    for (const language of ["en", "hinglish"]) {
      for (const hasDemo of [true, false]) {
        const lead = leadOf(kind, { observation: FIX_OBS[kind] });
        const sender = M.teamSender(me);
        const on = M.callScriptFor(lead, { hasDemo, language, now: NOW, sender, team: { wording: true, member: true } });
        const spoken = [on.opening, on.coldOpening, ...on.steps.map((s) => s.say || "")].join("\n");
        const tag = `${first}, ${kind}, ${language}, ${hasDemo ? "demo" : "no demo"}`;
        check(!untrue(spoken), `call (${tag}): nothing untrue from them ("${untrue(spoken)}")`);
        check(!/Mehdi/.test(spoken) && spoken.includes(language === "en" ? me.senderName : first), `call (${tag}): it speaks in their own name`);
        check(on.steps.map((s) => s.id).join(",") === "problem,cost,fix,handover", `call (${tag}): it stops after the fix and hands over (${on.steps.map((s) => s.id).join(",")})`);
        check(!PRICE.test(JSON.stringify(on)), `call (${tag}): no price, no payment terms`);
        check(/^Next: hand this lead to Mehdi for the price and the start date/.test(on.steps.at(-1).how), `call (${tag}): the last step hands the lead to Mehdi for the price`);
        check(Boolean(on.coldOpening) && on.withheld === 0, `call (${tag}): approved, nothing is left out`);
        const off = M.callScriptFor(lead, { hasDemo, language, now: NOW, sender, team: { wording: false, member: true } });
        const spokenOff = [off.opening, off.coldOpening, ...off.steps.map((s) => s.say || "")].join("\n");
        check(!untrue(spokenOff), `call (${tag}): not approved, the untrue lines are left out ("${untrue(spokenOff)}")`);
        // The lines the team wording covers: Mehdi's own words (in their name) differ from the team's.
        const ownerVoice = M.callScriptFor(lead, { hasDemo, language, now: NOW, sender });
        const fixOf = (s) => s.steps.find((x) => x.id === "fix")?.say || "";
        const covered = Number(ownerVoice.coldOpening !== on.coldOpening) + Number(fixOf(ownerVoice) !== fixOf(on));
        check(off.withheld === covered, `call (${tag}): ${off.withheld} line(s) withheld, ${covered} covered by the team wording`);
        check(!off.coldOpening === (ownerVoice.coldOpening !== on.coldOpening), `call (${tag}): the cold opening is left out exactly when its words wait for approval`);
      }
    }
  }
}

/* ── 4. The stages a member sees, and the changes a call or a reply makes ── */

check(JSON.stringify(M.memberStages()) === JSON.stringify(["first", "after_yes", "follow_up", "closing"]), "stages: a member's are First message, After they say yes, Follow-up and Closing");
check(JSON.stringify(M.composeStages(ASHA)) === JSON.stringify(M.memberStages()), "stages: the compose shows a member only those four");
check(JSON.stringify(M.composeStages(ADMIN)) === JSON.stringify(M.memberStages()), "stages: an admin, who may not send the price either, sees the same four");
check(JSON.stringify(M.composeStages(OWNER)) === JSON.stringify(M.PLAIN_STAGES), "stages: Mehdi sees all six");
check(JSON.stringify(M.composeStages({ ...OWNER, legacy: true, memberId: null })) === JSON.stringify(M.PLAIN_STAGES), "stages: Mehdi before the team update sees all six");
for (const status of ["call", "proposal"]) {
  for (const channel of ["whatsapp", "email"]) {
    const lead = leadOf("school", { status });
    const s = M.suggestFor(lead, [], channel, { member: true });
    check(!["after_call", "proposal"].includes(s.stage) && Boolean(s.done), `stages: a lead at ${status} never sends a member to After the call or Proposal (${channel}: ${s.stage})`);
    check(["after_call", "proposal"].includes(M.suggestFor(lead, [], channel).stage), `stages: Mehdi's lead at ${status} still opens on ${status === "call" ? "After the call" : "Proposal"} (${channel})`);
  }
}
{
  const lead = leadOf("dental", { status: "replied" });
  const m = M.callDoneChanges(lead, NOW, { member: true });
  const o = M.callDoneChanges(lead, NOW);
  check(!("status" in m.patch) && m.event.type === "call" && Boolean(m.patch.nextActionAt), "Call done: a member's never sets stage Call (the database refuses it); the call line and the next action are written");
  check(o.patch.status === "call" && /After the call/.test(o.event.detail), "Call done: Mehdi's moves the lead to Call, as before");
  const r = M.repliedChanges(lead, NOW);
  check(r.patch.status === "replied" && Object.keys(r.patch).sort().join(",") === "nextActionAt,status", "They replied: only the status and the next action travel (a patch)");
  check(/hand the lead to Mehdi/.test(M.repliedChanges(lead, NOW, { member: true }).event.detail) && /two call times/.test(r.event.detail), "They replied: a member's line says to hand it over; Mehdi's is as before");
  // What the screen tells a member to do after a yes: hand it to Mehdi, never "two call times" of their own.
  for (const channel of ["whatsapp", "email"]) {
    check(!/two times|two call times/.test(M.stageHint("after_yes", channel, "school", true)) && /hand the lead to Mehdi/.test(M.stageHint("after_yes", channel, "school", true)), `stage hint (${channel}): a member's After they say yes says to hand over`);
    check(/two times for a 10-minute call/.test(M.stageHint("after_yes", channel, "school")), `stage hint (${channel}): Mehdi's is as before`);
    // The first message (3 Oct 2026): With link is Mehdi's alone, so a team sender's hint never names the switch; his does.
    check(!/With link/.test(M.stageHint("first", channel, "dental", true)) && /With link/.test(M.stageHint("first", channel, "dental")),
      `stage hint (${channel}): a team sender's first message names no With link switch, Mehdi's does`);
  }
  check(/hand the lead to Mehdi/.test(M.nextStep(lead, false, NOW, { member: true }).text) && /send the sample link/.test(M.nextStep(lead, false, NOW).text), "next step on a replied lead: a member hands it over; Mehdi sends the sample link, as before");
}

/* ── 6. Settings > Team wording shows exactly what a member sends ─────────── */

for (const g of M.MEMBER_WORDING_GROUPS) {
  check(g.pairs.length > 0, `team wording: "${g.title}" shows its sentences`);
  for (const p of g.pairs) check(!untrue(p.member) && !/\{callSlots\}/.test(p.member), `team wording: the version Mehdi approves is true from anyone ("${p.member.slice(0, 50)}")`);
}
for (const k of M.MEMBER_WORDING_KEYS.filter((x) => x !== "we_call_lines")) {
  const live = M.MEMBER_SWAPS.filter((s) => s.key === k && LIVE.some((t) => `${t.subject ?? ""}\n${t.body}`.includes(s.owner)));
  check(live.length > 0 || k === "we_leave_it_here", `team wording: "${k}" covers sentences the templates really carry`);
}
for (const stage of ["first", "after_reply", "follow_up_1", "follow_up_2", "follow_up_3", "after_call", "proposal"]) {
  check(M.COLD_EMAIL_STAGES.includes(stage) === M.carriesOptOut(stage), `templates.ts COLD_EMAIL_STAGES agrees with engine.ts carriesOptOut (${stage})`);
}

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`test-crm-wording: ${pass} passed, ${fail} failed${NEGATIVE ? " (NEGATIVE MODE: the team gets Mehdi's own words; the member and owner checks must fail)" : ""}`);
if (NEGATIVE) {
  const expected = [/^member \(/, /^owner: Mehdi's own text is byte-identical/, /^call \(.*nothing untrue/];
  const missed = expected.filter((re) => !failed.some((f) => re.test(f)));
  if (missed.length) {
    console.log("NEGATIVE MODE DID NOT FAIL: undetected " + missed.map(String).join(", "));
    process.exit(0);
  }
  console.log("Negative mode failed as it must: untrue member wording and a changed owner text were both caught.");
  process.exit(1);
}
process.exit(fail ? 1 : 0);
