/**
 * The client file in the database (migration 0014), tested on a real PostgreSQL: PGlite, Postgres in
 * WebAssembly inside Node, the same harness as scripts/test-crm-rls.mjs and test-meta-rls.mjs (their
 * Supabase-shaped stub is copied here; those files are not touched). client-process-spec 14.1.
 *
 *   node scripts/test-clients-rls.mjs                               every check must pass (exit 0)
 *   CLIENTS_RLS_NEGATIVE=policy node scripts/test-clients-rls.mjs   the owner check removed from the clients
 *                                                                   policy: must FAIL (exit 1)
 *   CLIENTS_RLS_NEGATIVE=insert node scripts/test-clients-rls.mjs   the documents guard's insert branch removed,
 *                                                                   so a forged "issued" row goes in: must FAIL (exit 1)
 *   CLIENTS_RLS_NEGATIVE=advance node scripts/test-clients-rls.mjs  crm_issue_document's "the advance is billed once"
 *                                                                   refusals removed (the advance, part 2, a change
 *                                                                   request's advance): must FAIL (exit 1)
 *   CLIENTS_RLS_NEGATIVE=events node scripts/test-clients-rls.mjs   the timeline's "a line belongs to the client of its
 *                                                                   project" refusal removed: must FAIL (exit 1)
 *
 * Needs:  npm i -D @electric-sql/pglite   (or PGLITE_FROM=<folder with node_modules/@electric-sql/pglite>)
 * Files:  supabase/SETUP_ALL.sql (read only), supabase/migrations/0014_client_process.sql,
 *         supabase/tests/clients_rls.sql.
 *
 * HOW: the stub, the real SETUP_ALL.sql cut before its 0014 section (0001 to 0013, so the team of 0011 is
 * there), Mehdi, a member and an admin made through 0011's own functions, a lead, then 0014 TWICE (it must
 * be re-runnable). Every caller acts the way PostgREST makes them act: SET LOCAL ROLE plus
 * request.jwt.claims, each statement in its own transaction. Then every check of the design's
 * _build/specs/check-0014-draft.mjs, word for word (its 34 and the 28 of the review of 4 Oct 2026), the
 * admin as well as the member, the file itself, the grants, the 0005, 0011 and 0012 objects unchanged,
 * supabase/tests/clients_rls.sql on the same database (it must pass and change nothing), and finally the
 * whole SETUP_ALL.sql pasted into a new project.
 *
 * Fixtures are fictional: "Example School", @example.org, ids cl_abcdef1 and the like.
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
for (const p of ["supabase/SETUP_ALL.sql", "supabase/migrations/0014_client_process.sql", "supabase/tests/clients_rls.sql"]) {
  if (!existsSync(join(ROOT, p))) throw new Error(`missing ${p}`);
}
const SETUP_FULL = read("supabase/SETUP_ALL.sql");
const M14_FILE = read("supabase/migrations/0014_client_process.sql");
const EDITOR_TEST = read("supabase/tests/clients_rls.sql");

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

const NEG = process.env.CLIENTS_RLS_NEGATIVE || "";
if (NEG && !["policy", "insert", "advance", "events"].includes(NEG)) throw new Error(`CLIENTS_RLS_NEGATIVE=${NEG}: use policy, insert, advance or events`);
const { PGlite, pgcrypto } = await loadPGlite();
const fails = [];
let pass = 0;
const ok = (c, m, got) => {
  if (c) { pass++; console.log("ok    " + m); }
  else { fails.push(m); console.log("FAIL  " + m + (got !== undefined ? "\n        got: " + JSON.stringify(got).slice(0, 500) : "")); }
};
const finish = () => {
  console.log(`\n${pass} passed, ${fails.length} failed${NEG ? ` (negative mode: ${NEG})` : ""}`);
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
const BOX_14 = /^-- ┌[─ ]*0014_client_process\.sql[─ ]*┐$/m;
const BOX_13 = /^-- ┌[─ ]*0013_rows_by_slug\.sql/m;
const CUT = SETUP_FULL.search(BOX_14);
if (CUT < 0) throw new Error("SETUP_ALL.sql has no 0014 section to cut at");
const M14 = M14_FILE;

/* ── 0. The file itself ─────────────────────────────────────────────────── */
console.log("\n0. The migration file\n");
ok(CUT > SETUP_FULL.search(BOX_13) && SETUP_FULL.slice(CUT).includes(M14.trim()),
  "SETUP_ALL.sql carries 0014 exactly as the migration file, under its header, after 0013");
const upTo = Number((SETUP_FULL.slice(0, 600).match(/0001 to (\d{4})\b/) || [])[1] || 0);
ok(upTo >= 14, `...and its first lines say 0001 to 0014 (they say 0001 to ${String(upTo).padStart(4, "0")})`);
ok(!/The last part, 0013/.test(SETUP_FULL.slice(0, 900)) && /^-- 0013 commits in two steps/m.test(SETUP_FULL.slice(0, 900)),
  "...and no longer calls 0013 the last part");
