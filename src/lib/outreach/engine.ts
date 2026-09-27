/**
 * Outreach engine: turns a template + a lead into the exact text Mehdi sends,
 * builds the Gmail / mailto / WhatsApp links that open it ready to send, dates
 * the next follow-up, and checks the send against the sales-kit rules.
 *
 * Pure functions, no I/O, no React: the admin UI and scripts/test-outreach-engine.mjs
 * call the same code.
 *
 * Sources: 04-sales-kit/messaging/WHATSAPP-PLAYBOOK.md (no link in a cold first
 * message, 10 a day, never before 09:00 or after 21:00, no Sunday first contact),
 * cold-email/EMAIL-RULES.md section 8 (the REMOVE opt-out line, verbatim, on
 * every cold e-mail), FOLLOW-UP-LADDER.md (Day 0, 2, 5, 10, 21, 45, 90) and
 * PROPOSAL-FOLLOWUP.md (proposal chased on Day 3).
 */

import type { OutreachLead, OutreachSettings } from "./types";
import type { MessageTemplate, TemplateChannel, TemplateLanguage, TemplateStage } from "./templates";

/* ── Constants ──────────────────────────────────────────────────────────── */

/** The live site. www.ideovent.in does not resolve yet (FACTS.md). */
export const SITE_ORIGIN = "https://ideovent.vercel.app";

export const DEFAULT_SENDER_NAME = "Mehdi Alam";
export const DEFAULT_SENDER_PHONE = "+91 77619 21786";

/**
 * Plain cold-mail signature (SEQUENCE-INDIA-SCHOOLS.md section 2), phone only
 * until the domain resolves. Same text as store.ts DEFAULT_SIGNATURE, the
 * settings default, so an empty setting and the default read the same.
 */
export const DEFAULT_SIGNATURE = `Mehdi Alam
Ideovent Technologies
Saket, New Delhi
+91 77619 21786`;

/** EMAIL-RULES.md section 8, "use this wording, unchanged". */
export const EMAIL_OPT_OUT_EN =
  "If you'd rather I didn't write again, reply with the word REMOVE and I'll take your address off my list the same day. You won't hear from me again.";
export const EMAIL_OPT_OUT_HINGLISH =
  "Agar aap nahi chahte ki main dobara likhun, to sirf REMOVE likh kar reply kar dijiye, usi din aapka address list se hata dunga, phir kabhi mail nahi aayega.";

export function emailOptOutLine(language: TemplateLanguage): string {
  return language === "en" ? EMAIL_OPT_OUT_EN : EMAIL_OPT_OUT_HINGLISH;
}

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
}

/**
 * Things Mehdi can actually check on a prospect's site in two minutes. Pick one
 * only after checking it: SEQUENCE-INDIA-SCHOOLS.md says a wrong observation
 * needs a correction e-mail, and the sequence stops.
 */
export const OBSERVATIONS: Observation[] = [
  {
    id: "no_website",
    label: "No website found",
    en: "When I searched for your name, I could not find a website for you, only map and directory listings.",
    hinglish: "Google pe aapka naam search kiya to koi website nahi mili, sirf map aur directory listings.",
  },
  {
    id: "not_mobile",
    label: "Does not open well on a phone",
    en: "Your site does not open well on a phone: the text is small and the pages need sideways scrolling.",
    hinglish: "Aapki site phone pe theek se nahi khulti, text chhota hai aur page side mein scroll karna padta hai.",
  },
  {
    id: "no_fees_admission",
    label: "Fees and admission details missing",
    en: "Fees and admission details are not on the site, so a parent has to call the office to find out.",
    hinglish: "Site pe fees aur admission ki details nahi hain, to parent ko office phone karke poochna padta hai.",
  },
  {
    id: "form_broken",
    label: "Contact form did not send",
    en: "I filled in the contact form on your site and it did not send, so enquiries may be getting lost.",
    hinglish: "Maine aapki site ka contact form bhar ke dekha, wo send nahi hua, to enquiries shayad kho rahi hain.",
  },
  {
    id: "http_only",
    label: "Site is http only",
    en: "Your site opens on http only, so Chrome marks it as \"Not secure\" next to the address.",
    hinglish: "Aapki site sirf http pe khulti hai, isliye Chrome address ke saath \"Not secure\" dikhata hai.",
  },
  {
    id: "slow",
    label: "Site loads slowly",
    en: "When I opened your site on my phone, it took a long time to load.",
    hinglish: "Maine aapki site phone pe kholi to khulne mein kaafi der lagi.",
  },
];

