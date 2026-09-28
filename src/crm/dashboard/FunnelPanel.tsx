import { Link } from "react-router-dom";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/outreach/types";
import type { CrmMetrics } from "../metrics";
import { crm, pct, STATUS_HEX, StatusDot } from "../ui";
import { cn } from "@/lib/utils";
import { leadsLink } from "./KpiTiles";

/** New to Won: how many leads reached each step, and the share that moved on. */
export function FunnelPanel({ m }: { m: CrmMetrics }) {
  const top = m.funnel[0]?.count || 0;
  return (
    <section className={cn(crm.panel, crm.panelPad)} aria-labelledby="funnel-h" data-testid="funnel">
      <h2 id="funnel-h" className={crm.label}>Funnel, New to Won</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">Every lead counted at the furthest step it reached, lost ones included.</p>
      {top === 0 ? (
        <p className="mt-6 text-[13px] text-muted-foreground">Add leads to see how far they get.</p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {m.funnel.map((f, i) => {
            const w = top ? Math.max(f.count / top, f.count ? 0.02 : 0) : 0;
            return (
              <li key={f.stage} className="grid grid-cols-[92px_1fr_auto] items-center gap-3 text-[13px] sm:grid-cols-[120px_1fr_auto]">
                <span className="truncate text-muted-foreground">{f.label}</span>
                <span className="relative h-6 overflow-hidden rounded-md bg-muted/60">
                  <span
                    className="absolute inset-y-0 left-0 rounded-md bg-primary"
                    style={{ width: `${w * 100}%`, opacity: 1 - i * 0.12 }}
                  />
                </span>
                <span className={cn("w-[88px] text-right", crm.num)}>
                  <span className="font-semibold">{f.count}</span>
                  {i > 0 && <span className="ml-1.5 text-[11.5px] text-muted-foreground">{pct(f.fromPrev)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** Where every lead sits right now. A bar opens the table filtered to that status. */
export function StatusPanel({ m }: { m: CrmMetrics }) {
  const max = Math.max(1, ...LEAD_STATUSES.map((s) => m.byStatus[s]));
  return (
    <section className={cn(crm.panel, crm.panelPad)} aria-labelledby="status-h" data-testid="by-status">
      <h2 id="status-h" className={crm.label}>Pipeline by status</h2>
      <ul className="mt-3 space-y-0.5">
        {LEAD_STATUSES.map((s) => {
          const n = m.byStatus[s];
          return (
            <li key={s}>
              <Link
                to={leadsLink({ status: s })}
                className="grid grid-cols-[112px_1fr_36px] items-center gap-3 rounded-md px-1.5 py-1 text-[13px] hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <StatusDot status={s} />
                  <span className="truncate">{LEAD_STATUS_LABELS[s]}</span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-muted/60">
                  <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, backgroundColor: STATUS_HEX[s] }} />
                </span>
                <span className={cn("text-right font-medium", crm.num, !n && "text-muted-foreground")}>{n}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
