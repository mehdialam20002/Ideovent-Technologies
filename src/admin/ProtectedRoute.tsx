import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./auth";
import { isCrmHost } from "@/lib/host";
import type { ReactNode } from "react";

/*
  Where a signed-out visitor is sent. On the main site that is /admin/login, as
  always. On the CRM's own subdomain (crm.ideovent.in) there is no /admin: the
  sign-in is /login there. Supabase keeps its session per origin, so the CRM
  host asks for the sign-in once on its own even when the admin is signed in.
*/
const LOGIN_PATH = isCrmHost() ? "/login" : "/admin/login";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { authed, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!authed) return <Navigate to={LOGIN_PATH} state={{ from: location.pathname + location.search }} replace />;
  return <>{children}</>;
}
