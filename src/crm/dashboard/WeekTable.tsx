import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { CrmMetrics, PeriodStats } from "../metrics";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import { change } from "./format";

const ROWS: { key: keyof PeriodStats; label: string }[] = [
  { key: "newLeads", label: "New leads" },
  { key: "sends", label: "Sends" },
  { key: "whatsappSends", label: "WhatsApp" },
  { key: "emailSends", label: "Email" },
  { key: "replies", label: "Replies" },
  { key: "demoOpens", label: "Demo opens" },
  { key: "calls", label: "Calls" },
  { key: "wins", label: "Won" },
];

/** Last 7 days against the 7 before them, row by row. */
export function WeekTable({ m }: { m: CrmMetrics }) {
  const { thisWeek: cur, lastWeek: prev } = m.week;
  return (
    <section className={cn(crm.panel, "overflow-hidden")} aria-labelledby="week-h" data-testid="week-table">
      <h2 id="week-h" className={cn(crm.label, "px-4 pt-4 sm:px-5")}>Last 7 days vs previous 7 days</h2>
      <table className={cn(crm.table, "mt-2")}>
        <thead>
          <tr>
            <th scope="col" className={cn(crm.th, "static pl-4 sm:pl-5")}><span className="sr-only">Measure</span></th>
            <th scope="col" className={cn(crm.th, "static text-right")}>Last 7</th>
            <th scope="col" className={cn(crm.th, "static text-right")}>Previous 7</th>
            <th scope="col" className={cn(crm.th, "static pr-4 text-right sm:pr-5")}>Change</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const c = change(cur[r.key], prev[r.key]);
            const Icon = c.dir === "up" ? ArrowUpRight : c.dir === "down" ? ArrowDownRight : Minus;
            const sub = r.key === "whatsappSends" || r.key === "emailSends";
            return (
              <tr key={r.key}>
                <th scope="row" className={cn(crm.td, "pl-4 text-left font-normal sm:pl-5", sub && "pl-7 text-muted-foreground sm:pl-8")}>{r.label}</th>
                <td className={cn(crm.td, crm.num, "text-right font-medium")}>{cur[r.key]}</td>
                <td className={cn(crm.td, crm.num, "text-right text-muted-foreground")}>{prev[r.key]}</td>
                <td className={cn(crm.td, crm.num, "pr-4 text-right sm:pr-5")}>
                  {c.text ? (
                    <span className={cn("inline-flex items-center gap-0.5 text-[12px]", c.dir === "up" && "text-success", c.dir === "down" && "text-destructive", c.dir === "flat" && "text-muted-foreground")}>
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {c.text}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
