/**
 * Loading the client files for the screens (client-process-spec decision 17,
 * 9 "Keeping the lead in step").
 *
 * Owner only: for anyone else (a member, an admin, nobody signed in) this
 * makes NO request at all, so a member's or an admin's browser never asks
 * for a client row; the database would refuse it anyway (0014). For the
 * owner before 0014 it says "not ready" and the screens say "This needs the
 * client update (0014)". The data stays in memory: nothing of a client is
 * written to localStorage or sessionStorage here.
 */
import { can } from "@/lib/outreach/access";
import type { CrmMe } from "@/lib/outreach/team";
import type { ClientStore } from "./store";
import type { ClientData } from "./types";

export interface ClientLoad {
  /** The owner and 0014 is there. */
  ready: boolean;
  /** Whether this person may open client files at all. */
  allowed: boolean;
  data: ClientData | null;
}

export async function loadClientData(store: ClientStore, me: CrmMe | null | undefined): Promise<ClientLoad> {
  if (!can(me, "clients")) return { ready: false, allowed: false, data: null };
  if (!(await store.ready())) return { ready: false, allowed: true, data: null };
  const [clients, projects, documents, payments, settings] = await Promise.all([
    store.listClients(),
    store.listProjects(),
    store.listDocuments(),
    store.listPayments(),
    store.getSettings(),
  ]);
  return { ready: true, allowed: true, data: { clients, projects, documents, payments, settings } };
}
