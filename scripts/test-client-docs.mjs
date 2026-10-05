/**
 * The client file's documents (src/lib/clients/docs), in Node, client-process-spec 14.3.
 *
 *   node scripts/test-client-docs.mjs
 *   CLIENT_DOCS_NEGATIVE=isolation node scripts/test-client-docs.mjs   (must fail)
 *   CLIENT_DOCS_NEGATIVE=snapshot node scripts/test-client-docs.mjs    (must fail)
 *
 * WHAT IT ASSERTS
 *   Every document kind built from fictional clients ("Example School", "Sample Dental Clinic", "Demo
 *   Coaching Centre", example.org addresses) through the store's real money chain (drafts, issue,
 *   payments, receipts) and docContext:
 *   - the template sentences, spot-checked per kind: the GST line on every money document; Udyam on the
 *     quotation, proforma and invoice and on nothing else; "Authorised Partner", never "Proprietor"; the
 *     proforma's "not a tax invoice" banner; term 9 (the MSMED Act) on the invoice only; "No password is
 *     written in this table"; the welcome pack's thirteen headings in order; the care plan prices equal
 *     pricing.ts CARE;
 *   - a model with a blank refuses to issue, and each kind blocks on exactly its row of 6.1's table (a
 *     proforma never on the signatory, a receipt never on the bank, nothing on the full address line or
 *     the registration status); with Settings filled, nothing blocks;
 *   - a care plan invoice carries the AMC terms (no "1.5%", no "work on the project pauses", no term 7)
 *     and [late interest percent] until set; a code F credit note says "Against proforma" and has no
 *     refund reference row; the proforma says "Against proposal" when no quotation was issued; the
 *     client's GSTIN only when recorded; the welcome pack's split-advance and reply-time sentences only
 *     when their facts exist, and no money section outside India;
 *   - the PDF: A4, "Page X of Y" on every page, the draft watermark only on drafts, "CANCELLED: <reason>"
 *     on a cancelled one, byte-identical when built twice, no character outside Windows-1252, the file
 *     names of 6.1; a Devanagari name refused with the field named;
 *   - an issued document is drawn from its snapshot: the client card changing afterwards does not change
 *     its PDF by one byte;
 *   - isolation (decision 17): every kind built for two clients from one store; no name, contact,
 *     e-mail, phone, document number or amount unique to one appears in the other's PDF text, and a
 *     builder's context holds only its own client's documents and payments;
 *   - the gate review of 4 Oct 2026 (section 9): a file opened from a Won lead issues its advance
 *     proforma with no quotation made after the yes ("Against proposal: accepted on <the yes>", or the
 *     number they accepted); the Udyam number comes from Settings and is in no file the website serves;
 *     a draft's "Valid until" says "(15 days)" once.
 *
 * NEGATIVE MODES patch the bundled source: "isolation" makes docContext hand a builder every document
 * and payment in the store; "snapshot" makes an issued document rebuild from the live data. Each must
 * make this suite fail.
 *
 * jsPDF runs through its Node build (node_modules/jspdf, dist/jspdf.node.min.js). Fictional data only.
 */
