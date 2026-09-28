/**
 * OUR WORDS on the dental support pages (Book, Contact, Fees, Reviews,
 * Before and after, FAQ, Guides), in both languages. `{x}` is filled with
 * trf(). The compliance strings are NOT here: they come from the kit's
 * DISCLAIMER (src/lib/demo/ui/dental/copy.ts) so a legal review edits one
 * file. No em dashes, no superlatives, no promises.
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export const PB = {
  /* Book */
  bookTitle: { en: "Book a visit in three short steps", hi: "तीन आसान चरणों में अपॉइंटमेंट बुक करें" },
  bookLead: { en: "Choose the reason, pick a time that suits you, and leave your name and number. The clinic confirms by call or WhatsApp.", hi: "वजह चुनें, अपनी सुविधा का समय चुनें, और अपना नाम और नंबर लिखें। क्लिनिक कॉल या WhatsApp पर पुष्टि करता है।" },
  nextTitle: { en: "What happens next", hi: "आगे क्या होता है" },
  next1t: { en: "The clinic confirms", hi: "क्लिनिक पुष्टि करता है" },
  next1b: { en: "You get a call or WhatsApp message to confirm the time, during working hours.", hi: "काम के समय में समय पक्का करने के लिए आपको कॉल या WhatsApp संदेश आता है।" },
  next2t: { en: "Bring what you have", hi: "जो है, साथ लाएँ" },
  next2b: { en: "Old X-rays, prescriptions and the list of medicines you take help the dentist plan.", hi: "पुराने X-ray, पर्चे और आपकी दवाइयों की सूची से डेंटिस्ट को योजना बनाने में मदद मिलती है।" },
  next3t: { en: "An estimate before treatment", hi: "इलाज से पहले अनुमान" },
  next3b: { en: "After the check-up and any X-ray, you get a written estimate before treatment starts.", hi: "जाँच और ज़रूरी X-ray के बाद, इलाज शुरू होने से पहले आपको लिखित अनुमान मिलता है।" },
  talkTitle: { en: "Prefer to talk?", hi: "बात करना चाहते हैं?" },
  talkBody: { en: "Call or WhatsApp the clinic during opening hours.", hi: "खुलने के समय में क्लिनिक को कॉल या WhatsApp करें।" },
  urgentTitle: { en: "Dental emergency?", hi: "दाँतों की इमरजेंसी?" },
  urgentBody: { en: "Severe pain, swelling or a broken tooth: call the clinic instead of booking online.", hi: "तेज़ दर्द, सूजन या टूटा दाँत हो तो ऑनलाइन बुक करने की जगह क्लिनिक को कॉल करें।" },
  urgentLink: { en: "What to do in a dental emergency", hi: "दाँतों की इमरजेंसी में क्या करें" },

  /* Contact */
  contactTitle: { en: "Visit {clinic}", hi: "{clinic} आएँ" },
  contactLead: { en: "Address, directions, parking and opening hours, with the numbers to call.", hi: "पता, रास्ता, पार्किंग और खुलने का समय, और कॉल करने के नंबर।" },
  address: { en: "Address", hi: "पता" },
  landmark: { en: "Landmark", hi: "पहचान की जगह" },
  transit: { en: "Metro and bus", hi: "मेट्रो और बस" },
  parking: { en: "Parking", hi: "पार्किंग" },
  access: { en: "Access", hi: "पहुँच" },
  hours: { en: "Opening hours", hi: "खुलने का समय" },
  thisWeek: { en: "This week", hi: "इस हफ़्ते" },
  today: { en: "Today", hi: "आज" },
  closed: { en: "Closed", hi: "बंद" },
  range: { en: "{a} to {b}", hi: "{a} से {b} तक" },
  email: { en: "Email", hi: "ईमेल" },
  phone: { en: "Phone", hi: "फ़ोन" },
  emTitle: { en: "Emergency number", hi: "इमरजेंसी नंबर" },
  emBody: { en: "For severe tooth pain, swelling, or an injury to the teeth.", hi: "दाँत में तेज़ दर्द, सूजन या दाँतों में चोट के लिए।" },
  loadMap: { en: "Show the map", hi: "नक्शा दिखाएँ" },
  mapNote: { en: "The map loads from Google Maps when you tap.", hi: "टैप करने पर नक्शा Google Maps से खुलता है।" },
  openMaps: { en: "Open in Google Maps", hi: "Google Maps में खोलें" },
  getThere: { en: "Getting here", hi: "यहाँ कैसे पहुँचें" },
  noAddress: { en: "The clinic's address, map and numbers appear here once they are added.", hi: "क्लिनिक का पता, नक्शा और नंबर जुड़ते ही यहाँ दिखेंगे।" },
  branches: { en: "Our clinics", hi: "हमारे क्लिनिक" },
  reachUs: { en: "Talk to the clinic", hi: "क्लिनिक से बात करें" },

  /* Fees */
  feesTitle: { en: "Clear fees, before treatment starts", hi: "इलाज से पहले, साफ़ फीस" },
  feesLead: { en: "Starting prices for common treatments, how your estimate works, and the ways you can pay.", hi: "आम इलाज के शुरुआती दाम, आपका अनुमान कैसे बनता है, और भुगतान के तरीके।" },
  howTitle: { en: "How your estimate works", hi: "आपका अनुमान कैसे बनता है" },
  how1t: { en: "Consultation and X-ray", hi: "जाँच और X-ray" },
  how1b: { en: "The dentist examines your teeth and takes an X-ray if it is needed.", hi: "डेंटिस्ट आपके दाँत जाँचते हैं और ज़रूरत हो तो X-ray लेते हैं।" },
  how2t: { en: "A written estimate", hi: "लिखित अनुमान" },
  how2b: { en: "You get the treatment plan and its cost in writing, with the options.", hi: "आपको इलाज की योजना और उसका ख़र्च, विकल्पों के साथ, लिखित में मिलता है।" },
  how3t: { en: "You decide", hi: "फ़ैसला आपका" },
  how3b: { en: "Treatment starts only after you approve the estimate. Any change is explained to you first.", hi: "आपकी मंज़ूरी के बाद ही इलाज शुरू होता है। कोई बदलाव हो तो पहले आपको बताया जाता है।" },
  tableTitle: { en: "Starting prices", hi: "शुरुआती दाम" },
  colTreatment: { en: "Treatment", hi: "इलाज" },
  colPrice: { en: "Price", hi: "दाम" },
  otherGroup: { en: "Other treatments", hi: "अन्य इलाज" },
  payTitle: { en: "Paying for treatment", hi: "इलाज का भुगतान" },
  emiTitle: { en: "EMI", hi: "EMI" },
  illustration: { en: "Illustration only", hi: "केवल उदाहरण" },
  partners: { en: "Partner lenders", hi: "पार्टनर लेंडर" },
  modesTitle: { en: "Ways to pay", hi: "भुगतान के तरीके" },
  insuranceTitle: { en: "Insurance", hi: "बीमा" },
  consultTitle: { en: "Consultation", hi: "परामर्श" },
  plansTitle: { en: "Care plans", hi: "केयर प्लान" },
  plansLead: { en: "A yearly plan for routine care. A plan covers only what it lists.", hi: "नियमित देखभाल के लिए सालाना प्लान। प्लान में वही शामिल है जो लिखा है।" },
  feesFaq: { en: "Questions about fees", hi: "फीस से जुड़े सवाल" },
  askCost: { en: "Ask about a cost on WhatsApp", hi: "ख़र्च के बारे में WhatsApp पर पूछें" },

  /* Reviews */
  revTitle: { en: "What patients say", hi: "मरीज़ क्या कहते हैं" },
  revLead: { en: "Reviews as patients wrote them, each with where and when it was posted.", hi: "मरीज़ों के लिखे रिव्यू, हर एक के साथ कि कहाँ और कब लिखा गया।" },
  outOf: { en: "out of 5", hi: "5 में से" },
  reviewsWord: { en: "reviews", hi: "रिव्यू" },
  readAll: { en: "Read all reviews", hi: "सभी रिव्यू पढ़ें" },
  policyTitle: { en: "How reviews appear here", hi: "यहाँ रिव्यू कैसे दिखते हैं" },
  policyBody: { en: "Each review shows its source and date and is shown as the patient wrote it.", hi: "हर रिव्यू के साथ उसका स्रोत और तारीख़ है, और वह वैसा ही दिखाया गया है जैसा मरीज़ ने लिखा।" },
  all: { en: "All", hi: "सभी" },
  filterBy: { en: "Filter by treatment", hi: "इलाज के अनुसार देखें" },
  filterBranch: { en: "Filter by clinic", hi: "क्लिनिक के अनुसार देखें" },
  shareTitle: { en: "Visited the clinic?", hi: "क्लिनिक आ चुके हैं?" },
  shareBody: { en: "You can leave your own review on Google.", hi: "आप Google पर अपना रिव्यू लिख सकते हैं।" },
  shareCta: { en: "Write a review", hi: "रिव्यू लिखें" },
  noMatch: { en: "No reviews here yet.", hi: "यहाँ अभी कोई रिव्यू नहीं है।" },
} as const satisfies Record<string, Bilingual>;
