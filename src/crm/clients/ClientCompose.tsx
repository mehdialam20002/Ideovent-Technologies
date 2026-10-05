import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, Mail, MessageCircle, Monitor, X } from "lucide-react";
import { MessageBox } from "@/admin/outreach/MessageBox";
import { blanksIn, fillBlanks, piecesOf } from "@/admin/outreach/placeholders";
import { Blockers, Warnings } from "@/admin/outreach/ui";
import {
  afterSend, attachmentsOf, checkClientSend, clientSuggestionsFor, renderClientMessage, sendLinksFor, type MessageAbout,
} from "@/lib/clients/compose";
import { TEMPLATE_BY_ID, twinOf, type ClientTemplate } from "@/lib/clients/templates";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { copyText, errText, inputCls, Problem } from "./shared";
import { fmtDate } from "@/lib/clients/numbering";
import { useDocumentPdf } from "./DocumentDialog";

/** A formal notice also goes by registered post, speed post or courier (SA cl. 16.1): the date and the receipt number, on the project. */
function PostedRecord({ projectId, templateId, label }: { projectId: string; templateId: string; label: string }) {
  const { data, saveProject, today } = useClients();
  const project = data.projects.find((p) => p.id === projectId);
  const [on, setOn] = useState(today);
  const [receipt, setReceipt] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const done = project?.posted?.[templateId];
  if (done) return <p className="mt-1 text-[12px]" data-testid="posted-record">Posted on {done}.</p>;
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-border p-2 text-[12px]" data-testid="posted-form">
      <label className="flex flex-col gap-1">Posted on<input type="date" max={today} className={cn(inputCls, "h-8 w-auto")} value={on} onChange={(e) => setOn(e.target.value)} /></label>
      <label className="flex min-w-0 flex-1 flex-col gap-1">Receipt number<input className={cn(inputCls, "h-8")} value={receipt} onChange={(e) => setReceipt(e.target.value)} /></label>
      <button type="button" className={cn(crm.btn, "h-8")} onClick={async () => {
        if (!on || !receipt.trim()) return setErr("The date it was posted and the postal receipt number.");
        setErr(null);
        try {
          await saveProject(projectId, (p) => ({ ...p, posted: { ...(p.posted || {}), [templateId]: `${fmtDate(on)}, receipt ${receipt.trim()}` } }),
            { type: "note", detail: `Posted (registered post, speed post or courier): ${label}, on ${fmtDate(on)}, receipt ${receipt.trim()}` });
        } catch (e) {
          setErr(errText(e));
        }
      }}>Record the posting</button>
      {err && <p role="alert" className="w-full text-destructive">{err}</p>}
    </div>
  );
}

/**
 * A CLIENT MESSAGE (client-process-spec 7.1): the template filled in for this client, editable, every
 * [blank] highlighted with a box below it (MessageBox, with the client file's own suggestions: the
 * project's figures, never a price list). The send check blocks what is untrue or unsafe and warns on
 * the rest. Nothing is sent by the CRM: the buttons open WhatsApp, WhatsApp Web, Zoho Mail or the mail
 * app with the text in it, and pressing one records the send on the client's timeline (never as a lead
 * "sent" line) and ticks the item the template completes.
 */
