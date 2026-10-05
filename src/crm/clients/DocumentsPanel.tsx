import { useState } from "react";
import { docStatusText } from "@/lib/clients/register";
import { DOC_TITLES } from "@/lib/clients/docs/builders";
import { proformaRefusals, type ProjectCtx } from "@/lib/clients/stages";
import type { CrmDocument } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import type { DocRequest } from "./DocumentDialog";
import { day, rs } from "./shared";

const NEW: { label: string; req: DocRequest }[] = [
  { label: "Quotation", req: { kind: "quotation" } },
  { label: "Proforma for the advance", req: { kind: "proforma", milestone: "ADVANCE_50" } },
  { label: "Proforma, part 2 of a split advance", req: { kind: "proforma", milestone: "ADVANCE_50", data: { part: 2 } } },
  { label: "Proforma for a change request's advance", req: { kind: "proforma", milestone: "CHANGE_REQUEST" } },
  { label: "Welcome pack", req: { kind: "welcome" } },
  { label: "Change request form", req: { kind: "change_request" } },
  { label: "Launch invoice", req: { kind: "invoice", milestone: "LAUNCH_50" } },
  { label: "Invoice for work to date (cl. 4.5)", req: { kind: "invoice", milestone: "OTHER", data: { workToDate: true } } },
  { label: "Receipt for a payment", req: { kind: "receipt" } },
  { label: "Handover document", req: { kind: "handover" } },
  { label: "Care plan options", req: { kind: "care_plan" } },
  { label: "Closing letter", req: { kind: "closing" } },
  { label: "Credit note", req: { kind: "credit_note" } },
  { label: "Care plan invoice", req: { kind: "invoice", milestone: "AMC" } },
];

/** The register's words for a document's state (register.ts docStatusText: one rule for the panel and Clients > Money). */
export function docStatus(d: CrmDocument, docs: CrmDocument[], c: Pick<ProjectCtx, "payments" | "today">): string {
  return docStatusText(d, docs, c.payments, c.today);
}

/**
 * DOCUMENTS (client-process-spec 6, 10.3): this project's documents and the client's care plan invoices, and New.
 * The advance is billed once (stages.ts proformaRefusals): part 2 of a split advance is offered only when the project
 * has a split advance, and an advance proforma the project cannot have now says so in the list ("cannot be made
 * now"); opened, its dialog gives the reason and Issue stays off.
 */
export function DocumentsPanel({ c, onOpen }: { c: ProjectCtx; onOpen: (req: DocRequest) => void }) {
  const [pick, setPick] = useState("");
  const docs = [...c.docs].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const offered = NEW.filter((n) => !(n.req.data?.part === 2 && !c.project.splitAdvance));
  const notNow = (n: (typeof NEW)[number]) => n.req.kind === "proforma" && n.req.milestone === "ADVANCE_50"
    && proformaRefusals(c, { kind: "proforma", milestone: "ADVANCE_50", data: n.req.data || {} }).length > 0;
  return (
    <div data-testid="documents-panel">
      <ul className="space-y-1">
        {docs.map((d) => (
          <li key={d.id}>
            <button type="button" className="flex w-full flex-wrap items-center gap-x-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-muted" onClick={() => onOpen({ kind: d.kind, milestone: d.milestone, docId: d.id })} data-testid="doc-row" data-kind={d.kind} data-status={d.status}>
              <span className="font-medium">{DOC_TITLES[d.kind]}{d.data?.part === 2 ? " (part 2)" : ""}{d.data?.crNo ? ` ${d.data.crNo}` : ""}</span>
              {d.number && <span className="font-mono">{d.number}</span>}
              <span className={cn("text-muted-foreground", /Overdue/.test(docStatus(d, c.docs, c)) && "font-medium text-destructive")}>{docStatus(d, c.docs, c)}</span>
              {d.amount !== null && <span className="ml-auto tabular-nums">{rs(d.amount)}</span>}
              {d.issuedOn && <span className="text-muted-foreground">{day(d.issuedOn)}</span>}
            </button>
          </li>
        ))}
        {!docs.length && <li className="text-[12px] text-muted-foreground">No documents yet.</li>}
      </ul>
      <div className="mt-2 flex gap-2">
        <select aria-label="New document" className={crm.input} value={pick} onChange={(e) => setPick(e.target.value)} data-testid="new-doc-kind">
          <option value="">New document...</option>
          {offered.map((n) => <option key={n.label} value={n.label}>{n.label}{notNow(n) ? " (cannot be made now)" : ""}</option>)}
        </select>
        <button type="button" className={crm.btn} disabled={!pick} onClick={() => { const n = offered.find((x) => x.label === pick); if (n) onOpen(n.req); setPick(""); }} data-testid="new-doc-open">Make</button>
      </div>
    </div>
  );
}
