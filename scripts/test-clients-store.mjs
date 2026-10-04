/**
 * The client file's store (src/lib/clients/store.ts, rules.ts, load.ts), in Node, client-process-spec 14.4.
 *
 *   node scripts/test-clients-store.mjs
 *   CLIENTS_STORE_NEGATIVE=advance node scripts/test-clients-store.mjs   rules.ts with "the advance is billed once"
 *                                                                         removed: must FAIL (exit 1)
 *   CLIENTS_STORE_NEGATIVE=events node scripts/test-clients-store.mjs    rules.ts with "a timeline line belongs to
 *                                                                         the client of its project" removed: must FAIL
 *
 * WHAT IT ASSERTS
 *   A. LocalClientStore against rules.ts: the same refusals as the SQL. Every check of the PGlite suite
 *      (scripts/test-clients-rls.mjs, from the design's check-0014-draft.mjs) that has a local meaning has
 *      its twin here, with the same numbers: IDV/PI/<fy>/001 to 004, no gap after a refused issue or a
 *      forged draft, the first serial Mehdi set (below 1 read as 1), issued documents frozen, cancel only
 *      with a reason, payments only against an issued proforma or invoice of the same client and project
 *      and never moved, one receipt per payment for the amount credited, credit notes only against an
 *      issued invoice (or code F, its proforma) with both partners' yes and never above it, a stamped
 *      timeline, one client per lead, a deleted drafts-only project keeps its lines, the year turns on
 *      1 April by the India date; and (gate review of 4 Oct 2026) the advance billed once: one issued
 *      proforma for the advance, one for part 2 (only with a split advance) and one per change request's
 *      advance, a refunded one no longer counting; a timeline line under the client of its project.
 *   B. Who is acting, read the way local mode's team reads it (localTeam.ts): a member, an admin or an id
 *      not in the team is refused by every method ("Client files are Mehdi's."); the owner's own row
 *      (m_owner) and no actor at all are Mehdi.
 *   C. openFromLead: a second project for the same lead reuses its client; a lead in "hi" opens in
 *      "hinglish"; its do-not-contact and Meta consent come along.
 *   D. Two tabs: a client or a project saved from a stale copy is refused ("Changed in another tab").
 *   E. SupabaseClientStore against a stubbed PostgREST: a 2,500-line timeline comes back whole (three
 *      pages); a missing table reads as ready() === false; the unique indexes in plain words; and the
 *      loader makes no request at all for a member, an admin or nobody (the provider is inert).
 *
 * Bundled with esbuild like scripts/test-outreach-store.mjs; the Supabase client is a fake. Fictional data.
 * A negative mode patches rules.ts as it is bundled (the file on disk is never changed); a patch that finds
 * nothing to remove exits 3 ("nothing proved").
 */
