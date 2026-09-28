import type { DemoSiteOpen } from "@/lib/cms/types";
import type { OutreachEvent, OutreachLead, LeadStatus } from "@/lib/outreach/types";
import { getTemplate } from "@/lib/outreach/templates";

/**
 * Pure readings of the outreach data. Nothing here writes or renders, so the
 * Today tab, the nav badge and the e2e script all agree on what "due" and
 * "hot" mean.
 */

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
 * Cold FIRST WhatsApp messages sent today: what the playbook's daily cap
 * counts (WHATSAPP-PLAYBOOK.md 1.2), and what checkSend() is given.
 */
export function firstWhatsappToday(events: OutreachEvent[], now = new Date()): number {
  const day = now.toDateString();
  return events.filter(
    (e) =>
      e.type === "sent" &&
      e.channel === "whatsapp" &&
      new Date(e.at).toDateString() === day &&
      getTemplate(e.templateId)?.stage === "first",
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

/** Fired on window after every outreach write, so the nav badge re-reads. */
export const OUTREACH_CHANGED = "ideovent:outreach-changed";
