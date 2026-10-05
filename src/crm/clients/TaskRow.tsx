import { useState } from "react";
import { Link } from "react-router-dom";
import { addDays, daysBetween, fmtDate } from "@/lib/clients/numbering";
import type { ClientTask } from "@/lib/clients/tasks";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { errText } from "./shared";

/** "Done" on a reminder that has nothing to send or make: hidden from then on (stored like a snooze). */
export const DISMISSED_UNTIL = "9999-12-31";

/** Where a task opens: its project's page (or the client's own page), with ?task=<id> so the page opens what completes it. */
export const taskHref = (t: ClientTask) => `${CRM.client(t.projectId || t.clientId)}?task=${encodeURIComponent(t.id)}`;

export function dueText(due: string, today: string): string {
  if (due === today) return "today";
  if (due < today) {
    const n = daysBetween(due, today);
    return `${n} day${n === 1 ? "" : "s"} late`;
  }
  return fmtDate(due);
}

/**
 * ONE CLIENT TASK (client-process-spec 11.2): what, for whom, when ("today" or "N days late"), and the
 * action: open what completes it (a message, a document, the payment dialog, the item), snooze a day
 * (stored on the project or the client), or, for a reminder with nothing to send or make (a renewal
 * check, a records reminder), Done.
 */
export function TaskRow({ task, today, onOpen, canOpen = true, who, testId = "client-task" }: {
  task: ClientTask;
  today: string;
  /** Open it here (the client page); without it the row links to the page that opens it. */
  onOpen?: () => void;
  canOpen?: boolean;
  /** "Business · project", on Today. */
  who?: string;
  testId?: string;
}) {
  const { saveProject, saveClient, data } = useClients();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const late = task.due < today;
  const note = task.action.type === "note";
  const hide = async (until: string, line?: string) => {
    setBusy(true);
    setErr(null);
    try {
      if (task.projectId) {
        await saveProject(task.projectId, (p) => ({ ...p, snoozed: { ...(p.snoozed || {}), [task.id]: until } }), line ? { type: "note", detail: line } : undefined);
      } else {
        const cl = data.clients.find((c) => c.id === task.clientId);
        await saveClient(task.clientId, { snoozed: { ...(cl?.snoozed || {}), [task.id]: until } }, line ? { type: "note", projectId: null, detail: line } : undefined);
      }
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const openBtn = onOpen ? (
    <button type="button" className={cn(crm.btnPrimary, "h-8 max-md:h-10")} onClick={onOpen} disabled={!canOpen} data-testid={`${testId}-open`}>Open</button>
  ) : (
    <Link to={taskHref(task)} className={cn(crm.btnPrimary, "h-8 max-md:h-10")} data-testid={`${testId}-open`}>Open</Link>
  );
  return (
    <li className="rounded-lg border border-border px-3 py-2" data-testid={testId} data-task={task.id} data-money={task.money ? "1" : "0"} data-late={late ? "1" : "0"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          {who && <p className="truncate text-[12px] text-muted-foreground">{who}</p>}
          <p className="break-words text-[13px]">{task.label}</p>
          <p className={cn("text-[11px]", late ? "font-medium text-destructive" : "text-muted-foreground")}>
            {task.money ? "Money · " : ""}{dueText(task.due, today)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {!note && openBtn}
          {note && (
            <button type="button" className={cn(crm.btn, "h-8 max-md:h-10")} disabled={busy} onClick={() => void hide(DISMISSED_UNTIL, `Done: ${task.label}`)} data-testid={`${testId}-done`}>Done</button>
          )}
          <button type="button" className={cn(crm.btnGhost, "h-8 max-md:h-10")} disabled={busy} onClick={() => void hide(addDays(today, 1))} data-testid={`${testId}-snooze`}>Snooze a day</button>
        </div>
      </div>
      {err && <p role="alert" className="mt-1 text-[12px] text-destructive">{err}</p>}
    </li>
  );
}