export function getObservation(id: string | undefined | null): Observation | undefined {
  return id ? OBSERVATIONS.find((o) => o.id === id) : undefined;
}

/**
 * The sentence for a lead's observation in a template's language. A lead may
 * store an OBSERVATIONS id or its own free-text sentence; free text is used as typed.
 */
export function observationText(observation: string | undefined, language: TemplateLanguage): string {
  const raw = (observation ?? "").trim();
  if (!raw) return "";
  const known = getObservation(raw) ?? OBSERVATIONS.find((o) => o.en === raw || o.hinglish === raw);
  if (!known) return raw;
  return language === "en" ? known.en : known.hinglish;
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

function greetingFallback(template: MessageTemplate, lead: Pick<OutreachLead, "kind">): string {
  if (template.language === "hi") return "सर";
  if (template.channel === "email" && template.language === "en") {
    return lead.kind === "school" ? "Principal" : "Sir";
  }
  return "Sir";
}

/**
 * Fill a template for one lead. Every known merge field is replaced; a missing
 * value becomes a safe fallback (greeting) or empty text, and is reported in
 * `warnings` so the UI can say what to fill in. E-mail gets the signature and
 * the REMOVE opt-out line (EMAIL-RULES.md section 8) appended, always, once.
 */
export function render(
  template: MessageTemplate,
  lead: Partial<OutreachLead> & Pick<OutreachLead, "instituteName">,
  ctx: RenderContext = {},
): RenderResult {
  const warnings: string[] = [];
  const used = new Set<string>();
  for (const m of `${template.subject ?? ""}\n${template.body}`.matchAll(/\{(\w+)\}/g)) used.add(m[1]);

  const contact = (lead.contactName ?? "").trim();
  const values: Record<string, string> = {
    contactName: contact || greetingFallback(template, { kind: lead.kind ?? "other" }),
    instituteName: (lead.instituteName ?? "").trim(),
    city: (lead.city ?? "").trim(),
    demoLink: (ctx.demoLink ?? demoLinkFor(lead.demoSlug)).trim(),
    pitchLink: (ctx.pitchLink ?? pitchLinkFor(lead.pitchSlug)).trim(),
    observation: observationText(ctx.observation ?? lead.observation, template.language),
    senderName: (ctx.senderName ?? "").trim() || DEFAULT_SENDER_NAME,
    senderPhone: (ctx.senderPhone ?? "").trim() || DEFAULT_SENDER_PHONE,
  };

  if (used.has("contactName") && !contact) {
    warnings.push(`No contact name: the greeting says "${values.contactName}".`);
  }
  if (used.has("instituteName") && !values.instituteName) warnings.push("Institute name is empty.");
  if (used.has("city") && !values.city) warnings.push("City is empty.");
  if (used.has("demoLink") && !values.demoLink) warnings.push("This message needs a demo link: pick or create a demo first.");
  if (used.has("pitchLink") && !values.pitchLink) warnings.push("This message needs a pitch page link: set the pitch slug first.");
  if (used.has("observation") && !values.observation) {
    warnings.push("This message needs an observation you checked yourself: pick one or type it.");
  }
  const obsRaw = (ctx.observation ?? lead.observation ?? "").trim();
  const obsKnown = getObservation(obsRaw) ?? OBSERVATIONS.find((o) => o.en === obsRaw || o.hinglish === obsRaw);
  if (used.has("observation") && obsKnown?.id === "no_website" && template.pitch === "fix_website") {
    warnings.push("The observation says they have no website, but this message is about fixing their website: pick a 'new website' message.");
  }
  if (!template.allowsLink && [...used].some((f) => LINK_FIELDS.includes(f))) {
    warnings.push("This template must not carry a link, but it uses a link field.");
  }

  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? values[key] : whole));

  const subject = template.subject !== undefined ? tidy(fill(template.subject)) : undefined;
  let body = tidy(fill(template.body));

  if (template.channel === "email") {
    const signature = (ctx.signature ?? "").trim() || DEFAULT_SIGNATURE;
    const optOut = emailOptOutLine(template.language);
    if (!body.includes(signature)) body = `${body}\n\n${signature}`;
    if (!body.includes("REMOVE")) body = `${body}\n\n${optOut}`;
    if (template.stage === "proposal") warnings.push("Attach the proposal PDF in Gmail before pressing Send.");
  }

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

export interface GmailComposeInput {
  to: string;
  subject?: string;
  body?: string;
  /** The Google account to open (authuser), e.g. mehdi@gmail.com. Optional. */
  account?: string;
}