const code14 = M14.replace(/--[^\n]*/g, "");
const noTriggerSyntax = code14.replace(/for each row execute function/gi, "").replace(/(grant|revoke all on function|revoke) execute on function/gi, "");
ok(!/\bexecute\b/i.test(noTriggerSyntax.replace(/grant execute on function/gi, "")) && !/\bformat\s*\(/i.test(code14) && !/\bquote_ident\b/i.test(code14),
  "0014 has no dynamic SQL (no EXECUTE statement, no format(), no quote_ident)", code14.match(/.{0,40}\bexecute\b.{0,40}/gi));
ok(/notify pgrst, 'reload schema';\s*$/.test(M14), "0014 ends with notify pgrst, 'reload schema';");
ok(!/\b(crm_members|crm_me|meta_|private\.crm_member|crm_patch_lead)\b/.test(code14),
  "0014 uses nothing from 0011 or 0012 (no crm_members, crm_me, meta_ or 0011 helper)");
ok(/Needs 0005 and 0007\. Safe to run more than once,\s*\n?--?\s*and on its own after 0013/.test(M14),
  "0014's header says it needs 0005 and 0007, and is safe to run more than once and on its own after 0013");
ok(!/password/i.test(code14), "0014 has no column, check or function that mentions a password");
{
  const bare = new PGlite({ extensions: { pgcrypto } });
  await bare.exec(STUB);
  let err = null;
  try { await bare.exec(M14); } catch (e) { err = e.message; }
  const made = (await bare.query(`select to_regclass('public.crm_clients') a, to_regclass('public.crm_documents') b,
    to_regprocedure('public.crm_issue_document(text)') c`)).rows[0];
  ok(err && /0014 needs 0005 and 0007/.test(err), "0014 on a database without 0005 and 0007 stops with '0014 needs 0005 and 0007'", err);
  ok(!made.a && !made.b && !made.c, "...and creates nothing", made);
  await bare.close();
}

/* ── 1. The real database: 0001 to 0013, the team, a lead, then 0014 twice ─ */
console.log("\n1. The real database, then 0014 twice\n");
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(STUB);
await db.exec(SETUP_FULL.slice(0, CUT));
// From 30 Oct 2026 Supabase grants new tables and sequences to nobody: 0014 must grant what it needs itself.
await db.exec(`alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
               alter default privileges in schema public revoke all on sequences from anon, authenticated, service_role;`);
const OWNER_EMAIL = "mehdialam2002@gmail.com"; // seeded into public.admins by 0005
const P = {};
for (const [k, email] of [["owner", OWNER_EMAIL], ["member", "intern@example.org"], ["admin", "senior@example.org"]]) {
  const r = await db.query(`insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id`, [email]);
  P[k] = { uid: r.rows[0].id, email };
}

/** One statement as a caller, the way PostgREST runs it; committed when it succeeds. */
const as = async (who, sql, params = []) => {
  try {
    await db.exec("begin");
    if (who === "anon") {
      await db.exec("set local role anon");
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "anon" })]);
    } else if (who !== "postgres") {
      const p = P[who];
      await db.exec("set local role authenticated");
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: p.uid, email: p.email, role: "authenticated", aud: "authenticated" }),
      ]);
    }
    const r = await db.query(sql, params);
    await db.exec("commit");
    return { rows: r.rows, affected: r.affectedRows };
  } catch (e) {
    await db.exec("rollback");
    return { error: e.message, code: e.code };
  }
};
const pg = async (sql, params) => (await db.query(sql, params)).rows;

// The team (0011), through the owner's own functions: a member (an intern) and an admin (a trusted senior).
let r = await as("owner", `select public.crm_me() as me`);
ok(r.rows?.[0]?.me?.role === "owner", "0011 is there: Mehdi is the owner", r);
r = await as("owner", `select public.crm_save_member(p_email => $1, p_display_name => 'Intern Example', p_role => 'member') as id`, [P.member.email]);
ok(!r.error, "Mehdi adds a member (0011)", r);
r = await as("owner", `select public.crm_save_member(p_email => $1, p_display_name => 'Senior Example', p_role => 'admin') as id`, [P.admin.email]);
ok(!r.error, "Mehdi adds an admin (0011)", r);
r = await as("member", `select public.crm_me() as me`);
ok(r.rows?.[0]?.me?.role === "member", "the member signs in (crm_me links the login)", r);
r = await as("admin", `select public.crm_me() as me`);
ok(r.rows?.[0]?.me?.role === "admin", "the admin signs in", r);
// The lead the client file is opened from (0011's guard sees Mehdi's own insert).
r = await as("owner", `insert into public.outreach_leads (id, data, updated_at) values ('ol_test_1', '{"id":"ol_test_1","instituteName":"Example School","kind":"school","status":"proposal"}', now())`);
ok(!r.error, "Mehdi has a lead at Proposal", r);

/** What 0005, 0011 and 0012 made, to prove 0014 leaves it as it was. */
const fingerprint = async () => (await pg(`
  select md5(string_agg(x, '|' order by x)) as f from (
    select 'fn:' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')=' || md5(pg_get_functiondef(p.oid)) as x
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prokind = 'f' and p.proname not like 'crm_issue_document'
       and p.proname not in ('crm_fy', 'crm_ist_today', 'crm_touch', 'crm_documents_guard', 'crm_payments_guard', 'crm_projects_guard', 'crm_events_stamp')
    union all
    select 'pol:' || schemaname || '.' || tablename || '.' || policyname || '=' || coalesce(qual, '') || '/' || coalesce(with_check, '') || '/' || cmd || '/' || array_to_string(roles, ',')
      from pg_policies where schemaname = 'public' and tablename not like 'crm\\_client%' and tablename not in ('crm_projects', 'crm_documents', 'crm_payments', 'crm_doc_counters', 'crm_clients')
    union all
    select 'grant:' || table_name || ':' || grantee || ':' || privilege_type
      from information_schema.role_table_grants
     where table_schema = 'public' and table_name not in ('crm_client_settings', 'crm_clients', 'crm_projects', 'crm_documents', 'crm_payments', 'crm_client_events', 'crm_doc_counters')
  ) s`))[0].f;
const before = await fingerprint();
const contentPolicy = async () => (await pg(`select qual from pg_policies where schemaname = 'public' and tablename = 'content' and policyname = 'read public content'`))[0]?.qual;
const contentBefore = await contentPolicy();

let migErr = null;
try { await db.exec(M14); await db.exec(M14); } catch (e) { migErr = e.message; }
ok(!migErr, "0014 applies on top of the real SETUP_ALL.sql (0001 to 0013), and applies again (re-runnable)", migErr);
if (migErr) finish();
ok(true, "0014 draft runs twice");
ok((await fingerprint()) === before, "0014 changes no function, policy or grant of 0005, 0011, 0012 or 0013");
ok((await contentPolicy()) === contentBefore && Boolean(contentBefore), "the 0005 (as 0013 left it) content read policy is unchanged");

