import type { DemoSite, DemoSiteOpen } from "@/lib/cms/types";
import { LEAD_STATUSES, type LeadStatus, type OutreachEvent, type OutreachLead } from "@/lib/outreach/types";
import { allOpens, hotLeads, isOpenLead, leadOpens, linkSentAt, opensSinceContact, type HotLead, type OpensCtx } from "@/admin/outreach/derive";
import { cityOf } from "@/lib/outreach/city";

/**
 * CRM METRICS. Pure: every function takes the data and a `now`, and returns
 * numbers. Nothing here reads a store, a hook or the clock on its own, so the
 * dashboard, the table and a node test all agree on what a number means.
 */

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** YYYY-MM-DD in local time. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ts(iso?: string): number {
  if (!iso) return NaN;
  return new Date(iso).getTime();
}

function inRange(iso: string | undefined, from: number, to: number): boolean {
  const t = ts(iso);
  return Number.isFinite(t) && t >= from && t < to;
}

/** a / b, or null when b is 0 (the UI shows a dash, never "NaN%"). */
export function rate(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

export function countsByStatus(leads: OutreachLead[]): Record<LeadStatus, number> {
  const out = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const l of leads) out[l.status] = (out[l.status] || 0) + 1;
  return out;
}

/* ── How far a lead got ───────────────────────────────────────────────────
   A lead that is Lost today may have replied and had a call first. So the
   stage it REACHED is read from its status and its history together. */

export const FUNNEL_STAGES = ["lead", "contacted", "engaged", "call", "proposal", "won"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  lead: "Leads",
  contacted: "Contacted",
  engaged: "Replied or opened",
  call: "Call",
  proposal: "Proposal",
  won: "Won",
};

const STATUS_RANK: Record<LeadStatus, number> = {
  new: 0,
  contacted: 1,
  replied: 2,
  demo_opened: 2,
  call: 3,
  proposal: 4,
  won: 5,
  lost: 0,
  do_not_contact: 0,
};

/**
 * 0 lead, 1 contacted, 2 engaged, 3 call, 4 proposal, 5 won. `opened`: the
 * lead opened its own demo (derive.ts leadOpens: after its link went to them),
 * which is "Replied or opened" whether or not a "Demo opened" line was written
 * (crm-fixes-1004 item 4: the funnel showed 3 there while the Demo opened tile
 * showed 9).
 */
export function reachedRank(lead: OutreachLead, events: OutreachEvent[], opened = false): number {
  let r = STATUS_RANK[lead.status] ?? 0;
  if (lead.lastContactedAt) r = Math.max(r, 1);
  if (opened) r = Math.max(r, 2);
  for (const e of events) {
    if (e.leadId !== lead.id) continue;
    if (e.type === "sent") r = Math.max(r, 1);
    else if (e.type === "replied" || e.type === "demo_opened") r = Math.max(r, 2);
    else if (e.type === "call") r = Math.max(r, 3);
  }
  return r;
}

export interface FunnelStep {
  stage: FunnelStage;
  label: string;
  count: number;
  /** Share of the step before (1 for the first). */
  fromPrev: number | null;
}

/** `opened`: the ids of the leads that opened their own demo (leadOpens), so "Replied or opened" counts them. */
export function funnel(leads: OutreachLead[], events: OutreachEvent[], opened?: ReadonlySet<string>): FunnelStep[] {
  const byLead = groupEvents(events);
  const counts = FUNNEL_STAGES.map(() => 0);
  for (const l of leads) {
    const r = reachedRank(l, byLead.get(l.id) || [], Boolean(opened?.has(l.id)));
    for (let i = 0; i <= r; i++) counts[i]++;
  }
  return FUNNEL_STAGES.map((stage, i) => ({
    stage,
    label: FUNNEL_LABELS[stage],
    count: counts[i],
    fromPrev: i === 0 ? 1 : rate(counts[i], counts[i - 1]),
  }));
}

export function groupEvents(events: OutreachEvent[]): Map<string, OutreachEvent[]> {
  const m = new Map<string, OutreachEvent[]>();
  for (const e of events) {
    const arr = m.get(e.leadId);
    if (arr) arr.push(e);
    else m.set(e.leadId, [e]);
  }
  return m;
}

/** A status event that moved a lead to Won (LeadPage writes "Status: X to Won"). */
export function isWinEvent(e: OutreachEvent): boolean {
  return e.type === "status" && typeof e.detail === "string" && /\bto Won$/.test(e.detail);
}

/* ── Rates ─────────────────────────────────────────────────────────────── */

const REPLIED_STATUSES: LeadStatus[] = ["replied", "call", "proposal", "won"];

