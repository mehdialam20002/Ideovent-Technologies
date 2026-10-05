import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Download, Plus, X } from "lucide-react";
import { LEAD_KIND_LABELS, LEAD_KIND_VALUES, type LeadKind, type OutreachLead } from "@/lib/outreach/types";
import { counts, docBalance } from "@/lib/clients/money";
import { addDays, fmtDate, fmtShort } from "@/lib/clients/numbering";
import { registerCsv, registerRows, registerTotals, refundsFrom, renewalItems, type Refund, type RegisterRow, type RenewalItem } from "@/lib/clients/register";
import { STAGES, STAGE_BY_ID, type ProjectCtx } from "@/lib/clients/stages";
import { HEALTH_LABEL, healthOf, nextAction, projectTasks, snoozedTask, type ClientTask, type Health } from "@/lib/clients/tasks";
import type { CrmClient, CrmDocument, CrmProject, Hold, StageId } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm, EmptyState, PageHeader } from "../ui";
import { useClients } from "./useClients";
import { OpenClientFileDialog } from "./OpenClientFileDialog";
import { taskHref } from "./TaskRow";
import { errText, Field, HealthDot, inputCls, Needs0014, Problem, rs, saveBlob, useNarrow } from "./shared";

/**
 * CLIENTS (client-process-spec 10.2): Mehdi only (RoleGate "clients"; the database refuses anyone else).
 *
 *   Board     one column per stage, a card per open project (business, project, next action and its date,
 *             money due, the health dot, an "On hold" badge). The columns scroll sideways inside their own
 *             box; the page never does. Below 768 px the List is shown instead.
 *   List      grouped by client (a client with two projects shows both), with filters: stage, health,
 *             on hold, overridden (any red gate or need), closed in the last 90 days.
 *   Money     the register README-BILLING section 3 asks for, its totals (5.1), and Export register (CSV).
 *   Renewals  care plans, domains, hosting, SSL and e-mail by date, each with the ladder step due next.
 *
 * Above them: the Won leads that have no client file yet (Open client file, or Not a client, which hides
 * the lead here and writes one line on its history), and Add client (a client with no project, 4.13).
 * The tab is kept in the address (?tab=money), never in browser storage (decision 17).
 */

type Tab = "board" | "list" | "money" | "renewals";
const TABS: { id: Tab; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "money", label: "Money" },
  { id: "renewals", label: "Renewals" },
];
const HOLD_LABEL: Record<Hold, string> = { client_delay: "client delay", non_payment: "non-payment", no_advance: "no advance" };
/** The lead history line that hides a Won lead from "Won leads without a client file". */
export const NOT_A_CLIENT = "Not a client: no client file for this lead";

interface Row {
  p: CrmProject;
  cl: CrmClient;
  c: ProjectCtx;
  health: Health;
  next: { label: string; due: string | null } | null;
  due: number;
  overridden: boolean;
}

