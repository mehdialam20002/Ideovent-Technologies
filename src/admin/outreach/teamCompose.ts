import { can, isEngaged, memberStages } from "@/lib/outreach/access";
import { NO_META_CONSENT, metaConsentRefused, type RenderContext, type SendCheckExtra } from "@/lib/outreach/engine";
import { memberVersion } from "@/lib/outreach/templates";
import type { CrmMe, MemberWordingKey } from "@/lib/outreach/team";
import type { OutreachEvent, OutreachLead, OutreachSettings } from "@/lib/outreach/types";
import { composedSignature } from "@/crm/me/identity";
import { PLAIN_STAGES, type PlainStage, type TemplateOffer } from "./stages";
import type { ScriptSender } from "./callScript";

/**
 * THE COMPOSE SCREEN AS ANYONE BUT MEHDI SEES IT (spec 10.7), in one pure
 * place: ComposePanel, CallScriptCard and scripts/test-crm-wording.mjs read the
 * same answers. For Mehdi (the owner, and legacy mode before 0011) every
 * function here answers "nothing to change", and his screen is as before.
 *
 *   identity   their own name, company phone and e-mail signature in every message;
 *   wording    only the templates whose sentences are true from them (templates.ts
 *              memberVersion), behind Mehdi's approval of the team wording;
 *   stages     First message, After they say yes, Follow-up and Closing for anyone
 *              who may not send the price (After the call and Proposal are Mehdi's);
 *   checks     quiet hours and Sunday block, their own first-WhatsApp limit (0 = none),
 *              and for a member WhatsApp only from the company number Mehdi checked;
 *   calls      without "May cold-call", only to people who replied or opened a demo.
 *
 * One rule here holds for Mehdi too: a lead from a Meta form who left its
 * WhatsApp-and-phone box unticked gets no call from anyone (callRefusal; the
 * engine's checkSend blocks their WhatsApp the same way).
 */

/** Anyone but Mehdi, with the team (0011): they send in their own name, by the team's rules. */
export function isTeamSender(me: CrmMe | null | undefined): boolean {
  return Boolean(me && me.role && me.role !== "owner" && !me.legacy);
}

/** A member (an intern), with the team. */
export function isMemberSender(me: CrmMe | null | undefined): boolean {
  return Boolean(me && me.role === "member" && !me.legacy);
}

/** What Mehdi approved of the team wording (Settings > Messages > Team wording). */
export function approvedWording(settings: Partial<OutreachSettings> | null | undefined): Partial<Record<MemberWordingKey, boolean>> {
  return settings?.memberWording || {};
}

/** What this sender may send of a template; undefined for Mehdi (every template, as it is). */
export function teamOffer(me: CrmMe | null | undefined, settings: Partial<OutreachSettings> | null | undefined): TemplateOffer | undefined {
  if (!isTeamSender(me)) return undefined;
  const approved = approvedWording(settings);
  return (t) => memberVersion(t, approved);
}

/** The stages the compose shows: all six for Mehdi, the four member stages for anyone who may not send the price. */
export function composeStages(me: CrmMe | null | undefined): PlainStage[] {
  return !me?.role || can(me, "stage.money") ? PLAIN_STAGES : memberStages();
}

/** Who sends: name, first name, company phone, e-mail signature (the composed default when Mehdi typed none). */
export interface TeamSender extends ScriptSender {
  phone?: string;
  signature: string;
}

export function teamSender(me: CrmMe | null | undefined): TeamSender | null {
  if (!me || !isTeamSender(me)) return null;
  const name = (me.senderName || me.displayName || "").trim() || "Ideovent Technologies";
  return {
    name,
    firstName: name.split(/\s+/)[0],
    phone: (me.senderPhone || "").trim() || undefined,
    signature: (me.signature || "").trim() || composedSignature(name, me.senderPhone),
  };
}

/** The sender part of render()'s context; null for Mehdi (his settings' signature and his name, as before). */
export function teamRenderContext(me: CrmMe | null | undefined): Pick<RenderContext, "senderName" | "senderPhone" | "signature" | "team"> | null {
  const s = teamSender(me);
  return s ? { senderName: s.name, senderPhone: s.phone, signature: s.signature, team: true } : null;
}

/** checkSend's extra for this sender: {} for Mehdi. */
export function teamCheckExtra(me: CrmMe | null | undefined): Pick<SendCheckExtra, "strict" | "whatsappLimit" | "sender"> {
  if (!me || !isTeamSender(me)) return {};
  return {
    strict: true,
    whatsappLimit: me.waDailyLimit ?? null,
    ...(me.role === "member" ? { sender: { phone: me.senderPhone, checked: me.senderChecked } } : {}),
  };
}

/** The line shown where a call would be, for a member without "May cold-call" on a lead that has not replied. */
export const CALLS_ONLY_ENGAGED = "Calls only to people who replied (TRAI). Ask Mehdi to turn cold calls on for you.";

/**
 * Why this person may not call this lead now, or "" when they may. Shown where
 * the call would be (the Call button, Call done, the call script, the number).
 *   - A lead from a Meta form who left its WhatsApp-and-phone box unticked is
 *     called by nobody, Mehdi included (NO_META_CONSENT, DPDP; e-mail is open).
 *   - Otherwise cold calls need "May cold-call"; without it, only people who
 *     replied or opened a demo (CALLS_ONLY_ENGAGED, TRAI).
 */
export function callRefusal(me: CrmMe | null | undefined, lead: OutreachLead, events: OutreachEvent[]): string {
  if (metaConsentRefused(lead)) return NO_META_CONSENT;
  return can(me, "call.cold") || isEngaged(lead, events) ? "" : CALLS_ONLY_ENGAGED;
}

/** May this person call this lead now? callRefusal says why not. */
export function mayCall(me: CrmMe | null | undefined, lead: OutreachLead, events: OutreachEvent[]): boolean {
  return !callRefusal(me, lead, events);
}
