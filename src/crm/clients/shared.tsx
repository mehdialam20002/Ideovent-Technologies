import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, DatabaseZap } from "lucide-react";
import { crmErrorText } from "@/lib/outreach/access";
import { inrGroup } from "@/lib/clients/money";
import { fmtDate } from "@/lib/clients/numbering";
import type { Health } from "@/lib/clients/tasks";
import { cn } from "@/lib/utils";
import { crm } from "../ui";

/**
 * Small pieces the client screens share: money, dates, the health dot, a folded
 * panel, a field, a reason prompt. The CRM's own tokens (ui.tsx); no new colours.
 */

export const rs = (n: number | null | undefined) => (n === null || n === undefined ? "-" : `Rs ${inrGroup(n)}`);
export const day = (iso?: string | null) => (iso ? fmtDate(iso.slice(0, 10)) : "");
export const errText = (e: unknown) => (e instanceof Error && !(e as { code?: string }).code ? e.message : crmErrorText(e));

export const HEALTH_DOT: Record<Health, string> = {
  on_hold: "bg-muted-foreground",
  overdue: "bg-destructive",
  waiting: "bg-amber-500",
  on_track: "bg-emerald-500",
};

export function HealthDot({ health, label }: { health: Health; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" data-testid="client-health" data-health={health}>
      <span className={cn("inline-block h-2 w-2 rounded-full", HEALTH_DOT[health])} aria-hidden="true" />
      {label}
    </span>
  );
}

/** A folded panel (the client page's Brief, Four numbers, scripts, trackers). */
export function Fold({ title, children, open, testId, count }: { title: string; children: ReactNode; open?: boolean; testId?: string; count?: number }) {
  return (
    <details className={cn(crm.panel, "group")} open={open} data-testid={testId}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {count !== undefined && <span className="rounded-full bg-muted px-2 text-[11px] tabular-nums text-muted-foreground">{count}</span>}
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}

export function Field({ id, label, hint, children, className }: { id: string; label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[12px] font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const inputCls = cn(crm.input, "max-md:h-11 max-md:text-base");
export const areaCls = cn(crm.input, "h-auto py-2 max-md:text-base");

/** A message under a form: what went wrong, in the guard's own words. */
export function Problem({ text }: { text: string | null }) {
  if (!text) return null;
  return <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{text}</p>;
}

/** A row of plain reasons why something is off (a lock, a blank). */
export function Reasons({ items, tone = "warn", testId }: { items: string[]; tone?: "warn" | "block"; testId?: string }) {
  if (!items.length) return null;
  return (
    <ul data-testid={testId} className={cn("space-y-1 rounded-lg border px-3 py-2 text-[12px]", tone === "block" ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/10")}>
      {items.map((x) => <li key={x}>{x}</li>)}
    </ul>
  );
}

/** "Do it anyway" / "Move on anyway" / "Skip": a written reason first, never a blank one. */
export function ReasonPrompt({ label, button, onSubmit, onCancel, testId }: {
  label: string;
  button: string;
  onSubmit: (reason: string) => Promise<void> | void;
  onCancel: () => void;
  testId?: string;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3" data-testid={testId}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!reason.trim()) return setErr("Write the reason: it goes on the timeline and stays red on the project.");
        setBusy(true);
        setErr(null);
        try {
          await onSubmit(reason.trim());
        } catch (x) {
          setErr(errText(x));
        } finally {
          setBusy(false);
        }
      }}>
      <label className="block text-[12px] font-medium" htmlFor={`${testId || "reason"}-text`}>{label}</label>
      <textarea id={`${testId || "reason"}-text`} rows={2} className={areaCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid={testId ? `${testId}-text` : undefined} />
      <Problem text={err} />
      <div className="flex justify-end gap-2">
        <button type="button" className={crm.btn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={crm.btnPrimary} disabled={busy} data-testid={testId ? `${testId}-submit` : undefined}>{button}</button>
      </div>
    </form>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** A Blob saved as a file, by a temporary link (nothing is uploaded anywhere). */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Before 0014 runs in Supabase mode, every client screen says this and nothing else changes (decision 14). */
export function Needs0014() {
  return (
    <section data-testid="clients-needs-0014" className={cn(crm.panel, "mx-auto mt-6 max-w-md p-6 text-center")}>
      <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"><DatabaseZap className="h-5 w-5" aria-hidden="true" /></span>
      <h1 className="mt-3 font-display text-lg font-semibold">This needs the client update (0014)</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">Run supabase/migrations/0014_client_process.sql in the Supabase SQL editor (SUPABASE_SETUP.md, section 0014). Everything else works as before.</p>
    </section>
  );
}

/** Below 768 px (the board becomes the list). */
export function useNarrow(): boolean {
  const q = "(max-width: 767px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setNarrow(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return Boolean(narrow);
}
