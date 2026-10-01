import { useId, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { getOutreachStore } from "@/lib/outreach/store";
import { crmErrorText } from "@/lib/outreach/access";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { crm } from "../ui";
import { GateScreen, SignOutButton } from "./AccessOff";

/** Supabase's minimum, as Mehdi sets it (Authentication > Email > minimum length 10; spec 15 step 5). */
export const MIN_PASSWORD = 10;

/**
 * A new password for the signed-in person: supabase.auth.updateUser, then
 * crm_password_changed() so the CRM stops asking. Local mode has no logins,
 * so there it only clears the flag (nothing is stored).
 *
 * If the password saved but the CRM could not note it, a second press only
 * retries the note: the password is never sent twice.
 */
export function PasswordForm({ onSaved, submitLabel = "Save password" }: { onSaved: () => Promise<void> | void; submitLabel?: string }) {
  const { mode } = useCrmMe();
  const id = useId();
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stored, setStored] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);
    if (!stored) {
      if (pw.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
      if (pw !== again) return setError("The two passwords are not the same.");
    }
    setBusy(true);
    try {
      if (!stored && mode === "supabase") {
        const { supabase } = await import("@/lib/cms/client");
        const { error: authError } = await supabase().auth.updateUser({ password: pw });
        if (authError) throw new Error(authError.message || "The password was not changed.");
      }
      setStored(true);
      await getOutreachStore().passwordChanged();
      setPw("");
      setAgain("");
      setStored(false);
      setDone(true);
      await onSaved();
    } catch (err) {
      setError(crmErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";
  return (
    <form onSubmit={submit} className="space-y-3" noValidate data-testid="crm-password-form">
      {mode === "local" && (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px]">
          Local mode has no logins: nothing is stored. Saving only marks the password as set.
        </p>
      )}
      {stored ? (
        <p className="text-foreground">Your new password is saved. Press the button again so the CRM notes it.</p>
      ) : (
        <>
          <div>
            <label htmlFor={`${id}-pw`} className="text-[13px] font-medium text-foreground">New password</label>
            <input
              id={`${id}-pw`}
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={field}
            />
            <p id={`${id}-hint`} className="mt-1 text-[12px]">At least {MIN_PASSWORD} characters. Never share it, not even with another intern.</p>
          </div>
          <div>
            <label htmlFor={`${id}-again`} className="text-[13px] font-medium text-foreground">The same password again</label>
            <input
              id={`${id}-again`}
              type="password"
              autoComplete="new-password"
              required
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              className={field}
            />
          </div>
        </>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-[13px] text-destructive">{error}</p>
      )}
      {done && !error && <p role="status" className="text-[13px] text-success">Password changed.</p>}
      <button type="submit" disabled={busy} className={cn(crm.btnPrimary, "h-11 w-full sm:w-auto")}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {stored ? "Note it" : submitLabel}
      </button>
    </form>
  );
}

/**
 * GATE 3 (spec 10.1, 5.2): the first sign-in, with the temporary password
 * Mehdi sent. Until the person sets their own (must_change_password), this is
 * the only screen of the CRM they see.
 */
export function FirstPassword() {
  const { me, refresh } = useCrmMe();
  return (
    <GateScreen icon={KeyRound} title="Set your own password" testId="crm-first-password">
      <p>
        {me.displayName ? `Welcome, ${me.displayName}. ` : ""}You signed in with the temporary password Mehdi sent you. Choose
        your own before you start.
      </p>
      {me.email && <p className="text-[13px]">Signed in as <span className="font-medium text-foreground">{me.email}</span></p>}
      <PasswordForm onSaved={refresh} />
      <div className="border-t border-border pt-3">
        <SignOutButton />
      </div>
    </GateScreen>
  );
}
