import { lazy, Suspense, useMemo, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Import, Inbox, MapPin, Plus, RefreshCw, UserX, UsersRound } from "lucide-react";
import { untouchedLeads } from "@/admin/outreach/derive";
import { useCrmData } from "../useCrmData";
import { useCrmMe } from "../useCrmMe";
import { CRM } from "../nav";
import { computeMetrics, type CrmMetrics } from "../metrics";
import { crm, EmptyState, PageHeader } from "../ui";
import { cn } from "@/lib/utils";
import { CountTiles, RateTiles } from "./KpiTiles";
import { ActivityChart } from "./ActivityChart";
import { FunnelPanel, StatusPanel } from "./FunnelPanel";
import { BreakdownPanel } from "./BreakdownPanel";
import { DuePanel, HotPanel, UnlinkedCallout } from "./SidePanels";
import { WeekTable } from "./WeekTable";
import { ScopeSwitch } from "./ScopeSwitch";
import { useOwnerId } from "../today/TodayQueue";
import { teamLeads } from "../performance/teamNumbers";

/* The client tiles (client-process-spec 11.5): Mehdi only, a lazy chunk nobody else downloads. */
const ClientTiles = lazy(() => import("../clients/ClientTiles"));

/**
 * /crm: how outreach is going, and what to do about it.
 *
 * Top: counts (how many leads reached each step) and rates (how well each
 * step converts, plus the work waiting). Middle: 30 days of activity, the
 * funnel, where leads sit now, breakdowns. Right: who to call first.
 * Every number comes from metrics.ts, so it agrees with the table and Today.
 *
 * THE TEAM (spec 10.4, 10.6). Mehdi and admins pick whose leads it counts
 * (Mine, Team, All, Unassigned; All by default, so on the day of the team
 * update every number is as before), and narrow the funnel and the
 * breakdowns to one person. A line above the tiles keeps the team in view:
 * the Unassigned pool, leads untouched for a day, and what waits on them.
 *
 * THE CLIENT FILES (client-process-spec 11.5, 4 Oct 2026). For Mehdi, once
 * 0014 is there, four client tiles under the existing ones (active clients,
 * money due, received this month, renewals in 60 days) and the overdue client
 * tasks. Every existing tile and number is unchanged.
 */

/** The dashboard's numbers over its scope: the leads in it, their history and their demos' opens. */
function useScopedMetrics(owner: string): CrmMetrics {
  const { metrics, scopeFor, leadsIn, events, opens, demos, now, demoForLead, nameOf, openCtx } = useCrmData();
  const scope = scopeFor("dashboard");
  const scoped = leadsIn(scope);
  return useMemo(() => {
    if (scope === "all" && !owner) return metrics;
    const ids = new Set(scoped.map((l) => l.id));
    const demoIds = new Set(scoped.map((l) => demoForLead(l)?.id || l.demoId).filter(Boolean));
    const m = computeMetrics({
      leads: scoped,
      events: scope === "all" ? events : events.filter((e) => ids.has(e.leadId)),
      opens: scope === "all" ? opens : opens.filter((o) => demoIds.has(o.demoId)),
      demos, now, owner,
      nameOf: (id) => (id ? nameOf(id, "") || undefined : undefined),
      demoIdOf: openCtx.demoIdOf,
    });
    /* Demos with no lead are about every lead, whatever the scope. */
    return { ...m, demos: metrics.demos, unlinkedDemos: metrics.unlinkedDemos };
  }, [scope, owner, metrics, scoped, events, opens, demos, now, demoForLead, nameOf, openCtx]);
}

