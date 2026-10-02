/**
 * Meta's Graph API, for the Meta Lead Ads functions. Spec section 4.4.
 *
 * THE TOKEN NEVER GOES INTO A URL. Every call sends it as
 * "Authorization: Bearer <token>" and adds appsecret_proof (HMAC-SHA256 of
 * the token with META_APP_SECRET; Meta demands it once "Require App Secret"
 * is on). The one exception is debug_token, whose API takes the token it
 * checks as input_token: that URL is built only in debugToken(), and is never
 * logged, answered or put in an error text (errors come from classify(), never
 * from a URL or a fetch exception's message).
 *
 * NO URL FROM AN ANSWER IS EVER FETCHED. Every id put into a path passes
 * metaId() (digits only), including ids read from Graph's own answers, and
 * paging uses the cursor (after=...) on the fixed base, never paging.next: that
 * is an absolute URL which can carry access_token, and following it would send
 * the Bearer token wherever it points.
 *
 * TIME. Each call's timeout is the smaller of its own and what is left of the
 * run's budget (`deadline`, a Date.now() value), so the webhook answers Meta in
 * time even when Graph is slow.
 */
import { createHash } from "node:crypto";
import { classify, hmacHex, transientError } from "./meta.js";
import { metaId } from "../../src/lib/meta/fields.js";

/** The lead's own fields; ad fields come from a separate, optional call. */
const LEAD_FIELDS = "id,created_time,field_data,custom_disclaimer_responses,form_id,platform,is_organic";
const LEAD_CORE = "id,created_time,field_data,form_id";
const AD_FIELDS = "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name";
const POLL_FIELDS = `${LEAD_FIELDS},${AD_FIELDS}`;
const CURSOR_RE = /^[A-Za-z0-9_=-]{1,512}$/;
/** One form's pages in one run, at most (20,000 leads): a second stop besides the run's time budget. */
const MAX_PAGES = 400;

const root = (cfg) => `${cfg.graphBase}/${cfg.graphVersion}`;
const left = (deadline) => (deadline ? deadline - Date.now() : Infinity);

/**
 * One Graph call. `path` is built by the callers from fixed words and metaId()
 * ids only. Resolves { ok: true, body } or { ok: false, err } where err is
 * classify()'s { kind, code, subcode, text }. Never throws.
 */
async function graph(cfg, token, path, params, { timeoutMs, deadline, method = "GET", form, proof = true } = {}) {
  const ms = Math.min(timeoutMs || 4000, left(deadline));
  if (ms < 250) return { ok: false, err: transientError("out of time") };
  const url = new URL(root(cfg) + path);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, String(v));
  if (proof) url.searchParams.set("appsecret_proof", hmacHex(token, cfg.appSecret));
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
      signal: AbortSignal.timeout(Math.max(1, Math.floor(ms))),
    });
  } catch (e) {
    return { ok: false, err: transientError(e && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "network") };
  }
  // The body is read under the same timer. An answer that breaks off, or runs
  // out of time while it is read, is a passing fault like any timeout: never
  // "invalid", which is final and would drop a real lead for good.
  let text;
  try {
    text = await res.text();
  } catch (e) {
    return { ok: false, err: transientError(e && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "network") };
  }
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Graph answers in JSON. A 2xx that is not JSON came from something on the
    // way, not from Graph: pending, retried. Other statuses go by their code.
    if (res.ok) return { ok: false, err: transientError(`HTTP ${res.status}, not JSON`) };
  }
  if (!res.ok || !body || (typeof body === "object" && body.error)) return { ok: false, err: classify(res.status, body) };
  return { ok: true, body };
}

/* ─────────────────────────────── The Page token ─────────────────────────────── */

let pageCache = null; // { key, token, until }: per warm instance, 10 minutes, never logged or stored

const cacheKey = (cfg) => createHash("sha256").update(`${cfg.pageId}|${cfg.accessToken}`).digest("hex");

/** Forget the Page token (after any 190: it stopped working). */
export function clearPageToken() {
  pageCache = null;
}

