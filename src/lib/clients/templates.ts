/**
 * THE CLIENT MESSAGES (client-process-spec 7.3 to 7.5): every message the
 * client file offers, from the proposal to the exit, in Hinglish and English,
 * on WhatsApp and by e-mail.
 *
 * WHERE THE WORDS COME FROM. Kind S is copied word for word from its source
 * (`src` names the file and where the text starts and ends; the process test
 * compares them) with the token mapping of 7.2: [[CLIENT_CONTACT_NAME]] ji
 * becomes {addressAs}, Hello [[CLIENT_CONTACT_NAME]] becomes Hello
 * {greeting}, the project's facts become merge fields, any other token or
 * "______" a [blank] named in plain words, and Markdown is dropped. Kind E is
 * sourced with an edit (E1 to E24, spec 7.4, each named in `edits`). Kind N is
 * new wording (spec 7.5). E and N show "New wording" in the CRM until Mehdi
 * ticks them approved in Settings > Client process.
 *
 * A source that is not a whole e-mail (a sentence, a speech) is framed with a
 * plain subject, "Hello {greeting}" and Mehdi's name (`frameHead`,
 * `frameTail`): the frame carries no fact. Example specifics in a source (a
 * page count, a gallery page) are blanks (`src.blanked`).
 *
 * TRUTH CONDITIONS (`needs`) block a send while untrue (compose.ts
 * checkClientSend); an override of a gate never unblocks them. Nothing here is
 * sent by the CRM: Send opens WhatsApp or the mail app with the text in it.
 *
 * src/lib/outreach/templates.ts is untouched: the two proposal texts taken from
 * it are read from it (OUTREACH_TEMPLATES), so they stay word for word.
 */
import { OUTREACH_TEMPLATES } from "@/lib/outreach/templates";
import type { DocKind, Language, Milestone, StageId } from "./types";

export type TextKind = "S" | "E" | "N";
export type Channel = "whatsapp" | "email";

/** The truth conditions a send checks (compose.ts NEEDS). */
export type NeedId =
  | "designed_done" | "proposal_email_first" | "in_india" | "doc_overdue" | "part_payment" | "paid_today" | "advance_credited"
  | "receipt_emailed" | "staging_url" | "review_link" | "qa_done" | "qa_accepted" | "golive_morning" | "m2_email_first"
  | "stop_date_reached" | "paused" | "reminders_sent" | "verify_done" | "rollback" | "handover_truth" | "handover_doc_issued"
  | "handover_unsigned" | "handover_signed" | "week_since_live" | "no_s1s2" | "no_s1s2_7d" | "not_money_day" | "ask_3d_ago"
  | "quote_approved" | "removal_days" | "no_testimonials_yet" | "no_decline_90d" | "no_plan" | "issues_closed"
  | "access_removed" | "plan_paid" | "renewal_invoice_7d" | "renewal_paid" | "not_renewed_unpaid" | "can_move_down"
  | "partners_yes" | "rounds_used_2" | "round_2" | "approval_recorded" | "slip_client" | "slip_own" | "overdue_item"
  | "days_15" | "days_45" | "kickoff_held" | "cr_selected" | "issue_selected" | "absorbed_requests" | "logo_and_text_missing"
  | "winback_replied" | "work_to_date_invoice";

export interface Attach {
  /** A document of the project (or the client) that must be issued before the e-mail can go ("Issue the proforma first"). */
  doc?: DocKind;
  milestone?: Milestone;
  /** "about": the document the message is about (a ladder step, a receipt); else the latest issued of that kind. */
  which?: "about" | "latest";
  /** Attached by hand from the project folder: named in the "I attached" tick. */
  byHand?: string;
  /** Attached only when it exists (the quotation beside a designed proposal). */
  optional?: boolean;
}

export interface Alt {
  /**
   * school: a school or coaching client (E3, E11, E16); schoolOnly: a school (E3, Day 1); split: a split advance
   * (E15); fewerRounds: fewer than 2 rounds used (E14); quoteExpired: the quotation's validity date has passed
   * (E18); notHalf: the launch invoice is not the plain 50% balance, or part of it is already paid (E19);
   * noIssues / oneIssue: nothing, or one thing, was reported in the support window (E20); proforma: the payment
   * the message is about went against a proforma, not an invoice (E23).
   */
  when: "school" | "schoolOnly" | "split" | "fewerRounds" | "quoteExpired" | "notHalf" | "noIssues" | "oneIssue" | "proforma";
  body: string;
}

export interface ClientTemplate {
  id: string;
  stage: StageId | "any" | "renewal" | "exit";
  channel: Channel;
  language: Language;
  textKind: TextKind;
  edits?: string[];
  source: string;
  /** Where the sourced text is (file under E:\myagency, its first and last words), for the word-for-word check. */
  src?: { file: string; from: string; to: string; blanked?: string[] };
  label: string;
  subject?: string;
  frameHead?: string;
  body: string;
  frameTail?: string;
  alt?: Alt[];
  needs?: NeedId[];
  attaches?: Attach[];
  /** Items it completes when sent. */
  ticks?: string[];
  /** A formal notice: also by registered post, speed post or courier (cl. 16.1). */
  formal?: boolean;
  /** Taken from src/lib/outreach/templates.ts: ends as the lead page renders it, "Regards," and the signature. */
  engineEnding?: boolean;
  /** States an amount due or a payment term. */
  money?: boolean;
  /** Asks for a testimonial, a review, a referral or a care plan. */
  asks?: boolean;
  /** A payment ladder step. */
  ladder?: "A1" | "A2" | "A3" | "M1" | "M1E" | "M2" | "M2W" | "PAUSE" | "M3";
  note?: string;
}

const outreach = (id: string) => {
  const t = OUTREACH_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`templates.ts has no ${id}`);
  return { subject: t.subject?.replace(/\{instituteName\}/g, "{orgName}"), body: t.body.replace(/\{instituteName\}/g, "{orgName}") };
};

const SOP01 = "10-sops/SOP-01-Lead-to-Client.md";
const SOP02 = "10-sops/SOP-02-Project-Kickoff.md";
const SOP03 = "10-sops/SOP-03-Design-Phase.md";
const SOP04 = "10-sops/SOP-04-Development-Phase.md";
const SOP05 = "10-sops/SOP-05-QA-Checklist.md";
const SOP06 = "10-sops/SOP-06-Launch-and-Handover.md";
const SOP07 = "10-sops/SOP-07-Post-Launch-Support.md";
const SOP08 = "10-sops/SOP-08-Client-Communication.md";
const SOP09 = "10-sops/SOP-09-Difficult-Situations.md";
const PFU = "04-sales-kit/PROPOSAL-FOLLOWUP.md";
const PAY = "04-sales-kit/PAYMENT-FOLLOWUP.md";
const WAP = "04-sales-kit/messaging/WHATSAPP-PLAYBOOK.md";
const LSP = "04-sales-kit/LEAD-SOURCING-PLAYBOOK.md";
const KIT = "03-legal-docs/forms/Testimonial-Request-Kit.md";
const TRM = "03-legal-docs/forms/TESTIMONIAL-REQUEST-MESSAGES.md";
const AMC = "03-legal-docs/contracts/AMC-SALES-GUIDE.md";
const CRF = "03-legal-docs/contracts/Change-Request-Form.md";
const BILL = "03-legal-docs/billing/README-BILLING.md";
const PPB = "03-legal-docs/PROPOSAL-PLAYBOOK.md";

const SIGN = "Mehdi Alam · Ideovent Technologies";
const SIGN_PHONE = "Mehdi Alam · Ideovent Technologies · +91 77619 21786";

const p1 = outreach("em_proposal_any_en");
const p2 = outreach("em_proposal_any_hinglish");
const w1 = outreach("wa_proposal_hinglish");
const w2 = outreach("wa_proposal_en");
const c1 = outreach("wa_proposal_chase_hinglish");
const c2 = outreach("wa_proposal_chase_en");
const ce1 = outreach("em_proposal_chase_any_en");
const ce2 = outreach("em_proposal_chase_any_hinglish");

