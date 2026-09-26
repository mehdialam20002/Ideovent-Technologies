/**
 * A DATED TIMELINE: admissions steps, term dates, the academic calendar.
 * The connecting line draws downward once (scaleY over 600ms) as the list
 * enters the view, and the steps rise in with a stagger. Motion "full" only;
 * otherwise the line is simply there.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { Reveal, useMotion } from "@/pages/site/kit/motion";

export interface TimelineStep {
  key: string;
  date?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
}

export function Timeline({ steps, numbered }: { steps: TimelineStep[]; numbered?: boolean }) {
  const motion = useMotion();
  const line = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = line.current;
    if (!el || motion !== "full" || typeof IntersectionObserver === "undefined") return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    el.style.transform = "scaleY(0)";
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      el.style.transform = "";
      el.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 600, easing: "cubic-bezier(0.22,1,0.36,1)" });
    }, { threshold: 0.15 });
    io.observe(el.parentElement || el);
    return () => {
      io.disconnect();
      el.style.transform = "";
    };
  }, [motion]);

  if (!steps.length) return null;
  return (
    <ol className="relative">
      <span ref={line} aria-hidden="true" className="absolute bottom-4 left-[15px] top-4 w-[2px] origin-top bg-[hsl(var(--ds-line))]" />
      {steps.map((s, i) => (
        <Reveal as="li" key={s.key} index={i} className="relative grid grid-cols-[32px_1fr] gap-4 pb-8 last:pb-0">
          <span aria-hidden="true" className="ds-num relative z-[1] mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[hsl(var(--ds-accent))] bg-[hsl(var(--ds-surface))] text-sm font-bold text-[hsl(var(--ds-brand-ink))]">
            {numbered ? i + 1 : ""}
          </span>
          <div>
            {s.date && <p className="ds-num text-sm font-semibold text-[hsl(var(--ds-accent))]">{s.date}</p>}
            <div className="text-lg font-semibold text-[hsl(var(--ds-ink))]">{s.title}</div>
            {s.body && <div className="mt-1 max-w-prose text-[hsl(var(--ds-ink-soft))]">{s.body}</div>}
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
