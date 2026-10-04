/**
 * ClientStore: the client files (client-process-spec 9), behind one interface.
 *
 *  - SupabaseClientStore when the site is wired to Supabase: the seven tables
 *    of migration 0014, owner-only RLS. Whole tables are read in pages of
 *    1,000 rows, as the outreach store does: PostgREST answers at most its row
 *    limit and says nothing about the rest, and a timeline cut at 1,000 lines
 *    would lose the "sent" lines that tick items. Before 0014 is run, ready()
 *    is false and every screen says "This needs the client update (0014)".
 *    Nothing of a client is ever kept in localStorage or sessionStorage in this
 *    mode (decision 17).
 *  - LocalClientStore otherwise (local dev, the e2e suite): one JSON object in
 *    localStorage["ideovent_clients_v1"], one write per operation, made only
 *    when the operation succeeded, applying the same rules as the SQL
 *    (./rules.ts). It acts as the CRM's local actor (localStorage
 *    "ideovent_crm_local_actor", as ../outreach/localTeam.ts reads it): anyone
 *    but the owner gets "Client files are Mehdi's." from every method.
 *
 * Nothing here sends anything to anyone.
 */
import { supabaseEnabled } from "@/lib/cms/config";
import { CrmAccessError, crmErrorText } from "@/lib/outreach/access";
import { HOURLY_RATE } from "@/lib/pricing";
import { newClientId } from "./numbering";
import {
  checkClientInsert,
  checkDocumentDelete,
  checkDocumentInsert,
  checkDocumentUpdate,
  checkEventInsert,
  checkPaymentInsert,
  checkPaymentUpdate,
  checkProjectInsert,
  checkSize,
  deleteProject as deleteProjectRule,
  issueDocument as issueRule,
  stampEvent,
  type Counter,
  type RulesState,
} from "./rules";
import type {
  ClientEventInput,
  ClientSettings,
  CrmClient,
  CrmClientEvent,
  CrmDocument,
  CrmPayment,
  CrmProject,
  DraftInput,
  OpenFileInput,
  PaymentInput,
} from "./types";

export const CLIENTS_LOCAL_KEY = "ideovent_clients_v1";
/** The same key the outreach local store acts as (../outreach/team.ts LOCAL_ACTOR_KEY). */
const LOCAL_ACTOR_KEY = "ideovent_crm_local_actor";

export const NOT_OWNER = "Client files are Mehdi's.";
export const NEEDS_0014 = "This needs the client update (0014).";
export const STALE = "Changed in another tab. Reload.";
export const GOOGLE_REVIEW_LINK = "https://g.page/r/CbQfQiU_imtBEBM/review";

/** Settings > Client process, before Mehdi fills anything (spec 6.3). */
export const DEFAULT_CLIENT_SETTINGS: ClientSettings = {
  billing: {},
  policy: { hourlyRate: HOURLY_RATE, restartFee: 4000 },
  deedNamesSignatory: false,
  printTemplateNote: true,
  googleReviewLink: GOOGLE_REVIEW_LINK,
  firstSerial: {},
  approvedWording: {},
};

export function mergeClientSettings(s?: Partial<ClientSettings> | null): ClientSettings {
  const x = s || {};
  return {
    ...DEFAULT_CLIENT_SETTINGS,
    ...x,
    billing: { ...DEFAULT_CLIENT_SETTINGS.billing, ...(x.billing || {}) },
    policy: { ...DEFAULT_CLIENT_SETTINGS.policy, ...(x.policy || {}) },
    firstSerial: { ...(x.firstSerial || {}) },
    approvedWording: { ...(x.approvedWording || {}) },
    googleReviewLink: (x.googleReviewLink || "").trim() || GOOGLE_REVIEW_LINK,
    printTemplateNote: x.printTemplateNote !== false,
    deedNamesSignatory: x.deedNamesSignatory === true,
  };
}

