import { prettyPhone } from "@/admin/outreach/ui";
import { whatsappDigits, whatsappUrl } from "@/lib/outreach/engine";

/**
 * WHO A PERSON'S MESSAGES SAY THEY ARE (spec 5.2, 10.2, 10.7). One place for
 * the Me page and Set up this phone (here), the Team page's Add person
 * preview (src/crm/team) and the member compose (ComposePanel), so the three
 * never drift. No React in this file: importing it pulls in no screen.
 */

/**
 * The e-mail signature when Mehdi has typed none for this person: name, firm
 * and place on one line, the company phone on the next (spec 10.2). For
 * Mehdi's own row it is exactly engine.ts DEFAULT_SIGNATURE.
 */
export function composedSignature(name: string, phone?: string | null): string {
  return [`${name}, Ideovent Technologies, Saket, New Delhi`, phone ? prettyPhone(phone) : ""].filter(Boolean).join("\n");
}

/** The test message a person sends Mehdi from their company phone (spec 5.2 step 4). */
export function phoneTestText(name: string): string {
  return `Test from ${name}'s CRM phone`;
}

/**
 * A wa.me link with the text typed: the same digits the compose's WhatsApp
 * links use (engine.ts whatsappUrl), so "Send a test to Mehdi" and "Tell
 * Mehdi on WhatsApp" reach one number. "" when there is no usable number.
 */
export function waLink(phone: string | undefined | null, text: string): string {
  return whatsappDigits(phone) ? whatsappUrl(phone || "", text) : "";
}
