import { useState } from "react";
import type { CrmClient } from "@/lib/clients/types";
import { fmtDate, indiaDate } from "@/lib/clients/numbering";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { areaCls, errText, Field, inputCls, Problem } from "./shared";

/**
 * CONSENT (client-process-spec 4.11): may they be named (SA cl. 12.1, the opt-out of cl. 12.3), the
 * testimonial (their approved words, the consent line, "Haan, approved", date and channel; nothing is
 * published before the written yes), the logo permission, the review asked and left, the referral asked.
 * The client card says plainly: "May be named: yes / no"; "Testimonial: permission on file / not".
 */
export function ConsentPanel({ client, projectId, onMessage }: { client: CrmClient; projectId: string; onMessage: (ids: string[]) => void }) {
  const { saveClient, today } = useClients();
  const t = client.testimonial || { status: "not_asked" as const };
  const [quote, setQuote] = useState(t.quote || "");
  const [channel, setChannel] = useState(t.channel || "WhatsApp");
  const [err, setErr] = useState<string | null>(null);
  const save = async (patch: Partial<CrmClient>, detail: string) => {
    setErr(null);
    try {
      await saveClient(client.id, patch, { type: "note", projectId, detail });
    } catch (e) {
      setErr(errText(e));
    }
  };
  const now = new Date().toISOString();
  return (
    <div className="space-y-3 text-[13px]" data-testid="consent-panel">
      <p>May be named: <strong>{client.portfolioOptOut === true ? "no (opt-out)" : client.portfolioOptOut === false ? "yes" : "not asked yet"}</strong>. Testimonial: <strong>{t.status === "permission_on_file" ? "permission on file" : "not on file"}</strong>.</p>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="font-medium">Testimonial ({t.status.replace(/_/g, " ")}{t.askedAt ? `, asked ${fmtDate(indiaDate(t.askedAt))}` : ""})</p>
        <Field id="ts-quote" label="Their words, as edited and sent back for approval"><textarea id="ts-quote" rows={3} className={areaCls} value={quote} onChange={(e) => setQuote(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={crm.btn} onClick={() => onMessage(["cp_feedback_testimonial_wa_hi", "cp_feedback_testimonial_em_en"])}>The ask</button>
          <button type="button" className={crm.btn} onClick={() => void save({ testimonial: { ...t, status: "asked", askedAt: t.askedAt || now } }, "Testimonial asked")}>Mark asked</button>
          <button type="button" className={crm.btn} disabled={!quote.trim()} onClick={() => void save({ testimonial: { ...t, status: "received", quote: quote.trim() } }, "Testimonial received")}>Their words received</button>
          <button type="button" className={crm.btn} disabled={!quote.trim()} onClick={() => onMessage(["cp_feedback_consent_wa_hi", "cp_feedback_consent_em_en"])}>The consent line</button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field id="ts-ch" label={'"Haan, approved" came by'}><input id="ts-ch" className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value)} /></Field>
          <button type="button" className={crm.btnPrimary} disabled={!quote.trim()} onClick={() => void save({ testimonial: { ...t, status: "permission_on_file", quote: quote.trim(), consentAt: now, channel } }, `Testimonial permission on file (${channel}); save it to 06-portfolio/_consents/`)}>Permission on file</button>
          <button type="button" className={crm.btnGhost} onClick={() => void save({ testimonial: { ...t, status: "declined", declinedAt: now } }, "Testimonial declined: not asked again for 90 days")}>They declined</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={crm.btn} onClick={() => void save({ logoPermission: { at: now, channel } }, "Logo permission recorded")}>Logo permission recorded</button>
        <button type="button" className={crm.btn} onClick={() => void save({ review: { ...(client.review || {}), leftAt: today } }, "Google review left")}>They left the review</button>
        <button type="button" className={crm.btn} onClick={() => void save({ referralAskedAt: now }, "Referral asked")}>Referral asked</button>
      </div>
      {client.logoPermission && <p className="text-[12px] text-muted-foreground">Logo permission: {fmtDate(indiaDate(client.logoPermission.at))}, {client.logoPermission.channel}.</p>}
      {client.review?.leftAt && <p className="text-[12px] text-muted-foreground">Review left {fmtDate(client.review.leftAt)}.</p>}
      <Problem text={err} />
    </div>
  );
}