/**
 * Gmail compose, typed and ready, in the chosen Google account:
 * https://mail.google.com/mail/?authuser=<account>&view=cm&fs=1&to=...&su=...&body=...
 */
export function gmailComposeUrl({ to, subject = "", body = "", account }: GmailComposeInput): string {
  const q: string[] = [];
  const acc = (account ?? "").trim();
  if (acc) q.push(`authuser=${encodeURIComponent(acc)}`);
  q.push("view=cm", "fs=1");
  q.push(`to=${encodeURIComponent(to.trim())}`);
  q.push(`su=${encodeURIComponent(subject)}`);
  q.push(`body=${encodeURIComponent(body)}`);
  return `https://mail.google.com/mail/?${q.join("&")}`;
}

/** mailto: fallback for any mail app. */
export function mailtoUrl({ to, subject = "", body = "" }: Omit<GmailComposeInput, "account">): string {
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
  gmail?: string;
  mailto?: string;
  whatsapp?: string;
  whatsappWeb?: string;
}

/** Every link that can open this rendered message for this lead. */
export function sendLinks(
  lead: Pick<OutreachLead, "email" | "phone" | "whatsapp">,
  channel: TemplateChannel,
  rendered: Pick<RenderResult, "subject" | "body">,
  settings?: Pick<OutreachSettings, "senderGmail">,
): SendLinks {
  if (channel === "email") {
    const to = (lead.email ?? "").trim();
    if (!to) return {};
    return {
      gmail: gmailComposeUrl({ to, subject: rendered.subject, body: rendered.body, account: settings?.senderGmail }),
      mailto: mailtoUrl({ to, subject: rendered.subject, body: rendered.body }),
    };
  }
  const number = leadWhatsappNumber(lead);
  if (!number) return {};
  return { whatsapp: whatsappUrl(number, rendered.body), whatsappWeb: whatsappWebUrl(number, rendered.body) };
}

/* ── Follow-up dates ─────────────────────────────────────────────────────── */

/**
 * Days until the next touch after sending a stage. FOLLOW-UP-LADDER.md runs
 * Day 0 → 2 (WhatsApp) → 5 (call) → 10 (email) → 21 (close the file) → 45;
 * PROPOSAL-FOLLOWUP.md chases a proposal on Day 3.
 */
export const FOLLOW_UP_DAYS: Record<TemplateStage, number> = {
  first: 2, // Day 0 → Day 2
  after_reply: 2, // the link went out: Day 0 → Day 2
  after_call: 2, // Day 0 (after the conversation) → Day 2
  follow_up_1: 3, // Day 2 → Day 5, the call
  follow_up_2: 11, // Day 10 → Day 21
  follow_up_3: 24, // Day 21 → Day 45, one useful thing, no ask
  proposal: 3, // PROPOSAL-FOLLOWUP.md Day 3
};

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;

/** India time parts of an instant, independent of the machine's time zone. */
export function istParts(at: Date): { day: number; minutes: number } {
  const t = new Date(at.getTime() + IST_OFFSET_MS);
  return { day: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** When the next touch is due after sending `stage` at `from`. A Sunday (India) moves to Monday. */
export function followUpDate(stage: TemplateStage, from: Date | string = new Date()): Date {
  const start = typeof from === "string" ? new Date(from) : from;
  let due = new Date(start.getTime() + (FOLLOW_UP_DAYS[stage] ?? 2) * DAY_MS);
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
}

function hhmm(s: string | undefined, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? "").trim());
  return m ? Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2])) : fallback;
}

