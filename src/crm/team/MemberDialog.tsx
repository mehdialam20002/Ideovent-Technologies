import { useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizePhone } from "@/lib/outreach/store";
import { crmErrorText } from "@/lib/outreach/access";
import { MEMBER_PRESETS, type CrmMember, type CrmTargets, type MemberPreset, type SaveMemberInput } from "@/lib/outreach/team";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { composedSignature } from "../me/identity";
import { crm } from "../ui";
import { AddLoginSteps } from "./AddLoginSteps";
import { Note, SwitchRow } from "./teamUi";
import { teamStore, useMembers, useTeamRefresh } from "./useTeam";

/**
 * ADD PERSON / EDIT (spec 5.1, 5.3, 10.2): Mehdi only. Name, e-mail, role,
 * a preset or the switches, limits, what their messages say (sender name,
 * company phone, signature with a live preview of the composed default) and
 * targets. A new person then gets "Create their login". Every field is saved
 * by crm_save_member; a new company number clears "Number checked".
 * Mehdi's own row takes his name, sender and targets only.
 */

const TARGET_FIELDS: { key: keyof CrmTargets; label: string }[] = [
  { key: "firstMessagesPerDay", label: "First messages a day" },
  { key: "callsPerDay", label: "Calls a day" },
  { key: "repliesPerWeek", label: "Replies a week" },
  { key: "handoffsPerWeek", label: "Hand-overs a week" },
];

