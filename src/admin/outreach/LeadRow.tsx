import type { ReactNode } from "react";
import type { OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { nextStep } from "./compose";
import { StatusPill } from "./ui";
import { cn } from "@/lib/utils";

/** The list both Today and Leads use: one quiet card, a hairline between rows. */
export const leadListCls = "divide-y divide-border/60 rounded-2xl border border-border/70 bg-card px-3 sm:px-4";

/**
 * One lead, one line: name and status, then city and the next step, and one
 * button, Message. Tapping the name opens the lead too; both land on the
 * same screen, the button just says what the screen is for.
 * showStatus=false drops the chip where the group heading already says it
 * (every row under "Not contacted yet" is New); on a phone the chip cost
 * the name half its width ("Verma Coaching Ac...").
 */
export function LeadRow({ lead, onOpen, extra, showStatus = true }: { lead: OutreachLead; onOpen: (id: string) => void; extra?: ReactNode; showStatus?: boolean }) {
  const { opens } = useOutreach();
  const step = nextStep(lead, opens);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        aria-label={`Open ${lead.instituteName}`}
        className="min-w-0 flex-1 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* On a phone the name wraps instead of being cut ("Verma Coaching Ac..."); from sm up one line is enough room. */}
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
          <span className="min-w-0 break-words font-medium sm:truncate">{lead.instituteName || "(no name)"}</span>
          {showStatus && <StatusPill status={lead.status} />}
        </span>
        <span className="mt-0.5 block break-words text-xs text-muted-foreground sm:truncate">
          {lead.city ? `${lead.city} · ` : ""}
          <span className={cn(step.urgent && "font-medium text-primary")}>{step.text}</span>
        </span>
        {extra}
      </button>
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        aria-label={`Message ${lead.instituteName}`}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary/10 px-3 text-sm sm:px-4 font-medium text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Message
      </button>
    </li>
  );
}
