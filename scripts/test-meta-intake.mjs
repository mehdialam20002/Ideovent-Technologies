/**
 * The signed webhook end to end, without Vercel or a browser: the REAL
 * api/meta/webhook.js, connect.js and catchup.js, against
 *   - a fake Graph API: an HTTP server on 127.0.0.1 (a random port), reached
 *     through META_GRAPH_BASE (honoured only for 127.0.0.1 or localhost);
 *   - a tiny fake PostgREST: another local HTTP server that runs
 *     `select public.<fn>(...)` on PGlite with 0011 and 0012 applied, AS ROLE
 *     anon for the server's token calls (no session), and as the signed-in
 *     owner for Connect, the way PostgREST does.
 * So the database rules of 0012 decide here, not a JavaScript copy of them.
 *
 *   node scripts/test-meta-intake.mjs                         every check must pass (exit 0)
 *   META_INTAKE_NEGATIVE=1 node scripts/test-meta-intake.mjs  the fake Meta signs with another secret: must FAIL (exit 1)
 *
 * Needs PGlite: npm i -D @electric-sql/pglite, or PGLITE_FROM=<folder with node_modules/@electric-sql/pglite>.
 * Fixtures are fictional (Test Lead ..., +91 90000 0000x, @example.org, ids 9000...).
 */
import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEGATIVE = Boolean(process.env.META_INTAKE_NEGATIVE);
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

const APP_ID = "9900000000000001";
const APP_SECRET = "test_app_secret_not_real_0001";
const VERIFY = "test_verify_token_not_real_01";
const PAGE_ID = "9000000000000001";
const ACCESS_TOKEN = "EAATESTSYSTEMUSERTOKEN00000000000000001";
const PAGE_TOKEN = "EAATESTPAGETOKEN0000000000000000000002";
const CRON = "test_cron_secret_not_real_01";
const ANON = "anon-key-for-tests";
const OWNER_SESSION = "session-owner-not-real";
const OWNER_EMAIL = "mehdialam2002@gmail.com"; // seeded into public.admins by 0005
const FORM_ID = "9100000000000001";
const SIGN_SECRET = NEGATIVE ? "another_app_secret_not_real_9" : APP_SECRET;
const hmac = (msg, key) => createHmac("sha256", key).update(msg).digest("hex");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const fails = [];
let passes = 0;
function check(label, ok, detail) {
  if (ok) passes++;
  else fails.push(label);
  process.stdout.write(`${ok ? "ok   " : "FAIL "} ${label}${!ok && detail !== undefined ? `\n        ${JSON.stringify(detail).slice(0, 500)}` : ""}\n`);
}
const logs = [];
for (const k of ["log", "error", "warn", "info"]) console[k] = (...a) => logs.push(a.map(String).join(" "));

/* ── PGlite with 0001-0010, 0011 and 0012 ───────────────────────────────── */
async function loadPGlite() {
  try {
    return { PGlite: (await import("@electric-sql/pglite")).PGlite, pgcrypto: (await import("@electric-sql/pglite/contrib/pgcrypto")).pgcrypto };
  } catch {
    const from = process.env.PGLITE_FROM;
    if (!from) throw new Error("Install @electric-sql/pglite (npm i -D @electric-sql/pglite) or set PGLITE_FROM.");
    const req = createRequire(join(from, "package.json"));
    return {
      PGlite: (await import(pathToFileURL(req.resolve("@electric-sql/pglite")).href)).PGlite,
      pgcrypto: (await import(pathToFileURL(req.resolve("@electric-sql/pglite/contrib/pgcrypto")).href)).pgcrypto,
    };
  }
}
const { PGlite, pgcrypto } = await loadPGlite();
const db = new PGlite({ extensions: { pgcrypto } });
// The Supabase-shaped stub of scripts/test-crm-rls.mjs, read from that file (not copied, not edited).
const rlsTest = read("scripts/test-crm-rls.mjs");
const stubAt = rlsTest.indexOf("const STUB = `") + "const STUB = `".length;
await db.exec(rlsTest.slice(stubAt, rlsTest.indexOf("`;", stubAt)));
const SETUP = read("supabase/SETUP_ALL.sql");
await db.exec(SETUP.slice(0, SETUP.search(/^-- ┌[─ ]*0011_crm_team\.sql/m)));
const ownerUid = (await db.query(`insert into auth.users (email) values ($1) returning id`, [OWNER_EMAIL])).rows[0].id;
await db.exec(read("supabase/migrations/0011_crm_team.sql"));
await db.exec(read("supabase/migrations/0012_meta_leads.sql"));
const pg = async (sql, params) => (await db.query(sql, params)).rows;
const OWNER = (await pg(`select id from public.crm_members where email = $1`, [OWNER_EMAIL]))[0].id;

