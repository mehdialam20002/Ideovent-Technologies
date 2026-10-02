import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck, Columns3, House, Import, LayoutDashboard, MapPin, MonitorSmartphone, Settings, UserRound, Users, UsersRound,
  type LucideIcon,
} from "lucide-react";
import { isCrmHost, mainSiteUrl } from "@/lib/host";
import type { CrmMe } from "@/lib/outreach/team";

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
  /** The team: people, performance, access, activity (owner manages, admins read). */
  team: `${CRM_BASE}/team`,
  /** A person's own page: profile, targets, Set up this phone, password, sign out. */
  me: `${CRM_BASE}/me`,
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
  /** Exact match (the dashboard, My day). */
  end?: boolean;
  /** Shown in the phone bottom bar; the rest go under "More". */
  primary?: boolean;
  /** Which count to show as a badge. */
  badge?: "due" | "hot" | "unlinkedDemos" | "unassigned";
}

/** Mehdi's eight screens, as before the team: the rail e2e-crm-host checks link by link. */
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

const TEAM_ITEM: CrmNavItem = { to: CRM.team, label: "Team", icon: UsersRound, badge: "unassigned" };

/**
 * An admin's own page (password, Sign out), under the rail's list. Spec 10.1
 * gives admins no Me in the rail and the shell has no Sign out, and /admin
 * (where Mehdi signs out) is not theirs: without this an admin could neither
 * sign out nor change their password.
 */
const ADMIN_ME_ITEM: CrmNavItem = { to: CRM.me, label: "Me", icon: UserRound };

/** An admin (a trusted senior): the daily screens and the Team page, read only. */
const ADMIN_NAV: CrmNavItem[] = [...CRM_NAV.slice(0, 4), TEAM_ITEM];

/** A member (an intern): their own day first. Phone tabs: My day, My leads, Pipeline, Me. */
const MEMBER_NAV: CrmNavItem[] = [
  { to: CRM.root, label: "My day", icon: House, end: true, primary: true, badge: "due" },
  { to: CRM.today, label: "Today", icon: CalendarCheck },
  { to: CRM.leads, label: "My leads", icon: Users, primary: true },
  { to: CRM.pipeline, label: "Pipeline", icon: Columns3, primary: true },
  { to: CRM.me, label: "Me", icon: UserRound, primary: true },
];

/** The navigation one person gets (spec 10.1). */
export interface CrmNavSet {
  /** The rail's list (aside > nav). */
  rail: CrmNavItem[];
  /** Below the rail's list. */
  railFooter: CrmNavItem[];
  /** The phone's bottom bar. */
  tabs: CrmNavItem[];
  /** The phone's More menu, before Back to admin; no More button when this and moreFooter are empty. */
  more: CrmNavItem[];
  /** The phone's More menu, after Back to admin. */
  moreFooter: CrmNavItem[];
  /** "Back to admin" in the header and the More menu: Mehdi only (/admin is his). */
  backToAdmin: boolean;
  /** The bell: the team's notifications (0011). */
  bell: boolean;
}

/**
 * Who sees which screens (spec 10.1):
 *   owner   Dashboard, Today, Leads, Pipeline, Team, Demos, Lead finder, Import, Settings
 *   admin   Dashboard, Today, Leads, Pipeline, Team (read only); Me under the list
 *   member  My day, Today, My leads, Pipeline, Me
 * Without 0011 (legacy) Mehdi's CRM is exactly as before: no Team, no bell.
 *
 * PART 1 OF THE TEAM BUILD: Mehdi's Team link sits under the rail's list (and
 * after Back to admin in the phone's More menu), so his rail keeps the eight
 * links scripts/e2e-crm-host.mjs checks one by one. Part 2 (the team e2e,
 * which moves that check to nine links) puts it in the list, between Pipeline
 * and Demos: `rail: [...CRM_NAV.slice(0, 4), TEAM_ITEM, ...CRM_NAV.slice(4)]`.
 */
export function crmNav(me: Pick<CrmMe, "role" | "legacy">): CrmNavSet {
  const none = { railFooter: [], more: [], moreFooter: [], backToAdmin: false, bell: !me.legacy };
  if (me.role === "owner") {
    const team = me.legacy ? [] : [TEAM_ITEM];
    return {
      ...none,
      rail: CRM_NAV,
      railFooter: team,
      tabs: CRM_NAV.filter((i) => i.primary),
      more: CRM_NAV.filter((i) => !i.primary),
      moreFooter: team,
      backToAdmin: true,
    };
  }
  if (me.role === "admin") {
    return {
      ...none,
      rail: ADMIN_NAV,
      railFooter: [ADMIN_ME_ITEM],
      tabs: ADMIN_NAV.filter((i) => i.primary),
      more: ADMIN_NAV.filter((i) => !i.primary),
      moreFooter: [ADMIN_ME_ITEM],
    };
  }
  if (me.role === "member") return { ...none, rail: MEMBER_NAV, tabs: MEMBER_NAV.filter((i) => i.primary) };
  return { ...none, rail: [], tabs: [], bell: false };
}

/** Opening a lead from anywhere in the CRM. */
export function useOpenLead(): (id: string) => void {
  const navigate = useNavigate();
  return useCallback((id: string) => navigate(CRM.lead(id)), [navigate]);
}
