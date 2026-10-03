/**
 * Meta Lead Ads in the database (migration 0012), tested on a real PostgreSQL:
 * PGlite, Postgres in WebAssembly inside Node, the same harness as
 * scripts/test-crm-rls.mjs (its Supabase-shaped stub is copied here; that file
 * is not touched).
 *
 *   node scripts/test-meta-rls.mjs                          every check must pass (exit 0)
 *   META_RLS_NEGATIVE=token  node scripts/test-meta-rls.mjs  the ingest-token check accepts anything: must FAIL (exit 1)
 *   META_RLS_NEGATIVE=select node scripts/test-meta-rls.mjs  the owner-only reads opened to everyone: must FAIL (exit 1)
 *
 * Needs:  npm i -D @electric-sql/pglite   (or PGLITE_FROM=<folder with node_modules/@electric-sql/pglite>)
 * Files:  supabase/SETUP_ALL.sql (read only, up to its 0011 section), supabase/migrations/0011_crm_team.sql,
 *         supabase/migrations/0012_meta_leads.sql, src/lib/meta/fields.js.
 *
 * HOW: the stub, the real SETUP_ALL.sql up to 0011 (0001-0010), Mehdi's data as the app writes it,
 * 0011, then 0012 TWICE (it must be re-runnable). Every caller acts the way PostgREST makes them act:
 * the server functions as `anon` with no session (the ingest token is the only proof), people as
 * `authenticated` with request.jwt.claims, each statement in its own transaction.
 *
 * Fixtures are fictional: "Test Lead ...", +91 90000 0000x, @example.org, ids starting 9000...,
 * secrets like test_app_secret_not_real_0001.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
for (const p of ["supabase/SETUP_ALL.sql", "supabase/migrations/0011_crm_team.sql", "supabase/migrations/0012_meta_leads.sql"]) {
  if (!existsSync(join(ROOT, p))) throw new Error(`missing ${p}`);
}
const SETUP_FULL = read("supabase/SETUP_ALL.sql");
const M11 = read("supabase/migrations/0011_crm_team.sql");
const M12 = read("supabase/migrations/0012_meta_leads.sql");
const F = await import(pathToFileURL(join(ROOT, "src/lib/meta/fields.js")).href);

async function loadPGlite() {
  try {
    return {
      PGlite: (await import("@electric-sql/pglite")).PGlite,
      pgcrypto: (await import("@electric-sql/pglite/contrib/pgcrypto")).pgcrypto,
    };
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

const NEG = process.env.META_RLS_NEGATIVE || "";
const { PGlite, pgcrypto } = await loadPGlite();
const fails = [];
let passes = 0;
const check = (cond, msg, got) => {
  if (cond) { passes++; console.log("ok    " + msg); }
  else { fails.push(msg); console.log("FAIL  " + msg + (got !== undefined ? "\n        got: " + JSON.stringify(got).slice(0, 500) : "")); }
};
const finish = () => {
  console.log(`\n${passes} passed, ${fails.length} failed${NEG ? ` (negative mode: ${NEG})` : ""}`);
  process.exit(fails.length ? 1 : 0);
};

/* ── A Supabase-shaped Postgres (copied from test-crm-rls.mjs) ─────────── */
const STUB = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema extensions;
create extension pgcrypto schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz default now(),
  aud text,
  role text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
