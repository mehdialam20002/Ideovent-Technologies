import { useState, type ReactNode } from "react";
import { Loader2, LogOut, RefreshCw, ShieldOff, WifiOff, type LucideIcon } from "lucide-react";
import { useAdminAuth } from "@/admin/auth";
import { Seo } from "@/components/seo/Seo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { ActAsMenu, useCrmMe } from "../useCrmMe";
import { crm } from "../ui";

/**
 * A whole-screen card in front of the CRM: the gates of spec 10.1 (access
 * off, the first password). Nothing of the CRM is loaded behind it. Theme and,
 * in local mode, Act as stay reachable, so local mode can switch back.
 */
export function GateScreen({
  icon: Icon,
  title,
  children,
  testId,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Seo title="CRM" noindex />
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <span className="font-display text-[15px] font-semibold">
          Ideovent <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">CRM</span>
        </span>
        <div className="flex items-center gap-1.5">
          <ActAsMenu />
          <ThemeToggle />
        </div>
      </div>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <section data-testid={testId} aria-labelledby="crm-gate-title" className={cn(crm.panel, "w-full max-w-md p-6 sm:p-7")}>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 id="crm-gate-title" className="mt-4 font-display text-xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-2 space-y-3 text-sm text-muted-foreground">{children}</div>
        </section>
      </main>
    </div>
  );
}

/** Sign out of the CRM (and, on the same site, of /admin): the sign-in page follows by itself. */
export function SignOutButton({ className, label = "Sign out" }: { className?: string; label?: string }) {
  const { logout } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      data-testid="crm-sign-out"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await logout();
        } finally {
          setBusy(false);
        }
      }}
      className={cn(crm.btn, className)}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  );
}

const WHY: Record<string, string> = {
  deactivated: "Mehdi has switched your access off.",
  not_a_member: "This login is not in the CRM's team yet, or it is not linked to it yet.",
  signed_out: "Your session has ended.",
};

/**
 * GATE 2 (spec 10.1): crm_me() answered with no role. The person was switched
 * off, the login is not in the team (an unconfirmed e-mail is never linked),
 * or the session ended. From their next request the database gives them
 * nothing anyway; this says so in words, with Sign out.
 */
export function AccessOff() {
  const { me } = useCrmMe();
  const reason = me.reason || "not_a_member";
  return (
    <GateScreen icon={ShieldOff} title="Your access is off" testId="crm-access-off">
      <p className="text-foreground">Your access to the CRM is off, or not set up yet. Ask Mehdi.</p>
      <p data-testid="crm-access-off-reason">{WHY[reason] || WHY.not_a_member}</p>
      <div className="pt-2">
        <SignOutButton label={reason === "signed_out" ? "Sign in again" : "Sign out"} />
      </div>
    </GateScreen>
  );
}

/** crm_me could not be read at all (offline, or the database did not answer). */
export function MeUnavailable({ error }: { error: string }) {
  const { refresh } = useCrmMe();
  const [busy, setBusy] = useState(false);
  return (
    <GateScreen icon={WifiOff} title="The CRM could not check your access" testId="crm-me-error">
      <p role="alert" className="break-words text-foreground">{error}</p>
      <p>Check the connection and try again. If it keeps happening, tell Mehdi.</p>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await refresh();
            } finally {
              setBusy(false);
            }
          }}
          className={crm.btnPrimary}
        >
          <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden="true" /> Try again
        </button>
        <SignOutButton />
      </div>
    </GateScreen>
  );
}
