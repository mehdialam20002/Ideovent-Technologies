import type { ReactNode } from "react";
import { AlertTriangle, Ban } from "lucide-react";
import type { LeadKind, LeadStatus } from "@/lib/outreach/types";
import { LEAD_KIND_LABELS, LEAD_KIND_VALUES, LEAD_STATUS_LABELS } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";

/**
 * Shared look for the Outreach section. Mobile first: every control is at
 * least 44px tall (h-11), because this screen is used from a phone between
 * calls as often as from the laptop.
 */

export const inputCls =
  "mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm";

export const textareaCls =
  "mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-relaxed outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/50 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50";

export const cardCls = "rounded-2xl border border-border/70 bg-card p-4 sm:p-6";

/** Quiet text button for secondary actions: no border, still 44px tall. */
export const btnGhost =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/** A <details> summary that looks like a quiet row and keeps a visible focus ring. */
export const summaryCls =
  "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden after:shrink-0 after:text-xs after:content-['+'] [[open]>&]:after:content-['-']";

export const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-muted text-foreground",
  contacted: "bg-primary/10 text-primary",
  replied: "bg-success/15 text-success",
  demo_opened: "bg-warning/20 text-foreground",
  call: "bg-success/15 text-success",
  proposal: "bg-primary/15 text-primary",
  won: "bg-success/25 text-success",
  lost: "bg-muted text-muted-foreground",
  do_not_contact: "bg-destructive/15 text-destructive",
};

export function StatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[status], className)}>
      {LEAD_STATUS_LABELS[status] || status}
    </span>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Blockers({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul role="alert" aria-label="Blocked" className="space-y-1.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
      {items.map((b) => (
        <li key={b} className="flex gap-2">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul aria-label="Warnings" className="space-y-1.5 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
      {items.map((w) => (
        <li key={w} className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{w}</span>
        </li>
      ))}
    </ul>
  );
}

/** "27 Sep, 10:30" in India's format. Empty string for no date. */
export function fmtDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "today", "tomorrow", "in 3 days", "2 days late". */
export function dueLabel(iso?: string, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1) return `in ${diff} days`;
  if (diff === -1) return "1 day late";
  return `${-diff} days late`;
}

/** A phone as Mehdi reads it: +91 98100 12345. */
export function prettyPhone(p?: string): string {
  if (!p) return "";
  const m = /^\+91(\d{5})(\d{5})$/.exec(p);
  return m ? `+91 ${m[1]} ${m[2]}` : p;
}

/**
 * Every lead kind in the order the pickers list them, and its label ("dental",
 * Dental clinic, added 28 Sep 2026). Both come from src/lib/outreach/types.ts,
 * so every selector, filter, card and breakdown in the CRM says the same words.
 */
export const LEAD_KINDS: readonly LeadKind[] = LEAD_KIND_VALUES;
export const KIND_LABEL: Record<string, string> = { ...LEAD_KIND_LABELS };
export const LANGUAGE_LABEL: Record<string, string> = { en: "English", hinglish: "Hinglish", hi: "Hindi" };
