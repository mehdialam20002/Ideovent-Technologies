/**
 * GET  /api/meta/connect   the Meta page's status (cheap: no Graph call)
 * POST /api/meta/connect   "Connect" and "Check again" on CRM > Settings > Meta Lead Ads
 *
 * Served by the function api/meta/webhook.js: vercel.json rewrites
 * /api/meta/connect to /api/meta/webhook?route=connect, so the four Meta
 * addresses cost two of the Hobby plan's 12 functions, not four.
 *
 * The owner only. The CRM sends his own Supabase session (Authorization:
 * Bearer); /auth/v1/user and rpc/is_admin, as him, decide: 401 no session,
 * 403 not the owner. POST also needs our own page as the Origin.
 *
 * WHAT CONNECT STORES (meta_connect, as the owner)
 * SHA-256 of the webhook's ingest token (from META_APP_SECRET) and, when the
 * Make fallback is set up, of the relay's (from META_RELAY_SECRET); the Page;
 * and what the token check found: yes/no, dates and permission names. The
 * secrets, the access token and the Page token never leave this function:
 * not to the browser, not to Supabase, not to a log.
 *
 *   GET   { ok, env: {META_APP_ID: true|false, ...}, tooShort: [names], pageMatches, db }
 *           db = meta_intake_status(), or { missing: true } (0012 not run),
 *           or { needs0011: true } (0011 not run either)
 *   POST  { ok, connected, current, relay, page: {id, name, subscribed},
 *           token: {set, valid, type, expiresAt, scopes, missing, extra, appMatches} }
 *         503 with `missing` names when META_PAGE_ID, or both secrets, are not set.
 */
import { envPresence, ingestHash, json, metaConfig, relayHash, sameOrigin } from "./meta.js";
import { debugToken, ensureSubscribed, pageName, pageToken } from "./metaGraph.js";
import { metaConnect, metaIntakeStatus, ownerSession, rpc } from "./metaDb.js";

/** What reading leads with their ad names needs (Meta's lead retrieval guide lists ads_management). */
const REQUIRED_SCOPES = ["leads_retrieval", "pages_show_list", "pages_read_engagement", "pages_manage_metadata",
  "pages_manage_ads", "ads_management"];
/** Powerful permissions nothing here uses: a leaked token should reach as little as possible. */
const EXTRA_SCOPES = ["business_management", "pages_manage_posts", "pages_manage_engagement", "pages_messaging",
  "catalog_management", "instagram_manage_messages", "whatsapp_business_management", "whatsapp_business_messaging"];

const MISSING_0012 = "The Meta tables do not exist yet. Run supabase/migrations/0012_meta_leads.sql in Supabase (after 0011).";

function failed(where, e) {
  if (e && e.missing) return json(409, { ok: false, missing: true, error: MISSING_0012 });
  console.error(`meta connect ${where}: ${e && e.message ? e.message : "error"}`);
  return json(502, { ok: false, error: "Supabase did not answer as expected. Try again in a minute." });
}

/** meta_intake_status, or what is missing. */
async function dbStatus(env, session, cfg) {
  try {
    return await metaIntakeStatus(env, session, cfg.appSecret ? ingestHash(cfg.appSecret) : null,
      cfg.relaySecret ? relayHash(cfg.relaySecret) : null);
  } catch (e) {
    if (!e || !e.missing) throw e;
    try {
      await rpc(env, session, "crm_me", {});
      return { missing: true };
    } catch (e2) {
      if (e2 && e2.missing) return { needs0011: true };
      return { missing: true };
    }
  }
}

export async function GET(request) {
  const a = await ownerSession(request);
  if (a.res) return a.res;
  const cfg = metaConfig();
  try {
    const db = await dbStatus(a.env, a.session, cfg);
    return json(200, { ok: true, env: envPresence(), tooShort: cfg.tooShort,
      pageMatches: Boolean(cfg.pageId && db && db.pageId === cfg.pageId), db });
  } catch (e) {
    return failed("status", e);
  }
}

/** The token check: what Connect stores and shows. Each step's failure is reported, not fatal. */
async function checkToken(cfg) {
  const deadline = Date.now() + 8000; // the function may be stopped at 10 s on some plans: the steps share 8
  const info = { set: Boolean(cfg.accessToken), valid: false, type: "", expiresAt: null, scopes: [], missing: [], extra: [],
    appMatches: false, subscribed: false, pageName: "", checkedAt: new Date().toISOString() };
  if (!cfg.accessToken || !cfg.appId || !cfg.appSecret) return info;
  const d = await debugToken(cfg, deadline);
  if (d.err) info.error = d.err.text;
  else {
    Object.assign(info, { valid: d.valid, type: d.type, expiresAt: d.expiresAt, scopes: d.scopes, appMatches: d.appMatches });
    info.missing = REQUIRED_SCOPES.filter((s) => !d.scopes.includes(s));
    info.extra = EXTRA_SCOPES.filter((s) => d.scopes.includes(s));
  }
  const pt = await pageToken(cfg, deadline);
  if (pt.err) {
    info.pageError = pt.err.text;
    return info;
  }
  info.pageName = await pageName(cfg, pt.token, deadline);
  const sub = await ensureSubscribed(cfg, pt.token, deadline);
  info.subscribed = sub.subscribed;
  if (sub.err) info.subscribeError = sub.err.text;
  return info;
}

export async function POST(request) {
  if (!sameOrigin(request)) return json(403, { ok: false, error: "Connect from CRM > Settings > Meta Lead Ads." });
  const a = await ownerSession(request);
  if (a.res) return a.res;
  const cfg = metaConfig();
  const missing = [];
  if (!cfg.pageId) missing.push("META_PAGE_ID");
  if (!cfg.appSecret && !cfg.relaySecret) missing.push("META_APP_SECRET");
  if (missing.length) {
    return json(503, { ok: false, missing, tooShort: cfg.tooShort,
      error: `Not set in Vercel yet: ${missing.join(", ")}. Add it, redeploy, then press Connect.` });
  }
  const info = await checkToken(cfg);
  const ingest = cfg.appSecret ? ingestHash(cfg.appSecret) : null;
  const relay = cfg.relaySecret ? relayHash(cfg.relaySecret) : null;
  // The database keeps at most 4 KB of it: the permission names give way first.
  const stored = { ...info, scopes: info.scopes.slice(0, 40) };
  if (JSON.stringify(stored).length > 3800) stored.scopes = [];
  try {
    await metaConnect(a.env, a.session, ingest, relay, cfg.pageId, info.pageName || null, stored);
  } catch (e) {
    return failed("store", e);
  }
  console.log(`meta connect: fingerprints stored (webhook ${ingest ? "yes" : "no"}, relay ${relay ? "yes" : "no"}); token ${info.set ? (info.valid ? "valid" : "not valid") : "not set"}, subscribed ${info.subscribed ? "yes" : "no"}`);
  return json(200, {
    ok: true, connected: true, current: Boolean(ingest), relay: Boolean(relay),
    page: { id: cfg.pageId, name: info.pageName || "", subscribed: info.subscribed },
    token: { set: info.set, valid: info.valid, type: info.type, expiresAt: info.expiresAt, scopes: info.scopes,
      missing: info.missing, extra: info.extra, appMatches: info.appMatches },
  });
}
