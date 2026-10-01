/**
 * Outreach engine: turns a template + a lead into the exact text Mehdi sends,
 * builds the mail-app (mailto) and WhatsApp links that open it ready to send, dates
 * the next follow-up, and checks the send against the sales-kit rules.
 *
 * Pure functions, no I/O, no React: the admin UI and scripts/test-outreach-engine.mjs
 * call the same code.
 *
 * THE RULES (30 Sep 2026: Mehdi's approved wording, 04-sales-kit/APPROVED-MESSAGES-2026-09-30.md,
 * and the research behind it, OUTREACH-APPROACH-PLAYBOOK-2026-09-30.md):
 *   - no link in any first message, on either channel: the link goes after a yes;
 *   - one message, then wait: ONE WhatsApp follow-up four days later, and up to
 *     three e-mail follow-ups (day 4, 9 and 16), sent as replies in the same thread;
 *   - quiet hours end at 10:00 India time (TRAI's 10:00 to 21:00 window), and a
 *     proposed call time ({callSlots}) is never on a Sunday or outside that window;
 *   - a message that still carries a [placeholder] (the after-call summary's
 *     [package and price] and [date]) cannot be sent;
 *   - every cold e-mail (the first and its three follow-ups) ends with the short
 *     REMOVE line; after a yes the thread is a conversation, so the reply with
 *     the link, the call summary and the proposal carry none (EMAIL-RULES §8:
 *     "every cold email"); any "no" or REMOVE stops everything;
 *   - everything a message says about the demo is true of that demo ({offer}
 *     names only what it has; a message that says a sample is made needs one).
 * There is no WhatsApp daily limit unless Mehdi sets one (28 Sep 2026), and
 * e-mail opens in the mail app only (no Gmail compose link).
 *
 * MERGE FIELDS render() fills (templates.ts MERGE_FIELDS lists them all):
 *   {greeting}        after "Namaste" / "Good afternoon" / "Dear": the contact's name and
 *                     title as stored ("Dr. Mehta", "Sharma Sir", "Principal Ma'am"); in
 *                     Hinglish a bare "Dr. Mehta" or "Verma" gets " ji" ("Namaste Dr. Sharma
 *                     ji"). No name: Doctor / Principal (ji) / Sir by kind. greetingFor().
 *   {addressAs}       a line that opens with their name alone, as the approved summary
 *                     does ("Dr. Mehta, aaj ki baat ka summary:"): a titled name as stored,
 *                     a bare one with " ji" in Hinglish ("Verma ji,"). addressFor().
 *   {senderFirstName} the first word of the sender's name ("Mehdi").
 *   {timeOfDay}       morning / afternoon / evening, India time, for "Good afternoon".
 *   {kindNoun}        clinic / school / institute / business; for a dental specialty
 *                     "implant centre", "orthodontic clinic", "kids dental clinic".
 *   {offer}           what the sample page has, per kind, specialty and pitch, as the
 *                     approved samples list it, and only what the demo has (offerFor()).
 *                     An "other" business's demo is made from a school, coaching or
 *                     clinic template: the offer is that kind's.
 *   {need}            why a patient looks online first, for a specialty clinic only.
 *   {visitor}         who looks them up, for "the way a new patient would": a new patient;
 *                     a parent for a children's clinic or a school; a student for coaching.
 *   {callSlots}       the next two working-day call times in the kind's good window.
 *   {contactName} {instituteName} {city} {demoLink} {pitchLink} {observation}
 *   {senderName} {senderPhone} as before.
 */

import type { LeadKind, OutreachLead, OutreachSettings } from "./types";
import {
  SPECIALIST_NEED,
  templateNotFor,
  type MessageTemplate,
  type TemplateChannel,
  type TemplateLanguage,
  type TemplatePitch,
  type TemplateStage,
} from "./templates";
import { MAIN_ORIGIN } from "@/lib/host";
import { dentalTemplateFor } from "@/lib/demo/templates/dentalPick";

/* ── Constants ──────────────────────────────────────────────────────────── */

/**
 * Where demos live: the main site (src/lib/host.ts). Follows VITE_PUBLIC_URL, so it moves to
 * ideovent.in with it; a Vercel preview's own address is never used (host.ts mainOriginFrom).
 */
export const SITE_ORIGIN = MAIN_ORIGIN;

export const DEFAULT_SENDER_NAME = "Mehdi Alam";
export const DEFAULT_SENDER_PHONE = "+91 77619 21786";

/**
 * The e-mail signature as Mehdi approved it (30 Sep 2026): name, firm and place
 * on one line, the phone on the next; render() puts "Regards," above it. Same
 * text as store.ts DEFAULT_SIGNATURE, the settings default, so an empty setting
 * and the default read the same.
 */
export const DEFAULT_SIGNATURE = `Mehdi Alam, Ideovent Technologies, Saket, New Delhi
+91 77619 21786`;

/**
 * The e-mail opt-out: one short line under every cold e-mail (30 Sep 2026; it
 * replaced a 29-word line). render() adds it once, at the very end. Both lines
 * are word for word the ones in 04-sales-kit/cold-email/EMAIL-RULES.md section 8.
 */
export const EMAIL_OPT_OUT_EN = "If you would rather not hear from me, reply REMOVE and I will not write again.";
export const EMAIL_OPT_OUT_HINGLISH =
  "Agar aap mujhse aage mail nahi chahte, to bas REMOVE likh kar reply kar dijiye, main dobara nahi likhunga.";

export function emailOptOutLine(language: TemplateLanguage): string {
  return language === "en" ? EMAIL_OPT_OUT_EN : EMAIL_OPT_OUT_HINGLISH;
}

/**
 * True for the e-mails that carry the opt-out: the cold ones, the first e-mail
 * and its follow-ups on day 4, 9 and 16 (EMAIL-RULES section 8: "every cold
 * email ... including the breakup email"). After a yes the thread is a
 * conversation: the reply with the link, the call summary and the proposal go
 * without it, because a "reply REMOVE" line under a proposal reads like a mailing.
 */
export function carriesOptOut(stage: TemplateStage): boolean {
  return stage === "first" || stage === "follow_up_1" || stage === "follow_up_2" || stage === "follow_up_3";
}

/** The sign-off above the signature, unless the signature brings its own. */
const SIGN_OFF = "Regards,";
const HAS_SIGN_OFF = /^(regards|best regards|kind regards|warm regards|thanks|thank you|dhanyavaad|shukriya)\b/i;

export function demoLinkFor(slug: string | undefined | null): string {
  return slug ? `${SITE_ORIGIN}/site/${slug}` : "";
}

export function pitchLinkFor(slug: string | undefined | null): string {
  return slug ? `${SITE_ORIGIN}/${slug}` : "";
}

/* ── Observations ────────────────────────────────────────────────────────── */

export interface Observation {
  id: string;
  label: string;
  /** English sentence, said as-is in an English message. */
  en: string;
  /** Hinglish sentence, said as-is in a Hinglish (or Hindi) message. */
  hinglish: string;
  /** Lead kinds this observation is offered for. Missing: every kind. */
  kinds?: LeadKind[];
  /** Earlier wordings, so a sentence saved before 30 Sep 2026 is still recognised. */
  previous?: string[];
  /**
   * The sentence names their site itself ("..., par aapki site par ye nahi
   * mila"), so a dental WhatsApp may open with where you found them, as the
   * approved implant sample does ("Google par aapka implant centre dekha."),
   * in place of "Aapke clinic ki website phone par kholi." (bodyFor).
   */
  namesSite?: boolean;
}

/**
 * Things Mehdi can check on a prospect's site in two minutes. Pick one only
 * after checking it the same day: the problem line of a message is never a guess.
 *
 * Each sentence follows the message's lead-in, "I opened your clinic's website
 * on my phone." / "Aapke clinic ki website phone par kholi.", so it starts
 * "It ..." / "Usme ...", and it says what the problem means for their patient,
 * parent or student. Every id stays in this one list, so a saved id always
 * renders (getObservation); observationsFor(kind) is what a picker offers.
 */
