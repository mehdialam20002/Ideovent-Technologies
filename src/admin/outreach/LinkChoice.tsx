import type { LinkChoiceValue } from "@/lib/outreach/linkChoice";
import { cn } from "@/lib/utils";

/**
 * THE SAMPLE LINK SWITCH (2 Oct 2026): Without link / With link, under the template list of a first
 * message that says the sample is made. ComposePanel owns the value: an e-mail starts With link every
 * time; a WhatsApp starts on the version last sent in this browser (below), Without link the very first
 * time. With a reason (the link would not open, the sender is not Mehdi, or it must not go cold) With
 * link is off, the shown value is Without link whatever was chosen, and the reason is said under it.
 */

const KEY = "ideovent_crm_wa_first_link";

/**
 * The WhatsApp first-message version last sent in this browser, "without" the very first time. Per
 * browser and per address: the CRM's own host and ideovent.in/crm each keep their own. A private window
 * or blocked storage reads "without" and keeps nothing.
 */
export function readWaLinkChoice(): LinkChoiceValue {
  try {
    return localStorage.getItem(KEY) === "with" ? "with" : "without";
  } catch {
    return "without";
  }
}

export function writeWaLinkChoice(v: LinkChoiceValue): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private window: the choice is not kept */
  }
}

const OPTION = "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium";

export function LinkChoice({ value, onChange, disabledReason, hint }: {
  value: LinkChoiceValue;
  onChange: (v: LinkChoiceValue) => void;
  /** Why With link is off for this message; "" when it may go. */
  disabledReason?: string;
  /** One line under the switch (linkChoice.ts linkHint). */
  hint: string;
}) {
  const off = Boolean(disabledReason);
  const shown: LinkChoiceValue = off ? "without" : value;
  const look = (on: boolean) => (on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground");
  return (
    <div data-testid="link-choice" className="mt-3">
      <p className="mb-1.5 text-sm font-medium" id="link-choice-label">Sample link in this message</p>
      <div role="radiogroup" aria-labelledby="link-choice-label" className="inline-flex max-w-full flex-wrap gap-1 rounded-3xl bg-muted p-1">
        <button type="button" role="radio" aria-checked={shown === "without"} data-testid="link-choice-without"
          onClick={() => onChange("without")} className={cn(OPTION, look(shown === "without"))}>
          Without link
        </button>
        <button type="button" role="radio" aria-checked={shown === "with"} disabled={off} aria-disabled={off}
          aria-describedby={off ? "link-choice-why" : undefined} data-testid="link-choice-with"
          onClick={() => onChange("with")} className={cn(OPTION, look(shown === "with"), off && "cursor-not-allowed opacity-50 hover:text-muted-foreground")}>
          With link
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground" data-testid="link-choice-hint">{hint}</p>
      {off && (
        <p id="link-choice-why" className="mt-1 text-xs text-warning" data-testid="link-choice-reason">
          No link for now. {disabledReason}
        </p>
      )}
    </div>
  );
}
