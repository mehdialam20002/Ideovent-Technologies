/**
 * A data table that scrolls inside its own box on a phone, so the page never
 * scrolls sideways. Header cells are our copy; body cells are the record's.
 */

import type { ReactNode } from "react";
import "./coaching.css";

export function DataTable({ head, rows, caption }: { head: ReactNode[]; rows: ReactNode[][]; caption?: ReactNode }) {
  if (!rows.length) return null;
  /* A column that is blank in every row is dropped, head and all, so a
     timetable with no times (a duplicate before they are typed in) never
     shows an empty "Time" column. The first column always stays. */
  const blank = (c: ReactNode) => c === null || c === undefined || c === false || (typeof c === "string" && !c.trim());
  const keep = head.map((_, j) => j === 0 || rows.some((r) => !blank(r[j])));
  if (keep.some((k) => !k)) {
    head = head.filter((_, j) => keep[j]);
    rows = rows.map((r) => r.filter((_, j) => keep[j]));
  }
  return (
    <div className="dsc-table-wrap" tabIndex={0} role="region" aria-label={typeof caption === "string" ? caption : undefined}>
      <table className="dsc-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="!border-b !border-b-[hsl(var(--ds-line))] !text-[hsl(var(--ds-ink))] !whitespace-normal">{c}</th> : <td key={j}>{c}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
