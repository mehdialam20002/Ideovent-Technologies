import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { fmtDate } from "@/lib/clients/numbering";
import { STAGE_BY_ID } from "@/lib/clients/stages";
import { nextAction } from "@/lib/clients/tasks";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useOptionalClients } from "./context";
import { OpenClientFileDialog } from "./OpenClientFileDialog";

const OPENS_AT = ["call", "proposal", "won"];

/**
 * THE CLIENT FILE ON THE LEAD PAGE (client-process-spec 10.4): Mehdi only, at the top of the right column.
 * No file yet and the lead at Call, Proposal or Won: Open client file. A file exists: its stage, its next
 * action and Open. Anyone else, and Mehdi before 0014, see nothing here.
 */
export default function LeadClientCard({ lead }: { lead: OutreachLead }) {
  const clients = useOptionalClients();
  const [opening, setOpening] = useState(false);
  if (!clients || clients.status !== "ready") return null;
  const client = clients.data.clients.find((c) => c.leadId === lead.id) || null;
  const projects = client ? clients.data.projects.filter((p) => p.clientId === client.id) : [];
  if (!client && !OPENS_AT.includes(lead.status)) return null;

  if (opening) return <OpenClientFileDialog lead={lead} onClose={() => setOpening(false)} />;

  return (
    <section className={cn(crm.panel, "p-4 text-[13px]")} data-testid="lead-client-card" aria-label="Client file">
      <p className={cn(crm.label, "flex items-center gap-1.5")}><Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> Client file</p>
      {!client ? (
        <>
          <p className="mt-1 text-muted-foreground">
            {lead.status === "won" ? "They said yes. Open the file to run the agreement, the advance, the welcome and everything after." : "Open the file to send the proposal from it and carry the client through, one step at a time."}
          </p>
          <button type="button" className={cn(crm.btnPrimary, "mt-2 w-full max-md:h-11")} onClick={() => setOpening(true)} data-testid="lead-open-client-file">Open client file</button>
        </>
      ) : (
        <>
          <p className="mt-1"><Link to={CRM.client(client.id)} className="font-medium hover:underline">{client.code}</Link> <span className="text-muted-foreground">({client.status.replace(/_/g, " ")})</span></p>
          <ul className="mt-1 space-y-1.5">
            {projects.map((p) => {
              const c = clients.projectCtxOf(p.id);
              const next = c ? nextAction(c) : null;
              return (
                <li key={p.id} className="rounded-lg border border-border p-2" data-testid="lead-client-project">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {p.outcome ? (p.outcome === "lost" ? "Lost" : p.outcome === "cancelled" ? "Cancelled" : "Closed") : `Stage ${STAGE_BY_ID[p.stage].n}: ${STAGE_BY_ID[p.stage].label}`}
                  </p>
                  {next && <p className="text-[12px]">Next: {next.label.split(":")[0]}{next.due ? ` (due ${fmtDate(next.due)})` : ""}</p>}
                  <Link to={CRM.client(p.id)} className={cn(crm.btn, "mt-1.5 h-8 max-md:h-10")} data-testid="lead-client-open">Open</Link>
                </li>
              );
            })}
            {!projects.length && <li className="text-[12px] text-muted-foreground">No project file (a monthly plan, or added by hand).</li>}
          </ul>
          {OPENS_AT.includes(lead.status) && (
            <button type="button" className={cn(crm.btnGhost, "mt-2 px-0")} onClick={() => setOpening(true)} data-testid="lead-new-project">Another project for this client</button>
          )}
        </>
      )}
    </section>
  );
}