if (NEG === "policy") {
  await db.exec(`drop policy "crm_clients owner" on public.crm_clients;
    create policy "crm_clients owner" on public.crm_clients for all to authenticated using (true) with check (true);`);
}
if (NEG === "insert") {
  const guard = (await pg(`select pg_get_functiondef('private.crm_documents_guard()'::regprocedure) as d`))[0].d;
  const broken = guard.replace(/if tg_op = 'INSERT' then\s+if new\.status <> 'draft' then[\s\S]*?return new;\s+end if;/, "if tg_op = 'INSERT' then\n    return new;\n  end if;");
  if (broken === guard) { console.log("negative mode: the insert branch was not found; nothing proved"); process.exit(3); }
  await db.exec(broken);
}
if (NEG === "advance") {
  const fn = (await pg(`select pg_get_functiondef('public.crm_issue_document(text)'::regprocedure) as d`))[0].d;
  const broken = fn
    .replace("raise exception 'This project has no split advance: its advance is one proforma.' using errcode = '23514';", "null;")
    .replace("raise exception 'This advance is already billed on an issued proforma: cancel that one with a reason, then issue the new one.' using errcode = '23505';", "null;")
    .replace("raise exception 'This change request''s advance is already billed on an issued proforma: cancel that one with a reason, then issue the new one.' using errcode = '23505';", "null;");
  if ((broken.match(/null;/g) || []).length - (fn.match(/null;/g) || []).length !== 3) { console.log("negative mode: the advance refusals were not found; nothing proved"); process.exit(3); }
  await db.exec(broken);
}
if (NEG === "events") {
  const fn = (await pg(`select pg_get_functiondef('private.crm_events_stamp()'::regprocedure) as d`))[0].d;
  const broken = fn.replace("raise exception 'A timeline line belongs to the client of its project.' using errcode = '23514';", "null;");
  if (broken === fn) { console.log("negative mode: the timeline refusal was not found; nothing proved"); process.exit(3); }
  await db.exec(broken);
}

/* ── 2. Who reads and writes: the owner only (the design check, word for word) ─ */
console.log("\n2. The design's checks (check-0014-draft.mjs), on the real database\n");
r = await as("owner", `insert into public.crm_clients (id, lead_id, data) values ('cl_abcdef1', 'ol_test_1', '{"legalName":"Example Trust"}') returning code`);
ok(r.rows?.[0]?.code === "IDV-C-0001", "owner adds a client, code IDV-C-0001", r);
r = await as("owner", `insert into public.crm_projects (id, client_id, lead_id, fee, data) values ('pr_abcdef1', 'cl_abcdef1', 'ol_test_1', 18000, '{}') returning code, stage`);
ok(r.rows?.[0]?.code === "IDV-PR-0001" && r.rows[0].stage === "proposal", "owner adds a project at stage proposal", r);
r = await as("member", `select * from public.crm_clients`);
ok(!r.error && r.rows.length === 0, "a member reads no client", r);
r = await as("admin", `select * from public.crm_clients`);
ok(!r.error && r.rows.length === 0, "an admin reads no client either (money is Mehdi's)", r);
r = await as("anon", `select * from public.crm_clients`);
ok(Boolean(r.error), "anon cannot even select clients (no grant)", r);
r = await as("member", `insert into public.crm_clients (id, data) values ('cl_zzzzzz1', '{}')`);
ok(Boolean(r.error), "a member cannot add a client", r);
r = await as("admin", `insert into public.crm_clients (id, data) values ('cl_zzzzzz2', '{}')`);
ok(Boolean(r.error), "an admin cannot add a client", r);
r = await as("member", `update public.crm_projects set fee = 1 where id = 'pr_abcdef1'`);
ok(!r.error && r.affected === 0, "a member updates nothing", r);
r = await as("admin", `update public.crm_projects set fee = 1 where id = 'pr_abcdef1'`);
ok(!r.error && r.affected === 0, "an admin updates nothing", r);

r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
  ('dc_pi00001', 'cl_abcdef1', 'pr_abcdef1', 'proforma', 'ADVANCE_50', 9000, '{"lines":[]}'),
  ('dc_pi00002', 'cl_abcdef1', 'pr_abcdef1', 'proforma', null, 9000, '{"lines":[]}'),
  ('dc_q000001', 'cl_abcdef1', 'pr_abcdef1', 'quotation', null, 18000, '{}'),
  ('dc_wel0001', 'cl_abcdef1', 'pr_abcdef1', 'welcome', null, null, '{}')`);
ok(!r.error, "owner adds drafts", r);
r = await as("owner", `update public.crm_documents set status = 'issued', number = 'IDV/PI/2026-27/099' where id = 'dc_pi00001'`);
ok(Boolean(r.error), "a draft cannot be marked issued by hand", r);
r = await as("member", `select public.crm_issue_document('dc_pi00001')`);
ok(Boolean(r.error), "a member cannot issue", r);
r = await as("admin", `select public.crm_issue_document('dc_pi00001')`);
ok(Boolean(r.error) && r.code === "42501", "an admin cannot issue", r);
r = await as("anon", `select public.crm_issue_document('dc_pi00001')`);
ok(Boolean(r.error), "anon cannot issue (no grant)", r);
r = await as("owner", `select public.crm_issue_document('dc_pi00001') as d`);
const fy = (await db.query(`select private.crm_fy(private.crm_ist_today()) as fy`)).rows[0].fy;
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/001`, `first proforma is IDV/PI/${fy}/001`, r);
ok(r.rows?.[0]?.d?.due_on && r.rows[0].d.valid_until, "due and valid-until stamped by the server", r.rows?.[0]?.d);
const d1 = r.rows?.[0]?.d || {};
ok(Date.parse(d1.due_on) - Date.parse(d1.issued_on) === 7 * 864e5 && Date.parse(d1.valid_until) - Date.parse(d1.issued_on) === 15 * 864e5,
  "a proforma is due 7 days after its issue (SA cl. 5.5) and valid 15 (the template)", d1);
r = await as("owner", `select public.crm_issue_document('dc_q000001') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/Q/${fy}/001`, "quotation series runs on its own", r);
ok(r.rows?.[0]?.d?.due_on === null && Boolean(r.rows?.[0]?.d?.valid_until), "a quotation has a validity and no due date", r.rows?.[0]?.d);
r = await as("owner", `select public.crm_issue_document('dc_pi00002') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/002`, "second proforma is 002, no gap", r);
r = await as("owner", `select public.crm_issue_document('dc_wel0001') as d`);
ok(r.rows?.[0]?.d?.status === "issued" && r.rows[0].d.number === null, "a welcome pack is finalised without a number", r);
r = await as("owner", `select public.crm_issue_document('dc_pi00002')`);
ok(Boolean(r.error), "issuing twice is refused", r);
r = await as("owner", `update public.crm_documents set amount = 1 where id = 'dc_pi00001'`);
ok(Boolean(r.error), "an issued document's amount does not change", r);
r = await as("owner", `update public.crm_documents set status = 'cancelled' where id = 'dc_pi00002'`);
ok(Boolean(r.error), "cancel needs a reason", r);
r = await as("owner", `update public.crm_documents set status = 'cancelled', cancel_reason = 'Wrong billing name' where id = 'dc_pi00002' returning cancelled_at`);
ok(!r.error && r.rows?.[0]?.cancelled_at, "cancel with a reason works and is stamped", r);
r = await as("owner", `update public.crm_documents set cancel_reason = 'Another reason' where id = 'dc_pi00002'`);
ok(Boolean(r.error), "a cancelled document never changes, not even its reason", r);
r = await as("owner", `delete from public.crm_documents where id = 'dc_pi00002'`);
ok(Boolean(r.error), "a cancelled document is never deleted", r);

