import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { crmErrorText } from "@/lib/outreach/access";
import type { AssignmentRule } from "@/lib/outreach/team";
import type { OutreachLead } from "@/lib/outreach/types";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { AssigneePicker } from "./AssigneePicker";
import { DistributeDialog, shareResultText } from "./DistributeDialog";
import { Note, plural } from "./teamUi";
import { teamStore } from "./useTeam";

type Choice = "leave" | "assign" | "share" | "rules";

/**
 * AFTER AN IMPORT (spec 10.3.4): "Assign the N new leads". Leave them
 * Unassigned (the default), assign them all to one person, share them out,
 * or apply the rules (phase 2). It runs as a second call after the import,
 * which is one write of its own: if this step fails, the leads simply stay
 * Unassigned, and it says so.
 */
export function ImportAssignStep({ added }: { added: OutreachLead[] }) {
  const { can } = useCrmMe();
  const { assignLeads, applyRules, nameOf } = useCrmData();
  const [choice, setChoice] = useState<Choice>("leave");
  const [person, setPerson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const ids = useMemo(() => added.map((l) => l.id), [added]);
  const allowed = can("lead.assign");
  useEffect(() => {
    setChoice("leave");
    setMsg(null);
    if (allowed) teamStore().listRules().then(setRules).catch(() => setRules([]));
  }, [ids, allowed]);
  if (!allowed || !added.length) return null;

  const go = async () => {
    if (choice === "share") {
      setSharing(true);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (choice === "assign" && person) {
        const n = await assignLeads(ids, person);
        setMsg({ text: `${plural(n, "lead")} assigned to ${nameOf(person)}.` });
      } else if (choice === "rules") {
        const rows = await applyRules(ids, false);
        setMsg({ text: shareResultText(rows, (id) => nameOf(id)).replace(/^Shared out/, "Assigned") });
      }
    } catch (e) {
      setMsg({ text: `The new leads stay Unassigned: ${crmErrorText(e)}`, bad: true });
    } finally {
      setBusy(false);
    }
  };

  const radio = "flex min-h-11 cursor-pointer items-center gap-2.5 text-[13px] md:min-h-9";
  const n = added.length;
  return (
    <section aria-labelledby="import-assign-h" data-testid="import-assign" className={cn(crm.panel, "space-y-3 p-4")}>
      <h2 id="import-assign-h" className="flex items-center gap-2 text-[14px] font-semibold">
        <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Assign the {plural(n, "new lead")}
      </h2>
      {msg ? (
        <Note tone={msg.bad ? "bad" : "good"}>{msg.text}</Note>
      ) : (
        <>
          <fieldset className="space-y-0.5">
            <legend className="sr-only">Who works them</legend>
            <label className={radio}>
              <input type="radio" name="imp-assign" checked={choice === "leave"} onChange={() => setChoice("leave")} />
              Leave them Unassigned (share them out later)
            </label>
            <label className={radio}>
              <input type="radio" name="imp-assign" checked={choice === "assign"} onChange={() => setChoice("assign")} />
              Assign all to one person
            </label>
            {choice === "assign" && (
              <div className="pb-1 pl-7">
                <AssigneePicker value={person} onChange={setPerson} showLoad label="Assign the new leads to" testId="import-assign-to" />
              </div>
            )}
            <label className={radio}>
              <input type="radio" name="imp-assign" checked={choice === "share"} onChange={() => setChoice("share")} />
              Share out between people
            </label>
            {rules.some((r) => r.active) && (
              <label className={radio}>
                <input type="radio" name="imp-assign" checked={choice === "rules"} onChange={() => setChoice("rules")} />
                Apply the rules (Team &gt; Rules)
              </label>
            )}
          </fieldset>
          {choice !== "leave" && (
            <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={busy || (choice === "assign" && !person)} onClick={() => void go()}>
              {busy ? "Working..." : choice === "share" ? "Choose people..." : choice === "rules" ? "Apply the rules" : "Assign"}
            </button>
          )}
        </>
      )}
      <DistributeDialog open={sharing} onOpenChange={setSharing} leadIds={ids} title={`Share out the ${plural(n, "new lead")}`}
        onDone={(text) => setMsg({ text })} />
    </section>
  );
}
