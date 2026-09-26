import { useEffect, useState, type RefObject } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

/**
 * True once `ref` has been `amount` in view, and true from the first render for
 * a reduced-motion visitor, so anything keyed on it is simply in its final
 * state for them. One IntersectionObserver, disconnected after the first hit.
 *
 * Used by the process rail (ProcessSection.tsx). It used to live in Drift.tsx
 * beside a scroll-linked 8px parallax on the home deep-dive screenshot; the
 * parallax was removed on 26 Sep 2026 because the measured brief
 * (_assets/SITE-REDESIGN-BRIEF.md, motion rules) forbids parallax and
 * scroll-linked transforms outright, and this hook is all that was left.
 */
export function useSeenOnce(ref: RefObject<Element>, amount = 0.4) {
  const [seen, setSeen] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCE).matches
  );

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: amount }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, amount, seen]);

  return seen;
}
