/**
 * AI provider keys for the poster reader.
 *
 * WHERE THE KEYS LIVE, AND WHERE THEY NEVER GO.
 * One row per provider in public.ai_provider_keys (supabase migration owned by the
 * backend work). Row-level security lets only an admin (public.is_admin()) read or
 * write it, and /api/poster reads it with the CALLER'S admin token, so no
 * service_role key exists anywhere. Deliberately NOT a collection in the CMS
 * content table: that table is what Export downloads and what the public site
 * reads, and a secret has no business in either. Never localStorage either: a key
 * in the browser outlives the session and is readable by any script on the origin.
 *
 * The full key comes back from the database only because RLS already proved the
 * reader is an admin; this module cuts it to its last four characters on arrival
 * (see toRow), so the page never holds the whole key in React state.
 *
 * This module imports the Supabase SDK (client.ts). It is only reached from lazy
 * admin chunks, so the public site's entry chunk does not pay for it.
 */
import { supabase } from "@/lib/cms/client";
import { supabaseEnabled } from "@/lib/cms/config";

export type ProviderId = "gemini" | "openai" | "xai" | "anthropic";

export interface ProviderInfo {
  id: ProviderId;
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
export const PROVIDERS: ProviderInfo[] = [
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

export const providerInfo = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;

const TABLE = "ai_provider_keys";
const RUNS = "ai_poster_runs";

/** A saved key as the page sees it: never the key itself, only its tail. */
export interface ProviderKeyRow {
  provider: ProviderId;
  last4: string;
  model: string;
  priority: number;
  enabled: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
  updatedAt: string | null;
}

interface DbRow {
  provider: ProviderId;
  api_key: string | null;
  model: string;
  priority: number;
  enabled: boolean;
  last_error: string | null;
  last_error_at: string | null;
  updated_at: string | null;
}

function toRow(r: DbRow): ProviderKeyRow {
  const key = r.api_key || "";
  return {
    provider: r.provider,
    last4: key.slice(-4),
    model: r.model,
    priority: r.priority,
    enabled: r.enabled,
    lastError: r.last_error,
    lastErrorAt: r.last_error_at,
    updatedAt: r.updated_at,
  };
}

/** True when this deploy talks to Supabase. In LOCAL mode there is nowhere safe to keep a key. */
export const aiKeysAvailable = supabaseEnabled;

/** Saved keys, highest priority (lowest number) first. */
export async function listKeys(): Promise<ProviderKeyRow[]> {
  const { data, error } = await supabase()
    .from(TABLE)
    .select("provider, api_key, model, priority, enabled, last_error, last_error_at, updated_at")
    .order("priority");
  if (error) throw error;
  return ((data || []) as DbRow[]).map(toRow);
}

/**
 * Save a NEW or REPLACED key. Upsert on the provider primary key, which is what
 * makes "one key per provider" a database fact and not just a UI promise: a
 * second key for Gemini overwrites the first, it never sits beside it. The old
 * error is cleared on replace, because that error was about the old key.
 */
export async function saveKey(
  provider: ProviderId,
  input: { apiKey: string; model: string; priority: number; enabled: boolean },
): Promise<void> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error("Paste a key first.");
  const { error } = await supabase().from(TABLE).upsert(
    {
      provider,
      api_key: apiKey,
      model: input.model.trim() || providerInfo(provider).defaultModel,
      priority: input.priority,
      enabled: input.enabled,
      last_error: null,
      last_error_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
  if (error) throw error;
}

/** Change settings on a saved key WITHOUT sending the key again. */
export async function updateKey(
  provider: ProviderId,
  patch: Partial<{ model: string; enabled: boolean; priority: number }>,
): Promise<void> {
  const { error } = await supabase()
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("provider", provider);
  if (error) throw error;
}

export async function removeKey(provider: ProviderId): Promise<void> {
  const { error } = await supabase().from(TABLE).delete().eq("provider", provider);
  if (error) throw error;
}

/**
 * Write the admin's order as priorities 10, 20, 30... Gaps of ten so a hand edit
 * in the Supabase table editor can slot one between two others. Only providers
 * that HAVE a saved row are written; the rest take their slot when a key is added.
 */
export async function saveOrder(order: ProviderId[], saved: ProviderId[]): Promise<void> {
  await Promise.all(
    order
      .map((p, i) => ({ p, priority: (i + 1) * 10 }))
      .filter(({ p }) => saved.includes(p))
      .map(({ p, priority }) => updateKey(p, { priority })),
  );
}

export interface UsageCount { ok: number; limit: number; error: number }

/**
 * Today's poster runs per provider, from ai_poster_runs. "Today" is the admin's
 * local day. The provider's own quota day may start at a different hour (Gemini
 * resets at midnight Pacific), so this is a rough gauge for "are we near the
 * limit", not the provider's own meter.
 */
export async function usageToday(): Promise<Record<string, UsageCount>> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase()
    .from(RUNS)
    .select("provider, status")
    .gte("created_at", start.toISOString())
    .limit(5000);
  if (error) throw error;
  const out: Record<string, UsageCount> = {};
  for (const r of (data || []) as { provider: string | null; status: string }[]) {
    if (!r.provider) continue;
    const c = (out[r.provider] ||= { ok: 0, limit: 0, error: 0 });
    if (r.status === "ok") c.ok++;
    else if (r.status === "limit") c.limit++;
    else c.error++;
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

export interface TestResult { provider: ProviderId; model: string; ok: boolean; error?: string }

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
