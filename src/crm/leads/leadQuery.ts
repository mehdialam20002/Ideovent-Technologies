import type { DemoSite, DemoSiteOpen } from "@/lib/cms/types";
import { LEAD_STATUSES, type LeadStatus, type OutreachChannel, type OutreachEvent, type OutreachLead } from "@/lib/outreach/types";
import type { CrmRole } from "@/lib/outreach/team";
import { endOfToday, isHotOpen, isOpenLead, isUntouched, opensSinceContact } from "@/admin/outreach/derive";
import { demoLinkFor } from "@/lib/outreach/engine";
import { groupEvents, hasReplied, startOfDay, wasContacted } from "../metrics";

/**
 * LEADS QUERY. Pure: one row model, the saved views, the filters (read from and
 * written to the URL, so the dashboard can link to any slice and the table and
 * the pipeline share one filter), sorting and CSV. No React in here.
 *
 * WHO WORKS A LEAD (the team, 1 Oct 2026): a lead read since 0011 carries
 * assigneeId (null = Unassigned, the pool). The free-text assignedTo is only
 * its "Old label" now. A lead read before 0011 (legacy) has no assigneeId at
 * all, and everything here reads the old label as before.
 */

/** Names a team member ("Unassigned" for no id), as useCrmData().nameOf does. */
export type NameOf = (id?: string | null) => string;

/** True when the lead was read with the team's columns (0011, or local mode). */
export const hasTeamColumns = (l: OutreachLead): boolean => l.assigneeId !== undefined;

export interface LeadRow {
  lead: OutreachLead;
  /** Who works it, by name ("Unassigned" for the pool); undefined before the team (use the old label). */
  assigneeName?: string;
  /** Assigned more than 24 hours ago and nothing written by that person since (derive.ts isUntouched). */
  untouched?: boolean;
  demo?: DemoSite;
  /** Every open of the linked demo. */
  opens: number;
  /** Opens after the last contact: the "hot" signal. */
  freshOpens: number;
  lastOpenAt?: string;
  /** Opened since the last contact, within HOT_DAYS. */
  hot: boolean;
  /** Created in the last 7 days (the dashboard's "New, last 7 days" window). */
  recent: boolean;
  /** Ever contacted: a send, a call or a status past New (the dashboard's "Contacted"). */
  contacted: boolean;
  /** Ever replied: a reply or call event, or a status of Replied or later (the dashboard's "Replied"). */
  replied: boolean;
  /** lastContactedAt, else the newest "sent" event. */
  lastContactAt?: string;
  lastChannel?: OutreachChannel;
  /** "overdue" | "today" | "later" | undefined (no date or closed). */
  due?: "overdue" | "today" | "later";
}

const t = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);

