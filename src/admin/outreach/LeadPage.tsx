import { Fragment, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Pencil, Trash2 } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { LeadFields, draftToLead, type LeadDraft } from "./LeadFields";
import { ComposePanel } from "./ComposePanel";
import { History } from "./History";
import { nextStep, todayQueue } from "./compose";
import { KIND_LABEL, StatusPill, btnDanger, btnGhost, btnPrimary, btnSecondary, cardCls, dueLabel, fmtDateTime, inputCls, prettyPhone, summaryCls, textareaCls } from "./ui";
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
 * ONE LEAD. Top: who they are and the next step. Middle: the three steps
 * (Demo, Message, Send). Bottom, folded away: status, follow-up date, notes,
 * history. The steps are what Mehdi does twenty times a day; the rest is
 * there when he needs it and out of the way when he does not.
 *
 * The compose steps are keyed by the lead id (see ComposePanel for why), and
 * "Next lead" walks Today's list without going back to it.
 */
/**
 * A long email breaks after "@" and before dots instead of mid-word
 * ([overflow-wrap:anywhere] stays as the last resort for one huge part).
 */
function softBreaks(text: string) {
  const parts = text.split(/(?<=@)|(?=\.)/);
  return parts.map((p, i) => <Fragment key={i}>{i > 0 && <wbr />}{p}</Fragment>);
}