export function hasReplied(lead: OutreachLead, evs: OutreachEvent[]): boolean {
  return REPLIED_STATUSES.includes(lead.status) || evs.some((e) => e.type === "replied" || e.type === "call");
}

export function wasContacted(lead: OutreachLead, evs: OutreachEvent[]): boolean {
  return reachedRank(lead, evs) >= 1;
}

export interface Rates {
  /** Replied (or further) out of contacted. */
  replyRate: number | null;
  /** Of the leads whose demo link went to them in a message (derive.ts linkSentAt), those who opened it (leadOpens). */
  demoOpenRate: number | null;
  /** Won out of closed (won + lost). Do-not-contact is not a lost deal. */
  winRate: number | null;
  contacted: number;
  replied: number;
  /** Leads whose demo was SENT: a message carried its link (not just "live", crm-fixes-1004 item 2). */
  withDemo: number;
  demoOpened: number;
  won: number;
  lost: number;
}

/**
 * `ctx`: the history and each lead's demo (a lead linked by its slug alone
 * counts too). "Demos sent" are the leads whose demo link went to them in a
 * message; "opened" the ones of them that opened it afterwards.
 */
export function rates(leads: OutreachLead[], events: OutreachEvent[], opens: DemoSiteOpen[], ctx: OpensCtx = { events }): Rates {
  const byLead = groupEvents(events);
  let contacted = 0, replied = 0, withDemo = 0, demoOpened = 0, won = 0, lost = 0;
  for (const l of leads) {
    const evs = byLead.get(l.id) || [];
    if (l.status === "won") won++;
    if (l.status === "lost") lost++;
    if (!wasContacted(l, evs)) continue;
    contacted++;
    if (hasReplied(l, evs)) replied++;
    if (linkSentAt(l.id, ctx.events)) {
      withDemo++;
      if (leadOpens(l, opens, ctx).length) demoOpened++;
    }
  }
  return {
    replyRate: rate(replied, contacted),
    demoOpenRate: rate(demoOpened, withDemo),
    winRate: rate(won, won + lost),
    contacted, replied, withDemo, demoOpened, won, lost,
  };
}

/* ── This week against last ────────────────────────────────────────────────
   Rolling: the last 7 days against the 7 before them, so Monday morning does
   not compare half a day with a whole week. */

export interface PeriodStats {
  newLeads: number;
  sends: number;
  emailSends: number;
  whatsappSends: number;
  replies: number;
  demoOpens: number;
  calls: number;
  wins: number;
}

export function periodStats(
  leads: OutreachLead[], events: OutreachEvent[], opens: DemoSiteOpen[], from: number, to: number,
): PeriodStats {
  const s: PeriodStats = { newLeads: 0, sends: 0, emailSends: 0, whatsappSends: 0, replies: 0, demoOpens: 0, calls: 0, wins: 0 };
  for (const l of leads) if (inRange(l.createdAt, from, to)) s.newLeads++;
  for (const e of events) {
    if (!inRange(e.at, from, to)) continue;
    if (e.type === "sent") {
      s.sends++;
      if (e.channel === "email") s.emailSends++;
      if (e.channel === "whatsapp") s.whatsappSends++;
    } else if (e.type === "replied") s.replies++;
    else if (e.type === "call") s.calls++;
    else if (isWinEvent(e)) s.wins++;
  }
  for (const o of opens) if (inRange(o.at, from, to)) s.demoOpens++;
  return s;
}

export interface WeekCompare {
  thisWeek: PeriodStats;
  lastWeek: PeriodStats;
}

export function weekCompare(leads: OutreachLead[], events: OutreachEvent[], opens: DemoSiteOpen[], now = new Date()): WeekCompare {
  const end = startOfDay(now).getTime() + DAY; // through the end of today
  return {
    thisWeek: periodStats(leads, events, opens, end - 7 * DAY, end),
    lastWeek: periodStats(leads, events, opens, end - 14 * DAY, end - 7 * DAY),
  };
}

