/**
 * THE MOTION PRIMITIVES FOR DEMO SITES. Pages use these and nothing else: no
 * motion library, no keyframes of their own, no infinite animation anywhere.
 *
 *   <Reveal>        a section or item that rises in once as it scrolls into
 *                   view. Content already in view at load is never animated,
 *                   and nothing is hidden before JavaScript runs.
 *   <CountUp>       a figure that counts up once, only for a real typed number
 *                   that has a basis line. The final value is in the DOM and
 *                   in aria-label from the first render.
 *   <SiteLink>      an in-site link with a View Transitions cross-fade.
 *   useMotion()     the level the shell decided: "full", "light" or "none".
 *
 * Reduced motion: the shell sets ctx.motion to "none" when the reader asks for
 * reduced motion, and every primitive then renders its final state with no
 * transition, so document.getAnimations() stays empty after load and after a
 * scroll. Tokens (durations, curves) are CSS variables in ../site.css.
 */

import { useEffect, useRef, useState, type ReactNode, type MouseEvent, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useSite, type MotionLevel } from "@/lib/demo/site/context";

export function useMotion(): MotionLevel {
  return useSite().motion;
}

/** True when the reader asked for reduced motion. Safe outside a browser. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/* ── Reveal ──────────────────────────────────────────────────────────────── */

export function Reveal({
  children,
  index = 0,
  as: Tag = "div",
  className,
  style,
}: {
  children: ReactNode;
  /** Position in a list, for the stagger. Capped at 6. */
  index?: number;
  as?: "div" | "section" | "li" | "article";
  className?: string;
  style?: CSSProperties;
}) {
  const motion = useMotion();
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || motion === "none" || typeof IntersectionObserver === "undefined") return;
    const r = el.getBoundingClientRect();
    /* Already on screen at mount: leave it exactly as rendered. */
    if (r.top < window.innerHeight && r.bottom > 0) return;
    el.style.setProperty("--ds-rv-delay", `${Math.min(index, 6) * 60}ms`);
    el.classList.add("ds-rv-pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        el.classList.add("ds-rv-in");
        el.classList.remove("ds-rv-pending");
        const done = () => el.classList.remove("ds-rv-in");
        el.addEventListener("transitionend", done, { once: true });
        window.setTimeout(done, 1200);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motion, index]);

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {children}
    </Tag>
  );
}

/* ── CountUp ─────────────────────────────────────────────────────────────── */

/** "1,080" -> {n: 1080, decimals: 0, prefix: "", suffix: ""}; "98.4%" -> 98.4 with "%". */
export function parseFigure(value: string): { n: number; decimals: number; prefix: string; suffix: string } | null {
  const m = /^(\D*?)([\d,]+(?:\.\d+)?)(\D*)$/.exec((value || "").trim());
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return { n, decimals: (m[2].split(".")[1] || "").length, prefix: m[1], suffix: m[3] };
}

function formatIndian(n: number, decimals: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function CountUp({ value, basis, className }: { value: string; basis?: string; className?: string }) {
  const motion = useMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);
  const fig = parseFigure(value);
  const animate = motion === "full" && !!fig && !!(basis || "").trim();

  useEffect(() => {
    setShown(value);
    const el = ref.current;
    if (!animate || !el || !fig || typeof IntersectionObserver === "undefined") return;
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 900);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(p >= 1 ? value : fig.prefix + formatIndian(fig.n * eased, fig.decimals) + fig.suffix);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animate]);

  return (
    <span ref={ref} className={className} aria-label={value} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

/* ── SiteLink ────────────────────────────────────────────────────────────── */

type VTDocument = Document & { startViewTransition?: (cb: () => void) => unknown };

/**
 * A link inside the demo. With motion "full" and a browser that has View
 * Transitions, the page cross-fades (the header is excluded in site.css);
 * otherwise it is an ordinary client-side link. External addresses and
 * modified clicks are left to the browser.
 */
export function SiteLink({
  to,
  children,
  className,
  onNavigate,
  ...rest
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
  "aria-current"?: "page" | undefined;
  "aria-label"?: string;
  tabIndex?: number;
}) {
  const motion = useMotion();
  const navigate = useNavigate();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();
    const doc = document as VTDocument;
    if (motion !== "full" || !doc.startViewTransition) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    doc.startViewTransition(() => flushSync(() => navigate(to)));
  };
  return (
    <Link to={to} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
