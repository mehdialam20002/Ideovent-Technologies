/**
 * Outreach message templates: the ready-made e-mails and WhatsApp messages the
 * admin's Outreach section offers for one lead.
 *
 * THE WORDING IS MEHDI'S (30 Sep 2026). He read the samples in
 * 04-sales-kit/APPROVED-MESSAGES-2026-09-30.md and said "ye sb msz templetes ko
 * ache se harr stage ke liye daal do": every stage below is written in that
 * voice, and where the file has a sample, the template renders it word for word
 * (scripts/test-outreach-engine.mjs compares them). The only differences are of
 * layout or truth: a checked observation is a sentence of its own ("... phone
 * par kholi. Usme ..."), a link sits on its own line, an e-mail's "Dear ..."
 * stands on its own line, the call times follow the kind's window, and an
 * implant centre is offered "kharche ki jaankari", not "kharche ki range",
 * because the implant demo (d4) shows no implant price. The specialist clinics'
 * approved words (implant, braces, kids) are the dental WhatsApp messages'
 * `variants`. 04-sales-kit/OUTREACH-TEMPLATES-RENDERED-2026-09-30.md shows
 * every message as it renders, beside the samples. The research behind it is
 * OUTREACH-APPROACH-PLAYBOOK-2026-09-30.md.
 *
 * THE VOICE. Greet by name and title, say who you are in half a line, one true
 * problem you checked, what you made for them (a sample, a demonstration), one
 * yes/no question, an easy no. Short. No link, price, emoji, "best", "free",
 * "guaranteed" or urgency in a first message.
 *
 * THE LADDER
 *   first        WhatsApp and e-mail, no link: "... Humne ... sample page banaya hai
 *                jisme {offer} hai. Kya main aapko bhej doon? Pasand na aaye to koi
 *                baat nahi." A lead with no demo yet gets the twin that OFFERS to make
 *                one (sample "offer"): no message says a sample is made when it is not.
 *   after_reply  after a yes: the link, "Ye sirf demonstration hai ...", two call times.
 *   follow_up_1  WhatsApp: the ONE follow-up, on day 4, and the last WhatsApp.
 *                E-mail: day 4, as a reply in the same thread.
 *   follow_up_2  e-mail only, day 9: one new, true, useful point (never the first observation again).
 *   follow_up_3  e-mail only, day 16: the closing e-mail.
 *   after_call   the same-day summary, with [package and price] and [date] to fill in:
 *                checkSend blocks the send while a [placeholder] is left.
 *   proposal     the proposal by e-mail, the WhatsApp note, and the day-3 follow-up.
 * WhatsApp follow-ups 2 and 3 are retired (RETIRED_TEMPLATES): their ids still
 * resolve for the history, and nothing offers them.
 *
 * HONESTY. Every sentence is true for the demo the prospect gets: it is a
 * demonstration, not their live site, and what we did not get from them is
 * sample content ("jo jaankari aapki taraf se nahi mili wo abhi sample hai").
 * No client, result, number or rating is claimed; no price is typed into a
 * message (the summary and the proposal leave [package and price] to the
 * sender). No em dashes. www.ideovent.in is not printed: it does not resolve yet.
 *
 * MERGE FIELDS: MERGE_FIELDS below. engine.ts render() fills them; its header
 * says what each one says in each language.
 */

import type { LeadStatus } from "./types";

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
export type TemplateKind = "school" | "coaching" | "dental" | "any";
export type TemplateLanguage = "en" | "hinglish" | "hi";
/** A specialist dental clinic: an implant centre, a braces (orthodontic) clinic, a children's clinic. */
export type Specialist = "implant" | "ortho" | "kids";
export const SPECIALISTS: readonly Specialist[] = ["implant", "ortho", "kids"];

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
  /** For e-mail: everything above the signature. render() adds "Regards,", the signature and, on a cold e-mail, the opt-out. */
  body: string;
  /** false forbids {demoLink}, {pitchLink} and any URL in the text. */
  allowsLink: boolean;
  /**
   * Kinds a generic ("any") template is never offered to, because its words
   * belong to another kind. templatesFor leaves it out for that kind and
   * checkSend warns if it is picked anyway (28 Sep 2026).
   */
  notForKinds?: Array<Exclude<TemplateKind, "any">>;
  /**
   * "made": the message says the sample is already made, so it needs the lead's
   * demo. "offer": it offers to make one, for a lead that has none yet.
   */
  sample?: "made" | "offer";
  /** What the message says already exists for them (engine.ts promisedPage): a demo, a pitch page, or nothing. */
  promises?: "demo" | "pitch" | null;
  /** Kept only so an old history entry still resolves; never offered (templatesFor skips it). */
  retired?: boolean;
  /**
   * Dental WhatsApp first messages only: the approved specialist words, which
   * render() says in place of `body` (engine.ts bodyFor). They use the same
   * merge fields and end with the same question and easy no.
   *   implant, ortho, kids: the "no website" message to that specialist clinic,
   *     as the approved kids sample says it ("Google par aapka kids dental
   *     clinic dekha. Parents ..., par clinic ki website nahi mili.").
   *   found: the "their site" message when the checked problem names their site
   *     itself (a specialty's process and cost, a child's first visit) and the
   *     lead was found on Google, as the approved implant sample says it
   *     ("Google par aapka implant centre dekha. Log implant se pehle ..., par
   *     aapki site par ye nahi mila.").
   */
  variants?: Partial<Record<Specialist | "found", string>>;
}

