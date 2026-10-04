/**
 * Who gets the 3D build, and when it may start. Main thread only: no three, no worker.
 *
 * decide() runs synchronously at first render, BEFORE anything downloads, in the order
 * of spec 8.1. ?hero3d=force (for QA on a phone) skips the session flag, Save-Data,
 * network, memory and cores checks, never reduced motion or forced colours.
 * ?hero3d=t:<ms> implies force and freezes the canvas at that time (screenshots).
 * ?hero3d=off shows the still. ?hero3d=lose (dev server only) loses the WebGL context
 * after the build, to test that path.
 */
import { GATES, HERO_3D_ENABLED, SESSION_KEY, START } from "./model";

export type Mode = "plan" | "built";
export type Path = "3d" | "still-gated" | "still-reduced" | "still-revisit" | "still-off" | "still-fail" | "still-slow" | "lost";
export interface Decision {
  /** "plan": the drawn plan at first paint, then the 3D path. "built": the drawn still. */
  mode: Mode;
  path: Path;
  reason: string;
  force: boolean;
  freezeAt: number | null;
  lose: boolean;
}

export const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Set at `go`. Coming back to / through the SPA shows the built still and starts no
 * worker; a full reload replays the build (a reviewer who reloads sees it move).
 */
let builtThisPageLoad = false;
export function markBuilt() {
  builtThisPageLoad = true;
}

/** Only failures persist, for the session: sessionStorage "ideovent-hero3d" = "off". */
export function sessionOff(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "off";
  } catch {
    return false;
  }
}
export function setSessionOff() {
  try {
    sessionStorage.setItem(SESSION_KEY, "off");
  } catch {
    /* storage blocked: the still shows this time anyway */
  }
}

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };

export function decide(): Decision {
  /*
    The build's render of the home page (no window; scripts/prerender-heads.mjs). It
    draws the plan, the first paint of the 3D path, which is where most visitors go.
    A visitor the browser then sends to the still gets it at hydration: HeroScene
    cross-fades the built drawing in, as it does on every other way to the still.
  */
  if (typeof window === "undefined") return { mode: "plan", path: "3d", reason: "server", force: false, freezeAt: null, lose: false };
  let q = "";
  try {
    q = new URLSearchParams(window.location.search).get("hero3d") || "";
  } catch {
    /* no window */
  }
  const t = /^t:(\d+(?:\.\d+)?)$/.exec(q);
  const freezeAt = t ? Number(t[1]) : null;
  const force = q === "force" || freezeAt !== null;
  const lose = import.meta.env.DEV && q === "lose";
  const still = (path: Path, reason: string): Decision => ({ mode: "built", path, reason, force, freezeAt, lose });

  if (!HERO_3D_ENABLED) return still("still-off", "disabled");
  if (q === "off") return still("still-off", "param");
  if (typeof matchMedia !== "function") return still("still-gated", "no-window");
  if (matchMedia(REDUCED).matches) return still("still-reduced", "reduced-motion");
  if (matchMedia("(forced-colors: active)").matches) return still("still-gated", "forced-colors"); // the art is hidden
  if (builtThisPageLoad) return still("still-revisit", "spa-return");
  if (!force) {
    if (sessionOff()) return still("still-off", "session");
    const n = navigator as Nav;
    const c = n.connection;
    if (c && c.saveData) return still("still-gated", "save-data");
    if (c && GATES.slowNet.includes(c.effectiveType || "")) return still("still-gated", "slow-network");
    if ((n.deviceMemory ?? 8) < GATES.minMemoryGB) return still("still-gated", "memory");
    if ((n.hardwareConcurrency || 8) < GATES.minCores) return still("still-gated", "cores");
  }
  if (typeof Worker === "undefined" || !("transferControlToOffscreen" in HTMLCanvasElement.prototype)) return still("still-gated", "no-offscreen");
  return { mode: "plan", path: "3d", reason: force ? "forced" : "", force, freezeAt, lose };
}

/**
 * The start rule (spec 8.2): the box is within 1.5 viewports, AND the window load has
 * fired or 2.5 s have passed since mount (slow phones still get a chance), THEN the
 * browser is idle. Never a modulepreload or prefetch. Returns a cancel function.
 */
export function whenStartable(box: Element, cb: () => void): () => void {
  const w = window as unknown as { requestIdleCallback?: (f: () => void, o: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
  let near = false, loaded = document.readyState === "complete", done = false, idle = 0, timer = 0;
  const fire = () => {
    idle = 0;
    timer = 0;
    cb();
  };
  const check = () => {
    if (done || !near || !loaded) return;
    done = true;
    io.disconnect();
    if (w.requestIdleCallback) idle = w.requestIdleCallback(fire, { timeout: START.idleTimeoutMs });
    else timer = window.setTimeout(fire, START.safariIdleMs); // Safari has no requestIdleCallback
  };
  const onLoad = () => {
    loaded = true;
    check();
  };
  const io = new IntersectionObserver((es) => {
    near = es.some((e) => e.isIntersecting);
    check();
  }, { rootMargin: START.nearMargin });
  const cap = window.setTimeout(onLoad, START.capMs);
  if (!loaded) window.addEventListener("load", onLoad, { once: true });
  io.observe(box);
  return () => {
    done = true;
    io.disconnect();
    window.clearTimeout(cap);
    window.clearTimeout(timer);
    window.removeEventListener("load", onLoad);
    if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
  };
}