grant select, delete on auth.users to supabase_auth_admin;
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                  nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role, supabase_auth_admin;
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text, owner uuid);
alter table storage.objects enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
`;
const CUT = SETUP_FULL.search(/^-- ┌[─ ]*0011_crm_team\.sql/m);
if (CUT < 0) throw new Error("SETUP_ALL.sql has no 0011 section to cut at");

/** A database as it is before 0011 (0001-0010), Supabase-shaped. */
async function freshDb() {
  const d = new PGlite({ extensions: { pgcrypto } });
  await d.exec(STUB);
  await d.exec(SETUP_FULL.slice(0, CUT));
  return d;
}

/* ── 0. The file itself, and 0012 without 0011 ──────────────────────────── */
console.log("\n0. The migration file\n");
{
  const bare = await freshDb();
  let err = null;
  try { await bare.exec(M12); } catch (e) { err = e.message; }
  const made = (await bare.query(`select to_regclass('public.meta_leads') as a, to_regclass('public.meta_settings') as b,
    to_regclass('public.meta_ingest_log') as c, to_regprocedure('private.meta_lead_keys()') as d`)).rows[0];
  check(err && /0012 needs 0011/.test(err), "0012 on a database without 0011 stops with '0012 needs 0011'", err);
  check(!made.a && !made.b && !made.c && !made.d, "...and creates nothing", made);
  await bare.close();
}
const HEADER_12 = /^-- ┌[─ ]*0012_meta_leads\.sql[─ ]*┐$/m;
check(HEADER_12.test(SETUP_FULL) && SETUP_FULL.includes(M12.trim()), "SETUP_ALL.sql carries 0012 exactly as the migration file, under its header");
// The first lines name the last migration carried: 0012, or a later one (0013 since the merge with sec-rows-2026-10-02).
const SETUP_UP_TO = Number((SETUP_FULL.slice(0, 600).match(/0001 to (\d{4})\b/) || [])[1] || 0);
check(SETUP_FULL.search(HEADER_12) > CUT && SETUP_UP_TO >= 12, `...after 0011, and its first lines say 0001 to 0012 or later (they say 0001 to ${String(SETUP_UP_TO).padStart(4, "0")})`);
const code12 = M12.replace(/--[^\n]*/g, "");
check(!/\bexecute\b(?!\s+on\s+function)/i.test(code12) && !/\bformat\s*\([^)]*%I/i.test(code12),
  "0012 has no dynamic SQL (no EXECUTE statement, no format(%I) identifiers): stranger text only travels as values");
check(/notify pgrst, 'reload schema';\s*$/.test(M12), "0012 ends with notify pgrst, 'reload schema';");

/* ── 1. The real database: 0001-0010, Mehdi's data, 0011, 0012 twice ───── */
const db = await freshDb();
const OWNER_EMAIL = "mehdialam2002@gmail.com"; // seeded into public.admins by 0005
const P = {};
for (const [k, email] of [["owner", OWNER_EMAIL], ["asha", "asha@example.org"], ["bilal", "bilal@example.org"],
  ["ayesha", "ayesha@example.org"], ["erin", "erin@example.org"]]) {
  const r = await db.query(`insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id`, [email]);
  P[k] = { uid: r.rows[0].id, email };
}

/** One statement as a caller, the way PostgREST runs it. Rolled back unless commit. */
async function as(who, sql, params = [], { commit = false } = {}) {
  await db.exec("begin");
  try {
    await setCaller(who);
    const r = await db.query(sql, params);
    await db.exec(commit ? "commit" : "rollback");
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length };
  } catch (e) {
    await db.exec("rollback");
    return { error: e.message, code: e.code };
  }
}
async function setCaller(who) {
  if (who === "anon") {
    await db.exec("set local role anon");
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "anon" })]);
  } else if (who && who !== "postgres") {
    const p = P[who];
    await db.exec("set local role authenticated");
    await db.query(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: p.uid, email: p.email, role: "authenticated", aud: "authenticated" })]);
  }
}
/** Several statements in one transaction as one caller; always rolled back. */
async function tx(who, fn) {
  await db.exec("begin");
  try {
    await setCaller(who);
    return await fn(async (sql, params = []) => (await db.query(sql, params)).rows);
  } finally {
    await db.exec("rollback");
  }
}
const ok = (r) => !r.error;
const pg = async (sql, params) => (await db.query(sql, params)).rows;
const n = async (sql, params) => Number(Object.values((await pg(sql, params))[0])[0]);

// Mehdi's data as the app writes it today (before 0011).
const old = (id, name, extra = {}) => JSON.stringify({ id, instituteName: name, kind: "school", status: "new",
  createdAt: "2026-09-20T05:00:00.000Z", updatedAt: "2026-09-20T05:00:00.000Z", ...extra });
for (const [id, name, extra] of [["P1", "Prior Public School", { phone: "+919800000001", status: "contacted" }],
  ["P2", "Prior Classes", { kind: "coaching", phone: "+919800000002" }]]) {
  const r = await as("owner", `insert into public.outreach_leads (id, data, updated_at) values ($1, $2::jsonb, now())`, [id, old(id, name, extra)], { commit: true });
  if (r.error) throw new Error("seed failed: " + r.error);
}
// From 30 Oct 2026 Supabase grants new tables to nobody: 0011 and 0012 must grant what they need.
await db.exec(`alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
               alter default privileges in schema public revoke all on sequences from anon, authenticated, service_role;`);
let migErr = null;
try { await db.exec(M11); } catch (e) { migErr = "0011: " + e.message; }
try { if (!migErr) { await db.exec(M12); await db.exec(M12); } } catch (e) { migErr = "0012: " + e.message; }
check(!migErr, "0012 applies on top of the repository's 0011, and applies again (re-runnable)", migErr);
if (migErr) finish();

if (NEG === "token") {
  await db.exec(`create or replace function private.meta_require_token(p_token text, p_allow_relay boolean default false)
    returns text language plpgsql stable security definer set search_path = '' as $$ begin return 'ingest'; end $$;`);
}
if (NEG === "select") {
  await db.exec(`drop policy "meta leads select owner" on public.meta_leads;
    create policy "meta leads select owner" on public.meta_leads for select to authenticated using (true);
    drop policy "meta log select owner" on public.meta_ingest_log;
    create policy "meta log select owner" on public.meta_ingest_log for select to authenticated using (true);`);
}

/* The team: Mehdi (owner), Asha (member), Bilal (member, See all), Ayesha (admin), Erin (member). */
const OWNER = (await pg(`select id from public.crm_members where email = $1`, [OWNER_EMAIL]))[0]?.id;
const M = { owner: OWNER };
for (const [k, role, viewAll, cap] of [["asha", "member", false, 40], ["bilal", "member", true, 40], ["ayesha", "admin", false, 40], ["erin", "member", false, 40]]) {
  const r = await as("owner", `select public.crm_save_member(p_email => $1, p_display_name => $2, p_role => $3, p_view_all => $4, p_new_lead_cap => $5) as id`,
    [P[k].email, k[0].toUpperCase() + k.slice(1), role, viewAll, cap], { commit: true });
  if (r.error) throw new Error(`adding ${k} failed: ${r.error}`);
  M[k] = r.rows[0].id;
  await as(k, `select public.crm_me()`, [], { commit: true });
}
check(Boolean(OWNER), "Mehdi has his owner row (0011)", OWNER);

/* ── 2. Every 0012 function: search_path, SECURITY DEFINER, volatility ──── */
console.log("\n2. The functions and who may call them\n");
const fns = await pg(`select n.nspname as s, p.proname as name, p.oid, p.prosecdef as definer, p.provolatile as vol, p.proconfig as cfg
                        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                       where p.proname like 'meta\\_%' and n.nspname in ('public', 'private') order by 1, 2`);
const TOKEN_FNS = ["meta_catchup_begin", "meta_catchup_end", "meta_lead_failed", "meta_lead_ingest", "meta_lead_receive", "meta_log_verified", "meta_retry_due"];
const OWNER_FNS = ["meta_connect", "meta_intake_status", "meta_set_settings"];
const pub = fns.filter((f) => f.s === "public").map((f) => f.name);
check(JSON.stringify(pub) === JSON.stringify([...TOKEN_FNS, ...OWNER_FNS].sort()), "public has exactly the ten meta_* functions, one version each", pub);
check(fns.every((f) => Array.isArray(f.cfg) && f.cfg.includes('search_path=""')), "every meta_* function has search_path set to empty",
  fns.filter((f) => !(f.cfg || []).includes('search_path=""')).map((f) => f.name));
check(fns.every((f) => f.definer), "every meta_* function is SECURITY DEFINER", fns.filter((f) => !f.definer).map((f) => f.name));
check(fns.filter((f) => f.s === "public").every((f) => (f.name === "meta_intake_status" ? f.vol === "s" : f.vol === "v")),
  "every public meta_* function writes as VOLATILE; only meta_intake_status (reads only) is STABLE", fns.map((f) => `${f.name}:${f.vol}`));
const can = async (role, oid) => (await pg(`select has_function_privilege($1, $2::oid, 'EXECUTE') as x`, [role, oid]))[0]?.x;
const anonFns = [];
const authFns = [];
for (const f of fns) {
  if (await can("anon", f.oid)) anonFns.push(f.name);
  if (await can("authenticated", f.oid)) authFns.push(f.name);
}
check(JSON.stringify(anonFns.sort()) === JSON.stringify(TOKEN_FNS), "anon may run exactly the seven token functions", anonFns);
check(JSON.stringify(authFns.sort()) === JSON.stringify(OWNER_FNS), "authenticated may run exactly the owner's three functions", authFns);

/* ── 3. The tables: owner reads two, nobody writes, nobody reads settings ─ */
for (const t of ["meta_leads", "meta_ingest_log", "meta_settings"]) {
  const r = await as("anon", `select count(*) from public.${t}`);
  check(!ok(r) && r.code === "42501", `anon: permission denied on ${t}`, r);
}
for (const who of ["owner", "asha", "bilal", "ayesha", "anon"]) {
  const r = await as(who, `select count(*) from public.meta_settings`);
  check(!ok(r) && r.code === "42501", `${who}: permission denied on meta_settings (the owner reads it through meta_intake_status)`, r);
  for (const [t, sql] of [["meta_leads", `insert into public.meta_leads (leadgen_id, channel) values ('9000000000999', 'webhook')`],
    ["meta_leads", `update public.meta_leads set status = 'gone'`], ["meta_leads", `delete from public.meta_leads`],
    ["meta_ingest_log", `insert into public.meta_ingest_log (channel, event) values ('owner', 'settings')`],
    ["meta_ingest_log", `delete from public.meta_ingest_log`],
    ["meta_settings", `update public.meta_settings set daily_cap = 5000`]]) {
    const w = await as(who, sql);
    check(!ok(w) && w.code === "42501", `${who}: no ${sql.split(" ")[0]} on ${t} through the API`, w);
  }
}

/* ── Fixtures ───────────────────────────────────────────────────────────── */
const APP_SECRET = "test_app_secret_not_real_0001";
const RELAY_SECRET = "test_relay_secret_not_real_00001";
const PAGE_ID = "9000000000000001";
const OTHER_PAGE = "9000000000000002";
const hmac = (msg, key) => createHmac("sha256", key).update(msg).digest("hex");
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
// Written out from the spec (4.9), not taken from the server code.
const TOKEN = hmac("ideovent:meta-leads:ingest:v1", APP_SECRET);
const RELAY = hmac("ideovent:meta-leads:relay:v1", RELAY_SECRET);
const FP = sha(TOKEN);
const FP_RELAY = sha(RELAY);
const metaTimeText = (msAgo) => new Date(Date.now() - msAgo).toISOString().replace(/\.\d{3}Z$/, "+0000");
let seq = 100;
const nextId = () => `90000000000${String(++seq).padStart(5, "0")}`;
/** A lead as the Graph API gives it (snake_case), fictional. */
const graphLead = (id, { phone = "+91 90000 00001", email = "test.one@example.org", name = "Test Lead One",
  business = "Example Classes", type = "Coaching institute", city = "Patna", ...over } = {}) => ({
  id, created_time: metaTimeText(3600000), form_id: "9100000000000001", platform: "ig", is_organic: false,
  field_data: [
    { name: "full_name", values: [name] }, { name: "phone_number", values: [phone] }, { name: "email", values: [email] },
    { name: "company_name", values: [business] }, { name: "city", values: [city] },
    { name: "what_type_of_business_do_you_run", values: [type] },
  ].filter((f) => f.values[0]),
  custom_disclaimer_responses: [{ checkbox_key: "contact_ok", is_checked: "1" }],
  ad_id: "9200000000000001", ad_name: "Video 1", adset_id: "9300000000000001", adset_name: "Patna 25-45",
  campaign_id: "9400000000000001", campaign_name: "Test campaign", formName: "Website enquiry", ...over,
});
const leadOf = (id, opts) => F.mapMetaLead(graphLead(id, opts)).lead;

const RECV = `select public.meta_lead_receive($1, $2::jsonb, $3, $4) as r`;
const INGEST = `select public.meta_lead_ingest($1, $2, $3::jsonb, $4, $5) as r`;
const FAILED = `select public.meta_lead_failed($1, $2, $3, $4) as r`;
const item = (id, over = {}) => ({ leadgen_id: id, page_id: PAGE_ID, form_id: "9100000000000001", ad_id: "9200000000000001",
  created_time: new Date().toISOString(), ...over });
const receive = (items, { token = TOKEN, channel = "webhook", page = PAGE_ID } = {}) =>
  as("anon", RECV, [token, JSON.stringify(items), channel, page], { commit: true });
const ingest = (id, lead, { token = TOKEN, channel = "webhook", page = PAGE_ID } = {}) =>
  as("anon", INGEST, [token, id, JSON.stringify(lead), channel, page], { commit: true });
const failed = (id, kind, detail = "Graph 190/463 OAuthException", token = TOKEN) =>
  as("anon", FAILED, [token, id, kind, detail], { commit: true });
const res = (r) => (r.rows && r.rows[0] ? r.rows[0].r : r);
/** Everything a refused call must not have written. */
const footprint = async () => pg(`select (select count(*) from public.outreach_leads)::int as leads, (select count(*) from public.outreach_events)::int as events,
  (select count(*) from public.crm_notifications)::int as bells, (select count(*) from public.meta_ingest_log)::int as log,
  (select count(*) from public.meta_leads)::int as ids, (select count(*) from public.crm_audit)::int as audit`).then((r) => JSON.stringify(r[0]));

/* ── 4. No token, no write ──────────────────────────────────────────────── */
console.log("\n4. Refusals without the secret\n");
const tokenCalls = (token) => [
  ["meta_lead_receive", RECV, [token, JSON.stringify([item("9000000000000901")]), "webhook", PAGE_ID]],
  ["meta_lead_ingest", INGEST, [token, "9000000000000901", JSON.stringify(leadOf("9000000000000901")), "webhook", PAGE_ID]],
  ["meta_lead_failed", FAILED, [token, "9000000000000901", "token", "x"]],
  ["meta_retry_due", `select public.meta_retry_due($1, 25, false) as r`, [token]],
  ["meta_catchup_begin", `select public.meta_catchup_begin($1, true, $2) as r`, [token, PAGE_ID]],
  ["meta_catchup_end", `select public.meta_catchup_end($1, now(), '[]'::jsonb, '{}'::jsonb) as r`, [token]],
  ["meta_log_verified", `select public.meta_log_verified($1) as r`, [token]],
];
{
  const before = await footprint();
  for (const [name, sql, params] of tokenCalls(TOKEN)) {
    const r = await as("anon", sql, params, { commit: true });
    check(!ok(r) && r.code === "28000" && /not connected yet/.test(r.error), `before Connect: ${name} raises 28000 ("not connected yet")`, r);
  }
  check(await footprint() === before, "...and nothing was written", [before, await footprint()]);
}

/* ── 5. The owner's functions ───────────────────────────────────────────── */
console.log("\n5. Connect, status and settings: the owner only\n");
const CONNECT = `select public.meta_connect($1, $2, $3, $4, $5::jsonb) as r`;
const INFO = JSON.stringify({ set: true, valid: true, type: "SYSTEM_USER", expiresAt: null, scopes: ["leads_retrieval"], missing: [], extra: [] });
for (const who of ["asha", "bilal", "ayesha"]) {
  const r = await as(who, CONNECT, [FP, null, PAGE_ID, "Ideovent", INFO], { commit: true });
  check(!ok(r) && r.code === "42501", `meta_connect by ${who} (${who === "ayesha" ? "admin" : "member"}) is refused (42501)`, r);
}
{
  const r = await as("anon", CONNECT, [FP, null, PAGE_ID, "Ideovent", INFO], { commit: true });
  check(!ok(r) && r.code === "42501" && /permission denied/.test(r.error), "meta_connect as anon: permission denied (no grant)", r);
  const bad = await as("owner", CONNECT, ["NOT-HEX", null, PAGE_ID, "Ideovent", INFO], { commit: true });
  check(!ok(bad) && bad.code === "22023", "meta_connect refuses a fingerprint that is not lower-case SHA-256 hex", bad);
  const none = await as("owner", CONNECT, [null, null, PAGE_ID, "Ideovent", INFO], { commit: true });
  check(!ok(none) && none.code === "22023", "meta_connect needs at least one fingerprint", none);
  const big = await as("owner", CONNECT, [FP, null, PAGE_ID, "Ideovent", JSON.stringify({ x: "y".repeat(5000) })], { commit: true });
  check(!ok(big) && big.code === "22023", "meta_connect refuses token info over 4 KB", big);
  const c = await as("owner", CONNECT, [FP, FP_RELAY, PAGE_ID, "  Ideovent  ", INFO], { commit: true });
  check(ok(c) && typeof res(c).connectedAt === "string", "the owner connects: the fingerprints, the Page and the token check are stored", c);
  const row = (await pg(`select ingest_sha256, relay_sha256, page_id, page_name, connected_by, token_info from public.meta_settings`))[0];
  check(row.ingest_sha256 === FP && row.relay_sha256 === FP_RELAY && row.page_id === PAGE_ID && row.page_name === "Ideovent"
    && row.connected_by === OWNER_EMAIL && row.token_info.type === "SYSTEM_USER", "...connected_by is his e-mail; no secret or token is stored", row);
  check(!JSON.stringify(row).includes(TOKEN) && !JSON.stringify(row).includes(APP_SECRET), "...neither the ingest token nor the App Secret is in the row");
  const STATUS = `select public.meta_intake_status($1, $2) as r`;
  const s1 = res(await as("owner", STATUS, [FP, FP_RELAY]));
  const s2 = res(await as("owner", STATUS, [sha("another secret's token"), null]));
  check(s1.connected === true && s1.current === true && s1.relayCurrent === true && s1.pageId === PAGE_ID && s1.assignMode === "pool" && s1.dailyCap === 300,
    "meta_intake_status: connected, current for the same fingerprint, pool and 300 by default", s1);
  check(s2.connected === true && s2.current === false && s2.relayCurrent === false, "...current false for another fingerprint (a new App Secret: press Connect again)", s2);
  for (const who of ["asha", "ayesha"]) {
    const r = await as(who, STATUS, [FP, null]);
    check(!ok(r) && r.code === "42501", `meta_intake_status by ${who}: refused`, r);
  }
  const SET = `select public.meta_set_settings($1, $2) as r`;
  for (const [mode, cap, why] of [["everyone", null, "an unknown mode"], [null, 0, "a cap of 0"], [null, 5001, "a cap over 5,000"]]) {
    const r = await as("owner", SET, [mode, cap], { commit: true });
    check(!ok(r) && r.code === "22023", `meta_set_settings refuses ${why}`, r);
  }
  const m = await as("asha", SET, ["owner", 10], { commit: true });
  check(!ok(m) && m.code === "42501", "meta_set_settings by a member: refused", m);
  const keep = res(await as("owner", SET, [null, 250], { commit: true }));
  check(keep.assignMode === "pool" && keep.dailyCap === 250, "meta_set_settings: null keeps the mode, the cap changes", keep);
  await as("owner", SET, ["pool", 300], { commit: true });
}

/* ── 6. After Connect: a wrong token still writes nothing ───────────────── */
{
  const before = await footprint();
  for (const [label, token] of [["a wrong token", hmac("ideovent:meta-leads:ingest:v1", "another_app_secret_000001")], ["a null token", null],
    ["a 300-character token", "a".repeat(300)], ["the fingerprint itself", FP], ["the relay's token where it is not allowed", RELAY]]) {
    for (const [name, sql, params] of tokenCalls(token)) {
      if (label.startsWith("the relay") && name === "meta_lead_ingest") continue; // the relay may ingest: checked below
      const r = await as("anon", sql, params, { commit: true });
      check(!ok(r) && r.code === "28000", `${label}: ${name} raises 28000`, r);
    }
  }
  check(await footprint() === before, "...and nothing was written: no lead, line, bell, log line or id", [before, await footprint()]);
  const member = await as("asha", RECV, [TOKEN, JSON.stringify([item("9000000000000902")]), "webhook", PAGE_ID], { commit: true });
  check(!ok(member) && member.code === "42501", "a signed-in member cannot call a token function at all (no grant), even with the token", member);
}

/* ── 7. A new lead ──────────────────────────────────────────────────────── */
console.log("\n7. A Meta lead is created\n");
const near = (iso, ms = 120000) => Math.abs(Date.parse(iso) - Date.now()) < ms;
const A = nextId();
const leadA = leadOf(A);
let leadIdA;
{
  const rc = res(await receive([item(A)]));
  check(rc.fetch?.length === 1 && rc.fetch[0] === A && rc.new === 1 && rc.pageMismatch === false, "receive stores the new id and asks for it to be fetched", rc);
  const r = res(await ingest(A, leadA));
  leadIdA = `ol_meta_${A}`;
  check(r.result === "created" && r.leadId === leadIdA && r.assignedTo === null, "ingest: created, ol_meta_<id>, in the Unassigned pool (the default)", r);
  const row = (await pg(`select data, assigned_to, created_by, closed_at from public.outreach_leads where id = $1`, [leadIdA]))[0] || {};
  const want = { ...leadA, id: leadIdA, status: "new" };
  const got = { ...(row?.data || {}) };
  check(near(got.nextActionAt) && near(got.updatedAt), "the lead is due now (nextActionAt and updatedAt are the server's now)", got);
  check(got.createdAt === leadA.metaCreatedAt, "createdAt is when the person sent the form (Meta's time)", [got.createdAt, leadA.metaCreatedAt]);
  for (const k of ["nextActionAt", "updatedAt", "createdAt"]) delete got[k];
  check(JSON.stringify(Object.keys(got).sort()) === JSON.stringify(Object.keys(want).sort()) && Object.keys(want).every((k) => got[k] === want[k]),
    "the lead's data is exactly the mapped lead plus id and status: every key text, nothing else", { got, want });
  check(row.created_by === OWNER && row.assigned_to === null && row.closed_at === null, "added by Mehdi (a re-run of 0011 cannot take it over), Unassigned, open", row);
  check(want.instituteName === "Example Classes" && want.source === "Instagram Lead Ads" && want.kind === "coaching" && want.phone === "+919000000001"
    && want.metaConsent === "yes" && want.metaCampaignName === "Test campaign", "the mapping: the business name as title, Instagram's source, coaching, the phone, consent, campaign", want);
  const audit = await pg(`select detail from public.crm_audit where action = 'lead.insert' and lead_id = $1`, [leadIdA]);
  check(audit.length === 1 && audit[0].detail.instituteName === "Example Classes" && !/90000|example\.org|Test Lead/.test(JSON.stringify(audit[0].detail)),
    "0011's audit line lead.insert, with the title and source and no contacts", audit);
  const lines = await pg(`select id, actor_id, data from public.outreach_events where lead_id = $1`, [leadIdA]);
  check(lines.length === 1 && lines[0].id === `oe_meta_${A}` && lines[0].actor_id === null && lines[0].data.type === "note"
    && near(lines[0].data.at) && /^New lead from the Instagram lead form "Website enquiry" \(campaign "Test campaign"\)\.$/.test(lines[0].data.detail),
  "one history line, a note by nobody (it claims no one's work), dated now", lines);
  const bells = await pg(`select member_id, kind, title from public.crm_notifications where lead_id = $1`, [leadIdA]);
  check(bells.length === 1 && bells[0].member_id === OWNER && bells[0].kind === "lead_in" && bells[0].title === "New lead from Instagram: Example Classes",
    "one bell, lead_in, for Mehdi: \"New lead from Instagram: Example Classes\"", bells);
  const ml = (await pg(`select status, crm_lead_id, done_at, form_id, ad_id from public.meta_leads where leadgen_id = $1`, [A]))[0];
  check(ml.status === "created" && ml.crm_lead_id === leadIdA && ml.done_at && ml.form_id === "9100000000000001", "meta_leads: created, with the CRM lead", ml);
  const log = await pg(`select detail, crm_lead_id from public.meta_ingest_log where event = 'created' and leadgen_id = $1`, [A]);
  check(log.length === 1 && log[0].crm_lead_id === leadIdA && !/Test Lead|90000|example\.org|Example Classes|Coaching|Patna/.test(log[0].detail || ""),
    "one 'created' log line, with ids and no name, number, e-mail or answer", log);
  const allLog = JSON.stringify(await pg(`select * from public.meta_ingest_log`));
  check(!/Test Lead|90000 0|\+9190000|example\.org|Example Classes/.test(allLog), "the whole log holds no fixture name, phone, e-mail or answer");
}

/* ── 8. Shape: only text, only the known keys, each cut ─────────────────── */
console.log("\n8. What a Meta lead may carry\n");
{
  const B = nextId();
  const odd = { ...leadOf(B, { phone: "+91 90000 00002", email: "test.two@example.org" }),
    stage: "won", assignedTo: "Asha", demoId: "d1", createdAt: "2001-01-01T00:00:00.000Z", status: "won",   // keys no Meta lead sets
    city: 42, state: ["Bihar"], website: { url: "https://example.org" },                                      // not text: dropped
    kind: "villa", source: "Google", metaLeadId: "1234", metaPlatform: "IG!", metaOrganic: "maybe", metaConsent: "sure",
    contactName: "N".repeat(500), notes: "x".repeat(5000), instituteName: "  Padded Name  " };
  const r = res(await ingest(B, odd));
  const d = (await pg(`select data from public.outreach_leads where id = $1`, [`ol_meta_${B}`]))[0]?.data || {};
  check(r.result === "created", "an odd lead is still created", r);
  check(!("stage" in d) && !("assignedTo" in d) && !("demoId" in d) && d.status === "new" && d.createdAt !== "2001-01-01T00:00:00.000Z",
    "unknown keys are dropped; status, createdAt and the rest are the database's own", d);
  check(!("city" in d) && !("state" in d) && !("website" in d), "a number, a list or an object where text belongs is dropped", d);
  check(d.contactName.length === 120 && d.notes.length === 3000 && d.instituteName === "Padded Name", "every key cut to its maximum, and trimmed", [d.contactName?.length, d.notes?.length, d.instituteName]);
  check(d.kind === "other" && d.source === "Meta Lead Ads" && d.metaLeadId === B, "kind \"villa\" becomes other, source \"Google\" becomes Meta Lead Ads, metaLeadId is the real id", d);
  check(!("metaPlatform" in d) && !("metaOrganic" in d) && !("metaConsent" in d), "coded meta keys outside their lists are dropped", d);
  const big = await ingest(nextId(), { instituteName: "Big", notes: "y".repeat(17 * 1024) });
  check(!ok(big) && big.code === "22023", "a lead over 16 KB is refused (22023)", big);
  const badId = await ingest("12a", leadOf("12"));
  check(!ok(badId) && badId.code === "22023" && !/12a/.test(badId.error), "p_leadgen_id \"12a\" is refused (22023), and the message does not quote it", badId);
  const list = await ingest(nextId(), ["not", "an", "object"]);
  check(!ok(list) && list.code === "22023", "p_lead must be a JSON object", list);
  const C = nextId();
  const inj = res(await ingest(C, leadOf(C, { phone: "+91 90000 00003", email: "test.three@example.org", business: "'); drop table public.outreach_leads; --" })));
  const kept = (await pg(`select data->>'instituteName' as t from public.outreach_leads where id = $1`, [`ol_meta_${C}`]))[0]?.t;
  check(inj.result === "created" && kept === "'); drop table public.outreach_leads; --" && (await n(`select count(*) from public.outreach_leads`)) > 3,
    "an answer written as SQL is stored as text, and the table is still there", kept);
}

/* ── 9. Once per Meta lead id, forever ──────────────────────────────────── */
console.log("\n9. Idempotency and erasure\n");
{
  const again = res(await ingest(A, leadA));
  check(again.result === "already" && again.leadId === leadIdA, "the same id again: already", again);
  check(await n(`select count(*) from public.outreach_leads where id = $1 or data->>'metaLeadId' = $2`, [leadIdA, A]) === 1
    && await n(`select count(*) from public.outreach_events where lead_id = $1`, [leadIdA]) === 1
    && await n(`select count(*) from public.crm_notifications where lead_id = $1`, [leadIdA]) === 1, "...still one lead, one line, one bell");
  const rc = res(await receive([item(A)]));
  check(rc.fetch.length === 0 && rc.new === 0 && rc.known === 1, "receive lists a done id under neither fetch nor new", rc);
  const del = await as("owner", `delete from public.outreach_leads where id = $1 returning id`, [leadIdA], { commit: true });
  check(ok(del) && del.n === 1, "the owner deletes the lead (erasure under DPDP)", del);
  const after = res(await ingest(A, leadA));
  const rc2 = res(await receive([item(A)], { channel: "catchup" }));
  check(after.result === "already" && rc2.fetch.length === 0 && await n(`select count(*) from public.outreach_leads where id = $1`, [leadIdA]) === 0,
    "after the delete, a new ingest and a new receive of the id: already, and no lead comes back", { after, rc2 });
  const ml = (await pg(`select status, crm_lead_id from public.meta_leads where leadgen_id = $1`, [A]))[0];
  check(ml.status === "created" && ml.crm_lead_id === null, "the id stays done (its CRM lead id is cleared by the delete)", ml);
  // A lead that came in through Meta's CSV export first, then the webhook: the same lead.
  const D = nextId();
  await as("owner", `insert into public.outreach_leads (id, data) values ('csv_1', $1::jsonb)`,
    [JSON.stringify({ id: "csv_1", instituteName: "From CSV", status: "new", metaLeadId: D, phone: "+919000000099" })], { commit: true });
  const viaCsv = res(await ingest(D, leadOf(D, { phone: "+91 90000 00099" })));
  check(viaCsv.result === "already" && viaCsv.leadId === "csv_1", "a lead imported from Meta's CSV export first (metaLeadId): already, the same lead", viaCsv);
}

/* ── 10. The same person again: never a second lead ─────────────────────── */
console.log("\n10. Duplicates, and a flood of them\n");
const INS = `insert into public.outreach_leads (id, data) values ($1, $2::jsonb)`;
const crmLead = (id, name, extra) => JSON.stringify({ id, instituteName: name, kind: "school", status: "contacted", createdAt: "2026-09-25T05:00:00.000Z", ...extra });
for (const [id, name, extra] of [["DUP1", "Dup School One", { phone: "+919000000011" }], ["DUP2", "Dup Closed Two", { phone: "+919000000012", status: "won" }],
  ["DUP3", "Dup Pool Three", { email: "dup.three@example.org", status: "new" }]]) {
  const r = await as("owner", INS, [id, crmLead(id, name, extra)], { commit: true });
  if (r.error) throw new Error(`${id}: ${r.error}`);
}
await as("owner", `select public.crm_assign_leads(array['DUP1', 'DUP2'], $1)`, [M.asha], { commit: true });
await db.exec(`update public.outreach_leads set updated_at = now() - interval '1 day',
  data = data || '{"nextActionAt":"2026-09-26T05:00:00.000Z"}'::jsonb where id in ('DUP1', 'DUP2', 'DUP3')`);
const leadRow = async (id) => (await pg(`select data, updated_at, assigned_to from public.outreach_leads where id = $1`, [id]))[0];
{
  const E = nextId();
  const before = await n(`select count(*) from public.outreach_leads`);
  const r = res(await ingest(E, leadOf(E, { phone: "09000000011", email: "", business: "Someone Else Classes" })));
  check(r.result === "duplicate" && r.leadId === "DUP1" && r.assignedTo === M.asha, "the same number written differently (09000000011 for +91 90000 00011): duplicate of DUP1", r);
  check(await n(`select count(*) from public.outreach_leads`) === before && await n(`select count(*) from public.outreach_leads where id = $1`, [`ol_meta_${E}`]) === 0,
    "...no new lead");
  /* Review, 3 Oct: whoever sent the form may not be DUP1 (anyone can type its number into a form), so the
     line on the lead is neutral and the answers (a stranger's name, e-mail, "call me on another number")
     go to Mehdi alone, as a request ("Waiting on you"). */
  const line = (await pg(`select lead_id, actor_id, data from public.outreach_events where id = $1`, [`oe_meta_${E}`]))[0];
  check(line && line.lead_id === "DUP1" && line.actor_id === null && line.data.type === "note" && near(line.data.at)
    && line.data.detail === `Someone sent the Instagram lead form with this lead's phone number (form "Website enquiry", campaign "Test campaign"). Their answers went to Mehdi.`,
  "a neutral line on the existing lead: \"Someone sent the Instagram lead form with this lead's phone number (form ..., campaign ...). Their answers went to Mehdi.\"", line);
  check(line && !/Test Lead One|test\.one@example\.org|Someone Else Classes|Answers|full_name|9000000011/.test(line.data.detail),
    "...carrying none of the answers: no name, e-mail, business or number from the form", line?.data?.detail);
  const ask = await pg(`select kind, asked_by, host_id, body, resolved_at from public.crm_requests where lead_id = 'DUP1' and kind = 'meta_form'`);
  check(ask.length === 1 && ask[0].asked_by === null && ask[0].host_id === OWNER && !ask[0].resolved_at && ask[0].body.length <= 500
    && ask[0].body.startsWith(`Sent on the Instagram form "Website enquiry" with this lead's phone number. Answers: full_name: Test Lead One; `)
    && ask[0].body.includes("Someone Else Classes"),
    "the answers wait for Mehdi: one open request (kind meta_form, asked by nobody, to Mehdi, at most 500 characters)", ask);
  const d1 = await leadRow("DUP1");
  check(near(d1.data.nextActionAt) && near(new Date(d1.updated_at).toISOString()), "the open lead is due now, and its updated_at moves (it rises in the lists)", d1);
  const bell = await pg(`select member_id, kind, title from public.crm_notifications where lead_id = 'DUP1' and kind = 'lead_in'`);
  check(bell.length === 1 && bell[0].member_id === M.asha && bell[0].title === "Dup School One: someone sent the Instagram form with this lead's phone number",
    "the bell goes to whoever works it (Asha, active), in neutral words: \"Dup School One: someone sent the Instagram form with this lead's phone number\"", bell);
  check((await as("asha", `select count(*)::int as n from public.outreach_events where id = $1`, [`oe_meta_${E}`])).rows[0].n === 1,
    "Asha reads the new line on her lead");
  check((await as("bilal", `select count(*)::int as n from public.outreach_events where id = $1`, [`oe_meta_${E}`])).rows[0].n === 0,
    "Bilal does not (not his lead)");
  const askAs = async (who) => (await as(who, `select count(*)::int as n from public.crm_requests where lead_id = 'DUP1' and kind = 'meta_form'`)).rows?.[0]?.n;
  check(await askAs("owner") === 1 && await askAs("ayesha") === 1 && await askAs("asha") === 0 && await askAs("bilal") === 0,
    "the answers: Mehdi and the admin read them; Asha, whose lead it is, and Bilal do not", { owner: await askAs("owner"), ayesha: await askAs("ayesha"), asha: await askAs("asha"), bilal: await askAs("bilal") });
  const reqId = (await pg(`select id from public.crm_requests where lead_id = 'DUP1' and kind = 'meta_form'`))[0]?.id;
  const byAdmin = await as("ayesha", `select public.crm_resolve_request($1, 'done', null)`, [reqId]);
  check(!ok(byAdmin) && byAdmin.code === "42501", "an admin cannot close it (it went to Mehdi)", byAdmin);
  const bellsBefore = await n(`select count(*) from public.crm_notifications`);
  const done = await as("owner", `select public.crm_resolve_request($1, 'done', 'Same person, a new branch')`, [reqId], { commit: true });
  const closed = (await pg(`select outcome, outcome_note, resolved_by from public.crm_requests where id = $1`, [reqId]))[0];
  check(ok(done) && closed?.outcome === "done" && closed?.resolved_by === OWNER && await n(`select count(*) from public.crm_notifications`) === bellsBefore,
    "Mehdi closes it (Done, with a note); nobody asked, so nobody's bell rings", { done, closed });
  check((await pg(`select status from public.meta_leads where leadgen_id = $1`, [E]))[0]?.status === "duplicate", "meta_leads: duplicate");

  const G = nextId();
  const closedBefore = await leadRow("DUP2");
  const r2 = res(await ingest(G, leadOf(G, { phone: "+91 90000 00012", email: "", business: "Again Closed" })));
  const closedAfter = await leadRow("DUP2");
  check(r2.result === "duplicate" && r2.leadId === "DUP2" && closedAfter.data.nextActionAt === closedBefore.data.nextActionAt
    && +new Date(closedAfter.updated_at) === +new Date(closedBefore.updated_at), "a closed lead gets the line but is not made due, and does not move", { r2, closedAfter });
  const closedBell = await pg(`select member_id from public.crm_notifications where lead_id = 'DUP2' and kind = 'lead_in'`);
  check(closedBell.length === 1 && closedBell[0].member_id === OWNER, "...and the bell goes to Mehdi, not to the member it closed with", closedBell);

  const H = nextId();
  const caps = { ...leadOf(H, { phone: "", business: "Capital Letters" }), email: "DUP.THREE@EXAMPLE.ORG" };
  const r3 = res(await ingest(H, caps));
  const poolBell = await pg(`select member_id, title from public.crm_notifications where lead_id = 'DUP3' and kind = 'lead_in'`);
  check(r3.result === "duplicate" && r3.leadId === "DUP3" && poolBell.length === 1 && poolBell[0].member_id === OWNER,
    "the same e-mail in capitals: duplicate of the pool lead, and Mehdi is told", { r3, poolBell });
  const mailLine = (await pg(`select data->>'detail' as d from public.outreach_events where id = $1`, [`oe_meta_${H}`]))[0]?.d || "";
  const mailAsk = (await pg(`select body from public.crm_requests where lead_id = 'DUP3' and kind = 'meta_form'`))[0]?.body || "";
  check(mailLine.startsWith("Someone sent the Instagram lead form with this lead's e-mail (") && poolBell[0]?.title === "Dup Pool Three: someone sent the Instagram form with this lead's e-mail"
    && mailAsk.startsWith(`Sent on the Instagram form "Website enquiry" with this lead's e-mail. Answers: `),
    "...and the line, the bell and the request say it came with the lead's e-mail (not its number)", { mailLine, title: poolBell[0]?.title, mailAsk });
  check((await pg(`select count(*)::int as n from public.crm_requests where lead_id = 'DUP2' and kind = 'meta_form'`))[0].n === 1,
    "a closed lead's answers wait for Mehdi too");
  /* The security review's probe: a stranger sends the form with an intern's lead's number, a name, an e-mail and
     "call me on another number". Nothing of it reaches the intern. */
  const S = nextId();
  const stranger = F.mapMetaLead(graphLead(S, { phone: "+91 90000 00011", email: "stranger@example.org", name: "Stranger Name", business: "Stranger Biz",
    field_data: [{ name: "full_name", values: ["Stranger Name"] }, { name: "phone_number", values: ["+91 90000 00011"] }, { name: "email", values: ["stranger@example.org"] },
      { name: "message", values: ["call me on 9000099999 not this number"] }] })).lead;
  const rs = res(await ingest(S, stranger));
  const ashaSees = JSON.stringify((await as("asha", `select data from public.outreach_events where lead_id = 'DUP1'`)).rows || []);
  const ashaLead = JSON.stringify((await as("asha", `select data from public.outreach_leads where id = 'DUP1'`)).rows || []);
  const ashaBells = JSON.stringify((await as("asha", `select title from public.crm_notifications where lead_id = 'DUP1'`)).rows || []);
  check(rs.result === "duplicate" && rs.leadId === "DUP1" && ashaSees.includes("Someone sent the Instagram lead form")
    && !/Stranger|stranger@example|9000099999|call me/.test(ashaSees + ashaLead + ashaBells),
    "a stranger's form with Asha's lead's number: Asha reads a neutral line, and no name, e-mail or text of theirs anywhere", { rs, ashaSees: ashaSees.slice(-300) });
  const strangerAsk = (await pg(`select body from public.crm_requests where lead_id = 'DUP1' and kind = 'meta_form' and body like '%Stranger Name%'`))[0]?.body || "";
  check(/stranger@example\.org/.test(strangerAsk) && /call me on 9000099999 not this number/.test(strangerAsk), "...the stranger's answers are in Mehdi's request", strangerAsk);
}
{
  // A flood: one Meta lead made today, then five more forms with its number the same India day.
  const first = nextId();
  const made = res(await ingest(first, leadOf(first, { phone: "+91 90000 00021", email: "", business: "Flood Target" })));
  const target = made.leadId;
  const results = [];
  let stamp = null;
  for (let i = 0; i < 5; i++) {
    const id = nextId();
    results.push(res(await ingest(id, leadOf(id, { phone: "9000000021", email: "", business: `Stranger ${i}` }))).result);
    if (i === 1) stamp = (await leadRow(target))?.updated_at;
  }
  const metaLines = await n(`select count(*) from public.outreach_events where lead_id = $1 and id like 'oe_meta_%'`, [target]);
  const bells = await n(`select count(*) from public.crm_notifications where lead_id = $1`, [target]);
  const quiet = await n(`select count(*) from public.meta_ingest_log where event = 'duplicate' and crm_lead_id = $1 and detail like 'quiet:%'`, [target]);
  check(made.result === "created" && results.every((x) => x === "duplicate"), "five more forms with the same number: all duplicate", results);
  check(metaLines === 3, "at most 3 Meta lines on the lead that day (the one that made it counts as one)", metaLines);
  check(bells === 1, "one bell that day (the new lead's own)", bells);
  const floodAsks = await n(`select count(*) from public.crm_requests where lead_id = $1 and kind = 'meta_form'`, [target]);
  check(floodAsks === 2, "and 2 requests to Mehdi (the 2 forms that touched it); the quiet ones add none", floodAsks);
  check(quiet === 3, "the rest are logged as quiet duplicates", quiet);
  check(+new Date((await leadRow(target))?.updated_at) === +new Date(stamp), "quiet duplicates change nothing on the lead (updated_at untouched)");
  await db.exec(`update public.meta_leads set done_at = done_at - interval '1 day' where crm_lead_id = '${target}'`);
  const next = nextId();
  const r = res(await ingest(next, leadOf(next, { phone: "+91 90000 00021", email: "", business: "Next Day" })));
  check(r.result === "duplicate" && await n(`select count(*) from public.outreach_events where lead_id = $1 and id like 'oe_meta_%'`, [target]) === 4
    && await n(`select count(*) from public.crm_notifications where lead_id = $1`, [target]) === 2, "the next India day: a line and a bell again");
}

