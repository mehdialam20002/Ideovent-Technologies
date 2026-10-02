import { useState } from "react";
import { MEMBER_WORDING_KEYS, type MemberWordingKey } from "@/lib/outreach/team";
import { crmErrorText } from "@/lib/outreach/access";
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
 * The sentences below are the proposals of spec 10.7, shown so Mehdi can read
 * both before he approves. (Part 2 of the team build renders them in the
 * templates themselves.)
 */
const WORDING: Record<MemberWordingKey, { title: string; where: string; approved: string[]; member: string[]; note?: string }> = {
  we_pitch_note: {
    title: "The short note in the first message",
    where: "First messages that point at what to fix (the pitch)",
    approved: [
      "Isi par maine aapke liye ek chhota note likha hai, ...",
      "I have written a short note for you on what to fix and what each fix would take.",
      "I have written a short note for you on this, with what each fix would take.",
    ],
    member: [
      "Isi par humne aapke liye ek chhota note likha hai, ...",
      "We have written a short note for you on what to fix and what each fix would take.",
      "We have written a short note for you on this, with what each fix would take.",
    ],
  },
  we_sample_made: {
    title: "The sample, in the first e-mail follow-up",
    where: "E-mail follow-up 1, English",
    approved: ["{addressAs}, a quick note on the sample I made for {instituteName}. Shall I send the link?"],
    member: ["{addressAs}, a quick note on the sample we made for {instituteName}. Shall I send the link?"],
  },
  we_leave_it_here: {
    title: "Leaving it there",
    where: "WhatsApp follow-up and closing e-mail, Hinglish",
    approved: ['Main yahin chhod raha hoon, kabhi dekhna ho to bas "haan" likh dijiye.'],
    member: ['Hum ise yahin chhod rahe hain, kabhi dekhna ho to bas "haan" likh dijiye.'],
    note: 'The same for the "sample page chahiye" version.',
  },
  we_call_lines: {
    title: "The call script's opening and fix",
    where: "Call script",
    approved: [
      "I made a sample website for your {place}.",
      "I would like to make a short sample page for your {place}, ...",
      "main ... sample page banana chahta hoon",
      "Sample mein sirf wahi hissa dikhata hoon.",
      "I can make a sample that fixes just that, and show it to you.",
      "Main ek sample bana sakta hoon ... aur aapko dikha dunga.",
    ],
    member: [
      "We made a sample website for your {place}.",
      "We would like to make a short sample page for your {place}, ...",
      "hum ... sample page banana chahte hain",
      "Sample mein sirf wahi hissa dekhte hain.",
      "We can make a sample that fixes just that, and show it to you.",
      "Hum ek sample bana sakte hain ... aur aapko dikha denge.",
    ],
  },
  member_after_yes: {
    title: "After they say yes, without call times",
    where: "After-yes WhatsApp and e-mail",
    approved: ["... 10 minute ki call ke liye {callSlots}?", "what I saw"],
    member: ["Dekh kar bata dijiye kya badalna hai.", "Have a look and tell me what you would change.", "what we saw"],
    note: "Then members send the sample themselves; a call is still a hand-over to you.",
  },
};

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
