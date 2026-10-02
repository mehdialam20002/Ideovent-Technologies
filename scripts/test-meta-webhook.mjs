/**
 * The Meta Lead Ads functions (api/meta/*.js and their handlers in api/_lib), with Graph and
 * Supabase faked, and REAL crypto: every signature below is a genuine
 * HMAC-SHA256 made the way Meta makes it. No browser, no PGlite.
 *
 *   node scripts/test-meta-webhook.mjs
 *
 * The fake Supabase does what migration 0012's functions do (the token
 * fingerprint, the ids and their states), as scripts/test-razorpay-fn.mjs
 * fakes 0010; scripts/test-meta-rls.mjs runs the real SQL. The fake Graph
 * checks every call: "Authorization: Bearer", a correct appsecret_proof, and
 * no token in any URL. Every console line the functions write is captured and
 * searched for secrets and for the fixtures' names, numbers and answers.
 *
 * PROVING THE TEST CAN FAIL
 *
 *   META_WEBHOOK_NEGATIVE=1 node scripts/test-meta-webhook.mjs
 *
 * makes the fake Meta sign with a different App Secret from the server's.
 * Every "accepted" check must then FAIL and the run must exit 1.
 *
 * Fixtures are fictional ("Test Lead One", +91 90000 0000x, @example.org, ids
 * starting 9000..., secrets like test_app_secret_not_real_0001).
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEGATIVE = Boolean(process.env.META_WEBHOOK_NEGATIVE);
const VERBOSE = Boolean(process.env.META_TEST_VERBOSE);

/* Fictional values only. None of these is a real id, token or secret. */
const APP_ID = "9900000000000001";
const APP_SECRET = "test_app_secret_not_real_0001";
const VERIFY = "test_verify_token_not_real_01";
const PAGE_ID = "9000000000000001";
const ACCESS_TOKEN = "EAATESTSYSTEMUSERTOKEN00000000000000001";
const PAGE_TOKEN = "EAATESTPAGETOKEN0000000000000000000002";
const CRON = "test_cron_secret_not_real_01";
const RELAY_SECRET = "test_relay_secret_not_real_00001";
const SUPA = "https://example-project.supabase.co";
const ANON = "anon-key-for-tests";
const ORIGIN = "https://crm.ideovent.in";
const OWNER_SESSION = "session-owner-not-real";
const MEMBER_SESSION = "session-member-not-real";

/** What "Meta" signs with. In the negative run it is not the server's secret. */
const SIGN_SECRET = NEGATIVE ? "another_app_secret_not_real_9" : APP_SECRET;
const hmac = (msg, key) => createHmac("sha256", key).update(msg).digest("hex");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
// The derivations, written out from the spec (4.9), not taken from the code under test.
const INGEST_TOKEN = hmac("ideovent:meta-leads:ingest:v1", APP_SECRET);
const INGEST_FP = sha256(INGEST_TOKEN);
const RELAY_TOKEN = hmac("ideovent:meta-leads:relay:v1", RELAY_SECRET);
const RELAY_FP = sha256(RELAY_TOKEN);

const fails = [];
let passes = 0;
function check(label, ok, detail) {
  if (ok) passes++;
  else fails.push(label);
  process.stdout.write(`${ok ? "ok   " : "FAIL "} ${label}${!ok && detail !== undefined ? `\n        ${JSON.stringify(detail).slice(0, 600)}` : ""}\n`);
}
const section = (t) => process.stdout.write(`\n${t}\n\n`);

/* Every line the functions log is kept and searched at the end. */
const logs = [];
for (const k of ["log", "error", "warn", "info"]) {
  console[k] = (...a) => {
    const line = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
    logs.push(line);
    if (VERBOSE) process.stdout.write(`        [${k}] ${line}\n`);
  };
}

/* A fake clock offset: the fake Graph can make time pass without waiting (the catch-up's budget). */
const realNow = Date.now.bind(Date);
let skew = 0;
Date.now = () => realNow() + skew;

const reply = (status, body, headers = {}) => new Response(typeof body === "string" ? body : JSON.stringify(body),
  { status, headers: { "content-type": "application/json", ...headers } });

/* ───────────────────────── The fake Supabase: 0012's functions in JS ───────────────────────── */

const USERS = { [OWNER_SESSION]: { id: "u-owner", email: "owner@example.test", admin: true },
  [MEMBER_SESSION]: { id: "u-member", email: "member@example.test", admin: false } };
const MIN = 60000;
const db = {
  settings: null,          // what Connect stored: { ingest, relay, pageId, pageName, tokenInfo, lastCatchupAt, lastPollUntil }
  ids: new Map(),          // leadgen_id -> { status, kind, attempts, updatedAt, receivedAt, crmLeadId }
  leads: new Map(),        // CRM lead id -> p_lead as stored
  missing: false,          // 0012 not run: every meta_* function is unknown (PGRST202)
  needs0011: false,        // crm_me unknown too
  refuse: null,            // { status, body } for every token call (a PostgREST error)
  cutBody: new Set(),      // functions whose 200 answer breaks off on the way (the write itself happened)
  overCap: new Set(),      // new ids the fake reports over today's cap
  pageMismatch: false,
  tooSoon: false,
  verified: 0,
  ends: [],                // meta_catchup_end calls
  calls: [],               // every rpc: { fn, args, bearer }
};
const rpcCalls = (fn) => db.calls.filter((c) => c.fn === fn);
const tokenOk = (token, relay = false) => {
  if (!db.settings || (!db.settings.ingest && !db.settings.relay)) {
    return reply(403, { code: "28000", message: "meta: the intake is not connected yet (press Connect in CRM > Settings > Meta Lead Ads)", details: null, hint: null });
  }
  const fp = typeof token === "string" && token.length <= 200 ? sha256(token) : "";
  if (fp && fp === db.settings.ingest) return "ingest";
  if (relay && fp && fp === db.settings.relay) return "relay";
  return reply(403, { code: "28000", message: "meta: the ingest token does not match (a new App Secret? press Connect again)", details: null, hint: null });
};
const fetchable = (r, channel) => r.status === "pending" || (r.status === "failed" && ["token", "permission", "transient"].includes(r.kind)
  && (channel === "catchup" || (r.attempts < 30 && Date.now() - r.updatedAt >= 10 * MIN)));
const key10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);

const FNS = {
  meta_lead_receive(a) {
    const t = tokenOk(a.p_token);
    if (t instanceof Response) return t;
    if (!Array.isArray(a.p_items) || a.p_items.length > 1000) return reply(400, { code: "22023", message: "meta: p_items must be a list of at most 1,000 items" });
    if (db.pageMismatch || a.p_page_id !== db.settings.pageId) return { fetch: [], new: 0, known: 0, otherPage: 0, overCap: 0, pageMismatch: true };
    const out = { fetch: [], new: 0, known: 0, otherPage: 0, overCap: 0, pageMismatch: false };
    for (const it of a.p_items) {
      if (!it || typeof it !== "object" || Object.values(it).some((v) => v !== null && typeof v !== "string") || !/^\d{1,32}$/.test(it.leadgen_id)) {
        return reply(400, { code: "22023", message: "meta: each item is {leadgen_id, page_id, form_id, ad_id, created_time}, as text" });
      }
      if (it.page_id !== a.p_page_id) { out.otherPage++; continue; }
      const r = db.ids.get(it.leadgen_id);
      if (r) {
        out.known++;
        if (fetchable(r, a.p_channel) && !out.fetch.includes(it.leadgen_id)) out.fetch.push(it.leadgen_id);
        continue;
      }
      if (db.overCap.has(it.leadgen_id)) { out.overCap++; continue; }
      db.ids.set(it.leadgen_id, { status: "pending", kind: null, attempts: 0, updatedAt: Date.now(), receivedAt: Date.now(), crmLeadId: null,
        formId: it.form_id, adId: it.ad_id, channel: a.p_channel });
      out.new++;
      out.fetch.push(it.leadgen_id);
    }
    return out;
  },
  meta_lead_ingest(a) {
    const t = tokenOk(a.p_token, true);
    if (t instanceof Response) return t;
    if (!/^\d{1,32}$/.test(String(a.p_leadgen_id)) || !a.p_lead || typeof a.p_lead !== "object") return reply(400, { code: "22023", message: "meta: bad input" });
    let r = db.ids.get(a.p_leadgen_id);
    if (!r) {
      if (db.overCap.has(a.p_leadgen_id)) return { result: "over_cap" };
      r = { status: "pending", kind: null, attempts: 0, updatedAt: Date.now(), receivedAt: Date.now(), crmLeadId: null, channel: t === "relay" ? "relay" : a.p_channel };
      db.ids.set(a.p_leadgen_id, r);
    }
    if (["created", "duplicate", "gone"].includes(r.status)) return { result: "already", leadId: r.crmLeadId };
    const l = a.p_lead;
    const dup = [...db.leads.entries()].find(([, x]) => (l.phone && key10(x.phone) === key10(l.phone)) || (l.email && x.email && x.email.toLowerCase() === l.email.toLowerCase()));
    Object.assign(r, { updatedAt: Date.now(), kind: null });
    if (dup) {
      Object.assign(r, { status: "duplicate", crmLeadId: dup[0] });
      return { result: "duplicate", leadId: dup[0], assignedTo: null };
    }
    const id = `ol_meta_${a.p_leadgen_id}`;
    db.leads.set(id, { ...l, metaLeadId: a.p_leadgen_id, channel: t === "relay" ? "relay" : a.p_channel });
    Object.assign(r, { status: "created", crmLeadId: id });
    return { result: "created", leadId: id, assignedTo: null };
  },
  meta_lead_failed(a) {
    const t = tokenOk(a.p_token);
    if (t instanceof Response) return t;
    skew += db.failedCostMs || 0; // a slow database: each call costs this much of the budget
    const r = db.ids.get(a.p_leadgen_id);
    if (!r) return { status: null, attempts: 0 };
    if (!["pending", "failed"].includes(r.status)) return { status: r.status, attempts: r.attempts };
    r.status = a.p_kind === "transient" ? "pending" : a.p_kind === "not_found" ? "gone" : "failed";
    Object.assign(r, { attempts: r.attempts + 1, kind: a.p_kind, lastError: a.p_detail, updatedAt: Date.now() });
    return { status: r.status, attempts: r.attempts };
  },
  meta_retry_due(a) {
    const t = tokenOk(a.p_token);
    if (t instanceof Response) return t;
    return dueIds(a.p_limit, a.p_wait);
  },
  meta_catchup_begin(a) {
    const t = tokenOk(a.p_token);
    if (t instanceof Response) return t;
    if (db.pageMismatch || a.p_page_id !== db.settings.pageId) return { ok: false, reason: "page_mismatch" };
    if (db.tooSoon) return { ok: false, reason: "too_soon", nextAt: new Date(Date.now() + 30 * MIN).toISOString() };
    db.settings.lastCatchupAt = Date.now();
    return { ok: true, since: new Date(db.settings.lastPollUntil || Date.now() - 3 * 86400000).toISOString(), retry: dueIds(25, !a.p_force) };
  },
  meta_catchup_end(a) {
    const t = tokenOk(a.p_token);
    if (t instanceof Response) return t;
    db.ends.push({ until: a.p_until, forms: a.p_forms, stats: a.p_stats });
    if (a.p_until && (!db.settings.lastPollUntil || Date.parse(a.p_until) > db.settings.lastPollUntil)) db.settings.lastPollUntil = Date.parse(a.p_until);
    return null;
  },
  meta_log_verified(a) {
    const t = tokenOk(a.p_token);
    if (t instanceof Response) return t;
    db.verified++;
    return null;
  },
};
function dueIds(limit = 25, wait = true) {
  return [...db.ids.entries()]
    .filter(([, r]) => (r.status === "pending" || (r.status === "failed" && ["token", "permission", "transient"].includes(r.kind)))
      && r.attempts < 30 && (!wait || Date.now() - r.updatedAt >= 10 * MIN))
    .sort((x, y) => x[1].receivedAt - y[1].receivedAt).slice(0, Math.min(Math.max(limit || 25, 1), 50)).map(([id]) => id);
}

