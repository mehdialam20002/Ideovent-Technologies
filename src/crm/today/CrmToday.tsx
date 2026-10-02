import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { OutreachEvent } from "@/lib/outreach/types";
import { sentToday } from "@/admin/outreach/derive";
import { useCrmData } from "../useCrmData";
import { useCrmMe } from "../useCrmMe";
import { CRM } from "../nav";
import { crm, PageHeader } from "../ui";
import { cn } from "@/lib/utils";
import { plural } from "../dashboard/format";
import { ScopeSwitch } from "../dashboard/ScopeSwitch";
import { CloseThese } from "../home/CloseThese";
import { buildTodaySections, TodayQueue, useQueueMarks } from "./TodayQueue";
import { WaitingOnYou } from "./WaitingOnYou";

/**
 * /crm/today, full width. Mehdi and admins: Waiting on you first (the team's
 * hand-overs and questions), then the queue of the scope on show (Mine by
 * default: his own leads and the Unassigned pool, so on the day of the team
 * update it is exactly today's queue), then Close these over his own leads. A
 * member: the queue of their own leads (the same one My day shows), and their
 * Close these.
 */
export default function CrmToday() {
  const { scopedLeads, scope, events, opens, now, loading, isStaff, isMember } = useCrmData();
  const { can } = useCrmMe();
  const marks = useQueueMarks(isMember);
  const sections = useMemo(() => buildTodaySections(scopedLeads, opens, now, marks), [scopedLeads, opens, now, marks]);

  /* "Sent today" counts the sends on the leads on show (every send on All). */
  const sends = useMemo((): OutreachEvent[] => {
    if (scope === "all") return events;
    const ids = new Set(scopedLeads.map((l) => l.id));
    return events.filter((e) => ids.has(e.leadId));
  }, [scope, events, scopedLeads]);
  const wa = sentToday(sends, "whatsapp", now);
  const mail = sentToday(sends, "email", now);
  const mineOnShow = scope === "mine" || scope === "all";

  const empty = loading ? (
    <p className="text-[13px] text-muted-foreground">Loading...</p>
  ) : (
    <div className={cn(crm.panel, "px-6 py-12 text-center")} data-testid="today-empty">
      <p className="text-sm font-medium">Nothing to do right now</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
        No demo opens, no follow-ups due and no new leads waiting{sections.snoozed ? ` (${sections.snoozed} snoozed)` : ""}.{" "}
        {can("finder") ? "Find more leads or import a list." : isMember ? "Mehdi assigns your leads: new ones show up here." : ""}
      </p>
      {(can("finder") || can("lead.import") || can("lead.add")) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {can("finder") && <Link to={CRM.finder} className={crm.btnPrimary}>Lead finder</Link>}
          {can("lead.import") && <Link to={CRM.import} className={crm.btn}>Import</Link>}
          {can("lead.add") && <Link to={CRM.newLead} className={crm.btn}>New lead</Link>}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full" data-testid="crm-today">
      <PageHeader
        title="Today"
        subtitle={
          <span className={crm.num} data-testid="sent-today">
            Sent today: {plural(wa, "WhatsApp", "WhatsApp")}, {mail} email. {sections.count ? <span className="max-md:hidden">j and k move, Enter opens, s snoozes a day.</span> : null}
          </span>
        }
        actions={<ScopeSwitch screen="today" />}
      />
      {isStaff && <WaitingOnYou className="mb-4" />}
      <TodayQueue sections={sections} empty={empty} />
      {mineOnShow && <CloseThese className="mt-4" />}
    </div>
  );
}
