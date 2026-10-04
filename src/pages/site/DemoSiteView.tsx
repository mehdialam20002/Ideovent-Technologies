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

const loadSiteShell = () => import("./SiteShell");
const SiteShell = lazy(loadSiteShell);
const DemoSchool = lazy(() => import("@/pages/demo/DemoSchool"));
const DemoCoaching = lazy(() => import("@/pages/demo/DemoCoaching"));

/*
  THE SHELL STARTS DOWNLOADING WITH THIS FILE (3 Oct 2026, perf). A demo used to
  load in a chain: this route's chunk, then the record, then the shell, then the
  dental chrome, then the page, one round trip each, on a phone that a prospect
  opened from WhatsApp. Every dental demo and every multi-page theme renders the
  shell, so it is fetched now, while the record is still being read; the chrome
  and the page then start together (SiteShell.tsx). A failed fetch here costs
  nothing: lazy() asks again when it renders, and handles that answer as before.
*/
if (typeof window !== "undefined") void loadSiteShell().catch(() => undefined);

export default function DemoSiteView({ site, basePath, rest = "", isPreview = false }: {
  site: DemoSite;
  basePath: string;
  rest?: string;
  isPreview?: boolean;
}) {
  const clean = rest.replace(/^\/+|\/+$/g, "");
  const blank = <div className="min-h-screen" />;

  /* A dental record is multi-page whatever its theme says: there is no
     single-page dental template to fall back to (28 Sep 2026). */
  if (site.kind === "dental" || isSiteThemeId(site.theme)) {
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
