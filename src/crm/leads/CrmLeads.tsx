import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Settings2, Download, RefreshCw } from "lucide-react";
import type { LeadStatus } from "@/lib/outreach/types";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CRM, useOpenLead } from "../nav";
import { crm, EmptyState, PageHeader } from "../ui";
import { BulkBar, type BulkApi } from "./BulkBar";
import { COLUMNS, loadHidden, saveHidden, type ColId } from "./columns";
import { FilterBar } from "./FilterBar";
import { LeadCards } from "./LeadCards";
import { LeadsTable } from "./LeadsTable";
import { distinct, downloadCsv, matchesFilters, readSort, sortRows, VIEWS, viewOf, writeSort, type SortKey } from "./leadQuery";
import { useLeadRows } from "./useLeadRows";
import { isTypingTarget, useWide, ViewSwitch } from "./ViewSwitch";

const PAGE = 100;

/** /crm/leads: every lead as a sortable, filterable table (cards on phones). */
export default function CrmLeads() {
  const { data, rows, filters, setFilters, params, setParam } = useLeadRows();
  const { leads, now, loading, error, refresh, setStatus: saveStatus, bulkUpdate, bulkDelete } = data;
  const openLead = useOpenLead();
  const wide = useWide();
  const view = viewOf(params.get("view"));
  const sort = readSort(params.get("sort"));

  const filtered = useMemo(() => rows.filter((r) => matchesFilters(r, filters)), [rows, filters]);
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, filtered.filter(v.test).length])), [filtered]);
  const shownAll = useMemo(() => sortRows(filtered.filter(view.test), sort), [filtered, view, sort]);

  const [limit, setLimit] = useState(PAGE);
  const sliceKey = `${view.id}|${params.toString()}`;
  useEffect(() => setLimit(PAGE), [sliceKey]);
  const shown = shownAll.slice(0, limit);

  /* Columns */
  const [hidden, setHidden] = useState<Set<ColId>>(loadHidden);
  const cols = COLUMNS.filter((c) => c.fixed || !hidden.has(c.id));
  const toggleCol = (id: ColId) => {
    const n = new Set(hidden);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setHidden(n);
    saveHidden(n);
  };

  /* Selection */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<number | null>(null);
  useEffect(() => {
    // Leads deleted elsewhere drop out of the selection.
    setSelected((s) => {
      const ids = new Set(leads.map((l) => l.id));
      const n = new Set([...s].filter((id) => ids.has(id)));
      return n.size === s.size ? s : n;
    });
  }, [leads]);
  const onToggle = useCallback(
    (id: string, index: number, shift: boolean) => {
      setSelected((s) => {
        const n = new Set(s);
        if (shift && anchor.current !== null) {
          const [a, b] = [Math.min(anchor.current, index), Math.max(anchor.current, index)];
          const on = !s.has(id);
          for (const r of shown.slice(a, b + 1)) { if (on) n.add(r.lead.id); else n.delete(r.lead.id); }
        } else if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
      anchor.current = index;
    },
    [shown],
  );
  const onToggleAll = () =>
    setSelected((s) => {
      const all = shown.length > 0 && shown.every((r) => s.has(r.lead.id));
      const n = new Set(s);
      for (const r of shown) { if (all) n.delete(r.lead.id); else n.add(r.lead.id); }
      return n;
    });

  /* Results of writes: one polite line, errors in red. */
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    if (!msg || msg.bad) return;
    const t = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [msg]);
  const setStatus = useCallback(
    (id: string, s: LeadStatus) => {
      saveStatus(id, s).catch((e: unknown) => setMsg({ text: e instanceof Error ? e.message : "The status did not save.", bad: true }));
    },
    [saveStatus],
  );

  const selRows = useMemo(() => rows.filter((r) => selected.has(r.lead.id)), [rows, selected]);
  const stamp = () => new Date().toISOString().slice(0, 10);
  const api: BulkApi = {
    count: selected.size,
    people: distinct(leads, (l) => l.assignedTo).map((p) => p.value),
    clear: () => setSelected(new Set()),
    run: async (label, fn) => {
      try {
        await fn();
        setMsg({ text: `${label}.` });
      } catch (e) {
        setMsg({ text: e instanceof Error ? e.message : "Something did not save.", bad: true });
      }
    },
    patch: (p) => bulkUpdate([...selected], p),
    setStatus: (s) => bulkUpdate([...selected], { status: s }),
    addTag: async (tag) => {
      const results = await Promise.allSettled(
        selRows.map((r) => {
          const tags = r.lead.tags || [];
          return tags.includes(tag) ? Promise.resolve() : data.updateLead(r.lead.id, { tags: [...tags, tag] });
        }),
      );
      const failed = results.filter((x) => x.status === "rejected").length;
      if (failed) throw new Error(`${failed} of ${selRows.length} leads did not save.`);
    },
    exportCsv: () => {
      downloadCsv(selRows, `ideovent-leads-selected-${stamp()}.csv`);
      setMsg({ text: `Exported ${selRows.length} ${selRows.length === 1 ? "lead" : "leads"}.` });
    },
    remove: async () => {
      await bulkDelete([...selected]);
      setSelected(new Set());
    },
  };

  /* Keyboard: j/k or arrows move, Enter opens, x selects, Escape clears. */
  const [focus, setFocus] = useState(0);
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => setFocus((f) => Math.min(f, Math.max(0, shown.length - 1))), [shown.length]);
  useEffect(() => {
    if (!wide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      const el = e.target as HTMLElement;
      const onRowOrPage = el === document.body || el.tagName === "TR" || el.id === "crm-main";
      const move = (d: number) => {
        e.preventDefault();
        setFocus((f) => Math.max(0, Math.min(shown.length - 1, f + d)));
        setFocusTick((t) => t + 1);
      };
      if (e.key === "j" || (e.key === "ArrowDown" && onRowOrPage)) move(1);
      else if (e.key === "k" || (e.key === "ArrowUp" && onRowOrPage)) move(-1);
      else if (e.key === "Enter" && onRowOrPage && shown[focus]) {
        e.preventDefault();
        openLead(shown[focus].lead.id);
      } else if (e.key === "x" && shown[focus]) {
        e.preventDefault();
        onToggle(shown[focus].lead.id, focus, e.shiftKey);
      } else if (e.key === "Escape" && selected.size) setSelected(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide, shown, focus, openLead, onToggle, selected.size]);

  const onSort = (key: SortKey) => {
    const firstDesc = key === "created" || key === "lastContact" || key === "demo";
    const dir = sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : firstDesc ? "desc" : "asc";
    setParam("sort", writeSort({ key, dir }));
  };

  const [spinning, setSpinning] = useState(false);
  const doRefresh = async () => {
    setSpinning(true);
    try {
      await refresh();
    } finally {
      setSpinning(false);
    }
  };
  const resetCols = () => {
    const d = new Set(COLUMNS.filter((c) => c.defaultHidden).map((c) => c.id));
    setHidden(d);
    saveHidden(d);
  };
  const bad = !!(msg?.bad || (!msg && error));

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={<span className={crm.num}>{loading ? "Loading..." : `${shownAll.length} of ${leads.length} leads`}</span>}
        actions={
          <>
            <ViewSwitch current="table" params={params} />
            {wide && (
              <DropdownMenu>
                <DropdownMenuTrigger className={crm.btn} aria-label="Columns">
                  <Settings2 className="h-4 w-4" aria-hidden="true" /> <span className="hidden lg:inline">Columns</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-[12px] text-muted-foreground">Show columns</DropdownMenuLabel>
                  {COLUMNS.filter((c) => !c.fixed).map((c) => (
                    <DropdownMenuCheckboxItem key={c.id} checked={!hidden.has(c.id)} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol(c.id)}>
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={resetCols}>Reset columns</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button type="button" className={cn(crm.btn, "max-md:h-10")} onClick={() => downloadCsv(shownAll, `ideovent-leads-${view.id}-${stamp()}.csv`)}
              disabled={!shownAll.length} title="Export this view as CSV">
              <Download className="h-4 w-4" aria-hidden="true" /> <span className="hidden lg:inline">Export</span>
              <span className="sr-only lg:hidden">Export CSV</span>
            </button>
            <button type="button" className={cn(crm.btn, "max-md:h-10")} onClick={() => void doRefresh()} aria-label="Refresh" title="Refresh">
              <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} aria-hidden="true" />
            </button>
          </>
        }
      />

      <div role="tablist" aria-label="Saved views" className="-mx-3 mb-3 flex gap-1 overflow-x-auto border-b border-border px-3 md:mx-0 md:px-0">
        {VIEWS.map((v) => {
          const on = v.id === view.id;
          if (v.extra && !on) return null;
          return (
            <button key={v.id} type="button" role="tab" aria-selected={on} onClick={() => setParam("view", v.id === "open" ? "" : v.id)}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                on ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              {v.label}
              <span className={cn("rounded-full px-1.5 text-[11px]", crm.num, on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{counts[v.id]}</span>
            </button>
          );
        })}
      </div>

      <FilterBar leads={leads} filters={filters} setFilters={setFilters} />

      <div aria-live="polite">
        {(msg || error) && (
          <p role={bad ? "alert" : undefined}
            className={cn("mb-2 rounded-lg border px-3 py-2 text-[13px]", bad ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted/50")}>
            {msg?.text || error}
          </p>
        )}
      </div>

      {selected.size > 0 && <BulkBar api={api} />}

      {!loading && shownAll.length === 0 ? (
        <EmptyState
          title={leads.length ? "No leads match" : "No leads yet"}
          body={leads.length ? "Try another view or clear the filters." : "Find leads on the map, import a CSV, or add one by hand."}
          action={
            leads.length ? (
              <Link to={CRM.leads} className={crm.btn}>Show all open leads</Link>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <Link to={CRM.finder} className={crm.btn}>Lead finder</Link>
                <Link to={CRM.import} className={crm.btn}>Import</Link>
                <Link to={CRM.newLead} className={crm.btnPrimary}>New lead</Link>
              </div>
            )
          }
        />
      ) : wide ? (
        <LeadsTable rows={shown} cols={cols} selected={selected} onToggle={onToggle} onToggleAll={onToggleAll} focus={focus} setFocus={setFocus}
          sort={sort} onSort={onSort} onOpen={openLead} now={now} setStatus={setStatus} focusTick={focusTick} />
      ) : (
        <LeadCards rows={shown} selected={selected} onToggle={onToggle} onOpen={openLead} now={now} setStatus={setStatus} />
      )}

      {shownAll.length > shown.length && (
        <div className="mt-3 flex items-center justify-center gap-3 text-[13px] text-muted-foreground">
          <span className={crm.num}>Showing {shown.length} of {shownAll.length}</span>
          <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => setLimit((l) => l + PAGE)}>
            Show {Math.min(PAGE, shownAll.length - shown.length)} more
          </button>
        </div>
      )}
      {wide && shown.length > 0 && (
        <p className="mt-3 hidden text-[12px] text-muted-foreground lg:block">
          <Kbd>j</Kbd> <Kbd>k</Kbd> move, <Kbd>Enter</Kbd> opens, <Kbd>x</Kbd> selects, Shift+click selects a range, <Kbd>Esc</Kbd> clears.
        </p>
      )}
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-border bg-muted/50 px-1 font-sans text-[11px]">{children}</kbd>;
}
