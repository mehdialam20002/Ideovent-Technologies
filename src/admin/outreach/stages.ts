import { FOLLOW_UP_DAYS } from "@/lib/outreach/engine";
import { previewFor } from "@/lib/outreach/preview";
import { STAGE_LABELS, getTemplate, templatesFor, type MessageTemplate, type TemplateChannel, type TemplateStage } from "@/lib/outreach/templates";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";

/**
 * THE SIX STAGES MEHDI SEES (30 Sep 2026: "ye sb msz templetes ko ache se harr
 * stage ke liye daal do"). The engine's stages (templates.ts TemplateStage) are
 * grouped under six plain names, in the order the approved messages
 * (04-sales-kit/APPROVED-MESSAGES-2026-09-30.md) walk a lead:
 *
 *   First message        first         to someone who has not heard from us: the checked
 *                                       problem, the sample, one question, an easy no, no link
 *                                       but, on WhatsApp to a clinic, school or coaching
 *                                       institute, the kind's picture link (1 Oct 2026), or
 *                                       With link their sample's own link (2 Oct 2026)
 *   After they say yes   after_reply   the sample link, the honest line, two call times
 *   Follow-up            follow_up_1/2 no reply: WhatsApp once; e-mail as replies in the thread
 *   After the call       after_call    the same day: what was agreed, in writing
 *   Proposal             proposal      the proposal by e-mail, then one chase
 *   Closing              follow_up_3   the last message: close the file, leave the door open
 *
 * A stage the engine adds later lands in one of the six by its id and label
 * (plainStageOf), so it shows on the lead page without a change here. Pure: no
 * React, so the compose screen, Today and a test read the same answer.
 */
export type PlainStage = "first" | "after_yes" | "follow_up" | "after_call" | "proposal" | "closing";

export const PLAIN_STAGES: PlainStage[] = ["first", "after_yes", "follow_up", "after_call", "proposal", "closing"];

export const PLAIN_STAGE_LABELS: Record<PlainStage, string> = {
  first: "First message",
  after_yes: "After they say yes",
  follow_up: "Follow-up",
  after_call: "After the call",
  proposal: "Proposal",
  closing: "Closing",
};

const KNOWN: Record<string, PlainStage> = {
  first: "first",
  after_reply: "after_yes",
  after_yes: "after_yes",
  follow_up_1: "follow_up",
  follow_up_2: "follow_up",
  follow_up_3: "closing",
  break_up: "closing",
  closing: "closing",
  after_call: "after_call",
  proposal: "proposal",
};

/** Which of the six a stage of the engine belongs to. */
export function plainStageOf(stage: string | undefined | null): PlainStage {
  const s = String(stage || "");
  if (KNOWN[s]) return KNOWN[s];
  const words = `${s} ${(STAGE_LABELS as Record<string, string>)[s] ?? ""}`.toLowerCase();
  if (/clos|break|last/.test(words)) return "closing";
  if (/propos/.test(words)) return "proposal";
  if (/call/.test(words)) return "after_call";
  if (/repl|yes|link|permission/.test(words)) return "after_yes";
  if (/first|cold|intro/.test(words)) return "first";
  return "follow_up";
}

/** Every stage the engine has, in its own order. */
export function engineStages(): TemplateStage[] {
  return Object.keys(STAGE_LABELS) as TemplateStage[];
}

/** The engine's stages under one plain name, in order (Follow-up: follow_up_1, follow_up_2). */
export function engineStagesOf(plain: PlainStage): TemplateStage[] {
  return engineStages().filter((s) => plainStageOf(s) === plain);
}

/**
 * True for a template kept only so old history still names it: the approved
 * set has one WhatsApp follow-up, and the extra ones stay resolvable for the
 * sends already logged, never offered again. Read from whichever flag the
 * template carries.
 */
export function isRetired(t: MessageTemplate): boolean {
  const x = t as MessageTemplate & { retired?: boolean; suggest?: boolean; hidden?: boolean };
  return Boolean(x.retired || x.hidden || x.suggest === false);
}

