import { useCms } from "@/lib/cms/context";
import { getStore } from "@/lib/cms/store";
import { isDemoSummary } from "@/lib/cms/demoSummary";
import type { DemoSite, DemoSiteSlot } from "@/lib/cms/types";
import { coldLinkReason, demoNamedFor, demoReach, teamReach, type DemoReach } from "@/lib/outreach/linkChoice";
import type { OutreachLead } from "@/lib/outreach/types";
import { leadDemo, useLeadDemoSites } from "./DemoPicker";
import { markDemoSent } from "./demoActions";
import { useOutreach } from "./useOutreach";

/**
 * THE LEAD'S DEMO FOR ITS LINK (2 Oct 2026). Which demo record the link points at, whether the link
 * would open (linkChoice.ts demoReach), and, for Mehdi only, the step that puts a draft on the
 * website, which is the one Mark sent runs (DemoPicker): markDemoSent writes the CMS (status "sent",
 * the private slot with who it went to and when), then the history note "Demo /site/<slug> marked
 * sent". Anyone else's send never publishes: a draft blocks it (demoReach canPublish false), and the
 * team turns a link on in step 1 (DemoPicker's TeamDemoStep, "Turn on the link", which runs the
 * database's crm_publish_lead_demo, never this hook). It never sets expiresAt: no existing path does.
 * Their reasons are in their own words (linkChoice.ts teamReach): ask Mehdi, or Turn on the link when
 * the demo may go on (a Free slot, an expired demo, an example, a provisional link, the toppers or a
 * demo in another name waits for him: teamDemoFix, the same guards as his send that would publish it).
 *
 * WHICH RECORDS (3 Oct 2026, with the CRM team and 0013): useLeadDemoSites() (DemoPicker.tsx), the
 * CMS's records plus, for anyone but Mehdi, the demos linked to their own leads (crm_lead_demos,
 * drafts included), which win. Since 0013 a member's CMS read carries no demo at all,
 * so that second list is the only way their lead finds its demo. ComposePanel's own `demo` (the record
 * {offer} reads) comes from the same hook, so the two are one record.
 *
 * THE DEMO AS IT IS NOW (3 Oct 2026, review). Edit demo opens in another tab, and this screen keeps the
 * copy it read when it loaded, so the publish reads the demo again first and writes over THAT record:
 * what was saved in the other tab since stays. If the demo changed there in a way that stops the link
 * (closed, expired, a Free slot, moved to another link, deleted, now in another name or still showing
 * the template's toppers), nothing is written and the send says why; if it was put on the website
 * there already, there is nothing to write.
 *
 * markDemoSent makes two CMS saves, and in Supabase mode each save reads the whole content table again
 * (so does the read before them), so the publish takes a few seconds: the compose screen keeps its send
 * buttons off meanwhile.
 */
export function useDemoLink(lead: OutreachLead): { demo?: DemoSite; reach: DemoReach; owner: boolean; publish: () => Promise<void> } {
  const { data, actions, loading: cmsLoading } = useCms();
  const { me, addEvent, loading: crmLoading } = useOutreach();
  // Legacy (no 0011) and local mode's default actor are the owner too; `me` is pending until the CRM data loads.
  const owner = me.role === "owner";
  const sites = useLeadDemoSites();
  const slots = (data as unknown as { demoSiteSlots?: DemoSiteSlot[] }).demoSiteSlots || [];
  const demo = leadDemo(lead, sites);
  // A demo read as a summary (the CRM's own host: lib/cms/demoSummary.ts) is "Checking the demo..." until its whole
  // record is in: the toppers check (coldLinkReason) and the message's {offer} read the demo's contents.
  const base = demoReach({ lead, demo, loading: cmsLoading || crmLoading || !me.role || isDemoSummary(demo), canPublish: owner });
  // Anyone but Mehdi, once `me` has loaded (while it is pending, Mehdi must never read "ask Mehdi").
  const reach = me.role && !owner ? teamReach(base, { lead, demo }) : base;
  const publish = async () => {
    if (!owner || !demo || !reach.ok || !reach.needsPublish) return;
    // Read it again: the copy on this screen may be older than what Edit demo saved in another tab. One record, by its
    // id (4 Oct 2026): the store's load() read the whole content table for it, and on the CRM's own host it holds
    // demo summaries, which are never written.
    const fresh = (await actions.loadDemo(demo.id)) || undefined;
    const now = await getStore().load();
    const again = fresh ? demoReach({ lead, demo: fresh, canPublish: true }) : undefined;
    const stop = !fresh || !again ? "it was not found when it was read again, deleted or not loaded"
      : !again.ok ? again.reason
      : again.needsPublish ? coldLinkReason(fresh) || (demoNamedFor(fresh, lead) ? "" : `This lead's demo is now in the name of "${fresh.instituteName}"`)
      : "";
    if (!fresh || !again || stop || !again.needsPublish) {
      // The screen still shows the older copy: read the demos again so step 1 and the checks show it as it is now.
      void actions.refresh().catch(() => {});
      if (stop) throw new Error(`the demo changed since this page loaded (${stop.replace(/\.\s*$/, "")})`);
      return; // On the website already (Mark sent in another tab): nothing to write.
    }
    const freshSlots = (now as unknown as { demoSiteSlots?: DemoSiteSlot[] }).demoSiteSlots || slots;
    await markDemoSent(actions.saveDoc, fresh, freshSlots, [lead.contactName, lead.instituteName].filter(Boolean).join(", "), new Date(), actions.loadDemo);
    // The note is history only: a failure here does not undo a demo that is now on the website.
    await addEvent({ leadId: lead.id, type: "note", detail: `Demo /site/${fresh.slug} marked sent` }).catch((e) => console.warn("CRM: the Mark sent note was not written.", e));
  };
  return { demo, reach, owner, publish };
}
