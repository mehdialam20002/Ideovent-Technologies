import { SettingsTab } from "@/admin/outreach/SettingsTab";
import { MetaSettingsCard } from "../meta/MetaSettingsCard";
import { PageHeader } from "../ui";
import { CleanObservations } from "./CleanObservations";
import { TeamWording } from "./TeamWording";

/**
 * /crm/settings: the Outreach settings (sender, signature, the optional
 * WhatsApp limit, quiet hours, "Add every new demo to the CRM" with one line
 * saying demo opens still show in the CRM), then the data clean-up tools.
 * The demo-open alert switch is gone (1 Oct 2026): no e-mail is sent on an
 * open any more (src/lib/demo/opens.ts).
 *
 * Mehdi only (App.tsx RoleGate "settings"; everyone in the team reads the
 * settings, only he writes them). Since the team: Team wording, the "we"
 * versions of his sentences that members may send once he approves each
 * (spec 10.7). Before the team update it does not show.
 */
export default function CrmSettings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" subtitle="Saved with your outreach data, not in the website CMS." />
      {/* Meta Lead Ads (2 Oct 2026): its own page, Settings > Meta Lead Ads. */}
      <MetaSettingsCard />
      <SettingsTab />
      <TeamWording />
      <div className="pt-2">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data clean-up</p>
        <CleanObservations />
      </div>
    </div>
  );
}
