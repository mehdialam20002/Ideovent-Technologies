/**
 * Demo and pitch rows: one by its link, never a list (0013, 2 Oct 2026), tested on a
 * real PostgreSQL (PGlite: Postgres in WebAssembly inside Node, the same harness as
 * scripts/test-crm-rls.mjs; no Docker, no password, nothing live).
 *
 *   node scripts/test-rows-rls.mjs                               every check must pass (exit 0)
 *   ROWS_RLS_NEGATIVE=policy   node scripts/test-rows-rls.mjs    0005's read policy put back over 0013's:
 *                                                                the checks must FAIL (exit 1)
 *   ROWS_RLS_NEGATIVE=function node scripts/test-rows-rls.mjs    public_row_by_slug without its status
 *                                                                rule: the checks must FAIL (exit 1)
 *
 * Needs:  npm i -D @electric-sql/pglite   (or PGLITE_FROM=<folder with node_modules/@electric-sql/pglite>)
 * Files:  supabase/SETUP_ALL.sql (read only), supabase/migrations/0005, 0011 and 0013, and
 *         supabase/tests/rows_by_slug_rls.sql, found from the repository root
 *         (ROWS_EDITOR_TEST overrides the last one).
 *
 * HOW. Three databases, each a Supabase-shaped stub (the API roles, auth.uid()/auth.jwt() as
 * Supabase writes them, auth.users, storage) plus the project's REAL SQL:
 *   A  0001-0010  SETUP_ALL.sql up to its 0011 section, the data, then 0013 twice
 *   B  0001-0011  the same, then 0011, a CRM member with two leads, then 0013 twice, 0011 again
 *   C  one paste  the whole SETUP_ALL.sql, as a new project runs it
 * In A and B every person acts the way PostgREST makes them act (SET LOCAL ROLE plus
 * request.jwt.claims, in a transaction) BEFORE 0013 and AFTER it, and the two are compared:
 * what was public stays public, demos and pitch pages stop being a list, and one row by its
 * link still opens. Then the SQL-editor version (rows_by_slug_rls.sql) runs on all three.
 *
 * 0013 runs in two steps (3 Oct 2026): the functions commit and PostgREST is told, then,
 * five seconds later on Supabase, the list closes, so no page is caught between a 404 from
 * the function and an empty table. A checks that step 1 stands when step 2 fails (and that the
 * SQL-editor test then says so); C checks the order in the file and times the wait (none without
 * the API's role, five seconds with it).
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const first = (...paths) => paths.find((p) => p && existsSync(p));
const SETUP_ALL = first(join(ROOT, "supabase/SETUP_ALL.sql"));
const M0005 = first(join(ROOT, "supabase/migrations/0005_harden_admin_and_reads.sql"));
const M0011 = first(join(ROOT, "supabase/migrations/0011_crm_team.sql"));
const M0013 = first(join(ROOT, "supabase/migrations/0013_rows_by_slug.sql"));
const EDITOR = first(process.env.ROWS_EDITOR_TEST, join(ROOT, "supabase/tests/rows_by_slug_rls.sql"));
if (!SETUP_ALL || !M0005 || !M0011 || !M0013) throw new Error("missing SQL: SETUP_ALL.sql, 0005, 0011 or 0013");
const lf = (s) => s.replace(/\r\n/g, "\n");
const SETUP_FULL = lf(readFileSync(SETUP_ALL, "utf8"));
const SQL0011 = readFileSync(M0011, "utf8");
const SQL0013 = readFileSync(M0013, "utf8");

const NEG = process.env.ROWS_RLS_NEGATIVE || "";
if (NEG && !["policy", "function"].includes(NEG)) throw new Error(`ROWS_RLS_NEGATIVE=${NEG}: use policy or function`);

/** PGlite and its pgcrypto (0011's crm_reset_password needs it in schema `extensions`). */
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
const { PGlite, pgcrypto } = await loadPGlite();

const fails = [];
let passes = 0;
let prefix = "";
const check = (cond, msg, got) => {
  const m = `${prefix}${msg}`;
  if (cond) { passes++; console.log("ok    " + m); }
  else { fails.push(m); console.log("FAIL  " + m + (got !== undefined ? "\n        got: " + JSON.stringify(got).slice(0, 400) : "")); }
};

/* ── A Supabase-shaped Postgres (as scripts/test-crm-rls.mjs) ─────────────── */
const STUB = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;
-- A role that is neither: it may run only what PUBLIC may run.
create role zz_nobody nologin noinherit;
grant usage on schema public to anon, authenticated, service_role, zz_nobody;
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

