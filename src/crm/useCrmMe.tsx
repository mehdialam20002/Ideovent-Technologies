import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { UserCog } from "lucide-react";
import { getOutreachStore, OUTREACH_LOCAL_KEY, type OutreachStore } from "@/lib/outreach/store";
import { normalizeTeam } from "@/lib/outreach/localTeam";
import { can as canDo, crmErrorText, sameJson, type CrmAction } from "@/lib/outreach/access";
import { LOCAL_OWNER_ID, noAccessMe, type CrmMe, type CrmMember, type CrmTeamName } from "@/lib/outreach/team";
import { cn } from "@/lib/utils";
import { CRM } from "./nav";

/**
 * WHO IS SIGNED IN TO THE CRM (spec 10.1 and 14.2).
 *
 * crm_me() says who the person is, their role and their switches; crm_team()
 * names the people they may see. Both are read when the CRM opens, again when
 * the tab comes back into view (at most every 15 seconds), and crm_me every
 * 60 seconds while the tab is visible. So a person Mehdi switches off drops to
 * "Your access is off" within a minute, even with the tab left open. The
 * database already refuses them on their very next request: this is only the
 * screen catching up.
 *
 * Screens ask `can("lead.export")`, never the role: can() is the matrix of
 * spec 4.1 (src/lib/outreach/access.ts), the same rules the database enforces.
 * Without 0011 (`me.legacy`) the person is Mehdi and every team feature hides.
 *
 * An admin's or a member's sign-in also goes on the access log, once
 * (logSignIn), so Mehdi's Team > Access tab can count sign-ins per day.
 *
 * LOCAL MODE has no logins. The CRM acts as localStorage
 * "ideovent_crm_local_actor" (a team member's id; missing = Mehdi), which the
 * header's Act as menu switches (`actAs`); the e2e suites set the key directly.
 */

/** crm_me is re-read this often while the tab is visible. */
export const ME_POLL_MS = 60_000;
/** ...and when the tab comes back into view, at most this often. */
export const ME_FOCUS_GAP_MS = 15_000;

export interface CrmMeValue {
  /** Who is signed in. Until the first answer (`loading`) a no-access placeholder. */
  me: CrmMe;
  /** True until crm_me has answered once (or failed with nothing to show). */
  loading: boolean;
  /** crm_me has answered for this person (false while loading, or when the first read failed). */
  ready: boolean;
  /** The last read failed (offline, say). The last good `me` stays in place. */
  error: string | null;
  /** Where the CRM keeps its data: this browser ("local") or Supabase. */
  mode: "local" | "supabase";
  /** May this person do this? The matrix of spec 4.1 (access.ts can()). */
  can(action: CrmAction): boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  /** The owner or an admin (the database's "staff"). */
  isStaff: boolean;
  /** The people this person may see named (crm_team), never e-mails. Empty without 0011. */
  team: CrmTeamName[];
  /**
   * A team member's display name. No id (null, undefined, "") reads
   * "Unassigned", as the database's own history lines do. An id this person may
   * not see named reads `fallback` ("Someone" unless given).
   */
  nameOf(id?: string | null, fallback?: string): string;
  /** Re-read who is signed in, and the team, now. */
  refresh(): Promise<void>;
  /** Local mode only: act as this team member from now on (null = Mehdi). */
  actAs?(memberId: string | null): void;
  /** Local mode: the member id the CRM acts as (null = Mehdi). Always null on the live site. */
  actingAs: string | null;
}

const Ctx = createContext<CrmMeValue | null>(null);

/** What `me` reads as before crm_me has answered: nothing allowed. */
const NOBODY_YET: CrmMe = noAccessMe("signed_out");

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

/* ── Sign-ins on the access log ───────────────────────────────────────────── */

/** The sign-ins this browser has logged ("<member id>|<session>"), newest last. */
export const SIGN_IN_LOG_KEY = "ideovent_crm_sign_ins_v1";
const SIGN_IN_LOG_KEEP = 20;

