import type { DemoSiteOpen } from "@/lib/cms/types";
import type { OutreachEvent, OutreachLead, LeadStatus } from "@/lib/outreach/types";
import { leadWhatsappNumber } from "@/lib/outreach/engine";
import { linkWentCold } from "@/lib/outreach/access";
import { getTemplate, type TemplateStage } from "@/lib/outreach/templates";
import { suggestFor } from "./stages";

/**
 * Pure readings of the outreach data. Nothing here writes or renders, so the
 * Today tab, the nav badge and the e2e script all agree on what "due" and
 * "hot" mean.
 */

const DAY = 864e5;

/** Statuses that are finished: nothing is ever due for these. */
export const CLOSED_STATUSES: LeadStatus[] = ["won", "lost", "do_not_contact"];

export function isOpenLead(l: OutreachLead): boolean {
  return !CLOSED_STATUSES.includes(l.status);
}

/** End of the local day, so "due today" includes 6 pm when it is 9 am. */
export function endOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/** Follow-ups whose date is today or earlier, oldest first. */
export function dueFollowUps(leads: OutreachLead[], now = new Date()): OutreachLead[] {
  const end = endOfToday(now).getTime();
  return leads
    .filter((l) => isOpenLead(l) && l.nextActionAt && new Date(l.nextActionAt).getTime() <= end)
    .sort((a, b) => new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime());
}

/** How many follow-ups are due today or late. The number on the nav badge. */
export function dueCount(leads: OutreachLead[], now = new Date()): number {
  return dueFollowUps(leads, now).length;
}

/**
 * Opens of this lead's demo AFTER we last contacted them, newest first.
 *
 * Opens before the last contact are old news: Mehdi has already acted on
 * them. A lead that was never contacted counts every open (somebody may have
 * forwarded the link).
 */
