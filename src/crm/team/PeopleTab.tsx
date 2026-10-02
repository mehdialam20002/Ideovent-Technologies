import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CheckCircle2, CircleDashed, KeyRound, Pencil, Power, PowerOff, Shuffle, Trash2, UserPlus } from "lucide-react";
import { crmErrorText, heldBy, isOpenStatus } from "@/lib/outreach/access";
import type { CrmMember } from "@/lib/outreach/team";
import { firstWhatsappToday, untouchedLeads } from "@/admin/outreach/derive";
import { prettyPhone } from "@/admin/outreach/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { CRM } from "../nav";
import { crm } from "../ui";
import { DbUsageCard } from "./DbUsageCard";
import { DeactivateDialog } from "./DeactivateDialog";
import { DistributeDialog } from "./DistributeDialog";
import { MemberDialog } from "./MemberDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { Chip, Note, plural, RoleBadge, seenLabel } from "./teamUi";
import { teamStore, useMembers, useTeamRefresh } from "./useTeam";

type Open =
  | { kind: "add" }
  | { kind: "edit" | "reset" | "off" | "remove"; member: CrmMember }
  | { kind: "share"; ids: string[] }
  | null;

/**
 * TEAM > PEOPLE (spec 10.2). A card per person, phone first: role, status
 * and whether their login is linked; New leads waiting against their cap, open
 * leads and first WhatsApp messages today against their limit; Number
 * checked; last seen; their switches. Mehdi adds, edits, resets passwords,
 * switches people off and on, and removes unused invitations; an admin reads.
 * Above the people: the Unassigned pool with Share out; below: the database.
 */
export function PeopleTab({ onMessage }: { onMessage: (text: string, bad?: boolean) => void }) {
  const { can, mode } = useCrmMe();
  const { leads, events, now } = useCrmData();
  const { members, loading, error } = useMembers();
  const refreshTeam = useTeamRefresh();
  const manage = can("team.manage");
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pool = useMemo(() => leads.filter((l) => l.assigneeId === null && isOpenStatus(l.status)), [leads]);
  const poolNew = pool.filter((l) => (l.status || "new") === "new").length;
  const close = () => setOpen(null);

  const quick = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      await refreshTeam();
      onMessage(done);
    } catch (e) {
      onMessage(crmErrorText(e), true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="team-people">
      {mode === "local" && <Note testId="team-local-note">Local mode: logins are simulated. Use Act as (top right) to try a person.</Note>}

      {can("lead.assign") && (
        <section aria-labelledby="pool-h" className={cn(crm.panel, "flex flex-wrap items-center gap-3 p-4")} data-testid="team-pool">
          <div className="min-w-0 flex-1">
            <h2 id="pool-h" className={crm.label}>Unassigned</h2>
            <p className="mt-1 text-[14px]">
              <strong className={crm.num} data-testid="team-pool-count">{pool.length}</strong> open {pool.length === 1 ? "lead" : "leads"} nobody works yet
              {pool.length > 0 && <span className="text-muted-foreground"> ({poolNew} New)</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`${CRM.leads}?view=unassigned`} className={cn(crm.btn, "max-md:h-11")}>See them</Link>
            <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} disabled={!poolNew} data-testid="team-share-out"
              onClick={() => setOpen({ kind: "share", ids: pool.map((l) => l.id) })}>
              <Shuffle className="h-4 w-4" aria-hidden="true" /> Share out
            </button>
          </div>
        </section>
      )}

      {manage && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={cn(crm.btnPrimary, "max-md:h-11")} data-testid="team-add" onClick={() => setOpen({ kind: "add" })}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add person
          </button>
          {mode !== "local" && (
            <button type="button" className={cn(crm.btn, "max-md:h-11")} data-testid="team-check-logins" disabled={busy === "link"}
              onClick={() => void quick("link", () => teamStore().linkLogins(), "Logins checked.")}>
              <CircleDashed className={cn("h-4 w-4", busy === "link" && "animate-spin")} aria-hidden="true" /> Check logins
            </button>
          )}
        </div>
      )}

      {error && <Note tone="bad">{error}</Note>}
      {loading && !members.length ? (
        <p className="text-[13px] text-muted-foreground">Loading the team...</p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2" aria-label="People">
          {members.map((m) => (
            <PersonCard key={m.id} m={m} manage={manage} busy={busy} now={now}
              queue={heldBy(leads, m.id)} waToday={firstWhatsappToday(events, now, m.id)}
              untouched={untouchedLeads(leads.filter((l) => l.assigneeId === m.id), events, now).length}
              onOpen={setOpen}
              onCheckNumber={() => void quick(`check:${m.id}`, () => teamStore().saveMember({ id: m.id, senderChecked: true }), `${m.displayName}'s number is checked.`)}
              onSwitchOn={() => void quick(`on:${m.id}`, () => teamStore().reactivateMember(m.id), `${m.displayName} is switched on again, with no leads.`)} />
          ))}
        </ul>
      )}

      <DbUsageCard />

      <MemberDialog open={open?.kind === "add" || open?.kind === "edit"} onOpenChange={(o) => !o && close()}
        member={open?.kind === "edit" ? open.member : null} onSaved={(t) => onMessage(t)} />
      <ResetPasswordDialog open={open?.kind === "reset"} onOpenChange={(o) => !o && close()} member={open?.kind === "reset" ? open.member : null} />
      <DeactivateDialog open={open?.kind === "off"} onOpenChange={(o) => !o && close()} member={open?.kind === "off" ? open.member : null}
        onDone={(t) => onMessage(t)} />
      <DistributeDialog open={open?.kind === "share"} onOpenChange={(o) => !o && close()} leadIds={open?.kind === "share" ? open.ids : []}
        title="Share out the Unassigned leads" onDone={(t) => onMessage(t)} />
      <AlertDialog open={open?.kind === "remove"} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the invitation for {open?.kind === "remove" ? open.member.displayName : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only for someone who never signed in and holds nothing (a typo in the e-mail, say). Anyone else can only be switched off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (open?.kind !== "remove") return;
              const m = open.member;
              void quick(`rm:${m.id}`, () => teamStore().deleteInvite(m.id), `The invitation for ${m.displayName} is removed.`);
            }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd data-testid={testId} className={cn("text-[13px] font-medium", crm.num)}>{children}</dd>
    </div>
  );
}

