import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  doneBefore, missingForMove, moveToNext, nextStageOf, putOnHold, resume, saidNo, saidYes, sentAny, STAGE_BY_ID, stageIndex, type ProjectCtx,
} from "@/lib/clients/stages";
import { nextAction } from "@/lib/clients/tasks";
import { stageTemplates } from "@/lib/clients/templates";
import { fmtDate } from "@/lib/clients/numbering";
import type { Hold, StageId } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { ChecklistItem, type ItemHandlers } from "./ChecklistItem";
import { errText, inputCls, Problem, ReasonPrompt } from "./shared";

const HOLD_LABEL: Record<Hold, string> = { client_delay: "Client delay", non_payment: "Non-payment", no_advance: "No advance" };

/**
 * THE STAGE CARD (client-process-spec 10.3): its goal; "Next: <item> (due <when>)"; the checklist in
 * order; the stage's messages; Move to next stage, disabled with the list of what is missing, and "Move
 * on anyway" with a reason. Stage 1 ends with "They said yes" (the lead goes to Won) or "They said no"
 * (Lost, their reason). A past stage reads only; a future one shows what it will ask.
 */
export function StageCard({ c, stage, on, onMessage, highlight }: { c: ProjectCtx; stage: StageId; on: ItemHandlers; onMessage: (ids: string[]) => void; highlight?: string | null }) {
  const { saveProject, syncLead } = useClients();
  const def = STAGE_BY_ID[stage];
  const p = c.project;
  const current = p.stage === stage && !p.outcome;
  const past = stageIndex(stage) < stageIndex(p.stage) || Boolean(p.outcome);
  const [mode, setMode] = useState<"" | "anyway" | "no" | "hold">("");
  const [hold, setHold] = useState<Hold>("client_delay");
  const [err, setErr] = useState<string | null>(null);
  const missing = current ? missingForMove(c, stage) : [];
  const next = current ? nextAction(c) : null;
  const msgs = stageTemplates(stage);
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      setMode("");
    } catch (e) {
      setErr(errText(e));
    }
  };
  /** "They said yes" (4.1): the yes dated, stage 2, the lead Won; with stage 1's gates open only with a reason. */
  const yes = (reason?: string) => run(async () => {
    if (missing.length && !reason) throw new Error(`Still open: ${missing.map((m) => m.label.split(":")[0]).join("; ")}.`);
    await saveProject(p.id, (pp) => {
      const y = saidYes(pp, new Date());
      return reason ? { ...y, gateOverrides: [...(y.gateOverrides || []), { stage: "proposal", at: new Date().toISOString(), reason }] } : y;
    }, { type: "stage", detail: `They said yes: stage 2, Agreement and advance${reason ? ` (moved on anyway: ${reason})` : ""}`, data: { from: "proposal", to: "agreement", override: Boolean(reason) } });
    await syncLead(p.leadId, "won");
  });
  const move = (reason?: string) => run(async () => {
    const r = moveToNext(c, new Date(), reason);
    if (r.missing.length) throw new Error(`Still open: ${r.missing.map((m) => m.label.split(":")[0]).join("; ")}.`);
    const to = nextStageOf(stage)!;
    await saveProject(p.id, () => r.project, { type: "stage", detail: `Stage: ${def.label} to ${STAGE_BY_ID[to].label}${reason ? ` (moved on anyway: ${reason})` : ""}`, data: { from: stage, to, override: Boolean(reason) } });
  });

  return (
    <section className={cn(crm.panel, "p-4")} data-testid="stage-card" data-stage={stage} aria-label={`Stage ${def.n}: ${def.label}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{def.n}. {def.label} <span className="text-[12px] font-normal text-muted-foreground">({def.hinglish})</span></h2>
        {!current && <span className="text-[11px] text-muted-foreground">{doneBefore(p, stage) ? "Done before the client file" : past ? "Done" : "Later"}</span>}
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{def.goal}</p>
      {p.hold && current && (
        <div className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[13px]" data-testid="on-hold">
          On hold ({HOLD_LABEL[p.hold]}) since {fmtDate(p.dates.holdSince || "")}: {p.notesByKey?.holdReason}
          {p.hold === "non_payment" && <span className="block text-[12px] text-muted-foreground">When the payment arrives: resume the next working day, send one line confirming the new dates, and do not mention the pause again (PAYMENT-FOLLOWUP section 4).</span>}
          <button type="button" className={cn(crm.btn, "mt-2")} onClick={() => void run(() => saveProject(p.id, (pp) => resume(pp), { type: "hold", detail: "Resumed" }))} data-testid="resume">Resume</button>
        </div>
      )}
      {next && <p className="mt-2 text-[13px] font-medium" data-testid="next-action">Next: {next.label.split(":")[0]}{next.due ? ` (due ${fmtDate(next.due)})` : ""}</p>}
      <ol className="mt-3 space-y-2">
        {def.items.map((item) => <ChecklistItem key={item.id} c={c} item={item} readOnly={!current} on={on} highlight={highlight === item.id} />)}
      </ol>
      {msgs.length > 0 && (
        <details className="mt-3 rounded-lg border border-border px-3 py-2">
          <summary className="cursor-pointer text-[13px] font-medium">Messages for this stage ({msgs.length})</summary>
          <ul className="mt-2 space-y-1">
            {msgs.map((t) => (
              <li key={t.id}>
                <button type="button" className="text-left text-[12px] text-primary hover:underline" onClick={() => onMessage([t.id])} data-testid="stage-message" data-template={t.id}>
                  {t.label} ({t.channel === "whatsapp" ? "WhatsApp" : "e-mail"}, {t.language === "en" ? "English" : "Hinglish"})
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {current && (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          {stage === "proposal" ? (
            <>
              {sentAny(c, ["cp_proposal_d30_em_en"]) && (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px]" data-testid="day30-close">
                  <p>The day-30 e-mail has gone. With no answer, close the file: the lead goes to Lost with the reason "No decision by day 30".</p>
                  <button type="button" className={cn(crm.btn, "mt-1.5")} data-testid="day30-close-lost" onClick={() => void run(async () => {
                    const r = "No decision by day 30";
                    await saveProject(p.id, (pp) => saidNo(pp, r, new Date()), { type: "stage", detail: `Closed as Lost: ${r}`, data: { outcome: "lost" } });
                    await syncLead(p.leadId, "lost", r);
                  })}>Close as Lost: no decision by day 30</button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={crm.btnPrimary} data-testid="said-yes" disabled={missing.length > 0} onClick={() => void yes()}>They said yes</button>
                <button type="button" className={crm.btn} onClick={() => setMode("no")} data-testid="said-no">They said no</button>
              </div>
              {missing.length > 0 && (
                <div className="text-[12px]" data-testid="move-missing">
                  <p className="text-muted-foreground">Before the yes moves the file on:</p>
                  <ul className="list-disc pl-5">{missing.map((m) => <li key={m.id}>{m.label.split(":")[0]}</li>)}</ul>
                  <button type="button" className={cn(crm.btnGhost, "mt-1")} onClick={() => setMode("anyway")} data-testid="move-anyway">They said yes: move on anyway</button>
                </div>
              )}
            </>
          ) : nextStageOf(stage) ? (
            <>
              <button type="button" className={crm.btnPrimary} disabled={missing.length > 0} onClick={() => void move()} data-testid="move-next">
                Move to {STAGE_BY_ID[nextStageOf(stage)!].label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              {missing.length > 0 && (
                <div className="text-[12px]" data-testid="move-missing">
                  <p className="text-muted-foreground">Still open before moving on:</p>
                  <ul className="list-disc pl-5">{missing.map((m) => <li key={m.id}>{m.label.split(":")[0]}</li>)}</ul>
                  <button type="button" className={cn(crm.btnGhost, "mt-1")} onClick={() => setMode("anyway")} data-testid="move-anyway">Move on anyway</button>
                </div>
              )}
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!p.hold && stage !== "proposal" && <button type="button" className={crm.btnGhost} onClick={() => setMode("hold")} data-testid="put-on-hold">Put on hold</button>}
          </div>
          {mode === "anyway" && <ReasonPrompt label="Why move on with these open? It stays red on the stage." button="Move on anyway" testId="anyway-reason" onCancel={() => setMode("")} onSubmit={(r) => (stage === "proposal" ? yes(r) : move(r))} />}
          {mode === "no" && (
            <ReasonPrompt label="What tipped it? In their words." button="Close the file as Lost" testId="no-reason" onCancel={() => setMode("")}
              onSubmit={(r) => run(async () => {
                await saveProject(p.id, (pp) => saidNo(pp, r, new Date()), { type: "stage", detail: `They said no: ${r}`, data: { outcome: "lost" } });
                await syncLead(p.leadId, "lost", r);
              })} />
          )}
          {mode === "hold" && (
            <div className="space-y-2">
              <select aria-label="Hold kind" className={inputCls} value={hold} onChange={(e) => setHold(e.target.value as Hold)}>
                <option value="client_delay">Client delay</option><option value="non_payment">Non-payment</option><option value="no_advance">No advance (slot released)</option>
              </select>
              <ReasonPrompt label="Why it is on hold" button="Put on hold" testId="hold-reason" onCancel={() => setMode("")}
                onSubmit={(r) => run(() => saveProject(p.id, (pp) => putOnHold(pp, hold, r, new Date()), { type: "hold", detail: `On hold (${HOLD_LABEL[hold]}): ${r}`, data: { hold } }))} />
            </div>
          )}
          <Problem text={err} />
        </div>
      )}
    </section>
  );
}
