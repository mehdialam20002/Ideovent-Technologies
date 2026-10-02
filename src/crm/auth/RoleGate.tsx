import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DatabaseZap, Lock, UsersRound } from "lucide-react";
import type { CrmAction } from "@/lib/outreach/access";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { CRM } from "../nav";
import { crm } from "../ui";

/**
 * A SCREEN ONLY SOME PEOPLE OPEN (spec 10.1). App.tsx wraps Demos, Lead
 * finder, Import, Settings and Team in it. Everyone else gets "This screen is
 * Mehdi's" inside the CRM shell, never the screen: an admin is refused Demos,
 * Lead finder, Import and Settings; a member those and Team as well.
 *
 * Hiding a screen is not the lock. What it would read or write is refused by
 * the database (row security, the team functions) and by /api/leads-search;
 * this keeps people out of screens that would only fail.
 */
export default function RoleGate({ action, children }: { action: CrmAction; children: ReactNode }) {
  const { can, me, isMember } = useCrmMe();
  if (can(action)) return <>{children}</>;
  /* Mehdi before the database's team update (0011): the team screens wait for it. */
  if (me.role === "owner" && me.legacy) {
    return (
      <Refusal icon={DatabaseZap} title="This needs the team update" testId="crm-needs-0011">
        The Team page works once the database has its team update (supabase/migrations/0011_crm_team.sql; SUPABASE_SETUP.md,
        section 0011). Until then the CRM is yours alone, exactly as before.
      </Refusal>
    );
  }
  return (
    <Refusal icon={Lock} title="This screen is Mehdi's" testId="crm-role-gate" home={isMember ? "My day" : "the dashboard"}>
      Your login does not open it. If you need something from it, ask Mehdi.
    </Refusal>
  );
}

export { RoleGate };

function Refusal({
  icon: Icon,
  title,
  children,
  testId,
  home,
}: {
  icon: typeof Lock;
  title: string;
  children: ReactNode;
  testId: string;
  home?: string;
}) {
  return (
    <section data-testid={testId} aria-labelledby={`${testId}-title`} className={cn(crm.panel, "mx-auto mt-6 max-w-md p-6 text-center sm:mt-10")}>
      <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 id={`${testId}-title`} className="mt-3 font-display text-lg font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{children}</p>
      {home && (
        <Link to={CRM.root} className={cn(crm.btn, "mt-4")}>
          Back to {home}
        </Link>
      )}
    </section>
  );
}

/**
 * The CRM's first screen, by role (spec 10.1, 10.5): My day for a member,
 * the dashboard for Mehdi and admins.
 */
export function ByRole({ member, other }: { member: ReactNode; other: ReactNode }) {
  const { isMember } = useCrmMe();
  return <>{isMember ? member : other}</>;
}

/** The Team route while src/crm/team/CrmTeam.tsx is not in the build yet (App.tsx picks it up by itself). */
export function TeamPending() {
  return (
    <Refusal icon={UsersRound} title="Team" testId="crm-team-pending" home="the dashboard">
      The Team page (people, performance, access) is not in this build yet.
    </Refusal>
  );
}