export interface ClientStore {
  readonly mode: "local" | "supabase";
  /** Supabase before 0014: false, and every screen says "This needs the client update (0014)". */
  ready(): Promise<boolean>;
  listClients(): Promise<CrmClient[]>;
  listProjects(): Promise<CrmProject[]>;
  listDocuments(): Promise<CrmDocument[]>;
  listPayments(): Promise<CrmPayment[]>;
  listEvents(projectId?: string): Promise<CrmClientEvent[]>;
  getSettings(): Promise<ClientSettings>;
  saveSettings(patch: Partial<ClientSettings>): Promise<ClientSettings>;
  /** Opens a client file from a lead: the client (or the lead's existing one) and its first project, in one call. */
  openFromLead(input: OpenFileInput): Promise<{ client: CrmClient; project: CrmProject }>;
  createClient(input: Partial<CrmClient> & { orgName: string }): Promise<CrmClient>;
  updateClient(id: string, patch: Partial<CrmClient>, expectedUpdatedAt: string): Promise<CrmClient>;
  createProject(input: Partial<CrmProject> & { clientId: string; name: string }): Promise<CrmProject>;
  updateProject(id: string, patch: Partial<CrmProject>, expectedUpdatedAt: string): Promise<CrmProject>;
  /** Drafts only (the guard). */
  deleteProject(id: string): Promise<void>;
  /** Insert (no id) or update a draft. */
  saveDraft(doc: DraftInput): Promise<CrmDocument>;
  deleteDraft(id: string): Promise<void>;
  /** crm_issue_document. */
  issueDocument(id: string): Promise<CrmDocument>;
  cancelDocument(id: string, reason: string): Promise<CrmDocument>;
  recordPayment(input: PaymentInput): Promise<CrmPayment>;
  voidPayment(id: string, reason: string): Promise<CrmPayment>;
  addEvent(input: ClientEventInput): Promise<CrmClientEvent>;
}

/* ── Shared: building records ───────────────────────────────────────────── */

const leadLanguage = (l?: string): CrmClient["language"] => (l === "en" ? "en" : l === "hinglish" || l === "hi" ? "hinglish" : undefined);

/** A new client from the lead it is opened from: name, kind, contacts, city, language (hi as hinglish), do-not-contact, Meta consent. */
export function clientFromLead(input: OpenFileInput, now: Date): Omit<CrmClient, "code"> {
  const l = input.lead;
  const iso = now.toISOString();
  return {
    id: newClientId("cl"),
    leadId: input.leadId,
    status: "active",
    createdAt: iso,
    updatedAt: iso,
    orgName: (l.instituteName || "").trim(),
    kind: l.kind,
    city: l.city || undefined,
    website: l.website || undefined,
    language: leadLanguage(l.language),
    inIndia: input.inIndia,
    contactName: l.contactName || undefined,
    phone: l.phone || undefined,
    whatsapp: l.whatsapp || undefined,
    email: l.email || undefined,
    dnc: l.status === "do_not_contact" || undefined,
    metaConsent: l.metaConsent || undefined,
    portfolioOptOut: null,
  };
}

export function newProject(input: Partial<CrmProject> & { clientId: string; name: string }, now: Date): Omit<CrmProject, "code"> {
  const iso = now.toISOString();
  return {
    id: newClientId("pr"),
    leadId: null,
    kind: "website",
    stage: "proposal",
    hold: null,
    outcome: null,
    fee: null,
    lines: [],
    dates: {},
    goLiveHistory: [],
    checklist: {},
    content: [],
    designStages: ["Design"],
    rounds: [],
    approvals: [],
    changeRequests: [],
    issues: [],
    access: [],
    deliverables: [],
    gateOverrides: [],
    engagement: "one_time",
    ...input,
    createdAt: iso,
    updatedAt: iso,
  };
}

function draftRow(input: DraftInput, now: Date, prev?: CrmDocument): CrmDocument {
  const iso = now.toISOString();
  return {
    id: input.id || newClientId("dc"),
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    kind: input.kind,
    milestone: input.milestone ?? null,
    status: "draft",
    series: null,
    fy: null,
    serial: null,
    number: null,
    issuedOn: null,
    dueOn: null,
    validUntil: null,
    amount: input.amount ?? null,
    paymentId: input.paymentId ?? null,
    relatedDoc: input.relatedDoc ?? null,
    data: input.data || {},
    issuedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: prev?.createdAt || iso,
    updatedAt: iso,
  };
}

const pad4 = (n: number) => String(n).padStart(4, "0");
/** A new updatedAt that is always later than the old one, so a stale copy is caught even within one millisecond. */
const later = (prev: string, now: Date) => new Date(Math.max(now.getTime(), (Date.parse(prev) || 0) + 1)).toISOString();
const byCreated = <T extends { createdAt: string }>(a: T, b: T) => (a.createdAt || "").localeCompare(b.createdAt || "");

/* ── Local implementation ────────────────────────────────────────────────── */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

interface LocalClientData extends RulesState {
  seq: { client: number; project: number; event: number };
}

function emptyData(): LocalClientData {
  return { clients: [], projects: [], documents: [], payments: [], events: [], settings: null, counters: [], seq: { client: 0, project: 0, event: 0 } };
}

