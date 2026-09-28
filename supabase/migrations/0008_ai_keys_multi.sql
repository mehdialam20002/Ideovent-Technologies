-- ════════════════════════════════════════════════════════════════════════════
-- 0008: more than one AI key per provider, tried one after another.
-- Written 28 September 2026. Needs 0006 (the two AI tables). Safe to run more
-- than once, and safe to run ON ITS OWN on the live project that already has
-- 0006 with saved keys: paste only this file into Supabase > SQL Editor > Run.
-- ════════════════════════════════════════════════════════════════════════════
--
-- WHAT CHANGES
-- 0006 made the provider the primary key, so Gemini could hold one key. Mehdi
-- asked for several per provider. Now every key is its own row with its own id:
--
--   provider_priority  the provider's place in the order (Gemini first...).
--                      Every key of one provider carries the same number; the
--                      admin page writes them together.
--   priority           the key's place INSIDE its provider (Key 1, Key 2...).
--   label              a name the admin sees, "Key 1" by default.
--
-- /api/poster walks providers in provider_priority order and, inside each,
-- keys in priority order. A key that hits its limit is parked until tomorrow
-- BY ITS OWN ID, so the provider's next key is tried, and when every key of a
-- provider is parked the next provider takes over.
--
-- EXISTING ROWS
-- Each keeps its key, model, switch and last error, gets an id, and its old
-- `priority` (which was the provider order) moves to provider_priority. The
-- key becomes "Key 1" of its provider. Nothing is lost if this runs twice:
-- every step only touches rows it has not touched before.
--
-- THE BROWSER NEVER GETS A WHOLE KEY
-- The admin page lists keys through the view ai_provider_keys_masked, which
-- shows the last four characters and nothing more. It is security_invoker, so
-- the RLS below still decides who sees a row: only an admin. Saving and
-- replacing a key still write the table directly, also admin-only.
--
-- A NOTE ON TERMS
-- Several keys from one account (for separate projects, or a spare after a
-- rotation) are normal. Several ACCOUNTS made to multiply a free limit can
-- break a provider's terms and get those accounts suspended. The admin page
-- says so in one line; the database does not police it.
-- ════════════════════════════════════════════════════════════════════════════

-- ── New columns ─────────────────────────────────────────────────────────────
alter table public.ai_provider_keys add column if not exists id uuid default gen_random_uuid();
alter table public.ai_provider_keys add column if not exists label text;
alter table public.ai_provider_keys add column if not exists provider_priority int;
alter table public.ai_provider_keys add column if not exists created_at timestamptz default now();

-- Rows from 0006 have no id yet (add column with a volatile default fills
-- them on most versions, but do not rely on it).
update public.ai_provider_keys set id = gen_random_uuid() where id is null;
alter table public.ai_provider_keys alter column id set not null;

-- The old `priority` WAS the provider order. Move it once: only rows whose
-- provider_priority is still empty, so a second run changes nothing.
update public.ai_provider_keys
   set provider_priority = priority,
       priority = 10
 where provider_priority is null;
alter table public.ai_provider_keys alter column provider_priority set default 100;
alter table public.ai_provider_keys alter column provider_priority set not null;

update public.ai_provider_keys set label = 'Key 1' where label is null or btrim(label) = '';

-- ── The primary key moves from provider to id ───────────────────────────────
do $$
declare
  pk_name text;
  pk_on_provider boolean;
begin
  select c.conname,
         exists (select 1 from pg_attribute a
                  where a.attrelid = c.conrelid and a.attnum = any (c.conkey) and a.attname = 'provider')
    into pk_name, pk_on_provider
    from pg_constraint c
   where c.conrelid = 'public.ai_provider_keys'::regclass and c.contype = 'p';

  if pk_name is not null and pk_on_provider then
    execute format('alter table public.ai_provider_keys drop constraint %I', pk_name);
    pk_name := null;
  end if;
  if pk_name is null then
    alter table public.ai_provider_keys add constraint ai_provider_keys_pkey primary key (id);
  end if;
end $$;

create index if not exists ai_provider_keys_order_idx
  on public.ai_provider_keys (provider_priority, provider, priority);

-- Dropping a primary key can drop its NOT NULL on some versions. A key row
-- without a provider would be tried by nobody, so say it outright.
alter table public.ai_provider_keys alter column provider set not null;

-- ── RLS, exactly as 0006: only an admin ─────────────────────────────────────
-- Restated so this file stands on its own; the policies do not mention the
-- primary key, so they are unchanged in meaning.
alter table public.ai_provider_keys enable row level security;

revoke all on table public.ai_provider_keys from anon;
grant select, insert, update, delete on table public.ai_provider_keys to authenticated;

drop policy if exists "ai keys select admin" on public.ai_provider_keys;
create policy "ai keys select admin" on public.ai_provider_keys
  for select to authenticated
  using (public.is_admin());

drop policy if exists "ai keys insert admin" on public.ai_provider_keys;
create policy "ai keys insert admin" on public.ai_provider_keys
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "ai keys update admin" on public.ai_provider_keys;
create policy "ai keys update admin" on public.ai_provider_keys
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "ai keys delete admin" on public.ai_provider_keys;
create policy "ai keys delete admin" on public.ai_provider_keys
  for delete to authenticated
  using (public.is_admin());

-- ── The masked list the admin page reads ────────────────────────────────────
-- security_invoker = true: the view runs AS THE CALLER, so the table's RLS
-- above applies and a non-admin gets no rows. Without it a view runs as its
-- owner and would skip RLS entirely, which is the one mistake to avoid here.
-- last4 is the only part of api_key that leaves the database this way.
create or replace view public.ai_provider_keys_masked
  with (security_invoker = true) as
select id, provider, label, model, priority, provider_priority, enabled,
       last_error, last_error_at, updated_at, created_at,
       right(api_key, 4) as last4
  from public.ai_provider_keys;

revoke all on public.ai_provider_keys_masked from anon;
grant select on public.ai_provider_keys_masked to authenticated;

-- ── The attempt log learns which key ran ────────────────────────────────────
-- Nullable: rows from before 0008 have none, and a key that is later removed
-- leaves its history behind with key_id emptied rather than deleting it.
alter table public.ai_poster_runs add column if not exists key_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'ai_poster_runs_key_id_fkey'
                    and conrelid = 'public.ai_poster_runs'::regclass) then
    alter table public.ai_poster_runs
      add constraint ai_poster_runs_key_id_fkey
      foreign key (key_id) references public.ai_provider_keys (id) on delete set null;
  end if;
end $$;

create index if not exists ai_poster_runs_key_idx
  on public.ai_poster_runs (key_id, created_at desc);

-- Verification.
--
-- As a signed-out visitor all three must fail with "permission denied":
--   set role anon;
--   select count(*) from public.ai_provider_keys;
--   select count(*) from public.ai_provider_keys_masked;
--   select count(*) from public.ai_poster_runs;
--   reset role;
--
-- As the owner, every old key is still there, now with an id and "Key 1":
--   select id, provider, label, provider_priority, priority, right(api_key, 4)
--     from public.ai_provider_keys order by provider_priority, priority;

-- PostgREST picks up the new column, view and key without a restart.
notify pgrst, 'reload schema';