/** The session_id claim of a Supabase access token. Read, not verified: the server checks the token. */
export function tokenSessionId(token?: string | null): string | null {
  try {
    const part = (token || "").split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const claims = JSON.parse(atob(b64)) as { session_id?: unknown };
    return typeof claims.session_id === "string" && claims.session_id ? claims.session_id : null;
  } catch {
    return null;
  }
}

/**
 * Which sign-in this is. Supabase: the auth session's id, which a sign-in
 * creates and a token refresh keeps, so every tab of one sign-in shares it
 * (the last sign-in time when the token carries no id). Local mode: this tab.
 */
async function sessionMark(mode: OutreachStore["mode"]): Promise<string | null> {
  if (mode === "local") return "local";
  try {
    const { supabase } = await import("@/lib/cms/client");
    const { data } = await supabase().auth.getSession();
    const s = data.session;
    return s ? tokenSessionId(s.access_token) || s.user?.last_sign_in_at || null : null;
  } catch {
    return null;
  }
}

/**
 * ONE "sign_in" LINE PER SIGN-IN of an admin or a member, for Team > Access
 * (crm_access_summary counts them; DPDP Rules 2025, r.6(1)(c)). The database
 * sees requests, not sign-ins, so the CRM writes the line once per Supabase
 * session, and in local mode once per tab and person acted as. Mehdi's own
 * are not logged: the Access tab is about the team. Fire and forget, like
 * every access line: a refused write (the daily budget, say) is left out.
 */
export async function logSignIn(store: OutreachStore, me: CrmMe): Promise<void> {
  if (me.legacy || !me.memberId || (me.role !== "admin" && me.role !== "member")) return;
  const mark = await sessionMark(store.mode);
  if (!mark) return;
  const key = `${me.memberId}|${mark}`;
  try {
    const box = store.mode === "local" ? sessionStorage : localStorage;
    const raw: unknown = JSON.parse(box.getItem(SIGN_IN_LOG_KEY) || "[]");
    const seen = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    if (seen.includes(key)) return;
    box.setItem(SIGN_IN_LOG_KEY, JSON.stringify([...seen, key].slice(-SIGN_IN_LOG_KEEP)));
  } catch {
    return; /* no storage: nothing would stop a line on every load */
  }
  await store.logAccess("sign_in").catch(() => undefined);
}

