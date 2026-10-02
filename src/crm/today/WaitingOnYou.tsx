import { useState } from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { crmErrorText } from "@/lib/outreach/access";
import type { CrmRequest, RequestKind, RequestOutcome } from "@/lib/outreach/team";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import { ago } from "../dashboard/format";
import { inWorkingHours } from "./callTime";

/**
 * WAITING ON YOU (spec 10.6), at the top of Mehdi's Today: every open request
 * (Ask Mehdi and hand-overs), oldest first. An admin sees the ones sent to
 * them. Each shows who asked, the lead, what they wrote and how long it has
 * waited; past 2 hours during working hours it turns amber. Done or No action
 * closes an ask; Accepted or Not a real lead a hand-over (Accepted is the
 * number an intern is judged on). The asker is told, with the note if any.
 * Reading the bell never closes one, and linking a demo closes a demo request
 * by itself.
 */

export const KIND_TEXT: Record<RequestKind, string> = {
  demo: "Demo request",
  correction: "Correction",
  question: "Question",
  handoff: "Hand-over",
  give_back: "Given back",
};

export const OUTCOME_TEXT: Record<RequestOutcome, string> = {
  done: "Done",
  no_action: "No action",
  accepted: "Accepted",
  not_real: "Not a real lead",
};

/** The answers a request takes (the database's crm_resolve_request), the main one first. */
export function answersFor(kind: RequestKind): RequestOutcome[] {
  if (kind === "handoff") return ["accepted", "not_real"];
  if (kind === "give_back") return ["done"];
  return ["done", "no_action"];
}

/** An answer's button: a give-back is "Taken back". */
function answerText(kind: RequestKind, o: RequestOutcome): string {
  return kind === "give_back" && o === "done" ? "Taken back" : OUTCOME_TEXT[o];
}

const LATE_MS = 2 * 3600e3;

export function WaitingOnYou({ className }: { className?: string }) {
  const { waitingOnYou, leadById, overview, nameOf, now, resolveRequest, me } = useCrmData();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  if (me.legacy || !waitingOnYou.length) {
    /* The last one answered: the answer stays in view, the panel goes. */
    return msg ? (
      <p role={msg.error ? "alert" : "status"} data-testid="waiting-on-you-done" className={cn("mb-4 text-[13px]", msg.error ? "text-destructive" : "text-muted-foreground", className)}>
        {msg.text} Nothing else is waiting on you.
      </p>
    ) : null;
  }

  const leadName = (r: CrmRequest) => leadById(r.leadId)?.instituteName || overview.find((o) => o.id === r.leadId)?.instituteName || "a lead";
  const working = inWorkingHours(now);

  const answer = async (r: CrmRequest, outcome: RequestOutcome) => {
    setBusy(r.id);
    setMsg(null);
    const asker = nameOf(r.askedBy, "Someone");
    try {
      await resolveRequest(r.id, outcome, (notes[r.id] || "").trim() || undefined);
      setMsg({ text: `${KIND_TEXT[r.kind]} on ${leadName(r)}: ${answerText(r.kind, outcome)}.${r.askedBy && r.askedBy !== me.memberId ? ` ${asker} is told.` : ""}` });
    } catch (e) {
      setMsg({ text: `${leadName(r)}: ${crmErrorText(e)}`, error: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="waiting-h" data-testid="waiting-on-you" className={cn(crm.panel, "overflow-hidden border-primary/30", className)}>
      <h2 id="waiting-h" className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-3 py-2.5 text-[13px] font-semibold md:px-4">
        <Inbox className="h-3.5 w-3.5 self-center text-primary" aria-hidden="true" />
        <span>Waiting on you</span>
        <span className={cn("font-normal text-muted-foreground", crm.num)}>{waitingOnYou.length}</span>
        <span className="text-[12px] font-normal text-muted-foreground">
          {me.role === "owner" ? "Hand-overs and questions from the team, oldest first." : "Sent to you, oldest first."}
        </span>
      </h2>
      <p aria-live="polite" role={msg?.error ? "alert" : "status"} className={cn("px-3 text-[13px] md:px-4", msg ? "py-2" : "sr-only", msg?.error ? "text-destructive" : "text-muted-foreground")}>
        {msg?.text}
      </p>
      <ul>
        {waitingOnYou.map((r) => {
          const late = working && now.getTime() - Date.parse(r.createdAt) > LATE_MS;
          const name = leadName(r);
          return (
            <li key={r.id} data-request-id={r.id} data-kind={r.kind} className={cn("border-b border-border/60 px-3 py-3 last:border-b-0 md:px-4", busy === r.id && "opacity-60")}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                <span className={cn("rounded-full px-1.5 py-px text-[11px] font-medium", r.kind === "handoff" ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>{KIND_TEXT[r.kind]}</span>
                <span>from <span className="font-medium text-foreground">{nameOf(r.askedBy, "Someone")}</span></span>
                <span className={cn(crm.num, late && "rounded bg-amber-500/15 px-1 font-medium text-amber-800 dark:text-amber-300")} data-late={late || undefined}
                  title={late ? "Waiting more than 2 hours in working hours" : undefined}>
                  {ago(r.createdAt, now)}
                </span>
              </div>
              <Link to={CRM.lead(r.leadId)} className="mt-1 block truncate text-[13.5px] font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {name}
              </Link>
              {r.body && <p className="mt-0.5 whitespace-pre-line break-words text-[13px]">{r.body}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {answersFor(r.kind).map((o, i) => (
                  <button key={o} type="button" disabled={busy === r.id} onClick={() => void answer(r, o)}
                    className={cn(i === 0 ? crm.btnPrimary : crm.btn, "h-8 px-2.5 max-md:h-10")}>
                    {answerText(r.kind, o)}
                  </button>
                ))}
                <input type="text" value={notes[r.id] || ""} maxLength={500} placeholder="Note (optional)"
                  aria-label={`Note to ${nameOf(r.askedBy, "the asker")} on ${name} (optional)`}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  className={cn(crm.input, "h-8 min-w-0 flex-1 basis-40 max-md:h-10")} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default WaitingOnYou;