const short = (label: string) => label.split(/[:(]/)[0].trim();
const outcomeLabel = (p: CrmProject) => (p.outcome === "lost" ? "Lost" : p.outcome === "cancelled" ? "Cancelled" : p.outcome === "closed" ? "Closed" : "");

function useRows(): Row[] {
  const { data, projectCtxOf } = useClients();
  return useMemo(() => {
    const out: Row[] = [];
    for (const p of data.projects) {
      const c = projectCtxOf(p.id);
      if (!c) continue;
      const docs = c.docs.filter((d) => d.projectId === p.id);
      const due = docs.filter((d) => counts(d, c.docs)).reduce((s, d) => s + Math.max(0, docBalance(d, c.docs, c.payments)), 0);
      const next = nextAction(c);
      out.push({
        p, cl: c.client, c, due,
        health: p.outcome ? "on_track" : healthOf(c, projectTasks(c)),
        next: next ? { label: next.label, due: next.due } : null,
        overridden: (p.gateOverrides || []).length > 0,
      });
    }
    return out;
  }, [data, projectCtxOf]);
}

export default function CrmClients() {
  const clients = useClients();
  const { status, data } = clients;
  const [params, setParams] = useSearchParams();
  const narrow = useNarrow();
  const asked = (params.get("tab") || "board") as Tab;
  const tab: Tab = TABS.some((t) => t.id === asked) ? asked : "board";
  const [adding, setAdding] = useState(false);
  const rows = useRows();

  if (status === "needs0014") return <Needs0014 />;
  if (status !== "ready") {
    return <EmptyState title={status === "error" ? "The client files did not load." : "Loading the client files..."} body={clients.error || undefined} />;
  }
  const open = rows.filter((r) => !r.p.outcome);
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === "board") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1400px] min-w-0" data-testid="crm-clients">
      <PageHeader
        title="Clients"
        subtitle={`${open.length} open project${open.length === 1 ? "" : "s"}, ${data.clients.length} client${data.clients.length === 1 ? "" : "s"}. Only you see this.`}
        actions={
          <button type="button" className={cn(crm.btnPrimary, "max-md:h-10")} onClick={() => setAdding((a) => !a)} data-testid="clients-add">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add client
          </button>
        }
      />
      {adding && <AddClient onClose={() => setAdding(false)} />}
      <WonWithoutFile />
      <div role="tablist" aria-label="Clients views" className="mb-3 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} data-testid={`clients-tab-${t.id}`}
            className={cn("-mb-px min-h-10 border-b-2 px-3 text-[13px] font-medium", tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "board" && (narrow ? (
        <>
          <p className="mb-2 text-[12px] text-muted-foreground">On a phone the board is shown as the list.</p>
          <ListView rows={rows} />
        </>
      ) : <BoardView rows={open} />)}
      {tab === "list" && <ListView rows={rows} />}
      {tab === "money" && <MoneyView />}
      {tab === "renewals" && <RenewalsView />}
    </div>
  );
}

/* ── Board ───────────────────────────────────────────────────────────────── */

