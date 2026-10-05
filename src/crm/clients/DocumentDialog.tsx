import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Download, FileCheck2, Share2, Trash2, X } from "lucide-react";
import { PLACEHOLDER_RE } from "@/lib/outreach/engine";
import { amountFor, DOC_TITLES, fileNameFor, issueProblems, modelFor } from "@/lib/clients/docs/builders";
import { docContext, type DocCtx } from "@/lib/clients/docs/context";
import { issueWithSnapshot, ctxForDoc } from "@/lib/clients/docs/issue";
import type { Block, DocModel } from "@/lib/clients/docs/model";
import { preparePdf } from "@/lib/clients/docs/pdf";
import { loadLogo, renderPdf } from "@/lib/clients/docs/render";
import { resolveModel } from "@/lib/clients/docs/text";
import { REASON_CODES } from "@/lib/clients/docs/builders/creditNote";
import { documentNeeds, proformaRefusals } from "@/lib/clients/stages";
import { seriesOf } from "@/lib/clients/numbering";
import type { CrmDocument, DocData, DocKind, Milestone } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { areaCls, day, errText, Field, inputCls, Problem, Reasons, rs, saveBlob } from "./shared";

/**
 * MAKING A DOCUMENT (client-process-spec 6). A draft is built from the live data and can be downloaded
 * at any time, watermarked "DRAFT, NOT FOR SENDING", with every [blank] in amber. "Make it final"
 * (Issue) builds it once more, refuses while a blank, an unprintable character or a need is left, saves
 * the model on the draft and lets crm_issue_document number and freeze it. An issued document is drawn
 * from that snapshot ever after; a mistake is cancelled with a reason and made again.
 */

export interface DocRequest {
  kind: DocKind;
  milestone?: Milestone | null;
  /** An existing document to open. */
  docId?: string;
  data?: DocData;
  paymentId?: string | null;
  relatedDoc?: string | null;
  amount?: number | null;
}

/** Downloads (and, on a phone that can, shares) a document's PDF. */
export function useDocumentPdf() {
  const { data } = useClients();
  const make = useCallback(async (ctx: DocCtx, kind: DocKind) => {
    const prep = preparePdf(ctx, kind);
    const logo = await loadLogo();
    const blob = (await renderPdf(prep.model, { ...prep.opts, logo, output: "blob" })) as Blob;
    return { blob, name: prep.fileName };
  }, []);
  const download = useCallback(async (docId: string) => {
    const doc = data.documents.find((d) => d.id === docId);
    if (!doc) throw new Error("No such document.");
    const { blob, name } = await make(ctxForDoc(data, doc), doc.kind);
    saveBlob(blob, name);
    return name;
  }, [data, make]);
  return { make, download };
}

/** The model as a page, blanks in amber (a preview; the PDF is the record). */
export function DocPreview({ model }: { model: DocModel }) {
  return (
    <article className="max-h-[52vh] overflow-y-auto rounded-lg border border-border bg-background p-3 text-[12px] leading-relaxed sm:p-4" data-testid="doc-preview">
      <h3 className="font-display text-base font-semibold">{mark(model.title)}</h3>
      {model.subtitle && <p className="text-muted-foreground">{mark(model.subtitle)}</p>}
      <div className="mt-2 space-y-2">{model.blocks.map((b, i) => <PreviewBlock key={i} b={b} />)}</div>
    </article>
  );
}

const BLANK = new RegExp(`(${PLACEHOLDER_RE.source})`, "g");
function mark(text: string): ReactNode {
  const parts = text.split(BLANK);
  return parts.map((p, i) => (new RegExp(`^${PLACEHOLDER_RE.source}$`).test(p)
    ? <mark key={i} className="rounded bg-amber-300/70 px-0.5 text-foreground dark:bg-amber-500/40">{p}</mark>
    : <Fragment key={i}>{p.split("\n").map((l, j, arr) => <Fragment key={j}>{l}{j < arr.length - 1 && <br />}</Fragment>)}</Fragment>));
}

