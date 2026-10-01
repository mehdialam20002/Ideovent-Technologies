/**
 * Outreach message templates: the ready-made e-mails and WhatsApp messages the
 * admin's Outreach section offers for one lead.
 *
 * THE FORMAT IS MEHDI'S (1 Oct 2026). He said "msz me line break nahi" and
 * "pehle problem btao fir solution ache se btao", read the examples in
 * 04-sales-kit/APPROVED-MESSAGES-2026-10-01.md and said "thik hai ye sare
 * templete daal ke av live kro". Every first WhatsApp is short lines in five
 * parts, ONE blank line between parts:
 *   1. the greeting, then who is writing, each on its own line
 *      ("Namaste {greeting}," / "Main {senderFirstName}, Ideovent Technologies (Saket, Delhi) se.");
 *   2. the problem: what was checked, {observation} for a site of their own;
 *   3. {impact}: one line on what that costs them, through their patient's,
 *      parent's or student's eyes, no numbers, no fear (engine.ts impactFor);
 *   4. the solution line ("Isliye humne aapke clinic ke naam se ek sample website
 *      banayi hai:") and {offer}, three bullets that answer the problem (engine.ts offerFor);
 *   5. the ask and the easy no, each on its own line.
 * Every other stage (the link after a yes, the follow-up, the summary, the
 * proposal) has the same look: short lines, a blank line between parts,
 * bullets where a list helps. An e-mail has the same parts as paragraphs; it
 * greets on its own line and does not say who is writing, because the From
 * line and the signature do (04-sales-kit/cold-email/EMAIL-RULES.md section 6).
 * scripts/test-outreach-engine.mjs renders the approved examples word for word
 * and checks the shape of every first message;
 * 04-sales-kit/OUTREACH-TEMPLATES-RENDERED-2026-10-01.md shows every message
 * as it renders.
 *
 * THE RULES OF 30 SEP 2026 STILL HOLD (APPROVED-MESSAGES-2026-09-30.md): no
 * link, price, emoji, "best", "free", "guaranteed" or urgency in a first
 * message; the problem line is something checked the same day, never a guess;
 * one message, then wait.
 *
 * THE LADDER
 *   first        WhatsApp and e-mail, no link. "Isliye humne ... sample website
 *                banayi hai:", the bullets, "Kya main aapko link bhej doon?" and the
 *                easy no. A lead with no demo yet gets the twin that OFFERS to make
 *                one (sample "offer"): no message says a sample is made when it is not.
 *   after_reply  after a yes: the link on its own line, "Ye sirf demonstration hai ...", two call times.
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
 * sample content ("jo jaankari aapki taraf se nahi mili, wo abhi sample hai").
 * A bullet names one-tap call, WhatsApp or an enquiry form only when their own
 * number is on the demo (a template duplicate clears every contact). No client,
 * result, number or rating is claimed; no price is typed into a message (the
 * summary and the proposal leave [package and price] to the sender). No em
 * dashes. No web address is printed in a first message.
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
}

export const MERGE_FIELDS = [
  "greeting",
  "addressAs",
  "senderFirstName",
  "timeOfDay",
  "kindNoun",
  "impact",
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

/* ── The approved lines (1 Oct 2026) ──────────────────────────────────────── */

/** Part 1 of every WhatsApp first message, line one: the greeting by name and title. */
export const GREET: Record<TemplateLanguage, string> = {
  hinglish: "Namaste {greeting},",
  en: "Good {timeOfDay} {greeting},",
  hi: "नमस्ते {greeting},",
};

/** Part 1, line two, after a blank line: who is writing, and from where. */
export const WHO: Record<TemplateLanguage, string> = {
  hinglish: "Main {senderFirstName}, Ideovent Technologies (Saket, Delhi) se.",
  en: "I am {senderFirstName} from Ideovent Technologies, Saket, Delhi.",
  hi: "मैं {senderFirstName}, Ideovent Technologies (साकेत, दिल्ली) से।",
};

/** An e-mail's greeting, on its own line. Who is writing is in the From line and the signature. */
const MAIL_GREET: Record<TemplateLanguage, string> = {
  en: "Dear {greeting},",
  hinglish: "Namaste {greeting},",
  hi: "नमस्ते {greeting},",
};

