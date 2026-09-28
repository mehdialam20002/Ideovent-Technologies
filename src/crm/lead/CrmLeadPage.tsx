import { Link, useNavigate, useParams } from "react-router-dom";
import { LeadPage } from "@/admin/outreach/LeadPage";
import { NewLeadForm } from "@/admin/outreach/NewLeadForm";
import { useCrmData } from "../useCrmData";
import { CRM, useOpenLead } from "../nav";
import { crm, EmptyState } from "../ui";
import { LeadFacts } from "./LeadFacts";
import { LeadDemoCard } from "./LeadDemoCard";
import { LeadActivity } from "./LeadActivity";

/**
 * /crm/leads/:id, and /crm/leads/new for the new lead form.
 *
 * Left: the Outreach LeadPage exactly as it is (who, the three steps Demo /
 * Message / Send in ComposePanel, then status, notes and history folded).
 * Keyed by id, so nothing typed for one lead survives into another.
 * Right (lg, sticky): the facts with a quick status and next action, the
 * demo in numbers, and the activity (history plus the demo's opens).
 * Phones: one column, the right column's cards come after the steps.
 */
export default function CrmLeadPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const openLead = useOpenLead();
  const { leadById, loading } = useCrmData();
  const back = () => navigate(CRM.leads);

  if (id === "new") {
    return (
      <div className="mx-auto max-w-3xl">
        <NewLeadForm onCancel={back} onCreated={(nid) => openLead(nid)} onOpen={(nid) => openLead(nid)} />
      </div>
    );
  }

  const lead = leadById(id);
  if (!lead) {
    return loading ? (
      <EmptyState title="Loading the lead..." />
    ) : (
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
        <LeadDemoCard lead={lead} />
        <LeadActivity lead={lead} />
      </aside>
    </div>
  );
}
