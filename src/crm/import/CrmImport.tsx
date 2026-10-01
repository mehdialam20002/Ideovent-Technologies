import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { ImportTab } from "@/admin/outreach/ImportTab";
import { CRM, useOpenLead } from "../nav";
import { crm, PageHeader } from "../ui";
import { ImportAssignStep } from "../team/ImportAssignStep";
import { cn } from "@/lib/utils";

/**
 * /crm/import: the Outreach Import tab as it is (template download, paste or
 * upload a CSV, preview, then ONE atomic write), with a pointer to the Lead
 * Finder for when there is no list yet. Mehdi only (App.tsx RoleGate).
 *
 * Since the team (spec 10.3.4): after an import, "Assign the N new leads"
 * (leave them Unassigned, assign all to one person, share them out, or apply
 * the rules) as a second call; the import itself stays one write.
 */
export default function CrmImport() {
  const openLead = useOpenLead();
  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        <PageHeader title="Import" subtitle="A CSV from a sheet: every row is saved, or none." />
        <ImportTab onOpen={openLead} afterImport={(r) => <ImportAssignStep added={r.added} />} />
      </div>
      <aside className="lg:pt-14">
        <div className={cn(crm.panel, crm.panelPad, "space-y-2 text-[13px]")}>
          <p className={crm.label}>No list yet?</p>
          <p className="text-muted-foreground">Find schools, coaching institutes and dental clinics on the map, then add them as leads in one click.</p>
          <Link to={CRM.finder} className={cn(crm.btn, "mt-1")}>
            <MapPin className="h-4 w-4" aria-hidden="true" /> Open Lead finder
          </Link>
        </div>
      </aside>
    </div>
  );
}
