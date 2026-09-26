/**
 * ONE RECORD, RENDERED: the single decision between the frozen single-page
 * templates and the multi-page site. Used by the public route
 * (src/pages/DemoSiteRoute.tsx) and both admin previews, so the three can
 * never disagree about what a record looks like.
 *
 *   theme is a multi-page id (src/lib/demo/site/ids.ts)
 *       -> the multi-page shell, at base and every subpage
 *   anything else (the ten older ids, or empty)
 *       -> the single page exactly as it was sent; a subpage address
 *          redirects to it, because that site has no subpages
 *
 * All three renderers are lazy, so a director on a single-page demo never
 * downloads the shell, and the reverse.
 */

import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import type { DemoSite } from "@/lib/cms/types";
import { isSiteThemeId } from "@/lib/demo/site/ids";

const SiteShell = lazy(() => import("./SiteShell"));
const DemoSchool = lazy(() => import("@/pages/demo/DemoSchool"));
const DemoCoaching = lazy(() => import("@/pages/demo/DemoCoaching"));

export default function DemoSiteView({ site, basePath, rest = "", isPreview = false }: {
  site: DemoSite;
  basePath: string;
  rest?: string;
  isPreview?: boolean;
}) {
  const clean = rest.replace(/^\/+|\/+$/g, "");
  const blank = <div className="min-h-screen" />;

  if (isSiteThemeId(site.theme)) {
    return (
      <Suspense fallback={blank}>
        <SiteShell site={site} basePath={basePath.replace(/\/+$/, "")} rest={clean} isPreview={isPreview} />
      </Suspense>
    );
  }

  if (clean) return <Navigate to={basePath} replace />;
  return (
    <Suspense fallback={blank}>
      {site.kind === "coaching" ? <DemoCoaching site={site} /> : <DemoSchool site={site} />}
    </Suspense>
  );
}
