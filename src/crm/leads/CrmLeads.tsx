import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Settings2, Download, RefreshCw, Shuffle } from "lucide-react";
import type { LeadStatus } from "@/lib/outreach/types";
import { crmErrorText } from "@/lib/outreach/access";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CRM, useOpenLead } from "../nav";
import { crm, EmptyState, PageHeader } from "../ui";
import { useCrmMe } from "../useCrmMe";
import { useAssigneeOptions } from "../team/AssigneePicker";
import { DistributeDialog } from "../team/DistributeDialog";
import { plural } from "../team/teamUi";
import { BulkBar, LostReasonPrompt, type BulkApi } from "./BulkBar";
import { COLUMNS, loadHidden, saveHidden, type ColId, type StatusBlock } from "./columns";
import { FilterBar } from "./FilterBar";
import { LeadCards, OverviewList } from "./LeadCards";
import { LeadsTable } from "./LeadsTable";
import { distinct, downloadCsv, matchesFilters, readSort, sortRows, statusBlock, VIEWS, writeSort, type SortKey } from "./leadQuery";
import { useLeadRows } from "./useLeadRows";
import { isTypingTarget, ScopeSwitch, useWide, ViewSwitch } from "./ViewSwitch";

const PAGE = 100;

/**
 * /crm/leads: every lead as a sortable, filterable table (cards on phones).
 *
 * Since the team (spec 10.3, 10.4): Mehdi and admins pick whose leads (Mine,
 * Team, All, Unassigned), assign a selection to a person or share it out, and
 * see who works each lead. A member sees "My leads" (the only ones the
 * database returns them), contacts masked in the list, no Export or Delete;
 * with "See all leads", every other lead below, read only and without
 * contacts. Only Mehdi exports, and his export is logged.
 */