import { build } from "esbuild";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEG = process.env.CLIENT_DOCS_NEGATIVE || "";
if (NEG && !["isolation", "snapshot"].includes(NEG)) {
  console.error(`Unknown CLIENT_DOCS_NEGATIVE=${NEG} (isolation | snapshot).`);
  process.exit(2);
}

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}
let patched = false;
const PATCHES = {
  isolation: {
    file: /docs[\\/]context\.ts$/,
    from: [
      "docs = data.documents.filter((d) => d.projectId === pid && d.clientId === project!.clientId);",
      "payments = data.payments.filter((p) => p.projectId === pid && p.clientId === project!.clientId);",
    ],
    to: ["docs = data.documents;", "payments = data.payments;"],
  },
  snapshot: {
    file: /docs[\\/]builders[\\/]index\.ts$/,
    from: ['if (doc && doc.status !== "draft" && doc.data?.model) return doc.data.model;'],
    to: [""],
  },
};
const alias = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/cms\/client$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export function supabase() { throw new Error('no Supabase in this test'); }", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (NEG) {
      const p = PATCHES[NEG];
      b.onLoad({ filter: p.file }, (args) => {
        let src = readFileSync(args.path, "utf8");
        p.from.forEach((f, i) => {
          if (!src.includes(f)) throw new Error(`negative mode ${NEG}: "${f}" not found in ${args.path}`);
          src = src.replace(f, p.to[i]);
        });
        patched = true;
        return { contents: src, loader: "ts" };
      });
    }
  },
};
const out = join(tmpdir(), `ideovent-test-client-docs-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: [
      `export { LocalClientStore, DEFAULT_CLIENT_SETTINGS, mergeClientSettings } from "@/lib/clients/store";`,
      `export * as B from "@/lib/clients/docs/builders";`,
      `export { WELCOME_HEADINGS, BIOS } from "@/lib/clients/docs/builders/welcome";`,
      `export { docContext } from "@/lib/clients/docs/context";`,
      `export * as TX from "@/lib/clients/docs/text";`,
      `export * as PDF from "@/lib/clients/docs/pdf";`,
      `export * as RENDER from "@/lib/clients/docs/render";`,
      `export * as ISSUE from "@/lib/clients/docs/issue";`,
      `export * as MONEY from "@/lib/clients/money";`,
      `export { advanceAgainst } from "@/lib/clients/docs/builders/proforma";`,
      `export { CARE } from "@/lib/pricing";`,
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
const { jsPDF } = createRequire(join(ROOT, "package.json"))("jspdf");

let pass = 0;
const fails = [];
const ok = (c, m, got) => {
  if (c) pass++;
  else fails.push(got === undefined ? m : `${m}\n      got: ${typeof got === "string" ? got : JSON.stringify(got)}`);
};
const throwsWith = async (fn, re, m) => {
  try {
    await fn();
    fails.push(`${m} (did not throw)`);
  } catch (e) {
    ok(re.test(String(e?.message || e)), m, String(e?.message || e));
  }
};

/* ── PDF text: the (…) Tj strings of an uncompressed jsPDF file, cp1252 decoded ── */
const CP = { 0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž",
  0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ" };
function pdfStrings(bytes) {
  const s = Buffer.from(bytes).toString("latin1");
  const outS = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let m;
  while ((m = re.exec(s))) {
    const raw = m[1].replace(/\\([()\\])/g, "$1").replace(/\\(\d{3})/g, (_w, o) => String.fromCharCode(parseInt(o, 8)));
    outS.push([...raw].map((ch) => CP[ch.charCodeAt(0)] || ch).join(""));
  }
  return { raw: s, strings: outS, text: outS.join(" ").replace(/\s+/g, " ") };
}
const sameBytes = (a, b) => a.length === b.length && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

/* ── The store and the clock ─────────────────────────────────────────────── */
function memStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}
let clock = new Date("2026-10-05T05:30:00Z"); // Monday 5 Oct 2026, 11:00 India time
const at = (iso) => (clock = new Date(`${iso}T05:30:00Z`));
const st = new M.LocalClientStore(memStorage(), { whoIsActing: async () => "owner", now: () => clock });

const FULL = {
  billing: {
    bankName: "Example Bank", accountName: "Ideovent Technologies", accountNo: "000011112222", ifsc: "EXMP0000001", branch: "Saket",
    upiId: "ideovent@examplebank", firmPan: "AAAFI0000A", signatory: "Mehdi Alam",
    // The Udyam number lives in Settings, never in the CRM's code (FACTS: "not on the website"); section 9 checks that.
    udyam: "UDYAM-BR-13-0030570",
  },
  policy: { assetDeadlineDays: 10, disputeWindowDays: 7, receiptDays: 1, refundDays: 14, lateInterestPercent: 2 },
};
await st.saveSettings(FULL);

async function data() {
  const [clients, projects, documents, payments, settings] = await Promise.all([st.listClients(), st.listProjects(), st.listDocuments(), st.listPayments(), st.getSettings()]);
  return { clients, projects, documents, payments, settings };
}
async function issue(id) {
  return M.ISSUE.issueWithSnapshot(st, await data(), id, clock);
}
async function draft(input) {
  return st.saveDraft({ milestone: null, data: {}, ...input });
}
async function pay(doc, amount, day, ref, tds = 0) {
  at(day);
  const p = await st.recordPayment({ clientId: doc.clientId, projectId: doc.projectId, againstDoc: doc.id, receivedOn: day, amount, tds, mode: "neft", reference: ref });
  const r = await st.saveDraft(M.ISSUE.receiptDraft(p));
  return { payment: p, receipt: await issue(r.id) };
}

/** One client through the chain: quotation, proforma, advance and receipt, launch invoice, launch payment and receipt. */
async function journey(f) {
  at("2026-10-05");
  const client = await st.createClient({
    orgName: f.org, kind: f.kind, inIndia: true, legalName: f.legal, contactName: f.contact, phone: f.phone, whatsapp: f.phone, email: f.email,
    billingAddress: f.address, state: f.state, city: f.city, gstin: f.gstin, signatoryName: f.contact, signatoryDesignation: f.designation,
    renewals: { domain: { provider: f.registrar, renewsOn: "2027-09-30", inWhoseName: f.legal, cost: "Rs 1,000 a year", whoPays: f.legal } },
  });
  let project = await st.createProject({
    clientId: client.id, name: f.project, kind: "website", lines: [{ description: f.line, qty: 1, unit: "project", rate: f.fee }], durationWeeks: 4,
    sowRef: f.sow, proposalNo: f.proposal, liveUrl: `https://www.${f.domain}`, domainName: f.domain, domainInClientName: "from_start", pointOfContact: f.contact,
    deliverables: [{ text: f.deliverable, delivered: "yes" }],
    dates: { goLiveTarget: "2026-11-02" },
    access: [{ system: "Hosting control panel", username: f.email, method: "own_email_invite", transferredOn: "2026-11-03", changedByClient: true, waitsForPayment: true }],
    training: { at: "2026-11-03", minutes: 45, attendees: f.contact, guideSent: true },
    changeRequests: [{ no: "CR-01", raisedAt: "2026-10-20T06:00:00Z", requestedBy: f.contact, description: f.cr, reason: "Asked for at the design review.", scopeImpact: "One page added to section 6.", days: 2, cost: f.crCost, advanceDue: f.crAdv, lapsesOn: "2026-10-27", status: "sent" }],
  });
  const q = f.quote === false ? null : await draft({ clientId: client.id, projectId: project.id, kind: "quotation" });
  const quote = q ? await issue(q.id) : null;
  at("2026-10-06");
  const piDraft = await draft({ clientId: client.id, projectId: project.id, kind: "proforma", milestone: "ADVANCE_50", data: f.split ? { part: 1 } : {} });
  const proforma = await issue(piDraft.id);
  const adv = await pay(proforma, proforma.amount, "2026-10-07", `UTR${f.tag}0001`);
  const out = { client, project, quote, proforma, advance: adv };
  if (f.stopAfterAdvance) return out;
  project = (await st.listProjects()).find((p) => p.id === project.id);
  project = await st.updateProject(project.id, { dates: { ...project.dates, kickoff: "2026-10-08", accepted: "2026-10-30", goLive: "2026-11-02", handover: "2026-11-03", sourceTransferred: "2026-11-03", accessRemoved: "2026-12-03" }, kickoffTime: "11:00" }, project.updatedAt);
  at("2026-10-30");
  const invDraft = await draft({ clientId: client.id, projectId: project.id, kind: "invoice", milestone: "LAUNCH_50" });
  const invoice = await issue(invDraft.id);
  const launch = await pay(invoice, invoice.amount, "2026-10-31", `UTR${f.tag}0002`);
  return { ...out, project, invoice, launch };
}

const A = {
  tag: "A", org: "Example School", kind: "school", legal: "Example School Trust", contact: "Asha Rao", designation: "Principal", phone: "+91 90000 11111",
  email: "office@school.example.org", address: "12 Example Road, Saket, New Delhi 110017", state: "Delhi", city: "New Delhi", gstin: "07ABCDE1234F1Z5",
  registrar: "Example Registrar", project: "Example School website", line: "School website, eight pages, as in the Statement of Work", fee: 18000,
  sow: "SOW-EXS-01", proposal: "PROP-EXS-01", domain: "school.example.org", deliverable: "Eight-page school website with an admissions enquiry form",
  cr: "A gallery page for the annual day photographs", crCost: 3000, crAdv: 1500,
};
const Bc = {
  tag: "B", org: "Sample Dental Clinic", kind: "dental", legal: "Sample Dental Clinic LLP", contact: "Ravi Menon", designation: "Partner", phone: "+91 90000 22222",
  email: "frontdesk@clinic.example.org", address: "45 Sample Lane, Kothrud, Pune 411038", state: "Maharashtra", city: "Pune", gstin: undefined,
  registrar: "Sample Domains", project: "Sample Dental Clinic website", line: "Clinic website, six pages, with appointment requests", fee: 27500,
  sow: "SOW-SDC-07", proposal: "PROP-SDC-07", domain: "clinic.example.org", deliverable: "Six-page clinic website with an appointment request form",
  cr: "A treatments price list page", crCost: 4200, crAdv: 2100,
};
const C = {
  tag: "C", org: "Demo Coaching Centre", kind: "coaching", legal: "Demo Coaching Centre", contact: "Neha Kapoor", designation: "Director", phone: "+91 90000 33333",
  email: "hello@coaching.example.org", address: "7 Demo Market, Lajpat Nagar, New Delhi 110024", state: "Delhi", city: "New Delhi", gstin: undefined,
  registrar: "Demo Registrar", project: "Demo Coaching Centre landing page", line: "Landing page with a batch enquiry form", fee: 9500,
  sow: "SOW-DCC-03", proposal: "PROP-DCC-03", domain: "coaching.example.org", deliverable: "One landing page with an enquiry form",
  cr: "A results section", crCost: 1000, crAdv: 500, quote: false, split: true, stopAfterAdvance: true,
};

