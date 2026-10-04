import type { DemoSiteOpen } from "@/lib/cms/types";
import { istStartOfDay } from "@/lib/outreach/access";
import type { AccessDay, CrmMember, MemberStats } from "@/lib/outreach/team";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";
import { closeThese, hotLeads, isOpenLead, type OpensCtx } from "@/admin/outreach/derive";
import { istClock } from "../today/callTime";

/**
 * TEAM > PERFORMANCE, the pure part (spec 10.6): the team cards and each
 * person's alerts, from the same numbers crm_activity_stats gives everyone.
 * Mehdi's own thresholds (FOLLOW-UP-DISCIPLINE.md section 3). Activity counts
 * are for coaching, never for pay: any ranking uses accepted hand-overs and
 * wins (spec 11.5).
 */

const DAY_MS = 864e5;
const HOUR_MS = 36e5;

export const ALERT_OVERDUE = 10;
export const ALERT_TOUCHES_7D = 60;
export const ALERT_CLOSE_THESE = 20;
export const STALE_DAYS = 7;
export const HOT_ACT_HOURS = 2;

/** First messages, follow-ups and calls: what "touches" counts. */
export function touches(r: Pick<MemberStats, "firstWhatsapp" | "firstEmail" | "followUps" | "calls">): number {
  return r.firstWhatsapp + r.firstEmail + r.followUps + r.calls;
}

/** The leads the team works: assigned to someone who is not Mehdi. */
export function teamLeads(leads: OutreachLead[], ownerId: string | null): OutreachLead[] {
  return leads.filter((l) => l.assigneeId && l.assigneeId !== ownerId);
}

/** When anything last happened on each lead (its newest history line). */
function lastLineAt(events: OutreachEvent[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) {
    const t = Date.parse(e.at);
    if (Number.isFinite(t) && t > (m.get(e.leadId) || 0)) m.set(e.leadId, t);
  }
  return m;
}

export interface TeamCards {
  /** Open leads nobody works (the pool). */
  unassigned: number;
  /** Open team leads with no line for STALE_DAYS days or more (since the last line, or the assignment). */
  stale: OutreachLead[];
  /**
   * Hot leads (derive.ts hotOf, the one Hot of Leads, Today and the Dashboard) whose first open since the last
   * contact is more than HOT_ACT_HOURS old, with nothing sent since: every lead the caller reads, Mehdi's and the
   * pool's too (crm-fixes-1004 item 5: Today listed Verma as Hot while this card said 0, counting team leads only).
   */
  hotNotActed: OutreachLead[];
  /** Open requests waiting for Mehdi. */
  waiting: number;
}

export function teamCards(input: {
  leads: OutreachLead[]; events: OutreachEvent[]; opens: DemoSiteOpen[]; ownerId: string | null; unassigned: number; waiting: number; now: Date;
  /** Each lead's own demo (useCrmData openCtx); without it, its demoId. The history is `events`. */
  demoIdOf?: OpensCtx["demoIdOf"];
}): TeamCards {
  const { events, opens, now } = input;
  const team = teamLeads(input.leads, input.ownerId);
  const last = lastLineAt(events);
  const stale = team.filter((l) => {
    if (!isOpenLead(l)) return false;
    const since = Math.max(last.get(l.id) || 0, l.assignedAt ? Date.parse(l.assignedAt) || 0 : 0);
    return since > 0 && now.getTime() - since >= STALE_DAYS * DAY_MS;
  });
  const hotNotActed = hotLeads(input.leads, opens, now, { events, demoIdOf: input.demoIdOf })
    .filter((h) => now.getTime() - Date.parse(h.opens[h.opens.length - 1]?.at || h.lastOpenAt) > HOT_ACT_HOURS * HOUR_MS)
    .map((h) => h.lead);
  return { unassigned: input.unassigned, stale, hotNotActed, waiting: input.waiting };
}

/** "Close these" per person, over the leads the caller reads. */
export function closeTheseBy(leads: OutreachLead[], events: OutreachEvent[], now: Date): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of closeThese(leads.filter((x) => x.assigneeId), events, now)) {
    m.set(l.assigneeId as string, (m.get(l.assigneeId as string) || 0) + 1);
  }
  return m;
}

/** Monday to Saturday, after 11:00 India time: late enough to expect everyone in. */
export function expectSeen(now: Date): boolean {
  const { day, minutes } = istClock(now);
  return day !== 0 && minutes >= 11 * 60;
}

export interface AlertInput {
  /** Today's row (the load numbers are the same in every period). */
  today: MemberStats;
  last7?: MemberStats;
  last14?: MemberStats;
  member?: CrmMember;
  closeCount: number;
  flaggedAccess: boolean;
  now: Date;
}

/** One person's alerts, in plain words. Mehdi's own row has none. */
export function alertsFor(a: AlertInput): string[] {
  const { today: r, member, now } = a;
  if (r.role === "owner" || !r.active) return [];
  const out: string[] = [];
  if (r.overdue > ALERT_OVERDUE) out.push(`${r.overdue} overdue`);
  if (r.role === "member" && a.last7 && touches(a.last7) < ALERT_TOUCHES_7D) out.push(`${touches(a.last7)} touches in 7 days`);
  const joined = Date.parse(member?.joinedAt || member?.createdAt || "");
  if (r.role === "member" && a.last14 && a.last14.handoffsConfirmed === 0 && Number.isFinite(joined) && now.getTime() - joined >= 14 * DAY_MS) {
    out.push("No accepted hand-over in 2 weeks");
  }
  if (r.untouched > 0) out.push(`${r.untouched} untouched over a day`);
  if (a.closeCount > ALERT_CLOSE_THESE) out.push(`${a.closeCount} to close`);
  const limit = member?.waDailyLimit;
  if (limit && limit > 0 && r.firstWhatsapp >= limit) out.push("WhatsApp limit reached");
  const seen = Date.parse(r.lastSeenAt || member?.lastSeenAt || "");
  if (expectSeen(now) && (!Number.isFinite(seen) || seen < istStartOfDay(now).getTime())) out.push("Not seen today");
  if (a.flaggedAccess) out.push("Flagged access day");
  return out;
}

/** The people with a flagged (suspicious) day on the Access tab in these rows. */
export function flaggedPeople(days: AccessDay[] | null | undefined): Set<string> {
  return new Set((days || []).filter((d) => d.suspicious).map((d) => d.memberId));
}
