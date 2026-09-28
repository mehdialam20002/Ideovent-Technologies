/**
 * The hero's own words, in both languages (the HOME builder's, 28 Sep 2026).
 * Kept beside copy.ts so the shared file stays one owner's. No em dashes, no
 * superlatives, no offers. `{x}` is filled with trf().
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export const HERO_COPY = {
  kidsBook: { en: "Book your child's visit", hi: "बच्चे की विज़िट बुक करें" },
  waPrefer: { en: "Prefer WhatsApp? Message us", hi: "WhatsApp पसंद है? हमें मैसेज करें" },
  waText: { en: "or WhatsApp us", hi: "या WhatsApp करें" },
  discover: { en: "Discover", hi: "आगे देखें" },
  reviewsOn: { en: "from {count} reviews", hi: "{count} रिव्यू से" },
  ratingOn: { en: "Google rating", hi: "Google रेटिंग" },
  bookSlot: { en: "Tap to book", hi: "बुक करने के लिए टैप करें" },
  notSure: { en: "Not sure? Tell us the problem", hi: "पक्का नहीं? हमें समस्या बताइए" },
  chooseClinic: { en: "Choose your nearest clinic", hi: "अपना नज़दीकी क्लिनिक चुनें" },
  findClinic: { en: "Find clinic", hi: "क्लिनिक खोजें" },
  clinicLabel: { en: "Clinic", hi: "क्लिनिक" },
  leadBy: { en: "Led by {name}", hi: "{name} के नेतृत्व में" },
  heroPhoto: { en: "Inside the clinic", hi: "क्लिनिक के अंदर" },
} as const satisfies Record<string, Bilingual>;