/** Part 5 of a first message about a sample already made: the one question, then the easy no on its own line. */
export const APPROVED_ASK: Record<TemplateLanguage, string> = {
  hinglish: "Kya main aapko link bhej doon?\nPasand na aaye to koi baat nahi.",
  en: "Shall I send you the link?\nIf it is not useful, no problem at all.",
  hi: "क्या मैं आपको लिंक भेज दूँ?\nपसंद न आए तो कोई बात नहीं।",
};

/** Part 5 of the twin that offers to make the sample: the one question, then the easy no. */
export const OFFER_ASK: Record<TemplateLanguage, string> = {
  hinglish: "Kya main ye sample bana doon?\nPasand na aaye to koi baat nahi.",
  en: "Shall I make it for you?\nIf it is not useful, no problem at all.",
  hi: "क्या मैं ये सैंपल बना दूँ?\nपसंद न आए तो कोई बात नहीं।",
};

/** The easy no: the last line of every first message. */
export const EASY_NO: Record<TemplateLanguage, string> = {
  hinglish: "Pasand na aaye to koi baat nahi.",
  en: "If it is not useful, no problem at all.",
  hi: "पसंद न आए तो कोई बात नहीं।",
};

/**
 * Why a specialist clinic's patients look online first (the approved implant and
 * kids lines of 30 Sep 2026), without the full stop. engine.ts says them as the
 * impact line of a specialist clinic with no website ("... dhoondhte hain. Ye na
 * mile to ..."), and {need} is the same words as a sentence of its own.
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
 * and the neutral one would say the wrong thing to them (a business's
 * "services and timings" to a school, a summary asking a principal for
 * "services aur timing").
 */
const ONLY_OTHER: Pick<MessageTemplate, "notForKinds"> = { notForKinds: ["dental", "school", "coaching"] };

/** Parts of a message, one blank line between each (the approved look). */
const parts = (...p: string[]): string => p.join("\n\n");

/* ── First messages: one builder, the approved five parts ─────────────────── */

/**
 * The words of one kind's first messages on one channel, in one language. The
 * builder puts the five parts together, a blank line between each: the greeting
 * and who (an e-mail: the greeting only), the problem, {impact}, the solution
 * line with {offer} under it, and the ask with the easy no.
 *   noSite    the problem when they have no website of their own (the approved
 *             "Google par aapka clinic dekha. Clinic ki apni website nahi hai,
 *             sirf Google listing hai.");
 *   poorSite  the problem on their own site: where you looked, then {observation};
 *   noun      their place in the solution line: "clinic" for every dental clinic,
 *             as the approved samples say it, "school", "institute", "{kindNoun}".
 */
interface FirstLines {
  noSite: string;
  poorSite?: string;
  noun: string;
  /** A hint for Mehdi on the "their site" messages. */
  fixNote?: string;
  /** A hint for Mehdi on the messages that say the sample is made. */
  madeNote?: string;
}

/** Part 4's first line: the sample made, or offered; a new website, or a new sample of theirs. */
const SOLUTION: Record<TemplateLanguage, Record<"made" | "offer", Record<"new" | "fix", (noun: string) => string>>> = {
  hinglish: {
    made: {
      new: (n) => `Isliye humne aapke ${n} ke naam se ek sample website banayi hai:`,
      fix: (n) => `Isliye humne aapke ${n} ka ek naya sample banaya hai:`,
    },
    offer: {
      new: (n) => `Isliye main aapke ${n} ke naam se ek sample website banana chahta hoon:`,
      fix: (n) => `Isliye main aapke ${n} ka ek naya sample banana chahta hoon:`,
    },
  },
  en: {
    made: { new: (n) => `So we made a sample website for your ${n}:`, fix: (n) => `So we made a new sample website for your ${n}:` },
    offer: { new: (n) => `So I would like to make a sample website for your ${n}:`, fix: (n) => `So I would like to make a new sample website for your ${n}:` },
  },
  hi: {
    made: { new: (n) => `इसलिए हमने आपके ${n} के नाम से एक सैंपल वेबसाइट बनाई है:`, fix: (n) => `इसलिए हमने आपके ${n} का एक नया सैंपल बनाया है:` },
    offer: { new: (n) => `इसलिए मैं आपके ${n} के नाम से एक सैंपल वेबसाइट बनाना चाहता हूँ:`, fix: (n) => `इसलिए मैं आपके ${n} का एक नया सैंपल बनाना चाहता हूँ:` },
  },
};

