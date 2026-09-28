/**
 * OUR WORDS, part two: Before and after, FAQ, Guides and a guide. Same rules
 * as ./copy.ts: both languages, no em dashes, disclaimers from the kit.
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export const PB2 = {
  /* Before and after */
  baTitle: { en: "What treatment can involve", hi: "इलाज में क्या-क्या हो सकता है" },
  baLead: { en: "Cases are shared for information, with each patient's written consent. Every mouth is different, so your dentist explains what to expect for you.", hi: "केस जानकारी के लिए, हर मरीज़ की लिखित सहमति से साझा किए जाते हैं। हर मुँह अलग होता है, इसलिए डेंटिस्ट आपको आपके लिए उम्मीद बताते हैं।" },
  consentTitle: { en: "How cases are shown", hi: "केस कैसे दिखाए जाते हैं" },
  c1t: { en: "Written consent", hi: "लिखित सहमति" },
  c1b: { en: "Each patient agrees in writing to website use, and can withdraw it at any time.", hi: "हर मरीज़ वेबसाइट पर उपयोग के लिए लिखित सहमति देता है, और कभी भी वापस ले सकता है।" },
  c2t: { en: "Teeth and lips only", hi: "केवल दाँत और होंठ" },
  c2b: { en: "Photos are cropped to the smile, with no eyes and no names.", hi: "तस्वीरें मुस्कान तक काटी जाती हैं, न आँखें, न नाम।" },
  c3t: { en: "Unretouched", hi: "बिना एडिट" },
  c3b: { en: "Before and after photos are taken in similar light, without editing.", hi: "पहले और बाद की तस्वीरें एक जैसी रोशनी में, बिना एडिट के ली जाती हैं।" },
  c4t: { en: "Treatment and time", hi: "इलाज और समय" },
  c4b: { en: "Each case names the treatment and how long it took.", hi: "हर केस में इलाज और उसमें लगा समय लिखा होता है।" },
  byTreatment: { en: "Treatment", hi: "इलाज" },
  byConcern: { en: "Concern", hi: "समस्या" },
  all: { en: "All", hi: "सभी" },
  illustration: { en: "Illustration", hi: "चित्र" },
  duration: { en: "Duration", hi: "समय" },
  concern: { en: "Concern", hi: "समस्या" },
  noCases: { en: "No cases in this group yet.", hi: "इस समूह में अभी कोई केस नहीं है।" },
  baBook: { en: "Wondering what would suit you?", hi: "जानना चाहते हैं कि आपके लिए क्या ठीक रहेगा?" },
  viewTreatment: { en: "About this treatment", hi: "इस इलाज के बारे में" },

  /* FAQ */
  faqTitle: { en: "Questions patients ask", hi: "मरीज़ों के आम सवाल" },
  faqLead: { en: "Plain answers about visits, treatment, fees and booking.", hi: "आने, इलाज, फीस और बुकिंग के बारे में सीधे जवाब।" },
  search: { en: "Search the questions", hi: "सवाल खोजें" },
  noResults: { en: "No question matches. Try another word, or ask the clinic on WhatsApp.", hi: "कोई सवाल नहीं मिला। कोई और शब्द आज़माएँ, या क्लिनिक से WhatsApp पर पूछें।" },
  general: { en: "General", hi: "सामान्य" },
  askTitle: { en: "Still have a question?", hi: "अब भी कोई सवाल है?" },
  askBody: { en: "Ask the clinic on WhatsApp, or call during opening hours.", hi: "क्लिनिक से WhatsApp पर पूछें, या खुलने के समय में कॉल करें।" },
  topics: { en: "Topics", hi: "विषय" },

  /* Guides */
  blogTitle: { en: "Guides for patients", hi: "मरीज़ों के लिए जानकारी" },
  blogLead: { en: "Short, plain guides to common treatments, each reviewed by a dentist.", hi: "आम इलाज पर छोटी, आसान जानकारी, हर एक डेंटिस्ट द्वारा जाँची गई।" },
  minRead: { en: "{n} min read", hi: "{n} मिनट" },
  readGuide: { en: "Read the guide", hi: "पूरा पढ़ें" },
  latest: { en: "Latest guide", hi: "नई जानकारी" },
  byCategory: { en: "Filter guides by topic", hi: "विषय के अनुसार देखें" },
  allGuides: { en: "All guides", hi: "सारी जानकारी" },
  moreGuides: { en: "More guides", hi: "और जानकारी" },
  writtenBy: { en: "Written by", hi: "लेखक" },
  relatedTitle: { en: "The treatment in this guide", hi: "इस जानकारी से जुड़ा इलाज" },
  askDentist: { en: "Questions about your own teeth? A consultation is the place to ask.", hi: "अपने दाँतों के बारे में सवाल हैं? इसके लिए परामर्श ही सही जगह है।" },
} as const satisfies Record<string, Bilingual>;