function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

function defaultStorage(): StorageLike {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem(CLIENTS_LOCAL_KEY);
      return localStorage;
    }
  } catch {
    /* private window or blocked storage: memory */
  }
  return memoryStorage();
}

export interface LocalClientStoreOptions {
  /** Who is acting: the owner, or anyone else (refused). Default: the outreach local store's me(), owner when role === "owner". */
  whoIsActing?: () => Promise<"owner" | "other">;
  now?: () => Date;
}

/** Local mode's actor, as localTeam.ts reads it: missing or empty is Mehdi; his own row (m_owner) is Mehdi too. */
async function outreachActor(): Promise<"owner" | "other"> {
  const { getOutreachStore } = await import("@/lib/outreach/store");
  const me = await getOutreachStore().me();
  return me.role === "owner" ? "owner" : "other";
}

export class LocalClientStore implements ClientStore {
  readonly mode = "local" as const;
  private storage: StorageLike;
  private who: () => Promise<"owner" | "other">;
  private clock: () => Date;

  constructor(storage?: StorageLike, opts: LocalClientStoreOptions = {}) {
    this.storage = storage || defaultStorage();
    this.who = opts.whoIsActing || outreachActor;
    this.clock = opts.now || (() => new Date());
  }

  private read(): LocalClientData {
    try {
      const raw = this.storage.getItem(CLIENTS_LOCAL_KEY);
      const p = raw ? (JSON.parse(raw) as Partial<LocalClientData>) : {};
      const e = emptyData();
      return {
        clients: Array.isArray(p.clients) ? p.clients : e.clients,
        projects: Array.isArray(p.projects) ? p.projects : e.projects,
        documents: Array.isArray(p.documents) ? p.documents : e.documents,
        payments: Array.isArray(p.payments) ? p.payments : e.payments,
        events: Array.isArray(p.events) ? p.events : e.events,
        settings: p.settings || null,
        counters: Array.isArray(p.counters) ? (p.counters as Counter[]) : e.counters,
        seq: { ...e.seq, ...(p.seq || {}) },
      };
    } catch {
      return emptyData();
    }
  }

  private write(d: LocalClientData): void {
    this.storage.setItem(CLIENTS_LOCAL_KEY, JSON.stringify(d));
  }

  /** One operation over one read, as the owner only; saved once, and only when nothing threw. */
  private async run<T>(fn: (d: LocalClientData, now: Date) => T, write = true): Promise<T> {
    if ((await this.who()) !== "owner") throw new CrmAccessError("42501", NOT_OWNER);
    const d = this.read();
    const result = fn(d, this.clock());
    if (write) this.write(d);
    return result;
  }

  async ready() {
    return (await this.who()) === "owner";
  }

  async listClients() {
    return this.run((d) => [...d.clients].sort(byCreated), false);
  }

  async listProjects() {
    return this.run((d) => [...d.projects].sort(byCreated), false);
  }

  async listDocuments() {
    return this.run((d) => [...d.documents].sort(byCreated), false);
  }

  async listPayments() {
    return this.run((d) => [...d.payments].sort(byCreated), false);
  }

  async listEvents(projectId?: string) {
    return this.run((d) => d.events.filter((e) => !projectId || e.projectId === projectId).sort((a, b) => b.at.localeCompare(a.at) || Number(b.id) - Number(a.id)), false);
  }

  async getSettings() {
    return this.run((d) => mergeClientSettings(d.settings), false);
  }

  async saveSettings(patch: Partial<ClientSettings>) {
    return this.run((d) => {
      const cur = mergeClientSettings(d.settings);
      const next = mergeClientSettings({
        ...cur,
        ...patch,
        billing: { ...cur.billing, ...(patch.billing || {}) },
        policy: { ...cur.policy, ...(patch.policy || {}) },
        firstSerial: patch.firstSerial ? { ...cur.firstSerial, ...patch.firstSerial } : cur.firstSerial,
        approvedWording: patch.approvedWording ? { ...cur.approvedWording, ...patch.approvedWording } : cur.approvedWording,
      });
      checkSize("settings", next);
      d.settings = next;
      return next;
    });
  }

  private addClient(d: LocalClientData, c: Omit<CrmClient, "code">): CrmClient {
    const client = { ...c, code: `IDV-C-${pad4(d.seq.client + 1)}` } as CrmClient;
    checkClientInsert(d, client);
    d.seq.client += 1;
    d.clients.push(client);
    return client;
  }

