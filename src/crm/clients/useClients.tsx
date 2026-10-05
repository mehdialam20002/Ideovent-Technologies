import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LeadStatus } from "@/lib/outreach/types";
import { getClientStore, mergeClientSettings, NEEDS_0014 } from "@/lib/clients/store";
import { loadClientData } from "@/lib/clients/load";
import { indiaDate } from "@/lib/clients/numbering";
import type { ProjectCtx } from "@/lib/clients/stages";
import { clientTasks, dueToday, projectTasks, type ClientTask } from "@/lib/clients/tasks";
import { clientCtx, projectCtx, type ComposeCtx, type MessageAbout } from "@/lib/clients/compose";
import type { ClientStore } from "@/lib/clients/store";
import type { ClientData, ClientEventInput, CrmClient, CrmProject } from "@/lib/clients/types";
import { useCrmData } from "../useCrmData";
import { useCrmMe } from "../useCrmMe";
import { ClientsContext, type ClientsStatus, type ClientsValue } from "./context";
import { errText } from "./shared";

/**
 * THE CLIENT FILES IN THE CRM (client-process-spec 9, 10, decision 17).
 *
 * Owner only. CrmLayout mounts this provider for Mehdi alone (a lazy chunk:
 * nobody else's browser even downloads it), and it checks again: for anyone
 * else, and for Mehdi before 0014 in Supabase mode, it makes NO request at
 * all, so a member's or an admin's browser never asks for a client row (the
 * database would refuse it anyway). The data is kept in memory only. Every
 * write goes through the store (the guards of 0014, or rules.ts in local
 * mode) and the screen re-reads afterwards.
 *
 * Keeping the lead in step (9): the proposal sent from the file moves the lead
 * to Proposal and clears its own follow-up; "They said yes" moves it to Won;
 * "They said no" to Lost with the reason. Each through useCrmData's
 * setStatus, the same two writes the lead page makes. Nothing else of the
 * lead changes, and no client message becomes a lead "sent" line.
 */

const EMPTY: ClientData = { clients: [], projects: [], documents: [], payments: [], settings: mergeClientSettings({}) };

