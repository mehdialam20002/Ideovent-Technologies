import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./auth";
import { crmMovedOut, crmOriginUrl, CRM_ORIGIN, isCrmHost } from "@/lib/host";

/*
  Where a signed-out visitor is sent. On the main site that is /admin/login, as
  always. On the CRM's own subdomain (crm.ideovent.in) there is no /admin: the
  sign-in is /login there. Supabase keeps its session per origin, so the CRM
  host asks for the sign-in once on its own even when the admin is signed in.
*/
const LOGIN_PATH = isCrmHost() ? "/login" : "/admin/login";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading…
    </div>
  );
}

/**
 * Signed in, or off to the sign-in page. `ownerOnly` (the /admin pages): signed
 * in AS MEHDI. Since the CRM team (0011) an intern's login is a real session
 * too, so for /admin "signed in" is not enough.
 */
export function ProtectedRoute({ children, ownerOnly = false }: { children: ReactNode; ownerOnly?: boolean }) {
  const { authed, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!authed) return <Navigate to={LOGIN_PATH} state={{ from: location.pathname + location.search }} replace />;
  if (ownerOnly) return <OwnerOnly>{children}</OwnerOnly>;
  return <>{children}</>;
}

type Check =
  | { state: "checking" }
  | { state: "owner" }
  | { state: "other"; backToMehdi?: () => void }
  | { state: "error"; message: string };

/**
 * crm_me().role === "owner", or legacy mode (0011 not applied: then every
 * login is Mehdi's, as before). In local mode, the CRM's acting person
 * (Act as). The store is imported lazily, as the admin's CRM badge does, so
 * the admin shell does not carry it until this first read.
 *
 * Not the lock: the CMS, payments and AI keys are refused to anyone but
 * Mehdi by the database (public.is_admin(), 0005 and 0010). This keeps other
 * people out of a panel that would only fail for them.
 */
function OwnerOnly({ children }: { children: ReactNode }) {
  const [check, setCheck] = useState<Check>({ state: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setCheck({ state: "checking" });
    (async () => {
      try {
        const { getOutreachStore } = await import("@/lib/outreach/store");
        const store = getOutreachStore();
        const me = await store.me();
        if (!alive) return;
        if (me.legacy || me.role === "owner") return setCheck({ state: "owner" });
        /* Local mode acting as someone (the CRM's Act as): one press back to Mehdi. */
        const acting = store.mode === "local" && store.actAs ? store.actingAs?.() ?? null : null;
        const backToMehdi = acting
          ? () => {
              store.actAs?.(null);
              setAttempt((n) => n + 1);
            }
          : undefined;
        setCheck({ state: "other", backToMehdi });
      } catch (err) {
        if (alive) setCheck({ state: "error", message: (err as Error)?.message || "No answer." });
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (check.state === "checking") return <Loading />;
  if (check.state === "owner") return <>{children}</>;
  return (
    <NotForYou
      error={check.state === "error" ? check.message : undefined}
      onRetry={() => setAttempt((n) => n + 1)}
      backToMehdi={check.state === "other" ? check.backToMehdi : undefined}
    />
  );
}

/* Where this person's CRM is: its own subdomain once it has one (crm.ideovent.in), else /crm on this site. */
const CRM_HREF = crmMovedOut() ? crmOriginUrl("/crm") : "/crm";
const crmLabel = () =>
  crmMovedOut() ? CRM_ORIGIN.replace(/^https?:\/\//i, "") : `${typeof window !== "undefined" ? window.location.host : ""}/crm`;

/**
 * Anyone but Mehdi on /admin: a plain page with the way to their CRM, and Sign
 * out. In local mode while the CRM acts as someone else, also the way back to
 * Mehdi (no login is involved there, only the Act as choice).
 */
function NotForYou({ error, onRetry, backToMehdi }: { error?: string; onRetry: () => void; backToMehdi?: () => void }) {
  const { logout } = useAdminAuth();
  const btn =
    "inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <section data-testid="admin-owner-only" className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        {error ? (
          <>
            <h1 className="font-display text-xl font-semibold">Your access could not be checked</h1>
            <p role="alert" className="mt-2 break-words text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold">This page is for Mehdi</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your CRM is at{" "}
              <a href={CRM_HREF} className="font-medium text-primary underline-offset-4 hover:underline">
                {crmLabel()}
              </a>
              .
            </p>
          </>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {error && (
            <button type="button" onClick={onRetry} className={btn}>
              Try again
            </button>
          )}
          {backToMehdi && (
            <button type="button" data-testid="admin-act-as-owner" onClick={backToMehdi} className={btn}>
              Local mode: act as Mehdi again
            </button>
          )}
          <button type="button" onClick={() => void logout()} className={btn}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
