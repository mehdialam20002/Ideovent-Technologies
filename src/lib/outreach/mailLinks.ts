/**
 * ZOHO MAIL IN THE BROWSER (2 Oct 2026). Mehdi's mailbox, contact@ideovent.in, is on Zoho Mail's free
 * plan, India data centre: web and mobile app only, no IMAP or POP, so no desktop mail app can sign in
 * and the mailto: button opens nothing useful for him ("ek option dedo open in zoho mail").
 *
 * The link is Zoho's own compose entry, the one Chrome builds when Zoho is the mailto handler:
 *   https://mail.zoho.in/zm/comp.do?ct=<encodeURIComponent(mailto:<address>?subject=..&body=..)>
 * Checked signed out on 2 Oct 2026: it answers 302 to Zoho's sign-in with the compose kept in
 * serviceurl, and a made-up path under /zm/ answers 404, so comp.do is a real handler. Zoho's own
 * mailto parser (@zohomail/mailto-parser) takes the address before "?" only with a literal "@" and
 * never percent-decodes it, reads lowercase keys, and runs each value through decodeURIComponent: so
 * the address goes raw (it is checked first) and every value is encodeURIComponent'd ("+" would read
 * as a space). Never URLSearchParams. NOT YET SEEN SIGNED IN: that the signed-in composer opens with
 * To, Subject and the text filled is what Zoho's handler format promises, and Mehdi's first send is
 * the check; whether its rich-text editor keeps the line breaks is not confirmed either. So the button
 * also copies the body (ComposePanel), and Copy e-mail text stays beside it.
 *
 * Pure: no React, no I/O. engine.ts checkSend reads safeMailAddress; ComposePanel builds the link;
 * scripts/test-outreach-send-links.mjs checks both.
 */

export const ZOHO_MAIL_DEFAULT = "https://mail.zoho.in";
/** Past this, the link drops the body (signed-out links failed from about 6,100 characters). */
export const ZOHO_LINK_SAFE_LENGTH = 5500;

/**
 * Zoho Mail's main data centres (India, US, Europe, Australia, Japan). Anything else is refused, so a
 * mistyped setting can never post a lead's e-mail elsewhere. Kept to hosts known to be Zoho's own: a
 * host on this list that Zoho did not own would defeat the point of the list.
 */
const ZOHO_HOST = /^mail\.zoho\.(?:in|com|eu|com\.au|jp)$/i;

/**
 * An address a mail link can carry as it is: letters, digits and . _ + ' - before the @, a dotted
 * domain after it, nothing else (no space, line break, comma, ;, ?, &, =, #, %, :, < or >). "" when
 * the address has anything else, so "a@b.com?bcc=x@y.com" or one with a line break can never add a
 * header or a recipient.
 */
const SAFE_ADDRESS = /^[A-Za-z0-9._+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
export function safeMailAddress(raw: string | null | undefined): string {
  const a = String(raw ?? "").trim();
  return a.length <= 254 && !a.includes("..") && SAFE_ADDRESS.test(a) ? a : "";
}

/** The Zoho Mail origin from the setting: "https://mail.zoho.in" for blank; "" for anything not Zoho Mail. */
export function zohoMailOrigin(setting: string | null | undefined): string {
  const s = String(setting ?? "").trim();
  if (!s) return ZOHO_MAIL_DEFAULT;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return ZOHO_HOST.test(u.hostname) && !u.username && !u.password ? `https://${u.hostname.toLowerCase()}` : "";
  } catch {
    return "";
  }
}

/** A text encodeURIComponent cannot throw on: a lone surrogate (half an emoji) becomes U+FFFD. */
function wellFormed(s: string): string {
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD");
}
const enc = (s: string) => encodeURIComponent(wellFormed(s));

export interface ZohoLink {
  href: string;
  /** false: the e-mail was too long for the link, so it carries the address and the subject only. */
  withBody: boolean;
}

/** The new e-mail in Zoho Mail, filled in. null when the address cannot go in a link (checkSend blocks it too). */
export function zohoComposeLink(
  { to, subject = "", body = "" }: { to: string; subject?: string; body?: string },
  setting?: string | null,
): ZohoLink | null {
  const address = safeMailAddress(to);
  if (!address) return null;
  const base = `${zohoMailOrigin(setting) || ZOHO_MAIL_DEFAULT}/zm/comp.do?ct=`;
  const full = `${base}${encodeURIComponent(`mailto:${address}?subject=${enc(subject)}&body=${enc(body)}`)}`;
  if (full.length <= ZOHO_LINK_SAFE_LENGTH) return { href: full, withBody: true };
  return { href: `${base}${encodeURIComponent(`mailto:${address}?subject=${enc(subject)}`)}`, withBody: false };
}