  private addProject(d: LocalClientData, p: Omit<CrmProject, "code">): CrmProject {
    const project = { ...p, code: `IDV-PR-${pad4(d.seq.project + 1)}` } as CrmProject;
    checkProjectInsert(d, project);
    d.seq.project += 1;
    d.projects.push(project);
    return project;
  }

  async openFromLead(input: OpenFileInput) {
    return this.run((d, now) => {
      const client = d.clients.find((c) => c.leadId === input.leadId) || this.addClient(d, clientFromLead(input, now));
      const project = this.addProject(d, newProject({ ...input.project, clientId: client.id, leadId: input.leadId }, now));
      return { client, project };
    });
  }

  async createClient(input: Partial<CrmClient> & { orgName: string }) {
    return this.run((d, now) => {
      const iso = now.toISOString();
      return this.addClient(d, {
        kind: "other",
        inIndia: true,
        status: "active",
        portfolioOptOut: null,
        ...input,
        id: input.id || newClientId("cl"),
        leadId: input.leadId ?? null,
        createdAt: iso,
        updatedAt: iso,
      } as Omit<CrmClient, "code">);
    });
  }

  async updateClient(id: string, patch: Partial<CrmClient>, expectedUpdatedAt: string) {
    return this.run((d, now) => {
      const i = d.clients.findIndex((c) => c.id === id);
      if (i < 0) throw new CrmAccessError("P0002", "This client does not exist any more.");
      const cur = d.clients[i];
      if (cur.updatedAt !== expectedUpdatedAt) throw new CrmAccessError("40001", STALE);
      if (patch.leadId !== undefined && patch.leadId !== cur.leadId && patch.leadId && d.clients.some((c) => c.leadId === patch.leadId)) {
        throw new CrmAccessError("23505", "This lead already has a client file: opening it.");
      }
      const next: CrmClient = { ...cur, ...patch, id: cur.id, code: cur.code, createdAt: cur.createdAt, updatedAt: later(cur.updatedAt, now) };
      checkSize("client", next);
      d.clients[i] = next;
      return next;
    });
  }

  async createProject(input: Partial<CrmProject> & { clientId: string; name: string }) {
    return this.run((d, now) => this.addProject(d, newProject(input, now)));
  }

  async updateProject(id: string, patch: Partial<CrmProject>, expectedUpdatedAt: string) {
    return this.run((d, now) => {
      const i = d.projects.findIndex((p) => p.id === id);
      if (i < 0) throw new CrmAccessError("P0002", "This project does not exist any more.");
      const cur = d.projects[i];
      if (cur.updatedAt !== expectedUpdatedAt) throw new CrmAccessError("40001", STALE);
      const next: CrmProject = { ...cur, ...patch, id: cur.id, code: cur.code, clientId: cur.clientId, createdAt: cur.createdAt, updatedAt: later(cur.updatedAt, now) };
      checkSize("project", next);
      d.projects[i] = next;
      return next;
    });
  }

  async deleteProject(id: string) {
    await this.run((d) => deleteProjectRule(d, id));
  }

  async saveDraft(input: DraftInput) {
    return this.run((d, now) => {
      if (!input.id || !d.documents.some((x) => x.id === input.id)) {
        const row = draftRow(input, now);
        checkDocumentInsert(d, row);
        d.documents.push(row);
        return row;
      }
      const old = d.documents.find((x) => x.id === input.id)!;
      const next = checkDocumentUpdate(d, old, { ...old, ...draftRow(input, now, old), status: old.status === "draft" ? "draft" : old.status }, now);
      d.documents = d.documents.map((x) => (x.id === old.id ? next : x));
      return next;
    });
  }

  async deleteDraft(id: string) {
    await this.run((d) => {
      const old = d.documents.find((x) => x.id === id);
      if (!old) return;
      checkDocumentDelete(old);
      d.documents = d.documents.filter((x) => x.id !== id);
    });
  }

  async issueDocument(id: string) {
    return this.run((d, now) => issueRule(d, id, now));
  }

  async cancelDocument(id: string, reason: string) {
    return this.run((d, now) => {
      const old = d.documents.find((x) => x.id === id);
      if (!old) throw new CrmAccessError("P0002", "No such document.");
      const next = checkDocumentUpdate(d, old, { ...old, status: "cancelled", cancelReason: reason }, now);
      d.documents = d.documents.map((x) => (x.id === id ? next : x));
      return next;
    });
  }

