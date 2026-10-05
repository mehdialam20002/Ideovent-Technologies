import { useCallback } from "react";
import type { DemoSite } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { demoLinkFor } from "@/lib/outreach/engine";
import { DEMO_LEAD_SOURCE } from "@/lib/outreach/demoLead";
import type { LeadKind, OutreachLead } from "@/lib/outreach/types";
import { markDemoSent } from "@/admin/outreach/demoActions";
import { useCrmData } from "../useCrmData";

export interface NewLeadFromDemo {
  instituteName: string;
  kind: LeadKind;
  city?: string;
  contactName?: string;
  phone?: string;
  email?: string;
}

/**
 * The writes the Demos page makes. Every one goes through the CRM data
 * (so the table, the dashboard and the lead page update together) and
 * leaves a history note on the lead saying what happened.
 */
export function useDemoActions() {
  const { saveLead, addEvent, updateLead, slots, refresh } = useCrmData();
  const { actions } = useCms();

  const createLead = useCallback(
    async (demo: DemoSite, v: NewLeadFromDemo): Promise<OutreachLead> => {
      const lead = await saveLead({
        instituteName: v.instituteName.trim(),
        kind: v.kind,
        city: v.city?.trim() || undefined,
        contactName: v.contactName?.trim() || undefined,
        phone: v.phone?.trim() || undefined,
        email: v.email?.trim() || undefined,
        website: demo.officialWebsite || undefined,
        source: DEMO_LEAD_SOURCE,
        status: "new",
        demoId: demo.id,
        demoSlug: demo.slug,
      });
      await addEvent({ leadId: lead.id, type: "note", detail: `Lead created from demo /site/${demo.slug}` });
      return lead;
    },
    [saveLead, addEvent],
  );

  const linkLead = useCallback(
    async (demo: DemoSite, lead: OutreachLead) => {
      const was = lead.demoSlug && lead.demoSlug !== demo.slug ? ` (was /site/${lead.demoSlug})` : "";
      await updateLead(lead.id, { demoId: demo.id, demoSlug: demo.slug });
      await addEvent({ leadId: lead.id, type: "note", detail: `Demo linked: /site/${demo.slug}${was}` });
    },
    [updateLead, addEvent],
  );

  const markSent = useCallback(
    async (demo: DemoSite, lead?: OutreachLead) => {
      await markDemoSent(actions.saveDoc, demo, slots, lead ? [lead.contactName, lead.instituteName].filter(Boolean).join(", ") : "", new Date(), actions.loadDemo);
      if (lead) await addEvent({ leadId: lead.id, type: "note", detail: `Demo /site/${demo.slug} marked sent` });
    },
    [actions, slots, addEvent],
  );

  const copyLink = useCallback(async (slug: string): Promise<boolean> => {
    const url = demoLinkFor(slug);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }, []);

  return { createLead, linkLead, markSent, copyLink, refresh };
}
