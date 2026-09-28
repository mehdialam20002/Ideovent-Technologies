import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Ban, Mail, MessageCircle, Monitor, MoreHorizontal, PhoneCall, Reply } from "lucide-react";
import type { DemoSite } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { demoStatus } from "@/lib/demo/record";
import { LANGUAGE_LABELS, STAGE_LABELS, type TemplateChannel, type TemplateStage } from "@/lib/outreach/templates";
import {
  OBSERVATIONS,
  checkSend,
  followUpDate,
  gmailComposeUrl,
  leadWhatsappNumber,
  mailtoUrl,
  dailyWhatsappLimit,
  render,
  whatsappUrl,
  whatsappWebUrl,
} from "@/lib/outreach/engine";
import { isIndianMobile, sameContact } from "@/lib/outreach/store";
import type { OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { firstWhatsappToday } from "./derive";
import { DemoPicker, leadDemo } from "./DemoPicker";
import { looksLikeNote, otherLeadsNamed, rankTemplates, sendsOn, startingObservation, suggestStage } from "./compose";
import { btnGhost, inputCls, prettyPhone, summaryCls, textareaCls } from "./ui";
import { cn } from "@/lib/utils";

export { suggestStage } from "./compose";

const STAGES = Object.keys(STAGE_LABELS) as TemplateStage[];

/** A manual edit of the preview, and the exact render it was made on. */
interface Edit {
  key: string;
  base: string;
  subject: string;
  body: string;
}

/**
 * Manual edits by lead id, for this tab only. The panel is keyed by lead.id,
 * so its state dies when Mehdi steps to another lead; without this, coming
 * back threw his edit away with no warning. An entry is only ever read back
 * for the same lead, and only shown while channel, template and render still
 * match (the same rule as the live edit), so it can never reach another lead.
 * Memory only, never storage: a reload starts from the template again.
 */
const drafts = new Map<string, Edit>();

/**
 * THE LEAD SCREEN'S THREE STEPS: 1 Demo, 2 Message, 3 Send.
 *
 * WHY EVERYTHING HERE BELONGS TO ONE LEAD (the 28 Sep 2026 bug). Mehdi saw
 * "Verma Coaching Academy", the last of 30 imported leads, in every lead's
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
 * Gmail or WhatsApp.
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
  const [stageChoice, setStageChoice] = useState<TemplateStage | null>(null);
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
  const [sentNow, setSentNow] = useState(false);

  const waToday = firstWhatsappToday(events);
  const waLimit = dailyWhatsappLimit(settings);
  // Only a landline and no email: the way in is a phone call.
  const landlineOnly = !hasMail && hasWa && !isIndianMobile(waNumber);
  const stage = stageChoice ?? suggestStage(lead, sendsOn(lead.id, events, channel));
  const ranked = rankTemplates({ lead, channel, stage, settings, waToday, observation: observation.trim() });
  const template = ranked.find((t) => t.id === templateId) || ranked[0];
  const short = ranked.slice(0, 3);
  if (template && !short.includes(template)) short.push(template);

  // The render is ALWAYS for this lead; the observation is passed explicitly
  // (even when empty) so a research note on the lead never slips in.
  const rendered = template ? render(template, lead, { signature: settings.signature, observation: observation.trim() }) : null;
  const editKey = `${lead.id}|${channel}|${template?.id || ""}`;
  const base = `${rendered?.subject || ""}\n${rendered?.body || ""}`;
  const own = edit && edit.key === editKey && edit.base === base ? edit : null;
  const subject = own ? own.subject : rendered?.subject || "";
  const body = own ? own.body : rendered?.body || "";
  const change = (next: { subject?: string; body?: string }) =>
    setEdit({ key: editKey, base, subject: next.subject ?? subject, body: next.body ?? body });

  const pickChannel = (c: TemplateChannel) => {
    setChannel(c);
    setTemplateId("");
    setStageChoice(null);
  };
  const pickObservation = (v: string) => {
    setObservation(v);
    setObsTouched(true);
  };

  /* ── Checks ─────────────────────────────────────────────────────────── */
  const duplicateOf = leads.find((l) => l.id !== lead.id && (sameContact(l, { phone: lead.phone, email: lead.email }) || sameContact(l, { phone: lead.whatsapp })));
  const check = template
    ? checkSend({ ...lead, observation: observation.trim() }, template, channel, settings, waToday, new Date(), { duplicateOf })
    : { ok: false, blockers: ["No message fits this stage. Pick another under More templates."], warnings: [] as string[] };
  const blockers = [...check.blockers];
  const warnings = [...check.warnings, ...(rendered?.warnings || [])];
  const text = `${subject}\n${body}`;
  if (channel === "email" && !hasMail) blockers.push(landlineOnly ? "No email address for this lead. Call the landline, or add an email with Edit." : "This lead has no email address. Add one with Edit.");
  if (channel === "whatsapp" && !hasWa) blockers.push("This lead has no WhatsApp or phone number. Add one with Edit.");
  if (channel === "whatsapp" && hasWa && !isIndianMobile(waNumber)) warnings.push("This number does not look like an Indian mobile, so WhatsApp may not reach it.");
  if (/\/site\/[a-z0-9-]+/i.test(text) && demo && demoStatus(demo) !== "sent") {
    blockers.push("The demo is not marked sent, so its link shows a 404. Tap Mark sent in step 1 first.");
  }
  if (template && !template.allowsLink && /https?:\/\/|www\./i.test(text) && !check.blockers.some((b) => /link/i.test(b))) {
    blockers.push("This message must not carry a link (first message to a stranger). Remove the link from the text.");
  }
  const others = otherLeadsNamed(text, lead, leads);
  if (others.length) {
    blockers.push(`This message names another lead (${others.map((o) => o.instituteName).join(", ")}). Fix the text or the observation before sending.`);
  }
  if (!body.trim()) blockers.push("The message is empty.");
  const blocked = blockers.length > 0;
  const uniqueWarnings = [...new Set(warnings)];

  /* ── Links: built from THIS lead and the text on screen, every render ─ */
  const links =
    channel === "email"
      ? {
          primary: gmailComposeUrl({ to: lead.email || "", subject, body, account: settings.senderGmail || undefined }),
          secondary: mailtoUrl({ to: lead.email || "", subject, body }),
        }
      : { primary: whatsappUrl(waNumber, body), secondary: whatsappWebUrl(waNumber, body) };

  const recordSend = async (how: string) => {
    if (!template) return;
    // Pin what was just sent. Without this the send itself moves the suggested
    // stage on (one more send on this channel), so the screen flipped to the
    // Follow-up 1 text and dropped any edit; a second tap (Gmail tab closed,
    // popup lost) would then have sent the follow-up instead of this message.
    setStageChoice(template.stage);
    setTemplateId(template.id);
    const now = new Date();
    const due = followUpDate(template.stage, now);
    await addEvent({
      leadId: lead.id,
      type: "sent",
      channel,
      templateId: template.id,
      detail: `${channel === "whatsapp" ? "WhatsApp" : "Email"} opened in ${how}: ${template.label}${subject ? `, "${subject}"` : ""}`,
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
  };

  /* ── What happened (the small menu under Send) ─────────────────────── */
  const replied = async () => {
    await addEvent({ leadId: lead.id, type: "replied", detail: "They replied. Next: send the demo link (After they replied)." });
    await saveLead({ ...lead, status: "replied", nextActionAt: new Date().toISOString() });
  };
  const callDone = async () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    await addEvent({ leadId: lead.id, type: "call", channel: "call", detail: "Call done. Next: the after-call message." });
    await saveLead({ ...lead, status: "call", lastContactedAt: new Date().toISOString(), nextActionAt: d.toISOString() });
  };
  const doNotContact = async () => {
    if (!confirm(`Mark ${lead.instituteName} as not interested? Every send button for them will be blocked.`)) return;
    await addEvent({ leadId: lead.id, type: "status", detail: "Not interested: do not contact again." });
    await saveLead({ ...lead, status: "do_not_contact", nextActionAt: undefined });
  };

  const sendLink = (href: string, how: string, label: string, Icon: typeof Mail, primary: boolean, testid: string) => {
    const cls = primary
      ? "flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground"
      : "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm";
    return blocked ? (
      <button type="button" disabled className={cn(cls, "cursor-not-allowed opacity-40")} data-testid={testid}>
        <Icon className="h-5 w-5" aria-hidden="true" /> {label}
      </button>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testid} onClick={() => void recordSend(how)}
        className={cn(cls, primary ? "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : "hover:bg-muted")}>
        <Icon className="h-5 w-5" aria-hidden="true" /> {label}
      </a>
    );
  };

  const obsKnown = OBSERVATIONS.some((o) => o.id === observation);
  const saved = (lead.observation || "").trim();
  const savedForeign = otherLeadsNamed(saved, lead, leads).length > 0;
  const note = looksLikeNote(saved) || savedForeign ? saved : "";
  const usesObservation = Boolean(template && /\{observation\}/.test(`${template.subject || ""}${template.body}`));
  const isEmail = channel === "email";

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
        <p className="mb-2 text-xs text-muted-foreground">{STAGE_LABELS[stage]}{stageChoice ? "" : ", suggested for this lead"}</p>
        <TemplateList items={short} selected={template?.id} onPick={setTemplateId} />

        <details className="mt-1">
          <summary className={summaryCls}>More templates</summary>
          <div className="mt-2 space-y-3 rounded-xl bg-muted/40 p-3">
            <label className="block text-sm font-medium" htmlFor="stage-pick">Stage</label>
            <select id="stage-pick" className={inputCls + " mt-0"} value={stage}
              onChange={(e) => { setStageChoice(e.target.value as TemplateStage); setTemplateId(""); }}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <TemplateList items={ranked} selected={template?.id} onPick={setTemplateId} />
          </div>
        </details>


        <div className="mt-4">
          <label htmlFor="obs-pick" className="block text-sm font-medium">
            What you noticed on their site{" "}
            <span className="font-normal text-muted-foreground">{usesObservation ? "(this message uses it)" : "(optional)"}</span>
          </label>
          <select id="obs-pick" className={inputCls} value={obsKnown || !observation ? observation : "__custom"}
            onChange={(e) => pickObservation(e.target.value === "__custom" ? " " : e.target.value)}>
            <option value="">Nothing picked</option>
            {OBSERVATIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
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

        <div className="mt-4 space-y-3">
          {isEmail && (
            <div>
              <label htmlFor="msg-subject" className="block text-sm font-medium">Subject</label>
              <input id="msg-subject" className={inputCls} value={subject} onChange={(e) => change({ subject: e.target.value })} />
            </div>
          )}
          <div>
            <label htmlFor="msg-body" className="block text-sm font-medium">
              {isEmail ? "Email" : "WhatsApp message"} <span className="font-normal text-muted-foreground">(you can edit it)</span>
            </label>
            <textarea id="msg-body" aria-label="Message text" rows={isEmail ? 12 : 8} className={textareaCls} value={body} onChange={(e) => change({ body: e.target.value })} />
          </div>
        </div>
      </Step>

      <Step n={3} title="Send">
        <p className="mb-3 break-words text-sm" data-testid="send-to">
          To <span className="font-medium">{lead.instituteName}</span>: {isEmail ? lead.email || "no email" : prettyPhone(waNumber) || "no number"}
          {isEmail && settings.senderGmail ? <span className="text-muted-foreground">, from {settings.senderGmail}</span> : null}
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
        ) : isEmail
          ? sendLink(links.primary, "Gmail", "Open in Gmail", Mail, true, "open-gmail")
          : sendLink(links.primary, "WhatsApp", "Open in WhatsApp", MessageCircle, true, "open-whatsapp")}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {isEmail && landlineOnly
            ? "Their number is a landline and there is no email: call them, then use Call done below."
            : "The text is typed for you. You press Send there."}
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
            {isEmail
              ? sendLink(links.secondary, "email app", "Open in my email app", Mail, false, "open-mailto")
              : sendLink(links.secondary, "WhatsApp Web", "Open in WhatsApp Web", Monitor, false, "open-whatsapp-web")}
            <button type="button" className={menuItem} onClick={() => void replied()}><Reply className="h-5 w-5" aria-hidden="true" /> They replied</button>
            <button type="button" className={menuItem} onClick={() => void callDone()}><PhoneCall className="h-5 w-5" aria-hidden="true" /> Call done</button>
            <button type="button" className={cn(menuItem, "text-destructive")} onClick={() => void doNotContact()}><Ban className="h-5 w-5" aria-hidden="true" /> Not interested</button>
          </div>
        </details>
      </Step>
    </div>
  );
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

/** Templates as a short radio list: the label, and the language when it is not the lead's. */
function TemplateList({ items, selected, onPick }: { items: { id: string; label: string; language: keyof typeof LANGUAGE_LABELS; note?: string }[]; selected?: string; onPick: (id: string) => void }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No template for this stage. Pick another stage.</p>;
  return (
    <ul className="space-y-1" role="radiogroup" aria-label="Template" data-testid="template-list">
      {items.map((t) => {
        const on = t.id === selected;
        return (
          <li key={t.id}>
            <button type="button" role="radio" aria-checked={on} onClick={() => onPick(t.id)}
              className={cn("flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm", on ? "bg-primary/10 text-foreground" : "hover:bg-muted")}>
              <span className={cn("mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full border-2", on ? "border-primary bg-primary shadow-[inset_0_0_0_2px_hsl(var(--background))]" : "border-muted-foreground/50")} aria-hidden="true" />
              <span className="min-w-0">
                <span className={cn("block", on && "font-medium")}>{t.label}</span>
                <span className="block text-xs text-muted-foreground">{LANGUAGE_LABELS[t.language]}{on && t.note ? `. ${t.note}` : ""}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