import { build } from "esbuild";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEG = process.env.CLIENTS_STORE_NEGATIVE || "";
// (The issued-document freeze has its own negative mode in scripts/e2e-clients.mjs, E2E_NEGATIVE=1.)
const SABOTAGE = {
  advance: [
    [`refuse("23514", "This project has no split advance: its advance is one proforma.");`, "void 0;"],
    [`refuse("23505", d.milestone === "ADVANCE_50"`, `void (d.milestone === "ADVANCE_50"`],
  ],
  events: [[`refuse("23514", "A timeline line belongs to the client of its project.");`, "void 0;"]],
};
if (NEG && !SABOTAGE[NEG]) throw new Error(`CLIENTS_STORE_NEGATIVE=${NEG}: use ${Object.keys(SABOTAGE).join(", ")}`);

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
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export function supabase() { return globalThis.__fakeSupabase; }", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (NEG) {
      b.onLoad({ filter: /[\\/]lib[\\/]clients[\\/]rules\.ts$/ }, (args) => {
        let src = readFileSync(args.path, "utf8");
        for (const [from, to] of SABOTAGE[NEG]) {
          if (!src.includes(from)) { console.log(`negative mode ${NEG}: "${from.slice(0, 60)}" not found in rules.ts; nothing proved`); process.exit(3); }
          src = src.replace(from, to);
        }
        return { contents: src, loader: "ts" };
      });
    }
  },
};
const out = join(tmpdir(), `ideovent-test-clients-store-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: [
      `export * from "@/lib/clients/store";`,
      `export * as R from "@/lib/clients/rules";`,
      `export * as N from "@/lib/clients/numbering";`,
      `export { loadClientData } from "@/lib/clients/load";`,
      `export { LocalOutreachStore, setOutreachStoreForTests } from "@/lib/outreach/store";`,
      `export { CrmAccessError } from "@/lib/outreach/access";`,
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

let pass = 0;
const fails = [];
const ok = (c, m, got) => {
  if (c) { pass++; console.log("ok    " + m); }
  else { fails.push(m); console.log("FAIL  " + m + (got !== undefined ? "\n        got: " + JSON.stringify(got, (k, v) => (v instanceof Error ? v.message : v)).slice(0, 400) : "")); }
};
const err = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), m }; };

/* ── A. The local store against the rules ───────────────────────────────── */
console.log("\nA. LocalClientStore: the SQL's refusals, locally\n");
let clock = new Date("2026-10-05T05:00:00.000Z"); // Monday 5 Oct 2026, 10:30 India time
const storage = mem();
const S = new M.LocalClientStore(storage, { whoIsActing: async () => "owner", now: () => clock });
const fy = M.N.fyOf(M.N.indiaDate(clock));
ok(fy === "2026-27", "the local clock's financial year is 2026-27", fy);

const lead = { instituteName: "Example School", kind: "school", contactName: "Example Principal", phone: "+919800000001", email: "office@example.org", city: "Patna", language: "hi", status: "proposal", metaConsent: "yes" };
const opened = await S.openFromLead({ leadId: "ol_test_1", lead, inIndia: true, project: { name: "Example School website", fee: 18000 } });
const c1 = opened.client, p1 = opened.project;
ok(c1.code === "IDV-C-0001", "owner adds a client, code IDV-C-0001", c1.code);
ok(p1.code === "IDV-PR-0001" && p1.stage === "proposal", "owner adds a project at stage proposal", p1);
ok(/^cl_[a-z0-9]{12}$/.test(c1.id) && /^pr_[a-z0-9]{12}$/.test(p1.id), "ids match the tables' checks (cl_..., pr_...)", [c1.id, p1.id]);

const draft = (kind, extra = {}) => S.saveDraft({ clientId: c1.id, projectId: p1.id, kind, ...extra });
const pi1 = await draft("proforma", { milestone: "ADVANCE_50", amount: 9000, data: { lines: [] } });
const pi2 = await draft("proforma", { amount: 9000 }); // a plain proforma: a second advance proforma is refused (section A2)
const q1 = await draft("quotation", { amount: 18000 });
const wel = await draft("welcome");
ok(pi1.status === "draft" && pi1.number === null && pi1.serial === null, "owner adds drafts (no number, no serial)", pi1);
let e = await err(() => Promise.resolve(M.R.checkDocumentUpdate({ ...storage.state, documents: [pi1], projects: [p1], payments: [] }, pi1, { ...pi1, status: "issued", number: "IDV/PI/2026-27/099" }, clock)));
ok(e && e.code === "42501", "a draft cannot be marked issued by hand", e?.message);
let d = await S.issueDocument(pi1.id);
ok(d.number === `IDV/PI/${fy}/001`, `first proforma is IDV/PI/${fy}/001`, d.number);
ok(d.dueOn === "2026-10-12" && d.validUntil === "2026-10-20" && d.issuedOn === "2026-10-05", "due and valid-until stamped by the store: +7 and +15 from the India date", d);
d = await S.issueDocument(q1.id);
ok(d.number === `IDV/Q/${fy}/001` && d.dueOn === null && d.validUntil === "2026-10-20", "quotation series runs on its own (valid 15 days, no due date)", d);
d = await S.issueDocument(pi2.id);
ok(d.number === `IDV/PI/${fy}/002`, "second proforma is 002, no gap", d.number);
d = await S.issueDocument(wel.id);
ok(d.status === "issued" && d.number === null, "a welcome pack is finalised without a number", d);
e = await err(() => S.issueDocument(pi2.id));
ok(e && e.code === "42501", "issuing twice is refused", e?.message);
e = await err(() => S.saveDraft({ id: pi1.id, clientId: c1.id, projectId: p1.id, kind: "proforma", amount: 1 }));
ok(e && e.code === "42501" && /does not change/.test(e.message), "an issued document's amount does not change", e?.message);
e = await err(() => S.cancelDocument(pi2.id, "  "));
ok(e && e.code === "42501", "cancel needs a reason", e?.message);
d = await S.cancelDocument(pi2.id, "Wrong billing name");
ok(d.status === "cancelled" && Boolean(d.cancelledAt), "cancel with a reason works and is stamped", d);
e = await err(() => S.cancelDocument(pi2.id, "Another reason"));
ok(e && /cancelled document does not change/.test(e.message), "a cancelled document never changes", e?.message);
e = await err(() => S.deleteDraft(pi2.id));
ok(e && e.code === "42501", "a cancelled document is never deleted", e?.message);

const pi3 = await draft("proforma", {});
e = await err(() => S.issueDocument(pi3.id));
ok(e && e.code === "22023", "a proforma without an amount is refused", e?.message);
await S.saveDraft({ id: pi3.id, clientId: c1.id, projectId: p1.id, kind: "proforma", amount: 9000 });
d = await S.issueDocument(pi3.id);
ok(d.number === `IDV/PI/${fy}/003`, "after a refused issue the next number is still 003 (no gap)", d.number);

await S.saveSettings({ firstSerial: { RC: { [fy]: 5 } } });
const py1 = await S.recordPayment({ clientId: c1.id, projectId: p1.id, againstDoc: pi1.id, receivedOn: "2026-10-05", amount: 9000, mode: "upi", reference: "123456789012" });
ok(py1.status === "recorded", "owner records a payment", py1);
const rc1 = await draft("receipt", { amount: 9000, paymentId: py1.id, relatedDoc: pi1.id });
d = await S.issueDocument(rc1.id);
ok(d.number === `IDV/RC/${fy}/005`, "receipts start at the first serial Mehdi set (005)", d.number);
e = await err(() => Promise.resolve(M.R.checkPaymentDelete()));
ok(e && e.code === "42501" && typeof S.deletePayment === "undefined", "a payment is never deleted (no method, and the rule refuses)", e?.message);
e = await err(() => S.voidPayment(py1.id, "typo"));
ok(e && /Cancel the receipt/.test(e.message), "a payment with an issued receipt cannot be voided first", e?.message);
const st = () => JSON.parse(storage.getItem(M.CLIENTS_LOCAL_KEY));
const pyRow = st().payments.find((p) => p.id === py1.id);
ok(M.R.checkPaymentUpdate(st(), pyRow, { ...pyRow, note: "seen in the statement" }).note === "seen in the statement", "the note on a payment may change");

e = await err(() => S.deleteProject(p1.id));
ok(e && e.code === "42501", "a project with issued documents is never deleted", e?.message);
const p2 = await S.createProject({ clientId: c1.id, name: "Second" });
await S.saveDraft({ clientId: c1.id, projectId: p2.id, kind: "quotation", amount: 12000 });
await S.deleteProject(p2.id);
ok(!st().projects.some((p) => p.id === p2.id) && !st().documents.some((x) => x.projectId === p2.id), "a project with only drafts can be deleted (its drafts go with it)");

let ev = await S.addEvent({ clientId: c1.id, projectId: p1.id, type: "sent", channel: "whatsapp", detail: "Welcome" });
ok(ev.at === clock.toISOString(), "owner adds a timeline line, stamped with the store's clock", ev);
ok(typeof S.updateEvent === "undefined" && typeof S.deleteEvent === "undefined", "timeline lines never change and are never deleted (no such methods)");

// Review of 4 Oct 2026 twins
d = await S.cancelDocument(wel.id, "Wrong kickoff date");
ok(d.status === "cancelled", "an issued welcome pack (no number) can be cancelled with a reason", d);
e = await err(() => Promise.resolve(M.R.checkDocumentInsert(st(), { ...pi1, id: "dc_forged01", status: "issued", series: "INV", fy, serial: 7, number: `IDV/${fy}/007`, kind: "invoice" })));
ok(e && e.code === "42501", "a document cannot be inserted already issued with a chosen number", e?.message);
e = await err(() => Promise.resolve(M.R.checkDocumentInsert(st(), { ...pi3, id: "dc_draft050", status: "draft", series: "PI", fy, serial: 50, number: null, issuedOn: null, dueOn: null, validUntil: null, issuedAt: null })));
ok(e && e.code === "42501", "a draft cannot carry a serial, a year or a series", e?.message);
const pi4 = await draft("proforma", { amount: 9000 });
const pi4Row = st().documents.find((x) => x.id === pi4.id);
e = await err(() => Promise.resolve(M.R.checkDocumentUpdate(st(), pi4Row, { ...pi4Row, serial: 50, fy, series: "PI" }, clock)));
ok(e && e.code === "42501", "...nor be given one later", e?.message);
d = await S.issueDocument(pi4.id);
ok(d.number === `IDV/PI/${fy}/004`, "the next proforma is 004: consecutive", d.number);
const other = await S.createClient({ orgName: "Other Example" });
const pOther = await S.createProject({ clientId: other.id, name: "Other" });
e = await err(() => Promise.resolve(M.R.checkPaymentUpdate(st(), pyRow, { ...pyRow, clientId: other.id, projectId: pOther.id })));
ok(e && e.code === "42501", "a recorded payment never moves to another client or project", e?.message);
const pay = (x) => S.recordPayment({ clientId: c1.id, projectId: p1.id, receivedOn: "2026-10-05", amount: 100, mode: "upi", reference: "x", ...x });
e = await err(() => pay({ againstDoc: pi2.id }));
ok(e && e.code === "23514", "no payment against a cancelled proforma", e?.message);
const pi5 = await draft("proforma", { amount: 9000 });
e = await err(() => pay({ againstDoc: pi5.id }));
ok(e && e.code === "23514", "no payment against a draft", e?.message);
e = await err(() => pay({ againstDoc: q1.id }));
ok(e && e.code === "23514", "no payment against a quotation", e?.message);
e = await err(() => pay({ clientId: other.id, projectId: pOther.id, againstDoc: pi3.id }));
ok(e && e.code === "23514", "no payment from one client against another client's proforma", e?.message);
e = await err(() => pay({ againstDoc: "" }));
ok(e && e.code === "23514", "no payment against no document", e?.message);
e = await err(() => S.saveDraft({ clientId: c1.id, projectId: pOther.id, kind: "invoice", amount: 5000 }));
ok(e && e.code === "23514", "a document cannot sit under one client and another client's project", e?.message);
const rc2 = await draft("receipt", { amount: 9000, paymentId: py1.id, relatedDoc: pi1.id });
e = await err(() => S.issueDocument(rc2.id));
ok(e && (e.code === "23505" || e.code === "23514"), "a second issued receipt for the same payment is refused", e?.message);
const py2 = await S.recordPayment({ clientId: c1.id, projectId: p1.id, againstDoc: pi3.id, receivedOn: "2026-10-05", amount: 8820, tds: 180, mode: "neft", reference: "UTR0002" });
ok(py2.tds === 180, "a payment with TDS against an issued proforma is recorded", py2);
const rc3 = await draft("receipt", { amount: 9000, paymentId: py2.id, relatedDoc: pi3.id });
e = await err(() => S.issueDocument(rc3.id));
ok(e && e.code === "23514", "a receipt for more than was credited (TDS counted in) is refused", e?.message);
await S.saveDraft({ id: rc3.id, clientId: c1.id, projectId: p1.id, kind: "receipt", amount: 8820, paymentId: py2.id, relatedDoc: pi3.id });
d = await S.issueDocument(rc3.id);
ok(d.number === `IDV/RC/${fy}/006`, "the receipt for the amount credited is RC 006, after the refused one (no gap)", d.number);
e = await err(() => S.cancelDocument(pi1.id, "Wrong amount"));
ok(e && e.code === "42501", "a proforma with a recorded payment cannot be cancelled", e?.message);
await S.saveSettings({ firstSerial: { INV: { [fy]: 0 } } });
const inv = await draft("invoice", { milestone: "LAUNCH_50", amount: 9000 });
d = await S.issueDocument(inv.id);
ok(d.number === `IDV/${fy}/001` && d.dueOn === "2026-10-12", "a first serial below 1 counts as 1: the first invoice is 001", d);
const cn1 = await draft("credit_note", { amount: 1000, relatedDoc: q1.id, data: { reasonCode: "D", partnersApproval: { at: "2026-10-04", channel: "whatsapp" } } });
e = await err(() => S.issueDocument(cn1.id));
ok(e && e.code === "23514", "a credit note against a quotation is refused", e?.message);
await S.saveDraft({ id: cn1.id, clientId: c1.id, projectId: p1.id, kind: "credit_note", amount: 1000, relatedDoc: inv.id, data: { reasonCode: "D" } });
e = await err(() => S.issueDocument(cn1.id));
ok(e && e.code === "23514" && /both partners/.test(e.message), "a credit note without both partners' written yes is refused", e?.message);
await S.saveDraft({ id: cn1.id, clientId: c1.id, projectId: p1.id, kind: "credit_note", amount: 1000, relatedDoc: inv.id, data: { reasonCode: "D", partnersApproval: { at: "2026-10-04", channel: "whatsapp" } } });
d = await S.issueDocument(cn1.id);
ok(d.number === `IDV/CN/${fy}/001`, "with the yes recorded it is IDV/CN/.../001", d.number);
const cn2 = await draft("credit_note", { amount: 8500, relatedDoc: inv.id, data: { reasonCode: "B", partnersApproval: { at: "2026-10-04", channel: "email" } } });
e = await err(() => S.issueDocument(cn2.id));
ok(e && e.code === "23514", "credit notes never come to more than the invoice", e?.message);
e = await err(() => S.cancelDocument(inv.id, "x"));
ok(e && e.code === "42501", "an invoice a credit note points at cannot be cancelled", e?.message);
const cnF = await draft("credit_note", { amount: 9000, relatedDoc: pi4.id, data: { reasonCode: "B", partnersApproval: { at: "2026-10-04", channel: "email" } } });
e = await err(() => S.issueDocument(cnF.id));
ok(e && e.code === "23514", "a credit note against a proforma is refused unless it refunds the advance (code F)", e?.message);
await S.saveDraft({ id: cnF.id, clientId: c1.id, projectId: p1.id, kind: "credit_note", amount: 9000, relatedDoc: pi4.id, data: { reasonCode: "F", partnersApproval: { at: "2026-10-04", channel: "email" } } });
d = await S.issueDocument(cnF.id);
ok(d.number === `IDV/CN/${fy}/002`, "code F, against the advance proforma, is IDV/CN/.../002", d.number);
ev = await S.addEvent({ clientId: c1.id, projectId: p1.id, type: "approval", at: "2020-01-01T00:00:00.000Z" });
ok(ev.at.startsWith("2026-10-05"), "a timeline line cannot be back-dated (the store stamps its time)", ev.at);
e = await err(() => S.createClient({ orgName: "Dupe", leadId: "ol_test_1" }));
ok(e && e.code === "23505", "a lead has at most one client (a second project reuses it)", e?.message);
const p3 = await S.createProject({ clientId: c1.id, name: "Third" });
await S.addEvent({ clientId: c1.id, projectId: p3.id, type: "sent", detail: "Proposal sent" });
await S.deleteProject(p3.id);
ok(st().events.filter((x) => x.detail === "Proposal sent" && x.projectId === null).length === 1, "a deleted drafts-only project leaves its timeline lines on the client");
ok(M.N.fyOf("2027-03-31") === "2026-27" && M.N.fyOf("2027-04-01") === "2027-28", "financial year turns on 1 April");
ok(M.N.indiaDate(new Date("2027-03-31T18:31:00Z")) === "2027-04-01" && M.N.indiaDate(new Date("2027-03-31T18:29:00Z")) === "2027-03-31",
  "the India date of an instant: 18:31 UTC on 31 March is 1 April in India");
clock = new Date("2027-03-31T18:31:00.000Z");
const piNext = await draft("proforma", { amount: 100 });
d = await S.issueDocument(piNext.id);
ok(d.number === "IDV/PI/2027-28/001" && d.issuedOn === "2027-04-01", "a document issued at 00:01 India time on 1 April starts the new year's series at 001", d);
clock = new Date("2026-10-05T05:00:00.000Z");
ok(M.N.formatNumber("INV", "2026-27", 1).length === 15 && M.N.formatNumber("RC", "2026-27", 1234) === "IDV/RC/2026-27/1234", "numbers: IDV/2026-27/001 is 15 characters; a serial past 999 keeps all its digits");
ok(M.N.addWorkingDays("2026-10-10", 1) === "2026-10-12" && M.N.addWorkingDays("2026-10-12", -1) === "2026-10-10" && M.N.workingDaysBetween("2026-10-09", "2026-10-13") === 3,
  "working days are Monday to Saturday: Saturday + 1 is Monday; Friday to Tuesday is 3");

/* ── A2. The advance is billed once, and a timeline line belongs to its project's client (gate review, 4 Oct 2026) ── */
console.log("\nA2. The advance is billed once; a timeline line belongs to the client of its project\n");
{
  // An issue that should go through is caught: in a negative mode the run still reaches its verdict line.
  const issued = async (id) => { try { return await S.issueDocument(id); } catch (x) { return { status: "refused", error: x?.message }; } };
  const adv = await draft("proforma", { milestone: "ADVANCE_50", amount: 9000 });
  e = await err(() => S.issueDocument(adv.id));
  ok(e && e.code === "23505" && /already billed/.test(e.message), "a second proforma for the same advance is refused (IDV/PI/.../001 bills it)", e?.message);
  const p2nd = await draft("proforma", { milestone: "ADVANCE_50", amount: 4500, data: { part: 2 } });
  e = await err(() => S.issueDocument(p2nd.id));
  ok(e && e.code === "23514" && /no split advance/.test(e.message), "a part 2 proforma on a project with no split advance is refused", e?.message);
  const sp = await S.createProject({ clientId: c1.id, name: "Split example", fee: 18000,
    splitAdvance: { partnerApprovedAt: "2026-10-04", channel: "whatsapp", part1: 0, part2: 0, part2DueOn: "2026-10-20" } });
  const sd = (extra) => S.saveDraft({ clientId: c1.id, projectId: sp.id, kind: "proforma", milestone: "ADVANCE_50", amount: 4500, ...extra });
  const part1 = await sd({ data: { part: 1 } });
  const part2a = await sd({ data: { part: 2 } });
  const part2b = await sd({ data: { part: 2 } });
  const whole = await sd({ amount: 9000, data: {} });
  d = await issued(part1.id);
  ok(/^IDV\/PI\//.test(d.number || ""), "with a split advance part 1 is issued", d.number);
  const n1 = d.serial;
  d = await issued(part2a.id);
  ok(d.serial === n1 + 1, "...and part 2, the next number: the refused issues above spent none", [n1, d.serial]);
  e = await err(() => S.issueDocument(part2b.id));
  ok(e && e.code === "23505", "a second part 2 is refused", e?.message);
  e = await err(() => S.issueDocument(whole.id));
  ok(e && e.code === "23505", "a proforma for the whole advance after part 1 is refused (it bills part 1 again)", e?.message);
  await err(() => S.cancelDocument(part2a.id, "Part 2 on the wrong date"));
  d = await issued(part2b.id);
  ok(d.status === "issued", "part 2 cancelled with a reason: a new part 2 is issued", d.status);
  const crd = (no, amount) => S.saveDraft({ clientId: c1.id, projectId: sp.id, kind: "proforma", milestone: "CHANGE_REQUEST", amount, data: { crNo: no } });
  const cr1 = await crd("CR-01", 2000), cr1b = await crd("CR-01", 2000), cr2 = await crd("CR-02", 1000);
  d = await issued(cr1.id);
  ok(d.status === "issued", "a change request's advance proforma is issued", d.number);
  e = await err(() => S.issueDocument(cr1b.id));
  ok(e && e.code === "23505" && /change request's advance is already billed/.test(e.message), "a second proforma for the same change request's advance is refused", e?.message);
  d = await issued(cr2.id);
  ok(d.status === "issued", "...while another change request's advance is issued", d.number);
  const again1 = await sd({ data: { part: 1 } });
  e = await err(() => S.issueDocument(again1.id));
  ok(e && e.code === "23505", "part 1 cannot be billed again while its proforma stands", e?.message);
  const cnRefund = await S.saveDraft({ clientId: c1.id, projectId: sp.id, kind: "credit_note", amount: 4500, relatedDoc: part1.id,
    data: { reasonCode: "F", partnersApproval: { at: "2026-10-04", channel: "email" } } });
  d = await issued(cnRefund.id);
  ok(d.status === "issued", "part 1 refunded in full with a code F credit note", d.number);
  d = await issued(again1.id);
  ok(d.status === "issued", "...then part 1 may be billed again: a proforma refunded in full no longer counts", d.number);
  e = await err(() => S.addEvent({ clientId: other.id, projectId: p1.id, type: "note", detail: "Filed under the wrong client" }));
  ok(e && e.code === "23514" && /belongs to the client of its project/.test(e.message), "a timeline line cannot sit under one client and another client's project", e?.message);
  ev = await S.addEvent({ clientId: other.id, projectId: pOther.id, type: "note", detail: "Its own project" }).catch((x) => ({ error: x?.message }));
  ok(ev && ev.projectId === pOther.id, "...while a line under the client of its own project goes in", ev);
  ev = await S.addEvent({ clientId: other.id, projectId: null, type: "note", detail: "A client-level line" }).catch((x) => ({ error: x?.message }));
  ok(ev && ev.projectId === null, "...and so does a client-level line (no project)", ev);
}

/* ── B. Who is acting ───────────────────────────────────────────────────── */
console.log("\nB. Who is acting (local mode's team)\n");
const outStorage = mem();
const member = (id, role) => ({ id, userId: `local:${id}`, email: `${id.slice(2)}@example.org`, displayName: id, role, viewAll: role !== "member", canAddLeads: role !== "member",
  waDailyLimit: null, newLeadCap: 50, mayColdCall: true, targets: {}, active: true, mustChangePassword: false, createdAt: "2026-09-01T00:00:00.000Z" });
outStorage.setItem("ideovent_outreach_v1", JSON.stringify({ leads: [], events: [], settings: null,
  team: { members: [member("m_owner", "owner"), member("m_intern", "member"), member("m_senior", "admin")], notifications: [], requests: [], audit: [], bookings: [], rules: [], reviews: [], usage: {}, seq: 1 } }));
M.setOutreachStoreForTests(new M.LocalOutreachStore(outStorage));
const team = new M.LocalClientStore(mem(), { now: () => clock });
const methods = ["listClients", "listProjects", "listDocuments", "listPayments", "listEvents", "getSettings"];
for (const [actor, label] of [["m_intern", "a member"], ["m_senior", "an admin"], ["m_nobody", "an id not in the team"]]) {
  outStorage.setItem("ideovent_crm_local_actor", actor);
  const refusals = [];
  for (const m of methods) refusals.push(await err(() => team[m]()));
  refusals.push(await err(() => team.openFromLead({ leadId: "ol_x", lead: { instituteName: "X", kind: "other" }, inIndia: true, project: { name: "X" } })));
  refusals.push(await err(() => team.saveSettings({ printTemplateNote: false })));
  refusals.push(await err(() => team.addEvent({ clientId: "cl_xxxxxxxx", type: "note" })));
  ok(refusals.every((x) => x && x.code === "42501" && x.message === "Client files are Mehdi's."), `acting as ${label}, every method throws "Client files are Mehdi's."`, refusals.map((x) => x?.message));
  ok((await team.ready()) === false, `...and ready() is false for ${label}`);
}
outStorage.setItem("ideovent_crm_local_actor", "m_owner");
ok(!(await err(() => team.listClients())) && (await team.ready()), "acting as the owner's own row (m_owner) is still Mehdi");
outStorage.removeItem("ideovent_crm_local_actor");
const fresh = await team.openFromLead({ leadId: "ol_b", lead: { instituteName: "B Example", kind: "dental" }, inIndia: true, project: { name: "B" } });
ok(fresh.client.code === "IDV-C-0001", "no actor at all is Mehdi: he opens a file", fresh.client.code);

/* ── C. openFromLead ───────────────────────────────────────────────────── */
console.log("\nC. Opening a file from a lead\n");
ok(c1.language === "hinglish" && c1.contactName === "Example Principal" && c1.metaConsent === "yes" && c1.inIndia === true && c1.orgName === "Example School",
  "a lead in 'hi' opens in 'hinglish'; contacts, Meta consent and 'in India' come along", c1);
const again = await S.openFromLead({ leadId: "ol_test_1", lead, inIndia: true, project: { name: "Example School care plan", kind: "other" } });
ok(again.client.id === c1.id && again.project.id !== p1.id && again.project.code === "IDV-PR-0006", "a second Open client file for the same lead reuses the client (a second project; IDV-PR-0005 is section A2's split example)", again);
const dncClient = await S.openFromLead({ leadId: "ol_dnc", lead: { ...lead, instituteName: "DNC Example", status: "do_not_contact", language: "en" }, inIndia: false, project: { name: "x" } });
ok(dncClient.client.dnc === true && dncClient.client.language === "en" && dncClient.client.inIndia === false, "do-not-contact and 'not in India' are kept on the client", dncClient.client);

/* ── D. Two tabs ───────────────────────────────────────────────────────── */
console.log("\nD. Two tabs\n");
const cNow = st().clients.find((x) => x.id === c1.id);
const saved = await S.updateClient(c1.id, { legalName: "Example Trust" }, cNow.updatedAt);
clock = new Date(clock.getTime() + 60_000);
e = await err(() => S.updateClient(c1.id, { legalName: "Stale tab" }, cNow.updatedAt));
ok(saved.legalName === "Example Trust" && e && e.message === "Changed in another tab. Reload.", "a client saved from a stale copy is refused: Changed in another tab", e?.message);
const pNow = st().projects.find((x) => x.id === p1.id);
await S.updateProject(p1.id, { stage: "agreement" }, pNow.updatedAt);
clock = new Date(clock.getTime() + 60_000);
e = await err(() => S.updateProject(p1.id, { stage: "welcome" }, pNow.updatedAt));
ok(e && e.message === "Changed in another tab. Reload." && st().projects.find((x) => x.id === p1.id).stage === "agreement", "...and a project too; nothing is written", e?.message);
const before = storage.getItem(M.CLIENTS_LOCAL_KEY);
await err(() => S.issueDocument("dc_nosuch01"));
ok(storage.getItem(M.CLIENTS_LOCAL_KEY) === before, "a refused operation writes nothing at all");

/* ── E. The Supabase store, against a stubbed PostgREST ─────────────────── */
console.log("\nE. SupabaseClientStore against a stubbed PostgREST\n");
function fakeSupabase(tables, opts = {}) {
  const calls = [];
  const missing = new Set(opts.missing || []);
  class Q {
    constructor(t) { this.t = t; this.op = "select"; this.filters = []; this.from = 0; this.to = Infinity; }
    select() { return this; }
    order() { return this; }
    eq(c, v) { this.filters.push([c, v]); return this; }
    limit(n) { this.to = n - 1; return this.run(); }
    range(a, b) { this.from = a; this.to = b; return this.run(); }
    insert(row) { this.op = "insert"; this.row = row; return this; }
    update(row) { this.op = "update"; this.row = row; return this; }
    upsert(row) { this.op = "upsert"; this.row = row; return this.run(); }
    delete() { this.op = "delete"; return this; }
    maybeSingle() { this.one = "maybe"; return this.run(); }
    single() { this.one = "single"; return this.run(); }
    then(res, rej) { return this.run().then(res, rej); }
    async run() {
      calls.push({ t: this.t, op: this.op, from: this.from, to: this.to });
      if (missing.has(this.t)) return { data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${this.t}' in the schema cache` } };
      if (opts.unique && this.op === "insert" && this.t === opts.unique.t) return { data: null, error: { code: "23505", message: `duplicate key value violates unique constraint "${opts.unique.index}"` } };
      const rows = (tables[this.t] || []).filter((r) => this.filters.every(([c, v]) => String(r[c]) === String(v)));
      if (this.op === "insert") { const row = { created_at: "2026-10-05T05:00:00.000000+00:00", updated_at: "2026-10-05T05:00:00.000000+00:00", code: "IDV-C-0009", ...this.row }; (tables[this.t] ||= []).push(row); return { data: this.one ? row : [row], error: null }; }
      if (this.op === "update" || this.op === "delete" || this.op === "upsert") return { data: [], error: null };
      const page = rows.slice(this.from, this.to + 1);
      if (this.one) return { data: page[0] || null, error: null };
      return { data: page, error: null };
    }
  }
  return { calls, from: (t) => new Q(t), rpc: async (fn) => { calls.push({ fn }); return { data: null, error: { code: "42501", message: "Only Mehdi issues documents." } }; } };
}
const SB = new M.SupabaseClientStore();
const timeline = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1, client_id: "cl_abcdef1", project_id: "pr_abcdef1", at: new Date(Date.UTC(2026, 9, 1) + i * 60000).toISOString(), type: "sent", channel: "whatsapp", template_id: "cp_welcome_wa_hi", detail: `line ${i + 1}`, data: {} }));
globalThis.__fakeSupabase = fakeSupabase({ crm_client_events: timeline, crm_clients: [] });
const lines = await SB.listEvents("pr_abcdef1");
const pages = globalThis.__fakeSupabase.calls.filter((x) => x.t === "crm_client_events").length;
ok(lines.length === 2500 && pages === 3 && new Set(lines.map((l) => l.id)).size === 2500, "a 2,500-line timeline comes back whole, in three pages of 1,000", { n: lines.length, pages });
ok((await SB.ready()) === true, "ready() is true when the tables answer");
globalThis.__fakeSupabase = fakeSupabase({}, { missing: ["crm_clients"] });
ok((await SB.ready()) === false, "a missing table (PGRST205) reads as ready() === false: \"This needs the client update (0014)\"");
e = await err(() => SB.listClients());
ok(e && e.message === "This needs the client update (0014).", "...and a read says so in those words", e?.message);
globalThis.__fakeSupabase = fakeSupabase({ crm_clients: [] }, { unique: { t: "crm_clients", index: "crm_clients_lead_idx" } });
e = await err(() => SB.createClient({ orgName: "x", leadId: "ol_test_1" }));
ok(e && e.message === "This lead already has a client file: opening it.", "the one-client-per-lead index in plain words", e?.message);
globalThis.__fakeSupabase = fakeSupabase({}, {});
e = await err(() => SB.issueDocument("dc_abcdef1"));
ok(e && e.code === "42501" && e.message === "Only Mehdi issues documents.", "a refusal by the issue function keeps the database's sentence", e?.message);

