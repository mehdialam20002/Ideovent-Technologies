import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { DemoSite, DemoSiteOpen, DemoSiteSlot } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { canEditLead, isStaff as isStaffMe } from "@/lib/outreach/access";
import type {
  AccessAction,
  AskTopic,
  CrmMe,
  CrmRequest,
  CrmTeamName,
  DistributeMode,
  DistributeRow,
  DuplicateMatch,
  HandoffInput,
  LeadOverview,
  MemberStats,
  RequestOutcome,
} from "@/lib/outreach/team";
import {
  LEAD_STATUS_LABELS,
  type EventInput,
  type ImportOptions,
  type ImportResult,
  type LeadInput,
  type LeadStatus,
  type OutreachEvent,
  type OutreachLead,
  type OutreachSettings,
} from "@/lib/outreach/types";
import { useOutreach } from "@/admin/outreach/useOutreach";
import { closeThese as closeTheseOf, hotLeads, isOpenLead, KEEP_OPEN_TAG, NO_REPLY_REASON } from "@/admin/outreach/derive";
import { computeMetrics, due, type CrmMetrics, type NameOf } from "./metrics";

/* ── Scope (spec 10.4): whose leads a screen shows ───────────────────────── */

/**
 * Mehdi and admins pick whose leads a screen shows. Mine: for Mehdi his own
 * and the Unassigned pool (on migration day that is every lead he has today);
 * for an admin, the leads assigned to them. Team: leads someone else works.
 * All: every lead. Unassigned: the pool nobody has written to. A member has
 * no switch: they read only their own leads, so every scope is those.
 */
export type CrmScope = "mine" | "team" | "all" | "unassigned";
export const CRM_SCOPES: readonly CrmScope[] = ["mine", "team", "all", "unassigned"];
export const CRM_SCOPE_LABELS: Record<CrmScope, string> = { mine: "Mine", team: "Team", all: "All", unassigned: "Unassigned" };

/** The screens that remember a scope, each its own. */
export type CrmScreen = "dashboard" | "today" | "leads" | "pipeline";
/** Today and Pipeline open on Mine; Leads and the Dashboard on All. */
export const SCOPE_DEFAULTS: Readonly<Record<CrmScreen, CrmScope>> = { dashboard: "all", today: "mine", leads: "all", pipeline: "mine" };
/** Per browser: { today: "team", ... }. */
export const SCOPE_STORAGE_KEY = "ideovent_crm_scope_v1";

const NO_SCOPES: readonly CrmScope[] = [];

/** Whether this person picks a scope at all: Mehdi and admins, with the team (0011). */
export function hasScopes(me: CrmMe): boolean {
  return !me.legacy && isStaffMe(me);
}

/** True when the lead is in this scope for this person (column mirrors; a lead with none is Unassigned). */
export function inScope(lead: OutreachLead, scope: CrmScope, me: CrmMe): boolean {
  if (scope === "all") return true;
  const who = lead.assigneeId || null;
  if (scope === "unassigned") return !who;
  if (scope === "team") return Boolean(who) && who !== me.memberId;
  return (Boolean(who) && who === me.memberId) || (me.role === "owner" && !who);
}