export function buildRows(
  leads: OutreachLead[],
  events: OutreachEvent[],
  opens: DemoSiteOpen[],
  demoForLead: (l: OutreachLead) => DemoSite | undefined,
  now: Date,
  /** Names the assignee on each row (the team); without it rows carry no assigneeName. */
  nameOf?: NameOf,
): LeadRow[] {
  const lastSend = new Map<string, OutreachEvent>();
  for (const e of events) {
    if (e.type !== "sent" && e.type !== "call") continue;
    const cur = lastSend.get(e.leadId);
    if (!cur || t(e.at) > t(cur.at)) lastSend.set(e.leadId, e);
  }
  const opensBy = new Map<string, DemoSiteOpen[]>();
  for (const o of opens) {
    const a = opensBy.get(o.demoId);
    if (a) a.push(o);
    else opensBy.set(o.demoId, [o]);
  }
  const start = startOfDay(now).getTime();
  const end = endOfToday(now).getTime();
  // Same window as metrics.weekCompare: the last 7 days through the end of today.
  const weekEnd = start + 864e5;
  const weekStart = weekEnd - 7 * 864e5;
  const evsBy = groupEvents(events);
  return leads.map((lead) => {
    const demo = demoForLead(lead);
    const os = demo ? opensBy.get(demo.id) || [] : [];
    const freshList = demo ? opensSinceContact({ ...lead, demoId: demo.id }, os) : [];
    const fresh = freshList.length;
    const created = t(lead.createdAt);
    let lastOpenAt: string | undefined;
    for (const o of os) if (!lastOpenAt || t(o.at) > t(lastOpenAt)) lastOpenAt = o.at;
    const ev = lastSend.get(lead.id);
    const open = isOpenLead(lead);
    const n = t(lead.nextActionAt);
    const due = !open || !Number.isFinite(n) ? undefined : n < start ? "overdue" : n <= end ? "today" : "later";
    const evs = evsBy.get(lead.id) || [];
    return {
      lead,
      assigneeName: nameOf && hasTeamColumns(lead) ? nameOf(lead.assigneeId) : undefined,
      untouched: isUntouched(lead, evs, now),
      demo,
      opens: os.length,
      freshOpens: fresh,
      lastOpenAt,
      hot: open && fresh > 0 && isHotOpen(freshList[0]?.at, now),
      recent: created >= weekStart && created < weekEnd,
      contacted: wasContacted(lead, evsBy.get(lead.id) || []),
      replied: hasReplied(lead, evsBy.get(lead.id) || []),
      lastContactAt: lead.lastContactedAt || ev?.at,
      lastChannel: ev?.channel,
      due,
    } satisfies LeadRow;
  });
}

/* ── Saved views ─────────────────────────────────────────────────────────── */

export type ViewId =
  | "open" | "unassigned" | "due" | "hot" | "new" | "new7" | "contacted" | "ever" | "replied" | "everReplied" | "demo" | "won" | "lost" | "all";

/**
 * `extra` views are the dashboard's counts ("New, last 7 days", "Contacted",
 * "Replied"): their tab shows only while one is open, so the tab row stays short.
 * `team` views exist only with the team (0011) and only for Mehdi and admins:
 * Unassigned is the pool of open leads nobody works yet.
 */
export const VIEWS: { id: ViewId; label: string; test: (r: LeadRow) => boolean; extra?: boolean; team?: boolean }[] = [
  { id: "open", label: "All open", test: (r) => isOpenLead(r.lead) },
  { id: "unassigned", label: "Unassigned", test: (r) => isOpenLead(r.lead) && hasTeamColumns(r.lead) && !r.lead.assigneeId, team: true },
  { id: "due", label: "Follow-up due", test: (r) => r.due === "overdue" || r.due === "today" },
  { id: "hot", label: "Hot", test: (r) => r.hot },
  { id: "new", label: "New", test: (r) => r.lead.status === "new" },
  { id: "new7", label: "Added, 7 days", test: (r) => r.recent, extra: true },
  { id: "contacted", label: "Contacted", test: (r) => r.lead.status === "contacted" },
  { id: "ever", label: "Ever contacted", test: (r) => r.contacted, extra: true },
  { id: "replied", label: "Replied", test: (r) => r.lead.status === "replied" },
  { id: "everReplied", label: "Ever replied", test: (r) => r.replied, extra: true },
  // One meaning of "Demo opened" everywhere: the lead's demo link was opened at
  // least once. The dashboard tile counts this same test. The Pipeline column of
  // that name is the stage a lead sits in now, so it can differ.
  { id: "demo", label: "Demo opened", test: (r) => r.opens > 0 },
  { id: "won", label: "Won", test: (r) => r.lead.status === "won" },
  { id: "lost", label: "Lost and DNC", test: (r) => r.lead.status === "lost" || r.lead.status === "do_not_contact" },
  { id: "all", label: "All", test: () => true },
];

export function viewOf(id: string | null): (typeof VIEWS)[number] {
  return VIEWS.find((v) => v.id === id) || VIEWS[0];
}

/* ── Filters (URL) ───────────────────────────────────────────────────────── */

