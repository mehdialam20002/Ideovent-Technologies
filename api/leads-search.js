/**
 * POST /api/leads-search: the Lead Finder in /admin.
 *
 * THE FLOW
 *
 * Mehdi types a type and a city ("coaching", "Patna"). This function asks
 * Google Maps (Places API, New) for the businesses, and the admin page then
 * asks it to audit each one's website: none, broken, poor or ok (or
 * unchecked, for a page drawn by scripts), with the evidence. One click in
 * the page turns a place into a CRM lead.
 *
 *   { action: "search",  query?, type?, city?, preset?, pageToken? } -> { source, places[], nextPageToken, attribution }
 *   { action: "details", placeId }                                   -> { place }   (Google results only)
 *   { action: "audit",   url } or { urls: [..10] }, kind?            -> { audit } or { audits[] }
 *
 * THE FREE SOURCE (28 Sep 2026)
 *
 * With a working Google key, Google answers (source "google"). With no key
 * saved, or when every key fails (out of quota, billing off, a bad key), the
 * search goes to OpenStreetMap instead (source "osm", api/_lib/osm.js): free,
 * no key, fewer businesses and fewer phones, and the answer says so and
 * carries "© OpenStreetMap contributors". `fallback` says why Google was not
 * used. An OSM "Load more" token starts with "osm." and never touches Google.
 * `kind: "dental"` on an audit adds the dental checks (booking, WhatsApp,
 * treatment pages).
 *
 * WHO MAY CALL IT
 *
 * Only a signed-in admin, checked exactly as /api/poster checks it: the token
 * with Supabase auth, then public.is_admin() AS THE CALLER, and the Google key
 * read AS THE CALLER, so the RLS from 0006 guards it. No service_role key.
 *
 * KEYS
 *
 * The Places key lives in public.ai_provider_keys with provider 'google_maps'
 * (0009 allows it). Several keys are tried in the admin's order. A key that
 * reports a quota or rate limit is parked until tomorrow (India time) by its
 * own id, like the poster reader does. An error caused by the request itself
 * (an unknown place id, a stale page token) is not retried on the next key.
 *
 * GOOGLE'S TERMS
 *
 * Place IDs may be stored indefinitely; other Places content (phone, address,
 * rating) may not be stored in our database. This function stores nothing: it
 * returns Google's data to the admin's browser, live, and the page keeps only
 * the place id, name and city on a lead. The audit reads the business's OWN
 * website, and the phones and emails found there are theirs to publish and
 * ours to keep.
 *
 * Keys never appear in a response or a log line.
 */
import {
  OSM_ATTRIBUTION, OSM_COPYRIGHT_URL, OSM_LICENCE, OSM_NOTE, OSM_TOKEN_RE, OsmError, osmSearch,
} from "./_lib/osm.js";
import { PlacesError, PLACE_ID_RE, placeDetails, textSearch } from "./_lib/places.js";
import { redact } from "./_lib/providers.js";
import { auditSite } from "./_lib/siteAudit.js";
import { getUser, isAdmin, readKeys, supabaseEnv } from "./_lib/supabaseRest.js";

export const PROVIDER = "google_maps";
const PER_ATTEMPT_MS = 10_000;
const BUDGET_MS = 25_000;
/* A search leaves OpenStreetMap time to answer when Google fails (vercel.json: 30 s). */
const SEARCH_GOOGLE_BUDGET_MS = 12_000;
const SEARCH_TOTAL_MS = 27_500;
const MIN_ATTEMPT_MS = 3_000;
const MAX_AUDITS = 10;
const AUDIT_KINDS = ["school", "coaching", "dental", "other"];

