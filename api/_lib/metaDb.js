/**
 * The database calls of the Meta Lead Ads functions: one wrapper per function
 * of migration 0012 (spec section 5.2), and the owner's session check.
 *
 * NO service_role KEY. The token functions (receive, ingest, failed, retry,
 * catch-up, verified) are called with the public anon key and NO
 * Authorization header, so PostgREST runs them as the anon role, the only one
 * that may; the ingest token is what the database checks. The owner's session
 * is used only to check that the caller is the owner (/auth/v1/user, then
 * rpc/is_admin) and to call the owner's three functions as him.
 *
 * ERRORS keep PostgREST's `code` and `message` only (cut to 200, scrubbed),
 * never `details` or `hint`: for a check or not-null violation Postgres puts
 * the whole failing row, with the lead's values, in `details`. 0012's own
 * messages never quote a value they were given.
 */
import { getUser, isAdmin, supabaseEnv } from "./supabaseRest.js";
import { json, scrub } from "./meta.js";

export { supabaseEnv };

/** Every database call ends within this (Supabase stops an anon statement after 3 seconds anyway). */
const TIMEOUT = 4000;

/**
 * One RPC. `bearer` null = no Authorization header: the anon role. Resolves
 * the function's JSON answer (null for a void function). Throws an Error whose
 * message is "<fn>: <code> <message>", with `status`, `code` and `missing`
 * (the function does not exist: 0012, or 0011, not run).
 */
export async function rpc(env, bearer, fn, args, timeoutMs = TIMEOUT) {
  let res;
  try {
    res = await fetch(`${env.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: env.anon, ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), "content-type": "application/json" },
      body: JSON.stringify(args || {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const why = e && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "unreachable";
    throw Object.assign(new Error(`${fn}: Supabase ${why}`), { status: 0, code: "", missing: false, down: true });
  }
  // An answer that breaks off (or runs out of time) is a failure, never an
  // empty answer: read as "nothing to fetch", the webhook would acknowledge
  // ids it never read, and Meta would not send them again.
  let text;
  try {
    text = await res.text();
  } catch (e) {
    const why = e && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "answer broke off";
    throw Object.assign(new Error(`${fn}: Supabase ${why}`), { status: res.status, code: "", missing: false, down: true });
  }
  if (!res.ok) {
    let code = "";
    let message = "";
    try {
      const e = JSON.parse(text);
      code = String(e.code || "").slice(0, 20);
      message = String(e.message || "");
    } catch {
      /* not JSON: keep the status */
    }
    const why = scrub([code, message].filter(Boolean).join(" ")).slice(0, 200) || `HTTP ${res.status}`;
    const missing = /PGRST202|42883/.test(code) || (res.status === 404 && !code);
    throw Object.assign(new Error(`${fn}: ${why}`), { status: res.status, code, missing });
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error(`${fn}: not JSON`), { status: res.status, code: "", missing: false });
  }
}

/* ── The token functions (anon key, no session) ─────────────────────────── */

export async function metaReceive(env, token, items, channel, pageId) {
  const r = await rpc(env, null, "meta_lead_receive", { p_token: token, p_items: items, p_channel: channel, p_page_id: pageId || null });
  // 0012 always answers an object with a fetch list; anything else is not "nothing to fetch".
  if (!r || typeof r !== "object" || !Array.isArray(r.fetch)) throw new Error("meta_lead_receive: unexpected answer");
  return {
    fetch: Array.isArray(r && r.fetch) ? r.fetch.filter((x) => typeof x === "string") : [],
    known: Number(r && r.known) || 0,
    otherPage: Number(r && r.otherPage) || 0,
    overCap: Number(r && r.overCap) || 0,
    pageMismatch: Boolean(r && r.pageMismatch),
    new: Number(r && r.new) || 0,
  };
}

export async function metaIngest(env, token, leadgenId, lead, channel, pageId) {
  const r = await rpc(env, null, "meta_lead_ingest",
    { p_token: token, p_leadgen_id: leadgenId, p_lead: lead, p_channel: channel, p_page_id: pageId || null });
  const result = r && typeof r.result === "string" ? r.result : "";
  if (!["created", "duplicate", "already", "over_cap"].includes(result)) throw new Error("meta_lead_ingest: unexpected answer");
  return { result, leadId: r.leadId || null, assignedTo: r.assignedTo || null };
}

export const metaFailed = (env, token, leadgenId, kind, detail) =>
  rpc(env, null, "meta_lead_failed", { p_token: token, p_leadgen_id: leadgenId, p_kind: kind, p_detail: detail || null });

export async function metaRetryDue(env, token, limit = 25, wait = true) {
  const r = await rpc(env, null, "meta_retry_due", { p_token: token, p_limit: limit, p_wait: wait });
  return Array.isArray(r) ? r.filter((x) => typeof x === "string") : [];
}

export async function metaCatchupBegin(env, token, force, pageId) {
  const r = await rpc(env, null, "meta_catchup_begin", { p_token: token, p_force: Boolean(force), p_page_id: pageId || null });
  // {ok, since, retry} or {ok:false, reason}: anything else must not read as "the Page id changed".
  if (!r || typeof r !== "object" || typeof r.ok !== "boolean") throw new Error("meta_catchup_begin: unexpected answer");
  return r;
}

export const metaCatchupEnd = (env, token, until, forms, stats) =>
  rpc(env, null, "meta_catchup_end", { p_token: token, p_until: until || null, p_forms: forms || null, p_stats: stats || null });

export const metaLogVerified = (env, token, timeoutMs = 1500) =>
  rpc(env, null, "meta_log_verified", { p_token: token }, timeoutMs);

/* ── The owner's functions (his own session) ────────────────────────────── */

export const metaConnect = (env, session, ingestSha256, relaySha256, pageId, pageName, tokenInfo) =>
  rpc(env, session, "meta_connect", { p_ingest_sha256: ingestSha256 || null, p_relay_sha256: relaySha256 || null,
    p_page_id: pageId, p_page_name: pageName || null, p_token_info: tokenInfo || {} }, 8000);

export const metaIntakeStatus = (env, session, ingestSha256, relaySha256) =>
  rpc(env, session, "meta_intake_status", { p_ingest_sha256: ingestSha256 || null, p_relay_sha256: relaySha256 || null }, 8000);

export const metaSetSettings = (env, session, mode, cap) =>
  rpc(env, session, "meta_set_settings", { p_assign_mode: mode ?? null, p_daily_cap: cap ?? null }, 8000);

/**
 * The caller must be the owner: { env, session } or { res } with the refusal.
 * The CRM sends his Supabase session as "Authorization: Bearer". 503 without
 * Supabase settings on the server, 401 no or expired session, 403 not the
 * owner, 502 Supabase unreachable.
 */
export async function ownerSession(request) {
  const env = supabaseEnv();
  if (!env) return { res: json(503, { ok: false, error: "Supabase is not configured on the server." }) };
  const session = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!session) return { res: json(401, { ok: false, error: "Sign in again." }) };
  let user;
  try {
    user = await getUser(env, session);
  } catch {
    return { res: json(502, { ok: false, error: "Could not reach Supabase to check the sign-in." }) };
  }
  if (!user) return { res: json(401, { ok: false, error: "Sign in again." }) };
  if (!(await isAdmin(env, session).catch(() => false))) {
    return { res: json(403, { ok: false, error: "Meta Lead Ads is Mehdi's: this account cannot change it." }) };
  }
  return { env, session };
}
