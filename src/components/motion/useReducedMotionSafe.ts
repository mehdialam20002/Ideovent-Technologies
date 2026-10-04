import { useSyncExternalStore } from "react";

/*
  framer-motion's useReducedMotion(), safe to hydrate (3 Oct 2026, perf).

  Prerendered pages are built with no window, where framer's hook answers "no
  reduced motion", and hydrated in the browser (src/main.tsx). A reduced-motion
  visitor's first client render then disagreed with the HTML: <Reveal> and
  <SectionTitle> render plain elements for that visitor, the HTML has framer's
  initial style="opacity:0", and React 18 does not repair attributes while
  hydrating, so the content would have stayed invisible for exactly the
  visitors the plain branch exists for.

  This reads the media query through useSyncExternalStore with a server
  snapshot of `false`: the hydration render matches the HTML, and React renders
  again at once with the real value. Outside hydration (a page reached by a
  link, the SPA shells) the first render already has the real value. Like
  framer's hook it is read, not watched: the OS setting changing later is
  handled by AppProviders (MotionGlobalConfig.skipAnimations) and the CSS.
*/
const QUERY = "(prefers-reduced-motion: reduce)";
const noSubscription = () => () => {};
const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
const onServer = () => false;

export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(noSubscription, read, onServer);
}
