/**
 * FILTER CHIPS AND THE FLIP LIST TRANSITION, for the school pages that filter
 * (Results by year and class, Gallery by category, Notices by kind, Faculty
 * by group). Imported only by those pages, so it rides in their lazy chunks.
 *
 * Motion (DEMO-SCHOOL-IA.md, motion spec): items leaving fade out and shrink
 * to 0.96 over 120ms; the items that stay glide to their new place (FLIP,
 * 360ms ease-out); items arriving fade in with an 8px rise, staggered 30ms.
 * The chip indicator slides under the chosen chip (CSS transition, 220ms).
 * Only when useMotion() === "full". Otherwise the swap is instant, so under
 * reduced motion document.getAnimations() stays empty.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useMotion } from "@/pages/site/kit/motion";

const EASE = "cubic-bezier(0.22,1,0.36,1)";

/** One row of chips. `value` is the chosen id; ids are opaque strings. */
export function FilterChips({ label, options, value, onChange }: {
  label: string;
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ${
              on
                ? "border-transparent bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]"
                : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-[hsl(var(--ds-ink))] hover:border-[hsl(var(--ds-ink)/0.5)]"
            }`}
          >
            {o.label}
            {typeof o.count === "number" && <span className="ds-num opacity-70">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tabs with an underline that slides to the chosen tab (year tabs on Results).
 * The underline is one element moved with a CSS transform transition.
 */
export function SlideTabs({ label, options, value, onChange }: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
    if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, options.length]);
  if (options.length < 2) return null;
  return (
    <div ref={wrap} role="tablist" aria-label={label} className="relative -mx-4 flex gap-1 overflow-x-auto border-b border-[hsl(var(--ds-line))] px-4 sm:mx-0 sm:px-0">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" data-tab={o.id} aria-selected={o.id === value} onClick={() => onChange(o.id)}
          className={`ds-num min-h-[44px] shrink-0 px-4 text-base font-semibold ${o.id === value ? "text-[hsl(var(--ds-ink))]" : "text-[hsl(var(--ds-ink-soft))]"}`}>
          {o.label}
        </button>
      ))}
      {bar && (
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-[3px] bg-[hsl(var(--ds-accent))]"
          style={{ width: bar.w, transform: `translateX(${bar.x}px)`, transition: "transform var(--ds-d2) var(--ds-ease-inout), width var(--ds-d2) var(--ds-ease-inout)" }} />
      )}
    </div>
  );
}

/**
 * A list whose children carry `data-k` keys. `run(change)` applies a filter
 * change with the leave / move / enter choreography described above.
 */
export function useFlipList<T extends HTMLElement = HTMLElement>() {
  const motion = useMotion();
  const ref = useRef<T | null>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const [tick, setTick] = useState(0);

  const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(":scope > [data-k]") || []);

  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || motion !== "full") return;
    let entering = 0;
    for (const el of items()) {
      const k = el.dataset.k || "";
      const was = prev.get(k);
      const now = el.getBoundingClientRect();
      if (was) {
        const dx = was.left - now.left;
        const dy = was.top - now.top;
        if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 360, easing: EASE });
      } else {
        el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
          { duration: 280, easing: EASE, delay: Math.min(entering++, 8) * 30, fill: "backwards" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  /** Apply `change`. `keep(k)` says whether the item keyed k survives it. */
  const run = (change: () => void, keep: (k: string) => boolean) => {
    if (motion !== "full" || !ref.current) {
      change();
      return;
    }
    const leaving = items().filter((el) => !keep(el.dataset.k || ""));
    const finish = () => {
      before.current = new Map(items().map((el) => [el.dataset.k || "", el.getBoundingClientRect()]));
      change();
      setTick((t) => t + 1);
    };
    if (!leaving.length) return finish();
    const anims = leaving.map((el) => el.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(0.96)" }], { duration: 120, easing: "linear", fill: "forwards" }));
    Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => {
      finish();
      anims.forEach((a) => a.cancel());
    });
  };

  return { ref, run };
}

/** Keyed wrapper for one item of a FLIP list. */
export function FlipItem({ k, children, className, as: Tag = "div" }: { k: string; children: ReactNode; className?: string; as?: "div" | "li" | "tr" }) {
  return <Tag data-k={k} className={className}>{children}</Tag>;
}
