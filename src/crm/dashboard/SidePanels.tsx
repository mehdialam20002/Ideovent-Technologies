import { Link } from "react-router-dom";
import { Flame, MessageSquare, MonitorSmartphone } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { dueLabel } from "@/admin/outreach/ui";
import type { CrmMetrics } from "../metrics";
import { CRM, useOpenLead } from "../nav";
import { crm, StatusDot } from "../ui";
import { cn } from "@/lib/utils";
import { ago, plural } from "./format";

/** Demo opened since the last message: the leads to call first. */
export function HotPanel({ m, now }: { m: CrmMetrics; now: Date }) {
  const openLead = useOpenLead();
  const list = m.hot.slice(0, 6);
  return (
    <section className={cn(crm.panel, "overflow-hidden")} aria-labelledby="hot-h" data-testid="hot-leads">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 id="hot-h" className={cn(crm.label, "flex items-center gap-1.5")}>
          <Flame className="h-3.5 w-3.5 text-[#f59e0b]" aria-hidden="true" /> Hot leads
          <span className={cn("font-normal normal-case tracking-normal", crm.num)}>{m.hot.length}</span>
        </h2>
        {m.hot.length > 0 && <Link to={CRM.today} className="text-[12px] text-muted-foreground hover:text-foreground">Today</Link>}
      </div>
      {list.length === 0 ? (
        <p className="px-4 pb-4 pt-2 text-[13px] text-muted-foreground">
          Nobody has opened a demo since your last message. Send a demo link from a lead page; when they open it, the lead shows up here.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {list.map((h) => (
            <li key={h.lead.id} className="flex items-center gap-2 px-4 py-2">
              <button
                type="button"
                onClick={() => openLead(h.lead.id)}
                className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block truncate text-[13px] font-medium">{h.lead.instituteName}</span>
                <span className={cn("block truncate text-[12px] text-muted-foreground", crm.num)}>
                  {plural(h.opens.length, "open")}, last {ago(h.lastOpenAt, now)}{h.lead.city ? ` · ${h.lead.city}` : ""}
                </span>
              </button>
              <Link to={CRM.lead(h.lead.id)} className={cn(crm.btnPrimary, "h-8 shrink-0 px-2.5 max-md:h-10")} aria-label={`Message ${h.lead.instituteName}`}>
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Message
              </Link>
            </li>
          ))}
        </ul>
      )}
      {m.hot.length > list.length && (
        <Link to={CRM.today} className="block px-4 py-2.5 text-[12px] text-muted-foreground hover:text-foreground">
          {m.hot.length - list.length} more on Today
        </Link>
      )}
    </section>
  );
}

function DueRow({ l, now, late }: { l: OutreachLead; now: Date; late?: boolean }) {
  return (
    <li>
      <Link to={CRM.lead(l.id)} className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none">
        <StatusDot status={l.status} />
        <span className="min-w-0 flex-1 truncate text-[13px]">{l.instituteName}</span>
        <span className={cn("shrink-0 text-[12px]", late ? "font-medium text-destructive" : "text-muted-foreground")}>{dueLabel(l.nextActionAt, now)}</span>
      </Link>
    </li>
  );
}

/** Follow-ups: overdue first (red), then due today. */
export function DuePanel({ m, now }: { m: CrmMetrics; now: Date }) {
  const { overdue, today } = m.due;
  const n = overdue.length + today.length;
  const LIMIT = 8;
  const shownOver = overdue.slice(0, LIMIT);
  const shownToday = today.slice(0, Math.max(0, LIMIT - shownOver.length));
  return (
    <section className={cn(crm.panel, "overflow-hidden")} aria-labelledby="due-h" data-testid="due-panel">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 id="due-h" className={crm.label}>
          Follow-ups <span className={cn("font-normal normal-case tracking-normal", crm.num)}>{n}</span>
        </h2>
        <Link to={CRM.today} className="text-[12px] text-muted-foreground hover:text-foreground">Open Today</Link>
      </div>
      {n === 0 ? (
        <p className="px-4 pb-4 pt-2 text-[13px] text-muted-foreground">Nothing due today. Set a next action date on a lead after each message and it lands here.</p>
      ) : (
        <div className="mt-2 pb-1">
          {shownOver.length > 0 && (
            <>
              <p className="px-4 pt-1 text-[11px] font-medium uppercase tracking-wider text-destructive">Overdue {overdue.length}</p>
              <ul>{shownOver.map((l) => <DueRow key={l.id} l={l} now={now} late />)}</ul>
            </>
          )}
          {shownToday.length > 0 && (
            <>
              <p className={cn(crm.label, "px-4 pt-2")}>Today {today.length}</p>
              <ul>{shownToday.map((l) => <DueRow key={l.id} l={l} now={now} />)}</ul>
            </>
          )}
          {n > shownOver.length + shownToday.length && (
            <Link to={CRM.today} className="block px-4 py-2 text-[12px] text-muted-foreground hover:text-foreground">
              {n - shownOver.length - shownToday.length} more on Today
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/** Demos made in the admin (templates, poster upload, editor) that no lead points at. */
export function UnlinkedCallout({ m }: { m: CrmMetrics }) {
  if (m.unlinkedDemos <= 0) return null;
  return (
    <Link
      to={CRM.demos}
      data-testid="unlinked-callout"
      className={cn(crm.panel, "flex items-start gap-3 border-[#f59e0b]/50 p-4 hover:border-[#f59e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    >
      <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" aria-hidden="true" />
      <span className="text-[13px]">
        <span className="font-medium">{plural(m.unlinkedDemos, "demo has", "demos have")} no lead</span>
        <span className="block text-muted-foreground">Their opens are not tracked against anyone. Create or link a lead on Demos.</span>
      </span>
    </Link>
  );
}
