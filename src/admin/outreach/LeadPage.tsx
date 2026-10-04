import { Fragment, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Pencil, Trash2 } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { MEMBER_FILL_KEYS, blank, can, crmErrorText } from "@/lib/outreach/access";
import { useOutreach } from "./useOutreach";
import { LeadFields, changedFields, draftToLead, type LeadDraft } from "./LeadFields";
import { ComposePanel } from "./ComposePanel";
import { CallScriptCard } from "./CallScriptCard";
import { History } from "./History";
import { historyLines } from "./historyLines";
import { isHotLead } from "./derive";
import { useOpensCtx } from "./useOpensCtx";
import { nextStep, todayQueue } from "./compose";
import { KIND_LABEL, StatusPill, btnDanger, btnGhost, btnPrimary, btnSecondary, cardCls, dueLabel, fmtDateTime, inputCls, prettyPhone, summaryCls, textareaCls } from "./ui";
import { AskOwnerDialog } from "@/crm/lead/AskOwnerDialog";
import { LostReasonDialog } from "@/crm/lead/LostReasonDialog";
import { NotesBox } from "@/crm/lead/NotesBox";
import { statusRefusal } from "@/crm/lead/statusRules";
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
 * (Demo, Message, Send; the Message step shows every stage in plain words and
 * starts on the one the lead is at), then the Call script, folded until a call
 * is next. Bottom, folded away: status, follow-up date, notes, history. The
 * steps are what Mehdi does twenty times a day; the rest is there when he
 * needs it and out of the way when he does not.
 *
 * The compose steps are keyed by the lead id (see ComposePanel for why), and
 * "Next lead" walks Today's list without going back to it.
 *
 * Every change travels as a patch of the keys it names (spec 9.3), merged on
 * the server, so two people never overwrite each other.
 *
 * A MEMBER'S LEAD PAGE (spec 10.7): Edit shows the institute's name and kind
 * and every filled contact field read-only, with "Wrong? Ask Mehdi"; an empty
 * one can be filled. Notes only grow ("Add to notes"). Call, Proposal and Won
 * are Mehdi's (Hand to Mehdi), Lost asks why, Do not contact is one tap, and
 * there is no Delete.
 */
/**
 * A long email breaks after "@" and before dots instead of mid-word
 * ([overflow-wrap:anywhere] stays as the last resort for one huge part).
 */
function softBreaks(text: string) {
  const parts = text.split(/(?<=@)|(?=\.)/);
  return parts.map((p, i) => <Fragment key={i}>{i > 0 && <wbr />}{p}</Fragment>);
}

/** The fields a member's edit shows read-only: name and kind, and every fill-once field already filled. */
function lockedFor(lead: OutreachLead): ReadonlySet<string> {
  const data = lead as unknown as Record<string, unknown>;
  return new Set(["instituteName", "kind", ...MEMBER_FILL_KEYS.filter((k) => !blank(data[k]))]);
}

export function LeadPage({ leadId, onBack, onOpen }: { leadId: string; onBack: () => void; onOpen: (id: string) => void }) {
  const { leads, opens, patchLead, me } = useOutreach();
  const openCtx = useOpensCtx();
  const lead = leads.find((l) => l.id === leadId);
  const [editing, setEditing] = useState<LeadDraft | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [correction, setCorrection] = useState<string | null>(null);
  const member = me.role === "member" && !me.legacy;
  const locked = useMemo(() => (member && lead ? lockedFor(lead) : undefined), [member, lead]);

  // Where "Next lead" goes: the lead after this one in Today's order, else the first other one there.
  const next = useMemo(() => {
    const all = todayQueue(leads, opens, new Date(), openCtx).all;
    const at = all.findIndex((l) => l.id === leadId);
    return (at >= 0 ? all[at + 1] : undefined) || all.find((l) => l.id !== leadId);
  }, [leads, opens, leadId, openCtx]);

  if (!lead) {
    return (
      <div className={cardCls}>
        <p className="text-sm">This lead does not exist any more.</p>
        <button type="button" className={btnSecondary + " mt-3"} onClick={onBack}>Back to leads</button>
      </div>
    );
  }

  const now = new Date();
  const step = nextStep(lead, isHotLead(lead, opens, now, openCtx), now, { member });
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
              setEditErr(null);
              try {
                const patch = changedFields(lead, draftToLead(editing));
                if (Object.keys(patch).length) await patchLead(lead.id, patch);
                setEditing(null);
              } catch (x) {
                setEditErr(crmErrorText(x));
              }
            }}
          >
            {member && (
              <p className="mb-3 text-sm text-muted-foreground" data-testid="member-edit-note">
                You can fill in what is empty. What is filled stays as it is: if it is wrong, ask Mehdi.
              </p>
            )}
            <LeadFields value={editing} onChange={setEditing} excludeId={lead.id} tried locked={locked}
              onAskMehdi={member ? (what) => setCorrection(`${what[0].toUpperCase()}${what.slice(1)} is wrong. It should be: `) : undefined} />
            {editErr && <p role="alert" data-testid="edit-error" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{editErr}</p>}
            <div className="mt-4 flex gap-3">
              <button type="submit" className={btnPrimary}><Check className="h-4 w-4" aria-hidden="true" /> Save</button>
              <button type="button" className={btnSecondary} onClick={() => { setEditing(null); setEditErr(null); }}>Cancel</button>
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

      {/* ── The call, folded until it is needed ───────────────────────── */}
      <CallScriptCard key={`call-${lead.id}`} lead={lead} />

      <LeadDetails lead={lead} onDeleted={onBack} />
      {member && (
        <AskOwnerDialog lead={lead} open={correction !== null} onClose={() => setCorrection(null)} topic="correction" text={correction ?? ""} />
      )}
    </div>
  );
}