export const MERGE_FIELDS = [
  "greeting",
  "addressAs",
  "senderFirstName",
  "timeOfDay",
  "kindNoun",
  "offer",
  "need",
  "visitor",
  "callSlots",
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

/** Each stage in plain words, as the compose screen names it. */
export const STAGE_LABELS: Record<TemplateStage, string> = {
  first: "First message",
  after_reply: "After they say yes",
  follow_up_1: "Follow-up",
  follow_up_2: "Follow-up 2",
  follow_up_3: "Closing",
  after_call: "After the call",
  proposal: "Proposal",
};

/** The stages each channel has, in the order a lead meets them: one WhatsApp follow-up, three by e-mail. */
export const CHANNEL_STAGES: Record<TemplateChannel, TemplateStage[]> = {
  whatsapp: ["first", "after_reply", "follow_up_1", "after_call", "proposal"],
  email: ["first", "after_reply", "follow_up_1", "follow_up_2", "follow_up_3", "after_call", "proposal"],
};

export function stagesFor(channel: TemplateChannel): TemplateStage[] {
  return CHANNEL_STAGES[channel].slice();
}

/** A stage's name on one channel, with its day: "Follow-up (day 4, the last WhatsApp)". */
export function stageLabel(stage: TemplateStage, channel: TemplateChannel): string {
  if (stage === "follow_up_1") return channel === "whatsapp" ? "Follow-up (day 4, the last WhatsApp)" : "Follow-up (day 4)";
  if (stage === "follow_up_2") return "Follow-up 2 (day 9)";
  if (stage === "follow_up_3") return "Closing (day 16)";
  return STAGE_LABELS[stage];
}

/**
 * The stage a lead is at on one channel, from its status and the messages it
 * has had there: a yes -> after_reply, a call -> after_call, a proposal ->
 * proposal; otherwise the first message, then that channel's follow-ups. After
 * the one WhatsApp follow-up, or the closing e-mail, there is nothing more to
 * send on that channel: null (call, use the other channel, or stop). Also null
 * for a client, a lost lead and one who asked not to be contacted.
 */
export function suggestedStage(status: LeadStatus | undefined, channel: TemplateChannel, sends: number): TemplateStage | null {
  switch (status) {
    case "replied":
    case "demo_opened":
      return "after_reply";
    case "call":
      return "after_call";
    case "proposal":
      return "proposal";
    case "won":
    case "lost":
    case "do_not_contact":
      return null;
  }
  if (sends <= 0) return "first";
  const followUps = CHANNEL_STAGES[channel].filter((s) => s.startsWith("follow_up"));
  return followUps[sends - 1] ?? null;
}

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

/* ── The approved lines ───────────────────────────────────────────────────── */

/** Line 1 of every first WhatsApp: greet by name and title, then who and where, in half a line. */
const HELLO: Record<TemplateLanguage, string> = {
  hinglish: "Namaste {greeting}, main {senderFirstName}, Ideovent Technologies (Saket, Delhi) se.",
  en: "Good {timeOfDay} {greeting}, I am {senderFirstName} from Ideovent Technologies, Saket, Delhi.",
  hi: "नमस्ते {greeting}, मैं {senderFirstName}, Ideovent Technologies (साकेत, दिल्ली) से।",
};

/** The one question and the easy no that close a first message about a sample already made. */
export const APPROVED_ASK: Record<TemplateLanguage, string> = {
  hinglish: "Kya main aapko bhej doon? Pasand na aaye to koi baat nahi.",
  en: "Shall I send it? If it is not useful, no problem at all.",
  hi: "क्या मैं आपको भेज दूँ? पसंद न आए तो कोई बात नहीं।",
};

/** The easy no: it closes every first message, the ones that offer to make a sample too. */
export const EASY_NO: Record<TemplateLanguage, string> = {
  hinglish: "Pasand na aaye to koi baat nahi.",
  en: "If it is not useful, no problem at all.",
  hi: "पसंद न आए तो कोई बात नहीं।",
};

/**
 * Why a specialist clinic's patients look online first, as the approved implant
 * and kids samples say it, without the full stop: the specialist messages go on
 * "..., par clinic ki website nahi mili." engine.ts {need} is the same words as
 * a sentence of its own.
 */
export const SPECIALIST_NEED: Record<TemplateLanguage, Record<Specialist, string>> = {
  hinglish: {
    implant: "Log implant se pehle process aur kharche ki jaankari online dhoondhte hain",
    ortho: "Log braces se pehle process aur kharche ki jaankari online dhoondhte hain",
    kids: "Parents bachche ki pehli visit se pehle online dekhte hain ki kya hoga",
  },
  en: {
    implant: "People look up the implant process and its cost online before they decide",
    ortho: "People look up how braces work and what they cost online before they decide",
    kids: "Parents look online to see what will happen at a child's first visit",
  },
  hi: {
    implant: "लोग इम्प्लांट से पहले प्रोसेस और ख़र्च की जानकारी ऑनलाइन ढूँढते हैं",
    ortho: "लोग ब्रेसेज़ से पहले प्रोसेस और ख़र्च की जानकारी ऑनलाइन ढूँढते हैं",
    kids: "माता-पिता बच्चे की पहली विज़िट से पहले ऑनलाइन देखते हैं कि क्या होगा",
  },
};

/** On every e-mail follow-up: it goes as a reply in the first e-mail's thread. */
export const SAME_THREAD_NOTE =
  "Send it as a reply in the same thread as your first e-mail: open that e-mail in your mail app and press Reply.";

/** When each kind reads a message (the approved "Words per business" table). */
const WHEN: Record<TemplateKind, string> = {
  dental: "Best time 14:00 to 16:00, between patients; Saturdays are fine.",
  school: "Best time Tuesday to Thursday, 11:00 to 13:00.",
  coaching: "Best time 12:00 to 16:00, never during the evening batches.",
  any: "Send between 10:00 and 20:00, never on a Sunday.",
};

const TAG: Record<TemplateKind, string> = { dental: "dental", school: "school", coaching: "coaching", any: "any business" };

/**
 * A neutral message whose words only fit "any other business": a clinic, a
 * school and a coaching institute each have their own approved version of it,
 * and the neutral one would say the wrong thing to them ("jisme {offer} hai" is
 * wrong Hinglish for a school's "admission, fees aur enquiry ... hain"; a
 * summary asking a principal for "services aur timing").
 */
const ONLY_OTHER: Pick<MessageTemplate, "notForKinds"> = { notForKinds: ["dental", "school", "coaching"] };

/* ── First messages: one builder, the approved words per kind ─────────────── */

/**
 * The lines of one kind's first messages on one channel, in one language:
 * noSite: how we found them with no website of their own (the approved
 * "Google par aapka clinic dekha, par ..."); poorSite: their site on a phone,
 * then {observation}; made / offer: the sample line, made or offered.
 */
interface FirstLines {
  noSite: string;
  poorSite?: string;
  madeNew: string;
  madeFix?: string;
  offerNew: string;
  offerFix?: string;
  /** A hint for Mehdi on the "their site" messages. */
  fixNote?: string;
  /** A hint for Mehdi on the messages that say the sample is made. */
  madeNote?: string;
  /**
   * Dental WhatsApp: the approved specialist words (MessageTemplate.variants).
   * noSite: how a specialist clinic with no website was found, by specialty;
   * found: the lead-in of a "their site" message whose problem names the site;
   * made / offer: the sample line of both ("Humne ek sample page banaya hai ...").
   */
  specialist?: { noSite: Record<Specialist, string>; found: string; made: string; offer: string };
}

function firstSet(kind: TemplateKind, channel: TemplateChannel, language: TemplateLanguage, l: FirstLines): MessageTemplate[] {
  const open = channel === "email" ? `${language === "en" ? "Dear" : "Namaste"} {greeting},\n\n` : `${HELLO[language]} `;
  const out: MessageTemplate[] = [];
  const close = { made: APPROVED_ASK[language], offer: EASY_NO[language] };
  const s = l.specialist;
  // The specialist words, with the same greeting and the same close as the message they stand in for.
  const specialistNew = (sample: "made" | "offer"): MessageTemplate["variants"] =>
    s && Object.fromEntries(SPECIALISTS.map((k) => [k, `${open}${s.noSite[k]} ${s[sample]} ${close[sample]}`]));
  const specialistFix = (sample: "made" | "offer"): MessageTemplate["variants"] =>
    s && { found: `${open}${s.found} ${s[sample]} ${close[sample]}` };
  const add = (pitch: "new_website" | "fix_website", sample: "made" | "offer", middle: string, extra?: string) => {
    const id = `${channel === "email" ? "em" : "wa"}_first_${pitch === "new_website" ? "new" : "fix"}_${kind}_${language}${sample === "offer" ? "_offer" : ""}`;
    const note = [
      WHEN[kind],
      pitch === "new_website"
        ? "Only when you searched today and found no website of their own; it says you saw them on Google."
        : "Only with something you checked on their site today.",
      sample === "made" ? "Needs the demo: it says the sample is made." : "For a lead with no demo yet: it offers to make one.",
      sample === "made" ? l.madeNote : undefined,
      `No link${channel === "email" ? " in this e-mail" : ""}: the link goes after they say yes.`,
      extra,
    ];
    const variants = pitch === "new_website" ? specialistNew(sample) : specialistFix(sample);
    out.push({
      id,
      channel,
      stage: "first",
      pitch,
      kind,
      language,
      label: `First message: ${pitch === "new_website" ? "no website" : "their site"}, ${sample === "made" ? "sample made" : "offer a sample"} (${TAG[kind]})`,
      note: note.filter(Boolean).join(" "),
      ...(channel === "email" ? { subject: "{instituteName} website" } : {}),
      body: `${open}${middle} ${close[sample]}`,
      allowsLink: false,
      sample,
      promises: sample === "made" ? "demo" : null,
      ...(kind === "any" ? ONLY_OTHER : {}),
      ...(variants ? { variants } : {}),
    });
  };
  add("new_website", "made", `${l.noSite} ${l.madeNew}`);
  if (l.poorSite && l.madeFix) add("fix_website", "made", `${l.poorSite} ${l.madeFix}`, l.fixNote);
  add("new_website", "offer", `${l.noSite} ${l.offerNew}`);
  if (l.poorSite && l.offerFix) add("fix_website", "offer", `${l.poorSite} ${l.offerFix}`, l.fixNote);
  return out;
}

/* The sample lines, by language. School and coaching say "ek sample page", a
   clinic "ek chhota sample page", as the approved samples do. */
const MADE_NEW_HINGLISH = "Humne aapke {kindNoun} ke naam se ek sample page banaya hai jisme {offer} hai.";
const MADE_NEW_SHORT_HINGLISH = "Humne aapke {kindNoun} ke naam se ek chhota sample page banaya hai jisme {offer} hai.";
const OFFER_NEW_HINGLISH = "Kya main aapke {kindNoun} ke naam se ek sample page bana doon, jisme {offer} ho?";
const OFFER_NEW_SHORT_HINGLISH = "Kya main aapke {kindNoun} ke naam se ek chhota sample page bana doon, jisme {offer} ho?";
const MADE_EN = "We have made a short sample page for your {kindNoun} with {offer}.";
const OFFER_EN = "Shall I make a short sample page for your {kindNoun} with {offer}?";
const OLD_SITE_NOTE = "For an old website, pick \"Old admission session\" and type the session you saw.";

/* Dental clinics (the approved dental samples). {kindNoun} is "clinic", or the
   specialty where they are named ("Google par aapka implant centre dekha"). The
   sample line says "clinic", as the approved samples do. On WhatsApp a
   specialist clinic gets the approved implant and kids words (`variants`); an
   e-mail adds {need}, the specialty's line, after how it found them. */
const DENTAL_MADE_HINGLISH = "Humne aapke clinic ke naam se ek chhota sample page banaya hai jisme {offer} hai.";
const DENTAL_OFFER_HINGLISH = "Kya main aapke clinic ke naam se ek chhota sample page bana doon, jisme {offer} ho?";
const DENTAL_MADE_EN = "We have made a short sample page for your clinic with {offer}.";
const DENTAL_OFFER_EN = "Shall I make a short sample page for your clinic with {offer}?";

const bySpecialty = (line: (k: Specialist) => string): Record<Specialist, string> => ({
  implant: line("implant"),
  ortho: line("ortho"),
  kids: line("kids"),
});

/* The approved specialist samples: "Google par aapka kids dental clinic dekha.
   Parents ..., par clinic ki website nahi mili. Humne ek sample page banaya hai
   jisme ..." and "Google par aapka implant centre dekha. Log implant se pehle
   ..., par aapki site par ye nahi mila. Humne ek sample page banaya hai jisme ...".
   The English says it the same way. */
const DENTAL_SPECIALIST_HINGLISH = {
  noSite: bySpecialty((k) => `Google par aapka {kindNoun} dekha. ${SPECIALIST_NEED.hinglish[k]}, par clinic ki website nahi mili.`),
  found: "Google par aapka {kindNoun} dekha. {observation}",
  made: "Humne ek sample page banaya hai jisme {offer} hai.",
  offer: "Kya main ek sample page bana doon jisme {offer} ho?",
};
const DENTAL_SPECIALIST_EN = {
  noSite: bySpecialty((k) => `I found your {kindNoun} on Google. ${SPECIALIST_NEED.en[k]}, but I could not find the clinic's own website.`),
  found: "I found your {kindNoun} on Google. {observation}",
  made: DENTAL_MADE_EN,
  offer: DENTAL_OFFER_EN,
};

const DENTAL_FIRST: MessageTemplate[] = [
  ...firstSet("dental", "whatsapp", "hinglish", {
    noSite: "Google par aapka {kindNoun} dekha, par clinic ki apni website nahi mili, sirf listing dikhti hai.",
    poorSite: "Aapke {kindNoun} ki website phone par kholi. {observation}",
    madeNew: DENTAL_MADE_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hai.",
    offerNew: DENTAL_OFFER_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} ho?",
    specialist: DENTAL_SPECIALIST_HINGLISH,
  }),
  ...firstSet("dental", "whatsapp", "en", {
    noSite: "I found your {kindNoun} on Google, but no website of its own, only the listing.",
    poorSite: "I opened your {kindNoun}'s website on my phone. {observation}",
    madeNew: DENTAL_MADE_EN, madeFix: DENTAL_MADE_EN, offerNew: DENTAL_OFFER_EN, offerFix: DENTAL_OFFER_EN,
    specialist: DENTAL_SPECIALIST_EN,
  }),
  /* E-mail: "the way {visitor} would" is "a new patient", and "a parent" for a children's clinic. */
  ...firstSet("dental", "email", "en", {
    noSite: "I looked for your {kindNoun} on Google, the way {visitor} would, and found the listing but no website of its own. {need}",
    poorSite: "I opened your {kindNoun}'s website on my phone, the way {visitor} would. {observation}",
    madeNew: DENTAL_MADE_EN, madeFix: DENTAL_MADE_EN, offerNew: DENTAL_OFFER_EN, offerFix: DENTAL_OFFER_EN,
  }),
  ...firstSet("dental", "email", "hinglish", {
    noSite: "Maine Google par aapka {kindNoun} dhoondha, jaise {visitor} dhoondhta hai. Listing mili, par clinic ki apni website nahi mili. {need}",
    poorSite: "Maine aapke {kindNoun} ki website phone par kholi, jaise {visitor} kholta hai. {observation}",
    madeNew: DENTAL_MADE_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hai.",
    offerNew: DENTAL_OFFER_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} ho?",
  }),
];

