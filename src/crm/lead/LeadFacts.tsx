import { Fragment, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { can, crmErrorText } from "@/lib/outreach/access";
import { NO_META_CONSENT, metaConsentRefused } from "@/lib/outreach/engine";
import { fmtDate, fmtDateTime, KIND_LABEL, prettyPhone } from "@/admin/outreach/ui";
import { mayCall } from "@/admin/outreach/teamCompose";
import { useCrmData } from "../useCrmData";
import { crm, StatusDot } from "../ui";
import { ago } from "../dashboard/format";
import { AssigneePicker } from "../team/AssigneePicker";
import { LostReasonDialog } from "./LostReasonDialog";
import { statusRefusal } from "./statusRules";
import { MetaLeadFacts } from "../meta/MetaLeadFacts";
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
 *
 * THE TEAM (spec 10.3, 10.7). Who works the lead is a person: "Assigned to"
 * (the picker for Mehdi and admins; "you" for a member), "Added by", who
 * assigned it and when, "Qualified by", and the old free-text label as "Old
 * label" (Mehdi clears it). A member's status list leaves out what the
 * database refuses them (Call, Proposal, Won; anything off Do not contact),
 * and Lost asks why. A member without "May cold-call" sees the number of a
 * lead that has not replied as text, not as a call link; WhatsApp and e-mail
 * go through the compose (its checks), so for anyone but Mehdi they are text.
 * Before the team update (legacy) the card is exactly as it was.
 *
 * A lead from a Meta form who left its WhatsApp-and-phone box unticked: the
 * phone and WhatsApp are text for everyone, Mehdi included, with the reason
 * under them (NO_META_CONSENT); its Meta facts (MetaLeadFacts) follow the list.
 */
export function LeadFacts({ lead }: { lead: OutreachLead }) {
  const { setStatus, updateLead, now, me, nameOf, eventsFor, assignLeads, isMember } = useCrmData();
  const [err, setErr] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [askLost, setAskLost] = useState(false);
  const wa = lead.whatsapp || lead.phone;
  const due = lead.nextActionAt ? new Date(lead.nextActionAt) : null;
  const late = due && due.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const team = !me.legacy && Boolean(me.role);
  const owner = me.role === "owner";
  const callable = mayCall(me, lead, eventsFor(lead.id));
  // No Meta tick: no call and no WhatsApp from anyone (the compose and the call script say the same).
  const noTick = metaConsentRefused(lead);

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(crmErrorText(e) || "That did not save.");
    }
  };
  const addTag = () => {
    const t = tag.trim();
    if (!t || (lead.tags || []).includes(t)) return setTag("");
    void run(() => updateLead(lead.id, { tags: [...(lead.tags || []), t] }));
    setTag("");
  };
  const pickStatus = (s: LeadStatus) => {
    if (s === "lost" && isMember && lead.status !== "lost") return setAskLost(true);
    void run(() => setStatus(lead.id, s));
  };
  return (
    <section className={cn(crm.panel, crm.panelPad, "space-y-4")} aria-label="Lead facts" data-testid="lead-facts">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lf-status" className={crm.label}>Status</label>
          <div className="relative mt-1">
            <StatusDot status={lead.status} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <select id="lf-status" className={cn(crm.input, "pl-7")} value={lead.status}
              onChange={(e) => pickStatus(e.target.value as LeadStatus)}>
              {LEAD_STATUSES.map((s) => {
                const no = statusRefusal(me, lead.status, s);
                return <option key={s} value={s} disabled={Boolean(no)} title={no || undefined}>{LEAD_STATUS_LABELS[s]}{no ? " (Mehdi)" : ""}</option>;
              })}
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
        <Fact k="Phone">{lead.phone ? (callable ? <a className="hover:underline" href={`tel:${lead.phone}`}>{prettyPhone(lead.phone)}</a> : prettyPhone(lead.phone)) : null}</Fact>
        <Fact k="WhatsApp">{wa ? ((owner || !team) && !noTick ? <a className="hover:underline" href={`https://wa.me/${wa.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{prettyPhone(wa)}</a> : prettyPhone(wa)) : null}</Fact>
        <Fact k="Email">{lead.email ? (owner || !team ? <a className="[overflow-wrap:anywhere] hover:underline" href={`mailto:${lead.email}`}>{softBreaks(lead.email)}</a> : <span className="[overflow-wrap:anywhere]">{softBreaks(lead.email)}</span>) : null}</Fact>
        <Fact k="Website">{lead.website ? <a className="[overflow-wrap:anywhere] text-primary hover:underline" href={/^https?:/.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer">{lead.website.replace(/^https?:\/\//, "")}</a> : null}</Fact>
        <Fact k="Kind">{KIND_LABEL[lead.kind]}</Fact>
        <Fact k="City">{[lead.city, lead.state].filter(Boolean).join(", ")}</Fact>
        <Fact k="Contact">{lead.contactName}</Fact>
        <Fact k="Source">{lead.source}</Fact>
        {team ? (
          <>
            <Fact k="Assigned to">
              {can(me, "lead.assign") ? (
                <AssigneePicker value={lead.assigneeId ?? null} includeUnassigned showLoad className="h-8"
                  onChange={(to) => void run(() => assignLeads([lead.id], to))} testId="lf-assignee" />
              ) : lead.assigneeId && lead.assigneeId === me.memberId ? "You" : nameOf(lead.assigneeId)}
            </Fact>
            {lead.assignedById && lead.assignedAt && (
              <Fact k="Assigned by">{`${nameOf(lead.assignedById)}, ${ago(lead.assignedAt, now)}`}</Fact>
            )}
            <Fact k="Added by">{lead.createdById ? nameOf(lead.createdById) : null}</Fact>
            {lead.qualifiedById && <Fact k="Qualified by">{nameOf(lead.qualifiedById)}</Fact>}
            {lead.assignedTo && (
              <Fact k="Old label">
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {lead.assignedTo}
                  {owner && (
                    <button type="button" className="text-[12px] text-primary underline underline-offset-2" data-testid="lf-clear-label"
                      onClick={() => void run(() => updateLead(lead.id, { assignedTo: undefined }))}>
                      Clear
                    </button>
                  )}
                </span>
              </Fact>
            )}
          </>
        ) : (
          <Fact k="Assigned">{lead.assignedTo}</Fact>
        )}
        <Fact k="Created">{fmtDate(lead.createdAt)}</Fact>
        <Fact k="Last contact">{lead.lastContactedAt ? fmtDateTime(lead.lastContactedAt) : "Never"}</Fact>
        {lead.lostReason && lead.status === "lost" && <Fact k="Lost because">{lead.lostReason}</Fact>}
      </dl>
      {noTick && wa && (
        <p role="note" className="text-[12px] font-medium text-amber-800 dark:text-amber-300" data-testid="lf-no-consent">{NO_META_CONSENT}</p>
      )}
      <MetaLeadFacts lead={lead} className="rounded-lg bg-muted/30 p-3 sm:p-3" />

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
      <LostReasonDialog open={askLost} onCancel={() => setAskLost(false)}
        onConfirm={(reason) => {
          setAskLost(false);
          void run(() => setStatus(lead.id, "lost", { lostReason: reason }));
        }} />
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
