import { useState } from "react";
import { Plus } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { NOTES_APPEND_MAX, crmErrorText } from "@/lib/outreach/access";
import { useOutreach } from "@/admin/outreach/useOutreach";
import { cn } from "@/lib/utils";
import { crm } from "../ui";

/**
 * NOTES THAT ONLY GROW (spec 10.7; crm_append_notes). A member reads the notes
 * as they are and adds a line with "Add to notes": the server appends it to
 * the notes as they are now, so nothing anyone wrote is ever replaced (the
 * database refuses a member's notes that do not start with the old ones).
 * Mehdi and admins keep the editable box on the lead page.
 */
export function NotesBox({ lead }: { lead: OutreachLead }) {
  const { appendNotes } = useOutreach();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const line = text.trim();
    if (!line || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await appendNotes(lead.id, line);
      setText("");
    } catch (e) {
      setErr(crmErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="notes-box">
      {lead.notes?.trim() ? (
        <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/40 px-3 py-2 text-sm" data-testid="notes-read">{lead.notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <label htmlFor={`notes-add-${lead.id}`} className="sr-only">Add a line to the notes</label>
        <input id={`notes-add-${lead.id}`} value={text} maxLength={NOTES_APPEND_MAX} onChange={(e) => setText(e.target.value)} data-testid="notes-add"
          placeholder="Who picks up, best time to call, what they said" className={cn(crm.input, "h-10 max-md:h-11 max-md:text-base")} />
        <button type="submit" className={cn(crm.btn, "h-10 shrink-0 max-md:h-11")} disabled={!text.trim() || busy} data-testid="notes-add-submit">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add to notes
        </button>
      </form>
      {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
      <p className="text-xs text-muted-foreground">What is written stays: a note that is wrong is corrected by Mehdi (Ask Mehdi).</p>
    </div>
  );
}