/* ── 11. Who works a new Meta lead ──────────────────────────────────────── */
console.log("\n11. Assignment: pool, Mehdi, the rules\n");
const SET = `select public.meta_set_settings($1, $2) as r`;
let phoneN = 30;
const fresh = (opts = {}) => { const id = nextId(); return [id, leadOf(id, { phone: `+91 90000 000${++phoneN}`, email: "", ...opts })]; };
const assignedBells = async (leadId) => pg(`select member_id, kind, title from public.crm_notifications where lead_id = $1 order by id`, [leadId]);
{
  await as("owner", SET, ["owner", null], { commit: true });
  const [id, l] = fresh({ business: "Owner Mode Classes" });
  const r = res(await ingest(id, l));
  const b = await assignedBells(r.leadId);
  check(r.result === "created" && r.assignedTo === OWNER && b.length === 1 && b[0].kind === "lead_in",
    "mode owner: the lead is Mehdi's, and his one bell is lead_in (no 'assigned' to himself)", { r, b });

  await as("owner", SET, ["rules", null], { commit: true });
  const rule = await as("owner", `insert into public.crm_assignment_rules (name, kind, member_ids, priority) values ('Meta others', 'other', $1::uuid[], 1) returning id`,
    [`{${M.asha},${M.ayesha}}`], { commit: true });
  check(ok(rule), "the owner adds a rule: kind other, Asha then Ayesha", rule);
  const got = [];
  for (let i = 0; i < 4; i++) {
    const [lid, lead] = fresh({ business: `Rule Lead ${i}`, type: "Other business" });
    got.push(res(await ingest(lid, lead)));
  }
  check(JSON.stringify(got.map((x) => x.assignedTo)) === JSON.stringify([M.asha, M.ayesha, M.asha, M.ayesha]), "mode rules: Asha, Ayesha, Asha, Ayesha (the rotation)", got);
  const ab = await assignedBells(got[0].leadId);
  check(ab.some((x) => x.member_id === M.asha && x.kind === "assigned" && x.title === "New Instagram lead assigned to you: Rule Lead 0")
    && ab.some((x) => x.member_id === OWNER && x.kind === "lead_in"), "Asha gets 'New Instagram lead assigned to you: ...', Mehdi his lead_in", ab);
  const ashaNew = await n(`select count(*) from public.outreach_leads where assigned_to = $1 and coalesce(data->>'status','new') = 'new'`, [M.asha]);
  await db.exec(`update public.crm_members set new_lead_cap = ${ashaNew} where id = '${M.asha}'`);
  const [cid, clead] = fresh({ business: "Cap Lead", type: "Other business" });
  const capped = res(await ingest(cid, clead));
  check(capped.assignedTo === M.ayesha, "Asha at her New cap is skipped: Ayesha", capped);
  await db.exec(`update public.crm_members set new_lead_cap = 40 where id = '${M.asha}'`);
  await as("owner", `insert into public.crm_assignment_rules (name, kind, member_ids, priority) values ('Meta schools', 'school', $1::uuid[], 1)`,
    [`{${M.erin},${M.asha}}`], { commit: true });
  await db.exec(`update public.crm_members set active = false where id = '${M.erin}'`);
  const [sid, slead] = fresh({ business: "Sunrise Public School", type: "School" });
  const off = res(await ingest(sid, slead));
  check(off.assignedTo === M.asha, "a person switched off is skipped (Erin off: Asha)", off);
  const [did, dlead] = fresh({ business: "Smile Dental Clinic", type: "Dental clinic" });
  const none = res(await ingest(did, dlead));
  check(none.result === "created" && none.assignedTo === null, "no rule for its kind: the Unassigned pool", none);
  await as("owner", SET, ["pool", null], { commit: true });

  // meta_rule_pick is crm_apply_rules' inner loop: the same people in the same order, caps included.
  const coach = (i) => JSON.stringify({ id: `PAR${i}`, instituteName: `Parity ${i}`, kind: "coaching", status: "new", city: "Patna",
    createdAt: `2026-10-01T00:0${i}:00.000Z` });
  const ashaNow = await n(`select count(*) from public.outreach_leads where assigned_to = $1 and coalesce(data->>'status','new') = 'new'`, [M.asha]);
  await db.exec(`update public.crm_members set new_lead_cap = ${ashaNow + 1} where id = '${M.asha}'`);
  const ruleSql = `insert into public.crm_assignment_rules (name, kind, city, member_ids, priority) values ('Parity', 'coaching', 'patna', '{${M.asha},${M.bilal},${M.ayesha}}'::uuid[], 0)`;
  const viaApply = await tx("owner", async (q) => {
    await q(ruleSql);
    for (let i = 1; i <= 6; i++) await q(INS, [`PAR${i}`, coach(i)]);
    await q(`select * from public.crm_apply_rules(array['PAR1','PAR2','PAR3','PAR4','PAR5','PAR6'])`);
    return (await q(`select assigned_to from public.outreach_leads where id like 'PAR%' order by id`)).map((x) => x.assigned_to);
  });
  const viaPick = await tx("postgres", async (q) => {
    await q(ruleSql);
    for (let i = 1; i <= 6; i++) await q(INS, [`PAR${i}`, coach(i)]);
    for (let i = 1; i <= 6; i++) {
      const pick = (await q(`select private.meta_rule_pick('coaching', 'Kankarbagh, Patna') as p`))[0]?.p;
      await q(`update public.outreach_leads set assigned_to = $1 where id = $2`, [pick, `PAR${i}`]);
    }
    return (await q(`select assigned_to from public.outreach_leads where id like 'PAR%' order by id`)).map((x) => x.assigned_to);
  });
  await db.exec(`update public.crm_members set new_lead_cap = 40 where id = '${M.asha}'`);
  const name = (u) => Object.keys(M).find((k) => M[k] === u) || u;
  check(viaApply.length === 6 && viaApply.every(Boolean) && JSON.stringify(viaApply) === JSON.stringify(viaPick),
    "meta_rule_pick and crm_apply_rules give the same people in the same order (Asha's cap included)", { apply: viaApply.map(name), pick: viaPick.map(name) });
}