export function opensSinceContact(lead: OutreachLead, opens: DemoSiteOpen[] | undefined): DemoSiteOpen[] {
  if (!lead.demoId) return [];
  const since = lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : 0;
  return (opens || [])
    .filter((o) => o.demoId === lead.demoId && new Date(o.at).getTime() > since)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export interface HotLead {
  lead: OutreachLead;
  opens: DemoSiteOpen[];
  lastOpenAt: string;
}

/**
 * A demo open stays "hot" (call or message today) for this many days. An open
 * from three weeks ago is not a reason to call today; the lead then waits for
 * its follow-up date like any other.
 */
export const HOT_DAYS = 7;

/** True when the newest open since the last contact is recent enough to act on. */
export function isHotOpen(lastOpenAt: string | undefined, now = new Date()): boolean {
  if (!lastOpenAt) return false;
  const at = new Date(lastOpenAt).getTime();
  return Number.isFinite(at) && at >= now.getTime() - HOT_DAYS * 864e5;
}

/** Leads whose demo was opened since the last contact, in the last HOT_DAYS days, most recent open first. */
export function hotLeads(leads: OutreachLead[], opens: DemoSiteOpen[] | undefined, now = new Date()): HotLead[] {
  const out: HotLead[] = [];
  for (const lead of leads) {
    if (!isOpenLead(lead)) continue;
    const o = opensSinceContact(lead, opens);
    if (o.length && isHotOpen(o[0].at, now)) out.push({ lead, opens: o, lastOpenAt: o[0].at });
  }
  return out.sort((a, b) => new Date(b.lastOpenAt).getTime() - new Date(a.lastOpenAt).getTime());
}

/** All opens of a lead's demo, for the history. */
export function allOpens(lead: OutreachLead, opens: DemoSiteOpen[] | undefined): DemoSiteOpen[] {
  if (!lead.demoId) return [];
  return (opens || []).filter((o) => o.demoId === lead.demoId);
}

/** "sent" events on the same local day, for one channel. */
export function sentToday(events: OutreachEvent[], channel: "whatsapp" | "email", now = new Date()): number {
  const day = now.toDateString();
  return events.filter((e) => e.type === "sent" && e.channel === channel && new Date(e.at).toDateString() === day).length;
}

/**
 * The stage a "sent" line went out at: its own (every line the compose logs
 * since 0011 carries it), else its template's. Lines from before have no
 * stage of their own, so for them this is exactly the template's, as before.
 */
export function sentStageOf(e: Pick<OutreachEvent, "stage" | "templateId">): TemplateStage | undefined {
  return e.stage || getTemplate(e.templateId)?.stage;
}

/**
 * Cold FIRST WhatsApp messages sent today: what the playbook's daily cap
 * counts (WHATSAPP-PLAYBOOK.md 1.2), and what checkSend() is given.
 *
 * With `actorId`, only that person's own lines (actorId is stamped by the
 * server): a member's daily limit is theirs alone (spec 10.7). Without it,
 * every line counts, exactly as before the team.
 */
export function firstWhatsappToday(events: OutreachEvent[], now = new Date(), actorId?: string | null): number {
  const day = now.toDateString();
  return events.filter(
    (e) =>
      e.type === "sent" &&
      e.channel === "whatsapp" &&
      (!actorId || e.actorId === actorId) &&
      new Date(e.at).toDateString() === day &&
      sentStageOf(e) === "first",
  ).length;
}

/** Number of sends of each channel already made to this lead. */
export function sendsTo(leadId: string, events: OutreachEvent[]): { email: number; whatsapp: number } {
  let email = 0;
  let whatsapp = 0;
  for (const e of events) {
    if (e.leadId !== leadId || e.type !== "sent") continue;
    if (e.channel === "email") email++;
    if (e.channel === "whatsapp") whatsapp++;
  }
  return { email, whatsapp };
}

/**
 * The id of the "Demo opened" line for one open. The same in every browser,
 * so when Mehdi's CRM and the member's both see the open, the line is written
 * once and the second write is refused as a duplicate (spec 9.4).
 */
export function demoOpenEventId(openId: string): string {
  return `oe_open_${openId}`;
}

/* ── Close these (spec 10.5): the cadence is used up and nothing came back ── */

/** Days after the last send (or call) before a finished cadence is offered for closing. */
export const CLOSE_AFTER_DAYS = 5;

/** The Lost reason "Close these" writes (one of the reasons the Lost dialog offers). */
export const NO_REPLY_REASON = "No reply after the last message";

/**
 * The tag "Keep open" adds, with a follow-up date: the lead stays out of
 * Close these until that date. A tag, because tags and the follow-up date are
 * among the few things a member may change on their own lead.
 */
export const KEEP_OPEN_TAG = "keep-open";

export type ReachChannel = "whatsapp" | "email";

/**
 * The channels a lead can be written to: e-mail when it has an address;
 * WhatsApp when its number is an Indian mobile (a landline cannot take one)
 * or a number abroad.
 */
export function reachableChannels(lead: Pick<OutreachLead, "email" | "phone" | "whatsapp">): ReachChannel[] {
  const out: ReachChannel[] = [];
  const wa = leadWhatsappNumber(lead);
  if (wa && (!wa.startsWith("+91") || /^\+91[6-9]\d{9}$/.test(wa))) out.push("whatsapp");
  if ((lead.email || "").trim()) out.push("email");
  return out;
}

/** When this lead was last sent a message or called (ms), from its history; 0 when never. */
function lastTouchAt(own: OutreachEvent[]): number {
  let last = 0;
  for (const e of own) {
    if (e.type !== "sent" && e.type !== "call") continue;
    const t = Date.parse(e.at);
    if (Number.isFinite(t) && t > last) last = t;
  }
  return last;
}

/**
 * True when the no-reply cadence of this lead is over and it should be
 * closed. All of:
 *   - it is open, at Contacted;
 *   - nothing came back: no reply, no demo open, no connected call (an open
 *     after a cold link is not one: when the last message that carried their
 *     demo link was a cold first message, access.ts linkWentCold, as for the
 *     cold-call gate and the Demo opened status, 3 Oct 2026);
 *   - every channel it can be reached on, and any channel it was written on,
 *     has used up its no-reply ladder (stages.ts suggestFor(...).done);
 *   - the last send or call was CLOSE_AFTER_DAYS or more days ago.
 * Typically day 21 for an e-mail lead and day 9 for a WhatsApp-only one. A
 * lead kept open (KEEP_OPEN_TAG with a later follow-up date) waits for that
 * date. `events` may be every line or only this lead's.
 */
export function cadenceDone(lead: OutreachLead, events: OutreachEvent[], now = new Date()): boolean {
  if (lead.status !== "contacted") return false;
  const own = events.filter((e) => e.leadId === lead.id);
  const cold = linkWentCold(lead.id, own);
  const cameBack = own.some(
    (e) => e.type === "replied" || (e.type === "demo_opened" && !cold) || (e.type === "call" && (e.outcome || "").startsWith("connected")),
  );
  if (cameBack) return false;
  const last = lastTouchAt(own);
  if (!last || now.getTime() - last < CLOSE_AFTER_DAYS * DAY) return false;
  const keptUntil = lead.nextActionAt ? Date.parse(lead.nextActionAt) : NaN;
  if ((lead.tags || []).includes(KEEP_OPEN_TAG) && keptUntil > now.getTime()) return false;
  const channels = new Set<ReachChannel>(reachableChannels(lead));
  for (const e of own) if (e.type === "sent" && (e.channel === "whatsapp" || e.channel === "email")) channels.add(e.channel);
  if (!channels.size) return false;
  for (const ch of channels) if (!suggestFor(lead, own, ch).done) return false;
  return true;
}

/** "Close these": the leads among `leads` whose cadence is done, longest silent first. */
export function closeThese(leads: OutreachLead[], events: OutreachEvent[], now = new Date()): OutreachLead[] {
  const byLead = new Map<string, OutreachEvent[]>();
  for (const e of events) {
    const a = byLead.get(e.leadId);
    if (a) a.push(e);
    else byLead.set(e.leadId, [e]);
  }
  const out: { lead: OutreachLead; last: number }[] = [];
  for (const lead of leads) {
    if (lead.status !== "contacted") continue;
    const own = byLead.get(lead.id) || [];
    if (cadenceDone(lead, own, now)) out.push({ lead, last: lastTouchAt(own) });
  }
  return out.sort((a, b) => a.last - b.last).map((x) => x.lead);
}

/* ── Untouched (spec 10.3): assigned a day ago, nothing written since ───── */

/** Hours after an assignment before a lead its person has not touched counts as Untouched. */
export const UNTOUCHED_HOURS = 24;

/**
 * True when the lead is open, was assigned more than UNTOUCHED_HOURS ago, and
 * the person it is assigned to has written no history line on it since. The
 * same reading as crm_activity_stats' "untouched" (0011), one lead at a time,
 * so the chip on a lead row and the dashboards' counts agree with Team >
 * Performance. A lead in the pool, or one with no assignment time (before
 * 0011), is never untouched. `events` may be every line or only this lead's.
 */
export function isUntouched(lead: OutreachLead, events: OutreachEvent[], now = new Date()): boolean {
  if (!isOpenLead(lead) || !lead.assigneeId || !lead.assignedAt) return false;
  const at = Date.parse(lead.assignedAt);
  if (!Number.isFinite(at) || at >= now.getTime() - UNTOUCHED_HOURS * 36e5) return false;
  return !events.some((e) => e.leadId === lead.id && e.actorId === lead.assigneeId && Date.parse(e.at) >= at);
}

/** The untouched leads among `leads`, the longest waiting first. */
export function untouchedLeads(leads: OutreachLead[], events: OutreachEvent[], now = new Date()): OutreachLead[] {
  const byLead = new Map<string, OutreachEvent[]>();
  for (const e of events) {
    const a = byLead.get(e.leadId);
    if (a) a.push(e);
    else byLead.set(e.leadId, [e]);
  }
  return leads
    .filter((l) => isUntouched(l, byLead.get(l.id) || [], now))
    .sort((a, b) => Date.parse(a.assignedAt as string) - Date.parse(b.assignedAt as string));
}

/** Fired on window after every outreach write, so the nav badge re-reads. */
export const OUTREACH_CHANGED = "ideovent:outreach-changed";
