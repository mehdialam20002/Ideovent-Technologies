import { SettingsTab } from "@/admin/outreach/SettingsTab";
import { PageHeader } from "../ui";
import { CleanObservations } from "./CleanObservations";

/**
 * /crm/settings: the Outreach settings (sender, signature, the optional
 * WhatsApp limit, quiet hours, demo-open alerts, "Add every new demo to the
 * CRM"), then the data clean-up tools.
 */
export default function CrmSettings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" subtitle="Saved with your outreach data, not in the website CMS." />
      <SettingsTab />
      <div className="pt-2">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data clean-up</p>
        <CleanObservations />
      </div>
    </div>
  );
}