function PreviewBlock({ b }: { b: Block }) {
  switch (b.type) {
    case "heading": return <p className={cn("font-semibold", b.level === 2 ? "text-[12px]" : "pt-1 text-[13px]")}>{mark(b.text)}</p>;
    case "paragraph": return <p className={cn(b.bold && "font-semibold", b.italic && "italic", b.muted && "text-muted-foreground")}>{mark(b.text)}</p>;
    case "keyValue":
      return (
        <dl className="grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] gap-x-2 gap-y-0.5">
          {b.rows.map(([k, v], i) => <Fragment key={i}><dt className="font-medium text-muted-foreground">{mark(k)}</dt><dd className="break-words">{mark(v)}</dd></Fragment>)}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            {b.columns.some((c) => c.label) && <thead><tr>{b.columns.map((c, i) => <th key={i} className={cn("border-b border-border px-1 py-0.5 text-left font-medium", c.align === "right" && "text-right")}>{mark(c.label)}</th>)}</tr></thead>}
            <tbody>{b.rows.map((r, i) => <tr key={i} className={cn((b.boldLast && i === b.rows.length - 1) && "font-semibold")}>{r.map((cell, j) => <td key={j} className={cn("border-b border-border/50 px-1 py-0.5 align-top", b.columns[j]?.align === "right" && "text-right tabular-nums")}>{mark(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "bullets": {
      const List = b.numbered ? "ol" : "ul";
      return <List className={cn("space-y-0.5 pl-5", b.numbered ? "list-decimal" : "list-disc")}>{b.items.map((x, i) => <li key={i}>{mark(x)}</li>)}</List>;
    }
    case "callout": return <div className="rounded border border-amber-600/40 bg-amber-500/5 p-2">{b.title && <p className="font-semibold">{mark(b.title)}</p>}{b.lines.map((l, i) => <p key={i}>{mark(l)}</p>)}</div>;
    case "signatures": return <div className="grid gap-2 sm:grid-cols-2">{[b.left, b.right].map((col, i) => <div key={i}>{col.map((l, j) => <p key={j} className={cn(j === 0 && "font-medium")}>{mark(l)}</p>)}</div>)}</div>;
    case "pageBreak": return <hr className="border-dashed border-border" />;
    default: return null;
  }
}

/** The blanks that come from Settings > Client process (6.1's table): the dialog links there when one is left. */
const SETTINGS_BLANKS = ["[firm PAN]", "[Udyam number]", "[authorised signatory]", "[bank name]", "[account name]", "[account number]", "[IFSC]", "[branch]", "[UPI ID]",
  "[refund days]", "[receipt days]", "[dispute window days]", "[late interest percent]", "[asset deadline days]"];

/** Which approval a document's own new wording waits for (6.6, 6.10, E13), or null. */
function wordingKey(doc: Pick<CrmDocument, "kind" | "milestone" | "data">, hasGstin: boolean, quoteIssued: boolean): string | null {
  if (doc.kind === "welcome") return "doc:welcome";
  if (doc.kind === "closing") return "doc:closing";
  if (doc.kind === "credit_note") return "edit:E13";
  if (doc.kind === "invoice" && (doc.milestone === "AMC" || hasGstin)) return "edit:E13";
  if (doc.kind === "proforma" && (doc.data?.part || hasGstin || !quoteIssued)) return "edit:E13";
  return null;
}

/** The document a request opens: an existing one, else the draft as it would be made (not saved yet). */
function requested(docs: CrmDocument[], req: DocRequest, clientId: string, projectId: string | null): CrmDocument {
  if (req.docId) {
    const d = docs.find((x) => x.id === req.docId);
    if (d) return d;
  }
  const now = new Date().toISOString();
  return {
    id: "", clientId, projectId, kind: req.kind, milestone: req.milestone ?? null, status: "draft", series: null, fy: null, serial: null, number: null,
    issuedOn: null, dueOn: null, validUntil: null, amount: req.amount ?? null, paymentId: req.paymentId ?? null, relatedDoc: req.relatedDoc ?? null,
    data: req.data || {}, issuedAt: null, cancelledAt: null, cancelReason: null, createdAt: now, updatedAt: now,
  };
}

export function DocumentDialog({ clientId, projectId, req, onClose, onIssued }: {
  clientId: string;
  projectId: string | null;
  req: DocRequest;
  onClose: () => void;
  onIssued?: (doc: CrmDocument) => void;
}) {
  const { data, act, store, projectCtxOf, now } = useClients();
  const [docId, setDocId] = useState(req.docId || "");
  const [extra, setExtra] = useState<DocData>(req.data || {});
  const [amount, setAmount] = useState<number | null>(req.amount ?? null);
  const [relatedDoc, setRelatedDoc] = useState<string | null>(req.relatedDoc ?? null);
  const [paymentId, setPaymentId] = useState<string | null>(req.paymentId ?? null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const pdf = useDocumentPdf();

  const base = requested(data.documents, { ...req, docId }, clientId, projectId);
  const doc: CrmDocument = base.status === "draft" ? { ...base, data: { ...base.data, ...extra }, amount: amount ?? base.amount, relatedDoc: relatedDoc ?? base.relatedDoc, paymentId: paymentId ?? base.paymentId } : base;
  const ctx = useMemo(() => {
    try {
      const c = docContext(data, projectId ? { projectId } : { clientId }, null, now);
      return { ...c, doc } as DocCtx;
    } catch {
      return null;
    }
  }, [data, projectId, clientId, doc, now]);
  if (!ctx) return null;
  const model = modelFor(ctx, doc.kind);
  const shown = resolveModel(model, doc.status === "draft" ? null : doc, ctx.currentFy);
  const pc = projectId ? projectCtxOf(projectId) : null;
  const needs = pc && doc.status === "draft" ? documentNeeds(pc, doc.kind, doc.milestone).map((n) => `Needs ${n.label}.`) : [];
  // The advance is billed once (stages.ts proformaRefusals; 0014 refuses the same issue): a second bill for the same money never issues.
  const refusals = pc && doc.status === "draft" ? proformaRefusals(pc, { ...doc, id: docId || undefined }) : [];
  const problems = doc.status === "draft" ? [...needs, ...refusals, ...issueProblems(ctx, doc.kind, model)] : [];
  const title = DOC_TITLES[doc.kind];
  const numbered = Boolean(seriesOf(doc.kind));
  const project = projectId ? data.projects.find((p) => p.id === projectId) : null;
  const settingsBlank = problems.some((x) => SETTINGS_BLANKS.some((b) => x.includes(b)));
  const wKey = wordingKey(doc, Boolean(ctx.client.gstin), ctx.docs.some((d) => d.kind === "quotation" && d.status === "issued"));
  const newWording = Boolean(wKey && !data.settings.approvedWording[wKey]);

  const draftInput = () => ({
    id: docId || undefined, clientId, projectId, kind: doc.kind, milestone: doc.milestone, amount: doc.kind === "credit_note" ? amount : amountFor(ctx, doc.kind),
    paymentId: doc.paymentId, relatedDoc: doc.relatedDoc, data: { ...doc.data, model: undefined },
  });
  const saveDraft = async () => {
    setBusy("save");
    setErr(null);
    try {
      const d = await act((s) => s.saveDraft(draftInput()));
      setDocId(d.id);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };
  const issue = async () => {
    setBusy("issue");
    setErr(null);
    try {
      const issued = await act(async (s) => {
        const d = await s.saveDraft(draftInput());
        setDocId(d.id);
        const [clients, projects, documents, payments, settings] = await Promise.all([s.listClients(), s.listProjects(), s.listDocuments(), s.listPayments(), s.getSettings()]);
        return issueWithSnapshot(s, { clients, projects, documents, payments, settings }, d.id, new Date());
      });
      onIssued?.(issued);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };
  const download = async () => {
    setBusy("pdf");
    setErr(null);
    try {
      const { blob, name } = await pdf.make(ctx, doc.kind);
      saveBlob(blob, name);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };
  const share = async () => {
    try {
      const { blob, name } = await pdf.make(ctx, doc.kind);
      const file = new File([blob], name, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        await store().addEvent({ clientId, projectId, type: "doc", detail: `Shared ${title} ${doc.number || ""} (${name})`.replace(/\s+/g, " ").trim() });
      } else setErr("This browser cannot share files: use Download PDF.");
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") setErr(errText(e));
    }
  };
  const deleteDraft = async () => {
    if (!docId) return onClose();
    setBusy("delete");
    try {
      await act((s) => s.deleteDraft(docId));
      onClose();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };
  const cancelDoc = async () => {
    if (!reason.trim()) return setErr("A cancelled document keeps its number; write why it is cancelled.");
    setBusy("cancel");
    setErr(null);
    try {
      await act((s) => s.cancelDocument(doc.id, reason.trim()));
      setCancelling(false);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };

  const issuedInvoices = ctx.docs.filter((d) => d.status === "issued" && (d.kind === "invoice" || d.kind === "proforma"));
  const recordedNoReceipt = ctx.payments.filter((p) => p.status === "recorded" && !ctx.docs.some((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === p.id));

  return (
    <section className={cn(crm.panel, "p-4")} data-testid="document-dialog" data-kind={doc.kind} data-status={doc.status} aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium">
            {title}{doc.milestone && doc.milestone !== "ADVANCE_50" && doc.milestone !== "LAUNCH_50" ? ` (${doc.milestone === "AMC" ? "care plan" : doc.milestone === "CHANGE_REQUEST" ? "change request" : "other"})` : ""}
            {doc.number && <span className="ml-2 font-mono text-[12px]" data-testid="doc-number">{doc.number}</span>}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {doc.status === "draft" ? (numbered ? "Draft: the number is given when you make it final." : "Draft.") : doc.status === "issued" ? `Issued ${day(doc.issuedOn)}${doc.dueOn ? `, due ${day(doc.dueOn)}` : ""}${doc.validUntil ? `, valid until ${day(doc.validUntil)}` : ""}.` : `Cancelled: ${doc.cancelReason}`}
            {doc.amount !== null && doc.status !== "draft" && ` Amount ${rs(doc.amount)}.`}
          </p>
        </div>
        <button type="button" className={crm.btnGhost} onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>

      {doc.status === "draft" && doc.kind === "credit_note" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="cn-fields">
          <Field id="cn-rel" label="Reduces">
            <select id="cn-rel" className={inputCls} value={relatedDoc || ""} onChange={(e) => setRelatedDoc(e.target.value || null)}>
              <option value="">Pick the issued invoice (or, code F, the proforma)</option>
              {issuedInvoices.map((d) => <option key={d.id} value={d.id}>{d.number} ({rs(d.amount)})</option>)}
            </select>
          </Field>
          <Field id="cn-amount" label="Credit (Rs)"><input id="cn-amount" type="number" min={1} className={inputCls} value={amount ?? ""} onChange={(e) => setAmount(e.target.value ? Math.round(Number(e.target.value)) : null)} /></Field>
          <Field id="cn-code" label="Reason code">
            <select id="cn-code" className={inputCls} value={extra.reasonCode || ""} onChange={(e) => setExtra((x) => ({ ...x, reasonCode: (e.target.value || undefined) as DocData["reasonCode"] }))}>
              <option value="">Pick one</option>
              {Object.entries(REASON_CODES).map(([k, v]) => <option key={k} value={k}>{k}: {v.reason}</option>)}
            </select>
          </Field>
          <Field id="cn-settle" label="Settled by">
            <select id="cn-settle" className={inputCls} value={extra.settlement || ""} onChange={(e) => setExtra((x) => ({ ...x, settlement: (e.target.value || undefined) as DocData["settlement"] }))}>
              <option value="">Pick one</option><option value="adjusted">Adjusted against the amount payable</option><option value="refunded">Refunded</option>
            </select>
          </Field>
          <Field id="cn-reason" label="The reason in full" className="sm:col-span-2"><textarea id="cn-reason" rows={2} className={areaCls} value={extra.reason || ""} onChange={(e) => setExtra((x) => ({ ...x, reason: e.target.value }))} /></Field>
          <Field id="cn-with" label="Agreed with"><input id="cn-with" className={inputCls} value={extra.agreedWith || ""} onChange={(e) => setExtra((x) => ({ ...x, agreedWith: e.target.value }))} /></Field>
          <Field id="cn-on" label="Agreed on"><input id="cn-on" type="date" className={inputCls} value={extra.agreedOn || ""} onChange={(e) => setExtra((x) => ({ ...x, agreedOn: e.target.value }))} /></Field>
          <Field id="cn-pa" label="Both partners' written yes: date" hint="SOP-09 note 5: any refund, write-off or discount needs both partners in writing.">
            <input id="cn-pa" type="date" className={inputCls} value={extra.partnersApproval?.at || ""} onChange={(e) => setExtra((x) => ({ ...x, partnersApproval: { at: e.target.value, channel: x.partnersApproval?.channel || "" } }))} />
          </Field>
          <Field id="cn-pac" label="and channel"><input id="cn-pac" className={inputCls} placeholder="WhatsApp, e-mail..." value={extra.partnersApproval?.channel || ""} onChange={(e) => setExtra((x) => ({ ...x, partnersApproval: { at: x.partnersApproval?.at || "", channel: e.target.value } }))} /></Field>
        </div>
      )}
      {doc.status === "draft" && (doc.kind === "change_request" || doc.milestone === "CHANGE_REQUEST") && (
        <div className="mt-3">
          <Field id="cr-pick" label="Change request">
            <select id="cr-pick" className={inputCls} value={extra.crNo || ""} onChange={(e) => setExtra((x) => ({ ...x, crNo: e.target.value || undefined }))} data-testid="cr-pick">
              <option value="">Pick it</option>
              {(project?.changeRequests || []).map((c) => <option key={c.no} value={c.no}>{c.no}: {c.description}</option>)}
            </select>
          </Field>
        </div>
      )}
      {doc.status === "draft" && doc.kind === "receipt" && (
        <div className="mt-3">
          <Field id="rc-pay" label="Payment">
            <select id="rc-pay" className={inputCls} value={paymentId || ""} onChange={(e) => {
              const p = ctx.payments.find((x) => x.id === e.target.value);
              setPaymentId(p?.id || null);
              setRelatedDoc(p?.againstDoc || null);
            }}>
              <option value="">Pick the payment</option>
              {recordedNoReceipt.map((p) => <option key={p.id} value={p.id}>{day(p.receivedOn)}, {rs(p.amount)}, {p.reference}</option>)}
            </select>
          </Field>
        </div>
      )}
      {doc.status === "draft" && doc.kind === "invoice" && doc.milestone === "AMC" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field id="amc-from" label="Period from"><input id="amc-from" type="date" className={inputCls} value={extra.period?.from || ""} onChange={(e) => setExtra((x) => ({ ...x, period: { from: e.target.value, to: x.period?.to || "" } }))} /></Field>
          <Field id="amc-to" label="Period to"><input id="amc-to" type="date" className={inputCls} value={extra.period?.to || ""} onChange={(e) => setExtra((x) => ({ ...x, period: { from: x.period?.from || "", to: e.target.value } }))} /></Field>
        </div>
      )}

      <div className="mt-3"><DocPreview model={shown} /></div>
      {doc.status === "draft" && <div className="mt-3"><Reasons items={problems} tone="block" testId="doc-problems" /></div>}
      {doc.status === "draft" && settingsBlank && (
        <p className="mt-2 text-[12px]" data-testid="doc-settings-link">Some of these come from the firm's details: <Link to={CRM.clientSettings} className="font-medium text-primary hover:underline">Settings &gt; Client process</Link>.</p>
      )}
      {newWording && <p className="mt-2 text-[12px] text-amber-700 dark:text-amber-300" data-testid="doc-new-wording">New wording: approve it once in Settings &gt; Client process before sending.</p>}
      <Problem text={err} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={crm.btn} onClick={() => void download()} disabled={Boolean(busy)} data-testid="doc-download">
          <Download className="h-4 w-4" aria-hidden="true" /> {doc.status === "draft" ? "Download draft PDF" : "Download PDF"}
        </button>
        {doc.status !== "draft" && typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" className={crm.btn} onClick={() => void share()}><Share2 className="h-4 w-4" aria-hidden="true" /> Share PDF</button>
        )}
        {doc.status === "draft" && (
          <>
            <button type="button" className={crm.btn} onClick={() => void saveDraft()} disabled={Boolean(busy)} data-testid="doc-save">Save draft</button>
            <button type="button" className={crm.btnPrimary} onClick={() => void issue()} disabled={Boolean(busy) || problems.length > 0} data-testid="doc-issue">
              <FileCheck2 className="h-4 w-4" aria-hidden="true" /> {numbered ? "Issue (gives the number)" : "Make it final"}
            </button>
            {docId && <button type="button" className={crm.btnGhost} onClick={() => void deleteDraft()} disabled={Boolean(busy)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete draft</button>}
          </>
        )}
        {doc.status === "issued" && !cancelling && (
          <button type="button" className={crm.btnGhost} onClick={() => setCancelling(true)} data-testid="doc-cancel">Cancel with a reason</button>
        )}
      </div>
      {cancelling && (
        <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
          <label htmlFor="doc-cancel-reason" className="block text-[12px] font-medium">Why it is cancelled (it keeps its number; make a new one)</label>
          <input id="doc-cancel-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className={crm.btn} onClick={() => setCancelling(false)}>Keep it</button>
            <button type="button" className={crm.btnPrimary} onClick={() => void cancelDoc()} disabled={Boolean(busy)}>Cancel the document</button>
          </div>
        </div>
      )}
      {doc.status !== "draft" && <p className="mt-2 text-[11px] text-muted-foreground">File name: {fileNameFor(doc, doc.kind, ctx)}. Keep the PDF you send in the project folder.</p>}
    </section>
  );
}
