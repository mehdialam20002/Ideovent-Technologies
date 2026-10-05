/**
 * THE CLIENT FILE (client-process-spec, 4 Oct 2026; migration 0014).
 *
 * When a lead says yes, the CRM carries that client through twelve stages,
 * from the proposal to the exit or the care plan. These are the records:
 * a client (one per organisation, at most one per lead), its projects (one
 * per engagement), the documents (numbered money documents and the welcome
 * pack, handover document and closing letter), the payments (one per credit
 * in the bank) and the timeline. Settings hold the firm's billing details and
 * the policy numbers Mehdi decides once (README-BILLING section 6).
 *
 * Owner only, read and write (spec decision 2, 17). In Supabase mode the
 * tables of 0014; in local mode one JSON object under
 * localStorage["ideovent_clients_v1"] (src/lib/clients/store.ts), with the
 * same rules (src/lib/clients/rules.ts).
 *
 * No type, table or screen has a field for a password (spec 8.3).
 */
import type { LeadKind } from "@/lib/outreach/types";

export type StageId =
  | "proposal" | "agreement" | "welcome" | "kickoff" | "content" | "design"
  | "build" | "review" | "launch" | "handover" | "support" | "aftercare";
export const STAGE_IDS: readonly StageId[] = [
  "proposal", "agreement", "welcome", "kickoff", "content", "design", "build", "review", "launch", "handover", "support", "aftercare",
];
export type ClientStatus = "active" | "in_warranty" | "dormant" | "churned" | "archived";
export type ProjectKind = "landing" | "website" | "portal" | "software" | "other";
export const PROJECT_KINDS: readonly ProjectKind[] = ["landing", "website", "portal", "software", "other"];
export type Hold = "client_delay" | "non_payment" | "no_advance";
export type Outcome = "lost" | "cancelled" | "closed";
export type DocKind =
  | "quotation" | "proforma" | "invoice" | "receipt" | "credit_note"
  | "welcome" | "handover" | "care_plan" | "closing" | "change_request";
export const DOC_KINDS: readonly DocKind[] = [
  "quotation", "proforma", "invoice", "receipt", "credit_note", "welcome", "handover", "care_plan", "closing", "change_request",
];
export type Milestone = "ADVANCE_50" | "LAUNCH_50" | "CHANGE_REQUEST" | "AMC" | "HOSTING_PASSTHROUGH" | "OTHER";
/** The money series (README-BILLING section 3). INV is the plain series, IDV/<fy>/<serial>. */
export type Series = "Q" | "PI" | "INV" | "RC" | "CN";
export type DocStatus = "draft" | "issued" | "cancelled";
export type PaymentMode = "upi" | "neft" | "imps" | "rtgs" | "cheque" | "other";
export type ClientEventType = "sent" | "note" | "stage" | "item" | "doc" | "payment" | "approval" | "call" | "reply" | "hold";
export type ClientChannel = "whatsapp" | "email" | "call" | "meeting" | "post";
export type CarePlanId = "essential" | "growth" | "priority";
export type Language = "en" | "hinglish";

