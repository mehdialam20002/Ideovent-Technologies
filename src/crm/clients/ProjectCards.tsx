import { useEffect, useState } from "react";
import { advanceOf, CARE_PLANS, discountProblems, feeOf, inrGroup, packageChips, splitParts, walkAwayWarning } from "@/lib/clients/money";
import { fmtDate } from "@/lib/clients/numbering";
import type { CrmClient, CrmProject, ProjectLine, RenewalKey } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { areaCls, errText, Field, inputCls, Problem, Reasons, rs } from "./shared";

/**
 * The cards that fill a project's and a client's facts (client-process-spec 4, 10.3): the Brief, the
 * Price, the Client and Billing details, People, Dates, Staging, Kickoff, Training, Handover facts and
 * Renewals. One small form each, saved to the project or the client; a fact never typed stays a [blank]
 * in the messages and documents that need it.
 */

type Kind = "text" | "date" | "time" | "number" | "textarea" | "select" | "checkbox" | "url" | "email" | "tel";
export interface FieldDef {
  path: string;
  label: string;
  kind?: Kind;
  options?: { value: string; label: string }[];
  hint?: string;
  wide?: boolean;
  /** A select whose values are numbers (the weekly update day, 1 to 6). */
  numeric?: boolean;
}

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split(".");
  const cur = (obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {}) as Record<string, unknown>;
  if (!rest.length) {
    const next = { ...cur };
    if (value === "" || value === undefined || value === null) delete next[head];
    else next[head] = value;
    return next as T;
  }
  return { ...cur, [head]: setPath(cur[head], rest.join("."), value) } as T;
}

/** A form over some fields of the project or the client, saved in one write. */
export function FieldsForm({ target, id, fields, title, onDone, testId, line }: {
  target: "project" | "client";
  id: string;
  fields: FieldDef[];
  title?: string;
  onDone?: () => void;
  testId?: string;
  /** The timeline line the save writes. */
  line?: string;
}) {
  const { data, saveProject, saveClient } = useClients();
  const rec = target === "project" ? data.projects.find((p) => p.id === id) : data.clients.find((c) => c.id === id);
  const initial = () => Object.fromEntries(fields.map((f) => [f.path, getPath(rec, f.path)]));
  const [vals, setVals] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setVals(initial()), [rec?.updatedAt]);
  if (!rec) return null;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const apply = <T,>(r: T) => fields.reduce((acc, f) => setPath(acc, f.path, normalise(f, vals[f.path])), r);
      const ev = line ? { type: "note" as const, detail: line } : undefined;
      if (target === "project") await saveProject(id, (p) => apply(p), ev);
      else {
        const next = apply(rec as CrmClient);
        const patch: Partial<CrmClient> = {};
        for (const f of fields) {
          const top = f.path.split(".")[0] as keyof CrmClient;
          (patch as Record<string, unknown>)[top] = (next as unknown as Record<string, unknown>)[top];
        }
        await saveClient(id, patch, ev ? { ...ev, projectId: null } : undefined);
      }
      setSaved(true);
      onDone?.();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="space-y-3" data-testid={testId} onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {title && <p className="text-[13px] font-medium">{title}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const fid = `${testId || "f"}-${f.path.replace(/\./g, "-")}`;
          const v = vals[f.path];
          const set = (x: unknown) => { setSaved(false); setVals((s) => ({ ...s, [f.path]: x })); };
          if (f.kind === "checkbox") {
            return (
              <label key={f.path} className={cn("flex min-h-11 items-center gap-2 text-[13px] md:min-h-9", f.wide && "sm:col-span-2")}>
                <input id={fid} type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} /> {f.label}
              </label>
            );
          }
          return (
            <Field key={f.path} id={fid} label={f.label} hint={f.hint} className={cn((f.wide || f.kind === "textarea") && "sm:col-span-2")}>
              {f.kind === "textarea" ? (
                <textarea id={fid} rows={2} className={areaCls} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />
              ) : f.kind === "select" ? (
                <select id={fid} className={inputCls} value={String(v ?? "")} onChange={(e) => set(e.target.value)}>
                  <option value="">Not set</option>
                  {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input id={fid} type={f.kind || "text"} className={inputCls} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />
              )}
            </Field>
          );
        })}
      </div>
      <Problem text={err} />
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-[12px] text-emerald-700 dark:text-emerald-400" role="status">Saved</span>}
        <button type="submit" className={crm.btnPrimary} disabled={busy} data-testid={testId ? `${testId}-save` : undefined}>Save</button>
      </div>
    </form>
  );
}

