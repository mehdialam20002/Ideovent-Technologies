import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Flame, Search, SlidersHorizontal, TimerOff, X } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type OutreachLead } from "@/lib/outreach/types";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KIND_LABEL } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { crm, StatusDot } from "../ui";
import { activeFilterCount, distinct, EMPTY_FILTERS, NONE, type LeadFilters } from "./leadQuery";

const selectCls =
  "h-9 rounded-lg border border-input bg-background px-2 text-[13px] md:w-[7.75rem] 2xl:w-auto 2xl:max-w-[11rem] 2xl:px-2.5 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring max-md:h-11 max-md:max-w-none max-md:w-full";

function Pick({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn(selectCls, value && "border-primary/60 text-foreground")}>
      <option value="">{label}: any</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      <option value={NONE}>{label}: not set</option>
    </select>
  );
}

function Toggle({ on, onClick, icon: Icon, children }: { on: boolean; onClick: () => void; icon: typeof Flame; children: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      title={children}
      className={cn(crm.btn, "max-md:h-11 md:max-2xl:px-2.5", on && "border-primary/60 bg-primary/10 text-primary hover:bg-primary/15")}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> <span className="md:max-2xl:sr-only">{children}</span>
    </button>
  );
}

/**
 * Search plus filters. Every value lives in the URL (see leadQuery), so the
 * table, the board and a dashboard link all read the same slice.
 */
export function FilterBar({ leads, filters, setFilters, showStatus = true }: {
  leads: OutreachLead[];
  filters: LeadFilters;
  setFilters: (p: Partial<LeadFilters>) => void;
  showStatus?: boolean;
}) {
  // Typing is local; the URL follows 200 ms later so history stays calm.
  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => {
    if (q === filters.q) return;
    const id = window.setTimeout(() => setFilters({ q }), 200);
    return () => window.clearTimeout(id);
  }, [q, filters.q, setFilters]);

  const [open, setOpen] = useState(false);
  const cities = useMemo(() => distinct(leads, (l) => l.city).map((c) => ({ value: c.value, label: `${c.value} (${c.count})` })), [leads]);
  const sources = useMemo(() => distinct(leads, (l) => l.source).map((c) => ({ value: c.value, label: `${c.value} (${c.count})` })), [leads]);
  const people = useMemo(() => distinct(leads, (l) => l.assignedTo).map((c) => ({ value: c.value, label: c.value })), [leads]);
  const kinds = Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }));
  const n = activeFilterCount({ ...filters, status: showStatus ? filters.status : [] });

  return (
    <div className="mb-3 space-y-2">
      <div className="flex gap-2 md:flex-wrap md:items-center md:gap-1.5 2xl:gap-2">
        <label className="relative min-w-0 flex-1 md:min-w-[10rem] md:max-w-[15rem] 2xl:max-w-xs">
          <span className="sr-only">Search leads</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city, phone, email"
            onKeyDown={(e) => e.key === "Escape" && (e.currentTarget.blur(), setQ(""))}
            className={cn(crm.input, "pl-8 max-md:h-11 max-md:text-base")} />
        </label>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cn(crm.btn, "h-11 md:hidden")}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{n ? ` (${n})` : ""}
        </button>
        <div className="hidden md:contents">
          {controls()}
        </div>
      </div>
      {open && <div className="grid grid-cols-2 gap-2 md:hidden">{controls()}</div>}
    </div>
  );

  function controls() {
    return (
      <>
        {showStatus && (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(crm.btn, "max-md:h-11 max-md:w-full", filters.status.length && "border-primary/60")}>
              Status{filters.status.length ? `: ${filters.status.length}` : ""} <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {LEAD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={filters.status.includes(s)} onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(c) => setFilters({ status: c ? [...filters.status, s] : filters.status.filter((x) => x !== s) })}>
                  <StatusDot status={s} className="mr-2" /> {LEAD_STATUS_LABELS[s]}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!filters.status.length} onSelect={() => setFilters({ status: [] })}>Any status</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Pick label="Kind" value={filters.kind} onChange={(kind) => setFilters({ kind })} options={kinds} />
        <Pick label="City" value={filters.city} onChange={(city) => setFilters({ city })} options={cities} />
        <Pick label="Source" value={filters.source} onChange={(source) => setFilters({ source })} options={sources} />
        <Pick label="Assigned" value={filters.assignee} onChange={(assignee) => setFilters({ assignee })} options={people} />
        <select aria-label="Demo" value={filters.demo} onChange={(e) => setFilters({ demo: e.target.value as LeadFilters["demo"] })}
          className={cn(selectCls, filters.demo && "border-primary/60")}>
          <option value="">Demo: any</option>
          <option value="yes">Has a demo</option>
          <option value="no">No demo</option>
        </select>
        <Toggle on={filters.hot} onClick={() => setFilters({ hot: !filters.hot })} icon={Flame}>Hot</Toggle>
        <Toggle on={filters.overdue} onClick={() => setFilters({ overdue: !filters.overdue })} icon={TimerOff}>Overdue</Toggle>
        {n > 0 && (
          <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })} className={cn(crm.btnGhost, "max-md:h-11")}>
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
          </button>
        )}
      </>
    );
  }
}
