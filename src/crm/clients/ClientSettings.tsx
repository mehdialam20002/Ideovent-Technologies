import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { HOURLY_RATE } from "@/lib/pricing";
import { BUILDERS } from "@/lib/clients/docs/builders";
import type { DocCtx } from "@/lib/clients/docs/context";
import type { DocModel } from "@/lib/clients/docs/model";
import { fmtDate, fyOf, indiaDate } from "@/lib/clients/numbering";
import { newProject } from "@/lib/clients/store";
import { CLIENT_TEMPLATES } from "@/lib/clients/templates";
import type { ClientSettings, CrmClient, CrmProject, Series } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm, EmptyState, PageHeader } from "../ui";
import { useOptionalClients } from "./context";
import { useClients } from "./useClients";
import { DocPreview } from "./DocumentDialog";
import { errText, Field, inputCls, Needs0014, Problem } from "./shared";

/**
 * SETTINGS > CLIENT PROCESS (client-process-spec 6.1, 6.3, 10.5). Mehdi only (RoleGate "settings").
 *
 * The firm's billing details, the policy numbers README-BILLING section 6 says to "decide once", "The
 * deed names the authorised signatory", "Print the template note", the first serial per series for this
 * financial year, the Google review link, and every new or edited wording with an Approved tick. A blank
 * here is a [blank] in every document that prints it, so that document cannot be issued: the truth rule,
 * not a bug. Nothing here is filled in by the CRM: the signatory in particular stays blank until Mehdi
 * records who signs (FACTS keeps it blank "until the deed names who may sign").
 */

const SERIES: { id: Series; label: string; example: string }[] = [
  { id: "Q", label: "Quotation", example: "IDV/Q" },
  { id: "PI", label: "Proforma", example: "IDV/PI" },
  { id: "INV", label: "Invoice", example: "IDV" },
  { id: "RC", label: "Receipt", example: "IDV/RC" },
  { id: "CN", label: "Credit note", example: "IDV/CN" },
];

