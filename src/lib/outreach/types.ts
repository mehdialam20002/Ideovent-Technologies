/**
 * Outreach: the admin's mini CRM for cold outreach (schools, coaching
 * institutes and, from 28 Sep 2026, dental clinics).
 *
 * These records live in their own Supabase tables (0007_outreach.sql), behind
 * admin-only RLS, and in LOCAL mode in localStorage under `ideovent_outreach_v1`.
 * They are never part of public.content, the CMS snapshot or the CMS Export:
 * a lead's phone and email are personal data about someone who has not asked
 * to be in anything.
 *
 * THE TEAM (0011_crm_team.sql, 1 Oct 2026). Who works a lead is a COLUMN
 * (assigned_to and friends), mirrored on the lead as assigneeId, assignedAt,
 * assignedById, createdById, qualifiedById and closedAt when the store reads
 * it. The mirrors are never written into the lead's data: the store strips
 * them before every write and the database strips them again. The people
 * themselves, and everything else about the team, are in ./team.ts; the rules
 * (who may see and change what) are in ./access.ts.
 */

import type { AskTopic, CallOutcome, MemberWordingKey } from "./team";
import type { TemplateStage } from "./templates";

export type LeadStatus =
  | "new"
  | "contacted"
  | "replied"
  | "demo_opened"
  | "call"
  | "proposal"
  | "won"
  | "lost"
  | "do_not_contact";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "replied",
  "demo_opened",
  "call",
  "proposal",
  "won",
  "lost",
  "do_not_contact",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  demo_opened: "Demo opened",
  call: "Call",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
  do_not_contact: "Do not contact",
};

/** "dental" added 28 Sep 2026: dental clinics are a lead kind of their own (templates d1 to d7). */
export type LeadKind = "school" | "coaching" | "dental" | "other";
export const LEAD_KIND_VALUES: LeadKind[] = ["school", "coaching", "dental", "other"];
/** Same words as the admin's KIND_LABEL (src/admin/outreach/ui.tsx). */
export const LEAD_KIND_LABELS: Record<LeadKind, string> = {
  school: "School",
  coaching: "Coaching",
  dental: "Dental clinic",
  other: "Other",
};
export type LeadPitch = "new_website" | "fix_website";
/** The value of `source` on a lead the Lead Finder added. */
export const LEAD_FINDER_SOURCE = "lead-finder";
export type LeadLanguage = "en" | "hinglish" | "hi";

export interface OutreachLead {
  id: string;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
  instituteName: string;
  kind: LeadKind;
  contactName?: string;
  /** Normalised to +91XXXXXXXXXX when it is an Indian number. */
  phone?: string;
  /** Normalised like phone. Empty means "use phone if it is a mobile". */
  whatsapp?: string;
  /** Lower-cased and trimmed. */
  email?: string;
  website?: string;
  city?: string;
  state?: string;
  /** Where the lead came from, e.g. GMAPS, SCHOOL_DIRECTORY, CSV import, lead-finder. */
  source?: string;
  /**
   * Google Maps place ID, set by the Lead Finder. Google's terms let a place ID
   * be kept indefinitely; its phone, address and rating are NOT copied here
   * (they are shown live in the finder), except a phone Mehdi saves by hand.
   */
  placeId?: string;
  /** What to offer: a new website (none or broken) or fixing theirs (poor). */
  pitch?: LeadPitch;
  status: LeadStatus;
  /** The demoSites record id and slug (public link /site/<slug>). */
  demoId?: string;
  demoSlug?: string;
  /** A pitch page slug (public link /<slug>). */
  pitchSlug?: string;
  /** One sentence about a real defect seen on their site, said in the message. */
  observation?: string;
  notes?: string;
  /** ISO timestamp of the next follow-up. */
  nextActionAt?: string;
  lastContactedAt?: string;
  /**
   * The OLD free-text "Assigned" label the bulk bar used to write ("Aman").
   * Since 0011 it is shown as "Old label" only: who works a lead is assigneeId.
   */
  assignedTo?: string;
  tags?: string[];
  language?: LeadLanguage;
  /** Why the lead was lost. Required when a member marks a lead Lost (the database refuses it without one). */
  lostReason?: string;

