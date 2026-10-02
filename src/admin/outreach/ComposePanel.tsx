import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Ban, Check, Copy, Mail, MessageCircle, Monitor, MoreHorizontal, PhoneCall, Reply } from "lucide-react";
import { demoStatus } from "@/lib/demo/record";
import { LANGUAGE_LABELS, carriesPreview, fieldsUsed, stageLabel, type TemplateChannel } from "@/lib/outreach/templates";
import { previewFor } from "@/lib/outreach/preview";
import {
  OBSERVATIONS,
  callSlots,
  checkSend,
  demoFacts,
  followUpDate,
  formatCallSlots,
  leadWhatsappNumber,
  mailtoUrl,
  dailyWhatsappLimit,
  observationsFor,
  render,
  whatsappUrl,
  whatsappWebUrl,
} from "@/lib/outreach/engine";
import { isIndianMobile, sameContact } from "@/lib/outreach/store";
import type { OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { firstWhatsappToday } from "./derive";
import { DemoPicker, leadDemo, useLeadDemoSites } from "./DemoPicker";
import { callDoneChanges, looksLikeNote, otherLeadsNamed, rankTemplates, repliedChanges, startingObservation } from "./compose";
import { PLAIN_STAGE_LABELS, plainStageOf, stageName, suggestFor } from "./stages";
import { blanksIn, fillBlanks, listBlanks, piecesOf } from "./placeholders";
import { StageStrip, type StageChoice } from "./StageStrip";
import { MessageBox } from "./MessageBox";
import { windowText } from "./callScript";
import { btnGhost, inputCls, prettyPhone, summaryCls } from "./ui";
import { cn } from "@/lib/utils";

/** A manual edit of the preview, and the exact render it was made on. */
interface Edit {
  key: string;
  base: string;
  subject: string;
  body: string;
}

/** What Mehdi typed into the [blank] fields, and the exact text (render or edit) it belongs to. */
interface Fills {
  key: string;
  base: string;
  values: Record<string, string>;
}

/**
 * Manual edits and filled blanks by lead id, for this tab only. The panel is
 * keyed by lead.id, so its state dies when Mehdi steps to another lead;
 * without this, coming back threw his edit away with no warning. An entry is
 * only ever read back for the same lead, and only shown while channel,
 * template and text still match (the same rule as the live edit), so it can
 * never reach another lead. Memory only, never storage: a reload starts from
 * the template again.
 */
const drafts = new Map<string, Edit>();
const fillDrafts = new Map<string, Fills>();

/** Statuses that start a new stage of their own (After they say yes, After the call, Proposal). */
const ENGAGED = new Set<OutreachLead["status"]>(["replied", "demo_opened", "call", "proposal"]);

/**
 * THE LEAD SCREEN'S THREE STEPS: 1 Demo, 2 Message, 3 Send.
 *
 * EVERY STAGE IN PLAIN WORDS (30 Sep 2026, the approved wording). Step 2 opens
 * with the six stages (First message, After they say yes, Follow-up, After the
 * call, Proposal, Closing; stages.ts), starts on the one this lead is at on
 * this channel and marks it "now"; the message that fits the lead best is
 * picked and tagged Suggested. The text below is the message as it will go,
 * merge fields filled for this lead ({offer} from what its demo really has,
 * {callSlots} from the Call times field). Every [blank] in it is highlighted
 * and gets a box (MessageBox); the engine judges the text on screen, so Send
 * stays off until each blank is filled. Once the no-reply messages on a
 * channel are used up (WhatsApp's one follow-up, the closing e-mail), no more
 * cold messages go there.
 *
 * WHY EVERYTHING HERE BELONGS TO ONE LEAD (the 28 Sep 2026 bug). Mehdi saw
 * the name of the last of 30 imported leads (a real institute) in every lead's
 * email. The old panel kept its own copy of the observation in state,
 * initialised once from the first lead it was mounted with, and on send wrote
 * that copy back into the lead on screen. So one stale sentence was carried
 * into the next lead's message and then SAVED into that lead, and from there
 * into every message after it. Now:
 *   - the lead screen mounts this panel with key={lead.id}, so no state
 *     survives a change of lead;
 *   - subject and body are derived from the render on every paint, never
 *     copied into state by an effect; a manual edit is kept only while the
 *     lead, channel, template and underlying render are the ones it was made
 *     on (a new template or channel starts again from the template);
 *   - the observation is written back to the lead only when Mehdi picked one
 *     here, never as a side effect of sending;
 *   - a send is blocked while the text names another lead.
 *
 * The send buttons are real links (<a target="_blank">), not window.open
 * after an await, so no popup blocker stops them and a long-press on a phone
 * offers "open in WhatsApp". Clicking one records the send: a 'sent' event,
 * status Contacted if it was New, lastContactedAt, and the next follow-up
 * date from the ladder. Nothing is sent from here; Mehdi presses Send in
 * his mail app or WhatsApp.
 *
 * E-MAIL GOES THROUGH THE MAIL APP ONLY (Mehdi, 28 Sep 2026: "open in Gmail
 * hata do, sirf open with mail app"). The one e-mail button is a mailto: link
 * (to, subject, body) to the computer's default mail app. "Copy e-mail text"
 * sits beside it (subject and body). Some mail apps cut a mailto: link past
 * about 2,000 characters, so when the link is longer than MAILTO_SAFE_LENGTH
 * the button also copies the full text of the e-mail (the body, the part a
 * mail app cuts) and one short line says so. The old "Gmail account" setting
 * (senderGmail) may still be stored; nothing reads it (the engine's
 * free-mailbox warning that did was removed on 30 Sep 2026).
 *
 * THE PICTURE (1 Oct 2026, src/lib/outreach/preview.ts). A first WhatsApp to a
 * clinic, school or coaching institute that says the sample is made carries
 * one link, its kind's picture page, which WhatsApp shows as a picture card.
 * Under the text, the picture itself (CreativeCard in MessageBox): Copy image
 * (a PNG; Ctrl+V in WhatsApp Web attaches it), Share (the phone's share sheet
 * with the picture and the text; it records the send unless Open in WhatsApp
 * already did) and Download. The twin that offers to make a sample has no
 * picture, since the picture says the sample is built, and the box says so.
 */
export function ComposePanel({ lead, next }: { lead: OutreachLead; next?: { name: string; open: () => void } }) {
  const { leads, events, settings, saveLead, addEvent } = useOutreach();
  const demo = leadDemo(lead, useLeadDemoSites());

  const hasMail = Boolean(lead.email);
  const waNumber = leadWhatsappNumber(lead);
  const hasWa = Boolean(waNumber);
  // Start on the channel this lead was last messaged on (a follow-up goes where
  // the first message went: an e-mailed lead opened on WhatsApp showed a
  // blocked "first message" there), else WhatsApp when there is a number.
  const [channel, setChannel] = useState<TemplateChannel>(() => {
    const last = events
      .filter((e) => e.leadId === lead.id && e.type === "sent" && (e.channel === "email" || e.channel === "whatsapp"))
      .sort((a, b) => (a.at < b.at ? 1 : -1))[0]?.channel;
    if (last === "email" && hasMail) return "email";
    if (last === "whatsapp" && hasWa) return "whatsapp";
    // A landline (+91 641...) cannot take a WhatsApp unless it is a Business
    // account: start on Email (with no address, step 3 offers a call instead).
    if (hasWa && !isIndianMobile(waNumber)) return "email";
    return hasWa ? "whatsapp" : "email";
  });
  const [choice, setChoice] = useState<StageChoice | null>(null);
  const [templateId, setTemplateId] = useState("");
  // A saved observation that names ANOTHER lead is what the 28 Sep bug wrote into leads: never start from it.
  const [observation, setObservation] = useState(() => {
    const o = startingObservation(lead);
    return otherLeadsNamed(o, lead, leads).length ? "" : o;
  });
  const [obsTouched, setObsTouched] = useState(false);
  const [edit, setEditState] = useState<Edit | null>(() => drafts.get(lead.id) ?? null);
  const setEdit = (e: Edit) => {
    drafts.set(lead.id, e);
    setEditState(e);
  };
  const [fillState, setFillState] = useState<Fills | null>(() => fillDrafts.get(lead.id) ?? null);
  // Call times Mehdi typed for {callSlots}, for one channel and template of this lead.
  const [slotState, setSlotState] = useState<{ key: string; text: string } | null>(null);
  const [sentNow, setSentNow] = useState(false);
  // The lead, channel and template of the last send recorded here: Share records a send only when it is not this one again.
  const [sentKey, setSentKey] = useState("");
  // A reply, a call or a proposal marked anywhere (the menu below, the call script card, the status
  // buttons) moves the lead to a new stage, so a stage pinned by the last send is let go. A send's own
  // New to Contacted is not one of these: that pin is what stops a second tap sending the follow-up.
  const [statusSeen, setStatusSeen] = useState(lead.status);
  if (statusSeen !== lead.status) {
    setStatusSeen(lead.status);
    if (ENGAGED.has(lead.status)) {
      setChoice(null);
      setTemplateId("");
    }
  }

  const waToday = firstWhatsappToday(events);
  const waLimit = dailyWhatsappLimit(settings);
  // Only a landline and no email: the way in is a phone call.
  const landlineOnly = !hasMail && hasWa && !isIndianMobile(waNumber);
  // The stage: the lead's own (its status, then the no-reply sends on this channel) unless Mehdi picked one.
  const suggestion = suggestFor(lead, events, channel);
  const current: StageChoice = choice ?? { plain: plainStageOf(suggestion.stage), stage: suggestion.stage };
  const ranked = current.stage ? rankTemplates({ lead, channel, stage: current.stage, settings, waToday, observation: observation.trim() }) : [];
  const template = ranked.find((t) => t.id === templateId) || ranked[0];
  const short = ranked.slice(0, 3);
  if (template && !short.includes(template)) short.push(template);

  // The render is ALWAYS for this lead; the observation is passed explicitly
  // (even when empty) so a research note on the lead never slips in. The demo's
  // facts go with it, so {offer} names only what this lead's demo really has.
  // {callSlots}: the two call times the engine proposes, unless Mehdi typed his own.
  const editKey = `${lead.id}|${channel}|${template?.id || ""}`;
  const usesSlots = Boolean(template && fieldsUsed(template).includes("callSlots"));
  const ownSlots = slotState && slotState.key === editKey ? slotState.text : "";
  const rendered = template
    ? render(template, lead, { signature: settings.signature, observation: observation.trim(), demo: demoFacts(demo), callSlots: ownSlots || undefined })
    : null;
  const proposedSlots = template && usesSlots ? formatCallSlots(callSlots(template.kind !== "any" ? template.kind : lead.kind), template.language) : "";
  const base = `${rendered?.subject || ""}\n${rendered?.body || ""}`;
  const own = edit && edit.key === editKey && edit.base === base ? edit : null;
  const baseSubject = own ? own.subject : rendered?.subject || "";
  const baseBody = own ? own.body : rendered?.body || "";
  // [Blanks] filled in the boxes under the text go into it; a box's value is kept only for the text it was typed for.
  const textBase = `${baseSubject}\n${baseBody}`;
  const fills = fillState && fillState.key === editKey && fillState.base === textBase ? fillState.values : {};
  const subject = fillBlanks(baseSubject, fills);
  const body = fillBlanks(baseBody, fills);
  const blanks = blanksIn(textBase);
  // An edit is made on the text as shown, filled blanks included, so it keeps them.
  const change = (next: { subject?: string; body?: string }) =>
    setEdit({ key: editKey, base, subject: next.subject ?? subject, body: next.body ?? body });
  const fill = (name: string, value: string) => {
    const f = { key: editKey, base: textBase, values: { ...fills, [name]: value } };
    fillDrafts.set(lead.id, f);
    setFillState(f);
  };

  const pickChannel = (c: TemplateChannel) => {
    setChannel(c);
    setTemplateId("");
    setChoice(null);
  };
  const pickObservation = (v: string) => {
    setObservation(v);
    setObsTouched(true);
  };

  /* ── Checks ─────────────────────────────────────────────────────────── */
  const duplicateOf = leads.find((l) => l.id !== lead.id && (sameContact(l, { phone: lead.phone, email: lead.email }) || sameContact(l, { phone: lead.whatsapp })));
  // The engine checks the text on screen, the one that is sent (edits and filled blanks in it): a
  // [blank] left in it, or a link typed into a message that must not carry one, blocks the send.
  const check = template
    ? checkSend({ ...lead, observation: observation.trim() }, template, channel, settings, waToday, new Date(), { duplicateOf, text: { subject, body } })
    : { ok: false, blockers: [`There is no ${channel === "email" ? "e-mail" : "WhatsApp"} message at this stage. Pick another stage${channel === "whatsapp" ? " or switch to Email" : ""}.`], warnings: [] as string[] };
  const text = `${subject}\n${body}`;
  const unfilled = blanksIn(text);
  const blockers = [...check.blockers];
  // Said once: the engine's own "Fill in [..]" when it gave one, this screen's otherwise.
  if (unfilled.length && !blockers.some((b) => /fill in \[/i.test(b))) blockers.push(`Fill in ${listBlanks(unfilled)} before sending.`);
  const leftover = [...new Set(text.match(/\{[A-Za-z]\w*\}/g) || [])];
  if (leftover.length) blockers.push(`The text still has ${leftover.join(", ")}: a merge field that was not filled. Replace it with the words before sending.`);
  // "One unanswered message a day" is about cold messages; after a yes or a call the lead expects the next one.
  const engaged = Boolean(template) && !["first", "follow_up", "closing"].includes(plainStageOf(template?.stage));
  // The approved rules: one WhatsApp follow-up, up to three e-mail follow-ups, then stop. Once they are
  // used up on this channel, no more cold messages there (a second tap on the message just sent still works).
  if (template && !engaged && suggestion.done && !sentNow) blockers.push(suggestion.done);
  const warnings = [...check.warnings.filter((w) => !(engaged && /last 24 hours/i.test(w))), ...(rendered?.warnings || []).filter((w) => !isBlankRule(w))];
  if (channel === "email" && !hasMail) blockers.push(landlineOnly ? "No email address for this lead. Call the landline, or add an email with Edit." : "This lead has no email address. Add one with Edit.");
  if (channel === "whatsapp" && !hasWa) blockers.push("This lead has no WhatsApp or phone number. Add one with Edit.");
  if (channel === "whatsapp" && hasWa && !isIndianMobile(waNumber)) warnings.push("This number does not look like an Indian mobile, so WhatsApp may not reach it.");
  if (/\/site\/[a-z0-9-]+/i.test(text) && demo && demoStatus(demo) !== "sent") {
    blockers.push("The demo is not marked sent, so its link shows a 404. Tap Mark sent in step 1 first.");
  }
  const others = otherLeadsNamed(text, lead, leads);
  if (others.length) {
    blockers.push(`This message names another lead (${others.map((o) => o.instituteName).join(", ")}). Fix the text or the observation before sending.`);
  }
  if (template && !body.trim()) blockers.push("The message is empty.");
  const blocked = blockers.length > 0;
  const uniqueWarnings = [...new Set(warnings)];

  /* ── Links: built from THIS lead and the text on screen, every render ─ */
  const links =
    channel === "email"
      ? { primary: mailtoUrl({ to: lead.email || "", subject, body }), secondary: "" }
      : { primary: whatsappUrl(waNumber, body), secondary: whatsappWebUrl(waNumber, body) };
  // Past about 1,900 characters some mail apps cut a mailto: link, so the body is copied as well.
  const longMail = channel === "email" && links.primary.length > MAILTO_SAFE_LENGTH;
  const [copied, setCopied] = useState<"" | "text" | "body">("");
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(""), 4000);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copyMail = async () => {
    if (await copyToClipboard(`Subject: ${subject}\n\n${body}`)) setCopied("text");
  };

  const recordSend = async (how: string) => {
    if (!template) return;
    // Pin what was just sent. Without this the send itself moves the suggested
    // stage on (one more send on this channel), so the screen flipped to the
    // Follow-up text and dropped any edit; a second tap (mail app closed,
    // popup lost) would then have sent the follow-up instead of this message.
    setChoice({ plain: plainStageOf(template.stage), stage: template.stage });
    setTemplateId(template.id);
    const now = new Date();
    const due = followUpDate(template.stage, now);
    await addEvent({
      leadId: lead.id,
      type: "sent",
      channel,
      templateId: template.id,
      detail: `${channel === "whatsapp" ? "WhatsApp" : "Email"} opened in ${how} (${stageName(template.stage)}): ${template.label}${subject ? `, "${subject}"` : ""}`,
    });
    await saveLead({
      ...lead,
      status: lead.status === "new" ? "contacted" : lead.status,
      lastContactedAt: now.toISOString(),
      nextActionAt: Number.isNaN(due.getTime()) ? lead.nextActionAt : due.toISOString(),
      ...(obsTouched ? { observation: observation.trim() || undefined } : {}),
      language: lead.language || template.language,
    });
    setSentNow(true);
    setSentKey(editKey);
  };

  /* ── What happened (the small menu under Send) ─────────────────────── */
  // Both move the lead to a new stage, so a stage pinned by the last send is let go.
  const replied = async () => {
    const c = repliedChanges(lead);
    await addEvent(c.event);
    await saveLead(c.lead);
    setChoice(null);
    setTemplateId("");
  };
  const callDone = async () => {
    const c = callDoneChanges(lead);
    await addEvent(c.event);
    await saveLead(c.lead);
    setChoice(null);
    setTemplateId("");
  };
  const doNotContact = async () => {
    if (!confirm(`Mark ${lead.instituteName} as not interested? Every send button for them will be blocked.`)) return;
    await addEvent({ leadId: lead.id, type: "status", detail: "Not interested: do not contact again." });
    await saveLead({ ...lead, status: "do_not_contact", nextActionAt: undefined });
  };

  const sendLink = (href: string, how: string, label: string, Icon: typeof Mail, primary: boolean, testid: string, alsoOnClick?: () => void) => {
    const cls = primary
      ? "flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground"
      : "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm";
    return blocked ? (
      <button type="button" disabled className={cn(cls, "cursor-not-allowed opacity-40")} data-testid={testid}>
        <Icon className="h-5 w-5" aria-hidden="true" /> {label}
      </button>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testid}
        onClick={() => {
          alsoOnClick?.();
          void recordSend(how);
        }}
        className={cn(cls, primary ? "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : "hover:bg-muted")}>
        <Icon className="h-5 w-5" aria-hidden="true" /> {label}
      </a>
    );
  };

  const obsKnown = OBSERVATIONS.some((o) => o.id === observation);
  // The picker offers what fits this lead's kind (a dental clinic gets the booking and treatment
  // ones, a school never does); an id saved earlier from outside that list still shows as picked.
  const obsOptions = observationsFor(lead.kind);
  if (obsKnown && !obsOptions.some((o) => o.id === observation)) obsOptions.push(OBSERVATIONS.find((o) => o.id === observation)!);
  const saved = (lead.observation || "").trim();
  const savedForeign = otherLeadsNamed(saved, lead, leads).length > 0;
  const note = looksLikeNote(saved) || savedForeign ? saved : "";
  const usesObservation = Boolean(template && /\{observation\}/.test(`${template.subject || ""}${template.body}`));
  const isEmail = channel === "email";

  /* ── The picture (1 Oct 2026, preview.ts) ───────────────────────────── */
  // Under a first WhatsApp that carries the picture link: the picture of the kind the link is for (the
  // template's own kind, as render() picks it). A kind without one (any other business) shows nothing.
  const pictureKind = template ? (template.kind !== "any" ? template.kind : lead.kind) : undefined;
  const firstWa = !isEmail && template?.stage === "first";
  const picturePage = firstWa && template && carriesPreview(template) ? previewFor(pictureKind) : undefined;
  const picture = picturePage
    ? { page: picturePage, shareBlocked: blocked, onShared: () => { if (sentKey !== editKey) void recordSend("the share sheet"); } }
    : null;
  // The twin that offers to make a sample has none: the picture says the sample website is already built.
  const pictureNote = firstWa && template?.sample === "offer" && previewFor(pictureKind)
    ? "No picture with this message: the picture says the sample website is already built. Make the demo in step 1 and the message that says so, with the picture, comes up."
    : "";

  return (
    <div className="space-y-8" data-testid="compose">
      <Step n={1} title="Demo">
        <DemoPicker lead={lead} />
      </Step>

      <Step
        n={2}
        title="Message"
        aside={
          <div className="inline-flex rounded-full bg-muted p-1" role="tablist" aria-label="Channel">
            {([
              ["email", "Email", Mail, hasMail],
              ["whatsapp", "WhatsApp", MessageCircle, hasWa],
            ] as const).map(([c, label, Icon, has]) => (
              <button key={c} type="button" role="tab" aria-selected={channel === c} onClick={() => pickChannel(c)}
                title={has ? undefined : `No ${c === "email" ? "email address" : "number"} for this lead`}
                className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium", channel === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground", !has && "line-through decoration-1")}>
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        }
      >
        <StageStrip channel={channel} kind={lead.kind} current={current} suggested={suggestion}
          onPick={(c) => {
            setChoice(c);
            setTemplateId("");
          }} />

        <div className="mt-5">
          <p className="mb-1.5 text-sm font-medium" data-testid="stage-now">
            {current.stage ? stageLabel(current.stage, channel) : PLAIN_STAGE_LABELS[current.plain]}
            <span className="font-normal text-muted-foreground">{choice ? ", picked by you" : ", where this lead is now"}</span>
          </p>
          <TemplateList items={short} selected={template?.id} suggested={ranked[0]?.id} onPick={setTemplateId} />
          {ranked.length > short.length && (
            <details className="mt-1">
              <summary className={summaryCls}>More templates for this stage ({ranked.length})</summary>
              <div className="mt-2 rounded-xl bg-muted/40 p-2">
                <TemplateList items={ranked} selected={template?.id} suggested={ranked[0]?.id} onPick={setTemplateId} />
              </div>
            </details>
          )}
        </div>

        {/* After a yes, a call or a proposal the checked problem is not said again: the picker shows only where a message uses it. */}
        <div className={cn("mt-4", engaged && !usesObservation && "hidden")} data-testid="obs-field">
          <label htmlFor="obs-pick" className="block text-sm font-medium">
            What you noticed on their site{" "}
            <span className="font-normal text-muted-foreground">{usesObservation ? "(this message uses it)" : "(optional)"}</span>
          </label>
          <select id="obs-pick" className={inputCls} value={obsKnown || !observation ? observation : "__custom"}
            onChange={(e) => pickObservation(e.target.value === "__custom" ? " " : e.target.value)}>
            <option value="">Nothing picked</option>
            {obsOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            <option value="__custom">Type my own sentence</option>
          </select>
          {!obsKnown && observation !== "" && (
            <input aria-label="Your own sentence" className={inputCls} value={observation.trimStart()} onChange={(e) => pickObservation(e.target.value || " ")} placeholder="One sentence about what you saw on their site" />
          )}
          {note && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {savedForeign ? "Saved observation names another lead, so it is not used: " : "Your research note, never sent: "}
              {note}
            </p>
          )}
        </div>

        {template && usesSlots && (
          <div className="mt-4">
            <label htmlFor="call-slots" className="block text-sm font-medium">
              Call times in the message <span className="font-normal text-muted-foreground">(you can change them)</span>
            </label>
            <input id="call-slots" className={inputCls} value={slotState && slotState.key === editKey ? slotState.text : proposedSlots}
              placeholder={proposedSlots} onChange={(e) => setSlotState({ key: editKey, text: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground" data-testid="call-slots-hint">
              Proposed: {windowText(template.kind !== "any" ? template.kind : lead.kind)}, the next two working days, never on a Sunday. Type other times and the message follows.
            </p>
          </div>
        )}
        {template && (
          <MessageBox isEmail={isEmail} subject={subject} body={body} pieces={piecesOf(baseBody, fills)} blanks={blanks} fills={fills}
            onSubject={(v) => change({ subject: v })} onBody={(v) => change({ body: v })} onFill={fill} now={new Date()}
            picture={picture} pictureNote={pictureNote} />
        )}
      </Step>

      <Step n={3} title="Send">
        <p className="mb-3 break-words text-sm" data-testid="send-to">
          To <span className="font-medium">{lead.instituteName}</span>: {isEmail ? lead.email || "no email" : prettyPhone(waNumber) || "no number"}
        </p>
        {blockers.length > 0 && (
          <ul role="alert" aria-label="Blocked" className="mb-3 space-y-1.5 text-sm text-destructive">
            {blockers.map((b) => (
              <li key={b} className="flex gap-2"><Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{b}</span></li>
            ))}
          </ul>
        )}
        {uniqueWarnings.length > 0 && (
          <ul aria-label="Warnings" className="mb-3 space-y-1.5 text-sm text-muted-foreground">
            {uniqueWarnings.map((w) => (
              <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" /><span>{w}</span></li>
            ))}
          </ul>
        )}
        {isEmail && landlineOnly ? (
          <a href={`tel:${waNumber}`} data-testid="call-landline"
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <PhoneCall className="h-5 w-5" aria-hidden="true" /> Call {prettyPhone(waNumber)}
          </a>
        ) : isEmail ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              {sendLink(links.primary, "email app", "Open in mail app", Mail, true, "open-mailto", longMail ? () => void copyToClipboard(body).then((ok) => ok && setCopied("body")) : undefined)}
            </div>
            <button type="button" onClick={() => void copyMail()} disabled={blocked} data-testid="copy-email"
              className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
              {copied === "text" ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied === "text" ? "Copied" : "Copy e-mail text"}
            </button>
          </div>
        ) : (
          sendLink(links.primary, "WhatsApp", "Open in WhatsApp", MessageCircle, true, "open-whatsapp")
        )}
        {isEmail && template && ["follow_up", "closing"].includes(plainStageOf(template.stage)) && (
          <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground" data-testid="thread-hint">
            A follow-up goes as a reply in the same thread: open your last e-mail to them, press Reply there and paste this text (Copy e-mail text copies it). Open in mail app starts a new e-mail.
          </p>
        )}
        {longMail && !blocked && (
          <p className="mt-2 text-center text-xs text-muted-foreground" data-testid="long-mail-note">
            {copied === "body"
              ? "The full text was also copied. If your mail app cut the e-mail, paste it in."
              : "Long e-mail: opening it also copies the full text, in case your mail app cuts it."}
          </p>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {isEmail && landlineOnly
            ? "Their number is a landline and there is no email: call them, then use Call done below."
            : "The text is typed for you. You press Send there."}
          <span role="status" className="sr-only">{copied === "text" ? "E-mail text copied." : copied === "body" ? "The full e-mail text was also copied." : ""}</span>
          {!isEmail && (waLimit !== null ? ` First WhatsApp messages today: ${waToday} of ${waLimit}.` : ` ${waToday} first WhatsApp ${waToday === 1 ? "message" : "messages"} sent today.`)}
        </p>

        {sentNow && next && (
          <button type="button" onClick={next.open} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-primary/40 px-4 text-sm font-medium text-primary hover:bg-primary/5">
            Next lead: {next.name} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <details className="mt-3">
          <summary className={cn(summaryCls, "justify-center")}>
            <span className="inline-flex items-center gap-1.5"><MoreHorizontal className="h-4 w-4" aria-hidden="true" /> More options</span>
          </summary>
          <div className="mx-auto mt-1 max-w-sm rounded-xl border border-border/70 bg-card p-1">
            {!isEmail && sendLink(links.secondary, "WhatsApp Web", "Open in WhatsApp Web", Monitor, false, "open-whatsapp-web")}
            <button type="button" className={menuItem} onClick={() => void replied()}><Reply className="h-5 w-5" aria-hidden="true" /> They replied</button>
            <button type="button" className={menuItem} onClick={() => void callDone()}><PhoneCall className="h-5 w-5" aria-hidden="true" /> Call done</button>
            <button type="button" className={cn(menuItem, "text-destructive")} onClick={() => void doNotContact()}><Ban className="h-5 w-5" aria-hidden="true" /> Not interested</button>
          </div>
        </details>
      </Step>
    </div>
  );
}

/** Past this length some mail apps cut a mailto: link (a common limit is about 2,000 characters). */
const MAILTO_SAFE_LENGTH = 1900;

/** Copies text; falls back to a hidden textarea where the Clipboard API is missing or refused. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* try the old way */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

const menuItem = "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** One numbered step: the number, a title, an optional control on the right, the content. */
function Step({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  const id = `step-${n}`;
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id={id} className="flex items-center gap-2.5 text-base font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">{n}</span>
          {title}
        </h3>
        {aside}
      </div>
      <div className="sm:pl-[2.375rem]">{children}</div>
    </section>
  );
}

/**
 * A rule from the engine about [blanks]. This screen judges blanks on the text
 * that is sent, with the boxes' values in it (see the blockers above), so the
 * engine's reading of the bare template is not shown twice or wrongly.
 */
function isBlankRule(message: string): boolean {
  return /placeholder|unfilled|\bblanks?\b|\[[^\]\n]+\]/i.test(message);
}

/** Templates as a short radio list: the label, its language, "suggested" on the one that fits this lead best. */
function TemplateList({ items, selected, suggested, onPick }: { items: { id: string; label: string; language: keyof typeof LANGUAGE_LABELS; note?: string }[]; selected?: string; suggested?: string; onPick: (id: string) => void }) {
  if (!items.length) return <p className="text-sm text-muted-foreground" data-testid="template-list-empty">No message for this stage on this channel.</p>;
  return (
    <ul className="space-y-1" role="radiogroup" aria-label="Template" data-testid="template-list">
      {items.map((t) => {
        const on = t.id === selected;
        return (
          <li key={t.id}>
            <button type="button" role="radio" aria-checked={on} data-template-id={t.id} onClick={() => onPick(t.id)}
              className={cn("flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm", on ? "bg-primary/10 text-foreground" : "hover:bg-muted")}>
              <span className={cn("mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full border-2", on ? "border-primary bg-primary shadow-[inset_0_0_0_2px_hsl(var(--background))]" : "border-muted-foreground/50")} aria-hidden="true" />
              <span className="min-w-0">
                <span className={cn("block", on && "font-medium")}>
                  {t.label}
                  {t.id === suggested && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[11px] font-semibold text-primary" data-testid="suggested-tag">Suggested</span>}
                </span>
                <span className="block text-xs text-muted-foreground">{LANGUAGE_LABELS[t.language]}{on && t.note ? `. ${t.note}` : ""}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
