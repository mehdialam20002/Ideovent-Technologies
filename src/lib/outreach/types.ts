/**
 * Outreach: the admin's mini CRM for cold outreach (schools and coaching).
 *
 * These records live in their own Supabase tables (0007_outreach.sql), behind
 * admin-only RLS, and in LOCAL mode in localStorage under `ideovent_outreach_v1`.
 * They are never part of public.content, the CMS snapshot or the CMS Export:
 * a lead's phone and email are personal data about someone who has not asked
 * to be in anything.
 */

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

export type LeadKind = "school" | "coaching" | "other";
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
  assignedTo?: string;
  tags?: string[];
  language?: LeadLanguage;
}

export type OutreachEventType = "sent" | "replied" | "status" | "note" | "demo_opened" | "call";
export type OutreachChannel = "email" | "whatsapp" | "call";

export interface OutreachEvent {
  id: string;
  leadId: string;
  /** ISO timestamp. */
  at: string;
  type: OutreachEventType;
  channel?: OutreachChannel;
  templateId?: string;
  detail?: string;
}

export interface OutreachSettings {
  /** The Google account Gmail compose opens in (authuser=). Empty = browser default. */
  senderGmail?: string;
  signature: string;
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
