import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Flag } from "lucide-react";
import { ACCESS_FLAG_LOGGED, ACCESS_FLAG_SIGN_INS, crmErrorText, istStartOfDay } from "@/lib/outreach/access";
import type { AccessDay, CrmAuditLine } from "@/lib/outreach/team";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { useWide } from "../leads/ViewSwitch";
import { crm } from "../ui";
import { Chip, Note } from "./teamUi";
import { teamStore } from "./useTeam";

/**
 * TEAM > ACCESS (spec 10.2; DPDP Rules 2025, r.6(1)(c): visibility of access
 * through logs and review). Mehdi only. One row per person per India-time
 * day from crm_access_summary: leads opened, distinct leads opened, leads
 * worked (history lines), contact fields changed, exports, imports, sign-ins,
 * views outside 09:00-21:00, and flagged claims. A day is flagged when far
 * more leads were opened than worked, a view fell outside working hours, a
 * claim was flagged, anything was exported, or the log was being filled (more
 * than 20 sign-ins, or more than 200 log lines); flagged days come first. A
 * row opens that day's own lines from the audit trail.
 */

const IST_MS = 5.5 * 3600e3;
const DAY_MS = 864e5;

/** The first moment of the period: midnight India time, `days` days back including today. */
export function periodStart(days: number, now = new Date()): string {
  return new Date(istStartOfDay(now).getTime() - (days - 1) * DAY_MS).toISOString();
}

/** Why a day is flagged, in words (the same tests as crm_access_summary). */
export function flagReasons(d: AccessDay): string[] {
  const out: string[] = [];
  if (d.distinctLeadsViewed > Math.max(3 * d.leadsWorked, 15)) out.push(`opened ${d.distinctLeadsViewed} leads, worked ${d.leadsWorked}`);
  if (d.viewsOffHours > 0) out.push(`${d.viewsOffHours} outside 09:00-21:00`);
  if (d.flaggedClaims > 0) out.push(`${d.flaggedClaims} claimed a lead they cannot open`);
  if (d.exports > 0) out.push(`${d.exports} export${d.exports === 1 ? "" : "s"}`);
  if (d.signIns > ACCESS_FLAG_SIGN_INS) out.push(`${d.signIns} sign-ins`);
  // Every line the access log takes: views (and contacts shown), exports, imports, sign-ins.
  const logged = d.leadViews + d.exports + d.imports + d.signIns;
  if (logged > ACCESS_FLAG_LOGGED) out.push(`${logged} lines in the access log`);
  return out;
}

const bySeriousness = (a: AccessDay, b: AccessDay) =>
  Number(b.suspicious) - Number(a.suspicious) || b.day.localeCompare(a.day) || a.displayName.localeCompare(b.displayName);

