/**
 * The home hero's 3D runtime on the main thread: the canvas, the worker, the watchdog,
 * the observers and the desktop lamp (spec 7.5, step 2 on). No three here: all
 * rendering is in the worker.
 *
 * WHY A SEPARATE CHUNK. HeroScene.tsx renders the posters and decides the path at first
 * render, statically, as spec 7.5 asks. This part runs only on the 3D path and only once
 * the start rule has fired (spec 8.2: after load and idle), so HeroScene imports it then,
 * with a plain import() whose failure shows the still (never React.lazy, so a failed
 * chunk can never reach RouteErrorBoundary's reload). Measured 2 Oct 2026: it took
 * 1.4 KB gzip off the home page's entry chunk, where every KB costs about 5 ms of
 * Lighthouse mobile LCP (budget: baseline + 50 ms). Gated visitors never fetch it.
 */
import type { RefObject } from "react";
import type { Hero3DInfo } from "./HeroScene";
import { REDUCED, markBuilt, setSessionOff, type Decision, type Path } from "./gates";
import { DESK_MIN_WIDTH, LAMP, LIGHT, START } from "./model";

type Msg = { type: string; [k: string]: unknown };
/** Shows the built still: tears this runtime down first, then the box (HeroScene.tsx). */
export type Still = (path: Path, reason: string, flag: boolean, fade: boolean) => void;
const isDark = () => document.documentElement.classList.contains("dark");

/**
 * The desktop lamp (spec 5.1): nx, ny are the cursor's offsets from the box centre in
 * half-sizes. The light answers only near the scene (weight 1 over it, 0 beyond 1.6
 * half-sizes), so nothing moves while someone reads the headline.
 */
export function lampAngles(nx: number, ny: number): { az: number; el: number } {
  const u = Math.min(1, Math.max(0, (Math.max(Math.abs(nx), Math.abs(ny)) - LAMP.far) / (LAMP.near - LAMP.far)));
  const k = u * u * (3 - 2 * u);
  return {
    az: LIGHT.az + LAMP.az * k * Math.max(-1, Math.min(1, nx)),
    el: LIGHT.el - LAMP.el * k * Math.max(-1, Math.min(1, ny)),
  };
}

/**
 * Starts the worker on a new canvas in `el` at once (the start rule has already passed)
 * and drives it. A failure calls `still`, which ends everything. Returns the teardown:
 * everything disconnected, the worker terminated (its WebGL context dies with it), the
 * canvas removed. Shaped like SmoothScroll.tsx: every step guarded.
 */