/** The document edits and new compositions that are approved like a template (7.4 E5, E6, E13; 6.6; 6.10). */
const DOC_WORDING: { id: string; label: string; source: string; text?: string; sample?: "welcome" | "closing" }[] = [
  {
    id: "doc:welcome", label: "The welcome pack (PDF)", source: "Section 6.6: a new composition, every sentence from a named source (SA, SOW, SOP-02, SOP-03, SOP-04, SOP-08, Hosting Terms, the Handover Document, the Onboarding Form, FACTS)",
    sample: "welcome",
  },
  { id: "doc:closing", label: "The closing letter (PDF)", source: "Section 6.10: SOP-06 section 10 Day 30, the Handover Document, the Privacy Policy retention table, SA cl. 9.7", sample: "closing" },
  {
    id: "edit:E5", label: "Invoice: the TDS lines (E5)", source: "Invoice-NonGST section 2; CA to confirm",
    text: "\"send the Form 16A certificate\" becomes \"send the TDS certificate\".\nThe line naming section 194J becomes: \"Indian clients commonly deduct TDS on fees for professional or technical services. Which provision and rate apply to a particular engagement is the client's determination: confirm it with your own chartered accountant.\"",
  },
  {
    id: "edit:E6", label: "Quotation: rounds and feedback (E6)", source: "Quotation section 3; SA cl. 6.1, 3.2",
    text: "\"2 rounds of revision are included at each design stage.\"\n\"Feedback on a deliverable comes back within 7 calendar days.\"",
  },
  {
    id: "edit:E13", label: "Proforma, invoice and credit note lines (E13)", source: "Proforma-Invoice, Invoice-NonGST, Credit-Note; CA to confirm (b), (e) and (f)",
    text: [
      "(a) A split advance: \"Advance requested now, part 1 of 2 of the 50% advance\" (part 2 likewise).",
      "(b) No quotation issued: \"Against proposal {proposalNo}\" in place of \"Against quotation\".",
      "(c) Under \"Bill to\": \"GSTIN {gstin}\" when the client has one (Onboarding Form section A).",
      "(d) A care plan invoice, term 5: \"Late payment carries interest at [[LATE_INTEREST_PERCENT]]% per month or part month, from the due date until payment (Maintenance and Support Agreement, Clause 11.6).\" Term 6: \"Where this invoice remains unpaid 15 days after its due date, the services may be suspended on 3 working days' written notice. During a suspension no data is deleted, no backup is removed, the site is not taken offline and no domain transfer is blocked (Maintenance and Support Agreement, Clauses 11.2 and 11.3).\" Term 7 is left out.",
      "(e) A code F credit note: \"Against proforma\" in place of \"Against invoice\".",
      "(f) The credit note's \"Refund reference\" row is left out: the refund is recorded on the timeline when it leaves the account.",
      "(g) \"The account below\" (proforma section 3 and terms, invoice term 2), where the bank details are above: \"the account in section 2\" / \"section 3\".",
      "(h) The line table's \"Description of services delivered\" reads \"Description of services\" on a quotation, a proforma and a care plan invoice (nothing is delivered yet), and \"Description\" on a credit note.",
      "(i) The proforma's banner names where its advance was agreed: \"the quotation\", \"the proposal\" or \"the change request\".",
      "(j) A split advance's part 2 and a change request's advance leave out the start-slot sentences (work has started) and say their own rule: \"Work on the change begins once this advance is received and the change request form is signed by both parties.\"",
      "(k) Invoice term 6, as SA cl. 5.7: \"If an invoice is more than 7 days overdue, work on the project may be paused, on written notice, until the account is cleared.\"",
      "(l) A care plan invoice (issued before its period): \"... and that the services described are to be provided to {legal name} for the period shown.\"",
      "(m) The receipt: \"credited to the firm's bank account\" (it names no account above), and it reduces \"the invoice or proforma it is issued against\".",
      "(n) The launch invoice: a change request's own advance reads \"Less: advance received {date} ({change request number})\", so it never reads as the project's advance.",
      "(o) No quotation issued and no number typed for what they accepted (a file opened from a Won lead): \"Against proposal: accepted on {the date of the yes}\".",
    ].join("\n"),
  },
];

/** A preview of a new composition with nothing filled in: the fixed sentences, and a [blank] for each fact. */
function sampleModel(kind: "welcome" | "closing", settings: ClientSettings): DocModel | null {
  try {
    const now = new Date();
    const today = indiaDate(now);
    const client: CrmClient = {
      id: "cl_preview", code: "", leadId: null, status: "active", createdAt: now.toISOString(), updatedAt: now.toISOString(),
      orgName: "[business name]", kind: "other", inIndia: true,
    };
    const project = { ...newProject({ clientId: client.id, name: "[project name]" }, now), code: "" } as CrmProject;
    const ctx: DocCtx = { client, project, docs: [], payments: [], settings, doc: null, today, currentFy: fyOf(today) };
    return BUILDERS[kind](ctx);
  } catch {
    return null;
  }
}

export default function ClientSettingsPage() {
  const clients = useClients();
  if (clients.status === "needs0014") return <Needs0014 />;
  if (clients.status !== "ready") {
    return <EmptyState title={clients.status === "error" ? "The client settings did not load." : "Loading the client settings..."} body={clients.error || undefined} />;
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="client-settings">
      <div>
        <Link to={CRM.settings} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Settings</Link>
        <PageHeader title="Client process" subtitle="The firm's details the documents print, the policy numbers decided once, the number series, and the wording to approve. Only you see this." />
      </div>
      <BillingSection />
      <PolicySection />
      <SwitchesSection />
      <SerialsSection />
      <WordingSection />
    </div>
  );
}