function normalise(f: FieldDef, v: unknown): unknown {
  if (f.kind === "number" || f.numeric) return v === "" || v === undefined || v === null || !Number.isFinite(Number(v)) ? undefined : Number(v);
  if (f.kind === "checkbox") return Boolean(v) || undefined;
  if (typeof v === "string") return v.trim() === "" ? undefined : v;
  return v;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][n] }));

export const CARDS: Record<string, { title: string; target: "project" | "client"; fields: FieldDef[] }> = {
  brief: { title: "Brief, from the call", target: "project", fields: [
    { path: "brief.goals", label: "Goals", kind: "textarea" }, { path: "brief.audience", label: "Audience" }, { path: "brief.pages", label: "Pages" },
    { path: "brief.features", label: "Features" }, { path: "brief.contentReady", label: "Content readiness" }, { path: "brief.deadline", label: "Deadline" },
    { path: "brief.budgetBand", label: "Budget band said aloud" }, { path: "brief.decisionMaker", label: "Decision-maker" },
    { path: "brief.theirWords", label: "In their words (verbatim, one or two sentences)", kind: "textarea" }, { path: "dates.call", label: "Discovery call date", kind: "date" },
  ] },
  client: { title: "Legal name, and who signs", target: "client", fields: [
    { path: "legalName", label: "Legal name" }, { path: "legalSameAsTrading", label: "Same as the trading name", kind: "checkbox" },
    { path: "signatoryName", label: "Who signs for them" }, { path: "signatoryDesignation", label: "Their designation" },
    { path: "contactName", label: "Contact name" }, { path: "email", label: "E-mail", kind: "email" }, { path: "phone", label: "Phone", kind: "tel" }, { path: "whatsapp", label: "WhatsApp", kind: "tel" },
    { path: "language", label: "Language for messages", kind: "select", options: [{ value: "hinglish", label: "Hinglish" }, { value: "en", label: "English" }] },
  ] },
  billing: { title: "Billing details", target: "client", fields: [
    { path: "legalName", label: "Legal name" }, { path: "billingAddress", label: "Billing address with PIN", kind: "textarea" }, { path: "state", label: "State" },
    { path: "gstin", label: "GSTIN (if any)" }, { path: "pan", label: "PAN (if they deduct TDS)" }, { path: "deductsTds", label: "They deduct TDS", kind: "checkbox" },
    { path: "poNumber", label: "PO number (if any)" }, { path: "accounts.name", label: "Accounts contact" }, { path: "accounts.email", label: "Accounts e-mail", kind: "email" },
  ] },
  people: { title: "People and communication", target: "project", fields: [
    { path: "pointOfContact", label: "Point of contact who can approve" }, { path: "escalationContact", label: "Escalation contact" },
    { path: "commsChannel", label: "One channel" }, { path: "weeklyUpdateDay", label: "Weekly update day", kind: "select", options: WEEKDAYS, numeric: true },
  ] },
  dates: { title: "Dates", target: "project", fields: [
    { path: "dates.kickoff", label: "Kickoff", kind: "date" }, { path: "kickoffTime", label: "Kickoff time", kind: "time" },
    { path: "dates.devStart", label: "Development start", kind: "date" }, { path: "dates.contentCutoff", label: "Content cut-off", kind: "date" },
    { path: "dates.goLiveTarget", label: "Go-live target", kind: "date", hint: "A change after kickoff goes in the go-live history (Change the go-live date)." },
    { path: "dates.buildStart", label: "Build started", kind: "date" }, { path: "dates.finalDelivery", label: "Final delivery (if earlier than go-live)", kind: "date" },
    { path: "goLiveTime", label: "Go-live time", kind: "time" },
  ] },
  staging: { title: "Staging", target: "project", fields: [{ path: "stagingUrl", label: "Staging link (noindex, password-protected)", kind: "url", wide: true }] },
  kickoff: { title: "Kickoff call", target: "project", fields: [{ path: "dates.kickoff", label: "Kickoff date", kind: "date" }, { path: "kickoffTime", label: "Time", kind: "time" }] },
  training: { title: "Training", target: "project", fields: [
    { path: "training.at", label: "Held on", kind: "date" }, { path: "training.minutes", label: "Minutes", kind: "number" }, { path: "training.attendees", label: "Attendees" },
    { path: "training.recordingUrl", label: "Recording link", kind: "url" }, { path: "training.guideSent", label: "One-page guide sent", kind: "checkbox" },
  ] },
  live: { title: "What is live, and where", target: "project", fields: [
    { path: "liveUrl", label: "Live website", kind: "url" }, { path: "domainName", label: "Domain" },
    { path: "domainInClientName", label: "Domain in the client's name", kind: "select", options: [
      { value: "from_start", label: "Yes, from the start" }, { value: "moved_to_them", label: "Yes, moved to them during the project" }, { value: "no", label: "No" }, { value: "unknown", label: "Not checked" },
    ] },
    { path: "adminUrl", label: "Admin panel", kind: "url" }, { path: "repo", label: "Source code repository" }, { path: "handover.redirects", label: "Redirects in place from" },
    { path: "handover.gateway", label: "Payment gateway dashboard" }, { path: "handover.analytics", label: "Analytics" }, { path: "handover.searchConsole", label: "Search Console" },
    { path: "handover.gbp", label: "Google Business Profile" }, { path: "handover.dns", label: "Nameservers / DNS managed at" }, { path: "handover.stack", label: "Built with" },
    { path: "handover.thirdParty", label: "Third-party services in use" }, { path: "handover.backupTaken", label: "Backup taken at handover" },
    { path: "handover.backupLocation", label: "Where that backup is stored" }, { path: "handover.restoreTested", label: "Restore ever tested?" },
  ] },
};

