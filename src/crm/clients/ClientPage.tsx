import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LEAD_STATUS_LABELS, type OutreachLead } from "@/lib/outreach/types";
import { contractValueOf, counts, docBalance, overdueDocs, receivedTotal } from "@/lib/clients/money";
import { daysBetween, fmtDate } from "@/lib/clients/numbering";
import { closeProject, missingForMove, pathOf, putOnHold, saidNo, saidYes, stageIndex, STAGE_BY_ID, supportWindow, tickItem, type ProjectCtx } from "@/lib/clients/stages";
import { clientTasks, HEALTH_LABEL, healthOf, projectTasks, type ClientTask } from "@/lib/clients/tasks";
import { careScript, kickoffScript } from "@/lib/clients/scripts";
import type { MessageAbout } from "@/lib/clients/compose";
import type { CrmClient, CrmProject, Hold, StageId } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm, EmptyState } from "../ui";
import { useClients } from "./useClients";
import { JourneyStrip } from "./JourneyStrip";
import { StageCard } from "./StageCard";
import { ClientCompose } from "./ClientCompose";
import { DocumentDialog, type DocRequest } from "./DocumentDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { MoneyCard } from "./MoneyCard";
import { Timeline } from "./Timeline";
import { DocumentsPanel, docStatus } from "./DocumentsPanel";
import { ContentTracker } from "./ContentTracker";
import { RoundsPanel } from "./RoundsPanel";
import { ChangeRequests } from "./ChangeRequests";
import { IssueLog } from "./IssueLog";
import { CredentialsRecord, DeliverablesPanel } from "./CredentialsRecord";
import { ConsentPanel } from "./ConsentPanel";
import { ApprovalDialog } from "./ApprovalDialog";
import { CARDS, CarePlanForm, FieldsForm, FourNumbers, GoLiveChange, PriceCard, RenewalsForm } from "./ProjectCards";
import { TaskRow } from "./TaskRow";
import { day, errText, Fold, HealthDot, inputCls, Needs0014, Problem, ReasonPrompt, rs } from "./shared";
import type { ItemHandlers } from "./ChecklistItem";

export type Sheet =
  | { type: "message"; ids: string[]; about?: MessageAbout }
  | { type: "doc"; req: DocRequest }
  | { type: "payment"; docId?: string }
  | { type: "panel"; name: string }
  | { type: "approval"; what: string; notice: string }
  | { type: "hold"; hold: Hold };

const HOLD_LABEL: Record<Hold, string> = { client_delay: "Client delay", non_payment: "Non-payment", no_advance: "No advance (slot released)" };

/**
 * THE CLIENT PAGE (client-process-spec 10.3): the header with the stage, the health and three figures;
 * the journey strip; the current stage's card with its checklist, messages and documents; the money,
 * the dates, the client card and the timeline beside it; the folded panels from the stage where each
 * starts. Whatever an item opens (a message, a document, a payment, a form) opens at the top.
 *
 * /clients/pr_... is a project's page. /clients/cl_... is a client without a project of its own on
 * show (Add client, 4.13): its card, its care plan and renewals, its own documents and payments, its
 * client-level tasks and timeline, and links to its projects.
 *
 * Every piece below is a module-level component: the CRM's clock re-renders the page every minute, and a
 * component defined inside another would be a new type each time, throwing away what was being typed.
 */
export default function ClientPage() {
  const { projectId = "" } = useParams();
  if (projectId.startsWith("cl_")) return <ClientOnlyPage clientId={projectId} />;
  return <ProjectPage projectId={projectId} />;
}

function useSheet() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const open = (s: Sheet) => {
    setSheet(s);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return { sheet, setSheet, open, top };
}

/** A task opened from Today or the Renewals tab arrives as ?task=<id>: open what completes it, once. */
function useTaskParam(tasks: ClientTask[], ready: boolean, run: (t: ClientTask) => void) {
  const [params, setParams] = useSearchParams();
  const taskId = params.get("task");
  useEffect(() => {
    if (!taskId || !ready) return;
    const t = tasks.find((x) => x.id === taskId);
    if (t) run(t);
    const next = new URLSearchParams(params);
    next.delete("task");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, ready]);
}

/** What completes a task, as a sheet (null: the item in the stage card, or nothing to open). */
export function sheetForTask(t: ClientTask): Sheet | null {
  const a = t.action;
  if (a.type === "message") return { type: "message", ids: [a.templateId, ...(a.alsoTemplateId ? [a.alsoTemplateId] : [])], about: a.about };
  if (a.type === "document") return { type: "doc", req: { kind: a.kind, milestone: a.milestone, data: a.part ? { part: a.part } : undefined } };
  if (a.type === "payment") return { type: "payment", docId: a.docId };
  if (a.type === "deemed") return a.roundN ? { type: "panel", name: "rounds" } : { type: "approval", what: a.what, notice: a.notice };
  if (a.type === "hold") return { type: "hold", hold: a.hold };
  return null;
}

