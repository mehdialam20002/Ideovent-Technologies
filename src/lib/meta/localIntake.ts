/**
 * META LEAD ADS IN LOCAL MODE (meta-leads-spec 6.5).
 *
 * Local mode has no webhook and no database, so this stands in for 0012's
 * intake tables in the browser: the registry of every Meta lead id seen
 * (meta_leads), the log (meta_ingest_log) and the settings (meta_settings),
 * one JSON object under localStorage["ideovent_meta_local_v1"]:
 *
 *   { leads: { "<Meta lead id>": { status, leadId, at } }, log: [...], settings: { assignMode, dailyCap }, seq }
 *
 * simulate(fixture) is the Meta page's "Simulate a Meta lead" and the e2e
 * suites' webhook: fields.js mapMetaLead (the webhook's own mapping), then the
 * registry (a lead id seen before is done, even after its CRM lead was
 * deleted: erasure stays), then the daily cap, then the local store's
 * simulateMetaLead (LocalCrm.ingestMeta: 0012's steps 5 to 12), then the
 * registry and the log. Ids only in the log, never a name, number or answer.
 *
 * Every read and write is in try/catch: a private window or blocked storage
 * reads as an empty registry and the page still renders.
 */
import { mapMetaLead, platformLabel, type MetaLeadInput } from "./fields";
import { getOutreachStore, type OutreachStore, type StorageLike } from "../outreach/store";
import { crmErrorText, istDay } from "../outreach/access";
import type { MetaAssignMode, MetaIngestResult } from "../outreach/localTeam";
import type { MetaLogLine } from "./client";

export const META_LOCAL_KEY = "ideovent_meta_local_v1";
/** Decided in the spec (12.3), changeable on the Meta page. */
export const META_DEFAULT_SETTINGS: Readonly<MetaLocalSettings> = Object.freeze({ assignMode: "pool", dailyCap: 300 });
const LOG_KEEP = 200;

export interface MetaLocalSettings {
  assignMode: MetaAssignMode;
  dailyCap: number;
}

export interface MetaLocalEntry {
  status: "created" | "duplicate" | "gone";
  /** The CRM lead it made or joined (it may have been deleted since). */
  leadId?: string | null;
  at: string;
}

export interface MetaLocalRegistry {
  leads: Record<string, MetaLocalEntry>;
  log: MetaLogLine[];
  settings: MetaLocalSettings;
  seq: number;
}

export interface SimulateOutcome {
  result: MetaIngestResult["result"] | "refused";
  leadId?: string | null;
  assignedTo?: string | null;
  /** A duplicate past the day's limit: logged only. */
  quiet?: boolean;
  /** Why it was refused (not local mode, not Mehdi, no lead id). */
  message?: string;
}

const MODES: readonly MetaAssignMode[] = ["pool", "owner", "rules"];

function storageOf(s?: StorageLike | null): StorageLike | null {
  if (s) return s;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function cleanSettings(v: unknown): MetaLocalSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<MetaLocalSettings>;
  const cap = Math.floor(Number(o.dailyCap));
  return {
    assignMode: MODES.includes(o.assignMode as MetaAssignMode) ? (o.assignMode as MetaAssignMode) : META_DEFAULT_SETTINGS.assignMode,
    dailyCap: cap >= 1 && cap <= 5000 ? cap : META_DEFAULT_SETTINGS.dailyCap,
  };
}

/** The registry as stored, or an empty one. */
export function readLocal(storage?: StorageLike | null): MetaLocalRegistry {
  const empty: MetaLocalRegistry = { leads: {}, log: [], settings: { ...META_DEFAULT_SETTINGS }, seq: 1 };
  try {
    const raw = storageOf(storage)?.getItem(META_LOCAL_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<MetaLocalRegistry>) : null;
    if (!p || typeof p !== "object") return empty;
    const leads = p.leads && typeof p.leads === "object" && !Array.isArray(p.leads) ? p.leads : {};
    const log = Array.isArray(p.log) ? p.log.filter((l) => l && typeof l === "object" && typeof l.event === "string") : [];
    return { leads, log, settings: cleanSettings(p.settings), seq: Number(p.seq) > 0 ? Number(p.seq) : log.length + 1 };
  } catch {
    return empty;
  }
}

function writeLocal(reg: MetaLocalRegistry, storage?: StorageLike | null): void {
  try {
    storageOf(storage)?.setItem(META_LOCAL_KEY, JSON.stringify(reg));
  } catch {
    /* blocked storage: the registry lives for this page only */
  }
}

function addLog(reg: MetaLocalRegistry, line: Omit<MetaLogLine, "id">): void {
  reg.log.push({ ...line, id: reg.seq++ });
  if (reg.log.length > LOG_KEEP) reg.log.splice(0, reg.log.length - LOG_KEEP);
}

/** Where new Meta leads go, and the daily limit, in this browser. */
export function localSettings(storage?: StorageLike | null): MetaLocalSettings {
  return readLocal(storage).settings;
}