/** The team in one line: the pool, leads untouched for a day, what waits on you. */
function TeamLine() {
  const { leads, events, now, unassignedOpen, waitingOnYou, setScope } = useCrmData();
  const ownerId = useOwnerId();
  const untouched = useMemo(() => untouchedLeads(teamLeads(leads, ownerId), events, now).length, [leads, ownerId, events, now]);
  const item = "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11";
  return (
    <div className={cn(crm.panel, "flex flex-wrap items-center gap-x-1 gap-y-0.5 px-2 py-1.5")} data-testid="dash-team" aria-label="The team">
      <Link to={CRM.leads} onClick={() => setScope("unassigned", "leads")} className={item} data-testid="dash-unassigned">
        <UsersRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className={cn("font-semibold", crm.num)}>{unassignedOpen}</span> unassigned
      </Link>
      <Link to={`${CRM.team}?tab=performance`} className={item} data-testid="dash-untouched" title="Assigned more than a day ago, and nothing written on it since">
        <UserX className={cn("h-3.5 w-3.5", untouched ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} aria-hidden="true" />
        <span className={cn("font-semibold", crm.num, untouched > 0 && "text-amber-700 dark:text-amber-300")}>{untouched}</span> untouched over a day
      </Link>
      <Link to={CRM.today} className={item} data-testid="dash-waiting">
        <Inbox className={cn("h-3.5 w-3.5", waitingOnYou.length ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
        <span className={cn("font-semibold", crm.num)}>{waitingOnYou.length}</span> waiting on you
      </Link>
    </div>
  );
}

export default function CrmDashboard() {
  const { loading, error, mode, refresh, now, me, isStaff, scopeFor, leadsIn, setScope } = useCrmData();
  const { can } = useCrmMe();
  const [owner, setOwner] = useState("");
  const m = useScopedMetrics(owner);
  const scope = scopeFor("dashboard");
  const team = isStaff && !me.legacy;
  const [busy, setBusy] = useState(false);
  const [refreshErr, setRefreshErr] = useState<string | null>(null);

  const doRefresh = async () => {
    setBusy(true);
    setRefreshErr(null);
    try {
      await refresh();
    } catch (e) {
      setRefreshErr(e instanceof Error ? e.message : "Could not refresh.");
    } finally {
      setBusy(false);
    }
  };

  /* A tile or a row opens the leads table on the same leads: it keeps this scope. */
  const keepScope = (e: MouseEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href") || "";
    if (team && (href === CRM.leads || href.startsWith(`${CRM.leads}?`))) setScope(scope, "leads");
  };

  const updated = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const subtitle = loading && !m.total
    ? "Loading leads..."
    : `${m.total} leads, ${m.open} open. ${mode === "local" ? "Local data on this browser." : "Live data."} As of ${updated}.`;

  const actions = (
    <>
      <ScopeSwitch screen="dashboard" />
      <button type="button" className={crm.btn} onClick={doRefresh} disabled={busy} aria-label="Refresh data">
        <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} aria-hidden="true" />
        <span className="max-sm:sr-only">Refresh</span>
      </button>
    </>
  );

  const alert = error || refreshErr;
  const owners = m.owners;
  const ownerPicker = team && owners.length > 0 && (
    <label className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground" data-testid="owner-filter">
      Funnel and breakdown for
      <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner filter" className={cn(crm.input, "h-8 w-auto min-w-[10rem] max-md:h-10")}>
        <option value="">Everyone</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>{o.label} ({o.count})</option>
        ))}
      </select>
    </label>
  );
  const emptyAll = scope === "all" || leadsIn("all").length === 0;

  return (
    <div className="mx-auto max-w-[1400px]" data-testid="crm-dashboard">
      <PageHeader title="Dashboard" subtitle={subtitle} actions={actions} />
      {alert && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {alert}
        </p>
      )}
      {team && <div className="mb-4"><TeamLine /></div>}

      {!loading && m.total === 0 ? (
        <div className="space-y-4">
          {can("demos.manage") && <UnlinkedCallout m={m} />}
          <EmptyState
            title={emptyAll ? "No leads yet" : "No leads here"}
            body={emptyAll
              ? can("finder")
                ? "Find schools, coaching centres, dental clinics and other businesses on Google Maps with the Lead finder, paste a list under Import, or add one by hand. The numbers here fill in as you send."
                : "The numbers here fill in as leads come in and the team sends."
              : "Nothing in this view. Pick All above to count every lead."}
            action={emptyAll && (can("finder") || can("lead.import") || can("lead.add")) ? (
              <div className="flex flex-wrap justify-center gap-2">
                {can("finder") && <Link to={CRM.finder} className={crm.btnPrimary}><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Lead finder</Link>}
                {can("lead.import") && <Link to={CRM.import} className={crm.btn}><Import className="h-3.5 w-3.5" aria-hidden="true" /> Import</Link>}
                {can("lead.add") && <Link to={CRM.newLead} className={crm.btn}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New lead</Link>}
              </div>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-4" onClickCapture={keepScope}>
          <CountTiles m={m} leads={scope === "all" ? undefined : leadsIn(scope)} />
          <RateTiles m={m} />
          {can("clients") && (
            <Suspense fallback={null}>
              <ClientTiles />
            </Suspense>
          )}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <ActivityChart points={m.sendsPerDay} />
              {ownerPicker}
              <div className="grid gap-4 md:grid-cols-2">
                <FunnelPanel m={m} />
                <StatusPanel m={m} />
              </div>
              {/* Side by side only from 2xl: at 1366 px the comparison table had 299 px and lost its Change column. */}
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <BreakdownPanel m={m} />
                <WeekTable m={m} />
              </div>
            </div>
            <aside className="order-first min-w-0 space-y-4 lg:order-none" aria-label="Who to contact">
              {can("demos.manage") && <UnlinkedCallout m={m} />}
              <HotPanel m={m} now={now} />
              <DuePanel m={m} now={now} />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
