import { useState } from "react";
import { recordApproval, recordDeemed } from "@/lib/clients/stages";
import { addDays, fmtDate } from "@/lib/clients/numbering";
import type { Approval } from "@/lib/clients/types";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { areaCls, errText, Field, inputCls, Problem } from "./shared";

const WHAT_LABEL: Record<string, string> = {
  k_confirmed: "\"Confirmed\" to the kickoff summary",
  d_wire_ok: "Structure (wireframes) approved",
  d_ok: "Design approved",
  q_accepted: "The finished work accepted",
  l_proposed: "\"Go ahead\" for the go-live date",
  partners_terminate: "Both partners' written yes to terminate",
};

/**
 * RECORD AN APPROVAL (SOP-08 section 3): their words as they wrote them, the channel and the date. An
 * approval on WhatsApp or a call is put in an e-mail the same day and they reply "confirmed": the design
 * approval counts once it is in an e-mail. Deemed acceptance (SA cl. 3.3) when the 7-day review window
 * passed with no written list.
 */
export function ApprovalDialog({ projectId, what, deemedFrom, onDone }: {
  projectId: string;
  what: string;
  /** The notice date a deemed acceptance counts from (q_accepted, a design round). */
  deemedFrom?: string | null;
  onDone?: () => void;
}) {
  const { saveProject, today } = useClients();
  const [channel, setChannel] = useState<Approval["channel"]>("email");
  const [words, setWords] = useState("");
  const [on, setOn] = useState(today);
  const [emailed, setEmailed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const label = WHAT_LABEL[what] || what;
  const save = async () => {
    if (!words.trim()) return setErr("Write their words, as they wrote them.");
    try {
      await saveProject(projectId, (p) => recordApproval(p, {
        what, channel, words, at: new Date(`${on}T12:00:00+05:30`).toISOString(),
        ...(channel !== "email" && emailed ? { emailConfirmedAt: new Date().toISOString() } : {}),
      }, new Date()), { type: "approval", channel: channel === "email" ? "email" : channel === "whatsapp" ? "whatsapp" : channel === "call" ? "call" : "meeting", detail: `${label}: "${words.trim()}" (${channel}, ${fmtDate(on)})`, data: { what } });
      onDone?.();
    } catch (e) {
      setErr(errText(e));
    }
  };
  const deemedOk = Boolean(deemedFrom) && addDays(deemedFrom!, 7) <= today;
  const deemed = async () => {
    try {
      const round = /^round:.+:(\d+)$/.exec(what);
      await saveProject(projectId, (p) => {
        const d = recordDeemed(p, what, deemedFrom!, new Date());
        return round ? { ...d, rounds: (d.rounds || []).map((r) => (r.n === Number(round[1]) ? { ...r, deemedAt: new Date().toISOString() } : r)) } : d;
      }, { type: "approval", detail: `${label}: deemed accepted under Clause 3.3 (no written list in the 7-day window from ${fmtDate(deemedFrom!)})`, data: { what, deemed: true } });
      onDone?.();
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <form className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3" data-testid={`approval-${what}`} onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <p className="text-[12px] font-medium">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`ap-${what}-ch`} label="Channel">
          <select id={`ap-${what}-ch`} className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value as Approval["channel"])}>
            <option value="email">E-mail</option><option value="whatsapp">WhatsApp</option><option value="call">Call</option><option value="meeting">Meeting</option>
          </select>
        </Field>
        <Field id={`ap-${what}-on`} label="On"><input id={`ap-${what}-on`} type="date" className={inputCls} value={on} max={today} onChange={(e) => setOn(e.target.value)} /></Field>
        <Field id={`ap-${what}-words`} label="Their words, verbatim" className="sm:col-span-2">
          <textarea id={`ap-${what}-words`} rows={2} className={areaCls} value={words} onChange={(e) => setWords(e.target.value)} data-testid="approval-words" />
        </Field>
        {channel !== "email" && (
          <label className="flex min-h-11 items-center gap-2 text-[12px] sm:col-span-2 md:min-h-9">
            <input type="checkbox" checked={emailed} onChange={(e) => setEmailed(e.target.checked)} />
            Put in an e-mail the same day and they replied "confirmed"
          </label>
        )}
      </div>
      <Problem text={err} />
      <div className="flex flex-wrap justify-end gap-2">
        {deemedFrom && (
          <button type="button" className={crm.btn} disabled={!deemedOk} onClick={() => void deemed()} data-testid="approval-deemed"
            title={deemedOk ? undefined : `The window closes on ${fmtDate(addDays(deemedFrom, 7))}`}>
            Record deemed acceptance
          </button>
        )}
        <button type="submit" className={crm.btnPrimary} data-testid="approval-save">Record the approval</button>
      </div>
    </form>
  );
}
