import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { CRM, useOpenLead } from "../nav";
import { crm, EmptyState, PageHeader, PIPELINE_COLUMNS, StatusDot, STATUS_HEX } from "../ui";
import { FilterBar } from "../leads/FilterBar";
import { matchesFilters, type LeadRow } from "../leads/leadQuery";
import { useLeadRows } from "../leads/useLeadRows";
import { useWide, ViewSwitch } from "../leads/ViewSwitch";
import { PipelineCard } from "./PipelineCard";

interface Lane {
  id: string;
  label: string;
  statuses: LeadStatus[];
  /** The status a card dropped here gets. */
  drop: LeadStatus;
}

const LANES: Lane[] = [
  ...PIPELINE_COLUMNS.map((s) => ({ id: s, label: LEAD_STATUS_LABELS[s], statuses: [s], drop: s })),
  { id: "closed", label: "Lost / Do not contact", statuses: ["lost", "do_not_contact"], drop: "lost" },
];
const PER_LANE = 60;
const t = (iso?: string) => (iso ? new Date(iso).getTime() : Infinity);

/** Hot first, then overdue, then by next action date, then most recently touched. */
function laneOrder(a: LeadRow, b: LeadRow): number {
  if (a.hot !== b.hot) return a.hot ? -1 : 1;
  if ((a.due === "overdue") !== (b.due === "overdue")) return a.due === "overdue" ? -1 : 1;
  return t(a.lead.nextActionAt) - t(b.lead.nextActionAt) || t(b.lead.updatedAt) - t(a.lead.updatedAt);
}