export interface CrmClient {
  id: string;
  /** IDV-C-0001, from a sequence (the database's, or local mode's own). */
  code: string;
  leadId: string | null;
  status: ClientStatus;
  createdAt: string;
  /** As the database returned it: the browser updates only where this still matches ("Changed in another tab"). */
  updatedAt: string;
  orgName: string;
  kind: LeadKind;
  city?: string;
  /** Their website before the project (the lead's), for the day-7 proposal note and the win-back check. */
  website?: string;
  /** A lead's "hi" is read as "hinglish": client templates exist in Hinglish and English only. */
  language?: Language;
  /** Decision 16: false turns the money documents off (the MSA and the export invoice govern). */
  inIndia: boolean;
  /** Decision 16: a monthly-plan client has no project file in this pass. */
  monthlyPlan?: boolean;
  legalName?: string;
  legalSameAsTrading?: boolean;
  entityType?: "proprietorship" | "partnership" | "llp" | "private_limited" | "trust" | "society" | "other";
  billingAddress?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  deductsTds?: boolean;
  poNumber?: string;
  /** Copied from the lead at opening. */
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  accounts?: { name?: string; phone?: string; email?: string };
  /** SA cl. 12.3; null = not asked yet. */
  portfolioOptOut?: boolean | null;
  testimonial?: {
    status: "not_asked" | "asked" | "received" | "permission_on_file" | "declined";
    quote?: string;
    consentAt?: string;
    channel?: string;
    askedAt?: string;
    declinedAt?: string;
  };
  logoPermission?: { at: string; channel: string } | null;
  review?: { askedAt?: string; leftAt?: string };
  referralAskedAt?: string;
  /** Hosting Terms cl. 4: who holds the hosting account. */
  custodyModel?: "client_held" | "ideovent_managed";
  carePlan?: {
    plan: CarePlanId;
    billing: "monthly" | "annual";
    fee: number;
    startOn?: string;
    renewalOn?: string;
    status: "proposed" | "active" | "lapsed" | "ended";
  };
  renewals?: Partial<Record<RenewalKey, RenewalRow>>;
  /** Copied from the lead: the send checks honour them while the lead is gone. */
  dnc?: boolean;
  metaConsent?: string;
  /** A red note (an abusive client, SOP-09 section 4), shown on the client card. */
  redNote?: string;
  notes?: string;
  /** The win-back and records reminders after an exit (spec 4.12), ISO dates. */
  exitedOn?: string;
  /** Lost at stage 1: the 24-month records reminder runs from the last message. */
  lostOn?: string;
  /** Messages sent at the client level (renewals, win-back), as on a project. */
  sends?: SendRecord[];
  /** The win-back after an exit (AMC-SALES-GUIDE section 12): the free check, and whether they replied. */
  winback?: { checkedAt?: string; repliedAt?: string };
  /** Snoozed client-level tasks: task id -> until (India date). */
  snoozed?: Record<string, string>;
}

export type RenewalKey = "domain" | "hosting" | "ssl" | "email";
export interface RenewalRow {
  provider?: string;
  inWhoseName?: string;
  renewsOn?: string;
  cost?: string;
  whoPays?: string;
}