export const OBSERVATIONS: Observation[] = [
  {
    id: "no_website",
    label: "No website found",
    en: "I could not find a website of your own, only the Google listing.",
    hinglish: "Aapki apni website nahi mili, sirf Google listing dikhti hai.",
    previous: [
      "When I searched for your name, I could not find a website for you, only map and directory listings.",
      "Google pe aapka naam search kiya to koi website nahi mili, sirf map aur directory listings.",
    ],
  },
  {
    id: "not_mobile",
    label: "Does not open well on a phone",
    en: "It does not open properly: the text is small and the page scrolls sideways.",
    hinglish: "Wo theek se nahi khulti, text chhota hai aur page side mein scroll karna padta hai.",
    previous: [
      "It does not open well on a phone: the text is small and the page scrolls sideways.",
      "Wo phone par theek se nahi khulti, text chhota hai aur page side mein scroll karna padta hai.",
      "Your site does not open well on a phone: the text is small and the pages need sideways scrolling.",
      "Aapki site phone pe theek se nahi khulti, text chhota hai aur page side mein scroll karna padta hai.",
    ],
  },
  {
    id: "no_fees_admission",
    label: "Fees and admission details missing",
    en: "The fees and admission details are not on it, so a parent has to call the office to ask.",
    hinglish: "Usme fees aur admission ki jaankari nahi hai, to parent ko office phone karke poochna padta hai.",
    kinds: ["school", "coaching", "other"],
    previous: [
      "Fees and admission details are not on the site, so a parent has to call the office to find out.",
      "Site pe fees aur admission ki details nahi hain, to parent ko office phone karke poochna padta hai.",
    ],
  },
  /* The approved school sample names the old session it saw ("2023-24"). The
     year is whatever their site shows, so the sender types it: the send stays
     blocked until the [placeholder] is replaced (checkSend). */
  {
    id: "old_session",
    label: "Old admission session, no fees (type the session you saw)",
    en: "It still shows admissions for [the old session you saw], and the fees are not on it.",
    hinglish: "Usme abhi bhi [jo purana session dikha] ke admission likhe hain aur fees kahin nahi hai.",
    kinds: ["school"],
  },
  {
    id: "no_batch_fees",
    label: "Batch timings and fees missing",
    en: "The batch timings and fees are not on it, so a student has to call first.",
    hinglish: "Usme batch ki timing aur fees kahin nahi mili, to student ko pehle call karna padta hai.",
    kinds: ["coaching"],
  },
  {
    id: "form_broken",
    label: "Contact form did not send",
    en: "I filled in the contact form and it did not send, so enquiries may be getting lost.",
    hinglish: "Maine contact form bhar ke dekha, wo send nahi hua, to enquiries shayad kho rahi hain.",
    previous: [
      "I filled in the contact form on your site and it did not send, so enquiries may be getting lost.",
      "Maine aapki site ka contact form bhar ke dekha, wo send nahi hua, to enquiries shayad kho rahi hain.",
    ],
  },
  {
    id: "http_only",
    label: "Site is http only",
    en: "It opens on http only, so Chrome shows \"Not secure\" next to the address.",
    hinglish: "Wo sirf http par khulti hai, isliye Chrome address ke saath \"Not secure\" dikhata hai.",
    previous: [
      "Your site opens on http only, so Chrome marks it as \"Not secure\" next to the address.",
      "Aapki site sirf http pe khulti hai, isliye Chrome address ke saath \"Not secure\" dikhata hai.",
    ],
  },
  {
    id: "slow",
    label: "Site loads slowly",
    en: "It took a long time to load.",
    hinglish: "Use khulne mein kaafi der lagi.",
    previous: [
      "When I opened your site on my phone, it took a long time to load.",
      "Maine aapki site phone pe kholi to khulne mein kaafi der lagi.",
    ],
  },
  /* Dental clinics only (28 Sep 2026). Short: each is said inside a first
     WhatsApp message, which stays under about 450 characters. */
  {
    id: "no_online_booking",
    label: "No online booking",
    // "call or message", not "only by phone": the site may still have a WhatsApp button (30 Sep 2026).
    en: "There is no way to book an appointment online, so a patient has to call or message the clinic.",
    hinglish: "Usme online appointment ka option nahi hai, to patient ko call ya message karna padta hai.",
    kinds: ["dental"],
    previous: [
      "Your site has no way to book an appointment online, so a patient has to call or message the clinic.",
      "Aapki site pe online appointment ka option nahi hai, patient ko call ya message karna padta hai.",
    ],
  },
  {
    id: "no_whatsapp_button",
    label: "No WhatsApp button",
    en: "There is no WhatsApp button, so a patient cannot message the clinic in one tap.",
    hinglish: "Usme WhatsApp ka button nahi hai, to patient ek tap mein clinic ko message nahi kar sakta.",
    kinds: ["dental"],
    previous: [
      "Your site has no WhatsApp button, so a patient cannot message the clinic in one tap.",
      "Site pe WhatsApp ka button nahi hai, to patient ek tap mein clinic ko message nahi kar sakta.",
    ],
  },
  {
    id: "no_treatment_pages",
    label: "No treatment pages",
    en: "There is no page a patient can read about a treatment, such as a root canal or braces.",
    hinglish: "Usme root canal ya braces jaise kisi treatment ke baare mein padhne ko koi page nahi hai.",
    kinds: ["dental"],
    previous: [
      "Your site has no page a patient can read about a treatment, such as a root canal or braces.",
      "Site pe root canal ya braces jaise kisi treatment ke baare mein padhne ko koi page nahi hai.",
    ],
  },
  {
    id: "no_doctor_details",
    label: "Doctor details missing",
    en: "It does not name the dentists or their degrees, so a new patient cannot see who will treat them.",
    hinglish: "Usme dentists ke naam aur degree nahi hain, to naya patient nahi dekh pata ki ilaaj kaun karega.",
    kinds: ["dental"],
    previous: [
      "The site does not name the dentists or their degrees, so a new patient cannot see who will treat them.",
      "Site pe dentists ke naam aur degree nahi hain, to naya patient nahi dekh pata ki ilaaj kaun karega.",
    ],
  },
  {
    id: "no_timings",
    label: "Clinic timings missing",
    en: "The clinic timings are not on it, so a patient has to phone to ask when you are open.",
    hinglish: "Usme clinic ki timing kahin nahi dikhi, to patient ko phone karke poochna padta hai.",
    kinds: ["dental"],
    previous: [
      "Your site does not show the clinic timings, so a patient has to phone to ask when you are open.",
      "Clinic ki timing site pe nahi hai, to patient ko phone karke poochna padta hai ki clinic kab khula hai.",
    ],
  },
  /* 30 Sep 2026: the Lead Finder's no_contact finding for a clinic (leads.ts). */
  {
    id: "no_contact_details",
    label: "No phone or address on the home page",
    en: "The home page shows no phone number or address, so a patient cannot reach the clinic from it.",
    hinglish: "Home page par phone ya address nahi hai, to patient wahan se clinic ko contact nahi kar pata.",
    kinds: ["dental"],
    previous: [
      "Your home page does not show a phone number or address, so a patient cannot reach the clinic from it.",
      "Aapke home page pe phone ya address nahi hai, to patient wahan se clinic ko contact nahi kar pata.",
    ],
  },
  /* The approved specialty lines (30 Sep 2026): an implant or braces clinic
     whose site has no process or cost, a children's clinic with nothing on the first visit. */
  {
    id: "no_implant_info",
    label: "No implant process or cost on the site",
    en: "People look up the implant process and its cost before they decide, but your site does not have it.",
    hinglish: "Log implant se pehle process aur kharche ki jaankari online dhoondhte hain, par aapki site par ye nahi mila.",
    kinds: ["dental"],
    namesSite: true,
  },
  {
    id: "no_braces_info",
    label: "No braces process or cost on the site",
    en: "People look up how braces work and what they cost before they decide, but your site does not have it.",
    hinglish: "Log braces se pehle process aur kharche ki jaankari online dhoondhte hain, par aapki site par ye nahi mila.",
    kinds: ["dental"],
    namesSite: true,
  },
  {
    id: "no_first_visit_info",
    label: "Nothing on a child's first visit",
    en: "Parents look up what happens at a child's first visit before they book, but your site does not say.",
    hinglish: "Parents bachche ki pehli visit se pehle online dekhte hain ki kya hoga, par aapki site par ye nahi mila.",
    kinds: ["dental"],
    namesSite: true,
  },
];

