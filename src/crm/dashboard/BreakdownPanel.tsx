import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KIND_LABEL } from "@/admin/outreach/ui";
import { rate, type BreakdownDim, type BreakdownRow, type CrmMetrics } from "../metrics";
import { useCrmData } from "../useCrmData";
import { NONE } from "../leads/leadQuery";
import { crm, pct } from "../ui";
import { cn } from "@/lib/utils";
import { leadsLink } from "./KpiTiles";

const TABS: { dim: BreakdownDim; label: string }[] = [
  { dim: "city", label: "City" },
  { dim: "kind", label: "Kind" },
  { dim: "source", label: "Source" },
  { dim: "assignee", label: "Assignee" },
];

function rowsFor(m: CrmMetrics, dim: BreakdownDim): BreakdownRow[] {
  return dim === "city" ? m.byCity : dim === "kind" ? m.byKind : dim === "source" ? m.bySource : m.byAssignee;
}

function labelFor(dim: BreakdownDim, r: BreakdownRow): string {
  if (dim === "kind") return KIND_LABEL[r.label] || r.label;
  return r.label;
}

/**
 * The leads table's filter for one assignee row (leads/leadQuery.ts): a
 * person by id; an old free-text label ("Old: Aman") as that label on a lead
 * nobody works yet; Unassigned as the pool without an old label. Null: the row
 * opens nothing (Unassigned before the team, which the table cannot pick).
 */
function assigneeFilter(r: BreakdownRow, team: boolean): Record<string, string> | null {
  if (r.personId) return { assignee: r.personId };
  if (r.oldLabel) return team ? { assignee: NONE, old: r.oldLabel } : { assignee: r.oldLabel };
  return team ? { assignee: NONE, old: NONE } : null;
}

/**
 * Where leads come from and how each group answers: by city, kind, source and
 * assignee (a person, or an old label as "Old: Aman"). A row opens those leads
 * in the table, in the dashboard's own scope.
 */
export function BreakdownPanel({ m }: { m: CrmMetrics }) {
  const [dim, setDim] = useState<BreakdownDim>("city");
  const [all, setAll] = useState(false);
  const navigate = useNavigate();
  const { scopes, scopeFor, setScope, me } = useCrmData();
  const team = Boolean(me.role) && !me.legacy;
  const rows = rowsFor(m, dim);
  const shown = all ? rows : rows.slice(0, 8);
  const target = (r: BreakdownRow): Record<string, string> | null => {
    if (dim === "assignee") return assigneeFilter(r, team);
    return r.key === "__none__" ? null : { [dim]: r.label };
  };
  const open = (r: BreakdownRow) => {
    const f = target(r);
    if (!f) return;
    if (scopes.length) setScope(scopeFor("dashboard"), "leads");
    navigate(leadsLink({ view: "all", ...f }));
  };

  return (
    <section className={cn(crm.panel, "overflow-hidden")} aria-labelledby="bd-h" data-testid="breakdown">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
        <h2 id="bd-h" className={crm.label}>Breakdown</h2>
        <div role="tablist" aria-label="Group leads by" className="inline-flex rounded-lg bg-muted p-0.5">
          {TABS.map((t) => (
            <button
              key={t.dim}
              role="tab"
              type="button"
              aria-selected={dim === t.dim}
              onClick={() => { setDim(t.dim); setAll(false); }}
              className={cn(
                "h-8 rounded-md px-2.5 text-[12.5px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dim === t.dim && "bg-background text-foreground shadow-sm",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-[13px] text-muted-foreground">No leads yet. Groups show here once leads come in.</p>
      ) : (
        <div className="mt-3 overflow-x-auto" role="tabpanel">
          <table className={crm.table}>
            <thead>
              <tr>
                <th scope="col" className={cn(crm.th, "static pl-4 sm:pl-5")}>{TABS.find((t) => t.dim === dim)?.label}</th>
                <th scope="col" className={cn(crm.th, "static text-right")}>Leads</th>
                <th scope="col" className={cn(crm.th, "static hidden text-right sm:table-cell")}>Open</th>
                <th scope="col" className={cn(crm.th, "static text-right")}>Contacted</th>
                <th scope="col" className={cn(crm.th, "static text-right")}>Reply rate</th>
                <th scope="col" className={cn(crm.th, "static pr-4 text-right sm:pr-5")}>Won</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const none = !target(r);
                return (
                  <tr
                    key={r.key}
                    tabIndex={none ? undefined : 0}
                    onClick={() => open(r)}
                    onKeyDown={(e) => e.key === "Enter" && open(r)}
                    className={cn(!none && crm.row)}
                  >
                    <td className={cn(crm.td, "max-w-[160px] truncate pl-4 sm:pl-5", none && "text-muted-foreground")}>{labelFor(dim, r)}</td>
                    <td className={cn(crm.td, crm.num, "text-right font-medium")}>{r.total}</td>
                    <td className={cn(crm.td, crm.num, "hidden text-right sm:table-cell")}>{r.open}</td>
                    <td className={cn(crm.td, crm.num, "text-right")}>{r.contacted}</td>
                    <td className={cn(crm.td, crm.num, "text-right")}>{pct(rate(r.replied, r.contacted))}</td>
                    <td className={cn(crm.td, crm.num, "pr-4 text-right sm:pr-5")}>{r.won}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 8 && (
        <div className="px-4 py-2.5 sm:px-5">
          <button type="button" className={crm.btnGhost} onClick={() => setAll((v) => !v)}>
            {all ? "Show top 8" : `Show all ${rows.length}`}
          </button>
        </div>
      )}
      {dim === "assignee" && rows.length > 0 && rows.every((r) => r.key === "__none__") && (
        <p className="px-5 pb-4 text-[12px] text-muted-foreground">
          {team ? "Nobody is assigned yet. Select leads in the Leads table and use Assign to, or Share out." : "Nobody is assigned yet. Set Assigned on a lead, or in bulk from the Leads table."}
        </p>
      )}
    </section>
  );
}
