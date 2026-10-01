/**
 * STRUCTURAL COPY SHARED BY THE SHELL AND THE KIT, in both languages.
 *
 * Every string a reader sees and that we wrote comes from a Bilingual entry,
 * here or in a page file's own COPY table. `satisfies Record<string,
 * Bilingual>` makes a missing Hindi (or English) a compile error, which is
 * the other half of the language fix (see ./bilingual.ts).
 *
 * Hindi here is Hinglish as a Delhi parent reads it (see language.ts): the
 * English words nobody translates (admission, form, fees, WhatsApp, batch)
 * stay in Latin script.
 */

import type { Bilingual } from "./bilingual";
import type { FooterGroup } from "./pages";

export const SHELL_COPY = {
  skip: { en: "Skip to content", hi: "मुख्य हिस्से पर जाएँ" },
  menu: { en: "Menu", hi: "मेन्यू" },
  close: { en: "Close", hi: "बंद करें" },
  call: { en: "Call", hi: "कॉल करें" },
  whatsapp: { en: "WhatsApp", hi: "WhatsApp" },
  applyNow: { en: "Apply now", hi: "एडमिशन लें" },
  enquire: { en: "Enquire", hi: "जानकारी लें" },
  parentPortal: { en: "Parent portal", hi: "पैरेंट पोर्टल" },
  disclosure: { en: "Disclosure", hi: "अनिवार्य जानकारी" },
  demoClass: { en: "Free demo class", hi: "फ्री डेमो क्लास" },
  bookDemo: { en: "Book a free demo", hi: "फ्री डेमो बुक करें" },
  coursesAndFees: { en: "Courses and fees", hi: "कोर्स और फीस" },
  /* The dental "book" page's own label (src/lib/demo/site/pages.ts). */
  bookAppointment: { en: "Book appointment", hi: "अपॉइंटमेंट बुक करें" },
  login: { en: "Login", hi: "लॉगिन" },
  findUs: { en: "Find us on the map", hi: "मैप पर देखें" },
  moreLinks: { en: "More", hi: "और" },
  language: { en: "Language", hi: "भाषा" },
  home: { en: "Home", hi: "होम" },
  backHome: { en: "Back to the home page", hi: "होम पेज पर वापस" },
  lastUpdated: { en: "Last updated {date}", hi: "आखिरी अपडेट {date}" },
  toBeUploaded: { en: "To be uploaded", hi: "जल्द अपलोड होगा" },
  sitemapTitle: { en: "Every page on this site", hi: "इस वेबसाइट के सभी पेज" },
  allRights: { en: "{name}, {city}", hi: "{name}, {city}" },
} satisfies Record<string, Bilingual>;

/** The designed empty state: a page with nothing to show yet, never linked. */
export const EMPTY_COPY = {
  title: { en: "This page is not published yet", hi: "यह पेज अभी पब्लिश नहीं हुआ है" },
  body: {
    en: "The school has not added this part of the site yet. Admissions and contact details are ready.",
    hi: "यह हिस्सा अभी जोड़ा नहीं गया है। एडमिशन और संपर्क की जानकारी तैयार है।",
  },
  bodyCoaching: {
    en: "The institute has not added this part of the site yet. Courses and contact details are ready.",
    hi: "यह हिस्सा अभी जोड़ा नहीं गया है। कोर्स और संपर्क की जानकारी तैयार है।",
  },
  /* A dental clinic's page (30 Sep 2026) never says courses, campus or centre. */
  bodyDental: {
    en: "The clinic has not added this part of the site yet. Appointments and contact details are ready.",
    hi: "यह हिस्सा अभी जोड़ा नहीं गया है। अपॉइंटमेंट और संपर्क की जानकारी तैयार है।",
  },
  noPhoto: { en: "Photographs of the campus will appear here", hi: "कैंपस की तस्वीरें यहाँ दिखेंगी" },
  noPhotoCoaching: { en: "Photographs of the centre will appear here", hi: "सेंटर की तस्वीरें यहाँ दिखेंगी" },
  noPhotoDental: { en: "Photographs of the clinic will appear here", hi: "क्लिनिक की तस्वीरें यहाँ दिखेंगी" },
} satisfies Record<string, Bilingual>;

/** The footer's four groups, per kind. */
export const FOOTER_GROUP_COPY: Record<"school" | "coaching", Record<FooterGroup, Bilingual>> = {
  school: {
    institute: { en: "School", hi: "स्कूल" },
    admissions: { en: "Admissions", hi: "एडमिशन" },
    resources: { en: "Resources", hi: "जानकारी" },
    legal: { en: "Legal", hi: "नियम" },
  },
  coaching: {
    institute: { en: "Institute", hi: "संस्थान" },
    admissions: { en: "Join", hi: "जुड़ें" },
    resources: { en: "Students", hi: "स्टूडेंट्स" },
    legal: { en: "Policies", hi: "नियम" },
  },
};