/* ── 12. Who reads a Meta lead: 0011's rules, unchanged ─────────────────── */
console.log("\n12. A Meta lead under 0011's rules\n");
{
  await as("owner", SET, ["rules", null], { commit: true });
  const [id, l] = fresh({ business: "Asha Meta Lead", type: "Other business", name: "Test Lead Private" });
  const r = res(await ingest(id, l));
  await as("owner", SET, ["pool", null], { commit: true });
  const X = r.leadId;
  const owner = r.assignedTo === M.asha ? "asha" : "ayesha";
  check(r.assignedTo === M.asha || r.assignedTo === M.ayesha, "a rules lead for a team member", r);
  const reads = (await as(owner, `select count(*)::int as n from public.outreach_leads where id = $1`, [X])).rows[0].n;
  const lines = (await as(owner, `select count(*)::int as n from public.outreach_events where lead_id = $1`, [X])).rows[0].n;
  check(reads === 1 && lines === 1, `${owner} reads the Meta lead assigned to her, and its history`, { reads, lines });
  const bilal = (await as("bilal", `select count(*)::int as n from public.outreach_leads where id = $1`, [X])).rows[0].n;
  const ov = (await as("bilal", `select * from public.crm_leads_overview() where id = $1`, [X])).rows;
  check(bilal === 0 && ov.length === 1 && ov[0].institute_name === "Asha Meta Lead" && Boolean(l.phone)
    && !JSON.stringify(ov).includes(l.phone) && !JSON.stringify(ov).includes("Test Lead Private"),
    "Bilal (See all) cannot read it, but sees its title, without contacts, in the overview", { bilal, ov });
  const anon = await as("anon", `select count(*) from public.outreach_leads`);
  check(!ok(anon) && anon.code === "42501", "anon reads nothing", anon);
  if (owner === "asha") {
    for (const key of ["metaCampaignName", "source"]) {
      const w = await as("asha", `update public.outreach_leads set data = data || jsonb_build_object($2::text, 'changed') where id = $1`, [X, key]);
      check(!ok(w) && w.code === "42501", `Asha cannot change "${key}" on it (0011's guard)`, w);
    }
    const stage = await as("asha", `update public.outreach_leads set data = data || '{"status":"contacted"}'::jsonb where id = $1 returning data->>'status' as s`, [X]);
    check(ok(stage) && stage.rows[0].s === "contacted", "...and can change its stage", stage);
  }
}