/* ── The fake PostgREST ─────────────────────────────────────────────────── */
let chain = Promise.resolve();
const serial = (fn) => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };
const sigs = new Map();
async function argTypes(fn) {
  if (!sigs.has(fn)) {
    const rows = await serial(() => pg(`select p.proargnames as names, array(select format_type(t, null) from unnest(p.proargtypes) t) as types
                             from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`, [fn]));
    sigs.set(fn, rows.length === 1 ? new Map((rows[0].names || []).map((nm, i) => [nm, rows[0].types[i]])) : null);
  }
  return sigs.get(fn);
}
const pgCalls = [];
async function asCaller(bearer, sql, params) {
  return serial(async () => {
    await db.exec("begin");
    try {
      const claims = bearer === OWNER_SESSION ? { sub: ownerUid, email: OWNER_EMAIL, role: "authenticated", aud: "authenticated" } : { role: "anon" };
      await db.exec(`set local role ${bearer === OWNER_SESSION ? "authenticated" : "anon"}`);
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
      const r = await db.query(sql, params);
      await db.exec("commit");
      return { rows: r.rows };
    } catch (e) {
      await db.exec("rollback");
      return { error: e };
    }
  });
}
const body = async (req) => { const c = []; for await (const x of req) c.push(x); return Buffer.concat(c).toString("utf8"); };
const pgrest = createServer(async (req, res) => {
  const send = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj ?? null)); };
  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || "")?.[1] || null;
  const text = await body(req);
  if (req.headers.apikey !== ANON) return send(401, { message: "Invalid API key" });
  if (bearer && bearer !== OWNER_SESSION) return send(401, { code: "PGRST301", message: "JWT expired" });
  if (req.url === "/auth/v1/user") return bearer ? send(200, { id: ownerUid, email: OWNER_EMAIL }) : send(401, { message: "no session" });
  const fn = (/^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(req.url || "") || [])[1];
  const types = fn && req.method === "POST" ? await argTypes(fn) : null;
  if (!types) return send(404, { code: "PGRST202", message: `Could not find the function public.${fn}` });
  const args = text ? JSON.parse(text) : {};
  const names = Object.keys(args);
  if (names.some((nm) => !types.has(nm))) return send(404, { code: "PGRST202", message: "no function with these arguments" });
  pgCalls.push({ fn, bearer, args });
  const sql = `select public.${fn}(${names.map((nm, i) => `${nm} => $${i + 1}::${types.get(nm)}`).join(", ")}) as r`;
  const params = names.map((nm) => (args[nm] === null || args[nm] === undefined ? null
    : /json/.test(types.get(nm)) || typeof args[nm] === "object" ? JSON.stringify(args[nm]) : String(args[nm])));
  const r = await asCaller(bearer, sql, params);
  if (!r.error) return send(200, r.rows[0].r);
  const code = r.error.code || "P0001";
  const status = code === "42501" ? (bearer ? 403 : 401) : code === "28000" ? 403 : code === "42883" ? 404 : code === "23505" ? 409 : 400;
  return send(status, { code, message: r.error.message, details: r.error.detail || null, hint: r.error.hint || null });
});