export function LeadPage({ leadId, onBack, onOpen }: { leadId: string; onBack: () => void; onOpen: (id: string) => void }) {
  const { leads, opens, saveLead } = useOutreach();
  const lead = leads.find((l) => l.id === leadId);
  const [editing, setEditing] = useState<LeadDraft | null>(null);

  // Where "Next lead" goes: the lead after this one in Today's order, else the first other one there.
  const next = useMemo(() => {
    const all = todayQueue(leads, opens).all;
    const at = all.findIndex((l) => l.id === leadId);
    return (at >= 0 ? all[at + 1] : undefined) || all.find((l) => l.id !== leadId);
  }, [leads, opens, leadId]);

  if (!lead) {
    return (
      <div className={cardCls}>
        <p className="text-sm">This lead does not exist any more.</p>
        <button type="button" className={btnSecondary + " mt-3"} onClick={onBack}>Back to leads</button>
      </div>
    );
  }

  const step = nextStep(lead, opens);
  const contact = [lead.phone && prettyPhone(lead.phone), lead.email].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className={btnGhost + " -ml-3"}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All leads
        </button>
        {next && (
          <button type="button" onClick={() => onOpen(next.id)} className={btnGhost + " -mr-3 min-w-0"} aria-label={`Next lead: ${next.instituteName}`}>
            <span className="truncate">Next lead</span> <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Who ─────────────────────────────────────────────────────────── */}
      <header className={cardCls}>
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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold sm:text-2xl" data-testid="lead-name">{lead.instituteName}</h1>
                <StatusPill status={lead.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[KIND_LABEL[lead.kind], lead.city, lead.contactName].filter(Boolean).join(", ")}
              </p>
              {contact.map((c) => <p key={c} className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">{softBreaks(c)}</p>)}
              <p className={cn("mt-3 text-sm font-medium", step.urgent ? "text-primary" : "text-foreground")}>Next: {step.text}</p>
            </div>
            <button
              type="button"
              className={btnGhost + " -mr-2 shrink-0"}
              onClick={() => setEditing({ ...lead, waSame: !lead.whatsapp || lead.whatsapp === lead.phone, whatsapp: lead.whatsapp === lead.phone ? "" : lead.whatsapp })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </button>
          </div>
        )}
      </header>

      {/* ── The three steps ────────────────────────────────────────────── */}
      <div className={cardCls}>
        <ComposePanel key={lead.id} lead={lead} next={next ? { name: next.instituteName, open: () => onOpen(next.id) } : undefined} />
      </div>

      <LeadDetails lead={lead} onDeleted={onBack} />
    </div>
  );
}

/**
 * Everything else about the lead, folded: status and follow-up date, notes,
 * history, delete. Opened with one tap; each part keeps its own summary line
 * so the folded view still says what is inside.
 */
function LeadDetails({ lead, onDeleted }: { lead: OutreachLead; onDeleted: () => void }) {
  const { events, saveLead, addEvent, deleteLead } = useOutreach();
  const mine = useMemo(() => events.filter((e) => e.leadId === lead.id), [events, lead.id]);
  const [note, setNote] = useState("");
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const setStatus = async (status: LeadStatus) => {
    if (status === lead.status) return;
    await saveLead({ ...lead, status });
    await addEvent({ leadId: lead.id, type: "status", detail: `Status: ${LEAD_STATUS_LABELS[lead.status]} to ${LEAD_STATUS_LABELS[status]}` });
  };

  return (
    <div className={cn(cardCls, "divide-y divide-border/60 py-1 sm:py-1")}>
      <details className="group py-1" data-testid="status-details">
        <summary className={summaryCls}>
          <span>Status and follow-up</span>
          <span className="ml-auto truncate text-xs font-normal">
            {LEAD_STATUS_LABELS[lead.status]}{lead.nextActionAt ? `, follow-up ${dueLabel(lead.nextActionAt)}` : ""}
          </span>
        </summary>
        <div className="space-y-4 pb-3 pt-1">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Lead status">
            {LEAD_STATUSES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={lead.status === s} onClick={() => void setStatus(s)}
                className={cn("min-h-10 rounded-full px-3 text-sm", lead.status === s ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground")}>
                {LEAD_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="max-w-xs">
            <label htmlFor="lead-next" className="block text-sm font-medium">Next follow-up</label>
            <input id="lead-next" type="datetime-local" className={inputCls} value={toLocalInput(lead.nextActionAt)}
              onChange={(e) => void saveLead({ ...lead, nextActionAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
          </div>
          {lead.lastContactedAt && <p className="text-xs text-muted-foreground">Last contacted {fmtDateTime(lead.lastContactedAt)}</p>}
        </div>
      </details>

      <details className="py-1">
        <summary className={summaryCls}>
          <span>Notes</span>
          <span className="ml-auto max-w-[60%] truncate text-xs font-normal">{lead.notes ? lead.notes.split("\n")[0] : "none yet"}</span>
        </summary>
        <div className="pb-3">
          <textarea aria-label="Notes about this lead" rows={3} className={textareaCls} value={notesDraft ?? lead.notes ?? ""}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={async () => {
              if (notesDraft !== null && notesDraft !== (lead.notes ?? "")) await saveLead({ ...lead, notes: notesDraft });
              setNotesDraft(null);
            }}
            placeholder="Who picks up, best time to call, what they said" />
        </div>
      </details>

      <details className="py-1" data-testid="history-details">
        <summary className={summaryCls}>
          <span>History</span>
          <span className="ml-auto text-xs font-normal">{mine.length} {mine.length === 1 ? "entry" : "entries"}</span>
        </summary>
        <div className="pb-3">
          <form className="mb-3 flex gap-2" onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return;
            await addEvent({ leadId: lead.id, type: "note", detail: note.trim() });
            setNote("");
          }}>
            <label htmlFor="hist-note" className="sr-only">Add a line to the history</label>
            <input id="hist-note" className={inputCls + " mt-0"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a line to the history" />
            <button type="submit" className={btnSecondary + " shrink-0"} disabled={!note.trim()}>Add</button>
          </form>
          <History lead={lead} events={mine} />
          <button type="button" className={btnDanger + " mt-4"} onClick={async () => {
            if (!confirm(`Delete ${lead.instituteName} and its whole history? This cannot be undone. To stop messaging them, use Not interested instead.`)) return;
            await deleteLead(lead.id);
            onDeleted();
          }}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete lead
          </button>
        </div>
      </details>
    </div>
  );
}