/** What a "sample made" message lists only when their own number is on the demo (engine.ts offerFor). */
const NUMBER_NOTE: Record<TemplateKind, string> = {
  dental: "It names one-tap call or WhatsApp only when the clinic's number is on the demo.",
  school: "It names the enquiry form only when the school's WhatsApp number is on the demo.",
  coaching: "It names one-tap enquiry, call or WhatsApp only when the institute's number is on the demo.",
  any: "It names one-tap call or WhatsApp only when their number is on the demo.",
};

function firstSet(kind: TemplateKind, channel: TemplateChannel, language: TemplateLanguage, l: FirstLines): MessageTemplate[] {
  const head = channel === "email" ? MAIL_GREET[language] : parts(GREET[language], WHO[language]);
  const out: MessageTemplate[] = [];
  const add = (pitch: "new_website" | "fix_website", sample: "made" | "offer", problem: string, extra?: string) => {
    const fix = pitch === "fix_website";
    const id = `${channel === "email" ? "em" : "wa"}_first_${fix ? "fix" : "new"}_${kind}_${language}${sample === "offer" ? "_offer" : ""}`;
    const note = [
      WHEN[kind],
      fix ? "Only with something you checked on their site today." : "Only when you searched today and found no website of their own; it says you saw them on Google.",
      sample === "made" ? "Needs the demo: it says the sample is made." : "For a lead with no demo yet: it offers to make one.",
      sample === "made" ? NUMBER_NOTE[kind] : undefined,
      sample === "made" ? l.madeNote : undefined,
      `No link${channel === "email" ? " in this e-mail" : ""}: the link goes after they say yes.`,
      extra,
    ];
    out.push({
      id,
      channel,
      stage: "first",
      pitch,
      kind,
      language,
      label: `First message: ${fix ? "their site" : "no website"}, ${sample === "made" ? "sample made" : "offer a sample"} (${TAG[kind]})`,
      note: note.filter(Boolean).join(" "),
      ...(channel === "email" ? { subject: "{instituteName} website" } : {}),
      body: parts(
        head,
        problem,
        "{impact}",
        `${SOLUTION[language][sample][fix ? "fix" : "new"](l.noun)}\n{offer}`,
        sample === "made" ? APPROVED_ASK[language] : OFFER_ASK[language],
      ),
      allowsLink: false,
      sample,
      promises: sample === "made" ? "demo" : null,
      ...(kind === "any" ? ONLY_OTHER : {}),
    });
  };
  add("new_website", "made", l.noSite);
  if (l.poorSite) add("fix_website", "made", l.poorSite, l.fixNote);
  add("new_website", "offer", l.noSite);
  if (l.poorSite) add("fix_website", "offer", l.poorSite, l.fixNote);
  return out;
}

const OLD_SITE_NOTE = "For an old website, pick \"Old admission session\" and type the session you saw.";

/* Dental clinics (the approved dental examples). {kindNoun} is "clinic", or the
   specialty where the lead names one ("Google par aapka implant centre dekha");
   the solution line says "clinic", as the approved examples do. A specialist
   clinic gets its specialty's impact line and bullets from the engine. An
   e-mail adds "the way {visitor} would": a new patient, or a parent for a
   children's clinic. */
const DENTAL_FIRST: MessageTemplate[] = [
  ...firstSet("dental", "whatsapp", "hinglish", {
    noSite: "Google par aapka {kindNoun} dekha. Clinic ki apni website nahi hai, sirf Google listing hai.",
    poorSite: "Aapke {kindNoun} ki website phone par kholi. {observation}",
    noun: "clinic",
  }),
  ...firstSet("dental", "whatsapp", "en", {
    noSite: "I found your {kindNoun} on Google, but it has no website of its own, only the Google listing.",
    poorSite: "I opened your {kindNoun}'s website on my phone. {observation}",
    noun: "clinic",
  }),
  ...firstSet("dental", "email", "en", {
    noSite: "I looked for your {kindNoun} on Google, the way {visitor} would, and found the listing but no website of its own.",
    poorSite: "I opened your {kindNoun}'s website on my phone, the way {visitor} would. {observation}",
    noun: "clinic",
  }),
  ...firstSet("dental", "email", "hinglish", {
    noSite: "Maine Google par aapka {kindNoun} dhoondha, jaise {visitor} dhoondhta hai. Listing mili, par clinic ki apni website nahi mili.",
    poorSite: "Maine aapke {kindNoun} ki website phone par kholi, jaise {visitor} kholta hai. {observation}",
    noun: "clinic",
  }),
];

