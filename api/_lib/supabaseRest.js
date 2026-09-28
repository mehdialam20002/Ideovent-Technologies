/**
 * The few Supabase calls /api/poster makes, all with the CALLER'S token.
 *
 * WHY NO service_role KEY
 *
 * A service_role key skips every policy in the database. With one in this
 * function, a bug here (a missed admin check, a wrong filter) would read every
 * lead and every key. Without one, the function can do exactly what the
 * signed-in admin could do from the browser, and RLS in 0006 is the check.
 * The anon key and URL are the public ones Vite already ships to the browser.
 */

export function supabaseEnv() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  return url && anon ? { url, anon } : null;
}

const TIMEOUT = 8000;

async function call(env, token, path, init = {}) {
  return fetch(`${env.url}${path}`, {
    ...init,
    headers: { apikey: env.anon, authorization: `Bearer ${token}`, "content-type": "application/json",
      ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

/** The signed-in user for this token, or null when the token is not valid. */
export async function getUser(env, token) {
  const res = await call(env, token, "/auth/v1/user");
  if (!res.ok) return null;
  const u = await res.json().catch(() => null);
  return u && u.id ? u : null;
}

/** public.is_admin(), evaluated as the caller. */
export async function isAdmin(env, token) {
  const res = await call(env, token, "/rest/v1/rpc/is_admin", { method: "POST", body: "{}" });
  if (!res.ok) return false;
  return (await res.json().catch(() => false)) === true;
}

/**
 * Enabled keys, in the order they are tried: providers by the admin's provider
 * order, and inside each provider its keys by their own order (0008).
 *
 * Returns { rows } or { missing: true } when the table does not exist yet
 * (0006 not run), which the handler reports as "no keys" with a pointer to the
 * migration. Before 0008 is run the new columns do not exist: the old select
 * is used instead and every row is marked `legacy`, so posters keep being read
 * with one key per provider exactly as before, and nothing writes key_id.
 */
const KEY_COLS = "id,provider,label,api_key,model,priority,provider_priority,enabled,last_error,last_error_at";
const LEGACY_COLS = "provider,api_key,model,priority,enabled,last_error,last_error_at";

export async function readKeys(env, token) {
  let res = await call(env, token, `/rest/v1/ai_provider_keys?select=${KEY_COLS}&enabled=eq.true`);
  let legacy = false;
  if (res.status === 400 || res.status === 404) {
    const t = await res.text().catch(() => "");
    // 42703: a column in KEY_COLS is unknown, so 0006 is run but 0008 is not.
    // Checked first: that message names the table too.
    if (/42703|PGRST204|column.*does not exist/i.test(t)) {
      legacy = true;
      res = await call(env, token, `/rest/v1/ai_provider_keys?select=${LEGACY_COLS}&enabled=eq.true`);
    } else if (/ai_provider_keys|PGRST205|42P01/.test(t)) {
      return { missing: true, rows: [] };
    }
  }
  if (!res.ok) throw new Error(`Could not read the AI keys (HTTP ${res.status})`);
  const got = await res.json();
  const rows = (Array.isArray(got) ? got : []).map((r) => (legacy
    ? { ...r, id: null, label: null, provider_priority: r.priority, priority: 0, legacy: true }
    : r));
  return { rows: orderKeys(rows), legacy };
}

/**
 * Providers first, keys second. A provider's place is the LOWEST
 * provider_priority among its keys, so one key left with a stale number (a
 * hand edit in the table editor, a save that half failed) cannot split its
 * provider in two around another provider.
 */
export function orderKeys(rows) {
  const rank = new Map();
  for (const r of rows) {
    const p = Number(r.provider_priority ?? 100);
    if (!rank.has(r.provider) || p < rank.get(r.provider)) rank.set(r.provider, p);
  }
  return [...rows].sort((a, b) =>
    rank.get(a.provider) - rank.get(b.provider)
    || String(a.provider).localeCompare(String(b.provider))
    || Number(a.priority ?? 0) - Number(b.priority ?? 0)
    || String(a.label ?? "").localeCompare(String(b.label ?? ""))
    || String(a.id ?? "").localeCompare(String(b.id ?? "")));
}

/**
 * Record the attempts and each key's last error. Best effort: a failed log
 * write must never turn a poster that was read into an error for the admin.
 * Keys are never part of what is written, only a key's id.
 *
 * Each attempt names the key it used (keyId). Its error is written to THAT
 * row, so a limit parks one key and not its whole provider. A legacy attempt
 * (0008 not run, keyId null) is written by provider as before, and key_id is
 * left out of the run rows because the column does not exist yet.
 */
export async function recordAttempts(env, token, logged) {
  if (!logged.length) return;
  const now = new Date().toISOString();
  const withKeyId = logged.some((a) => a.keyId);
  const jobs = [
    call(env, token, "/rest/v1/ai_poster_runs", {
      method: "POST", headers: { prefer: "return=minimal" },
      body: JSON.stringify(logged.map((a) => ({ provider: a.provider, status: a.status, detail: a.detail || null,
        ...(withKeyId ? { key_id: a.keyId || null } : {}) }))),
    }),
    ...logged.map((a) => call(env, token, a.keyId
      ? `/rest/v1/ai_provider_keys?id=eq.${encodeURIComponent(a.keyId)}`
      : `/rest/v1/ai_provider_keys?provider=eq.${encodeURIComponent(a.provider)}`, {
      method: "PATCH", headers: { prefer: "return=minimal" },
      body: JSON.stringify(a.status === "ok"
        ? { last_error: null, last_error_at: null }
        : { last_error: `${a.status}: ${a.detail || ""}`.slice(0, 500), last_error_at: now }),
    })),
  ];
  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected" || !r.value.ok).length;
  if (failed) console.error(`poster: ${failed} of ${jobs.length} log writes failed`);
}
