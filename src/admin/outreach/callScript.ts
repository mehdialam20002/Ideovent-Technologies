import { CALL_WINDOWS, DEFAULT_SENDER_NAME, greetingFor, observationText, timeOfDay } from "@/lib/outreach/engine";
import type { LeadKind, OutreachLead } from "@/lib/outreach/types";
import { startingObservation } from "./compose";

/*
 * THE TEAM'S CALL (spec 10.7, 1 Oct 2026). The script speaks in the caller's
 * own name (`sender`; Mehdi's text is byte-identical to before). A member's
 * script stops after the fix: the trust (the timeline after the advance), the
 * price, the next step and the summary are Mehdi's (SOP-10), so its last step
 * says to hand the lead to him. Four of its lines claim Mehdi's own work or are
 * masculine in Hinglish ("I made", "banana chahta hoon", "dikhata hoon",
 * "bana sakta hoon ... dikha dunga"); a member gets their "we" versions once
 * Mehdi approves "we_call_lines" in Settings, and until then those lines are
 * left out of the member's script (the cold opening, the fix's words).
 */

/**
 * THE CALL SCRIPT on the lead page (30 Sep 2026). The approved call flow, from
 * 04-sales-kit/APPROVED-MESSAGES-2026-09-30.md ("The call") and
 * OUTREACH-APPROACH-PLAYBOOK-2026-09-30.md section 6:
 *
 *   their problem -> the cost in their own numbers -> the fix for only the
 *   problems they named -> honest trust (our real work, their domain in their
 *   name, timeline) -> price plainly in 2 or 3 options -> a dated next step ->
 *   the summary the same day.
 *
 * Worded for the lead's kind, seen through the eyes of a patient, a parent or a
 * student, with five questions to ask. The spoken lines come in English and in
 * Hinglish (the playbook: polite English to dentists and principals, Hinglish
 * to Hindi-first owners). Everything in it is true today: the prices and weeks
 * are /pricing's Website line (src/pages/Pricing.tsx), the payment terms are
 * the approved 50% advance and 50% at launch, and it never says a sample was
 * made when the lead has no demo. No client, number or rating is claimed; the
 * only numbers asked for are theirs. Pure: no React.
 */

export type ScriptLanguage = "en" | "hinglish";

export interface CallStep {
  /** "handover": a member's last step, in place of trust, price, next and summary. */
  id: "problem" | "cost" | "fix" | "trust" | "price" | "next" | "summary" | "handover";
  title: string;
  /** What to do, for Mehdi. */
  how: string;
  /** Words to say, in the call's language. [Brackets] are what they told you. */
  say?: string;
  /** Short lines under the step: the price options, what to ask them for. */
  list?: string[];
}

export interface CallScript {
  /** Whose eyes the site is seen through: patient, parent, student or customer. */
  viewer: string;
  /** When to call this kind, and the hours that always hold. */
  when: string;
  /** For a call at a time they chose (after their yes). */
  opening: string;
  /** For a call they did not ask for: say why first, ask for 30 seconds. Empty for a member until Mehdi approves its words. */
  coldOpening: string;
  questions: string[];
  steps: CallStep[];
  /** A member's script: lines left out because their team wording waits for Mehdi's approval. */
  withheld?: number;
}

/** Who is calling: the name the opening says. Mehdi unless given. */
export interface ScriptSender {
  name: string;
  firstName: string;
}

export const MEHDI_SENDER: ScriptSender = { name: DEFAULT_SENDER_NAME, firstName: DEFAULT_SENDER_NAME.split(/\s+/)[0] };

/**
 * The call lines with a "we" version (team wording "we_call_lines"): Mehdi's
 * line and the team's, for a place word ("clinic", "school", "institute").
 */