/* Schools (the approved school examples): a parent looks for fees and admission first. */
const SCHOOL_FIRST: MessageTemplate[] = [
  ...firstSet("school", "whatsapp", "hinglish", {
    noSite: "Google par aapka school dekha. School ki apni website nahi hai, sirf Google listing hai.",
    poorSite: "Aapke school ki website dekhi. {observation}",
    noun: "school",
    fixNote: OLD_SITE_NOTE,
  }),
  ...firstSet("school", "whatsapp", "en", {
    noSite: "I found your school on Google, but it has no website of its own, only the Google listing.",
    poorSite: "I looked at your school's website. {observation}",
    noun: "school",
    fixNote: OLD_SITE_NOTE,
  }),
  ...firstSet("school", "whatsapp", "hi", {
    noSite: "Google पर आपका स्कूल देखा। स्कूल की अपनी वेबसाइट नहीं है, सिर्फ़ Google लिस्टिंग है।",
    noun: "{kindNoun}",
  }),
  ...firstSet("school", "email", "en", {
    noSite: "I looked for your school on Google, the way a parent would, and found the listing but no website of its own.",
    poorSite: "I looked at your school's website, the way a parent would. {observation}",
    noun: "school",
    fixNote: OLD_SITE_NOTE,
  }),
  ...firstSet("school", "email", "hinglish", {
    noSite: "Maine Google par aapka school dhoondha, jaise ek parent dhoondhta hai. Listing mili, par school ki apni website nahi mili.",
    poorSite: "Maine aapke school ki website dekhi, jaise ek parent dekhta hai. {observation}",
    noun: "school",
    fixNote: OLD_SITE_NOTE,
  }),
];

/* Coaching institutes (the approved coaching examples): a student compares batches and fees first. */
const COACHING_FIRST: MessageTemplate[] = [
  ...firstSet("coaching", "whatsapp", "hinglish", {
    noSite: "Google par aapka institute dekha. Institute ki apni website nahi hai, sirf Google listing hai.",
    poorSite: "Aapke institute ki website phone par kholi. {observation}",
    noun: "institute",
  }),
  ...firstSet("coaching", "whatsapp", "en", {
    noSite: "I found your institute on Google, but it has no website of its own, only the Google listing.",
    poorSite: "I opened your institute's website on my phone. {observation}",
    noun: "institute",
  }),
  ...firstSet("coaching", "email", "en", {
    noSite: "I looked for your institute on Google, the way a student comparing institutes would, and found the listing but no website of its own.",
    poorSite: "I opened your institute's website on my phone, the way a student comparing institutes would. {observation}",
    noun: "institute",
  }),
  ...firstSet("coaching", "email", "hinglish", {
    noSite: "Maine Google par aapka institute dhoondha, jaise ek student institutes compare karte waqt dhoondhta hai. Listing mili, par institute ki apni website nahi mili.",
    poorSite: "Maine aapke institute ki website phone par kholi, jaise ek student institutes compare karte waqt kholta hai. {observation}",
    noun: "institute",
  }),
];

/* Any other business (kind "other"): the same voice, with {kindNoun} "business".
   Its demo is made from a school, coaching or clinic template, and {offer} lists
   what a demo of that kind has; with no demo at hand it lists their services and
   timings. Never offered to a school, coaching or dental lead (ONLY_OTHER): each
   has its own approved messages. */