/* The database as it was BEFORE 0011 (0001-0010): SETUP_ALL.sql cut at its 0011 header. */
const CUT0011 = SETUP_FULL.search(/^-- ┌[─ ]*0011_crm_team\.sql/m);
const CUT0013 = SETUP_FULL.search(/^-- ┌[─ ]*0013_rows_by_slug\.sql/m);
if (CUT0011 < 0) throw new Error("SETUP_ALL.sql has no 0011 section to cut at");
const BEFORE_0011 = SETUP_FULL.slice(0, CUT0011);

/* The negative modes, applied right after 0013. */
// 0005's "read public content", exactly as 0005 wrote it: a list of every sent demo and live pitch page.
const POLICY_0005 = (() => {
  const m = lf(readFileSync(M0005, "utf8")).match(/drop policy if exists "read public content" on public\.content;\ncreate policy "read public content"[\s\S]*?\n  \);\n/);
  if (!m) throw new Error("0005's read policy was not found in the migration file");
  return m[0];
})();
const FUNCTION_NO_STATUS = `
create or replace function public.public_row_by_slug(p_collection text, p_slug text)
returns table (collection text, doc_id text, data jsonb)
language sql stable security definer set search_path = '' as $$
  select c.collection, c.doc_id, c.data from public.content c
   where p_collection in ('demoSites', 'pitchPages') and c.collection = p_collection
     and char_length(btrim(p_slug)) between 1 and 120
     and lower(btrim(c.data ->> 'slug')) = lower(btrim(p_slug))
   order by c.updated_at desc, c.doc_id limit 1
$$;`;
const NEGATIVE_SQL = { policy: POLICY_0005, function: FUNCTION_NO_STATUS }[NEG] || "";

const OWNER_EMAIL = "mehdialam2002@gmail.com"; // seeded into public.admins by 0005
const ROW_COLS = new Set(["demoSites", "pitchPages"]);
const SLUG120 = `${"a".repeat(60)}-${"b".repeat(59)}`;
const SLUG121 = `${SLUG120}c`;

/** Fictional rows in every collection the site has, plus one no list names. */
function fixtures() {
  const R = [];
  const add = (collection, doc_id, data, ageDays = 0) => R.push({ collection, doc_id, data: { id: doc_id, ...data }, ageDays });
  // The two slug-addressed collections.
  add("demoSites", "d-sent", { slug: "riverbend-public-school", status: "sent", instituteName: "Riverbend Public School", phone: "+910000000001", email: "office@riverbend.example", city: "Example City" });
  add("demoSites", "d-draft", { slug: "draft-academy", status: "draft", instituteName: "Draft Academy" });
  add("demoSites", "d-closed", { slug: "closed-classes", status: "closed", instituteName: "Closed Classes" });
  add("demoSites", "d-expired", { slug: "expired-status-school", status: "expired", instituteName: "Expired Status School" });
  add("demoSites", "d-free", { slug: "free-slot", status: "free" });
  add("demoSites", "d-live", { slug: "legacy-live-demo", status: "live", instituteName: "A demo marked live" });
  add("demoSites", "d-past", { slug: "past-date-school", status: "sent", expiresAt: "2020-01-01", instituteName: "Past Date School" });
  add("demoSites", "d-long", { slug: SLUG120, status: "sent" });
  add("demoSites", "d-long121", { slug: SLUG121, status: "sent" });
  add("demoSites", "d-twin-old", { slug: "twin-school", status: "sent", instituteName: "Twin (older)" }, 5);
  add("demoSites", "d-twin-new", { slug: "twin-school", status: "sent", instituteName: "Twin (newer)" }, 1);
  add("demoSites", "d-spaced", { slug: "  Spaced-Slug  ", status: "sent" });
  add("pitchPages", "p-live", { slug: "lakeside-academy", status: "live", instituteName: "Lakeside Academy" });
  add("pitchPages", "p-draft", { slug: "draft-pitch", status: "draft" });
  add("pitchPages", "p-archived", { slug: "archived-pitch", status: "archived" });
  add("pitchPages", "p-sent", { slug: "sent-pitch", status: "sent" });
  // Private collections; three carry a demo's slug, which must not make them reachable.
  add("submissions", "s1", { name: "A visitor", slug: "riverbend-public-school" });
  add("applications", "a1", { name: "An applicant" });
  add("certificateGrades", "g1", { slug: "riverbend-public-school", grade: 9 });
  add("pitchPageNotes", "n1", { note: "internal" });
  add("demoSiteSlots", "d-sent", { sentTo: "Mrs Example", slug: "riverbend-public-school" });
  add("demoSiteOpens", "o-sent", { demoId: "d-sent", at: "2026-10-01T10:00:00.000Z" });
  add("demoSiteOpens", "o-draft", { demoId: "d-draft", at: "2026-10-01T11:00:00.000Z" });
  // Every public key a page reads (src/lib/cms/scope.ts PUBLIC_KEYS), and one collection no list names.
  for (const k of ["settings", "contact", "navigation", "home", "internship", "eduflow", "legal"]) add(k, "_", { note: `${k} singleton` });
  for (const k of ["socials", "services", "testimonials", "projects", "team", "milestones", "process", "faqs", "stats", "clients", "certificates"]) add(k, `${k}-1`, { title: k });
  add("posts", "post-1", { slug: "riverbend-public-school", title: "A post that shares a demo's slug", status: "published" });
  add("pages", "page-1", { title: "A collection no policy names" });
  return R;
}

