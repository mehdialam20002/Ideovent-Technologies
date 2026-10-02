import type { CrmMe } from "@/lib/outreach/team";
import type { LeadStatus } from "@/lib/outreach/types";

/**
 * WHICH STAGE MOVES A PERSON MAY MAKE (spec 4.1, 10.7), as the database's
 * field guard decides them (access.ts guardLeadUpdate; private.crm_leads_guard):
 *   - only Mehdi moves a lead to or from Proposal and Won (the price, the win);
 *   - only Mehdi takes a lead off Do not contact;
 *   - a member never moves a lead to or from Call: a call with Mehdi is a hand-over.
 * The screens disable what this refuses, with why; the database refuses it anyway.
 * Lost is allowed, with a reason for a member (LostReasonDialog). Null = allowed.
 */
export function statusRefusal(me: Pick<CrmMe, "role" | "legacy"> | null | undefined, from: LeadStatus, to: LeadStatus): string | null {
  if (from === to || !me?.role || me.role === "owner" || me.legacy) return null;
  if (to === "proposal" || to === "won" || from === "proposal" || from === "won") return "Mehdi moves a lead to Proposal and Won: hand it to him.";
  if (from === "do_not_contact") return "Only Mehdi takes a lead off Do not contact.";
  if (me.role === "member" && (to === "call" || from === "call")) return "Mehdi handles calls: use Hand to Mehdi.";
  return null;
}
