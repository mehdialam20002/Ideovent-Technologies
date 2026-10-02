import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import type { LeadOverview } from "@/lib/outreach/team";
import { LEAD_STATUS_LABELS } from "@/lib/outreach/types";
import { KIND_LABEL, fmtDateTime } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { TellMehdiButton } from "./TellMehdiButton";

/**
 * A LEAD A MEMBER CAN SEE BUT NOT WORK (spec 10.7): a See-all row that is
 * someone else's, or a lead they handed over (crm_leads_overview: no phone,
 * WhatsApp, e-mail, contact name or notes). Name, kind, city, stage, who has
 * it, last contacted and next action; no compose, no contacts, no history.
 * Right after a hand-over it also offers Tell Mehdi on WhatsApp.
 */
export function ReadOnlyLead({ row, handedText }: { row?: LeadOverview; handedText?: string }) {
  const { nameOf } = useCrmData();
  const who = row ? row.assigneeName || nameOf(row.assigneeId, "someone in the team") : "Mehdi";
  return (
    <div className="mx-auto max-w-xl space-y-4">
      {handedText && (
        <section role="status" className={cn(crm.panel, crm.panelPad, "space-y-2 border-primary/40")} data-testid="handed-over">
          <p className="text-sm font-medium">Handed over. It waits on Mehdi's "Waiting on you" until he marks it.</p>
          <TellMehdiButton text={handedText} primary />
        </section>
      )}
      {row ? (
        <section className={cn(crm.panel, crm.panelPad, "space-y-3")} data-testid="lead-readonly" aria-label="Lead, read only">
          <h1 className="font-display text-xl font-semibold" data-testid="lead-readonly-name">{row.instituteName}</h1>
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
            <Row k="Kind">{KIND_LABEL[row.kind] || row.kind}</Row>
            <Row k="City">{row.city}</Row>
            <Row k="Stage">{LEAD_STATUS_LABELS[row.status] || row.status}</Row>
            <Row k="Assigned to">{row.assigneeId ? who : "Unassigned"}</Row>
            <Row k="Last contact">{row.lastContactedAt ? fmtDateTime(row.lastContactedAt) : "Never"}</Row>
            <Row k="Next action">{row.nextActionAt ? fmtDateTime(row.nextActionAt) : ""}</Row>
          </dl>
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {row.assigneeId ? `This lead is ${who}'s. You can see it, not work it.` : "This lead is in the Unassigned pool. You can see it, not work it."}
          </p>
        </section>
      ) : (
        !handedText && (
          <section className={cn(crm.panel, crm.panelPad)} data-testid="lead-not-yours">
            <p className="text-sm font-medium">This lead is not yours any more.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">It may have been moved, or closed more than 14 days ago.</p>
          </section>
        )
      )}
      <Link to={CRM.leads} className={crm.btn}>Back to my leads</Link>
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-muted-foreground">-</span>}</dd>
    </>
  );
}
