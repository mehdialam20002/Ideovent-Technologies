import { useEffect, useMemo, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { crmErrorText, heldBy, planDistribution, sharePeople } from "@/lib/outreach/access";
import type { CrmMember, DistributeMode, DistributeRow } from "@/lib/outreach/team";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { Note, plural, ROLE_LABEL } from "./teamUi";
import { useMembers } from "./useTeam";

/**
 * SHARE OUT (spec 10.3): leads between people, balanced (fewest New leads
 * waiting first) or round-robin, within each person's New-lead cap.
 *
 * The preview is the database's own rule run in the browser (access.ts
 * planDistribution, the mirror of crm_distribute), so what it shows is what
 * "Share out" does: the split per person, the leads left over because of
 * caps, the ones already contacted (they stay where they are unless ticked),
 * the ones at Call or Proposal (they stay with Mehdi), and how many have no
 * demo yet (interns' best first message is "we made a sample").
 */

/** "Asha 7, Bilal 6": who gets how many, in the order given; nobody with none. */
export function splitText(rows: DistributeRow[], nameOf: (id: string) => string): string {
  return rows
    .filter((r) => r.memberId && r.assigned > 0)
    .map((r) => `${nameOf(r.memberId as string)} ${r.assigned}`)
    .join(", ");
}

/** The result line: "Shared out 3: Asha 2, Bilal 1. 1 left over: caps." */
export function shareResultText(rows: DistributeRow[], nameOf: (id: string) => string): string {
  const given = rows.filter((r) => r.memberId).reduce((n, r) => n + r.assigned, 0);
  const left = rows.filter((r) => !r.memberId).reduce((n, r) => n + r.assigned, 0);
  const split = splitText(rows, nameOf);
  return `Shared out ${given}${split ? `: ${split}` : ""}.${left ? ` ${left} left over: caps.` : ""}`;
}

const memberFirst = (a: CrmMember, b: CrmMember) =>
  Number(a.role !== "member") - Number(b.role !== "member") || Number(a.role === "owner") - Number(b.role === "owner")
  || a.displayName.localeCompare(b.displayName);

export function DistributeDialog({ open, onOpenChange, leadIds, onDone, title }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  /** After a share-out: the result line and rows (the dialog shows them too). */
  onDone?: (text: string, rows: DistributeRow[]) => void;
  title?: string;
}) {
  const { leads, nameOf, distributeLeads } = useCrmData();
  const { members, loading } = useMembers();
  const ids = useMemo(() => [...new Set(leadIds)], [leadIds]);
  const chosen = useMemo(() => {
    const s = new Set(ids);
    return leads.filter((l) => s.has(l.id));
  }, [ids, leads]);
  const candidates = useMemo(() => members.filter((m) => m.active).sort(memberFirst), [members]);

  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<DistributeMode>("balanced");
  const [includeContacted, setIncludeContacted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const touched = useRef(false);

  useEffect(() => {
    if (!open) return;
    touched.current = false;
    setMode("balanced");
    setIncludeContacted(false);
    setErr(null);
    setResult(null);
  }, [open]);
  /* Every active member is ticked to start with (share-outs are for the interns), until the list is touched. */
  useEffect(() => {
    if (open && !touched.current) setPicked(candidates.filter((m) => m.role === "member").map((m) => m.id));
  }, [open, candidates]);

  const toggle = (id: string) => {
    touched.current = true;
    const on = new Set(picked);
    if (on.has(id)) on.delete(id);
    else on.add(id);
    setPicked(candidates.filter((c) => on.has(c.id)).map((c) => c.id));
  };

  const people = useMemo(() => sharePeople(leads, members, picked, ids), [leads, members, picked, ids]);
  const preview = useMemo(() => planDistribution(chosen, people, mode, includeContacted), [chosen, people, mode, includeContacted]);
  const per = new Map<string, number>();
  let left = 0;
  for (const to of preview.plan.values()) {
    if (to) per.set(to, (per.get(to) || 0) + 1);
    else left++;
  }
  const planned: DistributeRow[] = picked.map((id) => ({ memberId: id, assigned: per.get(id) || 0 }));
  const total = planned.reduce((n, r) => n + r.assigned, 0);
  const { contacted, mehdis, closed } = preview.skipped;

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const rows = await distributeLeads(ids, picked, mode, includeContacted);
      const text = shareResultText(rows, (id) => nameOf(id));
      setResult(text);
      onDone?.(text, rows);
    } catch (e) {
      setErr(crmErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const radio = "inline-flex min-h-11 cursor-pointer items-start gap-2 text-[13px] md:min-h-0";
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent data-testid="distribute-dialog" className="max-h-[92dvh] max-w-lg overflow-y-auto rounded-xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-base">{title || `Share out ${plural(ids.length, "lead")}`}</DialogTitle>
          <DialogDescription className="text-[13px]">
            Each person gets New leads up to their cap. Nothing moves until you press Share out.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <Note tone="good" testId="distribute-result">{result}</Note>
            <div className="flex justify-end">
              <button type="button" className={crm.btnPrimary} onClick={() => onOpenChange(false)}>Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className={crm.label}>Between</legend>
              {loading && !candidates.length ? (
                <p className="mt-2 text-[13px] text-muted-foreground">Loading the team...</p>
              ) : !candidates.length ? (
                <p className="mt-2 text-[13px] text-muted-foreground">Nobody to share with yet. Add people on the Team page first.</p>
              ) : (
                <ul className="mt-1.5 divide-y divide-border/60 rounded-lg border border-border">
                  {candidates.map((m) => {
                    const held = heldBy(leads, m.id);
                    return (
                      <li key={m.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px]">
                          <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)}
                            className="h-4 w-4 accent-[hsl(var(--primary))]" aria-label={`Share with ${m.displayName}`} />
                          <span className="min-w-0 flex-1 truncate font-medium">{m.displayName}</span>
                          <span className={cn("shrink-0 text-[12px] text-muted-foreground", crm.num)}>
                            {m.role === "member" ? `${held.newLeads}/${m.newLeadCap} new` : ROLE_LABEL[m.role]}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>

            <fieldset className="space-y-1">
              <legend className={crm.label}>How</legend>
              <label className={radio}>
                <input type="radio" name="dist-mode" checked={mode === "balanced"} onChange={() => setMode("balanced")} className="mt-0.5" />
                <span>Balanced (fewest new leads waiting first)</span>
              </label>
              <label className={radio}>
                <input type="radio" name="dist-mode" checked={mode === "round_robin"} onChange={() => setMode("round_robin")} className="mt-0.5" />
                <span>Round-robin (one each, in turn)</span>
              </label>
              <label className={cn(radio, "pt-1")}>
                <input type="checkbox" checked={includeContacted} onChange={(e) => setIncludeContacted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
                <span>Include leads already contacted</span>
              </label>
            </fieldset>

            <div className={cn(crm.panel, "space-y-1.5 bg-muted/30 p-3 text-[13px]")} aria-live="polite">
              <p className={crm.label}>Preview</p>
              <p data-testid="distribute-preview" className="font-medium">
                {total ? splitText(planned, (id) => nameOf(id)) : picked.length ? "Nobody gets a lead with these choices." : "Tick at least one person."}
              </p>
              {left > 0 && <p data-testid="distribute-left">{left} left over: caps</p>}
              {contacted > 0 && !includeContacted && (
                <p>{contacted} already contacted {contacted === 1 ? "stays where it is" : "stay where they are"} (tick to include)</p>
              )}
              {mehdis > 0 && <p data-testid="distribute-mehdis">{mehdis} at Call or Proposal {mehdis === 1 ? "stays" : "stay"} with Mehdi</p>}
              {closed > 0 && <p>{closed} closed {closed === 1 ? "lead stays" : "leads stay"} where {closed === 1 ? "it is" : "they are"}</p>}
              {preview.noDemo > 0 && (
                <p className="text-amber-800 dark:text-amber-300">
                  <strong>{preview.noDemo} of these {preview.noDemo === 1 ? "has" : "have"} no demo.</strong> Make demos first, so interns can use the
                  "sample we made" first message.
                </p>
              )}
            </div>

            {err && <Note tone="bad">{err}</Note>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => onOpenChange(false)} disabled={busy}>Cancel</button>
              <button type="button" data-testid="distribute-run" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={busy || !total} onClick={() => void run()}>
                <Shuffle className="h-4 w-4" aria-hidden="true" /> {busy ? "Sharing out..." : `Share out ${total || ""}`.trim()}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
