import type { DemoSiteOpen } from "@/lib/cms/types";
import { OBSERVATIONS, checkSend, demoLinkFor, isKnownObservation, type SendCheck } from "@/lib/outreach/engine";
import { templatesFor, type MessageTemplate, type TemplateChannel, type TemplateStage } from "@/lib/outreach/templates";
import type { EventInput, OutreachEvent, OutreachLead, OutreachSettings } from "@/lib/outreach/types";
import { dueFollowUps, hotLeads, isOpenLead, type OpensCtx } from "./derive";
import { isRetired, ladderFor, stageFor, type TemplateOffer } from "./stages";
import { dueLabel } from "./ui";

/**
 * Pure choices behind the compose screen: which stage a lead is at, which
 * templates fit, what the lead's next step is, and the checks that keep one
 * lead's words out of another lead's message. No React here, so every screen
 * (and a reader of this file) gets the same answer. The stage names Mehdi
 * reads (First message, After they say yes, Follow-up, After the call,
 * Proposal, Closing) live in stages.ts.
 */

/**
 * The stage this lead is most likely at, from a count of sends on the e-mail
 * ladder. The compose screen uses stages.ts suggestFor, which reads the
 * channel's own sends and ladder; this stays for callers that only have a count.
 */
export function suggestStage(lead: OutreachLead, sends: number): TemplateStage {
  switch (lead.status) {
    case "replied":
    case "demo_opened":
      return stageFor("after_yes");
    case "call":
      return stageFor("after_call");
    case "proposal":
      return stageFor("proposal");
    default: {
      if (sends <= 0) return stageFor("first");
      const ladder = ladderFor("email", lead.kind);
      return ladder[Math.min(sends, ladder.length) - 1] ?? stageFor("follow_up");
    }
  }
}

export interface RankInput {
  lead: OutreachLead;
  channel: TemplateChannel;
  stage: TemplateStage;
  settings: OutreachSettings;
  waToday: number;
  observation: string;
  /** Anyone but Mehdi: what they may send of each template (stages.ts TemplateOffer; teamCompose.ts). */
  offer?: TemplateOffer;
}

/**
 * Every template of this stage and channel that fits the lead's kind, best
 * first. "Best" means, in order: it can be sent right now (no blocker), it is
 * in the lead's language, and its pitch matches: the lead's own pitch when it
 * has one (the CSV import's website_state, the Lead Finder's verdict: a clinic
 * whose only "website" is a Practo or Facebook page is new_website), else a
 * lead with a website gets "fix your website", one without "we built you a site".
 */
