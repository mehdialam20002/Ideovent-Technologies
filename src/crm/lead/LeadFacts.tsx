import { Fragment, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { fmtDate, fmtDateTime, KIND_LABEL, prettyPhone } from "@/admin/outreach/ui";
import { useCrmData } from "../useCrmData";
import { crm, StatusDot } from "../ui";
import { cn } from "@/lib/utils";

/** Break a long email after "@" and before dots, not mid-word. */
function softBreaks(text: string) {
  return text.split(/(?<=@)|(?=\.)/).map((p, i) => <Fragment key={i}>{i > 0 && <wbr />}{p}</Fragment>);
}

/** YYYY-MM-DD in local time for <input type="date">. */
function toDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The right column's first card: status (through setStatus, so history and
 * the win metric stay right), next action date, the facts, and tags.
 */
export function LeadFacts({ lead }: { lead: OutreachLead }) {
  const { setStatus, updateLead, now } = useCrmData();
  const [err, setErr] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const wa = lead.whatsapp || lead.phone;
  const due = lead.nextActionAt ? new Date(lead.nextActionAt) : null;
  const late = due && due.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message || "That did not save.");
    }
  };
  const addTag = () => {
    const t = tag.trim();
    if (!t || (lead.tags || []).includes(t)) return setTag("");
    void run(() => updateLead(lead.id, { tags: [...(lead.tags || []), t] }));
    setTag("");
  };

  return (
    <section className={cn(crm.panel, crm.panelPad, "space-y-4")} aria-label="Lead facts" data-testid="lead-facts">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lf-status" className={crm.label}>Status</label>
          <div className="relative mt-1">
            <StatusDot status={lead.status} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <select id="lf-status" className={cn(crm.input, "pl-7")} value={lead.status}
              onChange={(e) => void run(() => setStatus(lead.id, e.target.value as LeadStatus))}>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="lf-next" className={crm.label}>Next action</label>
          <input id="lf-next" type="date" className={cn(crm.input, "mt-1", late && "text-destructive")} value={toDateInput(lead.nextActionAt)}
            onChange={(e) => {
              const v = e.target.value;
              void run(() => updateLead(lead.id, { nextActionAt: v ? new Date(`${v}T10:00:00`).toISOString() : undefined }));
            }} />
        </div>
      </div>
      {err && <p role="alert" className="text-[12px] text-destructive">{err}</p>}

      <dl className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
        <Fact k="Phone">{lead.phone ? <a className="hover:underline" href={`tel:${lead.phone}`}>{prettyPhone(lead.phone)}</a> : null}</Fact>
        <Fact k="WhatsApp">{wa ? <a className="hover:underline" href={`https://wa.me/${wa.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{prettyPhone(wa)}</a> : null}</Fact>
        <Fact k="Email">{lead.email ? <a className="[overflow-wrap:anywhere] hover:underline" href={`mailto:${lead.email}`}>{softBreaks(lead.email)}</a> : null}</Fact>
        <Fact k="Website">{lead.website ? <a className="[overflow-wrap:anywhere] text-primary hover:underline" href={/^https?:/.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer">{lead.website.replace(/^https?:\/\//, "")}</a> : null}</Fact>
        <Fact k="Kind">{KIND_LABEL[lead.kind]}</Fact>
        <Fact k="City">{[lead.city, lead.state].filter(Boolean).join(", ")}</Fact>
        <Fact k="Contact">{lead.contactName}</Fact>
        <Fact k="Source">{lead.source}</Fact>
        <Fact k="Assigned">{lead.assignedTo}</Fact>
        <Fact k="Created">{fmtDate(lead.createdAt)}</Fact>
        <Fact k="Last contact">{lead.lastContactedAt ? fmtDateTime(lead.lastContactedAt) : "Never"}</Fact>
      </dl>

      <div>
        <p className={crm.label}>Tags</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {(lead.tags || []).map((t) => (
            <span key={t} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted/50 pl-2 pr-1 text-[12px]">
              {t}
              <button type="button" aria-label={`Remove tag ${t}`} className="rounded p-0.5 hover:bg-muted"
                onClick={() => void run(() => updateLead(lead.id, { tags: (lead.tags || []).filter((x) => x !== t) }))}>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <form className="min-w-[8rem] flex-1" onSubmit={(e) => { e.preventDefault(); addTag(); }}>
            <label htmlFor="lf-tag" className="sr-only">Add a tag</label>
            <input id="lf-tag" className={cn(crm.input, "h-8")} placeholder="Add a tag" value={tag} onChange={(e) => setTag(e.target.value)} />
          </form>
        </div>
      </div>
    </section>
  );
}

function Fact({ k, children }: { k: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-muted-foreground">-</span>}</dd>
    </>
  );
}
