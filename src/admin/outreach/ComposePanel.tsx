import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, Monitor, Send } from "lucide-react";
import type { DemoSite } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { demoStatus } from "@/lib/demo/record";
import {
  LANGUAGE_LABELS,
  PITCH_LABELS,
  STAGE_LABELS,
  templatesFor,
  type MessageTemplate,
  type TemplateChannel,
  type TemplateLanguage,
  type TemplatePitch,
  type TemplateStage,
} from "@/lib/outreach/templates";
import {
  OBSERVATIONS,
  checkSend,
  followUpDate,
  gmailComposeUrl,
  leadWhatsappNumber,
  mailtoUrl,
  render,
  whatsappUrl,
  whatsappWebUrl,
} from "@/lib/outreach/engine";
import { isIndianMobile, sameContact } from "@/lib/outreach/store";
import type { OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { firstWhatsappToday, sendsTo } from "./derive";
import { DemoPicker } from "./DemoPicker";
import { Blockers, Warnings, cardCls, inputCls, textareaCls } from "./ui";
import { cn } from "@/lib/utils";

const STAGES = Object.keys(STAGE_LABELS) as TemplateStage[];

/** The stage this lead is most likely at, on this channel. */
export function suggestStage(lead: OutreachLead, sends: number): TemplateStage {
  switch (lead.status) {
    case "replied":
    case "demo_opened":
      return "after_reply";
    case "call":
      return "after_call";
    case "proposal":
      return "proposal";
    default:
      if (sends <= 0) return "first";
      if (sends === 1) return "follow_up_1";
      if (sends === 2) return "follow_up_2";
      return "follow_up_3";
  }
}

const selectCls = inputCls;

/**
 * THE COMPOSE PANEL. Demo, channel, template, observation, preview, checks,
 * and the buttons that open Gmail or WhatsApp with the text typed.
 *
 * The send buttons are real links (<a target="_blank">), not window.open
 * after an await, so no popup blocker stops them and a long-press on a phone
 * offers "open in WhatsApp". Clicking one records the send: a 'sent' event,
 * status Contacted if it was New, lastContactedAt, and the next follow-up
 * date from the ladder. Nothing is sent from here; Mehdi presses Send in
 * Gmail or WhatsApp.
 */
export function ComposePanel({ lead }: { lead: OutreachLead }) {
  const { leads, events, settings, saveLead, addEvent } = useOutreach();
  const { data } = useCms();
  const demo = lead.demoId ? ((data.demoSites as DemoSite[]) || []).find((s) => s.id === lead.demoId) : undefined;

  const hasMail = Boolean(lead.email);
  const hasWa = Boolean(leadWhatsappNumber(lead));
  const [channel, setChannel] = useState<TemplateChannel>(hasMail && !hasWa ? "email" : hasWa ? "whatsapp" : "email");
  const sends = sendsTo(lead.id, events);
  const [stage, setStage] = useState<TemplateStage>(() => suggestStage(lead, sends[channel]));
  const [pitch, setPitch] = useState<TemplatePitch>(lead.website ? "fix_website" : "new_website");
  const [language, setLanguage] = useState<TemplateLanguage>(lead.language || "en");
  const [templateId, setTemplateId] = useState<string>("");
  const [observation, setObservation] = useState<string>(lead.observation || "");

  // A new channel or a status change moves the suggested stage.
  useEffect(() => {
    setStage(suggestStage(lead, sendsTo(lead.id, events)[channel]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, lead.status]);

  const options = useMemo(
    () => templatesFor({ channel, stage, kind: lead.kind, pitch, language }),
    [channel, stage, lead.kind, pitch, language],
  );
  // Fall back to other languages when this stage has none in the chosen one.
  const fallback = useMemo(
    () => (options.length ? [] : templatesFor({ channel, stage, kind: lead.kind, pitch })),
    [options.length, channel, stage, lead.kind, pitch],
  );
  const list = options.length ? options : fallback;
  const template: MessageTemplate | undefined = list.find((t) => t.id === templateId) || list[0];

  const rendered = useMemo(
    () =>
      template
        ? render(template, lead, { signature: settings.signature, observation: observation || undefined })
        : null,
    [template, lead, settings.signature, observation],
  );

  // The preview is editable; a new render replaces the edits.
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    setSubject(rendered?.subject || "");
    setBody(rendered?.body || "");
  }, [rendered]);

  /* ── Checks ─────────────────────────────────────────────────────────── */
  const waToday = firstWhatsappToday(events);
  const duplicateOf = leads.find((l) => l.id !== lead.id && (sameContact(l, { phone: lead.phone, email: lead.email }) || sameContact(l, { phone: lead.whatsapp })));
  const check = template
    ? checkSend({ ...lead, observation: observation.trim() || lead.observation }, template, channel, settings, waToday, new Date(), { duplicateOf })
    : { ok: false, blockers: ["No template fits these choices. Change the stage or the pitch."], warnings: [] as string[] };

  const blockers = [...check.blockers];
  const warnings = [...check.warnings, ...(rendered?.warnings || [])];
  const text = `${subject}\n${body}`;
  const usesDemo = /\/site\/[a-z0-9-]+/i.test(text);
  if (channel === "email" && !hasMail) blockers.push("This lead has no email address. Add one with Edit.");
  if (channel === "whatsapp" && !hasWa) blockers.push("This lead has no WhatsApp or phone number. Add one with Edit.");
  if (channel === "whatsapp" && hasWa && !isIndianMobile(leadWhatsappNumber(lead))) {
    warnings.push("This number does not look like an Indian mobile, so WhatsApp may not reach it.");
  }
  if (usesDemo && demo && demoStatus(demo) !== "sent") {
    blockers.push("The demo is not marked sent, so its link shows a 404. Tap Mark sent above first.");
  }
  if (template && !template.allowsLink && /https?:\/\/|www\./i.test(text) && !check.blockers.some((b) => /link/i.test(b))) {
    blockers.push("This message must not carry a link (first message to a stranger). Remove the link from the text.");
  }
  if (!body.trim()) blockers.push("The message is empty.");
  const blocked = blockers.length > 0;
  const uniqueWarnings = [...new Set(warnings)];

  /* ── Links ─────────────────────────────────────────────────────────── */
  const waNumber = leadWhatsappNumber(lead);
  const links: { gmail?: string; mailto?: string; wa?: string; waWeb?: string } =
    channel === "email"
      ? {
          gmail: gmailComposeUrl({ to: lead.email || "", subject, body, account: settings.senderGmail || undefined }),
          mailto: mailtoUrl({ to: lead.email || "", subject, body }),
        }
      : { wa: whatsappUrl(waNumber, body), waWeb: whatsappWebUrl(waNumber, body) };

  const recordSend = async (how: string) => {
    if (!template) return;
    const now = new Date();
    const next = followUpDate(template.stage, now);
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
      nextActionAt: Number.isNaN(next.getTime()) ? lead.nextActionAt : next.toISOString(),
      observation: observation || lead.observation,
      language: lead.language || language,
    });
  };

  const sendBtn = (href: string, how: string, label: string, Icon: typeof Mail, primary: boolean, testid: string) =>
    blocked ? (
      <button type="button" disabled className={cn(primary ? "bg-primary text-primary-foreground" : "border border-border", "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium opacity-40")} data-testid={testid}>
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </button>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={testid}
        onClick={() => void recordSend(how)}
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium",
          primary ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border bg-background hover:border-primary/50 hover:bg-muted",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </a>
    );

  const obsKnown = OBSERVATIONS.some((o) => o.id === observation);

  const step = (n: number, title: string) => (
    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">{n}</span>
      {title}
    </h4>
  );

  return (
    <section className={cn(cardCls, "space-y-6")} aria-labelledby="compose-h" data-testid="compose">
      <h3 id="compose-h" className="flex items-center gap-2 font-display text-lg font-semibold">
        <Send className="h-5 w-5 text-primary" aria-hidden="true" /> Compose
      </h3>

      <div>
        {step(1, "Page to send")}
        <DemoPicker lead={lead} />
      </div>

      <div>
        {step(2, "Channel")}
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Channel">
          {([
            ["email", "Email", Mail, hasMail],
            ["whatsapp", "WhatsApp", MessageCircle, hasWa],
          ] as const).map(([c, label, Icon, has]) => (
            <button key={c} type="button" role="tab" aria-selected={channel === c} onClick={() => { setChannel(c); setTemplateId(""); }}
              className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium", channel === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              {!has && <span className="text-xs font-normal">(none)</span>}
            </button>
          ))}
        </div>
      </div>

      <div>
        {step(3, "Message")}
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">Stage
            <select aria-label="Stage" className={selectCls} value={stage} onChange={(e) => { setStage(e.target.value as TemplateStage); setTemplateId(""); }}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Pitch
            <select aria-label="Pitch" className={selectCls} value={pitch} onChange={(e) => { setPitch(e.target.value as TemplatePitch); setTemplateId(""); }}>
              {(Object.keys(PITCH_LABELS) as TemplatePitch[]).map((p) => <option key={p} value={p}>{PITCH_LABELS[p]}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Language
            <select aria-label="Language" className={selectCls} value={language} onChange={(e) => { setLanguage(e.target.value as TemplateLanguage); setTemplateId(""); }}>
              {(Object.keys(LANGUAGE_LABELS) as TemplateLanguage[]).map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
            </select>
          </label>
        </div>
        {!options.length && fallback.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No {LANGUAGE_LABELS[language]} template for this stage, so all languages are shown.</p>
        )}
        <ul className="mt-3 space-y-1.5" role="radiogroup" aria-label="Template" data-testid="template-list">
          {list.map((t) => (
            <li key={t.id}>
              <button type="button" role="radio" aria-checked={template?.id === t.id} onClick={() => setTemplateId(t.id)}
                className={cn("w-full rounded-xl border px-3 py-2.5 text-left text-sm", template?.id === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <span className="font-medium">{t.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{LANGUAGE_LABELS[t.language]}{t.allowsLink ? " · with link" : " · no link"}</span>
                {t.note && <span className="mt-0.5 block text-xs text-muted-foreground">{t.note}</span>}
              </button>
            </li>
          ))}
          {!list.length && <li className="text-sm text-muted-foreground">No template for this stage and pitch. Try Pitch: Any.</li>}
        </ul>
      </div>

      <div>
        {step(4, "What you noticed (only if you checked it yourself)")}
        <select aria-label="Observation" className={selectCls} value={obsKnown || !observation ? observation : "__custom"}
          onChange={(e) => setObservation(e.target.value === "__custom" ? " " : e.target.value)}>
          <option value="">No observation</option>
          {OBSERVATIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          <option value="__custom">Type my own sentence</option>
        </select>
        {!obsKnown && observation !== "" && (
          <input aria-label="Your own observation" className={inputCls} value={observation.trimStart()} onChange={(e) => setObservation(e.target.value || " ")} placeholder="One sentence about what you saw on their site" />
        )}
      </div>

      <div>
        {step(5, "Preview (you can edit it)")}
        {channel === "email" && (
          <label className="block text-xs text-muted-foreground">Subject
            <input aria-label="Subject" className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
        )}
        <label className="mt-2 block text-xs text-muted-foreground">{channel === "email" ? "Email" : "WhatsApp message"}
          <textarea aria-label="Message text" rows={channel === "email" ? 14 : 9} className={textareaCls} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <p className="mt-1 break-all text-xs text-muted-foreground">
          To: {channel === "email" ? lead.email || "no email" : waNumber || "no number"}
          {channel === "email" && settings.senderGmail ? ` · from ${settings.senderGmail}` : ""}
        </p>
      </div>

      <div className="space-y-2">
        {step(6, "Checks")}
        <Blockers items={blockers} />
        <Warnings items={uniqueWarnings} />
        {!blocked && !uniqueWarnings.length && <p className="text-sm text-success">All clear.</p>}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {channel === "email" ? (
          <>
            {sendBtn(links.gmail || "", "Gmail", "Open in Gmail", Mail, true, "open-gmail")}
            {sendBtn(links.mailto || "", "email app", "Open email app", Mail, false, "open-mailto")}
          </>
        ) : (
          <>
            {sendBtn(links.wa || "", "WhatsApp", "Open WhatsApp", MessageCircle, true, "open-whatsapp")}
            {sendBtn(links.waWeb || "", "WhatsApp Web", "WhatsApp Web", Monitor, false, "open-whatsapp-web")}
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Opens {channel === "email" ? "Gmail" : "WhatsApp"} with the text typed. Press Send there. The send is logged here and the next follow-up is dated.
        {channel === "whatsapp" && ` First WhatsApp messages today: ${waToday} of ${settings.whatsappDailyCap}.`}
      </p>
    </section>
  );
}