export function CrmMeProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getOutreachStore(), []);
  const [me, setMe] = useState<CrmMe | null>(null);
  const [team, setTeam] = useState<CrmTeamName[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingAs, setActingAs] = useState<string | null>(() => (store.mode === "local" ? store.actingAs?.() ?? null : null));
  /* Bumped by Act as: an answer for the person acted as before is dropped. */
  const epoch = useRef(0);
  /* Whose sign-in this provider has logged already (logSignIn). */
  const signInLogged = useRef<string | null>(null);

  const load = useCallback(
    async (withTeam: boolean) => {
      const at = epoch.current;
      try {
        const next = await store.me();
        const names = withTeam && next.role && !next.legacy ? await store.teamNames().catch(() => null) : null;
        if (at !== epoch.current) return;
        if (next.memberId && next.role && signInLogged.current !== next.memberId) {
          signInLogged.current = next.memberId;
          void logSignIn(store, next);
        }
        /* The same answer keeps the same object, so a poll re-renders nothing. */
        setMe((prev) => (prev && sameJson(prev, next) ? prev : next));
        if (names) setTeam((prev) => (sameJson(prev, names) ? prev : names));
        else if (!next.role || next.legacy) setTeam((prev) => (prev.length ? [] : prev));
        setError(null);
      } catch (err) {
        if (at === epoch.current) setError(crmErrorText(err));
      }
    },
    [store],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  /* Back in view: me and the team (at most every 15 s). Every 60 s while visible: me. */
  useEffect(() => {
    let last = Date.now();
    const onFocus = () => {
      if (!visible() || Date.now() - last < ME_FOCUS_GAP_MS) return;
      last = Date.now();
      void load(true);
    };
    const timer = window.setInterval(() => {
      if (!visible()) return;
      last = Date.now();
      void load(false);
    }, ME_POLL_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const local = store.mode === "local" && typeof store.actAs === "function";
  const actAs = useCallback(
    (memberId: string | null) => {
      const id = memberId && memberId !== LOCAL_OWNER_ID ? memberId : null;
      store.actAs?.(id);
      epoch.current += 1;
      setActingAs(id);
      /* Loading again: the CRM's data is read afresh, as the new person. */
      setMe(null);
      setTeam([]);
      setError(null);
      void load(true);
    },
    [store, load],
  );

  const value = useMemo<CrmMeValue>(() => {
    const current = me || NOBODY_YET;
    const names = new Map(team.map((t) => [t.id, t.displayName]));
    if (current.memberId && current.displayName) names.set(current.memberId, current.displayName);
    const role = current.role;
    return {
      me: current,
      loading: !me && !error,
      ready: Boolean(me),
      error,
      mode: store.mode,
      can: (action: CrmAction) => canDo(current, action),
      isOwner: role === "owner",
      isAdmin: role === "admin",
      isMember: role === "member",
      isStaff: role === "owner" || role === "admin",
      team,
      nameOf: (id?: string | null, fallback = "Someone") => (id ? names.get(id) ?? fallback : "Unassigned"),
      refresh,
      actAs: local ? actAs : undefined,
      actingAs: local ? actingAs : null,
    };
  }, [me, error, team, store.mode, refresh, local, actAs, actingAs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Who is signed in to the CRM. Inside <CrmMeProvider>, which CrmLayout mounts first. */
export function useCrmMe(): CrmMeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrmMe must be used inside <CrmMeProvider> (CrmLayout mounts it).");
  return v;
}

/** The same, or null outside the CRM (a component shared with the admin). */
export function useOptionalCrmMe(): CrmMeValue | null {
  return useContext(Ctx);
}

/* ── Local mode: Act as ─────────────────────────────────────────────────── */

/** Everyone in this browser's team, Mehdi first (local mode only; read straight from the stored team). */
export function localPeople(): CrmMember[] {
  try {
    const raw = localStorage.getItem(OUTREACH_LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as { team?: unknown }) : null;
    return normalizeTeam(parsed?.team ?? null).members;
  } catch {
    return normalizeTeam(null).members;
  }
}

const ROLE_WORD = { owner: "owner", admin: "admin", member: "member" } as const;

/**
 * LOCAL MODE ONLY: who the CRM acts as. A native select laid over an icon, so
 * it stays one tap wide in the phone header; the name shows from lg up.
 * Switching goes to the CRM's first screen as that person.
 */
export function ActAsMenu({ className, showName = true }: { className?: string; showName?: boolean }) {
  const { actAs, actingAs, mode, me } = useCrmMe();
  const navigate = useNavigate();
  const [people, setPeople] = useState<CrmMember[]>(() => (mode === "local" ? localPeople() : []));
  if (mode !== "local" || !actAs) return null;
  const owner = people.find((p) => p.role === "owner");
  const value = actingAs && actingAs !== owner?.id ? actingAs : "";
  const known = !value || people.some((p) => p.id === value);
  const label = me.displayName || (value ? value : owner?.displayName || "Mehdi");
  return (
    <label
      className={cn(
        "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
      title="Local mode: act as another person in the team"
    >
      <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
      {showName && <span className="hidden max-w-[9rem] truncate lg:inline">As {label}</span>}
      <select
        data-testid="crm-act-as"
        aria-label="Act as (local mode)"
        value={value}
        onFocus={() => setPeople(localPeople())}
        onPointerDown={() => setPeople(localPeople())}
        onChange={(e) => {
          actAs(e.target.value || null);
          navigate(CRM.root);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {people.map((p) => (
          <option key={p.id} value={p.role === "owner" ? "" : p.id}>
            {p.displayName} ({ROLE_WORD[p.role] || p.role}{p.active ? "" : ", switched off"})
          </option>
        ))}
        {!known && <option value={value}>{value} (not in the team)</option>}
      </select>
    </label>
  );
}