/** YYYY-MM-DD in India, as in api/poster.js. */
const istDay = (ms) => new Date(ms + 330 * 60_000).toISOString().slice(0, 10);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    return req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const clean = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Validate the body. Returns { status, error } or the clean job. */
export function parseRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, error: "Body must be a JSON object" };
  const action = body.action;
  if (action === "search") {
    const query = clean(body.query, 200);
    const type = clean(body.type, 80);
    const city = clean(body.city, 80);
    if (!query && !(type && city)) return { status: 400, error: "Type a business type and a city, or a search" };
    let textQuery = query || `${type} in ${city}`;
    if (query && city && !query.toLowerCase().includes(city.toLowerCase())) textQuery = `${query} in ${city}`;
    const pageToken = body.pageToken == null || body.pageToken === "" ? null : body.pageToken;
    if (pageToken !== null && (typeof pageToken !== "string" || pageToken.length > 4000 || /\s/.test(pageToken))) {
      return { status: 400, error: "pageToken is not valid" };
    }
    const preset = clean(body.preset, 40);
    if (preset && !/^[a-z0-9_-]+$/.test(preset)) return { status: 400, error: "preset is not valid" };
    // OpenStreetMap needs the type and the city apart: "NEET coaching in Gaya" -> "NEET coaching", "Gaya".
    const split = /^(.*?)\s+in\s+(.+)$/i.exec(query);
    const osm = { type: type || (split ? split[1] : query), city: city || (split ? split[2] : ""), preset: preset || null };
    const osmPage = pageToken && OSM_TOKEN_RE.exec(pageToken);
    return { action, textQuery, pageToken: osmPage ? null : pageToken, osm, osmOffset: osmPage ? Number(osmPage[1]) : null };
  }
  if (action === "details") {
    if (typeof body.placeId !== "string" || !PLACE_ID_RE.test(body.placeId)) return { status: 400, error: "placeId is not valid" };
    return { action, placeId: body.placeId };
  }
  if (action === "audit") {
    if (body.kind != null && !AUDIT_KINDS.includes(body.kind)) return { status: 400, error: `kind must be one of ${AUDIT_KINDS.join(", ")}` };
    const kind = body.kind || null;
    if (Array.isArray(body.urls)) {
      if (!body.urls.length || body.urls.length > MAX_AUDITS) return { status: 400, error: `Send 1 to ${MAX_AUDITS} urls` };
      if (!body.urls.every((u) => u == null || (typeof u === "string" && u.length <= 500))) return { status: 400, error: "Each url must be text" };
      return { action, urls: body.urls.map((u) => u ?? ""), kind };
    }
    if (body.url != null && (typeof body.url !== "string" || body.url.length > 500)) return { status: 400, error: "url must be text" };
    return { action, url: body.url ?? "", kind };
  }
  return { status: 400, error: "action must be search, details or audit" };
}

