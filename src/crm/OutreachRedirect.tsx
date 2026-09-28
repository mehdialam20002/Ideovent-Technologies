import { Navigate, useSearchParams } from "react-router-dom";
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
 * /admin/outreach now lives at /crm. Old links (the Lead Finder's "Added
 * leads are in Outreach", bookmarks, ?lead=<id> deep links) land on the
 * matching CRM screen.
 */
export default function OutreachRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={crmPathForOutreach(params)} replace />;
}
