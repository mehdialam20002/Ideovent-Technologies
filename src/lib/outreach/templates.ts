/**
 * Outreach message templates: the ready-made e-mails and WhatsApp messages the
 * admin's Outreach section offers for one lead.
 *
 * WHERE THE WORDS COME FROM. Every template below is written from the sales kit
 * (E:\myagency\04-sales-kit), not invented here:
 *   - WhatsApp first messages: DEMO-SITE-PLAYBOOK.md 5.2 / 5.4 and
 *     PITCH-PAGE-PLAYBOOK.md 4.2 / 4.4 (cold, NO link, opt-out line included);
 *   - WhatsApp message 2 (after they answered): DEMO-SITE-PLAYBOOK.md 5.3 / 5.5,
 *     PITCH-PAGE-PLAYBOOK.md 4.3 / 4.5;
 *   - follow-ups: WHATSAPP-PLAYBOOK.md 3.4-3.6 and FOLLOW-UP-LADDER.md;
 *   - e-mails: DEMO-SITE-PLAYBOOK.md 5.6 / 5.7, SEQUENCE-INDIA-SCHOOLS.md and
 *     SEQUENCE-INDIA-COACHING.md, EMAIL-RULES.md (plain text, one sender, the
 *     REMOVE opt-out line, which render() appends to every e-mail).
 *
 * HONESTY RULES THE TEXT KEEPS. No client, result, number or rating is claimed
 * anywhere. No price is typed into any message (the number lives in FACTS.md
 * and on /pricing). The demo is always called a demonstration, never their live
 * site. No em dashes. www.ideovent.in is not printed: it does not resolve yet
 * (FACTS.md), so the phone number is the contact line.
 *
 * MERGE FIELDS: {contactName} {instituteName} {city} {demoLink} {pitchLink}
 * {observation} {senderName} {senderPhone}. See engine.ts render().
 */

export type TemplateChannel = "email" | "whatsapp";

export type TemplateStage =
  | "first"
  | "after_reply"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "after_call"
  | "proposal";

export type TemplatePitch = "new_website" | "fix_website" | "any";
export type TemplateKind = "school" | "coaching" | "any";
export type TemplateLanguage = "en" | "hinglish" | "hi";

export interface MessageTemplate {
  id: string;
  channel: TemplateChannel;
  stage: TemplateStage;
  pitch: TemplatePitch;
  kind: TemplateKind;
  language: TemplateLanguage;
  /** Short name shown in the picker. */
  label: string;
  /** Optional one-line hint for the sender (when to use it, what to check). */
  note?: string;
  /** E-mail only. */
  subject?: string;
  /** For e-mail: everything above the signature. render() adds signature + opt-out. */
  body: string;
  /** false forbids {demoLink}, {pitchLink} and any URL in the text. */
  allowsLink: boolean;
}

export const MERGE_FIELDS = [
  "contactName",
  "instituteName",
  "city",
  "demoLink",
  "pitchLink",
  "observation",
  "senderName",
  "senderPhone",
] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];

export const STAGE_LABELS: Record<TemplateStage, string> = {
  first: "First message",
  after_reply: "After they replied",
  follow_up_1: "Follow-up 1",
  follow_up_2: "Follow-up 2",
  follow_up_3: "Follow-up 3 (close the file)",
  after_call: "After a call",
  proposal: "Proposal",
};

export const PITCH_LABELS: Record<TemplatePitch, string> = {
  new_website: "New website",
  fix_website: "Fix their website",
  any: "Any",
};

export const LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  en: "English",
  hinglish: "Hinglish",
  hi: "Hindi",
};

/* WhatsApp opt-out lines (WHATSAPP-PLAYBOOK.md 2.4), used inside the texts. */
const WA_OPT_OUT_HINGLISH =
  "Agar ye aapke kaam ka nahi hai to bas *nahi* likh dijiye, main dobara message nahi karunga.";
const WA_OPT_OUT_EN =
  "If this is not useful to you, just reply *no* and I will not message again.";
const WA_OPT_OUT_HI =
  "अगर ये आपके काम का नहीं है तो बस *नहीं* लिख दीजिए, मैं दोबारा मैसेज नहीं करूँगा।";

const WA_INTRO_HINGLISH = "Namaste, main {senderName}, Ideovent Technologies, Saket, New Delhi se.";
const WA_INTRO_EN = "Namaste, I am {senderName} from Ideovent Technologies, Saket, New Delhi.";

