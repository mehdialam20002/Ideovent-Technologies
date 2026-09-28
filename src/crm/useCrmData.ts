import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DemoSite, DemoSiteOpen, DemoSiteSlot } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
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
import { computeMetrics, type CrmMetrics } from "./metrics";

/**
 * THE CRM'S ONE SOURCE OF STATE.
 *
 * Built ON the Outreach provider, not beside it: CrmLayout mounts
 * <OutreachProvider> and then <CrmDataProvider>, so the reused Outreach
 * components (ComposePanel, LeadPage, DemoPicker, ImportTab...) and every
 * CRM page read and write the same leads. Demos and opens come from the CMS.
 *
 * Optimistic: updateLead / setStatus / bulkUpdate show the change at once
 * (an overlay on top of the stored leads) and roll it back if the write fails.
 */
export interface CrmData {
  mode: "local" | "supabase";
  loading: boolean;
  error: string | null;
  /** Stored leads with any pending optimistic patches applied. */
  leads: OutreachLead[];
  /** Newest first (as the store returns them). */
  events: OutreachEvent[];
  settings: OutreachSettings;
  /** All demoSites records, examples included; metrics.demos has the real ones. */
  demos: DemoSite[];
  opens: DemoSiteOpen[];
  slots: DemoSiteSlot[];
  metrics: CrmMetrics;
  /** Ticks every minute, so "due today" moves at midnight without a reload. */
  now: Date;
  leadById: (id: string) => OutreachLead | undefined;
  eventsFor: (leadId: string) => OutreachEvent[];
  /** The demo linked to a lead: by demoId, else by demoSlug. */
  demoForLead: (lead: OutreachLead) => DemoSite | undefined;
  /** Re-read leads, events, settings and CMS content (demos, opens). */
  refresh: () => Promise<void>;
  /** Optimistic patch of one lead. Throws (after rolling back) if the save fails. */
  updateLead: (id: string, patch: Partial<OutreachLead>) => Promise<OutreachLead>;
  /** Optimistic status change, plus the "Status: X to Y" history line LeadPage writes. */
  setStatus: (id: string, status: LeadStatus) => Promise<void>;
  /** The same patch on many leads (table bulk actions). Resolves when all are saved. */
  bulkUpdate: (ids: string[], patch: Partial<OutreachLead>) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  /* Pass-throughs to the Outreach provider. */
  saveLead: (lead: LeadInput) => Promise<OutreachLead>;
  deleteLead: (id: string) => Promise<void>;
  addEvent: (ev: EventInput) => Promise<OutreachEvent>;
  saveSettings: (s: Partial<OutreachSettings>) => Promise<OutreachSettings>;
  importLeads: (rows: Record<string, string>[], opts?: ImportOptions) => Promise<ImportResult>;
  findDuplicate: (q: { phone?: string; email?: string; excludeId?: string }) => Promise<OutreachLead | null>;
}

const Ctx = createContext<CrmData | null>(null);

export function CrmDataProvider({ children }: { children: ReactNode }) {
  const o = useOutreach();
  const { data, actions } = useCms();
  const demos = useMemo(() => ((data as { demoSites?: DemoSite[] }).demoSites || []), [data]);
  const slots = useMemo(() => ((data as { demoSiteSlots?: DemoSiteSlot[] }).demoSiteSlots || []), [data]);
  const [overlay, setOverlay] = useState<Record<string, Partial<OutreachLead>>>({});
  const overlayRef = useRef(overlay);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

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

  const metrics = useMemo(
    () => computeMetrics({ leads, events: o.events, opens: o.opens, demos, now }),
    [leads, o.events, o.opens, demos, now],
  );

  const leadById = useCallback((id: string) => byId.get(id), [byId]);
  const eventsFor = useCallback((id: string) => eventsByLead.get(id) || [], [eventsByLead]);
  const demoForLead = useCallback(
    (lead: OutreachLead) =>
      (lead.demoId && demos.find((d) => d.id === lead.demoId)) || (lead.demoSlug ? demos.find((d) => d.slug === lead.demoSlug) : undefined),
    [demos],
  );

  const { reload, saveLead } = o;
  const refresh = useCallback(async () => {
    await Promise.all([reload(), actions.refresh().catch(() => undefined)]);
  }, [reload, actions]);

  /*
    Demos are often made in the admin tab (templates, poster upload, the
    demo-sites editor) while this tab stays open. Coming back to this tab
    re-reads everything, at most every 15 seconds, so a new demo and its
    opens show without a manual reload.
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

  // The latest stored leads, for writes that must not use a stale closure.
  const stored = useMemo(() => new Map(o.leads.map((l) => [l.id, l])), [o.leads]);

  const updateLead = useCallback(
    async (id: string, patch: Partial<OutreachLead>) => {
      const base = stored.get(id);
      if (!base) throw new Error("This lead does not exist any more.");
      const mine: Partial<OutreachLead> = { ...(overlayRef.current[id] || {}), ...patch };
      overlayRef.current = { ...overlayRef.current, [id]: mine };
      setOverlay(overlayRef.current);
      const clear = () => {
        if (overlayRef.current[id] !== mine) return; // a newer patch is pending
        const next = { ...overlayRef.current };
        delete next[id];
        overlayRef.current = next;
        setOverlay(next);
      };
      try {
        const saved = await saveLead({ ...base, ...mine, id });
        clear();
        return saved;
      } catch (err) {
        clear();
        throw err;
      }
    },
    [stored, saveLead],
  );

  const { addEvent } = o;
  const setStatus = useCallback(
    async (id: string, status: LeadStatus) => {
      const before = byId.get(id);
      if (!before || before.status === status) return;
      await updateLead(id, { status });
      await addEvent({
        leadId: id,
        type: "status",
        detail: `Status: ${LEAD_STATUS_LABELS[before.status]} to ${LEAD_STATUS_LABELS[status]}`,
      });
    },
    [byId, updateLead, addEvent],
  );

  const bulkUpdate = useCallback(
    async (ids: string[], patch: Partial<OutreachLead>) => {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          if (patch.status) {
            const { status, ...rest } = patch;
            await setStatus(id, status);
            if (Object.keys(rest).length) await updateLead(id, rest);
          } else await updateLead(id, patch);
        }),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) throw new Error(`${failed} of ${ids.length} leads did not save.`);
    },
    [setStatus, updateLead],
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
    leads,
    events: o.events,
    settings: o.settings,
    demos,
    opens: o.opens,
    slots,
    metrics,
    now,
    leadById,
    eventsFor,
    demoForLead,
    refresh,
    updateLead,
    setStatus,
    bulkUpdate,
    bulkDelete,
    saveLead: o.saveLead,
    deleteLead: o.deleteLead,
    addEvent: o.addEvent,
    saveSettings: o.saveSettings,
    importLeads: o.importLeads,
    findDuplicate: o.findDuplicate,
  };
  return createElement(Ctx.Provider, { value }, children);
}

export function useCrmData(): CrmData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrmData must be used inside <CrmDataProvider> (CrmLayout mounts it).");
  return v;
}
