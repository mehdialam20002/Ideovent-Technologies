/**
 * The CRM team's database rules, tested on a real PostgreSQL (PGlite: Postgres
 * in WebAssembly, inside Node; no Docker, no password, not blocked by Windows
 * Application Control the way psql.exe and initdb.exe are on this machine).
 *
 *   node scripts/test-crm-rls.mjs                  every check must pass (exit 0)
 *   CRM_RLS_NEGATIVE=select node scripts/test-crm-rls.mjs   leads SELECT policy opened to everyone: checks must FAIL (exit 1)
 *   CRM_RLS_NEGATIVE=guard  node scripts/test-crm-rls.mjs   the field guard trigger dropped: checks must FAIL
 *   CRM_RLS_NEGATIVE=events node scripts/test-crm-rls.mjs   the history guard trigger dropped: checks must FAIL
 *   CRM_GRANTS=legacy node scripts/test-crm-rls.mjs         new tables auto-granted, as before 30 Oct 2026
 *                                                          (the default run simulates the stricter grants after it)
 *
 * Needs:  npm i -D @electric-sql/pglite   (or PGLITE_FROM=<folder with node_modules/@electric-sql/pglite>)
 * Files:  supabase/SETUP_ALL.sql (read only), supabase/migrations/0011_crm_team.sql and
 *         supabase/tests/crm_team_rls.sql, found from the repository root; CRM_SETUP_ALL,
 *         CRM_MIGRATION and CRM_EDITOR_TEST override them.
 *
 * HOW: a Supabase-shaped stub (the API roles, auth.uid()/auth.jwt() written as Supabase writes them,
 * auth.users, storage), then the project's REAL SETUP_ALL.sql up to its 0011 section (0001-0010),
 * then Mehdi's data as the app writes it TODAY, then 0011 twice (it must be re-runnable), then every
 * person acts the way PostgREST makes them act: SET LOCAL ROLE authenticated plus
 * request.jwt.claims, in a transaction.
 *
 * What this proves is the DATABASE. The e2e suites run in local mode and cannot prove any of it.
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const first = (...paths) => paths.find((p) => p && existsSync(p));
const ROOT = resolve(HERE, "..");
const SETUP_ALL = first(process.env.CRM_SETUP_ALL, join(ROOT, "supabase/SETUP_ALL.sql"));
const MIGRATION = first(process.env.CRM_MIGRATION, join(ROOT, "supabase/migrations/0011_crm_team.sql"));
if (!SETUP_ALL || !MIGRATION) throw new Error(`missing SQL: SETUP_ALL=${SETUP_ALL} MIGRATION=${MIGRATION}`);
/* What a Meta lead looks like (META_SOURCES): a member's new lead must never pass for one (section 8). */
const { META_SOURCES } = await import(pathToFileURL(join(ROOT, "src/lib/meta/fields.js")).href);

/** PGlite and its pgcrypto (Supabase has pgcrypto in schema `extensions`; crm_reset_password uses it). */
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

const NEG = process.env.CRM_RLS_NEGATIVE || "";
const { PGlite, pgcrypto } = await loadPGlite();
const db = new PGlite({ extensions: { pgcrypto } });
const fails = [];
let passes = 0;
const check = (cond, msg, got) => {
  if (cond) { passes++; console.log("ok    " + msg); }
  else { fails.push(msg); console.log("FAIL  " + msg + (got !== undefined ? "\n        got: " + JSON.stringify(got).slice(0, 400) : "")); }
};

/* ── A Supabase-shaped Postgres ─────────────────────────────────────────── */
const STUB = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;
grant usage on schema public to anon, authenticated, service_role;
-- What an existing Supabase project still does for every new object in public (until 30 Oct 2026).
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
await db.exec(STUB);
// The database as it is BEFORE 0011: when SETUP_ALL.sql already carries 0011 (it will, once it is
// appended), its 0011 section is cut here and applied later, after today's data is written.
const SETUP_FULL = readFileSync(SETUP_ALL, "utf8").replace(/\r\n/g, "\n");
const CUT = SETUP_FULL.search(/^-- ┌[─ ]*0011_crm_team\.sql/m);
await db.exec(CUT >= 0 ? SETUP_FULL.slice(0, CUT) : SETUP_FULL);

/* ── People (logins) ────────────────────────────────────────────────────── */
const OWNER_EMAIL = "mehdialam2002@gmail.com"; // seeded into public.admins by 0005
const P = {};
for (const [k, email, confirmed] of [
  ["owner", OWNER_EMAIL, true], ["asha", "asha@example.org", true], ["bilal", "bilal@example.org", true],
  ["chetan", "chetan@example.org", true], ["dev", "dev@example.org", true], ["ayesha", "ayesha@example.org", true],
  ["erin", "erin@example.org", true], ["gita", "gita@example.org", false],
]) {
  const r = await db.query(`insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id`, [email, confirmed ? new Date().toISOString() : null]);
  P[k] = { uid: r.rows[0].id, email };
}

/** One statement as a user, the way PostgREST runs it. Rolled back unless commit. */
async function as(who, sql, params = [], { commit = false, headers } = {}) {
  await db.exec("begin");
  try {
    if (who === "anon") {
      await db.exec("set local role anon");
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "anon" })]);
    } else if (who === "auth_admin") {
      await db.exec("set local role supabase_auth_admin");
    } else if (who && who !== "postgres") {
      const p = P[who];
      await db.exec("set local role authenticated");
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: p.uid, email: p.email, role: "authenticated", aud: "authenticated" }),
      ]);
      if (headers) await db.query(`select set_config('request.headers', $1, true)`, [JSON.stringify(headers)]);
    }
    const r = await db.query(sql, params);
    await db.exec(commit ? "commit" : "rollback");
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length };
  } catch (e) {
    await db.exec("rollback");
    return { error: e.message, code: e.code };
  }
}
const ok = (r) => !r.error;
const one = async (who, sql, params) => {
  const r = await as(who, sql, params);
  return r.error ? `ERR ${r.code}: ${r.error}` : r.rows[0] ? Object.values(r.rows[0])[0] : undefined;
};
const num = async (who, sql, params) => {
  const v = await one(who, sql, params);
  return typeof v === "string" && v.startsWith("ERR") ? v : Number(v);
};

/* ── 0. Mehdi's data as the app writes it TODAY (before 0011) ───────────── */
const lead = (id, name, extra = {}) => JSON.stringify({ id, instituteName: name, kind: "school", status: "new", createdAt: "2026-09-20T05:00:00.000Z", updatedAt: "2026-09-20T05:00:00.000Z", ...extra });
const UPSERT = `insert into public.outreach_leads (id, data, updated_at) values ($1, $2::jsonb, now())
                on conflict (id) do update set id = excluded.id, data = excluded.data, updated_at = excluded.updated_at`;
for (const [id, name, extra] of [
  ["P1", "Prior Public School", { phone: "+919800000001", assignedTo: "Aman", status: "contacted", lastContactedAt: "2026-09-25T06:00:00.000Z" }],
  ["P2", "Prior Classes", { kind: "coaching", phone: "+919800000002" }],
]) {
  const r = await as("owner", UPSERT, [id, lead(id, name, extra)], { commit: true });
  if (r.error) throw new Error("pre-0011 seed failed: " + r.error);
}
await as("owner", `insert into public.outreach_events (id, lead_id, data, created_at) values
  ('PE1', 'P1', '{"id":"PE1","leadId":"P1","type":"sent","channel":"whatsapp","templateId":"wa_first_new_school_en","at":"2026-09-25T06:00:00.000Z"}', '2026-09-25T06:00:00Z')`, [], { commit: true });

/* ── 1. The migration, twice ────────────────────────────────────────────── */
// From 30 Oct 2026 Supabase grants NEW tables and sequences to nobody (changelog 45329): 0011 must
// grant what it needs itself. That is the default here; CRM_GRANTS=legacy keeps the old auto-grants.
if (process.env.CRM_GRANTS !== "legacy") {
  await db.exec(`alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
                 alter default privileges in schema public revoke all on sequences from anon, authenticated, service_role;`);
}
const MIG = readFileSync(MIGRATION, "utf8");
let migErr = null;
try { await db.exec(MIG); await db.exec(MIG); } catch (e) { migErr = e.message; }
check(!migErr, "0011 applies on top of the real SETUP_ALL.sql, and applies again (re-runnable)", migErr);
// The one-paste setup must carry 0011 too, under its "-- ┌── 0011_crm_team.sql ──┐" header.
check(CUT >= 0 && SETUP_FULL.includes(MIG.replace(/\r\n/g, "\n").trim()), "SETUP_ALL.sql carries 0011 exactly as the migration file",
  CUT >= 0 ? "a different 0011 text" : "no 0011 section");
if (migErr) { console.log(`\n${passes} passed, ${fails.length} failed`); process.exit(1); }

if (NEG === "select") await db.exec(`drop policy "crm leads select" on public.outreach_leads;
  create policy "crm leads select" on public.outreach_leads for select to authenticated using (true);`);
if (NEG === "guard") await db.exec(`drop trigger crm_leads_guard on public.outreach_leads;`);
if (NEG === "events") await db.exec(`drop trigger crm_events_guard on public.outreach_events;`);

const pg = async (sql, params) => (await db.query(sql, params)).rows;
const ownerRow = (await pg(`select id, user_id, role, active, must_change_password from public.crm_members where email = $1`, [OWNER_EMAIL]))[0];
check(ownerRow && ownerRow.role === "owner" && ownerRow.user_id === P.owner.uid && ownerRow.must_change_password === false,
  "Mehdi has an owner row, linked to his login, with no forced password change", ownerRow);
const OWNER = ownerRow?.id;
const prior = await pg(`select id, assigned_to, created_by, closed_at, data->>'assignedTo' as label from public.outreach_leads where id in ('P1','P2') order by id`);
check(prior.every((l) => l.created_by === OWNER), "today's leads: all added by Mehdi", prior);
check(prior[0].assigned_to === OWNER && prior[1].assigned_to === null,
  "the lead he has written to (P1, contacted) is now HIS; the untouched one (P2, New) stays Unassigned, the pool he shares out", prior);
check(prior[0].label === "Aman", "the old free-text label is kept as it was", prior[0]);
check((await pg(`select count(*)::int as n from public.outreach_events where lead_id = 'P1' and data->>'type' = 'assign'`))[0].n === 0,
  "the migration writes no 'Assigned to Mehdi' line on each lead's history (quiet; the audit keeps it)");
check((await pg(`select count(*)::int as n from public.crm_audit where action = 'lead.assign' and lead_id = 'P1'`))[0].n === 1,
  "...and the audit trail records the move");
const pe1 = (await pg(`select actor_id, created_at from public.outreach_events where id = 'PE1'`))[0];
check(pe1.actor_id === OWNER && new Date(pe1.created_at).toISOString() === "2026-09-25T06:00:00.000Z", "today's history: written by Mehdi, times untouched", pe1);

/* ── 2. Mehdi's app as deployed today still works after 0011 ────────────── */
let r = await as("owner", UPSERT, ["P2", lead("P2", "Prior Classes", { kind: "coaching", phone: "+919800000002", notes: "old app save" })], { commit: true });
check(ok(r), "old app: Mehdi's whole-lead upsert still saves", r);
r = await as("owner", `insert into public.outreach_events (id, lead_id, data, created_at) values ('PE2', 'P2', '{"id":"PE2","leadId":"P2","type":"note","detail":"hi","at":"2020-01-01T00:00:00.000Z"}', '2020-01-01T00:00:00Z') returning actor_id, created_at, data->>'at' as at`, [], { commit: true });
check(ok(r) && r.rows[0].actor_id === OWNER && new Date(r.rows[0].created_at).getFullYear() === new Date().getFullYear() && !r.rows[0].at.startsWith("2020"),
  "old app: Mehdi's event saves; writer and time are stamped by the server (a browser cannot backdate)", r);