/* ── 12b. A member's own lead never passes for a Meta lead (0011's field guard, member INSERT) ── */
console.log("\n12b. A member who may add leads cannot add one that looks like a Meta lead\n");
{
  await as("owner", `select public.crm_save_member(p_member_id => $1, p_can_add_leads => true)`, [M.asha], { commit: true });
  const [id, l] = fresh({ business: "Squat Check Classes" });
  const squat = await as("asha", `insert into public.outreach_leads (id, data) values ($1, '{"instituteName":"Asha Squat","phone":"+91 90000 00990"}') returning id`,
    [F.META_LEAD_ID_PREFIX + id], { commit: true });
  check(!ok(squat) && squat.code === "42501", "Asha (Can add leads) cannot take the id a Meta lead will have (ol_meta_<its id>)", squat);
  const r = res(await ingest(id, l));
  const row = (await pg(`select data->>'instituteName' as t, created_by from public.outreach_leads where id = $1`, [F.META_LEAD_ID_PREFIX + id]))[0];
  check(r.result === "created" && r.leadId === F.META_LEAD_ID_PREFIX + id && row?.t === "Squat Check Classes" && row?.created_by === OWNER,
    "...so that Meta lead still arrives as itself, Mehdi's", { r, row });
  const sources = (await pg(`select private.meta_sources() as s`))[0]?.s || [];
  check(sources.length === F.META_SOURCES.length, "0012 has its four Meta sources", sources);
  for (const source of sources) {
    const w = await as("asha", `insert into public.outreach_leads (id, data) values ('ASHA_META', jsonb_build_object('instituteName', 'Asha Meta Look', 'source', $1::text, 'phone', '+91 90000 00991')) returning id`, [source]);
    check(!ok(w) && w.code === "42501", `Asha cannot add a lead whose source is 0012's "${source}" (0011's list matches 0012's)`, w);
  }
  /* Review, 3 Oct: the dashboard and the Source filter group a source by its trimmed lower case (JavaScript trims
     every kind of space), so the guard compares letters only: no case, spaces, invisible characters or punctuation. */
  const ADD = `insert into public.outreach_leads (id, data) values ('ASHA_META', jsonb_build_object('instituteName', 'Asha Meta Look', 'source', $1::text, 'phone', '+91 90000 00991')) returning id`;
  for (const source of ["Meta Lead Ads ", "\tInstagram Lead Ads", "Facebook Lead Ads\n", "Meta Leads Center　", "Meta Lead Ads​",
    "FacebooK Lead Ads", "meta-lead-ads", "  META  LEAD  ADS  ", "﻿Instagram Lead Ads"]) {
    const w = await as("asha", ADD, [source]);
    check(!ok(w) && w.code === "42501" && /that source is kept for leads from Facebook and Instagram forms/.test(w.error),
      `...nor ${JSON.stringify(source)} (letters only: a no-break space, tab, line break, invisible or Kelvin-sign copy)`, w);
  }
  for (const source of ["Manual", "Instagram", "Referral", "Meta Lead Ads (old campaign)"]) {
    const w = await as("asha", ADD, [source]);
    check(ok(w), `...while "${source}" is hers to use (rolled back)`, w);
  }
  const keys = await as("asha", `insert into public.outreach_leads (id, data) values ('ASHA_META', $1::jsonb) returning data`,
    [JSON.stringify({ instituteName: "Asha Meta Keys", phone: "+91 90000 00992", metaLeadId: id, metaPlatform: "ig", metaConsent: "yes", metaCampaignName: "Test campaign" })]);
  check(ok(keys) && !Object.keys(keys.rows[0].data).some((k) => /^meta/i.test(k)) && !F.isMetaLead(keys.rows[0].data),
    "a lead she adds keeps none of the meta... keys: it is never a Meta lead (rolled back)", keys);
  await as("owner", `select public.crm_save_member(p_member_id => $1, p_can_add_leads => false)`, [M.asha], { commit: true });
}

