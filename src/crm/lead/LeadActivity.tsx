import { useMemo, useState } from "react";
import { Eye, Mail, MessageCircle, NotebookPen, PhoneCall, Reply, Shuffle } from "lucide-react";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";
import { fmtDateTime } from "@/admin/outreach/ui";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { cn } from "@/lib/utils";

interface Item {
  at: string;
  kind: "open" | OutreachEvent["type"];
  channel?: OutreachEvent["channel"];
  text: string;
}

function icon(i: Item) {
  if (i.kind === "open" || i.kind === "demo_opened") return Eye;
  if (i.kind === "sent") return i.channel === "email" ? Mail : MessageCircle;
  if (i.kind === "replied") return Reply;
  if (i.kind === "call") return PhoneCall;
  if (i.kind === "status") return Shuffle;
  return NotebookPen;
}

/**
 * Everything that happened with this lead, newest first, in one list: the
 * history lines and the demo's opens (which live in the CMS, not in the
 * outreach history). The full, editable history stays in the lead page's
 * History fold; this is the glanceable version.
 */
export function LeadActivity({ lead }: { lead: OutreachLead }) {
  const { eventsFor, opens, demoForLead } = useCrmData();
  const demo = demoForLead(lead);
  const [all, setAll] = useState(false);
  const items = useMemo(() => {
    const list: Item[] = eventsFor(lead.id).map((e) => ({ at: e.at, kind: e.type, channel: e.channel, text: e.detail || e.type }));
    if (demo) for (const o of opens) if (o.demoId === demo.id) list.push({ at: o.at, kind: "open", text: `Demo opened` });
    return list.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [eventsFor, lead.id, opens, demo]);
  const shown = all ? items : items.slice(0, 10);

  return (
    <section className={cn(crm.panel, crm.panelPad)} aria-label="Activity" data-testid="lead-activity">
      <div className="flex items-center justify-between">
        <p className={crm.label}>Activity</p>
        <span className={cn(crm.num, "text-[12px] text-muted-foreground")}>{items.length}</span>
      </div>
      {!items.length ? (
        <p className="mt-2 text-[13px] text-muted-foreground">Nothing yet. The first message you send shows here.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {shown.map((i, n) => {
            const Icon = icon(i);
            return (
              <li key={`${i.at}-${n}`} className="flex gap-2.5 text-[13px]">
                <span className={cn("mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full", i.kind === "open" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground")}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block break-words">{i.text}</span>
                  <span className="block text-[11px] text-muted-foreground">{fmtDateTime(i.at)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {items.length > 10 && (
        <button type="button" className={cn(crm.btnGhost, "mt-2 -ml-2")} onClick={() => setAll((v) => !v)}>
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
