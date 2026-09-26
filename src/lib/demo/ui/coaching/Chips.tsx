/**
 * FILTER CHIPS, in the family's language: ruled text tabs with a sliding
 * underline (classic), a segmented row with a sliding filled pill (modern),
 * or soft pills (warm). The indicator slides over the duration token, which
 * is zero under reduced motion. Rendered only when there are 2+ options.
 */

import { useLayoutEffect, useRef, useState } from "react";
import { useSite } from "@/lib/demo/site/context";
import "./coaching.css";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export function Chips<T extends string>({ label, options, value, onChange }: {
  /** The group's accessible name: "Year", "Exam". */
  label: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { family } = useSite();
  const row = useRef<HTMLDivElement | null>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = row.current?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, options.length]);

  if (options.length < 2) return null;
  return (
    <div className="dsc-chips-scroll">
      <div ref={row} role="group" aria-label={label} className="dsc-chips" data-fam={family}>
        {ind && <span aria-hidden="true" className="dsc-ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />}
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)} className="dsc-chip">
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