export function getObservation(id: string | undefined | null): Observation | undefined {
  return id ? OBSERVATIONS.find((o) => o.id === id) : undefined;
}

/** The observation a saved value means: its id, its sentence, or a sentence it had before 30 Sep 2026. */
function knownObservation(raw: string): Observation | undefined {
  return getObservation(raw) ?? OBSERVATIONS.find((o) => o.en === raw || o.hinglish === raw || o.previous?.includes(raw));
}

/**
 * The observations a picker offers for a lead of this kind ("What you noticed
 * on their site"). No kind: every observation. A dental lead gets the generic
 * ones and the dental ones; a school or coaching lead never sees the dental ones.
 */
export function observationsFor(kind: LeadKind | string | undefined | null): Observation[] {
  if (!kind) return OBSERVATIONS.slice();
  return OBSERVATIONS.filter((o) => !o.kinds || o.kinds.some((k) => k === kind));
}

/**
 * The sentence for a lead's observation in a template's language. A lead may
 * store an OBSERVATIONS id or its own free-text sentence; free text is used as typed.
 */
export function observationText(observation: string | undefined, language: TemplateLanguage): string {
  const raw = (observation ?? "").trim();
  if (!raw) return "";
  const known = knownObservation(raw);
  if (!known) return raw;
  return language === "en" ? known.en : known.hinglish;
}

/* ── The approved merge fields: greeting, sender, time of day ─────────────── */

type KindKey = LeadKind;
const kindKey = (kind: string | undefined | null): KindKey =>
  kind === "dental" || kind === "school" || kind === "coaching" ? kind : "other";

