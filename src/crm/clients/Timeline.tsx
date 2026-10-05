import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmClientEvent } from "@/lib/clients/types";
import { templateLabel } from "@/lib/clients/compose";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { errText } from "./shared";

const TYPE_LABEL: Record<string, string> = {
  sent: "Sent", note: "Note", stage: "Stage", item: "Item", doc: "Document", payment: "Payment", approval: "Approval", call: "Call", reply: "Reply", hold: "Hold",
};

/**
 * THE TIMELINE (client-process-spec 10.3): this project's lines, newest first, with the server's time.
 * Only this project's lines are read (never the whole timeline). "Earlier history as a lead" opens the
 * lead page. A note can be added here; lines are never edited or deleted (0014 keeps them append-only).
 */
export function Timeline({ clientId, projectId, leadId }: { clientId: string; projectId: string; leadId: string | null }) {
  const { store, data } = useClients();
  const [lines, setLines] = useState<CrmClientEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const project = data.projects.find((p) => p.id === projectId);
  useEffect(() => {
    let live = true;
    store().listEvents(projectId).then((ev) => live && setLines(ev.filter((e) => e.clientId === clientId).sort((a, b) => b.at.localeCompare(a.at)))).catch((e) => live && setErr(errText(e)));
    return () => {
      live = false;
    };
  }, [store, projectId, clientId, project?.updatedAt, data.documents.length, data.payments.length]);
  const add = async () => {
    if (!note.trim()) return;
    try {
      const e = await store().addEvent({ clientId, projectId, type: "note", detail: note.trim() });
      setLines((l) => [e, ...l]);
      setNote("");
    } catch (x) {
      setErr(errText(x));
    }
  };
  return (
    <section className={cn(crm.panel, "p-4")} data-testid="client-timeline" aria-label="Timeline">
      <p className={crm.label}>Timeline</p>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input aria-label="Add a note" className={crm.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
        <button type="submit" className={crm.btn}>Add</button>
      </form>
      {err && <p role="alert" className="mt-2 text-[12px] text-destructive">{err}</p>}
      <ol className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
        {lines.map((e) => (
          <li key={e.id} className="text-[12px]" data-testid="timeline-line" data-type={e.type}>
            <span className="text-muted-foreground">{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
            {" · "}<span className="font-medium">{TYPE_LABEL[e.type] || e.type}</span>
            {e.templateId && <span className="text-muted-foreground"> ({templateLabel(e.templateId)})</span>}
            <span className="block break-words">{e.detail}</span>
          </li>
        ))}
        {!lines.length && <li className="text-[12px] text-muted-foreground">Nothing yet.</li>}
      </ol>
      {leadId && <Link to={CRM.lead(leadId)} className="mt-3 inline-block text-[12px] text-primary hover:underline">Earlier history as a lead</Link>}
    </section>
  );
}