export function runScene(el: HTMLDivElement, sectionRef: RefObject<HTMLElement>, d: Decision, info: Hero3DInfo, still: Still): () => void {
  const lg = matchMedia(`(min-width: ${DESK_MIN_WIDTH}px)`);
  const pose = lg.matches ? "desk" : "phone"; // the layout now, not at mount: nothing was built yet
  info.pose = pose;
  let over = false, worker: Worker | null = null, canvas: HTMLCanvasElement | null = null;
  let ready = false, went = false, ratio = 0, frames = 0, rectDirty = true;
  const undo: (() => void)[] = [];
  const waiters: ((n: number) => void)[] = [];
  info.stats = () =>
    new Promise<number>((res) => {
      if (!worker) return res(frames);
      waiters.push(res);
      worker.postMessage({ type: "stats" });
    });

  const stop = () => {
    over = true;
    for (const f of undo.splice(0)) {
      try {
        f();
      } catch {
        /* keep tearing down */
      }
    }
    if (worker) worker.terminate();
    worker = null;
    if (canvas) canvas.remove();
    canvas = null;
    for (const w of waiters.splice(0)) w(frames);
  };
  // The canvas goes in the same task as the box turns to the still, so no frame shows the plan alone.
  const toStill: Still = (path, reason, flag, fade) => {
    if (over) return;
    stop();
    still(path, reason, flag, fade);
  };
  const send = (m: Msg) => {
    if (worker) worker.postMessage(m);
  };
  const listen = (t: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, opts);
    undo.push(() => t.removeEventListener(type, fn, opts));
  };

  // Crossing 1024 px changes the pose: the other pose's built still, no replay.
  listen(lg, "change", () => {
    info.pose = lg.matches ? "desk" : "phone";
    toStill(info.path, "pose-swap", false, false);
  });

  // Watchdog: 4 s of VISIBLE time from the worker's start to `ready`.
  let wdLeft = START.watchdogMs, wdAt = 0, wdTimer = 0;
  const wdRun = () => {
    if (ready || wdTimer || !worker || document.hidden) return;
    wdAt = performance.now();
    wdTimer = window.setTimeout(() => toStill("still-fail", "watchdog", true, true), wdLeft);
  };
  const wdPause = () => {
    if (!wdTimer) return;
    window.clearTimeout(wdTimer);
    wdTimer = 0;
    wdLeft -= performance.now() - wdAt;
  };
  undo.push(wdPause);

  // go = ready AND at least 60% of the box on screen AND the tab visible.
  const maybeGo = () => {
    if (went || !ready || !worker || d.freezeAt !== null || ratio + 1e-3 < START.goRatio || document.hidden) return;
    went = true;
    markBuilt();
    info.goMs = Math.round(performance.now());
    send({ type: "go" });
  };

  // The desktop lamp, after `built`: the light follows the cursor near the scene.
  const lamp = () => {
    const section = sectionRef.current;
    if (!section || d.freezeAt !== null || matchMedia(REDUCED).matches || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let rect: DOMRect | null = null, x = 0, y = 0, frame = 0;
    const flush = () => {
      frame = 0;
      if (!rect || rectDirty) {
        rect = el.getBoundingClientRect(); // only after a resize or a scroll, never per event
        rectDirty = false;
      }
      const a = lampAngles((x - rect.left - rect.width / 2) / (rect.width / 2), (y - rect.top - rect.height / 2) / (rect.height / 2));
      send({ type: "lamp", az: a.az, el: a.el });
    };
    listen(section, "pointermove", ((e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(flush); // at most one message per frame
    }) as EventListener, { passive: true });
    listen(section, "pointerleave", ((e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      send({ type: "lamp", az: LIGHT.az, el: LIGHT.el });
    }) as EventListener, { passive: true });
    listen(window, "scroll", () => (rectDirty = true), { passive: true });
    undo.push(() => frame && cancelAnimationFrame(frame));
  };

  const onMessage = (m: Msg) => {
    if (over) return;
    if (m.type === "ready") {
      ready = true;
      wdPause();
      if (canvas) canvas.classList.remove("opacity-0"); // frame 0 is transparent: nothing visibly changes
      info.readyMs = Math.round(performance.now() - (info.workerMs || 0));
      info.dpr = Number(m.dpr);
      info.probeMs = Number(m.probeMs);
      maybeGo();
    } else if (m.type === "built") {
      info.builtMs = Math.round(performance.now());
      if (m.janky) {
        info.janky = true;
        setSessionOff(); // the rest frame stays on screen; later loads in this session get the still
      } else lamp();
    } else if (m.type === "fail") {
      toStill(m.reason === "slow" ? "still-slow" : "still-fail", String(m.reason || "error"), true, true);
    } else if (m.type === "lost") {
      toStill("lost", "context-lost", false, true); // no flag: the next load retries
    } else if (m.type === "stats") {
      frames = Number(m.frames) || 0;
      info.last = m;
      for (const w of waiters.splice(0)) w(frames);
    }
  };

  try {
    const c = document.createElement("canvas");
    c.className = "absolute inset-0 h-full w-full opacity-0";
    el.appendChild(c);
    canvas = c;
    const off = c.transferControlToOffscreen();
    const w = new Worker(new URL("./hero3d.worker.ts", import.meta.url), { type: "module" });
    worker = w;
    info.workerMs = Math.round(performance.now());
    w.onmessage = (e: MessageEvent<Msg>) => onMessage(e.data);
    w.onerror = (e) => {
      e.preventDefault();
      toStill("still-fail", "worker-error", true, true);
    };
    w.onmessageerror = () => toStill("still-fail", "messageerror", true, true);
    const r = el.getBoundingClientRect();
    w.postMessage(
      { type: "init", canvas: off, cssW: r.width, cssH: r.height, dpr: window.devicePixelRatio || 1, coarse: matchMedia("(pointer: coarse)").matches, pose, dark: isDark(), freezeAt: d.freezeAt ?? undefined, lose: d.lose },
      [off],
    );
    wdRun();
    const ro = new ResizeObserver((es) => {
      const cr = es[es.length - 1].contentRect;
      rectDirty = true;
      send({ type: "size", cssW: cr.width, cssH: cr.height });
    });
    ro.observe(el);
    const io = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      ratio = e.isIntersecting ? e.intersectionRatio : 0;
      send({ type: "vis", onscreen: e.isIntersecting, hidden: document.hidden });
      maybeGo();
    }, { threshold: [0, START.goRatio] });
    io.observe(el);
    // Only a real theme change redraws: Lenis toggles its own classes on <html> while scrolling.
    let dark = isDark();
    const mo = new MutationObserver(() => {
      if (isDark() === dark) return;
      dark = !dark;
      send({ type: "theme", dark });
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    undo.push(() => ro.disconnect(), () => io.disconnect(), () => mo.disconnect());
    listen(document, "visibilitychange", () => {
      send({ type: "vis", onscreen: ratio > 0, hidden: document.hidden });
      if (document.hidden) wdPause();
      else wdRun();
      maybeGo();
    });
  } catch {
    toStill("still-fail", "start-error", true, true);
  }
  return stop;
}
