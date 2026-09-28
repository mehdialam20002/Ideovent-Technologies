import type { DemoSiteOpen } from "@/lib/cms/types";
import { OBSERVATIONS, checkSend, type SendCheck } from "@/lib/outreach/engine";
import { templatesFor, type MessageTemplate, type TemplateChannel, type TemplateStage } from "@/lib/outreach/templates";
import type { OutreachEvent, OutreachLead, OutreachSettings } from "@/lib/outreach/types";
import { dueFollowUps, hotLeads, isHotOpen, isOpenLead, opensSinceContact } from "./derive";
import { dueLabel } from "./ui";

/**
 * Pure choices behind the compose screen: which stage a lead is at, which
 * templates fit, what the lead's next step is, and the checks that keep one
 * lead's words out of another lead's message. No React here, so every screen
 * (and a reader of this file) gets the same answer.
 */

/** The stage this lead is most likely at, on this channel. */
export function suggestStage(lead: OutreachLead, sends: number): TemplateStage {
  switch (lead.status) {
    case "replied":
    case "demo_opened":
      return "after_reply";
    case "call":
      return "after_call";
    case "proposal":
      return "proposal";
    default:
      if (sends <= 0) return "first";
      if (sends === 1) return "follow_up_1";
      if (sends === 2) return "follow_up_2";
      return "follow_up_3";
  }
}

export interface RankInput {
  lead: OutreachLead;
  channel: TemplateChannel;
  stage: TemplateStage;
  settings: OutreachSettings;
  waToday: number;
  observation: string;
}

/**
 * Every template of this stage and channel that fits the lead's kind, best
 * first. "Best" means, in order: it can be sent right now (no blocker), it is
 * in the lead's language, and its pitch matches (a lead with a website gets
 * "fix your website", one without gets "we built you a site").
 */