/** /crm/pipeline: the leads as a board, one column per status. */
export default function CrmPipeline() {
  const { data, rows, filters, setFilters, params } = useLeadRows();
  const { leads, now, opens, setStatus, loading } = data;
  const openLead = useOpenLead();
  const wide = useWide();

  const byLane = useMemo(() => {
    const m = new Map<string, LeadRow[]>(LANES.map((l) => [l.id, []]));
    for (const r of rows) {
      if (!matchesFilters(r, filters, { ignoreStatus: true })) continue;
      const lane = LANES.find((l) => l.statuses.includes(r.lead.status));
      if (lane) m.get(lane.id)!.push(r);
    }
    for (const list of m.values()) list.sort(laneOrder);
    return m;
  }, [rows, filters]);
  const total = [...byLane.values()].reduce((n, l) => n + l.length, 0);

  /* Moves: optimistic via setStatus (records the status event), result announced. */
  const [live, setLive] = useState<{ text: string; bad?: boolean } | null>(null);
  const refocus = useRef<string | null>(null);
  const move = useCallback(
    (id: string, s: LeadStatus) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead || lead.status === s) return;
      setLive({ text: `Moved ${lead.instituteName} to ${LEAD_STATUS_LABELS[s]}.` });
      setStatus(id, s).catch((e: unknown) =>
        setLive({ text: e instanceof Error ? `${lead.instituteName} did not move. ${e.message}` : `${lead.instituteName} did not move.`, bad: true }),
      );
    },
    [leads, setStatus],
  );
  const step = useCallback(
    (id: string, dir: -1 | 1) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead) return;
      const i = LANES.findIndex((l) => l.statuses.includes(lead.status));
      const next = LANES[i + dir];
      if (!next) return;
      refocus.current = id;
      move(id, next.drop);
    },
    [leads, move],
  );
  useEffect(() => {
    if (!refocus.current) return;
    const el = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(refocus.current)}"]`);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      refocus.current = null;
    }
  });

  /* HTML5 drag and drop */
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dropProps = (lane: Lane) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (over !== lane.id) setOver(lane.id);
    },
    onDragLeave: (e: DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) setOver((o) => (o === lane.id ? null : o));
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain") || dragId;
      setOver(null);
      setDragId(null);
      const lead = id ? leads.find((l) => l.id === id) : undefined;
      if (lead && !lane.statuses.includes(lead.status)) move(lead.id, lane.drop);
    },
  });

  const [closedOpen, setClosedOpen] = useState(false);
  const [phoneLane, setPhoneLane] = useState<string>("new");
  const [more, setMore] = useState<Record<string, number>>({});

  const cards = (lane: Lane) => {
    const list = byLane.get(lane.id) || [];
    const cap = more[lane.id] || PER_LANE;
    return (
      <>
        <ul className="space-y-1.5" aria-label={`${lane.label} leads`}>
          {list.slice(0, cap).map((r) => (
            <li key={r.lead.id}>
              <PipelineCard row={r} now={now} opens={opens} draggable={wide} dragging={dragId === r.lead.id}
                onOpen={openLead} onMove={move} onStep={step}
                onDragStart={setDragId} onDragEnd={() => { setDragId(null); setOver(null); }} />
            </li>
          ))}
        </ul>
        {list.length > cap && (
          <button type="button" className={cn(crm.btnGhost, "mt-1.5 w-full max-md:h-11")} onClick={() => setMore((m) => ({ ...m, [lane.id]: cap + PER_LANE }))}>
            Show {Math.min(PER_LANE, list.length - cap)} more
          </button>
        )}
        {!list.length && (
          <p className="rounded-lg border border-dashed border-border px-2 py-6 text-center text-[12px] text-muted-foreground">
            {wide ? "Drop a lead here" : "No leads here"}
          </p>
        )}
      </>
    );
  };

  const head = (lane: Lane) => (
    <h2 className="flex items-center gap-2 px-1 py-1 text-[13px] font-medium">
      {lane.id === "closed" ? <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_HEX.lost }} /> : <StatusDot status={lane.drop} />}
      <span className="truncate">{lane.label}</span>
      <span className={cn("ml-auto rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground", crm.num)}>{byLane.get(lane.id)?.length || 0}</span>
    </h2>
  );

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={<span className={crm.num}>{loading ? "Loading..." : `${total} of ${leads.length} leads on the board`}</span>}
        actions={<ViewSwitch current="board" params={params} />}
      />
      <FilterBar leads={leads} filters={filters} setFilters={setFilters} showStatus={false} />
      <div aria-live="polite" className="sr-only">{live?.text}</div>
      {live?.bad && (
        <p role="alert" className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{live.text}</p>
      )}

      {!loading && leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          body="The board fills as you add leads. Find them on the map, import a CSV, or add one by hand."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to={CRM.finder} className={crm.btn}>Lead finder</Link>
              <Link to={CRM.import} className={crm.btn}>Import</Link>
              <Link to={CRM.newLead} className={crm.btnPrimary}>New lead</Link>
            </div>
          }
        />
      ) : wide ? (
        <div className="flex h-[calc(100dvh-13.5rem)] min-h-[24rem] gap-3 overflow-x-auto pb-2" onDragEnd={() => setOver(null)}>
          {LANES.map((lane) => {
            const isOver = over === lane.id;
            const folded = lane.id === "closed" && !closedOpen && !isOver;
            if (folded)
              return (
                <section key={lane.id} aria-label={lane.label} {...dropProps(lane)}
                  className={cn(crm.panel, "flex w-12 shrink-0 flex-col items-center py-2", isOver && "border-primary bg-primary/5")}>
                  <button type="button" onClick={() => setClosedOpen(true)} aria-expanded={false} aria-label={`Show ${lane.label}`}
                    className="flex flex-1 flex-col items-center gap-2 rounded-md px-1 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span className={cn("rounded-full bg-muted px-1.5 text-[11px]", crm.num)}>{byLane.get(lane.id)?.length || 0}</span>
                    <span className="[writing-mode:vertical-rl]">{lane.label}</span>
                  </button>
                </section>
              );
            return (
              <section key={lane.id} aria-label={lane.label} {...dropProps(lane)}
                className={cn(crm.panel, "flex w-60 shrink-0 flex-col p-2 transition-colors", isOver && "border-primary bg-primary/5 ring-2 ring-primary/30")}>
                <div className="flex items-center">
                  <div className="min-w-0 flex-1">{head(lane)}</div>
                  {lane.id === "closed" && (
                    <button type="button" onClick={() => setClosedOpen(false)} aria-label="Fold this column" className={cn(crm.btnGhost, "h-7 px-1.5")}>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-0.5">{cards(lane)}</div>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div role="group" aria-label="Status" className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
            {LANES.map((lane) => {
              const on = phoneLane === lane.id;
              return (
                <button key={lane.id} type="button" aria-pressed={on} onClick={() => setPhoneLane(lane.id)}
                  className={cn("inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
                    on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground")}>
                  {lane.id === "closed" ? <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_HEX.lost }} /> : <StatusDot status={lane.drop} />}
                  {lane.id === "closed" ? "Lost / DNC" : lane.label}
                  <span className={cn("text-[12px] text-muted-foreground", crm.num)}>{byLane.get(lane.id)?.length || 0}</span>
                </button>
              );
            })}
          </div>
          {cards(LANES.find((l) => l.id === phoneLane) || LANES[0])}
        </>
      )}
      {wide && leads.length > 0 && (
        <p className="mt-2 hidden text-[12px] text-muted-foreground lg:block">
          Drag a card to change its status. With the keyboard: focus a card, then [ or ] moves it one column; the menu on a card moves it anywhere.
        </p>
      )}
    </div>
  );
}
