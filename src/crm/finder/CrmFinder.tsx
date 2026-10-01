import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { useCrmData } from "../useCrmData";
import { ExternalLink } from "lucide-react";
import { MainSiteLink } from "../MainSiteLink";
import { crm, EmptyState } from "../ui";

/*
  /crm/finder: the Lead Finder page, mounted as it is. Another workflow owns
  it (src/pages/admin/AdminLeadFinder.tsx and its folders); this file only
  imports it lazily. If the chunk fails (the file is missing or mid-rewrite),
  the boundary shows a link to /admin/lead-finder instead of breaking the CRM
  (a MainSiteLink: the admin is on the main site, another origin once the CRM
  has its own subdomain).
  The finder writes leads straight to the outreach store, so the CRM data is
  re-read when this page is left.
*/
const AdminLeadFinder = lazy(() => import("@/pages/admin/AdminLeadFinder"));

function Fallback() {
  return (
    <EmptyState
      title="The Lead Finder is not available inside the CRM right now."
      body="It is still being built, or its page did not load. It works on its own page in the admin."
      action={
        <MainSiteLink path="/admin/lead-finder" className={crm.btn}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open the Lead Finder
        </MainSiteLink>
      }
    />
  );
}

class FinderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

export default function CrmFinder() {
  const { refresh } = useCrmData();
  useEffect(() => () => void refresh(), [refresh]);
  return (
    <FinderBoundary>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        }
      >
        <AdminLeadFinder />
      </Suspense>
    </FinderBoundary>
  );
}
