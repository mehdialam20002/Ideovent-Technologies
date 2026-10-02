import { useEffect, useRef, type MouseEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { LeadStatus } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import type { CellCtx, Column } from "./columns";
import type { LeadRow, Sort, SortKey } from "./leadQuery";

export interface TableProps {
  rows: LeadRow[];
  cols: Column[];
  selected: Set<string>;
  onToggle: (id: string, index: number, shift: boolean) => void;
  onToggleAll: () => void;
  focus: number;
  setFocus: (i: number) => void;
  sort: Sort;
  onSort: (k: SortKey) => void;
  onOpen: (id: string) => void;
  now: Date;
  setStatus: (id: string, s: LeadStatus) => void;
  /** Bumped when the keyboard moves focus, so the row takes DOM focus. */
  focusTick: number;
  /** Masking and the status rules for the person signed in (the team). */
  cellCtx?: Omit<CellCtx, "now" | "setStatus">;
}

/** True when the click landed on a control inside the row, not the row itself. */
function onControl(e: MouseEvent): boolean {
  return !!(e.target as HTMLElement).closest("input, select, button, a, label");
}

export function LeadsTable(p: TableProps) {
  const body = useRef<HTMLTableSectionElement>(null);
  useEffect(() => {
    if (!p.focusTick) return;
    const tr = body.current?.children[p.focus] as HTMLElement | undefined;
    tr?.focus({ preventScroll: false });
    tr?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focusTick]);

  const all = p.rows.length > 0 && p.rows.every((r) => p.selected.has(r.lead.id));
  const some = !all && p.rows.some((r) => p.selected.has(r.lead.id));

  return (
    <div className={cn(crm.panel, "max-h-[calc(100dvh-15.5rem)] min-h-[12rem] overflow-auto")}>
      <table className={crm.table} aria-label="Leads" aria-rowcount={p.rows.length + 1}>
        <thead>
          <tr>
            <th className={cn(crm.th, "w-10 pr-0")} scope="col">
              <input type="checkbox" aria-label={all ? "Unselect all shown" : "Select all shown"} checked={all}
                ref={(el) => el && (el.indeterminate = some)} onChange={p.onToggleAll}
                className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]" />
            </th>
            {p.cols.map((c) => {
              const active = p.sort.key === c.id;
              return (
                <th key={c.id} scope="col" className={crm.th} aria-sort={active ? (p.sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => p.onSort(c.id)}
                    className={cn("-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "text-foreground")}>
                    {c.label}
                    {active && (p.sort.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={body}>
          {p.rows.map((r, i) => {
            const sel = p.selected.has(r.lead.id);
            return (
              <tr
                key={r.lead.id}
                tabIndex={i === p.focus ? 0 : -1}
                aria-selected={sel}
                data-focused={i === p.focus || undefined}
                onFocus={() => i !== p.focus && p.setFocus(i)}
                onClick={(e) => {
                  if (onControl(e)) return;
                  if (e.shiftKey || e.metaKey || e.ctrlKey) p.onToggle(r.lead.id, i, e.shiftKey);
                  else p.onOpen(r.lead.id);
                }}
                className={cn(crm.row, "group data-[focused]:shadow-[inset_2px_0_0_hsl(var(--primary))]", sel && "bg-primary/5")}
              >
                <td className={cn(crm.td, "w-10 pr-0")}>
                  <input type="checkbox" aria-label={`Select ${r.lead.instituteName}`} checked={sel}
                    onClick={(e) => { e.stopPropagation(); p.onToggle(r.lead.id, i, e.shiftKey); }} onChange={() => undefined}
                    className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]" />
                </td>
                {p.cols.map((c) => (
                  <td key={c.id} className={cn(crm.td, c.className)}>
                    {c.cell(r, { ...p.cellCtx, now: p.now, setStatus: p.setStatus })}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