// gap check: a failed issue (no amount) consumes nothing
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, data) values ('dc_pi00003', 'cl_abcdef1', 'pr_abcdef1', 'proforma', '{}')`);
r = await as("owner", `select public.crm_issue_document('dc_pi00003')`);
ok(Boolean(r.error), "a proforma without an amount is refused", r);
r = await as("owner", `update public.crm_documents set amount = 9000 where id = 'dc_pi00003'`);
r = await as("owner", `select public.crm_issue_document('dc_pi00003') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/003`, "after a refused issue the next number is still 003 (no gap)", r);

// first serial from settings
r = await as("owner", `insert into public.crm_client_settings (id, data) values ('default', jsonb_build_object('firstSerial', jsonb_build_object('RC', jsonb_build_object('${fy}', 5))))`);
ok(!r.error, "owner saves the settings row", r);
r = await as("member", `select count(*)::int n from public.crm_client_settings`);
ok(!r.error && r.rows[0].n === 0, "a member reads no settings (the firm's bank details are Mehdi's)", r);
r = await as("owner", `insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference) values ('py_000001', 'cl_abcdef1', 'pr_abcdef1', 'dc_pi00001', current_date, 9000, 'upi', '123456789012') returning id`);
ok(!r.error, "owner records a payment", r);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, payment_id, related_doc, data) values ('dc_rc00001', 'cl_abcdef1', 'pr_abcdef1', 'receipt', 9000, 'py_000001', 'dc_pi00001', '{}')`);
r = await as("owner", `select public.crm_issue_document('dc_rc00001') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/RC/${fy}/005`, "receipts start at the first serial Mehdi set (005)", r);
r = await as("owner", `delete from public.crm_payments where id = 'py_000001'`);
ok(Boolean(r.error), "a payment is never deleted", r);
r = await as("owner", `update public.crm_payments set status = 'voided', void_reason = 'typo' where id = 'py_000001'`);
ok(Boolean(r.error), "a payment with an issued receipt cannot be voided first", r);
r = await as("owner", `update public.crm_payments set note = 'seen in the statement' where id = 'py_000001'`);
ok(!r.error, "the note on a payment may change", r);

// project delete rules
r = await as("owner", `delete from public.crm_projects where id = 'pr_abcdef1'`);
ok(Boolean(r.error), "a project with issued documents is never deleted", r);
r = await as("owner", `insert into public.crm_projects (id, client_id, data) values ('pr_abcdef2', 'cl_abcdef1', '{}')`);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, data) values ('dc_dr00001', 'cl_abcdef1', 'pr_abcdef2', 'quotation', 12000, '{}')`);
r = await as("owner", `delete from public.crm_projects where id = 'pr_abcdef2'`);
ok(!r.error, "a project with only drafts can be deleted (its drafts go with it)", r);
ok((await pg(`select count(*)::int n from public.crm_documents where id = 'dc_dr00001'`))[0].n === 0, "...and its draft is gone with it");

// events append-only
r = await as("owner", `insert into public.crm_client_events (client_id, project_id, type, channel, detail) values ('cl_abcdef1', 'pr_abcdef1', 'sent', 'whatsapp', 'Welcome') returning id`);
ok(!r.error, "owner adds a timeline line", r);
r = await as("owner", `update public.crm_client_events set detail = 'x'`);
ok(Boolean(r.error), "timeline lines never change (no update grant)", r);
r = await as("owner", `delete from public.crm_client_events`);
ok(Boolean(r.error), "timeline lines are never deleted through the API", r);
r = await as("member", `insert into public.crm_client_events (client_id, type, detail) values ('cl_abcdef1', 'note', 'x')`);
ok(Boolean(r.error), "a member cannot write a timeline line", r);

// ── Review of 4 Oct 2026: the holes found in the first draft, each now closed ──────────────────────
// (1) an issued document with no number (welcome pack) could never be cancelled: "null = null" in the guard
r = await as("owner", `update public.crm_documents set status = 'cancelled', cancel_reason = 'Wrong kickoff date' where id = 'dc_wel0001' returning status`);
ok(!r.error && r.rows?.[0]?.status === "cancelled", "an issued welcome pack (no number) can be cancelled with a reason", r);
// (2) a row inserted already issued, with a number of the browser's choosing
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, status, series, fy, serial, number, amount, data)
  values ('dc_forged01', 'cl_abcdef1', 'pr_abcdef1', 'invoice', 'issued', 'INV', '${fy}', 7, 'IDV/${fy}/007', 5000, '{}')`);
