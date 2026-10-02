import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import type { CrmRole } from "@/lib/outreach/team";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { crm } from "../ui";

/**
 * Small pieces the Team screens share (src/crm/team). Plain words, the CRM's
 * design language (src/crm/ui.tsx): calm surfaces, one accent, colour only
 * where it says something (a role, a limit reached, a flagged day).
 */

export const ROLE_LABEL: Record<CrmRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

export function RoleBadge({ role }: { role: CrmRole }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
        role === "owner" ? "bg-primary/10 text-primary" : role === "admin" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : "bg-muted text-muted-foreground",
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

type Tone = "muted" | "primary" | "warn" | "bad" | "good";
const TONE: Record<Tone, string> = {
  muted: "border-border bg-muted/60 text-muted-foreground",
  primary: "border-primary/30 bg-primary/10 text-primary",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  bad: "border-destructive/40 bg-destructive/10 text-destructive",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
};

export function Chip({ children, tone = "muted", className, title }: { children: ReactNode; tone?: Tone; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[11px] font-medium", TONE[tone], className)}>
      {children}
    </span>
  );
}

/** A plain callout: a hint, a warning or an error, polite to screen readers. */
export function Note({ children, tone = "muted", className, testId }: { children: ReactNode; tone?: Tone; className?: string; testId?: string }) {
  return (
    <p
      data-testid={testId}
      role={tone === "bad" ? "alert" : undefined}
      className={cn("rounded-lg border px-3 py-2 text-[13px]", TONE[tone], tone === "muted" && "bg-muted/40", className)}
    >
      {children}
    </p>
  );
}

/** Copies text to the clipboard (with a fallback for older phones). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
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

/** "Copy" that says "Copied" for two seconds. */
export function CopyButton({ text, label = "Copy", testId, className }: { text: string; label?: string; testId?: string; className?: string }) {
  const [done, setDone] = useState<"" | "ok" | "no">("");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(crm.btn, "h-8 shrink-0 px-2.5 text-[12px] max-md:h-10", className)}
      onClick={async () => {
        setDone((await copyText(text)) ? "ok" : "no");
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(""), 2000);
      }}
    >
      {done === "ok" ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      <span aria-live="polite">{done === "ok" ? "Copied" : done === "no" ? "Select and copy" : label}</span>
    </button>
  );
}

/** A labelled on/off switch with a line under it. */
export function SwitchRow({ id, label, hint, checked, onChange, disabled }: {
  id: string; label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <label htmlFor={id} className={cn("min-w-0 text-[13px]", disabled && "opacity-60")}>
        <span className="block font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
    </div>
  );
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", "12 Sep"; "never" for none. */
export function seenLabel(iso?: string | null, now = new Date()): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "never";
  const min = Math.round((now.getTime() - t) / 60000);
  if (min < 2) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** 125829120 to "120 MB", 850000 to "830 KB". */
export function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 KB";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = n / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** "1 lead", "3 leads". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
