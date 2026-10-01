import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { crmMovedOut, crmOriginUrl } from "@/lib/host";
import { CRM } from "./nav";

/** Where an old /admin/outreach address goes in the CRM. Pure, for tests. */
export function crmPathForOutreach(params: URLSearchParams): string {
  const lead = params.get("lead");
  if (lead) return CRM.lead(lead);
  if (params.get("new") === "1") return CRM.newLead;
  switch (params.get("tab")) {
    case "today":
      return CRM.today;
    case "leads":
      return CRM.leads;
    case "import":
      return CRM.import;
    case "settings":
      return CRM.settings;
    default:
      return CRM.root;
  }
}

/**
 * /admin/outreach now lives in the CRM. Old links (the Lead Finder's "Added
 * leads are in Outreach", bookmarks, ?lead=<id> deep links) land on the
 * matching CRM screen:
 *   - at /crm on the main site, today and on localhost;
 *   - on the CRM's own subdomain once VITE_CRM_URL is set (crmMovedOut), which
 *     is another origin, so the browser goes there rather than the router;
 *   - at the root of the CRM host itself (App.tsx mounts this there too), where
 *     CRM.* already has no /crm prefix.
 */
export default function OutreachRedirect() {
  const [params] = useSearchParams();
  const path = crmPathForOutreach(params);
  const away = crmMovedOut() ? crmOriginUrl(path) : "";
  useEffect(() => {
    if (away) window.location.replace(away);
  }, [away]);
  if (!away) return <Navigate to={path} replace />;
  return (
    <p role="status" className="p-6 text-sm text-muted-foreground">
      Opening the CRM: <a href={away} className="text-primary underline-offset-4 hover:underline">{away}</a>
    </p>
  );
}