export interface LeadFilters {
  q: string;
  status: LeadStatus[];
  kind: string;
  city: string;
  source: string;
  /**
   * Who works it: a team member's id, or NONE for Unassigned. Also accepted,
   * so older links keep working: a person's name, and an old free-text label
   * ("Aman"), matched against the lead's old label as before the team.
   */
  assignee: string;
  /** The old free-text label ("Old label"), or NONE for leads without one. */
  old: string;
  demo: "" | "yes" | "no";
  hot: boolean;
  overdue: boolean;
}

export const EMPTY_FILTERS: LeadFilters = { q: "", status: [], kind: "", city: "", source: "", assignee: "", old: "", demo: "", hot: false, overdue: false };

/** "Not set" in a filter select means the field is empty. */
export const NONE = "__none";

export function readFilters(p: URLSearchParams): LeadFilters {
  const status = (p.get("status") || "")
    .split(",")
    .filter((s): s is LeadStatus => (LEAD_STATUSES as string[]).includes(s));
  const demo = p.get("demo");
  return {
    q: p.get("q") || "",
    status,
    kind: p.get("kind") || "",
    city: p.get("city") || "",
    source: p.get("source") || "",
    assignee: p.get("assignee") || "",
    old: p.get("old") || "",
    demo: demo === "yes" || demo === "no" ? demo : "",
    hot: p.get("hot") === "1",
    overdue: p.get("overdue") === "1",
  };
}

/** Write filters into a copy of the params. Empty values are removed, other params kept. */
export function writeFilters(p: URLSearchParams, f: Partial<LeadFilters>): URLSearchParams {
  const next = new URLSearchParams(p);
  const set = (k: string, v: string) => (v ? next.set(k, v) : next.delete(k));
  if (f.q !== undefined) set("q", f.q);
  if (f.status !== undefined) set("status", f.status.join(","));
  if (f.kind !== undefined) set("kind", f.kind);
  if (f.city !== undefined) set("city", f.city);
  if (f.source !== undefined) set("source", f.source);
  if (f.assignee !== undefined) set("assignee", f.assignee);
  if (f.old !== undefined) set("old", f.old);
  if (f.demo !== undefined) set("demo", f.demo);
  if (f.hot !== undefined) set("hot", f.hot ? "1" : "");
  if (f.overdue !== undefined) set("overdue", f.overdue ? "1" : "");
  return next;
}

export function activeFilterCount(f: LeadFilters): number {
  return [f.status.length > 0, f.kind, f.city, f.source, f.assignee, f.old, f.demo, f.hot, f.overdue].filter(Boolean).length;
}

const norm = (s?: string) => (s || "").trim().toLowerCase();

function matchField(value: string | undefined, want: string): boolean {
  if (!want) return true;
  if (want === NONE) return !norm(value);
  return norm(value) === norm(want);
}

/**
 * The Assigned filter. With the team's columns: NONE is the Unassigned pool,
 * an id is that person; a name ("Mehdi Alam", from a link) is that person
 * too. Any other value is an old free-text label, matched as before the team,
 * so an old link (?assignee=Aman) still opens the same leads.
 */
export function matchesAssignee(r: LeadRow, want: string): boolean {
  if (!want) return true;
  const l = r.lead;
  if (!hasTeamColumns(l)) return matchField(l.assignedTo, want);
  if (want === NONE) return !l.assigneeId;
  if (l.assigneeId && l.assigneeId === want) return true;
  if (l.assigneeId && r.assigneeName && norm(r.assigneeName) === norm(want)) return true;
  const old = want.replace(/^old:\s*/i, "");
  return Boolean(norm(old)) && norm(l.assignedTo) === norm(old);
}

