/**
 * POST /api/poster: read a school or coaching poster with AI, for the admin.
 *
 * THE FLOW
 *
 * Mehdi photographs a poster outside a coaching centre, uploads it in /admin,
 * and this function sends it to the AI providers he has keys for, in the order
 * he chose, until one reads it. What comes back is the facts printed on the
 * poster (PosterExtract), cleaned by normalise(), plus a suggested template.
 * The admin then reviews and edits every field before a demo is created, so
 * nothing here is final. When every provider fails, the admin fills the same
 * form by hand: this function speeds the work up, it never blocks it.
 *
 * WHO MAY CALL IT
 *
 * Only a signed-in admin. The token is checked with Supabase auth, then
 * public.is_admin() is asked AS THE CALLER, and the keys are read AS THE
 * CALLER, so the RLS in 0006 is what actually guards them. No service_role key.
 *
 * SEVERAL KEYS PER PROVIDER, AND WHAT "FALLBACK" MEANS
 *
 * Since 0008 a provider can hold several keys. They are tried in the admin's
 * order: every key of the first provider, top to bottom, then every key of the
 * next provider, until one reads the poster. A key that reports a quota or
 * rate limit is parked until tomorrow (India time) BY ITS OWN ID, so the next
 * posters today go straight to that provider's next key, and once all of a
 * provider's keys are parked, straight to the next provider. Before 0008 is
 * run the table has one key per provider and this behaves exactly as it did.
 * The admin page carries the note about provider terms; this function does
 * not second-guess which keys the admin saved.
 *
 * TIME
 *
 * vercel.json gives this function 60 s. Each provider gets up to 25 s, and no
 * attempt starts unless there is time for it to finish before 52 s.
 *
 * Keys never appear in a response, a log line or ai_poster_runs.
 */
import { ADAPTERS, DEFAULT_MODELS, PROVIDERS, redact } from "./_lib/providers.js";
import { TEMPLATE_IDS, buildPrompt, chooseTemplate, normalise, parseModelJson } from "./_lib/posterExtract.js";
import { getUser, isAdmin, readKeys, recordAttempts, supabaseEnv } from "./_lib/supabaseRest.js";

const MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE = 3 * 1024 * 1024;
const PER_ATTEMPT_MS = 25_000;
const BUDGET_MS = 52_000;
const MIN_ATTEMPT_MS = 6_000;

/** YYYY-MM-DD in India. Quotas "for today" are judged on Mehdi's calendar. */
export function istDay(ms) {
  return new Date(ms + 330 * 60_000).toISOString().slice(0, 10);
}

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
  // Not pre-parsed (a runtime without Vercel's helpers): read the stream.
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/** Decoded byte length of a base64 string without decoding it. */
function base64Bytes(b64) {
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

/** Validate the request body. Returns { error, status } or the clean request. */
function parseRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, error: "Body must be a JSON object" };
  const kind = body.kind ?? "auto";
  if (!["school", "coaching", "auto"].includes(kind)) return { status: 400, error: "kind must be school, coaching or auto" };
  const templateHint = body.templateHint ?? "auto";
  if (templateHint !== "auto" && !TEMPLATE_IDS.includes(templateHint)) return { status: 400, error: "Unknown templateHint" };
  if (body.test === true) return { test: true };

  const img = body.image;
  if (!img || typeof img !== "object") return { status: 400, error: "image is required" };
  if (!MIMES.includes(img.mimeType)) return { status: 400, error: "image.mimeType must be image/jpeg, image/png or image/webp" };
  if (typeof img.data !== "string" || !img.data) return { status: 400, error: "image.data must be base64" };
  // Tolerate a data URL, and line breaks some encoders insert.
  const data = img.data.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (base64Bytes(data) > MAX_IMAGE) return { status: 413, error: "Image is larger than 3 MB. Compress it and try again." };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { status: 400, error: "image.data is not valid base64" };
  return { image: { mimeType: img.mimeType, data }, kind, templateHint };
}

