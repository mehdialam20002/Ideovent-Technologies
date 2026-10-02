import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import { fmtDate, fmtDateTime } from "@/admin/outreach/ui";
import { teamDemoUrl } from "@/lib/demo/opens";
import { CRM } from "../nav";
import { crm, StatusDot } from "../ui";
import { cn } from "@/lib/utils";
import { kindLabel, SOURCE_LABEL, type DemoItem, type DemoSort, type DemoSortKey } from "./model";
import { DemoActionsCell, type RowHandlers } from "./DemoActionsCell";

const STATUS_CLS: Record<string, string> = {
  sent: "text-success",
  draft: "text-warning",
  free: "text-muted-foreground",
  closed: "text-muted-foreground",
};
const STATUS_TEXT: Record<string, string> = { sent: "Sent", draft: "Draft", free: "Free", closed: "Closed" };

const COLS: { key: DemoSortKey; label: string; right?: boolean; hint?: string }[] = [
  { key: "institute", label: "Institute" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "created", label: "Created" },
  { key: "lead", label: "Lead" },
  { key: "opens", label: "Opens", right: true, hint: "Opens of the link by the people it was sent to. Opens from the team's own browsers are never counted." },
  { key: "fresh", label: "Since contact", right: true },
  { key: "lastOpen", label: "Last opened" },
];

export function DemoTable({ items, sort, onSort, h }: { items: DemoItem[]; sort: DemoSort; onSort: (k: DemoSortKey) => void; h: RowHandlers }) {
  return (
    <div className={cn(crm.panel, "relative hidden overflow-x-auto lg:block")}>
      <table className={crm.table} data-testid="demo-table">
        <thead>
          <tr>
            {COLS.map((c) => {
              const on = sort.key === c.key;
              return (
                <th key={c.key} className={cn(crm.th, c.right && "text-right", "first:rounded-tl-xl")} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => onSort(c.key)} title={c.hint} className={cn("inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on && "text-foreground")}>
                    {c.label}
                    {on && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                  </button>
                </th>
              );
            })}
            <th className={cn(crm.th, "rounded-tr-xl text-right")}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.demo.id} data-testid="demo-row" className="hover:bg-muted/40">
              <td className={cn(crm.td, "py-2", "max-w-[240px]")}>
                <span className="block truncate font-medium" title={i.demo.instituteName}>{i.demo.instituteName || i.demo.slug}</span>
                {/* A sent demo's address opens its live page as a TEAM PREVIEW (?team=1): looking
                    at it from the CRM never counts as the prospect's open. The name stays the
                    first span: e2e-crm reads it from there. */}
                <span className="block truncate text-[12px] text-muted-foreground">
                  {i.status === "sent" ? (
                    <a href={teamDemoUrl(i.demo.slug)} target="_blank" rel="noopener noreferrer" data-testid="demo-live-link"
                      title="Open the live link. Opening it from here never counts as an open."
                      className="rounded hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      /site/{i.demo.slug}
                    </a>
                  ) : (
                    `/site/${i.demo.slug}`
                  )}
                  {i.demo.city ? ` · ${i.demo.city}` : ""}
                </span>
              </td>
              <td className={cn(crm.td, "py-2", STATUS_CLS[i.status])}>{STATUS_TEXT[i.status] || i.status}</td>
              <td className={cn(crm.td, "py-2", "text-muted-foreground")}>
                <span className="block">{SOURCE_LABEL[i.source]}</span>
                <span className="block text-[12px]">{kindLabel(i.demo.kind)}</span>
              </td>
              <td className={cn(crm.td, "py-2", crm.num, "text-muted-foreground")}>{i.created ? shortDate(i.created) : "-"}</td>
              <td className={cn(crm.td, "py-2", "max-w-[180px]")}>
                {i.lead ? (
                  <Link to={CRM.lead(i.lead.id)} className="inline-flex max-w-full items-center gap-1.5 hover:underline">
                    <StatusDot status={i.lead.status} />
                    <span className="truncate">{i.lead.instituteName}</span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">No lead</span>
                )}
              </td>
              <td className={cn(crm.td, "py-2", crm.num, "text-right", i.opens > 0 && "font-medium")}>{i.opens}</td>
              <td className={cn(crm.td, "py-2", crm.num, "text-right", i.freshOpens > 0 && "font-medium text-primary")}>{i.lead ? i.freshOpens : "-"}</td>
              <td className={cn(crm.td, "py-2", crm.num, "text-muted-foreground")}>{i.lastOpenAt ? fmtDateTime(i.lastOpenAt) : "Never"}</td>
              <td className={cn(crm.td, "py-2", "text-right")}><DemoActionsCell item={i} h={h} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "27 Sep", with the year only when it is not this year. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const same = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(same ? {} : { year: "numeric" }) });
}

/** Phones: one card per demo, nothing cut off, actions at 44px. */
export function DemoCards({ items, h }: { items: DemoItem[]; h: RowHandlers }) {
  return (
    <ul className="grid gap-2 lg:hidden" data-testid="demo-cards">
      {items.map((i) => (
        <li key={i.demo.id} className={cn(crm.panel, "p-3")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words text-[14px] font-medium">{i.demo.instituteName || i.demo.slug}</p>
              <p className="break-all text-[12px] text-muted-foreground">/site/{i.demo.slug}</p>
            </div>
            <span className={cn("shrink-0 text-[12px] font-medium", STATUS_CLS[i.status])}>{STATUS_TEXT[i.status] || i.status}</span>
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {[SOURCE_LABEL[i.source], kindLabel(i.demo.kind), i.demo.city, i.created ? fmtDate(i.created) : ""].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-[13px]">
            <span className={crm.num}>{i.opens}</span> {i.opens === 1 ? "open" : "opens"}
            {i.lastOpenAt ? <span className="text-muted-foreground">, last {fmtDateTime(i.lastOpenAt)}</span> : null}
            {i.lead && i.freshOpens > 0 ? <span className="text-primary">, {i.freshOpens} since contact</span> : null}
          </p>
          <p className="mt-1 text-[13px]">
            {i.lead ? (
              <Link to={CRM.lead(i.lead.id)} className="inline-flex min-h-11 items-center gap-1.5 text-primary hover:underline">
                <StatusDot status={i.lead.status} /> {i.lead.instituteName}
              </Link>
            ) : (
              <span className="text-muted-foreground">No lead yet</span>
            )}
          </p>
          <div className="mt-2 border-t border-border/60 pt-2">
            <DemoActionsCell item={i} h={h} compact />
          </div>
        </li>
      ))}
    </ul>
  );
}
