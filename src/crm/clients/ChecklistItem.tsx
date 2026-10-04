import { useState } from "react";
import { Check, CircleDashed, Lock, MinusCircle } from "lucide-react";
import {
  gateApplies, isSettled, itemState, lineDone, notNeededReason, overrideNeed, skipItem, tickChecked, tickLineChecked, unmetNeeds, untickItem, type ItemDef, type ProjectCtx,
} from "@/lib/clients/stages";
import { itemDue } from "@/lib/clients/tasks";
import { fmtDate } from "@/lib/clients/numbering";
import { approvalOf, issuedDocs, sentAny } from "@/lib/clients/stages";
import type { CrmProject, DocKind, Milestone } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { ApprovalDialog } from "./ApprovalDialog";
import { errText, inputCls, Problem, ReasonPrompt } from "./shared";

export interface ItemHandlers {
  message: (templates: string[], itemId: string) => void;
  document: (kind: DocKind, milestone?: Milestone | null, itemId?: string) => void;
  payment: () => void;
  panel: (name: string) => void;
}

/** Items whose tick carries a fact: the date or number it records (4.1 to 4.12). */
const TICK_FACT: Record<string, { label: string; kind: "date" | "text" | "time"; apply: (p: CrmProject, v: string, today: string) => CrmProject }> = {
  p_designed: { label: "Its proposal number", kind: "text", apply: (p, v) => ({ ...p, proposalNo: v }) },
  a_sa: { label: "The effective date", kind: "date", apply: (p, v) => ({ ...p, dates: { ...p.dates, effective: v } }) },
  a_partner: { label: "Date and channel of the other partner's yes", kind: "text", apply: (p) => p },
  l_cutover: { label: "The time of the change", kind: "time", apply: (p, _v, today) => ({ ...p, goLiveTime: _v || p.goLiveTime, dates: { ...p.dates, goLive: p.dates.goLive || today } }) },
  h_source: { label: "The date it was transferred", kind: "date", apply: (p, v) => ({ ...p, dates: { ...p.dates, sourceTransferred: v } }) },
  s_access: { label: "The date access was removed", kind: "date", apply: (p, v) => ({ ...p, dates: { ...p.dates, accessRemoved: v } }) },
  x_access: { label: "The date access was removed", kind: "date", apply: (p, v) => ({ ...p, dates: { ...p.dates, accessRemoved: p.dates.accessRemoved || v } }) },
};

/**
 * Items completed by a form AND a tick (4.3 w_staging: "the staging URL is set and ticked"): once the form's
 * fact is in, Done confirms the rest (noindex, password-protected).
 */
const TICK_AFTER_FIELDS: Record<string, (p: CrmProject) => boolean> = {
  w_staging: (p) => Boolean((p.stagingUrl || "").trim()),
};

/** Items completed by a row of the content tracker (4.5): their Done is the row's status there. */
const CONTENT_ROW: Record<string, string> = { c_logo: "logo_vector", c_colours: "colours", c_fonts: "fonts" };

/** Items whose facts live on another card: the button opens it (4.12 ca_dates: the care plan and the renewal record). */
const PANEL_FOR: Record<string, { panel: string; button: string }> = {
  ca_dates: { panel: "care", button: "Care plan and renewal dates" },
};

/** Items completed by a document AND the e-mail that sends it (4.10 h_doc, 4.12 x_letter). */
const MESSAGE_AFTER_DOC: Record<string, { kind: DocKind; templates: string[] }> = {
  h_doc: { kind: "handover", templates: ["cp_handover_doc_em_en"] },
  x_letter: { kind: "closing", templates: ["cp_support_closing_em_en_exit"] },
};

/**
 * Items completed by a message AND the client's written answer (4.9 l_proposed: "the e-mail sent and
 * approval recorded"): once the message went, Record their answer opens the approval form.
 */
const APPROVAL_AFTER_MESSAGE: Record<string, { templates: string[]; button: string }> = {
  l_proposed: { templates: ["cp_launch_golive_em_en"], button: "Record their \"go ahead\"" },
};

/**
 * ONE ITEM OF A STAGE (client-process-spec 4, 10.3): who acts, whether it gates the stage, when it is due,
 * and the one thing that completes it (a tick with its fact, a message, a document, a payment, an
 * approval, a choice, its dated lines, a panel). An item with needs shows a lock and what it waits for;
 * "Do it anyway" asks for the reason and marks it red (decision 10). Skip needs a reason too.
 */