/** Write one key's last error (or clear it). Best effort, like recordAttempts. */
async function markKey(env, token, row, status, detail) {
  const path = row.id
    ? `/rest/v1/ai_provider_keys?id=eq.${encodeURIComponent(row.id)}`
    : `/rest/v1/ai_provider_keys?provider=eq.${PROVIDER}`;
  const body = status === "ok" ? { last_error: null, last_error_at: null }
    : { last_error: `${status}: ${detail || ""}`.slice(0, 500), last_error_at: new Date().toISOString() };
  try {
    const r = await fetch(`${env.url}${path}`, {
      method: "PATCH",
      headers: { apikey: env.anon, authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) console.error(`leads-search: key status write failed (HTTP ${r.status})`);
  } catch {
    console.error("leads-search: key status write failed");
  }
}

/**
 * Run fn(apiKey, timeoutMs) with each Google key in order until one answers.
 * Returns { value, attempts }, or { error, detail, attempts } when the request
 * itself was wrong, or { attempts } alone when every key failed.
 */
async function withKeys(env, token, rows, started, fn, budgetMs = BUDGET_MS) {
  const attempts = [];
  const today = istDay(Date.now());
  const tag = (row) => (row.label ? { label: row.label } : {});
  for (const row of rows) {
    if (/^limit:/.test(row.last_error || "") && row.last_error_at && istDay(Date.parse(row.last_error_at)) === today) {
      attempts.push({ ...tag(row), status: "skipped", error: "Out of quota today. Tried again tomorrow." });
      continue;
    }
    const left = budgetMs - (Date.now() - started);
    if (left < MIN_ATTEMPT_MS) {
      attempts.push({ ...tag(row), status: "skipped", error: "Out of time" });
      continue;
    }
    try {
      const value = await fn(row.api_key, Math.min(PER_ATTEMPT_MS, left - 500));
      attempts.push({ ...tag(row), status: "ok" });
      if (row.last_error) await markKey(env, token, row, "ok");
      return { value, attempts };
    } catch (e) {
      const detail = redact(e?.message || String(e), row.api_key);
      if (e instanceof PlacesError && e.request) {
        attempts.push({ ...tag(row), status: "error", error: detail });
        return { error: e, detail, attempts };
      }
      const status = e?.limit ? "limit" : "error";
      attempts.push({ ...tag(row), status, error: detail });
      console.error(`leads-search: google_maps ${status}`);
      await markKey(env, token, row, status, detail);
    }
  }
  return { attempts };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { ok: false, code: "method", error: "POST only" });
  }
  const started = Date.now();
  const env = supabaseEnv();
  if (!env) return send(res, 500, { ok: false, code: "not_configured", error: "Supabase is not configured on the server" });

  const auth = String(req.headers?.authorization || req.headers?.Authorization || "");
  const token = /^Bearer\s+(\S+)$/i.exec(auth)?.[1];
  if (!token) return send(res, 401, { ok: false, code: "unauthorized", error: "Sign in again" });
  if (Number(req.headers?.["content-length"] || 0) > 64 * 1024) {
    return send(res, 413, { ok: false, code: "too_large", error: "Request is too large" });
  }

  let user;
  try {
    user = await getUser(env, token);
  } catch {
    return send(res, 502, { ok: false, code: "auth_unreachable", error: "Could not reach Supabase to check the sign-in" });
  }
  if (!user) return send(res, 401, { ok: false, code: "unauthorized", error: "Sign in again" });
  if (!(await isAdmin(env, token).catch(() => false))) {
    return send(res, 403, { ok: false, code: "forbidden", error: "This account is not an admin" });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { ok: false, code: "bad_body", error: "Body is not valid JSON" });
  }
  const job = parseRequest(body);
  if (job.error) return send(res, job.status, { ok: false, code: "bad_body", error: job.error });

  // The audit reads the business's own site and needs no Google key.
  if (job.action === "audit") {
    const opts = job.kind ? { kind: job.kind } : {};
    if (job.urls) return send(res, 200, { ok: true, audits: await Promise.all(job.urls.map((u) => auditSite(u, opts))) });
    return send(res, 200, { ok: true, audit: await auditSite(job.url, opts) });
  }

  const search = job.action === "search";
  // "Load more" on an OpenStreetMap list stays on OpenStreetMap.
  if (search && job.osmOffset !== null) return sendOsm(res, job, started, null);

  let keys;
  try {
    keys = await readKeys(env, token);
  } catch (e) {
    if (search) return sendOsm(res, job, started, { code: "keys_unreadable", reason: "The saved Google Maps keys could not be read." });
    return send(res, 502, { ok: false, code: "keys_unreadable", error: e.message });
  }
  const rows = keys.rows.filter((r) => r.provider === PROVIDER && r.api_key);
  if (!rows.length) {
    if (search) {
      return sendOsm(res, job, started, keys.missing
        ? { code: "no_keys", reason: "The keys table is not set up yet (run 0006, then 0009, in Supabase), so no Google Maps key could be used." }
        : { code: "no_keys", reason: "No Google Maps key is saved." });
    }
    return send(res, 422, { ok: false, code: "no_keys", error: keys.missing
      ? "The keys table does not exist yet. Run supabase/migrations/0006_ai_keys.sql, then 0009_google_maps_key.sql, in the Supabase SQL editor."
      : "No Google Maps key is saved and switched on. Add one in /admin under AI keys (Google Maps). If saving it fails, run supabase/migrations/0009_google_maps_key.sql first." });
  }

  const fn = search
    ? (apiKey, timeoutMs) => textSearch({ apiKey, textQuery: job.textQuery, pageToken: job.pageToken, timeoutMs })
    : (apiKey, timeoutMs) => placeDetails({ apiKey, placeId: job.placeId, timeoutMs });
  const out = await withKeys(env, token, rows, started, fn, search ? SEARCH_GOOGLE_BUDGET_MS : BUDGET_MS);

  if (out.error) {
    const notFound = job.action === "details" && out.error.status === 404;
    return send(res, notFound ? 404 : 400, { ok: false, code: notFound ? "not_found" : "bad_request",
      error: notFound ? "Google has no place with this id any more" : out.detail, attempts: out.attempts });
  }
  if (!out.value) {
    // A Google "Load more" cannot continue on OpenStreetMap: a new search can.
    if (search && !job.pageToken) return sendOsm(res, job, started, { ...whyNotGoogle(out.attempts), attempts: out.attempts });
    return send(res, 502, { ok: false, code: "all_failed", attempts: out.attempts,
      error: "No Google Maps key worked. See each key's error in /admin under AI keys." });
  }
  // Google's terms: show "Google Maps" beside Places data shown without a map.
  const attribution = "Google Maps";
  if (search) {
    return send(res, 200, { ok: true, source: "google", textQuery: job.textQuery, places: out.value.places.map((p) => ({ ...p, source: "google" })),
      nextPageToken: out.value.nextPageToken, attribution, attempts: out.attempts });
  }
  return send(res, 200, { ok: true, place: { ...out.value, source: "google" }, attribution, attempts: out.attempts });
}