/* ── 13. The daily cap delays, it never drops ───────────────────────────── */
console.log("\n13. The daily cap\n");
const capBells = () => n(`select count(*) from public.crm_notifications where kind = 'intake' and title like '%limit%'`);
const resetAlerts = () => db.exec(`update public.meta_settings set alerted = '{}'::jsonb`);
{
  await db.exec(`update public.meta_leads set received_at = received_at - interval '2 days'`); // today starts empty
  await resetAlerts();
  await as("owner", SET, [null, 3], { commit: true });
  const ids = [nextId(), nextId(), nextId(), nextId(), nextId()];
  const three = res(await receive(ids.slice(0, 3).map((x) => item(x))));
  const fourth = res(await receive([item(ids[3])]));
  check(three.new === 3 && three.overCap === 0, "a cap of 3: three new ids are stored", three);
  check(fourth.overCap === 1 && fourth.new === 0 && fourth.fetch.length === 0, "the fourth that day: overCap 1, not stored, not fetched", fourth);
  check(await n(`select count(*) from public.meta_leads where leadgen_id = $1`, [ids[3]]) === 0, "...no row for it (Meta keeps it and sends it again)");
  const viaIngest = res(await ingest(ids[4], leadOf(ids[4], { phone: "+91 90000 00051", email: "" })));
  check(viaIngest.result === "over_cap" && await n(`select count(*) from public.meta_leads where leadgen_id = $1`, [ids[4]]) === 0,
    "a new id straight to ingest (the relay) over the cap: over_cap, nothing stored", viaIngest);
  const lines = await pg(`select detail from public.meta_ingest_log where event = 'over_cap' and at >= now() - interval '1 hour'`);
  check(lines.length === 1 && /^2 new leads over today's limit of 3/.test(lines[0].detail), "one over_cap log line for the day, counting both", lines);
  check(await capBells() === 1, "one 'cap' bell for Mehdi");
  const st = res(await as("owner", `select public.meta_intake_status($1, null) as r`, [FP]));
  check(st.overCapToday === 2 && st.dailyCap === 3, "the Meta page's status says how many waited today", st);
  await db.exec(`update public.meta_leads set received_at = received_at - interval '1 day' where received_at > now() - interval '1 hour'`);
  const nextDay = res(await receive([item(ids[3])]));
  check(nextDay.new === 1 && nextDay.fetch[0] === ids[3], "the next India day, Meta's retry fits: stored and fetched", nextDay);
  await as("owner", SET, [null, 300], { commit: true });
}

/* ── 14. Receive: sizes, Pages, and when a failed id is asked for again ─── */
console.log("\n14. Receive\n");
{
  const many = await receive(Array.from({ length: 1001 }, (_, i) => item(`9000000700${String(i).padStart(4, "0")}`)));
  check(!ok(many) && many.code === "22023", "1,001 items: refused (22023)", many);
  const badShape = await receive([{ ...item(nextId()), name: "Test Lead" }]);
  check(!ok(badShape) && badShape.code === "22023" && !/Test Lead/.test(badShape.error), "an item with another key (a name) is refused, and not quoted", badShape);
  const [o1, o2] = [nextId(), nextId()];
  const other = res(await receive([item(o1, { page_id: OTHER_PAGE }), item(o2, { page_id: null })]));
  check(other.otherPage === 2 && other.new === 0 && await n(`select count(*) from public.meta_leads where leadgen_id in ($1, $2)`, [o1, o2]) === 0,
    "another Page's item, and one with no page_id: counted, not stored", other);
  check(await n(`select count(*) from public.meta_ingest_log where event = 'other_page' and at > now() - interval '1 minute'`) >= 1, "...and logged as other_page");
  await resetAlerts();
  const pageBells = () => n(`select count(*) from public.crm_notifications where kind = 'intake' and title like '%Page id%'`);
  const before = await pageBells();
  const p1 = nextId();
  const nul = res(await receive([item(p1)], { page: null }));
  const wrong = res(await receive([item(p1)], { page: OTHER_PAGE }));
  check(nul.pageMismatch === true && wrong.pageMismatch === true && await n(`select count(*) from public.meta_leads where leadgen_id = $1`, [p1]) === 0,
    "META_PAGE_ID null, or not the connected Page: pageMismatch, nothing stored", { nul, wrong });
  check(await pageBells() === before + 1, "one 'page' bell, and a second within 12 hours adds none");

  const [g1, g2] = [nextId(), nextId()];
  await receive([item(g1), item(g2)]);
  await failed(g1, "token");
  await failed(g2, "not_found");
  const w1 = res(await receive([item(g1), item(g2)]));
  const c1 = res(await receive([item(g1), item(g2)], { channel: "catchup" }));
  check(w1.fetch.length === 0 && c1.fetch.length === 1 && c1.fetch[0] === g1,
    "a failed (token) id: not fetched again on the webhook within 10 minutes; the catch-up fetches it at once; a gone id never", { w1, c1 });
  await db.exec(`update public.meta_leads set updated_at = now() - interval '11 minutes' where leadgen_id = '${g1}'`);
  const w2 = res(await receive([item(g1)]));
  check(w2.fetch.length === 1, "...after 10 untouched minutes, the webhook fetches it again", w2);
  await db.exec(`update public.meta_leads set attempts = 30 where leadgen_id = '${g1}'`);
  const w3 = res(await receive([item(g1)]));
  check(w3.fetch.length === 0, "...but not at 30 attempts", w3);

  const g3 = nextId();
  await receive([item(g3)]);
  await failed(g3, "token");
  await db.exec(`update public.meta_settings set last_catchup_at = null`);
  const plain = res(await as("anon", `select public.meta_catchup_begin($1, false, $2) as r`, [TOKEN, PAGE_ID], { commit: true }));
  await db.exec(`update public.meta_settings set last_catchup_at = now() - interval '2 minutes'`);
  const forced = res(await as("anon", `select public.meta_catchup_begin($1, true, $2) as r`, [TOKEN, PAGE_ID], { commit: true }));
  check(plain.ok === true && !plain.retry.includes(g3) && forced.ok === true && forced.retry.includes(g3),
    "meta_catchup_begin: the owner's forced run retries an id that failed a minute ago; the cron's run waits 10 minutes", { plain, forced });
}

/* ── 15. Failures ───────────────────────────────────────────────────────── */
console.log("\n15. When Meta does not give us a lead\n");
const row = async (id) => (await pg(`select status, attempts, error_kind, last_error from public.meta_leads where leadgen_id = $1`, [id]))[0];
const intakeBells = () => n(`select count(*) from public.crm_notifications where kind = 'intake'`);
{
  await resetAlerts();
  const [h1, h2, h3, h4] = [nextId(), nextId(), nextId(), nextId()];
  await receive([item(h1), item(h2), item(h3), item(h4)]);
  const t = res(await failed(h1, "transient", "HTTP 503"));
  check(t.status === "pending" && t.attempts === 1 && (await row(h1)).status === "pending", "transient: still pending, attempts 1", t);
  const b0 = await intakeBells();
  const tk = res(await failed(h2, "token", "Graph 190/463 OAuthException EAAB1234567890abcdefghijklmnop"));
  const r2 = await row(h2);
  check(tk.status === "failed" && r2.error_kind === "token" && await intakeBells() === b0 + 1, "token: failed, and one 'Lead Ads' bell for Mehdi", { tk, r2 });
  check(!/EAAB1234567890/.test(r2.last_error) && /\[token\]/.test(r2.last_error), "...the error kept has no token in it, even when one was sent", r2);
  await failed(h3, "permission", "Graph 100/33 GraphMethodException");
  check((await row(h3)).error_kind === "permission" && await intakeBells() === b0 + 1, "permission (Graph 100/33): failed, and no second bell within 12 hours");
  await as("owner", SET, [null, await n(`select count(*) from public.meta_leads where received_at >= now() - interval '12 hours'`)], { commit: true });
  await receive([item(nextId())]);
  await as("owner", SET, [null, 300], { commit: true });
  check(await intakeBells() === b0 + 2, "but a cap alert in those 12 hours still rings (one limiter per topic)");
  const g = res(await failed(h4, "not_found"));
  check(g.status === "gone" && (await row(h4)).status === "gone", "not_found: gone", g);

  const done = (await pg(`select leadgen_id, crm_lead_id from public.meta_leads where status = 'created' and crm_lead_id is not null limit 1`))[0];
  const was = await row(done.leadgen_id);
  for (const kind of ["transient", "token", "not_found", "invalid"]) {
    const x = res(await failed(done.leadgen_id, kind));
    check(x.status === "created" && JSON.stringify(await row(done.leadgen_id)) === JSON.stringify(was), `a late ${kind} failure on a created lead: unchanged, status created`, x);
  }
  for (const id of [h4]) {
    const x = res(await failed(id, "token"));
    check(x.status === "gone" && (await row(id)).status === "gone", "...and on a gone one", x);
  }
  await as("owner", `delete from public.outreach_leads where id = $1`, [done.crm_lead_id], { commit: true });
  const back = res(await receive([item(done.leadgen_id)], { channel: "catchup" }));
  check(back.fetch.length === 0 && await n(`select count(*) from public.outreach_leads where id = $1`, [done.crm_lead_id]) === 0,
    "after the owner deletes it, a receive of its id: not fetched, no lead", back);

  const due = async (wait) => res(await as("anon", `select public.meta_retry_due($1, 50, $2) as r`, [TOKEN, wait], { commit: true }));
  check(!(await due(true)).includes(h2) && (await due(false)).includes(h2), "meta_retry_due waits 10 minutes, unless the owner forces it");
  await db.exec(`update public.meta_leads set updated_at = now() - interval '11 minutes' where leadgen_id = '${h2}'`);
  check((await due(true)).includes(h2), "...after 10 minutes it is due");
  await db.exec(`update public.meta_leads set attempts = 30 where leadgen_id = '${h2}'`);
  check(!(await due(false)).includes(h2), "...never at 30 attempts");
  const old89 = nextId();
  await receive([item(old89)]);
  await db.exec(`update public.meta_leads set received_at = now() - interval '90 days' where leadgen_id = '${old89}'`);
  const list = await due(false);
  check(!list.includes(old89) && (await row(old89)).status === "gone", "an id waiting longer than 89 days becomes gone (Meta keeps leads 90)", await row(old89));
  check(list.length <= 50, "at most 50 ids at a time", list.length);
}

/* ── 16. The catch-up's window and the clean-up ─────────────────────────── */
console.log("\n16. The daily catch-up\n");
const BEGIN = `select public.meta_catchup_begin($1, $2, $3) as r`;
const END = `select public.meta_catchup_end($1, $2::timestamptz, $3::jsonb, $4::jsonb) as r`;
const settings = async () => (await pg(`select last_catchup_at, last_poll_until, forms from public.meta_settings`))[0];
{
  await db.exec(`update public.meta_settings set last_catchup_at = null, last_poll_until = null`);
  const b1 = res(await as("anon", BEGIN, [TOKEN, false, PAGE_ID], { commit: true }));
  const b2 = res(await as("anon", BEGIN, [TOKEN, false, PAGE_ID], { commit: true }));
  check(b1.ok === true && near(b1.since, 3 * 86400000 + 120000) && Date.parse(b1.since) < Date.now() - 3 * 86400000 + 60000,
    "the first run polls from 3 days back", b1);
  check(b2.ok === false && b2.reason === "too_soon" && typeof b2.nextAt === "string", "a second run within 30 minutes: too_soon", b2);
  const at = (await settings()).last_catchup_at;
  const mm = res(await as("anon", BEGIN, [TOKEN, true, OTHER_PAGE], { commit: true }));
  check(mm.ok === false && mm.reason === "page_mismatch" && +new Date((await settings()).last_catchup_at) === +new Date(at),
    "another Page id: page_mismatch, and the throttle is untouched", mm);
  await db.exec(`update public.meta_settings set last_catchup_at = now() - interval '2 minutes'`);
  check(res(await as("anon", BEGIN, [TOKEN, true, PAGE_ID], { commit: true })).ok === true, "the owner's forced run, a minute later: ok");

  const t1 = new Date(Date.now() - 60000).toISOString();
  await as("anon", END, [TOKEN, null, JSON.stringify([{ id: "9100000000000001", name: "Website enquiry", status: "ACTIVE" }, { id: "x" }]), "{}"], { commit: true });
  const s0 = await settings();
  check(s0.last_poll_until === null && s0.forms.length === 1 && s0.forms[0].name === "Website enquiry", "an end without p_until keeps the window; forms with a bad id are dropped", s0);
  await as("anon", END, [TOKEN, t1, null, JSON.stringify({ polled: 12, created: 2, note: "Test Lead One +919000000001", failed: "3" })], { commit: true });
  const s1 = await settings();
  check(+new Date(s1.last_poll_until) === +new Date(t1), "with p_until, the window moves", s1);
  await as("anon", END, [TOKEN, new Date(Date.now() - 3600000).toISOString(), null, null], { commit: true });
  check(+new Date((await settings()).last_poll_until) === +new Date(t1), "...never backwards");
  const line = (await pg(`select detail from public.meta_ingest_log where event = 'catchup' order by id desc offset 1 limit 1`))[0]?.detail;
  check(/created 2/.test(line) && /polled 12/.test(line) && !/Test Lead|9000000001|failed/.test(line),
    "the catch-up's log line carries the whole numbers of p_stats only", line);

  await db.exec(`insert into public.meta_leads (leadgen_id, channel, status, received_at)
                   select (8100000000000 + g)::text, 'webhook', 'created', now() - interval '121 days' from generate_series(1, 5010) g;
                 insert into public.meta_ingest_log (at, channel, event, detail)
                   select now() - interval '181 days', 'webhook', 'received', 'old' from generate_series(1, 5010) g;`);
  const keepMeta = await n(`select count(*) from public.meta_leads where received_at > now() - interval '120 days'`);
  await as("anon", END, [TOKEN, null, null, null], { commit: true });
  const left1 = [await n(`select count(*) from public.meta_leads where received_at < now() - interval '120 days'`),
    await n(`select count(*) from public.meta_ingest_log where at < now() - interval '180 days'`)];
  await as("anon", END, [TOKEN, null, null, null], { commit: true });
  const left2 = [await n(`select count(*) from public.meta_leads where received_at < now() - interval '120 days'`),
    await n(`select count(*) from public.meta_ingest_log where at < now() - interval '180 days'`)];
  check(JSON.stringify(left1) === "[10,10]" && JSON.stringify(left2) === "[0,0]", "old rows go: meta_leads after 120 days, the log after 180, at most 5,000 of each a call", { left1, left2 });
  check(await n(`select count(*) from public.meta_leads where received_at > now() - interval '120 days'`) === keepMeta, "...and nothing newer");
}

/* ── 17. The relay, the handshake line, the status ──────────────────────── */
console.log("\n17. The relay's token, the handshake, the status\n");
{
  const R = nextId();
  const viaRelay = res(await ingest(R, leadOf(R, { phone: "+91 90000 00071", email: "", business: "Relay Classes" }), { token: RELAY, channel: "relay", page: null }));
  const relayed = (await pg(`select channel from public.meta_leads where leadgen_id = $1`, [R]))[0];
  check(viaRelay.result === "created" && relayed.channel === "relay", "the relay's own token may ingest (channel relay); it may not receive or fail ids (checked above)", { viaRelay, relayed });
  const wrongChannel = await ingest(nextId(), leadOf("1"), { channel: "relay" });
  check(!ok(wrongChannel) && wrongChannel.code === "22023", "the webhook's token cannot claim to be the relay", wrongChannel);
  const V = `select public.meta_log_verified($1) as r`;
  await as("anon", V, [TOKEN], { commit: true });
  await as("anon", V, [TOKEN], { commit: true });
  check(await n(`select count(*) from public.meta_ingest_log where event = 'verified'`) === 1, "Meta's handshake: one 'verified' line an hour at most");
  const st = res(await as("owner", `select public.meta_intake_status($1, $2) as r`, [FP, FP_RELAY]));
  check(st.lastVerifiedAt && st.lastTestAt && st.lastReceivedAt && st.lastLeadAt && st.lastLeadId === `ol_meta_${R}` && st.counts.today >= 1
    && st.counts.failedToken >= 1 && st.counts.failedPermission >= 1 && st.counts.duplicatesQuiet === 3 && typeof st.alerts === "object",
  "meta_intake_status: the last handshake, test, notification and lead, and the counts", st);
  check(!/Test Lead|example\.org|\+9190000/.test(JSON.stringify(st)), "...and no name, number or e-mail in it");

  // The intake's own tables, now that they hold rows: the owner's alone.
  for (const t of ["meta_leads", "meta_ingest_log"]) {
    const total = await n(`select count(*) from public.${t}`);
    const mine = (await as("owner", `select count(*)::int as n from public.${t}`)).rows?.[0]?.n;
    check(total > 0 && mine === total, `the owner reads every row of ${t} (${total})`, mine);
    for (const who of ["asha", "bilal", "ayesha"]) {
      const r = await as(who, `select count(*)::int as n from public.${t}`);
      check(ok(r) && r.rows[0].n === 0, `${who} reads no row of ${t} (owner only, not even an admin or a See-all member)`, r);
    }
  }
}

/* ── 18. 0011 still holds ───────────────────────────────────────────────── */
console.log("\n18. 0011 after 0012\n");
{
  const before = JSON.stringify(await pg(`select id, assigned_to, created_by from public.outreach_leads where id like 'ol_meta_%' order by id`));
  let err = null;
  try { await db.exec(M11); } catch (e) { err = e.message; }
  const after = JSON.stringify(await pg(`select id, assigned_to, created_by from public.outreach_leads where id like 'ol_meta_%' order by id`));
  check(!err && before === after && before.length > 20, "re-running 0011 after Meta leads exist changes no Meta lead's assignee or creator", err);
  for (const kind of ["assigned", "moved_away", "handoff", "review", "info", "demo_ready", "resolved", "lead_in", "intake"]) {
    const r = await as("postgres", `insert into public.crm_notifications (member_id, kind, title) values ($1, $2, 'x')`, [OWNER, kind]);
    check(ok(r), `the bell takes kind ${kind}`, r);
  }
  const bad = await as("postgres", `insert into public.crm_notifications (member_id, kind, title) values ($1, 'bogus', 'x')`, [OWNER]);
  check(!ok(bad) && bad.code === "23514", "...and refuses an unknown kind", bad);
  for (const kind of ["demo", "correction", "question", "handoff", "give_back", "meta_form"]) {
    const r = await as("postgres", `insert into public.crm_requests (lead_id, kind) values ('DUP1', $1)`, [kind]);
    check(ok(r), `a request takes kind ${kind} (0011's five and 0012's meta_form, after 0011 ran again)`, r);
  }
  const badAsk = await as("postgres", `insert into public.crm_requests (lead_id, kind) values ('DUP1', 'bogus')`);
  check(!ok(badAsk) && badAsk.code === "23514", "...and refuses an unknown kind", badAsk);
  let again = null;
  try { await db.exec(M12); } catch (e) { again = e.message; }
  check(!again, "0012 applies again after that (and after 0011 re-ran)", again);
  // A check on "kind" under another name would refuse the new kinds; 0012 never drops by a name it
  // has to look up (that needs dynamic SQL), so it stops, names it, and changes nothing.
  await db.exec(`alter table public.crm_notifications rename constraint crm_notifications_kind_check to zz_renamed_kind_check`);
  let renamed = null;
  try { await db.exec(M12); } catch (e) { renamed = e.message; }
  const still = (await pg(`select conname from pg_constraint where conrelid = 'public.crm_notifications'::regclass and contype = 'c'`)).map((x) => x.conname);
  check(renamed && /another check on "kind" \(zz_renamed_kind_check\)/.test(renamed) && still.includes("zz_renamed_kind_check")
    && !still.includes("crm_notifications_kind_check"),
    "a renamed check on the bell's kind: 0012 stops, names it and how to drop it, and changes nothing", { renamed, still });
  await db.exec(`alter table public.crm_notifications rename constraint zz_renamed_kind_check to crm_notifications_kind_check`);
  await db.exec(`alter table public.crm_requests rename constraint crm_requests_kind_check to zz_renamed_request_kind_check`);
  let renamedAsk = null;
  try { await db.exec(M12); } catch (e) { renamedAsk = e.message; }
  const stillAsk = (await pg(`select conname from pg_constraint where conrelid = 'public.crm_requests'::regclass and contype = 'c'`)).map((x) => x.conname);
  check(renamedAsk && /crm_requests has another check on "kind" \(zz_renamed_request_kind_check\)/.test(renamedAsk) && stillAsk.includes("zz_renamed_request_kind_check"),
    "the same for a renamed check on a request's kind", { renamedAsk, stillAsk });
  await db.exec(`alter table public.crm_requests rename constraint zz_renamed_request_kind_check to crm_requests_kind_check`);
  let back = null;
  try { await db.exec(M12); } catch (e) { back = e.message; }
  check(!back, "0012 applies again once the name is back", back);
}

/* ── 18b. The consent tick, held by the database (review, 3 Oct) ─────────── */
console.log("\n18b. A Meta lead who did not tick the WhatsApp-and-phone box: e-mail only, for everyone\n");
{
  const NO = nextId();
  const YES = nextId();
  const rn = res(await ingest(NO, leadOf(NO, { phone: "+91 90000 00771", email: "", business: "Consent Unticked Classes",
    custom_disclaimer_responses: [{ checkbox_key: "contact_ok", is_checked: "0" }] })));
  const ry = res(await ingest(YES, leadOf(YES, { phone: "+91 90000 00772", email: "", business: "Consent Ticked Classes" })));
  const tick = Object.fromEntries((await pg(`select id, data->>'metaConsent' as c from public.outreach_leads where id in ($1, $2)`, [rn.leadId, ry.leadId])).map((x) => [x.id, x.c]));
  check(rn.result === "created" && ry.result === "created" && tick[rn.leadId] === "no" && tick[ry.leadId] === "yes",
    "two Meta leads, one with the box left unticked (metaConsent no), one ticked", { rn, ry, tick });
  const given = await as("owner", `select public.crm_assign_leads(array[$1, $2], $3) as n`, [rn.leadId, ry.leadId, M.asha], { commit: true });
  check(ok(given), "Mehdi assigns both to Asha", given);
  let seqE = 0;
  const ev = (who, lead, data) => as(who, `insert into public.outreach_events (id, lead_id, data) values ($1, $2, $3::jsonb) returning id`,
    [`oe_consent_${++seqE}`, lead, JSON.stringify(data)]);
  const NO_TICK = /^crm: they did not tick the box on the Facebook or Instagram form that allows WhatsApp and calls\. E-mail them only\.$/;
  for (const [who, data, what] of [
    ["asha", { type: "sent", channel: "whatsapp", stage: "first" }, "Asha's first WhatsApp"],
    ["asha", { type: "sent", channel: "whatsapp", stage: "follow_up_1" }, "Asha's WhatsApp follow-up"],
    ["asha", { type: "call", channel: "call", outcome: "no_answer" }, "Asha's call"],
    ["asha", { type: "call", outcome: "connected_interested" }, "Asha's call with no channel on it"],
    ["asha", { type: "sent", templateId: "wa_first_new_school_en" }, "a WhatsApp send with its channel left out (the template id gives it away)"],
    ["ayesha", { type: "sent", channel: "whatsapp", stage: "first" }, "an admin's WhatsApp"],
    ["owner", { type: "sent", channel: "whatsapp", stage: "first" }, "Mehdi's own WhatsApp (the promise is the firm's)"],
    ["owner", { type: "call", channel: "call", outcome: "connected_interested" }, "Mehdi's own call"],
  ]) {
    const w = await ev(who, rn.leadId, data);
    check(!ok(w) && w.code === "42501" && NO_TICK.test(w.error || ""), `box left unticked: ${what} is refused (42501, the screen's own sentence)`, w);
  }
  for (const [who, lead, data, what] of [
    ["asha", rn.leadId, { type: "sent", channel: "email", stage: "first" }, "Asha's e-mail to them"],
    ["asha", rn.leadId, { type: "note", detail: "Wrote to them by e-mail" }, "a note"],
    ["asha", rn.leadId, { type: "replied", channel: "whatsapp", detail: "They wrote to us first" }, "their own WhatsApp reply, logged"],
    ["owner", rn.leadId, { type: "sent", channel: "email", stage: "first" }, "Mehdi's e-mail"],
    ["asha", ry.leadId, { type: "sent", channel: "whatsapp", stage: "first" }, "a WhatsApp to the lead who ticked the box"],
    ["asha", ry.leadId, { type: "call", channel: "call", outcome: "no_answer" }, "a call to the lead who ticked the box"],
  ]) {
    const w = await ev(who, lead, data);
    check(ok(w), `...while ${what} still saves (rolled back)`, w);
  }
}

/* ── 19. The same lists as src/lib/meta/fields.js ───────────────────────── */
console.log("\n19. Parity with fields.js\n");
{
  const keys = (await pg(`select private.meta_lead_keys() as k`))[0]?.k;
  check(JSON.stringify(keys) === JSON.stringify([...F.META_LEAD_KEYS]), "private.meta_lead_keys() equals META_LEAD_KEYS, in order", keys);
  const maxes = {};
  for (const k of F.META_LEAD_KEYS) maxes[k] = (await pg(`select private.meta_max($1) as m`, [k]))[0]?.m;
  check(JSON.stringify(maxes) === JSON.stringify(F.META_MAX), "private.meta_max(k) equals META_MAX for every key", maxes);
  const sources = (await pg(`select private.meta_sources() as s`))[0]?.s;
  check(JSON.stringify(sources) === JSON.stringify([...F.META_SOURCES]), "private.meta_sources() equals META_SOURCES", sources);
  const labels = {};
  for (const c of ["fb", "ig", "msg", "an", "wa", "xx", ""]) labels[c] = (await pg(`select private.meta_platform_label($1) as l`, [c]))[0]?.l === F.platformLabel(c);
  check(Object.values(labels).every(Boolean), "private.meta_platform_label equals platformLabel", labels);
}

/* ── 20. The SQL-editor version (supabase/tests/meta_leads_rls.sql) passes here too ── */
console.log("\n20. supabase/tests/meta_leads_rls.sql\n");
{
  const before = JSON.stringify(await pg(`select ingest_sha256, page_id from public.meta_settings`));
  const leadsBefore = await n(`select count(*) from public.outreach_leads`);
  let err = null;
  let said = "";
  try {
    const out = await db.exec(read("supabase/tests/meta_leads_rls.sql"));
    said = JSON.stringify(out.map((x) => x.rows));
  } catch (e) {
    err = e.message;
    try { await db.exec("rollback"); } catch { /* not in a transaction */ }
  }
  check(!err && said.includes("ALL META INTAKE CHECKS PASSED"), "the SQL-editor test passes", err || said.slice(-200));
  check(JSON.stringify(await pg(`select ingest_sha256, page_id from public.meta_settings`)) === before
    && await n(`select count(*) from public.outreach_leads`) === leadsBefore, "...and rolls back: the real Connect and leads are as they were");
}

finish();