/* ── The fake Graph API ─────────────────────────────────────────────────── */
const G = { leads: new Map(), fail: new Map(), subscribed: [], calls: [], violations: [] };
const gErr = (status, code, subcode, type = "OAuthException") => ({ status, body: { error: { message: "fictional", type, code, ...(subcode ? { error_subcode: subcode } : {}), fbtrace_id: "Atrace1" } } });
const graphLead = (id, phone, business, email = "") => ({
  id, created_time: new Date(Date.now() - 600000).toISOString().replace(/\.\d{3}Z$/, "+0000"), form_id: FORM_ID, platform: "fb", is_organic: false,
  field_data: [{ name: "full_name", values: ["Test Lead Intake"] }, { name: "phone_number", values: [phone] }, { name: "email", values: [email] },
    { name: "company_name", values: [business] }, { name: "city", values: ["Patna"] }].filter((f) => f.values[0]),
  custom_disclaimer_responses: [{ checkbox_key: "contact_ok", is_checked: "1" }],
  ad_id: "9200000000000001", ad_name: "Video 1", adset_id: "9300000000000001", adset_name: "Patna", campaign_id: "9400000000000001", campaign_name: "Test campaign",
});
const pick = (lead, fields) => Object.fromEntries(String(fields || "").split(",").filter((k) => lead[k] !== undefined).map((k) => [k, lead[k]]));
const graph = createServer(async (req, res) => {
  const send = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  const u = new URL(req.url, "http://127.0.0.1");
  const raw = await body(req);
  const path = u.pathname.replace(/^\/v26\.0/, "");
  const q = Object.fromEntries(u.searchParams);
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || "")?.[1] || "";
  G.calls.push({ path, method: req.method, url: req.url });
  if (u.searchParams.has("access_token") || (path !== "/debug_token" && req.url.includes(ACCESS_TOKEN)) || req.url.includes(PAGE_TOKEN)) G.violations.push(`token in a URL: ${path}`);
  if (path === "/debug_token") {
    return send(200, { data: { app_id: APP_ID, type: "SYSTEM_USER", is_valid: token === `${APP_ID}|${APP_SECRET}` && q.input_token === ACCESS_TOKEN, expires_at: 0,
      scopes: ["leads_retrieval", "pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_ads", "ads_management"] } });
  }
  if (q.appsecret_proof !== hmac(token, APP_SECRET)) { G.violations.push(`bad proof on ${path}`); return send(400, gErr(400, 100).body); }
  if (path === "/me") return send(200, { id: "8800000000000001", name: "ideovent-crm-server" });
  if (path === "/me/accounts") return send(200, { data: [{ id: PAGE_ID, name: "Ideovent", access_token: PAGE_TOKEN }] });
  if (token !== PAGE_TOKEN) { G.violations.push(`${path} without the Page token`); return send(400, gErr(400, 190).body); }
  let m;
  if ((m = /^\/(\d+)\/subscribed_apps$/.exec(path))) {
    if (req.method === "POST") { G.subscribed = (new URLSearchParams(raw).get("subscribed_fields") || "").split(","); return send(200, { success: true }); }
    return send(200, { data: [{ id: APP_ID, subscribed_fields: G.subscribed }] });
  }
  if (/^\/\d+\/leadgen_forms$/.test(path)) return send(200, { data: [{ id: FORM_ID, name: "Website enquiry", status: "ACTIVE" }] });
  if ((m = /^\/(\d+)\/leads$/.exec(path))) {
    const list = [...G.leads.values()].filter((l) => l.form_id === m[1] && !G.fail.has(l.id));
    return send(200, { data: list, paging: { cursors: { before: "b", after: "a" } } });
  }
  if ((m = /^\/(\d+)$/.exec(path))) {
    if (m[1] === PAGE_ID) return send(200, { id: PAGE_ID, name: "Ideovent" });
    if (m[1] === FORM_ID) return send(200, { id: FORM_ID, name: "Website enquiry" });
    const f = G.fail.get(m[1]);
    if (f) return send(f.status, f.body);
    const lead = G.leads.get(m[1]);
    return lead ? send(200, pick(lead, q.fields)) : send(400, gErr(400, 100, 33, "GraphMethodException").body);
  }
  return send(400, gErr(400, 100).body);
});

const listen = (srv) => new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv.address().port)));
const pgPort = await listen(pgrest);
const graphPort = await listen(graph);
Object.assign(process.env, {
  META_APP_ID: APP_ID, META_APP_SECRET: APP_SECRET, META_VERIFY_TOKEN: VERIFY, META_PAGE_ID: PAGE_ID, META_ACCESS_TOKEN: ACCESS_TOKEN,
  CRON_SECRET: CRON, META_GRAPH_BASE: `http://127.0.0.1:${graphPort}`, VITE_SUPABASE_URL: `http://127.0.0.1:${pgPort}`, VITE_SUPABASE_ANON_KEY: ANON,
});
delete process.env.META_RELAY_SECRET;
const webhook = await import("../api/meta/webhook.js");
const connect = webhook; // /api/meta/connect is served by the webhook's function (a vercel.json rewrite)
const catchup = await import("../api/meta/catchup.js");

