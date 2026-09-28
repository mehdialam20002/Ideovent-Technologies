import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import type { DayPoint } from "../metrics";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import { longDay, shortDay } from "./format";

const C = {
  email: "hsl(var(--primary))",
  whatsapp: "#16a34a",
  replies: "#14b8a6",
  opens: "#f59e0b",
  axis: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
};

type Series = "email" | "whatsapp" | "replies" | "opens";
const LABEL: Record<Series, string> = { email: "Email", whatsapp: "WhatsApp", replies: "Replies", opens: "Demo opens" };

function ChartTip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-[12px] text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{longDay(String(label))}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
          <span className="text-muted-foreground">{LABEL[p.dataKey as Series]}</span>
          <span className={cn("ml-auto pl-3 font-medium", crm.num)}>{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Sends per day for 30 days: email and WhatsApp stacked, replies (and opens) as lines. */
export function ActivityChart({ points }: { points: DayPoint[] }) {
  const [showOpens, setShowOpens] = useState(true);
  const sum = useMemo(
    () => points.reduce((a, p) => ({ email: a.email + p.email, whatsapp: a.whatsapp + p.whatsapp, replies: a.replies + p.replies, opens: a.opens + p.opens }),
      { email: 0, whatsapp: 0, replies: 0, opens: 0 }),
    [points],
  );
  const empty = !sum.email && !sum.whatsapp && !sum.replies && !sum.opens;

  return (
    <section className={cn(crm.panel, crm.panelPad)} aria-labelledby="act-h" data-testid="activity-chart">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="act-h" className={crm.label}>Activity, last 30 days</h2>
          <p className={cn("mt-1 text-[13px] text-muted-foreground", crm.num)}>
            {sum.email + sum.whatsapp} sends ({sum.whatsapp} WhatsApp, {sum.email} email), {sum.replies} replies, {sum.opens} demo opens
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
          <input type="checkbox" className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" checked={showOpens} onChange={(e) => setShowOpens(e.target.checked)} />
          Show demo opens
        </label>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground" aria-hidden="true">
        {(["email", "whatsapp", "replies", ...(showOpens ? ["opens" as const] : [])] as Series[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={cn("inline-block", k === "email" || k === "whatsapp" ? "h-2.5 w-2.5 rounded-sm" : "h-0.5 w-3.5 rounded")} style={{ background: C[k] }} />
            {LABEL[k]}
          </li>
        ))}
      </ul>
      <div className="relative mt-2 h-[240px]">
        {empty && (
          <p className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
            No sends yet in the last 30 days. Open Today and send the first messages; each one shows here.
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 18, bottom: 0, left: -24 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
            <Bar dataKey="email" stackId="s" fill={C.email} isAnimationActive={false} />
            <Bar dataKey="whatsapp" stackId="s" fill={C.whatsapp} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Line dataKey="replies" type="monotone" stroke={C.replies} strokeWidth={2} dot={false} isAnimationActive={false} />
            {showOpens && <Line dataKey="opens" type="monotone" stroke={C.opens} strokeWidth={2} dot={false} strokeDasharray="4 3" isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        Last 30 days: {sum.email} emails, {sum.whatsapp} WhatsApp messages, {sum.replies} replies, {sum.opens} demo opens.
      </p>
    </section>
  );
}
