import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Flame, Inbox, TriangleAlert, UsersRound } from "lucide-react";
import { getOutreachStore } from "@/lib/outreach/store";
import type { AccessDay, CrmMember, MemberStats } from "@/lib/outreach/team";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import { ago, plural } from "../dashboard/format";
import { useOwnerId } from "../today/TodayQueue";
import { periodStart, rowOf, useActivityStats, type StatsPeriod } from "./useActivityStats";
import { alertsFor, closeTheseBy, flaggedPeople, teamCards } from "./teamNumbers";

/**
 * TEAM > PERFORMANCE (spec 10.6), for Mehdi and admins. The Team page
 * (src/crm/team/CrmTeam.tsx) shows it on its Performance tab.
 *
 *   - Team cards: the Unassigned pool, stale leads, hot leads nobody acted on
 *     within 2 hours, and the requests waiting for Mehdi.
 *   - A row per person for Today, the last 7 days or this month
 *     (crm_activity_stats, the numbers each member's My day shows): New
 *     waiting against the cap, open, untouched, overdue, first WhatsApp
 *     (against the limit), first e-mail, follow-ups, calls (connected),
 *     replies, hand-overs, hand-overs accepted, wins credited, first WhatsApp
 *     with no reply this month, last active and last seen. Every column sorts.
 *   - Alerts per person, on Mehdi's own thresholds.
 *
 * Judge people on what Mehdi confirmed (accepted hand-overs, wins), never on
 * sends an intern logs themselves (spec 11.5): the table says so.
 */

export type PerfPeriod = "today" | "7d" | "month";
export const PERF_PERIODS: { id: PerfPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "month", label: "This month" },
];
const FETCH: readonly StatsPeriod[] = ["today", "7d", "14d", "month"];

