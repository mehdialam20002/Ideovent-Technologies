import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/outreach/types";
import { can, crmErrorText } from "@/lib/outreach/access";
import type { CrmMe } from "@/lib/outreach/team";
import { isUntouched } from "@/admin/outreach/derive";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { CRM, useOpenLead } from "../nav";
import { crm, EmptyState, PageHeader, PIPELINE_COLUMNS, StatusDot, STATUS_HEX } from "../ui";
import { FilterBar } from "../leads/FilterBar";
import { matchesFilters, type LeadRow } from "../leads/leadQuery";
import { useLeadRows } from "../leads/useLeadRows";
import { useWide, ViewSwitch } from "../leads/ViewSwitch";
import { LostReasonPrompt } from "../leads/BulkBar";
import { useCrmMe } from "../useCrmMe";
import { ScopeSwitch } from "../dashboard/ScopeSwitch";
import { useOwnerId } from "../today/TodayQueue";
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

/** What a member reads on the Call, Proposal and Won columns (spec 10.4). */
export const MEMBER_LANE_TIP = "Mehdi handles calls, proposals and wins: use Hand to Mehdi";
const MONEY: LeadStatus[] = ["proposal", "won"];

/**
 * Why this person cannot move a lead from one status to another, or null when
 * they can: the database's own rules (0011 crm_leads_guard; access.ts can()).
 * Only Mehdi moves a lead to or from Proposal and Won, and takes one off Do
 * not contact; a member never moves one to or from Call (a hand-over does).
 */
export function moveBlock(me: CrmMe, from: LeadStatus, to: LeadStatus): string | null {
  if (from === to || !me.role || me.role === "owner") return null;
  const member = me.role === "member";
  if ((MONEY.includes(from) || MONEY.includes(to)) && !can(me, "stage.proposalWon")) {
    return member ? MEMBER_LANE_TIP : "Only Mehdi moves a lead to or from Proposal and Won";
  }
  if ((from === "call" || to === "call") && !can(me, "stage.call")) return MEMBER_LANE_TIP;
  if (from === "do_not_contact" && !can(me, "dnc.lift")) return "Only Mehdi can take a lead off Do not contact";
  return null;
}

/** A column this person can never drop a card on, with the reason (for its tooltip). */
function laneBlock(me: CrmMe, lane: Lane): string | null {
  if (me.role === "owner" || !me.role) return null;
  if (MONEY.includes(lane.drop) && !can(me, "stage.proposalWon")) return me.role === "member" ? MEMBER_LANE_TIP : "Only Mehdi moves a lead to Proposal or Won";
  if (lane.drop === "call" && !can(me, "stage.call")) return MEMBER_LANE_TIP;
  return null;
}

/**
 * /crm/pipeline: the leads as a board, one column per status.
 *
 * Whose leads (spec 10.4): Mehdi and admins pick the scope (Mine by default:
 * his own and the Unassigned pool, so on the day of the team update the board
 * is as before). A member sees only their own cards. The Call, Proposal and
 * Won columns refuse a member's drop ("Mehdi handles calls, proposals and
 * wins: use Hand to Mehdi"), Proposal and Won refuse an admin's, and a
 * member's drop on Lost asks why first.
 */