r = await as("owner", `insert into public.outreach_settings (id, data) values ('default', '{"signature":"Mehdi"}') on conflict (id) do update set data = excluded.data returning id`, [], { commit: true });
check(ok(r), "old app: Mehdi saves settings", r);
await as("owner", UPSERT, ["PX", lead("PX", "Delete Me")], { commit: true });
await as("owner", `insert into public.outreach_events (id, lead_id, data) values ('PXE', 'PX', '{"type":"note"}')`, [], { commit: true });
r = await as("owner", `delete from public.outreach_events where lead_id = 'PX'`, [], { commit: true });
const r2 = await as("owner", `delete from public.outreach_leads where id = 'PX' returning id`, [], { commit: true });
check(ok(r) && ok(r2) && r2.n === 1, "old app: Mehdi deletes a lead and its history", [r, r2]);
check((await pg(`select assigned_to from public.outreach_leads where id = 'P2'`))[0].assigned_to === null,
  "a note by Mehdi does not take an Unassigned lead out of the pool");
r = await as("owner", `insert into public.outreach_events (id, lead_id, data) values ('PE3', 'P2', '{"type":"sent","channel":"whatsapp","templateId":"wa_first_new_school_en"}')`, [], { commit: true });
const p2 = (await pg(`select assigned_to, assigned_by from public.outreach_leads where id = 'P2'`))[0];
check(ok(r) && p2.assigned_to === OWNER && p2.assigned_by === OWNER,
  "Mehdi's first SEND on an Unassigned lead makes it his (no share-out can hand it to an intern)", [r, p2]);
check((await pg(`select count(*)::int as n from public.outreach_events where lead_id = 'P2' and data->>'type' = 'assign'`))[0].n === 0,
  "...quietly: his own 'sent' line already says what happened");

/* ── 3. The team, through the owner's own functions ─────────────────────── */
const save = (args) => as("owner", `select public.crm_save_member(p_email => $1, p_display_name => $2, p_role => $3, p_view_all => $4, p_can_add_leads => $5, p_new_lead_cap => $6) as id`, args, { commit: true });
const M = { owner: OWNER };
for (const [k, role, viewAll, canAdd, cap] of [
  ["asha", "member", false, false, 5], ["bilal", "member", true, false, 60], ["chetan", "member", false, false, 60],
  ["ayesha", "admin", false, false, 60], ["erin", "member", false, false, 60],
]) {
  r = await save([P[k].email, k[0].toUpperCase() + k.slice(1), role, viewAll, canAdd, cap]);
  check(ok(r), `owner adds ${k} (${role}${viewAll ? ", see all" : ""})`, r);
  M[k] = r.rows?.[0]?.id;
}
r = await save(["farah@example.org", "Farah", "member", false, false, 60]);
M.farah = r.rows?.[0]?.id;
r = await save(["gita@example.org", "Gita", "member", false, false, 60]);
M.gita = r.rows?.[0]?.id;
r = await as("asha", `select public.crm_save_member(p_email => 'x@example.org', p_display_name => 'X') as id`);
check(!ok(r), "a member cannot add people", r);
r = await as("ayesha", `select public.crm_save_member(p_email => 'x@example.org', p_display_name => 'X') as id`);
check(!ok(r), "an admin cannot add people either (the Team page is Mehdi's)", r);
r = await save([OWNER_EMAIL, "Twin", "member", false, false, 60]);
check(!ok(r), "the owner's e-mail cannot be added as a member", r);
r = await as("owner", `select public.crm_save_member(p_email => 'asha@example.org', p_display_name => 'Asha 2') as id`);
check(!ok(r) && r.code === "23505", "the same e-mail cannot be added twice", r);
r = await as("owner", `select public.crm_save_member(p_email => 'z@example.org', p_display_name => 'Z', p_role => 'owner') as id`);
check(!ok(r), "nobody is made owner through the Team page (public.admins decides)", r);

/* First sign-in links the login (confirmed e-mail only). */
let me = await one("asha", `select public.crm_me() as me`);
check(me && me.memberId === M.asha && me.role === "member" && me.mustChangePassword === true, "asha's first crm_me: linked, member, must set her own password", me);
r = await as("asha", `select public.crm_password_changed()`, [], { commit: true });
me = await one("asha", `select public.crm_me() as me`);
check(me.mustChangePassword === false, "after setting her password the flag clears", me);
for (const k of ["bilal", "chetan", "ayesha", "erin"]) await as(k, `select public.crm_me()`, [], { commit: true });
me = await one("gita", `select public.crm_me() as me`);
check(me.role === null, "an UNCONFIRMED login is never linked to an invitation", me);
me = await one("dev", `select public.crm_me() as me`);
check(me.role === null && me.reason === "not_a_member", "a login nobody invited gets no role", me);
me = await one("owner", `select public.crm_me() as me`);
check(me.role === "owner" && me.memberId === OWNER && me.viewAll === true, "crm_me for Mehdi: owner", me);
me = await one("ayesha", `select public.crm_me() as me`);
check(me.role === "admin" && me.viewAll === true && me.canAddLeads === true, "crm_me for an admin", me);
me = await one("asha", `select public.crm_me() as me`);
check(me.newLeadCap === 5 && me.mayColdCall === false && me.senderChecked === false && !("openLeadCap" in me),
  "crm_me for a member: her New-lead cap, cold calls off, company number not checked yet", me);

/* The company number: WhatsApp sends wait until Mehdi has seen a test message from it. */
r = await as("owner", `select public.crm_save_member(p_member_id => $1, p_sender_phone => '+919811100001') as id`, [M.asha], { commit: true });
me = await one("asha", `select public.crm_me() as me`);
check(ok(r) && me.senderPhone === "+919811100001" && me.senderChecked === false, "a company number alone is not 'checked'", me);
await as("owner", `select public.crm_save_member(p_member_id => $1, p_sender_checked => true)`, [M.asha], { commit: true });
me = await one("asha", `select public.crm_me() as me`);
check(me.senderChecked === true, "Mehdi ticks 'number checked' after her test message arrives", me);
await as("owner", `select public.crm_save_member(p_member_id => $1, p_sender_phone => '+919811100002')`, [M.asha], { commit: true });
me = await one("asha", `select public.crm_me() as me`);
check(me.senderChecked === false, "a NEW company number clears the tick: it has to be checked again", me);
await as("owner", `select public.crm_save_member(p_member_id => $1, p_sender_phone => '+919811100001', p_sender_checked => true)`, [M.asha], { commit: true });
await as("owner", `select public.crm_save_member(p_member_id => $1, p_sender_phone => '+917761921786')`, [OWNER], { commit: true });
me = await one("asha", `select public.crm_me() as me`);
check(me.hostWhatsapp === "+917761921786", "crm_me gives a member Mehdi's own number for 'Tell Mehdi on WhatsApp'", me);

/* ── 4. Data, as the owner through the API ──────────────────────────────── */
const INS = `insert into public.outreach_leads (id, data) values ($1, $2::jsonb)`;
const L = {
  L1: lead("L1", "Asha School One", { phone: "+919810000001", email: "l1@school.example", city: "Kankarbagh, Patna", demoId: "d1", status: "contacted", lastContactedAt: "2026-09-28T06:00:00.000Z" }),
  L2: lead("L2", "Bilal Classes Two", { kind: "coaching", phone: "+919810000002", city: "Gaya", demoId: "d2", status: "contacted" }),
  L3: lead("L3", "Unassigned Three", { phone: "+919810000003", city: "Patna" }),
  L4: lead("L4", "Asha Do Not Contact", { phone: "+919810000004", status: "do_not_contact" }),
  L6: lead("L6", "Asha Empty Email", { phone: "+919810000006" }),
};
for (const [id, data] of Object.entries(L)) {
  r = await as("owner", INS, [id, data], { commit: true });
  check(ok(r), `owner adds ${id}`, r);
}
for (let i = 1; i <= 6; i++) {
  await as("owner", INS, [`U${i}`, lead(`U${i}`, `Pool ${i}`, { kind: i % 2 ? "school" : "coaching", city: i <= 3 ? "Patna" : "Ranchi", phone: `+91982000000${i}` })], { commit: true });
}
await db.exec(`insert into public.content (collection, doc_id, data) values
  ('demoSites','d1','{"id":"d1","slug":"asha-one","status":"draft","instituteName":"Asha School One"}'),
  ('demoSites','d2','{"id":"d2","slug":"bilal-two","status":"sent","instituteName":"Bilal Classes Two"}'),
  ('demoSites','d9','{"id":"d9","slug":"closed-one","status":"closed","instituteName":"Closed"}'),
  ('demoSiteOpens','o1','{"id":"o1","demoId":"d1","at":"2026-09-30T10:00:00Z"}'),
  ('demoSiteOpens','o2','{"id":"o2","demoId":"d2","at":"2026-09-30T11:00:00Z"}'),
  ('applications','a1','{"id":"a1","name":"An applicant","phone":"+919999999999"}'),
  ('submissions','s1','{"id":"s1","name":"A visitor"}');`);
r = await as("owner", `select public.crm_assign_leads(array['L1','L4','L6'], $1) as n`, [M.asha], { commit: true });
check(ok(r) && Number(r.rows[0].n) === 3, "owner assigns L1, L4, L6 to asha", r);
r = await as("owner", `select public.crm_assign_leads(array['L2'], $1) as n`, [M.bilal], { commit: true });
await as("owner", `insert into public.outreach_events (id, lead_id, data) values ('E1','L1','{"type":"sent","channel":"whatsapp","templateId":"wa_first_new_school_en"}'), ('E2','L2','{"type":"sent"}'), ('E3','L3','{"type":"note"}')`, [], { commit: true });

/* ── 5. Who sees which leads, and their history ─────────────────────────── */
const leadsSeen = `select count(*) as n from public.outreach_leads`;
const total = await num("owner", leadsSeen);
check(total === 13, "owner sees all 13 leads", total);
check((await num("ayesha", leadsSeen)) === 13, "an admin sees every lead", await num("ayesha", leadsSeen));
check((await num("asha", leadsSeen)) === 3, "asha (member) sees only her 3 leads", await num("asha", leadsSeen));
check((await num("bilal", leadsSeen)) === 1, "bilal (member, See all on) still reads only HIS full rows from the table", await num("bilal", leadsSeen));
check((await num("dev", leadsSeen)) === 0, "a login that is not in the team sees 0", await num("dev", leadsSeen));
let anonR = await as("anon", leadsSeen);
check(!ok(anonR) && /permission denied/.test(anonR.error), "a signed-out visitor is refused outright", anonR);
anonR = await as("anon", `select count(*) from public.crm_members`);
check(!ok(anonR) && /permission denied/.test(anonR.error), "a signed-out visitor cannot list the team", anonR);
const evSeen = `select count(*) as n from public.outreach_events where data->>'type' <> 'assign'`;
check((await num("asha", evSeen)) === 1, "asha reads only her leads' history", await num("asha", evSeen));
check((await num("dev", evSeen)) === 0, "dev reads no history", await num("dev", evSeen));

