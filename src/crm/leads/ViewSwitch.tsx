import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Columns3, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";

/** Filter params both screens share; the table's view and sort stay on the table. */
const SHARED = ["q", "kind", "city", "source", "assignee", "demo", "hot", "overdue"];

function carry(params: URLSearchParams, extra: string[] = []): string {
  const n = new URLSearchParams();
  for (const k of [...SHARED, ...extra]) {
    const v = params.get(k);
    if (v) n.set(k, v);
  }
  const s = n.toString();
  return s ? `?${s}` : "";
}

/** Table / Board segmented switch. Carries the filters across. */
export function ViewSwitch({ current, params }: { current: "table" | "board"; params: URLSearchParams }) {
  const item = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-10";
  return (
    <div role="group" aria-label="Layout" className="inline-flex rounded-lg border border-border bg-background p-0.5">
      <Link to={CRM.leads + carry(params, ["status"])} aria-current={current === "table" ? "page" : undefined}
        className={cn(item, current === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
        <Rows3 className="h-3.5 w-3.5" aria-hidden="true" /> Table
      </Link>
      <Link to={CRM.pipeline + carry(params)} aria-current={current === "board" ? "page" : undefined}
        className={cn(item, current === "board" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
        <Columns3 className="h-3.5 w-3.5" aria-hidden="true" /> Board
      </Link>
    </div>
  );
}

/** True at the Tailwind md breakpoint and wider. */
export function useWide(): boolean {
  const q = "(min-width: 768px)";
  const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(q).matches));
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

/** Keys typed in a field, a menu or a dialog are not shortcuts. */
export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
  return !!el.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]');
}
