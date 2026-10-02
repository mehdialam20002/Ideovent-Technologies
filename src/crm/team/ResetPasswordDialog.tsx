import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { crmErrorText } from "@/lib/outreach/access";
import type { CrmMember } from "@/lib/outreach/team";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { crm } from "../ui";
import { sendThemText } from "./AddLoginSteps";
import { CopyButton, Note } from "./teamUi";
import { teamStore, useTeamRefresh } from "./useTeam";

/**
 * A FORGOTTEN PASSWORD (spec 5.6), from Mehdi's phone. crm_reset_password
 * sets a new temporary password on that person's linked login only (never
 * Mehdi's, never by a typed e-mail), stores only its bcrypt hash, asks them
 * for their own at the next sign-in, and writes an audit line. The password
 * is shown here once, with Copy and "Send them this".
 */
export function ResetPasswordDialog({ open, onOpenChange, member }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CrmMember | null;
}) {
  const { mode } = useCrmMe();
  const refreshTeam = useTeamRefresh();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setPassword(null);
  }, [open, member?.id]);
  if (!member) return null;

  const reset = async () => {
    setBusy(true);
    setErr(null);
    try {
      setPassword(await teamStore().resetPassword(member.id));
      void refreshTeam();
    } catch (e) {
      setErr(crmErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent data-testid="reset-dialog" className="max-h-[92dvh] max-w-md overflow-y-auto rounded-xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-base">Reset {member.displayName}'s password</DialogTitle>
          <DialogDescription className="text-[13px]">
            This gives {member.displayName} a new temporary password. Their old one stops working.
          </DialogDescription>
        </DialogHeader>
        {password ? (
          <div className="space-y-3">
            {mode === "local" && <Note>Local mode: no logins. This password is simulated and opens nothing.</Note>}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <span data-testid="reset-password-value" className="min-w-0 flex-1 break-all font-mono text-[15px] tracking-wide">{password}</span>
              <CopyButton text={password} label="Copy" />
            </div>
            <p className="text-[12px] text-muted-foreground">Shown once: it is saved nowhere. They choose their own at the next sign-in.</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CopyButton text={sendThemText(member.displayName, member.email || "", password)} label="Send them this" className="h-9" />
              <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} onClick={() => onOpenChange(false)}>Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!member.userId && (
              <Note tone="warn">
                {mode === "local"
                  ? "Their login is not linked yet. In local mode, Act as them once to link it."
                  : "Their login is not linked yet. Create it in Supabase (Team shows how), then press Check logins."}
              </Note>
            )}
            {err && <Note tone="bad">{err}</Note>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => onOpenChange(false)} disabled={busy}>Cancel</button>
              <button type="button" data-testid="reset-confirm" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={busy} onClick={() => void reset()}>
                <KeyRound className="h-4 w-4" aria-hidden="true" /> {busy ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