const counting = fakeSupabase({ crm_clients: [] });
globalThis.__fakeSupabase = counting;
const meOf = (role, legacy = false) => ({ legacy, memberId: role ? `m_${role}` : null, role, displayName: "x", viewAll: true, canAddLeads: true, mayColdCall: true, waDailyLimit: null,
  newLeadCap: 10, targets: {}, senderChecked: true, mustChangePassword: false });
for (const [me, label] of [[meOf("member"), "a member"], [meOf("admin"), "an admin"], [meOf(null), "nobody signed in"], [null, "no session"]]) {
  const r = await M.loadClientData(SB, me);
  ok(r.data === null && r.allowed === false, `${label}: the loader says not allowed`);
}
ok(counting.calls.length === 0, "...and makes no request at all for any of them (the provider is inert)", counting.calls);
const r1 = await M.loadClientData(SB, meOf("owner"));
ok(r1.ready === true && Array.isArray(r1.data.clients) && counting.calls.length > 0, "for the owner it reads the tables");
globalThis.__fakeSupabase = fakeSupabase({}, { missing: ["crm_clients"] });
const r2 = await M.loadClientData(SB, meOf("owner", true));
ok(r2.ready === false && r2.allowed === true && r2.data === null, "the owner before 0014 (even in legacy mode): allowed, not ready");

console.log(`\n${pass} passed, ${fails.length} failed${NEG ? ` (negative mode: ${NEG})` : ""}`);
process.exit(fails.length ? 1 : 0);
