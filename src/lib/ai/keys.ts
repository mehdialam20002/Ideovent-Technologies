/**
 * AI provider keys for the poster reader.
 *
 * WHERE THE KEYS LIVE, AND WHERE THEY NEVER GO.
 * One row per KEY in public.ai_provider_keys (migrations 0006 and 0008): a
 * provider can hold several, tried one after another. Row-level security lets
 * only an admin (public.is_admin()) read or write it, and /api/poster reads it
 * with the CALLER'S admin token, so no service_role key exists anywhere.
 * Deliberately NOT a collection in the CMS content table: that table is what
 * Export downloads and what the public site reads, and a secret has no
 * business in either. Never localStorage either: a key in the browser outlives
 * the session and is readable by any script on the origin.
 *
 * The page lists keys through the view ai_provider_keys_masked (0008), which
 * returns the last four characters and never the key, so the whole key does
 * not travel to the browser at all. Saving and replacing write the table
 * directly. Only before 0008 is run does the list fall back to reading the
 * table, and then the key is cut to four characters on arrival.
 *
 * This module imports the Supabase SDK (client.ts). It is only reached from lazy
 * admin chunks, so the public site's entry chunk does not pay for it.
 */
import { supabase } from "@/lib/cms/client";
import { supabaseEnabled } from "@/lib/cms/config";

/** The AI providers the POSTER READER tries, in the admin's order. */
export type ProviderId = "gemini" | "openai" | "xai" | "anthropic";
/**
 * Every provider a key can be saved for. Google Maps (Places) lives in the
 * same admin-only table (migration 0009 allows it) but is NOT an AI provider:
 * only /api/leads-search reads it, the poster reader never does, and it has no
 * place in the poster order.
 */
export type KeyProviderId = ProviderId | "google_maps";
export const GOOGLE_MAPS_ID = "google_maps" as const;

export interface ProviderInfo<I extends KeyProviderId = KeyProviderId> {
  id: I;
  label: string;
  /** Model filled in for a new key. The admin can change it. */
  defaultModel: string;
  /** One short line: where the key comes from and what it costs. */
  where: string;
  url: string;
  free: boolean;
}

/*
  Default models. Kept identical to DEFAULT_MODELS in api/_lib/providers.js:
  this page always saves a model, so if the two lists drift the server's
  defaults are never used. The admin can still edit the model on the page:
  providers rename models often, and a stale name costs one edit, not a
  deploy. Gemini first because its free tier is the reason this feature costs
  nothing day to day.
*/
export const PROVIDERS: ProviderInfo<ProviderId>[] = [
  {
    id: "gemini", label: "Google Gemini", defaultModel: "gemini-3.8-flash",
    where: "Get a key at Google AI Studio (aistudio.google.com). Free tier with a daily limit.",
    url: "https://aistudio.google.com/apikey", free: true,
  },
  {
    id: "openai", label: "OpenAI", defaultModel: "gpt-6-luna",
    where: "Get a key at platform.openai.com. Paid: needs credit on the account.",
    url: "https://platform.openai.com/api-keys", free: false,
  },
  {
    id: "xai", label: "xAI Grok", defaultModel: "grok-4.7",
    where: "Get a key at console.x.ai. Paid: needs credit on the account.",
    url: "https://console.x.ai", free: false,
  },
  {
    id: "anthropic", label: "Anthropic Claude", defaultModel: "claude-opus-5",
    where: "Get a key at console.anthropic.com. Paid: needs credit on the account.",
    url: "https://console.anthropic.com/settings/keys", free: false,
  },
];

/** The Lead Finder's key. Not in PROVIDERS, so it never enters the poster order. */
export const GOOGLE_MAPS_PROVIDER: ProviderInfo = {
  id: GOOGLE_MAPS_ID, label: "Google Maps (Places)", defaultModel: "places-v1",
  where: "Get a key at console.cloud.google.com: enable Places API (New), restrict the key to it. Used by the Lead Finder only, never for posters. Billed by Google after the free monthly usage.",
  url: "https://console.cloud.google.com/google/maps-apis/api-list", free: false,
};

