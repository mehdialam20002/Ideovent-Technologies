import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { docBalance, excessOf, payableDocs } from "@/lib/clients/money";
import { issueWithSnapshot, receiptDraft } from "@/lib/clients/docs/issue";
import type { MessageAbout } from "@/lib/clients/compose";
import type { CrmDocument, CrmPayment, PaymentMode } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { day, errText, Field, inputCls, Problem, Reasons, rs } from "./shared";

const MODES: { value: PaymentMode; label: string }[] = [
  { value: "neft", label: "NEFT" }, { value: "imps", label: "IMPS" }, { value: "rtgs", label: "RTGS" }, { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque (cleared)" }, { value: "other", label: "Other" },
];

/**
 * RECORD A PAYMENT (client-process-spec 5.4): only money credited in the bank counts ("not sent, not a
 * screenshot"), against an issued proforma or invoice of this project, with its UTR or reference. TDS
 * is recorded beside the amount credited. An over-payment needs a note. A receipt follows the same day:
 * one press issues it (it may wait for a Settings blank, which it names).
 */
export function RecordPaymentDialog({ clientId, projectId, docId, onClose, onRecorded, onMessage }: {
  clientId: string;
  projectId: string | null;
  docId?: string;
  onClose: () => void;
  onRecorded?: (p: CrmPayment, receipt: CrmDocument | null) => void;
  /** Opens a message about this payment (the part-payment line, the receipt e-mail). */
  onMessage?: (ids: string[], about: MessageAbout) => void;
}) {
  const { data, act, today } = useClients();
  const docs = useMemo(() => data.documents.filter((d) => d.clientId === clientId && (projectId ? d.projectId === projectId : !d.projectId)), [data.documents, clientId, projectId]);
  const pays = useMemo(() => data.payments.filter((p) => p.clientId === clientId && (projectId ? p.projectId === projectId : !p.projectId)), [data.payments, clientId, projectId]);
  const open = payableDocs(projectId, docs, pays);
  const [against, setAgainst] = useState(docId || open[0]?.id || "");
  const doc = docs.find((d) => d.id === against) || null;
  const balance = doc ? Math.max(0, docBalance(doc, docs, pays)) : 0;
  const [receivedOn, setReceivedOn] = useState(today);
  const [amount, setAmount] = useState<string>(balance ? String(balance) : "");
  const [tds, setTds] = useState("0");
  const [mode, setMode] = useState<PaymentMode>("neft");
  const [reference, setReference] = useState("");
  const [credited, setCredited] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ p: CrmPayment; receipt: CrmDocument | null; problem: string | null; draftId?: string } | null>(null);

  const amt = Math.round(Number(amount) || 0);
  const tdsN = Math.round(Number(tds) || 0);
  const excess = doc ? excessOf(amt, tdsN, doc, docs, pays) : 0;
  const warnings: string[] = [];
  if (doc?.kind === "proforma" && doc.validUntil && doc.validUntil < receivedOn) warnings.push(`Proforma ${doc.number} expired on ${day(doc.validUntil)}. The money is in the bank, so it is recorded; confirm the start date in writing.`);
  if (excess > 0) warnings.push(`This is ${rs(excess)} more than is open on ${doc?.number}: write in the note what the extra is for.`);
  const missing: string[] = [];
  if (!doc) missing.push("Pick the proforma or invoice it was paid against.");
  if (amt + tdsN <= 0) missing.push("The amount credited.");
  if (!reference.trim()) missing.push("The UTR or bank reference (a payment that cannot be matched cannot be credited).");
  if (!credited) missing.push("Tick \"Credited in the bank\": not sent, not a screenshot.");
  if (excess > 0 && !note.trim()) missing.push("A note for the over-payment.");

  const save = async () => {
    if (missing.length || !doc) return setErr(missing.join(" "));
    setBusy(true);
    setErr(null);
    try {
      const { p, draftId } = await act(async (s) => {
        const p = await s.recordPayment({ clientId, projectId, againstDoc: doc.id, receivedOn, amount: amt, tds: tdsN, mode, reference: reference.trim(), note: note.trim() || null });
        await s.addEvent({ clientId, projectId, type: "payment", detail: `Payment of ${rs(p.amount)}${p.tds ? ` (TDS ${rs(p.tds)})` : ""} credited on ${day(p.receivedOn)} against ${doc.number}, reference ${p.reference}`, data: { paymentId: p.id, againstDoc: doc.id } });
        // A draft receipt with every number filled: issuing it is one tap, the same day (5.4).
        const d = await s.saveDraft(receiptDraft(p));
        return { p, draftId: d.id };
      });
      setDone({ p, receipt: null, problem: null, draftId });
      onRecorded?.(p, null);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const receipt = async () => {
    if (!done) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await act(async (s) => {
        const d = done.draftId ? { id: done.draftId } : await s.saveDraft(receiptDraft(done.p));
        const [clients, projects, documents, payments, settings] = await Promise.all([s.listClients(), s.listProjects(), s.listDocuments(), s.listPayments(), s.getSettings()]);
        return issueWithSnapshot(s, { clients, projects, documents, payments, settings }, d.id, new Date());
      });
      setDone({ ...done, receipt: r, problem: null });
      onRecorded?.(done.p, r);
    } catch (e) {
      setDone({ ...done, problem: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn(crm.panel, "p-4")} data-testid="record-payment" aria-label="Record a payment">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium">Record a payment</p>
          <p className="text-[11px] text-muted-foreground">Only money credited in the bank counts. A receipt follows the same day.</p>
        </div>
        <button type="button" className={crm.btnGhost} onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      {done ? (
        <div className="mt-3 space-y-2 text-[13px]" data-testid="payment-recorded">
          <p role="status">Recorded: {rs(done.p.amount)}{done.p.tds ? ` and TDS ${rs(done.p.tds)}` : ""} on {day(done.p.receivedOn)}, against {doc?.number}.</p>
          {done.receipt ? (
            <>
              <p data-testid="receipt-issued">Receipt <span className="font-mono">{done.receipt.number}</span> issued. Download it from Documents and e-mail it today.</p>
              {onMessage && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={crm.btn} onClick={() => onMessage(["cp_payment_receipt_em_en"], { paymentId: done.p.id })} data-testid="payment-receipt-email">E-mail the receipt</button>
                  {doc && docBalance(doc, docs, pays) > 0 && (
                    <button type="button" className={crm.btn} onClick={() => onMessage(["cp_payment_part_wa_en"], { paymentId: done.p.id })} data-testid="payment-part-line">A part payment: the one-line WhatsApp</button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <button type="button" className={crm.btnPrimary} onClick={() => void receipt()} disabled={busy} data-testid="issue-receipt">Issue the receipt now</button>
              {done.problem && <Reasons items={[done.problem]} tone="block" />}
            </>
          )}
          <div><button type="button" className={crm.btn} onClick={onClose}>Done</button></div>
        </div>
      ) : (
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <Field id="pay-doc" label="Against" className="sm:col-span-2">
            <select id="pay-doc" className={inputCls} value={against} onChange={(e) => { setAgainst(e.target.value); const d = docs.find((x) => x.id === e.target.value); if (d) setAmount(String(Math.max(0, docBalance(d, docs, pays)))); }} data-testid="pay-doc">
              <option value="">Pick the document</option>
              {open.map((d) => <option key={d.id} value={d.id}>{d.number} ({d.kind === "proforma" ? "proforma" : "invoice"}), open {rs(Math.max(0, docBalance(d, docs, pays)))}</option>)}
            </select>
          </Field>
          <Field id="pay-on" label="Credited on"><input id="pay-on" type="date" className={inputCls} value={receivedOn} max={today} onChange={(e) => setReceivedOn(e.target.value)} /></Field>
          <Field id="pay-mode" label="Mode">
            <select id="pay-mode" className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>{MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          </Field>
          <Field id="pay-amount" label="Amount credited (Rs)"><input id="pay-amount" type="number" min={0} className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="pay-amount" /></Field>
          <Field id="pay-tds" label="TDS deducted (Rs)" hint="Deducted against the firm's PAN; the certificate comes later."><input id="pay-tds" type="number" min={0} className={inputCls} value={tds} onChange={(e) => setTds(e.target.value)} /></Field>
          <Field id="pay-ref" label="UTR or bank reference" className="sm:col-span-2"><input id="pay-ref" className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} data-testid="pay-ref" /></Field>
          <label className="flex min-h-11 items-center gap-2 text-[13px] sm:col-span-2 md:min-h-9">
            <input type="checkbox" checked={credited} onChange={(e) => setCredited(e.target.checked)} data-testid="pay-credited" />
            Credited in the bank (seen in the statement): not "sent", not a screenshot
          </label>
          {(excess > 0 || note) && (
            <Field id="pay-note" label="Note" className="sm:col-span-2"><input id="pay-note" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
          )}
          <div className="sm:col-span-2 space-y-2">
            <Reasons items={warnings} />
            {missing.length > 0 && <Reasons items={missing} tone="block" testId="pay-missing" />}
            <Problem text={err} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className={crm.btn} onClick={onClose}>Cancel</button>
            <button type="submit" className={crm.btnPrimary} disabled={busy || missing.length > 0} data-testid="pay-save">Record payment</button>
          </div>
        </form>
      )}
    </section>
  );
}
