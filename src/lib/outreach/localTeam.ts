/**
 * LOCAL MODE'S TEAM (spec 9.5). Local mode has no database, so the rules of
 * supabase/migrations/0011_crm_team.sql are emulated here, over the one JSON
 * object the local store keeps in localStorage (ideovent_outreach_v1). The
 * e2e suites act as a member, an admin or Mehdi and see what the database
 * would let them see, refused with the database's own messages. This cannot
 * prove the database rules (scripts/test-crm-rls.mjs does that); it keeps the
 * screens honest.
 *
 * THE DATA. LocalData gains `team`: members, notifications, requests, audit,
 * bookings, rules, reviews and the daily budget. A store with no team reads
 * as Mehdi alone (id m_owner). Who works a lead lives on the lead object, as
 * the columns do in the database (assigneeId, assignedAt, assignedById,
 * createdById, qualifiedById, closedAt). A lead WITHOUT createdById is from
 * before the team and reads as the migration made it (spec 6.5): Mehdi's when
 * it has a history line from before the team (no actorId) or a stage past
 * New, Unassigned otherwise. Those fields are written only when that reading
 * would say something else, so Mehdi's own data keeps its shape.
 *
 * THE ACTING PERSON is localStorage["ideovent_crm_local_actor"] (a member id;
 * missing or empty = Mehdi). Every operation runs as that person through the
 * same pure rules as the screens (./access.ts). An operation either completes
 * or changes nothing: the store writes once, after it returns.
 */
import type { DemoSite, DemoSiteOpen, DemoSiteSlot } from "@/lib/cms/types";
import {
  DAILY_LIMITS,
  LOG_DETAIL_MAX,
  NO_ADDING,
  NO_BOOKING_YET,
  NOTES_APPEND_MAX,
  accessSummaryRows,
  blank,
  canEditLead,
  canSeeLead,
  checkAssignee,
  computeActivityStats,
  CrmAccessError,
  duplicateOf,
  guardLeadUpdate,
  guardNewLead,
  guardPatch,
  heldBy,
  isOpenStatus,
  istDay,
  isStaff,
  jsonBytes,
  leadData,
  meFromMember,
  memberReads,
  overviewRows,
  phoneKey,
  planDistribution,
  planRulesDetailed,
  refuse,
  rlsRefusal,
  rulePeople,
  sameJson,
  sharePeople,
  stampEvent,
  teamNamesFor,
  type BudgetKind,
} from "./access";
import {
  LOCAL_OWNER_ID,
  noAccessMe,
  type AccessAction,
  type AccessDay,
  type AskTopic,
  type AssignmentRule,
  type AssignmentRuleInput,
  type CrmAuditLine,
  type CrmBooking,
  type CrmMe,
  type CrmMember,
  type CrmNotification,
  type CrmRequest,
  type CrmReview,
  type CrmTeamName,
  type DistributeMode,
  type DistributeRow,
  type DuplicateMatch,
  type HandoffInput,
  type LeadOverview,
  type MemberStats,
  type NotificationKind,
  type RequestOutcome,
  type SaveMemberInput,
} from "./team";
import type { EventInput, OutreachEvent, OutreachLead, OutreachSettings } from "./types";
/* Meta Lead Ads (0012, meta-leads-spec 6.5). Relative paths: the Node test harnesses resolve "@/" to .ts files only. */
import { LEAD_KIND_VALUES } from "./types";
import { META_LEAD_ID_PREFIX, META_LEAD_KEYS, META_MAX, META_SOURCES, platformLabel } from "../meta/fields";

/** Where a new Meta lead goes: the Unassigned pool (default), Mehdi, or the assignment rules (no match: the pool). */
export type MetaAssignMode = "pool" | "owner" | "rules";

/** What 0012's meta_lead_ingest answers; local mode answers in the same words. */
export interface MetaIngestResult {
  result: "created" | "duplicate" | "already" | "over_cap";
  /** The CRM lead: the new one, the one it duplicates, or the one made before (null when that was deleted). */
  leadId: string | null;
  /** Who works it (null: the Unassigned pool). */
  assignedTo: string | null;
  /** A duplicate past the day's limit of Meta touches on that lead: logged only, the lead left as it was. */
  quiet?: boolean;
}

/** At most this many Meta touches (and one bell) per existing lead per India day (meta-leads-spec decision 6). */
const META_TOUCHES_A_DAY = 3;

/* ── The data ────────────────────────────────────────────────────────────── */

export type LocalMember = CrmMember & { createdBy?: string; updatedAt?: string };
export type LocalNotification = CrmNotification & { memberId: string };

export interface LocalTeam {
  members: LocalMember[];
  notifications: LocalNotification[];
  requests: CrmRequest[];
  audit: CrmAuditLine[];
  bookings: CrmBooking[];
  rules: AssignmentRule[];
  reviews: CrmReview[];
  /** `${memberId}|${India day}|${kind}` to writes so far today (the daily budget). */
  usage: Record<string, number>;
  /** The next number for the identity columns (notifications, requests, audit...). */
  seq: number;
}

export interface LocalData {
  /** As stored: each lead's data, plus its column fields where they are set. */
  leads: OutreachLead[];
  events: OutreachEvent[];
  settings: OutreachSettings | null;
  team: LocalTeam;
}

/** The demo records local mode reads from the CMS snapshot (crm_lead_demos, crm_demo_opens, crm_publish_lead_demo). */
export interface LocalCms {
  demoSites: DemoSite[];
  demoSiteSlots: DemoSiteSlot[];
  demoSiteOpens: DemoSiteOpen[];
}

/** Read and write access to the CMS snapshot's demo collections. */
export interface LocalCmsAccess {
  read(): LocalCms;
  write(next: Pick<LocalCms, "demoSites" | "demoSiteSlots">): void;
}

/** A fixed date for the seeded owner row, so a store that never wrote its team reads the same every time. */
export const LOCAL_EPOCH = "2026-10-01T00:00:00.000Z";
/** The audit trail kept in the browser: the latest lines only. */
const AUDIT_KEEP = 5000;

