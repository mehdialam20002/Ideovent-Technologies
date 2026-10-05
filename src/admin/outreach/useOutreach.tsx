import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DemoSite, DemoSiteOpen } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { COLUMN_KEYS, canEditLead, isStaff, overviewRows } from "@/lib/outreach/access";
import { DEFAULT_OUTREACH_SETTINGS, getOutreachStore } from "@/lib/outreach/store";
import {
  noAccessMe,
  type AccessAction,
  type AskTopic,
  type CrmMe,
  type CrmRequest,
  type CrmTeamName,
  type DistributeMode,
  type DistributeRow,
  type DuplicateMatch,
  type HandoffInput,
  type LeadOverview,
  type MemberStats,
  type RequestOutcome,
} from "@/lib/outreach/team";
import type {
  EventInput,
  ImportOptions,
  ImportResult,
  LeadInput,
  OutreachEvent,
  OutreachLead,
  OutreachSettings,
} from "@/lib/outreach/types";
import { demoOpenEventId, opensSinceContact, OUTREACH_CHANGED } from "./derive";
import { linkWentCold } from "@/lib/outreach/linkChoice";

export function announceOutreachChange() {
  try {
    window.dispatchEvent(new Event(OUTREACH_CHANGED));
  } catch {
    /* not in a browser */
  }
}

/**
 * Who the data was read as before the first read answers: nobody, so no
 * screen offers an action it should not while the CRM loads. Read `me` once
 * `loading` is false.
 */
const PENDING_ME: CrmMe = noAccessMe("signed_out");

/**
 * THE OUTREACH DATA, read as the person signed in (spec 9). Since the team
 * (0011) the database decides what each person reads: Mehdi and admins every
 * lead, a member the leads assigned to them (while open, and 14 days after).
 * The writes no longer send whole leads: patchLead merges a change on the
 * server, createLead only inserts, appendNotes appends. saveLead stays the
 * whole-lead upsert of Mehdi's own flows (Lead Finder, demo auto-lead).
 */
export interface OutreachValue {
  mode: "local" | "supabase";
  loading: boolean;
  error: string | null;
  /**
   * Who the data was read as: crm_me (in local mode the acting person). In
   * legacy mode (0011 not applied) Mehdi exactly as before. Meaningful once
   * `loading` is false.
   */
  me: CrmMe;
  /** Every lead the caller may read in full, with the column mirrors (assigneeId and friends). */
  leads: OutreachLead[];
  /** The history of those leads, newest first, with who wrote each line (actorId). */
  events: OutreachEvent[];
  settings: OutreachSettings;
  /** Demo opens. Mehdi reads them from the CMS as before; anyone else gets the opens of their leads' demos (crm_demo_opens). */
  opens: DemoSiteOpen[];
  /** Anyone but Mehdi: the demo records linked to their leads, drafts included (crm_lead_demos). Mehdi: none (he reads the CMS). */
  teamDemos: DemoSite[];
  /** Leads WITHOUT contacts: every lead with See all (Mehdi and admins too); for a member also their own hand-overs. */
  overview: LeadOverview[];
  /** The people's names (crm_team), never e-mails. Empty in legacy mode. */
  team: CrmTeamName[];
  /** Ask Mehdi and hand-overs: Mehdi and admins all of them, a member their own. Newest first. */
  requests: CrmRequest[];
  /** May the caller change this lead at all? Which fields is the database's guard (access.ts guardPatch). */
  canEdit: (lead: OutreachLead) => boolean;
  reload: () => Promise<void>;
  /** Re-reads only the requests ("Waiting on you"). Also done every minute while the tab is visible. */
  refreshRequests: () => Promise<void>;
  /** The whole-lead upsert: Mehdi's flows as before (Lead Finder, demo auto-lead). Anyone else: createLead or patchLead. */
  saveLead: (lead: LeadInput) => Promise<OutreachLead>;
  /** A new lead, INSERT only. A member's lead is theirs and starts at New. */
  createLead: (lead: LeadInput) => Promise<OutreachLead>;
  /** Only these keys change, merged on the server into the lead as it is now; a key set to undefined is removed. */
  patchLead: (id: string, patch: Partial<OutreachLead>) => Promise<OutreachLead>;
  /** "Add to notes": one more line, appended on the server (a member's notes only grow). */
  appendNotes: (id: string, text: string) => Promise<OutreachLead>;
  deleteLead: (id: string) => Promise<void>;
  /** Answers the SERVER's line: its time and its writer. */
  addEvent: (ev: EventInput) => Promise<OutreachEvent>;
  saveSettings: (s: Partial<OutreachSettings>) => Promise<OutreachSettings>;
  /** Across the whole team: whose lead it is, and the lead itself as far as the caller may see it. */
  findDuplicate: (q: { phone?: string; email?: string; excludeId?: string }) => Promise<DuplicateMatch | null>;
  importLeads: (rows: Record<string, string>[], opts?: ImportOptions) => Promise<ImportResult>;
  /* The team (0011). Each one reads the data again once it has succeeded. */
  assignLeads: (ids: string[], memberId: string | null) => Promise<number>;
  distributeLeads: (ids: string[], memberIds: string[], mode: DistributeMode, includeContacted?: boolean) => Promise<DistributeRow[]>;
  applyRules: (ids: string[], includeContacted?: boolean) => Promise<DistributeRow[]>;
  /** "Hand to Mehdi". The booking id when a slot was booked (phase 2), else null. */
  handoff: (input: HandoffInput) => Promise<number | null>;
  askOwner: (leadId: string, topic: AskTopic, text: string) => Promise<void>;
  resolveRequest: (id: number, outcome: RequestOutcome, note?: string) => Promise<void>;
  /** Turns the linked demo's public link on (draft to sent); answers its slug. */
  publishLeadDemo: (leadId: string, sentTo?: string) => Promise<string>;
  /** Fire and forget: never rejects. */
  logAccess: (action: AccessAction, leadId?: string, detail?: Record<string, unknown>) => Promise<void>;
  /** Numbers per person between two moments (crm_activity_stats): everyone for Mehdi and admins, a member their own. */
  activityStats: (fromIso: string, toIso?: string) => Promise<MemberStats[]>;
}