function Section({ title, children, testId, note }: { title: string; children: ReactNode; testId: string; note?: ReactNode }) {
  return (
    <section className={cn(crm.panel, crm.panelPad)} data-testid={testId} aria-label={title}>
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {note && <div className="mt-1 text-[12px] text-muted-foreground">{note}</div>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Saves one patch of Settings, re-reads, says Saved. */
function useSave() {
  const { act } = useClients();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async (patch: Partial<ClientSettings>) => {
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      await act((s) => s.saveSettings(patch));
      setSaved(true);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, err, saved, save, setSaved };
}

function SaveRow({ busy, saved, err, onSave, testId }: { busy: boolean; saved: boolean; err: string | null; onSave: () => void; testId: string }) {
  return (
    <>
      <Problem text={err} />
      <div className="mt-3 flex items-center justify-end gap-2">
        {saved && <span role="status" className="text-[12px] text-emerald-700 dark:text-emerald-400">Saved</span>}
        <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={busy} onClick={onSave} data-testid={testId}>Save</button>
      </div>
    </>
  );
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const clean = (v: string) => (v.trim() ? v.trim() : undefined);

function BillingSection() {
  const { data } = useClients();
  const b = data.settings.billing;
  const [v, setV] = useState(() => ({ ...b }));
  const s = useSave();
  useEffect(() => setV({ ...data.settings.billing }), [data.settings.billing]);
  const set = (k: keyof ClientSettings["billing"], x: unknown) => { s.setSaved(false); setV((o) => ({ ...o, [k]: x })); };
  const text = (k: keyof ClientSettings["billing"], label: string, hint?: ReactNode, wide?: boolean) => (
    <Field key={k} id={`cs-${k}`} label={label} hint={hint} className={wide ? "sm:col-span-2" : undefined}>
      <input id={`cs-${k}`} className={inputCls} value={str(v[k])} onChange={(e) => set(k, e.target.value)} data-testid={`cs-${k}`} />
    </Field>
  );
  return (
    <Section title="The firm's billing details" testId="cs-billing"
      note="Printed only where a document prints them: the proforma and the invoice print the bank details, never the receipt; the proforma has no signature block. The address line and the registration status are kept for the contracts and block no CRM document.">
      <div className="grid gap-3 sm:grid-cols-2">
        {text("signatory", "Who signs for the firm (authorised signatory)",
          <span data-testid="cs-signatory-note">FACTS keeps this blank until the deed names who may sign. Until you fill it, the quotation, receipt, invoice, change request form and handover document cannot be issued.</span>, true)}
        {text("firmPan", "The firm's PAN (never a personal PAN)")}
        {text("udyam", "Udyam registration number", <span data-testid="cs-udyam-note">As on the certificate. The quotation, proforma and invoice print it; it is kept here, not in the CRM's code, because FACTS says it goes on invoices and agreements, not on the website.</span>)}
        {text("bankName", "Bank name")}
        {text("accountName", "Account name (the firm's current account)")}
        {text("accountNo", "Account number")}
        {text("ifsc", "IFSC")}
        <div>
          {text("branch", "Branch")}
          <label className="mt-1 flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={Boolean(v.branchNotPrinted)} onChange={(e) => set("branchNotPrinted", e.target.checked || undefined)} /> Not printed</label>
        </div>
        <div>
          {text("upiId", "UPI ID")}
          <label className="mt-1 flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={Boolean(v.noUpi)} onChange={(e) => set("noUpi", e.target.checked || undefined)} /> No UPI</label>
        </div>
        {text("addressLine", "Full address line (for the contracts)", undefined, true)}
        {text("registrationStatus", "Partnership registration status (for the contracts)", undefined, true)}
      </div>
      <SaveRow {...s} testId="cs-billing-save" onSave={() => void s.save({
        billing: {
          signatory: clean(str(v.signatory)), firmPan: clean(str(v.firmPan)), udyam: clean(str(v.udyam)), bankName: clean(str(v.bankName)), accountName: clean(str(v.accountName)),
          accountNo: clean(str(v.accountNo)), ifsc: clean(str(v.ifsc)), branch: clean(str(v.branch)), branchNotPrinted: v.branchNotPrinted || undefined,
          upiId: clean(str(v.upiId)), noUpi: v.noUpi || undefined, addressLine: clean(str(v.addressLine)), registrationStatus: clean(str(v.registrationStatus)),
        },
      })} />
    </Section>
  );
}

type PolicyKey = keyof ClientSettings["policy"];
const POLICY: { k: PolicyKey; label: string; num?: boolean; hint: string }[] = [
  { k: "hourlyRate", label: "Hourly rate (Rs)", num: true, hint: `RATE-CARD and pricing.ts: Rs ${HOURLY_RATE.toLocaleString("en-IN")}. Mehdi to confirm (FACTS D10).` },
  { k: "restartFee", label: "Restart fee (Rs)", num: true, hint: "RATE-CARD: Rs 4,000 (SA cl. 4.5)." },
  { k: "assetDeadlineDays", label: "Asset deadline (days)", num: true, hint: "[[ASSET_DEADLINE_DAYS]]: not decided anywhere. The quotation needs it." },
  { k: "receiptDays", label: "Receipt within (days)", num: true, hint: "[[RECEIPT_DAYS]]: suggestion 1 (the SOPs issue it the same day). The proforma needs it." },
  { k: "refundDays", label: "Refund within (days)", num: true, hint: "[[REFUND_DAYS]]: not decided. The proforma, and a credit note settled by refund, need it." },
  { k: "disputeWindowDays", label: "Dispute window (days)", num: true, hint: "[[DISPUTE_WINDOW_DAYS]]: suggestion 7 (the generator's value). The invoice needs it." },
  { k: "removalDays", label: "Testimonial or logo removed within (days)", num: true, hint: "[[REMOVAL_DAYS]]: the consent lines need it." },
  { k: "killFeePercent", label: "Kill fee (%)", num: true, hint: "[[KILL_FEE_PERCENT]]: cancellations (section 12)." },
  { k: "lateInterestPercent", label: "Care plan late interest (% a month)", num: true, hint: "[[LATE_INTEREST_PERCENT]]: the AMC agreement's own rate (cl. 11.6). Only a care plan invoice needs it." },
  { k: "singlePartnerLimit", label: "Single-partner limit (Rs)", num: true, hint: "[[SINGLE_PARTNER_LIMIT]], deed cl. 10.17. Blank: the other partner approves every agreement." },
  { k: "projectReplyTarget", label: "Reply time on a live project", hint: "[[PROJECT_REPLY_TARGET]] (SOP-08 section 1), e.g. \"4 working hours\". Left out of the welcome pack until set." },
  { k: "workingHours", label: "Working days and hours", hint: "[[WORKING_HOURS]]: left out of documents until set." },
  { k: "p1", label: "Response time, P1 (site down)", hint: "[[P1_RESPONSE]]: the handover severity table leaves out its response column until P1 to P3 are set." },
  { k: "p2", label: "Response time, P2", hint: "[[P2_RESPONSE]]" },
  { k: "p3", label: "Response time, P3", hint: "[[P3_RESPONSE]]" },
  { k: "secretTool", label: "One-time secret tool", hint: "[[SECRET_TOOL]]: blank, the handover document says \"a one-time secret link\" without naming a tool." },
  { k: "passwordManager", label: "Password manager (internal, never printed)", hint: "[[PASSWORD_MANAGER]]: named on the stage 3 item only." },
  { k: "projectFolderRoot", label: "Project folder root (internal)", hint: "[[PROJECT_FOLDER_ROOT]]: named on the stage 3 folder item only." },
];

function PolicySection() {
  const { data } = useClients();
  const [v, setV] = useState(() => ({ ...data.settings.policy }));
  const s = useSave();
  useEffect(() => setV({ ...data.settings.policy }), [data.settings.policy]);
  return (
    <Section title="Policy numbers" testId="cs-policy"
      note={<>Decided by the signed agreement, not here: payment within 7 days (SA cl. 5.5), 1.5% a month on overdue amounts (cl. 5.6), work may pause more than 7 days overdue (cl. 5.7), 2 revision rounds at each design stage (cl. 6.1), 7 calendar days to review (cl. 3.2), 30 days of support (cl. 10.2). A blank below stays a [blank] in the documents that print it.</>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {POLICY.map((f) => (
          <Field key={f.k} id={`cp-${f.k}`} label={f.label} hint={f.hint}>
            <input id={`cp-${f.k}`} type={f.num ? "number" : "text"} min={f.num ? 0 : undefined} className={inputCls} data-testid={`cp-${f.k}`}
              value={v[f.k] === undefined || v[f.k] === null ? "" : String(v[f.k])}
              onChange={(e) => { s.setSaved(false); setV((o) => ({ ...o, [f.k]: f.num ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value })); }} />
          </Field>
        ))}
      </div>
      <SaveRow {...s} testId="cs-policy-save" onSave={() => {
        const patch: ClientSettings["policy"] = {};
        for (const f of POLICY) {
          const x = v[f.k];
          if (f.num) (patch as Record<string, unknown>)[f.k] = typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : undefined;
          else (patch as Record<string, unknown>)[f.k] = typeof x === "string" && x.trim() ? x.trim() : undefined;
        }
        void s.save({ policy: patch });
      }} />
    </Section>
  );
}

function SwitchesSection() {
  const { data } = useClients();
  const [deed, setDeed] = useState(data.settings.deedNamesSignatory);
  const [note, setNote] = useState(data.settings.printTemplateNote);
  const [link, setLink] = useState(data.settings.googleReviewLink);
  const s = useSave();
  useEffect(() => {
    setDeed(data.settings.deedNamesSignatory);
    setNote(data.settings.printTemplateNote);
    setLink(data.settings.googleReviewLink);
  }, [data.settings]);
  return (
    <Section title="The deed, the template note and the review link" testId="cs-switches">
      <div className="space-y-3 text-[13px]">
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={deed} onChange={(e) => { s.setSaved(false); setDeed(e.target.checked); }} data-testid="cs-deed" />
          <span>The deed names the authorised signatory<span className="block text-[12px] text-muted-foreground">Off: the other partner approves every agreement in writing (SOP-01 stage 7). On: only above the single-partner limit, and always for anything outside the standard terms (a discount, a split advance, the client's own NDA).</span></span>
        </label>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={note} onChange={(e) => { s.setSaved(false); setNote(e.target.checked); }} data-testid="cs-template-note" />
          <span>Print the template note on money documents<span className="block text-[12px] text-muted-foreground">"Template for Ideovent Technologies. Have a qualified advocate or chartered accountant review this before first use." Switch it off once a CA has reviewed them (FACTS hard rule 7).</span></span>
        </label>
        <Field id="cs-review" label="Google review link"><input id="cs-review" type="url" className={inputCls} value={link} onChange={(e) => { s.setSaved(false); setLink(e.target.value); }} data-testid="cs-review-link" /></Field>
      </div>
      <SaveRow {...s} testId="cs-switches-save" onSave={() => void s.save({ deedNamesSignatory: deed, printTemplateNote: note, googleReviewLink: link.trim() })} />
    </Section>
  );
}

function SerialsSection() {
  const { data, today } = useClients();
  const fy = fyOf(today);
  const used = (series: Series) => data.documents.some((d) => d.series === series && d.fy === fy && d.status !== "draft");
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(SERIES.map((x) => [x.id, String(data.settings.firstSerial[x.id]?.[fy] ?? "")])));
  const s = useSave();
  return (
    <Section title={`Number series, ${fy}`} testId="cs-serials"
      note={<>The CRM gives every quotation, proforma, invoice, receipt and credit note its number when you press Issue: consecutive, no gaps, never reused. Do not number these series anywhere else (invoice-generator.py included): two counters collide. If a number was already issued by hand this year, set the first serial before the first issue; after that the series counts on by itself.</>}>
      <div className="grid gap-3 sm:grid-cols-5">
        {SERIES.map((x) => (
          <Field key={x.id} id={`fs-${x.id}`} label={`${x.label} (${x.example})`} hint={used(x.id) ? "Issued this year: fixed" : "Blank: 001"}>
            <input id={`fs-${x.id}`} type="number" min={1} className={inputCls} value={v[x.id]} disabled={used(x.id)} data-testid={`fs-${x.id}`}
              onChange={(e) => { s.setSaved(false); setV((o) => ({ ...o, [x.id]: e.target.value })); }} />
          </Field>
        ))}
      </div>
      <SaveRow {...s} testId="cs-serials-save" onSave={() => {
        const patch: ClientSettings["firstSerial"] = {};
        for (const x of SERIES) {
          if (used(x.id)) continue;
          const n = Math.floor(Number(v[x.id]));
          const cur = { ...(data.settings.firstSerial[x.id] || {}) };
          if (v[x.id] === "" || !Number.isFinite(n) || n < 1) delete cur[fy];
          else cur[fy] = n;
          patch[x.id] = cur;
        }
        void s.save({ firstSerial: patch });
      }} />
    </Section>
  );
}

function WordingSection() {
  const { data, today } = useClients();
  const approved = data.settings.approvedWording;
  const edited = useMemo(() => CLIENT_TEMPLATES.filter((t) => t.textKind !== "S"), []);
  const waiting = edited.filter((t) => !approved[t.id]).length + DOC_WORDING.filter((d) => !approved[d.id]).length;
  return (
    <Section title="New wording to approve" testId="cs-wording"
      note={`Every message that is new (N) or edited from its source (E), and the documents' new lines. Each shows "New wording" in the CRM until you tick it here. ${waiting} waiting.`}>
      <ul className="space-y-2">
        {DOC_WORDING.map((d) => <WordingItem key={d.id} id={d.id} label={d.label} kind="Document" source={d.source} text={d.text} sample={d.sample} approvedOn={approved[d.id]} today={today} />)}
        {edited.map((t) => (
          <WordingItem key={t.id} id={t.id} label={t.label} kind={t.textKind === "N" ? "N, new" : `E, edited${t.edits?.length ? ` (${t.edits.join(", ")})` : ""}`} source={t.source}
            text={`${t.subject ? `Subject: ${t.subject}\n\n` : ""}${t.body}`} approvedOn={approved[t.id]} today={today} />
        ))}
      </ul>
    </Section>
  );
}

function WordingItem({ id, label, kind, source, text, sample, approvedOn, today }: { id: string; label: string; kind: string; source: string; text?: string; sample?: "welcome" | "closing"; approvedOn?: string; today: string }) {
  const clients = useOptionalClients();
  const { act } = useClients();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const model = sample && clients ? sampleModel(sample, clients.data.settings) : null;
  return (
    <li className="rounded-lg border border-border" data-testid="wording-item" data-id={id} data-approved={approvedOn ? "1" : "0"}>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2 text-[13px] [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words font-medium">{label}</span>
          <span className="rounded bg-muted px-1.5 text-[11px]">{kind}</span>
          {approvedOn ? <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Approved {fmtDate(approvedOn)}</span> : <span className="rounded bg-amber-500/15 px-1.5 text-[11px] text-amber-700 dark:text-amber-300">New wording</span>}
        </summary>
        <div className="space-y-2 border-t border-border px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{id} · Source: {source}</p>
          {text && <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-sans text-[12px]">{text}</pre>}
          {model && <DocPreview model={model} />}
          {sample && !model && <p className="text-[12px] text-muted-foreground">Open any project's Documents to see it with that project's facts.</p>}
        </div>
      </details>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5">
        <label className="flex min-h-9 items-center gap-2 text-[12px]">
          <input type="checkbox" checked={Boolean(approvedOn)} disabled={busy} data-testid="wording-approve" onChange={async (e) => {
            setBusy(true);
            setErr(null);
            try {
              await act((s) => s.saveSettings({ approvedWording: { [id]: e.target.checked ? today : "" } }));
            } catch (x) {
              setErr(errText(x));
            } finally {
              setBusy(false);
            }
          }} />
          Approved
        </label>
        {err && <span role="alert" className="text-[12px] text-destructive">{err}</span>}
      </div>
    </li>
  );
}
