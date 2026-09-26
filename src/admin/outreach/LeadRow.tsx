import type { ReactNode } from "react";
import { ChevronRight, Mail, MessageCircle } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { KIND_LABEL, StatusPill, dueLabel, prettyPhone } from "./ui";
import { cn } from "@/lib/utils";

/** One lead as a big tappable row. The whole row opens the lead. */
export function LeadRow({ lead, onOpen, extra, tone }: { lead: OutreachLead; onOpen: (id: string) => void; extra?: ReactNode; tone?: "hot" | "late" }) {
  const due = lead.nextActionAt ? dueLabel(lead.nextActionAt) : "";
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        aria-label={`Open ${lead.instituteName}`}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border bg-card/60 p-3.5 text-left transition-colors hover:border-primary/50 sm:p-4",
          tone === "hot" ? "border-warning/60" : tone === "late" ? "border-destructive/40" : "border-border",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{lead.instituteName || "(no name)"}</span>
            <StatusPill status={lead.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[KIND_LABEL[lead.kind], lead.city, lead.contactName].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(lead.whatsapp || lead.phone) && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {prettyPhone(lead.whatsapp || lead.phone)}
              </span>
            )}
            {lead.email && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{lead.email}</span>
              </span>
            )}
            {due && <span className={cn("font-medium", /late/.test(due) ? "text-destructive" : "text-foreground")}>Follow-up {due}</span>}
          </p>
          {extra}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}