const ja = await journey(A);
const jb = await journey(Bc);
// C: no quotation (the proforma says "Against proposal"), a split advance agreed with the other partner's yes.
at("2026-10-05");
const jcClient = await st.createClient({ orgName: C.org, kind: C.kind, inIndia: true, legalName: C.legal, contactName: C.contact, email: C.email, phone: C.phone, billingAddress: C.address, state: C.state, city: C.city, signatoryName: C.contact, signatoryDesignation: C.designation });
let jcProject = await st.createProject({
  clientId: jcClient.id, name: C.project, kind: "landing", lines: [{ description: C.line, qty: 1, unit: "project", rate: C.fee }], durationWeeks: 2, sowRef: C.sow, proposalNo: C.proposal,
  splitAdvance: { partnerApprovedAt: "2026-10-05", channel: "WhatsApp", part1: 0, part2: 0, part2DueOn: "2026-10-20" },
});
at("2026-10-06");
const cpi = await issue((await draft({ clientId: jcClient.id, projectId: jcProject.id, kind: "proforma", milestone: "ADVANCE_50", data: { part: 1 } })).id);
const cAdv = await pay(cpi, cpi.amount, "2026-10-07", "UTRC0001");

const D0 = await data();
const ctxOf = (d, doc) => M.ISSUE.ctxForDoc(d, doc, clock);
const projCtx = (d, project, doc = null) => M.docContext(d, { projectId: project.id }, doc ? doc.id : null, clock);
const textOf = (model) => M.TX.modelText(model);
const blanksOf = (model) => M.TX.modelBlanks(model).sort();

/* ── 1. The chain: numbers, amounts, file names ──────────────────────────── */
ok(ja.quote.number === "IDV/Q/2026-27/001" && jb.quote.number === "IDV/Q/2026-27/002", "quotations numbered IDV/Q/2026-27/001 and 002", [ja.quote.number, jb.quote.number]);
ok(ja.proforma.number === "IDV/PI/2026-27/001" && ja.proforma.amount === 9000, "A's advance proforma is IDV/PI/2026-27/001 for 9,000 (50% of 18,000)", [ja.proforma.number, ja.proforma.amount]);
ok(jb.proforma.amount === 13750 && jb.invoice.amount === 13750, "B's advance and launch invoice are 13,750 each (50/50 of 27,500)", [jb.proforma.amount, jb.invoice.amount]);
ok(ja.advance.receipt.number === "IDV/RC/2026-27/001" && ja.launch.receipt.number === "IDV/RC/2026-27/002", "A's receipts are RC 001 and 002", [ja.advance.receipt.number, ja.launch.receipt.number]);
ok(ja.invoice.number === "IDV/2026-27/001" && ja.invoice.amount === 9000, "A's launch invoice is IDV/2026-27/001 for the fee less the advance (9,000)", [ja.invoice.number, ja.invoice.amount]);
ok(cpi.amount === 2375, "C's split advance part 1 is half of the 4,750 advance (2,375)", cpi.amount);
ok(ja.proforma.data.model && ja.proforma.data.model.title === "Proforma Invoice", "an issued document keeps its model as a snapshot (data.model)");
{
  const ctx = ctxOf(D0, ja.proforma);
  ok(M.B.fileNameFor(ja.proforma, "proforma", ctx) === "IDV-PI-2026-27-001-ExampleSchool.pdf", "file name of a numbered document: IDV-PI-2026-27-001-ExampleSchool.pdf", M.B.fileNameFor(ja.proforma, "proforma", ctx));
  ok(M.B.fileNameFor(null, "welcome", { client: ja.client, today: "2026-10-05" }) === "DRAFT-Ideovent-Welcome-ExampleSchool-2026-10-05.pdf", "a draft welcome pack's file name says DRAFT", M.B.fileNameFor(null, "welcome", { client: ja.client, today: "2026-10-05" }));
  ok(M.B.fileNameFor({ kind: "welcome", status: "issued", number: null, issuedOn: "2026-10-07", data: {} }, "welcome", { client: ja.client, today: "2026-10-09" }) === "Ideovent-Welcome-ExampleSchool-2026-10-07.pdf", "an issued welcome pack: Ideovent-Welcome-ExampleSchool-2026-10-07.pdf");
  ok(M.B.fileNameFor({ kind: "change_request", status: "issued", number: null, issuedOn: "2026-10-21", data: { crNo: "CR-01" } }, "change_request", { client: ja.client, today: "2026-10-21" }) === "Ideovent-CR-01-ExampleSchool-2026-10-21.pdf", "a change request form: Ideovent-CR-01-ExampleSchool-2026-10-21.pdf");
}

/* ── 2. Every kind, for A and B: the drafts not issued yet ───────────────── */
async function moreDocs(j) {
  const ids = {};
  const mk = async (kind, extra = {}) => (ids[kind] = (await draft({ clientId: j.client.id, projectId: j.project.id, kind, ...extra })).id);
  at("2026-10-07");
  await mk("welcome");
  at("2026-10-21");
  await mk("change_request", { data: { crNo: "CR-01" } });
  at("2026-11-03");
  await mk("handover");
  await mk("care_plan");
  at("2026-12-03");
  await mk("closing");
  return ids;
}
const idsA = await moreDocs(ja);
const idsB = await moreDocs(jb);
// A: a credit note (code B, billing error) against the launch invoice, with both partners' yes.
at("2026-11-01");
const cnA = await draft({ clientId: ja.client.id, projectId: ja.project.id, kind: "credit_note", relatedDoc: ja.invoice.id, amount: 500, data: { reasonCode: "B", reason: "The hosting line was billed twice.", agreedWith: "Asha Rao", agreedOn: "2026-11-01", settlement: "adjusted", partnersApproval: { at: "2026-11-01", channel: "WhatsApp" }, lines: [{ description: "Hosting set-up billed twice", amount: 500 }] } });
// A and B: a care plan invoice (client level), after the plan is taken.
async function amcInvoice(j, plan) {
  const c = (await st.listClients()).find((x) => x.id === j.client.id);
  await st.updateClient(c.id, { carePlan: { plan, billing: "monthly", fee: M.MONEY.CARE_PLANS[plan].monthly, startOn: "2026-12-03", renewalOn: "2027-01-03", status: "active" } }, c.updatedAt);
  return (await draft({ clientId: j.client.id, projectId: null, kind: "invoice", milestone: "AMC", data: { period: { from: "2026-12-03", to: "2027-01-02", plan, billing: "monthly" } } })).id;
}
const amcA = await amcInvoice(ja, "essential");
const amcB = await amcInvoice(jb, "growth");
// C: code F, the advance refunded (the project did not start).
at("2026-10-09");
const cnF = await draft({ clientId: jcClient.id, projectId: jcProject.id, kind: "credit_note", relatedDoc: cpi.id, amount: cpi.amount, data: { reasonCode: "F", reason: "The project did not start and the advance is being returned.", agreedWith: C.contact, agreedOn: "2026-10-09", settlement: "refunded", partnersApproval: { at: "2026-10-09", channel: "e-mail" } } });