ok(Boolean(r.error), "a document cannot be inserted already issued with a chosen number", r);
// (3) a draft holding a forged serial moved the next number (it gave 051 after 003)
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, series, fy, serial, amount, data)
  values ('dc_draft050', 'cl_abcdef1', 'pr_abcdef1', 'proforma', 'PI', '${fy}', 50, 9000, '{}')`);
ok(Boolean(r.error), "a draft cannot carry a serial, a year or a series", r);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, data) values ('dc_pi00004', 'cl_abcdef1', 'pr_abcdef1', 'proforma', 9000, '{}')`);
r = await as("owner", `update public.crm_documents set serial = 50, fy = '${fy}', series = 'PI' where id = 'dc_pi00004'`);
ok(Boolean(r.error), "...nor be given one later", r);
r = await as("owner", `select public.crm_issue_document('dc_pi00004') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/004`, "the next proforma is 004: consecutive", r);
// (4) a recorded payment could be moved to another client
r = await as("owner", `insert into public.crm_clients (id, data) values ('cl_other01', '{}')`);
r = await as("owner", `insert into public.crm_projects (id, client_id, data) values ('pr_other01', 'cl_other01', '{}')`);
r = await as("owner", `update public.crm_payments set client_id = 'cl_other01', project_id = 'pr_other01' where id = 'py_000001'`);
ok(Boolean(r.error), "a recorded payment never moves to another client or project", r);
// (4b) security review of 4 Oct 2026: nor does its project (moved, its issued documents and payments sat under
// another client's project, and that client's page and messages read them by project)
r = await as("owner", `update public.crm_projects set client_id = 'cl_other01' where id = 'pr_abcdef1'`);
ok(Boolean(r.error) && r.code === "42501", "a project never moves to another client", r);
r = await as("owner", `update public.crm_projects set stage = 'agreement', data = data || '{"name":"Example School website"}' where id = 'pr_abcdef1' returning stage`);
ok(!r.error && r.rows?.[0]?.stage === "agreement", "...while its stage and its data still change as before", r);
// (5) payments only against an issued proforma or invoice of the same client and project
r = await as("owner", `insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference) values ('py_000009', 'cl_abcdef1', 'pr_abcdef1', 'dc_pi00002', current_date, 100, 'upi', 'x')`);
ok(Boolean(r.error), "no payment against a cancelled proforma", r);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, data) values ('dc_pi00005', 'cl_abcdef1', 'pr_abcdef1', 'proforma', 9000, '{}')`);
r = await as("owner", `insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference) values ('py_000010', 'cl_abcdef1', 'pr_abcdef1', 'dc_pi00005', current_date, 100, 'upi', 'x')`);
ok(Boolean(r.error), "no payment against a draft", r);
r = await as("owner", `insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference) values ('py_000011', 'cl_abcdef1', 'pr_abcdef1', 'dc_q000001', current_date, 100, 'upi', 'x')`);
ok(Boolean(r.error), "no payment against a quotation", r);
r = await as("owner", `insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference) values ('py_000012', 'cl_other01', 'pr_other01', 'dc_pi00003', current_date, 100, 'upi', 'x')`);
ok(Boolean(r.error), "no payment from one client against another client's proforma", r);
r = await as("owner", `insert into public.crm_payments (id, client_id, received_on, amount, mode) values ('py_000013', 'cl_abcdef1', current_date, 100, 'upi')`);
ok(Boolean(r.error), "no payment against no document", r);
// (6) a document of another client's project
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, data) values ('dc_cross01', 'cl_abcdef1', 'pr_other01', 'invoice', 5000, '{}')`);
ok(Boolean(r.error), "a document cannot sit under one client and another client's project", r);
// (7) receipts: one per payment, for the amount credited
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, payment_id, related_doc, data) values ('dc_rc00002', 'cl_abcdef1', 'pr_abcdef1', 'receipt', 9000, 'py_000001', 'dc_pi00001', '{}')`);
r = await as("owner", `select public.crm_issue_document('dc_rc00002')`);
ok(Boolean(r.error), "a second issued receipt for the same payment is refused", r);
r = await as("owner", `insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, tds, mode, reference) values ('py_000002', 'cl_abcdef1', 'pr_abcdef1', 'dc_pi00003', current_date, 8820, 180, 'neft', 'UTR0002')`);
ok(!r.error, "a payment with TDS against an issued proforma is recorded", r);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, payment_id, related_doc, data) values ('dc_rc00003', 'cl_abcdef1', 'pr_abcdef1', 'receipt', 9000, 'py_000002', 'dc_pi00003', '{}')`);
r = await as("owner", `select public.crm_issue_document('dc_rc00003')`);
ok(Boolean(r.error), "a receipt for more than was credited (TDS counted in) is refused", r);
r = await as("owner", `update public.crm_documents set amount = 8820 where id = 'dc_rc00003'`);
r = await as("owner", `select public.crm_issue_document('dc_rc00003') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/RC/${fy}/006`, "the receipt for the amount credited is RC 006, after the refused one (no gap)", r);
// (8) a document with money against it is corrected with a credit note, never cancelled
r = await as("owner", `update public.crm_documents set status = 'cancelled', cancel_reason = 'Wrong amount' where id = 'dc_pi00001'`);
ok(Boolean(r.error), "a proforma with a recorded payment cannot be cancelled", r);
// (9) credit notes: against an issued invoice of the same client, both partners' yes, never more than the invoice
r = await as("owner", `update public.crm_client_settings set data = data || jsonb_build_object('firstSerial', (data -> 'firstSerial') || jsonb_build_object('INV', jsonb_build_object('${fy}', 0))) where id = 'default'`);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values ('dc_inv0001', 'cl_abcdef1', 'pr_abcdef1', 'invoice', 'LAUNCH_50', 9000, '{}')`);
r = await as("owner", `select public.crm_issue_document('dc_inv0001') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/${fy}/001` && r.rows[0].d.due_on, "a first serial below 1 counts as 1: the first invoice is 001", r);
ok((r.rows?.[0]?.d?.number || "").length <= 16, "an invoice number fits GST's 16 characters (IDV/2026-27/001 is 15)", r.rows?.[0]?.d?.number);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, related_doc, data) values ('dc_cn00001', 'cl_abcdef1', 'pr_abcdef1', 'credit_note', 1000, 'dc_q000001', '{"reasonCode":"D","partnersApproval":{"at":"2026-10-04","channel":"whatsapp"}}')`);
r = await as("owner", `select public.crm_issue_document('dc_cn00001')`);
ok(Boolean(r.error), "a credit note against a quotation is refused", r);
r = await as("owner", `update public.crm_documents set related_doc = 'dc_inv0001', data = '{"reasonCode":"D"}' where id = 'dc_cn00001'`);
r = await as("owner", `select public.crm_issue_document('dc_cn00001')`);
ok(Boolean(r.error), "a credit note without both partners' written yes is refused", r);
r = await as("owner", `update public.crm_documents set data = '{"reasonCode":"D","partnersApproval":{"at":"2026-10-04","channel":"whatsapp"}}' where id = 'dc_cn00001'`);
r = await as("owner", `select public.crm_issue_document('dc_cn00001') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/CN/${fy}/001`, "with the yes recorded it is IDV/CN/.../001", r);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, related_doc, data) values ('dc_cn00002', 'cl_abcdef1', 'pr_abcdef1', 'credit_note', 8500, 'dc_inv0001', '{"reasonCode":"B","partnersApproval":{"at":"2026-10-04","channel":"email"}}')`);
r = await as("owner", `select public.crm_issue_document('dc_cn00002')`);
ok(Boolean(r.error), "credit notes never come to more than the invoice", r);
r = await as("owner", `update public.crm_documents set status = 'cancelled', cancel_reason = 'x' where id = 'dc_inv0001'`);
ok(Boolean(r.error), "an invoice a credit note points at cannot be cancelled", r);
// Code F: refunding an advance, against its issued proforma.
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, related_doc, data) values ('dc_cn00003', 'cl_abcdef1', 'pr_abcdef1', 'credit_note', 9000, 'dc_pi00004', '{"reasonCode":"B","partnersApproval":{"at":"2026-10-04","channel":"email"}}')`);
r = await as("owner", `select public.crm_issue_document('dc_cn00003')`);
ok(Boolean(r.error), "a credit note against a proforma is refused unless it refunds the advance (code F)", r);
r = await as("owner", `update public.crm_documents set data = '{"reasonCode":"F","partnersApproval":{"at":"2026-10-04","channel":"email"}}' where id = 'dc_cn00003'`);
r = await as("owner", `select public.crm_issue_document('dc_cn00003') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/CN/${fy}/002`, "code F, against the advance proforma, is IDV/CN/.../002", r);
// (10) the timeline's time is the server's
r = await as("owner", `insert into public.crm_client_events (client_id, project_id, type, at) values ('cl_abcdef1', 'pr_abcdef1', 'approval', '2020-01-01') returning at`);
ok(!r.error && new Date(r.rows?.[0]?.at).getFullYear() > 2020, "a timeline line cannot be back-dated (the server stamps its time)", r);
// (11) one client per lead
r = await as("owner", `insert into public.crm_clients (id, lead_id, data) values ('cl_dupe001', 'ol_test_1', '{}')`);
ok(Boolean(r.error), "a lead has at most one client (a second project reuses it)", r);
// (12) deleting a drafts-only project keeps its timeline lines on the client
r = await as("owner", `insert into public.crm_projects (id, client_id, data) values ('pr_abcdef3', 'cl_abcdef1', '{}')`);
r = await as("owner", `insert into public.crm_client_events (client_id, project_id, type, detail) values ('cl_abcdef1', 'pr_abcdef3', 'sent', 'Proposal sent')`);
r = await as("owner", `delete from public.crm_projects where id = 'pr_abcdef3'`);
const kept = (await db.query(`select count(*)::int n from public.crm_client_events where detail = 'Proposal sent' and project_id is null`)).rows[0].n;
ok(!r.error && kept === 1, "a deleted drafts-only project leaves its timeline lines on the client", { r, kept });
// (13) members still read and do nothing
r = await as("member", `select count(*)::int n from public.crm_payments`);
ok(!r.error && r.rows[0].n === 0, "a member reads no payment", r);
r = await as("member", `insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference) values ('py_member01', 'cl_abcdef1', 'pr_abcdef1', 'dc_inv0001', current_date, 100, 'upi', 'x')`);
ok(Boolean(r.error), "a member cannot record a payment", r);
r = await as("admin", `select (select count(*) from public.crm_documents) + (select count(*) from public.crm_payments)
  + (select count(*) from public.crm_projects) + (select count(*) from public.crm_client_events) + (select count(*) from public.crm_doc_counters) as n`);
