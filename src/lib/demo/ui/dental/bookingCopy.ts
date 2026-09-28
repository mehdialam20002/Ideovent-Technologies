/**
 * THE BOOKING FLOW'S OWN LINES, beside BOOKING_COPY (copy.ts), in both
 * languages. `{clinic}`, `{n}` and `{when}` are filled with trf(). No em
 * dashes, no promise of a slot: the clinic confirms.
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export const BOOKING_MORE = {
  stepWhat: { en: "Treatment", hi: "इलाज" },
  stepWhen: { en: "Date and time", hi: "दिन और समय" },
  stepYou: { en: "Your details", hi: "आपकी जानकारी" },
  progress: { en: "Booking progress", hi: "बुकिंग की प्रगति" },
  reasonLegend: { en: "Reason for your visit", hi: "आने की वजह" },
  urgent: { en: "Severe pain or swelling? Please call the clinic now instead of waiting for a slot.", hi: "तेज़ दर्द या सूजन है? स्लॉट का इंतज़ार न करें, अभी क्लिनिक को कॉल करें।" },
  dayLegend: { en: "Choose a day", hi: "दिन चुनें" },
  slotLegend: { en: "Choose a time", hi: "समय चुनें" },
  today: { en: "Today", hi: "आज" },
  tomorrow: { en: "Tomorrow", hi: "कल" },
  noSlotsToday: { en: "No more times today. Please choose another day.", hi: "आज के सभी समय निकल गए। कृपया कोई और दिन चुनें।" },
  slotsNote: { en: "These are preferred times. The clinic confirms the exact time with you.", hi: "ये पसंद के समय हैं। सही समय क्लिनिक आपसे पक्का करेगा।" },
  mobileHint: { en: "10 digits, no 0 or +91 in front", hi: "10 अंक, आगे 0 या +91 नहीं" },
  errReason: { en: "Choose what you need help with.", hi: "चुनें कि आपको किस चीज़ में मदद चाहिए।" },
  errDay: { en: "Choose a day.", hi: "कोई दिन चुनें।" },
  errSlot: { en: "Choose a time.", hi: "कोई समय चुनें।" },
  errName: { en: "Please enter your name.", hi: "कृपया अपना नाम लिखें।" },
  errMobile: { en: "Enter a 10-digit mobile number.", hi: "10 अंकों का मोबाइल नंबर लिखें।" },
  errEmail: { en: "Check the email address, or leave it empty.", hi: "ईमेल पता जाँचें, या इसे ख़ाली छोड़ दें।" },
  summaryTitle: { en: "Your appointment request", hi: "आपका अपॉइंटमेंट अनुरोध" },
  sumReason: { en: "Reason", hi: "वजह" },
  sumWhen: { en: "Preferred time", hi: "पसंद का समय" },
  sumName: { en: "Name", hi: "नाम" },
  sumMobile: { en: "Mobile", hi: "मोबाइल" },
  sumEmail: { en: "Email", hi: "ईमेल" },
  edit: { en: "Change", hi: "बदलें" },
  waOpened: { en: "WhatsApp has opened with your request written out. Press send in WhatsApp to reach {clinic}. Nothing is sent until you do.", hi: "WhatsApp में आपका अनुरोध लिखा हुआ खुल गया है। {clinic} तक पहुँचाने के लिए WhatsApp में भेजें दबाएँ। जब तक आप नहीं भेजते, कुछ नहीं जाता।" },
  waAgain: { en: "Open WhatsApp again", hi: "WhatsApp फिर से खोलें" },
  demoTitle: { en: "This is a demonstration", hi: "यह एक डेमो है" },
  demoBody: { en: "Your request has not been sent anywhere. On the clinic's own website, this step opens WhatsApp with these details written out, ready for you to send.", hi: "आपका अनुरोध कहीं नहीं भेजा गया है। क्लिनिक की अपनी वेबसाइट पर यह चरण WhatsApp खोलता है, जिसमें ये जानकारी लिखी होती है और आप उसे भेज सकते हैं।" },
  confirmNext: { en: "The clinic confirms your time by call or WhatsApp during working hours.", hi: "क्लिनिक काम के समय में कॉल या WhatsApp पर आपका समय पक्का करता है।" },
  again: { en: "Start a new request", hi: "नया अनुरोध शुरू करें" },
  calTitle: { en: "Dental appointment at {clinic}", hi: "{clinic} में दाँतों का अपॉइंटमेंट" },
  calNote: { en: "Requested time. Wait for the clinic to confirm.", hi: "अनुरोधित समय। क्लिनिक की पुष्टि का इंतज़ार करें।" },
  waReason: { en: "Reason", hi: "वजह" },
  waDoctor: { en: "Doctor", hi: "डॉक्टर" },
  waBranch: { en: "Clinic", hi: "क्लिनिक" },
  waWhen: { en: "Preferred time", hi: "पसंद का समय" },
  waName: { en: "Name", hi: "नाम" },
  waMobile: { en: "Mobile", hi: "मोबाइल" },
  waEmail: { en: "Email", hi: "ईमेल" },
  anyBranch: { en: "Any clinic", hi: "कोई भी क्लिनिक" },
  privacyTitle: { en: "How we use your details", hi: "हम आपकी जानकारी का उपयोग कैसे करते हैं" },
  privacyLink: { en: "Privacy notice", hi: "प्राइवेसी नोटिस" },
} as const satisfies Record<string, Bilingual>;