  /* ── Column mirrors (0011). Filled in on read; never stored in the lead's data. ── */
  /** crm_members id of the person who works the lead. null = Unassigned: the pool nobody has written to. */
  assigneeId?: string | null;
  /** The assignee's display name, when a reader filled it in. Never stored. */
  assigneeName?: string;
  /** When and by whom it was assigned: stamped by the database, never by a browser. */
  assignedAt?: string;
  assignedById?: string;
  /** Who added the lead. Never changes. */
  createdById?: string;
  /** The member credited with qualifying it (set by a hand-over). */
  qualifiedById?: string;
  /** When it closed (Won, Lost, Do not contact); empty while open. A member reads it for 14 days after. */
  closedAt?: string;
}

/**
 * "assign" and "handoff" lines are written by the database itself (0011): an
 * assignment change, and a hand-over to Mehdi. Nobody else may write them.
 */
export type OutreachEventType = "sent" | "replied" | "status" | "note" | "demo_opened" | "call" | "assign" | "handoff";
export type OutreachChannel = "email" | "whatsapp" | "call";

export interface OutreachEvent {
  id: string;
  leadId: string;
  /** ISO timestamp. Since 0011 the server's clock (a browser cannot backdate a touch). */
  at: string;
  type: OutreachEventType;
  channel?: OutreachChannel;
  templateId?: string;
  detail?: string;
  /** crm_members id of who wrote the line: stamped by the server, never by the browser. */
  actorId?: string;
  /** On a "sent" line: the template's stage, so the server counts first messages and refuses money stages. */
  stage?: TemplateStage;
  /** On a "call" line (phase 2): how the call went. */
  outcome?: CallOutcome;
  /** On an "Ask Mehdi" note: what was asked. */
  topic?: AskTopic;
}

export interface OutreachSettings {
  /**
   * RETIRED (28 Sep 2026): the "Gmail account for Open in Gmail" setting.
   * E-mail opens in the mail app only and nothing reads this; it is kept so
   * old saved settings still load and save.
   */
  senderGmail?: string;
  signature: string;
  /**
   * Where Open in Zoho Mail opens a new e-mail (2 Oct 2026): a Zoho Mail address, e.g.
   * https://mail.zoho.in (Zoho India, where contact@ideovent.in is). Blank means that one.
   * mailLinks.ts zohoMailOrigin reads it; anything not on Zoho Mail is refused.
   */
  zohoMailUrl?: string;
  /**
   * RETIRED. It was a forced cap of 10 a day, and every saved settings row
   * carries that 10, so it cannot mean "Mehdi chose 10". Nothing reads it any
   * more; `whatsappDailyLimit` replaced it (28 Sep 2026: "remove the WhatsApp
   * limit of 10, keep it unlimited"). Kept so old rows still load.
   */
  whatsappDailyCap?: number;
  /** Optional daily limit on first WhatsApp messages. Empty or 0: no limit (the default). */
  whatsappDailyLimit?: number;
  /** "HH:MM", 24-hour, India time. Sending inside the window only warns. */
  quietStart: string;
  quietEnd: string;
  alertOnDemoOpen: boolean;
  alertEmail?: string;
  /**
   * When a demo is made from a template or a poster, also add (or link) a
   * lead for it, so every demo can be tracked in the CRM. Missing means on.
   */
  autoAddDemos?: boolean;
  /**
   * Which "we" versions of the approved sentences Mehdi has approved for the
   * team (spec 10.7). The owner writes it; everyone reads it. A key that is
   * not true keeps the templates and script lines it covers HIDDEN for members.
   */
  memberWording?: Partial<Record<MemberWordingKey, boolean>>;
}

/** What a caller passes to upsertLead: id and timestamps are filled in when missing. */
export type LeadInput = Partial<OutreachLead> & { instituteName: string };

/** What a caller passes to addEvent: id and at are filled in when missing. */
export type EventInput = Omit<OutreachEvent, "id" | "at"> & { id?: string; at?: string };

export interface ImportResult {
  added: OutreachLead[];
  /** Rows that matched an existing lead by phone or email. */
  duplicates: { row: number; instituteName: string; existingId: string }[];
  /** Rows that could not become a lead (no name, placeholder row, no contact). */
  skipped: { row: number; reason: string }[];
}

export interface ImportOptions {
  /** "skip" (default) leaves the existing lead alone; "merge" fills its empty fields. */
  onDuplicate?: "skip" | "merge";
}
