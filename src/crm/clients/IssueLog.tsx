import { useState } from "react";
import { fmtDate, indiaDate } from "@/lib/clients/numbering";
import type { CrmProject, Issue } from "@/lib/clients/types";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { errText, Field, inputCls, Problem } from "./shared";

const SEVERITY: { value: Issue["severity"]; label: string }[] = [
  { value: "S1", label: "S1 down" }, { value: "S2", label: "S2 major" }, { value: "S3", label: "S3 minor" }, { value: "S4", label: "S4 a change request" },
];
const COVER: { value: Issue["cover"]; label: string }[] = [
  { value: "defect", label: "Defect: free under the warranty" }, { value: "change", label: "Change: chargeable (cl. 10.3(b))" }, { value: "new_work", label: "New work: quoted on a change request" },
];

/**
 * THE ISSUE LOG (client-process-spec 4.11; SOP-07): date, channel, one line, severity, cover, time in
 * 15-minute units, status and what was done. An issue reported on WhatsApp alone is logged with the
 * warning that it starts no clock. An open item at day 30 can be left open by agreement: who owes it and
 * by when (SOP-06 section 10).
 */
export function IssueLog({ project, onMessage }: { project: CrmProject; onMessage: (ids: string[], issueId?: string) => void }) {
  const { saveProject, today } = useClients();
  const [f, setF] = useState({ at: today, channel: "email", summary: "", severity: "S3" as Issue["severity"], cover: "defect" as Issue["cover"], minutes: "15" });
  const [err, setErr] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [done, setDone] = useState("");
  const issues = [...(project.issues || [])].sort((a, b) => b.at.localeCompare(a.at));
  const add = async () => {
    if (!f.summary.trim()) return setErr("One line: what is wrong.");
    setErr(null);
    const issue: Issue = { id: `is_${Date.now().toString(36)}`, at: new Date(`${f.at}T12:00:00+05:30`).toISOString(), channel: f.channel, summary: f.summary.trim(), severity: f.severity, cover: f.cover, minutes: Math.max(15, Math.ceil((Number(f.minutes) || 15) / 15) * 15), status: "open" };
    try {
      await saveProject(project.id, (p) => ({ ...p, issues: [...(p.issues || []), issue] }), { type: "note", detail: `Issue logged (${issue.severity}, ${issue.cover}): ${issue.summary}`, data: { issueId: issue.id } });
      setF({ ...f, summary: "" });
    } catch (e) {
      setErr(errText(e));
    }
  };
  const close = async (id: string) => {
    try {
      await saveProject(project.id, (p) => ({ ...p, issues: (p.issues || []).map((i) => (i.id === id ? { ...i, status: "closed", closedAt: new Date().toISOString(), done: done.trim() || "Fixed" } : i)) }),
        { type: "note", detail: `Issue closed: ${done.trim() || "Fixed"}`, data: { issueId: id } });
      setClosing(null);
      setDone("");
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="space-y-2" data-testid="issue-log">
      <ul className="space-y-1.5">
        {issues.map((i) => (
          <li key={i.id} className="rounded-lg border border-border p-2 text-[12px]" data-testid="issue-row" data-status={i.status}>
            <p><span className="font-medium">{i.severity}</span> {fmtDate(indiaDate(i.at))}, {i.channel}: {i.summary}</p>
            <p className="text-muted-foreground">{COVER.find((x) => x.value === i.cover)?.label}; {i.minutes} minutes; {i.status === "open" ? "open" : `closed ${fmtDate(indiaDate(i.closedAt || i.at))}: ${i.done}`}</p>
            {i.channel === "whatsapp" && <p className="text-amber-700 dark:text-amber-300">Reported on WhatsApp alone: it starts no clock. Ask for it by e-mail too.</p>}
            {i.status === "open" && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                <button type="button" className={crm.btn} onClick={() => onMessage(["cp_support_response_em_en"], i.id)}>The response</button>
                {i.severity === "S1" && <button type="button" className={crm.btn} onClick={() => onMessage(["cp_support_site_down_wa_hi"], i.id)}>Site down: within ten minutes</button>}
                <button type="button" className={crm.btnGhost} onClick={() => setClosing(i.id)}>Close it</button>
              </div>
            )}
            {closing === i.id && (
              <div className="mt-1 flex gap-1.5">
                <input aria-label="What was done" className={inputCls} value={done} onChange={(e) => setDone(e.target.value)} placeholder="What was done" />
                <button type="button" className={crm.btnPrimary} onClick={() => void close(i.id)}>Closed</button>
              </div>
            )}
          </li>
        ))}
        {!issues.length && <li className="text-[12px] text-muted-foreground">Nothing reported.</li>}
      </ul>
      <div className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-3">
        <Field id="is-at" label="Reported on"><input id="is-at" type="date" className={inputCls} value={f.at} max={today} onChange={(e) => setF({ ...f, at: e.target.value })} /></Field>
        <Field id="is-ch" label="Channel">
          <select id="is-ch" className={inputCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option><option value="call">Call</option></select>
        </Field>
        <Field id="is-min" label="Time spent (minutes, 15-minute units)"><input id="is-min" type="number" min={15} step={15} className={inputCls} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field>
        <Field id="is-sum" label="One line" className="sm:col-span-3"><input id="is-sum" className={inputCls} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} data-testid="issue-summary" /></Field>
        <Field id="is-sev" label="Severity">
          <select id="is-sev" className={inputCls} value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as Issue["severity"] })}>{SEVERITY.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        </Field>
        <Field id="is-cov" label="Cover" className="sm:col-span-2">
          <select id="is-cov" className={inputCls} value={f.cover} onChange={(e) => setF({ ...f, cover: e.target.value as Issue["cover"] })}>{COVER.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        </Field>
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-3">
          <button type="button" className={crm.btnGhost} onClick={() => onMessage(["cp_support_email_please_wa_hi", "cp_support_five_q_wa_hi", "cp_support_sunday_wa_hi"])}>Messages for a request</button>
          <button type="button" className={crm.btn} onClick={() => void add()} data-testid="issue-add">Log it</button>
        </div>
      </div>
      <Problem text={err} />
    </div>
  );
}