/* A member reads a CLOSED lead for 14 days after it closed, then no more (DPDP minimum access). */
const l4closed = (await pg(`select closed_at from public.outreach_leads where id = 'L4'`))[0].closed_at;
check(l4closed !== null, "a lead added at Do not contact is stamped closed by the server", l4closed);
await db.exec(`update public.outreach_leads set closed_at = now() - interval '20 days' where id = 'L4'`);
check((await num("asha", leadsSeen)) === 2, "20 days after L4 closed, asha no longer reads it (2 leads)", await num("asha", leadsSeen));
r = await as("asha", `select public.crm_patch_lead('L4', '{"tags":["x"]}'::jsonb)`);
check(!ok(r) && r.code === "P0002", "...nor changes it", r);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('EW1', 'L4', '{"type":"note"}')`);
check(!ok(r), "...nor writes on its history", r);
r = await as("asha", `select public.crm_ask_owner('L4', 'question', 'x')`);
check(!ok(r), "...nor reaches it through Ask Mehdi", r);
await db.exec(`update public.outreach_leads set closed_at = now() - interval '2 days' where id = 'L4'`);
check((await num("asha", leadsSeen)) === 3, "2 days after closing she still reads it (a late reply can still be answered)", await num("asha", leadsSeen));
check((await num("owner", `select count(*) from public.outreach_leads where id = 'L4'`)) === 1, "Mehdi always reads every lead");
const assignLine = await one("asha", `select data->>'detail' from public.outreach_events where lead_id = 'L1' and data->>'type' = 'assign'`);
check(/Assigned to Asha \(was Unassigned\) by Mehdi Alam/.test(assignLine || ""), "the lead's history says who assigned it to whom", assignLine);

/* See all = a read-only list without contact details. */
let ov = await as("bilal", `select * from public.crm_leads_overview()`);
check(ok(ov) && ov.rows.length === 13 && ov.rows.every((x) => !("phone" in x) && !("email" in x)), "bilal (See all) lists all 13 leads, without phone or e-mail", ov.rows?.length);
ov = await as("asha", `select * from public.crm_leads_overview()`);
check(ok(ov) && ov.rows.length === 0, "asha (See all off) gets no overview rows", ov.rows?.length);
r = await as("bilal", `update public.outreach_leads set data = data || '{"notes":"x"}' where id = 'L1' returning id`);
check(ok(r) && r.n === 0, "bilal (See all) cannot edit asha's lead: 0 rows", r);

/* ── 6. What a member may change (the field guard) ──────────────────────── */
const patch = (who, id, set, unset = []) => as(who, `select id, data from public.crm_patch_lead($1, $2::jsonb, $3::text[])`, [id, JSON.stringify(set), unset], { commit: true });
r = await patch("asha", "L1", { status: "replied", notes: "Principal said call Monday", nextActionAt: "2026-10-05T09:00:00.000Z" });
check(ok(r) && r.rows[0].data.status === "replied", "asha moves L1 to Replied and writes a note (server-side merge)", r);
r = await patch("asha", "L1", { lastContactedAt: "2020-01-01T00:00:00.000Z" });
check(ok(r) && !r.rows[0].data.lastContactedAt.startsWith("2020"), "asha cannot backdate a touch: the server dates it", r.rows?.[0]?.data?.lastContactedAt);
r = await patch("asha", "L2", { notes: "x" });
check(!ok(r) && r.code === "P0002", "crm_patch_lead on someone else's lead raises (not a silent 0 rows)", r);
r = await patch("asha", "L1", { phone: "+919000000000" });
check(!ok(r) && /phone/.test(r.error), "asha cannot change a filled phone number", r);
r = await patch("asha", "L6", { email: "found@school.example", contactName: "Mrs Rao" });
check(ok(r), "asha may FILL an empty e-mail and contact name", r);
r = await patch("asha", "L6", { email: "other@school.example" });
check(!ok(r), "...but not change them once filled", r);
r = await patch("asha", "L1", { instituteName: "Renamed" });
check(!ok(r) && /instituteName/.test(r.error), "asha cannot rename the institute", r);
r = await patch("asha", "L1", { demoId: "d2" });
check(!ok(r), "asha cannot point her lead at another demo", r);
r = await patch("asha", "L1", { assignedTo: "Bilal" });
check(!ok(r), "asha cannot write the old free-text label", r);
/* Notes only grow for a member; the observation is fill-only. */
r = await patch("asha", "L1", { notes: "Replaced everything" });
check(!ok(r) && /only grow/.test(r.error), "asha cannot replace the notes (one box saved on blur could wipe Mehdi's)", r);
r = await patch("asha", "L1", {}, ["notes"]);
check(!ok(r), "...nor empty them", r);
r = await patch("asha", "L1", { notes: "Principal said call Monday\nAlso: wants Hindi" });
check(ok(r), "...but may add to them", r);
r = await as("asha", `select data->>'notes' as notes from public.crm_append_notes('L1', 'Third line')`, [], { commit: true });
check(ok(r) && r.rows[0].notes === "Principal said call Monday\nAlso: wants Hindi\nThird line",
  "crm_append_notes adds a line on the server, from the row as it is now (no lost edits)", r);
r = await patch("asha", "L1", { observation: "The admissions page does not open on a phone" });
check(ok(r), "asha may fill an empty observation", r);
r = await patch("asha", "L1", { observation: "Something else" });
check(!ok(r) && /observation/.test(r.error), "...but not replace it (a different one goes into the history)", r);
r = await patch("asha", "L1", { status: "call" });
check(!ok(r) && /Hand to Mehdi/.test(r.error), "asha cannot set stage Call: a call with Mehdi comes from a hand-over", r);
r = await patch("asha", "L1", { tags: ["x".repeat(33000)] });
check(!ok(r) && r.code === "22001", "a lead over 32 KB is refused (no filling the database through one lead)", r);
r = await as("owner", `select public.crm_patch_lead('L1', '{"notes":"Mehdi rewrote the notes"}'::jsonb)`);
check(ok(r), "Mehdi may rewrite notes", r);
r = await patch("asha", "L1", { status: "won" });
check(!ok(r) && /Proposal and Won/.test(r.error), "asha cannot mark a lead Won", r);
r = await patch("asha", "L1", { status: "proposal" });
check(!ok(r), "asha cannot move a lead to Proposal", r);
r = await patch("asha", "L4", { status: "contacted" });
check(!ok(r) && /Do not contact/.test(r.error), "asha cannot take L4 off Do not contact", r);
r = await patch("asha", "L6", { status: "lost" });
check(!ok(r) && /why/.test(r.error), "asha must say why a lead is lost", r);
r = await patch("asha", "L6", { status: "lost", lostReason: "Has a website vendor" });
check(ok(r), "...and can, with a reason", r);
await as("owner", `select public.crm_patch_lead('L6', '{"status":"new"}'::jsonb, '{lostReason}')`, [], { commit: true });
r = await as("asha", `update public.outreach_leads set assigned_to = $1 where id = 'L1' returning id`, [M.bilal]);
check(!ok(r), "asha cannot hand her lead to bilal", r);
r = await as("asha", `update public.outreach_leads set assigned_to = null where id = 'L1' returning id`);
check(!ok(r), "asha cannot unassign her lead", r);
r = await as("asha", `delete from public.outreach_leads where id = 'L1' returning id`);
check(ok(r) && r.n === 0, "asha's delete touches 0 rows", r);
r = await as("asha", `insert into public.outreach_leads (id, data) values ('LX', '{"instituteName":"New"}') returning id`);
check(!ok(r), "asha cannot add a lead while Can add leads is off", r);
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L1', (select data from public.outreach_leads where id = 'L1')) on conflict (id) do update set data = excluded.data returning id`);
check(!ok(r), "asha's UPSERT is refused (INSERT's check applies to every proposed row): members use crm_patch_lead", r);
const auditLeak = await one("asha", `select data->>'phone' from public.outreach_leads where id = 'L1'`);
check(auditLeak === "+919810000001", "the refused phone change left the number as it was", auditLeak);
/* The shape every screen reads: one number or object where text belongs would break the CRM for everyone. */
for (const [id, set, what] of [
  ["L6", { city: { x: 1 } }, "an object as the city"],
  ["L6", { contactName: ["Mrs", "Rao"] }, "a list as the contact name"],
  ["L6", { state: 7 }, "a number as the state"],
  ["L1", { tags: 5 }, "a number as the tags"],
  ["L1", { tags: ["hot", 5] }, "a number inside the tags"],
  ["L1", { notes: { x: 1 } }, "an object as the notes"],
  ["L1", { status: "maybe" }, "a stage that does not exist"],
  ["L1", { language: "fr" }, "a language the CRM does not write in"],
  ["L1", { nextActionAt: "soon" }, "a follow-up date that is not a date"],
  ["L1", { nextActionAt: "infinity" }, "a follow-up date of 'infinity'"],
]) {
  r = await patch("asha", id, set);
  check(!ok(r) && ["22023", "42501"].includes(r.code), `asha cannot write ${what}`, r);
}
r = await patch("asha", "L1", { nextActionAt: "2026-10-05 15:30:00+05:30" });
check(ok(r) && r.rows[0].data.nextActionAt === "2026-10-05T10:00:00.000Z", "a follow-up date is stored in the app's own format (the server writes it)", r.rows?.[0]?.data?.nextActionAt);
r = await as("ayesha", `select public.crm_patch_lead('L2', '{"city": {"x": 1}}'::jsonb)`);
check(!ok(r) && r.code === "22023", "an admin cannot write an object as the city either", r);
r = await as("ayesha", `select public.crm_patch_lead('L2', '{}'::jsonb, '{instituteName}')`);
check(!ok(r) && r.code === "23514", "...nor remove the institute's name", r);
r = await as("ayesha", `select public.crm_patch_lead('L2', '{"kind": "bakery"}'::jsonb)`);
check(!ok(r) && /school, coaching, dental, other/.test(r.error || ""), "...nor set a kind that does not exist (the error lists the kinds)", r);
r = await as("asha", `update public.outreach_leads set data = '[1, 2]'::jsonb where id = 'L1' returning id`);
check(!ok(r), "a lead's data is a JSON object, never a list", r);

/* ── 7. History lines ───────────────────────────────────────────────────── */
r = await as("asha", `insert into public.outreach_events (id, lead_id, data, actor_id, created_at) values ('E9', 'L1', '{"type":"call","leadId":"L2","at":"2020-01-01T00:00:00.000Z"}', $1, '2020-01-01') returning actor_id, data->>'leadId' as lid, data->>'at' as at, created_at`, [M.bilal], { commit: true });
check(ok(r) && r.rows[0].actor_id === M.asha && r.rows[0].lid === "L1" && !r.rows[0].at.startsWith("2020"),
  "asha's call line is signed as asha, points at L1 and carries the server's time, whatever she sent", r);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E10', 'L2', '{"type":"note"}') returning id`);
check(!ok(r), "asha cannot write history on bilal's lead", r);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E11', 'L4', '{"type":"sent","channel":"whatsapp"}') returning id`);
check(!ok(r) && /not to be contacted/.test(r.error), "a 'sent' line on a Do-not-contact lead is refused", r);
r = await as("owner", `insert into public.outreach_events (id, lead_id, data) values ('E12', 'L4', '{"type":"sent","channel":"email"}') returning id`);
check(!ok(r), "...for Mehdi too (lift Do not contact first)", r);
/* A lead from a Meta form who left the box "Ideovent may contact me on WhatsApp and phone" unticked (metaConsent
   "no"): e-mail only, for everyone, Mehdi included; the database holds it, not only the screens (review, 3 Oct).
   L1 is made such a lead inside each probe's own transaction (as the database owner), so nothing of it stays. */
