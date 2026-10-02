import { useEffect } from "react";

/**
 * Buttery smooth-scroll for the whole document.
 *
 * Two things worth knowing about how this is loaded:
 *
 * 1. Lenis is imported DYNAMICALLY. This component is rendered by Layout, which
 *    every public page wraps, so a static `import Lenis from "lenis"` put the
 *    library (19.4 KB minified, measured from the entry chunk's sourcemap) on the
 *    critical path, downloaded and parsed before the first paint, to power an
 *    easing curve that only matters once the visitor starts scrolling. It is now
 *    fetched after mount, in its own chunk.
 *
 * 2. It never loads at all for a visitor who asks for reduced motion. Hijacking
 *    the scroll wheel is exactly the kind of motion WCAG 2.3.3 is about, and the
 *    check runs BEFORE the import, so those visitors pay nothing for it. The
 *    media query is also watched, so toggling the OS setting takes effect without
 *    a reload.
 *
 * 3. Nor on a phone or a tablet (2 Oct 2026). Lenis smooths WHEEL scrolling only
 *    (`smoothWheel`; touch smoothing, `syncTouch`, is off by default and not
 *    turned on here), so on a device whose main pointer is a finger it changed
 *    nothing a visitor could feel, while it cost a chunk download and a
 *    requestAnimationFrame callback on every frame for as long as the page was
 *    open: about 250 callbacks in the first seconds of a phone page load, traced
 *    at 4x CPU throttling. `(pointer: coarse)` is the PRIMARY pointer, so a
 *    touchscreen laptop driven by its trackpad still gets the smooth wheel.
 */
const NO_SMOOTH_SCROLL = "(prefers-reduced-motion: reduce), (pointer: coarse)";

export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia(NO_SMOOTH_SCROLL);
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const start = async () => {
      if (cleanup || query.matches) return;
      const { default: Lenis } = await import("lenis");
      // The user may have switched the setting, or navigated away, while the
      // chunk was in flight.
      if (cancelled || query.matches) return;

      const lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      let frame = 0;
      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);

      cleanup = () => {
        cancelAnimationFrame(frame);
        lenis.destroy();
      };
    };

    const stop = () => {
      cleanup?.();
      cleanup = null;
    };

    const onChange = () => (query.matches ? stop(): void start());
    query.addEventListener("change", onChange);
    void start();

    return () => {
      cancelled = true;
      query.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  return null;
}
