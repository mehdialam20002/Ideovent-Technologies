import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { crmErrorText } from "@/lib/outreach/access";
import { useOutreach } from "./useOutreach";
import { LeadFields, draftToLead, type LeadDraft } from "./LeadFields";
import { btnPrimary, btnSecondary, cardCls } from "./ui";

/**
 * New lead: the fields, then straight into the lead page to compose.
 *
 * INSERT ONLY (spec 9.3): createLead never overwrites a lead with the same id.
 * A member's new lead is theirs and starts at New; the database refuses it
 * when its phone or e-mail is already a lead anywhere in the team, at their
 * New-lead cap, or past the day's budget, and the refusal shows as written
 * (the duplicate warning above the button already says whose it is).
 */
export function NewLeadForm({ onCancel, onCreated, onOpen }: { onCancel: () => void; onCreated: (id: string) => void; onOpen: (id: string) => void }) {
  const { createLead, me } = useOutreach();
  const [draft, setDraft] = useState<LeadDraft>({ instituteName: "", kind: "school", language: "en", waSame: true, source: "Manual" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const member = me.role === "member" && !me.legacy;

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
          const saved = await createLead({ ...draftToLead(draft), status: "new" });
          onCreated(saved.id);
        } catch (x) {
          setErr("Not saved: " + crmErrorText(x));
        } finally {
          setBusy(false);
        }
      }}
    >
      <button type="button" onClick={onCancel} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </button>
      <h1 className="mb-4 font-display text-xl font-semibold">New lead</h1>
      {member && (
        <p className="-mt-2 mb-4 text-sm text-muted-foreground" data-testid="new-lead-member-note">
          It will be yours, at New. A number or e-mail that is already a lead in the CRM cannot be added again.
        </p>
      )}
      <LeadFields value={draft} onChange={setDraft} onOpenDuplicate={onOpen} tried={tried} />
      {err && <p role="alert" data-testid="new-lead-error" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className={btnPrimary + " flex-1 sm:flex-none"} disabled={busy}>
          <Plus className="h-4 w-4" aria-hidden="true" /> {busy ? "Saving…" : "Save and compose"}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
