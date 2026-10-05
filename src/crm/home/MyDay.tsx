import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCrmData } from "../useCrmData";
import { useCrmMe } from "../useCrmMe";
import { CRM } from "../nav";
import { crm, PageHeader } from "../ui";
import { cn } from "@/lib/utils";
import { plural } from "../dashboard/format";
import { PhoneSetup } from "../me/PhoneSetup";
import { buildTodaySections, TodayQueue, useQueueMarks } from "../today/TodayQueue";
import { rowOf, useActivityStats, type StatsPeriod } from "../performance/useActivityStats";
import { CloseThese } from "./CloseThese";
import { Banners, MyHandovers, MyPipeline, NumbersPanel, WhatsAppHealth } from "./MyDayPanels";

const PERIODS: readonly StatsPeriod[] = ["today", "week", "month"];

/**
 * MY DAY (spec 10.5): a member's first screen, built for the phone first.
 *
 * Top to bottom on a phone (two columns from lg up, the numbers on the right):
 *   1. Set up this phone, until Mehdi has checked the company number; then
 *      one line of small print, "Sends from WhatsApp Business, +91 ...";
 *   2. what changed: new leads, a demo ready, a fix Mehdi asked for, his
 *      answer to a hand-over or a request (the bell's unread lines);
 *   3. today's queue (Hot, Overdue, Due today, New) over their own leads,
 *      with "Good time to call" on the leads they may call now;
 *   4. Close these: the cadence is over and nothing came back;
 *   5. their numbers against Mehdi's targets (crm_activity_stats, so they
 *      agree with his Team page), with the hand-overs he accepted;
 *   6. WhatsApp health: first messages against the daily limit, and this
 *      month's first messages with no reply;
 *   7. their pipeline by stage;
 *   8. their hand-overs and requests, with Mehdi's answer.
 */
export function MyDay() {
  const { me, mine, opens, now, loading, closeThese, openCtx } = useCrmData();
  const { can } = useCrmMe();
  const marks = useQueueMarks(true);
  const sections = useMemo(() => buildTodaySections(mine, opens, now, openCtx, marks), [mine, opens, now, openCtx, marks]);
  const stats = useActivityStats(PERIODS);
  const today = rowOf(stats.today.rows, me.memberId);
  const week = rowOf(stats.week.rows, me.memberId);
  const month = rowOf(stats.month.rows, me.memberId);

  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const todo = sections.count ? `${plural(sections.count, "lead")} in your queue` : "Nothing due in your queue";
  const subtitle = `${date}. ${todo}${closeThese.length ? `, ${closeThese.length} to close` : ""}.`;

  const empty = loading ? (
    <p className="text-[13px] text-muted-foreground">Loading...</p>
  ) : (
    <div className={cn(crm.panel, "px-5 py-8 text-center")} data-testid="my-day-empty">
      <p className="text-sm font-medium">Nothing to do right now</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
        No demo opens, no follow-ups due and no new leads waiting{sections.snoozed ? ` (${sections.snoozed} snoozed)` : ""}. Mehdi assigns your leads: new ones show up here.
      </p>
      {can("lead.add") && (
        <Link to={CRM.newLead} className={cn(crm.btn, "mt-4")}>New lead</Link>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1200px]" data-testid="my-day">
      <PageHeader title="My day" subtitle={subtitle} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <PhoneSetup />
          <Banners />
          <section aria-labelledby="my-queue-h" data-testid="my-queue">
            <h2 id="my-queue-h" className={cn(crm.label, "mb-2")}>Today's queue</h2>
            <TodayQueue sections={sections} empty={empty} compact />
          </section>
          <CloseThese />
        </div>
        <aside className="min-w-0 space-y-4" aria-label="My numbers, pipeline and hand-overs">
          <NumbersPanel today={today} week={week} error={stats.today.error || stats.week.error} />
          <WhatsAppHealth today={today} month={month} />
          <MyPipeline />
          <MyHandovers />
        </aside>
      </div>
    </div>
  );
}

export default MyDay;
