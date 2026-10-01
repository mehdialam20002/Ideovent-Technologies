/**
 * IS THERE A WORKING MAILBOX BEHIND contact@ideovent.in? YES, SINCE 1 OCT 2026.
 *
 * Zoho Mail (free plan, India data centre). MX, SPF, DKIM and DMARC are on the
 * domain's Vercel DNS and Zoho verified all of them. Tested on 1 Oct 2026: two
 * outside test services (MxToolbox, Port25) answered a message sent from the
 * mailbox and both answers arrived; Port25 reported SPF pass and DKIM pass.
 *
 * While this is true, the footer, the contact blocks (home, /contact), /faq,
 * /services, /eduflow and /internship print the address from the CMS contact
 * settings, and the structured data carries it (src/lib/seo/schema.ts). Set it
 * back to false only if the mailbox stops working: every one of those places
 * then falls back to WhatsApp and the phone number.
 * (/privacy is generated from 03-legal-docs by scripts/build-legal.mjs and is
 * not switched by this flag; that script has its own MAILBOX_LIVE.)
 */
export const MAILBOX_LIVE = true;

/** The contact address to print, or null while the mailbox does not exist. */
export function liveEmail(contact: { emailDisplay?: string; emailHref?: string }): { display: string; href: string } | null {
  if (!MAILBOX_LIVE) return null;
  const display = (contact.emailDisplay || "").trim();
  const href = (contact.emailHref || "").trim() || (display ? `mailto:${display}` : "");
  return display && href ? { display, href } : null;
}

/**
 * A plain wa.me link to us, offered where the email address would have been
 * (/faq, /services). WhatsApp is the channel every page already leads with.
 */
export function whatsappInstead(number: string, text = "Hi Ideovent, I have a question."): string {
  const digits = (number || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : "";
}
