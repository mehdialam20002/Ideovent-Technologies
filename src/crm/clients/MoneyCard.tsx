import { contractValueOf, counts, docBalance, findLaunchInvoice, overdueDocs, receivedTotal } from "@/lib/clients/money";
import { daysBetween } from "@/lib/clients/numbering";
import type { ProjectCtx } from "@/lib/clients/stages";
import { moneyTasks, terminationRightFrom } from "@/lib/clients/tasks";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { day, rs } from "./shared";

export const NEVER_DONE = [
  "Never take a live site down.",
  "Never withhold the domain.",
  "Never delete their data or backups.",
  "Never discuss the debt with anyone outside the two parties, or make it public.",
  "Never threaten a criminal case.",
];

/**
 * THE MONEY CARD (client-process-spec 5.5): contract value; received; due now and when; overdue by how
 * many days; the next ladder step; the late-payment rule in one line; while anything is overdue, the
 * things never done; every override that touches money, in red; the GST line.
 */
export function MoneyCard({ c, onRecord }: { c: ProjectCtx; onRecord?: () => void }) {
  const p = c.project;
  const value = contractValueOf(p);
  const projectDocs = c.docs.filter((d) => d.projectId === p.id);
  const received = receivedTotal(c.payments.filter((x) => x.projectId === p.id));
  const open = projectDocs.filter((d) => counts(d, c.docs) && docBalance(d, c.docs, c.payments) > 0);
  const dueNow = open.reduce((s, d) => s + Math.max(0, docBalance(d, c.docs, c.payments)), 0);
  const overdue = overdueDocs(projectDocs, c.payments, c.today);
  const oldest = overdue.sort((a, b) => (a.dueOn || "").localeCompare(b.dueOn || ""))[0];
  const next = moneyTasks(c).sort((a, b) => a.due.localeCompare(b.due))[0];
  const inv = findLaunchInvoice(p.id, c.docs);
  const termination = terminationRightFrom(inv);
  const moneyOverrides = (p.gateOverrides || []).filter((o) => ["l_cutover", "h_source", "h_access", "q_invoice", "l_paid"].includes(o.item || "") || o.stage === "launch");
  return (
    <section className={cn(crm.panel, "p-4")} data-testid="money-card" aria-label="Money">
      <p className={crm.label}>Money</p>
      {c.client.inIndia === false ? (
        <p className="mt-2 text-[13px]">Clients outside India: the MSA and the export invoice in 03-legal-docs govern (not in the CRM yet).</p>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
            <div><dt className="text-muted-foreground">Contract value</dt><dd className={cn("text-[15px] font-semibold", crm.num)} data-testid="money-value">{rs(value)}</dd></div>
            <div><dt className="text-muted-foreground">Received</dt><dd className={cn("text-[15px] font-semibold", crm.num)} data-testid="money-received">{rs(received)}</dd></div>
            <div>
              <dt className="text-muted-foreground">Due now</dt>
              <dd className={cn("text-[15px] font-semibold", crm.num)} data-testid="money-due">{rs(dueNow)}</dd>
              {oldest?.dueOn && <dd className="text-[11px] font-medium text-destructive" data-testid="money-overdue">overdue {daysBetween(oldest.dueOn, c.today)} days</dd>}
            </div>
          </dl>
          {open.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[12px]">
              {open.map((d) => <li key={d.id}><span className="font-mono">{d.number}</span>: {rs(Math.max(0, docBalance(d, c.docs, c.payments)))} due {day(d.dueOn)}</li>)}
            </ul>
          )}
          {next && <p className="mt-2 text-[12px]" data-testid="money-next">Next: {next.label}, {day(next.due)}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">Overdue amounts carry 1.5% a month from the due date (cl. 5.6). More than 7 days overdue, work may pause on written notice (cl. 5.7).</p>
          {termination && overdue.some((d) => d.id === inv?.id) && c.today >= termination && (
            <p className="mt-1 text-[11px] font-medium text-destructive">Payment more than 30 days overdue: the right to terminate exists (cl. 13.5). Terminating, any write-off, MSME Samadhaan, a 43B(h) letter or an advocate needs both partners in writing (SOP-09 note 5).</p>
          )}
          {overdue.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px]" data-testid="never-done">{NEVER_DONE.map((x) => <li key={x}>{x}</li>)}</ul>
          )}
          {moneyOverrides.length > 0 && (
            <ul className="mt-2 space-y-0.5 rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive" data-testid="money-overrides">
              {moneyOverrides.map((o, i) => <li key={i}>Overridden{o.item ? ` (${o.item})` : ""} {day(o.at)}: {o.reason}</li>)}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">GST not applicable. Supplier is not registered under GST.</p>
          {onRecord && <button type="button" className={cn(crm.btnPrimary, "mt-3 w-full")} onClick={onRecord} data-testid="record-payment-open">Record payment</button>}
        </>
      )}
    </section>
  );
}