/**
 * The token that reads the Page's leads: { token } or { err }. META_ACCESS_TOKEN
 * may be a Page token already (its /me is the Page). Otherwise (a system
 * user's token, section 8 step 9) the Page's own token comes from /me/accounts;
 * a system user's never expires.
 */
export async function pageToken(cfg, deadline) {
  if (!cfg.accessToken) return { err: { kind: "token", code: null, subcode: null, text: "META_ACCESS_TOKEN is not set" } };
  if (!cfg.appSecret) return { err: { kind: "token", code: null, subcode: null, text: "META_APP_SECRET is not set" } };
  if (!cfg.pageId) return { err: { kind: "token", code: null, subcode: null, text: "META_PAGE_ID is not set" } };
  const key = cacheKey(cfg);
  if (pageCache && pageCache.key === key && pageCache.until > Date.now()) return { token: pageCache.token };
  const me = await graph(cfg, cfg.accessToken, "/me", { fields: "id,name" }, { timeoutMs: 4000, deadline });
  if (!me.ok) return { err: me.err };
  let token = "";
  if (metaId(me.body.id) === cfg.pageId) {
    token = cfg.accessToken;
  } else {
    const acc = await graph(cfg, cfg.accessToken, "/me/accounts", { fields: "id,name,access_token", limit: 100 },
      { timeoutMs: 4000, deadline });
    if (!acc.ok) return { err: acc.err };
    const page = (Array.isArray(acc.body.data) ? acc.body.data : []).find((p) => p && metaId(p.id) === cfg.pageId);
    token = page && typeof page.access_token === "string" ? page.access_token : "";
    if (!token) return { err: { kind: "token", code: null, subcode: null, text: "the Page is not among this token's Pages (/me/accounts)" } };
  }
  pageCache = { key, token, until: Date.now() + 10 * 60 * 1000 };
  return { token };
}

/* ─────────────────────────────── Leads ─────────────────────────────── */

/**
 * One lead: { lead, core } or { err }. On a permission error, once more with
 * the core fields only (some fields need more than leads_retrieval: F9), and
 * then `core` is true (the consent ticks were not asked for, so they are
 * unknown, not "none"). An answer with an id but no field_data is a
 * permission error (Meta leaves out what the token may not read); one without
 * an id is invalid.
 */
export async function fetchLead(cfg, token, leadgenId, deadline) {
  const id = metaId(leadgenId);
  if (!id) return { err: { kind: "invalid", code: null, subcode: null, text: "not a lead id" } };
  let core = false;
  let r = await graph(cfg, token, `/${id}`, { fields: LEAD_FIELDS }, { timeoutMs: 4000, deadline });
  if (!r.ok && r.err.kind === "permission") {
    core = true;
    r = await graph(cfg, token, `/${id}`, { fields: LEAD_CORE }, { timeoutMs: 4000, deadline });
  }
  if (!r.ok) return { err: r.err };
  return checkLead(r.body, core);
}

function checkLead(body, core) {
  if (!body || typeof body !== "object" || !metaId(body.id)) {
    return { err: { kind: "invalid", code: null, subcode: null, text: "Graph answer without a lead id" } };
  }
  if (!Array.isArray(body.field_data)) {
    return { err: { kind: "permission", code: null, subcode: null, text: "Graph answer without field_data" } };
  }
  return { lead: body, core };
}

/** The lead's ad, ad set and campaign (ids and names), or {} on any error: organic and test leads have none. */
export async function fetchAdInfo(cfg, token, leadgenId, deadline) {
  const id = metaId(leadgenId);
  if (!id || left(deadline) < 3000) return {};
  const r = await graph(cfg, token, `/${id}`, { fields: AD_FIELDS }, { timeoutMs: 2500, deadline });
  if (!r.ok) return {};
  const out = {};
  for (const k of AD_FIELDS.split(",")) if (r.body[k] !== undefined && r.body[k] !== null) out[k] = r.body[k];
  return out;
}