export default function CrmPipeline() {
  const { data, rows: rowsAll, filters, setFilters, params } = useLeadRows();
  const { scopedLeads, now, opens, setStatus, markLost, loading, me, isStaff, isMember, nameOf, eventsFor } = data;
  const { can: canDo } = useCrmMe();
  const openLead = useOpenLead();
  const wide = useWide();
  const ownerId = useOwnerId();
  const leads = scopedLeads;
  /* The rows of this screen's scope (useLeadRows reads the scope too: kept here so the board never shows more). */
  const rows = useMemo(() => {
    const ids = new Set(leads.map((l) => l.id));
    return rowsAll.filter((r) => ids.has(r.lead.id));
  }, [rowsAll, leads]);

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
  const [askLost, setAskLost] = useState<string | null>(null);
  const refocus = useRef<string | null>(null);
  const move = useCallback(
    (id: string, s: LeadStatus) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead || lead.status === s) return;
      const block = moveBlock(me, lead.status, s);
      if (block) {
        setLive({ text: `${lead.instituteName} did not move. ${block}.`, bad: true });
        return;
      }
      /* A member says why a lead is lost (the database refuses Lost without a reason). */
      if (s === "lost" && isMember) {
        setAskLost(id);
        return;
      }
      setLive({ text: `Moved ${lead.instituteName} to ${LEAD_STATUS_LABELS[s]}.` });
      setStatus(id, s).catch((e: unknown) =>
        setLive({ text: `${lead.instituteName} did not move. ${crmErrorText(e)}`, bad: true }),
      );
    },
    [leads, me, isMember, setStatus],
  );
  const lostLead = askLost ? leads.find((l) => l.id === askLost) : undefined;
  const confirmLost = (reason: string) => {
    const lead = lostLead;
    setAskLost(null);
    if (!lead) return;
    setLive({ text: `Moved ${lead.instituteName} to Lost: ${reason}.` });
    markLost(lead.id, reason).catch((e: unknown) => setLive({ text: `${lead.instituteName} did not move. ${crmErrorText(e)}`, bad: true }));
  };
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

  /* HTML5 drag and drop. A column this person may not drop on never takes the card. */
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dragged = dragId ? leads.find((l) => l.id === dragId) : undefined;
  const dropProps = (lane: Lane) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragId) return;
      if (dragged && !lane.statuses.includes(dragged.status) && moveBlock(me, dragged.status, lane.drop)) return;
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

  /* A card this person cannot move anywhere stays put (an admin's Proposal, a member's Do not contact). */
  const movable = (s: LeadStatus) => LANES.some((l) => !l.statuses.includes(s) && !moveBlock(me, s, l.drop));

  const cards = (lane: Lane) => {
    const list = byLane.get(lane.id) || [];
    const cap = more[lane.id] || PER_LANE;
    const refused = laneBlock(me, lane);
    return (
      <>
        <ul className="space-y-1.5" aria-label={`${lane.label} leads`}>
          {list.slice(0, cap).map((r) => (
            <li key={r.lead.id}>
              <PipelineCard row={r} now={now} opens={opens} draggable={wide && movable(r.lead.status)} dragging={dragId === r.lead.id}
                onOpen={openLead} onMove={move} onStep={step}
                onDragStart={setDragId} onDragEnd={() => { setDragId(null); setOver(null); }}
                blockOf={me.role === "owner" ? undefined : (to) => moveBlock(me, r.lead.status, to)}
                ownerName={isStaff && r.lead.assigneeId && r.lead.assigneeId !== me.memberId ? nameOf(r.lead.assigneeId) : undefined}
                untouched={Boolean(r.lead.assigneeId && r.lead.assigneeId !== ownerId && isUntouched(r.lead, eventsFor(r.lead.id), now))} />
            </li>
          ))}
        </ul>
        {list.length > cap && (
          <button type="button" className={cn(crm.btnGhost, "mt-1.5 w-full max-md:h-11")} onClick={() => setMore((m) => ({ ...m, [lane.id]: cap + PER_LANE }))}>
            Show {Math.min(PER_LANE, list.length - cap)} more
          </button>
        )}
        {!list.length && (
          <p className="rounded-lg border border-dashed border-border px-2 py-6 text-center text-[12px] text-muted-foreground" data-lane-note={refused ? "refused" : undefined}>
            {refused ? `${refused}.` : wide ? "Drop a lead here" : "No leads here"}
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

  const none = data.leads.length === 0;
  const empty = (
    <EmptyState
      title={none ? "No leads yet" : "No leads here"}
      body={isMember
        ? "Your board fills as Mehdi assigns you leads."
        : !none
          ? "Nothing in this view. Pick All above to see every lead."
          : canDo("finder")
            ? "The board fills as you add leads. Find them on the map, import a CSV, or add one by hand."
            : "The board fills as leads come in."}
      action={none && (canDo("finder") || canDo("lead.import") || canDo("lead.add")) ? (
        <div className="flex flex-wrap justify-center gap-2">
          {canDo("finder") && <Link to={CRM.finder} className={crm.btn}>Lead finder</Link>}
          {canDo("lead.import") && <Link to={CRM.import} className={crm.btn}>Import</Link>}
          {canDo("lead.add") && <Link to={CRM.newLead} className={crm.btnPrimary}>New lead</Link>}
        </div>
      ) : undefined}
    />
  );

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={<span className={crm.num}>{loading ? "Loading..." : `${total} of ${leads.length} leads on the board`}</span>}
        actions={<><ScopeSwitch screen="pipeline" /><ViewSwitch current="board" params={params} /></>}
      />
      <FilterBar leads={leads} filters={filters} setFilters={setFilters} showStatus={false} />
      <div aria-live="polite" className="sr-only">{live?.text}</div>
      {live?.bad && (
        <p role="alert" className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{live.text}</p>
      )}
      <LostReasonPrompt open={Boolean(lostLead)} onCancel={() => setAskLost(null)} onConfirm={confirmLost} />

      {!loading && leads.length === 0 ? (
        empty
      ) : wide ? (
        <div className="flex h-[calc(100dvh-13.5rem)] min-h-[24rem] gap-3 overflow-x-auto pb-2" onDragEnd={() => setOver(null)}>
          {LANES.map((lane) => {
            const isOver = over === lane.id;
            const folded = lane.id === "closed" && !closedOpen && !isOver;
            const refused = laneBlock(me, lane);
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
              <section key={lane.id} aria-label={lane.label} {...dropProps(lane)} title={refused || undefined} data-refused={refused ? "1" : undefined}
                className={cn(crm.panel, "flex w-60 shrink-0 flex-col p-2 transition-colors", isOver && "border-primary bg-primary/5 ring-2 ring-primary/30",
                  refused && dragId && "opacity-60")}>
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
          {isMember ? ` ${MEMBER_LANE_TIP}.` : ""}
        </p>
      )}
    </div>
  );
}
