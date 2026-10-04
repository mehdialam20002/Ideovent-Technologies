/**
 * ONE CONTEXT PER DOCUMENT (client-process-spec 6.1, decision 17).
 *
 * docContext is the only function that assembles a builder's context: the
 * client, the project, that project's documents and payments, and Settings,
 * each selected by id (a client-level document, such as a care plan invoice:
 * the client and its own client-level documents and payments). Builders
 * receive nothing else, so no list of all clients ever reaches a builder, and
 * the receipt's "Received earlier", the invoice's "Less" lines and the closing
 * letter's renewals can only come from the client they are about.
 */
import { fyOf, indiaDate } from "../numbering";
import type { ClientSettings, CrmClient, CrmDocument, CrmPayment, CrmProject } from "../types";

export interface DocCtx {
  client: CrmClient;
  project: CrmProject | null;
  /** This project's documents (or, for a client-level document, the client's own). */
  docs: CrmDocument[];
  payments: CrmPayment[];
  settings: ClientSettings;
  /** The document being built (a draft or an issued one); null when previewing a new one. */
  doc: CrmDocument | null;
  /** India date. */
  today: string;
  currentFy: string;
}

export interface DocSource {
  clients: CrmClient[];
  projects: CrmProject[];
  documents: CrmDocument[];
  payments: CrmPayment[];
  settings: ClientSettings;
}

export function docContext(data: DocSource, target: { projectId?: string | null; clientId?: string | null }, documentId?: string | null, now = new Date()): DocCtx {
  const today = indiaDate(now);
  let client: CrmClient | undefined;
  let project: CrmProject | null = null;
  let docs: CrmDocument[];
  let payments: CrmPayment[];
  if (target.projectId) {
    project = data.projects.find((p) => p.id === target.projectId) || null;
    if (!project) throw new Error("No such project.");
    const pid = project.id;
    client = data.clients.find((c) => c.id === project!.clientId);
    docs = data.documents.filter((d) => d.projectId === pid && d.clientId === project!.clientId);
    payments = data.payments.filter((p) => p.projectId === pid && p.clientId === project!.clientId);
  } else if (target.clientId) {
    client = data.clients.find((c) => c.id === target.clientId);
    docs = data.documents.filter((d) => d.clientId === target.clientId && !d.projectId);
    payments = data.payments.filter((p) => p.clientId === target.clientId && !p.projectId);
  } else {
    throw new Error("A document belongs to a project or a client.");
  }
  if (!client) throw new Error("No such client.");
  const doc = documentId ? docs.find((d) => d.id === documentId) || null : null;
  if (documentId && !doc) throw new Error("That document does not belong to this project.");
  return { client, project, docs, payments, settings: data.settings, doc, today, currentFy: fyOf(today) };
}