export function ClientsProvider({ children }: { children: ReactNode }) {
  const { can, me } = useCrmMe();
  const { now, leadById, setStatus, patchLead, settings: outreachSettings } = useCrmData();
  const allowed = can("clients");
  const [status, setStatusState] = useState<ClientsStatus>(allowed ? "loading" : "off");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClientData>(EMPTY);
  const dataRef = useRef<ClientData>(EMPTY);
  dataRef.current = data;
  const storeRef = useRef<ClientStore | null>(null);
  const store = useCallback(() => {
    if (!allowed) throw new Error("Client files are Mehdi's.");
    if (!storeRef.current) storeRef.current = getClientStore();
    return storeRef.current;
  }, [allowed]);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    try {
      const r = await loadClientData(store(), me);
      if (!r.ready) {
        setStatusState("needs0014");
        setData(EMPTY);
        return;
      }
      setData(r.data || EMPTY);
      setStatusState("ready");
      setError(null);
    } catch (e) {
      setError(errText(e));
      setStatusState("error");
    }
  }, [allowed, me, store]);

  useEffect(() => {
    if (!allowed) {
      setStatusState("off");
      setData(EMPTY);
      return;
    }
    void refresh();
  }, [allowed, refresh]);

  const today = indiaDate(now);

  const projectCtxOf = useCallback((projectId: string): ProjectCtx | null => {
    const d = dataRef.current;
    const project = d.projects.find((p) => p.id === projectId);
    if (!project) return null;
    const client = d.clients.find((c) => c.id === project.clientId);
    if (!client) return null;
    const docs = d.documents.filter((x) => x.projectId === project.id || (x.clientId === client.id && !x.projectId && x.milestone === "AMC"));
    const payments = d.payments.filter((x) => x.projectId === project.id || (x.clientId === client.id && !x.projectId));
    return { client, project, docs, payments, settings: d.settings, today: indiaDate(now) };
    // `data` is listed so a new read gives a new function (screens re-derive from it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, data]);

  const composeCtxOf = useCallback((clientId: string, projectId: string | null, about?: MessageAbout): ComposeCtx | null => {
    const d = dataRef.current;
    const client = d.clients.find((c) => c.id === clientId);
    if (!client) return null;
    const project = projectId ? d.projects.find((p) => p.id === projectId) || null : null;
    const base = project ? projectCtx(client, project, d.documents, d.payments, d.settings, now) : clientCtx(client, d.documents, d.payments, d.settings, now, d.projects);
    const lead = client.leadId ? leadById(client.leadId) : undefined;
    return {
      ...base,
      about,
      lead: lead ? { status: lead.status, metaConsent: (lead as { metaConsent?: string }).metaConsent } : null,
      signature: outreachSettings.signature,
      quietStart: outreachSettings.quietStart,
      quietEnd: outreachSettings.quietEnd,
      anyTestimonialOnFile: d.clients.some((c) => c.testimonial?.status === "permission_on_file"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, data, leadById, outreachSettings]);

  const tasks = useMemo(() => {
    if (status !== "ready") return [];
    const out: ClientTask[] = [];
    for (const p of data.projects) {
      const c = projectCtxOf(p.id);
      if (c) out.push(...projectTasks(c));
    }
    for (const cl of data.clients) {
      out.push(...clientTasks({
        client: cl,
        docs: data.documents.filter((d) => d.clientId === cl.id && !d.projectId),
        payments: data.payments.filter((p) => p.clientId === cl.id && !p.projectId),
        handoverIssued: data.documents.some((d) => d.clientId === cl.id && d.kind === "handover" && d.status === "issued"),
        today,
      }));
    }
    return out;
  }, [status, data, today, projectCtxOf]);

  const due = useMemo(() => dueToday(tasks, today, (t) => {
    if (t.projectId) return data.projects.find((p) => p.id === t.projectId)?.snoozed;
    return data.clients.find((c) => c.id === t.clientId)?.snoozed;
  }), [tasks, today, data]);

  const addLine = useCallback(async (input: ClientEventInput) => {
    await store().addEvent(input);
  }, [store]);

  const saveProject = useCallback(async (projectId: string, change: (p: CrmProject) => CrmProject, line?: Omit<ClientEventInput, "clientId" | "projectId">) => {
    const cur = dataRef.current.projects.find((p) => p.id === projectId);
    if (!cur) throw new Error("This project does not exist any more.");
    const next = change(cur);
    const { id: _id, code: _code, clientId: _cl, createdAt: _c, updatedAt: _u, ...patch } = next;
    const saved = await store().updateProject(projectId, patch, cur.updatedAt);
    if (line) await store().addEvent({ ...line, clientId: cur.clientId, projectId });
    await refresh();
    return saved;
  }, [store, refresh]);

  const saveClient = useCallback(async (clientId: string, patch: Partial<CrmClient>, line?: Omit<ClientEventInput, "clientId">) => {
    const cur = dataRef.current.clients.find((c) => c.id === clientId);
    if (!cur) throw new Error("This client does not exist any more.");
    const saved = await store().updateClient(clientId, patch, cur.updatedAt);
    if (line) await store().addEvent({ ...line, clientId });
    await refresh();
    return saved;
  }, [store, refresh]);

  const act = useCallback(async <T,>(fn: (s: ClientStore) => Promise<T>): Promise<T> => {
    try {
      return await fn(store());
    } finally {
      await refresh();
    }
  }, [store, refresh]);

  const syncLead = useCallback(async (leadId: string | null | undefined, to: "proposal" | "won" | "lost", reason?: string) => {
    if (!leadId) return;
    const lead = leadById(leadId);
    if (!lead) return;
    const BEFORE_PROPOSAL: LeadStatus[] = ["new", "contacted", "replied", "demo_opened", "call"];
    if (to === "proposal") {
      if (BEFORE_PROPOSAL.includes(lead.status)) await setStatus(leadId, "proposal", { nextActionAt: undefined });
      else if (lead.nextActionAt) await patchLead(leadId, { nextActionAt: undefined });
      return;
    }
    if (to === "won" && lead.status !== "won") await setStatus(leadId, "won", { nextActionAt: undefined });
    if (to === "lost" && lead.status !== "lost") await setStatus(leadId, "lost", { lostReason: reason || undefined, nextActionAt: undefined });
  }, [leadById, setStatus, patchLead]);

  const value = useMemo<ClientsValue>(() => ({
    allowed, status, error, data, now, today, refresh, store, tasks, due, projectCtxOf, composeCtxOf, saveProject, saveClient, addLine, act, syncLead,
  }), [allowed, status, error, data, now, today, refresh, store, tasks, due, projectCtxOf, composeCtxOf, saveProject, saveClient, addLine, act, syncLead]);

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export default ClientsProvider;

export function useClients(): ClientsValue {
  const v = useContext(ClientsContext);
  if (!v) throw new Error("useClients outside ClientsProvider");
  return v;
}

export { useOptionalClients } from "./context";
export type { ClientsStatus, ClientsValue } from "./context";
export { NEEDS_0014 };