ok(!r.error && Number(r.rows[0].n) === 0, "an admin reads no document, payment, project, timeline line or counter", r);
r = await as("member", `delete from public.crm_documents where status = 'draft'`);
ok(!r.error && r.affected === 0, "a member deletes no draft", r);
r = await as("owner", `update public.crm_doc_counters set last_serial = 0`);
ok(Boolean(r.error), "nobody moves a counter through the API, not even Mehdi (only the issue function writes it)", r);
// (14) Gate review of 4 Oct 2026: the advance is billed once. A paid advance could be billed again under a new
// number (a "part 2" with no split, or a second proforma for the advance), and the register then showed it as owed.
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
  ('dc_adv0001', 'cl_abcdef1', 'pr_abcdef1', 'proforma', 'ADVANCE_50', 9000, '{}'),
  ('dc_adv0002', 'cl_abcdef1', 'pr_abcdef1', 'proforma', 'ADVANCE_50', 4500, '{"part":2}')`);
ok(!r.error, "owner drafts a second advance proforma and a part 2 on a project with no split advance", r);
r = await as("owner", `select public.crm_issue_document('dc_adv0001')`);
ok(Boolean(r.error) && r.code === "23505", "a second proforma for the same advance is refused (the advance is billed once)", r);
r = await as("owner", `select public.crm_issue_document('dc_adv0002')`);
ok(Boolean(r.error) && r.code === "23514", "a part 2 proforma on a project with no split advance is refused", r);
r = await as("owner", `insert into public.crm_projects (id, client_id, fee, data) values ('pr_split01', 'cl_abcdef1', 18000,
  '{"splitAdvance":{"partnerApprovedAt":"2026-10-04","channel":"whatsapp","part1":0,"part2":0,"part2DueOn":"2026-10-20"}}')`);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
  ('dc_adv0003', 'cl_abcdef1', 'pr_split01', 'proforma', 'ADVANCE_50', 4500, '{"part":1}'),
  ('dc_adv0004', 'cl_abcdef1', 'pr_split01', 'proforma', 'ADVANCE_50', 4500, '{"part":2}'),
  ('dc_adv0005', 'cl_abcdef1', 'pr_split01', 'proforma', 'ADVANCE_50', 4500, '{"part":2}'),
  ('dc_adv0006', 'cl_abcdef1', 'pr_split01', 'proforma', 'ADVANCE_50', 9000, '{}')`);