  async recordPayment(input: PaymentInput) {
    return this.run((d, now) => {
      const p: CrmPayment = {
        id: newClientId("py"),
        clientId: input.clientId,
        projectId: input.projectId ?? null,
        againstDoc: input.againstDoc,
        receivedOn: input.receivedOn,
        amount: input.amount,
        tds: input.tds || 0,
        mode: input.mode,
        reference: input.reference ?? null,
        status: "recorded",
        voidReason: null,
        note: input.note ?? null,
        createdAt: now.toISOString(),
      };
      checkPaymentInsert(d, p);
      d.payments.push(p);
      return p;
    });
  }

  async voidPayment(id: string, reason: string) {
    return this.run((d) => {
      const old = d.payments.find((x) => x.id === id);
      if (!old) throw new CrmAccessError("P0002", "No such payment.");
      const next = checkPaymentUpdate(d, old, { ...old, status: "voided", voidReason: reason });
      d.payments = d.payments.map((x) => (x.id === id ? next : x));
      return next;
    });
  }

  async addEvent(input: ClientEventInput) {
    return this.run((d, now) => {
      checkEventInsert(d, input);
      d.seq.event += 1;
      const e = stampEvent(
        {
          id: String(d.seq.event),
          clientId: input.clientId,
          projectId: input.projectId ?? null,
          type: input.type,
          channel: input.channel ?? null,
          templateId: input.templateId ?? null,
          detail: input.detail ?? null,
          data: input.data || {},
        },
        now,
      );
      d.events.push(e);
      return e;
    });
  }
}

/* ── Supabase implementation ─────────────────────────────────────────────── */

const T = {
  settings: "crm_client_settings",
  clients: "crm_clients",
  projects: "crm_projects",
  documents: "crm_documents",
  payments: "crm_payments",
  events: "crm_client_events",
} as const;
const PAGE = 1000;

type Row = Record<string, unknown>;
type SbError = { code?: string; message?: string; details?: string } | null | undefined;

async function sb() {
  const { supabase } = await import("@/lib/cms/client");
  return supabase();
}

/** The table is not there: 0014 has not been run. */
export function missingTable(e: SbError): boolean {
  return e?.code === "PGRST205" || e?.code === "42P01" || /could not find the table|relation .* does not exist/i.test(e?.message || "");
}

/** A database refusal in the words a person reads; the unique indexes in plain words. */
export function clientFail(what: string, e: SbError): never {
  const msg = e?.message || "";
  if (e?.code === "23505") {
    if (/crm_clients_lead_idx/.test(msg + (e.details || ""))) throw new CrmAccessError("23505", "This lead already has a client file: opening it.");
    if (/crm_documents_one_receipt/.test(msg + (e.details || ""))) throw new CrmAccessError("23505", "This payment already has a receipt.");
  }
  if (missingTable(e)) throw new CrmAccessError("42P01", NEEDS_0014);
  if (e?.code && ["42501", "23514", "22023", "P0002", "23505", "23503", "22001"].includes(e.code)) {
    throw new CrmAccessError(e.code, crmErrorText(e));
  }
  throw new Error(`Clients: could not ${what}. ${msg}`.trim());
}

const omit = <T extends object>(o: T, keys: string[]): Row => {
  const out: Row = {};
  for (const [k, v] of Object.entries(o)) if (!keys.includes(k) && v !== undefined) out[k] = v;
  return out;
};

const CLIENT_COLS = ["id", "code", "leadId", "status", "createdAt", "updatedAt"];
export function clientFromRow(r: Row): CrmClient {
  const data = (r.data || {}) as Partial<CrmClient>;
  return {
    inIndia: true,
    kind: "other",
    orgName: "",
    ...data,
    id: String(r.id),
    code: String(r.code || ""),
    leadId: (r.lead_id as string) || null,
    status: (r.status as CrmClient["status"]) || "active",
    createdAt: String(r.created_at || ""),
    updatedAt: String(r.updated_at || ""),
  };
}
const clientData = (c: Partial<CrmClient>) => omit(c, CLIENT_COLS);