export function ClientCompose({ clientId, projectId, templateIds, about, onClose, onSent }: {
  clientId: string;
  projectId: string | null;
  /** The templates offered, in order; the client's language picks among twins. */
  templateIds: string[];
  about?: MessageAbout;
  onClose: () => void;
  onSent?: (t: ClientTemplate) => void;
}) {
  const { composeCtxOf, saveProject, saveClient, syncLead, data, now } = useClients();
  const { settings: outreach } = useCrmData();
  const client = data.clients.find((c) => c.id === clientId);
  const lang = client?.language === "en" ? "en" : "hinglish";
  const offered = useMemo(() => templateIds.map((id) => TEMPLATE_BY_ID[id]).filter(Boolean), [templateIds]);
  const firstPick = useMemo(() => {
    const own = offered.find((t) => t.language === lang);
    return (own || offered[0])?.id || "";
  }, [offered, lang]);
  const [tid, setTid] = useState(firstPick);
  useEffect(() => setTid(firstPick), [firstPick]);
  const t = TEMPLATE_BY_ID[tid];
  const ctx = composeCtxOf(clientId, projectId, about);
  const rendered = useMemo(() => (t && ctx ? renderClientMessage(t, ctx) : null), [t, ctx]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fills, setFills] = useState<Record<string, string>>({});
  const [attached, setAttached] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState(false);
  const shownFor = useRef("");
  useEffect(() => {
    // A new template starts afresh; the same template re-filled (a fact saved meanwhile) keeps what was typed.
    if (shownFor.current !== tid) {
      shownFor.current = tid;
      setFills({});
      setAttached(false);
      setSent(null);
      setTouched(false);
      setSubject(rendered?.subject || "");
      setBody(rendered?.body || "");
      return;
    }
    if (!touched) {
      setSubject(rendered?.subject || "");
      setBody(rendered?.body || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid, rendered?.body, rendered?.subject]);
  const pdf = useDocumentPdf();

  if (!client || !t || !ctx || !rendered) return <p className="text-[13px] text-muted-foreground">No message for this step.</p>;
  const isEmail = t.channel === "email";
  const blanks = blanksIn(`${subject}\n${body}`);
  const finalSubject = fillBlanks(subject, fills);
  const finalBody = fillBlanks(body, fills);
  const check = checkClientSend(t, { subject: isEmail ? finalSubject : undefined, body: finalBody }, ctx, { attachedConfirmed: attached });
  const links = sendLinksFor(t, { subject: finalSubject, body: finalBody }, ctx, outreach.zohoMailUrl);
  const att = isEmail ? attachmentsOf(t, ctx) : [];
  const blocked = check.blockers.length > 0;
  const twin = twinOf(t);
  const missingTwin = !twin && offered.length === 1 ? (t.language === "en" ? "Hinglish version not written yet." : "English version not written yet.") : "";

  const record = async (how: string) => {
    setErr(null);
    const channel = t.channel;
    const line = {
      type: "sent" as const,
      channel,
      templateId: t.id,
      detail: `${channel === "whatsapp" ? "WhatsApp" : "E-mail"} opened in ${how}: ${t.label}${isEmail && finalSubject ? `, "${finalSubject}"` : ""}`,
      data: { stage: t.stage, ...(about?.docId ? { docId: about.docId } : {}), ...(about?.paymentId ? { paymentId: about.paymentId } : {}) },
    };
    try {
      if (projectId) {
        await saveProject(projectId, (p) => afterSend(p, t, channel, about, new Date()), line);
        if ((t.ticks || []).includes("p_sent")) await syncLead(client.leadId, "proposal");
      } else {
        const docKey = about?.docId || (about?.renewal ? `renewal:${about.renewal}` : undefined);
        await saveClient(clientId, { sends: [...(client.sends || []), { t: t.id, at: new Date().toISOString(), ch: channel, ...(docKey ? { doc: docKey } : {}) }] }, line);
      }
      setSent(how);
      onSent?.(t);
    } catch (e) {
      setErr(`The send was not recorded: ${errText(e)}`);
    }
  };

  const linkBtn = (href: string | undefined, how: string, label: string, Icon: typeof Mail, primary: boolean, testId: string, onClick?: () => void) =>
    blocked || !href ? (
      <button type="button" disabled className={cn(primary ? crm.btnPrimary : crm.btn, "max-md:h-11")} data-testid={testId}>
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </button>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} className={cn(primary ? crm.btnPrimary : crm.btn, "max-md:h-11")}
        onClick={() => {
          onClick?.();
          void record(how);
        }}>
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </a>
    );

  return (
    <section className={cn(crm.panel, "p-4")} data-testid="client-compose" data-template={t.id} aria-label={`Message: ${t.label}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{t.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {t.channel === "whatsapp" ? "WhatsApp" : "E-mail"} · {t.language === "en" ? "English" : "Hinglish"} · Source: {t.source}
            {t.textKind === "E" && ` · Edited (${(t.edits || []).join(", ")})`}
            {t.textKind !== "S" && !data.settings.approvedWording[t.id] && <span className="ml-1 rounded bg-amber-500/15 px-1 text-amber-700 dark:text-amber-300">New wording</span>}
          </p>
        </div>
        <button type="button" className={crm.btnGhost} onClick={onClose} aria-label="Close the message"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      {offered.length > 1 && (
        <label className="mt-2 block text-[12px] text-muted-foreground">
          Message
          <select className={cn(crm.input, "mt-1")} value={tid} onChange={(e) => setTid(e.target.value)} data-testid="compose-template">
            {offered.map((x) => (
              <option key={x.id} value={x.id}>{x.label} ({x.channel === "whatsapp" ? "WhatsApp" : "e-mail"}, {x.language === "en" ? "English" : "Hinglish"})</option>
            ))}
          </select>
        </label>
      )}
      {missingTwin && <p className="mt-1 text-[11px] text-muted-foreground">{missingTwin}</p>}
      <MessageBox
        isEmail={isEmail}
        subject={subject}
        body={body}
        pieces={piecesOf(body, fills)}
        blanks={blanks}
        fills={fills}
        onSubject={(v) => { setTouched(true); setSubject(v); }}
        onBody={(v) => { setTouched(true); setBody(v); }}
        onFill={(name, value) => setFills((f) => ({ ...f, [name]: value }))}
        now={now}
        suggest={(name) => clientSuggestionsFor(name, ctx)}
      />
      {att.length > 0 && (
        <div className="mt-3 rounded-lg border border-border p-3 text-[13px]" data-testid="compose-attachments">
          <p className="font-medium">Attach in your mail app</p>
          <ul className="mt-1 space-y-1">
            {att.map((a) => (
              <li key={a.label} className="flex flex-wrap items-center gap-2">
                <span>{a.doc ? `${a.label}` : a.label}</span>
                {a.doc && (
                  <button type="button" className={crm.btn} onClick={() => void pdf.download(a.doc!.id)} data-testid="compose-download">
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download PDF
                  </button>
                )}
              </li>
            ))}
          </ul>
          <label className="mt-2 flex min-h-11 items-center gap-2 md:min-h-9">
            <input type="checkbox" checked={attached} onChange={(e) => setAttached(e.target.checked)} data-testid="compose-attached" />
            I attached: {att.map((a) => a.label).join(", ")}
          </label>
        </div>
      )}
      {t.formal && <p className="mt-2 text-[12px] text-muted-foreground">Send by registered post, speed post or courier too (cl. 16.1), then record "Posted on" below.</p>}
      {t.formal && projectId && <PostedRecord projectId={projectId} templateId={t.id} label={t.label} />}
      <div className="mt-3 space-y-2">
        <Blockers items={check.blockers} />
        <Warnings items={check.warnings} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2" data-testid="compose-send">
        {isEmail ? (
          <>
            {linkBtn(links.zoho?.href, "Zoho Mail", "Open in Zoho Mail", Mail, true, "client-open-zoho", () => void copyText(finalBody))}
            {linkBtn(links.mailto, "mail app", "Open in mail app", Mail, false, "client-open-mailto")}
          </>
        ) : (
          <>
            {linkBtn(links.whatsapp, "WhatsApp", "Open in WhatsApp", MessageCircle, true, "client-open-wa")}
            {linkBtn(links.whatsappWeb, "WhatsApp Web", "WhatsApp Web", Monitor, false, "client-open-waweb")}
          </>
        )}
        <button type="button" className={crm.btn} disabled={blocked}
          onClick={async () => {
            const ok = await copyText(isEmail ? `Subject: ${finalSubject}\n\n${finalBody}` : finalBody);
            setCopied(ok);
            if (ok) await record("a copy of the text");
          }}>
          <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? "Copied" : "Copy text"}
        </button>
      </div>
      {links.zoho && !links.zoho.withBody && <p className="mt-1 text-[11px] text-muted-foreground">Long e-mail: Zoho opens with the address and the subject only. The text is copied: paste it in.</p>}
      <Problem text={err} />
      {sent && <p role="status" className="mt-2 text-[13px] text-emerald-700 dark:text-emerald-400" data-testid="compose-recorded">Recorded on the timeline: opened in {sent}.</p>}
    </section>
  );
}