/* Issue them, as Mehdi would: with Settings filled, nothing blocks. */
for (const id of [...Object.values(idsA), ...Object.values(idsB), cnA.id, amcA, amcB, cnF.id]) {
  const d = await data();
  const doc = d.documents.find((x) => x.id === id);
  const probs = M.ISSUE.problemsFor(d, doc, clock);
  ok(probs.length === 0, `with Settings filled, ${doc.kind}${doc.milestone ? ` (${doc.milestone})` : ""} of ${d.clients.find((c) => c.id === doc.clientId).orgName} has nothing blocking`, probs);
  if (!probs.length) await issue(id);
}
const D = await data();
const docsOf = (clientId) => D.documents.filter((x) => x.clientId === clientId);
const byKind = (clientId, kind, milestone) => docsOf(clientId).filter((x) => x.kind === kind && (!milestone || x.milestone === milestone));

/* ── 3. The models: template sentences per kind ───────────────────────────── */
const GST = "GST not applicable. Supplier is not registered under GST.";
const UDYAM = "UDYAM-BR-13-0030570";
const MSMED = "Micro, Small and Medium Enterprises Development Act, 2006";
const MONEY_KINDS = ["quotation", "proforma", "invoice", "receipt", "credit_note"];
const modelA = {};
for (const doc of docsOf(ja.client.id).filter((x) => x.status === "issued")) {
  const key = doc.kind === "invoice" ? `invoice:${doc.milestone}` : doc.kind === "receipt" ? `receipt:${doc.number}` : doc.kind;
  modelA[key] = M.B.modelFor(ctxOf(D, doc), doc.kind);
}
ok(["quotation", "proforma", "receipt", "invoice:LAUNCH_50", "invoice:AMC", "credit_note", "welcome", "change_request", "handover", "care_plan", "closing"].every((k) => Object.keys(modelA).some((x) => x === k || x.startsWith(`${k}:`))), "every kind was issued for A", Object.keys(modelA));
for (const [key, model] of Object.entries(modelA)) {
  const kind = key.split(":")[0];
  const t = textOf(model);
  if (MONEY_KINDS.includes(kind)) ok(t.includes(GST), `${key}: the GST line`);
  ok(t.includes(UDYAM) === ["quotation", "proforma", "invoice"].includes(kind), `${key}: Udyam ${["quotation", "proforma", "invoice"].includes(kind) ? "printed" : "not printed"}`);
  ok(!/Proprietor/i.test(t), `${key}: never "Proprietor"`);
  if (["quotation", "invoice", "receipt", "change_request", "handover"].includes(kind)) ok(t.includes("Authorised Partner"), `${key}: signed as "Authorised Partner"`);
  ok(t.includes(MSMED) === (kind === "invoice"), `${key}: term 9 (the MSMED Act) ${kind === "invoice" ? "printed" : "not printed"}`);
  ok(!/[–—]/.test(t.replace(/\{\{[a-zA-Z]+\}\}/g, "")), `${key}: no em or en dash`);
  ok(M.TX.modelBlanks(model).length === 0, `${key}: issued with no blank`, M.TX.modelBlanks(model));
}
ok(textOf(modelA.proforma).includes("This is a proforma invoice. It is not a tax invoice and not a receipt."), "proforma: the not-a-tax-invoice banner");
ok(textOf(modelA.proforma).includes("Against quotation") && textOf(modelA.proforma).includes("IDV/Q/2026-27/001"), "proforma: against the issued quotation");
ok(/Due date/.test(textOf(modelA.proforma)), "proforma: the Due date row (issue + 7)");
ok(textOf(modelA.handover).includes("No password is written in this table, only the method and the date."), "handover: no password in the transfer record");
ok(textOf(modelA.handover).includes("Registered in the name of") && textOf(modelA.handover).includes("Ideovent does not hold client domains in its own name."), "handover: the domain is in the client's name");
{
  const heads = modelA.welcome.blocks.filter((b) => b.type === "heading").map((b) => b.text);
  ok(JSON.stringify(heads) === JSON.stringify(M.WELCOME_HEADINGS) && heads.length === 13, "welcome pack: the thirteen headings in order", heads);
  const t = textOf(modelA.welcome);
  ok(t.includes(M.BIOS.mehdi) && t.includes(M.BIOS.abhishek), "welcome pack: the two approved bios word for word");
  ok(!t.includes(UDYAM) && !t.includes("Account number"), "welcome pack: no Udyam number, no bank details");
  ok(t.includes("Advance received") && t.includes("Rs. 9,000") && t.includes("receipt IDV/RC/2026-27/001"), "welcome pack: the advance received with its receipt", t.match(/Advance received[^\n]*\n[^\n]*/)?.[0]);
  ok(!t.includes("We reply to project messages within"), "welcome pack: no reply-time sentence while Settings has no reply target");
  ok(!t.includes("as agreed.") && t.includes("50% advance, received with thanks."), "welcome pack: no split-advance sentence without a split advance");
}
{
  const t = textOf(modelA.care_plan);
  const allPrices = M.CARE.every((p) => t.includes(`Rs. ${M.MONEY.inrGroup(p.monthly)}`) && t.includes(`Rs. ${M.MONEY.inrGroup(p.yearly)}`));
  ok(allPrices && M.CARE.length === 3, "care plan options: the fees are pricing.ts CARE", M.CARE);
  ok(t.includes("No care plan is compulsory, and nothing switches on by default."), "care plan options: the second bullet word for word");
}
{
  const t = textOf(modelA["invoice:LAUNCH_50"]);
  ok(t.includes("Less: advance received 7 Oct 2026") && t.includes("Total due"), "launch invoice: Less: advance received <date>", t.match(/Less:[^\n]*/g));
  ok(t.includes("Intellectual property in the deliverables passes to the client"), "launch invoice: term 7 (IP on the full contract value)");
  ok(t.includes("GSTIN 07ABCDE1234F1Z5"), "launch invoice: A's GSTIN under Bill to (recorded)");
  ok(textOf(modelA.proforma).includes("GSTIN 07ABCDE1234F1Z5"), "proforma: A's GSTIN under Bill to (recorded)");
  ok(t.includes("the TDS certificate") && !/section 19[0-9]/i.test(t) && !/\b194J\b/.test(t), "invoice: the TDS lines name no section of the Income-tax Act (E5)");
}
{
  const amc = textOf(modelA["invoice:AMC"]);
  ok(!amc.includes("1.5%") && !amc.includes("work on the project pauses") && !amc.includes("Intellectual property in the deliverables"), "care plan invoice: no 1.5%, no project pause, no term 7");
  ok(amc.includes("Maintenance and Support Agreement, Clause 11.6") && amc.includes("Clauses 11.2 and 11.3"), "care plan invoice: the AMC terms 5 and 6");
  ok(amc.includes("Essential care plan"), "care plan invoice: names the plan");
}
{
  const cn = textOf(modelA.credit_note);
  ok(cn.includes("Against invoice") && cn.includes("IDV/2026-27/001") && !cn.includes("Refund reference"), "credit note (code B): against the invoice, no refund reference row");
  const f = D.documents.find((x) => x.id === cnF.id);
  ok(f.status === "issued" && f.number === "IDV/CN/2026-27/002", "code F credit note issued against the proforma (CN 002)", [f.status, f.number]);
  const tf = textOf(M.B.modelFor(ctxOf(D, f), "credit_note"));
  ok(tf.includes("Against proforma") && !tf.includes("Against invoice") && !tf.includes("Refund reference"), "code F credit note: \"Against proforma\" and no refund reference row");
  ok(tf.includes("14 days, to the account the original payment came from"), "code F credit note: refunded within [[REFUND_DAYS]] days");
}
{
  const t = textOf(M.B.modelFor(ctxOf(D, cpi), "proforma"));
  ok(t.includes("Against proposal") && t.includes("PROP-DCC-03"), "C's proforma: \"Against proposal\" when no quotation was issued");
  ok(t.includes("part 1 of 2 of the 50% advance"), "C's proforma: part 1 of 2 of the split advance");
  ok(!/GSTIN \d{2}[A-Z0-9]{13}/.test(t), "C's proforma: no client GSTIN line (none recorded)");
  const tb = textOf(M.B.modelFor(ctxOf(D, jb.invoice), "invoice"));
  ok(!/GSTIN \d{2}[A-Z0-9]{13}/.test(tb), "B's invoice: no client GSTIN line (none recorded)");
}
{
  const wctx = projCtx(D, jcProject);
  const w = textOf(M.B.BUILDERS.welcome(wctx));
  ok(/The 50% advance: Rs\. 2,375 received with thanks, and Rs\. 2,375 due on 20 Oct 2026, as agreed\./.test(w), "welcome pack (split advance): the split sentence with the part still due", w.match(/The 50% advance[^\n]*/)?.[0]);
  const withReply = { ...wctx, settings: { ...wctx.settings, policy: { ...wctx.settings.policy, projectReplyTarget: "4 hours", workingHours: "Monday to Saturday, 10:00 to 19:00" } } };
  const w2 = textOf(M.B.BUILDERS.welcome(withReply));
  ok(w2.includes("We reply to project messages within 4 hours, counted in working hours.") && w2.includes("Working days and hours: Monday to Saturday, 10:00 to 19:00."), "welcome pack: the reply-time and working-hours sentences once Settings has them");
  const abroad = textOf(M.B.BUILDERS.welcome({ ...wctx, client: { ...wctx.client, inIndia: false } }));
  ok(!abroad.includes("Payments") && !abroad.includes("Total fee") && !abroad.includes("Rs. 1,000 a month"), "welcome pack outside India: no money section");
  const abroadQ = M.B.issueProblems({ ...wctx, client: { ...wctx.client, inIndia: false } }, "quotation", M.B.BUILDERS.quotation({ ...wctx, client: { ...wctx.client, inIndia: false } }));
  ok(abroadQ.some((p) => /outside India/.test(p)), "a client outside India: no money document", abroadQ);
}

