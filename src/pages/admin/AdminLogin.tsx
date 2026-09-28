import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/admin/auth";
import { Aurora } from "@/components/ui/aurora";
import { Seo } from "@/components/seo/Seo";

const fieldCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors " +
  "focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/*
  Back to where the sign-in was asked for (ProtectedRoute passes it as
  state.from). Matters for the CRM: it opens in a new tab, and in local mode
  the session is per tab, so the new tab signs in and must land on /crm, not
  on the admin dashboard. Only our own two apps are accepted.
*/
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (typeof from !== "string" || from.startsWith("/admin/login")) return "/admin";
  return /^\/(admin|crm)(\/|$)/.test(from) ? from : "/admin";
}

export default function AdminLogin() {
  const { login, mode, authed } = useAdminAuth();
  const navigate = useNavigate();
  const back = returnPath(useLocation().state);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /*
    In an effect, not in the render body. Calling navigate() during render made
    the router set state while this component was still rendering, which React
    reports as "Cannot update a component (BrowserRouter) while rendering a
    different component (AdminLogin)": the only console error left anywhere on
    the site, and a real re-entrancy bug rather than a lint nit.
  */
  useEffect(() => {
    if (authed) navigate(back, { replace: true });
  }, [authed, navigate, back]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(a, b);
    setBusy(false);
    if (res.ok) navigate(back, { replace: true });
    else setError(res.error || "Login failed");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <Seo title="Admin login" noindex />
      <Aurora />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-3xl border border-border bg-card/70 p-8 backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Admin access</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "supabase" ? "Sign in with your email and password.": "Enter your admin passcode."}</p>
        </div>

        {/*
          Every control here used to be labelled by its placeholder alone: no id,
          no <label>, so a screen reader announced three unlabelled edit boxes and
          the placeholder vanished the moment you typed. `outline-none` also beat
          the baseline focus ring in index.css, leaving a border-colour change as
          the only focus cue. Both fixed below, with autoComplete so password
          managers can fill the form.
        */}
        {mode === "supabase" ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                aria-required="true"
                aria-describedby={error ? "admin-error": undefined}
                value={a}
                onChange={(e) => setA(e.target.value)}
                placeholder="you@ideovent.in"
                className={fieldCls}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">Password</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                aria-required="true"
                aria-describedby={error ? "admin-error": undefined}
                value={b}
                onChange={(e) => setB(e.target.value)}
                placeholder="Your password"
                className={fieldCls}
              />
            </div>
          </div>
): (
          <div>
            <label htmlFor="admin-passcode" className="mb-1.5 block text-sm font-medium">Passcode</label>
            <input
              id="admin-passcode"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
              aria-describedby={error ? "admin-error": undefined}
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="Your admin passcode"
              autoFocus
              className={fieldCls}
            />
          </div>
)}

        {/* role="alert" so a failed sign-in is announced, not only reddened. */}
        {error && (
          <p id="admin-error" role="alert" className="mt-3 text-center text-sm text-destructive">
            {error}
          </p>
)}

        <button type="submit" disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />: null} Sign in
        </button>
        <p aria-live="polite" className="sr-only">{busy ? "Signing in.": ""}</p>
      </form>
    </div>
);
}
