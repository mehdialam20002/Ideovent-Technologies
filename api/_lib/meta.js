/**
 * Meta Lead Ads, the server half: configuration, signatures, the database
 * link, and the small helpers the Meta functions (api/meta/*.js, with their
 * handlers in api/_lib/meta*.js) share. Spec:
 * _build/specs/meta-leads-spec.md, section 4.
 *
 * SECRETS
 * META_APP_SECRET, META_VERIFY_TOKEN, META_ACCESS_TOKEN, META_RELAY_SECRET and
 * CRON_SECRET are read in this file and nowhere else, from the Vercel SERVER
 * environment. None ever gets a VITE_ name (Vite prints those into the public
 * bundle), goes into an answer or a log line, or is sent to Supabase. The
 * database holds one-way fingerprints only (see "The database link" below).
 *
 * LOGS carry ids, counts, outcomes and classify(...).text only: never a body,
 * a token, a secret, an appsecret_proof, a URL with a query, a name, a phone
 * number, an e-mail or an answer (scripts/test-meta-webhook.mjs checks).
 *
 * No npm package: a few HTTPS calls and node:crypto, like api/_lib/razorpay.js
 * (whose helpers are small and copied here, not shared, so the payments code
 * stays untouched).
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { metaId, metaTime } from "../../src/lib/meta/fields.js";

export const GRAPH_VERSION = "v26.0";
const GRAPH_HOST = "https://graph.facebook.com";

/** The shortest a secret may be; a shorter one counts as unset and is reported "too short". */
const MIN_LENGTH = { META_APP_SECRET: 16, META_VERIFY_TOKEN: 16, META_ACCESS_TOKEN: 20, META_RELAY_SECRET: 24, CRON_SECRET: 16 };

const ENV_NAMES = ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "META_PAGE_ID", "META_ACCESS_TOKEN",
  "META_GRAPH_VERSION", "META_RELAY_SECRET", "CRON_SECRET"];

const read = (env, name) => String((env && env[name]) || "").trim();

/**
 * Tests only: META_GRAPH_BASE may point the Graph calls at a fake server on
 * this machine. Honoured ONLY for http://127.0.0.1:<port> or
 * http://localhost:<port>; any other value is ignored, so a typo in
 * production can never send the token anywhere else.
 */
function graphBase(env) {
  const v = read(env, "META_GRAPH_BASE");
  return /^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(v) ? v : GRAPH_HOST;
}

/**
 * The Meta settings, trimmed: { appId, appSecret, verifyToken, pageId,
 * accessToken, graphVersion, relaySecret, cronSecret, graphBase, tooShort }.
 * A value that is malformed or shorter than its minimum is "" here, and a too
 * short secret is named in tooShort. Never logged, never answered.
 */
export function metaConfig(env = process.env) {
  const tooShort = [];
  const secret = (name) => {
    const v = read(env, name);
    if (v && v.length < MIN_LENGTH[name]) {
      tooShort.push(name);
      return "";
    }
    return v;
  };
  const appId = read(env, "META_APP_ID");
  const pageId = read(env, "META_PAGE_ID");
  const version = read(env, "META_GRAPH_VERSION");
  return {
    appId: /^\d{1,32}$/.test(appId) ? appId : "",
    appSecret: secret("META_APP_SECRET"),
    verifyToken: secret("META_VERIFY_TOKEN"),
    pageId: /^\d{1,32}$/.test(pageId) ? pageId : "",
    accessToken: secret("META_ACCESS_TOKEN"),
    graphVersion: /^v\d{1,3}\.\d$/.test(version) ? version : GRAPH_VERSION,
    relaySecret: secret("META_RELAY_SECRET"),
    cronSecret: secret("CRON_SECRET"),
    graphBase: graphBase(env),
    tooShort,
  };
}

/** Which Meta settings are set in Vercel (true/false each), for the Meta page. Never a value. */
export function envPresence(env = process.env) {
  const cfg = metaConfig(env);
  return {
    META_APP_ID: Boolean(cfg.appId),
    META_APP_SECRET: Boolean(cfg.appSecret),
    META_VERIFY_TOKEN: Boolean(cfg.verifyToken),
    META_PAGE_ID: Boolean(cfg.pageId),
    META_ACCESS_TOKEN: Boolean(cfg.accessToken),
    META_GRAPH_VERSION: Boolean(read(env, "META_GRAPH_VERSION")),
    META_RELAY_SECRET: Boolean(cfg.relaySecret),
    CRON_SECRET: Boolean(cfg.cronSecret),
  };
}

export const META_ENV_NAMES = ENV_NAMES;

/* ─────────────────────────────── Signatures ─────────────────────────────── */

