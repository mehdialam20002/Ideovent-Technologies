import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import type { AskTopic } from "@/lib/outreach/team";
import { crmErrorText } from "@/lib/outreach/access";
import { useOutreach } from "@/admin/outreach/useOutreach";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { TellMehdiButton } from "./TellMehdiButton";
import { askText } from "./tellMehdi";

const TOPICS: { id: AskTopic; label: string; hint: string }[] = [
  // The words of spec 10.7, Mehdi's "Waiting on you" and the intern guide: Demo request, Correction, Question.
  { id: "demo", label: "Demo request", hint: "A demo for this lead: Mehdi makes it and links it, and the lead comes back to you due now." },
  { id: "correction", label: "Correction", hint: "A wrong number, name or detail that you cannot change yourself." },
  { id: "question", label: "Question", hint: "Anything else about this lead." },
];

/**
 * ASK MEHDI (spec 10.7; crm_ask_owner): a demo request, a correction or a
 * question about one lead. It becomes a history line, an open request on
 * Mehdi's "Waiting on you" and a ring of his bell; then Tell Mehdi on WhatsApp
 * reaches him with the CRM closed. The lead stays the member's.
 */
export function AskOwnerDialog({ lead, open, onClose, topic: initialTopic = "question", text: initialText = "" }: {
  lead: OutreachLead;
  open: boolean;
  onClose: () => void;
  topic?: AskTopic;
  /** A first line, e.g. "The phone number is wrong:". */
  text?: string;
}) {
  const { askOwner, me } = useOutreach();
  const [topic, setTopic] = useState<AskTopic>(initialTopic);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setTopic(initialTopic);
    setText(initialText);
    setErr(null);
    setDone(null);
  }, [open, initialTopic, initialText]);

  const submit = async () => {
    const body = text.trim();
    if (!body) return setErr("Say what you need, in a line or two.");
    setBusy(true);
    setErr(null);
    try {
      await askOwner(lead.id, topic, body);
      setDone(askText((me.senderName || me.displayName || "Someone").trim(), lead.instituteName, lead.id, topic));
    } catch (e) {
      setErr(crmErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="ask-dialog" className="max-w-md rounded-xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><HelpCircle className="h-4 w-4" aria-hidden="true" /> Ask Mehdi</DialogTitle>
          <DialogDescription className="text-[13px]">About {lead.instituteName}. It waits on his "Waiting on you" until he answers.</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-3" data-testid="ask-done">
            <p role="status" className="text-[13px]">Sent to Mehdi. You see his answer under My day.</p>
            <div className="flex flex-wrap gap-2">
              <TellMehdiButton text={done} primary />
              <button type="button" className={crm.btn} onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <fieldset className="space-y-1">
              <legend className="sr-only">What you need</legend>
              {TOPICS.map((t) => (
                <label key={t.id} className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] md:min-h-9">
                  <input type="radio" name="ask-topic" className="mt-1" checked={topic === t.id} onChange={() => setTopic(t.id)} />
                  <span><span className="font-medium">{t.label}</span><span className="block text-muted-foreground">{t.hint}</span></span>
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor="ask-text" className="text-[13px] font-medium">Your message</label>
              <textarea id="ask-text" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} data-testid="ask-text"
                className={cn(crm.input, "mt-1 h-auto py-2 max-md:text-base")} />
            </div>
            {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={crm.btn} onClick={onClose}>Cancel</button>
              <button type="submit" className={crm.btnPrimary} disabled={busy} data-testid="ask-submit">{busy ? "Sending..." : "Send to Mehdi"}</button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