/** The screen a CRM address shows (on the CRM's own host there is no /crm prefix); null for any other page. */
export function screenOf(pathname: string): CrmScreen | null {
  const p = pathname.replace(/^\/crm(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  if (p === "/") return "dashboard";
  if (p === "/today") return "today";
  if (p === "/leads") return "leads";
  if (p === "/pipeline") return "pipeline";
  return null;
}

function readScopes(): Partial<Record<CrmScreen, CrmScope>> {
  try {
    const raw = JSON.parse(localStorage.getItem(SCOPE_STORAGE_KEY) || "{}") as Record<string, unknown>;
    const out: Partial<Record<CrmScreen, CrmScope>> = {};
    for (const s of Object.keys(SCOPE_DEFAULTS) as CrmScreen[]) {
      const v = raw?.[s];
      if (typeof v === "string" && (CRM_SCOPES as readonly string[]).includes(v)) out[s] = v as CrmScope;
    }
    return out;
  } catch {
    return {};
  }
}

/** The CMS's demo records, and (anyone but Mehdi) those linked to their leads, drafts included; the latter win. */
function withTeamDemos(cms: DemoSite[], mine: DemoSite[]): DemoSite[] {
  if (!mine.length) return cms;
  const ids = new Set(mine.map((d) => d.id));
  return [...cms.filter((d) => !ids.has(d.id)), ...mine];
}

/**
 * THE CRM'S ONE SOURCE OF STATE.
 *
 * Built ON the Outreach provider, not beside it: CrmLayout mounts
 * <OutreachProvider> and then <CrmDataProvider>, so the reused Outreach
 * components (ComposePanel, LeadPage, DemoPicker, ImportTab...) and every
 * CRM page read and write the same leads. Demos and opens come from the CMS
 * for Mehdi, and from the team functions for anyone else.
 *
 * Optimistic: patchLead (updateLead) / setStatus / bulkUpdate show the change
 * at once (an overlay on top of the stored leads) and roll it back if the
 * write fails. Since the team (0011) a change travels as a patch of the keys
 * it names, merged on the server, so two people never overwrite each other.
 */
export interface CrmData {
  mode: "local" | "supabase";
  loading: boolean;
  error: string | null;
  /** Who the data was read as (crm_me; local mode: the acting person). Meaningful once `loading` is false. */
  me: CrmMe;
  isOwner: boolean;
  isMember: boolean;
  /** Mehdi or an admin: works every lead. */
  isStaff: boolean;
  /** The people's names (crm_team), never e-mails. */
  team: CrmTeamName[];
  /** A person's name, as useCrmMe().nameOf: "Unassigned" for no id; `fallback` ("Someone") for an id the caller's roster does not name. */
  nameOf: (id?: string | null, fallback?: string) => string;
  /** Stored leads with any pending optimistic patches applied: every lead the caller may read in full. */
  leads: OutreachLead[];
  /** Newest first (as the store returns them), with who wrote each line (actorId). */
  events: OutreachEvent[];
  settings: OutreachSettings;
  /** All demoSites records the caller reads, examples included (metrics.demos has the real ones). */
  demos: DemoSite[];
  /** Mehdi: every open, from the CMS. Anyone else: the opens of their leads' demos. */
  opens: DemoSiteOpen[];
  slots: DemoSiteSlot[];
  /** Every number over every lead the caller reads: the Dashboard on All, and the numbers as before the team. */
  metrics: CrmMetrics;
  /** The same numbers over one scope, with the funnel and breakdowns narrowed to one owner. Cached until the data changes. */
  metricsFor: (scope?: CrmScope, owner?: string | null) => CrmMetrics;
  /** Ticks every minute, so "due today" moves at midnight without a reload. */
  now: Date;

  /* ── Scope (spec 10.4) ── */
  /** The scope of the screen on show (Dashboard, Today, Leads, Pipeline); "all" on any other page and for anyone without a switch. */
  scope: CrmScope;
  /** Picks the scope of the screen on show (or of `screen`), remembered per browser. */
  setScope: (scope: CrmScope, screen?: CrmScreen) => void;
  /** The leads in `scope`. */
  scopedLeads: OutreachLead[];
  /** The choices of the switch: empty for a member and in legacy mode (no switch then). */
  scopes: readonly CrmScope[];
  /** The screen on show, when it is one that has a scope. */
  screen: CrmScreen | null;
  scopeFor: (screen: CrmScreen) => CrmScope;
  leadsIn: (scope: CrmScope) => OutreachLead[];
  /** The leads this person works: Mehdi's own and the pool; anyone else's own. */
  mine: OutreachLead[];
  /** Open leads in the Unassigned pool (0 without the team). */
  unassignedOpen: number;
  /** Counts over `mine`, for the rail: due today or late, hot, close these. */
  badges: { due: number; hot: number; closeThese: number };

  /* ── The team ── */
  /** Leads without contacts: every lead with See all (and for Mehdi and admins); for a member also their hand-overs. */
  overview: LeadOverview[];
  /** Ask Mehdi and hand-overs: Mehdi and admins all, a member their own. Newest first. */
  requests: CrmRequest[];
  /** Open requests this person answers, oldest first: Mehdi every one, an admin those sent to them. */
  waitingOnYou: CrmRequest[];
  /** "Close these": my open leads at Contacted whose no-reply cadence is used up (derive.ts cadenceDone), longest silent first. */
  closeThese: OutreachLead[];

  leadById: (id: string) => OutreachLead | undefined;
  eventsFor: (leadId: string) => OutreachEvent[];
  /** The demo linked to a lead: by demoId, else by demoSlug. */
  demoForLead: (lead: OutreachLead) => DemoSite | undefined;
  /** May the caller change this lead at all (which fields is the database's guard)? */
  canEdit: (lead: OutreachLead) => boolean;
  /** Re-read leads, events, settings, the team's lists and CMS content (demos, opens). */
  refresh: () => Promise<void>;
  refreshRequests: () => Promise<void>;

  /* ── Writes ── */
  /** Optimistic patch of one lead: only these keys, merged on the server; undefined removes a key. Throws (after rolling back) if refused. */
  patchLead: (id: string, patch: Partial<OutreachLead>) => Promise<OutreachLead>;
  /** The same as patchLead (its name before the team). */
  updateLead: (id: string, patch: Partial<OutreachLead>) => Promise<OutreachLead>;
  /** "Add to notes": one more line, appended on the server. */
  appendNotes: (id: string, text: string) => Promise<OutreachLead>;
  /** Optimistic status change (with `extra` keys, e.g. lostReason), plus the "Status: X to Y" history line. */
  setStatus: (id: string, status: LeadStatus, extra?: Partial<OutreachLead>) => Promise<void>;
  /** Lost, with the reason (a member must give one); by default "No reply after the last message" (Close these). */
  markLost: (id: string, reason?: string) => Promise<void>;
  /** "Keep open" from Close these: the next follow-up on that date; the lead leaves Close these until then. */
  keepOpen: (id: string, untilIso: string) => Promise<OutreachLead>;
  /** The same patch on many leads (table bulk actions). Resolves when all are saved. */
  bulkUpdate: (ids: string[], patch: Partial<OutreachLead>) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  /** To a person, or (null) back to Unassigned. Mehdi and admins. How many moved. */
  assignLeads: (ids: string[], memberId: string | null) => Promise<number>;
  distributeLeads: (ids: string[], memberIds: string[], mode: DistributeMode, includeContacted?: boolean) => Promise<DistributeRow[]>;
  applyRules: (ids: string[], includeContacted?: boolean) => Promise<DistributeRow[]>;
  handoff: (input: HandoffInput) => Promise<number | null>;
  askOwner: (leadId: string, topic: AskTopic, text: string) => Promise<void>;
  resolveRequest: (id: number, outcome: RequestOutcome, note?: string) => Promise<void>;
  publishLeadDemo: (leadId: string, sentTo?: string) => Promise<string>;
  /* Pass-throughs to the Outreach provider. */
  saveLead: (lead: LeadInput) => Promise<OutreachLead>;
  createLead: (lead: LeadInput) => Promise<OutreachLead>;
  deleteLead: (id: string) => Promise<void>;
  addEvent: (ev: EventInput) => Promise<OutreachEvent>;
  saveSettings: (s: Partial<OutreachSettings>) => Promise<OutreachSettings>;
  importLeads: (rows: Record<string, string>[], opts?: ImportOptions) => Promise<ImportResult>;
  findDuplicate: (q: { phone?: string; email?: string; excludeId?: string }) => Promise<DuplicateMatch | null>;
  logAccess: (action: AccessAction, leadId?: string, detail?: Record<string, unknown>) => Promise<void>;
  activityStats: (fromIso: string, toIso?: string) => Promise<MemberStats[]>;
}

const Ctx = createContext<CrmData | null>(null);

export function CrmDataProvider({ children }: { children: ReactNode }) {
  const o = useOutreach();
  const { me } = o;
  const { data, actions } = useCms();
  const { pathname } = useLocation();
  const cmsDemos = useMemo(() => ((data as { demoSites?: DemoSite[] }).demoSites || []), [data]);
  const demos = useMemo(() => withTeamDemos(cmsDemos, o.teamDemos), [cmsDemos, o.teamDemos]);
  const slots = useMemo(() => ((data as { demoSiteSlots?: DemoSiteSlot[] }).demoSiteSlots || []), [data]);
  const [overlay, setOverlay] = useState<Record<string, Partial<OutreachLead>>>({});
  const overlayRef = useRef(overlay);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Another person (local mode's Act as): no pending change carries over to them.
  const who = me.memberId;
  const lastWho = useRef(who);
  useEffect(() => {
    if (lastWho.current === who) return;
    lastWho.current = who;
    overlayRef.current = {};
    setOverlay({});
  }, [who]);

  const leads = useMemo(
    () => (Object.keys(overlay).length ? o.leads.map((l) => (overlay[l.id] ? { ...l, ...overlay[l.id] } : l)) : o.leads),
    [o.leads, overlay],
  );
  const byId = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const eventsByLead = useMemo(() => {
    const m = new Map<string, OutreachEvent[]>();
    for (const e of o.events) {
      const a = m.get(e.leadId);
      if (a) a.push(e);
      else m.set(e.leadId, [e]);
    }
    return m;
  }, [o.events]);

  /* Names: the roster, and the caller's own name even before the roster has it. */
  const names = useMemo(() => new Map(o.team.map((t) => [t.id, t.displayName])), [o.team]);
  const knownName: NameOf = useCallback(
    (id) => (id ? names.get(id) || (id === me.memberId && me.displayName ? me.displayName : undefined) : undefined),
    [names, me.memberId, me.displayName],
  );
  const nameOf = useCallback((id?: string | null, fallback = "Someone") => (id ? knownName(id) || fallback : "Unassigned"), [knownName]);

  const metrics = useMemo(
    () => computeMetrics({ leads, events: o.events, opens: o.opens, demos, now, nameOf: knownName }),
    [leads, o.events, o.opens, demos, now, knownName],
  );

  /* ── Scope ── */
  const canScope = hasScopes(me);
  const [chosen, setChosen] = useState(readScopes);
  const screen = screenOf(pathname);
  const scopeFor = useCallback((s: CrmScreen): CrmScope => (canScope ? chosen[s] || SCOPE_DEFAULTS[s] : "all"), [canScope, chosen]);
  const scope: CrmScope = screen ? scopeFor(screen) : "all";
  const setScope = useCallback(
    (next: CrmScope, s?: CrmScreen) => {
      const target = s || screen;
      if (!target) return;
      setChosen((prev) => {
        const saved = { ...prev, [target]: next };
        try {
          localStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(saved));
        } catch {
          /* remembered for this visit only */
        }
        return saved;
      });
    },
    [screen],
  );
  const byScope = useMemo(() => {
    const r: Record<CrmScope, OutreachLead[]> = { mine: [], team: [], all: leads, unassigned: [] };
    for (const l of leads) for (const s of ["mine", "team", "unassigned"] as const) if (inScope(l, s, me)) r[s].push(l);
    return r;
  }, [leads, me]);
  const leadsIn = useCallback((s: CrmScope) => byScope[s] || byScope.all, [byScope]);
  const mine = byScope.mine;

  /* The same numbers for another scope or one owner, counted once until the data changes. */
  const metricsCache = useRef<{ base: CrmMetrics | null; map: Map<string, CrmMetrics> }>({ base: null, map: new Map() });
  const metricsFor = useCallback(
    (s: CrmScope = "all", owner?: string | null): CrmMetrics => {
      if (s === "all" && !owner) return metrics;
      const c = metricsCache.current;
      if (c.base !== metrics) {
        c.base = metrics;
        c.map = new Map();
      }
      const key = `${s}|${owner || ""}`;
      let m = c.map.get(key);
      if (!m) {
        m = computeMetrics({ leads: byScope[s] || leads, events: o.events, opens: o.opens, demos, now, owner, nameOf: knownName });
        c.map.set(key, m);
      }
      return m;
    },
    [metrics, byScope, leads, o.events, o.opens, demos, now, knownName],
  );

  const closeThese = useMemo(() => closeTheseOf(mine, o.events, now), [mine, o.events, now]);
  const badges = useMemo(() => {
    const d = due(mine, now);
    return { due: d.today.length + d.overdue.length, hot: hotLeads(mine, o.opens, now).length, closeThese: closeThese.length };
  }, [mine, o.opens, now, closeThese]);
  const unassignedOpen = useMemo(() => (canScope ? byScope.unassigned.filter(isOpenLead).length : 0), [canScope, byScope]);

  const { requests } = o;
  const waitingOnYou = useMemo(() => {
    if (!isStaffMe(me) || me.legacy) return [];
    return requests
      .filter((r) => !r.resolvedAt && (me.role === "owner" || r.hostId === me.memberId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
  }, [requests, me]);

  const leadById = useCallback((id: string) => byId.get(id), [byId]);
  const eventsFor = useCallback((id: string) => eventsByLead.get(id) || [], [eventsByLead]);
  const demoForLead = useCallback(
    (lead: OutreachLead) =>
      (lead.demoId && demos.find((d) => d.id === lead.demoId)) || (lead.demoSlug ? demos.find((d) => d.slug === lead.demoSlug) : undefined),
    [demos],
  );
  const canEdit = useCallback((lead: OutreachLead) => canEditLead(me, lead), [me]);

  const { reload } = o;
  const refresh = useCallback(async () => {
    await Promise.all([reload(), actions.refresh().catch(() => undefined)]);
  }, [reload, actions]);

  /*
    Demos are often made in the admin tab (templates, poster upload, the
    demo-sites editor) while this tab stays open. Coming back to this tab
    re-reads everything, at most every 15 seconds, so a new demo and its
    opens show without a manual reload (and so does a lead Mehdi moved).
  */
  const lastRefresh = useRef(Date.now());
  useEffect(() => {
    const on = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh.current < 15_000) return;
      lastRefresh.current = Date.now();
      void refresh();
    };
    document.addEventListener("visibilitychange", on);
    window.addEventListener("focus", on);
    return () => {
      document.removeEventListener("visibilitychange", on);
      window.removeEventListener("focus", on);
    };
  }, [refresh]);

  /* ── Writes ── */

  // The latest stored leads, for writes that must not use a stale closure.
  const stored = useMemo(() => new Map(o.leads.map((l) => [l.id, l])), [o.leads]);
  const { patchLead: patchStored } = o;

  const patchLead = useCallback(
    async (id: string, patch: Partial<OutreachLead>) => {
      if (!stored.get(id)) throw new Error("This lead does not exist any more.");
      const pending: Partial<OutreachLead> = { ...(overlayRef.current[id] || {}), ...patch };
      overlayRef.current = { ...overlayRef.current, [id]: pending };
      setOverlay(overlayRef.current);
      const clear = () => {
        if (overlayRef.current[id] !== pending) return; // a newer patch is pending
        const next = { ...overlayRef.current };
        delete next[id];
        overlayRef.current = next;
        setOverlay(next);
      };
      try {
        const saved = await patchStored(id, pending);
        clear();
        return saved;
      } catch (err) {
        clear();
        throw err;
      }
    },
    [stored, patchStored],
  );

  const { addEvent } = o;
  const setStatus = useCallback(
    async (id: string, status: LeadStatus, extra?: Partial<OutreachLead>) => {
      const before = byId.get(id);
      if (!before) return;
      if (before.status === status) {
        if (extra && Object.keys(extra).length) await patchLead(id, extra);
        return;
      }
      await patchLead(id, { ...(extra || {}), status });
      await addEvent({
        leadId: id,
        type: "status",
        detail: `Status: ${LEAD_STATUS_LABELS[before.status]} to ${LEAD_STATUS_LABELS[status]}`,
      });
    },
    [byId, patchLead, addEvent],
  );

  const markLost = useCallback((id: string, reason?: string) => setStatus(id, "lost", { lostReason: (reason || "").trim() || NO_REPLY_REASON }), [setStatus]);

  const keepOpen = useCallback(
    (id: string, untilIso: string) => {
      const tags = byId.get(id)?.tags || [];
      return patchLead(id, { nextActionAt: untilIso, tags: tags.includes(KEEP_OPEN_TAG) ? tags : [...tags, KEEP_OPEN_TAG] });
    },
    [byId, patchLead],
  );

  const bulkUpdate = useCallback(
    async (ids: string[], patch: Partial<OutreachLead>) => {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          if (patch.status) {
            const { status, ...rest } = patch;
            await setStatus(id, status);
            if (Object.keys(rest).length) await patchLead(id, rest);
          } else await patchLead(id, patch);
        }),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) throw new Error(`${failed} of ${ids.length} leads did not save.`);
    },
    [setStatus, patchLead],
  );

  const { deleteLead } = o;
  const bulkDelete = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await deleteLead(id);
    },
    [deleteLead],
  );

  const value: CrmData = {
    mode: o.mode,
    loading: o.loading,
    error: o.error,
    me,
    isOwner: me.role === "owner",
    isMember: me.role === "member",
    isStaff: isStaffMe(me),
    team: o.team,
    nameOf,
    leads,
    events: o.events,
    settings: o.settings,
    demos,
    opens: o.opens,
    slots,
    metrics,
    metricsFor,
    now,
    scope,
    setScope,
    scopedLeads: leadsIn(scope),
    scopes: canScope ? CRM_SCOPES : NO_SCOPES,
    screen,
    scopeFor,
    leadsIn,
    mine,
    unassignedOpen,
    badges,
    overview: o.overview,
    requests,
    waitingOnYou,
    closeThese,
    leadById,
    eventsFor,
    demoForLead,
    canEdit,
    refresh,
    refreshRequests: o.refreshRequests,
    patchLead,
    updateLead: patchLead,
    appendNotes: o.appendNotes,
    setStatus,
    markLost,
    keepOpen,
    bulkUpdate,
    bulkDelete,
    assignLeads: o.assignLeads,
    distributeLeads: o.distributeLeads,
    applyRules: o.applyRules,
    handoff: o.handoff,
    askOwner: o.askOwner,
    resolveRequest: o.resolveRequest,
    publishLeadDemo: o.publishLeadDemo,
    saveLead: o.saveLead,
    createLead: o.createLead,
    deleteLead: o.deleteLead,
    addEvent: o.addEvent,
    saveSettings: o.saveSettings,
    importLeads: o.importLeads,
    findDuplicate: o.findDuplicate,
    logAccess: o.logAccess,
    activityStats: o.activityStats,
  };
  return createElement(Ctx.Provider, { value }, children);
}

export function useCrmData(): CrmData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrmData must be used inside <CrmDataProvider> (CrmLayout mounts it).");
  return v;
}