const formNames = new Map(); // per warm instance: form id -> name

/** A form's name, cached per form; "" when Graph does not say. */
export async function formName(cfg, token, formId, deadline) {
  const id = metaId(formId);
  if (!id) return "";
  if (formNames.has(id)) return formNames.get(id);
  const r = await graph(cfg, token, `/${id}`, { fields: "name" }, { timeoutMs: 2500, deadline });
  const name = r.ok && typeof r.body.name === "string" ? r.body.name.slice(0, 200) : "";
  if (r.ok) formNames.set(id, name);
  return name;
}

/* ─────────────────────────────── Connect: the token and the Page ─────────────────────────────── */

/**
 * What Meta says about META_ACCESS_TOKEN: { valid, type, expiresAt (null =
 * never), scopes, appMatches } or { err }. The app's own token
 * ("<app id>|<app secret>") is the Bearer; the token checked can only go in
 * the query (input_token). This URL is built here and nowhere else, and never
 * logged, answered or put in an error.
 */
export async function debugToken(cfg, deadline) {
  if (!cfg.accessToken || !cfg.appId || !cfg.appSecret) return { err: { kind: "token", code: null, subcode: null, text: "not set" } };
  const r = await graph(cfg, `${cfg.appId}|${cfg.appSecret}`, "/debug_token", { input_token: cfg.accessToken },
    { timeoutMs: 4000, deadline, proof: false });
  if (!r.ok) return { err: r.err };
  const d = r.body && r.body.data && typeof r.body.data === "object" ? r.body.data : {};
  const exp = Number(d.expires_at);
  return {
    valid: d.is_valid === true,
    type: typeof d.type === "string" ? d.type.slice(0, 20).replace(/[^A-Z_]/gi, "") : "",
    expiresAt: Number.isFinite(exp) && exp > 0 ? new Date(exp * 1000).toISOString() : null,
    scopes: Array.isArray(d.scopes) ? d.scopes.filter((s) => typeof s === "string" && /^[a-z_]{1,60}$/.test(s)).slice(0, 60) : [],
    appMatches: metaId(d.app_id) === cfg.appId,
  };
}

/** The Page's name, or "". */
export async function pageName(cfg, token, deadline) {
  const r = await graph(cfg, token, `/${metaId(cfg.pageId)}`, { fields: "name" }, { timeoutMs: 4000, deadline });
  return r.ok && typeof r.body.name === "string" ? r.body.name.slice(0, 200) : "";
}

/**
 * The second subscription Meta needs (F6): our app on the Page, for "leadgen".
 * Adds leadgen to whatever fields the app already has, then reads back.
 * Resolves { subscribed: true|false, added, err? }.
 */
export async function ensureSubscribed(cfg, token, deadline) {
  const page = metaId(cfg.pageId);
  const ours = async () => {
    const r = await graph(cfg, token, `/${page}/subscribed_apps`, {}, { timeoutMs: 4000, deadline });
    if (!r.ok) return { err: r.err };
    const list = Array.isArray(r.body.data) ? r.body.data : [];
    const app = list.find((a) => a && metaId(a.id) === cfg.appId);
    return { fields: app && Array.isArray(app.subscribed_fields) ? app.subscribed_fields.filter((f) => typeof f === "string") : null };
  };
  const now = await ours();
  if (now.err) return { subscribed: false, added: false, err: now.err };
  if (now.fields && now.fields.includes("leadgen")) return { subscribed: true, added: false };
  const fields = [...new Set([...(now.fields || []), "leadgen"])].filter((f) => /^[a-z_]{1,40}$/.test(f));
  const post = await graph(cfg, token, `/${page}/subscribed_apps`, {}, { timeoutMs: 4000, deadline, method: "POST",
    form: { subscribed_fields: fields.join(",") } });
  if (!post.ok) return { subscribed: false, added: false, err: post.err };
  const after = await ours();
  return { subscribed: Boolean(after.fields && after.fields.includes("leadgen")), added: true, ...(after.err ? { err: after.err } : {}) };
}

