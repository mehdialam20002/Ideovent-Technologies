import { Flame, Inbox, MessageCircle, Mail, CalendarClock } from "lucide-react";
import { useOutreach } from "./useOutreach";
import { dueFollowUps, firstWhatsappToday, hotLeads, sentToday } from "./derive";
import { LeadRow } from "./LeadRow";
import { cardCls, fmtDateTime } from "./ui";
import { cn } from "@/lib/utils";

/**
 * TODAY: what to do right now, in the order it pays.
 *   1. Hot leads: their demo was opened since the last message. Call or
 *      message them today, while the page is fresh in their mind.
 *   2. Follow-ups due today or late (the ladder's dates).
 *   3. New leads not contacted yet.
 * With the WhatsApp meter on top, because the playbook's cap is per day.
 */
export function TodayTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { leads, events, opens, settings } = useOutreach();
  const hot = hotLeads(leads, opens);
  const hotIds = new Set(hot.map((h) => h.lead.id));
  const due = dueFollowUps(leads).filter((l) => !hotIds.has(l.id));
  const fresh = leads.filter((l) => l.status === "new" && !hotIds.has(l.id) && !due.some((d) => d.id === l.id)).slice(0, 10);

  const wa = firstWhatsappToday(events);
  const waAll = sentToday(events, "whatsapp");
  const cap = settings.whatsappDailyCap || 10;
  const mail = sentToday(events, "email");
  const pct = Math.min(100, Math.round((wa / cap) * 100));

  return (
    <div className="space-y-6">
      <section aria-label="Sent today" className={cn(cardCls, "grid gap-4 sm:grid-cols-2")}>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-success" aria-hidden="true" />
            <span data-testid="wa-meter">WhatsApp sent today {wa} of {cap}</span>
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={wa} aria-label="WhatsApp messages sent today">
            <div className={cn("h-full rounded-full", wa >= cap ? "bg-destructive" : wa >= cap * 0.8 ? "bg-warning" : "bg-success")} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            First messages to new leads count toward the cap ({waAll} WhatsApp in all today).{" "}
            {wa >= cap ? "Cap reached. The rest go tomorrow, or by phone." : `${cap - wa} left today. Typed one at a time, spread across the day.`}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" /> Emails opened in Gmail today: {mail}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">Counted when you tap Open in Gmail or Open email app.</p>
        </div>
      </section>

      <section aria-labelledby="hot-h">
        <h2 id="hot-h" className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
          <Flame className="h-5 w-5 text-warning" aria-hidden="true" /> Hot: demo opened
          <span className="text-sm font-normal text-muted-foreground">({hot.length})</span>
        </h2>
        {hot.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No demo has been opened since your last message.
          </p>
        ) : (
          <ul className="space-y-2">
            {hot.map((h) => (
              <LeadRow
                key={h.lead.id}
                lead={h.lead}
                onOpen={onOpen}
                tone="hot"
                extra={
                  <p className="mt-1 text-xs font-medium text-foreground">
                    Opened {h.opens.length} {h.opens.length === 1 ? "time" : "times"}, last {fmtDateTime(h.lastOpenAt)}. Call or message today.
                  </p>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="due-h">
        <h2 id="due-h" className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
          <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" /> Follow-ups due
          <span className="text-sm font-normal text-muted-foreground">({due.length})</span>
        </h2>
        {due.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nothing due today.</p>
        ) : (
          <ul className="space-y-2" data-testid="due-list">
            {due.map((l) => (
              <LeadRow key={l.id} lead={l} onOpen={onOpen} tone={new Date(l.nextActionAt!).getTime() < new Date().setHours(0, 0, 0, 0) ? "late" : undefined} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="new-h">
        <h2 id="new-h" className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
          <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> Not contacted yet
          <span className="text-sm font-normal text-muted-foreground">({leads.filter((l) => l.status === "new").length})</span>
        </h2>
        {fresh.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No new leads. Add one with New lead, or paste a list under Import.
          </p>
        ) : (
          <ul className="space-y-2">
            {fresh.map((l) => (
              <LeadRow key={l.id} lead={l} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
