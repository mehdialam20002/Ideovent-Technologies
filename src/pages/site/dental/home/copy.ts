/**
 * OUR WORDS on the dental home, About, Doctors and Technology pages (HOME
 * builder, 28 Sep 2026), always { en, hi } literals so the language checks
 * see both. One *accent* phrase per title at most. No em dashes, no
 * superlatives, no offers, no guarantees (DENTAL-COMPLIANCE.md section 3).
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

type C = Record<string, Bilingual>;

export const H = {
  quickEyebrow: { en: "Quick actions", hi: "जल्दी बुकिंग" },
  quickTitle: { en: "What brings you in *today*?", hi: "आज आप किस लिए *आना* चाहते हैं?" },
  quickLead: { en: "Pick what you need help with, then choose a day and time.", hi: "बताइए किस चीज़ में मदद चाहिए, फिर दिन और समय चुनिए।" },
  problemTitle: { en: "What would you like to *fix*?", hi: "आप क्या *ठीक* करवाना चाहते हैं?" },

  teamEyebrow: { en: "Our dentists", hi: "हमारे डेंटिस्ट" },
  teamTitle: { en: "The people who will *treat you*", hi: "जो आपका *इलाज करेंगे*" },
  teamLead: { en: "Degrees, registration numbers and the languages each dentist speaks, so you know who you will see.", hi: "हर डेंटिस्ट की डिग्री, पंजीकरण संख्या और भाषाएँ, ताकि आप जानें कि आप किससे मिलेंगे।" },
  teamAll: { en: "Meet all our dentists", hi: "सभी डेंटिस्ट से मिलें" },
  visitingDays: { en: "Visiting specialists", hi: "विज़िटिंग विशेषज्ञ" },

  dentistEyebrow: { en: "Meet your dentist", hi: "अपने डेंटिस्ट से मिलें" },
  kidsDentistEyebrow: { en: "Meet your child's dentist", hi: "अपने बच्चे के डेंटिस्ट से मिलें" },
  surgeonEyebrow: { en: "Your surgeon", hi: "आपके सर्जन" },
  bookThis: { en: "Book with this doctor", hi: "इन डॉक्टर के साथ बुक करें" },
  profile: { en: "Read the full profile", hi: "पूरी प्रोफ़ाइल पढ़ें" },

  treatEyebrow: { en: "Treatments", hi: "इलाज" },
  treatTitle: { en: "Care for every stage, *explained plainly*", hi: "हर उम्र की देखभाल, *सरल भाषा में*" },
  treatLead: { en: "Each treatment has its own page: what it involves, how many visits it takes and what it costs to start.", hi: "हर इलाज का अपना पेज है: उसमें क्या होता है, कितनी विज़िट लगती हैं और शुरुआती ख़र्च कितना है।" },
  allCategories: { en: "All", hi: "सभी" },
  signatureEyebrow: { en: "Signature treatments", hi: "ख़ास इलाज" },
  signatureTitle: { en: "Designed around *your smile*", hi: "*आपकी मुस्कान* के हिसाब से" },
  specialtiesEyebrow: { en: "Specialties", hi: "विशेषज्ञताएँ" },
  specialtiesTitle: { en: "Specialists under *one roof*", hi: "*एक ही जगह* पर विशेषज्ञ" },
  explore: { en: "Explore", hi: "देखें" },

  journeyEyebrow: { en: "How it works", hi: "कैसे होता है" },
  journeyTitle: { en: "Your journey, *step by step*", hi: "आपका सफ़र, *एक-एक कदम*" },
  smileJourneyEyebrow: { en: "Your smile journey", hi: "आपकी मुस्कान का सफ़र" },
  smileJourneyTitle: { en: "Four unhurried steps, *planned with you*", hi: "चार आराम भरे कदम, *आपके साथ तय*" },

  sterileEyebrow: { en: "Sterilisation", hi: "स्टरलाइज़ेशन" },
  sterileTitle: { en: "How we clean and sterilise, *step by step*", hi: "हम कैसे साफ़ और स्टरलाइज़ करते हैं, *एक-एक कदम*" },
  sterileLead: { en: "The same protocol for every patient. Ask to see it at your visit.", hi: "हर मरीज़ के लिए एक ही तरीका। अपनी विज़िट पर इसे देखने के लिए कहें।" },

  techEyebrow: { en: "Technology", hi: "तकनीक" },
  techTitle: { en: "Equipment, explained by *what it does for you*", hi: "उपकरण, *आपके फ़ायदे* के हिसाब से" },
  techAll: { en: "See our technology", hi: "हमारी तकनीक देखें" },

  casesEyebrow: { en: "Before and after", hi: "पहले और बाद" },
  casesTitle: { en: "What treatment *can involve*", hi: "इलाज में *क्या हो सकता है*" },
  casesAll: { en: "See the gallery", hi: "गैलरी देखें" },

  reviewsEyebrow: { en: "Patient reviews", hi: "मरीज़ों के रिव्यू" },
  reviewsTitle: { en: "In our patients' *own words*", hi: "मरीज़ों के *अपने शब्दों* में" },
  parentReviewsTitle: { en: "What *parents* tell us", hi: "*माता-पिता* क्या कहते हैं" },
  reviewsAll: { en: "Read all reviews", hi: "सभी रिव्यू पढ़ें" },
  prev: { en: "Previous review", hi: "पिछला रिव्यू" },
  next: { en: "Next review", hi: "अगला रिव्यू" },
  reviewN: { en: "Review {n}", hi: "रिव्यू {n}" },
  fromReviews: { en: "from {count} reviews", hi: "{count} रिव्यू से" },
  openListing: { en: "See the live listing", hi: "असली लिस्टिंग देखें" },

  feesEyebrow: { en: "Fees and EMI", hi: "फ़ीस और EMI" },
  feesTitle: { en: "Starting prices, *stated up front*", hi: "शुरुआती दाम, *पहले से साफ़*" },
  feesAll: { en: "See all fees", hi: "सभी फ़ीस देखें" },
  plansTitle: { en: "Family care plans", hi: "फ़ैमिली केयर प्लान" },

  emergencyEyebrow: { en: "Emergency", hi: "इमरजेंसी" },
  emergencyMore: { en: "What counts as an emergency", hi: "इमरजेंसी किसे कहते हैं" },

  reachEyebrow: { en: "Visit us", hi: "हमसे मिलें" },
  reachTitle: { en: "How to *reach us*", hi: "हम तक *कैसे पहुँचें*" },
  reachHours: { en: "Opening hours", hi: "खुलने का समय" },
  reachContact: { en: "Full contact details", hi: "पूरी संपर्क जानकारी" },
  mapOpen: { en: "Open in Google Maps", hi: "Google Maps में खोलें" },

  faqEyebrow: { en: "Questions", hi: "सवाल" },
  faqTitle: { en: "Asked *before the first visit*", hi: "*पहली विज़िट से पहले* पूछे जाने वाले सवाल" },
  faqAll: { en: "All questions", hi: "सभी सवाल" },

  bandLux: { en: "Begin with a *consultation*", hi: "*परामर्श* से शुरुआत करें" },
  bandCalm: { en: "Start with a *conversation*", hi: "*बातचीत* से शुरुआत करें" },
  bandClinical: { en: "Book a visit in *three short steps*", hi: "*तीन आसान चरणों* में विज़िट बुक करें" },
  bandKids: { en: "Book your child's *first visit*", hi: "बच्चे की *पहली विज़िट* बुक करें" },
  bandLead: { en: "Choose what you need help with, then a day and time. Nothing is charged online.", hi: "बताइए किसमें मदद चाहिए, फिर दिन और समय चुनिए। ऑनलाइन कोई पैसा नहीं लिया जाता।" },
  bandChain: { en: "Choose a clinic first, then what you need and a time.", hi: "पहले क्लिनिक चुनिए, फिर ज़रूरत और समय।" },

  intlEyebrow: { en: "Patients from abroad", hi: "विदेश से आने वाले मरीज़" },
  intlTitle: { en: "Planning treatment *around a trip*?", hi: "यात्रा के साथ *इलाज की योजना*?" },
  intlCta: { en: "Plan your visit", hi: "अपनी विज़िट की योजना बनाएँ" },

  compareEyebrow: { en: "Compare options", hi: "विकल्पों की तुलना" },
  audienceEyebrow: { en: "Who this is for", hi: "यह किसके लिए है" },
  audienceTitle: { en: "Implants may help if you have *any of these*", hi: "इनमें से *कोई भी स्थिति* हो तो इम्प्लांट मदद कर सकता है" },
  candidateEyebrow: { en: "Am I a candidate?", hi: "क्या मैं उपयुक्त हूँ?" },
  candidateTitle: { en: "Things your surgeon will *check first*", hi: "सर्जन *पहले क्या जाँचेंगे*" },
  candidateNote: { en: "Your surgeon decides after a CBCT scan and a check-up. None of these rules you out on its own.", hi: "सर्जन CBCT स्कैन और जाँच के बाद तय करते हैं। इनमें से कोई एक बात अकेले आपको बाहर नहीं करती।" },

  branchesEyebrow: { en: "Our clinics", hi: "हमारे क्लिनिक" },
  branchesTitle: { en: "A clinic *near you*", hi: "आपके *नज़दीक* क्लिनिक" },
  branchesAll: { en: "All clinics", hi: "सभी क्लिनिक" },
  standardEyebrow: { en: "One standard", hi: "एक ही मानक" },
  standardTitle: { en: "The same care *in every branch*", hi: "*हर शाखा में* एक जैसी देखभाल" },
  corporateEyebrow: { en: "For employers", hi: "कंपनियों के लिए" },
  corporateTitle: { en: "Dental care for *your team*", hi: "*आपकी टीम* के लिए दाँतों की देखभाल" },

  firstVisitEyebrow: { en: "The first visit", hi: "पहली विज़िट" },
  firstVisitTitle: { en: "Your child's first visit, *in four steps*", hi: "बच्चे की पहली विज़िट, *चार कदमों में*" },
  agesEyebrow: { en: "Care by age", hi: "उम्र के हिसाब से देखभाल" },
  agesTitle: { en: "From the *first tooth* to the teens", hi: "*पहले दाँत* से किशोर उम्र तक" },
  roomsEyebrow: { en: "Our rooms", hi: "हमारे कमरे" },
  roomsTitle: { en: "Made for *small visitors*", hi: "*छोटे मेहमानों* के लिए" },
  comfortEyebrow: { en: "Comfort", hi: "आराम" },
  comfortTitle: { en: "How we keep visits *calm*", hi: "हम विज़िट को *सहज* कैसे रखते हैं" },
  comfortNote: { en: "Every child is different. We go at your child's pace and explain each step to you.", hi: "हर बच्चा अलग होता है। हम बच्चे की रफ़्तार से चलते हैं और हर कदम आपको समझाते हैं।" },
  firstAidTitle: { en: "Knocked-out tooth? *What to do now*", hi: "दाँत निकल गया? *अभी क्या करें*" },
  guidesEyebrow: { en: "Guides", hi: "गाइड" },
  guidesTitle: { en: "Plain answers, *reviewed by our dentists*", hi: "सरल जवाब, *हमारे डेंटिस्ट द्वारा जाँचे गए*" },
  guidesAll: { en: "All guides", hi: "सभी गाइड" },
} as const satisfies C;

/** About, Doctors, Doctor and Technology pages. */
export const P = {
  home: { en: "Home", hi: "होम" },
  aboutEyebrow: { en: "About the clinic", hi: "क्लिनिक के बारे में" },
  aboutTitle: { en: "Our *story*", hi: "हमारी *कहानी*" },
  established: { en: "Established", hi: "स्थापना" },
  missionLabel: { en: "What we set out to do", hi: "हमारा उद्देश्य" },
  visionLabel: { en: "Where we are headed", hi: "हम कहाँ जा रहे हैं" },
  trustEyebrow: { en: "Why patients trust us", hi: "मरीज़ हम पर भरोसा क्यों करते हैं" },
  trustTitle: { en: "Facts you can *check*", hi: "तथ्य जिन्हें आप *जाँच* सकते हैं" },
  galleryEyebrow: { en: "The clinic", hi: "क्लिनिक" },
  galleryTitle: { en: "Inside the *clinic*", hi: "क्लिनिक के *अंदर*" },
  doctorsEyebrow: { en: "Our dentists", hi: "हमारे डेंटिस्ट" },
  doctorsTitle: { en: "Meet the *dentists*", hi: "*डेंटिस्ट* से मिलें" },
  doctorsLead: { en: "Every profile shows the degree, the council registration number, years in practice and the languages spoken. Book with the dentist you prefer, or with whoever is available first.", hi: "हर प्रोफ़ाइल में डिग्री, काउंसिल पंजीकरण संख्या, अनुभव के साल और बोली जाने वाली भाषाएँ हैं। अपनी पसंद के डेंटिस्ट के साथ बुक करें, या जो पहले ख़ाली हो उनके साथ।" },
  filterAll: { en: "All dentists", hi: "सभी डेंटिस्ट" },
  filterFemale: { en: "Women dentists", hi: "महिला डेंटिस्ट" },
  filterBy: { en: "Filter dentists", hi: "डेंटिस्ट छाँटें" },
  noMatch: { en: "No dentist matches this filter.", hi: "इस फ़िल्टर से कोई डेंटिस्ट नहीं मिला।" },
  residentTitle: { en: "At the clinic", hi: "क्लिनिक में" },
  visitingTitle: { en: "Visiting specialists", hi: "विज़िटिंग विशेषज्ञ" },
  visitingLead: { en: "They see patients on fixed days, shown on each card. Book ahead for their days.", hi: "ये तय दिनों पर मरीज़ देखते हैं, जो हर कार्ड पर लिखे हैं। उन दिनों के लिए पहले से बुक करें।" },
  aboutDoctor: { en: "About {name}", hi: "{name} के बारे में" },
  training: { en: "Training", hi: "प्रशिक्षण" },
  memberships: { en: "Memberships", hi: "सदस्यता" },
  days: { en: "In clinic", hi: "क्लिनिक में" },
  clinics: { en: "Clinics", hi: "क्लिनिक" },
  focus: { en: "Areas of work", hi: "काम के क्षेत्र" },
  otherDoctors: { en: "Other dentists at the clinic", hi: "क्लिनिक के दूसरे डेंटिस्ट" },
  allDoctors: { en: "All dentists", hi: "सभी डेंटिस्ट" },
  techEyebrow: { en: "Technology", hi: "तकनीक" },
  techTitle: { en: "Equipment, explained by *what it does for you*", hi: "उपकरण, *आपके फ़ायदे* के हिसाब से" },
  techLead: { en: "What each piece of equipment means for your visit. Your dentist decides what your case needs, and explains why.", hi: "हर उपकरण आपकी विज़िट के लिए क्या मायने रखता है। आपके केस में क्या ज़रूरी है, यह डेंटिस्ट तय करते हैं और कारण बताते हैं।" },
  techNote: { en: "We name what the equipment does, not brands or rankings. Ask at your visit to see any of it.", hi: "हम बताते हैं कि उपकरण क्या करता है, ब्रांड या रैंकिंग नहीं। अपनी विज़िट पर इनमें से कुछ भी देखने के लिए कहें।" },
  g_diagnosis: { en: "Accurate diagnosis", hi: "सटीक जाँच" },
  g_comfort: { en: "Comfort", hi: "आराम" },
  g_precision: { en: "Precision", hi: "सटीकता" },
  g_speed: { en: "Fewer visits", hi: "कम विज़िट" },
  g_preview: { en: "See it before we start", hi: "शुरू से पहले देखें" },
  g_hygiene: { en: "Hygiene", hi: "स्वच्छता" },
  g_other: { en: "Also at the clinic", hi: "क्लिनिक में और भी" },
} as const satisfies C;