export const OUTREACH_TEMPLATES: MessageTemplate[] = [
  /* ── E-mail, first touch (DEMO-SITE-PLAYBOOK.md 5.6 / 5.7) ─────────────── */
  {
    id: "em_first_new_school_en",
    channel: "email",
    stage: "first",
    pitch: "new_website",
    kind: "school",
    language: "en",
    label: "First e-mail: we built you a site (school)",
    note: "For a school with no website. The demo link goes in the first e-mail (e-mail is not WhatsApp).",
    subject: "A website for {instituteName}",
    body: `Dear {contactName},

My name is {senderName}. I run Ideovent Technologies, a web development firm in Saket, New Delhi.

We have built a website for {instituteName}. It is complete: your name, your classes and an admission enquiry form that reaches a phone rather than an inbox nobody opens. You can open it here:

{demoLink}

Two things you should know before you click. It is a demonstration, not your live site, and the page says so itself. And wherever your telephone number, your fees or your results should appear, we have left the space empty, because none of those are ours to write.

If you like it, we can talk about what it takes to make it yours. If you do not, tell me plainly and I will take it down the same day.`,
    allowsLink: true,
  },
  {
    id: "em_first_new_coaching_en",
    channel: "email",
    stage: "first",
    pitch: "new_website",
    kind: "coaching",
    language: "en",
    label: "First e-mail: we built you a site (coaching)",
    note: "For a coaching institute with no website. Courses and batches on the demo must come from what they publish.",
    subject: "A website for {instituteName}",
    body: `Dear {contactName},

My name is {senderName}. I run Ideovent Technologies, a web development firm in Saket, New Delhi.

We have built a website for {instituteName}. Your courses and batches are on it, along with a faculty section and an enquiry form that reaches a phone in seconds:

{demoLink}

It is a demonstration, not your live site, and the page says so. The results section is deliberately empty. Whatever you publish yourself is what would go there, and not one selection more than that.

If it is useful, we can talk. If it is not, say so and it comes down today.`,
    allowsLink: true,
  },
  {
    id: "em_first_fix_school_en",
    channel: "email",
    stage: "first",
    pitch: "fix_website",
    kind: "school",
    language: "en",
    label: "First e-mail: one thing on your site + a better version (school)",
    note: "Only when the observation is something you checked yourself on their site today.",
    subject: "{instituteName}, one thing on your website",
    body: `Dear {contactName},

I opened {instituteName}'s website on my phone before writing this, so this is one specific thing, not a mailshot.

{observation}

I am {senderName}. I run Ideovent Technologies, a small web development firm in Saket, New Delhi, and schools and coaching institutes are the market we focus on. So we built a version of your site the way a parent would want it on a phone:

{demoLink}

It is a demonstration, not your live site, and the page says so. Where your phone number, fees or results would appear, the space is left empty, because those are yours to write.

If it is useful, reply and we can talk. If it is not, say so and I will leave you alone.`,
    allowsLink: true,
  },
  {
    id: "em_first_fix_coaching_en",
    channel: "email",
    stage: "first",
    pitch: "fix_website",
    kind: "coaching",
    language: "en",
    label: "First e-mail: one thing on your site + a better version (coaching)",
    note: "Only when the observation is something you checked yourself on their site today.",
    subject: "{instituteName}, one thing a student sees first",
    body: `Dear {contactName},

I looked at {instituteName}'s website on my phone the way a student comparing institutes would, and one thing stood out.

{observation}

I am {senderName}, of Ideovent Technologies, a web development firm in Saket, New Delhi. We built a version of your site with your courses, batches and an enquiry form that reaches a phone in seconds:

{demoLink}

It is a demonstration, not your live site. The results section is empty on purpose: only what you publish yourself would go there.

If it is worth a conversation, reply. If not, one line back and it comes down.`,
    allowsLink: true,
  },
  {
    id: "em_first_pitch_any_en",
    channel: "email",
    stage: "first",
    pitch: "fix_website",
    kind: "any",
    language: "en",
    label: "First e-mail: the page I wrote about your site",
    note: "Needs a pitch page for this institute (pitchSlug). The pitch page is not their new website; the text says so.",
    subject: "{instituteName}: what I noticed on your site",
    body: `Dear {contactName},

I opened {instituteName}'s website on my phone before writing this. {observation}

I wrote down what I noticed on one page, only for {instituteName}, with what each fix would take:

{pitchLink}

One thing to be clear about: this is not your new website. It is a page I wrote for you, so you can see exactly what I am talking about.

I am {senderName}, of Ideovent Technologies, Saket, New Delhi. Read it and tell me whether I got it right or wrong. Both answers are useful to me.`,
    allowsLink: true,
  },
  {
    id: "em_first_new_school_hinglish",
    channel: "email",
    stage: "first",
    pitch: "new_website",
    kind: "school",
    language: "hinglish",
    label: "First e-mail, Hinglish: aapke school ki website (school)",
    subject: "{instituteName} ke liye ek website",
    body: `Namaste {contactName},

Main {senderName}, Ideovent Technologies, Saket, New Delhi se. Hum websites aur software banate hain.

Humne {instituteName} ke liye ek website bana di hai. Aapke school ke naam se, classes ke saath, aur ek admission enquiry form jo seedha phone pe aata hai:

{demoLink}

Do baatein pehle hi saaf kar doon. Ye demonstration hai, aapki live site nahi, aur page pe bhi ye likha hai. Aur jahan aapka phone number, fees ya result aana chahiye, wahan jagah khaali chhodi hai, kyunki wo aapse pooche bina nahi likh sakte.

Pasand aaye to aage baat karte hain. Pasand na aaye to seedha bata dijiye, usi din hata dunga.`,
    allowsLink: true,
  },
  {
    id: "em_first_fix_coaching_hinglish",
    channel: "email",
    stage: "first",
    pitch: "fix_website",
    kind: "coaching",
    language: "hinglish",
    label: "First e-mail, Hinglish: site pe ek cheez + naya version (coaching)",
    subject: "{instituteName} ki website pe ek cheez",
    body: `Namaste {contactName},

Maine {instituteName} ki website phone pe kholi, ek student ki tarah. Ek cheez dikhi:

{observation}

Main {senderName}, Ideovent Technologies, Saket, New Delhi se. Humne aapke courses aur batches ke saath aapki site ka ek version bana ke dekha hai:

{demoLink}

Ye demonstration hai, aapki live site nahi. Results wala section jaan-boojh kar khaali hai, wahan sirf wahi aayega jo aap khud publish karte hain.

Kaam ka lage to reply kar dijiye. Na lage to bhi ek line likh dijiye, main hata dunga.`,
    allowsLink: true,
  },

  /* ── E-mail, follow-ups (FOLLOW-UP-LADDER.md, SEQUENCE-INDIA-*.md) ────────── */
  {
    id: "em_fu1_any_en",
    channel: "email",
    stage: "follow_up_1",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Follow-up 1: did the link open for you",
    note: "A few days after the first e-mail. Asks for a correction, not 'did you see it' (DEMO-SITE-PLAYBOOK 8.3).",
    subject: "{instituteName}: the website I sent",
    body: `Dear {contactName},

A short one, in case my earlier e-mail got buried. Here is the website again:

{demoLink}

One thing I would like you to confirm: are the classes and courses on it right, or has something been missed? Whatever is missing, I will add.

If the timing is wrong, that is fine. A one-line reply is enough either way.`,
    allowsLink: true,
  },
  {
    id: "em_fu1_any_hinglish",
    channel: "email",
    stage: "follow_up_1",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "Follow-up 1, Hinglish: link khula?",
    subject: "{instituteName}: jo website bheji thi",
    body: `Namaste {contactName},

Ho sakta hai pichhla mail dab gaya ho, isliye website dobara bhej raha hoon:

{demoLink}

Ek cheez confirm kar dijiye: classes aur courses wali list theek hai, ya usmein kuch chhoot gaya hai? Jo bhi chhoota hai, main add kar dunga.

Abhi time sahi nahi hai to koi baat nahi. Ek line ka jawab kaafi hai.`,
    allowsLink: true,
  },
  {
    id: "em_fu2_any_en",
    channel: "email",
    stage: "follow_up_2",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Follow-up 2: one useful observation, no pressure",
    note: "Only send if the observation is real and you checked it. If you have nothing, call instead.",
    subject: "One thing I noticed about {instituteName}",
    body: `Dear {contactName},

One thing I noticed, so I thought I would pass it on:

{observation}

There is nothing in this for me. I thought you should know.

Whenever you want to talk, I am a phone call away. I will not keep writing.`,
    allowsLink: false,
  },
  {
    id: "em_fu3_any_en",
    channel: "email",
    stage: "follow_up_3",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Follow-up 3: may I close the file",
    note: "The last e-mail. Mean it: if they say no, mark the lead lost.",
    subject: "Shall I close the file on {instituteName}?",
    body: `Dear {contactName},

This is my last e-mail about the website for {instituteName}. I do not want to keep landing in your inbox.

If the timing is not right, that is completely fine. One line back and I will close the file and take the demonstration down.

And if it is stuck somewhere, tell me where. I may be able to help.

Either answer is fine with me. Thank you for reading.`,
    allowsLink: false,
  },
  {
    id: "em_fu3_any_hinglish",
    channel: "email",
    stage: "follow_up_3",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "Follow-up 3, Hinglish: aakhri mail",
    subject: "{instituteName}: file band kar doon?",
    body: `Namaste {contactName},

{instituteName} ki website ke baare mein ye mera aakhri mail hai, main baar baar aapke inbox mein nahi aana chahta.

Agar abhi time theek nahi hai to bilkul koi baat nahi. Ek line likh dijiye, main file band kar dunga aur demonstration hata dunga.

Aur agar baat kahin atki hui hai to bata dijiye kahan, ho sakta hai main help kar sakun.

Dono jawab mere liye theek hain. Shukriya.`,
    allowsLink: false,
  },
  {
    id: "em_after_reply_any_en",
    channel: "email",
    stage: "after_reply",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "After they replied: thank you + two questions",
    note: "Best sent as a reply in their own thread (Gmail Reply keeps their subject). This compose uses a plain, true subject.",
    subject: "{instituteName}: next step",
    body: `Dear {contactName},

Thank you for replying. The demonstration is here if you want to look again or share it with a colleague:

{demoLink}

Two questions, so the next step is useful to you rather than to me:
1. Do you only want the website, or do enquiries, fees and attendance also need to be handled online?
2. Who else would need to see it before a decision?

If a fifteen-minute call is easier, tell me a time that suits you and I will call.`,
    allowsLink: true,
  },
  {
    id: "em_after_call_any_en",
    channel: "email",
    stage: "after_call",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "After a call: what we agreed",
    note: "Send the same day as the call. Edit the list so it says what was actually agreed.",
    subject: "Our call today, {instituteName}",
    body: `Dear {contactName},

Thank you for your time on the phone today. Writing it down so nothing gets lost:

- The website we discussed: {demoLink}
- What you would like changed or added: (fill in from the call)
- Next step: (fill in, with a date)

If I have got anything wrong, reply and correct me. I would rather fix it now than later.`,
    allowsLink: true,
  },
  {
    id: "em_after_call_any_hinglish",
    channel: "email",
    stage: "after_call",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "After a call, Hinglish: jo baat hui",
    note: "Call ke din hi bhejiye. List mein wahi likhiye jo sach mein tay hua.",
    subject: "Aaj ki baat, {instituteName}",
    body: `Namaste {contactName},

Aaj phone pe time dene ke liye shukriya. Jo baat hui wo likh deta hoon taaki kuch chhoot na jaaye:

- Website jo dekhi: {demoLink}
- Aap kya badalna ya jodna chahte hain: (call se bharein)
- Agla step: (tareekh ke saath bharein)

Kuch galat likha ho to reply mein bata dijiye, main abhi theek kar dunga.`,
    allowsLink: true,
  },
  {
    id: "em_proposal_any_en",
    channel: "email",
    stage: "proposal",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Proposal: sending the written quotation",
    note: "Attach the proposal PDF in Gmail before pressing Send. No price goes in the e-mail body.",
    subject: "Proposal for {instituteName}",
    body: `Dear {contactName},

As promised, the proposal for {instituteName} is attached. It covers the scope we discussed, the timeline and the fee, all in writing so there is one version everyone works from.

The website it is based on is still here: {demoLink}

Please read page 2 first. It describes your office's process the way I understood it; if I have understood it wrong, the rest will be wrong too, so tell me.

Happy to go through it on a call whenever it suits you.`,
    allowsLink: true,
  },

  /* ── WhatsApp, first message to a stranger. NO LINK, ever ───────────────
   * WHATSAPP-PLAYBOOK.md 2.1 and DEMO-SITE-PLAYBOOK.md 5.0: a link from an
   * unknown number reads as a scam. Message 1 earns a yes; the link goes in
   * message 2 (stage after_reply). Ten a day, typed one at a time. */
  {
    id: "wa_first_new_school_hinglish",
    channel: "whatsapp",
    stage: "first",
    pitch: "new_website",
    kind: "school",
    language: "hinglish",
    label: "Pehla message: website bana di hai (school)",
    note: "Best time 11:00 to 13:00, Tuesday to Thursday. No link in this message.",
    body: `${WA_INTRO_HINGLISH}

Humne {instituteName} ke liye ek website bana di hai. Poori site hai, aapke school ke naam se, aapki classes ke saath. Ye demonstration hai, aapki live site nahi.

Link bhej doon? Bas "haan" likh dijiye, do minute mein dekh lenge.

${WA_OPT_OUT_HINGLISH}`,
    allowsLink: false,
  },
  {
    id: "wa_first_new_school_en",
    channel: "whatsapp",
    stage: "first",
    pitch: "new_website",
    kind: "school",
    language: "en",
    label: "First message: we built you a site (school)",
    note: "Best time 11:00 to 13:00, Tuesday to Thursday. No link in this message.",
    body: `${WA_INTRO_EN}

We have built a website for {instituteName}. It is a complete site, in your school's name, with your classes. It is a demonstration, not your live site.

Shall I send you the link? Just reply "yes" and you can see it in two minutes.

${WA_OPT_OUT_EN}`,
    allowsLink: false,
  },
  {
    id: "wa_first_new_school_hi",
    channel: "whatsapp",
    stage: "first",
    pitch: "new_website",
    kind: "school",
    language: "hi",
    label: "पहला मैसेज: वेबसाइट बना दी है (school)",
    note: "Best time 11:00 to 13:00, Tuesday to Thursday. No link in this message.",
    body: `नमस्ते, मैं {senderName}, Ideovent Technologies, साकेत, नई दिल्ली से।

हमने {instituteName} के लिए एक वेबसाइट बना दी है। पूरी साइट है, आपके स्कूल के नाम से, आपकी क्लासेज़ के साथ। ये डेमो है, आपकी लाइव साइट नहीं।

लिंक भेज दूँ? बस "हाँ" लिख दीजिए।

${WA_OPT_OUT_HI}`,
    allowsLink: false,
  },
  {
    id: "wa_first_new_coaching_hinglish",
    channel: "whatsapp",
    stage: "first",
    pitch: "new_website",
    kind: "coaching",
    language: "hinglish",
    label: "Pehla message: website bana di hai (coaching)",
    note: "Best time 12:00 to 16:00. Never 17:00 to 20:30, batches are running. No link.",
    body: `${WA_INTRO_HINGLISH}

{instituteName} ke liye ek website bana di hai. Courses, batches, faculty, enquiry form, sab aapke naam se. Demonstration hai, aapki live site nahi.

Link bhej doon? Bas "haan" likh dijiye.

${WA_OPT_OUT_HINGLISH}`,
    allowsLink: false,
  },
  {
    id: "wa_first_new_coaching_en",
    channel: "whatsapp",
    stage: "first",
    pitch: "new_website",
    kind: "coaching",
    language: "en",
    label: "First message: we built you a site (coaching)",
    note: "Best time 12:00 to 16:00. Never 17:00 to 20:30, batches are running. No link.",
    body: `${WA_INTRO_EN}

We have built a website for {instituteName}: courses, batches, faculty and an enquiry form, all in your name. It is a demonstration, not your live site.

Shall I send the link? Just reply "yes".

${WA_OPT_OUT_EN}`,
    allowsLink: false,
  },
  {
    id: "wa_first_fix_school_hinglish",
    channel: "whatsapp",
    stage: "first",
    pitch: "fix_website",
    kind: "school",
    language: "hinglish",
    label: "Pehla message: site pe ek cheez dikhi (school)",
    note: "Observation must be something you checked yourself today. No link in this message.",
    body: `${WA_INTRO_HINGLISH}

Aaj {instituteName} ki website phone pe kholi. Ek cheez dikhi: {observation}

Isliye site ka ek behtar version bana ke rakha hai. Demonstration hai, live site nahi. Bhej doon? Bas "haan" likh dijiye.

${WA_OPT_OUT_HINGLISH}`,
    allowsLink: false,
  },
  {
    id: "wa_first_fix_school_en",
    channel: "whatsapp",
    stage: "first",
    pitch: "fix_website",
    kind: "school",
    language: "en",
    label: "First message: one thing on your site (school)",
    note: "Observation must be something you checked yourself today. No link in this message.",
    body: `${WA_INTRO_EN}

Today I opened {instituteName}'s website on my phone. One thing stood out: {observation}

So we built a better version. It is a demonstration, not your live site. Shall I send it? Just reply "yes".

${WA_OPT_OUT_EN}`,
    allowsLink: false,
  },
  {
    id: "wa_first_fix_coaching_hinglish",
    channel: "whatsapp",
    stage: "first",
    pitch: "fix_website",
    kind: "coaching",
    language: "hinglish",
    label: "Pehla message: site pe ek cheez dikhi (coaching)",
    note: "Best time 12:00 to 16:00. Observation must be real. No link in this message.",
    body: `${WA_INTRO_HINGLISH}

{instituteName} ki site phone pe dekhi. Ek cheez dikhi: {observation}

Aapke courses aur batches ke saath naya version bana ke rakha hai. Demonstration hai, live site nahi. Bhej doon? Bas "haan" likh dijiye.

${WA_OPT_OUT_HINGLISH}`,
    allowsLink: false,
  },
  {
    id: "wa_first_fix_coaching_en",
    channel: "whatsapp",
    stage: "first",
    pitch: "fix_website",
    kind: "coaching",
    language: "en",
    label: "First message: one thing on your site (coaching)",
    note: "Best time 12:00 to 16:00. Observation must be real. No link in this message.",
    body: `${WA_INTRO_EN}

I looked at {instituteName}'s site on my phone. One thing stood out: {observation}

We built a new version with your courses and batches. It is a demonstration, not your live site. Shall I send it? Just reply "yes".

${WA_OPT_OUT_EN}`,
    allowsLink: false,
  },
  {
    id: "wa_first_pitch_any_hinglish",
    channel: "whatsapp",
    stage: "first",
    pitch: "fix_website",
    kind: "any",
    language: "hinglish",
    label: "Pehla message: aapke liye ek page likha hai (pitch page)",
    note: "For a lead with a pitch page. PITCH-PAGE-PLAYBOOK.md 4.2. No link in this message.",
    body: `${WA_INTRO_HINGLISH}

Aaj {instituteName} ki website apne phone pe kholi thi. Kuch cheezein aisi mili jo enquiry karne se pehle hi rok deti hain.

Wo sab likh kar ek page bana diya hai, sirf aapke liye. Bhej doon? Bas "haan" likh dijiye.

${WA_OPT_OUT_HINGLISH}`,
    allowsLink: false,
  },

  /* ── WhatsApp, message 2: the link, only after they answered ────────────
   * DEMO-SITE-PLAYBOOK.md 5.3 / 5.5, PITCH-PAGE-PLAYBOOK.md 4.3. */
  {
    id: "wa_after_reply_school_hinglish",
    channel: "whatsapp",
    stage: "after_reply",
    pitch: "any",
    kind: "school",
    language: "hinglish",
    label: "Demo link wala (school)",
    note: "Only after they said haan / yes.",
    body: `Ye rahi: {demoLink}

Dekhiye, aapke liye ye website banayi hai. Naam aur classes aapke hain. Jahan aapka phone number ya result aana chahiye, wahan abhi khaali jagah chhodi hai, kyunki wo aapse pooche bina nahi likh sakte the.

Pasand aaye to aage baat karte hain. Pasand na aaye to bhi seedha bata dijiye, bura nahi lagega.`,
    allowsLink: true,
  },
  {
    id: "wa_after_reply_coaching_hinglish",
    channel: "whatsapp",
    stage: "after_reply",
    pitch: "any",
    kind: "coaching",
    language: "hinglish",
    label: "Demo link wala (coaching)",
    note: "Only after they said haan / yes.",
    body: `Ye rahi: {demoLink}

Dekhiye, aapke liye banayi hai. Courses aur batches wahi rakhe hain jo aap publish karte hain.

Results wale section mein maine kuch nahi likha. Jo aap khud publish karte hain, wahi wahan aayega, usse ek number zyada nahi. Baaki jagah bhi khaali hai jahan aapka number aur fees aani hai.

Pasand aaye to aage baat karte hain.`,
    allowsLink: true,
  },
  {
    id: "wa_after_reply_any_en",
    channel: "whatsapp",
    stage: "after_reply",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Demo link message (English)",
    note: "Only after they said yes.",
    body: `Here it is: {demoLink}

We built this website for you. The name and details are yours. Where your phone number, fees or results should appear, the space is left empty, because we could not write those without asking you.

If you like it, we can talk further. If you do not, please tell me plainly, I will not mind.`,
    allowsLink: true,
  },
  {
    id: "wa_after_reply_hi",
    channel: "whatsapp",
    stage: "after_reply",
    pitch: "any",
    kind: "any",
    language: "hi",
    label: "डेमो लिंक वाला मैसेज",
    note: "Only after they said haan.",
    body: `ये रही: {demoLink}

आपके लिए ये वेबसाइट बनाई है। नाम और जानकारी आपकी है। जहाँ आपका फ़ोन नंबर, फ़ीस या रिज़ल्ट आना चाहिए, वहाँ जगह खाली छोड़ी है, क्योंकि वो आपसे पूछे बिना नहीं लिख सकते थे।

पसंद आए तो आगे बात करते हैं। पसंद न आए तो भी सीधा बता दीजिए।`,
    allowsLink: true,
  },
  {
    id: "wa_after_reply_pitch_hinglish",
    channel: "whatsapp",
    stage: "after_reply",
    pitch: "fix_website",
    kind: "any",
    language: "hinglish",
    label: "Pitch page link wala",
    note: "Needs a pitch page (pitchSlug). The line 'ye aapki nayi website nahi hai' always travels with it.",
    body: `Ye rahi: {pitchLink}

Isme wahi cheezein hain jo aapki site pe mujhe dikhin, aur har ek ke neeche ye ki use theek karne mein kya lagta hai. Do minute mein padh lenge.

Ek baat pehle hi saaf kar doon: ye aapki nayi website nahi hai. Ye ek page hai jo maine aapke liye likha hai, taaki aap dekh sakein main kis cheez ki baat kar raha hoon.

Padh kar bata dijiye main sahi hoon ya galat.`,
    allowsLink: true,
  },

  /* ── WhatsApp, follow-ups (WHATSAPP-PLAYBOOK.md 2.3 and 3.4-3.6) ─────────
   * One unanswered follow-up a day at most, three clear days between two
   * unanswered messages, and three unanswered messages end the thread. No
   * link in a follow-up: they either have it already or never asked for it. */
  {
    id: "wa_fu1_hinglish",
    channel: "whatsapp",
    stage: "follow_up_1",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "Follow-up 1: ek chhota sawaal",
    note: "Day 2 on the ladder. Carries a question, never a bare 'following up'.",
    body: `{contactName} ji, ek chhota sa sawaal, jawab ek line mein kaafi hai.

{instituteName} ke liye jo website banayi hai, wo dekhna chahenge? "Haan" likh dijiye, link bhej dunga. Aur agar dekh li hai, to bas itna bata dijiye ki usme sabse pehle kya badalna chahiye.

Koi jaldi nahi hai. Kaam ka na ho to *nahi* likh dijiye, dobara message nahi karunga.`,
    allowsLink: false,
  },
  {
    id: "wa_fu1_en",
    channel: "whatsapp",
    stage: "follow_up_1",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Follow-up 1: one small question",
    note: "Day 2 on the ladder. Carries a question, never a bare 'following up'.",
    body: `{contactName}, one small question, a one-line answer is enough.

Would you like to see the website we made for {instituteName}? Reply "yes" and I will send the link. And if you have already seen it, just tell me the first thing you would change.

No hurry at all. If it is not useful, reply *no* and I will not message again.`,
    allowsLink: false,
  },
  {
    id: "wa_fu2_hinglish",
    channel: "whatsapp",
    stage: "follow_up_2",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "Follow-up 2: ek kaam ki cheez dikhi",
    note: "Only with a real observation. If you have none, call instead of sending this.",
    body: `{contactName} ji, ek cheez dikhi to soch ke bhej raha hoon:

{observation}

Isme mera koi kaam nahi hai, bas laga ki aapko pata hona chahiye.

Baaki jab aapka mann ho tab baat kar lenge, main pareshan nahi karunga.`,
    allowsLink: false,
  },
  {
    id: "wa_fu2_en",
    channel: "whatsapp",
    stage: "follow_up_2",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Follow-up 2: one useful thing I noticed",
    note: "Only with a real observation. If you have none, call instead of sending this.",
    body: `{contactName}, I noticed one thing and thought I should pass it on:

{observation}

There is nothing in it for me, I just thought you should know.

Whenever you feel like talking, we can. I will not keep messaging.`,
    allowsLink: false,
  },
  {
    id: "wa_fu3_hinglish",
    channel: "whatsapp",
    stage: "follow_up_3",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "Follow-up 3: aakhri message",
    note: "The third unanswered message ends the WhatsApp thread. There is no fourth.",
    body: `{contactName} ji, ye is baare mein mera aakhri message hai, main baar baar aapke phone pe nahi aana chahta.

Agar abhi time theek nahi hai to bilkul koi baat nahi. Ek line likh dijiye, main file band kar deta hoon.

Aur agar baat kahin atki hui hai, to bata dijiye kahan, ho sakta hai main help kar sakun.

Dono jawab mere liye theek hain. Shukriya.`,
    allowsLink: false,
  },
  {
    id: "wa_fu3_en",
    channel: "whatsapp",
    stage: "follow_up_3",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Follow-up 3: last message",
    note: "The third unanswered message ends the WhatsApp thread. There is no fourth.",
    body: `{contactName}, this is my last message about this, I do not want to keep turning up on your phone.

If the timing is not right, that is completely fine. One line back and I will close the file.

And if it is stuck somewhere, tell me where, I may be able to help.

Either answer is fine with me. Thank you.`,
    allowsLink: false,
  },
  /* ── WhatsApp, warm: after a call gave permission, and the proposal ────── */
  {
    id: "wa_after_call_hinglish",
    channel: "whatsapp",
    stage: "after_call",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "Call ke baad: link, 5 minute ke andar",
    note: "Send within five minutes of hanging up. The call gave permission, so the link goes now.",
    body: `Namaste {contactName} ji, {senderName}, Ideovent Technologies, Saket, New Delhi. Abhi phone pe baat hui thi, aapne kaha tha WhatsApp kar doon.

{instituteName} ke liye jo website banayi hai, wo ye rahi: {demoLink}

Demonstration hai, aapki live site nahi. Jahan aapka number, fees ya result aana hai, wo jagah khaali chhodi hai.

Dekh kar bata dijiyega kya badalna hai.

{senderName} · {senderPhone}`,
    allowsLink: true,
  },
  {
    id: "wa_after_call_en",
    channel: "whatsapp",
    stage: "after_call",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "After a call: the link, within 5 minutes",
    note: "Send within five minutes of hanging up. The call gave permission, so the link goes now.",
    body: `Namaste {contactName}, this is {senderName} from Ideovent Technologies, Saket, New Delhi. We just spoke on the phone and you asked me to send this on WhatsApp.

Here is the website we built for {instituteName}: {demoLink}

It is a demonstration, not your live site. Where your number, fees or results should go, the space is left empty.

Have a look and tell me what you would change.

{senderName} · {senderPhone}`,
    allowsLink: true,
  },
  {
    id: "wa_proposal_hinglish",
    channel: "whatsapp",
    stage: "proposal",
    pitch: "any",
    kind: "any",
    language: "hinglish",
    label: "Proposal: mail pe bhej diya hai",
    note: "The proposal itself goes by e-mail. WhatsApp only says it has been sent. No price in this message.",
    body: `{contactName} ji, {instituteName} ka proposal aapke email pe bhej diya hai. Scope, timeline aur fees, sab likh kar hai.

Page 2 pe aapke office ka process likha hai jaisa maine samjha. Wo sahi samjha hai na? Galat ho to bata dijiye, main theek kar dunga.

Baaki koi jaldi nahi hai.`,
    allowsLink: false,
  },
  {
    id: "wa_proposal_en",
    channel: "whatsapp",
    stage: "proposal",
    pitch: "any",
    kind: "any",
    language: "en",
    label: "Proposal: sent to your e-mail",
    note: "The proposal itself goes by e-mail. WhatsApp only says it has been sent. No price in this message.",
    body: `{contactName}, I have sent the proposal for {instituteName} to your e-mail. Scope, timeline and fee are all in writing there.

Page 2 describes your office's process the way I understood it. Did I get it right? If not, tell me and I will correct it.

No hurry at all.`,
    allowsLink: false,
  },
];