export function rankTemplates({ lead, channel, stage, settings, waToday, observation }: RankInput): MessageTemplate[] {
  const lang = lead.language || "en";
  const pitch = lead.website ? "fix_website" : "new_website";
  const probe = { ...lead, observation };
  const score = (t: MessageTemplate) =>
    (checkSend(probe, t, channel, settings, waToday).ok ? 8 : 0) +
    langScore(t.language, lang) +
    (t.pitch === pitch ? 2 : t.pitch === "any" ? 1 : 0);
  return templatesFor({ channel, stage, kind: lead.kind })
    .map((t, i) => ({ t, s: score(t), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t);
}

/**
 * How close a template's language is to the lead's. Exact is best. Hindi and
 * Hinglish sit next to each other: a Hindi-speaking lead reads Hinglish far
 * more easily than English, and there are no e-mails in Hindi script, so a
 * 'hi' lead's suggested e-mail is the Hinglish one, not the English.
 */
function langScore(template: string, lead: string): number {
  if (template === lead) return 4;
  if ((template === "hinglish" && lead === "hi") || (template === "hi" && lead === "hinglish")) return 3;
  return 0;
}

/**
 * True when a lead's observation reads like a research note (the lead sheet's
 * buying_signal column: "curl 27 Sep 2026: HTTP 200, 46 KB") rather than a
 * sentence to say to them. Such a note is shown to Mehdi, never put in a
 * message on its own.
 */
export function looksLikeNote(text: string | undefined): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (OBSERVATIONS.some((o) => o.id === t || o.en === t || o.hinglish === t)) return false;
  // A sentence meant for them speaks to them ("your site", "aapki site"). A
  // note ABOUT them describes the page in the third person ("The footer reads
  // 'Copyright Verma Coaching Academy 2022'.") and would go out as "One thing
  // stood out: The footer reads...", so it counts as a note too. Only the
  // quoting shape (the X reads / says / shows) and a copyright line are
  // caught: "The admissions page does not open on a phone" is still a sentence.
  const toThem = /\b(you|your|yours|aap|aapki|aapka|aapke|aapko)\b/i.test(t);
  if (!toThem && (/^(the|their|its)\s+[\w\s-]{0,40}?\b(reads|says|shows|lists|displays)\b/i.test(t) || /\bcopyright\b|©/i.test(t))) return true;
  return /\bcurl\b|\bHTTP \d{3}\b|\b\d+(\.\d+)? ?(KB|MB)\b|\bheadless\b|\bgoogle (search )?for\b|returns only|\bdirector(y|ies)\b|\(checked|visible-text|\bog[: ]|\bmeta tag\b/i.test(t);
}

/** The observation a new compose starts with: the lead's own, unless it is a research note. */
export function startingObservation(lead: OutreachLead): string {
  const o = (lead.observation || "").trim();
  return o && !looksLikeNote(o) ? o : "";
}

/**
 * Other leads whose institute name appears in this text. One lead's name in
 * another lead's message is exactly the 28 Sep 2026 bug (Verma Coaching
 * Academy in every mail), so the send is blocked while it is there. Short or
 * generic names (under 8 letters) and names this lead's own name contains are
 * ignored, so "Academy" never trips it.
 */
export function otherLeadsNamed(text: string, lead: OutreachLead, leads: OutreachLead[]): OutreachLead[] {
  const hay = text.toLowerCase();
  const own = lead.instituteName.toLowerCase();
  return leads.filter((l) => {
    if (l.id === lead.id) return false;
    const n = (l.instituteName || "").trim().toLowerCase();
    return n.length >= 8 && !own.includes(n) && hay.includes(n);
  });
}

/** Checks for one template, for callers that only need the verdict. */
export function canSend(r: RankInput, t: MessageTemplate): SendCheck {
  return checkSend({ ...r.lead, observation: r.observation }, t, r.channel, r.settings, r.waToday);
}

/** What to do next for this lead, in a few plain words. `urgent` colours it. */
export function nextStep(lead: OutreachLead, opens: DemoSiteOpen[] | undefined, now = new Date()): { text: string; urgent: boolean } {
  if (!isOpenLead(lead)) return { text: lead.status === "won" ? "Client" : "Nothing to do", urgent: false };
  if (lead.lastContactedAt && isHotOpen(opensSinceContact(lead, opens)[0]?.at, now)) return { text: "Demo opened: call or message today", urgent: true };
  const due = lead.nextActionAt ? dueLabel(lead.nextActionAt, now) : "";
  const late = /late/.test(due);
  const isDue = due === "today" || late;
  switch (lead.status) {
    case "new":
      return { text: "Send the first message", urgent: false };
    case "replied":
    case "demo_opened":
      return { text: "Send the demo link", urgent: true };
    case "call":
      return { text: "Send the after-call message", urgent: isDue };
    case "proposal":
      return { text: isDue ? `Chase the proposal (${due})` : "Proposal sent", urgent: isDue };
    default:
      if (isDue) return { text: `Follow-up due ${due}`, urgent: true };
      return { text: due ? `Follow-up ${due}` : "Waiting for a reply", urgent: false };
  }
}

/**
 * Today's to-do list, in the order it pays: hot leads (demo opened since the
 * last message), follow-ups due today or late, then new leads not contacted.
 * The lead screen walks this list with "Next lead".
 */
export function todayQueue(leads: OutreachLead[], opens: DemoSiteOpen[] | undefined, now = new Date()) {
  const hot = hotLeads(leads, opens, now);
  const hotIds = new Set(hot.map((h) => h.lead.id));
  const due = dueFollowUps(leads, now).filter((l) => !hotIds.has(l.id));
  const dueIds = new Set(due.map((l) => l.id));
  const fresh = leads.filter((l) => l.status === "new" && !hotIds.has(l.id) && !dueIds.has(l.id));
  return { hot, due, fresh, all: [...hot.map((h) => h.lead), ...due, ...fresh] };
}

/** Sends already made to a lead on one channel (for the suggested stage). */
export function sendsOn(leadId: string, events: OutreachEvent[], channel: TemplateChannel): number {
  return events.filter((e) => e.leadId === leadId && e.type === "sent" && e.channel === channel).length;
}