/** Lower-case hex HMAC-SHA256. `message` may be a string (UTF-8) or a Buffer. */
export const hmacHex = (message, secret) => createHmac("sha256", secret).update(message).digest("hex");

const sha256Hex = (text) => createHash("sha256").update(String(text), "utf8").digest("hex");

/** Constant-time comparison of two hex strings. False for empty or unequal lengths. */
export function sameHex(a, b) {
  const x = Buffer.from(String(a || ""), "utf8");
  const y = Buffer.from(String(b || ""), "utf8");
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Two secrets compared in constant time WITHOUT leaking their length: both are
 * hashed first, then the equal-length digests are compared. False when either
 * is empty.
 */
export function sameText(a, b) {
  const x = String(a ?? "");
  const y = String(b ?? "");
  if (!x || !y) return false;
  return timingSafeEqual(createHash("sha256").update(x, "utf8").digest(), createHash("sha256").update(y, "utf8").digest());
}

/**
 * Meta's X-Hub-Signature-256 over the RAW body: "sha256=" (any case) and 64
 * hex digits equal to HMAC-SHA256(body, META_APP_SECRET). The legacy SHA-1
 * X-Hub-Signature is ignored.
 */
export function hubSignatureOk(rawBody, header, appSecret) {
  const m = /^sha256=([0-9a-f]{64})$/i.exec(String(header || "").trim());
  if (!m || !appSecret) return false;
  return sameHex(hmacHex(rawBody, appSecret), m[1].toLowerCase());
}

/* ─────────────────────────────── The database link ─────────────────────────────── */

/*
  HOW THE SERVER PROVES ITSELF TO THE DATABASE, WITH NO SECRET IN THE DATABASE

  The functions write with the public anon key (no service_role key anywhere),
  so the database needs proof that a call comes from them and not from anyone
  holding the anon key. The proof is an INGEST TOKEN derived from the App
  Secret:

    token = HMAC-SHA256(key = META_APP_SECRET, message = INGEST_LABEL), hex

  The database keeps only SHA-256(token), in public.meta_settings (0012). It
  gets there when the owner presses Connect (api/_lib/metaConnect.js). A hash
  cannot be turned back into the token, nor the token into the secret. Meta
  signs request bodies (JSON, starting with "{") and signed_request strings
  ("<sig>.<payload>"), never this label, so no Meta signature can ever be a
  token. A new App Secret makes a new token: press Connect again.

  The Make.com relay (only if Meta blocks the app) has its own token, from
  META_RELAY_SECRET with its own label, so the two can never stand in for
  each other.
*/
const INGEST_LABEL = "ideovent:meta-leads:ingest:v1";
const RELAY_LABEL = "ideovent:meta-leads:relay:v1";

/** The token the webhook and the catch-up show the database. Never logged, never sent anywhere else. */
export const ingestToken = (appSecret) => hmacHex(INGEST_LABEL, appSecret);
/** What the database stores for it: SHA-256 of the token, lower-case hex. */
export const ingestHash = (appSecret) => sha256Hex(ingestToken(appSecret));
/** The relay's token and fingerprint, the same way. */
export const relayToken = (relaySecret) => hmacHex(RELAY_LABEL, relaySecret);
export const relayHash = (relaySecret) => sha256Hex(relayToken(relaySecret));

/* ─────────────────────────────── Meta's notifications ─────────────────────────────── */

const ID_KEYS = /"(leadgen_id|page_id|form_id|ad_id|adgroup_id|id)"\s*:\s*(\d+)/g;

/**
 * Meta's ids are 64-bit and JSON.parse turns a long number into a JS number
 * that loses the last digits (above 2^53). So the values of the id keys are
 * quoted in the raw text BEFORE parsing: "leadgen_id": 9007199254740993123
 * becomes "leadgen_id":"9007199254740993123". The signature was already
 * checked on the untouched bytes.
 */
export const quoteBigIds = (raw) => String(raw).replace(ID_KEYS, '"$1":"$2"');

/** The most lead ids one notification may carry (Meta batches at most 1,000 updates). */
export const MAX_ITEMS = 1000;

/**
 * Every leadgen change of a Page notification, as the database takes them:
 * { items: [{leadgen_id, page_id, form_id, ad_id, created_time}], invalid,
 * total }. Ids are digits as text (metaId); page_id is the change's own, else
 * the entry's id; ad_id is ad_id, else adgroup_id (the ad under its old
 * name); created_time is ISO, or null. A change without a valid leadgen_id is
 * counted as invalid and skipped. At most MAX_ITEMS.
 */
export function collectLeadgenItems(body) {
  const items = [];
  let invalid = 0;
  let total = 0;
  const entries = body && Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = entry && Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      if (!change || change.field !== "leadgen") continue;
      total++;
      const v = change.value && typeof change.value === "object" ? change.value : {};
      const leadgenId = metaId(v.leadgen_id);
      if (!leadgenId) {
        invalid++;
        continue;
      }
      if (items.length >= MAX_ITEMS) continue;
      items.push({
        leadgen_id: leadgenId,
        page_id: metaId(v.page_id) || metaId(entry.id) || null,
        form_id: metaId(v.form_id) || null,
        ad_id: metaId(v.ad_id) || metaId(v.adgroup_id) || null,
        created_time: metaTime(v.created_time) || null,
      });
    }
  }
  return { items, invalid, total };
}