/** The team's rows (crm_members: caps, limits, joined, last seen): Mehdi and admins read them. */
function useMembers(enabled: boolean): CrmMember[] | null {
  const [rows, setRows] = useState<CrmMember[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    getOutreachStore().listMembers().then((r) => alive && setRows(r), () => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return rows;
}

/** The last 7 days of the Access tab (Mehdi only): who had a flagged day. */
function useAccessDays(enabled: boolean, fromIso: string): AccessDay[] | null {
  const [rows, setRows] = useState<AccessDay[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    getOutreachStore().accessSummary(fromIso).then((r) => alive && setRows(r), () => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [enabled, fromIso]);
  return rows;
}

interface Row {
  stats: MemberStats;
  member?: CrmMember;
  month?: MemberStats;
  alerts: string[];
  cap?: number;
  limit?: number | null;
}

interface Col {
  key: string;
  label: string;
  title?: string;
  /** The value sorted on; numbers sort largest first on the first click. */
  sort: (r: Row) => number | string;
  cell: (r: Row) => ReactNode;
  strong?: boolean;
}

const time = (iso?: string) => (iso ? Date.parse(iso) || 0 : 0);
const muted = "font-normal text-muted-foreground";

function num(key: keyof MemberStats, label: string, extra: Partial<Col> = {}): Col {
  return { key, label, sort: (r) => Number(r.stats[key]) || 0, cell: (r) => Number(r.stats[key]) || 0, ...extra };
}

function columns(period: PerfPeriod, now: Date): Col[] {
  return [
    num("newLeads", "New waiting", {
      title: "New leads (nobody has written to them yet) against the person's cap",
      cell: (r) => <>{r.stats.newLeads}{r.cap ? <span className={muted}>/{r.cap}</span> : null}</>,
    }),
    num("openLeads", "Open"),
    num("untouched", "Untouched", { title: "Assigned more than a day ago, and nothing written on it since" }),
    num("overdue", "Overdue"),
    num("firstWhatsapp", "First WhatsApp", {
      title: period === "today" ? "First WhatsApp messages today, against the daily limit" : "First WhatsApp messages",
      cell: (r) => <>{r.stats.firstWhatsapp}{period === "today" && r.limit ? <span className={muted}>/{r.limit}</span> : null}</>,
    }),
    num("firstEmail", "First e-mail"),
    num("followUps", "Follow-ups"),
    num("calls", "Calls", {
      title: "Calls (connected)",
      cell: (r) => <>{r.stats.calls}{r.stats.callsConnected ? <span className={muted}> ({r.stats.callsConnected})</span> : null}</>,
    }),
    num("replies", "Replies"),
    num("handoffs", "Hand-overs"),
    num("handoffsConfirmed", "Accepted", { strong: true, title: "Hand-overs Mehdi accepted: the number to judge on" }),
    num("wonCredited", "Won", { strong: true, title: "Clients won from leads this person qualified" }),
    {
      key: "unanswered", label: "No reply (month)", title: "First WhatsApp messages this month that got no reply",
      sort: (r) => r.month?.unansweredFirstWhatsapp ?? -1, cell: (r) => (r.month ? r.month.unansweredFirstWhatsapp : "-"),
    },
    { key: "lastActive", label: "Last active", sort: (r) => time(r.stats.lastActiveAt), cell: (r) => (r.stats.lastActiveAt ? ago(r.stats.lastActiveAt, now) : "-") },
    { key: "lastSeen", label: "Last seen", sort: (r) => time(r.stats.lastSeenAt), cell: (r) => (r.stats.lastSeenAt ? ago(r.stats.lastSeenAt, now) : "-") },
  ];
}

const ROLE_TEXT: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

function Person({ r }: { r: Row }) {
  return (
    <span className="block min-w-0">
      <span className="flex items-center gap-1.5">
        <span className="truncate font-medium">{r.stats.displayName}</span>
        <span className="shrink-0 rounded bg-muted px-1 text-[10.5px] font-medium text-muted-foreground">{ROLE_TEXT[r.stats.role] || r.stats.role}</span>
        {!r.stats.active && <span className="shrink-0 text-[11px] text-muted-foreground">(off)</span>}
      </span>
      {r.alerts.length > 0 && (
        <span className="mt-1 flex flex-wrap gap-1" data-alerts={r.alerts.length}>
          {r.alerts.map((a) => (
            <span key={a} data-alert className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-px text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              <TriangleAlert className="h-3 w-3" aria-hidden="true" /> {a}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function Card({ label, value, sub, to, onClick, icon: Icon, testId }: {
  label: string; value: number; sub: string; to: string; onClick?: () => void; icon: typeof Inbox; testId: string;
}) {
  return (
    <Link to={to} onClick={onClick} data-testid={testId}
      className={cn(crm.panel, "flex min-h-[84px] flex-col p-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}</span>
      <span className={cn("mt-1 text-2xl font-semibold leading-none", crm.num, value > 0 && testId !== "card-unassigned" && "text-amber-700 dark:text-amber-300")} data-value>{value}</span>
      <span className="mt-auto pt-1 text-[11.5px] leading-snug text-muted-foreground">{sub}</span>
    </Link>
  );
}

export function TeamPerformance({ className, initialPeriod = "today" }: { className?: string; initialPeriod?: PerfPeriod }) {
  const { me, isStaff, isOwner, leads, events, opens, now, unassignedOpen, waitingOnYou, setScope } = useCrmData();
  const ownerId = useOwnerId();
  const on = isStaff && !me.legacy;
  const [period, setPeriod] = useState<PerfPeriod>(initialPeriod);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const stats = useActivityStats(FETCH);
  const members = useMembers(on);
  const access = useAccessDays(on && isOwner, periodStart("7d", now).toISOString());

  const cards = useMemo(
    () => teamCards({ leads, events, opens, ownerId, unassigned: unassignedOpen, waiting: waitingOnYou.length, now }),
    [leads, events, opens, ownerId, unassignedOpen, waitingOnYou.length, now],
  );
  const closeBy = useMemo(() => closeTheseBy(leads, events, now), [leads, events, now]);
  const flagged = useMemo(() => flaggedPeople(access), [access]);
  const cols = useMemo(() => columns(period, now), [period, now]);

  const rows = useMemo((): Row[] | null => {
    const base = stats[period].rows;
    if (!base) return null;
    return base.map((s) => {
      const member = members?.find((m) => m.id === s.memberId);
      const today = rowOf(stats.today.rows, s.memberId) || s;
      return {
        /* Mehdi has no cap and no limit of his own to show. */
        stats: s, member, month: rowOf(stats.month.rows, s.memberId),
        cap: s.role === "owner" ? undefined : member?.newLeadCap, limit: s.role === "owner" ? undefined : member?.waDailyLimit,
        alerts: alertsFor({
          today, last7: rowOf(stats["7d"].rows, s.memberId), last14: rowOf(stats["14d"].rows, s.memberId), member,
          closeCount: closeBy.get(s.memberId) || 0, flaggedAccess: flagged.has(s.memberId), now,
        }),
      };
    });
  }, [stats, period, members, closeBy, flagged, now]);

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows;
    const col = sort.key === "person" ? null : cols.find((c) => c.key === sort.key);
    const val = (r: Row) => (col ? col.sort(r) : r.stats.displayName.toLowerCase());
    const out = rows.slice().sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? c : -c;
    });
    return out;
  }, [rows, sort, cols]);

  if (!on) {
    return <p className={cn("text-[13px] text-muted-foreground", className)}>Team numbers need the team update (0011).</p>;
  }

  const sortBy = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "person" ? "asc" : "desc" }));
  const ariaSort = (key: string) => (sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none");
  const sortIcon = (k: string) =>
    sort?.key === k ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />) : null;
  const state = stats[period];
  const withAlerts = (rows || []).filter((r) => r.alerts.length).length;
  const th = "h-9 whitespace-nowrap border-b border-border bg-card px-2.5 text-right text-[12px] font-medium text-muted-foreground";

  return (
    <section className={cn("space-y-4", className)} aria-labelledby="perf-h" data-testid="team-performance">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="perf-h" className={crm.label}>The team's numbers</h2>
        <div role="group" aria-label="Period" className="inline-flex rounded-lg bg-muted p-0.5" data-testid="perf-period">
          {PERF_PERIODS.map((p) => (
            <button key={p.id} type="button" aria-pressed={period === p.id} data-period={p.id} onClick={() => setPeriod(p.id)}
              className={cn("h-8 whitespace-nowrap rounded-md px-2.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === p.id && "bg-background text-foreground shadow-sm")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" data-testid="team-cards">
        <Card testId="card-unassigned" icon={UsersRound} label="Unassigned" value={cards.unassigned} sub="Open leads nobody works yet"
          to={CRM.leads} onClick={() => setScope("unassigned", "leads")} />
        <Card testId="card-stale" icon={TriangleAlert} label="Stale" value={cards.stale.length} sub="Team leads with no line for 7 days or more" to={CRM.leads}
          onClick={() => setScope("team", "leads")} />
        <Card testId="card-hot" icon={Flame} label="Hot, not acted on" value={cards.hotNotActed.length} sub="Demo opened over 2 hours ago, nothing sent since"
          to={CRM.today} onClick={() => setScope("team", "today")} />
        <Card testId="card-waiting" icon={Inbox} label="Waiting on you" value={cards.waiting} sub={isOwner ? "Hand-overs and questions for Mehdi" : "Requests sent to you"} to={CRM.today} />
      </div>

      {state.error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">The numbers did not load: {state.error}</p>}
      {!sorted ? (
        <p className="text-[13px] text-muted-foreground" role="status">Loading the numbers...</p>
      ) : (
        <div className={cn(crm.panel, "overflow-hidden")}>
          <p className="border-b border-border px-3 py-2 text-[12px] text-muted-foreground md:px-4">
            {plural(sorted.length, "person", "people")}{withAlerts ? `, ${withAlerts} with alerts` : ""}. Judge people on hand-overs Mehdi accepted and on wins, not on sends: those are typed by whoever sent them.
          </p>
          {/* Phones: one card per person. */}
          <div className="md:hidden">
            <label className="flex items-center gap-2 border-b border-border px-3 py-2 text-[12px] text-muted-foreground">
              Sort by
              <select className={cn(crm.input, "h-10 w-auto flex-1")} value={sort?.key || ""} aria-label="Sort people by"
                onChange={(e) => setSort(e.target.value ? { key: e.target.value, dir: e.target.value === "person" ? "asc" : "desc" } : null)}>
                <option value="">Team order</option>
                <option value="person">Name</option>
                {cols.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <ul>
              {sorted.map((r) => (
                <li key={r.stats.memberId} data-member-id={r.stats.memberId} className="border-b border-border/60 px-3 py-3 last:border-b-0">
                  <Person r={r} />
                  <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 text-[12px]">
                    {cols.map((c) => (
                      <div key={c.key} data-col={c.key} className="min-w-0">
                        <dt className="truncate text-muted-foreground">{c.label}</dt>
                        <dd className={cn(crm.num, c.strong ? "font-semibold" : "font-medium")}>{c.cell(r)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
          {/* Wider screens: the table, every column sorts. */}
          <div className="hidden overflow-x-auto md:block">
            <table className={crm.table} aria-label="Numbers per person">
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("person")} className={cn(th, "sticky left-0 z-10 text-left")}>
                    <button type="button" onClick={() => sortBy("person")} className="inline-flex items-center gap-1 hover:text-foreground">Person {sortIcon("person")}</button>
                  </th>
                  {cols.map((c) => (
                    <th key={c.key} scope="col" aria-sort={ariaSort(c.key)} className={th} title={c.title}>
                      <button type="button" onClick={() => sortBy(c.key)} className={cn("inline-flex items-center gap-1 hover:text-foreground", c.strong && "text-foreground")}>
                        {c.label} {sortIcon(c.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.stats.memberId} data-member-id={r.stats.memberId} className="hover:bg-muted/40">
                    <td className="sticky left-0 z-[1] min-w-[11rem] max-w-[16rem] border-b border-border/60 bg-card px-2.5 py-2 align-top text-[13px]"><Person r={r} /></td>
                    {cols.map((c) => (
                      <td key={c.key} data-col={c.key} className={cn("whitespace-nowrap border-b border-border/60 px-2.5 py-2 text-right align-top text-[13px]", crm.num, c.strong && "font-semibold")}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default TeamPerformance;