const ANY_MADE_NOTE = "The list names what the demo has, from the kind of template it was made from: check the demo shows it.";
const ANY_FIRST: MessageTemplate[] = [
  ...firstSet("any", "whatsapp", "hinglish", {
    noSite: "Google par aapka {kindNoun} dekha. Aapki apni website nahi hai, sirf Google listing hai.",
    poorSite: "Aapki website phone par kholi. {observation}",
    noun: "{kindNoun}",
    madeNote: ANY_MADE_NOTE,
  }),
  ...firstSet("any", "whatsapp", "en", {
    noSite: "I found your {kindNoun} on Google, but it has no website of its own, only the Google listing.",
    poorSite: "I opened your website on my phone. {observation}",
    noun: "{kindNoun}",
    madeNote: ANY_MADE_NOTE,
  }),
  ...firstSet("any", "email", "en", {
    noSite: "I looked for your {kindNoun} on Google and found the listing but no website of its own.",
    poorSite: "I opened your website on my phone. {observation}",
    noun: "{kindNoun}",
    madeNote: ANY_MADE_NOTE,
  }),
  ...firstSet("any", "email", "hinglish", {
    noSite: "Maine Google par aapka {kindNoun} dhoondha. Listing mili, par aapki apni website nahi mili.",
    poorSite: "Maine aapki website phone par kholi. {observation}",
    noun: "{kindNoun}",
    madeNote: ANY_MADE_NOTE,
  }),
];

/* A lead with a pitch page (a note on what we saw on their site and what each
   fix would take, not a new website). Needs the pitch page: it says it is
   written. The bullets are what the note has: what was seen, what to fix, what
   each fix takes (src/lib/cms/types.ts PitchPage). */
const PITCH_NOTE = "For a lead with a pitch page. Only with something you checked on their site today. No link: it goes after they say yes.";
const PITCH_LIST = {
  hinglish: "• Aapki site par kya dikha\n• Kya theek karna hai\n• Har kaam mein kya lagega",
  en: "• What I saw on your site\n• What to fix\n• What each fix would take",
};
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
  pitchFirst("wa_first_pitch_any_hinglish", "whatsapp", "hinglish", parts(GREET.hinglish, WHO.hinglish,
    "Aapki website phone par kholi. {observation}", "{impact}",
    `Isliye maine aapke liye ek chhota note likha hai:\n${PITCH_LIST.hinglish}`, APPROVED_ASK.hinglish)),
  pitchFirst("wa_first_pitch_any_en", "whatsapp", "en", parts(GREET.en, WHO.en,
    "I opened your website on my phone. {observation}", "{impact}",
    `So I have written a short note for you:\n${PITCH_LIST.en}`, APPROVED_ASK.en)),
  pitchFirst("em_first_pitch_any_en", "email", "en", parts(MAIL_GREET.en,
    "I opened your website on my phone. {observation}", "{impact}",
    `So I have written a short note for you, not a new website. It covers:\n${PITCH_LIST.en}`, APPROVED_ASK.en)),
  pitchFirst("em_first_pitch_any_hinglish", "email", "hinglish", parts(MAIL_GREET.hinglish,
    "Maine aapki website phone par kholi. {observation}", "{impact}",
    `Isliye maine aapke liye ek chhota note likha hai, nayi website nahi. Usme hai:\n${PITCH_LIST.hinglish}`, APPROVED_ASK.hinglish)),
];

/* ── After they say yes: the link, the honest lines, two call times ───────── */

