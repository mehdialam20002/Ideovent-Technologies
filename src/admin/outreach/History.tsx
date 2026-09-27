import { Eye, Mail, MessageCircle, NotebookPen, PhoneCall, Plus, Reply, Tag } from "lucide-react";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { allOpens } from "./derive";
import { cardCls, fmtDateTime } from "./ui";

type Row = { key: string; at: string; icon: typeof Mail; text: string; tone?: string };

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
  return Tag;
}

/**
 * Everything that happened to one lead, newest first: sends, replies, calls,
 * status changes, notes, and every recorded open of their demo (read from
 * demoSiteOpens, so it is there even before the lead page was visited).
 */
export function History({ lead, events }: { lead: OutreachLead; events: OutreachEvent[] }) {
  const { opens } = useOutreach();
  const loggedOpenIds = new Set(events.filter((e) => e.type === "demo_opened").map((e) => /\[([^\]]+)\]$/.exec(e.detail || "")?.[1]).filter(Boolean));
  const rows: Row[] = [
    ...events.map((e) => ({
      key: e.id,
      at: e.at,
      icon: eventIcon(e),
      text: eventText(e).replace(/\s*\[[^\]]+\]$/, ""),
      tone: e.type === "demo_opened" ? "text-warning" : e.type === "replied" ? "text-success" : undefined,
    })),
    ...allOpens(lead, opens)
      .filter((o) => !loggedOpenIds.has(o.id))
      .map((o) => ({ key: o.id, at: o.at, icon: Eye, text: "Demo opened", tone: "text-warning" })),
    { key: "created", at: lead.createdAt, icon: Plus, text: `Lead added${lead.source ? ` (${lead.source})` : ""}` },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <section className={cardCls} aria-labelledby="hist-h">
      <h3 id="hist-h" className="text-sm font-semibold">History</h3>
      <ol className="mt-3 space-y-3" data-testid="history">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.key} className="flex gap-3 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${r.tone || "text-muted-foreground"}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="break-words">{r.text}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(r.at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