const PROJECT_COLS = ["id", "code", "clientId", "leadId", "kind", "stage", "hold", "outcome", "fee", "createdAt", "updatedAt", "closedAt"];
export function projectFromRow(r: Row): CrmProject {
  const data = (r.data || {}) as Partial<CrmProject>;
  return {
    name: "",
    lines: [],
    dates: {},
    goLiveHistory: [],
    checklist: {},
    content: [],
    designStages: ["Design"],
    rounds: [],
    approvals: [],
    changeRequests: [],
    issues: [],
    access: [],
    deliverables: [],
    gateOverrides: [],
    ...data,
    id: String(r.id),
    code: String(r.code || ""),
    clientId: String(r.client_id),
    leadId: (r.lead_id as string) || null,
    kind: (r.kind as CrmProject["kind"]) || "website",
    stage: (r.stage as CrmProject["stage"]) || "proposal",
    hold: (r.hold as CrmProject["hold"]) || null,
    outcome: (r.outcome as CrmProject["outcome"]) || null,
    fee: r.fee === null || r.fee === undefined ? null : Number(r.fee),
    createdAt: String(r.created_at || ""),
    updatedAt: String(r.updated_at || ""),
    closedAt: (r.closed_at as string) || undefined,
  };
}
const projectData = (p: Partial<CrmProject>) => omit(p, PROJECT_COLS);
function projectColumns(p: Partial<CrmProject>): Row {
  const out: Row = {};
  if (p.leadId !== undefined) out.lead_id = p.leadId;
  if (p.kind !== undefined) out.kind = p.kind;
  if (p.stage !== undefined) out.stage = p.stage;
  if (p.hold !== undefined) out.hold = p.hold;
  if (p.outcome !== undefined) out.outcome = p.outcome;
  if (p.fee !== undefined) out.fee = p.fee;
  if (p.closedAt !== undefined) out.closed_at = p.closedAt || null;
  return out;
}

export function docFromRow(r: Row): CrmDocument {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    projectId: (r.project_id as string) || null,
    kind: r.kind as CrmDocument["kind"],
    milestone: (r.milestone as CrmDocument["milestone"]) || null,
    status: r.status as CrmDocument["status"],
    series: (r.series as CrmDocument["series"]) || null,
    fy: (r.fy as string) || null,
    serial: r.serial === null || r.serial === undefined ? null : Number(r.serial),
    number: (r.number as string) || null,
    issuedOn: (r.issued_on as string) || null,
    dueOn: (r.due_on as string) || null,
    validUntil: (r.valid_until as string) || null,
    amount: r.amount === null || r.amount === undefined ? null : Number(r.amount),
    paymentId: (r.payment_id as string) || null,
    relatedDoc: (r.related_doc as string) || null,
    data: (r.data || {}) as CrmDocument["data"],
    issuedAt: (r.issued_at as string) || null,
    cancelledAt: (r.cancelled_at as string) || null,
    cancelReason: (r.cancel_reason as string) || null,
    createdAt: String(r.created_at || ""),
    updatedAt: String(r.updated_at || ""),
  };
}

export function paymentFromRow(r: Row): CrmPayment {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    projectId: (r.project_id as string) || null,
    againstDoc: String(r.against_doc),
    receivedOn: String(r.received_on),
    amount: Number(r.amount),
    tds: Number(r.tds || 0),
    mode: r.mode as CrmPayment["mode"],
    reference: (r.reference as string) || null,
    status: r.status as CrmPayment["status"],
    voidReason: (r.void_reason as string) || null,
    note: (r.note as string) || null,
    createdAt: String(r.created_at || ""),
  };
}

export function eventFromRow(r: Row): CrmClientEvent {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    projectId: (r.project_id as string) || null,
    at: String(r.at),
    type: r.type as CrmClientEvent["type"],
    channel: (r.channel as CrmClientEvent["channel"]) || null,
    templateId: (r.template_id as string) || null,
    detail: (r.detail as string) || null,
    data: (r.data || {}) as Record<string, unknown>,
  };
}

export class SupabaseClientStore implements ClientStore {
  readonly mode = "supabase" as const;

