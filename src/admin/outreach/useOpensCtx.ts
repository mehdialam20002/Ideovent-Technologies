import { useMemo } from "react";
import type { OpensCtx } from "./derive";
import { leadDemo, useLeadDemoSites } from "./DemoPicker";
import { useOutreach } from "./useOutreach";

/**
 * What reading a lead's demo opens needs (derive.ts OpensCtx), for the screens
 * built on the Outreach provider (the lead page, its history, the compose): the
 * history, and each lead's own demo by id, else by slug (DemoPicker leadDemo), so
 * Hot, "since contact" and "Sent" read the same here as on every CRM screen
 * (useCrmData openCtx).
 */
export function useOpensCtx(): OpensCtx {
  const { events } = useOutreach();
  const sites = useLeadDemoSites();
  return useMemo(() => ({ events, demoIdOf: (lead) => leadDemo(lead, sites)?.id || lead.demoId }), [events, sites]);
}
