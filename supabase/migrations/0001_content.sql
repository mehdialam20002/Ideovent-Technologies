-- Ideovent Technologies — Supabase schema
-- Single-table content store used by src/lib/cms/supabaseStore.ts
-- Run this in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  doc_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  unique (collection, doc_id)
);

create index if not exists content_collection_idx on public.content (collection);

alter table public.content enable row level security;

-- ── Read ──────────────────────────────────────────────
-- Anyone may read public content, EXCEPT private lead collections.
drop policy if exists "read public content" on public.content;
create policy "read public content" on public.content
  for select
  using (collection not in ('submissions', 'applications'));

-- Signed-in admins may read everything (incl. leads).
drop policy if exists "read all authed" on public.content;
create policy "read all authed" on public.content
  for select to authenticated
  using (true);

-- ── Write ─────────────────────────────────────────────
-- Anonymous visitors may ONLY submit leads (contact + internship apps).
drop policy if exists "insert leads anon" on public.content;
create policy "insert leads anon" on public.content
  for insert to anon
  with check (collection in ('submissions', 'applications'));

-- Admins may create/update/delete any content.
drop policy if exists "insert authed" on public.content;
create policy "insert authed" on public.content
  for insert to authenticated with check (true);

drop policy if exists "update authed" on public.content;
create policy "update authed" on public.content
  for update to authenticated using (true) with check (true);

drop policy if exists "delete authed" on public.content;
create policy "delete authed" on public.content
  for delete to authenticated using (true);

-- ── Media storage bucket (public read, admin write) ───
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "admin upload media" on storage.objects;
create policy "admin upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');

drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects
  for update to authenticated using (bucket_id = 'media');
