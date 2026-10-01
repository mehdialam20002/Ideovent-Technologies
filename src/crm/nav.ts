import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck, Columns3, Import, LayoutDashboard, MapPin, MonitorSmartphone, Settings, Users, type LucideIcon,
} from "lucide-react";
import { isCrmHost, mainSiteUrl } from "@/lib/host";

/**
 * WHERE THE CRM IS MOUNTED (30 Sep 2026).
 *
 * On its own subdomain (crm.ideovent.in; crm.localhost in development) the CRM
 * is the whole app, so its screens sit at the root: /leads, /pipeline. On the
 * main site it is one section, at /crm/leads, /crm/pipeline, exactly as before.
 * Read once: a page's host never changes without a full page load.
 */
export const CRM_BASE: string = isCrmHost() ? "" : "/crm";

/** Every CRM address in one place. Pages link with these, never with string literals. */
export const CRM = {
  root: CRM_BASE || "/",
  leads: `${CRM_BASE}/leads`,
  lead: (id: string) => `${CRM_BASE}/leads/${encodeURIComponent(id)}`,
  newLead: `${CRM_BASE}/leads/new`,
  pipeline: `${CRM_BASE}/pipeline`,
  today: `${CRM_BASE}/today`,
  demos: `${CRM_BASE}/demos`,
  finder: `${CRM_BASE}/finder`,
  import: `${CRM_BASE}/import`,
  settings: `${CRM_BASE}/settings`,
  /**
   * The admin is always on the main site: "/admin" there, MAIN_ORIGIN/admin
   * from the CRM's own subdomain. When mainSiteIsCrossOrigin(), render it as
   * a plain <a href>, not a router <Link>.
   */
  admin: mainSiteUrl("/admin"),
} as const;

export interface CrmNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Exact match (the dashboard). */
  end?: boolean;
  /** Shown in the phone bottom bar; the rest go under "More". */
  primary?: boolean;
  /** Which count to show as a badge. */
  badge?: "due" | "hot" | "unlinkedDemos";
}

export const CRM_NAV: CrmNavItem[] = [
  { to: CRM.root, label: "Dashboard", icon: LayoutDashboard, end: true, primary: true },
  { to: CRM.today, label: "Today", icon: CalendarCheck, primary: true, badge: "due" },
  { to: CRM.leads, label: "Leads", icon: Users, primary: true },
  { to: CRM.pipeline, label: "Pipeline", icon: Columns3, primary: true },
  { to: CRM.demos, label: "Demos", icon: MonitorSmartphone, badge: "unlinkedDemos" },
  { to: CRM.finder, label: "Lead finder", icon: MapPin },
  { to: CRM.import, label: "Import", icon: Import },
  { to: CRM.settings, label: "Settings", icon: Settings },
];

/** Opening a lead from anywhere in the CRM. */
export function useOpenLead(): (id: string) => void {
  const navigate = useNavigate();
  return useCallback((id: string) => navigate(CRM.lead(id)), [navigate]);
}
