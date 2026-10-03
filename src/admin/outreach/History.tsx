import { ArrowRightLeft, Eye, Mail, MessageCircle, NotebookPen, PhoneCall, Plus, Reply, Tag, UserCheck } from "lucide-react";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { allOpens } from "./derive";
import { fmtDateTime } from "./ui";

type Row = { key: string; at: string; icon: typeof Mail; text: string; tone?: string; actorId?: string };

function eventText(e: OutreachEvent): string {
  if (e.detail) return e.detail;
  switch (e.type) {
    case "sent":
      return `${e.channel === "whatsapp" ? "WhatsApp" : "Email"} opened ready to send${e.templateId ? ` (${e.templateId})` : ""}`;
    case "replied":
      return "They replied";
    case "call":
      return "Call";
    case "demo_opened":
      return "Demo opened";
    default:
      return e.type;
  }
}

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

/**
 * Everything that happened to one lead, newest first: sends, replies, calls,
 * status changes, notes, and every recorded open of their demo (read from
 * demoSiteOpens, so it is there even before the lead page was visited).
 * Since the team (0011) each line names who wrote it, as the database stamped
 * it (actorId): "Asha · 2 Oct 2026, 10:42" (spec 10.7).
 */
export function History({ lead, events }: { lead: OutreachLead; events: OutreachEvent[] }) {
  const { opens, team, me } = useOutreach();
  const names = new Map(team.map((t) => [t.id, t.displayName]));
  const who = (id?: string) => (id ? names.get(id) || (id === me.memberId ? me.displayName : "") || "Someone" : "");
  const loggedOpenIds = new Set(events.filter((e) => e.type === "demo_opened").map((e) => /\[([^\]]+)\]$/.exec(e.detail || "")?.[1]).filter(Boolean));
  const rows: Row[] = [
    ...events.map((e) => ({
      key: e.id,
      at: e.at,
      icon: eventIcon(e),
      text: eventText(e).replace(/\s*\[[^\]]+\]$/, ""),
      tone: e.type === "demo_opened" ? "text-warning" : e.type === "replied" ? "text-success" : undefined,
      actorId: e.actorId,
    })),
    ...allOpens(lead, opens)
      .filter((o) => !loggedOpenIds.has(o.id))
      .map((o) => ({ key: o.id, at: o.at, icon: Eye, text: "Demo opened", tone: "text-warning" })),
    { key: "created", at: lead.createdAt, icon: Plus, text: `Lead added${lead.source ? ` (${lead.source})` : ""}` },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <section aria-label="History">
      <ol className="space-y-3" data-testid="history">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.key} className="flex gap-3 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${r.tone || "text-muted-foreground"}`} aria-hidden="true" />
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
