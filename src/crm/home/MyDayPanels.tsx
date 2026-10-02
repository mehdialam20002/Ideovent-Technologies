import { Link } from "react-router-dom";
import { ArrowRightLeft, BellRing, CheckCircle2, MonitorSmartphone, PencilLine, Users } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/outreach/types";
import type { CrmNotification, CrmRequest, MemberStats, NotificationKind } from "@/lib/outreach/team";
import { useNotifications } from "../notifications/Bell";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm, StatusDot } from "../ui";
import { cn } from "@/lib/utils";
import { ago, plural } from "../dashboard/format";
import { leadsLink } from "../dashboard/KpiTiles";
import { KIND_TEXT, OUTCOME_TEXT } from "../today/WaitingOnYou";

/*
 * MY DAY'S PANELS (spec 10.5): the banners from the bell, the numbers against
 * targets, WhatsApp health, the pipeline by stage, and the hand-overs and
 * requests with Mehdi's answer. MyDay.tsx lays them out, phone first.
 */

/* ── Banners: unread notifications, one line each kind ─────────────────── */

/** "Mehdi Alam assigned you 4 leads" is 4; "Mehdi Alam assigned you Sunrise School" is 1. */
export function assignedCount(n: Pick<CrmNotification, "title">): number {
  const m = /assigned you (\d+) leads?\b/i.exec(n.title || "");
  return m ? Number(m[1]) : 1;
}

const BANNER_ICON: Partial<Record<NotificationKind, typeof Users>> = {
  assigned: Users,
  demo_ready: MonitorSmartphone,
  review: PencilLine,
  resolved: CheckCircle2,
  moved_away: ArrowRightLeft,
};

interface Banner {
  key: string;
  kind: NotificationKind;
  ids: number[];
  text: string;
  to?: string;
  link?: string;
  /** More lines under it (each review). */
  items?: { id: number; text: string; to?: string }[];
}

function bannersFrom(items: CrmNotification[]): Banner[] {
  const unread = items.filter((n) => !n.readAt);
  const of = (k: NotificationKind) => unread.filter((n) => n.kind === k);
  const out: Banner[] = [];
  const assigned = of("assigned");
  if (assigned.length) {
    const n = assigned.reduce((s, x) => s + assignedCount(x), 0);
    out.push({ key: "assigned", kind: "assigned", ids: assigned.map((x) => x.id), text: `${plural(n, "new lead")} assigned to you`, to: CRM.leads, link: "My leads" });
  }
  for (const d of of("demo_ready")) {
    out.push({ key: `d${d.id}`, kind: "demo_ready", ids: [d.id], text: d.title, to: d.leadId ? CRM.lead(d.leadId) : undefined, link: "Open the lead" });
  }
  const reviews = of("review");
  if (reviews.length) {
    out.push({
      key: "review", kind: "review", ids: reviews.map((x) => x.id),
      text: `Mehdi asked you to fix ${plural(reviews.length, "thing")}`,
      items: reviews.map((r) => ({ id: r.id, text: r.title, to: r.leadId ? CRM.lead(r.leadId) : undefined })),
    });
  }
  for (const r of [...of("resolved"), ...of("moved_away")]) {
    out.push({ key: `r${r.id}`, kind: r.kind, ids: [r.id], text: r.title, to: r.leadId ? CRM.lead(r.leadId) : undefined, link: r.leadId ? "Open the lead" : undefined });
  }
  return out;
}

const TONE: Partial<Record<NotificationKind, string>> = {
  assigned: "border-l-primary",
  demo_ready: "border-l-[#f59e0b]",
  review: "border-l-destructive",
  resolved: "border-l-success",
  moved_away: "border-l-muted-foreground",
};