/** A name that already ends in a respectful word: "Sharma Sir", "Principal Ma'am", "Verma ji". */
const HONORIFIC_END = /(?:\b(?:ji|sir|ma['’]?am|madam|mam|sahab|saheb|sahib)|जी|सर|मैडम|साहब)\.?$/i;
/** A name that starts with a title: "Dr. Mehta", "Mrs. Sharma", "Principal". */
const TITLE_START = /^(?:(?:dr|doctor|mr|mrs|ms|miss|prof|professor|principal|director|shri|sri|smt)\b\.?|डॉ|श्री)/i;
/** English titles that take no "ji" in Hinglish ("Namaste Mrs. Sharma"). */
const NO_JI_TITLE = /^(?:mr|mrs|ms|miss)\b\.?/i;

/** What a message calls someone whose name the lead does not carry (30 Sep 2026). */
const GREETING_FALLBACK: Record<TemplateLanguage, Record<KindKey, string>> = {
  en: { dental: "Doctor", school: "Principal", coaching: "Sir", other: "Sir" },
  hinglish: { dental: "Doctor", school: "Principal ji", coaching: "Sir", other: "Sir" },
  hi: { dental: "डॉक्टर साहब", school: "प्रिंसिपल जी", coaching: "सर", other: "सर" },
};

/**
 * {greeting}: the contact's name and title as the lead stores them ("Dr. Mehta",
 * "Sharma Sir", "Principal Ma'am"). In Hinglish (and Hindi) a name without a
 * closing honorific gets " ji": "Dr. Mehta ji", "Verma ji", as in the approved
 * samples; "Mr." and "Mrs." names stay as they are. No name: Doctor for a
 * clinic, Principal (ji) for a school, Sir for anyone else.
 */
export function greetingFor(contactName: string | undefined | null, kind: string | undefined | null, language: TemplateLanguage): string {
  const name = (contactName ?? "").replace(/\s+/g, " ").trim();
  if (!name) return GREETING_FALLBACK[language][kindKey(kind)];
  if (language === "en" || HONORIFIC_END.test(name) || NO_JI_TITLE.test(name)) return name;
  return `${name} ${language === "hi" ? "जी" : "ji"}`;
}

/**
 * {addressAs}: their name when a line opens with it, with no greeting word
 * before it, as the approved summary does: "Dr. Mehta, aaj ki baat ka summary:".
 * A name with a title or a closing honorific stays as stored ("Dr. Mehta",
 * "Sharma Sir", "Mrs. Rao"); a bare name or a bare title gets " ji" in Hinglish
 * and Hindi ("Verma ji", "Principal ji"), since "Verma," alone reads rude. No
 * name: the same fallback as {greeting}.
 */
export function addressFor(contactName: string | undefined | null, kind: string | undefined | null, language: TemplateLanguage): string {
  const name = (contactName ?? "").replace(/\s+/g, " ").trim();
  if (!name) return GREETING_FALLBACK[language][kindKey(kind)];
  if (language === "en" || HONORIFIC_END.test(name) || NO_JI_TITLE.test(name)) return name;
  const titledName = TITLE_START.test(name) && name.replace(TITLE_START, "").trim() !== "";
  return titledName ? name : `${name} ${language === "hi" ? "जी" : "ji"}`;
}

/** True when a stored contact name carries a title or honorific, so "Good afternoon <name>" reads right in English. */
export function hasTitle(contactName: string | undefined | null): boolean {
  const name = (contactName ?? "").trim();
  return TITLE_START.test(name) || HONORIFIC_END.test(name);
}

/** {senderFirstName}: "Mehdi" from "Mehdi Alam". */
export function firstName(fullName: string | undefined | null): string {
  return (fullName ?? "").trim().split(/\s+/)[0] || DEFAULT_SENDER_NAME.split(" ")[0];
}

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;

/** India time parts of an instant, independent of the machine's time zone. */
export function istParts(at: Date): { day: number; minutes: number } {
  const t = new Date(at.getTime() + IST_OFFSET_MS);
  return { day: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** {timeOfDay}: morning before 12:00, afternoon until 17:00, evening after, India time. */
export function timeOfDay(now: Date = new Date()): "morning" | "afternoon" | "evening" {
  const { minutes } = istParts(now);
  return minutes < 12 * 60 ? "morning" : minutes < 17 * 60 ? "afternoon" : "evening";
}

/* ── What the demo is: kind noun, specialty, the offer ───────────────────── */

/**
 * What the lead's demo carries, when the caller knows it (demoFacts(demo)).
 * {offer} then names only what that demo shows. Without it, the offer stays
 * with what every demo of the kind has.
 */
export interface DemoFacts {
  /** DemoSite.templateId, e.g. "d4-implant-centre". */
  templateId?: string;
  /** The clinic's own phone is on the demo, so its Call button shows. */
  phone?: boolean;
  /** The clinic's own WhatsApp is on the demo, so its WhatsApp button shows. */
  whatsapp?: boolean;
  /** The admission session the demo shows (DemoSite.sessionLabel, e.g. "2027-28"). */
  sessionLabel?: string;
  /** The kind of template the demo was made from (DemoSite.kind): for an "other" business, {offer} names what it has. */
  kind?: "school" | "coaching" | "dental";
}

/** The facts render() needs from a demo record (a DemoSite, or anything shaped like one). */
export function demoFacts(
  demo: { templateId?: string; sessionLabel?: string; kind?: string; contact?: { phone?: string; whatsapp?: string } } | null | undefined,
): DemoFacts | undefined {
  if (!demo) return undefined;
  const kind = demo.kind === "school" || demo.kind === "coaching" || demo.kind === "dental" ? demo.kind : undefined;
  return {
    templateId: (demo.templateId ?? "").trim() || undefined,
    phone: Boolean((demo.contact?.phone ?? "").trim()),
    whatsapp: Boolean((demo.contact?.whatsapp ?? "").trim()),
    sessionLabel: (demo.sessionLabel ?? "").trim() || undefined,
    ...(kind ? { kind } : {}),
  };
}

/** A dental clinic's specialty, as its demo template (d4, d5, d6) or its segment (DENTAL_IMPLANT ...) says. */
export type DentalSpecialty = "general" | "implant" | "ortho" | "kids";

const SPECIALTY_OF_TEMPLATE: Record<string, DentalSpecialty> = {
  "d4-implant-centre": "implant",
  "d5-ortho-aligners": "ortho",
  "d6-kids-dental": "kids",
};

/**
 * The demo's template decides when it is known. Otherwise the same words the
 * demo picker reads (name, notes, observation, the sheet's segment tag), so the
 * message names what the clinic's demo will be.
 */
export function dentalSpecialty(
  lead: Partial<Pick<OutreachLead, "instituteName" | "notes" | "observation" | "tags">>,
  demo?: Pick<DemoFacts, "templateId"> | null,
): DentalSpecialty {
  const id = (demo?.templateId ?? "").trim().toLowerCase();
  if (/^d\d/.test(id)) return SPECIALTY_OF_TEMPLATE[id] ?? "general";
  const picked = dentalTemplateFor(lead.instituteName, lead.notes, lead.observation, ...(lead.tags ?? []));
  return SPECIALTY_OF_TEMPLATE[picked] ?? "general";
}

type Specialist = Exclude<DentalSpecialty, "general">;

/** The same words in the template's language. */
function pick(language: TemplateLanguage, en: string, hinglish: string, hi: string): string {
  return language === "en" ? en : language === "hi" ? hi : hinglish;
}

const KIND_WORD: Record<TemplateLanguage, Record<KindKey, string>> = {
  en: { dental: "clinic", school: "school", coaching: "institute", other: "business" },
  hinglish: { dental: "clinic", school: "school", coaching: "institute", other: "business" },
  hi: { dental: "क्लिनिक", school: "स्कूल", coaching: "इंस्टिट्यूट", other: "बिज़नेस" },
};
const SPECIALTY_WORD: Record<TemplateLanguage, Record<Specialist, string>> = {
  en: { implant: "implant centre", ortho: "orthodontic clinic", kids: "kids dental clinic" },
  hinglish: { implant: "implant centre", ortho: "orthodontic clinic", kids: "kids dental clinic" },
  hi: { implant: "इम्प्लांट सेंटर", ortho: "ऑर्थोडॉन्टिक क्लिनिक", kids: "बच्चों का डेंटल क्लिनिक" },
};

/** {kindNoun}: what the message calls their place, "aapka clinic", "your implant centre". */
export function kindNounFor(kind: string | undefined | null, language: TemplateLanguage, specialty: DentalSpecialty = "general"): string {
  const k = kindKey(kind);
  return k === "dental" && specialty !== "general" ? SPECIALTY_WORD[language][specialty] : KIND_WORD[language][k];
}

/**
 * {need}: why a specialty clinic's patients look online first, as a sentence
 * (the approved implant and kids lines, templates.ts SPECIALIST_NEED).
 */
export function needFor(kind: string | undefined | null, language: TemplateLanguage, specialty: DentalSpecialty = "general"): string {
  if (kindKey(kind) !== "dental" || specialty === "general") return "";
  return `${SPECIALIST_NEED[language][specialty]}${language === "hi" ? "।" : "."}`;
}

/**
 * {visitor}: who looks them up, in "the way a new patient would" / "jaise ek
 * naya patient dhoondhta hai" (the approved "Words per business": a clinic is
 * seen through a patient, a school through a parent, coaching through a
 * student). A children's clinic is looked up by a parent, as the approved kids
 * sample says, not by the child.
 */
export function visitorFor(kind: string | undefined | null, language: TemplateLanguage, specialty: DentalSpecialty = "general"): string {
  const k = kindKey(kind);
  if (k === "school" || (k === "dental" && specialty === "kids")) return pick(language, "a parent", "ek parent", "एक पेरेंट");
  if (k === "coaching") return pick(language, "a student", "ek student", "एक स्टूडेंट");
  if (k === "dental") return pick(language, "a new patient", "ek naya patient", "एक नया मरीज़");
  return pick(language, "a new customer", "ek naya customer", "एक नया ग्राहक");
}

/**
 * The admission session a school is admitting for now, India time: from
 * August, the next one ("2027-28" in September 2026). Computed, never typed,
 * so the school message never goes stale. A demo's own sessionLabel wins.
 */
export function admissionSession(now: Date = new Date()): string {
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  const start = t.getUTCMonth() >= 7 ? t.getUTCFullYear() + 1 : t.getUTCFullYear();
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export interface OfferInput {
  kind: string | undefined | null;
  language: TemplateLanguage;
  /** new_website (they have none) or fix_website (theirs fails on a phone). */
  pitch: TemplatePitch;
  specialty?: DentalSpecialty;
  demo?: DemoFacts;
  /** "offer": the message offers to make the sample, so it names what we would put on it. */
  sample?: "made" | "offer";
  now?: Date;
}

/**
 * {offer}: what the sample page has, exactly as the approved samples list it.
 * Dental, their site: the approved "ek tap mein call ya WhatsApp" is said only
 * when the clinic's number is on the demo (a template duplicate clears it, and
 * the Call and WhatsApp buttons then show nothing); a made demo without it
 * offers one-tap booking, which every dental demo has. School, their site: the
 * session the demo shows, else the computed one.
 */
export function offerFor({ kind, language: L, pitch, specialty = "general", demo, sample, now = new Date() }: OfferInput): string {
  const fix = pitch === "fix_website";
  const k = kindKey(kind);
  if (k === "dental") {
    if (specialty === "kids") {
      return pick(L, "what happens at the first visit, timings and booking", "pehli visit ki jaankari, timings aur booking", "पहली विज़िट की जानकारी, टाइमिंग और बुकिंग");
    }
    // The braces demo (d5) prices each kind of braces, so it has a cost range. The implant demo (d4)
    // prices no implant ("Cost after consultation and X-ray"; its consultation, scan and an itemised
    // estimate are explained), so an implant centre is offered cost information, never a range.
    if (specialty === "ortho") {
      return pick(L, "how braces work, the cost range and appointment booking", "braces ka process, kharche ki range aur appointment booking", "ब्रेसेज़ का प्रोसेस, ख़र्च की रेंज और अपॉइंटमेंट बुकिंग");
    }
    if (specialty === "implant") {
      return pick(L, "the implant process, cost information and appointment booking", "implant ka process, kharche ki jaankari aur appointment booking", "इम्प्लांट का प्रोसेस, ख़र्च की जानकारी और अपॉइंटमेंट बुकिंग");
    }
    if (!fix) return pick(L, "treatments, timings and one-tap booking", "treatments, timings aur one-tap booking", "ट्रीटमेंट, टाइमिंग और एक टैप में बुकिंग");
    const call = sample === "offer" || Boolean(demo?.phone);
    const wa = sample === "offer" || Boolean(demo?.whatsapp);
    const en = call && wa ? "call or WhatsApp" : call ? "calling" : wa ? "WhatsApp" : "booking";
    const hin = call && wa ? "call ya WhatsApp" : call ? "call" : wa ? "WhatsApp" : "booking";
    const hi = call && wa ? "कॉल या WhatsApp" : call ? "कॉल" : wa ? "WhatsApp" : "बुकिंग";
    // English keeps the order of both approved English samples ("treatments, timings and one-tap
    // booking"); Hinglish keeps the approved poor-website sample's ("timing, treatments aur ek tap mein").
    return pick(L, `treatments, timings and one-tap ${en}`, `timing, treatments aur ek tap mein ${hin}`, `टाइमिंग, ट्रीटमेंट और एक टैप में ${hi}`);
  }
  if (k === "school") {
    if (!fix) return pick(L, "admission details, fees and an enquiry form", "admission, fees aur enquiry form", "एडमिशन, फ़ीस और एनक्वायरी फ़ॉर्म");
    const s = (demo?.sessionLabel ?? "").trim() || admissionSession(now);
    return pick(L, `the ${s} admissions, fees and an enquiry form on one screen`, `${s} ke admission, fees aur enquiry ek hi screen par`, `${s} के एडमिशन, फ़ीस और एनक्वायरी एक ही स्क्रीन पर`);
  }
  if (k === "coaching") {
    return fix
      ? pick(L, "all the batches, timings and fees in one place", "saare batches, timing aur fees ek jagah", "सारे बैच, टाइमिंग और फ़ीस एक जगह")
      : pick(L, "courses, batch timings and an enquiry button", "courses, batch timing aur enquiry button", "कोर्स, बैच टाइमिंग और एनक्वायरी बटन");
  }
  return pick(L, "services, timings and an enquiry button", "services, timing aur enquiry button", "सर्विसेज़, टाइमिंग और एनक्वायरी बटन");
}

/* ── {callSlots}: two call times in the kind's good window ──────────────── */

export interface CallWindow {
  /** India-time weekdays a call may be proposed on, 1 (Monday) to 6 (Saturday). Never 0, Sunday. */
  days: number[];
  /** The two times proposed, one per day, in minutes after midnight, India time. */
  times: [number, number];
  /** The kind's good window for a call [from, to), in minutes (the approved "Words per business" table; a school after school). */
  window: [number, number];
}

/** TRAI's default window for a commercial call, India time: from 10:00, before 21:00. */
export const CALL_WINDOW_START = 10 * 60;
export const CALL_WINDOW_END = 21 * 60;

export const CALL_WINDOWS: Record<LeadKind, CallWindow> = {
  /* Dentists between patients, 14:00 to 16:00; clinics work Saturdays. */
  dental: { days: [1, 2, 3, 4, 5, 6], times: [15 * 60, 14 * 60], window: [14 * 60, 16 * 60] },
  /* Principals take calls after school (the playbook, section 6), Monday to Friday, 14:30 to
     16:00. Tuesday to Thursday, 11:00 to 13:00 is when a school reads a message, not a call time. */
  school: { days: [1, 2, 3, 4, 5], times: [15 * 60, 14 * 60 + 30], window: [14 * 60 + 30, 16 * 60] },
  /* Coaching owners, 12:00 to 16:00, before the evening batches. */
  coaching: { days: [1, 2, 3, 4, 5, 6], times: [15 * 60, 12 * 60], window: [12 * 60, 16 * 60] },
  other: { days: [1, 2, 3, 4, 5, 6], times: [15 * 60, 11 * 60], window: [11 * 60, 16 * 60] },
};

export interface CallSlot {
  at: Date;
  /** India-time weekday, 1 (Monday) to 6 (Saturday). */
  day: number;
  /** India-time minutes after midnight. */
  minutes: number;
}

/**
 * The next two working days, from tomorrow, on which a call to this kind fits,
 * each at its proposed time: never a Sunday, always in the kind's window and
 * inside 10:00 to 21:00. The message is text: the sender can change the times.
 */
export function callSlots(kind: string | undefined | null, now: Date = new Date()): CallSlot[] {
  const w = CALL_WINDOWS[kindKey(kind)];
  const shifted = now.getTime() + IST_OFFSET_MS;
  const todayStart = shifted - (((shifted % DAY_MS) + DAY_MS) % DAY_MS) - IST_OFFSET_MS;
  const out: CallSlot[] = [];
  for (let d = 1; out.length < 2 && d <= 14; d++) {
    const dayStart = todayStart + d * DAY_MS;
    const day = istParts(new Date(dayStart)).day;
    if (day === 0 || !w.days.includes(day)) continue;
    const minutes = Math.min(Math.max(w.times[out.length], CALL_WINDOW_START), CALL_WINDOW_END - 60);
    out.push({ at: new Date(dayStart + minutes * 60_000), day, minutes });
  }
  return out;
}

const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

function clockText(minutes: number, language: TemplateLanguage): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const mm = m ? `:${String(m).padStart(2, "0")}` : "";
  if (language === "en") return h === 12 && !m ? "12 noon" : `${h % 12 || 12}${mm} ${h < 12 ? "am" : "pm"}`;
  return `${h % 12 || 12}${mm} ${language === "hi" ? "बजे" : "baje"}`;
}

/**
 * {callSlots} in words, as in the approved after-yes message: "Thursday 3 pm or
 * Friday 2 pm" (English, inside "Would ... suit you"), "Thursday 3 baje theek
 * rahega ya Friday 2 baje" (Hinglish, after "10 minute ki call ke liye").
 */
export function formatCallSlots(slots: CallSlot[], language: TemplateLanguage): string {
  const say = (s: CallSlot) => `${(language === "hi" ? DAY_HI : DAY_EN)[s.day]} ${clockText(s.minutes, language)}`;
  const [a, b] = slots;
  if (!a) return "";
  if (language === "en") return b ? `${say(a)} or ${say(b)}` : say(a);
  const fine = language === "hi" ? "ठीक रहेगा" : "theek rahega";
  return b ? `${say(a)} ${fine} ${language === "hi" ? "या" : "ya"} ${say(b)}` : `${say(a)} ${fine}`;
}

/* ── [Placeholders]: words the sender must fill in before sending ────────── */

/** "[package and price]", "[date]", "[jo purana session dikha]": square brackets on one line. */
export const PLACEHOLDER_RE = /\[[^[\]\n]{1,80}\]/g;

/** Every [placeholder] still in a text, once each, in order. */
export function unfilledPlaceholders(text: string | undefined | null): string[] {
  return [...new Set((text ?? "").match(PLACEHOLDER_RE) ?? [])];
}

/* ── "Google par aapka clinic dekha" must be true ───────────────────────── */

/**
 * False when the lead says it was found somewhere other than Google, so a first
 * message that says "Google par aapka clinic dekha" (or the day-9 e-mail about
 * their Google listing) asks the sender to check the line. Google Maps, the Lead Finder's Google results, and a lead with no named
 * source (an import, a demo) pass; the Lead Finder's OpenStreetMap results, a
 * directory, a referral or a walk-in do not.
 */
export function seenOnGoogle(lead: Partial<Pick<OutreachLead, "source" | "placeId" | "notes">>): boolean {
  const s = (lead.source ?? "").trim().toLowerCase();
  if (s === "lead-finder") return Boolean(lead.placeId) || !/openstreetmap/i.test(lead.notes ?? "");
  if (!s || /google|gmaps|g-maps|\bmaps\b/.test(s)) return true;
  return /^(csv import|import|demo-created|example|manual)$/.test(s);
}

/* ── Render ──────────────────────────────────────────────────────────────── */

export interface RenderContext {
  /** Overrides the link built from lead.demoSlug. */
  demoLink?: string;
  /** Overrides the link built from lead.pitchSlug. */
  pitchLink?: string;
  senderName?: string;
  senderPhone?: string;
  /** E-mail signature (settings.signature). Empty = DEFAULT_SIGNATURE. */
  signature?: string;
  /** Overrides lead.observation (an OBSERVATIONS id or a sentence). */
  observation?: string;
  /** When the message is written: {timeOfDay} and {callSlots} follow India time then. Default: now. */
  now?: Date;
  /** What the lead's demo carries (demoFacts(demo)): {offer} then names only what it has. */
  demo?: DemoFacts;
  /** The sender's own call times, in place of the computed {callSlots}. */
  callSlots?: string;
}

export interface RenderResult {
  subject?: string;
  body: string;
  warnings: string[];
}

const LINK_FIELDS = ["demoLink", "pitchLink"];
const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:vercel\.app|com|in|org|net)\/\S*/i;

/** True when a text carries a link or a link merge field. */
export function containsLink(text: string): boolean {
  return /\{(demoLink|pitchLink)\}/.test(text) || URL_RE.test(text);
}

/** The lead's pitch: its own (the sheet, the Lead Finder), else "their site" when it has one, else "no website". */
export function effectivePitch(lead: Partial<Pick<OutreachLead, "pitch" | "website">>): "new_website" | "fix_website" {
  return lead.pitch ?? ((lead.website ?? "").trim() ? "fix_website" : "new_website");
}

/** {contactName} with no name, as the templates before 30 Sep 2026 had it (the retired ones still use it). */
function legacyGreeting(template: MessageTemplate, kind: KindKey): string {
  if (kind === "dental") return template.language === "hi" ? "डॉक्टर साहब" : "Doctor";
  if (template.language === "hi") return "सर";
  if (template.channel === "email" && template.language === "en") return kind === "school" ? "Principal" : "Sir";
  return "Sir";
}

/** What a lead of each kind is called in a sentence ("written for a dental clinic"). */
export const KIND_NOUN: Record<LeadKind, string> = {
  school: "school",
  coaching: "coaching institute",
  dental: "dental clinic",
  other: "other business",
};

const kindNoun = (kind: string | undefined) => KIND_NOUN[kind as LeadKind] ?? kind ?? "";

/**
 * The words a template says to this lead: its body, or one of its `variants`,
 * the approved specialist words of a dental WhatsApp first message. A "no
 * website" message to a specialist clinic (implant, braces, kids: its demo's
 * template, else its segment or name) says its specialty's words ("Google par
 * aapka kids dental clinic dekha. Parents ..."). A "their site" message whose
 * checked problem names the site itself (namesSite) opens "Google par aapka
 * ... dekha." as the approved implant sample does, but only for a lead found on
 * Google; otherwise "Aapke clinic ki website phone par kholi." stays. Every
 * variant has the body's merge fields, so checkSend reads the body.
 */
export function bodyFor(
  template: Pick<MessageTemplate, "body" | "variants" | "pitch" | "kind">,
  lead: Partial<Pick<OutreachLead, "kind" | "instituteName" | "notes" | "observation" | "tags" | "source" | "placeId">>,
  ctx: Pick<RenderContext, "demo" | "observation"> = {},
): string {
  const v = template.variants;
  if (!v) return template.body;
  if (template.pitch === "fix_website") {
    const seen = knownObservation((ctx.observation ?? lead.observation ?? "").trim());
    return v.found && seen?.namesSite && seenOnGoogle(lead) ? v.found : template.body;
  }
  if (kindKey(template.kind !== "any" ? template.kind : lead.kind) !== "dental") return template.body;
  const specialty = dentalSpecialty(lead, ctx.demo);
  return (specialty !== "general" && v[specialty]) || template.body;
}

/**
 * Fill a template for one lead: its body, or the approved specialist words a
 * dental WhatsApp has for this lead (bodyFor). Every known merge field is
 * replaced; a missing value becomes a safe fallback (the greeting) or empty text, and is reported
 * in `warnings` so the UI can say what to fill in. An e-mail gets "Regards,"
 * and the signature, always, once; a cold one (carriesOptOut) also gets the
 * REMOVE line, once, at the very end. A [placeholder] left in the text is
 * reported too (checkSend blocks it).
 */
export function render(
  template: MessageTemplate,
  lead: Partial<OutreachLead> & Pick<OutreachLead, "instituteName">,
  ctx: RenderContext = {},
): RenderResult {
  const warnings: string[] = [];
  // The words for this lead: the body, or the approved specialist words (variants).
  const said = bodyFor(template, lead, ctx);
  const used = new Set<string>();
  for (const m of `${template.subject ?? ""}\n${said}`.matchAll(/\{(\w+)\}/g)) used.add(m[1]);

  const now = ctx.now ?? new Date();
  const language = template.language;
  // The kind the words are about: the template's own, or for a neutral template the lead's.
  const kind = kindKey(template.kind !== "any" ? template.kind : lead.kind);
  const specialty = kind === "dental" ? dentalSpecialty(lead, ctx.demo) : "general";
  const pitch = template.pitch !== "any" ? template.pitch : effectivePitch(lead);
  // An "other" business's demo is made from a school, coaching or clinic template: the offer names
  // what a demo of that kind has, in the list that goes with "hai" (the kind's "no website" list).
  const demoKind = kind === "other" ? ctx.demo?.kind : undefined;
  const offer = demoKind
    ? offerFor({ kind: demoKind, language, pitch: "new_website", specialty: demoKind === "dental" ? dentalSpecialty(lead, ctx.demo) : "general", demo: ctx.demo, sample: template.sample, now })
    : offerFor({ kind, language, pitch, specialty, demo: ctx.demo, sample: template.sample, now });
  const contact = (lead.contactName ?? "").trim();
  const senderName = (ctx.senderName ?? "").trim() || DEFAULT_SENDER_NAME;
  const values: Record<string, string> = {
    contactName: contact || legacyGreeting(template, kind),
    greeting: greetingFor(contact, kind, language),
    addressAs: addressFor(contact, kind, language),
    instituteName: (lead.instituteName ?? "").trim(),
    city: (lead.city ?? "").trim(),
    demoLink: (ctx.demoLink ?? demoLinkFor(lead.demoSlug)).trim(),
    pitchLink: (ctx.pitchLink ?? pitchLinkFor(lead.pitchSlug)).trim(),
    observation: observationText(ctx.observation ?? lead.observation, language),
    senderName,
    senderFirstName: firstName(senderName),
    senderPhone: (ctx.senderPhone ?? "").trim() || DEFAULT_SENDER_PHONE,
    timeOfDay: timeOfDay(now),
    kindNoun: kindNounFor(kind, language, specialty),
    offer,
    need: needFor(kind, language, specialty),
    visitor: visitorFor(kind, language, specialty),
    callSlots: (ctx.callSlots ?? "").trim() || formatCallSlots(callSlots(kind, now), language),
  };

  const named = ["greeting", "addressAs", "contactName"].find((f) => used.has(f));
  if (named && !contact) {
    warnings.push(`No contact name: the greeting says "${values[named]}".`);
  } else if ((used.has("greeting") || used.has("addressAs")) && language === "en" && !hasTitle(contact)) {
    warnings.push(`The contact name "${contact}" has no title, so the English greeting reads "${contact}". Add Dr., Mr., Mrs., Sir or Ma'am to it on the lead.`);
  }
  if (used.has("instituteName") && !values.instituteName) warnings.push("Institute name is empty.");
  if (used.has("city") && !values.city) warnings.push("City is empty.");
  if (used.has("demoLink") && !values.demoLink) warnings.push("This message needs a demo link: pick or create a demo first.");
  if (used.has("pitchLink") && !values.pitchLink) warnings.push("This message needs a pitch page link: set the pitch slug first.");
  if (used.has("observation") && !values.observation) {
    warnings.push("This message needs an observation you checked yourself: pick one or type it.");
  }
  const obsKnown = knownObservation((ctx.observation ?? lead.observation ?? "").trim());
  if (used.has("observation") && obsKnown?.id === "no_website" && template.pitch === "fix_website") {
    warnings.push("The observation says they have no website, but this message is about fixing their website: pick a 'new website' message.");
  }
  if (!template.allowsLink && [...used].some((f) => LINK_FIELDS.includes(f))) {
    warnings.push("This template must not carry a link, but it uses a link field.");
  }
  // Every line about Google must be true for this lead: the first message says you saw them there,
  // the day-9 e-mail talks about their Google listing.
  if (/\bGoogle\b/.test(said) && !seenOnGoogle(lead)) {
    warnings.push(template.stage === "first"
      ? `This message says you saw them on Google, and this lead came from ${lead.source}. Change that line if you did not see them on Google.`
      : `This message talks about their Google listing, and this lead came from ${lead.source}. Check that they have one before sending.`);
  }

  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? values[key] : whole));

  const subject = template.subject !== undefined ? tidy(fill(template.subject)) : undefined;
  let body = tidy(fill(said));

  if (template.channel === "email") {
    const signature = (ctx.signature ?? "").trim() || DEFAULT_SIGNATURE;
    if (!body.includes(signature)) body = `${body}\n\n${HAS_SIGN_OFF.test(signature) ? "" : `${SIGN_OFF}\n`}${signature}`;
    if (carriesOptOut(template.stage) && !body.includes("REMOVE")) body = `${body}\n\n${emailOptOutLine(language)}`;
    if (/\battach/i.test(said)) warnings.push("Attach the proposal PDF in your mail app before pressing Send.");
  }

  const holes = unfilledPlaceholders(`${subject ?? ""}\n${body}`);
  if (holes.length) warnings.push(`Fill in ${holes.join(" and ")} before sending.`);
  const leftover = `${subject ?? ""}\n${body}`.match(/\{\w+\}/g);
  if (leftover) warnings.push(`Unknown merge field left in the text: ${[...new Set(leftover)].join(", ")}.`);
  if (DASH_RE.test(`${subject ?? ""}${body}`)) warnings.push("The text contains a dash character; use a comma.");

  return { subject, body, warnings };
}

/** Em and en dash, built from code points so this file contains neither. */
const DASH_RE = new RegExp(`[${String.fromCharCode(8212)}${String.fromCharCode(8211)}]`);

/** Tidies what an empty merge field can leave behind: double spaces, " ,", blank runs. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]+([,.:;!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ── Phone numbers and send links ────────────────────────────────────────── */

/**
 * +91XXXXXXXXXX for an Indian mobile or landline typed any common way
 * ("98765 43210", "098765-43210", "+91 98765 43210", "919876543210");
 * other international numbers keep their + and digits; "" when unusable.
 */
export function normalisePhone(raw: string | undefined | null): string {
  // Same rules as store.ts normalizePhone, so a link goes to the number the lead list shows.
  const s = String(raw ?? "").split(/[,;/|]|\s+or\s+/i).map((x) => x.trim()).find((x) => /\d/.test(x)) || "";
  if (!s) return "";
  const plus = s.startsWith("+");
  let d = s.replace(/\D/g, "");
  if (!d) return "";
  if (!plus && d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  if (d.length === 11 && d.startsWith("0")) return `+91${d.slice(1)}`;
  if (d.length === 10 && !plus) return `+91${d}`;
  if (d.length < 7 || d.length > 15) return "";
  return `+${d}`;
}

/** Digits wa.me wants: country code + number, no plus. "" when unusable. */
export function whatsappDigits(raw: string | undefined | null): string {
  return normalisePhone(raw).replace(/\D/g, "");
}

export interface MailtoInput {
  to: string;
  subject?: string;
  body?: string;
}

/**
 * The e-mail, typed and ready, in this computer's default mail app. The only
 * way an e-mail opens: the Gmail compose link was removed on 30 Sep 2026
 * (Mehdi, 28 Sep: "open in Gmail wala option hata do, sirf open with mail app").
 */
export function mailtoUrl({ to, subject = "", body = "" }: MailtoInput): string {
  return `mailto:${encodeURIComponent(to.trim()).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** WhatsApp (app on a phone, or the web chooser): https://wa.me/<digits>?text=... */
export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${whatsappDigits(phone)}?text=${encodeURIComponent(text)}`;
}

/** WhatsApp Web directly: https://web.whatsapp.com/send?phone=<digits>&text=... */
export function whatsappWebUrl(phone: string, text: string): string {
  return `https://web.whatsapp.com/send?phone=${whatsappDigits(phone)}&text=${encodeURIComponent(text)}`;
}

/** The number a WhatsApp message goes to: the lead's WhatsApp, else its phone. */
export function leadWhatsappNumber(lead: Pick<OutreachLead, "whatsapp" | "phone">): string {
  return normalisePhone(lead.whatsapp) || normalisePhone(lead.phone);
}

export interface SendLinks {
  mailto?: string;
  whatsapp?: string;
  whatsappWeb?: string;
}

/**
 * Every link that can open this rendered message for this lead. E-mail opens
 * in the mail app only (mailto:), never Gmail compose (Mehdi, 28 Sep 2026:
 * "open in Gmail wala option hata do, sirf open with mail app").
 */
export function sendLinks(
  lead: Pick<OutreachLead, "email" | "phone" | "whatsapp">,
  channel: TemplateChannel,
  rendered: Pick<RenderResult, "subject" | "body">,
): SendLinks {
  if (channel === "email") {
    const to = (lead.email ?? "").trim();
    if (!to) return {};
    return { mailto: mailtoUrl({ to, subject: rendered.subject, body: rendered.body }) };
  }
  const number = leadWhatsappNumber(lead);
  if (!number) return {};
  return { whatsapp: whatsappUrl(number, rendered.body), whatsappWeb: whatsappWebUrl(number, rendered.body) };
}

/* ── Follow-up dates ─────────────────────────────────────────────────────── */

/**
 * Days until the next touch after sending a stage (the approved cadence, 30 Sep 2026):
 *   first message       -> 4   the one WhatsApp follow-up, or e-mail follow-up 1, on day 4
 *   follow-up 1         -> 5   e-mail follow-up 2 on day 9 (after the last WhatsApp: an e-mail or a call)
 *   follow-up 2         -> 7   the closing e-mail on day 16
 *   closing (follow-up 3) -> 74  day 90: no message, only the day to move the lead to
 *                              nurture or mark it lost (the closing e-mail said "I will close this here")
 *   after the link      -> 2   the call they were offered
 *   after the call      -> 2   the proposal
 *   proposal            -> 3   the proposal follow-up
 */
export const FOLLOW_UP_DAYS: Record<TemplateStage, number> = {
  first: 4,
  after_reply: 2,
  after_call: 2,
  follow_up_1: 5,
  follow_up_2: 7,
  follow_up_3: 74,
  proposal: 3,
};

/** WhatsApp gets ONE follow-up to an unanswered first message, and it is the last WhatsApp. */
export const WHATSAPP_FOLLOW_UPS = 1;
/** The days after the first e-mail on which its follow-ups go, each a reply in the same thread. */
export const EMAIL_FOLLOW_UP_DAYS = [4, 9, 16] as const;

/** When the next touch is due after sending `stage` at `from`. A Sunday (India) moves to Monday. */
export function followUpDate(stage: TemplateStage, from: Date | string = new Date()): Date {
  const start = typeof from === "string" ? new Date(from) : from;
  let due = new Date(start.getTime() + (FOLLOW_UP_DAYS[stage] ?? 4) * DAY_MS);
  if (istParts(due).day === 0) due = new Date(due.getTime() + DAY_MS);
  return due;
}

/* ── Safeguards ──────────────────────────────────────────────────────────── */

export interface SendCheck {
  ok: boolean;
  blockers: string[];
  warnings: string[];
}

export interface SendCheckExtra {
  /** Another lead with the same phone or email (store.findDuplicate). */
  duplicateOf?: Pick<OutreachLead, "id" | "instituteName"> | null;
  /**
   * The text exactly as it will go: the preview after the sender's edits.
   * Pass it. A [placeholder] still in it blocks the send, and so does a link
   * typed into a message that must not carry one. Without it the template's
   * own text is checked, so a template with a [placeholder] stays blocked.
   */
  text?: { subject?: string; body: string };
}

function hhmm(s: string | undefined, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? "").trim());
  return m ? Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2])) : fallback;
}

