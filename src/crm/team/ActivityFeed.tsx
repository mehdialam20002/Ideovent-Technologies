import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThumbsUp, Wrench } from "lucide-react";
import { crmErrorText } from "@/lib/outreach/access";
import type { OutreachEvent, OutreachEventType } from "@/lib/outreach/types";
import type { CrmReview } from "@/lib/outreach/team";
import { fmtDateTime } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { Chip, Note } from "./teamUi";
import { teamStore } from "./useTeam";

/**
 * TEAM > ACTIVITY (spec 10.6): the last 200 history lines across the team,
 * newest first, by person and kind, with who wrote each one (the database
 * stamps the writer and the time). Every send or call line by a member gets
 * Good / Fix (crm_reviews): a Fix, with what to fix, reaches them on My day.
 * The review is Mehdi's judgement of the work; the line itself is only what
 * the intern logged (spec 11.5).
 */

const TYPES: { id: "" | OutreachEventType; label: string }[] = [
  { id: "", label: "Every kind" },
  { id: "sent", label: "Sends" },
  { id: "call", label: "Calls" },
  { id: "replied", label: "Replies" },
  { id: "status", label: "Status changes" },
  { id: "note", label: "Notes" },
  { id: "demo_opened", label: "Demo opens" },
  { id: "assign", label: "Assignments" },
  { id: "handoff", label: "Hand-overs" },
];

/** "WhatsApp sent", "Call", "Status: New to Contacted"... */
export function lineLabel(e: OutreachEvent): string {
  if (e.type === "sent") return `${e.channel === "whatsapp" ? "WhatsApp" : e.channel === "email" ? "E-mail" : "Message"} sent${e.stage ? ` (${e.stage.replace(/_/g, " ")})` : ""}`;
  if (e.type === "call") return "Call";
  if (e.type === "replied") return "Replied";
  if (e.type === "note") return "Note";
  if (e.type === "demo_opened") return "Demo opened";
  if (e.type === "handoff") return "Hand-over";
  if (e.type === "assign" || e.type === "status") return e.detail || (e.type === "assign" ? "Assigned" : "Status");
  return e.type;
}

const LIMIT = 200;

export function ActivityFeed() {
  const { events, leadById, nameOf } = useCrmData();
  const { team, can } = useCrmMe();
  const mayReview = can("review");
  const [person, setPerson] = useState("");
  const [type, setType] = useState<"" | OutreachEventType>("");
  const [reviews, setReviews] = useState<Map<string, CrmReview>>(new Map());
  const [fixFor, setFixFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const ownerId = team.find((t) => t.role === "owner")?.id;
  const roleOf = useMemo(() => new Map(team.map((t) => [t.id, t.role])), [team]);
  const writer = useCallback((e: OutreachEvent) => e.actorId || ownerId || null, [ownerId]);

  const loadReviews = useCallback(async () => {
    try {
      const rs = await teamStore().listReviews();
      setReviews(new Map(rs.map((r) => [r.eventId, r])));
    } catch {
      /* reviews are extra: the feed still shows */
    }
  }, []);
  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const lines = useMemo(
    () => events.filter((e) => (!person || writer(e) === person) && (!type || e.type === type)).slice(0, LIMIT),
    [events, person, type, writer],
  );

  const review = async (e: OutreachEvent, verdict: "good" | "fix", text?: string) => {
    setBusy(e.id);
    setMsg(null);
    try {
      await teamStore().addReview(e.id, verdict, text);
      await loadReviews();
      setFixFor(null);
      setComment("");
      setMsg({ text: verdict === "good" ? `Marked Good. ${nameOf(writer(e))} sees it.` : `Sent to ${nameOf(writer(e))} as a Fix: it shows on their My day.` });
    } catch (err) {
      setMsg({ text: crmErrorText(err), bad: true });
    } finally {
      setBusy(null);
    }
  };

  const people = team.slice().sort((a, b) => Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName));
  const small = cn(crm.btn, "h-8 px-2.5 text-[12px] max-md:h-10");
  return (
    <div className="space-y-3" data-testid="team-activity">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Who" value={person} onChange={(e) => setPerson(e.target.value)} className={cn(crm.input, "w-auto max-md:h-10")}>
          <option value="">Everyone</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.displayName}{p.active ? "" : " (off)"}</option>)}
        </select>
        <select aria-label="Kind of line" value={type} onChange={(e) => setType(e.target.value as "" | OutreachEventType)} className={cn(crm.input, "w-auto max-md:h-10")}>
          {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <span className={cn("text-[12px] text-muted-foreground", crm.num)}>
          {lines.length === LIMIT ? `The latest ${LIMIT}` : `${lines.length} ${lines.length === 1 ? "line" : "lines"}`}
        </span>
      </div>
      <div aria-live="polite">{msg && <Note tone={msg.bad ? "bad" : "good"}>{msg.text}</Note>}</div>
      {lines.length === 0 ? (
        <p className={cn(crm.panel, "px-4 py-8 text-center text-[13px] text-muted-foreground")}>Nothing written yet with these filters.</p>
      ) : (
        <ul className={cn(crm.panel, "divide-y divide-border/60")} aria-label="Team activity">
          {lines.map((e) => {
            const who = writer(e);
            const lead = leadById(e.leadId);
            const r = reviews.get(e.id);
            const reviewable = mayReview && (e.type === "sent" || e.type === "call") && who && roleOf.get(who) === "member";
            return (
              <li key={e.id} className="px-3 py-2.5 sm:px-4" data-testid="activity-line">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
                  <span className="font-medium">{who ? nameOf(who) : "Mehdi"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{lineLabel(e)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className={cn("text-[12px] text-muted-foreground", crm.num)}>{fmtDateTime(e.at)}</span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {lead ? (
                    <Link to={CRM.lead(lead.id)} className="font-medium text-foreground underline-offset-2 hover:underline">{lead.instituteName}</Link>
                  ) : (
                    <span>A lead no longer in the list</span>
                  )}
                  {e.detail && e.type !== "status" && e.type !== "assign" && <span className="line-clamp-2 break-words"> {e.detail}</span>}
                </div>
                {(reviewable || r) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {r ? (
                      <Chip tone={r.verdict === "good" ? "good" : "warn"}>
                        {r.verdict === "good" ? "Good" : `Fix${r.comment ? `: ${r.comment}` : ""}`}
                      </Chip>
                    ) : fixFor === e.id ? (
                      <form className="flex w-full flex-wrap gap-2" onSubmit={(ev) => { ev.preventDefault(); if (comment.trim()) void review(e, "fix", comment.trim()); }}>
                        <input autoFocus value={comment} onChange={(ev) => setComment(ev.target.value)} maxLength={1000} aria-label="What to fix"
                          placeholder="What to fix, in one line" className={cn(crm.input, "min-w-0 flex-1 max-md:h-10")} />
                        <button type="submit" className={small} disabled={!comment.trim() || busy === e.id}>Send Fix</button>
                        <button type="button" className={cn(crm.btnGhost, "h-8 max-md:h-10")} onClick={() => setFixFor(null)}>Cancel</button>
                      </form>
                    ) : (
                      <>
                        <button type="button" className={small} disabled={busy === e.id} onClick={() => void review(e, "good")} data-testid="review-good">
                          <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /> Good
                        </button>
                        <button type="button" className={small} onClick={() => { setFixFor(e.id); setComment(""); }} data-testid="review-fix">
                          <Wrench className="h-3.5 w-3.5" aria-hidden="true" /> Fix
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
