/**
 * DENTAL COPY: every line of OUR words on a dental demo, in both languages.
 *
 * The disclaimers are the exact strings of E:/myagency/_assets/
 * DENTAL-COMPLIANCE.md section 4 and 5. Do not paraphrase them in a page:
 * import them from here, so a legal review changes one file. No em dashes,
 * no "best", "painless", "guaranteed", "free" (as an offer), "% off".
 *
 * `{clinic}` and `{contact}` are filled with trf().
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

/** WhatsApp green that holds 5.43:1 with white (brand #25D366 fails at 1.98). */
export const WA_GREEN = "#0B7A3E";
/** Emergency red, 6.57:1 with white. Top-bar Emergency item and the Emergency band only. */
export const EMERGENCY_RED = "#B42318";

export const DISCLAIMER = {
  /** Under every price, fee table and "from" line. The asterisk pairs with "Starting from*". */
  fees: { en: "*Starting prices for a simple case. Your final cost depends on your diagnosis and treatment plan. We give you a written estimate before treatment starts.", hi: "*ये सामान्य केस के लिए शुरुआती दाम हैं। आपका अंतिम ख़र्च आपकी जाँच और इलाज की योजना पर निर्भर करता है। इलाज शुरू होने से पहले हम आपको लिखित अनुमान देते हैं।" },
  /** Treatment pages, journeys, any outcome line. */
  results: { en: "Results vary from person to person. Your dentist will explain what to expect for you.", hi: "नतीजे हर व्यक्ति में अलग होते हैं। आपके डेंटिस्ट आपको बताएँगे कि आपके लिए क्या उम्मीद करें।" },
  /** A real clinic's own consented case. */
  caseReal: { en: "Shared with the patient's written consent. Photos are unretouched. Results vary.", hi: "मरीज़ की लिखित सहमति से साझा। तस्वीरें बिना एडिट की हैं। नतीजे अलग हो सकते हैं।" },
  /** The illustrative placeholder tile on a template. */
  caseTemplate: { en: "Illustration only. Not a real patient.", hi: "केवल चित्र। असली मरीज़ नहीं।" },
  casePlaceholder: { en: "Illustrative placeholder. Real cases appear here, with patient consent, once the clinic adds them.", hi: "यह केवल उदाहरण है। क्लिनिक के असली केस, मरीज़ की सहमति के साथ, यहाँ दिखेंगे।" },
  emergency: { en: "For severe facial swelling, swelling spreading to the eye or neck, trouble breathing or swallowing, heavy bleeding that will not stop, or a jaw injury, go to the nearest hospital emergency department or call 112.", hi: "चेहरे पर तेज़ सूजन, आँख या गर्दन तक फैलती सूजन, साँस लेने या निगलने में दिक्कत, न रुकने वाला ख़ून, या जबड़े की चोट हो तो नज़दीकी अस्पताल के इमरजेंसी विभाग जाएँ या 112 पर कॉल करें।" },
  /** Beside every same-day claim. */
  sameDay: { en: "Same-day slots depend on availability.", hi: "उसी दिन का समय उपलब्धता पर निर्भर है।" },
  /** Blog posts and the FAQ page. */
  info: { en: "General information, not a diagnosis. Please see a dentist for advice about your teeth.", hi: "यह सामान्य जानकारी है, जाँच नहीं। अपने दाँतों की सलाह के लिए डेंटिस्ट से मिलें।" },
  emi: { en: "EMI options may be available through partner lenders, subject to their approval.", hi: "पार्टनर लेंडर के ज़रिये EMI का विकल्प मिल सकता है, उनकी मंज़ूरी के अनुसार।" },
  consult: { en: "Cost after consultation and X-ray", hi: "ख़र्च जाँच और X-ray के बाद" },
} as const satisfies Record<string, Bilingual>;

