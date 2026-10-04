import { Eye, UserRound } from "lucide-react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/outreach/types";
import type { LeadOverview } from "@/lib/outreach/team";
import { dueLabel, fmtDate, KIND_LABEL } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { cityOf } from "@/lib/outreach/city";
import { crm, StatusDot } from "../ui";
import { contactText, DemoCell, NextAction, StatusSelect, UntouchedChip, type StatusBlock } from "./columns";
import { SourceBadge } from "../meta/SourceBadge";
import { sinceLabel, type LeadRow } from "./leadQuery";

/** The phone layout of the table: one card per lead, same selection and status change. */
export function LeadCards({ rows, selected, onToggle, onOpen, now, setStatus, mask, statusBlock, showAssignee }: {
  rows: LeadRow[];
  selected: Set<string>;
  onToggle: (id: string, index: number, shift: boolean) => void;
  onOpen: (id: string) => void;
  now: Date;
  setStatus: (id: string, s: LeadStatus) => void;
  /** Members: the contact line is masked (the lead page shows it in full, and logs it). */
  mask?: boolean;
  statusBlock?: StatusBlock;
  /** Mehdi and admins with the team: who works each lead. */
  showAssignee?: boolean;
}) {
  return (
    <ul className="space-y-2" aria-label="Leads">
      {rows.map((r, i) => {
        const l = r.lead;
        const sel = selected.has(l.id);
        const contact = mask ? contactText(l, true) : "";
        return (
          <li key={l.id} className={cn(crm.panel, "flex items-stretch overflow-hidden", sel && "border-primary/50 bg-primary/5")}>
            <label className="flex w-11 shrink-0 cursor-pointer items-start justify-center pt-3.5">
              <input type="checkbox" checked={sel} onChange={() => onToggle(l.id, i, false)} aria-label={`Select ${l.instituteName}`}
                className="h-5 w-5 accent-[hsl(var(--primary))]" />
            </label>
            <div className="min-w-0 flex-1 py-2.5 pr-3">
              <button type="button" onClick={() => onOpen(l.id)} className="block w-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="block truncate text-[15px] font-medium">{l.instituteName}</span>
                <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                  {/* A Meta lead's Instagram / Facebook chip (meta-leads-spec 6.2); nothing for any other lead. */}
                  <SourceBadge lead={l} className="mr-1.5" />
                  {[cityOf(l), KIND_LABEL[l.kind], r.lastContactAt ? `contacted ${sinceLabel(r.lastContactAt, now)}` : "never contacted"].filter(Boolean).join(" · ")}
                </span>
                {contact && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{contact}</span>}
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <StatusSelect status={l.status} label={`Status of ${l.instituteName}`} onChange={(s) => setStatus(l.id, s)} className="-ml-2"
                  blocked={statusBlock ? (to) => statusBlock(l, to) : undefined} />
                {l.nextActionAt && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Next: <NextAction row={r} now={now} />
                  </span>
                )}
                {(r.demo || l.demoSlug) && <DemoCell row={r} />}
                {showAssignee && r.assigneeName !== undefined && (
                  <span className={cn("inline-flex items-center gap-1", l.assigneeId ? "text-foreground" : "text-muted-foreground")}>
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">Assigned to </span>{r.assigneeName}
                  </span>
                )}
                {r.untouched && <UntouchedChip />}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * ALL LEADS, READ ONLY (spec 10.4): what a member with "See all leads" reads
 * beyond their own. Built from crm_leads_overview, which never carries a
 * phone, WhatsApp, e-mail, contact name or notes (DPDP Rules 2025, r.6):
 * name, kind, city, stage, who works it, last contact and next action. No
 * selection; opening one shows its read-only card.
 */
export function OverviewList({ rows, onOpen, now, wide }: {
  rows: LeadOverview[];
  onOpen: (id: string) => void;
  now: Date;
  wide: boolean;
}) {
  const who = (o: LeadOverview) => o.assigneeName || (o.assigneeId ? "Someone in the team" : "Unassigned");
  if (wide) {
    return (
      <div className={cn(crm.panel, "max-h-[28rem] overflow-auto")}>
        <table className={crm.table} aria-label="All leads, read only">
          <thead>
            <tr>
              {["Institute", "Kind", "City", "Stage", "Assigned to", "Last contact", "Next action"].map((h) => (
                <th key={h} scope="col" className={crm.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} tabIndex={0} className={crm.row} onClick={() => onOpen(o.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(o.id)}>
                <td className={cn(crm.td, "max-w-[18rem] truncate font-medium")}>{o.instituteName}</td>
                <td className={crm.td}>{KIND_LABEL[o.kind] || o.kind}</td>
                <td className={crm.td}>{cityOf(o) || "-"}</td>
                <td className={crm.td}><StatusDot status={o.status} className="mr-1.5" />{LEAD_STATUS_LABELS[o.status]}</td>
                <td className={crm.td}>{who(o)}</td>
                <td className={crm.td}>{o.lastContactedAt ? sinceLabel(o.lastContactedAt, now) : "Never"}</td>
                <td className={crm.td}>{o.nextActionAt ? dueLabel(o.nextActionAt, now) || fmtDate(o.nextActionAt) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <ul className="space-y-2" aria-label="All leads, read only">
      {rows.map((o) => (
        <li key={o.id}>
          <button type="button" onClick={() => onOpen(o.id)}
            className={cn(crm.panel, "block w-full min-w-0 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{o.instituteName}</span>
              <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Read only" />
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
              {[cityOf(o), KIND_LABEL[o.kind], LEAD_STATUS_LABELS[o.status], who(o)].filter(Boolean).join(" · ")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
