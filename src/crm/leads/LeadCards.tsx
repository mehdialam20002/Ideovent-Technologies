import type { LeadStatus } from "@/lib/outreach/types";
import { KIND_LABEL } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { DemoCell, NextAction, StatusSelect } from "./columns";
import { sinceLabel, type LeadRow } from "./leadQuery";

/** The phone layout of the table: one card per lead, same selection and status change. */
export function LeadCards({ rows, selected, onToggle, onOpen, now, setStatus }: {
  rows: LeadRow[];
  selected: Set<string>;
  onToggle: (id: string, index: number, shift: boolean) => void;
  onOpen: (id: string) => void;
  now: Date;
  setStatus: (id: string, s: LeadStatus) => void;
}) {
  return (
    <ul className="space-y-2" aria-label="Leads">
      {rows.map((r, i) => {
        const l = r.lead;
        const sel = selected.has(l.id);
        return (
          <li key={l.id} className={cn(crm.panel, "flex items-stretch overflow-hidden", sel && "border-primary/50 bg-primary/5")}>
            <label className="flex w-11 shrink-0 cursor-pointer items-start justify-center pt-3.5">
              <input type="checkbox" checked={sel} onChange={() => onToggle(l.id, i, false)} aria-label={`Select ${l.instituteName}`}
                className="h-5 w-5 accent-[hsl(var(--primary))]" />
            </label>
            <div className="min-w-0 flex-1 py-2.5 pr-3">
              <button type="button" onClick={() => onOpen(l.id)} className="block w-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="block truncate text-[15px] font-medium">{l.instituteName}</span>
                <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                  {[l.city, KIND_LABEL[l.kind], r.lastContactAt ? `contacted ${sinceLabel(r.lastContactAt, now)}` : "never contacted"].filter(Boolean).join(" · ")}
                </span>
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <StatusSelect status={l.status} label={`Status of ${l.instituteName}`} onChange={(s) => setStatus(l.id, s)} className="-ml-2" />
                {l.nextActionAt && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Next: <NextAction row={r} now={now} />
                  </span>
                )}
                {(r.demo || l.demoSlug) && <DemoCell row={r} />}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
