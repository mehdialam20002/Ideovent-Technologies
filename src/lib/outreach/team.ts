/**
 * THE CRM TEAM: who is signed in, the people Mehdi lets into the CRM, and the
 * shapes the team functions of 0011_crm_team.sql return (spec section 6.6).
 *
 * Types and a few shared constants only, no rules: who may see and change what
 * is in ./access.ts (pure), and the database enforces the same rules itself.
 *
 *   owner   Mehdi: whoever public.is_admin() says. Everything, as before.
 *   admin   a trusted senior, later: works every lead, assigns, no money stages.
 *   member  an intern: only the leads Mehdi assigns, while open and 14 days after.
 */
import type { LeadKind, LeadStatus, OutreachLead } from "./types";

export type CrmRole = "owner" | "admin" | "member";

/** The targets Mehdi sets per person (keys the UI knows). */
export interface CrmTargets {
  firstMessagesPerDay?: number;
  callsPerDay?: number;
  repliesPerWeek?: number;
  handoffsPerWeek?: number;
}

/** Who is signed in, from crm_me() (or the local emulation). */
export interface CrmMe {
  /** True when 0011 is not applied: behave exactly as before (owner, no team features). */
  legacy: boolean;
  memberId: string | null;
  /** null: no access to the CRM; `reason` says why. */
  role: CrmRole | null;
  reason?: "signed_out" | "not_a_member" | "deactivated";
  email?: string;
  displayName: string;
  /** Effective: owner and admins always; a member with "See all leads". */
  viewAll: boolean;
  /** Effective: owner and admins always; a member with "Can add leads". */
  canAddLeads: boolean;
  mayColdCall: boolean;
  /** First WhatsApp messages a day. null = no limit; 0 = none. */
  waDailyLimit: number | null;
  /** Most New leads (nobody has written to them) the person may hold. */
  newLeadCap: number;
  targets: CrmTargets;
  senderName?: string;
  senderPhone?: string;
  /** Mehdi saw their test message arrive from senderPhone. WhatsApp sends wait for it. */
  senderChecked: boolean;
  signature?: string;
  /** Mehdi's own number, for "Tell Mehdi on WhatsApp". */
  hostWhatsapp?: string;
  mustChangePassword: boolean;
}

/** One row of the team (crm_members), as the owner and admins read it. Flags are the row's own, not effective. */
export interface CrmMember extends Omit<CrmMe, "legacy" | "reason" | "memberId" | "hostWhatsapp" | "senderChecked"> {
  id: string;
  /** The linked Supabase login; null until the first sign-in links it (or after the login is deleted). */
  userId: string | null;
  active: boolean;
  senderCheckedAt?: string;
  joinedAt?: string;
  lastSeenAt?: string;
  deactivatedAt?: string;
  createdAt: string;
}

/** Names for labels and history lines (crm_team): never e-mails. */
export interface CrmTeamName {
  id: string;
  displayName: string;
  role: CrmRole;
  active: boolean;
}

/** A lead WITHOUT contact details (crm_leads_overview): See all, and a member's own hand-overs. */
export interface LeadOverview {
  id: string;
  instituteName: string;
  kind: LeadKind;
  city?: string;
  status: LeadStatus;
  assigneeId: string | null;
  assigneeName?: string;
  qualifiedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  nextActionAt?: string;
  lastContactedAt?: string;
}

/** "Is this number already a lead?" across the whole team (crm_find_duplicate): never a contact. */
export interface DuplicateHit {
  leadId: string;
  instituteName: string;
  /** Whose lead it is ("Unassigned" for the pool). */
  assigneeName: string;
  /** Whether the caller may open it. */
  visible: boolean;
}

/**
 * What the store's findDuplicate returns: the hit, plus the lead itself as far
 * as the caller may see it (the whole lead when visible; only its id, name and
 * stub fields when not). The lead part keeps today's callers working (LeadFields
 * reads id, instituteName, city, email) until they read the hit only (part 2).
 */
