/**
 * The client process (src/lib/clients: stages, tasks, money, templates, compose, scripts), in Node,
 * client-process-spec 14.2.
 *
 *   node scripts/test-client-process.mjs
 *   CLIENT_PROCESS_NEGATIVE=needs node scripts/test-client-process.mjs   (must fail)
 *   CLIENT_PROCESS_NEGATIVE=truth node scripts/test-client-process.mjs   (must fail)
 *
 * WHAT IT ASSERTS
 *   A. Stages and gates: the twelve stages in order with their Hinglish labels; every gate item blocks
 *      Move until done or skipped; "Move on anyway" needs a reason and is recorded red; stage 1 ends
 *      only in a yes or a no; a Won lead opens at stage 2 with stage 1 "done before"; holds and outcomes.
 *   B. Item needs (decision 10): l_cutover, l_verify and l_live wait for l_paid in a chain; h_source and
 *      the admin-access rows wait for l_paid while the registrar and DNS rows do not; the launch invoice
 *      waits for q_accepted; each need overridden only with its own reason, shown red; an override of
 *      l_cutover does not unlock h_source; the handover WhatsApp stays blocked under any override;
 *      a_partner before and after the deed ([[SINGLE_PARTNER_LIMIT]], a discount, a split advance, their NDA).
 *   C. Opening a file: a monthly plan opens no project file; a client outside India gets no money
 *      message; a lead in "hi" opens in "hinglish".
 *   D. Due rules on fixed dates (a Monday, a Saturday, a Sunday, 31 March into 1 April, working days
 *      across a Sunday): the proposal, advance, launch, waiting, content, review-window, weekly, support,
 *      split-advance, proforma-validity, TDS, renewal, domain, win-back, records and Lost ladders; the
 *      feedback asks never on a money day, never with an S1 or S2 open and never in the 7 days after one
 *      closed; no testimonial ask within 90 days of a decline; snooze; health; the "Next:" line.
 *   E. Money: 50/50 for 18,000, 18,001 and 12,500; the split advance; the launch invoice with two
 *      advances, TDS, an approved CR and an earlier work-to-date invoice; balances with credit notes;
 *      outstanding; received; over-payment; the receipt's figures; paid with TDS; words; the discount rules.
 *   F. Messages: all 104 templates render for every kind and language, full and empty: no {field}, no
 *      "[[", no dash, no rupee sign; blanks block; no "Sir" or "Principal ji" for a client without a
 *      contact name; the truth conditions block; suggestions never a price list; the two templates.ts
 *      proposal e-mails end "Regards," and the signature and no other e-mail gets an ending added; E3's
 *      cuts; E7's "{supportEndDate} tak"; sources; "New wording" until approved; no ask with an amount due.
 *   G. Sources: every S template matches its source word for word (the token mapping of 7.2 applied,
 *      blanks named in src.blanked), every E template's source anchors exist, and the templates.ts texts
 *      are taken as they are (skipped, with a line saying so, where the source folders are absent).
 *   H. The scripts (kickoff, pre-launch care plan) and the section 13 table.
 *   I. The register, the renewals and the dashboard numbers (register.ts, 5.6, 10.2, 11.5): the register's
 *      words for each state, its rows, totals and CSV (formula-safe, amounts plain), the renewal list, the
 *      four tiles; and two regressions the e2e found: a weekly update day saved by a select as "5", and the
 *      receipt e-mail opened from its item (it names the latest payment and its receipt).
 *   J. The wording review of 4 Oct 2026.
 *   K. The gate review of 4 Oct 2026: the advance billed once, in the screen's words (a second advance
 *      proforma, part 2 with no split, part 2 after a whole advance, anything after the launch invoice, a
 *      second proforma for one change request; a refunded one no longer counting); the receipt e-mail no
 *      longer ticking stage 9's item; items a project does not need say why and leave Today; a part payment
 *      against a proforma says "proforma invoice" (E23); M1 after a part payment asks for the balance (E19);
 *      a change request's own advance named on the launch invoice (E13 n).
 *
 * NEGATIVE MODES patch the bundled source: "needs" removes l_cutover's need for the launch payment;
 * "truth" switches off the handover WhatsApp's truth condition. Each must make this suite fail.
 * Fictional data only ("Example School" and friends).
 */
