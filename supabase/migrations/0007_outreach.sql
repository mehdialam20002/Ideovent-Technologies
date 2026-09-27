-- ════════════════════════════════════════════════════════════════════════════
-- 0007: Outreach. Leads, their history, and the outreach settings.
-- Written 27 September 2026. Needs 0005 (public.is_admin()). Safe to run more
-- than once, and safe to run ON ITS OWN on the live project: paste only this
-- file into Supabase > SQL Editor > New query > Run.
-- ════════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS IS FOR
-- /admin > Outreach. Mehdi types a school's or coaching institute's phone and
-- email, picks a demo and a ready message, and the site opens Gmail or
-- WhatsApp with it typed. Each lead, each message sent, each reply and each
-- demo open is a row here, so follow-ups and the WhatsApp daily cap work.
--
-- WHY TABLES OF THEIR OWN AND NOT ROWS IN public.content
-- A lead is a stranger's phone number and email. public.content is the CMS:
-- parts of it are world-readable by design, the admin Export downloads all of
-- it, and a snapshot of it is committed to the repository. Leads must be in
-- none of those. Here they sit behind RLS that says one thing: only an admin.
--
-- SHAPE
-- The app (src/lib/outreach/store.ts) keeps the whole record in `data`
-- (src/lib/outreach/types.ts), so a new field needs no migration. The columns
-- beside it exist only to sort, page and filter.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Leads ───────────────────────────────────────────────────────────────────
create table if not exists public.outreach_leads (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists outreach_leads_updated_idx
  on public.outreach_leads (updated_at desc);

-- ── Events: sent, replied, status change, note, demo opened, call ──────────
create table if not exists public.outreach_events (
  id         text primary key,
  lead_id    text not null,
  data       jsonb not null,
  created_at timestamptz default now()
);

create index if not exists outreach_events_lead_idx
  on public.outreach_events (lead_id, created_at desc);
create index if not exists outreach_events_created_idx
  on public.outreach_events (created_at desc);

-- ── Settings: one row, id 'default' ─────────────────────────────────────────
create table if not exists public.outreach_settings (
  id   text primary key,
  data jsonb not null
);

-- ── Access: the admin, and nobody else ──────────────────────────────────────
alter table public.outreach_leads    enable row level security;
alter table public.outreach_events   enable row level security;
alter table public.outreach_settings enable row level security;

revoke all on table public.outreach_leads    from anon;
revoke all on table public.outreach_events   from anon;
revoke all on table public.outreach_settings from anon;
grant select, insert, update, delete on table public.outreach_leads    to authenticated;
grant select, insert, update, delete on table public.outreach_events   to authenticated;
grant select, insert, update, delete on table public.outreach_settings to authenticated;

-- Same four policies on each table, written out rather than generated so the
-- file reads plainly in the SQL editor.
drop policy if exists "outreach leads select admin" on public.outreach_leads;
create policy "outreach leads select admin" on public.outreach_leads
  for select to authenticated using (public.is_admin());
drop policy if exists "outreach leads insert admin" on public.outreach_leads;
create policy "outreach leads insert admin" on public.outreach_leads
  for insert to authenticated with check (public.is_admin());
drop policy if exists "outreach leads update admin" on public.outreach_leads;
create policy "outreach leads update admin" on public.outreach_leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "outreach leads delete admin" on public.outreach_leads;
create policy "outreach leads delete admin" on public.outreach_leads
  for delete to authenticated using (public.is_admin());

drop policy if exists "outreach events select admin" on public.outreach_events;
create policy "outreach events select admin" on public.outreach_events
  for select to authenticated using (public.is_admin());
drop policy if exists "outreach events insert admin" on public.outreach_events;
create policy "outreach events insert admin" on public.outreach_events
  for insert to authenticated with check (public.is_admin());
drop policy if exists "outreach events update admin" on public.outreach_events;
create policy "outreach events update admin" on public.outreach_events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "outreach events delete admin" on public.outreach_events;
create policy "outreach events delete admin" on public.outreach_events
  for delete to authenticated using (public.is_admin());

drop policy if exists "outreach settings select admin" on public.outreach_settings;
create policy "outreach settings select admin" on public.outreach_settings
  for select to authenticated using (public.is_admin());
drop policy if exists "outreach settings insert admin" on public.outreach_settings;
create policy "outreach settings insert admin" on public.outreach_settings
  for insert to authenticated with check (public.is_admin());
drop policy if exists "outreach settings update admin" on public.outreach_settings;
create policy "outreach settings update admin" on public.outreach_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "outreach settings delete admin" on public.outreach_settings;
create policy "outreach settings delete admin" on public.outreach_settings
  for delete to authenticated using (public.is_admin());

-- Verification, as a signed-out visitor. All three should fail with
-- "permission denied", which is the point.
--
--   set role anon;
--   select count(*) from public.outreach_leads;
--   select count(*) from public.outreach_events;
--   select count(*) from public.outreach_settings;
--   reset role;
