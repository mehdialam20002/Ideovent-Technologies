import type { AskTopic } from "@/lib/outreach/team";
import { CRM_ORIGIN, crmOriginUrl } from "@/lib/host";
import { CRM } from "../nav";

/**
 * "TELL MEHDI ON WHATSAPP" (spec 10.7, 10.8): until the CRM sends e-mail
 * (phase 3), a member reaches Mehdi with the CRM closed through a wa.me link
 * to his own number, typed for them. The text names the person, the
 * institute and the lead's CRM address, and never a phone, e-mail or contact
 * name: the link opens the lead for Mehdi, the CRM shows him the rest.
 */

/** The lead's address in the CRM: on crm.ideovent.in when VITE_CRM_URL says so, else on this site. */
export function crmLeadUrl(id: string): string {
  const path = CRM.lead(id);
  if (CRM_ORIGIN) return crmOriginUrl(path);
  try {
    return `${window.location.origin}${path}`;
  } catch {
    return path;
  }
}

/** "Asha: Example Dental Clinic handed over: https://crm.ideovent.in/leads/ol_1". */
export function handoverText(name: string, institute: string, leadId: string, qualified = true): string {
  return `${name}: ${institute} ${qualified ? "handed over" : "given back"}: ${crmLeadUrl(leadId)}`;
}

const ASKED: Record<AskTopic, string> = { demo: "needs a demo", correction: "has a correction", question: "has a question" };

/** "Asha: Example Dental Clinic needs a demo: https://crm.ideovent.in/leads/ol_1". */
export function askText(name: string, institute: string, leadId: string, topic: AskTopic): string {
  return `${name}: ${institute} ${ASKED[topic]}: ${crmLeadUrl(leadId)}`;
}

/*
 * A hand-over moves the lead to Mehdi, so it leaves a member's list at once and
 * the lead page they are on turns into the read-only card. The card still
 * offers "Tell Mehdi on WhatsApp": this tab remembers the text (memory only).
 */
const handed = new Map<string, string>();
export function rememberHandover(leadId: string, text: string): void {
  handed.set(leadId, text);
}
export function forgetHandover(leadId: string): void {
  handed.delete(leadId);
}
export function handedOverText(leadId: string): string | undefined {
  return handed.get(leadId);
}
