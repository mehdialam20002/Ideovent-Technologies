import { useState } from "react";
import { MEMBER_WORDING_KEYS, type MemberWordingKey } from "@/lib/outreach/team";
import { crmErrorText } from "@/lib/outreach/access";
import { MEMBER_WORDING_GROUPS } from "@/admin/outreach/memberWording";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";

/**
 * SETTINGS > MESSAGES > TEAM WORDING (spec 10.7). Every sentence a member
 * sends must be true when they send it. Two kinds of approved sentences are
 * not: Mehdi's own work in the first person ("I made", "maine likha") and
 * masculine Hinglish first-person forms ("chhod raha hoon"). Each group has a
 * "we" version for members, used only once Mehdi switches it on here
 * (outreach_settings.data.memberWording). Until then, the templates and
 * script lines a group covers are hidden for members. Mehdi's own messages
 * never change.
 *
 * The sentences below come from the templates and the call script themselves
 * (src/admin/outreach/memberWording.ts), so what Mehdi approves here is
 * exactly what a member sends.
 */
const WORDING: Record<MemberWordingKey, { title: string; where: string; approved: string[]; member: string[]; note?: string }> = Object.fromEntries(
  MEMBER_WORDING_GROUPS.map((g) => [g.key, { title: g.title, where: g.where, approved: g.pairs.map((x) => x.owner), member: g.pairs.map((x) => x.member), note: g.note }]),
) as Record<MemberWordingKey, { title: string; where: string; approved: string[]; member: string[]; note?: string }>;

export function TeamWording() {
  const { settings, saveSettings, me } = useCrmData();
  const [busy, setBusy] = useState<MemberWordingKey | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  if (me.legacy) return null;
  const approved = settings.memberWording || {};

  const toggle = async (key: MemberWordingKey, on: boolean) => {
    setBusy(key);
    setMsg(null);
    try {
      await saveSettings({ memberWording: { ...approved, [key]: on } });
      setMsg({ text: on ? `"${WORDING[key].title}": members now use the we version.` : `"${WORDING[key].title}": hidden for members again.` });
    } catch (e) {
      setMsg({ text: crmErrorText(e), bad: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="team-wording-h" data-testid="team-wording" className="space-y-3">
      <div>
        <h2 id="team-wording-h" className="font-display text-lg font-semibold">Team wording</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          What interns send must be true from them: not your own work in the first person, and Hinglish that a woman would say too. Switch a group on
          once you have read its "we" version. Until then, members are not offered the messages it covers. Your own messages never change.
        </p>
      </div>
      <div role="status" aria-live="polite">
        {msg && <p className={cn("rounded-lg border px-3 py-2 text-[13px]", msg.bad ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted/50")}>{msg.text}</p>}
      </div>
      <ul className="space-y-3">
        {MEMBER_WORDING_KEYS.map((key) => {
          const w = WORDING[key];
          const on = Boolean(approved[key]);
          return (
            <li key={key} className={cn(crm.panel, "p-4")} data-testid={`wording-${key}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold">{w.title}</h3>
                  <p className="text-[12px] text-muted-foreground">{w.where}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-[12px] font-medium">
                  <span className={on ? "text-primary" : "text-muted-foreground"}>{on ? "Approved" : "Not approved"}</span>
                  <Switch checked={on} disabled={busy === key} onCheckedChange={(v) => void toggle(key, v)} aria-label={`Approve the we version: ${w.title}`} />
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className={crm.label}>Yours today</p>
                  <ul className="mt-1 space-y-1 text-[13px]">{w.approved.map((s) => <li key={s} className="rounded-md bg-muted/50 px-2 py-1">{s}</li>)}</ul>
                </div>
                <div>
                  <p className={crm.label}>For members</p>
                  <ul className="mt-1 space-y-1 text-[13px]">{w.member.map((s) => <li key={s} className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1">{s}</li>)}</ul>
                </div>
              </div>
              {w.note && <p className="mt-2 text-[12px] text-muted-foreground">{w.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
