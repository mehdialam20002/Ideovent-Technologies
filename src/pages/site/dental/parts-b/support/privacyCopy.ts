/**
 * THE TEMPLATE PRIVACY NOTICE, en and hi. Follows DENTAL-COMPLIANCE.md s5
 * (DPDP Act 2023 and Rules 2025): who holds the data, what the booking form
 * collects, why, the 12-month retention, withdrawal and deletion, the 90-day
 * reply, the grievance route, and parent booking for a child. {clinic},
 * {contact} and {legal} are filled from the record. It is labelled on the
 * page as a template the clinic replaces with its own reviewed notice.
 */

import type { Bilingual } from "@/lib/demo/site/bilingual";

export interface PrivacySection {
  id: string;
  title: Bilingual;
  body: Bilingual[];
}

export const PRIVACY_HEAD = {
  title: { en: "Privacy notice", hi: "प्राइवेसी नोटिस" } as Bilingual,
  lead: { en: "How {clinic} uses the details you share when you book an appointment on this website.", hi: "इस वेबसाइट पर अपॉइंटमेंट बुक करते समय आप जो जानकारी देते हैं, {clinic} उसका उपयोग कैसे करता है।" } as Bilingual,
  templateTitle: { en: "Template notice", hi: "टेम्पलेट नोटिस" } as Bilingual,
  template: { en: "This is a template. Before the site goes live, {clinic} replaces it with its own privacy notice, reviewed by its own adviser.", hi: "यह एक टेम्पलेट है। वेबसाइट शुरू होने से पहले {clinic} इसे अपने सलाहकार से जाँचे गए अपने प्राइवेसी नोटिस से बदलता है।" } as Bilingual,
  demo: { en: "On this demonstration site the booking form stores and sends nothing.", hi: "इस डेमो वेबसाइट पर बुकिंग फ़ॉर्म कुछ भी सेव या भेजता नहीं है।" } as Bilingual,
  contactTitle: { en: "Privacy contact", hi: "प्राइवेसी संपर्क" } as Bilingual,
  contactBody: { en: "For access, correction, deletion, withdrawal of consent or a complaint, write or call:", hi: "जानकारी देखने, सुधारने, मिटाने, सहमति वापस लेने या शिकायत के लिए लिखें या कॉल करें:" } as Bilingual,
  noContact: { en: "The clinic adds its privacy contact here.", hi: "क्लिनिक यहाँ अपना प्राइवेसी संपर्क जोड़ता है।" } as Bilingual,
  onThisPage: { en: "On this page", hi: "इस पेज पर" } as Bilingual,
};