r = await as("owner", `select public.crm_issue_document('dc_adv0003') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/005`, "with a split advance part 1 is issued, IDV/PI/.../005: the two refused issues spent no number", r);
r = await as("owner", `select public.crm_issue_document('dc_adv0004') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/006`, "...and part 2 is 006", r);
r = await as("owner", `select public.crm_issue_document('dc_adv0005')`);
ok(Boolean(r.error) && r.code === "23505", "a second part 2 is refused", r);
r = await as("owner", `select public.crm_issue_document('dc_adv0006')`);
ok(Boolean(r.error) && r.code === "23505", "a proforma for the whole advance after part 1 is refused (it bills part 1 again)", r);
r = await as("owner", `update public.crm_documents set status = 'cancelled', cancel_reason = 'Part 2 on the wrong date' where id = 'dc_adv0004'`);
ok(!r.error, "part 2 cancelled with a reason (nothing was paid against it)", r);
r = await as("owner", `select public.crm_issue_document('dc_adv0005') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/007`, "...then a new part 2 is issued (007)", r);
// (14b) A change request's advance is billed once too (one issued proforma per change request), and a proforma
// refunded in full by credit notes (code F) no longer counts, so that advance can be billed again.
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
  ('dc_cra0001', 'cl_abcdef1', 'pr_split01', 'proforma', 'CHANGE_REQUEST', 2000, '{"crNo":"CR-01"}'),
  ('dc_cra0002', 'cl_abcdef1', 'pr_split01', 'proforma', 'CHANGE_REQUEST', 2000, '{"crNo":"CR-01"}'),
  ('dc_cra0003', 'cl_abcdef1', 'pr_split01', 'proforma', 'CHANGE_REQUEST', 1000, '{"crNo":"CR-02"}')`);
r = await as("owner", `select public.crm_issue_document('dc_cra0001') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/008`, "a change request's advance proforma is issued (008)", r);
r = await as("owner", `select public.crm_issue_document('dc_cra0002')`);
ok(Boolean(r.error) && r.code === "23505", "a second proforma for the same change request's advance is refused", r);
r = await as("owner", `select public.crm_issue_document('dc_cra0003') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/009`, "...while another change request's advance is issued (009): the refusal spent no number", r);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, amount, related_doc, data) values
  ('dc_cnf0001', 'cl_abcdef1', 'pr_split01', 'credit_note', 4500, 'dc_adv0003', '{"reasonCode":"F","partnersApproval":{"at":"2026-10-04","channel":"email"}}')`);
r = await as("owner", `insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
  ('dc_adv0007', 'cl_abcdef1', 'pr_split01', 'proforma', 'ADVANCE_50', 4500, '{"part":1}')`);
r = await as("owner", `select public.crm_issue_document('dc_adv0007')`);
ok(Boolean(r.error) && r.code === "23505", "part 1 cannot be billed again while its proforma stands", r);
r = await as("owner", `select public.crm_issue_document('dc_cnf0001') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/CN/${fy}/003`, "part 1 refunded in full with a code F credit note (IDV/CN/.../003)", r);
r = await as("owner", `select public.crm_issue_document('dc_adv0007') as d`);
ok(r.rows?.[0]?.d?.number === `IDV/PI/${fy}/010`, "...then part 1 may be billed again (010): a proforma refunded in full no longer counts", r);
// (15) A timeline line belongs to the client of its project (security review of 4 Oct 2026: it was accepted).
r = await as("owner", `insert into public.crm_client_events (client_id, project_id, type, detail) values ('cl_other01', 'pr_abcdef1', 'note', 'Filed under the wrong client')`);
ok(Boolean(r.error) && r.code === "23514", "a timeline line cannot sit under one client and another client's project", r);
r = await as("owner", `insert into public.crm_client_events (client_id, project_id, type, detail) values ('cl_other01', 'pr_other01', 'note', 'Its own project') returning id`);
ok(!r.error && r.rows?.length === 1, "...while a line under the client of its own project goes in", r);
r = await as("owner", `insert into public.crm_client_events (client_id, project_id, type, detail) values ('cl_other01', null, 'note', 'A client-level line') returning id`);
ok(!r.error && r.rows?.length === 1, "...and so does a client-level line (no project)", r);

// lead deletion keeps the client file
await db.exec(`delete from public.outreach_leads where id = 'ol_test_1'`);
const c = (await db.query(`select lead_id from public.crm_clients where id = 'cl_abcdef1'`)).rows[0];
ok(c && c.lead_id === null, "deleting the lead keeps the client, link cleared", c);
const pl = (await db.query(`select lead_id from public.crm_projects where id = 'pr_abcdef1'`)).rows[0];
ok(pl && pl.lead_id === null, "...and the project's link too", pl);

// fy boundary, and the India date of an instant
const b = (await db.query(`select private.crm_fy(date '2027-03-31') a, private.crm_fy(date '2027-04-01') b`)).rows[0];
ok(b.a === "2026-27" && b.b === "2027-28", "financial year turns on 1 April", b);
const ist = (await db.query(`select private.crm_fy((timestamptz '2027-03-31 18:29:00+00' at time zone 'Asia/Kolkata')::date) a,
  private.crm_fy((timestamptz '2027-03-31 18:31:00+00' at time zone 'Asia/Kolkata')::date) b`)).rows[0];
ok(ist.a === "2026-27" && ist.b === "2027-28", "the India date decides: 18:31 UTC on 31 March is already 1 April in India (2027-28)", ist);
ok((await db.query(`select private.crm_fy(date '2099-12-31') a, private.crm_fy(date '2100-01-15') b`)).rows[0].b === "2099-00",
  "the year after 2099 still prints two digits (2099-00)");

