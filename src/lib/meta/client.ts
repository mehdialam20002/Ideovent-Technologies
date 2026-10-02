/**
 * CRM > Settings > Meta Lead Ads: what the page reads and asks (meta-leads-spec 6.1).
 *
 *   loadStatus()       GET  /api/meta/connect   which Vercel values are set, and
 *                      0012's meta_intake_status as the owner (no Graph call)
 *   connect()          POST /api/meta/connect   Connect / Check again
 *   fetchNow()         POST /api/meta/catchup   "Fetch missed leads now"
 *   loadLog(limit)     public.meta_ingest_log, as the owner (RLS: is_admin)
 *   loadWaiting()      public.meta_leads that are pending or failed, as the owner
 *   saveSettings(...)  rpc meta_set_settings, as the owner
 *
 * NO SECRET PASSES THROUGH THE BROWSER. The functions read META_* values that
 * Mehdi sets in Vercel himself, and answer only yes/no, names, dates, counts
 * and permission names. The owner's own Supabase session goes as the Bearer,
 * as on /admin/payments (src/lib/payments/admin.ts). The log and the waiting
 * list hold Meta ids and outcomes only, never a name, number or answer.
 *
 * LOCAL MODE never calls any of this: every function answers { kind: "local" }
 * and the page reads src/lib/meta/localIntake.ts instead. Every function
 * answers { kind: "ok" | "missing" | "local" | "error" } and never throws.
 * The Supabase SDK loads lazily, so the Settings card does not pull it in.
 */
import { supabaseEnabled } from "@/lib/cms/config";
import type { MetaAssignMode } from "../outreach/localTeam";

export type { MetaAssignMode };

/** Every Vercel value the intake reads (spec 4.1), in the order the checklist shows them. */
export const META_ENV_NAMES = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_VERIFY_TOKEN",
  "META_PAGE_ID",
  "META_ACCESS_TOKEN",
  "CRON_SECRET",
  "META_GRAPH_VERSION",
  "META_RELAY_SECRET",
] as const;
export type MetaEnvName = (typeof META_ENV_NAMES)[number];
/** The two only the Make fallback or a later Graph version need. */
export const META_ENV_OPTIONAL: readonly MetaEnvName[] = ["META_GRAPH_VERSION", "META_RELAY_SECRET"];
/** Set, not set, or set but shorter than its minimum (the server treats that as not set). */
export type EnvState = "set" | "unset" | "short";

export interface MetaTokenInfo {
  set: boolean;
  valid: boolean | null;
  type?: string;
  /** null: never expires (or not known). */
  expiresAt: string | null;
  scopes: string[];
  /** Required permissions the token lacks. */
  missing: string[];
  /** Powerful permissions it has that nothing here uses (a leaked token should reach as little as possible). */
  extra: string[];
  appMatches: boolean | null;
  checkedAt?: string;
  /** Why the last check failed, as the server classified it ("Graph 190/463 OAuthException"): never a token. */
  error?: string;
}

export interface MetaPageInfo {
  id?: string;
  name?: string;
  /** Subscribed to leadgen (null: not checked yet). */
  subscribed: boolean | null;
}

export interface MetaCounts {
  today: number;
  week: number;
  duplicatesWeek: number;
  duplicatesQuiet: number;
  pending: number;
  failedToken: number;
  failedPermission: number;
  failedOther: number;
  testLeadsSeen: number;
}

/** 0012's meta_intake_status, read defensively (any field may be missing). */
export interface MetaIntakeStatus {
  connected: boolean;
  /** The stored fingerprint is the one today's App Secret gives (false: the secret changed, press Connect). */
  current: boolean;
  relayConnected: boolean;
  relayCurrent: boolean;
  connectedAt: string | null;
  connectedBy: string | null;
  pageId: string | null;
  pageName: string | null;
  token: MetaTokenInfo;
  page: MetaPageInfo;
  forms: { id: string; name: string; status: string }[];
  assignMode: MetaAssignMode;
  dailyCap: number;
  lastVerifiedAt: string | null;
  lastTestAt: string | null;
  lastReceivedAt: string | null;
  lastLeadAt: string | null;
  lastLeadId: string | null;
  lastCatchupAt: string | null;
  lastPollUntil: string | null;
  alerts: { access: string | null; cap: string | null; page: string | null };
  overCapToday: number;
  counts: MetaCounts;
}