/** One database: the stub, then `sql` (0001-0010, or the whole paste). */
async function makeDb(sql) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(STUB);
  await db.exec(sql);
  const people = {};
  for (const [k, email] of [["owner", OWNER_EMAIL], ["dev", "dev@example.org"], ["asha", "asha@example.org"]]) {
    const r = await db.query(`insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id`, [email]);
    people[k] = { uid: r.rows[0].id, email };
  }
  /** One statement as a person, the way PostgREST runs it. Rolled back unless commit; `before` runs first, as postgres. */
  async function as(who, text, params = [], { commit = false, before } = {}) {
    await db.exec("begin");
    try {
      if (before) await db.exec(before);
      if (who === "anon") {
        await db.exec("set local role anon");
        await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "anon" })]);
      } else if (who !== "postgres") {
        const p = people[who];
        await db.exec("set local role authenticated");
        await db.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: p.uid, email: p.email, role: "authenticated", aud: "authenticated" }),
        ]);
      }
      const r = await db.query(text, params);
      await db.exec(commit ? "commit" : "rollback");
      return { rows: r.rows, n: r.affectedRows ?? r.rows.length };
    } catch (e) {
      await db.exec("rollback");
      return { error: e.message, code: e.code };
    }
  }
  const pg = async (text, params) => (await db.query(text, params)).rows;
  return { db, as, pg, people };
}