/**
 * What a sender may send of a template: the template itself (Mehdi), or for
 * anyone else its team version, or null when it is not theirs to send
 * (templates.ts memberVersion: money stages, wording not approved yet).
 */
export type TemplateOffer = (t: MessageTemplate) => MessageTemplate | null;

/** Templates the sender can pick for this channel, stage and kind (never a retired one). `offer`: anyone but Mehdi. */
export function offered(channel: TemplateChannel, stage: TemplateStage, kind: OutreachLead["kind"] | undefined, offer?: TemplateOffer): MessageTemplate[] {
  const all = templatesFor({ channel, stage, kind: kind || undefined }).filter((t) => !isRetired(t));
  return offer ? all.map(offer).filter((t): t is MessageTemplate => Boolean(t)) : all;
}

/**
 * The engine's stages that have at least one message on this channel for this
 * kind. With `offer`, the ones this sender may send (the ladder itself, ladderFor,
 * stays the same for everyone: the cadence does not change with the sender).
 */
export function stagesWithMessages(channel: TemplateChannel, kind: OutreachLead["kind"] | undefined, offer?: TemplateOffer): TemplateStage[] {
  return engineStages().filter((s) => offered(channel, s, kind, offer).length > 0);
}

/**
 * The no-reply ladder on one channel, after the first message: the follow-ups
 * and the closing message that exist for it. WhatsApp: the one follow-up.
 * E-mail: the follow-ups and the closing e-mail.
 */
export function ladderFor(channel: TemplateChannel, kind: OutreachLead["kind"] | undefined): TemplateStage[] {
  return stagesWithMessages(channel, kind).filter(isLadder);
}

function isLadder(stage: string): boolean {
  const p = plainStageOf(stage);
  return p === "follow_up" || p === "closing";
}

/** The first engine stage under a plain name ("after_yes" is after_reply today). */
export function stageFor(plain: PlainStage): TemplateStage {
  return engineStagesOf(plain)[0] ?? ("first" as TemplateStage);
}

/**
 * The day after the first message on which a no-reply stage is due, read from
 * the engine's cadence (FOLLOW_UP_DAYS), so the labels move with it: with 4, 5
 * and 7 days the e-mails read day 4, day 9 and day 16.
 */
export function dayOf(stage: TemplateStage): number | null {
  let day = 0;
  let prev = "first" as TemplateStage;
  for (const s of engineStages().filter(isLadder)) {
    day += Number((FOLLOW_UP_DAYS as Record<string, number>)[prev] ?? 0);
    if (s === stage) return day > 0 ? day : null;
    prev = s;
  }
  return null;
}

/** "First message", "Follow-up, day 4", "Closing, day 16". */
export function stageName(stage: TemplateStage): string {
  const plain = plainStageOf(stage);
  const day = isLadder(stage) ? dayOf(stage) : null;
  return day ? `${PLAIN_STAGE_LABELS[plain]}, day ${day}` : PLAIN_STAGE_LABELS[plain];
}

const days = (stages: TemplateStage[]) => stages.map(dayOf).filter((d): d is number => d !== null);

/**
 * One line under the stage buttons: when this stage is used, and the rule that
 * holds in it. `team`: anyone but Mehdi, who hands a yes to him (spec 10.7).
 */
