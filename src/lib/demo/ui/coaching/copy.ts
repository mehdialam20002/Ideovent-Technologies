/**
 * STRUCTURAL COPY SHARED BY THE COACHING PAGES, in both languages. A page's
 * own words stay in its own COPY table; only what two or more pages print
 * lives here. Hinglish as a parent reads it (see src/lib/demo/language.ts).
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export const C_COPY = {
  all: { en: "All", hi: "सभी" },
  allYears: { en: "All years", hi: "सभी साल" },
  allExams: { en: "All exams", hi: "सभी एग्ज़ाम" },
  allSubjects: { en: "All subjects", hi: "सभी विषय" },
  paid: { en: "Paid course", hi: "पेड कोर्स" },
  scholarship: { en: "On scholarship", hi: "स्कॉलरशिप पर" },
  free: { en: "Free course", hi: "फ्री कोर्स" },
  course: { en: "Course", hi: "कोर्स" },
  selections: { en: "selections", hi: "सिलेक्शन" },
  final: { en: "Final", hi: "फ़ाइनल" },
  provisional: { en: "Provisional", hi: "प्रोविज़नल" },
  qualification: { en: "Qualification", hi: "योग्यता" },
  experience: { en: "Experience", hi: "अनुभव" },
  batches: { en: "Batches", hi: "बैच" },
  style: { en: "How they teach", hi: "पढ़ाने का तरीका" },
  watchVideo: { en: "Play the video", hi: "वीडियो चलाएँ" },
  videoNote: { en: "The video loads only when you tap", hi: "वीडियो टैप करने पर ही लोड होगा" },
  rating: { en: "{value} out of 5 from {count} reviews on {source}", hi: "{source} पर {count} रिव्यू से 5 में {value}" },
  seeProfile: { en: "See the reviews", hi: "रिव्यू देखें" },
  prev: { en: "Previous photo", hi: "पिछली फ़ोटो" },
  next: { en: "Next photo", hi: "अगली फ़ोटो" },
  close: { en: "Close", hi: "बंद करें" },
  photoOf: { en: "Photo {i} of {n}", hi: "फ़ोटो {i} / {n}" },
  download: { en: "Download", hi: "डाउनलोड" },
  opensSite: { en: "Opens the institute's own site", hi: "संस्थान की अपनी वेबसाइट खुलेगी" },
  showing: { en: "Showing {n}", hi: "{n} दिख रहे हैं" },
  nothingMatches: { en: "Nothing matches this filter yet.", hi: "इस फ़िल्टर में अभी कुछ नहीं है।" },
  source: { en: "Source: {source}", hi: "स्रोत: {source}" },
  updated: { en: "Last updated {date}", hi: "आखिरी अपडेट {date}" },
  resultsDisclosure: {
    en: "Every result names the course taken, its duration and whether it was paid. A student's name appears only with written consent given after the result.",
    hi: "हर रिज़ल्ट के साथ लिया गया कोर्स, उसकी अवधि और फीस दी गई या नहीं, लिखा है। छात्र का नाम सिर्फ़ रिज़ल्ट के बाद ली गई लिखित अनुमति से दिखता है।",
  },
  bookDemo: { en: "Book a free demo", hi: "फ्री डेमो बुक करें" },
  askWhatsapp: { en: "Ask on WhatsApp", hi: "WhatsApp पर पूछें" },
  call: { en: "Call", hi: "कॉल करें" },
} satisfies Record<string, Bilingual>;

/** True when a free-text field starts with a number ("6 April 2027", "40"), so a template sentence around it reads right; "Join in any month" prints as typed. */
export function startsWithNumber(v: string | undefined): boolean {
  return /^\d/.test((v || "").trim());
}