async function asWith(prep, who, sql, params = []) {
  await db.exec("begin");
  try {
    await db.exec(prep);
    const p = P[who];
    await db.exec("set local role authenticated");
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: p.uid, email: p.email, role: "authenticated", aud: "authenticated" })]);
    const out = await db.query(sql, params);
    await db.exec("rollback");
    return { rows: out.rows, n: out.affectedRows ?? out.rows.length };
  } catch (e) {
    await db.exec("rollback");
    return { error: e.message, code: e.code };
  }
}
const UNTICKED = `update public.outreach_leads set data = data || '{"source":"Instagram Lead Ads","metaLeadId":"9000000000000081","metaConsent":"no"}'::jsonb where id = 'L1'`;
const TICKED = UNTICKED.replace('"metaConsent":"no"', '"metaConsent":"yes"');
const NO_TICK = "crm: they did not tick the box on the Facebook or Instagram form that allows WhatsApp and calls. E-mail them only.";
const logOn = (prep, who, data) => asWith(prep, who, `insert into public.outreach_events (id, lead_id, data) values ('EC', 'L1', $1::jsonb) returning id`, [JSON.stringify(data)]);
for (const [who, data, what] of [
  ["asha", { type: "sent", channel: "whatsapp", stage: "first" }, "asha's first WhatsApp"],
  ["asha", { type: "sent", channel: "whatsapp", stage: "follow_up_1" }, "asha's WhatsApp follow-up"],
  ["asha", { type: "call", channel: "call", outcome: "no_answer" }, "asha's call"],
  ["asha", { type: "call", outcome: "connected_interested" }, "asha's call with no channel on it"],
  ["asha", { type: "sent", templateId: "wa_follow_up_1_school_en" }, "a WhatsApp send with its channel left out (the template id gives it away)"],
  ["ayesha", { type: "sent", channel: "whatsapp", stage: "first" }, "an admin's WhatsApp"],
  ["owner", { type: "sent", channel: "whatsapp", stage: "first" }, "Mehdi's own WhatsApp"],
  ["owner", { type: "call", channel: "call", outcome: "connected_interested" }, "Mehdi's own call"],
]) {
  r = await logOn(UNTICKED, who, data);
  check(!ok(r) && r.code === "42501" && r.error === NO_TICK, `a Meta lead who did not tick the box: ${what} is refused, in the screen's words`, r);
}
for (const [prep, who, data, what] of [
  [UNTICKED, "asha", { type: "sent", channel: "email", stage: "first" }, "asha's e-mail to them"],
  [UNTICKED, "asha", { type: "note", detail: "Wrote by e-mail" }, "a note"],
  [UNTICKED, "asha", { type: "replied", channel: "whatsapp" }, "their own WhatsApp reply, logged"],
  [UNTICKED, "owner", { type: "sent", channel: "email", stage: "first" }, "Mehdi's e-mail"],
  [TICKED, "asha", { type: "sent", channel: "whatsapp", stage: "first" }, "a WhatsApp to a Meta lead who ticked it"],
  [TICKED, "asha", { type: "call", channel: "call", outcome: "no_answer" }, "a call to a Meta lead who ticked it"],
]) {
  r = await logOn(prep, who, data);
  check(ok(r), `...while ${what} still saves (rolled back)`, r);
}
check((await pg(`select data ? 'metaConsent' as has from public.outreach_leads where id = 'L1'`))[0]?.has === false, "...and L1 is as it was after the probes");
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E13', 'L1', '{"type":"status","detail":"Status: Replied to Won"}') returning id`);
check(!ok(r), "asha cannot write a '... to Won' line (the dashboard counts wins from it)", r);
/* Review, 3 Oct: metrics.ts isWinEvent (/\bto Won$/) takes every character but an ASCII letter, digit or _ for a
   word break; the guard's old \m followed the database's locale, so "éto Won" passed it and still counted as a win. */
for (const [detail, refused, what] of [
  ["Status: Contacted éto Won", true, "'éto Won' (é is a word break for the dashboard)"],
  ["Status: Contacted ½to Proposal", true, "'½to Proposal'"],
  ["to Won", true, "a line that is only 'to Won'"],
  ["Status: Contacted\tto  Won ", true, "a tab before 'to' and spaces around 'Won'"],
  ["Status: Contacted xto Won", false, "'xto Won' (one word: the dashboard does not count it either)"],
  ["Status: Contacted 1to Won", false, "'1to Won'"],
  ["Status: Contacted _to Won", false, "'_to Won'"],
]) {
  r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E13', 'L1', jsonb_build_object('type', 'status', 'detail', $1::text)) returning id`, [detail]);
  const counted = /\bto Won$|\bto Proposal$/.test(detail.trimEnd().replace(/\s+/g, " "));
  check(refused ? !ok(r) && r.code === "42501" : ok(r), `${refused ? "asha cannot write" : "asha may write"} ${what}${refused ? "" : " (rolled back)"}`, r);
  if (!refused) check(!counted, `...and the dashboard would not count ${what} as a win`, detail);
}
{
  /* The negative control: the old pattern in this same database lets "éto Won" through; the new one does not. */
  const [old, now] = (await pg(`select $1 ~* '\\mto\\s+(won|proposal)\\s*$' as old, $1 ~* '(^|[^a-z0-9_])to\\s+(won|proposal)\\s*$' as now`, ["Status: Contacted éto Won"]))
    .map((x) => [x.old, x.now])[0];
  check(old === false && now === true, "the old \\m pattern let 'éto Won' through in this locale; the new one refuses it", { old, now });
}
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E14', 'L1', '{"type":"assign","detail":"Assigned to Asha"}') returning id`);
check(!ok(r), "asha cannot forge a system line (assign, handoff)", r);
/* Money is never delegated (SOP-10): no after-call summary, no proposal, from anyone but Mehdi. */
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E16', 'L1', '{"type":"sent","channel":"whatsapp","stage":"after_call"}') returning id`);
check(!ok(r) && /Mehdi/.test(r.error), "asha cannot log an after-call summary (it carries the price and the payment terms)", r);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E17', 'L1', '{"type":"sent","channel":"email","templateId":"em_proposal_chase_any_en"}') returning id`);
check(!ok(r), "...nor a proposal, even with the stage left out (the template id gives it away)", r);
r = await as("ayesha", `insert into public.outreach_events (id, lead_id, data) values ('E18', 'L2', '{"type":"sent","channel":"email","stage":"proposal"}') returning id`);
check(!ok(r), "an admin cannot either", r);
r = await as("owner", `insert into public.outreach_events (id, lead_id, data) values ('E19', 'L2', '{"type":"sent","channel":"email","stage":"proposal"}') returning id`);
check(ok(r), "Mehdi can", r);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E21', 'L1', $1::jsonb) returning id`, [JSON.stringify({ type: "note", detail: "x".repeat(5000) })]);
check(!ok(r) && r.code === "22001", "a member's history line over 4 KB is refused", r);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E15', 'L1', '{"type":"demo_opened","at":"2026-09-30T10:00:00.000Z"}') returning data->>'at' as at`, [], { commit: true });
check(ok(r) && r.rows[0].at === "2026-09-30T10:00:00.000Z", "a 'demo opened' line keeps the prospect's open time", r);
r = await as("asha", `delete from public.outreach_events where id = 'E9' returning id`);
check(ok(r) && r.n === 0, "asha cannot delete history", r);
r = await as("asha", `update public.outreach_events set data = '{}' where id = 'E9' returning id`);
check(ok(r) && r.n === 0, "asha cannot rewrite history", r);
r = await as("ayesha", `delete from public.outreach_events where id = 'E9' returning id`);
check(ok(r) && r.n === 0, "an admin cannot delete history either", r);
/* A line's fields are text from their lists: a list cannot carry a forged win or a money stage past the tests. */
for (const [data, what] of [
  [{ type: "status", detail: ["Status: Contacted to Won"] }, "a '... to Won' line hidden in a list"],
  [{ type: "sent", channel: "whatsapp", stage: ["after_call"] }, "an after-call stage hidden in a list"],
  [{ type: "sent", channel: "email", templateId: ["em_after_call"] }, "a proposal template id hidden in a list"],
  [{ type: "sent", channel: "whatsapp", stage: "after call" }, "a stage that does not exist ('after call')"],
  [{ type: "sent", channel: "sms" }, "a channel the CRM does not have"],
  [{ type: "call", outcome: 5 }, "a number as a call's outcome"],
  [{ type: "note", detail: { x: 1 } }, "an object as a note"],
]) {
  r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('EX', 'L1', $1::jsonb) returning id`, [JSON.stringify(data)]);
  check(!ok(r) && ["22023", "42501"].includes(r.code), `asha cannot write ${what}`, r);
}
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('EX', 'L1', '[{"type":"note"}]'::jsonb) returning id`);
check(!ok(r), "a history line is a JSON object, never a list", r);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('EX', 'L1', '{"type":"call","channel":"call","outcome":"no_answer","detail":"No answer"}'::jsonb) returning id`);
check(ok(r), "a real call line, with its outcome, still saves", r);
r = await as("ayesha", `insert into public.outreach_events (id, lead_id, data) values ('EX', 'L2', '{"type":"status","detail":["Status: Contacted to Won"]}'::jsonb) returning id`);
check(!ok(r) && r.code === "22023", "an admin cannot hide a win in a list either", r);

/* The daily write budget: anyone but Mehdi. One person cannot fill the database. */
await pg(`insert into private.crm_usage (member_id, day, kind, n) values ($1, (now() at time zone 'Asia/Kolkata')::date, 'event', 300)
          on conflict (member_id, day, kind) do update set n = 300`, [M.asha]);
r = await as("asha", `insert into public.outreach_events (id, lead_id, data) values ('E22', 'L1', '{"type":"note","detail":"one more"}') returning id`);
check(!ok(r) && r.code === "54000", "past 300 history lines in a day, asha's next line is refused", r);
r = await as("asha", `select public.crm_ask_owner('L1', 'question', 'x')`);
check(!ok(r) && r.code === "54000", "...Ask Mehdi counts in the same budget", r);
r = await as("owner", `insert into public.outreach_events (id, lead_id, data) values ('E23', 'L1', '{"type":"note","detail":"Mehdi"}') returning id`);
check(ok(r), "Mehdi has no budget", r);
await pg(`delete from private.crm_usage where member_id = $1 and kind = 'event'`, [M.asha]);
const changes = (await pg(`select n from private.crm_usage where member_id = $1 and kind = 'lead_change'`, [M.asha]))[0]?.n;
check(changes > 0, "asha's lead changes today are counted (refused ones are not)", changes);

/* ── 8. Adding leads (Can add leads on): theirs, de-duplicated, capped ─── */
await as("owner", `select public.crm_save_member(p_member_id => $1, p_can_add_leads => true)`, [M.asha], { commit: true });
r = await as("asha", `insert into public.outreach_leads (id, data, assigned_to) values ('L7', '{"instituteName":"Asha Found It","phone":"+919830000007","demoId":"d2","status":"won"}', $1) returning assigned_to, created_by, data`, [M.bilal], { commit: true });
check(ok(r) && r.rows[0].assigned_to === M.asha && r.rows[0].created_by === M.asha && !("demoId" in r.rows[0].data) && r.rows[0].data.status === "new",
  "asha adds L7 naming bilal: it is hers, the demo link is dropped, the stage starts at New", r);
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L8', '{"instituteName":"Copy of Bilal","phone":"+919810000002"}') returning id`);
check(!ok(r) && r.code === "23505" && /already belongs to a lead in the CRM/.test(r.error) && !/Bilal|9810000002/.test(r.error),
  "asha cannot add a school bilal already has: refused (23505) without naming the school, whose it is or the number", r);
/* The refusal is no free lookup: a refused insert costs no budget, so it names nothing, and without
   "Can add leads" it says nothing at all (that is asked before the duplicate check). */
const bilalKnown = await as("bilal", `insert into public.outreach_leads (id, data) values ('LQ1', '{"instituteName":"Probe","phone":"+919810000001"}') returning id`);
const bilalUnknown = await as("bilal", `insert into public.outreach_leads (id, data) values ('LQ2', '{"instituteName":"Probe","phone":"+919899999999"}') returning id`);
check(!ok(bilalKnown) && bilalKnown.code === "42501" && bilalKnown.error === bilalUnknown.error && bilalKnown.code === bilalUnknown.code,
  "without 'Can add leads' a known and an unknown number get the SAME refusal (42501): no free 'is it in the CRM' oracle", [bilalKnown, bilalUnknown]);
