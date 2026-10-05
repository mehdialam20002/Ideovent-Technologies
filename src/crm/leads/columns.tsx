import type { ReactNode } from "react";
import { Flame, Mail, MessageCircle, Phone } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { maskEmail, maskPhone } from "@/lib/outreach/access";
import { isMetaLead } from "@/lib/meta/fields";
import { cityOf } from "@/lib/outreach/city";
import { SourceBadge } from "../meta/SourceBadge";
import { dueLabel, fmtDate, KIND_LABEL, prettyPhone } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { crm, STATUS_HEX } from "../ui";
import { sinceLabel, type LeadRow, type SortKey } from "./leadQuery";

/** Why a lead cannot move to a status for the person signed in (null: it can). From leadQuery statusBlock. */
export type StatusBlock = (lead: OutreachLead, to: LeadStatus) => string | null;

/**
 * Inline status change. A native select: keyboard and screen readers get it
 * for free. A status this person may not set is listed but disabled (with
 * why, in its label), so nobody picks a change the database would refuse.
 */
export function StatusSelect({ status, onChange, className, label, blocked }: {
  status: LeadStatus; onChange: (s: LeadStatus) => void; className?: string; label: string;
  /** Why each other status is refused (null: allowed). */
  blocked?: (to: LeadStatus) => string | null;
}) {
  const why = (s: LeadStatus) => (blocked && s !== status ? blocked(s) : null);
  const stuck = Boolean(blocked) && LEAD_STATUSES.every((s) => s === status || why(s));
  const reason = stuck ? LEAD_STATUSES.map(why).find(Boolean) : undefined;
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute left-2 h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_HEX[status] }} />
      <select
        aria-label={label}
        value={status}
        disabled={stuck}
        title={reason || undefined}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value as LeadStatus)}
        className="h-7 cursor-pointer appearance-none rounded-md border border-transparent bg-transparent pl-6 pr-2 text-[13px] hover:border-border hover:bg-background focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-100 max-md:h-11"
      >
        {LEAD_STATUSES.map((s) => {
          const no = why(s);
          return (
            <option key={s} value={s} disabled={Boolean(no)}>
              {LEAD_STATUS_LABELS[s]}{no ? " (Mehdi)" : ""}
            </option>
          );
        })}
      </select>
    </span>
  );
}

/** "Untouched": assigned more than 24 hours ago and nothing written since by that person (spec 10.3). */
export function UntouchedChip() {
  return (
    <span title="Assigned more than 24 hours ago, and nothing written on it since"
      className="ml-1.5 inline-flex h-[18px] items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 align-middle text-[10.5px] font-medium text-amber-800 dark:text-amber-300">
      Untouched
    </span>
  );
}