const s = (en: string, hi: string): Bilingual => ({ en, hi });

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "who",
    title: s("Who holds your details", "आपकी जानकारी किसके पास रहती है"),
    body: [
      s("{legal} is responsible for the details you give on this website (the data fiduciary under the Digital Personal Data Protection Act, 2023).",
        "इस वेबसाइट पर दी गई आपकी जानकारी के लिए {legal} ज़िम्मेदार है (डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट, 2023 के तहत डेटा फ़िड्यूशियरी)।"),
    ],
  },
  {
    id: "what",
    title: s("What we collect", "हम क्या लेते हैं"),
    body: [
      s("Only what a booking needs: your name, mobile number, an email address if you choose to give one, the reason for your visit, and the day, time, clinic and dentist you prefer.",
        "केवल वही जो बुकिंग के लिए ज़रूरी है: आपका नाम, मोबाइल नंबर, अगर आप देना चाहें तो ईमेल, विज़िट का कारण, और आपकी पसंद का दिन, समय, क्लिनिक और डेंटिस्ट।"),
      s("We do not ask for Aadhaar, date of birth, medical history, insurance numbers or photos on the website. Please do not share medical details in the form. We will ask at your visit.",
        "हम वेबसाइट पर आधार, जन्मतिथि, मेडिकल हिस्ट्री, इंश्योरेंस नंबर या फ़ोटो नहीं माँगते। कृपया फ़ॉर्म में मेडिकल जानकारी न लिखें। यह हम विज़िट पर पूछेंगे।"),
    ],
  },
  {
    id: "why",
    title: s("Why we use it", "हम इसका उपयोग क्यों करते हैं"),
    body: [
      s("To confirm and manage your appointment by call, SMS or WhatsApp. Pressing the booking button is your consent for this.",
        "आपके अपॉइंटमेंट की पुष्टि और प्रबंधन के लिए, कॉल, SMS या WhatsApp पर। बुकिंग बटन दबाना इसके लिए आपकी सहमति है।"),
      s("Check-up reminders and clinic updates are sent only if you tick that box. It is never ticked for you and never a condition of booking.",
        "चेक-अप रिमाइंडर और क्लिनिक की जानकारी तभी भेजी जाती है जब आप वह बॉक्स चुनें। यह पहले से चुना नहीं होता और बुकिंग की शर्त नहीं है।"),
    ],
  },
  {
    id: "keep",
    title: s("How long we keep it", "हम इसे कितने समय रखते हैं"),
    body: [
      s("We keep appointment requests for 12 months, then delete them if you have not visited.",
        "हम अपॉइंटमेंट अनुरोध 12 महीने रखते हैं, और अगर आप विज़िट पर नहीं आए तो फिर मिटा देते हैं।"),
      s("Once treatment starts, your clinical records are kept in the clinic's own records system for as long as the Dental Council of India requires (at least 3 years), not on this website.",
        "इलाज शुरू होने के बाद आपके क्लिनिकल रिकॉर्ड क्लिनिक के अपने रिकॉर्ड सिस्टम में रखे जाते हैं, जितने समय डेंटल काउंसिल ऑफ़ इंडिया कहती है (कम से कम 3 साल), इस वेबसाइट पर नहीं।"),
    ],
  },
  {
    id: "rights",
    title: s("Your choices", "आपके अधिकार"),
    body: [
      s("You can ask to see your details, correct them or delete them, and you can withdraw your consent at any time, at {contact}. We reply within 90 days at most.",
        "आप {contact} पर अपनी जानकारी देखने, सुधारने या मिटाने को कह सकते हैं, और कभी भी अपनी सहमति वापस ले सकते हैं। हम अधिकतम 90 दिनों में जवाब देते हैं।"),
      s("If your details are ever exposed in a breach, we will tell you and the Data Protection Board of India.",
        "अगर कभी किसी चूक से आपकी जानकारी उजागर होती है, तो हम आपको और डेटा प्रोटेक्शन बोर्ड ऑफ़ इंडिया को बताएँगे।"),
    ],
  },
  {
    id: "complaints",
    title: s("Complaints", "शिकायत"),
    body: [
      s("Please raise any concern with us first, at {contact}. If you are not satisfied with our answer, you can complain to the Data Protection Board of India.",
        "कोई भी चिंता पहले हमें {contact} पर बताएँ। अगर आप हमारे जवाब से संतुष्ट नहीं हैं, तो आप डेटा प्रोटेक्शन बोर्ड ऑफ़ इंडिया में शिकायत कर सकते हैं।"),
    ],
  },
  {
    id: "children",
    title: s("Booking for a child", "बच्चे के लिए बुकिंग"),
    body: [
      s("A parent or guardian books for a child, using their own name and number, and gives consent on the child's behalf. We use a child's details only to provide their dental care, never for marketing.",
        "बच्चे के लिए माता-पिता या अभिभावक अपने नाम और नंबर से बुक करते हैं और बच्चे की ओर से सहमति देते हैं। हम बच्चे की जानकारी केवल उसके दाँतों के इलाज के लिए उपयोग करते हैं, कभी मार्केटिंग के लिए नहीं।"),
    ],
  },
];