  /** Every row of a table, in pages of 1,000 (PostgREST caps a response silently). */
  private async pages(table: string, order: string, filter?: { col: string; val: string }): Promise<Row[]> {
    const client = await sb();
    const out: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = client.from(table).select("*").order(order, { ascending: order !== "at" }).order("id", { ascending: true });
      if (filter) q = q.eq(filter.col, filter.val);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) clientFail(`read ${table}`, error);
      const rows = (data || []) as Row[];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    return out;
  }

  async ready() {
    const { error } = await (await sb()).from(T.clients).select("id").limit(1);
    if (!error) return true;
    if (missingTable(error)) return false;
    clientFail("check the client tables", error);
  }

  async listClients() {
    return (await this.pages(T.clients, "created_at")).map(clientFromRow);
  }

  async listProjects() {
    return (await this.pages(T.projects, "created_at")).map(projectFromRow);
  }

  async listDocuments() {
    return (await this.pages(T.documents, "created_at")).map(docFromRow);
  }

  async listPayments() {
    return (await this.pages(T.payments, "created_at")).map(paymentFromRow);
  }

  async listEvents(projectId?: string) {
    return (await this.pages(T.events, "at", projectId ? { col: "project_id", val: projectId } : undefined)).map(eventFromRow);
  }

  async getSettings() {
    const { data, error } = await (await sb()).from(T.settings).select("data").eq("id", "default").maybeSingle();
    if (error) clientFail("read the client settings", error);
    return mergeClientSettings(((data as Row | null)?.data as Partial<ClientSettings>) || null);
  }

  async saveSettings(patch: Partial<ClientSettings>) {
    const cur = await this.getSettings();
    const next = mergeClientSettings({
      ...cur,
      ...patch,
      billing: { ...cur.billing, ...(patch.billing || {}) },
      policy: { ...cur.policy, ...(patch.policy || {}) },
      firstSerial: patch.firstSerial ? { ...cur.firstSerial, ...patch.firstSerial } : cur.firstSerial,
      approvedWording: patch.approvedWording ? { ...cur.approvedWording, ...patch.approvedWording } : cur.approvedWording,
    });
    checkSize("settings", next);
    const { error } = await (await sb()).from(T.settings).upsert({ id: "default", data: next, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) clientFail("save the client settings", error);
    return next;
  }

  private async insertClient(c: Omit<CrmClient, "code">): Promise<CrmClient> {
    const row: Row = { id: c.id, lead_id: c.leadId, status: c.status, data: clientData(c) };
    const { data, error } = await (await sb()).from(T.clients).insert(row).select("*").single();
    if (error) clientFail("add the client", error);
    return clientFromRow(data as Row);
  }

  private async insertProject(p: Omit<CrmProject, "code">): Promise<CrmProject> {
    const row: Row = { id: p.id, client_id: p.clientId, ...projectColumns(p), data: projectData(p) };
    const { data, error } = await (await sb()).from(T.projects).insert(row).select("*").single();
    if (error) clientFail("add the project", error);
    return projectFromRow(data as Row);
  }

  async openFromLead(input: OpenFileInput) {
    const client = await sb();
    const found = await client.from(T.clients).select("*").eq("lead_id", input.leadId).maybeSingle();
    if (found.error) clientFail("look for the lead's client", found.error);
    let c = found.data ? clientFromRow(found.data as Row) : null;
    if (!c) {
      try {
        c = await this.insertClient(clientFromLead(input, new Date()));
      } catch (e) {
        // Two presses, or another tab: the lead already has its client. Use it.
        const again = await client.from(T.clients).select("*").eq("lead_id", input.leadId).maybeSingle();
        if (again.data) c = clientFromRow(again.data as Row);
        else throw e;
      }
    }
    const project = await this.insertProject(newProject({ ...input.project, clientId: c.id, leadId: input.leadId }, new Date()));
    return { client: c, project };
  }

  async createClient(input: Partial<CrmClient> & { orgName: string }) {
    const iso = new Date().toISOString();
    return this.insertClient({ kind: "other", inIndia: true, status: "active", portfolioOptOut: null, ...input, id: input.id || newClientId("cl"), leadId: input.leadId ?? null, createdAt: iso, updatedAt: iso } as Omit<CrmClient, "code">);
  }

  async updateClient(id: string, patch: Partial<CrmClient>, expectedUpdatedAt: string) {
    const client = await sb();
    const cur = await client.from(T.clients).select("*").eq("id", id).maybeSingle();
    if (cur.error) clientFail("read the client", cur.error);
    if (!cur.data) throw new CrmAccessError("P0002", "This client does not exist any more.");
    const was = clientFromRow(cur.data as Row);
    if (was.updatedAt !== expectedUpdatedAt) throw new CrmAccessError("40001", STALE);
    const next = { ...was, ...patch };
    checkSize("client", next);
    const row: Row = { data: clientData(next) };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.leadId !== undefined) row.lead_id = patch.leadId;
    const { data, error } = await client.from(T.clients).update(row).eq("id", id).eq("updated_at", expectedUpdatedAt).select("*");
    if (error) clientFail("save the client", error);
    const rows = (data || []) as Row[];
    if (!rows.length) throw new CrmAccessError("40001", STALE);
    return clientFromRow(rows[0]);
  }

  async createProject(input: Partial<CrmProject> & { clientId: string; name: string }) {
    return this.insertProject(newProject(input, new Date()));
  }

  async updateProject(id: string, patch: Partial<CrmProject>, expectedUpdatedAt: string) {
    const client = await sb();
    const cur = await client.from(T.projects).select("*").eq("id", id).maybeSingle();
    if (cur.error) clientFail("read the project", cur.error);
    if (!cur.data) throw new CrmAccessError("P0002", "This project does not exist any more.");
    const was = projectFromRow(cur.data as Row);
    if (was.updatedAt !== expectedUpdatedAt) throw new CrmAccessError("40001", STALE);
    const next = { ...was, ...patch };
    checkSize("project", next);
    const row: Row = { ...projectColumns(patch), data: projectData(next) };
    const { data, error } = await client.from(T.projects).update(row).eq("id", id).eq("updated_at", expectedUpdatedAt).select("*");
    if (error) clientFail("save the project", error);
    const rows = (data || []) as Row[];
    if (!rows.length) throw new CrmAccessError("40001", STALE);
    return projectFromRow(rows[0]);
  }

  async deleteProject(id: string) {
    const { error } = await (await sb()).from(T.projects).delete().eq("id", id);
    if (error) clientFail("delete the project", error);
  }

  async saveDraft(input: DraftInput) {
    const client = await sb();
    checkSize("document", input.data || {});
    const cols: Row = {
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      kind: input.kind,
      milestone: input.milestone ?? null,
      amount: input.amount ?? null,
      payment_id: input.paymentId ?? null,
      related_doc: input.relatedDoc ?? null,
      data: input.data || {},
    };
    if (input.id) {
      const { data, error } = await client.from(T.documents).update({ ...cols, updated_at: new Date().toISOString() }).eq("id", input.id).select("*");
      if (error) clientFail("save the draft", error);
      const rows = (data || []) as Row[];
      if (rows.length) return docFromRow(rows[0]);
    }
    const { data, error } = await client.from(T.documents).insert({ id: input.id || newClientId("dc"), ...cols }).select("*").single();
    if (error) clientFail("save the draft", error);
    return docFromRow(data as Row);
  }

  async deleteDraft(id: string) {
    const { error } = await (await sb()).from(T.documents).delete().eq("id", id).eq("status", "draft");
    if (error) clientFail("delete the draft", error);
  }

  async issueDocument(id: string) {
    const { data, error } = await (await sb()).rpc("crm_issue_document", { p_id: id });
    if (error) clientFail("issue the document", error);
    return docFromRow(data as Row);
  }

  async cancelDocument(id: string, reason: string) {
    const { data, error } = await (await sb()).from(T.documents).update({ status: "cancelled", cancel_reason: reason }).eq("id", id).select("*").single();
    if (error) clientFail("cancel the document", error);
    return docFromRow(data as Row);
  }

  async recordPayment(input: PaymentInput) {
    const row: Row = {
      id: newClientId("py"),
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      against_doc: input.againstDoc,
      received_on: input.receivedOn,
      amount: input.amount,
      tds: input.tds || 0,
      mode: input.mode,
      reference: input.reference ?? null,
      note: input.note ?? null,
    };
    const { data, error } = await (await sb()).from(T.payments).insert(row).select("*").single();
    if (error) clientFail("record the payment", error);
    return paymentFromRow(data as Row);
  }

  async voidPayment(id: string, reason: string) {
    const { data, error } = await (await sb()).from(T.payments).update({ status: "voided", void_reason: reason }).eq("id", id).select("*").single();
    if (error) clientFail("void the payment", error);
    return paymentFromRow(data as Row);
  }

  async addEvent(input: ClientEventInput) {
    checkSize("event", input.data || {});
    checkSize("detail", input.detail || "");
    const row: Row = {
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      type: input.type,
      channel: input.channel ?? null,
      template_id: input.templateId ?? null,
      detail: input.detail ?? null,
      data: input.data || {},
    };
    const { data, error } = await (await sb()).from(T.events).insert(row).select("*").single();
    if (error) clientFail("write the timeline line", error);
    return eventFromRow(data as Row);
  }
}

/* ── The store the app uses ──────────────────────────────────────────────── */

let _store: ClientStore | null = null;

export function getClientStore(): ClientStore {
  if (!_store) _store = supabaseEnabled ? new SupabaseClientStore() : new LocalClientStore();
  return _store;
}

/** Tests only: swap the store. */
export function setClientStoreForTests(s: ClientStore | null): void {
  _store = s;
}

/** The local actor key (tests read it). */
export const CLIENTS_ACTOR_KEY = LOCAL_ACTOR_KEY;