/** A contact as a list shows it: in full for Mehdi and admins, masked for members (the lead page shows it, and logs it). */
export function contactText(lead: OutreachLead, mask?: boolean): string {
  const phone = lead.phone || lead.whatsapp;
  if (mask) return maskPhone(phone) || maskEmail(lead.email);
  return prettyPhone(phone) || lead.email || "";
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

/** What a cell may need besides its row. */
export interface CellCtx {
  now: Date;
  setStatus: (id: string, s: LeadStatus) => void;
  /** Members: phone and e-mail masked in lists. */
  mask?: boolean;
  /** Statuses this person may not set on this lead (the inline status select disables them). */
  statusBlock?: StatusBlock;
}

export interface Column {
  id: ColId;
  label: string;
  /** Always shown (cannot be hidden). */
  fixed?: boolean;
  defaultHidden?: boolean;
  /** Only with the team (0011): before it, "Assigned" already shows the old label. */
  team?: boolean;
  className?: string;
  cell: (r: LeadRow, ctx: CellCtx) => ReactNode;
}

const dash = <span className="text-muted-foreground">-</span>;

export const COLUMNS: Column[] = [
  {
    id: "name", label: "Institute", fixed: true, className: "min-w-[14rem] max-w-[20rem]",
    /* The first inner span is the name alone (the e2e suites read it); the chips sit on the second line
       (a Meta lead's Instagram / Facebook chip first: meta-leads-spec 6.2). */
    cell: (r) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{r.lead.instituteName}</span>
        {(r.lead.contactName || r.untouched || isMetaLead(r.lead)) && (
          <span className="block truncate text-[12px] leading-tight text-muted-foreground">
            <SourceBadge lead={r.lead} className="mr-1.5" />
            {r.lead.contactName}
            {r.untouched && <UntouchedChip />}
          </span>
        )}
      </span>
    ),
  },
  {
    id: "status", label: "Status", fixed: true,
    cell: (r, c) => (
      <StatusSelect status={r.lead.status} label={`Status of ${r.lead.instituteName}`} onChange={(s) => c.setStatus(r.lead.id, s)}
        blocked={c.statusBlock ? (to) => c.statusBlock(r.lead, to) : undefined} />
    ),
  },
  /* The town (city.ts cityOf); the whole address the field holds is in the tooltip and on the lead. */
  { id: "city", label: "City", cell: (r) => (cityOf(r.lead) ? <span title={r.lead.city !== cityOf(r.lead) ? r.lead.city : undefined}>{cityOf(r.lead)}</span> : dash) },
  { id: "kind", label: "Kind", cell: (r) => KIND_LABEL[r.lead.kind] || r.lead.kind },
  {
    id: "source", label: "Source", defaultHidden: true,
    cell: (r) =>
      isMetaLead(r.lead) ? (
        <span className="inline-flex items-center gap-1.5"><SourceBadge lead={r.lead} />{r.lead.source}</span>
      ) : (
        r.lead.source || dash
      ),
  },
  {
    id: "contact", label: "Phone / Email", defaultHidden: true, className: "max-w-[14rem]",
    cell: (r, c) => <span className="block truncate">{contactText(r.lead, c.mask) || dash}</span>,
  },
  { id: "demo", label: "Demo", cell: (r) => <DemoCell row={r} /> },
  {
    id: "lastContact", label: "Last contact",
    cell: (r, c) => (r.lastContactAt ? <span title={fmtDate(r.lastContactAt)}>{sinceLabel(r.lastContactAt, c.now)}</span> : <span className="text-muted-foreground">Never</span>),
  },
  { id: "channel", label: "Channel", cell: (r) => <ChannelIcon channel={r.lastChannel} /> },
  { id: "next", label: "Next action", cell: (r, c) => <NextAction row={r} now={c.now} /> },
  {
    id: "assigned", label: "Assigned",
    /* The person who works it (the team); before the team, the old free-text label as before. */
    cell: (r) =>
      r.assigneeName !== undefined ? (
        r.lead.assigneeId ? r.assigneeName : <span className="text-muted-foreground">Unassigned</span>
      ) : (
        r.lead.assignedTo || dash
      ),
  },
  { id: "oldLabel", label: "Old label", defaultHidden: true, team: true, cell: (r) => r.lead.assignedTo || dash },
  { id: "created", label: "Created", cell: (r) => <span className={crm.num}>{fmtDate(r.lead.createdAt)}</span> },
];

const COLS_KEY = "ideovent_crm_leads_cols";
/**
 * Columns added after people had saved their choice: hidden for them too
 * until they show one. The saved value is { v: 2, hidden } since 1 Oct 2026;
 * a plain list is the earlier format.
 */
const ADDED_LATER: ColId[] = ["oldLabel"];

export function loadHidden(): Set<ColId> {
  try {
    const raw = localStorage.getItem(COLS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as ColId[] | { v: number; hidden: ColId[] };
      if (Array.isArray(saved)) return new Set([...saved, ...ADDED_LATER]);
      if (saved && Array.isArray(saved.hidden)) return new Set(saved.hidden);
    }
  } catch {
    /* private window or blocked storage: defaults */
  }
  return new Set(COLUMNS.filter((c) => c.defaultHidden).map((c) => c.id));
}

export function saveHidden(h: Set<ColId>): void {
  try {
    localStorage.setItem(COLS_KEY, JSON.stringify({ v: 2, hidden: [...h] }));
  } catch {
    /* ignore */
  }
}
