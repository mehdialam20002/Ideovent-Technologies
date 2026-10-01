import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DemoSiteOpen } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { getOutreachStore } from "@/lib/outreach/store";
import type {
  EventInput,
  ImportOptions,
  ImportResult,
  LeadInput,
  OutreachEvent,
  OutreachLead,
  OutreachSettings,
} from "@/lib/outreach/types";
import { DEFAULT_OUTREACH_SETTINGS } from "@/lib/outreach/store";
import { opensSinceContact, OUTREACH_CHANGED } from "./derive";

export function announceOutreachChange() {
  try {
    window.dispatchEvent(new Event(OUTREACH_CHANGED));
  } catch {
    /* not in a browser */
  }
}

interface OutreachValue {
  mode: "local" | "supabase";
  loading: boolean;
  error: string | null;
  leads: OutreachLead[];
  events: OutreachEvent[];
  settings: OutreachSettings;
  opens: DemoSiteOpen[];
  reload: () => Promise<void>;
  saveLead: (lead: LeadInput) => Promise<OutreachLead>;
  deleteLead: (id: string) => Promise<void>;
  addEvent: (ev: EventInput) => Promise<OutreachEvent>;
  saveSettings: (s: Partial<OutreachSettings>) => Promise<OutreachSettings>;
  findDuplicate: (q: { phone?: string; email?: string; excludeId?: string }) => Promise<OutreachLead | null>;
  importLeads: (rows: Record<string, string>[], opts?: ImportOptions) => Promise<ImportResult>;
}

const Ctx = createContext<OutreachValue | null>(null);

export function OutreachProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getOutreachStore(), []);
  const { data } = useCms();
  const opens = useMemo(() => (data as unknown as { demoSiteOpens?: DemoSiteOpen[] }).demoSiteOpens || [], [data]);

  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [settings, setSettings] = useState<OutreachSettings>(DEFAULT_OUTREACH_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [l, e, s] = await Promise.all([store.listLeads(), store.listEvents(), store.getSettings()]);
      setLeads(l);
      setEvents(e);
      setSettings({ ...DEFAULT_OUTREACH_SETTINGS, ...s });
      setError(null);
    } catch (err) {
      setError(
        "Outreach data did not load: " +
          ((err as Error).message || "unknown error") +
          ". If this is the live site, run supabase/migrations/0007_outreach.sql once in the Supabase SQL editor.",
      );
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveLead = useCallback(
    async (lead: LeadInput) => {
      const saved = await store.upsertLead(lead);
      setLeads((prev) => {
        const i = prev.findIndex((x) => x.id === saved.id);
        if (i < 0) return [saved, ...prev];
        const next = prev.slice();
        next[i] = saved;
        return next;
      });
      announceOutreachChange();
      return saved;
    },
    [store],
  );

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
      setEvents((prev) => [saved, ...prev]);
      return saved;
    },
    [store],
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

  /*
    DEMO OPENS BECOME HISTORY. When a contacted lead's demo has been opened
    since the last contact, the lead moves to "Demo opened" and the history
    gets one line naming when. Once per open: the event's detail carries the
    open's id, so a reload does not write it again.
  */
  const marking = useRef(new Set<string>());
  useEffect(() => {
    if (loading) return;
    for (const lead of leads) {
      const fresh = opensSinceContact(lead, opens);
      if (!fresh.length) continue;
      const latest = fresh[0];
      const key = `open:${latest.id}`;
      if (marking.current.has(key)) continue;
      if (events.some((e) => e.leadId === lead.id && e.type === "demo_opened" && (e.detail || "").includes(latest.id))) continue;
      marking.current.add(key);
      void (async () => {
        await addEvent({
          leadId: lead.id,
          type: "demo_opened",
          at: latest.at,
          detail: `Demo opened (${fresh.length} ${fresh.length === 1 ? "open" : "opens"} since last contact) [${latest.id}]`,
        });
        if (lead.status === "contacted") await saveLead({ ...lead, status: "demo_opened" });
      })();
    }
  }, [loading, leads, opens, events, addEvent, saveLead]);

  const value: OutreachValue = {
    mode: store.mode,
    loading,
    error,
    leads,
    events,
    settings,
    opens,
    reload,
    saveLead,
    deleteLead,
    addEvent,
    saveSettings,
    findDuplicate,
    importLeads,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOutreach(): OutreachValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOutreach must be used inside <OutreachProvider>.");
  return v;
}