/**
 * Everything else about the lead, folded: status and follow-up date, notes,
 * history, delete. Opened with one tap; each part keeps its own summary line
 * so the folded view still says what is inside.
 */
function LeadDetails({ lead, onDeleted }: { lead: OutreachLead; onDeleted: () => void }) {
  const { events, opens, patchLead, addEvent, deleteLead, me } = useOutreach();
  const openCtx = useOpensCtx();
  const mine = useMemo(() => events.filter((e) => e.leadId === lead.id), [events, lead.id]);
  // The fold says how many lines the history shows: its lines, the demo's opens and "Lead added" (crm-fixes-1004 item 18).
  const shown = historyLines(lead, mine, opens, openCtx).length;
  const [note, setNote] = useState("");
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [askLost, setAskLost] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);
  const member = me.role === "member" && !me.legacy;
  // Mehdi and admins rewrite the notes; a member only adds to them (spec 10.7).
  const rewritesNotes = !member;

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (x) {
      setErr(crmErrorText(x));
    }
  };
  const setStatus = async (status: LeadStatus, extra: Partial<OutreachLead> = {}) => {
    if (status === lead.status) return;
    await patchLead(lead.id, { ...extra, status });
    await addEvent({ leadId: lead.id, type: "status", detail: `Status: ${LEAD_STATUS_LABELS[lead.status]} to ${LEAD_STATUS_LABELS[status]}` });
  };
  const pick = (s: LeadStatus) => {
    if (s === "lost" && member && lead.status !== "lost") return setAskLost(true);
    void run(() => setStatus(s));
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
            {LEAD_STATUSES.map((s) => {
              const no = statusRefusal(me, lead.status, s);
              return (
                <button key={s} type="button" role="radio" aria-checked={lead.status === s} onClick={() => pick(s)}
                  disabled={Boolean(no)} title={no || undefined} aria-disabled={no ? true : undefined}
                  className={cn("min-h-10 rounded-full px-3 text-sm", lead.status === s ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground", no && "cursor-not-allowed opacity-50 hover:text-muted-foreground")}>
                  {LEAD_STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
          {member && <p className="text-xs text-muted-foreground" data-testid="status-member-note">Call, Proposal and Won are Mehdi's: when they want a call or the price, use Hand to Mehdi.</p>}
          {err && <p role="alert" className="text-sm text-destructive" data-testid="status-error">{err}</p>}
          <div className="max-w-xs">
            <label htmlFor="lead-next" className="block text-sm font-medium">Next follow-up</label>
            <input id="lead-next" type="datetime-local" className={inputCls} value={toLocalInput(lead.nextActionAt)}
              onChange={(e) => void run(() => patchLead(lead.id, { nextActionAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} />
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
          {rewritesNotes ? (
            <textarea aria-label="Notes about this lead" rows={3} className={textareaCls} value={notesDraft ?? lead.notes ?? ""}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={async () => {
                if (notesDraft !== null && notesDraft !== (lead.notes ?? "")) await run(() => patchLead(lead.id, { notes: notesDraft }));
                setNotesDraft(null);
              }}
              placeholder="Who picks up, best time to call, what they said" />
          ) : (
            <NotesBox lead={lead} />
          )}
        </div>
      </details>

      <details className="py-1" data-testid="history-details">
        <summary className={summaryCls}>
          <span>History</span>
          <span className="ml-auto text-xs font-normal" data-testid="history-count">{shown} {shown === 1 ? "entry" : "entries"}</span>
        </summary>
        <div className="pb-3">
          <form className="mb-3 flex gap-2" onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return;
            setDelErr(null);
            try {
              await addEvent({ leadId: lead.id, type: "note", detail: note.trim() });
              setNote("");
            } catch (x) {
              setDelErr(crmErrorText(x));
            }
          }}>
            <label htmlFor="hist-note" className="sr-only">Add a line to the history</label>
            <input id="hist-note" className={inputCls + " mt-0"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a line to the history" />
            <button type="submit" className={btnSecondary + " shrink-0"} disabled={!note.trim()}>Add</button>
          </form>
          <History lead={lead} events={mine} />
          {/* Only Mehdi deletes leads (the database refuses anyone else): the button is his alone. */}
          {can(me, "lead.delete") && (
            <button type="button" className={btnDanger + " mt-4"} onClick={async () => {
              if (!confirm(`Delete ${lead.instituteName} and its whole history? This cannot be undone. To stop messaging them, use Not interested instead.`)) return;
              setDelErr(null);
              try {
                await deleteLead(lead.id);
                onDeleted();
              } catch (x) {
                setDelErr(crmErrorText(x));
              }
            }}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete lead
            </button>
          )}
          {delErr && <p role="alert" className="mt-2 text-sm text-destructive" data-testid="history-error">{delErr}</p>}
        </div>
      </details>
      <LostReasonDialog open={askLost} onCancel={() => setAskLost(false)}
        onConfirm={(reason) => {
          setAskLost(false);
          void run(() => setStatus("lost", { lostReason: reason }));
        }} />
    </div>
  );
}
