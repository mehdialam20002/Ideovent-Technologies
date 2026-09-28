import type { ReactNode } from "react";
import { useOutreach } from "./useOutreach";
import { firstWhatsappToday, sentToday } from "./derive";
import { dailyWhatsappLimit } from "@/lib/outreach/engine";
import { todayQueue } from "./compose";
import { LeadRow, leadListCls } from "./LeadRow";
import { fmtDateTime } from "./ui";
import { cn } from "@/lib/utils";

/**
 * TODAY, the landing view: only what needs doing, in the order it pays.
 *   1. Demo opened: they looked at the page since the last message. Today.
 *   2. Follow-ups due today or late (the ladder's dates).
 *   3. New leads not contacted yet (the first ten).
 * An empty section is not shown at all. One line on top counts today's
 * sends. There is no WhatsApp limit unless Mehdi sets one in Settings.
 */
export function TodayTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { leads, events, settings, opens } = useOutreach();
  const { hot, due, fresh } = todayQueue(leads, opens);
  const wa = firstWhatsappToday(events);
  const cap = dailyWhatsappLimit(settings);
  const atCap = cap !== null && wa >= cap;
  const mail = sentToday(events, "email");
  const nothing = !hot.length && !due.length && !fresh.length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <span data-testid="wa-meter" className={cn(atCap && "font-medium text-destructive")}>WhatsApp today {sentToday(events, "whatsapp")}{cap !== null ? ` (first messages ${wa} of ${cap})` : ""}</span>
        <span aria-hidden="true"> · </span>
        <span>Emails today {mail}</span>
        {atCap && <span className="block text-xs">Your daily limit is reached. Change it in Settings, or call.</span>}
      </p>

      {nothing && (
        <p className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Nothing to do right now. Add a lead with New lead, or paste a list under Import.
        </p>
      )}

      {hot.length > 0 && (
        <Group id="hot-h" title="Demo opened" hint="Call or message them today" count={hot.length}>
          {hot.map((h) => (
            <LeadRow key={h.lead.id} lead={h.lead} onOpen={onOpen}
              extra={<span className="mt-0.5 block text-xs text-muted-foreground">Opened {h.opens.length} {h.opens.length === 1 ? "time" : "times"}, last {fmtDateTime(h.lastOpenAt)}</span>} />
          ))}
        </Group>
      )}

      {due.length > 0 && (
        <Group id="due-h" title="Follow-ups due" count={due.length} testid="due-list">
          {due.map((l) => <LeadRow key={l.id} lead={l} onOpen={onOpen} />)}
        </Group>
      )}

      {fresh.length > 0 && (
        <Group id="new-h" title="Not contacted yet" count={fresh.length} more={fresh.length > 10 ? `${fresh.length - 10} more under Leads` : undefined}>
          {fresh.slice(0, 10).map((l) => <LeadRow key={l.id} lead={l} onOpen={onOpen} showStatus={false} />)}
        </Group>
      )}
    </div>
  );
}

function Group({ id, title, hint, count, testid, more, children }: { id: string; title: string; hint?: string; count: number; testid?: string; more?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
        {title} <span className="font-normal text-muted-foreground">{count}</span>
        {hint && <span className="font-normal text-muted-foreground">· {hint}</span>}
      </h2>
      <ul className={leadListCls} data-testid={testid}>{children}</ul>
      {more && <p className="mt-2 text-xs text-muted-foreground">{more}</p>}
    </section>
  );
}
