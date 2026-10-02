import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  connect, fetchNow, loadLog, loadStatus, loadWaiting,
  type MetaAction, type MetaLogLine, type MetaStatusResult, type MetaWaitingRow,
} from "@/lib/meta/client";
import { localCounts, localLog, localSettings, META_DEFAULT_SETTINGS } from "@/lib/meta/localIntake";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm, PageHeader } from "../ui";
import { MetaAssign } from "./MetaAssign";
import { MetaChecklist } from "./MetaChecklist";
import { MetaLog } from "./MetaLog";
import { MetaRelayHelp } from "./MetaRelayHelp";
import { MetaSimulate } from "./MetaSimulate";
import { MetaStatus } from "./MetaStatus";

/**
 * CRM > SETTINGS > META LEAD ADS (/settings/meta on crm.ideovent.in,
 * /crm/settings/meta on the main site; meta-leads-spec 6.1). Mehdi only
 * (App.tsx RoleGate "settings"; the database refuses everyone else anyway).
 *
 *   1. Status: connection, token, Page, the last lead, what is waiting, the
 *      daily check, today's limit; Connect / Check again, Fetch missed leads now.
 *   2. Where new Meta leads go, and the daily limit.
 *   3. Set up, step by step (section 8 of the spec, ticked where it can know).
 *   4. The log (ids only) and what is waiting at Meta.
 *   5. The Make fallback, collapsed.
 *
 * Local mode never calls /api: it says real leads come in on the live CRM,
 * and Simulate puts a fictional one through the same rules (localIntake.ts).
 * Phone first: one column, two from 1280 px.
 */
export default function MetaLeadsPage() {
  const [status, setStatus] = useState<MetaStatusResult | null>(null);
  const [log, setLog] = useState<MetaLogLine[] | null>(null);
  const [logNote, setLogNote] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<MetaWaitingRow[]>([]);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<"connect" | "fetch" | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const load = useCallback(async () => {
    const s = await loadStatus();
    setStatus(s);
    if (s.kind === "local") {
      setLog(localLog(100));
      setWaiting([]);
      setLogNote(null);
      return;
    }
    if (s.kind !== "ok") {
      setLog([]);
      setWaiting([]);
      setLogNote(s.kind === "missing" ? "The log starts once 0012 is run." : null);
      return;
    }
    const [l, w] = await Promise.all([loadLog(100), loadWaiting()]);
    setLog(l.kind === "ok" ? l.rows : []);
    setLogNote(l.kind === "error" ? `The log did not load: ${l.message}` : null);
    setWaiting(w.kind === "ok" ? w.rows : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  const local = status?.kind === "local";
  const numbers = useMemo(() => localCounts(), [tick, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const settings = useMemo(
    () => (status?.kind === "ok" ? { assignMode: status.status.assignMode, dailyCap: status.status.dailyCap } : local ? localSettings() : { ...META_DEFAULT_SETTINGS }),
    [status, local, tick], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const blocked = !status ? "Checking..."
    : status.kind === "local" || status.kind === "ok" ? null
    : status.kind === "missing" ? "Saved once 0012 is run in Supabase."
    : status.noApi ? "Saved on the live CRM: the Meta functions run on Vercel." : "Saved once the status loads: refresh the page.";

  const act = async (which: "connect" | "fetch") => {
    setBusy(which);
    setMsg(null);
    const r: MetaAction = await (which === "connect" ? connect() : fetchNow());
    if (r.kind === "ok") setMsg({ text: r.text });
    else if (r.kind === "error") setMsg({ text: r.message, bad: true });
    else if (r.kind === "missing") setMsg({ text: "Run 0012 in Supabase first: see the steps.", bad: true });
    setBusy(null);
    setTick((t) => t + 1);
  };

  return (
    <div data-testid="meta-leads-page" className="mx-auto max-w-6xl">
      <PageHeader
        title="Meta Lead Ads"
        subtitle="Leads from your Facebook and Instagram forms come into the CRM by themselves."
        actions={
          <Link to={CRM.settings} className={cn(crm.btn, "max-md:h-11")}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
          </Link>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <div className="min-w-0 space-y-4">
          <MetaStatus result={status} local={numbers} busy={busy} message={msg} onConnect={() => void act("connect")} onFetch={() => void act("fetch")} />
          <MetaAssign live={status?.kind === "ok"} initial={settings} blocked={blocked} onSaved={() => setTick((t) => t + 1)} />
          {local && <MetaSimulate onDone={() => setTick((t) => t + 1)} />}
        </div>
        <div className="min-w-0 space-y-4">
          <MetaChecklist result={status} />
          <MetaLog lines={log} waiting={waiting} note={logNote} />
          <MetaRelayHelp />
        </div>
      </div>
    </div>
  );
}