/** Saves them (meta_set_settings, locally): null keeps a value; a mode or limit out of range is refused. */
export function saveLocalSettings(mode: MetaAssignMode | null, cap: number | null, storage?: StorageLike | null, now = new Date()): MetaLocalSettings {
  if (mode !== null && !MODES.includes(mode)) throw new Error("meta: assign mode is pool, owner or rules");
  if (cap !== null && !(Number.isInteger(cap) && cap >= 1 && cap <= 5000)) throw new Error("meta: the daily limit is a whole number from 1 to 5000");
  const reg = readLocal(storage);
  reg.settings = { assignMode: mode ?? reg.settings.assignMode, dailyCap: cap ?? reg.settings.dailyCap };
  addLog(reg, { at: now.toISOString(), channel: "owner", event: "settings", detail: `New leads: ${reg.settings.assignMode}; at most ${reg.settings.dailyCap} a day` });
  writeLocal(reg, storage);
  return reg.settings;
}

/** The last lines of the local log, newest first. */
export function localLog(limit = 100, storage?: StorageLike | null): MetaLogLine[] {
  return readLocal(storage).log.slice().reverse().slice(0, limit);
}

/** How many Meta leads this browser took in: today (India time), the last 7 days, and in all. */
export function localCounts(storage?: StorageLike | null, now = new Date()): { today: number; week: number; total: number; lastAt: string | null } {
  const entries = Object.values(readLocal(storage).leads).filter((e) => e && typeof e.at === "string");
  const today = istDay(now);
  const weekAgo = now.getTime() - 7 * 864e5;
  const lastAt = entries.map((e) => e.at).sort().pop() || null;
  return {
    today: entries.filter((e) => istDay(e.at) === today).length,
    week: entries.filter((e) => Date.parse(e.at) >= weekAgo).length,
    total: entries.length,
    lastAt,
  };
}

/**
 * One Meta lead into the local CRM, the way the webhook brings one into the
 * live CRM: Meta's lead (Graph's snake_case or camelCase, as fields.js reads
 * it) in, created / duplicate / already / over_cap out. `store` and `storage`
 * default to the app's own (tests pass in-memory ones).
 */
export async function simulate(
  fixture: MetaLeadInput,
  opts: { store?: OutreachStore; storage?: StorageLike | null; now?: Date } = {},
): Promise<SimulateOutcome> {
  const store = opts.store || getOutreachStore();
  if (store.mode !== "local" || typeof store.simulateMetaLead !== "function") {
    return { result: "refused", message: "Simulate works in local mode only. On the live CRM, send a lead from Meta's Lead Ads Testing Tool." };
  }
  const now = opts.now || new Date();
  const at = now.toISOString();
  const { leadgenId, lead } = mapMetaLead(fixture);
  if (!leadgenId) return { result: "refused", message: "A Meta lead id is needed: digits only." };
  const reg = readLocal(opts.storage);
  const ids = { leadgenId, formId: lead.metaFormId, adId: lead.metaAdId };
  // A Meta lead id seen before is done for good, even after its CRM lead was deleted (meta_leads, decision 5).
  const seen = reg.leads[leadgenId];
  if (seen) {
    const still = seen.leadId ? await store.getLead(seen.leadId).catch(() => null) : null;
    addLog(reg, { at, channel: "webhook", event: "already", ...ids, crmLeadId: still?.id, detail: still ? "Already in the CRM" : "Already taken in; its CRM lead was deleted" });
    writeLocal(reg, opts.storage);
    return { result: "already", leadId: still?.id ?? null, assignedTo: still?.assigneeId ?? null };
  }
  // The daily cap delays, never drops: a lead over it is not stored (the live webhook answers 503 and Meta sends it again).
  const today = istDay(now);
  if (Object.values(reg.leads).filter((e) => e && istDay(e.at) === today).length >= reg.settings.dailyCap) {
    if (!reg.log.some((l) => l.event === "over_cap" && istDay(l.at) === today)) {
      addLog(reg, { at, channel: "webhook", event: "over_cap", detail: `Today's limit of ${reg.settings.dailyCap} new Meta leads is reached` });
      writeLocal(reg, opts.storage);
    }
    return { result: "over_cap", leadId: null, assignedTo: null };
  }
  let res: MetaIngestResult;
  try {
    res = await store.simulateMetaLead(leadgenId, lead as unknown as Record<string, unknown>, { assignMode: reg.settings.assignMode });
  } catch (e) {
    return { result: "refused", message: crmErrorText(e) || "The lead was not added." };
  }
  const where = platformLabel(lead.metaPlatform || "");
  reg.leads[leadgenId] = { status: res.result === "duplicate" ? "duplicate" : "created", leadId: res.leadId, at };
  const detail =
    res.result === "created" ? `Simulated ${where} lead, ${res.assignedTo ? "assigned" : "in the Unassigned pool"}`
    : res.result === "duplicate" ? (res.quiet ? "quiet: more than 3 today" : "Same phone or e-mail as a lead in the CRM")
    : "Already in the CRM";
  addLog(reg, { at, channel: "webhook", event: res.result, ...ids, crmLeadId: res.leadId || undefined, detail });
  writeLocal(reg, opts.storage);
  return { ...res };
}
