import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { LeadPage } from "@/admin/outreach/LeadPage";
import { NewLeadForm } from "@/admin/outreach/NewLeadForm";
import { can } from "@/lib/outreach/access";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { CRM, useOpenLead } from "../nav";
import { crm, EmptyState } from "../ui";
import { LeadFacts } from "./LeadFacts";
import { LeadDemoCard } from "./LeadDemoCard";
import { LeadActivity } from "./LeadActivity";
import { LeadTeamCard } from "./LeadTeamCard";
import { ReadOnlyLead } from "./ReadOnlyLead";
import { handedOverText } from "./tellMehdi";

/**
 * /crm/leads/:id, and /crm/leads/new for the new lead form.
 *
 * Left: the Outreach LeadPage exactly as it is (who, the three steps Demo /
 * Message / Send in ComposePanel, then status, notes and history folded).
 * Keyed by id, so nothing typed for one lead survives into another.
 * Right (lg, sticky): the facts with a quick status and next action, the
 * demo in numbers, and the activity (history plus the demo's opens).
 * Phones: one column, the right column's cards come after the steps.
 *
 * THE TEAM (spec 10.7). Anyone but Mehdi also gets the Mehdi card (Hand to
 * Mehdi, Ask Mehdi), and opening a lead goes on the access log (lead.view).
 * A lead they may see but not work (a See-all row, a lead they handed over)
 * opens as a read-only card without contacts. New lead needs "Can add leads".
 */
export default function CrmLeadPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const openLead = useOpenLead();
  const { leadById, loading, me, overview, logAccess } = useCrmData();
  const back = () => navigate(CRM.leads);
  const lead = id === "new" ? undefined : leadById(id);
  const team = Boolean(me.role) && me.role !== "owner" && !me.legacy;

  /* Opening a lead is on the access log for anyone but Mehdi (DPDP Rules, r.6(1)(c)): once per lead per visit. */
  const logged = useRef<string | null>(null);
  const leadId = lead?.id;
  useEffect(() => {
    if (!leadId || loading || !team || logged.current === leadId) return;
    logged.current = leadId;
    void logAccess("lead.view", leadId);
  }, [leadId, loading, team, logAccess]);

  if (id === "new") {
    if (loading) return <EmptyState title="Loading..." />;
    if (!can(me, "lead.add")) {
      return (
        <section data-testid="new-lead-refused" className={cn(crm.panel, "mx-auto mt-6 max-w-md p-6 text-center sm:mt-10")}>
          <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-3 font-display text-lg font-semibold tracking-tight">Adding leads is not switched on for you</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Mehdi gives you your leads. If you found a good one, ask him to add it or to switch adding on for you.</p>
          <Link to={CRM.leads} className={cn(crm.btn, "mt-4")}>Back to my leads</Link>
        </section>
      );
    }
    return (
      <div className="mx-auto max-w-3xl">
        <NewLeadForm onCancel={back} onCreated={(nid) => openLead(nid)} onOpen={(nid) => openLead(nid)} />
      </div>
    );
  }

  if (!lead) {
    if (loading) return <EmptyState title="Loading the lead..." />;
    if (team) {
      const handed = handedOverText(id);
      return <ReadOnlyLead row={overview.find((o) => o.id === id)} handedText={handed} />;
    }
    return (
      <EmptyState
        title="This lead does not exist any more."
        body="It may have been deleted, or the link is from another browser's local data."
        action={<Link to={CRM.leads} className={crm.btnPrimary}>Back to leads</Link>}
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-[1320px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
      <div className="min-w-0">
        <LeadPage key={id} leadId={id} onBack={back} onOpen={openLead} />
      </div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-5.5rem)] lg:self-start lg:overflow-y-auto lg:pb-2" aria-label="Lead details">
        <LeadFacts lead={lead} />
        {team && <LeadTeamCard lead={lead} />}
        <LeadDemoCard lead={lead} />
        <LeadActivity lead={lead} />
      </aside>
    </div>
  );
}
