import { useState } from "react";
import { addDays, fmtDate, indiaDate } from "@/lib/clients/numbering";
import { approvalOf } from "@/lib/clients/stages";
import type { CrmProject } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { ApprovalDialog } from "./ApprovalDialog";
import { errText, inputCls, Problem } from "./shared";

/**
 * THE ROUNDS PANEL (client-process-spec 4.6; SA cl. 6.1, 6.2; SOP-03): one block per design stage, each
 * round sent with its review link ("Round 1 of 2"), the one consolidated list received, the three
 * buckets reply, "done, point by point". A round with no list after 7 days can be recorded as deemed
 * accepted (cl. 3.3). A third round opens the change request flow.
 */
export function RoundsPanel({ project, onMessage }: { project: CrmProject; onMessage: (ids: string[], roundN?: number) => void }) {
  const { saveProject, today } = useClients();
  const [link, setLink] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [deeming, setDeeming] = useState<number | null>(null);
  const rounds = [...(project.rounds || [])].sort((a, b) => a.n - b.n);
  const sent = rounds.filter((r) => r.sentAt);
  const nextN = (rounds[rounds.length - 1]?.sentAt ? rounds.length + 1 : rounds.length || 1);
  const pending = rounds.find((r) => !r.sentAt);
  const approved = approvalOf({ project }, "d_ok");
  const prepare = async () => {
    if (!/^https?:\/\//i.test(link.trim())) return setErr("The link to the designs for this round (https://...).");
    setErr(null);
    try {
      await saveProject(project.id, (p) => ({ ...p, rounds: [...(p.rounds || []).filter((r) => r.sentAt), { stage: p.designStages?.[0] || "Design", n: nextN, reviewLink: link.trim() }] }),
        { type: "item", detail: `Round ${nextN}: the review link set`, data: { panel: "rounds" } });
      setLink("");
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="space-y-2" data-testid="rounds-panel">
      <p className="text-[13px] font-medium" data-testid="rounds-used">Rounds used {Math.min(sent.length, 2)} of 2{sent.length > 2 ? ` (and ${sent.length - 2} more as change requests)` : ""}</p>
      <ul className="space-y-1.5">
        {rounds.map((r) => (
          <li key={r.n} className="rounded-lg border border-border p-2 text-[12px]" data-testid="round-row" data-round={r.n}>
            <p className="font-medium">Round {r.n} of 2{r.n > 2 ? " (beyond the included two: a change request)" : ""}</p>
            <p className="text-muted-foreground">
              {r.sentAt ? `Sent ${fmtDate(indiaDate(r.sentAt))}` : "Not sent yet"}{r.reviewLink ? ` · ${r.reviewLink}` : ""}
              {r.listAt ? ` · list received, buckets sent ${fmtDate(indiaDate(r.listAt))}` : ""}{r.doneAt ? ` · done ${fmtDate(indiaDate(r.doneAt))}` : ""}{r.deemedAt ? " · deemed accepted" : ""}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {!r.sentAt && <button type="button" className={crm.btnPrimary} onClick={() => onMessage(["cp_design_review_em_en"], r.n)} data-testid="round-send">Send the review e-mail</button>}
              {r.sentAt && !r.listAt && !r.deemedAt && <button type="button" className={crm.btn} onClick={() => onMessage(["cp_design_buckets_wa_hi"], r.n)}>List received: the three buckets</button>}
              {r.listAt && !r.doneAt && <button type="button" className={crm.btn} onClick={() => onMessage(["cp_design_round_done_em_en"], r.n)}>Round done, point by point</button>}
              {r.n === 2 && r.sentAt && <button type="button" className={crm.btnGhost} onClick={() => onMessage(["cp_design_round2_close_wa_hi"], r.n)}>The Round 2 note</button>}
              {r.sentAt && !r.listAt && !r.deemedAt && !approved && addDays(indiaDate(r.sentAt), 7) <= today && (
                <button type="button" className={crm.btnGhost} onClick={() => setDeeming(r.n)}>Record deemed acceptance</button>
              )}
            </div>
            {deeming === r.n && <ApprovalDialog projectId={project.id} what={`round:${r.stage}:${r.n}`} deemedFrom={indiaDate(r.sentAt!)} onDone={() => setDeeming(null)} />}
          </li>
        ))}
      </ul>
      {!pending && !approved && (
        sent.length >= 2 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[12px]">
            Both included rounds are used. A third round is a change request at the hourly rate (cl. 6.3), or phase two.
            <div className="mt-1 flex flex-wrap gap-1.5">
              <button type="button" className={crm.btn} onClick={() => onMessage(["cp_design_third_round_wa_hi", "cp_design_third_round_em_en"])}>The third-round message</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input aria-label={`Link to the designs for round ${nextN}`} className={cn(inputCls, "min-w-0 flex-1")} placeholder={`Round ${nextN}: the link to the designs`} value={link} onChange={(e) => setLink(e.target.value)} data-testid="round-link" />
            <button type="button" className={crm.btn} onClick={() => void prepare()} data-testid="round-prepare">Set up round {nextN}</button>
          </div>
        )
      )}
      <Problem text={err} />
    </div>
  );
}
