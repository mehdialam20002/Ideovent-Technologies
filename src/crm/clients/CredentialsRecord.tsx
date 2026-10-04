import { useState } from "react";
import { Lock } from "lucide-react";
import { accessRowLocked, type ProjectCtx } from "@/lib/clients/stages";
import { fmtDate } from "@/lib/clients/numbering";
import type { AccessRow, Deliverable } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { areaCls, errText, Field, inputCls, Problem } from "./shared";

const GIVEN: { value: NonNullable<AccessRow["given"]>; label: string }[] = [
  { value: "added_as_user", label: "Added contact@ideovent.in as a user" }, { value: "one_time_link", label: "One-time secret link" }, { value: "client_makes_changes", label: "The client makes changes on request" },
];
const METHOD: { value: NonNullable<AccessRow["method"]>; label: string }[] = [
  { value: "own_email_invite", label: "Admin account on their own e-mail" }, { value: "one_time_link", label: "One-time secret link, username by the other channel" }, { value: "not_applicable", label: "Not applicable" },
];

/**
 * THE ACCESS RECORD (client-process-spec 4.5, 4.10; Handover Document section 2): one row per system,
 * from kickoff (how access was given) to the handover (how it was transferred, when, whether the client
 * changed the password) and the end of support (removed on). No password is written anywhere: the CRM
 * has no field for one. Rows for what Ideovent built or set up (admin panel, database, repository, a
 * hosting account it opened) cannot be transferred before the launch payment is credited (decision 10);
 * the registrar, DNS and the client's own accounts never wait for money.
 */
