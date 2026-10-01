import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Circle, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useCms } from "@/lib/cms/context";
import { markTeamDevice } from "@/lib/demo/opens";
import { isOpenStatus } from "@/lib/outreach/access";
import { OutreachProvider } from "@/admin/outreach/useOutreach";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Seo } from "@/components/seo/Seo";
import { CrmDataProvider, useCrmData } from "./useCrmData";
import { ActAsMenu, CrmMeProvider, useCrmMe } from "./useCrmMe";
import { GlobalSearch } from "./GlobalSearch";
import { CRM, crmNav, type CrmNavItem, type CrmNavSet } from "./nav";
import { AccessOff, MeUnavailable } from "./auth/AccessOff";
import { FirstPassword } from "./auth/FirstPassword";
import { Bell, NotificationsProvider } from "./notifications/Bell";
import { mainSiteIsCrossOrigin } from "@/lib/host";
import { cn } from "@/lib/utils";

const RAIL_KEY = "ideovent_crm_rail_collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * THE CRM SHELL, at /crm on the main site, or at the root of its own
 * subdomain (crm.ideovent.in, see nav.ts). Full screen, its own tab, outside
 * the admin shell but behind the same sign-in. Left: a slim rail (collapsible,
 * remembered per browser). Top: lead search, New lead, the bell, Back to admin.
 * Phones: a bottom tab bar with the daily screens and "More".
 *
 * THE TEAM (spec 10.1). Who is signed in comes first (CrmMeProvider, crm_me),
 * then the gates, in order:
 *   1. loading;
 *   2. AccessOff: no role (switched off, not in the team, signed out);
 *   3. FirstPassword: while they must set their own password;
 *   4. the shell, with the rail, tabs and header of their role (nav.ts crmNav).
 * The leads are loaded only behind the gates, as that person: the data
 * providers start over whenever the person changes (local mode's Act as, or
 * a role Mehdi changed), so nothing of one person's view outlives them.
 */