/** Whether the last 7 days hold a flagged day (the dot on the Access tab). Mehdi only; false for anyone else. */
export function useFlaggedAccess(): boolean {
  const { can, me } = useCrmMe();
  const allowed = can("team.access");
  const [flagged, setFlagged] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    let live = true;
    teamStore()
      .accessSummary(periodStart(7))
      .then((rows) => live && setFlagged(rows.some((r) => r.suspicious)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [allowed, me.memberId]);
  return allowed && flagged;
}

const COLS: { key: keyof AccessDay; label: string; title: string }[] = [
  { key: "leadViews", label: "Opened", title: "Lead pages opened" },
  { key: "distinctLeadsViewed", label: "Distinct", title: "Different leads opened" },
  { key: "leadsWorked", label: "Worked", title: "Leads with a history line written that day" },
  { key: "contactChanges", label: "Contacts", title: "Contact fields changed" },
  { key: "exports", label: "Exports", title: "Exports" },
  { key: "imports", label: "Imports", title: "Imports" },
  { key: "signIns", label: "Sign-ins", title: "Sign-ins" },
  { key: "viewsOffHours", label: "Off hours", title: "Leads opened outside 09:00-21:00 India time" },
  { key: "flaggedClaims", label: "Flagged", title: "Views claimed for a lead they cannot open" },
];

export function AccessTab({ person, days, onChange }: {
  /** Only this person's days (from the link in the switch-off checklist). */
  person: string | null;
  days: number;
  onChange: (p: { person?: string | null; days?: number }) => void;
}) {
  const { team } = useCrmMe();
  const wide = useWide();
  const [rows, setRows] = useState<AccessDay[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    setErr(null);
    teamStore()
      .accessSummary(periodStart(days))
      .then((r) => live && setRows(r))
      .catch((e) => live && setErr(crmErrorText(e)));
    return () => {
      live = false;
    };
  }, [days]);

  const shown = useMemo(() => (rows || []).filter((r) => !person || r.memberId === person).sort(bySeriousness), [rows, person]);
  const people = team.filter((t) => t.role !== "owner");
  const flaggedCount = shown.filter((r) => r.suspicious).length;

  return (
    <div className="space-y-3" data-testid="team-access">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Period" className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {[7, 30].map((d) => (
            <button key={d} type="button" aria-pressed={days === d} onClick={() => onChange({ days: d })}
              className={cn("h-8 rounded-md px-3 text-[13px] font-medium max-md:h-10", days === d ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              Last {d} days
            </button>
          ))}
        </div>
        <select aria-label="Person" value={person || ""} onChange={(e) => onChange({ person: e.target.value || null })}
          className={cn(crm.input, "w-auto max-md:h-10")}>
          <option value="">Everyone</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.displayName}{p.active ? "" : " (off)"}</option>)}
        </select>
        {flaggedCount > 0 && <Chip tone="warn"><Flag className="h-3 w-3" aria-hidden="true" /> {flaggedCount} flagged</Chip>}
      </div>
      <p className="text-[12px] text-muted-foreground">
        A day is flagged when far more leads were opened than worked (at least 15), a lead was opened outside 09:00-21:00 India time, a claim was
        flagged, or anything was exported. Mehdi's own day is not listed.
      </p>
      {err && <Note tone="bad">{err}</Note>}
      {!rows && !err ? (
        <p className="text-[13px] text-muted-foreground">Loading the access log...</p>
      ) : shown.length === 0 ? (
        !err && <p className={cn(crm.panel, "px-4 py-8 text-center text-[13px] text-muted-foreground")}>No access by the team in this period.</p>
      ) : wide ? (
        <div className={cn(crm.panel, "overflow-x-auto")}>
          <table className={crm.table} aria-label="Access per person per day">
            <thead>
              <tr>
                <th scope="col" className={cn(crm.th, "static")}>Person</th>
                <th scope="col" className={cn(crm.th, "static")}>Day</th>
                {COLS.map((c) => <th key={c.key} scope="col" title={c.title} className={cn(crm.th, "static text-right")}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const key = `${r.memberId}|${r.day}`;
                const on = openKey === key;
                return (
                  <Fragment key={key}>
                    <tr tabIndex={0} aria-expanded={on} className={cn(crm.row, r.suspicious && "bg-amber-500/5")} data-testid="access-row"
                      onClick={() => setOpenKey(on ? null : key)} onKeyDown={(e) => e.key === "Enter" && setOpenKey(on ? null : key)}>
                      <td className={crm.td}>
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          {on ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                          {r.displayName}
                          {r.suspicious && <Flag className="h-3.5 w-3.5 text-amber-600" aria-label="Flagged" />}
                        </span>
                      </td>
                      <td className={cn(crm.td, crm.num)}>{r.day}</td>
                      {COLS.map((c) => (
                        <td key={c.key} className={cn(crm.td, crm.num, "text-right", Number(r[c.key]) > 0 && (c.key === "exports" || c.key === "viewsOffHours" || c.key === "flaggedClaims") && "font-semibold text-amber-700 dark:text-amber-300")}>
                          {String(r[c.key])}
                        </td>
                      ))}
                    </tr>
                    {on && (
                      <tr>
                        <td colSpan={COLS.length + 2} className="border-b border-border/60 bg-muted/20 px-3 py-2">
                          <DayLines day={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Access per person per day">
          {shown.map((r) => {
            const key = `${r.memberId}|${r.day}`;
            const on = openKey === key;
            const why = flagReasons(r);
            return (
              <li key={key} className={cn(crm.panel, "overflow-hidden", r.suspicious && "border-amber-500/40")} data-testid="access-row">
                <button type="button" aria-expanded={on} onClick={() => setOpenKey(on ? null : key)} className="block w-full px-3 py-2.5 text-left">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{r.displayName}</span>
                    <span className={cn("text-[12px] text-muted-foreground", crm.num)}>{r.day}</span>
                  </span>
                  <span className={cn("mt-0.5 block text-[12px] text-muted-foreground", crm.num)}>
                    Opened {r.leadViews} ({r.distinctLeadsViewed} leads), worked {r.leadsWorked}, sign-ins {r.signIns}
                  </span>
                  {why.length > 0 && <span className="mt-1 block text-[12px] font-medium text-amber-700 dark:text-amber-300">Flagged: {why.join("; ")}</span>}
                </button>
                {on && <div className="border-t border-border/60 bg-muted/20 px-3 py-2"><DayLines day={r} /></div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const ACTION_WORDS: Record<string, string> = {
  "lead.view": "Opened",
  "contact.reveal": "Showed the number of",
  export: "Exported",
  import: "Imported",
  sign_in: "Signed in",
  "lead.update": "Changed",
  "lead.insert": "Added",
  "lead.assign": "Assignment of",
  "lead.delete": "Deleted",
  "member.link": "Login linked",
  "member.password_reset": "Password reset",
};

/** "10:42" India time. */
const istClock = (iso: string) => new Date(Date.parse(iso) + IST_MS).toISOString().slice(11, 16);

/** One day's own lines for one person, from the audit trail (Mehdi reads crm_audit). */
function DayLines({ day }: { day: AccessDay }) {
  const { leadById } = useCrmData();
  const [lines, setLines] = useState<CrmAuditLine[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const from = Date.parse(`${day.day}T00:00:00.000Z`) - IST_MS;
    teamStore()
      .listAudit(new Date(from).toISOString(), new Date(from + DAY_MS).toISOString(), day.memberId)
      .then((l) => live && setLines(l))
      .catch((e) => live && setErr(crmErrorText(e)));
    return () => {
      live = false;
    };
  }, [day.day, day.memberId]);
  if (err) return <p className="text-[12px] text-destructive">{err}</p>;
  if (!lines) return <p className="text-[12px] text-muted-foreground">Loading...</p>;
  if (!lines.length) return <p className="text-[12px] text-muted-foreground">No lines in the audit trail for this day.</p>;
  const why = flagReasons(day);
  return (
    <div className="space-y-1.5" data-testid="access-day-lines">
      {why.length > 0 && <p className="text-[12px] font-medium text-amber-700 dark:text-amber-300">Flagged: {why.join("; ")}</p>}
      <ul className="max-h-64 space-y-0.5 overflow-y-auto text-[12px]">
        {lines.map((a) => {
          const d = (a.detail || {}) as Record<string, unknown>;
          const claimed = d.flag === "not_visible";
          const lead = a.leadId ? leadById(a.leadId) : undefined;
          return (
            <li key={a.id} className="flex gap-2">
              <span className={cn("w-11 shrink-0 text-muted-foreground", crm.num)}>{istClock(a.at)}</span>
              <span className="min-w-0">
                {ACTION_WORDS[a.action] || a.action}
                {lead ? <> {lead.instituteName}</> : a.leadId ? <> a lead</> : null}
                {typeof d.count === "number" && <> ({d.count} rows)</>}
                {claimed && <span className="ml-1 font-medium text-amber-700 dark:text-amber-300">flagged: a lead they cannot open</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
