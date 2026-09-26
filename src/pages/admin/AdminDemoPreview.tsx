import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { DEMO_STATUS_LABEL, demoStatus, isDemoExpired, resolveDemoSite } from "@/lib/demo/record";
import DemoSiteView from "@/pages/site/DemoSiteView";

/**
 * Previewing a demo that the public route will not serve.
 *
 * WHY THIS EXISTS AT ALL. Only a `sent` demo opens publicly, and that coupling
 * is deliberate: marking a demo sent is the same action as turning its link
 * on, which is what records who it went to, which is what the edit lock reads.
 * The obvious objection to that is "then how does Mehdi look at a draft before
 * he sends it", and the obvious wrong answer is a `?preview=1` query parameter
 * on the public route. A query parameter anyone can type is not a gate: it
 * would mean every draft on the site is readable by anybody who guesses a
 * slug and adds five characters, which is exactly what the status check was
 * for.
 *
 * So the preview is a route inside /admin, behind the same login as everything
 * else, and it renders the same template the public route renders. It passes
 * `includeUnpublished`, which also ignores expiry, because checking an expired
 * demo before deciding whether to extend it is a real thing to want.
 *
 * NO OPEN IS RECORDED HERE, and that is the second reason this is a separate
 * route rather than a flag on the public one. `openCount` answers "did the
 * institute open it", and a number inflated by Mehdi's own previews answers
 * nothing. Only ./DemoSiteRoute.tsx writes to the open log.
 */
export default function AdminDemoPreview() {
  const { slug, "*": rest } = useParams<{ slug: string; "*": string }>();
  const sites = useCollection("demoSites");
  const { site } = resolveDemoSite(slug, sites, { includeUnpublished: true });

  if (!site) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">No demo at /site/{slug}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The link may have been renamed since you opened this tab.
        </p>
        <Link to="/admin/c/demoSites" className="mt-4 inline-block text-sm text-primary underline">
          Back to demo sites
        </Link>
      </div>
    );
  }

  const status = demoStatus(site);
  const expired = isDemoExpired(site);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3 text-sm">
        <Link
          to="/admin/c/demoSites"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:border-primary/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Demo sites
        </Link>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Preview only. Nothing here counts as an open.
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {DEMO_STATUS_LABEL[status]}
          {status !== "sent" && ", so the public link does not open"}
          {expired && status === "sent" && ", and it has passed its expiry date"}
        </span>
      </div>

      {/*
        THE SAME COMPONENTS THE PUBLIC ROUTE RENDERS, chosen by the same
        branch. A preview that renders anything else is a preview of something
        that is not what will be sent, which is worse than no preview: it is
        the screen Mehdi checks before pressing send.

        In an ordinary document flow rather than an iframe, because an iframe
        would report ITS width to the template and show a phone layout on a
        desktop. The trade is that the admin's own stylesheet is in scope; each
        template scopes its theme tokens to its own root element, so what
        leaks is at most inherited type, and the real check before sending is
        still the public link on a phone.
      */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <DemoSiteView site={site} basePath={`/admin/preview/site/${slug}`} rest={rest || ""} isPreview />
      </div>
    </div>
  );
}
