/**
 * TEMPLATE s3: PLAY SCHOOL AND PRE-PRIMARY.
 *
 * Segment: an independent play school in a city, Playgroup to UKG, children
 * from two to six. Not a franchise: one house, one founder, four groups.
 * Registry: Warm family, `crayon` theme, hero B: an arched photo window with
 * a round age sticker. (Was `riverside`: teal and terracotta, rounded, the
 * name on a deep teal ground). See ../index.ts.
 *
 * WHO READS IT, AND WHAT THEY ASK FIRST. The parent of a two- or
 * three-year-old, often both parents working, reading on a phone at night.
 * The play-school checklists parents use (and the questions preschools list
 * for a visit) come back to the same six: is it SAFE (a locked gate, CCTV,
 * who may collect my child), how many children to a TEACHER, how does
 * SETTLING IN work and will my child cry, what does my child EAT, what is the
 * DAY like, and is there DAYCARE after it. There is no board and no result.
 * So:
 *   - the tagline carries the ratio, the kitchen and the settling-in;
 *   - `about` answers safety as procedure (locked gate, sign-in, a pick-up
 *     card with a photograph, cameras everywhere except the washrooms), not
 *     as an adjective;
 *   - the founder's message answers "will my child cry" in so many words;
 *   - each age band prints its ratio and its hours, and its `detail` says
 *     what actually happens that year (settling in, no letters yet, reading
 *     aloud by March);
 *   - the notices are a fever rule, a lunch menu, a festival day and the
 *     parent meetings, which is what a play school's WhatsApp group carries;
 *   - `results` carries the four figures a play-school parent asks for
 *     (the ratio, Class I admissions, the cameras, the settling in), not a
 *     board result, which a play school does not have.
 *
 * THE "BOARD" LINE. A play school has no board, and leaving the line blank
 * would put "add your board" in the closing list of a filled template. NCF
 * Foundational Stage (NCERT's 2022 framework for ages three to eight) is what
 * a play school in 2026 actually says it follows, so the line names it, with
 * the example registration pattern.
 *
 * THE INSTITUTE DOES NOT EXIST. Gilhari is the squirrel; a search on 26
 * September 2026 found no play school or preschool called Gilhari House.
 * Vijay Nagar is a real part of Indore; nothing here describes a real school
 * in it. The phone, email, street, PIN and registration line are the
 * reserved fiction patterns in ../shape.ts.
 */

import { SCHOOL_PAGE_SETS } from "../../site/pageSets";
import { defineTemplateContent } from "../shape";

/*
 * MULTI-PAGE CONTENT (26 September 2026). s3 is the 11-page play-school site:
 * Home, Programmes (the age groups, daycare and a day in the life), Admissions
 * (age checker and fees by programme), Safety and care, Our team, Facilities,
 * Gallery, News, Parents (app, lunch menu), Transport, Contact. No Results,
 * no Academics, no Disclosure: a play school has no board. The site is
 * English-first; every text field also carries its Hindi in its own `hi` block.
 * Forms for 2027-28 open on 2 November 2026, so `admissionsOpenUntil` is left
 * empty and the "open until" chip stays hidden until the school sets it.
 */
