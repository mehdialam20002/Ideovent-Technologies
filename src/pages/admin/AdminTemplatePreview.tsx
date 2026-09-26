import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, ArrowLeft, Files, Lock, ScanText } from "lucide-react";
import {
  DESIGN_FAMILIES,
  THEME_PALETTE_NAME,
  loadTemplate,
  templateMeta,
  templatePreviewSite,
  type LoadedTemplate,
} from "@/lib/demo/templates";
import { useDuplicateTemplate } from "@/admin/useDuplicateTemplate";
import { usePosterImport } from "@/admin/poster/usePosterImport";
import DemoSiteView from "@/pages/site/DemoSiteView";

/**
 * A TEMPLATE, RENDERED BY THE REAL DEMO PAGE, at /admin/preview/template/:id.
 *
 * Behind the same login as the rest of /admin (the route is wrapped in
 * ProtectedRoute in App.tsx), and the only place a template ever renders. The
 * public route answers a template's name with the 404.
 *
 * FULL WIDTH, NOT INSIDE THE ADMIN SIDEBAR, AND THAT IS DELIBERATE. The draft
 * preview at /admin/preview/site/<slug> sits inside the admin shell, so at
 * 1440 it shows a demo about 1,100px wide. A template is being judged as a
 * DESIGN, and the design is what a director sees on their own screen, so this
 * page gives the demo the whole viewport under one thin bar. It also means
 * scripts/measure-gutters.mjs can measure a template exactly as it measures a
 * public page.
 *
 * The record is built in memory by `templatePreviewSite` and never saved. It
 * is marked as an example, so the page labels every figure as example content.
 * NO OPEN IS RECORDED: only src/pages/DemoSiteRoute.tsx writes to the open log.
 *
 * The bar offers the same two actions as the Templates tab, and only those:
 * go back, or duplicate.
 */
export default function AdminTemplatePreview() {
  const { id, "*": rest } = useParams<{ id: string; "*": string }>();
  const meta = templateMeta(id);
  const [loaded, setLoaded] = useState<LoadedTemplate | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const { request, busy, error, dialog } = useDuplicateTemplate();
  const poster = usePosterImport();

  useEffect(() => {
    let alive = true;
    setLoaded(null);
    setFailed(null);
    if (!meta) return;
    loadTemplate(meta.id)
      .then((t) => {
        if (alive) setLoaded(t);
      })
      .catch((e: Error) => {
        if (alive) setFailed(e.message || "The template could not be loaded.");
      });
    return () => {
      alive = false;
    };
  }, [meta]);

  const site = useMemo(() => (loaded ? templatePreviewSite(loaded) : null), [loaded]);

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <p className="font-medium">There is no template called “{id}”.</p>
          <Link to="/admin/templates" className="mt-4 inline-block text-sm text-primary underline">
            Back to templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* One thin bar, not sticky, so it scrolls away and the demo's own
          header is what stays on screen, exactly as it will for a director. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background px-4 py-2.5 text-sm text-foreground">
        <Link
          to="/admin/templates"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Templates
        </Link>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="font-medium text-foreground">{meta.label}</span>
            <span className="hidden sm:inline">
              {" "}· {DESIGN_FAMILIES[meta.designFamily].label} · {THEME_PALETTE_NAME[meta.theme]} · fixed, preview only
            </span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => poster.open(meta.id)}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:border-primary/50"
        >
          <ScanText className="h-3.5 w-3.5" aria-hidden="true" />
          Create from poster
        </button>
        <button
          type="button"
          onClick={() => request(meta.id)}
          disabled={busy !== null}
          className=" inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
        >
          <Files className="h-3.5 w-3.5" aria-hidden="true" />
          {busy ? "Duplicating…" : "Duplicate into a draft"}
        </button>
      </div>

      {dialog}
      {poster.dialog}

      {((error && !dialog) || failed) && (
        <div role="alert" className="flex gap-2 border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p>{error || failed}</p>
        </div>
      )}

      {!site && !failed && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading the template" />
        </div>
      )}

      {/* THE SAME COMPONENTS THE PUBLIC ROUTE RENDERS, chosen by the same
          branch, so what is previewed is what a duplicate will look like. */}
      {site && <DemoSiteView site={site} basePath={`/admin/preview/template/${id}`} rest={rest || ""} isPreview />}

      {/* The tab keeps the demo page's own title, which is what a director's
          tab will say. This adds only the robots directive, below the demo so
          it has the last word, as DemoSiteRoute does. */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    </div>
  );
}
