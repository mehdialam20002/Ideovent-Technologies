import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Ban, Check, Copy, Mail, MessageCircle, Monitor, MoreHorizontal, PhoneCall, Reply } from "lucide-react";
import type { DemoSite } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
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
import { DemoPicker, leadDemo } from "./DemoPicker";
import { callDoneChanges, looksLikeNote, otherLeadsNamed, rankTemplates, repliedChanges, startingObservation } from "./compose";
import { PLAIN_STAGE_LABELS, plainStageOf, stageName, suggestFor } from "./stages";
import { blanksIn, fillBlanks, listBlanks, piecesOf } from "./placeholders";
import { StageStrip, type StageChoice } from "./StageStrip";
import { MessageBox } from "./MessageBox";
import { windowText } from "./callScript";
import { btnGhost, inputCls, prettyPhone, summaryCls } from "./ui";
import { cn } from "@/lib/utils";
import { getTemplate, linkTwinOf } from "@/lib/outreach/templates";
import { TEAM_LINK_REASON, carriesDemoLink, coldLinkReason, demoNamedFor, foreignDemoSlugs, linkHint, linkWentOn, offersLink, pointBackReason, sendVariant, type LinkChoiceValue } from "@/lib/outreach/linkChoice";
import { zohoComposeLink } from "@/lib/outreach/mailLinks";
import { useDemoLink } from "./useDemoLink";
import { LinkChoice, readWaLinkChoice, writeWaLinkChoice } from "./LinkChoice";

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
 * Zoho Mail, his mail app or WhatsApp. One exception (2 Oct 2026): while the
 * text carries a draft demo's link, Mehdi's click opens the tab blank, inside
 * the click, and navigates it once the demo is on the website
 * (publishThenOpen); if that write fails the tab closes and nothing is
 * recorded.
 *
 * E-MAIL: ZOHO MAIL FIRST (2 Oct 2026, Mehdi: "ek option dedo open in zoho
 * mail"). contact@ideovent.in is on Zoho Mail's free plan, web and phone app
 * only, no IMAP or POP, so no desktop mail app can sign in to it. Three
 * buttons: Open in Zoho Mail (a new e-mail in Zoho Mail in this browser,
 * filled in: mailLinks.ts zohoComposeLink, at the Zoho address in Settings),
 * Open in mail app (the mailto: link to the computer's default mail app) and
 * Copy e-mail text (subject and body). Open in Zoho Mail always copies the
 * body too, in case Zoho joins the lines or opens without the text; past
 * ZOHO_LINK_SAFE_LENGTH (5,500 characters) its link carries the address and
 * the subject only, and one short line says to paste the text. Some mail apps
 * cut a mailto: link past about 2,000 characters, so when that link is longer
 * than MAILTO_SAFE_LENGTH (1,900) Open in mail app also copies the full text
 * of the e-mail and one short line says so. The old "Gmail account" setting
 * (senderGmail) may still be stored; nothing reads it (the engine's
 * free-mailbox warning that did was removed on 30 Sep 2026).
 *
 * THE LINK IN THE FIRST MESSAGE (2 Oct 2026, Mehdi: "mail pe to first msz pe
 * hi link send krwa do", and for WhatsApp "dono templete bana do"). Under a
 * first message that says the sample is made, the switch Without link / With
 * link (LinkChoice). An e-mail starts With link every time; a WhatsApp on the
 * version last sent in this browser, Without link the very first time. With
 * link is Mehdi's alone for now, and off, with the reason, when the link would
 * not open or must not go to a stranger (linkChoice.ts demoReach,
 * coldLinkReason). The list still shows and ranks the bases; what is shown,
 * checked, sent and recorded is the variant (linkChoice.ts sendVariant): the
 * twin with their sample's link, or, on a channel whose first message carried
 * the link, the follow-up that points back to it. PUBLIC BEFORE IT OPENS: a
 * text with a draft demo's link puts the demo on the website first, the same
 * writes as Mark sent (useDemoLink), on Mehdi's send only.
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
  const { data } = useCms();
  const demo = leadDemo(lead, (data.demoSites as DemoSite[]) || []);

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
  // The lead's demo for the link (2 Oct 2026): may its link go, and the step that puts a draft on the website.
  const demoLink = useDemoLink(lead);
  // An example demo, a provisional draft-<template> link, or a coaching demo still showing the template's toppers:
  // it would open, but it must not go to someone who has not replied (linkChoice.ts coldLinkReason).
  const coldWhy = coldLinkReason(demoLink.demo);
  // E-mail starts with their sample's link every time (Mehdi: "mail pe to first msz pe hi link"); WhatsApp on the
  // version last sent in this browser, Without link the very first time. Mehdi's only (demoLink.owner).
  const [emailLinkChoice, setEmailLinkChoice] = useState<LinkChoiceValue>("with");
  const [waLinkChoice, setWaLinkChoice] = useState<LinkChoiceValue>(() => readWaLinkChoice());
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const waToday = firstWhatsappToday(events);
  const waLimit = dailyWhatsappLimit(settings);
  // Only a landline and no email: the way in is a phone call.
  const landlineOnly = !hasMail && hasWa && !isIndianMobile(waNumber);
  // The stage: the lead's own (its status, then the no-reply sends on this channel) unless Mehdi picked one.
  const suggestion = suggestFor(lead, events, channel);
  const current: StageChoice = choice ?? { plain: plainStageOf(suggestion.stage), stage: suggestion.stage };
  const ranked = current.stage ? rankTemplates({ lead, channel, stage: current.stage, settings, waToday, observation: observation.trim() }) : [];
  // The picked message (the list shows and ranks it) and the one that goes: its twin with their sample's link,
  // or the follow-up written for after the link (linkChoice.ts). A pinned twin id (after a send) finds its own.
  const picked = ranked.find((t) => t.id === templateId || t.id === getTemplate(templateId)?.twinOf) || ranked[0];
  const short = ranked.slice(0, 3);
  if (picked && !short.includes(picked)) short.push(picked);
  const hasLinkTwin = Boolean(linkTwinOf(picked));
  // Why With link is off: the link would not open (this comes first, so while `me` is still pending Mehdi reads
  // "Checking the demo..." or "No demo yet", never the team line), the sender is not Mehdi, or it must not go cold.
  const linkOff = !hasLinkTwin ? ""
    : !demoLink.reach.ok ? demoLink.reach.reason
    : !demoLink.owner ? TEAM_LINK_REASON
    : coldWhy;
  const linkChoice: LinkChoiceValue = linkOff ? "without" : channel === "email" ? emailLinkChoice : waLinkChoice;
  const linkWent = linkWentOn(lead.id, channel, events);
  const template = picked ? sendVariant(picked, { withLink: hasLinkTwin && linkChoice === "with", linkWent }) : undefined;

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
  // Their sample's link must open (2 Oct 2026): a text with it goes when the demo is on the website, or is a
  // draft that Mehdi's send puts there (useDemoLink). Anyone else's send never publishes: a draft blocks it.
  const carriesLink = carriesDemoLink(text, lead);
  if (carriesLink && !demoLink.reach.ok) blockers.push(demoLink.reach.reason);
  const needsPublish = carriesLink && demoLink.reach.needsPublish;
  // It would open, but must not go out like this: blocks the twin (the switch is off anyway) and any send that would
  // publish the demo (this send is then what makes it public); a warning on a demo Mehdi already put live himself.
  if (carriesLink && coldWhy) (template?.link === "demo" || needsPublish ? blockers : warnings).push(coldWhy);
  // Another demo's link: in a first message the engine already blocks it (one allowed link at most); later, Mehdi may
  // paste one of the site's example demos on purpose, so it is said, not stopped.
  const foreign = foreignDemoSlugs(text, lead);
  if (foreign.length) warnings.push(`This message carries another demo's link (/site/${foreign[0]}). Send it only if you mean to, such as one of the site's example demos: never another lead's.`);
  // A message that says the sample is made, for a lead whose demo record cannot be found: true only if the demo exists.
  if (!carriesLink && !template?.afterLink && template?.promises === "demo" && ["missing", "mismatch", "free"].includes(demoLink.reach.state)) warnings.push(`${demoLink.reach.reason} This message says the sample is made.`);
  // A follow-up that points back to the link they got ("Its link is in my first e-mail") must lead somewhere
  // (said once: the line above skips these follow-ups).
  if (template?.afterLink) {
    const back = pointBackReason(demoLink.reach);
    if (back) warnings.push(back);
  }
  // "Made in your name": the demo must carry their name (a demo of another lead linked by mistake). A send that would put
  // it on the website stops (publishing it is then a choice made in step 1, Mark sent); on a demo already live it warns.
  if (demoLink.demo && (carriesLink || template?.promises === "demo") && !demoNamedFor(demoLink.demo, lead)) {
    const named = `This lead's demo is in the name of "${demoLink.demo.instituteName}", and this message says it was made for ${lead.instituteName}. Check it is theirs.`;
    if (needsPublish) blockers.push(`${named} A send never puts a demo in another name on the website: if it is theirs, tap Mark sent in step 1 first.`);
    else warnings.push(named);
  }
  // A thread on two channels: the follow-up wording follows this channel's own first message (linkWentOn), so say
  // where a message offers a link that already went on the other channel, or offers to make a sample after it.
  const elsewhere: TemplateChannel = channel === "email" ? "whatsapp" : "email";
  if (template && offersLink(template) && linkWentOn(lead.id, elsewhere, events)) {
    warnings.push(`Their sample's link already went ${elsewhere === "email" ? "by e-mail" : "on WhatsApp"}, and this message offers it again.${template.stage === "first" && hasLinkTwin && !linkOff ? " With link sends it here instead." : ""}`);
  }
  if (template?.sample === "offer" && template.stage !== "first" && linkWent) {
    warnings.push("Your first message here carried their sample's link, and this one offers to make a sample. Pick the follow-up for a sample made.");
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
  // Zoho Mail in the browser (2 Oct 2026, mailLinks.ts): the free plan has no IMAP, so this is Mehdi's e-mail button.
  const zoho = channel === "email" ? zohoComposeLink({ to: lead.email || "", subject, body }, settings.zohoMailUrl) : null;
  // Past about 1,900 characters some mail apps cut a mailto: link, so the body is copied as well.
  const longMail = channel === "email" && links.primary.length > MAILTO_SAFE_LENGTH;
  const [copied, setCopied] = useState<"" | "text" | "body" | "zoho">("");
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(""), 4000);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copyMail = async () => {
    // Pasted into Zoho by hand, the link must still open: put a draft demo on the website now. The buttons go off at
    // the first tap (so a second quick tap never publishes twice), and only text that reached the clipboard publishes:
    // nothing copied, nothing to paste, so the draft stays a draft.
    if (needsPublish) {
      setPublishing(true);
      setPublishMsg(null);
    }
    const ok = await copyToClipboard(`Subject: ${subject}\n\n${body}`);
    if (ok) setCopied("text");
    if (!needsPublish) return;
    try {
      if (ok) await demoLink.publish();
      else setPublishMsg({ kind: "error", text: "The text was not copied, so the demo was not put on the website. Press Copy e-mail text again." });
    } catch (err) {
      setPublishMsg({ kind: "error", text: `Copied, but putting the demo on the website did not finish: ${errText(err)}. Check step 1 says "Sent: link is live" (else tap Mark sent there) before you send.` });
    } finally {
      setPublishing(false);
    }
  };

  /**
   * PUBLIC BEFORE IT OPENS (2 Oct 2026). A draft demo goes on the website before WhatsApp, Zoho or the
   * mail app loads the text with its link. An https target gets its tab now, inside the click, so no
   * popup blocker stops it; it stays blank until the write has succeeded, and closes if it failed, with
   * nothing recorded. When no tab opens at all (pop-ups blocked), nothing is written: the draft stays a
   * draft. A mailto: opens in place after the write. Once the demo is sent the button is a plain link again.
   */
  const publishThenOpen = async (href: string, how: string) => {
    const mail = href.startsWith("mailto:");
    const clickedAt = Date.now();
    const tab = mail ? null : window.open("about:blank", "_blank");
    if (!mail && !tab) {
      setPublishMsg({ kind: "error", text: "The browser did not open a new tab, so the demo was not put on the website and nothing was opened or recorded. Allow pop-ups for this site, then press the button again." });
      return;
    }
    if (tab) {
      try {
        tab.opener = null;
        tab.document.title = "Opening...";
        tab.document.body.textContent = "Putting the demo on the website, then opening the message...";
      } catch {
        /* nothing to do */
      }
    }
    setPublishing(true);
    setPublishMsg(null);
    try {
      await demoLink.publish();
    } catch (err) {
      tab?.close();
      // markDemoSent writes the status first and the slot second: a failure may come after the demo went live,
      // so the words say what is certain (nothing opened, nothing recorded), and where to look.
      setPublishMsg({ kind: "error", text: `Putting the demo on the website did not finish, so nothing was opened or recorded: ${errText(err)}. Check step 1 (Sent: link is live?), then press the button again.` });
      return;
    } finally {
      setPublishing(false);
    }
    // Chrome lets a page hand a mailto: to the mail app only within about five seconds of the click.
    if (mail && Date.now() - clickedAt < 4000) window.location.href = href;
    else if (!mail && tab && !tab.closed) tab.location.replace(href);
    else {
      // Nothing opened, so nothing is recorded; the demo is sent now, so the next press is a plain link.
      setPublishMsg({ kind: "info", text: "The demo is on the website now. Press the button again to open the message." });
      return;
    }
    void recordSend(how);
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

  const sendLink = (href: string, how: string, label: string, Icon: typeof Mail, primary: boolean, testid: string, alsoOnClick?: () => void, outline?: boolean) => {
    const cls = primary
      ? "flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground"
      : outline
        ? "flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium"
        : "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm";
    return blocked || !href || publishing ? (
      <button type="button" disabled className={cn(cls, "cursor-not-allowed opacity-40")} data-testid={testid}>
        <Icon className="h-5 w-5" aria-hidden="true" /> {label}
      </button>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testid}
        onClick={(e) => {
          alsoOnClick?.();
          // The WhatsApp first-message version used last is the next lead's starting point, in this browser.
          if (channel === "whatsapp" && template?.stage === "first" && hasLinkTwin && !linkOff) writeWaLinkChoice(template.link === "demo" ? "with" : "without");
          if (needsPublish) {
            e.preventDefault();
            void publishThenOpen(href, how);
            return;
          }
          void recordSend(how);
        }}
        className={cn(cls, primary ? "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : outline ? "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "hover:bg-muted")}>
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
    ? { page: picturePage, shareBlocked: blocked, onShared: () => {
      if (sentKey !== editKey) {
        void recordSend("the share sheet");
        // A share is a send of the Without link version: the next lead starts on it, in this browser.
        if (hasLinkTwin && !linkOff) writeWaLinkChoice("without");
      }
    } }
    : null;
  // The twin that offers to make a sample has none: the picture says the sample website is already built. The twin
  // with their sample's link has none either: WhatsApp shows that link's card. Only for a kind that has a picture.
  const pictureNote = firstWa && template?.sample === "offer" && previewFor(pictureKind)
    ? "No picture with this message: the picture says the sample website is already built. Make the demo in step 1 and the message that says so, with the picture, comes up."
    : firstWa && template?.link === "demo" && previewFor(pictureKind)
      ? "No picture with this message: it carries their sample's own link, and WhatsApp shows that link's card instead (their name, and that it is a demonstration by Ideovent)."
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
        {template?.stage === "first" && hasLinkTwin && (
          <LinkChoice value={linkChoice} disabledReason={linkOff}
            hint={linkHint(channel, Boolean(previewFor(template.kind !== "any" ? template.kind : lead.kind)))}
            onChange={(v) => (channel === "email" ? setEmailLinkChoice(v) : setWaLinkChoice(v))} />
        )}

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
          <div className="space-y-2">
            {sendLink(zoho?.href || "", "Zoho Mail", "Open in Zoho Mail", Mail, true, "open-zoho",
              () => void copyToClipboard(body).then((ok) => ok && setCopied("zoho")))}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                {sendLink(links.primary, "email app", "Open in mail app", Mail, false, "open-mailto",
                  longMail ? () => void copyToClipboard(body).then((ok) => ok && setCopied("body")) : undefined, true)}
              </div>
              <button type="button" onClick={() => void copyMail()} disabled={blocked || publishing} data-testid="copy-email"
                className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
                {copied === "text" ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {copied === "text" ? "Copied" : "Copy e-mail text"}
              </button>
            </div>
          </div>
        ) : (
          sendLink(links.primary, "WhatsApp", "Open in WhatsApp", MessageCircle, true, "open-whatsapp")
        )}
        {isEmail && template && ["follow_up", "closing"].includes(plainStageOf(template.stage)) && (
          <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground" data-testid="thread-hint">
            A follow-up goes as a reply in the same thread: open your last e-mail to them in Zoho Mail, press Reply there and paste this text (Copy e-mail text copies it). Open in Zoho Mail and Open in mail app start a new e-mail.
          </p>
        )}
        {longMail && !blocked && (
          <p className="mt-2 text-center text-xs text-muted-foreground" data-testid="long-mail-note">
            {copied === "body"
              ? "The full text was also copied. If your mail app cut the e-mail, paste it in."
              : "Long e-mail: opening it also copies the full text, in case your mail app cuts it."}
          </p>
        )}
        {isEmail && !landlineOnly && !blocked && zoho && (
          <p className="mt-2 text-center text-xs text-muted-foreground" data-testid="zoho-note">
            {copied === "zoho"
              ? "The text was copied too. If Zoho joined the lines or left the e-mail empty, paste it there; the address and the subject are above."
              : "Open in Zoho Mail also copies the text: if Zoho shows it as one paragraph, or opens without it, paste it there."}
          </p>
        )}
        {isEmail && !landlineOnly && zoho && !zoho.withBody && (
          <p className="mt-2 text-center text-xs text-muted-foreground" data-testid="zoho-long-note">
            Long e-mail: Zoho opens with the address and the subject only. The text is copied: paste it in.
          </p>
        )}
        {needsPublish && !blocked && (
          <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground" data-testid="publish-note">
            {isEmail
              ? "The demo is still a draft: Open in Zoho Mail, Open in mail app or Copy e-mail text puts it on the website first, the same as Mark sent, so its link opens."
              : "The demo is still a draft: sending puts it on the website first, the same as Mark sent, so its link opens."}
          </p>
        )}
        {publishing && (
          <p role="status" className="mt-2 text-center text-xs text-muted-foreground" data-testid="publish-status">
            Putting the demo on the website...
          </p>
        )}
        {publishMsg && (
          <p role="alert" className={cn("mt-2 text-center text-xs", publishMsg.kind === "error" ? "text-destructive" : "text-muted-foreground")} data-testid="publish-error">
            {publishMsg.text}
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

/** An error's words for a line on screen. */
const errText = (e: unknown) => (e as Error)?.message || "unknown error";

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

/**
 * Templates as a short radio list: the label, its language, "suggested" on the one that fits this lead best.
 * `selected` is the message that goes, which may be a twin (with their sample's link, or the follow-up for after
 * the link, 2 Oct 2026): its listed row is checked, and shows the twin's own label and note.
 */
function TemplateList({ items, selected, suggested, onPick }: { items: { id: string; label: string; language: keyof typeof LANGUAGE_LABELS; note?: string }[]; selected?: string; suggested?: string; onPick: (id: string) => void }) {
  if (!items.length) return <p className="text-sm text-muted-foreground" data-testid="template-list-empty">No message for this stage on this channel.</p>;
  const variant = getTemplate(selected);
  const base = variant?.twinOf ?? selected;
  return (
    <ul className="space-y-1" role="radiogroup" aria-label="Template" data-testid="template-list">
      {items.map((t) => {
        const on = t.id === base;
        const label = on ? variant?.label ?? t.label : t.label;
        const note = on ? variant?.note ?? t.note : t.note;
        return (
          <li key={t.id}>
            <button type="button" role="radio" aria-checked={on} data-template-id={t.id} onClick={() => onPick(t.id)}
              className={cn("flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm", on ? "bg-primary/10 text-foreground" : "hover:bg-muted")}>
              <span className={cn("mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full border-2", on ? "border-primary bg-primary shadow-[inset_0_0_0_2px_hsl(var(--background))]" : "border-muted-foreground/50")} aria-hidden="true" />
              <span className="min-w-0">
                <span className={cn("block", on && "font-medium")}>
                  {label}
                  {t.id === suggested && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[11px] font-semibold text-primary" data-testid="suggested-tag">Suggested</span>}
                </span>
                <span className="block text-xs text-muted-foreground">{LANGUAGE_LABELS[t.language]}{on && note ? `. ${note}` : ""}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