/** (current - previous) / previous, null when previous is 0. */
export function delta(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

/* ── Sends per day, the last N days, oldest first ─────────────────────── */

export interface DayPoint {
  /** YYYY-MM-DD, local. */
  date: string;
  email: number;
  whatsapp: number;
  total: number;
  replies: number;
  opens: number;
}

export function sendsPerDay(events: OutreachEvent[], opens: DemoSiteOpen[], days = 30, now = new Date()): DayPoint[] {
  const today = startOfDay(now);
  const points: DayPoint[] = [];
  const idx = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const p: DayPoint = { date: dayKey(d), email: 0, whatsapp: 0, total: 0, replies: 0, opens: 0 };
    points.push(p);
    idx.set(p.date, p);
  }
  for (const e of events) {
    const t = ts(e.at);
    if (!Number.isFinite(t)) continue;
    const p = idx.get(dayKey(new Date(t)));
    if (!p) continue;
    if (e.type === "sent") {
      p.total++;
      if (e.channel === "email") p.email++;
      if (e.channel === "whatsapp") p.whatsapp++;
    } else if (e.type === "replied") p.replies++;
  }
  for (const o of opens) {
    const t = ts(o.at);
    if (!Number.isFinite(t)) continue;
    const p = idx.get(dayKey(new Date(t)));
    if (p) p.opens++;
  }
  return points;
}

/* ── Who works a lead (0011): people, the old label, the owner filter ────── */

/** A team member's name from their id (crm_team); undefined when not known. */
export type NameOf = (id: string | null | undefined) => string | undefined;

const noNames: NameOf = () => undefined;

/** The owner filter's value for the Unassigned pool. An empty filter ("" or undefined) is everyone. */
export const UNASSIGNED_OWNER = "__unassigned__";

/** True when the lead belongs to `owner`: a team member id, UNASSIGNED_OWNER for the pool, empty for everyone. */
export function ownedBy(lead: OutreachLead, owner?: string | null): boolean {
  if (!owner) return true;
  if (owner === UNASSIGNED_OWNER) return !lead.assigneeId;
  return lead.assigneeId === owner;
}

/** The leads of one owner (the dashboard's owner filter); every lead when the filter is empty. */
export function leadsOfOwner(leads: OutreachLead[], owner?: string | null): OutreachLead[] {
  return owner ? leads.filter((l) => ownedBy(l, owner)) : leads;
}

/** A person's name for a label; an id nobody named (not in the caller's roster) reads as below. */
export function personLabel(id: string, nameOf: NameOf = noNames): string {
  return nameOf(id) || "Someone in the team";
}

export interface OwnerOption {
  /** A team member id, or UNASSIGNED_OWNER. */
  id: string;
  label: string;
  count: number;
}