const ok = (r) => !r.error;
const visibleSet = async (S, who) => {
  const r = await S.as(who, `select collection, doc_id from public.content order by collection, doc_id`);
  return r.error ? r : r.rows.map((x) => `${x.collection}:${x.doc_id}`);
};
const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const byRow = (a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1;
const rowsOf = async (S, who, text) => {
  const r = await S.as(who, text);
  return r.error ? `ERR ${r.code}: ${r.error}` : r.rows.map((x) => JSON.parse(JSON.stringify(x))).sort(byRow);
};
const rpc = (S, who, col, slug) => S.as(who, `select collection, doc_id, data from public.public_row_by_slug($1, $2)`, [col, slug]);
const hasRows = async (S, who, col, before) => {
  const r = await S.as(who, `select public.public_has_rows($1) as v`, [col], { before });
  return r.error ? `ERR ${r.code}: ${r.error}` : r.rows[0].v;
};

/* The lists a visitor could ask for, with and without filters. */
const LISTS = [
  ["the whole table, no filter", `select collection from public.content`],
  ["collection = demoSites", `select collection from public.content where collection = 'demoSites'`],
  ["collection = pitchPages", `select collection from public.content where collection = 'pitchPages'`],
  ["both collections", `select collection from public.content where collection in ('demoSites', 'pitchPages')`],
  ["a sent demo by its slug", `select collection from public.content where collection = 'demoSites' and data ->> 'slug' = 'riverbend-public-school'`],
  ["a live pitch page by its slug, ilike as the old site asked", `select collection from public.content where collection = 'pitchPages' and data ->> 'slug' ilike 'lakeside-academy'`],
  ["status sent or live", `select collection from public.content where data ->> 'status' in ('sent', 'live')`],
  ["any row with a slug", `select collection from public.content where data ? 'slug'`],
  ["the old one-request form (three keys, or the demo's row)", `select collection from public.content where collection in ('contact', 'settings', 'socials') or (collection = 'demoSites' and data ->> 'slug' ilike 'riverbend-public-school')`],
];

/* One row by its link: [collection, slug as typed, the row it must be]. */
const BY_LINK = [
  ["demoSites", "riverbend-public-school", "d-sent", "a sent demo"],
  ["demoSites", "RIVERBEND-Public-School", "d-sent", "a sent demo, any case"],
  ["demoSites", "  riverbend-public-school  ", "d-sent", "a sent demo, spaces around the slug"],
  ["pitchPages", "lakeside-academy", "p-live", "a live pitch page"],
  ["pitchPages", "  LAKESIDE-Academy ", "p-live", "a live pitch page, any case and spaces around"],
  ["demoSites", "spaced-slug", "d-spaced", "a demo whose stored slug has capitals and spaces (compared as the site compares)"],
  ["demoSites", "past-date-school", "d-past", "a sent demo past its expiry date (the page shows the expired card, as today)"],
  ["demoSites", SLUG120, "d-long", "a 120-character slug (the longest allowed)"],
  ["demoSites", `  ${SLUG120}  `, "d-long", "a 120-character slug with spaces around (measured after trimming)"],
  ["demoSites", "twin-school", "d-twin-new", "two sent demos with one slug: exactly one row, the newer"],
];

/* Nothing: [collection, slug, what it is]. */
const NOTHING = [
  ["demoSites", "draft-academy", "a draft demo"],
  ["demoSites", "closed-classes", "a closed demo"],
  ["demoSites", "expired-status-school", "a demo whose status is expired"],
  ["demoSites", "free-slot", "a free slot"],
  ["demoSites", "legacy-live-demo", "a demo marked live (a pitch page's word; 0005 never served it either)"],
  ["pitchPages", "draft-pitch", "a draft pitch page"],
  ["pitchPages", "archived-pitch", "an archived pitch page"],
  ["pitchPages", "sent-pitch", "a pitch page marked sent (a demo's word)"],
  ["demoSites", "no-such-school", "an unknown slug"],
  ["demoSites", "", "an empty slug"],
  ["demoSites", "   ", "a slug of spaces"],
  ["demoSites", null, "no slug at all (null)"],
  ["demoSites", "x".repeat(500), "a 500-character slug"],
  ["demoSites", SLUG121, "a 121-character slug, even though a sent demo has it"],
  ["demoSites", "lakeside-academy", "a live pitch page's slug asked for as a demo"],
  ["pitchPages", "riverbend-public-school", "a sent demo's slug asked for as a pitch page"],
  ["submissions", "riverbend-public-school", "submissions (a contact message carries that slug)"],
  ["demoSiteOpens", "riverbend-public-school", "demoSiteOpens"],
  ["certificateGrades", "riverbend-public-school", "certificateGrades (a grade carries that slug)"],
  ["demoSiteSlots", "riverbend-public-school", "demoSiteSlots (the private slot carries that slug)"],
  ["posts", "riverbend-public-school", "posts (public, and a post has that slug: still not this function's)"],
  ["DemoSites", "riverbend-public-school", "the collection's name in another case"],
  [null, "riverbend-public-school", "no collection at all (null)"],
  ["demoSites", "riverbend%", "a LIKE wildcard (%)"],
  ["demoSites", "%", "a lone %"],
  ["demoSites", "_iverbend-public-school", "a LIKE wildcard (_)"],
  ["demoSites", "riverbend-public-school' or '1'='1", "a quote trying to widen the filter"],
];

/** What a visitor, a plain login and a member may do once 0013 is in. */
async function personChecks(S, who, label, before) {
  const after = await visibleSet(S, who);
  const expected = Array.isArray(before) ? before.filter((x) => !ROW_COLS.has(x.split(":")[0])) : null;
  check(sameSet(after, expected), `${label}: every row it read before 0013 it still reads, minus the demos and pitch pages`, { after, expected });
  check(Array.isArray(before) && before.some((x) => x.startsWith("demoSites:")) && before.some((x) => x.startsWith("pitchPages:")),
    `${label}: (before 0013 it COULD list the sent demos and live pitch pages: the hole)`, before);
  for (const [what, text] of LISTS) {
    const r = await S.as(who, text);
    const n = r.error ? -1 : r.rows.filter((x) => ROW_COLS.has(x.collection)).length;
    check(n === 0, `${label} lists 0 demos and 0 pitch pages: ${what}`, r.error || n);
  }
  for (const [col, slug, id, what] of BY_LINK) {
    const r = await rpc(S, who, col, slug);
    check(ok(r) && r.rows.length === 1 && r.rows[0].doc_id === id && r.rows[0].collection === col && r.rows[0].data?.id === id,
      `${label} opens one row by its link: ${what}`, r.error || r.rows.map((x) => x.doc_id));
  }
  for (const [col, slug, what] of NOTHING) {
    const r = await rpc(S, who, col, slug);
    check(ok(r) && r.rows.length === 0, `${label} gets nothing for ${what}`, r.error || r.rows.map((x) => x.doc_id));
  }
  for (const [col, want] of [["demoSites", true], ["pitchPages", true], ["submissions", false], ["posts", false], ["demoSiteOpens", false], [null, false]]) {
    const v = await hasRows(S, who, col);
    check(v === want, `${label}: public_has_rows(${col}) is ${want}`, v);
  }
  const none = `update public.content set data = data || '{"status":"draft"}' where collection in ('demoSites', 'pitchPages');`;
  check((await hasRows(S, who, "demoSites", none)) === false && (await hasRows(S, who, "pitchPages", none)) === false,
    `${label}: public_has_rows is false once nothing is sent or live`);
}

async function structuralChecks(S) {
  const fns = await S.pg(`select p.proname, p.prosecdef, p.provolatile, p.proconfig, pg_get_function_result(p.oid) as result
                            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                           where n.nspname = 'public' and p.proname in ('public_row_by_slug', 'public_has_rows') order by p.proname`);
  check(fns.length === 2 && fns.every((f) => f.prosecdef && f.provolatile === "s" && /^search_path=("")?$/.test((f.proconfig || []).join())),
    "both functions are STABLE (so PostgREST serves a GET), SECURITY DEFINER, search_path empty", fns);
  check(fns.find((f) => f.proname === "public_row_by_slug")?.result === "TABLE(collection text, doc_id text, data jsonb)"
    && fns.find((f) => f.proname === "public_has_rows")?.result === "boolean", "they return (collection, doc_id, data) rows and a boolean", fns.map((f) => f.result));
  const priv = (await S.pg(`select
      has_function_privilege('anon', 'public.public_row_by_slug(text, text)', 'execute') as anon_row,
      has_function_privilege('authenticated', 'public.public_row_by_slug(text, text)', 'execute') as auth_row,
      has_function_privilege('anon', 'public.public_has_rows(text)', 'execute') as anon_has,
      has_function_privilege('authenticated', 'public.public_has_rows(text)', 'execute') as auth_has,
      has_function_privilege('public', 'public.public_row_by_slug(text, text)', 'execute') as public_row,
      has_function_privilege('public', 'public.public_has_rows(text)', 'execute') as public_has,
      has_function_privilege('zz_nobody', 'public.public_row_by_slug(text, text)', 'execute') as nobody_row`))[0];
  check(priv.anon_row && priv.auth_row && priv.anon_has && priv.auth_has, "anon and authenticated may run both", priv);
  check(!priv.public_row && !priv.public_has && !priv.nobody_row, "PUBLIC may not (revoked): a role that is neither cannot run them", priv);
  const pols = await S.pg(`select policyname, cmd, roles::text as roles, qual from pg_policies where schemaname = 'public' and tablename = 'content' and cmd = 'SELECT' order by policyname`);
  const pub = pols.find((p) => p.policyname === "read public content");
  check(pub && /demoSites/.test(pub.qual) && /pitchPages/.test(pub.qual) && !/status/.test(pub.qual) && pols.filter((p) => p.policyname === "read public content").length === 1,
    `"read public content" names demoSites and pitchPages and no longer asks their status`, pub);
  check(pols.some((p) => p.policyname === "read all admin" && /is_admin/.test(p.qual)) && pols.length === 2, `"read all admin" (0005) is untouched and nothing else reads`, pols.map((p) => p.policyname));
  const fn = (await S.pg(`select p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'public_row_by_slug'`))[0]?.prosrc || "";
  check(/'sent'/.test(fn) && /'live'/.test(fn) && /120/.test(fn) && /limit 1/i.test(fn), "public_row_by_slug carries the status rule, the 120-character rule and LIMIT 1", fn.slice(0, 200));
}

async function seed(S) {
  for (const r of fixtures()) {
    await S.db.query(`insert into public.content (collection, doc_id, data, updated_at) values ($1, $2, $3::jsonb, now() - make_interval(days => $4))`,
      [r.collection, r.doc_id, JSON.stringify(r.data), r.ageDays]);
  }
}

async function editorTest(S) {
  if (!EDITOR) return check(false, "the SQL-editor test supabase/tests/rows_by_slug_rls.sql is there to run");
  let res = null, err = null;
  try { res = await S.db.exec(readFileSync(EDITOR, "utf8")); } catch (e) { err = e.message; try { await S.db.exec("rollback"); } catch { /* not in a transaction */ } }
  const said = JSON.stringify(res || []);
  check(!err && said.includes("ALL ROW ACCESS CHECKS PASSED"), "the SQL-editor test (rows_by_slug_rls.sql) passes and rolls back", err || said.slice(-200));
  const left = (await S.pg(`select count(*)::int as n from public.content where doc_id like 'zz_rows_%'`))[0].n
             + (await S.pg(`select count(*)::int as n from auth.users where email like 'zz-rows-%'`))[0].n;
  check(left === 0, "...and leaves nothing behind", left);
}

async function apply0013(S, label) {
  let err = null;
  try { await S.db.exec(SQL0013); await S.db.exec(SQL0013); } catch (e) { err = e.message; }
  check(!err, `0013 applies on ${label}, and applies again (re-runnable)`, err);
  if (NEGATIVE_SQL) await S.db.exec(NEGATIVE_SQL);
  return !err;
}

/* ── A. 0001-0010, then 0013 ─────────────────────────────────────────────── */
prefix = "[A 0001-0010] ";
console.log("\nA. a database with 0001 to 0010 only (no 0011, no 0012)");
{
  const S = await makeDb(BEFORE_0011);
  await seed(S);
  const before = { anon: await visibleSet(S, "anon"), dev: await visibleSet(S, "dev") };
  const noFn = await rpc(S, "anon", "demoSites", "riverbend-public-school");
  check(!ok(noFn) && noFn.code === "42883", "before 0013 the function does not exist (PostgREST answers 404 PGRST202; the site falls back)", noFn);
  {
    // Step 2 (the closed list) made to fail: step 1 (the functions) must stay, and nothing else change.
    const broken = lf(SQL0013).replace(`drop policy if exists "read public content" on public.content;`, "select 1 / 0;");
    let err = null;
    try { await S.db.exec(broken); } catch (e) { err = e.message; }
    try { await S.db.exec("rollback"); } catch { /* not in a transaction */ }
    const fnIn = (await S.pg(`select to_regprocedure('public.public_row_by_slug(text, text)') is not null
                                 and to_regprocedure('public.public_has_rows(text)') is not null as v`))[0].v;
    const still = await visibleSet(S, "anon");
    const one = await rpc(S, "anon", "demoSites", "riverbend-public-school");
    check(broken !== lf(SQL0013) && /division by zero/.test(err || "") && fnIn === true && sameSet(still, before.anon) && ok(one) && one.rows.length === 1,
      "0013 step 1 stands when step 2 fails: the functions are in and answer, and a visitor reads exactly what it did before",
      { err, fnIn, still: Array.isArray(still) ? still.length : still, before: before.anon.length, one: one.error || one.rows.length });
    // In that state the SQL-editor test must stop at its first block and say what to do, not pass.
    let said = null;
    if (EDITOR) {
      try { await S.db.exec(readFileSync(EDITOR, "utf8")); } catch (e) { said = e.message; }
      try { await S.db.exec("rollback"); } catch { /* not in a transaction */ }
    }
    check(/0013 stopped before its step 2[\s\S]*Run 0013 again/.test(said || ""), "...and the SQL-editor test then fails, saying 0013 stopped before its step 2 and to run it again", said);
  }
  if (await apply0013(S, "0001-0010")) {
    await structuralChecks(S);
    await personChecks(S, "anon", "a visitor (anon)", before.anon);
    await personChecks(S, "dev", "a plain login (not the admin, not in the team)", before.dev);
    const all = (await S.pg(`select count(*)::int as n from public.content`))[0].n;
    const owner = await S.as("owner", `select count(*)::int as n, count(*) filter (where data ->> 'status' = 'draft')::int as drafts from public.content`);
    check(ok(owner) && owner.rows[0].n === all && owner.rows[0].drafts >= 2, `the owner still reads every row (${all}), drafts included`, owner.rows || owner.error);
    let r = await S.as("anon", `insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'ox-sent', '{"id":"ox-sent","demoId":"d-sent"}')`, [], { commit: true });
    check(ok(r) && (await S.pg(`select count(*)::int as n from public.content where doc_id = 'ox-sent'`))[0].n === 1, "a visitor's demo open still goes in (opens.ts: insert only, never a read)", r);
    await editorTest(S);
  }
  await S.db.close();
}

/* ── B. 0001-0011, a CRM team, then 0013 ─────────────────────────────────── */
prefix = "[B 0001-0011] ";
console.log("\nB. a database with 0001 to 0011 (the CRM team), no 0012");
{
  const S = await makeDb(BEFORE_0011);
  await seed(S);
  // Supabase grants new tables to nobody from 30 Oct 2026; 0011 grants what it needs itself (as test-crm-rls.mjs).
  await S.db.exec(`alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
                   alter default privileges in schema public revoke all on sequences from anon, authenticated, service_role;`);
  let err = null;
  try { await S.db.exec(SQL0011); } catch (e) { err = e.message; }
  check(!err, "0011 applies (the CRM team, as it will be live)", err);
  const add = await S.as("owner", `select public.crm_save_member(p_email => $1, p_display_name => 'Asha', p_role => 'member') as id`, [S.people.asha.email], { commit: true });
  check(ok(add), "the owner adds asha to the team (her login is linked at once)", add);
  const ASHA = add.rows?.[0]?.id;
  await S.db.query(`insert into public.outreach_leads (id, data, assigned_to) values
    ('L1', '{"id":"L1","instituteName":"Draft Academy","kind":"school","status":"contacted","demoId":"d-draft"}', $1),
    ('L2', '{"id":"L2","instituteName":"Riverbend Public School","kind":"school","status":"contacted","demoSlug":"riverbend-public-school"}', $1),
    ('L3', '{"id":"L3","instituteName":"Closed Classes","kind":"coaching","status":"new","demoId":"d-closed"}', null)`, [ASHA]);
  const before = { anon: await visibleSet(S, "anon"), dev: await visibleSet(S, "dev"), asha: await visibleSet(S, "asha") };
  const DEMOS = `select demo_id, data from public.crm_lead_demos()`;
  const OPENS = `select open_id, demo_id, opened_at from public.crm_demo_opens()`;
  const crmBefore = { ashaDemos: await rowsOf(S, "asha", DEMOS), ashaOpens: await rowsOf(S, "asha", OPENS), ownerDemos: await rowsOf(S, "owner", DEMOS), ownerOpens: await rowsOf(S, "owner", OPENS) };
  check(Array.isArray(crmBefore.ashaDemos) && sameSet(crmBefore.ashaDemos.map((x) => x.demo_id).sort(), ["d-draft", "d-sent"]),
    "(before 0013: crm_lead_demos gives asha her two leads' demos, the draft one included)", crmBefore.ashaDemos);
  if (await apply0013(S, "0001-0011")) {
    await structuralChecks(S);
    await personChecks(S, "anon", "a visitor (anon)", before.anon);
    await personChecks(S, "dev", "a plain login (not the admin, not in the team)", before.dev);
    await personChecks(S, "asha", "a CRM member (asha)", before.asha);
    const all = (await S.pg(`select count(*)::int as n from public.content`))[0].n;
    const owner = await S.as("owner", `select count(*)::int as n, count(*) filter (where data ->> 'status' = 'draft')::int as drafts from public.content`);
    check(ok(owner) && owner.rows[0].n === all && owner.rows[0].drafts >= 2, `the owner still reads every row (${all}), drafts included`, owner.rows || owner.error);
    const crmAfter = { ashaDemos: await rowsOf(S, "asha", DEMOS), ashaOpens: await rowsOf(S, "asha", OPENS), ownerDemos: await rowsOf(S, "owner", DEMOS), ownerOpens: await rowsOf(S, "owner", OPENS) };
    for (const [k, what] of [["ashaDemos", "crm_lead_demos() for asha"], ["ashaOpens", "crm_demo_opens() for asha"], ["ownerDemos", "crm_lead_demos() for the owner"], ["ownerOpens", "crm_demo_opens() for the owner"]]) {
      check(JSON.stringify(crmAfter[k]) === JSON.stringify(crmBefore[k]) && Array.isArray(crmAfter[k]) && crmAfter[k].length > 0,
        `${what} returns exactly what it did before 0013`, { before: crmBefore[k], after: crmAfter[k] });
    }
    let r = await S.as("anon", `insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'ox-sent', '{"id":"ox-sent","demoId":"d-sent"}')`, [], { commit: true });
    const sent = (await S.pg(`select data from public.content where doc_id = 'ox-sent'`))[0];
    check(ok(r) && sent && sent.data.demoId === "d-sent" && sent.data.at, "a visitor's open of a SENT demo is accepted by 0011's guard (it reads the demo as its owner)", [r, sent]);
    r = await S.as("anon", `insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'ox-draft', '{"id":"ox-draft","demoId":"d-draft"}')`, [], { commit: true });
    check(ok(r) && (await S.pg(`select count(*)::int as n from public.content where doc_id = 'ox-draft'`))[0].n === 0, "...and an open of a DRAFT demo is still dropped quietly", r);
    err = null;
    try { await S.db.exec(SQL0011); } catch (e) { err = e.message; }
    const relisted = await S.as("anon", `select count(*)::int as n from public.content where collection in ('demoSites', 'pitchPages')`);
    check(!err && ok(relisted) && relisted.rows[0].n === 0, "running 0011 again after 0013 keeps demos and pitch pages off the list", err || relisted.rows);
    await editorTest(S);
  }
  await S.db.close();
}

/* ── C. A new project: the whole SETUP_ALL.sql in one paste ──────────────── */
prefix = "[C one paste] ";
console.log("\nC. a new project: all of SETUP_ALL.sql in one paste");
{
  check(CUT0013 > CUT0011 && SETUP_FULL.includes(lf(SQL0013).trim()), "SETUP_ALL.sql carries 0013 exactly as the migration file, after 0011",
    CUT0013 < 0 ? "no 0013 section" : CUT0013 < CUT0011 ? "0013 before 0011" : "a different 0013 text");
  check(SETUP_FULL.indexOf("0005_harden_admin_and_reads.sql") < CUT0013 && /^-- It is migrations 0001 to [^\n]*\b0013\b/m.test(SETUP_FULL),
    "...after 0005 (which it overrides), and its header says so", SETUP_FULL.slice(0, 400));
  const code = lf(SQL0013).replace(/--[^\n]*/g, "");
  check(!/\bcrm_|\bmeta_|\bprivate\./.test(code), "0013 uses nothing from 0011 or 0012 (no crm_, meta_ or private. object)", code.match(/\bcrm_\w+|\bmeta_\w+|\bprivate\.\w+/g));
  check(!/\bexecute\b/i.test(code.replace(/grant execute/gi, "")), "0013 runs no dynamic SQL");
  // Two steps: the functions commit (with PostgREST told) before the wait, the list closes after it.
  const order = [
    /^begin;/m,
    /create or replace function public\.public_row_by_slug\(/,
    /create or replace function public\.public_has_rows\(/,
    /grant execute on function public\.public_has_rows\(text\) to anon, authenticated;/,
    /^notify pgrst, 'reload schema';\ncommit;/m,
    /^select pg_sleep\(5\)\n where exists \(select 1 from pg_catalog\.pg_roles where rolname = 'authenticator'\);/m,
    /^begin;\n+drop policy if exists "read public content" on public\.content;\ncreate policy "read public content"/m,
  ].map((re) => code.search(re));
  const ends = (code.match(/^(begin|commit);$/gm) || []).join(" ");
  check(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])) && ends === "begin; commit; begin; commit;" && /\);\n+commit;\n*$/.test(code.trimEnd() + "\n"),
    "0013 runs in two steps: the functions commit and PostgREST is told, then the wait, then the list closes in its own transaction",
    { order, ends });
  // The site and the policy are written from one list (src/lib/cms/types.ts says so): 0013's must be it, plus the two.
  const tsPrivate = ((lf(readFileSync(join(ROOT, "src/lib/cms/types.ts"), "utf8"))
    .match(/export const PRIVATE_COLLECTIONS\b[^=]*=\s*\[([\s\S]*?)\]/) || [])[1] || "").match(/"[^"]+"/g)?.map((s) => s.slice(1, -1)) || [];
  const sqlPrivate = ((code.match(/create policy "read public content"[\s\S]*?collection not in \(([\s\S]*?)\)/) || [])[1] || "")
    .match(/'[^']+'/g)?.map((s) => s.slice(1, -1)) || [];
  check(tsPrivate.length >= 6 && sameSet([...sqlPrivate].sort(), [...tsPrivate, ...ROW_COLS].sort()),
    "0013's policy keeps out exactly PRIVATE_COLLECTIONS (src/lib/cms/types.ts) plus demoSites and pitchPages", { tsPrivate, sqlPrivate });
  let S = null, err = null;
  try { S = await makeDb(SETUP_FULL); } catch (e) { err = e.message; }
  check(!err, "the whole SETUP_ALL.sql runs on a new database", err);
  if (S) {
    // The wait between the two steps: none without an API, five seconds where PostgREST logs in (authenticator).
    let t = Date.now();
    try { await S.db.exec(SQL0013); } catch (e) { err = e.message; }
    const quick = Date.now() - t;
    await S.db.exec("create role authenticator nologin noinherit");
    t = Date.now();
    try { await S.db.exec(SQL0013); } catch (e) { err = err || e.message; }
    const slow = Date.now() - t;
    await S.db.exec("drop role authenticator");
    check(!err && quick < 4000, `with no API on the database (no authenticator role), 0013 does not wait (${quick} ms)`, { err, quick });
    check(!err && slow >= 5000 && slow - quick >= 4500, `on Supabase (its API's role, authenticator, exists), 0013 waits five seconds between its two steps (${slow} ms)`, { quick, slow });
    if (NEGATIVE_SQL) await S.db.exec(NEGATIVE_SQL);
    await structuralChecks(S);
    await S.db.query(`insert into public.content (collection, doc_id, data) values ('demoSites', 'd1', '{"id":"d1","slug":"new-project-demo","status":"sent"}')`);
    const listed = await S.as("anon", `select count(*)::int as n from public.content where collection = 'demoSites'`);
    const one = await rpc(S, "anon", "demoSites", "New-Project-Demo");
    check(ok(listed) && listed.rows[0].n === 0 && ok(one) && one.rows.length === 1, "on a new project a visitor lists no demo and opens one by its link", [listed.rows, one.rows?.length]);
    await editorTest(S);
    await S.db.close();
  }
}

prefix = "";
console.log(`\n${passes} passed, ${fails.length} failed${NEG ? ` (negative mode: ${NEG}; failures are expected)` : ""}`);
process.exit(fails.length ? 1 : 0);