function PersonCard({ m, manage, busy, now, queue, waToday, untouched, onOpen, onCheckNumber, onSwitchOn }: {
  m: CrmMember;
  manage: boolean;
  busy: string | null;
  now: Date;
  queue: { newLeads: number; openLeads: number };
  waToday: number;
  untouched: number;
  onOpen: (o: Open) => void;
  onCheckNumber: () => void;
  onSwitchOn: () => void;
}) {
  const owner = m.role === "owner";
  const isMember = m.role === "member";
  /* Never signed in: an invitation (removable while it holds nothing; the database checks that). */
  const unused = !owner && !m.userId && !m.joinedAt;
  const invited = m.active && unused;
  const status = !m.active ? `Off${m.deactivatedAt ? ` since ${new Date(m.deactivatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`
    : invited ? "Waiting for first sign-in" : "Active";
  const share = isMember && m.newLeadCap ? queue.newLeads / m.newLeadCap : 0;
  const limit = m.waDailyLimit;
  const btn = cn(crm.btn, "h-8 px-2.5 text-[12px] max-md:h-11 max-md:px-3 max-md:text-[13px]");
  return (
    <li data-testid={`team-person-${m.id}`} className={cn(crm.panel, "p-4", !m.active && "bg-muted/30")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="min-w-0 truncate text-[15px] font-semibold">{m.displayName}</h3>
        <RoleBadge role={m.role} />
        <Chip tone={!m.active ? "bad" : invited ? "warn" : "good"}>{status}</Chip>
        {!owner && (m.userId ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-300" title="Their Supabase login is linked">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Login linked
          </span>
        ) : (
          m.active && <span className="text-[12px] text-muted-foreground">No login yet</span>
        ))}
      </div>
      {m.email && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{m.email}</p>}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {isMember ? (
          <Stat label="New leads waiting" testId={`team-queue-${m.id}`}>
            {queue.newLeads}/{m.newLeadCap} new
            <span className="mt-1 block h-1.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className={cn("block h-full rounded-full", share >= 1 ? "bg-destructive" : share >= 0.8 ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${Math.min(100, Math.round(share * 100))}%` }} />
            </span>
          </Stat>
        ) : (
          <Stat label="New leads waiting">{queue.newLeads} new</Stat>
        )}
        <Stat label="Open leads">{queue.openLeads}</Stat>
        <Stat label="First WhatsApp today" testId={`team-wa-${m.id}`}>
          {limit === null || limit === undefined ? `${waToday} (no limit)` : limit === 0 ? `${waToday} (off)` : `${waToday}/${limit}`}
        </Stat>
        <Stat label="Last seen">{owner ? "-" : seenLabel(m.lastSeenAt, now)}</Stat>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px]">
        {m.senderPhone ? (
          <span className="text-muted-foreground">{prettyPhone(m.senderPhone)}</span>
        ) : (
          !owner && <span className="text-muted-foreground">No company phone yet</span>
        )}
        {!owner && m.senderPhone && (m.senderCheckedAt ? (
          <Chip tone="good"><BadgeCheck className="h-3 w-3" aria-hidden="true" /> Number checked</Chip>
        ) : manage ? (
          <button type="button" className={btn} disabled={busy === `check:${m.id}`} onClick={onCheckNumber} data-testid={`team-check-number-${m.id}`}
            title="Tick once their test message reached you from this number">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark number checked
          </button>
        ) : (
          <Chip tone="warn">Number not checked</Chip>
        ))}
        {isMember && m.viewAll && <Chip>See all</Chip>}
        {isMember && m.canAddLeads && <Chip>Can add leads</Chip>}
        {isMember && m.mayColdCall && <Chip tone="warn">May cold-call</Chip>}
        {m.mustChangePassword && m.active && !owner && <Chip>Sets own password next</Chip>}
        {untouched > 0 && <Chip tone="warn" title="Assigned more than 24 hours ago, nothing written since">{plural(untouched, "untouched lead")}</Chip>}
      </div>

      {manage && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <button type="button" className={btn} onClick={() => onOpen({ kind: "edit", member: m })} data-testid={`team-edit-${m.id}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </button>
          {!owner && m.active && (
            <button type="button" className={btn} onClick={() => onOpen({ kind: "reset", member: m })} data-testid={`team-reset-${m.id}`}>
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Reset password
            </button>
          )}
          {!owner && m.active && (
            <button type="button" className={cn(btn, "text-destructive hover:bg-destructive/10")} onClick={() => onOpen({ kind: "off", member: m })}
              data-testid={`team-off-${m.id}`}>
              <PowerOff className="h-3.5 w-3.5" aria-hidden="true" /> Switch off
            </button>
          )}
          {!owner && !m.active && (
            <button type="button" className={btn} disabled={busy === `on:${m.id}`} onClick={onSwitchOn} data-testid={`team-on-${m.id}`}>
              <Power className="h-3.5 w-3.5" aria-hidden="true" /> Switch on
            </button>
          )}
          {unused && (
            <button type="button" className={btn} onClick={() => onOpen({ kind: "remove", member: m })} data-testid={`team-remove-${m.id}`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove invitation
            </button>
          )}
        </div>
      )}
    </li>
  );
}
