import { AlarmClock, Check, MessageSquare, Phone } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { LEAD_STATUS_LABELS } from "@/lib/outreach/types";
import { crm, StatusDot } from "../ui";
import { cn } from "@/lib/utils";

export interface TodayItem {
  lead: OutreachLead;
  /** What to do, from nextStep(). */
  step: string;
  urgent: boolean;
  /** "2 days late", "today", "opened 2 h ago". */
  when: string;
  late?: boolean;
  /** Hot rows cannot be snoozed: the open is the reason, not a date. */
  canSnooze: boolean;
  canMarkReplied: boolean;
  /** Assigned more than a day ago and not touched since by its person (spec 10.3). */
  untouched?: boolean;
  /** A good time to call this lead now (its kind's call window, India time): the mark's tooltip. */
  callNow?: string;
  /** Whose lead it is, when it is not the viewer's (Mehdi's Team and All scopes). */
  owner?: string;
}

const chip = "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium";

/** The marks under a row's name: untouched, a good time to call, whose lead. */
function Marks({ item }: { item: TodayItem }) {
  if (!item.untouched && !item.callNow && !item.owner) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {item.untouched && (
        <span className={cn(chip, "bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300")} data-mark="untouched" title="Assigned more than a day ago, and nothing written on it since">
          Untouched
        </span>
      )}
      {item.callNow && (
        <span className={cn(chip, "bg-success/10 text-success")} data-mark="call-now" title={item.callNow}>
          <Phone className="h-3 w-3" aria-hidden="true" /> Good time to call
        </span>
      )}
      {item.owner && (
        <span className={cn(chip, "bg-muted font-normal text-muted-foreground")} data-mark="owner">{item.owner}</span>
      )}
    </span>
  );
}

interface Props {
  item: TodayItem;
  index: number;
  busy: boolean;
  onOpen: (id: string) => void;
  onSnooze: (lead: OutreachLead, days: number) => void;
  onReplied: (lead: OutreachLead) => void;
  /** The phone's stacked layout at every width (My day's narrower column). */
  compact?: boolean;
}

/**
 * One lead on Today. The row itself is focusable (j/k move between rows,
 * Enter opens, s snoozes a day); the buttons are the same actions by mouse.
 */
export function TodayRow({ item, index, busy, onOpen, onSnooze, onReplied, compact = false }: Props) {
  const { lead, step, urgent, when, late } = item;
  const wide = !compact;
  return (
    <li
      tabIndex={0}
      data-today-row={index}
      data-lead-id={lead.id}
      aria-label={`${lead.instituteName}. ${step}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onOpen(lead.id);
      }}
      className={cn(
        "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-muted/50",
        "focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        wide ? "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_120px_312px] md:px-4" : "md:px-4",
        busy && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <StatusDot status={lead.status} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium">{lead.instituteName}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {[LEAD_STATUS_LABELS[lead.status], lead.city, lead.contactName].filter(Boolean).join(" · ")}
          </p>
          <Marks item={item} />
        </div>
      </div>
      <p className={cn("order-3 col-span-2 truncate pl-[18px] text-[13px]", wide && "md:order-none md:col-span-1 md:pl-0", urgent ? "font-medium text-foreground" : "text-muted-foreground")}>
        {step}
      </p>
      <p className={cn("order-2 text-right text-[12px]", wide && "md:order-none md:text-left", late ? "font-medium text-destructive" : "text-muted-foreground")}>{when}</p>
      <div className={cn("order-4 col-span-2 flex flex-wrap items-center gap-1.5 pl-[18px]", wide && "md:order-none md:col-span-1 md:justify-start md:pl-0")}>
        <button type="button" className={cn(crm.btnPrimary, "h-8 px-2.5 max-md:h-10")} onClick={() => onOpen(lead.id)} disabled={busy}>
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Open
        </button>
        {item.canSnooze && (
          <>
            <button type="button" className={cn(crm.btn, "h-8 px-2.5 max-md:h-10")} onClick={() => onSnooze(lead, 1)} disabled={busy} title="Snooze 1 day (s)">
              <AlarmClock className="h-3.5 w-3.5" aria-hidden="true" /> 1 day
            </button>
            <button type="button" className={cn(crm.btn, "h-8 px-2.5 max-md:h-10")} onClick={() => onSnooze(lead, 3)} disabled={busy} title="Snooze 3 days">
              3 days
            </button>
          </>
        )}
        {item.canMarkReplied && (
          <button type="button" className={cn(crm.btnGhost, "h-8 px-2 max-md:h-10")} onClick={() => onReplied(lead)} disabled={busy}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Replied
          </button>
        )}
      </div>
    </li>
  );
}