/* Schools (the approved school samples): a parent looks for fees and admission first. */
const SCHOOL_FIRST: MessageTemplate[] = [
  ...firstSet("school", "whatsapp", "hinglish", {
    noSite: "Google par aapka school dekha, par school ki apni website nahi mili. Parents admission se pehle fees aur admission ki jaankari online dhoondhte hain.",
    poorSite: "Aapke school ki website phone par dekhi. {observation}",
    madeNew: MADE_NEW_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hain.",
    offerNew: OFFER_NEW_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} hon?",
    fixNote: OLD_SITE_NOTE,
  }),
  ...firstSet("school", "whatsapp", "en", {
    noSite: "I found your school on Google, but no website of its own. Parents look for fees and admission details online before they apply.",
    poorSite: "I opened your school's website on my phone. {observation}",
    madeNew: MADE_EN, madeFix: MADE_EN, offerNew: OFFER_EN, offerFix: OFFER_EN,
    fixNote: OLD_SITE_NOTE,
  }),
  ...firstSet("school", "whatsapp", "hi", {
    noSite: "Google पर आपका स्कूल देखा, पर स्कूल की अपनी वेबसाइट नहीं मिली। पेरेंट्स एडमिशन से पहले फ़ीस और एडमिशन की जानकारी ऑनलाइन ढूँढते हैं।",
    madeNew: "हमने आपके {kindNoun} के नाम से एक सैंपल पेज बनाया है जिसमें {offer} है।",
    offerNew: "क्या मैं आपके {kindNoun} के नाम से एक सैंपल पेज बना दूँ, जिसमें {offer} हो?",
  }),
  ...firstSet("school", "email", "en", {
    noSite: "I looked for your school on Google, the way a parent would, and found the listing but no website of its own. Parents look for fees and admission details online before they apply.",
    poorSite: "I opened your school's website on my phone, the way a parent would. {observation}",
    madeNew: MADE_EN, madeFix: MADE_EN, offerNew: OFFER_EN, offerFix: OFFER_EN,
    fixNote: OLD_SITE_NOTE,
  }),
  ...firstSet("school", "email", "hinglish", {
    noSite: "Maine Google par aapka school dhoondha, jaise ek parent dhoondhta hai. Listing mili, par school ki apni website nahi mili. Parents admission se pehle fees aur admission ki jaankari online dhoondhte hain.",
    poorSite: "Maine aapke school ki website phone par dekhi, jaise ek parent dekhta hai. {observation}",
    madeNew: MADE_NEW_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hain.",
    offerNew: OFFER_NEW_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} hon?",
    fixNote: OLD_SITE_NOTE,
  }),
];

