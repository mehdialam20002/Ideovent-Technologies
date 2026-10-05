import { ArrowRightLeft, Eye, Mail, MessageCircle, NotebookPen, PhoneCall, Plus, Reply, Tag, UserCheck } from "lucide-react";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { historyLines, type HistoryLine } from "./historyLines";
import { useOpensCtx } from "./useOpensCtx";
import { fmtDateTime } from "./ui";

function eventIcon(e: OutreachEvent): typeof Mail {
  if (e.type === "sent") return e.channel === "whatsapp" ? MessageCircle : Mail;
  if (e.type === "replied") return Reply;
  if (e.type === "call") return PhoneCall;
  if (e.type === "demo_opened") return Eye;
  if (e.type === "note") return NotebookPen;
  if (e.type === "assign") return UserCheck;
  if (e.type === "handoff") return ArrowRightLeft;
  return Tag;
}

function iconOf(l: HistoryLine): typeof Mail {
  if (l.kind === "event" && l.event) return eventIcon(l.event);
  return l.kind === "created" ? Plus : Eye;
}

function toneOf(l: HistoryLine): string | undefined {
  if (l.kind === "open" || l.event?.type === "demo_opened") return "text-warning";
  if (l.event?.type === "replied") return "text-success";
  return undefined;
}

/**
 * Everything that happened to one lead, newest first: sends, replies, calls,
 * status changes, notes, and every recorded open of their demo (read from
 * demoSiteOpens, so it is there even before the lead page was visited), as
 * historyLines.ts lists them (an open from before the demo's link went to
 * them marked as not counted). Since the team (0011) each line names who wrote
 * it, as the database stamped it (actorId): "Asha · 2 Oct 2026, 10:42" (spec 10.7).
 */
export function History({ lead, events }: { lead: OutreachLead; events: OutreachEvent[] }) {
  const { opens, team, me } = useOutreach();
  const ctx = useOpensCtx();
  const names = new Map(team.map((t) => [t.id, t.displayName]));
  const who = (id?: string) => (id ? names.get(id) || (id === me.memberId ? me.displayName : "") || "Someone" : "");
  const rows = historyLines(lead, events, opens, ctx);

  return (
    <section aria-label="History">
      <ol className="space-y-3" data-testid="history">
        {rows.map((r) => {
          const Icon = iconOf(r);
          return (
            <li key={r.key} className="flex gap-3 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneOf(r) || "text-muted-foreground"}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="break-words">{r.text}</p>
                <p className="text-xs text-muted-foreground">{r.actorId ? `${who(r.actorId)} · ` : ""}{fmtDateTime(r.at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
