import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

/*
  WHAT HAPPENS TO AN OPEN TAB WHEN A NEW BUILD GOES OUT.

  Every page but the home page is a lazy() chunk with a content hash in its
  name: /assets/About-3f9c1a.js. A deploy replaces all of those names. A
  visitor who had the site open before the deploy still runs the OLD entry
  chunk, so the first time they click through to /about it asks for the OLD
  About chunk, which no longer exists. The import rejects, and with nothing to
  catch it React unmounts the whole tree: a blank white page, on the one
  visitor who was engaged enough to keep the tab open.

  Three layers, each covering the one before it:

  1. vercel.json no longer rewrites /assets/* to index.html. It used to, so a
     missing chunk came back as 200 text/html under an "immutable, one year"
     header, which is both the wrong error and one the browser keeps.
  2. When a lazy page's import rejects, this boundary reloads ONCE, which
     fetches a fresh index.html (it is served must-revalidate) and with it the
     new chunk names. Most visitors never see anything but a slightly slow
     click. The guard that keeps that reload from looping is below. It is
     deliberately NOT a window `vite:preloadError` listener: that event fires
     for every failed import(), including the EmailJS import behind Send and
     the imports that have their own quiet fallback. main.tsx explains.
  3. The panel, for everything the reload cannot fix: the reload already
     happened and the chunk still fails (a broken deploy, a flaky network), or
     a page threw while rendering. It shows a small panel with a Reload button
     instead of nothing.
*/

/*
  THE GUARD IS A FLAG, NOT A TIMER.

  An earlier version refused a second reload only inside a 10 second window.
  On a slow mobile connection a chunk request can hang for longer than that
  and then fail, so every attempt found the window expired and reloaded
  again: five page loads in fifty seconds and no panel, measured. Time says
  nothing about whether the reload helped. A rendered page does.

  So PENDING_KEY is set just before the reload and stays set until a routed
  page has actually committed (<RouteRendered /> below, inside the Suspense).
  A chunk that fails again before that point finds the flag and gets the
  panel. Once a page has rendered, the flag goes, and a deploy hours later in
  the same tab earns its own reload.

  COUNT_KEY is the backstop for the one case the flag cannot see: a page that
  renders fine and then loses a nested lazy chunk with no fallback of its own
  (a demo site's pages), so the error reaches this boundary. There the page
  commit clears the flag before the nested import fails, and the flag alone
  would reload forever. (The contact form body and the lead popup catch their
  own failed imports, so they never get here and never reload anything.)
  The count is never cleared, so a tab gets at most MAX_AUTO_RELOADS automatic
  reloads for its whole life, which is more than any real run of deploys.
*/
const PENDING_KEY = "ideovent-chunk-reload";
const COUNT_KEY = "ideovent-chunk-reload-count";
const MAX_AUTO_RELOADS = 3;

/** Set once a reload has been asked for, so the boundary shows a spinner
    rather than flashing the panel in the frame before the page goes away. */
let reloadPending = false;

/*
  Storage can throw (Safari private mode, blocked site data), and a throw here
  would turn a recoverable error into the blank page this file exists to stop.
  Without storage the guard cannot survive the reload it is guarding, so a
  chunk that is really gone would reload forever. writeKey therefore reports
  whether the write stuck, and no write means no automatic reload: that
  visitor gets the panel and its button instead.
*/
function readKey(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null): boolean {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reload the page to pick up a new build, unless a reload is already waiting
 * for a page to render or this tab has used up its automatic reloads.
 * Returns true when a reload is under way, false when the caller should show
 * the fallback instead.
 */
export function reloadOnceForNewBuild(): boolean {
  if (reloadPending) return true;
  if (readKey(PENDING_KEY)) return false;
  const count = Number(readKey(COUNT_KEY)) || 0;
  if (count >= MAX_AUTO_RELOADS) return false;
  if (!writeKey(PENDING_KEY, "1") || !writeKey(COUNT_KEY, String(count + 1))) return false;
  reloadPending = true;
  window.location.reload();
  return true;
}

/**
 * Rendered next to <Routes> inside the Suspense. Suspense commits a
 * boundary's children together, so this effect only runs once the routed
 * page's chunk has arrived and the page is on screen: the proof that the
 * last reload worked, and the only thing that clears the pending flag.
 */
export function RouteRendered() {
  const { pathname } = useLocation();
  useEffect(() => {
    writeKey(PENDING_KEY, null);
  }, [pathname]);
  return null;
}

/*
  The wording differs by browser and there is no error class to test for:
    Chrome   Failed to fetch dynamically imported module: <url>
    Firefox  error loading dynamically imported module
    Safari   Importing a module script failed.
    Vite     Unable to preload CSS for <url>
  ChunkLoadError is the webpack name, kept for any dependency that still
  throws it.
*/
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return CHUNK_ERROR.test(text);
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

/*
  The panel stands in for the whole routed page, header included (the Navbar
  lives inside each page), so it carries its own full-height ground and a way
  home. Everything is a theme token, so it is right in light and dark without
  a single `dark:` class. "Go to the home page" is a plain <a>, not a <Link>:
  a full navigation also fetches a fresh index.html, which is the fix.
*/
function RefreshPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div
        role="alert"
        className="card-surface mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border border-border bg-card/60 px-8 py-12 text-center"
      >
        <Eyebrow>Ideovent Technologies</Eyebrow>
        <h1 className="mt-4 font-display text-2xl font-semibold text-balance">This page needs a refresh</h1>
        <p className="mt-3 text-sm text-muted-foreground text-pretty">
          The site was updated while you had it open, or this page did not load properly. Reloading fixes it.
        </p>
        <Button className="mt-8" size="lg" onClick={() => window.location.reload()}>
          <RotateCw aria-hidden="true" />
          Reload
        </Button>
        <a
          href="/"
          className="mt-5 inline-flex min-h-6 items-center text-sm font-medium text-muted-foreground underline-offset-4
                     transition-colors duration-200 hover:text-foreground hover:underline active:text-foreground/70"
        >
          Go to the home page
        </a>
      </div>
    </main>
  );
}

type BoundaryProps = { resetKey: string; children: ReactNode };
type BoundaryState = { error: unknown; reloading: boolean };

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, reloading: false };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // A stale chunk gets the one automatic reload; anything else is a real
    // bug and is logged where the console and any monitoring can see it.
    if (isChunkLoadError(error) && reloadOnceForNewBuild()) {
      this.setState({ reloading: true });
      return;
    }
    console.error("Route render failed", error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    // Moving to another address gives that page its own chance to render,
    // so one broken page does not take the header links down with it.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, reloading: false });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.state.reloading || reloadPending) return <Spinner />;
    return <RefreshPanel />;
  }
}

/** Catches a failed chunk or a render error in the routed page. Must sit inside the router. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}