/* Coaching institutes (the approved coaching samples): a student compares batches and fees first. */
const COACHING_FIRST: MessageTemplate[] = [
  ...firstSet("coaching", "whatsapp", "hinglish", {
    noSite: "Google par aapka institute dekha, par apni website nahi mili. Students batch aur fees pehle online compare karte hain.",
    poorSite: "Aapke institute ki site phone par kholi. {observation}",
    madeNew: MADE_NEW_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hain.",
    offerNew: OFFER_NEW_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} hon?",
  }),
  ...firstSet("coaching", "whatsapp", "en", {
    noSite: "I found your institute on Google, but no website of its own. Students compare batches and fees online first.",
    poorSite: "I opened your institute's website on my phone. {observation}",
    madeNew: MADE_EN, madeFix: MADE_EN, offerNew: OFFER_EN, offerFix: OFFER_EN,
  }),
  ...firstSet("coaching", "email", "en", {
    noSite: "I looked for your institute on Google, the way a student comparing institutes would, and found the listing but no website of its own. Students compare batches and fees online first.",
    poorSite: "I opened your institute's website on my phone, the way a student comparing institutes would. {observation}",
    madeNew: MADE_EN, madeFix: MADE_EN, offerNew: OFFER_EN, offerFix: OFFER_EN,
  }),
  ...firstSet("coaching", "email", "hinglish", {
    noSite: "Maine Google par aapka institute dhoondha, jaise ek student institutes compare karte waqt dhoondhta hai. Listing mili, par apni website nahi mili. Students batch aur fees pehle online compare karte hain.",
    poorSite: "Maine aapke institute ki site phone par kholi, jaise ek student institutes compare karte waqt kholta hai. {observation}",
    madeNew: MADE_NEW_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hain.",
    offerNew: OFFER_NEW_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} hon?",
  }),
];

/* Any other business (kind "other"): the same voice, with {kindNoun} "business".
   Its demo is made from a school, coaching or clinic template, and {offer} names
   what a demo of that kind has ("admission, fees aur enquiry form"); with no demo
   at hand it says "services, timing aur enquiry button". Never offered to a
   school, coaching or dental lead (ONLY_OTHER): each has its own approved messages. */
const ANY_MADE_NOTE = "It names what the demo has, from the kind of template it was made from: check the demo shows it.";
const ANY_FIRST: MessageTemplate[] = [
  ...firstSet("any", "whatsapp", "hinglish", {
    noSite: "Google par aapka {kindNoun} dekha, par apni website nahi mili, sirf listing dikhti hai.",
    poorSite: "Aapki website phone par kholi. {observation}",
    madeNew: MADE_NEW_SHORT_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hai.",
    offerNew: OFFER_NEW_SHORT_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} ho?",
    madeNote: ANY_MADE_NOTE,
  }),
  ...firstSet("any", "whatsapp", "en", {
    noSite: "I found your {kindNoun} on Google, but no website of its own, only the listing.",
    poorSite: "I opened your website on my phone. {observation}",
    madeNew: MADE_EN, madeFix: MADE_EN, offerNew: OFFER_EN, offerFix: OFFER_EN,
    madeNote: ANY_MADE_NOTE,
  }),
  ...firstSet("any", "email", "en", {
    noSite: "I looked for your {kindNoun} on Google and found the listing but no website of its own.",
    poorSite: "I opened your website on my phone. {observation}",
    madeNew: MADE_EN, madeFix: MADE_EN, offerNew: OFFER_EN, offerFix: OFFER_EN,
    madeNote: ANY_MADE_NOTE,
  }),
  ...firstSet("any", "email", "hinglish", {
    noSite: "Maine Google par aapka {kindNoun} dhoondha. Listing mili, par apni website nahi mili.",
    poorSite: "Maine aapki website phone par kholi. {observation}",
    madeNew: MADE_NEW_SHORT_HINGLISH,
    madeFix: "Humne ek sample banaya hai jisme {offer} hai.",
    offerNew: OFFER_NEW_SHORT_HINGLISH,
    offerFix: "Kya main ek sample bana doon jisme {offer} ho?",
    madeNote: ANY_MADE_NOTE,
  }),
];

/* A lead with a pitch page (a note on what we saw on their site and what each
   fix would take, not a new website). Needs the pitch page: it says it is written. */
const PITCH_NOTE = "For a lead with a pitch page. Only with something you checked on their site today. No link: it goes after they say yes.";
const pitchFirst = (id: string, channel: TemplateChannel, language: "en" | "hinglish", body: string): MessageTemplate => ({
  id,
  channel,
  stage: "first",
  pitch: "fix_website",
  kind: "any",
  language,
  label: "First message: the note I wrote on their site (pitch page)",
  note: PITCH_NOTE,
  ...(channel === "email" ? { subject: "{instituteName} website" } : {}),
  body,
  allowsLink: false,
  sample: "made",
  promises: "pitch",
});

const PITCH_FIRST: MessageTemplate[] = [
  pitchFirst("wa_first_pitch_any_hinglish", "whatsapp", "hinglish",
    `${HELLO.hinglish} Aapki website phone par kholi. {observation} Isi par maine aapke liye ek chhota note likha hai, ki kya theek karna hai aur har cheez mein kya lagega. ${APPROVED_ASK.hinglish}`),
  pitchFirst("wa_first_pitch_any_en", "whatsapp", "en",
    `${HELLO.en} I opened your website on my phone. {observation} I have written a short note for you on what to fix and what each fix would take. ${APPROVED_ASK.en}`),
  pitchFirst("em_first_pitch_any_en", "email", "en",
    `Dear {greeting},\n\nI opened your website on my phone. {observation} I have written a short note for you on this, with what each fix would take. It is a note, not a new website. ${APPROVED_ASK.en}`),
  pitchFirst("em_first_pitch_any_hinglish", "email", "hinglish",
    `Namaste {greeting},\n\nMaine aapki website phone par kholi. {observation} Isi par maine aapke liye ek chhota note likha hai, ki kya theek karna hai aur har cheez mein kya lagega. Ye note hai, nayi website nahi. ${APPROVED_ASK.hinglish}`),
];

/* ── After they say yes: the link, the honest line, two call times ────────── */