/** Why Google was not used, in one sentence the page shows above the OSM list. */
export function whyNotGoogle(attempts) {
  const errors = attempts.map((a) => a.error || "").join(" ");
  const quota = (a) => a.status === "limit" || (a.status === "skipped" && /quota/i.test(a.error || ""));
  if (attempts.length && attempts.every(quota)) return { code: "quota", reason: "Every Google Maps key is out of quota for today." };
  if (/billing/i.test(errors)) return { code: "billing", reason: "Google Maps billing is not switched on for the key's project." };
  if (attempts.some(quota)) return { code: "quota", reason: "Google Maps keys are out of quota or failing (see AI keys)." };
  if (attempts.length && attempts.every((a) => /Out of time/.test(a.error || ""))) return { code: "timeout", reason: "Google Maps did not answer in time." };
  return { code: "all_failed", reason: "No Google Maps key worked (see each key's error in AI keys)." };
}

/** Search OpenStreetMap and send the answer, with its attribution and its honest limits. */
async function sendOsm(res, job, started, fallback) {
  const extra = fallback ? { fallback } : {};
  try {
    const r = await osmSearch({ ...job.osm, offset: job.osmOffset || 0, deadline: started + SEARCH_TOTAL_MS });
    return send(res, 200, { ok: true, source: "osm", textQuery: job.textQuery, places: r.places, nextPageToken: r.nextPageToken,
      total: r.total, attribution: OSM_ATTRIBUTION, attributionUrl: OSM_COPYRIGHT_URL, licence: OSM_LICENCE, note: OSM_NOTE,
      ...(r.broadened ? { broadened: r.broadened } : {}), ...(r.caveat ? { caveat: r.caveat } : {}), ...extra });
  } catch (e) {
    if (!(e instanceof OsmError)) console.error("leads-search: osm failed");
    const code = e instanceof OsmError ? e.code : "osm_busy";
    const status = code === "osm_city" ? 422 : code === "osm_type" ? 400 : code === "osm_time" ? 504 : 502;
    return send(res, status, { ok: false, code, source: "osm",
      error: e instanceof OsmError ? e.message : "OpenStreetMap search failed. Try again in a minute.", ...extra });
  }
}

