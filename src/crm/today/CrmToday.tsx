import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { OutreachLead } from "@/lib/outreach/types";
import { nextStep, repliedChanges, todayQueue } from "@/admin/outreach/compose";
import { endOfToday, sentToday } from "@/admin/outreach/derive";
import { dueLabel } from "@/admin/outreach/ui";
import { useCrmData } from "../useCrmData";
import { CRM, useOpenLead } from "../nav";
import { startOfDay } from "../metrics";
import { crm, PageHeader } from "../ui";
import { cn } from "@/lib/utils";
import { ago, plural } from "../dashboard/format";
import { TodayRow, type TodayItem } from "./TodayRow";

const NEW_PAGE = 25;
const CAN_REPLY = new Set(["new", "contacted", "demo_opened"]);

/** 10:00 local, `days` from today: when a snoozed lead comes back. */
function snoozeDate(days: number, now: Date): Date {
  const d = startOfDay(now);
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

/**
 * /crm/today, full width. The same queue the Outreach Today tab and the lead
 * screen's "Next lead" walk (todayQueue + nextStep from compose.ts), split
 * into Hot, Overdue, Due today and New, with one-key actions.
 */
export default function CrmToday() {
  const { leads, events, opens, now, updateLead, setStatus, addEvent, loading } = useCrmData();
  const openLead = useOpenLead();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [allNew, setAllNew] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const q = useMemo(() => todayQueue(leads, opens, now), [leads, opens, now]);
  const sections = useMemo(() => {
    const start = startOfDay(now).getTime();
    const endToday = endOfToday(now).getTime();
    const item = (lead: OutreachLead, extra: Partial<TodayItem>): TodayItem => {
      const s = nextStep(lead, opens, now);
      return {
        lead, step: s.text, urgent: s.urgent, when: dueLabel(lead.nextActionAt, now),
        canSnooze: true, canMarkReplied: CAN_REPLY.has(lead.status), ...extra,
      };
    };
    const hot = q.hot.map((h) => item(h.lead, { when: `opened ${ago(h.lastOpenAt, now)}`, canSnooze: false, urgent: true }));
    const overdue = q.due.filter((l) => new Date(l.nextActionAt!).getTime() < start).map((l) => item(l, { late: true }));
    const today = q.due.filter((l) => new Date(l.nextActionAt!).getTime() >= start).map((l) => item(l, {}));
    // A new lead snoozed to a later day waits for that day.
    const snoozed = q.fresh.filter((l) => l.nextActionAt && new Date(l.nextActionAt).getTime() > endToday);
    const fresh = q.fresh.filter((l) => !snoozed.includes(l)).map((l) => item(l, { when: `added ${ago(l.createdAt, now)}` }));
    return { hot, overdue, today, fresh, snoozed: snoozed.length };
  }, [q, opens, now]);

  const newShown = allNew ? sections.fresh : sections.fresh.slice(0, NEW_PAGE);
  const flat = [...sections.hot, ...sections.overdue, ...sections.today, ...newShown];

  const run = useCallback(async (lead: OutreachLead, fn: () => Promise<unknown>, done: string) => {
    setBusyId(lead.id);
    setMsg(null);
    try {
      await fn();
      setMsg({ text: done });
    } catch (e) {
      setMsg({ text: `${lead.instituteName}: ${e instanceof Error ? e.message : "did not save"}. Try again.`, error: true });
    } finally {
      setBusyId(null);
    }
  }, []);

  const snooze = useCallback((lead: OutreachLead, days: number) => {
    const at = snoozeDate(days, new Date());
    const label = at.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    void run(lead, () => updateLead(lead.id, { nextActionAt: at.toISOString() }), `${lead.instituteName} snoozed to ${label}.`);
  }, [run, updateLead]);

  const replied = useCallback((lead: OutreachLead) => {
    // The same reply event and due date the lead page's "They replied" writes (compose.ts repliedChanges).
    const c = repliedChanges(lead);
    void run(lead, async () => {
      await setStatus(lead.id, "replied");
      await addEvent(c.event);
      await updateLead(lead.id, { nextActionAt: c.lead.nextActionAt });
    }, `${lead.instituteName} marked as replied. Next: After they say yes, send the sample link within the hour.`);
  }, [run, setStatus, addEvent, updateLead]);

  const focusRow = (i: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-today-row]");
    if (!rows?.length) return;
    rows[Math.max(0, Math.min(rows.length - 1, i))].focus();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-today-row]");
    if (!row || e.target !== row || e.ctrlKey || e.metaKey || e.altKey) return;
    const i = Number(row.dataset.todayRow);
    const it = flat[i];
    if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); focusRow(i + 1); }
    else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); focusRow(i - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (it) openLead(it.lead.id); }
    else if (e.key === "s" && it?.canSnooze) { e.preventDefault(); snooze(it.lead, 1); }
  };

  const wa = sentToday(events, "whatsapp", now);
  const mail = sentToday(events, "email", now);
  const nothing = !flat.length;
  let offset = 0;
  const section = (id: string, title: string, items: TodayItem[], hint?: string, tone?: string, footer?: ReactNode) => {
    const start = offset;
    offset += items.length;
    if (!items.length) return null;
    return (
      <section aria-labelledby={id} className={cn(crm.panel, "overflow-hidden")} data-testid={`today-${id}`}>
        <h2 id={id} className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-3 py-2.5 text-[13px] font-semibold md:px-4">
          <span className={tone}>{title}</span>
          <span className={cn("font-normal text-muted-foreground", crm.num)}>{items.length}</span>
          {hint && <span className="text-[12px] font-normal text-muted-foreground">{hint}</span>}
        </h2>
        <ul>
          {items.map((it, k) => (
            <TodayRow key={it.lead.id} item={it} index={start + k} busy={busyId === it.lead.id} onOpen={openLead} onSnooze={snooze} onReplied={replied} />
          ))}
        </ul>
        {footer}
      </section>
    );
  };

  return (
    <div className="w-full" data-testid="crm-today">
      <PageHeader
        title="Today"
        subtitle={
          <span className={crm.num} data-testid="sent-today">
            Sent today: {plural(wa, "WhatsApp", "WhatsApp")}, {mail} email. {flat.length ? <span className="max-md:hidden">j and k move, Enter opens, s snoozes a day.</span> : null}
          </span>
        }
      />
      <p aria-live="polite" role={msg?.error ? "alert" : "status"} className={cn("mb-3 min-h-0 text-[13px]", msg?.error ? "rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive" : "text-muted-foreground", !msg && "sr-only")}>
        {msg?.text}
      </p>
      {loading && nothing ? (
        <p className="text-[13px] text-muted-foreground">Loading...</p>
      ) : nothing ? (
        <div className={cn(crm.panel, "px-6 py-12 text-center")}>
          <p className="text-sm font-medium">Nothing to do right now</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
            No demo opens, no follow-ups due and no new leads waiting{sections.snoozed ? ` (${sections.snoozed} snoozed)` : ""}. Find more leads or import a list.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to={CRM.finder} className={crm.btnPrimary}>Lead finder</Link>
            <Link to={CRM.import} className={crm.btn}>Import</Link>
            <Link to={CRM.newLead} className={crm.btn}>New lead</Link>
          </div>
        </div>
      ) : (
        <div ref={listRef} onKeyDown={onKey} className="space-y-4">
          {section("hot", "Hot", sections.hot, "Opened the demo since your last message. Call or message today.", "text-warning")}
          {section("overdue", "Overdue", sections.overdue, "Follow-ups past their date, oldest first.", "text-destructive")}
          {section("due", "Due today", sections.today)}
          {section("new", "New", newShown, "Never contacted.", undefined,
            (sections.fresh.length > NEW_PAGE || sections.snoozed > 0) && (
              <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2 text-[12px] text-muted-foreground md:px-4">
                {sections.fresh.length > NEW_PAGE && (
                  <button type="button" className={crm.btnGhost} onClick={() => setAllNew((v) => !v)}>
                    {allNew ? `Show first ${NEW_PAGE}` : `Show all ${sections.fresh.length}`}
                  </button>
                )}
                {sections.snoozed > 0 && <span>{plural(sections.snoozed, "new lead")} snoozed to a later day.</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
