/**
 * THE TWELVE STAGES (client-process-spec 4), as data and pure functions.
 *
 * Each stage has a goal and an ordered checklist. An item says who acts (us, the
 * client, or both), whether it gates "Move to next stage", what completes it by
 * itself (a document issued, a message sent, a payment credited, a field filled)
 * and its sources. Items that protect Mehdi also have NEEDS (decision 10): going
 * live, handing over the source code and the admin access need the launch
 * payment credited; the launch invoice needs the client's acceptance. Mehdi can
 * override any gate or need with a written reason; the override is kept for the
 * life of the project and shows red. An override changes what Mehdi may do,
 * never what a message may claim (the message truth conditions are in
 * templates.ts and are never overridden).
 *
 * The actions at the end (tick, skip, override, move, approve, a send's effects,
 * the yes and the no, holds, close) return the new project. They never write;
 * the screens save what they return. Pure: no I/O.
 */
import { addDays, addWorkingDays, daysBetween, fmtDate, indiaDate } from "./numbering";
import { advanceOf, docBalance, findLaunchInvoice, feeOf, isPaid } from "./money";
import type {
  Approval,
  ClientSettings,
  CrmClient,
  CrmDocument,
  CrmPayment,
  CrmProject,
  DateKey,
  Hold,
  Outcome,
  StageId,
} from "./types";

/* ── The context every rule reads ───────────────────────────────────────── */

export interface ProjectCtx {
  client: CrmClient;
  project: CrmProject;
  /** This project's documents (and, for a care plan, the client's own). */
  docs: CrmDocument[];
  /** This project's payments. */
  payments: CrmPayment[];
  settings: ClientSettings;
  /** India date. */
  today: string;
}

export type Who = "us" | "client" | "both";

/** How an item is completed on screen. */
export type ItemAction =
  | { type: "tick"; note?: string }
  | { type: "fields"; card: "brief" | "price" | "client" | "billing" | "dates" | "people" | "staging" | "kickoff" | "training" }
  | { type: "message"; templates: string[] }
  | { type: "document"; kind: CrmDocument["kind"]; milestone?: CrmDocument["milestone"] }
  | { type: "payment" }
  | { type: "approval"; what: string; deemed?: boolean }
  | { type: "call"; outcomes?: string[] }
  | { type: "choice"; field: "nda" | "optout" | "carePlan" | "satisfaction" | "stuck"; options: { value: string; label: string }[] }
  | { type: "lines" }
  | { type: "rows"; panel: "access" | "content" | "rounds" | "issues" | "deliverables" };

export interface ItemLine {
  id: string;
  label: string;
  /** Ticks itself from another item (k_A's six lines). */
  from?: string;
}

export interface ItemDef {
  id: string;
  stage: StageId;
  label: string;
  who: Who;
  /** Gates "Move to next stage": true, false, or a rule. */
  gate: boolean | ((c: ProjectCtx) => boolean);
  /** p_quote / p_designed: either one meets the gate. */
  gateOneOf?: string[];
  /** May be skipped with a reason (it then never blocks). */
  skippable?: boolean;
  /** What completes it by itself. */
  done?: (c: ProjectCtx) => boolean;
  /** Items that must be done before this one can be ticked or its message sent (decision 10). */
  needs?: { item: string; label: string }[];
  /** Sub-lines, each ticked with its date (q_qa, l_before, l_verify, k_A, k_B). */
  lines?: ItemLine[];
  action: ItemAction;
  source: string;
  /** One line of help under the item. */
  hint?: string;
  /** The client-side "waiting" ladder (SOP-09 section 3) applies, from this date key. */
  waitsFrom?: DateKey;
}

export interface StageDef {
  id: StageId;
  n: number;
  label: string;
  hinglish: string;
  goal: string;
  items: ItemDef[];
}

/* ── Reading a project ─────────────────────────────────────────────────── */

export const entryOf = (c: ProjectCtx, id: string) => c.project.checklist?.[id];
export const sentAny = (c: ProjectCtx, ids: string[]) => (c.project.sends || []).some((s) => ids.includes(s.t));
export const sendsOf = (c: Pick<ProjectCtx, "project">, ids: string[], doc?: string) =>
  (c.project.sends || []).filter((s) => ids.includes(s.t) && (doc === undefined || s.doc === doc)).sort((a, b) => a.at.localeCompare(b.at));
export const approvalOf = (c: Pick<ProjectCtx, "project">, what: string): Approval | undefined =>
  [...(c.project.approvals || [])].reverse().find((a) => a.what === what);
export const issuedDocs = (c: Pick<ProjectCtx, "docs">, kind: CrmDocument["kind"], milestone?: CrmDocument["milestone"]) =>
  c.docs.filter((d) => d.kind === kind && d.status === "issued" && (!milestone || d.milestone === milestone));

/** The advance proformas: part 1 (or the only one) first. */
export const advanceProformas = (c: Pick<ProjectCtx, "docs" | "project">) =>
  c.docs.filter((d) => d.kind === "proforma" && d.milestone === "ADVANCE_50" && d.status === "issued" && d.projectId === c.project.id)
    .sort((a, b) => (a.data?.part || 1) - (b.data?.part || 1) || (a.issuedOn || "").localeCompare(b.issuedOn || ""));

/** The advance is credited (with a split advance: its part 1). */
export function advanceCredited(c: ProjectCtx): boolean {
  const pis = advanceProformas(c);
  if (!pis.length) return false;
  const need = c.project.splitAdvance ? pis.filter((d) => (d.data?.part || 1) === 1) : pis;
  return need.length > 0 && need.every((d) => isPaid(d, c.docs, c.payments));
}

/** The date the advance (or part 1) was fully credited. */
export function creditDate(c: ProjectCtx): string | null {
  if (!advanceCredited(c)) return null;
  const pis = advanceProformas(c).filter((d) => !c.project.splitAdvance || (d.data?.part || 1) === 1);
  const dates = c.payments.filter((p) => p.status === "recorded" && pis.some((d) => d.id === p.againstDoc)).map((p) => p.receivedOn).sort();
  return dates[dates.length - 1] || null;
}

