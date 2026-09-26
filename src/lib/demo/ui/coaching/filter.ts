/**
 * FILTER STATE WITH ITS TRANSITION, for results, courses, faculty and
 * reviews. The motion spec (DEMO-COACHING-IA.md): the outgoing set fades
 * out quickly, the incoming cards fade in with a small rise, staggered and
 * capped, once. Under reduced motion (ctx.motion "none") and on the light
 * budget the swap is instant. Web Animations only, so every animation
 * finishes and document.getAnimations() is empty again afterwards.
 *
 *   const f = useFilter("all");
 *   <Chips value={f.value} onChange={f.choose} ... />
 *   <div ref={f.gridRef}> ...children marked data-f ... </div>
 */

import { useLayoutEffect, useRef, useState } from "react";
import { useSite } from "@/lib/demo/site/context";

export function useFilter<T extends string>(initial: T) {
  const { motion } = useSite();
  const [value, setValue] = useState<T>(initial);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const out = useRef<Animation | null>(null);
  const entering = useRef(false);

  const choose = (v: T) => {
    if (v === value) return;
    const el = gridRef.current;
    if (motion !== "full" || !el || typeof el.animate !== "function") {
      setValue(v);
      return;
    }
    out.current?.cancel();
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "linear", fill: "forwards" });
    out.current = a;
    a.onfinish = () => {
      entering.current = true;
      setValue(v);
    };
  };

  useLayoutEffect(() => {
    if (!entering.current) return;
    entering.current = false;
    const el = gridRef.current;
    out.current?.cancel();
    out.current = null;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-f]"));
    items.forEach((item, i) => {
      item.animate(
        [{ opacity: 0, transform: "translateY(8px) scale(0.98)" }, { opacity: 1, transform: "none" }],
        { duration: 280, delay: Math.min(i, 8) * 30, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
      );
    });
  }, [value]);

  return { value, choose, gridRef };
}

/** Distinct non-empty values, in first-seen order. */
export function distinct(list: (string | undefined)[]): string[] {
  return Array.from(new Set(list.map((s) => (s || "").trim()).filter(Boolean)));
}