check(!/Asha|School One|already/.test(bilalKnown.error || ""), "...naming no school and no person", bilalKnown.error);
/* Duplicates compare the number, not its spelling. */
for (const ph of ["98100 00002", "+91 98100-00002", "098100 00002"]) {
  r = await as("asha", `insert into public.outreach_leads (id, data) values ('L8', jsonb_build_object('instituteName', 'Copy', 'phone', $1::text)) returning id`, [ph]);
  check(!ok(r) && r.code === "23505", `bilal's number written as "${ph}" is still his: refused`, r);
}
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L8', '{"instituteName":"Copy","email":" L1@School.Example "}') returning id`);
check(!ok(r) && r.code === "23505", "an e-mail matches without case or spaces", r);
/* Filling in a blank number or e-mail is checked the same way (no copying another lead's contact in). */
r = await patch("asha", "L6", { whatsapp: "+919810000002" });
check(!ok(r) && r.code === "23505" && !/Bilal|9810000002/.test(r.error), "asha cannot fill her lead's empty WhatsApp with bilal's number", r);
r = await patch("asha", "L6", { whatsapp: "098100 00003" });
check(!ok(r) && r.code === "23505", "...nor with a pool lead's number written another way", r);
r = await as("asha", `select data from public.crm_patch_lead('L6', '{"whatsapp":"+919810000006"}'::jsonb)`);
check(ok(r) && r.rows[0].data.whatsapp === "+919810000006", "...but may put the lead's OWN number in as its WhatsApp", r);
r = await as("asha", `insert into public.outreach_leads (id, data) values ('LE', '{"instituteName":"Empty Contacts"}') returning id`, [], { commit: true });
r = await patch("asha", "LE", { email: "l1@school.example" });
check(!ok(r) && r.code === "23505", "a lead added with no contacts cannot then take another lead's e-mail", r);
await pg(`delete from public.outreach_leads where id = 'LE'`);
/* A lead she adds has the shape the screens read too. */
for (const [data, what] of [
  [{ instituteName: { x: 1 } }, "an object as the institute's name"],
  [{ instituteName: "Shape", kind: 7 }, "a number as the kind"],
  [{ instituteName: "Shape", kind: "bakery" }, "a kind that does not exist"],
  [{ instituteName: "Shape", source: ["x"] }, "a list as the source"],
  [{ instituteName: "Shape", pitch: "cheap" }, "a pitch that does not exist"],
  [{ instituteName: "  " }, "no institute's name"],
  [{ phone: "+919830000077" }, "no institute's name at all"],
]) {
  r = await as("asha", `insert into public.outreach_leads (id, data) values ('LS', $1::jsonb) returning id`, [JSON.stringify(data)]);
  check(!ok(r) && ["22023", "23514"].includes(r.code), `asha cannot add a lead with ${what}`, r);
}
/* ...and never one that passes for a lead from Meta's forms (0012 brings those in; Mehdi imports Meta's own
   files): a Meta lead's id would take a future Meta lead's place, a Meta source or meta... key would credit
   the ads with her own lead. Each insert below is rolled back, so her New-lead count is unchanged. */
for (const id of ["ol_meta_9000000000000071", "OL_META_9000000000000072"]) {
  r = await as("asha", `insert into public.outreach_leads (id, data) values ($1, '{"instituteName":"Meta Look","phone":"+919830000071"}') returning id`, [id]);
  check(!ok(r) && r.code === "42501" && /ids starting with ol_meta_ are kept for leads from Facebook and Instagram forms/.test(r.error),
    `asha cannot add a lead with the id ${id} (a Meta lead's place)`, r);
}
/* Compared on its letters only (review, 3 Oct): the dashboard and the Source filter group "Meta Lead Ads" with a
   no-break space, a tab, a line break or an ideographic space around it as "meta lead ads" (JavaScript's trim). */
const SPACED = ["Meta Lead Ads ", "\tInstagram Lead Ads", "Facebook Lead Ads\n", "Meta Leads Center　", "Meta Lead Ads​",
  "﻿Meta Lead Ads", "FacebooK Lead Ads", "meta-lead-ads", "  Meta   Lead   Ads  "];
for (const source of [...META_SOURCES, " instagram lead ads ", "META LEADS CENTER", ...SPACED]) {
  r = await as("asha", `insert into public.outreach_leads (id, data) values ('LM', jsonb_build_object('instituteName', 'Meta Look', 'phone', '+919830000072', 'source', $1::text)) returning id`, [source]);
  check(!ok(r) && r.code === "42501" && /that source is kept for leads from Facebook and Instagram forms/.test(r.error), `asha cannot add a lead whose source is ${JSON.stringify(source)}`, r);
}
for (const source of ["Manual", "Instagram", "Referral", "Meta Lead Ads (old campaign)"]) {
  r = await as("asha", `insert into public.outreach_leads (id, data) values ('LM', jsonb_build_object('instituteName', 'Meta Look', 'phone', '+919830000072', 'source', $1::text)) returning id`, [source]);
  check(ok(r), `...but may add one whose source is "${source}" (rolled back)`, r);
}
r = await as("asha", `insert into public.outreach_leads (id, data) values ('ol_meta_9000000000000073', '{"instituteName":"Copy of Bilal","phone":"+919810000002"}') returning id`);
check(!ok(r) && r.code === "42501" && !/already/.test(r.error), "...the Meta id is refused first, so the refusal says nothing about the number", r);
r = await as("asha", `insert into public.outreach_leads (id, data) values ('LM', $1::jsonb) returning data`, [JSON.stringify({ instituteName: "Meta Look",
  phone: "+919830000074", source: "Instagram page", metaLeadId: "9000000000000074", metaPlatform: "ig", metaConsent: "yes", metaCampaignName: "Made up", MetaOther: "x" })]);
check(ok(r) && !Object.keys(r.rows[0].data).some((k) => /^meta/i.test(k)) && r.rows[0].data.source === "Instagram page" && r.rows[0].data.phone === "+919830000074",
  "a lead asha adds keeps none of the meta... keys, and the rest as she wrote it", r);
r = await as("owner", `insert into public.outreach_leads (id, data) values ('ol_meta_9000000000000075', '{"instituteName":"Mehdi Import","source":"Meta Leads Center","metaLeadId":"9000000000000075","metaConsent":"no"}') returning data`);
check(ok(r) && r.rows[0].data.metaLeadId === "9000000000000075" && r.rows[0].data.source === "Meta Leads Center" && r.rows[0].data.metaConsent === "no",
  "Mehdi's import of Meta's own files still adds Meta leads as they are", r);
r = await as("asha", `select * from public.crm_find_duplicate('+919810000002', null)`);
check(ok(r) && r.rows.length === 1 && r.rows[0].assignee_name === "Bilal" && r.rows[0].visible === false && !("phone" in r.rows[0]),
  "crm_find_duplicate tells asha it is bilal's, and that she cannot open it", r);
r = await as("asha", `select * from public.crm_find_duplicate(null, 'L1@SCHOOL.example')`);
check(ok(r) && r.rows[0]?.lead_id === "L1" && r.rows[0]?.visible === true, "the duplicate check matches e-mail without case, and her own lead is visible", r);
r = await as("dev", `select * from public.crm_find_duplicate('+919810000002', null)`);
check(ok(r) && r.rows.length === 0, "a non-member's duplicate check answers nothing", r);
// Her New leads now (nobody has written to them): L6 and L7. L1 has replied; L4 is closed. New-lead cap 5.
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L9', '{"instituteName":"Third new","phone":"+919830000009","status":"contacted"}') returning data->>'status' as s`, [], { commit: true });
check(ok(r) && r.rows[0].s === "new", "a lead a member adds always starts at New (it counts in her queue)", r);
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L10', '{"instituteName":"Fourth new","phone":"+919830000010"}') returning id`, [], { commit: true });
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L11', '{"instituteName":"Fifth new","phone":"+919830000011"}') returning id`, [], { commit: true });
check(ok(r), "asha adds her fifth New lead (her New-lead cap is 5)", r);
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L12', '{"instituteName":"Over the cap","phone":"+919830000012"}') returning id`);
check(!ok(r) && /limit/.test(r.error), "asha cannot hold more New leads than her cap", r);
r = await patch("asha", "L9", { status: "contacted" });
r = await as("asha", `insert into public.outreach_leads (id, data) values ('L12', '{"instituteName":"Room again","phone":"+919830000012"}') returning id`, [], { commit: true });
check(ok(r), "once she has written to one (L9 is Contacted) there is room again: contacted leads do not count", r);
await as("owner", `select public.crm_save_member(p_member_id => $1, p_can_add_leads => false)`, [M.asha], { commit: true });

/* ── 9. Assigning, sharing out, rules: caps hold ────────────────────────── */
r = await as("owner", `select public.crm_assign_leads(array['L3'], $1) as n`, [M.asha]);
check(!ok(r) && /limit is 5/.test(r.error), "owner cannot push asha past her cap; the error says so", r);
r = await as("asha", `select public.crm_assign_leads(array['L3'], $1) as n`, [M.asha]);
check(!ok(r), "a member cannot assign leads", r);
r = await as("ayesha", `select public.crm_assign_leads(array['L3'], $1) as n`, [M.chetan], { commit: true });
check(ok(r) && Number(r.rows[0].n) === 1, "an admin assigns L3 to chetan", r);
// bilal holds L2 (1 open) plus U1-U3 below (4); chetan holds L3 (1).
await as("owner", `select public.crm_assign_leads(array['U1','U2','U3'], $1)`, [M.bilal], { commit: true });
r = await as("owner", `select * from public.crm_distribute(array['U4','U5','U6'], array[$1,$2]::uuid[], 'balanced')`, [M.bilal, M.chetan], { commit: true });
let dist = Object.fromEntries((r.rows || []).map((x) => [x.member_id, x.assigned]));
check(ok(r) && dist[M.bilal] === 1 && dist[M.chetan] === 2,
  "balanced share-out goes by New leads waiting (bilal 3, chetan 1): chetan, chetan, then bilal on the tie", r.rows);
r = await as("owner", `select * from public.crm_distribute(array['U1','U2','U3','U4','U5','U6'], array[$1,$2]::uuid[], 'round_robin')`, [M.bilal, M.chetan], { commit: true });
dist = Object.fromEntries((r.rows || []).map((x) => [x.member_id, x.assigned]));
const rr = Object.fromEntries((await pg(`select id, assigned_to from public.outreach_leads where id like 'U%' order by id`)).map((x) => [x.id, x.assigned_to]));
check(ok(r) && dist[M.bilal] === 3 && dist[M.chetan] === 3 && rr.U1 === M.bilal && rr.U2 === M.chetan && rr.U3 === M.bilal,
  "round-robin deals the six in turn: bilal, chetan, bilal...", rr);