export function CredentialsRecord({ c }: { c: ProjectCtx }) {
  const { saveProject, today } = useClients();
  const p = c.project;
  const [sys, setSys] = useState("");
  const [built, setBuilt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = p.access || [];
  const save = async (next: AccessRow[], detail: string) => {
    setErr(null);
    try {
      await saveProject(p.id, (pp) => ({ ...pp, access: next }), { type: "item", detail, data: { panel: "access" } });
    } catch (e) {
      setErr(errText(e));
    }
  };
  const upd = (i: number, patch: Partial<AccessRow>, what: string) => {
    const r = rows[i];
    if ((patch.method || patch.transferredOn) && accessRowLocked(c, r)) return setErr(`${r.system} was built or set up by Ideovent: it is handed over after the launch payment is credited (SA cl. 5.2(b), 7.2).`);
    void save(rows.map((x, j) => (j === i ? { ...x, ...patch } : x)), `Access record: ${r.system}, ${what}`);
  };
  return (
    <div className="space-y-2" data-testid="access-record">
      <p className="text-[12px] text-muted-foreground">No password is written in this record, only the method and the date. Never ask for a password on WhatsApp: ask them to add contact@ideovent.in as a user, or send a one-time secret link.</p>
      <ul className="space-y-1.5">
        {rows.map((r, i) => {
          const locked = accessRowLocked(c, r);
          return (
            <li key={i} className={cn("grid gap-1.5 rounded-lg border p-2 text-[12px] sm:grid-cols-2", locked ? "border-amber-500/50" : "border-border")} data-testid="access-row" data-locked={locked ? "1" : "0"}>
              <p className="font-medium sm:col-span-2">
                {r.system}{r.username ? ` (${r.username})` : ""}{r.waitsForPayment && <span className="ml-1 text-muted-foreground">built or set up by Ideovent</span>}
                {locked && <span className="ml-1 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><Lock className="h-3 w-3" aria-hidden="true" /> Needs: launch payment credited</span>}
              </p>
              <select aria-label={`How access was given: ${r.system}`} className={cn(inputCls, "h-8")} value={r.given || ""} onChange={(e) => upd(i, { given: (e.target.value || undefined) as AccessRow["given"], givenOn: r.givenOn || today }, "access given")}>
                <option value="">How it was given</option>{GIVEN.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <select aria-label={`Transfer method: ${r.system}`} className={cn(inputCls, "h-8")} disabled={locked} value={r.method || ""} onChange={(e) => upd(i, { method: (e.target.value || undefined) as AccessRow["method"] }, "transfer method")} data-testid="access-method">
                <option value="">Transfer method</option>{METHOD.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <label className="flex items-center gap-2">Transferred on
                <input type="date" className={cn(inputCls, "h-8 w-auto")} disabled={locked} value={r.transferredOn || ""} max={today} onChange={(e) => upd(i, { transferredOn: e.target.value || undefined }, "transferred")} data-testid="access-transferred" />
              </label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(r.changedByClient)} disabled={locked} onChange={(e) => upd(i, { changedByClient: e.target.checked }, "password changed by the client")} /> Client changed the password</label>
              <label className="flex items-center gap-2 sm:col-span-2">Our access removed on
                <input type="date" className={cn(inputCls, "h-8 w-auto")} value={r.removedOn || ""} max={today} onChange={(e) => upd(i, { removedOn: e.target.value || undefined }, "our access removed")} />
                {r.removedOn && <span className="text-muted-foreground">{fmtDate(r.removedOn)}</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (sys.trim()) { void save([...rows, { system: sys.trim(), waitsForPayment: built }], `Access record: ${sys.trim()} added`); setSys(""); setBuilt(false); } }}>
        <input aria-label="System" className={cn(inputCls, "min-w-0 flex-1")} placeholder="System (website admin, hosting, registrar, analytics...)" value={sys} onChange={(e) => setSys(e.target.value)} data-testid="access-system" />
        <label className="flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={built} onChange={(e) => setBuilt(e.target.checked)} data-testid="access-built" /> Ideovent built or set it up</label>
        <button type="submit" className={crm.btn} data-testid="access-add">Add</button>
      </form>
      <Problem text={err} />
    </div>
  );
}

/**
 * THE DELIVERABLES (Handover Document section 4): copied word for word from the SOW, each Yes or Part;
 * a Part says what remains, who owes it and by when.
 */
export function DeliverablesPanel({ c }: { c: ProjectCtx }) {
  const { saveProject } = useClients();
  const p = c.project;
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const rows = p.deliverables || [];
  const save = async (next: Deliverable[], detail: string) => {
    setErr(null);
    try {
      await saveProject(p.id, (pp) => ({ ...pp, deliverables: next }), { type: "item", detail, data: { panel: "deliverables" } });
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="space-y-2" data-testid="deliverables">
      <p className="text-[12px] text-muted-foreground">Copy them from the SOW word for word. Do not paraphrase.</p>
      <ul className="space-y-1.5">
        {rows.map((d, i) => (
          <li key={i} className="grid gap-1.5 rounded-lg border border-border p-2 text-[12px] sm:grid-cols-[minmax(0,1fr)_120px]">
            <span>{d.text}</span>
            <select aria-label={`Delivered: ${d.text}`} className={cn(inputCls, "h-8")} value={d.delivered} onChange={(e) => void save(rows.map((x, j) => (j === i ? { ...x, delivered: e.target.value as Deliverable["delivered"] } : x)), `Deliverable: ${d.text}, ${e.target.value}`)}>
              <option value="yes">Yes</option><option value="part">Part</option>
            </select>
            {d.delivered === "part" && (
              <>
                <input aria-label="What remains" className={cn(inputCls, "h-8")} placeholder="What remains" defaultValue={d.remains || ""} onBlur={(e) => void save(rows.map((x, j) => (j === i ? { ...x, remains: e.target.value } : x)), `Deliverable: what remains`)} />
                <input aria-label="Who owes it" className={cn(inputCls, "h-8")} placeholder="Who owes it" defaultValue={d.owner || ""} onBlur={(e) => void save(rows.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)), `Deliverable: who owes it`)} />
                <input aria-label="By when" type="date" className={cn(inputCls, "h-8")} defaultValue={d.by || ""} onBlur={(e) => void save(rows.map((x, j) => (j === i ? { ...x, by: e.target.value } : x)), `Deliverable: by when`)} />
              </>
            )}
          </li>
        ))}
      </ul>
      <Field id="dl-text" label="A deliverable, as written in the SOW">
        <textarea id="dl-text" rows={2} className={areaCls} value={text} onChange={(e) => setText(e.target.value)} data-testid="deliverable-text" />
      </Field>
      <div className="flex justify-end"><button type="button" className={crm.btn} onClick={() => { if (text.trim()) { void save([...rows, { text: text.trim(), delivered: "yes" }], `Deliverable added: ${text.trim()}`); setText(""); } }} data-testid="deliverable-add">Add</button></div>
      <Problem text={err} />
    </div>
  );
}