/** The line that travels with every demo link (the approved after-yes message). */
const SAMPLE_TRUTH: Record<TemplateLanguage, string> = {
  hinglish: "Ye sirf demonstration hai, aapki live site nahi, aur jo jaankari aapki taraf se nahi mili wo abhi sample hai.",
  en: "It is only a demonstration, not your live site, and anything we did not get from you is sample content for now.",
  hi: "ये सिर्फ़ डेमो है, आपकी लाइव साइट नहीं, और जो जानकारी आपकी तरफ़ से नहीं मिली वो अभी सैंपल है।",
};
/** One question with two times: {callSlots} is the next two working days in the kind's window. */
const CALL_ASK: Record<TemplateLanguage, string> = {
  hinglish: "10 minute ki call ke liye {callSlots}?",
  en: "Would {callSlots} suit you for a 10-minute call?",
  hi: "10 मिनट की कॉल के लिए {callSlots}?",
};
/* The link sits on its own line, with no full stop after it, so no app takes the stop into the address. */
const YES_WA: Record<TemplateLanguage, string> = {
  hinglish: `Shukriya {greeting}! Ye raha sample:\n{demoLink}\n\n${SAMPLE_TRUTH.hinglish} ${CALL_ASK.hinglish}`,
  en: `Thank you, {greeting}! Here is the sample:\n{demoLink}\n\n${SAMPLE_TRUTH.en} ${CALL_ASK.en}`,
  hi: `शुक्रिया {greeting}! ये रहा सैंपल:\n{demoLink}\n\n${SAMPLE_TRUTH.hi} ${CALL_ASK.hi}`,
};
const YES_EMAIL: Record<"en" | "hinglish", string> = {
  en: `Dear {greeting},\n\nThank you for your reply. Here is the sample:\n{demoLink}\n\n${SAMPLE_TRUTH.en} ${CALL_ASK.en}`,
  hinglish: `Namaste {greeting},\n\nJawab ke liye shukriya. Ye raha sample:\n{demoLink}\n\n${SAMPLE_TRUTH.hinglish} ${CALL_ASK.hinglish}`,
};

const YES_NOTE = "Only after they said yes, within the hour. The two call times follow their good window; change them if you like.";
const YES_KIND_NOTE: Record<TemplateKind, string> = {
  dental: "On a demo made from a template, the doctors, fees, timings, reviews and history are samples until the clinic sends its own; the message says so.",
  school: "On a demo made from a template, the fees, dates and results are samples until the school sends its own; the message says so.",
  coaching: "Before you send the link, take the template's results and toppers off the demo: a real institute's name must never sit next to toppers it did not give us.",
  any: "What the demo carries from its template is sample content until they send their own; the message says so.",
};
const REPLY_NOTE = "Reply in their thread: open their e-mail and press Reply, so the subject stays theirs.";

const yes = (id: string, channel: TemplateChannel, kind: TemplateKind, language: TemplateLanguage, body: string): MessageTemplate => ({
  id,
  channel,
  stage: "after_reply",
  pitch: "any",
  kind,
  language,
  label: `After they say yes: the sample link and two call times (${TAG[kind]})`,
  note: [YES_NOTE, YES_KIND_NOTE[kind], channel === "email" ? REPLY_NOTE : ""].filter(Boolean).join(" "),
  ...(channel === "email" ? { subject: "Re: {instituteName} website" } : {}),
  body,
  allowsLink: true,
  promises: "demo",
});

const PITCH_TRUTH = {
  hinglish: "Ye aapki nayi website nahi hai, sirf ek page hai jisme likha hai ki aapki site par kya dikha aur use theek karne mein kya lagega.",
  en: "It is not your new website, only a page on what I saw on your site and what each fix would take.",
};
const pitchYes = (id: string, channel: TemplateChannel, language: "en" | "hinglish", body: string): MessageTemplate => ({
  id,
  channel,
  stage: "after_reply",
  pitch: "fix_website",
  kind: "any",
  language,
  label: "After they say yes: the note's link and two call times (pitch page)",
  note: `Needs the pitch page. ${YES_NOTE}${channel === "email" ? ` ${REPLY_NOTE}` : ""}`,
  ...(channel === "email" ? { subject: "Re: {instituteName} website" } : {}),
  body,
  allowsLink: true,
  promises: "pitch",
});

const AFTER_YES: MessageTemplate[] = [
  yes("wa_after_reply_dental_hinglish", "whatsapp", "dental", "hinglish", YES_WA.hinglish),
  yes("wa_after_reply_dental_en", "whatsapp", "dental", "en", YES_WA.en),
  yes("wa_after_reply_dental_hi", "whatsapp", "dental", "hi", YES_WA.hi),
  yes("wa_after_reply_school_hinglish", "whatsapp", "school", "hinglish", YES_WA.hinglish),
  yes("wa_after_reply_coaching_hinglish", "whatsapp", "coaching", "hinglish", YES_WA.hinglish),
  yes("wa_after_reply_any_en", "whatsapp", "any", "en", YES_WA.en),
  yes("wa_after_reply_any_hinglish", "whatsapp", "any", "hinglish", YES_WA.hinglish),
  yes("wa_after_reply_hi", "whatsapp", "any", "hi", YES_WA.hi),
  /* A yes on a phone call: the link within five minutes; that yes is also their WhatsApp permission. */
  {
    ...yes("wa_after_reply_phone_hinglish", "whatsapp", "any", "hinglish",
      `Namaste {greeting}, {senderFirstName}, Ideovent se. Abhi phone par baat hui thi, ye raha sample:\n{demoLink}\n\n${SAMPLE_TRUTH.hinglish} Dekh kar bata dijiye kya badalna hai.`),
    label: "After a yes on the phone: the sample link, within five minutes",
    note: "Only after they said yes on a call and agreed to WhatsApp on this number: note the date, it is your permission. Send within five minutes.",
  },
  {
    ...yes("wa_after_reply_phone_en", "whatsapp", "any", "en",
      `Good {timeOfDay} {greeting}, {senderFirstName} from Ideovent here. As we just discussed on the phone, here is the sample:\n{demoLink}\n\n${SAMPLE_TRUTH.en} Have a look and tell me what you would change.`),
    label: "After a yes on the phone: the sample link, within five minutes",
    note: "Only after they said yes on a call and agreed to WhatsApp on this number: note the date, it is your permission. Send within five minutes.",
  },
  pitchYes("wa_after_reply_pitch_hinglish", "whatsapp", "hinglish", `Shukriya {greeting}! Ye raha note:\n{pitchLink}\n\n${PITCH_TRUTH.hinglish} ${CALL_ASK.hinglish}`),
  pitchYes("wa_after_reply_pitch_en", "whatsapp", "en", `Thank you, {greeting}! Here is the note:\n{pitchLink}\n\n${PITCH_TRUTH.en} ${CALL_ASK.en}`),
  yes("em_after_reply_dental_en", "email", "dental", "en", YES_EMAIL.en),
  yes("em_after_reply_dental_hinglish", "email", "dental", "hinglish", YES_EMAIL.hinglish),
  yes("em_after_reply_any_en", "email", "any", "en", YES_EMAIL.en),
  yes("em_after_reply_any_hinglish", "email", "any", "hinglish", YES_EMAIL.hinglish),
  pitchYes("em_after_reply_pitch_en", "email", "en",
    `Dear {greeting},\n\nThank you for your reply. Here is the note:\n{pitchLink}\n\n${PITCH_TRUTH.en} ${CALL_ASK.en}`),
  pitchYes("em_after_reply_pitch_hinglish", "email", "hinglish",
    `Namaste {greeting},\n\nJawab ke liye shukriya. Ye raha note:\n{pitchLink}\n\n${PITCH_TRUTH.hinglish} ${CALL_ASK.hinglish}`),
];

/* ── Follow-ups: ONE on WhatsApp (day 4, the last), three by e-mail (day 4, 9, 16) ── */

const WA_FOLLOW_UP: Record<"made" | "offer", Record<"en" | "hinglish", string>> = {
  made: {
    hinglish: "Namaste {greeting}, {senderFirstName}, Ideovent se. Kuch din pehle aapke {kindNoun} ke sample page ki baat ki thi. Main yahin chhod raha hoon, kabhi dekhna ho to bas \"haan\" likh dijiye.",
    en: "Good {timeOfDay} {greeting}, {senderFirstName} from Ideovent here. A few days ago I wrote about the sample page for your {kindNoun}. I will leave it here. If you want to see it later, just reply \"yes\".",
  },
  offer: {
    hinglish: "Namaste {greeting}, {senderFirstName}, Ideovent se. Kuch din pehle aapke {kindNoun} ke liye sample page ki baat ki thi. Main yahin chhod raha hoon, kabhi chahiye ho to bas \"haan\" likh dijiye.",
    en: "Good {timeOfDay} {greeting}, {senderFirstName} from Ideovent here. A few days ago I offered to make a sample page for your {kindNoun}. I will leave it here. If you would like one later, just reply \"yes\".",
  },
};