r = await as("owner", `select * from public.crm_distribute(array['U1'], array[$1]::uuid[], 'balanced')`, [M.asha]);
check(ok(r) && r.rows.some((x) => x.member_id === null && x.assigned === 1), "a share-out never passes a cap: the lead asha cannot take is reported as left over", r.rows);
r = await as("owner", `select public.crm_assign_leads(array['U1','U2','U3','U4','U5','U6'], null) as n`, [], { commit: true });
check(ok(r) && Number(r.rows[0].n) === 6, "owner sends six back to the Unassigned list", r);
/* Leads at Call or Proposal stay with Mehdi; a share-out takes New leads unless told otherwise. */
await as("owner", INS, ["UC", lead("UC", "Contacted Pool", { phone: "+919840000001", status: "contacted" })], { commit: true });
await as("owner", INS, ["UP", lead("UP", "Proposal Lead", { phone: "+919840000002", status: "proposal" })], { commit: true });
r = await as("owner", `select public.crm_assign_leads(array['UP'], $1) as n`, [M.chetan]);
check(!ok(r) && /Call or Proposal/.test(r.error), "a lead at Proposal is never assigned to a member", r);
r = await as("owner", `select public.crm_assign_leads(array['UP'], $1) as n`, [M.ayesha]);
check(ok(r) && Number(r.rows[0].n) === 1, "...an admin may hold one", r);
r = await as("owner", `select * from public.crm_distribute(array['UC','UP'], array[$1]::uuid[], 'balanced')`, [M.chetan], { commit: true });
let ucup = Object.fromEntries((await pg(`select id, assigned_to from public.outreach_leads where id in ('UC','UP')`)).map((x) => [x.id, x.assigned_to]));
check(ok(r) && ucup.UC === null && ucup.UP === null, "a share-out takes only New leads: a contacted one and a proposal stay put", [r.rows, ucup]);
r = await as("owner", `select * from public.crm_distribute(array['UC','UP'], array[$1]::uuid[], 'balanced', true)`, [M.chetan], { commit: true });
ucup = Object.fromEntries((await pg(`select id, assigned_to from public.outreach_leads where id in ('UC','UP')`)).map((x) => [x.id, x.assigned_to]));
check(ok(r) && ucup.UC === M.chetan && ucup.UP === null, "with 'include leads already contacted' the contacted one goes; a proposal never does", ucup);
const notes = await num("bilal", `select count(*) from public.crm_notifications where kind = 'moved_away'`);
check(notes >= 1, "bilal is told his leads moved", notes);
r = await as("owner", `insert into public.crm_assignment_rules (name, kind, city, member_ids, priority) values
  ('Patna schools', 'school', 'patna', array[$1,$2]::uuid[], 1), ('Everything else', null, null, array[$3]::uuid[], 9) returning id`, [M.bilal, M.chetan, M.erin], { commit: true });
check(ok(r), "owner writes two assignment rules", r);
r = await as("ayesha", `insert into public.crm_assignment_rules (name, member_ids) values ('x', array[$1]::uuid[]) returning id`, [M.erin]);
check(!ok(r), "an admin cannot write rules", r);
r = await as("owner", `select * from public.crm_apply_rules(array['U1','U2','U3','U4','U5','U6'])`, [], { commit: true });
const byLead = Object.fromEntries((await pg(`select id, assigned_to from public.outreach_leads where id like 'U%'`)).map((x) => [x.id, x.assigned_to]));
check(ok(r) && byLead.U1 === M.bilal && byLead.U3 === M.chetan && byLead.U2 === M.erin && byLead.U4 === M.erin && byLead.U5 === M.erin && byLead.U6 === M.erin,
  "rules: Patna schools rotate bilal, chetan; the rest go to erin", byLead);

/* ── 10. Settings, team, audit, private CMS rows, notifications ────────── */
check((await num("asha", `select count(*) from public.outreach_settings`)) === 1, "asha reads the outreach settings");
r = await as("asha", `update public.outreach_settings set data = '{}' returning id`);
check(ok(r) && r.n === 0, "asha cannot change the settings", r);
r = await as("ayesha", `update public.outreach_settings set data = '{}' returning id`);
check(ok(r) && r.n === 0, "an admin cannot change the settings", r);
check((await num("asha", `select count(*) from public.crm_members`)) === 1, "asha reads only her own team row");
check((await num("ayesha", `select count(*) from public.crm_members`)) >= 7, "an admin reads the whole team");
r = await as("asha", `select * from public.crm_team()`);
const ashaTeam = (r.rows || []).map((x) => x.display_name);
check(ok(r) && r.rows.every((x) => !("email" in x)) && ashaTeam.includes("Mehdi Alam") && ashaTeam.includes("Asha")
  && ashaTeam.includes("Ayesha") && !ashaTeam.includes("Chetan") && !ashaTeam.includes("Erin") && !ashaTeam.includes("Farah"),
  "crm_team gives a member names only: Mehdi, the admins, herself and people on her own leads, not the roster", ashaTeam);
r = await as("ayesha", `select * from public.crm_team()`);
check(ok(r) && r.rows.length >= 7, "an admin gets the whole team", r.rows?.length);
check((await num("asha", `select count(*) from public.crm_audit`)) === 0, "asha reads no audit rows");
check((await num("ayesha", `select count(*) from public.crm_audit`)) === 0, "an admin reads no audit rows");
check((await num("owner", `select count(*) from public.crm_audit`)) > 10, "Mehdi reads the audit trail");
r = await as("asha", `insert into public.crm_audit (action) values ('forged') returning id`);
check(!ok(r), "nobody writes the audit trail through the API", r);
r = await as("owner", `delete from public.crm_audit returning id`);
check(!ok(r) || r.n === 0, "not even Mehdi deletes audit rows through the API", r);
check((await num("asha", `select count(*) from public.content where collection in ('applications','submissions','demoSiteOpens')`)) === 0,
  "asha reads no applications, submissions or raw demo opens");
r = await as("asha", `select id, title, read_at from public.crm_notifications order by id`);
check(ok(r) && r.rows.length >= 1 && r.rows.some((x) => /assigned you 3 leads/.test(x.title)), "asha's bell: 'Mehdi Alam assigned you 3 leads'", r.rows);
const firstNote = r.rows?.[0]?.id;
r = await as("asha", `update public.crm_notifications set read_at = now() where id = $1 returning id`, [firstNote], { commit: true });
check(ok(r) && r.n === 1, "asha marks her notification read", r);
r = await as("asha", `update public.crm_notifications set title = 'x' where id = $1 returning id`, [firstNote]);
check(!ok(r), "...and can change nothing else on it", r);
check((await num("asha", `select count(*) from public.crm_notifications where member_id <> $1`, [M.asha])) === 0, "asha reads nobody else's notifications");

/* ── 11. Demos: the linked demo, its opens, and turning its link on ─────── */
r = await as("asha", `select demo_id, data->>'status' as status from public.crm_lead_demos()`);
check(ok(r) && r.rows.length === 1 && r.rows[0].demo_id === "d1" && r.rows[0].status === "draft", "asha reads her lead's DRAFT demo (the CMS would hide it)", r.rows);
r = await as("asha", `select * from public.crm_demo_opens()`);
check(ok(r) && r.rows.length === 1 && r.rows[0].demo_id === "d1", "asha gets the opens of her lead's demo only", r.rows);
r = await as("asha", `select public.crm_publish_lead_demo('L1') as slug`, [], { commit: true });
const d1 = (await pg(`select data->>'status' as s from public.content where collection = 'demoSites' and doc_id = 'd1'`))[0];
const slot = (await pg(`select data from public.content where collection = 'demoSiteSlots' and doc_id = 'd1'`))[0];
check(ok(r) && r.rows[0].slug === "asha-one" && d1.s === "sent" && slot?.data?.sentTo, "asha turns on her lead's demo link: status sent, slot written", [r, d1, slot]);
r = await as("asha", `select public.crm_publish_lead_demo('L2') as slug`);
check(!ok(r), "...but not the demo of bilal's lead", r);
await db.exec(`update public.outreach_leads set data = data || '{"demoId":"d9"}' where id = 'L9'`);
r = await as("asha", `select public.crm_publish_lead_demo('L9') as slug`);
check(!ok(r) && /closed/.test(r.error), "a demo Mehdi closed stays closed", r);
r = await as("asha", `update public.content set data = '{}' where collection = 'demoSites' returning id`);
check(ok(r) && r.n === 0, "asha still cannot write the CMS directly", r);

/* ── 11b. The public forms: visitors only. A demo open: server time, live demos only, 30 a day ── */
r = await as("asha", `insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'ox_asha', '{"id":"ox_asha","demoId":"d2"}')`);
check(!ok(r), "an intern cannot forge a demo open through her login", r);
r = await as("asha", `insert into public.content (collection, doc_id, data) values ('submissions', 'sx_asha', '{"id":"sx_asha","name":"Fake"}')`);
check(!ok(r), "...nor a contact message", r);
r = await as("asha", `insert into public.content (collection, doc_id, data) values ('applications', 'ax_asha', '{"id":"ax_asha","name":"Fake"}')`);
check(!ok(r), "...nor an internship application", r);
r = await as("anon", `insert into public.content (collection, doc_id, data) values ('submissions', 'sx_anon', '{"id":"sx_anon","name":"A visitor"}')`, [], { commit: true });
check(ok(r) && (await pg(`select count(*)::int as n from public.content where doc_id = 'sx_anon'`))[0].n === 1, "a visitor's contact message still goes in", r);
r = await as("anon", `insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'ox_anon', '{"id":"ox_anon","demoId":"d2","at":"2020-01-01T00:00:00.000Z"}')`, [], { commit: true });
const ox = (await pg(`select data from public.content where doc_id = 'ox_anon'`))[0];
check(ok(r) && ox && !ox.data.at.startsWith("2020") && Date.now() - new Date(ox.data.at).getTime() < 60000,
  "a prospect's open of a live demo is recorded, with the SERVER's time", ox);
r = await as("anon", `insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'ox_closed', '{"id":"ox_closed","demoId":"d9"}')`, [], { commit: true });
check(ok(r) && (await pg(`select count(*)::int as n from public.content where doc_id = 'ox_closed'`))[0].n === 0,
  "an 'open' of a demo whose link is not live is dropped quietly (no error on a phone)", r);
for (let i = 0; i < 31; i++) {
  await as("anon", `insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'oxf_' || $1, jsonb_build_object('id', 'oxf_' || $1, 'demoId', 'd2'))`, [String(i)], { commit: true });
}
check((await pg(`select count(*)::int as n from public.content where collection = 'demoSiteOpens' and data->>'demoId' = 'd2' and updated_at > now() - interval '1 day'`))[0].n === 30,
  "at most 30 opens a day count for one demo (a flood of fake opens stops there)");
r = await as("owner", `insert into public.content (collection, doc_id, data) values ('pages', 'pg_test', '{"id":"pg_test"}') returning id`);
check(ok(r), "Mehdi's own CMS saves still work (he is 'authenticated' too)", r);

/* ── 12. Numbers: one function, the same answer for member and owner ─────── */
const from = new Date(Date.now() - 3600e3).toISOString();
r = await as("asha", `select * from public.crm_activity_stats($1)`, [from]);
check(ok(r) && r.rows.length === 1 && r.rows[0].member_id === M.asha && r.rows[0].calls === 1 && r.rows[0].new_leads === 5,
  "asha's numbers: only her own row (1 call today, 5 New leads waiting)", r.rows);
const mine = r.rows?.[0];
r = await as("owner", `select * from public.crm_activity_stats($1)`, [from]);
const hers = (r.rows || []).find((x) => x.member_id === M.asha);
check(ok(r) && r.rows.length >= 6 && hers && JSON.stringify({ ...hers, last_seen_at: 0 }) === JSON.stringify({ ...mine, last_seen_at: 0 }),
  "Mehdi's team numbers list everyone, and asha's row is identical to hers", hers);
r = await as("dev", `select * from public.crm_activity_stats($1)`, [from]);
check(ok(r) && r.rows.length === 0, "a non-member gets no numbers", r.rows);

