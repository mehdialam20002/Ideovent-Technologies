/**
 * OUR WORDS on the Treatments index and the treatment page (PAGES-A,
 * 28 Sep 2026). Every line is a `{ en, hi }` literal so the language checker
 * (scripts/check-demo-language.mjs) sees it. The exact compliance strings
 * are NOT here: they come from the kit's DISCLAIMER (copy.ts), never
 * paraphrased. No em dashes, no "best", "painless", "guaranteed", "free".
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export const TX_COPY = {
  /* Index */
  indexEyebrow: { en: "Treatments", hi: "इलाज" },
  indexTitle: { en: "Every treatment, *explained plainly*", hi: "हर इलाज, *सीधी भाषा में*" },
  indexLead: {
    en: "Each treatment has its own page: what it involves, how many visits it takes, recovery, and a starting price where one applies.",
    hi: "हर इलाज का अपना पेज है: इसमें क्या होता है, कितनी बार आना होगा, ठीक होने में कितना समय लगता है, और जहाँ लागू हो वहाँ शुरुआती दाम।",
  },
  filterLabel: { en: "Show treatments for", hi: "ये इलाज दिखाएँ" },
  all: { en: "All", hi: "सभी" },
  count: { en: "{n} treatments", hi: "{n} इलाज" },
  countOne: { en: "1 treatment", hi: "1 इलाज" },
  featured: { en: "Most asked about", hi: "सबसे ज़्यादा पूछे जाने वाले" },
  notSureTitle: { en: "Not sure what you need?", hi: "पता नहीं कौन सा इलाज चाहिए?" },
  notSureBody: {
    en: "Tell us what you are feeling. The dentist examines you, explains the options and gives you a written estimate before anything starts.",
    hi: "हमें बताइए कि क्या तकलीफ़ है। डेंटिस्ट जाँच करके विकल्प समझाएँगे और कुछ भी शुरू होने से पहले लिखित अनुमान देंगे।",
  },
  notSureCta: { en: "Book a check-up", hi: "चेक-अप बुक करें" },
  seeFees: { en: "See all fees and EMI", hi: "सभी फ़ीस और EMI देखें" },
  closingTitle: { en: "Book a check-up or a consultation", hi: "चेक-अप या परामर्श बुक करें" },
  pricesTitle: { en: "About the prices", hi: "दामों के बारे में" },

  /* Treatment page */
  onThisPage: { en: "On this page", hi: "इस पेज पर" },
  what: { en: "What it is", hi: "यह क्या है" },
  signs: { en: "Signs you may need it", hi: "किन संकेतों पर ज़रूरत हो सकती है" },
  who: { en: "Who it suits", hi: "यह किसके लिए है" },
  steps: { en: "How the treatment goes", hi: "इलाज कैसे होता है" },
  timeTitle: { en: "Time and recovery", hi: "समय और रिकवरी" },
  duration: { en: "Duration", hi: "कुल समय" },
  visits: { en: "Visits", hi: "विज़िट" },
  recovery: { en: "Recovery", hi: "रिकवरी" },
  comfort: { en: "What you will feel", hi: "आपको कैसा महसूस होगा" },
  cost: { en: "Cost", hi: "ख़र्च" },
  cases: { en: "Before and after", hi: "पहले और बाद में" },
  casesLead: {
    en: "What this treatment can involve. The clinic shows its own cases here only with the patient's written consent.",
    hi: "इस इलाज में क्या हो सकता है। क्लिनिक अपने केस यहाँ केवल मरीज़ की लिखित सहमति से दिखाता है।",
  },
  casesAll: { en: "See the before and after gallery", hi: "पहले और बाद की गैलरी देखें" },
  placeholderTitle: { en: "Where a consented case of {treatment} will appear", hi: "{treatment} का सहमति वाला केस यहाँ दिखेगा" },
  faqs: { en: "Questions patients ask", hi: "मरीज़ों के सवाल" },
  compare: { en: "Compare the options", hi: "विकल्पों की तुलना" },
  team: { en: "Who treats you", hi: "आपका इलाज कौन करेगा" },
  related: { en: "Related treatments", hi: "इससे जुड़े इलाज" },
  allTreatments: { en: "All treatments", hi: "सभी इलाज" },
  bookThis: { en: "Book a consultation", hi: "परामर्श बुक करें" },
  askWhatsapp: { en: "Ask on WhatsApp", hi: "WhatsApp पर पूछें" },
  bandTitle: { en: "Talk to us about {treatment}", hi: "{treatment} के बारे में हमसे बात करें" },
  bandLead: {
    en: "A consultation first: the dentist examines you, explains the plan and the cost, and you decide.",
    hi: "पहले परामर्श: डेंटिस्ट जाँच करते हैं, योजना और ख़र्च समझाते हैं, फिर फ़ैसला आपका।",
  },
  summaryTitle: { en: "At a glance", hi: "एक नज़र में" },
} as const satisfies Record<string, Bilingual>;
