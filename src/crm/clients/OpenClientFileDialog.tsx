import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { inrGroup, packageChips, walkAwayWarning } from "@/lib/clients/money";
import { fmtDate, indiaDate } from "@/lib/clients/numbering";
import { openPlan } from "@/lib/clients/stages";
import { PROJECT_KINDS, type ProjectKind } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { errText, Field, inputCls, Problem, Reasons } from "./shared";

const KIND_LABEL: Record<ProjectKind, string> = { landing: "Landing page", website: "Website", portal: "Portal", software: "Custom software", other: "Other" };
const SCOPE_BLANK = "[what is included, from the SOW]";

/**
 * OPEN CLIENT FILE (client-process-spec 4.13, 10.4, decision 16). First the two questions: one-time
 * project or monthly plan, and client in India. A monthly plan gets no project file in this pass (its
 * terms differ at every money step): Add the client instead. Then the client's facts from the lead, the
 * project's name and kind, a package chip, the fee, the weeks and the discovery call date. From a Won
 * lead the file opens at stage 2 with stage 1 "Done before the client file", and the fee, the scope line
 * and the weeks are needed now because every document after them uses them. The button disables itself
 * while the file is being made; a second press, or another tab, finds the same client (one per lead).
 */
export function OpenClientFileDialog({ lead, onClose }: { lead: OutreachLead; onClose: () => void }) {
  const navigate = useNavigate();
  const { act, data } = useClients();
  const { events } = useCrmData();
  const existing = data.clients.find((c) => c.leadId === lead.id) || null;
  const lastCall = useMemo(() => {
    const calls = events.filter((e) => e.leadId === lead.id && e.type === "call").sort((a, b) => b.at.localeCompare(a.at));
    return calls[0] ? indiaDate(calls[0].at) : "";
  }, [events, lead.id]);
  /* When the lead was marked Won (its status line), for a file opened after the yes. */
  const wonOn = useMemo(() => {
    const line = events.filter((e) => e.leadId === lead.id && e.type === "status" && /to Won$/.test(e.detail || "")).sort((a, b) => b.at.localeCompare(a.at))[0];
    return line ? indiaDate(line.at) : indiaDate();
  }, [events, lead.id]);
  const [monthly, setMonthly] = useState<"" | "one_time" | "monthly">("");
  const [india, setIndia] = useState<"" | "yes" | "no">("");
  const [name, setName] = useState(`${lead.instituteName} website`);
  const [kind, setKind] = useState<ProjectKind>("website");
  const [label, setLabel] = useState("");
  const [fee, setFee] = useState("");
  const [weeks, setWeeks] = useState("");
  const [scope, setScope] = useState(SCOPE_BLANK);
  const [call, setCall] = useState(lastCall);
  /* From a Won lead, stage 1 is done before the file: the number of what they accepted, for the proforma's "Against" row. */
  const [accepted, setAccepted] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const won = lead.status === "won";
  const plan = monthly ? openPlan({ monthlyPlan: monthly === "monthly", inIndia: india !== "no", leadStatus: lead.status }) : null;
  const feeN = Math.round(Number(fee) || 0);
  const weeksN = Math.round(Number(weeks) || 0);
  const walk = feeN ? walkAwayWarning(kind, feeN) : null;

  const missing: string[] = [];
  if (!monthly) missing.push("One-time project or monthly plan?");
  if (!india) missing.push("Client in India?");
  if (plan?.project) {
    if (!name.trim()) missing.push("The project's name.");
    if (won && feeN <= 0) missing.push("The agreed fee (the lead is Won: every document from here uses it).");
    if (won && weeksN <= 0) missing.push("The weeks of working time.");
    if (won && (!scope.trim() || scope.trim() === SCOPE_BLANK)) missing.push("One line of scope, as agreed.");
  }

  const lp = {
    instituteName: lead.instituteName, kind: lead.kind, contactName: lead.contactName, phone: lead.phone, whatsapp: lead.whatsapp,
    email: lead.email, city: lead.city, website: lead.website, language: lead.language, status: lead.status, metaConsent: lead.metaConsent,
  };

  const openFile = async () => {
    if (missing.length || !plan?.project) return;
    setBusy(true);
    setErr(null);
    try {
      const { project } = await act((s) => s.openFromLead({
        leadId: lead.id,
        lead: lp,
        inIndia: india === "yes",
        project: {
          name: name.trim(),
          kind,
          stage: plan.stage,
          openedAtWon: plan.openedAtWon || undefined,
          packageLabel: label || undefined,
          durationWeeks: weeksN || undefined,
          fee: feeN || null,
          lines: feeN ? [{ description: scope.trim() || SCOPE_BLANK, qty: 1, unit: "project", rate: feeN }] : [],
          ...(won && accepted.trim() ? { proposalNo: accepted.trim() } : {}),
          dates: { ...(call ? { call } : {}), ...(won ? { yes: wonOn } : {}) },
        },
      }));
      await act((s) => s.addEvent({
        clientId: project.clientId, projectId: project.id, type: "stage",
        detail: `Client file opened from the lead at ${lead.status}${plan.openedAtWon ? ": stage 1 done before the client file, now stage 2, Agreement and advance" : ": stage 1, Proposal and quotation"}${india === "no" ? ". Client outside India: no money documents in the CRM" : ""}`,
        data: { from: lead.status, stage: plan.stage },
      }));
      onClose();
      navigate(CRM.client(project.id));
    } catch (e) {
      setErr(errText(e));
      setBusy(false);
    }
  };

  const addClient = async () => {
    setBusy(true);
    setErr(null);
    try {
      const cl = existing || await act((s) => s.createClient({
        orgName: lead.instituteName, kind: lead.kind, leadId: lead.id, contactName: lead.contactName, phone: lead.phone, whatsapp: lead.whatsapp,
        email: lead.email, city: lead.city, website: lead.website, language: lead.language === "en" ? "en" : "hinglish", inIndia: india !== "no",
        monthlyPlan: true, dnc: lead.status === "do_not_contact" || undefined, metaConsent: lead.metaConsent, portfolioOptOut: null,
      }));
      if (!existing) await act((s) => s.addEvent({ clientId: cl.id, projectId: null, type: "note", detail: "Client added from the lead: a monthly plan, no project file in this pass (contacts, renewals and notes only)" }));
      onClose();
      navigate(CRM.client(cl.id));
    } catch (e) {
      setErr(errText(e));
      setBusy(false);
    }
  };

  const radio = (group: string, value: string, cur: string, set: (v: string) => void, text: string) => (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] md:min-h-9", cur === value ? "border-primary bg-primary/5" : "border-border")}>
      <input type="radio" name={group} value={value} checked={cur === value} onChange={() => set(value)} data-testid={`open-${group}-${value}`} />
      {text}
    </label>
  );

  return (
    <section className={cn(crm.panel, "p-4")} data-testid="open-client-file" aria-label="Open client file">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold">Open client file: {lead.instituteName}</p>
          <p className="text-[12px] text-muted-foreground">
            {won ? "The lead is Won: the file opens at stage 2, Agreement and advance, with stage 1 done before the client file." : "The file opens at stage 1, Proposal and quotation."}
            {existing ? ` This lead already has a client (${existing.code}): this adds a project to it.` : ""}
          </p>
        </div>
        <button type="button" className={crm.btnGhost} onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>

      <fieldset className="mt-3 space-y-2">
        <legend className="text-[12px] font-medium text-muted-foreground">One-time project or monthly plan?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {radio("engagement", "one_time", monthly, (v) => setMonthly(v as "one_time"), "One-time project (50% to start, 50% at launch)")}
          {radio("engagement", "monthly", monthly, (v) => setMonthly(v as "monthly"), "Monthly website plan")}
        </div>
      </fieldset>
      <fieldset className="mt-3 space-y-2">
        <legend className="text-[12px] font-medium text-muted-foreground">Client in India?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {radio("india", "yes", india, (v) => setIndia(v as "yes"), "Yes, in India")}
          {radio("india", "no", india, (v) => setIndia(v as "no"), "No, outside India")}
        </div>
      </fieldset>

      {plan?.note && <div className="mt-3"><Reasons items={[plan.note]} testId="open-note" /></div>}

      {plan && !plan.project && (
        <div className="mt-3 space-y-2">
          <button type="button" className={crm.btnPrimary} onClick={() => void addClient()} disabled={busy || !india} data-testid="open-add-client">
            {existing ? "Open the client" : "Add the client (no project file)"}
          </button>
        </div>
      )}

      {plan?.project && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="open-name" label="Project name"><input id="open-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} data-testid="open-name" /></Field>
            <Field id="open-kind" label="Kind of work">
              <select id="open-kind" className={inputCls} value={kind} onChange={(e) => { setKind(e.target.value as ProjectKind); setLabel(""); }} data-testid="open-kind">
                {PROJECT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </Field>
          </div>
          {kind !== "other" && (
            <div>
              <p className="text-[12px] text-muted-foreground">A package (the live prices) fills the fee and the weeks. The scope line is yours to write.</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {packageChips(kind).map((c) => (
                  <button key={c.label} type="button" className={cn(crm.btn, "h-8 text-[12px] max-md:h-10", label === c.label && "border-primary text-primary")} data-testid="open-chip"
                    onClick={() => { setLabel(c.label); setFee(String(c.fee)); setWeeks(String(parseInt(c.weeks.replace(/^from\s*/, ""), 10) || "")); }}>
                    {c.label}: Rs {inrGroup(c.fee)}{c.toConfirm ? " (Mehdi to confirm, D1)" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="open-fee" label={won ? "Agreed fee (Rs)" : "Fee (Rs), if known"}><input id="open-fee" type="number" min={0} className={inputCls} value={fee} onChange={(e) => setFee(e.target.value)} data-testid="open-fee" /></Field>
            <Field id="open-weeks" label={won ? "Weeks of working time" : "Weeks, if known"}><input id="open-weeks" type="number" min={1} className={inputCls} value={weeks} onChange={(e) => setWeeks(e.target.value)} data-testid="open-weeks" /></Field>
            <Field id="open-call" label="Discovery call date"><input id="open-call" type="date" className={inputCls} value={call} max={indiaDate()} onChange={(e) => setCall(e.target.value)} data-testid="open-call" /></Field>
          </div>
          <Field id="open-scope" label="Scope line (as agreed; the SOW says the rest)"><input id="open-scope" className={inputCls} value={scope} onChange={(e) => setScope(e.target.value)} data-testid="open-scope" /></Field>
          {won && (
            <Field id="open-accepted" label="The proposal or quotation number they accepted, if one was sent"
              hint={`The advance proforma prints it as "Against proposal" (an IDV/Q number as "Against quotation"). Left empty, it reads "Against proposal: accepted on ${fmtDate(wonOn)}", the day the lead was marked Won.`}>
              <input id="open-accepted" className={inputCls} value={accepted} onChange={(e) => setAccepted(e.target.value)} data-testid="open-accepted" />
            </Field>
          )}
          {walk && <Reasons items={[walk]} />}
          {feeN > 0 && <p className="text-[13px]">Advance Rs {inrGroup(Math.round(feeN / 2))} (50%), at launch Rs {inrGroup(feeN - Math.round(feeN / 2))} (50%). GST not applicable. Supplier is not registered under GST.</p>}
        </div>
      )}

      {missing.length > 0 && plan?.project && <div className="mt-3"><Reasons items={missing} tone="block" testId="open-missing" /></div>}
      <Problem text={err} />
      {plan?.project && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className={crm.btn} onClick={onClose}>Cancel</button>
          <button type="button" className={crm.btnPrimary} onClick={() => void openFile()} disabled={busy || missing.length > 0} data-testid="open-submit">
            {busy ? "Opening..." : "Open client file"}
          </button>
        </div>
      )}
    </section>
  );
}