/** One key, one attempt. Returns an attempt record; never throws. */
async function attempt(row, job, timeoutMs) {
  const provider = row.provider;
  const who = { provider, keyId: row.id || null, label: row.label || null };
  const model = (row.model || "").trim() || DEFAULT_MODELS[provider];
  const adapter = ADAPTERS[provider];
  try {
    if (job.test) {
      await adapter.ping({ apiKey: row.api_key, model, timeoutMs });
      return { ...who, model, status: "ok" };
    }
    const text = await adapter.read({ apiKey: row.api_key, model, image: job.image,
      prompt: buildPrompt(job.kind), timeoutMs });
    // A reply that is not JSON is this provider's failure, not the admin's:
    // record it and move on to the next one.
    const { extracted, modelTemplate } = normalise(parseModelJson(text), job.kind);
    // Nothing but `kind` means this model saw nothing it could use (a blurred
    // photo, the wrong image). Another provider may read it; say so honestly.
    if (Object.keys(extracted).length <= 1) throw new Error("Nothing readable on the poster");
    return { ...who, model, status: "ok", extracted, modelTemplate };
  } catch (e) {
    const detail = redact(e?.message || String(e), row.api_key);
    return { ...who, model, status: e?.limit ? "limit" : "error", detail };
  }
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

  const len = Number(req.headers?.["content-length"] || 0);
  if (len > 4.4 * 1024 * 1024) return send(res, 413, { ok: false, code: "too_large", error: "Image is larger than 3 MB. Compress it and try again." });

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
  if (job.error) return send(res, job.status, { ok: false, code: job.status === 413 ? "too_large" : "bad_body", error: job.error });

  let keys;
  try {
    keys = await readKeys(env, token);
  } catch (e) {
    return send(res, 502, { ok: false, code: "keys_unreadable", error: e.message });
  }
  const rows = keys.rows.filter((r) => PROVIDERS.includes(r.provider) && r.api_key);
  if (!rows.length) {
    return send(res, 422, { ok: false, code: "no_keys", error: keys.missing
      ? "The AI keys table does not exist yet. Run supabase/migrations/0006_ai_keys.sql in the Supabase SQL editor."
      : "No AI key is saved and switched on. Add one in /admin under AI keys, or fill the details by hand." });
  }

  const attempts = [];
  const logged = [];
  let winner = null;
  const today = istDay(Date.now());
  // The label tells two keys of one provider apart in the attempts list. It is
  // the admin's own name for the key ("Key 2"), never any part of the key.
  const tag = (row) => (row.label ? { label: row.label } : {});
  for (const row of rows) {
    const left = BUDGET_MS - (Date.now() - started);
    // A test pings every key, including one parked for today: the admin
    // asked, and a passing ping is how a parked key is cleared.
    if (!job.test && winner) break;
    if (!job.test && /^limit:/.test(row.last_error || "") && row.last_error_at &&
        istDay(Date.parse(row.last_error_at)) === today) {
      attempts.push({ provider: row.provider, ...tag(row), status: "skipped", error: "Out of quota today. Tried again tomorrow." });
      continue;
    }
    if (left < MIN_ATTEMPT_MS) {
      attempts.push({ provider: row.provider, ...tag(row), status: "skipped", error: "Out of time" });
      continue;
    }
    const a = await attempt(row, job, Math.min(PER_ATTEMPT_MS, left - 1000));
    attempts.push({ provider: a.provider, ...tag(row), keyId: a.keyId, model: a.model, status: a.status,
      ...(a.detail ? { error: a.detail } : {}) });
    logged.push({ provider: a.provider, keyId: a.keyId, status: a.status, detail: job.test ? `Test: ${a.detail || "ok"}` : a.detail });
    if (a.status !== "ok") console.error(`poster: ${a.provider} ${a.status}`);
    if (!job.test && a.status === "ok") winner = a;
  }

  await recordAttempts(env, token, logged);

  if (job.test) {
    // keyId lets the admin page put each result beside its own key. An id is
    // a row number, not a secret: the key itself is never in this list.
    return send(res, 200, { ok: true, test: attempts.map((a) => ({ provider: a.provider,
      ...(a.keyId ? { keyId: a.keyId } : {}), ...(a.label ? { label: a.label } : {}),
      model: a.model || DEFAULT_MODELS[a.provider], ok: a.status === "ok", ...(a.error ? { error: a.error } : {}) })) });
  }
  const listed = attempts.map(({ keyId, ...rest }) => rest);
  if (!winner) return send(res, 502, { ok: false, code: "all_failed", attempts: listed, error: "No provider could read the poster. Fill the details by hand." });

  return send(res, 200, {
    ok: true,
    provider: winner.provider,
    model: winner.model,
    extracted: winner.extracted,
    suggestedTemplate: chooseTemplate(winner.extracted, job.templateHint, winner.modelTemplate),
    attempts: listed.map(({ model, ...rest }) => rest),
  });
}