/* ── 13. Hand to Mehdi; booking his time (members: phase 2) ─────────────── */
const slotAt = (() => { // next weekday (Mon-Sat), 15:00 India time, at least a day ahead
  const d = new Date(Date.now() + 2 * 864e5);
  const ist = new Date(d.getTime() + 5.5 * 3600e3);
  if (ist.getUTCDay() === 0) d.setTime(d.getTime() + 864e5);
  const i2 = new Date(d.getTime() + 5.5 * 3600e3);
  return new Date(Date.UTC(i2.getUTCFullYear(), i2.getUTCMonth(), i2.getUTCDate(), 15 - 5, 30)).toISOString(); // 15:00 IST = 09:30 UTC
})();
r = await as("asha", `select public.crm_handoff('L1', $1::timestamptz, 'Wants admissions page') as id`, [slotAt]);
check(!ok(r) && r.code === "42501" && /comes later/.test(r.error), "a member cannot book Mehdi's time yet (phase 2): no calendar to fill, no stage Call", r);
check((await pg(`select count(*)::int as n from public.crm_bookings`))[0].n === 0, "...and nothing was booked", "");
r = await as("asha", `select public.crm_handoff('L1', null, 'Wants admissions page') as id`, [], { commit: true });
check(ok(r) && r.rows[0].id === null, "asha hands L1 to Mehdi with a note (no time)", r);
const l1 = (await pg(`select assigned_to, qualified_by, data->>'status' as s from public.outreach_leads where id = 'L1'`))[0];
check(l1.assigned_to === OWNER && l1.qualified_by === M.asha && l1.s === "replied", "L1 passes to Mehdi at the stage it had; asha keeps the credit", l1);
check((await num("asha", `select count(*) from public.outreach_leads where id = 'L1'`)) === 0, "asha no longer reads L1's contact details...", "");
ov = await as("asha", `select id, status from public.crm_leads_overview()`);
check(ok(ov) && ov.rows.some((x) => x.id === "L1" && x.status === "replied"), "...but follows it in her overview (no contacts)", ov.rows);
check((await num("owner", `select count(*) from public.crm_notifications where kind = 'handoff'`)) === 1, "Mehdi is notified of the hand-over");
/* Mehdi or an admin books the call: one booking per time. */
await as("owner", INS, ["UB", lead("UB", "Booked Call", { phone: "+919840000009", status: "replied" })], { commit: true });
r = await as("ayesha", `select public.crm_handoff('UB', $1::timestamptz, 'Wants a call') as id`, [slotAt], { commit: true });
const ub = (await pg(`select assigned_to, data->>'status' as s from public.outreach_leads where id = 'UB'`))[0];
check(ok(r) && r.rows[0].id !== null && ub.assigned_to === OWNER && ub.s === "call", "an admin books a call with Mehdi for UB: his, at stage Call", [r, ub]);
await as("owner", `select public.crm_assign_leads(array['L6'], $1)`, [M.bilal], { commit: true });
r = await as("owner", `select public.crm_handoff('L6', $1::timestamptz) as id`, [slotAt]);
check(!ok(r) && /taken/.test(r.error), "the same time cannot be booked twice: no double booking", r);
r = await as("bilal", `select * from public.crm_busy_slots()`);
check(ok(r) && r.rows.length === 1 && Object.keys(r.rows[0]).join() === "slot_at,minutes", "bilal sees the busy time, not whose or what", r.rows);
r = await as("bilal", `select public.crm_handoff('L6', $1::timestamptz) as id`, [new Date(Date.parse(slotAt) + 15 * 60e3).toISOString()]);
check(!ok(r) && /comes later/.test(r.error), "bilal cannot book a free time either (members: phase 2)", r);
r = await as("ayesha", `select public.crm_handoff('L6', '2026-10-04T04:30:00Z'::timestamptz) as id`);
check(!ok(r) && /quarter hour/.test(r.error), "a Sunday, a past time or a time off the quarter hour is refused", r);
r = await as("bilal", `select public.crm_handoff('L6', null, 'Wrong number, the school has closed', null, false) as id`, [], { commit: true });
const l6 = (await pg(`select assigned_to, qualified_by, data->>'status' as s from public.outreach_leads where id = 'L6'`))[0];
check(ok(r) && l6.assigned_to === OWNER && l6.qualified_by === null && l6.s === "new",
  "bilal gives L6 back to Mehdi without a booking: no credit, stage unchanged", l6);
check((await num("owner", `select count(*) from public.crm_notifications where kind = 'handoff' and title like '%gave back%'`)) === 1, "Mehdi is told it came back, with the note");
r = await as("bilal", `select public.crm_handoff('L2', null, null, $1) as id`, [M.asha]);
check(!ok(r), "a lead is only ever handed to Mehdi or an admin, never sideways to another intern", r);
r = await as("asha", `select public.crm_ask_owner('L7', 'demo', 'They want to see a school site with an admissions form')`, [], { commit: true });
check(ok(r), "asha asks Mehdi for a demo on L7", r);
check((await num("owner", `select count(*) from public.crm_notifications where kind = 'info' and lead_id = 'L7'`)) === 1, "...Mehdi's bell shows it");
check((await num("asha", `select count(*) from public.outreach_events where lead_id = 'L7' and data->>'topic' = 'demo'`)) === 1, "...and the lead's history keeps it");
r = await as("bilal", `select public.crm_ask_owner('L7', 'question', 'x')`);
check(!ok(r), "bilal cannot write on asha's lead through Ask Mehdi", r);

/* "Waiting on you": a request stays open until Mehdi closes it; linking a demo closes a demo request by itself. */
r = await as("owner", `select id, kind, resolved_at, asked_by from public.crm_requests where lead_id = 'L7'`);
check(ok(r) && r.rows.length === 1 && r.rows[0].kind === "demo" && r.rows[0].resolved_at === null && r.rows[0].asked_by === M.asha,
  "asha's demo request is an open request for Mehdi", r.rows);
await as("owner", `update public.crm_notifications set read_at = now() where read_at is null`, [], { commit: true });
check((await num("owner", `select count(*) from public.crm_requests where resolved_at is null and lead_id = 'L7'`)) === 1,
  "...still open after he marks every notification read");
check((await num("asha", `select count(*) from public.crm_requests`)) === 2, "asha reads her own requests (the hand-over and the demo)");
check((await num("bilal", `select count(*) from public.crm_requests where asked_by = $1`, [M.asha])) === 0, "bilal does not read asha's");
await db.exec(`insert into public.content (collection, doc_id, data) values ('demoSites', 'd7', '{"id":"d7","slug":"asha-found","status":"draft","instituteName":"Asha Found It"}')`);
r = await as("owner", `select public.crm_patch_lead('L7', '{"demoId":"d7","demoSlug":"asha-found"}'::jsonb)`, [], { commit: true });
const l7 = (await pg(`select data->>'nextActionAt' as next from public.outreach_leads where id = 'L7'`))[0];
check(ok(r) && Date.now() - new Date(l7.next).getTime() < 60000, "Mehdi links a demo to asha's lead: it is due now on her list", [r, l7]);
check((await num("asha", `select count(*) from public.crm_notifications where kind = 'demo_ready' and lead_id = 'L7'`)) === 1, "...she is told 'Demo ready'");
check((await num("owner", `select count(*) from public.crm_requests where lead_id = 'L7' and resolved_at is null`)) === 0,
  "...and his open demo request closed by itself");
/* A hand-over Mehdi accepts: the one number about an intern she cannot type in herself. */
const ho = (await pg(`select id from public.crm_requests where lead_id = 'L1' and kind = 'handoff'`))[0];
r = await as("ayesha", `select public.crm_resolve_request($1, 'accepted')`, [ho?.id]);
check(!ok(r), "an admin cannot close a request that went to Mehdi", r);
r = await as("owner", `select public.crm_resolve_request($1, 'no_action')`, [ho?.id]);
check(!ok(r), "a hand-over is 'accepted' or 'not real', not 'no action'", r);
r = await as("owner", `select public.crm_resolve_request($1, 'accepted', 'Real: wants an admissions page')`, [ho?.id], { commit: true });
check(ok(r), "Mehdi marks asha's hand-over accepted", r);
check((await num("asha", `select count(*) from public.crm_notifications where kind = 'resolved' and lead_id = 'L1'`)) === 1, "...she is told");
r = await as("owner", `select handoffs_confirmed from public.crm_activity_stats($1) where member_id = $2`, [from, M.asha]);
check(ok(r) && r.rows[0]?.handoffs_confirmed === 1, "...and it counts as a confirmed hand-over in her numbers", r.rows);
const gb = (await pg(`select kind from public.crm_requests where lead_id = 'L6'`))[0];
check(gb?.kind === "give_back", "bilal's give-back is a request too, for Mehdi to decide", gb);

/* ── 14. Reviews (phase 2) ──────────────────────────────────────────────── */
r = await as("owner", `insert into public.crm_reviews (event_id, member_id, verdict, comment) values ('E9', $1, 'fix', 'Ask for the principal first') returning member_id, reviewer_id, lead_id`, [M.bilal], { commit: true });
check(ok(r) && r.rows[0].member_id === M.asha && r.rows[0].reviewer_id === OWNER, "Mehdi reviews asha's call: the review is about the line's writer, whatever was sent", r);
check((await num("asha", `select count(*) from public.crm_reviews`)) === 1, "asha reads the review of her work");
check((await num("bilal", `select count(*) from public.crm_reviews`)) === 0, "bilal does not");
check((await num("asha", `select count(*) from public.crm_notifications where kind = 'review'`)) === 1, "asha is notified");
r = await as("asha", `insert into public.crm_reviews (event_id, member_id, verdict) values ('E1', $1, 'good') returning id`, [M.asha]);
check(!ok(r), "a member cannot review", r);

/* ── 15. An admin's limits ──────────────────────────────────────────────── */
r = await as("ayesha", `select public.crm_patch_lead('L2', '{"notes":"admin note"}'::jsonb)`, [], { commit: true });
check(ok(r), "an admin edits any lead", r);
r = await as("ayesha", `select public.crm_patch_lead('L2', '{"status":"won"}'::jsonb)`);
check(!ok(r), "an admin cannot mark a lead Won", r);
r = await as("ayesha", `select public.crm_patch_lead('L4', '{"status":"new"}'::jsonb)`);
check(!ok(r), "an admin cannot lift Do not contact", r);
r = await as("ayesha", `delete from public.outreach_leads where id = 'L2' returning id`);
check(ok(r) && r.n === 0, "an admin cannot delete a lead", r);
r = await as("ayesha", `select public.crm_deactivate_member($1)`, [M.chetan]);
check(!ok(r), "an admin cannot switch anyone off", r);
r = await as("owner", `select public.crm_patch_lead('L4', '{"status":"new"}'::jsonb)`);
check(ok(r), "Mehdi can lift Do not contact", r);

