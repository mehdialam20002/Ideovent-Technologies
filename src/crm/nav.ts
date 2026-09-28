import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck, Columns3, Import, LayoutDashboard, MapPin, MonitorSmartphone, Settings, Users, type LucideIcon,
} from "lucide-react";

/** Every CRM address in one place. Pages link with these, never with string literals. */
export const CRM = {
  root: "/crm",
  leads: "/crm/leads",
  lead: (id: string) => `/crm/leads/${encodeURIComponent(id)}`,
  newLead: "/crm/leads/new",
  pipeline: "/crm/pipeline",
  today: "/crm/today",
  demos: "/crm/demos",
  finder: "/crm/finder",
  import: "/crm/import",
  settings: "/crm/settings",
  admin: "/admin",
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
