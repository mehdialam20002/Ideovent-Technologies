import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { DemoSiteOpen } from "@/lib/cms/types";
import type { EventInput, OutreachLead } from "@/lib/outreach/types";
import { can, isEngaged } from "@/lib/outreach/access";
import { nextStep, repliedChanges, todayQueue } from "@/admin/outreach/compose";
import { endOfToday, isUntouched } from "@/admin/outreach/derive";
import { dueLabel } from "@/admin/outreach/ui";
import { callWindowText, goodTimeToCall } from "./callTime";
import { useCrmData } from "../useCrmData";
import { useOpenLead } from "../nav";
import { startOfDay } from "../metrics";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import { ago, plural } from "../dashboard/format";
import { TodayRow, type TodayItem } from "./TodayRow";

/**
 * TODAY'S QUEUE: the same list the lead screen's "Next lead" walks (todayQueue
 * and nextStep in compose.ts), in four parts: Hot, Overdue, Due today and New.
 * One-key actions: j and k move, Enter opens, s snoozes a day. Mehdi's Today
 * and a member's My day both show it, each over the leads they work.
 */

export const NEW_PAGE = 25;
const CAN_REPLY = new Set(["new", "contacted", "demo_opened"]);

export interface TodaySections {
  hot: TodayItem[];
  overdue: TodayItem[];
  today: TodayItem[];
  fresh: TodayItem[];
  /** New leads snoozed to a later day. */
  snoozed: number;
  /** Rows in the four parts. */
  count: number;
}

/** The queue's parts. `extra` adds per-lead marks (untouched, a good time to call, whose lead). */
export function buildTodaySections(
  leads: OutreachLead[],
  opens: DemoSiteOpen[],
  now: Date,
  extra?: (lead: OutreachLead) => Partial<TodayItem>,
): TodaySections {
  const q = todayQueue(leads, opens, now);
  const start = startOfDay(now).getTime();
  const endToday = endOfToday(now).getTime();
  const item = (lead: OutreachLead, more: Partial<TodayItem>): TodayItem => {
    const s = nextStep(lead, opens, now);
    return {
      lead, step: s.text, urgent: s.urgent, when: dueLabel(lead.nextActionAt, now),
      canSnooze: true, canMarkReplied: CAN_REPLY.has(lead.status), ...(extra ? extra(lead) : {}), ...more,
    };
  };
  const hot = q.hot.map((h) => item(h.lead, { when: `opened ${ago(h.lastOpenAt, now)}`, canSnooze: false, urgent: true }));
  const overdue = q.due.filter((l) => new Date(l.nextActionAt!).getTime() < start).map((l) => item(l, { late: true }));
  const today = q.due.filter((l) => new Date(l.nextActionAt!).getTime() >= start).map((l) => item(l, {}));
  // A new lead snoozed to a later day waits for that day.
  const snoozed = q.fresh.filter((l) => l.nextActionAt && new Date(l.nextActionAt).getTime() > endToday);
  const fresh = q.fresh.filter((l) => !snoozed.includes(l)).map((l) => item(l, { when: `added ${ago(l.createdAt, now)}` }));
  return { hot, overdue, today, fresh, snoozed: snoozed.length, count: hot.length + overdue.length + today.length + fresh.length };
}

/** Who answers the phone, in the "Good time to call" tooltip. */
const CALLEE: Record<string, string> = {
  school: "a school (after classes)",
  coaching: "a coaching centre (before the evening batches)",
  dental: "a dental clinic (between patients)",
  other: "a business",
};

/** Mehdi's member id: from the signed-in person, else the roster (an admin's view). */
export function useOwnerId(): string | null {
  const { me, team } = useCrmData();
  return me.role === "owner" ? me.memberId : team.find((t) => t.role === "owner")?.id ?? null;
}

/**
 * The marks on a queue row. Untouched on a lead someone in the team holds
 * (not Mehdi's own: the team update made every lead he had written to his,
 * so for him the word would only be noise). For a member (`callTimes`), "Good
 * time to call" while the lead's kind is in its call window, on a lead they
 * may call: one that replied or opened a demo, or any with May cold-call.
 * For Mehdi and admins, the name of whoever else works the lead.
 */
export function useQueueMarks(callTimes: boolean): (lead: OutreachLead) => Partial<TodayItem> {
  const { me, now, eventsFor, isStaff, nameOf } = useCrmData();
  const ownerId = useOwnerId();
  const cold = can(me, "call.cold");
  return useCallback(
    (lead: OutreachLead) => {
      const out: Partial<TodayItem> = {};
      const evs = eventsFor(lead.id);
      if (lead.assigneeId && lead.assigneeId !== ownerId && isUntouched(lead, evs, now)) out.untouched = true;
      if (isStaff && lead.assigneeId && lead.assigneeId !== me.memberId) out.owner = nameOf(lead.assigneeId);
      if (callTimes && (lead.phone || lead.whatsapp) && (cold || isEngaged(lead, evs)) && goodTimeToCall(lead.kind, now)) {
        out.callNow = `A good time to call ${CALLEE[lead.kind] || CALLEE.other}: ${callWindowText(lead.kind)}, India time.`;
      }
      return out;
    },
    [eventsFor, ownerId, now, isStaff, me.memberId, nameOf, callTimes, cold],
  );
}

/** 10:00 local, `days` from today: when a snoozed lead comes back. */
function snoozeDate(days: number, now: Date): Date {
  const d = startOfDay(now);
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

/**
 * The reply line and due date "They replied" writes (compose.ts repliedChanges), whichever shape it answers in.
 * A member's line says to hand a yes to Mehdi (spec 10.7), never to send call times.
 */
function replied(lead: OutreachLead, member = false): { event: EventInput; nextActionAt?: string } {
  const c = repliedChanges(lead, new Date(), { member }) as unknown as { event: EventInput; patch?: Partial<OutreachLead>; lead?: Partial<OutreachLead> };
  return { event: c.event, nextActionAt: (c.patch ?? c.lead)?.nextActionAt };
}

export function TodayQueue({ sections, empty, compact = false }: { sections: TodaySections; empty: ReactNode; compact?: boolean }) {
  const { updateLead, setStatus, addEvent, isMember } = useCrmData();
  const openLead = useOpenLead();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [allNew, setAllNew] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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

  const markReplied = useCallback((lead: OutreachLead) => {
    // The same reply event and due date the lead page's "They replied" writes.
    const c = replied(lead, isMember);
    const next = isMember
      ? "Next: if they said yes, open the lead and hand it to Mehdi now."
      : "Next: After they say yes, send the sample link within the hour.";
    void run(lead, async () => {
      await setStatus(lead.id, "replied");
      await addEvent(c.event);
      if (c.nextActionAt) await updateLead(lead.id, { nextActionAt: c.nextActionAt });
    }, `${lead.instituteName} marked as replied. ${next}`);
  }, [run, setStatus, addEvent, updateLead, isMember]);

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
            <TodayRow key={it.lead.id} item={it} index={start + k} busy={busyId === it.lead.id} onOpen={openLead} onSnooze={snooze} onReplied={markReplied} compact={compact} />
          ))}
        </ul>
        {footer}
      </section>
    );
  };

  return (
    <>
      <p aria-live="polite" role={msg?.error ? "alert" : "status"} className={cn("mb-3 min-h-0 text-[13px]", msg?.error ? "rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive" : "text-muted-foreground", !msg && "sr-only")}>
        {msg?.text}
      </p>
      {!flat.length ? (
        empty
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
    </>
  );
}