export function ChecklistItem({ c, item, readOnly, on, highlight }: { c: ProjectCtx; item: ItemDef; readOnly?: boolean; on: ItemHandlers; highlight?: boolean }) {
  const { saveProject, saveClient, today } = useClients();
  const st = itemState(c, item);
  const due = itemDue(c, item.id);
  const unmet = unmetNeeds(c, item);
  const gate = item.gateOneOf ? !item.gateOneOf.some((id) => id !== item.id && isSettled(c, id)) && (gateApplies(c, item) || item.gateOneOf[0] === item.id) : gateApplies(c, item);
  const [mode, setMode] = useState<"" | "skip" | "override" | "tick" | "approval" | "answer">("");
  const [fact, setFact] = useState(TICK_FACT[item.id]?.kind === "date" ? today : "");
  const [err, setErr] = useState<string | null>(null);
  const p = c.project;
  /* An item this project does not need (stage 12's other path...) says so, never "Due"; on a closed project an open item is not late. */
  const notNeeded = st.state === "open" ? notNeededReason(c, item) : null;
  const closedOpen = st.state === "open" && !notNeeded && Boolean(p.outcome);
  const late = st.state === "open" && !notNeeded && !closedOpen && due && due < today;

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      setMode("");
    } catch (e) {
      setErr(errText(e));
    }
  };
  const tick = (note?: string) => run(() => {
    const f = TICK_FACT[item.id];
    if (f && !note?.trim()) throw new Error(`${f.label}, please.`);
    return saveProject(p.id, (pp) => {
      const ticked = tickChecked({ ...c, project: pp }, item.id, new Date(), note);
      return f ? f.apply(ticked, note!.trim(), today) : ticked;
    }, { type: "item", detail: `${item.label.split(":")[0]}: done${note ? ` (${note})` : ""}`, data: { item: item.id } });
  });
  const choose = (field: string, value: string) => run(async () => {
    if (field === "optout") {
      await saveClient(c.client.id, { portfolioOptOut: value === "yes" }, { type: "item", projectId: p.id, detail: `Portfolio opt-out: ${value === "yes" ? "ticked, never named" : "no, may be named"}`, data: { item: item.id } });
      return;
    }
    await saveProject(p.id, (pp) => {
      if (field === "nda") return { ...pp, nda: value as CrmProject["nda"] };
      if (field === "carePlan") return { ...pp, carePlanDecision: value as CrmProject["carePlanDecision"], path: value === "none" ? "exit" : "care_plan" };
      if (field === "satisfaction") return { ...pp, satisfaction: value as CrmProject["satisfaction"] };
      if (field === "stuck") return { ...pp, notesByKey: { ...(pp.notesByKey || {}), stuckDecision: value } };
      return pp;
    }, { type: "item", detail: `${item.label.split(":")[0]}: ${value}`, data: { item: item.id } });
  });

  const icon = st.state === "done" ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
    : st.state === "skipped" ? <MinusCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      : unmet.length ? <Lock className="h-4 w-4 text-amber-600" aria-hidden="true" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  const a = item.action;
  const docOf = (kind: DocKind) => issuedDocs(c, kind)[0];

  return (
    <li className={cn("rounded-lg border px-3 py-2", st.overridden ? "border-destructive/50" : "border-border", st.state !== "open" && "bg-muted/30", highlight && "ring-2 ring-primary/60")}
      data-testid="checklist-item" data-item={item.id} data-state={st.state}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">
            {item.label}
            {gate && st.state === "open" && <span className="ml-1.5 rounded bg-primary/10 px-1 text-[10px] font-semibold uppercase text-primary">Gate</span>}
            {item.who !== "us" && <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">{item.who === "client" ? "client" : "both"}</span>}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {st.state === "done" ? `Done${st.at ? ` ${fmtDate(st.at.slice(0, 10))}` : ""}${st.note ? `: ${st.note}` : ""}${st.via && st.via !== "hand" && st.via !== "auto" && st.via !== "lines" ? ` (${st.via})` : ""}`
              : st.state === "skipped" ? `Skipped: ${st.note}`
                : notNeeded ? <span data-testid="item-not-needed">{notNeeded}</span>
                  : closedOpen ? <span data-testid="item-closed-open">Not done when the project closed</span>
                    : due ? <span className={cn(late && "font-medium text-destructive")}>Due {fmtDate(due)}{late ? " (late)" : ""}</span> : "No date yet"}
            {" · "}{item.source}
          </p>
          {st.overridden && <p className="text-[11px] font-medium text-destructive" data-testid="item-overridden">Overridden {fmtDate(st.overridden.at.slice(0, 10))}: {st.overridden.reason}</p>}
          {item.hint && st.state === "open" && <p className="text-[11px] text-muted-foreground">{item.hint}</p>}
          {unmet.length > 0 && st.state === "open" && (
            <p className="mt-1 text-[12px] font-medium text-amber-700 dark:text-amber-300" data-testid="item-needs">Needs: {unmet.map((n) => n.label).join("; ")}</p>
          )}

          {!readOnly && st.state === "open" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {unmet.length > 0 ? (
                <button type="button" className={crm.btn} onClick={() => setMode("override")} data-testid="item-anyway">Do it anyway</button>
              ) : (
                <>
                  {a.type === "tick" && CONTENT_ROW[item.id] ? (
                    <button type="button" className={crm.btnPrimary} onClick={() => on.panel("content")} data-testid="item-rows">Mark it in the content tracker</button>
                  ) : a.type === "tick" && (TICK_FACT[item.id] ? (
                    <>
                      <input aria-label={TICK_FACT[item.id].label} type={TICK_FACT[item.id].kind} className={cn(inputCls, "h-9 w-auto")} value={fact} onChange={(e) => setFact(e.target.value)} data-testid="item-fact" />
                      <button type="button" className={crm.btnPrimary} onClick={() => void tick(fact)} data-testid="item-tick">Done</button>
                    </>
                  ) : item.id === "a_sow" ? (
                    <button type="button" className={crm.btnPrimary} onClick={() => on.panel("sow")} data-testid="item-sow">SOW reference and dates</button>
                  ) : (
                    <button type="button" className={crm.btnPrimary} onClick={() => void tick()} data-testid="item-tick">Done</button>
                  ))}
                  {a.type === "message" && <button type="button" className={APPROVAL_AFTER_MESSAGE[item.id] && sentAny(c, APPROVAL_AFTER_MESSAGE[item.id].templates) ? crm.btn : crm.btnPrimary} onClick={() => on.message(a.templates, item.id)} data-testid="item-message">Write the message</button>}
                  {a.type === "message" && APPROVAL_AFTER_MESSAGE[item.id] && sentAny(c, APPROVAL_AFTER_MESSAGE[item.id].templates) && !approvalOf(c, item.id) && (
                    <button type="button" className={crm.btnPrimary} onClick={() => setMode("answer")} data-testid="item-answer">{APPROVAL_AFTER_MESSAGE[item.id].button}</button>
                  )}
                  {a.type === "document" && (
                    <button type="button" className={MESSAGE_AFTER_DOC[item.id] && docOf(a.kind) ? crm.btn : crm.btnPrimary} onClick={() => on.document(a.kind, a.milestone, item.id)} data-testid="item-document">
                      {docOf(a.kind) && a.kind !== "receipt" ? "Open the document" : "Make the document"}
                    </button>
                  )}
                  {a.type === "document" && MESSAGE_AFTER_DOC[item.id] && docOf(a.kind) && !sentAny(c, MESSAGE_AFTER_DOC[item.id].templates) && (
                    <button type="button" className={crm.btnPrimary} onClick={() => on.message(MESSAGE_AFTER_DOC[item.id].templates, item.id)} data-testid="item-message">Write the e-mail</button>
                  )}
                  {a.type === "payment" && <button type="button" className={crm.btnPrimary} onClick={on.payment} data-testid="item-payment">Record payment</button>}
                  {a.type === "approval" && <button type="button" className={crm.btnPrimary} onClick={() => setMode("approval")} data-testid="item-approval">Record the approval</button>}
                  {a.type === "call" && (item.id === "p_d5" ? (
                    <>
                      <button type="button" className={crm.btnPrimary} onClick={() => void tick("answered")}>Call made: answered</button>
                      <button type="button" className={crm.btn} onClick={() => on.message(["cp_proposal_d5_wa_hi"], item.id)}>No answer: the one message</button>
                    </>
                  ) : (
                    <button type="button" className={crm.btnPrimary} onClick={() => void tick()} data-testid="item-call">Call held</button>
                  ))}
                  {a.type === "choice" && (
                    <select aria-label={item.label} className={cn(inputCls, "h-9 w-auto max-w-full")} defaultValue="" onChange={(e) => e.target.value && void choose(a.field, e.target.value)} data-testid="item-choice">
                      <option value="">Choose</option>
                      {a.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                  {a.type === "fields" && PANEL_FOR[item.id] && <button type="button" className={crm.btnPrimary} onClick={() => on.panel(PANEL_FOR[item.id].panel)} data-testid="item-fields">{PANEL_FOR[item.id].button}</button>}
                  {a.type === "fields" && !PANEL_FOR[item.id] && <button type="button" className={TICK_AFTER_FIELDS[item.id]?.(p) ? crm.btn : crm.btnPrimary} onClick={() => on.panel(a.card)} data-testid="item-fields">Fill in</button>}
                  {a.type === "fields" && TICK_AFTER_FIELDS[item.id]?.(p) && <button type="button" className={crm.btnPrimary} onClick={() => void tick()} data-testid="item-tick">Done</button>}
                  {a.type === "rows" && <button type="button" className={crm.btnPrimary} onClick={() => on.panel(a.panel)} data-testid="item-rows">Open the {a.panel === "access" ? "access record" : a.panel === "content" ? "content tracker" : a.panel === "rounds" ? "rounds" : a.panel === "issues" ? "issue log" : "deliverables"}</button>}
                </>
              )}
              {(!gateApplies(c, item) || item.skippable) && !item.gateOneOf && (
                <button type="button" className={crm.btnGhost} onClick={() => setMode("skip")} data-testid="item-skip">Skip</button>
              )}
            </div>
          )}
          {!readOnly && st.state === "open" && a.type === "lines" && item.lines && (
            <ul className="mt-2 space-y-1">
              {item.lines.map((l) => {
                const done = lineDone(c, item, l);
                return (
                  <LineRow key={l.id} label={l.label} done={done} auto={Boolean(l.from)} locked={unmet.length > 0}
                    onTick={(date) => run(() => saveProject(p.id, (pp) => tickLineChecked({ ...c, project: pp }, item.id, l.id, date, new Date()), { type: "item", detail: `${item.label.split(",")[0]}: ${l.label} (${fmtDate(date)})`, data: { item: item.id, line: l.id } }))} />
                );
              })}
            </ul>
          )}
          {!readOnly && st.state === "done" && st.via === "hand" && !item.done && (
            <button type="button" className={cn(crm.btnGhost, "mt-1 h-7 px-1.5 text-[11px]")} onClick={() => void run(() => saveProject(p.id, (pp) => untickItem(pp, item.id), { type: "item", detail: `${item.label.split(":")[0]}: ticked back`, data: { item: item.id } }))}>Undo</button>
          )}
          {item.id === "s_check" && !readOnly && (
            <label className="mt-2 flex items-center gap-2 text-[12px]">
              Their answer
              <select className={cn(inputCls, "h-8 w-auto")} value={p.satisfaction || ""} onChange={(e) => e.target.value && void choose("satisfaction", e.target.value)} data-testid="satisfaction">
                <option value="">Not recorded</option><option value="happy">Happy</option><option value="concern">Has a concern (log it as an issue)</option><option value="no_reply">No reply</option>
              </select>
            </label>
          )}
          {mode === "skip" && <ReasonPrompt label="Why skip it?" button="Skip" testId="skip-reason" onCancel={() => setMode("")} onSubmit={(r) => run(() => saveProject(p.id, (pp) => skipItem({ ...c, project: pp }, item.id, r, new Date()), { type: "item", detail: `${item.label.split(":")[0]}: skipped (${r})`, data: { item: item.id } }))} />}
          {mode === "override" && (
            <ReasonPrompt label={`Why do it before ${unmet.map((n) => n.label).join(" and ")}? It stays red on the item and the stage${["l_cutover", "h_source", "h_access"].includes(item.id) ? " and on the money card" : ""}.`}
              button="Do it anyway" testId="override-reason" onCancel={() => setMode("")}
              onSubmit={(r) => run(() => saveProject(p.id, (pp) => overrideNeed(pp, item.id, r, new Date()), { type: "item", detail: `Overridden: ${item.label.split(":")[0]} before ${unmet.map((n) => n.label).join(" and ")} (${r})`, data: { item: item.id, override: true } }))} />
          )}
          {mode === "approval" && a.type === "approval" && (
            <ApprovalDialog projectId={p.id} what={a.what} deemedFrom={a.deemed ? p.dates.reviewNotice || null : null} onDone={() => setMode("")} />
          )}
          {mode === "answer" && <ApprovalDialog projectId={p.id} what={item.id} onDone={() => setMode("")} />}
          <Problem text={err} />
        </div>
      </div>
    </li>
  );
}

function LineRow({ label, done, auto, locked, onTick }: { label: string; done: boolean; auto: boolean; locked: boolean; onTick: (date: string) => Promise<void> }) {
  const { today } = useClients();
  const [date, setDate] = useState(today);
  return (
    <li className="flex flex-wrap items-center gap-2 text-[12px]" data-testid="item-line" data-done={done ? "1" : "0"}>
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{label}{auto && !done && <span className="text-muted-foreground"> (ticks itself)</span>}</span>
      {!done && !auto && !locked && (
        <>
          <input type="date" aria-label={`Date: ${label}`} className={cn(inputCls, "h-8 w-auto")} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className={cn(crm.btn, "h-8")} onClick={() => void onTick(date)} data-testid="line-tick">Tick</button>
        </>
      )}
    </li>
  );
}
