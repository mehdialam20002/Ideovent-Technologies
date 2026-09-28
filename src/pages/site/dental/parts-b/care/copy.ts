/**
 * OUR WORDS on the Kids and Emergency pages (28 Sep 2026). `{ en, hi }`
 * literals so the language checker sees them. Compliance strings come from
 * the kit's DISCLAIMER and BOOKING_COPY, never paraphrased here. Parent-first
 * voice on Kids (DENTAL-COMPLIANCE.md: no prizes, no camps); no promises on
 * Emergency beyond "same-day slots depend on availability".
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export const KIDS_COPY = {
  eyebrow: { en: "Kids dentistry", hi: "बच्चों के दाँतों का इलाज" },
  title: { en: "Happy visits from the *first tooth*", hi: "पहले दाँत से ही *ख़ुशी-ख़ुशी* डेंटिस्ट के पास" },
  lead: {
    en: "Unhurried check-ups for babies, children and pre-teens, with a parent in the room and every step explained before it happens.",
    hi: "बच्चों, छोटे बच्चों और किशोरों के लिए आराम से चेक-अप, कमरे में माता-पिता साथ, और हर क़दम पहले से समझाया जाता है।",
  },
  book: { en: "Book your child's visit", hi: "बच्चे की विज़िट बुक करें" },
  firstVisit: { en: "The first visit, step by step", hi: "पहली विज़िट, क़दम दर क़दम" },
  firstVisitLead: {
    en: "Most first visits take about 30 minutes. Nothing is done that your child is not ready for.",
    hi: "ज़्यादातर पहली विज़िट लगभग 30 मिनट की होती है। बच्चा जिसके लिए तैयार नहीं, वह नहीं किया जाता।",
  },
  ages: { en: "Care by age", hi: "उम्र के हिसाब से देखभाल" },
  prevention: { en: "Prevention that works", hi: "बचाव जो काम आता है" },
  preventionLead: {
    en: "Most tooth decay in children can be prevented. These are the simple things we check and explain at every visit.",
    hi: "बच्चों में ज़्यादातर कीड़ा लगना रोका जा सकता है। ये आसान बातें हम हर विज़िट पर जाँचते और समझाते हैं।",
  },
  habits: { en: "Habits we can help with", hi: "आदतें जिनमें हम मदद कर सकते हैं" },
  comfort: { en: "How we keep visits calm", hi: "विज़िट को सहज कैसे रखते हैं" },
  special: { en: "Children who need extra care", hi: "जिन बच्चों को ख़ास देखभाल चाहिए" },
  dentist: { en: "Your child's dentist", hi: "आपके बच्चे के डेंटिस्ट" },
  knocked: { en: "If a tooth is knocked out", hi: "अगर दाँत टूटकर निकल जाए" },
  knockedLink: { en: "All emergency first aid", hi: "इमरजेंसी की पूरी प्राथमिक सहायता" },
  faq: { en: "Questions parents ask", hi: "माता-पिता के सवाल" },
  band: { en: "Book your child's first check-up", hi: "बच्चे का पहला चेक-अप बुक करें" },
} as const satisfies Record<string, Bilingual>;

export const ER_COPY = {
  eyebrow: { en: "Dental emergency", hi: "दाँत की इमरजेंसी" },
  title: { en: "Tooth pain? Same-day emergency appointments", hi: "दाँत में दर्द? उसी दिन इमरजेंसी अपॉइंटमेंट" },
  lead: {
    en: "Call or WhatsApp and tell us what happened. We will tell you how soon to come and what to do until then.",
    hi: "कॉल या WhatsApp करके बताइए क्या हुआ। हम बताएँगे कि कितनी जल्दी आना है और तब तक क्या करना है।",
  },
  book: { en: "Request an urgent slot", hi: "जल्दी का समय माँगें" },
  hospital: { en: "When to go to a hospital instead", hi: "कब सीधे अस्पताल जाएँ" },
  urgent: { en: "Call us today if you have", hi: "आज ही कॉल करें अगर" },
  canWait: { en: "Usually fine for a regular appointment", hi: "आम तौर पर सामान्य अपॉइंटमेंट में ठीक" },
  bookRegular: { en: "Book a regular visit", hi: "सामान्य विज़िट बुक करें" },
  firstAid: { en: "First aid until you reach us", hi: "हमारे पास पहुँचने तक प्राथमिक सहायता" },
  reach: { en: "Finding us", hi: "हम तक कैसे पहुँचें" },
  band: { en: "Not an emergency? Book a regular visit", hi: "इमरजेंसी नहीं है? सामान्य विज़िट बुक करें" },
} as const satisfies Record<string, Bilingual>;