export function matchesFilters(r: LeadRow, f: LeadFilters, opts: { ignoreStatus?: boolean } = {}): boolean {
  const l = r.lead;
  if (!opts.ignoreStatus && f.status.length && !f.status.includes(l.status)) return false;
  if (!matchField(l.kind, f.kind)) return false;
  if (!matchField(l.city, f.city)) return false;
  if (!matchField(l.source, f.source)) return false;
  if (!matchesAssignee(r, f.assignee)) return false;
  if (!matchField(l.assignedTo, f.old || "")) return false;
  if (f.demo === "yes" && !r.demo && !l.demoSlug) return false;
  if (f.demo === "no" && (r.demo || l.demoSlug)) return false;
  if (f.hot && !r.hot) return false;
  if (f.overdue && r.due !== "overdue") return false;
  const q = norm(f.q);
  if (q) {
    const hay = [l.instituteName, l.contactName, l.city, l.phone, l.whatsapp, l.email, l.website, l.demoSlug, l.notes, ...(l.tags || [])]
      .map(norm)
      .join(" ");
    const digits = q.replace(/\D/g, "");
    if (!q.split(/\s+/).every((w) => hay.includes(w)) && !(digits.length >= 4 && hay.replace(/\D/g, "").includes(digits))) return false;
  }
  return true;
}

