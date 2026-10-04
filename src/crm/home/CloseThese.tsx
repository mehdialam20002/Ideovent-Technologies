import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, X } from "lucide-react";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";
import { crmErrorText } from "@/lib/outreach/access";
import { KIND_LABEL } from "@/admin/outreach/ui";
import { NO_REPLY_REASON } from "@/admin/outreach/derive";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import { ago, plural } from "../dashboard/format";
import { cityOf } from "@/lib/outreach/city";

/**
 * CLOSE THESE (spec 10.5): open leads at Contacted whose no-reply cadence is
 * used up on every channel they can be reached on, the last message 5 or more
 * days ago, and nothing came back (derive.ts cadenceDone). One tap marks a
 * lead Lost with "No reply after the last message"; Keep open sets the next
 * follow-up on a date, and the lead leaves this list until then. On a
 * member's My day and on Mehdi's Today, each over their own leads, so leads
 * stop sitting open for 74 days.
 */

const SHOW = 8;

/** The last send or call on this lead: when, and on which channel. */
function lastTouch(evs: OutreachEvent[]): { at?: string; channel?: string } {
  let best: OutreachEvent | undefined;
  for (const e of evs) {
    if (e.type !== "sent" && e.type !== "call") continue;
    if (!best || Date.parse(e.at) > Date.parse(best.at)) best = e;
  }
  return { at: best?.at, channel: best?.type === "call" ? "a call" : best?.channel === "whatsapp" ? "WhatsApp" : best?.channel === "email" ? "e-mail" : undefined };
}

/** YYYY-MM-DD, `days` from today (local), for the Keep open date box. */
function dateIn(days: number, now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function CloseThese({ leads, className }: { leads?: OutreachLead[]; className?: string }) {
  const data = useCrmData();
  const { now, eventsFor, markLost, keepOpen } = data;
  const list = leads ?? data.closeThese;
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [keeping, setKeeping] = useState<string | null>(null);
  const [until, setUntil] = useState(() => dateIn(7, now));
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const shown = all ? list : list.slice(0, SHOW);
  const touches = useMemo(() => new Map(list.map((l) => [l.id, lastTouch(eventsFor(l.id))])), [list, eventsFor]);

  if (!list.length) return null;

  const act = async (lead: OutreachLead, fn: () => Promise<unknown>, done: string) => {
    setBusy(lead.id);
    setMsg(null);
    try {
      await fn();
      setMsg({ text: done });
      setKeeping(null);
    } catch (e) {
      setMsg({ text: `${lead.instituteName}: ${crmErrorText(e)}`, error: true });
    } finally {
      setBusy(null);
    }
  };

  const lost = (lead: OutreachLead) => act(lead, () => markLost(lead.id, NO_REPLY_REASON), `${lead.instituteName} marked Lost: ${NO_REPLY_REASON.toLowerCase()}.`);
  const keep = (lead: OutreachLead) => {
    const [y, m, d] = until.split("-").map(Number);
    const at = y && m && d ? new Date(y, m - 1, d, 10, 0, 0, 0) : null;
    if (!at || at.getTime() <= now.getTime()) {
      setMsg({ text: "Pick a date after today.", error: true });
      return;
    }
    const label = at.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    void act(lead, () => keepOpen(lead.id, at.toISOString()), `${lead.instituteName} stays open. Next follow-up ${label}.`);
  };

  return (
    <section aria-labelledby="close-these-h" data-testid="close-these" className={cn(crm.panel, "overflow-hidden", className)}>
      <h2 id="close-these-h" className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-3 py-2.5 text-[13px] font-semibold md:px-4">
        <span>Close these</span>
        <span className={cn("font-normal text-muted-foreground", crm.num)}>{list.length}</span>
        <span className="text-[12px] font-normal text-muted-foreground">Every follow-up sent, no reply for 5 days or more.</span>
      </h2>
      <p aria-live="polite" role={msg?.error ? "alert" : "status"} className={cn("px-3 text-[13px] md:px-4", msg ? "py-2" : "sr-only", msg?.error ? "text-destructive" : "text-muted-foreground")}>
        {msg?.text}
      </p>
      <ul>
        {shown.map((lead) => {
          const t = touches.get(lead.id) || {};
          const open = keeping === lead.id;
          return (
            <li key={lead.id} data-close-lead={lead.id} className={cn("border-b border-border/60 px-3 py-2.5 last:border-b-0 md:px-4", busy === lead.id && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link to={CRM.lead(lead.id)} className="min-w-0 flex-1 basis-48 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="block truncate text-[13.5px] font-medium">{lead.instituteName}</span>
                  <span className={cn("block truncate text-[12px] text-muted-foreground", crm.num)}>
                    {[t.at ? `Last ${t.channel ? `${t.channel} ` : ""}${ago(t.at, now)}` : "", cityOf(lead), KIND_LABEL[lead.kind]].filter(Boolean).join(" · ")}
                  </span>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button type="button" className={cn(crm.btn, "h-8 px-2.5 max-md:h-10")} disabled={busy === lead.id}
                    onClick={() => void lost(lead)} aria-label={`Mark ${lead.instituteName} Lost: ${NO_REPLY_REASON}`}>
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Mark Lost
                  </button>
                  <button type="button" className={cn(crm.btnGhost, "h-8 px-2 max-md:h-10")} disabled={busy === lead.id} aria-expanded={open}
                    onClick={() => setKeeping(open ? null : lead.id)}>
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Keep open
                  </button>
                </div>
              </div>
              {open && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="text-[12px] text-muted-foreground">
                    Next follow-up on
                    <input type="date" value={until} min={dateIn(1, now)} onChange={(e) => setUntil(e.target.value)}
                      className={cn(crm.input, "mt-1 block w-44 max-md:h-10")} />
                  </label>
                  <button type="button" className={cn(crm.btnPrimary, "h-9 max-md:h-10")} disabled={busy === lead.id} onClick={() => keep(lead)}>
                    Keep open
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {list.length > SHOW && (
        <div className="border-t border-border px-3 py-2 md:px-4">
          <button type="button" className={crm.btnGhost} onClick={() => setAll((v) => !v)}>
            {all ? `Show first ${SHOW}` : `Show all ${plural(list.length, "lead")}`}
          </button>
        </div>
      )}
    </section>
  );
}

export default CloseThese;
