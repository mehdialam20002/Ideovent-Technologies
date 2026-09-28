import { AlarmClock, Check, MessageSquare } from "lucide-react";
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
}

interface Props {
  item: TodayItem;
  index: number;
  busy: boolean;
  onOpen: (id: string) => void;
  onSnooze: (lead: OutreachLead, days: number) => void;
  onReplied: (lead: OutreachLead) => void;
}

/**
 * One lead on Today. The row itself is focusable (j/k move between rows,
 * Enter opens, s snoozes a day); the buttons are the same actions by mouse.
 */
export function TodayRow({ item, index, busy, onOpen, onSnooze, onReplied }: Props) {
  const { lead, step, urgent, when, late } = item;
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
        "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_120px_312px] md:px-4",
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
        </div>
      </div>
      <p className={cn("order-3 col-span-2 truncate pl-[18px] text-[13px] md:order-none md:col-span-1 md:pl-0", urgent ? "font-medium text-foreground" : "text-muted-foreground")}>
        {step}
      </p>
      <p className={cn("order-2 text-right text-[12px] md:order-none md:text-left", late ? "font-medium text-destructive" : "text-muted-foreground")}>{when}</p>
      <div className="order-4 col-span-2 flex flex-wrap items-center gap-1.5 pl-[18px] md:order-none md:col-span-1 md:justify-start md:pl-0">
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
