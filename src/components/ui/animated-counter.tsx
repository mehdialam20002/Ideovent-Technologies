import NumberFlow from "@number-flow/react";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Counts up to `value` when scrolled into view. */
export function AnimatedCounter({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) setDisplay(value);
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      <NumberFlow value={display} />
      {suffix}
    </span>
  );
}