/** The owner filter's choices: everyone holding leads (most first), then Unassigned when any lead is. */
export function ownerOptions(leads: OutreachLead[], nameOf: NameOf = noNames): OwnerOption[] {
  const counts = new Map<string, number>();
  let pool = 0;
  for (const l of leads) {
    if (l.assigneeId) counts.set(l.assigneeId, (counts.get(l.assigneeId) || 0) + 1);
    else pool++;
  }
  const people = [...counts]
    .map(([id, count]) => ({ id, label: personLabel(id, nameOf), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return pool ? [...people, { id: UNASSIGNED_OWNER, label: "Unassigned", count: pool }] : people;
}

/* ── Breakdowns: by city, kind, source, assignee ─────────────────────────── */

export interface BreakdownRow {
  key: string;
  label: string;
  total: number;
  open: number;
  contacted: number;
  replied: number;
  won: number;
  /** Assignee rows: the person (a team member id) this row is. */
  personId?: string;
  /** Assignee rows: the old free-text label ("Aman") of leads nobody is assigned to yet. */
  oldLabel?: string;
}

export type BreakdownDim = "city" | "kind" | "source" | "assignee";

const NONE_KEY = "__none__";
const OLD_LABEL_KEY = "old:";

/** City: the town from the address the City field holds (lib/outreach/city.ts cityOf), so one town is one row. */
function dimValue(l: OutreachLead, dim: Exclude<BreakdownDim, "assignee">): string {
  const raw = dim === "city" ? cityOf(l) : dim === "kind" ? l.kind : l.source;
  return (raw || "").trim();
}

/**
 * A lead's group on the assignee breakdown: the person who works it
 * (assigneeId, by name); a lead nobody is assigned to yet but with an old
 * free-text label is "Old: Aman"; anything else is Unassigned (null).
 */
function assigneeGroup(l: OutreachLead, nameOf: NameOf): Pick<BreakdownRow, "key" | "label" | "personId" | "oldLabel"> | null {
  if (l.assigneeId) return { key: l.assigneeId, label: personLabel(l.assigneeId, nameOf), personId: l.assigneeId };
  const old = (l.assignedTo || "").trim();
  return old ? { key: OLD_LABEL_KEY + old.toLowerCase(), label: `Old: ${old}`, oldLabel: old } : null;
}

/** Largest first; the "Not set" (assignee: "Unassigned") bucket always last. `nameOf` names the people. */
export function breakdown(leads: OutreachLead[], events: OutreachEvent[], dim: BreakdownDim, nameOf: NameOf = noNames): BreakdownRow[] {
  const byLead = groupEvents(events);
  const rows = new Map<string, BreakdownRow>();
  for (const l of leads) {
    let group: Pick<BreakdownRow, "key" | "label" | "personId" | "oldLabel">;
    if (dim === "assignee") group = assigneeGroup(l, nameOf) || { key: NONE_KEY, label: "Unassigned" };
    else {
      const raw = dimValue(l, dim);
      group = { key: raw ? raw.toLowerCase() : NONE_KEY, label: raw || "Not set" };
    }
    let r = rows.get(group.key);
    if (!r) {
      r = { ...group, total: 0, open: 0, contacted: 0, replied: 0, won: 0 };
      rows.set(group.key, r);
    }
    const evs = byLead.get(l.id) || [];
    r.total++;
    if (isOpenLead(l)) r.open++;
    if (wasContacted(l, evs)) r.contacted++;
    if (hasReplied(l, evs)) r.replied++;
    if (l.status === "won") r.won++;
  }
  return [...rows.values()].sort((a, b) => {
    if (a.key === NONE_KEY) return 1;
    if (b.key === NONE_KEY) return -1;
    return b.total - a.total || a.label.localeCompare(b.label);
  });
}

/* ── Due ───────────────────────────────────────────────────────────────── */

export interface Due {
  /** nextActionAt today, earliest first. */
  today: OutreachLead[];
  /** nextActionAt before today, oldest first. */
  overdue: OutreachLead[];
}

export function due(leads: OutreachLead[], now = new Date()): Due {
  const start = startOfDay(now).getTime();
  const end = start + DAY;
  const today: OutreachLead[] = [];
  const overdue: OutreachLead[] = [];
  for (const l of leads) {
    if (!isOpenLead(l) || !l.nextActionAt) continue;
    const t = ts(l.nextActionAt);
    if (!Number.isFinite(t)) continue;
    if (t < start) overdue.push(l);
    else if (t < end) today.push(l);
  }
  const byNext = (a: OutreachLead, b: OutreachLead) => ts(a.nextActionAt) - ts(b.nextActionAt);
  return { today: today.sort(byNext), overdue: overdue.sort(byNext) };
}

/* ── Demos and the leads they belong to ───────────────────────────────────
   Every real demo, however it was made (template, poster upload, demo-sites
   editor, lead finder), with the lead it is linked to if any. A demo with no
   lead is exactly the "I made it and cannot track it" case. */

export interface DemoRow {
  demo: DemoSite;
  /** Linked by lead.demoId, else by lead.demoSlug. */
  lead?: OutreachLead;
  /**
   * Opens that count: with a lead, the lead's own (after its link went to them,
   * derive.ts leadOpens); with no lead, every recorded open (there is no
   * history to judge them by, and an open of a demo nobody tracks is worth seeing).
   */
  opens: number;
  /** Every recorded open of the demo. */
  allOpens: number;
  lastOpenAt?: string;
  /** The lead's own opens after its last contact (0 when no lead). */
  freshOpens: number;
  /** When the lead's history first shows a message that carried this demo's link: "Sent". Undefined: never sent. */
  sentAt?: string;
}

export function realDemos(demos: DemoSite[]): DemoSite[] {
  return demos.filter((d) => !(d as { isExample?: boolean }).isExample);
}

/** When a demo was made: createdAt, else updatedAt, else preparedOn (the outreach imports carry only that). */
export function demoCreatedAt(d: Pick<DemoSite, "createdAt" | "updatedAt" | "preparedOn">): string | undefined {
  for (const v of [d.createdAt, d.updatedAt, d.preparedOn]) if (v && Number.isFinite(ts(v))) return v;
  return undefined;
}

export function demoRows(demos: DemoSite[], leads: OutreachLead[], opens: DemoSiteOpen[], events: OutreachEvent[] = []): DemoRow[] {
  const byId = new Map<string, OutreachLead>();
  const bySlug = new Map<string, OutreachLead>();
  for (const l of leads) {
    if (l.demoId && !byId.has(l.demoId)) byId.set(l.demoId, l);
    if (l.demoSlug && !bySlug.has(l.demoSlug)) bySlug.set(l.demoSlug, l);
  }
  const when = (d: DemoSite) => ts(demoCreatedAt(d)) || 0;
  return realDemos(demos)
    .map((demo) => {
      const lead = byId.get(demo.id) || bySlug.get(demo.slug);
      const ctx: OpensCtx = { events, demoIdOf: () => demo.id };
      const every = lead ? allOpens(lead, opens, ctx) : opens.filter((o) => o.demoId === demo.id).sort((a, b) => ts(b.at) - ts(a.at));
      const counted = lead ? leadOpens(lead, opens, ctx) : every;
      const fresh = lead ? opensSinceContact(lead, opens, ctx).length : 0;
      return {
        demo, lead, opens: counted.length, allOpens: every.length, lastOpenAt: counted[0]?.at, freshOpens: fresh,
        sentAt: lead ? linkSentAt(lead.id, events) : undefined,
      };
    })
    .sort((a, b) => when(b.demo) - when(a.demo));
}

/* ── Everything at once ─────────────────────────────────────────────────── */

export interface CrmMetrics {
  total: number;
  open: number;
  byStatus: Record<LeadStatus, number>;
  week: WeekCompare;
  rates: Rates;
  sendsPerDay: DayPoint[];
  funnel: FunnelStep[];
  byCity: BreakdownRow[];
  byKind: BreakdownRow[];
  bySource: BreakdownRow[];
  /** By the person who works each lead; old free-text labels as "Old: Aman". */
  byAssignee: BreakdownRow[];
  /** Demo opened after the last contact, most recent open first. */
  hot: HotLead[];
  due: Due;
  demos: DemoRow[];
  /** Real demos with no lead linked. */
  unlinkedDemos: number;
  /** The owner filter the funnel and the breakdowns were counted with ("" = everyone). */
  owner: string;
  /** The owner filter's choices, over every lead given. */
  owners: OwnerOption[];
}

/**
 * The opens the numbers count (4 Oct 2026, crm-fixes-1004 items 2 to 4): each
 * lead's own (derive.ts leadOpens, after its demo link went to them), each
 * once. An open of a lead's demo before its link went (a look at the live link
 * before sending, a test) is in no number; the history still shows it.
 */
export function countedOpens(leads: OutreachLead[], opens: DemoSiteOpen[], ctx: OpensCtx): { list: DemoSiteOpen[]; opened: Set<string> } {
  const seen = new Set<string>();
  const list: DemoSiteOpen[] = [];
  const opened = new Set<string>();
  for (const l of leads) {
    const own = leadOpens(l, opens, ctx);
    if (own.length) opened.add(l.id);
    for (const o of own) {
      const key = o.id || `${o.demoId}|${o.at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(o);
    }
  }
  return { list, opened };
}

/**
 * Every number at once. `owner` (a team member id, or UNASSIGNED_OWNER)
 * narrows the funnel and the breakdowns to that person's leads; everything
 * else counts every lead given. `nameOf` names the people on the assignee
 * breakdown and the owner choices. Without either, the numbers are exactly
 * those before the team (only the assignee breakdown now groups by person).
 * `demoIdOf`: each lead's demo (useCrmData demoForLead: its demoId, else the
 * demo its slug names); without it, its demoId.
 *
 * DEMO OPENS (4 Oct 2026) are the leads' own (countedOpens) everywhere here:
 * the 7-day table, the chart, the funnel's "Replied or opened", the demo open
 * rate and Hot, so a tile, its list and the funnel agree.
 */
export function computeMetrics(input: {
  leads: OutreachLead[];
  events: OutreachEvent[];
  opens: DemoSiteOpen[];
  demos: DemoSite[];
  now?: Date;
  owner?: string | null;
  nameOf?: NameOf;
  demoIdOf?: (lead: OutreachLead) => string | undefined;
}): CrmMetrics {
  const { leads, events, opens, demos } = input;
  const now = input.now || new Date();
  const nameOf = input.nameOf || noNames;
  const owned = leadsOfOwner(leads, input.owner);
  const ctx: OpensCtx = { events, demoIdOf: input.demoIdOf };
  const counted = countedOpens(leads, opens, ctx);
  const demoList = demoRows(demos, leads, opens, events);
  return {
    total: leads.length,
    open: leads.filter(isOpenLead).length,
    byStatus: countsByStatus(leads),
    week: weekCompare(leads, events, counted.list, now),
    rates: rates(leads, events, opens, ctx),
    sendsPerDay: sendsPerDay(events, counted.list, 30, now),
    funnel: funnel(owned, events, counted.opened),
    byCity: breakdown(owned, events, "city"),
    byKind: breakdown(owned, events, "kind"),
    bySource: breakdown(owned, events, "source"),
    byAssignee: breakdown(owned, events, "assignee", nameOf),
    owner: input.owner || "",
    owners: ownerOptions(leads, nameOf),
    hot: hotLeads(leads, opens, now, ctx),
    due: due(leads, now),
    demos: demoList,
    unlinkedDemos: demoList.filter((d) => !d.lead).length,
  };
}

export type { HotLead };
