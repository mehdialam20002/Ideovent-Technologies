import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { CrmMetrics } from "../metrics";
import { CRM } from "../nav";
import { crm, pct } from "../ui";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { buildRows, viewOf, type ViewId } from "../leads/leadQuery";
import { change, type Change } from "./format";

/** A link into the leads table with a saved view or filter (see CRM-CONTRACT 5.B). */
export function leadsLink(params: Record<string, string>): string {
  // A status filter on the default "All open" view hides Won, Lost and Do not contact.
  if (params.status && !params.view) params = { view: "all", ...params };
  return `${CRM.leads}?${new URLSearchParams(params).toString()}`;
}

interface Tile {
  label: string;
  value: string;
  to: string;
  /** A short line under the number. */
  sub?: string;
  change?: Change;
  /** Red number (overdue work). */
  alert?: boolean;
}

function ChangeBadge({ c }: { c: Change }) {
  if (!c.text) return null;
  const Icon = c.dir === "up" ? ArrowUpRight : c.dir === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1 text-[11px] font-medium",
        c.dir === "up" && "bg-success/10 text-success",
        c.dir === "down" && "bg-destructive/10 text-destructive",
        c.dir === "flat" && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {c.text}
    </span>
  );
}

function TileCard({ t, big }: { t: Tile; big?: boolean }) {
  return (
    <Link
      to={t.to}
      className={cn(
        crm.panel,
        "group flex min-h-[92px] flex-col p-3.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="line-clamp-2 text-[12px] leading-snug text-muted-foreground" title={t.label}>{t.label}</span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={cn(big ? "text-[26px]" : "text-2xl", "font-semibold leading-none", crm.num, t.alert && "text-destructive")}>
          {t.value}
        </span>
        {t.change && <ChangeBadge c={t.change} />}
      </span>
      {t.sub && <span className={cn("mt-auto pt-1.5 text-[11.5px] leading-snug text-muted-foreground", crm.num)}>{t.sub}</span>}
    </Link>
  );
}

/** Counts: how many leads reached each stage, with the last 7 days under it. */
export function CountTiles({ m }: { m: CrmMetrics }) {
  const w = m.week.thisWeek;
  const p = m.week.lastWeek;
  const reached = (stage: string) => m.funnel.find((f) => f.stage === stage)?.count ?? 0;
  // The tiles that open a saved view count with that view's own test, so the
  // number on the tile is the number of rows the click shows.
  const { leads, events, opens, demoForLead, now } = useCrmData();
  const rows = useMemo(() => buildRows(leads, events, opens, demoForLead, now), [leads, events, opens, demoForLead, now]);
  const inView = (id: ViewId) => rows.filter(viewOf(id).test).length;
  const tiles: Tile[] = [
    { label: "Total leads", value: String(m.total), to: leadsLink({ view: "all" }), sub: `${m.open} open` },
    { label: "New, last 7 days", value: String(inView("new7")), to: leadsLink({ view: "new7" }), change: change(w.newLeads, p.newLeads), sub: `vs ${p.newLeads} the 7 before` },
    { label: "Contacted", value: String(inView("ever")), to: leadsLink({ view: "ever" }), sub: `${w.sends} sends in 7 days` },
    { label: "Replied", value: String(inView("everReplied")), to: leadsLink({ view: "everReplied" }), sub: `${w.replies} replies in 7 days` },
    { label: "Demo opened", value: String(inView("demo")), to: leadsLink({ view: "demo" }), sub: `${w.demoOpens} opens in 7 days` },
    { label: "Calls", value: String(m.byStatus.call), to: leadsLink({ status: "call" }), sub: `${w.calls} calls in 7 days` },
    { label: "Proposals", value: String(m.byStatus.proposal), to: leadsLink({ status: "proposal" }), sub: `${reached("proposal")} ever reached this step` },
    { label: "Won", value: String(m.byStatus.won), to: leadsLink({ view: "won" }), sub: `${w.wins} in 7 days` },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8" data-testid="kpi-counts">
      {tiles.map((t) => <TileCard key={t.label} t={t} />)}
    </div>
  );
}

/** Rates and the work waiting: the six tiles that say how outreach is going. */
export function RateTiles({ m }: { m: CrmMetrics }) {
  const r = m.rates;
  const w = m.week.thisWeek;
  const late = m.due.overdue.length;
  const tiles: Tile[] = [
    { label: "Open leads", value: String(m.open), to: leadsLink({ view: "open" }), sub: `${m.byStatus.new} not contacted yet` },
    {
      label: "Sends, last 7 days", value: String(w.sends), to: leadsLink({ view: "all" }),
      change: change(w.sends, m.week.lastWeek.sends), sub: `${w.whatsappSends} WhatsApp, ${w.emailSends} email`,
    },
    { label: "Reply rate", value: pct(r.replyRate), to: leadsLink({ view: "everReplied" }), sub: r.contacted ? `${r.replied} of ${r.contacted} contacted` : "Nobody contacted yet" },
    { label: "Demo open rate", value: pct(r.demoOpenRate), to: CRM.demos, sub: r.withDemo ? `${r.demoOpened} of ${r.withDemo} demos sent` : "No demo sent yet" },
    { label: "Win rate", value: pct(r.winRate), to: CRM.pipeline, sub: r.won + r.lost ? `${r.won} won, ${r.lost} lost` : "No deal closed yet" },
    {
      label: "Due today and overdue", value: String(m.due.today.length + late), to: CRM.today, alert: late > 0,
      sub: late ? `${late} overdue, ${m.due.today.length} today` : `${m.hot.length} hot, ${m.due.today.length} due today`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6" data-testid="kpi-rates">
      {tiles.map((t) => <TileCard key={t.label} t={t} big />)}
    </div>
  );
}
