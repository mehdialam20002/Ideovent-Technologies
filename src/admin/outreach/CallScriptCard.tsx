import { useState, type ReactNode } from "react";
import { Check, PhoneCall } from "lucide-react";
import { demoLinkFor } from "@/lib/outreach/engine";
import type { OutreachLead } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";
import { useOutreach } from "./useOutreach";
import { leadDemo, useLeadDemoSites } from "./DemoPicker";
import { callDoneChanges } from "./compose";
import { callScriptFor, type ScriptLanguage } from "./callScript";
import { piecesOf } from "./placeholders";
import { KIND_LABEL, btnSecondary, cardCls, summaryCls } from "./ui";

/**
 * THE CALL SCRIPT CARD on the lead page, folded until needed. The approved
 * call in seven steps (problem, cost in their numbers, the fix for only their
 * problems, honest trust, price in 2 or 3 options, a dated next step, the
 * same-day summary), five questions, and the opening, worded for this lead's
 * kind: a clinic is seen through a patient's eyes, a school through a
 * parent's, an institute through a student's. The words come from
 * callScript.ts; this file only lays them out. It opens by itself when a call
 * is the next thing (the lead said yes or opened the sample).
 *
 * Call done at the bottom records the call the same way the compose menu does,
 * and the message box above moves to After the call.
 */
export function CallScriptCard({ lead }: { lead: OutreachLead }) {
  const { addEvent, saveLead } = useOutreach();
  const sites = useLeadDemoSites();
  // The same rule as the messages (engine.ts checkSend): a demo on the lead, or its demo link, means the sample is made.
  const hasDemo = Boolean(leadDemo(lead, sites) || demoLinkFor(lead.demoSlug));
  // The playbook: polite English to dentists and principals, Hinglish to Hindi-first owners.
  const [lang, setLang] = useState<ScriptLanguage>(() =>
    lead.language === "hinglish" || lead.language === "hi" ? "hinglish" : lead.language === "en" ? "en" : lead.kind === "coaching" ? "hinglish" : "en",
  );
  const [openAtStart] = useState(() => lead.status === "replied" || lead.status === "demo_opened");
  const [logged, setLogged] = useState(false);
  const script = callScriptFor(lead, { hasDemo, language: lang });
  const closed = lead.status === "do_not_contact";

  const callDone = async () => {
    const c = callDoneChanges(lead);
    await addEvent(c.event);
    await saveLead(c.lead);
    setLogged(true);
    document.getElementById("step-2")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <details className={cn(cardCls, "py-2 sm:py-3")} open={openAtStart || undefined} data-testid="call-script">
      <summary className={summaryCls}>
        <span className="inline-flex items-center gap-2 text-foreground">
          <PhoneCall className="h-4 w-4" aria-hidden="true" /> Call script
        </span>
        <span className="ml-auto truncate text-xs font-normal" data-testid="call-script-for">
          {KIND_LABEL[lead.kind] || "Lead"}, seen as a {script.viewer} sees it
        </span>
      </summary>

      {closed ? (
        <p className="pb-3 pt-1 text-sm text-destructive">This lead asked not to be contacted. Do not call.</p>
      ) : (
        <div className="space-y-6 pb-3 pt-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-prose text-sm text-muted-foreground" data-testid="call-when">{script.when}</p>
            <div role="group" aria-label="Language of the call" className="inline-flex shrink-0 rounded-full bg-muted p-1">
              {(["en", "hinglish"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                  className={cn("min-h-10 rounded-full px-3 text-sm font-medium", lang === l ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {l === "en" ? "English" : "Hinglish"}
                </button>
              ))}
            </div>
          </div>

          <Part title="Opening, 15 seconds">
            <Say>{script.opening}</Say>
            <p className="mt-2 text-xs text-muted-foreground">Calling at a time they did not choose? Say why first, and ask for 30 seconds:</p>
            <Say>{script.coldOpening}</Say>
          </Part>

          <Part title="Ask, then listen">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm marker:text-muted-foreground" data-testid="call-questions">
              {script.questions.map((q) => <li key={q}>{q}</li>)}
            </ol>
          </Part>

          <Part title="The call, in this order">
            <ol className="space-y-4" data-testid="call-steps">
              {script.steps.map((s, i) => (
                <li key={s.id} className="flex gap-3" data-step={s.id}>
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">{i + 1}</span>
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold">{s.title}</p>
                    {s.say && <Say>{s.say}</Say>}
                    <p className="text-sm text-muted-foreground">{s.how}</p>
                    {s.list && (
                      <ul className="space-y-1 text-sm">
                        {s.list.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="text-muted-foreground">·</span><span>{x}</span></li>)}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Part>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnSecondary} onClick={() => void callDone()} data-testid="call-done">
              {logged ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <PhoneCall className="h-4 w-4" aria-hidden="true" />}
              {logged ? "Call logged" : "Call done: write the summary"}
            </button>
            <span role="status" className="text-xs text-muted-foreground">{logged ? "Logged. The message box above is on After the call." : ""}</span>
          </div>
        </div>
      )}
    </details>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Words to say, set apart; [what they told you] is highlighted, like a blank in a message. */
function Say({ children }: { children: string }) {
  return (
    <p className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed">
      {piecesOf(children, {}).map((p, i) =>
        p.kind === "text" ? <span key={i}>{p.text}</span> : <mark key={i} className="rounded-sm bg-warning/35 px-0.5 text-foreground">{p.text}</mark>,
      )}
    </p>
  );
}