/** The two lines that travel with every demo link (the approved after-yes message, one thought a line). */
const SAMPLE_TRUTH: Record<TemplateLanguage, string> = {
  hinglish: "Ye sirf demonstration hai, aapki live site nahi.\nJo jaankari aapki taraf se nahi mili, wo abhi sample hai.",
  en: "It is only a demonstration, not your live site.\nAnything we did not get from you is sample content for now.",
  hi: "ये सिर्फ़ डेमो है, आपकी लाइव साइट नहीं।\nजो जानकारी आपकी तरफ़ से नहीं मिली, वो अभी सैंपल है।",
};
/** One question with two times: {callSlots} is the next two working days in the kind's window. */
const CALL_ASK: Record<TemplateLanguage, string> = {
  hinglish: "10 minute ki call ke liye {callSlots}?",
  en: "Would {callSlots} suit you for a 10-minute call?",
  hi: "10 मिनट की कॉल के लिए {callSlots}?",
};
/* The link sits on its own line under "Ye raha sample:", with no full stop after it, so no app takes the stop into the address. */
const YES_WA: Record<TemplateLanguage, string> = {
  hinglish: parts("Shukriya {greeting}!", "Ye raha sample:\n{demoLink}", SAMPLE_TRUTH.hinglish, CALL_ASK.hinglish),
  en: parts("Thank you, {greeting}!", "Here is the sample:\n{demoLink}", SAMPLE_TRUTH.en, CALL_ASK.en),
  hi: parts("शुक्रिया {greeting}!", "ये रहा सैंपल:\n{demoLink}", SAMPLE_TRUTH.hi, CALL_ASK.hi),
};
const YES_EMAIL: Record<"en" | "hinglish", string> = {
  en: parts("Dear {greeting},", "Thank you for your reply. Here is the sample:\n{demoLink}", SAMPLE_TRUTH.en, CALL_ASK.en),
  hinglish: parts("Namaste {greeting},", "Jawab ke liye shukriya. Ye raha sample:\n{demoLink}", SAMPLE_TRUTH.hinglish, CALL_ASK.hinglish),
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
  hinglish: "Ye aapki nayi website nahi hai.\nIsme sirf likha hai ki aapki site par kya dikha, aur use theek karne mein kya lagega.",
  en: "It is not your new website.\nIt is only a page on what I saw on your site, and what each fix would take.",
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

const PHONE_YES_NOTE = "Only after they said yes on a call and agreed to WhatsApp on this number: note the date, it is your permission. Send within five minutes.";

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
    ...yes("wa_after_reply_phone_hinglish", "whatsapp", "any", "hinglish", parts("Namaste {greeting},",
      "{senderFirstName}, Ideovent se. Abhi phone par baat hui thi.", "Ye raha sample:\n{demoLink}", SAMPLE_TRUTH.hinglish,
      "Dekh kar bata dijiye kya badalna hai.")),
    label: "After a yes on the phone: the sample link, within five minutes",
    note: PHONE_YES_NOTE,
  },
  {
    ...yes("wa_after_reply_phone_en", "whatsapp", "any", "en", parts("Good {timeOfDay} {greeting},",
      "{senderFirstName} from Ideovent here. We just spoke on the phone.", "Here is the sample:\n{demoLink}", SAMPLE_TRUTH.en,
      "Have a look and tell me what you would change.")),
    label: "After a yes on the phone: the sample link, within five minutes",
    note: PHONE_YES_NOTE,
  },
  pitchYes("wa_after_reply_pitch_hinglish", "whatsapp", "hinglish", parts("Shukriya {greeting}!", "Ye raha note:\n{pitchLink}", PITCH_TRUTH.hinglish, CALL_ASK.hinglish)),
  pitchYes("wa_after_reply_pitch_en", "whatsapp", "en", parts("Thank you, {greeting}!", "Here is the note:\n{pitchLink}", PITCH_TRUTH.en, CALL_ASK.en)),
  yes("em_after_reply_dental_en", "email", "dental", "en", YES_EMAIL.en),
  yes("em_after_reply_dental_hinglish", "email", "dental", "hinglish", YES_EMAIL.hinglish),
  yes("em_after_reply_any_en", "email", "any", "en", YES_EMAIL.en),
  yes("em_after_reply_any_hinglish", "email", "any", "hinglish", YES_EMAIL.hinglish),
  pitchYes("em_after_reply_pitch_en", "email", "en",
    parts("Dear {greeting},", "Thank you for your reply. Here is the note:\n{pitchLink}", PITCH_TRUTH.en, CALL_ASK.en)),
  pitchYes("em_after_reply_pitch_hinglish", "email", "hinglish",
    parts("Namaste {greeting},", "Jawab ke liye shukriya. Ye raha note:\n{pitchLink}", PITCH_TRUTH.hinglish, CALL_ASK.hinglish)),
];

/* ── Follow-ups: ONE on WhatsApp (day 4, the last), three by e-mail (day 4, 9, 16) ── */

/* The approved day-4 WhatsApp, word for word: "Namaste {greeting}," / "{senderFirstName},
   Ideovent se. Kuch din pehle aapke {kindNoun} ke sample page ki baat ki thi." / "Main yahin
   chhod raha hoon. Kabhi dekhna ho to bas "haan" likh dijiye." */
