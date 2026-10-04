import { useState } from "react";
import { HOURLY_RATE } from "@/lib/pricing";
import { addWorkingDays, fmtDate } from "@/lib/clients/numbering";
import { isPaid } from "@/lib/clients/money";
import type { ChangeRequest, CrmProject } from "@/lib/clients/types";
import type { ProjectCtx } from "@/lib/clients/stages";
import { crm } from "../ui";
import { useClients } from "./useClients";
import type { DocRequest } from "./DocumentDialog";
import { areaCls, errText, Field, inputCls, Problem, rs } from "./shared";

const STATUS_LABEL: Record<ChangeRequest["status"], string> = {
  draft: "Draft", sent: "Waiting (form sent)", approved: "Approved", declined: "Declined", parked: "Phase two", waived: "On the house",
};

/**
 * CHANGE REQUESTS (client-process-spec 4.7; SA cl. 6.4; Change-Request-Form): numbered CR-01, CR-02 per
 * project; the description, the reason, the scope impact, the working days, the cost (hours x the
 * hourly rate, or a fixed price), the advance due now and the lapse date; the CR form PDF. Approved
 * only with the signed form and, when it asks for one, its advance credited: then its days move the
 * go-live target (go-live history) and its cost joins the launch invoice.
 */
export function ChangeRequests({ c, onDocument, onMessage }: { c: ProjectCtx; onDocument: (req: DocRequest) => void; onMessage: (ids: string[], crNo?: string) => void }) {
  const { saveProject, data, today } = useClients();
  const p = c.project;
  const rate = data.settings.policy.hourlyRate || HOURLY_RATE;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ description: "", reason: "", scopeImpact: "", days: "", hours: "", fixed: "", advance: "", lapsesOn: "", requestedBy: "" });
  const [err, setErr] = useState<string | null>(null);
  const crs = p.changeRequests || [];
  const nextNo = `CR-${String(crs.length + 1).padStart(2, "0")}`;
  const cost = f.fixed ? Math.round(Number(f.fixed) || 0) : Math.round((Number(f.hours) || 0) * rate);
  const save = async () => {
    if (!f.description.trim() || !f.reason.trim() || !f.scopeImpact.trim() || !f.lapsesOn) return setErr("The description, the reason, the scope impact and the lapse date.");
    setErr(null);
    const cr: ChangeRequest = {
      no: nextNo, raisedAt: new Date().toISOString(), requestedBy: f.requestedBy.trim() || undefined, description: f.description.trim(), reason: f.reason.trim(),
      scopeImpact: f.scopeImpact.trim(), days: Math.max(0, Math.round(Number(f.days) || 0)), cost, advanceDue: Math.max(0, Math.round(Number(f.advance) || 0)),
      lapsesOn: f.lapsesOn, status: "draft", fixedPrice: Boolean(f.fixed) || undefined, hours: f.fixed ? undefined : Number(f.hours) || undefined,
    };
    try {
      await saveProject(p.id, (pp) => ({ ...pp, changeRequests: [...(pp.changeRequests || []), cr] }), { type: "item", detail: `${cr.no} raised: ${cr.description} (${rs(cr.cost)}, ${cr.days} working days)`, data: { crNo: cr.no } });
      setOpen(false);
      setF({ description: "", reason: "", scopeImpact: "", days: "", hours: "", fixed: "", advance: "", lapsesOn: "", requestedBy: "" });
    } catch (e) {
      setErr(errText(e));
    }
  };
  const setStatus = async (cr: ChangeRequest, status: ChangeRequest["status"]) => {
    setErr(null);
    try {
      if (status === "approved") {
        const form = c.docs.find((d) => d.kind === "change_request" && d.data?.crNo === cr.no && d.status === "issued");
        if (!form) throw new Error(`Make ${cr.no}'s form final and have it signed first.`);
        if (cr.advanceDue > 0) {
          const pi = c.docs.find((d) => d.kind === "proforma" && d.milestone === "CHANGE_REQUEST" && d.data?.crNo === cr.no && d.status === "issued");
          if (!pi || !isPaid(pi, c.docs, c.payments)) throw new Error(`${cr.no} asks for an advance of ${rs(cr.advanceDue)}: it must be credited before the change is approved.`);
        }
        if (cr.lapsesOn && cr.lapsesOn < today) throw new Error(`${cr.no} lapsed on ${fmtDate(cr.lapsesOn)}: re-quote it.`);
      }
      await saveProject(p.id, (pp) => {
        const next: CrmProject = { ...pp, changeRequests: (pp.changeRequests || []).map((x) => (x.no === cr.no ? { ...x, status, approvedAt: status === "approved" ? new Date().toISOString() : x.approvedAt } : x)) };
        if (status === "approved" && cr.days > 0 && pp.dates.goLiveTarget) {
          const to = addWorkingDays(pp.dates.goLiveTarget, cr.days);
          next.dates = { ...pp.dates, goLiveTarget: to };
          next.goLiveHistory = [...(pp.goLiveHistory || []), { from: pp.dates.goLiveTarget, to, at: new Date().toISOString(), cause: "change_request", reason: `${cr.no} approved: + ${cr.days} working days` }];
        }
        return next;
      }, { type: "item", detail: `${cr.no}: ${STATUS_LABEL[status]}`, data: { crNo: cr.no } });
    } catch (e) {
      setErr(errText(e));
    }
  };
  const absorbed = crs.length + (p.waived || []).length;
  return (
    <div className="space-y-2" data-testid="change-requests">
      <ul className="space-y-1.5">
        {crs.map((cr) => (
          <li key={cr.no} className="rounded-lg border border-border p-2 text-[12px]" data-testid="cr-row" data-cr={cr.no}>
            <p className="font-medium">{cr.no}: {cr.description} <span className="font-normal text-muted-foreground">({STATUS_LABEL[cr.status]})</span></p>
            <p className="text-muted-foreground">{rs(cr.cost)}, + {cr.days} working days, advance {rs(cr.advanceDue)}{cr.lapsesOn ? `, lapses ${fmtDate(cr.lapsesOn)}` : ""}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <button type="button" className={crm.btn} onClick={() => onDocument({ kind: "change_request", data: { crNo: cr.no } })}>The form (PDF)</button>
              {cr.status === "draft" && <button type="button" className={crm.btn} onClick={() => onMessage(["cp_cr_send_em_en"], cr.no)}>Send it</button>}
              {cr.advanceDue > 0 && !["approved", "declined", "waived"].includes(cr.status) && <button type="button" className={crm.btn} onClick={() => onDocument({ kind: "proforma", milestone: "CHANGE_REQUEST", data: { crNo: cr.no } })}>Its advance proforma</button>}
              {cr.status === "draft" && <button type="button" className={crm.btnGhost} onClick={() => void setStatus(cr, "sent")}>Mark sent</button>}
              {["draft", "sent"].includes(cr.status) && (
                <>
                  <button type="button" className={crm.btnPrimary} onClick={() => void setStatus(cr, "approved")}>Approved (signed{cr.advanceDue ? ", advance credited" : ""})</button>
                  <button type="button" className={crm.btnGhost} onClick={() => { void setStatus(cr, "parked"); onMessage(["cp_cr_shelf_wa_hi"], cr.no); }}>Phase two</button>
                  <button type="button" className={crm.btnGhost} onClick={() => void setStatus(cr, "declined")}>Declined</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {absorbed >= 3 && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[12px]">
          The third request in this project: phone first, then the re-baseline e-mail (SOP-09 section 2).{" "}
          <button type="button" className="text-primary hover:underline" onClick={() => onMessage(["cp_rebaseline_em_en"])}>Write it</button>
        </p>
      )}
      {!open ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={crm.btn} onClick={() => setOpen(true)} data-testid="cr-new">New change request ({nextNo})</button>
          <button type="button" className={crm.btnGhost} onClick={() => onMessage(["cp_cr_yes_wa_hi"])}>"Yes, and here is the price"</button>
        </div>
      ) : (
        <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
          <Field id="cr-desc" label="Description of the change" className="sm:col-span-2"><textarea id="cr-desc" rows={2} className={areaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field id="cr-reason" label="Reason (why they want it)" className="sm:col-span-2"><input id="cr-reason" className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <Field id="cr-scope" label="Impact on scope (pages, screens, features)" className="sm:col-span-2"><input id="cr-scope" className={inputCls} value={f.scopeImpact} onChange={(e) => setF({ ...f, scopeImpact: e.target.value })} /></Field>
          <Field id="cr-by" label="Requested by"><input id="cr-by" className={inputCls} value={f.requestedBy} onChange={(e) => setF({ ...f, requestedBy: e.target.value })} /></Field>
          <Field id="cr-days" label="Working days added"><input id="cr-days" type="number" min={0} className={inputCls} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} /></Field>
          <Field id="cr-hours" label={`Hours (x Rs ${rate})`}><input id="cr-hours" type="number" min={0} step="0.25" className={inputCls} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field>
          <Field id="cr-fixed" label="or a fixed price (Rs)"><input id="cr-fixed" type="number" min={0} className={inputCls} value={f.fixed} onChange={(e) => setF({ ...f, fixed: e.target.value })} /></Field>
          <Field id="cr-adv" label="Advance due now (Rs)" hint={`50% is ${rs(Math.round(cost / 2))}, all of it ${rs(cost)}; 0 for an extra design round (cl. 6.3, invoiced on completion).`}><input id="cr-adv" type="number" min={0} className={inputCls} value={f.advance} onChange={(e) => setF({ ...f, advance: e.target.value })} /></Field>
          <Field id="cr-lapse" label="The quote lapses on"><input id="cr-lapse" type="date" className={inputCls} value={f.lapsesOn} onChange={(e) => setF({ ...f, lapsesOn: e.target.value })} /></Field>
          <p className="self-end text-[13px]">Cost {rs(cost)}</p>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className={crm.btn} onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className={crm.btnPrimary} onClick={() => void save()}>Raise {nextNo}</button>
          </div>
        </div>
      )}
      <Problem text={err} />
    </div>
  );
}