import { build } from "esbuild";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const AGENCY = resolve(ROOT, "..", "..");
const NEG = process.env.CLIENT_PROCESS_NEGATIVE || "";
if (NEG && !["needs", "truth"].includes(NEG)) {
  console.error(`Unknown CLIENT_PROCESS_NEGATIVE=${NEG} (needs | truth).`);
  process.exit(2);
}
const PATCHES = {
  needs: { file: /clients[\\/]stages\.ts$/, from: 'action: tick("The time of the change"), source: "SOP-06 sections 1, 4", needs: [{ item: "l_paid", label: "the launch payment credited (\\"Do not cut over DNS on a promise\\"; SA cl. 5.2(b))" }] },', to: 'action: tick("The time of the change"), source: "SOP-06 sections 1, 4" },' },
  truth: { file: /clients[\\/]compose\.ts$/, from: "  handover_truth: (c) => {", to: "  handover_truth: (c) => null as string | null,\n  handover_truth_off: (c) => {" },
};
let patched = false;

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}
const alias = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/cms\/client$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export function supabase() { throw new Error('no Supabase in this test'); }", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (NEG) {
      const p = PATCHES[NEG];
      b.onLoad({ filter: p.file }, (args) => {
        const src = readFileSync(args.path, "utf8");
        if (!src.includes(p.from)) throw new Error(`negative mode ${NEG}: the line to patch was not found in ${args.path}`);
        patched = true;
        return { contents: src.replace(p.from, p.to), loader: "ts" };
      });
    }
  },
};
const out = join(tmpdir(), `ideovent-test-client-process-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: [
      `export * as ST from "@/lib/clients/stages";`,
      `export * as TK from "@/lib/clients/tasks";`,
      `export * as MO from "@/lib/clients/money";`,
      `export * as TP from "@/lib/clients/templates";`,
      `export * as CO from "@/lib/clients/compose";`,
      `export * as SC from "@/lib/clients/scripts";`,
      `export * as NU from "@/lib/clients/numbering";`,
      `export * as RG from "@/lib/clients/register";`,
      `export { clientFromLead, newProject, mergeClientSettings, GOOGLE_REVIEW_LINK } from "@/lib/clients/store";`,
      `export { OUTREACH_TEMPLATES } from "@/lib/outreach/templates";`,
      `export { DEFAULT_SIGNATURE } from "@/lib/outreach/engine";`,
      `export { ONE_TIME, CARE, HOURLY_RATE } from "@/lib/pricing";`,
    ].join("\n"),
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [alias],
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });
if (NEG && !patched) {
  console.error(`negative mode ${NEG}: the patch was not applied`);
  process.exit(3);
}
const { ST, TK, MO, TP, CO, SC, NU, RG } = M;

let pass = 0;
const fails = [];
const notes = [];
const ok = (c, m, got) => {
  if (c) pass++;
  else fails.push(got === undefined ? m : `${m}\n      got: ${typeof got === "string" ? got : JSON.stringify(got)}`);
};
const throws = (fn, re, m) => {
  try {
    fn();
    fails.push(`${m} (did not throw)`);
  } catch (e) {
    ok(re.test(String(e?.message || e)), m, String(e?.message || e));
  }
};

/* ── Fixtures ─────────────────────────────────────────────────────────── */
const NOW = new Date("2026-10-05T05:30:00Z"); // Monday 5 Oct 2026, 11:00 India time
const at = (day, hm = "11:00") => new Date(`${day}T${hm}:00+05:30`);
const S = M.mergeClientSettings({});
const client = (over = {}) => ({
  id: "cl_1", code: "IDV-C-0001", leadId: "ol_1", status: "active", createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  orgName: "Example School", kind: "school", inIndia: true, contactName: "Asha Rao", phone: "+91 90000 11111", whatsapp: "+91 90000 11111",
  email: "office@school.example.org", language: "hinglish", legalName: "Example School Trust", billingAddress: "12 Example Road, New Delhi 110017",
  state: "Delhi", signatoryName: "Asha Rao", signatoryDesignation: "Principal", portfolioOptOut: false, ...over,
});
const project = (over = {}) => ({
  ...M.newProject({ clientId: "cl_1", name: "Example School website" }, NOW), id: "pr_1", code: "IDV-PR-0001", leadId: "ol_1",
  lines: [{ description: "School website as in the Statement of Work", qty: 1, unit: "project", rate: 18000 }], durationWeeks: 4, ...over,
});
let seq = 0;
const doc = (over) => ({
  id: `dc_${++seq}`, clientId: "cl_1", projectId: "pr_1", kind: "proforma", milestone: null, status: "issued", series: null, fy: "2026-27", serial: seq,
  number: `IDV/X/2026-27/${String(seq).padStart(3, "0")}`, issuedOn: "2026-10-05", dueOn: null, validUntil: null, amount: 0, paymentId: null, relatedDoc: null,
  data: {}, issuedAt: NOW.toISOString(), cancelledAt: null, cancelReason: null, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), ...over,
});
const pay = (over) => ({
  id: `py_${++seq}`, clientId: "cl_1", projectId: "pr_1", againstDoc: "", receivedOn: "2026-10-07", amount: 0, tds: 0, mode: "neft", reference: "UTR0001",
  status: "recorded", voidReason: null, note: null, createdAt: new Date(NOW.getTime() + seq * 1000).toISOString(), ...over,
});
const ctxOf = (p, docs = [], payments = [], cl = client(), today = "2026-10-05", settings = S) => ({ client: cl, project: p, docs, payments, settings, today });
const pi = (over = {}) => doc({ kind: "proforma", milestone: "ADVANCE_50", series: "PI", number: "IDV/PI/2026-27/001", amount: 9000, issuedOn: "2026-10-06", dueOn: "2026-10-13", validUntil: "2026-10-21", ...over });
const inv = (over = {}) => doc({ kind: "invoice", milestone: "LAUNCH_50", series: "INV", number: "IDV/2026-27/001", amount: 9000, issuedOn: "2026-10-30", dueOn: "2026-11-06", ...over });
const rc = (p, over = {}) => doc({ kind: "receipt", series: "RC", number: `IDV/RC/2026-27/${String(seq).padStart(3, "0")}`, amount: p.amount, paymentId: p.id, relatedDoc: p.againstDoc, issuedOn: p.receivedOn, ...over });

/* A project with the launch paid, or not. */
function launchCtx({ paid = false, overrides = [], extra = {}, cl = {} } = {}) {
  const p0 = pi();
  const p0pay = pay({ againstDoc: p0.id, amount: 9000, receivedOn: "2026-10-07" });
  const i0 = inv();
  const docs = [p0, rc(p0pay), i0];
  const pays = [p0pay];
  if (paid) {
    const ip = pay({ againstDoc: i0.id, amount: 9000, receivedOn: "2026-10-31" });
    pays.push(ip);
    docs.push(rc(ip));
  }
  const p = project({ stage: "launch", gateOverrides: overrides, dates: { goLiveTarget: "2026-11-02", accepted: "2026-10-30" }, ...extra });
  return ctxOf(p, docs, pays, client(cl), "2026-11-02");
}

/* ── A. Stages and gates ───────────────────────────────────────────────── */
ok(JSON.stringify(ST.STAGES.map((s) => s.id)) === JSON.stringify(["proposal", "agreement", "welcome", "kickoff", "content", "design", "build", "review", "launch", "handover", "support", "aftercare"]), "the twelve stages in order");
ok(ST.STAGES.every((s, i) => s.n === i + 1 && s.hinglish && s.goal && s.items.length > 0), "each stage has its number, its Hinglish label, a goal and items");
ok(ST.STAGES.map((s) => s.hinglish).join("|") === "Proposal aur quotation|Agreement aur advance|Welcome aur onboarding|Kickoff call|Content mangwana|Design approval|Website banana|Testing aur client check|Final payment aur launch|Handover aur training|30 din ka support|AMC ya exit", "the Hinglish labels of 1");
ok(new Set(ST.ITEMS.map((i) => i.id)).size === ST.ITEMS.length, "item ids are unique");
ok(ST.ITEMS.every((i) => i.source && i.label && i.action), "every item has its source, label and action");
for (const stage of ST.STAGES.slice(1, 11)) {
  const p = project({ stage: stage.id });
  const c = ctxOf(p, [], [], client({ legalName: "", billingAddress: "", state: "", signatoryName: "", portfolioOptOut: null }));
  const missing = ST.missingForMove(c);
  ok(missing.length > 0, `stage ${stage.n} (${stage.id}): Move is blocked while its gate items are open`, missing.map((m) => m.id));
  const r = ST.moveToNext(c, NOW);
  ok(r.project.stage === stage.id && r.missing.length === missing.length, `stage ${stage.n}: Move without a reason does nothing and lists what is missing`);
  const blank = ST.moveToNext(c, NOW, "   ");
  ok(blank.project.stage === stage.id, `stage ${stage.n}: a blank reason is not a reason`);
  const forced = ST.moveToNext(c, NOW, "Client asked to start design while the logo is redrawn");
  ok(forced.project.stage === ST.nextStageOf(stage.id) && forced.project.gateOverrides.some((o) => o.stage === stage.id && !o.item && o.reason.startsWith("Client asked")), `stage ${stage.n}: "Move on anyway" moves and records the reason (red on the strip)`);
  ok(ST.stageOverridden(forced.project, stage.id), `stage ${stage.n}: the strip shows the override`);
}
{
  // Ticking every hand-ticked gate item of a stage clears it; an item that ticks itself stays until its condition holds.
  const p = project({ stage: "welcome", stagingUrl: "https://staging.example.org", dates: { kickoff: "2026-10-08" }, kickoffTime: "11:00" });
  let c = ctxOf(p);
  const before = ST.missingForMove(c).map((i) => i.id);
  let pp = p;
  for (const id of ["w_folder", "w_repo", "w_staging", "w_vault"]) pp = ST.tickItem(pp, id, NOW);
  c = ctxOf(pp);
  const after = ST.missingForMove(c).map((i) => i.id);
  ok(before.includes("w_folder") && !after.includes("w_folder") && !after.includes("w_staging") && after.includes("w_pack") && after.includes("w_welcome"), "a ticked gate item stops blocking; one completed by a document or a send does not tick by hand", { before, after });
  throws(() => ST.skipItem(c, "w_pack", "no time", NOW), /gates the next stage/, "a gate item cannot be skipped, only moved past with a reason");
  throws(() => ST.skipItem(ctxOf(project()), "p_d1", "  ", NOW), /needs a reason/, "skipping needs a reason");
  const sk = ST.skipItem(ctxOf(project({ dates: { proposalSent: "2026-10-05" } })), "p_d1", "They replied the same evening", NOW);
  ok(ST.itemState(ctxOf(sk), ST.ITEM_BY_ID.p_d1).state === "skipped", "a follow-up skipped with a reason");
}
{
  const c = ctxOf(project());
  throws(() => ST.moveToNext(c, NOW, "x"), /They said yes/, "stage 1 ends only with \"They said yes\" or \"They said no\"");
  const yes = ST.saidYes(c.project, NOW);
  ok(yes.stage === "agreement" && yes.dates.yes === "2026-10-05", "They said yes: stage 2, the yes dated");
  throws(() => ST.saidNo(c.project, " ", NOW), /their words/, "They said no needs what tipped it, in their words");
  const no = ST.saidNo(c.project, "The trust board chose to wait a year", NOW);
  ok(no.outcome === "lost" && no.closeReason === "The trust board chose to wait a year" && no.dates.lost === "2026-10-05", "They said no: outcome Lost with the reason");
  const plan = ST.openPlan({ monthlyPlan: false, inIndia: true, leadStatus: "won" });
  ok(plan.project && plan.stage === "agreement" && plan.openedAtWon, "a Won lead opens at stage 2");
  ok(ST.doneBefore({ openedAtWon: true }, "proposal") && !ST.doneBefore({ openedAtWon: false }, "proposal"), "stage 1 of a file opened from a Won lead reads \"Done before the client file\"");
  ok(ST.openPlan({ monthlyPlan: false, inIndia: true, leadStatus: "proposal" }).stage === "proposal", "a lead at Proposal opens at stage 1");
  throws(() => ST.putOnHold(c.project, "client_delay", "", NOW), /why/, "a hold needs a reason");
  const held = ST.putOnHold(c.project, "client_delay", "Waiting on the trust's approval", NOW);
  ok(held.hold === "client_delay" && held.dates.holdSince === "2026-10-05" && TK.healthOf(ctxOf(held)) === "on_hold", "on hold: the kind, since when, health On hold");
  ok(ST.resume(held).hold === null && !ST.resume(held).dates.holdSince, "Resume clears the hold");
  throws(() => ST.closeProject(c.project, "cancelled", "", NOW), /reason/, "Cancelled needs a reason");
  ok(ST.closeProject(c.project, "closed", "", NOW).outcome === "closed", "Closed at stage 12 needs no reason");
}

/* ── B. Item needs (decision 10) ──────────────────────────────────────── */
{
  const c = launchCtx();
  ok(ST.unmetNeeds(c, ST.ITEM_BY_ID.l_cutover).some((n) => n.item === "l_paid"), "l_cutover needs l_paid");
  throws(() => ST.tickChecked(c, "l_cutover", NOW, "09:30"), /Needs the launch payment credited/, "l_cutover cannot be ticked before the launch payment is credited");
  ok(ST.unmetNeeds(c, ST.ITEM_BY_ID.l_verify).some((n) => n.item === "l_cutover"), "l_verify needs l_cutover");
  throws(() => ST.tickLineChecked(c, "l_verify", "https", "2026-11-02", NOW), /Needs the cutover/, "l_verify's lines cannot be ticked before the cutover");
  ok(ST.unmetNeeds(c, ST.ITEM_BY_ID.l_live).some((n) => n.item === "l_verify"), "l_live needs l_verify");
  ok(ST.unmetNeeds(c, ST.ITEM_BY_ID.h_source).some((n) => n.item === "l_paid"), "h_source needs l_paid");
  const admin = { system: "Website admin panel", waitsForPayment: true };
  const registrar = { system: "Domain registrar", waitsForPayment: false };
  ok(ST.accessRowLocked(c, admin) && !ST.accessRowLocked(c, registrar), "the admin-access row waits for l_paid; the registrar row does not");
  const paid = launchCtx({ paid: true });
  ok(ST.isDone(paid, "l_paid") && ST.unmetNeeds(paid, ST.ITEM_BY_ID.l_cutover).length === 0 && !ST.accessRowLocked(paid, admin), "once the launch payment is credited, the cutover and the admin rows open");
  const ticked = ST.tickChecked(paid, "l_cutover", NOW, "09:30");
  ok(ST.isDone(ctxOf(ticked, paid.docs, paid.payments, paid.client, paid.today), "l_cutover"), "the cutover ticks after the payment");
  // Overrides.
  const ovCut = ST.overrideNeed(c.project, "l_cutover", "Board meeting demo; payment promised in writing by Friday", NOW);
  const c2 = { ...c, project: ovCut };
  ok(ST.unmetNeeds(c2, ST.ITEM_BY_ID.l_cutover).length === 0 && ST.itemState(c2, ST.ITEM_BY_ID.l_cutover).overridden?.reason.startsWith("Board meeting"), "l_cutover overridden with its own reason, shown red");
  ok(ST.unmetNeeds(c2, ST.ITEM_BY_ID.h_source).length > 0, "an override of l_cutover does not unlock h_source");
  ok(ST.accessRowLocked(c2, admin), "an override of l_cutover does not unlock the admin-access rows");
  throws(() => ST.overrideNeed(c.project, "h_source", " ", NOW), /written reason/, "an override needs a written reason");
  const ovSrc = ST.overrideNeed(ovCut, "h_source", "Mehdi's note: code to their IT team for the security audit", NOW);
  ok(ST.unmetNeeds({ ...c, project: ovSrc }, ST.ITEM_BY_ID.h_source).length === 0, "h_source unlocks only with its own note");
  // The handover WhatsApp stays blocked under any override.
  const t = TP.TEMPLATE_BY_ID.cp_handover_wa_hi;
  const ovAll = { ...ovSrc, domainInClientName: "from_start", dates: { ...ovSrc.dates, goLive: "2026-11-02", sourceTransferred: "2026-11-02" }, liveUrl: "https://www.school.example.org" };
  const cc = CO.projectCtx(c.client, ovAll, c.docs, c.payments, S, at("2026-11-03"));
  const r1 = CO.renderClientMessage(t, cc);
  ok(CO.checkClientSend(t, r1, cc).blockers.some((b) => /launch payment is not credited/.test(b)), "the handover WhatsApp stays blocked under the overrides: the payment is not credited");
  const cp = CO.projectCtx(paid.client, { ...paid.project, domainInClientName: "unknown", dates: { ...paid.project.dates, goLive: "2026-11-02", sourceTransferred: "2026-11-02" }, liveUrl: "https://www.school.example.org" }, paid.docs, paid.payments, S, at("2026-11-03"));
  ok(CO.checkClientSend(t, CO.renderClientMessage(t, cp), cp).blockers.some((b) => /Yes, from the start/.test(b)), "the handover WhatsApp is blocked until the domain is \"Yes, from the start\"");
  const moved = { ...cp, project: { ...cp.project, domainInClientName: "moved_to_them" } };
  ok(CO.checkClientSend(t, CO.renderClientMessage(t, moved), moved).blockers.some((b) => /write this one by hand/.test(b)), "a domain moved to them during the project: write it by hand");
  const noSrc = { ...cp, project: { ...cp.project, domainInClientName: "from_start", dates: { ...cp.project.dates, sourceTransferred: undefined } } };
  ok(CO.checkClientSend(t, CO.renderClientMessage(t, noSrc), noSrc).blockers.some((b) => /hand it over first/.test(b)), "the handover WhatsApp waits for h_source");
  const good = { ...cp, project: { ...cp.project, domainInClientName: "from_start" } };
  const rg = CO.renderClientMessage(t, good);
  ok(!CO.checkClientSend(t, rg, good).blockers.some((b) => /domain|payment|source/i.test(b)), "with the domain theirs from the start, the payment credited and the code handed over, the truth conditions pass", CO.checkClientSend(t, rg, good).blockers);
  // q_invoice needs q_accepted.
  const rv = ctxOf(project({ stage: "review" }), [pi()], []);
  ok(ST.documentNeeds(rv, "invoice", "LAUNCH_50").some((n) => n.item === "q_accepted"), "the launch invoice cannot be issued before q_accepted");
  const acc = ST.recordApproval(rv.project, { what: "q_accepted", channel: "email", words: "All correct, please go ahead." }, NOW);
  ok(ST.documentNeeds({ ...rv, project: acc }, "invoice", "LAUNCH_50").length === 0 && acc.dates.accepted === "2026-10-05", "after the acceptance (dated), the launch invoice can be issued");
  ok(ST.documentNeeds(rv, "invoice", "AMC").length === 0, "a care plan invoice does not wait for q_accepted");
  // a_partner.
  const ap = ST.ITEM_BY_ID.a_partner;
  const base = project({ stage: "agreement" });
  ok(ST.gateApplies(ctxOf(base), ap), "a_partner gates every agreement while the deed names no signatory");
  const deed = M.mergeClientSettings({ deedNamesSignatory: true });
  ok(ST.gateApplies(ctxOf(base, [], [], client(), "2026-10-05", deed), ap), "after the deed, a blank single-partner limit means always");
  const lim = M.mergeClientSettings({ deedNamesSignatory: true, policy: { singlePartnerLimit: 50000 } });
  ok(!ST.gateApplies(ctxOf(base, [], [], client(), "2026-10-05", lim), ap), "after the deed, a fee under the limit needs one partner");
  ok(ST.gateApplies(ctxOf(project({ stage: "agreement", lines: [{ description: "Portal", qty: 1, unit: "project", rate: 60000 }] }), [], [], client(), "2026-10-05", lim), ap), "above the limit: the other partner");
  ok(ST.gateApplies(ctxOf({ ...base, discount: { amount: 500, reason: "case_study", partnerApprovedAt: "2026-10-04", channel: "WhatsApp" } }, [], [], client(), "2026-10-05", lim), ap), "a discount always needs the other partner");
  ok(ST.gateApplies(ctxOf({ ...base, splitAdvance: { partnerApprovedAt: "2026-10-04", channel: "WhatsApp", part1: 0, part2: 0, part2DueOn: "2026-10-20" } }, [], [], client(), "2026-10-05", lim), ap), "a split advance always needs the other partner");
  ok(ST.gateApplies(ctxOf({ ...base, nda: "theirs_checked" }, [], [], client(), "2026-10-05", lim), ap), "their own NDA always needs the other partner");
}

/* ── C. Opening a file ───────────────────────────────────────────────── */
{
  const m = ST.openPlan({ monthlyPlan: true, inIndia: true, leadStatus: "proposal" });
  ok(!m.project && /Add the client instead/.test(m.note), "a monthly plan opens no project file and offers Add client");
  const ab = ST.openPlan({ monthlyPlan: false, inIndia: false });
  ok(ab.project && ab.note === "Clients outside India: the MSA and the export invoice in 03-legal-docs govern (not in the CRM yet).", "a client outside India keeps the project file, with the line");
  const lead = { leadId: "ol_9", inIndia: true, project: { name: "x" }, lead: { instituteName: "Example Coaching", kind: "coaching", language: "hi", status: "proposal", contactName: "Ravi" } };
  ok(M.clientFromLead(lead, NOW).language === "hinglish", "a lead in \"hi\" opens in \"hinglish\"");
  ok(M.clientFromLead({ ...lead, lead: { ...lead.lead, status: "do_not_contact" } }, NOW).dnc === true, "do-not-contact comes along");
  const abroad = client({ inIndia: false });
  const t = TP.TEMPLATE_BY_ID.cp_agreement_paperwork_em_en;
  const c = CO.projectCtx(abroad, project({ stage: "agreement" }), [pi()], [], S, NOW);
  ok(CO.checkClientSend(t, CO.renderClientMessage(t, c), c).blockers.some((b) => /outside India/.test(b)), "a client outside India: the paperwork e-mail (money) is blocked");
  const tw = TP.TEMPLATE_BY_ID.cp_kickoff_summary_em_en;
  ok(!CO.checkClientSend(tw, CO.renderClientMessage(tw, c), c).blockers.some((b) => /outside India/.test(b)), "a client outside India: a message with no money is not blocked for it");
}

/* ── D. Due rules ─────────────────────────────────────────────────────── */
ok(NU.weekdayOf("2026-10-05") === 1 && NU.weekdayOf("2026-10-10") === 6 && NU.weekdayOf("2026-10-11") === 0, "5 Oct 2026 is a Monday, 10 Oct a Saturday, 11 Oct a Sunday");
ok(NU.isWorkingDay("2026-10-10") && !NU.isWorkingDay("2026-10-11"), "Saturday is a working day, Sunday is not");
ok(NU.addWorkingDays("2026-10-10", 1) === "2026-10-12" && NU.addWorkingDays("2026-10-09", 3) === "2026-10-13", "working days skip the Sunday");
ok(NU.workingDaysBetween ? NU.workingDaysBetween("2026-10-09", "2026-10-13") === 3 : true, "working days between Friday and Tuesday: 3");
ok(NU.fyOf("2027-03-31") === "2026-27" && NU.fyOf("2027-04-01") === "2027-28", "the year turns on 1 April");
ok(NU.indiaDate(new Date("2027-03-31T18:31:00Z")) === "2027-04-01" && NU.indiaDate(new Date("2027-03-31T18:29:00Z")) === "2027-03-31", "the India date of an instant either side of 18:30 UTC on 31 March");
ok(NU.addDays("2027-03-31", 1) === "2027-04-01" && NU.daysBetween("2027-03-25", "2027-04-04") === 10, "dates across 31 March into 1 April");
{
  const p = project({ dates: { call: "2026-10-03", proposalSent: "2026-10-05" } });
  const c = ctxOf(p);
  const due = Object.fromEntries(["p_brief", "p_quote", "p_d1", "p_d3", "p_d5", "p_d7", "p_d14", "p_d21", "p_d30"].map((id) => [id, TK.itemDue(c, id)]));
  ok(JSON.stringify(due) === JSON.stringify({ p_brief: "2026-10-03", p_quote: "2026-10-04", p_d1: "2026-10-06", p_d3: "2026-10-08", p_d5: "2026-10-10", p_d7: "2026-10-12", p_d14: "2026-10-19", p_d21: "2026-10-26", p_d30: "2026-11-04" }), "the proposal ladder: call, call + 1, then day 1, 3, 5, 7, 14, 21, 30 from sent", due);
  const t = TK.projectTasks({ ...c, today: "2026-10-08" });
  ok(t.some((x) => x.itemId === "p_d3" && x.due === "2026-10-08"), "day 3 is in the tasks on day 3");
  ok(TK.dueToday(t, "2026-10-08", () => undefined).some((x) => x.itemId === "p_d3"), "and in Today");
  const yes = ST.saidYes(p, NOW);
  ok(!TK.projectTasks(ctxOf(yes, [], [], client(), "2026-10-20")).some((x) => /^p_d/.test(x.itemId || "")), "the follow-ups stop at the yes");
}
{
  // The advance ladder.
  const d = pi();
  const base = project({ stage: "agreement" });
  const tasksOn = (p, day) => TK.moneyTasks(ctxOf(p, [d], [], client(), day));
  const a1 = tasksOn(base, "2026-10-14").find((x) => /^A1/.test(x.label));
  ok(a1 && a1.due === "2026-10-14" && a1.action.templateId === "cp_agreement_a1_wa_hi" && a1.action.alsoTemplateId === "cp_invoice_m1_em_en", "A1 on due + 1, WhatsApp then e-mail", a1);
  const s1 = { ...base, sends: [{ t: "cp_agreement_a1_wa_hi", at: at("2026-10-14").toISOString(), ch: "whatsapp", doc: d.id }] };
  ok(tasksOn(s1, "2026-10-19").some((x) => /^A2/.test(x.label) && x.due === "2026-10-19"), "A2 on due + 6");
  const s2 = { ...s1, sends: [...s1.sends, { t: "cp_agreement_a2_em_en", at: at("2026-10-19").toISOString(), ch: "email", doc: d.id }] };
  ok(tasksOn(s2, "2026-10-23").some((x) => /^A3/.test(x.label) && x.due === "2026-10-23"), "A3 on due + 10");
  const s3 = { ...s2, sends: [...s2.sends, { t: "cp_agreement_a3_em_en", at: at("2026-10-23").toISOString(), ch: "email", doc: d.id }] };
  ok(tasksOn(s3, "2026-10-24").some((x) => x.action.type === "hold" && x.action.hold === "no_advance"), "then Release the slot (hold \"no advance\")");
  ok(tasksOn(base, "2026-10-22").some((x) => /expired on 21 Oct 2026: reissue it/.test(x.label)), "proforma validity: expired after valid_until");
  const paid = TK.moneyTasks(ctxOf(base, [d], [pay({ againstDoc: d.id, amount: 9000 })], client(), "2026-10-20"));
  ok(paid.length === 0, "a paid proforma has no ladder");
}
{
  // The launch ladder and the termination right.
  const i0 = inv();
  const p = project({ stage: "launch" });
  const on = (pp, day) => TK.moneyTasks(ctxOf(pp, [i0], [], client(), day));
  ok(on(p, "2026-11-07").some((x) => /^M1/.test(x.label) && x.due === "2026-11-07"), "M1 on due + 1");
  const m1 = { ...p, sends: [{ t: "cp_launch_m1_wa_hi", at: at("2026-11-07").toISOString(), ch: "whatsapp", doc: i0.id }] };
  const m2 = on(m1, "2026-11-13").find((x) => /^M2/.test(x.label));
  ok(m2 && m2.due === "2026-11-13" && /stop date 16 Nov 2026/.test(m2.label), "M2 on due + 7, naming the stop date due + 10", m2?.label);
  const m2s = { ...m1, sends: [...m1.sends, { t: "cp_launch_m2_em_en", at: at("2026-11-13").toISOString(), ch: "email", doc: i0.id }] };
  ok(on(m2s, "2026-11-16").some((x) => /work-pause notice/.test(x.label) && x.due === "2026-11-16"), "the pause notice on due + 10");
  const ps = { ...m2s, sends: [...m2s.sends, { t: "cp_launch_pause_em_en", at: at("2026-11-16").toISOString(), ch: "email", doc: i0.id }] };
  ok(on(ps, "2026-11-21").some((x) => /^M3/.test(x.label) && x.due === "2026-11-21"), "M3 on due + 15");
  ok(TK.terminationRightFrom(i0) === "2026-12-07", "the termination right from invoice day + 38");
  const afterPause = CO.afterSend(m2s, TP.TEMPLATE_BY_ID.cp_launch_pause_em_en, "email", { docId: i0.id }, at("2026-11-16"));
  ok(afterPause.hold === "non_payment" && afterPause.dates.paused === "2026-11-16", "sending the pause notice puts the project on hold (non-payment)");
}
{
  // The waiting ladder, from a Saturday.
  const p = project({ stage: "agreement", dates: { yes: "2026-10-09", paperworkSent: "2026-10-10" } });
  const t = TK.projectTasks(ctxOf(p, [], [], client(), "2026-10-14")).filter((x) => x.label.startsWith("Waiting"));
  ok(t.some((x) => x.due === "2026-10-14" && x.action.templateId === "cp_chase_d3_wa_hi"), "waiting 3 working days from a Saturday: the Wednesday (the Sunday skipped)", t.map((x) => [x.label, x.due]));
}
{
  // Weekly update.
  const p = project({ stage: "build", weeklyUpdateDay: 5, dates: { devStart: "2026-10-12" } });
  const t = TK.projectTasks(ctxOf(p, [], [], client(), "2026-10-17"));
  ok(t.some((x) => /weekly update/.test(x.label) && x.due === "2026-10-16"), "the weekly update on the agreed Friday", t.filter((x) => /weekly/.test(x.label)));
  const sent = { ...p, sends: [{ t: "cp_build_weekly_em_en", at: at("2026-10-16").toISOString(), ch: "email" }] };
  ok(!TK.projectTasks(ctxOf(sent, [], [], client(), "2026-10-17")).some((x) => /weekly update/.test(x.label)), "sent that week: no task");
}
{
  // Support window and the feedback asks.
  const p = project({ stage: "support", dates: { goLive: "2026-11-02" } });
  const c = ctxOf(p, [], [], client(), "2026-11-03");
  ok(TK.itemDue(c, "s_day7") === "2026-11-09" && TK.itemDue(c, "s_day25") === "2026-11-27" && TK.itemDue(c, "s_close") === "2026-12-02", "day 7, day 25 (end - 5) and day 30 from the start");
  ok(TK.itemDue(c, "s_testimonial") === "2026-11-03" && TK.itemDue(c, "s_review") === "2026-11-09", "testimonial go-live + 1; review go-live + 7 (no approved quote)");
  ok(TK.itemDue(c, "s_referral") === "2026-11-12", "referral at the earliest go-live + 10");
  const withS1 = { ...p, issues: [{ id: "i1", at: "2026-11-02T10:00:00Z", channel: "email", summary: "Form fails", severity: "S1", cover: "defect", minutes: 30, status: "open" }] };
  ok(TK.itemDue(ctxOf(withS1), "s_testimonial") === null, "no feedback ask date while an S1 is open");
  const closed = { ...p, issues: [{ id: "i1", at: "2026-11-02T10:00:00Z", channel: "email", summary: "Form fails", severity: "S2", cover: "defect", minutes: 30, status: "closed", closedAt: "2026-11-05T06:00:00Z" }] };
  ok(TK.itemDue(ctxOf(closed), "s_review") === "2026-11-12", "the review ask moves to 7 days after an S2 closed", TK.itemDue(ctxOf(closed), "s_review"));
  // A money day moves the ask.
  const i0 = inv({ issuedOn: "2026-10-30", dueOn: "2026-11-06" });
  const md = ctxOf({ ...p, dates: { goLive: "2026-10-31" } }, [i0], [], client(), "2026-11-07");
  ok(TK.itemDue(md, "s_review") === "2026-11-08", "the review ask never on the day of a payment chase (M1 on 7 Nov): the next clear day", TK.itemDue(md, "s_review"));
  const tt = TP.TEMPLATE_BY_ID.cp_feedback_review_wa_hi;
  const cm = CO.projectCtx(md.client, md.project, md.docs, md.payments, S, at("2026-11-07"));
  ok(CO.checkClientSend(tt, CO.renderClientMessage(tt, cm), cm).blockers.some((b) => /reads as a condition of being paid/.test(b)), "and the send is blocked on a money day");
  const cs = CO.projectCtx(client(), withS1, [], [], S, at("2026-11-09"));
  ok(CO.checkClientSend(tt, CO.renderClientMessage(tt, cs), cs).blockers.some((b) => /broken/.test(b)), "and while an S1 or S2 is open");
  const declined = client({ testimonial: { status: "declined", declinedAt: "2026-09-01T06:00:00Z" } });
  const tm = TP.TEMPLATE_BY_ID.cp_feedback_testimonial_wa_hi;
  const cd = CO.projectCtx(declined, p, [], [], S, at("2026-11-10"));
  ok(CO.checkClientSend(tm, CO.renderClientMessage(tm, cd), cd).blockers.some((b) => /90 days/.test(b)), "no testimonial ask within 90 days of a decline");
  const cd2 = CO.projectCtx(client({ testimonial: { status: "declined", declinedAt: "2026-06-01T06:00:00Z" } }), p, [], [], S, at("2026-11-10"));
  ok(!CO.checkClientSend(tm, CO.renderClientMessage(tm, cd2), cd2).blockers.some((b) => /90 days/.test(b)), "after 90 days it may be asked again");
}
{
  // Split advance part 2 and its own A1 (never A2 or A3).
  const split = { partnerApprovedAt: "2026-10-04", channel: "WhatsApp", part1: 0, part2: 0, part2DueOn: "2026-10-20" };
  const p1 = pi({ amount: 4500, data: { part: 1 } });
  const paid1 = pay({ againstDoc: p1.id, amount: 4500 });
  const p = project({ stage: "content", splitAdvance: split });
  const t = TK.moneyTasks(ctxOf(p, [p1], [paid1], client(), "2026-10-20"));
  ok(t.some((x) => x.id.endsWith(":split2") && x.due === "2026-10-20" && x.action.part === 2), "split advance: issue part 2 on its agreed date");
  const p2 = pi({ id: "dc_part2", number: "IDV/PI/2026-27/002", amount: 4500, issuedOn: "2026-10-20", dueOn: "2026-10-27", validUntil: "2026-11-04", data: { part: 2 } });
  const t2 = TK.moneyTasks(ctxOf(p, [p1, p2], [paid1], client(), "2026-10-28"));
  ok(t2.some((x) => /^A1: IDV\/PI\/2026-27\/002/.test(x.label) && x.action.templateId === "cp_agreement_a1_wa_hi" && x.due === "2026-10-28"), "part 2 is chased by A1 on due + 1", t2.map((x) => x.label));
  const s = { ...p, sends: [{ t: "cp_agreement_a1_wa_hi", at: at("2026-10-28").toISOString(), ch: "whatsapp", doc: p2.id }] };
  const t3 = TK.moneyTasks(ctxOf(s, [p1, p2], [paid1], client(), "2026-11-03"));
  ok(t3.some((x) => /^M2/.test(x.label)) && !t3.some((x) => /^A2|^A3/.test(x.label)), "then M2, never A2 or A3 (work has started)", t3.map((x) => x.label));
  ok(MO.splitParts(p).part1 === 4500 && MO.splitParts(p).part2 === 4500, "the split parts of a 9,000 advance");
}
{
  // TDS, Lost records, renewals, domain, win-back, snooze.
  const d = pi();
  const tp = pay({ againstDoc: d.id, amount: 8100, tds: 900, receivedOn: "2026-10-07" });
  const t = TK.projectTasks(ctxOf(project({ stage: "welcome" }), [d, rc(tp)], [tp], client(), "2027-01-07"));
  ok(t.some((x) => /TDS certificate/.test(x.label) && x.due === "2027-01-07"), "TDS: three months after the payment, the certificate");
  const lost = { ...project({ sends: [{ t: "cp_proposal_d30_em_en", at: at("2026-11-04").toISOString(), ch: "email" }] }), outcome: "lost", dates: { lost: "2026-11-10" } };
  ok(TK.projectTasks(ctxOf(lost)).some((x) => x.id.endsWith(":records24") && x.due === "2028-11-04"), "a Lost file: delete or anonymise 24 months after the last message");
  const planCl = client({ carePlan: { plan: "growth", billing: "annual", fee: 20000, startOn: "2026-12-03", renewalOn: "2027-12-03", status: "active" } });
  const ct = TK.clientTasks({ client: planCl, docs: [], payments: [], handoverIssued: true, today: "2027-10-19" });
  const due = (re) => ct.find((x) => re.test(x.label))?.due;
  ok(due(/T-45/) === "2027-10-19" && due(/T-30/) === "2027-11-03" && due(/T-14/) === "2027-11-19", "the renewal ladder: T-45, T-30, T-14 (issue the invoice)");
  ok(due(/T\+3/) === "2027-12-06" && due(/T\+7/) === "2027-12-10" && due(/T\+30/) === "2028-01-02", "then T+3 a call, T+7 the grace note, T+30 the handover pack");
  const dom = client({ renewals: { domain: { renewsOn: "2027-09-30" } } });
  const dt = TK.clientTasks({ client: dom, docs: [], payments: [], handoverIssued: true, today: "2027-08-31" });
  ok(dt.some((x) => /courtesy reminder/.test(x.label) && x.due === "2027-08-31" && x.action.templateId === "cp_renewal_domain_wa_hi"), "a domain without a care plan: one courtesy reminder 30 days before");
  const watched = client({ custodyModel: "ideovent_managed", renewals: { domain: { renewsOn: "2027-09-30" } } });
  const wt = TK.clientTasks({ client: watched, docs: [], payments: [], handoverIssued: true, today: "2027-08-01" });
  ok(["2027-08-01", "2027-08-31", "2027-09-16", "2027-09-23", "2027-09-30", "2027-10-01"].every((d) => wt.some((x) => x.due === d)), "held by Ideovent: 60, 30, 14, 7 days before, on the date, after", wt.map((x) => x.due));
  const ex = TK.clientTasks({ client: client({ exitedOn: "2026-12-03" }), docs: [], payments: [], handoverIssued: true, today: "2027-06-01" });
  ok(ex.some((x) => x.id.endsWith(":winback") && x.due === "2027-06-01") && ex.some((x) => x.id.endsWith(":records3y") && x.due === "2029-12-03"), "after the exit: win-back at + 180 days, records at + 3 years");
  const snooze = { [ex[0].id]: "2027-06-02" };
  ok(TK.dueToday(ex, "2027-06-01", () => snooze).length === ex.filter((x) => x.due <= "2027-06-01").length - 1, "a snoozed task leaves Today until its day");
}
{
  // Health and next action.
  const p = project({ stage: "welcome" });
  const c = ctxOf(p, [], [], client(), "2026-10-05");
  ok(TK.healthOf(c) === "on_track", "on track with nothing late");
  const late = ctxOf(project({ stage: "agreement", dates: { yes: "2026-09-28" } }), [], [], client(), "2026-10-05");
  ok(TK.healthOf(late) === "overdue", "overdue when an Ideovent task is late");
  const overdueDoc = ctxOf(project({ stage: "launch" }), [inv({ dueOn: "2026-10-01" })], [], client(), "2026-10-05");
  ok(TK.healthOf(overdueDoc) === "overdue", "overdue when an invoice is past due with a balance");
  const waiting = ctxOf(project({ stage: "kickoff", checklist: { k_call: { state: "done", at: NOW.toISOString() }, k_summary: { state: "done", at: NOW.toISOString() } }, pointOfContact: "Asha", escalationContact: "Ravi", commsChannel: "WhatsApp", weeklyUpdateDay: 5, dates: { devStart: "2026-10-12", contentCutoff: "2026-10-20", goLiveTarget: "2026-11-30" }, content: [{ id: "logo_vector", label: "Logo", status: "not_started" }], sends: [] }), [], [], client(), "2026-10-05");
  const nx = TK.nextAction(waiting);
  ok(nx && nx.itemId === "k_A", "the Next: line names the first open gate item", nx);
}

/* ── E. Money ─────────────────────────────────────────────────────────── */
ok(MO.advanceOf(18000) === 9000 && MO.balanceAtLaunchOf(18000) === 9000, "50/50 of 18,000");
ok(MO.advanceOf(18001) === 9001 && MO.balanceAtLaunchOf(18001) === 9000, "50/50 of 18,001: the extra rupee in the advance");
ok(MO.advanceOf(12500) === 6250 && MO.balanceAtLaunchOf(12500) === 6250, "50/50 of 12,500");
{
  const p = project({
    splitAdvance: { partnerApprovedAt: "2026-10-04", channel: "WhatsApp", part1: 0, part2: 0, part2DueOn: "2026-10-20" },
    changeRequests: [{ no: "CR-01", raisedAt: "2026-10-20T06:00:00Z", description: "Gallery page", reason: "Asked at review", scopeImpact: "One page", days: 2, cost: 3000, advanceDue: 0, status: "approved" }],
  });
  const a1 = pi({ amount: 4500, data: { part: 1 } });
  const a2 = pi({ number: "IDV/PI/2026-27/002", amount: 4500, data: { part: 2 }, issuedOn: "2026-10-20" });
  const pa1 = pay({ againstDoc: a1.id, amount: 4500, receivedOn: "2026-10-07" });
  const pa2 = pay({ againstDoc: a2.id, amount: 4050, tds: 450, receivedOn: "2026-10-22" });
  const wtd = inv({ number: "IDV/2026-27/001", milestone: "OTHER", amount: 2000, issuedOn: "2026-10-25", data: { workToDate: true } });
  const li = MO.buildLaunchInvoice(p, [a1, a2, wtd], [pa1, pa2], NU.fmtDate);
  ok(li.subtotal === 21000 && li.lines.some((l) => /^CR-01: Gallery page/.test(l.description)), "the launch invoice: the fee and the approved CR", li);
  ok(li.less.length === 3 && li.less[0].label === "Less: advance received 7 Oct 2026" && li.less[1].amount === 4500 && li.less[2].label === "Less: invoiced earlier IDV/2026-27/001", "two advances (TDS counted) and the earlier work-to-date invoice", li.less);
  ok(li.totalDue === 10000, "total due 21,000 - 4,500 - 4,500 - 2,000 = 10,000", li.totalDue);
  const launch = inv({ number: "IDV/2026-27/002", amount: li.totalDue });
  ok(MO.outstandingOf([a1, a2, wtd], [pa1, pa2]) === 2000 && MO.outstandingOf([a1, a2, wtd, launch], [pa1, pa2]) === 12000, "outstanding counts proformas only until the launch invoice bills them", [MO.outstandingOf([a1, a2, wtd], [pa1, pa2]), MO.outstandingOf([a1, a2, wtd, launch], [pa1, pa2])]);
  ok(MO.receivedIn([pa1, pa2], "2026-10") === 8550 && MO.receivedIn([pa1, { ...pa2, status: "voided" }], "2026-10") === 4500, "received counts the amounts credited, never TDS, never a voided payment");
  ok(MO.isPaid(a2, [a2], [pa2]), "a document is paid when amount + TDS reach it");
  const cn = doc({ kind: "credit_note", series: "CN", amount: 500, relatedDoc: launch.id });
  ok(MO.docBalance(launch, [launch, cn], []) === 9500, "a credit note reduces the balance");
  ok(MO.excessOf(11000, 0, launch, [launch], []) === 1000 && MO.excessOf(9000, 0, launch, [launch], []) === 0, "an over-payment is the amount above the open balance (it needs its note)");
  const lp1 = pay({ againstDoc: launch.id, amount: 4000, receivedOn: "2026-11-01" });
  const lp2 = pay({ againstDoc: launch.id, amount: 6000, receivedOn: "2026-11-05" });
  const other = pay({ againstDoc: a1.id, amount: 100, receivedOn: "2026-11-02" });
  const rf = MO.receiptFigures(lp2, launch, [launch], [lp1, lp2, other]);
  ok(rf.value === 10000 && rf.earlier === 4000 && rf.now === 6000 && rf.balance === 0, "the receipt's figures: the document's value, earlier payments against that document only", rf);
}
ok(MO.wordsIndian(0) === "zero" && MO.wordsIndian(18000) === "eighteen thousand" && MO.wordsIndian(123456) === "one lakh twenty-three thousand four hundred and fifty-six" && MO.wordsIndian(10000000) === "one crore", "words_indian: 0, 18,000, 1,23,456, 1,00,00,000");
ok(MO.moneyFmt(18000) === "18,000.00" && MO.inrGroup(1234567) === "12,34,567", "the money format and the Indian grouping");
{
  const p = { lines: [{ description: "Website", qty: 1, unit: "project", rate: 18000 }], kind: "website", packageLabel: "Website Professional", fee: null };
  const ok5 = { amount: 900, reason: "case_study", partnerApprovedAt: "2026-10-04", channel: "WhatsApp" };
  ok(MO.discountProblems(p, ok5).length === 0, "a 5% case-study discount with the other partner's yes is allowed");
  ok(MO.discountProblems(p, { ...ok5, amount: 901 }).some((x) => /At most 5%/.test(x)), "never above floor(5%)");
  ok(MO.discountProblems(p, { ...ok5, reason: "goodwill" }).some((x) => /only for a named case study or a second project/.test(x)), "only the two trades");
  ok(MO.discountProblems(p, { ...ok5, partnerApprovedAt: "" }).some((x) => /other partner's written yes/.test(x)), "always the other partner's written yes");
  ok(MO.discountProblems({ ...p, packageLabel: "Website Essential" }, { ...ok5, amount: 100 }).some((x) => /Essential/.test(x)), "never on an Essential tier");
  ok(MO.discountProblems({ ...p, lines: [{ description: "x", qty: 1, unit: "p", rate: 12000 }], packageLabel: "" }, { ...ok5, amount: 100 }).some((x) => /Essential/.test(x)), "never at or below the band's floor");
  ok(MO.discountProblems(p, ok5, { carePlan: true }).some((x) => /care plan/.test(x)), "never on a care plan");
  ok(MO.discountProblems({ ...p, splitAdvance: { part2DueOn: "2026-10-20" } }, ok5).some((x) => /One concession/.test(x)), "one concession, never two");
  ok(MO.walkAwayWarning("website", 10000) !== null && MO.walkAwayWarning("website", 12000) === null, "below the floor: the walk-away line");
}

/* ── F. Messages ───────────────────────────────────────────────────────── */
const T = TP.CLIENT_TEMPLATES;
ok(T.length === 104 && new Set(T.map((t) => t.id)).size === T.length, "104 client templates, unique ids", T.length);
const full = (kind, language) => {
  const cl = client({ kind, language, website: "https://old.example.org", renewals: { domain: { provider: "Example Registrar", renewsOn: "2027-09-30" } }, carePlan: { plan: "growth", billing: "annual", fee: 20000, startOn: "2026-12-03", renewalOn: "2027-12-03", status: "active" }, testimonial: { status: "permission_on_file", quote: "They listened.", consentAt: "2026-11-12T06:00:00Z" } });
  const p0 = pi();
  const pp = pay({ againstDoc: p0.id, amount: 9000 });
  const i0 = inv();
  const docs = [p0, rc(pp), i0, doc({ kind: "quotation", series: "Q", number: "IDV/Q/2026-27/001", amount: 18000, validUntil: "2026-10-20" }), doc({ kind: "welcome", series: null, number: null }), doc({ kind: "handover", series: null, number: null })];
  const p = project({
    stage: "support", proposalNo: "PROP-01", sowRef: "SOW-01", stagingUrl: "https://staging.example.org", liveUrl: "https://www.school.example.org", domainName: "school.example.org",
    pointOfContact: "Asha Rao", escalationContact: "Ravi Menon", commsChannel: "WhatsApp", weeklyUpdateDay: 5, kickoffTime: "11:00", goLiveTime: "10:00",
    dates: { call: "2026-10-01", proposalSent: "2026-10-05", yes: "2026-10-06", effective: "2026-10-06", kickoff: "2026-10-08", devStart: "2026-10-12", contentCutoff: "2026-10-20", buildStart: "2026-10-22", goLiveTarget: "2026-11-02", goLive: "2026-11-02", designApproved: "2026-10-21", handover: "2026-11-03", sourceTransferred: "2026-11-03", accessRemoved: "2026-12-03", reviewNotice: "2026-10-19" },
    rounds: [{ stage: "Design", n: 1, sentAt: "2026-10-14T06:00:00Z", reviewLink: "https://figma.example.org/r1" }, { stage: "Design", n: 2, sentAt: "2026-10-18T06:00:00Z", reviewLink: "https://figma.example.org/r2" }],
    changeRequests: [{ no: "CR-01", raisedAt: "2026-10-20T06:00:00Z", description: "Gallery page", reason: "Asked at review", scopeImpact: "One page", days: 2, cost: 3000, advanceDue: 1500, status: "sent", lapsesOn: "2026-10-27" }],
    issues: [{ id: "i1", at: "2026-11-04T06:00:00Z", channel: "email", summary: "Typo on the fees page", severity: "S3", cover: "defect", minutes: 15, status: "closed", closedAt: "2026-11-04T08:00:00Z", done: "Fixed" }],
  });
  return CO.projectCtx(cl, p, docs, [pp], M.mergeClientSettings({ policy: { removalDays: 7, projectReplyTarget: "4 hours" } }), at("2026-11-05"));
};
const empty = (kind, language) => CO.projectCtx(client({ kind, language, contactName: "", legalName: "", signatoryName: "", email: "", phone: "", whatsapp: "" }), project({ lines: [], durationWeeks: undefined }), [], [], S, at("2026-11-05"));
let renders = 0;
const leftovers = [];
for (const kind of ["school", "coaching", "dental", "other"]) {
  for (const language of ["hinglish", "en"]) {
    for (const t of T) {
      for (const [name, ctx] of [["full", full(kind, language)], ["empty", empty(kind, language)]]) {
        const r = CO.renderClientMessage(t, ctx);
        renders++;
        const text = `${r.subject || ""}\n${r.body}`;
        if (r.unknown.length) leftovers.push(`${t.id} (${kind}/${language}/${name}): unknown ${r.unknown.join(", ")}`);
        if (/\{\w+\}/.test(text)) leftovers.push(`${t.id} (${kind}/${language}/${name}): a {field} left`);
        if (text.includes("[[")) leftovers.push(`${t.id}: "[[" left`);
        if (/[–—]/.test(text)) leftovers.push(`${t.id}: a dash`);
        if (text.includes("₹")) leftovers.push(`${t.id}: a rupee sign`);
        if (name === "empty" && /\bSir\b|Principal ji|\bDoctor\b/.test(text.replace(/[Ss]ir,? (?:main|aap)/g, ""))) leftovers.push(`${t.id} (${kind}): a no-name fallback ("Sir", "Principal ji", "Doctor")`);
      }
    }
  }
}
ok(leftovers.length === 0, `all ${T.length} templates render for every kind and language, full and empty (${renders} renders): no {field}, no "[[", no dash, no rupee sign, no "Sir"`, leftovers.slice(0, 12));
{
  const t = TP.TEMPLATE_BY_ID.cp_kickoff_summary_em_en;
  const c = empty("school", "en");
  const r = CO.renderClientMessage(t, c);
  ok(r.body.includes("[contact name]") || (r.subject || "").includes("[contact name]"), "a client with no contact name gets [contact name]");
  ok(r.blanks.length > 0 && CO.checkClientSend(t, r, c).blockers.some((b) => b.startsWith("Fill in")), "a blank blocks the send");
  ok(CO.checkClientSend(t, r, c).blockers.some((b) => /No e-mail address/.test(b)), "no e-mail address: blocked");
}
{
  // The needs conditions.
  const c = full("school", "hinglish");
  const d25 = TP.TEMPLATE_BY_ID.cp_support_day25_wa_hi;
  const open = { ...c, project: { ...c.project, carePlanDecision: "none", issues: [{ id: "i2", at: "2026-11-20T06:00:00Z", channel: "email", summary: "Menu overlaps", severity: "S3", cover: "defect", minutes: 15, status: "open" }] } };
  ok(CO.checkClientSend(d25, CO.renderClientMessage(d25, open), open).blockers.some((b) => /close the open issues first/.test(b)), "day 25 is blocked while an issue is open");
  const t0 = TP.TEMPLATE_BY_ID.cp_care_t0_em_en;
  const cc = CO.clientCtx(c.client, [doc({ kind: "invoice", projectId: null, milestone: "AMC", series: "INV", number: "IDV/2026-27/009", amount: 20000, issuedOn: "2027-11-19", dueOn: "2027-11-26" })], [], S, at("2027-12-03"));
  ok(CO.checkClientSend(t0, CO.renderClientMessage(t0, cc), cc).blockers.some((b) => /cover begins when the payment is received/.test(b)), "T-0 is blocked before the renewal is paid");
  const paper = TP.TEMPLATE_BY_ID.cp_agreement_paperwork_em_en;
  const noPi = CO.projectCtx(c.client, project({ stage: "agreement" }), [], [], S, at("2026-10-06"));
  const rp = CO.renderClientMessage(paper, noPi);
  ok(CO.checkClientSend(paper, rp, noPi).blockers.some((b) => /Issue the proforma first/.test(b)), "an e-mail whose attachment is not issued is blocked", CO.checkClientSend(paper, rp, noPi).blockers);
  const withPi = CO.projectCtx(c.client, project({ stage: "agreement" }), [pi()], [], S, at("2026-10-06"));
  const rw = CO.renderClientMessage(paper, withPi);
  ok(CO.checkClientSend(paper, rw, withPi).blockers.some((b) => /I attached/.test(b)) && !CO.checkClientSend(paper, rw, withPi, { attachedConfirmed: true }).blockers.some((b) => /I attached/.test(b)), "and waits for the \"I attached\" tick");
}
{
  // Suggestions never a price list.
  const tiers = Object.values(M.ONE_TIME).flatMap((b) => b.tiers).map((n) => MO.inrGroup(n));
  const c = CO.projectCtx(client(), project({ lines: [{ description: "Website", qty: 1, unit: "project", rate: 14750 }] }), [], [], S, NOW);
  const s = CO.clientSuggestionsFor("amount", c);
  ok(s.length > 0 && s.every((x) => !tiers.includes(x)) && s.includes("14,750") && s.includes("7,375"), "amount suggestions are the project's own figures, never a pricing.ts tier", s);
  ok(CO.clientSuggestionsFor("amount", CO.projectCtx(client(), project({ lines: [] }), [], [], S, NOW)).length === 0, "no fee yet: no amount suggestion at all");
  const days = CO.clientSuggestionsFor("date", c);
  ok(days.length === 6 && days.every((x) => !/^Sunday/.test(x)), "date suggestions: the next six working days", days);
}
{
  // Endings.
  const sig = M.DEFAULT_SIGNATURE;
  for (const id of ["cp_proposal_send_em_en", "cp_proposal_send_em_hi"]) {
    const r = CO.renderClientMessage(TP.TEMPLATE_BY_ID[id], full("school", "en"));
    ok(r.body.endsWith(`Regards,\n${sig}`), `${id} ends with "Regards," and the signature`);
  }
  const added = T.filter((t) => t.channel === "email" && !t.engineEnding).filter((t) => CO.renderClientMessage(t, full("school", "en")).body.includes(sig));
  ok(added.length === 0, "no other e-mail gets an ending added", added.map((t) => t.id));
  const fromEngine = T.filter((t) => t.channel === "email" && t.source.startsWith("src/lib/outreach/templates.ts")).map((t) => t.id).sort().join();
  ok(T.filter((t) => t.engineEnding).map((t) => t.id).sort().join() === fromEngine && fromEngine.includes("cp_proposal_send_em_en"), "exactly the e-mails taken from templates.ts take the engine's ending", T.filter((t) => t.engineEnding).map((t) => t.id));
}
{
  // E3's cuts, E7's line, sources, approvals, asks.
  const e3 = T.filter((t) => (t.edits || []).includes("E3"));
  ok(e3.length >= 3, "E3 templates exist", e3.map((t) => t.id));
  for (const kind of ["dental", "other"]) {
    const bad = e3.filter((t) => /session|admission|school ke email/i.test(CO.renderClientMessage(t, full(kind, t.language)).body));
    ok(bad.length === 0, `E3 for a ${kind} client: no "session", "admission" or "school ke email"`, bad.map((t) => t.id));
  }
  ok(/\{supportEndDate\} tak/.test(TP.TEMPLATE_BY_ID.cp_handover_wa_hi.body), "E7: the handover WhatsApp says \"{supportEndDate} tak\"");
  ok(T.every((t) => t.source && (t.textKind === "N" || t.src || /^src\/lib\/outreach\/templates\.ts/.test(t.source))), "every S and E template carries its source", T.filter((t) => !(t.source && (t.textKind === "N" || t.src || /^src\/lib\/outreach\/templates\.ts/.test(t.source)))).map((t) => t.id));
  ok(T.filter((t) => t.textKind === "E").every((t) => (t.edits || []).length > 0), "every E template names its edit");
  const nw = T.filter((t) => t.textKind !== "S");
  const unapproved = nw.filter((t) => !CO.checkClientSend(t, CO.renderClientMessage(t, full("school", t.language)), full("school", t.language)).warnings.some((w) => /New wording/.test(w)));
  ok(unapproved.length === 0, "every E and N template shows \"New wording\" until approved", unapproved.map((t) => t.id));
  const approved = { ...full("school", "en"), settings: M.mergeClientSettings({ approvedWording: Object.fromEntries(nw.map((t) => [t.id, "2026-10-05"])) }) };
  ok(nw.every((t) => !CO.checkClientSend(t, CO.renderClientMessage(t, approved), approved).warnings.some((w) => /New wording/.test(w))), "and not once Mehdi ticks it approved");
  ok(T.filter((t) => t.textKind === "S").every((t) => !CO.checkClientSend(t, CO.renderClientMessage(t, full("school", t.language)), full("school", t.language)).warnings.some((w) => /New wording/.test(w))), "an S template never says New wording");
  ok(T.every((t) => !(t.asks && t.money)), "no template asks for a testimonial, review, referral or care plan in the same text as an amount due");
  const askMoney = T.filter((t) => t.asks && /\{(amount|totalFee|advanceAmount|finalAmount|balanceAmount|carePlanFee|dueDate)\}/.test(t.body));
  ok(askMoney.length === 0, "and no ask carries an amount field", askMoney.map((t) => t.id));
  ok(TP.TEMPLATE_BY_ID.cp_feedback_review_wa_hi.body.includes("{googleReviewLink}") && CO.renderClientMessage(TP.TEMPLATE_BY_ID.cp_feedback_review_wa_hi, full("school", "hinglish")).body.includes("https://g.page/r/CbQfQiU_imtBEBM/review"), "the review ask carries the Google review link");
}
{
  // What a send records.
  const p = project({ stage: "proposal" });
  const after = CO.afterSend(p, TP.TEMPLATE_BY_ID.cp_proposal_send_em_en, "email", undefined, at("2026-10-05"));
  ok(after.sends.length === 1 && after.sends[0].t === "cp_proposal_send_em_en" && after.checklist.p_sent?.state === "done" && after.dates.proposalSent === "2026-10-05", "a send records itself, ticks its item and dates the anchor");
  const r = CO.afterSend(project({ stage: "design" }), TP.TEMPLATE_BY_ID.cp_design_review_em_en, "email", { roundN: 1 }, at("2026-10-14"));
  ok(r.rounds.some((x) => x.n === 1 && x.sentAt), "a design review e-mail opens its round");
}

/* ── G. Sources, word for word ─────────────────────────────────────────── */
const plain = (s) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/^\s*>\s?/, "")).join("\n").replace(/\*\*|__/g, "").replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,:;!?]|$)/g, "$1$2").replace(/\s+/g, " ");
const words = (s) => s.toLowerCase()
  .replace(/₹\s?/g, " rs ")
  .replace(/\[\[[A-Z0-9_]+\]\]\s*(?:ji|sir)\b/gi, " ")
  .replace(/\[[^\]]*\]\s*(?:ji|sir)\b/gi, " ")
  .replace(/\{\w+\}/g, " ")
  .replace(/\[\[[A-Z0-9_]+\]\]/g, " ")
  .replace(/\[[^\]]*\]/g, " ")
  .replace(/_{2,}/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim().split(/\s+/).filter(Boolean);
/*
  A source as its reader sees it (4 Oct 2026, the docs alignment of that night). An HTML comment is a hidden
  note ("<!-- HIDDEN 4 Oct 2026 ... ORIGINAL: ... -->"), never part of a message. And the firm's real review
  link, written into Testimonial-Request-Kit.md in place of [[GOOGLE_REVIEW_LINK]], stands where a template
  has its {googleReviewLink} field: the CRM's own link (GOOGLE_REVIEW_LINK), so a source that names any other
  link still fails here.
*/
if (typeof M.GOOGLE_REVIEW_LINK !== "string" || !/^https:\/\//.test(M.GOOGLE_REVIEW_LINK)) throw new Error("GOOGLE_REVIEW_LINK is not exported from src/lib/clients/store.ts");
const asRendered = (s) => s.replace(/<!--[\s\S]*?-->/g, "").split(M.GOOGLE_REVIEW_LINK).join("{googleReviewLink}");
const fileCache = new Map();
const readSource = (f) => {
  if (!fileCache.has(f)) {
    const p = join(AGENCY, f);
    fileCache.set(f, existsSync(p) ? plain(asRendered(readFileSync(p, "utf8"))) : null);
  }
  return fileCache.get(f);
};
let sourceChecks = 0;
let sourceSkipped = 0;
for (const t of T.filter((x) => x.src)) {
  const text = readSource(t.src.file);
  if (text === null) {
    sourceSkipped++;
    continue;
  }
  const from = plain(t.src.from);
  const to = plain(t.src.to);
  const i = text.indexOf(from);
  const j = i < 0 ? -1 : text.indexOf(to, i);
  ok(i >= 0 && j >= 0, `${t.id}: its source anchors are in ${t.src.file}`, { from: t.src.from, to: t.src.to, found: [i, j] });
  if (i < 0 || j < 0 || t.textKind !== "S") continue;
  sourceChecks++;
  const seg = text.slice(i, j + to.length);
  let sw = words(seg).filter((w, k) => !(k === 0 && (w === "sir" || w === "ji")));
  for (const b of t.src.blanked || []) {
    // A phrase of the source that became a field or a [blank] in the template, removed word by word.
    const bw = words(b);
    if (!bw.length) continue;
    for (let k = 0; k + bw.length <= sw.length; k++) {
      if (bw.every((w, n) => sw[k + n] === w)) {
        sw = [...sw.slice(0, k), ...sw.slice(k + bw.length)];
        break;
      }
    }
  }
  const bodies = [t.body, ...(t.alt || []).map((a) => a.body)];
  const matches = bodies.some((body) => {
    const tw = words(body);
    const s = sw.join(" ");
    const b = tw.join(" ");
    return b === s || b.includes(s);
  });
  if (!matches) {
    const tw = words(t.body);
    let off = 0;
    while (off < tw.length && tw.slice(off, off + 3).join(" ") !== sw.slice(0, 3).join(" ")) off++;
    if (off >= tw.length) off = 0;
    let k = 0;
    while (k < sw.length && sw[k] === tw[off + k]) k++;
    ok(false, `${t.id}: word for word with ${t.src.file}`, { at: k, source: sw.slice(Math.max(0, k - 4), k + 8).join(" "), template: tw.slice(Math.max(0, off + k - 4), off + k + 8).join(" ") });
  } else ok(true, `${t.id}: word for word`);
}
for (const t of T.filter((x) => /^src\/lib\/outreach\/templates\.ts/.test(x.source))) {
  const id = { cp_proposal_send_em_en: "em_proposal_any_en", cp_proposal_send_em_hi: "em_proposal_any_hinglish", cp_proposal_send_wa_hi: "wa_proposal_hinglish", cp_proposal_send_wa_en: "wa_proposal_en", cp_proposal_d3q_wa_hi: "wa_proposal_chase_hinglish", cp_proposal_d3q_wa_en: "wa_proposal_chase_en", cp_proposal_d3q_em_en: "em_proposal_chase_any_en", cp_proposal_d3q_em_hi: "em_proposal_chase_any_hinglish" }[t.id];
  const o = M.OUTREACH_TEMPLATES.find((x) => x.id === id);
  ok(o && o.body.replace(/\{instituteName\}/g, "{orgName}") === t.body, `${t.id}: taken from templates.ts ${id} as it is`);
}
if (sourceSkipped) notes.push(`${sourceSkipped} sourced templates not compared: their source folders are not next to the repository`);
// 59 since the wording review of 4 Oct 2026 made five sourced texts E (E16, E17, E21, E22): their edited words are
// checked in section J instead, and their anchors above.
else ok(sourceChecks >= 55, `the S templates compared with their sources (${sourceChecks})`, sourceChecks);

/* ── H. Scripts, and the section 13 table ─────────────────────────────── */
{
  const c = ctxOf(project({ stage: "kickoff", durationWeeks: 4, pointOfContact: "Asha Rao", dates: { goLiveTarget: "2026-11-30" } }), [], [], client(), "2026-10-08");
  const k = SC.kickoffScript(c);
  const kt = [k.opening, ...k.steps.flatMap((s) => [s.title, ...s.lines.map((l) => l.text)])].join("\n");
  ok(k.steps.length === 9 && k.steps[0].title.includes("next 4 weeks") && kt.includes("Rs. 4,000 (Clause 4.5)"), "the kickoff script: nine steps with the weeks and the restart fee");
  ok(kt.includes("Cover starts the day we go live, so nothing is left unattended between launch and your first month."), "the AMC line after the money clauses");
  ok(k.steps.filter((s) => s.ticks).map((s) => s.ticks).join() === "inventories,outofscope,money", "script steps tick Section A's inventories, out-of-scope and money lines");
  ok(kt.includes("[escalation contact]") && kt.includes("Asha Rao"), "facts filled, unknowns as blanks");
  const ce = SC.careScript({ ...c, client: client({ custodyModel: "ideovent_managed" }) });
  const ct = ce.steps.flatMap((s) => s.lines.map((l) => `${l.kind}:${l.text}`)).join("\n");
  ok(ct.includes("check:Do not say this line: the hosting is on Ideovent's account (Hosting Terms cl. 4.1).") && ct.includes("check:NEGOTIATION-RULES section 8.3"), "the care plan script warns beside Move 1's hosting line and the third plan");
  ok(!SC.careScript({ ...c, client: client({ custodyModel: "client_held" }) }).steps[0].lines.some((l) => l.kind === "check"), "client-held hosting: Move 1 is said as written");
  ok(ce.plans.map((x) => `${x.name} ${x.monthly} ${x.yearly}`).join("|") === M.CARE.map((x) => `${x.name} Rs ${MO.inrGroup(x.monthly)} a month Rs ${MO.inrGroup(x.yearly)} a year`).join("|") && ce.plans[2].quote === false, "the plans and prices are pricing.ts CARE; Priority not quoted yet");
  ok(ct.includes("the domain expires on [domain renewal date]"), "Move 2's domain date blank until recorded");
}
const SECTION13 = [
  ["Discovery notes and needs brief", () => ST.ITEM_BY_ID.p_brief && ST.gateApplies(ctxOf(project()), ST.ITEM_BY_ID.p_brief)],
  ["Proposal, package options, validity, follow-up cadence, negotiation rules", () => MO.packageChips("website").length === 3 && TK.itemDue(ctxOf(project({ dates: { proposalSent: "2026-10-05" } })), "p_d30") === "2026-11-04"],
  ["Agreement, NDA only when needed, billing details", () => ["a_sow", "a_sa", "a_nda", "a_billing"].every((id) => ST.ITEM_BY_ID[id])],
  ["Welcome message and welcome PDF", () => Boolean(TP.TEMPLATE_BY_ID.cp_welcome_wa_hi && ST.ITEM_BY_ID.w_pack)],
  ["Onboarding questionnaire, brand assets, references", () => Boolean(ST.ITEM_BY_ID.c_refs && ST.ITEM_BY_ID.w_form)],
  ["Access handled safely, record of access held", () => Boolean(ST.ITEM_BY_ID.h_access && TP.TEMPLATE_BY_ID.cp_access_request_wa_hi)],
  ["Kickoff agenda and minutes, plan with milestones and dates", () => SC.kickoffScript(ctxOf(project())).steps.length === 9 && Boolean(TP.TEMPLATE_BY_ID.cp_kickoff_summary_em_en)],
  ["Weekly update, content reminders, client-delay rule", () => Boolean(TP.TEMPLATE_BY_ID.cp_build_weekly_em_en && TP.TEMPLATE_BY_ID.cp_chase_d3_wa_hi && TP.TEMPLATE_BY_ID.cp_slip_client_wa_hi)],
  ["Design rounds counted, written sign-off", () => Boolean(ST.ITEM_BY_ID.d_ok && TP.TEMPLATE_BY_ID.cp_design_third_round_wa_hi)],
  ["Change requests with quote and approval before work", () => Boolean(TP.TEMPLATE_BY_ID.cp_cr_send_em_en)],
  ["Staging review, QA, client acceptance", () => Boolean(ST.ITEM_BY_ID.q_qa && ST.ITEM_BY_ID.q_accepted)],
  ["Launch checklist", () => ["l_ttl", "l_before", "l_cutover", "l_verify", "l_live", "l_t24"].every((id) => ST.ITEM_BY_ID[id])],
  ["Training, handover sheet, ownership", () => Boolean(ST.ITEM_BY_ID.h_training && ST.ITEM_BY_ID.h_doc)],
  ["No code handover before the final payment unless overridden", () => ST.ITEM_BY_ID.h_source.needs.some((n) => n.item === "l_paid")],
  ["Advance invoice, reminders, receipt, final invoice, TDS, credit note", () => Boolean(ST.ITEM_BY_ID.a_pi && TP.TEMPLATE_BY_ID.cp_agreement_a1_wa_hi && ST.ITEM_BY_ID.q_invoice)],
  ["Late-payment rule visible", () => TK.terminationRightFrom(inv()) !== null],
  ["30 days of support, issue log, day 7 and day 30", () => Boolean(ST.ITEM_BY_ID.s_day7 && ST.ITEM_BY_ID.s_close)],
  ["Satisfaction check, review, testimonial with consent, referral", () => Boolean(TP.TEMPLATE_BY_ID.cp_feedback_check_wa_hi && TP.TEMPLATE_BY_ID.cp_feedback_review_wa_hi && TP.TEMPLATE_BY_ID.cp_feedback_consent_wa_hi && TP.TEMPLATE_BY_ID.cp_feedback_referral_wa_hi)],
  ["Care plan, renewals in Today", () => Boolean(ST.ITEM_BY_ID.q_care && TP.TEMPLATE_BY_ID.cp_care_t45_em_en)],
  ["Offboarding, access cleanup, retention, exit letter, archive, re-engagement", () => Boolean(ST.ITEM_BY_ID.x_letter && ST.ITEM_BY_ID.x_archive && TP.TEMPLATE_BY_ID.cp_winback_em_en)],
  ["Exceptions", () => Boolean(TP.TEMPLATE_BY_ID.cp_rebaseline_em_en && TP.TEMPLATE_BY_ID.cp_abuse_warning_em_en && TP.TEMPLATE_BY_ID.cp_support_site_down_wa_hi)],
  ["Stage, next action, money due, health on every client", () => typeof TK.healthOf === "function" && typeof TK.nextAction === "function"],
  ["Nothing automatic; sends recorded; blanks block", () => typeof CO.sendLinksFor === "function" && typeof CO.afterSend === "function"],
  ["Dashboard numbers", () => typeof RG.clientTileNumbers === "function" && typeof RG.registerTotals === "function"],
  ["More than one project per client", () => M.newProject({ clientId: "cl_1", name: "Second project" }, NOW).clientId === "cl_1"],
];
for (const [row, check] of SECTION13) ok(Boolean(check()), `section 13: ${row}`);

/* ── I. The register, the renewals, the dashboard numbers; two regressions ─ */
{
  const q = doc({ kind: "quotation", series: "Q", number: "IDV/Q/2026-27/001", amount: 18000, issuedOn: "2026-10-05", validUntil: "2026-10-20" });
  const p1 = pi();
  const pp1 = pay({ againstDoc: p1.id, amount: 8100, tds: 900, receivedOn: "2026-10-07", reference: "UTR-A" });
  const r1 = rc(pp1);
  const i1 = inv({ amount: 9000, issuedOn: "2026-10-30", dueOn: "2026-11-06" });
  const pv = pay({ againstDoc: i1.id, amount: 500, receivedOn: "2026-11-01", reference: "UTR-VOID", status: "voided", voidReason: "Typed twice" });
  const draft = doc({ kind: "invoice", status: "draft", series: null, fy: null, serial: null, number: null, issuedOn: null, amount: 100 });
  const welcome = doc({ kind: "welcome", series: null, number: null, amount: null });
  const cancelled = doc({ kind: "quotation", series: "Q", number: "IDV/Q/2026-27/002", amount: 18000, status: "cancelled", cancelReason: "Wrong scope line" });
  const docs = [q, p1, r1, i1, draft, welcome, cancelled];
  const pays = [pp1, pv];
  const src = { clients: [client()], projects: [project()], documents: docs, payments: pays };
  const st = (d, today = "2026-11-10") => RG.docStatusText(d, docs, pays, today);
  ok(st(draft) === "Draft" && st(cancelled) === "Cancelled: Wrong scope line" && st(q) === "Issued" && st(p1) === "Paid", "the register's words: Draft, Cancelled with its reason, Issued, Paid (TDS counts toward paid)");
  ok(st(i1) === "Overdue 4 days" && st(i1, "2026-11-05") === "Issued", "an invoice past its due date: Overdue N days; before it, Issued (a voided payment counts for nothing)");
  const unpaidPi = pi({ id: "dc_unpaid", number: "IDV/PI/2026-27/009", amount: 9000, dueOn: "2026-10-13" });
  ok(RG.docStatusText(unpaidPi, [unpaidPi, i1], [], "2026-11-10") === "Billed on IDV/2026-27/001", "an unpaid proforma once the launch invoice is issued: Billed on IDV/...");
  const partPi = pi({ id: "dc_part", number: "IDV/PI/2026-27/010", amount: 9000, dueOn: "2026-10-13", projectId: "pr_other" });
  const partPay = pay({ againstDoc: partPi.id, projectId: "pr_other", amount: 4000 });
  ok(RG.docStatusText(partPi, [partPi], [partPay], "2026-10-20") === "Part paid, Overdue 7 days" && RG.docStatusText(partPi, [partPi], [partPay], "2026-10-10") === "Part paid", "part paid, and part paid and overdue");

  const rows = RG.registerRows(src, "2026-11-10", RG.refundsFrom([]));
  ok(rows.length === 6 && !rows.some((r) => r.kind === "welcome" || r.id === welcome.id), "the register lists the money documents only, drafts and cancelled ones included", rows.map((r) => r.kind));
  const rRow = rows.find((r) => r.id === r1.id);
  ok(rRow?.references === "UTR-A" && rRow.paid === null && rRow.balance === null, "a receipt row carries its payment's reference, and no paid or balance of its own");
  const iRow = rows.find((r) => r.id === i1.id);
  ok(iRow?.paid === 0 && iRow.balance === 9000 && iRow.overdueDays === 4 && iRow.references === "", "the invoice row: paid 0 (the voided payment counts nowhere), balance 9,000, 4 days overdue");
  ok(rows.find((r) => r.id === draft.id)?.number === "Draft", "a draft's number reads Draft (it has none until Issue)");
  const tot = RG.registerTotals(src, "2026-11-10");
  ok(tot.outstanding === 9000 && tot.overdue === 9000 && tot.overdueCount === 1 && tot.receivedThisMonth === 0, "totals: outstanding 9,000, of which overdue 9,000; received in November 0 (the voided payment counts nowhere)", tot);
  ok(RG.registerTotals(src, "2026-10-20").receivedThisMonth === 8100, "received in October: the 8,100 credited, never the 900 TDS");

  const cn = doc({ kind: "credit_note", series: "CN", number: "IDV/CN/2026-27/001", amount: 2000, relatedDoc: i1.id, data: { reasonCode: "B", settlement: "refunded" } });
  const refunds = RG.refundsFrom([{ type: "payment", data: { refundOf: cn.id, amount: 2000, on: "2026-11-12", reference: "UTR-REFUND" } }, { type: "note", data: { refundOf: cn.id } }]);
  ok(refunds.length === 1 && refunds[0].amount === 2000, "a refund is read from its timeline line (type payment, refundOf), nothing else");
  const withCn = RG.registerRows({ ...src, documents: [...docs, cn] }, "2026-11-12", refunds);
  ok(/Rs 2000 on 12 Nov 2026, UTR-REFUND/.test(withCn.find((r) => r.id === cn.id)?.refunds || ""), "the credit note's row shows the refund recorded against it");
  ok(withCn.find((r) => r.id === i1.id)?.balance === 7000, "and the invoice's balance falls by the credit note");

  const csv = RG.registerCsv(RG.registerRows({ ...src, clients: [client({ orgName: "=HYPERLINK(\"x\"), Example" })] }, "2026-11-10"));
  const lines = csv.split("\r\n");
  ok(lines[0] === "Number,Kind,Date,Client,Project,Amount (INR),Due date,Paid (INR),Balance (INR),Status,References,Refunds", "the CSV has the register's columns", lines[0]);
  ok(lines.some((l) => l.includes("\"'=HYPERLINK(\"\"x\"\"), Example\"")), "a client name that would run as a formula gets a ' in front, and is quoted", lines[1]);
  ok(lines.some((l) => /^IDV\/2026-27\/001,Invoice \(launch\),2026-10-30,.*,9000,2026-11-06,0,9000,Overdue 4 days,,$/.test(l)), "amounts are plain numbers", lines);
  ok(RG.csvCell(-500) === "-500" && RG.csvCell("-500") === "'-500" && RG.csvCell(null) === "", "numbers are written as they are; a typed text starting with - is guarded");

  const plan = client({ id: "cl_2", orgName: "Plan Client", carePlan: { plan: "growth", billing: "monthly", fee: 2000, renewalOn: "2026-12-01", status: "active" }, renewals: { domain: { renewsOn: "2026-11-20", provider: "Example Registrar" } } });
  const ended = client({ id: "cl_3", orgName: "Ended Client", carePlan: { plan: "essential", billing: "annual", fee: 10000, renewalOn: "2026-11-15", status: "ended" } });
  const items = RG.renewalItems([plan, ended]);
  ok(items.map((i) => i.what).join() === "domain,care_plan" && items[1].fee === 2000 && items[1].label === "Care plan: Growth, monthly", "renewals: by date, a care plan with its fee, an ended plan left out", items);

  const open1 = project({ id: "pr_a", stage: "build" });
  const open2 = project({ id: "pr_b", stage: "build", hold: "client_delay" });
  const open3 = project({ id: "pr_c", stage: "agreement" });
  const closed = project({ id: "pr_d", stage: "aftercare", outcome: "closed" });
  const tiles = RG.clientTileNumbers({ clients: [plan, ended], projects: [open1, open2, open3, closed], documents: docs, payments: pays }, "2026-11-10");
  ok(tiles.active === 2 && tiles.byStage.map((x) => `${x.stage}:${x.count}`).join() === "agreement:1,build:1", "active clients: open projects not on hold, and how many in each stage that has any", tiles.byStage);
  ok(tiles.outstanding === 9000 && tiles.overdue === 9000 && tiles.overdueCount === 1 && tiles.receivedThisMonth === 0, "money due and received this month, by the register's rules");
  ok(tiles.renewals60 === 2 && tiles.nearestRenewal?.what === "domain", "renewals in the next 60 days, and the nearest", tiles);

  /* Regression: a select saves the weekly update day as "5"; the weekly task must still come (no endless walk back). */
  const wk = ctxOf(project({ stage: "build", weeklyUpdateDay: "5", dates: { devStart: "2026-10-26" } }), [], [], client(), "2026-11-04");
  const weekly = TK.projectTasks(wk).find((t) => t.id.includes(":weekly:"));
  ok(weekly?.due === "2026-10-30", "a weekly update day saved as the text \"5\" still gives Friday's weekly task", weekly);

  /* Regression: the receipt e-mail opened from w_receipt (no message context) names the latest payment and its receipt. */
  const t = TP.TEMPLATE_BY_ID.cp_payment_receipt_em_en;
  const pr = pi({ id: "dc_pr1" });
  const prPay = pay({ againstDoc: pr.id, amount: 9000, receivedOn: "2026-10-07", reference: "UTR-RECEIPT" });
  const prRc = rc(prPay, { number: "IDV/RC/2026-27/001" });
  const rcCtx = CO.projectCtx(client({ language: "en" }), project({ stage: "welcome" }), [pr, prRc], [prPay], S, at("2026-10-07"));
  const rr = CO.renderClientMessage(t, rcCtx);
  ok(/Your payment of Rs\. 9,000, received on 7 Oct 2026 \(reference UTR-RECEIPT\), is acknowledged in receipt IDV\/RC\/2026-27\/001/.test(rr.body) && /Nothing is outstanding on IDV\/PI\/2026-27\/001\./.test(rr.body),
    "the receipt e-mail from its item names the latest payment, its receipt and the proforma's balance", rr.body);
  ok(CO.attachmentsOf(t, rcCtx).every((a) => a.doc?.id === prRc.id), "and attaches that receipt");
}

/* ── J. The wording review of 4 Oct 2026 (every message rendered for a clinic, a school and a coaching client) ── */
{
  const R = (id, ctx) => CO.renderClientMessage(TP.TEMPLATE_BY_ID[id], ctx);
  const fs = full("school", "en"); // 5 Nov 2026: the quotation (valid until 20 Oct) has expired
  // A file extension keeps its space ("(.ai,.svg,.eps or.pdf)" was the engine's tidy at work).
  ok(CO.tidyClient("Logo  (.ai, .svg) , done .") === "Logo (.ai, .svg), done.", "tidyClient: the engine's rules, but a file extension's space is kept", CO.tidyClient("Logo  (.ai, .svg) , done ."));
  for (const kind of ["school", "dental"]) {
    ok(R("cp_kickoff_summary_em_en", full(kind, "en")).body.includes("Logo in vector form (.ai, .svg, .eps or .pdf), by"), `${kind}: the kickoff summary prints "(.ai, .svg, .eps or .pdf)"`);
    ok(R("cp_content_missing_wa_hi", full(kind, "hinglish")).body.includes("logo vector format mein (.ai / .svg / .pdf)"), `${kind}: the content WhatsApp prints "(.ai / .svg / .pdf)"`);
  }
  // E3: "school ke email" to a school only.
  ok(R("cp_proposal_d1_wa_hi", full("school", "hinglish")).body.includes("school ke email") && !R("cp_proposal_d1_wa_hi", full("coaching", "hinglish")).body.includes("school ke email"), "day 1: \"school ke email\" to a school, never to a coaching centre (E3)");
  // E16: a clinic or another business hears no admission cycle, academic year, exam period or affiliation.
  for (const kind of ["dental", "other"]) {
    const bad = ["cp_slip_own_em_en", "cp_review_accuracy_em_en", "cp_chase_d10_em_en"].filter((id) => /admission|academic|\bexams?\b|affiliation/i.test(R(id, full(kind, "en")).body));
    ok(bad.length === 0, `E16 for a ${kind} client: no admission, academic year, exam or affiliation`, bad);
  }
  for (const kind of ["school", "coaching"]) {
    ok(R("cp_slip_own_em_en", full(kind, "en")).body.includes("(an admission cycle, a printed brochure, an event)") && R("cp_review_accuracy_em_en", full(kind, "en")).body.includes("Every fee, amount and academic year is correct and current")
      && R("cp_chase_d10_em_en", full(kind, "en")).body.includes("a decision is stuck, an exam period, or you have simply gone off the idea"), `E16 for a ${kind} client: the SOP's own words`);
  }
  // E22: the facts e-mail is the notice that starts the review window, and says so.
  ok(/Please reply by 12 Nov 2026, which is the 7-day review window in our agreement\. If I do not hear from you by then, the agreement treats the finished work as accepted \(Clause 3\.3\), which is when the launch payment falls due \(Clause 5\.2\)/.test(R("cp_review_accuracy_em_en", full("dental", "en")).body), "E22: the review notice names its window and what silence means");
  // E17: the count of messages, and the re-baseline list.
  const item = { key: "r1", label: "the logo", since: "2026-10-19" };
  const c0 = { ...full("dental", "en"), about: { item } };
  const r0 = R("cp_chase_d10_em_en", c0);
  ok(r0.body.includes("I have sent [number of messages] about it") && !/\b0 messages/.test(r0.body) && CO.checkClientSend(TP.TEMPLATE_BY_ID.cp_chase_d10_em_en, r0, c0).blockers.some((b) => /\[number of messages\]/.test(b)), "day 10 with no message recorded about the item: a blank that blocks, never \"0 messages\" (E17)");
  const withSends = (n) => ({ ...c0, project: { ...c0.project, sends: Array.from({ length: n }, (_, i) => ({ t: "cp_chase_d3_wa_hi", at: `2026-10-2${i}T06:00:00Z`, ch: "whatsapp", doc: "item:r1" })) } });
  ok(R("cp_chase_d10_em_en", withSends(1)).body.includes("I have sent 1 message about it") && R("cp_chase_d10_em_en", withSends(2)).body.includes("I have sent 2 messages about it"), "day 10: \"1 message\", \"2 messages\"");
  const rb = R("cp_rebaseline_em_en", { ...fs, project: { ...fs.project, waived: [{ at: "2026-10-25T06:00:00Z", what: "A second phone number" }] } });
  ok(rb.body.includes("I price each of them on its own form. You approve the ones you want and park the rest.") && !/each of the four/.test(rb.body), "re-baseline: \"each of them\", true of any count (E17)");
  ok(/1\. A second phone number\n2\. Gallery page\n3\. \[request 3\]\n\n/.test(rb.body) && !rb.body.includes("[request 4]"), "re-baseline: the requests logged, padded to three, never a fourth blank", rb.body);
  // E18: the quotation's validity date in the past is never "holds until".
  const fresh = { ...fs, docs: fs.docs.map((d) => (d.kind === "quotation" ? { ...d, validUntil: "2026-12-31" } : d)) };
  ok(R("cp_agreement_a3_em_en", fs).body.includes("The price held until 20 Oct 2026; from here I would re-quote") && R("cp_proposal_d14_em_en", fs).body.includes("the pricing in the document held until 20 Oct 2026, so from here I would re-quote"), "A3 and day 14 after the validity date: \"held until\" (E18)");
  ok(R("cp_agreement_a3_em_en", fresh).body.includes("The price holds until 31 Dec 2026; after that I would re-quote") && R("cp_proposal_d14_em_en", fresh).body.includes("the pricing in the document holds until 31 Dec 2026. After that"), "before it: the source's \"holds until\"");
  // E19: the launch invoice that is not the plain 50% balance.
  const fh = full("school", "hinglish");
  const bigger = { ...fh, docs: fh.docs.map((d) => (d.kind === "invoice" ? { ...d, amount: 12000 } : d)) };
  ok(R("cp_launch_m1_wa_hi", fh).body.includes("launch wali baaki 50% payment, Rs. 9,000") && R("cp_launch_m1_wa_hi", bigger).body.includes("launch wali baaki payment, Rs. 12,000") && !R("cp_launch_m1_wa_hi", bigger).body.includes("50%"), "M1: \"baaki 50%\" only when the launch invoice is the 50% balance (E19)");
  // E20: day 25 with nothing, or one thing, reported.
  const d25 = (issues) => R("cp_support_day25_wa_hi", { ...fh, project: { ...fh.project, issues } });
  ok(d25([]).body.includes("Abhi tak koi cheez report nahi hui hai.") && !/\b0 cheezein/.test(d25([]).body), "day 25 with nothing reported: no \"0 cheezein ... sab theek\" (E20)");
  ok(d25([fh.project.issues[0]]).body.includes("Abhi tak ek cheez report hui thi, woh theek ho chuki hai."), "day 25 with one thing reported");
  ok(d25([fh.project.issues[0], { ...fh.project.issues[0], id: "i9" }]).body.includes("Abhi tak 2 cheezein report hui thi, sab theek ho chuki hain."), "day 25 with two: the source's words");
  // E21: the consent line is theirs, and the e-mail asks for the one-word reply.
  const consent = R("cp_feedback_consent_em_en", fs);
  ok(consent.body.includes("\"They listened.\"") && consent.body.includes("\"I confirm that the words above are mine") && consent.body.includes("If that is right, please reply with just \"Yes, approved\"."), "the consent e-mail quotes their words and the line, and asks for \"Yes, approved\" (E21)", consent.body);
  // The site a client-level message names: the one Ideovent built; day 7 names their site from before.
  const built = project({ liveUrl: "https://www.school.example.org", dates: { goLive: "2026-11-02" } });
  const wc = CO.clientCtx(client({ website: "https://old.example.org" }), [], [], S, at("2027-05-01"), [built]);
  ok(R("cp_winback_em_en", wc).body.includes("noticed two things on https://www.school.example.org") && !R("cp_winback_em_en", wc).body.includes("old.example.org"), "the win-back names the site Ideovent built, never the one from before (\"the sites I have built\")");
  ok(R("cp_proposal_d7_em_en", fs).subject.includes("https://old.example.org"), "day 7 is about their own site from before", R("cp_proposal_d7_em_en", fs).subject);
  ok(!CO.clientCtx(client(), [], [], S, at("2027-05-01"), [project({ clientId: "cl_other", liveUrl: "https://other.example.org" })]).builtSite, "another client's project never names the site (decision 17)");
  // The renewal ladder reads the renewal invoice, never the first year's.
  const planCl = client({ carePlan: { plan: "growth", billing: "annual", fee: 20000, startOn: "2026-12-03", renewalOn: "2027-12-03", status: "active" } });
  const first = doc({ kind: "invoice", projectId: null, milestone: "AMC", series: "INV", number: "IDV/2026-27/010", amount: 20000, issuedOn: "2026-11-26", dueOn: "2026-12-03", data: { period: { from: "2026-12-03", to: "2027-12-02" } } });
  const firstPay = pay({ againstDoc: first.id, projectId: null, amount: 20000, receivedOn: "2026-12-01" });
  const ren = doc({ kind: "invoice", projectId: null, milestone: "AMC", series: "INV", number: "IDV/2027-28/011", amount: 20000, issuedOn: "2027-11-19", dueOn: "2027-11-26", data: { period: { from: "2027-12-03", to: "2028-12-02" } } });
  const renPay = pay({ againstDoc: ren.id, projectId: null, amount: 20000, receivedOn: "2027-11-25" });
  const T0 = TP.TEMPLATE_BY_ID.cp_care_t0_em_en;
  const onlyFirst = CO.clientCtx(planCl, [first], [firstPay], S, at("2027-12-03"), [built]);
  ok(CO.checkClientSend(T0, R("cp_care_t0_em_en", onlyFirst), onlyFirst).blockers.some((b) => /cover begins when the payment is received/.test(b)), "T-0: the first year's paid invoice is not the renewal, so \"has renewed\" is blocked");
  const t7ctx = CO.clientCtx(planCl, [first], [firstPay], S, at("2027-11-26"), [built]);
  ok(CO.checkClientSend(TP.TEMPLATE_BY_ID.cp_care_t7_wa_en, R("cp_care_t7_wa_en", t7ctx), t7ctx).blockers.some((b) => /Invoice went over last week/.test(b)), "T-7 \"Invoice went over last week\" waits for the renewal invoice, not the first year's");
  const renewed = CO.clientCtx(planCl, [first, ren], [firstPay, renPay], S, at("2027-12-03"), [built]);
  const rt0 = R("cp_care_t0_em_en", renewed);
  ok(!CO.checkClientSend(T0, rt0, renewed).blockers.some((b) => /cover begins/.test(b)) && rt0.subject.includes("until 2 Dec 2028") && rt0.body.includes("for https://www.school.example.org has renewed: Growth, Rs. 20,000 a year, until 2 Dec 2028."), "T-0 once the renewal invoice is paid: its period's last day, the fee with its period, the site built", rt0);
  const grace = CO.clientCtx(planCl, [first], [firstPay], S, at("2027-12-10"), [built]);
  ok(!CO.checkClientSend(TP.TEMPLATE_BY_ID.cp_care_t7grace_em_en, R("cp_care_t7grace_em_en", grace), grace).blockers.some((b) => /has not lapsed/.test(b)), "T+7: the renewal unpaid (the first year's invoice does not count), so the grace note can go");
  ok(R("cp_care_t45_em_en", renewed).body.includes("You are on the Growth plan at Rs. 20,000 a year,"), "T-45 says the fee with its period");
  // The Response quotes the issue's words; the T-30 and win-back e-mails are signed.
  const resp = R("cp_support_response_em_en", { ...fs, about: { issueId: "i1" } });
  ok(resp.body.includes("I have your message about \"typo on the fees page\".") && resp.subject.endsWith(", typo on the fees page"), "the Response quotes the issue (no capital mid-sentence)", resp);
  for (const id of ["cp_care_t30_em_en", "cp_winback_em_en", "cp_winback_plan_em_en"]) ok(R(id, wc).body.trim().endsWith("Mehdi Alam · Ideovent Technologies"), `${id} ends with Mehdi's name (the source is the body only)`);
}

