import { createContext, useContext } from "react";
import type { ClientStore } from "@/lib/clients/store";
import type { ProjectCtx } from "@/lib/clients/stages";
import type { ClientTask } from "@/lib/clients/tasks";
import type { ComposeCtx, MessageAbout } from "@/lib/clients/compose";
import type { ClientData, ClientEventInput, CrmClient, CrmProject } from "@/lib/clients/types";

/**
 * The client files' context, on its own (client-process-spec 10.1, decision 17).
 *
 * Types only, so the CRM shell can read it (the Clients badge) without loading
 * the client library: the provider (useClients.tsx) and the screens are
 * lazy chunks that only Mehdi's browser fetches. Everyone else's CRM never
 * downloads them and never asks for a client row.
 */

export type ClientsStatus = "off" | "loading" | "needs0014" | "ready" | "error";

export interface ClientsValue {
  allowed: boolean;
  status: ClientsStatus;
  error: string | null;
  data: ClientData;
  now: Date;
  today: string;
  refresh: () => Promise<void>;
  /** The store (owner only; never called for anyone else). */
  store: () => ClientStore;
  /** Every task of every open project and client, and those due today or late (not snoozed). */
  tasks: ClientTask[];
  due: ClientTask[];
  projectCtxOf: (projectId: string) => ProjectCtx | null;
  composeCtxOf: (clientId: string, projectId: string | null, about?: MessageAbout) => ComposeCtx | null;
  /** Saves a change to a project (optimistic concurrency on its updatedAt) and, optionally, a timeline line. */
  saveProject: (projectId: string, change: (p: CrmProject) => CrmProject, line?: Omit<ClientEventInput, "clientId" | "projectId">) => Promise<CrmProject>;
  saveClient: (clientId: string, patch: Partial<CrmClient>, line?: Omit<ClientEventInput, "clientId">) => Promise<CrmClient>;
  addLine: (input: ClientEventInput) => Promise<void>;
  /** Any other store call, then a re-read. */
  act: <T>(fn: (s: ClientStore) => Promise<T>) => Promise<T>;
  /** Keeps the lead in step with the file (9). */
  syncLead: (leadId: string | null | undefined, to: "proposal" | "won" | "lost", reason?: string) => Promise<void>;
}

export const ClientsContext = createContext<ClientsValue | null>(null);

/** Null outside the provider: for anyone but Mehdi the provider is not mounted at all. */
export function useOptionalClients(): ClientsValue | null {
  return useContext(ClientsContext);
}
