import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import type { DbUsage } from "@/lib/outreach/team";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { crm } from "../ui";
import { fmtBytes } from "./teamUi";
import { teamStore } from "./useTeam";

/** Supabase Free's limit: past it the whole project goes read-only (every save fails, the site's forms too). */
export const FREE_PLAN_BYTES = 500 * 1024 * 1024;

/**
 * THE DATABASE'S SIZE (spec 10.2; DPDP r.6(d)): Mehdi only. Amber at 70%,
 * red at 85%, with what to do before Supabase Free stops every save. In
 * local mode it is this browser's copy instead (there is no database).
 */
export function DbUsageCard({ className }: { className?: string }) {
  const { isOwner, mode, me } = useCrmMe();
  const [usage, setUsage] = useState<DbUsage | null | undefined>(undefined);
  useEffect(() => {
    if (!isOwner || me.legacy) return;
    let live = true;
    teamStore()
      .dbUsage()
      .then((u) => live && setUsage(u))
      .catch(() => live && setUsage(null));
    return () => {
      live = false;
    };
  }, [isOwner, me.legacy]);
  if (!isOwner || me.legacy || usage === undefined) return null;

  const local = mode === "local";
  const used = usage?.databaseBytes ?? 0;
  const share = used / FREE_PLAN_BYTES;
  const tone = share >= 0.85 ? "bad" : share >= 0.7 ? "warn" : "ok";
  return (
    <section data-testid="db-usage" aria-labelledby="db-usage-h" className={cn(crm.panel, crm.panelPad, className)}>
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="db-usage-h" className={crm.label}>Database</h2>
      </div>
      {!usage ? (
        <p className="mt-2 text-[13px] text-muted-foreground">The size could not be read just now.</p>
      ) : local ? (
        <p className="mt-2 text-[13px]">
          Local mode: this browser holds <strong className={crm.num}>{fmtBytes(used)}</strong> of CRM and site data
          ({fmtBytes(usage.crmBytes)} of it the CRM). The live site's limit is 500 MB on the Free plan.
        </p>
      ) : (
        <>
          <p className={cn("mt-2 text-[15px] font-medium", crm.num)}>
            {fmtBytes(used)} of 500 MB <span className="text-[13px] font-normal text-muted-foreground">(Free plan)</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(share * 100))} aria-label="Database used">
            <div className={cn("h-full rounded-full", tone === "bad" ? "bg-destructive" : tone === "warn" ? "bg-amber-500" : "bg-primary")}
              style={{ width: `${Math.min(100, Math.max(1, share * 100))}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">The CRM's own tables: {fmtBytes(usage.crmBytes)}.</p>
          {tone !== "ok" && (
            <p className={cn("mt-2 text-[13px]", tone === "bad" ? "text-destructive" : "text-amber-800 dark:text-amber-300")}>
              Supabase Free stops all saves at 500 MB: upgrade to Pro or ask for a clean-up.
            </p>
          )}
        </>
      )}
    </section>
  );
}