const waFollowUp = (id: string, kind: "dental" | "any", language: "en" | "hinglish", sample: "made" | "offer"): MessageTemplate => ({
  id,
  channel: "whatsapp",
  stage: "follow_up_1",
  pitch: "any",
  kind,
  language,
  label: `Follow-up: the one WhatsApp follow-up, day 4${sample === "offer" ? ", no demo yet" : ""} (${TAG[kind]})`,
  note: `Four days after the first message, only if they have not replied. It is the last WhatsApp: after it, e-mail, call or stop. ${WHEN[kind]}`,
  body: WA_FOLLOW_UP[sample][language],
  allowsLink: false,
  sample,
  promises: sample === "made" ? "demo" : null,
});

const WA_FOLLOW_UPS: MessageTemplate[] = [
  waFollowUp("wa_fu1_dental_hinglish", "dental", "hinglish", "made"),
  waFollowUp("wa_fu1_dental_en", "dental", "en", "made"),
  waFollowUp("wa_fu1_dental_hinglish_offer", "dental", "hinglish", "offer"),
  waFollowUp("wa_fu1_dental_en_offer", "dental", "en", "offer"),
  waFollowUp("wa_fu1_hinglish", "any", "hinglish", "made"),
  waFollowUp("wa_fu1_en", "any", "en", "made"),
  waFollowUp("wa_fu1_hinglish_offer", "any", "hinglish", "offer"),
  waFollowUp("wa_fu1_en_offer", "any", "en", "offer"),
];

/* E-mail: short replies in the same thread. Day 9 brings one new, true, useful
   point (their Google listing), never the observation of the first e-mail. Each
   opens with their name the way the approved day-4 sample does ("Dr. Mehta, a
   quick note ..."): {addressAs}, no greeting word before it. */
type FollowUpStage = "follow_up_1" | "follow_up_2" | "follow_up_3";
const EMAIL_FOLLOW_UP: Record<FollowUpStage, Record<"made" | "offer", Record<"en" | "hinglish", (who: { en: string; hinglish: string }) => string>>> = {
  follow_up_1: {
    made: {
      en: () => "{addressAs}, a quick note on the sample I made for {instituteName}. Shall I send the link?",
      // "aapke clinic ke liye", as the approved WhatsApp follow-up says it: a clinic named after
      // its doctor would otherwise read "Dr. Mehta, Mehta Dental Care ke liye ...".
      hinglish: () => "{addressAs}, aapke {kindNoun} ke liye jo sample banaya hai, uske baare mein ek chhoti si baat. Kya main aapko link bhej doon?",
    },
    offer: {
      en: () => "{addressAs}, a quick note on my e-mail about a sample page for {instituteName}. Shall I make one?",
      hinglish: () => "{addressAs}, aapke {kindNoun} ke liye sample page wale mail ke baare mein ek chhoti si baat. Kya main aapke liye ek bana doon?",
    },
  },
  follow_up_2: {
    made: {
      en: (w) => `{addressAs}, one more thing that may help, whether or not you use the sample: ${w.en} who search for {instituteName} on Google see its listing before any website, so it is worth checking that the timings and phone number there are right. Shall I send you the link to the sample?`,
      hinglish: (w) => `{addressAs}, ek aur baat jo kaam aa sakti hai, sample lein ya na lein: Google par {instituteName} dhoondhne ${w.hinglish} ko website se pehle aapki listing dikhti hai, isliye ek baar dekh lijiye ki usme timing aur phone number sahi hain. Kya main aapko sample ka link bhej doon?`,
    },
    offer: {
      en: (w) => `{addressAs}, one more thing that may help, whether or not you want a sample page: ${w.en} who search for {instituteName} on Google see its listing before any website, so it is worth checking that the timings and phone number there are right. Shall I make the sample page for you?`,
      hinglish: (w) => `{addressAs}, ek aur baat jo kaam aa sakti hai, sample page chahiye ho ya na ho: Google par {instituteName} dhoondhne ${w.hinglish} ko website se pehle aapki listing dikhti hai, isliye ek baar dekh lijiye ki usme timing aur phone number sahi hain. Kya main aapke liye sample page bana doon?`,
    },
  },
  /* Day 16, the approved words: "I will close this here. If you want to see it
     later, just reply yes." In Hinglish, the approved WhatsApp follow-up's own
     line: "Main yahin chhod raha hoon, kabhi dekhna ho to bas "haan" likh dijiye." */
  follow_up_3: {
    made: {
      en: () => "{addressAs}, I will close this here. If you want to see it later, just reply yes.",
      hinglish: () => "{addressAs}, main yahin chhod raha hoon, kabhi dekhna ho to bas \"haan\" likh dijiye.",
    },
    offer: {
      en: () => "{addressAs}, I will close this here. If you would like a sample page later, just reply yes.",
      hinglish: () => "{addressAs}, main yahin chhod raha hoon, kabhi sample page chahiye ho to bas \"haan\" likh dijiye.",
    },
  },
};

const FOLLOW_UP_DAY: Record<FollowUpStage, { tag: string; label: string; note: string }> = {
  follow_up_1: { tag: "fu1", label: "Follow-up, day 4", note: "Day 4, only if they have not replied." },
  follow_up_2: { tag: "fu2", label: "Follow-up 2, day 9: one useful point", note: "Day 9. One new point, never the observation of the first e-mail." },
  follow_up_3: { tag: "fu3", label: "Closing, day 16", note: "Day 16, the last e-mail. If they say no, mark the lead lost." },
};

const emFollowUp = (stage: FollowUpStage, kind: "dental" | "any", language: "en" | "hinglish", sample: "made" | "offer"): MessageTemplate => ({
  id: `em_${FOLLOW_UP_DAY[stage].tag}_${kind}_${language}${sample === "offer" ? "_offer" : ""}`,
  channel: "email",
  stage,
  pitch: "any",
  kind,
  language,
  label: `${FOLLOW_UP_DAY[stage].label}${sample === "offer" ? ", no demo yet" : ""} (${TAG[kind]})`,
  note: `${SAME_THREAD_NOTE} ${FOLLOW_UP_DAY[stage].note}`,
  subject: "Re: {instituteName} website",
  body: EMAIL_FOLLOW_UP[stage][sample][language](kind === "dental" ? { en: "patients", hinglish: "wale patients" } : { en: "people", hinglish: "walon" }),
  allowsLink: false,
  sample,
  promises: sample === "made" ? "demo" : null,
});

const EMAIL_FOLLOW_UPS: MessageTemplate[] = (["follow_up_1", "follow_up_2", "follow_up_3"] as FollowUpStage[]).flatMap((stage) =>
  (["dental", "any"] as const).flatMap((kind) =>
    (["en", "hinglish"] as const).flatMap((language) =>
      (["made", "offer"] as const).map((sample) => emFollowUp(stage, kind, language, sample)),
    ),
  ),
);

/* ── After the call: the approved same-day summary ────────────────────────── */