function ProjectPage({ projectId }: { projectId: string }) {
  const clients = useClients();
  const { status, projectCtxOf, tasks, today } = clients;
  const { leadById } = useCrmData();
  const c = projectCtxOf(projectId);
  const [view, setView] = useState<StageId | null>(null);
  const { sheet, setSheet, open, top } = useSheet();
  const [highlight, setHighlight] = useState<string | null>(null);

  const runTask = (t: ClientTask) => {
    const s = sheetForTask(t);
    if (s) open(s);
    else {
      setView(null);
      if (t.itemId) {
        setHighlight(t.itemId);
        requestAnimationFrame(() => document.querySelector(`[data-item="${t.itemId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    }
  };
  useTaskParam(tasks, status === "ready", runTask);

  if (status === "needs0014") return <Needs0014 />;
  if (status !== "ready") return <EmptyState title={status === "error" ? "The client files did not load." : "Loading the client file..."} body={clients.error || undefined} />;
  if (!c) return <EmptyState title="This client file does not exist." action={<Link to={CRM.clients} className={crm.btnPrimary}>Back to clients</Link>} />;

  const p = c.project;
  const cl = c.client;
  const stage = view || p.stage;
  const lead = p.leadId ? leadById(p.leadId) : undefined;
  const health = healthOf(c, projectTasks(c));

  const on: ItemHandlers = {
    message: (ids) => open({ type: "message", ids }),
    document: (kind, milestone) => {
      const existing = c.docs.filter((d) => d.kind === kind && (!milestone || d.milestone === milestone) && d.status !== "cancelled" && kind !== "receipt")
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
      open({ type: "doc", req: existing ? { kind, milestone, docId: existing.id } : { kind, milestone } });
    },
    payment: () => open({ type: "payment" }),
    panel: (name) => open({ type: "panel", name }),
  };

  const value = contractValueOf(p);
  const received = receivedTotal(c.payments.filter((x) => x.projectId === p.id));
  const dueNow = c.docs.filter((d) => d.projectId === p.id && counts(d, c.docs)).reduce((s, d) => s + Math.max(0, docBalance(d, c.docs, c.payments)), 0);
  const overdue = overdueDocs(c.docs.filter((d) => d.projectId === p.id), c.payments, today).sort((a, b) => (a.dueOn || "").localeCompare(b.dueOn || ""))[0];
  const idx = stageIndex(p.stage);
  const disagree = lead && !p.outcome && ((lead.status === "won" && p.stage === "proposal") || ["lost", "do_not_contact"].includes(lead.status));
  const closed = Boolean(p.outcome);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" data-testid="client-page" data-project={p.id} data-stage={p.stage} data-outcome={p.outcome || ""}>
      <div>
        <Link to={CRM.clients} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Clients</Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words font-display text-xl font-semibold tracking-tight" data-testid="client-name">{cl.orgName}</h1>
            <p className="break-words text-[13px] text-muted-foreground">
              {p.name} · {p.code} · <Link to={CRM.client(cl.id)} className="hover:underline">{cl.code}</Link>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary" data-testid="stage-pill">
                {p.outcome ? (p.outcome === "lost" ? "Lost" : p.outcome === "cancelled" ? "Cancelled" : "Closed") : `${STAGE_BY_ID[p.stage].n}. ${STAGE_BY_ID[p.stage].label}`}
              </span>
              {!p.outcome && <HealthDot health={health} label={HEALTH_LABEL[health]} />}
              {p.hold && <span className="rounded bg-muted px-1.5 text-[11px]">On hold: {HOLD_LABEL[p.hold]}</span>}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-[12px]">
            <div><dt className="text-muted-foreground">Contract value</dt><dd className={cn("text-base font-semibold", crm.num)} data-testid="head-value">{rs(value)}</dd></div>
            <div><dt className="text-muted-foreground">Received</dt><dd className={cn("text-base font-semibold", crm.num)} data-testid="head-received">{rs(received)}</dd></div>
            <div><dt className="text-muted-foreground">Due now</dt><dd className={cn("text-base font-semibold", crm.num)} data-testid="head-due">{rs(dueNow)}</dd>{overdue?.dueOn && <dd className="text-[11px] font-medium text-destructive">overdue {daysBetween(overdue.dueOn, today)} days</dd>}</div>
          </dl>
        </div>
      </div>
      {disagree && lead && <LeadDisagrees c={c} lead={lead} />}
      <JourneyStrip project={p} view={stage} onView={(s) => setView(s === p.stage ? null : s)} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div ref={top} className="scroll-mt-4" />
          {sheet && <SheetView c={c} sheet={sheet} onClose={() => setSheet(null)} onOpen={open} />}
          <StageCard c={c} stage={stage} on={on} onMessage={(ids) => open({ type: "message", ids })} highlight={highlight} />
          {p.stage === "aftercare" && !closed && <CloseCard c={c} />}
          {!closed && p.stage !== "aftercare" && p.stage !== "proposal" && <CancelCard c={c} />}
          <div className="space-y-2">
            <Fold title="Documents" open testId="fold-documents" count={c.docs.length}><DocumentsPanel c={c} onOpen={(req) => open({ type: "doc", req })} /></Fold>
            <Fold title="Brief" testId="fold-brief"><FieldsForm target="project" id={p.id} {...CARDS.brief} testId="brief-form" line="Brief updated" /></Fold>
            <Fold title="Price" testId="fold-price"><PriceCard project={p} /></Fold>
            {idx >= 1 && <Fold title="Four numbers" testId="fold-four"><FourNumbers project={p} /></Fold>}
            {idx >= 3 && <Fold title="Kickoff script" testId="fold-kickoff-script"><ScriptView script={kickoffScript(c)} /></Fold>}
            {idx >= 3 && (!p.dates.contentCutoff || p.dates.contentCutoff >= today || idx <= 5) && <Fold title="Content tracker" testId="fold-content" count={(p.content || []).length}><ContentTracker project={p} /></Fold>}
            {idx >= 3 && <Fold title="Access record" testId="fold-access" count={(p.access || []).length}><CredentialsRecord c={c} /></Fold>}
            {idx >= 5 && <Fold title="Rounds" testId="fold-rounds"><RoundsPanel project={p} onMessage={(ids, roundN) => open({ type: "message", ids, about: { roundN } })} /></Fold>}
            {idx >= 3 && <Fold title="Change requests" testId="fold-crs" count={(p.changeRequests || []).length}><ChangeRequests c={c} onDocument={(req) => open({ type: "doc", req })} onMessage={(ids, crNo) => open({ type: "message", ids, about: { crNo } })} /></Fold>}
            {idx >= 7 && <Fold title="Care plan" testId="fold-care"><CareView c={c} /></Fold>}
            {idx >= 8 && <Fold title="What is live, and the deliverables" testId="fold-live"><FieldsForm target="project" id={p.id} {...CARDS.live} testId="live-form" line="What is live: updated" /><div className="mt-4"><DeliverablesPanel c={c} /></div></Fold>}
            {idx >= 10 && <Fold title="Issue log" testId="fold-issues" count={(p.issues || []).length}><IssueLog project={p} onMessage={(ids, issueId) => open({ type: "message", ids, about: { issueId } })} /></Fold>}
            {idx >= 10 && <Fold title="Consent" testId="fold-consent"><ConsentPanel client={cl} projectId={p.id} onMessage={(ids) => open({ type: "message", ids })} /></Fold>}
          </div>
        </div>
        <aside className="min-w-0 space-y-4" aria-label="The client">
          <ClientCard client={cl} onEdit={() => open({ type: "panel", name: "client" })} onBilling={() => open({ type: "panel", name: "billing" })}
            slowAdvance={clients.data.projects.some((x) => x.clientId === cl.id && (x.sends || []).some((s) => s.t === "cp_agreement_a2_em_en"))} />
          <MoneyCard c={c} onRecord={() => open({ type: "payment" })} />
          <DatesCard c={c} onEdit={() => open({ type: "panel", name: "dates" })} />
          <Timeline clientId={cl.id} projectId={p.id} leadId={p.leadId} />
        </aside>
      </div>
    </div>
  );
}

/**
 * THE LEAD AND THE FILE IN STEP (4.13): when the lead's status was changed elsewhere (the pipeline, the lead
 * page) so that it disagrees with the file, one line says so with the fix. Nothing changes until Mehdi
 * presses one: record the yes, close this file, or put the lead back.
 */
function LeadDisagrees({ c, lead }: { c: ProjectCtx; lead: OutreachLead }) {
  const { saveProject } = useClients();
  const { eventsFor, setStatus } = useCrmData();
  const [mode, setMode] = useState<"" | "close">("");
  const [err, setErr] = useState<string | null>(null);
  const p = c.project;
  const won = lead.status === "won";
  const line = eventsFor(lead.id).filter((e) => e.type === "status" && new RegExp(`to ${LEAD_STATUS_LABELS[lead.status]}$`).test(e.detail || ""))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  const on = line ? ` on ${fmtDate(line.at)}` : "";
  const back = p.stage === "proposal" ? "proposal" : "won";
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      setMode("");
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px]" data-testid="lead-disagrees">
      <p>
        {won
          ? `The lead was marked Won${on}: record the yes?`
          : `The lead was closed (${LEAD_STATUS_LABELS[lead.status]})${on}: close this file as ${p.stage === "proposal" ? "Lost" : "Cancelled"}, or put the lead back?`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {won ? (
          <button type="button" className={crm.btnPrimary} data-testid="lead-disagrees-yes" onClick={() => void run(async () => {
            const missing = missingForMove(c, "proposal");
            if (missing.length) throw new Error(`Still open on stage 1: ${missing.map((m) => m.label.split(":")[0]).join("; ")}. Fill them in, or use "They said yes: move on anyway" below.`);
            await saveProject(p.id, (pp) => saidYes(pp, new Date()), { type: "stage", detail: "They said yes (the lead was already Won): stage 2, Agreement and advance", data: { from: "proposal", to: "agreement" } });
          })}>Record the yes</button>
        ) : (
          <button type="button" className={crm.btn} data-testid="lead-disagrees-close" onClick={() => setMode("close")}>Close this file as {p.stage === "proposal" ? "Lost" : "Cancelled"}</button>
        )}
        <button type="button" className={crm.btnGhost} data-testid="lead-disagrees-back"
          onClick={() => void run(() => setStatus(lead.id, back, { lostReason: undefined }))}>
          Put the lead back to {back === "won" ? "Won" : "Proposal"}
        </button>
      </div>
      {mode === "close" && (
        <ReasonPrompt label={p.stage === "proposal" ? "What tipped it? In their words." : "Why it is cancelled (their written notice, or the reason)"} button={p.stage === "proposal" ? "Close as Lost" : "Cancel the project"}
          testId="lead-disagrees-reason" onCancel={() => setMode("")}
          onSubmit={(r) => run(() => (p.stage === "proposal"
            ? saveProject(p.id, (pp) => saidNo(pp, r, new Date()), { type: "stage", detail: `Closed as Lost (the lead was closed): ${r}`, data: { outcome: "lost" } })
            : saveProject(p.id, (pp) => closeProject(pp, "cancelled", r, new Date()), { type: "stage", detail: `Project cancelled (the lead was closed): ${r}`, data: { outcome: "cancelled" } })))} />
      )}
      <Problem text={err} />
    </div>
  );
}

function SheetView({ c, sheet, onClose, onOpen }: { c: ProjectCtx; sheet: Sheet; onClose: () => void; onOpen: (s: Sheet) => void }) {
  if (sheet.type === "message") return <ClientCompose clientId={c.client.id} projectId={c.project.id} templateIds={sheet.ids} about={sheet.about} onClose={onClose} />;
  if (sheet.type === "doc") return <DocumentDialog clientId={c.client.id} projectId={sheet.req.milestone === "AMC" ? null : c.project.id} req={sheet.req} onClose={onClose} />;
  if (sheet.type === "payment") return <RecordPaymentDialog clientId={c.client.id} projectId={c.project.id} docId={sheet.docId} onClose={onClose} onMessage={(ids, about) => onOpen({ type: "message", ids, about })} />;
  if (sheet.type === "approval") {
    return (
      <section className={cn(crm.panel, "p-4")} data-testid="approval-sheet">
        <div className="flex justify-end"><button type="button" className={crm.btnGhost} onClick={onClose}>Close</button></div>
        <ApprovalDialog projectId={c.project.id} what={sheet.what} deemedFrom={sheet.notice} onDone={onClose} />
      </section>
    );
  }
  if (sheet.type === "hold") return <HoldSheet c={c} hold={sheet.hold} onClose={onClose} />;
  return <PanelSheet c={c} name={sheet.name} onClose={onClose} onOpen={onOpen} />;
}

function HoldSheet({ c, hold, onClose }: { c: ProjectCtx; hold: Hold; onClose: () => void }) {
  const { saveProject } = useClients();
  return (
    <section className={cn(crm.panel, "p-4")} data-testid="hold-sheet">
      <p className="text-[13px] font-medium">Put on hold: {HOLD_LABEL[hold]}</p>
      {hold === "no_advance" && <p className="mt-1 text-[12px] text-muted-foreground">The advance did not come after the third reminder: the start slot is released. The lead stays Won; re-quote after the quotation's validity date.</p>}
      <ReasonPrompt label="Why it is on hold" button="Put on hold" testId="hold-sheet-reason" onCancel={onClose}
        onSubmit={async (r) => {
          await saveProject(c.project.id, (pp) => putOnHold(pp, hold, r, new Date()), { type: "hold", detail: `On hold (${HOLD_LABEL[hold]}): ${r}`, data: { hold } });
          onClose();
        }} />
    </section>
  );
}

function PanelSheet({ c, name, onClose, onOpen }: { c: ProjectCtx; name: string; onClose: () => void; onOpen: (s: Sheet) => void }) {
  const pp = c.project;
  let body: JSX.Element | null = null;
  if (name === "price") body = <PriceCard project={pp} />;
  else if (name === "sow") body = <SowForm project={pp} onDone={onClose} />;
  else if (name === "access") body = <CredentialsRecord c={c} />;
  else if (name === "content") body = <ContentTracker project={pp} />;
  else if (name === "rounds") body = <RoundsPanel project={pp} onMessage={(ids, roundN) => onOpen({ type: "message", ids, about: { roundN } })} />;
  else if (name === "issues") body = <IssueLog project={pp} onMessage={(ids, issueId) => onOpen({ type: "message", ids, about: { issueId } })} />;
  else if (name === "deliverables") body = <DeliverablesPanel c={c} />;
  else if (name === "care") body = <div className="space-y-4"><CarePlanForm client={c.client} /><RenewalsForm clientId={c.client.id} /></div>;
  else if (CARDS[name]) {
    const card = CARDS[name];
    body = <FieldsForm target={card.target} id={card.target === "project" ? pp.id : c.client.id} fields={card.fields} title={card.title} testId={`${name}-form`} line={`${card.title}: updated`} onDone={onClose} />;
  }
  return (
    <section className={cn(crm.panel, "p-4")} data-testid="panel-sheet" data-panel={name}>
      <div className="mb-2 flex justify-end"><button type="button" className={crm.btnGhost} onClick={onClose}>Close</button></div>
      {body}
      {name === "dates" && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-[13px] font-medium">Change the go-live date</p>
          <GoLiveChange project={pp} onDone={(cause, to) => cause !== "change_request" && onOpen({ type: "message", ids: [cause === "client" ? "cp_slip_client_wa_hi" : "cp_slip_own_em_en"], about: { slip: { to } } })} />
        </div>
      )}
      {name === "client" && <div className="mt-4 border-t border-border pt-3"><RenewalsForm clientId={c.client.id} /></div>}
    </section>
  );
}

function SowForm({ project, onDone }: { project: CrmProject; onDone: () => void }) {
  const { saveProject, today } = useClients();
  const [ref, setRef] = useState(project.sowRef || "");
  const [date, setDate] = useState(today);
  const [target, setTarget] = useState(project.dates.goLiveTarget || "");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="grid gap-2 sm:grid-cols-3" data-testid="sow-form">
      <label className="text-[12px]">SOW reference<input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} data-testid="sow-ref" /></label>
      <label className="text-[12px]">Signed by both on<input type="date" className={inputCls} value={date} max={today} onChange={(e) => setDate(e.target.value)} data-testid="sow-date" /></label>
      <label className="text-[12px]">Go-live target (SOW section 12, M4)<input type="date" className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} data-testid="sow-golive" /></label>
      <div className="sm:col-span-3"><Problem text={err} /></div>
      <div className="flex justify-end sm:col-span-3">
        <button type="button" className={crm.btnPrimary} data-testid="sow-save" onClick={async () => {
          if (!ref.trim() || !date || !target) return setErr("The SOW reference, the date it was signed and its go-live target.");
          try {
            await saveProject(project.id, (pp) => tickItem({ ...pp, sowRef: ref.trim(), dates: { ...pp.dates, goLiveTarget: target } }, "a_sow", new Date(), `SOW ${ref.trim()}, signed ${fmtDate(date)}`),
              { type: "item", detail: `SOW ${ref.trim()} signed by both on ${fmtDate(date)}; go-live target ${fmtDate(target)}`, data: { item: "a_sow" } });
            onDone();
          } catch (e) {
            setErr(errText(e));
          }
        }}>SOW signed</button>
      </div>
    </div>
  );
}

function CareView({ c }: { c: ProjectCtx }) {
  const s = careScript(c);
  return (
    <div className="space-y-3">
      <ScriptView script={{ opening: "", steps: s.steps }} />
      <CarePlanForm client={c.client} />
    </div>
  );
}

function CloseCard({ c }: { c: ProjectCtx }) {
  const { saveProject, saveClient, today } = useClients();
  const [err, setErr] = useState<string | null>(null);
  const pathName = pathOf(c.project);
  return (
    <section className={cn(crm.panel, "p-4")} data-testid="close-card">
      <p className="text-[13px]">
        Path: <strong>{pathName === "care_plan" ? "Care plan" : "Exit"}</strong>. When every gate item above is done, close the project:{" "}
        {pathName === "care_plan" ? "the client stays active with its care plan, and the renewals run from Today." : "the client goes dormant; a win-back check comes up in six months and the records reminder in three years."}
      </p>
      <button type="button" className={cn(crm.btnPrimary, "mt-2")} data-testid="close-project"
        onClick={async () => {
          setErr(null);
          try {
            const missing = missingForMove(c, "aftercare");
            if (missing.length) throw new Error(`Still open: ${missing.map((m) => m.label.split(":")[0]).join("; ")}.`);
            await saveProject(c.project.id, (pp) => closeProject(pp, "closed", "", new Date()), { type: "stage", detail: `Project closed (${pathName === "care_plan" ? "care plan" : "exit"})`, data: { outcome: "closed" } });
            await saveClient(c.client.id, pathName === "care_plan" ? { status: "active" } : { status: "dormant", exitedOn: today },
              { type: "note", projectId: c.project.id, detail: pathName === "care_plan" ? "Client active with its care plan" : "Client dormant: win-back check in 180 days, records in 3 years" });
          } catch (e) {
            setErr(errText(e));
          }
        }}>Close the project</button>
      <Problem text={err} />
    </section>
  );
}

function CancelCard({ c }: { c: ProjectCtx }) {
  const { saveProject } = useClients();
  const [asking, setAsking] = useState(false);
  return (
    <div className="text-right">
      {!asking ? <button type="button" className={crm.btnGhost} onClick={() => setAsking(true)} data-testid="cancel-project">Cancel the project</button> : (
        <div className="text-left">
          <ReasonPrompt label="Their written notice, or why it is cancelled (section 12: an invoice for work to date, the kill fee, a code F credit note before any work)" button="Cancel the project" onCancel={() => setAsking(false)} testId="cancel-reason"
            onSubmit={(r) => saveProject(c.project.id, (pp) => closeProject(pp, "cancelled", r, new Date()), { type: "stage", detail: `Project cancelled: ${r}`, data: { outcome: "cancelled" } }).then(() => undefined)} />
        </div>
      )}
    </div>
  );
}

function ScriptView({ script }: { script: { opening: string; steps: { id: string; title: string; lines: { kind: string; text: string }[] }[] } }) {
  return (
    <div className="space-y-2 text-[13px]" data-testid="script">
      {script.opening && <p className="italic">"{script.opening}"</p>}
      {script.steps.map((s) => (
        <div key={s.id}>
          <p className="font-medium">{s.title}</p>
          {s.lines.map((l, i) => (
            <p key={i} className={cn("mt-0.5", l.kind === "say" && "italic", l.kind === "check" && "rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[12px] not-italic", l.kind === "note" && "text-[12px] text-muted-foreground")}>
              {l.kind === "say" ? `"${l.text}"` : l.text}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function ClientCard({ client: cl, onEdit, onBilling, slowAdvance }: { client: CrmClient; onEdit: () => void; onBilling: () => void; slowAdvance?: boolean }) {
  return (
    <section className={cn(crm.panel, "p-4 text-[13px]")} data-testid="client-card" aria-label="Client details">
      <div className="flex items-center justify-between"><p className={crm.label}>Client</p><button type="button" className={crm.btnGhost} onClick={onEdit} data-testid="client-card-edit">Edit</button></div>
      <p className="mt-1 break-words font-medium">{cl.contactName || <span className="text-amber-700 dark:text-amber-300">[contact name]</span>}{cl.signatoryName && cl.signatoryName !== cl.contactName ? `, signs: ${cl.signatoryName}` : ""}</p>
      <p className="break-words text-muted-foreground">{[cl.phone, cl.email].filter(Boolean).join(" · ") || "No contact details"}</p>
      <p className="mt-1 break-words">{cl.legalName || (cl.legalSameAsTrading ? cl.orgName : <span className="text-amber-700 dark:text-amber-300">[legal name]</span>)}{cl.state ? `, ${cl.state}` : ""}</p>
      {cl.billingAddress && <p className="break-words text-[12px] text-muted-foreground">{cl.billingAddress}</p>}
      <p className="mt-1 text-[12px]">Language: {cl.language === "en" ? "English" : "Hinglish"} · May be named: {cl.portfolioOptOut === true ? "no (opt-out)" : cl.portfolioOptOut === false ? "yes" : "not asked"} · Testimonial: {cl.testimonial?.status === "permission_on_file" ? "permission on file" : "not"}</p>
      {cl.inIndia === false && <p className="mt-1 text-[12px] font-medium">Client outside India: no money documents in the CRM.</p>}
      {cl.dnc && <p className="mt-1 text-[12px] font-medium text-destructive">Do not contact: every message is blocked.</p>}
      {cl.redNote && <p className="mt-1 rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-[12px] text-destructive">{cl.redNote}</p>}
      {slowAdvance && <p className="mt-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[12px]" data-testid="slow-advance">Slow with the advance (the second reminder was needed). "A client who is slow with the advance is telling you something about every payment that follows" (SOP-01 stage 9).</p>}
      <button type="button" className={cn(crm.btnGhost, "mt-1 px-0")} onClick={onBilling} data-testid="client-card-billing">Billing details</button>
    </section>
  );
}

function DatesCard({ c, onEdit }: { c: ProjectCtx; onEdit: () => void }) {
  const p = c.project;
  const win = supportWindow(p);
  const row = (label: string, iso?: string, extra?: string) => (iso ? <li key={label}><span className="text-muted-foreground">{label}:</span> {fmtDate(iso)}{extra ? ` ${extra}` : ""}</li> : null);
  return (
    <section className={cn(crm.panel, "p-4 text-[13px]")} data-testid="dates-card" aria-label="Dates">
      <div className="flex items-center justify-between"><p className={crm.label}>Dates</p><button type="button" className={crm.btnGhost} onClick={onEdit} data-testid="dates-edit">Edit</button></div>
      <ul className="mt-1 space-y-0.5 text-[12px]">
        {row("Discovery call", p.dates.call)}
        {row("Proposal sent", p.dates.proposalSent)}
        {row("Yes", p.dates.yes)}
        {row("Kickoff", p.dates.kickoff, p.kickoffTime)}
        {row("Content cut-off", p.dates.contentCutoff)}
        {row("Development start", p.dates.devStart)}
        {row("Go-live target", p.dates.goLiveTarget)}
        {row("Went live", p.dates.goLive)}
        {win && <li><span className="text-muted-foreground">Support window:</span> {fmtDate(win.start)} to {fmtDate(win.end)}</li>}
        {(Object.entries(c.client.renewals || {}) as [string, { renewsOn?: string }][]).filter(([, r]) => r?.renewsOn).map(([k, r]) => row(`${k === "ssl" ? "SSL" : k[0].toUpperCase() + k.slice(1)} renews`, r.renewsOn))}
        {c.client.carePlan?.renewalOn && row("Care plan renews", c.client.carePlan.renewalOn)}
      </ul>
      {(p.goLiveHistory || []).length > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">Go-live moved {p.goLiveHistory.length} time{p.goLiveHistory.length === 1 ? "" : "s"} (the history is under Edit).</p>
      )}
    </section>
  );
}

/* ── A client on its own (Add client, 4.13; and any client's care plan and renewals) ─ */

type ClientSheet =
  | { type: "message"; ids: string[]; about?: MessageAbout }
  | { type: "doc"; req: DocRequest }
  | { type: "payment"; docId?: string }
  | { type: "panel"; name: "client" | "billing" | "renewals" | "care" };

function ClientOnlyPage({ clientId }: { clientId: string }) {
  const clients = useClients();
  const { status, data, tasks, today } = clients;
  const [sheet, setSheet] = useState<ClientSheet | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const open = (s: ClientSheet) => {
    setSheet(s);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const runTask = (t: ClientTask) => {
    const s = sheetForTask(t);
    if (s && (s.type === "message" || s.type === "doc" || s.type === "payment")) open(s);
  };
  useTaskParam(tasks, status === "ready", runTask);

  if (status === "needs0014") return <Needs0014 />;
  if (status !== "ready") return <EmptyState title={status === "error" ? "The client files did not load." : "Loading the client..."} body={clients.error || undefined} />;
  const cl = data.clients.find((x) => x.id === clientId);
  if (!cl) return <EmptyState title="This client does not exist." action={<Link to={CRM.clients} className={crm.btnPrimary}>Back to clients</Link>} />;

  const projects = data.projects.filter((p) => p.clientId === cl.id);
  const docs = data.documents.filter((d) => d.clientId === cl.id && !d.projectId);
  const pays = data.payments.filter((p) => p.clientId === cl.id && !p.projectId);
  const own = clientTasks({
    client: cl, docs, payments: pays, today,
    handoverIssued: data.documents.some((d) => d.clientId === cl.id && d.kind === "handover" && d.status === "issued"),
  }).sort((a, b) => a.due.localeCompare(b.due));
  const ctxLike = { payments: pays, today };

  return (
    <div className="mx-auto max-w-[1100px] space-y-4" data-testid="client-only-page" data-client={cl.id}>
      <div>
        <Link to={CRM.clients} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Clients</Link>
        <h1 className="mt-1 break-words font-display text-xl font-semibold tracking-tight" data-testid="client-name">{cl.orgName}</h1>
        <p className="text-[13px] text-muted-foreground">{cl.code} · {cl.status.replace(/_/g, " ")}{cl.monthlyPlan ? " · monthly plan (no project file in this pass)" : ""}</p>
      </div>
      <div ref={top} className="scroll-mt-4" />
      {sheet?.type === "message" && <ClientCompose clientId={cl.id} projectId={null} templateIds={sheet.ids} about={sheet.about} onClose={() => setSheet(null)} />}
      {sheet?.type === "doc" && <DocumentDialog clientId={cl.id} projectId={null} req={sheet.req} onClose={() => setSheet(null)} />}
      {sheet?.type === "payment" && <RecordPaymentDialog clientId={cl.id} projectId={null} docId={sheet.docId} onClose={() => setSheet(null)} />}
      {sheet?.type === "panel" && (
        <section className={cn(crm.panel, "p-4")} data-testid="panel-sheet" data-panel={sheet.name}>
          <div className="mb-2 flex justify-end"><button type="button" className={crm.btnGhost} onClick={() => setSheet(null)}>Close</button></div>
          {sheet.name === "renewals" ? <RenewalsForm clientId={cl.id} />
            : sheet.name === "care" ? <CarePlanForm client={cl} />
              : <FieldsForm target="client" id={cl.id} fields={CARDS[sheet.name].fields} title={CARDS[sheet.name].title} testId={`${sheet.name}-form`} line={`${CARDS[sheet.name].title}: updated`} onDone={() => setSheet(null)} />}
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <section className={cn(crm.panel, "p-4")} data-testid="client-tasks">
            <p className={crm.label}>What is due</p>
            <ul className="mt-2 space-y-1.5">
              {own.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={() => runTask(t)} canOpen={Boolean(sheetForTask(t))} />)}
              {!own.length && <li className="text-[12px] text-muted-foreground">Nothing scheduled. Renewal dates and a care plan put their reminders here.</li>}
            </ul>
          </section>
          <section className={cn(crm.panel, "p-4")} data-testid="client-projects">
            <p className={crm.label}>Projects</p>
            <ul className="mt-2 space-y-1 text-[13px]">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link to={CRM.client(p.id)} className="text-primary hover:underline">{p.name}</Link>{" "}
                  <span className="text-muted-foreground">{p.code}, {p.outcome ? p.outcome : `${STAGE_BY_ID[p.stage].n}. ${STAGE_BY_ID[p.stage].label}`}</span>
                </li>
              ))}
              {!projects.length && <li className="text-[12px] text-muted-foreground">No project file. A project opens from a lead (Open client file on the lead page).</li>}
            </ul>
          </section>
          <section className={cn(crm.panel, "p-4")} data-testid="client-docs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={crm.label}>Care plan invoices and receipts</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={crm.btn} disabled={cl.inIndia === false} onClick={() => open({ type: "doc", req: { kind: "invoice", milestone: "AMC" } })} data-testid="client-amc-invoice">Care plan invoice</button>
                <button type="button" className={crm.btn} disabled={cl.inIndia === false || !docs.some((d) => d.status === "issued" && d.kind === "invoice")} onClick={() => open({ type: "payment" })}>Record payment</button>
              </div>
            </div>
            <ul className="mt-2 space-y-1">
              {docs.map((d) => (
                <li key={d.id}>
                  <button type="button" className="flex w-full flex-wrap items-center gap-x-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-muted" onClick={() => open({ type: "doc", req: { kind: d.kind, milestone: d.milestone, docId: d.id } })}>
                    <span className="font-medium">{d.kind === "invoice" ? "Care plan invoice" : d.kind === "receipt" ? "Receipt" : d.kind}</span>
                    {d.number && <span className="font-mono">{d.number}</span>}
                    <span className="text-muted-foreground">{docStatus(d, docs, ctxLike)}</span>
                    {d.amount !== null && <span className="ml-auto tabular-nums">{rs(d.amount)}</span>}
                  </button>
                </li>
              ))}
              {!docs.length && <li className="text-[12px] text-muted-foreground">None yet.</li>}
            </ul>
            {cl.inIndia === false && <p className="mt-2 text-[12px]">Clients outside India: the MSA and the export invoice in 03-legal-docs govern (not in the CRM yet).</p>}
            {cl.inIndia !== false && docs.some((d) => d.kind === "invoice" && d.milestone === "AMC" && d.status === "issued") && (
              <p className="mt-2 text-[11px] text-muted-foreground" data-testid="amc-rule">
                Unpaid 7 days after the due date, a written reminder; 15 days, cover may be suspended on 3 working days' written notice; 45 days, the plan may end, with the handover still owed (AMC cl. 11.1, 11.2, 11.5). Interest at {typeof data.settings.policy.lateInterestPercent === "number" ? data.settings.policy.lateInterestPercent : "[late interest percent]"}% a month (cl. 11.6). Never the site, the data, the backups or the domain (cl. 11.3).
              </p>
            )}
          </section>
        </div>
        <aside className="min-w-0 space-y-4">
          <ClientCard client={cl} onEdit={() => open({ type: "panel", name: "client" })} onBilling={() => open({ type: "panel", name: "billing" })} />
          <section className={cn(crm.panel, "p-4 text-[13px]")} data-testid="client-care">
            <div className="flex items-center justify-between"><p className={crm.label}>Care plan and renewals</p></div>
            {cl.carePlan ? (
              <p className="mt-1">{cl.carePlan.plan[0].toUpperCase() + cl.carePlan.plan.slice(1)}, {cl.carePlan.billing}, {rs(cl.carePlan.fee)} ({cl.carePlan.status}){cl.carePlan.renewalOn ? `, renews ${day(cl.carePlan.renewalOn)}` : ""}</p>
            ) : <p className="mt-1 text-muted-foreground">No care plan.</p>}
            <ul className="mt-1 space-y-0.5 text-[12px]">
              {(Object.entries(cl.renewals || {}) as [string, { renewsOn?: string; provider?: string }][]).filter(([, r]) => r?.renewsOn).map(([k, r]) => (
                <li key={k}>{k === "ssl" ? "SSL" : k[0].toUpperCase() + k.slice(1)}{r.provider ? ` (${r.provider})` : ""}: renews {day(r.renewsOn)}</li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={crm.btn} onClick={() => open({ type: "panel", name: "care" })} data-testid="client-care-edit">Care plan</button>
              <button type="button" className={crm.btn} onClick={() => open({ type: "panel", name: "renewals" })} data-testid="client-renewals-edit">Renewal dates</button>
            </div>
          </section>
          <ClientTimeline clientId={cl.id} />
        </aside>
      </div>
    </div>
  );
}

/** The client-level lines of the timeline (renewals, care plan, notes); a project's lines are on its page. */
function ClientTimeline({ clientId }: { clientId: string }) {
  const { store, data } = useClients();
  const [lines, setLines] = useState<{ id: string; at: string; detail?: string | null; type: string }[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const client = data.clients.find((c) => c.id === clientId);
  useEffect(() => {
    let live = true;
    store().listEvents().then((ev) => live && setLines(ev.filter((e) => e.clientId === clientId && !e.projectId).sort((a, b) => b.at.localeCompare(a.at)))).catch((e) => live && setErr(errText(e)));
    return () => {
      live = false;
    };
  }, [store, clientId, client?.updatedAt, data.documents.length, data.payments.length]);
  return (
    <section className={cn(crm.panel, "p-4")} data-testid="client-timeline" aria-label="Timeline">
      <p className={crm.label}>Timeline</p>
      <form className="mt-2 flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!note.trim()) return;
        try {
          const ev = await store().addEvent({ clientId, projectId: null, type: "note", detail: note.trim() });
          setLines((l) => [ev, ...l]);
          setNote("");
        } catch (x) {
          setErr(errText(x));
        }
      }}>
        <input aria-label="Add a note" className={crm.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
        <button type="submit" className={crm.btn}>Add</button>
      </form>
      {err && <p role="alert" className="mt-2 text-[12px] text-destructive">{err}</p>}
      <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {lines.map((e) => (
          <li key={e.id} className="text-[12px]">
            <span className="text-muted-foreground">{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
            <span className="block break-words">{e.detail}</span>
          </li>
        ))}
        {!lines.length && <li className="text-[12px] text-muted-foreground">Nothing yet.</li>}
      </ol>
    </section>
  );
}

export { Needs0014 };