const WA_FOLLOW_UP: Record<"made" | "offer", Record<"en" | "hinglish", string>> = {
  made: {
    hinglish: parts("Namaste {greeting},", "{senderFirstName}, Ideovent se. Kuch din pehle aapke {kindNoun} ke sample page ki baat ki thi.",
      "Main yahin chhod raha hoon. Kabhi dekhna ho to bas \"haan\" likh dijiye."),
    en: parts("Good {timeOfDay} {greeting},", "{senderFirstName} from Ideovent here. A few days ago I wrote about the sample page for your {kindNoun}.",
      "I will leave it here. If you want to see it later, just reply \"yes\"."),
  },
  offer: {
    hinglish: parts("Namaste {greeting},", "{senderFirstName}, Ideovent se. Kuch din pehle aapke {kindNoun} ke liye sample page ki baat ki thi.",
      "Main yahin chhod raha hoon. Kabhi chahiye ho to bas \"haan\" likh dijiye."),
    en: parts("Good {timeOfDay} {greeting},", "{senderFirstName} from Ideovent here. A few days ago I offered to make a sample page for your {kindNoun}.",
      "I will leave it here. If you would like one later, just reply \"yes\"."),
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

/* E-mail: short replies in the same thread, a blank line between the point and
   the question. Day 9 brings one new, true, useful point (their Google
   listing), never the observation of the first e-mail. Each opens with their
   name the way the approved day-4 sample does ("Dr. Mehta, a quick note ..."):
   {addressAs}, no greeting word before it. */
type FollowUpStage = "follow_up_1" | "follow_up_2" | "follow_up_3";
type Who = { en: string; hinglish: string };
const LISTING = {
  en: (w: Who) => `${w.en} who search for {instituteName} on Google see its listing before any website. It is worth checking that the timings and phone number there are right.`,
  hinglish: (w: Who) => `Google par {instituteName} dhoondhne ${w.hinglish} ko kisi bhi website se pehle aapki listing dikhti hai. Ek baar dekh lijiye ki usme timing aur phone number sahi hain.`,
};
const EMAIL_FOLLOW_UP: Record<FollowUpStage, Record<"made" | "offer", Record<"en" | "hinglish", (who: Who) => string>>> = {
  follow_up_1: {
    made: {
      en: () => parts("{addressAs}, a quick note on the sample I made for {instituteName}.", "Shall I send you the link?"),
      // "aapke clinic ke liye", as the approved WhatsApp follow-up says it: a clinic named after
      // its doctor would otherwise read "Dr. Mehta, Mehta Dental Care ke liye ...".
      hinglish: () => parts("{addressAs}, aapke {kindNoun} ke liye jo sample banaya hai, uske baare mein ek chhoti si baat.", "Kya main aapko link bhej doon?"),
    },
    offer: {
      en: () => parts("{addressAs}, a quick note on my e-mail about a sample website for {instituteName}.", "Shall I make one for you?"),
      hinglish: () => parts("{addressAs}, aapke {kindNoun} ke liye sample website wale mail ke baare mein ek chhoti si baat.", "Kya main aapke liye ek bana doon?"),
    },
  },
  follow_up_2: {
    made: {
      en: (w) => parts("{addressAs}, one more thing that may help, whether or not you use the sample.", LISTING.en(w), "Shall I send you the link to the sample?"),
      hinglish: (w) => parts("{addressAs}, ek aur baat jo kaam aa sakti hai, sample lein ya na lein.", LISTING.hinglish(w), "Kya main aapko sample ka link bhej doon?"),
    },
    offer: {
      en: (w) => parts("{addressAs}, one more thing that may help, whether or not you want a sample website.", LISTING.en(w), "Shall I make the sample website for you?"),
      hinglish: (w) => parts("{addressAs}, ek aur baat jo kaam aa sakti hai, sample website chahiye ho ya na ho.", LISTING.hinglish(w), "Kya main aapke liye sample website bana doon?"),
    },
  },
  /* Day 16, the approved words: "I will close this here. If you want to see it
     later, just reply yes." In Hinglish, the approved WhatsApp follow-up's own
     lines: "Main yahin chhod raha hoon. Kabhi dekhna ho to bas "haan" likh dijiye." */
  follow_up_3: {
    made: {
      en: () => parts("{addressAs}, I will close this here.", "If you want to see it later, just reply yes."),
      hinglish: () => parts("{addressAs}, main yahin chhod raha hoon.", "Kabhi dekhna ho to bas \"haan\" likh dijiye."),
    },
    offer: {
      en: () => parts("{addressAs}, I will close this here.", "If you would like a sample website later, just reply yes."),
      hinglish: () => parts("{addressAs}, main yahin chhod raha hoon.", "Kabhi sample website chahiye ho to bas \"haan\" likh dijiye."),
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
  body: EMAIL_FOLLOW_UP[stage][sample][language](kind === "dental" ? { en: "Patients", hinglish: "wale patients" } : { en: "People", hinglish: "walon" }),
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

/* ── After the call: the approved same-day summary, as a list ─────────────── */

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
      ? `• Package: [package and price]\n• Payment: 50% in advance, 50% at launch\n• What I need from you: ${WE_NEED[kind].en}\n• First version: [date]`
      : `• Package: [package and price]\n• Payment: 50% advance, 50% launch par\n• Mujhe chahiye: ${WE_NEED[kind].hinglish}\n• Pehla version: [date]`;
  // WhatsApp opens with their name alone, as the approved summary does: "Dr. Mehta, aaj ki baat ka summary:".
  if (channel === "whatsapp") {
    return language === "en"
      ? parts(`{addressAs}, a summary of our call today:\n${list}`, `If anything should change, just tell me.\n${thanks}`)
      : parts(`{addressAs}, aaj ki baat ka summary:\n${list}`, `Kuch badalna ho to bata dijiye.\n${thanks}`);
  }
  return language === "en"
    ? parts("Dear {greeting},", `Thank you for your time today. A summary of our call:\n${list}`, `If anything should change, just reply.\n${thanks}`)
    : parts("Namaste {greeting},", `Aaj time dene ke liye shukriya. Aaj ki baat ka summary:\n${list}`, `Kuch badalna ho to reply kar dijiye.\n${thanks}`);
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

/* What the proposal has, as a list. The payment terms are named, not restated: the PDF carries
   them, and a split typed here could contradict it. No price is typed: it is in the PDF. */
const PROPOSAL_LIST = {
  email: {
    en: "• The package and the price\n• The payment terms\n• What I need from you\n• The timeline",
    hinglish: "• Package aur price\n• Payment kaise hoga\n• Aapse kya chahiye\n• Timeline",
  },
  whatsapp: {
    en: "• The package and the price\n• What I need from you\n• The timeline",
    hinglish: "• Package aur price\n• Aapse kya chahiye\n• Timeline",
  },
};
const PROPOSAL_TEXT = {
  email: {
    en: parts("Dear {greeting},", `As we discussed, the proposal for {instituteName} is attached. It has everything in one place:\n${PROPOSAL_LIST.email.en}`,
      "Shall we start on [date]?\nIf anything is unclear, just reply."),
    hinglish: parts("Namaste {greeting},", `Jaisi baat hui thi, {instituteName} ka proposal saath mein attach hai. Usme sab ek jagah hai:\n${PROPOSAL_LIST.email.hinglish}`,
      "Kya hum [date] se shuru karein?\nKuch saaf na ho to reply kar dijiye."),
  },
  whatsapp: {
    en: parts(`{addressAs}, I have sent the proposal for {instituteName} to your e-mail. It has everything in one place:\n${PROPOSAL_LIST.whatsapp.en}`,
      "Shall we start on [date]?\nIf anything is unclear, just ask here."),
    hinglish: parts(`{addressAs}, aapke {kindNoun} ka proposal email par bhej diya hai. Usme sab ek jagah hai:\n${PROPOSAL_LIST.whatsapp.hinglish}`,
      "Kya hum [date] se shuru karein?\nKuch saaf na ho to yahin pooch lijiye."),
  },
};
const PROPOSAL_CHASE = {
  en: parts("{addressAs}, a quick note on the proposal I sent.", "Shall we start on [date]?",
    "If now is not the right time, tell me and I will close the file.\nEither answer is fine."),
  hinglish: parts("{addressAs}, proposal ke baare mein ek chhoti si baat.", "Kya hum [date] se shuru karein?",
    "Abhi sahi time nahi hai to bata dijiye, main file band kar dunga.\nDono jawab theek hain."),
};

/** On the e-mail proposal follow-up: it answers the proposal e-mail, whose subject it keeps ("Re: ... website: proposal"). */
const PROPOSAL_THREAD_NOTE =
  "Send it as a reply to your proposal e-mail: open that e-mail in your mail app and press Reply.";

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
    ? `Three days after the proposal.${channel === "email" ? ` ${PROPOSAL_THREAD_NOTE}` : ""} Fill in the start date you proposed: it cannot be sent until you do.`
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
