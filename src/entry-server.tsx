/**
 * THE BUILD'S RENDER OF A PRERENDERED PAGE (3 Oct 2026, perf).
 *
 * scripts/prerender-heads.mjs builds this file for Node and calls serverApp(path)
 * for every page in the sitemap, then puts the HTML into that page's #root, so a
 * phone paints the page from the HTML instead of waiting for the JavaScript.
 * src/main.tsx then hydrates it. The tree is the browser's own: the same
 * providers (./AppProviders) and the same routes (AppBody in ./App), with a
 * StaticRouter where the browser has its BrowserRouter. The content is the seed,
 * which is also what the browser's hydration render reads (ContentLoader's server
 * snapshot); stored content arrives in the browser as the update after it.
 *
 * Never imported by the browser bundle.
 */
import { StaticRouter } from "react-router-dom/server";
import { AppBody } from "./App";
import { AppProviders } from "./AppProviders";
import { setServerPath } from "./lib/cms/scope";

export { renderToPipeableStream } from "react-dom/server";
/** After a render: the lazy page it showed ("BlogDetail"), written on #root as data-page for main.tsx. */
export { takeRenderedPage } from "./App";

/**
 * The app at `path` ("/", "/websites/dental-clinic", ...), ready for renderToPipeableStream.
 * Under a sub-path deploy (DEPLOY_BASE) the browser's address carries the base, so the
 * router is given it too; the content scope (setServerPath) reads paths without it.
 */
export function serverApp(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  setServerPath(path);
  return (
    <AppProviders helmetContext={{}}>
      <StaticRouter location={`${base}${path}`} basename={base || "/"}>
        <AppBody />
      </StaticRouter>
    </AppProviders>
  );
}