/* ── 3. Grants and functions ────────────────────────────────────────────── */
console.log("\n3. Grants and functions\n");
const TABLES = ["crm_client_settings", "crm_clients", "crm_projects", "crm_documents", "crm_payments", "crm_client_events", "crm_doc_counters"];
const EXPECT = {
  crm_client_settings: ["INSERT", "SELECT", "UPDATE"],
  crm_clients: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  crm_projects: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  crm_documents: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  crm_payments: ["INSERT", "SELECT", "UPDATE"],
  crm_client_events: ["INSERT", "SELECT"],
  crm_doc_counters: ["SELECT"],
};
for (const t of TABLES) {
  const g = await pg(`select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = $1
                       and grantee in ('anon', 'authenticated', 'PUBLIC') order by privilege_type`, [t]);
  const authed = g.filter((x) => x.grantee === "authenticated").map((x) => x.privilege_type).sort();
  ok(!g.some((x) => x.grantee !== "authenticated") && JSON.stringify(authed) === JSON.stringify(EXPECT[t]),
    `${t}: logins get exactly ${EXPECT[t].join(", ")}; anon and PUBLIC nothing`, g);
  const rls = (await pg(`select c.relrowsecurity r from pg_class c where c.oid = $1::regclass`, [`public.${t}`]))[0].r;
  const pols = await pg(`select policyname, qual, with_check, roles from pg_policies where schemaname = 'public' and tablename = $1`, [t]);
  ok(rls && pols.length === 1 && NEG !== "x" && /is_admin\(\)/.test(pols[0].qual) && /is_admin\(\)/.test(pols[0].with_check),
    `${t}: row security on, one policy, the owner's (is_admin) for reads and writes`, pols);
}
const FUNCS = ["public.crm_issue_document(text)", "private.crm_fy(date)", "private.crm_ist_today()", "private.crm_touch()",
  "private.crm_documents_guard()", "private.crm_payments_guard()", "private.crm_projects_guard()", "private.crm_events_stamp()"];
for (const f of FUNCS) {
  const x = (await pg(`select has_function_privilege('public', $1, 'execute') pub, has_function_privilege('anon', $1, 'execute') an,
                        has_function_privilege('authenticated', $1, 'execute') au`, [f]))[0];
  const want = f.startsWith("public.") ? !x.pub && !x.an && x.au : !x.pub && !x.an && !x.au;
  ok(want, `${f}: revoked from PUBLIC${f.startsWith("public.") ? "; logins only" : ""}`, x);
}
const sec = (await pg(`select p.prosecdef d, array_to_string(p.proconfig, ',') cfg from pg_proc p where p.oid = 'public.crm_issue_document(text)'::regprocedure`))[0];
ok(sec.d && /search_path=""/.test(sec.cfg), "crm_issue_document is SECURITY DEFINER with an empty search_path", sec);
const seqs = await pg(`select has_sequence_privilege('anon', 'public.crm_client_code_seq', 'usage') a, has_sequence_privilege('authenticated', 'public.crm_client_code_seq', 'usage') b`);
ok(!seqs[0].a && seqs[0].b, "the code sequences: logins only", seqs[0]);

/* ── 4. supabase/tests/clients_rls.sql, on this database ────────────────── */
console.log("\n4. The SQL-editor test (supabase/tests/clients_rls.sql)\n");
{
  const state = async () => (await pg(`select
    (select count(*) from public.crm_clients) a, (select count(*) from public.crm_projects) b, (select count(*) from public.crm_documents) c,
    (select count(*) from public.crm_payments) d, (select count(*) from public.crm_client_events) e,
    (select coalesce(string_agg(series || fy || last_serial, ',' order by series), '') from public.crm_doc_counters) f,
    (select last_value from public.crm_client_code_seq) g, (select last_value from public.crm_project_code_seq) h,
    (select count(*) from auth.users) i`))[0];
  const s0 = await state();
  let res = null, err = null;
  try { res = await db.exec(EDITOR_TEST); } catch (e) {
    err = e.message;
    // A refused check leaves the paste test's own transaction aborted: end it, so the next step can still look.
    try { await db.exec("rollback"); } catch { /* not in a transaction */ }
  }
  const last = res && res.filter((x) => x.rows && x.rows.length).pop();
  ok(!err && last?.rows?.[0]?.result === "ALL CLIENT FILE CHECKS PASSED", "clients_rls.sql passes on the database (ALL CLIENT FILE CHECKS PASSED)", err || last?.rows);
  const s1 = await state();
  ok(JSON.stringify(s0) === JSON.stringify(s1), "...and changes nothing: no row, no counter, no sequence value, no login is left behind", { s0, s1 });
}

/* ── 5. A new project: the whole SETUP_ALL.sql in one paste ─────────────── */
console.log("\n5. A new project: all of SETUP_ALL.sql in one paste\n");
{
  const fresh = new PGlite({ extensions: { pgcrypto } });
  await fresh.exec(STUB);
  let err = null;
  try { await fresh.exec(SETUP_FULL); } catch (e) { err = e.message; }
  ok(!err, "the whole SETUP_ALL.sql (0001 to 0014) runs on a new project", err);
  const u = (await fresh.query(`insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id`, [OWNER_EMAIL])).rows[0].id;
  await fresh.exec("begin");
  await fresh.exec("set local role authenticated");
  await fresh.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: u, email: OWNER_EMAIL, role: "authenticated" })]);
  let num = null;
  try {
    await fresh.query(`insert into public.crm_clients (id, data) values ('cl_fresh01', '{}')`);
    await fresh.query(`insert into public.crm_projects (id, client_id, fee, data) values ('pr_fresh01', 'cl_fresh01', 12500, '{}')`);
    await fresh.query(`insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values ('dc_fresh01', 'cl_fresh01', 'pr_fresh01', 'proforma', 'ADVANCE_50', 6250, '{}')`);
    await fresh.query(`insert into public.crm_client_events (client_id, project_id, type, detail) values ('cl_fresh01', 'pr_fresh01', 'note', 'File opened')`);
    num = (await fresh.query(`select public.crm_issue_document('dc_fresh01') ->> 'number' as n`)).rows[0].n;
    await fresh.exec("commit");
  } catch (e) {
    await fresh.exec("rollback");
    num = e.message;
  }
  const ffy = (await fresh.query(`select private.crm_fy(private.crm_ist_today()) as fy`)).rows[0].fy;
  ok(num === `IDV/PI/${ffy}/001`, `...and Mehdi issues the first proforma there: IDV/PI/${ffy}/001`, num);
  // Here Supabase still grants every new sequence to anon and every login (until 30 Oct 2026): the timeline's
  // id sequence must not keep that grant, and Mehdi's line above went in without it.
  const fseq = (await fresh.query(`select has_sequence_privilege('anon', 'public.crm_client_events_id_seq', 'usage') a,
    has_sequence_privilege('authenticated', 'public.crm_client_events_id_seq', 'usage') b,
    has_sequence_privilege('anon', 'public.crm_client_events_id_seq', 'update') c`)).rows[0];
  ok(!fseq.a && !fseq.b && !fseq.c, "...and the timeline's id sequence is held by no visitor and no login, even where Supabase grants new sequences to all", fseq);
  await fresh.close();
}

finish();