/** Distinct non-empty values of a field, case-insensitively merged, most common first. */
export function distinct(leads: OutreachLead[], get: (l: OutreachLead) => string | undefined): { value: string; count: number }[] {
  const m = new Map<string, { value: string; count: number }>();
  for (const l of leads) {
    const v = (get(l) || "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    const cur = m.get(k);
    if (cur) cur.count++;
    else m.set(k, { value: v, count: 1 });
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/* ── Sorting ─────────────────────────────────────────────────────────────── */

export type SortKey =
  | "name" | "status" | "city" | "kind" | "source" | "contact" | "demo" | "lastContact" | "channel" | "next" | "assigned" | "oldLabel" | "created";

const STATUS_ORDER = Object.fromEntries(LEAD_STATUSES.map((s, i) => [s, i])) as Record<LeadStatus, number>;

const SORT_VALUE: Record<SortKey, (r: LeadRow) => string | number | undefined> = {
  name: (r) => norm(r.lead.instituteName),
  status: (r) => STATUS_ORDER[r.lead.status],
  city: (r) => norm(r.lead.city) || undefined,
  kind: (r) => r.lead.kind,
  source: (r) => norm(r.lead.source) || undefined,
  contact: (r) => norm(r.lead.phone || r.lead.email) || undefined,
  demo: (r) => (r.demo || r.lead.demoSlug ? r.opens : undefined),
  lastContact: (r) => (r.lastContactAt ? t(r.lastContactAt) : undefined),
  channel: (r) => r.lastChannel,
  next: (r) => (r.lead.nextActionAt ? t(r.lead.nextActionAt) : undefined),
  assigned: (r) => norm(r.assigneeName ?? r.lead.assignedTo) || undefined,
  oldLabel: (r) => norm(r.lead.assignedTo) || undefined,
  created: (r) => t(r.lead.createdAt),
};

export interface Sort {
  key: SortKey;
  dir: "asc" | "desc";
}

export const DEFAULT_SORT: Sort = { key: "created", dir: "desc" };

/** "-created" to {created, desc}. */
export function readSort(s: string | null): Sort {
  if (!s) return DEFAULT_SORT;
  const dir = s.startsWith("-") ? "desc" : "asc";
  const key = s.replace(/^-/, "") as SortKey;
  return key in SORT_VALUE ? { key, dir } : DEFAULT_SORT;
}

export function writeSort(s: Sort): string {
  return (s.dir === "desc" ? "-" : "") + s.key;
}

/** Empty values always sort last, whichever the direction. */
export function sortRows(rows: LeadRow[], s: Sort): LeadRow[] {
  const get = SORT_VALUE[s.key];
  const sign = s.dir === "asc" ? 1 : -1;
  return rows
    .map((r) => ({ r, v: get(r) }))
    .sort((a, b) => {
      const ae = a.v === undefined || a.v === "" || (typeof a.v === "number" && Number.isNaN(a.v));
      const be = b.v === undefined || b.v === "" || (typeof b.v === "number" && Number.isNaN(b.v));
      if (ae || be) return ae === be ? 0 : ae ? 1 : -1;
      const c = typeof a.v === "number" && typeof b.v === "number" ? a.v - b.v : String(a.v).localeCompare(String(b.v));
      return c * sign || norm(a.r.lead.instituteName).localeCompare(norm(b.r.lead.instituteName));
    })
    .map((x) => x.r);
}

/* ── CSV ─────────────────────────────────────────────────────────────────── */

const CSV_COLS: [string, (r: LeadRow) => string | number | undefined][] = [
  ["Institute", (r) => r.lead.instituteName],
  ["Contact name", (r) => r.lead.contactName],
  ["Status", (r) => r.lead.status],
  ["Kind", (r) => r.lead.kind],
  ["City", (r) => r.lead.city],
  ["State", (r) => r.lead.state],
  ["Phone", (r) => r.lead.phone],
  ["WhatsApp", (r) => r.lead.whatsapp],
  ["Email", (r) => r.lead.email],
  ["Website", (r) => r.lead.website],
  ["Source", (r) => r.lead.source],
  /* The person who works it (the team); before the team, the old free-text label, as before. */
  ["Assigned to", (r) => r.assigneeName ?? r.lead.assignedTo],
  ["Old label", (r) => (r.assigneeName !== undefined ? r.lead.assignedTo : undefined)],
  ["Tags", (r) => (r.lead.tags || []).join("; ")],
  /* The whole address a prospect opens (engine demoLinkFor: SITE_ORIGIN, the main site), not a path (30 Sep 2026). */
  ["Demo", (r) => demoLinkFor(r.demo?.slug || r.lead.demoSlug)],
  ["Demo opens", (r) => r.opens],
  ["Last contact", (r) => r.lastContactAt],
  ["Last channel", (r) => r.lastChannel],
  ["Next action", (r) => r.lead.nextActionAt],
  ["Created", (r) => r.lead.createdAt],
  ["Notes", (r) => r.lead.notes],
];

function cell(v: string | number | undefined): string {
  const s = v === undefined || v === null ? "" : String(v);
  // Leading = + - @ would run as a formula in Excel or Sheets.
  const safe = /^[=+\-@]/.test(s) && !/^[+-]?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: LeadRow[]): string {
  const head = CSV_COLS.map(([h]) => h).join(",");
  const body = rows.map((r) => CSV_COLS.map(([, get]) => cell(get(r))).join(","));
  return [head, ...body].join("\r\n");
}

export function downloadCsv(rows: LeadRow[], name: string): void {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Small readings the table and the board share ─────────────────────────── */

/** "3d" since the last contact, "today", or "" when never contacted. */
export function sinceLabel(iso: string | undefined, now: Date): string {
  if (!iso) return "";
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / 864e5);
  if (!Number.isFinite(days)) return "";
  if (days <= 0) return "today";
  return `${days}d ago`;
}

/**
 * Why this person cannot move a lead from one status to another, in the
 * database's own words (0011 crm_leads_guard, access.ts guardLeadUpdate), or
 * null when they can. Only Mehdi moves a lead to or from Proposal and Won and
 * takes one off Do not contact; a member never moves one to or from Call (a
 * hand-over does). Lists disable what would only be refused.
 */
export function statusBlock(role: CrmRole | null | undefined, from: LeadStatus, to: LeadStatus): string | null {
  if (!role || role === "owner" || from === to) return null;
  if (to === "proposal" || to === "won" || from === "proposal" || from === "won") return "Only Mehdi moves a lead to or from Proposal and Won";
  if (from === "do_not_contact") return "Only Mehdi can take a lead off Do not contact";
  if (role === "member" && (to === "call" || from === "call")) return "Mehdi handles calls: use Hand to Mehdi";
  return null;
}

/** A yyyy-mm-dd input value to an ISO timestamp at 10:00 local time. */
export function dateInputToIso(v: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 10, 0, 0).toISOString();
}
