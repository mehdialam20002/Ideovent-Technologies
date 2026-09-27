import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useOutreach } from "./useOutreach";
import { LeadFields, draftToLead, type LeadDraft } from "./LeadFields";
import { btnPrimary, btnSecondary, cardCls } from "./ui";

/** New lead: the fields, then straight into the lead page to compose. */
export function NewLeadForm({ onCancel, onCreated, onOpen }: { onCancel: () => void; onCreated: (id: string) => void; onOpen: (id: string) => void }) {
  const { saveLead } = useOutreach();
  const [draft, setDraft] = useState<LeadDraft>({ instituteName: "", kind: "school", language: "en", waSame: true, source: "Manual" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const invalid = !draft.instituteName.trim() || (!draft.phone?.trim() && !draft.email?.trim() && !draft.whatsapp?.trim());

  return (
    <form
      className={cardCls}
      onSubmit={async (e) => {
        e.preventDefault();
        setTried(true);
        if (invalid || busy) return;
        setBusy(true);
        setErr(null);
        try {
          const saved = await saveLead({ ...draftToLead(draft), status: "new" });
          onCreated(saved.id);
        } catch (x) {
          setErr("Not saved: " + ((x as Error).message || "unknown error"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <button type="button" onClick={onCancel} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </button>
      <h2 className="mb-4 font-display text-xl font-semibold">New lead</h2>
      <LeadFields value={draft} onChange={setDraft} onOpenDuplicate={onOpen} tried={tried} />
      {err && <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className={btnPrimary + " flex-1 sm:flex-none"} disabled={busy}>
          <Plus className="h-4 w-4" aria-hidden="true" /> {busy ? "Saving…" : "Save and compose"}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