/* ─────────────────────────────── The daily poll ─────────────────────────────── */

/**
 * The Page's lead forms: { forms: [{id, name, status}], more } (ACTIVE first, then Graph's order: newest
 * first) or { err }. `more`: Graph has forms past the first 100 (their leads would not be polled).
 */
export async function listForms(cfg, token, deadline) {
  const r = await graph(cfg, token, `/${metaId(cfg.pageId)}/leadgen_forms`, { fields: "id,name,status", limit: 100 },
    { timeoutMs: 4000, deadline });
  if (!r.ok) return { err: r.err };
  const forms = (Array.isArray(r.body.data) ? r.body.data : [])
    .map((f) => ({ id: metaId(f && f.id), name: typeof f?.name === "string" ? f.name.slice(0, 120) : "",
      status: typeof f?.status === "string" ? f.status.slice(0, 20).replace(/[^A-Z_]/gi, "") : "" }))
    .filter((f) => f.id);
  const rank = (f) => (f.status === "ACTIVE" ? 0 : 1);
  return { forms: forms.map((f, i) => ({ f, i })).sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i).map((x) => x.f),
    more: Boolean(r.body.paging && r.body.paging.next) };
}

/**
 * Every lead of one form created after `sinceUnix`, page by page (50 a page),
 * each page handed to `onPage(leads, { core })` at once (the catch-up stores
 * its ids before the next page is read; onPage may answer { stop: true }).
 * Pages by CURSOR on the fixed base, never by paging.next. Resolves
 * { complete, pages, read, err? }: complete only when Graph had no further
 * page, with no error, no stop and time to spare.
 *
 * THE END is a page without paging.next, and nothing else. Meta: "a page may
 * be empty but contain a next link; stop paging when the next link no longer
 * appears", so an empty page with a next link is read past. A next link
 * without a usable cursor (missing, odd, or the same one again) is not the
 * end either: complete stays false, so the catch-up keeps its window and
 * reads these leads again next time instead of skipping them for good.
 */
export async function pollForm(cfg, token, formId, sinceUnix, onPage, deadline) {
  const id = metaId(formId);
  if (!id) return { complete: false, pages: 0, read: 0, err: { kind: "invalid", code: null, subcode: null, text: "not a form id" } };
  const filtering = JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: Math.max(0, Math.floor(sinceUnix)) }]);
  let fields = POLL_FIELDS;
  let core = false;
  let after = "";
  let pages = 0;
  let read = 0;
  for (;;) {
    if (left(deadline) < 2500 || pages >= MAX_PAGES) return { complete: false, pages, read };
    const params = { fields, filtering, limit: 50, ...(after ? { after } : {}) };
    let r = await graph(cfg, token, `/${id}/leads`, params, { timeoutMs: 5000, deadline });
    if (!r.ok && r.err.kind === "permission" && !core) {
      fields = LEAD_CORE;
      core = true;
      r = await graph(cfg, token, `/${id}/leads`, { ...params, fields }, { timeoutMs: 5000, deadline });
    }
    if (!r.ok) return { complete: false, pages, read, err: r.err };
    const leads = (Array.isArray(r.body.data) ? r.body.data : []).filter((l) => l && typeof l === "object" && metaId(l.id));
    pages++;
    read += leads.length;
    if (leads.length) {
      const said = await onPage(leads, { core });
      if (said && said.stop) return { complete: false, pages, read };
    }
    const paging = r.body.paging && typeof r.body.paging === "object" ? r.body.paging : {};
    const cursor = paging.cursors && typeof paging.cursors.after === "string" ? paging.cursors.after : "";
    // paging.next is only a sign that there is more; its URL is never used.
    if (!paging.next) return { complete: true, pages, read };
    if (!CURSOR_RE.test(cursor) || cursor === after) {
      return { complete: false, pages, read, err: { kind: "invalid", code: null, subcode: null, text: "Graph paging without a usable cursor" } };
    }
    after = cursor;
  }
}