export const CALL_LINES: Record<"madeEn" | "offerEn" | "offerHi" | "showHi" | "makeEn" | "makeHi", (place: string) => [string, string]> = {
  madeEn: (p) => [`I made a sample website for your ${p}.`, `We made a sample website for your ${p}.`],
  offerEn: (p) => [
    `I would like to make a short sample page for your ${p}, to show what a website could look like.`,
    `We would like to make a short sample page for your ${p}, to show what a website could look like.`,
  ],
  offerHi: (p) => [
    `main aapke ${p} ke liye ek chhota sample page banana chahta hoon, taaki aap dekh sakein ki website kaisi dikh sakti hai.`,
    `hum aapke ${p} ke liye ek chhota sample page banana chahte hain, taaki aap dekh sakein ki website kaisi dikh sakti hai.`,
  ],
  showHi: () => ["Aapne kaha [unki baat]. Sample mein sirf wahi hissa dikhata hoon.", "Aapne kaha [unki baat]. Sample mein sirf wahi hissa dekhte hain."],
  makeEn: () => [
    "You said [what they said]. I can make a sample that fixes just that, and show it to you.",
    "You said [what they said]. We can make a sample that fixes just that, and show it to you.",
  ],
  makeHi: () => [
    "Aapne kaha [unki baat]. Main ek sample bana sakta hoon jo sirf yahi theek kare, aur aapko dikha dunga.",
    "Aapne kaha [unki baat]. Hum ek sample bana sakte hain jo sirf yahi theek kare, aur aapko dikha denge.",
  ],
};

/** How a line is said: Mehdi's own, the team's "we" version, or left out (not approved yet). */
type Voice = "owner" | "we" | "withheld";
const said = (pair: readonly [string, string], voice: Voice): string | undefined => (voice === "owner" ? pair[0] : voice === "we" ? pair[1] : undefined);

type Words = { place: string; viewer: string; viewers: string; later: string; laterHi: string };

const WORDS: Record<LeadKind, Words> = {
  dental: { place: "clinic", viewer: "patient", viewers: "patients", later: "after your OPD", laterHi: "OPD ke baad" },
  school: { place: "school", viewer: "parent", viewers: "parents", later: "after school hours", laterHi: "school ke baad" },
  coaching: { place: "institute", viewer: "student", viewers: "students", later: "between batches", laterHi: "batch ke baad" },
  other: { place: "business", viewer: "customer", viewers: "customers", later: "later today", laterHi: "thodi der baad" },
};

const wordsFor = (kind: LeadKind | undefined) => WORDS[kind ?? "other"] ?? WORDS.other;