export function Banners() {
  const { items, markRead } = useNotifications();
  const list = bannersFrom(items);
  if (!list.length) return null;
  return (
    <div className="space-y-2" data-testid="my-day-banners" aria-label="What changed for you" role="region">
      {list.map((b) => {
        const Icon = BANNER_ICON[b.kind] || BellRing;
        return (
          <div key={b.key} data-banner={b.kind} className={cn(crm.panel, "flex items-start gap-3 border-l-4 px-3 py-2.5", TONE[b.kind])}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-[13px]">
              <p className="font-medium">{b.text}</p>
              {b.items && (
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {b.items.map((it) => (
                    <li key={it.id} className="truncate">
                      {it.to ? <Link to={it.to} onClick={() => void markRead([it.id])} className="hover:text-foreground hover:underline">{it.text}</Link> : it.text}
                    </li>
                  ))}
                </ul>
              )}
              {b.to && b.link && (
                <Link to={b.to} onClick={() => void markRead(b.ids)} className="mt-0.5 inline-block text-[12.5px] font-medium text-primary hover:underline">
                  {b.link}
                </Link>
              )}
            </div>
            <button type="button" onClick={() => void markRead(b.ids)} className={cn(crm.btnGhost, "h-8 shrink-0 px-2 text-[12px] max-md:h-10")} aria-label={`Dismiss: ${b.text}`}>
              OK
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Numbers against targets (crm_activity_stats) ───────────────────────── */

function Meter({ value, of, tone = "bg-primary" }: { value: number; of?: number | null; tone?: string }) {
  if (!of || of <= 0) return null;
  const pct = Math.min(100, Math.round((value / of) * 100));
  return (
    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <span className={cn("block h-full rounded-full", value >= of ? "bg-success" : tone)} style={{ width: `${pct}%` }} />
    </span>
  );
}

function Num({ id, label, value, of, sub, strong }: { id: string; label: string; value: number | null; of?: number | null; sub?: string; strong?: boolean }) {
  return (
    <div data-num={id} className={cn("rounded-lg border border-border/70 p-2.5", strong && "border-primary/40 bg-primary/5")}>
      <p className="text-[12px] leading-snug text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-xl font-semibold leading-none", crm.num)}>
        <span data-value>{value === null ? "-" : value}</span>
        {of ? <span className="text-[12px] font-normal text-muted-foreground"> of {of}</span> : null}
      </p>
      {value !== null && <Meter value={value} of={of} />}
      {sub && <p className={cn("mt-1 text-[11.5px] leading-snug text-muted-foreground", crm.num)}>{sub}</p>}
    </div>
  );
}

export function NumbersPanel({ today, week, error }: { today?: MemberStats; week?: MemberStats; error?: string | null }) {
  const { me } = useCrmData();
  const t = me.targets || {};
  const v = (row: MemberStats | undefined, f: (r: MemberStats) => number) => (row ? f(row) : null);
  return (
    <section className={cn(crm.panel, crm.panelPad)} aria-labelledby="my-numbers-h" data-testid="my-numbers">
      <h2 id="my-numbers-h" className={crm.label}>My numbers</h2>
      {error && <p role="alert" className="mt-2 text-[12px] text-destructive">The numbers did not load: {error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Num id="firstMessages" label="First messages today" value={v(today, (r) => r.firstWhatsapp + r.firstEmail)} of={t.firstMessagesPerDay}
          sub={today ? `${today.firstWhatsapp} WhatsApp, ${today.firstEmail} e-mail` : undefined} />
        <Num id="calls" label="Calls today" value={v(today, (r) => r.calls)} of={t.callsPerDay}
          sub={today && today.callsConnected ? `${today.callsConnected} connected` : undefined} />
        <Num id="replies" label="Replies this week" value={v(week, (r) => r.replies)} of={t.repliesPerWeek} />
        <Num id="handoffs" label="Hand-overs this week" value={v(week, (r) => r.handoffs)} of={t.handoffsPerWeek} />
        <Num id="accepted" label="Accepted by Mehdi this week" value={v(week, (r) => r.handoffsConfirmed)} strong
          sub="The number that counts: hand-overs Mehdi took." />
        <Num id="won" label="Won, credited to you" value={v(today, (r) => r.wonCredited)} sub="Leads you handed over that became clients." />
      </div>
      {today && (today.overdue > 0 || today.untouched > 0) && (
        <p className="mt-2.5 text-[12px] text-muted-foreground" data-num="late">
          {[
            today.overdue ? `${plural(today.overdue, "follow-up")} overdue` : "",
            today.untouched ? `${plural(today.untouched, "lead")} not touched for over a day since Mehdi assigned ${today.untouched === 1 ? "it" : "them"}` : "",
          ].filter(Boolean).join(". ")}.
        </p>
      )}
    </section>
  );
}

/* ── WhatsApp health ────────────────────────────────────────────────────── */

export function WhatsAppHealth({ today, month }: { today?: MemberStats; month?: MemberStats }) {
  const { me } = useCrmData();
  const limit = me.waDailyLimit;
  const sent = today?.firstWhatsapp ?? 0;
  const unanswered = month?.unansweredFirstWhatsapp ?? 0;
  const monthFirst = month?.firstWhatsapp ?? 0;
  const full = Boolean(limit && today && sent >= limit);
  return (
    <section className={cn(crm.panel, crm.panelPad)} aria-labelledby="wa-health-h" data-testid="wa-health">
      <h2 id="wa-health-h" className={crm.label}>WhatsApp health</h2>
      {limit === 0 ? (
        <p className="mt-2 text-[13px]" data-wa="off">First WhatsApp messages are off for you for now. E-mail first, or ask Mehdi.</p>
      ) : (
        <div className="mt-2" data-wa="today">
          <p className={cn("text-[13px]", crm.num)}>
            First messages today: <span className="font-semibold">{today ? sent : "-"}</span>
            {limit ? <span className="text-muted-foreground"> of {limit}</span> : <span className="text-muted-foreground"> (no daily limit)</span>}
          </p>
          {limit ? <Meter value={sent} of={limit} tone="bg-primary" /> : null}
          {full && <p className="mt-1 text-[12px] font-medium text-destructive">The limit for today is reached. E-mail and follow-ups still work.</p>}
        </div>
      )}
      <div className="mt-3 border-t border-border/60 pt-2.5" data-wa="unanswered">
        <p className={cn("text-[13px]", crm.num)}>
          No reply this month: <span className="font-semibold">{month ? unanswered : "-"}</span>
          {month && monthFirst ? <span className="text-muted-foreground"> of {plural(monthFirst, "first message")}</span> : null}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
          WhatsApp is testing a monthly limit, per sender, on messages that get no reply. Keep this low: e-mail first where you can, and stop after the follow-up.
        </p>
      </div>
    </section>
  );
}

/* ── My pipeline: counts by stage ───────────────────────────────────────── */

export function MyPipeline() {
  const { mine } = useCrmData();
  const counts = new Map<LeadStatus, number>();
  for (const l of mine) counts.set(l.status, (counts.get(l.status) || 0) + 1);
  const rows = LEAD_STATUSES.filter((s) => counts.get(s));
  return (
    <section className={cn(crm.panel, "overflow-hidden")} aria-labelledby="my-pipeline-h" data-testid="my-pipeline">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 id="my-pipeline-h" className={crm.label}>
          My pipeline <span className={cn("font-normal normal-case tracking-normal", crm.num)}>{mine.length}</span>
        </h2>
        <Link to={CRM.pipeline} className="text-[12px] text-muted-foreground hover:text-foreground">Open the board</Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 pt-2 text-[13px] text-muted-foreground">No leads yet. When Mehdi assigns you leads, they show here by stage.</p>
      ) : (
        <ul className="mt-2 pb-1.5">
          {rows.map((s) => (
            <li key={s}>
              <Link to={leadsLink({ status: s })} data-stage={s} className="flex items-center gap-2 px-4 py-1.5 text-[13px] hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none">
                <StatusDot status={s} />
                <span className="flex-1">{LEAD_STATUS_LABELS[s]}</span>
                <span className={cn("font-medium", crm.num)}>{counts.get(s)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── My hand-overs and requests, with Mehdi's answer ────────────────────── */

const ANSWER_TONE: Record<string, string> = {
  accepted: "bg-success/10 text-success",
  done: "bg-success/10 text-success",
  not_real: "bg-muted text-muted-foreground",
  no_action: "bg-muted text-muted-foreground",
  open: "bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

function Answer({ r }: { r?: CrmRequest }) {
  const key = !r ? "" : r.resolvedAt ? r.outcome || "done" : "open";
  if (!key) return null;
  const text = key === "open" ? "Waiting for Mehdi" : r?.kind === "give_back" && key === "done" ? "Taken back" : OUTCOME_TEXT[key as keyof typeof OUTCOME_TEXT] || "Answered";
  return (
    <span data-answer={key} className={cn("inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[11px] font-medium", ANSWER_TONE[key])} title={r?.outcomeNote || undefined}>
      {text}
    </span>
  );
}

export function MyHandovers() {
  const { me, overview, requests, leadById, now } = useCrmData();
  const handed = overview.filter((o) => o.qualifiedById && o.qualifiedById === me.memberId);
  /* The latest hand-over request of each lead (requests come newest first). */
  const lastHandoff = new Map<string, CrmRequest>();
  for (const r of requests) if (r.kind === "handoff" && !lastHandoff.has(r.leadId)) lastHandoff.set(r.leadId, r);
  const asks = requests.filter((r) => r.kind !== "handoff" || !handed.some((h) => h.id === r.leadId)).slice(0, 12);
  const nameFor = (id: string) => leadById(id)?.instituteName || overview.find((o) => o.id === id)?.instituteName || "A lead";
  return (
    <section className={cn(crm.panel, "overflow-hidden")} aria-labelledby="my-handovers-h" data-testid="my-handovers">
      <h2 id="my-handovers-h" className={cn(crm.label, "px-4 pt-4")}>My hand-overs and requests</h2>
      {!handed.length && !asks.length ? (
        <p className="px-4 pb-4 pt-2 text-[13px] text-muted-foreground">
          Nothing yet. When a prospect says yes, hand the lead to Mehdi from its page. It shows here with his answer.
        </p>
      ) : (
        <div className="pb-1.5">
          {handed.length > 0 && (
            <ul className="mt-2" aria-label="Leads you handed over" data-list="handed">
              {handed.map((o) => (
                <li key={o.id} data-lead-id={o.id}>
                  <Link to={CRM.lead(o.id)} className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none">
                    <StatusDot status={o.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{o.instituteName}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {LEAD_STATUS_LABELS[o.status]}{o.assigneeName ? ` · with ${o.assigneeName}` : ""}
                      </span>
                    </span>
                    {o.status === "won" ? (
                      <span data-answer="won" className={cn("inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[11px] font-medium", ANSWER_TONE.accepted)}>Won</span>
                    ) : (
                      <Answer r={lastHandoff.get(o.id)} />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {asks.length > 0 && (
            <ul className={cn(handed.length > 0 && "mt-1 border-t border-border/60")} aria-label="Your requests" data-list="requests">
              {asks.map((r) => (
                <li key={r.id} data-request-id={r.id} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      <span className="font-medium">{KIND_TEXT[r.kind]}</span> · {nameFor(r.leadId)}
                    </span>
                    <Answer r={r} />
                  </div>
                  {r.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{r.body}</p>}
                  <p className={cn("mt-0.5 text-[11.5px] text-muted-foreground", crm.num)}>
                    {ago(r.createdAt, now)}{r.resolvedAt && r.outcomeNote ? ` · Mehdi: ${r.outcomeNote}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