export type DuplicateMatch = DuplicateHit & OutreachLead;

/** Numbers per person (crm_activity_stats). */
export interface MemberStats {
  memberId: string;
  displayName: string;
  role: CrmRole;
  active: boolean;
  firstWhatsapp: number;
  firstEmail: number;
  followUps: number;
  calls: number;
  callsConnected: number;
  replies: number;
  handoffs: number;
  notes: number;
  unansweredFirstWhatsapp: number;
  openLeads: number;
  newLeads: number;
  overdue: number;
  untouched: number;
  wonCredited: number;
  /** Hand-overs Mehdi marked accepted: the one number an intern cannot type in. */
  handoffsConfirmed: number;
  lastActiveAt?: string;
  lastSeenAt?: string;
}

export type NotificationKind = "assigned" | "moved_away" | "handoff" | "review" | "info" | "demo_ready" | "resolved";

export interface CrmNotification {
  id: number;
  kind: NotificationKind;
  title: string;
  leadId?: string;
  actorId?: string;
  createdAt: string;
  readAt?: string;
}

export type RequestKind = "demo" | "correction" | "question" | "handoff" | "give_back";
export type RequestOutcome = "done" | "no_action" | "accepted" | "not_real";

/** An Ask Mehdi or a hand-over: open until Mehdi (or the admin it went to) resolves it. */
export interface CrmRequest {
  id: number;
  leadId: string;
  kind: RequestKind;
  askedBy?: string;
  hostId?: string;
  body?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  outcome?: RequestOutcome;
  outcomeNote?: string;
}

/** One person, one India-time day, on the owner's Team > Access tab (crm_access_summary). */
export interface AccessDay {
  memberId: string;
  displayName: string;
  /** YYYY-MM-DD, India time. */
  day: string;
  leadViews: number;
  distinctLeadsViewed: number;
  leadsWorked: number;
  contactChanges: number;
  exports: number;
  imports: number;
  signIns: number;
  viewsOffHours: number;
  flaggedClaims: number;
  suspicious: boolean;
}

/** The database's size against the Free plan's 500 MB (crm_db_usage). */
export interface DbUsage {
  databaseBytes: number;
  crmBytes: number;
}

export type DistributeMode = "balanced" | "round_robin";
/** memberId null = the leads left over because of caps. */
export interface DistributeRow {
  memberId: string | null;
  assigned: number;
}

export type AskTopic = "demo" | "correction" | "question";

export interface HandoffInput {
  leadId: string;
  /** Phase 2: a 15-minute slot on Mehdi's calendar (books it and sets stage Call). */
  slotAt?: string;
  note?: string;
  /** Mehdi by default; else an admin. Never another member. */
  hostId?: string;
  /** false = "give back" (wrong number, not a fit): no credit. */
  qualified?: boolean;
}

export type CallOutcome =
  | "connected_interested"
  | "connected_callback"
  | "connected_not_interested"
  | "no_answer"
  | "busy"
  | "switched_off"
  | "wrong_number";

/** crm_save_member: a field left undefined keeps its value. waDailyLimit below 0 = no limit (admins only). */
export interface SaveMemberInput {
  id?: string;
  email?: string;
  displayName?: string;
  role?: "admin" | "member";
  viewAll?: boolean;
  canAddLeads?: boolean;
  mayColdCall?: boolean;
  waDailyLimit?: number | null;
  newLeadCap?: number;
  targets?: CrmTargets;
  senderName?: string;
  senderPhone?: string;
  /** true: Mehdi saw their test message arrive from the company number. A new number clears it. */
  senderChecked?: boolean;
  signature?: string;
  mustChangePassword?: boolean;
}

/** The sentence groups with a "we" version for members, behind Mehdi's approval (spec 10.7). */
export type MemberWordingKey = "we_pitch_note" | "we_sample_made" | "we_leave_it_here" | "we_call_lines" | "member_after_yes";
export const MEMBER_WORDING_KEYS: readonly MemberWordingKey[] = [
  "we_pitch_note",
  "we_sample_made",
  "we_leave_it_here",
  "we_call_lines",
  "member_after_yes",
];

