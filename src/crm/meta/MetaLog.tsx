import { Link } from "react-router-dom";
import type { MetaLogLine, MetaWaitingRow } from "@/lib/meta/client";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { fmtIstShort, idTail } from "./metaUi";

/** One log line in words. The database writes ids, counts and Graph codes only, never a name, number or answer. */
export function logText(l: Pick<MetaLogLine, "event" | "formId" | "adId" | "detail">): string {
  const ids = [l.formId && `form ${idTail(l.formId)}`, l.adId && `ad ${idTail(l.adId)}`].filter(Boolean).join(", ");
  const d = (l.detail || "").trim();
  const with_ = (s: string) => (d ? `${s}: ${d}` : s);
  switch (l.event) {
    case "created": return `Lead created${ids ? ` (${ids})` : ""}`;
    case "duplicate": return /quiet/i.test(d) ? "Same lead again today: logged only" : `Already a lead: a line on it, the answers under Waiting on you${ids ? ` (${ids})` : ""}`;
    case "already": return "Seen before: nothing to do";
    case "other_page": return "Signed test from Meta's dashboard (or another Page's lead): not stored";
    case "verified": return "Meta verified the webhook";
    case "received": return with_("Notification received");
    case "failed": return d ? `Waiting: ${d}` : "Waiting: see the status above";
    case "gone": return with_("Gone at Meta");
    case "over_cap": return "Today's limit reached: the rest wait at Meta";
    case "connected": return "Connected";
    case "catchup": return with_("Daily check");
    case "settings": return with_("Settings saved");
    default: return with_(l.event);
  }
}

const AMBER = new Set(["failed", "over_cap", "gone"]);

/** Section 4 of the Meta page: what is waiting, then the last 100 log lines, newest first, India time. */
export function MetaLog({ lines, waiting, note }: { lines: MetaLogLine[] | null; waiting: MetaWaitingRow[]; note?: string | null }) {
  return (
    <section aria-labelledby="meta-log-h" className={cn(crm.panel, crm.panelPad)}>
      <h2 id="meta-log-h" className={crm.label}>Log</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">Newest first, India time. Meta ids and outcomes only: names, numbers and answers stay on the leads.</p>
      {waiting.length > 0 && (
        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
          <p className="text-[12px] font-medium text-amber-900 dark:text-amber-200">Waiting at Meta ({waiting.length})</p>
          <ul data-testid="meta-waiting" className="mt-1 space-y-0.5 text-[12px] text-amber-900 dark:text-amber-200">
            {waiting.map((w) => (
              <li key={w.leadgenId} data-status={w.status} title={`Meta lead ${w.leadgenId}`} className="break-words">
                lead {idTail(w.leadgenId)} · received {fmtIstShort(w.receivedAt)} · {w.attempts} {w.attempts === 1 ? "try" : "tries"}
                {w.lastError || w.errorKind ? ` · ${w.lastError || w.errorKind}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {note && <p className="mt-2 text-[13px] text-muted-foreground">{note}</p>}
      {lines === null ? (
        <p className="mt-2 text-[13px] text-muted-foreground" role="status">Loading...</p>
      ) : (
        <ul data-testid="meta-log" className="mt-2 divide-y divide-border/60">
          {lines.length === 0 && <li className="py-2 text-[13px] text-muted-foreground">Nothing yet.</li>}
          {lines.map((l) => (
            <li key={`${l.id}-${l.at}`} data-event={l.event} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5 text-[13px]"
              title={l.leadgenId ? `Meta lead ${l.leadgenId}` : undefined}>
              <span className={cn("w-[6.5rem] shrink-0 text-[12px] text-muted-foreground", crm.num)}>{fmtIstShort(l.at)}</span>
              <span className={cn("min-w-0 flex-1 break-words", AMBER.has(l.event) && "text-amber-900 dark:text-amber-200")}>
                {logText(l)}
                {l.crmLeadId && (l.event === "created" || l.event === "duplicate" || l.event === "already") && (
                  <>
                    {" "}
                    <Link to={CRM.lead(l.crmLeadId)} className="font-medium text-primary underline-offset-2 hover:underline">Open</Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