/** The renewal record on the client (domain, hosting, SSL, e-mail) and the hosting custody. */
export function RenewalsForm({ clientId }: { clientId: string }) {
  const keys: [RenewalKey, string][] = [["domain", "Domain"], ["hosting", "Hosting"], ["ssl", "SSL"], ["email", "Business e-mail"]];
  const fields: FieldDef[] = [
    { path: "custodyModel", label: "Hosting account held by", kind: "select", options: [{ value: "client_held", label: "The client (their own account)" }, { value: "ideovent_managed", label: "Ideovent (our provider account)" }], wide: true },
    ...keys.flatMap(([k, label]) => [
      { path: `renewals.${k}.provider`, label: `${label}: provider` }, { path: `renewals.${k}.renewsOn`, label: `${label}: renews on`, kind: "date" as const },
      { path: `renewals.${k}.inWhoseName`, label: `${label}: in whose name` }, { path: `renewals.${k}.cost`, label: `${label}: approx. cost` },
    ]),
  ];
  return <FieldsForm target="client" id={clientId} fields={fields} testId="renewals-form" line="Renewal record updated" />;
}

/** The Price card (4.1): package chips from pricing.ts, the scope lines, weeks, a discount and the split advance, each under its rules. */
export function PriceCard({ project }: { project: CrmProject }) {
  const { saveProject, data } = useClients();
  const [lines, setLines] = useState<ProjectLine[]>(project.lines?.length ? project.lines : []);
  const [weeks, setWeeks] = useState(project.durationWeeks ? String(project.durationWeeks) : "");
  const [label, setLabel] = useState(project.packageLabel || "");
  const [disc, setDisc] = useState(project.discount || null);
  const [split, setSplit] = useState(project.splitAdvance || null);
  const [proposalNo, setProposalNo] = useState(project.proposalNo || "");
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setLines(project.lines?.length ? project.lines : []);
    setWeeks(project.durationWeeks ? String(project.durationWeeks) : "");
    setLabel(project.packageLabel || "");
    setDisc(project.discount || null);
    setSplit(project.splitAdvance || null);
    setProposalNo(project.proposalNo || "");
  }, [project.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const draft: CrmProject = { ...project, lines, durationWeeks: Number(weeks) || undefined, packageLabel: label || undefined, discount: disc || undefined, splitAdvance: split || undefined };
  const fee = feeOf(draft);
  const dProblems = disc ? discountProblems(draft, disc) : [];
  const walk = walkAwayWarning(project.kind, fee);
  const sp = splitParts(draft);
  const chips = packageChips(project.kind);
  const save = async () => {
    setErr(null);
    if (dProblems.length) return setErr(dProblems.join(" "));
    if (split && disc) return setErr("One concession, never two: a discount or the split advance, not both.");
    if (split && (!split.partnerApprovedAt || !split.channel || !split.part2DueOn)) return setErr("The split advance needs the other partner's written yes (date and channel) and the date part 2 is due.");
    try {
      await saveProject(project.id, (p) => ({ ...p, lines, durationWeeks: Number(weeks) || undefined, packageLabel: label || undefined, discount: disc || undefined, splitAdvance: split || undefined, proposalNo: proposalNo.trim() || undefined, fee: feeOf({ lines, discount: disc || undefined, fee: p.fee }) }),
        { type: "note", detail: `Price: ${rs(feeOf({ lines, discount: disc || undefined, fee: null }))}${weeks ? `, ${weeks} weeks` : ""}${disc ? `, discount ${rs(disc.amount)}` : ""}${split ? ", split advance" : ""}` });
      setSaved(true);
    } catch (e) {
      setErr(errText(e));
    }
  };
  const setLine = (i: number, patch: Partial<ProjectLine>) => { setSaved(false); setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l))); };
  return (
    <div className="space-y-3" data-testid="price-card">
      <div>
        <p className="text-[12px] text-muted-foreground">Packages (pricing.ts). A chip fills the fee and the weeks; the scope line is yours to write.</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button key={c.label} type="button" className={cn(crm.btn, "h-8 text-[12px]")} data-testid="package-chip"
              onClick={() => {
                setSaved(false);
                setLabel(c.label);
                setWeeks(String(parseInt(c.weeks, 10) || ""));
                setLines((ls) => (ls.length ? ls.map((l, i) => (i === 0 ? { ...l, qty: 1, rate: c.fee } : l)) : [{ description: "[what is included, from the SOW]", qty: 1, unit: "project", rate: c.fee }]));
              }}>
              {c.label}: Rs {inrGroup(c.fee)}{c.toConfirm ? " (Mehdi to confirm, D1)" : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_70px_90px_110px_auto]">
            <input aria-label={`Scope line ${i + 1}`} className={inputCls} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} data-testid="scope-line" />
            <input aria-label="Quantity" type="number" min={1} className={inputCls} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} />
            <input aria-label="Unit" className={inputCls} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
            <input aria-label="Rate (Rs)" type="number" min={0} className={inputCls} value={l.rate} onChange={(e) => setLine(i, { rate: Math.round(Number(e.target.value) || 0) })} data-testid="scope-rate" />
            <button type="button" className={crm.btnGhost} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className={crm.btn} onClick={() => setLines((ls) => [...ls, { description: "", qty: 1, unit: "item", rate: 0 }])}>Add a scope line</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="price-weeks" label="Weeks of working time"><input id="price-weeks" type="number" min={1} className={inputCls} value={weeks} onChange={(e) => { setSaved(false); setWeeks(e.target.value); }} data-testid="price-weeks" /></Field>
        <Field id="price-label" label="Package"><input id="price-label" className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <Field id="price-proposal" label="Proposal or quotation number they accepted (one not made here)" className="sm:col-span-2"
          hint={'The advance proforma reads "Against proposal" with it when no quotation was issued in the CRM (an IDV/Q number reads "Against quotation").'}>
          <input id="price-proposal" className={inputCls} value={proposalNo} onChange={(e) => { setSaved(false); setProposalNo(e.target.value); }} data-testid="price-proposal" />
        </Field>
      </div>
      <p className="text-[13px]" data-testid="price-fee">Fee {rs(fee)}: advance {rs(fee !== null ? advanceOf(fee) : null)} (50%), at launch {rs(fee !== null ? fee - advanceOf(fee) : null)} (50%).</p>
      {walk && <Reasons items={[walk]} />}
      <details className="rounded-lg border border-border p-3 text-[13px]">
        <summary className="cursor-pointer font-medium">If they ask for a lower price</summary>
        <p className="mt-2 text-muted-foreground">Reduce scope. Never reduce the rate (NEGOTIATION-RULES section 1). A discount only for a named case study or a second project in the same agreement, one concession, at most 5%, never on an Essential tier or a care plan, and always the other partner's written yes.</p>
        {!disc ? (
          <button type="button" className={cn(crm.btn, "mt-2")} onClick={() => setDisc({ amount: 0, reason: "case_study", partnerApprovedAt: "", channel: "" })}>Add a discount</button>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Field id="disc-amt" label="Discount (Rs)"><input id="disc-amt" type="number" className={inputCls} value={disc.amount} onChange={(e) => setDisc({ ...disc, amount: Math.round(Number(e.target.value) || 0) })} /></Field>
            <Field id="disc-why" label="The trade">
              <select id="disc-why" className={inputCls} value={disc.reason} onChange={(e) => setDisc({ ...disc, reason: e.target.value as "case_study" | "second_project" })}>
                <option value="case_study">A named case study (written permission first)</option><option value="second_project">A second project in the same agreement</option>
              </select>
            </Field>
            <Field id="disc-at" label="The other partner's yes: date"><input id="disc-at" type="date" className={inputCls} value={disc.partnerApprovedAt} onChange={(e) => setDisc({ ...disc, partnerApprovedAt: e.target.value })} /></Field>
            <Field id="disc-ch" label="and channel"><input id="disc-ch" className={inputCls} value={disc.channel} onChange={(e) => setDisc({ ...disc, channel: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Reasons items={dProblems} tone="block" /></div>
            <button type="button" className={crm.btnGhost} onClick={() => setDisc(null)}>Remove the discount</button>
          </div>
        )}
        {!split ? (
          <button type="button" className={cn(crm.btn, "mt-2")} onClick={() => setSplit({ partnerApprovedAt: "", channel: "", part1: 0, part2: 0, part2DueOn: "" })}>Split the 50% advance into two payments</button>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <p className="sm:col-span-2 text-muted-foreground">The one free concession: same total, the advance in two parts (NEGOTIATION-RULES section 2). Part 1 {rs(sp?.part1 ?? null)}, part 2 {rs(sp?.part2 ?? null)}.</p>
            <Field id="split-p1" label="Part 1 (Rs), blank for half"><input id="split-p1" type="number" className={inputCls} value={split.part1 || ""} onChange={(e) => setSplit({ ...split, part1: Math.round(Number(e.target.value) || 0) })} /></Field>
            <Field id="split-due" label="Part 2 due on"><input id="split-due" type="date" className={inputCls} value={split.part2DueOn} onChange={(e) => setSplit({ ...split, part2DueOn: e.target.value })} /></Field>
            <Field id="split-at" label="The other partner's yes: date"><input id="split-at" type="date" className={inputCls} value={split.partnerApprovedAt} onChange={(e) => setSplit({ ...split, partnerApprovedAt: e.target.value })} /></Field>
            <Field id="split-ch" label="and channel"><input id="split-ch" className={inputCls} value={split.channel} onChange={(e) => setSplit({ ...split, channel: e.target.value })} /></Field>
            <button type="button" className={crm.btnGhost} onClick={() => setSplit(null)}>No split</button>
          </div>
        )}
      </details>
      <Problem text={err} />
      <div className="flex items-center justify-end gap-2">
        {saved && <span role="status" className="text-[12px] text-emerald-700 dark:text-emerald-400">Saved</span>}
        <button type="button" className={crm.btnPrimary} onClick={() => void save()} data-testid="price-save">Save the price</button>
      </div>
      {data.settings && <p className="text-[11px] text-muted-foreground">GST not applicable. Supplier is not registered under GST.</p>}
    </div>
  );
}

/** The Four numbers card (SOP-01 stage 7.3), to compare with the SOW and the agreement. */
export function FourNumbers({ project }: { project: CrmProject }) {
  const fee = feeOf(project);
  return (
    <ul className="space-y-1 text-[13px]" data-testid="four-numbers">
      <li>Total fee {rs(fee)}, advance {rs(fee !== null ? advanceOf(fee) : null)} (50%), balance at launch {rs(fee !== null ? fee - advanceOf(fee) : null)} (50%).</li>
      <li>2 revision rounds per design stage (cl. 6.1).</li>
      <li>30-day warranty from go-live (cl. 10.2).</li>
      <li>Review window 7 days (cl. 3.2, or the SOW section 11 window).</li>
    </ul>
  );
}

/** "Change the go-live date": asks why and who caused it, and writes the go-live history (4.7). */
export function GoLiveChange({ project, onDone }: { project: CrmProject; onDone?: (cause: "client" | "ideovent" | "change_request", to: string) => void }) {
  const { saveProject } = useClients();
  const [to, setTo] = useState("");
  const [cause, setCause] = useState<"client" | "ideovent" | "change_request">("client");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    if (!to || !reason.trim()) return setErr("The new date and why.");
    try {
      await saveProject(project.id, (p) => ({
        ...p,
        dates: { ...p.dates, goLiveTarget: to },
        goLiveHistory: [...(p.goLiveHistory || []), { from: p.dates.goLiveTarget, to, at: new Date().toISOString(), cause, reason: reason.trim() }],
      }), { type: "note", detail: `Go-live moved ${project.dates.goLiveTarget ? `from ${fmtDate(project.dates.goLiveTarget)} ` : ""}to ${fmtDate(to)} (${cause === "client" ? "client delay" : cause === "ideovent" ? "our own slip" : "change request"}): ${reason.trim()}` });
      onDone?.(cause, to);
      setTo("");
      setReason("");
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="grid gap-2 sm:grid-cols-3" data-testid="golive-change">
      <Field id="gl-to" label="New go-live date"><input id="gl-to" type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      <Field id="gl-cause" label="Caused by">
        <select id="gl-cause" className={inputCls} value={cause} onChange={(e) => setCause(e.target.value as typeof cause)}>
          <option value="client">The client (content or approval late)</option><option value="ideovent">Ideovent (our own slip)</option><option value="change_request">An approved change request</option>
        </select>
      </Field>
      <Field id="gl-why" label="Why"><input id="gl-why" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="sm:col-span-3"><Problem text={err} /></div>
      <div className="sm:col-span-3 flex justify-end"><button type="button" className={crm.btn} onClick={() => void save()}>Record the new date</button></div>
      {(project.goLiveHistory || []).length > 0 && (
        <ul className="sm:col-span-3 space-y-0.5 text-[12px] text-muted-foreground">
          {project.goLiveHistory.map((h, i) => <li key={i}>{h.from ? `${fmtDate(h.from)} to ` : ""}{fmtDate(h.to)}: {h.reason} ({h.cause})</li>)}
        </ul>
      )}
    </div>
  );
}

/** The care plan on the client (4.12): plan, billing, fee from pricing.ts, dates. */
export function CarePlanForm({ client }: { client: CrmClient }) {
  const { saveClient } = useClients();
  const cur = client.carePlan;
  const [plan, setPlan] = useState(cur?.plan || "growth");
  const [billing, setBilling] = useState<"monthly" | "annual">(cur?.billing || "monthly");
  const [startOn, setStartOn] = useState(cur?.startOn || "");
  const [renewalOn, setRenewalOn] = useState(cur?.renewalOn || "");
  const [status, setStatus] = useState(cur?.status || "proposed");
  const [err, setErr] = useState<string | null>(null);
  const fee = billing === "annual" ? CARE_PLANS[plan].yearly : CARE_PLANS[plan].monthly;
  const save = async () => {
    try {
      await saveClient(client.id, { carePlan: { plan, billing, fee, startOn: startOn || undefined, renewalOn: renewalOn || undefined, status } }, { type: "note", projectId: null, detail: `Care plan: ${CARE_PLANS[plan].name}, ${billing}, ${rs(fee)}, ${status}` });
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2" data-testid="care-plan-form">
      <Field id="cp-plan" label="Plan">
        <select id="cp-plan" className={inputCls} value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)}>
          {(["essential", "growth", "priority"] as const).map((k) => <option key={k} value={k}>{CARE_PLANS[k].name}: Rs {inrGroup(CARE_PLANS[k].monthly)} a month or Rs {inrGroup(CARE_PLANS[k].yearly)} a year</option>)}
        </select>
      </Field>
      <Field id="cp-billing" label="Billing">
        <select id="cp-billing" className={inputCls} value={billing} onChange={(e) => setBilling(e.target.value as typeof billing)}><option value="monthly">Monthly</option><option value="annual">A year, paid in advance</option></select>
      </Field>
      <Field id="cp-start" label="Starts on"><input id="cp-start" type="date" className={inputCls} value={startOn} onChange={(e) => setStartOn(e.target.value)} /></Field>
      <Field id="cp-renew" label="Renews on"><input id="cp-renew" type="date" className={inputCls} value={renewalOn} onChange={(e) => setRenewalOn(e.target.value)} /></Field>
      <Field id="cp-status" label="Status">
        <select id="cp-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="proposed">Proposed</option><option value="active">Active (paid)</option><option value="lapsed">Lapsed</option><option value="ended">Ended</option></select>
      </Field>
      <p className="self-end text-[13px]">Fee {rs(fee)} {billing === "annual" ? "a year" : "a month"}. Never discounted.</p>
      <div className="sm:col-span-2"><Problem text={err} /></div>
      <div className="sm:col-span-2 flex justify-end"><button type="button" className={crm.btnPrimary} onClick={() => void save()}>Save the care plan</button></div>
    </div>
  );
}