export type MetaStatusResult =
  | { kind: "local" }
  /** 0012 is not run (or 0011 not either): the checklist still shows. */
  | { kind: "missing"; env: Record<MetaEnvName, EnvState>; needs0011: boolean }
  /** noApi: the Vite dev server answered (the functions run on Vercel only). */
  | { kind: "error"; message: string; noApi?: boolean }
  | { kind: "ok"; env: Record<MetaEnvName, EnvState>; pageMatches: boolean | null; status: MetaIntakeStatus };

export interface MetaLogLine {
  id: number;
  at: string;
  channel: string;
  /** verified, received, other_page, created, duplicate, already, failed, gone, over_cap, connected, catchup, settings. */
  event: string;
  leadgenId?: string;
  formId?: string;
  adId?: string;
  crmLeadId?: string;
  detail?: string;
}

export interface MetaWaitingRow {
  leadgenId: string;
  status: "pending" | "failed";
  errorKind?: string;
  lastError?: string;
  attempts: number;
  receivedAt: string;
}

export type Loaded<T> = { kind: "ok"; rows: T[] } | { kind: "missing" } | { kind: "local" } | { kind: "error"; message: string };

/* ── Reading answers defensively ─────────────────────────────────────────── */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : null);
const int = (v: unknown): number => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
const flag = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const words = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** envPresence(): { NAME: true | false }, and `tooShort`: the names set to a value under their minimum (counted as not set). */
export function readEnv(v: unknown, tooShort?: unknown): Record<MetaEnvName, EnvState> {
  const o = obj(v) || {};
  const short = new Set(words(tooShort));
  const out = {} as Record<MetaEnvName, EnvState>;
  for (const n of META_ENV_NAMES) {
    const x = o[n];
    out[n] = short.has(n) || x === "short" ? "short" : x === true || x === "set" ? "set" : "unset";
  }
  return out;
}

export function readToken(v: unknown): MetaTokenInfo {
  const o = obj(v) || {};
  return {
    set: o.set === true || o.valid === true,
    valid: flag(o.valid),
    type: text(o.type) || undefined,
    expiresAt: text(o.expiresAt),
    scopes: words(o.scopes),
    missing: words(o.missing),
    extra: words(o.extra),
    appMatches: flag(o.appMatches),
    checkedAt: text(o.checkedAt) || undefined,
    error: (text(o.error) || text(o.pageError) || "").slice(0, 300) || undefined,
  };
}

/** meta_intake_status's answer. The token and Page checks are what Connect stored (tokenInfo), flat or as { token, page }. */
export function readStatus(v: unknown): MetaIntakeStatus {
  const o = obj(v) || {};
  const info = obj(o.tokenInfo) || {};
  const pageInfo = obj(info.page) || {};
  const counts = obj(o.counts) || {};
  const alerts = obj(o.alerts) || {};
  const forms = (Array.isArray(o.forms) ? o.forms : []).map(obj).filter((f): f is Obj => Boolean(f));
  return {
    connected: o.connected === true,
    current: o.current === true,
    relayConnected: o.relayConnected === true,
    relayCurrent: o.relayCurrent === true,
    connectedAt: text(o.connectedAt),
    connectedBy: text(o.connectedBy),
    pageId: text(o.pageId),
    pageName: text(o.pageName),
    token: readToken(obj(info.token) || info),
    page: {
      id: text(pageInfo.id) || text(o.pageId) || undefined,
      name: text(pageInfo.name) || text(o.pageName) || undefined,
      subscribed: flag(pageInfo.subscribed) ?? flag(info.subscribed),
    },
    forms: forms.map((f) => ({ id: text(f.id) || "", name: text(f.name) || "", status: text(f.status) || "" })),
    assignMode: o.assignMode === "owner" || o.assignMode === "rules" ? o.assignMode : "pool",
    dailyCap: int(o.dailyCap) || 300,
    lastVerifiedAt: text(o.lastVerifiedAt),
    lastTestAt: text(o.lastTestAt),
    lastReceivedAt: text(o.lastReceivedAt),
    lastLeadAt: text(o.lastLeadAt),
    lastLeadId: text(o.lastLeadId),
    lastCatchupAt: text(o.lastCatchupAt),
    lastPollUntil: text(o.lastPollUntil),
    alerts: { access: text(alerts.access), cap: text(alerts.cap), page: text(alerts.page) },
    overCapToday: int(o.overCapToday),
    counts: {
      today: int(counts.today),
      week: int(counts.week),
      duplicatesWeek: int(counts.duplicatesWeek),
      duplicatesQuiet: int(counts.duplicatesQuiet),
      pending: int(counts.pending),
      failedToken: int(counts.failedToken),
      failedPermission: int(counts.failedPermission),
      failedOther: int(counts.failedOther),
      testLeadsSeen: int(counts.testLeadsSeen),
    },
  };
}

