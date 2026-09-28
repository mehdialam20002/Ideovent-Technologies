import type { ReactNode } from "react";
import { Flame, Mail, MessageCircle, Phone } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/outreach/types";
import { dueLabel, fmtDate, KIND_LABEL, prettyPhone } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { crm, STATUS_HEX } from "../ui";
import { sinceLabel, type LeadRow, type SortKey } from "./leadQuery";

/** Inline status change. A native select: keyboard and screen readers get it for free. */
export function StatusSelect({ status, onChange, className, label }: {
  status: LeadStatus; onChange: (s: LeadStatus) => void; className?: string; label: string;
}) {
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute left-2 h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_HEX[status] }} />
      <select
        aria-label={label}
        value={status}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value as LeadStatus)}
        className="h-7 cursor-pointer appearance-none rounded-md border border-transparent bg-transparent pl-6 pr-2 text-[13px] hover:border-border hover:bg-background focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-11"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
        ))}
      </select>
    </span>
  );
}

export function ChannelIcon({ channel }: { channel?: string }) {
  if (!channel) return <span className="text-muted-foreground">-</span>;
  const Icon = channel === "whatsapp" ? MessageCircle : channel === "email" ? Mail : Phone;
  const label = channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "Email" : "Call";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={cn("h-3.5 w-3.5", channel === "whatsapp" ? "text-[#16a34a]" : "text-muted-foreground")} aria-hidden="true" /> {label}
    </span>
  );
}

export function NextAction({ row, now }: { row: LeadRow; now: Date }) {
  const iso = row.lead.nextActionAt;
  if (!iso) return <span className="text-muted-foreground">-</span>;
  const tone = row.due === "overdue" ? "font-medium text-destructive" : row.due === "today" ? "font-medium text-warning" : "";
  return (
    <span className={tone} title={fmtDate(iso)}>
      {row.due ? dueLabel(iso, now) : fmtDate(iso)}
    </span>
  );
}

export function DemoCell({ row }: { row: LeadRow }) {
  const slug = row.demo?.slug || row.lead.demoSlug;
  if (!slug) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="inline-flex max-w-[11rem] items-center gap-1.5">
      <span className="truncate text-muted-foreground">/{slug}</span>
      <span className={cn("shrink-0 rounded-full px-1.5 text-[11px] font-medium", crm.num, row.opens ? "bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted text-muted-foreground")}
        title={`${row.opens} ${row.opens === 1 ? "open" : "opens"}`}>
        {row.opens}
      </span>
      {row.hot && <Flame className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Opened since last contact" />}
    </span>
  );
}

export type ColId = SortKey;

export interface Column {
  id: ColId;
  label: string;
  /** Always shown (cannot be hidden). */
  fixed?: boolean;
  defaultHidden?: boolean;
  className?: string;
  cell: (r: LeadRow, ctx: { now: Date; setStatus: (id: string, s: LeadStatus) => void }) => ReactNode;
}

export const COLUMNS: Column[] = [
  {
    id: "name", label: "Institute", fixed: true, className: "min-w-[14rem] max-w-[20rem]",
    cell: (r) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{r.lead.instituteName}</span>
        {r.lead.contactName && <span className="block truncate text-[12px] leading-tight text-muted-foreground">{r.lead.contactName}</span>}
      </span>
    ),
  },
  {
    id: "status", label: "Status", fixed: true,
    cell: (r, c) => <StatusSelect status={r.lead.status} label={`Status of ${r.lead.instituteName}`} onChange={(s) => c.setStatus(r.lead.id, s)} />,
  },
  { id: "city", label: "City", cell: (r) => r.lead.city || <span className="text-muted-foreground">-</span> },
  { id: "kind", label: "Kind", cell: (r) => KIND_LABEL[r.lead.kind] || r.lead.kind },
  { id: "source", label: "Source", defaultHidden: true, cell: (r) => r.lead.source || <span className="text-muted-foreground">-</span> },
  {
    id: "contact", label: "Phone / Email", defaultHidden: true, className: "max-w-[14rem]",
    cell: (r) => <span className="block truncate">{prettyPhone(r.lead.phone || r.lead.whatsapp) || r.lead.email || <span className="text-muted-foreground">-</span>}</span>,
  },
  { id: "demo", label: "Demo", cell: (r) => <DemoCell row={r} /> },
  {
    id: "lastContact", label: "Last contact",
    cell: (r, c) => (r.lastContactAt ? <span title={fmtDate(r.lastContactAt)}>{sinceLabel(r.lastContactAt, c.now)}</span> : <span className="text-muted-foreground">Never</span>),
  },
  { id: "channel", label: "Channel", cell: (r) => <ChannelIcon channel={r.lastChannel} /> },
  { id: "next", label: "Next action", cell: (r, c) => <NextAction row={r} now={c.now} /> },
  { id: "assigned", label: "Assigned", cell: (r) => r.lead.assignedTo || <span className="text-muted-foreground">-</span> },
  { id: "created", label: "Created", cell: (r) => <span className={crm.num}>{fmtDate(r.lead.createdAt)}</span> },
];

const COLS_KEY = "ideovent_crm_leads_cols";

export function loadHidden(): Set<ColId> {
  try {
    const raw = localStorage.getItem(COLS_KEY);
    if (raw) return new Set(JSON.parse(raw) as ColId[]);
  } catch {
    /* private window or blocked storage: defaults */
  }
  return new Set(COLUMNS.filter((c) => c.defaultHidden).map((c) => c.id));
}

export function saveHidden(h: Set<ColId>): void {
  try {
    localStorage.setItem(COLS_KEY, JSON.stringify([...h]));
  } catch {
    /* ignore */
  }
}
