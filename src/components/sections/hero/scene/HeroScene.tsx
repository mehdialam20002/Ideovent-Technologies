/**
 * The home hero's art box: "Plan to Page" (spec _build/specs/hero-3d-spec.md).
 *
 * First paint is an inline SVG: the drawn PLAN of a small business's mobile page, or,
 * for everyone the gates send to the still (reduced motion, Save-Data, slow network,
 * low memory, no OffscreenCanvas, an earlier failure, an SPA return), the drawn BUILT
 * still. Never the LCP element (inline SVG and canvas are not candidates), and the
 * box's size comes only from CSS, so nothing shifts when anything arrives.
 *
 * On the 3D path, after load and idle, a module worker gets the canvas
 * (transferControlToOffscreen) and builds the page once: the parts rise in reading
 * order and a gold pin lands on the map, at rest in 1.65 s. All rendering is in the
 * worker. Any failure (no WebGL2, a slow probe, jank, an error, no `ready` within 4 s of
 * visible time) cross-fades to the built still and keeps the still for the session; a
 * lost context does too, without the session flag.
 *
 * This file is statically imported, never React.lazy (a failed chunk would reload the
 * home page through RouteErrorBoundary), and it holds only what the first render needs:
 * the decision, the posters, the start rule and the still. The worker, the observers
 * and the lamp are in ./runtime, fetched with a guarded import() when the start rule
 * fires, so they are not on the home page's critical path (spec 10, LCP).
 */
import { Component, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { DESK_SVG, PHONE_SVG } from "./posters.generated";
import { REDUCED, decide, setSessionOff, whenStartable, type Decision, type Mode, type Path } from "./gates";
import { DESK_MIN_WIDTH } from "./model";

/** For the tests (scripts/e2e-hero3d.mjs) and calibration on real phones. */
export interface Hero3DInfo {
  path: Path;
  reason: string;
  pose: "desk" | "phone";
  dpr: number | null;
  probeMs: number | null;
  /** performance.now() when the worker was created, ms. */
  workerMs: number | null;
  /** From the worker's creation to `ready`, ms. */
  readyMs: number | null;
  /** performance.now() at `go` and at `built`, ms. */
  goMs: number | null;
  builtMs: number | null;
  janky?: boolean;
  /** The worker's activity counter (renders + frame callbacks); unchanged once at rest. */
  stats(): Promise<number>;
  /** The worker's last full stats reply. */
  last?: unknown;
}
declare global {
  interface Window {
    __hero3d?: Hero3DInfo;
  }
}

/* < 640: a full-bleed 13:9 band. 640 to 1023: aligned to the text, 600 px at most.
   lg: a 5:6 box in the right column whose bottom stays 16 px inside the first screen
   (vh, not svh: an unsupported svh would void the whole min() under size containment). */
const BOX =
  "h3d-box relative overflow-hidden [contain:strict] pointer-events-none select-none forced-colors:hidden " +
  "-mx-4 mt-7 aspect-[13/9] sm:mx-0 sm:mt-8 sm:w-[min(100%,37.5rem)] " +
  "lg:mt-0 lg:w-[min(100%,29.5rem,calc((100vh-11rem)*5/6))] lg:aspect-[5/6] lg:self-start lg:justify-self-end";

/** Both poses' drawings; CSS shows the one for the layout. Generated from our own model, never from input. */
function Posters() {
  return (
    <>
      <div className="h3d-desk absolute inset-0 hidden lg:block" dangerouslySetInnerHTML={{ __html: DESK_SVG }} />
      <div className="h3d-phone absolute inset-0 lg:hidden" dangerouslySetInnerHTML={{ __html: PHONE_SVG }} />
    </>
  );
}

/* useLayoutEffect in the browser; nothing on the build's server render (React warns there). */
const useBrowserLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function HeroScene({ sectionRef, className }: { sectionRef: RefObject<HTMLElement>; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [decision] = useState(decide);
  const [state, setState] = useState<Mode>(decision.mode);
  const [xfade, setXfade] = useState(false);

  /*
    THE PRERENDERED HOME PAGE (3 Oct 2026). The build draws the plan (gates.ts, no
    window) and React does not repair an attribute while hydrating, so a visitor
    decided for the still would keep data-state="plan". Before the first frame
    after hydration this moves the box to the decided state, cross-faded the way
    every other move to the still is. On a page reached by a link React has
    already written the right value and this does nothing.
  */
  useBrowserLayoutEffect(() => {
    const el = box.current;
    if (el && el.dataset.state !== state) {
      el.classList.add("h3d-xfade");
      el.dataset.state = state;
    }
  }, [state]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    return startScene(el, sectionRef, decision, (fade) => {
      setXfade(fade);
      setState("built");
    });
  }, [decision, sectionRef]);

  return (
    <div ref={box} aria-hidden="true" data-state={state} className={cn(BOX, className, xfade && "h3d-xfade")}>
      <Posters />
    </div>
  );
}

/** A hero-art bug can never reach RouteErrorBoundary: the fallback is the built still, with no effects. */
export class HeroSceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // An error while rendering comes before startScene ever set window.__hero3d: make one,
    // so this still is reported like every other (path still-fail).
    window.__hero3d = Object.assign(window.__hero3d || ({ stats: () => Promise.resolve(0) } as unknown as Hero3DInfo), { path: "still-fail" as Path, reason: "render-error" });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const child = this.props.children;
    const className = isValidElement<{ className?: string }>(child) ? child.props.className : undefined;
    return (
      <div aria-hidden="true" data-state="built" className={cn(BOX, className)}>
        <Posters />
      </div>
    );
  }
}