export const launchInvoice = (c: Pick<ProjectCtx, "docs" | "project">) => findLaunchInvoice(c.project.id, c.docs);
export function launchPaid(c: ProjectCtx): boolean {
  const inv = launchInvoice(c);
  return Boolean(inv) && isPaid(inv!, c.docs, c.payments);
}
/** Every recorded payment against these documents has an issued receipt. */
export function receiptsFor(c: ProjectCtx, docIds: string[]): boolean {
  const pays = c.payments.filter((p) => p.status === "recorded" && docIds.includes(p.againstDoc));
  return pays.length > 0 && pays.every((p) => c.docs.some((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === p.id));
}

/** The support window (SA cl. 10.2): from go-live, or the final delivery date if earlier; 30 calendar days. */
export function supportWindow(p: Pick<CrmProject, "dates">): { start: string; end: string } | null {
  const g = p.dates.goLive;
  const f = p.dates.finalDelivery;
  const start = g && f ? (f < g ? f : g) : g || f;
  return start ? { start, end: addDays(start, 30) } : null;
}

export const openIssues = (p: Pick<CrmProject, "issues">, severities?: string[]) =>
  (p.issues || []).filter((i) => i.status === "open" && (!severities || severities.includes(i.severity)));

/** An S1 or S2 issue open, or one closed in the last 7 days (Testimonial-Request-Kit section 1: not while something is broken, or in the week after). */
export function s1s2Recent(p: Pick<CrmProject, "issues"> | null, today: string, days = 7): boolean {
  if (!p) return false;
  if (openIssues(p, ["S1", "S2"]).length) return true;
  return (p.issues || []).some((i) => ["S1", "S2"].includes(i.severity) && i.status === "closed" && Boolean(i.closedAt) && daysBetween(indiaDate(i.closedAt!), today) < days);
}

/** The care plan decision names a plan. */
export const hasPlan = (p: Pick<CrmProject, "carePlanDecision">) => Boolean(p.carePlanDecision && p.carePlanDecision !== "none");

/** The other partner's approval is needed (a_partner, 4.2): before the deed, every agreement; after it, above the limit or outside the standard terms. */
export function partnerNeeded(c: ProjectCtx): boolean {
  if (!c.settings.deedNamesSignatory) return true;
  const fee = feeOf(c.project) || 0;
  const limit = c.settings.policy.singlePartnerLimit;
  const aboveLimit = typeof limit !== "number" || !Number.isFinite(limit) || fee > limit;
  return aboveLimit || Boolean(c.project.discount) || Boolean(c.project.splitAdvance) || c.project.nda === "theirs_checked";
}

/* ── The stages ─────────────────────────────────────────────────────────── */

const tick = (note?: string): ItemAction => ({ type: "tick", note });
const msg = (...templates: string[]): ItemAction => ({ type: "message", templates });
const approvalAct = (what: string, deemed = false): ItemAction => ({ type: "approval", what, deemed });
const has = (v: unknown) => (typeof v === "string" ? v.trim().length > 0 : v !== undefined && v !== null);

const PROPOSAL_SEND = ["cp_proposal_send_em_en", "cp_proposal_send_em_hi", "cp_proposal_send_wa_hi", "cp_proposal_send_wa_en", "cp_proposal_full_em_en", "cp_proposal_full_wa_hi"];
const DAY3 = ["cp_proposal_d3_wa_hi", "cp_proposal_d3q_wa_hi", "cp_proposal_d3q_wa_en", "cp_proposal_d3q_em_hi", "cp_proposal_d3q_em_en"];

export const STAGES: StageDef[] = [
  {
    id: "proposal", n: 1, label: "Proposal and quotation", hinglish: "Proposal aur quotation",
    goal: "The decision-maker has, in writing, a price that matches what was said on the call.",
    items: [
      { id: "p_brief", stage: "proposal", label: "Needs brief from the call: goals, audience, pages, features, content readiness, deadline, budget band, decision-maker, and one sentence in their own words",
        who: "us", gate: true, action: { type: "fields", card: "brief" }, source: "Section 0; Discovery-Call-Questionnaire; PIPELINE-SCHEMA section 4",
        done: (c) => has(c.project.brief?.goals) && has(c.project.brief?.pages) && has(c.project.brief?.decisionMaker) },
      { id: "p_scope", stage: "proposal", label: "Package, scope lines, fee and weeks agreed", who: "us", gate: true, action: { type: "fields", card: "price" },
        source: "SOP-01 stage 3", done: (c) => (feeOf(c.project) || 0) > 0 && (c.project.lines || []).some((l) => has(l.description)) && Number(c.project.durationWeeks) > 0 },
      { id: "p_legal", stage: "proposal", label: "Legal name, and who signs", who: "us", gate: true, action: { type: "fields", card: "client" },
        source: "SOP-01 stage 2 gate; Quotation template", done: (c) => (has(c.client.legalName) || c.client.legalSameAsTrading === true) && has(c.client.signatoryName) },
      { id: "p_quote", stage: "proposal", label: "Quotation issued (IDV/Q)", who: "us", gate: true, gateOneOf: ["p_quote", "p_designed"],
        action: { type: "document", kind: "quotation" }, source: "PROPOSAL-PLAYBOOK section 1; Quotation-Template", done: (c) => issuedDocs(c, "quotation").length > 0 },
      { id: "p_designed", stage: "proposal", label: "Designed proposal (optional): Proposal-Template.html, 14 pages, pages 2, 3 and 9 personalised, a search for \"[[\" finds nothing, saved as Ideovent-Proposal-<ClientName>-<YYYY-MM-DD>.pdf",
        who: "us", gate: false, gateOneOf: ["p_quote", "p_designed"], action: tick("Its proposal number"), source: "PROPOSAL-PLAYBOOK section 2",
        hint: "Tick it with its number: it goes into the proposal number used by the messages." },
      { id: "p_hold", stage: "proposal", label: "If it cannot go within 24 hours: the holding line, the same day", who: "us", gate: false, skippable: true,
        action: msg("cp_proposal_holding_em_en"), source: "PROPOSAL-PLAYBOOK section 1.3" },
      { id: "p_sent", stage: "proposal", label: "Proposal sent: e-mail with the PDF, and the WhatsApp the same minute", who: "us", gate: true,
        action: msg(...PROPOSAL_SEND), source: "PROPOSAL-FOLLOWUP Day 0" },
      { id: "p_archive", stage: "proposal", label: "The exact PDF sent is saved in the project folder", who: "us", gate: false, action: tick(), source: "PROPOSAL-FOLLOWUP Day 0" },
      { id: "p_d1", stage: "proposal", label: "Day 1: did it arrive (WhatsApp)", who: "us", gate: false, skippable: true, action: msg("cp_proposal_d1_wa_hi"), source: "PROPOSAL-FOLLOWUP Day 1" },
      { id: "p_d3", stage: "proposal", label: "Day 3: page 2 / start date (WhatsApp or e-mail)", who: "us", gate: false, skippable: true, action: msg(...DAY3), source: "PROPOSAL-FOLLOWUP Day 3; templates.ts PROPOSAL_CHASE" },
      { id: "p_d5", stage: "proposal", label: "Day 5: a phone call, not a message", who: "us", gate: false, skippable: true,
        action: { type: "call", outcomes: ["answered", "no_answer"] }, source: "PROPOSAL-FOLLOWUP Day 5", hint: "No answer: send the one message after an unanswered call, and no second call today." },
      { id: "p_d7", stage: "proposal", label: "Day 7: one useful thing, and the PDF again", who: "us", gate: false, skippable: true, action: msg("cp_proposal_d7_em_en"), source: "PROPOSAL-FOLLOWUP Day 7" },
      { id: "p_d14", stage: "proposal", label: "Day 14: where has this landed", who: "us", gate: false, skippable: true, action: msg("cp_proposal_d14_em_en"), source: "PROPOSAL-FOLLOWUP Day 14" },
      { id: "p_d21", stage: "proposal", label: "Day 21: should I close this", who: "us", gate: false, skippable: true, action: msg("cp_proposal_d21_em_en", "cp_proposal_d21_wa_hi"), source: "PROPOSAL-FOLLOWUP Day 21; WHATSAPP-PLAYBOOK section 3.6" },
      { id: "p_d30", stage: "proposal", label: "Day 30: closing the file", who: "us", gate: false, skippable: true, action: msg("cp_proposal_d30_em_en"), source: "PROPOSAL-FOLLOWUP Day 30" },
    ],
  },
  {
    id: "agreement", n: 2, label: "Agreement and advance", hinglish: "Agreement aur advance",
    goal: "Scope and terms signed by both parties and the 50% advance credited in the bank, before any work starts.",
    items: [
      { id: "a_yes", stage: "agreement", label: "Said in the same breath as the yes: agreement and SOW today, advance invoice with them, start the day it is credited",
        who: "us", gate: false, action: msg("cp_agreement_yes_wa_hi", "cp_agreement_yes_wa_en"), source: "SOP-01 stage 6", hint: "Or tick it: said on the call." },
      { id: "a_billing", stage: "agreement", label: "Billing details: legal name, billing address with PIN, state; GSTIN, PAN (if they deduct TDS) and PO number if any; accounts contact",
        who: "client", gate: true, action: { type: "fields", card: "billing" }, source: "Onboarding Form section A; section 0",
        done: (c) => (has(c.client.legalName) || c.client.legalSameAsTrading === true) && has(c.client.billingAddress) && has(c.client.state) },
      { id: "a_sow", stage: "agreement", label: "SOW written (sections 4, 5, 6, 7, 9, 11, 12; scope copied from the proposal), signed by both, PDF in 01-contracts",
        who: "both", gate: true, action: tick("SOW reference, its date and its go-live target (SOW section 12, M4)"), source: "SOP-01 stage 7.1; Statement-of-Work-Template",
        done: (c) => entryOf(c, "a_sow")?.state === "done" && has(c.project.sowRef), waitsFrom: "paperworkSent" },
      { id: "a_sa", stage: "agreement", label: "Service Agreement India filled (no [[ ]] or ______ left, internal note deleted, Annexure A and B filled, 50/50), signed by both, stamp paper as NCT Delhi requires (cl. 16.11), PDF in 01-contracts",
        who: "both", gate: true, action: tick("The effective date"), source: "SOP-01 stage 7.2; SA cl. 16.11",
        done: (c) => entryOf(c, "a_sa")?.state === "done" && has(c.project.dates.effective), waitsFrom: "paperworkSent" },
      { id: "a_four", stage: "agreement", label: "The four numbers match across proposal, SOW and agreement", who: "us", gate: true, action: tick(), source: "SOP-01 stage 7.3" },
      { id: "a_partner", stage: "agreement", label: "The other partner approved this agreement in writing", who: "us", gate: (c) => partnerNeeded(c),
        action: tick("Date and channel of the other partner's yes"), source: "SOP-01 stage 7 box; SOP-09 note 5",
        hint: "Until the deed names the signatory: every agreement. After it: above the single-partner limit, and always with a discount, a split advance or the client's own NDA or MSA." },
      { id: "a_nda", stage: "agreement", label: "NDA: not needed (cl. 9 covers confidentiality) / our mutual NDA signed / their NDA checked with the ten-minute checklist and signed",
        who: "us", gate: true, action: { type: "choice", field: "nda", options: [
          { value: "not_needed", label: "Not needed (cl. 9 covers confidentiality)" },
          { value: "mutual_signed", label: "Our mutual NDA signed" },
          { value: "theirs_checked", label: "Their NDA checked (ten-minute checklist) and signed" },
        ] }, source: "NDA-DECISION-GUIDE sections 1, 3, 5", done: (c) => Boolean(c.project.nda) },
      { id: "a_optout", stage: "agreement", label: "Portfolio opt-out asked while they read (cl. 12.3); answer recorded", who: "us", gate: true,
        action: { type: "choice", field: "optout", options: [{ value: "no", label: "No opt-out: may be named" }, { value: "yes", label: "Opt-out ticked: never named" }] },
        source: "SOP-01 stage 7.4", done: (c) => c.client.portfolioOptOut === true || c.client.portfolioOptOut === false },
      { id: "a_pi", stage: "agreement", label: "Proforma for the 50% advance issued (IDV/PI)", who: "us", gate: true,
        action: { type: "document", kind: "proforma", milestone: "ADVANCE_50" }, source: "README-BILLING section 4; Proforma-Invoice", done: (c) => advanceProformas(c).length > 0 },
      { id: "a_paperwork", stage: "agreement", label: "Paperwork e-mail sent: SOW, agreement, advance proforma", who: "us", gate: true,
        action: msg("cp_agreement_paperwork_em_en"), source: "SOP-01 stage 7" },
      { id: "a_credit", stage: "agreement", label: "Advance CREDITED in the bank (not \"sent\", not a screenshot), UTR recorded", who: "client", gate: true,
        action: { type: "payment" }, source: "SOP-01 stage 9; Kickoff Checklist A", done: (c) => advanceCredited(c),
        hint: "With a split advance the gate is met when part 1 is credited, with the recorded approval as its reason." },
      { id: "a_receipt", stage: "agreement", label: "Receipt issued the same day (IDV/RC)", who: "us", gate: true, action: { type: "document", kind: "receipt" },
        source: "SOP-01 stage 9.3", done: (c) => receiptsFor(c, advanceProformas(c).map((d) => d.id)) },
    ],
  },
  {
    id: "welcome", n: 3, label: "Welcome and onboarding", hinglish: "Welcome aur onboarding",
    goal: "The client hears within the hour that the project has started, receives the receipt, the welcome pack and the onboarding documents in one e-mail, and the kickoff call is booked.",
    items: [
      { id: "w_welcome", stage: "welcome", label: "\"Advance credit ho gaya\" WhatsApp, within the hour", who: "us", gate: true, action: msg("cp_welcome_wa_hi", "cp_welcome_wa_en"), source: "SOP-02 section 1" },
      { id: "w_receipt", stage: "welcome", label: "Receipt e-mailed", who: "us", gate: true, action: msg("cp_payment_receipt_em_en"), source: "SOP-02 section 1.2" },
      { id: "w_folder", stage: "welcome", label: "Project folder <project>/01-contracts ... 07-invoices; signed PDFs, blank CR form and content checklist in it", who: "us", gate: true, action: tick(), source: "SOP-02 section 2 Folder" },
      { id: "w_repo", stage: "welcome", label: "Private GitHub repository, README (stack, how to run, staging URL, point of contact), .gitignore with .env before the first commit", who: "us", gate: true, action: tick(), source: "SOP-02 section 2; SOP-04 section 2" },
      { id: "w_staging", stage: "welcome", label: "Staging URL reserved, noindex, password-protected", who: "us", gate: true, action: { type: "fields", card: "staging" }, source: "SOP-02 section 2 Staging",
        done: (c) => has(c.project.stagingUrl) && entryOf(c, "w_staging")?.state === "done" },
      { id: "w_vault", stage: "welcome", label: "An entry for this client in the password manager", who: "us", gate: true, action: tick(), source: "SOP-02 section 2 Credentials; Hosting Terms cl. 4.3" },
      { id: "w_pack", stage: "welcome", label: "Welcome pack made final", who: "us", gate: true, action: { type: "document", kind: "welcome" }, source: "Section 0 (Mehdi); section 6.6", done: (c) => issuedDocs(c, "welcome").length > 0 },
      { id: "w_docs", stage: "welcome", label: "The e-mail with four documents: welcome pack, onboarding form, content checklist, blank change request form", who: "us", gate: true, action: msg("cp_welcome_docs_em_en"), source: "SOP-02 section 3" },
      { id: "w_kickoff", stage: "welcome", label: "Kickoff date and time agreed (30 to 40 minutes)", who: "client", gate: true, action: { type: "fields", card: "kickoff" }, source: "SOP-02 section 1, day 1 to 2",
        done: (c) => has(c.project.dates.kickoff) && has(c.project.kickoffTime) },
      { id: "w_form", stage: "welcome", label: "Onboarding form returned", who: "client", gate: false, action: tick(), source: "Onboarding Form \"What happens after\"" },
    ],
  },
  {
    id: "kickoff", n: 4, label: "Kickoff call", hinglish: "Kickoff call",
    goal: "Scope, the money clauses, people, channel and dates are said out loud, then written down and confirmed with one word.",
    items: [
      { id: "k_call", stage: "kickoff", label: "Kickoff call held (date, who attended: the point of contact and, if possible, whoever signs)", who: "us", gate: true, action: { type: "call" }, source: "SOP-02 section 4" },
      { id: "k_A", stage: "kickoff", label: "Kickoff Checklist Section A, every line with a date", who: "both", gate: true, action: { type: "lines" }, source: "Project-Kickoff-Checklist A",
        lines: [
          { id: "sa", label: "Service Agreement signed by both parties", from: "a_sa" },
          { id: "sow", label: "Statement of Work signed", from: "a_sow" },
          { id: "inventories", label: "Page and feature inventories read aloud and agreed" },
          { id: "outofscope", label: "Out-of-scope list explicitly acknowledged" },
          { id: "money", label: "Three money clauses read out loud, not just signed" },
          { id: "invoiced", label: "Advance invoiced", from: "a_pi" },
          { id: "credited", label: "Advance received AND credited in the bank", from: "a_credit" },
          { id: "receipt", label: "Receipt issued for the advance", from: "a_receipt" },
          { id: "crform", label: "Change Request Form sent to the client for information", from: "w_docs" },
        ] },
      { id: "k_D", stage: "kickoff", label: "People and communication: point of contact who can approve, escalation contact, one channel, decisions confirmed in writing, weekly update day, review turnaround, working days and hours",
        who: "both", gate: true, action: { type: "fields", card: "people" }, source: "Checklist D; SOP-02 section 4(6)",
        done: (c) => has(c.project.pointOfContact) && has(c.project.escalationContact) && has(c.project.commsChannel) && Boolean(c.project.weeklyUpdateDay) },
      { id: "k_E", stage: "kickoff", label: "Schedule: development start, content cut-off, go-live target in writing, blackout dates, dependencies with owners",
        who: "both", gate: true, action: { type: "fields", card: "dates" }, source: "Checklist E; SOP-02 section 4(7), (8)",
        done: (c) => has(c.project.dates.devStart) && has(c.project.dates.contentCutoff) && has(c.project.dates.goLiveTarget) },
      { id: "k_B", stage: "kickoff", label: "Access and infrastructure (each open line moves its milestone day for day)", who: "both", gate: false, action: { type: "lines" }, source: "Checklist B",
        lines: [
          { id: "domain", label: "Domain confirmed and in the client's control" },
          { id: "expiry", label: "Domain expiry date checked and recorded" },
          { id: "dns", label: "Registrar or DNS access provided (or a named person)" },
          { id: "hosting", label: "Hosting active and paid past go-live" },
          { id: "hostaccess", label: "Hosting access provided to Ideovent" },
          { id: "backup", label: "Existing site backed up" },
          { id: "replaced", label: "Access to any system being replaced or migrated" },
          { id: "keys", label: "Payment gateway, SMS or API keys identified (whose KYC)" },
          { id: "repo", label: "Repository created and staging URL reserved" },
        ] },
      { id: "k_C", stage: "kickoff", label: "Brand, content and references: rows of the content tracker", who: "client", gate: false, action: { type: "rows", panel: "content" },
        source: "Checklist C", done: (c) => (c.project.content || []).length > 0 },
      { id: "k_stuck", stage: "kickoff", label: "A line that can never be completed, decided now: quoted as extra / the client fixes it by a date / it leaves the scope",
        who: "us", gate: (c) => has(c.project.notesByKey?.stuckItem), action: { type: "choice", field: "stuck", options: [
          { value: "extra", label: "Ideovent quotes it as extra work" }, { value: "client_by_date", label: "The client fixes it by a fixed date" }, { value: "leaves_scope", label: "It leaves the scope" },
        ] }, source: "SOP-02 section 6", done: (c) => has(c.project.notesByKey?.stuckDecision) },
      { id: "k_summary", stage: "kickoff", label: "\"What we agreed today\" e-mail, the same day", who: "us", gate: true, action: msg("cp_kickoff_summary_em_en"), source: "SOP-02 section 5" },
      { id: "k_confirmed", stage: "kickoff", label: "They replied \"confirmed\" (or corrections, then \"confirmed\")", who: "client", gate: true, action: approvalAct("k_confirmed"),
        source: "SOP-02 section 5", done: (c) => Boolean(approvalOf(c, "k_confirmed")), waitsFrom: "summarySent" },
    ],
  },
  {
    id: "content", n: 5, label: "Content collection", hinglish: "Content mangwana",
    goal: "Every page has its real text and images before it is designed or built (\"Design with real text, not Lorem Ipsum\").",
    items: [
      { id: "c_logo", stage: "content", label: "Logo in vector form (.ai, .svg, .eps or .pdf)", who: "client", gate: true, action: tick(), source: "SOP-03 step 0; Checklist C", done: (c) => contentIn(c, "logo_vector") },
      { id: "c_colours", stage: "content", label: "Brand colours as hex codes, or written permission for Ideovent to choose (what was chosen recorded)", who: "client", gate: true, action: tick(), source: "SOP-03 step 0", done: (c) => contentIn(c, "colours") },
      { id: "c_fonts", stage: "content", label: "Fonts confirmed, with the licence for any paid font", who: "client", gate: true, action: tick(), source: "SOP-03 step 0", done: (c) => contentIn(c, "fonts") },
      { id: "c_text", stage: "content", label: "Real text for the homepage and the two most important inner pages", who: "client", gate: true, action: tick(), source: "SOP-03 step 0" },
      { id: "c_images", stage: "content", label: "Images at 1600px or more on the long edge, with the client confirming the right to use them (cl. 7.8)", who: "client", gate: true, action: tick(), source: "SOP-03 step 0" },
      { id: "c_refs", stage: "content", label: "Two or three reference sites they like and one they dislike, with a sentence on why", who: "client", gate: true, action: tick(), source: "SOP-03 step 0" },
    ],
  },
  {
    id: "design", n: 6, label: "Design approval", hinglish: "Design approval",
    goal: "A written approval of the design, inside the two included rounds.",
    items: [
      { id: "d_wire", stage: "design", label: "Wireframes and sitemap sent, grey, real headings", who: "us", gate: true, action: msg("cp_design_wireframes_em_en"), source: "SOP-03 step 1" },
      { id: "d_wire_ok", stage: "design", label: "Structure approved in writing (does not use a round)", who: "client", gate: true, action: approvalAct("d_wire_ok"), source: "SOP-03 step 1 gate",
        done: (c) => Boolean(approvalOf(c, "d_wire_ok")), waitsFrom: "wireframesSent" },
      { id: "d_rounds", stage: "design", label: "The rounds panel", who: "both", gate: false, action: { type: "rows", panel: "rounds" }, source: "SOP-03 steps 2 to 4" },
      { id: "d_ok", stage: "design", label: "The word \"approved\" in an e-mail to contact@ideovent.in (an approval on WhatsApp or a call is converted to e-mail the same day and screenshotted)",
        who: "client", gate: true, action: approvalAct("d_ok"), source: "SOP-03 step 5; SOP-08 section 3",
        done: (c) => { const a = approvalOf(c, "d_ok"); return Boolean(a && (a.channel === "email" || a.emailConfirmedAt)); } },
      { id: "d_close", stage: "design", label: "\"Design approved, moving to build\" e-mail sent, approved files attached", who: "us", gate: true, action: msg("cp_design_approved_em_en"), source: "SOP-03 step 5" },
      { id: "d_files", stage: "design", label: "Approved design files saved in 03-design with version and date in the file name", who: "us", gate: true, action: tick(), source: "SOP-03 step 5.3" },
    ],
  },
  {
    id: "build", n: 7, label: "Build", hinglish: "Website banana",
    goal: "Every feature in SOW section 7 works on the staging link; the client sees progress only there and in the weekly update.",
    items: [
      { id: "b_start", stage: "build", label: "Build started (the date the design approval e-mail named)", who: "us", gate: true, action: { type: "fields", card: "dates" }, source: "SOP-03 step 5", done: (c) => has(c.project.dates.buildStart) },
      { id: "b_weekly", stage: "build", label: "Weekly update every agreed weekday until go-live, \"whether or not there is news\"", who: "us", gate: false, action: msg("cp_build_weekly_em_en", "cp_build_weekly_wa_hi"),
        source: "SOP-04 section 5; SOP-08 section 4; WHATSAPP-PLAYBOOK section 3.10" },
      { id: "b_features", stage: "build", label: "Every feature in SOW section 7 performs its function on staging, on the browsers in SOW section 8 (acceptance D2)", who: "us", gate: true, action: tick(), source: "SOP-04 section 9" },
      { id: "b_phone", stage: "build", label: "Walked the whole site on a real phone", who: "us", gate: true, action: tick(), source: "SOP-04 section 9" },
    ],
  },
  {
    id: "review", n: 8, label: "Testing and client check", hinglish: "Testing aur client check",
    goal: "SOP-05 run on staging, the client checks the facts, and the client accepts the finished work in writing (or by silence after 7 days).",
    items: [
      { id: "q_qa", stage: "review", label: "SOP-05 sections A to J on staging, each with a date (a tick with no date is not a tick)", who: "us", gate: true, action: { type: "lines" }, source: "SOP-05 A to J, L",
        lines: [
          { id: "A", label: "A. Cross-browser" }, { id: "B", label: "B. Mobile and breakpoints" }, { id: "C", label: "C. Forms, and where the submissions go" },
          { id: "D", label: "D. Links, navigation and errors" }, { id: "E", label: "E. Images and media weight" }, { id: "F", label: "F. Performance, Lighthouse" },
          { id: "G", label: "G. Accessibility, the basic pass" }, { id: "H", label: "H. Meta tags, Open Graph and sharing" }, { id: "I", label: "I. Technical essentials" },
          { id: "J", label: "J. Spelling and language pass" },
        ] },
      { id: "q_care", stage: "review", label: "Pre-launch care plan conversation, about two weeks before go-live: which plan, never \"whether\"", who: "us", gate: false,
        action: { type: "choice", field: "carePlan", options: [
          { value: "none", label: "None" }, { value: "essential", label: "Essential" }, { value: "growth", label: "Growth" }, { value: "priority", label: "Priority" },
        ] }, source: "AMC-SALES-GUIDE sections 3, 4, 6", done: (c) => Boolean(c.project.carePlanDecision) },
      { id: "q_accuracy", stage: "review", label: "\"Please check these facts\" e-mail: also the written notice that the completed work is ready on the review link (cl. 3.1), which starts the 7-day review window",
        who: "us", gate: true, action: msg("cp_review_accuracy_em_en"), source: "SOP-05 K; SOP-06 launch week table" },
      { id: "q_fix", stage: "review", label: "Corrections made, sections C, H and J run again on the pages touched", who: "us", gate: (c) => has(c.project.notesByKey?.corrections), skippable: true,
        action: tick(), source: "SOP-05 K.2", hint: "Only when corrections came back." },
      { id: "q_accepted", stage: "review", label: "Accepted in writing (\"all correct\", or approval of the finished work), or the 7-day window passed (deemed acceptance)",
        who: "client", gate: true, action: approvalAct("q_accepted", true), source: "SA cl. 3.2, 3.3; SOP-04 section 6", done: (c) => Boolean(approvalOf(c, "q_accepted")) },
      { id: "q_invoice", stage: "review", label: "Launch invoice issued the same day: the full fee and approved CRs, less the advances received and anything invoiced earlier",
        who: "us", gate: true, action: { type: "document", kind: "invoice", milestone: "LAUNCH_50" }, source: "SOP-04 section 6; Invoice-NonGST",
        needs: [{ item: "q_accepted", label: "the client's acceptance (SA cl. 5.2(b))" }], done: (c) => Boolean(launchInvoice(c)) },
    ],
  },
  {
    id: "launch", n: 9, label: "Launch payment and go-live", hinglish: "Final payment aur launch",
    goal: "The launch payment credited, then the cutover on a working-day morning, verified within two hours. \"Do not cut over DNS on a promise.\"",
    items: [
      { id: "l_proposed", stage: "launch", label: "\"Proposed go-live\" e-mail with the launch invoice attached; \"go ahead\" received", who: "both", gate: true,
        action: msg("cp_launch_golive_em_en"), source: "SOP-06 section 1", done: (c) => sentAny(c, ["cp_launch_golive_em_en"]) && Boolean(approvalOf(c, "l_proposed")), waitsFrom: "goAheadAsked" },
      { id: "l_paid", stage: "launch", label: "Launch invoice CREDITED in full (net of TDS recorded), UTR recorded", who: "client", gate: true, action: { type: "payment" },
        source: "SA cl. 5.2(b); SOP-06 section 4", done: (c) => launchPaid(c) },
      { id: "l_receipt", stage: "launch", label: "Receipt issued the same day", who: "us", gate: true, action: { type: "document", kind: "receipt" }, source: "SOP-01 stage 9",
        done: (c) => { const inv = launchInvoice(c); return Boolean(inv) && receiptsFor(c, [inv!.id]); } },
      { id: "l_ttl", stage: "launch", label: "T-48h: DNS TTL lowered to 300 seconds; reminder to restore it", who: "us", gate: true, action: tick(), source: "SOP-06 section 2" },
      { id: "l_before", stage: "launch", label: "T-24h: DNS recorded, backups, old hosting paid, content freeze, new host reachable, SSL ready", who: "us", gate: true, action: { type: "lines" }, source: "SOP-06 section 3",
        lines: [
          { id: "dns", label: "Every DNS record copied into 06-handover/dns-before-<date>.md" }, { id: "mx", label: "MX and mail TXT untouched" },
          { id: "oldbackup", label: "Backup of the old site (kept 90 days)" }, { id: "newbackup", label: "Backup of the new site and database" },
          { id: "oldhosting", label: "Old hosting paid 14 more days" }, { id: "freeze", label: "Content freeze told to the client" },
          { id: "reachable", label: "New host reachable by its raw address" }, { id: "ssl", label: "SSL for the live domain ready" },
        ] },
      { id: "l_cutover", stage: "launch", label: "Cutover on a working-day morning (never Friday evening, never after 3pm), one change set, time noted", who: "us", gate: true,
        action: tick("The time of the change"), source: "SOP-06 sections 1, 4", needs: [{ item: "l_paid", label: "the launch payment credited (\"Do not cut over DNS on a promise\"; SA cl. 5.2(b))" }] },
      { id: "l_verify", stage: "launch", label: "First two hours, on the live domain: the SOP-06 section 5 list", who: "us", gate: true, action: { type: "lines" }, source: "SOP-06 section 5; SOP-05 A, C, F, H, I",
        needs: [{ item: "l_cutover", label: "the cutover" }],
        lines: [
          { id: "https", label: "https loads the new site; http redirects; www and non-www resolve" }, { id: "ssl", label: "SSL valid, no mixed content" },
          { id: "pages", label: "Every top-level page loads" }, { id: "forms", label: "Every form submitted for real, and the spam folder checked" },
          { id: "email", label: "The client's e-mail on the domain still works (confirmed by them)" }, { id: "admin", label: "Admin panel reachable" },
          { id: "analytics", label: "Analytics shows the visit" }, { id: "noindex", label: "noindex gone; robots.txt and sitemap.xml reachable" },
          { id: "404", label: "404 page works" }, { id: "gateway", label: "Payment gateway live test (if any)" },
          { id: "redirects", label: "Old URLs redirect (if replacing a site)" }, { id: "phone", label: "Opened on a phone on mobile data" },
          { id: "console", label: "Sitemap submitted in Search Console" },
        ] },
      { id: "l_live", stage: "launch", label: "\"Site live ho gayi hai\" WhatsApp", who: "us", gate: true, action: msg("cp_launch_live_wa_hi", "cp_launch_live_wa_en"), source: "SOP-06 section 5",
        needs: [{ item: "l_verify", label: "the go-live verification" }] },
      { id: "l_t24", stage: "launch", label: "T+24h: TTL restored, verification again, Search Console crawl errors, first automated backup ran", who: "us", gate: false, action: tick(), source: "SOP-06 section 6" },
    ],
  },
  {
    id: "handover", n: 10, label: "Handover and training", hinglish: "Handover aur training",
    goal: "The client owns and can run what they paid for; nobody's password travelled in an e-mail or a chat.",
    items: [
      { id: "h_access", stage: "handover", label: "Credentials transfer record, one row per system: username, method, date, \"client changed the password\" (no password, anywhere)",
        who: "us", gate: true, action: { type: "rows", panel: "access" }, source: "SOP-06 section 7; Handover Document section 2",
        hint: "Rows for what Ideovent built or set up (admin panel, database, repository, a hosting account it opened) wait for the launch payment; the registrar, DNS and the client's own accounts never wait for money.",
        done: (c) => (c.project.access || []).length > 0 && (c.project.access || []).every((r) => r.method === "not_applicable" || (has(r.method) && has(r.transferredOn))) },
      { id: "h_2fa", stage: "handover", label: "Two-factor on registrar, hosting, Google account, payment gateway", who: "client", gate: false, action: tick(), source: "SOP-06 section 7.5" },
      { id: "h_rotate", stage: "handover", label: "Anything ever sent by e-mail or message during the project rotated this week", who: "us", gate: true, action: tick(), source: "SOP-06 section 7.7" },
      { id: "h_source", stage: "handover", label: "Source code transferred (repository transferred or a full export), after the final payment", who: "us", gate: true,
        action: tick("The date it was transferred"), source: "SA cl. 7.2; SOP-06 section 7",
        needs: [{ item: "l_paid", label: "the launch payment credited (section 0: no code handover before the final payment)" }],
        done: (c) => has(c.project.dates.sourceTransferred) },
      { id: "h_training", stage: "handover", label: "Training held (45 to 60 minutes; who uses the admin panel; recorded with permission; the anti-phishing line said out loud)", who: "us", gate: true,
        action: { type: "fields", card: "training" }, source: "SOP-06 section 8", done: (c) => has(c.project.training?.at) },
      { id: "h_guide", stage: "handover", label: "Recording link and one-page written guide sent", who: "us", gate: false, action: tick(), source: "SOP-06 section 8 After" },
      { id: "h_doc", stage: "handover", label: "Handover document (PDF) made final and sent", who: "us", gate: true, action: { type: "document", kind: "handover" }, source: "SOP-06 section 9",
        done: (c) => issuedDocs(c, "handover").length > 0 && sentAny(c, ["cp_handover_doc_em_en"]) },
      { id: "h_wa", stage: "handover", label: "Handover WhatsApp (what is live, 30 days of defects, ownership)", who: "us", gate: false, action: msg("cp_handover_wa_hi", "cp_handover_wa_en"), source: "WHATSAPP-PLAYBOOK section 3.11" },
      { id: "h_signed", stage: "handover", label: "Signed handover page back, or the day-7 reminder sent", who: "client", gate: false, action: msg("cp_handover_unsigned_wa_hi"), source: "SOP-06 section 9" },
      { id: "h_care", stage: "handover", label: "Care plan decision recorded", who: "us", gate: true, action: { type: "choice", field: "carePlan", options: [
        { value: "none", label: "None" }, { value: "essential", label: "Essential" }, { value: "growth", label: "Growth" }, { value: "priority", label: "Priority" },
      ] }, source: "AMC-SALES-GUIDE section 4", done: (c) => Boolean(c.project.carePlanDecision) },
    ],
  },
  {
    id: "support", n: 11, label: "Thirty days of support", hinglish: "30 din ka support",
    goal: "Defects fixed free inside the window; every request logged; the window closed cleanly in writing; the review, testimonial and referral asked at the right moments.",
    items: [
      { id: "s_day7", stage: "support", label: "Day 7 nudge: look properly this week, report everything at once", who: "us", gate: true, action: msg("cp_support_day7_wa_hi", "cp_handover_unsigned_wa_hi"), source: "SOP-06 section 10 Day 7" },
      { id: "s_check", stage: "support", label: "One-question satisfaction check; the answer recorded (happy / has a concern / no reply)", who: "us", gate: false,
        action: msg("cp_feedback_check_wa_hi"), source: "TESTIMONIAL-REQUEST-MESSAGES section 5", done: (c) => sentAny(c, ["cp_feedback_check_wa_hi"]) && Boolean(c.project.satisfaction) },
      { id: "s_testimonial", stage: "support", label: "Testimonial ask (voice note, three questions); one nudge after 3 days; the edited quote sent back; consent line; nothing published before the written yes",
        who: "us", gate: false, skippable: true, action: msg("cp_feedback_testimonial_wa_hi", "cp_feedback_testimonial_em_en"), source: "Testimonial-Request-Kit sections 1 to 5, 9" },
      { id: "s_review", stage: "support", label: "Google review ask, separate message, different day, every client", who: "us", gate: false, skippable: true,
        action: msg("cp_feedback_review_wa_hi", "cp_feedback_review_em_en"), source: "Testimonial-Request-Kit sections 1, 6; decision 12" },
      { id: "s_referral", stage: "support", label: "Referral ask: one name, with the option of not being named; never with an invoice or the testimonial ask", who: "us", gate: false, skippable: true,
        action: msg("cp_feedback_referral_wa_hi"), source: "LEAD-SOURCING-PLAYBOOK section 9.1" },
      { id: "s_day25", stage: "support", label: "Day 25: the care plan message, once, honestly (only when no plan was chosen)", who: "us", gate: (c) => !hasPlan(c.project),
        action: msg("cp_support_day25_wa_hi"), source: "SOP-06 section 10 Day 25" },
      { id: "s_close", stage: "support", label: "Day 30 closing note: what was reported, what was done, anything left open by agreement", who: "us", gate: true,
        action: msg("cp_support_closing_em_en_exit", "cp_support_closing_em_en_plan"), source: "SOP-06 section 10 Day 30" },
      { id: "s_access", stage: "support", label: "Ideovent's standing access removed and confirmed in writing (unless a care plan runs)", who: "us", gate: (c) => !hasPlan(c.project),
        action: tick("The date it was removed"), source: "SOP-06 section 10; Handover section 2 item 7", done: (c) => has(c.project.dates.accessRemoved) },
    ],
  },
  {
    id: "aftercare", n: 12, label: "Care plan or exit", hinglish: "AMC ya exit",
    goal: "A signed and paid care plan with its renewals in Today, or a clean exit in writing with the access removed and the project archived.",
    items: [
      { id: "ca_sign", stage: "aftercare", label: "Maintenance and Support Agreement (AMC) filled (no gold blanks), plan ticked in Annexure B, signed", who: "both", gate: (c) => pathOf(c.project) === "care_plan", action: tick(), source: "AMC-SALES-GUIDE section 14" },
      { id: "ca_terms", stage: "aftercare", label: "Hosting and Domain Terms filled, Annexure A credential register complete (no passwords)", who: "both",
        gate: (c) => pathOf(c.project) === "care_plan" && c.client.custodyModel === "ideovent_managed", action: tick(), source: "AMC-SALES-GUIDE section 14; Hosting Terms cl. 4" },
      { id: "ca_invoice", stage: "aftercare", label: "First care plan invoice issued (plain series, milestone AMC), 7 days before the period, due before it starts", who: "us",
        gate: (c) => pathOf(c.project) === "care_plan", action: { type: "document", kind: "invoice", milestone: "AMC" }, source: "AMC cl. 8.2, 11",
        done: (c) => c.docs.some((d) => d.kind === "invoice" && d.milestone === "AMC" && d.status === "issued") },
      { id: "ca_paid", stage: "aftercare", label: "First payment credited, receipt issued", who: "client", gate: (c) => pathOf(c.project) === "care_plan", action: { type: "payment" }, source: "AMC cl. 8.2",
        done: (c) => { const inv = c.docs.find((d) => d.kind === "invoice" && d.milestone === "AMC" && d.status === "issued"); return Boolean(inv) && isPaid(inv!, c.docs, c.payments) && receiptsFor(c, [inv!.id]); } },
      { id: "ca_baseline", stage: "aftercare", label: "Baseline backup taken and confirmed to the client on day 1", who: "us", gate: (c) => pathOf(c.project) === "care_plan", action: tick(), source: "AMC-SALES-GUIDE section 14" },
      { id: "ca_dates", stage: "aftercare", label: "Plan start, renewal date, domain, hosting and SSL renewal dates recorded", who: "us", gate: (c) => pathOf(c.project) === "care_plan",
        action: { type: "fields", card: "dates" }, source: "AMC-SALES-GUIDE section 13",
        done: (c) => has(c.client.carePlan?.startOn) && has(c.client.carePlan?.renewalOn) && has(c.client.renewals?.domain?.renewsOn) },
      { id: "x_letter", stage: "aftercare", label: "Closing letter (PDF) made final and sent with the day-30 note", who: "us", gate: (c) => pathOf(c.project) === "exit",
        action: { type: "document", kind: "closing" }, source: "Section 6.10", done: (c) => issuedDocs(c, "closing").length > 0 && sentAny(c, ["cp_support_closing_em_en_exit"]) },
      { id: "x_access", stage: "aftercare", label: "Access removal confirmed in writing (from s_access)", who: "us", gate: (c) => pathOf(c.project) === "exit", action: tick(), source: "SOP-06 section 10",
        done: (c) => has(c.project.dates.accessRemoved) },
      { id: "x_held", stage: "aftercare", label: "Anything Ideovent held handed over: domain unlocked with its code, DNS zone file, site archive, account transfers, notes (only when Ideovent held any)",
        who: "us", gate: (c) => pathOf(c.project) === "exit" && c.client.custodyModel === "ideovent_managed", action: tick(), source: "Hosting Terms cl. 12 steps 3 to 10",
        hint: "The domain and the DNS zone never wait for money (cl. 12.1); the archive, account transfers and documentation wait only for undisputed invoices (cl. 12.2)." },
      { id: "x_archive", stage: "aftercare", label: "Project folder archived; client status dormant", who: "us", gate: (c) => pathOf(c.project) === "exit", action: tick(), source: "Section 0" },
    ],
  },
];

function contentIn(c: ProjectCtx, rowId: string): boolean {
  const row = (c.project.content || []).find((r) => r.id === rowId);
  return Boolean(row && (row.status === "delivered" || row.status === "approved"));
}

/** Stage 12's path: the care plan when one was chosen, else the exit. */
export const pathOf = (p: Pick<CrmProject, "path" | "carePlanDecision">): "care_plan" | "exit" => p.path || (hasPlan(p) ? "care_plan" : "exit");

export const STAGE_BY_ID: Record<StageId, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, StageDef>;
export const ITEMS: ItemDef[] = STAGES.flatMap((s) => s.items);
export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const stageIndex = (id: StageId) => STAGES.findIndex((s) => s.id === id);
export const nextStageOf = (id: StageId): StageId | null => STAGES[stageIndex(id) + 1]?.id || null;

/* ── Item state ─────────────────────────────────────────────────────────── */

export type ItemStateName = "done" | "skipped" | "open";
export interface ItemState {
  state: ItemStateName;
  at?: string;
  via?: string;
  note?: string;
  /** An override of this item's need (decision 10): shown red. */
  overridden?: { at: string; reason: string };
}

const lineKey = (itemId: string, lineId: string) => `${itemId}:${lineId}`;

export function lineDone(c: ProjectCtx, item: ItemDef, line: ItemLine): boolean {
  if (line.from && itemState(c, ITEM_BY_ID[line.from]).state === "done") return true;
  const e = entryOf(c, lineKey(item.id, line.id));
  return e?.state === "done" && has(e.note || e.at);
}

export function itemState(c: ProjectCtx, item: ItemDef): ItemState {
  const e = entryOf(c, item.id);
  const ov = (c.project.gateOverrides || []).find((o) => o.item === item.id);
  const overridden = ov ? { at: ov.at, reason: ov.reason } : undefined;
  if (item.done && item.done(c)) return { state: "done", at: e?.at, via: e?.via || "auto", note: e?.note, overridden };
  if (item.lines && item.lines.length && item.lines.every((l) => lineDone(c, item, l))) return { state: "done", via: "lines", overridden };
  if (e?.state === "done" && !item.done && !(item.lines && item.lines.length)) return { state: "done", at: e.at, via: e.via, note: e.note, overridden };
  if (e?.state === "skipped") return { state: "skipped", at: e.at, note: e.note, overridden };
  return { state: "open", overridden };
}

export const isDone = (c: ProjectCtx, id: string) => itemState(c, ITEM_BY_ID[id]).state === "done";
export const isSettled = (c: ProjectCtx, id: string) => itemState(c, ITEM_BY_ID[id]).state !== "open";

export function gateApplies(c: ProjectCtx, item: ItemDef): boolean {
  if (item.gateOneOf && !item.gate) return false;
  return typeof item.gate === "function" ? item.gate(c) : item.gate === true;
}

/** The needs of an item that are not done and not overridden on this item (decision 10). */
export function unmetNeeds(c: ProjectCtx, item: ItemDef): { item: string; label: string }[] {
  if (!item.needs) return [];
  if ((c.project.gateOverrides || []).some((o) => o.item === item.id)) return [];
  return item.needs.filter((n) => !isDone(c, n.item));
}

/** The gate items of a stage that are still open (a one-of group counts once). */
export function missingForMove(c: ProjectCtx, stage: StageId = c.project.stage): ItemDef[] {
  const out: ItemDef[] = [];
  const seenGroups = new Set<string>();
  for (const item of STAGE_BY_ID[stage].items) {
    if (item.gateOneOf) {
      const key = item.gateOneOf.join("|");
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      if (!item.gateOneOf.some((id) => isSettled(c, id))) out.push(item);
      continue;
    }
    if (!gateApplies(c, item)) continue;
    if (!isSettled(c, item.id)) out.push(item);
  }
  return out;
}

/** An access row that waits for the launch payment and cannot be completed before it (h_access, decision 10). */
export function accessRowLocked(c: ProjectCtx, row: { waitsForPayment: boolean }): boolean {
  if (!row.waitsForPayment || launchPaid(c)) return false;
  return !(c.project.gateOverrides || []).some((o) => o.item === "h_access");
}

/** The stage a project's gates were overridden at (red on the journey strip). */
export const stageOverridden = (p: Pick<CrmProject, "gateOverrides">, stage: StageId) => (p.gateOverrides || []).some((o) => o.stage === stage);

/** The next open item: gate items first, in order (the "Next:" line). */
export function nextItem(c: ProjectCtx): ItemDef | null {
  const stage = STAGE_BY_ID[c.project.stage];
  const open = stage.items.filter((i) => itemState(c, i).state === "open");
  return open.find((i) => gateApplies(c, i) || (i.gateOneOf && !i.gateOneOf.some((id) => isSettled(c, id)))) || open[0] || null;
}

/* ── Actions: each returns the new project ──────────────────────────────── */

const nowIso = (now: Date) => now.toISOString();

export function tickItem(p: CrmProject, id: string, now: Date, note?: string, via = "hand"): CrmProject {
  return { ...p, checklist: { ...(p.checklist || {}), [id]: { state: "done", at: nowIso(now), note: note?.trim() || undefined, via } } };
}

export function untickItem(p: CrmProject, id: string): CrmProject {
  const checklist = { ...(p.checklist || {}) };
  delete checklist[id];
  return { ...p, checklist };
}

/** A line of an item (k_A, q_qa...), ticked with its date: "a tick with no date is not a tick". */
export function tickLine(p: CrmProject, itemId: string, lineId: string, date: string, now: Date): CrmProject {
  if (!date) throw new Error("A tick with no date is not a tick.");
  return tickItem(p, lineKey(itemId, lineId), now, date);
}

/** Skip with a reason: an item that does not gate (or may be skipped). A gate item is overridden with "Move on anyway" instead. */
export function skipItem(c: ProjectCtx, id: string, reason: string, now: Date): CrmProject {
  if (!reason.trim()) throw new Error("Skipping needs a reason.");
  const def = ITEM_BY_ID[id];
  if (def && !def.skippable && gateApplies(c, def)) throw new Error("This item gates the next stage: move on anyway with a reason instead.");
  const p = c.project;
  return { ...p, checklist: { ...(p.checklist || {}), [id]: { state: "skipped", at: nowIso(now), note: reason.trim(), via: "skip" } } };
}

/** "Do it anyway": an item's need overridden with its own reason (decision 10). */
export function overrideNeed(p: CrmProject, itemId: string, reason: string, now: Date): CrmProject {
  if (!reason.trim()) throw new Error("An override needs a written reason.");
  const def = ITEM_BY_ID[itemId];
  return { ...p, gateOverrides: [...(p.gateOverrides || []), { stage: def?.stage || p.stage, item: itemId, at: nowIso(now), reason: reason.trim() }] };
}

export function recordApproval(p: CrmProject, a: Omit<Approval, "at"> & { at?: string }, now: Date): CrmProject {
  if (!a.words.trim()) throw new Error("Write their words, as they wrote them.");
  const approval: Approval = { ...a, at: a.at || nowIso(now), words: a.words.trim() };
  const dates = { ...p.dates };
  const day = indiaDate(approval.at);
  if (a.what === "q_accepted" && !dates.accepted) dates.accepted = day;
  if (a.what === "d_ok" && !dates.designApproved) dates.designApproved = day;
  return { ...p, approvals: [...(p.approvals || []), approval], dates };
}

/** "Record deemed acceptance" (SA cl. 3.3): the review window passed with no written list. */
export function recordDeemed(p: CrmProject, what: string, noticeDate: string, now: Date): CrmProject {
  return recordApproval(p, { what, channel: "email", words: `Deemed acceptance under Clause 3.3: no written response in the 7-day review window from ${noticeDate}.` }, now);
}

export interface MoveResult {
  project: CrmProject;
  missing: ItemDef[];
}

/** Move to the next stage: only when every gate item is done or skipped, or with a written reason ("Move on anyway"). */
export function moveToNext(c: ProjectCtx, now: Date, overrideReason?: string): MoveResult {
  const next = nextStageOf(c.project.stage);
  if (!next) throw new Error("This is the last stage: close the project instead.");
  if (c.project.stage === "proposal") throw new Error("Stage 1 ends with \"They said yes\" or \"They said no\".");
  const missing = missingForMove(c);
  if (missing.length && !(overrideReason || "").trim()) return { project: c.project, missing };
  const gateOverrides = missing.length
    ? [...(c.project.gateOverrides || []), { stage: c.project.stage, at: nowIso(now), reason: (overrideReason || "").trim() }]
    : c.project.gateOverrides || [];
  return { project: { ...c.project, stage: next, gateOverrides }, missing: [] };
}

/** "They said yes" (4.1): records the yes and moves to stage 2. The lead goes to Won (the screen's job). */
export function saidYes(p: CrmProject, now: Date): CrmProject {
  return { ...p, stage: "agreement", dates: { ...p.dates, yes: p.dates.yes || indiaDate(now) } };
}

/** "They said no" (or the day-30 close): outcome Lost, their reason in their own words. */
export function saidNo(p: CrmProject, reason: string, now: Date): CrmProject {
  if (!reason.trim()) throw new Error("What tipped it? Write it in their words.");
  return { ...p, outcome: "lost", closeReason: reason.trim(), closedAt: nowIso(now), dates: { ...p.dates, lost: indiaDate(now), closed: indiaDate(now) } };
}

export function putOnHold(p: CrmProject, hold: Hold, reason: string, now: Date): CrmProject {
  if (!reason.trim()) throw new Error("Say why it is on hold.");
  return { ...p, hold, notesByKey: { ...(p.notesByKey || {}), holdReason: reason.trim() }, dates: { ...p.dates, holdSince: indiaDate(now) } };
}

export function resume(p: CrmProject): CrmProject {
  const dates = { ...p.dates };
  delete dates.holdSince;
  return { ...p, hold: null, dates };
}

export function closeProject(p: CrmProject, outcome: Outcome, reason: string, now: Date): CrmProject {
  if (outcome !== "closed" && !reason.trim()) throw new Error("Write the reason.");
  return { ...p, outcome, closeReason: reason.trim() || undefined, closedAt: nowIso(now), dates: { ...p.dates, closed: indiaDate(now) } };
}

/** The open stage-1 follow-ups stop the moment a yes or a no is recorded (4.1). */
export const proposalOpen = (p: CrmProject) => p.stage === "proposal" && !p.outcome;

/** The balance still open on a document, for the screens. */
export const balanceOf = (doc: CrmDocument, c: Pick<ProjectCtx, "docs" | "payments">) => docBalance(doc, c.docs, c.payments);

/** A working-day check date: never later than go-live minus 3 working days (SOP-05 K). */
export const accuracyLatest = (goLive: string) => addWorkingDays(goLive, -3);

/* ── Opening a file, and the checked actions the screens use ───────────── */

export interface OpenAnswers {
  /** "One-time project or monthly plan?" (decision 16). */
  monthlyPlan: boolean;
  /** "Client in India?" (decision 16). */
  inIndia: boolean;
  /** The lead's status: a Won lead opens at stage 2 with stage 1 "Done before the client file" (4.13). */
  leadStatus?: string;
}

export interface OpenPlan {
  /** False: no project file (a monthly plan); the dialog offers Add client instead. */
  project: boolean;
  stage: StageId;
  openedAtWon: boolean;
  note: string | null;
}

export const MONTHLY_NOTE =
  "Monthly plans are not in the client file yet: their terms differ at every money step (the setup fee first, the site licensed while the plan runs, the buy-out and early exit not decided). Add the client instead, for contacts, renewals and notes.";
export const ABROAD_NOTE = "Clients outside India: the MSA and the export invoice in 03-legal-docs govern (not in the CRM yet).";

export function openPlan(a: OpenAnswers): OpenPlan {
  if (a.monthlyPlan) return { project: false, stage: "proposal", openedAtWon: false, note: MONTHLY_NOTE };
  const won = a.leadStatus === "won";
  return { project: true, stage: won ? "agreement" : "proposal", openedAtWon: won, note: a.inIndia ? null : ABROAD_NOTE };
}

/** Stage 1 of a file opened from a Won lead: "Done before the client file". */
export const doneBefore = (p: Pick<CrmProject, "openedAtWon">, stage: StageId) => Boolean(p.openedAtWon) && stage === "proposal";

/** Tick an item by hand; refused while its needs are unmet (decision 10: "Do it anyway" overrides with a reason first). */
export function tickChecked(c: ProjectCtx, id: string, now: Date, note?: string): CrmProject {
  const def = ITEM_BY_ID[id];
  const unmet = def ? unmetNeeds(c, def) : [];
  if (unmet.length) throw new Error(`Needs ${unmet.map((n) => n.label).join(" and ")}.`);
  return tickItem(c.project, id, now, note);
}

/** Tick one line of an item with its date; refused while the item's needs are unmet. */
export function tickLineChecked(c: ProjectCtx, itemId: string, lineId: string, date: string, now: Date): CrmProject {
  const def = ITEM_BY_ID[itemId];
  const unmet = def ? unmetNeeds(c, def) : [];
  if (unmet.length) throw new Error(`Needs ${unmet.map((n) => n.label).join(" and ")}.`);
  return tickLine(c.project, itemId, lineId, date, now);
}

/** What making a document final waits for: the launch invoice needs the client's acceptance (q_invoice, 4.8). */
export function documentNeeds(c: ProjectCtx, kind: CrmDocument["kind"], milestone?: CrmDocument["milestone"]): { item: string; label: string }[] {
  if (kind === "invoice" && (milestone || "LAUNCH_50") === "LAUNCH_50") return unmetNeeds(c, ITEM_BY_ID.q_invoice);
  return [];
}

/** Which part of the advance a proforma asks for: 2 for a split advance's part 2, else 1 (the advance, or part 1). */
export const advancePartOf = (d: Pick<CrmDocument, "data">): 1 | 2 => (String(d.data?.part ?? "1") === "2" ? 2 : 1);

/** What the issued credit notes against a document come to (a refunded advance, code F). */
const creditedOn = (docs: CrmDocument[], id: string) =>
  docs.filter((x) => x.kind === "credit_note" && x.status === "issued" && x.relatedDoc === id).reduce((n, x) => n + (x.amount || 0), 0);

/**
 * THE ADVANCE IS BILLED ONCE (README-BILLING section 3; spec 4.2, 4.7, 5.1). A project has at most one issued
 * proforma for the advance (or a split advance's part 1), one for part 2 and one for each change request's advance;
 * part 2 exists only with a split advance; a proforma refunded in full by credit notes (code F) no longer counts. A
 * wrong one is cancelled with a reason and made again. Once the launch invoice bills the project (the fee and the
 * approved change requests, less the advances received), no advance proforma is made at all. The database refuses
 * the first three the same way (0014 crm_issue_document, rules.ts issueDocument); these are the screen's own words,
 * so Documents never offers a second bill for the same money. `d.id` is the draft being made (it never refuses
 * itself). Empty when the proforma may be made, and for every other document.
 */
export function proformaRefusals(
  c: Pick<ProjectCtx, "docs" | "project"> & { payments?: CrmPayment[] },
  d: Pick<CrmDocument, "kind" | "milestone" | "data"> & { id?: string },
): string[] {
  if (d.kind !== "proforma" || (d.milestone !== "ADVANCE_50" && d.milestone !== "CHANGE_REQUEST")) return [];
  const p = c.project;
  const out: string[] = [];
  const standing = c.docs.filter((x) => x.kind === "proforma" && x.milestone === d.milestone && x.status === "issued" && x.projectId === p.id
    && x.id !== d.id && (x.amount || 0) > creditedOn(c.docs, x.id));
  const already = (what: string, x: CrmDocument) => (c.payments || []).some((y) => y.status === "recorded" && y.againstDoc === x.id)
    ? `${what} is already on ${x.number} (issued ${fmtDate(x.issuedOn)}), and money was received against it: a second proforma would bill it twice.`
    : `${what} is already on ${x.number} (issued ${fmtDate(x.issuedOn)}). To change it, cancel that one with a reason, then make the new one.`;
  const launch = findLaunchInvoice(p.id, c.docs);
  if (launch) out.push(`The launch invoice ${launch.number} already bills this project, less the advances received: no advance proforma after it.`);
  if (d.milestone === "CHANGE_REQUEST") {
    const crNo = d.data?.crNo;
    const same = crNo ? standing.find((x) => x.data?.crNo === crNo) : undefined;
    if (same) out.push(already(`${crNo}'s advance`, same));
    return out;
  }
  const part = advancePartOf(d);
  if (part === 2 && !p.splitAdvance) {
    out.push("This project has no split advance: its 50% advance is one proforma. A split is agreed on the Price card first, with the other partner's written yes.");
  }
  const same = standing.find((x) => advancePartOf(x) === part);
  if (same) out.push(already(part === 2 ? "Part 2 of the advance" : "The advance", same));
  if (part === 2 && p.splitAdvance) {
    const first = standing.find((x) => advancePartOf(x) === 1);
    const fee = feeOf(p);
    if (first && fee !== null && (first.amount || 0) >= advanceOf(fee)) {
      out.push(`${first.number} already asks for the whole 50% advance: a part 2 would bill it twice.`);
    }
  }
  return out;
}

/**
 * Why an open item does not apply to this project, in a few words, or null when it does. The stage card says so
 * in place of a due date (a closed exit project never lists the care plan's items as due), and Today skips the same
 * items (tasks.ts itemTasks reads this function): stage 12's other path, a custody step when Ideovent held nothing,
 * and support's day-25 care plan message and access removal while a care plan runs.
 */
export function notNeededReason(c: ProjectCtx, item: ItemDef): string | null {
  if (typeof item.gate !== "function" || item.gate(c)) return null;
  const held = c.client.custodyModel === "client_held"
    ? "the client holds its own domain and hosting"
    : "the client card does not say Ideovent held the domain, hosting or accounts";
  if (item.stage === "aftercare") {
    const path = pathOf(c.project);
    if (item.id.startsWith("ca_")) return path === "exit" ? "Not on this path: no care plan was chosen (the exit)." : `Not needed: ${held}.`;
    if (item.id.startsWith("x_")) return path === "care_plan" ? "Not on this path: the care plan runs." : `Not needed: ${held}.`;
  }
  if (item.id === "s_day25") return "Not needed: they chose a care plan.";
  if (item.id === "s_access") return "Not needed: a care plan runs, so Ideovent keeps its access.";
  return null;
}