export const providerInfo = (id: KeyProviderId): ProviderInfo =>
  id === GOOGLE_MAPS_ID ? GOOGLE_MAPS_PROVIDER : PROVIDERS.find((p) => p.id === id)!;

/** True for a poster (AI) provider, false for Google Maps. */
export const isPosterProvider = (id: KeyProviderId): id is ProviderId => id !== GOOGLE_MAPS_ID;

const TABLE = "ai_provider_keys";
/** 0008's view: every column but the key, plus the key's last four. */
const MASKED = "ai_provider_keys_masked";
const RUNS = "ai_poster_runs";

/** A saved key as the page sees it: never the key itself, only its tail. */
export interface ProviderKeyRow {
  /** Row id. Before 0008 is run there is none, and the provider stands in. */
  id: string;
  provider: KeyProviderId;
  label: string;
  last4: string;
  model: string;
  /** Place inside its provider: lower is tried first. */
  priority: number;
  /** The provider's place among providers; the same on all of its keys. */
  providerPriority: number;
  enabled: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
  updatedAt: string | null;
  /** True when the table is still 0006's shape: one key per provider, no id. */
  legacy: boolean;
}

interface MaskedRow {
  id: string;
  provider: KeyProviderId;
  label: string | null;
  last4: string | null;
  model: string;
  priority: number;
  provider_priority: number;
  enabled: boolean;
  last_error: string | null;
  last_error_at: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface LegacyRow {
  provider: KeyProviderId;
  api_key: string | null;
  model: string;
  priority: number;
  enabled: boolean;
  last_error: string | null;
  last_error_at: string | null;
  updated_at: string | null;
}

/** True when this deploy talks to Supabase. In LOCAL mode there is nowhere safe to keep a key. */
export const aiKeysAvailable = supabaseEnabled;

/** PostgREST's "that relation or column does not exist": 0008 is not run yet. */
function isMissing(e: { code?: string; message?: string } | null): boolean {
  return !!e && (e.code === "PGRST205" || e.code === "42P01" || e.code === "42703" || /does not exist|could not find/i.test(e.message || ""));
}

/**
 * The order /api/poster uses (api/_lib/supabaseRest.js orderKeys): providers
 * by the LOWEST provider_priority among their keys, then keys by priority. Kept
 * the same here so the page shows exactly the order the reader walks.
 */
export function sortKeys(rows: ProviderKeyRow[]): ProviderKeyRow[] {
  const rank = new Map<KeyProviderId, number>();
  for (const r of rows) rank.set(r.provider, Math.min(rank.get(r.provider) ?? Infinity, r.providerPriority));
  return [...rows].sort((a, b) =>
    rank.get(a.provider)! - rank.get(b.provider)! || a.provider.localeCompare(b.provider)
    || a.priority - b.priority || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

/**
 * Saved keys, in the order they are tried. Read from the masked view, so the
 * whole key never reaches the browser; only its last four characters do.
 *
 * Before 0008 is run the view does not exist. The page then falls back to the
 * old table read (the key is cut to four characters on arrival, as before),
 * marks every row `legacy`, and says "run 0008" instead of offering a second key.
 */
export async function listKeys(): Promise<ProviderKeyRow[]> {
  const sb = supabase();
  const { data, error } = await sb
    .from(MASKED)
    .select("id, provider, label, last4, model, priority, provider_priority, enabled, last_error, last_error_at, updated_at, created_at");
  if (!error) {
    legacySchema = false;
    return sortKeys(((data || []) as MaskedRow[]).map((r) => ({
      id: r.id, provider: r.provider, label: (r.label || "").trim() || "Key", last4: r.last4 || "",
      model: r.model, priority: r.priority, providerPriority: r.provider_priority, enabled: r.enabled,
      lastError: r.last_error, lastErrorAt: r.last_error_at, updatedAt: r.updated_at, legacy: false,
    })));
  }
  if (!isMissing(error)) throw error;
  const old = await sb.from(TABLE).select("provider, api_key, model, priority, enabled, last_error, last_error_at, updated_at");
  if (old.error) throw old.error;
  legacySchema = true;
  return sortKeys(((old.data || []) as LegacyRow[]).map((r) => ({
    id: r.provider, provider: r.provider, label: "Key 1", last4: (r.api_key || "").slice(-4),
    model: r.model, priority: 10, providerPriority: r.priority, enabled: r.enabled,
    lastError: r.last_error, lastErrorAt: r.last_error_at, updatedAt: r.updated_at, legacy: true,
  })));
}

/*
  Remembered from the last listKeys(): is the table still 0006's shape? An
  empty list cannot say so by its rows, and addKey needs to know whether it may
  insert a second row or must upsert the provider's only one.
*/
let legacySchema = false;
export const needsMigration = () => legacySchema;

/**
 * Add a key. Since 0008 this always INSERTS: a second Gemini key sits beside
 * the first, it never overwrites it. Before 0008 it upserts on the provider,
 * which is the only thing that table allows.
 */
export async function addKey(
  provider: KeyProviderId,
  input: { apiKey: string; label: string; model: string; priority: number; providerPriority: number; enabled?: boolean },
): Promise<void> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error("Paste a key first.");
  const model = input.model.trim() || providerInfo(provider).defaultModel;
  const now = new Date().toISOString();
  const common = { provider, api_key: apiKey, model, enabled: input.enabled ?? true, last_error: null, last_error_at: null, updated_at: now };
  const { error } = legacySchema
    ? await supabase().from(TABLE).upsert({ ...common, priority: input.providerPriority }, { onConflict: "provider" })
    : await supabase().from(TABLE).insert({
        ...common, label: input.label.trim() || "Key", priority: input.priority, provider_priority: input.providerPriority,
      });
  if (error) throw error;
}

/** Match one saved row: by id, or by provider before 0008 when there is no id. */
function byRow(row: Pick<ProviderKeyRow, "id" | "provider" | "legacy">) {
  return row.legacy ? (["provider", row.provider] as const) : (["id", row.id] as const);
}

/**
 * Put a new key in place of a saved one, keeping its label, model and place.
 * The old error is cleared, because that error was about the old key.
 */
export async function replaceKey(row: ProviderKeyRow, apiKey: string): Promise<void> {
  const key = apiKey.trim();
  if (!key) throw new Error("Paste a key first.");
  const [col, val] = byRow(row);
  const { error } = await supabase().from(TABLE)
    .update({ api_key: key, last_error: null, last_error_at: null, updated_at: new Date().toISOString() })
    .eq(col, val);
  if (error) throw error;
}

/** Change settings on a saved key WITHOUT sending the key again. */
export async function updateKey(
  row: ProviderKeyRow,
  patch: Partial<{ model: string; enabled: boolean; label: string; priority: number }>,
): Promise<void> {
  const [col, val] = byRow(row);
  // 0006 has no label column, and its `priority` is the provider's place.
  const { label, priority, ...rest } = patch;
  const body = row.legacy ? rest : { ...rest, ...(label !== undefined ? { label } : {}), ...(priority !== undefined ? { priority } : {}) };
  if (!Object.keys(body).length) return;
  const { error } = await supabase().from(TABLE).update({ ...body, updated_at: new Date().toISOString() }).eq(col, val);
  if (error) throw error;
}

export async function removeKey(row: ProviderKeyRow): Promise<void> {
  const [col, val] = byRow(row);
  const { error } = await supabase().from(TABLE).delete().eq(col, val);
  if (error) throw error;
}

/**
 * Write the admin's PROVIDER order as 10, 20, 30... on every key of each
 * provider. Gaps of ten so a hand edit in the Supabase table editor can slot
 * one between two others. Providers with no key are skipped; they take their
 * slot when a key is added.
 */
export async function saveProviderOrder(order: KeyProviderId[], rows: ProviderKeyRow[]): Promise<void> {
  const legacy = rows.some((r) => r.legacy);
  const results = await Promise.all(
    order
      .map((p, i) => ({ p, n: (i + 1) * 10 }))
      .filter(({ p }) => rows.some((r) => r.provider === p))
      .map(({ p, n }) => supabase().from(TABLE)
        .update({ [legacy ? "priority" : "provider_priority"]: n, updated_at: new Date().toISOString() })
        .eq("provider", p)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Write one provider's KEY order as 10, 20, 30..., the list given top first. */
export async function saveKeyOrder(keys: ProviderKeyRow[]): Promise<void> {
  await Promise.all(keys.map((k, i) => updateKey(k, { priority: (i + 1) * 10 })));
}

export interface UsageCount { ok: number; limit: number; error: number }
export interface Usage { byProvider: Record<string, UsageCount>; byKey: Record<string, UsageCount> }

/**
 * Today's poster runs per provider and per key, from ai_poster_runs. "Today"
 * is the admin's local day. The provider's own quota day may start at a
 * different hour (Gemini resets at midnight Pacific), so this is a rough gauge
 * for "are we near the limit", not the provider's own meter. Runs from before
 * 0008 have no key_id and count only towards their provider.
 */
export async function usageToday(): Promise<Usage> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const read = (cols: string) =>
    supabase().from(RUNS).select(cols).gte("created_at", start.toISOString()).limit(5000);
  let res = await read("provider, status, key_id");
  if (res.error && isMissing(res.error)) res = await read("provider, status");
  if (res.error) throw res.error;
  const out: Usage = { byProvider: {}, byKey: {} };
  const bump = (m: Record<string, UsageCount>, k: string, status: string) => {
    const c = (m[k] ||= { ok: 0, limit: 0, error: 0 });
    if (status === "ok") c.ok++;
    else if (status === "limit") c.limit++;
    else c.error++;
  };
  for (const r of (res.data || []) as unknown as { provider: string | null; status: string; key_id?: string | null }[]) {
    if (r.provider) bump(out.byProvider, r.provider, r.status);
    if (r.key_id) bump(out.byKey, r.key_id, r.status);
  }
  return out;
}

/**
 * The signed-in admin's Supabase access token, for calling /api/poster. The
 * function verifies it with Supabase auth and then reads the keys AS this admin,
 * so RLS is the gate. Null in LOCAL mode or when signed out.
 */
export async function getAdminAccessToken(): Promise<string | null> {
  if (!supabaseEnabled) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export interface TestResult { provider: KeyProviderId; keyId?: string; label?: string; model: string; ok: boolean; error?: string }

/** POST { test: true } to /api/poster: a tiny text prompt to every enabled key. */
export async function testKeys(): Promise<TestResult[]> {
  const token = await getAdminAccessToken();
  if (!token) throw new Error("You are signed out. Sign in again and retry.");
  let res: Response;
  try {
    res = await fetch("/api/poster", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ test: true }),
    });
  } catch {
    throw new Error("Could not reach /api/poster. It runs on the Vercel deploy, not on the local dev server.");
  }
  const body = (await res.json().catch(() => null)) as
    | { ok?: boolean; test?: TestResult[]; code?: string; error?: string }
    | null;
  if (res.ok && body?.test) return body.test;
  if (res.status === 422 || body?.code === "no_keys") throw new Error("No enabled key to test. Add a key and switch it on.");
  if (res.status === 401) throw new Error("Your sign-in has expired. Sign in again and retry.");
  if (res.status === 403) throw new Error("This account is not on the admin list.");
  throw new Error(body?.error || `The test failed (HTTP ${res.status}).`);
}
