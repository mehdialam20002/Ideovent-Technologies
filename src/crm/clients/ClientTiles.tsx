import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { inrGroup } from "@/lib/clients/money";
import { fmtDate } from "@/lib/clients/numbering";
import { clientTileNumbers } from "@/lib/clients/register";
import { STAGE_BY_ID } from "@/lib/clients/stages";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useOptionalClients } from "./context";

/**
 * THE CLIENT TILES ON THE DASHBOARD (client-process-spec 11.5): Mehdi only, once 0014 is there, under the
 * existing tiles. Active clients (open projects not on hold, and how many in each stage that has any);
 * Money due (outstanding, with the overdue total and count in red when above zero); Received this month
 * (India month, amounts credited); Renewals in the next 60 days (and the nearest). Each opens its Clients
 * tab. A fifth line, "Overdue client tasks: N", opens Today. The existing tiles and numbers are unchanged.
 * A lazy chunk: nobody else's browser downloads it.
 */
export default function ClientTiles() {
  const clients = useOptionalClients();
  if (!clients || clients.status !== "ready") return null;
  const { data, today, due } = clients;
  const n = clientTileNumbers(data, today);
  const late = due.filter((t) => t.due < today).length;
  const rs = (x: number) => `Rs ${inrGroup(x)}`;
  const tiles: { label: string; value: string; sub: string; to: string; alert?: boolean; testId: string }[] = [
    {
      label: "Active clients", value: String(n.active), to: CRM.clients, testId: "tile-clients-active",
      sub: n.byStage.length ? n.byStage.map((s) => `${s.count} in ${STAGE_BY_ID[s.stage].label.toLowerCase()}`).join(", ") : "No open project",
    },
    {
      label: "Money due", value: rs(n.outstanding), to: `${CRM.clients}?tab=money`, testId: "tile-clients-due", alert: n.overdue > 0,
      sub: n.overdueCount ? `${rs(n.overdue)} overdue on ${n.overdueCount} document${n.overdueCount === 1 ? "" : "s"}` : "Nothing overdue",
    },
    { label: "Received this month", value: rs(n.receivedThisMonth), to: `${CRM.clients}?tab=money`, testId: "tile-clients-received", sub: "Credited in the bank, India month" },
    {
      label: "Renewals, next 60 days", value: String(n.renewals60), to: `${CRM.clients}?tab=renewals`, testId: "tile-clients-renewals",
      sub: n.nearestRenewal ? `Nearest: ${n.nearestRenewal.client}, ${n.nearestRenewal.label.toLowerCase()}, ${fmtDate(n.nearestRenewal.date)}` : "None in the next 60 days",
    },
  ];
  return (
    <section aria-label="Clients" data-testid="client-tiles">
      <p className={cn(crm.label, "mb-1.5")}>Clients</p>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} data-testid={t.testId}
            className={cn(crm.panel, "flex min-h-[92px] flex-col p-3.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
            <span className="text-[12px] leading-snug text-muted-foreground">{t.label}</span>
            <span className={cn("mt-1 text-2xl font-semibold leading-none", crm.num)} data-testid={`${t.testId}-value`}>{t.value}</span>
            <span className={cn("mt-auto pt-1.5 text-[11.5px] leading-snug", t.alert ? "font-medium text-destructive" : "text-muted-foreground", crm.num)}>{t.sub}</span>
          </Link>
        ))}
      </div>
      {late > 0 && (
        <Link to={CRM.today} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-destructive hover:bg-destructive/5" data-testid="tile-clients-late">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Overdue client tasks: {late}
        </Link>
      )}
    </section>
  );
}
