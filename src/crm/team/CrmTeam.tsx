import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { crm, PageHeader } from "../ui";
import { AccessTab, useFlaggedAccess } from "./AccessTab";
import { ActivityFeed } from "./ActivityFeed";
import { PeopleTab } from "./PeopleTab";
import { RulesPanel } from "./RulesPanel";
import { Note, plural } from "./teamUi";
import { useMembers } from "./useTeam";

/*
  Team > Performance is built by the dashboards package of the same release
  (src/crm/performance/TeamPerformance.tsx, spec 14.2 G). Picked up by the
  glob the moment it exists; until then the tab says so.
*/
const PERFORMANCE = import.meta.glob<Record<string, unknown>>("../performance/TeamPerformance.tsx");
const loadPerformance = PERFORMANCE["../performance/TeamPerformance.tsx"];
const TeamPerformance = loadPerformance
  ? lazy(() => loadPerformance().then((m) => ({ default: (m.default ?? m.TeamPerformance) as ComponentType })))
  : null;

type TabId = "people" | "performance" | "access" | "rules" | "activity";

/**
 * /team (spec 10.2, 10.6): Mehdi manages the team here; an admin reads it.
 * Tabs: People (Mehdi's default), Performance (an admin's default), Access
 * (Mehdi only, with a dot when the last 7 days hold a flagged day), Rules and
 * Activity. The tab is in the address (?tab=access&person=...&days=7), so the
 * switch-off checklist can link straight to one person's access log.
 * Members never reach it (App.tsx RoleGate "team.view"; the database refuses
 * them the rows anyway).
 */
export default function CrmTeam() {
  const { can, isOwner } = useCrmMe();
  const { unassignedOpen } = useCrmData();
  const { members } = useMembers();
  const [params, setParams] = useSearchParams();
  const flagged = useFlaggedAccess();
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    if (!msg || msg.bad) return;
    const t = window.setTimeout(() => setMsg(null), 6000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const tabs: { id: TabId; label: string; dot?: boolean }[] = [
    { id: "people", label: "People" },
    { id: "performance", label: "Performance" },
    ...(can("team.access") ? [{ id: "access" as const, label: "Access", dot: flagged }] : []),
    { id: "rules", label: "Rules" },
    { id: "activity", label: "Activity" },
  ];
  const fallback: TabId = isOwner ? "people" : "performance";
  const tab: TabId = tabs.find((t) => t.id === params.get("tab"))?.id || fallback;
  const setTab = (id: TabId) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (id === fallback) n.delete("tab");
        else n.set("tab", id);
        if (id !== "access") {
          n.delete("person");
          n.delete("days");
        }
        return n;
      },
      { replace: true },
    );
  const setAccess = (a: { person?: string | null; days?: number }) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set("tab", "access");
        if (a.person !== undefined) {
          if (a.person) n.set("person", a.person);
          else n.delete("person");
        }
        if (a.days !== undefined) n.set("days", String(a.days));
        return n;
      },
      { replace: true },
    );
  const days = params.get("days") === "30" ? 30 : 7;

  const active = members.filter((m) => m.active).length;
  return (
    <div className="mx-auto max-w-6xl" data-testid="crm-team">
      <PageHeader
        title="Team"
        subtitle={
          <span className={crm.num}>
            {members.length ? `${plural(active, "person", "people")} active` : "The people in your CRM"}
            {` · ${unassignedOpen} Unassigned`}
            {!can("team.manage") && " · read only"}
          </span>
        }
      />

      <div role="tablist" aria-label="Team" className="-mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-border px-3 md:mx-0 md:px-0">
        {tabs.map((t) => {
          const on = t.id === tab;
          return (
            <button key={t.id} id={`team-tab-${t.id}`} type="button" role="tab" aria-selected={on} aria-controls="team-panel"
              onClick={() => setTab(t.id)} data-testid={`team-tab-${t.id}`}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                on ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              {t.label}
              {t.dot && <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="has flagged days" />}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {msg && <Note tone={msg.bad ? "bad" : "good"} className="mb-3" testId="team-message">{msg.text}</Note>}
      </div>

      <div id="team-panel" role="tabpanel" aria-labelledby={`team-tab-${tab}`}>
        {tab === "people" && <PeopleTab onMessage={(text, bad) => setMsg({ text, bad })} />}
        {tab === "performance" &&
          (TeamPerformance ? (
            <Suspense fallback={<p className="text-[13px] text-muted-foreground">Loading the numbers...</p>}>
              <TeamPerformance />
            </Suspense>
          ) : (
            <Note testId="team-performance-pending">The numbers per person come with the dashboards of this release.</Note>
          ))}
        {tab === "access" && <AccessTab person={params.get("person")} days={days} onChange={setAccess} />}
        {tab === "rules" && <RulesPanel />}
        {tab === "activity" && <ActivityFeed />}
      </div>
    </div>
  );
}

export { CrmTeam };
