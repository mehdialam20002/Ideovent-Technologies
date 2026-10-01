import { CRM_SCOPE_LABELS, useCrmData, type CrmScope, type CrmScreen } from "../useCrmData";
import { cn } from "@/lib/utils";

/**
 * WHOSE LEADS A SCREEN SHOWS (spec 10.4): Mine, Team, All, Unassigned, for
 * Mehdi and admins, on the Dashboard, Today and the Pipeline. Each screen
 * remembers its own choice in this browser (Today and Pipeline open on Mine,
 * the Dashboard on All). A member, and Mehdi before the team update, get no
 * switch: they read only what is theirs. It looks and reads the same as the
 * Leads table's switch (leads/ViewSwitch.tsx).
 */
const TITLE: Record<CrmScope, string> = {
  mine: "Leads you work (Mehdi: also the Unassigned pool)",
  team: "Leads someone else in the team works",
  all: "Every lead",
  unassigned: "Open leads nobody works yet: the pool to share out",
};

export function ScopeSwitch({ screen, className }: { screen: CrmScreen; className?: string }) {
  const { scopes, scopeFor, setScope } = useCrmData();
  if (!scopes.length) return null;
  const current = scopeFor(screen);
  const item =
    "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-10 max-md:flex-1 max-md:justify-center max-md:px-1.5";
  return (
    <div role="group" aria-label="Whose leads" data-testid="crm-scope"
      className={cn("inline-flex rounded-lg border border-border bg-background p-0.5 max-md:flex max-md:w-full", className)}>
      {scopes.map((s) => {
        const on = current === s;
        return (
          <button key={s} type="button" data-scope={s} aria-pressed={on} title={TITLE[s]} onClick={() => setScope(s, screen)}
            className={cn(item, on ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {CRM_SCOPE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
