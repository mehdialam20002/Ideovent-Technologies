import type { DragEvent, KeyboardEvent } from "react";
import { Eye, Flame, MoreHorizontal } from "lucide-react";
import type { DemoSiteOpen } from "@/lib/cms/types";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/outreach/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { nextStep } from "@/admin/outreach/compose";
import { dueLabel, KIND_LABEL } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { cityOf } from "@/lib/outreach/city";
import { crm, StatusDot } from "../ui";
import { sinceLabel, type LeadRow } from "../leads/leadQuery";

export interface CardProps {
  row: LeadRow;
  now: Date;
  opens: DemoSiteOpen[];
  draggable: boolean;
  dragging: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, s: LeadStatus) => void;
  /** "[" and "]": one column left or right. */
  onStep: (id: string, dir: -1 | 1) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  /** Why this person cannot move the lead to a status (the database's own rule), or null. */
  blockOf?: (to: LeadStatus) => string | null;
  /** Whose lead it is, when not the viewer's (Mehdi's and admins' Team and All views). */
  ownerName?: string;
  /** Assigned more than a day ago and not touched since by its person. */
  untouched?: boolean;
}

/** One lead on the board. Click or Enter opens it; drag, "Move to" or [ ] change its status. */
export function PipelineCard({ row, now, opens, draggable, dragging, onOpen, onMove, onStep, onDragStart, onDragEnd, blockOf, ownerName, untouched }: CardProps) {
  const l = row.lead;
  // Hot is the row's (leadQuery buildRows: derive.ts hotOf), the same answer as Leads, Today and the Dashboard.
  const step = nextStep(l, row.hot, now);
  const hasDemo = !!(row.demo || l.demoSlug);
  const blocked = LEAD_STATUSES.map((s) => (s === l.status ? null : blockOf?.(s) || null));
  const why = [...new Set(blocked.filter(Boolean))] as string[];

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // keys inside the menu belong to the menu
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(l.id);
    } else if (e.key === "[" || e.key === "]") {
      e.preventDefault();
      onStep(l.id, e.key === "[" ? -1 : 1);
    }
  };
  const start = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", l.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(l.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-card={l.id}
      draggable={draggable}
      onDragStart={start}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // Menu items live in a portal but their clicks still bubble here through React.
        const t = e.target as HTMLElement;
        if (!e.currentTarget.contains(t) || t.closest("button")) return;
        onOpen(l.id);
      }}
      onKeyDown={onKey}
      aria-label={`${l.instituteName}, ${LEAD_STATUS_LABELS[l.status]}. Enter opens, [ and ] move between columns.`}
      className={cn(
        "group relative cursor-pointer select-none rounded-lg border border-border bg-background px-2.5 py-2 text-[13px] transition-[border-color,opacity] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:py-3",
        draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-1.5 pr-6">
        <span className="min-w-0 flex-1 truncate font-medium">{l.instituteName}</span>
        {row.hot && <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Demo opened since last contact" />}
      </div>
      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{[cityOf(l), KIND_LABEL[l.kind], ownerName].filter(Boolean).join(" · ")}</p>
      <p className={cn("mt-1 truncate text-[12px]", step.urgent ? "font-medium text-foreground" : "text-muted-foreground")}>{step.text}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {untouched && (
          <span data-mark="untouched" className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
            title="Assigned more than a day ago, and nothing written on it since">
            Untouched
          </span>
        )}
        {hasDemo && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5", crm.num, row.opens ? "bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted text-muted-foreground")}
            title={row.opens ? `Demo opened ${row.opens} ${row.opens === 1 ? "time" : "times"} since its link went to them` : row.sentAt ? "Demo sent, not opened yet" : "Demo not sent yet"}>
            <Eye className="h-3 w-3" aria-hidden="true" /> {row.opens ? `${row.opens} ${row.opens === 1 ? "open" : "opens"}` : "Demo"}
          </span>
        )}
        {l.nextActionAt && row.due && (
          <span className={cn("rounded-full px-1.5 py-0.5",
            row.due === "overdue" ? "bg-destructive/10 font-medium text-destructive" : row.due === "today" ? "bg-amber-500/10 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted text-muted-foreground")}>
            {dueLabel(l.nextActionAt, now)}
          </span>
        )}
        <span className={cn("ml-auto text-muted-foreground", crm.num)} title="Since last contact">
          {row.lastContactAt ? sinceLabel(row.lastContactAt, now) : "not contacted"}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Move ${l.instituteName} to`}
          className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-70 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 max-md:h-10 max-md:w-10 max-md:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-[12px] text-muted-foreground">Move to</DropdownMenuLabel>
          {LEAD_STATUSES.map((s, i) => (
            <DropdownMenuItem key={s} disabled={s === l.status || Boolean(blocked[i])} onSelect={() => onMove(l.id, s)} data-status={s}>
              <StatusDot status={s} className="mr-2" /> {LEAD_STATUS_LABELS[s]}
            </DropdownMenuItem>
          ))}
          {why.map((w) => (
            <p key={w} className="max-w-[12rem] px-2 pb-1.5 pt-1 text-[11.5px] leading-snug text-muted-foreground" data-testid="move-blocked">{w}.</p>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