/** Assignment rules (round-robin by kind and city). Phase 2 UI; the SQL is in 0011. */
export interface AssignmentRule {
  id: number;
  name: string;
  /** null = any kind. */
  kind: LeadKind | null;
  /** null = any city; otherwise "city contains" (case does not matter). */
  city: string | null;
  memberIds: string[];
  priority: number;
  active: boolean;
  /** Whose turn it is inside the rule. */
  nextIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentRuleInput {
  id?: number;
  name: string;
  kind?: LeadKind | null;
  city?: string | null;
  memberIds: string[];
  priority?: number;
  active?: boolean;
}

/** Good / Fix on a member's send or call line. The database ties it to the line's writer. */
export interface CrmReview {
  id: number;
  eventId: string;
  leadId: string;
  /** Whose work: the line's writer. */
  memberId: string;
  reviewerId?: string;
  verdict: "good" | "fix";
  comment?: string;
  createdAt: string;
}

/** A call booked with the host (phase 2): 15 minutes on a 15-minute grid. */
export interface CrmBooking {
  id: number;
  leadId: string;
  hostId: string;
  bookedBy?: string;
  slotAt: string;
  minutes: number;
  status: "booked" | "done" | "no_show" | "cancelled";
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

/** What crm_log_access records. */
export type AccessAction = "lead.view" | "contact.reveal" | "export" | "import" | "sign_in";

/** One line of the audit trail (crm_audit), as the owner reads it. Contact values are never copied in. */
export interface CrmAuditLine {
  id: number;
  at: string;
  actorId: string | null;
  action: string;
  leadId?: string | null;
  memberId?: string | null;
  detail: Record<string, unknown>;
}

/**
 * The presets of the Add person dialog (spec 4.2). They only fill the fields;
 * May cold-call is off in every one (TRAI, spec 11.4).
 */
export const MEMBER_PRESETS = {
  trainee: { label: "Trainee (week 1)", viewAll: true, canAddLeads: false, waDailyLimit: 0, newLeadCap: 15, mayColdCall: false },
  supervised: { label: "Supervised (weeks 2-3)", viewAll: false, canAddLeads: false, waDailyLimit: 10, newLeadCap: 20, mayColdCall: false },
  full: { label: "Full", viewAll: false, canAddLeads: true, waDailyLimit: 25, newLeadCap: 40, mayColdCall: false },
} as const;
export type MemberPreset = keyof typeof MEMBER_PRESETS;

/** Local mode: who the CRM acts as (a crm member id). Missing or empty = the owner. Spec 9.5. */
export const LOCAL_ACTOR_KEY = "ideovent_crm_local_actor";
/** Local mode: the owner's member id, seeded on first read. */
export const LOCAL_OWNER_ID = "m_owner";

/** Mehdi as before 0011 (legacy mode): the owner, with nothing held back and no team features. */
export function legacyMe(): CrmMe {
  return {
    legacy: true,
    memberId: null,
    role: "owner",
    displayName: "Mehdi Alam",
    viewAll: true,
    canAddLeads: true,
    mayColdCall: true,
    waDailyLimit: null,
    newLeadCap: 1000,
    targets: {},
    senderChecked: true,
    mustChangePassword: false,
  };
}

/** Someone with no access to the CRM (signed out, not in the team, switched off). */
export function noAccessMe(reason: NonNullable<CrmMe["reason"]>, displayName = ""): CrmMe {
  return {
    legacy: false,
    memberId: null,
    role: null,
    reason,
    displayName,
    viewAll: false,
    canAddLeads: false,
    mayColdCall: false,
    waDailyLimit: 0,
    newLeadCap: 0,
    targets: {},
    senderChecked: false,
    mustChangePassword: false,
  };
}