export default defineTemplateContent("school", {
  /* ── KEPT: the page list for this segment ────────────────────────────── */
  sitePages: [...SCHOOL_PAGE_SETS["s3-play-school"]],

  /* ── KEPT (rule "stock"): the template's stock photographs. Licensed
        stock from public/demo/img, alt text from its manifest, describing
        the scene only. A duplicate carries them and the admin checklist
        says "Photos are stock photos from the template" until Mehdi
        replaces the hero with the institute's own. ───────────────────── */
  heroImage: "/demo/img/school/hero-playschool-drawing-800.webp",
  sectionPhotos: {
    campus: "/demo/img/school/playschool-room-640.webp",
    academics: "/demo/img/school/playschool-floor-circle-640.webp",
    admissions: "/demo/img/school/playschool-kindergarten-group-640.webp",
    transport: "/demo/img/school/transport-school-van-640.webp",
    activities: "/demo/img/school/playschool-playground-640.webp",
  },

  /* ── CLEARED: the session being recruited for ────────────────────────── */
  sessionLabel: "2027-28",
  hi: {
    tagline: "एक बड़े पर ज़्यादा से ज़्यादा दस बच्चे, अपनी रसोई का खाना, और स्कूल में घुलना-मिलना *आपके बच्चे की रफ़्तार से*।",
    about: "गिलहरी हाउस दो से छह साल के बच्चों का प्ले स्कूल है, इंदौर के विजय नगर में एक पुराने बंगले में। यह 2015 में नौ बच्चों के साथ शुरू हुआ और आज यहाँ चार ग्रुप में 66 बच्चे हैं, और किसी भी ग्रुप में एक बड़े पर दस से ज़्यादा बच्चे नहीं। गेट पूरे दिन बंद रहता है, हर आने वाला रजिस्टर में नाम लिखता है, और बच्चा सिर्फ़ उसी बड़े के साथ घर जाता है जिसका नाम और फ़ोटो पिक-अप कार्ड पर है। वॉशरूम को छोड़कर हर कमरे में कैमरे हैं। लंच हर सुबह हमारी अपनी रसोई में बनता है: कोई पैकेट वाला खाना नहीं, कोई मीठा ड्रिंक नहीं। नौकरी करने वाले माता-पिता के लिए डे-केयर शाम 6:30 बजे तक खुला रहता है।",
    vision: "ऐसे बच्चे जो बड़े स्कूल में जिज्ञासा लेकर पहुँचें, पूरी कहानी बैठकर सुन सकें, मदद माँग सकें और अपनी बारी का इंतज़ार कर सकें, और जिन्हें अपना पहला स्कूल एक खुशहाल घर की तरह याद रहे।",
    mission: "छोटे ग्रुप, हर दिन वही दो बड़े, अपनी रसोई का खाना, बंद गेट, और जब तक बच्चा पेंसिल पकड़ने लायक न हो, कोई वर्कशीट नहीं।",
    principalTitle: "संस्थापक",
    principalMessage: "मैंने गिलहरी हाउस अपने ही घर के ग्राउंड फ़्लोर पर नौ बच्चों के साथ शुरू किया। पहली बार आने पर अभिभावक मुझसे दो बातें पूछते हैं: क्या मेरा बच्चा रोएगा, और उसके साथ कौन रहेगा। कुछ बच्चे रोते हैं, कुछ दिन। और हर दिन वही दो टीचर उसके साथ रहेंगी, और पहले हफ़्ते के अंत तक उन्हें पता होगा कि आपका बच्चा किस बात पर हँसता है। किसी भी कार्य-दिवस पर सुबह 10:30 बजे आइए और दरवाज़े से सर्कल टाइम देखिए।",
    resultsHeading: "वे आँकड़े जो अभिभावक हमसे पूछते हैं।",
    resultsNote: "इस हिस्से का हर आँकड़ा उदाहरण है, जिसे Ideovent ने यह दिखाने के लिए रखा है कि प्ले स्कूल अभिभावकों के सवालों का जवाब कैसे दे सकता है। आपके अपने आँकड़े इसकी जगह लाइन दर लाइन आएँगे, ठीक वैसे ही जैसे आप छापते हैं।",
    admissionsHeadline: "2027-28 के एडमिशन सोमवार 2 नवंबर 2026 से शुरू",
    sessionLabel: "2027-28",
  },
  vision: "Children who arrive at big school curious, able to sit through a story, ask for help and wait their turn, and who remember their first school as a happy house.",
  mission: "Small groups, the same two adults every day, food from our own kitchen, a locked gate, and no worksheets before a child is ready to hold a pencil.",

  /* ── CLEARED: the proof row. The ratio is printed, not counted. ───────── */
  stats: [
    { value: "66", label: "Children, in four groups", basis: "Enrolment on 1 September 2026", hi: { label: "बच्चे, चार ग्रुप में", basis: "1 सितंबर 2026 का नामांकन" } },
    { value: "1:10", label: "Most children to one adult, in any group", basis: "Playgroup runs at 1:6", hi: { label: "किसी भी ग्रुप में एक बड़े पर ज़्यादा से ज़्यादा बच्चे", basis: "प्ले ग्रुप में 1:6" } },
    { value: "14", label: "Cameras in rooms and play areas", basis: "None in the washrooms", hi: { label: "कमरों और खेलने की जगहों में कैमरे", basis: "वॉशरूम में एक भी नहीं" } },
    { value: "11", label: "Years in the same house", basis: "Open since June 2015", hi: { label: "साल, उसी घर में", basis: "जून 2015 से खुला" } },
  ],
  /* ── CLEARED ON DUPLICATE: identity ──────────────────────────────────── */
  instituteName: "Gilhari House Play School",
  tagline: "Ten children to an adult at most, lunch from our own kitchen, and settling in *at your child's pace*.",
  city: "Indore",
  state: "Madhya Pradesh",

  /* ── KEPT: market, language and currency ─────────────────────────────── */
  country: "India",
  market: "india",
  currency: "INR",

  /* ── CLEARED: history and the framework line ─────────────────────────── */
  established: "Founded 2015",
  establishedYear: "2015",
  boardOrAffiliation: "NCF Foundational Stage, example registration no. 00000000",

  about:
    "Gilhari House is a play school for children aged two to six, in a converted bungalow in Vijay Nagar, Indore. It opened in 2015 with nine children and now has 66, in four groups, and no group has more than ten children to one adult. The gate stays locked through the day, every visitor signs in, and a child goes home only with an adult named on the pick-up card, with a photograph. Cameras cover every room except the washrooms. Lunch is cooked in our own kitchen each morning: no packaged food, no sweet drinks. A daycare room stays open until 6:30 pm for working parents.",

  /* ── The head. Name and message CLEARED; the title is KEPT ───────────── */
  principalName: "Aparna Joshi",
  principalTitle: "Founder",
  principalMessage:
    "I started Gilhari House on the ground floor of my own home, with nine children. On a first visit, parents ask me two things: will my child cry, and who will be with them. Some do, for a few days. And the same two teachers will be with them every day, and by the end of the first week they will know what makes your child laugh. Come at 10:30 on any weekday and watch circle time from the doorway.",

  /* ── STRUCTURE: age bands. Name, level, subjects and timings are KEPT;
        seats, fee and detail are CLEARED, so the ratio and the fee live in
        `seats` and `fee`, and what happens that year lives in `detail`. ─── */
  courses: [
    {
      name: "Playgroup",
      level: "Ages 2 to 3",
      subjects: "Play, songs and rhymes, sand and water, first words, the toilet routine",
      timings: "9:30 am to 12:00 noon",
      seats: "12 children, two teachers",
      fee: "3,800",
      feeNote: "a month",
      detail: "The first fortnight is for settling in. A parent stays for the first hour on day one, and the time apart grows a little each day.",
      hi: { name: "प्ले ग्रुप", level: "2 से 3 साल", subjects: "खेल, गाने और कविताएँ, रेत और पानी, पहले शब्द, टॉयलेट की आदत", timings: "सुबह 9:30 से दोपहर 12 बजे तक", feeNote: "महीना", detail: "पहले पंद्रह दिन घुलने-मिलने के लिए हैं। पहले दिन पहला घंटा माता-पिता में से कोई साथ रहता है, और अलग रहने का समय रोज़ थोड़ा बढ़ता है।" },
    },
    {
      name: "Nursery",
      level: "Ages 3 to 4",
      subjects: "Talking and listening, colours and shapes, early numbers, rhymes in Hindi and English, outdoor play",
      timings: "9:00 am to 12:30 pm",
      seats: "16 children, a teacher and an assistant",
      fee: "4,300",
      feeNote: "a month",
      detail: "Children learn to hold a crayon properly this year. Nobody is asked to write letters yet.",
      hi: { name: "नर्सरी", level: "3 से 4 साल", subjects: "बोलना और सुनना, रंग और आकार, शुरुआती गिनती, हिंदी और इंग्लिश में कविताएँ, बाहर का खेल", timings: "सुबह 9 से दोपहर 12:30 बजे तक", feeNote: "महीना", detail: "इस साल बच्चे क्रेयॉन ठीक से पकड़ना सीखते हैं। अभी किसी से अक्षर लिखने को नहीं कहा जाता।" },
    },
    {
      name: "LKG",
      level: "Ages 4 to 5",
      subjects: "Phonics, pre-writing, numbers, stories, art, music and movement",
      timings: "9:00 am to 1:00 pm",
      seats: "18 children, a teacher and an assistant",
      fee: "4,700",
      feeNote: "a month",
      detail: "Letters are learnt by their sound first. Written work is one page a day at most, done in school and never sent home.",
      hi: { name: "LKG", level: "4 से 5 साल", subjects: "फ़ोनिक्स, लिखने की तैयारी, गिनती, कहानियाँ, आर्ट, संगीत और खेलकूद", timings: "सुबह 9 से दोपहर 1 बजे तक", feeNote: "महीना", detail: "अक्षर पहले उनकी आवाज़ से सिखाए जाते हैं। लिखने का काम दिन में ज़्यादा से ज़्यादा एक पन्ना, स्कूल में ही, कभी घर नहीं भेजा जाता।" },
    },
    {
      name: "UKG",
      level: "Ages 5 to 6",
      subjects: "Reading simple words, writing, adding with objects, the Hindi varnamala, nature walks",
      timings: "9:00 am to 1:00 pm",
      seats: "20 children, a teacher and an assistant",
      fee: "4,900",
      feeNote: "a month",
      detail: "By March every child reads a short picture book aloud to their teacher. We help families with the Class I forms for the schools they choose.",
      hi: { name: "UKG", level: "5 से 6 साल", subjects: "आसान शब्द पढ़ना, लिखना, चीज़ों से जोड़ना, हिंदी वर्णमाला, प्रकृति की सैर", timings: "सुबह 9 से दोपहर 1 बजे तक", feeNote: "महीना", detail: "मार्च तक हर बच्चा अपनी टीचर को एक छोटी चित्र-किताब ज़ोर से पढ़कर सुनाता है। आप जो स्कूल चुनें, उनके कक्षा 1 के फ़ॉर्म भरने में हम मदद करते हैं।" },
    },
    {
      name: "Daycare",
      level: "Ages 2 to 6, after the morning session",
      subjects: "Lunch, a nap, quiet play, outdoor time and a snack",
      timings: "Until 6:30 pm, Monday to Friday",
      seats: "20 children, two carers",
      fee: "2,500",
      feeNote: "a month, on top of the programme fee",
      detail: "Children stay in the same house with a carer they already know from the morning. Lights go down for the nap at 2:00 pm, and the snack at 4:30 is fruit and something from the kitchen.",
      hi: { name: "डे-केयर", level: "2 से 6 साल, सुबह के सेशन के बाद", subjects: "लंच, झपकी, शांत खेल, बाहर का समय और नाश्ता", timings: "शाम 6:30 बजे तक, सोमवार से शुक्रवार", feeNote: "महीना, प्रोग्राम फीस के अलावा", detail: "बच्चे उसी घर में रहते हैं, सुबह से जानी-पहचानी केयरटेकर के साथ। दोपहर 2 बजे झपकी के लिए लाइट धीमी होती है, और 4:30 बजे के नाश्ते में फल और रसोई का कुछ होता है।" },
    },
  ],

  /* ── CLEARED: a day in the life, for the Programmes page ─────────────── */
  dayPlan: [
    { label: "Arrival and free play", time: "9:00 am", subject: "Children are signed in at the gate and choose a corner: blocks, books or the kitchen set.", hi: { label: "आना और खुला खेल", time: "सुबह 9 बजे", subject: "गेट पर बच्चे का नाम दर्ज होता है और वह अपना कोना चुनता है: ब्लॉक्स, किताबें या किचन सेट।" } },
    { label: "Fruit", time: "10:15 am", subject: "Cut fruit at the low tables. Children pour their own water.", hi: { label: "फल", time: "सुबह 10:15", subject: "नीची मेज़ों पर कटे फल। बच्चे अपना पानी खुद डालते हैं।" } },
    { label: "Circle time", time: "10:30 am", subject: "The day's song, the weather, a story, and one thing each child wants to say.", hi: { label: "सर्कल टाइम", time: "सुबह 10:30", subject: "दिन का गाना, मौसम, एक कहानी, और हर बच्चा एक बात जो वह कहना चाहे।" } },
    { label: "Outdoors", time: "11:00 am", subject: "Sand, slides and swings, or the veranda when it rains.", hi: { label: "बाहर का खेल", time: "सुबह 11 बजे", subject: "रेत, फिसलपट्टी और झूले, या बारिश हो तो बरामदा।" } },
    { label: "Activity", time: "11:40 am", subject: "Painting, clay, music and movement, or pre-writing for LKG and UKG.", hi: { label: "एक्टिविटी", time: "सुबह 11:40", subject: "पेंटिंग, मिट्टी, संगीत और खेलकूद, या LKG और UKG के लिए लिखने की तैयारी।" } },
    { label: "Lunch", time: "12:15 pm", subject: "Cooked that morning in our kitchen. Teachers eat with the children.", hi: { label: "लंच", time: "दोपहर 12:15", subject: "उसी सुबह हमारी रसोई में बना। टीचर बच्चों के साथ खाती हैं।" } },
    { label: "Home time", time: "12:30 to 1:00 pm", subject: "One name called at a time, to an adult on the pick-up card.", hi: { label: "घर जाने का समय", time: "दोपहर 12:30 से 1 बजे तक", subject: "एक बार में एक नाम पुकारा जाता है, पिक-अप कार्ड वाले बड़े को।" } },
    { label: "Daycare: nap, snack and play", time: "2:00 to 6:30 pm", subject: "A nap until 3:30, a snack at 4:30, outdoor play when it cools down.", hi: { label: "डे-केयर: झपकी, नाश्ता और खेल", time: "दोपहर 2 से शाम 6:30 बजे तक", subject: "3:30 तक झपकी, 4:30 बजे नाश्ता, धूप ढलने पर बाहर खेल।" } },
  ],

  /* ── CLEARED: the Safety and care page (needs two or more) ───────────── */
  safety: [
    { title: "A locked gate, and a sign-in book", body: "The gate is locked from 9:15 am until home time. Every visitor, parents included, signs in and wears a visitor card.", hi: { title: "बंद गेट और एंट्री रजिस्टर", body: "सुबह 9:15 से छुट्टी तक गेट बंद रहता है। हर आने वाला, अभिभावक भी, रजिस्टर में नाम लिखता है और विज़िटर कार्ड पहनता है।" } },
    { title: "Only the adults on the pick-up card", body: "Each child has a card with photographs of up to four adults. Anyone else needs a call from a parent and a photograph on WhatsApp, every time.", hi: { title: "सिर्फ़ पिक-अप कार्ड वाले बड़े", body: "हर बच्चे के कार्ड पर ज़्यादा से ज़्यादा चार बड़ों की फ़ोटो होती है। किसी और के लिए हर बार माता-पिता का फ़ोन और WhatsApp पर फ़ोटो ज़रूरी है।" } },
    { title: "Cameras in every room, never in the washrooms", body: "Fourteen cameras, recorded for thirty days. A parent may ask to see a clip of their own child's room at the office. There is no public live feed.", hi: { title: "हर कमरे में कैमरा, वॉशरूम में कभी नहीं", body: "चौदह कैमरे, तीस दिन की रिकॉर्डिंग। अभिभावक ऑफ़िस में अपने बच्चे के कमरे की क्लिप देखने को कह सकते हैं। कोई पब्लिक लाइव फ़ीड नहीं है।" } },
    { title: "Women staff for washroom help", body: "Only women staff help a child in the washroom, and the washroom door is never locked from inside.", hi: { title: "वॉशरूम में मदद सिर्फ़ महिला स्टाफ़ की", body: "वॉशरूम में बच्चे की मदद सिर्फ़ महिला स्टाफ़ करती है, और वॉशरूम का दरवाज़ा अंदर से कभी बंद नहीं होता।" } },
    { title: "Police-verified staff", body: "Every teacher, carer, cook, driver and helper is police verified before their first day, and again every two years.", hi: { title: "पुलिस वेरिफ़ाइड स्टाफ़", body: "हर टीचर, केयरटेकर, रसोइया, ड्राइवर और हेल्पर पहले दिन से पहले पुलिस से वेरिफ़ाई होता है, और फिर हर दो साल में।" } },
    { title: "Illness, allergies and first aid", body: "A child with a fever stays home for a full day after it breaks. Allergies are on a list in the kitchen and on the classroom door. Two staff in every group hold a paediatric first-aid certificate.", hi: { title: "बीमारी, एलर्जी और फ़र्स्ट एड", body: "बुखार वाला बच्चा बुखार उतरने के बाद भी पूरा एक दिन घर पर रहता है। एलर्जी की सूची रसोई में और क्लास के दरवाज़े पर लगी है। हर ग्रुप में दो स्टाफ़ के पास बच्चों के फ़र्स्ट एड का सर्टिफ़िकेट है।" } },
    { title: "Fire drill each term", body: "The children practise leaving the house in a line to the front garden, once a term, so it feels like a game.", hi: { title: "हर टर्म फ़ायर ड्रिल", body: "टर्म में एक बार बच्चे लाइन बनाकर घर से सामने के बगीचे तक निकलने का अभ्यास करते हैं, ताकि यह खेल जैसा लगे।" } },
  ],

  /* ── CLEARED: results. A play school has no board result, but it has the
        four figures its parents do ask for: the ratio, where UKG goes for
        Class I, the cameras and the settling in. Leaving the list empty did
        not drop the question: the page moved "your published results go
        here" into a closing "what we still need from you" block, which a
        filled template must never show. No student and no school named. ── */
  resultsHeading: "The figures parents ask us for.",
  resultsNote:
    "Every figure in this section is example content, placed by Ideovent to show how a play school can report what parents ask about. Your own figures replace it line for line, exactly as you publish them.",
  results: [
    { achievement: "8 of 10 Playgroup children settled within the first week", exam: "Playgroup settling in", year: "2026", note: "The other two by the third week", hi: { achievement: "प्ले ग्रुप के 10 में से 8 बच्चे पहले हफ़्ते में घुल-मिल गए", note: "बाकी दो तीसरे हफ़्ते तक" } },
    { achievement: "19 of 20 UKG children in their first-choice school", exam: "Class I admissions", year: "2026", hi: { achievement: "UKG के 20 में से 19 बच्चों को पहली पसंद का स्कूल मिला" } },
    { achievement: "2 parent meetings a term, with a written note on your child", note: "Speech, play, friendships and eating", hi: { achievement: "हर टर्म 2 पैरेंट-टीचर मीटिंग, बच्चे पर लिखे नोट के साथ", note: "बोलना, खेल, दोस्ती और खाना" } },
    { achievement: "2 weeks of settling in, with a parent close by", note: "Longer if your child needs it", hi: { achievement: "घुलने-मिलने के 2 हफ़्ते, माता-पिता पास में", note: "बच्चे को ज़रूरत हो तो ज़्यादा" } },
  ],

  /* ── KEPT WORD FOR WORD: facilities. What nearly every play school has.
        "Lead: line" becomes a tile heading and one line under it, so the
        line after the colon is written as generic as the heading. The
        daycare room and the kitchen are in `about`, which is cleared. ───── */
  facilities: [
    "Outdoor play area: sand, slides and swings",
    "Child-sized washrooms, cleaned through the day",
    "Reading corner: picture books in Hindi and English",
    "Activity room: music, movement, painting and clay",
    "CCTV in the classrooms and play areas",
    "First aid, and staff trained to give it",
  ],

  /* ── CLEARED: faculty. Fictional names; each photo is a stock portrait (a
        licensed model, never the teacher), kept on duplicate for a row that
        survives, and never the same person twice. ───────── */
  faculty: [
    { name: "Aparna Joshi", photo: "/demo/img/people/teacher-w10-240.webp", role: "Founder", group: "Leadership", qualification: "M.A. Child Development", experience: "Opened the school in 2015", style: "Is at the gate every morning at 9:00.", hi: { group: "प्रबंधन", role: "संस्थापक", qualification: "M.A. चाइल्ड डेवलपमेंट", experience: "2015 में स्कूल शुरू किया", style: "हर सुबह 9 बजे गेट पर रहती हैं।" } },
    { name: "Ruchi Malviya", photo: "/demo/img/people/teacher-w11-240.webp", role: "Class teacher", group: "Teachers", subject: "Playgroup", qualification: "Diploma in Early Childhood Care and Education", experience: "10 years, here since 2016", style: "Sits on the floor for most of the morning, at the children's height.", hi: { group: "टीचर्स", role: "क्लास टीचर", subject: "प्ले ग्रुप", qualification: "अर्ली चाइल्डहुड केयर एंड एजुकेशन में डिप्लोमा", experience: "10 साल, 2016 से यहाँ", style: "सुबह का ज़्यादातर समय ज़मीन पर, बच्चों की ऊँचाई पर बैठती हैं।" } },
    { name: "Sana Qureshi", photo: "/demo/img/people/teacher-w09-240.webp", role: "Class teacher", group: "Teachers", subject: "Nursery", qualification: "B.A., Nursery Teacher Training", experience: "6 years", style: "Every rhyme comes with actions, in Hindi and in English.", hi: { group: "टीचर्स", role: "क्लास टीचर", subject: "नर्सरी", qualification: "B.A., नर्सरी टीचर ट्रेनिंग", experience: "6 साल", style: "हर कविता हाव-भाव के साथ, हिंदी में भी और इंग्लिश में भी।" } },
    { name: "Deepa Raghuvanshi", photo: "/demo/img/people/teacher-w02-240.webp", role: "Class teacher", group: "Teachers", subject: "LKG", qualification: "B.Ed., Montessori certificate", experience: "11 years", hi: { group: "टीचर्स", role: "क्लास टीचर", subject: "LKG", qualification: "B.Ed., मॉन्टेसरी सर्टिफ़िकेट", experience: "11 साल" } },
    { name: "Meghna Rathore", photo: "/demo/img/people/teacher-w08-240.webp", role: "Class teacher", group: "Teachers", subject: "UKG", qualification: "M.A. English, B.Ed.", experience: "7 years, and keeps the reading corner", hi: { group: "टीचर्स", role: "क्लास टीचर", subject: "UKG", qualification: "M.A. इंग्लिश, B.Ed.", experience: "7 साल, और रीडिंग कॉर्नर संभालती हैं" } },
    { name: "Tarun Soni", photo: "/demo/img/people/teacher-m02-240.webp", group: "Specialists", subject: "Music and movement", qualification: "B.P.A. Music", experience: "Every group, twice a week", hi: { group: "विशेषज्ञ", subject: "संगीत और खेलकूद", qualification: "B.P.A. संगीत", experience: "हर ग्रुप, हफ़्ते में दो बार" } },
    { name: "Kamini Tiwari", photo: "/demo/img/people/teacher-w12-240.webp", role: "Daycare lead", group: "Care", subject: "Daycare", qualification: "Early childhood diploma, first-aid certified", experience: "Runs the afternoon room until 6:30 pm", hi: { group: "देखभाल", role: "डे-केयर इंचार्ज", subject: "डे-केयर", qualification: "अर्ली चाइल्डहुड डिप्लोमा, फ़र्स्ट एड सर्टिफ़ाइड", experience: "शाम 6:30 बजे तक दोपहर का कमरा संभालती हैं" } },
    { name: "Shobha Bai", photo: "/demo/img/people/teacher-w07-240.webp", role: "Cook", group: "Care", subject: "The kitchen", experience: "Here since the first day in 2015", note: "Plans the monthly menu with the founder and the parents' committee.", hi: { group: "देखभाल", role: "रसोइया", subject: "रसोई", experience: "2015 में पहले दिन से यहाँ", note: "संस्थापक और पैरेंट्स कमेटी के साथ हर महीने का मेन्यू बनाती हैं।" } },
  ],

  /* ── CLEARED: the Facilities page, grouped ───────────────────────────── */
  facilityDetails: [
    { title: "Front garden and sand pit", body: "Grass, a covered sand pit, two slides and four swings, all on soft ground and inside the locked gate.", group: "Outdoors", hi: { title: "सामने का बगीचा और रेत का गड्ढा", body: "घास, ढका हुआ रेत का गड्ढा, दो फिसलपट्टी और चार झूले, सब नरम ज़मीन पर और बंद गेट के अंदर।", group: "बाहर" } },
    { title: "Veranda for rainy days", body: "A covered play space along the house, so outdoor time happens in the monsoon too.", group: "Outdoors", hi: { title: "बारिश के दिनों के लिए बरामदा", body: "घर के साथ-साथ ढकी हुई खेलने की जगह, ताकि मानसून में भी बाहर का समय हो।", group: "बाहर" } },
    { title: "Four group rooms", body: "One per group, on the ground floor, each with low shelves, a reading mat and a window onto the garden.", group: "Indoors", hi: { title: "चार ग्रुप रूम", body: "हर ग्रुप का एक कमरा, ग्राउंड फ़्लोर पर, नीची अलमारियाँ, पढ़ने की दरी और बगीचे की तरफ़ खिड़की।", group: "अंदर" } },
    { title: "Activity room", body: "Music, movement, painting and clay. The floor is washable and so, mostly, are the children.", group: "Indoors", hi: { title: "एक्टिविटी रूम", body: "संगीत, खेलकूद, पेंटिंग और मिट्टी। फ़र्श धुल जाता है, और ज़्यादातर बच्चे भी।", group: "अंदर" } },
    { title: "Our own kitchen", body: "Lunch and snacks are cooked here every morning. No packaged food, no sweet drinks, and the week's menu is on the door.", group: "Care", hi: { title: "हमारी अपनी रसोई", body: "लंच और नाश्ता हर सुबह यहीं बनता है। कोई पैकेट वाला खाना नहीं, कोई मीठा ड्रिंक नहीं, और हफ़्ते का मेन्यू दरवाज़े पर लगा है।" } },
    { title: "Nap room", body: "Low beds with a sheet for each child, washed every Friday, for the daycare children after lunch.", group: "Care", hi: { title: "झपकी का कमरा", body: "डे-केयर के बच्चों के लिए लंच के बाद नीचे बिस्तर, हर बच्चे की अलग चादर, हर शुक्रवार धुलती है।" } },
    { title: "Child-sized washrooms", body: "Low basins and toilets, cleaned through the day, with a woman helper always nearby.", group: "Care", hi: { title: "बच्चों के नाप के वॉशरूम", body: "नीचे वॉशबेसिन और टॉयलेट, दिन भर सफ़ाई, और पास में हमेशा एक महिला हेल्पर।" } },
  ],

  /* ── STOCK photos for the Gallery chips: src and category kept on
        duplicate, alt and caption cleared. Captions describe the scene. ─── */
  photos: [
    { src: "/demo/img/school/playschool-floor-circle-640.webp", alt: "Young children sitting in a circle on the classroom floor", caption: "Circle time on the floor", category: "Our day", hi: { alt: "कक्षा के फ़र्श पर घेरा बनाकर बैठे छोटे बच्चे", caption: "ज़मीन पर सर्कल टाइम", category: "हमारा दिन" } },
    { src: "/demo/img/school/hero-playschool-drawing-800.webp", alt: "Two young girls drawing with crayons at a table in a bright classroom", caption: "Drawing with crayons", category: "Art", hi: { alt: "रोशन कक्षा में दो छोटी लड़कियाँ मेज़ पर क्रेयॉन से चित्र बना रही हैं", caption: "क्रेयॉन से ड्रॉइंग", category: "आर्ट" } },
    { src: "/demo/img/school/playschool-playground-640.webp", alt: "A colourful playground with slides next to a school building", caption: "Slides in the playground", category: "Outdoors", hi: { alt: "स्कूल की इमारत के पास फिसलपट्टी वाला रंगीन खेल का मैदान", caption: "खेल के मैदान में फिसलपट्टी", category: "बाहर" } },
    { src: "/demo/img/school/playschool-kindergarten-group-640.webp", alt: "Kindergarten children in checked uniforms sitting close together", caption: "Friends sitting together", category: "Our day", hi: { alt: "चेक यूनिफ़ॉर्म में पास-पास बैठे नर्सरी के बच्चे", caption: "साथ बैठे दोस्त", category: "हमारा दिन" } },
    { src: "/demo/img/school/classroom-hindi-alphabet-wall-640.webp", alt: "Smiling children sitting in front of a wall painted with Hindi and English letters", caption: "In front of the alphabet wall", category: "Our day", hi: { alt: "हिंदी और अंग्रेज़ी अक्षरों से रंगी दीवार के सामने बैठे मुस्कुराते बच्चे", caption: "अक्षरों वाली दीवार के सामने", category: "हमारा दिन" } },
    { src: "/demo/img/school/playschool-room-640.webp", alt: "An empty bright play room with small wooden chairs, toys and a green rug", caption: "A play room before the children arrive", category: "Our day", hi: { alt: "छोटी लकड़ी की कुर्सियों, खिलौनों और हरे कालीन वाला खाली रोशन प्ले रूम", caption: "बच्चों के आने से पहले खेल का कमरा", category: "हमारा दिन" } },
    { src: "/demo/img/school/classroom-slates-640.webp", alt: "Young children practising Hindi letters on slates while sitting on the floor", caption: "First letters on slates", category: "Our day", hi: { alt: "ज़मीन पर बैठकर स्लेट पर हिंदी अक्षर लिखना सीखते छोटे बच्चे", caption: "स्लेट पर पहले अक्षर", category: "हमारा दिन" } },
  ],

  /* ── CLEARED: gallery. Captions only; they are also the shot list. ───── */
  gallery: [
    { src: "", alt: "Circle time in Nursery, 10:30 am." },
    { src: "", alt: "The sand pit after the first rain of June." },
    { src: "", alt: "Lunch at the low tables. Monday is moong dal khichdi." },
    { src: "", alt: "Pick-up at the gate, one name called at a time." },
    { src: "", alt: "LKG painting with their hands, and then washing them." },
    { src: "", alt: "The daycare room at 2:00 pm, lights down for the nap." },
  ],

  /* ── CLEARED: the admissions line and its dates ──────────────────────── */
  admissionsHeadline: "Admissions for 2027-28 open on Monday 2 November 2026",
  admissions: {
    /* CLEARED. One row per line; the text before the first colon heads it. */
    dates: [
      "Open mornings, Saturday 10 and 17 October: 10:00 am to 12:00 noon. Bring your child.",
      "Forms for 2027-28 from Monday 2 November: at the office, or on WhatsApp",
      "Settling-in week, 5 to 9 April 2027: shorter days, with a parent close by",
      "Playgroup, all year: a child may join in the month they turn two",
    ].join("\n"),
    /* KEPT, so generic: how any play school takes a child. */
    steps: [
      "Call or send a WhatsApp message to book a visit.",
      "Visit with your child on a weekday morning and see the room your child would join.",
      "Fill in the admission form, with your child's health, food and allergy details.",
      "Plan the settling-in days with the class teacher before the first day.",
    ],
    /* KEPT, so generic. The pick-up photographs are what a play school
       actually asks for, and they are how the gate rule works. */
    documents: [
      "Birth certificate",
      "Immunisation record",
      "Aadhaar of the child and of a parent",
      "Photographs of the child, and of every adult who will collect the child",
      "Emergency contact details and any medical or allergy notes",
    ],
    /* CLEARED */
    note: "Fees are paid each quarter and cover lunch, snacks and every material used in class. Daycare is ₹2,500 a month extra. There is no admission fee for a younger brother or sister.",
    whoCanApply: "Children aged two to six. Playgroup takes a child in the month they turn two, all year round; Nursery, LKG and UKG start in April.",
    timeline: [
      { title: "Open mornings", date: "Saturday 10 and 17 October 2026", body: "10:00 am to 12:00 noon. Bring your child.", hi: { title: "ओपन मॉर्निंग", date: "शनिवार 10 और 17 अक्टूबर 2026", body: "सुबह 10 से दोपहर 12 बजे तक। बच्चे को साथ लाइए।" } },
      { title: "Forms for 2027-28", date: "From Monday 2 November 2026", body: "At the office, or on WhatsApp.", hi: { title: "2027-28 के फ़ॉर्म", date: "सोमवार 2 नवंबर 2026 से", body: "ऑफ़िस पर, या WhatsApp पर।" } },
      { title: "A morning with the class teacher", date: "November to February", body: "Your child plays in the room for an hour while you talk to the teacher. It is not a test.", hi: { title: "क्लास टीचर के साथ एक सुबह", date: "नवंबर से फ़रवरी", body: "आप टीचर से बात करते हैं, तब तक बच्चा एक घंटा कमरे में खेलता है। यह कोई टेस्ट नहीं है।" } },
      { title: "Settling-in week", date: "5 to 9 April 2027", body: "Shorter days, with a parent close by.", hi: { title: "घुलने-मिलने का हफ़्ता", date: "5 से 9 अप्रैल 2027", body: "छोटे दिन, माता-पिता पास में।" } },
    ],
    fees: [
      { label: "Registration", amount: "₹1,000", period: "one-time", note: "With the form", hi: { label: "रजिस्ट्रेशन", note: "फ़ॉर्म के साथ" } },
      { label: "Admission fee", amount: "₹8,000", period: "one-time", note: "None for a younger brother or sister", hi: { label: "एडमिशन फीस", note: "छोटे भाई या बहन के लिए नहीं" } },
      { label: "Playgroup", amount: "₹3,800", period: "monthly", note: "Paid quarterly, lunch and materials included", hi: { label: "प्ले ग्रुप", note: "हर तिमाही, लंच और सामान शामिल" } },
      { label: "Nursery", amount: "₹4,300", period: "monthly", note: "Paid quarterly, lunch and materials included", hi: { label: "नर्सरी", note: "हर तिमाही, लंच और सामान शामिल" } },
      { label: "LKG", amount: "₹4,700", period: "monthly", note: "Paid quarterly, lunch and materials included", hi: { note: "हर तिमाही, लंच और सामान शामिल" } },
      { label: "UKG", amount: "₹4,900", period: "monthly", note: "Paid quarterly, lunch and materials included", hi: { note: "हर तिमाही, लंच और सामान शामिल" } },
      { label: "Daycare until 6:30 pm", amount: "₹2,500", period: "also", note: "Monthly, only if you use it", hi: { label: "डे-केयर, शाम 6:30 बजे तक", note: "हर महीने, सिर्फ़ लेने पर" } },
      { label: "School van", amount: "₹1,600 to ₹2,200", period: "also", note: "Monthly, by distance", hi: { label: "स्कूल वैन", note: "हर महीने, दूरी के हिसाब से" } },
      { label: "Uniform and bag", amount: "About ₹1,800", period: "also", note: "Once a year. No costume or event fees", hi: { label: "यूनिफ़ॉर्म और बैग", note: "साल में एक बार। कोई पोशाक या कार्यक्रम फीस नहीं" } },
    ],
    feeNote: "Fees are paid each quarter, in April, July, October and January, and are not raised during the year. Nothing else is charged through the year: no costume fee for the annual day, no picnic fee, no book fee.",
    ageAsOn: "31 March 2027",
    ageRules: [
      { className: "Playgroup", minAge: "2", maxAge: "3" },
      { className: "Nursery", minAge: "3", maxAge: "4" },
      { className: "LKG", minAge: "4", maxAge: "5" },
      { className: "UKG", minAge: "5", maxAge: "6" },
    ],
    rteNote: "Gilhari House is a pre-school only, so the RTE 25% seats do not apply here. They apply at the entry class of the school your child joins next, and we help families fill in those forms.",
    hi: {
      dates: [
        "ओपन मॉर्निंग, शनिवार 10 और 17 अक्टूबर: सुबह 10 से दोपहर 12 बजे तक। बच्चे को साथ लाइए।",
        "2027-28 के फ़ॉर्म, सोमवार 2 नवंबर से: ऑफ़िस पर, या WhatsApp पर",
        "घुलने-मिलने का हफ़्ता, 5 से 9 अप्रैल 2027: छोटे दिन, माता-पिता पास में",
        "प्ले ग्रुप, पूरे साल: बच्चा उसी महीने आ सकता है जब वह दो साल का हो",
      ].join("\n"),
      note: "फीस हर तिमाही भरी जाती है, और इसमें लंच, नाश्ता और क्लास का सारा सामान शामिल है। डे-केयर ₹2,500 महीना अलग से। छोटे भाई या बहन के लिए कोई एडमिशन फीस नहीं।",
      whoCanApply: "दो से छह साल के बच्चे। प्ले ग्रुप में बच्चा पूरे साल, उसी महीने आ सकता है जब वह दो साल का हो; नर्सरी, LKG और UKG अप्रैल में शुरू होते हैं।",
      feeNote: "फीस हर तिमाही, अप्रैल, जुलाई, अक्टूबर और जनवरी में भरी जाती है, और साल के बीच में नहीं बढ़ती। साल भर और कुछ नहीं लिया जाता: वार्षिक उत्सव की पोशाक, पिकनिक या किताबों की कोई फीस नहीं।",
      rteNote: "गिलहरी हाउस सिर्फ़ प्री-स्कूल है, इसलिए RTE की 25% सीटें यहाँ लागू नहीं होतीं। वे आपके बच्चे के अगले स्कूल की पहली कक्षा में लागू होती हैं, और हम परिवारों को वे फ़ॉर्म भरने में मदद करते हैं।",
    },
  },

  /* ── CLEARED: questions. The two marked generic survive a duplicate. ─── */
  faq: [
    { title: "Will my child cry?", body: "Some children do, for the first few days. A parent stays close through the settling-in week, and the time apart grows a little each day.", group: "Admissions", generic: true, hi: { title: "क्या मेरा बच्चा रोएगा?", body: "कुछ बच्चे पहले कुछ दिन रोते हैं। घुलने-मिलने के हफ़्ते में माता-पिता पास रहते हैं, और अलग रहने का समय रोज़ थोड़ा बढ़ता है।", group: "एडमिशन" } },
    { title: "Can we visit before we apply?", body: "Yes. Book a visit and come with your child on a weekday morning, when the rooms are running as usual.", group: "Admissions", generic: true, hi: { title: "क्या आवेदन से पहले स्कूल देख सकते हैं?", body: "हाँ। समय बुक कीजिए और किसी कार्य-दिवस की सुबह बच्चे के साथ आइए, जब कमरों में रोज़ की तरह काम चल रहा हो।", group: "एडमिशन" } },
    { title: "What does my child need to bring?", body: "A change of clothes in a named bag, and a water bottle. Lunch, snacks, crayons and books are all ours.", group: "Daily life", hi: { title: "बच्चे को क्या लाना है?", body: "नाम लिखे बैग में एक जोड़ी कपड़े, और पानी की बोतल। लंच, नाश्ता, क्रेयॉन और किताबें सब हमारी तरफ़ से।", group: "रोज़ का दिन" } },
    { title: "My child is not toilet trained yet. Can they join?", body: "Yes, in Playgroup and Nursery. Send nappies for the first months and we will work on it together with you.", group: "Admissions", hi: { title: "मेरे बच्चे को अभी टॉयलेट की आदत नहीं है। क्या वह आ सकता है?", body: "हाँ, प्ले ग्रुप और नर्सरी में। पहले कुछ महीने डायपर भेजिए, और हम आपके साथ मिलकर यह आदत डालेंगे।", group: "एडमिशन" } },
    { title: "Is there a refund if we leave mid-year?", body: "The quarter's fee in progress is not refunded. Any quarter paid in advance is refunded in full with one month's notice.", group: "Fees", hi: { title: "साल के बीच में छोड़ने पर क्या फीस वापस मिलती है?", body: "चल रही तिमाही की फीस वापस नहीं होती। पहले से भरी गई किसी भी तिमाही की फीस एक महीने के नोटिस पर पूरी वापस होती है।", group: "फीस" } },
  ],

  /* ── CLEARED: notices. Newest first, one pinned. ─────────────────────── */
  notices: [
    {
      title: "Garba day, Friday 16 October",
      date: "25 September 2026",
      body: "Children may come in traditional clothes, and nothing needs to be bought new. Parents are welcome for the last half hour, from 12:00 noon.",
      pinned: true,
      kind: "event",
      posted: "2026-09-25",
      expires: "2026-10-16",
      hi: { title: "गरबा का दिन, शुक्रवार 16 अक्टूबर", date: "25 सितंबर 2026", body: "बच्चे पारंपरिक कपड़ों में आ सकते हैं, और कुछ नया ख़रीदने की ज़रूरत नहीं। आख़िरी आधे घंटे, दोपहर 12 बजे से, अभिभावक भी आ सकते हैं।" },
    },
    {
      title: "Parent meetings, Saturday 3 October",
      date: "22 September 2026",
      body: "Fifteen minutes with your child's class teacher, between 9:30 am and 1:00 pm. Pick a time on the sheet at the gate or on the class WhatsApp group.",
      kind: "event",
      posted: "2026-09-22",
      expires: "2026-10-03",
      hi: { title: "पैरेंट-टीचर मीटिंग, शनिवार 3 अक्टूबर", date: "22 सितंबर 2026", body: "बच्चे की क्लास टीचर के साथ पंद्रह मिनट, सुबह 9:30 से दोपहर 1 बजे के बीच। गेट पर रखी शीट पर या क्लास के WhatsApp ग्रुप पर समय चुनिए।" },
    },
    {
      title: "A fever means a day at home",
      date: "15 September 2026",
      body: "A child with a temperature of 100°F or more is sent home, and comes back after a full day without fever. It keeps the room well through the season.",
      kind: "notice",
      posted: "2026-09-15",
      expires: "2027-03-31",
      hi: { title: "बुखार है तो एक दिन घर पर", date: "15 सितंबर 2026", body: "100°F या उससे ज़्यादा बुखार वाले बच्चे को घर भेजा जाता है, और वह बुखार के बिना पूरा एक दिन बीतने के बाद लौटता है। इससे मौसम भर कमरा स्वस्थ रहता है।" },
    },
    {
      title: "The October lunch menu",
      date: "11 September 2026",
      body: "Moong dal khichdi on Monday, vegetable poha on Tuesday, rajma and rice on Wednesday, paratha and curd on Thursday, idli on Friday. Fruit every morning at 10:30.",
      kind: "notice",
      posted: "2026-09-11",
      expires: "2026-10-31",
      hi: { title: "अक्टूबर का लंच मेन्यू", date: "11 सितंबर 2026", body: "सोमवार को मूँग दाल की खिचड़ी, मंगलवार को सब्ज़ी वाला पोहा, बुधवार को राजमा चावल, गुरुवार को पराठा और दही, शुक्रवार को इडली। हर सुबह 10:30 बजे फल।" },
    },
  ],

  /* ── CLEARED: contact. The reserved fiction patterns only. ───────────── */
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "910000000000",
    email: "hello@example.com",
    addressLines: ["Gilhari House Play School", "14 Example Road, Scheme 54, Vijay Nagar", "Indore, Madhya Pradesh 452000"],
    hours: "Office open Monday to Saturday, 9:00 am to 4:00 pm. Daycare until 6:30 pm, Monday to Friday.",
    mapQuery: "Gilhari House Play School, Indore",
    landmark: "Two lanes behind the Scheme 54 vegetable market, the blue gate with the squirrel on it",
    transportDesk: "+91 00000 00000",
    hi: { hours: "ऑफ़िस सोमवार से शनिवार, सुबह 9 से शाम 4 बजे तक। डे-केयर शाम 6:30 बजे तक, सोमवार से शुक्रवार।", landmark: "स्कीम 54 सब्ज़ी मंडी के पीछे दो गली, गिलहरी वाला नीला गेट" },
  },

  /* ── CLEARED: parents' words. Fiction on its face. ───────────────────── */
  reviews: [
    {
      quote: "She cried for four mornings. On the fifth she let go of my hand at the gate and did not look back. Ruchi ma'am sent us a photo at 10:30 every one of those days.",
      relation: "Mother of a Playgroup child",
      hi: { quote: "वह चार सुबह रोई। पाँचवीं सुबह उसने गेट पर मेरा हाथ छोड़ा और पीछे मुड़कर नहीं देखा। उन सभी दिनों में रुचि मैम ने हमें हर दिन 10:30 बजे एक फ़ोटो भेजी।", relation: "प्ले ग्रुप की बच्ची की माँ" },
      source: "Example review written by Ideovent",
      consent: true,
    },
    {
      quote: "What sold us was the kitchen. We could see the dal being cooked when we came to visit.",
      relation: "Father of a child in LKG",
      hi: { quote: "हमें रसोई ने मना लिया। देखने आए तो दाल बनती हुई दिख रही थी।", relation: "LKG के बच्चे के पिता" },
      source: "Example review written by Ideovent",
      consent: true,
    },
    {
      quote: "Both of us work, and daycare in the same house meant our son never had to change places at 1:00 pm.",
      relation: "Parents of a child in Nursery and daycare",
      hi: { quote: "हम दोनों नौकरी करते हैं, और उसी घर में डे-केयर होने से हमारे बेटे को दोपहर 1 बजे जगह नहीं बदलनी पड़ी।", relation: "नर्सरी और डे-केयर वाले बच्चे के माता-पिता" },
      source: "Example review written by Ideovent",
      consent: true,
    },
  ],

  /* ── CLEARED: the Parents page. Links only; no login form is ever built
        on a demo page. example.com in a template. ──────────────────────── */
  portalLinks: [
    { label: "Parent app", url: "https://example.com/app", audience: "Parents", note: "The day's photos, attendance and notes from the teacher", hi: { label: "पैरेंट ऐप", note: "दिन की फ़ोटो, हाज़िरी और टीचर के नोट" } },
    { label: "Pay fees online", url: "https://example.com/fees", audience: "Parents", note: "Quarterly fees, with an emailed receipt", hi: { label: "ऑनलाइन फीस भरें", note: "तिमाही फीस, ईमेल पर रसीद के साथ" } },
  ],
  downloads: [
    { label: "This month's lunch menu", group: "Menu", hi: { label: "इस महीने का लंच मेन्यू", group: "मेन्यू" } },
    { label: "Holiday list 2026-27", group: "Calendar", hi: { label: "छुट्टियों की सूची 2026-27", group: "कैलेंडर" } },
    { label: "What to pack in the bag", group: "Lists", hi: { label: "बैग में क्या रखें", group: "सूची" } },
    { label: "Pick-up card form", group: "Forms", hi: { label: "पिक-अप कार्ड का फ़ॉर्म", group: "फ़ॉर्म" } },
  ],

  /* ── CLEARED: the Transport page. Routes and timings, never a driver. ─── */
  transport: {
    intro: "Two vans on three short routes, with a woman attendant on board who hands each child to the class teacher at the gate.",
    routes: [
      { name: "Van A, Vijay Nagar and Scheme 78", stops: ["Scheme 78 park", "Vijay Nagar square", "Sayaji crossing"], pickup: "8:30 am", drop: "12:45 pm" },
      { name: "Van A, second trip, Nipania", stops: ["Nipania main road", "Bombay Hospital turn"], pickup: "8:45 am", drop: "1:05 pm" },
      { name: "Van B, Sukhliya and Scheme 114", stops: ["Sukhliya market", "Scheme 114 gate", "MR 10 crossing"], pickup: "8:35 am", drop: "12:50 pm" },
    ],
    safety: [
      "A woman attendant on every trip",
      "Child locks on the doors, and seat belts on every seat",
      "GPS tracking, with the location on the parent app",
      "A child is handed only to an adult on the pick-up card",
    ],
    feeNote: "₹1,600 to ₹2,200 a month by distance. Daycare children go home with their parents.",
    hi: {
      intro: "तीन छोटे रूट पर दो वैन, हर वैन में एक महिला अटेंडेंट जो हर बच्चे को गेट पर क्लास टीचर को सौंपती है।",
      feeNote: "दूरी के हिसाब से ₹1,600 से ₹2,200 महीना। डे-केयर वाले बच्चे अपने माता-पिता के साथ घर जाते हैं।",
    },
  },
});