export default function CrmLayout() {
  const { mode, actions } = useCms();

  // A team browser (Mehdi's, or a team member's): opens of demos from it never count or alert.
  useEffect(() => {
    markTeamDevice();
  }, []);

  // Content first loaded as a visitor hides demo opens and drafts; reload signed in.
  useEffect(() => {
    if (mode === "supabase") void actions.refresh();
  }, [mode, actions]);

  return (
    <CrmMeProvider>
      <CrmGates />
    </CrmMeProvider>
  );
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-label={label}>
      <Seo title="CRM" noindex />
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function CrmGates() {
  const { me, loading, ready, error } = useCrmMe();
  if (loading) return <FullScreenLoader label="Checking your access" />;
  if (!ready) return <MeUnavailable error={error || "No answer from the CRM."} />;
  if (!me.role) return <AccessOff />;
  if (me.mustChangePassword) return <FirstPassword />;
  return <CrmApp />;
}

/** The data, as this person. A new person (Act as, a changed role or See all) loads it afresh. */
function CrmApp() {
  const { me, actingAs } = useCrmMe();
  const who = [actingAs || "", me.memberId || "", me.role || "", me.viewAll ? "all" : "own", me.legacy ? "legacy" : ""].join("|");
  return (
    <OutreachProvider key={who}>
      <CrmDataProvider>
        <NotificationsProvider>
          <CrmShell />
        </NotificationsProvider>
      </CrmDataProvider>
    </OutreachProvider>
  );
}

function useBadge(item: CrmNavItem): number {
  const { metrics, leads } = useCrmData();
  if (item.badge === "due") return metrics.due.today.length + metrics.due.overdue.length;
  if (item.badge === "hot") return metrics.hot.length;
  if (item.badge === "unlinkedDemos") return metrics.unlinkedDemos;
  /* The pool: open leads nobody works (assigneeId null; undefined = no team data). */
  if (item.badge === "unassigned") return leads.filter((l) => l.assigneeId === null && isOpenStatus(l.status)).length;
  return 0;
}

function Badge({ item, dotOnly }: { item: CrmNavItem; dotOnly?: boolean }) {
  const n = useBadge(item);
  if (!n) return null;
  if (dotOnly) return <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" aria-label={`${n}`} />;
  return (
    <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground tabular-nums">{n}</span>
  );
}

function RailLink({ item, collapsed }: { item: CrmNavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-0",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
      <Badge item={item} dotOnly={collapsed} />
    </NavLink>
  );
}

function Rail({ nav }: { nav: CrmNavSet }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(RAIL_KEY, c ? "0" : "1");
      } catch {
        /* not remembered, still works */
      }
      return !c;
    });
  };
  return (
    <aside className={cn("hidden shrink-0 flex-col border-r border-border bg-card/60 md:flex", collapsed ? "w-14" : "w-52")} aria-label="CRM">
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center" : "justify-between px-4")}>
        {!collapsed && (
          <Link to={CRM.root} className="flex items-center gap-2 font-display text-[15px] font-semibold">
            Ideovent <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">CRM</span>
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand the side menu" : "Collapse the side menu"}
          aria-expanded={!collapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {nav.rail.map((item) => (
          <RailLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>
      {/* Below the list: Mehdi's Team link in part 1 of the team build, an admin's Me (nav.ts crmNav). */}
      {nav.railFooter.length > 0 && (
        <div role="navigation" aria-label={nav.railFooter.map((i) => i.label).join(", ")} className="space-y-0.5 border-t border-border p-2">
          {nav.railFooter.map((item) => (
            <RailLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>
      )}
    </aside>
  );
}

/**
 * "Back to admin" (Mehdi only: /admin is his). The admin lives on the main
 * site: from the CRM's own subdomain that is another origin, which a router
 * <Link> cannot leave to, so there it is a plain link to MAIN_ORIGIN/admin. On
 * the main site it is the same in-app link as before.
 */
function BackToAdmin({ className }: { className: string }) {
  const label = (
    <>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to admin
    </>
  );
  return mainSiteIsCrossOrigin() ? (
    <a href={CRM.admin} className={className} data-testid="crm-back-to-admin">{label}</a>
  ) : (
    <Link to={CRM.admin} className={className} data-testid="crm-back-to-admin">{label}</Link>
  );
}

function MoreLink({ item }: { item: CrmNavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm", isActive ? "bg-primary/10 text-primary" : "hover:bg-muted")}
    >
      <item.icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
      <Badge item={item} />
    </NavLink>
  );
}

function BottomBar({ nav }: { nav: CrmNavSet }) {
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMore(false), [pathname]);
  const hasMore = nav.more.length > 0 || nav.moreFooter.length > 0 || nav.backToAdmin;
  const tab =
    "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  return (
    <>
      {more && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMore(false)} aria-hidden="true" />}
      {more && hasMore && (
        <div id="crm-more" className="fixed inset-x-3 bottom-[4.25rem] z-50 rounded-xl border border-border bg-card p-1.5 shadow-xl md:hidden">
          {nav.more.map((item) => (
            <MoreLink key={item.to} item={item} />
          ))}
          {nav.backToAdmin && <BackToAdmin className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted" />}
          {nav.moreFooter.length > 0 && (nav.more.length > 0 || nav.backToAdmin) && <div className="mx-2 my-1 border-t border-border" aria-hidden="true" />}
          {nav.moreFooter.map((item) => (
            <MoreLink key={item.to} item={item} />
          ))}
        </div>
      )}
      <nav aria-label="CRM tabs" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {nav.tabs.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn(tab, isActive ? "text-primary" : "text-muted-foreground")}>
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
            <Badge item={item} dotOnly />
          </NavLink>
        ))}
        {hasMore && (
          <button type="button" className={cn(tab, more ? "text-primary" : "text-muted-foreground")} aria-expanded={more} aria-controls="crm-more" onClick={() => setMore((m) => !m)}>
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        )}
      </nav>
    </>
  );
}

const topBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function CrmShell() {
  const { mode, loading, error, metrics } = useCrmData();
  const { me, can } = useCrmMe();
  const nav = crmNav(me);
  /* "(3) CRM": the due and overdue follow-ups, in the tab's title (spec 10.8). */
  const due = metrics.due.today.length + metrics.due.overdue.length;
  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Seo title={due > 0 ? `(${due}) CRM` : "CRM"} noindex />
      <a href="#crm-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-primary-foreground">
        Skip to content
      </a>
      <Rail nav={nav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:gap-3 md:px-5">
          <Link to={CRM.root} className="font-display text-[15px] font-semibold md:hidden">CRM</Link>
          <GlobalSearch className="min-w-0 flex-1 md:max-w-md" />
          <div className="ml-auto flex items-center gap-1.5">
            {can("lead.add") && (
              <Link to={CRM.newLead} className={cn(topBtn, "bg-primary px-2.5 font-medium text-primary-foreground hover:opacity-90 sm:px-3")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New lead</span>
                <span className="sr-only sm:hidden">New lead</span>
              </Link>
            )}
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] lg:px-2.5",
                mode === "supabase" ? "border-success/40 text-success" : "border-border text-muted-foreground",
              )}
              title={mode === "supabase" ? "Leads are saved in Supabase" : "Leads stay in this browser"}
            >
              <Circle className={cn("h-2 w-2 fill-current", mode === "supabase" ? "text-success" : "text-warning")} aria-hidden="true" />
              <span className="lg:hidden">{mode === "supabase" ? "Live" : "Local"}</span>
              <span className="hidden lg:inline">{mode === "supabase" ? "Live" : "Local mode"}</span>
            </span>
            <ActAsMenu />
            {nav.bell && <Bell />}
            {nav.backToAdmin && (
              <BackToAdmin className={cn(topBtn, "hidden border border-border px-3 text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex")} />
            )}
            <ThemeToggle />
          </div>
        </header>
        {error && (
          <p role="alert" className="mx-3 mt-3 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[13px] md:mx-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            {error}
          </p>
        )}
        <main id="crm-main" tabIndex={-1} className="min-h-0 flex-1 focus:outline-none overflow-y-auto px-3 pb-24 pt-4 md:px-6 md:pb-8 md:pt-5">
          {loading ? (
            <div className="flex justify-center py-20" role="status" aria-label="Loading the CRM">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <BottomBar nav={nav} />
    </div>
  );
}
