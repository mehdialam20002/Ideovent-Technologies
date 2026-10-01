import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { outreachStore } from "@/lib/outreach/store";
import { looksLikeNote, otherLeadsNamed } from "@/admin/outreach/compose";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { cn } from "@/lib/utils";

export interface DirtyObservation {
  lead: OutreachLead;
  why: string;
}

/**
 * Saved observations that must not reach a message: one naming ANOTHER lead
 * (the 28 Sep 2026 bug wrote one imported lead's name into other leads) or
 * one that reads like a research note ("curl ...: HTTP 200"). Pure.
 */
export function dirtyObservations(leads: OutreachLead[]): DirtyObservation[] {
  const out: DirtyObservation[] = [];
  for (const lead of leads) {
    const o = (lead.observation || "").trim();
    if (!o) continue;
    const others = otherLeadsNamed(o, lead, leads);
    if (others.length) out.push({ lead, why: `Names ${others.map((x) => x.instituteName).join(", ")}` });
    else if (looksLikeNote(o)) out.push({ lead, why: "Reads like a research note" });
  }
  return out;
}

/**
 * "Clean saved observations": lists them, all ticked, and clears the ticked
 * ones in ONE write (the store's upsertLeads), then re-reads the CRM.
 */
export function CleanObservations() {
  const { leads, refresh } = useCrmData();
  const dirty = useMemo(() => dirtyObservations(leads), [leads]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const chosen = dirty.filter((d) => !off.has(d.lead.id));

  const toggle = (id: string) =>
    setOff((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const clean = async () => {
    if (!chosen.length) return;
    setBusy(true);
    setMsg(null);
    try {
      await outreachStore.upsertLeads(chosen.map((d) => ({ ...d.lead, observation: undefined })));
      await refresh();
      setOff(new Set());
      setMsg({ text: `Cleared ${chosen.length} saved ${chosen.length === 1 ? "observation" : "observations"}.` });
    } catch (e) {
      setMsg({ text: `Nothing was cleared: ${(e as Error).message || "unknown error"}`, bad: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn(crm.panel, crm.panelPad, "space-y-3")} aria-labelledby="clean-obs-h" data-testid="clean-observations">
      <div>
        <h2 id="clean-obs-h" className="font-display text-lg font-semibold">Clean saved observations</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          An observation is the one sentence about their site that goes into a message. These ones name another lead or read
          like a research note, so they are never used. Clearing them removes only the observation; notes and history stay.
        </p>
      </div>
      {!dirty.length ? (
        <p className="text-[13px] text-muted-foreground">Nothing to clean. Every saved observation is about its own lead.</p>
      ) : (
        <>
          <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
            {dirty.map((d) => (
              <li key={d.lead.id}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2 text-[13px] hover:bg-muted/40">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={!off.has(d.lead.id)} onChange={() => toggle(d.lead.id)} />
                  <span className="min-w-0">
                    <span className="block font-medium">{d.lead.instituteName}</span>
                    <span className="block text-[12px] text-destructive">{d.why}</span>
                    <span className="block break-words text-[12px] text-muted-foreground">"{d.lead.observation}"</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={crm.btnPrimary} disabled={busy || !chosen.length} onClick={() => void clean()}>
              <Eraser className="h-4 w-4" aria-hidden="true" /> {busy ? "Clearing..." : `Clear ${chosen.length} ${chosen.length === 1 ? "observation" : "observations"}`}
            </button>
            <span className="text-[12px] text-muted-foreground">{dirty.length} found</span>
          </div>
        </>
      )}
      <p aria-live="polite" className={cn("text-[13px]", msg?.bad ? "text-destructive" : "text-success")}>{msg?.text}</p>
    </section>
  );
}