/** What we need from them, per kind (the approved dental line: "logo, doctors ki details, timing, clinic ki 5-6 photos"). */
const WE_NEED: Record<TemplateKind, { en: string; hinglish: string }> = {
  dental: { en: "the logo, the doctors' details, your timings and 5 or 6 photos of the clinic", hinglish: "logo, doctors ki details, timing, clinic ki 5-6 photos" },
  school: { en: "the logo, the fee list, the admission dates and 5 or 6 photos of the school", hinglish: "logo, fees ki list, admission ki dates, school ki 5-6 photos" },
  coaching: { en: "the logo, the list of courses and batches, the fees and 5 or 6 photos of the institute", hinglish: "logo, courses aur batches ki list, fees, institute ki 5-6 photos" },
  any: { en: "the logo, your services and timings, and 5 or 6 photos", hinglish: "logo, services aur timing ki jaankari, 5-6 photos" },
};

const SUMMARY_NOTE =
  "Send the same day as the call. Fill in the package and price you agreed and the date of the first version: it cannot be sent until you do. Change the list to what was agreed, the payment line too: it must match what you said on the call and what the proposal will say.";

function summary(kind: TemplateKind, channel: TemplateChannel, language: "en" | "hinglish"): string {
  const thanks = language === "en" ? (kind === "dental" ? "Thank you, Doctor." : "Thank you.") : kind === "dental" ? "Shukriya Doctor." : "Shukriya.";
  const list =
    language === "en"
      ? `- Package: [package and price]\n- Payment: 50% in advance, 50% at launch\n- What I need from you: ${WE_NEED[kind].en}\n- First version: [date]`
      : `- Package: [package and price]\n- Payment: 50% advance, 50% launch par\n- Mujhe chahiye: ${WE_NEED[kind].hinglish}\n- Pehla version: [date]`;
  // WhatsApp opens with their name alone, as the approved summary does: "Dr. Mehta, aaj ki baat ka summary:".
  if (channel === "whatsapp") {
    return language === "en"
      ? `{addressAs}, a summary of our call today:\n${list}\nIf anything should change, just tell me. ${thanks}`
      : `{addressAs}, aaj ki baat ka summary:\n${list}\nKuch badalna ho to bata dijiye. ${thanks}`;
  }
  return language === "en"
    ? `Dear {greeting},\n\nThank you for your time today. A summary of our call:\n${list}\n\nIf anything should change, just reply. ${thanks}`
    : `Namaste {greeting},\n\nAaj time dene ke liye shukriya. Aaj ki baat ka summary:\n${list}\n\nKuch badalna ho to reply kar dijiye. ${thanks}`;
}

const afterCall = (id: string, channel: TemplateChannel, kind: TemplateKind, language: "en" | "hinglish"): MessageTemplate => ({
  id,
  channel,
  stage: "after_call",
  pitch: "any",
  kind,
  language,
  label: `After the call: the summary, same day (${TAG[kind]})`,
  note: SUMMARY_NOTE,
  ...(channel === "email" ? { subject: language === "en" ? "{instituteName} website: summary of our call" : "{instituteName} website: aaj ki baat" } : {}),
  body: summary(kind, channel, language),
  allowsLink: false,
  promises: null,
  ...(kind === "any" ? ONLY_OTHER : {}),
});

const AFTER_CALL: MessageTemplate[] = [
  afterCall("wa_after_call_dental_hinglish", "whatsapp", "dental", "hinglish"),
  afterCall("wa_after_call_dental_en", "whatsapp", "dental", "en"),
  afterCall("wa_after_call_school_hinglish", "whatsapp", "school", "hinglish"),
  afterCall("wa_after_call_school_en", "whatsapp", "school", "en"),
  afterCall("wa_after_call_coaching_hinglish", "whatsapp", "coaching", "hinglish"),
  afterCall("wa_after_call_coaching_en", "whatsapp", "coaching", "en"),
  afterCall("wa_after_call_hinglish", "whatsapp", "any", "hinglish"),
  afterCall("wa_after_call_en", "whatsapp", "any", "en"),
  afterCall("em_after_call_dental_en", "email", "dental", "en"),
  afterCall("em_after_call_dental_hinglish", "email", "dental", "hinglish"),
  afterCall("em_after_call_school_en", "email", "school", "en"),
  afterCall("em_after_call_school_hinglish", "email", "school", "hinglish"),
  afterCall("em_after_call_coaching_en", "email", "coaching", "en"),
  afterCall("em_after_call_coaching_hinglish", "email", "coaching", "hinglish"),
  afterCall("em_after_call_any_en", "email", "any", "en"),
  afterCall("em_after_call_any_hinglish", "email", "any", "hinglish"),
];

/* ── Proposal: the PDF by e-mail, a WhatsApp note, and the day-3 follow-up ── */

const PROPOSAL_TEXT = {
  email: {
    /* The payment terms are named, not restated: the PDF carries them, and a split typed here could contradict it. */
    en: "Dear {greeting},\n\nAs we discussed, the proposal for {instituteName} is attached: the package, the price, the payment terms, what I need from you and the timeline, in one place. Shall we start on [date]? If anything is unclear, just reply.",
    hinglish: "Namaste {greeting},\n\nJaisi baat hui thi, {instituteName} ka proposal saath mein attach hai: package, price, payment kaise hoga, aapse kya chahiye aur timeline, sab ek jagah. Kya hum [date] se shuru karein? Kuch saaf na ho to reply kar dijiye.",
  },
  whatsapp: {
    en: "{addressAs}, I have sent the proposal for {instituteName} to your e-mail: the package, the price, what I need from you and the timeline, in one place. Shall we start on [date]? If anything is unclear, just ask here.",
    hinglish: "{addressAs}, aapke {kindNoun} ka proposal email par bhej diya hai: package, price, aapse kya chahiye aur timeline, sab ek jagah. Kya hum [date] se shuru karein? Kuch saaf na ho to yahin pooch lijiye.",
  },
};
const PROPOSAL_CHASE = {
  en: "{addressAs}, a quick note on the proposal I sent. Shall we start on [date]? If now is not the right time, tell me and I will close the file. Either answer is fine.",
  hinglish: "{addressAs}, proposal ke baare mein ek chhoti si baat. Kya hum [date] se shuru karein? Abhi sahi time nahi hai to bata dijiye, main file band kar dunga. Dono jawab theek hain.",
};

const proposal = (id: string, channel: TemplateChannel, kind: "dental" | "any", language: "en" | "hinglish", chase: boolean): MessageTemplate => ({
  id,
  channel,
  stage: "proposal",
  pitch: "any",
  kind,
  language,
  label: chase
    ? `Proposal: the follow-up, day 3 (${TAG[kind]})`
    : channel === "email" ? `Proposal: the PDF by e-mail (${TAG[kind]})` : `Proposal: sent to your e-mail (${TAG[kind]})`,
  note: chase
    ? `Three days after the proposal.${channel === "email" ? ` ${SAME_THREAD_NOTE}` : ""} Fill in the start date you proposed: it cannot be sent until you do.`
    : channel === "email"
      ? "Attach the proposal PDF in your mail app before pressing Send. Fill in the start date: it cannot be sent until you do. The price and the payment terms are in the PDF, not in the text."
      : "The proposal itself goes by e-mail; this says it has been sent. Fill in the start date. No price in this message.",
  ...(channel === "email" ? { subject: chase ? "Re: {instituteName} website: proposal" : "{instituteName} website: proposal" } : {}),
  body: chase ? PROPOSAL_CHASE[language] : PROPOSAL_TEXT[channel][language],
  allowsLink: false,
  promises: null,
});