export function rankTemplates({ lead, channel, stage, settings, waToday, observation, offer }: RankInput): MessageTemplate[] {
  const lang = lead.language || "en";
  const pitch = lead.pitch || (lead.website ? "fix_website" : "new_website");
  const probe = { ...lead, observation };
  // Last tie-break: a lead with a demo gets the message that says the sample is made, one without it
  // the twin that offers to make one (templates.ts `sample`). The other weights are doubled so this
  // never outranks them.
  const sampleFit = demoLinkFor(lead.demoSlug) ? "made" : "offer";
  const score = (t: MessageTemplate) =>
    (checkSend(probe, t, channel, settings, waToday).ok ? 16 : 0) +
    2 * langScore(t.language, lang) +
    (t.pitch === pitch ? 4 : t.pitch === "any" ? 2 : 0) +
    (t.sample === sampleFit ? 1 : 0);
  return templatesFor({ channel, stage, kind: lead.kind })
    .filter((t) => !isRetired(t))
    .map((t) => (offer ? offer(t) : t))
    .filter((t): t is MessageTemplate => Boolean(t))
    .map((t, i) => ({ t, s: score(t), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t);
}

/**
 * How close a template's language is to the lead's. Exact is best. Hindi and
 * Hinglish sit next to each other: a Hindi-speaking lead reads Hinglish far
 * more easily than English, and there are no e-mails in Hindi script, so a
 * 'hi' lead's suggested e-mail is the Hinglish one, not the English.
 */
function langScore(template: string, lead: string): number {
  if (template === lead) return 4;
  if ((template === "hinglish" && lead === "hi") || (template === "hi" && lead === "hinglish")) return 3;
  return 0;
}

/**
 * A note in every case, even one that speaks to them: the research tools ("curl
 * 27 Sep 2026: HTTP 200, 46 KB", a page width in px), the sheet's own verdicts
 * ("skipped, no new-site pitch"), and a web address written out (a domain in a
 * message is a link, and a first message carries none of its own).
 */
const NOTE_ALWAYS = [
  /\bcurl\b|\bHTTP \d{3}\b|\b\d+(\.\d+)? ?(KB|MB)\b|\b\d+ ?px\b|\bheadless\b|\(checked|visible-text|\bog[: ]|\bmeta (tag|description)\b|\btitle tag\b|returns only|\bre-?checked\b|\bNXDOMAIN\b/i,
  /\bskipped\b|\bpitch\b|\bno new[- ]site\b|\bbuying[ _]signal\b|\blead sheet\b|\bnot a fit\b/i,
  /\b[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.(com|in|org|net|edu|info|biz|io|co|ac\.in|co\.in|org\.in|edu\.in|net\.in)\b/i,
];

/**
 * A note unless it speaks to them: the page or the lead in the third person.
 * "Their only site is a free Blogger blog" and "No website of its own: only
 * directories come up for the school" read as notes in a message that opens "I
 * looked at your school's website.". The quoting shape (the X reads / says /
 * shows) and a copyright line are notes too ("One thing stood out: The footer
 * reads...").
 */
const NOTE_UNLESS_TO_THEM = [
  /^(their|they|has|have)\b/i,
  /\btheir(\s+[\w'-]+){0,2}\s+(site|website|web site|homepage|home page|blog|blogs|listing|listings|page|pages|footer|header|domain|course|courses|wix|wordpress|record|profile|profiles|examination)\b/i,
  /\b(their|its) own\b/i,
  /\b(for|instead of|about) the (school|clinic|institute|academy|centre|center|classes|coaching|practice)\b/i,
  /^no (website|working website|web presence|site)\b/i,
  /^(the|their|its)\s+[\w\s-]{0,40}?\b(reads|says|shows|lists|displays)\b/i,
  /\bcopyright\b|©/i,
  /\bgoogle (search )?for\b/i,
];

/** Speaks to them: "your site", "aapki site". */
const TO_THEM = /\b(you|your|yours|aap|aapki|aapka|aapke|aapko)\b/i;

/** A quote from their page: it opens after a space or a bracket and closes before one or a stop. */
const QUOTED = /(^|[\s(])(['‘"“])[^'‘’"“”]+(['’"”])(?=[\s.,;:)!?]|$)/g;

/** The text without what it quotes from their page ('This is a summary of your course...'): a quoted "your" is the page's, not ours. */
const unquoted = (t: string) => t.replace(QUOTED, "$1");

/** A title before a name ("Dr. Sharma", "Sr. Sec. School"): its stop does not end a sentence. */
const TITLE_STOP = /\b(Dr|Mr|Mrs|Ms|Smt|Shri|St|Sr|Jr|Sec|Prof|No|Pvt|Ltd)\.$/;
const STOP_MASK: Record<string, string> = { ".": "\u0001", "!": "\u0002", "?": "\u0003" };

/** The sentences of a text. A stop inside a quote from their page, or after a title, does not end one. */
function sentences(t: string): string[] {
  const masked = t.replace(QUOTED, (m) => m.replace(/[.!?]/g, (ch) => STOP_MASK[ch]));
  const out: string[] = [];
  for (const part of masked.split(/(?<=[.!?])\s+(?=\S)/)) {
    if (out.length && TITLE_STOP.test(out[out.length - 1])) out[out.length - 1] += ` ${part}`;
    else out.push(part);
  }
  return out.map((s) => s.replace(/[\u0001\u0002\u0003]/g, (ch) => (ch === "\u0001" ? "." : ch === "\u0002" ? "!" : "?")).trim()).filter(Boolean);
}

/**
 * True when a lead's observation reads like a research note (the lead sheet's
 * buying_signal column) rather than a sentence to say to them. Such a note is
 * shown to Mehdi ("Your research note, never sent"), never put in a message or
 * read out by the call script on its own.
 *
 * 4 Oct 2026 (crm-fixes-1004 items 1 and 16), from the live CRM's own saved
 * observations: "directory" no longer makes a note on its own (Bansal Dental's
 * "You post on Facebook almost every day, but the clinic has no website of its
 * own; a search finds only directories and social pages." and Ek Dant's "A
 * search for Ek Dant in Rajouri Garden finds Practo, Justdial and other
 * directories, but no website of your own." speak to them, and were the
 * reason their first WhatsApp stayed blocked), while the sheet's verdicts and
 * domains ("Has its own modern, maintained site (holyspiritlonikand.com,
 * Admission 2026-27 live): skipped, no new-site pitch.") and the third person
 * ("Their only site is a free WordPress.com blog with no fees or admission
 * details.") now are. An observation from the list, in any of its wordings,
 * is never a note.
 *
 * The third-person test runs sentence by sentence (gate review, 4 Oct 2026): in
 * "I looked at your website. Their only site is a free Blogger blog with no fees
 * page." the "your" of the first sentence does not make the second, which talks
 * about them, speak to them.
 */
export function looksLikeNote(text: string | undefined): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (isKnownObservation(t) || OBSERVATIONS.some((o) => o.id === t || o.en === t || o.hinglish === t)) return false;
  if (NOTE_ALWAYS.some((re) => re.test(t))) return true;
  return sentences(t).some((s) => !TO_THEM.test(unquoted(s)) && NOTE_UNLESS_TO_THEM.some((re) => re.test(s)));
}

/** Why a send stops when the sentence typed for {observation} reads like a research note (looksLikeNote). */
export const NOTE_IN_MESSAGE =
  "This sentence reads like a research note (it talks about them, not to them, or carries a web address or the lead sheet's own words). Say it to them, as in \"Your site ...\", or pick one from the list.";

/** Why a saved observation is a note, in a few words for Settings > Clean saved observations; null when it is not one. */
export function noteReason(text: string | undefined): string | null {
  if (!looksLikeNote(text)) return null;
  const t = (text || "").trim();
  if (NOTE_ALWAYS[2].test(t)) return "Has a web address in it";
  if (NOTE_ALWAYS[1].test(t)) return "The lead sheet's own verdict";
  if (NOTE_ALWAYS[0].test(t)) return "A research tool's output";
  return "Talks about them, not to them";
}

/** The observation a new compose starts with: the lead's own, unless it is a research note. */
export function startingObservation(lead: OutreachLead): string {
  const o = (lead.observation || "").trim();
  return o && !looksLikeNote(o) ? o : "";
}

/**
 * Words that say WHAT a business is, not WHICH one. A lead named only with
 * these ("Kids Dental Clinic", "Dental Clinic", "Public School") is the same
 * phrase our own templates write ("Google par aapka kids dental clinic
 * dekha"), so it cannot tell one lead from another (2 Oct 2026: every
 * kids-dental message was blocked by a lead called "Kids Dental Clinic").
 */
const GENERIC_NAME_WORDS = new Set([
  "the", "and", "of", "for", "pvt", "ltd", "private", "limited", "india", "indian", "new", "delhi",
  "kid", "kids", "child", "children", "childrens", "paediatric", "pediatric", "pedodontic",
  "dental", "dentist", "dentists", "dentistry", "clinic", "clinics", "care", "smile", "smiles", "tooth", "teeth", "oral",
  "implant", "implants", "ortho", "orthodontic", "orthodontics", "braces", "aligner", "aligners", "cosmetic", "aesthetic", "aesthetics",
  "multispeciality", "multispecialty", "multi", "speciality", "specialty", "family", "hospital", "centre", "center", "health", "healthcare",
  "school", "schools", "public", "convent", "senior", "secondary", "sr", "sec", "high", "higher", "primary", "play", "playschool",
  "pre", "preschool", "nursery", "international", "global", "model", "modern", "english", "medium", "academy", "academic",
  "coaching", "classes", "class", "institute", "tutorials", "tuition", "tuitions", "education", "educational", "learning", "study",
]);

/** Lower case, every run of non-letters and non-digits as one space, padded, so matches are whole words. */
const words = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim()} `;

/** True when every word of the name only says what kind of business it is. */
export function isGenericLeadName(name: string): boolean {
  const ws = words(name).trim().split(" ").filter(Boolean);
  return ws.length > 0 && ws.every((w) => GENERIC_NAME_WORDS.has(w));
}

/**
 * Other leads whose institute name appears in this text. One lead's name in
 * another lead's message is exactly the 28 Sep 2026 bug (one imported
 * lead's name in every mail), so the send is blocked while it is there. Short
 * names (under 8 letters), names made only of generic business words, and names
 * this lead's own name contains are ignored, so "Academy" or "Kids Dental
 * Clinic" never trips it; a distinctive name ("Verma Coaching Academy") still
 * does. Names match as whole words.
 */
export function otherLeadsNamed(text: string, lead: OutreachLead, leads: OutreachLead[]): OutreachLead[] {
  const hay = words(text);
  const own = words(lead.instituteName);
  return leads.filter((l) => {
    if (l.id === lead.id) return false;
    const raw = (l.instituteName || "").trim();
    if (raw.length < 8 || isGenericLeadName(raw)) return false;
    const n = words(raw);
    return !own.includes(n) && hay.includes(n);
  });
}

/** Checks for one template, for callers that only need the verdict. */
export function canSend(r: RankInput, t: MessageTemplate): SendCheck {
  return checkSend({ ...r.lead, observation: r.observation }, t, r.channel, r.settings, r.waToday);
}

/**
 * What to do next for this lead, in a few plain words that name the stage
 * (First message, After they say yes, Follow-up, After the call, Proposal).
 * `urgent` colours it. `hot`: the lead is Hot (derive.ts isHotLead, the one
 * reading every screen shares), worked out by the caller with its history.
 */
export function nextStep(lead: OutreachLead, hot: boolean, now = new Date(), opts: { member?: boolean } = {}): { text: string; urgent: boolean } {
  // A member hands a yes to Mehdi (spec 10.7): the sample and the call times are his to send.
  if (opts.member && lead.status === "replied") return { text: "They said yes: hand the lead to Mehdi now", urgent: true };
  if (!isOpenLead(lead)) return { text: lead.status === "won" ? "Client" : "Nothing to do", urgent: false };
  if (hot) return { text: "Demo opened: call or message today", urgent: true };
  const due = lead.nextActionAt ? dueLabel(lead.nextActionAt, now) : "";
  const late = /late/.test(due);
  const isDue = due === "today" || late;
  switch (lead.status) {
    case "new":
      return { text: "Send the first message", urgent: false };
    case "replied":
      return { text: "After they say yes: send the sample link", urgent: true };
    case "demo_opened":
      return { text: "They opened the sample: call them", urgent: true };
    case "call":
      return { text: isDue ? `After the call: send the summary (${due})` : "After the call: send the summary", urgent: isDue };
    case "proposal":
      return { text: isDue ? `Proposal: chase it (${due})` : "Proposal sent", urgent: isDue };
    default:
      if (isDue) return { text: `Follow-up due ${due}`, urgent: true };
      return { text: due ? `Follow-up ${due}` : "Waiting for a reply", urgent: false };
  }
}

/**
 * What "They replied" writes (the compose menu and Today use the same words):
 * a reply event and status Replied, due now, so the lead moves to After they
 * say yes. The playbook: answer within the hour.
 */
export function repliedChanges(lead: OutreachLead, now = new Date(), opts: { member?: boolean } = {}): { event: EventInput; patch: Partial<OutreachLead> } {
  return {
    event: {
      leadId: lead.id,
      type: "replied",
      // A member hands a yes to Mehdi (spec 10.7): the sample and the call times are his to send in P1.
      detail: opts.member
        ? "They replied. Next: if it is a yes, hand the lead to Mehdi now."
        : "They replied. Next: After they say yes, send the sample link and two call times.",
    },
    patch: { status: "replied", nextActionAt: now.toISOString() },
  };
}

/**
 * What "Call done" writes (the compose menu and the call script card): a call
 * event, status Call, and the next action due today, because the approved
 * flow sends the after-call summary the same day. Both answers are patches
 * (only these keys change, merged on the server: spec 9.3).
 *
 * A MEMBER (spec 10.7) never sets stage Call (the database refuses it: a call
 * with Mehdi is a hand-over). Their call line says to hand the lead over if
 * they are interested, and the lead stays due now until they do (or set the
 * next follow-up).
 */
export function callDoneChanges(lead: OutreachLead, now = new Date(), opts: { member?: boolean } = {}): { event: EventInput; patch: Partial<OutreachLead> } {
  if (opts.member) {
    return {
      event: { leadId: lead.id, type: "call", channel: "call", detail: "Call done. Next: if they are interested, hand the lead to Mehdi." },
      patch: { lastContactedAt: now.toISOString(), nextActionAt: now.toISOString() },
    };
  }
  return {
    event: { leadId: lead.id, type: "call", channel: "call", detail: "Call done. Next: After the call, send the summary today." },
    patch: { status: "call", lastContactedAt: now.toISOString(), nextActionAt: now.toISOString() },
  };
}

/**
 * Today's to-do list, in the order it pays: hot leads (their own demo opened
 * since the last message: derive.ts hotLeads), follow-ups due today or late,
 * then new leads not contacted. The lead screen walks this list with "Next lead".
 */
export function todayQueue(leads: OutreachLead[], opens: DemoSiteOpen[] | undefined, now: Date, ctx: OpensCtx) {
  const hot = hotLeads(leads, opens, now, ctx);
  const hotIds = new Set(hot.map((h) => h.lead.id));
  const due = dueFollowUps(leads, now).filter((l) => !hotIds.has(l.id));
  const dueIds = new Set(due.map((l) => l.id));
  const fresh = leads.filter((l) => l.status === "new" && !hotIds.has(l.id) && !dueIds.has(l.id));
  return { hot, due, fresh, all: [...hot.map((h) => h.lead), ...due, ...fresh] };
}

/** Sends already made to a lead on one channel (for the suggested stage). */
export function sendsOn(leadId: string, events: OutreachEvent[], channel: TemplateChannel): number {
  return events.filter((e) => e.leadId === leadId && e.type === "sent" && e.channel === channel).length;
}