/** How to address them: the engine's {greeting}, so the call and the messages say the same name ("Dr. Mehta ji"). */
export function scriptGreeting(lead: Pick<OutreachLead, "contactName" | "kind">, lang: ScriptLanguage): string {
  return greetingFor(lead.contactName, lead.kind, lang);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * A kind's good window for a call, in words, from the engine's CALL_WINDOWS
 * (the same window {callSlots} proposes times in): "Monday to Friday, 14:30 to 16:00".
 */
export function windowText(kind: string | undefined | null): string {
  const w = CALL_WINDOWS[kind as LeadKind] ?? CALL_WINDOWS.other;
  const d = [...w.days].sort((a, b) => a - b);
  const run = d.length > 1 && d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const days = run ? `${DAY_NAMES[d[0]]} to ${DAY_NAMES[d[d.length - 1]]}` : d.map((x) => DAY_NAMES[x]).join(", ");
  return `${days}, ${clock(w.window[0])} to ${clock(w.window[1])}`;
}

function openings(lead: OutreachLead, lang: ScriptLanguage, hasDemo: boolean, now: Date, sender: ScriptSender, voice: Voice): { opening: string; cold: string } {
  const w = wordsFor(lead.kind);
  const g = scriptGreeting(lead, lang);
  const name = lead.instituteName.trim();
  const who = (lead.contactName || "").trim() || name;
  if (lang === "en") {
    const about = hasDemo ? `the sample page for ${name}` : `a website for ${name}`;
    const why = said(hasDemo ? CALL_LINES.madeEn(w.place) : CALL_LINES.offerEn(w.place), voice);
    return {
      opening: `Good ${timeOfDay(now)} ${g}, this is ${sender.name} from Ideovent Technologies, Saket. You gave me this time for a 10-minute call about ${about}. Is it still a good time?`,
      cold: why === undefined ? "" : `Good ${timeOfDay(now)}, is this ${who}? I am ${sender.name} from Ideovent Technologies in Saket. The reason for my call: ${why} Can I take 30 seconds, or shall I call ${w.later}?`,
    };
  }
  const about = hasDemo ? `${name} ke sample page` : `${name} ki website`;
  // "humne ... banayi hai" is already the team's own words: no approval needed for it.
  const why = hasDemo ? `humne aapke ${w.place} ke liye ek sample website banayi hai.` : said(CALL_LINES.offerHi(w.place), voice);
  return {
    opening: `Namaste ${g}, main ${sender.firstName}, Ideovent Technologies (Saket, Delhi) se. Aapne ${about} ki baat ke liye ye time diya tha. Kya abhi 10 minute baat ho sakti hai?`,
    cold: why === undefined ? "" : `Namaste, kya ${who} se baat ho rahi hai? Main ${sender.name}, Ideovent Technologies, Saket se. Call ki wajah: ${why} 30 second de sakte hain, ya ${w.laterHi} call karun?`,
  };
}

/** Five questions per kind: how they are found, what people ask, their own numbers, one kind rule, who decides. */
const QUESTIONS: Record<LeadKind, Record<ScriptLanguage, string[]>> = {
  dental: {
    en: [
      "How do new patients find the clinic today: Google, Practo, or someone they know?",
      "When a patient wants an appointment, what do they do now: call, WhatsApp or walk in?",
      "In a normal week, how many calls are only to ask the timings or the fees?",
      "Which treatments do patients ask about most before they come in?",
      "Apart from you, who decides on the website?",
    ],
    hinglish: [
      "Naye patients aaj clinic ko kaise dhoondhte hain: Google, Practo, ya kisi jaan-pehchaan se?",
      "Patient ko appointment chahiye to abhi wo kya karta hai: call, WhatsApp, ya seedha aa jaata hai?",
      "Ek normal hafte mein kitni calls sirf timing ya fees poochhne ke liye aati hain?",
      "Aane se pehle patients sabse zyada kis treatment ke baare mein poochhte hain?",
      "Website ka decision aapke alawa aur kaun leta hai?",
    ],
  },
  school: {
    en: [
      "How do parents find the school and ask about admission today?",
      "In admission season, what do parents ask the office most often on the phone?",
      "In a week of admissions, how many calls are only about fees or dates?",
      "If you are a CBSE school: is the mandatory public disclosure on your website up to date?",
      "Apart from you, who decides on the website: the management or the trust?",
    ],
    hinglish: [
      "Parents aaj school ke baare mein kaise pata karte hain, aur admission ke liye kaise poochhte hain?",
      "Admission ke time parents office mein phone par sabse zyada kya poochhte hain?",
      "Admission ke ek hafte mein kitni calls sirf fees ya dates ke liye aati hain?",
      "Agar school CBSE hai: kya website par mandatory public disclosure abhi up to date hai?",
      "Website ka decision aapke alawa aur kaun leta hai: management ya trust?",
    ],
  },
  coaching: {
    en: [
      "How do students find you and compare you with other institutes today?",
      "When a student calls, what do they ask first: batch timings, fees or the faculty?",
      "In a week, how many enquiries come in, and how many of them join?",
      "Do you have written consent from the students whose names or results you would like to show?",
      "Apart from you, who decides on the website?",
    ],
    hinglish: [
      "Students aaj aapko kaise dhoondhte hain, aur doosre institutes se compare kaise karte hain?",
      "Student call karta hai to sabse pehle kya poochhta hai: batch timing, fees, ya faculty?",
      "Ek hafte mein kitni enquiries aati hain, aur unme se kitne join karte hain?",
      "Jin students ke naam ya result aap dikhana chahenge, unki likhit consent aapke paas hai?",
      "Website ka decision aapke alawa aur kaun leta hai?",
    ],
  },
  other: {
    en: [
      "How do new customers find you today?",
      "When someone wants to book or buy, what do they do now: call, WhatsApp or walk in?",
      "In a normal week, how many calls are only to ask prices or timings?",
      "What do customers ask most before they decide?",
      "Apart from you, who decides on the website?",
    ],
    hinglish: [
      "Naye customers aaj aapko kaise dhoondhte hain?",
      "Kisi ko book karna ya khareedna ho to abhi wo kya karta hai: call, WhatsApp, ya seedha aa jaata hai?",
      "Ek normal hafte mein kitni calls sirf price ya timing poochhne ke liye aati hain?",
      "Decide karne se pehle customers sabse zyada kya poochhte hain?",
      "Website ka decision aapke alawa aur kaun leta hai?",
    ],
  },
};

/**
 * When each kind can talk (the approved "Words per business" table; principals
 * after school, as the playbook says), in the same window the after-yes message
 * proposes its call times in, and the limits that always hold.
 */
const WHEN: Record<LeadKind, string> = {
  dental: `Dentists can talk between patients: ${windowText("dental")}.`,
  school: `Principals take calls after school: ${windowText("school")}, the times the after-yes message offers.`,
  coaching: `Coaching owners: ${windowText("coaching")}, never during the evening batches.`,
  other: `Owners: ${windowText("other")}.`,
};
const ALWAYS = "A time they chose comes first. Never before 10:00 or after 21:00, never on a Sunday.";

/** What honesty asks of this kind's site, said in step 4. */
const KIND_RULE: Record<LeadKind, string> = {
  dental: 'A clinic site may not say "best" or "first", and sample doctors, fees or reviews never go live.',
  school: "The fees and dates on the sample are sample content until the school sends its own.",
  coaching: "No ranks or results on the site without the student's written consent.",
  other: "Whatever the sample shows that did not come from them is sample content until they send theirs.",
};

/** What to ask them for after a yes (step 7): the approved clinic list, the same idea for the others. */
const NEEDS: Record<LeadKind, string> = {
  dental: "Logo, the doctors' names and degrees, clinic timings, 5 or 6 photos of the clinic.",
  school: "Logo, admission dates and fees, school timings, 5 or 6 photos of the school.",
  coaching: "Logo, courses with batch timings and fees, faculty details, 5 or 6 photos. Toppers only with written consent.",
  other: "Logo, services and prices, timings, 5 or 6 photos.",
};

/** /pricing, Website line, lowest first. The clinic range in the approved flow is the same Rs 20,000 to 45,000. */
const PRICE_OPTIONS = [
  "Rs 20,000: Website Essential, up to 8 pages, 3 weeks.",
  "Rs 30,000: Website Professional, up to 15 pages, custom design, 4 weeks.",
  "Rs 45,000: Website Premium, enquiry tracking and more than one branch, 5 weeks.",
];
const PORTAL = "Student records, fee receipts or attendance are the portal line, from Rs 40,000. Only if they ask.";

export interface ScriptOptions {
  hasDemo: boolean;
  language: ScriptLanguage;
  now?: Date;
  /** Who calls; Mehdi when left out (his text is the same as before). */
  sender?: ScriptSender;
  /**
   * Anyone but Mehdi: `wording` is Mehdi's approval of the team's call lines
   * ("we_call_lines"); without it those lines are left out. `member`: the
   * script stops after the fix and hands the lead over (the price is Mehdi's).
   */
  team?: { wording: boolean; member: boolean };
}

/** A member's last step: the price and the start date are Mehdi's (SOP-10). */
const HANDOVER_STEP: CallStep = {
  id: "handover",
  title: "Hand it to Mehdi",
  how: "Next: hand this lead to Mehdi for the price and the start date. Tap Hand to Mehdi with what they told you. Never quote a price, a payment or a date yourself.",
};

/** The whole script for one lead, in the language of the call. */
export function callScriptFor(lead: OutreachLead, opts: ScriptOptions): CallScript {
  const kind: LeadKind = WORDS[lead.kind] ? lead.kind : "other";
  const w = wordsFor(kind);
  const en = opts.language === "en";
  const voice: Voice = !opts.team ? "owner" : opts.team.wording ? "we" : "withheld";
  const { opening, cold } = openings(lead, opts.language, opts.hasDemo, opts.now ?? new Date(), opts.sender ?? MEHDI_SENDER, voice);
  const obsId = startingObservation(lead);
  const obs = obsId ? observationText(obsId, en ? "en" : "hinglish") : "";

  const steps: CallStep[] = [
    {
      id: "problem",
      title: "Their problem",
      how: `Start with what their ${w.viewers} run into, not with us. Ask questions 1 and 2 and let them say it in their words.${obs ? "" : " No checked problem is noted for this lead: ask, do not guess."}`,
      say: obs ? (en ? `I looked your ${w.place} up on my phone, the way a ${w.viewer} would. ${obs}` : `Maine aapka ${w.place} phone par dekha, jaise ek ${w.viewer} dekhta hai. ${obs}`) : undefined,
    },
    {
      id: "cost",
      title: "What it costs them, in their numbers",
      how: "Ask question 3 and write their answer down. That number is the cost, in their words. Never offer a number of your own.",
      say: en ? "So about [their number] calls a week are only to ask. Is that right?" : "Matlab hafte mein lagbhag [unka number] calls sirf poochhne ke liye aati hain. Sahi hai?",
    },
    {
      id: "fix",
      title: "The fix, only for what they named",
      how: opts.hasDemo
        ? "Show only the parts of the sample that fix what they just said. Leave the rest out, even if it looks good."
        : "Offer to fix only what they just said. Leave the rest out, even if you noticed more.",
      say: opts.hasDemo
        ? en ? "You said [what they said]. Let me show you just that part of the sample." : said(CALL_LINES.showHi(""), voice)
        : said(en ? CALL_LINES.makeEn("") : CALL_LINES.makeHi(""), voice),
    },
    {
      id: "trust",
      title: "Honest trust",
      how: `Only what is real: ${opts.hasDemo ? "the sample in front of them and our own website" : "our own website, and the sample once you have made it"}. No client names, numbers or reviews. Say plainly which parts of the sample are sample content. ${KIND_RULE[kind]}`,
      say: en
        ? "The website and the domain will be registered in your name. The first version is ready 3 to 5 weeks after the advance and your details."
        : "Website aur domain aapke naam par registered honge. Advance aur aapki details milne ke 3 se 5 hafte mein pehla version ready hoga.",
    },
    {
      id: "price",
      title: "The price, in 2 or 3 options",
      how: "Plainly, lowest first. Payment: 50% advance, 50% at launch.",
      say: en
        ? "There are three options: Rs 20,000, Rs 30,000 and Rs 45,000. The difference is the number of pages and how much you manage yourself. Payment is 50% advance and 50% at launch."
        : "Teen option hain: Rs 20,000, Rs 30,000 aur Rs 45,000. Farak pages ka hai, aur is baat ka ki aap khud kitna manage karte hain. Payment 50% advance, 50% launch par.",
      list: kind === "school" || kind === "coaching" ? [...PRICE_OPTIONS, PORTAL] : PRICE_OPTIONS,
    },
    {
      id: "next",
      title: "A dated next step",
      how: 'A polite yes or "dekhte hain" is not a decision: fix a date before you hang up. If you have only called so far, ask "May I send it on WhatsApp on this number?" That yes is their permission: note it in the history with the date.',
      say: en
        ? "I will send today's summary on WhatsApp. Shall we fix [day and time] for your decision?"
        : "Aaj ki baat ka summary main WhatsApp par bhej deta hoon. Decision ke liye [din aur time] fix kar lein?",
    },
    {
      id: "summary",
      title: "The summary, the same day",
      how: "Tap Call done below. The message box then moves to After the call: fill in the package and price and the date of the first version, and send it today.",
      list: [`What to ask them for: ${NEEDS[kind]}`],
    },
  ];

  // A member hands over after the fix: the trust (the timeline after the advance), the price, the next step and the summary are Mehdi's.
  const member = Boolean(opts.team?.member);
  const shown = member ? [...steps.slice(0, 3), HANDOVER_STEP] : steps;
  const withheld = voice === "withheld" ? Number(!cold) + Number(shown.some((s) => s.id === "fix" && s.say === undefined)) : 0;
  return {
    viewer: w.viewer,
    when: `${WHEN[kind]} ${ALWAYS}`,
    opening,
    coldOpening: cold,
    questions: QUESTIONS[kind][opts.language],
    steps: shown,
    ...(opts.team ? { withheld } : {}),
  };
}
