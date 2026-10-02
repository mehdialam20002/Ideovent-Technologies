import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { crmErrorText } from "@/lib/outreach/access";
import { useOutreach } from "@/admin/outreach/useOutreach";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { TellMehdiButton } from "./TellMehdiButton";
import { forgetHandover, handoverText, rememberHandover } from "./tellMehdi";

/** The leads a hand-over refuses (crm_handoff): Proposal, Won, Lost, Do not contact. */
export const NOT_HANDED_OVER: readonly OutreachLead["status"][] = ["proposal", "won", "lost", "do_not_contact"];

/**
 * HAND TO MEHDI (spec 10.7; crm_handoff). The default action as soon as a
 * prospect says yes: the lead passes to Mehdi with a note, the member keeps the
 * credit ("They are interested"), and it waits on his "Waiting on you" until he
 * marks it accepted or not real. "Give back" returns a lead that is not a fit
 * (no credit). Never sideways to another intern, and in P1 without a call
 * time: Mehdi books the call himself. After it succeeds, Tell Mehdi on
 * WhatsApp reaches him with the CRM closed.
 */
export function HandoffDialog({ lead, open, onClose, qualified: initial = true }: {
  lead: OutreachLead;
  open: boolean;
  onClose: () => void;
  /** Starts on "They are interested" (true) or "Give back" (false). */
  qualified?: boolean;
}) {
  const { handoff, me } = useOutreach();
  const [qualified, setQualified] = useState(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setQualified(initial);
    setNote("");
    setErr(null);
    setDone(null);
  }, [open, initial]);

  const name = (me.senderName || me.displayName || "Someone").trim();
  const submit = async () => {
    const text = note.trim();
    if (!text) return setErr("Write what they said, in a line or two: Mehdi reads it before he calls.");
    setBusy(true);
    setErr(null);
    const tell = handoverText(name, lead.instituteName, lead.id, qualified);
    rememberHandover(lead.id, tell);
    try {
      await handoff({ leadId: lead.id, note: text, qualified });
      setDone(tell);
    } catch (e) {
      forgetHandover(lead.id);
      setErr(crmErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="handoff-dialog" className="max-w-md rounded-xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="h-4 w-4" aria-hidden="true" /> Hand to Mehdi</DialogTitle>
          <DialogDescription className="text-[13px]">
            {lead.instituteName} goes to Mehdi now. He sends the price and sets the call; you keep the credit when they are interested.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-3" data-testid="handoff-done">
            <p role="status" className="text-[13px]">Handed over. It waits on Mehdi's "Waiting on you" until he marks it.</p>
            <div className="flex flex-wrap gap-2">
              <TellMehdiButton text={done} primary />
              <button type="button" className={crm.btn} onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <fieldset className="space-y-1">
              <legend className="sr-only">Why you hand it over</legend>
              <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] md:min-h-9">
                <input type="radio" name="handoff-kind" className="mt-1" checked={qualified} onChange={() => setQualified(true)} />
                <span><span className="font-medium">They are interested</span><span className="block text-muted-foreground">They said yes, or want a call or the price.</span></span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] md:min-h-9">
                <input type="radio" name="handoff-kind" className="mt-1" checked={!qualified} onChange={() => setQualified(false)} />
                <span><span className="font-medium">Give back</span><span className="block text-muted-foreground">Not a fit for you to work (no credit).</span></span>
              </label>
            </fieldset>
            <div>
              <label htmlFor="handoff-note" className="text-[13px] font-medium">What they said</label>
              <textarea id="handoff-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} data-testid="handoff-note"
                placeholder="Who you spoke to, what they want, when they can talk"
                className={cn(crm.input, "mt-1 h-auto py-2 max-md:text-base")} />
            </div>
            {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={crm.btn} onClick={onClose}>Cancel</button>
              <button type="submit" className={crm.btnPrimary} disabled={busy} data-testid="handoff-submit">
                {busy ? "Handing over..." : qualified ? "Hand to Mehdi" : "Give back"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