export function stageHint(plain: PlainStage, channel: TemplateChannel, kind: OutreachLead["kind"] | undefined, team = false): string {
  if (team && plain === "after_yes") {
    return "They said yes: hand the lead to Mehdi now, and he sends the call times. A yes given on a call: the sample link within five minutes, with no call times.";
  }
  const ladder = ladderFor(channel, kind);
  const fu = days(ladder.filter((s) => plainStageOf(s) === "follow_up"));
  const close = days(ladder.filter((s) => plainStageOf(s) === "closing"));
  switch (plain) {
    case "first":
      // On WhatsApp a clinic, school or coaching institute also gets its picture, or With link their sample's own link
      // (2 Oct 2026): the one link a first message may carry. The hint has no `me`, so it names the switch, not a promise.
      if (channel === "email") {
        return "To someone who has not heard from you, in short parts: the one problem you checked today, what it costs them, the sample in three points, With link the link to their sample, one question and an easy no. With no demo yet, no link: it offers to make one.";
      }
      return previewFor(kind)
        ? "To someone who has not heard from you, in short parts: who you are, the one problem you checked today, what it costs them, the sample in three points, then the picture link, or With link their sample's own link, one question and an easy no."
        : "To someone who has not heard from you, in short parts: who you are, the one problem you checked today, what it costs them, the sample in three points, their sample's link if you switch to With link, one question and an easy no.";
    case "after_yes":
      return "They said yes: the full sample link on its own line, the true lines that it is a demonstration, and two times for a 10-minute call. Within the hour.";
    case "follow_up":
      if (!fu.length) return `No follow-up on ${channel === "email" ? "e-mail" : "WhatsApp"} for this lead.`;
      return channel === "whatsapp"
        ? `No reply: one follow-up, ${fu[0]} days after the first message, and it is the last WhatsApp. Then e-mail, call or stop.`
        : `No reply: a short e-mail on day ${fu.join(" and day ")}, each sent as a reply in the same thread.`;
    case "after_call":
      return "The same day as the call: package and price, payment, what you need from them and the date of the first version. Fill every [blank] first.";
    case "proposal":
      return "The proposal goes by e-mail with the PDF attached, then one chase.";
    case "closing":
      if (!close.length) return channel === "whatsapp" ? "On WhatsApp the one follow-up is already the last message. Close by e-mail, or stop." : "No closing message on this channel.";
      return `No reply after the follow-ups: one last e-mail on day ${close[0]} that closes the file politely. Then stop.`;
  }
}

export interface StageSuggestion {
  stage: TemplateStage;
  /** Set when the no-reply messages on this channel are used up: what to do instead. */
  done?: string;
}

/** A lead at Call or Proposal, seen by a member: the call and the price are Mehdi's. */
export const MEHDIS_NOW = "This lead is at the call or the proposal: Mehdi sends what comes next. If they write to you, hand it to him.";

/**
 * The stage this lead is at on this channel. A reply, a call or a proposal
 * decides it; otherwise the no-reply sends already made on this channel (a
 * link sent after a yes is not a follow-up) walk the ladder: none, the first
 * message; one, the first follow-up; and so on. Past the end of the ladder the
 * answer says so, instead of offering one more message than the rules allow.
 */
export function suggestFor(lead: OutreachLead, events: OutreachEvent[], channel: TemplateChannel, opts: { member?: boolean } = {}): StageSuggestion {
  if (lead.status === "replied" || lead.status === "demo_opened") return { stage: stageFor("after_yes") };
  // After the call and Proposal carry the price: never a member's stage (spec 10.7). Such a lead is Mehdi's to send to.
  if (opts.member && (lead.status === "call" || lead.status === "proposal")) {
    return { stage: stageFor("after_yes"), done: MEHDIS_NOW };
  }
  if (lead.status === "call") return { stage: stageFor("after_call") };
  if (lead.status === "proposal") return { stage: stageFor("proposal") };
  const cold = events.filter((e) => {
    if (e.leadId !== lead.id || e.type !== "sent" || e.channel !== channel) return false;
    const st = getTemplate(e.templateId)?.stage;
    return !st || st === "first" || isLadder(st);
  }).length;
  if (!cold) return { stage: stageFor("first") };
  const ladder = ladderFor(channel, lead.kind);
  if (ladder[cold - 1]) return { stage: ladder[cold - 1] };
  return {
    stage: ladder[ladder.length - 1] ?? stageFor("follow_up"),
    done:
      channel === "whatsapp"
        ? "The first message and the one WhatsApp follow-up have gone. Send nothing more on WhatsApp: e-mail, call, or leave it."
        : "The closing e-mail has gone. Leave it unless they write back.",
  };
}
