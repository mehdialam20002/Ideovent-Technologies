/**
 * The call to action, and the terms that go under it.
 *
 * Shared by both pitch designs, because these are the two things that must not
 * differ between them: how a prospect reaches us, and what we have committed
 * to. The ARGUMENT each page makes is its own (see ./international.ts for the
 * other one); the phone number and the payment split are not.
 *
 * Everything here is copied from `_assets/FACTS.md`. Nothing is derived, and
 * nothing is rounded. `./record.ts` owns the price table for the same reason.
 */

import type { PitchPage } from "@/lib/cms/types";

/**
 * The place, as it should read inside a message somebody is about to send.
 *
 * `pitchPlace` in ./record joins city, state and country, which is what a
 * printed proposal header wants. A WhatsApp opener is a sentence a person is
 * putting their own name to, and "Example Public School, New Delhi, Delhi,
 * India" is a sentence no person writes. So a state that the city already
 * carries is dropped ("New Delhi, Delhi"), and so is the country when it is
 * India, because both ends of that conversation are in India. A country that
 * is doing real work, "Manchester, United Kingdom", is kept.
 */
function messagePlace(page: Pick<PitchPage, "city" | "state" | "country">): string {
  const city = (page.city || "").trim();
  const state = (page.state || "").trim();
  const country = (page.country || "").trim();
  const parts: string[] = [];
  if (city) parts.push(city);
  if (state && !(city && (city.toLowerCase().includes(state.toLowerCase()) || state.toLowerCase().includes(city.toLowerCase())))) {
    parts.push(state);
  }
  if (country && country.toLowerCase() !== "india") parts.push(country);
  return parts.join(", ");
}

/* ── Ideovent's own details ──────────────────────────────────────────────── */

/** Digits only, as wa.me wants them. +91 77619 21786. */
export const IDEOVENT_WHATSAPP = "917761921786";
export const IDEOVENT_PHONE_DISPLAY = "+91 77619 21786";
export const IDEOVENT_PHONE_HREF = "tel:+917761921786";
export const IDEOVENT_EMAIL = "contact@ideovent.in";
export const IDEOVENT_CITY = "Saket, New Delhi";

/* ── Commercial terms, identical on every page because they are contractual ── */

/* 1 Oct 2026 (Mehdi): 50% advance and 50% at launch, in India and abroad.
   Was "50% to start, 30% at the design and build milestone, 20% before handover". */
export const PAYMENT_SPLIT = "50% to start, 50% at launch";
export const REVISION_ROUNDS = "Two revision rounds at every design stage";
export const SUPPORT_WINDOW = "30 days of free support after launch";
/**
 * Worth saying out loud on an Indian pitch page. Ideovent is not registered
 * under GST, so the quoted figure is the figure paid: a buyer comparing three
 * quotes is otherwise mentally adding 18% to all of them.
 */
export const GST_POSITION =
  "GST is not applicable. Ideovent Technologies is not registered under GST, so the figure above is the figure you pay.";
export const CODE_OWNERSHIP = "The source code transfers to you on final payment.";

/* ── Calls to action ─────────────────────────────────────────────────────── */

/**
 * The prefilled WhatsApp message, written from THEIR side of the conversation.
 *
 * It names the institute and the place, so the message that lands on Mehdi's
 * phone identifies the sender before he opens it, and so the sender does not
 * have to type a word on a phone keyboard to start a conversation. That second
 * part is the entire reason WhatsApp beats a form on this page.
 *
 * Hinglish, because this is the India page's microcopy and it is how a Delhi
 * reader would actually open the message. Everything else on the page is
 * English. Nothing here is machine-translated.
 */
export function pitchWhatsappText(page: Pick<PitchPage, "instituteName" | "city" | "state" | "country" | "directorName">): string {
  const place = messagePlace(page);
  const where = place ? `, ${place}` : "";
  const who = page.directorName ? `${page.directorName}, ` : "";
  return (
    `Namaste Ideovent team. ${who}${page.instituteName}${where}. ` +
    `Aapka page dekha. Humein website ke baare mein baat karni hai.`
  );
}

export function pitchWhatsappHref(page: Parameters<typeof pitchWhatsappText>[0]): string {
  return `https://wa.me/${IDEOVENT_WHATSAPP}?text=${encodeURIComponent(pitchWhatsappText(page))}`;
}

/**
 * A mailto with the subject and the first line already written.
 *
 * Email is the third call to action and it earns its place for one reason: a
 * director forwards this page to a trustee or a committee, and that reader
 * wants an address to reply to, not a button.
 */
export function pitchEmailHref(page: Pick<PitchPage, "instituteName" | "city" | "state" | "country">): string {
  const place = messagePlace(page);
  const subject = `Website for ${page.instituteName}${place ? `, ${place}` : ""}`;
  const body =
    `Hello Ideovent,\n\n` +
    `We are ${page.instituteName}${place ? `, ${place}` : ""}. We have seen the page you prepared ` +
    `for us and would like to discuss it.\n\n`;
  return `mailto:${IDEOVENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