/** Mehdi's row in a store that has none (spec 9.5). */
export function defaultOwner(): LocalMember {
  return {
    id: LOCAL_OWNER_ID,
    userId: "local:" + LOCAL_OWNER_ID,
    email: "owner@local.test",
    displayName: "Mehdi Alam",
    role: "owner",
    viewAll: true,
    canAddLeads: true,
    waDailyLimit: null,
    newLeadCap: 1000,
    mayColdCall: true,
    targets: {},
    senderName: "Mehdi Alam",
    senderPhone: "+917761921786",
    senderCheckedAt: LOCAL_EPOCH,
    active: true,
    mustChangePassword: false,
    joinedAt: LOCAL_EPOCH,
    createdAt: LOCAL_EPOCH,
  };
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** The stored team, or Mehdi alone; always with an owner row first. */
export function normalizeTeam(raw: unknown): LocalTeam {
  const t = (raw && typeof raw === "object" ? raw : {}) as Partial<LocalTeam>;
  const members = arr<LocalMember>(t.members).filter((m) => m && m.id);
  if (!members.some((m) => m.role === "owner")) members.unshift(defaultOwner());
  const team: LocalTeam = {
    members,
    notifications: arr(t.notifications),
    requests: arr(t.requests),
    audit: arr(t.audit),
    bookings: arr(t.bookings),
    rules: arr(t.rules),
    reviews: arr(t.reviews),
    usage: t.usage && typeof t.usage === "object" ? { ...t.usage } : {},
    seq: Number(t.seq) > 0 ? Number(t.seq) : 1,
  };
  const top = Math.max(0, ...[team.notifications, team.requests, team.audit, team.bookings, team.rules, team.reviews]
    .flat().map((x) => Number((x as { id?: number }).id) || 0));
  if (team.seq <= top) team.seq = top + 1;
  return team;
}

/** The column fields a lead object stores, in the order they are derived. */
const STORED_COLUMNS = ["createdById", "assigneeId", "assignedAt", "assignedById", "qualifiedById", "closedAt"] as const;

/**
 * The lead as the database would read it: the columns, where a lead from
 * before the team has none, as the migration set them (spec 6.5).
 */
export function effectiveLead(stored: OutreachLead, ownerId: string, historyBeforeTeam: boolean): OutreachLead {
  const out = { ...stored };
  delete out.assigneeName;
  if (!stored.createdById) {
    out.createdById = ownerId;
    if (stored.assigneeId === undefined) {
      out.assigneeId = (stored.status || "new") !== "new" || historyBeforeTeam ? ownerId : null;
    }
  } else if (stored.assigneeId === undefined) out.assigneeId = null;
  if (isOpenStatus(stored.status)) delete out.closedAt;
  else if (!stored.closedAt) out.closedAt = stored.updatedAt;
  return out;
}

/**
 * What to store for `next` (an effective lead): its data, plus only the column
 * fields effectiveLead would not derive by itself.
 */
export function storedLead(next: OutreachLead, prev: OutreachLead | undefined, ownerId: string, historyBeforeTeam: boolean): OutreachLead {
  const stored: Record<string, unknown> = leadData(next);
  const was = (prev || {}) as unknown as Record<string, unknown>;
  const want = next as unknown as Record<string, unknown>;
  for (const k of STORED_COLUMNS) if (was[k] !== undefined) stored[k] = was[k];
  for (const k of STORED_COLUMNS) {
    const derived = (effectiveLead(stored as unknown as OutreachLead, ownerId, historyBeforeTeam) as unknown as Record<string, unknown>)[k];
    if (sameJson(derived ?? null, want[k] ?? null)) continue;
    if (want[k] === undefined || (want[k] === null && k !== "assigneeId")) delete stored[k];
    else stored[k] = want[k];
  }
  return stored as unknown as OutreachLead;
}

const PERSONAL = ["phone", "whatsapp", "email", "contactName", "notes", "observation", "lostReason"];
const rid = () =>
  (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
  ).replace(/-/g, "");

/**
 * One operation, as one person, over one read of the local data. Methods
 * mirror the SQL functions of 0011 and mutate `d`; the store writes `d` back
 * once, only when the method returns.
 */
export class LocalCrm {
  readonly me: CrmMe;
  readonly owner: LocalMember;
  readonly actor: LocalMember | undefined;
  private readonly before: Set<string>;

  constructor(readonly d: LocalData, actorId: string | null | undefined, readonly now = new Date(), readonly cms?: LocalCmsAccess) {
    this.owner = d.team.members.find((m) => m.role === "owner") as LocalMember;
    this.before = new Set(d.events.filter((e) => !e.actorId).map((e) => e.leadId));
    const id = (actorId || "").trim();
    this.actor = id ? d.team.members.find((m) => m.id === id) : this.owner;
    this.me = this.actor ? meFromMember(this.actor, this.owner?.senderPhone) : noAccessMe("not_a_member");
  }

  private get iso(): string {
    return this.now.toISOString();
  }

  /* ── Lookups ───────────────────────────────────────────────────────────── */

  member(id: string | null | undefined): LocalMember | undefined {
    return id ? this.d.team.members.find((m) => m.id === id) : undefined;
  }

  /** private.crm_name: a display name, or the fallback. */
  nameOf = (id: string | null | undefined, fallback?: string): string | undefined => this.member(id)?.displayName ?? fallback;

  /** Every lead as the database reads it (columns filled in). */
  allLeads(): OutreachLead[] {
    return this.d.leads.map((l) => effectiveLead(l, this.owner.id, this.before.has(l.id)));
  }

  lead(id: string): OutreachLead | undefined {
    const l = this.d.leads.find((x) => x.id === id);
    return l ? effectiveLead(l, this.owner.id, this.before.has(l.id)) : undefined;
  }

  private get staff(): boolean {
    return isStaff(this.me);
  }

  private needRole(): void {
    if (!this.me.role) refuse("42501", "crm: you do not have access to the CRM");
  }

  /* ── Writes every operation shares ─────────────────────────────────────── */

  private nextId(): number {
    return this.d.team.seq++;
  }

  /** Stores an effective lead (insert or replace), with only the column fields it needs. */
  private save(next: OutreachLead): void {
    const i = this.d.leads.findIndex((l) => l.id === next.id);
    const stored = storedLead(next, i >= 0 ? this.d.leads[i] : undefined, this.owner.id, this.before.has(next.id));
    if (i >= 0) this.d.leads[i] = stored;
    else this.d.leads.push(stored);
  }

  audit(action: string, f: { leadId?: string | null; memberId?: string | null; detail?: Record<string, unknown> } = {}): void {
    const a = this.d.team.audit;
    a.push({ id: this.nextId(), at: this.iso, actorId: this.me.memberId, action, leadId: f.leadId ?? null, memberId: f.memberId ?? null, detail: f.detail || {} });
    if (a.length > AUDIT_KEEP) a.splice(0, a.length - AUDIT_KEEP);
  }

  private notify(memberId: string | null | undefined, kind: NotificationKind, title: string, leadId?: string | null): void {
    if (!memberId) return;
    this.d.team.notifications.push({
      id: this.nextId(), memberId, kind, title: title.slice(0, 300), leadId: leadId || undefined,
      actorId: this.me.memberId || undefined, createdAt: this.iso,
    });
  }

  /** private.crm_spend: one more write today; past the day's limit, 54000. Mehdi has no budget. */
  spend(kind: BudgetKind, n = 1): void {
    if (!this.me.memberId || this.me.role === "owner") return;
    const key = `${this.me.memberId}|${istDay(this.now)}|${kind}`;
    const used = (this.d.team.usage[key] || 0) + Math.max(n, 1);
    const limit = DAILY_LIMITS[kind];
    if (used > limit) {
      refuse("54000", `crm: that is more than one person may do in a day (${limit} a day). It starts again at midnight India time; if this is real work, ask Mehdi.`);
    }
    this.d.team.usage[key] = used;
  }

  /** A history line the database writes itself (no guard: a SECURITY DEFINER function or trigger). */
  private line(leadId: string, prefix: string, data: Partial<OutreachEvent>): OutreachEvent {
    const id = `${prefix}${rid()}`;
    const e = { ...data, id, leadId, at: this.iso, type: data.type || "note" } as OutreachEvent;
    if (this.me.memberId) e.actorId = this.me.memberId;
    this.d.events.push(e);
    return e;
  }

  /** crm_leads_after's audit line for one lead (contact values never copied in). */
  private auditLead(before: OutreachLead | undefined, after: OutreachLead | undefined): void {
    if (!before && after) {
      this.audit("lead.insert", { leadId: after.id, detail: { instituteName: after.instituteName, source: after.source ?? null, assigned_to: after.assigneeId ?? null } });
      return;
    }
    if (before && !after) {
      this.audit("lead.delete", { leadId: before.id, detail: { instituteName: before.instituteName, status: before.status ?? null, assigned_to: before.assigneeId ?? null } });
      return;
    }
    if (!before || !after) return;
    const o = leadData(before);
    const n = leadData(after);
    let changes: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) {
      if (k === "updatedAt" || k === "id" || sameJson(o[k], n[k])) continue;
      changes[k] = PERSONAL.includes(k) ? "(changed)" : [o[k] ?? null, n[k] ?? null];
    }
    const moved = (before.assigneeId ?? null) !== (after.assigneeId ?? null);
    if (moved) changes.assigned_to = [before.assigneeId ?? null, after.assigneeId ?? null];
    if ((before.qualifiedById ?? null) !== (after.qualifiedById ?? null)) changes.qualified_by = [before.qualifiedById ?? null, after.qualifiedById ?? null];
    if (!Object.keys(changes).length) return;
    if (JSON.stringify(changes).length > 4000) changes = { keys: Object.keys(changes), note: "values too long to log" };
    this.audit(moved ? "lead.assign" : "lead.update", { leadId: after.id, detail: changes });
  }

  /**
   * After a lead changed (crm_leads_after): the audit line; the "Assigned to"
   * history line unless quiet; and on a newly linked demo, Mehdi's open demo
   * requests close and whoever works the lead is told.
   */
  private changed(before: OutreachLead | undefined, after: OutreachLead, quiet = false): void {
    this.save(after);
    this.auditLead(before, after);
    if (!before) return;
    const from = before.assigneeId ?? null;
    const to = after.assigneeId ?? null;
    if (from !== to && !quiet) {
      const by = this.nameOf(this.me.memberId, "the system");
      const was = this.nameOf(from, "Unassigned");
      this.line(after.id, "oe_as_", {
        type: "assign",
        detail: to ? `Assigned to ${this.nameOf(to, "Unassigned")} (was ${was}) by ${by}` : `Unassigned (was ${was}) by ${by}`,
      });
    }
    if (!sameJson(before.demoId, after.demoId) && !blank(after.demoId)) {
      for (const r of this.d.team.requests) {
        if (r.leadId === after.id && r.kind === "demo" && !r.resolvedAt) Object.assign(r, { resolvedAt: this.iso, resolvedBy: this.me.memberId || undefined, outcome: "done" });
      }
      if (to && to !== this.me.memberId && isOpenStatus(after.status)) {
        this.notify(to, "demo_ready", `Demo ready for ${after.instituteName}: turn the link on and send it`, after.id);
      }
    }
  }

  /**
   * A trusted change of who works a lead (a team function, not the API): the
   * assignment stamps follow, the closing date stays right.
   */
  private setAssignee(id: string, to: string | null, quiet = false, extra: Partial<OutreachLead> = {}): void {
    const before = this.lead(id);
    if (!before) return;
    const after: OutreachLead = { ...before, ...extra, assigneeId: to };
    if ((before.assigneeId ?? null) !== to) {
      after.assignedAt = to ? this.iso : undefined;
      after.assignedById = to ? this.me.memberId || undefined : undefined;
    }
    if (isOpenStatus(after.status)) delete after.closedAt;
    else if (isOpenStatus(before.status)) after.closedAt = this.iso;
    this.changed(before, after, quiet);
  }

  /* ── Leads and their history (RLS, the field guard, the history guard) ── */

  /** The leads the caller may read in full, newest change first. */
  listLeads(): OutreachLead[] {
    return this.allLeads()
      .filter((l) => canSeeLead(this.me, l, this.now))
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }

  getLead(id: string): OutreachLead | null {
    const l = this.lead(id);
    return l && canSeeLead(this.me, l, this.now) ? l : null;
  }

  private newCount(): number {
    return this.me.memberId ? heldBy(this.allLeads(), this.me.memberId).newLeads : 0;
  }

  /** An INSERT (createLead): the guard's insert path, then the insert policy. `prepared` is prepareLead's output. */
  createLead(prepared: OutreachLead): OutreachLead {
    this.needRole();
    // As the field guard: "Can add leads" is asked before anything else.
    if (this.me.role === "member" && !this.me.canAddLeads) refuse("42501", NO_ADDING);
    if (this.d.leads.some((l) => l.id === prepared.id)) {
      refuse("23505", 'duplicate key value violates unique constraint "outreach_leads_pkey"');
    }
    if (this.me.role === "member") this.spend("lead_add");
    const lead = guardNewLead(this.me, prepared, this.allLeads(), this.newCount(), this.now, this.nameOf);
    this.changed(undefined, lead);
    return this.lead(lead.id) as OutreachLead;
  }

  /**
   * The old whole-lead upsert (owner flows: Lead Finder, demo auto-lead,
   * clean-ups, import), as the database takes it: an insert for a new id; for
   * an existing one, the insert's checks on the proposed row and then the
   * update guard on the merged data. A member's upsert of an existing lead is
   * refused, as in the database: members use patchLead.
   */
  upsert(prepared: OutreachLead): OutreachLead {
    this.needRole();
    const before = this.lead(prepared.id);
    if (!before) return this.createLead(prepared);
    let proposed = leadData(prepared);
    if (this.me.role === "member") {
      this.spend("lead_add");
      const others = this.allLeads().filter((l) => l.id !== prepared.id);
      const asInsert = guardNewLead(this.me, prepared, others, this.newCount(), this.now, this.nameOf);
      proposed = leadData(asInsert);
    }
    if (!canEditLead(this.me, before, this.now)) rlsRefusal("outreach_leads");
    if (this.me.role === "member") this.spend("lead_change");
    const after = guardLeadUpdate(this.me, before, proposed, this.now, this.allLeads());
    this.changed(before, after);
    return this.lead(after.id) as OutreachLead;
  }

  /** crm_patch_lead: a server-side merge; undefined (or null) removes a key. */
  patchLead(id: string, patch: Partial<OutreachLead>): OutreachLead {
    const before = this.lead(id);
    if (!before || !canEditLead(this.me, before, this.now)) refuse("P0002", "crm: this lead is not yours, or it was deleted");
    if (this.me.role === "member") this.spend("lead_change");
    const after = guardPatch(this.me, before, patch, this.now, this.allLeads());
    this.changed(before, after);
    return this.lead(id) as OutreachLead;
  }

  /** crm_append_notes: one more line on the notes, from the lead as it is now. */
  appendNotes(id: string, text: string): OutreachLead {
    const add = String(text ?? "").trim().slice(0, NOTES_APPEND_MAX);
    if (!add) refuse("22023", "crm: write something to add");
    const before = this.lead(id);
    if (!before || !canEditLead(this.me, before, this.now)) refuse("P0002", "crm: this lead is not yours, or it was deleted");
    const notes = blank(before.notes) ? add : `${before.notes}\n${add}`;
    return this.patchLead(id, { notes });
  }

  /** Only Mehdi deletes leads; the history, requests, bookings and reviews go with it. */
  deleteLead(id: string): void {
    const before = this.lead(id);
    if (this.me.role !== "owner") throw new CrmAccessError("42501", "Only Mehdi deletes leads");
    if (!before) return;
    this.d.leads = this.d.leads.filter((l) => l.id !== id);
    const gone = new Set(this.d.events.filter((e) => e.leadId === id).map((e) => e.id));
    this.d.events = this.d.events.filter((e) => e.leadId !== id);
    const t = this.d.team;
    t.requests = t.requests.filter((r) => r.leadId !== id);
    t.bookings = t.bookings.filter((b) => b.leadId !== id);
    t.reviews = t.reviews.filter((r) => r.leadId !== id && !gone.has(r.eventId));
    this.auditLead(before, undefined);
  }

  /** History the caller may read: every line for Mehdi and admins; a member's own leads' (same window). */
  listEvents(leadId?: string): OutreachEvent[] {
    if (!this.me.role) return [];
    const readable = this.staff ? null : new Set(this.allLeads().filter((l) => canSeeLead(this.me, l, this.now)).map((l) => l.id));
    return this.d.events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => (!leadId || e.leadId === leadId) && (!readable || readable.has(e.leadId)))
      .sort((a, b) => (b.e.at || "").localeCompare(a.e.at || "") || b.i - a.i)
      .map(({ e }) => e);
  }

  /**
   * A history line through the API: the history guard (writer and time are
   * the server's), the insert policy, the daily budget, and the claim on first
   * touch: Mehdi's or an admin's send, call, reply or stage change on an
   * Unassigned lead makes it theirs, quietly.
   */
  addEvent(ev: EventInput & { id: string }): OutreachEvent {
    if (this.d.events.some((e) => e.id === ev.id)) {
      refuse("23505", 'duplicate key value violates unique constraint "outreach_events_pkey"');
    }
    const lead = this.lead(ev.leadId);
    const stamped = stampEvent(this.me, { ...ev, at: ev.at || this.iso } as OutreachEvent, lead, this.now);
    if (!lead) {
      throw new CrmAccessError("23503", 'insert or update on table "outreach_events" violates foreign key constraint "outreach_events_lead_fk"');
    }
    if (this.me.role !== "owner") this.spend("event");
    this.d.events.push(stamped);
    if (["sent", "call", "replied", "status"].includes(stamped.type) && this.staff && this.me.memberId && !lead.assigneeId) {
      this.setAssignee(lead.id, this.me.memberId, true);
    }
    return stamped;
  }

  /**
   * crm_find_duplicate: the lead holding this phone (as phone or WhatsApp) or
   * e-mail across the whole team, whose it is, and whether the caller may
   * open it. The lead itself comes along only when they may.
   */
  findDuplicate(q: { phone?: string; email?: string; excludeId?: string }): DuplicateMatch | null {
    if (!this.me.role) return null;
    this.spend("lookup");
    const hit = duplicateOf(this.allLeads(), { phone: q.phone, whatsapp: q.phone, email: q.email, excludeId: q.excludeId }, this.nameOf);
    if (!hit) return null;
    const visible = this.staff || memberReads(this.me.memberId, hit.lead, this.now);
    const base: OutreachLead = visible
      ? hit.lead
      : { id: hit.lead.id, instituteName: hit.lead.instituteName, kind: "other", status: "new", createdAt: "", updatedAt: "" };
    return { ...base, leadId: hit.lead.id, instituteName: hit.lead.instituteName, assigneeName: hit.assigneeName, visible };
  }

  /** Settings: everyone in the team reads them; only Mehdi writes them (the insert policy otherwise). */
  checkSettingsWrite(): void {
    this.needRole();
    if (this.me.role !== "owner") rlsRefusal("outreach_settings");
  }

  /* ── Assigning, sharing out, rules (owner and admins) ─────────────────── */

  private needStaff(message: string): void {
    if (!this.staff) refuse("42501", message);
  }

  private held(memberId: string, except?: ReadonlySet<string>) {
    return heldBy(this.allLeads(), memberId, except);
  }

  /** crm_assign_leads: to a person, or (null) back to the Unassigned list. Returns how many moved. */
  assignLeads(ids: string[], memberId: string | null): number {
    this.needStaff("crm: only Mehdi or an admin can assign leads");
    const list = [...new Set(ids || [])];
    if (!list.length) return 0;
    if (list.length > 1000) refuse("22023", "crm: assign at most 1,000 leads at a time");
    const target = memberId || null;
    const moving = list.map((id) => this.lead(id)).filter((l): l is OutreachLead => Boolean(l) && (l.assigneeId ?? null) !== target);
    if (target) {
      checkAssignee(this.member(target), this.held(target), {
        newLeads: moving.filter((l) => (l.status || "new") === "new").length,
        openLeads: moving.filter((l) => isOpenStatus(l.status)).length,
        mehdis: moving.filter((l) => l.status === "call" || l.status === "proposal").length,
      });
    }
    const me = this.me.memberId;
    const byPrev = new Map<string, number>();
    for (const l of moving) if (l.assigneeId && l.assigneeId !== me) byPrev.set(l.assigneeId, (byPrev.get(l.assigneeId) || 0) + 1);
    const actor = this.nameOf(me, "Mehdi");
    for (const [prev, n] of byPrev) {
      this.notify(prev, "moved_away", `${actor} moved ${n} of your leads to ${target ? this.nameOf(target, "Unassigned") : "the Unassigned list"}`);
    }
    for (const l of moving) this.setAssignee(l.id, target);
    if (moving.length && target && target !== me) {
      const one = moving.length === 1 ? moving[0] : undefined;
      this.notify(target, "assigned", one ? `${actor} assigned you ${one.instituteName}` : `${actor} assigned you ${moving.length} leads`, one?.id);
    }
    return moving.length;
  }

  /** crm_distribute: share leads between people (balanced or round-robin), within their caps. */
  distributeLeads(ids: string[], memberIds: string[], mode: DistributeMode, includeContacted = false): DistributeRow[] {
    this.needStaff("crm: only Mehdi or an admin can share out leads");
    if (mode !== "balanced" && mode !== "round_robin") refuse("22023", 'crm: share out "balanced" or "round_robin"');
    if (!memberIds || !memberIds.length) refuse("22023", "crm: pick at least one person");
    if ((ids || []).length > 1000) refuse("22023", "crm: share out at most 1,000 leads at a time");
    const all = this.allLeads();
    const people = sharePeople(all, this.d.team.members, memberIds, ids);
    if (!people.length || people.length !== new Set(memberIds).size) refuse("22023", "crm: everyone picked must be an active team member");
    const wanted = new Set(ids);
    const { plan } = planDistribution(all.filter((l) => wanted.has(l.id)), people, mode, includeContacted);
    const got = new Map(people.map((p) => [p.id, 0]));
    let left = 0;
    for (const [leadId, to] of plan) {
      if (!to) {
        left++;
        continue;
      }
      if ((this.lead(leadId)?.assigneeId ?? null) !== to) this.setAssignee(leadId, to);
      got.set(to, (got.get(to) || 0) + 1);
    }
    const actor = this.nameOf(this.me.memberId, "Mehdi");
    for (const [id, n] of got) if (n > 0 && id !== this.me.memberId) this.notify(id, "assigned", `${actor} assigned you ${n} leads`);
    const rows: DistributeRow[] = people.map((p) => ({ memberId: p.id, assigned: got.get(p.id) || 0 }));
    if (left > 0) rows.push({ memberId: null, assigned: left });
    return rows;
  }

  /** crm_apply_rules: the rules (by kind and city, round-robin inside each) on these Unassigned leads. */
  applyRules(ids: string[], includeContacted = false): DistributeRow[] {
    this.needStaff("crm: only Mehdi or an admin can apply the rules");
    const all = this.allLeads();
    const wanted = new Set(ids || []);
    const { plan, nextIndex } = planRulesDetailed(all.filter((l) => wanted.has(l.id)), this.d.team.rules, rulePeople(all, this.d.team.members), includeContacted);
    for (const r of this.d.team.rules) if (nextIndex.has(r.id)) r.nextIndex = nextIndex.get(r.id) as number;
    const got = new Map<string, number>();
    for (const [leadId, to] of plan) {
      this.setAssignee(leadId, to);
      got.set(to, (got.get(to) || 0) + 1);
    }
    const actor = this.nameOf(this.me.memberId, "Mehdi");
    for (const [id, n] of got) if (id !== this.me.memberId) this.notify(id, "assigned", `${actor} assigned you ${n} leads`);
    return [...got].map(([memberId, assigned]) => ({ memberId, assigned }));
  }

  /* ── Hand-over, Ask Mehdi, requests ───────────────────────────────────── */

  /** "Mon 05 Oct, 03:00 PM", India time (to_char 'Dy DD Mon, HH12:MI AM'). */
  private when(at: Date): string {
    const ist = new Date(at.getTime() + 5.5 * 3600e3);
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][ist.getUTCDay()];
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][ist.getUTCMonth()];
    const h = ist.getUTCHours();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${day} ${pad(ist.getUTCDate())} ${mon}, ${pad(h % 12 || 12)}:${pad(ist.getUTCMinutes())} ${h < 12 ? "AM" : "PM"}`;
  }

  /** crm_handoff: the lead passes to Mehdi (or an admin), with a note; with a slot, the call is booked. */
  handoff(input: HandoffInput): number | null {
    this.needRole();
    const me = this.me.memberId;
    const l = this.lead(input.leadId);
    if (!l || !(this.staff || l.assigneeId === me)) refuse("42501", "crm: this lead is not yours");
    if (["proposal", "won", "lost", "do_not_contact"].includes(l.status || "new")) refuse("22023", "crm: a lead at this stage is not handed over");
    const host = input.hostId || this.owner.id;
    const h = this.member(host);
    if (!h || !h.active || (h.role !== "owner" && h.role !== "admin")) refuse("22023", "crm: leads are handed to Mehdi or an admin");
    // A member booking Mehdi's time is phase 2: they hand over without a time.
    if (input.slotAt && this.me.role === "member") refuse("42501", NO_BOOKING_YET);
    this.spend("event");
    const qualified = input.qualified !== false;
    const note = (input.note || "").trim().slice(0, 500) || undefined;
    let bookingId: number | null = null;
    let when = "";
    if (input.slotAt) {
      const at = new Date(input.slotAt);
      const ist = new Date(at.getTime() + 5.5 * 3600e3);
      const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
      if (Number.isNaN(at.getTime()) || at.getTime() < this.now.getTime() + 30 * 60e3 || at.getTime() > this.now.getTime() + 30 * 864e5
          || ist.getUTCDay() === 0 || mins < 600 || mins > 1245 || ist.getUTCMinutes() % 15 !== 0 || ist.getUTCSeconds() !== 0 || ist.getUTCMilliseconds() !== 0) {
        refuse("22023", "crm: pick a time on the quarter hour, 10:00 to 20:45 India time, Monday to Saturday, in the next 30 days");
      }
      if (this.d.team.bookings.some((b) => b.hostId === host && b.status === "booked" && Date.parse(b.slotAt) === at.getTime())) {
        refuse("23505", "crm: that time was just taken. Pick another.");
      }
      bookingId = this.nextId();
      this.d.team.bookings.push({ id: bookingId, leadId: l.id, hostId: host, bookedBy: me || undefined, slotAt: at.toISOString(), minutes: 15, status: "booked", note, createdAt: this.iso, updatedAt: this.iso });
      when = this.when(at);
    }
    const data: Partial<OutreachLead> = input.slotAt
      ? { status: "call", nextActionAt: new Date(input.slotAt).toISOString(), updatedAt: this.iso }
      : { nextActionAt: this.iso, updatedAt: this.iso };
    const credit = this.me.role === "member" && qualified ? me : l.qualifiedById;
    this.setAssignee(l.id, host, true, { ...data, qualifiedById: credit || undefined });
    const hostName = this.nameOf(host, "Mehdi");
    const meName = this.nameOf(me, "Mehdi");
    const detail = input.slotAt
      ? `Call booked with ${hostName} for ${when} (India time). Handed over by ${meName}.`
      : qualified ? `Handed over to ${hostName} by ${meName}.` : `Given back to ${hostName} by ${meName}.`;
    this.line(l.id, "oe_ho_", { type: "handoff", detail: detail + (note ? ` Note: ${note}` : "") });
    if (host !== me) {
      this.d.team.requests.push({ id: this.nextId(), leadId: l.id, kind: qualified ? "handoff" : "give_back", askedBy: me || undefined, hostId: host, body: note, createdAt: this.iso });
      const who = this.nameOf(me, "Someone");
      const title = input.slotAt
        ? `${who} booked a call with ${l.instituteName} for ${when}`
        : qualified ? `${who} handed over ${l.instituteName}` : `${who} gave back ${l.instituteName}`;
      this.notify(host, "handoff", title + (note ? `: ${note}` : ""), l.id);
    }
    return bookingId;
  }

  /** crm_ask_owner: a demo request, a correction or a question on a lead: a history line, a request, Mehdi's bell. */
  askOwner(leadId: string, topic: AskTopic, text: string): void {
    this.needRole();
    const me = this.me.memberId;
    const l = this.lead(leadId);
    if (!l || !(this.staff || memberReads(me, l, this.now))) refuse("42501", "crm: this lead is not yours");
    this.spend("event");
    const label = ({ demo: "Demo request", correction: "Correction", question: "Question" } as Record<string, string>)[topic];
    const body = (text || "").trim().slice(0, 500);
    if (!label || !body) refuse("22023", "crm: say what you need (a demo, a correction or a question)");
    const host = this.owner.id;
    this.line(l.id, "oe_ask_", { type: "note", topic, detail: `${label} for ${this.nameOf(host, "Mehdi")}: ${body}` });
    if (host && host !== me) {
      this.d.team.requests.push({ id: this.nextId(), leadId: l.id, kind: topic, askedBy: me || undefined, hostId: host, body, createdAt: this.iso });
      this.notify(host, "info", `${this.nameOf(me, "Someone")}, ${label.toLowerCase()} on ${l.instituteName}: ${body}`, l.id);
    }
  }

  /** Requests: all for Mehdi and admins, a member's own. Open ones oldest first; otherwise newest first. */
  listRequests(opts: { open?: boolean } = {}): CrmRequest[] {
    if (!this.me.role) return [];
    const rows = this.d.team.requests.filter((r) => (this.staff || r.askedBy === this.me.memberId) && (!opts.open || !r.resolvedAt));
    return rows.slice().sort((a, b) => (opts.open ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)) || (opts.open ? a.id - b.id : b.id - a.id));
  }

  /** crm_resolve_request: Mehdi (or the admin it went to) closes a request; the asker is told. */
  resolveRequest(id: number, outcome: RequestOutcome, note?: string): void {
    const r = this.d.team.requests.find((x) => x.id === id);
    const me = this.me.memberId;
    if (!r || !this.me.role || !(this.me.role === "owner" || (this.me.role === "admin" && r.hostId === me))) {
      refuse("42501", "crm: only Mehdi, or the admin it went to, closes a request");
    }
    if (r.resolvedAt) return;
    const handover = r.kind === "handoff" || r.kind === "give_back";
    if (!["done", "accepted", "not_real", "no_action"].includes(outcome || "")
        || (handover && !["accepted", "not_real", "done"].includes(outcome))
        || (!handover && !["done", "no_action"].includes(outcome))) {
      refuse("22023", 'crm: a hand-over is "accepted" or "not_real"; a question is "done" or "no_action"');
    }
    const text = (note || "").trim();
    Object.assign(r, { resolvedAt: this.iso, resolvedBy: me || undefined, outcome, outcomeNote: text.slice(0, 500) || undefined });
    if (r.askedBy && r.askedBy !== me) {
      const word = ({ accepted: "accepted", not_real: "did not take", no_action: "closed" } as Record<string, string>)[outcome] || "did";
      const what = ({ demo: "demo request", correction: "correction", question: "question", give_back: "give-back" } as Record<string, string>)[r.kind] || "hand-over";
      const name = this.lead(r.leadId)?.instituteName ?? "";
      this.notify(r.askedBy, "resolved", `${this.nameOf(me, "Mehdi")} ${word} your ${what} on ${name}${text ? ": " + text.slice(0, 200) : ""}`, r.leadId);
    }
  }

  /* ── Demos (crm_lead_demos, crm_demo_opens, crm_publish_lead_demo) ────── */

  private workable(): OutreachLead[] {
    if (!this.me.role) return [];
    return this.allLeads().filter((l) => this.staff || memberReads(this.me.memberId, l, this.now));
  }

  /** The demo records linked to the leads the caller may work, drafts included. */
  leadDemos(): DemoSite[] {
    const mine = this.workable().filter((l) => l.demoId || l.demoSlug);
    if (!mine.length || !this.cms) return [];
    const ids = new Set(mine.map((l) => l.demoId).filter(Boolean));
    const slugs = new Set(mine.map((l) => l.demoSlug).filter(Boolean));
    return this.cms.read().demoSites.filter((d) => ids.has(d.id) || slugs.has(d.slug));
  }

  /** Opens of those demos only (the CMS keeps raw opens for Mehdi). */
  demoOpens(sinceIso?: string): DemoSiteOpen[] {
    if (!this.cms) return [];
    const since = sinceIso ? Date.parse(sinceIso) : this.now.getTime() - 180 * 864e5;
    const ids = new Set(this.leadDemos().map((d) => d.id));
    return this.cms.read().demoSiteOpens.filter((o) => ids.has(o.demoId) && Date.parse(o.updatedAt || o.at) >= since);
  }

  /** crm_publish_lead_demo: turns the linked demo's public link on (draft to sent), as markDemoSent does; never a closed demo or a Free slot. */
  publishLeadDemo(leadId: string, sentTo?: string): string {
    this.needRole();
    const l = this.lead(leadId);
    if (!l || !(this.staff || l.assigneeId === this.me.memberId)) refuse("42501", "crm: this lead is not yours");
    if (l.status === "do_not_contact") refuse("42501", "crm: this lead asked not to be contacted");
    if (this.me.role === "member" && !isOpenStatus(l.status)) refuse("42501", "crm: this lead is closed. Ask Mehdi before sending anything.");
    const cms = this.cms?.read();
    const demo = cms?.demoSites.find((d) => d.id === l.demoId || (!l.demoId && d.slug === l.demoSlug));
    if (!cms || !demo) refuse("P0002", "crm: this lead has no demo yet. Ask Mehdi for one.");
    const status = demo.status || "draft";
    if (status === "closed") refuse("42501", "crm: Mehdi closed this demo. Ask him before sending it.");
    if (status === "free") refuse("42501", "crm: this demo is a Free slot, an empty page. Ask Mehdi to build it first.");
    if (status !== "sent") {
      const to = ((sentTo || "").trim() || l.contactName || l.instituteName || "").slice(0, 200);
      const sites = cms.demoSites.map((d) => (d.id === demo.id ? { ...d, status: "sent" as const, updatedAt: this.iso } : d));
      const slots = cms.demoSiteSlots.slice();
      const i = slots.findIndex((s) => s.id === demo.id);
      const slot = { ...(i >= 0 ? slots[i] : { id: demo.id }), id: demo.id, sentTo: to, sentAt: this.iso } as DemoSiteSlot;
      if (i >= 0) slots[i] = slot;
      else slots.push(slot);
      this.cms?.write({ demoSites: sites as DemoSite[], demoSiteSlots: slots });
      this.line(l.id, "oe_dm_", { type: "note", detail: `Demo /site/${demo.slug} marked sent` });
    }
    return demo.slug;
  }

  /* ── Numbers and lists ─────────────────────────────────────────────────── */

  leadsOverview(): LeadOverview[] {
    return overviewRows(this.me, this.allLeads(), this.nameOf);
  }

  /**
   * With no end, "until now" (the SQL's default p_to = now()). A transaction's
   * now() is always later than an earlier insert; one millisecond past `now`
   * keeps a line written in the same millisecond in.
   */
  private until(toIso?: string): Date {
    return toIso ? new Date(toIso) : new Date(this.now.getTime() + 1);
  }

  activityStats(fromIso: string, toIso?: string): MemberStats[] {
    return computeActivityStats({
      me: this.me, members: this.d.team.members, leads: this.allLeads(), events: this.d.events,
      requests: this.d.team.requests, from: new Date(fromIso), to: this.until(toIso), now: this.now,
    });
  }

  teamNames(): CrmTeamName[] {
    return teamNamesFor(this.me, this.d.team.members, this.allLeads(), this.d.events);
  }

  /** The owner's Access tab. Anyone else gets nothing, as from the database. */
  accessSummary(fromIso: string, toIso?: string): AccessDay[] {
    if (this.me.role !== "owner") return [];
    return accessSummaryRows(this.d.team.audit, this.d.events, this.d.team.members, new Date(fromIso), this.until(toIso));
  }

  /** The raw audit trail (the owner only), newest first, for the Access tab's day view. */
  listAudit(fromIso?: string, toIso?: string, memberId?: string): CrmAuditLine[] {
    if (this.me.role !== "owner") return [];
    const t0 = fromIso ? Date.parse(fromIso) : -Infinity;
    const t1 = toIso ? Date.parse(toIso) : Infinity;
    return this.d.team.audit
      .filter((a) => Date.parse(a.at) >= t0 && Date.parse(a.at) < t1 && (!memberId || a.actorId === memberId))
      .slice()
      .reverse();
  }

  /* ── The team (crm_members and the owner's functions) ──────────────────── */

  private publicMember(m: LocalMember): CrmMember {
    const { createdBy: _c, updatedAt: _u, ...rest } = m;
    return { ...rest };
  }

  /** Owner and admins: everyone. Anyone else: their own row (a switched-off person learns why). */
  listMembers(): CrmMember[] {
    const rows = this.staff ? this.d.team.members : this.d.team.members.filter((m) => m.id === this.actor?.id);
    return rows
      .map((m) => this.publicMember(m))
      .sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner") || Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName));
  }

  private needOwner(message = "crm: only Mehdi manages the team"): void {
    if (this.me.role !== "owner") refuse("42501", message);
  }

  private changeMember(m: LocalMember, patch: Partial<LocalMember>, action?: string): void {
    const before = { ...m };
    Object.assign(m, patch, { updatedAt: this.iso });
    if (before.active && !m.active) m.deactivatedAt = m.deactivatedAt || this.iso;
    if (!before.active && m.active) delete m.deactivatedAt;
    const changes: Record<string, unknown> = {};
    const was = before as unknown as Record<string, unknown>;
    const now = m as unknown as Record<string, unknown>;
    for (const k of new Set([...Object.keys(was), ...Object.keys(now)])) {
      if (k === "updatedAt" || k === "lastSeenAt") continue;
      if (!sameJson(was[k] ?? null, now[k] ?? null)) changes[k] = [was[k] ?? null, now[k] ?? null];
    }
    if (!Object.keys(changes).length) return;
    if (before.active && !m.active) {
      // crm_members_after: open leads still held move: New ones to the pool, conversations to Mehdi.
      for (const l of this.allLeads()) {
        if (l.assigneeId === m.id && isOpenStatus(l.status)) this.setAssignee(l.id, (l.status || "new") === "new" ? null : this.owner.id);
      }
    }
    const kind = action || (!before.userId && m.userId ? "member.link" : before.active && !m.active ? "member.deactivate"
      : !before.active && m.active ? "member.reactivate" : "member.update");
    this.audit(kind, { memberId: m.id, detail: changes });
  }

  private checkMemberRow(m: Partial<LocalMember>): void {
    const bad = (c: string) => refuse("23514", `new row for relation "crm_members" violates check constraint "crm_members_${c}_check"`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email || "")) bad("email");
    const name = (m.displayName || "").trim();
    if (name.length < 1 || name.length > 80) bad("display_name");
    if (m.waDailyLimit !== null && m.waDailyLimit !== undefined && (m.waDailyLimit < 0 || m.waDailyLimit > 500)) bad("wa_daily_limit");
    if (!(m.newLeadCap >= 1 && m.newLeadCap <= 1000)) bad("new_lead_cap");
    if ((m.senderName || "").length > 80) bad("sender_name");
    if ((m.senderPhone || "").length > 20) bad("sender_phone");
    if ((m.signature || "").length > 500) bad("signature");
  }

  /** crm_save_member: add (no id) or change one person. A field left undefined (or null) keeps its value. */
  saveMember(input: SaveMemberInput): string {
    this.needOwner();
    const t = (v?: string | null) => (v === undefined || v === null ? undefined : v.trim());
    const role = input.role;
    if (role !== undefined && role !== null && role !== "admin" && role !== "member") {
      refuse("22023", "crm: a person is an admin or a member (the owner is set in public.admins)");
    }
    const email = t(input.email)?.toLowerCase();
    const phone = t(input.senderPhone);
    const ownerEmail = this.owner.email.toLowerCase();
    if (!input.id) {
      if (!email || !t(input.displayName)) refuse("22023", "crm: a new person needs an e-mail and a name");
      if (email === ownerEmail) refuse("22023", "crm: that e-mail is the owner's");
      if (this.d.team.members.some((m) => m.email.toLowerCase() === email)) {
        refuse("23505", `crm: ${email} is already in the team. Open them in Team to change them.`);
      }
      const r = role || "member";
      const lim = input.waDailyLimit;
      const m: LocalMember = {
        id: `m_${rid().slice(0, 12)}`,
        userId: null,
        email,
        displayName: t(input.displayName) as string,
        role: r,
        viewAll: Boolean(input.viewAll),
        canAddLeads: Boolean(input.canAddLeads),
        waDailyLimit: lim === undefined || lim === null ? 25 : lim < 0 && r === "admin" ? null : Math.max(lim, 0),
        newLeadCap: input.newLeadCap ?? 40,
        mayColdCall: Boolean(input.mayColdCall),
        targets: input.targets || {},
        senderName: t(input.senderName) || undefined,
        senderPhone: phone || undefined,
        senderCheckedAt: input.senderChecked && phone ? this.iso : undefined,
        signature: t(input.signature) || undefined,
        active: true,
        mustChangePassword: input.mustChangePassword ?? true,
        createdBy: this.me.memberId || undefined,
        createdAt: this.iso,
        updatedAt: this.iso,
      };
      this.checkMemberRow(m);
      this.d.team.members.push(m);
      const { createdAt: _a, updatedAt: _b, lastSeenAt: _c, ...detail } = m;
      this.audit("member.add", { memberId: m.id, detail: detail as Record<string, unknown> });
      return m.id;
    }
    const m = this.member(input.id);
    if (!m) refuse("P0002", "crm: no such person in the team");
    const keep = <T>(v: T | undefined | null, cur: T): T => (v === undefined || v === null ? cur : v);
    const text = (v: string | undefined | null, cur?: string) => (v === undefined || v === null ? cur : v.trim() || undefined);
    if (m.role === "owner") {
      const next: Partial<LocalMember> = {
        displayName: t(input.displayName) || m.displayName,
        senderName: text(input.senderName, m.senderName),
        senderPhone: input.senderPhone === undefined || input.senderPhone === null ? m.senderPhone : phone || undefined,
        senderCheckedAt: m.senderCheckedAt || this.iso,
        signature: text(input.signature, m.signature),
        targets: keep(input.targets, m.targets),
      };
      this.checkMemberRow({ ...m, ...next });
      this.changeMember(m, next);
      return m.id;
    }
    if (email && email !== m.email) {
      if (m.userId) refuse("22023", "crm: the e-mail of someone who has signed in cannot change. Add them again with the new one.");
      if (email === ownerEmail || this.d.team.members.some((x) => x.email.toLowerCase() === email)) refuse("23505", `crm: ${email} is already taken`);
    }
    const r = keep(role, m.role);
    const lim = input.waDailyLimit;
    const newPhone = input.senderPhone === undefined || input.senderPhone === null ? m.senderPhone : phone || undefined;
    let checked = m.senderCheckedAt;
    if (input.senderChecked === true && (newPhone || "") !== "") checked = this.iso;
    else if (input.senderChecked === false) checked = undefined;
    else if (input.senderPhone !== undefined && input.senderPhone !== null && (phone || undefined) !== m.senderPhone) checked = undefined;
    const next: Partial<LocalMember> = {
      email: email || m.email,
      displayName: t(input.displayName) || m.displayName,
      role: r,
      viewAll: keep(input.viewAll, m.viewAll),
      canAddLeads: keep(input.canAddLeads, m.canAddLeads),
      waDailyLimit: lim === undefined || lim === null ? m.waDailyLimit : lim < 0 && r === "admin" ? null : Math.max(lim, 0),
      newLeadCap: keep(input.newLeadCap, m.newLeadCap),
      mayColdCall: keep(input.mayColdCall, m.mayColdCall),
      targets: keep(input.targets, m.targets),
      senderName: text(input.senderName, m.senderName),
      senderPhone: newPhone,
      senderCheckedAt: checked,
      signature: text(input.signature, m.signature),
      mustChangePassword: keep(input.mustChangePassword, m.mustChangePassword),
    };
    this.checkMemberRow({ ...m, ...next });
    this.changeMember(m, next);
    return m.id;
  }

  /** Local mode has no logins to look up: nothing to link. */
  linkLogins(): number {
    this.needOwner();
    return 0;
  }

  /** crm_deactivate_member: their open leads move (to someone, or New to the pool and the rest to Mehdi), then they are off. */
  deactivateMember(id: string, reassignTo: string | null): number {
    this.needOwner();
    const m = this.member(id);
    if (!m) refuse("P0002", "crm: no such person in the team");
    if (m.role === "owner") refuse("42501", "crm: the owner cannot be switched off here (public.admins decides)");
    if (reassignTo && reassignTo === id) refuse("22023", "crm: hand their leads to someone else");
    const open = this.allLeads().filter((l) => l.assigneeId === id && isOpenStatus(l.status));
    let n = 0;
    if (open.length) {
      if (reassignTo) n = this.assignLeads(open.map((l) => l.id), reassignTo);
      else {
        for (const l of open) this.setAssignee(l.id, (l.status || "new") === "new" ? null : this.owner.id);
        n = open.length;
      }
    }
    this.changeMember(m, { active: false });
    return n;
  }

  reactivateMember(id: string): void {
    this.needOwner();
    const m = this.member(id);
    if (!m || m.role === "owner") refuse("P0002", "crm: no such person in the team");
    this.changeMember(m, { active: true });
  }

  /** crm_delete_invite: only an invitation never used (no sign-in, no lead, no history line). */
  deleteInvite(id: string): void {
    this.needOwner();
    const m = this.member(id);
    const used = !m || m.role === "owner" || m.userId || m.joinedAt
      || this.allLeads().some((l) => [l.assigneeId, l.createdById, l.assignedById, l.qualifiedById].includes(id))
      || this.d.events.some((e) => e.actorId === id);
    if (used) refuse("22023", "crm: only an unused invitation can be removed; switch the person off instead");
    this.d.team.members = this.d.team.members.filter((x) => x.id !== id);
    const { createdAt: _a, updatedAt: _b, lastSeenAt: _c, ...detail } = m;
    this.audit("member.delete", { memberId: id, detail: detail as Record<string, unknown> });
  }

  /** crm_reset_password, locally: no login to change, so a fresh temporary password is only shown (spec 9.5). */
  resetPassword(id: string): string {
    this.needOwner("crm: only Mehdi resets passwords");
    const m = this.member(id);
    if (!m) refuse("P0002", "crm: no such person in the team");
    if (m.role === "owner" || m.id === this.me.memberId) refuse("42501", "crm: the owner's own password is changed in Supabase, not here");
    if (!m.userId) {
      refuse("22023", `crm: ${m.displayName} has no login linked yet. Create it in Supabase (Team shows how), then press "Check logins".`);
    }
    const alpha = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(14);
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
    else for (let i = 0; i < 14; i++) bytes[i] = Math.floor(Math.random() * 256);
    const pw = Array.from(bytes, (b) => alpha[b % alpha.length]).join("");
    Object.assign(m, { mustChangePassword: true, updatedAt: this.iso });
    this.audit("member.password_reset", { memberId: m.id });
    return pw;
  }

  /** After "Set your own password". */
  passwordChanged(): void {
    if (this.actor && this.actor.mustChangePassword) Object.assign(this.actor, { mustChangePassword: false, updatedAt: this.iso });
  }

  /**
   * crm_me's side effects, locally: the first time someone is acted as is
   * their first sign-in (the login links), and "last seen" moves at most once
   * a minute. Mehdi's row is left alone. Returns true when something changed.
   */
  signIn(): boolean {
    const m = this.actor;
    if (!m || !m.active || m.role === "owner") return false;
    let changed = false;
    if (!m.userId) {
      m.userId = "local:" + m.id;
      this.audit("member.link", { memberId: m.id, detail: { user_id: [null, m.userId] } });
      changed = true;
    }
    if (!m.joinedAt) {
      m.joinedAt = this.iso;
      changed = true;
    }
    if (!m.lastSeenAt || Date.parse(m.lastSeenAt) < this.now.getTime() - 60e3) {
      m.lastSeenAt = this.iso;
      changed = true;
    }
    return changed;
  }

  /* ── The bell, the access log, reviews ─────────────────────────────────── */

  notifications(): CrmNotification[] {
    const me = this.me.memberId;
    if (!me) return [];
    return this.d.team.notifications
      .filter((n) => n.memberId === me)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .slice(0, 50)
      .map(({ memberId: _m, ...n }) => n);
  }

  markNotificationsRead(ids: number[]): void {
    const me = this.me.memberId;
    const want = new Set(ids || []);
    for (const n of this.d.team.notifications) if (n.memberId === me && want.has(n.id) && !n.readAt) n.readAt = this.iso;
  }

  /** crm_log_access: a lead the caller cannot open is kept as a flagged claim, never as a view of it. */
  logAccess(action: AccessAction, leadId?: string, detail: Record<string, unknown> = {}): void {
    this.needRole();
    if (!["lead.view", "contact.reveal", "export", "import", "sign_in"].includes(action)) refuse("22023", "crm: unknown access to log");
    if (detail && (typeof detail !== "object" || Array.isArray(detail))) refuse("22023", "crm: the detail must be a JSON object");
    const max = this.me.role === "owner" ? LOG_DETAIL_MAX.owner : LOG_DETAIL_MAX.other;
    if (jsonBytes(detail || {}) > max) refuse("22001", "crm: detail too long");
    this.spend("log");
    let lead: string | null = null;
    if (leadId) {
      const l = this.lead(leadId);
      const me = this.me.memberId;
      if (l && (this.staff || memberReads(me, l, this.now) || this.me.viewAll || (me && l.qualifiedById === me))) lead = l.id;
    }
    const flag = leadId && !lead ? { flag: "not_visible", claimedLeadId: leadId.slice(0, 100) } : {};
    this.audit(action, { leadId: lead, detail: { ...(detail || {}), ...flag } });
  }

  listReviews(): CrmReview[] {
    if (!this.me.role) return [];
    return this.d.team.reviews
      .filter((r) => this.staff || r.memberId === this.me.memberId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  }

  /** A review is about the line's writer and lead, whatever the request said; a "Fix" tells them. */
  addReview(eventId: string, verdict: "good" | "fix", comment?: string): void {
    if (!this.staff) rlsRefusal("crm_reviews");
    const ev = this.d.events.find((e) => e.id === eventId);
    if (!ev || !ev.actorId) refuse("22023", "crm: that history line has no writer to review");
    if (verdict !== "good" && verdict !== "fix") refuse("23514", 'new row for relation "crm_reviews" violates check constraint "crm_reviews_verdict_check"');
    if ((comment || "").length > 1000) refuse("23514", 'new row for relation "crm_reviews" violates check constraint "crm_reviews_comment_check"');
    if (this.d.team.reviews.some((r) => r.eventId === eventId)) refuse("23505", 'duplicate key value violates unique constraint "crm_reviews_event_id_key"');
    const r: CrmReview = {
      id: this.nextId(), eventId, leadId: ev.leadId, memberId: ev.actorId, reviewerId: this.me.memberId || undefined,
      verdict, comment: (comment || "").trim() || undefined, createdAt: this.iso,
    };
    this.d.team.reviews.push(r);
    if (verdict === "fix" && r.memberId !== r.reviewerId) {
      this.notify(r.memberId, "review", `${this.nameOf(r.reviewerId, "Mehdi")} asked you to fix something: ${r.comment || "see the review"}`, r.leadId);
    }
  }

  /* ── Phase 2: bookings and rules ───────────────────────────────────────── */

  busySlots(hostId?: string, days = 14): string[] {
    if (!this.me.role) return [];
    const host = hostId || this.owner.id;
    const span = Math.min(Math.max(days || 14, 1), 60) * 864e5;
    const t = this.now.getTime();
    return this.d.team.bookings
      .filter((b) => b.status === "booked" && b.hostId === host && Date.parse(b.slotAt) >= t && Date.parse(b.slotAt) < t + span)
      .map((b) => b.slotAt)
      .sort();
  }

  setBooking(id: number, status: CrmBooking["status"], note?: string): void {
    const b = this.d.team.bookings.find((x) => x.id === id);
    if (!b || !this.me.role || !(this.staff || b.hostId === this.me.memberId)) refuse("42501", "crm: only the host, an admin or Mehdi closes a booking");
    if (!["done", "no_show", "cancelled", "booked"].includes(status)) refuse("22023", "crm: unknown booking status");
    if (status === "booked" && b.status !== "booked"
        && this.d.team.bookings.some((x) => x.id !== b.id && x.hostId === b.hostId && x.status === "booked" && x.slotAt === b.slotAt)) {
      refuse("23505", 'duplicate key value violates unique constraint "crm_bookings_slot_key"');
    }
    Object.assign(b, { status, note: (note || "").trim().slice(0, 500) || b.note, updatedAt: this.iso });
  }

  listRules(): AssignmentRule[] {
    if (!this.staff) return [];
    return this.d.team.rules.slice().sort((a, b) => a.priority - b.priority || a.id - b.id);
  }

  saveRule(input: AssignmentRuleInput): void {
    if (this.me.role !== "owner") rlsRefusal("crm_assignment_rules");
    const ids = input.memberIds || [];
    if (!ids.length || ids.length > 50) refuse("23514", 'new row for relation "crm_assignment_rules" violates check constraint "crm_assignment_rules_member_ids_check"');
    if (ids.some((id) => !this.member(id))) refuse("22023", "crm: a rule names someone who is not in the team");
    const name = (input.name || "").trim();
    if (name.length < 1 || name.length > 80) refuse("23514", 'new row for relation "crm_assignment_rules" violates check constraint "crm_assignment_rules_name_check"');
    const city = (input.city || "").trim() || null;
    const existing = input.id ? this.d.team.rules.find((r) => r.id === input.id) : undefined;
    const rule: AssignmentRule = {
      id: existing?.id ?? this.nextId(),
      name,
      kind: input.kind ?? null,
      city,
      memberIds: ids.slice(),
      priority: input.priority ?? existing?.priority ?? 100,
      active: input.active ?? existing?.active ?? true,
      nextIndex: existing && existing.nextIndex < ids.length ? existing.nextIndex : 0,
      createdAt: existing?.createdAt ?? this.iso,
      updatedAt: this.iso,
    };
    if (existing) Object.assign(existing, rule);
    else this.d.team.rules.push(rule);
  }

  deleteRule(id: number): void {
    if (this.me.role !== "owner") return;
    this.d.team.rules = this.d.team.rules.filter((r) => r.id !== id);
  }

  /* ── Meta Lead Ads: 0012's meta_lead_ingest, locally (meta-leads-spec 5.3, 6.5) ── */

  /**
   * One Meta lead, as 0012's meta_lead_ingest takes it from step 5 on: a
   * trusted write (the function runs as its owner, so the field guard only
   * stamps), with the function's own checks. Local mode's Simulate and the e2e
   * suites only; on the live CRM leads come from the webhook. Mehdi only.
   * src/lib/meta/localIntake.ts has already looked in its registry (a Meta
   * lead id seen before stays done, even after a delete) and at the daily cap.
   */
  ingestMeta(leadgenId: string, input: Record<string, unknown>, opts: { assignMode?: MetaAssignMode } = {}): MetaIngestResult {
    if (this.me.role !== "owner") refuse("42501", "crm: only Mehdi adds Meta leads here; on the live CRM they come in by themselves");
    if (!/^\d{1,32}$/.test(leadgenId || "")) refuse("22023", "meta: p_leadgen_id must be digits");
    if (!input || typeof input !== "object" || Array.isArray(input) || jsonBytes(input) > 16000) {
      refuse("22023", "meta: p_lead must be a JSON object of at most 16 KB");
    }
    const id = META_LEAD_ID_PREFIX + leadgenId;
    // 5. A CRM lead for this Meta lead already: its own id, or an earlier import of Meta's export.
    const made = this.allLeads().find((l) => l.id === id || l.metaLeadId === leadgenId);
    if (made) return { result: "already", leadId: made.id, assignedTo: made.assigneeId ?? null };
    // 6. Only Meta's keys, text only, trimmed and cut; the kind and the source from their lists.
    const data: Record<string, string> = {};
    for (const k of META_LEAD_KEYS) {
      const v = input[k];
      const t = typeof v === "string" ? v.trim().slice(0, META_MAX[k]) : "";
      if (t) data[k] = t;
    }
    if (!(LEAD_KIND_VALUES as string[]).includes(data.kind)) data.kind = "other";
    if (!(META_SOURCES as readonly string[]).includes(data.source)) data.source = "Meta Lead Ads";
    data.metaLeadId = leadgenId;
    if (!data.instituteName) data.instituteName = "Lead from Meta";
    const where = platformLabel(data.metaPlatform || "");
    // 7. The same person or business already in the CRM (private.crm_duplicate_of): no second lead.
    const all = this.allLeads();
    const hit = duplicateOf(all, { phone: data.phone, whatsapp: data.whatsapp, email: data.email });
    if (hit) return this.metaDuplicate(hit.lead, leadgenId, data, where);
    // 8. Who works it: the pool, Mehdi, or the rules; a pick the caps refuse goes to the pool.
    const sent = Date.parse(data.metaCreatedAt || "");
    const t = this.now.getTime();
    const draft: OutreachLead = {
      ...(data as unknown as OutreachLead),
      id,
      status: "new",
      createdAt: Number.isFinite(sent) && sent >= t - 90 * 864e5 && sent <= t + 5 * 60e3 ? new Date(sent).toISOString() : this.iso,
      updatedAt: this.iso,
      nextActionAt: this.iso,
      createdById: this.owner.id,
      assigneeId: null,
    };
    const mode = opts.assignMode || "pool";
    let to: string | null = mode === "owner" ? this.owner.id : mode === "rules" ? this.metaRulePick(draft, all) : null;
    if (to) {
      try {
        checkAssignee(this.member(to), this.held(to), { newLeads: 1, openLeads: 1 });
      } catch {
        to = null;
      }
    }
    // 9. The insert, as Mehdi's (decision 8); the audit line has the title and the source, no contacts.
    const lead: OutreachLead = { ...draft, assigneeId: to };
    if (to) lead.assignedAt = this.iso;
    this.changed(undefined, lead);
    this.pinColumns(id);
    // 10. One history line, written by nobody: it claims nothing and counts as nobody's work.
    const form = data.metaFormName ? ` "${data.metaFormName}"` : "";
    const campaign = data.metaCampaignName ? ` (campaign "${data.metaCampaignName}")` : "";
    this.metaLine(id, leadgenId, `New lead from the ${where} lead form${form}${campaign}.`);
    // 11. The bells: Mehdi hears of every new lead; whoever it went to, of theirs.
    this.metaBell(this.owner.id, "lead_in", `New lead from ${where}: ${data.instituteName}`, id);
    if (to && to !== this.owner.id) this.metaBell(to, "assigned", `New ${where} lead assigned to you: ${data.instituteName}`, id);
    // 12.
    return { result: "created", leadId: id, assignedTo: to };
  }

  /**
   * 5.3 step 7: a form carried a number or e-mail the CRM has. Anyone can type
   * someone else's number into a form, so whoever sent it may not be that lead
   * (review, 3 Oct): the lead gets a neutral line saying which of its contacts
   * the form came with, and the answers go to Mehdi alone, as a request on his
   * Today (kind meta_form, asked by nobody; a member never reads it). At most 3
   * Meta touches a day reach the lead: the line, due now when it is open, and
   * on the first touch of the day a bell to whoever works it (or Mehdi). Later
   * ones change nothing ("quiet"). Today's touches are its Meta lines dated
   * today (India): the line of a lead made from Meta today counts as one, and
   * quiet ones only ever come after three.
   */
  private metaDuplicate(lead: OutreachLead, leadgenId: string, data: Record<string, string>, where: string): MetaIngestResult {
    const today = istDay(this.now);
    const touches = this.d.events.filter((e) => e.leadId === lead.id && e.id.startsWith("oe_meta_") && istDay(e.at) === today).length;
    const out: MetaIngestResult = { result: "duplicate", leadId: lead.id, assignedTo: lead.assigneeId ?? null };
    if (touches >= META_TOUCHES_A_DAY) return { ...out, quiet: true };
    const asked = [phoneKey(data.phone), phoneKey(data.whatsapp)].filter(Boolean);
    const byNumber = [phoneKey(lead.phone), phoneKey(lead.whatsapp)].some((k) => Boolean(k) && asked.includes(k));
    const match = byNumber ? "phone number" : "e-mail";
    const notes = data.notes || "";
    const at = notes.indexOf("Answers:\n");
    const answers = at >= 0 ? notes.slice(at + "Answers:\n".length).split("\n").join("; ").replace(/^[; ]+|[; ]+$/g, "") : "";
    const parts = [data.metaFormName && `form "${data.metaFormName}"`, data.metaCampaignName && `campaign "${data.metaCampaignName}"`].filter(Boolean);
    this.pinColumns(lead.id);
    this.metaLine(lead.id, leadgenId,
      `Someone sent the ${where} lead form with this lead's ${match}${parts.length ? ` (${parts.join(", ")})` : ""}.${answers ? " Their answers went to Mehdi." : ""}`);
    if (answers) {
      const form = data.metaFormName ? ` "${data.metaFormName}"` : "";
      const body = `Sent on the ${where} form${form} with this lead's ${match}. Answers: ${answers}`.slice(0, 500);
      this.d.team.requests.push({ id: this.nextId(), leadId: lead.id, kind: "meta_form", hostId: this.owner.id, body, createdAt: this.iso });
    }
    const open = isOpenStatus(lead.status);
    if (open) this.changed(lead, { ...lead, nextActionAt: this.iso, updatedAt: this.iso }, true);
    if (touches === 0) {
      const works = lead.assigneeId && open && this.member(lead.assigneeId)?.active ? lead.assigneeId : this.owner.id;
      this.metaBell(works, "lead_in", `${lead.instituteName}: someone sent the ${where} form with this lead's ${match}`, lead.id);
    }
    return out;
  }

  /**
   * private.meta_rule_pick: crm_apply_rules' own walk (planRules) for this one
   * New lead: active rules by priority, kind and "city contains", the next
   * person in turn who is switched on and under their caps. Like
   * crm_apply_rules it moves that rule's turn on. null: no rule fits (the pool).
   */
  private metaRulePick(lead: OutreachLead, all: OutreachLead[]): string | null {
    const { plan, nextIndex } = planRulesDetailed([lead], this.d.team.rules, rulePeople(all, this.d.team.members), false);
    const pick = plan.get(lead.id) || null;
    if (pick) for (const r of this.d.team.rules) if (nextIndex.has(r.id)) r.nextIndex = nextIndex.get(r.id) as number;
    return pick;
  }

  /**
   * Local mode reads a lead with no stored creator, and a line with no writer,
   * as being from before the team (effectiveLead), which would make the lead
   * Mehdi's on the next read. The intake writes lines with no writer, as 0012
   * does, so the lead's columns are stored as they read now.
   */
  private pinColumns(id: string): void {
    const stored = this.d.leads.find((l) => l.id === id);
    if (!stored) return;
    const now = effectiveLead(stored, this.owner.id, this.before.has(id));
    if (!stored.createdById) stored.createdById = now.createdById;
    if (stored.assigneeId === undefined && now.assigneeId) stored.assigneeId = now.assigneeId;
  }

  /** A history line 0012 writes: no writer (actor null), id oe_meta_<Meta lead id>, never twice. */
  private metaLine(leadId: string, leadgenId: string, detail: string): void {
    const id = `oe_meta_${leadgenId}`;
    if (this.d.events.some((e) => e.id === id)) return;
    this.d.events.push({ id, leadId, at: this.iso, type: "note", detail: detail.slice(0, 2000) });
  }

  /** A bell 0012 rings: no actor (the intake, not a person). */
  private metaBell(memberId: string | null | undefined, kind: NotificationKind, title: string, leadId: string): void {
    if (!memberId) return;
    this.d.team.notifications.push({ id: this.nextId(), memberId, kind, title: title.slice(0, 300), leadId, createdAt: this.iso });
  }
}
