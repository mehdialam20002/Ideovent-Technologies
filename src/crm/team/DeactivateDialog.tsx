import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PowerOff } from "lucide-react";
import { crmErrorText, heldBy, isOpenStatus } from "@/lib/outreach/access";
import type { CrmMember } from "@/lib/outreach/team";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { AssigneePicker } from "./AssigneePicker";
import { Note, plural } from "./teamUi";
import { teamStore, useMembers, useTeamRefresh } from "./useTeam";

/** Team > Access for one person, last 7 days (the switch-off checklist links here). */
export const accessLink = (memberId: string, days = 7) => `${CRM.team}?tab=access&person=${encodeURIComponent(memberId)}&days=${days}`;

/**
 * SWITCH OFF (spec 5.4): where their open leads go, then off in one step
 * (crm_deactivate_member). With nobody picked, leads nobody has written to go
 * back to the pool and conversations go to Mehdi; closed leads keep their
 * name, so credit stays. From their next request they read nothing. Then the
 * offboarding checklist.
 */
export function DeactivateDialog({ open, onOpenChange, member, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CrmMember | null;
  onDone?: (text: string) => void;
}) {
  const { leads } = useCrmData();
  const { members } = useMembers();
  const refreshTeam = useTeamRefresh();
  const [to, setTo] = useState<"pool" | "person">("pool");
  const [person, setPerson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [moved, setMoved] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    setTo("pool");
    setPerson(null);
    setErr(null);
    setMoved(null);
  }, [open, member?.id]);

  const held = useMemo(() => {
    if (!member) return { open: 0, fresh: 0, talking: 0 };
    const mine = leads.filter((l) => l.assigneeId === member.id && isOpenStatus(l.status));
    const fresh = mine.filter((l) => (l.status || "new") === "new").length;
    return { open: mine.length, fresh, talking: mine.length - fresh };
  }, [leads, member]);
  const target = person ? members.find((m) => m.id === person) : undefined;
  const after = target && target.role === "member" ? heldBy(leads, target.id).newLeads + held.fresh : null;
  if (!member) return null;

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const n = await teamStore().deactivateMember(member.id, to === "person" ? person : null);
      setMoved(n);
      await refreshTeam();
      onDone?.(`${member.displayName} is switched off. ${plural(n, "open lead")} moved.`);
    } catch (e) {
      setErr(crmErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const radio = "flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] md:min-h-0";
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent data-testid="deactivate-dialog" className="max-h-[92dvh] max-w-md overflow-y-auto rounded-xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-base">{moved === null ? `Switch off ${member.displayName}?` : `${member.displayName} is switched off`}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {moved === null ? "From their next click they read nothing. You can switch them on again later, with no leads." : `${plural(moved, "open lead")} moved.`}
          </DialogDescription>
        </DialogHeader>

        {moved === null ? (
          <div className="space-y-3">
            <p className="text-[13px]">
              {held.open ? (
                <>
                  They hold <strong>{plural(held.open, "open lead")}</strong>: {held.fresh} nobody has written to yet, {held.talking} in a conversation.
                </>
              ) : (
                "They hold no open leads."
              )}
            </p>
            {held.open > 0 && (
              <fieldset className="space-y-2">
                <legend className={crm.label}>Their open leads go</legend>
                <label className={radio}>
                  <input type="radio" name="deact-to" checked={to === "pool"} onChange={() => setTo("pool")} className="mt-0.5" />
                  <span>To Mehdi and the pool: New leads back to Unassigned, conversations to Mehdi</span>
                </label>
                <label className={radio}>
                  <input type="radio" name="deact-to" checked={to === "person"} onChange={() => setTo("person")} className="mt-0.5" />
                  <span>To another person</span>
                </label>
                {to === "person" && (
                  <div className="pl-6">
                    <AssigneePicker value={person} onChange={setPerson} showLoad exclude={[member.id]} label="Give their leads to" testId="deactivate-to" />
                    {after !== null && target && (
                      <p className={cn("mt-1 text-[12px]", after > target.newLeadCap ? "text-destructive" : "text-muted-foreground")}>
                        {target.displayName} would have {after} new leads waiting; their cap is {target.newLeadCap}.
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            )}
            {err && <Note tone="bad">{err}</Note>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => onOpenChange(false)} disabled={busy}>Cancel</button>
              <button type="button" data-testid="deactivate-confirm" className={cn(crm.btnPrimary, "bg-destructive text-destructive-foreground max-md:h-11")}
                disabled={busy || (to === "person" && !person)} onClick={() => void run()}>
                <PowerOff className="h-4 w-4" aria-hidden="true" /> {busy ? "Switching off..." : "Switch off"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3" data-testid="offboarding-checklist">
            <p className={crm.label}>Then</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">
              <li>Delete their login in Supabase (optional: switched off already reads nothing).</li>
              <li>Take back the company SIM and its WhatsApp Business.</li>
              <li>Remove their @ideovent.in mailbox.</li>
              <li>
                <Link to={accessLink(member.id)} className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => onOpenChange(false)}>
                  Open Team &gt; Access, last 7 days
                </Link>{" "}
                for {member.displayName}.
              </li>
            </ol>
            <div className="flex justify-end">
              <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} onClick={() => onOpenChange(false)}>Done</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