/* ── Calls ───────────────────────────────────────────────────────────────── */

export const NO_API_TEXT = "The Meta functions run on Vercel, not in the local dev server.";

/** PostgREST's "no such table / function": 0012 has not been run yet. */
const isMissing = (e: { code?: string; message?: string } | null) =>
  !!e && (/PGRST20[25]|42P01|42883/.test(e.code || "") || /could not find|does not exist/i.test(e.message || ""));

async function sb() {
  const { supabase } = await import("@/lib/cms/client");
  return supabase();
}

async function sessionToken(): Promise<string | null> {
  try {
    const { data } = await (await sb()).auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

type Answer = { status: number; body: Obj } | { error: string; noApi?: boolean };

async function call(path: string, method: "GET" | "POST"): Promise<Answer> {
  const token = await sessionToken();
  if (!token) return { error: "You are signed out. Sign in again." };
  try {
    const res = await fetch(path, {
      method,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
    if (!(res.headers.get("content-type") || "").includes("application/json")) return { error: NO_API_TEXT, noApi: true };
    return { status: res.status, body: obj(await res.json().catch(() => null)) || {} };
  } catch {
    return { error: "Could not reach the server. Check the connection and try again." };
  }
}

function refusal(a: { status: number; body: Obj }): string {
  if (a.status === 401) return "You are signed out. Sign in again.";
  if (a.status === 403) return "Only Mehdi's login can do this.";
  return text(a.body.error) || `The server answered ${a.status}.`;
}

/** Is everything connected? Cheap: the server makes no call to Meta for this. */
export async function loadStatus(): Promise<MetaStatusResult> {
  if (!supabaseEnabled) return { kind: "local" };
  const a = await call("/api/meta/connect", "GET");
  if ("error" in a) return { kind: "error", message: a.error, noApi: a.noApi };
  const env = readEnv(a.body.env, a.body.tooShort);
  const db = obj(a.body.db);
  if (db?.needs0011 === true) return { kind: "missing", env, needs0011: true };
  if (db?.missing === true || a.body.missing === true) return { kind: "missing", env, needs0011: false };
  if (a.status >= 300 || a.body.ok !== true || !db) return { kind: "error", message: refusal(a) };
  return { kind: "ok", env, pageMatches: flag(a.body.pageMatches), status: readStatus(db) };
}

export type MetaAction = { kind: "ok"; text: string } | { kind: "local" } | { kind: "missing" } | { kind: "error"; message: string; noApi?: boolean };

/** Connect, and Check again: the server stores its fingerprints, checks the token and subscribes the Page. */
export async function connect(): Promise<MetaAction> {
  if (!supabaseEnabled) return { kind: "local" };
  const a = await call("/api/meta/connect", "POST");
  if ("error" in a) return { kind: "error", message: a.error, noApi: a.noApi };
  if (a.body.missing === true || obj(a.body.db)?.missing === true) return { kind: "missing" };
  const names = words(a.body.missing);
  if (names.length) return { kind: "error", message: `Set ${names.join(", ")} in Vercel first, then Redeploy and press Connect again.` };
  if (a.status >= 300 || a.body.ok !== true) return { kind: "error", message: refusal(a) };
  return { kind: "ok", text: "Connected. The checks below are up to date." };
}

/** "14:05" India time. */
function istTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t + 330 * 60000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** "Fetch missed leads now": retries what waits and reads each form for leads the webhook never brought. */
export async function fetchNow(): Promise<MetaAction> {
  if (!supabaseEnabled) return { kind: "local" };
  const a = await call("/api/meta/catchup", "POST");
  if ("error" in a) return { kind: "error", message: a.error, noApi: a.noApi };
  const b = a.body;
  if (a.status === 429) {
    const at = text(b.nextAt);
    return { kind: "error", message: `Pressed a moment ago. Try again${at && istTime(at) ? ` after ${istTime(at)}` : " in a minute"}.` };
  }
  if (a.status === 409) return { kind: "error", message: "The Page id in Vercel is not the Page you connected: press Connect." };
  /* 503: 0012's token check said no (the App Secret changed since Connect), or Supabase did not answer. */
  if (a.status === 503 && /database refused/i.test(text(b.error) || "")) {
    return { kind: "error", message: "The database refused the run: if the App Secret changed in Vercel, press Connect again; otherwise try again in a minute." };
  }
  const why = text(b.skipped);
  if (why) {
    const said = /0012/.test(why) ? "0012 is not run yet" : /connect/i.test(why) ? "press Connect first" : "the Meta values are not set in Vercel yet";
    return { kind: "ok", text: `Nothing fetched: ${said}.` };
  }
  if (a.status >= 300 || b.ok !== true) return { kind: "error", message: refusal(a) };
  const f = obj(b.failed);
  const failed = f ? Object.values(f).reduce<number>((n, v) => n + int(v), 0) : int(b.failed);
  /* Incomplete: no working token, a Page or Graph fault, today's limit, or more than one run can read. The lines above say which. */
  const more = b.complete === false ? " Not every form could be read to the end: fix any amber line above first, then press again in a minute." : "";
  return { kind: "ok", text: `Done: ${int(b.created)} new, ${int(b.duplicates)} already in the CRM${failed ? `, ${failed} still waiting` : ""}.${more}` };
}

/** The intake's log, newest first: Meta ids and outcomes only. */
export async function loadLog(limit = 100): Promise<Loaded<MetaLogLine>> {
  if (!supabaseEnabled) return { kind: "local" };
  try {
    const { data, error } = await (await sb())
      .from("meta_ingest_log")
      .select("id,at,channel,event,leadgen_id,form_id,ad_id,crm_lead_id,detail")
      .order("at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (error) return isMissing(error) ? { kind: "missing" } : { kind: "error", message: error.message };
    const rows = ((data || []) as Obj[]).map((r) => ({
      id: int(r.id),
      at: text(r.at) || "",
      channel: text(r.channel) || "",
      event: text(r.event) || "",
      leadgenId: text(r.leadgen_id) || undefined,
      formId: text(r.form_id) || undefined,
      adId: text(r.ad_id) || undefined,
      crmLeadId: text(r.crm_lead_id) || undefined,
      detail: text(r.detail) || undefined,
    }));
    return { kind: "ok", rows };
  } catch (e) {
    return { kind: "error", message: (e as Error).message || "The log did not load." };
  }
}

/** Meta leads stored but not in the CRM yet (pending, or failed for a reason a person can fix). */
export async function loadWaiting(): Promise<Loaded<MetaWaitingRow>> {
  if (!supabaseEnabled) return { kind: "local" };
  try {
    const { data, error } = await (await sb())
      .from("meta_leads")
      .select("leadgen_id,status,error_kind,last_error,attempts,received_at")
      .in("status", ["pending", "failed"])
      .order("received_at", { ascending: true })
      .limit(100);
    if (error) return isMissing(error) ? { kind: "missing" } : { kind: "error", message: error.message };
    const rows = ((data || []) as Obj[]).map((r) => ({
      leadgenId: text(r.leadgen_id) || "",
      status: (r.status === "failed" ? "failed" : "pending") as MetaWaitingRow["status"],
      errorKind: text(r.error_kind) || undefined,
      lastError: text(r.last_error) || undefined,
      attempts: int(r.attempts),
      receivedAt: text(r.received_at) || "",
    }));
    return { kind: "ok", rows };
  } catch (e) {
    return { kind: "error", message: (e as Error).message || "The waiting list did not load." };
  }
}

export type SavedSettings = { kind: "ok"; assignMode: MetaAssignMode; dailyCap: number } | { kind: "local" } | { kind: "missing" } | { kind: "error"; message: string };

/** Where new Meta leads go, and the daily limit (null keeps a value). The database checks both. */
export async function saveSettings(mode: MetaAssignMode | null, cap: number | null): Promise<SavedSettings> {
  if (!supabaseEnabled) return { kind: "local" };
  try {
    const { data, error } = await (await sb()).rpc("meta_set_settings", { p_assign_mode: mode, p_daily_cap: cap });
    if (error) {
      if (isMissing(error)) return { kind: "missing" };
      return { kind: "error", message: error.code === "42501" ? "Only Mehdi's login can change this." : error.message || "Not saved." };
    }
    const o = obj(data) || {};
    return { kind: "ok", assignMode: o.assignMode === "owner" || o.assignMode === "rules" ? o.assignMode : "pool", dailyCap: int(o.dailyCap) || cap || 300 };
  } catch (e) {
    return { kind: "error", message: (e as Error).message || "Not saved." };
  }
}

