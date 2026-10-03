import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import { HandoffDialog } from "./HandoffDialog";

/**
 * THE HAND-OVER POINT (spec 10.7, P1). On a member's After-they-say-yes stage,
 * once the lead replied or opened the demo: hand it to Mehdi now. He sends the
 * sample and two call times himself, within the hour. Once Mehdi approves the
 * team's after-yes message (member_after_yes), the member may send the sample
 * link themselves, below; a call is still his, through the hand-over.
 */
export function HandoffNow({ lead, mayLink, className }: { lead: OutreachLead; mayLink: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div role="note" data-testid="handoff-now" className={cn("rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm", className)}>
      <p className="font-medium">They said yes: hand this lead to Mehdi now.</p>
      <p className="mt-1 text-muted-foreground">
        {mayLink
          ? "You may send them the sample link below. A call, the price and the dates are Mehdi's: hand it over as soon as they want to talk."
          : "Mehdi sends the sample and two call times himself, within the hour. You keep the credit."}
      </p>
      <button type="button" className={cn(crm.btnPrimary, "mt-2 max-md:h-11")} onClick={() => setOpen(true)} data-testid="handoff-open">
        <ArrowRightLeft className="h-4 w-4" aria-hidden="true" /> Hand to Mehdi
      </button>
      <HandoffDialog lead={lead} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