/* ── 4. What each kind blocks on (6.1's table), with Settings empty ───────── */
const EMPTY = M.mergeClientSettings({});
const BANK = ["[bank name]", "[account name]", "[account number]", "[IFSC]", "[branch]", "[UPI ID]"];
const EXPECT = {
  quotation: ["[firm PAN]", "[Udyam number]", "[authorised signatory]", "[asset deadline days]"],
  proforma: ["[firm PAN]", "[Udyam number]", ...BANK, "[receipt days]", "[refund days]"],
  receipt: ["[firm PAN]", "[authorised signatory]"],
  "invoice:LAUNCH_50": ["[firm PAN]", "[Udyam number]", ...BANK, "[authorised signatory]", "[dispute window days]"],
  "invoice:AMC": ["[firm PAN]", "[Udyam number]", ...BANK, "[authorised signatory]", "[dispute window days]", "[late interest percent]"],
  credit_note: ["[firm PAN]"],
  change_request: ["[authorised signatory]"],
  handover: ["[authorised signatory]"],
  welcome: [],
  care_plan: [],
  closing: [],
};
for (const doc of docsOf(ja.client.id).filter((x) => x.status === "issued")) {
  const key = doc.kind === "invoice" ? `invoice:${doc.milestone}` : doc.kind;
  if (!EXPECT[key]) continue;
  const ctx = { ...ctxOf(D, doc), settings: EMPTY };
  const got = blanksOf(M.B.BUILDERS[doc.kind](ctx));
  ok(JSON.stringify(got) === JSON.stringify([...EXPECT[key]].sort()), `${key} blocks on exactly its row of 6.1 (Settings empty)`, got);
  ok(!got.some((b) => /address line|registration/i.test(b)), `${key} never blocks on the full address line or the registration status`);
}
{
  const ctx = { ...ctxOf(D, ja.proforma), settings: EMPTY };
  ok(!blanksOf(M.B.BUILDERS.proforma(ctx)).includes("[authorised signatory]"), "a proforma never blocks on the signatory");
  const rctx = { ...ctxOf(D, ja.advance.receipt), settings: EMPTY };
  ok(!blanksOf(M.B.BUILDERS.receipt(rctx)).some((b) => BANK.includes(b)), "a receipt never blocks on the bank");
  const cnRefund = { ...ctxOf(D, D.documents.find((x) => x.id === cnF.id)), settings: EMPTY };
  ok(blanksOf(M.B.BUILDERS.credit_note(cnRefund)).includes("[refund days]"), "a credit note settled by refund blocks on [refund days]");
  const amcSet = { ...ctxOf(D, D.documents.find((x) => x.id === amcA)), settings: { ...D.settings, policy: { ...D.settings.policy, lateInterestPercent: 3 } } };
  ok(textOf(M.B.BUILDERS.invoice(amcSet)).includes("Late payment carries interest at 3% per month or part month"), "a care plan invoice prints the AMC rate once set");
}
{
  // A model with a blank refuses to issue: a new quotation draft while Settings are empty.
  const s0 = D.settings;
  await st.saveSettings({ billing: { firmPan: "" } });
  const d1 = await data();
  ok(!d1.settings.billing.firmPan, "Settings emptied for the refusal check");
  const q2 = await draft({ clientId: ja.client.id, projectId: ja.project.id, kind: "quotation" });
  await throwsWith(() => issue(q2.id), /Fill in .*\[firm PAN\].*before issuing/, "a quotation with blanks refuses to issue, naming them");
  const after = (await st.listDocuments()).find((x) => x.id === q2.id);
  ok(after.status === "draft" && after.number === null, "the refused quotation stays a draft with no number");
  if (after.status === "draft") await st.deleteDraft(q2.id);
  await st.saveSettings(s0);
}
{
  // The launch invoice blocks on the client's billing address and state.
  const ctx = ctxOf(D, ja.invoice);
  const bare = { ...ctx, client: { ...ctx.client, billingAddress: "", state: "" } };
  const got = blanksOf(M.B.BUILDERS.invoice(bare));
  ok(got.includes("[billing address]") && got.includes("[state]"), "an invoice blocks on the billing address and the state", got);
  const w = blanksOf(M.B.BUILDERS.welcome({ ...projCtx(D, ja.project), client: { ...ja.client, contactName: "" } }));
  ok(w.includes("[contact name]"), "the welcome pack blocks on the contact name", w);
  const h = blanksOf(M.B.BUILDERS.handover({ ...projCtx(D, ja.project), project: { ...ja.project, domainInClientName: "unknown", deliverables: [], liveUrl: "", domainName: "" } }));
  ok(["[live address]", "[domain]", "[the deliverables, word for word from the SOW]"].every((b) => h.includes(b)) && h.some((b) => /domain in the client's name/.test(b)), "the handover document blocks on the live URL, the domain, the deliverables and the domain in the client's name", h);
}

/* ── 5. The PDF ───────────────────────────────────────────────────────────── */
async function pdfOf(d, doc) {
  const ctx = ctxOf(d, doc);
  const prep = M.PDF.preparePdf(ctx, doc.kind);
  return { prep, bytes: await M.RENDER.renderPdf(prep.model, { ...prep.opts, jsPDF }) };
}
const pdfText = {};
const pdfTextB = {};
for (const [who, clientId, store] of [["A", ja.client.id, pdfText], ["B", jb.client.id, pdfTextB]]) {
  for (const doc of docsOf(clientId).filter((x) => x.status === "issued")) {
    const { prep, bytes } = await pdfOf(D, doc);
    const p = pdfStrings(bytes);
    const key = `${doc.kind}${doc.milestone ? `:${doc.milestone}` : ""}${doc.kind === "receipt" ? `:${doc.number}` : ""}`;
    store[key] = p.text;
    if (who === "A") {
      ok(/\/MediaBox \[0 0 595\.2\d* 841\.8\d*\]/.test(p.raw), `${key}: A4 portrait`);
      const pages = (p.raw.match(/\/Type \/Page\b(?!s)/g) || []).length;
      const marks = p.strings.filter((x) => /^Page \d+ of \d+$/.test(x));
      ok(pages >= 1 && marks.length === pages && marks.every((x) => x.endsWith(` of ${pages}`)), `${key}: "Page X of Y" on each of its ${pages} pages`, marks);
      ok(!p.text.includes(M.PDF.DRAFT_MARK) && !p.text.includes("Number on issue"), `${key}: issued, so no watermark and no "Number on issue"`);
      ok(p.strings.every((x) => [...x].every((ch) => M.TX.isCp1252(ch))), `${key}: only Windows-1252 characters`);
      ok(p.text.includes("Ideovent Technologies") && p.text.includes("Saket, New Delhi, India · +91 77619 21786 · www.ideovent.in · contact@ideovent.in"), `${key}: the firm and the address strip`);
      if (doc.number) ok(p.text.includes(doc.number), `${key}: prints its number ${doc.number}`);
      ok(p.raw.includes("/Creator (Ideovent CRM)") && p.raw.includes("/Author (Ideovent Technologies)"), `${key}: document properties`);
      if (MONEY_KINDS.includes(doc.kind)) ok(p.text.includes("Template for Ideovent Technologies. Have a qualified advocate"), `${key}: the template note while Settings says so`);
      const again = await M.RENDER.renderPdf(prep.model, { ...prep.opts, jsPDF });
      ok(sameBytes(bytes, again), `${key}: byte-identical when built twice`);
    }
  }
}
{
  // Draft: the watermark, "Number on issue", amber blanks; the template note switched off.
  const q3 = await draft({ clientId: jb.client.id, projectId: jb.project.id, kind: "quotation" });
  const d3 = await data();
  const { prep, bytes } = await pdfOf(d3, d3.documents.find((x) => x.id === q3.id));
  const p = pdfStrings(bytes);
  const pages = (p.raw.match(/\/Type \/Page\b(?!s)/g) || []).length;
  ok(p.strings.filter((x) => x === M.PDF.DRAFT_MARK).length === pages, "a draft prints DRAFT, NOT FOR SENDING on every page", p.strings.filter((x) => x === M.PDF.DRAFT_MARK).length);
  ok(p.text.includes("Number on issue") && prep.fileName.startsWith("DRAFT-Ideovent-Quotation-SampleDentalClinic-"), "a draft prints \"Number on issue\" and its file name says DRAFT", prep.fileName);
  await st.saveSettings({ printTemplateNote: false });
  const d4 = await data();
  const off = pdfStrings((await pdfOf(d4, d4.documents.find((x) => x.id === q3.id))).bytes);
  ok(!off.text.includes("Template for Ideovent Technologies"), "the template note is left off once Settings says so");
  await st.saveSettings({ printTemplateNote: true });
  await st.deleteDraft(q3.id);
}
{
  // Cancelled: "CANCELLED: <reason>".
  const q4 = await issue((await draft({ clientId: jb.client.id, projectId: jb.project.id, kind: "quotation" })).id);
  await st.cancelDocument(q4.id, "Superseded by a revised scope");
  const d5 = await data();
  const p = pdfStrings((await pdfOf(d5, d5.documents.find((x) => x.id === q4.id))).bytes);
  ok(p.text.includes("CANCELLED: Superseded by a revised scope") && p.text.includes(q4.number), "a cancelled document prints CANCELLED: <reason> and keeps its number", q4.number);
}
{
  // Devanagari is refused with the field named.
  const ctx = projCtx(D, ja.project);
  const hindi = { ...ctx, client: { ...ctx.client, orgName: "उदाहरण विद्यालय" } };
  let msg = "";
  try {
    M.PDF.preparePdf(hindi, "welcome");
  } catch (e) {
    msg = e.message;
  }
  ok(msg === "The client's name has letters this PDF cannot print. Write it in English letters on the client card.", "a Devanagari name refuses the PDF, naming the field", msg);
  const probs = M.B.issueProblems(hindi, "welcome", M.B.BUILDERS.welcome(hindi));
  ok(probs.some((x) => x.startsWith("The client's name has letters")), "and refuses the issue the same way", probs);
  const rupee = { ...ctx, client: { ...ctx.client, legalName: "Example School Trust ₹" } };
  ok(M.TX.modelUnprintable(M.B.BUILDERS.quotation(rupee)).length === 0, "\"₹\" prints as \"Rs \" rather than refusing");
}
{
  // The snapshot: the client card changes after the issue, the issued PDF does not.
  const before = await pdfOf(D, ja.quote);
  const c = (await st.listClients()).find((x) => x.id === ja.client.id);
  await st.updateClient(c.id, { legalName: "Example School Society", billingAddress: "99 Changed Street, New Delhi 110001" }, c.updatedAt);
  const d6 = await data();
  const after = await pdfOf(d6, d6.documents.find((x) => x.id === ja.quote.id));
  ok(sameBytes(before.bytes, after.bytes), "an issued quotation's PDF is the same bytes after the client card changes (drawn from its snapshot)");
  ok(!pdfStrings(after.bytes).text.includes("Example School Society"), "the issued quotation still names the client as issued");
  const fresh = await draft({ clientId: ja.client.id, projectId: ja.project.id, kind: "quotation" });
  const d7 = await data();
  ok(textOf(M.B.modelFor(ctxOf(d7, d7.documents.find((x) => x.id === fresh.id)), "quotation")).includes("Example School Society"), "a new draft reads the client card as it is now");
  await st.deleteDraft(fresh.id);
  const c2 = (await st.listClients()).find((x) => x.id === ja.client.id);
  await st.updateClient(c2.id, { legalName: A.legal, billingAddress: A.address }, c2.updatedAt);
}

/* ── 6. Isolation (decision 17) ───────────────────────────────────────────── */
{
  const D2 = await data();
  for (const doc of D2.documents.filter((x) => x.status !== "draft")) {
    const ctx = ctxOf(D2, doc);
    ok(ctx.docs.every((x) => x.clientId === ctx.client.id) && ctx.payments.every((x) => x.clientId === ctx.client.id), `the context of ${doc.kind} ${doc.number || doc.id} holds only ${ctx.client.orgName}'s documents and payments`);
  }
  const uniq = (f, j) => [f.org, f.legal, f.contact, f.email, f.phone, f.domain, f.sow, f.project, f.gstin,
    ...D2.documents.filter((x) => x.clientId === j.client.id && x.number).map((x) => x.number),
    M.MONEY.inrGroup(f.fee), M.MONEY.inrGroup(f.fee / 2), M.MONEY.wordsIndian(f.fee), M.MONEY.wordsIndian(f.fee / 2)].filter(Boolean);
  const uniqueB = uniq(Bc, jb).filter((x) => !uniq(A, ja).includes(x));
  const uniqueA = uniq(A, ja).filter((x) => !uniq(Bc, jb).includes(x));
  for (const [key, t] of Object.entries(pdfText)) {
    const leaks = uniqueB.filter((x) => t.includes(x));
    ok(leaks.length === 0, `isolation: A's ${key} PDF carries nothing unique to B`, leaks);
  }
  for (const [key, t] of Object.entries(pdfTextB)) {
    const leaks = uniqueA.filter((x) => t.includes(x));
    ok(leaks.length === 0, `isolation: B's ${key} PDF carries nothing unique to A`, leaks);
  }
  ok(Object.keys(pdfText).length >= 11 && Object.keys(pdfTextB).length >= 10, "isolation covered every kind for both clients", [Object.keys(pdfText), Object.keys(pdfTextB)]);
}

/* ── 7. Words and money format (invoice-generator.py) ─────────────────────── */
ok(M.MONEY.wordsIndian(0) === "zero" && M.MONEY.amountInWords(18000) === "Rupees eighteen thousand only", "words: 0 and 18,000");
ok(M.MONEY.wordsIndian(123456) === "one lakh twenty-three thousand four hundred and fifty-six", "words: 1,23,456", M.MONEY.wordsIndian(123456));
ok(M.MONEY.wordsIndian(10000000) === "one crore", "words: 1,00,00,000", M.MONEY.wordsIndian(10000000));
ok(M.MONEY.moneyFmt(18000) === "18,000.00" && M.MONEY.moneyFmt(123456.5) === "1,23,456.50", "money format: Indian grouping, two decimals");

/* ── 8. The wording review of 4 Oct 2026 (every document rendered for a clinic, a school and a coaching client) ── */
{
  const D8 = await data();
  const docOf = (id) => D8.documents.find((x) => x.id === id);
  const t = (doc) => textOf(M.B.modelFor(ctxOf(D8, doc), doc.kind));
  // "Description of services delivered" only on an invoice for work done (E13 h, l).
  ok(t(ja.quote).includes("Description of services") && !t(ja.quote).includes("services delivered"), "quotation: \"Description of services\" (an offer: nothing delivered yet)");
  ok(!t(ja.proforma).includes("services delivered"), "proforma: nothing delivered yet");
  ok(t(ja.invoice).includes("Description of services delivered") && t(ja.invoice).includes("have been delivered to"), "launch invoice: delivered, as the template says");
  const amc = t(docOf(amcA));
  ok(!amc.includes("services delivered") && !amc.includes("have been delivered") && amc.includes("are to be provided to Example School Trust for the period shown"), "care plan invoice (issued before its period): to be provided, not delivered", amc.match(/Certified[^\n]*/)?.[0]);
  ok(!t(docOf(cnA.id)).includes("services delivered"), "credit note: what is credited is not a service delivered");
  // "Below" and "above" that pointed nowhere (E13 g, m).
  ok(!t(ja.proforma).includes("account below") && t(ja.proforma).includes("credited to the account in section 2"), "proforma: the bank details are section 2, above (never \"the account below\")");
  ok(!t(ja.invoice).includes("account below") && t(ja.invoice).includes("to the account in section 3"), "invoice: \"the account in section 3\"");
  ok(!t(ja.advance.receipt).includes("account named above") && t(ja.advance.receipt).includes("the invoice or proforma it is issued against"), "receipt: no account it does not name; an advance's receipt is against a proforma");
  // Term 6 as SA cl. 5.7 has it (E13 k).
  ok(t(ja.invoice).includes("If an invoice is more than 7 days overdue, work on the project may be paused, on written notice, until the account is cleared."), "invoice term 6: more than 7 days overdue, on written notice (SA cl. 5.7)");
  // The proforma's banner, and part 2 and a change request's advance with no start slot (E13 i, j).
  ok(t(cpi).includes("the advance agreed in the proposal") && t(ja.proforma).includes("the advance agreed in the quotation"), "the proforma's banner names the quotation, or the proposal when none was issued");
  at("2026-10-20");
  const p2 = await draft({ clientId: jcClient.id, projectId: jcProject.id, kind: "proforma", milestone: "ADVANCE_50", data: { part: 2 } });
  const crp = await draft({ clientId: ja.client.id, projectId: ja.project.id, kind: "proforma", milestone: "CHANGE_REQUEST", data: { crNo: "CR-01" } });
  const D9 = await data();
  const tp2 = textOf(M.B.BUILDERS.proforma(ctxOf(D9, D9.documents.find((x) => x.id === p2.id))));
  ok(tp2.includes("part 2 of 2 of the 50% advance") && !/start slot|project start date|Work begins on receipt/.test(tp2), "part 2 of a split advance: no start slot and no \"work begins\" (work has started)", tp2.match(/3\. What happens[\s\S]*/)?.[0]);
  const tcr = textOf(M.B.BUILDERS.proforma(ctxOf(D9, D9.documents.find((x) => x.id === crp.id))));
  ok(tcr.includes("the advance agreed in the change request") && !/start slot|project start date/.test(tcr) && tcr.includes("Work on the change begins once this advance is received and the change request form is signed by both parties."), "a change request's advance: its own rule (Change-Request-Form section 5), no start slot", tcr.match(/3\. What happens[\s\S]*/)?.[0]);
  await st.deleteDraft(p2.id);
  await st.deleteDraft(crp.id);
  // The welcome pack says only what is true.
  const w = textOf(M.B.BUILDERS.welcome(projCtx(D8, ja.project)));
  ok(!w.includes("everything in it is also in the agreement") && w.includes("What it says about payments, dates, revisions and ownership comes from the agreement you signed, and if the two ever differ, the agreement governs."), "welcome pack: no claim that everything in it is in the agreement");
  ok(w.includes("we may invoice the work done so far and charge a restart fee of Rs. 4,000 before we resume"), "welcome pack: cl. 4.5 as the right it is (\"may\")");
  ok(w.includes("Supplies everything in SOW section 9") && !/in Section \d/.test(w), "welcome pack: the milestone table's section numbers say SOW");
  ok(w.includes("we will put it in an e-mail the same day") && !w.includes("I will put it"), "welcome pack: one voice");
  // The handover form's school words follow the client's kind.
  const hA = t(docOf(idsA.handover));
  const hB = t(docOf(idsB.handover));
  ok(hA.includes("a site already serving your parents and students") && hA.includes("Admission form fails for everyone") && hA.includes("your gallery or your circulars"), "handover for a school: the form's own words");
  ok(!/parents|students|circular|Admission form/i.test(hB) && hB.includes("a site already serving your patients") && hB.includes("Appointment form fails for everyone") && hB.includes("Patients do not read the detail"), "handover for a clinic: patients and the appointment form, no parents, students or circulars", hB.match(/[^\n]*(parents|students|circular|Admission form)[^\n]*/i)?.[0]);
  ok(hA.includes("Covered in the session (tick each topic that was covered)") && hB.includes("Covered in the session (tick each topic that was covered)"), "handover: the training topics are a list to tick, never a claim that each was covered");
  ok(hB.includes("Designation: Partner"), "handover: the client signatory's designation when it is recorded");
  // A care plan payment's receipt issues and names the plan (it has no project).
  const amcDoc = docOf(amcA);
  const r = await pay(amcDoc, amcDoc.amount, "2026-12-04", "UTRAAMC1");
  ok(r.receipt.status === "issued" && /^IDV\/RC\/2026-27\/\d{3}$/.test(r.receipt.number || ""), "a care plan payment's receipt issues (no [project name] blank)", r.receipt.number);
  const rt = textOf(M.B.modelFor(ctxOf(await data(), r.receipt), "receipt"));
  ok(rt.includes("Essential care plan, Example School") && rt.includes("Care plan\nEssential care plan"), "and names the plan", rt.slice(0, 160));
}

/* ── 9. The gate review of 4 Oct 2026 ─────────────────────────────────────── */
{
  // (1) The advance proforma's "Against" row, in order: the issued quotation, the number they accepted, the yes.
  const row = (q, p) => JSON.stringify(M.advanceAgainst(q, p));
  ok(row("IDV/Q/2026-27/001", { proposalNo: "PROP-1", dates: { yes: "2026-10-03" } }) === JSON.stringify(["Against quotation", "IDV/Q/2026-27/001"]), "Against: the project's issued quotation first");
  ok(row(null, { proposalNo: " PROP-EXS-01 ", dates: { yes: "2026-10-03" } }) === JSON.stringify(["Against proposal", "PROP-EXS-01"]), "...then the number of the proposal they accepted");
  ok(row(null, { proposalNo: "IDV/Q/2026-27/004", dates: {} }) === JSON.stringify(["Against quotation", "IDV/Q/2026-27/004"]), "...a quotation number from before the CRM reads \"Against quotation\"");
  ok(row(null, { dates: { yes: "2026-10-03" } }) === JSON.stringify(["Against proposal", "accepted on 3 Oct 2026"]), "...else the proposal accepted on the day of the yes (E13 o)");
  ok(row(null, { dates: {} }) === JSON.stringify(["Against quotation", "[quotation number]"]), "...and with no yes recorded, the blank that blocks");
  // Through the store: a file opened from a Won lead (stage 1 done before the file, no quotation, no number typed).
  at("2026-10-05");
  const won = await st.openFromLead({
    leadId: "ol_won_fx6", inIndia: true,
    lead: { instituteName: "Example Won Clinic", kind: "dental", contactName: "Example Doctor", email: "desk@won.example.org", phone: "+91 90000 44444", status: "won" },
    project: { name: "Example Won Clinic website", stage: "agreement", openedAtWon: true, fee: 12000, durationWeeks: 3,
      lines: [{ description: "Clinic website, five pages", qty: 1, unit: "project", rate: 12000 }], dates: { yes: "2026-10-03" } },
  });
  await st.updateClient(won.client.id, { legalName: "Example Won Clinic LLP", billingAddress: "3 Example Street, Saket, New Delhi 110017", state: "Delhi" }, won.client.updatedAt);
  const wpi = await draft({ clientId: won.client.id, projectId: won.project.id, kind: "proforma", milestone: "ADVANCE_50" });
  let wIssued = null;
  try { wIssued = await issue(wpi.id); } catch (e) { wIssued = { status: "refused", error: e?.message }; }
  const wt = wIssued.status === "issued" ? textOf(M.B.modelFor(ctxOf(await data(), wIssued), "proforma")) : "";
  ok(wIssued.status === "issued" && wIssued.amount === 6000, "a file opened from a Won lead issues its advance proforma, Rs 6,000, with no quotation made after the yes", wIssued);
  ok(wt.includes("Against proposal\naccepted on 3 Oct 2026") && wt.includes("a request for the advance agreed in the proposal"), "...Against proposal, accepted on 3 Oct 2026; the banner says the proposal", wt.match(/Against[^\n]*\n[^\n]*/)?.[0]);
  ok(!wt.includes("[quotation number]"), "...and no [quotation number] blank");

  // (2) The Udyam number comes from Settings and is printed from there; no file the website serves carries it.
  const offenders = [];
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, ent.name);
      if (ent.isDirectory()) walk(f);
      else if (/\.(ts|tsx|js|mjs|jsx|json|html|css|md|txt|xml|svg)$/i.test(ent.name) && readFileSync(f, "utf8").includes("0030570")) offenders.push(f.slice(ROOT.length + 1));
    }
  };
  walk(SRC);
  walk(join(ROOT, "public"));
  if (readFileSync(join(ROOT, "index.html"), "utf8").includes("0030570")) offenders.push("index.html");
  ok(offenders.length === 0, "the Udyam number is in no file under src/, public/ or index.html (FACTS: on invoices and agreements, not on the website)", offenders);
  const D9 = await data();
  ok(textOf(M.B.modelFor(ctxOf(D9, ja.proforma), "proforma")).includes("Udyam / MSME\nUDYAM-BR-13-0030570"), "...and the documents print it from Settings");

  // (3) A draft's validity says "(15 days)" once.
  const qd = await draft({ clientId: ja.client.id, projectId: ja.project.id, kind: "quotation" });
  const D10 = await data();
  const qModel = M.TX.resolveModel(M.B.modelFor(ctxOf(D10, D10.documents.find((x) => x.id === qd.id)), "quotation"), null, "2026-27");
  const qt = textOf(qModel);
  ok(qt.includes("Valid until\nset on issue (15 days)") && !qt.includes("(15 days) (15 days)"), "a draft quotation: \"Valid until: set on issue (15 days)\", once", qt.match(/Valid until[^\n]*\n[^\n]*/)?.[0]);
  await st.deleteDraft(qd.id);
}

if (fails.length) {
  console.log(`client docs: ${pass} passed, ${fails.length} failed${NEG ? ` (negative mode ${NEG})` : ""}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  process.exit(1);
}
console.log(`client docs: ${pass} passed, 0 failed`);