function BoardView({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return <EmptyState title="No open project yet" body="Open a client file from a lead at Call, Proposal or Won (the card at the top of the lead page)." />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-muted/20 p-2" data-testid="clients-board" aria-label="Projects by stage">
      <div className="flex min-w-max gap-2">
        {STAGES.map((s) => {
          const inStage = rows.filter((r) => r.p.stage === s.id);
          return (
            <section key={s.id} className="flex w-[232px] shrink-0 flex-col rounded-lg bg-card" data-testid="board-column" data-stage={s.id} aria-label={`${s.n}. ${s.label}`}>
              <header className="border-b border-border px-2.5 py-2">
                <p className="flex items-center justify-between gap-2 text-[12px] font-semibold">
                  <span className="truncate">{s.n}. {s.label}</span>
                  <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{inStage.length}</span>
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{s.hinglish}</p>
              </header>
              <ul className="space-y-1.5 p-1.5">
                {inStage.map((r) => (
                  <li key={r.p.id}>
                    <Link to={CRM.client(r.p.id)} className="block rounded-lg border border-border bg-background px-2.5 py-2 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-testid="board-card" data-project={r.p.id}>
                      <p className="truncate text-[13px] font-medium">{r.cl.orgName}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{r.p.name}</p>
                      {r.next && <p className="mt-1 line-clamp-2 text-[12px]">Next: {short(r.next.label)}{r.next.due ? `, ${fmtShort(r.next.due)}` : ""}</p>}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <HealthDot health={r.health} label={HEALTH_LABEL[r.health]} />
                        {r.due > 0 && <span className="text-[12px] tabular-nums">{rs(r.due)} due</span>}
                      </div>
                      {r.p.hold && <span className="mt-1 inline-block rounded bg-muted px-1.5 text-[11px]">On hold: {HOLD_LABEL[r.p.hold]}</span>}
                      {r.overridden && <span className="ml-1 mt-1 inline-block rounded bg-destructive/10 px-1.5 text-[11px] text-destructive">overridden</span>}
                    </Link>
                  </li>
                ))}
                {!inStage.length && <li className="px-1 py-2 text-[11px] text-muted-foreground">None</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ── List ────────────────────────────────────────────────────────────────── */

function ListView({ rows }: { rows: Row[] }) {
  const { data, today } = useClients();
  const [stage, setStage] = useState<"" | StageId>("");
  const [health, setHealth] = useState<"" | Health>("");
  const [onHold, setOnHold] = useState(false);
  const [overridden, setOverridden] = useState(false);
  const [closed, setClosed] = useState(false);
  const since = addDays(today, -90);
  const shown = rows.filter((r) => {
    if (closed) {
      if (!r.p.outcome) return false;
      const at = (r.p.closedAt || r.p.dates.closed || r.p.updatedAt || "").slice(0, 10);
      if (at < since) return false;
    } else if (r.p.outcome) return false;
    if (stage && r.p.stage !== stage) return false;
    if (health && (r.p.outcome || r.health !== health)) return false;
    if (onHold && !r.p.hold) return false;
    if (overridden && !r.overridden) return false;
    return true;
  });
  const filtered = Boolean(stage || health || onHold || overridden || closed);
  const groups = data.clients
    .map((cl) => ({ cl, rows: shown.filter((r) => r.cl.id === cl.id) }))
    .filter((g) => g.rows.length || (!filtered && !rows.some((r) => r.cl.id === g.cl.id && !r.p.outcome) && !g.cl.exitedOn && g.cl.status !== "archived"))
    .sort((a, b) => a.cl.orgName.localeCompare(b.cl.orgName));
  const sel = cn(crm.input, "h-9 w-auto max-md:h-10");
  return (
    <div data-testid="clients-list">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
        <select aria-label="Stage" className={sel} value={stage} onChange={(e) => setStage(e.target.value as StageId | "")} data-testid="filter-stage">
          <option value="">Every stage</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.n}. {s.label}</option>)}
        </select>
        <select aria-label="Health" className={sel} value={health} onChange={(e) => setHealth(e.target.value as Health | "")} data-testid="filter-health">
          <option value="">Any health</option>
          {(Object.keys(HEALTH_LABEL) as Health[]).map((h) => <option key={h} value={h}>{HEALTH_LABEL[h]}</option>)}
        </select>
        <label className="flex min-h-9 items-center gap-1.5"><input type="checkbox" checked={onHold} onChange={(e) => setOnHold(e.target.checked)} data-testid="filter-hold" /> On hold</label>
        <label className="flex min-h-9 items-center gap-1.5"><input type="checkbox" checked={overridden} onChange={(e) => setOverridden(e.target.checked)} data-testid="filter-overridden" /> Overridden</label>
        <label className="flex min-h-9 items-center gap-1.5"><input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} data-testid="filter-closed" /> Closed (last 90 days)</label>
      </div>
      {!groups.length ? (
        <EmptyState title={filtered ? "Nothing matches these filters" : "No clients yet"} body={filtered ? undefined : "A client file opens from a lead at Call, Proposal or Won. Clients you already have (for care plans and renewals): Add client."} />
      ) : (
        <ul className="space-y-3">
          {groups.map(({ cl, rows: rs2 }) => (
            <li key={cl.id} className={cn(crm.panel, "p-3")} data-testid="list-client" data-client={cl.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link to={CRM.client(cl.id)} className="min-w-0 break-words text-[14px] font-semibold hover:underline">{cl.orgName}</Link>
                <span className="text-[11px] text-muted-foreground">{cl.code} · {cl.status.replace(/_/g, " ")}{cl.carePlan && cl.carePlan.status !== "ended" ? ` · care plan ${cl.carePlan.plan}` : ""}</span>
              </div>
              {!rs2.length ? (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {rows.some((r) => r.cl.id === cl.id) ? "No open project (the closed ones are under Closed)." : `No project file${cl.monthlyPlan ? " (a monthly plan)" : ""}.`}
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {rs2.map((r) => (
                    <li key={r.p.id} className="grid gap-x-3 gap-y-0.5 py-2 text-[12px] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto_auto]" data-testid="list-project" data-project={r.p.id}>
                      <Link to={CRM.client(r.p.id)} className="min-w-0 break-words font-medium text-primary hover:underline">{r.p.name}</Link>
                      <span className="min-w-0">{r.p.outcome ? outcomeLabel(r.p) : `${STAGE_BY_ID[r.p.stage].n}. ${STAGE_BY_ID[r.p.stage].label}`}{r.p.hold ? ` (on hold: ${HOLD_LABEL[r.p.hold]})` : ""}</span>
                      <span className="min-w-0 break-words">{r.next ? `Next: ${short(r.next.label)}${r.next.due ? ` (due ${fmtDate(r.next.due)})` : ""}` : r.p.outcome ? "" : "Next: nothing open"}</span>
                      <span className="tabular-nums">{r.due > 0 ? `${rs(r.due)} due` : ""}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        {!r.p.outcome && <HealthDot health={r.health} label={HEALTH_LABEL[r.health]} />}
                        {r.overridden && <span className="rounded bg-destructive/10 px-1 text-[11px] text-destructive">overridden</span>}
                        <span className="text-[11px] text-muted-foreground">last activity {fmtShort(r.p.updatedAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Money: the register (5.6) ──────────────────────────────────────────── */

function MoneyView() {
  const { data, today, store, act } = useClients();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    store().listEvents().then((ev) => live && setRefunds(refundsFrom(ev))).catch((e) => live && setErr(errText(e)));
    return () => {
      live = false;
    };
  }, [store, tick, data.documents.length]);
  const rows = registerRows(data, today, refunds);
  const totals = registerTotals(data, today);
  const exportCsv = () => {
    const blob = new Blob(["﻿" + registerCsv(rows)], { type: "text/csv;charset=utf-8" });
    saveBlob(blob, `ideovent-register-${today}.csv`);
  };
  const docOf = (id: string) => data.documents.find((d) => d.id === id) || null;
  return (
    <div className="space-y-3" data-testid="clients-money">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Figure label="Outstanding" value={rs(totals.outstanding)} testId="money-outstanding" sub="Issued invoices and proformas not yet paid (a proforma stops counting once its launch invoice bills it)" />
        <Figure label="Of which overdue" value={rs(totals.overdue)} testId="money-overdue-total" alert={totals.overdue > 0} sub={`${totals.overdueCount} document${totals.overdueCount === 1 ? "" : "s"} past the due date`} />
        <Figure label="Received this month" value={rs(totals.receivedThisMonth)} testId="money-received-month" sub="Amounts credited in the bank (TDS is not money received)" />
      </div>
      <div className={cn(crm.panel, "p-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-muted-foreground">Every quotation, proforma, invoice, receipt and credit note, drafts and cancelled ones included. INR only.</p>
          <button type="button" className={cn(crm.btn, "max-md:h-10")} onClick={exportCsv} disabled={!rows.length} data-testid="register-export">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export register (CSV)
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Your browser saves the file where you choose. Never inside 07-website: that folder is the public website repository.</p>
        {err && <p role="alert" className="mt-1 text-[12px] text-destructive">{err}</p>}
        {!rows.length ? <p className="mt-3 text-[13px] text-muted-foreground">No money document yet.</p> : (
          <div className="mt-2 max-h-[65vh] overflow-auto">
            <table className={crm.table} data-testid="register-table">
              <thead>
                <tr>
                  {["Number", "Kind", "Date", "Client", "Project", "Amount", "Due", "Paid", "Balance", "Status", "References", "Refunds", ""].map((h, i) => (
                    <th key={i} className={cn(crm.th, ["Amount", "Paid", "Balance"].includes(h) && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => <RegisterLine key={r.id} r={r} doc={docOf(r.id)} onRefund={() => setRefundFor(r.id)} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {refundFor && docOf(refundFor) && (
        <RefundForm doc={docOf(refundFor)!} onClose={() => setRefundFor(null)}
          onSaved={async (r) => {
            await act((s) => s.addEvent({
              clientId: r.doc.clientId, projectId: r.doc.projectId, type: "payment",
              detail: `Refund of Rs ${r.amount} paid on ${fmtDate(r.on)} against credit note ${r.doc.number} (reference ${r.reference})`,
              data: { refundOf: r.doc.id, amount: r.amount, on: r.on, reference: r.reference },
            }));
            setRefundFor(null);
            setTick((t) => t + 1);
          }} />
      )}
    </div>
  );
}

function RegisterLine({ r, doc, onRefund }: { r: RegisterRow; doc: CrmDocument | null; onRefund: () => void }) {
  const refundable = doc?.kind === "credit_note" && doc.status === "issued" && doc.data?.settlement === "refunded" && !r.refunds;
  const href = r.projectId ? CRM.client(r.projectId) : CRM.client(r.clientId);
  return (
    <tr data-testid="register-row" data-number={r.number} data-status={r.status}>
      <td className={cn(crm.td, "font-mono")}><Link to={href} className="hover:underline">{r.number || "-"}</Link></td>
      <td className={crm.td}>{r.kind}</td>
      <td className={crm.td}>{r.date ? fmtDate(r.date) : ""}</td>
      <td className={cn(crm.td, "max-w-[180px] truncate")} title={r.client}>{r.client}</td>
      <td className={cn(crm.td, "max-w-[180px] truncate")} title={r.project}>{r.project}</td>
      <td className={cn(crm.td, "text-right", crm.num)}>{r.amount === null ? "" : rs(r.amount)}</td>
      <td className={crm.td}>{r.dueOn ? fmtDate(r.dueOn) : ""}</td>
      <td className={cn(crm.td, "text-right", crm.num)}>{r.paid === null ? "" : rs(r.paid)}</td>
      <td className={cn(crm.td, "text-right", crm.num)}>{r.balance === null ? "" : rs(r.balance)}</td>
      <td className={cn(crm.td, r.overdueDays > 0 && "font-medium text-destructive")}>{r.status}</td>
      <td className={cn(crm.td, "max-w-[160px] truncate")} title={r.references}>{r.references}</td>
      <td className={cn(crm.td, "max-w-[180px] truncate")} title={r.refunds}>{r.refunds}</td>
      <td className={crm.td}>{refundable && <button type="button" className={cn(crm.btnGhost, "h-7")} onClick={onRefund} data-testid="register-refund">Record the refund</button>}</td>
    </tr>
  );
}

function RefundForm({ doc, onClose, onSaved }: { doc: CrmDocument; onClose: () => void; onSaved: (r: { doc: CrmDocument; amount: number; on: string; reference: string }) => Promise<void> }) {
  const { today } = useClients();
  const [amount, setAmount] = useState(String(doc.amount || ""));
  const [on, setOn] = useState(today);
  const [reference, setReference] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className={cn(crm.panel, "p-4")} data-testid="refund-form" aria-label="Record the refund">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium">The refund for credit note {doc.number}</p>
        <button type="button" className={crm.btnGhost} onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">An issued credit note never changes, so the refund is recorded on the timeline when it leaves the account (Credit-Note section 4), to the account the payment came from.</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <Field id="rf-amt" label="Amount refunded (Rs)"><input id="rf-amt" type="number" min={1} className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field id="rf-on" label="Paid on"><input id="rf-on" type="date" max={today} className={inputCls} value={on} onChange={(e) => setOn(e.target.value)} /></Field>
        <Field id="rf-ref" label="Bank reference (UTR)"><input id="rf-ref" className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      </div>
      <Problem text={err} />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className={crm.btn} onClick={onClose}>Cancel</button>
        <button type="button" className={crm.btnPrimary} disabled={busy} onClick={async () => {
          const n = Math.round(Number(amount) || 0);
          if (n <= 0 || !on || !reference.trim()) return setErr("The amount, the date and the bank reference.");
          if (n > (doc.amount || 0)) return setErr(`A refund above the credit note (${rs(doc.amount)}) is not this credit note.`);
          setBusy(true);
          setErr(null);
          try {
            await onSaved({ doc, amount: n, on, reference: reference.trim() });
          } catch (e) {
            setErr(errText(e));
          } finally {
            setBusy(false);
          }
        }}>Record the refund</button>
      </div>
    </section>
  );
}

function Figure({ label, value, sub, alert, testId }: { label: string; value: string; sub?: string; alert?: boolean; testId?: string }) {
  return (
    <div className={cn(crm.panel, "p-3.5")}>
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold leading-none", crm.num, alert && "text-destructive")} data-testid={testId}>{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ── Renewals ────────────────────────────────────────────────────────────── */

const CARE_STEPS = ["t45", "t30", "t14", "t7", "t0", "t3", "t7g", "t30h", "amc7", "amc15", "amc45"];

/** The renewal ladder step due next for one row (the earliest not snoozed or done). */
export function stepFor(item: RenewalItem, tasks: ClientTask[], snoozes: Record<string, string> | undefined, today: string): ClientTask | null {
  const prefixes = item.what === "care_plan" ? CARE_STEPS.map((s) => `${item.clientId}:${s}`) : [`${item.clientId}:${item.what}`];
  return tasks
    .filter((t) => t.clientId === item.clientId && !t.projectId && prefixes.some((p) => t.id.startsWith(p)) && !snoozedTask(t, snoozes, today))
    .sort((a, b) => a.due.localeCompare(b.due))[0] || null;
}

function RenewalsView() {
  const { data, tasks, today } = useClients();
  const items = renewalItems(data.clients);
  if (!items.length) {
    return <EmptyState title="No renewal dates yet" body="A care plan, and the domain, hosting, SSL and e-mail dates on a client's record (Renewal dates on the client), come up here and in Today before they are due." />;
  }
  return (
    <ul className="space-y-2" data-testid="clients-renewals">
      {items.map((it) => {
        const cl = data.clients.find((c) => c.id === it.clientId);
        const step = stepFor(it, tasks, cl?.snoozed, today);
        const soon = it.date <= addDays(today, 60) && it.date >= today;
        const past = it.date < today;
        return (
          <li key={`${it.clientId}:${it.what}`} className={cn(crm.panel, "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2")} data-testid="renewal-row" data-what={it.what}>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium"><Link to={CRM.client(it.clientId)} className="hover:underline">{it.client}</Link> · {it.label}{it.provider ? ` (${it.provider})` : ""}</p>
              <p className={cn("text-[12px]", past ? "font-medium text-destructive" : soon ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                Renews {fmtDate(it.date)}{it.fee ? `, ${rs(it.fee)}` : ""}{step ? ` · next: ${step.label} (${step.due <= today ? (step.due === today ? "today" : `due ${fmtDate(step.due)}`) : fmtDate(step.due)})` : ""}
              </p>
            </div>
            {step && step.action.type !== "note" && <Link to={taskHref(step)} className={cn(crm.btnPrimary, "h-8 max-md:h-10")} data-testid="renewal-open">Open</Link>}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Won leads without a client file (10.2) ─────────────────────────────── */

function WonWithoutFile() {
  const { data } = useClients();
  const { leads, events, addEvent } = useCrmData();
  const [opening, setOpening] = useState<OutreachLead | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const hidden = useMemo(() => new Set(events.filter((e) => e.type === "note" && (e.detail || "").startsWith(NOT_A_CLIENT)).map((e) => e.leadId)), [events]);
  const waiting = leads.filter((l) => l.status === "won" && !data.clients.some((c) => c.leadId === l.id) && !hidden.has(l.id));
  if (opening) return <div className="mb-4"><OpenClientFileDialog lead={opening} onClose={() => setOpening(null)} /></div>;
  if (!waiting.length) return null;
  return (
    <section className={cn(crm.panel, "mb-4 p-4")} data-testid="won-without-file" aria-label="Won leads without a client file">
      <p className={crm.label}>Won leads without a client file</p>
      <ul className="mt-2 space-y-1.5">
        {waiting.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2" data-testid="won-lead" data-lead={l.id}>
            <Link to={CRM.lead(l.id)} className="min-w-0 flex-1 break-words text-[13px] font-medium hover:underline">{l.instituteName}{l.city ? <span className="font-normal text-muted-foreground">, {l.city}</span> : null}</Link>
            <button type="button" className={cn(crm.btnPrimary, "h-8 max-md:h-10")} onClick={() => setOpening(l)} data-testid="won-open">Open client file</button>
            <button type="button" className={cn(crm.btnGhost, "h-8 max-md:h-10")} data-testid="won-dismiss" onClick={async () => {
              setErr(null);
              try {
                await addEvent({ leadId: l.id, type: "note", detail: `${NOT_A_CLIENT} (hidden from Clients > Won leads without a client file).` });
              } catch (e) {
                setErr(errText(e));
              }
            }}>Not a client</button>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="mt-2 text-[12px] text-destructive">{err}</p>}
    </section>
  );
}

/* ── Add client (4.13): a client with no project, for care plans and renewals ─ */

function AddClient({ onClose }: { onClose: () => void }) {
  const { act } = useClients();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [kind, setKind] = useState<LeadKind>("other");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState<"hinglish" | "en">("hinglish");
  const [india, setIndia] = useState<"" | "yes" | "no">("");
  const [monthly, setMonthly] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    if (!orgName.trim()) return setErr("The business name.");
    if (!india) return setErr("Client in India? (decision 16: outside India the MSA and the export invoice govern).");
    setBusy(true);
    setErr(null);
    try {
      const cl = await act((s) => s.createClient({
        orgName: orgName.trim(), kind, contactName: contactName.trim() || undefined, phone: phone.trim() || undefined, whatsapp: phone.trim() || undefined,
        email: email.trim() || undefined, city: city.trim() || undefined, language, inIndia: india === "yes", monthlyPlan: monthly || undefined,
        notes: notes.trim() || undefined, portfolioOptOut: null,
      }));
      await act((s) => s.addEvent({ clientId: cl.id, projectId: null, type: "note", detail: `Client added by hand, with no project file${monthly ? " (a monthly website plan)" : ""}: contacts, care plan, renewals and notes` }));
      onClose();
      navigate(CRM.client(cl.id));
    } catch (e) {
      setErr(errText(e));
      setBusy(false);
    }
  };
  return (
    <section className={cn(crm.panel, "mb-4 p-4")} data-testid="add-client" aria-label="Add client">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold">Add client</p>
          <p className="text-[12px] text-muted-foreground">A client with no project file: the clients Ideovent already has, for a care plan, renewal dates and a win-back reminder, and a monthly-plan client (no project file in this pass). A project opens from a lead.</p>
        </div>
        <button type="button" className={crm.btnGhost} onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field id="ac-name" label="Business name"><input id="ac-name" className={inputCls} value={orgName} onChange={(e) => setOrgName(e.target.value)} data-testid="add-client-name" /></Field>
        <Field id="ac-kind" label="Kind">
          <select id="ac-kind" className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as LeadKind)}>
            {LEAD_KIND_VALUES.map((k) => <option key={k} value={k}>{LEAD_KIND_LABELS[k]}</option>)}
          </select>
        </Field>
        <Field id="ac-contact" label="Contact name"><input id="ac-contact" className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
        <Field id="ac-phone" label="Phone (WhatsApp)"><input id="ac-phone" type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field id="ac-email" label="E-mail"><input id="ac-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field id="ac-city" label="City"><input id="ac-city" className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        <Field id="ac-lang" label="Language for messages">
          <select id="ac-lang" className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value as "hinglish" | "en")}><option value="hinglish">Hinglish</option><option value="en">English</option></select>
        </Field>
        <fieldset>
          <legend className="block text-[12px] font-medium text-muted-foreground">Client in India?</legend>
          <div className="mt-1 flex gap-3 text-[13px]">
            <label className="flex min-h-9 items-center gap-1.5"><input type="radio" name="ac-india" checked={india === "yes"} onChange={() => setIndia("yes")} data-testid="add-client-india" /> Yes</label>
            <label className="flex min-h-9 items-center gap-1.5"><input type="radio" name="ac-india" checked={india === "no"} onChange={() => setIndia("no")} /> No, outside India</label>
          </div>
        </fieldset>
        <label className="flex min-h-9 items-center gap-2 text-[13px] sm:col-span-2"><input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} /> A monthly website plan (no project file in this pass)</label>
        <Field id="ac-notes" label="Notes" className="sm:col-span-2"><textarea id="ac-notes" rows={2} className={cn(inputCls, "h-auto py-2")} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
      <Problem text={err} />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className={crm.btn} onClick={onClose}>Cancel</button>
        <button type="button" className={crm.btnPrimary} disabled={busy} onClick={() => void save()} data-testid="add-client-save">Add the client</button>
      </div>
    </section>
  );
}