/** Quiet hours end at 10:00, when TRAI's window for commercial calls and messages opens. */
export const DEFAULT_QUIET_START = "20:00";
export const DEFAULT_QUIET_END = "10:00";

/** True when India-time `now` falls inside [start, end), wrapping midnight. */
export function inQuietHours(now: Date, quietStart = DEFAULT_QUIET_START, quietEnd = DEFAULT_QUIET_END): boolean {
  const { minutes } = istParts(now);
  const s = hhmm(quietStart, hhmm(DEFAULT_QUIET_START, 20 * 60));
  const e = hhmm(quietEnd, hhmm(DEFAULT_QUIET_END, 10 * 60));
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

/**
 * What a message tells the lead is already made for them, even with no link:
 * "Humne ... sample page banaya hai" (a demo) or "maine ek note likha hai" (a
 * pitch page). A message that offers to make one promises nothing. Every live
 * template says it itself (`promises`); the rules below read the retired ones.
 */
export function promisedPage(
  template: Pick<MessageTemplate, "id" | "channel" | "stage" | "pitch" | "promises">,
): "demo" | "pitch" | null {
  if (template.promises !== undefined) return template.promises;
  if (/_pitch_/.test(template.id)) return "pitch";
  if (template.channel !== "whatsapp") return null;
  if (template.stage === "first" && template.pitch !== "any") return "demo";
  if (/^wa_fu1_/.test(template.id)) return "demo";
  return null;
}

/** The daily WhatsApp limit, or null for none (the default). */
export function dailyWhatsappLimit(settings: Partial<OutreachSettings> | null | undefined): number | null {
  const n = Number(settings?.whatsappDailyLimit);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/**
 * Checks one send against the sales-kit rules before the compose window opens.
 * Blockers stop the send; warnings are shown and the sender decides.
 *
 * `sentTodayCount` is the number of WhatsApp first-contact messages already sent
 * today. There is NO daily limit by default (Mehdi, 28 Sep 2026: "remove the
 * WhatsApp limit of 10, keep it unlimited"). Only when settings carry a
 * limit (`whatsappDailyLimit` > 0) does reaching it block a "first" WhatsApp
 * message and warn for a reply to a warm lead.
 *
 * Pass `extra.text` (the text on screen, after edits): a [placeholder] left in
 * it, or a link typed into a message that must not carry one, blocks the send.
 */
export function checkSend(
  lead: Partial<OutreachLead> & Pick<OutreachLead, "instituteName">,
  template: MessageTemplate,
  channel: TemplateChannel,
  settings: Partial<OutreachSettings> | null | undefined,
  sentTodayCount = 0,
  now: Date = new Date(),
  extra: SendCheckExtra = {},
): SendCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const text = `${template.subject ?? ""}\n${template.body}`;
  // What will actually go, less the signature (a signature may carry the firm's web address).
  const signature = (settings?.signature ?? "").trim();
  const onScreen = extra.text ? `${extra.text.subject ?? ""}\n${extra.text.body}` : undefined;
  const typed = onScreen !== undefined && signature ? onScreen.split(signature).join("") : onScreen;
  const typedLink = typed !== undefined && URL_RE.test(typed);
  const cap = dailyWhatsappLimit(settings);
  const hasDemo = Boolean(demoLinkFor(lead.demoSlug));

  // Who they are
  if (lead.status === "do_not_contact") blockers.push("This lead asked not to be contacted. Nothing may be sent.");
  if (lead.status === "won") warnings.push("This lead is already a client.");
  if (lead.status === "lost") warnings.push("This lead is marked lost.");
  if (template.retired) {
    blockers.push("This message is retired: WhatsApp gets one follow-up only, four days after the first message. After it, e-mail, call or stop.");
  }

  // Right channel, reachable
  if (template.channel !== channel) blockers.push(`This is a ${template.channel} template, not ${channel}.`);
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((lead.email ?? "").trim())) {
    blockers.push("No valid e-mail address for this lead.");
  }
  if (channel === "whatsapp" && !leadWhatsappNumber(lead)) blockers.push("No valid phone or WhatsApp number for this lead.");

  // Links: none in a first message on either channel; the link goes after they say yes.
  if (template.stage === "first" && (template.allowsLink || containsLink(text) || typedLink)) {
    blockers.push("A first message must not carry a link. Send the link after they say yes.");
  } else if (!template.allowsLink && (containsLink(text) || typedLink)) {
    blockers.push("This template is marked no-link but contains a link.");
  }
  if (/\{demoLink\}/.test(text) && !hasDemo) blockers.push("Pick or create a demo first: this message carries the demo link.");
  if (/\{pitchLink\}/.test(text) && !pitchLinkFor(lead.pitchSlug)) blockers.push("Set the pitch page first: this message carries its link.");

  // What a message says about the demo must be true (honesty rule).
  const promises = promisedPage(template);
  if (promises === "demo" && !/\{demoLink\}/.test(text) && !hasDemo) {
    blockers.push("This message says a sample is already made, but this lead has no demo yet. Send the one that offers to make it, or make the demo first.");
  }
  if (promises === "pitch" && !/\{pitchLink\}/.test(text) && !pitchLinkFor(lead.pitchSlug)) {
    blockers.push("This message says a page was written for them, but this lead has no pitch page yet. Set one first.");
  }
  if (template.sample === "offer" && hasDemo) {
    warnings.push("This lead already has a demo: the message that says the sample is made fits better.");
  }
  if (/\{observation\}/.test(text) && !(lead.observation ?? "").trim()) {
    blockers.push("This message needs a real observation about their site. Pick one or type it, or call instead.");
  }
  if (template.stage === "first" && template.pitch === "new_website" && effectivePitch(lead) === "fix_website") {
    blockers.push("This message says they have no website of their own, and this lead has one. Send the message about their site, with what you saw on it.");
  }
  if (template.stage === "first" && template.pitch === "fix_website" && lead.pitch === "new_website") {
    warnings.push("This message is about their website, and this lead is marked as having none of its own. Check before sending.");
  }

  // Words still to fill in: [package and price], [date], [the old session you saw].
  const holes = unfilledPlaceholders(onScreen ?? `${text}\n${observationText(lead.observation, template.language)}`);
  if (holes.length) blockers.push(`Fill in ${holes.join(" and ")} before sending.`);

  // Volume: only when Mehdi has set a daily limit (blank means no limit).
  if (channel === "whatsapp" && cap !== null && sentTodayCount >= cap) {
    if (template.stage === "first") blockers.push(`Daily WhatsApp limit reached (${sentTodayCount} of ${cap} first messages today). Call or e-mail instead.`);
    else warnings.push(`${sentTodayCount} first WhatsApp messages already sent today (limit ${cap}).`);
  }

  // Timing: 10:00 to 21:00 India time (TRAI), quiet hours from settings; no first contact on Sunday.
  if (inQuietHours(now, settings?.quietStart, settings?.quietEnd)) {
    const from = settings?.quietEnd || DEFAULT_QUIET_END;
    const to = settings?.quietStart || DEFAULT_QUIET_START;
    warnings.push(`It is quiet hours in India (${to} to ${from}). Better to send between ${from} and ${to}.`);
  }
  const { day } = istParts(now);
  if (day === 0) warnings.push("It is Sunday in India: no first contact or follow-up on a Sunday.");
  // Dental clinics work Saturdays, so the Saturday e-mail warning is for schools and coaching only.
  else if (day === 6 && channel === "email" && lead.kind !== "dental") warnings.push("It is Saturday: school and coaching offices read e-mail on working days.");

  // History
  if (extra.duplicateOf && extra.duplicateOf.id !== lead.id) {
    warnings.push(`Same phone or e-mail as another lead: ${extra.duplicateOf.instituteName}. Do not message them twice.`);
  }
  if (template.stage === "first" && (lead.lastContactedAt || (lead.status && lead.status !== "new"))) {
    warnings.push("This lead has been contacted before; a first message may repeat what they already have.");
  }
  if (lead.lastContactedAt && lead.status !== "replied") {
    const since = now.getTime() - new Date(lead.lastContactedAt).getTime();
    if (since >= 0 && since < DAY_MS) warnings.push("Already contacted in the last 24 hours: never more than one unanswered message a day.");
    else if (channel === "whatsapp" && template.stage === "follow_up_1" && since >= 0 && since < 3 * DAY_MS) {
      warnings.push("The WhatsApp follow-up goes four days after the first message: wait at least three clear days.");
    }
  }
  if (lead.kind && lead.kind !== "other" && template.kind !== "any" && template.kind !== lead.kind) {
    warnings.push(`This template is written for a ${kindNoun(template.kind)}, and this lead is a ${kindNoun(lead.kind)}.`);
  }
  if (templateNotFor(template, lead.kind)) {
    warnings.push(`This message is not worded for a ${kindNoun(lead.kind)}. Pick the ${kindNoun(lead.kind)} version.`);
  }

  return { ok: blockers.length === 0, blockers, warnings };
}
