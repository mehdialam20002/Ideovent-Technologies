import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { saveSettings, type MetaAssignMode } from "@/lib/meta/client";
import { saveLocalSettings } from "@/lib/meta/localIntake";
import { cn } from "@/lib/utils";
import { crm } from "../ui";

const OPTIONS: { value: MetaAssignMode; label: string; hint: string }[] = [
  { value: "pool", label: "the Unassigned pool", hint: "You and anyone you share out to. The default." },
  { value: "owner", label: "me", hint: "Every new Meta lead is yours." },
  { value: "rules", label: "the assignment rules", hint: "Team > Rules, by kind and city, in turn. No rule fits: the pool." },
];

/**
 * Section 2 of the Meta page (meta-leads-spec 6.1): where new Meta leads go,
 * and at most how many a day. Saved through meta_set_settings on the live
 * CRM (the database checks both), in this browser in local mode.
 */
export function MetaAssign({ live, initial, blocked, onSaved }: {
  /** true: the live CRM with 0012 run; false: local mode. */
  live: boolean;
  initial: { assignMode: MetaAssignMode; dailyCap: number };
  /** Why it cannot be saved yet (0012 not run), or null. */
  blocked: string | null;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<MetaAssignMode>(initial.assignMode);
  const [cap, setCap] = useState(String(initial.dailyCap));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    setMode(initial.assignMode);
    setCap(String(initial.dailyCap));
  }, [initial.assignMode, initial.dailyCap]);

  const n = Number(cap);
  const capOk = Number.isInteger(n) && n >= 1 && n <= 5000;
  const changed = mode !== initial.assignMode || n !== initial.dailyCap;

  const save = async () => {
    if (!capOk) return;
    setBusy(true);
    setMsg(null);
    try {
      if (live) {
        const r = await saveSettings(mode, n);
        if (r.kind === "ok") setMsg({ text: "Saved." });
        else setMsg({ text: r.kind === "error" ? r.message : r.kind === "missing" ? "Run 0012 in Supabase first." : "Not saved.", bad: true });
        if (r.kind === "ok") onSaved();
      } else {
        saveLocalSettings(mode, n);
        setMsg({ text: "Saved in this browser." });
        onSaved();
      }
    } catch (e) {
      setMsg({ text: (e as Error).message || "Not saved.", bad: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="meta-assign" aria-labelledby="meta-assign-h" className={cn(crm.panel, crm.panelPad)}>
      <h2 id="meta-assign-h" className={crm.label}>New Meta leads go to</h2>
      <fieldset data-testid="meta-assign-mode" className="mt-2 space-y-0.5" disabled={Boolean(blocked) || busy}>
        <legend className="sr-only">Where new Meta leads go</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 hover:bg-muted/50">
            <input type="radio" name="meta-assign-mode" value={o.value} checked={mode === o.value} onChange={() => setMode(o.value)}
              className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
            <span className="min-w-0 text-[13px] leading-snug">
              <span className="font-medium">{o.label}</span>
              <span className="block text-muted-foreground">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
        At most
        <input data-testid="meta-daily-cap" type="number" inputMode="numeric" min={1} max={5000} step={1} value={cap}
          disabled={Boolean(blocked) || busy} onChange={(e) => setCap(e.target.value)} aria-invalid={!capOk}
          className={cn(crm.input, "w-24 max-md:h-11", !capOk && "border-destructive")} />
        new Meta leads a day
      </label>
      <p className="mt-1 text-[12px] text-muted-foreground">
        More than that in one day wait at Meta and come in after midnight (India time); nothing is lost.
      </p>
      {blocked && <p className="mt-2 text-[12px] text-muted-foreground">{blocked}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" data-testid="meta-settings-save" className={cn(crm.btn, "max-md:h-11")} disabled={Boolean(blocked) || busy || !capOk || !changed} onClick={() => void save()}>
          <Save className="h-4 w-4" aria-hidden="true" /> Save
        </button>
        <span aria-live="polite" className={cn("text-[13px]", msg?.bad ? "text-destructive" : "text-muted-foreground")}>{msg?.text}</span>
      </div>
    </section>
  );
}
