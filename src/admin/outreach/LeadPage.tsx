import { useMemo, useState } from "react";
import { ArrowLeft, Ban, Check, Mail, MessageCircle, Pencil, PhoneCall, Reply, Trash2 } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { LeadFields, draftToLead, type LeadDraft } from "./LeadFields";
import { ComposePanel } from "./ComposePanel";
import { History } from "./History";
import { KIND_LABEL, LANGUAGE_LABEL, STATUS_TONE, btnDanger, btnPrimary, btnSecondary, cardCls, dueLabel, fmtDateTime, inputCls, prettyPhone, textareaCls } from "./ui";
import { cn } from "@/lib/utils";

/** YYYY-MM-DDTHH:MM in local time, for <input type="datetime-local">. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * ONE LEAD: who they are, where they are in the pipeline, everything that
 * has happened, and the compose panel that opens Gmail or WhatsApp.
 */
export function LeadPage({ leadId, onBack }: { leadId: string; onBack: () => void }) {
  const { leads, saveLead, addEvent, deleteLead } = useOutreach();
  const lead = leads.find((l) => l.id === leadId);
  const [editing, setEditing] = useState<LeadDraft | null>(null);
  const [note, setNote] = useState("");
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  if (!lead) {
    return (
      <div className={cardCls}>
        <p className="text-sm">This lead does not exist any more.</p>
        <button type="button" className={btnSecondary + " mt-3"} onClick={onBack}>Back to leads</button>
      </div>
    );
  }

  const setStatus = async (status: LeadStatus, extra: Partial<OutreachLead> = {}, detail?: string) => {
    if (status === lead.status && !Object.keys(extra).length) return;
    await saveLead({ ...lead, ...extra, status });
    await addEvent({ leadId: lead.id, type: "status", detail: detail || `Status: ${LEAD_STATUS_LABELS[lead.status]} to ${LEAD_STATUS_LABELS[status]}` });
  };

  const replied = async () => {
    await addEvent({ leadId: lead.id, type: "replied", detail: "They replied. Next: send the demo link (After they replied)." });
    await saveLead({ ...lead, status: "replied", nextActionAt: new Date().toISOString() });
  };
  const callDone = async () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(10, 0, 0, 0);
    await addEvent({ leadId: lead.id, type: "call", channel: "call", detail: "Call done. Next: the after-call message." });
    await saveLead({ ...lead, status: "call", lastContactedAt: new Date().toISOString(), nextActionAt: next.toISOString() });
  };
  const doNotContact = async () => {
    if (!confirm(`Mark ${lead.instituteName} as do not contact? Every send button for them will be blocked.`)) return;
    await addEvent({ leadId: lead.id, type: "status", detail: "Not interested: do not contact again." });
    await saveLead({ ...lead, status: "do_not_contact", nextActionAt: undefined });
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All leads
      </button>

      {/* ── Who ─────────────────────────────────────────────────────────── */}
      <section className={cardCls}>
        {editing ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editing.instituteName.trim()) return;
              await saveLead({ ...lead, ...draftToLead(editing) });
              setEditing(null);
            }}
          >
            <LeadFields value={editing} onChange={setEditing} excludeId={lead.id} tried />
            <div className="mt-4 flex gap-3">
              <button type="submit" className={btnPrimary}><Check className="h-4 w-4" aria-hidden="true" /> Save</button>
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold" data-testid="lead-name">{lead.instituteName}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {[KIND_LABEL[lead.kind], lead.city, lead.contactName, LANGUAGE_LABEL[lead.language || "en"]].filter(Boolean).join(" · ")}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {lead.phone && <li><a className="inline-flex min-h-8 items-center gap-1.5 hover:text-primary" href={`tel:${lead.phone}`}><PhoneCall className="h-4 w-4" aria-hidden="true" />{prettyPhone(lead.phone)}</a></li>}
                {lead.whatsapp && lead.whatsapp !== lead.phone && <li className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" aria-hidden="true" />{prettyPhone(lead.whatsapp)}</li>}
                {lead.email && <li className="flex min-w-0 items-center gap-1.5 break-all"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{lead.email}</li>}
                {lead.website && <li className="break-all"><a className="text-primary underline underline-offset-2" href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a></li>}
              </ul>
              {lead.lastContactedAt && <p className="mt-2 text-xs text-muted-foreground">Last contacted {fmtDateTime(lead.lastContactedAt)}</p>}
            </div>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setEditing({ ...lead, waSame: !lead.whatsapp || lead.whatsapp === lead.phone, whatsapp: lead.whatsapp === lead.phone ? "" : lead.whatsapp })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </button>
          </div>
        )}
      </section>

      {/* ── Pipeline ────────────────────────────────────────────────────── */}
      <section className={cardCls} aria-labelledby="pipe-h">
        <h3 id="pipe-h" className="text-sm font-semibold">Status <span className="font-normal text-muted-foreground">(tap to change)</span></h3>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Lead status">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={lead.status === s}
              onClick={() => void setStatus(s)}
              className={cn(
                "min-h-10 rounded-full border px-3 text-xs font-medium sm:text-sm",
                lead.status === s ? cn(STATUS_TONE[s], "border-transparent ring-2 ring-primary/60") : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {LEAD_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" className={btnSecondary} onClick={() => void replied()}><Reply className="h-4 w-4" aria-hidden="true" /> They replied</button>
          <button type="button" className={btnSecondary} onClick={() => void callDone()}><PhoneCall className="h-4 w-4" aria-hidden="true" /> Call done</button>
          <button type="button" className={btnDanger} onClick={() => void doNotContact()}><Ban className="h-4 w-4" aria-hidden="true" /> Not interested</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-next" className="block text-sm font-medium">
              Next follow-up {lead.nextActionAt && <span className="font-normal text-muted-foreground">({dueLabel(lead.nextActionAt)})</span>}
            </label>
            <input
              id="lead-next"
              type="datetime-local"
              className={inputCls}
              value={toLocalInput(lead.nextActionAt)}
              onChange={(e) => void saveLead({ ...lead, nextActionAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>
        </div>
      </section>

      {/* ── Compose ─────────────────────────────────────────────────────── */}
      <ComposePanel lead={lead} />

      {/* ── Notes and history ───────────────────────────────────────────── */}
      <section className={cardCls} aria-labelledby="notes-h">
        <h3 id="notes-h" className="text-sm font-semibold">Notes</h3>
        <textarea
          aria-label="Notes about this lead"
          rows={3}
          className={textareaCls}
          value={notesDraft ?? lead.notes ?? ""}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={async () => {
            if (notesDraft !== null && notesDraft !== (lead.notes ?? "")) await saveLead({ ...lead, notes: notesDraft });
            setNotesDraft(null);
          }}
          placeholder="Who picks up, best time to call, what they said"
        />
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return;
            await addEvent({ leadId: lead.id, type: "note", detail: note.trim() });
            setNote("");
          }}
        >
          <label htmlFor="hist-note" className="sr-only">Add a line to the history</label>
          <input id="hist-note" className={inputCls + " mt-0"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a line to the history" />
          <button type="submit" className={btnSecondary + " shrink-0"} disabled={!note.trim()}>Add</button>
        </form>
      </section>

      <HistorySection lead={lead} />

      <div className="pt-2">
        <button
          type="button"
          className={btnDanger}
          onClick={async () => {
            if (!confirm(`Delete ${lead.instituteName} and its whole history? This cannot be undone. To stop messaging them, use Not interested instead.`)) return;
            await deleteLead(lead.id);
            onBack();
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete lead
        </button>
      </div>
    </div>
  );
}

function HistorySection({ lead }: { lead: OutreachLead }) {
  const { events } = useOutreach();
  const mine = useMemo(() => events.filter((e) => e.leadId === lead.id), [events, lead.id]);
  return <History lead={lead} events={mine} />;
}
