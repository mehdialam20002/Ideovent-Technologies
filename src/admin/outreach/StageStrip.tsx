import type { TemplateChannel, TemplateStage } from "@/lib/outreach/templates";
import type { LeadKind } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";
import {
  PLAIN_STAGES,
  PLAIN_STAGE_LABELS,
  dayOf,
  engineStagesOf,
  plainStageOf,
  stageHint,
  stagesWithMessages,
  type PlainStage,
  type StageSuggestion,
} from "./stages";

export interface StageChoice {
  plain: PlainStage;
  /** The engine's stage; null for a plain stage that has none (nothing to send there). */
  stage: TemplateStage | null;
}

/**
 * Every stage, in plain words, as one row of buttons: First message, After
 * they say yes, Follow-up, After the call, Proposal, Closing. The one the
 * lead is at carries "now"; the one on screen is filled. A stage with no
 * message on this channel is dashed, and picking it says why (WhatsApp has
 * one follow-up and no closing message). Follow-up on e-mail has more than one
 * step, so it gets a second row: day 4, day 9.
 */
export function StageStrip({ channel, kind, current, suggested, onPick }: {
  channel: TemplateChannel;
  kind: LeadKind;
  current: StageChoice;
  suggested: StageSuggestion;
  onPick: (choice: StageChoice) => void;
}) {
  const withMessages = new Set(stagesWithMessages(channel, kind));
  const suggestedPlain = plainStageOf(suggested.stage);
  const pick = (plain: PlainStage) => {
    if (plain === suggestedPlain) return onPick({ plain, stage: suggested.stage });
    const all = engineStagesOf(plain);
    onPick({ plain, stage: all.find((s) => withMessages.has(s)) ?? all[0] ?? null });
  };
  const steps = engineStagesOf(current.plain).filter((s) => withMessages.has(s));

  return (
    <div data-testid="stage-strip">
      <p className="mb-1.5 text-sm font-medium" id="stage-label">Stage</p>
      <div role="group" aria-labelledby="stage-label" className="flex flex-wrap gap-1.5">
        {PLAIN_STAGES.map((plain) => {
          const on = plain === current.plain;
          const has = engineStagesOf(plain).some((s) => withMessages.has(s));
          const now = plain === suggestedPlain;
          return (
            <button key={plain} type="button" aria-pressed={on} data-stage={plain} data-now={now || undefined} onClick={() => pick(plain)}
              title={has ? undefined : `No ${channel === "email" ? "e-mail" : "WhatsApp"} message at this stage`}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                !has && !on && "border-dashed font-normal text-muted-foreground",
              )}>
              {PLAIN_STAGE_LABELS[plain]}
              {now && (
                <span className={cn("rounded-full px-1.5 text-[11px] font-semibold uppercase leading-5 tracking-wide", on ? "bg-primary-foreground/20" : "bg-primary/10 text-primary")}>
                  now
                </span>
              )}
            </button>
          );
        })}
      </div>

      {steps.length > 1 && (
        <div role="group" aria-label={`${PLAIN_STAGE_LABELS[current.plain]} step`} className="mt-2 flex flex-wrap gap-1.5" data-testid="stage-steps">
          {steps.map((s, i) => {
            const on = s === current.stage;
            const day = dayOf(s);
            return (
              <button key={s} type="button" aria-pressed={on} data-engine-stage={s} onClick={() => onPick({ plain: current.plain, stage: s })}
                className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {day ? `Day ${day}` : `${PLAIN_STAGE_LABELS[current.plain]} ${i + 1}`}
                {s === suggested.stage && <span className="text-[11px] font-semibold uppercase tracking-wide">now</span>}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground" data-testid="stage-hint">{stageHint(current.plain, channel, kind)}</p>
      {suggested.done && current.plain === suggestedPlain && (
        <p role="note" className="mt-2 rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm" data-testid="stage-done">
          {suggested.done}
        </p>
      )}
    </div>
  );
}
