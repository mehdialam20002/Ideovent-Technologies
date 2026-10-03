import { istLabel, isMetaLead, platformLabel } from "@/lib/meta/fields";
import type { OutreachLead } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";

/**
 * A META LEAD'S FACTS on the lead page (meta-leads-spec 6.3): platform, form,
 * campaign, ad set, ad, when it was sent (India time), organic, and the
 * consent tick. It reads only the lead; any other lead renders nothing.
 *
 * Mounted in src/crm/lead/LeadFacts.tsx (package F's file). The same facts are
 * also the first lines of the lead's notes (fields.js metaNotes).
 */
export function MetaLeadFacts({ lead, className }: { lead: OutreachLead; className?: string }) {
  if (!isMetaLead(lead)) return null;
  const consent =
    lead.metaConsent === "yes" ? { text: "Ticked", warn: false }
    // Unticked: no WhatsApp and no call from anyone (engine.ts NO_META_CONSENT, enforced in the compose and the call script).
    : lead.metaConsent === "no" ? { text: "NOT ticked: e-mail only, no WhatsApp or calls", warn: true }
    : lead.metaConsent === "none" ? { text: "The form had none", warn: false }
    : null;
  const rows: [string, string | undefined][] = [
    ["Platform", lead.metaPlatform ? platformLabel(lead.metaPlatform) : lead.source],
    ["Form", lead.metaFormName || (lead.metaFormId ? `Form ${lead.metaFormId}` : undefined)],
    ["Campaign", lead.metaCampaignName || (lead.metaCampaignId ? `Campaign ${lead.metaCampaignId}` : undefined)],
    ["Ad set", lead.metaAdsetName || lead.metaAdsetId],
    ["Ad", lead.metaAdName || lead.metaAdId],
    ["Sent", istLabel(lead.metaCreatedAt) || undefined],
    ["Organic", lead.metaOrganic === "yes" ? "Yes (no ad)" : lead.metaOrganic === "no" ? "No, from an ad" : undefined],
  ];
  return (
    <section data-testid="meta-lead-facts" aria-labelledby="meta-facts-h" className={cn(crm.panel, crm.panelPad, className)}>
      <h2 id="meta-facts-h" className={crm.label}>From a Meta lead form</h2>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
        {consent && (
          <div className="contents">
            <dt className="text-muted-foreground">Consent tick</dt>
            <dd data-testid="meta-consent" className={cn("min-w-0 break-words", consent.warn && "font-medium text-amber-800 dark:text-amber-300")}>{consent.text}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