/* ─────────────────────────────── Graph's errors ─────────────────────────────── */

/** Anything that looks like a Meta token, a token parameter or a proof, out of a text. */
export const scrub = (text) =>
  String(text ?? "")
    .replace(/EAA[A-Za-z0-9]{20,}/g, "[token]")
    .replace(/(access_token|input_token|appsecret_proof|client_secret)=[^&\s"]+/gi, "$1=[hidden]");

const TRANSIENT_CODES = new Set([1, 2, 4, 17, 32, 341, 368, 613]);

/**
 * A Graph answer that is not a lead, as { kind, code, subcode, text }:
 *   token       190, 102 (the token is invalid or expired)          failed, retried after a fix, alert
 *   permission  10, 200-299, 3; 100 with subcode 33 ("does not exist, cannot be loaded due to missing
 *               permissions, or does not support this operation": Meta answers it for a deleted lead AND
 *               for one this token may not read, so it is never final)          failed, retried, alert
 *   transient   1, 2, 4, 17, 32, 341, 368, 613, 80000-80014; HTTP 5xx; is_transient    pending, 503
 *   invalid     any other code 100; any other 4xx                    failed, not retried
 * `text` is "Graph <code>/<subcode> <type>" and the fbtrace_id, at most 300
 * characters, scrubbed: never Meta's whole message, never a body.
 */
export function classify(status, body) {
  const e = body && typeof body === "object" && body.error && typeof body.error === "object" ? body.error : null;
  const code = e && Number.isFinite(Number(e.code)) ? Number(e.code) : null;
  const subcode = e && Number.isFinite(Number(e.error_subcode)) ? Number(e.error_subcode) : null;
  const type = e ? clip(e.type, 40).replace(/[^A-Za-z0-9_]/g, "") : "";
  const trace = e ? clip(e.fbtrace_id, 40).replace(/[^A-Za-z0-9_-]/g, "") : "";
  let kind;
  if (code === 190 || code === 102) kind = "token";
  else if (code === 10 || code === 3 || (code !== null && code >= 200 && code <= 299)) kind = "permission";
  else if (code === 100 && subcode === 33) kind = "permission";
  else if ((code !== null && (TRANSIENT_CODES.has(code) || (code >= 80000 && code <= 80014))) || (e && e.is_transient === true)) kind = "transient";
  else if (code === 100) kind = "invalid";
  else if (status >= 500 || status === 429) kind = "transient";
  else kind = "invalid";
  const text = code !== null
    ? `Graph ${code}${subcode !== null ? "/" + subcode : ""}${type ? " " + type : ""}${trace ? " fbtrace " + trace : ""}`
    : `HTTP ${Number(status) || 0}`;
  return { kind, code, subcode, text: scrub(text).slice(0, 300) };
}

/** A failure that never reached Graph's answer: a timeout, the network, or the run's time budget. */
export const transientError = (text) => ({ kind: "transient", code: null, subcode: null, text });

/* ─────────────────────────────── Requests and answers ─────────────────────────────── */

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** Trimmed, control characters removed, cut to `max`. */
export const clip = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Only our own pages may press Connect or "Fetch missed leads now": a browser
 * always sends Origin on a POST, and it must be the host the request came to
 * (crm.ideovent.in or www.ideovent.in calling itself). A request with no
 * Origin is not a browser and gains nothing a browser could not do.
 */
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  return [request.headers.get("x-forwarded-host"), request.headers.get("host")].some((h) => h && h === host);
}

/**
 * The raw body, at most `max` bytes: { bytes } or { status: 400 | 413 }. A
 * Content-Length over the limit is refused before reading.
 */
export async function readBytes(request, max) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > max) return { status: 413 };
  const bytes = Buffer.from(await request.arrayBuffer());
  if (!bytes.length) return { status: 400 };
  if (bytes.length > max) return { status: 413 };
  return { bytes };
}