export interface ProjectLine {
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

export type DateKey =
  | "call" | "proposalSent" | "yes" | "paperworkSent" | "effective" | "kickoff" | "devStart" | "contentCutoff"
  | "designApproved" | "buildStart" | "reviewNotice" | "accepted" | "goLiveTarget" | "goLive" | "finalDelivery" | "handover"
  | "sourceTransferred" | "accessRemoved" | "closed" | "kickoffBooked" | "summarySent" | "holdSince" | "paused"
  | "wireframesSent" | "goAheadAsked" | "lost";

export interface ChecklistEntry {
  state: "done" | "skipped";
  at: string;
  note?: string;
  /** What ticked it: "auto" (its condition), "hand", a template id, "override". */
  via?: string;
}

export interface Approval {
  /** The item or the thing approved: "d_wire_ok", "d_ok", "k_confirmed", "q_accepted", "l_proposed", "round:Design:1". */
  what: string;
  at: string;
  channel: "email" | "whatsapp" | "call" | "meeting";
  /** Their words, verbatim. */
  words: string;
  emailConfirmedAt?: string;
}

export interface ContentRow {
  id: string;
  label: string;
  format?: string;
  owner?: string;
  due?: string;
  status: "not_started" | "in_progress" | "delivered" | "approved" | "not_available";
  decision?: string;
  movedAt?: string;
  /** A page of SOW section 6 (page rows) or a global asset (Content-Collection-Checklist section 3). */
  group?: "global" | "page";
}

export interface DesignRound {
  stage: string;
  n: number;
  sentAt?: string;
  reviewLink?: string;
  listAt?: string;
  doneAt?: string;
  deemedAt?: string;
}

export interface ChangeRequest {
  no: string;
  raisedAt: string;
  requestedBy?: string;
  description: string;
  reason: string;
  scopeImpact: string;
  days: number;
  cost: number;
  advanceDue: number;
  lapsesOn?: string;
  status: "draft" | "sent" | "approved" | "declined" | "parked" | "waived";
  approvedAt?: string;
  /** The fixed price, when it is not hours x the hourly rate. */
  fixedPrice?: boolean;
  hours?: number;
}

export interface Issue {
  id: string;
  at: string;
  channel: string;
  summary: string;
  severity: "S1" | "S2" | "S3" | "S4";
  cover: "defect" | "change" | "new_work";
  minutes: number;
  status: "open" | "closed";
  closedAt?: string;
  done?: string;
  /** Left open by agreement: who owes it and by when (SOP-06 section 10, day 30). */
  owedBy?: string;
  by?: string;
}

export interface AccessRow {
  system: string;
  username?: string;
  given?: "added_as_user" | "one_time_link" | "client_makes_changes";
  givenOn?: string;
  method?: "own_email_invite" | "one_time_link" | "not_applicable";
  transferredOn?: string;
  changedByClient?: boolean;
  /** What Ideovent built or set up (admin panel, database, repository, a hosting account it opened): needs l_paid. */
  waitsForPayment: boolean;
  removedOn?: string;
}

export interface Deliverable {
  text: string;
  delivered: "yes" | "part";
  remains?: string;
  owner?: string;
  by?: string;
}

export interface GateOverride {
  stage: StageId;
  /** Set when an item's need was overridden (decision 10); absent for a stage gate. */
  item?: string;
  at: string;
  reason: string;
}

export interface GoLiveChange {
  from?: string;
  to: string;
  at: string;
  cause: "client" | "ideovent" | "change_request";
  reason: string;
}

export interface CrmProject {
  id: string;
  /** IDV-PR-0001. */
  code: string;
  clientId: string;
  leadId: string | null;
  kind: ProjectKind;
  stage: StageId;
  hold: Hold | null;
  outcome: Outcome | null;
  fee: number | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  name: string;
  packageLabel?: string;
  durationWeeks?: number;
  sowRef?: string;
  proposalNo?: string;
  lines: ProjectLine[];
  /** 4.1: the other partner's yes is always required. */
  discount?: { amount: number; reason: "case_study" | "second_project"; partnerApprovedAt: string; channel: string };
  /** 4.2: the one free concession, with the other partner's written yes and the agreed date of part 2. */
  splitAdvance?: { partnerApprovedAt: string; channel: string; part1: number; part2: number; part2DueOn: string };
  brief?: {
    goals?: string; audience?: string; pages?: string; features?: string; contentReady?: string;
    deadline?: string; budgetBand?: string; decisionMaker?: string; theirWords?: string;
  };
  dates: Partial<Record<DateKey, string>>;
  goLiveTime?: string;
  kickoffTime?: string;
  /** 1 Monday ... 6 Saturday. */
  weeklyUpdateDay?: 1 | 2 | 3 | 4 | 5 | 6;
  commsChannel?: string;
  pointOfContact?: string;
  escalationContact?: string;
  stagingUrl?: string;
  liveUrl?: string;
  domainName?: string;
  domainInClientName?: "from_start" | "moved_to_them" | "no" | "unknown";
  adminUrl?: string;
  repo?: string;
  goLiveHistory: GoLiveChange[];
  checklist: Record<string, ChecklistEntry>;
  content: ContentRow[];
  designStages: string[];
  rounds: DesignRound[];
  approvals: Approval[];
  changeRequests: ChangeRequest[];
  issues: Issue[];
  access: AccessRow[];
  training?: { at?: string; minutes?: number; attendees?: string; recordingUrl?: string; guideSent?: boolean; notes?: string };
  deliverables: Deliverable[];
  carePlanDecision?: "none" | "essential" | "growth" | "priority";
  satisfaction?: "happy" | "concern" | "no_reply";
  gateOverrides: GateOverride[];
  /** Task id -> until (India date). */
  snoozed?: Record<string, string>;
  /** "Done before the client file": opened from a Won lead (4.13). */
  openedAtWon?: boolean;
  /** One-time project (decision 16). Always "one_time" for a project file in this pass. */
  engagement?: "one_time";
  /** Why a project was lost or cancelled, in their words. */
  closeReason?: string;
  /** The NDA choice (a_nda). */
  nda?: "not_needed" | "mutual_signed" | "theirs_checked";
  /** Rollback recorded on l_verify. */
  rolledBackAt?: string;
  /** Formal notices sent by post too: template id -> "<date>, <receipt number>". */
  posted?: Record<string, string>;
  /** A tiny change waived "on the house" (SOP-08 section 6). */
  waived?: { at: string; what: string }[];
  /** The welcome pack's optional "Also on your project" bios (off by default). */
  alsoOnProject?: ("saif" | "abhilasha")[];
  /** Path chosen at stage 12. */
  path?: "care_plan" | "exit";
  /** Kickoff Checklist line states, k_stuck decisions and the like (free notes by key). */
  notesByKey?: Record<string, string>;
  /**
   * Every message sent from the file (template, channel, the document it was about), so the item it
   * completes, the ladders and {reminder1Date} read the project, never the whole timeline (spec 9).
   */
  sends?: SendRecord[];
  /** The handover document's facts that have no field of their own (registrar, hosting provider, analytics...). */
  handover?: Record<string, string>;
}

export interface SendRecord {
  /** Template id. */
  t: string;
  /** ISO time it was opened in WhatsApp or the mail app. */
  at: string;
  ch: "whatsapp" | "email";
  /** The document the message was about (a ladder step), when there is one. */
  doc?: string;
}

/* ── Documents ───────────────────────────────────────────────────────────── */

/** A document's content snapshot and its own choices (spec 8.3 "data typed per document kind"). */
export interface DocData {
  /** The model as issued: the PDF of an issued document is drawn from this, never rebuilt (README rule 2). */
  model?: import("./docs/model").DocModel;
  /** Split advance: which part this proforma is (E13). */
  part?: 1 | 2;
  /** A change request's number (CR-01) for its form or its advance proforma. */
  crNo?: string;
  /** Credit note: reason code A to G (Credit-Note section 1). */
  reasonCode?: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  reason?: string;
  agreedWith?: string;
  agreedOn?: string;
  settlement?: "adjusted" | "refunded";
  /** Credit note: both partners' written yes (SOP-09 note 5). The database refuses a credit note without it. */
  partnersApproval?: { at: string; channel: string };
  /** Credit note lines credited. */
  lines?: { description: string; amount: number }[];
  /** A care plan invoice's period. */
  period?: { from: string; to: string; plan?: CarePlanId; billing?: "monthly" | "annual" };
  /** Invoice for work to date (cl. 4.5). */
  workToDate?: boolean;
  /** Free notes. */
  note?: string;
}

export interface CrmDocument {
  id: string;
  clientId: string;
  projectId: string | null;
  kind: DocKind;
  milestone: Milestone | null;
  status: DocStatus;
  series: Series | null;
  fy: string | null;
  serial: number | null;
  number: string | null;
  issuedOn: string | null;
  dueOn: string | null;
  validUntil: string | null;
  /** 5.1: quotation the total; proforma the amount payable now; invoice the total due; receipt the amount credited; credit note the credit. */
  amount: number | null;
  /** A receipt's credit. */
  paymentId: string | null;
  /** A receipt's or a credit note's document. */
  relatedDoc: string | null;
  data: DocData;
  issuedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmPayment {
  id: string;
  clientId: string;
  projectId: string | null;
  againstDoc: string;
  receivedOn: string;
  /** Credited in the bank (net of TDS). */
  amount: number;
  tds: number;
  mode: PaymentMode;
  reference: string | null;
  status: "recorded" | "voided";
  voidReason: string | null;
  note: string | null;
  createdAt: string;
}

export interface CrmClientEvent {
  id: string;
  clientId: string;
  projectId: string | null;
  /** The server's time (never the browser's). */
  at: string;
  type: ClientEventType;
  channel?: ClientChannel | null;
  templateId?: string | null;
  detail?: string | null;
  data: Record<string, unknown>;
}

/* ── Settings (6.1, 6.3) ────────────────────────────────────────────────── */

export interface ClientSettings {
  billing: {
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifsc?: string;
    branch?: string;
    /** "not printed": the branch line is left off. */
    branchNotPrinted?: boolean;
    upiId?: string;
    noUpi?: boolean;
    firmPan?: string;
    /**
     * The firm's Udyam registration number, printed on the quotation, proforma and invoice. FACTS: "on invoices and
     * agreements, not on the website", so it is typed here (Mehdi's settings row) and never shipped in the site's code.
     */
    udyam?: string;
    addressLine?: string;
    signatory?: string;
    registrationStatus?: string;
  };
  policy: {
    assetDeadlineDays?: number;
    disputeWindowDays?: number;
    receiptDays?: number;
    refundDays?: number;
    removalDays?: number;
    killFeePercent?: number;
    workingHours?: string;
    p1?: string;
    p2?: string;
    p3?: string;
    secretTool?: string;
    passwordManager?: string;
    hourlyRate?: number;
    restartFee?: number;
    /** AMC cl. 11.6: a care plan invoice's own rate. */
    lateInterestPercent?: number;
    /** Deed cl. 10.17. Blank: the other partner approves every agreement. */
    singlePartnerLimit?: number;
    /** SOP-08 section 1: the welcome pack's reply-time sentence, left out until set. */
    projectReplyTarget?: string;
    projectFolderRoot?: string;
  };
  deedNamesSignatory: boolean;
  printTemplateNote: boolean;
  googleReviewLink: string;
  firstSerial: Partial<Record<Series, Record<string, number>>>;
  /** Template id (or "doc:welcome", "doc:closing", "edit:E13") -> ISO date approved. */
  approvedWording: Record<string, string>;
}

/* ── Store inputs ───────────────────────────────────────────────────────── */

export interface OpenFileInput {
  leadId: string;
  /** From the lead: name, kind, contacts, city, language, do-not-contact and Meta consent. */
  lead: {
    instituteName: string;
    kind: LeadKind;
    contactName?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    city?: string;
    website?: string;
    language?: "en" | "hinglish" | "hi";
    status?: string;
    metaConsent?: string;
  };
  /** Decision 16. */
  inIndia: boolean;
  project: Partial<CrmProject> & { name: string };
}

export interface DraftInput {
  id?: string;
  clientId: string;
  projectId: string | null;
  kind: DocKind;
  milestone?: Milestone | null;
  amount?: number | null;
  paymentId?: string | null;
  relatedDoc?: string | null;
  data?: DocData;
}

export interface PaymentInput {
  clientId: string;
  projectId: string | null;
  againstDoc: string;
  receivedOn: string;
  amount: number;
  tds?: number;
  mode: PaymentMode;
  reference?: string | null;
  note?: string | null;
}

export interface ClientEventInput {
  clientId: string;
  projectId?: string | null;
  type: ClientEventType;
  channel?: ClientChannel | null;
  templateId?: string | null;
  detail?: string | null;
  data?: Record<string, unknown>;
}

/** Everything the client screens read, for the owner. */
export interface ClientData {
  clients: CrmClient[];
  projects: CrmProject[];
  documents: CrmDocument[];
  payments: CrmPayment[];
  settings: ClientSettings;
}