interface Form {
  displayName: string;
  email: string;
  role: "member" | "admin";
  viewAll: boolean;
  canAddLeads: boolean;
  mayColdCall: boolean;
  /** Text: blank is "no limit" for an admin. */
  waLimit: string;
  newLeadCap: string;
  senderName: string;
  senderPhone: string;
  signature: string;
  targets: Record<keyof CrmTargets, string>;
  mustChangePassword: boolean;
  senderChecked: boolean;
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function formOf(m: CrmMember | null): Form {
  const t = m?.targets || {};
  return {
    displayName: m?.displayName || "",
    email: m?.email || "",
    role: m?.role === "admin" ? "admin" : "member",
    viewAll: Boolean(m?.viewAll),
    canAddLeads: Boolean(m?.canAddLeads),
    mayColdCall: Boolean(m?.mayColdCall),
    waLimit: m ? str(m.waDailyLimit) : "25",
    newLeadCap: m ? str(m.newLeadCap) : "40",
    senderName: m?.senderName || "",
    senderPhone: m?.senderPhone || "",
    signature: m?.signature || "",
    targets: {
      firstMessagesPerDay: str(t.firstMessagesPerDay),
      callsPerDay: str(t.callsPerDay),
      repliesPerWeek: str(t.repliesPerWeek),
      handoffsPerWeek: str(t.handoffsPerWeek),
    },
    mustChangePassword: Boolean(m?.mustChangePassword),
    senderChecked: Boolean(m?.senderCheckedAt),
  };
}

const whole = (s: string) => /^\d+$/.test(s.trim());

/** The form's problems, in plain words (the database checks the same). Empty: it can be saved. */
function problems(f: Form, isNew: boolean, owner: boolean): string[] {
  const out: string[] = [];
  const name = f.displayName.trim();
  if (!name || name.length > 80) out.push("A name of 1 to 80 characters.");
  if ((isNew || !owner) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) out.push("A real e-mail address (their login).");
  if (!owner) {
    if (f.role === "member" || f.waLimit.trim()) {
      if (!whole(f.waLimit) || Number(f.waLimit) > 500) out.push("First WhatsApp a day: a number from 0 to 500.");
    }
    if (f.role === "member" && (!whole(f.newLeadCap) || Number(f.newLeadCap) < 1 || Number(f.newLeadCap) > 1000)) {
      out.push("New leads they may hold: 1 to 1,000.");
    }
  }
  if (f.senderPhone.trim() && !normalizePhone(f.senderPhone)) out.push("The company phone does not look like a phone number.");
  if (f.senderName.length > 80) out.push("The sender name: 80 characters at most.");
  if (f.signature.length > 500) out.push("The signature: 500 characters at most.");
  for (const t of TARGET_FIELDS) if (f.targets[t.key].trim() && !whole(f.targets[t.key])) out.push(`${t.label}: a whole number, or blank.`);
  return out;
}

/** What crm_save_member gets: only what this kind of row takes; blank targets are left out. */
function inputOf(f: Form, m: CrmMember | null): SaveMemberInput {
  const targets: CrmTargets = {};
  for (const t of TARGET_FIELDS) if (whole(f.targets[t.key])) targets[t.key] = Number(f.targets[t.key]);
  const phone = f.senderPhone.trim() ? normalizePhone(f.senderPhone) || "" : "";
  const common: SaveMemberInput = {
    id: m?.id,
    displayName: f.displayName.trim(),
    senderName: f.senderName.trim(),
    senderPhone: phone,
    signature: f.signature.trim(),
    targets,
  };
  if (m?.role === "owner") return common;
  const admin = f.role === "admin";
  return {
    ...common,
    email: !m || !m.userId ? f.email.trim().toLowerCase() : undefined,
    role: f.role,
    viewAll: admin ? true : f.viewAll,
    canAddLeads: admin ? true : f.canAddLeads,
    mayColdCall: f.mayColdCall,
    waDailyLimit: admin && !f.waLimit.trim() ? -1 : Number(f.waLimit),
    newLeadCap: whole(f.newLeadCap) ? Number(f.newLeadCap) : undefined,
    mustChangePassword: m ? f.mustChangePassword : undefined,
    senderChecked: m && f.senderChecked !== Boolean(m.senderCheckedAt) ? f.senderChecked : undefined,
  };
}

function Field({ id, label, hint, children, className }: { id: string; label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const input = cn(crm.input, "max-md:h-11 max-md:text-base");

export function MemberDialog({ open, onOpenChange, member, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null: Add person. */
  member: CrmMember | null;
  /** After a save: a line for the page. */
  onSaved?: (text: string) => void;
}) {
  const isNew = !member;
  const owner = member?.role === "owner";
  const [f, setF] = useState<Form>(() => formOf(member));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  /* After adding: the new row's id, for "Create their login". */
  const [added, setAdded] = useState<string | null>(null);
  const { members, refresh: refreshMembers } = useMembers();
  const refreshTeam = useTeamRefresh();

  useEffect(() => {
    if (!open) return;
    setF(formOf(member));
    setErr(null);
    setTried(false);
    setAdded(null);
  }, [open, member]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const preset = (p: MemberPreset) => {
    const v = MEMBER_PRESETS[p];
    setF((x) => ({ ...x, viewAll: v.viewAll, canAddLeads: v.canAddLeads, waLimit: String(v.waDailyLimit), newLeadCap: String(v.newLeadCap), mayColdCall: v.mayColdCall }));
  };
  const activePreset = (Object.keys(MEMBER_PRESETS) as MemberPreset[]).find((p) => {
    const v = MEMBER_PRESETS[p];
    return f.viewAll === v.viewAll && f.canAddLeads === v.canAddLeads && f.waLimit.trim() === String(v.waDailyLimit)
      && f.newLeadCap.trim() === String(v.newLeadCap) && f.mayColdCall === v.mayColdCall;
  });
  const issues = problems(f, isNew, owner);
  const phone = f.senderPhone.trim() ? normalizePhone(f.senderPhone) : undefined;
  const preview = useMemo(
    () => f.signature.trim() || composedSignature(f.senderName.trim() || f.displayName.trim() || "Their name", phone),
    [f.signature, f.senderName, f.displayName, phone],
  );
  const newRow = added ? members.find((m) => m.id === added) : undefined;

  const save = async () => {
    setTried(true);
    if (issues.length) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await teamStore().saveMember(inputOf(f, member));
      await refreshTeam();
      const name = f.displayName.trim();
      if (isNew) {
        setAdded(id);
        onSaved?.(`${name} added. Create their login next.`);
      } else {
        onSaved?.(`${name} saved.`);
        onOpenChange(false);
      }
    } catch (e) {
      setErr(crmErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const memberRow = f.role === "member" && !owner;
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent data-testid="member-dialog" className="max-h-[94dvh] max-w-2xl overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base">{isNew ? (added ? `${f.displayName.trim()} is in the team` : "Add person") : `Edit ${member.displayName}`}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {added
              ? "Now their login: they cannot sign in until it exists."
              : owner
                ? "Your own row: your name, what your messages say, and your targets."
                : isNew
                  ? "Who they are, what they may do, and what their messages say. Their login comes next."
                  : "Changes apply on their next click: the database reads these on every request."}
          </DialogDescription>
        </DialogHeader>

        {added ? (
          <div className="space-y-4">
            <AddLoginSteps name={f.displayName.trim()} email={f.email.trim().toLowerCase()} linked={Boolean(newRow?.userId)}
              onCheck={async () => {
                await teamStore().linkLogins().catch(() => 0);
                await refreshMembers();
              }} />
            <div className="flex justify-end">
              <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} onClick={() => onOpenChange(false)}>Done</button>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className={cn(crm.label, "mb-2")}>Who</legend>
              <Field id="m-name" label="Name">
                <input id="m-name" className={input} value={f.displayName} maxLength={80} autoComplete="off"
                  onChange={(e) => set("displayName", e.target.value)} autoFocus={isNew} />
              </Field>
              {!owner && (
                <Field id="m-email" label="E-mail (their login)" hint={member?.userId ? "They have signed in: the e-mail stays. Add them again to change it." : undefined}>
                  <input id="m-email" type="email" inputMode="email" autoComplete="off" className={input} value={f.email}
                    disabled={Boolean(member?.userId)} onChange={(e) => set("email", e.target.value)} />
                </Field>
              )}
              {!owner && (
                <div className="sm:col-span-2">
                  <span className="mb-1 block text-[13px] font-medium">Role</span>
                  <div role="radiogroup" aria-label="Role" className="flex flex-wrap gap-2">
                    {(["member", "admin"] as const).map((r) => (
                      <label key={r} className={cn(crm.btn, "cursor-pointer max-md:h-11", f.role === r && "border-primary/60 bg-primary/10 text-primary")}>
                        <input type="radio" name="m-role" className="sr-only" checked={f.role === r} onChange={() => set("role", r)} />
                        {r === "member" ? "Member (an intern)" : "Admin (works every lead)"}
                      </label>
                    ))}
                  </div>
                  {f.role === "admin" && (
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      An admin reads and works every lead and assigns them; never money (Proposal, Won, the price), the team, settings or exports.
                    </p>
                  )}
                </div>
              )}
            </fieldset>

            {memberRow && (
              <fieldset>
                <legend className={cn(crm.label, "mb-2")}>What they may do</legend>
                <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Presets">
                  {(Object.keys(MEMBER_PRESETS) as MemberPreset[]).map((p) => (
                    <button key={p} type="button" aria-pressed={activePreset === p} onClick={() => preset(p)} data-testid={`preset-${p}`}
                      className={cn(crm.btn, "max-md:h-11", activePreset === p && "border-primary/60 bg-primary/10 text-primary")}>
                      {MEMBER_PRESETS[p].label}
                    </button>
                  ))}
                </div>
                <p className="mb-1 text-[12px] text-muted-foreground">A preset only fills the switches and limits below; change any of them after.</p>
                <div className="divide-y divide-border/60 rounded-lg border border-border px-3">
                  <SwitchRow id="m-viewall" label="See all leads" checked={f.viewAll} onChange={(v) => set("viewAll", v)}
                    hint="Every lead in a read-only list, without phone, WhatsApp, e-mail or notes. Their own leads stay in full." />
                  <SwitchRow id="m-canadd" label="Can add leads" checked={f.canAddLeads} onChange={(v) => set("canAddLeads", v)}
                    hint="Leads they add are theirs and start at New. Duplicates anywhere in the team are refused." />
                  <SwitchRow id="m-cold" label="May cold-call" checked={f.mayColdCall} onChange={(v) => set("mayColdCall", v)}
                    hint={
                      <>
                        Off: calls only to people who replied or opened a demo. TRAI (Feb 2025): when 5 people complain about one caller within 10 days,
                        every number in that caller's name is barred for 15 days; a second time, for a year, with the phone itself. Off in every preset.
                      </>
                    } />
                </div>
              </fieldset>
            )}

            {!owner && (
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className={cn(crm.label, "mb-2")}>Limits</legend>
                <Field id="m-wa" label="First WhatsApp messages a day"
                  hint={f.role === "admin" ? "Blank: no limit. 0: none." : "0: none (e-mail first). They also wait for Number checked."}>
                  <input id="m-wa" inputMode="numeric" className={input} value={f.waLimit} placeholder={f.role === "admin" ? "No limit" : "25"}
                    onChange={(e) => set("waLimit", e.target.value.replace(/[^\d]/g, ""))} />
                </Field>
                {memberRow && (
                  <Field id="m-cap" label="New leads they may hold" hint="Leads nobody has written to yet. Assigning past it is refused.">
                    <input id="m-cap" inputMode="numeric" className={input} value={f.newLeadCap}
                      onChange={(e) => set("newLeadCap", e.target.value.replace(/[^\d]/g, ""))} />
                  </Field>
                )}
              </fieldset>
            )}
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className={cn(crm.label, "mb-2")}>What their messages say</legend>
              <Field id="m-sender" label="Sender name" hint="Blank: their name.">
                <input id="m-sender" className={input} value={f.senderName} maxLength={80} placeholder={f.displayName.trim() || "Their name"}
                  onChange={(e) => set("senderName", e.target.value)} />
              </Field>
              <Field id="m-phone" label="Company phone" hint="The WhatsApp Business number they send from. A new number needs checking again.">
                <input id="m-phone" type="tel" inputMode="tel" className={input} value={f.senderPhone} placeholder="+91 98765 43210"
                  onChange={(e) => set("senderPhone", e.target.value)} />
              </Field>
              <Field id="m-sig" label="E-mail signature" className="sm:col-span-2" hint="Blank: the composed one shown below.">
                <textarea id="m-sig" rows={2} maxLength={500} className={cn(input, "h-auto py-2")} value={f.signature}
                  onChange={(e) => set("signature", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <p className="text-[12px] text-muted-foreground">Their e-mails end with:</p>
                <pre data-testid="signature-preview" className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 px-3 py-2 font-sans text-[13px]">{preview}</pre>
              </div>
              {member && !owner && (
                <div className="sm:col-span-2 rounded-lg border border-border px-3">
                  <SwitchRow id="m-checked" label="Number checked" checked={f.senderChecked} disabled={!phone}
                    onChange={(v) => set("senderChecked", v)}
                    hint={phone ? "Tick once their test message reached you from this number. WhatsApp sends wait for it." : "Add their company phone first."} />
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className={cn(crm.label, "mb-2")}>Targets</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TARGET_FIELDS.map((t) => (
                  <Field key={t.key} id={`m-t-${t.key}`} label={t.label}>
                    <input id={`m-t-${t.key}`} inputMode="numeric" className={input} value={f.targets[t.key]} placeholder="-"
                      onChange={(e) => set("targets", { ...f.targets, [t.key]: e.target.value.replace(/[^\d]/g, "") })} />
                  </Field>
                ))}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">For coaching. Judge people on hand-overs you accepted and wins, not on sends.</p>
            </fieldset>

            {member && !owner && (
              <div className="rounded-lg border border-border px-3">
                <SwitchRow id="m-mustpw" label="Require a new password at next sign-in" checked={f.mustChangePassword}
                  onChange={(v) => set("mustChangePassword", v)} />
              </div>
            )}

            {tried && issues.length > 0 && (
              <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                <p className="font-medium">Before saving:</p>
                <ul className="mt-1 list-disc pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            )}
            {err && <Note tone="bad">{err}</Note>}
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => onOpenChange(false)} disabled={busy}>Cancel</button>
              <button type="submit" data-testid="member-save" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={busy}>
                {busy ? "Saving..." : isNew ? "Add person" : "Save"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
