import { campaignOf, isMetaLead } from "@/lib/meta/fields";
import type { OutreachLead } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";

/**
 * WHERE A META LEAD CAME FROM, in the lead lists (meta-leads-spec 6.2): a small
 * "Instagram", "Facebook" or "Meta" chip, the campaign in its title. Any other
 * lead renders nothing, so the lists look exactly as before for them.
 */
export function SourceBadge({ lead, className }: { lead: Pick<OutreachLead, "metaLeadId" | "metaPlatform" | "metaCampaignName" | "metaCampaignId" | "source">; className?: string }) {
  if (!isMetaLead(lead)) return null;
  const code =
    lead.metaPlatform === "ig" || lead.source === "Instagram Lead Ads" ? "ig"
    : lead.metaPlatform === "fb" || lead.source === "Facebook Lead Ads" ? "fb"
    : "meta";
  const label = code === "ig" ? "Instagram" : code === "fb" ? "Facebook" : "Meta";
  const campaign = campaignOf(lead);
  return (
    <span
      data-testid="lead-source-badge"
      data-platform={code}
      title={campaign ? `${label} lead form, campaign: ${campaign}` : `${label} lead form (no campaign: organic or a test)`}
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center gap-1 rounded-full border border-border bg-background px-1.5 align-middle text-[10.5px] font-medium text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 rounded-full", code === "ig" ? "bg-pink-500" : code === "fb" ? "bg-blue-600" : "bg-slate-400")}
      />
      {label}
    </span>
  );
}
