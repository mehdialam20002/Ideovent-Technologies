import { useState } from "react";
import { ArrowRightLeft, HelpCircle } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import type { CrmRequest } from "@/lib/outreach/team";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { ago } from "../dashboard/format";
import { HandoffDialog, NOT_HANDED_OVER } from "./HandoffDialog";
import { AskOwnerDialog } from "./AskOwnerDialog";

const KIND_WORD: Record<CrmRequest["kind"], string> = {
  demo: "Demo request",
  correction: "Correction",
  question: "Question",
  handoff: "Hand-over",
  give_back: "Give-back",
  meta_form: "Meta form again",
};
const OUTCOME_WORD: Record<NonNullable<CrmRequest["outcome"]>, string> = {
  done: "Done",
  no_action: "Closed",
  accepted: "Accepted",
  not_real: "Not a real lead",
};

/**
 * MEHDI, ON A TEAM MEMBER'S LEAD PAGE (spec 10.7): Hand to Mehdi (the yes, or a
 * give-back) and Ask Mehdi (a demo, a correction, a question), with what was
 * asked on this lead so far and his answers. Not shown to Mehdi himself, nor
 * before the team update (0011).
 */
export function LeadTeamCard({ lead }: { lead: OutreachLead }) {
  const { me, requests, now } = useCrmData();
  const [handing, setHanding] = useState(false);
  const [asking, setAsking] = useState(false);
  if (!me.role || me.role === "owner" || me.legacy) return null;
  const asked = requests.filter((r) => r.leadId === lead.id && r.askedBy === me.memberId);
  const canHand = !NOT_HANDED_OVER.includes(lead.status);

  return (
    <section className={cn(crm.panel, crm.panelPad, "space-y-3")} aria-label="Mehdi" data-testid="lead-team-card">
      <p className={crm.label}>Mehdi</p>
      <p className="text-[13px] text-muted-foreground">
        The call, the price and the proposal are his. Hand the lead over at their yes; ask him for a demo or a correction.
      </p>
      <div className="flex flex-wrap gap-2">
        {canHand && (
          <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} onClick={() => setHanding(true)} data-testid="lead-handoff">
            <ArrowRightLeft className="h-4 w-4" aria-hidden="true" /> Hand to Mehdi
          </button>
        )}
        <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => setAsking(true)} data-testid="lead-ask">
          <HelpCircle className="h-4 w-4" aria-hidden="true" /> Ask Mehdi
        </button>
      </div>
      {asked.length > 0 && (
        <ul className="space-y-1.5 text-[13px]" data-testid="lead-requests">
          {asked.map((r) => (
            <li key={r.id} className="rounded-lg bg-muted/50 px-2.5 py-1.5">
              <span className="font-medium">{KIND_WORD[r.kind] || r.kind}</span>
              <span className="text-muted-foreground"> · {ago(r.createdAt, now)} · </span>
              <span className={r.resolvedAt ? "text-foreground" : "text-warning"}>{r.outcome ? OUTCOME_WORD[r.outcome] : "Waiting for Mehdi"}</span>
              {r.body && <span className="block break-words text-muted-foreground">{r.body}</span>}
              {r.outcomeNote && <span className="block break-words">Mehdi: {r.outcomeNote}</span>}
            </li>
          ))}
        </ul>
      )}
      <HandoffDialog lead={lead} open={handing} onClose={() => setHanding(false)} />
      <AskOwnerDialog lead={lead} open={asking} onClose={() => setAsking(false)} />
    </section>
  );
}
