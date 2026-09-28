import type { DemoSite, DemoSiteOpen } from "@/lib/cms/types";
import { LEAD_STATUSES, type LeadStatus, type OutreachEvent, type OutreachLead } from "@/lib/outreach/types";
import { hotLeads, isOpenLead, opensSinceContact, type HotLead } from "@/admin/outreach/derive";

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

/** 0 lead, 1 contacted, 2 engaged, 3 call, 4 proposal, 5 won. */
export function reachedRank(lead: OutreachLead, events: OutreachEvent[]): number {
  let r = STATUS_RANK[lead.status] ?? 0;
  if (lead.lastContactedAt) r = Math.max(r, 1);
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

export function funnel(leads: OutreachLead[], events: OutreachEvent[]): FunnelStep[] {
  const byLead = groupEvents(events);
  const counts = FUNNEL_STAGES.map(() => 0);
  for (const l of leads) {
    const r = reachedRank(l, byLead.get(l.id) || []);
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
  return e.type === "status" && /\bto Won$/.test(e.detail || "");
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
  /** Contacted leads with a linked demo whose demo was opened at least once. */
  demoOpenRate: number | null;
  /** Won out of closed (won + lost). Do-not-contact is not a lost deal. */
  winRate: number | null;
  contacted: number;
  replied: number;
  withDemo: number;
  demoOpened: number;
  won: number;
  lost: number;
}

export function rates(leads: OutreachLead[], events: OutreachEvent[], opens: DemoSiteOpen[]): Rates {
  const byLead = groupEvents(events);
  const openedDemos = new Set(opens.map((o) => o.demoId));
  let contacted = 0, replied = 0, withDemo = 0, demoOpened = 0, won = 0, lost = 0;
  for (const l of leads) {
    const evs = byLead.get(l.id) || [];
    if (l.status === "won") won++;
    if (l.status === "lost") lost++;
    if (!wasContacted(l, evs)) continue;
    contacted++;
    if (hasReplied(l, evs)) replied++;
    if (l.demoId) {
      withDemo++;
      if (openedDemos.has(l.demoId)) demoOpened++;
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

/* ── Breakdowns: by city, kind, source, assignee ─────────────────────────── */

export interface BreakdownRow {
  key: string;
  label: string;
  total: number;
  open: number;
  contacted: number;
  replied: number;
  won: number;
}

export type BreakdownDim = "city" | "kind" | "source" | "assignee";

const NONE_KEY = "__none__";

function dimValue(l: OutreachLead, dim: BreakdownDim): string {
  const raw = dim === "city" ? l.city : dim === "kind" ? l.kind : dim === "source" ? l.source : l.assignedTo;
  return (raw || "").trim();
}

/** Largest first; the "Not set" bucket always last. */
export function breakdown(leads: OutreachLead[], events: OutreachEvent[], dim: BreakdownDim): BreakdownRow[] {
  const byLead = groupEvents(events);
  const rows = new Map<string, BreakdownRow>();
  for (const l of leads) {
    const raw = dimValue(l, dim);
    const key = raw ? raw.toLowerCase() : NONE_KEY;
    let r = rows.get(key);
    if (!r) {
      r = { key, label: raw || "Not set", total: 0, open: 0, contacted: 0, replied: 0, won: 0 };
      rows.set(key, r);
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
  opens: number;
  lastOpenAt?: string;
  /** Opens after the lead was last contacted (0 when no lead). */
  freshOpens: number;
}

export function realDemos(demos: DemoSite[]): DemoSite[] {
  return demos.filter((d) => !(d as { isExample?: boolean }).isExample);
}

export function demoRows(demos: DemoSite[], leads: OutreachLead[], opens: DemoSiteOpen[]): DemoRow[] {
  const byId = new Map<string, OutreachLead>();
  const bySlug = new Map<string, OutreachLead>();
  for (const l of leads) {
    if (l.demoId && !byId.has(l.demoId)) byId.set(l.demoId, l);
    if (l.demoSlug && !bySlug.has(l.demoSlug)) bySlug.set(l.demoSlug, l);
  }
  const opensBy = new Map<string, DemoSiteOpen[]>();
  for (const o of opens) {
    const arr = opensBy.get(o.demoId);
    if (arr) arr.push(o);
    else opensBy.set(o.demoId, [o]);
  }
  const when = (d: DemoSite) => ts(d.updatedAt || d.createdAt) || 0;
  return realDemos(demos)
    .map((demo) => {
      const lead = byId.get(demo.id) || bySlug.get(demo.slug);
      const os = (opensBy.get(demo.id) || []).slice().sort((a, b) => ts(b.at) - ts(a.at));
      const fresh = lead ? opensSinceContact({ ...lead, demoId: demo.id }, os).length : 0;
      return { demo, lead, opens: os.length, lastOpenAt: os[0]?.at, freshOpens: fresh };
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
  byAssignee: BreakdownRow[];
  /** Demo opened after the last contact, most recent open first. */
  hot: HotLead[];
  due: Due;
  demos: DemoRow[];
  /** Real demos with no lead linked. */
  unlinkedDemos: number;
}

export function computeMetrics(input: {
  leads: OutreachLead[];
  events: OutreachEvent[];
  opens: DemoSiteOpen[];
  demos: DemoSite[];
  now?: Date;
}): CrmMetrics {
  const { leads, events, opens, demos } = input;
  const now = input.now || new Date();
  const demoList = demoRows(demos, leads, opens);
  return {
    total: leads.length,
    open: leads.filter(isOpenLead).length,
    byStatus: countsByStatus(leads),
    week: weekCompare(leads, events, opens, now),
    rates: rates(leads, events, opens),
    sendsPerDay: sendsPerDay(events, opens, 30, now),
    funnel: funnel(leads, events),
    byCity: breakdown(leads, events, "city"),
    byKind: breakdown(leads, events, "kind"),
    bySource: breakdown(leads, events, "source"),
    byAssignee: breakdown(leads, events, "assignee"),
    hot: hotLeads(leads, opens, now),
    due: due(leads, now),
    demos: demoList,
    unlinkedDemos: demoList.filter((d) => !d.lead).length,
  };
}

export type { HotLead };