export const BOOKING_COPY = {
  step: { en: "Step {n} of 3", hi: "चरण {n} / 3" },
  whatTitle: { en: "What do you need help with?", hi: "आपको किस चीज़ में मदद चाहिए?" },
  doctor: { en: "Doctor", hi: "डॉक्टर" },
  anyDoctor: { en: "Any available doctor", hi: "कोई भी उपलब्ध डॉक्टर" },
  branch: { en: "Clinic", hi: "क्लिनिक" },
  whenTitle: { en: "When would you like to come?", hi: "आप कब आना चाहेंगे?" },
  morning: { en: "Morning", hi: "सुबह" },
  evening: { en: "Evening", hi: "शाम" },
  closed: { en: "Closed", hi: "बंद" },
  emergencyCall: { en: "Emergency? Call now", hi: "इमरजेंसी? अभी कॉल करें" },
  youTitle: { en: "Your details", hi: "आपकी जानकारी" },
  name: { en: "Your name", hi: "आपका नाम" },
  mobile: { en: "Mobile number", hi: "मोबाइल नंबर" },
  email: { en: "Email (optional)", hi: "ईमेल (वैकल्पिक)" },
  noMedical: { en: "Please do not share medical details here. We will ask at your visit.", hi: "कृपया यहाँ इलाज से जुड़ी जानकारी न लिखें। हम आपके आने पर पूछेंगे।" },
  child: { en: "Booking for your child? Enter your own name and number.", hi: "बच्चे के लिए बुक कर रहे हैं? अपना नाम और नंबर लिखें।" },
  consent: { en: "By booking, you agree that {clinic} may use your name and number to confirm and manage this appointment by call, SMS or WhatsApp. We keep appointment requests for 12 months, then delete them. You can withdraw or ask for deletion at {contact}.", hi: "बुक करके आप सहमति देते हैं कि {clinic} इस अपॉइंटमेंट की पुष्टि और प्रबंधन के लिए कॉल, SMS या WhatsApp पर आपके नाम और नंबर का उपयोग कर सकता है। हम अपॉइंटमेंट अनुरोध 12 महीने रखते हैं, फिर मिटा देते हैं। आप {contact} पर सहमति वापस ले सकते हैं या डेटा मिटाने को कह सकते हैं।" },
  reminders: { en: "Send me check-up reminders and clinic updates on WhatsApp.", hi: "मुझे WhatsApp पर चेक-अप रिमाइंडर और क्लिनिक की जानकारी भेजें।" },
  submit: { en: "Request appointment", hi: "अपॉइंटमेंट का अनुरोध करें" },
  demoNote: { en: "Demo form. Nothing is sent.", hi: "डेमो फ़ॉर्म। कुछ भी भेजा नहीं जाता।" },
  doneTitle: { en: "Your request is ready", hi: "आपका अनुरोध तैयार है" },
  chat: { en: "Chat on WhatsApp", hi: "WhatsApp पर बात करें" },
  addToCalendar: { en: "Add to calendar", hi: "कैलेंडर में जोड़ें" },
  back: { en: "Back", hi: "वापस" },
  next: { en: "Continue", hi: "आगे बढ़ें" },
  close: { en: "Close", hi: "बंद करें" },
} as const satisfies Record<string, Bilingual>;

export const DENTAL_COPY = {
  book: { en: "Book appointment", hi: "अपॉइंटमेंट बुक करें" },
  bookShort: { en: "Book", hi: "बुक करें" },
  bookConsult: { en: "Book a consultation", hi: "परामर्श बुक करें" },
  bookWith: { en: "Book with {name}", hi: "{name} के साथ बुक करें" },
  call: { en: "Call", hi: "कॉल करें" },
  callClinic: { en: "Call the clinic", hi: "क्लिनिक को कॉल करें" },
  whatsapp: { en: "WhatsApp", hi: "WhatsApp" },
  whatsappNow: { en: "WhatsApp us", hi: "WhatsApp करें" },
  emergency: { en: "Emergency", hi: "इमरजेंसी" },
  emergencyWhatsapp: { en: "WhatsApp for an emergency", hi: "इमरजेंसी के लिए WhatsApp" },
  openNow: { en: "Open now", hi: "अभी खुला है" },
  opensAt: { en: "Opens {time}", hi: "{time} बजे खुलेगा" },
  closedToday: { en: "Closed today", hi: "आज बंद" },
  opensTomorrow: { en: "Opens tomorrow, {time}", hi: "कल {time} बजे खुलेगा" },
  opensOn: { en: "Opens {day}, {time}", hi: "{day} {time} बजे खुलेगा" },
  startingFrom: { en: "Starting from*", hi: "शुरुआत*" },
  consultRequired: { en: "Consultation required", hi: "जाँच ज़रूरी" },
  regNo: { en: "Reg. no.", hi: "पंजीकरण सं." },
  languages: { en: "Languages", hi: "भाषाएँ" },
  experience: { en: "Experience", hi: "अनुभव" },
  visiting: { en: "Visiting specialist", hi: "विज़िटिंग विशेषज्ञ" },
  allTreatments: { en: "All treatments", hi: "सभी इलाज" },
  seeAll: { en: "See all", hi: "सब देखें" },
  readMore: { en: "Read more", hi: "और पढ़ें" },
  directions: { en: "Directions", hi: "रास्ता देखें" },
  reviewedBy: { en: "Medically reviewed by", hi: "चिकित्सकीय समीक्षा" },
  before: { en: "Before", hi: "पहले" },
  after: { en: "After", hi: "बाद में" },
  waHello: { en: "Hi, I would like an appointment at {clinic}.", hi: "नमस्ते, मुझे {clinic} में अपॉइंटमेंट चाहिए।" },
  waTreatment: { en: "Hi, I would like to ask about {treatment} at {clinic}.", hi: "नमस्ते, मुझे {clinic} में {treatment} के बारे में पूछना है।" },
  waEmergency: { en: "Hi, I have a dental emergency and need an appointment today.", hi: "नमस्ते, मुझे दाँत की इमरजेंसी है और आज अपॉइंटमेंट चाहिए।" },
} as const satisfies Record<string, Bilingual>;

/** The dental footer's names for the shared footer groups. */
export const DENTAL_FOOTER_GROUPS = {
  institute: { en: "Clinic", hi: "क्लिनिक" },
  admissions: { en: "Treatments and booking", hi: "इलाज और बुकिंग" },
  resources: { en: "Patients", hi: "मरीज़ों के लिए" },
  legal: { en: "Legal", hi: "क़ानूनी" },
} as const satisfies Record<string, Bilingual>;