export default function CrmLeads() {
  const { data, rows, filters, setFilters, params, setParam } = useLeadRows();
  const { leads, now, loading, error, refresh, setStatus: saveStatus, bulkUpdate, bulkDelete, me, isStaff, isMember, overview, scope } = data;
  const { can } = useCrmMe();
  const teamOn = Boolean(me.role) && !me.legacy;
  const openLead = useOpenLead();
  const wide = useWide();
  const views = useMemo(() => VIEWS.filter((v) => !v.team || (teamOn && isStaff)), [teamOn, isStaff]);
  const view = views.find((v) => v.id === params.get("view")) || views[0];
  const sort = readSort(params.get("sort"));

  const filtered = useMemo(() => rows.filter((r) => matchesFilters(r, filters)), [rows, filters]);
  const counts = useMemo(() => Object.fromEntries(views.map((v) => [v.id, filtered.filter(v.test).length])), [filtered, views]);
  const shownAll = useMemo(() => sortRows(filtered.filter(view.test), sort), [filtered, view, sort]);

  const [limit, setLimit] = useState(PAGE);
  const sliceKey = `${view.id}|${scope}|${params.toString()}`;
  useEffect(() => setLimit(PAGE), [sliceKey]);
  const shown = shownAll.slice(0, limit);

  /* Columns: the Old label exists only with the team; whose a lead is means nothing to a member (all theirs). */
  const [hidden, setHidden] = useState<Set<ColId>>(loadHidden);
  const available = COLUMNS.filter((c) => (!c.team || teamOn) && !(isMember && (c.id === "assigned" || c.id === "oldLabel")));
  const cols = available.filter((c) => c.fixed || !hidden.has(c.id));
  const toggleCol = (id: ColId) => {
    const n = new Set(hidden);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setHidden(n);
    saveHidden(n);
  };

  /* What this person may not do to a lead's status (the database refuses the same). Mehdi: nothing held back. */
  const role = me.role;
  const block: StatusBlock | undefined = useMemo(
    () => (teamOn && role && role !== "owner" ? (lead, to) => statusBlock(role, lead.status, to) : undefined),
    [teamOn, role],
  );

  /* Selection */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<number | null>(null);
  useEffect(() => {
    // Leads deleted (or moved away) elsewhere drop out of the selection.
    setSelected((s) => {
      const ids = new Set(leads.map((l) => l.id));
      const n = new Set([...s].filter((id) => ids.has(id)));
      return n.size === s.size ? s : n;
    });
  }, [leads]);
  /* Another scope is another set of leads: nothing selected carries over unseen. */
  useEffect(() => setSelected((s) => (s.size ? new Set() : s)), [scope]);
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

  /* Results of writes: one polite line, errors in red (the database's own sentence). */
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    if (!msg || msg.bad) return;
    const t = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [msg]);
  /* A member marking a lead Lost says why first (the database refuses it otherwise). */
  const [lostFor, setLostFor] = useState<string | null>(null);
  const setStatus = useCallback(
    (id: string, s: LeadStatus) => {
      if (s === "lost" && isMember) {
        setLostFor(id);
        return;
      }
      saveStatus(id, s).catch((e: unknown) => setMsg({ text: crmErrorText(e) || "The status did not save.", bad: true }));
    },
    [saveStatus, isMember],
  );

  /* The bulk bar: every action on the selection, and only what this person may do. */
  const assignees = useAssigneeOptions({ includeUnassigned: true, showLoad: true });
  const mayAssign = teamOn && can("lead.assign");
  const [share, setShare] = useState<string[] | null>(null);
  const selRows = useMemo(() => rows.filter((r) => selected.has(r.lead.id)), [rows, selected]);
  const stamp = () => new Date().toISOString().slice(0, 10);
  const logExport = (count: number, which: string) => void data.logAccess("export", undefined, { count, view: which, scope });
  const api: BulkApi = {
    count: selected.size,
    people: distinct(leads, (l) => l.assignedTo).map((p) => p.value),
    clear: () => setSelected(new Set()),
    run: async (label, fn) => {
      try {
        const out = await fn();
        setMsg({ text: typeof out === "string" ? out : `${label}.` });
      } catch (e) {
        setMsg({ text: crmErrorText(e) || "Something did not save.", bad: true });
      }
    },
    patch: (p) => bulkUpdate([...selected], p),
    setStatus: async (s, extra) => {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map((id) => saveStatus(id, s, extra)));
      const failed = results.filter((x): x is PromiseRejectedResult => x.status === "rejected");
      if (!failed.length) return;
      const why = crmErrorText(failed[0].reason);
      throw new Error(failed.length === ids.length ? why : `${failed.length} of ${ids.length} leads did not save: ${why}`);
    },
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
    exportCsv: can("lead.export")
      ? () => {
          downloadCsv(selRows, `ideovent-leads-selected-${stamp()}.csv`);
          logExport(selRows.length, "selected");
          setMsg({ text: `Exported ${selRows.length} ${selRows.length === 1 ? "lead" : "leads"}.` });
        }
      : undefined,
    remove: can("lead.delete")
      ? async () => {
          await bulkDelete([...selected]);
          setSelected(new Set());
        }
      : undefined,
    statusBlock: block
      ? (s) => {
          const stuck = selRows.filter((r) => block(r.lead, s));
          if (!stuck.length) return null;
          const why = block(stuck[0].lead, s);
          return stuck.length === selRows.length ? why : `${stuck.length} of these: ${why}`;
        }
      : undefined,
    lostNeedsReason: isMember,
    labelAssign: me.legacy,
    assignees: mayAssign ? assignees : undefined,
    assign: async (memberId, name) => {
      const ids = [...selected];
      const moved = await data.assignLeads(ids, memberId);
      const to = memberId ? name : "Unassigned";
      if (moved === ids.length) return memberId ? `${plural(moved, "lead")} assigned to ${to}.` : `${plural(moved, "lead")} back to Unassigned.`;
      return `${moved} of ${ids.length} moved to ${to}; the rest were there already.`;
    },
    shareOut: mayAssign ? () => setShare([...selected]) : undefined,
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

  /* The pool on show (the Unassigned view or scope): share all of it out in one go. */
  const poolShown = mayAssign && (view.id === "unassigned" || scope === "unassigned") && shownAll.length > 0;
  /* A member with "See all leads": every other lead, read only, without contacts (crm_leads_overview). */
  const others = useMemo(() => {
    if (!isMember || !me.viewAll) return [];
    const own = new Set(leads.map((l) => l.id));
    return overview.filter((o) => !own.has(o.id));
  }, [isMember, me.viewAll, leads, overview]);
  const cellCtx = useMemo(() => ({ mask: isMember, statusBlock: block }), [isMember, block]);

  return (
    <div>
      <PageHeader
        title={isMember ? "My leads" : "Leads"}
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
                  {available.filter((c) => !c.fixed).map((c) => (
                    <DropdownMenuCheckboxItem key={c.id} checked={!hidden.has(c.id)} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol(c.id)}>
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={resetCols}>Reset columns</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {poolShown && (
              <button type="button" className={cn(crm.btn, "max-md:h-10")} data-testid="pool-share-out" title="Share these leads out between people"
                onClick={() => setShare(shownAll.map((r) => r.lead.id))}>
                <Shuffle className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Share out</span>
                <span className="sr-only sm:hidden">Share out</span>
              </button>
            )}
            {can("lead.export") && (
              <button type="button" className={cn(crm.btn, "max-md:h-10")} disabled={!shownAll.length} title="Export this view as CSV"
                onClick={() => {
                  downloadCsv(shownAll, `ideovent-leads-${view.id}-${stamp()}.csv`);
                  logExport(shownAll.length, view.id);
                }}>
                <Download className="h-4 w-4" aria-hidden="true" /> <span className="hidden lg:inline">Export</span>
                <span className="sr-only lg:hidden">Export CSV</span>
              </button>
            )}
            <button type="button" className={cn(crm.btn, "max-md:h-10")} onClick={() => void doRefresh()} aria-label="Refresh" title="Refresh">
              <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} aria-hidden="true" />
            </button>
          </>
        }
      />

      <ScopeSwitch className="mb-3" counts={{ unassigned: data.unassignedOpen }} />

      <div role="tablist" aria-label="Saved views" className="-mx-3 mb-3 flex gap-1 overflow-x-auto border-b border-border px-3 md:mx-0 md:px-0">
        {views.map((v) => {
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
          <p role={bad ? "alert" : undefined} data-testid="leads-message"
            className={cn("mb-2 rounded-lg border px-3 py-2 text-[13px]", bad ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted/50")}>
            {msg?.text || error}
          </p>
        )}
      </div>

      {selected.size > 0 && <BulkBar api={api} />}

      {!loading && shownAll.length === 0 ? (
        <EmptyState
          title={leads.length ? "No leads match" : isMember ? "No leads for you yet" : "No leads yet"}
          body={
            leads.length
              ? "Try another view or clear the filters."
              : isMember
                ? "Mehdi assigns leads to you; they show here the moment he does."
                : orList([can("finder") && "find leads on the map", can("lead.import") && "import a CSV", can("lead.add") && "add one by hand"])
                  || "Leads show here once Mehdi assigns them."
          }
          action={
            leads.length ? (
              <Link to={CRM.leads} className={crm.btn}>Show all open leads</Link>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {can("finder") && <Link to={CRM.finder} className={crm.btn}>Lead finder</Link>}
                {can("lead.import") && <Link to={CRM.import} className={crm.btn}>Import</Link>}
                {can("lead.add") && <Link to={CRM.newLead} className={crm.btnPrimary}>New lead</Link>}
              </div>
            )
          }
        />
      ) : wide ? (
        <LeadsTable rows={shown} cols={cols} selected={selected} onToggle={onToggle} onToggleAll={onToggleAll} focus={focus} setFocus={setFocus}
          sort={sort} onSort={onSort} onOpen={openLead} now={now} setStatus={setStatus} focusTick={focusTick} cellCtx={cellCtx} />
      ) : (
        <LeadCards rows={shown} selected={selected} onToggle={onToggle} onOpen={openLead} now={now} setStatus={setStatus}
          mask={isMember} statusBlock={block} showAssignee={teamOn && isStaff} />
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

      {others.length > 0 && (
        <section aria-labelledby="all-leads-ro" data-testid="all-leads-read-only" className="mt-8">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="all-leads-ro" className="font-display text-base font-semibold tracking-tight">All leads (read only)</h2>
            <span className={cn("text-[12px] text-muted-foreground", crm.num)}>{plural(others.length, "lead")}</span>
          </div>
          <p className="mb-3 text-[13px] text-muted-foreground">
            Every lead in the team, without phone, WhatsApp, e-mail or notes. You can see these, not work them.
          </p>
          <OverviewList rows={others} onOpen={openLead} now={now} wide={wide} />
        </section>
      )}

      <LostReasonPrompt open={Boolean(lostFor)} onCancel={() => setLostFor(null)}
        onConfirm={(reason) => {
          const id = lostFor;
          setLostFor(null);
          if (id) saveStatus(id, "lost", { lostReason: reason }).catch((e: unknown) => setMsg({ text: crmErrorText(e), bad: true }));
        }} />
      {mayAssign && (
        <DistributeDialog open={Boolean(share)} onOpenChange={(o) => !o && setShare(null)} leadIds={share || []}
          onDone={(text) => {
            setMsg({ text });
            setSelected(new Set());
          }} />
      )}
    </div>
  );
}

/** ["find leads", "import a CSV", "add one"] to "Find leads, import a CSV, or add one." ("" for none). */
function orList(parts: (string | false)[]): string {
  const p = parts.filter((x): x is string => Boolean(x));
  if (!p.length) return "";
  const s = p.length === 1 ? p[0] : `${p.slice(0, -1).join(", ")}, or ${p[p.length - 1]}`;
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-border bg-muted/50 px-1 font-sans text-[11px]">{children}</kbd>;
}
