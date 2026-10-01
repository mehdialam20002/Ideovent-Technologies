import { Check, X } from "lucide-react";
import { CARE, HOURLY_RATE, inr } from "@/lib/pricing";
import { unbreakable } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { CARE_ROWS } from "./copy";
import { SectionHead } from "./ui";

/**
 * Care plans after a one-time build: unchanged plans, prices from
 * src/lib/pricing.ts. A table from md up; one card per plan below md, from the
 * same CARE_ROWS so the two views cannot drift apart. (Called "care plans",
 * never just "Growth": the monthly website plan has a Growth too.)
 */
const isPrice = (label: string) => label.startsWith("Per ");

function Cell({ value }: { value: string }) {
  if (value === "Yes") return <Check className="mx-auto h-4 w-4 text-primary" aria-label="Yes" />;
  if (value === "No") return <X className="mx-auto h-4 w-4 text-muted-foreground/60" aria-label="No" />;
  return <span className="tabular-nums">{unbreakable(value)}</span>;
}

function PlanCards() {
  const priceRows = CARE_ROWS.filter((r) => isPrice(r.label));
  const featureRows = CARE_ROWS.filter((r) => !isPrice(r.label));
  return (
    <div className="space-y-5 md:hidden">
      {CARE.map((plan, col) => (
        <div key={plan.name} className="rounded-3xl border border-border bg-card/60 p-5">
          <h3 className="font-display text-lg font-semibold">Care plan: {plan.name}</h3>
          <dl className="mt-3 space-y-1">
            {priceRows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground text-pretty">{row.label}</dt>
                <dd className="shrink-0 font-display text-base font-semibold tabular-nums">{unbreakable(row.values[col])}</dd>
              </div>
            ))}
          </dl>
          <dl className="mt-4 divide-y divide-border/50 border-t border-border/50 pt-1 text-sm">
            {featureRows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground text-pretty">{row.label}</dt>
                <dd className={cn("shrink-0 text-right", row.values[col] === "No" ? "text-muted-foreground/60" : "text-foreground")}>
                  {row.values[col] === "Yes" ? (
                    <Check className="h-4 w-4 text-primary" aria-label="Included" />
                  ) : row.values[col] === "No" ? (
                    <X className="h-4 w-4" aria-label="Not in this plan" />
                  ) : (
                    row.values[col]
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export default function CarePlans() {
  return (
    <section id="care-plans" className="section-tight" aria-labelledby="care-heading">
      <div className="container-page">
        <SectionHead
          id="care-heading"
          title="Care plans, after a one-time build"
          intro="Optional, never a condition of the build. The 30-day defect warranty is free either way; a plan begins after it. Each plan includes everything in the plan to its left."
        />

        <div className="mt-8">
          <PlanCards />
          <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card/50 md:block">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <caption className="sr-only">Ideovent care plans compared: Essential, Growth and Priority</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-6 py-4 text-left font-display text-sm font-semibold">Included every month</th>
                  {CARE.map((p) => (
                    <th key={p.name} scope="col" className="px-4 py-4 text-center font-display text-sm font-semibold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CARE_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={cn(
                      "border-b border-border/50 last:border-b-0",
                      isPrice(row.label) && "bg-muted/40 font-medium text-foreground",
                      !isPrice(row.label) && i % 2 === 1 && "bg-muted/20",
                    )}
                  >
                    <th
                      scope="row"
                      className={cn("px-6 py-3 text-left font-normal text-pretty", isPrice(row.label) ? "text-foreground" : "text-muted-foreground")}
                    >
                      {row.label}
                    </th>
                    {row.values.map((v, j) => (
                      <td key={j} className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                        <Cell value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-sm text-muted-foreground text-pretty">
          A row marked “No” is not a refusal. It is work we will quote separately, or a reason to move up a plan.
          Response targets are counted in our stated working hours, and the Priority same-day target applies where the
          request reaches us at least two hours before the working day ends; the exact words are in the Maintenance
          Agreement you sign. Additional hours, approved in writing first, are {inr(HOURLY_RATE)} per hour. Cancel with
          30 days’ notice at any time: once any outstanding invoices are settled you keep the code, the accounts, the
          backups and the documentation, and your domain, registrar access and DNS control come back to you
          immediately.
        </p>
      </div>
    </section>
  );
}