const PROPOSALS: MessageTemplate[] = [
  proposal("em_proposal_dental_en", "email", "dental", "en", false),
  proposal("em_proposal_dental_hinglish", "email", "dental", "hinglish", false),
  proposal("em_proposal_any_en", "email", "any", "en", false),
  proposal("em_proposal_any_hinglish", "email", "any", "hinglish", false),
  proposal("wa_proposal_dental_hinglish", "whatsapp", "dental", "hinglish", false),
  proposal("wa_proposal_dental_en", "whatsapp", "dental", "en", false),
  proposal("wa_proposal_hinglish", "whatsapp", "any", "hinglish", false),
  proposal("wa_proposal_en", "whatsapp", "any", "en", false),
  proposal("em_proposal_chase_dental_en", "email", "dental", "en", true),
  proposal("em_proposal_chase_dental_hinglish", "email", "dental", "hinglish", true),
  proposal("em_proposal_chase_any_en", "email", "any", "en", true),
  proposal("em_proposal_chase_any_hinglish", "email", "any", "hinglish", true),
  proposal("wa_proposal_chase_dental_hinglish", "whatsapp", "dental", "hinglish", true),
  proposal("wa_proposal_chase_dental_en", "whatsapp", "dental", "en", true),
  proposal("wa_proposal_chase_hinglish", "whatsapp", "any", "hinglish", true),
  proposal("wa_proposal_chase_en", "whatsapp", "any", "en", true),
];

/* ── Retired (30 Sep 2026): WhatsApp follow-ups 2 and 3 ──────────────────────
 * WhatsApp now gets one follow-up, and it is the last. These are kept, word for
 * word as they were sent, only so a history entry naming them still resolves.
 * templatesFor never offers them and checkSend blocks them. */
const OLD_HONEST_EN =
  "To be straight with you, building websites is my work, which is why I am writing. But anyone can sort this out for you, not only us.";
const OLD_HONEST_HINGLISH =
  "Saaf baat: ye kaam main karta hoon, isliye likh raha hoon. Par ye aap kisi se bhi karwa sakte hain, zaroori nahi ki hum hi karein.";

const retired = (id: string, stage: "follow_up_2" | "follow_up_3", kind: "dental" | "any", language: "en" | "hinglish", body: string): MessageTemplate => ({
  id,
  channel: "whatsapp",
  stage,
  pitch: "any",
  kind,
  language,
  label: `Retired: WhatsApp follow-up ${stage === "follow_up_2" ? "2" : "3"}${kind === "dental" ? " (dental)" : ""}`,
  note: "Retired on 30 Sep 2026: WhatsApp gets one follow-up only. Kept for the history.",
  body,
  allowsLink: false,
  promises: null,
  retired: true,
});

export const RETIRED_TEMPLATES: MessageTemplate[] = [
  retired("wa_fu2_dental_hinglish", "follow_up_2", "dental", "hinglish",
    `Namaste {contactName}, {instituteName} ki site ek patient ki nazar se dekhi to ek cheez dikhi:\n\n{observation}\n\n${OLD_HONEST_HINGLISH}\n\nBaaki jab aapka mann ho tab baat kar lenge, main pareshan nahi karunga.`),
  retired("wa_fu2_dental_en", "follow_up_2", "dental", "en",
    `{contactName}, I looked at {instituteName}'s site the way a patient would and noticed one thing:\n\n{observation}\n\n${OLD_HONEST_EN}\n\nWhenever you feel like talking, we can. I will not keep messaging.`),
  retired("wa_fu3_dental_hinglish", "follow_up_3", "dental", "hinglish",
    "Namaste {contactName}, ye is baare mein mera aakhri message hai. Clinic mein aapka din bhara hota hai, main baar baar aapke phone pe nahi aana chahta.\n\nAgar abhi time theek nahi hai to bilkul koi baat nahi. Ek line likh dijiye, main file band kar deta hoon aur demonstration hata deta hoon.\n\nAur agar baat kahin atki hui hai, to bata dijiye kahan, ho sakta hai main help kar sakun.\n\nDono jawab mere liye theek hain. Shukriya."),
  retired("wa_fu3_dental_en", "follow_up_3", "dental", "en",
    "{contactName}, this is my last message about this. I know clinic days are full, and I do not want to keep turning up on your phone.\n\nIf the timing is not right, that is completely fine. One line back and I will close the file and take the demonstration down.\n\nAnd if it is stuck somewhere, tell me where, I may be able to help.\n\nEither answer is fine with me. Thank you."),
  retired("wa_fu2_hinglish", "follow_up_2", "any", "hinglish",
    `{contactName} ji, ek cheez dikhi to soch ke bhej raha hoon:\n\n{observation}\n\n${OLD_HONEST_HINGLISH}\n\nBaaki jab aapka mann ho tab baat kar lenge, main pareshan nahi karunga.`),
  retired("wa_fu2_en", "follow_up_2", "any", "en",
    `{contactName}, I noticed one thing and thought I should pass it on:\n\n{observation}\n\n${OLD_HONEST_EN}\n\nWhenever you feel like talking, we can. I will not keep messaging.`),
  retired("wa_fu3_hinglish", "follow_up_3", "any", "hinglish",
    "{contactName} ji, ye is baare mein mera aakhri message hai, main baar baar aapke phone pe nahi aana chahta.\n\nAgar abhi time theek nahi hai to bilkul koi baat nahi. Ek line likh dijiye, main file band kar deta hoon.\n\nAur agar baat kahin atki hui hai, to bata dijiye kahan, ho sakta hai main help kar sakun.\n\nDono jawab mere liye theek hain. Shukriya."),
  retired("wa_fu3_en", "follow_up_3", "any", "en",
    "{contactName}, this is my last message about this, I do not want to keep turning up on your phone.\n\nIf the timing is not right, that is completely fine. One line back and I will close the file.\n\nAnd if it is stuck somewhere, tell me where, I may be able to help.\n\nEither answer is fine with me. Thank you."),
];

/**
 * Every message the Outreach section offers. The order breaks ties in the
 * picker: a kind's own messages before the neutral ones, and a "sample made"
 * message before its "offer to make one" twin.
 */
export const OUTREACH_TEMPLATES: MessageTemplate[] = [
  ...DENTAL_FIRST,
  ...SCHOOL_FIRST,
  ...COACHING_FIRST,
  ...ANY_FIRST,
  ...PITCH_FIRST,
  ...AFTER_YES,
  ...WA_FOLLOW_UPS,
  ...EMAIL_FOLLOW_UPS,
  ...AFTER_CALL,
  ...PROPOSALS,
];

/* ── Lookups ─────────────────────────────────────────────────────────────── */

const BY_ID = new Map([...OUTREACH_TEMPLATES, ...RETIRED_TEMPLATES].map((t) => [t.id, t]));

/** A template by id, the retired ones included (a history entry may name one). */
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

/** True when a template is marked as never for this lead kind (its words belong to another kind). */
export function templateNotFor(t: Pick<MessageTemplate, "notForKinds">, kind: string | undefined | null): boolean {
  return Boolean(kind && t.notForKinds?.some((k) => k === kind));
}

/**
 * Templates that fit a filter. "any" on a template matches every value; a
 * filter value of undefined matches every template. Exact matches sort first.
 * A lead kind gets its own templates plus the "any" ones, never another
 * kind's, and never an "any" one marked notForKinds for it. A retired
 * template is never offered.
 */
export function templatesFor(filter: TemplateFilter = {}): MessageTemplate[] {
  const fits = (want: string | undefined, have: string) =>
    want === undefined || want === "any" || have === "any" || have === want;
  const kind = filter.kind === "other" ? "any" : filter.kind;
  const score = (t: MessageTemplate) =>
    (kind && t.kind === kind ? 2 : 0) + (filter.pitch && t.pitch === filter.pitch ? 1 : 0);
  return OUTREACH_TEMPLATES.filter(
    (t) =>
      !t.retired &&
      (!filter.channel || t.channel === filter.channel) &&
      (!filter.stage || t.stage === filter.stage) &&
      (!filter.language || t.language === filter.language) &&
      (filter.kind === "other" ? t.kind === "any" : fits(kind, t.kind)) &&
      !templateNotFor(t, filter.kind) &&
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