/* ── Lookups ─────────────────────────────────────────────────────────────── */

const BY_ID = new Map(OUTREACH_TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string | undefined | null): MessageTemplate | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export interface TemplateFilter {
  channel?: TemplateChannel;
  stage?: TemplateStage;
  /** A lead's kind; "other" matches only "any" templates. */
  kind?: TemplateKind | "other";
  pitch?: TemplatePitch;
  language?: TemplateLanguage;
}

/**
 * Templates that fit a filter. "any" on a template matches every value; a
 * filter value of undefined matches every template. Exact matches sort first.
 */
export function templatesFor(filter: TemplateFilter = {}): MessageTemplate[] {
  const fits = (want: string | undefined, have: string) =>
    want === undefined || want === "any" || have === "any" || have === want;
  const kind = filter.kind === "other" ? "any" : filter.kind;
  const score = (t: MessageTemplate) =>
    (kind && t.kind === kind ? 2 : 0) + (filter.pitch && t.pitch === filter.pitch ? 1 : 0);
  return OUTREACH_TEMPLATES.filter(
    (t) =>
      (!filter.channel || t.channel === filter.channel) &&
      (!filter.stage || t.stage === filter.stage) &&
      (!filter.language || t.language === filter.language) &&
      (filter.kind === "other" ? t.kind === "any" : fits(kind, t.kind)) &&
      fits(filter.pitch, t.pitch),
  ).sort((a, b) => score(b) - score(a));
}

/** Merge fields a template's subject and body use, in order of first use. */
export function fieldsUsed(t: Pick<MessageTemplate, "subject" | "body">): string[] {
  const out: string[] = [];
  for (const m of `${t.subject ?? ""}\n${t.body}`.matchAll(/\{(\w+)\}/g)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}