/**
 * What the first render needs on the main thread, shaped like SmoothScroll.tsx (a done
 * flag, a live reduced-motion listener, works under StrictMode): window.__hero3d, and on
 * the 3D path the start rule, after which ./runtime is fetched and takes the box. Every
 * way to the still goes through `still`: it ends the runtime (canvas removed, worker
 * terminated) and turns the box to the built still in the same task, so no frame shows
 * the plan alone. Returns the cleanup.
 */
function startScene(el: HTMLDivElement, sectionRef: RefObject<HTMLElement>, d: Decision, show: (fade: boolean) => void): () => void {
  const info: Hero3DInfo = {
    path: d.path, reason: d.reason, pose: matchMedia(`(min-width: ${DESK_MIN_WIDTH}px)`).matches ? "desk" : "phone",
    dpr: null, probeMs: null, workerMs: null, readyMs: null, goMs: null, builtMs: null,
    stats: () => Promise.resolve(0),
  };
  window.__hero3d = info;
  if (d.mode !== "plan") return () => {};

  let done = false, stop: (() => void) | null = null, cancel = () => {};
  const rm = matchMedia(REDUCED);
  const end = () => {
    done = true;
    cancel();
    rm.removeEventListener("change", onReduce);
    if (stop) stop();
    stop = null;
  };
  const still = (path: Path, reason: string, flag: boolean, fade: boolean) => {
    if (done) return;
    end();
    if (flag && d.freezeAt === null) setSessionOff(); // a frozen screenshot run never sets flags
    info.path = path;
    info.reason = reason;
    // Written now, in the task the canvas went in; React's render writes the same right after.
    if (fade) el.classList.add("h3d-xfade");
    el.dataset.state = "built";
    show(fade);
  };
  // Reduced motion switched on at any point: the still, at once, with no fade.
  const onReduce = () => rm.matches && still("still-reduced", "reduced-motion", false, false);
  rm.addEventListener("change", onReduce);
  // A failed fetch of ./runtime, or a throw while it starts, is the same still as any failure.
  cancel = whenStartable(el, () => {
    import("./runtime")
      .then((m) => {
        if (!done) stop = m.runScene(el, sectionRef, d, info, still);
      })
      .catch(() => still("still-fail", "chunk-error", true, true));
  });
  return () => {
    if (!done) end();
  };
}