/** Everything one read loads, in order. */
type Loaded = [OutreachLead[], OutreachEvent[], OutreachSettings, CrmTeamName[], CrmRequest[], LeadOverview[], DemoSiteOpen[], DemoSite[]];
const NOTHING: Loaded = [[], [], DEFAULT_OUTREACH_SETTINGS, [], [], [], [], []];

/** A save that answered without the column mirrors (the old whole-lead upsert) keeps the ones the lead had. */
function keepColumns(prev: OutreachLead, saved: OutreachLead): OutreachLead {
  if (saved.assigneeId !== undefined) return saved;
  const out = { ...saved } as Record<string, unknown>;
  const was = prev as unknown as Record<string, unknown>;
  for (const k of COLUMN_KEYS) if (was[k] !== undefined && out[k] === undefined) out[k] = was[k];
  return out as unknown as OutreachLead;
}

/** The database refused a line because one with that id exists: the demo open was already written. */
function isDuplicate(err: unknown): boolean {
  const e = (err && typeof err === "object" ? err : {}) as { code?: string; message?: string };
  return e.code === "23505" || /duplicate key/i.test(e.message || "");
}

const Ctx = createContext<OutreachValue | null>(null);

export function OutreachProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getOutreachStore(), []);
  const { data, actions } = useCms();
  const cmsOpens = useMemo(() => (data as unknown as { demoSiteOpens?: DemoSiteOpen[] }).demoSiteOpens || [], [data]);
  const cmsDemos = useMemo(() => (data as unknown as { demoSites?: DemoSite[] }).demoSites || [], [data]);

  const [me, setMe] = useState<CrmMe>(PENDING_ME);
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [settings, setSettings] = useState<OutreachSettings>(DEFAULT_OUTREACH_SETTINGS);
  const [team, setTeam] = useState<CrmTeamName[]>([]);
  const [requests, setRequests] = useState<CrmRequest[]>([]);
  const [memberOverview, setMemberOverview] = useState<LeadOverview[]>([]);
  const [teamOpens, setTeamOpens] = useState<DemoSiteOpen[]>([]);
  const [teamDemos, setTeamDemos] = useState<DemoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The latest values, for writes that must not use a stale closure.
  const meRef = useRef(me);
  meRef.current = me;
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const loadSeq = useRef(0);

  /*
    ONE READ OF EVERYTHING, as the person signed in. crm_me first: it says who
    that is and whether 0011 is applied (legacy). Then together: the leads and
    the history row security lets them read, the settings, and with the team
    the names, the requests and (anyone but Mehdi) the overview and the demos
    and opens of their own leads. A team read that fails leaves its list
    empty rather than the CRM unusable. A newer read wins over an older one.
  */
  const reload = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const who = await store.me();
      const withTeam = Boolean(who.role) && !who.legacy;
      const notMehdi = withTeam && who.role !== "owner";
      const soft = <T,>(when: boolean, run: () => Promise<T>, empty: T): Promise<T> =>
        when ? run().catch(() => empty) : Promise.resolve(empty);
      const [l, e, s, names, reqs, ov, tOpens, tDemos]: Loaded = who.role
        ? await Promise.all([
            store.listLeads(),
            store.listEvents(),
            store.getSettings(),
            soft<CrmTeamName[]>(withTeam, () => store.teamNames(), []),
            soft<CrmRequest[]>(withTeam, () => store.listRequests(), []),
            soft<LeadOverview[]>(withTeam && who.role === "member", () => store.leadsOverview(), []),
            soft<DemoSiteOpen[]>(notMehdi, () => store.demoOpens(), []),
            soft<DemoSite[]>(notMehdi, () => store.leadDemos(), []),
          ])
        : NOTHING;
      if (seq !== loadSeq.current) return;
      setMe(who);
      setLeads(l);
      setEvents(e);
      setSettings({ ...DEFAULT_OUTREACH_SETTINGS, ...s });
      setTeam(names);
      setRequests(reqs);
      setMemberOverview(ov);
      setTeamOpens(tOpens);
      setTeamDemos(tDemos);
      setError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(
        "Outreach data did not load: " +
          ((err as Error).message || "unknown error") +
          ". If this is the live site, run supabase/migrations/0007_outreach.sql once in the Supabase SQL editor.",
      );
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /*
    LOCAL MODE: the acting person (localStorage "ideovent_crm_local_actor",
    set by the CRM's Act as menu or by a test) can change while this page is
    open. When it does, everything is read again as the new person.
  */
  useEffect(() => {
    const actingAs = store.actingAs?.bind(store);
    if (store.mode !== "local" || !actingAs) return;
    let last = actingAs();
    const check = () => {
      const current = actingAs();
      if (current === last) return;
      last = current;
      void reload();
    };
    const timer = window.setInterval(check, 1000);
    window.addEventListener("storage", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", check);
    };
  }, [store, reload]);

  /* The requests ("Waiting on you", a member's own asks) move while nobody reloads: read them every minute. */
  const withTeam = Boolean(me.role) && !me.legacy;
  const refreshRequests = useCallback(async () => {
    const who = meRef.current;
    if (!who.role || who.legacy) return;
    try {
      setRequests(await store.listRequests());
    } catch {
      /* the list stays as it was; the next read tries again */
    }
  }, [store]);
  useEffect(() => {
    if (!withTeam) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRequests();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [withTeam, refreshRequests]);

  /* ── Writes ───────────────────────────────────────────────────────────── */

  /** A saved lead into the list, first when it is new. */
  const putLead = useCallback((saved: OutreachLead) => {
    setLeads((prev) => {
      const i = prev.findIndex((x) => x.id === saved.id);
      if (i < 0) return [saved, ...prev];
      const next = prev.slice();
      next[i] = keepColumns(prev[i], saved);
      return next;
    });
  }, []);

  const keep = useCallback(
    async (write: Promise<OutreachLead>) => {
      const saved = await write;
      putLead(saved);
      announceOutreachChange();
      return saved;
    },
    [putLead],
  );

  const saveLead = useCallback((lead: LeadInput) => keep(store.upsertLead(lead)), [store, keep]);
  const createLead = useCallback((lead: LeadInput) => keep(store.createLead(lead)), [store, keep]);
  const patchLead = useCallback((id: string, patch: Partial<OutreachLead>) => keep(store.patchLead(id, patch)), [store, keep]);
  const appendNotes = useCallback((id: string, text: string) => keep(store.appendNotes(id, text)), [store, keep]);

  const deleteLead = useCallback(
    async (id: string) => {
      await store.deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setEvents((prev) => prev.filter((e) => e.leadId !== id));
      announceOutreachChange();
    },
    [store],
  );

  const addEvent = useCallback(
    async (ev: EventInput) => {
      const saved = await store.addEvent(ev);
      setEvents((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)]);
      /* Mehdi's (or an admin's) first send, call, reply or stage change on an
         Unassigned lead makes it theirs on the server (0011 crm_events_after;
         the local store does the same). Read the lead back, so Mine, Team and
         Unassigned stay right without a reload. */
      const who = meRef.current;
      const lead = leadsRef.current.find((l) => l.id === saved.leadId);
      if (isStaff(who) && !who.legacy && lead && !lead.assigneeId && ["sent", "call", "replied", "status"].includes(saved.type)) {
        void store
          .getLead(saved.leadId)
          .then((l) => l && putLead(l))
          .catch(() => undefined);
      }
      return saved;
    },
    [store, putLead],
  );

  const saveSettings = useCallback(
    async (s: Partial<OutreachSettings>) => {
      const saved = await store.saveSettings(s);
      setSettings({ ...DEFAULT_OUTREACH_SETTINGS, ...saved });
      return saved;
    },
    [store],
  );

  const findDuplicate = useCallback((q: { phone?: string; email?: string; excludeId?: string }) => store.findDuplicate(q), [store]);

  const importLeads = useCallback(
    async (rows: Record<string, string>[], opts?: ImportOptions) => {
      const r = await store.importLeads(rows, opts);
      await reload();
      announceOutreachChange();
      return r;
    },
    [store, reload],
  );

  /* ── The team: each write reads everything again once it succeeded ──── */

  const thenReload = useCallback(
    async <T,>(write: Promise<T>, cmsToo = false): Promise<T> => {
      const result = await write;
      await Promise.all([reload(), cmsToo ? actions.refresh().catch(() => undefined) : Promise.resolve()]);
      announceOutreachChange();
      return result;
    },
    [reload, actions],
  );

  const assignLeads = useCallback((ids: string[], memberId: string | null) => thenReload(store.assignLeads(ids, memberId)), [store, thenReload]);
  const distributeLeads = useCallback(
    (ids: string[], memberIds: string[], mode: DistributeMode, includeContacted?: boolean) =>
      thenReload(store.distributeLeads(ids, memberIds, mode, includeContacted)),
    [store, thenReload],
  );
  const applyRules = useCallback((ids: string[], includeContacted?: boolean) => thenReload(store.applyRules(ids, includeContacted)), [store, thenReload]);
  const handoff = useCallback((input: HandoffInput) => thenReload(store.handoff(input)), [store, thenReload]);
  const askOwner = useCallback((leadId: string, topic: AskTopic, text: string) => thenReload(store.askOwner(leadId, topic, text)), [store, thenReload]);
  const resolveRequest = useCallback(
    (id: number, outcome: RequestOutcome, note?: string) => thenReload(store.resolveRequest(id, outcome, note)),
    [store, thenReload],
  );
  // The demo record changes too (draft to sent): the CMS is read again with the rest.
  const publishLeadDemo = useCallback((leadId: string, sentTo?: string) => thenReload(store.publishLeadDemo(leadId, sentTo), true), [store, thenReload]);
  const logAccess = useCallback(
    (action: AccessAction, leadId?: string, detail?: Record<string, unknown>) => store.logAccess(action, leadId, detail),
    [store],
  );
  const activityStats = useCallback((fromIso: string, toIso?: string) => store.activityStats(fromIso, toIso), [store]);

  /* ── What the screens read ─────────────────────────────────────────────── */

  // Mehdi reads every open from the CMS, as before; anyone else only their own leads' (crm_demo_opens).
  const opens = useMemo(() => (me.role === "owner" ? cmsOpens : teamOpens), [me.role, cmsOpens, teamOpens]);

  // Mehdi and admins read every lead in full, so their overview is those leads; a member's comes from the database.
  const overview = useMemo(() => {
    if (!isStaff(me)) return memberOverview;
    const names = new Map(team.map((t) => [t.id, t.displayName]));
    return overviewRows(me, leads, (id) => (id ? names.get(id) : undefined));
  }, [me, leads, team, memberOverview]);

  const canEdit = useCallback((lead: OutreachLead) => canEditLead(me, lead), [me]);

  /*
    DEMO OPENS BECOME HISTORY. When a contacted lead's demo has been opened
    since the last contact, the lead moves to "Demo opened" and the history
    gets one line naming when. Once per open, in every browser: the line's id
    is made from the open's (demoOpenEventId), so when Mehdi's CRM and the
    member's both see the open, the second write is refused as a duplicate
    and taken as "already written". Lines from before carry the open's id in
    their text, which is checked too. Only for leads the caller may change.
    Not after a cold link (2 Oct 2026): when the last link they got went in a
    first message, an open is not a yes, so the lead stays Contacted and only
    the history line is written; it still shows under Hot.
    "Opened since the last contact" is derive.ts opensSinceContact (4 Oct 2026):
    the lead's own demo (by id, else by its slug), opened after its demo link
    went to them and after the last contact. A lead never contacted, or whose
    link never went to them, gets no line: such an open is not theirs.
  */
  const marking = useRef(new Set<string>());
  const demoIdBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of [...teamDemos, ...cmsDemos]) if (d.slug && !m.has(d.slug)) m.set(d.slug, d.id);
    return m;
  }, [teamDemos, cmsDemos]);
  useEffect(() => {
    if (loading || !me.role) return;
    const now = new Date();
    const ctx = { events, demoIdOf: (l: OutreachLead) => l.demoId || (l.demoSlug ? demoIdBySlug.get(l.demoSlug) : undefined) };
    for (const lead of leads) {
      if (!canEditLead(me, lead, now)) continue;
      const fresh = opensSinceContact(lead, opens, ctx);
      if (!fresh.length) continue;
      const latest = fresh[0];
      const id = demoOpenEventId(latest.id);
      if (marking.current.has(id)) continue;
      if (events.some((e) => e.id === id || (e.leadId === lead.id && e.type === "demo_opened" && (e.detail || "").includes(latest.id)))) continue;
      marking.current.add(id);
      void (async () => {
        try {
          await addEvent({
            id,
            leadId: lead.id,
            type: "demo_opened",
            at: latest.at,
            detail: `Demo opened (${fresh.length} ${fresh.length === 1 ? "open" : "opens"} since last contact) [${latest.id}]`,
          });
        } catch (err) {
          // A duplicate: another browser wrote this open first, and moved the lead. Anything else: not this time.
          if (!isDuplicate(err)) console.warn("CRM: the demo open was not recorded.", err);
          return;
        }
        if (lead.status !== "contacted" || linkWentCold(lead.id, events)) return;
        try {
          await patchLead(lead.id, { status: "demo_opened" });
        } catch (err) {
          console.warn("CRM: the lead was not moved to Demo opened.", err);
        }
      })();
    }
  }, [loading, me, leads, opens, events, addEvent, patchLead, demoIdBySlug]);

  const value: OutreachValue = {
    mode: store.mode,
    loading,
    error,
    me,
    leads,
    events,
    settings,
    opens,
    teamDemos,
    overview,
    team,
    requests,
    canEdit,
    reload,
    refreshRequests,
    saveLead,
    createLead,
    patchLead,
    appendNotes,
    deleteLead,
    addEvent,
    saveSettings,
    findDuplicate,
    importLeads,
    assignLeads,
    distributeLeads,
    applyRules,
    handoff,
    askOwner,
    resolveRequest,
    publishLeadDemo,
    logAccess,
    activityStats,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOutreach(): OutreachValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOutreach must be used inside <OutreachProvider>.");
  return v;
}
