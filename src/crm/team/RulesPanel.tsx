import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { crmErrorText, isOpenStatus, planRulesDetailed, rulePeople } from "@/lib/outreach/access";
import type { AssignmentRule, AssignmentRuleInput } from "@/lib/outreach/team";
import type { LeadKind } from "@/lib/outreach/types";
import { KIND_LABEL, LEAD_KINDS } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { shareResultText, splitText } from "./DistributeDialog";
import { Chip, Note, SwitchRow } from "./teamUi";
import { teamStore, useMembers } from "./useTeam";

/**
 * TEAM > RULES (spec 10.3.8; phase 2 screen, the SQL is in 0011): who gets
 * which Unassigned leads, by kind and "city contains", in turn inside each
 * rule, first matching rule by priority. Nothing runs by itself yet: "Apply
 * to Unassigned now" runs them once (crm_apply_rules), New leads only unless
 * ticked, never Call or Proposal, never past a person's cap. Mehdi writes the
 * rules; an admin reads them and may apply them.
 */

const blankRule = (): AssignmentRuleInput => ({ name: "", kind: null, city: "", memberIds: [], priority: 100, active: true });

export function RulesPanel() {
  const { can } = useCrmMe();
  const { leads, nameOf, applyRules } = useCrmData();
  const { members } = useMembers();
  const manage = can("rules.manage");
  const [rules, setRules] = useState<AssignmentRule[] | null>(null);
  const [edit, setEdit] = useState<AssignmentRuleInput | null>(null);
  const [includeContacted, setIncludeContacted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setRules(await teamStore().listRules());
    } catch (e) {
      setMsg({ text: crmErrorText(e), bad: true });
      setRules([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const pool = useMemo(() => leads.filter((l) => l.assigneeId === null && isOpenStatus(l.status)), [leads]);
  const preview = useMemo(() => {
    if (!rules) return null;
    const { plan } = planRulesDetailed(pool, rules, rulePeople(leads, members), includeContacted);
    const per = new Map<string, number>();
    for (const to of plan.values()) per.set(to, (per.get(to) || 0) + 1);
    const considered = pool.filter((l) => !["call", "proposal"].includes(l.status) && ((l.status || "new") === "new" || includeContacted)).length;
    return { rows: [...per].map(([memberId, assigned]) => ({ memberId, assigned })), given: plan.size, unmatched: considered - plan.size };
  }, [rules, pool, leads, members, includeContacted]);

  const run = async (fn: () => Promise<unknown>, done: string | ((r: unknown) => string)) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      await load();
      setMsg({ text: typeof done === "string" ? done : done(r) });
      return true;
    } catch (e) {
      setMsg({ text: crmErrorText(e), bad: true });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const active = members.filter((m) => m.active);
  return (
    <div className="space-y-4" data-testid="team-rules">
      <Note>Rules share out Unassigned leads by kind and city. Nothing runs by itself yet: press Apply when you want them used.</Note>
      <div aria-live="polite">{msg && <Note tone={msg.bad ? "bad" : "good"}>{msg.text}</Note>}</div>

      {rules === null ? (
        <p className="text-[13px] text-muted-foreground">Loading the rules...</p>
      ) : rules.length === 0 ? (
        <p className={cn(crm.panel, "px-4 py-6 text-center text-[13px] text-muted-foreground")}>No rules yet.</p>
      ) : (
        <ol className="space-y-2" aria-label="Rules, first match wins">
          {rules.map((r) => (
            <li key={r.id} className={cn(crm.panel, "flex flex-wrap items-start gap-3 p-3", !r.active && "opacity-70")}>
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="font-medium">{r.name} {!r.active && <Chip>Paused</Chip>}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {r.kind ? KIND_LABEL[r.kind] : "Any kind"} · {r.city ? `city contains "${r.city}"` : "any city"} · priority {r.priority}
                </p>
                <p className="mt-0.5">
                  In turn: {r.memberIds.map((id, i) => (
                    <span key={id} className={cn(i === r.nextIndex % Math.max(1, r.memberIds.length) && "font-semibold text-primary")}>
                      {nameOf(id)}{i < r.memberIds.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              </div>
              {manage && (
                <div className="flex gap-2">
                  <button type="button" className={cn(crm.btn, "h-8 px-2.5 text-[12px] max-md:h-10")} aria-label={`Edit ${r.name}`}
                    onClick={() => setEdit({ id: r.id, name: r.name, kind: r.kind, city: r.city || "", memberIds: r.memberIds, priority: r.priority, active: r.active })}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" className={cn(crm.btn, "h-8 px-2.5 text-[12px] text-destructive max-md:h-10")} aria-label={`Delete ${r.name}`} disabled={busy}
                    onClick={() => void run(() => teamStore().deleteRule(r.id), `"${r.name}" deleted.`)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {manage && !edit && (
        <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => setEdit(blankRule())}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add a rule
        </button>
      )}
      {manage && edit && (
        <form className={cn(crm.panel, "space-y-3 p-4")} aria-label={edit.id ? "Edit the rule" : "New rule"}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => teamStore().saveRule({ ...edit, name: edit.name.trim(), city: (edit.city || "").trim() || null }), `"${edit.name.trim()}" saved.`);
            if (ok) setEdit(null);
          }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-medium">Name
              <input className={cn(crm.input, "mt-1 max-md:h-11")} value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </label>
            <label className="text-[13px] font-medium">Kind
              <select className={cn(crm.input, "mt-1 max-md:h-11")} value={edit.kind || ""} onChange={(e) => setEdit({ ...edit, kind: (e.target.value || null) as LeadKind | null })}>
                <option value="">Any kind</option>
                {LEAD_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-medium">City contains
              <input className={cn(crm.input, "mt-1 max-md:h-11")} value={edit.city || ""} placeholder="Any city" onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
            </label>
            <label className="text-[13px] font-medium">Priority (lower runs first)
              <input inputMode="numeric" className={cn(crm.input, "mt-1 max-md:h-11")} value={String(edit.priority ?? 100)}
                onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value.replace(/[^\d]/g, "") || 0) })} />
            </label>
          </div>
          <fieldset>
            <legend className="text-[13px] font-medium">People, in turn</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {active.map((m) => (
                <label key={m.id} className="inline-flex min-h-11 items-center gap-2 text-[13px] md:min-h-0">
                  <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={edit.memberIds.includes(m.id)}
                    onChange={(e) => setEdit({ ...edit, memberIds: e.target.checked ? [...edit.memberIds, m.id] : edit.memberIds.filter((x) => x !== m.id) })} />
                  {m.displayName}
                </label>
              ))}
            </div>
          </fieldset>
          <SwitchRow id="rule-active" label="Active" checked={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => setEdit(null)}>Cancel</button>
            <button type="submit" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={busy || !edit.name.trim() || !edit.memberIds.length}>Save the rule</button>
          </div>
        </form>
      )}

      {rules && rules.some((r) => r.active) && can("lead.assign") && (
        <section aria-labelledby="rules-apply-h" className={cn(crm.panel, "space-y-2 p-4")}>
          <h3 id="rules-apply-h" className={crm.label}>Apply to Unassigned now</h3>
          <label className="inline-flex min-h-11 items-center gap-2 text-[13px] md:min-h-0">
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={includeContacted} onChange={(e) => setIncludeContacted(e.target.checked)} />
            Include leads already contacted
          </label>
          {preview && (
            <p className="text-[13px]" data-testid="rules-preview">
              {preview.given ? `${splitText(preview.rows, (id) => nameOf(id))}.` : "No Unassigned lead fits a rule (or everyone is at their cap)."}
              {preview.unmatched > 0 && <span className="text-muted-foreground"> {preview.unmatched} fit no rule and stay Unassigned.</span>}
            </p>
          )}
          <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={busy || !preview?.given}
            onClick={() => void run(() => applyRules(pool.map((l) => l.id), includeContacted), (rows) => shareResultText(rows as never, (id) => nameOf(id)).replace(/^Shared out/, "Assigned"))}>
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Apply the rules
          </button>
        </section>
      )}
    </div>
  );
}