/** True when India-time `minutes` falls inside [start, end), wrapping midnight. */
export function inQuietHours(now: Date, quietStart = "20:00", quietEnd = "09:00"): boolean {
  const { minutes } = istParts(now);
  const s = hhmm(quietStart, 20 * 60);
  const e = hhmm(quietEnd, 9 * 60);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

/**
 * What a message tells the lead is already made for them, even when it carries
 * no link: the first WhatsApp messages offer "the site we built" or "the page I
 * wrote", and follow-up 1 asks whether they want to see the site we made.
 */
export function promisedPage(template: Pick<MessageTemplate, "id" | "channel" | "stage" | "pitch">): "demo" | "pitch" | null {
  if (/_pitch_/.test(template.id)) return "pitch";
  if (template.channel !== "whatsapp") return null;
  if (template.stage === "first" && template.pitch !== "any") return "demo";
  if (/^wa_fu1_/.test(template.id)) return "demo";
  return null;
}

/**
 * Checks one send against the sales-kit rules before the compose window opens.
 * Blockers stop the send; warnings are shown and the sender decides.
 *
 * `sentTodayCount` is the number of WhatsApp first-contact messages already sent
 * today: the playbook's hard cap (10) is on cold first contacts, so reaching it
 * blocks a "first" WhatsApp message and only warns for a reply to a warm lead.
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
  const cap = settings?.whatsappDailyCap && settings.whatsappDailyCap > 0 ? settings.whatsappDailyCap : 10;

  // Who they are
  if (lead.status === "do_not_contact") blockers.push("This lead asked not to be contacted. Nothing may be sent.");
  if (lead.status === "won") warnings.push("This lead is already a client.");
  if (lead.status === "lost") warnings.push("This lead is marked lost.");

  // Right channel, reachable
  if (template.channel !== channel) blockers.push(`This is a ${template.channel} template, not ${channel}.`);
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((lead.email ?? "").trim())) {
    blockers.push("No valid e-mail address for this lead.");
  }
  if (channel === "whatsapp" && !leadWhatsappNumber(lead)) blockers.push("No valid phone or WhatsApp number for this lead.");
  // EMAIL-RULES.md section 2: cold mail from a free mailbox is filtered and builds no reputation.
  if (channel === "email" && /@(gmail|googlemail|yahoo|rediffmail|outlook|hotmail)\./i.test(settings?.senderGmail ?? "")) {
    warnings.push("Sending from a free mailbox: school filters trust it less. Keep daily volume low, and switch to a mailbox on your own domain when it is live.");
  }

  // Links (WHATSAPP-PLAYBOOK.md 2.1: none in a cold first message)
  if (channel === "whatsapp" && template.stage === "first" && (template.allowsLink || containsLink(text))) {
    blockers.push("A first WhatsApp message to a stranger must not carry a link. Send the link after they reply.");
  } else if (!template.allowsLink && containsLink(text)) {
    blockers.push("This template is marked no-link but contains a link.");
  }
  if (/\{demoLink\}/.test(text) && !demoLinkFor(lead.demoSlug)) blockers.push("Pick or create a demo first: this message carries the demo link.");
  if (/\{pitchLink\}/.test(text) && !pitchLinkFor(lead.pitchSlug)) blockers.push("Set the pitch page first: this message carries its link.");
  // A no-link message that SAYS the site or page is ready must be true (honesty rule).
  const promises = promisedPage(template);
  if (promises === "demo" && !/\{demoLink\}/.test(text) && !demoLinkFor(lead.demoSlug)) {
    blockers.push("This message says a demo site is ready, but this lead has no demo yet. Pick or create one first.");
  }
  if (promises === "pitch" && !/\{pitchLink\}/.test(text) && !pitchLinkFor(lead.pitchSlug)) {
    blockers.push("This message says a page was written for them, but this lead has no pitch page yet. Set one first.");
  }
  if (/\{observation\}/.test(text) && !(lead.observation ?? "").trim()) {
    blockers.push("This message needs a real observation about their site. Pick one or type it, or call instead.");
  }

  // Volume (WHATSAPP-PLAYBOOK.md 1.2: hard cap of 10 cold first contacts a day)
  if (channel === "whatsapp" && sentTodayCount >= cap) {
    if (template.stage === "first") blockers.push(`Daily WhatsApp cap reached (${sentTodayCount} of ${cap} first messages today). Call or e-mail instead.`);
    else warnings.push(`${sentTodayCount} first WhatsApp messages already sent today (cap ${cap}).`);
  }

  // Timing (never before 09:00 or after 21:00; no first contact on Sunday)
  if (inQuietHours(now, settings?.quietStart, settings?.quietEnd)) {
    warnings.push(`It is quiet hours in India (${settings?.quietStart || "20:00"} to ${settings?.quietEnd || "09:00"}). Better to send in the morning.`);
  }
  const { day } = istParts(now);
  if (day === 0) warnings.push("It is Sunday in India: no first contact or follow-up on a Sunday.");
  else if (day === 6 && channel === "email") warnings.push("It is Saturday: school and coaching offices read e-mail on working days.");

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
  }
  if (lead.kind && lead.kind !== "other" && template.kind !== "any" && template.kind !== lead.kind) {
    warnings.push(`This template is written for a ${template.kind}, and this lead is a ${lead.kind}.`);
  }

  return { ok: blockers.length === 0, blockers, warnings };
}
