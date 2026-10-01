import { useState } from "react";
import { Link } from "react-router-dom";
import { Import, MapPin, Plus, RefreshCw } from "lucide-react";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm, EmptyState, PageHeader } from "../ui";
import { cn } from "@/lib/utils";
import { CountTiles, RateTiles } from "./KpiTiles";
import { ActivityChart } from "./ActivityChart";
import { FunnelPanel, StatusPanel } from "./FunnelPanel";
import { BreakdownPanel } from "./BreakdownPanel";
import { DuePanel, HotPanel, UnlinkedCallout } from "./SidePanels";
import { WeekTable } from "./WeekTable";

/**
 * /crm: how outreach is going, and what to do about it.
 *
 * Top: counts (how many leads reached each step) and rates (how well each
 * step converts, plus the work waiting). Middle: 30 days of activity, the
 * funnel, where leads sit now, breakdowns. Right: who to call first.
 * Every number comes from metrics.ts, so it agrees with the table and Today.
 */
export default function CrmDashboard() {
  const { metrics: m, now, loading, error, mode, refresh } = useCrmData();
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

  const updated = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const subtitle = loading && !m.total
    ? "Loading leads..."
    : `${m.total} leads, ${m.open} open. ${mode === "local" ? "Local data on this browser." : "Live data."} As of ${updated}.`;

  const actions = (
    <>
      <button type="button" className={crm.btn} onClick={doRefresh} disabled={busy} aria-label="Refresh data">
        <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} aria-hidden="true" />
        <span className="max-sm:sr-only">Refresh</span>
      </button>
    </>
  );

  const alert = error || refreshErr;

  return (
    <div className="mx-auto max-w-[1400px]" data-testid="crm-dashboard">
      <PageHeader title="Dashboard" subtitle={subtitle} actions={actions} />
      {alert && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {alert}
        </p>
      )}

      {!loading && m.total === 0 ? (
        <div className="space-y-4">
          <UnlinkedCallout m={m} />
          <EmptyState
            title="No leads yet"
            body="Find schools, coaching centres, dental clinics and other businesses on Google Maps with the Lead finder, paste a list under Import, or add one by hand. The numbers here fill in as you send."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to={CRM.finder} className={crm.btnPrimary}><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Lead finder</Link>
                <Link to={CRM.import} className={crm.btn}><Import className="h-3.5 w-3.5" aria-hidden="true" /> Import</Link>
                <Link to={CRM.newLead} className={crm.btn}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New lead</Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <CountTiles m={m} />
          <RateTiles m={m} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <ActivityChart points={m.sendsPerDay} />
              <div className="grid gap-4 md:grid-cols-2">
                <FunnelPanel m={m} />
                <StatusPanel m={m} />
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <BreakdownPanel m={m} />
                <WeekTable m={m} />
              </div>
            </div>
            <aside className="order-first min-w-0 space-y-4 lg:order-none" aria-label="Who to contact">
              <UnlinkedCallout m={m} />
              <HotPanel m={m} now={now} />
              <DuePanel m={m} now={now} />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
