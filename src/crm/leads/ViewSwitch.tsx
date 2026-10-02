import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Columns3, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { CRM_SCOPE_LABELS, useCrmData, type CrmScope } from "../useCrmData";

/** Filter params both screens share; the table's view and sort stay on the table. */
const SHARED = ["q", "kind", "city", "source", "assignee", "old", "demo", "hot", "overdue", "campaign"];

const SCOPE_TITLE: Record<CrmScope, string> = {
  mine: "Leads you work (Mehdi: also the Unassigned pool)",
  team: "Leads someone else in the team works",
  all: "Every lead",
  unassigned: "Open leads nobody works yet: the pool to share out",
};

/**
 * WHOSE LEADS (spec 10.4): Mine, Team, All, Unassigned, for Mehdi and admins.
 * Each screen remembers its own choice in this browser (useCrmData). Nothing
 * shows for a member (they read only their own leads) or before the team.
 * Buttons, not tabs: the saved views below are the tabs.
 */
export function ScopeSwitch({ className, counts }: { className?: string; counts?: Partial<Record<CrmScope, number>> }) {
  const { scopes, scope, setScope } = useCrmData();
  if (!scopes.length) return null;
  const item =
    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-10 max-md:flex-1 max-md:justify-center max-md:px-1.5";
  return (
    <div role="group" aria-label="Whose leads" data-testid="crm-scope"
      className={cn("inline-flex rounded-lg border border-border bg-background p-0.5 max-md:flex max-md:w-full", className)}>
      {scopes.map((s) => {
        const on = s === scope;
        const n = counts?.[s];
        return (
          <button key={s} type="button" aria-pressed={on} title={SCOPE_TITLE[s]} onClick={() => setScope(s)}
            className={cn(item, on ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {CRM_SCOPE_LABELS[s]}
            {n !== undefined && n > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-[11px] tabular-nums text-primary">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

function carry(params: URLSearchParams, extra: string[] = []): string {
  const n = new URLSearchParams();
  for (const k of [...SHARED, ...extra]) {
    const v = params.get(k);
    if (v) n.set(k, v);
  }
  const s = n.toString();
  return s ? `?${s}` : "";
}

/** Table / Board segmented switch. Carries the filters across. */
export function ViewSwitch({ current, params }: { current: "table" | "board"; params: URLSearchParams }) {
  const item = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-10";
  return (
    <div role="group" aria-label="Layout" className="inline-flex rounded-lg border border-border bg-background p-0.5">
      <Link to={CRM.leads + carry(params, ["status"])} aria-current={current === "table" ? "page" : undefined}
        className={cn(item, current === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
        <Rows3 className="h-3.5 w-3.5" aria-hidden="true" /> Table
      </Link>
      <Link to={CRM.pipeline + carry(params)} aria-current={current === "board" ? "page" : undefined}
        className={cn(item, current === "board" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
        <Columns3 className="h-3.5 w-3.5" aria-hidden="true" /> Board
      </Link>
    </div>
  );
}

/** True at the Tailwind md breakpoint and wider. */
export function useWide(): boolean {
  const q = "(min-width: 768px)";
  const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(q).matches));
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

/** Keys typed in a field, a menu or a dialog are not shortcuts. */
export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
  return !!el.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]');
}