const signedPost = (text, secret = SIGN_SECRET) => webhook.POST(new Request("https://www.ideovent.in/api/meta/webhook", { method: "POST",
  headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=" + hmac(Buffer.from(text, "utf8"), secret) }, body: text }));
const notification = (id) => JSON.stringify({ object: "page", entry: [{ id: PAGE_ID, time: Math.floor(Date.now() / 1000),
  changes: [{ field: "leadgen", value: { leadgen_id: id, page_id: PAGE_ID, form_id: FORM_ID, ad_id: "9200000000000001", created_time: Math.floor(Date.now() / 1000) } }] }] });
const count = async (sql, params) => Number(Object.values((await pg(sql, params))[0])[0]);
const cron = () => catchup.GET(new Request("https://ideovent-abc123.vercel.app/api/meta/catchup", { headers: { authorization: `Bearer ${CRON}` } }));
const status = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });

try {
  /* 1. Connect, as the owner: the real connect.js, the real meta_connect. */
  const c = await status(await connect.POST(new Request("https://crm.ideovent.in/api/meta/connect", { method: "POST",
    headers: { host: "crm.ideovent.in", origin: "https://crm.ideovent.in", authorization: `Bearer ${OWNER_SESSION}` }, body: "{}" })));
  const s = (await pg(`select ingest_sha256, page_id, page_name, connected_by from public.meta_settings`))[0];
  check("Connect as the owner: the database keeps SHA-256(HMAC(App Secret, label)), the Page, his e-mail", c.status === 200
    && s?.ingest_sha256 === sha256(hmac("ideovent:meta-leads:ingest:v1", APP_SECRET)) && s?.page_id === PAGE_ID && s?.page_name === "Ideovent"
    && s?.connected_by === OWNER_EMAIL, { c, s });
  check("...and subscribes the Page to leadgen", G.subscribed.includes("leadgen"), G.subscribed);

  /* 2. A signed notification: one lead, with Graph's data. */
  const A = "9000000000000801";
  G.leads.set(A, graphLead(A, "+91 90000 00801", "Intake Classes", "intake.one@example.org"));
  const r1 = await status(await signedPost(notification(A)));
  const lead = (await pg(`select data, created_by, assigned_to from public.outreach_leads where id = $1`, [`ol_meta_${A}`]))[0];
  check("a signed notification: 200, exactly one lead, with the fake Graph's data", r1.status === 200 && r1.body?.created === 1
    && lead?.data.instituteName === "Intake Classes" && lead?.data.phone === "+919000000801" && lead?.data.source === "Facebook Lead Ads"
    && lead?.data.metaCampaignName === "Test campaign" && lead?.created_by === OWNER && lead?.assigned_to === null, { r1, lead });
  check("...the server's calls ran as anon: every token function without a session", pgCalls.filter((x) => x.fn.startsWith("meta_lead")).every((x) => x.bearer === null));
  const r2 = await status(await signedPost(notification(A)));
  check("the same POST again: 200, still one lead", r2.status === 200 && await count(`select count(*) from public.outreach_leads where id like 'ol_meta_%'`) === 1, r2);

  const forged = await signedPost(notification("9000000000000802"), "a_forger_does_not_have_it_00");
  check("a forged signature: 401, and no row anywhere", forged.status === 401 && await count(`select count(*) from public.meta_leads where leadgen_id = '9000000000000802'`) === 0);

  /* 3. The same person again, from another form submission. */
  const B = "9000000000000803";
  G.leads.set(B, graphLead(B, "09000000801", "Someone Else"));
  const r3 = await status(await signedPost(notification(B)));
  check("a second lead with the first one's phone: a history line on the first lead, no new row", r3.status === 200 && r3.body?.duplicates === 1
    && await count(`select count(*) from public.outreach_leads where id = $1`, [`ol_meta_${B}`]) === 0
    && await count(`select count(*) from public.outreach_events where id = $1 and lead_id = $2`, [`oe_meta_${B}`, `ol_meta_${A}`]) === 1, r3);

  /* 4. A dead token: kept, Mehdi told, and fetched once it works again. */
  const C = "9000000000000804";
  G.leads.set(C, graphLead(C, "+91 90000 00804", "Token Later Classes"));
  G.fail.set(C, gErr(400, 190, 463));
  const bellsBefore = await count(`select count(*) from public.crm_notifications where member_id = $1 and kind = 'intake'`, [OWNER]);
  const r4 = await status(await signedPost(notification(C)));
  const row4 = (await pg(`select status, error_kind from public.meta_leads where leadgen_id = $1`, [C]))[0];
  check("Graph 190: 200, the id kept as failed (token), and Mehdi's 'Lead Ads' bell", r4.status === 200 && row4?.status === "failed" && row4?.error_kind === "token"
    && await count(`select count(*) from public.crm_notifications where member_id = $1 and kind = 'intake'`, [OWNER]) === bellsBefore + 1, { r4, row4 });
  G.fail.delete(C);
  const run1 = await status(await cron());
  check("the token fixed, the daily catch-up (GET with CRON_SECRET, as Vercel sends it): the lead arrives", run1.status === 200
    && await count(`select count(*) from public.outreach_leads where id = $1`, [`ol_meta_${C}`]) === 1, run1);

  /* 5. Leads access refused (Graph 100/33): waits, never gone, arrives after the fix. */
  const D = "9000000000000805";
  G.leads.set(D, graphLead(D, "+91 90000 00805", "Access Later Classes"));
  G.fail.set(D, gErr(400, 100, 33, "GraphMethodException"));
  const r5 = await status(await signedPost(notification(D)));
  const row5 = (await pg(`select status, error_kind from public.meta_leads where leadgen_id = $1`, [D]))[0];
  check("Graph 100/33: 200, failed (permission), not gone", r5.status === 200 && row5?.status === "failed" && row5?.error_kind === "permission", { r5, row5 });
  G.fail.delete(D);
  await db.exec(`update public.meta_settings set last_catchup_at = now() - interval '31 minutes'`);
  const run2 = await status(await cron());
  check("Leads access fixed, the next catch-up: the lead arrives", run2.status === 200 && await count(`select count(*) from public.outreach_leads where id = $1`, [`ol_meta_${D}`]) === 1, run2);

  /* 6. Over the daily cap: 503, nothing stored; after the cap is raised, Meta's retry brings it. */
  const E = "9000000000000806";
  G.leads.set(E, graphLead(E, "+91 90000 00806", "Cap Later Classes"));
  await db.exec(`update public.meta_settings set daily_cap = 1`);
  const r6 = await status(await signedPost(notification(E)));
  check("over a daily cap of 1: 503, and no row", r6.status === 503 && await count(`select count(*) from public.meta_leads where leadgen_id = $1`, [E]) === 0
    && await count(`select count(*) from public.outreach_leads where id = $1`, [`ol_meta_${E}`]) === 0, r6);
  await db.exec(`update public.meta_settings set daily_cap = 300`);
  const r7 = await status(await signedPost(notification(E)));
  check("the cap raised, Meta's retry (the same POST): the lead arrives", r7.status === 200 && await count(`select count(*) from public.outreach_leads where id = $1`, [`ol_meta_${E}`]) === 1, r7);

  check("Graph saw a Bearer token and a valid appsecret_proof on every call, and no token in any URL", G.violations.length === 0, G.violations);
  const secrets = [APP_SECRET, ACCESS_TOKEN, PAGE_TOKEN, hmac("ideovent:meta-leads:ingest:v1", APP_SECRET)];
  check("no log line carries a secret, a token, or a lead's name, number or e-mail",
    !logs.some((l) => secrets.some((x) => l.includes(x)) || /Test Lead|Intake Classes|example\.org|\+9190000/.test(l)), logs.filter((l) => /Test Lead|EAA/.test(l)));
} finally {
  pgrest.close();
  graph.close();
  await db.close();
}
process.stdout.write(`\n${passes} passed, ${fails.length} failed${NEGATIVE ? " (negative mode: the fake Meta signs with another secret)" : ""}\n`);
process.exit(fails.length ? 1 : 0);
