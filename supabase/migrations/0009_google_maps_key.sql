-- ════════════════════════════════════════════════════════════════════════════
-- 0009: a Google Maps (Places API) key for the Lead Finder.
-- Written 28 September 2026. Needs 0006 (the keys table); written to run after
-- 0008, and works either way. Safe to run more than once, and safe to run ON
-- ITS OWN on the live project: paste only this file into Supabase > SQL Editor
-- > New query > Run.
-- ════════════════════════════════════════════════════════════════════════════
--
-- WHAT CHANGES
-- The Lead Finder in /admin searches Google Maps (Places API, New) for
-- businesses by type and city. /api/leads-search reads the Places key from the
-- same admin-only table as the AI keys, so the key is typed into /admin once,
-- never into code or Vercel settings. The only thing that stopped a row with
-- provider 'google_maps' was the provider check from 0006. This file replaces
-- that check with one that also allows 'google_maps'. Nothing else changes.
--
-- WHY THE POSTER READER IGNORES THIS KEY
-- /api/poster keeps only rows whose provider is one of its AI providers
-- (api/_lib/providers.js PROVIDERS), so a Maps key is never sent to an AI
-- model, and /api/leads-search keeps only 'google_maps' rows.
--
-- RLS
-- Untouched. The policies from 0006 (restated in 0008) say only an admin may
-- read or write any row of this table, a Maps key included.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  c record;
begin
  -- 0006 wrote the check inline, so Postgres named it (normally
  -- ai_provider_keys_provider_check). Drop every CHECK on this table that
  -- mentions provider, whatever its name, then add the new one by name.
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.ai_provider_keys'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%provider%'
  loop
    execute format('alter table public.ai_provider_keys drop constraint %I', c.conname);
  end loop;

  alter table public.ai_provider_keys
    add constraint ai_provider_keys_provider_check
    check (provider in ('gemini', 'openai', 'xai', 'anthropic', 'google_maps'));
end $$;

-- Verification, as the owner. The constraint must list google_maps:
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.ai_provider_keys'::regclass and contype = 'c';
--
-- And RLS still says no to a signed-out visitor ("permission denied"):
--   set role anon;
--   select count(*) from public.ai_provider_keys;
--   reset role;

notify pgrst, 'reload schema';