/** The owner's functions: his session decides. */
const OWNER_FNS = {
  meta_connect(a) {
    if (!/^[0-9a-f]{64}$/.test(a.p_ingest_sha256 || "") && !/^[0-9a-f]{64}$/.test(a.p_relay_sha256 || "")) return reply(400, { code: "22023", message: "meta: Connect needs at least one fingerprint" });
    db.settings = { ...(db.settings || {}), ingest: a.p_ingest_sha256 || null, relay: a.p_relay_sha256 || null, pageId: a.p_page_id,
      pageName: a.p_page_name, tokenInfo: a.p_token_info };
    return { connectedAt: new Date().toISOString() };
  },
  meta_intake_status(a) {
    const s = db.settings || {};
    return { connected: Boolean(s.ingest || s.relay), current: Boolean(s.ingest) && s.ingest === a.p_ingest_sha256, pageId: s.pageId || null,
      pageName: s.pageName || null, assignMode: "pool", dailyCap: 300, counts: { pending: [...db.ids.values()].filter((r) => r.status === "pending").length } };
  },
  meta_set_settings: () => ({ assignMode: "pool", dailyCap: 300 }),
};

function fakeSupabase(url, method, headers, body) {
  const bearer = /^Bearer (.+)$/.exec(headers.get("authorization") || "")?.[1] || null;
  const user = USERS[bearer];
  if (headers.get("apikey") !== ANON) return reply(401, { message: "no apikey" });
  if (url.endsWith("/auth/v1/user")) return user ? reply(200, { id: user.id, email: user.email }) : reply(401, { message: "invalid JWT" });
  const fn = (/\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url) || [])[1];
  if (!fn || method !== "POST") return reply(404, { code: "PGRST202", message: "not found" });
  db.calls.push({ fn, args: body, bearer });
  if (fn === "is_admin") return reply(200, JSON.stringify(Boolean(user && user.admin)));
  if (fn === "crm_me") return db.needs0011 ? reply(404, { code: "PGRST202", message: "Could not find the function public.crm_me" }) : reply(200, { role: user && user.admin ? "owner" : null });
  if (db.missing && fn.startsWith("meta_")) return reply(404, { code: "PGRST202", message: `Could not find the function public.${fn}`, details: null, hint: null });
  if (FNS[fn]) {
    // The token functions run as anon: a session here would be a bug (PostgREST would run them as that person).
    if (bearer) return reply(401, { code: "42501", message: `permission denied for function ${fn}` });
    if (db.refuse) return reply(db.refuse.status, db.refuse.body);
    const out = FNS[fn](body);
    if (db.cutBody.has(fn) && !(out instanceof Response)) {
      return new Response(new ReadableStream({ start(c) { c.error(new TypeError("terminated")); } }),
        { status: 200, headers: { "content-type": "application/json" } });
    }
    return out instanceof Response ? out : reply(200, JSON.stringify(out));
  }
  if (OWNER_FNS[fn]) {
    if (!user) return reply(401, { code: "42501", message: `permission denied for function ${fn}` });
    if (!user.admin) return reply(403, { code: "42501", message: "meta: only Mehdi connects Meta Lead Ads" });
    const out = OWNER_FNS[fn](body);
    return out instanceof Response ? out : reply(200, JSON.stringify(out));
  }
  return reply(404, { code: "PGRST202", message: "not found" });
}

/* ───────────────────────── The fake Graph API ───────────────────────── */

