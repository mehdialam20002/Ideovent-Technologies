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
 * Enabled keys in priority order. Returns { rows } or { missing: true } when
 * the table does not exist yet (0006 not run), which the handler reports as
 * "no keys" with a pointer to the migration.
 */
export async function readKeys(env, token) {
  const res = await call(env, token,
    "/rest/v1/ai_provider_keys?select=provider,api_key,model,priority,enabled,last_error,last_error_at" +
    "&enabled=eq.true&order=priority.asc,provider.asc");
  if (res.status === 404 || res.status === 400) {
    const t = await res.text().catch(() => "");
    if (/ai_provider_keys|PGRST205|42P01/.test(t)) return { missing: true, rows: [] };
  }
  if (!res.ok) throw new Error(`Could not read the AI keys (HTTP ${res.status})`);
  const rows = await res.json();
  return { rows: Array.isArray(rows) ? rows : [] };
}

/**
 * Record the attempts and each key's last error. Best effort: a failed log
 * write must never turn a poster that was read into an error for the admin.
 * Keys are never part of what is written.
 */
export async function recordAttempts(env, token, logged) {
  if (!logged.length) return;
  const now = new Date().toISOString();
  const jobs = [
    call(env, token, "/rest/v1/ai_poster_runs", {
      method: "POST", headers: { prefer: "return=minimal" },
      body: JSON.stringify(logged.map((a) => ({ provider: a.provider, status: a.status, detail: a.detail || null }))),
    }),
    ...logged.map((a) => call(env, token, `/rest/v1/ai_provider_keys?provider=eq.${encodeURIComponent(a.provider)}`, {
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
