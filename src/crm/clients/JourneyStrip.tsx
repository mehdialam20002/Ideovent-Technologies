import { Check } from "lucide-react";
import { doneBefore, stageIndex, stageOverridden, STAGES } from "@/lib/clients/stages";
import type { CrmProject, StageId } from "@/lib/clients/types";
import { cn } from "@/lib/utils";

/**
 * THE JOURNEY STRIP (client-process-spec 10.3): the twelve stages, the current one highlighted, done
 * ones ticked, an overridden gate red, each with its Hinglish label. It scrolls inside its own box on a
 * phone; the page never scrolls sideways. Tapping a step shows that stage's card.
 *
 * Every label stays inside its own step (the walk-through of 4 Oct 2026 found "Launch payment and go-live" running
 * 42 px over the next step at 1440 px): the step clips, the stage's name wraps onto a second line and the Hinglish
 * one is cut with an ellipsis; the whole name is the step's tooltip and its accessible name.
 */
export function JourneyStrip({ project, view, onView }: { project: CrmProject; view: StageId; onView: (s: StageId) => void }) {
  const at = stageIndex(project.stage);
  return (
    <nav aria-label="The client's journey" className="overflow-x-auto rounded-xl border border-border bg-card" data-testid="journey-strip">
      <ol className="flex min-w-max">
        {STAGES.map((s, i) => {
          const done = i < at || (project.outcome === "closed" && i === at) || doneBefore(project, s.id);
          const current = i === at && !project.outcome;
          const red = stageOverridden(project, s.id);
          return (
            <li key={s.id}>
              <button type="button" onClick={() => onView(s.id)} aria-current={current ? "step" : undefined} data-testid="journey-step" data-stage={s.id}
                title={`${s.n}. ${s.label} (${s.hinglish})`}
                className={cn(
                  "flex h-full min-h-14 w-[7.5rem] flex-col items-stretch gap-0.5 overflow-hidden border-r border-border px-2.5 py-2 text-left text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  current && "bg-primary/10", view === s.id && "outline outline-2 -outline-offset-2 outline-primary/60", red && "border-b-2 border-b-destructive",
                )}>
                <span className="flex min-w-0 items-start gap-1 font-semibold">
                  {done ? <Check className="mt-px h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" /> : <span className={cn("shrink-0 tabular-nums", current ? "text-primary" : "text-muted-foreground")}>{s.n}</span>}
                  <span className={cn("line-clamp-2 min-w-0 break-words leading-tight", current && "text-primary")}>{s.label}</span>
                </span>
                <span className="block min-w-0 truncate text-muted-foreground">{s.hinglish}</span>
                {current && project.hold && <span className="rounded bg-muted px-1 text-[10px]">On hold</span>}
                {red && <span className="text-[10px] font-medium text-destructive">Overridden</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