const SYSTEM_USER_ID = "8800000000000001";
const graph = {
  leads: new Map(),      // lead id -> the Graph lead
  fail: new Map(),       // lead id -> { status, body } (every call), or "hang", or "noFieldData", or "noId", or "coreOnly"
  adFail: new Set(),     // lead ids whose ad-info call answers 403
  forms: [],             // [{ id, name, status }]
  formLeads: new Map(),  // form id -> [leads], 50 a page
  pageSkewMs: 0,         // fake time each /leads page takes (the catch-up's budget)
  subscribed: ["feed"],  // our app's fields on the Page
  scopes: ["leads_retrieval", "pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_ads", "ads_management", "ads_read"],
  meMode: "system",      // "system": META_ACCESS_TOKEN is a system user's; "page": it is the Page token
  meFail: null,          // { status, body } for /me
  hangAll: false,
  calls: [],             // { path, params, method, auth }
  violations: [],        // anything a real Graph would refuse, or that leaks a token
  stray: [],             // requests to any other host
};
const graphCalls = (re) => graph.calls.filter((c) => re.test(c.path));
const gErr = (status, code, subcode, type = "OAuthException") => ({ status, body: { error: { message: "fictional", type, code, ...(subcode ? { error_subcode: subcode } : {}), fbtrace_id: "Atrace123" } } });
const hang = (init) => new Promise((_, rej) => {
  const s = init && init.signal;
  if (s) s.addEventListener("abort", () => rej(s.reason || Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
});
const LEAD_CORE = "id,created_time,field_data,form_id";

async function fakeGraph(u, method, headers, init) {
  const path = u.pathname.replace(/^\/v26\.0/, "");
  const params = Object.fromEntries(u.searchParams);
  const token = (/^Bearer (.+)$/.exec(headers.get("authorization") || "") || [])[1] || "";
  graph.calls.push({ path, params, method, token, url: u.href });
  if (!u.pathname.startsWith("/v26.0/")) graph.violations.push(`not v26.0: ${u.pathname}`);
  if (u.searchParams.has("access_token")) graph.violations.push(`access_token in a URL: ${path}`);
  if (path !== "/debug_token" && u.href.includes(ACCESS_TOKEN)) graph.violations.push(`the access token in a URL: ${path}`);
  if (u.href.includes(PAGE_TOKEN)) graph.violations.push(`the Page token in a URL: ${path}`);
  if (graph.hangAll) return hang(init);

  if (path === "/debug_token") {
    if (token !== `${APP_ID}|${APP_SECRET}`) { graph.violations.push("debug_token without the app token"); return reply(400, gErr(400, 190).body); }
    return reply(200, { data: { app_id: APP_ID, type: "SYSTEM_USER", application: "Ideovent Leads", is_valid: params.input_token === ACCESS_TOKEN,
      expires_at: 0, scopes: graph.scopes } });
  }
  if (params.appsecret_proof !== hmac(token, APP_SECRET)) {
    graph.violations.push(`no valid appsecret_proof on ${path}`);
    return reply(400, gErr(400, 100, null, "GraphMethodException").body);
  }
  if (path === "/me" || path === "/me/accounts") {
    if (token !== ACCESS_TOKEN) graph.violations.push(`${path} with another token`);
    if (graph.meFail) return reply(graph.meFail.status, graph.meFail.body);
    if (path === "/me") return reply(200, graph.meMode === "page" ? { id: PAGE_ID, name: "Ideovent" } : { id: SYSTEM_USER_ID, name: "ideovent-crm-server" });
    return reply(200, { data: [{ id: "9000000000000099", name: "Another Page", access_token: "EAAANOTHERPAGETOKEN000000000000000003" },
      { id: PAGE_ID, name: "Ideovent", access_token: PAGE_TOKEN }] });
  }
  const pageTok = graph.meMode === "page" ? ACCESS_TOKEN : PAGE_TOKEN;
  if (token !== pageTok) { graph.violations.push(`${path} without the Page token`); return reply(400, gErr(400, 190).body); }
  let m;
  if ((m = /^\/(\d+)\/subscribed_apps$/.exec(path))) {
    if (method === "POST") {
      graph.subscribed = (new URLSearchParams(String(init.body || "")).get("subscribed_fields") || "").split(",").filter(Boolean);
      return reply(200, { success: true });
    }
    return reply(200, { data: [{ id: APP_ID, name: "Ideovent Leads", subscribed_fields: graph.subscribed }] });
  }
  if (/^\/\d+\/leadgen_forms$/.test(path)) return reply(200, { data: graph.forms, ...(graph.formsMore ? { paging: { next: "https://evil.example/more" } } : {}) });
  if ((m = /^\/(\d+)\/leads$/.exec(path))) {
    skew += graph.pageSkewMs;
    const formFail = graph.fail.get(m[1]);
    if (formFail && typeof formFail === "object") return reply(formFail.status, formFail.body);
    const all = graph.formLeads.get(m[1]) || [];
    // Meta: "a page may be empty but contain a next link; stop paging when the next link no longer appears".
    if (graph.emptyFirstPage && !params.after) {
      return reply(200, { data: [], paging: { cursors: { after: "cur_0" }, next: `https://evil.example/v26.0/${m[1]}/leads?after=cur_0` } });
    }
    const start = params.after ? Number(String(params.after).replace("cur_", "")) : 0;
    const page = all.slice(start, start + Number(params.limit || 50));
    const end = start + page.length;
    return reply(200, { data: page, paging: { cursors: { before: `cur_${start}`, after: graph.badCursor ? "not a cursor!" : `cur_${end}` },
      // A hostile next link: another host, with the token in its query. Following it is a failure.
      ...(end < all.length ? { next: `https://evil.example/v26.0/${m[1]}/leads?access_token=${pageTok}&after=cur_${end}` } : {}) } });
  }
  if ((m = /^\/(\d+)$/.exec(path))) {
    const id = m[1];
    const fields = params.fields || "";
    if (id === PAGE_ID) return reply(200, { id, name: "Ideovent" });
    if (fields === "name") {
      const form = graph.forms.find((f) => f.id === id);
      return form ? reply(200, { id, name: form.name }) : reply(400, gErr(400, 100, null, "GraphMethodException").body);
    }
    const f = graph.fail.get(id);
    if (f === "hang") return hang(init);
    // A 200 whose body breaks off on the way (a reset connection), and a 200 that is not JSON (a proxy's page).
    if (f === "cutBody") {
      return new Response(new ReadableStream({ start(c) { c.error(new TypeError("terminated")); } }),
        { status: 200, headers: { "content-type": "application/json" } });
    }
    if (f === "notJson") return reply(200, "<html>Sorry, something went wrong.</html>", { "content-type": "text/html" });
    const lead = graph.leads.get(id);
    if (fields.startsWith("ad_id")) {
      if (graph.adFail.has(id) || !lead) return reply(403, gErr(403, 200).body);
      return reply(200, Object.fromEntries(fields.split(",").filter((k) => lead[k] !== undefined).map((k) => [k, lead[k]])));
    }
    if (f === "noFieldData") return reply(200, { id, created_time: "2026-10-02T08:35:00+0000" });
    if (f === "noId") return reply(200, { created_time: "2026-10-02T08:35:00+0000", field_data: [] });
    if (f === "coreOnly" && fields !== LEAD_CORE) return reply(400, gErr(400, 200, null, "OAuthException").body);
    if (f && typeof f === "object") return reply(f.status, f.body);
    if (!lead) return reply(400, gErr(400, 100, 33, "GraphMethodException").body);
    return reply(200, Object.fromEntries(fields.split(",").filter((k) => lead[k] !== undefined).map((k) => [k, lead[k]])));
  }
  return reply(400, gErr(400, 100, null, "GraphMethodException").body);
}

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  if (url.startsWith(SUPA)) {
    if (db.down) throw new TypeError("fetch failed");
    let body = null;
    try { body = init.body ? JSON.parse(init.body) : null; } catch { body = null; }
    return fakeSupabase(url, method, headers, body);
  }
  const u = new URL(url);
  if (u.origin === "https://graph.facebook.com") return fakeGraph(u, method, headers, init);
  graph.stray.push(url);
  return reply(599, { error: "unexpected host" });
};

/* ───────────────────────── Fixtures, requests, environment ───────────────────────── */

const FORM_ID = "9100000000000001";
const AD_ID = "9200000000000001";
/** A lead as Graph gives it. */
function graphLead(id, { phone = "+91 90000 00001", email = "test.one@example.org", name = "Test Lead One", business = "Example Classes", extra = [], ...over } = {}) {
  return {
    id, created_time: "2026-10-02T08:35:00+0000", form_id: FORM_ID, platform: "ig", is_organic: false,
    field_data: [
      { name: "full_name", values: [name] }, { name: "phone_number", values: [phone] }, { name: "email", values: [email] },
      { name: "company_name", values: [business] }, { name: "city", values: ["Patna"] },
      { name: "what_type_of_business_do_you_run?", values: ["Coaching institute"] }, ...extra,
    ],
    custom_disclaimer_responses: [{ checkbox_key: "contact_ok", is_checked: "1" }],
    ad_id: AD_ID, ad_name: "Video 1", adset_id: "9300000000000001", adset_name: "Patna 25-45",
    campaign_id: "9400000000000001", campaign_name: "Test campaign", ...over,
  };
}
graph.forms = [{ id: FORM_ID, name: "Website enquiry", status: "ACTIVE" }];
const change = (id, over = {}) => ({ leadgen_id: id, page_id: PAGE_ID, form_id: FORM_ID, ad_id: AD_ID, created_time: 1759394100, ...over });
const notification = (values, { object = "page", entryId = PAGE_ID } = {}) =>
  JSON.stringify({ object, entry: [{ id: entryId, time: 1759394100, changes: values.map((v) => ({ field: "leadgen", value: v })) }] });
const signature = (body, secret = SIGN_SECRET) => "sha256=" + hmac(Buffer.from(body, "utf8"), secret);
function metaPost(body, { sig, headers = {} } = {}) {
  return new Request("https://www.ideovent.in/api/meta/webhook", { method: "POST",
    headers: { "content-type": "application/json", ...(sig === null ? {} : { "x-hub-signature-256": sig === undefined ? signature(body) : sig }), ...headers }, body });
}
const read = async (res) => {
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch { /* text */ }
  return { status: res.status, body, text, type: res.headers.get("content-type") || "" };
};

const ENV_KEYS = ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "META_PAGE_ID", "META_ACCESS_TOKEN", "META_GRAPH_VERSION", "META_RELAY_SECRET",
  "CRON_SECRET", "META_GRAPH_BASE", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
const FULL_ENV = { META_APP_ID: APP_ID, META_APP_SECRET: APP_SECRET, META_VERIFY_TOKEN: VERIFY, META_PAGE_ID: PAGE_ID, META_ACCESS_TOKEN: ACCESS_TOKEN,
  CRON_SECRET: CRON, META_RELAY_SECRET: RELAY_SECRET, VITE_SUPABASE_URL: SUPA, VITE_SUPABASE_ANON_KEY: ANON };
function setEnv(over = {}) {
  for (const k of ENV_KEYS) delete process.env[k];
  for (const [k, v] of Object.entries({ ...FULL_ENV, ...over })) if (v !== undefined && v !== null) process.env[k] = v;
}
/** Back to a connected database with nothing in it, and a quiet Graph. */
function fresh({ connected = true } = {}) {
  Object.assign(db, { settings: connected ? { ingest: INGEST_FP, relay: RELAY_FP, pageId: PAGE_ID, pageName: "Ideovent", tokenInfo: {} } : null,
    missing: false, needs0011: false, refuse: null, pageMismatch: false, tooSoon: false, down: false, verified: 0, failedCostMs: 0 });
  db.ids.clear(); db.leads.clear(); db.overCap.clear(); db.cutBody.clear(); db.calls.length = 0; db.ends.length = 0;
  graph.fail.clear(); graph.adFail.clear(); graph.calls.length = 0; graph.hangAll = false; graph.meFail = null; graph.pageSkewMs = 0;
}

// The two Vercel functions. /api/meta/connect and /api/meta/relay reach api/meta/webhook.js through
// vercel.json's rewrites; the requests below carry those addresses, so its routing is tested too.
const webhook = await import("../api/meta/webhook.js");
const connect = webhook;
const relay = webhook;
const catchup = await import("../api/meta/catchup.js");
const lib = await import("../api/_lib/meta.js");

/* ───────────────────────── 1. The handshake (GET) ───────────────────────── */

section("1. Meta's verification handshake");
{
  setEnv();
  fresh();
  const hs = (q) => webhook.GET(new Request(`https://www.ideovent.in/api/meta/webhook?${q}`));
  const challenge = "1158201444";
  const good = await read(await hs(`hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY)}&hub.challenge=${challenge}`));
  check("the right token: 200, text/plain, the challenge and nothing else", good.status === 200 && good.text === challenge && /^text\/plain/.test(good.type), good);
  check("...and the database notes that Meta verified the webhook (with the ingest token)", db.verified === 1 && rpcCalls("meta_log_verified")[0]?.args.p_token === INGEST_TOKEN, db.verified);
  const wrong = await read(await hs(`hub.mode=subscribe&hub.verify_token=not-the-token&hub.challenge=${challenge}`));
  const mode = await read(await hs(`hub.mode=unsubscribe&hub.verify_token=${encodeURIComponent(VERIFY)}&hub.challenge=${challenge}`));
  check("a wrong token, or another mode: 403", wrong.status === 403 && mode.status === 403, { wrong, mode });
  const script = await read(await hs(`hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY)}&hub.challenge=${encodeURIComponent("<script>alert(1)</script>")}`));
  check("a challenge that is not a plain word (<script>): 400, never echoed", script.status === 400 && !script.text.includes("script"), script);
  check("no answer carries the verify token", ![good, wrong, mode, script].some((r) => r.text.includes(VERIFY)));
  setEnv({ META_VERIFY_TOKEN: undefined });
  const off = await read(await hs(`hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY)}&hub.challenge=${challenge}`));
  setEnv({ META_VERIFY_TOKEN: "short" });
  const short = await read(await hs(`hub.mode=subscribe&hub.verify_token=short&hub.challenge=${challenge}`));
  check("no META_VERIFY_TOKEN (or one under 16 characters): 503", off.status === 503 && short.status === 503, { off, short });
  setEnv();
}

/* ───────────────────────── 2. The signature ───────────────────────── */

section("2. The signature over the raw bytes");
const L1 = "9000000000000101";
{
  setEnv();
  fresh();
  graph.leads.set(L1, graphLead(L1));
  const body = notification([change(L1)]);
  const ok1 = await read(await webhook.POST(metaPost(body)));
  check("a genuine X-Hub-Signature-256 over the raw bytes: accepted, the lead is created", ok1.status === 200 && ok1.body?.created === 1 && db.leads.has(`ol_meta_${L1}`), ok1);
  check("the database got the id with the ingest token and no session", rpcCalls("meta_lead_receive")[0]?.args.p_token === INGEST_TOKEN
    && rpcCalls("meta_lead_receive")[0]?.bearer === null);

  fresh();
  const before = { db: db.calls.length, graph: graph.calls.length };
  const respaced = JSON.stringify(JSON.parse(body), null, 2);
  const cases = [
    ["no signature", metaPost(body, { sig: null })],
    ["a sha1= signature (the legacy header)", metaPost(body, { sig: "sha1=" + createHmac("sha1", SIGN_SECRET).update(body).digest("hex") })],
    ["wrong hex", metaPost(body, { sig: "sha256=" + "0".repeat(64) })],
    ["the wrong length", metaPost(body, { sig: signature(body).slice(0, 60) })],
    ["a body changed by one byte", metaPost(body.replace(L1, L1.slice(0, -1) + "2"), { sig: signature(body) })],
    ["the same JSON with other spacing", metaPost(respaced, { sig: signature(body) })],
    ["a signature made with another secret", metaPost(body, { sig: signature(body, "another_app_secret_not_real_9") })],
  ];
  for (const [label, req] of cases) {
    const r = await read(await webhook.POST(req));
    check(`${label}: 401`, r.status === 401 && r.body?.error === "bad signature", r);
  }
  check("...and none of those reached the database or Graph", db.calls.length === before.db && graph.calls.length === before.graph,
    { db: db.calls.map((c) => c.fn), graph: graph.calls.map((c) => c.path) });
  const upper = await read(await webhook.POST(metaPost(body, { sig: "SHA256=" + signature(body).slice(7).toUpperCase() })));
  check("the prefix in any case and the hex in capitals: accepted", upper.status === 200, upper);
  setEnv({ META_APP_SECRET: undefined });
  const off = await read(await webhook.POST(metaPost(body)));
  setEnv({ META_APP_SECRET: "" });
  const empty = await read(await webhook.POST(metaPost(body)));
  setEnv();
  check("no META_APP_SECRET, or an empty one: 503 (nothing can be verified; Meta retries)", off.status === 503 && empty.status === 503, { off, empty });
}

/* ───────────────────────── 3. Sizes and shapes ───────────────────────── */

section("3. Sizes and shapes");
{
  setEnv();
  fresh();
  const emptyRes = await read(await webhook.POST(metaPost("", { sig: signature("") })));
  check("an empty body: 400", emptyRes.status === 400, emptyRes);
  const huge = "x".repeat(1024 * 1024 + 1);
  const hugeRes = await read(await webhook.POST(metaPost(huge, { sig: signature(huge) })));
  check("1 MiB + 1 byte: 413", hugeRes.status === 413, hugeRes.status);
  const notJson = "object=page&entry=1";
  const nj = await read(await webhook.POST(metaPost(notJson)));
  check("a signed body that is not JSON: 400", nj.status === 400, nj);
  const user = notification([change("9000000000000102")], { object: "user" });
  const u = await read(await webhook.POST(metaPost(user)));
  check("object \"user\": 200, ignored, nothing stored", u.status === 200 && u.body?.ignored === true && !rpcCalls("meta_lead_receive").length, u);
  const other = JSON.stringify({ object: "page", entry: [{ id: PAGE_ID, changes: [{ field: "feed", value: { item: "post" } }] }] });
  const o = await read(await webhook.POST(metaPost(other)));
  check("a Page change that is not leadgen: 200, nothing stored", o.status === 200 && o.body?.leads === 0 && !rpcCalls("meta_lead_receive").length, o);
  const values = Array.from({ length: 1001 }, (_, i) => change(`90000000100${String(i).padStart(5, "0")}`));
  graph.hangAll = false;
  db.pageMismatch = true; // nothing is fetched; only what reached the database counts
  const many = await read(await webhook.POST(metaPost(notification(values))));
  const got = rpcCalls("meta_lead_receive").at(-1)?.args.p_items.length;
  check("1,001 changes in one notification: 1,000 reach the database", got === 1000, { got, status: many.status });
  db.pageMismatch = false;
}

/* ───────────────────────── 4. Ids above 2^53, and the mapping ───────────────────────── */

section("4. Precision and mapping");
const ingested = (id) => rpcCalls("meta_lead_ingest").filter((c) => c.args.p_leadgen_id === id);
{
  setEnv();
  fresh();
  const BIG = "9007199254740993123";
  graph.leads.set(BIG, graphLead(BIG, { phone: "+91 90000 00002", email: "test.two@example.org" }));
  // Raw text with the ids as JSON numbers, as Meta may send them; ad_id missing, adgroup_id given.
  const raw = `{"object":"page","entry":[{"id":${PAGE_ID},"time":1759394100,"changes":[{"field":"leadgen","value":`
    + `{"leadgen_id":${BIG},"page_id":${PAGE_ID},"form_id":${FORM_ID},"adgroup_id":${AD_ID},"created_time":1759394100}}]}]}`;
  const r = await read(await webhook.POST(metaPost(raw)));
  const item = rpcCalls("meta_lead_receive")[0]?.args.p_items[0];
  check("a 19-digit lead id reaches the database unchanged, as text", item?.leadgen_id === BIG && typeof item.leadgen_id === "string", item);
  check("...and the Graph URL unchanged", graph.calls.some((c) => c.path === `/${BIG}`), graph.calls.map((c) => c.path));
  check("...and the lead is ol_meta_<that id>", r.status === 200 && db.leads.get(`ol_meta_${BIG}`)?.metaLeadId === BIG, r);
  check("adgroup_id stands in for a missing ad_id (the ad under its old name)", item?.ad_id === AD_ID && item?.page_id === PAGE_ID
    && item?.created_time === new Date(1759394100 * 1000).toISOString(), item);

  fresh();
  const L = "9000000000000103";
  graph.leads.set(L, graphLead(L, { phone: "+91 90000 00003", email: "Test.Three@Example.org",
    business: "Sun\u202Erise\u200B Classes", extra: [{ name: "Your WhatsApp number", values: ["+91 90000 00009"] }, { name: "How many students?", values: ["200-500"] }],
    custom_disclaimer_responses: [{ checkbox_key: "contact_ok", is_checked: "1" }, { checkbox_key: "terms", is_checked: true }] }));
  const res2 = await read(await webhook.POST(metaPost(notification([change(L)]))));
  const p = ingested(L)[0]?.args.p_lead || {};
  const want = {
    instituteName: "Sunrise Classes", kind: "coaching", contactName: "Test Lead One", phone: "+919000000003", whatsapp: "+919000000009",
    email: "test.three@example.org", city: "Patna", source: "Instagram Lead Ads", metaLeadId: L, metaPlatform: "ig", metaFormId: FORM_ID,
    metaFormName: "Website enquiry", metaCampaignId: "9400000000000001", metaCampaignName: "Test campaign", metaAdsetId: "9300000000000001",
    metaAdsetName: "Patna 25-45", metaAdId: AD_ID, metaAdName: "Video 1", metaCreatedAt: "2026-10-02T08:35:00.000Z", metaOrganic: "no", metaConsent: "yes",
  };
  const keys = Object.keys(p).filter((k) => k !== "notes").sort();
  check("the lead the database gets: title, kind, contacts, source, campaign, ad, time, organic, consent, exactly",
    res2.status === 200 && JSON.stringify(keys) === JSON.stringify(Object.keys(want).sort()) && Object.keys(want).every((k) => p[k] === want[k]), { p, want });
  check("the title has no direction or invisible characters (U+202E, U+200B)", p.instituteName === "Sunrise Classes", p.instituteName);
  const notes = String(p.notes || "").split("\n");
  check("the notes: where it came from, the consent tick, then every answer as given",
    notes[0] === "Meta lead form, Instagram, 2 Oct 2026, 14:05 IST" && notes[1] === "Form: Website enquiry · Campaign: Test campaign · Ad set: Patna 25-45 · Ad: Video 1"
      && notes[2] === "Consent tick: ticked" && notes[3] === "Answers:" && notes.includes("How many students?: 200-500") && notes.includes("full_name: Test Lead One"), notes);
  check("the ingest goes with the ingest token, channel webhook, the Page id", ingested(L)[0]?.args.p_token === INGEST_TOKEN
    && ingested(L)[0]?.args.p_channel === "webhook" && ingested(L)[0]?.args.p_page_id === PAGE_ID);

  fresh();
  const N = "9000000000000104";
  graph.leads.set(N, graphLead(N, { phone: "+91 90000 00004", email: "test.four@example.org" }));
  graph.adFail.add(N);
  const res3 = await read(await webhook.POST(metaPost(notification([change(N)]))));
  const q = ingested(N)[0]?.args.p_lead || {};
  check("the ad-info call failing (403) still ingests the lead, without ad names (the webhook's ad id is kept by the database)",
    res3.status === 200 && db.leads.has(`ol_meta_${N}`) && !q.metaCampaignName && !q.metaAdName && q.metaFormName === "Website enquiry", { res3, q });
}

/* ───────────────────────── 5. Idempotency and replay ───────────────────────── */

section("5. Idempotency and replay");
{
  setEnv();
  fresh();
  const L = "9000000000000105";
  graph.leads.set(L, graphLead(L, { phone: "+91 90000 00005", email: "test.five@example.org" }));
  const body = notification([change(L)]);
  const first = await read(await webhook.POST(metaPost(body)));
  const second = await read(await webhook.POST(metaPost(body)));
  check("the same signed POST twice: both 200, one ingest, one lead", first.status === 200 && second.status === 200
    && ingested(L).length === 1 && [...db.leads.keys()].filter((k) => k === `ol_meta_${L}`).length === 1, { first, second, n: ingested(L).length });
  check("...the second asked Graph for nothing", graph.calls.filter((c) => c.path === `/${L}`).length === 2, graph.calls.map((c) => c.path));

  const T = "9000000000000106";
  graph.leads.set(T, graphLead(T, { phone: "+91 90000 00006", email: "test.six@example.org" }));
  graph.fail.set(T, gErr(400, 190, 463));
  const tb = notification([change(T)]);
  const r1 = await read(await webhook.POST(metaPost(tb)));
  const before = graph.calls.filter((c) => c.path === `/${T}`).length;
  skew += 60000;
  const r2 = await read(await webhook.POST(metaPost(tb)));
  check("an id that failed for its token, posted again a minute later (a replay): 200, and Graph is not asked again",
    r1.status === 200 && r2.status === 200 && graph.calls.filter((c) => c.path === `/${T}`).length === before && db.ids.get(T)?.status === "failed", { r1, r2 });
}

/* ───────────────────────── 6. When Graph will not give us the lead ───────────────────────── */

section("6. Graph's errors");
const failedCall = (id) => rpcCalls("meta_lead_failed").filter((c) => c.args.p_leadgen_id === id).at(-1)?.args;
let phoneSeq = 10;
async function postOne(id, mode, { lead = true } = {}) {
  if (lead) graph.leads.set(id, graphLead(id, { phone: `+91 90000 000${++phoneSeq}`, email: `test.${phoneSeq}@example.org` }));
  if (mode) graph.fail.set(id, mode);
  return read(await webhook.POST(metaPost(notification([change(id)]))));
}
{
  setEnv();
  fresh();
  const meBefore = graphCalls(/^\/me$/).length;
  const t = await postOne("9000000000000111", gErr(400, 190, 463));
  const ft = failedCall("9000000000000111");
  check("Graph 190 (the token): meta_lead_failed(token), and 200 (only a person can fix it)", t.status === 200 && ft?.p_kind === "token"
    && /^Graph 190\/463 OAuthException/.test(ft?.p_detail || ""), { t, ft });
  await postOne("9000000000000112", null);
  check("...and the Page token is not kept after a 190: the next delivery asks /me again", graphCalls(/^\/me$/).length === meBefore + 2, graphCalls(/^\/me$/).length);
  const p10 = await postOne("9000000000000113", gErr(403, 10));
  check("code 10: permission, 200", p10.status === 200 && failedCall("9000000000000113")?.p_kind === "permission", p10);
  const p33 = await postOne("9000000000000114", gErr(400, 100, 33, "GraphMethodException"));
  check("code 100 subcode 33: permission (failed, retried after a fix), 200, never gone", p33.status === 200
    && failedCall("9000000000000114")?.p_kind === "permission" && db.ids.get("9000000000000114")?.status === "failed", { p33, row: db.ids.get("9000000000000114") });
  const nf = await postOne("9000000000000115", "noFieldData");
  check("a 200 answer without field_data: permission", nf.status === 200 && failedCall("9000000000000115")?.p_kind === "permission", nf);
  const inv = await postOne("9000000000000116", gErr(400, 100, null, "GraphMethodException"));
  const noId = await postOne("9000000000000117", "noId");
  check("any other code 100, or an answer without an id: invalid, 200", inv.status === 200 && noId.status === 200
    && failedCall("9000000000000116")?.p_kind === "invalid" && failedCall("9000000000000117")?.p_kind === "invalid");
  const c4 = await postOne("9000000000000118", gErr(400, 4, null, "OAuthException"));
  const h5 = await postOne("9000000000000119", { status: 500, body: "<html>oops</html>" });
  check("code 4 and HTTP 500: 503 (Meta sends it again), the id kept as pending", c4.status === 503 && h5.status === 503
    && db.ids.get("9000000000000118")?.status === "pending" && db.ids.get("9000000000000119")?.status === "pending" && c4.body?.pending === 1, { c4, h5 });
  const cut = await postOne("9000000000000122", "cutBody");
  const nj = await postOne("9000000000000123", "notJson");
  check("a 200 whose body breaks off, or a 200 that is not JSON: transient, 503, the id kept as pending (never invalid, which would drop it)",
    cut.status === 503 && nj.status === 503 && failedCall("9000000000000122")?.p_kind === "transient"
      && failedCall("9000000000000123")?.p_kind === "transient" && db.ids.get("9000000000000122")?.status === "pending"
      && db.ids.get("9000000000000123")?.status === "pending", { cut, nj, f1: failedCall("9000000000000122"), f2: failedCall("9000000000000123") });
  const core = await postOne("9000000000000120", "coreOnly");
  const cp = ingested("9000000000000120")[0]?.args.p_lead || {};
  check("a permission error on the full fields: once more with the core fields, and the lead arrives (consent unknown, not \"none\")",
    core.status === 200 && db.leads.has("ol_meta_9000000000000120") && cp.metaConsent === undefined && !/Consent tick/.test(cp.notes || ""), { core, cp });
  check("no lead was marked gone by any of these", ![...db.ids.values()].some((r) => r.status === "gone"));

  setEnv({ META_ACCESS_TOKEN: undefined });
  const graphBefore = graph.calls.length;
  const noTok = await postOne("9000000000000121", null);
  check("no META_ACCESS_TOKEN: the id is stored as failed (token), 200, and Graph is not called", noTok.status === 200
    && failedCall("9000000000000121")?.p_kind === "token" && graph.calls.length === graphBefore, noTok);

  // Many ids and a slow database: one failure record per id, but only within the 8-second budget.
  fresh();
  db.failedCostMs = 1000;
  const many = Array.from({ length: 20 }, (_, i) => `90000000001400${String(i).padStart(2, "0")}`);
  const manyRes = await read(await webhook.POST(metaPost(notification(many.map((id) => change(id))))));
  db.failedCostMs = 0;
  const recorded = rpcCalls("meta_lead_failed").length;
  check("a token failure on 20 ids with a slow database: failures recorded within the 8-second budget, the rest stay pending, 503",
    manyRes.status === 503 && recorded > 0 && recorded < 20 && manyRes.body?.pending === 20 - recorded
      && many.filter((id) => db.ids.get(id)?.status === "pending").length === 20 - recorded, { status: manyRes.status, body: manyRes.body, recorded });
  setEnv();

  fresh();
  const slow = Array.from({ length: 7 }, (_, i) => `90000000001300${i}`);
  for (const id of slow) graph.leads.set(id, graphLead(id, { phone: `+91 90000 0013${slow.indexOf(id)}`, email: "" }));
  await postOne("9000000000000131", null, { lead: false }); // warm the Page token
  for (const id of slow) graph.fail.set(id, "hang");
  const t0 = realNow();
  // AbortSignal.timeout's timers do not keep Node alive (a server would): this does, meanwhile.
  const alive = setInterval(() => {}, 500);
  const budget = await read(await webhook.POST(metaPost(notification(slow.map((id) => change(id))))));
  clearInterval(alive);
  const secs = (realNow() - t0) / 1000;
  check("every Graph call hanging: 503 within 13 seconds (the 8-second budget), every id still stored", budget.status === 503 && secs < 13
    && slow.every((id) => ["pending", "failed"].includes(db.ids.get(id)?.status)) && slow.some((id) => db.ids.get(id)?.status === "pending"),
  { status: budget.status, secs, rows: slow.map((id) => db.ids.get(id)?.status) });
  graph.fail.clear();
}

/* ───────────────────────── 7. The database says no ───────────────────────── */

section("7. Database refusals");
{
  setEnv();
  const L = "9000000000000140";
  graph.leads.set(L, graphLead(L, { phone: "+91 90000 00040", email: "test.forty@example.org" }));
  const body = notification([change(L)]);
  const cases = [
    ["not connected (Connect never pressed)", () => fresh({ connected: false }), /not connected yet/],
    ["connected to another App Secret's token", () => { fresh(); db.settings.ingest = sha256("an older token"); }, /does not match/],
    ["0012 not run", () => { fresh(); db.missing = true; }, /PGRST202/],
    ["Supabase unreachable", () => { fresh(); db.down = true; }, /unreachable/],
  ];
  for (const [label, setup, cause] of cases) {
    setup();
    logs.length = 0;
    const r = await read(await webhook.POST(metaPost(body)));
    const line = logs.find((l) => /NOT stored/.test(l)) || "";
    check(`${label}: 503, and the log line names the cause`, r.status === 503 && cause.test(line), { r, line });
    check(`...without the token or the secret`, !line.includes(INGEST_TOKEN) && !line.includes(APP_SECRET), line);
    check(`...and nothing asked of Graph`, !graph.calls.some((c) => c.path === `/${L}`));
  }
  fresh();
  db.refuse = { status: 400, body: { code: "23514", message: "new row for relation \"meta_leads\" violates check constraint", details: "Failing row contains (Test Lead One, +919000000040, test.forty@example.org).", hint: "Example Classes" } };
  logs.length = 0;
  const r = await read(await webhook.POST(metaPost(body)));
  const line = logs.find((l) => /NOT stored/.test(l)) || "";
  check("a PostgREST error with the lead's values in `details`: 503, and the log keeps code and message only", r.status === 503
    && /23514/.test(line) && !/Test Lead|919000000040|example\.org|Example Classes|Failing row/.test(line), line);
  db.refuse = null;

  // The ids were stored, but the database's answer broke off on the way: that is not "nothing to fetch".
  fresh();
  db.cutBody.add("meta_lead_receive");
  logs.length = 0;
  const cut = await read(await webhook.POST(metaPost(body)));
  const cutLine = logs.find((l) => /NOT stored/.test(l)) || "";
  check("the ids stored but the database's answer broke off: 503 (Meta sends it again), the log says so, Graph not asked",
    cut.status === 503 && /broke off/.test(cutLine) && db.ids.get(L)?.status === "pending" && !graph.calls.some((c) => c.path === `/${L}`), { cut, cutLine });
  db.cutBody.clear();
  const again = await read(await webhook.POST(metaPost(body)));
  check("...and Meta's retry finds the stored id and brings the lead in", again.status === 200 && db.leads.has(`ol_meta_${L}`), again);

  // The catch-up's start answered oddly: a 503, never "the Page id changed".
  setEnv();
  fresh();
  db.cutBody.add("meta_catchup_begin");
  logs.length = 0;
  const cb = await read(await catchup.GET(new Request("https://ideovent.vercel.app/api/meta/catchup", { headers: { authorization: `Bearer ${CRON}` } })));
  check("the catch-up's start answered but broke off: 503, not page_mismatch, nothing polled",
    cb.status === 503 && !logs.some((l) => /META_PAGE_ID/.test(l)) && !graph.calls.some((c) => /leadgen_forms|\/leads$/.test(c.path)), { cb, logs });
  db.cutBody.clear();
}

/* ───────────────────────── 8. The Page, and the daily cap ───────────────────────── */

section("8. Another Page, a changed Page id, the daily cap");
{
  setEnv();
  fresh();
  const O = "9000000000000150";
  graph.leads.set(O, graphLead(O, { phone: "+91 90000 00050", email: "" }));
  const other = await read(await webhook.POST(metaPost(notification([change(O, { page_id: "9000000000000099" })], { entryId: "9000000000000099" }))));
  check("an item for another Page (or the dashboard's signed sample): 200, not fetched", other.status === 200
    && !graph.calls.some((c) => c.path === `/${O}`) && !db.ids.has(O), other);
  db.pageMismatch = true;
  logs.length = 0;
  const mm = await read(await webhook.POST(metaPost(notification([change(O)]))));
  check("META_PAGE_ID is not the connected Page (the database says pageMismatch): 503, nothing fetched", mm.status === 503
    && !graph.calls.some((c) => c.path === `/${O}`) && logs.some((l) => /press Connect/.test(l)), { mm, logs });
  db.pageMismatch = false;
  setEnv({ META_PAGE_ID: undefined });
  const noPage = await read(await webhook.POST(metaPost(notification([change(O)]))));
  check("no META_PAGE_ID at all: the database gets null and refuses to store (503)", noPage.status === 503
    && rpcCalls("meta_lead_receive").at(-1)?.args.p_page_id === null, noPage);
  setEnv();

  fresh();
  const [C1, C2] = ["9000000000000151", "9000000000000152"];
  graph.leads.set(C1, graphLead(C1, { phone: "+91 90000 00051", email: "" }));
  db.overCap.add(C2);
  const cap = await read(await webhook.POST(metaPost(notification([change(C1), change(C2)]))));
  check("one id over today's cap: 503 (Meta sends it again) even though the other was created", cap.status === 503
    && db.leads.has(`ol_meta_${C1}`) && !db.ids.has(C2) && cap.body?.pending === 1, cap);
}

/* ───────────────────────── 9. The Make relay ───────────────────────── */

section("9. The relay (only if Meta blocks the app)");
{
  setEnv();
  fresh();
  const rel = (body, headers = { "x-ideovent-relay": RELAY_SECRET }) => relay.POST(new Request("https://www.ideovent.in/api/meta/relay",
    { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));
  const flat = { leadgen_id: "9000000000000161", created_time: "2026-10-02T08:35:00+0000", platform: "fb", form_name: "Website enquiry",
    campaign_name: "Test campaign", full_name: "Test Lead Relay", phone_number: "+91 90000 00061", company_name: "Relay Flat Classes", city: "Gaya" };
  const nested = { leadgen_id: "9000000000000162", platform: "ig", form_name: "Website enquiry",
    answers: { full_name: "Test Lead Nested", phone_number: "+91 90000 00062", company_name: "Relay Nested School", business_type: "School" } };
  const r1 = await read(await rel(flat));
  const r2 = await read(await rel(nested));
  const p1 = ingested("9000000000000161")[0]?.args;
  const p2 = ingested("9000000000000162")[0]?.args;
  check("flat answers: 200 created, mapped (title, phone, Facebook source, form, campaign)", r1.status === 200 && r1.body?.result === "created"
    && p1?.p_lead.instituteName === "Relay Flat Classes" && p1?.p_lead.phone === "+919000000061" && p1?.p_lead.source === "Facebook Lead Ads"
    && p1?.p_lead.metaFormName === "Website enquiry" && p1?.p_lead.metaCampaignName === "Test campaign" && p1?.p_lead.city === "Gaya", { r1, p1 });
  check("an answers object: 200 created, mapped (school, Instagram)", r2.status === 200 && p2?.p_lead.kind === "school"
    && p2?.p_lead.source === "Instagram Lead Ads" && p2?.p_lead.contactName === "Test Lead Nested", { r2, p2 });
  check("the relay writes with its OWN token, channel relay, and no session", p1?.p_token === RELAY_TOKEN && p1?.p_channel === "relay"
    && rpcCalls("meta_lead_ingest").every((c) => c.bearer === null));
  check("the relay never calls Graph", !graph.calls.some((c) => /916[12]$/.test(c.path)));
  const again = await read(await rel(flat));
  check("the same lead relayed again: 200, already", again.status === 200 && again.body?.result === "already", again);
  const wrong = await read(await rel(flat, { "x-ideovent-relay": "not-the-relay-secret-000000" }));
  const none = await read(await rel(flat, {}));
  check("a wrong or missing X-Ideovent-Relay: 401", wrong.status === 401 && none.status === 401, { wrong, none });
  const noId = await read(await rel({ full_name: "Test Lead No Id", phone_number: "+91 90000 00063" }));
  check("no lead id: 400 (it is what stops a lead coming twice)", noId.status === 400, noId);
  const big = await read(await rel({ leadgen_id: "9000000000000164", note: "x".repeat(64 * 1024) }));
  check("64 KB + more: 413", big.status === 413, big.status);
  db.overCap.add("9000000000000165");
  const over = await read(await rel({ ...flat, leadgen_id: "9000000000000165", phone_number: "+91 90000 00065" }));
  check("over today's cap: 429 { result: over_cap } (Make shows the run as failed; the lead stays at Meta)", over.status === 429 && over.body?.result === "over_cap", over);
  db.refuse = { status: 403, body: { code: "28000", message: "meta: the ingest token does not match (a new App Secret? press Connect again)" } };
  const refused = await read(await rel({ ...flat, leadgen_id: "9000000000000166", phone_number: "+91 90000 00066" }));
  check("the database refuses (not connected for the relay): 503, Make retries", refused.status === 503, refused);
  db.refuse = null;
  setEnv({ META_RELAY_SECRET: undefined });
  const off = await read(await rel(flat));
  setEnv({ META_RELAY_SECRET: "too-short-secret" });
  const short = await read(await rel(flat, { "x-ideovent-relay": "too-short-secret" }));
  check("no META_RELAY_SECRET (or one under 24 characters): 503", off.status === 503 && short.status === 503, { off, short });
  setEnv();
}

/* ───────────────────────── 10. Connect and the status (the owner only) ───────────────────────── */

section("10. Connect and status");
const SECRETS = [APP_SECRET, ACCESS_TOKEN, PAGE_TOKEN, INGEST_TOKEN, RELAY_SECRET, RELAY_TOKEN, VERIFY, CRON];
const leaks = (x) => SECRETS.filter((s) => JSON.stringify(x ?? "").includes(s));
{
  setEnv();
  fresh({ connected: false });
  const req = (method, { session, origin = ORIGIN } = {}) => new Request("https://crm.ideovent.in/api/meta/connect", { method,
    headers: { host: "crm.ideovent.in", "x-forwarded-host": "crm.ideovent.in", ...(origin ? { origin } : {}), ...(session ? { authorization: `Bearer ${session}` } : {}) },
    ...(method === "POST" ? { body: "{}" } : {}) });
  const g0 = await read(await connect.GET(req("GET")));
  const g1 = await read(await connect.GET(req("GET", { session: MEMBER_SESSION })));
  const p0 = await read(await connect.POST(req("POST")));
  const p1 = await read(await connect.POST(req("POST", { session: MEMBER_SESSION })));
  check("no session: 401; a signed-in member: 403 (GET and POST)", g0.status === 401 && p0.status === 401 && g1.status === 403 && p1.status === 403, { g0, g1, p0, p1 });
  const before = db.calls.length;
  const cross = await read(await connect.POST(req("POST", { session: OWNER_SESSION, origin: "https://evil.example" })));
  check("a POST from another website's page: 403, before any database call", cross.status === 403 && db.calls.length === before, cross);

  graph.subscribed = ["feed"];
  graph.scopes = ["leads_retrieval", "pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_ads", "business_management", "public_profile", "ads_read"];
  db.calls.length = 0;
  graph.calls.length = 0;
  const c = await read(await connect.POST(req("POST", { session: OWNER_SESSION })));
  const stored = rpcCalls("meta_connect")[0];
  check("Connect: 200, connected, current, the relay too, the Page subscribed", c.status === 200 && c.body?.connected === true && c.body?.current === true
    && c.body?.relay === true && c.body?.page?.id === PAGE_ID && c.body?.page?.name === "Ideovent" && c.body?.page?.subscribed === true, c);
  check("it stores SHA-256(HMAC(secret, label)) for the webhook and the relay, as the owner", stored?.args.p_ingest_sha256 === INGEST_FP
    && stored?.args.p_relay_sha256 === RELAY_FP && stored?.bearer === OWNER_SESSION && stored?.args.p_page_id === PAGE_ID, stored?.args);
  check("no secret, token or Page token in what the database gets, nor in the answer", !leaks(stored?.args).length && !leaks(c.body).length,
    { db: leaks(stored?.args), answer: leaks(c.body) });
  check("the token check: valid, never expires, missing ads_management, and business_management flagged as more than it needs",
    c.body?.token?.valid === true && c.body?.token?.expiresAt === null && JSON.stringify(c.body?.token?.missing) === '["ads_management"]'
      && JSON.stringify(c.body?.token?.extra) === '["business_management"]' && c.body?.token?.appMatches === true, c.body?.token);
  check("the Page is subscribed to leadgen, keeping its other fields", JSON.stringify(graph.subscribed) === '["feed","leadgen"]'
    && graphCalls(/subscribed_apps$/).some((x) => x.method === "POST"), graph.subscribed);
  check("the access token went to Graph only as input_token on /debug_token", graph.calls.filter((x) => x.url.includes(ACCESS_TOKEN)).every((x) => x.path === "/debug_token")
    && graph.calls.some((x) => x.path === "/debug_token"));
  graph.calls.length = 0;
  const again = await read(await connect.POST(req("POST", { session: OWNER_SESSION })));
  check("Check again with leadgen already subscribed: no second subscription", again.status === 200 && !graphCalls(/subscribed_apps$/).some((x) => x.method === "POST"));

  graph.calls.length = 0;
  const st = await read(await connect.GET(req("GET", { session: OWNER_SESSION })));
  check("GET as the owner: which settings are set (never a value), the Page matches, the database's status", st.status === 200 && st.body?.env?.META_APP_SECRET === true
    && st.body?.env?.META_GRAPH_VERSION === false && st.body?.pageMatches === true && st.body?.db?.connected === true && st.body?.db?.current === true && !leaks(st.body).length, st);
  check("...and the GET asked Graph for nothing", graph.calls.length === 0, graph.calls.map((x) => x.path));
  setEnv({ META_PAGE_ID: "9000000000000007" });
  const moved = await read(await connect.GET(req("GET", { session: OWNER_SESSION })));
  check("META_PAGE_ID changed in Vercel without Connect: pageMatches false", moved.body?.pageMatches === false, moved.body);
  setEnv({ CRON_SECRET: "short" });
  const short = await read(await connect.GET(req("GET", { session: OWNER_SESSION })));
  check("a secret under its minimum counts as not set and is named as too short", short.body?.env?.CRON_SECRET === false
    && JSON.stringify(short.body?.tooShort) === '["CRON_SECRET"]', short.body);
  setEnv();
  db.missing = true;
  const miss = await read(await connect.GET(req("GET", { session: OWNER_SESSION })));
  db.needs0011 = true;
  const no11 = await read(await connect.GET(req("GET", { session: OWNER_SESSION })));
  const postMiss = await read(await connect.POST(req("POST", { session: OWNER_SESSION })));
  check("0012 not run: GET says { missing: true }; 0011 not run either: { needs0011: true }; POST 409", miss.body?.db?.missing === true
    && no11.body?.db?.needs0011 === true && postMiss.status === 409, { miss: miss.body, no11: no11.body, postMiss });
  db.missing = false;
  db.needs0011 = false;
  setEnv({ META_PAGE_ID: undefined });
  const noPage = await read(await connect.POST(req("POST", { session: OWNER_SESSION })));
  setEnv({ META_APP_SECRET: undefined, META_RELAY_SECRET: undefined });
  const noSecret = await read(await connect.POST(req("POST", { session: OWNER_SESSION })));
  check("Connect without META_PAGE_ID, or without both secrets: 503 naming what is missing", noPage.status === 503 && noPage.body?.missing?.includes("META_PAGE_ID")
    && noSecret.status === 503 && noSecret.body?.missing?.includes("META_APP_SECRET"), { noPage, noSecret });
  setEnv({ META_APP_SECRET: undefined, META_ACCESS_TOKEN: undefined });
  db.calls.length = 0;
  const relayOnly = await read(await connect.POST(req("POST", { session: OWNER_SESSION })));
  const ro = rpcCalls("meta_connect")[0]?.args;
  check("only the relay's secret set: Connect stores the relay's fingerprint alone", relayOnly.status === 200 && ro?.p_ingest_sha256 === null && ro?.p_relay_sha256 === RELAY_FP, { relayOnly, ro });
  setEnv();
  graph.scopes = ["leads_retrieval", "pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_ads", "ads_management", "ads_read"];
}

/* ───────────────────────── 11. The daily catch-up ───────────────────────── */

section("11. The daily catch-up");
const cronReq = (auth) => new Request("https://ideovent-abc123.vercel.app/api/meta/catchup", { method: "GET", headers: auth === "none" ? {} : { authorization: auth } });
const cronRun = async (auth = `Bearer ${CRON}`) => read(await catchup.GET(cronReq(auth)));
const ownerRun = async () => read(await catchup.POST(new Request("https://crm.ideovent.in/api/meta/catchup", { method: "POST",
  headers: { host: "crm.ideovent.in", origin: ORIGIN, authorization: `Bearer ${OWNER_SESSION}` }, body: "{}" })));
const pollLeads = (n, start, phoneBase) => Array.from({ length: n }, (_, i) => graphLead(`9000000000${String(start + i).padStart(6, "0")}`,
  { phone: `+91 9${phoneBase}${String(i).padStart(4, "0")}`, email: "", business: `Polled ${start + i}` }));
{
  setEnv({ CRON_SECRET: undefined });
  fresh();
  graph.calls.length = 0;
  const off = await cronRun();
  check("CRON_SECRET not set: the cron's GET answers 503 and calls nothing", off.status === 503 && db.calls.length === 0 && graph.calls.length === 0, off);
  setEnv();
  const noAuth = await cronRun("none");
  const other = await cronRun("Bearer not-the-cron-secret-0000");
  check("CRON_SECRET set: a GET without it, or with another value, 401", noAuth.status === 401 && other.status === 401 && db.calls.length === 0, { noAuth, other });
  setEnv({ META_APP_SECRET: undefined });
  db.calls.length = 0;
  graph.calls.length = 0;
  const notSet = await cronRun();
  check("before the Meta app exists (no META_APP_SECRET): 200 skipped, nothing called", notSet.status === 200 && notSet.body?.skipped === "not configured"
    && db.calls.length === 0 && graph.calls.length === 0, notSet);
  setEnv();
  db.missing = true;
  logs.length = 0;
  const no12 = await cronRun();
  db.missing = false;
  fresh({ connected: false });
  const notConn = await cronRun();
  check("0012 not run, or Connect not pressed: 200 skipped, one short line, no error line, no Graph call", no12.body?.skipped === "0012 not run"
    && notConn.body?.skipped === "not connected" && graph.calls.length === 0 && !logs.some((l) => /refused|error/i.test(l)), { no12, notConn, logs });

  fresh();
  db.tooSoon = true;
  const soon = await cronRun();
  db.tooSoon = false;
  db.pageMismatch = true;
  const mism = await cronRun();
  db.pageMismatch = false;
  check("too soon: 429; the Page id changed: 409, and nothing polled", soon.status === 429 && mism.status === 409
    && !graphCalls(/leadgen_forms|\/leads$/).length, { soon, mism });

  fresh();
  setEnv({ CRON_SECRET: undefined });
  const own = await ownerRun();
  check("the owner's \"Fetch missed leads now\" works without CRON_SECRET (his session decides)", own.status === 200 && own.body?.ok === true
    && rpcCalls("meta_catchup_begin")[0]?.args.p_force === true, own);
  setEnv();

  fresh();
  const R = "9000000000000201";
  graph.leads.set(R, graphLead(R, { phone: "+91 90000 00201", email: "" }));
  db.ids.set(R, { status: "failed", kind: "token", attempts: 2, updatedAt: Date.now() - 11 * MIN, receivedAt: Date.now() - 60 * MIN, crmLeadId: null });
  graph.formLeads.set(FORM_ID, pollLeads(120, 300, "1000"));
  graph.calls.length = 0;
  const run1 = await cronRun();
  const leadsReqs = graphCalls(/\/leads$/);
  check("a failed id is retried (token fixed): created", db.leads.has(`ol_meta_${R}`) && run1.body?.retried === 1, run1);
  check("the poll reads every page of the form: 120 leads in 3 pages, all created", run1.status === 200 && run1.body?.polled === 120
    && [...db.leads.keys()].filter((k) => /^ol_meta_9000000000000[34]/.test(k)).length === 120 && leadsReqs.length === 3, { run1, pages: leadsReqs.length });
  check("pages by cursor on the fixed base (after=cur_50, after=cur_100), never the hostile paging.next",
    leadsReqs[1]?.params.after === "cur_50" && leadsReqs[2]?.params.after === "cur_100" && leadsReqs.every((x) => x.url.startsWith("https://graph.facebook.com/v26.0/"))
      && !graph.stray.length, { after: leadsReqs.map((x) => x.params.after), stray: graph.stray });
  check("the poll asks for leads created after the window, less an hour", leadsReqs.every((x) => /"field":"time_created","operator":"GREATER_THAN"/.test(x.params.filtering || "")));
  check("every form read to its end: the window moves to this run's start", run1.body?.complete === true && typeof db.ends.at(-1)?.until === "string", db.ends.at(-1));

  fresh();
  graph.formLeads.set(FORM_ID, pollLeads(400, 500, "2000"));
  graph.pageSkewMs = 6000; // Graph slow today: each page costs 6 seconds of the 25
  const slow1 = await cronRun();
  const madeFirst = db.leads.size;
  check("more pages than one run's budget: complete false, and the window is not moved", slow1.status === 200 && slow1.body?.complete === false
    && db.ends.at(-1)?.until === null && madeFirst > 0 && madeFirst < 400, { slow1, madeFirst, end: db.ends.at(-1) });
  graph.pageSkewMs = 0;
  skew += 31 * MIN;
  const slow2 = await cronRun();
  check("the next run reads the rest: all 400 arrive, then the window moves", db.leads.size === 400 && slow2.body?.complete === true
    && typeof db.ends.at(-1)?.until === "string", { size: db.leads.size, slow2 });

  fresh();
  graph.formLeads.set(FORM_ID, pollLeads(60, 1000, "3000"));
  db.overCap.add("9000000000001055");
  const capped = await cronRun();
  check("any id over today's cap: the window stays (they are read again tomorrow)", capped.status === 200 && capped.body?.complete === false
    && db.ends.at(-1)?.until === null && !db.ids.has("9000000000001055"), { capped, end: db.ends.at(-1) });

  fresh();
  const F2 = "9100000000000002";
  graph.forms = [{ id: FORM_ID, name: "Website enquiry", status: "ACTIVE" }, { id: F2, name: "Old form", status: "ARCHIVED" }];
  graph.formLeads.set(FORM_ID, pollLeads(5, 2000, "4000"));
  graph.fail.set(F2, gErr(500, 2, null, "OAuthException"));
  const partial = await cronRun();
  check("one form not read to its end (a Graph error): the window stays", partial.body?.complete === false && db.ends.at(-1)?.until === null, partial);
  check("...but the other form's leads arrived", [...db.leads.keys()].filter((k) => /^ol_meta_900000000000200/.test(k)).length === 5);
  check("the forms seen go to the database for the Meta page (ids, names, statuses)", JSON.stringify(db.ends.at(-1)?.forms?.map((f) => f.id)) === JSON.stringify([FORM_ID, F2]), db.ends.at(-1)?.forms);
  graph.forms = [{ id: FORM_ID, name: "Website enquiry", status: "ACTIVE" }];
  fresh();
  graph.formLeads.set(FORM_ID, pollLeads(3, 2100, "5000"));
  graph.formsMore = true;
  const moreForms = await cronRun();
  graph.formsMore = false;
  check("more forms than one list (Graph pages them): the window stays, so no form's leads are skipped for good",
    moreForms.body?.complete === false && db.ends.at(-1)?.until === null && !graph.stray.length, moreForms);

  // Meta's paging rule: only a page WITHOUT a next link is the end.
  fresh();
  graph.formLeads.set(FORM_ID, pollLeads(60, 2200, "6000"));
  graph.emptyFirstPage = true;
  const empty1 = await cronRun();
  graph.emptyFirstPage = false;
  check("an empty page that still has a next link is not the end: the poll reads on, all 60 arrive, then the window moves",
    empty1.body?.complete === true && db.leads.size === 60 && typeof db.ends.at(-1)?.until === "string" && !graph.stray.length,
    { empty1, size: db.leads.size, end: db.ends.at(-1) });
  fresh();
  graph.formLeads.set(FORM_ID, pollLeads(60, 2300, "7000"));
  graph.badCursor = true;
  const badCur = await cronRun();
  graph.badCursor = false;
  check("a next link without a usable cursor: not the end, so the window stays (the first page's leads arrived)",
    badCur.body?.complete === false && db.ends.at(-1)?.until === null && db.leads.size === 50 && !graph.stray.length,
    { badCur, size: db.leads.size, end: db.ends.at(-1) });
  graph.formLeads.clear();
}

/* ───────────────────────── 12. vercel.json ───────────────────────── */

section("12. vercel.json: the functions, the cron, and no redirect in the way");
{
  const vj = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  check("api/meta/webhook.js may run 30 s, api/meta/catchup.js 60 s", vj.functions?.["api/meta/webhook.js"]?.maxDuration === 30
    && vj.functions?.["api/meta/catchup.js"]?.maxDuration === 60, vj.functions);
  check("the daily cron: /api/meta/catchup at 03:45 UTC (09:15 IST)", Array.isArray(vj.crons)
    && vj.crons.some((c) => c.path === "/api/meta/catchup" && c.schedule === "45 3 * * *"), vj.crons);
  // Vercel calls a cron on the deployment's own *.vercel.app address and never follows a redirect, so
  // a redirect matching the Meta paths there would switch the catch-up off silently.
  const toRegex = (src) => new RegExp("^" + src
    .replace(/\/:[A-Za-z_]+\*/g, "(?:/.*)?")
    .replace(/:[A-Za-z_]+(\((?:[^()]|\([^()]*(?:\([^()]*\)[^()]*)*\))*\))/g, "$1")
    .replace(/:[A-Za-z_]+/g, "[^/]+") + "/?$");
  const bad = [];
  for (const r of vj.redirects || []) {
    let re;
    try { re = toRegex(r.source); } catch { bad.push(`unreadable source ${r.source}`); continue; }
    if (!["/api/meta/catchup", "/api/meta/webhook"].some((p) => re.test(p))) continue;
    const host = (r.has || []).find((h) => h.type === "host");
    if (!host || !/^[a-z0-9.-]+$/i.test(String(host.value || ""))) bad.push(r.source);
  }
  check("every redirect that could match /api/meta/catchup or /api/meta/webhook is tied to one fixed host name", bad.length === 0, bad);
  check("...(the check sees the catch-all host redirect at all)", (vj.redirects || []).some((r) => r.source === "/:path*" && toRegex(r.source).test("/api/meta/catchup")));

  // The Hobby plan refuses a deployment with more than 12 functions: every .js under api/ that is
  // not under a folder or file starting with "_" is one.
  const walkApi = (dir) => readdirSync(dir).flatMap((f) => (f.startsWith("_") ? [] : statSync(join(dir, f)).isDirectory() ? walkApi(join(dir, f)) : [join(dir, f)]));
  const fns = walkApi(join(ROOT, "api")).filter((p) => p.endsWith(".js")).map((p) => p.slice(ROOT.length + 1).replace(/\\/g, "/"));
  check(`the deployment has ${fns.length} functions: within the Hobby plan's 12`, fns.length <= 12, fns);
  check("every key of `functions` names a real function (Vercel fails the build otherwise)", Object.keys(vj.functions || {}).every((k) => fns.includes(k)),
    Object.keys(vj.functions || {}).filter((k) => !fns.includes(k)));
  check("the cron's path is a real function, reached with no rewrite", fns.includes("api/meta/catchup.js"));
  const rw = vj.rewrites || [];
  const at = (src) => rw.findIndex((r) => r.source === src);
  // The site's catch-all: the first rewrite to a shell page. Since the SEO release (2 Oct 2026) it is /spa-shell.html,
  // and since the SEO polish (3 Oct 2026) /blog, /work and /services slugs go to /spa-shell-cms.html just before it.
  const SHELLS = ["/spa-shell.html", "/spa-shell-cms.html", "/index.html"];
  const spa = rw.findIndex((r) => SHELLS.includes(r.destination));
  check("/api/meta/connect and /api/meta/relay are rewritten to the webhook's function, before the site's catch-all",
    rw[at("/api/meta/connect")]?.destination === "/api/meta/webhook?route=connect" && rw[at("/api/meta/relay")]?.destination === "/api/meta/webhook?route=relay"
      && at("/api/meta/connect") >= 0 && at("/api/meta/relay") >= 0 && at("/api/meta/connect") < spa && at("/api/meta/relay") < spa, rw.slice(0, 3));
  check("Meta's own address needs no rewrite (no rewrite or redirect source is /api/meta/webhook)",
    !rw.some((r) => r.source === "/api/meta/webhook") && !(vj.redirects || []).some((r) => r.source === "/api/meta/webhook"));
}

section("12b. One function, three addresses: the routing");
{
  setEnv();
  fresh();
  const at = (path, init = {}) => webhook[init.method === "POST" ? "POST" : "GET"](new Request(`https://www.ideovent.in${path}`, init));
  const viaRewrite = await read(await at("/api/meta/webhook?route=connect"));
  check("/api/meta/webhook?route=connect (the rewrite's destination) reaches Connect: 401 without a session", viaRewrite.status === 401
    && /Sign in/.test(viaRewrite.body?.error || ""), viaRewrite);
  const relayBody = JSON.stringify({ leadgen_id: "9000000000000901", full_name: "Test Lead Route", phone_number: "+91 90000 00901", company_name: "Route Classes" });
  const viaRelay = await read(await at("/api/meta/webhook?route=relay", { method: "POST", headers: { "x-ideovent-relay": RELAY_SECRET, "content-type": "application/json" }, body: relayBody }));
  check("/api/meta/webhook?route=relay reaches the relay: 200 created, with the relay's token", viaRelay.status === 200 && viaRelay.body?.result === "created"
    && ingested("9000000000000901")[0]?.args.p_token === RELAY_TOKEN, viaRelay);
  const getRelay = await read(await at("/api/meta/relay"));
  check("GET /api/meta/relay: 405", getRelay.status === 405, getRelay);
  const L = "9000000000000902";
  graph.leads.set(L, graphLead(L, { phone: "+91 90000 00902", email: "" }));
  const body = notification([change(L)]);
  const odd = await read(await at("/api/meta/webhook?route=nonsense", { method: "POST", headers: { "x-hub-signature-256": signature(body) }, body }));
  check("an unknown route is the webhook (Meta's signature still decides): 200 created", odd.status === 200 && odd.body?.created === 1, odd);
  const spoof = await read(await at("/api/meta/webhook?route=connect", { method: "POST", headers: { origin: "https://evil.example", host: "www.ideovent.in" }, body: "{}" }));
  check("choosing a route never skips its checks: Connect from another site is still 403", spoof.status === 403, spoof);
}

/* ───────────────────────── 13. Helpers, secrets, and the code itself ───────────────────────── */

section("13. Helpers, secrets in logs and URLs, and the code");
{
  check("quoteBigIds quotes the id values only", lib.quoteBigIds('{"leadgen_id": 9007199254740993123,"time":1759394100,"id":12}')
    === '{"leadgen_id":"9007199254740993123","time":1759394100,"id":"12"}');
  const c190 = lib.classify(400, { error: { message: `Error validating access token: ${ACCESS_TOKEN}`, type: "OAuthException", code: 190, error_subcode: 463, fbtrace_id: "AbC_1" } });
  check("classify keeps code, subcode, type and trace only: never Meta's message", c190.kind === "token" && c190.text === "Graph 190/463 OAuthException fbtrace AbC_1", c190);
  check("scrub hides tokens and token parameters", !lib.scrub(`x ${ACCESS_TOKEN} access_token=abc&appsecret_proof=def`).includes(ACCESS_TOKEN)
    && !/=abc|=def/.test(lib.scrub("access_token=abc&appsecret_proof=def")));
  check("sameText: equal only for equal text, false for empty", lib.sameText("abc", "abc") && !lib.sameText("abc", "abd") && !lib.sameText("", "") && !lib.sameText("abc", "abcd"));
  check("the ingest token is HMAC(App Secret, the label), and the stored value its SHA-256", lib.ingestToken(APP_SECRET) === INGEST_TOKEN && lib.ingestHash(APP_SECRET) === INGEST_FP
    && lib.relayHash(RELAY_SECRET) === RELAY_FP && INGEST_TOKEN !== RELAY_TOKEN);
  setEnv({ META_GRAPH_BASE: "https://evil.example" });
  check("META_GRAPH_BASE is ignored unless it is http://127.0.0.1 or localhost (a typo cannot send the token away)", lib.metaConfig().graphBase === "https://graph.facebook.com");
  setEnv({ META_GRAPH_BASE: "http://127.0.0.1:5602" });
  check("...and honoured for a fake Graph on this machine", lib.metaConfig().graphBase === "http://127.0.0.1:5602");
  setEnv();

  check("no Graph call broke the rules: Bearer token, valid appsecret_proof, v26.0, no token in any URL but input_token on /debug_token",
    graph.violations.length === 0, graph.violations.slice(0, 10));
  check("no request went to any host but Supabase and graph.facebook.com", graph.stray.length === 0, graph.stray.slice(0, 5));
  const proofs = new Set(graph.calls.map((c) => c.params.appsecret_proof).filter(Boolean));
  const secrets = [APP_SECRET, ACCESS_TOKEN, PAGE_TOKEN, INGEST_TOKEN, RELAY_TOKEN, RELAY_SECRET, VERIFY, CRON, ...proofs];
  const pii = ["Test Lead", "Example Classes", "example.org", "+91 90000", "+919000", "9000000001", "Coaching institute", "200-500", "Relay Flat", "Sunrise"];
  const leaked = logs.filter((l) => secrets.some((s) => l.includes(s)) || pii.some((p) => l.includes(p)));
  check(`no captured log line (${logs.length}) carries a secret, a token, a proof, or a lead's name, number, e-mail or answer`, leaked.length === 0, leaked.slice(0, 5));
  check("no log line carries a URL with a query", !logs.some((l) => /https?:\/\/\S+\?/.test(l)), logs.filter((l) => /https?:\/\/\S+\?/.test(l)).slice(0, 3));

  const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const srcFiles = walk(join(ROOT, "src")).filter((p) => /\.(ts|tsx|js|jsx|mjs)$/.test(p));
  const viteMeta = srcFiles.filter((p) => /VITE_META/.test(readFileSync(p, "utf8")));
  const envMeta = srcFiles.filter((p) => /process\.env\.(META|CRON)/.test(readFileSync(p, "utf8")));
  check("no VITE_META anywhere in src/ (Vite would print it into the public bundle)", viteMeta.length === 0, viteMeta);
  check("no file in src/ reads a Meta secret from process.env", envMeta.length === 0, envMeta);
  const metaFns = readdirSync(join(ROOT, "api/meta")).filter((f) => f.endsWith(".js")).sort();
  check("api/meta holds two functions, webhook.js and catchup.js (the handlers live in api/_lib)", JSON.stringify(metaFns) === '["catchup.js","webhook.js"]', metaFns);
  for (const f of ["meta/webhook.js", "meta/catchup.js", "_lib/metaWebhook.js", "_lib/metaConnect.js", "_lib/metaRelay.js"]) {
    const text = readFileSync(join(ROOT, "api", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const named = [...text.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)].map((m) => m[1]);
    check(`api/${f}: Web-standard ${named.join(" and ")} handlers, no default (req, res) export`, named.length > 0
      && named.every((n) => ["GET", "POST"].includes(n)) && !/export\s+default/.test(text) && !/\(\s*req\s*,\s*res\s*\)/.test(text), named);
  }
}

process.stdout.write(`\n${passes} passed, ${fails.length} failed${NEGATIVE ? " (negative mode: the fake Meta signs with another secret)" : ""}\n`);
process.exit(fails.length ? 1 : 0);
