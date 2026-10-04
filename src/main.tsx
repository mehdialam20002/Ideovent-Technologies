import { createRoot, hydrateRoot } from "react-dom/client";
import App, { preloadPage } from "./App.tsx";
import { AppProviders } from "./AppProviders";
import { holdContentForHydration, primeContent, releaseHeldContentAfter } from "./lib/cms/context";
import { currentPath } from "./lib/cms/scope";
import { isCrmHost } from "./lib/host";
import "./index.css";
import "./styles/system.css";
import "./styles/hero.css";
import "./styles/motion.css";

/*
  WHY THERE IS NO GLOBAL `vite:preloadError` LISTENER HERE.

  A tab opened before a deploy asks for chunks that no longer exist, and one
  reload fixes it. The obvious place for that reload is a window listener for
  vite:preloadError, and this file had one. It had to go, because in Vite 5
  that event fires for EVERY failed import() in the build, not only for page
  chunks, and it fires before the caller's own .catch runs:

    - leads.ts imports @emailjs/browser when the visitor presses Send. A
      global reload there wiped the typed enquiry and hid the WhatsApp
      fallback that submitLead exists to show. With Supabase on, the row was
      already saved, so the visitor saw no success and sent it again.
    - LeadPopupMount and ContactForm catch their own failed imports on
      purpose (the popup costs nothing, the form shows FormUnavailable). A
      global reload overrode both, and the popup's scroll trigger reloaded
      the page under a reader who had clicked nothing.

  So the reload lives where the failure is known to be a whole page:
  RouteErrorBoundary.componentDidCatch, which receives a lazy route's
  rejection and calls reloadOnceForNewBuild (guarded there, so it cannot
  loop). Every other import keeps its own handler. Do not preventDefault the
  event anywhere either: that would make the failed import RESOLVE with
  undefined instead of rejecting, and every handler above would be skipped.
*/

/*
  The providers (motion, theme, head, content) are in ./AppProviders, shared with
  the build's server render (src/entry-server.tsx).
*/

/*
  THE CONTENT READ STARTS HERE, BEFORE REACT (2 Oct 2026). With Supabase on, the
  read for this address (src/lib/cms/scope.ts) leaves now, while React builds the
  first frame from the seed, instead of after the first render and after a
  214 KB SDK chunk. A demo's own row is usually back before its template's chunk.
*/
primeContent();

/*
  PRERENDERED PAGES ARE HYDRATED, NOT REDRAWN (3 Oct 2026, perf).

  Every page in the sitemap now arrives with its React page already in #root
  (scripts/prerender-heads.mjs renders it at build time, from the seed), so a
  phone paints the text as soon as the HTML and the stylesheet are in, instead
  of after ~165 KB of JavaScript has downloaded and run. hydrateRoot adopts that
  HTML: the same nodes stay on screen, which is what keeps the largest paint at
  the first frame. createRoot would throw them away and paint new ones at mount
  (measured: the first paint moved forward, the largest paint did not).

  The first client render must equal the build's render, so it is made from the
  seed too (ContentLoader.getServerSnapshot), and the stored content arrives as
  the update right after, exactly as it did before. The page's own chunk
  (#root's data-page, App.tsx preloadPage) is loaded BEFORE hydrating: React
  cannot hydrate a lazy page that has not arrived, and an update while it waits
  would make it redraw the whole page. A failed chunk still hydrates, and the
  route's error boundary handles it as it always has. For the same reason the
  stored content is held at the seed until the page has hydrated
  (holdContentForHydration; ContentLoader explains). Every other address (the
  SPA shells: demos, pitch pages, the admin, the CRM) has an empty #root and is
  rendered as before.
*/
const container = document.getElementById("root")!;
const app = (
  <AppProviders>
    <App />
  </AppProviders>
);

/*
  After the browser has painted the HTML once. On a fast connection the scripts can
  arrive before the first frame, and hydrating at once would hold that frame back
  behind the hydration work. requestAnimationFrame runs just before a paint and the
  timeout just after it; the second timeout covers a tab where frames do not run.
*/
const afterFirstPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
    setTimeout(resolve, 200);
  });

/*
  ONLY AT THE ADDRESS IT WAS RENDERED FOR (4 Oct 2026). The build rendered #root for
  one path (data-path), with no query string, for the site. The same file is served:
    - on the CRM's host (crm.ideovent.in, this deployment too), which renders the CRM;
    - at addresses the router reads as another page ("/index.html", "//about");
    - with a query a page reads in its first render (/pricing?plan=growth-monthly).
  Hydrating any of those fails (React errors #418, #422, #425) and React draws the
  page again anyway. They are rendered with createRoot, exactly as before
  prerendering: another host's or page's HTML is cleared at once (and on the CRM's
  host it was never shown: prerender-heads.mjs, CRM_HOST_GUARD); the right page with
  another query stays on screen until the first render replaces it, with its chunk
  loaded first so that render is the page and not the spinner. A query that only
  tags the visit (utm_*, gclid, fbclid, ...) still hydrates, and so do ?hero3d=,
  which HeroScene reconciles itself, and ?for= (pitch pages link /contact?for=...),
  read only by the contact form's body, which renders after hydration.
*/
const HYDRATABLE_QUERY =
  /^(utm_\w+|gad_\w+|hsa_\w+|mc_\w+|pk_\w+|mtm_\w+|gclid|gbraid|wbraid|dclid|fbclid|msclkid|igshid|igsh|srsltid|ttclid|twclid|li_fat_id|yclid|epik|_gl|ref|hero3d|for)$/i;

function howToStart(): "hydrate" | "render-over" | "clear" | "render" {
  if (!container.firstElementChild) return "render";
  let path = currentPath();
  try {
    path = decodeURIComponent(path);
  } catch {
    /* a malformed escape is compared as typed */
  }
  if (isCrmHost() || path !== container.dataset.path) return "clear";
  for (const key of new URLSearchParams(window.location.search).keys()) if (!HYDRATABLE_QUERY.test(key)) return "render-over";
  return "hydrate";
}

const start = howToStart();
if (start === "hydrate") {
  holdContentForHydration();
  void Promise.all([preloadPage(container.dataset.page).catch(() => undefined), afterFirstPaint()]).then(() => {
    // The hold's safety net counts from now, as hydration starts (ContentLoader.holdForHydration).
    releaseHeldContentAfter(10000);
    hydrateRoot(container, app);
  });
} else if (start === "render-over") {
  void preloadPage(container.dataset.page)
    .catch(() => undefined)
    .then(() => createRoot(container).render(app));
} else {
  if (start === "clear") {
    container.textContent = "";
    document.documentElement.removeAttribute("data-no-ssr");
  }
  createRoot(container).render(app);
}