/* ── 16. Switching off, and deleting a login ────────────────────────────── */
const chetanOpen = await num("owner", `select count(*) from public.outreach_leads where assigned_to = $1`, [M.chetan]);
r = await as("owner", `select public.crm_deactivate_member($1, $2) as n`, [M.chetan, M.bilal], { commit: true });
check(ok(r) && Number(r.rows[0].n) === chetanOpen, `owner switches chetan off; his ${chetanOpen} open leads move to bilal in the same step`, r);
check((await num("chetan", leadsSeen)) === 0, "chetan sees 0 leads on his very next query (no token expiry wait)");
r = await as("chetan", `insert into public.outreach_events (id, lead_id, data) values ('E20', 'L3', '{"type":"note"}') returning id`);
check(!ok(r), "and cannot write history any more", r);
me = await one("chetan", `select public.crm_me() as me`);
check(me.role === null && me.reason === "deactivated", "crm_me tells him why", me);
r = await as("owner", `select public.crm_assign_leads(array['L3'], $1) as n`, [M.chetan]);
check(!ok(r), "nobody can assign to a switched-off person", r);
r = await as("owner", `select public.crm_reactivate_member($1)`, [M.chetan], { commit: true });
check(ok(r) && (await num("chetan", leadsSeen)) === 0, "switched back on, he starts empty (his leads stayed with bilal)");
await as("owner", INS, ["UX", lead("UX", "Erin In Conversation", { phone: "+919840000003", status: "replied" })], { commit: true });
await as("owner", `select public.crm_assign_leads(array['UX'], $1)`, [M.erin], { commit: true });
const erinLeads = await num("owner", `select count(*) from public.outreach_leads where assigned_to = $1`, [M.erin]);
r = await as("auth_admin", `delete from auth.users where id = $1`, [P.erin.uid], { commit: true });
const erinRow = (await pg(`select user_id, active from public.crm_members where id = $1`, [M.erin]))[0];
const erinNow = await num("owner", `select count(*) from public.outreach_leads where assigned_to = $1`, [M.erin]);
const ux = (await pg(`select assigned_to from public.outreach_leads where id = 'UX'`))[0];
const erinPool = await num("owner", `select count(*) from public.outreach_leads where id in ('U2','U4','U5','U6') and assigned_to is null`);
check(ok(r) && erinRow.user_id === null && erinRow.active === false && erinLeads > 1 && erinNow === 0,
  "deleting erin's login in the dashboard switches her row off and moves all her open leads", [r, erinRow, erinLeads, erinNow]);
check(ux.assigned_to === OWNER && erinPool === 4,
  "...the ones nobody had written to go back to the pool; the one in a conversation (Replied) goes to Mehdi", [ux, erinPool]);
const erinHistory = await num("owner", `select count(*) from public.crm_members where id = $1`, [M.erin]);
check(erinHistory === 1, "her row (and so her name on history) stays", erinHistory);
r = await as("owner", `select public.crm_delete_invite($1)`, [M.farah], { commit: true });
check(ok(r), "an unused invitation can be removed", r);
r = await as("owner", `select public.crm_delete_invite($1)`, [M.asha]);
check(!ok(r), "a person who has signed in cannot be deleted, only switched off", r);

/* ── 17. The audit trail ────────────────────────────────────────────────── */
const audit = (await pg(`select action, lead_id, actor_id, detail from public.crm_audit order by id`));
const acts = audit.map((x) => `${x.action}:${x.lead_id || ""}`);
check(acts.includes("lead.update:L1"), "audit: asha's stage change on L1", acts.slice(-5));
const upd = audit.find((x) => x.action === "lead.update" && x.lead_id === "L1" && JSON.stringify(x.detail).includes("replied"));
check(upd && upd.actor_id === M.asha, "audit: ...signed by asha, with the old and new stage", upd);
check(acts.includes("lead.assign:L3"), "audit: assignments", "");
check(audit.some((x) => x.action === "member.deactivate") && audit.some((x) => x.action === "member.add") && audit.some((x) => x.action === "member.unlink"),
  "audit: people added, switched off and unlinked", audit.filter((x) => x.action.startsWith("member.")).map((x) => x.action));
const emailFill = audit.find((x) => x.lead_id === "L6" && x.detail.email);
check(emailFill && emailFill.detail.email === "(changed)", "audit: a contact change is logged without the value", emailFill);
check(!audit.some((x) => x.action === "member.update" && Object.keys(x.detail).every((k) => k === "last_seen_at")), "audit: 'last seen' ticks are not logged", "");
r = await as("bilal", `select public.crm_log_access('lead.view', 'L2')`, [], { commit: true, headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "Test" } });
const view = (await pg(`select actor_id, detail from public.crm_audit where action = 'lead.view' order by id desc limit 1`))[0];
check(ok(r) && view.actor_id === M.bilal && view.detail.ip === "203.0.113.7", "bilal opening L2 is logged with his IP", view);
r = await as("bilal", `select public.crm_log_access('lead.view', 'L2', jsonb_build_object('x', repeat('a', 5000)))`);
check(!ok(r), "an oversized log line is refused", r);
r = await as("bilal", `select public.crm_log_access('sign_in', null, jsonb_build_object('x', repeat('a', 400)))`);
check(!ok(r) && r.code === "22001", "a member's log detail over 300 bytes is refused (the log cannot fill the database)", r);
r = await as("bilal", `select public.crm_log_access('sign_in', null, jsonb_build_object('x', repeat('a', 200)))`);
check(ok(r), "...one under it is kept", r);
r = await as("owner", `select public.crm_log_access('export', null, jsonb_build_object('x', repeat('a', 1500)))`);
check(ok(r), "Mehdi's own log detail may be longer (2 KB)", r);
r = await as("dev", `select public.crm_log_access('lead.view', 'L2')`);
check(!ok(r), "a non-member cannot write the log", r);
r = await as("asha", `select public.crm_log_access('lead.view', 'L2')`, [], { commit: true });
const forged = (await pg(`select lead_id, detail from public.crm_audit where action = 'lead.view' and actor_id = $1 order by id desc limit 1`, [M.asha]))[0];
check(ok(r) && forged.lead_id === null && forged.detail.flag === "not_visible" && forged.detail.claimedLeadId === "L2",
  "asha 'viewing' bilal's lead is kept as a flagged claim, never as a real view of L2", forged);

/* Team > Access (owner): who opened what, per day, with a flag for days that look like copying. */
r = await as("owner", `select * from public.crm_access_summary(now() - interval '1 day')`);
const ashaDay = (r.rows || []).find((x) => x.member_id === M.asha);
const bilalDay = (r.rows || []).find((x) => x.member_id === M.bilal);
check(ok(r) && ashaDay && ashaDay.flagged_claims === 1 && ashaDay.suspicious === true, "Access: asha's day shows the flagged claim and is marked to look at", ashaDay);
check(bilalDay && bilalDay.lead_views >= 1 && bilalDay.distinct_leads_viewed >= 1, "Access: bilal's lead views are there", bilalDay);
r = await as("asha", `select * from public.crm_access_summary(now() - interval '1 day')`);
check(ok(r) && r.rows.length === 0, "only Mehdi reads the access summary", r.rows);
/* Filling the log is a day to look at: more than 20 sign-ins, or more than 200 logged lines. */
// The window ends a minute ahead: a line written in the same millisecond as the next query is still in it.
const daySummary = async (memberId) => (await as("owner", `select * from public.crm_access_summary(now() - interval '1 day', now() + interval '1 minute')`)).rows?.find((x) => x.member_id === memberId);
for (let i = 0; i < 20; i++) await as("chetan", `select public.crm_log_access('sign_in')`, [], { commit: true });
let chetanDay = await daySummary(M.chetan);
check(chetanDay && chetanDay.sign_ins === 20 && chetanDay.suspicious === false, "20 sign-ins in a day is not flagged", chetanDay);
await as("chetan", `select public.crm_log_access('sign_in')`, [], { commit: true });
chetanDay = await daySummary(M.chetan);
check(chetanDay && chetanDay.sign_ins === 21 && chetanDay.suspicious === true, "...21 is (signing in again and again fills the log)", chetanDay);
await pg(`insert into public.crm_audit (actor_id, action, detail) select $1, 'import', '{}'::jsonb from generate_series(1, 200)`, [M.erin]);
let erinDay = await daySummary(M.erin);
check(erinDay && erinDay.imports >= 200 && erinDay.suspicious === false, "200 logged lines in a day is not flagged by itself", erinDay);
await pg(`insert into public.crm_audit (actor_id, action, detail) values ($1, 'import', '{}'::jsonb)`, [M.erin]);
erinDay = await daySummary(M.erin);
check(erinDay && erinDay.suspicious === true, "...201 is", erinDay);
r = await as("owner", `select * from public.crm_db_usage()`);
check(ok(r) && Number(r.rows[0].database_bytes) > 0 && Number(r.rows[0].crm_bytes) > 0, "Mehdi sees the database size (Free plan: read-only past 500 MB)", r.rows);
r = await as("asha", `select * from public.crm_db_usage()`);
check(ok(r) && r.rows.length === 0, "...a member does not", r.rows);

/* ── 17b. "Reset password" from the Team page: no secret key, no typed e-mail ── */
await db.exec(`update auth.users set encrypted_password = 'unchanged'`);
r = await as("owner", `select public.crm_reset_password($1) as pw`, [M.asha], { commit: true });
const pw = r.rows?.[0]?.pw;
const hashOk = pw && (await pg(`select encrypted_password = extensions.crypt($1, encrypted_password) as ok, encrypted_password like '$2a$10$%' as bf10 from auth.users where id = $2`, [pw, P.asha.uid]))[0];
check(ok(r) && /^[A-Za-z2-9]{14}$/.test(pw) && hashOk?.ok === true && hashOk?.bf10 === true,
  "Mehdi resets asha's password: a 14-character temporary one, stored only as a bcrypt hash (cost 10)", [r, hashOk]);
check((await pg(`select count(*)::int as n from auth.users where encrypted_password <> 'unchanged'`))[0].n === 1, "...and no other login changed");
me = await one("asha", `select public.crm_me() as me`);
check(me.mustChangePassword === true, "...she must set her own at the next sign-in", me);
check((await pg(`select count(*)::int as n from public.crm_audit where action = 'member.password_reset' and member_id = $1`, [M.asha]))[0].n === 1, "...and the audit trail records it");
r = await as("owner", `select public.crm_reset_password($1)`, [OWNER]);
check(!ok(r), "the owner's own password is never reset this way", r);
r = await as("ayesha", `select public.crm_reset_password($1)`, [M.bilal]);
check(!ok(r), "an admin cannot reset passwords", r);
r = await as("asha", `select public.crm_reset_password($1)`, [M.bilal]);
check(!ok(r), "a member cannot either", r);
r = await as("owner", `select public.crm_reset_password($1)`, [M.gita]);
check(!ok(r) && /no login linked/.test(r.error), "a person with no linked login cannot be reset (no typed e-mail ever picks the login)", r);

/* ── 18. The policies run their lookups once per query ──────────────────── */
await db.exec("begin; set local role authenticated");
await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: P.bilal.uid, email: P.bilal.email, role: "authenticated" })]);
const plan = (await db.query(`explain select * from public.outreach_leads`)).rows.map((x) => x["QUERY PLAN"]).join("\n");
await db.exec("rollback");
check(/InitPlan/.test(plan) && !/SubPlan/.test(plan), "EXPLAIN: crm_role() and crm_member_id() are InitPlans (once per query), not per row", plan);

/* ── 19. The SQL-editor version (supabase/tests/crm_team_rls.sql) passes here too ── */
const EDITOR_TEST = first(process.env.CRM_EDITOR_TEST, join(ROOT, "supabase/tests/crm_team_rls.sql"));
if (!EDITOR_TEST) check(false, "the SQL-editor test supabase/tests/crm_team_rls.sql is there to run");
else {
  let res = null, err = null;
  try { res = await db.exec(readFileSync(EDITOR_TEST, "utf8")); } catch (e) { err = e.message; try { await db.exec("rollback"); } catch { /* not in a transaction */ } }
  const said = JSON.stringify(res || []);
  check(!err && said.includes("ALL CRM ACCESS CHECKS PASSED"), "the SQL-editor test (crm_team_rls.sql) passes and rolls back", err || said.slice(-200));
  const left = (await pg(`select count(*)::int as n from public.outreach_leads where id like 'zz_rls_%'`))[0].n
             + (await pg(`select count(*)::int as n from auth.users where email like 'zz-rls-%'`))[0].n;
  check(left === 0, "...and leaves nothing behind", left);
}

console.log(`\n${passes} passed, ${fails.length} failed${NEG ? ` (negative mode: ${NEG}; failures are expected)` : ""}`);
process.exit(fails.length ? 1 : 0);