export const CLIENT_TEMPLATES: ClientTemplate[] = [
  /* ── Stage 1. Proposal and quotation ──────────────────────────────────── */
  {
    id: "cp_proposal_holding_em_en", stage: "proposal", channel: "email", language: "en", textKind: "S",
    source: "PROPOSAL-PLAYBOOK section 1.3", src: { file: PPB, from: "Thanks for the call. Your proposal reaches you by", to: "[day], [time]." },
    label: "Proposal: the holding line (when it cannot go within 24 hours)",
    subject: "{orgName}: your proposal", frameHead: "Hello {greeting}", frameTail: SIGN_PHONE,
    body: "Thanks for the call. Your proposal reaches you by [day], [time].",
    ticks: ["p_hold"],
  },
  {
    id: "cp_proposal_send_em_en", stage: "proposal", channel: "email", language: "en", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_TEXT.email (en)", label: "Proposal: the quotation by e-mail",
    subject: p1.subject, body: p1.body, engineEnding: true, attaches: [{ doc: "quotation", which: "latest" }], ticks: ["p_sent"], money: true,
  },
  {
    id: "cp_proposal_send_em_hi", stage: "proposal", channel: "email", language: "hinglish", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_TEXT.email (hinglish)", label: "Proposal: the quotation by e-mail",
    subject: p2.subject, body: p2.body, engineEnding: true, attaches: [{ doc: "quotation", which: "latest" }], ticks: ["p_sent"], money: true,
  },
  {
    id: "cp_proposal_send_wa_hi", stage: "proposal", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_TEXT.whatsapp (hinglish)", label: "Proposal: sent to your e-mail (WhatsApp)",
    body: w1.body, needs: ["proposal_email_first"], ticks: ["p_sent"],
  },
  {
    id: "cp_proposal_send_wa_en", stage: "proposal", channel: "whatsapp", language: "en", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_TEXT.whatsapp (en)", label: "Proposal: sent to your e-mail (WhatsApp)",
    body: w2.body, needs: ["proposal_email_first"], ticks: ["p_sent"],
  },
  {
    id: "cp_proposal_full_em_en", stage: "proposal", channel: "email", language: "en", textKind: "S",
    source: "PROPOSAL-FOLLOWUP Day 0, the e-mail", src: { file: PFU, from: "Attached is the proposal from our conversation on", to: "contact@ideovent.in · www.ideovent.in" },
    label: "Proposal: the designed proposal by e-mail (Day 0)",
    subject: "Proposal for {orgName}, {proposalNo}",
    body: [
      "Hello {greeting},",
      "Attached is the proposal from our conversation on {callDate}.",
      "Page 2 is my understanding of what you actually said you needed. Please read that page first. If it is wrong, everything after it is wrong too, and I would rather fix it now than argue about scope in month three.",
      "One question when you have read it: does page 2 match what you meant?",
      "Pricing in the document holds until {validUntil}.",
      "Mehdi Alam\nIdeovent Technologies\nSaket, New Delhi · +91 77619 21786 · contact@ideovent.in · www.ideovent.in",
    ].join("\n\n"),
    needs: ["designed_done"], attaches: [{ byHand: "the designed proposal PDF" }, { doc: "quotation", which: "latest", optional: true }], ticks: ["p_sent"], money: true,
  },
  {
    id: "cp_proposal_full_wa_hi", stage: "proposal", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E2"],
    source: "PROPOSAL-FOLLOWUP Day 0, the WhatsApp", src: { file: PFU, from: "proposal email pe bhej diya hai", to: "baaki sab uspe khada hai." },
    label: "Proposal: the designed proposal, WhatsApp the same minute (Day 0)",
    body: "{addressAs}, proposal email pe bhej diya hai, {proposalNo}. Page 2 pehle padh lijiyega, usme maine likha hai ki maine aapki baat kya samjhi. Agar wo theek hai to baaki sab uspe khada hai.",
    needs: ["designed_done"], ticks: ["p_sent"],
  },
  {
    id: "cp_proposal_d1_wa_hi", stage: "proposal", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E2", "E3"],
    source: "PROPOSAL-FOLLOWUP Day 1", src: { file: PFU, from: "sirf confirm karne ke liye: proposal mil gaya tha na?", to: "WhatsApp pe bhi bhej deta hoon." },
    label: "Proposal day 1: did it arrive",
    body: "{addressAs}, sirf confirm karne ke liye: proposal mil gaya tha na? Email mein PDF attach tha, {proposalNo}.\n\nKabhi kabhi email mein attachment block ho jata hai, isliye poochh raha hoon. Agar nahi khula to WhatsApp pe bhi bhej deta hoon.",
    // E3: "school ke email" only to a school (a coaching centre's e-mail is not a school's).
    alt: [{ when: "schoolOnly", body: "{addressAs}, sirf confirm karne ke liye: proposal mil gaya tha na? Email mein PDF attach tha, {proposalNo}.\n\nKabhi kabhi school ke email mein attachment block ho jata hai, isliye poochh raha hoon. Agar nahi khula to WhatsApp pe bhi bhej deta hoon." }],
    ticks: ["p_d1"],
  },
  {
    id: "cp_proposal_d3_wa_hi", stage: "proposal", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E2"],
    source: "PROPOSAL-FOLLOWUP Day 3", src: { file: PFU, from: "ek cheez poochhni thi: page 2 padha aapne?", to: "bees minute padhne se behtar rahega." },
    label: "Proposal day 3: did page 2 land",
    body: "{addressAs}, ek cheez poochhni thi: page 2 padha aapne? Usme maine likha hai ki aapki zarurat maine kya samjhi.\n\nAgar usme kuch galat ya kam hai to abhi bata dijiye, main theek kar ke dobara bhej dunga. Poore document ka matlab wahi page decide karta hai.\n\nAur agar teen options wale page pe confusion hai, to das minute call pe main teenon ka fark bata deta hoon, bees minute padhne se behtar rahega.",
    needs: ["designed_done"], ticks: ["p_d3"],
  },
  {
    id: "cp_proposal_d3q_wa_hi", stage: "proposal", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_CHASE (hinglish)", label: "Proposal day 3: the start-date chase", body: c1.body, ticks: ["p_d3"],
  },
  {
    id: "cp_proposal_d3q_wa_en", stage: "proposal", channel: "whatsapp", language: "en", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_CHASE (en)", label: "Proposal day 3: the start-date chase", body: c2.body, ticks: ["p_d3"],
  },
  {
    id: "cp_proposal_d3q_em_hi", stage: "proposal", channel: "email", language: "hinglish", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_CHASE (hinglish), as a reply", label: "Proposal day 3: the start-date chase (reply to the proposal e-mail)",
    subject: ce2.subject, body: ce2.body, engineEnding: true, ticks: ["p_d3"], note: "Send it as a reply to your proposal e-mail: open that e-mail in your mail app and press Reply.",
  },
  {
    id: "cp_proposal_d3q_em_en", stage: "proposal", channel: "email", language: "en", textKind: "S",
    source: "src/lib/outreach/templates.ts PROPOSAL_CHASE (en), as a reply", label: "Proposal day 3: the start-date chase (reply to the proposal e-mail)",
    subject: ce1.subject, body: ce1.body, engineEnding: true, ticks: ["p_d3"], note: "Send it as a reply to your proposal e-mail: open that e-mail in your mail app and press Reply.",
  },
  {
    id: "cp_proposal_d5_wa_hi", stage: "proposal", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E2"],
    source: "PROPOSAL-FOLLOWUP Day 5, after an unanswered call", src: { file: PFU, from: "call kiya tha. Jab free hon tab ek line likh dijiye", to: "Koi urgent baat nahi hai." },
    label: "Proposal day 5: after an unanswered call",
    body: "{addressAs}, call kiya tha. Jab free hon tab ek line likh dijiye, main tab kar lunga. Koi urgent baat nahi hai.",
    ticks: ["p_d5"],
  },
  {
    id: "cp_proposal_d7_em_en", stage: "proposal", channel: "email", language: "en", textKind: "E", edits: ["E3"],
    source: "PROPOSAL-FOLLOWUP Day 7", src: { file: PFU, from: "No chase in this email.", to: "+91 77619 21786 · contact@ideovent.in" },
    label: "Proposal day 7: one useful thing, and the PDF again",
    subject: "One thing I noticed on {siteUrl}, plus the proposal again",
    body: [
      "Hello {greeting},",
      "No chase in this email. One useful thing and then the document again, so it is not buried.",
      "[one thing you noticed], screenshot attached. It is fixable whether or not you work with me, and it is worth fixing either way.",
      "Proposal {proposalNo} re-attached. The section worth five minutes is page 2; the rest follows from it.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    alt: [{ when: "school", body: [
      "Hello {greeting},",
      "No chase in this email. One useful thing and then the document again, so it is not buried.",
      "[one thing you noticed], screenshot attached. It is fixable whether or not you work with me, and it is worth fixing before the next admission cycle either way.",
      "Proposal {proposalNo} re-attached. The section worth five minutes is page 2; the rest follows from it.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n") }],
    attaches: [{ byHand: "the proposal PDF and the screenshot" }], ticks: ["p_d7"],
  },
  {
    id: "cp_proposal_d14_em_en", stage: "proposal", channel: "email", language: "en", textKind: "S",
    source: "PROPOSAL-FOLLOWUP Day 14 (E18 once the quotation has expired)", src: { file: PFU, from: "Two weeks since I sent proposal", to: "Saket, New Delhi · +91 77619 21786 · contact@ideovent.in" },
    label: "Proposal day 14: where has this landed",
    subject: "Where has this landed at your end?",
    body: [
      "Hello {greeting},",
      "Two weeks since I sent proposal {proposalNo}, so a direct question rather than another nudge.",
      "Where has it landed? One of these is almost always true, and any of them is fine:",
      "1. It is moving, and it is waiting on someone else's sign-off, in which case, whose, and what would help them?\n2. It is stuck on something specific: price, scope, timing, or something in the document that did not read right.\n3. It is not happening this year. Completely acceptable, and more useful to me than silence.",
      "One line on which of the three, and I will do the right thing from there.",
      "On dates: the pricing in the document holds until {validUntil}. After that I would re-quote, which is an administrative nuisance rather than anything dramatic, but I would rather we settled it before then.",
      "Mehdi Alam\nIdeovent Technologies · Saket, New Delhi · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    // E18: sent after the validity date (the quotation went out days before the proposal), "holds until" a past date is untrue.
    alt: [{ when: "quoteExpired", body: [
      "Hello {greeting},",
      "Two weeks since I sent proposal {proposalNo}, so a direct question rather than another nudge.",
      "Where has it landed? One of these is almost always true, and any of them is fine:",
      "1. It is moving, and it is waiting on someone else's sign-off, in which case, whose, and what would help them?\n2. It is stuck on something specific: price, scope, timing, or something in the document that did not read right.\n3. It is not happening this year. Completely acceptable, and more useful to me than silence.",
      "One line on which of the three, and I will do the right thing from there.",
      "On dates: the pricing in the document held until {validUntil}, so from here I would re-quote, which is an administrative nuisance rather than anything dramatic.",
      "Mehdi Alam\nIdeovent Technologies · Saket, New Delhi · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n") }],
    ticks: ["p_d14"],
  },
  {
    id: "cp_proposal_d21_em_en", stage: "proposal", channel: "email", language: "en", textKind: "S",
    source: "PROPOSAL-FOLLOWUP Day 21", src: { file: PFU, from: "I do not want to keep landing in your inbox", to: "Silence is the only one I cannot do anything with." },
    label: "Proposal day 21: should I close this",
    subject: "Should I close this?",
    body: [
      "Hello {greeting},",
      "I do not want to keep landing in your inbox, so this is my last note on the proposal itself.",
      "If the timing is not right, that is completely fine. Tell me and I will close the file and stop chasing. If it is still live but stuck on something, tell me what, and I will help if I can.",
      "Either answer is a good answer for me. Silence is the only one I cannot do anything with.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    ticks: ["p_d21"],
  },
  {
    id: "cp_proposal_d21_wa_hi", stage: "proposal", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "WHATSAPP-PLAYBOOK section 3.6", src: { file: WAP, from: "ji, ye is baare mein mera aakhri message hai", to: "Dono jawab mere liye theek hain. Shukriya." },
    label: "Proposal day 21: close the loop (WhatsApp)",
    body: "{addressAs}, ye is baare mein mera aakhri message hai, main baar baar aapke phone pe nahi aana chahta.\n\nAgar abhi time theek nahi hai to bilkul koi baat nahi. Ek line likh dijiye main file band kar deta hoon.\n\nAur agar baat chal rahi hai par kahin atki hui hai, to bata dijiye kahan, ho sakta hai main help kar sakun.\n\nDono jawab mere liye theek hain. Shukriya.",
    ticks: ["p_d21"],
  },
  {
    id: "cp_proposal_d30_em_en", stage: "proposal", channel: "email", language: "en", textKind: "E", edits: ["E3"],
    source: "PROPOSAL-FOLLOWUP Day 30", src: { file: PFU, from: "I am closing the file on this one.", to: "contact@ideovent.in · www.ideovent.in" },
    label: "Proposal day 30: closing the file",
    subject: "Closing the file on {proposalNo}, and thank you",
    body: [
      "Hello {greeting},",
      "I am closing the file on this one. No hard feelings at all, and no further follow-ups from me on it.",
      "Thank you for the time you gave me on {callDate}. The conversation was genuinely useful to me, and the proposal is yours to keep whether or not you use it.",
      "Two things before I stop writing:",
      "If it comes back to life at any point, message me directly and we will pick it up from where it stopped. Nothing needs repeating.",
      "And if you are willing: what tipped it? Price, timing, scope, someone else, or simply too much else going on? One word is plenty. I ask everyone, I write the answers down, and it is how the next proposal gets better.",
      "Mehdi Alam\nIdeovent Technologies\nSaket, New Delhi · +91 77619 21786 · contact@ideovent.in · www.ideovent.in",
    ].join("\n\n"),
    alt: [{ when: "school", body: [
      "Hello {greeting},",
      "I am closing the file on this one. No hard feelings at all, and no further follow-ups from me on it.",
      "Thank you for the time you gave me on {callDate}. The conversation was genuinely useful to me, and the proposal is yours to keep whether or not you use it.",
      "Two things before I stop writing:",
      "If it comes back to life at any point (next session, next budget, or in the middle of an admission rush) message me directly and we will pick it up from where it stopped. Nothing needs repeating.",
      "And if you are willing: what tipped it? Price, timing, scope, someone else, or simply too much else going on? One word is plenty. I ask everyone, I write the answers down, and it is how the next proposal gets better.",
      "All the best for the {sessionYear} session.",
      "Mehdi Alam\nIdeovent Technologies\nSaket, New Delhi · +91 77619 21786 · contact@ideovent.in · www.ideovent.in",
    ].join("\n\n") }],
    ticks: ["p_d30"],
  },

  /* ── Stage 2. Agreement and advance ───────────────────────────────────── */
  {
    id: "cp_agreement_yes_wa_hi", stage: "agreement", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-01 stage 6", src: { file: SOP01, from: "Bahut accha, khushi hui.", to: "kickoff call ka time de dunga." },
    label: "The yes: agreement and SOW today, start the day the advance is credited",
    body: "Bahut accha, khushi hui. Main aaj hi agreement aur SOW bhej deta hoon, dono padh ke sign kar dijiyega, aur advance ka invoice saath mein hoga.\n\nAdvance credit hote hi main start kar deta hoon, aur usi din aapko kickoff call ka time de dunga.",
    ticks: ["a_yes"],
  },
  {
    id: "cp_agreement_yes_wa_en", stage: "agreement", channel: "whatsapp", language: "en", textKind: "N",
    source: "Spec 7.5 (English of SOP-01 stage 6)", label: "The yes: agreement and SOW today, start the day the advance is credited",
    body: "That is great news, thank you. I will send the agreement and the scope of work today. Please read both and sign them; the advance invoice comes with them.\n\nAs soon as the advance is credited I start, and the same day I will give you a time for the kickoff call.",
    ticks: ["a_yes"],
  },
  {
    id: "cp_agreement_billing_wa_hi", stage: "agreement", channel: "whatsapp", language: "hinglish", textKind: "N",
    source: "Spec 7.5 (Onboarding Form section A fields; SOP-01 \"aaj hi\")", label: "Billing details for the agreement and the advance invoice",
    body: "{addressAs}, agreement aur advance invoice banane ke liye ye details chahiye:\n• Registered naam, jo bank aur registration mein hai\n• Billing address, PIN code ke saath\n• GSTIN, agar hai\n• PAN, agar aap TDS kaatenge\n• PO number, agar aapke accounts ko chahiye\n\nAaj mil jaayein to main aaj hi sab bhej deta hoon.",
  },
  {
    id: "cp_agreement_billing_wa_en", stage: "agreement", channel: "whatsapp", language: "en", textKind: "N",
    source: "Spec 7.5", label: "Billing details for the agreement and the advance invoice",
    body: "{addressAs}, to prepare the agreement and the advance invoice I need:\n• Your registered name, as on your bank and registration records\n• The billing address, with the PIN code\n• Your GSTIN, if you have one\n• Your PAN, if you will deduct TDS\n• A PO number, if your accounts team needs one\n\nIf I have these today, I will send everything today.",
  },
  {
    id: "cp_agreement_paperwork_em_en", stage: "agreement", channel: "email", language: "en", textKind: "S",
    source: "SOP-01 stage 7, \"The paperwork email\" (E15 with a split advance)", src: { file: SOP01, from: "Attached are three documents", to: "Saket, New Delhi · +91 77619 21786" },
    label: "The paperwork e-mail: SOW, agreement, advance proforma",
    subject: "{orgName}, agreement, scope document and advance invoice",
    body: [
      "Hello {greeting}",
      "Attached are three documents:",
      "1. Statement of Work {sowRef}, exactly what will be built, page by page and feature by feature, and a list of what is not included. Please read section 5 particularly; it is there so that nothing is a surprise later.\n2. Service Agreement: the commercial and legal terms. The parts that matter most are Clause 5 (payment), Clause 6 (two revision rounds per design stage) and Clause 10 (the thirty-day defect warranty after go-live).\n3. Advance invoice {proformaNo} for Rs. {advanceAmount}, which is the 50% advance.",
      "If anything in the scope does not match what we discussed, tell me before you sign and I will change the document. It is much easier to change now than later.",
      "Sign both documents, send them back scanned or as photographs, and transfer the advance to the account on the invoice. Work starts the day the advance is credited, and I will send you a kickoff call time the same day.",
      "GST not applicable. Supplier is not registered under GST.",
      "Mehdi Alam · Ideovent Technologies · Saket, New Delhi · +91 77619 21786",
    ].join("\n\n"),
    alt: [{ when: "split", body: [
      "Hello {greeting}",
      "Attached are three documents:",
      "1. Statement of Work {sowRef}, exactly what will be built, page by page and feature by feature, and a list of what is not included. Please read section 5 particularly; it is there so that nothing is a surprise later.\n2. Service Agreement: the commercial and legal terms. The parts that matter most are Clause 5 (payment), Clause 6 (two revision rounds per design stage) and Clause 10 (the thirty-day defect warranty after go-live).\n3. Advance invoice {proformaNo} for Rs. {advanceAmount}, the first of two parts of the 50% advance; the second, Rs. {advanceBalance}, is due on {advanceBalanceDue}.",
      "If anything in the scope does not match what we discussed, tell me before you sign and I will change the document. It is much easier to change now than later.",
      "Sign both documents, send them back scanned or as photographs, and transfer the advance to the account on the invoice. Work starts the day the advance is credited, and I will send you a kickoff call time the same day.",
      "GST not applicable. Supplier is not registered under GST.",
      "Mehdi Alam · Ideovent Technologies · Saket, New Delhi · +91 77619 21786",
    ].join("\n\n") }],
    needs: ["in_india"], attaches: [{ byHand: "the Statement of Work and the Service Agreement" }, { doc: "proforma", milestone: "ADVANCE_50", which: "about" }],
    ticks: ["a_paperwork"], money: true,
  },
  {
    id: "cp_agreement_a1_wa_hi", stage: "agreement", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E2"],
    source: "PAYMENT-FOLLOWUP section 3, A1", src: { file: PAY, from: "advance invoice [[INVOICE_NO]] bheja tha", to: "dobara attach kar raha hoon." },
    label: "A1: the day after the advance falls due",
    body: "{addressAs}, advance invoice {proformaNo} bheja tha {projectName} ke liye. Rs. {amountDue}. Due date nikal gayi hai, credit abhi nahi dikha.\n\nHo sakta hai process mein ho. Ek baat confirm kar dijiye, kis date tak release ho jayega?\n\nAgar invoice mein kuch change chahiye (PO number, billing name, address) to aaj bata dijiye, main aaj hi dobara bhej dunga. Paperwork ki wajah se ruka ho to wo main theek kar sakta hoon.\n\nBank aur UPI details invoice mein hain, dobara attach kar raha hoon.",
    needs: ["doc_overdue", "in_india"], ladder: "A1", money: true,
    note: "WhatsApp cannot carry the PDF: use Share PDF on a phone, or send it with the e-mail that follows (README-BILLING Message 1).",
  },
  {
    id: "cp_invoice_m1_em_en", stage: "any", channel: "email", language: "en", textKind: "E", edits: ["E1"],
    source: "README-BILLING section 5, Message 1", src: { file: BILL, from: "hope you're well.", to: "Mehdi Alam · Ideovent Technologies · +91 77619 21786" },
    label: "Reminder 1 by e-mail: the day after any invoice falls due",
    subject: "Invoice {invoiceNo}, {projectName}",
    body: "Hi {greeting}, hope you're well.\n\nInvoice {invoiceNo} for {projectName}, Rs. {amountDue}, was due on {dueDate} and I haven't seen the credit yet. It may already be in process at your end, could you confirm the date it will be released?\n\nI've reattached the invoice with the bank and UPI details. If anything on it needs changing (a PO number, a different billing address, a correction) tell me and I'll reissue it today.\n\nThanks\nMehdi Alam · Ideovent Technologies · +91 77619 21786",
    needs: ["doc_overdue", "in_india"], attaches: [{ which: "about" }], ladder: "M1E", money: true,
    note: "The +1 step of every invoice ladder: the advance proforma, the launch invoice, a change request proforma, a care plan invoice. Send one set or the other, never both (PAYMENT-FOLLOWUP section 4).",
  },
  {
    id: "cp_agreement_a2_em_en", stage: "agreement", channel: "email", language: "en", textKind: "S",
    source: "PAYMENT-FOLLOWUP section 3, A2", src: { file: PAY, from: "The advance invoice [[INVOICE_NO]] for Rs.", to: "Saket, New Delhi · +91 77619 21786 · contact@ideovent.in" },
    label: "A2: five days later, it names the slot",
    subject: "{projectName}, holding your start date until {holdUntil}",
    body: [
      "Hello {greeting}",
      "The advance invoice {proformaNo} for Rs. {advanceAmount} was due on {dueDate} and is still showing as unpaid at my end.",
      "Two things you should know, neither of them a complaint:",
      "Your delivery date has not started counting. Under our agreement the timeline runs from the date the advance is received, not from the date we signed. Every day this waits, the go-live date moves by a day. I would rather tell you that now than explain it in month two.",
      "I am holding the build slot until {holdUntil}. After that I will have to give it to whoever is ready to start, and the next opening is [next opening date]. That is a scheduling fact, not pressure.",
      "If something at your end is genuinely stuck (approval pending, cheque cycle, a change needed on the invoice), tell me what it is and I will work around it. I have held slots before for clients who told me what was happening. I cannot hold one for silence.",
      "Mehdi Alam\nIdeovent Technologies\nSaket, New Delhi · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    needs: ["doc_overdue", "in_india"], ladder: "A2", money: true,
  },
  {
    id: "cp_agreement_a3_em_en", stage: "agreement", channel: "email", language: "en", textKind: "S",
    source: "PAYMENT-FOLLOWUP section 3, A3 (E18 once the quotation has expired)", src: { file: PAY, from: "The advance for [[PROJECT_NAME]] is now", to: "tell me today and I will keep the slot." },
    label: "A3: ten days after due, the clean exit",
    subject: "Should I release the slot for {projectName}?",
    body: [
      "Hello {greeting}",
      "The advance for {projectName} is now {daysOverdue} days past due and I have not been able to reach you on it.",
      "I am going to assume the timing changed at your end, which happens, and I would rather assume that than keep sending reminders.",
      "So: I am releasing the build slot. Nothing is lost: the proposal, the scope and the agreement all stay valid and on file. When you are ready, one message from you and we restart, with a new start date and the same scope. The price holds until {validUntil}; after that I would re-quote, which is administrative rather than dramatic.",
      "If I have misread this and the payment is genuinely in process, tell me today and I will keep the slot.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    // E18: A3 goes 10 days after the proforma's due date, which is usually after the quotation's 15 days: never "holds until" a past date.
    alt: [{ when: "quoteExpired", body: [
      "Hello {greeting}",
      "The advance for {projectName} is now {daysOverdue} days past due and I have not been able to reach you on it.",
      "I am going to assume the timing changed at your end, which happens, and I would rather assume that than keep sending reminders.",
      "So: I am releasing the build slot. Nothing is lost: the proposal, the scope and the agreement all stay valid and on file. When you are ready, one message from you and we restart, with a new start date and the same scope. The price held until {validUntil}; from here I would re-quote, which is administrative rather than dramatic.",
      "If I have misread this and the payment is genuinely in process, tell me today and I will keep the slot.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n") }],
    needs: ["doc_overdue", "in_india"], ladder: "A3", money: true,
  },
  {
    id: "cp_payment_part_wa_en", stage: "any", channel: "whatsapp", language: "en", textKind: "E", edits: ["E23"],
    source: "PAYMENT-FOLLOWUP section 5, the part-payment line (E23: a payment against a proforma says \"proforma invoice\")", src: { file: PAY, from: "received today against invoice", to: "Receipt attached." },
    label: "A part payment: what it is against, and the balance",
    body: "Rs. {amountReceived} received today against invoice {docNo}, balance Rs. {balanceAmount}. Receipt attached.",
    // E23: the advance (or a change request's advance) is asked for on a proforma invoice (IDV/PI/...), which the
    // client was told is "not a tax invoice": the line names the document the client holds.
    alt: [{ when: "proforma", body: "Rs. {amountReceived} received today against proforma invoice {docNo}, balance Rs. {balanceAmount}. Receipt attached." }],
    needs: ["part_payment", "paid_today", "in_india"], money: true,
    note: "WhatsApp cannot carry the receipt: use Share PDF on a phone, or e-mail it with the receipt e-mail.",
  },
  {
    id: "cp_payment_receipt_em_en", stage: "any", channel: "email", language: "en", textKind: "N",
    source: "Spec 7.5 (Receipt template; SOP-02 section 1.2)", label: "The receipt by e-mail",
    subject: "{projectName}, receipt {receiptNo}",
    body: "Hello {greeting}\n\nThank you. Your payment of Rs. {amountReceived}, received on {paymentDate} (reference {utr}), is acknowledged in receipt {receiptNo}, attached.\n\n{balanceLine}\n\nGST not applicable. Supplier is not registered under GST.\n\nMehdi Alam · Ideovent Technologies · +91 77619 21786",
    // Only w_receipt ("Receipt e-mailed"): l_receipt is the launch receipt being issued, and the first receipt e-mail
    // (the advance's, stage 3) must not write its date and template on stage 9's item.
    needs: ["in_india"], attaches: [{ doc: "receipt", which: "about" }], ticks: ["w_receipt"], money: true,
  },

  /* ── Stage 3. Welcome and onboarding ─────────────────────────────────── */
  {
    id: "cp_welcome_wa_hi", stage: "welcome", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-02 section 1, the WhatsApp within the hour", src: { file: SOP02, from: "advance credit ho gaya hai, dhanyavaad.", to: "theek hai?" },
    label: "Welcome: the advance is credited, the project has started",
    body: "{addressAs}, advance credit ho gaya hai, dhanyavaad. Receipt email kar diya hai.\n\n{projectName} ab officially start hai. Aaj main project set up kar raha hoon: repository, staging site, aur sab documents.\n\nKal/parso ek kickoff call rakhte hain, 30-40 minute. Usme hum poora scope ek baar saath mein padh lenge, dates fix kar lenge, aur aapko jo cheezein bhejni hain unki list de dunga. {kickoffDate} ko {kickoffTime} theek hai?",
    needs: ["advance_credited", "receipt_emailed"], ticks: ["w_welcome"],
  },
  {
    id: "cp_welcome_wa_en", stage: "welcome", channel: "whatsapp", language: "en", textKind: "N",
    source: "Spec 7.5 (English of SOP-02 section 1)", label: "Welcome: the advance is credited, the project has started",
    body: "{addressAs}, the advance has been credited, thank you. I have e-mailed the receipt.\n\n{projectName} has now officially started. Today I am setting up the project: the repository, the staging site and all the documents.\n\nLet us have a kickoff call in the next day or two, 30 to 40 minutes. We will read the whole scope together once, fix the dates, and I will give you the list of what you need to send. Does {kickoffDate} at {kickoffTime} suit you?",
    needs: ["advance_credited", "receipt_emailed"], ticks: ["w_welcome"],
  },
  {
    id: "cp_welcome_docs_em_en", stage: "welcome", channel: "email", language: "en", textKind: "E", edits: ["E4"],
    source: "SOP-02 section 3, \"The collection email\"", src: { file: SOP02, from: "The project is set up at my end.", to: "Mehdi Alam · Ideovent Technologies · +91 77619 21786" },
    label: "The four documents: welcome pack, onboarding form, content checklist, blank change request form",
    subject: "{projectName}, four documents, and our kickoff call on {kickoffDate}",
    body: [
      "Hello {greeting}",
      "The project is set up at my end. Before our call, here are four documents.",
      "1. Welcome pack. What happens next, what we need from you, and how we work together.",
      "2. Onboarding form. Details I need once. Your exact legal name for invoices, who does what on your side, your domain and hosting details. Fifteen minutes to fill.",
      "3. Content collection checklist. This is the important one. It lists every page in the scope and exactly what text and images are needed for each. Pages with no text cannot be finished, so this list is what decides whether we hit {goLiveDate}.",
      "4. A blank change request form. Nothing is wrong. I send this at the start of every project so you know what it looks like. If you want something added later that is not in the scope document, this is how it gets priced and dated. It takes me a few hours and you decide with the number in front of you.",
      "Do not try to complete all of the content before our call. We will go through it together and set realistic dates.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n"),
    attaches: [{ doc: "welcome", which: "latest" }, { byHand: "the onboarding form, the content collection checklist and a blank change request form" }],
    ticks: ["w_docs"],
  },

  /* ── Stage 4 and any stage: kickoff, approvals, waiting, dates, access ─ */
  {
    id: "cp_kickoff_summary_em_en", stage: "kickoff", channel: "email", language: "en", textKind: "S",
    source: "SOP-02 section 5, the kickoff summary", src: { file: SOP02, from: "Thank you for the call. Here is what we agreed", to: "Saket, New Delhi · +91 77619 21786 · contact@ideovent.in" },
    label: "What we agreed today (the kickoff summary)",
    subject: "{projectName}, what we agreed today",
    body: [
      "Hello {greeting}",
      "Thank you for the call. Here is what we agreed, so that we both have the same page to look at.",
      "Project: {projectName}\nScope document: Statement of Work {sowRef}\nYour point of contact: {pointOfContact}\nIf they are unreachable for 3 working days: {escalationContact}\nOur channel: {commsChannel}, approvals by email to contact@ideovent.in\nWeekly update: Every {weeklyUpdateDay}, from me, whether or not there is news\nContent cut-off: {contentCutoff}\nDevelopment starts: {devStartDate}\nGo-live target: {goLiveDate}\nAdvance received: Rs. {advanceReceived} on {advanceDate}, reference {utr}",
      "What I need from you, and by when:",
      "1. Onboarding form completed, by [form by]\n2. Logo in vector form (.ai, .svg, .eps or .pdf), by [logo by]\n3. Page text for all pages in the checklist, by {contentCutoff}\n4. Images, original files, 1600px or wider, by [images by]\n5. Hosting and registrar access, by [access by]",
      "Three things we said out loud on the call, written down so neither of us has to remember them:",
      "- Two rounds of revisions are included at each design stage. One consolidated list per round.\n- Defects are fixed free of charge for thirty days after go-live.\n- If an item on the list above is late, the dates after it move day for day. That is arithmetic, not a penalty, and I will tell you on the day it happens rather than at the end.",
      "If anything above is wrong, tell me today. If it is all correct, just reply \"confirmed\". That is all I need.",
      "Mehdi Alam · Ideovent Technologies · Saket, New Delhi · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    needs: ["kickoff_held"], ticks: ["k_summary"],
  },
  {
    id: "cp_confirm_convert_wa_hi", stage: "any", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-08 section 3 (an approval on WhatsApp or a call, converted to e-mail)", src: { file: SOP08, from: "Perfect, thank you. Main record ke liye ek line email pe bhej raha hoon", to: "mail mein likha hoga." },
    label: "An approval on WhatsApp or a call: \"let me put it in an e-mail\"",
    body: "Perfect, thank you. Main record ke liye ek line email pe bhej raha hoon, bas 'confirmed' reply kar dijiyega.\n\nYeh dono ke liye hai. Aaj se chaar mahine baad kisi ko yaad nahi rakhna padega ki kya decide hua tha, mail mein likha hoga.",
  },
  {
    id: "cp_content_missing_wa_hi", stage: "content", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-03 step 0, when something is missing", src: { file: SOP03, from: "design shuru karne ke liye do cheezein ruki hui hain", to: "baad mein nahi." },
    label: "Design is waiting on the logo and the homepage text",
    body: "{addressAs}, design shuru karne ke liye do cheezein ruki hui hain, logo vector format mein (.ai / .svg / .pdf), aur homepage ka final text.\n\nJis din yeh dono mil jaate hain, design usi din se chalu. Jab tak nahi milte, {goLiveDate} waali date utne din aage khisak jaati hai. Clause 4.3 mein yahi likha hai, aur main aapko aaj bata raha hoon, baad mein nahi.",
    needs: ["logo_and_text_missing"],
  },
  {
    id: "cp_chase_d3_wa_hi", stage: "any", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-09 section 3, Day 3", src: { file: SOP09, from: "ka intezaar kar raha hoon", to: "pe kaam kar raha hoon.", blanked: ["______"] },
    label: "Waiting on the client, day 3 (light)",
    body: "{addressAs}, {item} ka intezaar kar raha hoon, {itemSince} tarikh ko maanga tha.\n\nKoi jaldi nahi hai agar aap busy hain, bas ek line bata dijiye ki kab tak mil jaayega, main uske hisaab se apna schedule laga lunga. Tab tak main [what you are working on meanwhile] pe kaam kar raha hoon.",
    needs: ["overdue_item"],
  },
  {
    id: "cp_chase_d10_em_en", stage: "any", channel: "email", language: "en", textKind: "E", edits: ["E16", "E17"],
    source: "SOP-09 section 3, Day 10", src: { file: SOP09, from: "I have been waiting on [[ITEM]] since [[DATE]]", to: "What I cannot work around is not knowing." },
    label: "Waiting on the client, day 10 (with the arithmetic)",
    subject: "{projectName}, waiting on {item} since {itemSince}",
    // E17: {messagesCount} reads "1 message" / "3 messages" (and is a blank while none is recorded). E16: "an exam
    // period" is said to a school or coaching client only.
    body: [
      "Hello {greeting}",
      "I have been waiting on {item} since {itemSince}, which is {days} days. I have sent {messagesCount} about it and I want to make sure they are reaching the right person.",
      "Where this leaves the project. The build cannot finish without it. Under Clause 4.3 the delivery date moves day for day while I wait, so {goLiveDate} is currently {newGoLiveDate}. That is arithmetic, not a complaint.",
      "The next thing that changes. If it reaches 15 days, Clause 4.4 lets me take on other client work and re-schedule the remaining dates. That is not me walking away, but it does mean I may not be free the moment you are ready.",
      "If there is a reason for the delay: the person who holds it is away, a decision is stuck, or you have simply gone off the idea, tell me. Any of those I can work around. What I cannot work around is not knowing.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n"),
    alt: [{ when: "school", body: [
      "Hello {greeting}",
      "I have been waiting on {item} since {itemSince}, which is {days} days. I have sent {messagesCount} about it and I want to make sure they are reaching the right person.",
      "Where this leaves the project. The build cannot finish without it. Under Clause 4.3 the delivery date moves day for day while I wait, so {goLiveDate} is currently {newGoLiveDate}. That is arithmetic, not a complaint.",
      "The next thing that changes. If it reaches 15 days, Clause 4.4 lets me take on other client work and re-schedule the remaining dates. That is not me walking away, but it does mean I may not be free the moment you are ready.",
      "If there is a reason for the delay: the person who holds it is away, a decision is stuck, an exam period, or you have simply gone off the idea, tell me. Any of those I can work around. What I cannot work around is not knowing.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n") }],
    needs: ["overdue_item"],
  },
  {
    id: "cp_chase_d15_wa_hi", stage: "any", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-09 section 3, Day 15", src: { file: SOP09, from: "ko 15 din ho gaye.", to: "jo kickoff call pe padha tha." },
    label: "Waiting on the client, day 15: other work is scheduled (cl. 4.4)",
    body: "{addressAs}, {item} ko 15 din ho gaye. Main abhi doosre client ka kaam schedule kar raha hoon, warna mere paas khaali time pada rahega.\n\nIska matlab yeh nahi ki aapka project band ho gaya. Matlab sirf itna hai ki jab aap ready honge to main shayad usi din free na hoon, jo bhi realistic date hogi woh main tabhi bata dunga.\n\nYeh Clause 4.4 hai, jo kickoff call pe padha tha.",
    needs: ["overdue_item", "days_15", "kickoff_held"],
  },
  {
    id: "cp_chase_d45_em_en", stage: "any", channel: "email", language: "en", textKind: "N",
    source: "Spec 7.5 (SOP-09 section 3 Day 45; SA cl. 4.5, 16.1)", label: "Day 45: the work to date invoiced (formal: post too)",
    subject: "{projectName}, waiting since {itemSince}: work to date invoiced",
    body: "Hello {greeting}\n\nThe project has been waiting on {item} since {itemSince}, more than 45 continuous days. Under Clause 4.5 of our agreement I am treating the work completed so far as delivered, and the invoice for it is attached.\n\nNothing is deleted and nothing is taken down. Work resumes once this invoice and the restart fee of Rs. {restartFee} are paid, on the first date my schedule allows, and the remaining dates move from there.\n\nIf something has changed at your end, tell me. A date I can plan around is all I need.\n\nMehdi Alam · Ideovent Technologies · +91 77619 21786 · contact@ideovent.in",
    needs: ["overdue_item", "days_45", "work_to_date_invoice", "in_india"], attaches: [{ doc: "invoice", which: "about" }], formal: true, money: true,
  },
  {
    id: "cp_slip_client_wa_hi", stage: "any", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-08 section 5, \"A slipping date, caused by them\"", src: { file: SOP08, from: "ek date update, go-live", to: "pakki hai.", blanked: ["6 pages ka final text", "______"] },
    label: "The go-live date moves: their delay",
    body: "{addressAs}, ek date update, go-live {goLiveDate} se {newGoLiveDate} ho raha hai.\n\nWajah: [what was late] [date it was due] tarikh tak aana tha, aur woh [date it came] ko mila. Us beech mein main us hisse pe kaam nahi kar pa raha tha.\n\nYeh koi charge nahi hai aur na hi shikayat, jo din content ka intezaar hua, utne din aage khisak gaye. Kickoff pe yahi baat hui thi, isliye aaj likh ke bhej raha hoon, project ke end mein nahi.\n\nBaaki content [date for the rest] tak aa jaaye, to {newGoLiveDate} pakki hai.",
    needs: ["slip_client", "kickoff_held"],
  },
  {
    id: "cp_slip_own_em_en", stage: "any", channel: "email", language: "en", textKind: "E", edits: ["E16"],
    source: "SOP-09 section 5, the message", src: { file: SOP09, from: "The go-live date is moving from [[GO_LIVE_DATE]] to [[DATE]]. I am telling you now", to: "than have you find out too late that the date mattered." },
    label: "The go-live date moves: our own mistake",
    subject: "{projectName}: the date is moving to {newGoLiveDate}, and why",
    // E16: "an admission cycle" is an example for a school or coaching client only; a clinic or a shop has none.
    body: [
      "Hello {greeting}",
      "The go-live date is moving from {goLiveDate} to {newGoLiveDate}. I am telling you now rather than closer to the date.",
      "The reason is mine. [the reason]. I underestimated it, and I would rather say that plainly than give you a longer explanation that sounds like an excuse.",
      "What it costs you: nothing. The scope is unchanged and there is no additional charge. The extra work is mine.",
      "What I am doing about it. [what I am doing about it]. You will get the usual update on {weeklyUpdateDay}, and if the new date comes under any pressure at all you will hear it from me the same day, not at the end.",
      "If {newGoLiveDate} creates a real problem at your end (a printed brochure, an event), tell me today. There are things I can bring forward and launch in stages, and I would rather do that than have you find out too late that the date mattered.",
      "Mehdi Alam · Ideovent Technologies",
    ].join("\n\n"),
    alt: [{ when: "school", body: [
      "Hello {greeting}",
      "The go-live date is moving from {goLiveDate} to {newGoLiveDate}. I am telling you now rather than closer to the date.",
      "The reason is mine. [the reason]. I underestimated it, and I would rather say that plainly than give you a longer explanation that sounds like an excuse.",
      "What it costs you: nothing. The scope is unchanged and there is no additional charge. The extra work is mine.",
      "What I am doing about it. [what I am doing about it]. You will get the usual update on {weeklyUpdateDay}, and if the new date comes under any pressure at all you will hear it from me the same day, not at the end.",
      "If {newGoLiveDate} creates a real problem at your end (an admission cycle, a printed brochure, an event), tell me today. There are things I can bring forward and launch in stages, and I would rather do that than have you find out too late that the date mattered.",
      "Mehdi Alam · Ideovent Technologies",
    ].join("\n\n") }],
    needs: ["slip_own"],
  },
  {
    id: "cp_password_received_wa_hi", stage: "any", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-04 section 2, step 4", src: { file: SOP04, from: "Password mil gaya, maine apne password manager mein daal diya hai.", to: "woh link khatam ho jaata hai." },
    label: "They sent a password anyway",
    body: "Password mil gaya, maine apne password manager mein daal diya hai. Ek request, aage se email ya WhatsApp pe password mat bhejiye. Email kai servers pe saalon tak padha rehta hai aur forward bhi ho jaata hai. Main aapko ek secure link bhej dunga jisme aap daal sakein; ek baar khulne ke baad woh link khatam ho jaata hai.",
    note: "Put the password in the password manager first, and nowhere else: the CRM has no field for one.",
  },
  {
    id: "cp_access_request_wa_hi", stage: "kickoff", channel: "whatsapp", language: "hinglish", textKind: "N",
    source: "Spec 7.5 (SOP-04 section 2; Onboarding Form section 0; SOP-06 section 7)", label: "Access, safely: add us as a user, never send a password",
    body: "{addressAs}, hosting aur domain ke liye ek request.\n\nPassword WhatsApp ya email pe mat bhejiye. Apne account mein contact@ideovent.in ko alag user bana ke add kar dijiye, password aap hi ke paas rahega.\n\nKisi account mein user add nahi hota, to main ek secure link bhejunga jisme aap password daal sakein. Woh link ek baar khulne ke baad khatam ho jaata hai.",
  },
  {
    id: "cp_access_request_wa_en", stage: "kickoff", channel: "whatsapp", language: "en", textKind: "N",
    source: "Spec 7.5", label: "Access, safely: add us as a user, never send a password",
    body: "{addressAs}, one request about your hosting and domain.\n\nPlease do not send passwords on WhatsApp or by e-mail. Add contact@ideovent.in as a separate user on your own account; the password stays with you.\n\nIf an account cannot add a user, I will send you a secure link to put the password in. The link stops working once it is opened.",
  },

  /* ── Stage 6. Design approval ─────────────────────────────────────────── */
  {
    id: "cp_design_wireframes_em_en", stage: "design", channel: "email", language: "en", textKind: "S",
    source: "SOP-03 step 1, the wireframe e-mail", src: { file: SOP03, from: "Attached is the structure of the site", to: "which is the review window in the scope document." },
    label: "Wireframes: structure for approval (not the design yet)",
    subject: "{projectName}, structure for approval (not the design yet)",
    body: [
      "Hello {greeting}",
      "Attached is the structure of the site, what goes on each page, in what order, and how much room each thing gets.",
      "This is deliberately grey and plain. There are no colours, photographs or final fonts yet. That is on purpose: if we agree the structure first, the design round is about how it looks rather than about what goes where, and that is what makes two revision rounds comfortable rather than tight.",
      "What I need from you: look at each page and tell me whether anything important is missing, in the wrong order, or too far down the page. Do not worry about how it looks.",
      "Please reply by {reviewBy}, which is the review window in the scope document.",
      "Mehdi Alam · Ideovent Technologies",
    ].join("\n\n"),
    attaches: [{ byHand: "the wireframes and the sitemap" }], ticks: ["d_wire"],
  },
  {
    id: "cp_design_review_em_en", stage: "design", channel: "email", language: "en", textKind: "S",
    source: "SOP-03 step 2, the design review e-mail", src: { file: SOP03, from: "The designs are ready:", to: "and I would much rather have your comments." },
    label: "Designs for review, with the round counter",
    subject: "{projectName}, designs for review ({round})",
    body: [
      "Hello {greeting}",
      "The designs are ready: {reviewLink}",
      "Each page is shown at computer width and at phone width. Please look at both: most of your visitors will see the phone version.",
      "How to give feedback so your round counts fully:",
      "The scope document includes two rounds of revisions at this stage. One round means one consolidated list. So please:",
      "- Gather everyone's comments first: anyone whose opinion will matter later should see this now.\n- Send them to me in one email, as a numbered list.\n- Point at the page and the element: \"Page 2, the blue box under the photo, make the heading bigger\" is something I can act on. \"It needs more punch\" is not.\n- Tell me what feels wrong even if you do not know the fix. That is my job.",
      "Please send your list by {reviewBy}, which is the review window we agreed. If I do not hear from you by then, the scope document treats the design as accepted (Clause 3.3), and I would much rather have your comments.",
      "Mehdi Alam · Ideovent Technologies",
    ].join("\n\n"),
    needs: ["review_link"],
  },
  {
    id: "cp_design_buckets_wa_hi", stage: "design", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-03 steps 3 and 4 (the split into three buckets)", src: { file: SOP03, from: "List mil gayi, dhanyavaad.", to: "Baaki kaam rukega nahi.", blanked: ["1, 3, 4, 6 aur 7", "2", "mobile pe form theek se nahi dikh raha", "5", "gallery page"] },
    label: "The list arrived: revisions, a defect, something new",
    body: "List mil gayi, dhanyavaad. Ismein se points [revision point numbers] normal revisions hain, woh is round mein ho jaayenge.\n\nPoint [defect point number] actually ek defect hai, [what does not work], woh mera kaam hai aur round mein count nahi hoga.\n\nPoint [new thing point number], [the new thing] naya hai, scope mein nahi tha. Main uska chhota change request bhej deta hoon aaj, taaki aap number aur date dekh ke decide kar sakein. Baaki kaam rukega nahi.",
  },
  {
    id: "cp_design_round_done_em_en", stage: "design", channel: "email", language: "en", textKind: "S",
    source: "SOP-03 steps 3 and 4 (the round, sent back point by point)", src: { file: SOP03, from: "Round 1 of 2 done. Here is what changed, point by point.", to: "Here is what changed, point by point.", blanked: ["Round 1 of 2"] },
    label: "The round done, point by point",
    subject: "{projectName}, {round} done", frameHead: "Hello {greeting}", frameTail: SIGN,
    body: "{round} done. Here is what changed, point by point.\n\n[what changed, point by point]",
  },
  {
    id: "cp_design_round2_close_wa_hi", stage: "design", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-03 steps 3 and 4, the Round 2 addition", src: { file: SOP03, from: "Yeh Round 2 hai", to: "main build shuru kar deta hoon." },
    label: "Round 2: the last included round",
    body: "Yeh Round 2 hai, jo scope ke do included rounds mein se doosra hai. Agar ismein koi cheez chhoot gayi hai ya maine galat samajh liya hai, woh main theek karunga, woh naya round nahi hai.\n\nAgar sab theek lag raha hai, bas reply mein 'approved' likh dijiye aur main build shuru kar deta hoon.",
    needs: ["round_2"],
  },
  {
    id: "cp_design_approved_em_en", stage: "design", channel: "email", language: "en", textKind: "S",
    source: "SOP-03 step 5, the approval closing e-mail (E14 when fewer than two rounds were used)", src: { file: SOP03, from: "Recording your approval of the designs dated", to: "Mehdi Alam · Ideovent Technologies · contact@ideovent.in" },
    label: "Design approved, moving to build",
    subject: "{projectName}, design approved, moving to build",
    body: [
      "Hello {greeting}",
      "Recording your approval of the designs dated {designsDated}, received from you on {approvedOn}.",
      "What this means, plainly: the build now happens against these designs. Both included revision rounds have been used. If something needs to change after this, it is not a problem and it is not a refusal. It is a change request, priced and dated on a short form, and you decide with the number in front of you (Clause 6.4).",
      "What happens next: the build starts {buildStart} and goes onto {stagingUrl}. You will get a written update every {weeklyUpdateDay}.",
      "The approved files are attached so that we are both referring to the same version.",
      "Mehdi Alam · Ideovent Technologies · contact@ideovent.in",
    ].join("\n\n"),
    alt: [{ when: "fewerRounds", body: [
      "Hello {greeting}",
      "Recording your approval of the designs dated {designsDated}, received from you on {approvedOn}.",
      "What this means, plainly: the build now happens against these designs. If something needs to change after this, it is not a problem and it is not a refusal. It is a change request, priced and dated on a short form, and you decide with the number in front of you (Clause 6.4).",
      "What happens next: the build starts {buildStart} and goes onto {stagingUrl}. You will get a written update every {weeklyUpdateDay}.",
      "The approved files are attached so that we are both referring to the same version.",
      "Mehdi Alam · Ideovent Technologies · contact@ideovent.in",
    ].join("\n\n") }],
    needs: ["approval_recorded"], attaches: [{ byHand: "the approved design files" }], ticks: ["d_close"],
  },
  {
    id: "cp_design_third_round_wa_hi", stage: "design", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-03 step 6, the third-round message", src: { file: SOP03, from: "Haan, ho sakta hai, aur idea achha hai", to: "Dono mein se jo aapko theek lage.", blanked: ["[[THING]]"] },
    label: "A third design round: a change request, or phase two",
    body: "Haan, ho sakta hai, aur idea achha hai, isse [what they asked for] sach mein behtar lagega.\n\nScope mein do revision rounds the aur dono ho chuke hain, to yeh teesra round change request se jaata hai. Main aaj hi form bhej deta hoon, ismein saaf likha hoga kitna time lagega aur kitna cost hoga, aur go-live date kitni aage jaayegi. Number dekh ke aap decide kar lijiye.\n\nYa doosra option, ise phase two mein rakh dete hain, launch ke turant baad. Tab date bhi nahi hilegi. Dono mein se jo aapko theek lage.",
    needs: ["rounds_used_2"],
  },
  {
    id: "cp_design_third_round_em_en", stage: "design", channel: "email", language: "en", textKind: "S",
    source: "SOP-03 step 6, the English for an e-mail", src: { file: SOP03, from: "Yes, we can do that. And it is a good idea.", to: "Either is genuinely fine by me." },
    label: "A third design round: a change request, or phase two",
    subject: "{projectName}, a third design round", frameHead: "Hello {greeting}", frameTail: SIGN,
    body: "Yes, we can do that. And it is a good idea. Both included revision rounds have been used, so this one goes on a short change request: it will show you exactly what it adds in rupees and in working days, and what that does to {goLiveDate}. You decide with the number in front of you. Alternatively we can park it as phase two straight after launch: same work, no effect on the launch date. Either is genuinely fine by me.",
    needs: ["rounds_used_2"],
  },

  /* ── Stage 7. Build ───────────────────────────────────────────────────── */
  {
    id: "cp_build_weekly_em_en", stage: "build", channel: "email", language: "en", textKind: "S",
    source: "SOP-04 section 5 (and SOP-08 section 4), the weekly update", src: { file: SOP04, from: "Done this week", to: "That is expected.", blanked: [
      "(if nothing, write \"Nothing this week, thank you\")",
      "- ______, by ______",
      "Go-live date: [[GO_LIVE_DATE]], on track.",
      "(If it is not on track, this line says so instead, with the new date and one sentence on why. Never leave \"on track\" in a template when it is not true.)",
    ] },
    label: "The weekly update",
    subject: "{projectName}, weekly update, {todayDate}",
    body: [
      "Hello {greeting}",
      "Done this week\n- [done this week]",
      "Next week\n- [what comes next]",
      "I need from you\n{needList}",
      "{goLiveLine}",
      "You can see the current state any time at {stagingUrl}. It is a work in progress, so some pages will be incomplete. That is expected.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n"),
    ticks: ["b_weekly"],
    note: "\"I need from you\" lists every open client item due in the next 7 days. The go-live line says \"on track\" only while the target has not moved since kickoff.",
  },
  {
    id: "cp_build_weekly_wa_hi", stage: "build", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "WHATSAPP-PLAYBOOK section 3.10", src: { file: WAP, from: "update.", to: "dekhne ke liye bheja hai.)" },
    label: "The weekly update (WhatsApp)",
    body: "{addressAs}, {projectName}, Week [week number] update.\n\nBan gaya: [what was built this week]\nAgle hafte: [what comes next]\nAapse chahiye: {needFromYou}, {needBy} tak mil jaye to date nahi khiskegi\n\nKhud dekh lijiye: {stagingUrl}\n(Kaam chal raha hai, final nahi, kuch adhoora lage to bata dijiye, wahi to dekhne ke liye bheja hai.)",
    ticks: ["b_weekly"],
  },
  {
    id: "cp_cr_yes_wa_hi", stage: "any", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-04 section 7, step 1", src: { file: SOP04, from: "Haan, ho sakta hai, main aaj hi nikaal ke bata deta hoon", to: "cost pe kya asar padta hai." },
    label: "Something new asked for: yes first",
    body: "Haan, ho sakta hai, main aaj hi nikaal ke bata deta hoon ki isse date aur cost pe kya asar padta hai.",
  },
  {
    id: "cp_cr_shelf_wa_hi", stage: "any", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-04 section 7, \"Always offer the phase-two shelf\"", src: { file: SOP04, from: "Do options hain. Abhi add kar dete hain.", to: "aap bata dijiye.", blanked: ["______"] },
    label: "The change request: add it now, or phase two",
    body: "Do options hain. Abhi add kar dete hain. Rs. {crCost} aur {crDays} working days, go-live {newGoLiveDate} ho jaayega. Ya isko phase two mein rakh dete hain, launch ke turant baad, tab current date bilkul nahi hilegi. Mujhe dono theek hain, aap bata dijiye.",
    needs: ["cr_selected"],
  },
  {
    id: "cp_cr_send_em_en", stage: "any", channel: "email", language: "en", textKind: "S",
    source: "Change-Request-Form page 2, \"A message you can copy\"", src: { file: CRF, from: "Happy to add that:", to: "I will slot it in.", blanked: ["______"] },
    label: "The change request form, by e-mail",
    subject: "{projectName}, change request {crNo}", frameHead: "Hello {greeting}", frameTail: SIGN,
    body: "Happy to add that: it is a good idea and it will make the [what it improves] much easier to use.\n\nIt sits outside what we listed in the SOW, so I have put it on a short change request so you can see exactly what it adds: Rs. {crCost} and {crDays} working days, which moves go-live to {newGoLiveDate}.\n\nIf you would rather protect the launch date, we can park it as phase two straight after go-live: same price, no impact on the current date. Either way is fine by me.\n\nSend the signed form back when you have decided and I will slot it in.",
    needs: ["cr_selected"], attaches: [{ doc: "change_request", which: "about" }],
  },
  {
    id: "cp_rebaseline_em_en", stage: "build", channel: "email", language: "en", textKind: "E", edits: ["E17"],
    source: "SOP-09 section 2, \"Let us re-baseline the scope\"", src: { file: SOP09, from: "Thank you for the call. Writing down what we agreed.", to: "Tell me which and I will send the paperwork today.", blanked: ["1. ______ 2. ______ 3. ______ 4. ______"] },
    label: "Re-baseline the scope (after a phone call)",
    subject: "{projectName}, let us re-baseline the scope",
    // E17: the list is every request logged (from three; padded with blanks below that), so "each of the four"
    // became "each of them"; "the ones you want park the rest" lost a word with its dash and reads "and park".
    body: [
      "Hello {greeting}",
      "Thank you for the call. Writing down what we agreed.",
      "Since we signed SOW {sowRef}, these items have been requested that were not in it:",
      "{requestsList}",
      "None of them is unreasonable and I am not complaining. This happens on good projects, because you are thinking about it properly. But together they add roughly {requestsDays} working days to a {durationWeeks}-week project, and I have been absorbing them one at a time without saying so. That was my mistake and it is not sustainable for either of us, because it means you have no visibility of what your own decisions cost.",
      "Two ways forward. Pick either.",
      "A. Change requests. I price each of them on its own form. You approve the ones you want and park the rest. The go-live date moves by whatever you approve, and nothing else changes.",
      "B. Launch what was signed, then phase two. We build exactly SOW {sowRef}, we go live on {goLiveDate}, and everything above becomes a short second project starting the week after. You get a working site on the original date, and the new ideas get proper attention instead of being squeezed in.",
      "I would suggest B, honestly. A site that is live and slightly incomplete earns you enquiries. A site that is perfect and three months late earns you nothing.",
      "Tell me which and I will send the paperwork today.",
      "Mehdi Alam · Ideovent Technologies",
    ].join("\n\n"),
    needs: ["absorbed_requests"],
  },

  /* ── Stage 8. Testing and client check ───────────────────────────────── */
  {
    id: "cp_review_accuracy_em_en", stage: "review", channel: "email", language: "en", textKind: "E", edits: ["E16", "E22"],
    source: "SOP-05 K, the content accuracy request", src: { file: SOP05, from: "The site is ready on [[STAGING_URL]]", to: "a phone call to your office, not to mine." },
    label: "Please check these facts (it starts the 7-day review window)",
    subject: "{projectName}, please check these facts before we go live on {goLiveDate}",
    // E16: academic year, admission and exam dates, affiliation and recognition are a school's (and a coaching
    // centre's) facts; a clinic or another business checks its fees, dates and registration details. E22: this
    // e-mail is the written notice that starts the 7-day review window (cl. 3.1), so it says the window and what
    // silence means, in the words of the design review e-mail (SOP-03 step 2) and SA cl. 3.3 and 5.2(b).
    body: [
      "Hello {greeting}",
      "The site is ready on {stagingUrl} and I have finished my own testing. There is one thing only you can check, and it matters more than anything I can test: whether the facts are current.",
      "Please go through the site and confirm each of these:",
      "• Every fee and amount is correct and current\n• Every staff name, designation and spelling is correct\n• Phone numbers, email addresses and the address are correct\n• Any date or deadline shown is correct\n• Registration details are stated exactly as you are permitted to state them\n• Every photograph is one you are happy to publish, and you have the right to publish it\n• Nothing is on the site that should not be public",
      "The quickest way to do this is on your phone, in one sitting, with a pen. Please reply with corrections in one email, or with \"all correct\" if there are none.",
      "Please reply by {reviewBy}, which is the 7-day review window in our agreement. If I do not hear from you by then, the agreement treats the finished work as accepted (Clause 3.3), which is when the launch payment falls due (Clause 5.2), and I would much rather have your answer.",
      "Why I am asking rather than checking myself: I can confirm the site says what you sent me. I cannot confirm that a fee has not changed since. A wrong fee on a live site becomes a phone call to your office, not to mine.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n"),
    alt: [{ when: "school", body: [
      "Hello {greeting}",
      "The site is ready on {stagingUrl} and I have finished my own testing. There is one thing only you can check, and it matters more than anything I can test: whether the facts are current.",
      "Please go through the site and confirm each of these:",
      "• Every fee, amount and academic year is correct and current\n• Every staff name, designation and spelling is correct\n• Phone numbers, email addresses and the address are correct\n• Admission dates, exam dates and any deadline shown are correct\n• Affiliation, recognition and registration details are stated exactly as you are permitted to state them\n• Every photograph is one you are happy to publish, and you have the right to publish it\n• Nothing is on the site that should not be public",
      "The quickest way to do this is on your phone, in one sitting, with a pen. Please reply with corrections in one email, or with \"all correct\" if there are none.",
      "Please reply by {reviewBy}, which is the 7-day review window in our agreement. If I do not hear from you by then, the agreement treats the finished work as accepted (Clause 3.3), which is when the launch payment falls due (Clause 5.2), and I would much rather have your answer.",
      "Why I am asking rather than checking myself: I can confirm the site says what you sent me. I cannot confirm that a fee has not changed since. A wrong fee on a live site becomes a phone call to your office, not to mine.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n") }],
    needs: ["staging_url", "qa_done"], ticks: ["q_accuracy"],
  },

  /* ── Stage 9. Launch payment and go-live ─────────────────────────────── */
  {
    id: "cp_launch_golive_em_en", stage: "launch", channel: "email", language: "en", textKind: "E", edits: ["E24"],
    source: "SOP-06 section 1, the proposed go-live (E24: \"for an hour or two\", as SOP-06 section 5 and the live WhatsApp say)",
    src: { file: SOP06, from: "Everything is tested and your content check is complete", to: "Reply \"go ahead\" and I will block the time." },
    label: "Proposed go-live, with the launch invoice",
    subject: "{projectName}, proposed go-live, {goLiveDate} at {goLiveTime}",
    body: [
      "Hello {greeting}",
      "Everything is tested and your content check is complete, so we can go live.",
      "I would like to make the switch on {goLiveDate} at {goLiveTime}. It is a working-day morning deliberately. If anything needs attention, your hosting provider, your registrar and I are all reachable, which is not true on a Friday evening.",
      "What happens on the day. The domain {domainName} starts pointing at the new site. Most visitors see the change within a few minutes; a few may see the old site for an hour or two while their internet provider catches up. That is normal and it settles on its own.",
      "One thing to know: email on your domain is unaffected by this, and I will confirm that specifically after the switch.",
      "What I need before the date: the final payment of Rs. {finalAmount} against invoice {invoiceNo}. The scope document ties the live deployment and the administrator credentials to that payment, so I want to say it plainly rather than have it be awkward on the morning.",
      "Reply \"go ahead\" and I will block the time.",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n"),
    needs: ["qa_accepted", "golive_morning", "in_india"], attaches: [{ doc: "invoice", milestone: "LAUNCH_50", which: "latest" }], ticks: [], money: true,
  },
  {
    id: "cp_launch_m1_wa_hi", stage: "launch", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E2", "E19"],
    source: "PAYMENT-FOLLOWUP section 4, M1", src: { file: PAY, from: "launch wali baaki 50% payment", to: "ka status ye hai: [[SPECIFIC_OBSERVATION]]." },
    label: "M1: the day after the launch invoice falls due",
    body: "{addressAs}, invoice {invoiceNo}, launch wali baaki 50% payment, Rs. {amountDue}, {dueWhenHi} due thi aur abhi tak credit nahi dikha.\n\nShayad aapke yahan process mein ho. Ek line mein bata dijiye kis date ko release hoga, main apni taraf se plan kar lunga.\n\nAgar invoice mein kuch theek karna hai to aaj bata dijiye, aaj hi dobara bhej dunga.\n\nSite launch ke liye taiyaar hai, {projectName} ka status ye hai: [the project's status in one line].",
    // E19: a launch invoice that also bills approved change requests (or a part of the advance still unpaid), or one
    // already part paid, is not "baaki 50%"; it is the remaining launch payment. {amountDue} is what is still open on
    // the invoice (its amount less the payments and credit notes against it), never the full invoice once part is paid.
    alt: [{ when: "notHalf", body: "{addressAs}, invoice {invoiceNo}, launch wali baaki payment, Rs. {amountDue}, {dueWhenHi} due thi aur abhi tak credit nahi dikha.\n\nShayad aapke yahan process mein ho. Ek line mein bata dijiye kis date ko release hoga, main apni taraf se plan kar lunga.\n\nAgar invoice mein kuch theek karna hai to aaj bata dijiye, aaj hi dobara bhej dunga.\n\nSite launch ke liye taiyaar hai, {projectName} ka status ye hai: [the project's status in one line]." }],
    needs: ["doc_overdue", "in_india"], ladder: "M1", money: true,
    note: "\"kal due thi\" (it was due yesterday) only when it was; on a later day the date is written instead.",
  },
  {
    id: "cp_launch_m2_em_en", stage: "launch", channel: "email", language: "en", textKind: "S",
    source: "PAYMENT-FOLLOWUP section 4, M2", src: { file: PAY, from: "dated [[INVOICE_DATE]] for Rs. [[AMOUNT]] was due on [[DUE_DATE]] and is", to: "Saket, New Delhi · +91 77619 21786 · contact@ideovent.in" },
    label: "M2: seven days past due, with the stop date",
    subject: "Invoice {invoiceNo}, {daysOverdue} days overdue, and what happens next",
    body: [
      "Hello {greeting}",
      "Invoice {invoiceNo} dated {invoiceDate} for Rs. {amount} was due on {dueDate} and is now {daysOverdue} days overdue. Please treat this as a formal payment reminder under our agreement dated {effectiveDate}.",
      "Before anything else, two ways this gets solved without any friction:",
      "1. If the invoice needs something changed (a PO number, a different billing entity, a corrected address, a TDS adjustment), tell me today and I will reissue it immediately. I would much rather fix a paperwork problem than chase a payment that was never going to clear.\n2. If it is approved and sitting in a payment run, send me the expected date and the UTR when it releases. That is enough, and I will stop writing.",
      "If neither applies and the account is not cleared by {dateWorkStops}, I will pause work on {projectName} from that date under Clause 5.7 of our agreement, until the overdue amount and the interest on it are paid.",
      "What a pause means, precisely, so there are no surprises:",
      "- Anything already delivered and live stays live. Nothing is taken down.\n- No new work is done, and deliverables, source files and credentials are not released.\n- The delivery dates move by however many days the pause lasts; under Clause 4.3 that time counts as a client delay, not as my delay.",
      "Interest of 1.5% per month applies from the due date under Clause 5.6 and is accruing now.",
      "The invoice and the bank and UPI details are attached again.",
      "Mehdi Alam\nIdeovent Technologies\nSaket, New Delhi · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    needs: ["doc_overdue", "in_india"], attaches: [{ which: "about" }], ladder: "M2", money: true,
  },
  {
    id: "cp_launch_m2_wa_hi", stage: "launch", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "WHATSAPP-PLAYBOOK section 3.9 (with the M2 e-mail, never alone)", src: { file: WAP, from: "din overdue hai.", to: "Ek reply se khatam ho jata hai." },
    label: "M2 on WhatsApp: the short version of the e-mail",
    body: "{addressAs}\n\nInvoice {invoiceNo}, Rs. {amountDue}, ab {daysOverdue} din overdue hai. Email abhi bheja hai, ye uska chhota version hai.\n\nDo mein se ek bata dijiye:\n1. Invoice mein koi problem hai, to aaj bata dijiye, aaj hi theek kar dunga\n2. Payment run mein hai, to date aur UTR bhej dijiye\n\nAgar {dateWorkStops} tak clear nahi hota to {projectName} ka naya kaam main rok dunga jab tak payment nahi aati. Jo already live hai wo live rahega, kuch band nahi hoga, bas aage ki dates utne din khisak jayengi. Agreement ke hisaab se due date se 1.5% per month interest bhi lagta hai.\n\nMain ye message bhejna pasand nahi karta. Ek reply se khatam ho jata hai.",
    needs: ["doc_overdue", "m2_email_first", "in_india"], ladder: "M2W", money: true,
  },
  {
    id: "cp_launch_pause_em_en", stage: "launch", channel: "email", language: "en", textKind: "S",
    source: "PAYMENT-FOLLOWUP section 4, \"The work-pause notice itself\"", src: { file: PAY, from: "remains unpaid. Notice of this", to: "+91 77619 21786 · contact@ideovent.in" },
    label: "The work-pause notice (formal: by post too)",
    subject: "Notice of suspension of work, {projectName}. Clause 5.7",
    body: [
      "Dear {signatoryName}",
      "Invoice {invoiceNo} for Rs. {amount}, due on {dueDate}, remains unpaid. Notice of this was given on {reminder2Date}.",
      "Under Clause 5.7 of the Service Agreement dated {effectiveDate}, work on {projectName} is suspended with effect from today, {dateWorkStops}, until the overdue amount and the interest accrued on it are received in full.",
      "Deliverables already delivered and live remain live and will not be taken down. No further work will be carried out, and no deliverables, source files, design files or credentials will be released, during the suspension. Under Clause 4.3, the time lost is a client delay and the remaining dates move accordingly.",
      "Suspension is not termination. The agreement continues (Clause 13.6), and work resumes on the next working day after payment is received in cleared funds.",
      "Mehdi Alam\nIdeovent Technologies · Saket, New Delhi, India\n+91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    needs: ["doc_overdue", "stop_date_reached", "reminders_sent", "in_india"], formal: true, ladder: "PAUSE", money: true,
  },
  {
    id: "cp_launch_m3_em_en", stage: "launch", channel: "email", language: "en", textKind: "S",
    source: "PAYMENT-FOLLOWUP section 4, M3 (to the signatory)", src: { file: PAY, from: "became due on [[DUE_DATE]] and", to: "+91 77619 21786 · contact@ideovent.in" },
    label: "M3: final notice (formal: by post too)",
    subject: "Final notice, invoice {invoiceNo}, Rs. {amountDue}, overdue since {dueDate}",
    body: [
      "Dear {signatoryName}",
      "Invoice {invoiceNo} dated {invoiceDate} for Rs. {amount} became due on {dueDate} and remains unpaid {daysOverdue} days later. Reminders were sent on {reminder1Date} and {reminder2Date} and have not been answered.",
      "The position as of today:",
      "- Work on {projectName} is paused, as notified on {reminder2Date}, under Clause 5.7 of our agreement dated {effectiveDate}.\n- Interest at 1.5% per month applies on the outstanding amount from {dueDate} until payment is received, under Clause 5.6.\n- Under Clause 7.1, intellectual property in the deliverables has not passed and will not pass until the full contract value is received. Any handover, source transfer, deployment or licence that depends on payment stays withheld until then.\n- Under Clause 13.5, if payment runs more than 30 days overdue I may end the agreement immediately by written notice. That date is {finalDeadline}.",
      "Please clear Rs. {amountDue} by {finalDeadline}.",
      "If you dispute any part of this invoice, put the dispute in writing with your reasons by {finalDeadline} and I will deal with it on merits, under Clause 15.2. Silence is not a dispute.",
      "I would much rather close this with a payment than with a notice. One reply today ends it.",
      "Yours sincerely\nMehdi Alam\nIdeovent Technologies\nSaket, New Delhi, India\n+91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    needs: ["doc_overdue", "paused", "reminders_sent", "in_india"], formal: true, ladder: "M3", money: true,
  },
  {
    id: "cp_launch_live_wa_hi", stage: "launch", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-06 section 5 (\"site live ho gayi hai\")", src: { file: SOP06, from: "site live ho gayi hai, [[DOMAIN_NAME]].", to: "main desk pe hi hoon." },
    label: "The site is live",
    body: "{addressAs}, site live ho gayi hai, {domainName}.\n\nMaine abhi check kar liya: saare pages khul rahe hain, forms se enquiry sahi jagah pahunch rahi hai, aur aapka email bilkul affected nahi hua hai.\n\nEk chhoti si baat, agle 1-2 ghante kuch logon ko purani site dikh sakti hai. Yeh normal hai, unka internet provider thodi der purana address yaad rakhta hai, apne aap theek ho jaayega.\n\nAap ek baar apne phone pe kholke dekh lijiye. Kuch bhi ajeeb lage to abhi bataiye, main desk pe hi hoon.",
    needs: ["verify_done"], ticks: ["l_live"],
  },
  {
    id: "cp_launch_live_wa_en", stage: "launch", channel: "whatsapp", language: "en", textKind: "N",
    source: "Spec 7.5 (English of SOP-06 section 5)", label: "The site is live",
    body: "{addressAs}, the site is live: {domainName}.\n\nI have just checked: every page opens, enquiries from the forms reach the right place, and your e-mail is not affected at all.\n\nOne small thing: for the next hour or two some people may still see the old site. That is normal. Their internet provider remembers the old address for a while, and it settles on its own.\n\nPlease open it once on your phone. If anything looks odd, tell me now; I am at my desk.",
    needs: ["verify_done"], ticks: ["l_live"],
  },
  {
    id: "cp_launch_rollback_wa_hi", stage: "launch", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-06 section 5, \"If you have to roll back\"", src: { file: SOP06, from: "ek problem aa gayi thi switch ke baad", to: "Yeh plan pehle se tha, panic nahi hai.", blanked: ["______"] },
    label: "Rolled back: send it before they notice",
    body: "{addressAs}, ek problem aa gayi thi switch ke baad, isliye maine turant purani site wapas live kar di hai. Abhi {domainName} pe purani site chal rahi hai aur sab normal hai, kuch down nahi hai.\n\nProblem yeh thi: [what the problem was]. Main aaj isko staging pe theek karke poora dobara test karunga.\n\nNayi date {newGoLiveDate} rakhta hoon. Extra koi charge nahi hai, yeh mera hissa hai.\n\nRollback isliye tha taaki aapke visitors ko tooti hui site na dikhe. Yeh plan pehle se tha, panic nahi hai.",
    needs: ["rollback"],
  },

  /* ── Stage 10. Handover and training ─────────────────────────────────── */
  {
    id: "cp_handover_wa_hi", stage: "handover", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E7"],
    source: "WHATSAPP-PLAYBOOK section 3.11, to the client", src: { file: WAP, from: "site live ho gayi, [[LIVE_URL]]", to: "Bahut achha laga aapke saath kaam kar ke." },
    label: "Handover WhatsApp: what is live, 30 days of defects, ownership",
    body: "{addressAs}, site live ho gayi, {liveUrl}\n\nTeen cheezein:\n\n1. Phone pe khol kar ek baar dekh lijiye, aur jinko dikhana hai dikha dijiye\n2. {supportEndDate} tak koi defect mile to seedha mujhe bhej dijiye, bina charge ke theek karunga. Naya feature ya nayi cheez isme nahi aati, wo alag se batata hoon, taaki baad mein confusion na ho\n3. Handover document aur saara admin access alag se bhej raha hoon. Domain shuru se hi aapke naam pe hai. Source code aur admin access final payment ke saath aapke ho gaye. Hosting {custodyText} pe hai, handover document mein likha hai ki wo kiske account pe hai aur kabhi shift karna ho to kaise hoga\n\nBahut achha laga aapke saath kaam kar ke.",
    needs: ["handover_truth"], ticks: ["h_wa"],
  },
  {
    id: "cp_handover_wa_en", stage: "handover", channel: "whatsapp", language: "en", textKind: "N",
    source: "Spec 7.5 (English of WHATSAPP-PLAYBOOK section 3.11 with E7)", label: "Handover WhatsApp: what is live, 30 days of defects, ownership",
    body: "{addressAs}, the site is live: {liveUrl}\n\nThree things:\n\n1. Open it once on your phone, and show it to whoever you want to\n2. Until {supportEndDate}, if you find a defect, send it straight to me and I will fix it at no charge. New features or new things are not part of this; I will tell you about those separately, so there is no confusion later\n3. I am sending the handover document and all the admin access separately. The domain has been in your name from the start. The source code and admin access became yours with the final payment. Hosting is on {custodyText}; the handover document says whose account it is on and how to move it if you ever need to\n\nIt was a real pleasure working with you.",
    needs: ["handover_truth"], ticks: ["h_wa"],
  },
  {
    id: "cp_handover_doc_em_en", stage: "handover", channel: "email", language: "en", textKind: "N",
    source: "Spec 7.5 (Project-Handover-Document intro, sections 2 and 11)", label: "The handover document by e-mail",
    subject: "{projectName}, handover document",
    body: "Hello {greeting}\n\nAttached is the handover document for {projectName}: what is live and where, who holds which account, the renewal dates, and how to raise an issue in the 30-day support window, which ends on {supportEndDate}.\n\nPlease keep it somewhere that does not depend on one person's inbox. Section 11 is for your signature; the support window runs from {goLiveDate} whether or not it is signed.\n\nOne rule worth remembering: Ideovent will never e-mail you a password, and will never ask you to e-mail one. If a message appears to come from us asking for a password, a one-time code or a payment to a new account, it is not from us. Call +91 77619 21786 and check before you act on it.\n\nMehdi Alam · Ideovent Technologies · +91 77619 21786",
    attaches: [{ doc: "handover", which: "latest" }], ticks: [],
  },
  {
    id: "cp_handover_unsigned_wa_hi", stage: "handover", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-06 section 9, the day-7 reminder", src: { file: SOP06, from: "handover document abhi wapas nahi aaya hai.", to: "aur jo bhi mile ek saath bhej dijiye." },
    label: "The handover page is not back (day 7)",
    body: "{addressAs}, handover document abhi wapas nahi aaya hai. Koi jaldi nahi hai, bas ek baat bata doon: support window {supportStartDate} se hi chalu ho gaya hai aur {supportEndDate} ko khatam hoga, sign ho ya na ho.\n\nMatlab jitna intezaar, utna free window kam. Isliye keh raha hoon, is hafte site ko phone aur computer dono pe theek se dekh lijiye, aur jo bhi mile ek saath bhej dijiye.",
    needs: ["handover_unsigned"], ticks: ["h_signed", "s_day7"],
  },

  /* ── Stage 11. Thirty days of support ────────────────────────────────── */
  {
    id: "cp_support_email_please_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-07 section 1 (a request on WhatsApp: send it by e-mail too)", src: { file: SOP07, from: "main dekh leta hoon. Ek request", to: "kyunki proof nahi rehta ki kab bataya tha." },
    label: "A request on WhatsApp: please send it by e-mail too",
    body: "{addressAs}, main dekh leta hoon. Ek request, ise ek baar contact@ideovent.in pe bhi bhej dijiye, do line mein.\n\nWajah yeh hai: email pe aane wali har request ka record banta hai aur uspe response time chalta hai. WhatsApp pe aayi cheez mere phone mein dabb jaati hai aur mujhe hi nuksaan hota hai, aapko bhi, kyunki proof nahi rehta ki kab bataya tha.",
  },
  {
    id: "cp_support_five_q_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-07 section 1, the five questions", src: { file: SOP07, from: "Ek minute ka kaam hai", to: "Screenshot se aam taur pe chaar emails bach jaate hain." },
    label: "A thin report: the five questions",
    body: "Ek minute ka kaam hai, isse mujhe seedha wajah mil jaati hai\n1. Aap kar kya rahe the?\n2. Kya hona chahiye tha?\n3. Kya hua uski jagah?\n4. Phone tha ya computer, aur kaunsa browser?\n5. Ek screenshot ya chhoti si screen recording bhej dijiye.\n\nScreenshot se aam taur pe chaar emails bach jaate hain.",
  },
  {
    id: "cp_support_response_em_en", stage: "support", channel: "email", language: "en", textKind: "S",
    source: "SOP-07 section 3, \"The Response template\"", src: { file: SOP07, from: "I have your message about", to: "Mehdi Alam · Ideovent Technologies · +91 77619 21786", blanked: [
      "______",
      "(S1 down / S2 major / S3 minor / S4 change request)",
      "(and, if waiting on someone: \"I am waiting on ______ from ______ until that arrives I cannot move this forward, and I will chase it on ______.\")",
      "(pick one)",
      "This is a defect in what was delivered, so it is fixed free of charge under the thirty-day warranty / under your care plan.",
      "This is a content change, which comes out of your [[AMC_PLAN]] plan's included hours. It will take about ______ minutes of them.",
      "This is new work. It is not a fault, it is something the site does not currently do. I will send you a short quote today so you can decide with the number in front of you.",
    ] },
    label: "The Response: what I think, severity, next step, cover",
    subject: "Re: {projectName}, {issueSummary}",
    body: [
      "Hello {greeting}",
      "I have your message about \"{issueSummary}\". I have looked at it.",
      "What I think is happening: [what I think is happening]",
      "Severity: {severityLine}",
      "What happens next: [what happens next]",
      "Cover: {coverLine}",
      "Mehdi Alam · Ideovent Technologies · +91 77619 21786",
    ].join("\n\n"),
    needs: ["issue_selected"],
  },
  {
    id: "cp_support_sunday_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-07 section 4, the Sunday night reply", src: { file: SOP07, from: "message mil gaya. Yeh site down waali situation nahi hai", to: "main uthata hoon.", blanked: ["[[TIME]]"] },
    label: "Out of hours, not an outage",
    body: "{addressAs}, message mil gaya. Yeh site down waali situation nahi hai, isliye main ise kal subah sabse pehle dekhunga, [by what time] tak update mil jaayega.\n\nAgar aapko lagta hai ki site actually down hai ya payment fail ho raha hai, abhi phone kar dijiye +91 77619 21786 pe, main uthata hoon.",
  },
  {
    id: "cp_support_site_down_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-09 section 6, the first ten minutes", src: { file: SOP09, from: "site down hai, main dekh raha hoon abhi.", to: "chahe theek ho jaaye ya na ho." },
    label: "The site is down: before they message you",
    body: "{addressAs}, site down hai, main dekh raha hoon abhi.\n\nAapko isliye bata raha hoon ki koi aur pehle na bataye. Ek ghante mein update dunga, chahe theek ho jaaye ya na ho.",
  },
  {
    id: "cp_support_resolved_em_en", stage: "support", channel: "email", language: "en", textKind: "S",
    source: "SOP-09 section 6, \"resolved, and what happened\"", src: { file: SOP09, from: "The site has been back up since", to: "Mehdi Alam · Ideovent Technologies", blanked: ["______", "[[TIME]]", "[[DATE]]", "(usually \"none\", say so plainly)"] },
    label: "Resolved, and what happened",
    subject: "{projectName}, resolved, and what happened",
    body: "Hello {greeting}\n\nThe site has been back up since [time it came back] on [date it came back].\n\nWhat happened: [what happened]\nWhy it happened: [why it happened]\nWhat I did: [what I did]\nWhat stops it happening again: [what stops it happening again]\nTotal time down: approximately [total time down]\nCost to you: [cost to you]\n\nMehdi Alam · Ideovent Technologies",
  },
  {
    id: "cp_support_day7_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E8"],
    source: "SOP-06 section 9, the day-7 reminder, rewritten as E8", src: { file: SOP06, from: "handover document abhi wapas nahi aaya hai.", to: "aur jo bhi mile ek saath bhej dijiye." },
    label: "Support day 7: look properly this week, report everything at once",
    body: "{addressAs}, site live hue ek hafta ho gaya. Support window {supportStartDate} se chalu hai aur {supportEndDate} ko khatam hoga.\n\nIs hafte site ko phone aur computer dono pe theek se dekh lijiye, aur jo bhi mile ek saath bhej dijiye.",
    needs: ["handover_signed", "week_since_live"], ticks: ["s_day7"],
  },
  {
    id: "cp_feedback_check_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E9"],
    source: "TESTIMONIAL-REQUEST-MESSAGES section 5, its first two lines", src: { file: TRM, from: "ek seedha sawaal.", to: "Sach bataiyega, mujhe sudharna hai." },
    label: "One question: are you happy with the work?",
    body: "{addressAs}, ek seedha sawaal.\n\nKaam se aap khush hain ya kuch aisa hai jo main behtar kar sakta tha? Sach bataiyega, mujhe sudharna hai.",
  },
  {
    id: "cp_feedback_testimonial_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "Testimonial-Request-Kit section 2", src: { file: KIT, from: "Site live ho gayi hai aur [[SPECIFIC_WIN]]", to: "main dobara pareshan nahi karunga." },
    label: "Testimonial: a voice note, three questions",
    body: "Namaste {addressAs}\n\nSite live ho gayi hai aur [what went right for them], sach mein bahut achha laga aapke saath ye project karke.\n\nEk chhoti si request thi. Main apni website par kuch real clients ke words rakhna chahta hoon, banaye hue nahi, sirf asli.\n\nAapko kuch likhna nahi padega. Main 3 chhote sawaal bhej raha hoon, aap voice note mein jawab de dijiye, 2 minute lagenge. Main usko 2-3 lines mein likh kar wapas aapko bhej dunga. Aap \"haan\" bolenge tabhi publish hoga, warna nahi.\n\nBilkul theek hai agar abhi time na ho, bas bata dijiye, main dobara pareshan nahi karunga.\n\nMehdi, Ideovent",
    needs: ["no_s1s2_7d", "not_money_day", "no_decline_90d"], ticks: ["s_testimonial"], asks: true,
  },
  {
    id: "cp_feedback_testimonial_nudge_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "Testimonial-Request-Kit section 2, \"The one nudge\"", src: { file: KIT, from: "upar wala message bhej diya tha", to: "bilkul samajh sakta hoon." },
    label: "Testimonial: the one nudge, three days later",
    body: "{addressAs}, upar wala message bhej diya tha, agar time mile to bas voice note bhej dijiyega, 2 minute ka kaam hai. Aur agar abhi nahi ho pa raha, koi baat nahi, bilkul samajh sakta hoon.",
    needs: ["ask_3d_ago", "no_s1s2_7d", "not_money_day"], asks: true,
  },
  {
    id: "cp_feedback_testimonial_em_en", stage: "support", channel: "email", language: "en", textKind: "S",
    source: "Testimonial-Request-Kit section 3", src: { file: KIT, from: "new site is live and [[SPECIFIC_WIN]]", to: "+91 77619 21786 · contact@ideovent.in · www.ideovent.in" },
    label: "Testimonial: the e-mail ask, three questions",
    subject: "A small request, {greeting}, two minutes",
    body: [
      "Dear {greeting}",
      "Now that {orgName}'s new site is live and [what went right for them], I wanted to say thank you. It was a genuinely good project to work on.",
      "May I ask you for one small thing?",
      "I am building the part of my website that shows what real clients have said about working with Ideovent. I do not write these myself and I do not use invented ones, which means I have none until someone like you helps me.",
      "You do not have to write anything. Below are three short questions. Reply in a line or two each, in whatever words come naturally, or record a voice note on WhatsApp if that is quicker. I will shape your answers into two or three sentences and send them back to you. Nothing is published until you reply to say it is accurate.",
      "1. Before you started with Ideovent, what was the one thing you were most worried about, and what actually happened?\n2. Was there a moment during the work where something went better than you expected?\n3. What is one concrete thing that is different now that the site is live?",
      "If this is not a good time, please just say so. It will not be mentioned again.",
      "With thanks",
      "Mehdi Alam\nIdeovent Technologies\n+91 77619 21786 · contact@ideovent.in · www.ideovent.in",
    ].join("\n\n"),
    needs: ["no_s1s2_7d", "not_money_day", "no_decline_90d", "no_testimonials_yet"], ticks: ["s_testimonial"], asks: true,
  },
  {
    id: "cp_feedback_consent_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "Testimonial-Request-Kit section 5, Hinglish", src: { file: KIT, from: "Main confirm karta/karti hoon", to: "likh dijiye." },
    label: "Testimonial: the consent line, after they approve the wording",
    body: "Main confirm karta/karti hoon ki upar likhe gaye words mere hain, aur Ideovent Technologies inhe mere naam, designation aur {orgName} ke naam ke saath apni website, proposals, printed material aur social media par use kar sakta hai. Jab chahun main contact@ideovent.in par likh kar ise hatwa sakta/sakti hoon, aur {removalDays} working days mein hata diya jayega.\n\nReply mein sirf \"Haan, approved\" likh dijiye.",
    needs: ["quote_approved", "removal_days"],
  },
  {
    id: "cp_feedback_consent_em_en", stage: "support", channel: "email", language: "en", textKind: "E", edits: ["E21"],
    source: "Testimonial-Request-Kit section 5, English, and its reply line (\"Reply mein sirf 'Haan, approved' likh dijiye\") in English", src: { file: KIT, from: "I confirm that the words above are mine", to: "taken down within [[REMOVAL_DAYS]] working days." },
    label: "Testimonial: the consent line (e-mail)",
    // E21: the consent line is the client's statement, so it is quoted, and the e-mail asks for the one-word reply
    // the Kit asks for ("ask for a one-word reply"), as the Hinglish version does. Without them the line, signed
    // "Mehdi Alam", read as Mehdi confirming the words were his.
    subject: "Re: A small request, {greeting}, two minutes", frameHead: "Dear {greeting}\n\n\"{quote}\"", frameTail: SIGN,
    body: "\"I confirm that the words above are mine, and that Ideovent Technologies may publish them together with my name, my designation and the name of {orgName} on its website, in proposals, on printed material and on social media. I understand I can ask for them to be removed at any time by writing to contact@ideovent.in, and that they will be taken down within {removalDays} working days.\"\n\nIf that is right, please reply with just \"Yes, approved\".",
    needs: ["quote_approved", "removal_days"],
  },
  {
    id: "cp_feedback_logo_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "Testimonial-Request-Kit section 7, Hinglish", src: { file: KIT, from: "Ek aur cheez, kya main apne portfolio aur website par", to: "main turant hata dunga." },
    label: "Name and logo permission (a separate permission)",
    body: "Ek aur cheez, kya main apne portfolio aur website par {orgName} ka naam, logo aur site ke screenshots dikha sakta hoon? Sirf ye batane ke liye ki humne aapke liye kaam kiya. Jab chahein aap mana kar sakte hain aur main turant hata dunga.",
    asks: true,
  },
  {
    id: "cp_feedback_review_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "Testimonial-Request-Kit section 6, the Google review request", src: { file: KIT, from: "ek aur chhoti si request, agar aapko kaam theek laga ho", to: "Aur agar mann na ho to koi baat nahi, bilkul." },
    label: "Google review: every client, a different day",
    body: "{addressAs}, ek aur chhoti si request, agar aapko kaam theek laga ho to Google par 2 line likh dijiyega? 30 second ka kaam hai\n\n{googleReviewLink}\n\nJo sach lage wahi likhiyega. Main rating nahi maang raha, honest feedback zyada kaam aata hai. Aur agar mann na ho to koi baat nahi, bilkul.",
    needs: ["no_s1s2_7d", "not_money_day"], ticks: ["s_review"], asks: true,
  },
  {
    id: "cp_feedback_review_em_en", stage: "support", channel: "email", language: "en", textKind: "E", edits: ["E10"],
    source: "Testimonial-Request-Kit section 6, \"The email version\"", src: { file: KIT, from: "Would you consider leaving a short review on Google?", to: "than anything I could write about myself." },
    label: "Google review: every client, a different day (e-mail)",
    subject: "A short review on Google",
    body: "Hello {greeting}\n\nWould you consider leaving a short review on Google? It takes under a minute: {googleReviewLink}\n\nPlease write whatever is accurate; I am not asking for a particular rating. An honest review from a real client is worth considerably more to a small firm than anything I could write about myself.\n\nMehdi Alam · Ideovent Technologies",
    needs: ["no_s1s2_7d", "not_money_day"], ticks: ["s_review"], asks: true,
  },
  {
    id: "cp_feedback_referral_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "E", edits: ["E2", "E11"],
    source: "LEAD-SOURCING-PLAYBOOK section 9.1", src: { file: LSP, from: "ek chhoti si request thi.", to: "aap bata dijiye." },
    label: "Referral: one name, with the option of not being named",
    body: "{addressAs}, ek chhoti si request thi.\n\nJo kaam humne aapke liye kiya, waisa hi kaam main aur do-teen jagah karna chahta hoon. Aap kisi ek aise person ko jaante hain jinko iski zarurat ho?\n\nAap sirf naam bata dijiye, baat main khud kar loonga. Aur agar aap chahein to main aapka naam le kar baat karoon, warna nahi loonga, aap bata dijiye.",
    alt: [{ when: "school", body: "{addressAs}, ek chhoti si request thi.\n\nJo kaam humne aapke liye kiya, waisa hi kaam main aur do-teen jagah karna chahta hoon. Aap kisi ek aise person ko jaante hain jinko iski zarurat ho, koi principal, koi centre owner?\n\nAap sirf naam bata dijiye, baat main khud kar loonga. Aur agar aap chahein to main aapka naam le kar baat karoon, warna nahi loonga, aap bata dijiye." }],
    needs: ["not_money_day", "no_s1s2_7d"], ticks: ["s_referral"], asks: true,
  },
  {
    id: "cp_support_day25_wa_hi", stage: "support", channel: "whatsapp", language: "hinglish", textKind: "S",
    source: "SOP-06 section 10, the day-25 care-plan message (E20 when nothing, or one thing, was reported)", src: { file: SOP06, from: "ko 30-din ka free support window khatam ho raha", to: "Aap sochiye, main push nahi kar raha.", blanked: ["______"] },
    label: "Support day 25: the care plan, once, honestly",
    body: "{addressAs}, {supportEndDate} ko 30-din ka free support window khatam ho raha hai. Abhi tak {issuesCount} cheezein report hui thi, sab theek ho chuki hain.\n\nUske baad do raaste hain, aur dono theek hain:\n\nKuch nahi lena. Site chalti rahegi. Lekin backup Ideovent nahi lega, security updates nahi honge, aur agar kuch toota to hourly basis pe kaam hoga.\n\nCare plan lena. Backup, security updates, uptime monitoring, aur har mahine kuch included hours content changes ke liye. Teen plans hain, details handover document ke section 10 mein hain.\n\nEk practical baat, plan agar in 30 dino ke andar shuru hota hai to seedha continue ho jaata hai, koi gap nahi aur koi dobara audit nahi. Baad mein shuru karein to paid audit lag sakta hai, kyunki main us site ki zimmedari nahi le sakta jo maine mahinon se dekhi hi nahi.\n\nAap sochiye, main push nahi kar raha.",
    // E20: "Abhi tak 0 cheezein report hui thi, sab theek ho chuki hain" would be nonsense, and one item is not "sab".
    alt: [
      { when: "noIssues", body: "{addressAs}, {supportEndDate} ko 30-din ka free support window khatam ho raha hai. Abhi tak koi cheez report nahi hui hai.\n\nUske baad do raaste hain, aur dono theek hain:\n\nKuch nahi lena. Site chalti rahegi. Lekin backup Ideovent nahi lega, security updates nahi honge, aur agar kuch toota to hourly basis pe kaam hoga.\n\nCare plan lena. Backup, security updates, uptime monitoring, aur har mahine kuch included hours content changes ke liye. Teen plans hain, details handover document ke section 10 mein hain.\n\nEk practical baat, plan agar in 30 dino ke andar shuru hota hai to seedha continue ho jaata hai, koi gap nahi aur koi dobara audit nahi. Baad mein shuru karein to paid audit lag sakta hai, kyunki main us site ki zimmedari nahi le sakta jo maine mahinon se dekhi hi nahi.\n\nAap sochiye, main push nahi kar raha." },
      { when: "oneIssue", body: "{addressAs}, {supportEndDate} ko 30-din ka free support window khatam ho raha hai. Abhi tak ek cheez report hui thi, woh theek ho chuki hai.\n\nUske baad do raaste hain, aur dono theek hain:\n\nKuch nahi lena. Site chalti rahegi. Lekin backup Ideovent nahi lega, security updates nahi honge, aur agar kuch toota to hourly basis pe kaam hoga.\n\nCare plan lena. Backup, security updates, uptime monitoring, aur har mahine kuch included hours content changes ke liye. Teen plans hain, details handover document ke section 10 mein hain.\n\nEk practical baat, plan agar in 30 dino ke andar shuru hota hai to seedha continue ho jaata hai, koi gap nahi aur koi dobara audit nahi. Baad mein shuru karein to paid audit lag sakta hai, kyunki main us site ki zimmedari nahi le sakta jo maine mahinon se dekhi hi nahi.\n\nAap sochiye, main push nahi kar raha." },
    ],
    needs: ["no_plan", "issues_closed", "handover_doc_issued"], ticks: ["s_day25"], asks: true,
  },
  {
    id: "cp_support_closing_em_en_exit", stage: "support", channel: "email", language: "en", textKind: "N",
    source: "Spec 7.5, exit (SOP-06 section 10 Day 30; Handover section 2 item 7, section 6)", label: "Day 30: the support window has closed (exit)",
    subject: "{projectName}, the support window has closed",
    body: "Hello {greeting}\n\nThe 30-day support window for {projectName} closed on {supportEndDate}.\n\nReported in that time, and what was done:\n{issuesReported}\n\nLeft open by agreement: {leftOpen}\n\nAs promised, I removed Ideovent's access to your systems on {accessRemovedDate}. From here, support is available under a care plan or at Rs. {hourlyRate} per hour, agreed in writing before any work starts.\n\nThe closing letter is attached for your records. Thank you for working with us.\n\nMehdi Alam · Ideovent Technologies · +91 77619 21786",
    needs: ["access_removed"], attaches: [{ doc: "closing", which: "latest" }], ticks: ["s_close"],
  },
  {
    id: "cp_support_closing_em_en_plan", stage: "support", channel: "email", language: "en", textKind: "N",
    source: "Spec 7.5, care plan (SOP-06 section 10 Day 30; AMC Annexure C)", label: "Day 30: the support window has closed (care plan)",
    subject: "{projectName}, the support window has closed",
    body: "Hello {greeting}\n\nThe 30-day support window for {projectName} closed on {supportEndDate}.\n\nReported in that time, and what was done:\n{issuesReported}\n\nLeft open by agreement: {leftOpen}\n\nYour {carePlan} care plan continues from here, so I keep the access it needs. Requests go to contact@ideovent.in, as the plan sets out.\n\nMehdi Alam · Ideovent Technologies · +91 77619 21786",
    needs: ["plan_paid"], ticks: ["s_close"],
  },

  /* ── Care plan renewals, domain courtesy, win-back ───────────────────── */
  {
    id: "cp_care_t45_em_en", stage: "renewal", channel: "email", language: "en", textKind: "S",
    source: "AMC-SALES-GUIDE section 11, T-45 (AMC cl. 8.7)", src: { file: AMC, from: "Your care plan for [[SITE_URL]] renews on", to: "Ideovent Technologies · +91 77619 21786 · contact@ideovent.in", blanked: ["minus 30 days"] },
    label: "Renewal T-45: the contractual reminder",
    subject: "Renewal on {renewalDate}. Your options",
    body: [
      "Hello {greeting}",
      "Your care plan for {siteUrl} renews on {renewalDate}. You are on the {carePlan} plan at Rs. {carePlanFee}, and unless you tell me otherwise it will renew for another term at that price.",
      "If you would rather not continue, just reply to this email by {renewalNoticeDate} and I will close it out cleanly and send you the full handover pack, backups, credentials and documentation. No notice period games, no hard feelings.",
      "Over the past year: [X] backups taken, [Y] security updates applied, [Z] hours of changes used out of [W] included. Full summary attached.",
      "Mehdi Alam\nIdeovent Technologies · +91 77619 21786 · contact@ideovent.in",
    ].join("\n\n"),
    attaches: [{ byHand: "the year's summary of reports" }], money: true,
  },
  {
    id: "cp_care_t30_em_en", stage: "renewal", channel: "email", language: "en", textKind: "S",
    source: "AMC-SALES-GUIDE section 11, T-30 (the honest recommendation)", src: { file: AMC, from: "Looking at the past year, you used about", to: "tell me which and I will set it up." },
    label: "Renewal T-30: a suggestion for next year",
    subject: "A suggestion for next year",
    body: "Hello {greeting}\n\nLooking at the past year, you used about [X] of your [W] included hours each month. Two honest options:\n\nStay on {carePlan} if you expect more change work this year.\n\nMove down to [tier] at Rs. [tier price] if the pattern stays the same. You would keep the backups and the security updates, which are the parts that actually matter, and pay less.\n\nHappy either way, tell me which and I will set it up.",
    // The source is the body only: signed like every other e-mail (a frame carries no fact).
    frameTail: SIGN, needs: ["can_move_down"], asks: true,
  },
  {
    id: "cp_care_t7_wa_en", stage: "renewal", channel: "whatsapp", language: "en", textKind: "S",
    source: "AMC-SALES-GUIDE section 11, T-7", src: { file: AMC, from: "quick one, the care plan for", to: "All good to go ahead?" },
    label: "Renewal T-7: one line, human",
    body: "Hi {greeting}, quick one, the care plan for {siteUrl} renews on {renewalDate}. Invoice went over last week. All good to go ahead?",
    needs: ["renewal_invoice_7d"],
  },
  {
    id: "cp_care_t0_em_en", stage: "renewal", channel: "email", language: "en", textKind: "N",
    source: "Spec 7.5 (AMC-SALES-GUIDE section 11 T-0 subject; AMC cl. 8)", label: "Renewal T-0: renewed, what is covered",
    subject: "Renewed: here's what's covered until {coveredUntil}",
    body: "Hello {greeting}\n\nYour care plan for {siteUrl} has renewed: {carePlan}, Rs. {carePlanFee}, until {coveredUntil}. What is covered is in the attached Annexure B.\n\nThank you.\n\nMehdi Alam · Ideovent Technologies · +91 77619 21786 · contact@ideovent.in",
    needs: ["renewal_paid"], attaches: [{ byHand: "the new Annexure B" }],
  },
  {
    id: "cp_care_t7grace_em_en", stage: "renewal", channel: "email", language: "en", textKind: "E", edits: ["E12"],
    source: "AMC-SALES-GUIDE section 11, T+7 (the grace note)", src: { file: AMC, from: "ended on [[SUPPORT_END_DATE]] and has not been renewed", to: "no restart fee." },
    label: "Renewal T+7: your cover has paused",
    subject: "Your cover has paused, what that means",
    body: "Hello {greeting}\n\nThe care plan for {siteUrl} ended on {renewalDate} and has not been renewed, so from now: no scheduled backups, no security updates, no uptime monitoring. The site keeps working exactly as it is, nothing has been switched off and nothing has been removed.\n\nTwo things worth doing whichever way you go:\n\n1. Your domain renews on {domainRenewalDate}. Please put it in a calendar. That is the one thing that cannot be undone if it is missed.\n2. Take your own backup, or ask me for the last one I hold. I keep it until {backupDeleteDate} and then delete it, as the agreement requires.\n\nIf you want to restart later, just say: no restart fee.\n\nMehdi",
    needs: ["not_renewed_unpaid"],
  },
  {
    id: "cp_renewal_domain_wa_hi", stage: "renewal", channel: "whatsapp", language: "hinglish", textKind: "N",
    source: "Spec 7.5 (Hosting Terms cl. 7.4; Handover section 9)", label: "Domain renewal: a courtesy reminder, 30 days before",
    body: "{addressAs}, ek yaad dila doon: {domainName} ka domain {renewalDate} ko renew hona hai.\n\nDomain expire ho jaye to website aur email dono usi din band ho jaate hain. Renewal ki details handover document ke section 9 mein hain.\n\nRenew ho jaaye to ek line bata dijiyega.",
    needs: ["handover_doc_issued"],
  },
  {
    id: "cp_renewal_domain_wa_en", stage: "renewal", channel: "whatsapp", language: "en", textKind: "N",
    source: "Spec 7.5", label: "Domain renewal: a courtesy reminder, 30 days before",
    body: "{addressAs}, a reminder: the domain {domainName} renews on {renewalDate}.\n\nIf a domain expires, the website and the e-mail on it stop the same day. The renewal details are in section 9 of your handover document.\n\nPlease send me a line once it is renewed.",
    needs: ["handover_doc_issued"],
  },
  {
    id: "cp_winback_em_en", stage: "exit", channel: "email", language: "en", textKind: "S",
    source: "AMC-SALES-GUIDE section 12, step 2 (the findings, no pitch)", src: { file: AMC, from: "I was doing a sweep of the sites I have built", to: "Happy to fix both, takes about an hour.", blanked: ["______"] },
    label: "Win-back: two things I noticed (no pitch)",
    subject: "{siteUrl}: two things I noticed",
    body: "Hi {greeting}, I was doing a sweep of the sites I have built and noticed two things on {siteUrl}: your SSL certificate expires on [SSL expiry date], and the [platform] version is [how far behind] behind. Neither is urgent. Thought you would want to know.\n\nHappy to fix both, takes about an hour.",
    // {siteUrl} is the site Ideovent built for them ("the sites I have built"), not the one they had before. Signed (a frame carries no fact).
    frameTail: SIGN,
  },
  {
    id: "cp_winback_plan_em_en", stage: "exit", channel: "email", language: "en", textKind: "S",
    source: "AMC-SALES-GUIDE section 12, step 3 (only if they replied)", src: { file: AMC, from: "While I am in there: do you want me to just keep an eye on it", to: "genuinely fine either way." },
    label: "Win-back: the plan, only because they replied",
    subject: "Re: {siteUrl}: two things I noticed",
    body: "While I am in there: do you want me to just keep an eye on it from now on? There is a plan from Rs. {essentialMonthly} a month that covers backups, updates and an hour of changes. Or I can leave it and you call me when you need me, genuinely fine either way.",
    frameTail: SIGN, needs: ["winback_replied"], asks: true,
  },
  {
    id: "cp_abuse_warning_em_en", stage: "any", channel: "email", language: "en", textKind: "S",
    source: "SOP-09 section 4, \"how we continue\" (the single warning, next morning)", src: { file: SOP09, from: "I want to deal with yesterday directly", to: "Tell me which, and I will act on it the same day.", blanked: ["______", "(If they have a real grievance, answer it here, fully and without defensiveness. If they do not, delete this paragraph.)"] },
    label: "Abusive behaviour: the single warning",
    subject: "{projectName}, how we continue",
    body: [
      "Hello {greeting}",
      "I want to deal with yesterday directly rather than let it sit.",
      "On the substance: [their real grievance answered fully, or delete this paragraph].",
      "On the manner: the language used on the call is not something I will continue working under. I am not asking for an apology and I would rather not make this larger than it is. I am asking that we keep our conversations to the work.",
      "If that is possible, I will carry on and finish the project properly; I want to. If it is not, I would rather we stopped now, cleanly: I will invoice the work completed to date, hand over everything you have paid for, and we part without either of us saying anything unpleasant about the other.",
      "Tell me which, and I will act on it the same day.",
      "Mehdi Alam · Ideovent Technologies",
    ].join("\n\n"),
  },
  {
    id: "cp_abuse_terminate_em_en", stage: "any", channel: "email", language: "en", textKind: "S",
    source: "SOP-09 section 4, \"notice of termination\"", src: { file: SOP09, from: "I wrote asking that our conversations stay on the work.", to: "I am sorry it ended here.", blanked: ["______"] },
    label: "Notice of termination (both partners' yes; formal: post too)",
    subject: "{projectName}, notice of termination",
    body: [
      "Hello {greeting}",
      "On {warningDate} I wrote asking that our conversations stay on the work. On [date it happened again] that did not happen.",
      "I am ending our agreement with effect from today under Clause 13.5 of the Service Agreement which permits immediate termination by written notice in these circumstances.",
      "What happens now, and none of it depends on how this ended:",
      "- An invoice for work completed to date is attached, with a statement showing what has been paid.\n- Everything you have paid for in full is handed over: [what is handed over].\n- Your domain, registrar access and DNS control are returned immediately on request, without condition, under the Hosting and Domain Terms. That applies whatever is owed and whatever the dispute.\n- I will delete or return your confidential information under Clause 9.7 on written request.\n- I will not say anything about this to anyone.",
      "I am sorry it ended here.",
      "Mehdi Alam · Ideovent Technologies · Saket, New Delhi",
    ].join("\n\n"),
    needs: ["partners_yes"], formal: true, attaches: [{ byHand: "the invoice for work completed to date, and a statement of what has been paid" }],
  },
];

export const TEMPLATE_BY_ID: Record<string, ClientTemplate> = Object.fromEntries(CLIENT_TEMPLATES.map((t) => [t.id, t]));

/** "cp_welcome_wa" for cp_welcome_wa_hi and cp_welcome_wa_en: one message in two languages. */
export const familyOf = (id: string) => id.replace(/_(hi|en)$/, "");

/** The language twin of a template, if one exists. */
export function twinOf(t: ClientTemplate): ClientTemplate | null {
  const other = t.id.endsWith("_hi") ? t.id.replace(/_hi$/, "_en") : t.id.endsWith("_en") ? t.id.replace(/_en$/, "_hi") : "";
  return (other && TEMPLATE_BY_ID[other]) || null;
}

/** The templates that tick an item. */
export const templatesFor = (itemId: string) => CLIENT_TEMPLATES.filter((t) => (t.ticks || []).includes(itemId));

/** A template whose words are new or edited: "New wording" until Mehdi approves it. */
export const needsApproval = (t: ClientTemplate) => t.textKind !== "S";

/** The messages listed on a stage card (the stage's own and the any-stage ones that fit it). */
export function stageTemplates(stage: StageId): ClientTemplate[] {
  const own = CLIENT_TEMPLATES.filter((t) => t.stage === stage);
  const anyFits: Record<StageId, string[]> = {
    proposal: [],
    agreement: ["cp_invoice_m1_em_en", "cp_payment_part_wa_en", "cp_payment_receipt_em_en", "cp_chase_d3_wa_hi", "cp_chase_d10_em_en"],
    welcome: ["cp_payment_receipt_em_en"],
    kickoff: ["cp_confirm_convert_wa_hi", "cp_password_received_wa_hi", "cp_chase_d3_wa_hi", "cp_chase_d10_em_en", "cp_cr_yes_wa_hi", "cp_cr_shelf_wa_hi", "cp_cr_send_em_en"],
    content: ["cp_chase_d3_wa_hi", "cp_chase_d10_em_en", "cp_chase_d15_wa_hi", "cp_chase_d45_em_en", "cp_slip_client_wa_hi", "cp_access_request_wa_hi", "cp_access_request_wa_en", "cp_password_received_wa_hi", "cp_confirm_convert_wa_hi"],
    design: ["cp_confirm_convert_wa_hi", "cp_chase_d3_wa_hi", "cp_chase_d10_em_en", "cp_chase_d15_wa_hi", "cp_cr_yes_wa_hi", "cp_cr_shelf_wa_hi", "cp_cr_send_em_en", "cp_slip_client_wa_hi", "cp_slip_own_em_en"],
    build: ["cp_cr_yes_wa_hi", "cp_cr_shelf_wa_hi", "cp_cr_send_em_en", "cp_slip_client_wa_hi", "cp_slip_own_em_en", "cp_chase_d3_wa_hi", "cp_chase_d10_em_en", "cp_chase_d15_wa_hi", "cp_chase_d45_em_en"],
    review: ["cp_confirm_convert_wa_hi", "cp_slip_client_wa_hi", "cp_slip_own_em_en", "cp_cr_send_em_en", "cp_chase_d3_wa_hi"],
    launch: ["cp_invoice_m1_em_en", "cp_payment_part_wa_en", "cp_payment_receipt_em_en", "cp_slip_own_em_en"],
    handover: ["cp_password_received_wa_hi"],
    support: ["cp_abuse_warning_em_en"],
    aftercare: ["cp_invoice_m1_em_en", "cp_payment_receipt_em_en", "cp_winback_em_en"],
  };
  const extra = anyFits[stage].map((id) => TEMPLATE_BY_ID[id]).filter(Boolean);
  return [...own, ...extra.filter((t) => !own.includes(t))];
}