/* ── K. The gate review of 4 Oct 2026 ─────────────────────────────────── */
{
  // (1) The advance is billed once, in the screen's words (stages.ts proformaRefusals; 0014 and rules.ts refuse the issue).
  const adv = { kind: "proforma", milestone: "ADVANCE_50", data: {} };
  const p0 = pi();
  const paid = pay({ againstDoc: p0.id, amount: 9000 });
  const r1 = ST.proformaRefusals(ctxOf(project({ stage: "agreement" }), [p0], [paid]), adv);
  ok(r1.length === 1 && /^The advance is already on IDV\/PI\/2026-27\/001 \(issued 6 Oct 2026\), and money was received against it: a second proforma would bill it twice\.$/.test(r1[0]), "a second advance proforma is refused, naming the paid one", r1);
  const r1b = ST.proformaRefusals(ctxOf(project({ stage: "agreement" }), [p0], []), adv);
  ok(r1b.length === 1 && /To change it, cancel that one with a reason, then make the new one\.$/.test(r1b[0]), "...and an unpaid one: cancel it first", r1b);
  ok(ST.proformaRefusals(ctxOf(project({ stage: "agreement" }), [p0], [paid]), p0).length === 0, "an issued proforma never refuses itself");
  ok(ST.proformaRefusals(ctxOf(project({ stage: "agreement" }), [], []), adv).length === 0, "the first advance proforma: nothing refuses it");
  const r2 = ST.proformaRefusals(ctxOf(project({ stage: "agreement" }), [], []), { ...adv, data: { part: 2 } });
  ok(r2.length === 1 && /no split advance/.test(r2[0]), "part 2 on a project with no split advance is refused", r2);
  const splitP = project({ stage: "agreement", splitAdvance: { partnerApprovedAt: "2026-10-04", channel: "whatsapp", part1: 0, part2: 0, part2DueOn: "2026-10-20" } });
  ok(ST.proformaRefusals(ctxOf(splitP, [pi({ amount: 9000 })], []), { ...adv, data: { part: 2 } }).some((x) => /already asks for the whole 50% advance: a part 2 would bill it twice/.test(x)), "part 2 after a proforma for the whole advance is refused");
  ok(ST.proformaRefusals(ctxOf(splitP, [pi({ amount: 4500, data: { part: 1 } })], []), { ...adv, data: { part: 2 } }).length === 0, "part 2 after part 1 of a split advance is allowed");
  const split2 = (docs) => TK.projectTasks(ctxOf({ ...splitP, stage: "welcome" }, docs, [], client(), "2026-10-20")).some((t) => /split2$/.test(t.id));
  ok(split2([pi({ amount: 4500, data: { part: 1 } })]) && !split2([pi({ amount: 9000 })]), "Today asks for part 2 after part 1, never after a proforma for the whole advance");
  ok(ST.proformaRefusals(ctxOf(project({ stage: "launch" }), [pi(), inv()], []), adv).some((x) => /^The launch invoice IDV\/2026-27\/001 already bills this project, less the advances received/.test(x)), "after the launch invoice, no advance proforma");
  const refunded = pi({ amount: 9000 });
  const cnF = doc({ kind: "credit_note", series: "CN", number: "IDV/CN/2026-27/001", amount: 9000, relatedDoc: refunded.id, data: { reasonCode: "F" } });
  ok(ST.proformaRefusals(ctxOf(project({ stage: "agreement" }), [refunded, cnF], []), adv).length === 0, "an advance refunded in full by a credit note no longer counts");
  const cnPart = { ...cnF, id: "dc_cnpart", amount: 4000 };
  ok(ST.proformaRefusals(ctxOf(project({ stage: "agreement" }), [refunded, cnPart], []), adv).length === 1, "...one refunded in part still bills the advance");
  const cr1 = doc({ kind: "proforma", milestone: "CHANGE_REQUEST", series: "PI", number: "IDV/PI/2026-27/004", amount: 1500, data: { crNo: "CR-01" } });
  const crc = ctxOf(project({ stage: "build" }), [cr1], []);
  ok(ST.proformaRefusals(crc, { kind: "proforma", milestone: "CHANGE_REQUEST", data: { crNo: "CR-01" } }).some((x) => /^CR-01's advance is already on IDV\/PI\/2026-27\/004/.test(x)), "a second proforma for CR-01's advance is refused");
  ok(ST.proformaRefusals(crc, { kind: "proforma", milestone: "CHANGE_REQUEST", data: { crNo: "CR-02" } }).length === 0, "CR-02's advance is allowed");
  ok(ST.proformaRefusals(crc, { kind: "invoice", milestone: "LAUNCH_50", data: {} }).length === 0 && ST.proformaRefusals(crc, { kind: "proforma", milestone: null, data: {} }).length === 0, "other documents: the rule does not apply");

  // (2) The receipt e-mail ticks "Receipt e-mailed" only: stage 9's "Receipt issued the same day" is the launch receipt's.
  const rT = TP.TEMPLATE_BY_ID.cp_payment_receipt_em_en;
  ok(JSON.stringify(rT.ticks) === JSON.stringify(["w_receipt"]), "the receipt e-mail ticks w_receipt only", rT.ticks);
  const afterAdvance = CO.afterSend(project({ stage: "welcome" }), rT, "email", undefined, at("2026-10-09"));
  ok(afterAdvance.checklist.w_receipt?.state === "done" && !afterAdvance.checklist.l_receipt, "the advance's receipt e-mail writes nothing on l_receipt (it read \"Done 9 Oct 2026 (cp_payment_receipt_em_en)\" on stage 9)", afterAdvance.checklist);
  const lc = launchCtx({ paid: true });
  ok(ST.itemState(lc, ST.ITEM_BY_ID.l_receipt).state === "done", "l_receipt is still done by the launch receipt itself");

  // (3) An item a project does not need says why, never "Due", and Today leaves it out.
  const exitP = project({ stage: "aftercare", carePlanDecision: "none", outcome: "closed" });
  const ec = ctxOf(exitP, [], [], client({ custodyModel: "client_held" }), "2026-12-09");
  ok(ST.notNeededReason(ec, ST.ITEM_BY_ID.ca_sign) === "Not on this path: no care plan was chosen (the exit).", "a closed exit project: the care plan items say \"Not on this path\"", ST.notNeededReason(ec, ST.ITEM_BY_ID.ca_sign));
  ok(ST.notNeededReason(ec, ST.ITEM_BY_ID.x_held) === "Not needed: the client holds its own domain and hosting.", "x_held when the client holds its own domain and hosting", ST.notNeededReason(ec, ST.ITEM_BY_ID.x_held));
  ok(ST.notNeededReason(ec, ST.ITEM_BY_ID.x_letter) === null && ST.notNeededReason(ec, ST.ITEM_BY_ID.x_archive) === null, "the exit's own items are needed");
  const planP = project({ stage: "aftercare", carePlanDecision: "growth" });
  const pc2 = ctxOf(planP, [], [], client(), "2026-12-09");
  ok(ST.notNeededReason(pc2, ST.ITEM_BY_ID.x_letter) === "Not on this path: the care plan runs." && ST.notNeededReason(pc2, ST.ITEM_BY_ID.ca_sign) === null, "a care plan: the exit's items are not on this path, the plan's are needed");
  ok(ST.notNeededReason(ctxOf(project({ stage: "support", carePlanDecision: "essential" })), ST.ITEM_BY_ID.s_day25) === "Not needed: they chose a care plan.", "day 25 when they chose a care plan");
  const openExit = ctxOf(project({ stage: "aftercare", carePlanDecision: "none" }), [], [], client({ custodyModel: "client_held" }), "2026-12-09");
  const ids = TK.projectTasks(openExit).map((t) => t.id);
  ok(!ids.some((id) => /item:(ca_|x_held)/.test(id)), "Today leaves out the items the stage card calls not needed", ids);

  // (4) E23: a part payment against a proforma says "proforma invoice"; against an invoice, "invoice".
  const PART = TP.TEMPLATE_BY_ID.cp_payment_part_wa_en;
  ok(PART.textKind === "E" && (PART.edits || []).includes("E23"), "the part-payment line is an edited text (E23), approved like the others");
  const pP = pi({ amount: 9000 });
  const partP = pay({ againstDoc: pP.id, amount: 4000, receivedOn: "2026-10-07" });
  const ppc = { ...CO.projectCtx(client({ language: "en" }), project({ stage: "agreement" }), [pP], [partP], S, at("2026-10-07")), about: { paymentId: partP.id } };
  const ppm = CO.renderClientMessage(PART, ppc);
  ok(ppm.body.startsWith("Rs. 4,000 received today against proforma invoice IDV/PI/2026-27/001, balance Rs. 5,000."), "a part of the advance: \"against proforma invoice IDV/PI/...\"", ppm.body);
  const iI = inv({ amount: 9000 });
  const partI = pay({ againstDoc: iI.id, amount: 5000, receivedOn: "2026-10-31" });
  const ipc = { ...CO.projectCtx(client({ language: "en" }), project({ stage: "launch" }), [pi(), iI], [partI], S, at("2026-10-31")), about: { paymentId: partI.id } };
  ok(CO.renderClientMessage(PART, ipc).body.startsWith("Rs. 5,000 received today against invoice IDV/2026-27/001, balance Rs. 4,000."), "a part of the launch invoice: the source's \"against invoice\"", CO.renderClientMessage(PART, ipc).body);

  // (5) E19: M1 after a part payment of the launch invoice asks for what is left, and not as "baaki 50%".
  const fh = full("school", "hinglish");
  const i0 = fh.docs.find((x) => x.kind === "invoice");
  const partL = pay({ againstDoc: i0.id, amount: 4000, receivedOn: "2026-11-03" });
  const m1 = CO.renderClientMessage(TP.TEMPLATE_BY_ID.cp_launch_m1_wa_hi, { ...fh, payments: [...fh.payments, partL] });
  ok(m1.body.includes("launch wali baaki payment, Rs. 5,000,") && !m1.body.includes("50%"), "M1 after a part payment: the balance, never \"baaki 50%\" and the full amount", m1.body);
  ok(CO.renderClientMessage(TP.TEMPLATE_BY_ID.cp_launch_m1_wa_hi, fh).body.includes("launch wali baaki 50% payment, Rs. 9,000,"), "...and with nothing paid, the source's words and the full balance");

  // (6) E13 n: the launch invoice names a change request's own advance.
  const lp = project({ stage: "review", changeRequests: [{ no: "CR-01", raisedAt: "2026-10-20T06:00:00Z", description: "Gallery page", reason: "Asked at review", scopeImpact: "One page", days: 2, cost: 3000, advanceDue: 1500, status: "approved", lapsesOn: "2026-10-27" }] });
  const a0 = pi();
  const a0p = pay({ againstDoc: a0.id, amount: 9000, receivedOn: "2026-10-07" });
  const crPi = doc({ kind: "proforma", milestone: "CHANGE_REQUEST", series: "PI", number: "IDV/PI/2026-27/002", amount: 1500, data: { crNo: "CR-01" } });
  const crPay = pay({ againstDoc: crPi.id, amount: 1500, receivedOn: "2026-10-22" });
  const li = MO.buildLaunchInvoice(lp, [a0, crPi], [a0p, crPay], NU.fmtDate);
  ok(li.less.map((x) => x.label).join("|") === "Less: advance received 7 Oct 2026|Less: advance received 22 Oct 2026 (CR-01)", "the launch invoice: a change request's own advance names its CR (E13 n)", li.less);
}

if (fails.length) {
  console.log(`client process: ${pass} passed, ${fails.length} failed${NEG ? ` (negative mode ${NEG})` : ""}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  process.exit(1);
}
for (const n of notes) console.log(`  note: ${n}`);
console.log(`client process: ${pass} passed, 0 failed`);
