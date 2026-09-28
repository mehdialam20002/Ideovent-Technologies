import type { ReactNode } from "react";
import type { LeadStatus } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";

/**
 * CRM DESIGN LANGUAGE (shared by every builder; see CRM-CONTRACT.md).
 *
 * Calm and dense: neutral surfaces (bg-background page, bg-card panels,
 * border-border hairlines), ONE accent (the site's --primary), and colour
 * spent only on status. Tables at 13px, body at 14px. Controls are 32-36px
 * on desktop (this is a desk tool) and 44px where the phone layout needs it.
 */

export const crm = {
  /** A panel: card surface with a hairline. */
  panel: "rounded-xl border border-border bg-card",
  panelPad: "p-4 sm:p-5",
  /** Section label above a panel or group. */
  label: "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
  /** Table text and header cells. */
  table: "w-full border-separate border-spacing-0 text-[13px]",
  th: "sticky top-0 z-10 h-9 whitespace-nowrap border-b border-border bg-card px-3 text-left text-[12px] font-medium text-muted-foreground",
  td: "h-10 whitespace-nowrap border-b border-border/60 px-3 align-middle",
  row: "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none aria-selected:bg-primary/5",
  /** Buttons. */
  btn: "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  btnPrimary: "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  btnGhost: "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
  input: "h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-ring",
  /** Numbers: tabular so columns line up. */
  num: "tabular-nums",
} as const;

/**
 * Status colours. Fixed hues (not theme tokens) so a chart legend, a board
 * column and a table pill agree in both themes. The dot is the colour; text
 * stays foreground for contrast.
 */
export const STATUS_HEX: Record<LeadStatus, string> = {
  new: "#64748b",
  contacted: "#3b82f6",
  replied: "#14b8a6",
  demo_opened: "#f59e0b",
  call: "#8b5cf6",
  proposal: "#6366f1",
  won: "#22c55e",
  lost: "#a8a29e",
  do_not_contact: "#ef4444",
};

/** The pipeline board's columns, in order. Lost and Do not contact are folded. */
export const PIPELINE_COLUMNS: LeadStatus[] = ["new", "contacted", "replied", "demo_opened", "call", "proposal", "won"];

export function StatusDot({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: STATUS_HEX[status] }}
    />
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn(crm.panel, "flex flex-col items-center px-6 py-12 text-center")}>
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="mt-1 max-w-md text-[13px] text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A page not built yet: the builder for this page replaces the whole file. */
export function StubNote({ owner, children }: { owner: string; children?: ReactNode }) {
  return (
    <p className="mb-4 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
      Interim view ({owner} replaces this page). {children}
    </p>
  );
}

/** 0.4231 to "42%", null to a dash. */
export function pct(v: number | null | undefined, digits = 0): string {
  return v == null || !Number.isFinite(v) ? "-" : `${(v * 100).toFixed(digits)}%`;
}
